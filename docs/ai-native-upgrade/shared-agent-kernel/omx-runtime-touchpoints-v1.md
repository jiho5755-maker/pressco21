# OMX Runtime Touchpoints v1

> 목적: founder-facing output wrapper를 실제 OMX/Codex 결과 흐름 어디에 연결해야 하는지 정리한다.

## 원칙
OMX의 내부 reasoning / role execution / verification loop는 그대로 유지하고, **사용자에게 보여주기 직전 단계**에서 founder-facing formatter를 적용한다.

---

## Touchpoint 1 — Team meeting result synthesis

### 연결 시점
- 여러 internal role(architect / critic / analyst / verifier) 결과가 모여 최종 회의 결과를 합성하는 마지막 단계

### 입력으로 필요한 것
- `context_type=team_meeting`
- `owner_agent_id=han-jihoon-cso` 또는 `team-meeting`
- participant findings
- summary
- risks
- next_steps

### 출력 목표
- `## 팀 회의 종합`
- `한지훈님 종합`
- 핵심 contributor 관점 1~2개
- 다음 단계

---

## Touchpoint 2 — Verification summary

### 연결 시점
- 구현/검증 루프가 끝나고 사용자에게 “검증 메모”를 보여주기 직전

### 입력으로 필요한 것
- `context_type=verification`
- `owner_agent_id=choi-minseok-cto` (기술 검증 기본값)
- verification bullets
- risks
- next_steps

### 출력 목표
- `## 최민석님 검증 메모`
- 결론 / 확인한 것 / 남은 리스크 / 다음 단계

---

## Touchpoint 3 — Handoff export

### 연결 시점
- 세션 종료 또는 lane handoff 시 founder-facing 요약을 함께 남겨야 할 때

### 입력으로 필요한 것
- `context_type=handoff`
- owner / contributors
- summary
- verification
- risks
- next_steps

### 출력 목표
- `## OMX 실행실 handoff`
- 담당 / 참여 / 요약 / 확인 / 리스크 / 다음

---

## Touchpoint 4 — Execution completion report

### 연결 시점
- 장시간 실행이나 구현 작업 완료 후 founder에게 결과를 짧게 보고할 때

### 입력으로 필요한 것
- `context_type=execution_report`
- owner_agent_id
- summary
- verification
- risks
- next_steps

### 출력 목표
- `## {직원명} 실행 보고`
- 무엇을 했는가 / 확인한 것 / 남은 위험 / 다음 행동

---

## Integration strategy

### Phase A — pre-runtime prototype
- renderer + fixtures + smoke tests로 wording 검증

### Phase B — wrapper insertion
- 실제 team meeting / verification / handoff / execution result 직전에 formatter 호출

### Phase C — cross-runtime review
- generated output을 `cross-runtime-review-checklist-v1.md`로 점검

### Phase D — live normalization
- founder-facing output drift가 없도록 sample updates / wording refinement 반복
