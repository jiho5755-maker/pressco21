# WF-01 Switch Map

작성일: 2026-03-10

> 이 문서는 `S2-4` 분리 전 monolith 기준 source map 이다.
> 현재 운영 구조는 `WF-01-split-guide.md` 를 우선 참고한다.

대상 워크플로우: `파트너클래스/n8n-workflows/WF-01-class-api.json`

운영 ID: `WabRAcHmcCdOpPzJ`

웹훅: `POST https://n8n.pressco21.com/webhook/class-api`

## 개요

`WF-01 Class API`는 공개 읽기 전용 워크플로우다. `Webhook -> Switch Action` 구조로 `body.action` 값을 기준으로 4개 액션으로 분기한다.

기본 규칙:

- 입력 기준: `Content-Type: application/json`
- 분기 기준: `body.action`
- 공통 응답 필드: `success`, `timestamp`
- 기본 에러: 알 수 없는 action은 `INVALID_ACTION`

## Switch 액션 목록

| action | 목적 | 다음 노드 | 주요 호출 페이지 |
|------|------|-----------|----------------|
| `getClasses` | 클래스 목록 조회 | `Parse getClasses Params` | `파트너클래스/목록/js.js`, `파트너클래스/상세/js.js`(관련 클래스), `메인페이지/js.js`, `메인페이지/파트너클래스-홈개편/js.js` |
| `getClassDetail` | 클래스 상세 조회 | `Parse getClassDetail Params` | `파트너클래스/상세/js.js` |
| `getCategories` | 카테고리 목록/건수 조회 | `NocoDB Get Active Classes (Categories)` | `파트너클래스/목록/js.js` |
| `getAffiliations` | 협회 제휴 목록 조회 | `NocoDB Get Affiliations` | `파트너클래스/목록/js.js`, `파트너클래스/어드민/js.js`, `메인페이지/파트너클래스-홈개편/Index.html` 진입 링크 |

## Action 상세

### 1. `getClasses`

목적:

- 공개 클래스 목록 조회
- 필터/정렬/페이징 처리
- 파트너 정보와 스케줄 잔여석 조인
- canonical status/level/region 응답

입력 파라미터:

| 키 | 필수 | 설명 |
|----|------|------|
| `action` | 예 | `getClasses` |
| `page` | 아니오 | 기본 `1` |
| `limit` | 아니오 | 기본 `20`, 최대 `50` |
| `category` | 아니오 | 단일 또는 콤마 구분 |
| `level` | 아니오 | `입문`, `beginner`, `BEGINNER` 등 혼합 입력 허용 |
| `difficulty` | 아니오 | `level`과 동일 의미 alias |
| `type` | 아니오 | `원데이`, `정기`, `온라인` |
| `region` | 아니오 | `서울`, `SEOUL` 등 혼합 입력 허용 |
| `sort` | 아니오 | `latest`, `popular`, `rating`, `price_asc`, `price_desc` |
| `maxPrice` | 아니오 | 최대 가격 필터 |
| `search` / `q` | 아니오 | 클래스명/파트너명/카테고리/지역/태그 검색 |

응답 구조:

```json
{
  "success": true,
  "data": {
    "classes": [
      {
        "class_id": "CL_202602_001",
        "class_name": "압화 아트 기초 클래스",
        "category": "압화",
        "type": "원데이",
        "status": "ACTIVE",
        "level": "BEGINNER",
        "region": "SEOUL",
        "partner_name": "장지호 (테스트 파트너)",
        "partner_grade": "BLOOM",
        "total_remaining": 20,
        "schedule_count": 2
      }
    ],
    "page": 1,
    "limit": 20,
    "total": 7,
    "totalPages": 1
  },
  "timestamp": "2026-03-10T11:00:00.000Z"
}
```

운영 메모:

- NocoDB에서는 legacy 값이 남아 있어도 응답은 `ACTIVE`, `BEGINNER`, `SEOUL` 같은 canonical 값으로 통일된다.
- 목록 응답은 최종적으로 `ACTIVE` 클래스만 노출한다.

### 2. `getClassDetail`

목적:

- 단일 클래스 상세 조회
- 파트너 공개 정보와 일정 목록 조인
- 상세 페이지에서 바로 렌더링 가능한 구조 반환

입력 파라미터:

| 키 | 필수 | 설명 |
|----|------|------|
| `action` | 예 | `getClassDetail` |
| `id` | 예 | `class_id` 값 |

응답 구조:

```json
{
  "success": true,
  "data": {
    "class_id": "CL_202602_001",
    "class_name": "압화 아트 기초 클래스",
    "status": "ACTIVE",
    "level": "BEGINNER",
    "region": "SEOUL",
    "partner": {
      "partner_code": "PC_...",
      "partner_name": "장지호 (테스트 파트너)",
      "grade": "BLOOM",
      "region": "SEOUL"
    },
    "schedules": [],
    "kit_enabled": 0,
    "kit_items": []
  },
  "timestamp": "2026-03-10T11:00:00.000Z"
}
```

에러:

- `id` 누락 시 `MISSING_PARAMS`
- 대상 클래스가 없으면 `CLASS_NOT_FOUND`

### 3. `getCategories`

목적:

- 목록 페이지 카테고리 필터 생성용
- 활성 클래스 기준 카테고리 건수 집계

입력 파라미터:

| 키 | 필수 | 설명 |
|----|------|------|
| `action` | 예 | `getCategories` |

응답 구조:

```json
{
  "success": true,
  "data": [
    { "name": "압화", "class_count": 3 },
    { "name": "기타", "class_count": 3 },
    { "name": "캔들", "class_count": 1 }
  ],
  "timestamp": "2026-03-10T11:00:00.000Z"
}
```

운영 메모:

- 집계 시 `ACTIVE`와 legacy `active`를 모두 활성으로 간주한다.

### 4. `getAffiliations`

목적:

- 협회/제휴 목록 조회
- 협회별 할인율과 인센티브 tier 노출

입력 파라미터:

| 키 | 필수 | 설명 |
|----|------|------|
| `action` | 예 | `getAffiliations` |

응답 구조:

```json
{
  "success": true,
  "data": [
    {
      "affiliation_code": "AFF_...",
      "name": "예시 협회",
      "discount_rate": 10,
      "incentive_tiers": [
        { "target": 5000000, "incentive": 250000 }
      ]
    }
  ],
  "total": 1,
  "timestamp": "2026-03-10T11:00:00.000Z"
}
```

## Unknown Action

Switch에 매칭되지 않는 action은 `Unknown Action Error -> Respond Error`로 이동한다.

응답 예시:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_ACTION",
    "message": "지원하지 않는 action입니다."
  },
  "timestamp": "2026-03-10T11:00:00.000Z"
}
```

## 현재 호출 경로 요약

- 목록 페이지 `id=2606`
  - `getClasses`
  - `getCategories`
  - `getAffiliations`
- 상세 페이지 `id=2607`
  - `getClassDetail`
  - `getClasses` (관련 클래스)
- 어드민 페이지 `id=8011`
  - `getAffiliations`
- 메인페이지 파트너클래스 진입 카드
  - `getClasses`

## 유지 원칙

- 신규 action을 추가할 때는 이 문서와 `ROADMAP.md`를 같이 갱신한다.
- 호출 페이지가 바뀌면 "현재 호출 경로 요약" 섹션을 먼저 수정한다.
- 응답 구조 변경 전에는 목록(2606), 상세(2607), 어드민(8011), 메인페이지 파트너클래스 카드 회귀 확인이 필요하다.
