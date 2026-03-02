# GAS 백엔드 코드 검수 보고서

**대상 파일**: `파트너클래스/class-platform-gas.gs` (2,627줄)
**검수일**: 2026-02-21
**검수자**: Claude Code (makeshop-code-reviewer)
**Task**: 201

---

## 최종 종합 평가: **수정 후 배포**

전반적으로 높은 완성도의 GAS 백엔드 코드입니다. 아키텍처 설계, 에러 처리, 멱등성 보장, 이메일 한도 관리 등 핵심 요소가 잘 구현되어 있습니다. 다만 아래 나열된 Critical 이슈 5건을 반드시 수정한 뒤 배포해야 합니다. Warning 이슈는 운영 안정성을 위해 순차적으로 개선하기를 권장합니다.

---

## 1. 즉시 수정 필요 (Critical) -- 5건

### C-01. 이메일 카운트 증가 함수가 새 날짜에서 아무 것도 하지 않음

- **위치**: `class-platform-gas.gs:1992-2017` (`incrementEmailCount_`)
- **위험도**: 높음
- **문제**: `incrementEmailCount_` 함수에서 오늘 날짜의 행을 찾지 못하면 (새로운 날의 첫 이메일) 아무런 동작 없이 함수가 종료됩니다. 주석에 "오늘 날짜 행이 없으면 첫 발송 기록 행 추가"라고 적혀 있지만, 실제 코드가 없습니다.

```javascript
// 현재 코드 (2011-2017행)
  // 오늘 날짜 행이 없으면 첫 발송 기록 행 추가
  // 주의: 이 행은 카운트 전용 행이 아니라 개별 기록과 혼재됨
  // ... 주석만 있고 코드 없음
}
```

- **영향**: 새 날의 첫 이메일 발송 시 카운트가 0으로 유지되어, `getTodayEmailCount_`가 항상 0을 반환합니다. 결과적으로 일일 한도(100건) 제한이 무력화되며, 경고 임계값(70건) 알림도 발동하지 않습니다.
- **연쇄 문제**: `logEmailRecord_` (2037행)에서 `getTodayEmailCount_(date) + 1`을 호출하는데, 카운트가 제대로 관리되지 않으므로 모든 기록의 `daily_count` 값이 1이 됩니다.

- **해결 방향**: for 루프 이후(2009행 이후)에 오늘 날짜의 첫 카운트 행을 추가하는 코드가 필요합니다. 다만, 현재 시트 구조에서 개별 로그 기록과 카운트 행이 혼재되는 문제가 있으므로, 카운트 추적은 `PropertiesService` 또는 `CacheService`로 분리하는 것이 더 안전합니다.

```javascript
// 해결안 (incrementEmailCount_ 함수 끝부분에 추가)
  // 오늘 날짜 행이 없으면 카운트 1로 새 행 추가
  sheet.appendRow([today, 1, '', '', '', '']);
}
```

---

### C-02. Referer/Origin 검증 누락 -- 무인증 엔드포인트 노출

- **위치**: `class-platform-gas.gs:93-132` (`doGet`), `146-185` (`doPost`)
- **위험도**: 높음
- **문제**: ERROR_CODES에 `REFERER_MISMATCH` (66행)가 정의되어 있지만, 실제로 doGet/doPost 어디에서도 Referer 또는 Origin 검증을 수행하지 않습니다. 특히 다음 엔드포인트가 무인증으로 노출됩니다:
  - `pollOrders` (POST): 누구나 호출 가능하여 주문 폴링 실행 가능
  - `clearCache` (POST): 누구나 캐시를 삭제할 수 있음
  - `recordBooking` (POST): member_id만 알면 가짜 예약 기록 + 적립금 지급 가능

- **GAS 제약 사항**: GAS 웹 앱은 HTTP 요청의 Referer/Origin 헤더에 접근할 수 없습니다. `e.parameter`에 커스텀 헤더가 전달되지 않으며, `e.postData.headers`에도 Referer가 포함되지 않는 GAS 플랫폼 한계가 있습니다.

