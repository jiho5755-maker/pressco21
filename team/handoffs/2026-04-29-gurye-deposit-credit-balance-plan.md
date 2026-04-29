---
handoff_id: HOFF-20260429-101738-gurye-deposit-credit-balance-plan
created_at: 2026-04-29T10:17:39+0900
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
commit_sha: 29e5905
status: active
promoted_to_global: false
summary: "구례군 농업기술센터 입금 1,000,000원 중 명세표 743,500원만 완납 처리하고 차액 256,500원을 고객 예치금으로 보관한 뒤 이후 주문에서 차감하는 수정보완 방향을 팀미팅으로 최종 확정했다. 계획 문서 offline-crm-v2/docs/gurye-deposit-credit-balance-team-meeting-2026-04-29.md를 추가했다."
decision: "Codex durable handoff로 로컬 output 기록과 Git 추적 team/handoffs 기록을 함께 남겼습니다."
changed_artifacts:
  - "offline-crm-v2/docs/gurye-deposit-credit-balance-team-meeting-2026-04-29.md"
verification:
  - "local output handoff saved: output/codex-handoffs/20260429-101738-gurye-deposit-credit-balance-plan.md"
  - "git status captured at handoff time"
open_risks:
  - "기존 코드에 예치금 기능 일부가 이미 있으므로 새 기능 추가보다 실제 구례군 금액 재현과 화면 간 잔액 해석 불일치 확인이 핵심이다. 세금계산서 발급 금액은 입금액이 아니라 명세표 금액 기준으로 유지해야 한다."
next_step: "구례군 시나리오를 재현한 뒤 Receivables, DepositInbox, InvoiceDialog, CustomerDetail, accountingMeta/receivables의 기존 예치금 로직을 검증하고 누락/오류를 보완한다. 완료 전 npm run build, 변경 파일 lint 또는 가능한 테스트, pressco21-check를 실행한다."
learn_to_save:
  - "사용자가 핸드오프를 요청하면 output 로컬 파일만으로는 부족하며 team/handoffs 추적 파일까지 남겨야 합니다."
local_output_handoff: "output/codex-handoffs/20260429-101738-gurye-deposit-credit-balance-plan.md"
session_log: "output/codex-sessions/20260429-101738-offline-crm.md"
backup_folder: "output/codex-backups/20260429-101739-gurye-deposit-credit-balance-plan"
---

# Codex durable handoff

## 요약
구례군 농업기술센터 입금 1,000,000원 중 명세표 743,500원만 완납 처리하고 차액 256,500원을 고객 예치금으로 보관한 뒤 이후 주문에서 차감하는 수정보완 방향을 팀미팅으로 최종 확정했다. 계획 문서 offline-crm-v2/docs/gurye-deposit-credit-balance-team-meeting-2026-04-29.md를 추가했다.

## 다음 작업
구례군 시나리오를 재현한 뒤 Receivables, DepositInbox, InvoiceDialog, CustomerDetail, accountingMeta/receivables의 기존 예치금 로직을 검증하고 누락/오류를 보완한다. 완료 전 npm run build, 변경 파일 lint 또는 가능한 테스트, pressco21-check를 실행한다.

## 리스크
기존 코드에 예치금 기능 일부가 이미 있으므로 새 기능 추가보다 실제 구례군 금액 재현과 화면 간 잔액 해석 불일치 확인이 핵심이다. 세금계산서 발급 금액은 입금액이 아니라 명세표 금액 기준으로 유지해야 한다.

## 로컬 output handoff
`output/codex-handoffs/20260429-101738-gurye-deposit-credit-balance-plan.md`

## Git 상태

```text
(clean)
```

## 최근 커밋

```text
29e5905 [codex] 구례군 입금 예치금 계획 확정
bba1e2a Merge work/offline-crm/closeout-deploy-20260428
26a9590 [codex] handoff 저장: crm-final-closeout-20260428
```
