# PRD: PRESSCO21 Offline CRM v2 고도화

> **Version**: 1.0 | **Date**: 2026-03-05
> **Author**: Claude (6개 전문가 에이전트 종합)
> **Status**: 승인 완료 — 구현 대기

---

## 1. 배경 및 목적

### 1.1 현황

Vanilla JS CRM(`offline-crm/`)을 React+TypeScript로 이전한 v2(`offline-crm-v2/`)가 Phase 0~CRM-012 완료 상태이나:

- **3개 페이지 미구현**: 제품관리/공급처/거래내역이 플레이스홀더 컴포넌트
- **v1 핵심 UX 17개 누락**: 상품 자동완성, 단가등급, 합계 역산, 로고/도장, 캘린더 등
- **보안 미비**: 입력값 미검증 3곳, CORS 설정 미흡, 토큰 노출 이력
- **UI 인프라 부족**: `alert()` 남용, 설정 페이지 없음, 인쇄 이미지 누락

### 1.2 목표

v1의 사용성 장점을 100% 살리면서 React 장점(타입 안전성, 컴포넌트 재사용, 상태 관리)을 결합하여 실제 현업에서 완전히 대체 가능한 수준으로 고도화한다.

### 1.3 데이터 규모

| 테이블 | 건수 | 용도 | 비고 |
|--------|------|------|------|
| tbl_Customers | 15,830 | 고객/거래처 | ACTIVE 311, DORMANT 335, CHURNED 15,184 |
| products | 3,008 | 제품 | price1~price8 8단가 |
| tbl_tx_history | 97,086 | 거래내역 | 2013~2026, **읽기 전용** |
| invoices + items | 가변 | 거래명세표 + 라인아이템 | CRUD 전체 |
| suppliers | 소수 | 공급처 | CRUD 전체 |

### 1.4 기술 스택 (현행)

- **프레임워크**: React 19 + TypeScript + Vite
- **데이터 페칭**: @tanstack/react-query
- **API 레이어**: NocoDB v2 API via n8n webhook proxy (`/crm-proxy`)
- **UI**: shadcn/ui + Tailwind CSS + Lucide React
- **부가**: Recharts(차트), ExcelJS(.xlsx), sonner(토스트)
- **테스트**: Playwright E2E (현재 28건 통과)

---

## 2. 에이전트 오케스트레이션 총괄

### 2.1 투입 에이전트 배치표

| Phase | 태스크 | 패턴 | 에이전트 | 역할 |
|-------|--------|------|----------|------|
| 1-1 | 토스트 시스템 | A: Claude 직접 | — | 기술 구현 |
| 1-2 | 설정 페이지 | B: 에이전트 선호출 | `brand-planning-expert` | 섹션 구조/UX 카피 |
| 1-3 | 인쇄 로고/도장 | B: 에이전트 선호출 | `brand-planning-expert` | 시각적 위계/배치 기준 |
| 2 | API 타입 확장 | A: Claude 직접 | — | 인터페이스 확장 |
| 3-1 | 거래내역 | A: Claude 직접 | — | Customers.tsx 패턴 복제 |
| 3-2 | 제품 관리 | A: Claude 직접 | — | CRUD 페이지 |
| 3-3 | 공급처 관리 | A: Claude 직접 | — | CRUD 페이지 |
| 4-1 | 단가등급+상품자동완성 | C: 병렬 | `ecommerce-business-expert` + `accounting-specialist` | 등급 기준/세금 계산 검증 |
| 4-2 | 합계 역산 | B: 에이전트 선호출 | `accounting-specialist` | 역산 로직 회계 검증 |
| 4-3 | 명세표 삭제/복사 | A: Claude 직접 | — | CRUD 기술 구현 |
| 4-4 | 잔액 자동 재계산 | B: 에이전트 선호출 | `accounting-specialist` | 재계산 로직/동시성 |
| 4-5 | 저장 안전장치 | A: Claude 직접 | — | UX 기술 구현 |
| 4-6 | 목록 인라인 액션 | A: Claude 직접 | — | UI 기술 구현 |
| 5-1 | 고객 CRUD Dialog | A: Claude 직접 | — | CRUD 페이지 |
| 5-2 | 거래처 카드+최근거래 | A: Claude 직접 | — | UI 기술 구현 |
| 6-1 | 캘린더 뷰 | A: Claude 직접 | — | v1 이식 |
| 6-2 | 기간 매출 리포트 | B: 에이전트 선호출 | `accounting-specialist` | KPI 공식 검증 |
| 7 | 보안 강화 | C: 병렬 | `security-hardening-expert` + `qa-test-expert` | 보안 감사+테스트 |

### 2.2 에이전트 분석 완료 현황

| 에이전트 | 분석 완료 | 핵심 산출물 |
|----------|----------|------------|
| `ecommerce-business-expert` | ✅ | 5단계 단가등급, 이중축 고객등급, KPI 8개, LTV 공식 |
| `accounting-specialist` | ✅ | 역산 로직 검증, 에이징 5구간 적합 확인, 잔액 재계산 설계, 번호체계 |
| `brand-planning-expert` | ✅ | 페이지별 UX 카피, 등급 네이밍(꽃 메타포), 설정 4섹션, 인쇄 배치, CHURNED 회색 변경 |
| `security-hardening-expert` | ✅ | 즉시조치 3건, 배포전 4건, NocoDB 검색어 sanitize 함수 |
| `qa-test-expert` | ✅ | 테스트 피라미드 설계, Phase별 E2E 55건, vitest 30건, 성능 SLA |
| `customer-experience-specialist` | ✅ | 유형별 CS 캘린더, 독촉 5단계, 이탈방지 세그먼트 (CRM v3 예정) |

