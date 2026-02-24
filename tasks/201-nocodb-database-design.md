# Task 201: NocoDB 설치 + 데이터베이스 설계 가이드

> **버전**: Phase 2 v2.1 (n8n + NocoDB)
> **작성일**: 2026-02-25
> **의존성**: 없음 (Phase 1.5 검증 결과 참조)
> **참조 문서**: `docs/phase2/n8n-airtable-migration-architecture.md` 3장
> **담당 에이전트**: `gas-backend-expert`, `makeshop-planning-expert`, `qa-test-expert`

---

## 개요

기존 Google Sheets 8시트 구조를 NocoDB 8개 테이블로 전환합니다.
Oracle Cloud ARM 서버 (158.180.77.201)에 NocoDB를 Docker로 설치하고, n8n과 동일 서버에서 운영합니다.

> **플랜**: NocoDB Community Edition (오픈소스, 무료) — 무제한 레코드, 무제한 API 호출, Sustainable Use License (내부 사용 = 영구 무료)

---

## 0. NocoDB Docker 설치

### 사전 조건

- Oracle Cloud ARM 서버에 Docker + Docker Compose 설치된 상태 (n8n과 동일 서버)
- 도메인: `nocodb.pressco21.com` → Nginx 리버스 프록시 설정 필요

### Docker Compose 설치 (권장)

```bash
# 서버 접속
ssh ubuntu@158.180.77.201

# NocoDB 디렉토리 생성
mkdir -p ~/nocodb && cd ~/nocodb

# docker-compose.yml 생성
cat > docker-compose.yml << 'EOF'
version: '3'

services:
  nocodb:
    image: nocodb/nocodb:latest
    container_name: nocodb
    ports:
      - "8080:8080"
    environment:
      - NC_DB=pg://localhost:5432?u=postgres&p=YOUR_PG_PASSWORD&d=nocodb
      # n8n이 이미 PostgreSQL을 사용 중이라면 동일 DB 서버를 활용할 수 있습니다.
      # 별도 SQLite 사용 시 아래처럼 단순화:
      # (NC_DB를 비워두면 /usr/app/data/noco.db SQLite 자동 사용)
    volumes:
      - nocodb_data:/usr/app/data
    restart: unless-stopped

volumes:
  nocodb_data:
EOF
```

> **간단 설치 옵션**: PostgreSQL 연동이 복잡하면 SQLite 모드로 시작:
> ```yaml
> environment: []  # NC_DB 제거 → SQLite 자동 사용
> ```

```bash
# NocoDB 시작
docker-compose up -d

# 실행 확인
docker ps | grep nocodb
# 로그 확인
docker logs nocodb
```

### Nginx 리버스 프록시 설정

`/etc/nginx/sites-available/nocodb` 파일 생성:

```nginx
server {
    listen 80;
    server_name nocodb.pressco21.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name nocodb.pressco21.com;

    ssl_certificate /etc/letsencrypt/live/nocodb.pressco21.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nocodb.pressco21.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
# Nginx 설정 활성화
sudo ln -s /etc/nginx/sites-available/nocodb /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL 인증서 발급 (Let's Encrypt)
sudo certbot --nginx -d nocodb.pressco21.com
```

### NocoDB 초기 계정 설정

1. `https://nocodb.pressco21.com` 접속
2. 최초 접속 시 관리자 계정 이메일/비밀번호 설정
3. "New Project" 클릭 → 프로젝트명: `PRESSCO21`
4. 프로젝트 생성 후 API Token 발급: Project Settings → Team & Auth → API Tokens → Add Token (이름: `n8n-integration`)

---

## 1. 테이블 생성 순서 (의존성 고려)

1. `tbl_Partners` (파트너 상세) — 다른 테이블들이 참조하는 루트
2. `tbl_Classes` (클래스 메타) — tbl_Partners 링크
3. `tbl_Applications` (파트너 신청) — 독립
4. `tbl_Settlements` (정산 내역) — tbl_Partners + tbl_Classes 링크
5. `tbl_Reviews` (후기) — tbl_Classes + tbl_Partners 링크
6. `tbl_PollLogs` (주문 처리 로그) — 독립
7. `tbl_EmailLogs` (이메일 발송 로그) — 독립
8. `tbl_Settings` (시스템 설정) — 독립

