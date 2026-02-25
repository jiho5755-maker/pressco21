# Task 211: WF-01~03 클래스/파트너 API n8n 워크플로우 구현

> **버전**: Phase 2 v2.1 (n8n + NocoDB)
> **작성일**: 2026-02-25
> **담당 에이전트**: `gas-backend-expert`
> **의존성**: Task 201 (NocoDB 설치), Task 202 (n8n Credentials 설정)
> **참조**: `docs/phase2/n8n-airtable-migration-architecture.md`, `tasks/201-nocodb-database-design.md`

---

## 개요

Phase 2 파트너 클래스 플랫폼의 핵심 읽기 전용 API 워크플로우 3개를 n8n JSON 형식으로 구현합니다.
기존 GAS `class-platform-gas.gs`의 GET 엔드포인트 로직을 n8n + NocoDB 기반으로 전환합니다.

---

## 산출물

| 파일 | 내용 | 노드 수 |
|------|------|--------|
| `파트너클래스/n8n-workflows/WF-01-class-api.json` | 클래스 조회 API | 18개 |
| `파트너클래스/n8n-workflows/WF-02-partner-auth-api.json` | 파트너 인증/대시보드 API | 30개 |
| `파트너클래스/n8n-workflows/WF-03-partner-data-api.json` | 파트너 예약/후기 API | 22개 |

---

## WF-01: Class API (`/webhook/class-api`)

### 지원 액션

| 액션 | 기능 | GAS 원본 함수 |
|------|------|-------------|
| `getClasses` | 클래스 목록 (필터/정렬/페이징) | `handleGetClasses` (L273) |
| `getClassDetail` | 클래스 상세 + 파트너 정보 조인 | `handleGetClassDetail` (L384) |
| `getCategories` | 카테고리 목록 + 건수 집계 | `handleGetCategories` (L638) |

### 노드 플로우

```
[Webhook GET] -> [Switch: action]
  |
  +-> getClasses
  |    -> [Parse Params] -> [NocoDB tbl_Classes (where + sort)]
  |    -> [NocoDB tbl_Partners (활성 전체)]
  |    -> [Code: 조인 + 페이징] -> [Respond]
  |
  +-> getClassDetail
  |    -> [Parse Params + 검증]
  |    -> [IF valid] -> [NocoDB tbl_Classes (where=class_id)]
  |    -> [Code: 커리큘럼/이미지/일정 파싱]
  |    -> [NocoDB tbl_Partners (partner_code)]
  |    -> [Code: 결합] -> [Respond]
  |
  +-> getCategories
  |    -> [NocoDB tbl_Classes (status=active)]
  |    -> [Code: 카테고리 집계 + 내림차순] -> [Respond]
  |
  +-> fallback -> [Error 응답]
```

### getClasses 필터 파라미터

| 파라미터 | 설명 | NocoDB where 매핑 |
|---------|------|-------------------|
| `category` | 카테고리 (압화, 레진 등) | `(category,eq,{값})` |
| `level` | 난이도 (beginner/intermediate/advanced) | `(level,eq,{값})` |
| `type` | 유형 (원데이/정기/온라인) | `(type,eq,{값})` |
| `region` | 지역 (부분 매칭) | `(location,like,%{값}%)` |
| `sort` | 정렬 (latest/popular/rating/price_asc/price_desc) | NocoDB sort 필드 |
| `page` | 페이지 번호 (기본 1) | 코드 레벨 페이징 |
| `limit` | 페이지당 건수 (기본 20, 최대 50) | 코드 레벨 페이징 |

### 응답 형식 (기존 GAS와 동일)

```json
{
  "success": true,
  "data": [
    {
      "class_id": "CLS_001",
      "class_name": "압화 원데이 클래스",
      "category": "압화",
      "price": 35000,
      "partner_name": "플로라 공방",
      "..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 15,
    "totalPages": 1
  },
  "timestamp": "2026-02-25T10:30:00.000Z"
}
```

---

## WF-02: Partner Auth API (`/webhook/partner-auth`)

### 지원 액션

| 액션 | 기능 | GAS 원본 함수 |
|------|------|-------------|
| `getPartnerAuth` | 파트너 인증 확인 (3단계 분기) | `handleGetPartnerAuth` (L512) |
| `getPartnerDashboard` | 파트너 대시보드 데이터 | `handleGetPartnerDashboard` (L560) |
| `getPartnerApplicationStatus` | 파트너 신청 상태 | `handleGetPartnerApplicationStatus` (L3913) |
| `getEducationStatus` | 교육 이수 상태 | `handleGetEducationStatus` (L4897) |

### getPartnerAuth 인증 플로우

