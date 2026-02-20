# 메이크샵 주문 API 폴링 및 클래스 상품 연동 아키텍처

> **작성일**: 2026-02-21
> **Task**: Task 201 (협업: makeshop-planning-expert)
> **상태**: 설계 완료
> **의존성**: Task 150 (적립금 API), Task 151 (가상태그/옵션), Task 152 (API 예산)

---

## 1. 메이크샵 주문 조회 API 폴링 전략

### 1.1 메이크샵 주문 조회 API 스펙

| 항목 | 값 |
|------|---|
| Permission | 주문 (search_order) |
| Method | GET |
| URL | `https://foreverlove.co.kr/list/open_api.html?mode=search&type=order_list` |
| Headers | `Shopkey: {상점키}`, `Licensekey: {라이센스키}` |
| 인증 | GAS Properties Service에 저장된 키 사용 (프론트엔드 노출 금지) |

**주요 파라미터:**

| 파라미터 | 필수 | 설명 | 비고 |
|---------|------|------|------|
| startDate | O | 조회 시작일 | `YYYY-MM-DD HH:MM:SS` 형식 |
| endDate | O | 조회 종료일 | startDate~endDate 범위 |
| status | - | 주문 상태 필터 | 결제완료(10), 배송준비(20), 배송중(30) 등 |
| pageNum | - | 페이지 번호 | 기본값 1 |
| pageSize | - | 페이지당 건수 | 기본값 10, 최대 100 |

**주문 상태 코드:**

| 코드 | 상태 | 클래스 관련 의미 |
|------|------|----------------|
| 10 | 결제완료 | 수강 예약 확정 (주문 감지 대상) |
| 20 | 배송준비 | 예약 처리 완료 (GAS 처리 후 변경할 상태) |
| 30 | 배송중 | 클래스에서는 사용하지 않음 |
| 40 | 배송완료 | 수강 완료 시 활용 가능 |
| 50 | 구매확정 | 수강 완료 + 구매 확정 |

### 1.2 중복 처리 방지 전략 비교

GAS가 10분마다 폴링할 때, 이미 처리한 주문을 다시 처리하면 이중 이메일 발송, 이중 적립금 지급 등 심각한 문제가 발생한다. 세 가지 방법을 비교한다.

#### 방법 A: "마지막 처리 시각" 기반

```
[GAS 타이머 트리거] (10분 간격)
  |
  1. Sheets "시스템설정" 시트에서 lastPollTime 읽기 (예: "2026-03-15 14:00:00")
  2. 메이크샵 API 호출: startDate=lastPollTime, endDate=now, status=10
  3. 응답 주문 전체 처리
  4. Sheets lastPollTime을 now로 업데이트
```

| 장점 | 단점 |
|------|------|
| 구현 단순 (시각 하나만 관리) | 처리 도중 실패 시 시각이 이미 업데이트되면 주문 누락 가능 |
| API 호출 1회로 충분 | 메이크샵 서버 시각과 GAS 서버 시각 차이 발생 가능 |
| Sheets 용량 거의 차지 안 함 | 시각 경계에 걸린 주문의 누락/중복 가능성 |

**누락 위험 시나리오**: 14:00에 폴링 시작, 14:01에 새 주문 발생, 14:02에 처리 완료 후 lastPollTime=14:02 업데이트. 14:01 주문이 포함되려면 startDate < 14:01이어야 하므로 정상 포함된다. 하지만 처리 도중 GAS가 크래시되고 lastPollTime이 이미 업데이트된 경우 문제가 된다.

#### 방법 B: "처리한 주문 ID 목록" 기반

```
[GAS 타이머 트리거] (10분 간격)
  |
  1. Sheets "시스템설정"에서 lastPollTime 읽기
  2. 메이크샵 API 호출: startDate=lastPollTime - 30분(버퍼), endDate=now, status=10
  3. 응답의 각 주문에 대해:
     a. Sheets "정산 내역"에서 order_id 존재 여부 확인
     b. 존재하면 SKIP (이미 처리됨)
     c. 미존재하면 처리 후 정산 내역에 기록
  4. lastPollTime 업데이트 (현재 시각)
```

| 장점 | 단점 |
|------|------|
| 멱등성 보장 (같은 주문 2번 처리해도 안전) | 매 폴링마다 Sheets에서 주문 ID 검색 필요 |
| 시각 버퍼(-30분)로 경계 주문 누락 방지 | 주문 수 증가 시 검색 성능 저하 가능 |
| 실패 후 재시도 시에도 안전 | 구현 약간 더 복잡 |

#### 방법 C: "주문 상태 업데이트" 기반

```
[GAS 타이머 트리거] (10분 간격)
  |
  1. 메이크샵 API 호출: status=10(결제완료)만 조회
  2. 응답의 각 주문 처리
  3. 처리 완료 후 메이크샵 API로 해당 주문을 status=20(배송준비)으로 변경
  4. 다음 폴링에서 status=10만 조회하므로 자동으로 스킵
```

| 장점 | 단점 |
|------|------|
| 메이크샵 자체로 상태 관리 | 처리 API 호출 추가 (주문 1건당 1회) |
| Sheets에 별도 관리 불필요 | API 호출 예산 소모 증가 (처리 API) |
| 다음 폴링에서 자동 필터링 | 상태 업데이트 실패 시 다음 폴링에서 재처리 (이중 위험) |
| 메이크샵 관리자 화면에서도 상태 확인 가능 | 관리자가 수동으로 상태 변경 시 충돌 가능 |

### 1.3 권장 방법: A + B 하이브리드

**결론: 방법 A(시각 기반) + 방법 B(주문 ID 중복 체크)를 결합하되, 방법 C(상태 업데이트)를 선택적으로 추가한다.**

이유:
1. **A의 단순함**: 시각 기반으로 조회 범위를 좁혀 API 응답량을 최소화한다.
2. **B의 안전성**: 정산 내역 시트의 order_id 중복 체크로 멱등성을 보장한다.
3. **C는 선택적**: 메이크샵 관리자 화면에서 "결제완료" -> "배송준비" 상태 전환을 보고 싶다면 추가한다. 단, 처리 API 호출 예산을 고려해야 한다.

### 1.4 권장 구현 상세

#### Sheets "시스템설정" 시트

