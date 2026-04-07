# NocoDB 쿼리 최적화 권고 (E2-007 Layer 3)

> 작성일: 2026-03-21
> 대상: 파트너클래스 관련 NocoDB 테이블

## 개요

NocoDB는 REST API 기반이므로 직접 DB 인덱스를 생성할 수 없지만,
API 쿼리 파라미터를 최적화하여 응답 속도를 개선할 수 있다.

---

## 1. Classes 테이블 (`mpvsno4or6asbxk`)

### 적용 완료

| 최적화 | 상세 | 적용 WF |
|--------|------|---------|
| `where` 필터 | `(status,eq,ACTIVE)~or(status,eq,active)` — ACTIVE 클래스만 조회 | WF-CLASS-LIST |
| `fields` 제한 | 목록에 필요한 18개 필드만 명시 (description 등 긴 텍스트 필드 제외) | WF-CLASS-LIST |
| `limit` 명시 | `1000` 고정 (기본값 25 방지) | WF-CLASS-LIST |

### 추가 권고

- **NocoDB 뷰 활용**: `ACTIVE_CLASSES_VIEW` 저장 뷰를 생성하여 `status=ACTIVE` 필터를 사전 적용.
  뷰 URL 형식: `/api/v1/db/data/noco/{projectId}/{tableId}/views/{viewId}`
- **정렬 사전 적용**: 가장 빈번한 정렬(latest = class_id DESC)을 뷰에 기본 적용.

---

## 2. Partners 테이블 (`mp8t0yq15cabmj4`)

### 적용 완료

| 최적화 | 상세 | 적용 WF |
|--------|------|---------|
| `fields` 축소 | `instagram_url`, `portfolio_url` 제거 (목록에서 불필요) | WF-CLASS-LIST |
| n8n staticData 캐시 | 10분 TTL — NocoDB 호출 횟수 대폭 감소 | WF-CLASS-LIST |

### 추가 권고

- Partners 수가 적으므로(50건 미만) 현재 최적화 수준으로 충분.
- 100건 이상 증가 시 `where=(status,eq,ACTIVE)` 추가 고려.

---

## 3. Schedules 테이블 (`mschd3d81ad88fb`)

### 적용 완료

| 최적화 | 상세 | 적용 WF |
|--------|------|---------|
| `where` 필터 | `(status,eq,active)` — 활성 일정만 조회 | WF-CLASS-LIST |
| `fields` 제한 | 4개 필드만 조회 (class_id, capacity, booked_count, schedule_date) | WF-CLASS-LIST |
| `sort` 추가 | `-schedule_date` — 최신 일정 우선 (next_date 계산 효율) | WF-CLASS-LIST |

### 추가 권고

- **과거 일정 제외**: `(schedule_date,ge,YYYY-MM-DD)` 조건 추가 가능하나,
  NocoDB에서 동적 날짜를 where에 넣으려면 n8n 표현식이 필요.
  현재는 Code 노드에서 `today` 비교로 필터링 중.
- 일정 데이터가 1000건 초과 시 `limit` 증가 또는 날짜 필터 서버사이드 적용 필요.

---

## 4. WF-01A v2 Categories 쿼리 (`mpvsno4or6asbxk`)

### 적용 완료

| 최적화 | 상세 | 적용 WF |
|--------|------|---------|
| `fields` 제한 | `category,status` — 2개 필드만 조회 | WF-01A v2 |
| n8n staticData 캐시 | 1시간 TTL | WF-01A v2 |

---

## 5. 캐시 TTL 요약

| 캐시 계층 | 위치 | TTL | 대상 |
|-----------|------|-----|------|
| Layer 1 | 브라우저 localStorage | 5분 | 클래스 목록 (필터 조합별), 카테고리 |
| Layer 2 | n8n staticData | 10분 | Partners 데이터 |
| Layer 2 | n8n staticData | 1시간 | Categories 데이터 |
| Layer 3 | NocoDB where/fields | - | 쿼리 시점 필터링 |

---

## 6. API 호출 절감 효과 (추정)

### 변경 전 (매 요청당)
- NocoDB 3회: Classes + Partners + Schedules

### 변경 후
- Partners 캐시 HIT 시: NocoDB 2회 (Classes + Schedules)
- 프론트엔드 캐시 HIT 시: NocoDB 0회 (5분 이내 동일 필터 재요청)
- Categories: 1시간 이내 NocoDB 0회

### 시간당 최대 절감
- 목록 페이지 조회 500회 가정
- Partners 캐시 HIT율 ~90% (10분 TTL)
- **변경 전**: 1,500 NocoDB 호출
- **변경 후**: ~1,050 NocoDB 호출 (약 30% 절감)
- 프론트엔드 캐시 포함 시 실제 API 호출은 더 크게 감소
