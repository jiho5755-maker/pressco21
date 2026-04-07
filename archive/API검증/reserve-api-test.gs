/*
 * =============================================
 * 메이크샵 적립금 API 검증 스크립트
 * Task 150: Phase 1.5 API 검증
 * =============================================
 *
 * 목적:
 * - process_reserve API로 적립금 지급/차감/조회 가능 여부 검증
 * - API 응답 구조, 에러 코드, 제한사항 문서화
 * - 불가 시 대안(쿠폰 API, 반자동) 검토 근거 확보
 *
 * 사전 준비:
 * 1. 메이크샵 관리자 > 쇼핑몰구축 > 오픈 API에서 적립금 처리 권한 허용
 * 2. 스크립트 속성(프로젝트 설정 > 스크립트 속성)에 다음 값 설정:
 *    - MAKESHOP_SHOPKEY: 상점키
 *    - MAKESHOP_LICENSEKEY: 라이센스키
 *    - MAKESHOP_DOMAIN: 상점 도메인 (예: foreverlove.co.kr)
 *    - TEST_MEMBER_ID: 테스트 회원 아이디
 * 3. 테스트 결과를 기록할 Google Sheets 준비 (이 GAS가 바인딩된 시트)
 *
 * API 스펙 (공식 문서 기반):
 *
 * [적립금 지급]
 * POST http://{도메인}/list/open_api_process.html
 * ?mode=save&type=reserve&process=give
 * Headers: Shopkey, Licensekey
 * Body: datas[0][id]=회원ID&datas[0][reserve]=금액&datas[0][content]=사유
 * - reserve에 음수 입력 시 차감
 *
 * [회원 적립금 조회]
 * GET http://{도메인}/list/open_api.html
 * ?mode=search&type=user_reserve&userid=회원ID
 * Headers: Shopkey, Licensekey
 *
 * [스마트 적립금 지급]
 * POST http://{도메인}/list/open_api_process.html
 * ?mode=save&type=smart_reserve&process=give
 * Body: datas[0][userid]=회원ID&datas[0][reserve_code]=코드&datas[0][reserve]=금액
 *
 * =============================================
 */

// ===== 설정 =====
var props = PropertiesService.getScriptProperties();
var SHOPKEY = props.getProperty('MAKESHOP_SHOPKEY');
var LICENSEKEY = props.getProperty('MAKESHOP_LICENSEKEY');
var DOMAIN = props.getProperty('MAKESHOP_DOMAIN');
var TEST_MEMBER_ID = props.getProperty('TEST_MEMBER_ID');

// ===== 결과 시트 이름 =====
var RESULT_SHEET_NAME = '테스트결과';

// =============================================
// 1. 기본 적립금 지급 API 호출
// =============================================

/**
 * 적립금 지급 API 호출
 * @param {string} memberId - 회원 아이디
 * @param {number} amount - 적립금 (음수 = 차감)
 * @param {string} reason - 지급/차감 사유
 * @return {Object} API 응답 객체
 */
function grantReserve(memberId, amount, reason) {
  var url = 'https://' + DOMAIN + '/list/open_api_process.html'
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

  Logger.log('[적립금 지급] 요청: memberId=' + memberId + ', amount=' + amount + ', reason=' + reason);
  Logger.log('[적립금 지급] URL: ' + url);

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    var body = response.getContentText();

    Logger.log('[적립금 지급] HTTP ' + code + ': ' + body);

    if (code === 200) {
      return JSON.parse(body);
    } else {
      return { return_code: 'HTTP_' + code, error: body };
    }
  } catch (e) {
    Logger.log('[적립금 지급] 오류: ' + e.toString());
    return { return_code: 'EXCEPTION', error: e.toString() };
  }
}

// =============================================
// 2. 회원 적립금 조회 API 호출
// =============================================

/**
 * 회원 적립금 내역 조회
 * @param {string} memberId - 회원 아이디
 * @return {Object} API 응답 객체
 */