- **해결 방향**:
  1. **API 시크릿 토큰 방식**: `PropertiesService`에 API_SECRET을 저장하고, 프론트엔드에서 요청 시 `?token=xxx` 파라미터를 포함시킵니다. 서버에서 토큰 일치 여부를 검증합니다.
  2. **관리자 전용 엔드포인트 분리**: `pollOrders`와 `clearCache`는 시간 트리거(`triggerPollOrders`)로만 실행되므로, doPost에서 외부 호출을 차단하거나 별도의 관리자 토큰을 요구합니다.
  3. **recordBooking 인증 강화**: member_id만으로는 부족합니다. 프론트에서 세션 토큰이나 HMAC 서명을 함께 전송하도록 설계하는 것을 권장합니다.

```javascript
// 해결안 예시 (doPost 진입부)
function doPost(e) {
  var action = (e.parameter.action || '').trim();

  // 관리자 전용 액션은 토큰 검증 필수
  var adminActions = ['pollOrders', 'clearCache'];
  if (adminActions.indexOf(action) !== -1) {
    var token = e.parameter.token || '';
    var expectedToken = PROPS.getProperty('ADMIN_API_TOKEN');
    if (token !== expectedToken) {
      return jsonResponse(errorResult(ERROR_CODES.REFERER_MISMATCH));
    }
  }

  // ... 이하 기존 로직
}
```

---

### C-03. 이메일 HTML 본문에 사용자 입력이 이스케이프 없이 삽입됨 (XSS 가능성)

- **위치**: `class-platform-gas.gs:1306-1325` (`sendStudentConfirmationEmail_`), `1348-1366` (`sendPartnerNotificationEmail_`)
- **위험도**: 높음
- **문제**: 이메일 HTML 본문에 `bookingData.student_name`, `classData.class_name`, `bookingData.order_id`, `classData.location` 등의 값이 HTML 이스케이프 없이 직접 삽입됩니다.

```javascript
// 현재 코드 (1308행)
+ '<p style="color: #555;">' + (bookingData.student_name || '고객') + '님, 클래스 예약이 확인되었습니다.</p>'
```

- **공격 시나리오**: 메이크샵 주문 시 구매자 이름에 `<script>alert(1)</script>` 또는 `<img src=x onerror=...>`를 입력하면, 파트너나 수강생에게 발송되는 이메일에 악성 HTML이 삽입됩니다. 대부분의 이메일 클라이언트는 스크립트를 차단하지만, CSS injection이나 피싱 링크 삽입은 여전히 가능합니다.

- **해결 방향**: HTML 이스케이프 유틸리티 함수를 추가하고, 이메일 본문에 삽입되는 모든 동적 값에 적용해야 합니다.

```javascript
// 추가할 유틸리티 함수
function escapeHtml_(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 적용 예시
+ '<p style="color: #555;">' + escapeHtml_(bookingData.student_name || '고객') + '님, ...'
```

---

### C-04. processOrderInternal_ 에서 정산 기록 후 적립금 지급 실패 시 롤백 부재

- **위치**: `class-platform-gas.gs:999-1084` (`processOrderInternal_`)
- **위험도**: 중간
- **문제**: 정산 내역이 PENDING으로 Sheets에 기록된 후(1027-1050행), 적립금 지급(`processReservePayment_`)이 실패하면 정산 상태가 FAILED로 업데이트되고 관리자 알림이 발송됩니다. 이 자체는 올바른 설계이지만, 다음 문제가 있습니다:

  1. **수동 재처리 메커니즘 부재**: FAILED 상태의 정산을 재시도하는 함수가 없습니다. 관리자가 알림을 받아도 GAS에서 재시도할 방법이 없습니다.
  2. **부분 완료 상태 누적**: 적립금은 실패했지만 이메일은 발송된 경우, 수강생은 "수수료가 정산되었습니다" 메시지를 받게 됩니다(747행의 메시지 분기는 있지만, `processOrderInternal_`에서 호출하는 경우에는 이 분기가 없음).

