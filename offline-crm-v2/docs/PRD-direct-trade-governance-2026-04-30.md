# PRD — PRESSCO21 직접거래 상태·출고·입금 거버넌스 고도화

- 문서 버전: v1.0
- 작성일: 2026-04-30
- 대상 프로젝트: `offline-crm-v2`
- 대상 브랜치: `work/offline-crm/shipment-payment-governance-prd`
- 목적: 직접거래 CRM에서 출고, 수금, 후속입금, 예치금, 환불, 입금수집 예외, 세금계산서 상태를 관리자가 헷갈리지 않게 통합 관리한다.
- 범위: CRM 프론트엔드/상태 계산/검증/운영 데이터 dry-run. 운영 데이터 write는 반드시 dry-run 결과 확인 후 별도 승인으로 진행한다.

---

## 0. 팀미팅 결론

### 참여 관점

- 한지훈님: 요구사항, 우선순위, 직접거래 업무 목적 정리
- 박서연님: 수금, 예치금, 환불, 후속입금, 세금계산서 금액 기준 정리
- 김도현님: 실제 운영자가 보는 업무함, 월말점검, 출고확정 정리 흐름 정리
- 최민석님: 기존 코드 구조, 상태 모델, dry-run/apply/verify 아키텍처 정리
- 정유나님: 상태 배지, 입금수집함 UX, 후속입금 UX 정리
- 조현우님: 돈/세금 상태 변경의 감사·보안·롤백 요구사항 정리
- 유준호님: 단위/통합/E2E 검증 전략 정리

### 최종 합의

이 CRM은 범용 ERP가 아니라 PRESSCO21 직접거래를 안전하게 처리하는 내부 업무 도구다. 따라서 이번 고도화는 “자동으로 전부 처리”가 아니라 다음 원칙을 따른다.

1. 상태는 하나의 큰 값으로 합치지 않고 여러 축으로 분리한다.
2. 관리자가 다음 작업을 바로 알 수 있도록 배지와 업무함을 만든다.
3. 돈이 바뀌는 작업은 `fresh read → dry-run → confirm → apply → verify`로 처리한다.
4. 애매한 입금은 자동반영하지 않고 검토/수동 처리한다.
5. 초과입금은 매출이 아니라 예치금/환불대기로 분리한다.
6. 세금계산서 금액은 입금액이 아니라 명세표 품목/공급가액/세액/합계 기준이다.
7. 과거 완납 명세표 출고확정 정리는 dry-run 리포트 후 별도 승인으로 적용한다.

---

## 1. 배경과 문제 정의

### 1.1 현재 업무 문제

현재 CRM에는 명세표, 수금관리, 입금수집함, 고객 상세, 세금계산서 기능이 각각 존재하지만, 관리자가 실제로 궁금한 질문은 다음 네 가지다.

1. 물건이 나갔는가?
2. 돈을 받았는가?
3. 나중에 받을 돈인가, 예치금인가, 환불할 돈인가?
4. 세금계산서는 발급 가능한가, 이미 요청됐는가?

지금은 이 상태들이 화면마다 분산되어 있어 비전공자가 판단하기 어렵다.

### 1.2 실제 사례

#### 구례군 사례

- 입금액: 1,000,000원
- 명세표 금액: 743,500원
- 처리 기준: 743,500원은 명세표 완납, 256,500원은 예치금
- 결론: 입금액 전체를 매출 또는 세금계산서 금액으로 보면 안 된다.

#### 제시카플로라 사례

- 물건은 정상 출고됨
- 돈은 아직 들어오지 않음
- 결론: “미출고”가 아니라 `출고완료 + 미수 + 후속입금 예정`으로 관리해야 한다.

#### 김순자/서상견 예외 입금

- 입금자명이 실제 거래처 대표명과 다를 수 있음
- 동명이인이 많으면 자동 매칭이 위험함
- 결론: 이런 건은 자동처리하지 않고 수동 연결/검토 큐로 보낸다.

#### 쿠팡/플랫폼 정산 입금

- CRM 고객 입금이 아닌 플랫폼 정산금이 입금수집함에 섞일 수 있음
- 결론: 제외 수집 규칙과 제외 보관함이 필요하다.

---

## 2. 기존 구현 근거

### 2.1 이미 존재하는 상태와 기능

- 명세표 수금 상태는 `payment_status`로 `paid`, `partial`, `unpaid`를 사용한다.  
  근거: `offline-crm-v2/src/pages/Invoices.tsx:72-75`
- 출고 상태 배지는 `getInvoiceFulfillmentStatus()`를 통해 `ordered`, `preparing`, `shipment_confirmed`, `voided`를 표시한다.  
  근거: `offline-crm-v2/src/pages/Invoices.tsx:77-91`
- 세금계산서 상태는 `not_requested`, `requesting`, `requested`, `issued`, `failed`, `cancel_requested`, `cancelled`, `amended`를 사용한다.  
  근거: `offline-crm-v2/src/pages/Invoices.tsx:94-103`, `offline-crm-v2/src/lib/accountingMeta.ts:44-52`
- 명세표 회계 메타는 `[ACCOUNTING_INVOICE_META]`로 memo에 저장된다.  
  근거: `offline-crm-v2/src/lib/accountingMeta.ts:24-40`, `offline-crm-v2/src/lib/accountingMeta.ts:542-662`
- 고객 예치금/환불대기/입금자명 별칭/자동입금 제외 설정은 `[ACCOUNTING_CUSTOMER_META]`로 memo에 저장된다.  
  근거: `offline-crm-v2/src/lib/accountingMeta.ts:14-22`, `offline-crm-v2/src/pages/CustomerDetail.tsx:1556-1596`
