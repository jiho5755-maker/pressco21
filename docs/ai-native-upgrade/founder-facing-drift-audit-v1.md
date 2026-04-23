# Founder-Facing Drift Audit v1

> 목적: Canonical Roster Migration Plan Phase 3~4를 실제 문서 수정 작업으로 옮기기 전에, 어떤 문서에서 어떤 표현을 바꿔야 하는지 founder-facing 관점으로 미리 정리한다.

## 기준 canonical source
- `docs/ai-native-upgrade/shared-agent-kernel/agents.v1.yaml`
- `docs/ai-native-upgrade/shared-agent-kernel/founder-facing-roster-v1.md`

---

## Patch Target 1 — docs/에이전트-팀-사용가이드.md

### 현재 문제
- 36개 AI 에이전트 팀 전면 노출
- founder가 처음 보기엔 roster가 너무 넓다
- core 6 / extended / internal specialist 구분이 없음

### 바꿀 방향
- 문서 앞부분은 core 6 중심으로 재구성
- “직원은 같고, 작업실이 다르다” 문장 추가
- specialist 전체 수는 하단 부록/내부 구조 설명으로 이동

### 새 문서 구조 제안
1. 핵심 6명 소개
2. 어떤 상황에 누구를 부를지
3. 팀 회의 소개
4. 확장 roster / 내부 specialist는 뒤로

---

## Patch Target 2 — team/README.md

### 현재 문제
- 35 AI / 1층 임원실 / 2층 실무진 구조가 founder에게는 다소 과함
- 실제로는 core 6 기준 경험을 먼저 줘야 함

### 바꿀 방향
- 상단에 founder-facing 한 줄 설명 추가
- `핵심 노출 roster`와 `확장 조직도`를 분리
- 숫자 자체보다 “누구를 언제 부르면 되는지”를 먼저 배치

---

## Patch Target 3 — team/boardroom.md

### 현재 문제
- 조직도 설명은 좋지만 founder-facing core/extended 구분이 약함
- 사용 설명보다 조직 구조 설명이 앞선다

### 바꿀 방향
- 상단에 core 6 quick roster 박스 추가
- extended executive / specialist는 그 뒤에 설명

---

## Patch Target 4 — CLAUDE.md

### 현재 문제
- 25 agents 언급이 canonical source와 분리되어 보일 수 있음

### 바꿀 방향
- founder-facing canonical roster는 shared-agent-kernel 문서를 따른다는 참조 추가
- tool-specific / internal agent count는 implementation detail로 설명

---

## Patch Target 5 — HARNESS.md

### 현재 문제
- C-Suite/글로벌/프로젝트 구조가 존재하지만 founder-facing canonical roster reference가 없음

### 바꿀 방향
- shared-agent-kernel canonical source reference 추가
- Claude/Codex 역할 설명 옆에 “같은 직원, 다른 작업실” 문장 추가 고려

---

## 권장 수정 순서
1. `docs/에이전트-팀-사용가이드.md`
2. `team/README.md`
3. `team/boardroom.md`
4. `CLAUDE.md`
5. `HARNESS.md`

---

## 완료 기준
- 대표가 어떤 문서를 보든 core 6 기준 이해가 가능
- 숫자(35/36/25)보다 canonical roster가 먼저 보임
- 같은 직원이 Claude와 OMX에서 일한다는 mental model이 모든 founder-facing 문서에서 유지됨
