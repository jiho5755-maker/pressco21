# Shared Agent Kernel — Workspace Staging Area

> 상태: v1 draft (2026-04-21)
> 목적: Claude Code와 Codex/OMX가 공통으로 읽을 수 있는 **회사 에이전트 계약층**을 먼저 workspace 범위에서 정리하기 위한 staging area.

## 왜 `docs/` 아래에 두는가

현재 브랜치(`work/workspace/*`)의 허용 범위는 `docs/`, `.claude/`, `.codex/`, `_tools/` 중심이다.
즉, `team/registry/*` 같은 최종 위치를 바로 커밋하기보다, 먼저 workspace-safe 문서와 스키마를 확정한 뒤 이후 적절한 브랜치에서 옮기는 방식이 안전하다.

이 폴더는 **최종 source of truth가 아니라, final kernel로 승격되기 전의 계약 초안 묶음**이다.

## 포함 문서

- `agents.v1.yaml`
  - founder-facing 핵심 9명 에이전트 roster + adapter mapping 초안
- `memory-spine-spec-v1.md`
  - shared memory 계층 구조와 저장 원칙
- `handoff-contract-v1.md`
  - cross-runtime handoff 표준
- `runtime-divergence-matrix-v1.md`
  - shared vs Claude-only vs OMX-only 규칙 구분표
- `founder-facing-roster-v1.md`
  - 대표가 실제로 기억하고 부르면 되는 핵심 직원 roster 설명서
- `handoff-examples-v1.md`
  - Claude와 OMX가 어떻게 compact handoff를 주고받는지 예시
- `canonical-roster-migration-plan-v1.md`
  - 현재 drift를 canonical roster 기준으로 줄이는 단계별 계획
- `cross-runtime-review-checklist-v1.md`
  - Claude와 OMX 산출물을 통합 검토할 때 쓰는 체크리스트
- `claude-compact-update-2026-04-21.md`
  - Claude 작업실이 최신 shared-kernel 진척을 빠르게 따라잡도록 하는 compact handoff
- `claude-prompt-packet-2026-04-21.md`
  - Claude 세션에 바로 붙여넣는 실행 패킷
- `claude-adapter-handoff-to-omx-2026-04-21.md`
  - Claude-side 구현 완료 보고를 OMX가 이어받는 compact handoff
- `omx-founder-facing-output-spec-v1.md`
  - OMX 출력이 회사 에이전트 이름으로 보이게 하는 founder-facing 출력 규격
- `omx-founder-facing-output-examples-v1.md`
  - OMX founder-facing 출력 예시
- `proposals/claude-side-kernel-proposals-2026-04-21.md`
  - Claude-side에서 분리 제출한 shared-kernel 변경 제안 원문
- `proposals/claude-side-kernel-proposals-review-2026-04-21.md`
  - 제안 3건에 대한 채택/보류 결정 기록

## 설계 원칙

1. **같은 직원, 다른 런타임**
2. **shared contract, separate embodiments**
3. **save only if it changes future behavior**
4. founder-facing naming은 canonical roster를 따름
5. low-level runtime mechanism은 공유하지 않음

## 다음 단계

1. roster / id / naming 확정
2. Claude branch와 OMX branch에서 이 문서를 참조해 각 adapter 구현
3. drift가 없으면 `team/registry/*` 또는 동등 최종 경로로 승격
