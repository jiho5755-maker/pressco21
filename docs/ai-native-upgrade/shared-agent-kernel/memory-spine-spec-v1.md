# Shared Memory Spine Spec v1

## 목적
Claude Code와 Codex/OMX가 같은 회사 에이전트를 다른 작업실에서 실행하더라도, 장기적으로 같은 판단 습관과 같은 재사용 지식을 누적하도록 만드는 공통 기억 구조를 정의한다.

## 핵심 원칙
1. **save only if it changes future behavior**
2. **raw transcript보다 compressed learning이 우선**
3. **도구 전용 state와 회사 전용 memory를 분리**
4. **검증 가능한 파일 기반 기억만 장기 저장**

---

## 기억 계층

### Layer 1 — Persona (거의 안 바뀌는 정체성)
- 이름
- 직책
- 말투
- 핵심 미션
- 기본 판단 원칙
- escalation 규칙

**현재 source**: `team/personas/*`

### Layer 2 — Knowledge Base (도메인 지식)
- 회사 고유 규칙
- 프로젝트별 배경지식
- 도메인 판단 기준
- 운영 사실

**현재 source 후보**:
- `.claude/agent-memory/*`
- `OPS_STATE.md`
- 관련 PRD / guide 문서

### Layer 3 — Growth Log (경험 누적)
- Added
- Improved
- Known Issues
- Failed Approaches
- Learned
- Next Session TODO

**현재 source**: `team/knowledge-base/*/growth-log.md`

### Layer 4 — Playbook
- 반복 요청 대응법
- 설명 템플릿
- 역할별 판단 템플릿
- founder 맞춤 설명 패턴
- escalation 기준의 실제 적용 예시

**Canonical path**: `team/knowledge-base/<agent>/playbook.md`

### Layer 5 — Failure Library
- 반복 실수
- 혼동되기 쉬운 개념
- 과거에 실패했던 접근
- 다시 하지 말아야 할 구현 패턴

**Canonical path**: `team/knowledge-base/<agent>/failures.md`

### Layer 6 — Founder Preferences
- 설명 길이
- 승인 경계
- 선호하는 카피/톤
- 리스크 보고 스타일
- pair-coding 선호 흐름

**Canonical path**: `team/knowledge-base/shared/founder-preferences.md`

### Layer 7 — Reusable Handoffs
- 최근 작업 요약
- 다음 세션의 next step
- 검증 증거
- 관련 playbook/link

**도구별 runtime artifact와 분리된 compact summary가 핵심**

---

## 저장 규칙

### 저장해도 되는 것
- 같은 요청이 반복될 가능성이 높은 패턴
- 대표가 명시하거나 반복적으로 보인 선호
- 역할별 판단 기준을 바꿀 정도의 새 사실
- 나중에 같은 실수를 막아줄 failure
- 특정 agent의 tone/explanation 방식을 개선할 reusable pattern

### 저장하지 말아야 할 것
- 일회성 잡담
- 원본 대화 전문
- 감정만 있고 재사용성 없는 표현
- 검증되지 않은 추정치
- runtime internal noise (`.omx/state` 등)

---

## 세션 시작 시 최소 로드 셋
각 agent가 세션 시작 시 참고해야 할 정보는 최대한 얇게 유지한다.

### 기본
- persona summary
- last 3 learnings
- open known issue top 2
- next session TODO top 3

### 필요시 추가
- relevant playbook
- relevant failure case
- relevant founder preference

---

## 세션 종료 시 추출 항목
각 세션 종료 시 아래 5가지만 판단한다.

1. 이번 작업이 어떤 agent의 행동 기준을 바꾸는가?
2. playbook으로 승격할 reusable pattern이 있는가?
3. failure library에 남겨야 할 실수/위험이 있는가?
4. founder preference로 저장할 가치가 있는가?
5. 다음 세션이 바로 이어받아야 할 compact handoff가 있는가?

---

## 교차 런타임 원칙
- Claude는 founder-facing wording과 continuity UX에 강하다.
- OMX는 execution evidence와 verification loop에 강하다.
- 두 런타임이 같은 memory spine을 쓰되, 저장은 모두 compact artifact 형태로만 승격한다.
