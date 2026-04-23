# OMX Runtime Insertion Tasklist v1

> 목적: OMX live wrapper 연결을 끝내기 위해 실제 실행 순서를 아주 짧고 명확하게 정리한다.

## 최우선 순서
1. Verification call-site 연결
2. Handoff export call-site 연결
3. Execution report call-site 연결
4. Team meeting synthesis call-site 연결
5. `bash _tools/omx-cross-runtime-smoke.sh` 재실행

---

## Task 1 — Verification call-site 연결
- 기존 verification 생성 지점 찾기
- raw 결과 대신 아래 4개를 만들기
  - summary
  - checks
  - risks
  - next
- `_tools/omx-verification-callsite.sh` 호출
- 성공 기준: `## 최민석님 검증 메모`

## Task 2 — Handoff call-site 연결
- 기존 handoff/export 지점 찾기
- owner / participants / summary / checks / next 구성
- `_tools/omx-handoff-callsite.sh` 호출
- 성공 기준: `## OMX 실행실 handoff`

## Task 3 — Execution report call-site 연결
- 장시간 실행 종료 시점 찾기
- summary / checks / risks / next 구성
- `_tools/omx-execution-report-callsite.sh` 호출
- 성공 기준: `## {직원명} 실행 보고`

## Task 4 — Team meeting synthesis call-site 연결
- 최종 synthesis 직전 findings / risks / next 만들기
- `_tools/omx-team-meeting-callsite.sh` 호출
- 성공 기준: `## 팀 회의 종합`

## Task 5 — Smoke rerun
```bash
bash _tools/omx-cross-runtime-smoke.sh
```
성공 기준:
- canonical names present
- runtime-role heading suppressed
- next-step sections present
- Claude latest handoff bridge works
- Claude example file presence check passes
