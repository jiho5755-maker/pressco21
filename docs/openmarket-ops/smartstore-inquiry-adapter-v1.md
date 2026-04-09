# 스마트스토어 문의 adapter v1

> 작성일: 2026-04-09
> 상태: Draft for Review
> 목적: 네이버 커머스API의 `고객 문의`와 `상품 문의(Q&A)`를 OM-SLA-01 코어가 소비할 수 있는 단일 응답 형식으로 변환한다.

---

## 1. 왜 별도 adapter가 필요한가

스마트스토어는 문의 데이터가 2개 surface로 나뉜다.

1. `고객 문의`
2. `상품 문의(Q&A)`

OM-SLA-01 코어는 채널별 세부 구조를 직접 알지 않고, 아래 공통 형식만 받는 것이 맞다.

```json
{
  "items": [
    {
      "id": "external-inquiry-id",
      "orderId": "optional",
      "productId": "optional",
      "productName": "optional",
      "customerName": "홍길동",
      "subject": "배송 문의",
      "body": "언제 출고되나요?",
      "status": "OPEN",
      "receivedAt": "2026-04-09T01:00:00+09:00",
      "url": "https://admin-channel.example/inquiry/1"
    }
  ]
}
```

즉 smartstore adapter의 책임은 아래 3가지다.

- 네이버 인증/조회 복잡도를 코어에서 숨긴다.
- `고객 문의`와 `상품 문의`를 하나의 리스트로 합친다.
- OM-SLA 공통 필드로 정규화한다.

---

## 2. 2026-04-09 기준 공식 확인 사항

네이버 공식 문서 기준으로 확인된 항목만 먼저 고정한다.

### 2.1 인증

- 인증 방식: OAuth 2.0 Client Credentials
- 토큰 URL: `https://api.commerce.naver.com/external/v1/oauth2/token`
- 인증 토큰 유형:
  - `SELF`: 솔루션사 시스템 전용
  - `SELLER`: 판매자 데이터 접근용
- 문서상 판매자 데이터 접근은 `SELLER` 토큰 설명이 붙어 있다.

### 2.2 고객 문의

- 조회 엔드포인트: `GET /v1/pay-user/inquiries`
- 답변 등록 엔드포인트: `POST /v1/pay-merchant/inquiries/:inquiryNo/answer`
- 구조체에서 공식 확인된 주요 필드:
  - `inquiryNo`
  - `category`
  - `title`
  - `inquiryContent`
  - `inquiryRegistrationDateTime`
  - `answerContent`
  - `answerRegistrationDateTime`
  - `answered`
  - `orderId`
  - `productNo`
  - `productName`
  - `productOrderOption`
  - `customerId`
  - `customerName`

### 2.3 상품 문의(Q&A)

- 조회 엔드포인트: `GET /v1/contents/qnas`
- 답변 등록/수정 엔드포인트: `PUT /v1/contents/qnas/:questionId`
- 구조체에서 공식 확인된 주요 필드:
  - `createDate`
  - `question`
  - `answer`
  - `answered`
  - `productId`
  - `productName`
  - `maskedWriterId`
  - `questionId`

---

## 3. 2026-04-09 실계정 검증 결과

아래는 `pressco21farm` 판매자 계정과 허용 IP 서버를 통해 실제 호출로 확인한 내용이다.

### 3.1 토큰/계정 조회

- 로컬 PC에서 직접 호출하면 `403 GW.IP_NOT_ALLOWED`가 발생했다.
- Oracle 서버 `158.180.77.201`에서 호출하면 토큰 발급과 API 호출이 정상 동작했다.
- 현재 계정 기준으로는 `SELF` 토큰만으로도 아래 호출이 모두 성공했다.
  - `GET /v1/seller/account`
  - `GET /v1/pay-user/inquiries`
  - `GET /v1/contents/qnas`
  - `PUT /v1/contents/qnas/:questionId`
- 실조회된 판매자 식별값:
  - `accountId`: `pressco21farm`
  - `accountUid`: `ncp_2sSExBvQycBXNCGTg1OdN`

이 결과는 현재 계정/권한/허용 IP 조합에서의 실측 결과다. 문서상 권장 토큰 설명과 다를 수 있으므로, 운영 설계는 `SELF 우선 검증, 필요 시 SELLER fallback`으로 두는 편이 안전하다.

### 3.2 고객 문의 조회 파라미터

실측 기준 고객 문의는 아래 query 형식에서 성공했다.

```text
GET /v1/pay-user/inquiries?startSearchDate=2026-04-01&endSearchDate=2026-04-09
```

- `startSearchDate`, `endSearchDate`는 `YYYY-MM-DD` 형식 `LocalDate`로 넣어야 한다.
- datetime 문자열을 넣으면 실패했다.
- 현재 계정에서는 조회 자체는 성공했지만, 기간 내 고객 문의는 `0건`이었다.

