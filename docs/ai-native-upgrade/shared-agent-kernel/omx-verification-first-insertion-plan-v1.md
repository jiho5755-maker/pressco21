# OMX Verification First Insertion Plan v1

> 목적: OMX live wrapper의 첫 실제 연결 대상으로 verification output을 선택하고, 왜 이게 가장 안전한지와 어떻게 붙일지를 정리한다.

## 왜 verification부터 붙이나
1. 입력 구조가 가장 단순하다.
2. owner가 대부분 `choi-minseok-cto`로 고정 가능하다.
3. 결론 / 확인한 것 / 리스크 / 다음 단계 구조가 이미 Claude와 충분히 정렬되어 있다.
4. founder-facing 체감 가치가 즉시 크다.

---

## 목표 상태
기존 OMX 검증 결과가 앞으로는 founder-facing 기준으로 아래처럼 보인다.

```markdown
## 최민석님 검증 메모

### 결론
- ...

### 확인한 것
- ...

### 남은 리스크
- ...

### 다음 단계
- ...
```

---

## before / after

### Before
- raw technical verification note
- generic role or tool-oriented wording
- next-step 누락 가능

### After
- `최민석님 검증 메모`
- 결론 먼저
- 확인한 것 / 남은 리스크 / 다음 단계 고정
- canonical founder-facing name 사용

---

## 가장 얇은 연결 방식

### 방식 A — shell script에서 직접 연결
```bash
bash _tools/omx-verification-callsite.sh \
  --summary "구조는 shared-kernel 계약과 충돌하지 않습니다." \
  --checks-json '["shared-kernel roster 참조", "handoff contract 사용"]' \
  --risks-json '["Stop 훅 async"]' \
  --next-json '["save handoff를 운영 기준으로 본다"]'
```

### 방식 B — 내부 JSON 생성 후 generic live wrapper 호출
```bash
printf '%s' "$VERIFY_JSON" | bash _tools/omx-founder-facing-live.sh --stdin-json
```

### 추천
처음 연결은 **방식 A**가 가장 쉽다.
이유:
- verification 전용 helper가 있으므로 call-site가 얇다
- owner 기본값도 안전하다
- 바로 founder-facing output으로 테스트 가능하다

---

## 연결 절차
1. 기존 verification 결과 생성 지점 찾기
2. raw output 대신 아래 4요소를 만들기
   - summary
   - checks
   - risks
   - next
3. `_tools/omx-verification-callsite.sh` 호출
4. 기존 raw summary와 비교
5. `omx-cross-runtime-smoke.sh` 재실행

---

## 성공 기준
- 최소 1개 verification call-site가 founder-facing 구조로 출력된다
- 제목이 `최민석님 검증 메모`로 시작한다
- 다음 단계가 항상 존재한다
- runtime role 이름이 본문 앞부분에 보이지 않는다
