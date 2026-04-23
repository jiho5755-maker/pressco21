# OMX Execution Report Next Insertion Plan v1

> 목적: handoff 다음 단계로 execution report를 founder-facing live wrapper에 연결하는 절차를 정리한다.

## 왜 execution report가 세 번째인가
1. verification과 구조가 유사하다.
2. 장시간 실행 종료 시 founder-facing 가치가 바로 있다.
3. team meeting보다 단순해서 먼저 붙이기 좋다.

## 목표 상태
```markdown
## 유준호님 실행 보고

### 무엇을 했는가
- ...

### 확인한 것
- ...

### 남은 위험
- ...

### 다음 행동
- ...
```

## 추천 연결 방식
```bash
bash _tools/omx-execution-report-callsite.sh \
  --summary "OMX founder-facing output formatter 프로토타입과 smoke fixtures를 추가했습니다." \
  --checks-json '["renderer가 canonical roster를 읽고 display_name으로 출력함","4종 context를 지원함"]' \
  --risks-json '["실제 runtime touchpoint 연결은 아직 남아 있습니다."]' \
  --next-json '["실제 OMX output wrapper 적용 지점을 정리합니다."]'
```

## 성공 기준
- 제목이 `## {직원명} 실행 보고`로 시작
- `무엇을 했는가 / 확인한 것 / 남은 위험 / 다음 행동` 구조 유지
- founder-facing next action이 항상 존재