| 컬럼 | 필드명 | 타입 | 설명 | 초기값 |
|------|--------|------|------|--------|
| A | config_key | STRING | 설정 키 | last_poll_time |
| B | config_value | STRING | 설정 값 | 2026-03-01 00:00:00 |
| C | updated_at | DATETIME | 마지막 업데이트 시각 | |

**행 목록 (초기 설정):**

| config_key | config_value | 설명 |
|------------|-------------|------|
| last_poll_time | 2026-03-01 00:00:00 | 마지막 주문 폴링 시각 |
| poll_interval_min | 10 | 폴링 간격 (분) |
| time_buffer_min | 30 | 시각 버퍼 (분, 경계 주문 누락 방지) |
| daily_email_count | 0 | 오늘 이메일 발송 건수 |
| daily_email_date | 2026-03-01 | 이메일 카운트 기준 날짜 |

#### 폴링 로직 (의사 코드)

```
FUNCTION pollNewOrders():
    // 1. 동시 실행 방지
    lock = LockService.getScriptLock()
    hasLock = lock.tryLock(0)  // 즉시 시도, 대기 없음
    IF NOT hasLock:
        log("이전 폴링 실행 중. 스킵.")
        RETURN

    TRY:
        // 2. 시스템 설정 읽기
        lastPollTime = getConfigValue("last_poll_time")
        timeBuffer = getConfigValue("time_buffer_min")  // 30분
        now = new Date()

        // 3. 조회 범위 계산 (30분 버퍼 적용)
        queryStartTime = lastPollTime - timeBuffer분
        queryEndTime = now

        // 4. 메이크샵 주문 조회 API 호출
        orders = callMakeshopOrderAPI({
            startDate: formatDateTime(queryStartTime),
            endDate: formatDateTime(queryEndTime),
            status: "10"  // 결제완료만
        })

        // 5. 각 주문 처리 (중복 체크 포함)
        processedCount = 0
        FOR EACH order IN orders:
            // 5a. 중복 체크 (정산 내역에 이미 있는지)
            IF isOrderAlreadyProcessed(order.orderId):
                log("주문 " + order.orderId + " 이미 처리됨. 스킵.")
                CONTINUE

            // 5b. 클래스 상품인지 확인
            IF NOT isClassProduct(order.branduid):
                CONTINUE

            // 5c. 주문 처리 (예약 기록 + 이메일 + 수수료 계산)
            processClassOrder(order)
            processedCount++

        // 6. 마지막 폴링 시각 업데이트
        setConfigValue("last_poll_time", formatDateTime(now))

        // 7. 폴링 로그 기록
        logPollResult({
            pollTime: now,
            ordersFound: orders.length,
            ordersProcessed: processedCount,
            errors: []
        })

    CATCH error:
        logPollResult({
            pollTime: now,
            ordersFound: 0,
            ordersProcessed: 0,
            errors: [error.message]
        })
        // 관리자 알림 (3회 연속 실패 시)
        IF getConsecutiveErrorCount() >= 3:
            sendAdminAlert("주문 폴링 3회 연속 실패: " + error.message)

    FINALLY:
        lock.releaseLock()
```

#### 중복 체크 함수 (의사 코드)

```
FUNCTION isOrderAlreadyProcessed(orderId):
    // 정산 내역 시트에서 order_id 컬럼 검색
    settlementSheet = getSheet("정산 내역")
    orderIds = settlementSheet.getRange("B:B").getValues()  // B열 = order_id

    FOR EACH row IN orderIds:
        IF row[0] == orderId:
            RETURN TRUE

    RETURN FALSE

    // 성능 최적화: 주문 수가 많아지면 (500건+)
    // -> 처리된 주문 ID를 GAS CacheService에 Set으로 캐싱
    // -> 또는 주문 ID에 인덱스 시트 별도 운영
```

### 1.5 시각 동기화 주의사항

메이크샵 서버와 GAS 서버의 시각이 다를 수 있다. 두 서버 모두 KST(Asia/Seoul)를 사용하지만, 수 초의 차이가 존재할 수 있다.

**대응 방안:**
- 조회 시 30분 버퍼(`time_buffer_min`)를 적용하여 경계 주문 누락 방지
- 중복 체크(order_id 기반)로 버퍼에 의한 재조회 주문 걸러내기
- GAS에서 날짜/시각 처리 시 반드시 `Utilities.formatDate(date, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss')` 사용

---

## 2. 클래스 주문 판별 방법

메이크샵에서는 일반 재료/도구 상품과 클래스 수강권이 모두 "상품"으로 등록된다. 주문 폴링 시 "이 주문이 클래스 예약인지, 일반 상품 구매인지" 구분해야 한다.

### 2.1 방법 비교

#### 방법 A: branduid 대조 (Sheets 매핑)

```
[GAS 폴링]
  1. 주문 응답에서 branduid 추출
  2. "클래스 메타" 시트의 makeshop_product_id(B열)와 대조
  3. 매칭되면 클래스 주문, 아니면 일반 주문
```

| 장점 | 단점 |
|------|------|
| 가장 정확 (branduid는 유일한 식별자) | 새 클래스 등록 시 Sheets에도 반드시 기록 필요 |
| 추가 API 호출 불필요 (Sheets 내부 조회) | 클래스 메타 시트 관리 필요 |
| GAS 메모리 캐시로 빠른 검색 가능 | |

#### 방법 B: 카테고리 필터

```
[메이크샵 관리자]
  "클래스" 전용 카테고리 생성 (카테고리 번호: 예시 999)

[GAS 폴링]
  1. 주문 응답의 상품 카테고리 확인
  2. 카테고리 번호가 999이면 클래스 주문
```

| 장점 | 단점 |
|------|------|
| 단순 (카테고리 번호 하나만 확인) | 메이크샵 관리자에서 카테고리 설정 필요 |
| 메이크샵 네이티브 기능 활용 | 주문 응답에 카테고리 정보가 포함되는지 확인 필요 |
| 새 클래스 추가 시 자동 분류 | 카테고리 번호 하드코딩 |

#### 방법 C: 상품명 텍스트 매칭

```
[클래스 등록 시]
  상품명 앞에 "[클래스]" 접두어 필수 사용

[GAS 폴링]
  1. 주문 응답의 상품명 확인
  2. "[클래스]"로 시작하면 클래스 주문
```