---

## 3. Phase 1: 공통 인프라

### 3.1 토스트 알림 시스템 [Small]

**목적**: `alert()` 전체 교체 — 사용자 워크플로우 차단 없이 상태 전달

**구현 사항**:
- `sonner` 라이브러리 (이미 설치 완료) Toaster 컴포넌트를 `App.tsx` 루트에 추가
- 모든 `alert()` 호출 → `toast.success()` / `toast.error()` / `toast.warning()` 교체

**토스트 톤 가이드** (brand-planning-expert):

| 유형 | 메시지 | 표시 시간 |
|------|--------|----------|
| 성공 | "명세표가 저장되었습니다" | 3초 |
| 실패 | "저장하지 못했습니다. 잠시 후 다시 시도해주세요" | 5초 |
| 경고 | "거래처를 입력해주세요" | 4초 |
| 삭제 완료 | "명세표가 삭제되었습니다" | 3초 |

**수정 파일**: `src/App.tsx`, `src/components/InvoiceDialog.tsx`, `src/pages/Receivables.tsx`, `src/pages/CustomerDetail.tsx`

---

### 3.2 설정 페이지 [Small]

**목적**: 거래명세표 인쇄 정보 및 시스템 기본값 중앙 관리

**4개 섹션** (brand-planning-expert):

#### 섹션 1: 공급자 정보
| 필드 | 도움말 |
|------|--------|
| 상호 | 거래명세표 상단 왼쪽에 표시됩니다 |
| 대표자 | 명세표 서명란에 표시됩니다 |
| 사업자번호 | 123-45-67890 형식 |
| 업태 | 예: 도소매 |
| 종목 | 예: 공예재료 |
| 연락처 | — |
| 주소 | — |

#### 섹션 2: 인쇄 설정
| 필드 | 설명 |
|------|------|
| 로고 이미지 | 거래명세표 좌상단 표시 (PNG/JPG 권장) |
| 도장 이미지 | 우하단 원형 인감 표시 (JPG 권장, 인감 빨강) |
| 머릿글 | 명세표 상단 추가 문구 |
| 꼬릿글 | 명세표 하단 추가 문구 (입금 안내 등) |

#### 섹션 3: 입금 계좌
| 필드 | 설명 |
|------|------|
| 은행명 | "명세표 하단에 자동 표시됩니다" |
| 계좌번호 | — |
| 예금주 | — |

#### 섹션 4: 시스템 설정
| 필드 | 선택지 | 기본값 |
|------|--------|--------|
| 기본 과세 여부 | 과세 / 면세 | 과세(Y) |
| 기본 결제 방법 | 계좌이체 / 카드 / 현금 | 계좌이체 |

**기존 활용**: `src/lib/print.ts`의 `CompanyInfo` 인터페이스 + `loadCompanyInfo()` / `saveCompanyInfo()` 이미 존재 → Settings.tsx에서 직접 활용

**신규 파일**: `src/pages/Settings.tsx`
**수정 파일**: `src/App.tsx` (라우트 `/settings` 추가), `src/components/layout/Sidebar.tsx` (메뉴 추가)

---

### 3.3 인쇄 로고/도장 복원 [Small]

**목적**: v1에서 사용 중인 회사 로고/도장 이미지를 v2 인쇄물에 복원

**이미지 경로**:
- 원본: `offline-crm/images/company-logo.png`, `offline-crm/images/company-stamp.jpg`
- 복사 대상: `public/images/company-logo.png`, `public/images/company-stamp.jpg`

**배치 기준** (brand-planning-expert):
- **로고**: 좌상단 (공급자 상호 옆) — 시선 진입점
- **도장**: 우하단 ("위 금액을 영수함" 옆) — 마무리 확인

**도장 CSS 스펙**:
```css
/* 도장 인감 효과 */
width: 100px;
height: 100px;
border-radius: 50%;
transform: rotate(-15deg);
mix-blend-mode: multiply;
clip-path: circle(40% at 50% 46%);
/* 색상: 인감 빨강 #c63c3c — 세이지 그린은 인감으로 인식 불가 (brand-planning-expert) */
```

**이미지 프리로드**: fetch → dataURL 캐시 방식 (인쇄 시 이미지 누락 방지)

```typescript
// src/lib/print.ts 추가 패턴
async function loadImageAsDataURL(src: string): Promise<string> {
  const response = await fetch(src)
  const blob = await response.blob()
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}
```

**수정 파일**: `src/lib/print.ts`

---

## 4. Phase 2: API 타입 확장 + 보안

### 4.1 Product 인터페이스 확장

```typescript
// src/lib/api.ts
interface Product {
  Id: number
  product_code: string    // 품목 코드 (필수)
  name: string            // 품목명 (필수)
  alias?: string          // 별칭 (자동완성 검색 대상)
  category?: string       // 카테고리
  unit?: string           // 단위 (개/묶음/박스 등)
  purchase_price?: number // 매입가
  price1: number          // 씨앗 — 소매가 (MEMBER, 기본)
  price2?: number         // 뿌리 — 강사우대가 (INSTRUCTOR, 10~15%)
  price3?: number         // 꽃밭 — 파트너도매가 (PARTNERS, 20~25%)
  price4?: number         // 정원사 — VIP특가 (30~35%)
  price5?: number         // 별빛 — 엠버서더 고정가 (30%)
  price6?: number         // 예비 6
  price7?: number         // 예비 7
  price8?: number         // 예비 8
  is_taxable?: boolean    // 과세여부
  is_active?: boolean     // 활성여부
}
```

