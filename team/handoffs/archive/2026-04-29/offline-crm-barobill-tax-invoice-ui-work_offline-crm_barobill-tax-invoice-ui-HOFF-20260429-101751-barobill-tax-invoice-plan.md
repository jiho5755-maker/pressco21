---
handoff_id: HOFF-20260429-101751-barobill-tax-invoice-plan
created_at: 2026-04-29T10:17:52+0900
runtime: codex-omx
owner_agent_id: yoo-junho-paircoder
contributors: []
scope_type: worktree
project: offline-crm
worktree_slot: offline-crm-barobill-tax-invoice-ui
repo_root: /Users/jangjiho/workspace/pressco21-worktrees/offline-crm-barobill-tax-invoice-ui
branch: "work/offline-crm/barobill-tax-invoice-ui"
worktree_path: "/Users/jangjiho/workspace/pressco21-worktrees/offline-crm-barobill-tax-invoice-ui"
source_cwd: "/Users/jangjiho/workspace/pressco21-worktrees/offline-crm-barobill-tax-invoice-ui"
commit_sha: 318fd5b
status: active
promoted_to_global: false
summary: "바로빌 전자세금계산서 자동화는 CRM UI/상태 모델과 n8n SOAP 실행을 분리하기로 팀미팅에서 확정했다. CRM worktree에는 상세 설계 문서와 팀미팅 문서를 추가했고, MVP는 mock/dry-run 발급 요청 UI, 필수값 검증, 중복요청 방어, 상태 badge까지로 제한한다."
decision: "Codex durable handoff로 로컬 output 기록과 Git 추적 team/handoffs 기록을 함께 남겼습니다."
changed_artifacts:
  - "offline-crm-v2/docs/barobill-tax-invoice-integration-plan-2026-04-29.md"
  - "offline-crm-v2/docs/barobill-tax-invoice-team-meeting-2026-04-29.md"
verification:
  - "local output handoff saved: output/codex-handoffs/20260429-101751-barobill-tax-invoice-plan.md"
  - "git status captured at handoff time"
open_risks:
  - "바로빌은 중복발급 방지를 제공하지 않고 국세청 결과도 웹훅이 아니라 상태조회 API로 확인한다. 운영 발급은 개인정보 처리위탁 계약, 운영 인증키, 공동인증서, 선불포인트, idempotency 검증 전까지 금지한다."
next_step: "Invoices 화면의 세금계산서 상태 badge와 발급 요청 다이얼로그를 구현하고, accountingMeta에 상세 세금계산서 meta를 확장한다. 실제 바로빌 SOAP 호출은 별도 n8n worktree에서 테스트 인증키로 진행한다. 완료 전 npm run build, 변경 파일 lint 또는 가능한 테스트, pressco21-check를 실행한다."
learn_to_save:
  - "사용자가 핸드오프를 요청하면 output 로컬 파일만으로는 부족하며 team/handoffs 추적 파일까지 남겨야 합니다."
local_output_handoff: "output/codex-handoffs/20260429-101751-barobill-tax-invoice-plan.md"
session_log: "output/codex-sessions/20260429-101751-offline-crm.md"
backup_folder: "output/codex-backups/20260429-101752-barobill-tax-invoice-plan"
---

# Codex durable handoff

## 요약
바로빌 전자세금계산서 자동화는 CRM UI/상태 모델과 n8n SOAP 실행을 분리하기로 팀미팅에서 확정했다. CRM worktree에는 상세 설계 문서와 팀미팅 문서를 추가했고, MVP는 mock/dry-run 발급 요청 UI, 필수값 검증, 중복요청 방어, 상태 badge까지로 제한한다.

## 다음 작업
Invoices 화면의 세금계산서 상태 badge와 발급 요청 다이얼로그를 구현하고, accountingMeta에 상세 세금계산서 meta를 확장한다. 실제 바로빌 SOAP 호출은 별도 n8n worktree에서 테스트 인증키로 진행한다. 완료 전 npm run build, 변경 파일 lint 또는 가능한 테스트, pressco21-check를 실행한다.

## 리스크
바로빌은 중복발급 방지를 제공하지 않고 국세청 결과도 웹훅이 아니라 상태조회 API로 확인한다. 운영 발급은 개인정보 처리위탁 계약, 운영 인증키, 공동인증서, 선불포인트, idempotency 검증 전까지 금지한다.

## 로컬 output handoff
`output/codex-handoffs/20260429-101751-barobill-tax-invoice-plan.md`

## Git 상태

```text
(clean)
```

## 최근 커밋

```text
318fd5b [codex] 바로빌 세금계산서 팀미팅 확정
c62165b [codex] 바로빌 세금계산서 연동 계획 정리
bba1e2a Merge work/offline-crm/closeout-deploy-20260428
```