```
member_id 수신
  -> tbl_Partners 조회
  -> 파트너 존재?
     Yes -> 파트너 데이터 반환 (is_partner: true, status 포함)
     No  -> tbl_Applications 조회
            -> 신청 존재?
               Yes -> 신청 상태 반환 (status: 'pending')
               No  -> 비파트너 반환 (status: 'not_partner')
```

### getPartnerDashboard 데이터 집계

- 병렬 조회: tbl_Classes (내 클래스) + tbl_Settlements (정산 내역)
- 월별 필터: `targetMonth` 파라미터 (기본: 현재 월)
- 집계: 총 매출, 총 수수료, 총 적립금, 완료/대기/실패 건수

---

## WF-03: Partner Data API (`/webhook/partner-data`)

### 지원 액션

| 액션 | 기능 | GAS 원본 함수 |
|------|------|-------------|
| `getPartnerBookings` | 파트너 예약 현황 (마스킹) | `handleGetPartnerBookings` (L4399) |
| `getPartnerReviews` | 파트너 후기 (별점 분포) | `handleGetPartnerReviews` (L4555) |

### 개인정보 마스킹 함수 (Code 노드 내장)

```javascript
// 전화번호: 010-1234-5678 -> 010-****-5678
function maskPhone(phone) {
  if (!phone) return '';
  const clean = String(phone).replace(/[^0-9]/g, '');
  if (clean.length < 10) return phone;
  return clean.substring(0, 3) + '-****-' + clean.substring(clean.length - 4);
}

// 이름: 홍길동 -> 홍**
function maskName(name) {
  if (!name) return '';
  if (name.length <= 1) return name + '*';
  return name.charAt(0) + '*'.repeat(name.length - 1);
}

// 이메일: user@gmail.com -> use***@gmail.com
function maskEmail(email) {
  if (!email || !email.includes('@')) return email || '';
  const [local, domain] = email.split('@');
  const visible = local.substring(0, Math.min(3, local.length));
  return visible + '***@' + domain;
}
```

### getPartnerBookings 필터

| 파라미터 | 설명 | 필수 |
|---------|------|------|
| `member_id` | 파트너 회원 ID | 필수 |
| `class_id` | 특정 클래스 필터 | 선택 |
| `date_from` | 시작일 (YYYY-MM-DD) | 선택 |
| `date_to` | 종료일 (YYYY-MM-DD) | 선택 |
| `page` | 페이지 (기본 1) | 선택 |
| `limit` | 건수 (기본 20, 최대 50) | 선택 |

### getPartnerReviews 별점 분포 집계

응답 summary에 포함:
- `total_count`: 총 후기 수
- `avg_rating`: 평균 별점 (소수 1자리)
- `rating_distribution`: `{ 5: N, 4: N, 3: N, 2: N, 1: N }`
- `answered_count`: 답변 완료 건수
- `unanswered_count`: 미답변 건수

---

## NocoDB 연동 패턴

### HTTP Request 노드 설정

```
Method: GET
URL: https://nocodb.pressco21.com/api/v1/db/data/noco/{NOCODB_PROJECT_ID}/{tableName}
Authentication: Header Auth (xc-token)
Query Parameters:
  - where: (field,operator,value)~and(field2,operator,value2)
  - sort: field (ASC) 또는 -field (DESC)
  - fields: field1,field2,field3 (선택적 필드 제한)
  - limit: 정수 (최대 조회 건수)
```

### NocoDB where 연산자

| 연산자 | 설명 | 예시 |
|--------|------|------|
| `eq` | 같음 | `(status,eq,active)` |
| `neq` | 다름 | `(status,neq,closed)` |
| `like` | 부분 매칭 | `(location,like,%강남%)` |
| `gte` | 이상 | `(class_date,gte,2026-03-01)` |
| `lte` | 이하 | `(class_date,lte,2026-03-31)` |

### Links 필드 처리

NocoDB의 Links(관계) 필드는 API 응답에서 배열 형태로 반환됩니다:
```json
{ "partner_code": [{ "partner_code": "PC_202603_001", "Id": 1 }] }
```
Code 노드에서 배열/문자열 양쪽을 모두 처리:
```javascript
let partnerCode = '';
if (Array.isArray(c.partner_code) && c.partner_code.length > 0) {
  partnerCode = c.partner_code[0].partner_code || '';
} else if (typeof c.partner_code === 'string') {
  partnerCode = c.partner_code;
}
```

---

## 환경 변수 및 Credentials

### n8n 환경 변수 (docker-compose)

| 변수 | 값 | 용도 |
|------|---|------|
| `NOCODB_PROJECT_ID` | (NocoDB 프로젝트 ID) | API URL 구성 |

### n8n Credentials

| 이름 | 타입 | 설정 |
|------|------|------|
| `NocoDB API Token` | HTTP Header Auth | Header Name: `xc-token`, Value: (NocoDB API 토큰) |

---

## GAS 대비 변경사항

