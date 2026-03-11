# S2-8 3계층 캐싱 가이드

작성일: 2026-03-11

## 목적

`목록 체감 속도 개선 + WF-01 읽기 부하 감소 + 상세 액션 직후 목록 데이터 신선도 확보`를 동시에 처리한다.

## 캐시 레이어

### L1: 브라우저 localStorage

- 대상:
  - 목록 `getClasses`
  - 카테고리 `getCategories`
  - 협회 `getAffiliations`
- TTL:
  - 클래스 목록 `5분`
  - 카테고리/협회 설정 `1시간`
- 구현 파일:
  - `파트너클래스/목록/js.js`
  - `파트너클래스/상세/js.js`

### L2: n8n workflow staticData

- 대상:
  - `WF-01A Class Read API` 의 `getCategories`
  - `WF-01C Affiliation Read API` 의 `getAffiliations`
- TTL:
  - `1시간`
- 구현 파일:
  - `scripts/partnerclass-s2-4-generate-wf01-split.js`
  - `파트너클래스/n8n-workflows/WF-01A-class-read.json`
  - `파트너클래스/n8n-workflows/WF-01C-affiliation-read.json`

### L3: NocoDB 원본

- cache miss 일 때만 조회한다.

## 프론트 구현 기준

### 목록 페이지

- `classCatalog_*`
  - 목록 응답 저장
  - 현재 버전 키: `pressco21_catalog_cache_version`
- `classSettings_*`
  - 카테고리/협회 설정 저장
  - 현재 버전 키: `pressco21_catalog_settings_cache_version`
- 같은 prefix 안에서도 `entry.ttl` 을 같이 저장해서 TTL 변경 시 이전 캐시를 자연스럽게 정리한다.

### 상세 페이지 캐시 무효화

- 후기 등록 성공 시:
  - 현재 상세 cache 삭제
  - `classCatalog_*` 삭제
  - `pressco21_catalog_cache_version` 갱신
- 예약 기록 성공/폴백 이동 시:
  - 현재 상세 cache 삭제
  - `classCatalog_*` 삭제
  - `pressco21_catalog_cache_version` 갱신

즉, `상세 -> 목록` 복귀 시 같은 브라우저에서는 목록을 반드시 다시 읽는다.

## WF-01 구조 기준

### getCategories

- 경로:
  - `Check Categories Cache`
  - `Switch Categories Cache`
  - cache miss 일 때만 `NocoDB Get Active Classes (Categories) -> Aggregate Categories -> Store Categories Cache`
- hit 응답은 `_cacheStatus=HIT` 로 내부 분기만 하고, 외부 응답 본문에서는 제거한다.

### getAffiliations

- 경로:
  - `Check Affiliations Cache`
  - `Switch Affiliations Cache`
  - cache miss 일 때만 `NocoDB Get Affiliations -> Format Affiliations -> Store Affiliations Cache`
- hit 응답은 `_cacheStatus=HIT` 로 내부 분기만 하고, 외부 응답 본문에서는 제거한다.

## 검증

### 로컬 Playwright

- 러너:
  - `scripts/partnerclass-s2-8-cache-runner.js`
- 실행 예시:
  - `NODE_PATH=/Users/jangjiho/workspace/codex/node_modules node scripts/partnerclass-s2-8-cache-runner.js`
- 산출물:
  - `output/playwright/s2-8-cache/cache-results.json`
  - `output/playwright/s2-8-cache/cache-flow.png`

검증한 시나리오:

1. 첫 목록 진입 시 `getClasses=1`, `getCategories=1`
2. 같은 페이지 재진입 시 추가 API 호출 없음
3. 협회 탭 첫 진입 시 `getAffiliations=1`
4. 협회 탭 재진입 시 추가 API 호출 없음
5. 상세 후기 등록 후 `pressco21_catalog_cache_version` 갱신 + `classCatalog_*` 삭제
6. 이후 목록 재진입 시 `getClasses` 재호출
7. 캐시 timestamp 를 강제로 만료시키면 `getClasses/getCategories/getAffiliations` 모두 재호출

### 라이브 n8n

- 재생성:
  - `node scripts/partnerclass-s2-4-generate-wf01-split.js`
- 배포:
  - `node scripts/partnerclass-s2-4-deploy-wf01-split.js`
- 확인:
  - `POST /webhook/class-api-read { action: "getCategories" }`
  - `POST /webhook/class-api-affiliation { action: "getAffiliations" }`
  - `POST /webhook/class-api { action: "getCategories" | "getAffiliations" }`

라이브 확인 결과:

- 응답은 정상 JSON으로 복구됨
- 같은 payload를 연속 호출하면 동일 `timestamp` 가 재사용됨
- 실행 로그 기준 warm miss 1회 후에는 NocoDB 노드 없이 cache branch 만 탄다
  - categories warm miss 예: execution `49046`
  - categories cache hit 예: execution `49047`, `49051`
  - affiliations warm miss 예: execution `49048`
  - affiliations cache hit 예: execution `49049`, `49053`

## 현재 한계

- n8n public API `GET /workflows/{id}` 응답에서는 `staticData` 가 비어 보여 직접 값 조회는 안 된다.
- 따라서 라이브 검증 기준은 `응답 timestamp 재사용 + execution runData에서 NocoDB 미실행` 조합으로 본다.
