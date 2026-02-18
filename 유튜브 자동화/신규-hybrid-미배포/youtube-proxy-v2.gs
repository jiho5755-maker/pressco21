/*
 * =============================================
 * YouTube Proxy v2 - Google Apps Script
 * =============================================
 *
 * YouTube Data API v3 통합으로 조회수 정보 추가
 *
 * 개선사항:
 * - YouTube Data API v3로 조회수, 설명 등 상세 정보 추가
 * - 2단계 로딩: RSS (빠름) → Data API (상세)
 * - 10분 서버 캐싱 + 클라이언트 24시간 캐싱
 * - 에러 처리 및 fallback 강화
 *
 * =============================================
 */

// YouTube 채널 ID (pressco21)
var CHANNEL_ID = 'UCOt_7gyvjqHBw304hU4-FUw';

// YouTube Data API 키 (스크립트 속성에서 로드)
var API_KEY = PropertiesService.getScriptProperties().getProperty('YOUTUBE_API_KEY');

/*
 * GET 요청 처리 (캐싱 적용)
 *
 * 파라미터:
 * - count: 가져올 영상 개수 (기본값: 4)
 *
 * 응답 형식:
 * {
 *   status: 'success',
 *   items: [
 *     {
 *       id: 'videoId',
 *       title: '영상 제목',
 *       description: '영상 설명',
 *       publishedAt: '2026-02-06T10:00:00Z',
 *       thumbnail: 'https://...',
 *       viewCount: '15234'
 *     }
 *   ],
 *   count: 4,
 *   timestamp: '2026-02-06T10:30:00Z'
 * }
 */