- 출고확정은 fresh read 후 `buildShipmentConfirmedInvoiceMemo()`로 memo를 갱신한다.  
  근거: `offline-crm-v2/src/pages/Invoices.tsx:1020-1041`, `offline-crm-v2/src/lib/accountingMeta.ts:723-749`
- 입금수집함은 `exact`, `review`, `unmatched`, `applied` 상태를 갖고, 원격 검토 큐는 `review`, `unmatched`, `resolved`, `dismissed` 상태를 갖는다.  
  근거: `offline-crm-v2/src/lib/autoDeposits.ts:35-56`, `offline-crm-v2/src/pages/DepositInbox.tsx:700-706`
- 자동입금 후보 계산은 후보가 여러 개거나 애매하면 `review`로 보내는 구조가 있다.  
  근거: `offline-crm-v2/src/lib/autoDeposits.ts:400-520`
- 자동입금 운영 기준은 설정 화면에 이미 있다.  
  근거: `offline-crm-v2/src/pages/Settings.tsx:660-770`

### 2.2 현재 아쉬운 점

1. 출고확정 일괄 처리에는 dry-run 미리보기와 verify 리포트가 약하다.
2. 과거 완납 명세표 중 출고확정이 안 된 데이터가 남아 관리자가 헷갈릴 수 있다.
3. 후속입금 예정 기능은 일부 `paymentReminder`로 존재하지만 업무함/상태 배지로 충분히 드러나지 않는다.
4. 입금수집함의 “수동 완료”, “제외 규칙”, “제외 보관함”, “동명이인 안전장치”가 부족하다.
5. 로컬 수집함 제거는 감사 이력이 약하다.
6. 현재 입금수집함 코드 일부는 기존 예치금을 열린 명세표에 자동 상계할 수 있어, MVP에서는 더 명시적인 운영자 확인이 필요하다.
7. 상태 변경 이력을 모든 축에서 동일하게 추적하는 공통 `governanceEvents`가 없다.

---

## 3. 제품 목표

### 3.1 핵심 목표

- 관리자가 직접거래 건을 볼 때 `출고`, `수금`, `후속입금`, `예치금/환불`, `세금계산서`, `입금수집 예외`를 한눈에 이해한다.
- 애매한 입금은 자동처리하지 않고 사람이 안전하게 확인한다.
- 월말에 “정리되지 않은 건”을 프로그램이 먼저 보여준다.
- 돈/세금 상태 변경은 되돌릴 수 있도록 변경 이력을 남긴다.

### 3.2 성공 지표

- 과거 완납인데 출고확정 안 된 명세표를 dry-run으로 모두 식별할 수 있다.
- 출고완료 미수 건이 업무함에서 누락되지 않는다.
- 후속입금 예정일이 지난 건이 월말점검에 표시된다.
- 입금수집함에서 동명이인/가족명의/플랫폼 정산 입금이 자동반영되지 않는다.
- 초과입금 처리 시 명세표 수금액과 예치금/환불대기 금액이 분리된다.
- 세금계산서 발급 금액은 입금액과 무관하게 명세표 금액 기준으로 유지된다.

---

## 4. 비목표

MVP에서는 다음을 하지 않는다.

1. 복잡한 회계 분개장/ERP 수준 기능
2. 은행 API 완전 자동 수집
3. 모든 입금의 무조건 자동반영
4. 출고확정 즉시 세금계산서 자동발급
5. 대량 세금계산서 발행
6. 수정세금계산서 wizard 전체 자동화
7. 프론트엔드에 운영 인증키/바로빌 인증정보 저장 또는 노출
8. 운영 데이터 대량 write를 사용자 승인 없이 실행

---

## 5. 권장 상태 체계

상태는 `문서 구분`, `출고 상태`, `매출 인식 상태`, `수금 상태`, `후속입금 상태`, `입금수집 상태`, `예치금/환불 상태`, `세금계산서 상태`, `예외/감사 상태`의 축으로 나눈다.

### 5.1 문서 구분

| 축 | 저장 위치 | 권장 값 | 설명 |
|---|---|---|---|
| 문서 구분 | 기존 `status`/`receipt_type` | `invoice`, `quote`, `delivery`, `claim` 등 | 명세표/견적/납품/청구 문서 성격. 출고/수금 상태로 재사용 금지 |

### 5.2 출고 상태

| 내부 값 | 사용자 표시 | 설명 |
|---|---|---|
| 없음 | 기존매출 | 과거 데이터. 기존 매출 집계 유지 |
| `ordered` | 주문접수 | 명세표 생성 또는 주문 접수 |
| `preparing` | 출고준비 | 포장/출고 전 |
| `shipment_confirmed` | 출고완료 | 상품이 나갔고 매출 인식 대상 |
| `voided` | 취소 | 더 이상 처리하지 않음 |
| `adjusted` | 조정 | 정정/보정 필요 |

### 5.3 매출 인식 상태

| 내부 값 | 사용자 표시 | 설명 |
|---|---|---|
| 없음 | 기존 기준 | 과거 데이터 매출 인정 |
| `pending` | 매출대기 | 신규/출고 전 |
| `posted` | 매출반영 | 출고확정 완료 |
| `reversed` | 매출취소 | 취소/반품 |
| `adjusted` | 매출조정 | 금액/품목 조정 |

### 5.4 수금 상태

