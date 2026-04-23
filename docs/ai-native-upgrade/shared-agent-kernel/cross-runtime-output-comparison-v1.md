# Cross-Runtime Output Comparison v1

> 목적: Claude founder-facing 예시와 OMX founder-facing 프로토타입 출력이 같은 shared-kernel mental model을 유지하는지 비교한다.

## 비교 기준
- 사람 이름이 먼저 보이는가
- 결론 / 확인한 것 / 리스크 / 다음 단계 구조가 맞는가
- tool/runtime 설명이 앞에 과도하게 나오지 않는가
- Core 6 이름이 canonical roster와 일치하는가

---

## 1. Team meeting

### Claude 예시
- 제목: `## 팀 회의 종합`
- 섹션: 결론 / 한지훈님 종합 / 박서연님 관점 / 최민석님 관점 / 다음 단계

### OMX 프로토타입
- 제목: `## 팀 회의 종합`
- 섹션: 결론 / 한지훈님 종합 / 박서연님 관점 / 최민석님 관점 / 다음 단계

### 판정
**일치** — 현재 가장 잘 맞는 context_type

---

## 2. Verification

### Claude 예시
- 제목: `## 최민석님 의견`
- 섹션: 결론 / 확인한 것 / 남은 리스크 / 다음 단계

### OMX 프로토타입
- 제목: `## 최민석님 검증 메모`
- 섹션: 결론 / 확인한 것 / 남은 리스크 / 다음 단계

### 판정
**부분 일치** — 섹션 구조는 동일, 제목 wording만 다름

### 해석
이 차이는 drift라기보다 runtime-specific 헤더 차이로 볼 수 있다. 다만 founder-facing 통일감을 더 높이려면 장기적으로 제목도 더 가까워질 수 있다.

---

## 3. Handoff

### Claude 예시
- 제목: `## 저장 완료`
- 섹션: 요약 / 확인 / 리스크 / 다음

### OMX 프로토타입
- 제목: `## OMX 실행실 handoff`
- 필드: 담당 / 참여 / 요약 / 확인 / 리스크 / 다음

### 판정
**의도된 차이** — 런타임 맥락은 다르지만 founder-facing 필드 구조는 호환됨

### 해석
Claude는 저장 행위 중심, OMX는 실행실 handoff 중심이다. 둘 다 founder가 다음 행동을 이해하는 데 필요한 정보는 제공한다.

---

## 4. Session continuity

### Claude 예시
- compact briefing 1줄
- `[시간] 이름(직책): 요약 → 이어서 ... | 주의: ...`

### OMX bridge
- `## 세션 연속성 브리핑`
- 담당 / 참여 / 작업실 / 요약 / 다음 / 리스크 / 확인 / 승격 후보

### 판정
**보완적 차이** — Claude는 짧은 입구, OMX는 읽기 쉬운 브리핑 문서형

### 해석
두 작업실의 UX가 다르지만, 같은 직원과 같은 다음 행동을 유지한다는 점에서 mental model은 일치한다.

---

## 총평
1. Team meeting은 이미 매우 잘 정렬되어 있다.
2. Verification은 제목 wording만 다듬으면 더 가까워질 수 있다.
3. Handoff는 런타임 성격 차이를 반영한 의도된 차이로 볼 수 있다.
4. Continuity는 Claude가 compact, OMX가 expanded 브리핑이라 서로 보완적이다.

## 현재 결론
- shared-kernel 기준의 founder-facing 정렬은 **충분히 성공적**이다.
- 지금 단계에서 더 중요한 것은 제목 wording 완전 동일화보다 **실제 live output chain에 이 formatter를 연결하는 것**이다.
