# PRESSCO21 오픈마켓 API 운영 레퍼런스

> 작성일: 2026-04-17  
> 범위: 매출 자동화, 전수조사, 백필, n8n 워크플로우, Google Sheets/NocoDB 반영  
> 목적: 앞으로 바이브 코딩/자동화 수정 시 API 한도와 조회 기준을 모르고 실수하지 않도록 하는 전역 운영 문서

---

## 0. 최우선 원칙

1. **대시보드/구글시트는 API를 직접 반복 호출하지 않는다.**
   - API → n8n 수집 → NocoDB/일별 매출 시트 저장 → 대시보드 참조 구조로 둔다.
2. **전수조사는 예외 작업이다.**
   - 기본은 일별 증분 수집 + 누락일/의심일 백필.
3. **API 실패일은 0으로 덮어쓰지 않는다.**
   - 실패하면 기존 구글시트/NocoDB 값을 보존하고 실패일만 재시도한다.
4. **API 호출 전 IP 허용/시간대/한도를 먼저 확인한다.**
5. **원천별 귀속 기준을 명확히 둔다.**
   - 일별 매출 귀속은 원칙적으로 주문 발생일/결제일 기준.
   - 정산 기준 매출은 별도 정산 분석으로 분리한다.

---

## 1. 데이터 계층 원칙

### 1.1 Raw/API 계층

각 채널 API의 원본 응답을 가능한 한 보존한다.

- 주문번호
- 상품라인 식별자
- 주문일/결제일/배송완료일/구매확정일
- 상태
- 금액 필드
- API endpoint
- 수집 시각
- 오류 메시지

### 1.2 Daily Sales 계층

일별 매출 시트와 NocoDB `daily_sales`는 분석용 일별 집계값이다.

권장 컬럼 구조:

| 채널 | 원천 | 입력 방식 |
|---|---|---|
| 메이크샵 | MakeShop API | 자동 |
| 네이버 | Naver Commerce API | 자동 |
| 11번가 | 11st 복수 상태 API | 자동 |
| CRM/직접 | NocoDB CRM | 자동 |
| 쿠팡윙 | Coupang WING API | 자동, 휴지시간엔 기존값 유지 |
| 로켓배송 | 수기/별도자료 | 관리자 입력 |
| 기타 | 수기 | 관리자 입력 |

### 1.3 Dashboard 계층

대시보드는 Daily Sales 계층만 참조한다.
API를 직접 호출하지 않는다.

---

## 2. 전수조사 운영 규칙

전수조사 요청을 받으면 먼저 아래를 확인한다.

1. 기간이 며칠인가?
2. 이미 daily_sales에 값이 있는가?
3. 어느 채널만 의심되는가?
4. API 허용 IP가 어디인가?
5. 호출 한도/429 위험이 있는가?
6. 실패일을 보존할 캐시 파일을 만들었는가?
7. 결과를 바로 덮어쓸지, 검토 후 반영할지 정했는가?

전수조사 안전 절차:

```text
1. 채널별 collector 실행
2. 결과 JSON/CSV 저장
3. 오류일(error_days) 확인
4. 오류 없는 채널/일자만 업데이트 후보 생성
5. 기존 값과 diff 생성
6. 사용자 확인 또는 명확한 기준에 따라 Sheets/NocoDB 반영
7. 실패일은 0으로 덮지 않고 retry queue에 보관
```

---

## 3. MakeShop API

### 3.1 호출 위치

- 로컬 호출 가능
- 필요 키:
  - `MAKESHOP_SHOPKEY`
  - `MAKESHOP_LICENSEKEY`

### 3.2 주문 조회

Endpoint:

```text
GET http://foreverlove.co.kr/list/open_api.html
```

Query:

```text
mode=search
type=order
ver=2
InquiryTimeFrom=YYYY-MM-DD 00:00:00
InquiryTimeTo=YYYY-MM-DD 23:59:59
limit=500
```

Headers:

```text
Shopkey: ...
Licensekey: ...
```

### 3.3 매출 집계 기준

- `order_status` 또는 `ord_state`가 `Y`인 주문만 집계
- 금액 우선순위:
  1. `pay_price`
  2. `total_product_price`
  3. `start_price`

