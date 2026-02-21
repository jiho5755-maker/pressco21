/*
 * =============================================
 * PRESSCO21 파트너 클래스 플랫폼 - GAS 백엔드
 * Task 201 + Task 221 + Task 223: Phase 2 데이터 구조 + 정산/이메일 파이프라인 + 파트너 관리
 * =============================================
 *
 * 역할:
 * - 파트너 인증 (member_id -> 파트너 매칭)
 * - 클래스 목록/상세 조회 (CacheService 5분 캐싱)
 * - 예약 기록 + 정산 파이프라인 (수강생 정보 포함)
 * - 주문 폴링 (10분 간격 시간 트리거)
 * - 수수료 계산 + 적립금 지급 (process_reserve API)
 * - 이메일 자동화 (예약 확인, D-3/D-1 리마인더, 후기 요청)
 * - FAILED 정산 재시도 (LockService + 5분 타임아웃 + retry_count 추적)
 * - 파트너 신청/승인/등급 관리 (Task 223)
 *
 * Google Sheets 시트 구조:
 * - "파트너 상세": 파트너 정보 (등급, 수수료율, 연락처 등)
 * - "클래스 메타": 클래스/강의 정보 (커리큘럼, 이미지, 가격 등)
 * - "정산 내역": 주문별 수수료 계산/적립금 지급 이력 + 수강생 정보 (student_name/email/phone)
 * - "주문 처리 로그": 폴링 실행 로그
 * - "이메일 발송 로그": 일일 이메일 카운트 및 이력
 * - "시스템 설정": 마지막 폴링 시각 등 런타임 설정
 * - "파트너 신청": 파트너 가입 신청 접수/심사 이력 (Task 223)
 *
 * 스크립트 속성 (PropertiesService):
 * - SHOPKEY: 메이크샵 API 상점키
 * - LICENSEKEY: 메이크샵 API 라이센스키
 * - SHOP_DOMAIN: foreverlove.co.kr
 * - SPREADSHEET_ID: Google Sheets 스프레드시트 ID
 * - ADMIN_EMAIL: 관리자 알림 이메일
 * - GAS_ENDPOINT: 이 웹 앱의 배포 URL
 *
 * =============================================
 */

// ===== 전역 설정 =====
var PROPS = PropertiesService.getScriptProperties();
var SHOPKEY = PROPS.getProperty('SHOPKEY');
var LICENSEKEY = PROPS.getProperty('LICENSEKEY');
var SHOP_DOMAIN = PROPS.getProperty('SHOP_DOMAIN') || 'foreverlove.co.kr';
var SPREADSHEET_ID = PROPS.getProperty('SPREADSHEET_ID');
var ADMIN_EMAIL = PROPS.getProperty('ADMIN_EMAIL');
var GAS_ENDPOINT = PROPS.getProperty('GAS_ENDPOINT');

// 캐시 TTL 상수 (초)
var CACHE_TTL_CLASSES = 300;       // 클래스 목록/상세: 5분
var CACHE_TTL_PARTNER_AUTH = 1800; // 파트너 인증: 30분
var CACHE_TTL_CATEGORIES = 21600;  // 카테고리: 6시간 (CacheService 최대값, W-02 수정)

// 이메일 한도 상수
var EMAIL_DAILY_LIMIT = 100;       // Gmail 무료 일일 한도
var EMAIL_WARNING_THRESHOLD = 70;  // 경고 발송 기준

// 수수료 정책 상수
var COMMISSION_RATES = {
  'SILVER':   { commissionRate: 0.10, reserveRate: 1.00 },
  'GOLD':     { commissionRate: 0.12, reserveRate: 0.80 },
  'PLATINUM': { commissionRate: 0.15, reserveRate: 0.60 }
};

// 에러 코드 상수
var ERROR_CODES = {
  NOT_LOGGED_IN:      { code: 'NOT_LOGGED_IN',      message: '로그인이 필요합니다.' },
  NOT_PARTNER:        { code: 'NOT_PARTNER',         message: '파트너로 등록되지 않은 회원입니다.' },
  PARTNER_INACTIVE:   { code: 'PARTNER_INACTIVE',    message: '비활성 상태의 파트너 계정입니다.' },
  INVALID_ACTION:     { code: 'INVALID_ACTION',      message: '알 수 없는 요청입니다.' },
  LOCK_TIMEOUT:       { code: 'LOCK_TIMEOUT',        message: '동시 요청이 많아 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.' },
  REFERER_MISMATCH:   { code: 'REFERER_MISMATCH',    message: '허용되지 않은 출처에서의 요청입니다.' },
  CLASS_NOT_FOUND:    { code: 'CLASS_NOT_FOUND',     message: '해당 클래스를 찾을 수 없습니다.' },
  RESERVATION_FAILED: { code: 'RESERVATION_FAILED',  message: '예약 기록에 실패했습니다.' },
  RESERVE_API_FAILED: { code: 'RESERVE_API_FAILED',  message: '적립금 지급에 실패했습니다.' },
  MISSING_PARAMS:     { code: 'MISSING_PARAMS',      message: '필수 파라미터가 누락되었습니다.' },
  INTERNAL_ERROR:     { code: 'INTERNAL_ERROR',      message: '내부 서버 오류가 발생했습니다.' }
};


// =============================================
// 1. HTTP 엔드포인트 (doGet / doPost)
// =============================================

/**
 * GET 요청 처리 (메인 엔트리포인트)
 *
 * 지원 action:
 * - getClasses: 클래스 목록 (공개, 캐시 5분)
 * - getClassDetail: 클래스 상세 (공개, 캐시 5분)
 * - getPartnerAuth: 파트너 인증 확인 (캐시 없음)
 * - getPartnerDashboard: 파트너 대시보드 데이터 (인증 필수)
 * - getCategories: 카테고리 목록 (공개, 캐시 6시간)
 * - getPartnerApplicationStatus: 파트너 신청 상태 조회 (Task 223)
 * - health: 헬스 체크
 *
 * @param {Object} e - HTTP 요청 객체
 * @return {TextOutput} JSON 응답
 */
function doGet(e) {
  var action = (e.parameter.action || '').trim();
  var result;

  try {
    switch (action) {
      case 'getClasses':
        result = handleGetClasses(e.parameter);
        break;

      case 'getClassDetail':
        result = handleGetClassDetail(e.parameter);
        break;

      case 'getPartnerAuth':
        result = handleGetPartnerAuth(e.parameter);
        break;

      case 'getPartnerDashboard':
        result = handleGetPartnerDashboard(e.parameter);
        break;

      case 'getCategories':
        result = handleGetCategories();
        break;

      case 'getPartnerApplicationStatus':
        result = handleGetPartnerApplicationStatus(e.parameter);
        break;

      case 'health':
        result = { success: true, status: 'ok', timestamp: now_() };
        break;

      default:
        result = errorResult(ERROR_CODES.INVALID_ACTION);
    }
  } catch (err) {
    logError_('doGet', action, err);
    result = errorResult(ERROR_CODES.INTERNAL_ERROR, err.message);
  }

  return jsonResponse(result);
}

/**
 * POST 요청 처리
 *
 * 지원 action:
 * - recordBooking: 예약 기록 + 정산 트리거 (LockService 필수)
 * - pollOrders: 주문 폴링 (시간 트리거 또는 수동 호출, 관리자 토큰 필수)
 * - updateClassStatus: 클래스 상태 변경 (파트너 인증 필수)
 * - clearCache: 캐시 전체 삭제 (관리자 토큰 필수)
 * - partnerApply: 파트너 신청 접수 (Task 223)
 * - partnerApprove: 파트너 승인 처리 (관리자 토큰 필수, Task 223)
 *
 * @param {Object} e - HTTP 요청 객체
 * @return {TextOutput} JSON 응답
 */
function doPost(e) {
  var action = (e.parameter.action || '').trim();
  var result;

  try {
    // C-02 수정: 관리자 전용 액션에 ADMIN_API_TOKEN 검증 추가
    // GAS 웹 앱은 Referer/Origin 헤더 접근 불가 -> 토큰 파라미터 방식 사용
    // 스크립트 속성에 ADMIN_API_TOKEN 설정 필요
    var adminActions = ['pollOrders', 'clearCache', 'partnerApprove'];
    if (adminActions.indexOf(action) !== -1) {
      var requestToken = e.parameter.token || '';
      var adminToken = PROPS.getProperty('ADMIN_API_TOKEN') || '';
      if (!adminToken || requestToken !== adminToken) {
        return jsonResponse(errorResult(ERROR_CODES.REFERER_MISMATCH, '관리자 전용 요청입니다. 유효한 토큰이 필요합니다.'));
      }
    }

    // POST 본문 파싱 (JSON 또는 폼 데이터)
    var postData = {};
    if (e.postData && e.postData.type === 'application/json') {
      postData = JSON.parse(e.postData.contents);
    } else if (e.postData) {
      postData = e.parameter; // 폼 데이터는 parameter에 통합
    }

    switch (action) {
      case 'recordBooking':
        result = handleRecordBooking(postData);
        break;

      case 'pollOrders':
        result = handlePollOrders();
        break;

      case 'updateClassStatus':
        result = handleUpdateClassStatus(postData);
        break;

      case 'clearCache':
        result = handleClearCache();
        break;

      case 'partnerApply':
        result = handlePartnerApply(postData);
        break;

      case 'partnerApprove':
        result = handlePartnerApprove(postData);
        break;

      default:
        result = errorResult(ERROR_CODES.INVALID_ACTION);
    }
  } catch (err) {
    logError_('doPost', action, err);
    result = errorResult(ERROR_CODES.INTERNAL_ERROR, err.message);
  }

  return jsonResponse(result);
}


// =============================================
// 2. GET 핸들러
// =============================================

/**
 * 클래스 목록 조회
 * - CacheService 5분 캐싱
 * - 파라미터: category, level, type, region, sort, page, limit
 *
 * @param {Object} params - URL 파라미터
 * @return {Object} 클래스 목록 응답
 */
