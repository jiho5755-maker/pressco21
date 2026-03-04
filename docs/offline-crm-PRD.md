# PRESSCO21 Offline CRM 고도화 PRD

## 문서 정보

| 항목 | 내용 |
|------|------|
| 프로젝트 | Offline CRM 고도화 (Phase 5~11) |
| 작성일 | 2026-03-04 |
| 작성자 | prd-generator (PM 산하) |
| 검토자 | prd-validator |
| 대상 경로 | `/Users/jangjiho/workspace/pressco21/offline-crm/` |
| 상태 | DRAFT |

---

## 1. 프로젝트 개요

### 1-1. 배경

PRESSCO21은 꽃 공예 전문 회사로, 오프라인 B2B 거래(학교, 문화센터, 협회, 학원 등)가 매출의 상당 부분을 차지합니다. 기존에 사용하던 '얼마에요' 프로그램에서 약 10만건의 거래내역과 19,890건의 고객·품목 데이터가 누적되어 있으며, 이를 신규 자체 CRM으로 완전 이전하여 데이터 기반 영업 의사결정을 가능하게 하는 것이 본 프로젝트의 핵심 목표입니다.

### 1-2. 목적

- 레거시 '얼마에요' 데이터 전량 마이그레이션으로 거래 이력의 단일 진실 공급원(Single Source of Truth) 확보
- 미수금 관리 고도화로 현금흐름 가시성 향상
- Chart.js 기반 대시보드로 주요 KPI를 한 화면에서 파악
- 고객 세분화(VIP 등급)를 통한 타겟 영업 지원
- 세무사 제출용 자료 등 엑셀 내보내기로 업무 효율화

### 1-3. 기술 스택

| 레이어 | 기술 | 비고 |
|--------|------|------|
| 프론트엔드 | Vanilla HTML/CSS/JS (IIFE 패턴) | 빌드 도구 없음 |
| 스타일 | CSS 변수 + 브랜드 컬러 (`#7d9675`) | 기존 디자인 시스템 유지 |
| 차트 | Chart.js (CDN) | v4.x |
| 엑셀 | SheetJS (CDN) | XLSX 라이브러리 |
| 백엔드 | NocoDB (self-hosted) | nocodb.pressco21.com |
| 데이터베이스 | SQLite (NocoDB 내장) | Docker exec 직접 접근 가능 |
| 마이그레이션 | Python 3 + xlrd + requests | 기존 스크립트 고도화 |

---

## 2. 현재 상태

### 2-1. 구현 완료 (Phase 1~4)

| 기능 | 상태 | 파일 |
|------|------|------|
| 거래처 CRUD (customers) | 완료 | app.js |
| 제품 CRUD (products) | 완료 | app.js |
| 거래명세표 발행/인쇄 (invoices + items) | 완료 | app.js |
| 공급처 CRUD (suppliers) | 완료 | app.js |
| 캘린더 (일정 표시) | 완료 | app.js |
| 매출 리포트 기본 | 완료 | app.js |
| 자동완성 거래처 검색 | 완료 | app.js |
| 다중 주소 관리 | 완료 | app.js |
| 이등분 인쇄 (A4 절취선) | 완료 | app.js |
| Pretendard 폰트 + 브랜드 컬러 | 완료 | index.html |

### 2-2. 미구현 (이번 PRD 대상)

| 기능 | Phase | 우선순위 |
|------|-------|---------|
| 거래내역 10만건 마이그레이션 | Phase 1 | P0 (전제 조건) |
| 고객 유형/상태 필드 (customer_type, customer_status) | Phase 1 | P0 |
| 고객 상세 페이지 (히스토리 탭, 차트 탭) | Phase 2 | P1 |
| 기간별 거래내역 조회 | Phase 2 | P1 |
| 대시보드 KPI 8개 + Chart.js | Phase 3 | P1 |
| 미수금 관리 (invoices 상태 확장, 부분 입금) | Phase 4 | P1 |
| 엑셀 내보내기 (SheetJS) | Phase 5 | P2 |
| VIP 등급 체계 (VVIP/VIP/GOLD/REGULAR) | Phase 6 | P2 |
| NocoDB 인덱스 + API 토큰 분리 | Phase 7 | P3 |

### 2-3. NocoDB 테이블 현황

```
현재 테이블:
- customers       (mffgxkftaeppyk0)  — 기본 거래처
- products        (mioztktmluobmmo)  — 품목대장
- invoices        (ml81i9mcuw0pjzk)  — 거래명세표
- items           (mxwgdlj56p9joxo)  — 명세표 라인아이템
- suppliers (tbl_Suppliers) (mw6y9qyzex7lix9)

신규 생성 필요:
- tbl_tx_history  (mqeg73wr7xzi1k3)  — 거래내역 10만건
- tbl_payments    (신규 생성)         — 입금 기록
```

---

## 3. Phase별 상세 요구사항

---

### Phase 1: 데이터 마이그레이션

**[담당: data-integrity-expert]** (주관)
**[협업: gas-backend-expert]** (Python 스크립트 작성)
**[협업: n8n-debugger]** (NocoDB 연동 오류 디버깅)
**예상 소요**: 5~7일

---

#### Phase 1-A: 고객/거래처 병합 이전

**기능 명세**

| 항목 | 내용 |
|------|------|
| 소스1 | 얼마에요 거래처.xls (13,298건) |
| 소스2 | 고객리스트 전체자료.xls (6,592건) |
| 대상 테이블 | NocoDB customers |
| 중복 처리 | 사업자번호 또는 거래처명+전화번호 복합키로 중복 감지 → 기존 레코드 PATCH |

**customers 테이블 신규 필드 추가**