---

## 2. tbl_Partners (파트너 상세)

**역할**: 승인된 파트너 강사 정보 저장. 전체 시스템의 루트 테이블.

### 필드 목록

| 순서 | 필드명 | NocoDB 타입 | 설정값 | 기존 Sheets 컬럼 |
|------|--------|------------|-------|----------------|
| 1 | partner_code | Single line text | PK 역할, 형식: PC_YYYYMM_NNN | A |
| 2 | member_id | Single line text | Unique (n8n에서 중복 체크) | B |
| 3 | partner_name | Single line text | 공방명 | C |
| 4 | grade | Single select | 선택지: SILVER, GOLD, PLATINUM | D |
| 5 | email | Email | | E |
| 6 | phone | Phone number | | F |
| 7 | location | Single line text | 예: 서울 강남, 경기 성남 | G |
| 8 | commission_rate | Decimal | 소수점 2자리 (예: 0.10 = 10%) | H |
| 9 | reserve_rate | Decimal | 소수점 2자리 (예: 1.0 = 100%) | I |
| 10 | class_count | Number | Integer | J |
| 11 | avg_rating | Decimal | 소수점 1자리 | K |
| 12 | education_completed | Checkbox | 기본값: false | L |
| 13 | education_date | Date | Format: YYYY-MM-DD | (신규) |
| 14 | education_score | Number | Integer | (신규) |
| 15 | portfolio_url | URL | | M |
| 16 | instagram_url | URL | | N |
| 17 | partner_map_id | Single line text | 파트너맵 연동 ID | O |
| 18 | approved_date | Date | Format: YYYY-MM-DD | P |
| 19 | status | Single select | 선택지: active, inactive, suspended | Q |
| 20 | notes | Long text | | R |
| 21 | created_at | Created Time | NocoDB 자동 | (자동) |
| 22 | updated_at | Last Modified Time | NocoDB 자동 | (자동) |

### grade Single Select 색상 설정
- SILVER: 회색
- GOLD: 노랑
- PLATINUM: 파랑

### status Single Select 색상 설정
- active: 초록
- inactive: 회색
- suspended: 빨강

### 뷰 설계

| 뷰 이름 | 필터 | 정렬 | 용도 |
|--------|------|------|------|
| 활성 파트너 | status = active | partner_code ASC | 기본 운영 뷰 |
| 등급별 보기 | 없음 | grade 그룹핑 | 등급 현황 파악 |
| 교육 미이수 | education_completed = false, status = active | partner_name ASC | 교육 독촉 |
| GOLD 승급 후보 | grade = SILVER, class_count >= 6 | class_count DESC | 승급 모니터링 |
| PLATINUM 승급 후보 | grade = GOLD, class_count >= 25 | class_count DESC | 승급 모니터링 |

---

## 3. tbl_Classes (클래스 메타)

**역할**: 파트너가 개설한 클래스 정보 저장. 메이크샵 상품과 1:1 매핑.

### 필드 목록

| 순서 | 필드명 | NocoDB 타입 | 설정값 | 기존 Sheets 컬럼 |
|------|--------|------------|-------|----------------|
| 1 | class_id | Single line text | PK, 형식: CLS_XXXXXX | A |
| 2 | makeshop_product_id | Single line text | 메이크샵 branduid | B |
| 3 | partner_code | Links | → tbl_Partners 연결 | C |
| 4 | class_name | Single line text | | D |
| 5 | category | Single select | 압화, 레진, 캔들, 석고, 비즈, 기타 | E |
| 6 | level | Single select | beginner, intermediate, advanced | F |
| 7 | price | Currency | KRW | G |
| 8 | duration_min | Number | Integer (수업 시간, 분 단위) | H |
| 9 | max_students | Number | Integer | I |
| 10 | description | Long text | | J |
| 11 | curriculum_json | Long text | JSON 문자열 저장 | K |
| 12 | schedules_json | Long text | JSON 문자열 (날짜/시간 목록) | (신규) |
| 13 | instructor_bio | Long text | | L |
| 14 | thumbnail_url | URL | | M |
| 15 | image_urls | Long text | 콤마(,) 구분 URL 목록 | N |
| 16 | youtube_video_id | Single line text | 유튜브 영상 ID만 (URL 전체 아님) | O |
| 17 | location | Single line text | 예: 서울 강남구 역삼동 | P |
| 18 | materials_included | Single line text | 포함/별도/불포함 | Q |
| 19 | materials_price | Currency | KRW, 재료비 별도 금액 | (신규) |
| 20 | materials_product_ids | Single line text | 콤마 구분 branduid | R |
| 21 | tags | Multi Select | | S |
| 22 | type | Single select | 원데이, 정기, 온라인 | (신규) |
| 23 | status | Single select | active, paused, closed, INACTIVE | T |
| 24 | created_date | Date | Format: YYYY-MM-DD | U |
| 25 | class_count | Number | 수강 건수, Integer | V |
| 26 | avg_rating | Decimal | 평균 평점, 소수점 1자리 | W |