| 장점 | 단점 |
|------|------|
| 추가 시트나 설정 불필요 | 사람이 접두어를 빼먹을 수 있음 |
| 직관적 (관리자가 바로 식별 가능) | 상품명 변경 시 매칭 깨짐 |
| | 정규식/문자열 파싱 불안정 |

### 2.2 권장 방법: A (branduid 대조) + B (카테고리 보조)

**주요 식별: 방법 A (Sheets "클래스 메타" 시트의 branduid 대조)**
**보조 확인: 방법 B (전용 카테고리 분류)**

이유:
1. **branduid는 메이크샵에서 상품을 유일하게 식별하는 키다.** 상품명이나 카테고리가 변경되어도 branduid는 불변이다.
2. **"클래스 메타" 시트는 Task 201에서 이미 설계되어 있다.** makeshop_product_id(B열)로 매핑이 준비되어 있으므로 추가 작업이 거의 없다.
3. 카테고리를 보조로 사용하면 메이크샵 관리자 화면에서도 클래스 상품을 한눈에 식별할 수 있다.
4. 텍스트 매칭(방법 C)은 불안정하고 사람 실수에 취약하므로 배제한다.

### 2.3 클래스 상품 식별 로직 (의사 코드)

```
// GAS 시작 시 또는 캐시 만료 시 한 번 로드
FUNCTION loadClassProductIds():
    classMetaSheet = getSheet("클래스 메타")
    data = classMetaSheet.getDataRange().getValues()

    classProductMap = {}  // branduid -> { classId, partnerCode, className }
    FOR i = 1 TO data.length:  // 1번 행은 헤더
        row = data[i]
        branduid = row[1]     // B열: makeshop_product_id
        status = row[19]      // T열: status
        IF status == "ACTIVE":
            classProductMap[branduid] = {
                classId: row[0],      // A열: class_id
                partnerCode: row[2],  // C열: partner_code
                className: row[3]     // D열: class_name
            }

    // GAS CacheService에 5분 캐싱
    cache.put("class_product_map", JSON.stringify(classProductMap), 300)
    RETURN classProductMap


FUNCTION isClassProduct(branduid):
    // 1. GAS CacheService에서 먼저 확인
    cached = cache.get("class_product_map")
    IF cached:
        classProductMap = JSON.parse(cached)
    ELSE:
        classProductMap = loadClassProductIds()

    // 2. branduid 매칭
    RETURN classProductMap.hasOwnProperty(branduid)


FUNCTION getClassInfoByBranduid(branduid):
    // 클래스 상품 정보 (partnerCode, classId 등) 반환
    classProductMap = getClassProductMap()  // 캐시 또는 Sheets
    RETURN classProductMap[branduid] || null
```

---

## 3. 옵션 -> 수업 일정 매핑

### 3.1 메이크샵 주문 응답에서 옵션 확인

메이크샵 주문 조회 API 응답에는 주문 상품의 옵션 정보가 포함된다. 클래스 상품의 옵션은 수업 일정(날짜/시간)이다.

**주문 조회 응답 구조 (예상):**

```json
{
  "return_code": "0000",
  "totalCount": "1",
  "list": [
    {
      "orderId": "ORD20260315001",
      "orderDate": "2026-03-15 10:30:00",
      "status": "10",
      "paymentAmount": "65000",
      "products": [
        {
          "branduid": "12345",
          "productName": "봄꽃 압화 원데이 클래스",
          "option": "2026-03-22 오후 2시",
          "quantity": "1",
          "price": "65000"
        }
      ],
      "buyer": {
        "name": "김수강",
        "email": "student@email.com",
        "phone": "01012345678"
      },
      "receiver": {
        "name": "김수강",
        "phone": "01012345678",
        "address": "서울시..."
      }
    }
  ]
}
```

> **주의**: 위 응답 구조는 메이크샵 공식 문서와 일반적인 이커머스 API 패턴을 기반으로 한 예상 구조다. Phase 2 착수 시 실제 API 응답을 curl로 테스트하여 정확한 필드명과 구조를 확인해야 한다.

### 3.2 옵션 텍스트 파싱

메이크샵 상품 옵션으로 등록한 수업 일정 텍스트를 파싱하여 날짜와 시간을 추출한다.

**옵션 등록 규칙 (관리자 가이드):**

클래스 상품 등록 시 옵션 텍스트 형식을 통일한다:

| 형식 | 예시 | 비고 |
|------|------|------|
| `YYYY-MM-DD 오전/오후 N시` | `2026-03-22 오후 2시` | 권장 (사람이 읽기 쉬움) |
| `YYYY-MM-DD HH:MM` | `2026-03-22 14:00` | 대안 (파싱 더 쉬움) |

**파싱 로직 (의사 코드):**

```
FUNCTION parseClassSchedule(optionText):
    // 입력 예시: "2026-03-22 오후 2시"

    // 패턴 1: "YYYY-MM-DD 오전/오후 N시"
    match = optionText.match(/(\d{4}-\d{2}-\d{2})\s+(오전|오후)\s+(\d{1,2})시/)
    IF match:
        dateStr = match[1]         // "2026-03-22"
        ampm = match[2]            // "오후"
        hour = parseInt(match[3])  // 2
        IF ampm == "오후" AND hour != 12:
            hour = hour + 12       // 14
        IF ampm == "오전" AND hour == 12:
            hour = 0
        RETURN {
            date: dateStr,
            time: padZero(hour) + ":00",  // "14:00"
            originalText: optionText
        }

    // 패턴 2: "YYYY-MM-DD HH:MM"
    match = optionText.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/)
    IF match:
        RETURN {
            date: match[1],
            time: match[2],
            originalText: optionText
        }

    // 파싱 실패 시 원본 텍스트 그대로 저장 (수동 확인 가능)
    RETURN {
        date: null,
        time: null,
        originalText: optionText,
        parseError: true
    }
```

**파싱 실패 처리:**
- 옵션 텍스트를 파싱할 수 없는 경우에도 주문 처리 자체는 진행한다.
- `originalText`를 정산 내역의 class_date(K열)에 그대로 저장한다.
- `parseError: true`인 경우 관리자에게 경고 이메일을 발송한다.
- 리마인더 이메일(D-3, D-1) 발송 시에는 파싱된 날짜가 필요하므로, 파싱 실패 시 리마인더를 건너뛰고 관리자에게 수동 처리 요청한다.