| 필드명 | 타입 | 유효값 | 설명 |
|--------|------|--------|------|
| `customer_type` | SingleLineText | INDIVIDUAL / SCHOOL_ELEM / SCHOOL_MID / SCHOOL_HIGH / SCHOOL_UNIV / CENTER / ASSOC / ACADEMY / ONLINE / OTHER | 고객 유형 |
| `customer_status` | SingleLineText | ACTIVE / DORMANT / CHURNED / ARCHIVED | 활성 상태 |
| `last_order_date` | Date | — | 최종 주문일 (파생) |
| `first_order_date` | Date | — | 최초 주문일 (파생) |
| `total_order_count` | Number | — | 총 주문 횟수 (파생) |
| `total_order_amount` | Number | — | 총 주문 금액 (파생) |
| `vat_policy` | SingleLineText | TAXABLE / EXEMPT | 과세/면세 여부 |
| `outstanding_balance` | Number | — | 미수금 잔액 (파생) |

**기술 구현**

```
scripts/import-얼마에요.py 고도화:
1. import_customers() 함수에서 소스1/소스2 순차 처리
2. 중복 감지: GET /customers?where=(business_no,eq,XXX) 먼저 조회
   - 존재하면 PATCH (기존 데이터 보완)
   - 없으면 POST
3. customer_type 자동 분류 로직:
   - 거래처명에 '초등학교'/'중학교'/'고등학교'/'대학교'/'대학' 포함 → 각 SCHOOL_*
   - '문화센터'/'센터' 포함 → CENTER
   - '협회'/'연합회' 포함 → ASSOC
   - '학원' 포함 → ACADEMY
   - 사업자번호 없고 이름만 → INDIVIDUAL
   - 나머지 → OTHER
4. 배치 삽입: batch_size=200, 요청 간 0.5초 sleep
5. 결과 리포트: 삽입/갱신/스킵 건수 출력
```

**수락 기준 (Acceptance Criteria)**

- [ ] 소스1 + 소스2 합산 기준 총 건수 대비 누락률 1% 이하
- [ ] customer_type 자동 분류 정확도 90% 이상 (샘플 100건 수동 검증)
- [ ] 중복 레코드 발생 0건 (사업자번호 기준)
- [ ] 마이그레이션 완료 후 CRM 고객 목록에서 거래처명 검색 정상 작동

---

#### Phase 1-B: 품목대장 이전

**[담당: data-integrity-expert]**

**기능 명세**

| 항목 | 내용 |
|------|------|
| 소스 | 얼마에요 품목대장.xls (3,010건) |
| 대상 테이블 | NocoDB products |
| 중복 처리 | 품목코드 또는 품목명 기준 중복 스킵 |

**기술 구현**

```
import_products() 함수 신규 작성:
- 품목코드, 품목명, 규격, 단위, 기준단가 매핑
- 기존 products 테이블 필드와 컬럼 매핑 확인 후 진행
- 배치 삽입: batch_size=500
```

**수락 기준**

- [ ] 3,010건 중 누락률 1% 이하
- [ ] CRM 품목 등록 폼에서 자동완성 정상 작동

---

#### Phase 1-C: 거래내역 전체 이전 (10만건)

**[담당: gas-backend-expert]** (주관, Python 스크립트)
**[협업: data-integrity-expert]** (검증)
**[협업: n8n-debugger]** (NocoDB 오류 대응)

**기능 명세**

신규 테이블 `tbl_tx_history` 스키마:

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `Id` | AutoNumber | PK |
| `tx_date` | Date | 거래일자 |
| `legacy_book_id` | SingleLineText | 얼마에요 원본 장부 ID |
| `customer_name` | SingleLineText | 거래처명 (비정규화, 빠른 조회용) |
| `customer_id` | Number | NocoDB customers.Id FK (있을 경우) |
| `tx_type` | SingleLineText | SALES / PURCHASE / RETURN / ADJUST |
| `amount` | Number | 공급가액 |
| `tax` | Number | 세액 |
| `total` | Number | 합계금액 |
| `memo` | LongText | 적요/비고 |
| `slip_no` | SingleLineText | 전표번호 |
| `debit_account` | SingleLineText | 차변 계정 |
| `credit_account` | SingleLineText | 대변 계정 |
| `ledger` | SingleLineText | 장부 구분 |
| `tx_year` | Number | 연도 (파티션 대용, 조회 필터용) |
| `CreatedAt` | DateTime | 자동 생성 |

**기술 구현**

```
import_tx_history() 함수 작성:
1. 얼마에요 거래내역 파일 목록 스캔 (연도별 분리 가능성 고려)
2. 각 행 파싱: excel_date_to_str() 활용
3. customer_id 매핑: customers 테이블 조회 캐시 딕셔너리 구축
   - {거래처명: customer_id} 사전 로드 (메모리 캐시)
4. tx_year = tx_date[:4] 파생 계산
5. 배치 삽입: batch_size=500, 요청 간 0.8초 sleep (Rate Limit 대응)
6. 오류 행 별도 파일(error_log.csv)에 기록
7. 진행률 출력: 1,000건마다 현황 출력

NocoDB tbl_tx_history 테이블 사전 생성 필요:
- Docker exec nocodb sh -c "sqlite3 /nocodb/data/noco.db"
- 또는 NocoDB UI에서 테이블 수동 생성 후 Table ID 확인
```

**수락 기준**

- [ ] 10만건 기준 누락률 0.5% 이하
- [ ] error_log.csv 생성 및 오류 원인 파악 가능
- [ ] 마이그레이션 소요 시간 2시간 이내 (배치 처리 성능)
- [ ] 연도별 건수 합계가 원본 얼마에요 장부 합계와 일치 (±5건 허용)

---

#### Phase 1-D: customers 파생 필드 산출

**[담당: gas-backend-expert]**
**[협업: accounting-specialist]** (비즈니스 로직 검증)

**기능 명세**

tbl_tx_history 전체 데이터 기반으로 customers 파생 필드 일괄 업데이트:

| 필드 | 계산 방법 |
|------|----------|
| `first_order_date` | MIN(tx_date) WHERE customer_id = N |
| `last_order_date` | MAX(tx_date) WHERE customer_id = N |
| `total_order_count` | COUNT(*) WHERE customer_id = N AND tx_type = 'SALES' |
| `total_order_amount` | SUM(amount) WHERE customer_id = N AND tx_type = 'SALES' |
| `customer_status` | last_order_date 기준: 1년 이내 → ACTIVE, 2년 이내 → DORMANT, 그 이상 → CHURNED |

