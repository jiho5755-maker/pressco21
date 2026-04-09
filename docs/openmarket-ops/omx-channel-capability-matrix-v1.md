# OMX 채널 Capability Matrix v1

> 작성일: 2026-04-09
> 목적: OMX 문의/리뷰 승인형 운영 도구의 v1 구현 범위를 채널별로 고정한다.

---

## 1. 실행 순서

이번 OMX 구현 순서는 아래로 고정한다.

1. 스마트스토어 + 쿠팡 + 메이크샵 자동화 검증 및 1차 구현
2. 채널톡 연동 검토
3. 11번가 연동은 고객센터 답변 또는 추가 문서 확보 후 진행

핵심 원칙:

- 자동 발송 금지
- 모든 write는 `사람 승인 후 발송`
- 채널별 capability를 설정값으로 분리
- `가능한 채널`과 `초안만 가능한 채널`을 UI에서 명확히 구분

---

## 2. Capability 기준

### 2.1 필드 정의

| 필드 | 의미 |
|------|------|
| `ingest_mode` | `api`, `webhook`, `scrape`, `manual` 중 하나 |
| `send_mode` | `direct_send`, `manual_send`, `draft_only`, `disabled` 중 하나 |
| `validation_status` | `verified`, `doc_only`, `template_verified`, `blocked`, `pending` 중 하나 |

### 2.2 상태 해석

- `verified`: 실계정 또는 실제 시스템에서 동작을 직접 확인함
- `doc_only`: 공식 문서상 가능하나 아직 Pressco21 계정으로 실검증 전
- `template_verified`: 저장소 템플릿/관리자 문서로 구조는 확인했으나 API write는 미검증
- `blocked`: 가격/권한/문서 부족 등으로 현재 진행 중단
- `pending`: 후속 채널 또는 문의 회신 대기

---

## 3. 채널 Capability Matrix

| channel | item_type | ingest_mode | send_mode | validation_status | 현재 판단 | blocker | next_action |
|------|------|------|------|------|------|------|------|
| smartstore | inquiry | api | direct_send | verified | v1 핵심 채널 | 고객문의 답변 body 실측 일부 미완 | OM adapter + 승인형 발송 연결 |
| smartstore | review | manual | draft_only | blocked | 초안 생성만 우선 | 공개 리뷰 답변 API 미확인 | 운영자 수동 반영 큐로 처리 |
| coupang | inquiry | api | direct_send | doc_only | v1 핵심 채널 | Pressco21 access/secret/vendorId/wingId 미주입 | 실키 확보 후 `onlineInquiries`/`callCenterInquiries` live probe |
| coupang | review | manual | draft_only | blocked | 초안 생성만 우선 | 공개 리뷰 답변 API 미확인 | 리뷰 큐만 먼저 구현 |
| makeshop | inquiry | api | direct_send | doc_only | v1 핵심 채널로 상향 | 실write는 아직 미실행 | `crm_board/reply` + `comment/store`를 승인 후 실제 전송으로 검증 |
| makeshop | review | api | direct_send | doc_only | 승인형 답변 채널 | 실write는 아직 미실행 | `review/store` + `save_type=answer`를 승인 후 실제 전송으로 검증 |
| channeltalk | chat | webhook | direct_send | blocked | 가격 검토 전 보류 | 무료 플랜에서 Open API/Webhook 운영 가능 여부 불확실 | 유료/체험 가능 시 활성화, 아니면 제외 |
| 11st | inquiry | manual | disabled | pending | 이번 단계 제외 | 공개 문의 답변 API 미확인 | 고객센터/추가 문서 확보 후 재평가 |

---

## 4. 메이크샵 검증 결론

### 4.1 확인된 사실

