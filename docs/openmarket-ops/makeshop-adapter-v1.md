# 메이크샵 adapter v1

> 작성일: 2026-04-09
> 상태: Draft for Review
> 목적: 메이크샵의 `1:1 문의(crm_board)`와 `후기(review)`를 OMX fetch/send 계약으로 통일한다.

---

## 1. 범위

메이크샵에서 OMX가 다루는 surface는 2개다.

1. `crm_board`
2. `review`

이번 v1에서는 둘 다 `승인 후 직접 발송 후보`로 다룬다.

---

## 2. fetch 원천

### 2.1 문의

```text
GET /list/open_api.html?mode=search&type=crm_board
```

권장 파라미터:

- `InquiryTimeFrom`
- `InquiryTimeTo`
- `is_member`
- `page`
- `limit`

확인된 대표 필드:

- `date`
- `userid`
- `hname`
- `phone`
- `email`
- `subject`
- `content`
- `reply_yn`
- `board_name`

### 2.2 리뷰

```text
GET /list/open_api.html?mode=search&type=review
```

권장 파라미터:

- `InquiryTimeFrom`
- `InquiryTimeTo`
- `page`
- `limit`

확인된 대표 필드:

- `uid`
- `date`
- `userid`
- `hname`
- `score`
- `subject`
- `content`
- `reply_content`

---

## 3. OMX 정규화 기준

### 3.1 crm_board -> OMX item

| makeshop | OMX |
|------|------|
| `date` | `receivedAt` |
| `userid` | `sourcePayload.userid` |
| `hname` | `customerName` |
| `subject` | `subject` |
| `content` | `body` |
| `reply_yn` | `status` |

`sourceKind`는 `crm_board`로 고정한다.

### 3.2 review -> OMX item

| makeshop | OMX |
|------|------|
| `uid` | `id` |
| `date` | `receivedAt` |
| `hname` | `customerName` |
| `subject` | `subject` |
| `content` | `body` |
| `reply_content` | `answerPreview` |

`sourceKind`는 `review`로 고정한다.

---

## 4. send 원천

### 4.1 문의 답변

```text
POST /list/open_api_process.html?mode=save&type=crm_board&process=reply
```

필수 payload:

- `datas[0][date]`
- `datas[0][reply_content]`
- `datas[0][send_email]`
- `datas[0][send_sms]`

선택 payload:

- `datas[0][userid]`

### 4.2 리뷰 답변

```text
POST /list/open_api_process.html?mode=save&type=review&process=store
```

필수 payload:

- `uid`
- `save_type=answer`
- `reply_content`

---

## 5. 실운영 유의사항

- 메이크샵은 JSON이 아니라 form-urlencoded 형태로 보내는 편이 안전하다.
- `crm_board reply`는 원문의 `date` 값이 필요하므로 fetch 시 원문 메타를 반드시 보존해야 한다.
- OMX 프런트는 `sourcePayload`를 그대로 send webhook에 넘기도록 맞춰져 있다.

---

## 6. 연결 자산

- [makeshop-items-adapter-n8n-draft.json](/Users/jangjiho/workspace/pressco21/docs/openmarket-ops/makeshop-items-adapter-n8n-draft.json)
- [makeshop-reply-adapter-n8n-draft.json](/Users/jangjiho/workspace/pressco21/docs/openmarket-ops/makeshop-reply-adapter-n8n-draft.json)
- [makeshop_live_test.py](/Users/jangjiho/workspace/pressco21/tools/openmarket/makeshop_live_test.py)
