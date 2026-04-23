# Claude Next Tasks — 2026-04-21

> 대상: `work/workspace/claude-shared-agent-ecosystem` Claude 작업실
> 목적: Shared Kernel 최신 기준 위에서 Claude-side adapter가 바로 이어서 구현해야 할 다음 작업을 짧고 분명하게 정리한다.

## 지금 Claude가 해야 할 일 (우선순위 순)

### 1. Session continuity를 founder-facing UX로 완성
목표:
- SessionStart에서 아래 4개가 한 번에 자연스럽게 보이도록 정리
  - 지난 세션 요약
  - 다음 행동
  - 열린 리스크
  - 저장할 learning 후보
- tool 이름보다 사람 이름이 먼저 보이게 만들기

완료 기준:
- founder가 다음 세션 시작 시 “아, 같은 직원이 이어서 일하네”라고 느낄 정도의 짧고 이해 쉬운 briefing 문구를 설계/구현

---

### 2. Claude-side plugin / skill 구조를 실제 파일 단위로 정리
현재 목표 plugin/skill 단위:
- `pressco21-session-continuity`
- `pressco21-core-personas`
- `pressco21-team-meeting`
- `pressco21-memory-sync`

해야 할 일:
- 각 단위의 책임 경계 정의
- 중복 역할 제거
- official Claude plugin / hook / subagent 기준에 맞춘 구조화

완료 기준:
- “어떤 기능이 어느 plugin/skill에 속하는지”가 분명하고, shared-kernel 계약을 침범하지 않음

---

### 3. named-agent founder-facing output wording 규칙 고정
목표:
- Claude 출력이 늘 canonical roster 기준으로 보이게 만들기
- 내부 구현보다 외부 직원 이름이 먼저 보이게 만들기

해야 할 일:
- core 6 기준 wording 패턴 정리
- team-meeting 요약 문구 규칙 정리
- save/resume founder-facing summary 문구 정리

완료 기준:
- 한지훈님 / 박서연님 / 최민석님 / 유준호님 / 윤하늘님 / 팀회의가 일관되게 보임

---

### 4. shared memory write policy를 실제 Claude 흐름에 매핑
목표:
- Claude가 무엇을 memory spine에 저장해야 하는지, 무엇은 저장하지 말아야 하는지 구현적으로 분명히 하기

반드시 지킬 것:
- save only if it changes future behavior
- raw transcript 장기 저장 금지
- playbook / failures / founder preferences / growth-log 역할 구분 유지

완료 기준:
- /save 또는 관련 흐름에서 어떤 정보가 어느 memory artifact로 승격되는지 설명 가능

---

### 5. shared-kernel 변경 제안은 분리해서 제출
목표:
- Claude가 shared-kernel을 직접 흔들지 않고, 필요한 변경만 제안하게 만들기

완료 기준:
- “shared-kernel impact 없음” 또는 “변경 제안 separate” 둘 중 하나로 항상 정리됨

---

## Claude가 지금 하지 말아야 할 것
- shared-kernel 문서 직접 rewrite
- canonical roster(agent_id / core 6)를 독자적으로 변경
- OMX low-level runtime mechanic을 Claude에 복제
- raw transcript 기반 장기 memory 설계
- specialist 수를 founder-facing roster에 그대로 노출

---

## Claude 작업실 산출물에 꼭 포함되어야 할 것
- Summary
- Changed files
- Verification
- Shared-kernel impact
- Open risks
- Learnings to save

---

## Claude가 완료 후 넘겨줘야 하는 것
1. Claude-side continuity 최종 구조 요약
2. plugin/skill 책임 분리표
3. founder-facing output 예시 2~3개
4. shared-kernel 변경 필요 여부
5. OMX가 이어받을 follow-up 포인트