function handleGetClasses(params) {
  var category = (params.category || '').trim();
  var level = (params.level || '').trim();
  var classType = (params.type || '').trim();
  var region = (params.region || '').trim();
  var sort = (params.sort || 'latest').trim();
  var page = parseInt(params.page) || 1;
  var limit = Math.min(parseInt(params.limit) || 20, 50);
  var forceRefresh = params.force === '1';

  // 캐시 키 생성 (필터 조합별)
  var cacheKey = 'classes_' + category + '_' + level + '_' + classType + '_' + region + '_' + sort + '_' + page + '_' + limit;

  // 캐시 확인 (force 아닌 경우)
  if (!forceRefresh) {
    var cache = CacheService.getScriptCache();
    var cached = cache.get(cacheKey);
    if (cached) {
      Logger.log('[캐시 히트] 클래스 목록: ' + cacheKey);
      var cachedData = JSON.parse(cached);
      cachedData.cached = true;
      return cachedData;
    }
  }

  Logger.log('[캐시 미스] 클래스 목록 조회: ' + cacheKey);

  // Sheets에서 클래스 데이터 읽기
  var sheet = getSheet_('클래스 메타');
  if (!sheet) {
    return errorResult(ERROR_CODES.INTERNAL_ERROR, '"클래스 메타" 시트를 찾을 수 없습니다.');
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var classes = [];

  // 1행 헤더, 2행부터 데이터
  for (var i = 1; i < data.length; i++) {
    var row = rowToObject_(headers, data[i]);

    // status가 active인 것만 공개
    if (row.status !== 'active') continue;

    // 필터 적용
    if (category && row.category !== category) continue;
    if (level && row.level !== level) continue;
    if (classType && row.type !== classType) continue;
    if (region && row.location && row.location.indexOf(region) === -1) continue;

    // 파트너 정보 간략하게 포함 (공개 목록용)
    var partnerInfo = getPartnerPublicInfo_(row.partner_code);

    classes.push({
      class_id: row.class_id,
      makeshop_product_id: row.makeshop_product_id,
      class_name: row.class_name,
      category: row.category,
      level: row.level,
      price: Number(row.price) || 0,
      duration_min: Number(row.duration_min) || 0,
      max_students: Number(row.max_students) || 0,
      thumbnail_url: row.thumbnail_url || '',
      location: row.location || '',
      tags: row.tags || '',
      class_count: Number(row.class_count) || 0,
      avg_rating: Number(row.avg_rating) || 0,
      partner_name: partnerInfo.partner_name || '',
      partner_code: row.partner_code
    });
  }

  // 정렬
  classes = sortClasses_(classes, sort);

  // 페이징
  var totalCount = classes.length;
  var totalPages = Math.ceil(totalCount / limit);
  var startIdx = (page - 1) * limit;
  var pagedClasses = classes.slice(startIdx, startIdx + limit);

  var result = {
    success: true,
    data: pagedClasses,
    pagination: {
      page: page,
      limit: limit,
      totalCount: totalCount,
      totalPages: totalPages
    },
    timestamp: now_()
  };

  // 캐시 저장 (5분)
  var jsonStr = JSON.stringify(result);
  if (jsonStr.length < 100000) { // CacheService 100KB 제한
    CacheService.getScriptCache().put(cacheKey, jsonStr, CACHE_TTL_CLASSES);
    Logger.log('[캐시 저장] 클래스 목록 (' + jsonStr.length + ' bytes)');
  }

  return result;
}

/**
 * 클래스 상세 조회
 * - CacheService 5분 캐싱
 * - 파라미터: id (class_id)
 *
 * @param {Object} params - URL 파라미터
 * @return {Object} 클래스 상세 응답
 */
function handleGetClassDetail(params) {
  var classId = (params.id || '').trim();
  if (!classId) {
    return errorResult(ERROR_CODES.MISSING_PARAMS, 'id 파라미터가 필요합니다.');
  }

  var forceRefresh = params.force === '1';
  var cacheKey = 'class_detail_' + classId;

  // 캐시 확인
  if (!forceRefresh) {
    var cache = CacheService.getScriptCache();
    var cached = cache.get(cacheKey);
    if (cached) {
      Logger.log('[캐시 히트] 클래스 상세: ' + classId);
      var cachedData = JSON.parse(cached);
      cachedData.cached = true;
      return cachedData;
    }
  }

  Logger.log('[캐시 미스] 클래스 상세 조회: ' + classId);

  // Sheets에서 클래스 데이터 찾기
  var classData = findClassById_(classId);
  if (!classData) {
    return errorResult(ERROR_CODES.CLASS_NOT_FOUND);
  }

  // 파트너 공개 정보 포함
  var partnerInfo = getPartnerPublicInfo_(classData.partner_code);

  // 커리큘럼 JSON 파싱
  var curriculum = [];
  if (classData.curriculum_json) {
    try {
      curriculum = JSON.parse(classData.curriculum_json);
    } catch (e) {
      Logger.log('[경고] 커리큘럼 JSON 파싱 실패: ' + classId);
    }
  }

  // 이미지 URL 배열 변환 (콤마 구분)
  var images = [];
  if (classData.image_urls) {
    images = classData.image_urls.split(',').map(function(url) {
      return url.trim();
    }).filter(function(url) {
      return url.length > 0;
    });
  }

  // 재료 상품 ID 배열 변환
  var materialsProductIds = [];
  if (classData.materials_product_ids) {
    materialsProductIds = classData.materials_product_ids.split(',').map(function(id) {
      return id.trim();
    }).filter(function(id) {
      return id.length > 0;
    });
  }

  // 재료비 (없으면 0)
  var materialsPrice = Number(classData.materials_price) || 0;

  // 일정(schedules) JSON 파싱 - 실패 시 빈 배열 반환
  var schedules = [];
  if (classData.schedules_json) {
    try {
      schedules = JSON.parse(classData.schedules_json);
      // 유효한 배열인지 확인
      if (!Array.isArray(schedules)) {
        Logger.log('[경고] schedules_json이 배열이 아님: ' + classId);
        schedules = [];
      }
    } catch (e) {
      Logger.log('[경고] schedules_json 파싱 실패: ' + classId + ' - ' + e.message);
    }
  }

  var result = {
    success: true,
    data: {
      class_id: classData.class_id,
      makeshop_product_id: classData.makeshop_product_id,
      class_name: classData.class_name,
      category: classData.category,
      level: classData.level,
      price: Number(classData.price) || 0,
      materials_price: materialsPrice,
      duration_min: Number(classData.duration_min) || 0,
      max_students: Number(classData.max_students) || 0,
      description: classData.description || '',
      curriculum: curriculum,
      instructor_bio: classData.instructor_bio || '',
      thumbnail_url: classData.thumbnail_url || '',
      images: images,
      youtube_video_id: classData.youtube_video_id || '',
      location: classData.location || '',
      materials_included: classData.materials_included || '',
      materials_product_ids: materialsProductIds,
      tags: classData.tags || '',
      class_count: Number(classData.class_count) || 0,
      avg_rating: Number(classData.avg_rating) || 0,
      schedules: schedules,
      partner: partnerInfo
    },
    timestamp: now_()
  };

  // 캐시 저장 (5분)
  var jsonStr = JSON.stringify(result);
  if (jsonStr.length < 100000) {
    CacheService.getScriptCache().put(cacheKey, jsonStr, CACHE_TTL_CLASSES);
    Logger.log('[캐시 저장] 클래스 상세 (' + jsonStr.length + ' bytes)');
  }

  return result;
}

/**
 * 파트너 인증 확인
 * - 캐시 없음 (보안 민감)
 * - 파라미터: member_id
 *
 * @param {Object} params - URL 파라미터
 * @return {Object} 파트너 인증 결과
 */
function handleGetPartnerAuth(params) {
  var memberId = (params.member_id || '').trim();

  if (!memberId) {
    return errorResult(ERROR_CODES.NOT_LOGGED_IN);
  }

  // Sheets "파트너 상세"에서 member_id로 검색
  var partner = findPartnerByMemberId_(memberId);

  if (!partner) {
    return {
      success: true,
      data: {
        is_partner: false,
        member_id: memberId
      },
      timestamp: now_()
    };
  }

  if (partner.status !== 'active') {
    return errorResult(ERROR_CODES.PARTNER_INACTIVE);
  }

  return {
    success: true,
    data: {
      is_partner: true,
      member_id: memberId,
      partner_code: partner.partner_code,
      partner_name: partner.partner_name,
      grade: partner.grade,
      commission_rate: Number(partner.commission_rate) || 0,
      reserve_rate: Number(partner.reserve_rate) || 0,
      education_completed: partner.education_completed === 'TRUE' || partner.education_completed === true,
      status: partner.status
    },
    timestamp: now_()
  };
}

/**
 * 파트너 대시보드 데이터 조회
 * - 인증 필수
 * - 파라미터: member_id, month (YYYY-MM, 선택)
 *
 * @param {Object} params - URL 파라미터
 * @return {Object} 대시보드 데이터
 */
function handleGetPartnerDashboard(params) {
  var memberId = (params.member_id || '').trim();

  if (!memberId) {
    return errorResult(ERROR_CODES.NOT_LOGGED_IN);
  }

  // 파트너 인증
  var partner = findPartnerByMemberId_(memberId);
  if (!partner) {
    return errorResult(ERROR_CODES.NOT_PARTNER);
  }
  if (partner.status !== 'active') {
    return errorResult(ERROR_CODES.PARTNER_INACTIVE);
  }

  var partnerCode = partner.partner_code;
  var targetMonth = (params.month || '').trim() || getCurrentMonth_();

  // 1. 내 클래스 목록
  var myClasses = getClassesByPartner_(partnerCode);

  // 2. 정산 내역 (해당 월)
  var settlements = getSettlementsByPartner_(partnerCode, targetMonth);

  // 3. 월별 집계
  var totalRevenue = 0;
  var totalCommission = 0;
  var totalReserve = 0;
  var completedCount = 0;
  var pendingCount = 0;
  var failedCount = 0;

  for (var i = 0; i < settlements.length; i++) {
    var s = settlements[i];
    totalRevenue += Number(s.order_amount) || 0;
    totalCommission += Number(s.commission_amount) || 0;
    totalReserve += Number(s.reserve_amount) || 0;

    if (s.status === 'COMPLETED') completedCount++;
    else if (s.status === 'PENDING' || s.status === 'PROCESSING') pendingCount++;
    else if (s.status === 'FAILED') failedCount++;
  }

  return {
    success: true,
    data: {
      partner: {
        partner_code: partnerCode,
        partner_name: partner.partner_name,
        grade: partner.grade,
        commission_rate: Number(partner.commission_rate) || 0,
        reserve_rate: Number(partner.reserve_rate) || 0,
        class_count: Number(partner.class_count) || 0,
        avg_rating: Number(partner.avg_rating) || 0
      },
      classes: myClasses,
      settlement: {
        month: targetMonth,
        total_revenue: totalRevenue,
        total_commission: totalCommission,
        total_reserve: totalReserve,
        completed_count: completedCount,
        pending_count: pendingCount,
        failed_count: failedCount,
        items: settlements
      }
    },
    timestamp: now_()
  };
}

/**
 * 카테고리 목록 조회
 * - CacheService 24시간 캐싱
 *
 * @return {Object} 카테고리 목록
 */
function handleGetCategories() {
  var cacheKey = 'category_list';
  var cache = CacheService.getScriptCache();
  var cached = cache.get(cacheKey);

  if (cached) {
    Logger.log('[캐시 히트] 카테고리 목록');
    var cachedData = JSON.parse(cached);
    cachedData.cached = true;
    return cachedData;
  }

  // "클래스 메타" 시트에서 고유 카테고리 추출
  var sheet = getSheet_('클래스 메타');
  if (!sheet) {
    return { success: true, data: [], timestamp: now_() };
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var categoryIdx = headers.indexOf('category');
  var categories = {};

  for (var i = 1; i < data.length; i++) {
    var cat = String(data[i][categoryIdx] || '').trim();
    if (cat) {
      if (!categories[cat]) {
        categories[cat] = 0;
      }
      // status가 active인 것만 카운트
      var statusIdx = headers.indexOf('status');
      if (data[i][statusIdx] === 'active') {
        categories[cat]++;
      }
    }
  }

  var categoryList = [];
  for (var catName in categories) {
    categoryList.push({
      name: catName,
      class_count: categories[catName]
    });
  }

  // 클래스 수 내림차순 정렬
  categoryList.sort(function(a, b) {
    return b.class_count - a.class_count;
  });

  var result = {
    success: true,
    data: categoryList,
    timestamp: now_()
  };

  // 캐시 저장 (24시간) -- CacheService 최대 TTL은 21600초(6시간)
  var jsonStr = JSON.stringify(result);
  if (jsonStr.length < 100000) {
    cache.put(cacheKey, jsonStr, 21600); // 6시간 (CacheService 최대)
    Logger.log('[캐시 저장] 카테고리 목록');
  }

  return result;
}


// =============================================
// 3. POST 핸들러
// =============================================

/**
 * 예약 기록 + 정산 트리거
 * - LockService 필수 (동시 쓰기 방지)
 * - 파라미터: order_id, class_id, member_id, student_name,
 *            student_email, schedule_date, headcount, total_price
 *
 * @param {Object} data - POST 본문 데이터
 * @return {Object} 예약 결과
 */
function handleRecordBooking(data) {
  // 필수 파라미터 검증
  var requiredFields = ['order_id', 'class_id', 'member_id', 'student_name', 'total_price'];
  for (var i = 0; i < requiredFields.length; i++) {
    if (!data[requiredFields[i]]) {
      return errorResult(ERROR_CODES.MISSING_PARAMS, requiredFields[i] + ' 파라미터가 필요합니다.');
    }
  }

  // LockService -- 동시 쓰기 방지
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // 10초 대기
  } catch (e) {
    Logger.log('[Lock 실패] handleRecordBooking: ' + e.message);
    return errorResult(ERROR_CODES.LOCK_TIMEOUT);
  }

  try {
    // 중복 주문 체크 (멱등성 보장)
    if (isOrderAlreadyProcessed_(data.order_id)) {
      Logger.log('[중복 주문] order_id=' + data.order_id + ' 이미 처리됨');
      return {
        success: true,
        data: { message: '이미 처리된 주문입니다.', order_id: data.order_id },
        timestamp: now_()
      };
    }

    // 클래스 정보 조회
    var classData = findClassById_(data.class_id);
    if (!classData) {
      return errorResult(ERROR_CODES.CLASS_NOT_FOUND);
    }

    // 파트너 정보 조회
    var partner = findPartnerByCode_(classData.partner_code);
    if (!partner) {
      return errorResult(ERROR_CODES.INTERNAL_ERROR, '클래스의 파트너 정보를 찾을 수 없습니다.');
    }

    // 수수료 계산
    var orderAmount = Number(data.total_price) || 0;
    var grade = (partner.grade || 'SILVER').toUpperCase();
    var rateConfig = COMMISSION_RATES[grade] || COMMISSION_RATES['SILVER'];
    var commissionRate = rateConfig.commissionRate;
    var reserveRate = rateConfig.reserveRate;
    var commissionAmount = Math.round(orderAmount * commissionRate);
    var reserveAmount = Math.round(commissionAmount * reserveRate);

    // 정산 ID 생성
    var settlementId = generateId_('STL');

    // "정산 내역" 시트에 기록
    var settlementSheet = getSheet_('정산 내역');
    if (!settlementSheet) {
      return errorResult(ERROR_CODES.RESERVATION_FAILED, '"정산 내역" 시트를 찾을 수 없습니다.');
    }

    var nowStr = now_();
    var settlementRow = [
      settlementId,                    // A: settlement_id
      data.order_id,                   // B: order_id
      classData.partner_code,          // C: partner_code
      data.class_id,                   // D: class_id
      data.member_id,                  // E: member_id (수강생)
      orderAmount,                     // F: order_amount
      commissionRate,                  // G: commission_rate
      commissionAmount,                // H: commission_amount
      reserveRate,                     // I: reserve_rate
      reserveAmount,                   // J: reserve_amount
      data.schedule_date || '',        // K: class_date
      Number(data.headcount) || 1,     // L: student_count
      'PENDING',                       // M: status
      '',                              // N: reserve_paid_date
      '',                              // O: reserve_api_response
      '',                              // P: error_message
      '',                              // Q: student_email_sent
      '',                              // R: partner_email_sent
      nowStr,                          // S: created_date
      '',                              // T: completed_date
      data.student_name || '',         // U: student_name
      data.student_email || '',        // V: student_email
      data.student_phone || ''         // W: student_phone
    ];

    settlementSheet.appendRow(settlementRow);
    SpreadsheetApp.flush();

    Logger.log('[예약 기록] settlement_id=' + settlementId + ', order_id=' + data.order_id
      + ', 수수료=' + commissionAmount + ', 적립금=' + reserveAmount);

    // 적립금 지급 시도
    var reserveResult = processReservePayment_(
      settlementId,
      partner.member_id,
      reserveAmount,
      '[PRESSCO21] 클래스 수수료 정산 - ' + classData.class_name + ' (주문: ' + data.order_id + ')'
    );

    // 이메일 발송 (비동기적으로 실패해도 예약 자체는 성공)
    try {
      // 수강생 확인 이메일
      var studentEmailSent = sendStudentConfirmationEmail_(data, classData, partner);
      // 파트너 알림 이메일
      var partnerEmailSent = sendPartnerNotificationEmail_(data, classData, partner);

      // 이메일 발송 상태 업데이트
      updateSettlementEmailStatus_(settlementId, studentEmailSent, partnerEmailSent);
    } catch (emailErr) {
      Logger.log('[이메일 오류] ' + emailErr.message);
      // 이메일 실패해도 예약은 유지
    }

    return {
      success: true,
      data: {
        settlement_id: settlementId,
        order_id: data.order_id,
        class_name: classData.class_name,
        commission_amount: commissionAmount,
        reserve_amount: reserveAmount,
        reserve_status: reserveResult.success ? 'COMPLETED' : 'FAILED',
        message: reserveResult.success
          ? '예약이 확인되었으며 수수료가 정산되었습니다.'
          : '예약은 확인되었으나 적립금 지급에 실패했습니다. 관리자가 확인 후 처리합니다.'
      },
      timestamp: now_()
    };

  } catch (err) {
    logError_('handleRecordBooking', data.order_id, err);
    return errorResult(ERROR_CODES.RESERVATION_FAILED, err.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * 주문 폴링 (10분 간격 시간 트리거에서 호출)
 * - LockService: tryLock(0) -- 이전 폴링 실행 중이면 스킵
 * - 메이크샵 주문 조회 API로 새 결제완료 주문 감지
 *
 * @return {Object} 폴링 결과
 */
function handlePollOrders() {
  var startTime = new Date().getTime();

  // LockService -- 이전 폴링 실행 중이면 즉시 스킵
  var lock = LockService.getScriptLock();
  var hasLock = lock.tryLock(0);
  if (!hasLock) {
    Logger.log('[폴링 스킵] 이전 폴링이 아직 실행 중입니다.');
    return {
      success: true,
      data: { message: '이전 폴링 실행 중, 스킵됨', skipped: true },
      timestamp: now_()
    };
  }

  try {
    // 마지막 폴링 시각 조회
    var lastPollTime = getSystemSetting_('last_poll_time');
    if (!lastPollTime) {
      // 최초 실행 시 1시간 전부터 검색
      var oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      lastPollTime = formatDate_(oneHourAgo);
    }

    Logger.log('[폴링 시작] 마지막 폴링: ' + lastPollTime);

    // 메이크샵 주문 조회 API 호출
    var orders = fetchNewOrders_(lastPollTime);
    var processedCount = 0;
    var errors = [];

    // 클래스 메타 시트의 makeshop_product_id 목록 캐싱
    var classProductIds = getClassProductIdMap_();

    for (var i = 0; i < orders.length; i++) {
      // C-05 + W-06 수정: GAS 6분 실행 제한 대비 시간 체크
      // 5분(300초) 경과 시 안전하게 루프 중단 -> 나머지는 다음 폴링(10분 후)에서 처리
      // 이 방식으로 폴링 Lock이 오래 유지되는 문제도 완화 (recordBooking 타임아웃 감소)
      if (new Date().getTime() - startTime > 300000) {
        Logger.log('[폴링 중단] 5분 경과, 나머지 ' + (orders.length - i) + '건은 다음 폴링에서 처리');
        break;
      }

      var order = orders[i];

      try {
        // 클래스 상품인지 확인
        var classId = classProductIds[order.branduid];
        if (!classId) {
          // 일반 상품 주문은 스킵
          continue;
        }

        // 이미 처리된 주문인지 확인
        if (isOrderAlreadyProcessed_(order.order_id)) {
          Logger.log('[중복 스킵] order_id=' + order.order_id);
          continue;
        }

        // 예약 기록 처리
        var bookingData = {
          order_id: order.order_id,
          class_id: classId,
          member_id: order.member_id || '',
          student_name: order.buyer_name || '',
          student_email: order.buyer_email || '',
          student_phone: maskPhone_(order.buyer_phone || ''),
          schedule_date: order.option_value || '',  // 옵션(일정)에서 추출
          headcount: Number(order.quantity) || 1,
          total_price: Number(order.settle_price) || 0
        };

        // handleRecordBooking 내부 로직을 직접 실행 (Lock은 이미 획득)
        processOrderInternal_(bookingData);
        processedCount++;

      } catch (orderErr) {
        Logger.log('[주문 처리 오류] order_id=' + order.order_id + ': ' + orderErr.message);
        errors.push({ order_id: order.order_id, error: orderErr.message });
      }
    }

    // 마지막 폴링 시각 업데이트
    var nowStr = formatDate_(new Date());
    setSystemSetting_('last_poll_time', nowStr);

    // 폴링 로그 기록
    var elapsed = new Date().getTime() - startTime;
    logPollResult_(nowStr, orders.length, processedCount, errors.length > 0 ? JSON.stringify(errors) : '', elapsed);

    SpreadsheetApp.flush();

    Logger.log('[폴링 완료] 조회=' + orders.length + ', 처리=' + processedCount + ', 오류=' + errors.length + ', 소요=' + elapsed + 'ms');

    return {
      success: true,
      data: {
        poll_time: nowStr,
        orders_found: orders.length,
        orders_processed: processedCount,
        errors: errors,
        duration_ms: elapsed
      },
      timestamp: now_()
    };

  } catch (err) {
    logError_('handlePollOrders', '', err);
    return errorResult(ERROR_CODES.INTERNAL_ERROR, err.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * 클래스 상태 업데이트 (파트너 전용)
 * - 파라미터: member_id, class_id, status (active/paused/closed)
 *
 * @param {Object} data - POST 본문 데이터
 * @return {Object} 업데이트 결과
 */
function handleUpdateClassStatus(data) {
  var memberId = (data.member_id || '').trim();
  var classId = (data.class_id || '').trim();
  var newStatus = (data.status || '').trim();

  if (!memberId) return errorResult(ERROR_CODES.NOT_LOGGED_IN);
  if (!classId || !newStatus) return errorResult(ERROR_CODES.MISSING_PARAMS, 'class_id와 status가 필요합니다.');

  // 유효한 상태값 검증
  var validStatuses = ['active', 'paused', 'closed'];
  if (validStatuses.indexOf(newStatus) === -1) {
    return errorResult(ERROR_CODES.MISSING_PARAMS, 'status는 active, paused, closed 중 하나여야 합니다.');
  }

  // 파트너 인증
  var partner = findPartnerByMemberId_(memberId);
  if (!partner) return errorResult(ERROR_CODES.NOT_PARTNER);
  if (partner.status !== 'active') return errorResult(ERROR_CODES.PARTNER_INACTIVE);

  // 클래스가 해당 파트너 소유인지 확인
  var classData = findClassById_(classId);
  if (!classData) return errorResult(ERROR_CODES.CLASS_NOT_FOUND);
  if (classData.partner_code !== partner.partner_code) {
    return errorResult(ERROR_CODES.CLASS_NOT_FOUND, '본인 소유의 클래스만 수정할 수 있습니다.');
  }

  // LockService
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return errorResult(ERROR_CODES.LOCK_TIMEOUT);
  }

  try {
    // 시트에서 해당 클래스 행 찾아 status 업데이트
    var sheet = getSheet_('클래스 메타');
    var data_ = sheet.getDataRange().getValues();
    var headers = data_[0];
    var classIdIdx = headers.indexOf('class_id');
    var statusIdx = headers.indexOf('status');

    for (var i = 1; i < data_.length; i++) {
      if (String(data_[i][classIdIdx]).trim() === classId) {
        sheet.getRange(i + 1, statusIdx + 1).setValue(newStatus);
        SpreadsheetApp.flush();

        // 관련 캐시 무효화
        invalidateClassCache_(classId);

        Logger.log('[클래스 상태 변경] class_id=' + classId + ', ' + classData.status + ' -> ' + newStatus);
        break;
      }
    }

    return {
      success: true,
      data: {
        class_id: classId,
        old_status: classData.status,
        new_status: newStatus
      },
      timestamp: now_()
    };

  } catch (err) {
    logError_('handleUpdateClassStatus', classId, err);
    return errorResult(ERROR_CODES.INTERNAL_ERROR, err.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * 캐시 전체 삭제 (관리자용)
 *
 * @return {Object} 삭제 결과
 */
function handleClearCache() {
  var cache = CacheService.getScriptCache();

  // 알려진 캐시 키 패턴 삭제
  var keysToDelete = ['category_list'];

  // 클래스 목록 캐시 키들도 삭제 (대표적인 조합만)
  var sorts = ['latest', 'popular', 'rating', 'price_asc', 'price_desc'];
  for (var s = 0; s < sorts.length; s++) {
    for (var p = 1; p <= 5; p++) {
      keysToDelete.push('classes____' + sorts[s] + '_' + p + '_20');
    }
  }

  cache.removeAll(keysToDelete);
  Logger.log('[캐시 삭제] 전체 캐시 삭제 완료 (' + keysToDelete.length + '개 키)');

  return {
    success: true,
    data: { message: '캐시가 삭제되었습니다.', keys_cleared: keysToDelete.length },
    timestamp: now_()
  };
}


// =============================================
// 4. 정산 파이프라인 핵심 함수
// =============================================

/**
 * 주문 폴링 내부 처리 (Lock 이미 획득된 상태)
 * 1. 정산 내역 기록
 * 2. 수수료 계산
 * 3. 적립금 지급
 * 4. 이메일 발송
 *
 * @param {Object} bookingData - 예약 데이터
 */
function processOrderInternal_(bookingData) {
  // 클래스 정보 조회
  var classData = findClassById_(bookingData.class_id);
  if (!classData) {
    throw new Error('클래스를 찾을 수 없습니다: ' + bookingData.class_id);
  }

  // 파트너 정보 조회
  var partner = findPartnerByCode_(classData.partner_code);
  if (!partner) {
    throw new Error('파트너를 찾을 수 없습니다: ' + classData.partner_code);
  }

  // 수수료 계산
  var orderAmount = Number(bookingData.total_price) || 0;
  var grade = (partner.grade || 'SILVER').toUpperCase();
  var rateConfig = COMMISSION_RATES[grade] || COMMISSION_RATES['SILVER'];
  var commissionRate = rateConfig.commissionRate;
  var reserveRate = rateConfig.reserveRate;
  var commissionAmount = Math.round(orderAmount * commissionRate);
  var reserveAmount = Math.round(commissionAmount * reserveRate);

  // 정산 ID 생성
  var settlementId = generateId_('STL');
  var nowStr = now_();

  // 정산 내역 기록
  var settlementSheet = getSheet_('정산 내역');
  settlementSheet.appendRow([
    settlementId,                           // A: settlement_id
    bookingData.order_id,                   // B: order_id
    classData.partner_code,                 // C: partner_code
    bookingData.class_id,                   // D: class_id
    bookingData.member_id,                  // E: member_id (수강생)
    orderAmount,                            // F: order_amount
    commissionRate,                         // G: commission_rate
    commissionAmount,                       // H: commission_amount
    reserveRate,                            // I: reserve_rate
    reserveAmount,                          // J: reserve_amount
    bookingData.schedule_date || '',        // K: class_date
    Number(bookingData.headcount) || 1,     // L: student_count
    'PENDING',                              // M: status
    '',                                     // N: reserve_paid_date
    '',                                     // O: reserve_api_response
    '',                                     // P: error_message
    '',                                     // Q: student_email_sent
    '',                                     // R: partner_email_sent
    nowStr,                                 // S: created_date
    '',                                     // T: completed_date
    bookingData.student_name || '',         // U: student_name
    bookingData.student_email || '',        // V: student_email
    bookingData.student_phone || ''         // W: student_phone
  ]);

  SpreadsheetApp.flush();

  Logger.log('[정산 기록] ' + settlementId + ': 주문=' + bookingData.order_id
    + ', 수수료=' + commissionAmount + ', 적립금=' + reserveAmount);

  // 적립금 지급 (실패해도 계속 진행)
  var reserveResult = processReservePayment_(
    settlementId,
    partner.member_id,
    reserveAmount,
    '[PRESSCO21] 클래스 수수료 정산 - ' + classData.class_name + ' (주문: ' + bookingData.order_id + ')'
  );

  // 이메일 발송
  try {
    var studentEmailSent = sendStudentConfirmationEmail_(bookingData, classData, partner);
    var partnerEmailSent = sendPartnerNotificationEmail_(bookingData, classData, partner);
    updateSettlementEmailStatus_(settlementId, studentEmailSent, partnerEmailSent);
  } catch (emailErr) {
    Logger.log('[이메일 오류] 정산 ' + settlementId + ': ' + emailErr.message);
  }

  // 적립금 지급 실패 시 관리자 알림
  if (!reserveResult.success) {
    sendAdminAlert_(
      '[PRESSCO21] 적립금 지급 실패 알림',
      '정산 ID: ' + settlementId + '\n'
      + '주문 ID: ' + bookingData.order_id + '\n'
      + '파트너: ' + partner.partner_name + ' (' + partner.member_id + ')\n'
      + '적립금: ' + reserveAmount + '원\n'
      + '에러: ' + (reserveResult.error || '알 수 없는 오류') + '\n'
      + '\n관리자 페이지에서 수동 처리가 필요합니다.'
    );
  }
}

/**
 * 적립금 지급 처리
 * - 메이크샵 process_reserve API 호출
 * - 성공/실패에 따라 정산 상태 업데이트
 *
 * @param {string} settlementId - 정산 ID
 * @param {string} memberId - 파트너 회원 ID
 * @param {number} amount - 적립금 금액
 * @param {string} reason - 지급 사유
 * @return {Object} { success: boolean, error: string }
 */
function processReservePayment_(settlementId, memberId, amount, reason) {
  if (amount <= 0) {
    // 적립금 0원이면 스킵 (성공 처리)
    updateSettlementStatus_(settlementId, 'COMPLETED', '', '적립금 0원 (스킵)');
    return { success: true };
  }

  // 정산 상태를 PROCESSING으로 변경
  updateSettlementStatus_(settlementId, 'PROCESSING', '', '');

  try {
    var url = 'https://' + SHOP_DOMAIN + '/list/open_api_process.html'
      + '?mode=save&type=reserve&process=give';

    var payload = 'datas[0][id]=' + encodeURIComponent(memberId)
      + '&datas[0][reserve]=' + encodeURIComponent(String(amount))
      + '&datas[0][content]=' + encodeURIComponent(reason);

    var options = {
      method: 'post',
      headers: {
        'Shopkey': SHOPKEY,
        'Licensekey': LICENSEKEY
      },
      payload: payload,
      muteHttpExceptions: true
    };

    Logger.log('[적립금 지급] 요청: memberId=' + memberId + ', amount=' + amount);

    var response = UrlFetchApp.fetch(url, options);
    var httpCode = response.getResponseCode();
    var body = response.getContentText();

    Logger.log('[적립금 지급] HTTP ' + httpCode + ': ' + body);

    if (httpCode !== 200) {
      var errMsg = 'HTTP ' + httpCode + ': ' + body;
      updateSettlementStatus_(settlementId, 'FAILED', errMsg, body);
      return { success: false, error: errMsg };
    }

    var apiResult = JSON.parse(body);

    if (apiResult.return_code === '0000' && apiResult.datas && apiResult.datas[0]) {
      var resultData = apiResult.datas[0];

      if (resultData.result === true || resultData.result === 1 || resultData.result === '1') {
        // 성공
        updateSettlementStatus_(settlementId, 'COMPLETED', '', body);
        Logger.log('[적립금 지급 성공] settlement=' + settlementId + ', amount=' + amount);
        return { success: true };
      } else {
        // API 성공이지만 result=false
        var apiErrMsg = (resultData.message || []).join(', ') || '알 수 없는 오류';
        updateSettlementStatus_(settlementId, 'FAILED', apiErrMsg, body);
        return { success: false, error: apiErrMsg };
      }
    } else {
      // return_code가 0000이 아님
      var errMsg2 = 'return_code=' + apiResult.return_code;
      updateSettlementStatus_(settlementId, 'FAILED', errMsg2, body);
      return { success: false, error: errMsg2 };
    }

  } catch (err) {
    var catchMsg = err.message || err.toString();
    updateSettlementStatus_(settlementId, 'FAILED', catchMsg, '');
    Logger.log('[적립금 지급 예외] ' + catchMsg);
    return { success: false, error: catchMsg };
  }
}


// =============================================
// 5. 메이크샵 API 호출
// =============================================

/**
 * 메이크샵 주문 조회 API 호출
 * - 결제완료(입금확인) 상태의 새 주문 가져오기
 *
 * @param {string} fromDate - 검색 시작일시 (YYYY-MM-DD HH:mm:ss)
 * @return {Array} 주문 목록
 */
function fetchNewOrders_(fromDate) {
  var url = 'https://' + SHOP_DOMAIN + '/list/open_api.html'
    + '?mode=search&type=order_list'
    + '&status=' + encodeURIComponent('결제완료')
    + '&sdate=' + encodeURIComponent(fromDate.split(' ')[0])
    + '&edate=' + encodeURIComponent(formatDate_(new Date()).split(' ')[0]);

  var options = {
    method: 'get',
    headers: {
      'Shopkey': SHOPKEY,
      'Licensekey': LICENSEKEY
    },
    muteHttpExceptions: true
  };

  Logger.log('[주문 조회] URL: ' + url);

  try {
    var response = UrlFetchApp.fetch(url, options);
    var httpCode = response.getResponseCode();
    var body = response.getContentText();

    if (httpCode !== 200) {
      Logger.log('[주문 조회 오류] HTTP ' + httpCode + ': ' + body);
      return [];
    }

    var result = JSON.parse(body);

    if (result.return_code !== '0000') {
      Logger.log('[주문 조회] return_code=' + result.return_code);
      return [];
    }

    var orders = result.list || result.datas || [];
    Logger.log('[주문 조회] ' + orders.length + '건 조회됨');
    return orders;

  } catch (err) {
    Logger.log('[주문 조회 예외] ' + err.message);
    return [];
  }
}


// =============================================
// 6. 이메일 발송
// =============================================

/**
 * 이메일 발송 래퍼 (한도 관리 포함)
 * - 일일 한도 체크 후 발송
 * - 발송 이력 Sheets 기록
 *
 * @param {string} recipient - 수신자 이메일
 * @param {string} subject - 제목
 * @param {string} htmlBody - HTML 본문
 * @param {string} emailType - 이메일 유형 (BOOKING_CONFIRM, PARTNER_NOTIFY 등)
 * @return {boolean} 발송 성공 여부
 */
function sendEmailWithTracking_(recipient, subject, htmlBody, emailType) {
  if (!recipient || recipient.indexOf('@') === -1) {
    Logger.log('[이메일 스킵] 유효하지 않은 수신자: ' + recipient);
    return false;
  }

  var today = formatDateOnly_(new Date());

  // 일일 발송 카운트 확인
  var dailyCount = getTodayEmailCount_(today);

  if (dailyCount >= EMAIL_DAILY_LIMIT) {
    Logger.log('[이메일 한도] 일일 한도 초과: ' + dailyCount + '/' + EMAIL_DAILY_LIMIT);
    logEmailRecord_(today, recipient, emailType, 'LIMIT_EXCEEDED', '일일 한도 초과');
    return false;
  }

  try {
    GmailApp.sendEmail(recipient, subject, '', {
      htmlBody: htmlBody,
      name: 'PRESSCO21 클래스'
    });

    // 카운트 증가 + 기록
    incrementEmailCount_(today);
    logEmailRecord_(today, recipient, emailType, 'SENT', '');

    Logger.log('[이메일 발송] ' + emailType + ' -> ' + recipient);

    // 경고 임계값 도달 시 관리자 알림 (한 번만)
    if (dailyCount + 1 === EMAIL_WARNING_THRESHOLD) {
      sendAdminAlert_(
        '[PRESSCO21] 일일 이메일 ' + EMAIL_WARNING_THRESHOLD + '건 도달',
        '금일 이메일 발송이 ' + EMAIL_WARNING_THRESHOLD + '건에 도달했습니다.\n'
        + '일일 한도: ' + EMAIL_DAILY_LIMIT + '건\n\n'
        + 'Google Workspace 전환을 검토해 주세요.\n'
        + '(Workspace: 1,500건/일, 월 약 8,000원)'
      );
    }

    return true;

  } catch (err) {
    Logger.log('[이메일 발송 실패] ' + emailType + ' -> ' + recipient + ': ' + err.message);
    logEmailRecord_(today, recipient, emailType, 'FAILED', err.message);
    return false;
  }
}

/**
 * 수강생 예약 확인 이메일 발송
 *
 * @param {Object} bookingData - 예약 데이터
 * @param {Object} classData - 클래스 데이터
 * @param {Object} partner - 파트너 데이터
 * @return {boolean} 발송 성공 여부
 */
function sendStudentConfirmationEmail_(bookingData, classData, partner) {
  var email = bookingData.student_email || '';
  if (!email) return false;

  var subject = '[PRESSCO21] ' + classData.class_name + ' 예약이 확인되었습니다';

  // C-03 수정: XSS 방지를 위해 사용자 입력값 escapeHtml_ 적용
  var body = '<div style="font-family: \'Noto Sans KR\', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">'
    + '<h2 style="color: #2d2d2d; border-bottom: 2px solid #b89b5e; padding-bottom: 12px;">예약 확인</h2>'
    + '<p style="color: #555;">' + escapeHtml_(bookingData.student_name || '고객') + '님, 클래스 예약이 확인되었습니다.</p>'
    + '<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">'
    + '<tr style="background: #f8f5f0;"><td style="padding: 10px; font-weight: bold;">클래스</td>'
    + '<td style="padding: 10px;">' + escapeHtml_(classData.class_name) + '</td></tr>'
    + '<tr><td style="padding: 10px; font-weight: bold;">강사</td>'
    + '<td style="padding: 10px;">' + escapeHtml_(partner.partner_name || '') + '</td></tr>'
    + '<tr style="background: #f8f5f0;"><td style="padding: 10px; font-weight: bold;">일시</td>'
    + '<td style="padding: 10px;">' + escapeHtml_(bookingData.schedule_date || '추후 안내') + '</td></tr>'
    + '<tr><td style="padding: 10px; font-weight: bold;">장소</td>'
    + '<td style="padding: 10px;">' + escapeHtml_(classData.location || '추후 안내') + '</td></tr>'
    + '<tr style="background: #f8f5f0;"><td style="padding: 10px; font-weight: bold;">인원</td>'
    + '<td style="padding: 10px;">' + escapeHtml_(String(bookingData.headcount || 1)) + '명</td></tr>'
    + '<tr><td style="padding: 10px; font-weight: bold;">주문번호</td>'
    + '<td style="padding: 10px;">' + escapeHtml_(bookingData.order_id) + '</td></tr>'
    + '</table>'
    + '<p style="color: #888; font-size: 13px;">* 수업 3일 전, 1일 전에 리마인더 이메일을 보내드립니다.</p>'
    + '<p style="color: #888; font-size: 13px;">* 문의: foreverloveflower@naver.com</p>'
    + '</div>';

  return sendEmailWithTracking_(email, subject, body, 'BOOKING_CONFIRM');
}

/**
 * 파트너 예약 알림 이메일 발송
 *
 * @param {Object} bookingData - 예약 데이터
 * @param {Object} classData - 클래스 데이터
 * @param {Object} partner - 파트너 데이터
 * @return {boolean} 발송 성공 여부
 */
function sendPartnerNotificationEmail_(bookingData, classData, partner) {
  var email = partner.email || '';
  if (!email) return false;

  var subject = '[PRESSCO21] 새 예약 알림 - ' + classData.class_name;

  // 개인정보 마스킹
  var maskedName = maskName_(bookingData.student_name || '');
  var maskedPhone = bookingData.student_phone || maskPhone_('');

  // C-03 수정: XSS 방지를 위해 사용자 입력값 escapeHtml_ 적용 (마스킹된 값도 적용)
  var body = '<div style="font-family: \'Noto Sans KR\', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">'
    + '<h2 style="color: #2d2d2d; border-bottom: 2px solid #b89b5e; padding-bottom: 12px;">새 예약 알림</h2>'
    + '<p style="color: #555;">' + escapeHtml_(partner.partner_name) + '님, 새로운 수강 예약이 접수되었습니다.</p>'
    + '<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">'
    + '<tr style="background: #f8f5f0;"><td style="padding: 10px; font-weight: bold;">클래스</td>'
    + '<td style="padding: 10px;">' + escapeHtml_(classData.class_name) + '</td></tr>'
    + '<tr><td style="padding: 10px; font-weight: bold;">수강생</td>'
    + '<td style="padding: 10px;">' + escapeHtml_(maskedName) + '</td></tr>'
    + '<tr style="background: #f8f5f0;"><td style="padding: 10px; font-weight: bold;">연락처</td>'
    + '<td style="padding: 10px;">' + escapeHtml_(maskedPhone) + '</td></tr>'
    + '<tr><td style="padding: 10px; font-weight: bold;">일시</td>'
    + '<td style="padding: 10px;">' + escapeHtml_(bookingData.schedule_date || '추후 안내') + '</td></tr>'
    + '<tr style="background: #f8f5f0;"><td style="padding: 10px; font-weight: bold;">인원</td>'
    + '<td style="padding: 10px;">' + escapeHtml_(String(bookingData.headcount || 1)) + '명</td></tr>'
    + '<tr><td style="padding: 10px; font-weight: bold;">결제 금액</td>'
    + '<td style="padding: 10px;">' + escapeHtml_(formatCurrency_(bookingData.total_price)) + '</td></tr>'
    + '</table>'
    + '<p style="color: #888; font-size: 13px;">* 파트너 대시보드에서 상세 예약 현황을 확인할 수 있습니다.</p>'
    + '</div>';

  return sendEmailWithTracking_(email, subject, body, 'PARTNER_NOTIFY');
}

/**
 * 관리자 알림 이메일 (한도 카운트에 포함하지 않음)
 *
 * @param {string} subject - 제목
 * @param {string} body - 본문 (텍스트)
 */
function sendAdminAlert_(subject, body) {
  if (!ADMIN_EMAIL) {
    Logger.log('[관리자 알림 스킵] ADMIN_EMAIL 미설정');
    return;
  }

  try {
    MailApp.sendEmail(ADMIN_EMAIL, subject, body);
    Logger.log('[관리자 알림] ' + subject);
  } catch (err) {
    Logger.log('[관리자 알림 실패] ' + err.message);
  }
}


// =============================================
// 7. 시간 트리거 함수
// =============================================

/**
 * 주문 폴링 트리거 (10분 간격)
 * - GAS 편집기 > 트리거 > "시간 기반 트리거" > 매 10분으로 설정
 */
function triggerPollOrders() {
  Logger.log('[트리거] 주문 폴링 시작');
  handlePollOrders();
}

/**
 * 리마인더 이메일 트리거 (매일 오전 9시)
 * - D-3, D-1 리마인더 발송
 */
function triggerSendReminders() {
  Logger.log('[트리거] 리마인더 발송 시작');

  var lock = LockService.getScriptLock();
  var hasLock = lock.tryLock(0);
  if (!hasLock) {
    Logger.log('[리마인더 스킵] Lock 획득 실패');
    return;
  }

  try {
    var today = new Date();
    var d3Date = new Date(today);
    d3Date.setDate(d3Date.getDate() + 3);
    var d1Date = new Date(today);
    d1Date.setDate(d1Date.getDate() + 1);

    var d3Str = formatDateOnly_(d3Date);
    var d1Str = formatDateOnly_(d1Date);

    // 정산 내역에서 해당 날짜의 수업 조회
    var sheet = getSheet_('정산 내역');
    if (!sheet) return;

    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    for (var i = 1; i < data.length; i++) {
      var row = rowToObject_(headers, data[i]);

      // COMPLETED 또는 PENDING 상태만
      if (row.status !== 'COMPLETED' && row.status !== 'PENDING') continue;

      var classDate = String(row.class_date || '').substring(0, 10); // YYYY-MM-DD

      // D-3 리마인더
      if (classDate === d3Str) {
        sendReminderIfNeeded_(row, 'D3', i + 1, headers);
      }

      // D-1 리마인더
      if (classDate === d1Str) {
        sendReminderIfNeeded_(row, 'D1', i + 1, headers);
      }
    }

    SpreadsheetApp.flush();
    Logger.log('[트리거] 리마인더 발송 완료');

  } catch (err) {
    logError_('triggerSendReminders', '', err);
  } finally {
    lock.releaseLock();
  }
}

/**
 * 후기 요청 이메일 트리거 (매일 오전 10시)
 * - 수강 완료 +7일 후기 유도
 */
function triggerSendReviewRequests() {
  Logger.log('[트리거] 후기 요청 발송 시작');

  var lock = LockService.getScriptLock();
  var hasLock = lock.tryLock(0);
  if (!hasLock) {
    Logger.log('[후기 요청 스킵] Lock 획득 실패');
    return;
  }

  try {
    var today = new Date();
    var d7Ago = new Date(today);
    d7Ago.setDate(d7Ago.getDate() - 7);
    var d7Str = formatDateOnly_(d7Ago);

    var sheet = getSheet_('정산 내역');
    if (!sheet) return;

    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    for (var i = 1; i < data.length; i++) {
      var row = rowToObject_(headers, data[i]);

      if (row.status !== 'COMPLETED') continue;

      var classDate = String(row.class_date || '').substring(0, 10);

      // 수강일이 7일 전인 건
      if (classDate === d7Str) {
        // 아직 후기 요청을 보내지 않은 경우만
        // 간단히 student_email_sent 필드에 'REVIEW_SENT' 포함 여부로 판단
        var emailStatus = String(row.student_email_sent || '');
        if (emailStatus.indexOf('REVIEW_SENT') === -1) {
          sendReviewRequestEmail_(row);

          // 상태 업데이트
          var emailSentIdx = headers.indexOf('student_email_sent');
          sheet.getRange(i + 1, emailSentIdx + 1).setValue(
            emailStatus + (emailStatus ? ',' : '') + 'REVIEW_SENT'
          );
        }
      }
    }

    SpreadsheetApp.flush();
    Logger.log('[트리거] 후기 요청 발송 완료');

  } catch (err) {
    logError_('triggerSendReviewRequests', '', err);
  } finally {
    lock.releaseLock();
  }
}

/**
 * 정합성 검증 배치 (매일 자정)
 * - Sheets 정산 잔액 vs 메이크샵 적립금 실잔액 비교
 */
function triggerReconciliation() {
  Logger.log('[트리거] 정합성 검증 시작');

  try {
    // 파트너별 Sheets 누적 적립금 계산
    var settlementSheet = getSheet_('정산 내역');
    if (!settlementSheet) return;

    var data = settlementSheet.getDataRange().getValues();
    var headers = data[0];
    var partnerTotals = {}; // partner_code -> 누적 적립금

    for (var i = 1; i < data.length; i++) {
      var row = rowToObject_(headers, data[i]);
      if (row.status === 'COMPLETED') {
        var code = row.partner_code;
        if (!partnerTotals[code]) partnerTotals[code] = 0;
        partnerTotals[code] += Number(row.reserve_amount) || 0;
      }
    }

    // 각 파트너의 메이크샵 실잔액 조회 및 비교
    var discrepancies = [];
    for (var partnerCode in partnerTotals) {
      var partner = findPartnerByCode_(partnerCode);
      if (!partner || !partner.member_id) continue;

      var sheetsTotal = partnerTotals[partnerCode];

      try {
        var apiReserve = queryMakeshopReserve_(partner.member_id);
        // 불일치 감지 (Sheets 누적과 API 잔액은 직접 비교 불가 -- 소비분 존재)
        // 여기서는 API 조회 가능 여부만 확인하고 로그 기록
        Logger.log('[정합성] 파트너=' + partnerCode
          + ', Sheets 누적 지급=' + sheetsTotal
          + ', API 조회 성공');

      } catch (apiErr) {
        discrepancies.push({
          partner_code: partnerCode,
          member_id: partner.member_id,
          sheets_total: sheetsTotal,
          error: apiErr.message
        });
      }
    }

    if (discrepancies.length > 0) {
      sendAdminAlert_(
        '[PRESSCO21] 정합성 검증 불일치 감지',
        '정합성 검증에서 ' + discrepancies.length + '건의 이상이 감지되었습니다.\n\n'
        + JSON.stringify(discrepancies, null, 2)
      );
    }

    Logger.log('[트리거] 정합성 검증 완료, 이상=' + discrepancies.length + '건');

  } catch (err) {
    logError_('triggerReconciliation', '', err);
  }
}


// =============================================
// 8. 데이터 접근 헬퍼
// =============================================

/**
 * 스프레드시트의 특정 시트 가져오기
 *
 * @param {string} sheetName - 시트 이름
 * @return {Sheet|null} 시트 객체
 */
function getSheet_(sheetName) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    return ss.getSheetByName(sheetName);
  } catch (err) {
    Logger.log('[시트 접근 오류] ' + sheetName + ': ' + err.message);
    return null;
  }
}

/**
 * 시트 헤더 + 행 데이터를 객체로 변환
 *
 * @param {Array} headers - 헤더 배열
 * @param {Array} row - 데이터 행 배열
 * @return {Object} 키-값 객체
 */
function rowToObject_(headers, row) {
  var obj = {};
  for (var i = 0; i < headers.length; i++) {
    obj[headers[i]] = row[i] !== undefined ? row[i] : '';
  }
  return obj;
}

/**
 * class_id로 클래스 데이터 찾기
 *
 * @param {string} classId - 클래스 ID
 * @return {Object|null} 클래스 데이터
 */
function findClassById_(classId) {
  var sheet = getSheet_('클래스 메타');
  if (!sheet) return null;

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var classIdIdx = headers.indexOf('class_id');

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][classIdIdx]).trim() === classId) {
      return rowToObject_(headers, data[i]);
    }
  }

  return null;
}

/**
 * member_id로 파트너 데이터 찾기
 *
 * @param {string} memberId - 메이크샵 회원 ID
 * @return {Object|null} 파트너 데이터
 */
function findPartnerByMemberId_(memberId) {
  var sheet = getSheet_('파트너 상세');
  if (!sheet) return null;

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var memberIdIdx = headers.indexOf('member_id');

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][memberIdIdx]).trim() === memberId) {
      return rowToObject_(headers, data[i]);
    }
  }

  return null;
}