- **해결 방향**: FAILED 정산을 재시도하는 배치 함수를 추가하는 것을 권장합니다.

```javascript
// 추가 권장: FAILED 정산 재시도 배치
function retryFailedSettlements() {
  var sheet = getSheet_('정산 내역');
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var retried = 0;

  for (var i = 1; i < data.length; i++) {
    var row = rowToObject_(headers, data[i]);
    if (row.status !== 'FAILED') continue;

    var partner = findPartnerByCode_(row.partner_code);
    if (!partner) continue;

    var result = processReservePayment_(
      row.settlement_id,
      partner.member_id,
      Number(row.reserve_amount) || 0,
      '[PRESSCO21] 적립금 재시도 - 주문: ' + row.order_id
    );

    if (result.success) retried++;
  }

  Logger.log('[재시도 완료] ' + retried + '건 성공');
}
```

---

### C-05. handlePollOrders 내부에서 processOrderInternal_ 호출 시 Lock 범위 문제

- **위치**: `class-platform-gas.gs:769-873` (`handlePollOrders`), `834-835행`
- **위험도**: 중간
- **문제**: `handlePollOrders`는 `tryLock(0)`으로 Lock을 획득한 후, 루프 내에서 `processOrderInternal_`을 호출합니다. `processOrderInternal_` 내부에서는 별도의 Lock을 획득하지 않습니다(주석에 "Lock은 이미 획득" 명시). 그러나 같은 시점에 외부에서 `recordBooking` (POST)이 호출되면, `recordBooking`은 `waitLock(10000)`으로 10초간 대기합니다.

  문제는 `handlePollOrders`의 처리 시간이 길어질 경우(다수의 주문 처리), `recordBooking` 호출자가 10초 타임아웃을 초과하여 `LOCK_TIMEOUT` 에러를 받게 된다는 점입니다. 주문 폴링은 10분 간격이고 다수의 주문을 순차 처리하므로, 실행 시간이 수십 초에 달할 수 있습니다.

- **해결 방향**:
  1. `handlePollOrders` 내 루프에서 각 주문 처리 전후로 Lock을 해제/재획득하여, 사이에 `recordBooking`이 끼어들 수 있도록 합니다.
  2. 또는 `recordBooking`의 Lock 대기 시간을 30초로 늘립니다.

---

## 2. 개선 권장 (Warning) -- 12건

### W-01. getDataRange().getValues() 반복 호출로 인한 성능 저하

- **위치**: 코드 전반 (19곳)
- **위험도**: 중간
- **문제**: `findClassById_`, `findPartnerByMemberId_`, `findPartnerByCode_`, `isOrderAlreadyProcessed_`, `updateSettlementStatus_` 등 다수의 헬퍼 함수가 매번 시트 전체 데이터를 읽습니다. 단일 주문 처리(`processOrderInternal_`) 과정에서 다음 호출이 발생합니다:
  - `findClassById_`: 1회 (클래스 메타 전체 읽기)
  - `findPartnerByCode_`: 1회 (파트너 상세 전체 읽기)
  - `updateSettlementStatus_`: 최소 2회 (정산 내역 전체 읽기 x 2)
  - `isOrderAlreadyProcessed_`: 1회 (정산 내역 전체 읽기)
  - `getPartnerPublicInfo_` 내 `findPartnerByCode_`: 1회 추가

  주문 폴링에서 N건 처리 시 이 비용이 N배로 증가합니다. GAS의 Sheets API 호출은 느리므로(1회 100-500ms), 10건 처리 시 수십 초가 소요될 수 있습니다.

- **해결 방향**: `handlePollOrders` 시작 시 필요한 시트 데이터를 한 번에 읽어 메모리에 캐싱하고, 헬퍼 함수에 캐시된 데이터를 전달하는 방식으로 개선합니다.