| 항목 | GAS | n8n + NocoDB |
|------|-----|-------------|
| 캐싱 | CacheService (5분/6시간) | 없음 (NocoDB 직접 조회 200~500ms 충분) |
| 필터링 | Sheets 전체 읽기 + JS 루프 | NocoDB `where` 파라미터 서버 필터링 |
| 정렬 | JS `sort()` 함수 | NocoDB `sort` 파라미터 서버 정렬 |
| 파트너 조인 | `getPartnerPublicInfo_` 함수 호출 | NocoDB 병렬 조회 + Code 노드 조인 |
| 에러 응답 | `errorResult(ERROR_CODES.xxx)` | Code 노드에서 동일 구조 JSON 생성 |
| 동시성 | LockService (GET은 미사용) | 불필요 (읽기 전용) |

---

## 배포 가이드

### 1. n8n에서 워크플로우 임포트

1. n8n.pressco21.com 접속
2. Workflows -> Import from File
3. `WF-01-class-api.json`, `WF-02-partner-auth-api.json`, `WF-03-partner-data-api.json` 순서로 임포트
4. 각 워크플로우에서 NocoDB HTTP Request 노드의 Credentials를 실제 등록된 `NocoDB API Token`으로 연결
5. URL의 `{{ $env.NOCODB_PROJECT_ID }}`가 실제 프로젝트 ID로 치환되는지 확인

### 2. 환경 변수 설정

n8n docker-compose.yml에 추가:
```yaml
environment:
  - NOCODB_PROJECT_ID=p_xxxxxxxxxx
```

### 3. Webhook 활성화

각 워크플로우를 Active로 전환하면 Webhook URL이 자동 생성:
- `https://n8n.pressco21.com/webhook/class-api`
- `https://n8n.pressco21.com/webhook/partner-auth`
- `https://n8n.pressco21.com/webhook/partner-data`

### 4. CORS 확인

n8n 환경 변수에 아래가 설정되어야 합니다:
```
N8N_CORS_ALLOWED_ORIGINS=https://foreverlove.co.kr,https://www.foreverlove.co.kr
```

---

## 테스트 체크리스트

### WF-01: Class API

- [ ] `GET /webhook/class-api?action=getClasses` -- 활성 클래스 목록 반환 확인
- [ ] `GET /webhook/class-api?action=getClasses&category=압화` -- 카테고리 필터 동작
- [ ] `GET /webhook/class-api?action=getClasses&level=beginner` -- 난이도 필터 동작
- [ ] `GET /webhook/class-api?action=getClasses&type=원데이` -- 유형 필터 동작
- [ ] `GET /webhook/class-api?action=getClasses&region=강남` -- 지역 부분 매칭
- [ ] `GET /webhook/class-api?action=getClasses&sort=price_asc` -- 가격 오름차순 정렬
- [ ] `GET /webhook/class-api?action=getClasses&sort=popular` -- 인기순 정렬
- [ ] `GET /webhook/class-api?action=getClasses&page=2&limit=5` -- 페이지네이션 동작
- [ ] `GET /webhook/class-api?action=getClasses` -- pagination 필드 (page, limit, totalCount, totalPages)
- [ ] `GET /webhook/class-api?action=getClasses` -- partner_name 조인 확인
- [ ] `GET /webhook/class-api?action=getClassDetail&id=CLS_001` -- 상세 데이터 전체 필드
- [ ] `GET /webhook/class-api?action=getClassDetail&id=CLS_001` -- curriculum JSON 파싱
- [ ] `GET /webhook/class-api?action=getClassDetail&id=CLS_001` -- images 배열 변환
- [ ] `GET /webhook/class-api?action=getClassDetail&id=CLS_001` -- schedules JSON 파싱
- [ ] `GET /webhook/class-api?action=getClassDetail&id=CLS_001` -- partner 공개 정보 포함
- [ ] `GET /webhook/class-api?action=getClassDetail` -- id 미입력 시 MISSING_PARAMS 에러
- [ ] `GET /webhook/class-api?action=getClassDetail&id=INVALID` -- CLASS_NOT_FOUND 에러
- [ ] `GET /webhook/class-api?action=getCategories` -- 카테고리 목록 + 건수
- [ ] `GET /webhook/class-api?action=getCategories` -- 건수 내림차순 정렬
- [ ] `GET /webhook/class-api?action=unknown` -- INVALID_ACTION 에러

### WF-02: Partner Auth API