**신규 CRUD 함수**:
- `getProducts(params)`: 검색 + 페이지네이션
- `getProduct(id)`: 단건 조회
- `createProduct(data)`: 생성
- `updateProduct(id, data)`: 수정
- `deleteProduct(id)`: soft delete (`is_active = false`)

**단가 조회 유틸 함수**:
```typescript
function getPriceByTier(product: Product, tier: number): number {
  const key = `price${tier}` as keyof Product
  return (product[key] as number | undefined) ?? product.price1
}
```

---

### 4.2 Supplier 인터페이스 확장

```typescript
// src/lib/api.ts
interface Supplier {
  Id: number
  name: string            // 상호 (필수)
  business_no?: string    // 사업자번호
  ceo_name?: string       // 대표자
  phone1?: string         // 전화
  mobile?: string         // 핸드폰
  email?: string
  address1?: string       // 주소
  bank_name?: string      // 은행명
  bank_account?: string   // 계좌번호
  memo?: string
  is_active?: boolean     // 활성여부
}
```

**신규 CRUD 함수**: `getSuppliers()`, `getSupplier(id)`, `createSupplier(data)`, `updateSupplier(id, data)`, `deleteSupplier(id)`

---

### 4.3 Customer 인터페이스 보강

**신규 필드** (accounting-specialist — 전자세금계산서 대비):

```typescript
// 기존 Customer 인터페이스에 추가
interface Customer {
  // ... 기존 필드 유지 ...
  mobile?: string         // 핸드폰 (다중필드 검색 대상)
  price_tier?: number     // 단가등급 1~5 (기본값: 1)
  biz_no?: string         // 사업자번호
  ceo_name?: string       // 대표자명
  biz_type?: string       // 업태
  biz_item?: string       // 종목
}
```

**검색 확장**: 기존 `name` 단일 → `name OR phone OR mobile` 다중필드

```typescript
// NocoDB 쿼리 패턴
where: `(name,like,%${q}%)~or(phone,like,%${q}%)~or(mobile,like,%${q}%)`
```

---

### 4.4 보안: 입력값 sanitize 함수 (security-hardening-expert)

```typescript
// src/lib/api.ts 또는 src/lib/utils.ts

/**
 * NocoDB 검색어 특수문자 제거
 * ~ ( ) , \ 는 NocoDB 쿼리 연산자로 인식되어 SQL 오류 또는 의도치 않은 필터 유발
 */
export function sanitizeSearchTerm(term: string): string {
  return term.replace(/[~(),\\]/g, '').trim().slice(0, 100)
}

/**
 * 금액/수량 입력 범위 검증
 * 0 이상 10억 이하의 정수만 허용
 */
export function sanitizeAmount(value: string | number): number {
  const n = typeof value === 'string' ? Number(value) : value
  if (isNaN(n) || !isFinite(n)) return 0
  return Math.max(0, Math.min(Math.floor(n), 1_000_000_000))
}
```

**적용 위치**:
- `src/pages/Customers.tsx`: 검색 입력
- `src/components/InvoiceDialog.tsx`: 검색 입력 + 금액/수량 입력
- `src/pages/CustomerDetail.tsx`: 검색 입력

**수정 파일**: `src/lib/api.ts`

---

## 5. Phase 3: 플레이스홀더 페이지 구현

### 5.1 거래내역 — Transactions.tsx [Medium]

**목적**: 97,086건 레거시 거래 데이터 조회 (읽기 전용, tbl_tx_history)

**주요 기능**:
- 검색: 거래처명 debounce 검색 (300ms)
- 필터: 유형(출고/입금/반입/메모) + 기간(시작일~종료일)
- 페이지네이션: 50건/페이지 (97K건 대응)
- 테이블 컬럼: 날짜, 거래처, 유형(색상 배지), 금액(콤마 포맷), 세액, 전표번호, 메모

**유형 색상 배지**:
| 유형 | 색상 |
|------|------|
| 출고 | 파랑(blue-100) |
| 입금 | 초록(green-100) |
| 반입 | 주황(orange-100) |
| 메모 | 회색(gray-100) |

**빈 상태 카피** (brand-planning-expert): "조건에 맞는 거래내역이 없습니다. 검색어나 필터를 변경해보세요."

**성능 SLA** (qa-test-expert): 첫 페이지 로드 < 5초, 페이지 전환 < 3초

**구현 패턴**: `src/pages/Customers.tsx`와 동일 (`useQuery` + `useDebounce` + 페이지네이션)

**수정 파일**: `src/pages/Transactions.tsx` (전체 재작성)

---

### 5.2 제품 관리 — Products.tsx [Large]

**목적**: products 3,008건 조회/관리

**주요 기능**:
- 검색: 품목명 + 코드 복합 검색 (debounce 300ms)
- 필터: 카테고리 드롭다운 필터
- 페이지네이션: 25건/페이지
- CRUD: 생성/수정/삭제 (soft delete)
- 테이블 컬럼: 코드, 품목명, 별칭, 카테고리, 단위, 단가1~4, 과세, 활성

**ProductDialog 명세**:
- 생성/수정 공용 모달
- 필수 필드: `name`, `product_code`
- 선택 필드: 별칭, 카테고리, 단위, 매입가
- 단가 섹션: price1~5 (씨앗~별빛) 전부 편집 가능
- price6~8: DB 컬럼 유지, UI에서 비활성 (향후 확장용)
- 과세/활성 토글 스위치

**신규 파일**: `src/components/ProductDialog.tsx`
**수정 파일**: `src/pages/Products.tsx`

---

### 5.3 공급처 관리 — Suppliers.tsx [Medium]