### 뷰 설계

| 뷰 이름 | 필터 | 정렬 | 용도 |
|--------|------|------|------|
| 공개 클래스 | status = active | created_date DESC | n8n API 기본 조회 |
| 카테고리별 | status = active | category 그룹핑 | 카테고리 현황 |
| 파트너별 강의 | 없음 | partner_code 그룹핑 | 파트너 대시보드 |
| 비활성/종료 | status != active | status 그룹핑 | 관리 목적 |

---

## 4. tbl_Applications (파트너 신청)

**역할**: 파트너 가입 신청서. 관리자가 심사 후 승인/반려 처리.

### 필드 목록

| 순서 | 필드명 | NocoDB 타입 | 설정값 | 기존 Sheets 컬럼 |
|------|--------|------------|-------|----------------|
| 1 | application_id | Single line text | PK, 형식: APP_YYYYMMDD_XXXXXX | A |
| 2 | member_id | Single line text | 메이크샵 회원 ID | B |
| 3 | applicant_name | Single line text | | C |
| 4 | workshop_name | Single line text | 공방명 | D |
| 5 | email | Email | | E |
| 6 | phone | Phone number | | F |
| 7 | location | Single line text | | G |
| 8 | specialty | Single select | 압화, 레진, 캔들, 석고, 비즈, 기타 | H |
| 9 | portfolio_url | URL | 포트폴리오 링크 | I |
| 10 | instagram_url | URL | 인스타그램 링크 | J |
| 11 | introduction | Long text | 자기소개 및 신청 사유 | K |
| 12 | status | Single select | PENDING, APPROVED, REJECTED | L |
| 13 | applied_date | Created Time | NocoDB 자동 | M |
| 14 | reviewed_date | Date | Format: YYYY-MM-DD | N |
| 15 | reviewer_note | Long text | 관리자 검토 메모 | O |

### status Single Select 색상 설정
- PENDING: 노랑 (심사 대기)
- APPROVED: 초록 (승인)
- REJECTED: 빨강 (반려)

### 뷰 설계

| 뷰 이름 | 필터 | 정렬 | 용도 |
|--------|------|------|------|
| 심사 대기 | status = PENDING | applied_date ASC | **관리자 기본 뷰** (먼저 신청한 순) |
| 승인 완료 | status = APPROVED | reviewed_date DESC | 승인 이력 |
| 반려 | status = REJECTED | reviewed_date DESC | 반려 이력 |
| 갤러리 뷰 | status = PENDING | applied_date ASC | portfolio_url 이미지 미리보기 |

> 갤러리 뷰: NocoDB에서 "+" → "Gallery" 선택. Cover image 필드를 portfolio_url로 설정하면 이미지 카드 형태 미리보기 가능.

---

## 5. tbl_Settlements (정산 내역)

**역할**: 예약/결제 발생 시 생성. 수수료 계산, 적립금 지급, 리마인더/후기 발송 이력 포함.

### 필드 목록

