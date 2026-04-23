---
handoff_id: HOFF-2026-04-23-codex-team-memory-mainline
created_at: 2026-04-23T11:30:00+09:00
runtime: codex-omx
owner_agent_id: yoon-haneul-pm
contributors: [han-jihoon-cso, choi-minseok-cto, kang-yerin-hr]
branch: work/team/shared-agent-memory-mainline
worktree_path: /Users/jangjiho/workspace/pressco21-worktrees/team-shared-agent-memory-mainline
summary: Shared Agent Kernel main 통합 이후 team/handoffs와 team/knowledge-base를 별도 team 브랜치에서 정리했습니다. Claude의 main 통합 handoff와 Codex의 덕테이프 이미지 전략 handoff를 보존하고, Core 6 중심 README/boardroom 및 agent별 playbook/failures/founder preferences를 반영했습니다.
decision: workspace 통합 산출물과 장기 기억 산출물을 분리한다. main의 공통 도구/문서는 workspace 브랜치에서 관리하고, handoff·growth-log·playbook·failures·founder preferences는 team 브랜치에서 관리한다.
changed_artifacts:
  - team/README.md
  - team/boardroom.md
  - team/handoffs/latest.md
  - team/handoffs/2026-04-23-claude-main-integration.md
  - team/handoffs/2026-04-23-codex-duct-tape-draft.md
  - team/knowledge-base/shared/founder-preferences.md
  - team/knowledge-base/*/growth-log.md
  - team/knowledge-base/*/playbook.md
  - team/knowledge-base/*/failures.md
verification:
  - bash _tools/pressco21-check.sh: team scope OK
  - handoff archive files created for Claude and Codex latest handoffs
  - knowledge-base contains growth-log for 9 core agents
  - playbook/failures files initialized for founder-facing operation
open_risks:
  - Codex 덕테이프 handoff는 아직 workspace-ai-team-pilot의 별도 WIP 산출물 일부를 참조하므로, 해당 작업은 별도 workspace 브랜치에서 정리해야 합니다.
  - 기존 team-shared-agent-memory-bootstrap 워크트리는 이 브랜치가 main에 병합된 뒤 삭제 후보입니다.
next_step: 이 team 브랜치를 검증 후 main에 병합하고, 이어서 workspace 브랜치에서 handoff 자동 흐름과 OMX call-site 연결 상태를 점검합니다.
learn_to_save:
  - shared-agent 장기 기억은 workspace 도구 통합과 분리해 team 브랜치에서 관리해야 충돌과 scope 리스크가 줄어듭니다.
  - 최신 handoff 하나만 덮어쓰지 말고 중요한 런타임별 handoff는 dated archive 파일로 보존해야 다음 세션 추적이 쉬워집니다.
---

## 담당
윤하늘님(PM)

## 참여
한지훈님(CSO), 최민석님(CTO), 강예린님(HR코치)

## 요약
Shared Agent Kernel의 팀 기억 저장소를 main에 합치기 위한 team 브랜치에서 정리했습니다. Claude와 Codex의 최근 handoff를 보존하고, 핵심 에이전트별 성장 로그·playbook·failures·대표 선호도를 연결했습니다.

## 확인한 것
- team scope 전용 브랜치에서 작업했습니다.
- handoff는 latest와 dated archive를 함께 둡니다.
- Core 6 founder-facing 설명을 README와 boardroom에 반영했습니다.

## 남은 위험
- 덕테이프 이미지 전략 문서/도구는 아직 별도 workspace WIP입니다.

## 다음
team 브랜치를 main에 병합한 뒤, handoff 자동 흐름과 OMX call-site 연결 점검으로 넘어갑니다.