### 3.4 주의사항

- `N` 입금대기/미결제는 제외
- 주문 상태코드가 바뀔 수 있으므로 원본 응답 샘플 보관 권장
- 500건 이상 가능성이 있으면 pagination/limit 확장 확인 필요

---

## 4. Naver Commerce API

### 4.1 호출 위치/IP

- 로컬 맥 IP 호출 시 `GW.IP_NOT_ALLOWED` 발생 가능
- 운영 Oracle/n8n 허용 IP에서 호출해야 함

Observed error:

```text
GW.IP_NOT_ALLOWED: 호출이 허용되지 않은 IP입니다.
```

### 4.2 인증

Token endpoint:

```text
POST https://api.commerce.naver.com/external/v1/oauth2/token
```

서명 방식:

```text
password = clientId + '_' + timestamp
bcrypt hash(password, clientSecret)
base64 encode hash
```

Body:

```text
client_id={clientId}
timestamp={timestamp}
client_secret_sign={signature}
grant_type=client_credentials
type=SELF
```

### 4.3 주문 조회

Endpoint:

```text
GET https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders
```

Query 예시:

```text
from=YYYY-MM-DDT00:00:00.000%2B09:00
to=YYYY-MM-DDT23:59:59.999%2B09:00
```

Header:

```text
Authorization: Bearer {accessToken}
```

### 4.4 매출 집계 기준

- 제외 상태:
  - `CANCELED`
  - `RETURNED`
  - `EXCHANGED`
  - `CANCEL_REQUEST`
  - `RETURN_REQUEST`
  - `CANCEL_DONE`
- 매출 필드:
  - `productOrder.totalPaymentAmount`

### 4.5 한도/주의사항

- 일 단위 연속 조회를 많이 하면 HTTP 429 발생 가능
- 관측상 수십 회 연속 호출 후 429가 발생했다.
- 권장:
  - 14~16일 단위 청크
  - 일자별 호출 사이 최소 1.4초 이상 지연
  - 실패일만 재시도
  - 전수조사 결과를 바로 반영하지 말고 error_days 확인

---

## 5. 11번가 API

### 5.1 가장 중요한 원칙

`/ordservices/complete`만으로 정상 매출을 보면 안 된다.

`complete`는 **발주확인할 결제완료 주문**만 조회한다.  
이미 배송준비/배송중/배송완료/판매완료로 넘어간 주문은 누락된다.

### 5.2 정상 매출 조회 endpoint 묶음

정상 매출은 아래 endpoint를 합산한다.

```text
/ordservices/complete/{startTime}/{endTime}
/ordservices/packaging/{startTime}/{endTime}
/ordservices/shipping/{startTime}/{endTime}
/ordservices/dlvcompleted/{startTime}/{endTime}
/ordservices/completed/{startTime}/{endTime}
/ordservices/reservatecomplete/{startTime}/{endTime}
```

Base URL:

```text
https://api.11st.co.kr/rest
```

Header:

```text
openapikey: {ST11_API_KEY}
```

Time format:

```text
YYYYMMDDHHmm
```

예시:

```text
202604010000/202604072359
```

### 5.3 날짜 범위 제한

- 일부 주문 endpoint는 긴 기간 조회 시 오류 또는 누락 가능
- 권장: 7일 단위 청크

### 5.4 일별 귀속 기준

일별 매출 귀속은 `ordDt` 주문일 기준.

주의:

- `completed`는 구매확정일 `pocnfrmDt` 기준으로도 볼 수 있지만, 일별 매출 분석은 주문 발생일 기준이 더 자연스럽다.
- 정산 분석은 `settlementList`와 `stlDy`/`pocnfrmDt` 기준으로 별도 분리한다.

### 5.5 중복 제거

복수 endpoint에서 같은 주문 라인이 중복될 수 있으므로 반드시 dedupe한다.

Key:

```text
ordNo + '_' + ordPrdSeq
```

### 5.6 금액 필드 우선순위

주문 매출 기준:

1. `ordAmt`
2. `ordPayAmt`
3. `prdPayAmt`
4. `selPrc`

2026-04 감사에서 `ordAmt`가 기존 수기 매출과 가장 잘 맞았다.

### 5.7 클레임 조회