**목적**: 공급처 정보 관리 (CRUD)

**테이블 컬럼**: 상호, 대표자, 사업자번호, 전화, 이메일, 은행, 계좌번호, 메모

**SupplierDialog 명세**:
- 생성/수정 공용 모달
- 전체 12필드 편집
- 필수 필드: `name`

**신규 파일**: `src/components/SupplierDialog.tsx`
**수정 파일**: `src/pages/Suppliers.tsx`

---

## 6. Phase 4: 명세표 고도화

### 6.1 단가등급 + 상품 자동완성 [Large]

#### 단가등급 체계 (ecommerce-business-expert)

| 등급 번호 | 필드 | 대상 고객 | 할인율 | 네이밍 (brand-planning-expert) |
|-----------|------|-----------|--------|-------------------------------|
| 1등급 | price1 | MEMBER (일반 회원) | 0% — 소매가 기준 | 씨앗 |
| 2등급 | price2 | INSTRUCTOR (인스트럭터) | 10~15% | 뿌리 |
| 3등급 | price3 | PARTNERS (파트너스) | 20~25% | 꽃밭 |
| 4등급 | price4 | VIP | 30~35% (상한) | 정원사 |
| 5등급 | price5 | AMBASSADOR (엠버서더) | 30% 고정 | 별빛 |

- **신규 고객 기본**: 1등급(씨앗). 등급 전환은 관리자 수동 승인 (ecommerce-business-expert)
- **price6~8**: 예비. DB 컬럼 유지, UI에서 비활성

#### 상품 자동완성 구현

```
품목명 input
  → debounce 250ms
  → NocoDB products like 검색 (name, alias 복합)
  → 드롭다운 표시: [코드] 품목명 — 단가X원 (해당 등급)
  → 항목 선택
  → getPriceByTier(product, customer.price_tier) → 단가 자동 세팅
  → 과세 여부도 product.is_taxable 기준으로 자동 세팅
```

**수정 파일**: `src/components/InvoiceDialog.tsx`, `src/lib/api.ts`

---

### 6.2 합계 역산 [Medium]

**목적**: v1과 동일한 "합계 입력 → 공급가/세액 역산" 방식 복원

**역산 로직** (accounting-specialist 검증 완료):

```
[과세 품목 — 합계 입력 시 역산]
  공급가액 = Math.floor(합계 / 1.1)
  세액 = 합계 - 공급가액      ← 정합성 보장 (floor(공급*0.1)과 최대 1원 차이 허용)

[수량 변경 시 역산]
  _totalUnit = 이전 합계 / 이전 수량  (hidden 상태값, 수량 역산 기준)
  공급가액 = Math.floor(_totalUnit × 신규수량)
  세액 = Math.floor(공급가액 / 10)

[면세 품목]
  세액 = 0 고정
  공급가액 = 합계 그대로
```

**구현 방식**: InvoiceDialog 라인 아이템별 `_totalUnit` 상태값 관리

**수정 파일**: `src/components/InvoiceDialog.tsx`

---

### 6.3 명세표 삭제/복사 [Medium]

#### 삭제 흐름
```
[삭제] 버튼 클릭
  → shadcn AlertDialog: "이 명세표를 삭제하시겠습니까? 삭제 후에는 되돌릴 수 없습니다."
  → 확인 클릭
  → bulk DELETE invoice items (라인아이템 전체)
  → DELETE /invoices/{id}
  → recalcCustomerBalance(customerId)
  → toast.success("명세표가 삭제되었습니다")
  → 목록 새로고침
```

#### 복사 흐름
```
[복사] 버튼 클릭
  → 기존 명세표 데이터 프리필
  → 발행번호: INV-YYYYMMDD-HHMMSS (새 번호 자동 생성)
  → 발행일: 오늘 날짜
  → InvoiceDialog 열기 (수정 모드)
```

**수정 파일**: `src/pages/Invoices.tsx`, `src/components/InvoiceDialog.tsx`, `src/lib/api.ts`

---

### 6.4 잔액 자동 재계산 [Small]

**목적**: 명세표 CRUD 발생 시 고객 미수금 잔액 자동 갱신

**로직** (accounting-specialist):

```typescript
async function recalcCustomerBalance(customerId: number): Promise<void> {
  // 1. 해당 고객의 미완납 명세표 전체 조회 (payment_status !== 'paid')
  const unpaidInvoices = await getInvoicesByCustomer(customerId, { status: 'unpaid,partial' })

  // 2. 각 건의 미수금 합산 (total_amount - paid_amount)
  const totalOutstanding = unpaidInvoices.reduce(
    (sum, inv) => sum + (inv.total_amount - (inv.paid_amount ?? 0)),
    0
  )

  // 3. tbl_Customers.outstanding_balance PATCH
  await updateCustomer(customerId, { outstanding_balance: totalOutstanding })
}
```

**호출 시점** (총 4곳):
1. 명세표 생성 완료 후
2. 명세표 수정 저장 후
3. 명세표 삭제 후
4. Receivables 페이지 입금 확인 후

**동시성**: Last-Write-Wins 전략 — 1~2명 동시 사용 규모에 충분 (accounting-specialist)

**tbl_tx_history 연동**: 분리 운영. `customer_name` 문자열 기반, FK 없음 (레거시 참조 전용)

**수정 파일**: `src/components/InvoiceDialog.tsx`, `src/pages/Receivables.tsx`, `src/lib/api.ts`

---

### 6.5 저장 안전장치 + 키보드 단축키 [Small]

