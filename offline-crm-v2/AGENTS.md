# AGENTS.md — PRESSCO21 Offline CRM v2

> **이 파일은 Codex CLI(및 자동화 에이전트)용 컨텍스트입니다.**
> Claude Code는 기획/아키텍처, Codex CLI는 테스트 코드 작성 등 반복·구현 작업을 담당합니다.

---

## 역할 분리

| 도구 | 담당 |
|------|------|
| **Claude Code** | 기획, 아키텍처 결정, API 설계, 비즈니스 로직 구현 |
| **Codex CLI** | E2E 테스트 작성, 반복 구현 작업, 코드 보완 |

---

## 프로젝트 개요

PRESSCO21 내부 영업 CRM — React 19 + TypeScript + Vite + shadcn/ui + Tailwind CSS
백엔드: NocoDB (n8n webhook 프록시 경유, `/crm-proxy`)

```
offline-crm-v2/
  src/
    pages/        # 라우트 단위 페이지 컴포넌트
    components/   # 재사용 컴포넌트 (Dialog류)
    lib/
      api.ts      # NocoDB 프록시 호출 함수 전체
      print.ts    # 거래명세표 인쇄 로직
      constants.ts
      utils.ts
  tests/          # Playwright E2E 테스트
  public/images/  # company-logo.png, company-stamp.jpg
```

---

## 기술 스택

| 항목 | 버전/내용 |
|------|---------|
| React | 19 |
| TypeScript | 5+ |
| Vite | 6+ |
| @tanstack/react-query | 5 |
| shadcn/ui | (Button, Input, Dialog, Badge, Card, Select, Tabs, Table 등) |
| Tailwind CSS | 3 |
| Recharts | 2 (대시보드 차트) |
| sonner | 토스트 알림 |
| SheetJS (xlsx) | 엑셀 내보내기 |
| Playwright | E2E 테스트 |

---

## 페이지 목록 및 라우트

| 라우트 | 페이지 | 주요 기능 |
|--------|-------|---------|
| `/` | Dashboard | KPI 카드 6개, 차트, 기간 매출 리포트 |
| `/customers` | Customers | 고객 목록 (검색/필터/페이지네이션), 새 고객 버튼 |
| `/customers/:id` | CustomerDetail | 고객 상세 4탭 (기본정보/명세표/거래내역/미수금) |
| `/invoices` | Invoices | 거래명세표 목록 + 인라인 액션 (인쇄/복사/삭제) |
| `/receivables` | Receivables | 미수금 관리 (에이징 테이블) |
| `/transactions` | Transactions | 거래내역 읽기 전용 (97,086건, 검색/필터/페이지네이션) |
| `/products` | Products | 제품 관리 CRUD (3,008건, 8단가) |
| `/suppliers` | Suppliers | 공급처 관리 CRUD |
| `/calendar` | Calendar | 월간 캘린더 뷰 + 기간 매출 리포트 |
| `/settings` | Settings | 공급자 정보/인쇄설정/입금계좌/시스템 |

---

## API 레이어 (src/lib/api.ts)

모든 NocoDB 호출은 n8n webhook 프록시(`/crm-proxy`)를 경유합니다.

```typescript
// 핵심 호출 함수
async function proxyRequest(table, method, params?, payload?, recordId?, bulk?) { ... }

// 테이블별 주요 함수
getCustomers(params)        // 고객 목록
getCustomer(id)             // 고객 상세
createCustomer(data)        // 고객 생성
updateCustomer(id, data)    // 고객 수정

getInvoices(params)         // 명세표 목록
getInvoice(id)              // 명세표 상세
createInvoice(data)         // 명세표 생성
updateInvoice(id, data)     // 명세표 수정
deleteInvoice(id)           // 명세표 삭제

getProducts(params)         // 제품 목록
createProduct(data)
updateProduct(id, data)
deleteProduct(id)

getSuppliers(params)        // 공급처 목록
createSupplier(data)
updateSupplier(id, data)
deleteSupplier(id)

getTxHistory(params)        // 거래내역 (읽기 전용)
recalcCustomerBalance(id)   // 고객 잔액 재계산

// sanitize 함수 (보안)
sanitizeSearchTerm(term)    // NocoDB 검색어 특수문자 제거
sanitizeAmount(value)       // 금액 범위 검증 (0~1,000,000,000)
```

---

## 기존 테스트 현황

```
tests/
  helpers.ts          # 공통 헬퍼 (navigateTo, waitForTableLoaded, assertKpiCard, waitForDialog 등)
  01-customers.spec.ts  # T1-01~09: 고객 조회 플로우 (9건)
  02-invoices.spec.ts   # T2-01~10: 거래명세표 발행 플로우 (10건)
  03-dashboard.spec.ts  # T3-01~09: 대시보드 KPI 플로우 (9건)
```