### 3.3 상품 문의(Q&A) 조회 파라미터

실측 기준 상품 문의는 아래 query 형식에서 성공했다.

```text
GET /v1/contents/qnas?fromDate=2026-04-08T00:00:00+09:00&toDate=2026-04-09T23:59:59+09:00
```

- `fromDate`, `toDate`는 offset 포함 datetime 문자열이 필요했다.
- date-only 값은 실패했다.
- 현재 계정에서 실제 미답변 상품 문의가 조회되었다.

### 3.4 상품 문의 답변

실측 기준 상품 문의 답변 API는 아래 body 형식에서 성공했다.

```json
{
  "commentContent": "답변 본문"
}
```

- `PUT /v1/contents/qnas/:questionId`
- `commentContent`가 필수 필드다.
- `2026-04-09`에 실제 문의 1건에 답변을 등록했고 `204` 응답을 받았다.
- 이후 재조회에서 해당 문의가 `answered: true`로 바뀐 것을 확인했다.

---

## 4. 이 문서에서의 추론과 가정

아래는 공식 문서와 실계정 검증으로도 아직 확정하지 못한 부분이다.

### 4.1 base URL

토큰 URL은 공식 문서에 `https://api.commerce.naver.com/external/v1/oauth2/token`으로 명시되어 있다.

이에 따라 조회 API도 아래로 호출하는 전제를 둔다.

- `https://api.commerce.naver.com/external/v1/pay-user/inquiries`
- `https://api.commerce.naver.com/external/v1/contents/qnas`

이 전제는 실제 실계정 호출로도 확인했다.

### 4.2 고객 문의 답변 body

고객 문의 답변 API는 공식 문서상 `POST /v1/pay-merchant/inquiries/:inquiryNo/answer`까지는 확인했지만, 현재 계정에서 실제 고객 문의가 없어 body shape는 실계정 검증을 아직 못 했다.

draft는 우선 `replyContent`를 가정하고, 실제 문의 발생 시점에 1회 더 실측해 고정한다.

### 4.3 관리자 URL

공식 구조체에 관리자 상세 URL 필드는 확인되지 않았다.

따라서 v1 adapter에서는 `url`을 기본 빈 문자열로 두고, 필요하면 별도 규칙 또는 프론트 링크 생성기로 보강한다.

---

## 5. 필드 매핑 기준

### 5.1 고객 문의 -> OM-SLA contract

| smartstore 고객 문의 | adapter 출력 |
|------|------|
| `inquiryNo` | `id` |
| `orderId` | `orderId` |
| `productNo` | `productId` |
| `productName` | `productName` |
| `customerName` | `customerName` |
| `title` | `subject` |
| `inquiryContent` | `body` |
| `answered` | `status` (`ANSWERED` or `OPEN`) |
| `inquiryRegistrationDateTime` | `receivedAt` |
| 없음 | `url` = `""` |

### 5.2 상품 문의(Q&A) -> OM-SLA contract

| smartstore 상품 문의 | adapter 출력 |
|------|------|
| `questionId` | `id` |
| 없음 | `orderId` = `""` |
| `productId` | `productId` |
| `productName` | `productName` |
| `maskedWriterId` | `customerName` |
| 고정값 | `subject` = `"상품 문의"` |
| `question` | `body` |
| `answered` | `status` (`ANSWERED` or `OPEN`) |
| `createDate` | `receivedAt` |
| 없음 | `url` = `""` |

### 5.3 추가 메타데이터

OM-SLA 코어는 공통 필드만 요구하지만, adapter는 아래 메타를 함께 반환하는 것이 좋다.

```json
{
  "sourceKind": "customer_inquiry",
  "answered": false,
  "answerPreview": "",
  "rawCategory": "배송"
}
```

권장 이유:

- 라우팅 보정에 도움된다.
- 상품 문의와 고객 문의를 운영 화면에서 구분할 수 있다.
- 이후 자동 답변/승인 큐로 확장하기 쉽다.

---

## 6. adapter 출력 예시

```json
{
  "items": [
    {
      "id": "123456789",
      "orderId": "2026040912345678",
      "productId": "99887766",
      "productName": "압화꽃 장미 세트",
      "customerName": "김*수",
      "subject": "배송 문의",
      "body": "언제 출고되나요?",
      "status": "OPEN",
      "receivedAt": "2026-04-09T08:11:24.000+09:00",
      "url": "",
      "sourceKind": "customer_inquiry",
      "answered": false,
      "rawCategory": "배송"
    },
    {
      "id": "qna_22334455",
      "orderId": "",
      "productId": "11223344",
      "productName": "레진 입문 키트",
      "customerName": "ab***",
      "subject": "상품 문의",
      "body": "초보자도 사용 가능한가요?",
      "status": "OPEN",
      "receivedAt": "2026-04-09T07:52:10.000+09:00",
      "url": "",
      "sourceKind": "product_qna",
      "answered": false,
      "rawCategory": ""
    }
  ]
}
```