/**
 * partner_code로 파트너 데이터 찾기
 *
 * @param {string} partnerCode - 파트너 코드
 * @return {Object|null} 파트너 데이터
 */
function findPartnerByCode_(partnerCode) {
  var sheet = getSheet_('파트너 상세');
  if (!sheet) return null;

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var codeIdx = headers.indexOf('partner_code');

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][codeIdx]).trim() === partnerCode) {
      return rowToObject_(headers, data[i]);
    }
  }

  return null;
}

/**
 * 파트너 공개 정보 (목록/상세에 포함할 최소 정보)
 *
 * @param {string} partnerCode - 파트너 코드
 * @return {Object} 공개 정보
 */
function getPartnerPublicInfo_(partnerCode) {
  var partner = findPartnerByCode_(partnerCode);
  if (!partner) {
    return { partner_name: '', grade: '', location: '' };
  }

  return {
    partner_code: partner.partner_code,
    partner_name: partner.partner_name,
    grade: partner.grade,
    location: partner.location || '',
    avg_rating: Number(partner.avg_rating) || 0,
    instagram_url: partner.instagram_url || '',
    portfolio_url: partner.portfolio_url || ''
  };
}

/**
 * 파트너 코드별 클래스 목록 조회
 *
 * @param {string} partnerCode - 파트너 코드
 * @return {Array} 클래스 목록
 */
