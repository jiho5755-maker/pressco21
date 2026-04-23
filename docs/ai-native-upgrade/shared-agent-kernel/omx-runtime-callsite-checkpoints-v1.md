# OMX Runtime Call-Site Checkpoints v1

> 목적: 실제 OMX 결과 흐름에 founder-facing helper를 삽입할 때, 각 call-site에서 빠뜨리면 안 되는 체크포인트를 한눈에 보게 한다.

## 공통 체크포인트

### 삽입 전
- [ ] 이 출력이 founder-facing으로 바로 보여지는 지점이 맞는가?
- [ ] internal role/raw debug output를 바로 노출하고 있지 않은가?
- [ ] owner를 canonical agent id로 정할 수 있는가?
- [ ] summary / checks / risks / next 같은 최소 필드를 만들 수 있는가?
- [ ] JSON alias-friendly payload를 만들 수 있는가?

### 삽입 중
- [ ] 가능하면 전용 helper를 사용했는가?
- [ ] 불가하면 `omx-founder-facing-live.sh --stdin-json`를 사용했는가?
- [ ] runtime role 이름이 founder-facing heading에 들어가지 않는가?
- [ ] next step이 빠지지 않았는가?

### 삽입 후
- [ ] 출력 첫 3줄 안에 canonical 이름 또는 `팀 회의`가 보이는가?
- [ ] `omx-cross-runtime-smoke.sh` 재실행 가능한 상태인가?
- [ ] 기존 raw summary를 완전히 대체했는가, 아니면 병행 출력하는가?
- [ ] founder-facing 사용자가 읽을 때 불필요한 기술 설명이 앞에 오지 않는가?

---

## Verification call-site

### 최소 입력
- owner = `choi-minseok-cto`
- summary
- checks
- risks
- next

### 추천 helper
```bash
bash _tools/omx-verification-callsite.sh ...
```

### 통과 기준
- 제목: `## 최민석님 검증 메모`
- 섹션: 결론 / 확인한 것 / 남은 리스크 / 다음 단계

---

## Handoff call-site

### 최소 입력
- owner
- participants
- summary
- checks
- risks
- next

### 추천 helper
```bash
bash _tools/omx-handoff-callsite.sh ...
```

### 통과 기준
- 제목: `## OMX 실행실 handoff`
- 필드: 담당 / 참여 / 요약 / 확인 / 리스크 / 다음

---

## Execution report call-site

### 최소 입력
- owner
- summary
- checks
- risks
- next

### 추천 helper
```bash
bash _tools/omx-execution-report-callsite.sh ...
```

### 통과 기준
- 제목: `## {직원명} 실행 보고`
- 섹션: 무엇을 했는가 / 확인한 것 / 남은 위험 / 다음 행동

---

## Team meeting call-site

### 최소 입력
- owner = `han-jihoon-cso`
- summary
- findings
- risks
- next

### 추천 helper
```bash
bash _tools/omx-team-meeting-callsite.sh ...
```

### 통과 기준
- 제목: `## 팀 회의 종합`
- 섹션: 결론 / {직원명} 종합·관점 / 다음 단계

---

## 최종 확인 루틴

삽입을 하나라도 한 뒤에는 반드시:
```bash
bash _tools/omx-cross-runtime-smoke.sh
```

추가로 실제 연결된 output도 수동으로 한 번 읽어본다.
