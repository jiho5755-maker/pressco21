# OMX 쉬운 실행 가이드

비전공자 기준으로 **딱 4개 명령만 기억하면 되도록** 정리한 실행 가이드입니다.

## 1. 최초 1회 설치

아래 명령을 한 번만 실행하세요.

```bash
bash _tools/install-p21-omx.sh
```

설치가 끝나면 이제부터는 긴 경로 대신 `p21-omx`만 쓰면 됩니다.

---

## 2. 평소에는 이것만

### 기본 실행

```bash
p21-omx
```

- 가장 추천하는 기본 명령입니다.
- 내부적으로는 아래와 같습니다.

```bash
bash _tools/omx-run.sh --refresh-profile --xhigh
```

즉,
- profile 동기화
- 최신 prompt 반영
- xhigh 추론

까지 자동으로 챙깁니다.

---

## 3. 승인 없이 강하게 실행하고 싶을 때

```bash
p21-omx turbo
```

이 명령은 예전의 아래 명령을 **안정화해서 감싼 버전**입니다.

```bash
bash _tools/omx-run.sh --xhigh --madmax
```

차이점:
- 실행 전 profile/prompt를 다시 맞춰줍니다.
- worktree 안에서 실행해도 경로 계산이 덜 깨집니다.
- auth/config 동기화가 같이 들어가서 예전보다 덜 불안정합니다.

---

## 4. 이상할 때는 점검/복구

### 점검

```bash
p21-omx doctor
```

이 명령은 아래 2가지를 연달아 봅니다.

1. PRESSCO21 worktree / branch / scope 체크
2. OMX doctor

### 복구

```bash
p21-omx repair
```

이 명령은:
- overlay/profile 다시 만들기
- prompt 다시 동기화
- scope 체크
- doctor 재실행

까지 한 번에 합니다.

**헷갈리면 그냥 `p21-omx repair`부터 치면 됩니다.**

---

## 5. 팀 실행

병렬로 여러 lane을 띄우고 싶을 때:

```bash
p21-omx team "offline-crm-v2 회귀 테스트"
```

기본은 `3:executor` 로 실행됩니다.

lane 수를 직접 주고 싶으면:

```bash
p21-omx team 4:executor "파트너클래스 QA"
```

---

## 6. 자주 쓰는 루틴

### 루틴 A — 평소 작업 시작

```bash
p21-omx
```

### 루틴 B — 갑자기 안 될 때

```bash
p21-omx repair
```

그 다음 다시:

```bash
p21-omx
```

### 루틴 C — 승인 없이 바로 강하게

```bash
p21-omx turbo
```

### 루틴 D — 지금 상태만 확인

```bash
p21-omx doctor
```

---

## 7. 최소 암기 버전

정말 이것만 기억하면 됩니다.

```bash
p21-omx
p21-omx turbo
p21-omx doctor
p21-omx repair
```

---

## 8. 참고

- 원본 고급 실행기는 `_tools/omx-run.sh`
- 쉬운 실행기는 `_tools/omx-easy.sh`
- 글로벌 명령 설치기는 `_tools/install-p21-omx.sh`

즉 앞으로는 긴 명령보다 **`p21-omx` 계열**을 쓰는 것을 기준으로 생각하면 됩니다.