**기술 구현**

```
update_customer_derived_fields() 함수:
1. tbl_tx_history 전량 로드 → Pandas DataFrame 변환
2. groupby(customer_id) 집계 → dict 구축
3. customers 테이블 순회하며 PATCH 업데이트
4. 배치 PATCH: 한 번에 1건씩 (NocoDB bulk PATCH 미지원)
5. 진행률: 100건마다 출력
```

**수락 기준**

- [ ] customers 테이블에서 last_order_date, total_order_amount 확인 가능
- [ ] customer_status 분포 결과 출력 (ACTIVE/DORMANT/CHURNED/ARCHIVED 비율)

---

### Phase 2: CRM UI 고도화

**[담당: partner-admin-developer]** (주관, 관리자 UI)
**[협업: makeshop-ui-ux-expert]** (UX 개선, 디자인 일관성)
**예상 소요**: 3일

---

#### Phase 2-A: 고객 상세 페이지

**기능 명세**

고객 목록에서 거래처 클릭 시 우측 슬라이드 패널 또는 모달로 상세 정보 표시.
탭 구조: [기본정보] [거래 히스토리] [매출 차트] [최근 명세표]

**[기본정보] 탭**

- 거래처명, 사업자번호, 대표자, 전화, 이메일
- customer_type 아이콘 배지 (학교/센터/협회 등 구분)
- customer_status 컬러 배지 (ACTIVE=초록, DORMANT=노랑, CHURNED=빨강)
- vat_policy 표시 (과세/면세)
- 총 주문 횟수, 총 주문 금액, 최초/최종 주문일 요약 카드

**[거래 히스토리] 탭**

- tbl_tx_history에서 해당 customer_id 기준 조회
- 연도 선택 드롭다운 (tx_year 기준)
- 테이블: tx_date, slip_no, memo, amount, tax, total
- 페이징: 50건씩, 이전/다음 버튼
- 합계 행: 하단에 기간 합계 표시

**[매출 차트] 탭**

- Chart.js Bar 차트: 연도별 월별 매출 추이 (해당 고객 한정)
- 연도 선택 드롭다운으로 년도 전환
- 데이터: tbl_tx_history groupBy tx_date[:7] (YYYY-MM)

**[최근 명세표] 탭**

- invoices 테이블에서 customer_id 기준 최근 10건 조회
- 컬럼: 발행일, 발행번호, 공급가액, 세액, 합계, 상태
- 명세표 클릭 시 해당 명세표 상세/인쇄 페이지로 이동

**기술 구현**

```javascript
// index.html 사이드바 메뉴에 이미 '고객관리' 항목 존재
// app.js에 showCustomerDetail(customerId) 함수 신규 추가

function showCustomerDetail(customerId) {
  // 1. customers 테이블에서 단건 조회
  // 2. 상세 모달 렌더링 (탭 구조)
  // 3. 기본정보 탭 즉시 렌더
  // 4. 다른 탭은 클릭 시 lazy load (NocoDB API 호출 최소화)
}

// 탭 전환 시 loadTxHistory(), loadSalesChart(), loadRecentInvoices() 호출
// Chart.js 인스턴스는 destroy() 후 재생성 (메모리 누수 방지)
```

**수락 기준**

- [ ] 고객 목록에서 거래처명 클릭 → 2초 이내 상세 패널 표시
- [ ] 거래 히스토리 탭: 해당 고객의 거래내역 50건 이상 정상 표시
- [ ] 매출 차트 탭: 연도 변경 시 차트 즉시 갱신
- [ ] 최근 명세표 탭: 10건 목록 표시 및 클릭 이동 동작

---

#### Phase 2-B: 고객 목록 필터 강화

**기능 명세**

고객 목록 페이지 상단 필터 바 확장:

| 필터 | 타입 | 옵션 |
|------|------|------|
| 고객 유형 | 드롭다운 | 전체 / INDIVIDUAL / SCHOOL_ELEM / SCHOOL_MID / ... |
| 고객 상태 | 드롭다운 | 전체 / ACTIVE / DORMANT / CHURNED / ARCHIVED |
| 최종 주문일 | 기간 선택 | 최근 3개월 / 6개월 / 1년 / 직접 입력 |
| 정렬 기준 | 드롭다운 | 거래처명 / 최종주문일↓ / 총주문금액↓ |

**기술 구현**

```javascript
// 기존 loadCustomerList() 함수에 where 파라미터 추가
// NocoDB where 쿼리 조합:
// ?where=(customer_type,eq,SCHOOL_ELEM)~and(customer_status,eq,ACTIVE)
// &sort=-last_order_date
// &limit=50&offset=N
```

**수락 기준**

- [ ] 유형 필터 선택 시 NocoDB 서버 사이드 필터링 작동
- [ ] 상태 필터 + 유형 필터 복합 적용 정상 동작
- [ ] 정렬 기준 변경 시 목록 즉시 갱신

---

#### Phase 2-C: 기간별 거래내역 조회 페이지

**기능 명세**

사이드바에 '거래내역' 메뉴 신규 추가.

| 항목 | 내용 |
|------|------|
| 연도 선택 | 탭 형태 (2018~2026년, 마이그레이션 데이터 기준) |
| 조회 기간 | 월 선택 드롭다운 (전체 또는 특정 월) |
| 검색 | 거래처명, 적요, 전표번호 |
| 테이블 | tx_date, 거래처명, tx_type, amount, tax, total, memo |
| 집계 | 조회 결과 합계 (공급가액 합, 세액 합, 총합) |
| 페이징 | 100건씩 |

**기술 구현**

