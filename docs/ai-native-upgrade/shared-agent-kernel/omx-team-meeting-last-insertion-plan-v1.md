# OMX Team Meeting Last Insertion Plan v1

> 목적: 가장 복잡한 founder-facing 출력인 team meeting을 마지막으로 연결할 때 필요한 최소 절차를 정리한다.

## 왜 마지막인가
1. contributor 관점 압축이 필요하다.
2. `findings` 구조를 가장 잘 만들어야 한다.
3. wording drift가 생기기 가장 쉬운 타입이다.

## 목표 상태
```markdown
## 팀 회의 종합

### 결론
- ...

### 한지훈님 종합
- ...

### 박서연님 관점
- ...

### 최민석님 관점
- ...

### 다음 단계
- ...
```

## 추천 연결 방식
```bash
bash _tools/omx-team-meeting-callsite.sh \
  --summary "지금은 shared-kernel 계약을 먼저 고정한 뒤 Claude와 OMX adapter를 병렬 구현하는 방향이 가장 안전합니다." \
  --findings-json '[{"agent_id":"han-jihoon-cso","heading":"한지훈님 종합","text":"..."},{"agent_id":"park-seoyeon-cfo","heading":"박서연님 관점","text":"..."}]' \
  --risks-json '["실제 runtime wrapper는 아직 미구현입니다."]' \
  --next-json '["Claude는 continuity를 정리합니다.","OMX는 founder-facing output wrapper를 구현합니다."]'
```

## 성공 기준
- 제목이 `## 팀 회의 종합`
- 사람 이름 heading 1개 이상
- 다음 단계 존재
- runtime role heading 미노출