| 순서 | 필드명 | NocoDB 타입 | 설정값 | 기존 Sheets 컬럼 |
|------|--------|------------|-------|----------------|
| 1 | settlement_id | Single line text | PK, 형식: STL_YYYYMMDD_XXXXXX | A |
| 2 | order_id | Single line text | 메이크샵 주문번호 | B |
| 3 | partner_code | Links | → tbl_Partners 연결 | C |
| 4 | class_id | Links | → tbl_Classes 연결 | D |
| 5 | member_id | Single line text | 수강생 회원 ID | E |
| 6 | order_amount | Currency | KRW | F |
| 7 | commission_rate | Decimal | 소수점 2자리 | G |
| 8 | commission_amount | Currency | KRW | H |
| 9 | reserve_rate | Decimal | 소수점 2자리 | I |
| 10 | reserve_amount | Currency | KRW | J |
| 11 | class_date | Date | Format: YYYY-MM-DD (수업 일시) | K |
| 12 | settlement_due_date | Date | class_date + 3일 (D+3 정산 기준) | (신규) |
| 13 | student_count | Number | Integer (수강 인원) | L |
| 14 | status | Single select | PENDING, PENDING_SETTLEMENT, PROCESSING, COMPLETED, FAILED, SELF_PURCHASE | M |
| 15 | reserve_paid_date | Date | 실제 적립금 지급일 | N |
| 16 | reserve_api_response | Long text | 적립금 API 응답 JSON | O |
| 17 | error_message | Long text | 에러 메시지 | P |
| 18 | student_email_sent | Single line text | D3_SENT, D1_SENT, REVIEW_SENT 조합 | Q |
| 19 | partner_email_sent | Single line text | BOOKING_SENT, D3_SENT, D1_SENT 조합 | R |
| 20 | created_date | Created Time | NocoDB 자동 | S |
| 21 | completed_date | Date | Format: YYYY-MM-DD | T |
| 22 | student_name | Single line text | 수강생 이름 | U |
| 23 | student_email | Email | 수강생 이메일 | V |
| 24 | student_phone | Phone number | 수강생 전화번호 | W |
| 25 | retry_count | Number | Integer, 기본값: 0 (실패 정산 재시도 횟수) | (신규, 기존: error_message에 포함) |

### status Single Select 색상 설정
- PENDING: 회색 (초기 생성)
- PENDING_SETTLEMENT: 노랑 (수업 완료, D+3 대기 중)
- PROCESSING: 파랑 (적립금 처리 중)
- COMPLETED: 초록 (정산 완료)
- FAILED: 빨강 (실패, 재시도 필요)
- SELF_PURCHASE: 보라 (자기 결제 감지)

### 뷰 설계

| 뷰 이름 | 필터 | 정렬 | 용도 |
|--------|------|------|------|
| 대기 중 정산 | status = PENDING_SETTLEMENT | settlement_due_date ASC | D+3 만기 모니터링 |
| 실패 정산 | status = FAILED | retry_count ASC | 재시도 우선순위 |
| 최대 재시도 초과 | status = FAILED, retry_count >= 5 | created_date ASC | 수동 처리 필요 |
| 월별 완료 | status = COMPLETED | class_date DESC (월별 그룹핑) | 월별 정산 현황 |
| 파트너별 정산 | status = COMPLETED | partner_code 그룹핑 | 수수료 합산 |
| 리마인더 미발송 | status = PENDING_SETTLEMENT, class_date 3일~1일 전 | class_date ASC | 리마인더 대상 확인 |

---

## 6. tbl_Reviews (후기)

**역할**: 수강생이 작성한 클래스 후기. 파트너 답변 포함.

### 필드 목록

| 순서 | 필드명 | NocoDB 타입 | 설정값 | 기존 Sheets 컬럼 |
|------|--------|------------|-------|----------------|
| 1 | review_id | Single line text | PK, 형식: REV_XXXXXX | A |
| 2 | class_id | Links | → tbl_Classes 연결 | B |
| 3 | member_id | Single line text | 수강생 회원 ID | C |
| 4 | reviewer_name | Single line text | 수강생 이름 | D |
| 5 | rating | Rating | 5-star | E |
| 6 | content | Long text | 후기 본문 | F |
| 7 | image_urls | Long text | 콤마 구분 URL 목록 | G |
| 8 | created_at | Created Time | NocoDB 자동 | H |
| 9 | partner_code | Links | → tbl_Partners 연결 | I |
| 10 | partner_answer | Long text | 파트너 답변 | J |
| 11 | answer_at | Date | Format: YYYY-MM-DD | K |