### 3.3 수강생 정보 획득

메이크샵 주문 데이터에는 주문자(buyer) 정보가 포함된다.

| 정보 | 출처 | 용도 |
|------|------|------|
| 수강생 이름 | 주문 응답 buyer.name | 예약 확인 이메일, 파트너 전달 |
| 수강생 이메일 | 주문 응답 buyer.email | 확인/리마인더/후기 이메일 발송 |
| 수강생 연락처 | 주문 응답 buyer.phone | 긴급 연락 (마스킹 후 파트너 전달) |
| 수강생 회원 ID | 주문 응답 buyer.id (또는 userId) | 정산 내역 기록, 회원그룹 변경 |

**개인정보 마스킹 (파트너에게 전달 시):**

| 원본 | 마스킹 | 규칙 |
|------|--------|------|
| 김수강 | 김** | 첫 글자만 표시 |
| 01012345678 | 010-****-5678 | 중간 4자리 마스킹 |
| student@email.com | st*****@email.com | 앞 2자 + ***** |

```
FUNCTION maskName(name):
    IF name.length <= 1: RETURN name
    RETURN name.charAt(0) + "*".repeat(name.length - 1)

FUNCTION maskPhone(phone):
    // "01012345678" -> "010-****-5678"
    cleaned = phone.replace(/[^0-9]/g, "")
    IF cleaned.length >= 10:
        RETURN cleaned.substring(0, 3) + "-****-" + cleaned.substring(cleaned.length - 4)
    RETURN phone  // 형식 불일치 시 원본

FUNCTION maskEmail(email):
    parts = email.split("@")
    IF parts.length != 2: RETURN email
    local = parts[0]
    IF local.length <= 2:
        RETURN local + "*****@" + parts[1]
    RETURN local.substring(0, 2) + "*****@" + parts[1]
```

---

## 4. 정원 관리 (재고 동기화)

### 4.1 메이크샵 네이티브 재고 관리

메이크샵에서 클래스를 "상품"으로 등록하면, 옵션별 재고(=정원)는 메이크샵 네이티브 결제 시스템이 자동으로 관리한다.

**자동 처리되는 항목:**

| 이벤트 | 메이크샵 동작 | GAS 개입 필요 |
|--------|-------------|--------------|
| 고객이 결제 완료 | 해당 옵션 재고 -1 차감 | 불필요 (자동) |
| 고객이 주문 취소 | 해당 옵션 재고 +1 복원 | 불필요 (자동) |
| 재고 0이 되면 | "품절" 표시, 추가 결제 불가 | 불필요 (자동) |

**GAS가 관리할 항목:**

| 항목 | 방법 | 시점 |
|------|------|------|
| 지난 일정 품절 처리 | GAS 배치로 옵션 비활성화/품절 설정 | 일 1회 새벽 배치 |
| 정원 모니터링 | Sheets에 잔여석 동기화 | 클래스 상세 조회 시 (캐시 5분) |
| 정원 변경 (파트너 요청) | 관리자가 메이크샵에서 수동 변경 | 필요 시 수동 |

### 4.2 재고 동기화 전략

**결론: 일 1회 배치 동기화를 권장한다.**

이유:
1. 메이크샵 네이티브 결제가 재고를 자동 관리하므로 실시간 동기화가 불필요하다.
2. 잔여석 정보는 클래스 상세 페이지에서 필요하지만, 메이크샵 상품 상세 API(`search_product`)로 조회하면 최신 재고를 알 수 있다. 이 조회는 GAS CacheService 5분 캐시를 적용한다.
3. Sheets에 저장하는 잔여석 정보는 파트너 대시보드와 관리자용 리포트에 사용한다.

**일 1회 배치 동기화 (의사 코드):**

```
FUNCTION syncClassInventory():
    // 새벽 3시 배치 (트래픽 없는 시간)
    classMetaSheet = getSheet("클래스 메타")
    classes = classMetaSheet.getDataRange().getValues()

    FOR i = 1 TO classes.length:
        branduid = classes[i][1]  // B열: makeshop_product_id
        status = classes[i][19]    // T열: status

        IF status != "ACTIVE":
            CONTINUE

        // 메이크샵 상품 조회 API로 옵션별 재고 확인
        productInfo = callMakeshopProductAPI(branduid)

        // 옵션별 잔여석 정보를 별도 시트에 기록 (선택적)
        FOR EACH option IN productInfo.options:
            IF isExpiredSchedule(option.name):
                // 지난 일정 -> 품절 처리 API 호출
                setOptionSoldOut(branduid, option.id)

    log("재고 동기화 완료: " + (classes.length - 1) + "개 클래스")
```

### 4.3 잔여석 실시간 표시 (프론트엔드)

프론트엔드 클래스 상세 페이지에서 잔여석을 표시할 때는 메이크샵 상품 상세 API를 GAS 프록시를 통해 조회한다.

```
[프론트 JS] -> fetch(GAS_URL + "?action=getClassDetail&id=CLS001")
  -> [GAS] -> CacheService 확인 (5분 캐시)
    -> 캐시 미스 시: 메이크샵 search_product API 호출
    -> 응답에 옵션별 재고 포함
  -> [프론트] -> 옵션 선택 UI에 "잔여 N석" 표시
```

5분 캐시이므로 최대 5분의 지연이 있지만, 실제 결제 시 메이크샵 네이티브 재고 검증이 이루어지므로 안전하다. (잔여 0석인데 결제 시도 시 메이크샵이 자체 차단)

---

## 5. 메이크샵 주문 상태 업데이트 (선택)

### 5.1 주문 상태 업데이트 API 스펙

| 항목 | 값 |
|------|---|
| Permission | 주문 (process_order) |
| Method | POST |
| URL | `https://foreverlove.co.kr/list/open_api_process.html?mode=save&type=order_status` |
| 핵심 파라미터 | orderId, status (변경할 상태 코드) |

### 5.2 클래스 주문에 적용할 상태 흐름

```
결제완료(10) --> [GAS 감지 + 처리] --> 배송준비(20) --> [수강 완료] --> 배송완료(40) --> 구매확정(50)
```

