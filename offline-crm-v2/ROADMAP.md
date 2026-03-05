# PRESSCO21 Offline CRM v2 개발 로드맵

거래내역 97,086건 + 고객 15,830건을 NocoDB로 통합하고, React 기반 CRM 엔진으로 데이터 기반 경영 판단의 토대를 구축한다.

## 프로젝트 개요

### 목표

구글시트/얼마에요 기반 거래장부 및 고객 관리를 NocoDB로 이전하고, 미수금 관리/회원 등급/대시보드 KPI를 갖춘 본격 CRM 엔진을 구축한다. ERP 도입 전 단계로서 데이터 기반 경영 판단의 토대를 마련한다.

### 배경

- 기존 Offline CRM (Vanilla HTML/CSS/JS)은 거래명세표 발행/고객 목록 기본 기능만 보유
- 얼마에요 백업 엑셀(2013~2026)에 거래내역 97,086건 분산
- 고객 데이터 2개 소스(얼마에요 거래처 13,298건 + 고객리스트 6,592건) 병합 필요

### 데이터 규모

| 항목 | 건수 |
|------|------|
| 거래내역 (tbl_tx_history) | 97,086건 |
| 고객/거래처 (tbl_Customers) | 15,830건 |
| 제품 (tbl_Products) | 3,008건 |
| 명세표 (invoices) | 운영 중 |
| 출고 총 금액 합계 | 9,120,347,222원 |

### 기술 스택

| 항목 | 기술 |
|------|------|
| 프론트엔드 | React 19 + TypeScript + Vite |
| 상태 관리 | @tanstack/react-query (staleTime 캐싱) |
| UI 프레임워크 | shadcn/ui + Tailwind CSS |
| 차트 | Recharts |
| 엑셀 내보내기 | SheetJS (xlsx) |
| 토스트 알림 | sonner |
| API 프록시 | n8n webhook proxy (x-crm-key 인증) |
| 데이터베이스 | NocoDB (SQLite 백엔드) |
| E2E 테스트 | Playwright |
| 브랜드 컬러 | #7d9675 (세이지 그린) |

---

## 전체 완료 이력

### CRM-PRE: 거래명세표 카드형 디자인 복원 + 미수금 기본 시스템 -- 완료 (2026-03-04)

> Vanilla JS v1 (`offline-crm/` 폴더)

- `buildInvoiceHtml()`: 세로형 표 -> 카드형 디자인 (로고/도장/미수금 영역 포함) 전면 교체
- `printDuplexViaIframe()` iframe CSS: 이등분 A4 인쇄 최적화 (11pt/6pt 폰트, flex 레이아웃)
- 미수금 데이터 로직: `getCustomerBalance()`, `recalcCustomerBalance()`, `updateBalanceCalc()` 신규
- 입금 처리 모달: `openPaymentModal()`, `processPayment()` + `modal-payment` UI
- 대시보드: 총 미수금 stat 카드 + 수금 컬럼 + payment_status 배지

---

### CRM-001: NocoDB tbl_tx_history 테이블 생성 + customers 필드 추가 -- 완료 (2026-03-05)

- tbl_tx_history 생성: 15컬럼 (tx_date, legacy_book_id, customer_name, tx_type, amount, tax, memo, slip_no, debit_account, credit_account, ledger, tx_year 등)
- tbl_Customers 확장: customer_type, customer_status, business_no, last_order_date, first_order_date, total_order_count, total_order_amount, outstanding_balance 등 12개 필드
- 인덱스 5개 생성 (customer_name, tx_date, tx_type, tx_year, customer_status)
- **PRD vs 실제 차이**: customer_id FK 설계 -> customer_name 문자열 비정규화 (Phase 1 완료 후 소급 변경 없음)

---

### CRM-002: 거래내역 97,086건 마이그레이션 -- 완료 (2026-03-05)

- 스크립트: `scripts/migrate_tx_history.py`
- 원본: 얼마에요 백업 엑셀 (2013~2026 연도별 .xls)
- 이관: 97,086건 -> NocoDB tbl_tx_history (배치 500건, 연도별 중복 방지)
- tx_type 분포: 출고/입금/반입/메모 (PRD 설계 SALES/PURCHASE와 다름 -- 원본값 보존)

---

### CRM-003: 고객/거래처 15,830건 병합 이전 -- 완료 (2026-03-05)

