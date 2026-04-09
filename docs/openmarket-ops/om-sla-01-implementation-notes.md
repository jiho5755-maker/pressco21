# OM-SLA-01 구현 메모

## 1. 목적

이 문서는 [OM-SLA-01 DDL](/Users/jangjiho/workspace/pressco21/docs/openmarket-ops/om-sla-01-nocodb-ddl.sql)과 [OM-SLA-01 n8n draft](/Users/jangjiho/workspace/pressco21/docs/openmarket-ops/om-sla-01-n8n-draft.json)를 실제 운영 자산으로 옮길 때 필요한 연결 규칙을 정리한 보조 문서다.

범위는 `문의 수집`, `SLA 계산`, `담당자 라우팅`, `텔레그램 알림`까지다.

---

## 2. 이 draft가 전제하는 아키텍처

`OM-SLA-01`은 채널 API를 직접 다루는 워크플로우가 아니라, `채널별 adapter`를 뒤에 꽂을 수 있는 코어 오케스트레이터로 설계했다.

즉 실제 운영 구조는 아래다.

```text
쿠팡 API / 스마트스토어 API / 11번가 API / 메이크샵 문의원천
→ 채널별 adapter 또는 poller
→ OM-SLA-01 코어 워크플로우
→ NocoDB om_inquiry_queue
→ 텔레그램 알림
```

초기에는 adapter를 아래 2가지 중 하나로 두면 된다.

1. 채널별 별도 n8n webhook / workflow
2. 외부 스크립트 또는 mini.pressco21.com 내부 API

코어 워크플로우는 adapter가 아래 형식으로만 응답하면 된다.

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

---

## 3. 권장 환경변수

워크플로우 draft는 아래 env를 기준으로 작성했다.

| 이름 | 용도 |
|------|------|
| `NOCODB_TOKEN` | NocoDB API 인증 |
| `OMX_SOURCE_SHARED_KEY` | adapter 호출 공통 인증 헤더 |
| `OM_FETCH_SMARTSTORE_INQUIRIES_URL` | 스마트스토어 문의 adapter URL |
| `OM_FETCH_COUPANG_INQUIRIES_URL` | 쿠팡 문의 adapter URL |
| `OM_FETCH_11ST_INQUIRIES_URL` | 11번가 문의 adapter URL |
| `OM_FETCH_MAKESHOP_INQUIRIES_URL` | 메이크샵 문의 adapter URL |
| `OM_DEFAULT_MANAGER_CHAT_ID` | 기본 관리자 텔레그램 chat id |

텔레그램 credential은 draft에서 `PRESSCO21-Telegram-Bot` 이름을 사용했다. 운영 서버에 이름이 다르면 import 후 교체하면 된다.

스마트스토어 1차 연결 예시:

```text
OM_FETCH_SMARTSTORE_INQUIRIES_URL=https://n8n.pressco21.com/webhook/openmarket/smartstore/inquiries?onlyPending=true
```

스마트스토어는 2026-04-09 실계정 검증 기준 아래 형식이 확인됐다.

- 고객 문의: `startSearchDate`, `endSearchDate`는 `YYYY-MM-DD`
- 상품 문의: `fromDate`, `toDate`는 `YYYY-MM-DDTHH:mm:ss+09:00`
- 현재 계정에서는 `SELF` 토큰으로도 조회/상품 문의 답변이 동작했다.

---

## 4. DDL에서 Phase 1 문서보다 확장한 필드

상세 설계 문서의 `om_inquiry_queue`보다 아래 필드를 추가했다.

