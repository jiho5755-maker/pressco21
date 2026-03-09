# CRM Handoff - 2026-03-09

## Scope

2026-03-09까지 `offline-crm-v2`에서 진행한 주요 CRM 작업을 정리한다.

- 거래명세표 인쇄 데이터 최신화
- 고객 기본정보 수정 반영
- 거래명세표 인쇄 가독성 개선
- 제품/명세표 과세 기본값 설정 연동
- 새 명세표 UX 개선
- 캘린더 1단계, 2단계 고도화
- 캘린더/미수금 운영 데이터 정합성 복구

## Key Implementation Summary

### 1. 거래명세표 / 고객 데이터 반영

- 인쇄 시 목록 캐시값이 아니라 최신 명세표와 연결 고객 정보를 다시 읽도록 수정.
- `receipt_type`은 실테이블의 `status` 컬럼과 매핑되도록 정리.
- 고객 연락처/사업자/주소 스냅샷을 명세표 발행/인쇄에 일관되게 반영.
- 고객 수정 시 빈 문자열 삭제가 누락되지 않도록 `null` 직렬화로 보강.

관련 파일:

- `src/lib/api.ts`
- `src/components/InvoiceDialog.tsx`
- `src/pages/Invoices.tsx`
- `src/pages/CustomerDetail.tsx`
- `src/components/CustomerDialog.tsx`

### 2. 거래명세표 인쇄 개선

- 본문 폰트와 행 높이를 키워 고령 사용자 가독성 개선.
- 빈 2페이지가 생기던 인쇄/PDF 레이아웃을 조정.
- 절취선 제거.
- 설정의 입금계좌를 인쇄 하단에 실제 출력.

관련 파일:

- `src/lib/print.ts`

### 3. 설정 / 제품 / 새 명세표 UX

- 토스트를 우하단으로 이동하고 클릭 시 즉시 닫히도록 변경.
- 설정의 `default_taxable`을 새 제품/새 명세표 기본값에 연동.
- 새 명세표를 다시 열 때 이전 거래처 상태가 남지 않도록 다이얼로그 상태 초기화.
- 거래처 자동완성에 `ArrowUp/ArrowDown/Enter/Escape/Tab` 탐색 지원 추가.
- 검색 결과 없음 안내, 최근 거래처 빠른 선택, 임시저장/복구 추가.

관련 파일:

- `src/App.tsx`
- `src/components/ProductDialog.tsx`
- `src/components/InvoiceDialog.tsx`
- `src/lib/settings.ts`
- `src/pages/Invoices.tsx`
- `src/pages/Settings.tsx`

### 4. 캘린더 1단계 / 2단계

- Dashboard와 Calendar가 같은 기간 리포트 helper를 공유하도록 정리.
- 상단 기간 리포트에 `수금률`, `전년동월 대비`, `평균 객단가`, `일별 매출 차트` 추가.
- 날짜 클릭 시 `당일 명세표`, `기준일 미수 보기`, `이 날짜로 새 명세표 발행` 액션 추가.
- `Receivables`는 `asOf` query param, `Invoices`는 `date/new` query param을 지원.

관련 파일:

- `src/lib/reporting.ts`
- `src/pages/Calendar.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Receivables.tsx`
- `src/pages/Invoices.tsx`
- `src/components/InvoiceDialog.tsx`

### 5. 캘린더 / 미수금 운영 복구

운영에서 확인된 실제 제약:

- `invoices` 테이블에는 `paid_date`, `payment_method` 컬럼이 없음
- `invoice_date`는 NocoDB 서버측 `gte/lte` 날짜 비교가 안정적으로 동작하지 않음

그래서 최종 구현은 아래처럼 정리함:

- `Receivables`는 `payment_status in (unpaid, partial)` 기준 전체 조회 후 프론트에서 `asOf` 날짜 필터 적용
- `Receivables` 저장 payload에서 `paid_date` 전송 제거
- `Calendar`는 전체 명세표를 한 번 읽고 프론트에서 월/기간/전년동월 범위를 계산
- `기준일 미수 후속`도 현재 미수 명세표 전체를 읽고 기준일 이전 건만 노출

주의:

- 과거 기준일 미수 재현은 운영 스키마 한계 때문에 정확한 historical snapshot이 아니라 현재 미수 스냅샷 기반 참고용이다.

관련 파일:

- `src/pages/Receivables.tsx`
- `src/pages/Calendar.tsx`
- `src/components/InvoiceDialog.tsx`

## Operational Validation

직접 확인한 내용:

- 운영 `crm-proxy` 직접 조회:
  - 2026-03-09 명세표 8건 존재
  - 현재 미수 명세표 6건 존재
- 로컬 Vite 프록시 검증:
  - `미수금 관리`: 총 `1,704,700원 / 6건`
  - `캘린더`: 2026년 3월 `명세표 8건 / 1,810,260원`
  - `03-09` 셀: `8건 / 181만원 / 6건 미수`
- `npm run build` 통과
- 운영 재배포 완료: `https://crm.pressco21.com`

## Remaining Risks

- 운영 스키마에 `paid_date`가 없어서 과거 기준일 미수는 정확한 as-of 회계 재현이 아님.
- 운영 스키마에 `invoice_date` 서버 날짜 비교가 안정적이지 않아, 캘린더는 전체 명세표 조회 후 프론트 필터링을 사용 중.
- 동일 상호 고객 다중 존재 시 exact-name hydrate 품질 한계는 유지됨.

## Recommended Next Step

1. 운영 `invoices` 스키마에 실제 수금일 컬럼 추가 여부 결정
2. 가능하면 `/crm-proxy` 또는 서버측 API에서 날짜 범위 집계를 직접 지원
3. 캘린더 3단계: 최근 미주문 고객 / 고액 미수 고객 추천과 액션 버튼 추가