| 내부 값 | 사용자 표시 | 설명 |
|---|---|---|
| `unpaid` | 미입금 | 입금 없음 |
| `partial` | 일부입금 | 일부만 입금 |
| `paid` | 완납 | 명세표 잔액 없음 |
| 계산 상태 | 초과입금 확인필요 | 입금액이 명세표 잔액보다 큰 경우 예치금/환불대기 분리 필요 |

### 5.5 후속입금 상태

기존 `paymentReminder`를 운영 용어상 “후속입금 예정”으로 격상한다.

| 계산 조건 | 사용자 표시 | 설명 |
|---|---|---|
| 잔액 0 | 없음 | 받을 돈 없음 |
| 잔액 > 0, 출고완료, 예정일 없음 | 출고완료 미수 | 돈 받을 일정 확인 필요 |
| 잔액 > 0, 예정일 미래 | 후속입금 예정 | 약속된 입금 대기 |
| 잔액 > 0, 예정일 오늘 | 오늘 입금 확인 | 오늘 확인 대상 |
| 잔액 > 0, 예정일 지남 | 입금 약속 지남 | 고객 연락/입금수집함 확인 필요 |
| 잔액 0, 예정 등록됨 | 후속입금 완료 | 실제 수금 완료 |

### 5.6 입금수집 상태

| 내부 값 | 사용자 표시 | 설명 |
|---|---|---|
| `exact` | 정확 후보 | 단일 후보, 금액/입금자명 일치 |
| `review` | 검토 필요 | 다중 후보, 부분/초과입금, 이름 불일치 |
| `unmatched` | 미매칭 | 후보 없음 |
| `applied` | 반영 완료 | 명세표/고객에 반영됨 |
| `dismissed` | 제외 완료 | CRM 반영 대상 아님 |
| 신규 권장 | 수동 완료 | 이미 다른 방식으로 처리되어 금액 변경 없음 |
| 신규 권장 | 보류 | 고객 확인 전 임시 보류 |

### 5.7 예치금/환불 상태

| 이벤트 | 사용자 표시 | 설명 |
|---|---|---|
| `deposit_added` | 예치금 적립 | 초과입금 등으로 다음 주문용 금액 보관 |
| `deposit_used` | 예치금 사용 | 다음 명세표에서 차감 |
| `refund_pending_added` | 환불대기 등록 | 돌려줄 돈으로 분리 |
| `refund_paid` | 환불완료 | 실제 환불 처리 완료 |
| `refund_pending_cleared` | 환불대기 해제 | 대기 상태 정리 |

### 5.8 세금계산서 상태

| 내부 값 | 사용자 표시 | 설명 |
|---|---|---|
| `not_requested` | 미요청 | 아직 요청하지 않음 |
| `requesting` | 요청 중 | 바로빌 요청 처리 중 |
| `requested` | 요청됨 | 발급 요청 완료/상태 확인 필요 |
| `issued` | 발급완료 | 발급 완료 |
| `failed` | 실패 | 실패 사유 확인 필요 |
| `cancel_requested` | 취소요청 | 취소/상쇄 요청 중 |
| `cancelled` | 취소완료 | 발급취소 완료 |
| `amended` | 상쇄완료 | 수정세금계산서 상쇄 완료 |

---

## 6. 데이터 모델

### 6.1 저장 전략

MVP에서는 NocoDB 스키마를 크게 변경하지 않고 기존 memo meta 패턴을 공식화한다.

- invoice 상태: `[ACCOUNTING_INVOICE_META]`
- customer 예치금/환불/자동입금 설정: `[ACCOUNTING_CUSTOMER_META]`
- 입금수집 검토 큐: 기존 `autoDepositReviewQueue` 프록시 활용
- 장기 개선: `accounting_events` sidecar 테이블 검토

### 6.2 InvoiceAccountingMeta 확장안

기존 필드:

```ts
{
  depositUsedAmount: number,
  discountAmount?: number,
  customerAddressKey?: string,
  internalMemo?: string,
  fulfillmentStatus?: InvoiceFulfillmentStatus,
  shipmentConfirmedAt?: string,
  revenueRecognizedDate?: string,
  revenuePostedAt?: string,
  revenuePostingStatus?: InvoiceRevenuePostingStatus,
  salesLedgerId?: string,
  salesLedgerIdempotencyKey?: string,
  taxInvoiceStatus?: InvoiceTaxInvoiceStatus,
  taxInvoice?: InvoiceTaxInvoiceMeta,
  paymentReminder?: InvoicePaymentReminderState,
  paymentHistory: InvoicePaymentHistoryEntry[]
}
```

추가 권장 필드:

```ts
{
  governanceEvents?: GovernanceEvent[],
  paymentPromiseStatus?: 'none' | 'scheduled' | 'due_today' | 'overdue' | 'completed' | 'needs_review'
}
```

단, `paymentPromiseStatus`는 저장값보다 계산값 우선으로 둔다. 저장이 필요하면 수동 상태 강제용으로만 사용한다.

### 6.3 GovernanceEvent

```ts
interface GovernanceEvent {
  opId: string
  action:
    | 'shipment_confirm'
    | 'bulk_shipment_confirm'
    | 'payment_promise_upsert'
    | 'payment_promise_complete'
    | 'deposit_apply'
    | 'deposit_exclude'
    | 'manual_complete'
    | 'refund_pending_added'
    | 'refund_paid'
    | 'tax_invoice_request'
    | 'tax_invoice_cancel'
    | 'rollback'
  actor?: string
  at: string
  source: 'crm-ui' | 'n8n' | 'migration' | 'manual'
  beforeHash?: string
  afterHash?: string
  amount?: number
  relatedInvoiceId?: number
  relatedCustomerId?: number
  relatedQueueId?: string
  reason?: string
  rollbackOf?: string
}
```