function getClassesByPartner_(partnerCode) {
  var sheet = getSheet_('클래스 메타');
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var codeIdx = headers.indexOf('partner_code');
  var classes = [];

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][codeIdx]).trim() === partnerCode) {
      var row = rowToObject_(headers, data[i]);
      classes.push({
        class_id: row.class_id,
        class_name: row.class_name,
        category: row.category,
        price: Number(row.price) || 0,
        status: row.status,
        class_count: Number(row.class_count) || 0,
        avg_rating: Number(row.avg_rating) || 0
      });
    }
  }

  return classes;
}

/**
 * 파트너 코드 + 월별 정산 내역 조회
 *
 * @param {string} partnerCode - 파트너 코드
 * @param {string} month - YYYY-MM 형식
 * @return {Array} 정산 내역 목록
 */
function getSettlementsByPartner_(partnerCode, month) {
  var sheet = getSheet_('정산 내역');
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var codeIdx = headers.indexOf('partner_code');
  var dateIdx = headers.indexOf('created_date');
  var settlements = [];

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][codeIdx]).trim() !== partnerCode) continue;

    // 월 필터 (created_date의 YYYY-MM과 비교)
    var createdDate = String(data[i][dateIdx] || '');
    if (month && createdDate.substring(0, 7) !== month) continue;

    settlements.push(rowToObject_(headers, data[i]));
  }

  return settlements;
}

/**
 * 클래스 메타의 makeshop_product_id -> class_id 매핑 생성
 * (주문 폴링 시 클래스 상품 식별용)
 *
 * @return {Object} { makeshop_product_id: class_id }
 */
function getClassProductIdMap_() {
  var sheet = getSheet_('클래스 메타');
  if (!sheet) return {};

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var productIdIdx = headers.indexOf('makeshop_product_id');
  var classIdIdx = headers.indexOf('class_id');
  var statusIdx = headers.indexOf('status');
  var map = {};

  for (var i = 1; i < data.length; i++) {
    var productId = String(data[i][productIdIdx] || '').trim();
    var status = String(data[i][statusIdx] || '').trim();
    if (productId && status !== 'closed') {
      map[productId] = String(data[i][classIdIdx]).trim();
    }
  }

  return map;
}

/**
 * 주문이 이미 처리되었는지 확인 (멱등성)
 *
 * @param {string} orderId - 주문 ID
 * @return {boolean} 이미 처리 여부
 */
function isOrderAlreadyProcessed_(orderId) {
  var sheet = getSheet_('정산 내역');
  if (!sheet) return false;

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var orderIdIdx = headers.indexOf('order_id');

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][orderIdIdx]).trim() === String(orderId).trim()) {
      return true;
    }
  }

  return false;
}

/**
 * 정산 상태 업데이트
 *
 * @param {string} settlementId - 정산 ID
 * @param {string} status - 새 상태 (PENDING/PROCESSING/COMPLETED/FAILED/CANCELLED)
 * @param {string} errorMessage - 에러 메시지 (실패 시)
 * @param {string} apiResponse - API 응답 원본
 */
function updateSettlementStatus_(settlementId, status, errorMessage, apiResponse) {
  var sheet = getSheet_('정산 내역');
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIdx = headers.indexOf('settlement_id');
  var statusIdx = headers.indexOf('status');
  var paidDateIdx = headers.indexOf('reserve_paid_date');
  var apiResponseIdx = headers.indexOf('reserve_api_response');
  var errorIdx = headers.indexOf('error_message');
  var completedIdx = headers.indexOf('completed_date');

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]).trim() === settlementId) {
      var rowNum = i + 1;

      sheet.getRange(rowNum, statusIdx + 1).setValue(status);

      if (status === 'COMPLETED') {
        sheet.getRange(rowNum, paidDateIdx + 1).setValue(now_());
        sheet.getRange(rowNum, completedIdx + 1).setValue(now_());
      }

      if (errorMessage) {
        sheet.getRange(rowNum, errorIdx + 1).setValue(errorMessage);
      }

      if (apiResponse) {
        // API 응답은 최대 1000자까지 저장
        sheet.getRange(rowNum, apiResponseIdx + 1).setValue(
          apiResponse.substring(0, 1000)
        );
      }

      break;
    }
  }
}

/**
 * 정산 내역의 이메일 발송 상태 업데이트
 *
 * @param {string} settlementId - 정산 ID
 * @param {boolean} studentSent - 수강생 이메일 발송 여부
 * @param {boolean} partnerSent - 파트너 이메일 발송 여부
 */
function updateSettlementEmailStatus_(settlementId, studentSent, partnerSent) {
  var sheet = getSheet_('정산 내역');
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIdx = headers.indexOf('settlement_id');
  var studentIdx = headers.indexOf('student_email_sent');
  var partnerIdx = headers.indexOf('partner_email_sent');

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]).trim() === settlementId) {
      var rowNum = i + 1;
      sheet.getRange(rowNum, studentIdx + 1).setValue(studentSent ? 'SENT' : 'FAILED');
      sheet.getRange(rowNum, partnerIdx + 1).setValue(partnerSent ? 'SENT' : 'FAILED');
      break;
    }
  }
}


// =============================================
// 9. 시스템 설정 관리
// =============================================

/**
 * 시스템 설정값 읽기
 *
 * @param {string} key - 설정 키
 * @return {string} 설정 값 (없으면 빈 문자열)
 */
function getSystemSetting_(key) {
  var sheet = getSheet_('시스템 설정');
  if (!sheet) return '';

  var data = sheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) {
      return String(data[i][1] || '').trim();
    }
  }

  return '';
}

/**
 * 시스템 설정값 저장 (없으면 추가, 있으면 업데이트)
 *
 * @param {string} key - 설정 키
 * @param {string} value - 설정 값
 */
function setSystemSetting_(key, value) {
  var sheet = getSheet_('시스템 설정');
  if (!sheet) {
    // 시트가 없으면 생성
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    sheet = ss.insertSheet('시스템 설정');
    sheet.appendRow(['key', 'value', 'updated_at']);
  }

  var data = sheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      sheet.getRange(i + 1, 3).setValue(now_());
      return;
    }
  }

  // 키가 없으면 새 행 추가
  sheet.appendRow([key, value, now_()]);
}


// =============================================
// 10. 이메일 한도 관리
// =============================================

/**
 * 오늘의 이메일 발송 카운트 조회
 *
 * @param {string} today - YYYY-MM-DD 형식
 * @return {number} 발송 카운트
 */
function getTodayEmailCount_(today) {
  var sheet = getSheet_('이메일 발송 로그');
  if (!sheet) return 0;

  var data = sheet.getDataRange().getValues();
  // 마지막 행에서 오늘 날짜의 카운트 확인
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]).trim() === today) {
      return Number(data[i][1]) || 0;
    }
  }

  return 0;
}

/**
 * 이메일 발송 카운트 증가
 *
 * @param {string} today - YYYY-MM-DD 형식
 */
function incrementEmailCount_(today) {
  var sheet = getSheet_('이메일 발송 로그');
  if (!sheet) {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    sheet = ss.insertSheet('이메일 발송 로그');
    sheet.appendRow(['log_date', 'daily_count', 'recipient', 'email_type', 'status', 'error_message']);
  }

  var data = sheet.getDataRange().getValues();

  // 마지막 행에서 오늘 날짜 찾기
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]).trim() === today) {
      var count = Number(data[i][1]) || 0;
      sheet.getRange(i + 1, 2).setValue(count + 1);
      return;
    }
  }

  // 오늘 날짜 행이 없으면 카운트 1로 새 행 추가 (일일 한도 추적용)
  // C-01 수정: 새 날짜 첫 이메일 시 카운트 행을 생성하지 않으면 한도 추적이 무력화됨
  sheet.appendRow([today, 1, '', '', '', '']);
}

/**
 * 이메일 발송 개별 기록
 *
 * @param {string} date - YYYY-MM-DD
 * @param {string} recipient - 수신자
 * @param {string} emailType - 이메일 유형
 * @param {string} status - SENT/FAILED/LIMIT_EXCEEDED
 * @param {string} errorMessage - 에러 메시지
 */
function logEmailRecord_(date, recipient, emailType, status, errorMessage) {
  var sheet = getSheet_('이메일 발송 로그');
  if (!sheet) return;

  // 이메일 주소 마스킹
  var maskedRecipient = maskEmail_(recipient);

  sheet.appendRow([
    date,                          // A: log_date
    getTodayEmailCount_(date) + 1, // B: daily_count (현재 카운트 + 1)
    maskedRecipient,               // C: recipient
    emailType,                     // D: email_type
    status,                        // E: status
    errorMessage                   // F: error_message
  ]);
}


// =============================================
// 11. 폴링 로그
// =============================================

/**
 * 폴링 실행 결과 로그 기록
 *
 * @param {string} pollTime - 폴링 시각
 * @param {number} ordersFound - 조회된 주문 수
 * @param {number} ordersProcessed - 처리된 주문 수
 * @param {string} errors - 에러 내용 (JSON 문자열)
 * @param {number} durationMs - 소요 시간 (밀리초)
 */
function logPollResult_(pollTime, ordersFound, ordersProcessed, errors, durationMs) {
  var sheet = getSheet_('주문 처리 로그');
  if (!sheet) {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    sheet = ss.insertSheet('주문 처리 로그');
    sheet.appendRow(['log_id', 'poll_time', 'orders_found', 'orders_processed', 'errors', 'duration_ms']);
  }

  var logId = generateId_('LOG');
  sheet.appendRow([logId, pollTime, ordersFound, ordersProcessed, errors, durationMs]);
}


// =============================================
// 12. 에러 로깅
// =============================================

/**
 * 에러 로그 기록 + 심각한 에러 시 관리자 알림
 *
 * @param {string} source - 에러 발생 함수명
 * @param {string} context - 추가 컨텍스트 (action, order_id 등)
 * @param {Error} error - 에러 객체
 */
function logError_(source, context, error) {
  var errorMsg = error.message || error.toString();
  var stack = error.stack || '';

  Logger.log('[ERROR] ' + source + ' (' + context + '): ' + errorMsg);
  if (stack) Logger.log('[STACK] ' + stack);

  // 심각한 에러 (적립금, 정산 관련) 시 관리자 알림
  var criticalSources = ['processReservePayment_', 'processOrderInternal_', 'handleRecordBooking'];
  if (criticalSources.indexOf(source) !== -1) {
    sendAdminAlert_(
      '[PRESSCO21] Critical Error: ' + source,
      '함수: ' + source + '\n'
      + '컨텍스트: ' + context + '\n'
      + '에러: ' + errorMsg + '\n'
      + '스택: ' + stack + '\n'
      + '시각: ' + now_()
    );
  }
}


// =============================================
// 13. 리마인더 / 후기 요청 이메일 상세
// =============================================

/**
 * 리마인더 이메일 발송 (D-3 또는 D-1)
 *
 * @param {Object} row - 정산 내역 행 객체
 * @param {string} type - 'D3' 또는 'D1'
 * @param {number} rowNum - 시트 행 번호
 * @param {Array} headers - 헤더 배열
 */
function sendReminderIfNeeded_(row, type, rowNum, headers) {
  // 이미 발송했는지 확인
  var emailStatus = String(row.student_email_sent || '');
  var reminderKey = type + '_SENT';
  if (emailStatus.indexOf(reminderKey) !== -1) return;

  // 클래스 정보 조회
  var classData = findClassById_(row.class_id);
  if (!classData) return;

  var partner = findPartnerByCode_(row.partner_code);

  var daysLabel = type === 'D3' ? '3일' : '1일';
  var partnerName = partner ? escapeHtml_(partner.partner_name) : '';
  var className = escapeHtml_(classData.class_name);
  var classDate = escapeHtml_(String(row.class_date || ''));
  var classLocation = escapeHtml_(classData.location || '추후 안내');

  // 커리큘럼에서 준비물 추출 시도
  var preparationNote = '';
  if (classData.materials_included) {
    preparationNote = '<tr style="background: #f8f5f0;"><td style="padding: 10px; font-weight: bold;">준비물</td>'
      + '<td style="padding: 10px;">' + escapeHtml_(classData.materials_included) + '</td></tr>';
  }

  // 수강생에게 리마인더 이메일 발송 (student_email 컬럼에서 조회)
  var studentEmail = String(row.student_email || '').trim();
  var studentName = escapeHtml_(String(row.student_name || '고객'));

  if (studentEmail && studentEmail.indexOf('@') !== -1) {
    var studentSubject = '[PRESSCO21] 수업 ' + daysLabel + ' 전 안내 - ' + classData.class_name;

    var studentBody = '<div style="font-family: \'Noto Sans KR\', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">'
      + '<div style="text-align: center; padding: 16px 0;">'
      + '<span style="font-size: 24px; color: #b89b5e; font-weight: bold;">PRESSCO21</span>'
      + '</div>'
      + '<h2 style="color: #2d2d2d; border-bottom: 2px solid #b89b5e; padding-bottom: 12px;">'
      + '수업 ' + daysLabel + ' 전 안내</h2>'
      + '<p style="color: #555; line-height: 1.8;">'
      + studentName + '님, 예약하신 수업이 <strong>' + daysLabel + '</strong> 남았습니다.</p>'
      + '<table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #eee;">'
      + '<tr style="background: #f8f5f0;"><td style="padding: 12px; font-weight: bold; width: 100px;">클래스</td>'
      + '<td style="padding: 12px;">' + className + '</td></tr>'
      + '<tr><td style="padding: 12px; font-weight: bold;">강사</td>'
      + '<td style="padding: 12px;">' + partnerName + '</td></tr>'
      + '<tr style="background: #f8f5f0;"><td style="padding: 12px; font-weight: bold;">일시</td>'
      + '<td style="padding: 12px;">' + classDate + '</td></tr>'
      + '<tr><td style="padding: 12px; font-weight: bold;">장소</td>'
      + '<td style="padding: 12px;">' + classLocation + '</td></tr>'
      + preparationNote
      + '</table>';

    // D-1 리마인더에는 유의사항 추가
    if (type === 'D1') {
      studentBody += '<div style="background: #fff8e8; border-left: 4px solid #b89b5e; padding: 12px 16px; margin: 16px 0;">'
        + '<p style="margin: 0; color: #555; font-size: 14px;"><strong>내일 수업 안내</strong></p>'
        + '<ul style="margin: 8px 0; padding-left: 20px; color: #666; font-size: 13px;">'
        + '<li>수업 시작 10분 전까지 도착해 주세요.</li>'
        + '<li>준비물이 있다면 미리 챙겨 주세요.</li>'
        + '<li>불가피하게 참석이 어려우시면 미리 연락 부탁드립니다.</li>'
        + '</ul></div>';
    }

    studentBody += '<p style="color: #888; font-size: 13px; margin-top: 24px;">'
      + '* 문의: foreverloveflower@naver.com</p>'
      + '</div>';

    sendEmailWithTracking_(studentEmail, studentSubject, studentBody, 'REMINDER_' + type + '_STUDENT');
  } else {
    Logger.log('[리마인더 ' + type + '] 수강생 이메일 없음: settlement=' + row.settlement_id);
  }

  // 파트너에게도 리마인더
  if (partner && partner.email) {
    var partnerSubject = '[PRESSCO21] 수업 ' + daysLabel + ' 전 알림 - ' + classData.class_name;
    var partnerBody = '<div style="font-family: \'Noto Sans KR\', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">'
      + '<h2 style="color: #2d2d2d; border-bottom: 2px solid #b89b5e; padding-bottom: 12px;">'
      + '수업 ' + daysLabel + ' 전 알림</h2>'
      + '<p style="color: #555;">' + partnerName + '님, '
      + className + ' 수업이 <strong>' + daysLabel + '</strong> 남았습니다.</p>'
      + '<table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #eee;">'
      + '<tr style="background: #f8f5f0;"><td style="padding: 12px; font-weight: bold;">일시</td>'
      + '<td style="padding: 12px;">' + classDate + '</td></tr>'
      + '<tr><td style="padding: 12px; font-weight: bold;">예약 인원</td>'
      + '<td style="padding: 12px;">' + escapeHtml_(String(row.student_count || 1)) + '명</td></tr>'
      + '<tr style="background: #f8f5f0;"><td style="padding: 12px; font-weight: bold;">수강생</td>'
      + '<td style="padding: 12px;">' + escapeHtml_(maskName_(String(row.student_name || ''))) + '</td></tr>'
      + '</table>'
      + '<p style="color: #888; font-size: 13px;">* 파트너 대시보드에서 상세 예약 현황을 확인할 수 있습니다.</p>'
      + '</div>';

    sendEmailWithTracking_(partner.email, partnerSubject, partnerBody, 'REMINDER_' + type + '_PARTNER');
  }

  // 상태 업데이트
  var sheet = getSheet_('정산 내역');
  var emailSentIdx = headers.indexOf('student_email_sent');
  sheet.getRange(rowNum, emailSentIdx + 1).setValue(
    emailStatus + (emailStatus ? ',' : '') + reminderKey
  );

  Logger.log('[리마인더 ' + type + '] settlement=' + row.settlement_id);
}