정상 매출 조회 후, 취소/반품/교환은 별도 endpoint로 확인한다.

```text
/claimservice/cancelorders/{startTime}/{endTime}
/claimservice/canceledorders/{startTime}/{endTime}
/claimservice/returnorders/{startTime}/{endTime}
/claimservice/returnedorders/{startTime}/{endTime}
/claimservice/exchangeorders/{startTime}/{endTime}
/claimservice/exchangedorders/{startTime}/{endTime}
```

철회/직권취소도 필요 시 추가:

```text
/claimservice/withdrawcanceledorders/{startTime}/{endTime}
/claimservice/retractretorders/{startTime}/{endTime}
/claimservice/retractexcorders/{startTime}/{endTime}
/claimservice/officecancellist/{startTime}/{endTime}
```

### 5.8 정산 조회는 매출 조회와 분리

정산 endpoint:

```text
/settlement/settlementList/{startTime}/{endTime}
```

날짜 형식은 주문 API와 다르게 `YYYYMMDD` 형식이 정상 동작했다.

정산 필드 예시:

- `selPrcAmt`
- `selPrc`
- `stlAmt`
- `deductAmt`
- `dlvAmt`
- `stlDy`
- `pocnfrmDt`

정산은 입금/수수료 분석용이며, 일별 주문 매출과 혼합하지 않는다.

### 5.9 2026-04-01~2026-04-16 실측 교훈

처음 `/complete`만 봤을 때는 0원처럼 보였지만 실제 정상 매출은 있었다.

확인된 정상 매출:

| 날짜 | 금액 |
|---|---:|
| 2026-04-01 | 2,100 |
| 2026-04-10 | 304,500 |
| 2026-04-13 | 222,500 |
| 2026-04-14 | 100,000 |
| 2026-04-15 | 78,500 |
| 합계 | 707,600 |

취소/반품/교환은 해당 기간 확인되지 않았다.

---

## 6. Coupang WING API

### 6.1 호출 위치/IP

- 로컬 맥 IP는 403 `IP_NOT_ALLOWED` 가능
- Oracle/n8n 허용 IP에서 호출해야 함

Observed local error:

```text
403 IP_NOT_ALLOWED
```

### 6.2 n8n Code 런타임 주의

n8n Code 런타임에 `URLSearchParams`가 없을 수 있다.

금지:

```javascript
new URLSearchParams(...)
```

권장:

```javascript
const enc = (v) => encodeURIComponent(String(v));
const queryString = (o) => Object.keys(o).map(k => enc(k) + '=' + enc(o[k])).join('&');
```

### 6.3 인증

Path:

```text
/v2/providers/openapi/apis/api/v5/vendors/{vendorId}/ordersheets
```

서명 메시지:

```text
signedDate + method + path + query
```

HMAC:

```text
HmacSHA256(secretKey, message)
```

Authorization header:

```text
CEA algorithm=HmacSHA256, access-key={accessKey}, signed-date={signedDate}, signature={signature}
```

### 6.4 주문 조회

Endpoint:

```text
GET https://api-gateway.coupang.com/v2/providers/openapi/apis/api/v5/vendors/{vendorId}/ordersheets
```

Query:

```text
createdAtFrom=YYYY-MM-DDT00:00+09:00
createdAtTo=YYYY-MM-DDT23:59+09:00
searchType=timeFrame
status={status}
```

### 6.5 상태값

`status=ALL` 또는 status 생략은 400이 발생했다.  
상태별 호출이 필요하다.

사용 상태:

```text
ACCEPT
INSTRUCT
DEPARTURE
DELIVERING
FINAL_DELIVERY
NONE_TRACKING
```

과거 확정 매출 전수조사에서는 `FINAL_DELIVERY`가 대부분을 잡는다.  
단, 당일/최근일은 다른 상태도 같이 봐야 한다.

### 6.6 매출 집계 기준

주문 라인 기준:

- 기본 금액: `orderItems[].orderPrice`
- fallback: `salesPrice` 또는 `unitSalesPrice` × active quantity

Active quantity:

```text
shippingCount - cancelCount - holdCountForCancel
```

중복 제거 key 예시:

```text
orderId + shipmentBoxId + vendorItemId + sellerProductId + itemName
```