- [ ] `GET /webhook/partner-auth?action=getPartnerAuth&member_id=jihoo5755` -- 파트너 정보 반환
- [ ] `GET /webhook/partner-auth?action=getPartnerAuth&member_id=NON_EXIST` -- is_partner: false
- [ ] `GET /webhook/partner-auth?action=getPartnerAuth` -- member_id 미입력 시 NOT_LOGGED_IN
- [ ] `GET /webhook/partner-auth?action=getPartnerAuth&member_id=PENDING_USER` -- 신청 상태 반환
- [ ] `GET /webhook/partner-auth?action=getPartnerDashboard&member_id=jihoo5755` -- 대시보드 데이터
- [ ] `GET /webhook/partner-auth?action=getPartnerDashboard&member_id=jihoo5755&month=2026-02` -- 월별 필터
- [ ] `GET /webhook/partner-auth?action=getPartnerDashboard` -- NOT_LOGGED_IN 에러
- [ ] `GET /webhook/partner-auth?action=getPartnerDashboard&member_id=NON_PARTNER` -- NOT_PARTNER
- [ ] `GET /webhook/partner-auth?action=getPartnerDashboard&member_id=INACTIVE` -- PARTNER_INACTIVE
- [ ] `GET /webhook/partner-auth?action=getPartnerDashboard` -- 클래스 목록 포함
- [ ] `GET /webhook/partner-auth?action=getPartnerDashboard` -- 정산 집계 (revenue, commission, reserve)
- [ ] `GET /webhook/partner-auth?action=getPartnerApplicationStatus&member_id=xxx` -- 이미 파트너인 경우
- [ ] `GET /webhook/partner-auth?action=getPartnerApplicationStatus&member_id=yyy` -- PENDING 신청
- [ ] `GET /webhook/partner-auth?action=getPartnerApplicationStatus&member_id=zzz` -- 신청 이력 없음
- [ ] `GET /webhook/partner-auth?action=getEducationStatus&member_id=jihoo5755` -- 교육 이수 상태
- [ ] `GET /webhook/partner-auth?action=getEducationStatus&member_id=NON_PARTNER` -- is_partner: false
- [ ] `GET /webhook/partner-auth?action=getEducationStatus` -- NOT_LOGGED_IN
- [ ] education_completed 정규화 (true/TRUE/Y -> 'Y')

### WF-03: Partner Data API

- [ ] `GET /webhook/partner-data?action=getPartnerBookings&member_id=jihoo5755` -- 예약 목록
- [ ] `GET /webhook/partner-data?action=getPartnerBookings&member_id=jihoo5755&class_id=CLS_001` -- 클래스 필터
- [ ] `GET /webhook/partner-data?action=getPartnerBookings&member_id=jihoo5755&date_from=2026-02-01&date_to=2026-02-28` -- 기간 필터
- [ ] 수강생 이름 마스킹: 홍길동 -> 홍**
- [ ] 수강생 이메일 마스킹: user@gmail.com -> use***@gmail.com
- [ ] 수강생 전화번호 마스킹: 010-1234-5678 -> 010-****-5678
- [ ] 날짜 형식 검증: date_from=invalid -> MISSING_PARAMS 에러
- [ ] 예약 summary (total_count, completed_count, pending_count, failed_count)
- [ ] 페이지네이션 (page, limit, total_count, total_pages)
- [ ] `GET /webhook/partner-data?action=getPartnerReviews&member_id=jihoo5755` -- 후기 목록
- [ ] `GET /webhook/partner-data?action=getPartnerReviews&member_id=jihoo5755&class_id=CLS_001` -- 클래스 필터
- [ ] 후기 summary.rating_distribution 계산
- [ ] 후기 summary.avg_rating 소수 1자리
- [ ] 후기 summary.answered_count / unanswered_count
- [ ] reviewer_name 마스킹: 홍길동 -> 홍**
- [ ] `GET /webhook/partner-data?action=getPartnerBookings` -- NOT_LOGGED_IN
- [ ] `GET /webhook/partner-data?action=getPartnerBookings&member_id=NON_PARTNER` -- NOT_PARTNER
- [ ] `GET /webhook/partner-data?action=getPartnerBookings&member_id=INACTIVE` -- PARTNER_INACTIVE

### 공통

- [ ] 모든 응답이 `{ success, data/error, timestamp }` 형식인지 확인
- [ ] CORS: `https://foreverlove.co.kr`에서 fetch 호출 시 정상 응답
- [ ] n8n Execution 로그에서 각 노드의 입출력 데이터 확인
- [ ] NocoDB 테이블에 테스트 데이터 3~5건 입력 후 워크플로우 테스트
- [ ] 응답 속도 200~500ms 이내 (n8n 서버 -> NocoDB 로컬 통신)

---

## 다음 단계 (Task 211 이후)

- **Task 212**: WF-04 Record Booking + WF-05 Order Polling (쓰기 + 스케줄 워크플로우)
- **Task 213**: WF-06~10 관리 + POST 워크플로우
- **Task 214**: WF-11~13 스케줄 워크플로우 (리마인더, 후기, 등급)
- 프론트엔드 URL 교체: `GAS_URL` -> n8n Webhook URL (3줄 변경)