/**
 * 후기 요청 이메일 발송
 *
 * @param {Object} row - 정산 내역 행 객체
 */
function sendReviewRequestEmail_(row) {
  // 클래스 정보
  var classData = findClassById_(row.class_id);
  if (!classData) return;

  var partner = findPartnerByCode_(row.partner_code);
  var className = escapeHtml_(classData.class_name);
  var partnerName = partner ? escapeHtml_(partner.partner_name) : '';

  // 수강생에게 후기 요청 이메일 발송 (student_email 컬럼에서 조회)
  var studentEmail = String(row.student_email || '').trim();
  var studentName = escapeHtml_(String(row.student_name || '고객'));
  var shopUrl = 'https://' + SHOP_DOMAIN;

  if (studentEmail && studentEmail.indexOf('@') !== -1) {
    var studentSubject = '[PRESSCO21] 후기 작성하고 적립금 받으세요 - ' + classData.class_name;

    var studentBody = '<div style="font-family: \'Noto Sans KR\', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">'
      + '<div style="text-align: center; padding: 16px 0;">'
      + '<span style="font-size: 24px; color: #b89b5e; font-weight: bold;">PRESSCO21</span>'
      + '</div>'
      + '<h2 style="color: #2d2d2d; border-bottom: 2px solid #b89b5e; padding-bottom: 12px;">'
      + '수업은 즐거우셨나요?</h2>'
      + '<p style="color: #555; line-height: 1.8;">'
      + studentName + '님, <strong>' + className + '</strong> 수업에 참여해 주셔서 감사합니다.</p>'
      + '<p style="color: #555; line-height: 1.8;">'
      + '수업 경험을 다른 분들과 나눠 주시면, 감사의 마음을 담아 '
      + '<strong style="color: #b89b5e;">500원 이상의 적립금</strong>을 드립니다.</p>'
      + '<div style="text-align: center; margin: 24px 0;">'
      + '<a href="' + shopUrl + '" '
      + 'style="display: inline-block; background: #b89b5e; color: #fff; padding: 14px 32px; '
      + 'text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: bold;">'
      + '후기 작성하기</a>'
      + '</div>'
      + '<table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #eee;">'
      + '<tr style="background: #f8f5f0;"><td style="padding: 12px; font-weight: bold; width: 100px;">클래스</td>'
      + '<td style="padding: 12px;">' + className + '</td></tr>'
      + '<tr><td style="padding: 12px; font-weight: bold;">강사</td>'
      + '<td style="padding: 12px;">' + partnerName + '</td></tr>'
      + '<tr style="background: #f8f5f0;"><td style="padding: 12px; font-weight: bold;">수강일</td>'
      + '<td style="padding: 12px;">' + escapeHtml_(String(row.class_date || '')) + '</td></tr>'
      + '</table>'
      + '<div style="background: #f8f5f0; padding: 16px; border-radius: 4px; margin: 16px 0;">'
      + '<p style="margin: 0 0 8px 0; font-weight: bold; color: #2d2d2d;">후기 작성 안내</p>'
      + '<ul style="margin: 0; padding-left: 20px; color: #666; font-size: 13px; line-height: 1.8;">'
      + '<li>솔직한 수업 후기를 남겨 주세요.</li>'
      + '<li>사진 첨부 시 적립금이 추가 지급됩니다.</li>'
      + '<li>작성 후 1~2일 내 적립금이 자동 지급됩니다.</li>'
      + '</ul></div>'
      + '<p style="color: #888; font-size: 13px; margin-top: 24px;">'
      + '* 문의: foreverloveflower@naver.com</p>'
      + '</div>';

    sendEmailWithTracking_(studentEmail, studentSubject, studentBody, 'REVIEW_REQUEST_STUDENT');
  } else {
    Logger.log('[후기 요청] 수강생 이메일 없음: settlement=' + row.settlement_id);
  }

  // 파트너에게도 후기 유도 안내
  if (partner && partner.email) {
    var partnerSubject = '[PRESSCO21] 수강생 후기 확인 안내 - ' + classData.class_name;
    var partnerBody = '<div style="font-family: \'Noto Sans KR\', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">'
      + '<h2 style="color: #2d2d2d; border-bottom: 2px solid #b89b5e; padding-bottom: 12px;">'
      + '수강생 후기 확인</h2>'
      + '<p style="color: #555;">' + partnerName + '님, '
      + className + ' 수업에 대한 후기 작성 요청이 수강생에게 발송되었습니다.</p>'
      + '<p style="color: #555;">파트너 대시보드에서 후기를 확인하고 답변해 주시면, '
      + '수강생 만족도와 재수강률이 높아집니다.</p>'
      + '<p style="color: #888; font-size: 13px;">* 후기에 대한 감사 답변은 클래스 평점 향상에 도움이 됩니다.</p>'
      + '</div>';

    sendEmailWithTracking_(partner.email, partnerSubject, partnerBody, 'REVIEW_REQUEST_PARTNER');
  }

  Logger.log('[후기 요청] settlement=' + row.settlement_id);
}


// =============================================
// 14. 메이크샵 적립금 조회 (정합성 검증용)
// =============================================

/**
 * 메이크샵 회원 적립금 내역 조회
 *
 * @param {string} memberId - 회원 ID
 * @return {Object} API 응답
 */
