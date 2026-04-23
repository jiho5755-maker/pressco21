# OMX Runtime Insertion Sequence v1

> 목적: OMX live wrapper를 실제 결과 흐름에 연결할 때 어떤 순서로 붙이면 안전한지 단계별로 정리한다.

## 목표
실제 OMX 내부 결과가 founder-facing 기준으로 아래 4종 출력으로 자동 변환되게 만든다.
- team meeting
- verification
- handoff
- execution report

---

## Sequence 1 — Verification부터 연결

### 왜 먼저 verification인가
- 입력 구조가 가장 단순함
- owner가 거의 항상 `choi-minseok-cto`로 고정 가능
- 결과 섹션 구조도 단순함
- 기술 검증 결과를 founder-facing으로 바꾸는 가치가 즉시 큼

### 연결 절차
1. 기존 verification 결과가 생성되는 지점 찾기
2. 그 지점에서 alias-friendly JSON 구성
3. `omx_emit_verification` 또는 `omx-founder-facing-live.sh --stdin-json` 호출
4. 결과를 기존 raw summary 대신 founder-facing output으로 노출
5. `omx-cross-runtime-smoke.sh` 재실행

### 완료 기준
- 실제 verification 결과가 `## 최민석님 검증 메모` 구조로 나온다

---

## Sequence 2 — Handoff 연결

### 왜 두 번째인가
- 이미 Claude latest handoff 브리지가 잘 동작함
- handoff는 founder-facing 구조가 단순함
- 이후 세션 연속성 품질에 직접 영향
- verification 다음으로 가장 얇은 전용 helper 연결이 가능함

### 연결 절차
1. OMX 세션 종료 / lane handoff 지점 찾기
2. structured handoff payload 또는 latest.md를 founder-facing wrapper로 통과
3. 결과를 저장/출력 흐름에 결합

### 완료 기준
- 실제 OMX handoff가 `담당 / 참여 / 요약 / 확인 / 리스크 / 다음` 구조로 나온다

---

## Sequence 3 — Execution report 연결

### 왜 세 번째인가
- execution report는 구조가 verification과 유사
- 장시간 작업 완료 보고에 바로 가치 있음

### 완료 기준
- 실제 장시간 작업 종료 시 `## {직원명} 실행 보고` 구조로 나온다

---

## Sequence 4 — Team meeting 연결

### 왜 마지막인가
- 가장 구조가 복잡함
- participant findings 압축이 필요함
- contributor/관점 정리가 필요함

### 완료 기준
- 실제 team meeting 결과가 `## 팀 회의 종합` + `한지훈님 종합/관점` 구조로 나온다

---

## 권장 실무 순서
1. verification
2. handoff
3. execution report
4. team meeting

이 순서가 가장 위험이 낮고, founder-facing 체감 가치가 빠르다.
