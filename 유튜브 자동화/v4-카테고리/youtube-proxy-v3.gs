/*
 * =============================================
 * YouTube Proxy v3 - Google Apps Script
 * v4 카테고리 자동매칭 통합 버전
 * =============================================
 *
 * 기능:
 * - YouTube Data API v3로 채널 영상 목록 조회 (제목, 설명, 태그, 조회수)
 * - Google Sheets에서 카테고리 키워드 테이블 읽기
 * - Google Sheets에서 카테고리별 상품 목록 읽기
 * - 통합 JSON 응답 반환
 * - CacheService 5분 캐싱
 *
 * Google Sheets 구조:
 * [시트1: 카테고리키워드]
 *   A열: 키워드 | B열: 카테고리
 *   예) 압화 | 압화
 *       pressed | 압화
 *       보존화 | 보존화
 *
 * [시트2: 카테고리상품]
 *   A열: 카테고리 | B열: branduid | C열: 상품명 | D열: 가격 | E열: 이미지URL
 *   예) 압화 | 1001 | 압화 스타터 키트 | 35000 | https://jewoo.img4.kr/...
 *       default | 2001 | 베스트셀러 1 | 28000 | https://jewoo.img4.kr/...
 *
 * 스크립트 속성 (프로젝트 설정 > 스크립트 속성):
 * - YOUTUBE_API_KEY: YouTube Data API v3 키
 * - SPREADSHEET_ID: Google Sheets 스프레드시트 ID
 *
 * =============================================
 */

// 채널 ID (pressco21)
var CHANNEL_ID = 'UCOt_7gyvjqHBw304hU4-FUw';

// 스크립트 속성에서 민감 정보 로드
var API_KEY = PropertiesService.getScriptProperties().getProperty('YOUTUBE_API_KEY');
var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');

// 캐시 유지 시간 (초)
var CACHE_DURATION = 300; // 5분

/*
 * =============================================
 * GET 요청 처리 (메인 엔트리포인트)
 *
 * 파라미터:
 * - count: 가져올 영상 개수 (기본값: 5, 최대: 10)
 *
 * 응답 형식:
 * {
 *   status: 'success',
 *   items: [{id, title, description, tags, publishedAt, viewCount, thumbnail}],
 *   categoryKeywords: { "키워드": "카테고리명", ... },
 *   categoryProducts: { "카테고리명": [{branduid, name, price, image}], ... },
 *   timestamp: "..."
 * }
 * =============================================
 */
