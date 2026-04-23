# Claude Compact Update — Shared Agent Ecosystem (2026-04-21)

> 대상: `work/workspace/claude-shared-agent-ecosystem`에서 Claude Code를 실행 중인 작업실
> 목적: Shared Kernel이 이 worktree에서 추가로 진척된 내용을 Claude 작업실이 빠르게 따라잡도록 만드는 compact handoff
> 작성 기준 runtime: codex-omx (shared-kernel custodian lane)

---

## 한 줄 요약

Shared Agent Ecosystem는 이제 PRD 수준을 넘어 **실제 운영 가능한 shared contract package**로 진척되었다. Claude 작업실은 이제 단순 개념 설계가 아니라, 아래 shared-kernel 문서를 기준으로 **Claude-side adapter / continuity / plugin architecture**를 구체 구현해도 되는 단계다.

---

## 이번에 새로 생긴 핵심 산출물

### 1. Shared Agent Kernel staging package
경로: `docs/ai-native-upgrade/shared-agent-kernel/`

새 문서:
- `README.md`
- `agents.v1.yaml`
- `memory-spine-spec-v1.md`
- `handoff-contract-v1.md`
- `runtime-divergence-matrix-v1.md`
- `founder-facing-roster-v1.md`
- `handoff-examples-v1.md`
- `canonical-roster-migration-plan-v1.md`
- `cross-runtime-review-checklist-v1.md`
- `templates/README.md`
- `templates/playbook.template.md`
- `templates/failures.template.md`
- `templates/founder-preferences.template.md`
- `templates/growth-log.template.md`
- `templates/handoff.template.yaml`

### 2. Shared Kernel의 현재 의미
이 문서 묶음은 더 이상 단순 아이디어가 아니라 아래를 실제로 고정하기 시작한 상태다.
- canonical founder-facing agent naming
- same employees / different runtimes 구조
- shared memory 저장 원칙
- cross-runtime handoff schema
- runtime-specific divergence rule
- future drift review checklist

---

## Claude 작업실이 반드시 알아야 하는 현재 canonical point

### A. founder-facing core roster
현재 핵심 노출 roster는 아래 6개다.
- `yoo-junho-paircoder`
- `choi-minseok-cto`
- `park-seoyeon-cfo`
- `han-jihoon-cso`
- `yoon-haneul-pm`
- `team-meeting`

즉, Claude 쪽 founder-facing UX / plugin / continuity output은 이 core 6을 중심으로 보여주는 것이 현재 기준이다.

### B. shared vs runtime-specific 경계
반드시 공유:
- canonical roster
- agent ids
- domain truth
- handoff schema
- memory spine 저장 원칙
- founder-facing naming

공유하지 않음:
- runtime internal role names
- tmux/team/session internals
- hook execution mechanic 세부
- prompt body 전체 복제

### C. 저장 원칙
- **Save only if it changes future behavior**
- raw transcript보다 compressed learning 우선
- Claude는 continuity wording에 강하고, OMX는 execution evidence에 강하다
- 따라서 Claude는 founder-facing continuity와 named-agent experience를 더 잘 만들되, shared memory에 저장할 learnings는 compact artifact로 압축해야 한다

---

## Claude 작업실의 역할 재정의

Claude 작업실은 지금부터 아래를 담당하면 된다.

### 해야 할 것
1. Claude-native continuity 설계
   - SessionStart에 무엇을 보여줄지
   - SessionEnd/Stop에서 무엇을 뽑아낼지
2. founder-facing named-agent UX
   - 같은 직원이 Claude 회의실에서 말하는 느낌
3. official Claude plugin / hook / skill / subagent 기준 구조
4. shared-kernel 문서를 읽고 Claude adapter 구조로 번역

### 아직 하지 말아야 할 것
1. shared-kernel 문서 직접 rewrite
2. `agent_id` / canonical roster를 독자적으로 바꾸기
3. OMX internal runtime mechanic을 Claude에 복제하기
4. raw chat transcript 기반 장기 기억 설계

### shared-kernel 변경이 필요하면
바로 수정하지 말고 **변경 제안**으로 분리해라.

---

## Claude가 지금 참고할 읽기 순서 (updated)

1. `AGENTS.md`
2. `CLAUDE.md`
3. `HARNESS.md`
4. `docs/ai-native-upgrade/PRD-pressco21-shared-agent-ecosystem-v1.md`
5. `docs/ai-native-upgrade/shared-agent-kernel/README.md`
6. `docs/ai-native-upgrade/shared-agent-kernel/agents.v1.yaml`
7. `docs/ai-native-upgrade/shared-agent-kernel/founder-facing-roster-v1.md`
8. `docs/ai-native-upgrade/shared-agent-kernel/memory-spine-spec-v1.md`
9. `docs/ai-native-upgrade/shared-agent-kernel/handoff-contract-v1.md`
10. `docs/ai-native-upgrade/shared-agent-kernel/runtime-divergence-matrix-v1.md`
11. `docs/ai-native-upgrade/shared-agent-kernel/handoff-examples-v1.md`
12. `docs/ai-native-upgrade/shared-agent-kernel/canonical-roster-migration-plan-v1.md`
13. `docs/ai-native-upgrade/shared-agent-kernel/cross-runtime-review-checklist-v1.md`
14. `docs/ai-native-upgrade/shared-agent-kernel/templates/*`
15. `.claude/skills/pressco21-claude-ecosystem/SKILL.md`

---

## Claude 작업실이 바로 시작하면 좋은 일

### 우선순위 1
Claude SessionStart / SessionEnd continuity 설계
- founder-facing briefing shape
- 최근 learnings 1~3개 로드 방식
- next step / open risk 노출 방식
- learn_to_save 추출 방식

### 우선순위 2
Claude plugin / skill / hook 구조 초안
- 어떤 plugin 단위로 나눌지
- `pressco21-session-continuity`
- `pressco21-core-personas`
- `pressco21-team-meeting`
- `pressco21-memory-sync`

### 우선순위 3
Claude founder-facing output wording 규칙
- 사람 이름 우선
- 도구/모델 설명 최소화
- “같은 직원, 다른 작업실” mental model 유지

---

## open risk
1. Claude worktree가 이 최신 문서들을 실제로 가지고 있지 않을 수 있음
2. founder-facing roster와 기존 문서(`team/README`, `docs/에이전트-팀-사용가이드`, `CLAUDE.md`)의 drift는 아직 해소 전
3. shared memory의 최종 저장 위치는 아직 staging 단계이며, 지금은 schema/template 우선 상태

---

## next step for Claude
이 compact update를 읽은 뒤, Claude는 **shared kernel을 기준으로 Claude-side continuity / plugin / named-agent adapter 설계와 구현**을 시작하면 된다.

shared-kernel 변경이 필요하면, 변경안을 따로 제시한다.

---

## learn_to_save 후보
- founder-facing core roster는 6명 중심으로 먼저 굳히는 것이 UX적으로 안전하다
- continuity는 “최근 세션 요약 + 다음 행동 + 저장 후보 learning” 3축이 핵심이다
- 같은 직원 정체성은 유지하되 runtime-specific mechanic은 분리하는 것이 drift를 줄인다