### 뷰 설계

| 뷰 이름 | 필터 | 정렬 | 용도 |
|--------|------|------|------|
| 최근 후기 | 없음 | created_at DESC | 신규 후기 확인 |
| 미답변 후기 | partner_answer = null | created_at ASC | 파트너 답변 촉구 |
| 별점별 보기 | 없음 | rating 그룹핑 | 별점 분포 확인 |
| 사진 후기 | image_urls != null | created_at DESC | 마케팅 소재용 |
| 저평점 후기 | rating <= 3 | created_at DESC | 품질 모니터링 |

---

## 7. tbl_PollLogs (주문 처리 로그)

**역할**: n8n WF-05 주문 폴링 실행 이력. 10분마다 자동 기록.

### 필드 목록

| 순서 | 필드명 | NocoDB 타입 | 설정값 |
|------|--------|------------|-------|
| 1 | poll_time | Created Time | NocoDB 자동 |
| 2 | orders_found | Number | Integer |
| 3 | orders_processed | Number | Integer |
| 4 | errors | Long text | 에러 상세 |
| 5 | duration_ms | Number | Integer (처리 시간, 밀리초) |
| 6 | source | Single select | schedule, manual |

### 뷰 설계

| 뷰 이름 | 필터 | 정렬 | 용도 |
|--------|------|------|------|
| 최근 폴링 | 없음 | poll_time DESC | 최근 실행 이력 (기본 50건) |
| 에러 발생 건 | errors != null | poll_time DESC | 에러 이력 확인 |

---

## 8. tbl_EmailLogs (이메일 발송 로그)

**역할**: n8n에서 발송한 이메일 이력 추적.

### 필드 목록

| 순서 | 필드명 | NocoDB 타입 | 설정값 |
|------|--------|------------|-------|
| 1 | recipient | Email | 수신자 이메일 |
| 2 | email_type | Single select | BOOKING_CONFIRM, PARTNER_NOTIFY, REMINDER_D3_STUDENT, REMINDER_D1_STUDENT, REMINDER_D3_PARTNER, REMINDER_D1_PARTNER, REVIEW_REQUEST_STUDENT, REVIEW_REQUEST_PARTNER, PARTNER_APPLY_CONFIRM, PARTNER_APPROVAL, GRADE_UPGRADE, EDUCATION_CERTIFICATE, EDUCATION_RETRY |
| 3 | status | Single select | SENT, FAILED |
| 4 | error_message | Long text | 실패 원인 |
| 5 | sent_at | Created Time | NocoDB 자동 |
| 6 | log_date | Formula | `DATE({sent_at})` — 날짜 추출 집계용 |

### 뷰 설계

| 뷰 이름 | 필터 | 정렬 | 용도 |
|--------|------|------|------|
| 오늘 발송 | log_date = TODAY() | sent_at DESC | 일일 발송 현황 |
| 실패 건 | status = FAILED | sent_at DESC | 발송 실패 모니터링 |
| 유형별 통계 | 없음 | email_type 그룹핑 | 이메일 유형별 통계 |

---

## 9. tbl_Settings (시스템 설정)

**역할**: n8n 워크플로우에서 참조하는 시스템 설정값. API 키는 저장하지 않고 n8n Credentials에 저장.

### 필드 목록

| 순서 | 필드명 | NocoDB 타입 | 설정값 |
|------|--------|------------|-------|
| 1 | key | Single line text | PK 역할 |
| 2 | value | Long text | 설정값 |
| 3 | updated_at | Last Modified Time | NocoDB 자동 |

### 초기 데이터 입력 (테이블 생성 후 수동 입력)

