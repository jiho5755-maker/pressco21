---
handoff_id: HOFF-20260429-101953-barobill-tax-invoice-n8n-plan
created_at: 2026-04-29T10:19:54+0900
runtime: codex-omx
owner_agent_id: yoo-junho-paircoder
contributors: []
scope_type: worktree
project: n8n
worktree_slot: n8n-barobill-tax-invoice-webhook
repo_root: /Users/jangjiho/workspace/pressco21-worktrees/n8n-barobill-tax-invoice-webhook
branch: "work/n8n/barobill-tax-invoice-webhook"
worktree_path: "/Users/jangjiho/workspace/pressco21-worktrees/n8n-barobill-tax-invoice-webhook"
source_cwd: "/Users/jangjiho/workspace/pressco21-worktrees/n8n-barobill-tax-invoice-webhook"
commit_sha: a744a45
status: active
promoted_to_global: false
summary: "바로빌 전자세금계산서 실제 SOAP 발급/상태조회는 CRM 브라우저가 아니라 n8n workflow에서 수행하기로 확정하고, n8n 전용 개발계획 문서 n8n-automation/docs/barobill-tax-invoice-webhook-plan-2026-04-29.md를 추가했다."
decision: "Codex durable handoff로 로컬 output 기록과 Git 추적 team/handoffs 기록을 함께 남겼습니다."
changed_artifacts:
  - "n8n-automation/docs/barobill-tax-invoice-webhook-plan-2026-04-29.md"
verification:
  - "local output handoff saved: output/codex-handoffs/20260429-101953-barobill-tax-invoice-n8n-plan.md"
  - "git status captured at handoff time"
open_risks:
  - "바로빌은 중복발급 방지를 제공하지 않으므로 n8n request log와 CRM invoice meta 기준 idempotency가 선행되어야 한다. API KEY/연동인증키/인증서 정보는 출력·문서·커밋 금지."
next_step: "CRM barobill-tax-invoice-ui branch의 payload 계약에 맞춰 테스트 인증키 기반 SOAP 발급 request adapter, 상태조회 adapter, scheduled polling, request log/idempotency log를 구현한다. 운영 발급은 개인정보 처리위탁 계약, 운영 인증키, 공동인증서, 선불포인트 확인 및 별도 승인 전까지 금지한다."
learn_to_save:
  - "사용자가 핸드오프를 요청하면 output 로컬 파일만으로는 부족하며 team/handoffs 추적 파일까지 남겨야 합니다."
local_output_handoff: "output/codex-handoffs/20260429-101953-barobill-tax-invoice-n8n-plan.md"
session_log: "output/codex-sessions/20260429-101953-n8n.md"
backup_folder: "output/codex-backups/20260429-101953-barobill-tax-invoice-n8n-plan"
---

# Codex durable handoff

## 요약
바로빌 전자세금계산서 실제 SOAP 발급/상태조회는 CRM 브라우저가 아니라 n8n workflow에서 수행하기로 확정하고, n8n 전용 개발계획 문서 n8n-automation/docs/barobill-tax-invoice-webhook-plan-2026-04-29.md를 추가했다.

## 다음 작업
CRM barobill-tax-invoice-ui branch의 payload 계약에 맞춰 테스트 인증키 기반 SOAP 발급 request adapter, 상태조회 adapter, scheduled polling, request log/idempotency log를 구현한다. 운영 발급은 개인정보 처리위탁 계약, 운영 인증키, 공동인증서, 선불포인트 확인 및 별도 승인 전까지 금지한다.

## 리스크
바로빌은 중복발급 방지를 제공하지 않으므로 n8n request log와 CRM invoice meta 기준 idempotency가 선행되어야 한다. API KEY/연동인증키/인증서 정보는 출력·문서·커밋 금지.

## 로컬 output handoff
`output/codex-handoffs/20260429-101953-barobill-tax-invoice-n8n-plan.md`

## Git 상태

```text
(clean)
```

## 최근 커밋

```text
a744a45 [codex] 바로빌 세금계산서 n8n 계획 정리
bba1e2a Merge work/offline-crm/closeout-deploy-20260428
26a9590 [codex] handoff 저장: crm-final-closeout-20260428
```