---

### W-02. CacheService TTL 최대값 불일치

- **위치**: `class-platform-gas.gs:46`, `603-606`
- **위험도**: 낮음
- **문제**: 46행에서 `CACHE_TTL_CATEGORIES = 86400` (24시간)으로 선언했지만, 실제 사용처(606행)에서는 `21600` (6시간)을 직접 하드코딩하고 있습니다. 주석에 "CacheService 최대 TTL은 21600초(6시간)"이라고 올바르게 기재되어 있지만, 상수가 사용되지 않으므로 혼란을 유발합니다.

```javascript
// 현재 코드
var CACHE_TTL_CATEGORIES = 86400;  // 카테고리: 24시간 <-- 실제로는 불가능
// ...
cache.put(cacheKey, jsonStr, 21600); // 6시간 (CacheService 최대) <-- 상수 미사용
```

- **해결 방향**: 상수를 실제 가능한 값으로 수정하고 사용처에서 참조합니다.

```javascript
var CACHE_TTL_CATEGORIES = 21600;  // 카테고리: 6시간 (CacheService 최대)
// ...
cache.put(cacheKey, jsonStr, CACHE_TTL_CATEGORIES);
```

---

### W-03. 파트너 인증 캐시 30분 설정이 선언만 되고 사용되지 않음

- **위치**: `class-platform-gas.gs:45`, `419-458`
- **위험도**: 정보
- **문제**: 45행에서 `CACHE_TTL_PARTNER_AUTH = 1800` (30분)이 선언되어 있지만, `handleGetPartnerAuth` (419행)에서는 실제로 캐시를 전혀 사용하지 않습니다. 주석에 "캐시 없음 (보안 민감)"이라고 올바르게 기재되어 있습니다. 이는 보안적으로 올바른 판단이지만, 사용하지 않는 상수가 혼란을 줍니다.

- **해결 방향**: `CACHE_TTL_PARTNER_AUTH` 상수를 제거하거나, 향후 캐시 도입 시 사용할 것이라면 주석으로 "현재 미사용, 향후 검토"라고 명시합니다. 파트너 인증에 캐시를 적용하면 자격 취소 시 30분간 유효한 문제가 발생하므로, 현재의 캐시 미적용이 올바릅니다.

---

### W-04. 캐시 키에 사용자 입력이 직접 포함되어 캐시 오염 가능

- **위치**: `class-platform-gas.gs:211`
- **위험도**: 중간
- **문제**: 클래스 목록 캐시 키가 사용자 입력(category, level 등)을 직접 연결합니다.

```javascript
var cacheKey = 'classes_' + category + '_' + level + '_' + classType + '_' + region + '_' + sort + '_' + page + '_' + limit;
```

  악의적 사용자가 매우 긴 category 값이나 특수문자를 전달하면:
  1. CacheService 키 길이 제한(250바이트)을 초과하여 에러 발생
  2. 수천 개의 고유 캐시 키가 생성되어 캐시 효율 저하

- **해결 방향**: 캐시 키를 해시(MD5)로 변환합니다.

```javascript
var rawKey = 'classes_' + category + '_' + level + '_' + classType + '_' + region + '_' + sort + '_' + page + '_' + limit;
var cacheKey = 'cl_' + Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, rawKey)
  .map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); })
  .join('');
```

---

### W-05. handleClearCache / invalidateClassCache_ 에서 캐시 키 패턴이 실제 키와 불일치

- **위치**: `class-platform-gas.gs:965-975`, `2430-2438`
- **위험도**: 중간
- **문제**: 캐시 삭제 시 `classes____` (언더스코어 4개) 패턴으로 키를 생성하지만, 실제 캐시 저장(211행)에서는 `classes_` + 파라미터 값이 조합됩니다.

