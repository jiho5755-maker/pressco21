---
handoff_id: HOFF-20260430-1207-direct-trade-task-n3-tax-invoice-production-ui
runtime: codex-omx
owner_agent_id: cho-hyunwoo-legal
task_name: Task N3 — 세금계산서 운영 연동 UI/요청자 정비
branch: work/offline-crm/shipment-payment-governance-prd
task_goal: 명세표 화면의 세금계산서 발급 UI가 테스트/운영 모드를 명확히 표시하고, 실제 요청자와 금액 기준을 안전하게 넘기도록 정비한다.
run_outcome: finished
---

## summary
조현우님 관점으로 세금계산서 발급 Dialog와 명세표 처리부를 정비했습니다. 하드코딩 `crm-admin` 대신 설정의 현재 작업 계정을 `requestedBy`로 사용하고, 발급 완료 memo에도 같은 요청자를 저장합니다. 운영/테스트 모드 문구는 env gate 기준으로 유지했습니다.

## decision
- 세금계산서 금액은 기존처럼 입금액이 아니라 명세표 품목의 공급가액/세액/합계 기준입니다.
- 실제 운영 발급은 프론트 env `VITE_BAROBILL_TAX_INVOICE_MODE=production` 및 `VITE_BAROBILL_ALLOW_PRODUCTION_ISSUE=true`가 모두 있어야 버튼이 `실제 세금계산서 발급`으로 표시됩니다.
- 이번 세션에서는 바로빌/운영 데이터 write를 실행하지 않았습니다.
- 운영 서버 webhook 경로는 기존 nginx `/webhook/crm/barobill/tax-invoices/*` 구조를 그대로 사용합니다.

## changed_artifacts
- `offline-crm-v2/src/components/TaxInvoiceRequestDialog.tsx`
- `offline-crm-v2/src/pages/Invoices.tsx`

## verification
- `npm run build`: PASS
- `npm run lint`: PASS
- 세금계산서 실제 발급/상태조회/cancel webhook 호출은 운영 write이므로 미수행.

## browser_evidence
- governance browser smoke의 `/invoices` 경로에서 완납 미확정 dry-run 모달을 확인했습니다. 세금계산서 실제 발급 버튼 클릭은 운영 write 위험 때문에 수행하지 않았습니다.

## open_risks
- 현재 운영 배포 환경 변수가 test 모드이면 UI는 계속 `테스트 세금계산서 발급`으로 표시됩니다. 실제 운영 발급 전 배포 환경 변수 점검이 필요합니다.
- 바로빌 실제 발급은 취소/상쇄 리스크가 있으므로 별도 승인 없이 클릭 검증하지 않았습니다.

## blockers
- 운영 env 확인/변경은 secret-gated 작업입니다. 값 출력 없이 서버 환경에서 `VITE_BAROBILL_TAX_INVOICE_MODE`와 `VITE_BAROBILL_ALLOW_PRODUCTION_ISSUE` 적용 여부만 확인해야 합니다.

## next_step
- 운영 배포 직전/직후에 env 모드만 마스킹 확인하고, 실제 발급은 사용자가 대상 명세표를 지정해 승인한 뒤 1건부터 실행합니다.

## files_to_inspect_next
- `offline-crm-v2/src/components/TaxInvoiceRequestDialog.tsx`
- `offline-crm-v2/src/pages/Invoices.tsx`
- `offline-crm-v2/src/lib/api.ts`
- `offline-crm-v2/deploy/nginx-crm-secure.conf`

## rollback_or_recovery_note
요청자 표시 문제가 있으면 `requestedBy`를 다시 fallback 문자열로 바꾸면 됩니다. 운영 발급 env gate는 변경하지 않았으므로 발급 차단 정책은 유지됩니다.

## learn_to_save
세금계산서 UI에서 “테스트”가 보이면 코드보다 먼저 배포 env mode/allow flag를 확인해야 하며, 실제 발급 클릭은 운영 write로 분류해야 합니다.