```javascript
// 신규 섹션 함수: showTxHistorySection()
// NocoDB 쿼리:
// where=(tx_year,eq,2024)~and(tx_date,gte,2024-01-01)~and(tx_date,lte,2024-01-31)
// sort=-tx_date
// limit=100&offset=N

// 연도별 탭 클릭 → tx_year 파라미터만 변경하여 재조회 (빠른 응답)
```

**수락 기준**

- [ ] 연도 탭 전환 시 1~2초 이내 해당 연도 거래내역 표시
- [ ] 거래처명 검색 시 like 쿼리 정상 동작
- [ ] 조회 결과 합계가 엑셀 내보내기 합계와 일치

---

### Phase 3: 대시보드 고도화

**[담당: partner-admin-developer]** (주관)
**[협업: makeshop-ui-ux-expert]** (차트 디자인, UX)
**[협업: accounting-specialist]** (KPI 지표 정의)
**예상 소요**: 3일

---

#### Phase 3-A: KPI 카드 확장 (4개 → 8개)

**기능 명세**

기존 KPI 카드 4개 유지 + 신규 4개 추가:

| KPI 카드 | 계산 기준 | 경보 조건 |
|---------|----------|----------|
| 이번 달 매출 | SUM(invoices.amount) WHERE 이번 달 | — |
| 이번 달 세액 | SUM(invoices.tax) WHERE 이번 달 | — |
| 활성 거래처 | COUNT(customers) WHERE customer_status=ACTIVE | — |
| 미수금 총액 | SUM(outstanding_balance) | 500만원 이상 → 주의 |
| 신규 거래처 (이번 달) | COUNT(customers) WHERE first_order_date 이번 달 | — |
| 이번 달 명세표 수 | COUNT(invoices) WHERE 이번 달 | — |
| 전월 대비 매출 증감 | (이번 달 - 전월) / 전월 × 100% | 마이너스 → 경보 |
| 누적 연매출 | SUM(invoices.amount) WHERE 이번 해 | — |

**기술 구현**

```javascript
// 기존 loadDashboard() 함수 확장
// KPI 데이터 병렬 조회:
// Promise.all([fetchMonthSales(), fetchMisugeum(), fetchActiveCustomers(), ...])
// 각 카드: .kpi-card.kpi-warning (노랑), .kpi-card.kpi-danger (빨강) CSS 클래스 조건부 적용
```

---

#### Phase 3-B: Chart.js 차트 4종

**기능 명세**

| 차트 | 유형 | 데이터 소스 | 주기 |
|------|------|-----------|------|
| 월별 매출 추이 | Line (이번 해) | invoices 또는 tbl_tx_history | 월별 집계 |
| 연도별 매출 비교 | Bar (최근 5년) | tbl_tx_history | 연도별 집계 |
| 고객 유형별 비중 | Doughnut | customers.customer_type | 전체 |
| 미수금 TOP5 거래처 | Horizontal Bar | customers.outstanding_balance | 내림차순 |

**Chart.js 설정 공통 규칙**

```javascript
// CDN: https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js
// 브랜드 컬러 팔레트:
var BRAND_COLORS = ['#7d9675','#5e7358','#a8c4a2','#d4e8d0','#f0f7ee','#4a5e45','#bfd5bc','#e8f4e5'];

// 차트 생성 전 기존 인스턴스 destroy() 필수 (메모리 누수 방지)
if (window._chartInstances && window._chartInstances[chartId]) {
  window._chartInstances[chartId].destroy();
}
```

---

#### Phase 3-C: 미수금 경보 패널

**기능 명세**

대시보드 하단 섹션에 미수금 경보 패널 배치:

| 경보 단계 | 조건 | 배경색 |
|---------|------|--------|
| 주의 | outstanding_balance 50만원 이상 | 노랑 (#fef3c7) |
| 경고 | outstanding_balance 200만원 이상 | 주황 (#fed7aa) |
| 긴급 | outstanding_balance 500만원 이상 | 빨강 (#fee2e2) |

패널 항목: 거래처명, 미수금액, 최종 주문일, 담당자 연락처
클릭 시 해당 고객 상세 페이지로 이동.

**수락 기준 (Phase 3 전체)**

- [ ] KPI 카드 8개 모두 정상 수치 표시
- [ ] 월별 매출 추이 차트: 이번 해 1~12월 데이터 표시 (0건 월도 표시)
- [ ] 연도별 비교 차트: 최근 5년 데이터 표시
- [ ] 고객 유형 파이 차트: 전체 비율 합 100%
- [ ] 미수금 경보 패널: outstanding_balance > 0인 거래처 상위 5개 표시
- [ ] 차트 반복 생성 시 메모리 누수 없음 (Chrome DevTools 확인)

---

### Phase 4: 미수금 관리 시스템

**[담당: accounting-specialist]** (주관, 비즈니스 로직)
**[협업: partner-admin-developer]** (UI 구현)
**예상 소요**: 3일

---

#### Phase 4-A: invoices 상태 확장

**기능 명세**

invoices 테이블 `status` 필드 유효값 확장:

| 상태 | 설명 | 다음 가능 상태 |
|------|------|-------------|
| `draft` | 작성 중 | issued |
| `issued` | 발행 완료 | shipped, cancelled |
| `shipped` | 출하/발송 완료 | paid, partial |
| `partial` | 일부 입금 | paid, shipped |
| `paid` | 완전 입금 | closed |
| `closed` | 마감 완료 | — |
| `cancelled` | 취소 | — |

상태 전환 버튼을 명세표 상세 화면에 추가.
현재 `issued` 또는 `draft`만 있는 경우, 기존 레코드 하위 호환 유지.

---

#### Phase 4-B: 입금 기록 기능

**기능 명세**

신규 테이블 `tbl_payments` 생성:

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `Id` | AutoNumber | PK |
| `invoice_id` | Number | invoices.Id FK |
| `payment_date` | Date | 입금일 |
| `amount` | Number | 입금액 |
| `method` | SingleLineText | CASH / TRANSFER / CHECK / CARD |
| `bank_name` | SingleLineText | 입금 은행 |
| `memo` | SingleLineText | 비고 |
| `CreatedAt` | DateTime | 자동 생성 |

UI: 명세표 상세 하단에 '입금 기록' 섹션 추가.
- 입금 내역 테이블 (payment_date, amount, method, memo)
- '+ 입금 등록' 버튼 → 인라인 폼 또는 소형 모달
- 합계: 총 명세표 금액 - 입금 합계 = 잔여 미수금 (실시간 계산)
- 잔여 미수금이 0이 되면 invoices.status 자동 → `paid`

**기술 구현**

```javascript
// tbl_payments 테이블 API URL
API.tables.payments = "tbl_payments_id"; // NocoDB 생성 후 ID 기입

// addPayment(invoiceId, paymentData):
// 1. POST tbl_payments
// 2. 해당 invoice의 tbl_payments 합계 재계산
// 3. 합계 >= invoice.total 이면 PATCH invoices/{id} {status: 'paid'}
// 4. 일부이면 PATCH invoices/{id} {status: 'partial'}
// 5. customers.outstanding_balance 재계산 후 PATCH

// outstanding_balance 계산:
// SUM(invoices.total WHERE customer_id=N AND status NOT IN ['paid','closed','cancelled'])
// - SUM(tbl_payments.amount WHERE invoice_id IN [...])
```

---

#### Phase 4-C: 미수금 에이징 테이블

**기능 명세**

미수금 관리 전용 페이지 (사이드바 '미수금' 메뉴 신규):

| 컬럼 | 설명 |
|------|------|
| 거래처명 | 클릭 시 고객 상세 이동 |
| 30일 미만 | 최근 1개월 미수금 합 |
| 30~60일 | 1~2개월 미수금 합 |
| 60~90일 | 2~3개월 미수금 합 |
| 90일 이상 | 3개월 초과 (위험) |
| 총 미수금 | 전체 합 |
| 최근 입금일 | tbl_payments MAX(payment_date) |

에이징 기준: invoices.issue_date (또는 created_at) 기준 오늘 - 발행일 계산.
90일 이상 행은 빨간 배경으로 강조.

**수락 기준 (Phase 4 전체)**

- [ ] invoices 상태 전환 버튼 7개 상태 전환 정상 동작
- [ ] 부분 입금 등록 시 status → `partial` 자동 전환
- [ ] 전액 입금 시 status → `paid` 자동 전환 + outstanding_balance → 0
- [ ] 에이징 테이블: 발행일 기준 구간별 합계 정확도 100% (샘플 20건 검증)
- [ ] 미수금 경보 패널과 데이터 일치

---

### Phase 5: 엑셀 내보내기

**[담당: partner-admin-developer]**
**[협업: accounting-specialist]** (세무사 제출용 양식 확인)
**예상 소요**: 2일

---

**기능 명세**

| 내보내기 유형 | 데이터 소스 | 시트명 | 활용처 |
|-------------|-----------|--------|--------|
| 거래내역 | tbl_tx_history (기간 선택) | 거래내역 | 일반 조회 |
| 고객 목록 | customers (필터 적용 상태) | 고객목록 | 영업 활용 |
| 미수금 현황 | outstanding_balance > 0 | 미수금현황 | 채권 관리 |
| 월별 매출 합계 | invoices (월별 집계) | 월별매출 | 경영 분석 |
| 세무사 제출용 | invoices + tax (해당 월) | 세금계산서내역 | 세무 처리 |

**세무사 제출용 양식 컬럼**

| 컬럼 | 내용 |
|------|------|
| 발행일 | — |
| 거래처명 | — |
| 사업자번호 | — |
| 공급가액 | amount |
| 세액 | tax |
| 합계금액 | total |
| 비고 | memo |

**기술 구현**

```javascript
// SheetJS CDN: https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js

function exportToExcel(sheetData, fileName) {
  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.aoa_to_sheet(sheetData); // 헤더 + 데이터 배열
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, fileName + "_" + todayStr() + ".xlsx");
}

// 각 내보내기 버튼 위치:
// - 거래내역 페이지: 헤더 우측 '엑셀 다운로드' 버튼
// - 고객 목록 페이지: 헤더 우측 '엑셀 다운로드' 버튼
// - 미수금 페이지: 헤더 우측 '엑셀 다운로드' 버튼
// - 대시보드: '세무사 제출용' 버튼 (월 선택 후 다운로드)

// 대용량 데이터 주의: tbl_tx_history 전체 조회 시 NocoDB 페이징 필요
// → 1,000건씩 반복 조회 후 배열 합산, 진행률 표시
```

**수락 기준**

- [ ] 엑셀 파일 정상 다운로드 (xlsx 확장자)
- [ ] 한글 거래처명 깨짐 없음
- [ ] 세무사 제출용 컬럼 순서 정확
- [ ] 1만건 이상 데이터 내보내기 시 브라우저 멈춤 없음 (청크 처리)
- [ ] 파일명: `{유형}_{YYYY-MM-DD}.xlsx` 형식

---

### Phase 6: 고객 세분화

**[담당: ecommerce-business-expert]** (주관, VIP 등급 기준 설계)
**[협업: partner-admin-developer]** (UI 구현)
**[협업: makeshop-ui-ux-expert]** (고객 카드 디자인)
**예상 소요**: 5~7일

---

#### Phase 6-A: VIP 등급 체계

**기능 명세**

| 등급 | 기준 (연 매출 OR 거래 빈도) | 배지 색상 |
|------|--------------------------|---------|
| VVIP | 연 500만원 이상 OR 연 50회 이상 | 금색 (#d97706) |
| VIP | 연 200만원 이상 OR 연 20회 이상 | 보라 (#7c3aed) |
| GOLD | 연 50만원 이상 OR 연 5회 이상 | 청록 (#0891b2) |
| REGULAR | 그 외 활성 거래처 | 회색 (#6b7280) |

customers 테이블 신규 필드:

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `vip_grade` | SingleLineText | VVIP / VIP / GOLD / REGULAR |
| `annual_amount` | Number | 해당 연도 총 주문금액 (파생, 매월 갱신) |
| `annual_count` | Number | 해당 연도 총 주문 횟수 (파생) |
| `grade_updated_at` | DateTime | 등급 마지막 갱신일 |

**등급 산정 주기**: 매월 1일 수동 갱신 (버튼 클릭 방식, n8n 자동화는 별도 Phase)

**기술 구현**

```javascript
// 수동 등급 갱신 버튼 (관리자 설정 페이지):
async function recalculateVipGrades() {
  // 1. tbl_tx_history에서 올해 1월 1일 이후 데이터 groupBy customer_id
  // 2. annual_amount, annual_count 계산
  // 3. 등급 로직 적용
  // 4. customers 테이블 일괄 PATCH (100건 배치)
  // 5. 결과 토스트: "등급 갱신 완료: VVIP N명, VIP N명..."
}
```

---

#### Phase 6-B: 고객 카드 강화

**기능 명세**

고객 목록 카드/행에 다음 정보 추가 표시:

- customer_type 아이콘: 학교(🏫) / 센터(🏛) / 협회(🤝) / 개인(👤) / 학원(📚) / 기타(🏢)
- customer_status 배지: 초록(ACTIVE) / 노랑(DORMANT) / 빨강(CHURNED) / 회색(ARCHIVED)
- vip_grade 배지: VVIP/VIP/GOLD/REGULAR 색상 구분
- outstanding_balance > 0이면 빨간 원형 알림 표시
- RFM 점수 (선택): Recency(최종주문일), Frequency(주문횟수), Monetary(총금액) 간이 점수 표시

**기술 구현**

```javascript
// 고객 유형 아이콘 매핑 (JavaScript 객체)
var CUSTOMER_TYPE_ICONS = {
  INDIVIDUAL: '👤', SCHOOL_ELEM: '🏫', SCHOOL_MID: '🏫',
  SCHOOL_HIGH: '🏫', SCHOOL_UNIV: '🎓', CENTER: '🏛',
  ASSOC: '🤝', ACADEMY: '📚', ONLINE: '💻', OTHER: '🏢'
};

// VIP 배지 CSS:
// .badge-vvip { background: #d97706; color: #fff; }
// .badge-vip  { background: #7c3aed; color: #fff; }
// .badge-gold { background: #0891b2; color: #fff; }
// .badge-regular { background: #6b7280; color: #fff; }
```

---

#### Phase 6-C: 배송지 별칭 지원

**기능 명세**

customers 테이블 다중 주소 필드 확장:

- 기존 `address1` (단일 주소) → `addresses` (JSON 배열)
- 각 주소에 별칭 지원: `[{"alias": "본원", "addr": "서울시..."}, {"alias": "분원1", "addr": "경기도..."}]`
- 명세표 작성 시 배송지 드롭다운: 거래처 선택 후 저장된 배송지 별칭 선택 가능

**기술 구현**

```javascript
// 기존 addAddrField() 함수에 별칭 입력 필드 추가
// 저장: JSON.stringify([{alias, addr}, ...])로 NocoDB에 저장
// 명세표 폼: 거래처 선택 시 addresses 파싱 → 배송지 select 드롭다운 갱신
```

**수락 기준 (Phase 6 전체)**

- [ ] VIP 등급 갱신 버튼 클릭 → 전체 거래처 등급 재산정 5분 이내 완료
- [ ] VVIP 기준(연 500만원) 충족 거래처에 VVIP 배지 정상 표시
- [ ] 고객 카드에 유형 아이콘, 상태 배지, VIP 배지 동시 표시
- [ ] 배송지 별칭 저장 및 명세표 폼 드롭다운 선택 정상 작동
- [ ] RFM 점수 표시 (선택 사항, 개발 여건에 따라 조정)

---

### Phase 7: 성능 최적화 + 보안

**[담당: devops-monitoring-expert]** (주관, 서버/DB 최적화)
**[협업: security-hardening-expert]** (API 토큰 보안)
**[협업: qa-test-expert]** (성능 측정, 회귀 테스트)
**예상 소요**: 2일

---

#### Phase 7-A: NocoDB 인덱스 추가

**기능 명세**

10만건 tbl_tx_history 조회 성능을 위한 SQLite 인덱스 추가:

```sql
-- Docker exec nocodb sh -c "sqlite3 /nocodb/data/noco.db"

CREATE INDEX idx_tx_history_year ON tbl_tx_history(tx_year);
CREATE INDEX idx_tx_history_customer ON tbl_tx_history(customer_id);
CREATE INDEX idx_tx_history_date ON tbl_tx_history(tx_date);
CREATE INDEX idx_tx_history_customer_year ON tbl_tx_history(customer_id, tx_year);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_customers_status ON customers(customer_status, customer_type);
CREATE INDEX idx_customers_balance ON customers(outstanding_balance);
```

**수락 기준**

- [ ] 연도별 거래내역 100건 조회: 2초 이내 응답
- [ ] 특정 고객 거래 히스토리 조회: 1초 이내 응답
- [ ] 인덱스 추가 후 NocoDB 재시작 없이 즉시 반영 확인

---

#### Phase 7-B: API 토큰 분리

**기능 명세**

현재 `app.js`에 하드코딩된 NocoDB API 토큰을 분리:

**문제**: `TOKEN: "SIxKK9NtvgsQeLnMQcxbi5pNJGF7tJhnrv6LLGFl"` 코드에 직접 노출

**해결 방안 (단계별)**

| 단계 | 방법 | 적용 대상 |
|------|------|---------|
| 즉시 | 토큰 로테이션 (NocoDB에서 재발급) | 현재 노출된 토큰 |
| 단기 | `config.js` 파일 분리 + `.gitignore` 추가 | 새 토큰 |
| 중기 | Read-only 토큰 발급 (CRM 조회 전용) vs Write 토큰 분리 | NocoDB Team API Token |

**config.js 구조**

```javascript
// /Users/jangjiho/workspace/pressco21/offline-crm/config.js
// 이 파일은 .gitignore에 추가
window.CRM_CONFIG = {
  nocodb_url: "https://nocodb.pressco21.com",
  token_read: "READ_ONLY_TOKEN",
  token_write: "WRITE_TOKEN",
  base_id: "pu0mwk97kac8a5p"
};
```

**index.html 수정**

```html
<!-- app.js 로드 전에 config.js 로드 -->
<script src="config.js"></script>
<script src="app.js"></script>
```

---

#### Phase 7-C: 서버 사이드 필터 전환

**기능 명세**

현재 클라이언트에서 filter()로 처리하는 로직을 NocoDB 쿼리로 이전:

| 현재 (클라이언트) | 개선 (서버 사이드) |
|----------------|----------------|
| 전체 로드 후 JS filter() | NocoDB where 파라미터 활용 |
| 정렬: array.sort() | NocoDB sort 파라미터 활용 |
| 페이징: slice() | NocoDB limit+offset 활용 |

특히 고객 목록 (19,890건), 거래내역 (10만건)은 반드시 서버 사이드 필터링 적용.

**수락 기준 (Phase 7 전체)**

- [ ] 고객 목록 초기 로드: 2초 이내 (19,890건 중 50건만 조회)
- [ ] 거래내역 조회: 3초 이내 (서버 사이드 필터 + 인덱스)
- [ ] 기존 NocoDB 토큰 로테이션 완료 + 새 토큰 config.js에 적용
- [ ] config.js .gitignore 등록 확인
- [ ] 모든 기존 기능 회귀 테스트 통과 (qa-test-expert 수행)

---

## 4. 에이전트 오케스트레이션 계획

### 4-1. Phase별 실행 순서 및 의존성

```
Phase 1 (1주) ──────────────────────────────────────────────
  1-A. 고객 이전    [gas-backend-expert + data-integrity-expert]
  1-B. 품목 이전    [data-integrity-expert]
  1-C. 거래내역     [gas-backend-expert + n8n-debugger]
          ↓ (1-A/B/C 완료 후)
  1-D. 파생 필드    [gas-backend-expert + accounting-specialist]

Phase 2 (3일) ── Phase 1 완료 후 병렬 시작 가능 ─────────────
  2-A. 고객 상세    [partner-admin-developer + makeshop-ui-ux-expert]
  2-B. 필터 강화    [partner-admin-developer]
  2-C. 거래내역 조회 [partner-admin-developer]

Phase 3 (3일) ── Phase 1 완료 후 병렬 시작 ─────────────────
  3-A. KPI 카드    [partner-admin-developer + accounting-specialist]
  3-B. Chart.js   [partner-admin-developer + makeshop-ui-ux-expert]
  3-C. 미수금 경보  [partner-admin-developer]

Phase 4 (3일) ── Phase 1-D 완료 후 ─────────────────────────
  4-A. 상태 확장    [accounting-specialist + partner-admin-developer]
  4-B. 입금 기록    [accounting-specialist + partner-admin-developer]
  4-C. 에이징 테이블 [accounting-specialist + partner-admin-developer]

Phase 5 (2일) ── Phase 2/3/4 완료 후 ───────────────────────
  엑셀 내보내기     [partner-admin-developer + accounting-specialist]

Phase 6 (1주) ── Phase 1-D 완료 후 병렬 ────────────────────
  6-A. VIP 등급    [ecommerce-business-expert + partner-admin-developer]
  6-B. 고객 카드    [partner-admin-developer + makeshop-ui-ux-expert]
  6-C. 배송지 별칭  [partner-admin-developer]

Phase 7 (2일) ── 전체 기능 완성 후 최종 ────────────────────
  7-A. 인덱스      [devops-monitoring-expert]
  7-B. 토큰 보안   [security-hardening-expert]
  7-C. 서버 필터   [partner-admin-developer + devops-monitoring-expert]
  QA 전체 테스트   [qa-test-expert]
```

### 4-2. 병렬 실행 가능 조합

| 병렬 그룹 | Phase | 조건 |
|----------|-------|------|
| A | 2, 3, 6-A | Phase 1 완료 후 동시 진행 가능 |
| B | 4, 5 | Phase 1-D + A그룹 완료 후 |
| C | 7-A, 7-B | Phase 7은 전체 완료 후 단독 |

### 4-3. 에스컬레이션 체인

```
마이그레이션 오류 → data-integrity-expert → n8n-debugger → CTO
UI 디자인 이견 → makeshop-ui-ux-expert → partner-admin-developer → CTO
비즈니스 로직 이견 → accounting-specialist → ecommerce-business-expert → CFO
보안 이슈 발견 → security-hardening-expert → CTO → 대표
```

---

## 5. 검증 방법

### 5-1. 데이터 마이그레이션 검증 (Phase 1)

```python
# 검증 스크립트: scripts/verify-migration.py

# 1. 건수 검증
원본_건수 = 얼마에요_xls_총건수
nocodb_건수 = GET /api/v1/db/data/noco/.../tbl_tx_history?limit=1 → pageInfo.totalRows
assert abs(nocodb_건수 - 원본_건수) / 원본_건수 < 0.005  # 0.5% 이내

# 2. 합계 검증 (연도별)
for year in range(2018, 2027):
    원본_합계 = 얼마에요_해당년도_amount_합
    nocodb_합계 = tbl_tx_history WHERE tx_year=year SUM(amount)
    assert abs(nocodb_합계 - 원본_합계) < 10000  # 1만원 오차 허용

# 3. 샘플 검증 (랜덤 100건)
import random
sample_ids = random.sample(all_nocodb_ids, 100)
for id in sample_ids:
    nocodb_row = GET /tbl_tx_history/id
    원본_row = 얼마에요에서_해당_slip_no_조회
    assert nocodb_row['amount'] == 원본_row['amount']
    assert nocodb_row['tx_date'] == 원본_row['tx_date']
```

### 5-2. UI 기능 검증 (Phase 2~6)

**[담당: qa-test-expert]**

수동 체크리스트 방식 (CRM은 복잡한 E2E 프레임워크 불필요):

```
테스트 시나리오 TC-001: 고객 상세 페이지
1. 고객 목록에서 'OO학교' 클릭
2. 기본정보 탭: 유형 아이콘 '🏫' 확인
3. 거래 히스토리 탭: 거래내역 표시 확인
4. 2024년 탭 → 2023년 탭 전환: 데이터 갱신 확인
5. 매출 차트 탭: 막대 차트 표시 확인

테스트 시나리오 TC-002: 미수금 입금 처리
1. 미수금 있는 명세표 열기
2. '입금 등록' 클릭 → 부분 입금 50% 입력
3. status → 'partial' 변경 확인
4. 추가 입금으로 100% 완납
5. status → 'paid' 자동 전환 확인
6. outstanding_balance → 0 확인

테스트 시나리오 TC-003: 엑셀 내보내기
1. 거래내역 페이지에서 2024년 선택
2. '엑셀 다운로드' 클릭
3. xlsx 파일 다운로드 확인
4. Excel에서 열기: 한글 깨짐 없음 확인
5. 행수 = 화면 조회 건수와 동일 확인
```

### 5-3. 성능 검증 (Phase 7)

```
측정 도구: Chrome DevTools Network 탭

기준 지표:
- 고객 목록 초기 로드: Time < 2,000ms
- 거래내역 연도별 조회: Time < 3,000ms
- 고객 상세 패널 열기: Time < 2,000ms
- 대시보드 KPI 8개 로드: Time < 4,000ms (병렬 조회)
- 엑셀 내보내기 (1만건): Time < 10,000ms

측정 방법:
1. Chrome DevTools → Network → Disable cache 체크
2. 새로고침 → Total load time 기록
3. 3회 평균
```

---

## 6. 성공 지표 (KPI)

### 6-1. 데이터 완성도

| 지표 | 목표 | 측정 방법 |
|------|------|---------|
| 고객 데이터 이전율 | 99% 이상 | 원본 건수 대비 NocoDB 건수 |
| 거래내역 이전율 | 99.5% 이상 | 원본 합계 대비 NocoDB 합계 |
| customer_type 분류율 | 90% 이상 | NULL 제외 비율 |
| 파생 필드 정확도 | 100% | 샘플 50건 수동 검증 |

### 6-2. 업무 효율성

| 지표 | 현재 | 목표 | Phase |
|------|------|------|-------|
| 미수금 파악 시간 | 30분 (엑셀 수동) | 1분 (에이징 테이블) | Phase 4 |
| 세무사 제출 자료 준비 | 2시간 | 10분 | Phase 5 |
| VIP 거래처 식별 시간 | 즉시 불가 | 즉시 (배지) | Phase 6 |
| 특정 고객 거래 이력 조회 | 불가 | 2초 이내 | Phase 2 |

### 6-3. 시스템 성능

| 지표 | 목표 |
|------|------|
| 고객 목록 로드 (50건) | 2초 이내 |
| 거래내역 조회 (100건) | 3초 이내 |
| 대시보드 완전 로드 | 4초 이내 |
| 엑셀 내보내기 1만건 | 10초 이내 |

### 6-4. 보안

| 지표 | 목표 |
|------|------|
| 코드에 직접 노출된 토큰 | 0개 |
| config.js git 추적 여부 | .gitignore 등록 완료 |
| 토큰 로테이션 완료 | Phase 7-B 완료 시점 |

---

## 7. 전제 조건 및 위험 요소

### 7-1. 전제 조건

| 항목 | 내용 | 담당 |
|------|------|------|
| 얼마에요 백업 파일 경로 | `/Users/jangjiho/Downloads/얼마에요 백업파일/` | 대표 확인 필요 |
| tbl_tx_history 테이블 생성 | NocoDB UI 또는 SQLite 직접 생성 | data-integrity-expert |
| tbl_payments 테이블 생성 | NocoDB UI 생성 후 Table ID 확인 | partner-admin-developer |
| NocoDB Docker 접근 권한 | devops-monitoring-expert가 SSH 접근 가능 여부 | devops-monitoring-expert |
| Python 환경 | xlrd, requests, pandas 설치 | gas-backend-expert |

### 7-2. 위험 요소

| 위험 | 확률 | 대응 방안 |
|------|------|---------|
| 얼마에요 xls 컬럼 매핑 불일치 | 높음 | Phase 1 시작 전 xls 샘플 100행 컬럼 분석 |
| NocoDB Rate Limit (10만건 배치 중) | 중간 | batch_size=200, sleep=1.0초 조정 |
| SQLite 인덱스 추가 중 NocoDB 잠금 | 낮음 | 트래픽 없는 새벽 시간대 실행 |
| tbl_tx_history Table ID 사전 확인 필요 | 높음 | `mqeg73wr7xzi1k3`는 스크립트 기존 설정값, 생성 후 재확인 |
| 기존 invoices status 값 하위 호환 | 중간 | migration 스크립트로 기존 null → 'draft' 일괄 변환 |

---

## 8. 참고 파일

| 파일 | 경로 | 설명 |
|------|------|------|
| CRM 메인 | `/Users/jangjiho/workspace/pressco21/offline-crm/index.html` | 956줄, HTML/CSS |
| CRM 로직 | `/Users/jangjiho/workspace/pressco21/offline-crm/app.js` | 2165줄, Vanilla JS |
| 마이그레이션 스크립트 | `/Users/jangjiho/workspace/pressco21/scripts/import-얼마에요.py` | 기존 스크립트 (고도화 대상) |
| 프로젝트 지침 | `/Users/jangjiho/workspace/pressco21/CLAUDE.md` | NocoDB 패턴, 보안 규칙 |
| 인증키 | `/Users/jangjiho/workspace/pressco21/.secrets.env` | NocoDB 토큰 (git 미추적) |