function queryReserve(memberId) {
  var url = 'https://' + DOMAIN + '/list/open_api.html'
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

  Logger.log('[적립금 조회] 요청: memberId=' + memberId);

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    var body = response.getContentText();

    Logger.log('[적립금 조회] HTTP ' + code + ': ' + body);

    if (code === 200) {
      return JSON.parse(body);
    } else {
      return { return_code: 'HTTP_' + code, error: body };
    }
  } catch (e) {
    Logger.log('[적립금 조회] 오류: ' + e.toString());
    return { return_code: 'EXCEPTION', error: e.toString() };
  }
}

// =============================================
// 3. 스마트 적립금 항목 조회
// =============================================

/**
 * 스마트 적립금 항목 목록 조회
 * @return {Object} API 응답 객체
 */
function querySmartReserveItems() {
  var url = 'https://' + DOMAIN + '/list/open_api.html'
    + '?mode=search&type=smart_reserve';

  var options = {
    method: 'get',
    headers: {
      'Shopkey': SHOPKEY,
      'Licensekey': LICENSEKEY
    },
    muteHttpExceptions: true
  };

  Logger.log('[스마트 적립금 항목 조회] 요청');

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    var body = response.getContentText();

    Logger.log('[스마트 적립금 항목 조회] HTTP ' + code + ': ' + body);

    if (code === 200) {
      return JSON.parse(body);
    } else {
      return { return_code: 'HTTP_' + code, error: body };
    }
  } catch (e) {
    Logger.log('[스마트 적립금 항목 조회] 오류: ' + e.toString());
    return { return_code: 'EXCEPTION', error: e.toString() };
  }
}

// =============================================
// 4. 스마트 적립금 지급
// =============================================

/**
 * 스마트 적립금 지급 API 호출
 * @param {string} memberId - 회원 아이디
 * @param {string} reserveCode - 스마트 적립금 항목 코드
 * @param {number} amount - 적립금 (음수 = 차감)
 * @param {string} reason - 사유
 * @return {Object} API 응답 객체
 */
function grantSmartReserve(memberId, reserveCode, amount, reason) {
  var url = 'https://' + DOMAIN + '/list/open_api_process.html'
    + '?mode=save&type=smart_reserve&process=give';

  var payload = 'datas[0][userid]=' + encodeURIComponent(memberId)
    + '&datas[0][reserve_code]=' + encodeURIComponent(reserveCode)
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

  Logger.log('[스마트 적립금 지급] 요청: memberId=' + memberId + ', code=' + reserveCode + ', amount=' + amount);

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    var body = response.getContentText();

    Logger.log('[스마트 적립금 지급] HTTP ' + code + ': ' + body);

    if (code === 200) {
      return JSON.parse(body);
    } else {
      return { return_code: 'HTTP_' + code, error: body };
    }
  } catch (e) {
    Logger.log('[스마트 적립금 지급] 오류: ' + e.toString());
    return { return_code: 'EXCEPTION', error: e.toString() };
  }
}

// =============================================
// 5. 테스트 실행 함수들
// =============================================

/**
 * 전체 테스트 실행 (메인 함수)
 * GAS 편집기에서 이 함수를 실행하면 전체 테스트가 순차 진행됨
 */
function runAllTests() {
  Logger.log('========================================');
  Logger.log('메이크샵 적립금 API 검증 시작');
  Logger.log('테스트 대상 회원: ' + TEST_MEMBER_ID);
  Logger.log('상점 도메인: ' + DOMAIN);
  Logger.log('========================================');

  // 결과 시트 초기화
  initResultSheet();

  // 설정 검증
  if (!SHOPKEY || !LICENSEKEY || !DOMAIN || !TEST_MEMBER_ID) {
    logResult('설정 검증', 'FAIL', '스크립트 속성 누락. MAKESHOP_SHOPKEY, MAKESHOP_LICENSEKEY, MAKESHOP_DOMAIN, TEST_MEMBER_ID 확인 필요.');
    Logger.log('[오류] 스크립트 속성이 설정되지 않았습니다.');
    return;
  }
  logResult('설정 검증', 'PASS', 'Shopkey, Licensekey, Domain, TestMemberID 모두 설정됨');

  // 테스트 1: 적립금 지급 (+100원)
  testReserveGrant();

  // 잠시 대기 (API 반영 시간)
  Utilities.sleep(2000);

  // 테스트 2: 적립금 조회
  testReserveQuery();

  // 테스트 3: 적립금 차감 (-100원)
  testReserveDeduct();

  // 잠시 대기
  Utilities.sleep(2000);

  // 테스트 4: 차감 후 조회 확인
  testReserveQueryAfterDeduct();

  // 테스트 5: 에러 케이스 - 비존재 회원
  testReserveErrorNonExistentMember();

  // 테스트 6: 에러 케이스 - 비숫자 금액
  testReserveErrorInvalidAmount();

  // 테스트 7: 스마트 적립금 항목 조회
  testSmartReserveItemQuery();

  // 테스트 8: 스마트 적립금 지급 (항목 존재 시)
  testSmartReserveGrant();

  Logger.log('========================================');
  Logger.log('전체 테스트 완료. "테스트결과" 시트를 확인하세요.');
  Logger.log('========================================');
}

