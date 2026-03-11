# WF-01 Split Guide

작성일: 2026-03-11

대상 파일:

- `파트너클래스/n8n-workflows/WF-01-class-api.json`
- `파트너클래스/n8n-workflows/WF-01A-class-read.json`
- `파트너클래스/n8n-workflows/WF-01B-schedule-read.json`
- `파트너클래스/n8n-workflows/WF-01C-affiliation-read.json`

운영 워크플로우 ID:

- `WF-01 Class API` → `WabRAcHmcCdOpPzJ`
- `WF-01A Class Read API` → `Ebmgvd68MJfv5vRt`
- `WF-01B Schedule Read API` → `XQrogmHQABMM0atp`
- `WF-01C Affiliation Read API` → `AbazwCdqQ9XdA48G`

## 목적

기존 `WF-01 Class API`는 공개 읽기 전용 API이지만, 하나의 Switch 안에 목록/상세/카테고리/협회 액션이 모두 섞여 있었다.

S2-4에서는 이를 도메인 기준으로 분리했다.

- 라우터: 기존 `POST /webhook/class-api` 유지
- WF-01A: 클래스 목록/상세/카테고리
- WF-01B: 스케줄/잔여석
- WF-01C: 협회/기타

프론트엔드 URL은 바꾸지 않았다. 수강생/파트너 화면은 계속 `class-api` 하나만 호출하고, 라우터가 하위 워크플로우로 전달한다.

## 현재 라우팅 구조

### Router: `WF-01 Class API`

웹훅:

- `POST https://n8n.pressco21.com/webhook/class-api`

라우팅 규칙:

- `getClasses`, `getClassDetail`, `getCategories` → `WF-01A Class Read API`
- `getSchedules`, `getRemainingSeats` → `WF-01B Schedule Read API`
- `getAffiliations`, `getSeminars`, `getAffiliationDetail`, `getVocabulary` → `WF-01C Affiliation Read API`
- 그 외 → `INVALID_ACTION`

주의:

- 라우터는 하위 응답의 HTTP status를 유지하되, 내부 `_status` 필드는 외부 본문에서 제거한다.
- 따라서 기존 `class-api` 응답 본문 구조는 분리 전과 동일하게 유지된다.

## 하위 워크플로우

### WF-01A Class Read API

웹훅:

- `POST https://n8n.pressco21.com/webhook/class-api-read`

지원 액션:

- `getClasses`
- `getClassDetail`
- `getCategories`

구성 원칙:

- 분리 전 monolith의 목록/상세/카테고리 노드를 그대로 떼어온다.
- status/level/region 정규화와 파트너/스케줄 조인 로직은 그대로 유지한다.
- 직접 호출해도 CORS 헤더가 응답되도록 정리했다.

### WF-01B Schedule Read API

웹훅:

- `POST https://n8n.pressco21.com/webhook/class-api-schedule`

지원 액션:

- `getSchedules`
- `getRemainingSeats`

입력:

- `id` 또는 `classId`

응답:

- `getSchedules` → `{ success, data: { class_id, schedules } }`
- `getRemainingSeats` → `{ success, data: { class_id, schedule_count, total_capacity, total_booked, total_remaining, next_schedule, schedules } }`

메모:

- 현재 프론트는 이 액션을 직접 쓰지 않지만, 향후 목록/상세/대시보드에서 스케줄 도메인을 독립 호출할 수 있도록 미리 열어뒀다.

### WF-01C Affiliation Read API

웹훅:

- `POST https://n8n.pressco21.com/webhook/class-api-affiliation`

지원 액션:

- `getAffiliations`

메모:

- 협회/세미나/용어 사전 계열 read endpoint를 이후 여기에 누적할 수 있게 분리했다.

## 배포 절차

생성 스크립트:

- `scripts/partnerclass-s2-4-generate-wf01-split.js`

배포 스크립트:

- `scripts/partnerclass-s2-4-deploy-wf01-split.js`

실행 순서:

1. monolith source 백업 생성
2. 생성 스크립트로 router/A/B/C JSON 갱신
3. 배포 스크립트로 n8n API `create/update + activate`
4. baseline 비교와 Playwright request 검증

백업 경로 예시:

- `output/n8n-backups/20260311-111304-s2-4-wf01-split/`

## 검증 결과

분리 전 baseline:

- `output/playwright/s2-4-wf01/baseline/pre-split-baseline.json`

분리 후 비교:

- `output/playwright/s2-4-wf01/compare.json`

결과:

- `getClasses` 본문 동일
- `getClassDetail` 본문 동일
- `getCategories` 본문 동일
- `getAffiliations` 본문 동일
- `INVALID_ACTION` 응답 동일

추가 검증:

- `getSchedules` 200 + `success=true`
- `getRemainingSeats` 200 + `success=true`

Playwright request 결과:

- `output/playwright/s2-4-wf01/playwright-results.json`

## 운영 주의사항

- 이 문서는 현재 운영 구조를 설명한다.
- `WF-01-switch-map.md`는 2026-03-10 기준 monolith source map 문서로 남겨둔다.
- 향후 협회/콘텐츠 read action이 늘어나면 `WF-01C`를 먼저 확장하고, 라우터 매핑만 추가하는 방식으로 유지한다.