| 상태 변경 | 시점 | API 호출 | 권장 여부 |
|----------|------|---------|----------|
| 10 -> 20 (배송준비) | GAS 주문 처리 완료 후 | process_order 1회 | 권장 |
| 20 -> 40 (배송완료) | 수강 완료 후 | process_order 1회 | 선택 |
| 40 -> 50 (구매확정) | 수강 완료 + 14일 후 | process_order 1회 | 선택 |

### 5.3 권장 여부: 10 -> 20 상태 업데이트를 권장한다

**권장하는 이유:**

1. **관리자 가시성**: 메이크샵 관리자 화면에서 "결제완료" 상태인 주문은 아직 처리되지 않은 것으로 보인다. "배송준비"로 변경하면 GAS가 이미 감지하고 처리했음을 관리자가 알 수 있다.

2. **이중 처리 방지 보조**: 방법 A+B(시각 + 주문 ID 중복 체크)가 주요 방어선이지만, 메이크샵 상태 변경은 추가 안전장치다. 만약 Sheets 데이터가 유실되더라도, status=10인 주문만 조회하므로 이미 20으로 변경된 주문은 재처리되지 않는다.

3. **추후 수강 완료 워크플로우**: 20(배송준비) -> 40(배송완료)으로의 전환은 수강 완료 시점에 자동화할 수 있어, 전체 라이프사이클 관리가 가능해진다.

**API 호출 비용:**

| 항목 | 추가 호출 | 시간당 |
|------|----------|--------|
| 주문 1건당 상태 업데이트 | 처리 API 1회 | 피크 시 5회 이하 |
| 시간당 처리 API 예산 | 500회 중 ~10회 사용 | 한도의 2% |
| 상태 업데이트 추가 시 | 500회 중 ~15회 사용 | 한도의 3% |

추가 5회/시간은 전체 처리 API 예산(500회)의 1%에 불과하므로 부담 없다.

**주의사항:**
- 상태 업데이트 API 호출 실패 시에도 주문 처리 자체는 성공으로 간주한다. (상태 변경은 보조 기능)
- 실패한 상태 업데이트는 로그에 기록하고, 관리자가 수동으로 변경할 수 있다.
- 관리자가 메이크샵 관리자 화면에서 수동으로 상태를 변경할 경우, GAS와 충돌하지 않도록 주의한다. (GAS는 status=10만 조회하므로, 관리자가 이미 20으로 변경한 주문은 자동 스킵)

### 5.4 상태 업데이트 구현 (의사 코드)

```
FUNCTION updateOrderStatus(orderId, newStatus):
    TRY:
        response = callMakeshopAPI("process_order", {
            orderId: orderId,
            status: newStatus
        })

        IF response.return_code == "0000":
            log("주문 " + orderId + " 상태 변경 성공: " + newStatus)
            RETURN { success: true }
        ELSE:
            log("주문 " + orderId + " 상태 변경 실패: " + response.message)
            RETURN { success: false, error: response.message }

    CATCH error:
        log("주문 상태 변경 API 에러: " + error.message)
        RETURN { success: false, error: error.message }
        // 상태 변경 실패는 치명적이지 않으므로 예외를 전파하지 않음
```

---

## 6. API 호출 예산 재확인

### 6.1 주문 폴링 시 호출 패턴 분석

10분 간격 폴링 1회에서 발생하는 API 호출을 상세히 분석한다.

**단계별 API 호출:**

| 단계 | API | 유형 | 호출 수 | 비고 |
|------|-----|------|---------|------|
| 1. 주문 목록 조회 | search_order | 조회 | 1회 | 고정 (매 폴링) |
| 2. 클래스 상품 판별 | (Sheets 내부) | 없음 | 0회 | Sheets/캐시로 처리 |
| 3. 주문 처리 (이메일, 정산 기록) | (GAS 내부) | 없음 | 0회 | Sheets 쓰기만 |
| 4. 적립금 지급 (선택) | process_reserve | 처리 | 0~N회 | 주문 확정 시에만 (즉시 아님) |
| 5. 주문 상태 업데이트 (선택) | process_order | 처리 | 0~N회 | 클래스 주문 건수만큼 |

> **핵심**: 폴링 1회당 조회 API는 반드시 1회만 호출된다. 주문 상세는 주문 목록 API 응답에 포함되므로 별도 호출이 불필요하다.

### 6.2 시간당 호출 수 계산

| 항목 | 시간당 호출 수 | API 유형 | 산출 근거 |
|------|-------------|---------|----------|
| 주문 목록 폴링 | 6회 | 조회 | 10분 x 6 = 60분 |
| 상품 상세 (잔여석) | 10~20회 | 조회 | 클래스 상세 페이지 조회 시 (캐시 5분) |
| 클래스 목록 | 1~2회 | 조회 | 1시간 캐시 |
| 주문 상태 업데이트 | 0~5회 | 처리 | 피크 시 시간당 5건 예약 |
| 적립금 지급 | 0~5회 | 처리 | 주문 확정 시 (월 정산 또는 건별) |
| **소계** | **17~33회 (조회)** | | |
| | **0~10회 (처리)** | | |

### 6.3 Task 152 예산 대비 검증

Task 152에서 확정된 Phase 2 예산과 비교한다.

| 구분 | Task 152 예산 | 본 설계 실사용 (일반) | 본 설계 실사용 (피크) | 판정 |
|------|-------------|---------------------|---------------------|------|
| 조회 API | ~28회/시간 | ~17회 | ~33회 | 피크 시 약간 초과하나 한도 500회의 6.6%로 여유 |
| 처리 API | ~10회/시간 | ~4회 | ~10회 | 예산 내 |
| 한도 대비 | 10% 미만 | 3.4% | 6.6% | 안전 |

**결론: 주문 상태 업데이트(선택 기능)를 포함해도 API 한도의 7% 미만이다. 전혀 문제없다.**

### 6.4 증가 시나리오 대비

| 시나리오 | 추가 조회 | 추가 처리 | 한도 대비 |
|---------|---------|---------|---------|
| 일 예약 20건 (성장기) | +10회 | +20회 | 12% |
| 일 예약 50건 (활성기) | +25회 | +50회 | 20% |
| 일 예약 100건 (한계) | +50회 | +100회 | 35% |

