# PRD: PRESSCO21 Shared Agent Ecosystem — Claude Code + Codex/OMX 공진화 구조 구축

> **프로젝트명**: PRESSCO21 Shared Agent Ecosystem
> **작성일**: 2026-04-21
> **버전**: 1.0
> **목표**: Claude Code와 Codex/OMX가 서로 다른 도구처럼 보이지 않고, 같은 회사 에이전트가 서로 다른 작업실에서 일하면서 같은 기억을 누적하는 AI-native 생태계를 구축한다.
> **핵심 원칙**: 같은 직원, 다른 런타임. 같은 기억, 다른 실행 근육.

---

## 0. TL;DR

PRESSCO21의 AI 시스템을 다음 구조로 재편한다.

1. **Shared Agent Kernel**
   - 회사 에이전트의 공식 roster, tone, decision principles, escalation, memory path를 하나의 커널로 통합한다.
2. **Shared Memory Spine**
   - persona / growth log / playbook / failures / founder preference / handoff를 도구 중립적으로 누적한다.
3. **Claude Adapter**
   - Claude Code는 공식 plugin / marketplace / skill / hook / subagent 기준의 frontdoor와 회의실 역할을 맡는다.
4. **OMX Adapter**
   - Codex/OMX는 generic runtime role을 유지하되, 외부적으로는 회사 에이전트 이름과 역할로 매핑된 실행실 역할을 맡는다.
5. **Cross-runtime Continuity**
   - Claude와 OMX 모두 세션 시작 시 최근 handoff / learnings / next step을 자동 로드하고, 세션 종료 시 재사용 가능한 learnings만 압축 저장한다.

이 프로젝트의 성공 기준은 “한지훈님·박서연님·최민석님·유준호님이 Claude와 OMX 어디에서 일하든 같은 직원처럼 느껴지고, 실제로도 같은 성장 로그를 이어가는 상태”다.

---

## 1. 배경

현재 PRESSCO21은 다음 두 생태계를 동시에 보유하고 있다.

### 1.1 Claude Code 쪽 강점
- `.claude/agent-memory/*` 기반의 도메인별 전문 기억 축적
- `HARNESS.md`, `CLAUDE.md`, `docs/에이전트-팀-사용가이드.md` 기반의 사람 친화적 회사형 서사
- 비전공자 창업자가 역할 이름으로 자연스럽게 접근하기 쉬운 frontdoor UX

### 1.2 Codex/OMX 쪽 강점
- `AGENTS.md` + `_tools/omx-run.sh` + `.omx/state/` 중심의 강한 실행 운영체제
- 병렬 lane, verification loop, worktree discipline, long-running execution
- repo-grounded implementation / testing / integration 능력

### 1.3 현재 문제
- 같은 회사 에이전트를 지향하지만 실제 사용자 경험은 “Claude 에이전트”와 “OMX 영문 role”이 분리돼 보인다.
- 학습이 도구별로 분리되면 같은 직원처럼 보이지만 실제로는 다른 기억을 가진 인격처럼 작동한다.
- `team/README.md`, `docs/에이전트-팀-사용가이드.md`, `CLAUDE.md` 간 에이전트 수와 조직 정의가 일치하지 않는다.
- Claude와 OMX가 각자 잘하는 방식은 다르지만, shared contract 없이 병렬 고도화하면 drift가 생긴다.

---

## 2. 문제 정의

### 문제 진술
비전공자인 대표가 AI를 사용할 때, 도구별로 다른 조직도와 다른 기억 체계를 마주하면 신뢰와 생산성이 급격히 떨어진다. 반대로, 같은 회사 에이전트가 같은 기억을 누적하되 도구별 실행 방식만 다르게 설계하면, 사용할수록 회사 맞춤형 AI 팀이 고도화되는 복리 구조를 만들 수 있다.

### 해결 원칙
1. **같은 직원은 같게 보여야 한다.**
2. **같은 직원이라도 런타임 역할은 달라질 수 있다.**
3. **공유해야 할 것은 정체성과 기억과 계약이다.**
4. **공유하지 말아야 할 것은 low-level runtime mechanic이다.**
5. **세션 연속성은 자동으로 체감되어야 한다.**

---

## 3. 목표

