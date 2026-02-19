// ========================================
// 제휴업체 신청 데이터 자동화 스크립트 (최종 버전)
// ========================================
//
// 기능:
// 1. onEdit: P열(심사상태)이 '승인'으로 변경되면 F열(도로명 주소)를 Geocoding하여 Q열(위도), R열(경도) 자동 입력
// 2. doGet: 설문지 응답 시트1의 승인된 데이터를 JSON으로 반환
//
// 사용 방법:
// 1. Google Sheets에서 확장 프로그램 > Apps Script
// 2. 기존 Code.gs 내용을 모두 삭제
// 3. 이 코드 전체를 복사/붙여넣기
// 4. 저장 (Cmd + S)
// 5. 배포 > 새 배포 > 유형: 웹 앱 > 배포

/**
 * P열(심사상태)이 '승인'으로 변경되면 자동으로 Geocoding 수행
 */
function onEdit(e) {
  try {
    if (!e) {
      Logger.log('onEdit: 직접 실행할 수 없습니다.');
      return;
    }

    var sheet = e.source.getActiveSheet();
    var range = e.range;
    var row = range.getRow();
    var col = range.getColumn();

    // P열(16번째 열)이 편집되었는지 확인
    if (col !== 16) return;

    var statusValue = String(sheet.getRange(row, 16).getValue()).trim();
    if (statusValue !== '승인') return;

    // 이미 좌표가 있으면 종료
    var latCell = sheet.getRange(row, 17); // Q열
    var lngCell = sheet.getRange(row, 18); // R열
    if (latCell.getValue() && lngCell.getValue()) {
      Logger.log('이미 좌표가 있음: 행 ' + row);
      return;
    }

    // F열(6번째, 도로명 주소) 읽기
    var address = String(sheet.getRange(row, 6).getValue()).trim();
    if (!address) {
      Logger.log('주소가 없음: 행 ' + row);
      return;
    }

    Logger.log('Geocoding 시작: ' + address);
    var result = geocodeAddress(address);

    if (result && result.lat && result.lng) {
      latCell.setValue(result.lat);
      lngCell.setValue(result.lng);
      Logger.log('✅ 좌표 입력: 행 ' + row + ', lat=' + result.lat + ', lng=' + result.lng);
    } else {
      Logger.log('❌ Geocoding 실패: ' + address);
    }

  } catch (error) {
    Logger.log('onEdit 오류: ' + error);
  }
}

/**
 * Geocoding API 호출
 */