- 얼마에요 거래처.xls (13,298건) + 고객리스트 전체자료.xls (6,592건) 병합
- `scripts/migrate_customers.py` 작성 및 실행
- customer_type 자동 분류 10,380건 적용 (INDIVIDUAL/SCHOOL_*/CENTER/ASSOC/ACADEMY/ONLINE)
- 고객리스트 매칭 4,043건 -> email/mobile 보완 업데이트 (858건)
- 고객리스트 미매칭 2,548건 신규 추가
- 최종: 15,830건

---

### CRM-004: 마이그레이션 후 파생 필드 산출 -- 완료 (2026-03-05)

- `scripts/compute_derived_fields.py` 작성 및 실행
- tbl_tx_history 출고 건 61,548건 -> 7,523개 유니크 거래처 집계
- customer_status 분류: ACTIVE 311건(2.0%) / DORMANT 335건(2.1%) / CHURNED 15,184건(95.9%)
- 출고 총 금액 합계: 9,120,347,222원
- 수동 검증 완료 (대전스톤스타 샘플: tx_history와 100% 일치)

---

### CRM-005: 고객 상세 페이지 (거래 히스토리/매출 차트/명세표 탭) -- 완료 (2026-03-05)

- React Router 고객 상세 3탭 구조 (거래 히스토리 / 매출 차트 / 명세표)
- Recharts 월별 매출 차트
- 고객 KPI 4개 카드 (총 매출, 거래 횟수, 평균 거래 금액, 최종 거래일)
- 고객 헤더: 이름, customer_type 배지, vip_grade 배지, customer_status 배지

---

### CRM-006: 대시보드 KPI + Recharts 차트 + 미수금 경보 -- 완료 (2026-03-05)

- KPI 카드 8개 (이번 달 매출, 거래 건수, 미수금 총액, 신규 고객, 활성 비율, 객단가, VIP 수, 이탈률)
- Recharts 차트 3종 (월별 매출 추이, 고객 상태 분포, 요일별 거래 패턴)
- 미수금 경보: 30일 이상 주황, 60일 이상 빨강 + 목록 상단 고정

---

### CRM-007: 거래명세표 발행/인쇄 React 이전 -- 완료 (2026-03-05)

- InvoiceDialog 컴포넌트: 명세표 발행/수정/인쇄 통합
- `printDuplexViaIframe` Vanilla JS 이식 (이등분 A4 인쇄)
- items CRUD: `bulkCreateItems()`, `bulkDeleteItems()` NocoDB v2 bulk API 적용
- 발행번호: `INV-YYYYMMDD-HHMMSS` (초 단위)

---

### CRM-008: 미수금 관리 + 엑셀 내보내기 -- 완료 (2026-03-05)

- 에이징 테이블 4구간 (0~30일 / 31~60일 / 61~90일 / 91일+)
- 입금 확인 처리 (전액/부분)
- payment_status 상태머신: paid / partial / unpaid
- 미수금 계산: `현잔액 = 전잔액 + 출고액(합계) - 입금액`

---

### CRM-009: 엑셀 내보내기 (SheetJS) -- 완료 (2026-03-05, CRM-008에 통합)

- SheetJS xlsx CDN 로드
- 내보내기 3종: 고객 목록 / 거래내역 / 미수금 현황
- 파일명 규칙: `PRESSCO21_[유형]_[YYYYMMDD].xlsx`
- 서식: 헤더 볼드, 금액 천단위 콤마, 날짜 형식 통일

---

### CRM-010: 회원 등급 체계 구축 -- 완료 (2026-03-05)

5등급 구조 (브랜드 메타포: "한 송이 꽃이 정원이 되기까지"):

| 등급 | 자격 조건 | 배지 색상 |
|------|----------|----------|
| 씨앗 (회원) | 회원가입 | #a8b5a0 |
| 뿌리 (인스트럭터) | 자격증/수료증 or 원예 사업자등록증 | #7d9675 |
| 꽃밭 (파트너스) | 제휴 협회/업체 소속 or 인정 자격증 | #5e8a6e |
| 정원사 (VIP) | 프레스코21 직접 선정 | #b89b5e |
| 별빛 (엠버서더) | 바이럴 능력 보유 초청 (병행 가능) | #8b6fae |

- member_grade, is_ambassador 필드 추가
- 등급 필터 (고객 목록) 동작

---

### CRM-011: 성능 최적화 -- 완료 (2026-03-05)

- SQLite 인덱스 15개 추가
- React Query staleTime 캐싱 적용
- 고객 목록 응답 < 500ms 달성
- 대시보드 KPI 산출 1초 이내

---

### CRM-012: 보안 강화 + E2E 테스트 -- 완료 (2026-03-05)