**저장 안전장치**:
```typescript
// InvoiceDialog에서 isDirty 플래그 관리
const [isDirty, setIsDirty] = useState(false)

// 닫기 시도 시
const handleClose = () => {
  if (isDirty) {
    const confirmed = window.confirm("저장하지 않은 내용이 있습니다. 그래도 닫으시겠습니까?")
    if (!confirmed) return
  }
  onClose()
}
```

**키보드 단축키**:
| 단축키 | 동작 |
|--------|------|
| Ctrl+Enter | 발행 완료 (저장) |
| Esc | Dialog 닫기 (isDirty 체크 포함) |

**수정 파일**: `src/components/InvoiceDialog.tsx`

---

### 6.6 목록 인라인 액션 [Small]

**목적**: 명세표 목록 각 행에 [인쇄] [복사] [삭제] 버튼 노출 (v1 UX 복원)

```tsx
// Invoices.tsx 테이블 행 액션 컬럼
<TableCell>
  <div className="flex gap-1">
    <Button size="xs" variant="ghost" onClick={() => handlePrint(invoice)}>
      인쇄
    </Button>
    <Button size="xs" variant="ghost" onClick={() => handleCopy(invoice)}>
      복사
    </Button>
    <Button size="xs" variant="ghost" className="text-red-500"
      onClick={() => handleDelete(invoice)}>
      삭제
    </Button>
  </div>
</TableCell>
```

- **인쇄**: Dialog 없이 직접 `printDuplexViaIframe()` 호출
- **복사**: 6.3 복사 흐름 실행
- **삭제**: 6.3 삭제 흐름 실행

**수정 파일**: `src/pages/Invoices.tsx`

---

## 7. Phase 5: 고객 고도화

### 7.1 고객 CRUD Dialog [Medium]

**목적**: v2에서 누락된 고객 생성/수정 기능 추가

**CustomerDialog 전체 필드**:
```
필수: name (거래처명)
선택: phone, mobile, email, address
분류: customer_type (개인/법인), customer_status (ACTIVE/DORMANT/CHURNED)
등급: price_tier (1~5), member_grade (꽃 메타포 배지)
사업자: biz_no, ceo_name, biz_type, biz_item
기타: memo
```

**진입 경로**:
- `src/pages/Customers.tsx`: "새 고객" 버튼 → 생성 모드
- `src/pages/CustomerDetail.tsx`: 기본정보 탭 "수정" 버튼 → 수정 모드

**신규 파일**: `src/components/CustomerDialog.tsx`
**수정 파일**: `src/pages/Customers.tsx`, `src/pages/CustomerDetail.tsx`

---

### 7.2 거래처 카드 + 최근 거래 패널 [Small]

**목적**: InvoiceDialog 고객 선택 시 컨텍스트 정보 즉시 표시

**거래처 카드 구성**:
```
┌─────────────────────────────────────┐
│ [등급 배지] 거래처명                  │
│ 전화: 010-xxxx-xxxx                  │
│ 주소: 서울시 ...                      │
│ 단가등급: 꽃밭(3등급)                 │
└─────────────────────────────────────┘
```

**최근 거래 5건 미니 테이블**:
| 발행일 | 발행번호 | 금액 |
|--------|----------|------|
| 2026-03-01 | INV-20260301-... | 150,000원 |
| ... | ... | ... |

**수정 파일**: `src/components/InvoiceDialog.tsx`

---

### 7.3 고객 등급 배지 색상 (brand-planning-expert)

