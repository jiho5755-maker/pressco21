---
handoff_id: HOFF-20260430-1206-direct-trade-task-n2-auto-deposit-account-match
runtime: codex-omx
owner_agent_id: park-seoyeon-cfo
branch: work/offline-crm/shipment-payment-governance-prd
task_name: Task N2 — 고객계정 자동반영 안전 매칭
task_goal: 서상견형 VIP 선입금처럼 금액이 명세표와 정확히 맞지 않아도, 안전한 고객 1명으로 특정되면 열린 미수를 오래된 순서로 차감하고 초과분을 예치금으로 남기는 후보 정책을 반영한다.
run_outcome: finished
---

## summary
박서연님 기준으로 고객 메타에 `autoDepositAccountMatchEnabled`를 추가했습니다. 고객 상세에서 `고객 전체 받을 돈 자동반영 허용`을 켤 수 있고, 자동입금 후보 계산은 단일 고객·동명이인 아님·열린 CRM 미수 있음·고객별 허용 ON 조건에서만 고객 전체 정산 후보를 `exact`로 승격합니다.

## decision
- 은행 보안메일 HTML에는 입금자를 고유 식별하는 고객 ID가 없으므로, 동명이인은 자동반영하지 않습니다.
- 모든 고객은 같은 플로우를 씁니다: 입금 → 고객 매칭 → 열린 미수 오래된 순서 차감 → 초과분 예치금.
- 단, 실제 자동 실행은 전역 자동반영 ON과 고객별 `고객계정 자동반영` 허용이 모두 있어야 가능합니다.
- 자동입금 제외 고객, 후보 다수, 동명이인, 열린 미수 없음은 review/manual로 남깁니다.

## changed_artifacts
- `offline-crm-v2/src/lib/accountingMeta.ts`
- `offline-crm-v2/src/lib/autoDeposits.ts`
- `offline-crm-v2/src/pages/CustomerDetail.tsx`
- `offline-crm-v2/src/pages/SettlementManagement.tsx`
- `offline-crm-v2/tests/14-governance-browser-smoke.spec.ts`

## verification
- `npm run build`: PASS
- `npm run lint`: PASS
- `npx playwright test tests/12-deposit-inbox-governance.spec.ts tests/13-month-end-review.spec.ts tests/14-governance-browser-smoke.spec.ts --reporter=list`: PASS, 4/4

## browser_evidence
- `/settlements?section=rules`에서 은행 보안메일에 고유 ID가 없고, 동명이인은 수동 확인이라는 안내와 `고객 계정 자동반영` 플로우 안내를 확인했습니다.

## open_risks
- `buildAutoDepositMatchResults` 순수 함수 단위 테스트는 Playwright Node 환경에서 `import.meta.env` 문제로 직접 추가하지 않았습니다. 현재는 브라우저 smoke와 build/lint로 검증했습니다.
- 전역 자동반영 ON 상태에서 고객별 허용이 켜진 고객은 실제 입금 업로드 시 장부 write가 발생할 수 있으므로 운영 설정 변경은 사용자 확인이 필요합니다.

## blockers
- 원격 큐에 고객별 자동반영 허용/보류 이력까지 저장하려면 n8n/API 계약 확장이 필요합니다.

## next_step
- 서상견 같은 실제 VIP 고객 상세에서 별칭과 `고객 전체 받을 돈 자동반영 허용`을 운영자가 직접 켠 뒤, 다음 입금 파일 업로드 전 dry-run/후보 표시를 확인합니다.

## files_to_inspect_next
- `offline-crm-v2/src/lib/autoDeposits.ts`
- `offline-crm-v2/src/pages/CustomerDetail.tsx`
- `offline-crm-v2/src/pages/DepositInbox.tsx`

## rollback_or_recovery_note
문제가 생기면 고객 메타 `autoDepositAccountMatchEnabled` 필드와 `senderOnlyMatchedLedgers` exact 승격 조건만 되돌리면 기존 review 중심 매칭으로 복구됩니다. 저장된 고객 memo의 필드는 파서가 무시하도록 두어도 치명적이지 않습니다.

## learn_to_save
고객 전체 선입금 자동화는 전역 설정만으로 열면 위험하고, 고객별 명시 허용 플래그와 동명이인 차단을 함께 둬야 합니다.

## 2026-04-30 12:16 verifier 보강
Faraday 검증에서 고객계정 자동반영이 `senderKey.includes(token)` 기반이면 짧은 별칭 오매칭 위험이 있다는 중요 이슈가 나왔습니다. 이에 자동반영 승격 조건을 보강했습니다.

- 후보 추천은 유사 포함 매칭을 유지하되 `review`로 둡니다.
- `exact` 자동반영 승격은 정규화된 입금자명과 고객명/별칭이 완전히 같은 경우(`token === senderKey`, token 길이 2 이상)에만 허용합니다.
- 고객계정 자동반영 안내 문구에도 “정확히 같은 입금자명” 조건을 명시했습니다.

추가 검증:
- `npm run build`: PASS
- `npm run lint`: PASS
- `npx playwright test tests/12-deposit-inbox-governance.spec.ts tests/13-month-end-review.spec.ts tests/14-governance-browser-smoke.spec.ts --reporter=list`: PASS, 4/4