/**
 * 테스트 1: 적립금 지급 (+100원)
 */
function testReserveGrant() {
  Logger.log('\n--- 테스트 1: 적립금 지급 (+100원) ---');
  var result = grantReserve(TEST_MEMBER_ID, 100, '[API테스트] Task150 적립금 지급 검증');

  if (result.return_code === '0000' && result.datas && result.datas[0]) {
    var data = result.datas[0];
    if (data.result === true || data.result === 1 || data.result === '1') {
      logResult('적립금 지급 (+100원)', 'PASS',
        'return_code=0000, result=true, id=' + data.id + ', reserve=' + data.reserve);
    } else {
      logResult('적립금 지급 (+100원)', 'FAIL',
        'result=false, message=' + JSON.stringify(data.message));
    }
  } else {
    logResult('적립금 지급 (+100원)', 'FAIL',
      'return_code=' + result.return_code + ', error=' + JSON.stringify(result));
  }
}

/**
 * 테스트 2: 적립금 조회
 */
function testReserveQuery() {
  Logger.log('\n--- 테스트 2: 적립금 조회 ---');
  var result = queryReserve(TEST_MEMBER_ID);

  if (result.return_code === '0000') {
    logResult('적립금 조회', 'PASS',
      'return_code=0000, totalCount=' + result.totalCount
      + ', count=' + result.count
      + ', 최근내역=' + (result.list && result.list[0] ? JSON.stringify(result.list[0]) : '없음'));
  } else {
    logResult('적립금 조회', 'FAIL',
      'return_code=' + result.return_code + ', error=' + JSON.stringify(result));
  }
}

/**
 * 테스트 3: 적립금 차감 (-100원)
 */
function testReserveDeduct() {
  Logger.log('\n--- 테스트 3: 적립금 차감 (-100원) ---');
  var result = grantReserve(TEST_MEMBER_ID, -100, '[API테스트] Task150 적립금 차감 검증');

  if (result.return_code === '0000' && result.datas && result.datas[0]) {
    var data = result.datas[0];
    if (data.result === true || data.result === 1 || data.result === '1') {
      logResult('적립금 차감 (-100원)', 'PASS',
        'return_code=0000, result=true, reserve=' + data.reserve);
    } else {
      logResult('적립금 차감 (-100원)', 'FAIL',
        'result=false, message=' + JSON.stringify(data.message));
    }
  } else {
    logResult('적립금 차감 (-100원)', 'FAIL',
      'return_code=' + result.return_code + ', error=' + JSON.stringify(result));
  }
}

/**
 * 테스트 4: 차감 후 조회 확인
 */
function testReserveQueryAfterDeduct() {
  Logger.log('\n--- 테스트 4: 차감 후 조회 ---');
  var result = queryReserve(TEST_MEMBER_ID);

  if (result.return_code === '0000') {
    // 최근 내역에서 -100 차감 기록 확인
    var hasDeduction = false;
    if (result.list) {
      for (var i = 0; i < result.list.length; i++) {
        if (parseInt(result.list[i].reserve) < 0) {
          hasDeduction = true;
          break;
        }
      }
    }
    logResult('차감 후 조회', hasDeduction ? 'PASS' : 'WARN',
      'return_code=0000, 차감 기록 존재=' + hasDeduction
      + ', 최근내역=' + (result.list && result.list[0] ? JSON.stringify(result.list[0]) : '없음'));
  } else {
    logResult('차감 후 조회', 'FAIL',
      'return_code=' + result.return_code);
  }
}