| key | value | 설명 |
|-----|-------|------|
| last_poll_time | 2026-01-01T00:00:00+09:00 | 주문 폴링 시작 기준 시각 (최초 설정) |
| class_category_id | (메이크샵 카테고리 번호) | 파트너 클래스 카테고리 코드 |
| admin_email | foreverloveflower@naver.com | 관리자 이메일 |
| admin_telegram_chat_id | (텔레그램 채팅 ID) | @Pressco21_makeshop_bot 관리자 채팅 ID |
| silver_commission_rate | 0.10 | SILVER 수수료율 |
| gold_commission_rate | 0.12 | GOLD 수수료율 |
| platinum_commission_rate | 0.15 | PLATINUM 수수료율 |
| silver_reserve_rate | 1.0 | SILVER 적립금 비율 |
| gold_reserve_rate | 1.0 | GOLD 적립금 비율 |
| platinum_reserve_rate | 0.8 | PLATINUM 적립금 비율 |
| settlement_delay_days | 3 | D+N 정산 지연 일수 |

> ⚠️ 민감 정보(API 키, 앱 비밀번호)는 NocoDB에 저장하지 않고 n8n Credentials에 저장합니다.

---

## 10. Relations(Links) 설정 순서

NocoDB에서 Links 관계를 설정합니다. 아래 순서대로 설정해야 역방향 링크 필드가 올바르게 생성됩니다.

```
Step 1: tbl_Classes.partner_code -> tbl_Partners 연결 (Has Many)
  -> tbl_Partners에 "tbl_Classes" 역방향 링크 필드 자동 생성

Step 2: tbl_Settlements.partner_code -> tbl_Partners 연결 (Has Many)
  -> tbl_Partners에 "tbl_Settlements" 역방향 링크 필드 자동 생성

Step 3: tbl_Settlements.class_id -> tbl_Classes 연결 (Has Many)
  -> tbl_Classes에 "tbl_Settlements" 역방향 링크 필드 자동 생성

Step 4: tbl_Reviews.class_id -> tbl_Classes 연결 (Has Many)
  -> tbl_Classes에 "tbl_Reviews" 역방향 링크 필드 자동 생성

Step 5: tbl_Reviews.partner_code -> tbl_Partners 연결 (Has Many)
  -> tbl_Partners에 "tbl_Reviews" 역방향 링크 필드 자동 생성
```

### 관계도

```
tbl_Partners (파트너 상세)
    |
    |-- 1:N --> tbl_Classes (클래스 메타)
    |               |
    |               |-- 1:N --> tbl_Reviews (후기)
    |               |
    |               |-- 1:N --> tbl_Settlements (정산 내역)
    |
    |-- 1:N --> tbl_Applications (파트너 신청) [단방향]
    |
    |-- 1:N --> tbl_Settlements (정산 내역)
    |
    |-- 1:N --> tbl_Reviews (후기)
```

---

## 11. n8n에서 NocoDB 연동 시 주의사항

### Project ID 및 Table Name 확인

```
NocoDB API URL 구조:
https://nocodb.pressco21.com/api/v1/db/data/noco/{projectId}/{tableId}
                                                  ^^^^^^^^^^^  ^^^^^^^
                                                  Project ID   Table Name or Table ID
```

n8n NocoDB 노드에서:
- Connection Type: NocoDB (전용 노드 사용, Credentials에 `xc-token` 등록 필요)
- Operation: List, Create, Update, Delete, Get

### NocoDB API where 파라미터 예시

```javascript
// 활성 파트너 조회
where=(status,eq,active)

// D+3 정산 대상 조회 (PENDING_SETTLEMENT 상태 + 만기일 이전)
where=(status,eq,PENDING_SETTLEMENT)~and(settlement_due_date,lte,2026-02-28)

// 리마인더 D-3 대상 조회 (3일 후 수업 + D3_SENT 미포함)
where=(status,eq,PENDING_SETTLEMENT)~and(class_date,eq,2026-03-03)~and(student_email_sent,nlike,%25D3_SENT%25)

// 후기 요청 대상 조회 (7일 전 수업 + REVIEW_SENT 미포함)
where=(status,eq,COMPLETED)~and(class_date,eq,2026-02-18)~and(student_email_sent,nlike,%25REVIEW_SENT%25)
```