function queryMakeshopReserve_(memberId) {
  var url = 'https://' + SHOP_DOMAIN + '/list/open_api.html'
    + '?mode=search&type=user_reserve'
    + '&userid=' + encodeURIComponent(memberId)
    + '&orderByType=desc&limit=10';

  var options = {
    method: 'get',
    headers: {
      'Shopkey': SHOPKEY,
      'Licensekey': LICENSEKEY
    },
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var httpCode = response.getResponseCode();
  var body = response.getContentText();

  if (httpCode !== 200) {
    throw new Error('적립금 조회 HTTP ' + httpCode);
  }

  return JSON.parse(body);
}


// =============================================
// 15. 유틸리티 함수
// =============================================

/**
 * JSON 응답 생성
 *
 * @param {Object} data - 응답 데이터
 * @return {TextOutput} ContentService 응답
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 에러 응답 생성
 *
 * @param {Object} errorCode - ERROR_CODES 상수 객체
 * @param {string} detail - 추가 상세 메시지 (선택)
 * @return {Object} 에러 응답 객체
 */
function errorResult(errorCode, detail) {
  var result = {
    success: false,
    error: {
      code: errorCode.code,
      message: errorCode.message
    },
    timestamp: now_()
  };

  if (detail) {
    result.error.detail = detail;
  }

  return result;
}

/**
 * 현재 시각 (KST ISO 형식)
 *
 * @return {string} "YYYY-MM-DD HH:mm:ss"
 */
function now_() {
  return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
}

/**
 * 날짜 포맷 (KST)
 *
 * @param {Date} date - Date 객체
 * @return {string} "YYYY-MM-DD HH:mm:ss"
 */
function formatDate_(date) {
  return Utilities.formatDate(date, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
}

/**
 * 날짜만 포맷 (KST)
 *
 * @param {Date} date - Date 객체
 * @return {string} "YYYY-MM-DD"
 */
function formatDateOnly_(date) {
  return Utilities.formatDate(date, 'Asia/Seoul', 'yyyy-MM-dd');
}

/**
 * 현재 월 (YYYY-MM)
 *
 * @return {string} "YYYY-MM"
 */
function getCurrentMonth_() {
  return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM');
}

/**
 * 고유 ID 생성 (접두어 + 타임스탬프 + 랜덤)
 *
 * @param {string} prefix - ID 접두어 (예: 'STL', 'LOG')
 * @return {string} 고유 ID
 */
function generateId_(prefix) {
  var ts = new Date().getTime().toString(36);
  var rand = Math.random().toString(36).substring(2, 8);
  return prefix + '_' + ts + '_' + rand;
}

/**
 * 전화번호 마스킹
 * "01012345678" -> "010-****-5678"
 * "010-1234-5678" -> "010-****-5678"
 *
 * @param {string} phone - 전화번호
 * @return {string} 마스킹된 전화번호
 */
function maskPhone_(phone) {
  if (!phone) return '';
  var clean = phone.replace(/[^0-9]/g, '');
  if (clean.length < 10) return phone;

  var last4 = clean.substring(clean.length - 4);
  var first3 = clean.substring(0, 3);
  return first3 + '-****-' + last4;
}

/**
 * 이름 마스킹
 * "홍길동" -> "홍**"
 * "Kim" -> "K**"
 *
 * @param {string} name - 이름
 * @return {string} 마스킹된 이름
 */
function maskName_(name) {
  if (!name) return '';
  if (name.length <= 1) return name + '*';
  return name.charAt(0) + new Array(name.length).join('*');
}

/**
 * 이메일 마스킹
 * "user@gmail.com" -> "u***@gmail.com"
 *
 * @param {string} email - 이메일
 * @return {string} 마스킹된 이메일
 */
function maskEmail_(email) {
  if (!email || email.indexOf('@') === -1) return email || '';
  var parts = email.split('@');
  var local = parts[0];
  var domain = parts[1];

  if (local.length <= 1) return local + '***@' + domain;
  return local.charAt(0) + '***@' + domain;
}

/**
 * 금액 포맷 (천 단위 콤마)
 * 35000 -> "35,000원"
 *
 * @param {number|string} amount - 금액
 * @return {string} 포맷된 금액
 */
function formatCurrency_(amount) {
  var num = Number(amount) || 0;
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '원';
}

/**
 * 클래스 정렬
 *
 * @param {Array} classes - 클래스 목록
 * @param {string} sort - 정렬 기준
 * @return {Array} 정렬된 클래스 목록
 */
function sortClasses_(classes, sort) {
  switch (sort) {
    case 'popular':
      return classes.sort(function(a, b) { return b.class_count - a.class_count; });
    case 'rating':
      return classes.sort(function(a, b) { return b.avg_rating - a.avg_rating; });
    case 'price_asc':
      return classes.sort(function(a, b) { return a.price - b.price; });
    case 'price_desc':
      return classes.sort(function(a, b) { return b.price - a.price; });
    case 'latest':
    default:
      // 목록 순서 유지 (Sheets에서 최신순 정렬되어 있다고 가정)
      return classes;
  }
}

/**
 * 클래스 관련 캐시 무효화
 *
 * @param {string} classId - 클래스 ID
 */
function invalidateClassCache_(classId) {
  var cache = CacheService.getScriptCache();

  // 상세 캐시 삭제
  cache.remove('class_detail_' + classId);

  // 목록 캐시도 삭제 (대표 조합)
  var sorts = ['latest', 'popular', 'rating', 'price_asc', 'price_desc'];
  var keysToDelete = ['category_list'];
  for (var s = 0; s < sorts.length; s++) {
    for (var p = 1; p <= 5; p++) {
      keysToDelete.push('classes____' + sorts[s] + '_' + p + '_20');
    }
  }
  cache.removeAll(keysToDelete);

  Logger.log('[캐시 무효화] class_id=' + classId);
}


// =============================================
// 16. 설정 확인 / 디버깅 함수
// =============================================

/**
 * 설정 확인 (디버깅용)
 * GAS 편집기에서 직접 실행
 */
function checkConfig() {
  Logger.log('=== PRESSCO21 클래스 플랫폼 GAS 설정 확인 ===');

  var checks = {
    'SHOPKEY': SHOPKEY ? 'OK (' + SHOPKEY.substring(0, 5) + '...)' : '미설정',
    'LICENSEKEY': LICENSEKEY ? 'OK (' + LICENSEKEY.substring(0, 5) + '...)' : '미설정',
    'SHOP_DOMAIN': SHOP_DOMAIN || '미설정',
    'SPREADSHEET_ID': SPREADSHEET_ID ? 'OK (' + SPREADSHEET_ID.substring(0, 10) + '...)' : '미설정',
    'ADMIN_EMAIL': ADMIN_EMAIL || '미설정',
    'GAS_ENDPOINT': GAS_ENDPOINT ? 'OK' : '미설정 (배포 후 설정)'
  };

  for (var key in checks) {
    Logger.log('[' + (checks[key].indexOf('미설정') === -1 ? 'OK' : '누락') + '] ' + key + ': ' + checks[key]);
  }

  // 시트 존재 확인
  if (SPREADSHEET_ID) {
    try {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var sheets = ss.getSheets();
      var sheetNames = sheets.map(function(s) { return s.getName(); });
      Logger.log('[시트 목록] ' + sheetNames.join(', '));

      var required = ['파트너 상세', '클래스 메타', '정산 내역', '주문 처리 로그', '이메일 발송 로그', '시스템 설정'];
      for (var i = 0; i < required.length; i++) {
        var exists = sheetNames.indexOf(required[i]) >= 0;
        Logger.log('[' + (exists ? 'OK' : '누락') + '] 시트: ' + required[i]);
      }
    } catch (e) {
      Logger.log('[오류] 스프레드시트 접근 실패: ' + e.message);
    }
  }

  Logger.log('============================================');
}

/**
 * 시트 초기 구조 생성 (최초 1회 실행)
 * GAS 편집기에서 직접 실행
 */
function initSheets() {
  if (!SPREADSHEET_ID) {
    Logger.log('[오류] SPREADSHEET_ID가 설정되지 않았습니다.');
    return;
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // 파트너 상세 시트
  createSheetIfNotExists_(ss, '파트너 상세', [
    'partner_code', 'member_id', 'partner_name', 'grade', 'email', 'phone',
    'location', 'commission_rate', 'reserve_rate', 'class_count', 'avg_rating',
    'education_completed', 'portfolio_url', 'instagram_url', 'partner_map_id',
    'approved_date', 'status', 'notes'
  ]);

  // 클래스 메타 시트
  createSheetIfNotExists_(ss, '클래스 메타', [
    'class_id', 'makeshop_product_id', 'partner_code', 'class_name', 'category',
    'level', 'price', 'materials_price', 'duration_min', 'max_students', 'description',
    'curriculum_json', 'schedules_json', 'instructor_bio', 'thumbnail_url', 'image_urls',
    'youtube_video_id', 'location', 'materials_included', 'materials_product_ids', 'tags',
    'status', 'created_date', 'class_count', 'avg_rating'
  ]);

  // 정산 내역 시트 (U~W: Task 221에서 추가된 수강생 정보 컬럼)
  createSheetIfNotExists_(ss, '정산 내역', [
    'settlement_id', 'order_id', 'partner_code', 'class_id', 'member_id',
    'order_amount', 'commission_rate', 'commission_amount', 'reserve_rate',
    'reserve_amount', 'class_date', 'student_count', 'status', 'reserve_paid_date',
    'reserve_api_response', 'error_message', 'student_email_sent', 'partner_email_sent',
    'created_date', 'completed_date', 'student_name', 'student_email', 'student_phone'
  ]);

  // 주문 처리 로그 시트
  createSheetIfNotExists_(ss, '주문 처리 로그', [
    'log_id', 'poll_time', 'orders_found', 'orders_processed', 'errors', 'duration_ms'
  ]);

  // 이메일 발송 로그 시트
  createSheetIfNotExists_(ss, '이메일 발송 로그', [
    'log_date', 'daily_count', 'recipient', 'email_type', 'status', 'error_message'
  ]);

  // 시스템 설정 시트
  createSheetIfNotExists_(ss, '시스템 설정', [
    'key', 'value', 'updated_at'
  ]);

  // 파트너 신청 시트 (Task 223)
  createSheetIfNotExists_(ss, '파트너 신청', [
    'application_id', 'member_id', 'applicant_name', 'workshop_name', 'email',
    'phone', 'location', 'specialty', 'portfolio_url', 'instagram_url',
    'introduction', 'status', 'applied_date', 'reviewed_date', 'reviewer_note'
  ]);

  Logger.log('[초기화 완료] 모든 시트가 생성/확인되었습니다.');
}

/**
 * 시트 생성 헬퍼 (없으면 생성, 있으면 스킵)
 *
 * @param {Spreadsheet} ss - 스프레드시트 객체
 * @param {string} sheetName - 시트 이름
 * @param {Array} headers - 헤더 행 배열
 */
function createSheetIfNotExists_(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);

  if (sheet) {
    Logger.log('[존재] 시트: ' + sheetName);
    return;
  }

  sheet = ss.insertSheet(sheetName);
  sheet.appendRow(headers);

  // 헤더 스타일
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#f0f0f0');

  // 열 너비 자동 조정
  for (var i = 1; i <= headers.length; i++) {
    sheet.setColumnWidth(i, 120);
  }

  Logger.log('[생성] 시트: ' + sheetName + ' (컬럼 ' + headers.length + '개)');
}

/**
 * 캐시 수동 삭제 (디버깅용)
 * GAS 편집기에서 직접 실행
 */
function clearAllCache() {
  handleClearCache();
  Logger.log('[완료] 전체 캐시 삭제');
}

/**
 * 테스트: 전체 설정 + 시트 + API 연결 확인
 * GAS 편집기에서 직접 실행
 */
function runFullTest() {
  Logger.log('=== 전체 테스트 시작 ===');

  // 1. 설정 확인
  checkConfig();

  // 2. 시트 읽기 테스트
  Logger.log('\n--- 시트 읽기 테스트 ---');
  var partnerSheet = getSheet_('파트너 상세');
  if (partnerSheet) {
    var lastRow = partnerSheet.getLastRow();
    Logger.log('[파트너 상세] 행 수: ' + lastRow);
  }

  var classSheet = getSheet_('클래스 메타');
  if (classSheet) {
    var lastRow2 = classSheet.getLastRow();
    Logger.log('[클래스 메타] 행 수: ' + lastRow2);
  }

  // 3. API 엔드포인트 시뮬레이션
  Logger.log('\n--- API 시뮬레이션 ---');

  // getClasses 테스트
  var classResult = handleGetClasses({ sort: 'latest', page: '1', limit: '5' });
  Logger.log('[getClasses] success=' + classResult.success
    + ', 건수=' + (classResult.data ? classResult.data.length : 0));

  // getCategories 테스트
  var catResult = handleGetCategories();
  Logger.log('[getCategories] success=' + catResult.success
    + ', 건수=' + (catResult.data ? catResult.data.length : 0));

  // health 테스트
  Logger.log('[health] OK');

  Logger.log('\n=== 전체 테스트 완료 ===');
}


// =============================================
// 추가 유틸리티 (코드 검수 반영)
// =============================================

/**
 * C-01 수정 (Task 221 검수): URL 검증 유틸리티
 * javascript:, data:, vbscript: 등 악성 프로토콜을 차단하고
 * http/https만 허용합니다. 프론트엔드에서 <a href>로 노출되므로 필수.
 *
 * @param {string} url - 검증할 URL
 * @return {string} 안전한 URL (악성이면 빈 문자열 반환)
 */
function sanitizeUrl_(url) {
  if (!url) return '';
  var trimmed = String(url).trim();
  if (!trimmed) return '';

  // 허용 프로토콜: http, https만. 프로토콜 없으면 https:// 추가
  var lower = trimmed.toLowerCase();
  if (lower.indexOf('http://') === 0 || lower.indexOf('https://') === 0) {
    return trimmed.substring(0, 2048); // URL 길이 제한
  }

  // 프로토콜 없는 경우 (예: "www.instagram.com/...")
  if (lower.indexOf('://') === -1 && lower.indexOf(':') === -1) {
    return ('https://' + trimmed).substring(0, 2048);
  }

  // javascript:, data:, vbscript: 등 위험 프로토콜 -> 차단
  Logger.log('[URL 차단] 허용되지 않은 프로토콜: ' + trimmed.substring(0, 100));
  return '';
}

/**
 * C-03 수정: HTML 이스케이프 유틸리티
 * 이메일 HTML 본문에 사용자 입력값 삽입 시 XSS/CSS Injection 방지
 *
 * @param {*} str - 이스케이프할 값
 * @return {string} HTML 이스케이프된 문자열
 */
function escapeHtml_(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * C-04 수정: FAILED 상태 정산 재시도 배치
 * 관리자가 GAS 편집기에서 직접 실행하거나 시간 트리거에 추가 가능
 *
 * 실행 방법: GAS 편집기 상단 함수 선택 드롭다운에서 retryFailedSettlements 선택 후 실행
 */
function retryFailedSettlements() {
  var startTime = new Date().getTime();
  var MAX_RETRY_COUNT = 5; // 최대 재시도 횟수 (이 이상이면 수동 처리 필요)

  // LockService -- 동시 실행 방지
  var lock = LockService.getScriptLock();
  var hasLock = lock.tryLock(0);
  if (!hasLock) {
    Logger.log('[재시도 스킵] 다른 프로세스가 실행 중입니다.');
    return;
  }

  try {
    var sheet = getSheet_('정산 내역');
    if (!sheet) {
      Logger.log('[재시도] "정산 내역" 시트를 찾을 수 없습니다.');
      return;
    }

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      Logger.log('[재시도] 정산 데이터가 없습니다.');
      return;
    }

    var headers = data[0];
    var retriedCount = 0;
    var failedCount = 0;
    var skippedCount = 0;
    var details = []; // 상세 결과 목록

    Logger.log('[재시도 시작] FAILED 상태 정산 확인 중...');

    // error_message 컬럼에서 retry_count 추적 (형식: "retry:N|원래에러메시지")
    var errorIdx = headers.indexOf('error_message');

    for (var i = 1; i < data.length; i++) {
      // GAS 6분 실행 제한 대비: 5분 경과 시 안전하게 중단
      if (new Date().getTime() - startTime > 300000) {
        Logger.log('[재시도 중단] 5분 경과, 나머지는 다음 실행 시 처리');
        break;
      }

      var row = rowToObject_(headers, data[i]);
      if (row.status !== 'FAILED') continue;

      // 필수 정보 확인
      if (!row.partner_code || !row.settlement_id) continue;

      // retry_count 추출 (error_message에서 "retry:N|" 패턴)
      var currentErrorMsg = String(row.error_message || '');
      var retryCount = 0;
      var retryMatch = currentErrorMsg.match(/^retry:(\d+)\|/);
      if (retryMatch) {
        retryCount = parseInt(retryMatch[1], 10);
      }

      // 최대 재시도 횟수 초과 시 스킵
      if (retryCount >= MAX_RETRY_COUNT) {
        Logger.log('[재시도 스킵] 최대 재시도 횟수(' + MAX_RETRY_COUNT + '회) 초과: settlement_id=' + row.settlement_id);
        skippedCount++;
        continue;
      }

      Logger.log('[재시도] settlement_id=' + row.settlement_id + ', partner=' + row.partner_code + ', retry=' + (retryCount + 1));

      var partner = findPartnerByCode_(row.partner_code);
      if (!partner) {
        Logger.log('[재시도 스킵] 파트너 정보 없음: ' + row.partner_code);
        skippedCount++;
        continue;
      }

      var reserveAmount = Number(row.reserve_amount) || 0;
      if (reserveAmount <= 0) {
        Logger.log('[재시도 스킵] 적립금 금액 0원: settlement_id=' + row.settlement_id);
        // 적립금 0원이면 COMPLETED로 변경
        updateSettlementStatus_(row.settlement_id, 'COMPLETED', '', '적립금 0원 (재시도 시 자동 완료)');
        retriedCount++;
        continue;
      }

      // 적립금 지급 재시도
      var result = processReservePayment_(
        row.settlement_id,
        partner.member_id,
        reserveAmount,
        '[PRESSCO21] 적립금 재처리 (재시도 ' + (retryCount + 1) + '회) - 주문: ' + row.order_id
      );

      if (result.success) {
        retriedCount++;
        details.push('OK: ' + row.settlement_id + ' (' + formatCurrency_(reserveAmount) + ')');
        Logger.log('[재시도 성공] settlement_id=' + row.settlement_id + ', 금액=' + reserveAmount + '원');
      } else {
        failedCount++;
        // retry_count를 error_message에 기록
        var newRetryCount = retryCount + 1;
        var originalError = retryMatch ? currentErrorMsg.replace(retryMatch[0], '') : currentErrorMsg;
        var newErrorMsg = 'retry:' + newRetryCount + '|' + (result.error || originalError || '알 수 없는 오류');

        // error_message 직접 업데이트 (processReservePayment_에서 덮어쓰므로 추가 업데이트)
        if (errorIdx !== -1) {
          sheet.getRange(i + 1, errorIdx + 1).setValue(newErrorMsg.substring(0, 500));
        }

        details.push('FAIL: ' + row.settlement_id + ' (retry ' + newRetryCount + '/' + MAX_RETRY_COUNT + ')');
        Logger.log('[재시도 실패] settlement_id=' + row.settlement_id + ': ' + (result.error || '알 수 없는 오류'));
      }

      // 10건마다 flush
      if ((retriedCount + failedCount) % 10 === 0) {
        SpreadsheetApp.flush();
      }
    }

    SpreadsheetApp.flush();

    var elapsed = Math.round((new Date().getTime() - startTime) / 1000);
    Logger.log('[재시도 완료] 성공=' + retriedCount + '건, 실패=' + failedCount + '건, 스킵=' + skippedCount + '건, 소요=' + elapsed + '초');

    // 결과를 관리자에게 알림
    if (retriedCount > 0 || failedCount > 0) {
      var alertBody = 'FAILED 정산 재시도 결과 (' + formatDateOnly_(new Date()) + ')\n\n'
        + '성공: ' + retriedCount + '건\n'
        + '실패: ' + failedCount + '건\n'
        + '스킵 (최대 재시도 초과): ' + skippedCount + '건\n'
        + '소요 시간: ' + elapsed + '초\n';

      if (details.length > 0) {
        alertBody += '\n--- 상세 ---\n' + details.join('\n');
      }

      if (skippedCount > 0) {
        alertBody += '\n\n[주의] 최대 재시도 횟수(' + MAX_RETRY_COUNT + '회)를 초과한 정산이 '
          + skippedCount + '건 있습니다.\n"정산 내역" 시트에서 수동 확인이 필요합니다.';
      }

      sendAdminAlert_('[PRESSCO21] FAILED 정산 재시도 결과', alertBody);
    } else if (skippedCount === 0) {
      Logger.log('[재시도] 처리할 FAILED 정산이 없습니다.');
    }

  } catch (err) {
    logError_('retryFailedSettlements', '', err);
  } finally {
    lock.releaseLock();
  }
}


// =============================================
// 추가 섹션: 배치/동기화 함수 (Task 202)
// 매일 오전 3시 GAS 시간 트리거로 실행
// =============================================

/**
 * 메이크샵 "파트너 클래스" 카테고리 상품 목록을 Sheets "클래스 메타"에 동기화
 *
 * 실행 주기: 매일 오전 3시 (GAS 시간 트리거 설정 필요)
 * 설정 방법: GAS 편집기 > 트리거 > 함수: triggerSyncClassProducts > 시간 기반 > 매일 > 오전 3시~4시
 *
 * 동작 로직:
 * 1. "시스템 설정" 시트에서 카테고리 ID 조회
 * 2. 메이크샵 상품 목록 API 호출 (해당 카테고리 필터)
 * 3. Sheets "클래스 메타" 전체 데이터와 비교
 * 4. 신규 상품 -> 새 행 추가 (class_id 자동 부여)
 * 5. 기존 상품 -> 가격/상태 업데이트
 * 6. 메이크샵에서 삭제/비노출된 상품 -> INACTIVE 처리
 * 7. 동기화 결과 관리자 이메일 발송
 */
function syncClassProducts_() {
  Logger.log('[동기화 시작] 클래스 상품 동기화');

  var categoryId = getClassCategoryId_();
  if (!categoryId) {
    Logger.log('[동기화 중단] 카테고리 ID가 설정되지 않았습니다.');
    sendAdminAlert_(
      '[PRESSCO21] 클래스 상품 동기화 실패',
      '카테고리 ID가 "시스템 설정" 시트에 설정되지 않았습니다.\n'
      + '"시스템 설정" 시트에 key="class_category_id", value=카테고리 번호를 입력해 주세요.\n\n'
      + '카테고리 번호 확인: 메이크샵 관리자 > 상품관리 > 카테고리관리 > "파트너 클래스" 카테고리 번호'
    );
    return;
  }

  // 메이크샵 상품 목록 API 호출 (페이지네이션 포함)
  var products = fetchClassProducts_(categoryId);
  if (products === null) {
    // API 호출 실패 (fetchClassProducts_ 내부에서 로깅 완료)
    return;
  }

  // LockService -- 동시 쓰기 방지 (C-01 수정)
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // 15초 대기 (동기화는 시간이 걸릴 수 있으므로 여유 있게)
  } catch (lockErr) {
    Logger.log('[동기화 중단] LockService 획득 실패: ' + lockErr.message);
    sendAdminAlert_(
      '[PRESSCO21] 클래스 상품 동기화 실패',
      '다른 프로세스가 실행 중이어서 동기화를 시작할 수 없습니다.\n'
      + '잠시 후 자동으로 재시도됩니다.'
    );
    return;
  }

  try {
  // Sheets "클래스 메타" 시트 데이터 로드
  var sheet = getSheet_('클래스 메타');
  if (!sheet) {
    Logger.log('[동기화 오류] "클래스 메타" 시트를 찾을 수 없습니다.');
    sendAdminAlert_(
      '[PRESSCO21] 클래스 상품 동기화 실패',
      '"클래스 메타" 시트를 찾을 수 없습니다. 시트가 존재하는지 확인해 주세요.'
    );
    return;
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  // 헤더 인덱스 매핑
  var colIdx = {};
  for (var h = 0; h < headers.length; h++) {
    colIdx[String(headers[h]).trim()] = h;
  }

  // 필수 컬럼 존재 확인
  if (colIdx['class_id'] === undefined || colIdx['makeshop_product_id'] === undefined || colIdx['status'] === undefined) {
    Logger.log('[동기화 오류] 필수 컬럼(class_id, makeshop_product_id, status)이 없습니다.');
    return;
  }

  // 기존 Sheets 데이터를 branduid(makeshop_product_id) 기준 맵으로 변환
  // key: branduid, value: { rowIndex: 시트 행 번호(1-based), data: rowObject }
  var existingMap = {};
  for (var i = 1; i < data.length; i++) {
    var productId = String(data[i][colIdx['makeshop_product_id']] || '').trim();
    if (productId) {
      existingMap[productId] = {
        rowIndex: i + 1,  // 시트 행 번호 (1-based, 헤더 포함)
        data: rowToObject_(headers, data[i])
      };
    }
  }

  // 파트너명 -> partner_code 매핑 테이블 구축 (M-02 수정: 신규 상품에 partner_code 자동 매칭)
  var partnerNameMap = buildPartnerNameMap_();

  // 메이크샵 상품의 branduid 집합 (삭제 감지용)
  var makeshopProductIds = {};
  var addedCount = 0;
  var updatedCount = 0;
  var inactivatedCount = 0;
  var errors = [];
  var unmatchedPartners = []; // partner_code 자동 매칭 실패 목록

  // 다음 class_id 결정 (CLS001, CLS002, ...)
  var maxClassNum = 0;
  for (var j = 1; j < data.length; j++) {
    var existingClassId = String(data[j][colIdx['class_id']] || '').trim();
    if (existingClassId && existingClassId.indexOf('CLS') === 0) {
      var num = parseInt(existingClassId.replace('CLS', ''), 10);
      if (!isNaN(num) && num > maxClassNum) {
        maxClassNum = num;
      }
    }
  }

  // M-03 수정: CLS ID 상한 경고
  if (maxClassNum >= 999) {
    Logger.log('[경고] class_id가 CLS999를 초과합니다. 현재 최대: CLS' + maxClassNum);
    sendAdminAlert_(
      '[PRESSCO21] 클래스 ID 상한 경고',
      'class_id가 CLS999를 초과했습니다 (현재 최대: CLS' + maxClassNum + ').\n'
      + '4자리 ID가 생성됩니다. 기존 시스템과 호환 여부를 확인해 주세요.'
    );
  }

  // M-01 수정: 일괄 업데이트를 위한 변경 목록 수집
  var cellUpdates = []; // { row: number, col: number, value: any }

  // 상품 목록 처리
  for (var p = 0; p < products.length; p++) {
    var product = products[p];
    var branduid = String(product.branduid || '').trim();

    if (!branduid) {
      Logger.log('[동기화 스킵] branduid 없는 상품: ' + (product.name || '이름 없음'));
      continue;
    }

    makeshopProductIds[branduid] = true;

    try {
      if (existingMap[branduid]) {
        // 기존 상품 -> 업데이트 (가격, 상품명, 상태만 업데이트)
        var existing = existingMap[branduid];
        var needsUpdate = false;

        // 가격 비교
        var newPrice = Number(product.price) || 0;
        var oldPrice = Number(existing.data.price) || 0;
        if (newPrice !== oldPrice && colIdx['price'] !== undefined) {
          cellUpdates.push({ row: existing.rowIndex, col: colIdx['price'] + 1, value: newPrice });
          needsUpdate = true;
        }

        // 상품명에서 클래스명 추출 (상품명 형식: "[파트너명] 클래스명")
        var className = extractClassName_(product.name || '');
        var oldClassName = String(existing.data.class_name || '').trim();
        if (className && className !== oldClassName && colIdx['class_name'] !== undefined) {
          cellUpdates.push({ row: existing.rowIndex, col: colIdx['class_name'] + 1, value: className });
          needsUpdate = true;
        }

        // INACTIVE 상태인데 메이크샵에 다시 나타나면 ACTIVE로 복구
        var existingStatus = String(existing.data.status || '').trim();
        if (existingStatus === 'INACTIVE' && colIdx['status'] !== undefined) {
          cellUpdates.push({ row: existing.rowIndex, col: colIdx['status'] + 1, value: 'ACTIVE' });
          needsUpdate = true;
        }

        // W-02 수정: 업데이트 시 updated_date 기록
        if (needsUpdate && colIdx['updated_date'] !== undefined) {
          cellUpdates.push({ row: existing.rowIndex, col: colIdx['updated_date'] + 1, value: formatDateOnly_(new Date()) });
        }

        if (needsUpdate) {
          updatedCount++;
          Logger.log('[동기화 업데이트] branduid=' + branduid + ', 상품명=' + (product.name || ''));
        }

      } else {
        // 신규 상품 -> 새 행 추가
        maxClassNum++;
        var newClassId = 'CLS' + padNumber_(maxClassNum, 3);

        // 상품명에서 파트너명과 클래스명 분리
        var parsedName = parseProductName_(product.name || '');

        var newRow = [];
        for (var c = 0; c < headers.length; c++) {
          newRow.push('');  // 기본값 빈 문자열
        }

        // 핵심 필드 설정
        if (colIdx['class_id'] !== undefined) newRow[colIdx['class_id']] = newClassId;
        if (colIdx['makeshop_product_id'] !== undefined) newRow[colIdx['makeshop_product_id']] = branduid;
        if (colIdx['class_name'] !== undefined) newRow[colIdx['class_name']] = parsedName.className;
        if (colIdx['price'] !== undefined) newRow[colIdx['price']] = Number(product.price) || 0;
        if (colIdx['status'] !== undefined) newRow[colIdx['status']] = 'ACTIVE';
        if (colIdx['created_date'] !== undefined) newRow[colIdx['created_date']] = formatDateOnly_(new Date());

        // M-02 수정: 파트너명으로 partner_code 자동 매칭
        if (colIdx['partner_code'] !== undefined && parsedName.partnerName) {
          var matchedCode = partnerNameMap[parsedName.partnerName] || '';
          newRow[colIdx['partner_code']] = matchedCode;
          if (!matchedCode) {
            unmatchedPartners.push({ branduid: branduid, partnerName: parsedName.partnerName, classId: newClassId });
            Logger.log('[동기화 경고] partner_code 자동 매칭 실패: 파트너명="' + parsedName.partnerName + '", branduid=' + branduid);
          }
        }

        // 카테고리 기본값 (관리자가 나중에 수정)
        if (colIdx['category'] !== undefined) newRow[colIdx['category']] = 'ONEDAY';
        if (colIdx['level'] !== undefined) newRow[colIdx['level']] = 'BEGINNER';

        sheet.appendRow(newRow);
        addedCount++;
        Logger.log('[동기화 신규] class_id=' + newClassId + ', branduid=' + branduid
          + ', 상품명=' + (product.name || ''));
      }
    } catch (productErr) {
      Logger.log('[동기화 오류] branduid=' + branduid + ': ' + productErr.message);
      errors.push({ branduid: branduid, error: productErr.message });
    }
  }

  // 삭제 감지: Sheets에는 있지만 메이크샵에는 없는 상품 -> INACTIVE
  for (var existingPid in existingMap) {
    if (!makeshopProductIds[existingPid]) {
      var row = existingMap[existingPid];
      var currentStatus = String(row.data.status || '').trim();
      if (currentStatus === 'ACTIVE' || currentStatus === 'DRAFT') {
        if (colIdx['status'] !== undefined) {
          cellUpdates.push({ row: row.rowIndex, col: colIdx['status'] + 1, value: 'INACTIVE' });
          inactivatedCount++;
          Logger.log('[동기화 비활성] branduid=' + existingPid + ' (메이크샵에서 미확인)');
        }
      }
    }
  }

  // M-01 수정: 수집된 셀 업데이트를 일괄 적용
  for (var u = 0; u < cellUpdates.length; u++) {
    sheet.getRange(cellUpdates[u].row, cellUpdates[u].col).setValue(cellUpdates[u].value);
  }

  SpreadsheetApp.flush();

  // 동기화 결과 로깅
  var summary = '[동기화 완료] 메이크샵 상품=' + products.length + '건'
    + ', 신규=' + addedCount + '건'
    + ', 업데이트=' + updatedCount + '건'
    + ', 비활성=' + inactivatedCount + '건'
    + ', 오류=' + errors.length + '건';
  Logger.log(summary);

  // 마지막 동기화 시각 기록
  setSystemSetting_('last_sync_time', now_());

  // 변경 사항이 있을 때만 관리자 알림
  if (addedCount > 0 || updatedCount > 0 || inactivatedCount > 0 || errors.length > 0) {
    var emailBody = '클래스 상품 동기화 결과 (' + formatDateOnly_(new Date()) + ')\n\n'
      + '메이크샵 상품 수: ' + products.length + '건\n'
      + '신규 추가: ' + addedCount + '건\n'
      + '업데이트: ' + updatedCount + '건\n'
      + '비활성화: ' + inactivatedCount + '건\n'
      + '오류: ' + errors.length + '건\n';

    if (errors.length > 0) {
      emailBody += '\n--- 오류 목록 ---\n';
      for (var e = 0; e < errors.length; e++) {
        emailBody += '- branduid=' + errors[e].branduid + ': ' + errors[e].error + '\n';
      }
    }

    // M-02 수정: partner_code 매칭 실패 목록을 관리자 알림에 포함
    if (unmatchedPartners.length > 0) {
      emailBody += '\n--- partner_code 미매칭 목록 (수동 설정 필요) ---\n';
      for (var m = 0; m < unmatchedPartners.length; m++) {
        emailBody += '- ' + unmatchedPartners[m].classId
          + ': 파트너명="' + unmatchedPartners[m].partnerName
          + '", branduid=' + unmatchedPartners[m].branduid + '\n';
      }
    }

    if (addedCount > 0) {
      emailBody += '\n신규 추가된 상품은 "클래스 메타" 시트에서 partner_code, category, level 등을 확인/수정해 주세요.';
    }

    sendAdminAlert_('[PRESSCO21] 클래스 상품 동기화 결과', emailBody);
  }

  } finally {
    lock.releaseLock(); // C-01 수정: 반드시 락 해제
  }
}

/**
 * GAS 시간 트리거용 래퍼 함수
 * 트리거 설정: GAS 편집기 > 트리거 > 함수: triggerSyncClassProducts > 시간 기반 > 매일 > 오전 3시~4시
 */
function triggerSyncClassProducts() {
  Logger.log('[트리거] 클래스 상품 동기화 시작');
  try {
    syncClassProducts_();
  } catch (err) {
    logError_('triggerSyncClassProducts', '', err);
    sendAdminAlert_(
      '[PRESSCO21] 클래스 상품 동기화 트리거 오류',
      '동기화 중 오류가 발생했습니다.\n\n오류: ' + err.message
    );
  }
}

/**
 * "시스템 설정" 시트에서 메이크샵 파트너 클래스 카테고리 ID 조회
 *
 * @return {string} 카테고리 ID (없으면 빈 문자열)
 */
function getClassCategoryId_() {
  var categoryId = getSystemSetting_('class_category_id');

  if (!categoryId) {
    Logger.log('[설정 누락] class_category_id가 "시스템 설정" 시트에 없습니다.');
    Logger.log('설정 방법: "시스템 설정" 시트에 key="class_category_id", value=카테고리 번호 입력');
  }

  return categoryId;
}

/**
 * 메이크샵 상품 목록 API 호출 (카테고리 ID로 필터링, 페이지네이션 포함)
 *
 * C-02 수정: 페이지네이션 구현. 메이크샵 API는 기본 10건만 반환하므로
 * pageSize=100으로 설정하고, 응답이 꽉 차면 다음 페이지를 호출합니다.
 * API 호출 횟수 제한(시간당 500회)을 고려하여 최대 10페이지(1,000건)로 제한합니다.
 *
 * @param {string} categoryId - 메이크샵 카테고리 번호
 * @return {Array|null} 상품 목록 배열 (실패 시 null)
 */
function fetchClassProducts_(categoryId) {
  var PAGE_SIZE = 100;   // 메이크샵 API 최대 페이지 크기
  var MAX_PAGES = 10;    // 안전장치: 최대 10페이지 (1,000건)
  var allProducts = [];

  for (var pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
    var url = 'https://' + SHOP_DOMAIN + '/list/open_api.html'
      + '?mode=search&type=product_list'
      + '&cate=' + encodeURIComponent(categoryId)
      + '&pageSize=' + PAGE_SIZE
      + '&pageNum=' + pageNum;

    var options = {
      method: 'get',
      headers: {
        'Shopkey': SHOPKEY,
        'Licensekey': LICENSEKEY
      },
      muteHttpExceptions: true
    };

    Logger.log('[상품 조회] 페이지 ' + pageNum + ', URL: ' + url);

    try {
      var response = UrlFetchApp.fetch(url, options);
      var httpCode = response.getResponseCode();
      var body = response.getContentText();

      if (httpCode !== 200) {
        Logger.log('[상품 조회 오류] HTTP ' + httpCode + ': ' + body);
        sendAdminAlert_(
          '[PRESSCO21] 클래스 상품 API 조회 실패',
          'HTTP ' + httpCode + ' (페이지 ' + pageNum + ')\n응답: ' + body.substring(0, 500)
        );
        return null;
      }

      var result = JSON.parse(body);

      if (result.return_code && result.return_code !== '0000') {
        Logger.log('[상품 조회] return_code=' + result.return_code + ', message=' + (result.message || ''));
        // 상품이 0건인 경우 또는 더 이상 페이지가 없는 경우
        if (result.return_code === '0001') {
          if (pageNum === 1) {
            Logger.log('[상품 조회] 해당 카테고리에 상품이 없습니다.');
            return [];
          }
          // 2페이지 이후에서 0001이면 이전 페이지까지의 결과 반환
          break;
        }
        sendAdminAlert_(
          '[PRESSCO21] 클래스 상품 API 조회 실패',
          'return_code: ' + result.return_code + '\nmessage: ' + (result.message || '')
          + '\n(페이지 ' + pageNum + ')'
        );
        return null;
      }

      var products = result.list || result.datas || [];
      Logger.log('[상품 조회] 페이지 ' + pageNum + ': ' + products.length + '건 조회됨');

      for (var i = 0; i < products.length; i++) {
        allProducts.push(products[i]);
      }

      // 반환된 상품 수가 pageSize보다 적으면 마지막 페이지
      if (products.length < PAGE_SIZE) {
        break;
      }

    } catch (err) {
      Logger.log('[상품 조회 예외] 페이지 ' + pageNum + ': ' + err.message);
      sendAdminAlert_(
        '[PRESSCO21] 클래스 상품 API 조회 예외',
        '오류: ' + err.message + '\n(페이지 ' + pageNum + ')'
      );
      return null;
    }
  }

  Logger.log('[상품 조회 완료] 총 ' + allProducts.length + '건 조회됨');
  return allProducts;
}

/**
 * 상품명에서 클래스명 추출 (파트너명 제거)
 * 형식: "[파트너명] 클래스명" -> "클래스명"
 *
 * @param {string} productName - 메이크샵 상품명
 * @return {string} 클래스명 (파트너명이 없으면 원본 반환)
 */
function extractClassName_(productName) {
  if (!productName) return '';
  var name = String(productName).trim();

  // "[파트너명] 클래스명" 형식에서 클래스명 추출
  var bracketEnd = name.indexOf(']');
  if (name.charAt(0) === '[' && bracketEnd > 0) {
    return name.substring(bracketEnd + 1).trim();
  }

  return name;
}

/**
 * 상품명을 파트너명과 클래스명으로 분리
 * 형식: "[파트너명] 클래스명"
 *
 * @param {string} productName - 메이크샵 상품명
 * @return {Object} { partnerName: string, className: string }
 */
function parseProductName_(productName) {
  var result = { partnerName: '', className: '' };
  if (!productName) return result;

  var name = String(productName).trim();
  var bracketEnd = name.indexOf(']');

  if (name.charAt(0) === '[' && bracketEnd > 0) {
    result.partnerName = name.substring(1, bracketEnd).trim();
    result.className = name.substring(bracketEnd + 1).trim();
  } else {
    result.className = name;
  }

  return result;
}

/**
 * 숫자를 지정 자릿수로 패딩 (CLS001, CLS002 등 생성용)
 *
 * @param {number} num - 숫자
 * @param {number} digits - 총 자릿수
 * @return {string} 패딩된 문자열
 */
function padNumber_(num, digits) {
  var str = String(num);
  while (str.length < digits) {
    str = '0' + str;
  }
  return str;
}

/**
 * "파트너 상세" 시트에서 파트너명 -> partner_code 매핑 테이블 구축
 * 상품명 "[파트너명] 클래스명"에서 추출한 파트너명으로 partner_code를 자동 매칭하기 위한 헬퍼
 *
 * M-02 수정 시 추가된 함수
 *
 * @return {Object} { '파트너명': 'partner_code', ... }
 */
function buildPartnerNameMap_() {
  var map = {};
  var sheet = getSheet_('파트너 상세');
  if (!sheet) {
    Logger.log('[경고] "파트너 상세" 시트를 찾을 수 없어 partner_code 자동 매칭이 불가합니다.');
    return map;
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var codeIdx = headers.indexOf('partner_code');
  var nameIdx = headers.indexOf('partner_name');

  if (codeIdx === -1 || nameIdx === -1) {
    Logger.log('[경고] "파트너 상세" 시트에 partner_code 또는 partner_name 컬럼이 없습니다.');
    return map;
  }

  for (var i = 1; i < data.length; i++) {
    var name = String(data[i][nameIdx] || '').trim();
    var code = String(data[i][codeIdx] || '').trim();
    if (name && code) {
      map[name] = code;
    }
  }

  Logger.log('[파트너 매핑] ' + Object.keys(map).length + '개 파트너 매핑 완료');
  return map;
}


// =============================================
// Task 223: 파트너 가입/승인/등급 관리
// =============================================

/**
 * 파트너 신청 접수 (POST action=partnerApply)
 * - 신청 정보를 "파트너 신청" 시트에 저장
 * - 관리자에게 신규 신청 알림 이메일 발송
 *
 * 필수 파라미터: member_id, applicant_name, email
 * 선택 파라미터: workshop_name, phone, location, specialty, portfolio_url, instagram_url, introduction
 *
 * @param {Object} data - POST 본문 데이터
 * @return {Object} 신청 결과
 */
function handlePartnerApply(data) {
  // 필수 파라미터 검증
  var memberId = (data.member_id || '').trim();
  var applicantName = (data.applicant_name || '').trim();
  var email = (data.email || '').trim();

  if (!memberId) return errorResult(ERROR_CODES.NOT_LOGGED_IN);
  if (!applicantName) return errorResult(ERROR_CODES.MISSING_PARAMS, 'applicant_name 파라미터가 필요합니다.');
  if (!email || email.indexOf('@') === -1) return errorResult(ERROR_CODES.MISSING_PARAMS, '유효한 email 파라미터가 필요합니다.');

  // C-01 수정 (Task 221 검수): URL 입력값 검증 -- javascript: 프로토콜 등 악성 URL 차단
  var portfolioUrl = sanitizeUrl_((data.portfolio_url || '').trim());
  var instagramUrl = sanitizeUrl_((data.instagram_url || '').trim());

  // 입력 길이 제한 (시트 셀 용량 + DoS 방지)
  var MAX_TEXT_LEN = 500;
  var introduction = (data.introduction || '').trim().substring(0, MAX_TEXT_LEN);
  var specialty = (data.specialty || '').trim().substring(0, 100);
  var workshopName = (data.workshop_name || '').trim().substring(0, 100);
  var location = (data.location || '').trim().substring(0, 100);
  var phone = (data.phone || '').trim().substring(0, 20);

  // LockService -- 동시 쓰기 방지 (C-02 수정: TOCTOU 방지를 위해 중복 체크를 Lock 내부로 이동)
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return errorResult(ERROR_CODES.LOCK_TIMEOUT);
  }

  try {
    // 이미 파트너인지 확인 (Lock 내부에서 재확인하여 동시 요청 시 중복 방지)
    var existingPartner = findPartnerByMemberId_(memberId);
    if (existingPartner) {
      return {
        success: true,
        data: {
          message: '이미 파트너로 등록되어 있습니다.',
          partner_code: existingPartner.partner_code,
          status: existingPartner.status
        },
        timestamp: now_()
      };
    }

    // 중복 신청 확인 (Lock 내부에서 재확인)
    var existingApplication = findPartnerApplicationByMemberId_(memberId);
    if (existingApplication && existingApplication.status === 'PENDING') {
      return {
        success: true,
        data: {
          message: '이미 심사 중인 신청이 있습니다.',
          application_id: existingApplication.application_id,
          status: 'PENDING'
        },
        timestamp: now_()
      };
    }

    var applicationId = generateId_('APP');
    var nowStr = now_();

    var sheet = getSheet_('파트너 신청');
    if (!sheet) {
      return errorResult(ERROR_CODES.INTERNAL_ERROR, '"파트너 신청" 시트를 찾을 수 없습니다.');
    }

    sheet.appendRow([
      applicationId,                              // A: application_id
      memberId,                                   // B: member_id
      applicantName,                              // C: applicant_name
      workshopName,                               // D: workshop_name
      email,                                      // E: email
      phone,                                      // F: phone
      location,                                   // G: location
      specialty,                                  // H: specialty (전문 분야: 압화, 레진, 캔들 등)
      portfolioUrl,                               // I: portfolio_url (sanitizeUrl_ 적용)
      instagramUrl,                               // J: instagram_url (sanitizeUrl_ 적용)
      introduction,                               // K: introduction (길이 제한 적용)
      'PENDING',                                  // L: status
      nowStr,                                     // M: applied_date
      '',                                         // N: reviewed_date
      ''                                          // O: reviewer_note
    ]);

    SpreadsheetApp.flush();

    Logger.log('[파트너 신청] application_id=' + applicationId + ', member_id=' + memberId);

    // 관리자에게 신규 신청 알림 (개인정보 마스킹 적용)
    sendAdminAlert_(
      '[PRESSCO21] 새 파트너 신청 - ' + applicantName,
      '새로운 파트너 신청이 접수되었습니다.\n\n'
      + '신청 ID: ' + applicationId + '\n'
      + '회원 ID: ' + memberId + '\n'
      + '신청자: ' + applicantName + '\n'
      + '공방명: ' + (workshopName || '미입력') + '\n'
      + '이메일: ' + maskEmail_(email) + '\n'
      + '전문 분야: ' + (specialty || '미입력') + '\n'
      + '지역: ' + (location || '미입력') + '\n'
      + '포트폴리오: ' + (portfolioUrl || '미입력') + '\n'
      + '인스타그램: ' + (instagramUrl || '미입력') + '\n\n'
      + '"파트너 신청" 시트에서 확인 후 승인 처리해 주세요.'
    );

    // 신청자에게 접수 확인 이메일
    var confirmSubject = '[PRESSCO21] 파트너 신청이 접수되었습니다';
    var confirmBody = '<div style="font-family: \'Noto Sans KR\', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">'
      + '<div style="text-align: center; padding: 16px 0;">'
      + '<span style="font-size: 24px; color: #b89b5e; font-weight: bold;">PRESSCO21</span>'
      + '</div>'
      + '<h2 style="color: #2d2d2d; border-bottom: 2px solid #b89b5e; padding-bottom: 12px;">'
      + '파트너 신청 접수 확인</h2>'
      + '<p style="color: #555; line-height: 1.8;">'
      + escapeHtml_(applicantName) + '님, PRESSCO21 파트너 클래스 플랫폼에 관심을 가져 주셔서 감사합니다.</p>'
      + '<p style="color: #555; line-height: 1.8;">'
      + '신청 내용을 검토한 후 <strong>영업일 기준 2~3일 이내</strong>에 결과를 안내드리겠습니다.</p>'
      + '<table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #eee;">'
      + '<tr style="background: #f8f5f0;"><td style="padding: 12px; font-weight: bold; width: 100px;">신청 번호</td>'
      + '<td style="padding: 12px;">' + escapeHtml_(applicationId) + '</td></tr>'
      + '<tr><td style="padding: 12px; font-weight: bold;">신청일</td>'
      + '<td style="padding: 12px;">' + escapeHtml_(nowStr) + '</td></tr>'
      + '<tr style="background: #f8f5f0;"><td style="padding: 12px; font-weight: bold;">상태</td>'
      + '<td style="padding: 12px;">심사 중</td></tr>'
      + '</table>'
      + '<p style="color: #888; font-size: 13px;">* 문의: foreverloveflower@naver.com</p>'
      + '</div>';

    sendEmailWithTracking_(email, confirmSubject, confirmBody, 'PARTNER_APPLY_CONFIRM');

    return {
      success: true,
      data: {
        application_id: applicationId,
        status: 'PENDING',
        message: '파트너 신청이 접수되었습니다. 심사 후 결과를 안내드리겠습니다.'
      },
      timestamp: now_()
    };

  } catch (err) {
    logError_('handlePartnerApply', memberId, err);
    return errorResult(ERROR_CODES.INTERNAL_ERROR, err.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * 파트너 승인 처리 (POST action=partnerApprove, 관리자 전용)
 * - 신청 상태를 APPROVED로 변경
 * - "파트너 상세" 시트에 파트너 등록 (등급=SILVER)
 * - 파트너 코드 자동 발급: 'PC_' + 연도월 + 순번
 * - 신청자에게 승인 안내 이메일 발송
 *
 * 필수 파라미터: application_id (또는 member_id)
 * 선택 파라미터: reviewer_note
 *
 * @param {Object} data - POST 본문 데이터
 * @return {Object} 승인 결과
 */
function handlePartnerApprove(data) {
  var applicationId = (data.application_id || '').trim();
  var memberId = (data.member_id || '').trim();
  var reviewerNote = (data.reviewer_note || '').trim();

  if (!applicationId && !memberId) {
    return errorResult(ERROR_CODES.MISSING_PARAMS, 'application_id 또는 member_id가 필요합니다.');
  }

  // LockService -- 동시 쓰기 방지
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return errorResult(ERROR_CODES.LOCK_TIMEOUT);
  }

  try {
    // 신청 정보 조회
    var application = null;
    if (applicationId) {
      application = findPartnerApplicationById_(applicationId);
    } else {
      application = findPartnerApplicationByMemberId_(memberId);
    }

    if (!application) {
      return errorResult(ERROR_CODES.MISSING_PARAMS, '해당 파트너 신청을 찾을 수 없습니다.');
    }

    if (application.status === 'APPROVED') {
      return {
        success: true,
        data: { message: '이미 승인된 신청입니다.', application_id: application.application_id },
        timestamp: now_()
      };
    }

    // 이미 파트너인지 재확인
    var existingPartner = findPartnerByMemberId_(application.member_id);
    if (existingPartner) {
      return {
        success: true,
        data: {
          message: '이미 파트너로 등록되어 있습니다.',
          partner_code: existingPartner.partner_code
        },
        timestamp: now_()
      };
    }

    // 파트너 코드 생성: PC_YYYYMM_NNN
    var partnerCode = generatePartnerCode_();
    var nowStr = now_();

    // "파트너 상세" 시트에 등록
    var partnerSheet = getSheet_('파트너 상세');
    if (!partnerSheet) {
      return errorResult(ERROR_CODES.INTERNAL_ERROR, '"파트너 상세" 시트를 찾을 수 없습니다.');
    }

    var grade = 'SILVER';
    var rateConfig = COMMISSION_RATES[grade];

    partnerSheet.appendRow([
      partnerCode,                                  // partner_code
      application.member_id,                        // member_id
      application.workshop_name || application.applicant_name, // partner_name (공방명 우선, 없으면 본명)
      grade,                                        // grade
      application.email,                            // email
      application.phone || '',                      // phone
      application.location || '',                   // location
      rateConfig.commissionRate,                    // commission_rate
      rateConfig.reserveRate,                       // reserve_rate
      0,                                            // class_count
      0,                                            // avg_rating
      'FALSE',                                      // education_completed
      application.portfolio_url || '',              // portfolio_url
      application.instagram_url || '',              // instagram_url
      '',                                           // partner_map_id
      nowStr,                                       // approved_date
      'active',                                     // status
      reviewerNote || '신규 파트너 승인'             // notes
    ]);

    // 신청 상태 업데이트 (PENDING -> APPROVED)
    updatePartnerApplicationStatus_(application.application_id, 'APPROVED', reviewerNote);

    SpreadsheetApp.flush();

    Logger.log('[파트너 승인] partner_code=' + partnerCode + ', member_id=' + application.member_id);

    // 승인 안내 이메일 발송
    var partnerName = escapeHtml_(application.workshop_name || application.applicant_name);
    var approvalSubject = '[PRESSCO21] 파트너 승인 완료 - ' + (application.workshop_name || application.applicant_name) + '님 환영합니다!';

    var approvalBody = '<div style="font-family: \'Noto Sans KR\', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">'
      + '<div style="text-align: center; padding: 16px 0;">'
      + '<span style="font-size: 24px; color: #b89b5e; font-weight: bold;">PRESSCO21</span>'
      + '</div>'
      + '<h2 style="color: #2d2d2d; border-bottom: 2px solid #b89b5e; padding-bottom: 12px;">'
      + '파트너 승인이 완료되었습니다!</h2>'
      + '<p style="color: #555; line-height: 1.8;">'
      + partnerName + '님, PRESSCO21 파트너 클래스 플랫폼에 오신 것을 환영합니다.</p>'
      + '<p style="color: #555; line-height: 1.8;">'
      + '30년 전통의 압화/보존화 전문 PRESSCO21과 함께 아름다운 클래스를 만들어 가요.</p>'
      + '<table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #eee;">'
      + '<tr style="background: #f8f5f0;"><td style="padding: 12px; font-weight: bold; width: 120px;">파트너 코드</td>'
      + '<td style="padding: 12px;"><strong>' + escapeHtml_(partnerCode) + '</strong></td></tr>'
      + '<tr><td style="padding: 12px; font-weight: bold;">파트너 등급</td>'
      + '<td style="padding: 12px;">' + escapeHtml_(grade) + ' (수수료율 ' + Math.round(rateConfig.commissionRate * 100) + '%)</td></tr>'
      + '<tr style="background: #f8f5f0;"><td style="padding: 12px; font-weight: bold;">승인일</td>'
      + '<td style="padding: 12px;">' + escapeHtml_(nowStr) + '</td></tr>'
      + '</table>'
      + '<div style="background: #f8f5f0; padding: 16px; border-radius: 4px; margin: 16px 0;">'
      + '<p style="margin: 0 0 8px 0; font-weight: bold; color: #2d2d2d;">시작 가이드</p>'
      + '<ol style="margin: 0; padding-left: 20px; color: #666; font-size: 14px; line-height: 2;">'
      + '<li>파트너 대시보드에 접속하여 프로필을 완성해 주세요.</li>'
      + '<li>클래스 등록 요청을 관리자에게 보내 주세요.</li>'
      + '<li>클래스가 등록되면 자동으로 판매가 시작됩니다.</li>'
      + '<li>수수료는 수강 완료 후 적립금으로 지급됩니다.</li>'
      + '</ol></div>'
      + '<div style="background: #fff8e8; border-left: 4px solid #b89b5e; padding: 12px 16px; margin: 16px 0;">'
      + '<p style="margin: 0; color: #555; font-size: 14px;">'
      + '<strong>등급 안내:</strong> 수업 실적과 평점에 따라 GOLD, PLATINUM으로 자동 승급됩니다.<br>'
      + 'GOLD: 10건+ / 4.0+  |  PLATINUM: 50건+ / 4.5+</p>'
      + '</div>'
      + '<p style="color: #888; font-size: 13px; margin-top: 24px;">'
      + '* 문의: foreverloveflower@naver.com</p>'
      + '</div>';

    sendEmailWithTracking_(application.email, approvalSubject, approvalBody, 'PARTNER_APPROVAL');

    return {
      success: true,
      data: {
        partner_code: partnerCode,
        member_id: application.member_id,
        grade: grade,
        commission_rate: rateConfig.commissionRate,
        reserve_rate: rateConfig.reserveRate,
        message: '파트너 승인이 완료되었습니다.'
      },
      timestamp: now_()
    };

  } catch (err) {
    logError_('handlePartnerApprove', applicationId || memberId, err);
    return errorResult(ERROR_CODES.INTERNAL_ERROR, err.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * 파트너 신청 상태 조회 (GET action=getPartnerApplicationStatus)
 * - 파라미터: member_id
 *
 * @param {Object} params - URL 파라미터
 * @return {Object} 신청 상태 응답
 */
function handleGetPartnerApplicationStatus(params) {
  var memberId = (params.member_id || '').trim();
  if (!memberId) {
    return errorResult(ERROR_CODES.NOT_LOGGED_IN);
  }

  // 이미 파트너인지 확인
  var partner = findPartnerByMemberId_(memberId);
  if (partner) {
    return {
      success: true,
      data: {
        is_partner: true,
        partner_code: partner.partner_code,
        grade: partner.grade,
        status: partner.status
      },
      timestamp: now_()
    };
  }

  // 신청 정보 조회
  var application = findPartnerApplicationByMemberId_(memberId);
  if (!application) {
    return {
      success: true,
      data: {
        is_partner: false,
        has_application: false,
        message: '파트너 신청 이력이 없습니다.'
      },
      timestamp: now_()
    };
  }

  return {
    success: true,
    data: {
      is_partner: false,
      has_application: true,
      application_id: application.application_id,
      status: application.status,
      applied_date: application.applied_date,
      message: application.status === 'PENDING'
        ? '신청이 심사 중입니다.'
        : application.status === 'APPROVED'
          ? '신청이 승인되었습니다.'
          : '신청이 반려되었습니다.'
    },
    timestamp: now_()
  };
}


// =============================================
// Task 223: 파트너 코드 생성 / 신청 조회 헬퍼
// =============================================

/**
 * 파트너 코드 자동 생성: PC_YYYYMM_NNN
 * - "파트너 상세" 시트에서 현재 월의 최대 순번 조회 후 +1
 *
 * @return {string} 파트너 코드 (예: PC_202602_001)
 */
function generatePartnerCode_() {
  var currentMonth = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMM');
  var prefix = 'PC_' + currentMonth + '_';

  var sheet = getSheet_('파트너 상세');
  if (!sheet) return prefix + '001';

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var codeIdx = headers.indexOf('partner_code');
  var maxNum = 0;

  for (var i = 1; i < data.length; i++) {
    var code = String(data[i][codeIdx] || '').trim();
    if (code.indexOf(prefix) === 0) {
      var numStr = code.substring(prefix.length);
      var num = parseInt(numStr, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  return prefix + padNumber_(maxNum + 1, 3);
}

/**
 * member_id로 파트너 신청 조회 (가장 최근 신청)
 *
 * @param {string} memberId - 메이크샵 회원 ID
 * @return {Object|null} 신청 데이터
 */
function findPartnerApplicationByMemberId_(memberId) {
  var sheet = getSheet_('파트너 신청');
  if (!sheet) return null;

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var memberIdIdx = headers.indexOf('member_id');
  var latestApp = null;

  // 가장 최근 신청을 반환 (마지막 행이 최신)
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][memberIdIdx]).trim() === memberId) {
      latestApp = rowToObject_(headers, data[i]);
      break;
    }
  }

  return latestApp;
}

/**
 * application_id로 파트너 신청 조회
 *
 * @param {string} applicationId - 신청 ID
 * @return {Object|null} 신청 데이터
 */
function findPartnerApplicationById_(applicationId) {
  var sheet = getSheet_('파트너 신청');
  if (!sheet) return null;

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIdx = headers.indexOf('application_id');

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]).trim() === applicationId) {
      return rowToObject_(headers, data[i]);
    }
  }

  return null;
}

/**
 * 파트너 신청 상태 업데이트
 *
 * @param {string} applicationId - 신청 ID
 * @param {string} newStatus - 새 상태 (PENDING/APPROVED/REJECTED)
 * @param {string} reviewerNote - 심사자 메모
 */
function updatePartnerApplicationStatus_(applicationId, newStatus, reviewerNote) {
  var sheet = getSheet_('파트너 신청');
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIdx = headers.indexOf('application_id');
  var statusIdx = headers.indexOf('status');
  var reviewedDateIdx = headers.indexOf('reviewed_date');
  var reviewerNoteIdx = headers.indexOf('reviewer_note');

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]).trim() === applicationId) {
      var rowNum = i + 1;
      if (statusIdx !== -1) sheet.getRange(rowNum, statusIdx + 1).setValue(newStatus);
      if (reviewedDateIdx !== -1) sheet.getRange(rowNum, reviewedDateIdx + 1).setValue(now_());
      if (reviewerNoteIdx !== -1 && reviewerNote) {
        sheet.getRange(rowNum, reviewerNoteIdx + 1).setValue(reviewerNote);
      }
      break;
    }
  }
}


