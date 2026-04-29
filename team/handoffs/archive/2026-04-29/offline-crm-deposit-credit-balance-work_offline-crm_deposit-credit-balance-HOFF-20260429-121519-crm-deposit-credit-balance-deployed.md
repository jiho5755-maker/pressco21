---
handoff_id: HOFF-20260429-121519-crm-deposit-credit-balance-deployed
created_at: 2026-04-29T12:15:19+0900
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
commit_sha: 664ac0e
status: active
promoted_to_global: false
summary: "CRM 예치금 잔액 계산 보완을 main에 병합하고 운영 CRM 배포까지 완료했다. main 병합 커밋은 bf6310f, 운영 릴리스 ID는 20260429121335-bf6310f다. 운영 서버 /var/www/crm 및 /var/www/crm-current가 새 릴리스를 가리키며, crm-auth.service active, Nginx 설정 테스트 통과, https://crm.pressco21.com/auth/health HTTP 200, 자동화 헤더 smoke에서 / 및 /customers HTTP 200과 신규 JS asset index-CKUjnQCY.js 로딩을 확인했다."
decision: "Codex durable handoff로 로컬 output 기록과 Git 추적 team/handoffs 기록을 함께 남겼습니다."
changed_artifacts:
  - "(no working-tree changes at handoff time)"
verification:
  - "local output handoff saved: output/codex-handoffs/20260429-121519-crm-deposit-credit-balance-deployed.md"
  - "git status captured at handoff time"
open_risks:
  - "실제 운영 데이터 수동 확인은 사용자가 수행할 예정이다. 테스트 시 기존 운영 명세표를 임의 수정하지 말고 테스트 고객 또는 확인된 고객으로 진행해야 한다."
next_step: "사용자가 https://crm.pressco21.com 에 로그인해 구례군 또는 테스트 고객으로 초과입금→예치금 보관→다음 명세표 예치금 사용 흐름을 육안 확인하면 된다."
learn_to_save:
  - "사용자가 핸드오프를 요청하면 output 로컬 파일만으로는 부족하며 team/handoffs 추적 파일까지 남겨야 합니다."
local_output_handoff: "output/codex-handoffs/20260429-121519-crm-deposit-credit-balance-deployed.md"
session_log: "output/codex-sessions/20260429-101738-offline-crm.md"
backup_folder: "(none)"
---

# Codex durable handoff

## 요약
CRM 예치금 잔액 계산 보완을 main에 병합하고 운영 CRM 배포까지 완료했다. main 병합 커밋은 bf6310f, 운영 릴리스 ID는 20260429121335-bf6310f다. 운영 서버 /var/www/crm 및 /var/www/crm-current가 새 릴리스를 가리키며, crm-auth.service active, Nginx 설정 테스트 통과, https://crm.pressco21.com/auth/health HTTP 200, 자동화 헤더 smoke에서 / 및 /customers HTTP 200과 신규 JS asset index-CKUjnQCY.js 로딩을 확인했다.

## 다음 작업
사용자가 https://crm.pressco21.com 에 로그인해 구례군 또는 테스트 고객으로 초과입금→예치금 보관→다음 명세표 예치금 사용 흐름을 육안 확인하면 된다.

## 리스크
실제 운영 데이터 수동 확인은 사용자가 수행할 예정이다. 테스트 시 기존 운영 명세표를 임의 수정하지 말고 테스트 고객 또는 확인된 고객으로 진행해야 한다.

## 로컬 output handoff
`output/codex-handoffs/20260429-121519-crm-deposit-credit-balance-deployed.md`

## Git 상태

```text
(clean)
```

## 최근 커밋

```text
664ac0e [codex] handoff 저장: crm-deposit-credit-balance-closeout
dcac90e [codex] CRM 예치금 잔액 계산 보완
a944711 [codex] handoff 저장: gurye-deposit-credit-balance-plan
```