### 6.4 고객 메타 확장안

기존 customer meta는 유지한다. 단, 자동입금 제외 규칙을 고객별 설정과 전역 설정으로 나눈다.

고객별:

- `depositorAliases`
- `autoDepositDisabled`
- `autoDepositPriority`

전역 설정 후보:

```ts
interface AutoDepositExclusionRule {
  id: string
  enabled: boolean
  matchType: 'sender_contains' | 'sender_exact' | 'memo_contains' | 'source_contains'
  pattern: string
  reason: 'platform_settlement' | 'duplicate' | 'not_customer_payment' | 'test' | 'other'
  note?: string
  createdAt: string
  createdBy?: string
}
```

MVP에서는 `Settings`의 자동입금 운영 메모 또는 설정 JSON에 저장할 수 있다. 추후 NocoDB settings row로 구조화한다.

---

## 7. 핵심 기능 요구사항

## 7.1 통합 상태 계산 유틸

### 요구사항

- 명세표 한 건을 입력받아 다음을 계산한다.
  - 문서 구분
  - 출고 상태
  - 매출 인식 상태
  - 수금 상태
  - 후속입금 상태
  - 세금계산서 상태
  - 다음 추천 액션
- 화면마다 같은 상태를 다르게 해석하지 않도록 `src/lib/tradeGovernance.ts` 같은 공통 유틸을 만든다.

### 추천 액션 예시

| 조건 | 추천 액션 |
|---|---|
| 출고준비 + 완납 | 출고완료 처리 |
| 출고완료 + 미수 + 예정일 없음 | 후속입금 예정 등록 |
| 출고완료 + 미수 + 예정일 지남 | 입금 확인/고객 연락 |
| 입금수집 review | 입금 후보 검토 |
| 출고완료 + 세금계산서 미요청 | 세금계산서 발급 가능 |
| 예치금/환불대기 있음 | 고객 잔액 확인 |

### Acceptance Criteria

- 같은 명세표는 명세표 목록, 고객 상세, 수금관리, 업무함, 월말점검에서 동일한 출고/수금/후속입금 상태를 표시한다.
- `current_balance`는 “이번 명세표 잔액”으로 정의한다.
- 잔액 계산은 `total_amount - paid_amount - depositUsedAmount`를 기준으로 한다.

---

## 7.2 과거 완납 명세표 출고확정 정리

### 요구사항

- “과거 완납 출고확정 점검” 기능을 제공한다.
- 대상 후보:
  - `payment_status = paid`
  - `paid_amount >= total_amount`
  - `current_balance = 0` 또는 계산 잔액 0
  - `fulfillmentStatus`가 없거나 `shipment_confirmed`가 아님
  - 취소/조정/무효가 아님
- 적용 전 dry-run 리포트를 보여준다.
- 운영 데이터 적용은 사용자가 리포트를 확인한 후 별도 승인해야 한다.

### Dry-run 리포트 필드

- 후보 건수
- 후보 합계 금액
- 제외 건수 및 사유
- 세금계산서 영향 건수
- 고객별 건수/합계
- 표본 목록
- apply 후 예상 변경 필드

### Apply 규칙

- 각 명세표를 apply 직전 `getInvoice(id)`로 fresh read한다.
- `buildShipmentConfirmedInvoiceMemo()`를 사용한다.
- apply 후 다시 읽어서 `fulfillmentStatus = shipment_confirmed`, `revenuePostingStatus = posted`를 verify한다.
- 이미 출고확정된 건은 skip한다.
- 부분 실패 시 성공/실패 리포트를 남긴다.

### Acceptance Criteria

- dry-run 실행만으로는 DB 값이 바뀌지 않는다.
- apply 후 같은 dry-run을 다시 실행하면 신규 후보가 0건이거나 이미 처리됨으로 제외된다.
- 출고확정 후 세금계산서 발급 가능 상태로 전환되는 건수가 리포트에 표시된다.

---

## 7.3 제시카플로라형 후속입금 예정 관리

### 요구사항

- 출고완료인데 미수/부분입금인 건을 `출고완료 미수`로 보여준다.
- 후속입금 예정일, 예정 금액, 내부 메모, 알림 여부를 등록할 수 있다.
- 기존 `paymentReminder`를 후속입금 예정 UI의 저장소로 활용한다.
- 예정일이 오늘이거나 지난 건은 업무함/월말점검에서 강조한다.
- 완납되면 후속입금 예정은 자동 완료 상태로 계산한다.

### UX 문구

- “출고는 완료되었지만 아직 받을 돈이 남아 있습니다. 입금 예정일을 등록하면 업무함과 월말점검에서 다시 알려드립니다.”
- 예정일 지남: “약속한 입금일이 지났습니다. 입금수집함에서 입금 여부를 확인하거나 고객에게 다시 연락하세요.”

### 제시카플로라 기대 상태

```text
출고상태: 출고완료
수금상태: 미입금 또는 일부입금
후속입금상태: 후속입금 예정
다음 액션: 입금 확인 / 예정 수정 / 입금수집함에서 찾기
```

### Acceptance Criteria