### 6.7 한도/429

Coupang은 상태별로 전 기간을 빠르게 돌리면 429가 잦다.

권장 전략:

1. 일별 증분 수집을 기본으로 한다.
2. 과거 전수조사는 `FINAL_DELIVERY` 우선 저속 조회.
3. 최근 며칠만 다른 상태를 추가 조회.
4. 429가 발생한 날짜/상태는 기존값 보존 후 retry queue로 보낸다.
5. 0으로 덮어쓰지 않는다.

### 6.8 비즈니스 휴지시간

14:30~19:00(KST)은 사방넷 출고 연동 시간으로 본다.

이 시간에는 매출 자동화가 쿠팡 API를 호출하지 않는다.

처리:

```text
휴지시간 → 기존 쿠팡윙 값 유지
19:00 이후 → API 백필/복구
```

---

## 7. CRM / NocoDB 직접거래

### 7.1 원천

NocoDB CRM 명세표/거래 원장.

현재 조회 path:

```text
/api/v1/db/data/noco/pu0mwk97kac8a5p/ml81i9mcuw0pjzk
```

### 7.2 일별 귀속

- `invoice_date` 기준
- `payment_status == cancelled` 제외
- 금액: `total_amount`

### 7.3 주의사항

- 전화/방문/직접거래는 온라인몰처럼 보이지 않아도 실제 회사 매출이다.
- 대시보드에서는 특정 채널군에서 배제하지 않는다.
- 모든 채널 합계가 회사 매출 기준이다.

---

## 8. Google Sheets / NocoDB 반영 원칙

### 8.1 일별 매출 탭

| 열 | 의미 | 업데이트 방식 |
|---|---|---|
| C | 메이크샵 | API 자동 |
| D | 네이버 | API 자동 |
| E | 11번가 | 복수 endpoint API 자동 |
| F | CRM/직접 | NocoDB 자동 |
| G | 쿠팡윙 | API 자동, 휴지시간 기존값 유지 |
| H | 로켓배송 | 관리자 수기 |
| I | 기타 | 관리자 수기 |
| J | 일 합계 | C:I 합계 |
| K | 메모 | 보정/확인 메모 |

### 8.2 업데이트 금지 패턴

- API 오류가 난 날을 0으로 덮어쓰기 금지
- H/I 수동 입력을 API 전수조사로 덮어쓰기 금지
- 과거 확정값을 임의 재계산 없이 덮어쓰기 금지

### 8.3 반영 전 검증

업데이트 전 반드시 확인:

```text
error_days == 0 또는 실패일 제외 반영
채널별 기존값 대비 diff 생성
수동값 보존 여부 확인
NocoDB와 Sheets 동시 반영 필요 여부 확인
```

---

## 9. 권장 아키텍처

### 9.1 일별 증분 수집

매일 확정 시간에 전일 데이터만 수집.

```text
채널 API → n8n F23 → Sheets/NocoDB daily_sales → Dashboard
```

### 9.2 주간 백필

매주 최근 7~14일을 느린 속도로 재조회해 상태변경/구매확정/클레임 반영.

```text
n8n F26 → 최근 14일 API 재조회 → 차이만 PATCH
```

### 9.3 전수조사

예외 작업.

```text
collector artifact 생성 → 오류일 검증 → diff 검토 → 반영
```

---

## 10. Future Agent Checklist

매출 API 작업 전 반드시 체크:

- [ ] 이 작업이 전수조사인가, 증분수집인가?
- [ ] 네이버/쿠팡은 Oracle/n8n 허용 IP에서 실행 중인가?
- [ ] 쿠팡 호출 시간이 14:30~19:00이 아닌가?
- [ ] n8n Code에서 `URLSearchParams`를 쓰지 않았는가?
- [ ] 11번가는 `/complete` 단독 조회가 아닌가?
- [ ] 11번가 중복 제거 key가 있는가?
- [ ] 429 발생 시 기존값을 보존하는가?
- [ ] H/I 수동값을 덮어쓰지 않는가?
- [ ] 결과 JSON/CSV artifact를 남겼는가?
- [ ] Sheets와 NocoDB가 같은 기준으로 업데이트되는가?
