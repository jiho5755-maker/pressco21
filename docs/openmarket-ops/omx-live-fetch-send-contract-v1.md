# OMX Live Fetch/Send Contract v1

> 작성일: 2026-04-09
> 대상: 스마트스토어 + 메이크샵
> 목적: OMX 프런트가 실제 고객 문의/리뷰를 수집하고, 승인 후 일괄 발송할 수 있도록 fetch/send 계약을 고정한다.

---

## 1. 현재 범위

- 주문 처리: 사방넷
- OMX 운영 범위: 스마트스토어 + 메이크샵 문의/리뷰 응답
- 채널톡: 제외
- 쿠팡: 제외
- 11번가: 후속 검토

즉 OMX는 OMS가 아니라 `응답 운영 허브`다.

---

## 2. 프런트 설정 방식

운영 권장 방식은 `mini.pressco21.com/api/omx/*` same-origin reverse proxy다.

- 브라우저는 상대경로만 호출
- openclaw nginx가 `x-omx-source-key`를 서버단에서 주입
- n8n workflow는 `OMX_SHARED_KEY`가 맞는 요청만 처리

즉 shared key는 브라우저에 두지 않는다.

### 2.1 운영 runtime config 예시

```json
{
  "forceMock": false,
  "smartstore": {
    "fetchUrl": "/api/omx/smartstore/inquiries?onlyPending=true",
    "sendUrl": "/api/omx/smartstore/replies"
  },
  "makeshop": {
    "fetchUrl": "/api/omx/makeshop/items",
    "sendUrl": "/api/omx/makeshop/replies"
  }
}
```

### 2.2 개발/직접 호출용 env

`mini-app-v2`는 아래 env가 있으면 실조회/실발송을 시도하고, 없으면 목업 데이터로 fallback 한다.

```text
VITE_OMX_FORCE_MOCK=false
VITE_OMX_SMARTSTORE_FETCH_URL=https://n8n.pressco21.com/webhook/openmarket/smartstore/inquiries?onlyPending=true
VITE_OMX_SMARTSTORE_SEND_URL=https://n8n.pressco21.com/webhook/openmarket/smartstore/replies
VITE_OMX_MAKESHOP_FETCH_URL=https://n8n.pressco21.com/webhook/openmarket/makeshop/items
VITE_OMX_MAKESHOP_SEND_URL=https://n8n.pressco21.com/webhook/openmarket/makeshop/replies
```

직접 호출 모드에서만 아래 값을 함께 둔다.

```text
VITE_OMX_SHARED_KEY=...
```

클라이언트는 shared key가 설정된 경우에만 아래 헤더를 붙인다.

```text
x-omx-source-key: {VITE_OMX_SHARED_KEY}
```

---

## 3. Fetch 계약

### 3.1 공통 응답 형식

각 채널 fetch endpoint는 아래 형식으로 응답한다.

```json
{
  "items": [
    {
      "id": "external-item-id",
      "itemType": "inquiry",
      "sourceKind": "product_qna",
      "orderId": "",
      "productId": "11047089804",
      "productName": "부케 액자 DIY 웨딩액자 고체 하바리움액자 투명 아크릴 포토 케이스",
      "customerName": "shsh****",
      "subject": "상품 문의",
      "body": "하바리움 용액 1kg 주문시 A제 B제가 500g씩 오는걸까요?",
      "status": "OPEN",
      "answered": false,
      "receivedAt": "2026-04-08T20:16:00+09:00",
      "url": "https://sell.smartstore.naver.com/#/qna",
      "answerPreview": "",
      "rawCategory": "usage",
      "rawPayloadSummary": "questionId=669968949",
      "tags": ["실문의", "스마트스토어"]
    }
  ],
  "meta": {
    "adapter": "smartstore-inquiry-adapter-v1",
    "totalCount": 1,
    "polledAt": "2026-04-09T15:10:00+09:00"
  }
}
```

### 3.2 필수 필드

| 필드 | 설명 |
|------|------|
| `id` | 채널 원본 ID |
| `itemType` | `inquiry` 또는 `review` |
| `customerName` | 마스킹된 고객 식별값 |
| `subject` | 목록 제목 |
| `body` | 원문 |
| `status` | `OPEN` 또는 `ANSWERED` |
| `receivedAt` | ISO-8601 datetime |

### 3.3 선택 필드

| 필드 | 설명 |
|------|------|
| `sourceKind` | `customer_inquiry`, `product_qna`, `crm_board`, `review` 등 |
| `productId` | 상품 식별자 |
| `productName` | 상품명 |
| `orderId` | 주문번호 |
| `url` | 원문 바로가기 |
| `answered` | boolean |
| `answerPreview` | 기존 답변 본문 |
| `rawCategory` | 채널 카테고리 |
| `rawPayloadSummary` | 디버그 요약 |
| `tags` | UI 태그 |

---

## 4. 스마트스토어 fetch/send

### 4.1 fetch

- 기존 adapter 사용:
  - [smartstore-inquiry-adapter-v1.md](/Users/jangjiho/workspace/pressco21/docs/openmarket-ops/smartstore-inquiry-adapter-v1.md)
  - [smartstore-inquiry-adapter-n8n-draft.json](/Users/jangjiho/workspace/pressco21/docs/openmarket-ops/smartstore-inquiry-adapter-n8n-draft.json)
- OMX 프런트는 해당 응답을 그대로 소비한다.

