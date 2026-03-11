# S3-5 SNS/YouTube 콘텐츠 재활용 SOP

작성일: 2026-03-11

## 목적

기존 YouTube와 RSS 콘텐츠를 협회/허브용 에디토리얼 자산으로 재활용해 `콘텐츠 허브 -> 클래스 탐색 -> 예약` 흐름을 자동으로 보강한다.

## 이번 단계에서 고정한 구조

- 수집 워크플로우: `WF-CONTENT Affiliation Content Import`
- 허브 읽기 워크플로우: `WF-01C Affiliation Read API`
- 저장 테이블: `tbl_Affiliation_Content (mit4xyrzn4s81b9)`

역할 분리:

- `WF-CONTENT`: 외부 RSS/YouTube를 읽고 `tbl_Affiliation_Content` 에 upsert
- `WF-01C getContentHub`: imported content 를 읽어 허브 카드에 반영

## 수집 소스

### 기본 소스

- PRESSCO21 YouTube RSS
  - `https://www.youtube.com/feeds/videos.xml?channel_id={YOUTUBE_CHANNEL_ID}`

### 확장 소스

- `PARTNERCLASS_CONTENT_RSS_URLS`
- webhook body 의 `rss_urls`

즉, 현재 운영 기준은 `YouTube 필수 + generic RSS 선택` 구조다.

## 분류 규칙

1. 우선 Gemini Flash 분류를 시도한다.
2. 실패하거나 키가 없으면 heuristic 으로 폴백한다.

분류 결과:

- `NOTICE`
- `EVENT`
- `GUIDE`
- `NEWS`

카테고리는 `압화 / 레진 / 캔들 / 부케 / 꽃 공예` 기준으로 요약한다.

## 저장 규칙

NocoDB row payload:

- `affiliation_code`
- `content_type`
- `title`
- `body`
- `image_url`
- `publish_date`
- `status=PUBLISHED`

중복 기준:

- `affiliation_code + title`

동일 제목이 있으면 `PATCH`, 없으면 `POST` 한다.

## 콘텐츠 허브 반영 방식

`WF-01C getContentHub` 는 이제 3개 read source 를 합친다.

1. `tbl_Classes`
2. `tbl_Partners`
3. `tbl_Affiliation_Content`

반영 규칙:

- `GUIDE` 는 허브 `guides` 카드 우선 소스
- `NOTICE / EVENT / NEWS` 는 허브 `trends` 카드 우선 소스
- imported content 가 없으면 기존 클래스 합성 fallback 을 그대로 사용
- `featured_message` 는 최신 imported content 가 있으면 그 제목/요약을 우선 사용
- 응답에는 `summary.imported_content_count`, `imported_content_preview` 를 같이 넣어 검증 가능하게 했다

## 라이브 배포 결과

- `WF-CONTENT Affiliation Content Import`: `gWllBlMjRvePQZg3`
- `WF-01C Affiliation Read API`: `AbazwCdqQ9XdA48G`
- 라우터 `WF-01 Class API`: `WabRAcHmcCdOpPzJ`

## 라이브 검증

실행 러너:

```bash
NODE_PATH=/Users/jangjiho/workspace/codex/node_modules node scripts/partnerclass-s3-5-content-import-runner.js
```

검증 결과:

- dry run
  - `youtube_count=3`
  - `rss_count=0`
  - fetched titles 3건 확인
- apply
  - `created=3`
  - imported titles:
    - `하바리움 캔들 홀더 만들기`
    - `부케 하바리움`
    - `부케 말리기의 모든 것`
- content hub response
  - `summary.imported_content_count >= 1`
  - `imported_content_preview` 존재
  - `trendTitles` 에 실제 YouTube 수입 제목 반영 확인

산출물:

- `output/playwright/s3-5-content-import/content-import-results.json`
- `output/playwright/s3-5-content-import/content-import-hub.png`

## 운영 메모

- 현재 실제 반영은 YouTube RSS 1종 + optional RSS 다.
- Instagram/TikTok 같은 폐쇄형 SNS는 직접 RSS가 없으므로 별도 API/중계 계층이 필요하다.
- `GUIDE` 분류 콘텐츠가 늘어나면 허브 가이드 카드가 클래스 fallback 대신 imported editorial 카드로 더 많이 대체된다.