일 예약 100건(시간당 약 10건)에 도달해도 한도의 35%에 불과하다. **API 호출 예산은 PRESSCO21 규모에서 병목이 되지 않는다.**

---

## 7. 전체 주문 처리 파이프라인 (종합)

### 7.1 클래스 주문 처리 전체 흐름

```
[고객] 클래스 상품 결제 (메이크샵 네이티브)
  |
  | (메이크샵: 재고 자동 차감, 주문 생성, 상태=10)
  |
[GAS 타이머 트리거] (10분 간격)
  |
  +-- 1. LockService.tryLock(0) -- 동시 실행 방지
  |
  +-- 2. lastPollTime - 30분 ~ now 범위, status=10 주문 조회 (조회 API 1회)
  |
  +-- 3. 각 주문에 대해:
  |     |
  |     +-- 3a. 정산 내역 시트에서 order_id 중복 체크
  |     |     -> 이미 있으면 SKIP
  |     |
  |     +-- 3b. branduid로 클래스 상품 여부 확인 (Sheets 캐시)
  |     |     -> 일반 상품이면 SKIP
  |     |
  |     +-- 3c. 옵션 텍스트에서 수업 일정 파싱
  |     |
  |     +-- 3d. 정산 내역 시트에 행 추가 (상태=PENDING)
  |     |     -> LockService.waitLock(30000) 사용
  |     |
  |     +-- 3e. 수강생 확인 이메일 발송
  |     |     -> 이메일 카운트 체크 (일 100건 한도)
  |     |     -> 발송 성공 시 student_email_sent = TRUE
  |     |
  |     +-- 3f. 파트너 예약 안내 이메일 발송
  |     |     -> 수강생 정보 마스킹 후 전달
  |     |     -> 발송 성공 시 partner_email_sent = TRUE
  |     |
  |     +-- 3g. 수수료 계산 (매출 구간별 10%/12%/15%)
  |     |     -> 정산 내역에 commission_amount, reserve_amount 기록
  |     |
  |     +-- 3h. (선택) 주문 상태 10 -> 20 업데이트 (처리 API 1회)
  |     |
  |     +-- 3i. 정산 상태 PENDING -> PROCESSING 업데이트
  |
  +-- 4. lastPollTime 업데이트
  |
  +-- 5. 폴링 로그 기록
  |
  +-- 6. lock.releaseLock()


[GAS 시간 트리거] (매일 새벽 3시)
  |
  +-- 정합성 검증 배치
  |     -> Sheets 적립금 잔액 vs 메이크샵 API 적립금 잔액 비교
  |     -> 불일치 시 관리자 이메일 알림
  |
  +-- 지난 일정 품절 처리
  |     -> 어제 이전 일정 옵션을 품절로 설정
  |
  +-- 클래스 재고 동기화
        -> 메이크샵 옵션별 재고 -> Sheets 동기화


[GAS 시간 트리거] (매일 오전 9시)
  |
  +-- D-3 리마인더 발송
  |     -> 정산 내역에서 class_date가 오늘+3일인 건 필터
  |     -> 수강생 + 파트너에게 리마인더 이메일
  |
  +-- D-1 리마인더 발송
        -> 정산 내역에서 class_date가 오늘+1일인 건 필터
        -> 수강생 + 파트너에게 리마인더 이메일


[GAS 시간 트리거] (매일 오전 10시)
  |
  +-- D+7 후기 유도 발송
        -> 정산 내역에서 class_date가 오늘-7일인 건 필터
        -> 수강생에게 후기 작성 유도 이메일
```

### 7.2 적립금 지급 시점

적립금 지급은 주문 감지 즉시가 아니라, **수강 완료 후**에 진행한다.

| 방식 | 시점 | 장점 | 단점 |
|------|------|------|------|
| 주문 즉시 지급 | 결제 완료 시 | 파트너가 빨리 적립금 확인 | 취소/환불 시 회수 복잡 |
| **수강 완료 후 지급** | D+1 (수업 다음 날) | 취소/환불 위험 없음 | 파트너가 적립금 확인까지 대기 |
| 월 정산 일괄 지급 | 매월 1일 | 관리 가장 단순 | 파트너 대기 기간 최대 30일 |

**권장: 수강 완료 후 지급 (D+1)**

- 수업 당일 이후 주문 취소 가능성이 거의 없으므로 안전하다.
- 파트너 입장에서 1~2일 이내 적립금을 확인할 수 있어 만족도가 높다.
- GAS에서 D+1 시점에 정산 내역의 status를 PROCESSING -> COMPLETED로 업데이트하며 적립금을 지급한다.

**적립금 지급 로직 (D+1 배치, 의사 코드):**

```
FUNCTION processSettlements():
    // 매일 오전 6시 실행 (수업 다음 날)
    settlementSheet = getSheet("정산 내역")
    data = settlementSheet.getDataRange().getValues()

    yesterday = formatDate(addDays(now, -1))

    FOR i = 1 TO data.length:
        row = data[i]
        classDate = row[10]  // K열: class_date
        status = row[12]     // M열: status

        // 어제 수업이고 상태가 PROCESSING인 건만 처리
        IF parseDateOnly(classDate) != yesterday: CONTINUE
        IF status != "PROCESSING": CONTINUE

        partnerId = row[2]   // C열: partner_code
        partnerMemberId = getPartnerMemberId(partnerId)
        reserveAmount = row[9]  // J열: reserve_amount

        // 적립금 지급 API 호출
        apiResult = callReserveAPI({
            id: partnerMemberId,
            reserve: reserveAmount,
            content: "[클래스 수수료] " + row[3] + " / " + row[1]  // class_id + order_id
        })

        IF apiResult.success:
            updateSettlementStatus(i, "COMPLETED", apiResult)
        ELSE:
            updateSettlementStatus(i, "FAILED", apiResult)
            sendAdminAlert("적립금 지급 실패: " + row[1] + " / " + apiResult.error)
```

---

## 8. Sheets 컬럼 설계 보완

Task 201의 기존 Sheets 설계에 본 아키텍처에서 필요한 추가 시트/컬럼을 보완한다.

### 8.1 추가 시트: "시스템설정"

Task 201에 정의된 5개 시트에 "시스템설정" 시트를 추가한다.