// =============================================
// Task 223: 파트너 등급 자동 업데이트 (시간 트리거)
// =============================================

/**
 * 파트너 등급 자동 업데이트 (매일 오전 6시 실행 권장)
 * - 파트너별 완료 건수 + 평균 평점 기반으로 등급 자동 승급
 * - 강등은 없음 (한 번 승급하면 유지)
 *
 * 등급 조건:
 * - SILVER: 기본 (신규 파트너)
 * - GOLD: 완료 10건 이상 + 평균 평점 4.0 이상
 * - PLATINUM: 완료 50건 이상 + 평균 평점 4.5 이상
 *
 * 트리거 설정: GAS 편집기 > 트리거 > 함수: triggerUpdatePartnerGrades > 시간 기반 > 매일 > 오전 6시~7시
 */
function triggerUpdatePartnerGrades() {
  Logger.log('[트리거] 파트너 등급 업데이트 시작');

  var lock = LockService.getScriptLock();
  var hasLock = lock.tryLock(0);
  if (!hasLock) {
    Logger.log('[등급 업데이트 스킵] Lock 획득 실패');
    return;
  }

  try {
    var partnerSheet = getSheet_('파트너 상세');
    if (!partnerSheet) {
      Logger.log('[등급 업데이트] "파트너 상세" 시트를 찾을 수 없습니다.');
      return;
    }

    var partnerData = partnerSheet.getDataRange().getValues();
    var partnerHeaders = partnerData[0];
    var pCodeIdx = partnerHeaders.indexOf('partner_code');
    var pGradeIdx = partnerHeaders.indexOf('grade');
    var pStatusIdx = partnerHeaders.indexOf('status');
    var pClassCountIdx = partnerHeaders.indexOf('class_count');
    var pAvgRatingIdx = partnerHeaders.indexOf('avg_rating');
    var pCommRateIdx = partnerHeaders.indexOf('commission_rate');
    var pReserveRateIdx = partnerHeaders.indexOf('reserve_rate');

    // 정산 내역에서 파트너별 COMPLETED 건수 집계
    var settlementSheet = getSheet_('정산 내역');
    if (!settlementSheet) return;

    var settlementData = settlementSheet.getDataRange().getValues();
    var settlementHeaders = settlementData[0];
    var sPartnerCodeIdx = settlementHeaders.indexOf('partner_code');
    var sStatusIdx = settlementHeaders.indexOf('status');

    // 파트너별 완료 건수 계산
    var partnerCompletedCounts = {};
    for (var s = 1; s < settlementData.length; s++) {
      var sPartnerCode = String(settlementData[s][sPartnerCodeIdx] || '').trim();
      var sStatus = String(settlementData[s][sStatusIdx] || '').trim();

      if (sStatus === 'COMPLETED' && sPartnerCode) {
        if (!partnerCompletedCounts[sPartnerCode]) {
          partnerCompletedCounts[sPartnerCode] = 0;
        }
        partnerCompletedCounts[sPartnerCode]++;
      }
    }

    var upgradedPartners = [];
    var cellUpdates = [];

    for (var p = 1; p < partnerData.length; p++) {
      var partnerCode = String(partnerData[p][pCodeIdx] || '').trim();
      var currentGrade = String(partnerData[p][pGradeIdx] || '').trim().toUpperCase();
      var status = String(partnerData[p][pStatusIdx] || '').trim();

      if (!partnerCode || status !== 'active') continue;

      var completedCount = partnerCompletedCounts[partnerCode] || 0;
      var avgRating = Number(partnerData[p][pAvgRatingIdx]) || 0;
      var rowNum = p + 1;

      // class_count 시트 값 업데이트 (항상 최신화)
      if (pClassCountIdx !== -1) {
        cellUpdates.push({ row: rowNum, col: pClassCountIdx + 1, value: completedCount });
      }

      // 등급 판정 (강등 없음: 현재 등급보다 높은 등급만 적용)
      var newGrade = currentGrade;

      if (completedCount >= 50 && avgRating >= 4.5) {
        newGrade = 'PLATINUM';
      } else if (completedCount >= 10 && avgRating >= 4.0) {
        newGrade = 'GOLD';
      }

      // 등급 순서: SILVER < GOLD < PLATINUM
      var gradeOrder = { 'SILVER': 1, 'GOLD': 2, 'PLATINUM': 3 };
      var currentOrder = gradeOrder[currentGrade] || 1;
      var newOrder = gradeOrder[newGrade] || 1;

      if (newOrder > currentOrder) {
        // 승급!
        var rateConfig = COMMISSION_RATES[newGrade];

        cellUpdates.push({ row: rowNum, col: pGradeIdx + 1, value: newGrade });
        if (pCommRateIdx !== -1) cellUpdates.push({ row: rowNum, col: pCommRateIdx + 1, value: rateConfig.commissionRate });
        if (pReserveRateIdx !== -1) cellUpdates.push({ row: rowNum, col: pReserveRateIdx + 1, value: rateConfig.reserveRate });

        upgradedPartners.push({
          partner_code: partnerCode,
          old_grade: currentGrade,
          new_grade: newGrade,
          completed_count: completedCount,
          avg_rating: avgRating
        });

        Logger.log('[등급 승급] ' + partnerCode + ': ' + currentGrade + ' -> ' + newGrade
          + ' (완료 ' + completedCount + '건, 평점 ' + avgRating + ')');

        // 파트너에게 승급 축하 이메일
        var partner = rowToObject_(partnerHeaders, partnerData[p]);
        if (partner.email) {
          sendGradeUpgradeEmail_(partner, currentGrade, newGrade, completedCount, avgRating);
        }
      }
    }

    // 셀 업데이트 일괄 적용
    for (var u = 0; u < cellUpdates.length; u++) {
      partnerSheet.getRange(cellUpdates[u].row, cellUpdates[u].col).setValue(cellUpdates[u].value);
    }

    SpreadsheetApp.flush();

    // 승급이 있으면 관리자 알림
    if (upgradedPartners.length > 0) {
      var alertBody = '파트너 등급 자동 업데이트 결과 (' + formatDateOnly_(new Date()) + ')\n\n'
        + '승급: ' + upgradedPartners.length + '건\n\n';

      for (var g = 0; g < upgradedPartners.length; g++) {
        var up = upgradedPartners[g];
        alertBody += '- ' + up.partner_code + ': ' + up.old_grade + ' -> ' + up.new_grade
          + ' (완료 ' + up.completed_count + '건, 평점 ' + up.avg_rating + ')\n';
      }

      sendAdminAlert_('[PRESSCO21] 파트너 등급 승급 알림', alertBody);
    }

    Logger.log('[트리거] 파트너 등급 업데이트 완료, 승급=' + upgradedPartners.length + '건');

  } catch (err) {
    logError_('triggerUpdatePartnerGrades', '', err);
  } finally {
    lock.releaseLock();
  }
}

