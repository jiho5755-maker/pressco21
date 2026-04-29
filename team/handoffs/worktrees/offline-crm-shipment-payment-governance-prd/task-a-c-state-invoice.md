---
handoff_id: HOFF-20260430-0410-direct-trade-task-a-c-state-invoice
runtime: codex-omx
owner_agent_id: choi-minseok-cto
branch: work/offline-crm/shipment-payment-governance-prd
task_name: Task A-C — 공통 상태/명세표 dry-run/출고확정 승인 대기
task_goal: 상태 모델과 명세표 화면이 PRD의 dry-run 우선/감사 이벤트/세금계산서 분리 원칙을 따르게 한다.
run_outcome: finished
---

## summary
최민석님이 출고확정 memo 생성 시 `governanceEvents` append를 추가하고, 단건/일괄 출고확정 confirm 문구를 PRD 문구에 맞게 보강했습니다. 기존 완납 미확정 dry-run 모달은 승인 대기 버튼만 제공해 운영 데이터 write를 막는 구조를 유지했습니다.

## decision
- `buildShipmentConfirmedInvoiceMemo()`가 `shipment_confirm` 또는 `bulk_shipment_confirm` 이벤트를 append-only로 남깁니다.
- dry-run 모달의 “승인 후 적용 예정”은 disabled 상태로 유지합니다. 실제 일괄 과거 데이터 apply는 사용자 별도 승인 전 금지.

## changed_artifacts
- `offline-crm-v2/src/lib/accountingMeta.ts`
- `offline-crm-v2/src/pages/Invoices.tsx`
- `offline-crm-v2/tests/11-trade-governance.spec.ts`

## verification
- `npm run build`: PASS
- `npm run lint`: PASS
- `npx playwright test tests/11-trade-governance.spec.ts ...`: PASS 포함

## browser_evidence
- `tests/11-trade-governance.spec.ts`: `/invoices`에서 완납 미확정 dry-run 모달 표시, 후보 명세표 노출, 적용 버튼 disabled 검증.
- `tests/14-governance-browser-smoke.spec.ts`: `/invoices` 핵심 화면 순회 검증.

## open_risks
- 실제 과거 운영 데이터 apply는 구현/실행하지 않았습니다. 승인 후 별도 fresh read → dry-run 재확인 → apply → verify 작업 필요.

## blockers
- 없음.

## next_step
Task D-G 후속입금 표시, 입금수집함 수동 처리, 직접거래 업무함, 월말점검 구현.

## files_to_inspect_next
- `offline-crm-v2/src/pages/Receivables.tsx`
- `offline-crm-v2/src/pages/DepositInbox.tsx`
- `offline-crm-v2/src/pages/TradeWorkQueue.tsx`
- `offline-crm-v2/src/pages/MonthEndReview.tsx`

## rollback_or_recovery_note
출고 이벤트 보강 문제가 있으면 `accountingMeta.ts`의 `governanceEvent` append 추가분과 `Invoices.tsx` confirm 문구/action 인자 변경분만 되돌리면 됩니다.

## learn_to_save
출고확정은 단순 status write가 아니라 감사 이벤트와 매출반영 메타를 같이 남겨야 이후 롤백/검증이 가능하다.