function doGet(e) {
  var maxResults = e.parameter.count || 4;

  try {
    // 캐싱을 사용하여 빠르게 로드
    var videos = getLatestVideosWithCache(CHANNEL_ID, maxResults);

    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        items: videos,
        count: videos.length,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('[Error] ' + error.toString());
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
 * 캐싱을 사용한 영상 로드 (속도 개선!)
 *
 * 캐시 전략:
 * - 캐시 키: videos_v2_{channelId}_{maxResults}
 * - 캐시 유지 시간: 10분 (600초)
 * - 캐시 히트 시 0.1초 이내 응답
 * - 캐시 미스 시 2-3초 소요 (RSS + Data API 호출)
 */
function getLatestVideosWithCache(channelId, maxResults) {
  var cache = CacheService.getScriptCache();
  var cacheKey = 'videos_v2_' + channelId + '_' + maxResults;

  // 캐시에서 먼저 확인 (0.1초 이내!)
  var cached = cache.get(cacheKey);
  if (cached) {
    Logger.log('[캐시 히트] 캐시에서 반환');
    return JSON.parse(cached);
  }

  // 캐시가 없으면 새로 가져오기
  Logger.log('[캐시 미스] 새로 가져오기');

  try {
    // Step 1: RSS로 videoId 목록 빠르게 가져오기
    var videoIds = getVideoIdsFromRSS(channelId, maxResults);

    if (videoIds.length === 0) {
      throw new Error('RSS 피드에서 영상을 찾을 수 없습니다');
    }

    // Step 2: YouTube Data API로 상세 정보 (조회수 포함)
    var videos = getVideoDetails(videoIds);

    if (videos.length === 0) {
      throw new Error('YouTube Data API에서 영상 정보를 가져올 수 없습니다');
    }

    // 캐시에 저장 (10분 = 600초)
    cache.put(cacheKey, JSON.stringify(videos), 600);
    Logger.log('[캐시 저장] ' + videos.length + '개 영상 캐시 저장 완료');

    return videos;

  } catch (error) {
    Logger.log('[Error] getLatestVideosWithCache: ' + error.toString());

    // Fallback: RSS 데이터만 반환 (조회수 없음)
    try {
      var fallbackVideos = getVideosFromRSSOnly(channelId, maxResults);
      return fallbackVideos;
    } catch (fallbackError) {
      throw new Error('모든 데이터 소스에서 영상을 가져오는데 실패했습니다');
    }
  }
}

/*
 * RSS 피드에서 videoId 목록 가져오기
 *
 * RSS 피드는 빠르지만 조회수 정보가 없음
 * videoId 목록만 빠르게 가져오는 용도
 */
function getVideoIdsFromRSS(channelId, maxResults) {
  var rssUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + channelId;

  try {
    var response = UrlFetchApp.fetch(rssUrl, {
      'muteHttpExceptions': true,
      'validateHttpsCertificates': true
    });

    if (response.getResponseCode() !== 200) {
      throw new Error('YouTube RSS 피드 로드 실패: ' + response.getResponseCode());
    }

    var xml = response.getContentText();
    var document = XmlService.parse(xml);
    var root = document.getRootElement();

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

  } catch (error) {
    Logger.log('[Error] getVideoIdsFromRSS: ' + error.toString());
    throw error;
  }
}

/*
 * YouTube Data API v3로 영상 상세 정보 가져오기
 *
 * 필요한 정보:
 * - snippet.title: 영상 제목
 * - snippet.description: 영상 설명 (제품 코드 파싱용)
 * - snippet.publishedAt: 게시일 (NEW 배지 판단용)
 * - snippet.thumbnails: 썸네일 이미지
 * - statistics.viewCount: 조회수
 */
function getVideoDetails(videoIds) {
  if (!API_KEY) {
    throw new Error('YouTube Data API 키가 설정되지 않았습니다. 스크립트 속성에 YOUTUBE_API_KEY를 추가하세요.');
  }

  try {
    // YouTube Data API v3 호출
    var apiUrl = 'https://www.googleapis.com/youtube/v3/videos' +
      '?part=snippet,statistics' +
      '&id=' + videoIds.join(',') +
      '&key=' + API_KEY;

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

      videos.push({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description || '',
        publishedAt: item.snippet.publishedAt,
        thumbnail: item.snippet.thumbnails.medium.url,
        viewCount: item.statistics.viewCount || '0'
      });
    }

    Logger.log('[Data API] ' + videos.length + '개 영상 상세 정보 로드 완료');
    return videos;

  } catch (error) {
    Logger.log('[Error] getVideoDetails: ' + error.toString());
    throw error;
  }
}

/*
 * Fallback: RSS 데이터만으로 영상 목록 반환
 *
 * YouTube Data API 실패 시 사용
 * 조회수 정보는 없지만 영상은 표시 가능
 */
function getVideosFromRSSOnly(channelId, maxResults) {
  var rssUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + channelId;

  var response = UrlFetchApp.fetch(rssUrl);
  var xml = response.getContentText();
  var document = XmlService.parse(xml);
  var root = document.getRootElement();

  var atom = XmlService.getNamespace('http://www.w3.org/2005/Atom');
  var media = XmlService.getNamespace('media', 'http://search.yahoo.com/mrss/');
  var yt = XmlService.getNamespace('yt', 'http://www.youtube.com/xml/schemas/2015');

  var entries = root.getChildren('entry', atom);
  var videos = [];
  var limit = Math.min(entries.length, maxResults);

  for (var i = 0; i < limit; i++) {
    var entry = entries[i];

    var videoId = entry.getChild('videoId', yt).getText();
    var title = entry.getChild('title', atom).getText();
    var published = entry.getChild('published', atom).getText();

    // 썸네일은 기본값 사용
    var thumbnail = 'https://img.youtube.com/vi/' + videoId + '/mqdefault.jpg';

    videos.push({
      id: videoId,
      title: title,
      description: '', // RSS에는 설명이 없음
      publishedAt: published,
      thumbnail: thumbnail,
      viewCount: '0' // RSS에는 조회수가 없음
    });
  }

  Logger.log('[Fallback] RSS만으로 ' + videos.length + '개 영상 반환');
  return videos;
}

/*
 * 캐시 수동 삭제 (필요할 때만 사용)
 *
 * 사용 방법:
 * 1. Google Apps Script 편집기에서
 * 2. 함수 선택: clearCache
 * 3. 실행 버튼 클릭
 */
function clearCache() {
  var cache = CacheService.getScriptCache();
  var keys = [
    'videos_v2_' + CHANNEL_ID + '_4',
    'videos_v2_' + CHANNEL_ID + '_6',
    'videos_v2_' + CHANNEL_ID + '_8'
  ];

  cache.removeAll(keys);
  Logger.log('[캐시 삭제] 모든 캐시가 삭제되었습니다.');
  return '캐시가 삭제되었습니다.';
}

/*
 * 테스트 함수
 *
 * 사용 방법:
 * 1. Google Apps Script 편집기에서
 * 2. 함수 선택: testGetVideos
 * 3. 실행 버튼 클릭
 * 4. 실행 로그 확인 (보기 > 로그)
 */
function testGetVideos() {
  Logger.log('=== YouTube Proxy v2 테스트 시작 ===');

  // 캐시 삭제
  clearCache();

  Logger.log('\n=== 1. RSS 테스트 ===');
  try {
    var startRss = new Date().getTime();
    var videoIds = getVideoIdsFromRSS(CHANNEL_ID, 4);
    var endRss = new Date().getTime();
    Logger.log('소요 시간: ' + (endRss - startRss) + 'ms');
    Logger.log('videoIds: ' + videoIds.join(', '));
  } catch (error) {
    Logger.log('RSS 테스트 실패: ' + error.toString());
  }

  Logger.log('\n=== 2. Data API 테스트 ===');
  try {
    var startApi = new Date().getTime();
    var videos = getVideoDetails(videoIds);
    var endApi = new Date().getTime();
    Logger.log('소요 시간: ' + (endApi - startApi) + 'ms');
    Logger.log('총 영상 수: ' + videos.length);

    if (videos.length > 0) {
      Logger.log('\n첫 번째 영상:');
      Logger.log('- 제목: ' + videos[0].title);
      Logger.log('- 조회수: ' + videos[0].viewCount);
      Logger.log('- 게시일: ' + videos[0].publishedAt);
    }
  } catch (error) {
    Logger.log('Data API 테스트 실패: ' + error.toString());
  }

  Logger.log('\n=== 3. 캐싱 테스트 ===');
  try {
    var start1 = new Date().getTime();
    var cachedVideos = getLatestVideosWithCache(CHANNEL_ID, 4);
    var end1 = new Date().getTime();
    Logger.log('첫 호출 (캐시 없음): ' + (end1 - start1) + 'ms');

    var start2 = new Date().getTime();
    var cachedVideos2 = getLatestVideosWithCache(CHANNEL_ID, 4);
    var end2 = new Date().getTime();
    Logger.log('두 번째 호출 (캐시 사용): ' + (end2 - start2) + 'ms');
  } catch (error) {
    Logger.log('캐싱 테스트 실패: ' + error.toString());
  }

  Logger.log('\n=== 테스트 완료 ===');
}

/*
 * API 키 설정 확인
 *
 * 사용 방법:
 * 1. Google Apps Script 편집기에서
 * 2. 함수 선택: checkApiKey
 * 3. 실행 버튼 클릭
 */
function checkApiKey() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('YOUTUBE_API_KEY');

  if (!apiKey) {
    Logger.log('[경고] YouTube Data API 키가 설정되지 않았습니다!');
    Logger.log('');
    Logger.log('설정 방법:');
    Logger.log('1. 프로젝트 설정 (톱니바퀴 아이콘) 클릭');
    Logger.log('2. "스크립트 속성" 탭 선택');
    Logger.log('3. "속성 추가" 클릭');
    Logger.log('4. 속성: YOUTUBE_API_KEY');
    Logger.log('5. 값: (발급받은 API 키)');
    Logger.log('6. 저장');
    return 'API 키가 설정되지 않았습니다';
  } else {
    Logger.log('[확인] YouTube Data API 키가 설정되어 있습니다');
    Logger.log('키 앞 10자: ' + apiKey.substring(0, 10) + '...');
    return 'API 키가 설정되어 있습니다';
  }
}