**현재 통과**: 28/28건 (실행 시간 약 28초)

---

## 남은 작업: E2E 테스트 추가 작성

아래 6개 파일을 새로 작성해야 합니다.
**기존 helpers.ts 패턴을 반드시 재사용**하세요.

---

### 04-transactions.spec.ts (거래내역)

```
검증 항목:
  T4-01  거래내역 페이지 접속 및 제목 표시
  T4-02  목록 로드 확인 (97,086건 데이터)
  T4-03  검색 입력 → debounce 후 결과 반영
  T4-04  유형 필터 (출고/입금/반입/메모) 동작
  T4-05  기간 필터 (날짜 from~to) 동작
  T4-06  페이지네이션 (다음 페이지) 동작
  T4-07  필터 초기화 동작
  T4-08  성능 SLA: 첫 페이지 로드 5초 이내

URL: /transactions
제목: '거래내역'
테이블 헤더: 날짜, 거래처, 유형, 금액, 세액, 전표번호, 메모
유형 배지: 출고(파란색), 입금(초록색), 반입(주황색), 메모(회색)
읽기 전용 (CRUD 버튼 없음)
```

---

### 05-products.spec.ts (제품 관리)

```
검증 항목:
  T5-01  제품 관리 페이지 접속 및 제목 표시
  T5-02  제품 목록 로드 확인
  T5-03  검색 (품목명/코드) 동작
  T5-04  "새 제품" 버튼 → Dialog 열림
  T5-05  Dialog 필수 필드 검증 (품목명 없이 저장 시도 → 에러)
  T5-06  완전한 데이터로 제품 생성 → 목록 반영
  T5-07  생성된 제품 클릭 → 수정 Dialog 열림
  T5-08  제품 삭제 (소프트 딜리트, is_active=0)

URL: /products
제목: '제품 관리'
테스트 데이터 prefix: 'TEST-PRODUCT-'
Dialog 필드: 품목코드, 품목명(필수), 별칭, 카테고리, 단위, 단가1~4, 과세여부
삭제: confirm 후 is_active=0 (목록에서 사라짐)
```

---

### 06-suppliers.spec.ts (공급처 관리)

```
검증 항목:
  T6-01  공급처 관리 페이지 접속 및 제목 표시
  T6-02  공급처 목록 로드 확인
  T6-03  "새 공급처" 버튼 → Dialog 열림
  T6-04  상호명 없이 저장 시도 → 유효성 경고
  T6-05  완전한 데이터로 공급처 생성 → 목록 반영
  T6-06  생성된 공급처 수정 → 변경사항 저장 확인
  T6-07  공급처 삭제 → 목록에서 제거

URL: /suppliers
제목: '공급처 관리'
테스트 데이터 prefix: 'TEST-SUPPLIER-'
Dialog 필드: 상호(필수), 대표자, 사업자번호, 전화, 핸드폰, 이메일, 주소, 은행명, 계좌번호, 메모
```

---

### 07-invoice-advanced.spec.ts (명세표 고도화 기능)

```
검증 항목:
  T7-01  명세표 Dialog에서 거래처 선택 시 거래처 카드 표시
  T7-02  상품 자동완성 (품목명 입력 → 드롭다운 → 선택 시 단가 자동세팅)
  T7-03  합계 역산 (합계 입력 시 공급가액/세액 자동계산)
  T7-04  수량 변경 시 합계 재계산
  T7-05  명세표 삭제 (인라인 삭제 버튼 → confirm → 목록에서 제거)
  T7-06  명세표 복사 (인라인 복사 버튼 → 새 Dialog에 데이터 프리필)
  T7-07  isDirty 안전장치 (편집 중 닫기 시 confirm 팝업)
  T7-08  Ctrl+Enter 단축키 → 발행 완료
  T7-09  저장 후 고객 잔액 자동 재계산 확인

URL: /invoices
주의: 실제 NocoDB에 데이터 생성됨 → afterAll에서 TEST-E2E- prefix 데이터 삭제
역산 공식:
  공급가액 = Math.floor(합계 / 1.1)
  세액 = 합계 - 공급가액
```

---

### 08-customer-crud.spec.ts (고객 CRUD)