- 출고완료 + 잔액 > 0 + 예정일 있음이면 업무함에 `후속입금 예정`으로 표시된다.
- 예정일이 지났고 잔액이 남아 있으면 `입금 약속 지남`으로 표시된다.
- 후속입금 예정 저장만으로 `paid_amount`, `depositBalance`, `taxInvoice` 금액은 바뀌지 않는다.

---

## 7.4 입금수집함 수동 처리 및 제외 규칙

### 요구사항

입금수집함은 표 중심에서 “좌측 목록 + 우측 처리 패널” 구조로 개선한다.

#### 처리 방식

1. 특정 명세표에 반영
2. 고객 전체 받을 돈에 오래된 순서로 반영
3. 기존 장부 받을 돈에 반영
4. 전액 예치금으로 보관
5. 일부 반영 + 차액 예치금
6. 환불대기로 등록
7. 수동 완료
8. 제외
9. 보류

#### 수동 완료

- 장부 금액을 변경하지 않는다.
- “이미 다른 방식으로 처리함”, “현금 처리됨”, “중복 수집” 등 사유를 남긴다.
- 처리 이력에는 원본 입금 정보, 작업자, 시각, 사유가 남는다.

#### 제외

- 쿠팡, 카드사, 플랫폼 정산금 등 CRM 고객 입금이 아닌 건을 제외한다.
- 제외 사유 필수.
- `기타` 사유는 상세 메모 10자 이상 필수.
- 100만원 이상 입금은 제외 전 confirm 필수.
- 제외된 건은 원본을 삭제하지 않고 “제외 완료” 탭에서 확인 가능해야 한다.

#### 동명이인 안전장치

- normalize된 입금자명이 같은 고객이 2명 이상이면 자동반영 금지.
- 후보가 2건 이상이면 자동반영 금지.
- 가족명/대리입금은 별칭이 있어도 기본값은 `review`로 둔다. 운영자가 명시 승인하면 수동 연결한다.

### Auto-apply 정책

MVP 기본값은 다음과 같다.

- 자동반영 기본 OFF
- 정확 후보라도 기본은 “추천 후 수동 반영”
- 자동반영 ON 조건:
  - 단일 후보
  - 입금자명/별칭 일치
  - 금액 정확 일치
  - 고객 `autoDepositDisabled` 아님
  - 동명이인 아님
  - 제외 규칙 미매칭

### Acceptance Criteria

- 후보가 여러 개거나 동명이인이면 자동반영하지 않고 `검토 필요`로 표시한다.
- 수동 완료/제외는 invoice/customer 금액을 변경하지 않는다.
- 초과입금은 명세표 잔액까지만 수금 처리하고 나머지는 예치금/환불대기로 분리한다.
- 같은 입금 레코드는 중복 반영되지 않는다.

---

## 7.5 직접거래 업무함

### 신규 화면 제안

- 메뉴명: `직접거래 업무함`
- 목적: 관리자가 오늘 처리할 일을 한 화면에서 본다.

### 상단 카드

1. 오늘 출고할 건
2. 출고완료 후 미수
3. 오늘/지연된 후속입금 예정
4. 입금수집 검토 필요
5. 월말점검 남은 예외
6. 세금계산서 발급 가능

### 업무 레인

| 레인 | 포함 조건 | 주요 액션 |
|---|---|---|
| 출고준비 | 출고확정 전 명세표 | 포장지시서 출력, 출고완료 |
| 출고완료 미수 | 출고완료 + 잔액 > 0 | 입금 확인, 후속입금 예정 등록 |
| 후속입금 예정 | 납부 예정일 있음 | 예정 수정, 오늘 입금 확인 |
| 입금수집 예외 | review/unmatched | 후보 확정, 수동 완료, 제외 |
| 세금계산서 | 출고완료 + 발급 가능 | 발급 요청/내역 보기 |
| 정리 완료 | 완납/반영완료 | 상세 보기 |

### Acceptance Criteria

- 업무함의 카드를 클릭하면 해당 레인/필터로 이동한다.
- 각 업무 카드에는 거래처, 명세표번호, 출고상태, 수금상태, 합계, 입금액, 예치금 사용, 남은 받을 돈, 후속입금 예정일, 다음 액션이 표시된다.
- 업무함의 상태와 원본 화면의 상태가 일치한다.

---

## 7.6 월말점검

### 신규 화면 제안

- 메뉴명: `월말점검`
- 목적: 월말에 직접거래 상태를 닫기 전에 예외를 확인한다.

### 점검 순서

1. 출고완료 누락
2. 입금수집 미처리
3. 출고완료 미수
4. 후속입금 지연
5. 예치금/환불대기 잔액
6. 초과입금 확인 필요
7. 세금계산서 기준 확인

### 결과 표 필드

- 거래처
- 명세표번호
- 출고상태
- 명세표 합계
- 실제 입금
- 예치금 사용
- 남은 받을 돈
- 입금 예정일
- 예외 사유
- 다음 작업

### Acceptance Criteria

- 기본 기간은 이번 달이다.
- 점검 항목별 건수와 상세 목록 건수가 일치한다.
- 모든 예외 행은 원본 화면으로 이동하는 액션을 제공한다.
- 구례군 같은 초과입금 사례는 입금액과 명세표 기준 금액을 분리 표시한다.

---

## 7.7 세금계산서 연계

### 요구사항

- 출고확정 전에는 세금계산서 발급 불가.
- 발급 금액은 입금액이 아니라 명세표의 `items`, `supply_amount`, `tax_amount`, `total_amount` 기준.
- 입금액이 명세표보다 많아도 초과분은 세금계산서 금액에 포함하지 않는다.
- 발급 요청은 idempotency key로 중복 방지.
- 취소/상쇄는 국세청 전송 상태에 따라 분기한다.