- Vite dev proxy: `/crm-proxy` -> `https://n8n.pressco21.com/webhook/crm-proxy` (CORS 우회)
- n8n WF-CRM-PROXY: workflow ID `pKtxMPJfqiJKA0Rk` (active)
  - NocoDB v2 bulk API 적용 (`POST /api/v2/tables/{tableId}/records`)
  - n8n IF 노드 v2 버그 우회: boolean 비교 -> 숫자 비교 (`_status !== 200`)
- 프론트엔드 코드 내 토큰 직접 노출 0건 (서버사이드 프록시 경유)
- TypeScript 빌드 에러 수정: Recharts Formatter 타입, import type 분리
- Playwright E2E 28/28 통과: T1(9/9) T2(10/10) T3(9/9), 28.2초

---

### CRM-v2-고도화: CRM v2 6단계 고도화 -- 완료 (2026-03-05)

19파일, 2340 insertions

**Phase 1 -- 공통 인프라**:
- `sonner` 토스트 시스템 도입 (`alert()` 전체 교체)
- 설정 페이지 (`src/pages/Settings.tsx`): 공급자정보/인쇄설정/입금계좌/시스템 4섹션
- 인쇄 로고(좌상단) + 도장(우하단, 원형/회전/-15deg) 복원 (`print.ts`)
- `App.tsx`: Toaster, `/settings`, `/calendar` 라우트 추가
- `Sidebar.tsx`: 캘린더/설정 메뉴 추가
- 등급 색상: CHURNED 빨강 -> 슬레이트(#94a3b8) (brand-planning-expert 권고)

**Phase 2 -- API 타입 확장 + 보안**:
- `sanitizeSearchTerm()` / `sanitizeAmount()` 추가 (security-hardening-expert)
- `Product` 인터페이스: 8단가(price1~8), product_code, alias, category, is_taxable, is_active
- `getPriceByTier(product, tier)`: 등급별 단가 반환
- Product CRUD 4종 / `deleteInvoice()` / `recalcCustomerBalance()` 신규
- `Customer` 보강: mobile, price_tier, biz_no, ceo_name, biz_type, biz_item, memo
- `Supplier` 인터페이스 12필드 + CRUD 4종

**Phase 3 -- 플레이스홀더 3페이지 구현**:
- `Transactions.tsx` 전체 재작성: 97K건 거래내역, 검색+유형필터+기간필터+50건 페이지네이션
- `ProductDialog.tsx` 신규 + `Products.tsx` 전체 재작성: 3,008건 제품 CRUD, 5단가 편집
- `SupplierDialog.tsx` 신규 + `Suppliers.tsx` 전체 재작성: 공급처 CRUD 12필드

**Phase 4 -- 명세표 고도화**:
- `InvoiceDialog.tsx` 전면 재작성:
  - 상품 자동완성: debounce 250ms -> 등급별 단가 자동세팅
  - 거래처 카드: 등급배지 + 최근거래 5건
  - 합계 역산: `supply = Math.floor(total/1.1)`, `tax = total - supply`
  - `_totalUnit` 수량 역산 패턴
  - `isDirty` + `window.confirm` 저장 안전장치
  - Ctrl+Enter 저장 / Esc 닫기 단축키
  - copySourceId 복사 모드 지원
- `Invoices.tsx` 재작성: 인라인 [인쇄][복사][삭제] 버튼, 삭제 시 items 연계 + 잔액 재계산

**Phase 5 -- 고객 고도화**:
- `CustomerDialog.tsx` 신규: 전체 필드 (name/phone/mobile/email/주소/유형/상태/단가등급/회원등급/사업자정보/메모)
- `Customers.tsx`: "새 고객" 버튼 + 다중필드 검색(name/phone/mobile) + sanitize 적용

**Phase 6 -- 캘린더**:
- `Calendar.tsx` 신규: 월간 7열 캘린더, 일별 건수/금액, 날짜 클릭 -> 명세표 목록, 월간 요약 사이드바

**수정 파일 (19개)**:
`src/App.tsx`, `src/components/layout/Sidebar.tsx`, `src/lib/constants.ts`,
`src/lib/print.ts`, `src/lib/api.ts`,
`src/pages/Settings.tsx`(신규), `src/pages/Transactions.tsx`, `src/pages/Products.tsx`,
`src/pages/Suppliers.tsx`, `src/pages/Calendar.tsx`(신규),
`src/pages/Invoices.tsx`, `src/pages/Customers.tsx`,
`src/components/InvoiceDialog.tsx`, `src/components/CustomerDialog.tsx`(신규),
`src/components/ProductDialog.tsx`(신규), `src/components/SupplierDialog.tsx`(신규),
`public/images/company-stamp.jpg`(복사)

---

## 미완료 항목

### Phase 6.2: 기간 매출 리포트

Dashboard에 기간별 매출 분석 기능을 추가한다.

- [ ] 퀵 프리셋: 이번달 / 지난달 / 이번분기 / 올해
- [ ] 추가 KPI: 수금률, 전년동월대비 증감, 객단가 추이
- [ ] 기간 선택 시 차트 및 KPI 카드 실시간 갱신
- [ ] 기간별 매출 비교 차트 (전월/전년 대비)

### Phase 7: 보안 배포 전 필수 조치

프로덕션 배포 전 반드시 완료해야 하는 보안 항목들.

- [ ] `vite.config.ts` drop_console 설정 (프로덕션 빌드 시 console.* 제거)
- [ ] n8n CORS 설정 `*` -> 특정 도메인으로 제한 (예: `crm.pressco21.com`)
- [ ] CSP (Content-Security-Policy) 헤더 추가
- [ ] NocoDB API 토큰 재발급 (git history에 노출된 건 -- 키 로테이션 필수)
- [ ] XSS 방어 새니타이징 추가 적용 확인 (CRM-012에서 향후 과제로 남김)

---

## 기술 결정 사항

### 스키마: 실제 구현 vs PRD 차이

| 항목 | PRD 설계 | 실제 구현 | 이유 |
|------|---------|----------|------|
| tbl_tx_history 고객 참조 | customer_id FK (정규화) | customer_name 문자열 (비정규화) | Phase 1(데이터 이관) 완료 후 소급 변경 불가. 동명이인 주의 필요 |
| tx_type 값 | SALES / PURCHASE | 출고 / 입금 / 반입 / 메모 | 얼마에요 원본값 보존 (변환 시 데이터 손실 리스크) |
| 집계 기준 | customer_id 매칭 | customer_name 문자열 매칭 | 비정규화에 따른 제약. 동명이인 케이스 수동 검토 |

### NocoDB 테이블 Model IDs

| 테이블 | Model ID | View ID |
|--------|----------|---------|
| tbl_Customers | mffgxkftaeppyk0 | - |
| tbl_tx_history | mtxh72a1f4beeac | vwtxh2a1f4beeacb |
| invoices | ml81i9mcuw0pjzk | - |

### CRM Base 정보

- **Base ID**: `pu0mwk97kac8a5p`
- **Source ID**: `bife5m5mnnejeq8`

### n8n WF-CRM-PROXY

- **Active Workflow ID**: `pKtxMPJfqiJKA0Rk`
- **Inactive Workflow ID**: `hatGmQcPiF0f3MEw`
- NocoDB v1 `/bulk` 엔드포인트 없음 (NocoDB 0.301.2) -> v2 array body 방식 사용
- n8n IF 노드 v2 버그: boolean 비교 불가 -> `_status !== 200` 숫자 비교로 우회

### 미수금 계산 공식

```
현잔액 = 전잔액 + 출고액(합계) - 입금액
payment_status: paidAmt >= (prevBal + total) -> "paid"
                paidAmt > 0 -> "partial"
                나머지 -> "unpaid"
```

### 세금계산서 기준

```
supply = Math.floor(total / 1.1)
tax = total - supply
// 합계 역산 방식 (accounting-specialist 검증)
```

---

## 성공 지표 (KPI)

| 지표 | 목표 | 달성 |
|------|------|------|
| 데이터 마이그레이션 정합성 (건수/금액) | 100% | 100% |
| 고객 중복 병합 정확도 | 99% 이상 | 달성 |
| 미수금 파악 소요 시간 | 30초 이내 | 달성 |
| 고객 상세 조회 시간 | 500ms 이내 | 달성 |
| 대시보드 KPI 산출 시간 | 1초 이내 | 달성 |
| 엑셀 보고서 생성 소요 시간 | 10초 이내 | 달성 |
| E2E 테스트 통과율 | 100% | 100% (28/28) |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-03-05 | CRM v2 전용 ROADMAP 분리 (메인 ROADMAP.md에서 독립) |
| 2026-03-05 | CRM-v2-고도화 Phase 1~6 완료 (19파일, 2340 insertions) |
| 2026-03-05 | CRM-012 보안+E2E 완료 (Playwright 28/28 통과) |
| 2026-03-05 | CRM-001~011 전체 완료 |
| 2026-03-04 | CRM-PRE Vanilla JS v1 완료 (카드형 명세표 + 미수금) |
| 2026-03-04 | Phase CRM 로드맵 초판 작성 |
