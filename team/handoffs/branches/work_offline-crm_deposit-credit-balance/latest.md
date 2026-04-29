---
handoff_id: HOFF-20260429-121247-crm-deposit-credit-balance-closeout
created_at: 2026-04-29T12:12:48+0900
runtime: codex-omx
owner_agent_id: yoo-junho-paircoder
contributors: []
scope_type: worktree
project: offline-crm
worktree_slot: offline-crm-deposit-credit-balance
repo_root: /Users/jangjiho/workspace/pressco21-worktrees/offline-crm-deposit-credit-balance
branch: "work/offline-crm/deposit-credit-balance"
worktree_path: "/Users/jangjiho/workspace/pressco21-worktrees/offline-crm-deposit-credit-balance"
source_cwd: "/Users/jangjiho/workspace/pressco21-worktrees/offline-crm-deposit-credit-balance"
commit_sha: dcac90e
status: active
promoted_to_global: false
summary: "CRM 예치금 잔액 계산 보완을 완료했다. 구례군 시나리오 기준으로 초과입금은 명세표 금액까지만 수금 처리하고 차액은 고객 예치금으로 보관하며, 이후 명세표에서 예치금 사용액을 차감하도록 수금 관리/입금 수집함/명세표/고객 상세/출력물 표시 기준을 통일했다. npm run build, npm run lint, Playwright E2E 85건, pressco21-check가 통과했다."
decision: "Codex durable handoff로 로컬 output 기록과 Git 추적 team/handoffs 기록을 함께 남겼습니다."
changed_artifacts:
  - "offline-crm-v2/src/lib/receivables.ts"
  - "offline-crm-v2/src/pages/Receivables.tsx"
  - "offline-crm-v2/src/pages/DepositInbox.tsx"
  - "offline-crm-v2/src/components/InvoiceDialog.tsx"
  - "offline-crm-v2/src/pages/Invoices.tsx"
  - "offline-crm-v2/src/pages/CustomerDetail.tsx"
  - "offline-crm-v2/src/lib/print.ts"
  - "offline-crm-v2/src/components/TransactionDetailDialog.tsx"
verification:
  - "local output handoff saved: output/codex-handoffs/20260429-121247-crm-deposit-credit-balance-closeout.md"
  - "git status captured at handoff time"
open_risks:
  - "운영 실데이터 수동 확인은 아직 남아 있다. 배포 후 실제 고객으로 테스트할 때는 테스트용 명세표 또는 확인된 고객만 사용해야 한다."
next_step: "main 통합 후 CRM 운영 배포를 실행하고 https://crm.pressco21.com 에서 실제 구례군/테스트 고객 흐름을 수동 확인한다."
learn_to_save:
  - "사용자가 핸드오프를 요청하면 output 로컬 파일만으로는 부족하며 team/handoffs 추적 파일까지 남겨야 합니다."
local_output_handoff: "output/codex-handoffs/20260429-121247-crm-deposit-credit-balance-closeout.md"
session_log: "output/codex-sessions/20260429-101738-offline-crm.md"
backup_folder: "output/codex-backups/20260429-121248-crm-deposit-credit-balance-closeout"
---

# Codex durable handoff

## 요약
CRM 예치금 잔액 계산 보완을 완료했다. 구례군 시나리오 기준으로 초과입금은 명세표 금액까지만 수금 처리하고 차액은 고객 예치금으로 보관하며, 이후 명세표에서 예치금 사용액을 차감하도록 수금 관리/입금 수집함/명세표/고객 상세/출력물 표시 기준을 통일했다. npm run build, npm run lint, Playwright E2E 85건, pressco21-check가 통과했다.

## 다음 작업
main 통합 후 CRM 운영 배포를 실행하고 https://crm.pressco21.com 에서 실제 구례군/테스트 고객 흐름을 수동 확인한다.

## 리스크
운영 실데이터 수동 확인은 아직 남아 있다. 배포 후 실제 고객으로 테스트할 때는 테스트용 명세표 또는 확인된 고객만 사용해야 한다.

## 로컬 output handoff
`output/codex-handoffs/20260429-121247-crm-deposit-credit-balance-closeout.md`

## Git 상태

```text
(clean)
```

## 최근 커밋

```text
dcac90e [codex] CRM 예치금 잔액 계산 보완
a944711 [codex] handoff 저장: gurye-deposit-credit-balance-plan
29e5905 [codex] 구례군 입금 예치금 계획 확정
```
