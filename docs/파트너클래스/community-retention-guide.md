# 커뮤니티 리텐션 가이드

작성일: 2026-03-11

## 목적

S2-6의 목표는 파트너클래스를 `예약 후 잊히는 페이지`가 아니라 `수강 후 다시 돌아오게 만드는 화면`으로 바꾸는 것이다.

- 수강생 기준: 수업이 끝난 뒤에도 다음 행동이 자연스럽게 이어져야 한다.
- 사업 기준: 후기, 재수강, 재료 재구매, 휴면 복귀를 같은 리텐션 흐름으로 묶는다.
- 구현 기준: 7개 장치 전체를 한 번에 완성하기보다, 자동 트리거와 마이페이지 표면을 먼저 붙여 재방문 루프를 만든다.

## 1차 구현 범위

이번 1차 구현에서 실제로 붙인 장치는 5개다.

1. 수강 완료 축하 트리거
2. 월간 수강 리포트
3. 연속 수강 배지
4. 휴면 30일 리마인드 트리거
5. 후기 작성 감사 메시지

아직 미구현 상태로 남긴 장치:

- 생일 쿠폰 자동 발송
- 친구 추천 적립금

## 프론트 구현

대상 파일:

- `파트너클래스/마이페이지/Index.html`
- `파트너클래스/마이페이지/css.css`
- `파트너클래스/마이페이지/js.js`
- `파트너클래스/상세/js.js`

### 마이페이지 구조

`#mbRetentionArea` 를 요약 카드 아래, 예약 리스트 위에 추가했다.

- `#mbRetentionNotice`
  - 수강 완료 직후 안내 또는 후기 감사 메시지
- `#mbMonthlyReportCard`
  - 이번 달 수강 횟수, 결제 금액, 함께 들은 파트너 수, 최근 클래스명
- `#mbBadgeBoardCard`
  - 연속 수강 횟수, 다음 배지까지 남은 횟수, 획득 배지 목록

### 후기 감사 메시지 연결

상세 페이지 후기 등록 성공 시 `pressco21_review_thanks_v1` 를 localStorage 에 저장하고, 마이페이지가 이 값을 읽어 상단 notice 로 노출한다.

- 상세 -> 마이페이지 전환 시 즉시 보인다.
- 닫기 버튼을 누르면 localStorage 값을 비워 재노출을 막는다.

## 워크플로우 구현

대상 파일:

- `파트너클래스/n8n-workflows/WF-RETENTION-student-lifecycle.json`
- `scripts/partnerclass-s2-6-generate-retention-workflow.js`
- `scripts/partnerclass-s2-6-deploy-retention.js`

운영 배포 워크플로우:

- 이름: `WF-RETENTION Student Lifecycle`
- id: `Fv3CDaksXhiwioyY`

### 트리거

- 스케줄: 매일 `09:15`
- 수동 호출: `POST /webhook/student-retention`

### 현재 자동화 범위

- 전일 수강 완료자 조회 -> 완료 축하 메일 대상 추출
- 30일 휴면 수강생 조회 -> 복귀 유도 메일 대상 추출
- dry run 모드 지원
- 이메일 주소가 없는 대상은 `*_skipped_missing_email` 로 분리 집계

### 데이터 처리 원칙

- NocoDB 날짜 필터 제약 때문에 `status=COMPLETED` 집합을 먼저 읽고, 날짜는 Code 노드에서 다시 거른다.
- KST 하루 기준선이 밀리지 않도록 UTC 기반 날짜 helper 를 스크립트에 넣었다.
- 기존 `student_email_sent` 플래그(`COMPLETE_SENT`, `DORMANT_30_SENT`) 를 그대로 재사용한다.

## 수락 기준 판단

ROADMAP 기준 수락은 다음 상태로 본다.

- 최소 4개 장치 1차 구현: 충족
- 자동 트리거 WF 정상 동작: 충족
- 수강생 마이페이지에서 배지 확인 가능: 충족

단, 아래 항목은 아직 운영 데이터 제약이 있다.

- 레거시 완료 예약건 일부에 `student_email`, `student_name` 이 비어 있어 실제 발송은 skip 처리된다.
- 웹훅 수동 실호출은 현재 `200` 빈 본문으로 끝나는 케이스가 있어, 운영 기준선은 dry run 응답과 스케줄 실행으로 본다.

## 검증

정적 검증:

- `node --check 파트너클래스/마이페이지/js.js`
- `node --check 파트너클래스/상세/js.js`
- `node --check scripts/partnerclass-s2-6-generate-retention-workflow.js`
- `node --check scripts/partnerclass-s2-6-deploy-retention.js`
- `node --check scripts/partnerclass-s2-6-retention-runner.js`
- `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py 파트너클래스/마이페이지/Index.html 파트너클래스/마이페이지/css.css 파트너클래스/마이페이지/js.js 파트너클래스/상세/js.js`

라이브 워크플로우 dry run:

- 완료 경로:
  - `completion_raw_count = 1`
  - `completion_count = 0`
  - `completion_skipped_missing_email = 1`
- 휴면 경로:
  - `dormant_raw_count = 1`
  - `dormant_count = 0`
  - `dormant_skipped_missing_email = 1`

Playwright 검증:

- fixture 생성: `node scripts/build-partnerclass-playwright-fixtures.js`
- 러너 실행: `node scripts/partnerclass-s2-6-retention-runner.js`
- 산출물:
  - `output/playwright/s2-6-retention/retention-results.json`
  - `output/playwright/s2-6-retention/mypage-retention.png`

검증 결과:

- `retentionVisible = true`
- `noticeTitle = 후기 감사합니다. 다음 수업과 재료 탐색을 이어가세요.`
- `monthlyTitle = 2026년 3월 수강 리포트`
- `streakCount = 3`
- `earnedBadges = Starter Loop`
- `pageErrors = []`
- `consoleErrors = []`

## 운영 메모

- 이번 작업은 아직 메이크샵 디자인편집기 실배포 전 단계다.
- 따라서 실제 2610 마이페이지 저장 후에는 live member session 기준으로 한 번 더 확인해야 한다.
- 리텐션 메일 활성화를 위해서는 완료 예약에 `student_email` 누락이 없는지 먼저 정리해야 한다.