**CHURNED 배지 색상 변경**:
- 변경 전: 빨강(#ef4444)
- 변경 후: 회색(#94a3b8)
- 이유: 이탈은 자연 라이프사이클. 빨강은 미수금 등 **즉각 대응이 필요한 상황**에만 예약

**전체 등급 색상 체계**:
```typescript
// src/lib/constants.ts
export const GRADE_COLORS = {
  MEMBER: '#a8b5a0',      // 연두회색
  INSTRUCTOR: '#7d9675',  // 세이지 그린 (브랜드 컬러)
  PARTNERS: '#5e8a6e',    // 진한 세이지
  VIP: '#b89b5e',         // 골드
  AMBASSADOR: '#8b6fae',  // 퍼플
  CHURNED: '#94a3b8',     // 회색 (이탈, 자연 라이프사이클)
}
```

**수정 파일**: `src/lib/constants.ts`

---

## 8. Phase 6: 캘린더 + 기간 리포트

### 8.1 캘린더 뷰 [Large] — ✅/⬜ 혼합

**목적**: v1 월간 캘린더 React 이식

**구현 기능** (⬜ 미구현):
- 7열 그리드 월간 달력 (일~토)
- 각 날짜 셀: 발행 건수 + 합계 금액 표시
- 오늘 날짜 강조 (배경색 + 테두리)
- 날짜 클릭 → 오른쪽 사이드바에 해당일 명세표 목록
- 월 이동: 이전달/다음달 버튼
- 고객 필터 드롭다운 (선택 시 해당 고객 거래만 표시)

**월간 요약 바** (⬜ 미구현):
| 항목 | 설명 |
|------|------|
| 발행 건수 | N건 |
| 총 매출액 | N,NNN,NNN원 |
| 거래 일수 | N일 |
| 건당 평균 | N,NNN원 |
| 상위 날짜 TOP5 | 매출 기준 상위 5일 강조 |

**신규 파일**: `src/pages/Calendar.tsx`
**수정 파일**: `src/App.tsx` (라우트 `/calendar`), `src/components/layout/Sidebar.tsx`

---

### 8.2 기간 매출 리포트 [Medium] — ⬜ 미구현

**목적**: 특정 기간의 매출 집계 및 KPI 대시보드

**퀵 프리셋**:
- 이번달 / 지난달 / 이번분기 / 올해

**직접 입력**: from~to 날짜 범위 선택

**기본 결과 항목**:
- 발행 건수
- 공급가액 합계
- 세액 합계
- 최종 합계

**추가 KPI** (ecommerce-business-expert):

| KPI | 공식 | 경보 기준 |
|-----|------|----------|
| 수금률 | 수금액 / 발행액 × 100 | 70% 미만 경보 |
| 전년 동월 대비 | (당월 - 전년 동월) / 전년 동월 × 100 | -10% 이하 경보 |
| 고객당 평균 매출 | 총 매출 / 거래 고객 수 | 추이 모니터링 |
| 신규 고객 수 | 기간 내 첫 거래 고객 수 | — |

**위치**: 별도 페이지 또는 Dashboard 섹션 추가 결정 필요

> ⬜ **미구현**: 기간 매출 리포트 전체 — `accounting-specialist` 추가 검토 후 구현

---

## 9. Phase 7: 보안 강화

### 9.1 즉시 조치 (Phase 2와 함께 적용)

| 항목 | 심각도 | 조치 방법 |
|------|--------|----------|
| NocoDB 검색어 특수문자 sanitize | MEDIUM | `sanitizeSearchTerm()` 3곳 적용 |
| 금액/수량 입력 범위 검증 | MEDIUM | `sanitizeAmount()` InvoiceDialog 적용 |
| 프로덕션 빌드 console 제거 | LOW | `vite.config.ts` `build.minify: 'terser'` + `drop_console: true` |

### 9.2 배포 전 필수 조치 (security-hardening-expert)

| 항목 | 심각도 | 조치 방법 |
|------|--------|----------|
| CORS 도메인 제한 | HIGH | n8n 프록시 `Access-Control-Allow-Origin: *` → 특정 도메인으로 변경 |
| 서버사이드 프록시 전환 | HIGH | `VITE_CRM_API_KEY`를 클라이언트 번들에서 제거, 서버에만 보관 |
| CSP 헤더 추가 | MEDIUM | `index.html` meta 태그 또는 서버 응답 헤더 |
| NocoDB 토큰 재발급 | HIGH | git history 노출 건 → 토큰 키 로테이션 |

### 9.3 현재 양호 사항

- `dangerouslySetInnerHTML` 0건
- `eval` / `Function()` 0건
- `src/lib/print.ts`의 `esc()` HTML 이스케이프 적용
- localStorage에 고객 PII(개인 식별 정보) 미저장
- n8n 프록시: 테이블/메서드 화이트리스트 구현 완료

---

## 10. QA 테스트 전략

### 10.1 테스트 피라미드 (qa-test-expert)

| 레이어 | 현재 | 목표 | 도구 |
|--------|------|------|------|
| Unit | 0 | ~30 | vitest |
| Integration | 0 | ~15 | vitest + MSW |
| E2E | 28 | ~55 | Playwright |
| 성능 | 0 | ~8 | Playwright |
| 접근성 | 0 | ~10 | Playwright |
| **합계** | **28** | **~118** | |

### 10.2 vitest 도입 대상 (P0)

| 파일 | 테스트 항목 |
|------|------------|
| `src/lib/excel.ts` | 데이터 변환 매핑, null 폴백 |
| `src/lib/print.ts` | `esc()` XSS 이스케이프, 잔액 계산 |
| `src/lib/api.ts` | `proxyRequest` 에러 분기 |
| Phase 4 신규 함수 | 역산 로직, 잔액 재계산 |
| `sanitizeSearchTerm` | NocoDB 특수문자 제거 |
| `sanitizeAmount` | 범위 검증 경계값 |
| `getPriceByTier` | tier 1~8 + 폴백 |

### 10.3 Phase별 E2E 신규 테스트 파일

| 파일 | Phase | 건수 | 핵심 시나리오 |
|------|-------|------|-------------|
| `tests/04-transactions.spec.ts` | 3-1 | 8건 | 검색+필터+페이지네이션+97K건 성능 |
| `tests/05-products.spec.ts` | 3-2 | 8건 | CRUD+8단가 편집+검색 |
| `tests/06-suppliers.spec.ts` | 3-3 | 7건 | CRUD 전체 흐름 |
| `tests/07-invoice-advanced.spec.ts` | 4 | 9건 | 자동완성→단가→역산→잔액 E2E |
| `tests/08-customer-crud.spec.ts` | 5 | 6건 | 고객 생성/수정/삭제 방어 |
| `tests/09-calendar.spec.ts` | 6 | 5건 | 캘린더+기간리포트 |
| `tests/10-performance.spec.ts` | 횡단 | 8건 | SLA 검증 |
| `tests/11-accessibility.spec.ts` | 횡단 | 10건 | ARIA+키보드+스크린리더 |

### 10.4 성능 SLA

| 동작 | 기준 |
|------|------|
| 페이지 최초 로드 | < 5초 |
| 페이지네이션 전환 | < 3초 |
| 검색 결과 반환 | < 3초 |
| Dialog 열기 | < 1초 |
| CRUD 저장 | < 5초 |
| 대시보드 KPI | < 8초 |

### 10.5 테스트 데이터 격리

- 접두사 표준화: `TEST-E2E-` + 타임스탬프
- `tests/fixtures/cleanup.ts`: `globalTeardown`에서 TEST-E2E- 접두사 데이터 자동 정리
- 기존 T2-09 개선: 수동 삭제 → `afterAll` 자동 cleanup

---

## 11. UX 카피 가이드라인 (brand-planning-expert)

### 11.1 페이지별 설명문

| 페이지 | 헤더 설명문 |
|--------|------------|
| 대시보드 | "한눈에 보는 이번 달 현황" |
| 고객 관리 | "거래처 15,830곳 \| 활성 311곳 \| 휴면 335곳" |
| 거래명세표 | "이번 달 발행 N건 \| 전체 N건" |
| 미수금 | 에이징 라벨: 정상 / 주의 / 경고 / 장기미수 / 위험 |
| 제품 관리 | "등록 제품 N,NNN건 \| 활성 N건" |
| 거래내역 | "전체 거래내역 97,086건 (읽기 전용)" |

### 11.2 빈 상태 메시지

| 페이지 | 빈 상태 메시지 |
|--------|--------------|
| 거래내역 | "조건에 맞는 거래내역이 없습니다. 검색어나 필터를 변경해보세요." |
| 명세표 | "발행된 명세표가 없습니다. 새 명세표를 만들어보세요." |
| 미수금 | "미수금이 없습니다. 모든 거래가 정산 완료되었습니다." |
| 제품 | "등록된 제품이 없습니다." |
| 공급처 | "등록된 공급처가 없습니다." |

### 11.3 확인 다이얼로그 문구

| 상황 | 문구 |
|------|------|
| 명세표 삭제 | "이 명세표를 삭제하시겠습니까? 삭제 후에는 되돌릴 수 없습니다." |
| 저장 안 하고 닫기 | "저장하지 않은 내용이 있습니다. 그래도 닫으시겠습니까?" |
| 제품 삭제 | "이 제품을 비활성 처리하시겠습니까?" |

---

## 12. 구현 현황 요약

### Phase별 완료 상태

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 1-1 | 토스트 알림 시스템 | ⬜ 미구현 |
| Phase 1-2 | 설정 페이지 | ⬜ 미구현 |
| Phase 1-3 | 인쇄 로고/도장 복원 | ⬜ 미구현 |
| Phase 2 | API 타입 확장 + 보안 함수 | ⬜ 미구현 |
| Phase 3-1 | 거래내역 (Transactions.tsx) | ⬜ 미구현 (플레이스홀더) |
| Phase 3-2 | 제품 관리 (Products.tsx) | ⬜ 미구현 (플레이스홀더) |
| Phase 3-3 | 공급처 관리 (Suppliers.tsx) | ⬜ 미구현 (플레이스홀더) |
| Phase 4-1 | 단가등급 + 상품 자동완성 | ⬜ 미구현 |
| Phase 4-2 | 합계 역산 | ⬜ 미구현 |
| Phase 4-3 | 명세표 삭제/복사 | ⬜ 미구현 |
| Phase 4-4 | 잔액 자동 재계산 | ⬜ 미구현 |
| Phase 4-5 | 저장 안전장치 + 단축키 | ⬜ 미구현 |
| Phase 4-6 | 목록 인라인 액션 | ⬜ 미구현 |
| Phase 5-1 | 고객 CRUD Dialog | ⬜ 미구현 |
| Phase 5-2 | 거래처 카드 + 최근 거래 | ⬜ 미구현 |
| Phase 5-3 | 고객 등급 배지 색상 | ⬜ 미구현 |
| Phase 6-1 | 캘린더 뷰 | ⬜ 미구현 |
| Phase 6-2 | 기간 매출 리포트 | ⬜ 미구현 |
| Phase 7 | 보안 강화 | ⬜ 미구현 (즉시조치 일부 포함) |

---

## 13. 구현 순서 (의존성 고려)

```
Phase 1 (인프라)
  └─ 토스트 → 설정 → 로고/도장

Phase 2 (타입+보안)
  └─ 인터페이스 확장 + sanitize 함수

Phase 3 (3페이지) [Phase 2 완료 후]
  └─ 거래내역 → 제품관리 → 공급처관리

Phase 4 (명세표 고도화) [Phase 2 완료 후, Phase 3과 병렬 가능]
  └─ 잔액재계산(4-4) 선행 → 상품자동완성(4-1) → 합계역산(4-2)
     → 삭제/복사(4-3) → 안전장치(4-5) → 인라인액션(4-6)

Phase 5 (고객 고도화) [Phase 2 완료 후]
  └─ 등급배지색상(5-3) → CustomerDialog(5-1) → 거래처카드(5-2)

Phase 6 (캘린더) [독립]
  └─ 캘린더뷰(6-1) → 기간리포트(6-2)

Phase 7 (보안) [배포 직전]
  └─ CORS → 서버사이드 프록시 → CSP → 토큰 재발급
```

**권장 착수 순서**:
1. Phase 1 전체 + vitest 설치
2. Phase 2 전체 (sanitize + 타입 확장)
3. Phase 3-1 (거래내역) — 가장 단순, 빠른 완료
4. Phase 4-4 (잔액 재계산) — 데이터 정합성 확보
5. Phase 4-1 (상품 자동완성 + 단가등급) — 현업 체감도 최고
6. Phase 3-2, 3-3 (제품, 공급처)
7. Phase 4 나머지 (역산, 삭제/복사, 안전장치, 인라인 액션)
8. Phase 5 (고객 고도화)
9. Phase 6 (캘린더/리포트)
10. Phase 7 (보안 배포 전 조치)

---

## 14. 수정/신규 파일 목록

### 수정 파일

| 파일 | Phase | 변경 내용 요약 |
|------|-------|--------------|
| `src/App.tsx` | 1, 6 | Toaster 추가, `/settings`, `/calendar` 라우트 |
| `src/lib/api.ts` | 2, 3, 4, 5 | 인터페이스 확장, CRUD 함수 추가, sanitize, deleteInvoice, recalcBalance |
| `src/lib/print.ts` | 1 | 로고/도장 이미지 로드 + 원형 CSS 효과 |
| `src/lib/constants.ts` | 5 | GRADE_COLORS 업데이트, CHURNED 회색 |
| `src/components/layout/Sidebar.tsx` | 1, 6 | 설정/캘린더 메뉴 추가 |
| `src/components/InvoiceDialog.tsx` | 4, 5 | 상품 자동완성, 합계 역산, 안전장치, 거래처 카드 |
| `src/pages/Invoices.tsx` | 4 | 삭제/복사/인라인 액션 |
| `src/pages/Receivables.tsx` | 4 | 잔액 재계산 연동 |
| `src/pages/Customers.tsx` | 5 | "새 고객" 버튼, 다중필드 검색 |
| `src/pages/CustomerDetail.tsx` | 5 | "수정" 버튼 |
| `src/pages/Transactions.tsx` | 3 | 전체 재작성 (플레이스홀더 → 완전 구현) |
| `src/pages/Products.tsx` | 3 | 전체 재작성 |
| `src/pages/Suppliers.tsx` | 3 | 전체 재작성 |

### 신규 파일

| 파일 | Phase | 설명 |
|------|-------|------|
| `src/pages/Settings.tsx` | 1 | 설정 4섹션 페이지 |
| `src/components/ProductDialog.tsx` | 3 | 제품 생성/수정 공용 Dialog |
| `src/components/SupplierDialog.tsx` | 3 | 공급처 생성/수정 공용 Dialog |
| `src/components/CustomerDialog.tsx` | 5 | 고객 생성/수정 공용 Dialog |
| `src/pages/Calendar.tsx` | 6 | 월간 캘린더 뷰 |
| `tests/fixtures/cleanup.ts` | QA | 테스트 데이터 자동 정리 |
| `tests/04-transactions.spec.ts` | QA | 거래내역 E2E |
| `tests/05-products.spec.ts` | QA | 제품관리 E2E |
| `tests/06-suppliers.spec.ts` | QA | 공급처관리 E2E |
| `tests/07-invoice-advanced.spec.ts` | QA | 명세표 고도화 E2E |
| `tests/08-customer-crud.spec.ts` | QA | 고객 CRUD E2E |
| `tests/09-calendar.spec.ts` | QA | 캘린더 E2E |
| `tests/10-performance.spec.ts` | QA | 성능 SLA E2E |
| `tests/11-accessibility.spec.ts` | QA | 접근성 E2E |

### 복사 파일

| 원본 | 대상 | Phase |
|------|------|-------|
| `offline-crm/images/company-logo.png` | `public/images/company-logo.png` | 1 |
| `offline-crm/images/company-stamp.jpg` | `public/images/company-stamp.jpg` | 1 |

---

## 15. 검증 방법

| Phase | 검증 항목 | 검증 방법 |
|-------|----------|----------|
| Phase 1 | 로고(좌상단) + 도장(우하단, 원형+기울임+인감빨강) | 인쇄 미리보기 육안 확인 |
| Phase 1 | 설정 저장 → 명세표 인쇄 반영 | 저장 후 명세표 인쇄 내용 확인 |
| Phase 2 | TypeScript 컴파일 에러 0건 | `npx tsc --noEmit` |
| Phase 3 | 제품 3,008건 검색/필터, 거래내역 97,086건 페이지네이션, 공급처 CRUD | Playwright E2E |
| Phase 4 | 상품 자동완성 → 단가 자동 세팅 → 합계 역산 → 저장 → 잔액 갱신 | E2E 전체 흐름 |
| Phase 4 | 합계 역산 정합성: `supply + tax === total` 100% | vitest 단위 테스트 |
| Phase 5 | 고객 생성/수정/삭제, CHURNED 배지 회색 | Playwright E2E |
| Phase 6 | 캘린더 날짜 클릭 → 해당일 명세표 표시 | Playwright E2E |
| 기존 E2E | 28/28 통과 유지 (회귀 방지) | `npx playwright test` |
| 신규 E2E | vitest ~30건 + Playwright ~55건 추가 통과 | `npm test` |
| 보안 | sanitize 함수 NocoDB 특수문자 차단 확인 | vitest 경계값 테스트 |

---

## 16. 향후 고려사항 (이번 PRD 범위 밖)

### 16.1 CRM v3: CS 워크플로우 (customer-experience-specialist)

- `tbl_cs_activities` (CS 활동 이력) + `tbl_reminders` (알림/리마인더) NocoDB 테이블 신설
- CustomerDetail 탭 5/6 추가 (CS 활동 이력, 알림)
- 미수금 독촉 자동화 (n8n 워크플로우 5단계)
- 학교 연간 CS 캘린더 (2/3/6/8/9/12/1월 7단계 행사)

### 16.2 대시보드 고도화 (ecommerce-business-expert)

- RFM 점수 (Recency / Frequency / Monetary)
- 고객 생애가치(LTV) 공식: `LTV = 객단가 × 구매빈도 × 평균고객수명`
- 채널별 수익성 비교
- 이탈 방지 세그먼트 (30/60/90일 미거래 고객 자동 태깅)

### 16.3 전자세금계산서 연동 (accounting-specialist)

- 홈택스 API 연동: `etax_approval_no`, `issue_type` 필드 추가
- 공급자/공급받는자 스냅샷 저장 (발행 시점 정보 고정)
- 세무사 확인 후 별도 Phase 진행

---

*문서 끝 — PRESSCO21 Offline CRM v2 고도화 PRD v1.0*
