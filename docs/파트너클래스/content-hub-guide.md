# 콘텐츠 허브 가이드

작성일: 2026-03-11

## 목적

S2-5에서 추가한 콘텐츠 허브는 수강생이 예약 전에 `왜 이 플랫폼을 계속 둘러봐야 하는지`를 콘텐츠로 먼저 설득하는 레이어다.

- 수강생 기준: 클래스 카탈로그만 보지 않고 파트너 맥락, 트렌드, 입문 가이드를 함께 읽게 한다.
- 파트너 기준: 인터뷰형 카드와 큐레이션으로 `홍보 자산` 역할을 한다.
- 사업 기준: 콘텐츠 허브 -> 클래스 상세 -> 예약 또는 파트너 신청 흐름을 한 허브 안에서 연결한다.

## 구현 범위

새 메이크샵 개별페이지 자산:

- `파트너클래스/콘텐츠허브/Index.html`
- `파트너클래스/콘텐츠허브/css.css`
- `파트너클래스/콘텐츠허브/js.js`

페이지 구조는 4개 영역으로 고정했다.

1. 클래스 하이라이트
2. 파트너 인터뷰
3. 꽃 트렌드
4. 초보자 가이드

상단에는 요약 수치와 대표 메시지를 두고, 하단 CTA는 `전체 클래스`와 `파트너 신청`으로 분기한다.

## 데이터 소스

S2-5 1차 구현은 신규 콘텐츠 테이블 없이 기존 데이터만 사용했다.

- `tbl_Classes`
- `tbl_Partners`

S3-5부터는 아래 테이블이 추가 소스로 붙었다.

- `tbl_Affiliation_Content`

현재 운영 기준:

- `partner_stories` 는 여전히 `Classes + Partners` 합성
- `trends / guides / featured_message` 는 `Affiliation_Content` 가 있으면 우선 사용
- imported content 가 없을 때만 기존 클래스 합성 fallback 으로 내려간다

## API 구조

기존 라우터 `WF-01 Class API` 를 유지하고 `action=getContentHub` 를 추가했다.

- 엔드포인트: `POST /webhook/class-api`
- action: `getContentHub`
- 구현 위치:
  - `파트너클래스/n8n-workflows/WF-01-class-api.json`
  - `파트너클래스/n8n-workflows/WF-01C-affiliation-read.json`
  - `scripts/partnerclass-s2-4-generate-wf01-split.js`

응답 구조:

- `summary`
- `featured_message`
- `highlights`
- `partner_stories`
- `trends`
- `guides`
- `imported_content_preview`

등급 값은 과거 데이터 호환을 위해 아래 alias 를 같이 정규화한다.

- `SILVER -> BLOOM`
- `GOLD -> GARDEN`
- `PLATINUM -> ATELIER`

## 프론트 동작 원칙

- 탭이 아니라 `scroll nav` 방식으로 4개 섹션을 이동한다.
- 에러 시 전체 허브를 깨뜨리지 않고 재시도 패널을 노출한다.
- 상세 이동은 `2607`, 클래스 탐색은 `2606`, 파트너 제휴는 `2609` 로 연결한다.
- 하이라이트/스토리/트렌드/가이드 모두 현재 데이터 부족 시 빈 상태 문구를 따로 보여준다.

## 로컬 검증

정적/문법 검증:

- `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py 파트너클래스/콘텐츠허브/Index.html 파트너클래스/콘텐츠허브/css.css 파트너클래스/콘텐츠허브/js.js`
- `node --check 파트너클래스/콘텐츠허브/js.js`
- `node --check scripts/partnerclass-s2-4-generate-wf01-split.js`
- `node --check scripts/build-partnerclass-playwright-fixtures.js`

Fixture 생성:

- `node scripts/build-partnerclass-playwright-fixtures.js`
- 산출물: `output/playwright/fixtures/partnerclass/content-hub.html`

Playwright 검증:

- 라이브 `getContentHub` 응답을 가져온 뒤 fixture 브라우저 요청에 주입하는 방식으로 검증
- 산출물:
  - `output/playwright/s2-5-content-hub/content-hub-results.json`
  - `output/playwright/s2-5-content-hub/content-hub-page.png`

검증 결과:

- `totalClasses = 7`
- `totalPartners = 3`
- `highlightCount = 4`
- `storyCount = 3`
- `trendCount = 3`
- `guideCount = 4`
- 첫 파트너 등급 카드 `BLOOM` 정규화 확인

## 운영 메모

- 아직 메이크샵 디자인편집기 실배포는 하지 않았다.
- 따라서 로컬 fixture + 라이브 API 기준 검증만 완료된 상태다.
- S3-5 이후 실제 허브 데이터는 `WF-CONTENT -> tbl_Affiliation_Content -> WF-01C` 경로로 자동 유입된다.
- 실배포 시에는 새 page id 확정, 모바일 스크롤 내비, 실제 링크 이동을 다시 확인해야 한다.
