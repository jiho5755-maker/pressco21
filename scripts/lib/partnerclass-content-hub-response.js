'use strict';

function buildContentHubResponseCode() {
    return String.raw`
// ===================================================
// WF-01C: getContentHub - 콘텐츠 허브 4영역 응답 생성
// imported affiliation content + classes + partners 조합
// ===================================================

const classResponse = $('NocoDB Get Content Classes').first().json;
const partnerResponse = $('NocoDB Get Content Partners').first().json;
const importedResponse = $('NocoDB Get Imported Content').first().json;
const classesList = classResponse.list || [];
const partnersList = partnerResponse.list || [];
const importedContentList = importedResponse.list || [];

function normalizeStatus(raw) {
  const text = String(raw || '').replace(/\s+/g, ' ').trim();
  const upper = text.toUpperCase();
  if (!text) return 'DRAFT';
  if (upper === 'ACTIVE' || text.toLowerCase() === 'active') return 'ACTIVE';
  if (upper === 'PAUSED' || text.toLowerCase() === 'paused') return 'PAUSED';
  if (upper === 'PENDING_REVIEW' || upper === 'INACTIVE' || text.toLowerCase() === 'pending') return 'PENDING_REVIEW';
  if (upper === 'REJECTED' || text.toLowerCase() === 'closed') return 'REJECTED';
  if (upper === 'ARCHIVED') return 'ARCHIVED';
  return upper;
}

function normalizeLevel(raw) {
  const text = String(raw || '').replace(/\s+/g, ' ').trim();
  const upper = text.toUpperCase();
  const lower = text.toLowerCase();
  if (!text) return 'ALL_LEVELS';
  if (upper === 'BEGINNER' || lower === 'beginner' || lower === 'basic' || text.indexOf('입문') !== -1 || text.indexOf('초급') !== -1) return 'BEGINNER';
  if (upper === 'INTERMEDIATE' || lower === 'intermediate' || text.indexOf('중급') !== -1) return 'INTERMEDIATE';
  if (upper === 'ADVANCED' || lower === 'advanced' || text.indexOf('심화') !== -1 || text.indexOf('고급') !== -1) return 'ADVANCED';
  return 'ALL_LEVELS';
}

function normalizeRegion(raw) {
  const text = String(raw || '').replace(/\s+/g, ' ').trim();
  const upper = text.toUpperCase();
  if (!text) return 'NATIONWIDE';
  if (upper === 'SEOUL' || text.indexOf('서울') !== -1) return 'SEOUL';
  if (upper === 'GYEONGGI' || text.indexOf('경기') !== -1) return 'GYEONGGI';
  if (upper === 'INCHEON' || text.indexOf('인천') !== -1) return 'INCHEON';
  if (upper === 'BUSAN' || text.indexOf('부산') !== -1) return 'BUSAN';
  if (upper === 'ONLINE' || text.indexOf('온라인') !== -1) return 'ONLINE';
  return upper || 'NATIONWIDE';
}

function getRegionLabel(code) {
  const labels = { SEOUL: '서울', GYEONGGI: '경기', INCHEON: '인천', BUSAN: '부산', ONLINE: '온라인', NATIONWIDE: '전국' };
  return labels[code] || code || '전국';
}

function getLevelLabel(code) {
  const labels = { BEGINNER: '입문', INTERMEDIATE: '중급', ADVANCED: '심화', ALL_LEVELS: '누구나' };
  return labels[code] || '누구나';
}

function getTypeLabel(raw) {
  const text = String(raw || '').trim();
  if (!text) return '원데이';
  if (text.toUpperCase() === 'ONLINE' || text.indexOf('온라인') !== -1) return '온라인';
  return text;
}

function normalizeGrade(raw) {
  const upper = String(raw || 'BLOOM').toUpperCase();
  if (upper === 'SILVER') return 'BLOOM';
  if (upper === 'GOLD') return 'GARDEN';
  if (upper === 'PLATINUM') return 'ATELIER';
  return upper || 'BLOOM';
}

function normalizeContentStatus(raw) {
  const upper = String(raw || '').replace(/\s+/g, ' ').trim().toUpperCase();
  if (!upper) return 'DRAFT';
  if (upper === 'ACTIVE' || upper === 'PUBLISHED') return 'PUBLISHED';
  if (upper === 'ARCHIVED') return 'ARCHIVED';
  return upper;
}

function normalizeContentType(rawType, title, bodyText) {
  const direct = String(rawType || '').replace(/\s+/g, ' ').trim().toUpperCase();
  const text = (String(title || '') + ' ' + String(bodyText || '')).toLowerCase();
  if (direct === 'NOTICE' || direct === 'EVENT' || direct === 'GUIDE' || direct === 'NEWS') {
    return direct;
  }
  if (text.indexOf('세미나') !== -1 || text.indexOf('모집') !== -1 || text.indexOf('신청') !== -1 || text.indexOf('라이브') !== -1 || text.indexOf('웨비나') !== -1 || text.indexOf('workshop') !== -1) {
    return 'EVENT';
  }
  if (text.indexOf('가이드') !== -1 || text.indexOf('팁') !== -1 || text.indexOf('노하우') !== -1 || text.indexOf('튜토리얼') !== -1 || text.indexOf('준비물') !== -1 || text.indexOf('how to') !== -1) {
    return 'GUIDE';
  }
  if (text.indexOf('공지') !== -1 || text.indexOf('안내') !== -1 || text.indexOf('변경') !== -1 || text.indexOf('휴무') !== -1 || text.indexOf('마감') !== -1 || text.indexOf('배송') !== -1) {
    return 'NOTICE';
  }
  return 'NEWS';
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateText(value, maxLen) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.substring(0, Math.max(0, maxLen - 1)).trim() + '…';
}

function parsePublishTime(value) {
  const timestamp = Date.parse(String(value || ''));
  return isNaN(timestamp) ? 0 : timestamp;
}

function topCategory(classes) {
  const counts = {};
  let best = '';
  let bestCount = 0;
  classes.forEach((item) => {
    const category = String(item.category || '').trim() || '꽃 공예';
    counts[category] = (counts[category] || 0) + 1;
    if (counts[category] > bestCount) {
      best = category;
      bestCount = counts[category];
    }
  });
  return best || '꽃 공예';
}

function splitChecklist(text) {
  const cleaned = stripHtml(text);
  if (!cleaned) return [];
  return cleaned
    .split(/[\.\!\?\n]/)
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((item) => truncateText(item, 42));
}

function buildGuideChecklist(item, levelLabel) {
  const list = [];
  const duration = Number(item && item.duration_min || 0);
  list.push((levelLabel || '입문') + ' 난이도에서 시작하기 좋은 클래스');
  if (duration > 0) {
    list.push('예상 수업 시간 ' + duration + '분');
  }
  if (Number(item && item.kit_enabled || 0) === 1) {
    list.push('재료 연동 상품 확인 가능');
  } else {
    list.push('상세 페이지에서 준비물 안내 확인');
  }
  list.push(getRegionLabel(item && item.regionCode || 'NATIONWIDE') + '에서 예약 가능한 클래스');
  return list;
}

const activeClasses = classesList
  .map((item) => ({
    class_id: item.class_id || '',
    class_name: item.class_name || '',
    category: String(item.category || '').trim() || '꽃 공예',
    levelCode: normalizeLevel(item.level || ''),
    levelLabel: getLevelLabel(normalizeLevel(item.level || '')),
    price: Number(item.price || 0),
    duration_min: Number(item.duration_min || 0),
    thumbnail_url: item.thumbnail_url || '',
    location: item.location || '',
    regionCode: normalizeRegion(item.region || item.location || ''),
    regionLabel: getRegionLabel(normalizeRegion(item.region || item.location || '')),
    tags: item.tags || '',
    class_count: Number(item.class_count || 0),
    avg_rating: Number(item.avg_rating || 0),
    partner_code: item.partner_code || '',
    typeLabel: getTypeLabel(item.type || ''),
    status: normalizeStatus(item.status || ''),
    kit_enabled: Number(item.kit_enabled || 0)
  }))
  .filter((item) => item.status === 'ACTIVE');

const partnerMap = {};
partnersList.forEach((item) => {
  partnerMap[item.partner_code] = {
    partner_code: item.partner_code || '',
    partner_name: item.partner_name || '',
    grade: normalizeGrade(item.grade || 'BLOOM'),
    location: item.location || '',
    avg_rating: Number(item.avg_rating || 0),
    instagram_url: item.instagram_url || '',
    portfolio_url: item.portfolio_url || ''
  };
});

const partnerClassesMap = {};
activeClasses.forEach((item) => {
  if (!partnerClassesMap[item.partner_code]) partnerClassesMap[item.partner_code] = [];
  partnerClassesMap[item.partner_code].push(item);
});

const availableCategories = Array.from(new Set(activeClasses.map((item) => item.category).filter(Boolean)));

function detectCategoryFromText(text) {
  const lowered = String(text || '').toLowerCase();
  let i = 0;
  for (i = 0; i < availableCategories.length; i += 1) {
    if (lowered.indexOf(String(availableCategories[i]).toLowerCase()) !== -1) {
      return availableCategories[i];
    }
  }
  if (lowered.indexOf('압화') !== -1 || lowered.indexOf('드라이') !== -1 || lowered.indexOf('프리저브') !== -1) return '압화';
  if (lowered.indexOf('레진') !== -1) return '레진';
  if (lowered.indexOf('캔들') !== -1) return '캔들';
  if (lowered.indexOf('부케') !== -1 || lowered.indexOf('꽃다발') !== -1) return '부케';
  return availableCategories[0] || '꽃 공예';
}

function pickRecommendedClass(category, preferredLevel) {
  let list = activeClasses.slice();
  if (category) {
    const matched = list.filter((item) => item.category === category);
    if (matched.length) list = matched;
  }
  if (preferredLevel) {
    const byLevel = list.filter((item) => item.levelCode === preferredLevel);
    if (byLevel.length) list = byLevel;
  }
  list.sort((a, b) => {
    if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
    if (b.class_count !== a.class_count) return b.class_count - a.class_count;
    return a.price - b.price;
  });
  return list[0] || activeClasses[0] || null;
}

const importedContent = importedContentList
  .map((item) => {
    const bodyText = stripHtml(item.body || '');
    const publishDate = item.publish_date || '';
    return {
      affiliation_code: item.affiliation_code || '',
      contentType: normalizeContentType(item.content_type || '', item.title || '', bodyText),
      title: item.title || '',
      bodyText: bodyText,
      image_url: item.image_url || '',
      publishDate: publishDate,
      publishTime: parsePublishTime(publishDate),
      status: normalizeContentStatus(item.status || ''),
      category: detectCategoryFromText((item.title || '') + ' ' + bodyText)
    };
  })
  .filter((item) => item.status === 'PUBLISHED')
  .sort((a, b) => b.publishTime - a.publishTime);

const summary = {
  total_classes: activeClasses.length,
  total_partners: Object.keys(partnerClassesMap).length,
  total_beginner_classes: activeClasses.filter((item) => item.levelCode === 'BEGINNER').length,
  total_regions: Array.from(new Set(activeClasses.map((item) => item.regionCode).filter(Boolean))).length,
  imported_content_count: importedContent.length
};

const highlights = activeClasses
  .slice()
  .sort((a, b) => {
    if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
    if (b.class_count !== a.class_count) return b.class_count - a.class_count;
    return a.price - b.price;
  })
  .slice(0, 4)
  .map((item) => ({
    class_id: item.class_id,
    title: item.class_name,
    category: item.category,
    partner_name: (partnerMap[item.partner_code] || {}).partner_name || '',
    region_label: item.regionLabel,
    price: item.price,
    avg_rating: item.avg_rating,
    type_label: item.typeLabel,
    level_label: item.levelLabel,
    thumbnail_url: item.thumbnail_url,
    highlight_copy: item.regionLabel + '에서 예약 가능한 ' + item.category + ' 추천 클래스'
  }));

const partnerStories = partnersList
  .map((partner) => {
    const related = partnerClassesMap[partner.partner_code] || [];
    const beginnerCount = related.filter((item) => item.levelCode === 'BEGINNER').length;
    const mainCategory = topCategory(related);
    const regionLabel = getRegionLabel(normalizeRegion(partner.location || (related[0] && related[0].regionCode) || ''));
    let gradeCopy = '첫 수업부터 신뢰를 쌓는 파트너';
    if (normalizeGrade(partner.grade || '') === 'AMBASSADOR') gradeCopy = '협업과 멘토링까지 확장하는 대표 파트너';
    else if (normalizeGrade(partner.grade || '') === 'ATELIER') gradeCopy = '콘텐츠 허브 인터뷰 대상 파트너';
    else if (normalizeGrade(partner.grade || '') === 'GARDEN') gradeCopy = '재수강이 쌓이는 성장 파트너';
    return {
      partner_code: partner.partner_code || '',
      partner_name: partner.partner_name || '',
      grade: normalizeGrade(partner.grade || 'BLOOM'),
      region_label: regionLabel,
      class_count: related.length,
      avg_rating: Number(partner.avg_rating || 0),
      featured_category: mainCategory,
      headline: regionLabel + '에서 만나는 ' + (partner.partner_name || '파트너'),
      quote: (partner.partner_name || '파트너') + ' 파트너는 ' + mainCategory + ' 중심으로 수강생이 다시 찾는 수업 흐름을 만들고 있습니다.',
      focus_points: [
        gradeCopy,
        beginnerCount > 0 ? '입문 클래스 ' + beginnerCount + '개 운영' : '중급 이상 클래스 운영',
        partner.instagram_url ? '인스타그램 포트폴리오 확인 가능' : 'PRESSCO21 허브 안에서 작품 맥락 노출'
      ],
      search_keyword: partner.partner_name || ''
    };
  })
  .filter((item) => item.class_count > 0)
  .sort((a, b) => {
    if (b.class_count !== a.class_count) return b.class_count - a.class_count;
    return b.avg_rating - a.avg_rating;
  })
  .slice(0, 4);

const categoryBuckets = {};
activeClasses.forEach((item) => {
  if (!categoryBuckets[item.category]) categoryBuckets[item.category] = [];
  categoryBuckets[item.category].push(item);
});

const fallbackTrends = Object.keys(categoryBuckets)
  .map((category) => {
    const items = categoryBuckets[category];
    const regionList = Array.from(new Set(items.map((item) => item.regionLabel))).slice(0, 3);
    return {
      title: category + ' 트렌드',
      eyebrow: items.length + '개 클래스가 쌓인 주제',
      description: category + ' 카테고리의 활성 클래스가 ' + items.length + '개 있고, ' + regionList.join(', ') + ' 중심으로 탐색됩니다.',
      category: category,
      class_count: items.length,
      chips: regionList.length ? regionList : ['전국']
    };
  })
  .sort((a, b) => b.class_count - a.class_count)
  .slice(0, 4);

const fallbackGuides = activeClasses
  .filter((item) => item.levelCode === 'BEGINNER')
  .slice()
  .sort((a, b) => {
    if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
    return a.price - b.price;
  })
  .slice(0, 4)
  .map((item) => ({
    class_id: item.class_id,
    title: item.class_name,
    category: item.category,
    partner_name: (partnerMap[item.partner_code] || {}).partner_name || '',
    region_label: item.regionLabel,
    price: item.price,
    level_label: item.levelLabel,
    checklist: buildGuideChecklist(item, item.levelLabel)
  }));

const editorialTrends = importedContent
  .filter((item) => item.contentType !== 'GUIDE')
  .slice(0, 4)
  .map((item) => {
    const recommended = pickRecommendedClass(item.category, '');
    return {
      title: item.title,
      eyebrow: item.contentType === 'EVENT' ? '새로 들어온 이벤트' : item.contentType === 'NOTICE' ? '협회 공지' : '새 콘텐츠',
      description: truncateText(item.bodyText || item.title, 110),
      category: item.category,
      class_count: recommended ? 1 : 0,
      chips: [item.affiliation_code || 'PRESSCO21', item.contentType, recommended ? recommended.regionLabel : '전국'].filter(Boolean)
    };
  });

const editorialGuides = importedContent
  .filter((item) => item.contentType === 'GUIDE')
  .slice(0, 4)
  .map((item) => {
    const recommended = pickRecommendedClass(item.category, 'BEGINNER');
    const checklist = splitChecklist(item.bodyText);
    return {
      class_id: recommended ? recommended.class_id : '',
      title: item.title,
      category: item.category,
      partner_name: recommended ? ((partnerMap[recommended.partner_code] || {}).partner_name || '') : '',
      region_label: recommended ? recommended.regionLabel : '전국',
      price: recommended ? recommended.price : 0,
      level_label: '가이드',
      checklist: checklist.length ? checklist : buildGuideChecklist(recommended || { regionCode: 'NATIONWIDE', duration_min: 0, kit_enabled: 0 }, recommended ? recommended.levelLabel : '입문')
    };
  });

return [{
  json: {
    success: true,
    data: {
      summary: summary,
      highlights: highlights,
      partner_stories: partnerStories,
      trends: editorialTrends.length ? editorialTrends : fallbackTrends,
      guides: editorialGuides.length ? editorialGuides : fallbackGuides,
      featured_message: importedContent[0] ? truncateText(importedContent[0].title + ' · ' + (importedContent[0].bodyText || ''), 90) : (highlights[0] ? highlights[0].highlight_copy : '전국 파트너 클래스와 콘텐츠를 한 허브에서 탐색하세요.'),
      imported_content_preview: importedContent.slice(0, 4).map((item) => ({
        title: item.title,
        content_type: item.contentType,
        publish_date: item.publishDate,
        category: item.category
      })),
      updated_at: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  }
}];
`;
}

module.exports = {
    buildContentHubResponseCode: buildContentHubResponseCode
};