/**
 * 테스트 5: 비존재 회원 에러
 */
function testReserveErrorNonExistentMember() {
  Logger.log('\n--- 테스트 5: 비존재 회원 에러 ---');
  var result = grantReserve('NONEXISTENT_USER_XYZ_99999', 100, '[API테스트] 비존재 회원 에러 테스트');

  if (result.return_code === '0000' && result.datas && result.datas[0]) {
    var data = result.datas[0];
    if (data.result === false || data.result === '' || data.result === 0) {
      logResult('비존재 회원 에러', 'PASS',
        'result=false (정상 거부), message=' + JSON.stringify(data.message));
    } else {
      logResult('비존재 회원 에러', 'WARN',
        '비존재 회원인데 성공 처리됨! result=' + data.result);
    }
  } else {
    logResult('비존재 회원 에러', 'INFO',
      'return_code=' + result.return_code + ', 응답=' + JSON.stringify(result));
  }
}

/**
 * 테스트 6: 비숫자 금액 에러
 */
function testReserveErrorInvalidAmount() {
  Logger.log('\n--- 테스트 6: 비숫자 금액 에러 ---');
  var result = grantReserve(TEST_MEMBER_ID, 'abc', '[API테스트] 비숫자 금액 에러 테스트');

  if (result.return_code === '0000' && result.datas && result.datas[0]) {
    var data = result.datas[0];
    if (data.result === false || data.result === '' || data.result === 0) {
      logResult('비숫자 금액 에러', 'PASS',
        'result=false (정상 거부), message=' + JSON.stringify(data.message));
    } else {
      logResult('비숫자 금액 에러', 'WARN',
        '비숫자인데 성공 처리됨! result=' + data.result);
    }
  } else {
    logResult('비숫자 금액 에러', 'INFO',
      'return_code=' + result.return_code + ', 응답=' + JSON.stringify(result));
  }
}

/**
 * 테스트 7: 스마트 적립금 항목 조회
 */
function testSmartReserveItemQuery() {
  Logger.log('\n--- 테스트 7: 스마트 적립금 항목 조회 ---');
  var result = querySmartReserveItems();

  if (result.return_code === '0000') {
    var itemCount = result.count || 0;
    var items = result.list || [];
    var itemSummary = items.map(function(item) {
      return item.code + '(' + item.name + ', method=' + item.method + ')';
    }).join(', ');

    logResult('스마트 적립금 항목 조회', 'PASS',
      'return_code=0000, 항목 수=' + itemCount + ', 항목=' + itemSummary);

    // MANUAL 타입 항목이 있는지 확인 (API 지급 가능 항목)
    var manualItems = items.filter(function(item) {
      return item.method === 'MANUAL';
    });
    if (manualItems.length > 0) {
      logResult('스마트 적립금 MANUAL 항목', 'INFO',
        'API 지급 가능한 MANUAL 항목 ' + manualItems.length + '개 발견: '
        + manualItems.map(function(i) { return i.code; }).join(', '));
    } else {
      logResult('스마트 적립금 MANUAL 항목', 'WARN',
        'MANUAL 타입 항목 없음. 스마트 적립금 API 지급 불가. 기본 적립금 API만 사용 가능.');
    }
  } else {
    logResult('스마트 적립금 항목 조회', 'FAIL',
      'return_code=' + result.return_code + ', error=' + JSON.stringify(result));
  }
}

/**
 * 테스트 8: 스마트 적립금 지급
 */