---

## 7. v1 adapter 설계 원칙

### 7.1 unanswered 우선

운영 목적이 SLA 감시이므로, 기본값은 `미답변 건 우선`이 맞다.

권장 정책:

- 기본: `onlyPending=true`
- 옵션: `includeAnswered=true`일 때만 answered 포함

### 7.2 두 surface 모두 수집

스마트스토어에서 운영자가 체감하는 문의는 고객 문의와 상품 Q&A가 분리되어 있다.

따라서 Phase 1부터 두 surface를 한 번에 묶는 쪽이 운영 가치가 크다.

### 7.3 토큰 발급은 adapter 밖에서 분리 가능

스마트스토어 인증은 bcrypt 기반 전자서명이 필요하다.

이 로직은 n8n 안에 억지로 집어넣기보다 아래 둘 중 하나로 분리하는 편이 안전하다.

1. 별도 token helper
2. mini.pressco21.com 내부 서버에서 토큰 대행
3. 허용 IP 서버에서 토큰 발급 후 단기 캐시

실계정 검증 기준 현재는 `SELF` 토큰으로도 조회/상품 문의 답변이 가능했다. 다만 운영에서는 env 이름을 토큰 타입에 종속시키지 않고 `NAVER_COMMERCE_ACCESS_TOKEN` 같은 중립 이름으로 두는 편이 낫다.

이건 실제 운영 직전 단계에서 토큰 helper를 붙이면 된다.

---

## 8. webhook 계약

adapter draft webhook은 아래 query parameter를 받는 것을 권장한다.

| query | 의미 |
|------|------|
| `customerQuery` | 고객 문의 API raw query string passthrough |
| `qnaQuery` | 상품 문의 API raw query string passthrough |
| `customerStartDate` | 고객 문의 시작일. 기본값 없을 때 adapter가 최근 7일로 계산 |
| `customerEndDate` | 고객 문의 종료일. 기본값 없을 때 adapter가 오늘로 계산 |
| `qnaFromDate` | 상품 문의 시작 datetime. 기본값 없을 때 adapter가 최근 48시간으로 계산 |
| `qnaToDate` | 상품 문의 종료 datetime. 기본값 없을 때 adapter가 현재 시각으로 계산 |
| `onlyPending` | `true/false`, 기본 `true` |

예시:

```text
/webhook/openmarket/smartstore/inquiries?onlyPending=true
```

```text
/webhook/openmarket/smartstore/inquiries?onlyPending=true&customerQuery=startSearchDate%3D2026-04-01%26endSearchDate%3D2026-04-09&qnaQuery=fromDate%3D2026-04-08T00%253A00%253A00%252B09%253A00%26toDate%3D2026-04-09T23%253A59%253A59%252B09%253A00
```

---

## 9. 남아 있는 확인 항목

실구현 전에 아래 3개는 꼭 확인해야 한다.

1. 고객 문의 답변 API body shape 실측
2. 스마트스토어센터 관리자 상세 URL 생성 가능 여부
3. 운영 서버에서 토큰 발급 helper를 어떤 형태로 둘지 확정

---

## 10. 권장 다음 단계

1. 이 문서 기준으로 `smartstore-inquiry-adapter-n8n-draft.json`을 기본 날짜 계산형으로 정리
2. `tools/openmarket/naver_commerce_live_test.py`를 기준으로 허용 IP 서버 실계정 검증 루틴을 남긴다
3. `OM_FETCH_SMARTSTORE_INQUIRIES_URL`를 이 adapter webhook으로 교체
4. OM-SLA-01 수동 실행으로 신규 문의 생성과 텔레그램 알림을 검증한다

---

## 11. 공식 참고 소스

- [네이버 커머스API 인증](https://apicenter.commerce.naver.com/docs/auth)
- [네이버 커머스API 고객 문의 조회](https://apicenter.commerce.naver.com/docs/commerce-api/current/%EA%B3%A0%EA%B0%9D-%EB%AC%B8%EC%9D%98-%EC%A1%B0%ED%9A%8C)
- [네이버 커머스API 고객 문의 답변 등록](https://apicenter.commerce.naver.com/docs/commerce-api/2.74.0/insert-inquiry-answer-pay-merchant)
- [네이버 커머스API 상품 문의](https://apicenter.commerce.naver.com/docs/commerce-api/current/%EC%83%81%ED%92%88-%EB%AC%B8%EC%9D%98)