> NocoDB API 연산자: `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `like`, `nlike`, `null`, `notnull`
> 복합 조건: `~and`, `~or`

---

## 12. 완료 체크리스트

### NocoDB 설치

- [ ] Oracle Cloud 서버에 NocoDB Docker 컨테이너 실행 (`docker ps` 확인)
- [ ] `nocodb.pressco21.com` Nginx 리버스 프록시 설정 + SSL 인증서 발급
- [ ] `https://nocodb.pressco21.com` 접속 가능 확인
- [ ] 관리자 계정 생성 (이메일/비밀번호)
- [ ] 프로젝트명 `PRESSCO21` 생성
- [ ] API Token 발급 (이름: `n8n-integration`) → 16자리 이상 토큰 복사

### 테이블 생성 (8개)

- [ ] tbl_Partners — 22개 필드 + 5개 뷰
- [ ] tbl_Classes — 26개 필드 + 4개 뷰
- [ ] tbl_Applications — 15개 필드 + 4개 뷰
- [ ] tbl_Settlements — 25개 필드 + 6개 뷰
- [ ] tbl_Reviews — 11개 필드 + 5개 뷰
- [ ] tbl_PollLogs — 6개 필드 + 2개 뷰
- [ ] tbl_EmailLogs — 6개 필드 + 3개 뷰
- [ ] tbl_Settings — 3개 필드

### Links(Relations) 설정

- [ ] tbl_Classes.partner_code -> tbl_Partners 연결
- [ ] tbl_Settlements.partner_code -> tbl_Partners 연결
- [ ] tbl_Settlements.class_id -> tbl_Classes 연결
- [ ] tbl_Reviews.class_id -> tbl_Classes 연결
- [ ] tbl_Reviews.partner_code -> tbl_Partners 연결

### 초기 데이터

- [ ] tbl_Settings 초기 데이터 11개 키 입력
- [ ] 메이크샵 카테고리 번호 확인 후 class_category_id 입력
- [ ] 텔레그램 관리자 채팅 ID 확인 후 admin_telegram_chat_id 입력

### n8n 연동 준비

- [ ] NocoDB API Token 복사 → Task 202 Credential 등록에서 사용
- [ ] Project ID 확인 (NocoDB URL에서 확인)
- [ ] 각 테이블의 Table ID 확인 (NocoDB URL에서 `md_...` 또는 테이블명으로 확인)

### 검증

- [ ] tbl_Classes.partner_code에 tbl_Partners 레코드 연결 테스트
- [ ] tbl_Settlements에 테스트 레코드 생성 후 파트너/클래스 Links 확인
- [ ] NocoDB API 직접 호출 테스트: `curl -H "xc-token: YOUR_TOKEN" https://nocodb.pressco21.com/api/v1/db/data/noco/{projectId}/tbl_Settings`
- [ ] "심사 대기" 뷰에 PENDING 신청 레코드 필터링 확인

---

## 참고: 기존 GAS Sheets와의 필드 차이 요약

| 항목 | GAS Sheets | NocoDB |
|-----|-----------|--------|
| 등급 필드 | 문자열 (입력 오류 가능) | Single Select (드롭다운, 실수 방지) |
| 날짜 필드 | 문자열 (형식 불일치 위험) | Date 타입 (달력 UI, 자동 포맷) |
| 화폐 필드 | 숫자 (단위 표시 없음) | Currency KRW (₩1,000 형식 표시) |
| 체크박스 필드 | "true"/"false" 문자열 | Checkbox (클릭 토글) |
| 별점 필드 | 숫자 1~5 | Rating 필드 (별모양 UI) |
| 관계 필드 | 텍스트 ID 수동 참조 | Links (클릭 → 레코드 이동) |
| 집계 | SUMIF/COUNTIF 수동 작성 | Rollup 필드 자동 계산 |
| retry_count | error_message에 "retry:N|" 패턴 | Number 필드 (필터링/정렬 가능) |
| created_at | 수동 기록 | Created Time 자동 |
| updated_at | 수동 기록 | Last Modified Time 자동 |
| API 인증 | GAS 배포 URL (공개) | xc-token 헤더 (비공개) |
| API 호출 한도 | 없음 (서버 timeout 위험) | 무제한 (자체 서버) |
