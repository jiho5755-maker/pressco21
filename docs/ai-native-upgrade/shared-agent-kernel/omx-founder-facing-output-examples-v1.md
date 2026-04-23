# OMX Founder-Facing Output Examples v1

## Example 1 — Team meeting summary

```markdown
## 팀 회의 종합

### 결론
- 지금은 shared-kernel 계약을 먼저 고정한 뒤 Claude와 OMX adapter를 병렬 구현하는 방향이 가장 안전합니다.

### 한지훈님 종합
- 같은 직원 정체성은 유지하되, 런타임 내부 역할은 나누는 구조가 가장 현실적입니다.

### 박서연님 관점
- 지금 단계에서 공통 계약 없이 병렬 구현을 밀면 유지비가 커집니다.

### 최민석님 관점
- shared-kernel이 먼저 있어야 이후 OMX wrapper와 Claude continuity가 drift 없이 맞물립니다.

### 다음 단계
- Claude는 continuity와 plugin 구조를 정리하고,
- OMX는 founder-facing output wrapper를 구현합니다.
```

---

## Example 2 — Verification note

```markdown
## 최민석님 검증 메모

### 결론
- Claude-side continuity 구조는 shared-kernel 계약과 크게 충돌하지 않습니다.

### 확인한 것
- SessionStart/Stop 훅 존재
- shared-kernel roster 참조
- handoff contract 사용

### 남은 리스크
- Stop 훅이 async라서 handoff 기록 완료 보장이 약합니다.

### 다음 단계
- /save 기준의 동기적 handoff 흐름을 실제 운영 기준으로 삼습니다.
```

---

## Example 3 — Execution handoff

```markdown
## OMX 실행실 handoff

- 담당: 유준호님
- 참여: 윤하늘님
- 요약: founder-facing output wrapper 규격 초안을 만들었습니다.
- 확인: canonical roster / handoff contract / divergence matrix 기준으로 정렬했습니다.
- 리스크: 실제 runtime wrapper는 아직 미구현입니다.
- 다음: team meeting / verification 출력에 이 규격을 적용합니다.
```
