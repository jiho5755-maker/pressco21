# Canonical Roster Migration Plan v1

> 목적: 현재 여러 문서에 흩어진 에이전트 수/조직/표현 불일치를 단계적으로 해소하고, Claude와 Codex/OMX가 같은 회사 roster를 기준으로 움직이도록 만든다.

## 현재 drift

### 현재 확인된 불일치
- `team/README.md` → 35 AI
- `docs/에이전트-팀-사용가이드.md` → 36개 AI 에이전트 팀
- `CLAUDE.md` → 25 agents
- `HARNESS.md` → C-Suite 8 + 글로벌/프로젝트 에이전트 중심 구조
- `team/personas/*` → founder-facing executive roster 9명

### 왜 위험한가
1. 대표가 “이 팀이 진짜 같은 팀인가?”를 의심하게 된다.
2. Claude와 OMX가 서로 다른 이름 체계를 외부로 노출할 수 있다.
3. 같은 agent를 다른 숫자/범주로 설명하면 continuity가 무너진다.

---

## 목표 상태

### founder-facing 기준
대표에게는 아래만 우선 보인다.
- Core 6: 유준호 / 최민석 / 박서연 / 한지훈 / 윤하늘 / 팀회의
- Extended executive roster: 정유나 / 김도현 / 조현우 / 강예린

### implementation-facing 기준
내부적으로는 더 많은 specialist / runtime role / plugin / skill이 있을 수 있다.
그러나 founder-facing 표현은 always canonical roster를 기준으로 한다.

---

## Source of truth 우선순위

### 1순위 (신규 canonical source)
- `docs/ai-native-upgrade/shared-agent-kernel/agents.v1.yaml`
- `docs/ai-native-upgrade/shared-agent-kernel/founder-facing-roster-v1.md`

### 2순위 (persona source)
- `team/personas/*`
- `team/boardroom.md`
- `team/protocols/*`

### 3순위 (도구별 adapter 문서)
- `CLAUDE.md`
- `HARNESS.md`
- future Claude plugin docs
- future OMX adapter docs

즉, 앞으로는 “숫자와 이름”은 shared-kernel 문서에서 먼저 정하고, 도구별 문서는 이를 참조하게 만든다.

---

## migration 원칙

1. 한 번에 전면 수정하지 않는다.
2. 먼저 canonical source를 만든 뒤, 기존 문서를 순차적으로 맞춘다.
3. founder-facing 문구와 implementation-facing 설명을 분리한다.
4. specialist 수와 runtime role 수를 founder-facing roster에 직접 노출하지 않는다.

---

## 단계별 계획

### Phase 1 — canonical source 확정
- [x] shared-agent PRD 작성
- [x] founder-facing roster 초안 작성
- [x] agents.v1.yaml 작성
- [ ] core 6 / extended executive roster 최종 확정

### Phase 2 — drift audit
다음 문서에 대해 아래 항목을 표로 정리한다.
- 현재 agent 수 표현
- founder-facing 여부
- implementation-facing 여부
- 수정 필요 여부

대상 문서:
- `team/README.md`
- `docs/에이전트-팀-사용가이드.md`
- `CLAUDE.md`
- `HARNESS.md`
- 향후 Claude plugin docs
- 향후 OMX adapter docs

### Phase 3 — founder-facing 문서 정렬
우선 수정 대상:
1. `docs/에이전트-팀-사용가이드.md`
2. `team/README.md`

수정 방향:
- “핵심 roster” 중심 서술로 바꿈
- 전체 specialist 수는 부록 또는 내부 설명으로 이동
- “직원은 같고, 작업실이 다르다” 문장을 공통 삽입

### Phase 4 — tool-facing 문서 정렬
다음 문서에서 canonical source reference를 추가한다.
- `CLAUDE.md`
- `HARNESS.md`
- future Codex/OMX adapter docs

표현 방식 예시:
- “Founder-facing canonical roster는 shared-agent-kernel 문서를 따른다.”
- “Tool/runtime-specific role은 내부 구현이며 founder-facing identity를 대체하지 않는다.”

### Phase 5 — runtime output 정렬
- Claude team-meeting output이 canonical roster 표현을 따르는지 점검
- OMX wrapper output이 canonical roster 표현을 따르는지 점검
- drift 발견 시 cross-runtime review로 수정

---

## 하지 말아야 할 것
- 지금 단계에서 기존 모든 문서를 한 번에 rewrite하기
- specialist 수를 founder-facing 핵심 roster에 그대로 노출하기
- runtime internal role과 회사 직원 roster를 1:1로 동일시하기

---

## 성공 기준
- founder-facing 문서 어디를 봐도 핵심 roster가 일관된다.
- tool-specific 문서가 canonical source를 참조한다.
- Claude와 OMX 출력 모두 동일한 직원 이름 체계를 사용한다.
- “35명 / 36명 / 25명” 같은 숫자 혼선이 founder-facing 문서에서 사라진다.