function geocodeAddress(address) {
  try {
    var geocoder = Maps.newGeocoder();
    var response = geocoder.geocode(address);

    if (response.status === 'OK' && response.results.length > 0) {
      var location = response.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    return null;
  } catch (error) {
    Logger.log('Geocoding 오류: ' + error);
    return null;
  }
}

/**
 * 웹 앱 API 엔드포인트
 * "설문지 응답 시트1"의 승인된 데이터를 JSON으로 반환
 */
function doGet(e) {
  try {
    // 간단한 API 토큰 검증 (선택적 보안 강화)
    // 사용법: GAS URL에 ?token=pc21_xxxxx 파라미터 추가
    // 참고: GAS 웹 앱은 HTTP 헤더(Referer 등) 접근 불가하므로 토큰 방식 사용
    var VALID_TOKEN = 'pc21_partner_v3';
    if (e && e.parameter && e.parameter.token) {
      if (e.parameter.token !== VALID_TOKEN) {
        return createErrorResponse('인증 실패: 유효하지 않은 토큰입니다.');
      }
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('설문지 응답 시트1');

    if (!sheet) {
      return createErrorResponse('설문지 응답 시트1을 찾을 수 없습니다.');
    }

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    Logger.log('시트: 설문지 응답 시트1, 행: ' + lastRow + ', 열: ' + lastCol);

    if (lastRow < 2) {
      return createErrorResponse('데이터가 없습니다.');
    }

    // 헤더 읽기
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    Logger.log('헤더: ' + JSON.stringify(headers));

    // 데이터 읽기 (2행부터)
    var dataValues = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    Logger.log('데이터 행 수: ' + dataValues.length);

    var partners = [];
    var skipped = 0;

    // 18개 컬럼 구조:
    // 1. 타임스탬프
    // 2. 업체명
    // 3. 카테고리
    // 4. 대표자 성함
    // 5. 사업자등록번호
    // 6. 도로명 주소
    // 7. 상세 주소
    // 8. 대표 전화번호
    // 9. 담당자 이메일
    // 10. 운영 시간
    // 11. 홈페이지/블로그/인스타
    // 12. 업체 한 줄 소개
    // 13. 업체 대표 이미지
    // 14. 관리자메모
    // 15. 협회
    // 16. 심사상태 (P열)
    // 17. 위도 (Q열)
    // 18. 경도 (R열)

    for (var i = 0; i < dataValues.length; i++) {
      var row = dataValues[i];

      // 심사상태 체크 (P열 = 16번째 = 인덱스 15)
      var status = String(row[15] || '').trim();
      if (status !== '승인') {
        skipped++;
        continue;
      }

      // 위도/경도 읽기 (Q열=17번째=인덱스16, R열=18번째=인덱스17)
      var lat = parseFloat(row[16]) || 0;
      var lng = parseFloat(row[17]) || 0;

      // 좌표 없으면 건너뛰기
      if (!lat || !lng || lat === 0 || lng === 0) {
        skipped++;
        continue;
      }

      // 파트너 객체 생성
      var partner = {
        name: String(row[1] || '').trim(),              // 업체명
        category: String(row[2] || '').trim(),          // 카테고리
        address: String(row[5] || '').trim(),           // 도로명 주소
        detailAddress: String(row[6] || '').trim(),     // 상세 주소
        phone: String(row[7] || '').trim(),             // 대표 전화번호
        email: String(row[8] || '').trim(),             // 담당자 이메일
        hours: String(row[9] || '').trim(),             // 운영 시간
        link: String(row[10] || '').trim(),             // 홈페이지/블로그/인스타
        description: String(row[11] || '').trim(),      // 업체 한 줄 소개
        imageUrl: String(row[12] || '').trim(),         // 업체 대표 이미지
        association: String(row[14] || '').trim(),      // 협회
        lat: lat,
        lng: lng
      };

      partners.push(partner);
    }

    Logger.log('✅ 처리 완료: ' + partners.length + '개 (건너뜀: ' + skipped + '개)');

    var result = {
      success: true,
      partners: partners,
      count: partners.length,
      skipped: skipped,
      timestamp: new Date().toISOString()
    };

    return createSuccessResponse(result);

  } catch (error) {
    Logger.log('❌ doGet 오류: ' + error);
    return createErrorResponse('오류 발생: ' + error.toString());
  }
}

/**
 * 성공 응답
 */
function createSuccessResponse(data) {
  // 캐시 관련 메타 정보 추가
  data.cacheControl = 'max-age=3600';
  data.serverVersion = '3.1';
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * 에러 응답
 */
function createErrorResponse(message) {
  var errorData = {
    success: false,
    error: true,
    message: message,
    timestamp: new Date().toISOString()
  };
  var output = ContentService.createTextOutput(JSON.stringify(errorData));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * 테스트 함수: doGet() 실행
 */
function testDoGet() {
  Logger.log('========================================');
  Logger.log('테스트 시작');
  Logger.log('========================================');

  var result = doGet();
  var content = result.getContent();

  Logger.log('========================================');
  Logger.log('API 응답:');
  Logger.log(content);
  Logger.log('========================================');

  try {
    var parsed = JSON.parse(content);
    Logger.log('✅ 성공: ' + parsed.success);
    Logger.log('🔢 파트너 수: ' + (parsed.count || 0));
    Logger.log('⏭️  건너뜀: ' + (parsed.skipped || 0));

    if (parsed.partners && parsed.partners.length > 0) {
      Logger.log('========================================');
      Logger.log('첫 번째 파트너:');
      Logger.log(JSON.stringify(parsed.partners[0], null, 2));
    }
  } catch (e) {
    Logger.log('❌ JSON 파싱 오류: ' + e);
  }

  Logger.log('========================================');
}

/**
 * 테스트 함수: Geocoding
 */
function testGeocoding() {
  var testAddress = '서울특별시 강남구 테헤란로 152';
  Logger.log('테스트 주소: ' + testAddress);

  var result = geocodeAddress(testAddress);
  if (result) {
    Logger.log('✅ 위도: ' + result.lat);
    Logger.log('✅ 경도: ' + result.lng);
  } else {
    Logger.log('❌ Geocoding 실패');
  }
}