- 메이크샵 상품 상세 템플릿에는 `review_board`, `qna_board`, `review_board_comment`, `qna_board_comment` 구조가 존재한다.
- 즉 자사몰 후기/문의와 답글 개념 자체는 메이크샵 게시판 구조로 운영되고 있다.
- 공식 Open API 문서에는 게시판/1:1 게시판/후기 read-write가 모두 존재한다.
- Oracle 운영 서버의 실제 env에서 메이크샵 실키가 확인되었고, read-only probe도 통과했다.
- 문서상 확인된 핵심 스펙:
  - `GET /list/open_api.html?mode=search&type=crm_board`
    - `permission=search_board`
    - 1:1 게시판 조회
  - `POST /list/open_api_process.html?mode=save&type=crm_board&process=reply`
    - `permission=process_board`
    - `reply_content`, `send_email`, `send_sms` 기반 1:1 답변 등록
  - `POST /list/open_api_process.html?mode=save&type=comment&process=store`
    - `permission=process_board`
    - 게시글 댓글 등록/수정/삭제
  - `GET /list/open_api.html?mode=search&type=review`
    - `permission=search_board`
    - 코멘트 평점타입 후기 조회
  - `POST /list/open_api_process.html?mode=save&type=review&process=store`
    - `permission=process_board`
    - `save_type=answer`, `reply_content` 기반 후기 답변 처리

### 4.2 현재 결론

메이크샵은 더 이상 `수동 처리 전용`으로 볼 이유가 없다. 공식 문서 기준으로는 `문의/리뷰 direct send`가 가능하다.

따라서 현재 capability는 아래로 올린다.

- `ingest_mode`: `api`
- `send_mode`: `direct_send`
- `validation_status`: `doc_only`
- 운영 방식:
  - OMX에서 초안을 생성한다.
  - 직원이 수정/승인한다.
  - live send가 열려 있으면 메이크샵 Open API로 전송한다.
  - 실계정 검증 전까지는 `DRY_RUN` 기본 유지.

### 4.3 아직 남은 공백

- 로컬 `.secrets.env`의 `MAKESHOP_SHOPKEY`, `MAKESHOP_LICENSEKEY`는 실제 키가 아니라 참조값이라 로컬 직접 실행은 불가하다.
- 다만 Oracle 운영 서버의 `/home/ubuntu/n8n/.env`에는 실제 메이크샵 키가 있고, 아래 read-only probe는 성공했다.
  - `GET type=board_code` → `return_code=0000`, `count=12`
  - `GET type=crm_board` + `is_member=MEMBER` → `return_code=0000`, `count=3`
  - `GET type=review` → `return_code=0000`, `count=0`
- 즉 메이크샵은 `실read 검증 완료 + write 문서 확인 완료` 상태다.
- 마지막 남은 한 단계는 고객 노출을 수반하는 `실write`를 승인된 테스트 케이스로 1회 실행하는 것이다.
- 관리자 화면 브라우저 자동화는 이제 필수가 아니다. Open API direct send가 우선 경로다.

---

## 5. 쿠팡 검증 상태

쿠팡 공개 문서 기준:

- 상품별 고객문의 조회/답변 API 존재
- 고객센터 문의 조회/답변/확인 API 존재
- 리뷰 답변 API는 현재 확인되지 않음
- Open API 자체는 무료라고 Coupang FAQ에 명시되어 있다.

현재 blocker:

- 문의/고객센터 답변 문서는 확인 완료
- 다만 Pressco21용 `access key / secret key / vendorId / wingId`가 현재 로컬 `.secrets.env`와 Oracle 핵심 env에서 확인되지 않았다.

다음 액션:

- key / vendorId / wingId 확보 후 live probe
- `coupang_live_test.py`로 read-only 조회와 reply payload preview부터 연결

---

## 6. 채널톡 검토 결론

### 5.1 공식 문서 기준

- `List of UserChats`: 가능
- `Send a message to a UserChat`: 가능
- `Webhook events`: 가능

즉 기술적으로는 OMX에 넣을 수 있다.

### 5.2 가격/플랜 기준 현재 판단

채널톡 가격 페이지 기준:

- `FREE` 플랜은 `Live chat`, `Team messenger`, `Meet`만 명시
- `Open API, Webhooks`는 유료 플랜 기능 비교 영역에 노출

따라서 현재 판단은 아래다.

- 개발/테스트: 체험 또는 유료 플랜이면 가능
- 무료 플랜만으로 운영: 불확실하므로 기본 보류

즉 v1에서는 아래 정책으로 둔다.

- 유료 또는 체험 가능하면 `enabled`
- 아니면 `disabled`

### 5.3 무료 불가 시 대안

1. 채널톡 새 메시지 알림을 이메일/텔레그램으로 우회 수집
2. 운영자는 OMX에서 초안만 보고 채널톡 관리자에서 수동 답변
3. 이 대안도 실효성이 낮으면 v1 범위에서 제외