```javascript
// 캐시 저장 시 (211행) -- category 등이 빈 문자열이면:
'classes_' + '' + '_' + '' + '_' + '' + '_' + '' + '_' + 'latest' + '_' + '1' + '_' + '20'
// 결과: 'classes____latest_1_20' <-- 맞음 (필터 없을 때)

// 그러나 필터가 있으면:
'classes_플라워_beginner___latest_1_20' <-- 이 키는 삭제되지 않음
```

  필터가 적용된 캐시 키는 삭제 대상에 포함되지 않으므로, 캐시 무효화가 불완전합니다.

- **해결 방향**: CacheService에는 와일드카드 삭제가 없으므로, 다음 중 하나를 선택합니다:
  1. 캐시 키 목록을 별도로 관리 (예: `PropertiesService`에 모든 활성 캐시 키 저장)
  2. 캐시 TTL을 짧게 유지하고(5분), 명시적 삭제는 포기 (현재의 5분이면 실용적으로 충분)
  3. 캐시 키에 버전 번호를 포함하여 갱신 시 버전만 올리는 방식

---

### W-06. 주문 폴링의 GAS 6분 실행 제한 미고려

- **위치**: `class-platform-gas.gs:769-873` (`handlePollOrders`)
- **위험도**: 중간
- **문제**: GAS 웹 앱/트리거의 실행 시간 제한은 6분(360초)입니다. 폴링에서 다수의 주문을 처리할 때, 각 주문마다 `processOrderInternal_`에서 Sheets 읽기/쓰기 + 메이크샵 API 호출 + 이메일 발송이 수행됩니다. 주문 1건당 약 5-10초가 소요된다면, 36건 이상에서 타임아웃이 발생합니다.

- **해결 방향**: 루프 내에서 경과 시간을 체크하고, 5분(300초)에 근접하면 루프를 중단합니다. 나머지 주문은 다음 폴링 주기(10분 후)에서 처리됩니다.

```javascript
// 루프 내 시간 체크 추가
for (var i = 0; i < orders.length; i++) {
  // 5분 경과 시 안전하게 중단
  if (new Date().getTime() - startTime > 300000) {
    Logger.log('[폴링 중단] 5분 경과, 나머지 ' + (orders.length - i) + '건은 다음 폴링에서 처리');
    break;
  }
  // ... 기존 처리 로직
}
```

---

### W-07. 정합성 검증(triggerReconciliation)이 실제 비교를 수행하지 않음

- **위치**: `class-platform-gas.gs:1529-1589` (`triggerReconciliation`)
- **위험도**: 중간
- **문제**: 주석에 "Sheets 정산 잔액 vs 메이크샵 적립금 실잔액 비교"라고 되어 있지만, 실제로는 API 호출 성공/실패만 확인하고 금액 비교는 수행하지 않습니다(1560행 주석: "불일치 감지... 직접 비교 불가 -- 소비분 존재"). `discrepancies`에 추가되는 것은 API 호출 예외뿐입니다.

- **해결 방향**: 현재 구현은 "적립금 API가 응답하는지" 확인하는 수준이므로, 함수명과 주석을 실제 동작에 맞게 수정하거나, 최소한 "COMPLETED인데 API 잔액이 0인 경우" 같은 이상 징후를 감지하는 로직을 추가하는 것을 권장합니다.

---

### W-08. sendReminderIfNeeded_ 에서 수강생 이메일을 발송하지 못함

- **위치**: `class-platform-gas.gs:2117-2174` (`sendReminderIfNeeded_`)
- **위험도**: 중간
- **문제**: 리마인더 함수에서 수강생에게 이메일을 보내야 하지만, 정산 내역 시트에 `student_email` 컬럼이 없어서 실제 발송이 불가능합니다. 현재 코드는 HTML 본문을 생성하지만 `sendEmailWithTracking_`을 호출하는 코드가 없습니다(파트너에게만 발송). 그럼에도 `student_email_sent` 상태는 `D3_SENT`, `D1_SENT`로 업데이트됩니다.

