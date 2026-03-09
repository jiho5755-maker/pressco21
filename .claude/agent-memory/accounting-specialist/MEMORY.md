# accounting-specialist MEMORY

## CRM v2 회계 로직 확정 기준 (2026-03-07)

### payment_status 판정 기준 (확정)
- **기준: 이번 명세표 total 금액만** (prevBal 포함 금지)
- `total <= 0` → paid
- `paid >= total` → paid
- `paid > 0` → partial
- else → unpaid
- 근거: prevBal은 이전 명세표에 귀속된 채무이므로 이번 명세표 완납 여부와 무관

### 미수금(outstanding) 계산 기준 (확정)
- **개별 명세표 단위로 Math.max(0, total - paid) 후 합산**
- 초과입금이 다른 명세표 미수금을 상쇄하지 않도록 명세표 단위 0 하한 적용
- 고객 레코드 저장: `outstanding_balance = Σ max(0, total - paid) for unpaid/partial invoices`
- 주의: partial 판정 시 total - paid가 음수가 될 수 없음 (paid < total이 partial 조건)

### 합계 역산 공식 (accounting-specialist 확정, 세무사 기준)
- `supply = Math.floor(total / 1.1)` — 원 단위 절사
- `tax = total - supply`
- 세금계산서 발행 시: `Math.floor(supply / 10)` 절사 (부가가치세법 기준)

### 수금률 임계값 (도매업 기준, 2026-03-06 확정)
- EXCELLENT: 95% 이상 (양호)
- GOOD: 85~95% (도매업 정상)
- CAUTION: 70~85% (주의)
- DANGER: 70% 미만 (운전자금 압박)

### 에이징 구간 (도매업 표준)
- 30일 이내 / 31~60일 / 61~90일 / 91~180일 / 180일 초과
- 90일 초과 = CRITICAL (미수금 관리 페이지에서 별도 카운트)

### 미수금 경보 임계값 (accounting-specialist 확정)
- 거래처별: WARNING 30만원 / DANGER 100만원 / CRITICAL 300만원
- 전체합계: WARNING 500만원 / DANGER 1,000만원

## CRM v2 current_balance 설계 (2026-03-07 확정)
- `current_balance = total - paid` (이번 명세표 잔액만)
- prevBal을 포함하지 않음 (고객 누적 잔액은 customer.outstanding_balance로 관리)
- PaymentDialog 저장 시: `current_balance = remaining - input_amount`

## 거래내역 통합 설계 (2026-03-07 확정)
- 레거시(tbl_tx_history) + CRM 명세표(invoices) 클라이언트 병합
- CRM 명세표는 '출고(CRM)' 유형으로 구분 표시 (인디고 색상)
- CRM의 입금 이벤트는 거래내역 탭에 표시하지 않음 (미수금 탭에서만 관리)
- 병합 후 날짜 내림차순 정렬 → 클라이언트 페이지네이션(50건/페이지)

## 고객 통계 재계산 (recalcCustomerStats) 설계 (2026-03-07 확정)
- CRM: customer_id FK 기준 조회 (정확)
- 레거시: customer_name 문자열 매칭 (동명이인 위험 → 안내 문구 필요)
- 레거시는 tx_type=출고만 합산 (입금/반입/메모 제외)
- total_order_amount = legacyTotal + crmTotal (합산)
- last_order_date = max(crmLastDate, legacyLastDate)

## React Query 캐시 무효화 체크리스트 (2026-03-07 확정)
명세표 저장/수정 후 반드시 invalidate 필요한 쿼리:
- ['invoices'] — 명세표 목록
- ['invoice', invoiceId] — 수정된 명세표 개별 (수정 시만)
- ['invoiceItems', invoiceId] — 수정된 라인아이템 (수정 시만)
- ['receivables'] — 미수금 목록
- ['customers'] — 고객 목록
- ['dash-receivables'] — 대시보드 미수금 TOP10
- ['period-invoices-all'] — 대시보드 기간 리포트
- ['invoices-customer'] — 고객 상세 명세표 목록

## 파일 위치 (CRM v2 회계 관련)
- api.ts: `offline-crm-v2/src/lib/api.ts` — recalcCustomerStats, payment 로직
- InvoiceDialog.tsx: `offline-crm-v2/src/components/InvoiceDialog.tsx` — calcStatus
- Receivables.tsx: `offline-crm-v2/src/pages/Receivables.tsx` — PaymentDialog
- Transactions.tsx: `offline-crm-v2/src/pages/Transactions.tsx` — 통합 거래내역

## 운영 스키마 제약 (2026-03-09 확인)

- 운영 `invoices` 테이블에는 `paid_date` 컬럼이 없음
- 운영 `invoices` 테이블에는 `payment_method` 컬럼이 없음
- 운영 `invoice_date`는 NocoDB 서버측 `gte/lte` 날짜 비교가 안정적으로 동작하지 않음

### 구현상 의미

- `Receivables`는 `payment_status in (unpaid, partial)` 기준 조회 후 프론트에서 날짜를 거른다
- `Calendar`는 전체 명세표를 읽고 프론트에서 월/기간 필터링한다
- 명세표 저장/입금 저장 payload에 운영 스키마에 없는 필드는 보내지 않는다

### 회계 관점 주의

- 현재 운영에서는 과거 특정 기준일의 미수 상태를 정확한 회계 스냅샷으로 재현할 수 없다
- 이유: 입금 이력 테이블과 실제 수금일 컬럼이 없음
- 따라서 캘린더의 `기준일 미수 후속`은 **참고용 운영 뷰**로 취급해야 한다

## 2026-03-09 운영 검증값

- 2026-03-09 CRM 명세표: 8건
- 2026-03-09 현재 미수 명세표: 6건
- 미수금 관리 총액: 1,704,700원
- 캘린더 2026년 3월 총액: 1,810,260원
