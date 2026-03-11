# S3-1 신규 스키마 가이드

작성일: 2026-03-11  
태스크: Phase 3-3 `S3-1 NocoDB 4개 신규 테이블`

## 목적

Phase 3-3 스케일업 범위에서 사용할 신규 데이터 레이어 4종을 live NocoDB에 선반영했다.

- `tbl_Seminars`
- `tbl_Affiliation_Products`
- `tbl_Affiliation_Content`
- `tbl_Vocabulary`

핵심 목표는 다음 두 가지다.

1. 협회/세미나/협회원 혜택 기능을 기존 클래스 허브 안에서 확장 가능한 구조로 만든다.
2. 이후 S3-2~S3-6 구현이 재실행 가능한 스크립트와 검증 러너를 기반으로 진행되게 한다.

## 생성 스크립트

- 생성/보정 스크립트: `scripts/partnerclass-s3-1-create-tables.js`
- Playwright 검증 러너: `scripts/partnerclass-s3-1-schema-runner.js`

### 동작 원칙

- `.secrets.env` 의 `NOCODB_URL`, `NOCODB_API_TOKEN`, `NOCODB_PROJECT_ID` 사용
- NocoDB meta API 로 테이블 존재 여부를 확인하고 없으면 생성
- 이미 존재하는 테이블은 재사용
- 누락 컬럼이 있으면 `POST /api/v2/meta/tables/{tableId}/columns` 로 보강
- 샘플 row 는 `upsert` 방식으로 유지
- 샘플 협회는 우선 `KPFA_001` 을 사용하고, 없으면 첫 번째 협회 row 로 폴백

## 실제 생성 결과

2026-03-11 기준 live table id 는 아래와 같다.

| 테이블 | table id | 비고 |
|------|------|------|
| `tbl_Seminars` | `m9gh6baz3vow966` | 협회 세미나/이벤트 |
| `tbl_Affiliation_Products` | `mm75dgbohhth2ll` | 협회원 전용 상품/할인 |
| `tbl_Affiliation_Content` | `mit4xyrzn4s81b9` | 협회 공지/이벤트/가이드 |
| `tbl_Vocabulary` | `mhf2e1hqj5vqmi5` | 용어 표준화 사전 |

기준 협회 row:

- `affiliation_code`: `KPFA_001`
- `name`: `한국꽃공예협회`
- `discount_rate`: `5`

## 컬럼 설계

NocoDB 기본 메타 컬럼 `id`, `created_at`, `updated_at`, `created_by`, `updated_by`, `nc_order` 는 자동 생성된다.  
PRD 의 `id`, `createdAt` 는 이 기본 메타 컬럼으로 대응했다.

### tbl_Seminars

| 컬럼 | 타입 |
|------|------|
| `seminar_id` | `SingleLineText` |
| `affiliation_code` | `SingleLineText` |
| `title` | `SingleLineText` |
| `description` | `LongText` |
| `seminar_date` | `Date` |
| `seminar_time` | `SingleLineText` |
| `location` | `SingleLineText` |
| `capacity` | `Number` |
| `status` | `SingleLineText` |
| `image_url` | `URL` |

### tbl_Affiliation_Products

| 컬럼 | 타입 |
|------|------|
| `affiliation_code` | `SingleLineText` |
| `branduid` | `SingleLineText` |
| `product_name` | `SingleLineText` |
| `discount_rate` | `Number` |
| `is_signature` | `Checkbox` |
| `display_order` | `Number` |
| `status` | `SingleLineText` |

### tbl_Affiliation_Content

| 컬럼 | 타입 |
|------|------|
| `affiliation_code` | `SingleLineText` |
| `content_type` | `SingleLineText` |
| `title` | `SingleLineText` |
| `body` | `LongText` |
| `image_url` | `URL` |
| `publish_date` | `Date` |
| `status` | `SingleLineText` |

### tbl_Vocabulary

| 컬럼 | 타입 |
|------|------|
| `domain` | `SingleLineText` |
| `code` | `SingleLineText` |
| `label_ko` | `SingleLineText` |
| `label_en` | `SingleLineText` |
| `description` | `LongText` |

## 샘플 데이터

샘플 row 는 실제 협회 코드 `KPFA_001` 기준으로 입력했다.

### tbl_Seminars

- `SEM_KPFA_001_202604_01` / `한국꽃공예협회 4월 봄 시즌 세미나`
- `SEM_KPFA_001_202605_01` / `한국꽃공예협회 온라인 운영 세미나`

### tbl_Affiliation_Products

- `AFFKPFA_001KIT001` / 협회원 전용 시그니처 키트
- `AFFKPFA_001MAT002` / 시즌 재료 패키지
- `AFFKPFA_001TOOL003` / 운영 준비 공구 세트

### tbl_Affiliation_Content

- `NOTICE` / `한국꽃공예협회 협회원 혜택 안내`
- `EVENT` / `한국꽃공예협회 5월 공동 세미나 참가 모집`
- `GUIDE` / `한국꽃공예협회 협회원 전용 구매 가이드`

### tbl_Vocabulary

- `DIFFICULTY / BEGINNER`
- `DIFFICULTY / INTERMEDIATE`
- `GRADE / BLOOM`
- `GRADE / GARDEN`
- `BOOKING / CONFIRMED`
- `APPROVAL / PENDING_REVIEW`
- `CLASS / ONLINE`
- `REGION / SEOUL`

## 실행 명령

```bash
node scripts/partnerclass-s3-1-create-tables.js
NODE_PATH=/Users/jangjiho/workspace/codex/node_modules node scripts/partnerclass-s3-1-schema-runner.js
```

## 검증 결과

### 생성 스크립트 1차 실행

- 4개 테이블 모두 신규 생성
- 샘플 row 입력:
  - `tbl_Seminars`: 2건
  - `tbl_Affiliation_Products`: 3건
  - `tbl_Affiliation_Content`: 3건
  - `tbl_Vocabulary`: 8건

### 생성 스크립트 2차 실행

- 추가 생성 없음
- 모든 row 는 `inserted=0`, `updated>0`
- 즉, 재실행해도 중복 row 가 생기지 않는 idempotent 상태 확인

### Playwright 검증

- 러너: `scripts/partnerclass-s3-1-schema-runner.js`
- 방식: Playwright `APIRequestContext` 로 live NocoDB meta/data API 재조회
- 확인값:
  - 4개 테이블 모두 존재
  - 각 테이블의 필수 컬럼 존재
  - 샘플 row 일치:
    - `tbl_Seminars`: `2/2`
    - `tbl_Affiliation_Products`: `3/3`
    - `tbl_Affiliation_Content`: `3/3`
    - `tbl_Vocabulary`: `8/8`

산출물:

- `output/playwright/s3-1-schema/schema-create-results.json`
- `output/playwright/s3-1-schema/schema-results.json`

## 다음 태스크 연결

- `S3-2` 는 이 신규 테이블을 직접 쓰지는 않더라도, `tbl_Vocabulary` 를 등급/혜택 표준화 기준으로 활용할 수 있다.
- `S3-5 협회 전용 랜딩 자동 생성` 과 `S3-6 협회 KPI 대시보드` 는 `tbl_Seminars`, `tbl_Affiliation_Products`, `tbl_Affiliation_Content` 를 바로 읽는 방향으로 이어가면 된다.