| 컬럼 | 필드명 | 타입 | 설명 |
|------|--------|------|------|
| A | config_key | STRING | 설정 키 |
| B | config_value | STRING | 설정 값 |
| C | updated_at | DATETIME | 마지막 업데이트 시각 |
| D | description | STRING | 설정 설명 |

**초기 데이터:**

| config_key | config_value | description |
|------------|-------------|-------------|
| last_poll_time | (서비스 시작 시각) | 마지막 주문 폴링 시각 |
| poll_interval_min | 10 | 폴링 간격 (분) |
| time_buffer_min | 30 | 시각 버퍼 (경계 주문 누락 방지) |
| daily_email_count | 0 | 오늘 이메일 발송 건수 |
| daily_email_date | (오늘 날짜) | 이메일 카운트 기준 날짜 |
| consecutive_poll_errors | 0 | 연속 폴링 에러 횟수 |
| order_status_update_enabled | true | 주문 상태 자동 업데이트 여부 |
| settlement_auto_pay | true | 적립금 자동 지급 여부 |
| admin_email | (관리자 이메일) | 관리자 알림 이메일 |

### 8.2 "정산 내역" 시트 보완 컬럼

Task 201의 기존 정산 내역 시트에 다음 컬럼을 추가한다.

| 기존/추가 | 컬럼 | 필드명 | 타입 | 설명 |
|----------|------|--------|------|------|
| 추가 | U | student_name | STRING | 수강생 이름 (원본, 내부용) |
| 추가 | V | student_email | STRING | 수강생 이메일 (이메일 발송용) |
| 추가 | W | student_phone | STRING | 수강생 연락처 (원본, 내부용) |
| 추가 | X | option_parsed | BOOLEAN | 옵션 텍스트 파싱 성공 여부 |
| 추가 | Y | class_date_parsed | DATE | 파싱된 수업 날짜 (리마인더 발송 기준) |
| 추가 | Z | class_time_parsed | STRING | 파싱된 수업 시간 (예: 14:00) |
| 추가 | AA | reminder_d3_sent | BOOLEAN | D-3 리마인더 발송 여부 |
| 추가 | AB | reminder_d1_sent | BOOLEAN | D-1 리마인더 발송 여부 |
| 추가 | AC | review_request_sent | BOOLEAN | D+7 후기 유도 발송 여부 |
| 추가 | AD | order_status_updated | BOOLEAN | 메이크샵 주문 상태 업데이트 여부 |
| 추가 | AE | makeshop_order_status | STRING | 현재 메이크샵 주문 상태 코드 |

### 8.3 "API 모니터링" 시트 (선택)

API 호출 횟수를 시간 단위로 추적하여 한도 근접 시 경고를 발생시킨다. Task 152 설계에 포함되어 있으며, 여기서는 폴링과의 연계를 정의한다.

| 컬럼 | 필드명 | 타입 | 설명 |
|------|--------|------|------|
| A | hour_key | STRING | 시간 키 (예: 2026-03-15-14) |
| B | search_count | NUMBER | 조회 API 호출 수 |
| C | process_count | NUMBER | 처리 API 호출 수 |
| D | poll_count | NUMBER | 폴링 횟수 |
| E | orders_detected | NUMBER | 감지된 주문 수 |
| F | errors | NUMBER | 에러 횟수 |

---

## 9. GAS 트리거 설계

### 9.1 트리거 목록

| 트리거명 | 유형 | 간격 | 역할 | 우선순위 |
|---------|------|------|------|---------|
| pollNewOrders | 시간 기반 | 10분 | 새 주문 감지 + 처리 | P0 (필수) |
| processSettlements | 일 기반 | 매일 06:00 | 수강 완료 건 적립금 지급 | P0 (필수) |
| sendReminders | 일 기반 | 매일 09:00 | D-3, D-1 리마인더 발송 | P1 (중요) |
| sendReviewRequests | 일 기반 | 매일 10:00 | D+7 후기 유도 발송 | P2 (보조) |
| syncInventory | 일 기반 | 매일 03:00 | 지난 일정 품절 + 재고 동기화 | P1 (중요) |
| validateIntegrity | 일 기반 | 매일 03:30 | 적립금 정합성 검증 | P1 (중요) |
| resetDailyCounters | 일 기반 | 매일 00:05 | 일일 이메일 카운트 초기화 | P0 (필수) |

### 9.2 GAS 실행 시간 한도 관리

| 항목 | 개인 계정 한도 | 예상 사용 |
|------|-------------|----------|
| 일일 총 실행 시간 | 90분 | ~87분 (Task 152 분석) |
| 단일 실행 최대 | 6분 | 폴링 1회 ~30초 |
| 트리거 최대 수 | 20개 | 7개 사용 |

> **경고**: 일일 실행 시간이 90분 한도에 근접한다. Phase 2 시작 시 Google Workspace 전환을 강력 권장한다 (한도 6시간으로 증가).

### 9.3 트리거 등록 (의사 코드)

```
FUNCTION setupTriggers():
    // 기존 트리거 모두 삭제 (중복 방지)
    ScriptApp.getProjectTriggers().forEach(function(trigger) {
        ScriptApp.deleteTrigger(trigger)
    })

    // 주문 폴링: 10분 간격
    ScriptApp.newTrigger("pollNewOrders")
        .timeBased()
        .everyMinutes(10)
        .create()

    // 적립금 지급: 매일 06:00
    ScriptApp.newTrigger("processSettlements")
        .timeBased()
        .atHour(6)
        .everyDays(1)
        .create()

    // 리마인더 발송: 매일 09:00
    ScriptApp.newTrigger("sendReminders")
        .timeBased()
        .atHour(9)
        .everyDays(1)
        .create()

    // ... (나머지 트리거도 동일 패턴)
```

---

## 10. 에러 처리 및 복구 전략

### 10.1 에러 유형별 대응

