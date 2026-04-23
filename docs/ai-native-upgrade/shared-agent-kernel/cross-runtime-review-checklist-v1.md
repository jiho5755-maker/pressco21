# Cross-Runtime Review Checklist v1

> 목적: Claude-side adapter와 OMX-side adapter 구현이 shared-agent PRD와 shared-kernel 계약을 지키는지 빠르게 점검하는 체크리스트.

## 사용 시점
- Claude-side 변경 후
- OMX-side 변경 후
- shared-kernel 변경 후
- merge 전 최종 점검

---

## A. Canonical roster 일치 여부
- [ ] founder-facing 이름이 `founder-facing-roster-v1.md`와 일치하는가
- [ ] `agent_id`가 `agents.v1.yaml`와 일치하는가
- [ ] core agent와 extended agent를 혼동하지 않았는가
- [ ] runtime internal role을 founder-facing 이름으로 잘못 노출하지 않았는가

## B. Shared memory 규칙 준수 여부
- [ ] playbook / failures / founder preference / growth log의 역할 구분이 맞는가
- [ ] raw transcript를 장기 memory로 저장하려 하지 않았는가
- [ ] “save only if it changes future behavior” 원칙을 지켰는가
- [ ] learn_to_save가 압축된 행동 변화 기준으로 적혔는가

## C. Handoff contract 일치 여부
- [ ] owner가 canonical agent id로 적혔는가
- [ ] runtime이 `claude` 또는 `codex-omx`로 정리되었는가
- [ ] summary / decision / verification / next_step이 빠지지 않았는가
- [ ] runtime internal role이 handoff 핵심 필드에 직접 노출되지 않았는가

## D. Founder-facing UX 일관성
- [ ] 대표 입장에서 “같은 직원이 다른 작업실에서 일하는 느낌”이 유지되는가
- [ ] tool 이름보다 사람 이름이 먼저 보이는가
- [ ] 불필요한 모델/런타임 설명이 과도하게 드러나지 않는가
- [ ] core 4~6명 중심으로 이해 가능한가

## E. Runtime-specific mechanic 격리
- [ ] Claude 문서/설계가 OMX low-level mechanic을 복제하려 하지 않는가
- [ ] OMX 문서/출력이 Claude plugin/hook mechanic을 복제하려 하지 않는가
- [ ] divergence matrix에 어긋나는 억지 동일화가 없는가

## F. Verification quality
- [ ] 변경 범위에 맞는 검증이 실제로 수행되었는가
- [ ] 공식 문서 기준이 필요한 부분은 공식 기준으로 확인했는가
- [ ] founder-facing 표현과 implementation-facing 구조가 둘 다 검토되었는가

## G. Ownership boundary
- [ ] 이번 변경이 shared-kernel 범위인지 adapter 범위인지 명확한가
- [ ] shared-kernel 변경이 필요하면 별도 제안/기록으로 분리되었는가
- [ ] 같은 shared file을 양쪽이 동시에 수정하는 상황을 만들지 않았는가

---

## 판정 기준

### Pass
- drift 없음
- founder-facing identity 일치
- memory/handoff contract 일치
- runtime-specific mechanic 경계 유지

### Pass with follow-up
- 치명적 drift는 없지만 후속 정리가 필요한 경우
- 예: wording mismatch, example 부족, core/extended 표현 혼선

### Fail
- canonical roster 불일치
- agent id mismatch
- handoff contract mismatch
- founder-facing identity 붕괴
- shared memory 규칙 위반

---

## 리뷰 결과 템플릿

### Review scope
- 

### Passes
- 

### Drift findings
- 

### Severity
- low / medium / high

### Required fixes
- 

### Safe next step
- 