- **해결 방향**:
  1. 정산 내역 시트에 `student_email` 컬럼을 추가합니다 (initSheets의 헤더에도 반영).
  2. `handleRecordBooking`과 `processOrderInternal_`에서 예약 기록 시 이메일을 함께 저장합니다.
  3. 또는 주문 조회 API로 이메일을 획득하는 방식을 구현합니다 (TODO 주석 참조).

---

### W-09. handleGetClasses에서 클래스별 getPartnerPublicInfo_ 호출로 N+1 문제

- **위치**: `class-platform-gas.gs:251`
- **위험도**: 중간
- **문제**: 클래스 목록 조회 시, 각 클래스마다 `getPartnerPublicInfo_`를 호출하고, 이 함수 내부에서 `findPartnerByCode_`가 파트너 상세 시트 전체를 읽습니다. 클래스 50개면 시트 전체 읽기가 50번 발생합니다.

- **해결 방향**: 클래스 목록 처리 전에 파트너 데이터를 한 번에 읽어 맵으로 캐싱합니다.

```javascript
// handleGetClasses 함수 내, 루프 전에:
var partnerMap = getAllPartners_();  // 파트너 전체 데이터를 한 번만 읽기

// 루프 내에서:
var partnerInfo = partnerMap[row.partner_code] || { partner_name: '' };
```

---

### W-10. handleRecordBooking에서 order_id 값 검증 부족

- **위치**: `class-platform-gas.gs:627-760`
- **위험도**: 중간
- **문제**: `requiredFields` 검증(629행)에서 빈 값만 체크하지만, `order_id` 형식을 검증하지 않습니다. 공격자가 매우 긴 문자열이나 특수문자가 포함된 order_id를 전송하면, Sheets에 오염된 데이터가 기록됩니다.

- **해결 방향**: order_id, class_id, member_id 등의 형식을 정규식으로 검증합니다.

```javascript
// 추가할 검증
if (!/^[A-Za-z0-9_-]{1,50}$/.test(data.order_id)) {
  return errorResult(ERROR_CODES.MISSING_PARAMS, 'order_id 형식이 올바르지 않습니다.');
}
```

---

### W-11. 정산 내역 데이터 정합성 -- appendRow vs 셀 단위 업데이트 혼용

- **위치**: 코드 전반
- **위험도**: 낮음
- **문제**: 새 정산 행은 `appendRow`로 추가하고(710행), 상태 업데이트는 셀 단위 `getRange().setValue()`로 수행합니다(1841-1878행). 이 두 방식을 혼용하면:
  1. 다른 트리거가 동시에 `appendRow`를 하면 행 번호가 밀려서 `updateSettlementStatus_`가 잘못된 행을 업데이트할 가능성이 있습니다 (settlement_id로 검색하므로 실제로는 안전하지만, 시트 크기가 커지면 검색 비용 증가).
  2. `SpreadsheetApp.flush()`가 여러 곳에서 호출되어 불필요한 지연이 발생합니다.

- **해결 방향**: 현재의 settlement_id 기반 검색은 정확하므로 즉각적인 문제는 없습니다. 다만, 시트 행 수가 1000건 이상으로 늘어나면 성능 최적화가 필요합니다.

---

### W-12. 관리자 알림 이메일이 한도 카운트에 포함되지 않지만, MailApp과 GmailApp 한도는 별도

- **위치**: `class-platform-gas.gs:1377-1389` (`sendAdminAlert_`)
- **위험도**: 낮음
- **문제**: 관리자 알림은 `MailApp.sendEmail`을 사용하고(1384행), 수강생/파트너 이메일은 `GmailApp.sendEmail`을 사용합니다(1261행). GAS에서 MailApp과 GmailApp은 동일한 일일 한도를 공유합니다. 관리자 알림을 한도에서 제외하면(`sendEmailWithTracking_`을 거치지 않음), 실제 한도는 추적 카운트보다 더 빨리 소진될 수 있습니다.