/**
 * 파트너 등급 승급 축하 이메일 발송
 *
 * @param {Object} partner - 파트너 데이터
 * @param {string} oldGrade - 이전 등급
 * @param {string} newGrade - 새 등급
 * @param {number} completedCount - 완료 건수
 * @param {number} avgRating - 평균 평점
 */
function sendGradeUpgradeEmail_(partner, oldGrade, newGrade, completedCount, avgRating) {
  var partnerName = escapeHtml_(partner.partner_name || '');
  var rateConfig = COMMISSION_RATES[newGrade];
  var commissionPercent = Math.round(rateConfig.commissionRate * 100);

  var subject = '[PRESSCO21] 축하합니다! ' + newGrade + ' 등급으로 승급되었습니다';

  var body = '<div style="font-family: \'Noto Sans KR\', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">'
    + '<div style="text-align: center; padding: 16px 0;">'
    + '<span style="font-size: 24px; color: #b89b5e; font-weight: bold;">PRESSCO21</span>'
    + '</div>'
    + '<h2 style="color: #2d2d2d; border-bottom: 2px solid #b89b5e; padding-bottom: 12px;">'
    + '등급 승급을 축하합니다!</h2>'
    + '<p style="color: #555; line-height: 1.8;">'
    + partnerName + '님, 그동안의 노력에 감사드립니다.</p>'
    + '<p style="color: #555; line-height: 1.8;">'
    + '파트너 등급이 <strong style="color: #b89b5e;">' + escapeHtml_(newGrade) + '</strong>으로 승급되었습니다!</p>'
    + '<table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #eee;">'
    + '<tr style="background: #f8f5f0;"><td style="padding: 12px; font-weight: bold; width: 120px;">이전 등급</td>'
    + '<td style="padding: 12px;">' + escapeHtml_(oldGrade) + '</td></tr>'
    + '<tr><td style="padding: 12px; font-weight: bold;">새 등급</td>'
    + '<td style="padding: 12px;"><strong style="color: #b89b5e;">' + escapeHtml_(newGrade) + '</strong></td></tr>'
    + '<tr style="background: #f8f5f0;"><td style="padding: 12px; font-weight: bold;">수수료율</td>'
    + '<td style="padding: 12px;">' + commissionPercent + '%</td></tr>'
    + '<tr><td style="padding: 12px; font-weight: bold;">누적 수업</td>'
    + '<td style="padding: 12px;">' + completedCount + '건</td></tr>'
    + '<tr style="background: #f8f5f0;"><td style="padding: 12px; font-weight: bold;">평균 평점</td>'
    + '<td style="padding: 12px;">' + avgRating.toFixed(1) + '점</td></tr>'
    + '</table>'
    + '<p style="color: #555; line-height: 1.8;">'
    + '새 등급의 수수료율(' + commissionPercent + '%)이 즉시 적용됩니다.</p>'
    + '<p style="color: #888; font-size: 13px; margin-top: 24px;">'
    + '* 앞으로도 좋은 클래스 부탁드립니다!</p>'
    + '</div>';

  sendEmailWithTracking_(partner.email, subject, body, 'GRADE_UPGRADE');
}


// =============================================
// Task 221: 기존 정산 시트에 student 컬럼 마이그레이션
// 최초 1회 실행: 기존 정산 내역 시트에 student_name, student_email, student_phone 헤더 추가
// =============================================

/**
 * 기존 정산 내역 시트에 student 컬럼 헤더 추가 (마이그레이션)
 * 이미 해당 컬럼이 있으면 스킵합니다.
 *
 * 실행 방법: GAS 편집기에서 직접 실행
 */
function migrateSettlementHeaders() {
  var sheet = getSheet_('정산 내역');
  if (!sheet) {
    Logger.log('[마이그레이션] "정산 내역" 시트를 찾을 수 없습니다.');
    return;
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  var columnsToAdd = ['student_name', 'student_email', 'student_phone'];
  var addedColumns = [];

  for (var i = 0; i < columnsToAdd.length; i++) {
    if (headers.indexOf(columnsToAdd[i]) === -1) {
      var nextCol = headers.length + addedColumns.length + 1;
      sheet.getRange(1, nextCol).setValue(columnsToAdd[i]);
      sheet.getRange(1, nextCol).setFontWeight('bold');
      sheet.getRange(1, nextCol).setBackground('#f0f0f0');
      addedColumns.push(columnsToAdd[i]);
    }
  }

  if (addedColumns.length > 0) {
    SpreadsheetApp.flush();
    Logger.log('[마이그레이션 완료] 추가된 컬럼: ' + addedColumns.join(', '));
  } else {
    Logger.log('[마이그레이션] 이미 모든 컬럼이 존재합니다.');
  }
}
