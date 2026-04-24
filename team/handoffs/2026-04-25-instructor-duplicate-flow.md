---
handoff_id: HOFF-2026-04-25-instructor-duplicate-flow
enabled: true
created_at: 2026-04-25T01:10:00+09:00
runtime: codex-omx
owner_agent_id: choi-minseok-cto
contributors: [yoon-haneul-pm, kim-dohyun-coo, jung-yuna-cmo]
branches:
  homepage: work/homepage/instructor-duplicate-flow (merged into main and deleted)
  n8n: work/n8n/instructor-duplicate-flow (merged into main and deleted)
worktrees:
  homepage: /Users/jangjiho/workspace/pressco21-worktrees/homepage-instructor-duplicate-flow (removed)
  n8n: /Users/jangjiho/workspace/pressco21-worktrees/n8n-instructor-duplicate-flow (removed)
summary: 강사공간 강사회원 신청에서 같은 고객이 중복 행으로 생성되던 문제를 분석하고, 기존 신청 자동입력·수정/보완 UX와 n8n 중복 차단 로직을 운영 반영했습니다. 실제 운영 URL, 운영 n8n, 운영 NocoDB를 사용하는 브라우저 E2E로 중복 차단과 반려 보완 제출을 검증했습니다.
decision: 이미 신청한 고객은 새 행을 만들지 않고 기존 신청을 불러와 수정/보완만 하게 합니다. 중복 판단은 자사몰 ID 단일 기준이 아니라 recordId, 연락처, 자사몰 ID, 이메일을 함께 사용합니다. 반려 보완 제출 시 기존 첨부서류는 유지하고 새 첨부만 추가하며, 비승인 상태의 보완 제출은 심사 대기 상태로 초기화합니다.
changed_artifacts:
  - homepage-automation/forms/instructor-apply.html
  - n8n-automation/workflows/homepage/FA-004_강사_신청_보안_제출.json
  - n8n-automation/workflows/homepage/FA-004b_강사신청_조회.json
  - n8n-automation/backups/20260424-235929-instructor-duplicate-flow/FA-004-live-before.json
  - n8n-automation/backups/20260424-235929-instructor-duplicate-flow/FA-004b-live-before.json
  - homepage-automation/backups/20260424-235929-instructor-apply/instructor-apply-live-before.html
  - homepage-automation/backups/20260424-235929-instructor-apply/screenshots/instructor-operational-01-first-filled.png
  - homepage-automation/backups/20260424-235929-instructor-apply/screenshots/instructor-operational-02-first-success.png
  - homepage-automation/backups/20260424-235929-instructor-apply/screenshots/instructor-operational-03-rejected-autofill.png
  - homepage-automation/backups/20260424-235929-instructor-apply/screenshots/instructor-operational-04-update-filled.png
  - homepage-automation/backups/20260424-235929-instructor-apply/screenshots/instructor-operational-05-update-success.png
commits:
  homepage:
    - d78ccd2 [codex] 강사신청 수정 보완 안내 개선
    - fb1db06 [codex] 기존 신청 자동입력 UX 보강
    - 4263954 [codex] 신청 상태 판별 검증 보강
    - 572e23e [codex] 강사신청 운영 검증 백업 보관
    - 065b5b5 [codex] 강사신청 UX 개선 병합
  n8n:
    - e373e33 [codex] 강사신청 중복 제출 차단 보강
    - 54e4e75 [codex] 기존 신청 자동입력 응답 보강
    - b7f2c7a [codex] 보완 제출 기존 서류 유지
    - 0371845 [codex] 강사신청 n8n 운영 백업 보관
    - a16df57 [codex] 강사신청 n8n 개선 병합
verification:
  - 김진영 고객 중복 원인 확인: 첫 신청은 `whiteness07@kakao...`, 두 번째 제출은 `whiteness07`로 들어왔고 기존 FA-004가 자사몰 ID만 중복 조회해 같은 연락처 신청을 새 행으로 생성했습니다.
  - 로컬 MakeShop D4 검사 성공: `python3 codex-skills/makeshop-d4-dev/scripts/check_makeshop_d4.py homepage-automation/forms/instructor-apply.html`.
  - 신청폼 JS 문법 검사 성공: 추출 script `node --check`.
  - n8n JSON 파싱 성공: `python3 -m json.tool`.
  - n8n Code 노드 컴파일 검사 성공: FA-004 7개, FA-004b 2개.
  - 브라우저 모의 매트릭스 검사 성공: rejected, approved, pending, new customer, duplicate 409 recovery.
  - 운영 백업 완료: n8n 워크플로우 2개, 운영 신청폼 HTML, 서버 `/var/www/pressco21/forms/instructor-apply.html.20260424-145929.bak`.
  - 운영 n8n 배포 완료: `Q3wqd8NMFaHjl1UB`, `zCsDFaURp9Skyqnp` 모두 HTTP 200, active=true health check 통과.
  - 운영 신청폼 배포 완료: `/var/www/pressco21/forms/instructor-apply.html`, live sha256 `5e5f07576577f032a702753d4b563d92662dfb8d779b5a45d36130faf83b0fa4` 확인.
  - 운영 브라우저 E2E 성공: 실제 `https://nocodb.pressco21.com/apply`, `https://n8n.pressco21.com/webhook/*`, 운영 NocoDB 사용.
  - 운영 E2E 상세: 테스트 고객 1차 신청으로 row 263 생성, 첨부 1개 확인, 같은 정보 auto 제출은 HTTP 409 중복 차단, row count 1 유지.
  - 운영 E2E 상세: row 263을 반려 상태로 바꾼 뒤 폼 재진입, 기존 신청 자동입력·반려 사유·`기존 서류는 유지되고 부족한 서류만 추가해 주세요` 문구 확인.
  - 운영 E2E 상세: 보완 제출 후 같은 row 263 유지, 첨부 2개, 진행 상태 공백 초기화, 반려 사유 삭제, `n8n_신청알림` 0 초기화 확인.
  - 운영 E2E 테스트 데이터 삭제 완료: 테스트 전화번호 `010-7539-0750` 최종 row count 0.
  - 두 작업 브랜치 main 병합 완료: homepage merge `065b5b5`, n8n merge `a16df57`.
  - 작업 worktree 제거 및 로컬 작업 브랜치 삭제 완료.