- **해결 방향**: 관리자 알림도 `incrementEmailCount_`를 호출하거나, 최소한 한도 확인만 수행합니다.

---

## 3. 잘된 점 (Good Practices)

### G-01. GAS 환경에 완벽히 맞는 문법 사용
- `var` 키워드만 사용 (let/const 없음)
- 템플릿 리터럴(`${}`) 없음 -- 모든 문자열은 `+` 연결
- `UrlFetchApp.fetch`, `CacheService`, `LockService`, `GmailApp`, `ContentService` 등 GAS 네이티브 API만 사용
- `require`, `import`, `fetch` 등 Node.js/브라우저 API 없음

### G-02. 멱등성(Idempotency) 보장
- `isOrderAlreadyProcessed_` 함수로 중복 주문 처리를 방지합니다 (646-654행, 816-818행)
- `handleRecordBooking`과 `handlePollOrders` 양쪽 모두에서 일관되게 적용됩니다

### G-03. LockService 사용 패턴이 적절함
- 쓰기 작업(`recordBooking`, `updateClassStatus`): `waitLock(10000)` -- 대기 후 처리
- 폴링/배치 작업(`pollOrders`, 리마인더, 후기 요청): `tryLock(0)` -- 즉시 실패, 스킵
- 모든 Lock은 `finally` 블록에서 `releaseLock()` 호출 (758, 872, 952, 1461, 1521행)

### G-04. 에러 처리 구조가 체계적
- 모든 핸들러가 try-catch로 감싸져 있음
- 에러 코드가 상수로 관리됨 (`ERROR_CODES`)
- 심각한 에러 시 관리자 이메일 알림 발송 (`logError_` -> `sendAdminAlert_`)
- 적립금 지급 실패 시 별도 관리자 알림 (1073-1083행)

### G-05. 응답 형식 통일
- 모든 성공 응답: `{ success: true, data: {...}, timestamp: "..." }`
- 모든 에러 응답: `{ success: false, error: { code, message, detail }, timestamp: "..." }`
- `jsonResponse` 유틸리티로 ContentService 응답 생성 일관화

### G-06. 개인정보 마스킹 처리
- `maskPhone_`: 전화번호 중간 4자리 마스킹
- `maskName_`: 이름 첫 글자 외 마스킹
- `maskEmail_`: 이메일 로컬파트 마스킹
- 이메일 로그에 마스킹된 주소 저장 (2033행)

### G-07. 이메일 한도 관리 설계
- 일일 100건 한도 추적 의도가 명확
- 70건 경고 + Workspace 전환 안내 (1273-1280행)
- 관리자 알림과 일반 이메일 분리 의도

### G-08. 정산 상태 머신이 명확
- PENDING -> PROCESSING -> COMPLETED/FAILED 흐름이 코드에 잘 반영됨
- 적립금 0원 케이스도 처리 (1098-1102행)
- API 응답의 다양한 실패 케이스를 세분화 (return_code, result 필드 등)

### G-09. 시트 초기화/검증 도구
- `initSheets()`: 필요한 모든 시트를 자동 생성
- `checkConfig()`: 설정값/시트 존재 여부를 한 번에 확인
- `runFullTest()`: API 시뮬레이션까지 포함한 통합 테스트

### G-10. 캐시 크기 제한 확인
- CacheService 100KB 제한을 인지하고 `jsonStr.length < 100000` 체크 수행 (295, 403, 605행)

### G-11. 메이크샵 API 호출이 올바름
- `process_reserve` API: 올바른 URL 경로, Shopkey/Licensekey 헤더, `datas[0]` 배열 형식
- 주문 조회 API: 올바른 mode/type 파라미터, 날짜 필터
- `muteHttpExceptions: true`로 HTTP 에러도 안전하게 처리

---

## 4. 이슈 요약 매트릭스

