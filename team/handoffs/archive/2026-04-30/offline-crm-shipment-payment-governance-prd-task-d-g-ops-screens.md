---
handoff_id: HOFF-20260430-0411-direct-trade-task-d-g-ops-screens
runtime: codex-omx
owner_agent_id: kim-dohyun-coo
branch: work/offline-crm/shipment-payment-governance-prd
task_name: Task D-G — 후속입금/입금수집함/업무함/월말점검
task_goal: 운영자가 출고완료 미수, 후속입금, 입금수집 예외, 월말 예외를 한눈에 확인하고 안전하게 처리하게 한다.
run_outcome: finished
---

## summary
김도현님 관점으로 직접거래 업무 흐름을 구현했습니다. 수금관리에는 공통 governance 상태를 표시하고, 입금수집함에는 수동 완료/제외/보류와 완료건 숨기기 안전장치를 추가했습니다. 신규 화면 `직접거래 업무함`, `월말점검`을 라우트/사이드바에 연결했습니다.

## decision
- 기존 예치금 자동상계 흐름은 MVP 원칙에 맞게 차단하고, 이번 입금 반영 후 남은 금액만 예치금 이벤트로 보관합니다.
- 동명이인 또는 동일 normalized 입금자 후보가 2명 이상이면 exact가 아니라 review로 강제합니다.
- 수동 완료/제외/보류는 로컬 수집함 이력에 남기며 invoice/customer 금액을 바꾸지 않습니다.
- 제외는 원본 삭제 대신 `dismissed` 상태로 보존하고, 미처리 건 단순 제거를 차단합니다.

## changed_artifacts
- `offline-crm-v2/src/lib/autoDeposits.ts`
- `offline-crm-v2/src/pages/DepositInbox.tsx`
- `offline-crm-v2/src/pages/Receivables.tsx`
- `offline-crm-v2/src/pages/TradeWorkQueue.tsx`
- `offline-crm-v2/src/pages/MonthEndReview.tsx`
- `offline-crm-v2/src/App.tsx`
- `offline-crm-v2/src/components/layout/Sidebar.tsx`
- `offline-crm-v2/tests/12-deposit-inbox-governance.spec.ts`
- `offline-crm-v2/tests/13-month-end-review.spec.ts`

## verification
- `npm run build`: PASS
- `npm run lint`: PASS
- `npx playwright test tests/12-deposit-inbox-governance.spec.ts tests/13-month-end-review.spec.ts ...`: PASS 포함

## browser_evidence
- `/deposit-inbox`: 수동 완료/보류/제외 버튼, 제외 완료 상태, 안전장치 카드 검증.
- `/trade-work-queue`: 핵심 카드와 레인 표시 검증.
- `/month-end-review`: 점검 카드와 상세 표 표시 검증.
- `/receivables?asOf=2026-04-30`: 새 입력 받을 돈 탭에서 `후속입금: 입금 약속 지남` 표시 검증.

## open_risks
- 로컬 수집함 처리 이력은 localStorage 기반입니다. 원격 검토 큐의 수동 완료/보류 영속화는 n8n/API 계약이 필요합니다.
- `prompt()` 기반 사유 입력은 MVP 안전장치이며, 추후 전용 패널/다이얼로그 UX로 개선 권장.

## blockers
- 원격 큐 `dismiss` 외 상태 업데이트 API가 현재 제한적이라 원격 보류/수동완료는 localStorage UX 수준입니다.

## next_step
Task H-I 감사 이벤트 표시 확장과 회귀/E2E/브라우저 실검증.

## files_to_inspect_next
- `offline-crm-v2/src/lib/api.ts` 원격 큐 action 확장 필요 여부
- `offline-crm-v2/src/pages/DepositInbox.tsx` 처리 패널 다이얼로그화

## rollback_or_recovery_note
입금수집함 변경 문제가 있으면 `AutoDepositInboxEntry.status` 확장과 `DepositInbox.tsx` 수동 처리 함수/버튼 추가분을 되돌리면 기존 반영 기능으로 복구됩니다.

## learn_to_save
예치금 자동상계는 운영상 편해 보여도 PRD MVP에서는 돈 상태를 암묵 변경하므로 반드시 명시 선택/dry-run 뒤에만 허용해야 한다.
