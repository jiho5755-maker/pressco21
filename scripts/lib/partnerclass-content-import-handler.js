'use strict';

function buildContentImportHandlerCode() {
    return String.raw`
const https = require('https');

const input = $input.first().json || {};
const body = input.body || input || {};

const PROJECT_ID = $env.NOCODB_PROJECT_ID;
const TOKEN = $env.NOCODB_API_TOKEN;
const CONTENT_TABLE_ID = 'mit4xyrzn4s81b9';
const DEFAULT_CHANNEL_ID = $env.YOUTUBE_CHANNEL_ID || 'UCOt_7gyvjqHBw304hU4-FUw';
const GEMINI_KEY = $env.GEMINI_API_KEY || '';

function sanitizeText(value, maxLen) {
  return String(value || '').replace(/[\u0000-\b\u000b\f\u000e-\u001f]/g, '').replace(/\s+/g, ' ').trim().substring(0, maxLen || 500);
}

function decodeEntities(text) {
  return String(text || '')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ');
}

function stripHtml(text) {
  return sanitizeText(
    decodeEntities(String(text || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')),
    4000
  );
}

function toDateText(value) {
  const date = new Date(value || Date.now());
  if (isNaN(date.getTime())) {
    const now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  }
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function requestRaw(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error('GET ' + url + ' failed: ' + res.statusCode));
          return;
        }
        resolve(data);
      });
    }).on('error', reject);
  });
}

function requestJson(url, method, payload) {
  return new Promise((resolve, reject) => {
    const bodyText = payload ? JSON.stringify(payload) : '';
    const req = https.request(url, {
      method: method,
      headers: {
        'xc-token': TOKEN,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = data ? JSON.parse(data) : null;
        } catch (error) {
          parsed = { raw: data };
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(method + ' ' + url + ' failed: ' + res.statusCode + ' ' + JSON.stringify(parsed)));
          return;
        }
        resolve(parsed);
      });
    });
    req.on('error', reject);
    if (bodyText) {
      req.write(bodyText);
    }
    req.end();
  });
}

function dataUrl(suffix) {
  return 'https://nocodb.pressco21.com/api/v1/db/data/noco/' + PROJECT_ID + '/' + CONTENT_TABLE_ID + suffix;
}

function parseGenericFeed(xml, feedName, limit) {
  const items = [];
  const blocks = String(xml || '').split(/<item[\s>]|<entry[\s>]/i).slice(1);
  let i = 0;

  function matchBlock(block, regex, fallback) {
    const matched = block.match(regex);
    return matched && matched[1] ? matched[1].trim() : (fallback || '');
  }

  for (i = 0; i < blocks.length && items.length < limit; i += 1) {
    const block = blocks[i];
    const title = decodeEntities(matchBlock(block, /<title[^>]*>([\s\S]*?)<\/title>/i, ''));
    let link = matchBlock(block, /<link[^>]*>([\s\S]*?)<\/link>/i, '');
    const attrLink = matchBlock(block, /<link[^>]*href="([^"]+)"/i, '');
    const description = decodeEntities(matchBlock(block, /<description[^>]*>([\s\S]*?)<\/description>/i, matchBlock(block, /<summary[^>]*>([\s\S]*?)<\/summary>/i, '')));
    const published = matchBlock(block, /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i, matchBlock(block, /<published[^>]*>([\s\S]*?)<\/published>/i, matchBlock(block, /<updated[^>]*>([\s\S]*?)<\/updated>/i, '')));
    const imageUrl = matchBlock(block, /<media:thumbnail[^>]*url="([^"]+)"/i, matchBlock(block, /<enclosure[^>]*url="([^"]+)"/i, ''));

    if (!link && attrLink) {
      link = attrLink;
    }
    if (!title || !description) {
      continue;
    }

    items.push({
      source_type: 'RSS',
      source_name: feedName || 'RSS',
      source_url: sanitizeText(link, 500),
      title: sanitizeText(title, 180),
      body_text: sanitizeText(stripHtml(description), 2000),
      image_url: sanitizeText(imageUrl, 500),
      publish_date: toDateText(published),
      external_id: sanitizeText((feedName || 'rss') + '::' + (link || title), 240)
    });
  }

  return items;
}

function parseYouTubeFeed(xml, limit) {
  const entries = [];
  const blocks = String(xml || '').split(/<entry>/i).slice(1);
  let i = 0;

  function matchBlock(block, regex, fallback) {
    const matched = block.match(regex);
    return matched && matched[1] ? matched[1].trim() : (fallback || '');
  }

  for (i = 0; i < blocks.length && entries.length < limit; i += 1) {
    const block = blocks[i];
    const videoId = matchBlock(block, /<yt:videoId>([^<]+)<\/yt:videoId>/i, '');
    const title = decodeEntities(matchBlock(block, /<title[^>]*>([\s\S]*?)<\/title>/i, ''));
    const description = decodeEntities(matchBlock(block, /<media:description>([\s\S]*?)<\/media:description>/i, ''));
    const published = matchBlock(block, /<published>([^<]+)<\/published>/i, '');
    const thumbnail = matchBlock(block, /<media:thumbnail[^>]*url="([^"]+)"/i, '');

    if (!videoId || !title) {
      continue;
    }

    entries.push({
      source_type: 'YOUTUBE',
      source_name: 'PRESSCO21 YouTube',
      source_url: 'https://www.youtube.com/watch?v=' + videoId,
      title: sanitizeText(title, 180),
      body_text: sanitizeText(stripHtml(description), 2000),
      image_url: sanitizeText(thumbnail || ('https://img.youtube.com/vi/' + videoId + '/sddefault.jpg'), 500),
      publish_date: toDateText(published),
      external_id: sanitizeText(videoId, 120)
    });
  }

  return entries;
}

function heuristicContentType(title, bodyText) {
  const text = (String(title || '') + ' ' + String(bodyText || '')).toLowerCase();
  if (text.indexOf('세미나') !== -1 || text.indexOf('모집') !== -1 || text.indexOf('신청') !== -1 || text.indexOf('웨비나') !== -1 || text.indexOf('라이브') !== -1 || text.indexOf('event') !== -1) {
    return 'EVENT';
  }
  if (text.indexOf('가이드') !== -1 || text.indexOf('팁') !== -1 || text.indexOf('노하우') !== -1 || text.indexOf('준비물') !== -1 || text.indexOf('how to') !== -1 || text.indexOf('튜토리얼') !== -1) {
    return 'GUIDE';
  }
  if (text.indexOf('공지') !== -1 || text.indexOf('안내') !== -1 || text.indexOf('휴무') !== -1 || text.indexOf('변경') !== -1 || text.indexOf('마감') !== -1 || text.indexOf('배송') !== -1) {
    return 'NOTICE';
  }
  return 'NEWS';
}

function heuristicCategory(title, bodyText) {
  const text = (String(title || '') + ' ' + String(bodyText || '')).toLowerCase();
  if (text.indexOf('압화') !== -1 || text.indexOf('드라이') !== -1 || text.indexOf('프리저브') !== -1) return '압화';
  if (text.indexOf('레진') !== -1) return '레진';
  if (text.indexOf('캔들') !== -1) return '캔들';
  if (text.indexOf('부케') !== -1 || text.indexOf('꽃다발') !== -1) return '부케';
  return '꽃 공예';
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildBodyHtml(item, summary, category) {
  return '<p>' + escapeHtml(summary) + '</p>'
    + '<p><strong>분류</strong>: ' + escapeHtml(category) + '</p>'
    + '<p><strong>출처</strong>: ' + escapeHtml(item.source_name || item.source_type || '콘텐츠') + '</p>'
    + (item.source_url ? '<p><a href="' + escapeHtml(item.source_url) + '" target="_blank" rel="noopener">원문 보기</a></p>' : '')
    + '<div>' + escapeHtml(item.body_text || summary) + '</div>';
}

async function classifyWithGemini(item) {
  if (!GEMINI_KEY) {
    return null;
  }

  return new Promise((resolve) => {
    const prompt = [
      '당신은 꽃공예 콘텐츠 편집자입니다.',
      '아래 콘텐츠를 NOTICE / EVENT / GUIDE / NEWS 중 하나로 분류하고 80자 이내 요약을 만드세요.',
      'JSON으로만 응답하세요.',
      '{"content_type":"GUIDE","category":"압화","summary":"..."}',
      '',
      '제목: ' + sanitizeText(item.title, 180),
      '본문: ' + sanitizeText(item.body_text, 1200)
    ].join('\n');
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + GEMINI_KEY;
    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 180, thinkingConfig: { thinkingBudget: 0 } }
    };
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data || '{}');
          const parts = (((parsed.candidates || [])[0] || {}).content || {}).parts || [];
          let text = '';
          parts.forEach((part) => {
            if (part && part.text) {
              text += part.text;
            }
          });
          const matched = text.match(/\{[\s\S]*\}/);
          if (!matched) {
            resolve(null);
            return;
          }
          resolve(JSON.parse(matched[0]));
        } catch (error) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.write(JSON.stringify(payload));
    req.end();
  });
}

async function main() {
  const affiliationCode = sanitizeText(body.affiliation_code || 'KPFA_001', 60) || 'KPFA_001';
  const limit = Math.max(1, Math.min(parseInt(body.limit, 10) || 5, 10));
  const dryRun = body.dry_run === true || body.dry_run === 'true';
  const genericFeedText = sanitizeText(body.rss_urls || $env.PARTNERCLASS_CONTENT_RSS_URLS || '', 2000);
  const genericFeeds = genericFeedText ? genericFeedText.split(',').map((item) => item.trim()).filter(Boolean) : [];
  const youtubeUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + encodeURIComponent(sanitizeText(body.youtube_channel_id || DEFAULT_CHANNEL_ID, 120));
  const fetchedItems = [];
  const feedStats = { youtube_count: 0, rss_count: 0 };
  const writtenTitles = [];
  let aiClassifiedCount = 0;

  const youtubeXml = await requestRaw(youtubeUrl);
  const youtubeItems = parseYouTubeFeed(youtubeXml, limit);
  feedStats.youtube_count = youtubeItems.length;
  Array.prototype.push.apply(fetchedItems, youtubeItems);

  for (let i = 0; i < genericFeeds.length; i += 1) {
    try {
      const xml = await requestRaw(genericFeeds[i]);
      const parsedItems = parseGenericFeed(xml, 'RSS Feed ' + (i + 1), limit);
      feedStats.rss_count += parsedItems.length;
      Array.prototype.push.apply(fetchedItems, parsedItems);
    } catch (error) {
    }
  }

  const existingRows = await requestJson(dataUrl('?limit=200'), 'GET');
  const existingList = existingRows.list || [];
  const existingMap = {};
  existingList.forEach((row) => {
    existingMap[(row.affiliation_code || '') + '||' + (row.title || '')] = row;
  });

  let created = 0;
  let updated = 0;
  const normalizedItems = [];

  for (let j = 0; j < fetchedItems.length; j += 1) {
    const item = fetchedItems[j];
    const aiResult = j < 5 ? await classifyWithGemini(item) : null;
    if (aiResult) {
      aiClassifiedCount += 1;
    }
    const contentType = sanitizeText((aiResult && aiResult.content_type) || heuristicContentType(item.title, item.body_text), 20).toUpperCase() || 'NEWS';
    const category = sanitizeText((aiResult && aiResult.category) || heuristicCategory(item.title, item.body_text), 40) || '꽃 공예';
    const summary = sanitizeText((aiResult && aiResult.summary) || item.body_text || item.title, 160) || item.title;
    const payload = {
      affiliation_code: affiliationCode,
      content_type: contentType,
      title: sanitizeText(item.title, 180),
      body: buildBodyHtml(item, summary, category),
      image_url: sanitizeText(item.image_url, 500),
      publish_date: toDateText(item.publish_date),
      status: 'PUBLISHED'
    };
    const uniqueKey = affiliationCode + '||' + payload.title;
    const existing = existingMap[uniqueKey];

    normalizedItems.push({
      title: payload.title,
      content_type: payload.content_type,
      publish_date: payload.publish_date,
      source_type: item.source_type,
      source_url: item.source_url,
      category: category
    });

    if (dryRun) {
      continue;
    }

    if (existing && existing.Id) {
      await requestJson(dataUrl('/' + existing.Id), 'PATCH', payload);
      updated += 1;
    } else {
      await requestJson(dataUrl(''), 'POST', payload);
      created += 1;
    }

    writtenTitles.push(payload.title);
  }

  return {
    success: true,
    data: {
      dry_run: dryRun,
      affiliation_code: affiliationCode,
      fetched_total: fetchedItems.length,
      youtube_count: feedStats.youtube_count,
      rss_count: feedStats.rss_count,
      ai_enabled: !!GEMINI_KEY,
      ai_classified_count: aiClassifiedCount,
      created: created,
      updated: updated,
      written_titles: writtenTitles,
      preview: normalizedItems.slice(0, 5)
    },
    timestamp: new Date().toISOString()
  };
}

try {
  return [{ json: await main() }];
} catch (error) {
  return [{
    json: {
      success: false,
      error: {
        code: 'CONTENT_IMPORT_FAILED',
        message: error && error.message ? error.message : String(error)
      },
      timestamp: new Date().toISOString()
    }
  }];
}
`;
}

module.exports = {
    buildContentImportHandlerCode: buildContentImportHandlerCode
};