| # | 심각도 | 카테고리 | 이슈 | 수정 난이도 |
|---|--------|----------|------|-------------|
| C-01 | Critical | 이메일 한도 | incrementEmailCount_ 새 날짜 미처리 | 쉬움 (1줄) |
| C-02 | Critical | 보안 | Referer/인증 검증 완전 누락 | 보통 |
| C-03 | Critical | 보안 | 이메일 HTML XSS (escapeHtml 부재) | 쉬움 |
| C-04 | Critical | 정산 | FAILED 정산 재시도 메커니즘 부재 | 보통 |
| C-05 | Critical | 동시성 | 폴링 중 recordBooking Lock 충돌 | 보통 |
| W-01 | Warning | 성능 | getDataRange 반복 호출 (19곳) | 높음 |
| W-02 | Warning | 설정 | 카테고리 캐시 TTL 상수 불일치 | 쉬움 |
| W-03 | Warning | 설정 | 미사용 파트너 인증 캐시 TTL 상수 | 쉬움 |
| W-04 | Warning | 보안 | 캐시 키에 사용자 입력 직접 사용 | 보통 |
| W-05 | Warning | 캐시 | 캐시 삭제 패턴과 생성 패턴 불일치 | 보통 |
| W-06 | Warning | 안정성 | GAS 6분 실행 제한 미고려 | 쉬움 |
| W-07 | Warning | 기능 | 정합성 검증이 실제 비교 미수행 | 보통 |
| W-08 | Warning | 기능 | 수강생 리마인더 이메일 발송 불가 | 높음 |
| W-09 | Warning | 성능 | 클래스 목록 N+1 쿼리 문제 | 보통 |
| W-10 | Warning | 보안 | order_id 등 입력값 형식 미검증 | 쉬움 |
| W-11 | Warning | 구조 | appendRow vs 셀 단위 업데이트 혼용 | 낮음 |
| W-12 | Warning | 이메일 | 관리자 알림이 실제 한도에 미반영 | 쉬움 |

---

## 5. 수정 우선순위 권장

### 배포 전 필수 (즉시)
1. **C-01**: `incrementEmailCount_` 함수 새 날짜 처리 코드 추가 (1줄)
2. **C-03**: `escapeHtml_` 유틸 추가 + 이메일 본문 적용 (15분)
3. **C-02**: 관리자 전용 엔드포인트에 토큰 검증 추가 (30분)

### 배포 후 1주 이내
4. **C-04**: FAILED 정산 재시도 배치 함수 추가
5. **C-05**: 폴링 Lock 범위 개선
6. **W-06**: 폴링 루프 내 시간 체크 추가
7. **W-02, W-03**: 캐시 TTL 상수 정리

### 운영 안정화 단계
8. **W-01, W-09**: Sheets 읽기 최적화 (데이터 증가 시)
9. **W-04, W-05**: 캐시 키 관리 개선
10. **W-08**: 수강생 이메일 컬럼 추가 + 리마인더 활성화
11. **W-10**: 입력값 형식 검증 강화

---

## 6. 검수 항목별 결과 요약

| 검수 항목 | 결과 | 비고 |
|-----------|------|------|
| GAS 환경 적합성 | PASS | var만 사용, GAS API만 사용, 빌드 의존성 없음 |
| 보안 | FAIL | Referer 미구현, XSS 미방어, 입력값 검증 부족 |
| 동시성 제어 | PASS (부분) | LockService 패턴 올바름, 다만 Lock 범위 이슈 |
| 메이크샵 API 연동 | PASS | process_reserve, 주문 조회 모두 올바른 형식 |
| CacheService 사용 | PASS (부분) | 기본 패턴 올바름, TTL/키 관리 개선 필요 |
| 이메일 발송 한도 | FAIL | incrementEmailCount_ 버그로 한도 무력화 |
| 코드 품질 | PASS | 에러 처리, 응답 통일, 주석 모두 양호 |
