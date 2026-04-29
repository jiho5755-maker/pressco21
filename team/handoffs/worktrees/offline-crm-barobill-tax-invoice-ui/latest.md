---
handoff_id: HOFF-20260430-020030-crm-barobill-tax-invoice-final-closeout
created_at: 2026-04-30T02:00:30+0900
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
commit_sha: c436112
status: active
promoted_to_global: false
summary: "CRM 바로빌 세금계산서 자동화 UI/n8n 연동 최종 마감: 발급/상태조회/취소·상쇄, VAT 포함가 분리, 출고확정 후 발급 제한, 운영 배포와 브라우저 검증 및 테스트 데이터 정리 완료"
decision: "Codex durable handoff로 로컬 output 기록과 Git 추적 team/handoffs 기록을 함께 남겼습니다."
changed_artifacts:
  - "(no working-tree changes at handoff time)"
verification:
  - "local output handoff saved: output/codex-handoffs/20260430-020030-crm-barobill-tax-invoice-final-closeout.md"
  - "git status captured at handoff time"
open_risks:
  - "실제 바로빌/국세청 연동은 외부 상태에 의존하므로 운영 실발급은 매번 대상 명세표 fresh read 후 확인 필요. 인증키·ContactID·토큰·승인번호 전체값은 문서/출력 금지."
next_step: "다음 세션은 main 14076b6 기준에서 CRM 실사용 모니터링만 진행하고, 추가 실발급/취소는 사용자 승인 후 실행"
learn_to_save:
  - "사용자가 핸드오프를 요청하면 output 로컬 파일만으로는 부족하며 team/handoffs 추적 파일까지 남겨야 합니다."
local_output_handoff: "output/codex-handoffs/20260430-020030-crm-barobill-tax-invoice-final-closeout.md"
session_log: "output/codex-sessions/20260429-101751-offline-crm.md"
backup_folder: "(none)"
---

# Codex durable handoff

## 요약
CRM 바로빌 세금계산서 자동화 UI/n8n 연동 최종 마감: 발급/상태조회/취소·상쇄, VAT 포함가 분리, 출고확정 후 발급 제한, 운영 배포와 브라우저 검증 및 테스트 데이터 정리 완료

## 다음 작업
다음 세션은 main 14076b6 기준에서 CRM 실사용 모니터링만 진행하고, 추가 실발급/취소는 사용자 승인 후 실행

## 리스크
실제 바로빌/국세청 연동은 외부 상태에 의존하므로 운영 실발급은 매번 대상 명세표 fresh read 후 확인 필요. 인증키·ContactID·토큰·승인번호 전체값은 문서/출력 금지.

## 로컬 output handoff
`output/codex-handoffs/20260430-020030-crm-barobill-tax-invoice-final-closeout.md`

## Git 상태

```text
(clean)
```

## 최근 커밋

```text
c436112 [codex] 세금계산서 발급 출고확정 이후로 제한
3c426a7 [codex] CRM 세금계산서 상쇄 상태 보존
fe19c85 [codex] CRM 세금계산서 취소 상쇄 UI 연결
```