### 3.1 사용자 목표
- 대표는 “Claude냐 Codex냐”가 아니라 “누구와 일하느냐”로 시스템을 이해한다.
- 한지훈님, 박서연님, 최민석님, 유준호님 등 핵심 에이전트는 같은 직원으로 체감된다.
- 지난 세션의 learnings가 다음 세션 시작 시 자동 반영된다.
- 사용할수록 각 에이전트의 playbook과 founder 맞춤 판단이 더 좋아진다.

### 3.2 시스템 목표
- Shared Agent Kernel / Memory Spine / Handoff Schema를 중앙 계약으로 정립한다.
- Claude는 공식 plugin 기반으로 확장 가능한 frontdoor를 가진다.
- OMX는 강한 runtime 성능을 유지하면서도 외부 출력은 회사 에이전트 중심으로 래핑한다.
- 교차 검증이 가능한 artifact 중심 구조를 만든다.

---

## 4. 비목표

- 두 도구의 내부 runtime role을 완전히 동일하게 만드는 것
- Claude의 모든 persona 구조를 OMX에 그대로 이식하는 것
- OMX의 모든 team/tmux/state 메커니즘을 Claude에 복제하는 것
- 모든 대화 로그를 자동으로 영구 저장하는 것
- 첫 단계부터 30명+ 전체 에이전트를 다 전면 노출하는 것

---

## 5. 아키텍처

## 5.1 Shared Agent Kernel
공식 roster / persona contract / tone / escalation / memory path를 담는 중립 계층.

### 핵심 산출물
- `team/registry/agents.yaml` 또는 동등 구조
- `team/personas/*` 정합화
- `team/boardroom.md`와 `team/protocols/*`를 shared contract source로 재정리

### 각 agent에 필요한 필드
- `agent_id`
- `display_name`
- `title`
- `org`
- `tone`
- `core_mission`
- `decision_principles`
- `escalation_rules`
- `memory_path`
- `growth_log_path`
- `playbook_path`
- `forbidden_actions`
- `claude_adapter_profile`
- `omx_adapter_profile`

## 5.2 Shared Memory Spine
도구 중립적으로 누적되는 기억 계층.

### 기억 단위
- persona
- knowledge base
- growth log
- playbook
- known failures
- founder preferences
- recent learnings
- reusable handoffs

### 저장 원칙
**Save only if it changes future behavior.**

## 5.3 Claude Adapter
Claude Code 전용 frontdoor / 회의실 / 설명실 계층.

### 공식 기준
- plugin
- marketplace
- skill
- hook
- subagent
- memory
- MCP

### 우선 구현 항목
- `pressco21-core-personas`
- `pressco21-session-continuity`
- `pressco21-team-meeting`
- `pressco21-memory-sync`

## 5.4 OMX Adapter
Codex/OMX 전용 실행실 / 검증실 계층.

### 원칙
- 내부 generic role(`architect`, `critic`, `analyst`, `executor`, `verifier`) 유지
- 외부 출력과 회의 서사는 회사 에이전트 이름으로 매핑

### 우선 구현 항목
- company-agent role mapping
- company-agent formatted meeting output
- shared handoff export/import
- shared memory read/write adapter

## 5.5 Session Continuity Layer
세션 시작과 종료에 동일한 연속성을 제공하는 계층.

### Session Start에서 로드할 것
- 현재 branch/worktree
- latest handoff
- recent learnings (최대 3)
- open risks
- next step
- relevant playbook

### Session End에서 저장할 것
- what changed
- what worked
- what failed
- what should be reused
- whether growth log / playbook / founder preference에 승격할지

---

## 6. 운영 모델

## 6.1 사용자 mental model
**한 회사, 두 작업실**
- Claude = 회의실 / 비서실 / frontdoor
- Codex/OMX = 실행실 / 공장 / 검증실
- 직원은 같고, 경험은 누적된다.

## 6.2 역할 분담
- **전략 / 공통 계약 설계**: 중앙에서 확정
- **Shared Kernel 구현**: 한 번에 한 tool만 쓰기 가능
- **Claude-specific 구현**: Claude Code에서 개발 및 1차 검증
- **OMX-specific 구현**: Codex/OMX에서 개발 및 1차 검증
- **최종 교차검증**: 반대 도구가 2차 검토