function testSmartReserveGrant() {
  Logger.log('\n--- 테스트 8: 스마트 적립금 지급 ---');

  // 먼저 MANUAL 항목 확인
  var items = querySmartReserveItems();
  if (items.return_code !== '0000' || !items.list) {
    logResult('스마트 적립금 지급', 'SKIP', '항목 조회 실패로 건너뜀');
    return;
  }

  var manualItems = (items.list || []).filter(function(item) {
    return item.method === 'MANUAL';
  });

  if (manualItems.length === 0) {
    // DEFAULT 코드로 시도
    logResult('스마트 적립금 지급', 'SKIP',
      'MANUAL 항목 없음. DEFAULT 코드로 테스트 시도');

    var result = grantSmartReserve(TEST_MEMBER_ID, 'DEFAULT', 100, '[API테스트] 스마트 적립금 테스트');
    logResult('스마트 적립금 지급 (DEFAULT)', result.return_code === '0000' ? 'INFO' : 'FAIL',
      '응답=' + JSON.stringify(result));
    return;
  }

  // 첫 번째 MANUAL 항목으로 테스트
  var testCode = manualItems[0].code;
  Logger.log('MANUAL 항목 코드: ' + testCode + ' 로 테스트');

  // 지급
  var grantResult = grantSmartReserve(TEST_MEMBER_ID, testCode, 100, '[API테스트] 스마트 적립금 지급 검증');
  if (grantResult.return_code === '0000' && grantResult.datas && grantResult.datas[0]) {
    var data = grantResult.datas[0];
    if (data.result === true || data.result === 1 || data.result === '1') {
      logResult('스마트 적립금 지급', 'PASS',
        'code=' + testCode + ', result=true, reserve=' + data.reserve);

      // 차감으로 원복
      Utilities.sleep(1000);
      var deductResult = grantSmartReserve(TEST_MEMBER_ID, testCode, -100, '[API테스트] 스마트 적립금 차감(원복)');
      logResult('스마트 적립금 차감(원복)', 'INFO',
        '응답=' + JSON.stringify(deductResult));
    } else {
      logResult('스마트 적립금 지급', 'FAIL',
        'code=' + testCode + ', result=false, message=' + JSON.stringify(data.message));
    }
  } else {
    logResult('스마트 적립금 지급', 'FAIL',
      'return_code=' + grantResult.return_code + ', error=' + JSON.stringify(grantResult));
  }
}

// =============================================
// 6. 결과 기록 헬퍼
// =============================================

/**
 * 테스트결과 시트 초기화
 */
function initResultSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(RESULT_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(RESULT_SHEET_NAME);
  } else {
    sheet.clear();
  }

  // 헤더 행
  sheet.appendRow([
    '테스트 시간',
    '테스트 항목',
    '결과 (PASS/FAIL/WARN/INFO/SKIP)',
    '상세 내용'
  ]);

  // 헤더 스타일
  var headerRange = sheet.getRange(1, 1, 1, 4);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#f0f0f0');

  // 열 너비
  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 600);
}

/**
 * 테스트 결과 한 행 기록
 * @param {string} testName - 테스트 항목명
 * @param {string} status - PASS / FAIL / WARN / INFO / SKIP
 * @param {string} detail - 상세 내용
 */
function logResult(testName, status, detail) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(RESULT_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(RESULT_SHEET_NAME);
    sheet.appendRow(['테스트 시간', '테스트 항목', '결과', '상세 내용']);
  }

  var timestamp = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
  sheet.appendRow([timestamp, testName, status, detail]);

  // 결과에 따라 행 색상 지정
  var lastRow = sheet.getLastRow();
  var rowRange = sheet.getRange(lastRow, 1, 1, 4);

  switch (status) {
    case 'PASS':
      rowRange.setBackground('#d4edda'); // 연초록
      break;
    case 'FAIL':
      rowRange.setBackground('#f8d7da'); // 연빨강
      break;
    case 'WARN':
      rowRange.setBackground('#fff3cd'); // 연노랑
      break;
    case 'SKIP':
      rowRange.setBackground('#e2e3e5'); // 연회색
      break;
    default: // INFO
      rowRange.setBackground('#d1ecf1'); // 연파랑
      break;
  }

  Logger.log('[결과] ' + status + ' | ' + testName + ' | ' + detail);
}

// =============================================
// 7. 개별 테스트 실행용 (디버깅)
// =============================================

/**
 * 적립금 지급만 단독 실행
 */
function testGrantOnly() {
  initResultSheet();
  testReserveGrant();
}

/**
 * 적립금 조회만 단독 실행
 */
function testQueryOnly() {
  initResultSheet();
  testReserveQuery();
}

/**
 * 스마트 적립금 항목 조회만 단독 실행
 */
function testSmartItemsOnly() {
  initResultSheet();
  testSmartReserveItemQuery();
}