function doGet(e) {
  var maxResults = Math.min(parseInt(e.parameter.count) || 5, 10);

  try {
    var result = getIntegratedDataWithCache(maxResults);

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('[Error] doGet: ' + error.toString());

    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: error.toString(),
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/*
 * =============================================
 * 통합 데이터 조회 (캐싱 적용)
 *
 * 캐시 키: integrated_v3_{count}
 * 캐시 유지: 5분 (300초)
 * =============================================
 */
function getIntegratedDataWithCache(maxResults) {
  var cache = CacheService.getScriptCache();
  var cacheKey = 'integrated_v3_' + maxResults;

  // 캐시 확인
  var cached = cache.get(cacheKey);
  if (cached) {
    Logger.log('[캐시 히트] 통합 데이터 캐시에서 반환');
    return JSON.parse(cached);
  }

  Logger.log('[캐시 미스] 통합 데이터 새로 조회');

  // 1. YouTube 영상 목록 조회
  var videos = getLatestVideos(maxResults);

  // 2. Google Sheets에서 카테고리 키워드 테이블 읽기
  var categoryKeywords = getCategoryKeywords();

  // 3. Google Sheets에서 카테고리별 상품 목록 읽기
  var categoryProducts = getCategoryProducts();

  var result = {
    status: 'success',
    items: videos,
    categoryKeywords: categoryKeywords,
    categoryProducts: categoryProducts,
    timestamp: new Date().toISOString()
  };

  // 캐시 저장 (5분)
  // CacheService 값 크기 제한: 100KB
  var jsonStr = JSON.stringify(result);
  if (jsonStr.length < 100000) {
    cache.put(cacheKey, jsonStr, CACHE_DURATION);
    Logger.log('[캐시 저장] 통합 데이터 캐시 저장 완료 (' + jsonStr.length + ' bytes)');
  } else {
    Logger.log('[캐시 경고] 데이터가 100KB를 초과하여 캐시하지 않음');
  }

  return result;
}

/*
 * =============================================
 * YouTube 영상 목록 조회
 *
 * 2단계 로딩:
 * Step 1: RSS로 videoId 목록 빠르게 가져오기
 * Step 2: YouTube Data API v3로 상세 정보 (태그, 조회수 포함)
 * Fallback: API 실패 시 RSS 데이터만 반환
 * =============================================
 */
function getLatestVideos(maxResults) {
  try {
    // Step 1: RSS로 videoId 빠르게 추출
    var videoIds = getVideoIdsFromRSS(maxResults);

    if (videoIds.length === 0) {
      throw new Error('RSS 피드에서 영상을 찾을 수 없습니다');
    }

    // Step 2: YouTube Data API v3로 상세 정보 (태그 포함!)
    var videos = getVideoDetailsWithTags(videoIds);

    if (videos.length === 0) {
      throw new Error('YouTube Data API에서 영상 정보를 가져올 수 없습니다');
    }

    return videos;

  } catch (error) {
    Logger.log('[Error] getLatestVideos: ' + error.toString());

    // Fallback: RSS 데이터만 반환 (태그, 조회수 없음)
    try {
      return getVideosFromRSSOnly(maxResults);
    } catch (fallbackError) {
      throw new Error('모든 데이터 소스에서 영상을 가져오는데 실패했습니다');
    }
  }
}

/*
 * RSS 피드에서 videoId 목록 추출
 */
function getVideoIdsFromRSS(maxResults) {
  var rssUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + CHANNEL_ID;

  var response = UrlFetchApp.fetch(rssUrl, {
    'muteHttpExceptions': true,
    'validateHttpsCertificates': true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('YouTube RSS 피드 로드 실패: ' + response.getResponseCode());
  }

  var xml = response.getContentText();
  var doc = XmlService.parse(xml);
  var root = doc.getRootElement();

  var atom = XmlService.getNamespace('http://www.w3.org/2005/Atom');
  var yt = XmlService.getNamespace('yt', 'http://www.youtube.com/xml/schemas/2015');

  var entries = root.getChildren('entry', atom);
  var videoIds = [];
  var limit = Math.min(entries.length, maxResults);

  for (var i = 0; i < limit; i++) {
    var videoId = entries[i].getChild('videoId', yt).getText();
    videoIds.push(videoId);
  }

  Logger.log('[RSS] ' + videoIds.length + '개 영상 ID 추출 완료');
  return videoIds;
}

/*
 * YouTube Data API v3로 영상 상세 정보 조회
 * snippet.tags 포함 (카테고리 매칭에 사용)
 */
function getVideoDetailsWithTags(videoIds) {
  if (!API_KEY) {
    throw new Error('YOUTUBE_API_KEY가 스크립트 속성에 설정되지 않았습니다');
  }

  var apiUrl = 'https://www.googleapis.com/youtube/v3/videos'
    + '?part=snippet,statistics'
    + '&id=' + videoIds.join(',')
    + '&key=' + API_KEY;

  var response = UrlFetchApp.fetch(apiUrl, {
    'muteHttpExceptions': true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('YouTube Data API 호출 실패: ' + response.getResponseCode());
  }

  var data = JSON.parse(response.getContentText());

  if (!data.items || data.items.length === 0) {
    throw new Error('YouTube Data API 응답에 영상이 없습니다');
  }

  var videos = [];
  for (var i = 0; i < data.items.length; i++) {
    var item = data.items[i];
    var snippet = item.snippet;
    var stats = item.statistics;

    videos.push({
      id: item.id,
      title: snippet.title || '',
      description: snippet.description || '',
      tags: snippet.tags || [],
      publishedAt: snippet.publishedAt,
      viewCount: stats.viewCount || '0',
      thumbnail: snippet.thumbnails.medium
        ? snippet.thumbnails.medium.url
        : 'https://img.youtube.com/vi/' + item.id + '/mqdefault.jpg'
    });
  }

  Logger.log('[Data API] ' + videos.length + '개 영상 상세 정보 (태그 포함) 로드 완료');
  return videos;
}

/*
 * Fallback: RSS만으로 영상 목록 반환 (태그, 조회수 없음)
 */
function getVideosFromRSSOnly(maxResults) {
  var rssUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + CHANNEL_ID;
  var response = UrlFetchApp.fetch(rssUrl);
  var xml = response.getContentText();
  var doc = XmlService.parse(xml);
  var root = doc.getRootElement();

  var atom = XmlService.getNamespace('http://www.w3.org/2005/Atom');
  var yt = XmlService.getNamespace('yt', 'http://www.youtube.com/xml/schemas/2015');

  var entries = root.getChildren('entry', atom);
  var videos = [];
  var limit = Math.min(entries.length, maxResults);

  for (var i = 0; i < limit; i++) {
    var entry = entries[i];
    var videoId = entry.getChild('videoId', yt).getText();
    var title = entry.getChild('title', atom).getText();
    var published = entry.getChild('published', atom).getText();

    videos.push({
      id: videoId,
      title: title,
      description: '',
      tags: [],
      publishedAt: published,
      viewCount: '0',
      thumbnail: 'https://img.youtube.com/vi/' + videoId + '/mqdefault.jpg'
    });
  }

  Logger.log('[Fallback] RSS만으로 ' + videos.length + '개 영상 반환 (태그/조회수 없음)');
  return videos;
}

/*
 * =============================================
 * Google Sheets - 카테고리 키워드 테이블 읽기
 *
 * 시트명: "카테고리키워드"
 * A열: 키워드 | B열: 카테고리
 *
 * 반환: { "압화": "압화", "pressed": "압화", "보존화": "보존화", ... }
 * =============================================
 */
function getCategoryKeywords() {
  if (!SPREADSHEET_ID) {
    Logger.log('[경고] SPREADSHEET_ID가 설정되지 않음. 빈 키워드 테이블 반환');
    return {};
  }

  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('카테고리키워드');

    if (!sheet) {
      Logger.log('[경고] "카테고리키워드" 시트를 찾을 수 없음');
      return {};
    }

    var data = sheet.getDataRange().getValues();
    var keywords = {};

    // 1행은 헤더, 2행부터 데이터
    for (var i = 1; i < data.length; i++) {
      var keyword = String(data[i][0]).trim();
      var category = String(data[i][1]).trim();

      if (keyword && category) {
        keywords[keyword] = category;
      }
    }

    Logger.log('[Sheets] 카테고리 키워드 ' + Object.keys(keywords).length + '개 로드 완료');
    return keywords;

  } catch (error) {
    Logger.log('[Error] getCategoryKeywords: ' + error.toString());
    return {};
  }
}

/*
 * =============================================
 * Google Sheets - 카테고리별 상품 목록 읽기
 *
 * 시트명: "카테고리상품"
 * A열: 카테고리 | B열: branduid | C열: 상품명 | D열: 가격 | E열: 이미지URL
 *
 * 반환: {
 *   "압화": [{ branduid: "1001", name: "...", price: "35000", image: "..." }, ...],
 *   "default": [{ ... }]
 * }
 * =============================================
 */
function getCategoryProducts() {
  if (!SPREADSHEET_ID) {
    Logger.log('[경고] SPREADSHEET_ID가 설정되지 않음. 빈 상품 목록 반환');
    return {};
  }

  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('카테고리상품');

    if (!sheet) {
      Logger.log('[경고] "카테고리상품" 시트를 찾을 수 없음');
      return {};
    }

    var data = sheet.getDataRange().getValues();
    var products = {};

    // 1행은 헤더, 2행부터 데이터
    for (var i = 1; i < data.length; i++) {
      var category = String(data[i][0]).trim();
      var branduid = String(data[i][1]).trim();
      var name = String(data[i][2]).trim();
      var price = String(data[i][3]).trim();
      var image = String(data[i][4]).trim();

      if (!category || !branduid) continue;

      if (!products[category]) {
        products[category] = [];
      }

      products[category].push({
        branduid: branduid,
        name: name,
        price: price,
        image: image
      });
    }

    // 카테고리별 상품 수 로그
    var summary = [];
    for (var cat in products) {
      summary.push(cat + ':' + products[cat].length + '개');
    }
    Logger.log('[Sheets] 카테고리 상품 로드 완료 - ' + summary.join(', '));

    return products;

  } catch (error) {
    Logger.log('[Error] getCategoryProducts: ' + error.toString());
    return {};
  }
}

/*
 * =============================================
 * 유틸리티 함수
 * =============================================
 */

/*
 * 캐시 수동 삭제
 * Google Apps Script 편집기에서 직접 실행
 */
function clearCache() {
  var cache = CacheService.getScriptCache();
  var keys = [];
  for (var i = 1; i <= 10; i++) {
    keys.push('integrated_v3_' + i);
  }
  cache.removeAll(keys);
  Logger.log('[캐시 삭제] 모든 통합 캐시가 삭제되었습니다');
  return '캐시가 삭제되었습니다';
}

/*
 * 설정 확인 (디버깅용)
 */
function checkConfig() {
  Logger.log('=== youtube-proxy-v3 설정 확인 ===');

  var apiKey = PropertiesService.getScriptProperties().getProperty('YOUTUBE_API_KEY');
  var sheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');

  if (apiKey) {
    Logger.log('[OK] YOUTUBE_API_KEY: ' + apiKey.substring(0, 10) + '...');
  } else {
    Logger.log('[누락] YOUTUBE_API_KEY가 설정되지 않았습니다');
  }

  if (sheetId) {
    Logger.log('[OK] SPREADSHEET_ID: ' + sheetId.substring(0, 15) + '...');

    try {
      var ss = SpreadsheetApp.openById(sheetId);
      var sheets = ss.getSheets();
      var sheetNames = [];
      for (var i = 0; i < sheets.length; i++) {
        sheetNames.push(sheets[i].getName());
      }
      Logger.log('[OK] 시트 목록: ' + sheetNames.join(', '));

      var hasKeywords = sheetNames.indexOf('카테고리키워드') >= 0;
      var hasProducts = sheetNames.indexOf('카테고리상품') >= 0;

      if (!hasKeywords) Logger.log('[누락] "카테고리키워드" 시트가 없습니다');
      if (!hasProducts) Logger.log('[누락] "카테고리상품" 시트가 없습니다');
    } catch (e) {
      Logger.log('[Error] 스프레드시트 접근 실패: ' + e.toString());
    }
  } else {
    Logger.log('[누락] SPREADSHEET_ID가 설정되지 않았습니다');
  }

  Logger.log('채널 ID: ' + CHANNEL_ID);
  Logger.log('=================================');
}

/*
 * 통합 테스트
 */
function testIntegrated() {
  Logger.log('=== youtube-proxy-v3 통합 테스트 ===');

  // 캐시 삭제
  clearCache();

  var startTime = new Date().getTime();

  try {
    var result = getIntegratedDataWithCache(5);
    var elapsed = new Date().getTime() - startTime;

    Logger.log('소요 시간: ' + elapsed + 'ms');
    Logger.log('상태: ' + result.status);
    Logger.log('영상 수: ' + result.items.length);

    if (result.items.length > 0) {
      var first = result.items[0];
      Logger.log('첫 영상: ' + first.title);
      Logger.log('태그: ' + (first.tags.length > 0 ? first.tags.join(', ') : '없음'));
      Logger.log('조회수: ' + first.viewCount);
    }

    Logger.log('키워드 수: ' + Object.keys(result.categoryKeywords).length);
    Logger.log('카테고리 상품 수: ' + Object.keys(result.categoryProducts).length);

    // 캐시 테스트
    var start2 = new Date().getTime();
    var result2 = getIntegratedDataWithCache(5);
    var elapsed2 = new Date().getTime() - start2;
    Logger.log('캐시 조회 시간: ' + elapsed2 + 'ms');

  } catch (error) {
    Logger.log('[Error] 테스트 실패: ' + error.toString());
  }

  Logger.log('====================================');
}
