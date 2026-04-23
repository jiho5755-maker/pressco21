# OMX Founder-Facing Smoke Tests v1

> 목적: OMX-side founder-facing output wrapper가 canonical roster 기준으로 제대로 보이는지 빠르게 점검하는 테스트 시나리오.

## Test 1 — Team meeting output

### 입력 가정
- 내부적으로 architect / critic / analyst가 논의함
- company mapping 결과: `han-jihoon-cso`, `park-seoyeon-cfo`, `choi-minseok-cto`

### 기대 출력
- 제목에 `팀 회의 종합` 또는 `한지훈님 종합`이 보임
- 본문 첫 3줄 안에 `한지훈님`, `박서연님`, `최민석님` 중 최소 1개가 보임
- `architect`, `critic`, `analyst`가 첫 3줄 안에 나오지 않음
- 마지막에 `다음 단계` 존재

### 실패 예시
- `architect 관점에서...`로 시작
- 직원 이름 없이 tool/mode만 설명

---

## Test 2 — Verification output

### 입력 가정
- verifier + analyst가 검증했음
- company owner: `choi-minseok-cto`

### 기대 출력
- 제목: `최민석님 검증 메모`
- `결론`, `확인한 것`, `남은 리스크`, `다음 단계` 포함
- `verifier` 또는 `analyst`가 founder-facing 본문 핵심 위치에 나오지 않음

### 실패 예시
- `Verifier result:` 같은 영어 runtime 중심 헤더
- 결론 없이 technical note만 길게 출력

---

## Test 3 — Handoff output

### 입력 가정
- owner: `yoo-junho-paircoder`
- contributors: `yoon-haneul-pm`, `han-jihoon-cso`

### 기대 출력
- `담당: 유준호님`
- `참여: 윤하늘님, 한지훈님`
- `작업실: OMX 실행실`은 보조 정보로만 표시
- `요약 / 확인 / 리스크 / 다음` 포함

### 실패 예시
- owner를 `executor-1`처럼 표시
- contributors를 runtime role로만 표시

---

## Test 4 — Core 6 naming consistency

### 점검
아래 이름이 canonical roster와 정확히 일치하는지 확인한다.
- 유준호님
- 최민석님
- 박서연님
- 한지훈님
- 윤하늘님
- 팀 회의

### 실패 조건
- `최민석 CTO`처럼 title만 노출되어 founder-facing display_name과 다름
- `PM 윤하늘`처럼 순서가 뒤집힘
- `팀미팅` / `Team Meeting`처럼 다른 표기 사용

---

## Test 5 — Continuity-friendly summary

### 기대
- founder-facing output만 읽어도 다음 행동이 보인다
- 기술 상세를 다 읽지 않아도 의사결정 가능하다

### 실패
- 기술 상세는 많은데 결론과 next step이 없음
- 사람 이름보다 tool/runtime 설명이 먼저 나옴

---

## 최종 판정

### Pass
- canonical 이름 일치
- runtime role 숨김 적절
- 결론/다음 단계 존재

### Pass with follow-up
- 전반은 맞지만 wording 미세 수정 필요

### Fail
- founder-facing identity 붕괴
- handoff/verification/team meeting 중 하나라도 runtime role이 전면 노출