### Acceptance Criteria

- 출고확정 전 명세표는 세금계산서 발급 버튼이 비활성화된다.
- 입금액과 명세표 합계가 다를 때도 세금계산서 payload는 명세표 금액 기준이다.
- 이미 요청된 명세표는 발급내역을 보여주고 신규 중복 요청을 차단한다.

---

## 8. UX 상세

### 8.1 상태 배지 표시 원칙

명세표/업무함/월말점검에서는 배지를 3줄로 분리한다.

1. 업무 단계: 주문접수, 출고준비, 출고완료, 취소
2. 돈 상태: 미입금, 일부입금, 완납, 예치금, 환불대기
3. 예외/증빙: 후속입금 예정, 입금 약속 지남, 세금계산서 발급가능, 검토 필요

### 8.2 Confirm 문구

#### 출고완료 단건

```text
포장·출고완료 처리할까요?

거래처: {customerName}
명세표: {invoiceNo}
명세표 합계: {totalAmount}

처리 후 이 건은 “출고완료 매출”과 “월말점검”에 포함됩니다.
아직 입금되지 않았다면 “출고완료 미수” 업무함에 표시됩니다.
```

#### 출고완료 일괄

```text
선택한 {count}건을 출고완료 처리할까요?

합계: {totalAmount}
이미 출고완료된 건은 자동 제외됩니다.
처리 후 선택 건은 월말 매출 점검 대상이 됩니다.
입금이 안 된 건은 “출고완료 미수”로 남습니다.
```

#### 초과입금 예치금 보관

```text
초과입금을 예치금으로 보관할까요?

실제 입금액: {depositAmount}
이번 명세표 수금 처리: {invoiceAppliedAmount}
예치금 보관: {depositAddedAmount}

예치금은 매출이 아니며, 다음 주문에서 차감할 수 있습니다.
세금계산서는 명세표 금액 기준으로만 발급됩니다.
```

#### 입금 제외

```text
이 입금을 CRM 반영 대상에서 제외할까요?

입금자: {sender}
금액: {amount}
제외 사유: {reason}

은행 원본 내역은 삭제되지 않습니다.
제외 이력은 월말점검에서 다시 확인할 수 있습니다.
```

### 8.3 수집함 비우기 개선

현재 “수집함 비우기”는 미반영 건이 있을 때 위험하다. 다음 조건을 적용한다.

- 검토 필요/미매칭 건이 1건 이상이면 단순 비우기 대신 제외 처리 유도
- 미처리 건이 있으면 confirm 필수
- 반영 완료 건만 숨기기 옵션 추가

---

## 9. 안전·감사·롤백 요구사항

### 9.1 공통 안전 흐름

모든 돈/세금/출고 상태 변경은 다음을 따른다.

```text
fresh read → dry-run → confirm → apply → verify
```

### 9.2 이벤트 이력

금액 또는 상태 변경은 삭제/덮어쓰기 대신 append-only 이벤트를 남긴다.

필수 필드:

- 이벤트 ID 또는 opId
- 작업 유형
- 대상 고객 ID
- 대상 명세표 ID
- 입금수집함 레코드 ID
- 변경 전 상태/금액
- 변경 후 상태/금액
- 작업자
- 작업 시각
- 사유
- 요청 ID 또는 idempotency key
- 원천 데이터 출처

### 9.3 롤백

- 롤백은 삭제가 아니라 반대 방향 정정 이벤트로 처리한다.
- 세금계산서 발급/국세청 전송이 연계된 건은 단순 memo 롤백 금지.
- 예치금 사용 롤백 시 고객 예치금이 음수가 되면 차단한다.
- 환불완료 롤백은 관리자 권한과 사유 입력을 요구한다.

### 9.4 개인정보/시크릿

- 인증키, n8n secret, 바로빌 인증정보, ContactID, 승인번호 전체값은 출력/문서/커밋 금지.
- 은행 계좌번호, 전화번호, 이메일, 사업자번호는 기본 마스킹한다.
- CSV/XLSX 내보내기에는 formula injection 방지 처리를 적용한다.

---

## 10. 데이터 보정 계획

### 10.1 Phase 0 — 사전 분석

- 과거 완납이지만 출고확정 meta가 없는 후보 조회
- 제시카플로라 대상 명세표 확인
- 입금수집함 검토 큐 잔여 확인
- 동명이인 위험 후보 확인
- 예치금/환불대기 잔액 보유 고객 확인

### 10.2 Phase 1 — dry-run 리포트

출고확정 정리 dry-run 결과:

- 후보 건수/합계
- 제외 사유별 건수
- 고객별 합계
- 세금계산서 영향 건수
- 표본 20건

### 10.3 Phase 2 — 승인 후 apply

- 사용자 승인 후에만 운영 데이터 apply
- apply 전 백업/스냅샷 저장
- apply 후 verify 리포트 생성
- 실패 건은 별도 보류

### 10.4 검증 쿼리 예시

```sql
-- 과거 완납이지만 출고확정 메타가 없는 후보
SELECT Id, invoice_no, invoice_date, customer_id, customer_name,
       total_amount, paid_amount, current_balance, payment_status, memo
FROM invoices
WHERE payment_status = 'paid'
  AND COALESCE(paid_amount, 0) >= COALESCE(total_amount, 0)
  AND (memo IS NULL OR memo NOT LIKE '%"fulfillmentStatus":"shipment_confirmed"%')
ORDER BY invoice_date, Id;
```