### 4.2 send

스마트스토어 send endpoint는 아래 형식으로 받는다.

```json
{
  "mode": "DRY_RUN",
  "items": [
    {
      "id": "qna_669968949",
      "itemType": "inquiry",
      "sourceKind": "product_qna",
      "reply": "안녕하세요 :) 1kg 옵션 주문 시 A제와 B제가 각각 500g씩 발송됩니다.",
      "orderId": "",
      "productId": "11047089804",
      "productName": "부케 액자 DIY 웨딩액자 고체 하바리움액자 투명 아크릴 포토 케이스",
      "customerName": "shsh****",
      "title": "상품 문의",
      "receivedAt": "2026-04-08T20:16:00+09:00"
    }
  ]
}
```

권장 응답:

```json
{
  "results": [
    {
      "id": "qna_669968949",
      "ok": true,
      "message": "DRY_RUN 완료",
      "externalStatus": "OPEN",
      "statusCode": 200
    }
  ],
  "meta": {
    "channel": "smartstore",
    "mode": "DRY_RUN"
  }
}
```

`LIVE_SEND`일 때는 아래를 만족해야 한다.

- 상품 문의: `PUT /v1/contents/qnas/:questionId` + `commentContent`
- 고객 문의: `POST /v1/pay-merchant/inquiries/:inquiryNo/answer`
- 고객 문의 body shape는 실문의 1건 확보 후 실측 고정

관련 자산:

- [smartstore-reply-adapter-n8n-draft.json](/Users/jangjiho/workspace/pressco21/docs/openmarket-ops/smartstore-reply-adapter-n8n-draft.json)

---

## 5. 메이크샵 fetch/send

### 5.1 fetch

메이크샵 fetch endpoint는 하나로 묶되, 내부적으로는 아래 원천을 합친다.

- 문의: `GET /list/open_api.html?mode=search&type=crm_board`
- 리뷰: `GET /list/open_api.html?mode=search&type=review`

권장 query:

```text
InquiryTimeFrom=2026-04-01 00:00:00
InquiryTimeTo=2026-04-09 23:59:59
page=1
limit=50
```

응답 `items`에는 아래 `sourceKind`를 써서 구분한다.

- 문의: `crm_board`
- 리뷰: `review`

관련 자산:

- [makeshop-adapter-v1.md](/Users/jangjiho/workspace/pressco21/docs/openmarket-ops/makeshop-adapter-v1.md)
- [makeshop-items-adapter-n8n-draft.json](/Users/jangjiho/workspace/pressco21/docs/openmarket-ops/makeshop-items-adapter-n8n-draft.json)

### 5.2 send

메이크샵 send endpoint는 아래 형식으로 받는다.

```json
{
  "mode": "LIVE_SEND",
  "items": [
    {
      "id": "mk-review-20260409-01",
      "itemType": "review",
      "sourceKind": "review",
      "reply": "소중한 후기 감사합니다.",
      "productName": "압화꽃 장미 믹스 세트",
      "customerName": "최**",
      "title": "후기 답변 초안 완료",
      "receivedAt": "2026-04-09T07:40:00+09:00"
    }
  ]
}
```

내부 실제 호출 기준:

- 문의 답변: `POST /list/open_api_process.html?mode=save&type=crm_board&process=reply`
- 게시판 댓글형 문의: `POST /list/open_api_process.html?mode=save&type=comment&process=store`
- 리뷰 답변: `POST /list/open_api_process.html?mode=save&type=review&process=store`
  - `save_type=answer`

권장 응답:

```json
{
  "results": [
    {
      "id": "mk-review-20260409-01",
      "ok": true,
      "message": "LIVE_SEND 완료",
      "externalStatus": "ANSWERED",
      "statusCode": 200
    }
  ],
  "meta": {
    "channel": "makeshop",
    "mode": "LIVE_SEND"
  }
}
```

관련 자산:

- [makeshop-reply-adapter-n8n-draft.json](/Users/jangjiho/workspace/pressco21/docs/openmarket-ops/makeshop-reply-adapter-n8n-draft.json)

---

## 6. DRY_RUN / LIVE_SEND 원칙

### 6.1 DRY_RUN

- 채널 write API를 실제로 호출하지 않는다.
- payload validation, 대상 건수, 대상 ID, message length 검증만 수행한다.
- 응답 message는 `DRY_RUN 완료`로 고정한다.

### 6.2 LIVE_SEND

- 사람이 OMX 화면에서 문구를 확인한 뒤에만 실행한다.
- 실패 건은 개별 `results`에 남긴다.
- 프런트는 `ok=true`인 건만 `sent`로 전환한다.

---

## 7. 프런트 처리 규칙

- fetch endpoint가 하나도 없으면 목업 데이터 fallback
- fetch endpoint가 일부만 성공하면 `PARTIAL` 모드
- send endpoint가 없는 채널은 일괄 발송 대상에서 자동 제외
- 상태 전환:
  - `DRY_RUN` 성공: `approval_pending` 유지
  - `LIVE_SEND` 성공: `sent`
  - 실패: 기존 상태 유지 + 메모에 실패 사유 누적

---

## 8. 다음 작업

1. 스마트스토어 send webhook draft 작성
2. 메이크샵 fetch/send webhook draft 작성
3. OMX 화면 env 주입 후 Oracle/n8n에서 실조회 연결
4. 메이크샵 safe 케이스 1건으로 LIVE_SEND 검증