| 에러 유형 | 발생 위치 | 대응 | 복구 |
|----------|---------|------|------|
| 메이크샵 API 타임아웃 | 폴링 조회 | 로그 기록, 다음 폴링에서 재시도 | 자동 (시각 버퍼 30분) |
| 메이크샵 API 인증 실패 (9001/9002) | 모든 API 호출 | 즉시 관리자 알림, 폴링 중단 | 수동 (키 확인) |
| 메이크샵 API 한도 초과 | 조회/처리 API | 캐시 TTL 2배 연장, 폴링 간격 확대 | 자동 (1시간 후 복구) |
| Sheets 쓰기 실패 | 정산 내역 기록 | 3회 재시도 (1초, 2초, 4초 간격) | 자동/수동 |
| 이메일 발송 실패 | 확인/리마인더 이메일 | 실패 큐에 저장, 다음 배치에서 재발송 | 자동 |
| 이메일 일일 한도 도달 | 이메일 발송 | P2 이하 생략, P0/P1만 큐잉 | 다음날 새벽 재발송 |
| 적립금 API 실패 | 정산 지급 | 상태=FAILED 기록, 관리자 알림 | 수동 (이중 지급 방지) |
| 옵션 텍스트 파싱 실패 | 주문 처리 | 원본 텍스트 저장, 관리자 알림 | 수동 (관리자 확인) |
| LockService 타임아웃 | 동시 쓰기 | 다음 폴링에서 재처리 | 자동 |

### 10.2 관리자 알림 조건

| 조건 | 알림 방법 | 내용 |
|------|---------|------|
| 폴링 3회 연속 실패 | 이메일 | "주문 감지 중단됨. API 키/네트워크 확인 필요" |
| 적립금 지급 실패 | 이메일 | "파트너 {이름}에게 {금액}원 지급 실패. 수동 처리 필요" |
| 이메일 일 70건 도달 | 이메일 | "Workspace 전환 검토 필요 (현재 {N}건/100건)" |
| 정합성 검증 불일치 | 이메일 | "파트너 {이름} 적립금 불일치: Sheets {A}원 vs 메이크샵 {B}원" |
| 옵션 파싱 실패 | 이메일 | "주문 {ID}의 옵션 파싱 실패. 수동 확인 필요: {텍스트}" |

---

## 11. Phase 2 착수 시 확인 사항

본 아키텍처 문서는 메이크샵 공식 문서, Phase 1.5 검증 결과, 일반적인 이커머스 API 패턴을 기반으로 설계되었다. Phase 2 실제 구현 시 다음 항목을 반드시 확인해야 한다.

### 11.1 실제 API 테스트 필요 항목

| 항목 | 확인 방법 | 우선순위 |
|------|---------|---------|
| 주문 조회 API 응답 구조 | curl로 실제 주문 조회, JSON 필드명 확인 | 최우선 |
| 주문 응답에 옵션 텍스트 포함 여부 | 옵션 있는 상품 주문 후 API 조회 | 최우선 |
| 주문 응답에 buyer 정보 포함 여부 | 실제 주문 API 응답 확인 | 최우선 |
| 주문 상태 업데이트 API 동작 | 테스트 주문으로 상태 변경 시도 | 중요 |
| 주문 목록 페이징 동작 | 주문 10건+ 시 pageNum/pageSize 테스트 | 중요 |
| GAS에서 메이크샵 API IP 제한 | GAS UrlFetchApp으로 API 호출 성공 여부 | 최우선 |

> **IP 제한 관련 (Task 150에서 확인):** 현재 메이크샵 API에 특정 IP만 허용되어 있다 (112.219.232.181, 119.70.128.56). GAS 서버의 IP는 유동적이므로 IP 제한 해제가 필요하거나, 또는 Cloudflare Workers를 프록시로 사용하여 고정 IP를 확보해야 한다. Phase 2 착수 시 가장 먼저 해결해야 할 사항이다.

### 11.2 메이크샵 관리자 설정 필요 항목

| 항목 | 설정 위치 | 내용 |
|------|---------|------|
| 클래스 전용 카테고리 생성 | 관리자 > 분류관리 | "원데이 클래스", "정기 클래스", "온라인 클래스" |
| 오픈 API 주문 조회 권한 | 관리자 > 오픈 API | search_order 조회 권한 허용 |
| 오픈 API 주문 상태 변경 권한 | 관리자 > 오픈 API | process_order 수정 권한 허용 |
| 오픈 API IP 제한 설정 | 관리자 > 오픈 API | GAS 서버 IP 허용 또는 제한 해제 |
| 테스트 클래스 상품 등록 | 관리자 > 상품관리 | 옵션(일정) + 재고(정원) 설정 |

---

## 12. 요약 및 결론

### 12.1 핵심 설계 결정

| 항목 | 결정 | 사유 |
|------|------|------|
| 폴링 전략 | A+B 하이브리드 (시각 + 주문 ID 중복 체크) | 단순함 + 멱등성 보장 |
| 시각 버퍼 | 30분 | 경계 주문 누락 방지 |
| 클래스 판별 | branduid 대조 (Sheets 매핑) | 정확성, 추가 API 호출 불필요 |
| 옵션 파싱 | "YYYY-MM-DD 오전/오후 N시" 패턴 우선 | 사람 읽기 + 기계 파싱 양립 |
| 재고 관리 | 메이크샵 네이티브 + 일 1회 배치 동기화 | 이중 관리 방지 |
| 주문 상태 업데이트 | 권장 (10 -> 20) | 관리자 가시성 + 이중 처리 방지 보조 |
| 적립금 지급 시점 | D+1 (수강 완료 다음 날) | 취소/환불 위험 제거 |
| API 호출 예산 | 한도의 7% 미만 (안전) | 500회/시간 충분 |

### 12.2 구현 우선순위

| 순서 | 구현 항목 | 선행 조건 |
|------|---------|---------|
| 1 | GAS에서 메이크샵 API 호출 가능 여부 확인 (IP 제한) | 관리자 설정 |
| 2 | 주문 조회 API 실제 응답 구조 확인 (curl 테스트) | API 접근 가능 |
| 3 | "시스템설정" 시트 + 폴링 로직 구현 | 응답 구조 확인 |
| 4 | 클래스 상품 판별 로직 (Sheets 매핑) | 클래스 메타 시트 |
| 5 | 주문 처리 파이프라인 (정산 기록 + 이메일) | 폴링 + 판별 완료 |
| 6 | 적립금 지급 배치 | 파이프라인 안정화 후 |
| 7 | 리마인더 + 후기 유도 | 이메일 발송 안정화 후 |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-02-21 | 초기 아키텍처 설계 (makeshop-planning-expert) |