---

## 7. 11번가 결론

- 공개 Open API 센터 기준으로는 상품/주문/클레임/기획전/전시/사은품/긴급알리미만 확인
- 문의/고객센터 답변 API는 현재 확인 불가
- 따라서 이번 OMX v1에서는 제외

재진입 조건:

- 고객센터 회신 확보
- 추가 셀러 전용 문서 확보
- 실제 문의 reply API 확인

---

## 8. v1 범위

### 7.1 포함

- 스마트스토어 문의 승인형 발송
- 쿠팡 문의 승인형 발송 구조
- 메이크샵 문의/리뷰 승인형 direct send 구조
- 채널별 capability 표시
- DRY_RUN / LIVE_SEND 안전장치
- 감사 로그

### 7.2 제외

- 11번가 direct integration
- 리뷰 자동 direct send
- 메이크샵 관리자 브라우저 자동화 write
- 채널톡 무료 플랜 불확실 상태에서의 강제 연동

---

## 9. 다음 구현 기준

UI는 아래를 반드시 드러내야 한다.

1. `이 항목은 직접 발송 가능`
2. `이 항목은 초안만 가능`
3. `이 항목은 수동 처리 필요`

즉 OMX는 단순 inbox가 아니라, 채널 capability를 운영자가 즉시 이해하게 만드는 컨트롤 타워여야 한다.

---

## 10. 근거

내부 소스:

- [smartstore-inquiry-adapter-v1.md](/Users/jangjiho/workspace/pressco21/docs/openmarket-ops/smartstore-inquiry-adapter-v1.md)
- [om-sla-01-implementation-notes.md](/Users/jangjiho/workspace/pressco21/docs/openmarket-ops/om-sla-01-implementation-notes.md)
- [quick-order/index.html](/Users/jangjiho/workspace/pressco21/makeshop-skin/pages/quick-order/index.html#L923)
- [quick-order/index.html](/Users/jangjiho/workspace/pressco21/makeshop-skin/pages/quick-order/index.html#L1297)
- [makeshop-api-architecture.md](/Users/jangjiho/workspace/pressco21/docs/파트너클래스/makeshop-api-architecture.md)
- [.secrets.env](/Users/jangjiho/workspace/pressco21/.secrets.env)
- [makeshop_live_test.py](/Users/jangjiho/workspace/pressco21/tools/openmarket/makeshop_live_test.py)
- [coupang_live_test.py](/Users/jangjiho/workspace/pressco21/tools/openmarket/coupang_live_test.py)

공식/외부 소스:

- https://apicenter.commerce.naver.com/docs/commerce-api/current
- https://developers.coupangcorp.com/hc/en-us/articles/360033643314-CS-API-Workflow
- https://developers.coupangcorp.com/hc/ko/articles/360033400754-%EC%83%81%ED%92%88%EB%B3%84-%EA%B3%A0%EA%B0%9D%EB%AC%B8%EC%9D%98-%EC%A1%B0%ED%9A%8C
- https://developers.coupangcorp.com/hc/ko/articles/360033645174
- https://developers.coupangcorp.com/hc/ko/articles/360034156233-%EC%BF%A0%ED%8C%A1-%EA%B3%A0%EA%B0%9D%EC%84%BC%ED%84%B0-%EB%AC%B8%EC%9D%98%EB%8B%B5%EB%B3%80
- https://developers.coupangcorp.com/hc/en-us/articles/360033461914-Creating-HMAC-Signature
- https://developers.coupangcorp.com/hc/en-us/articles/360023110393-Do-I-have-to-pay-for-Coupang-open-API-service
- https://openapi.makeshop.co.kr/docs
- https://openapi.makeshop.co.kr/guide/documents/find_guide/90
- https://openapi.makeshop.co.kr/guide/documents/find_guide/93
- https://openapi.makeshop.co.kr/guide/documents/find_guide/95
- https://openapi.makeshop.co.kr/guide/documents_test/openapi/24
- https://openapi.makeshop.co.kr/guide/documents_test/openapi/26
- https://channel.io/en/pricing
- https://developers.channel.io/docs/list-of-userchats
- https://developers.channel.io/docs/send-a-message-to-a-userchat
