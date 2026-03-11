# S3-6 연간 이벤트 캘린더 가이드

작성일: 2026-03-11

## 목적

S3-6은 협회 레이어에 `12개월 연간 이벤트 캘린더`를 추가해 다음 두 가지를 고정한다.

- 협회/세미나 탭에서 월별 이벤트를 실제 데이터로 탐색할 수 있게 한다.
- 파트너와 운영팀이 시즌 이벤트를 놓치지 않도록 `D-14 자동 알림` 구조를 만든다.

## 구현 범위

### 1. 데이터 템플릿

- `scripts/lib/partnerclass-annual-event-templates.js`
  - 1월~12월 시즌 이벤트 템플릿 12개 정의
  - `buildAnnualCalendarRows()` 로 협회별 연간 세미나 row 생성
  - 기본 세미나 테이블 ID: `m9gh6baz3vow966`

### 2. 협회 세미나 API

- `scripts/lib/partnerclass-seminar-response.js`
  - `WF-01C getSeminars` 응답 코드 생성
- `scripts/partnerclass-s2-4-generate-wf01-split.js`
  - `WF-01C Affiliation Read API` 에 `getSeminars` action 추가
- live workflow
  - `WF-01C Affiliation Read API`: `AbazwCdqQ9XdA48G`
  - `WF-01 Class API`: `WabRAcHmcCdOpPzJ`

응답 규격:

- `data[]`: 세미나 카드용 row
- `total`: 필터 적용 후 총 개수
- `summary.months_covered`
- `summary.due_in_14_days`

### 3. 이벤트 관리 워크플로우

- `scripts/partnerclass-s3-6-generate-event-workflows.js`
- `scripts/partnerclass-s3-6-deploy-event-workflows.js`
- `scripts/partnerclass-s3-6-sync-event-calendar.js`

live workflow:

- `WF-EVENT Yearly Calendar Admin`: `h90HfqDSZHp318oR`
- `WF-EVENT D14 Auto Alert`: `4kLd9MDEIPgSgf2g`

주요 액션:

- `syncAnnualCalendar`
  - 협회 활성 row 기준으로 연간 12개월 이벤트 upsert
- `runD14Alerts`
  - `seminar_date - today = 14일` 인 이벤트만 추출
  - 파트너/관리자 수신 대상 계산
  - `dry_run=true` 면 미리보기만 반환

## 어드민 UI

- `파트너클래스/어드민/Index.html`
- `파트너클래스/어드민/css.css`
- `파트너클래스/어드민/js.js`

협회 관리 탭에 아래 UI를 추가했다.

- 연도 선택
- 협회 선택
- 미리보기 기준일 선택
- `연간 캘린더 동기화`
- `D-14 알림 점검`
- 요약 카드 3개
  - 총 이벤트 수
  - 예정 이벤트 수
  - D-14 해당 수

## 목록 연동

- `파트너클래스/목록/js.js`

`협회·세미나`, `혜택·이벤트` 탭은 이제 `class-api getSeminars` 실데이터를 우선 사용한다.
세미나 row 가 없을 때만 기존 fallback 섹션으로 내려간다.

## 운영 토큰 주의

- live `partnerclass-event-calendar-admin` 웹훅 인증은 현재 구형 토큰 `pressco21-admin-2026` 기준이 가장 안정적이다.
- 자동 스케줄 WF도 같은 토큰을 직접 사용하도록 고정했다.
- 저장소 `.secrets.env`의 `ADMIN_API_TOKEN` 값과 운영 런타임 값이 다를 수 있으므로, 이 기능은 legacy token 기준으로 검증한다.

## 검증

### 정적 검증

- `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py 파트너클래스/목록/js.js 파트너클래스/어드민/js.js 파트너클래스/어드민/Index.html 파트너클래스/어드민/css.css`
- `node --check scripts/lib/partnerclass-annual-event-templates.js`
- `node --check scripts/lib/partnerclass-seminar-response.js`
- `node --check scripts/partnerclass-s3-6-sync-event-calendar.js`
- `node --check scripts/partnerclass-s3-6-generate-event-workflows.js`
- `node --check scripts/partnerclass-s3-6-deploy-event-workflows.js`
- `node --check scripts/partnerclass-s3-6-event-calendar-runner.js`

### 라이브 검증

- `syncAnnualCalendar(year=2026, dry_run=false)`
  - `created=12 -> 이후 updated=12`
  - `months_covered=1~12`
- `class-api getSeminars(year=2026)`
  - `total=14`
  - `months_covered=1~12`
  - 기존 샘플 2건 + 연간 캘린더 12건
- `runD14Alerts(today=2026-03-11, dry_run=true)`
  - `due_event_count=1`
  - `partner_target_count=6`
  - `admin_target_count=1`
  - `total_target_count=7`

### Playwright

- `NODE_PATH=/Users/jangjiho/workspace/codex/node_modules node scripts/partnerclass-s3-6-event-calendar-runner.js`

산출물:

- `output/playwright/s3-6-event-calendar/event-calendar-results.json`
- `output/playwright/s3-6-event-calendar/admin-event-calendar.png`

## 현재 운영 메모

- `D-14` 로직과 자동 스케줄 활성화는 끝났다.
- 실제 메일 발송은 이벤트 WF가 사용하는 SMTP credential 상태에 영향을 받는다.
- 이번 태스크에서는 실메일 발송 대신 `dry_run` 과 workflow activation, UI 미리보기까지를 수락 기준으로 검증했다.
