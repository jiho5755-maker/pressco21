---
handoff_id: HOFF-20260430-0938-direct-trade-operational-apply
runtime: codex-omx
owner_agent_id: choi-minseok-cto
branch: work/offline-crm/shipment-payment-governance-prd
task_name: Task K — 과거 완납 출고확정 운영 apply/verify
task_goal: 사용자 승인 후 과거 완납이지만 출고확정 메타가 없는 운영 명세표를 fresh read → dry-run → apply → verify 순서로 정리한다.
run_outcome: finished
---

## summary
최민석님이 승인 대기였던 과거 완납 출고확정 정리를 운영 데이터에 적용했습니다. 적용 직전 fresh dry-run 기준 후보 101건, 후보 합계 43,022,140원이었고, 101건 모두 `shipment_confirmed` + `posted`로 verify됐습니다. 사후 verify dry-run 후보는 0건입니다.

## decision
- 사용자 메시지 “남은 대기 진행해”를 기존 승인 대기 건의 apply 승인으로 해석했습니다.
- 운영 write는 신규 CLI `offline-crm-v2/scripts/ops/direct-trade-shipment-confirmation.mjs`로만 수행했습니다.
- Git에 남길 보고서는 식별자/거래처명을 마스킹하고, memo 원문은 git 추적 제외 로컬 스냅샷에만 보관했습니다.

## changed_artifacts
- `offline-crm-v2/scripts/ops/direct-trade-shipment-confirmation.mjs`
- 운영 DB: paid/settled invoice 101건의 `[ACCOUNTING_INVOICE_META]`에 출고완료/매출반영/governanceEvents 추가
- 로컬 보고서(ignored):
  - `offline-crm-v2/docs/reports/direct-trade-shipment-dry-run-2026-04-30.json`
  - `offline-crm-v2/docs/reports/direct-trade-shipment-apply-2026-04-30.json`
  - `offline-crm-v2/docs/reports/direct-trade-shipment-post-apply-verify-2026-04-30.json`
- 민감 스냅샷(ignored, chmod 600): `output/ops-snapshots/direct-trade-shipment-confirmation/apply-sensitive-snapshot-2026-04-30.json`

## verification
- dry-run: `candidateCount=101`, `candidateTotalAmount=43,022,140`, `taxInvoiceImpactCount=101`
- apply: `freshDryRunCandidateCount=101`, `appliedAttemptCount=101`, `statusCounts.applied_verified=101`
- post-apply verify: `candidateCount=0`, exclusions include `already_shipment_confirmed=102`, `already_revenue_posted=102`, `invalid_total_amount=1`, `paid_amount_below_total=1`
- TEST prefix cleanup read-check: invoices/customers/products/suppliers all `totalRows=0`

## browser_evidence
- 이 태스크 자체는 운영 API write + verify dry-run 중심입니다.
- 전체 브라우저 검증은 Task L handoff에 분리 기록했습니다.
- 운영 공개 URL smoke: `https://crm.pressco21.com`은 302로 `/login?next=%2F` 이동, headless browser에서 로그인 페이지 200 렌더링 확인.

## open_risks
- memo 원문 롤백 스냅샷은 민감정보 보호를 위해 git에 commit하지 않았습니다. 같은 장비의 `output/ops-snapshots/**` 경로가 필요합니다.
- 세금계산서 실제 발급은 수행하지 않았습니다. 이번 작업은 발급 가능 상태 전환까지입니다.

## blockers
없음.

## next_step
- 문제가 생긴 개별 명세표는 apply 보고서의 `id`, `beforeMemoHash`, `afterMemoHash`와 로컬 민감 스냅샷을 대조해 확인합니다.
- 롤백이 필요하면 삭제가 아니라 정정 이벤트 방식으로 별도 승인 후 처리합니다.

## files_to_inspect_next
- `offline-crm-v2/scripts/ops/direct-trade-shipment-confirmation.mjs`
- `offline-crm-v2/src/lib/accountingMeta.ts`
- `offline-crm-v2/src/pages/Invoices.tsx`

## rollback_or_recovery_note
로컬 민감 스냅샷에 before/after memo 원문이 있습니다. 세금계산서 발급/국세청 전송이 연계된 건은 단순 memo 복구 금지이며, 정정 이벤트 방식으로 처리해야 합니다.

## learn_to_save
운영 정리 CLI의 git 추적 보고서는 invoiceNo/customerName을 그대로 남기지 말고 hash ref/마스킹으로 남긴다. memo 원문은 chmod 600 로컬 스냅샷에만 둔다.