```sql
-- 완납 건 잔액 불일치
SELECT Id, invoice_no, total_amount, paid_amount, current_balance, payment_status
FROM invoices
WHERE payment_status = 'paid'
  AND COALESCE(current_balance, 0) <> 0;
```

```sql
-- 출고확정 건은 매출 게시 메타가 함께 있어야 함
SELECT Id, invoice_no, memo
FROM invoices
WHERE memo LIKE '%"fulfillmentStatus":"shipment_confirmed"%'
  AND memo NOT LIKE '%"revenuePostingStatus":"posted"%';
```

---

## 11. 개발 로드맵

### Phase A — PRD 및 공통 상태 모델

- 이 PRD 확정
- `tradeGovernance` 상태 계산 유틸 설계
- 상태 배지 공통 타입 정리
- `current_balance` 의미를 “이번 명세표 잔액”으로 공식화

### Phase B — 출고확정 dry-run/verify

- 명세표 화면에 “과거 완납 출고확정 점검” 추가
- dry-run 모달 추가
- apply 후 verify 결과 추가
- 제시카플로라 등 개별 출고완료 미수 표시 강화

### Phase C — 후속입금 예정/업무함

- 후속입금 상태 계산 추가
- 수금관리/명세표/고객 상세에 후속입금 배지 표시
- `직접거래 업무함` 신규 화면 추가
- 예정일 지남/오늘 확인 강조

### Phase D — 입금수집함 수동 처리/제외 규칙

- 우측 처리 패널 도입
- 수동 연결, 수동 완료, 제외, 보류 추가
- 제외 사유 필수화
- 동명이인 자동반영 방지
- 초과입금 분리 미리보기

### Phase E — 월말점검

- 월말점검 화면 추가
- 출고완료 누락, 입금수집 미처리, 출고완료 미수, 후속입금 지연, 예치금/환불대기, 세금계산서 기준 확인 집계
- 원본 화면 이동 액션 추가

### Phase F — 감사/롤백 고도화

- invoice `governanceEvents` 추가
- customer event와 invoice event를 타임라인에서 통합 표시
- 롤백/정정 이벤트 설계

---

## 12. 파일별 구현 계획

### 공통 상태/메타

- `offline-crm-v2/src/lib/accountingMeta.ts`
  - `governanceEvents` 타입/파서/직렬화 추가
  - 후속입금 상태 보존/계산 보조 함수 추가
- `offline-crm-v2/src/lib/tradeGovernance.ts` 신규
  - 명세표 상태 통합 계산
  - 업무함/월말점검 공통 selector
  - dry-run target/summary 타입

### 명세표/출고

- `offline-crm-v2/src/pages/Invoices.tsx`
  - 과거 완납 출고확정 dry-run 버튼/모달
  - 출고완료 confirm 문구 개선
  - apply 후 verify 리포트
  - 통합 상태 배지 적용

### 후속입금

- `offline-crm-v2/src/components/InvoiceDialog.tsx`
  - 기존 납부 예정 UI 용어를 후속입금 예정으로 정리
  - 예정일/예정금액/알림/메모 저장 검증
- `offline-crm-v2/src/pages/Receivables.tsx`
  - 출고완료 미수/후속입금 예정 필터 추가

### 입금수집함

- `offline-crm-v2/src/lib/autoDeposits.ts`
  - 동명이인 감지
  - 제외 규칙 적용
  - 후보 상태 확장
- `offline-crm-v2/src/pages/DepositInbox.tsx`
  - 처리 패널
  - 수동 완료/제외/보류
  - 제외 사유 입력
  - 초과입금 분리 미리보기

### 업무함/월말점검

- `offline-crm-v2/src/pages/TradeWorkQueue.tsx` 신규
- `offline-crm-v2/src/pages/MonthEndReview.tsx` 신규
- `offline-crm-v2/src/App.tsx`
  - 라우트 추가
- `offline-crm-v2/src/components/layout/Sidebar.tsx`
  - 메뉴 추가

### 테스트

- `offline-crm-v2/tests/11-trade-governance.spec.ts` 신규
- `offline-crm-v2/tests/12-deposit-inbox-governance.spec.ts` 신규
- `offline-crm-v2/tests/13-month-end-review.spec.ts` 신규

---

## 13. 테스트 전략

### 13.1 단위 테스트

- 출고확정 후보 selector
- 통합 상태 계산
- 후속입금 상태 계산
- 동명이인 감지
- 제외 규칙 매칭
- 초과입금 분리 계산
- governance event 직렬화/파싱

### 13.2 통합 테스트

- dry-run → apply → verify
- 입금수집함 수동 연결
- 입금수집함 수동 완료/제외
- 초과입금 → 예치금/환불대기
- 후속입금 예정 → 완납 후 완료

### 13.3 E2E 시나리오

1. `/invoices`: 과거 완납 출고확정 dry-run 모달 표시
2. `/invoices`: apply 후 출고완료 배지 변경
3. `/deposit-inbox`: CSV/XLSX 업로드 후 exact/review/unmatched 표시
4. `/deposit-inbox`: 검토 필요 건 수동 연결
5. `/deposit-inbox`: 수동 완료/제외 시 금액 불변
6. `/customers/:id`: 자동입금 제외/별칭 저장
7. `/receivables`: 후속입금 예정/지연 필터
8. `/trade-work-queue`: 업무함 카드/레인 표시
9. `/month-end-review`: 월말점검 항목과 상세 목록 일치