open_risks:
  - 코드/배포/브랜치 정리 기준 잔여 위험 없음.
  - 기존 김진영 고객 중복 row 258/259는 운영 원본 보존을 위해 임의 삭제하지 않았습니다. 별도 데이터 정리 지시가 있을 때만 처리합니다.
next_step: 완전 마감 상태입니다. 다음 세션에서 별도 신규 요청이 없으면 이 건은 종료로 보면 됩니다.
learn_to_save:
  - 강사 신청 중복 방지는 자사몰 ID만으로 부족합니다. 어르신 고객은 ID 표기, 이메일형 ID, 일반 ID를 다르게 입력할 수 있어 연락처 중심 조회와 서버 중복 차단이 필수입니다.
  - 프런트에서 “기존 서류는 유지”라고 안내하면 서버 업데이트도 기존 첨부 배열과 새 첨부 배열을 합쳐 저장해야 UX 문구와 실제 데이터가 일치합니다.
  - 반려 보완 제출은 기존 행 PATCH 후 `진행 상태`, `반려 사유`, 처리/알림 플래그를 심사 대기 상태로 되돌려야 관리자 알림 플로우가 다시 탑니다.
  - `승인대기` 문자열에는 `승인`이 포함되므로 상태 판별은 승인보다 대기/반려를 먼저 검사해야 합니다.
  - `_tools/codex-save.sh`는 현재 빈 path 인수에서 `paths[@]: unbound variable` 오류가 날 수 있으므로, 세션 저장 시 최소 1개 실제 경로를 함께 넘기는 것이 안전합니다.
---

## 담당
최민석님(CTO)

## 참여
윤하늘님(PM), 김도현님(COO), 정유나님(CMO)

## 요약
강사공간 강사회원 신청에서 김진영 고객처럼 같은 사람이 두 번 신청되는 문제를 운영 기준으로 수정했습니다. 기존에는 서버가 자사몰 ID만 보고 중복을 판단해서, 같은 연락처 고객이 ID를 조금 다르게 쓰면 새 행이 생겼습니다. 이제 이미 신청한 고객은 기존 신청을 자동으로 불러오고, 새 신청이 아니라 수정/보완만 하도록 안내합니다.

## 운영 반영
- 운영 신청폼: `https://nocodb.pressco21.com/apply`
- 서버 파일: `/var/www/pressco21/forms/instructor-apply.html`
- n8n 제출 워크플로우: `Q3wqd8NMFaHjl1UB`
- n8n 조회 워크플로우: `zCsDFaURp9Skyqnp`

## 고객 화면 기준 변경
- 이미 신청한 연락처가 있으면 기존 신청 데이터가 자동 입력됩니다.
- 반려된 신청이면 “반려 보완 모드”로 보입니다.
- 안내 문구는 어르신 고객 기준으로 쉽게 넣었습니다.
  - “전에 신청하신 내용을 불러왔습니다.”
  - “틀린 부분만 고치고 부족한 서류만 추가해 주세요.”
  - “기존 서류는 유지되고 부족한 서류만 추가해 주세요.”
- 새로 다시 신청하는 흐름은 막고, 기존 신청 수정으로 유도합니다.

## 실제 운영 검증
운영 브라우저, 운영 n8n, 운영 NocoDB로 직접 테스트했습니다.

1. 테스트 고객으로 1차 신청
2. NocoDB에 실제 row 1개 생성 확인
3. 같은 정보로 재신청 시 HTTP 409 중복 차단 확인
4. 새 row가 생기지 않는 것 확인
5. 해당 row를 반려 상태로 전환
6. 신청폼 재진입 후 기존 신청 자동입력 확인
7. 반려 사유와 보완 안내 문구 확인
8. 새 서류 1개 추가 제출
9. 같은 row만 수정되는 것 확인
10. 기존 첨부 1개와 새 첨부 1개가 합쳐져 총 2개 유지 확인
11. 진행 상태와 반려 사유가 심사 대기용으로 초기화되는 것 확인
12. 테스트 데이터 삭제 후 row count 0 확인

## 백업
- n8n 백업: `n8n-automation/backups/20260424-235929-instructor-duplicate-flow/`
- 신청폼 백업: `homepage-automation/backups/20260424-235929-instructor-apply/`
- 서버 백업: `/var/www/pressco21/forms/instructor-apply.html.20260424-145929.bak`

## 최종 마감
두 작업 브랜치는 main에 병합했고 worktree와 로컬 브랜치도 삭제했습니다. 기능, 운영 검증, 백업 보존, 브랜치 정리까지 완료 상태입니다. 김진영 고객의 기존 중복 row 258/259는 운영 원본 보존을 위해 임의 삭제하지 않았습니다.