## 6.3 충돌 방지 원칙
- Shared Kernel 파일은 동시 수정 금지
- adapter 구현은 각 플랫폼 전용 파일만 수정
- handoff schema와 registry key는 먼저 고정 후 병렬 구현

---

## 7. Workstream

### WS-A. Shared Kernel 정합화
- 에이전트 수 / roster / naming 통일
- 핵심 4~6명 founder-facing 우선 노출
- team/personas와 docs 간 불일치 제거

### WS-B. Shared Memory Spine 정비
- growth-log / playbook / failures / founder-preferences 표준화
- 저장 규칙과 승격 기준 정의

### WS-C. Claude Ecosystem 구축
- 공식 plugin 기준 설계
- SessionStart / Stop continuity 훅 설계
- named agent frontdoor UX와 team-meeting UX 정리
- 커뮤니티 프레임워크(SuperClaude, Claudekit)는 흡수형 레퍼런스로 활용

### WS-D. OMX Ecosystem 구축
- company-agent output wrapper
- role mapping
- shared handoff schema 연동
- meeting output / verification output의 company formatting

### WS-E. Cross-runtime Verification
- Claude side output이 shared contract를 준수하는지 검증
- OMX side output이 founder-facing identity를 유지하는지 검증

---

## 8. Claude 기준 외부 레퍼런스 사용 원칙

### 8.1 공식 기준
Claude Code 관련 설계의 최종 판단 기준은 항상 **Claude 공식 plugin / marketplace / hooks / skills / subagents 문서**다.

### 8.2 커뮤니티 프레임워크 활용 원칙
- SuperClaude: command taxonomy, modes, business-panel, spawn 패턴 흡수
- Claudekit: guardrails, checkpoint, spec-first, hook profiling 패턴 흡수
- 그대로 설치해 표준으로 삼지 않고, 공식 기준에 맞는 형태로 재구성한다.

---

## 9. 단계별 실행 계획

### Phase 1 — Canonical Roster 확정
- agent 수 / 이름 / title / 핵심 4~6명 우선순위 정리
- founder-facing 설명 문서 1개로 통합

### Phase 2 — Shared Kernel / Memory Spine 도입
- registry / schema / growth log / playbook / handoff spec 구축

### Phase 3 — Claude Adapter 구축
- project skill / plugin / hook / continuity UX 설계 및 구현

### Phase 4 — OMX Adapter 구축
- company-agent mapping / meeting wrapper / shared memory adapter 구현

### Phase 5 — Weekly Evolution Loop 운영
- learned patterns
- repeated failures prevented
- new SOPs
- stale memory cleanup

---

## 10. 성공 지표

### 정성 지표
- 대표가 “도구”가 아니라 “직원” 기준으로 시스템을 이해한다.
- 지난 세션 문맥이 다시 설명 없이 이어진다고 느낀다.
- 같은 agent 이름이 두 작업실에서 일관되게 보인다.

### 정량 지표
- handoff reuse rate
- repeated-explanation reduction
- learned pattern count / week
- playbook reuse count
- cross-runtime drift incidents
- onboarding friction for new session

---

## 11. 리스크

1. **Fake parity**
   - 같은 agent처럼 보이지만 shared memory가 실제로 분리되면 신뢰를 잃는다.
2. **Prompt bloat**
   - Claude harness와 OMX runtime prompt를 억지로 합치면 성능이 떨어진다.
3. **Shared Kernel 동시수정**
   - registry / schema drift가 생기면 양쪽 adapter가 깨진다.
4. **Too many visible agents too early**
   - 초기에 30명 이상 전면 노출하면 founder가 오히려 혼란을 느낀다.

---

## 12. 즉시 다음 액션

1. PRD 승인
2. founder-facing 핵심 agent 4~6명 고정
3. Shared Agent Kernel 스키마와 handoff schema 먼저 확정
4. Claude-specific prompt/skill 생성
5. Codex/OMX-specific prompt 생성
6. shared vs platform-specific ownership 표 만들기

---

## 13. 승인 문구
이 PRD는 “Claude와 Codex를 동일한 내부 도구로 만들기 위한 문서”가 아니라, “같은 회사 에이전트가 서로 다른 런타임에서 같은 기억을 이어가며 일하도록 만드는 문서”다.