### 13.4 운영 데이터 검증

- apply 전후 스냅샷 저장
- 표본 10~20건 수동 확인
- 동일 dry-run 재실행 시 후보 0건 확인
- 세금계산서 금액 기준이 명세표 기준인지 확인
- 입금수집함 동명이인 자동반영 차단 확인

---

## 14. 단계별 Acceptance Criteria

### AC-A. 상태 체계

- 모든 명세표는 문서구분, 출고상태, 수금상태, 후속입금상태, 세금계산서상태를 독립적으로 계산할 수 있다.
- 같은 명세표는 모든 화면에서 동일 상태를 표시한다.

### AC-B. 과거 완납 출고확정

- dry-run만 실행하면 DB는 변경되지 않는다.
- apply 전 후보/제외/총액/세금계산서 영향이 표시된다.
- apply 후 출고상태와 매출인식상태가 verify된다.

### AC-C. 후속입금

- 출고완료 + 잔액 > 0이면 `출고완료 미수`로 표시된다.
- 예정일이 있으면 `후속입금 예정`, 오늘이면 `오늘 입금 확인`, 지났으면 `입금 약속 지남`으로 표시된다.
- 후속입금 예정 저장은 수금액/세금계산서 금액을 변경하지 않는다.

### AC-D. 입금수집함

- 다중 후보/동명이인은 자동반영 금지.
- 수동 완료/제외는 invoice/customer 금액을 변경하지 않는다.
- 제외 사유는 필수이며 제외 완료 탭에서 확인할 수 있다.
- 초과입금은 명세표 반영액과 예치금/환불대기 금액을 분리한다.

### AC-E. 월말점검

- 월말점검 항목별 카운트와 상세 목록이 일치한다.
- 모든 예외 행은 원본 화면 이동 액션을 제공한다.
- 입금액과 명세표 금액이 다른 사례는 분리 표시된다.

### AC-F. 감사/보안

- 돈/세금/출고 상태 변경은 작업자, 시각, 사유, 전후 상태를 남긴다.
- 시크릿/인증값은 문서/로그/테스트 결과에 출력되지 않는다.
- 롤백은 삭제가 아니라 정정 이벤트로 처리한다.

---

## 15. 운영 원칙

1. “자동화”보다 “헷갈리지 않게 안전하게 처리”가 우선이다.
2. 정확히 맞는 건은 추천하고, 애매한 건은 검토로 보낸다.
3. 돈이 바뀌는 작업은 항상 미리보기와 확인을 거친다.
4. 과거 데이터 정리는 dry-run 리포트 후 승인받고 실행한다.
5. 세금계산서는 출고확정 후, 명세표 금액 기준으로만 처리한다.
6. 입금자명이 다르거나 동명이인이 있으면 자동처리하지 않는다.
7. 예치금/환불대기는 매출이 아니라 고객 잔액 관리 영역으로 분리한다.

---

## 16. 미해결 질문과 결정

### Q1. 입금수집함에서 기존 예치금을 열린 명세표에 자동 상계할 것인가?

결정: MVP에서는 자동 상계하지 않고 운영자가 확인/선택하게 한다. 기존 자동 상계 흐름은 dry-run 미리보기와 명시적 confirm 뒤에만 실행한다.

### Q2. `current_balance` 의미는 무엇인가?

결정: “이번 명세표 잔액”으로 고정한다. 전잔액/기존 장부 잔액은 고객 잔액과 legacy snapshot/고객별 ledger에서 별도 계산한다.

### Q3. 정확 일치 자동반영은 MVP에 포함하는가?

결정: 기본 OFF. MVP는 후보 추천 + 수동 반영을 우선한다. 자동반영은 안정화 후 설정 ON 고객/단일 후보/정확 금액/동명이인 아님 조건에서만 허용한다.

### Q4. 제시카플로라 같은 건은 어떻게 보나?

결정: 미출고가 아니라 `출고완료 + 미수 + 후속입금 예정`이다. 운영자가 예정일/예정금액/메모를 등록하고 업무함에서 추적한다.

---

## 17. 실행 순서 제안

1. 이 PRD 커밋 및 공유
2. Phase A/B 구현 브랜치 시작
3. 통합 상태 계산 유틸 및 출고확정 dry-run 구현
4. 운영 dry-run 리포트 산출
5. 사용자 승인 후 과거 완납 출고확정 apply
6. 후속입금 예정/업무함 구현
7. 입금수집함 수동/제외 구현
8. 월말점검 구현
9. 운영 배포 및 사용자 실확인

---

## 18. 참고 파일

- `offline-crm-v2/src/lib/accountingMeta.ts`
- `offline-crm-v2/src/lib/receivables.ts`
- `offline-crm-v2/src/lib/autoDeposits.ts`
- `offline-crm-v2/src/pages/Invoices.tsx`
- `offline-crm-v2/src/pages/DepositInbox.tsx`
- `offline-crm-v2/src/pages/Receivables.tsx`
- `offline-crm-v2/src/pages/CustomerDetail.tsx`
- `offline-crm-v2/src/pages/Settings.tsx`
- `offline-crm-v2/src/components/InvoiceDialog.tsx`
- `offline-crm-v2/tests/10-tax-invoice.spec.ts`
- `offline-crm-v2/docs/gurye-deposit-credit-balance-team-meeting-2026-04-29.md`
- `offline-crm-v2/docs/auto-deposit-automation-plan-2026-03-12.md`
- `offline-crm-v2/docs/barobill-tax-invoice-integration-plan-2026-04-29.md`