| 필드 | 이유 |
|------|------|
| `external_inquiry_id` | 채널 원본 ID를 `inquiry_uid` 외에 분리 저장해 디버깅을 쉽게 함 |
| `thread_key` | 동일 고객/주문 문의를 묶기 위한 thread 키 |
| `external_status` | 채널 원본 상태와 내부 SLA 상태를 분리 |
| `sla_progress_rate` | SLA 진행률 카드/정렬용 |
| `last_alert_stage` | 50/80/breach 중복 발송 방지 |
| `first_warning_sent_at` | 50% 알림 이력 |
| `final_warning_sent_at` | 80% 알림 이력 |
| `breach_notified_at` | breach 알림 이력 |
| `last_polled_at` | adapter 최신 반영 시각 추적 |
| `routing_version` | 라우팅 규칙 변경 추적 |
| `source_payload_json` | 채널 원문 저장 |
| `metadata_json` | adapter version, 추가 링크, channel flags 저장 |

핵심은 `알림 중복 방지`와 `채널 원문 보관`이다.

---

## 5. SLA 계산 원칙

draft는 아래 세 가지 holiday policy를 지원하도록 코드가 짜여 있다.

1. `CALENDAR_HOURS`
2. `BUSINESS_HOURS`
3. `WEEKDAY_BUSINESS_HOURS`

다만 운영 초기에는 복잡도를 낮추기 위해 `smartstore`, `coupang`, `11st`, `makeshop` 모두 `CALENDAR_HOURS`로 시작하는 편이 안전하다.

이유:

- 채널 SLA는 실제로 자연시간 기준 대응 압박이 큼
- 휴일/야간 보정이 들어가면 운영자 기대와 실제 채널 제약이 어긋날 수 있음
- Phase 1에서는 `놓치지 않는 것`이 더 중요함

즉 DDL은 확장 가능하게 열어두고, 정책 seed는 단순하게 두는 방식이다.

---

## 6. 라우팅 규칙 권장

초기에는 `문의 유형`만으로 라우팅하고, keyword regex는 나중에 붙인다.

1차 권장 유형:

- `delivery`
- `stock`
- `usage`
- `exchange`
- `return`
- `etc`

keyword regex는 Phase 1.1에서 아래 순서로 붙이면 된다.

- 배송: `배송|출고|송장|언제 오나요`
- 재고: `품절|재입고|입고`
- 사용법: `사용법|비율|굳나요|혼합|경화`
- 반품/교환: `반품|교환|환불`

---

## 7. 검증 순서

실행 전 검증은 아래 순서를 권장한다.

1. NocoDB에 3개 테이블 생성
2. seed insert 반영
3. adapter URL 1개만 먼저 연결
4. 스마트스토어 adapter 단독 호출로 `items` 응답 확인
5. OM-SLA-01 수동 실행
6. `om_inquiry_queue`에 신규 문의 1건 생성 확인
7. 텔레그램 신규 알림 확인
8. `due_at`를 현재 시각 기준 과거로 조정해 warning/breach 재실행
9. PATCH가 중복 발송 없이 상태만 갱신되는지 확인

실계정 검증용 보조 스크립트:

- [naver_commerce_live_test.py](/Users/jangjiho/workspace/pressco21/tools/openmarket/naver_commerce_live_test.py)

---

## 8. 현재 draft의 의도적 제한

이 draft는 일부를 의도적으로 비워뒀다.

1. 채널별 API 세부 파라미터
2. 실제 텔레그램 chat id
3. error hub / dead-letter queue
4. 사방넷 reconciliation
5. 운영 UI 구현

즉 지금 산출물은 `OM-SLA-01 코어 설계 + import 가능한 skeleton`이다.

---

## 9. 다음 단계 권장

다음 구현 순서는 아래가 가장 자연스럽다.

1. 스마트스토어 adapter 먼저 구현
2. `OM-SLA-01` 실행 검증
3. 쿠팡 adapter 추가
4. 운영자용 NocoDB view 정리
5. 리뷰 답변 큐 `OM-REV-01`로 확장

스마트스토어 1차 자산:

- [smartstore-inquiry-adapter-v1.md](/Users/jangjiho/workspace/pressco21/docs/openmarket-ops/smartstore-inquiry-adapter-v1.md)
- [smartstore-inquiry-adapter-n8n-draft.json](/Users/jangjiho/workspace/pressco21/docs/openmarket-ops/smartstore-inquiry-adapter-n8n-draft.json)
