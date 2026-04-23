# OMX Handoff Next Insertion Plan v1

> 목적: Verification 다음으로 가장 적합한 실제 연결 대상인 handoff output을 founder-facing live wrapper에 붙이는 절차를 정리한다.

## 왜 handoff가 두 번째인가
1. Claude latest handoff bridge가 이미 잘 동작한다.
2. handoff는 founder-facing 구조가 단순하고, continuity 품질에 직접 영향을 준다.
3. verification과 달리 참여자(`participants`) 정보가 있어 회사 에이전트 identity를 더 풍부하게 보여줄 수 있다.

---

## 목표 상태
실제 OMX handoff가 앞으로 아래 구조로 나온다.

```markdown
## OMX 실행실 handoff

- 담당: 유준호님
- 참여: 윤하늘님, 한지훈님
- 요약: ...
- 확인: ...
- 리스크: ...
- 다음: ...
```

---

## before / after

### Before
- lane 종료/세션 handoff가 내부 메모나 raw 요약에 머무를 수 있음
- founder-facing continuity에 바로 못 쓰는 경우가 있음

### After
- handoff가 즉시 founder-facing 브리핑 구조를 가짐
- 다음 세션이나 다음 작업실에서 그대로 이어받기 쉬움
- canonical participant 이름이 드러남

---

## 가장 얇은 연결 방식

### 방식 A — handoff 전용 helper 사용 (추천)
```bash
bash _tools/omx-handoff-callsite.sh \
  --summary "founder-facing output wrapper 규격 초안을 만들었습니다." \
  --participants-json '["yoon-haneul-pm","han-jihoon-cso"]' \
  --checks-json '["canonical roster 기준 정렬","handoff contract 기준 확인"]' \
  --risks-json '["실제 runtime wrapper는 아직 미구현입니다."]' \
  --next-json '["team meeting / verification 출력에 이 규격을 적용합니다."]'
```

### 방식 B — structured payload → generic live wrapper
```bash
printf '%s' "$HANDOFF_JSON" | bash _tools/omx-founder-facing-live.sh --stdin-json
```

### 방식 C — 이미 markdown latest.md가 있을 때
```bash
bash _tools/omx-founder-facing-live.sh --input team/handoffs/latest.md
```

---

## 연결 절차
1. 기존 OMX handoff/export 지점 찾기
2. 최소 5개 필드 확보
   - owner
   - participants
   - summary
   - checks
   - next
3. `_tools/omx-handoff-callsite.sh` 호출
4. 출력이 founder-facing structure를 따르는지 확인
5. `omx-cross-runtime-smoke.sh` 재실행

---

## 성공 기준
- 실제 OMX handoff가 founder-facing 구조로 출력된다
- `담당` / `참여` / `요약` / `확인` / `리스크` / `다음` 모두 존재한다
- canonical participant display_name이 보인다
- runtime role 이름이 본문 앞부분에 보이지 않는다