```
검증 항목:
  T8-01  "새 고객" 버튼 → Dialog 열림
  T8-02  거래처명 없이 저장 시도 → 유효성 경고
  T8-03  완전한 데이터로 고객 생성 → 목록에 반영
  T8-04  고객 상세 → 기본정보 탭 → "수정" 버튼 → 수정 Dialog
  T8-05  고객 정보 수정 → 저장 → 변경사항 반영 확인
  T8-06  고객 등급 배지 색상 확인 (MEMBER=초록, VIP=골드, CHURNED=슬레이트)

URL: /customers, /customers/:id
테스트 데이터 prefix: 'TEST-CUSTOMER-'
Dialog 필드: 거래처명(필수), 전화, 휴대폰, 이메일, 주소, 유형, 사업자번호, 대표자, 업태, 종목, 단가등급, 메모
등급 색상:
  MEMBER: #a8b5a0 / INSTRUCTOR: #7d9675 / PARTNERS: #5e8a6e
  VIP: #b89b5e / AMBASSADOR: #8b6fae / CHURNED: #94a3b8
```

---

### 09-calendar.spec.ts (캘린더 + 기간 리포트)

```
검증 항목:
  T9-01  캘린더 페이지 접속 및 월간 뷰 표시
  T9-02  이전달/다음달 이동 버튼 동작
  T9-03  오늘 날짜 셀 강조 표시 확인
  T9-04  날짜 클릭 → 해당일 명세표 필터 적용
  T9-05  기간 매출 리포트 섹션 표시 확인
  T9-06  퀵 프리셋 4개 (이번달/지난달/이번분기/올해) 버튼 전환
  T9-07  프리셋 변경 시 KPI 카드 갱신 (수금률/전년동월대비/객단가)
  T9-08  기간 변경 시 차트 데이터 갱신

URL: /calendar
제목: '캘린더'
KPI 라벨: '수금률', '전년 동월 대비', '평균 객단가'
프리셋 버튼: '이번달', '지난달', '이번분기', '올해'
```

---

## helpers.ts 주요 함수 (재사용 필수)

```typescript
import {
  navigateTo,         // 사이드바 링크 클릭 이동
  waitForTableLoaded, // 로딩 스피너 사라질 때까지 대기
  assertNoApiError,   // API 에러 텍스트 없음 확인
  assertPageTitle,    // h2 제목 텍스트 확인
  assertKpiCard,      // KPI 카드 제목 텍스트 확인
  waitForDialog,      // Dialog 열릴 때까지 대기
  closeDialog,        // 취소 버튼으로 Dialog 닫기
  API_TIMEOUT,        // 20_000 (ms)
} from './helpers'
```

---

## 테스트 실행 방법

```bash
# 사전 조건: Vite dev server 실행
npm run dev  # 별도 터미널

# 전체 E2E 실행
npm run test:e2e

# 특정 파일만
npx playwright test tests/04-transactions.spec.ts

# UI 모드 (디버깅)
npx playwright test --ui

# 헤드 모드 (브라우저 표시)
npx playwright test --headed
```

---

## 테스트 데이터 정책

- **prefix 규칙**: `TEST-E2E-{타임스탬프}` 또는 `TEST-{ENTITY}-`
- **정리 방법**: `afterAll` 훅에서 생성한 테스트 데이터 삭제
- **기존 데이터 건드리지 말 것**: 실제 운영 데이터(고객 15,830건, 거래내역 97,086건)는 읽기만

```typescript
// afterAll 정리 패턴 예시
test.afterAll(async ({ request }) => {
  // TEST- prefix 데이터 삭제 (proxyRequest DELETE 호출)
})
```

---

## 중요 주의사항

1. **workers: 1** — 병렬 실행 비활성화 (NocoDB 쓰기 충돌 방지)
2. **API_TIMEOUT: 20_000** — NocoDB 응답이 느릴 수 있음
3. **debounce**: 검색 input 후 최소 400ms 대기 (`page.waitForTimeout(400)`)
4. **sonner 토스트**: 저장 성공 확인 시 `page.getByText('저장되었습니다')` 또는 `'완료'` 텍스트
5. **Dialog 닫힘 확인**: `expect(page.getByRole('dialog')).toHaveCount(0)`
6. **Ctrl+Enter**: `page.keyboard.press('Control+Enter')`

---

## 환경 설정

```bash
# .env.local (gitignore 적용됨)
VITE_N8N_WEBHOOK_URL=/crm-proxy
VITE_CRM_API_KEY=<값은 .secrets.env 참조>
NOCODB_TOKEN=<값은 .secrets.env 참조>
```

Vite dev server가 `/crm-proxy` 요청을 `https://n8n.pressco21.com/webhook/crm-proxy`로 프록시합니다.

---

## 완료 기준

모든 테스트 파일 작성 후:
```bash
npx playwright test
# 목표: 전체 55건+ 통과 (기존 28건 + 신규 27건+)
```

기존 28건 통과 유지 필수 — 기존 테스트를 수정하지 마세요.
