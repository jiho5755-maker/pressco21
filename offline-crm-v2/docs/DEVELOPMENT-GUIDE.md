# Offline CRM v2 개발 가이드 & 트러블슈팅

> 2026-03-07 기준, CRM v2 전체 개발 과정에서 발견된 문제점·해결책·패턴·개선 방향을 정리한 문서.
> 향후 동일 스택(React 19 + Radix/shadcn + NocoDB + n8n) 프로젝트에서 참고할 수 있도록 작성.

---

## 목차

1. [아키텍처 개요](#1-아키텍처-개요)
2. [Radix Dialog + Body Portal 충돌 (최대 난제)](#2-radix-dialog--body-portal-충돌-최대-난제)
3. [NocoDB API 프록시 패턴](#3-nocodb-api-프록시-패턴)
4. [n8n 워크플로우 디버깅](#4-n8n-워크플로우-디버깅)
5. [인쇄 시스템 (이등분 + 멀티페이지)](#5-인쇄-시스템-이등분--멀티페이지)
6. [React Query 캐시 전략](#6-react-query-캐시-전략)
7. [폼 상태 관리 (isDirty 패턴)](#7-폼-상태-관리-isdirty-패턴)
8. [자동완성 드롭다운 구현](#8-자동완성-드롭다운-구현)
9. [CSS/레이아웃 함정](#9-css레이아웃-함정)
10. [보안 체크리스트](#10-보안-체크리스트)
11. [성능 최적화](#11-성능-최적화)
12. [회계/비즈니스 로직](#12-회계비즈니스-로직)
13. [테스트 전략](#13-테스트-전략)
14. [개선 방향 & 기술 부채](#14-개선-방향--기술-부채)

---

## 1. 아키텍처 개요

```
┌────────────────────────────────────────────┐
│  React 19 + TypeScript + Vite              │
│  ├── shadcn/ui (Radix primitives)          │
│  ├── @tanstack/react-query (서버 상태)      │
│  ├── Recharts (차트)                       │
│  ├── SheetJS (엑셀)                        │
│  └── sonner (토스트)                       │
└────────────┬───────────────────────────────┘
             │ fetch (x-crm-key 헤더)
             ▼
┌────────────────────────────────────────────┐
│  n8n Webhook Proxy (/crm-proxy)            │
│  ├── 테이블/메서드 화이트리스트 검증          │
│  ├── x-crm-key 인증                       │
│  └── xc-token 주입 → NocoDB 호출           │
└────────────┬───────────────────────────────┘
             ▼
┌────────────────────────────────────────────┐
│  NocoDB v2 REST API                        │
│  ├── tbl_Customers (15,830건)              │
│  ├── tbl_Products (3,008건)                │
│  ├── tbl_Invoices + tbl_Items              │
│  ├── tbl_Suppliers                         │
│  └── tbl_tx_history (97,086건, 읽기전용)    │
└────────────────────────────────────────────┘
```

**핵심 설계 원칙**: NocoDB 토큰이 프론트엔드에 절대 노출되지 않도록 n8n 프록시 계층을 경유.

---

## 2. Radix Dialog + Body Portal 충돌 (최대 난제)

### 문제 상황

InvoiceDialog 안에서 상품 자동완성 드롭다운을 구현할 때, Radix Dialog의 외부 클릭 감지 메커니즘과 body portal이 충돌하여 **6차 시도** 만에 해결.

### Radix Dialog 내부 동작 (반드시 이해해야 하는 메커니즘)

```
1. DialogContentModal → DismissableLayer 사용
2. DismissableLayer → usePointerDownOutside 훅 사용
3. usePointerDownOutside:
   - document에 pointerdown CAPTURE 리스너 등록
   - 클릭 대상이 DialogContent 자식이 아니면 → onOpenChange(false) 호출
4. DialogContentModal:
   - body.style.pointerEvents = "none" 설정 (오버레이 효과)
   - DialogContent에만 pointerEvents: "auto" 적용
```

### 시도별 실패 원인과 최종 해결

| 시도 | 접근법 | 결과 | 실패 원인 |
|------|--------|------|-----------|
| 1 | DialogContent 내부에 드롭다운 렌더링 | 위치 오류 | CSS `transform`이 containing block 생성 → `position: fixed`가 Dialog 기준으로 배치됨 |
| 2 | body portal + `pointerEvents: 'auto'` | 클릭 시 Dialog 닫힘 | Radix가 body portal을 "외부"로 인식 |
| 3 | `onPointerDownOutside` + `contains()` | 동작 안함 | Radix 커스텀 이벤트의 `e.target`이 실제 DOM 요소가 아님 |
| 4 | `onPointerDownOutside` + flag 체크 | 동작 안함 | `e.preventDefault()`가 Radix 커스텀 이벤트에서 효과 없음 |
| 5 | `onOpenChange`에서 드롭다운 닫기 + return | Dialog 유지, 상품 미선택 | `setShowProductDrop(null)` → 드롭다운 언마운트 → 버튼 핸들러 미실행 |
| **6** | **`onOpenChange`에서 `return`만** | **성공** | 드롭다운 마운트 유지 → 버튼 핸들러 정상 실행 |

### 최종 해결 코드

```tsx
// 1. Dialog의 onOpenChange에서 드롭다운 열린 상태면 닫힘 억제
<Dialog open={open} onOpenChange={(v) => {
  if (!v) {
    if (showProductDrop) return  // ← 핵심: return만, state 변경 없음
    handleClose()
  }
}}>
  <DialogContent>
    {/* ... 다이얼로그 내용 ... */}
  </DialogContent>
</Dialog>

// 2. 드롭다운은 Dialog 바깥에서 body portal로 렌더링
{showProductDrop && createPortal(
  <div style={{ zIndex: 99999, pointerEvents: 'auto' }}
       onMouseDown={(e) => e.preventDefault()}>
    {results.map((p) => (
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          selectProduct(rowKey, p)  // ← selectProduct 내부에서 드롭다운 닫힘
        }}
      >
        {p.name}
      </button>
    ))}
  </div>,
  document.body
)}
```

### 핵심 교훈

1. **Radix의 `onPointerDownOutside`/`onInteractOutside`는 커스텀 이벤트** — 네이티브 DOM `e.preventDefault()`와 다르게 동작함. 이 핸들러로 외부 클릭을 막으려는 시도는 실패함.

2. **controlled Dialog에서 `onOpenChange`를 통한 제어가 가장 확실** — `open` prop으로 제어하는 경우, `onOpenChange(false)` 콜백에서 state를 업데이트하지 않으면 Dialog가 닫히지 않음.

3. **`onOpenChange` 내에서 다른 state를 변경하면 안됨** — React 18 batching으로 인해, 드롭다운을 닫는 `setState`가 같은 렌더 사이클에서 처리되어 버튼이 언마운트됨.

4. **이벤트 위상 순서 이해 필수**:
   ```
   pointerdown(capture) → pointerdown(target) → mousedown(capture) → mousedown(target) → mouseup → click
   ```
   Radix는 capture 단계에서 동작하므로, 버튼의 target 단계 핸들러보다 먼저 실행됨.

5. **CSS `transform`은 containing block을 생성** — `position: fixed` 자식 요소가 viewport가 아닌 transform 부모 기준으로 배치됨. Radix DialogContent의 `translate(-50%, -50%)`가 이 문제를 유발.

### 향후 동일 패턴 적용 시 체크리스트

- [ ] Radix Dialog 안에서 body portal이 필요한가?
- [ ] `onOpenChange`에서 열린 portal 상태를 체크하여 return하는가?
- [ ] portal 요소에 `pointerEvents: 'auto'`가 설정되었는가?
- [ ] 버튼 핸들러에 `e.preventDefault()` + `e.stopPropagation()`이 있는가?
- [ ] `type="button"`이 설정되었는가? (form submit 방지)

---

## 3. NocoDB API 프록시 패턴

### 프록시 요청 구조

```typescript
interface ProxyRequest {
  table: 'customers' | 'products' | 'invoices' | 'items' | 'suppliers' | 'txHistory'
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  recordId?: number
  params?: Record<string, string | number>  // where, sort, limit, offset, fields
  payload?: unknown
  bulk?: boolean
}
```

### 발견된 문제점

#### (1) NocoDB 0.301.2에 `/bulk` 엔드포인트 없음

**문제**: NocoDB 일부 버전에서는 `/api/v2/.../bulk` 경로가 존재하지 않음.

**해결**: n8n 프록시에서 `bulk: true`일 때 request body를 배열로 전송하는 방식으로 우회.

```typescript
// PATCH bulk: 개별 레코드씩 순차 처리 (NocoDB가 bulk PATCH 미지원)
// POST bulk: 배열 body 전송 → NocoDB가 다수 레코드 동시 생성
// DELETE bulk: [{Id: N}, ...] 배열 전송
```

#### (2) NocoDB 자동생성 필드 PATCH 시 400 에러

**문제**: `Id`, `CreatedAt`, `UpdatedAt`, `nc_order` 필드를 PATCH payload에 포함하면 NocoDB가 400 에러 반환.

**해결**: `stripAutoFields()` 유틸 함수로 자동생성 필드 제거 후 전송.

```typescript
const AUTO_FIELDS = new Set(['Id', 'CreatedAt', 'UpdatedAt', 'nc_order'])
export function stripAutoFields<T extends Record<string, unknown>>(data: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(data).filter(([k]) => !AUTO_FIELDS.has(k)),
  ) as Partial<T>
}
```

#### (3) NocoDB WHERE 문법 주의사항

```
단일 조건:  (field,op,value)
AND 결합:  (cond1)~and(cond2)
OR 결합:   (cond1)~or(cond2)
LIKE:      (name,like,%keyword%)
```

**주의**: `~`, `(`, `)`, `,` 등은 NocoDB WHERE 파서의 예약 문자이므로 사용자 입력에서 반드시 제거해야 함.

```typescript
export function sanitizeSearchTerm(term: string): string {
  return term.replace(/[~(),\\]/g, '').trim().slice(0, 100)
}
```

### 개선 방향

- NocoDB 업그레이드 시 native bulk PATCH API 활용 검토
- API 호출 횟수 추적/모니터링 (시간당 500회 제한 대비)
- 응답 캐싱 강화 (특히 Products 3,008건 전체 조회)

---

## 4. n8n 워크플로우 디버깅

### IF 노드 v2 boolean 비교 버그

**문제**: n8n IF 노드 v2에서 `{{ $json.success }}` 같은 boolean 값 비교가 정상 동작하지 않음.

**해결**: boolean 대신 HTTP 상태 코드(숫자)로 비교.

```
// ❌ 동작 안함
{{ $json.success }} === true

// ✅ 동작함
{{ $json._status }} !== 200
```

### 워크플로우 디버깅 팁

1. **n8n 실행 로그 확인**: Executions 탭에서 각 노드별 입/출력 데이터 확인
2. **HTTP Request 노드**: 응답 전체를 `{{ $json }}` 형태로 로깅
3. **에러 핸들링**: Error Trigger 노드 + Webhook 응답으로 프론트엔드에 에러 전달
4. **환경변수**: n8n Credentials에 NocoDB 토큰 저장 (하드코딩 절대 금지)

### 서버 운영 명령

```bash
# 컨테이너 재시작 (docker-compose v1 없음, docker compose 사용)
cd /home/ubuntu/n8n && docker compose down && docker compose up -d
```

---

## 5. 인쇄 시스템 (이등분 + 멀티페이지)

### 구조

```
print.ts
├── buildInvoiceHtml()      — 카드형 명세표 1매 HTML 생성
├── buildDuplexInvoiceHtml()— 이등분(공급자+인수자) 조합
├── printDuplexViaIframe()  — iframe 기반 인쇄 실행
├── buildDuplexBlobUrl()    — 미리보기용 Blob URL
├── getPreviewPageCount()   — 페이지 수 산출
├── loadCompanyInfo()       — localStorage 공급자 정보 로드
├── saveCompanyInfo()       — localStorage 저장 (양쪽 키 동기화)
└── preloadPrintImages()    — 로고/도장 data URL 프리로드
```

### 발견된 문제점

#### (1) localStorage 키 불일치

**문제**: Settings.tsx가 `pressco21-crm-settings` 키에 저장하는데, print.ts가 `pressco21-crm-v2` 키만 참조하여 로고/도장이 인쇄에 반영되지 않음.

**해결**: `loadCompanyInfo()`에서 두 키를 모두 읽어 병합. `saveCompanyInfo()`에서 양쪽 키에 동시 저장.

```typescript
export function loadCompanyInfo(): CompanyInfo {
  // Settings.tsx 키 우선 → legacy 키 fallback → 병합
  const fromSettings = JSON.parse(localStorage.getItem('pressco21-crm-settings') || '{}')
  const fromLegacy = JSON.parse(localStorage.getItem('pressco21-crm-v2') || '{}')
  return { ...fromLegacy, ...fromSettings }
}
```

#### (2) 멀티페이지 인쇄 시 줄 수 관리

**문제**: 품목이 많을 때(35개 등) 1페이지에 맞지 않아 잘림.

**해결**: 고정 폰트 크기 + 페이지당 최대 줄 수 기반 자동 분할.

```typescript
const FIRST_PAGE_ROWS = 18   // 첫 페이지 (헤더/합계 포함)
const CONT_PAGE_ROWS = 24    // 속지 (합계만)
```

#### (3) "(속)" 텍스트 제거

속지에 "(속)" 표시가 불필요 → 공급자 보관용/인수자 보관용 + 페이지 번호로 충분.

### 로고/도장 프리로드 패턴

```typescript
// App.tsx 초기화 시 호출
useEffect(() => { preloadPrintImages() }, [])

// public/images/ 정적 파일을 data URL로 변환하여 메모리 캐시
// → 인쇄 시 외부 리소스 로딩 대기 불필요
```

### 개선 방향

- 인쇄 미리보기를 iframe이 아닌 `@react-pdf/renderer` 등으로 개선 검토
- PDF 직접 생성/다운로드 기능 추가
- 인쇄 용지 규격 선택 (A4/B5 등)

---

## 6. React Query 캐시 전략

### 현재 설정

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5분
      gcTime: 30 * 60 * 1000,       // 30분 (garbage collection)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
})
```

### 캐시 무효화 패턴 (중요)

명세표 저장/삭제 시 연쇄적으로 무효화해야 하는 쿼리 키가 많음. 누락 시 UI에 오래된 데이터 표시.

```typescript
// 명세표 저장 후 무효화 체인
qc.invalidateQueries({ queryKey: ['invoices'] })           // 명세표 목록
qc.invalidateQueries({ queryKey: ['invoice', invoiceId] }) // 명세표 단건
qc.invalidateQueries({ queryKey: ['invoiceItems', id] })   // 라인아이템
qc.invalidateQueries({ queryKey: ['invoices-customer'] })  // 고객별 명세표
qc.invalidateQueries({ queryKey: ['receivables'] })        // 미수금
qc.invalidateQueries({ queryKey: ['customers'] })          // 고객 목록 (미수금 반영)
qc.invalidateQueries({ queryKey: ['transactions'] })       // 거래내역
qc.invalidateQueries({ queryKey: ['transactions-crm'] })   // CRM 거래내역
// 대시보드 + 기간 리포트 전체
qc.invalidateQueries({
  predicate: (q) => {
    const k = q.queryKey[0]
    return typeof k === 'string' && (k.startsWith('dash-') || k.startsWith('period-'))
  },
})
```

### 교훈

1. **쿼리 키 네이밍 일관성이 중요** — `dash-*`, `period-*` 접두사 기반 predicate 무효화
2. **개별 레코드 캐시도 무효화해야 함** — `['invoice', id]` 단건 캐시가 남아있으면 다이얼로그 재진입 시 이전 데이터 표시
3. **`removeQueries` vs `invalidateQueries`** — 삭제된 레코드는 `removeQueries`로 캐시 자체를 제거

### 개선 방향

- 쿼리 키 상수화 (`QUERY_KEYS.invoices`, `QUERY_KEYS.customers` 등)
- 무효화 로직을 중앙 함수로 추출 (`invalidateInvoiceRelated(qc, invoiceId, customerId)`)
- Optimistic update 적용 (명세표 저장 시 즉시 UI 반영)

---

## 7. 폼 상태 관리 (isDirty 패턴)

### 현재 구현

```typescript
const [isDirty, setIsDirty] = useState(false)
const [originalForm, setOriginalForm] = useState<string>('')

// 데이터 로드 완료 시 원본 스냅샷 저장
useEffect(() => {
  setOriginalForm(JSON.stringify({ form, items }))
}, [loadedData])

// 값 변경 시 isDirty 플래그 설정
setIsDirty(true)

// 닫기 시 확인
const handleClose = useCallback(() => {
  if (isDirty) {
    if (!window.confirm('저장하지 않은 내용이 있습니다. 그래도 닫으시겠습니까?')) return
  }
  onClose()
}, [isDirty, onClose])
```

### 발견된 문제점

1. **`JSON.stringify` 비교의 한계** — 객체 키 순서가 달라지면 false positive
2. **자동완성 선택만으로 isDirty 활성화** — 검색만 하고 취소해도 isDirty가 될 수 있음

### 교훈

- 간단한 폼에서는 `JSON.stringify` 비교가 실용적
- 복잡한 폼에서는 `react-hook-form`의 `formState.isDirty` 사용 권장
- `isDirty`와 `confirm()`의 조합은 사용자에게 데이터 손실을 방지하는 핵심 UX

### 개선 방향

- `react-hook-form` + `zod` 스키마 검증 도입
- `beforeunload` 이벤트 핸들러 추가 (브라우저 탭 닫기 방어)

---

## 8. 자동완성 드롭다운 구현

### 구현 패턴

```
입력 → debounce(250ms) → API 검색 → 결과 표시 → 키보드/마우스 선택
```

### 주요 구현 사항

#### 위치 계산 (getBoundingClientRect)

```typescript
useLayoutEffect(() => {
  if (!showProductDrop) return
  const el = inputRefs.current[showProductDrop]
  if (!el) return
  const rect = el.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom

  if (spaceBelow >= 250) {
    setDropdownPos({ top: rect.bottom + 2, left: rect.left, width: rect.width })
  } else {
    setDropdownPos({ bottom: window.innerHeight - rect.top + 2, left: rect.left, width: rect.width })
  }
}, [showProductDrop, productSearchResult])
```

#### 키보드 네비게이션

```typescript
onKeyDown={(e) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    setDropdownIdx((prev) => Math.min(prev + 1, results.length - 1))
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    setDropdownIdx((prev) => Math.max(prev - 1, 0))
  } else if (e.key === 'Enter' && dropdownIdx >= 0) {
    e.preventDefault()
    selectProduct(rowKey, results[dropdownIdx])
  } else if (e.key === 'Escape') {
    setShowProductDrop(null)
  }
}
```

#### 마우스 휠 스크롤

```typescript
onWheel={(e) => {
  e.stopPropagation()
  if (dropdownContainerRef.current) {
    dropdownContainerRef.current.scrollTop += e.deltaY
  }
}}
```

### 교훈

- body portal 드롭다운은 Radix Dialog 외부로 간주됨 (섹션 2 참조)
- `useLayoutEffect`로 위치 계산해야 깜빡임 방지
- 화면 하단에 공간이 부족하면 위로 펼치는 로직 필요
- debounce 값이 너무 짧으면 API 호출 과다, 너무 길면 UX 저하 (250ms 적정)

---

## 9. CSS/레이아웃 함정

### (1) CSS `transform`이 containing block을 생성하는 문제

**핵심**: `transform`, `perspective`, `filter` 속성이 적용된 요소는 새로운 containing block을 만듦.

```css
/* Radix DialogContent 스타일 */
.dialog-content {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);  /* ← 이것이 containing block 생성 */
}

/* 자식의 position: fixed가 viewport가 아닌 .dialog-content 기준으로 배치됨 */
.dropdown-inside-dialog {
  position: fixed;
  top: 100px;  /* ← viewport 기준이 아님! dialog-content 기준! */
}
```

**해결**: body portal(`createPortal(el, document.body)`)로 DOM 트리에서 분리.

### (2) Radix의 `pointer-events: none` 부작용

Radix DialogContent가 활성화되면 `body.style.pointerEvents = "none"`을 설정함.
body portal 요소에는 반드시 `pointerEvents: 'auto'` 인라인 스타일 필요.

### (3) z-index 전쟁

```
Radix DialogOverlay: z-index: 50
Radix DialogContent: z-index: 50
자동완성 드롭다운:  z-index: 99999 (body portal이므로 충분히 높아야 함)
```

### 개선 방향

- z-index 값을 CSS 변수로 중앙 관리
- `position: fixed` 대신 Floating UI(`@floating-ui/react`) 라이브러리 도입 검토

---

## 10. 보안 체크리스트

### 완료된 항목

- [x] NocoDB 토큰 프론트엔드 노출 제로 (n8n 프록시 경유)
- [x] 사용자 입력 sanitize (`sanitizeSearchTerm`, `sanitizeAmount`)
- [x] NocoDB 자동생성 필드 제거 (`stripAutoFields`)
- [x] Production 빌드 시 `console.*` / `debugger` 자동 제거
- [x] CSP(Content Security Policy) meta 태그 추가
- [x] 하드코딩된 토큰 제거 → 환경변수 방식

### 미완료 항목 (수동 작업 필요)

- [ ] n8n CORS 설정: `*` → 특정 도메인 제한
- [ ] NocoDB API 토큰 재발급 (git history에 노출된 키 교체)
- [ ] HTTPS 강제 리다이렉트 설정
- [ ] 로그인/인증 시스템 (현재 없음 — 오프라인 CRM이므로 의도적 생략)

### 보안 코딩 패턴

```typescript
// ❌ 위험: SQL injection 가능
where: `(name,like,%${userInput}%)`

// ✅ 안전: 특수문자 제거 후 사용
const safe = sanitizeSearchTerm(userInput)
where: `(name,like,%${safe}%)`

// ❌ 위험: 비현실적 금액 입력 가능
amount: Number(input.value)

// ✅ 안전: 범위 제한 (0 ~ 10억)
amount: sanitizeAmount(input.value)
```

---

## 11. 성능 최적화

### 적용된 최적화

| 기법 | 적용 위치 | 효과 |
|------|-----------|------|
| debounce 400ms | 검색 입력 (Customers, Invoices, Transactions) | API 호출 90% 감소 |
| debounce 250ms | 상품 자동완성 | API 호출 감소 + UX 유지 |
| React Query staleTime 5분 | 전체 쿼리 | 반복 API 호출 방지 |
| `useMemo` | 합계 계산, 에이징 집계 | 불필요한 재계산 방지 |
| 이미지 프리로드 | 로고/도장 (App.tsx 초기화) | 인쇄 시 로딩 대기 제거 |
| Vite dev proxy | `/crm-proxy` | CORS 우회 + 네트워크 홉 감소 |
| Production drop_console | Vite build config | 번들 크기 감소 |

### 대시보드 로딩 최적화

```typescript
// ❌ 이전: 6개 API 순차 호출
const customers = await getCustomers()
const invoices = await getInvoices()
// ...

// ✅ 현재: Promise.all 병렬 호출 + enabled 조건
const { data: customersData } = useQuery({ queryKey: ['dash-customers'], ... })
const { data: invoicesData } = useQuery({ queryKey: ['dash-invoices'], ... })
// React Query가 자동으로 병렬 실행
```

### 개선 방향

- 가상 스크롤 (`@tanstack/react-virtual`) — 35개+ 품목 행 렌더링 최적화
- 서버사이드 집계 — 대시보드 KPI를 NocoDB/n8n에서 미리 계산
- Web Worker — 엑셀 내보내기를 메인 스레드에서 분리
- `React.lazy` + `Suspense` — 라우트별 코드 분할

---

## 12. 회계/비즈니스 로직

### 합계 역산 공식 (accounting-specialist 검증)

```typescript
// 합계금액에서 공급가액과 세액을 역산
function reverseCalc(total: number): { supply: number; tax: number } {
  const supply = Math.floor(total / 1.1)  // 절사 (세금계산서 기준)
  const tax = total - supply
  return { supply, tax }
}
```

### 미수금 계산 공식

```
현잔액 = 전잔액(previous_balance) + 출고액(total_amount) - 입금액(paid_amount)
```

### payment_status 판정

```typescript
// 해당 명세표 total 기준으로만 판정 (prevBal은 이전 명세표에 귀속)
const status =
  total <= 0 ? 'paid' :
  paidAmount >= total ? 'paid' :
  paidAmount > 0 ? 'partial' :
  'unpaid'
```

### 고객 통계 재계산 (recalcCustomerStats)

```typescript
// CRM 명세표 + 레거시 거래내역 양쪽 합산
async function recalcCustomerStats(customerId: number) {
  // 1. CRM 명세표 전체 조회 → 미완납 건 미수금 합산
  // 2. 레거시 거래내역 (출고 유형) → 합계/건수/최종일
  // 3. 종합 통계 → customer 레코드 PATCH
  //    - total_order_amount, total_order_count
  //    - outstanding_balance (개별 레코드 단위 0 하한 적용)
  //    - last_order_date
}
```

**주의**: `outstanding_balance` 계산 시 초과입금(음수 미수금) 건은 `Math.max(0, ...)` 처리. 동일 고객의 초과입금이 다른 명세표 미수금을 상쇄하지 않도록 개별 레코드 단위로 0 하한 적용.

### 5단계 단가등급

| tier | 등급명 | 키 | 대상 |
|------|--------|-----|------|
| 1 | 씨앗/소매 | price1 | 일반 회원 (MEMBER) |
| 2 | 뿌리/강사우대 | price2 | 강사 (INSTRUCTOR) |
| 3 | 꽃밭/파트너도매 | price3 | 파트너 (PARTNERS) |
| 4 | 정원사/VIP특가 | price4 | VIP |
| 5 | 별빛/엠버서더 | price5 | 엠버서더 (AMBASSADOR) |

```typescript
export function getPriceByTier(product: Product, tier: number = 1): number {
  const key = `price${tier}` as keyof Product
  const price = product[key]
  if (typeof price === 'number') return price
  return product.price1 ?? 0  // fallback to 소매가
}
```

---

## 13. 테스트 전략

### 현재 상태

- **E2E (Playwright)**: 28/28 테스트 통과 (3개 파일)
- **단위 테스트**: 미구현
- **통합 테스트**: 미구현

### Playwright 설정 핵심

```typescript
// playwright.config.ts
{
  timeout: 60_000,        // NocoDB API 응답 느릴 수 있음
  workers: 1,             // 병렬 비활성화 (데이터 충돌 방지)
  use: { locale: 'ko-KR' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
}
```

### 테스트 작성 시 주의사항

1. **API 응답 대기**: `waitForResponse` 또는 충분한 `waitForTimeout` 필요
2. **데이터 의존성**: 테스트 간 데이터 격리가 안되므로 순서 의존적
3. **Dialog 테스트**: Radix Dialog의 애니메이션 완료를 기다려야 함
4. **toLocaleString**: 한국어 로케일 설정 필수 (`locale: 'ko-KR'`)

### 개선 방향

- MSW (Mock Service Worker) 도입으로 API 의존성 제거
- Vitest 단위 테스트 (비즈니스 로직 함수)
- 시각적 회귀 테스트 (Playwright screenshot comparison)
- CI/CD 파이프라인 연동

---

## 14. 개선 방향 & 기술 부채

### 단기 (바로 적용 가능)

| 항목 | 우선순위 | 설명 |
|------|----------|------|
| 쿼리 키 상수화 | 높음 | `QUERY_KEYS` 객체로 중앙 관리 → 오타/누락 방지 |
| 캐시 무효화 중앙화 | 높음 | `invalidateInvoiceRelated()` 등 헬퍼 함수 |
| react-hook-form 도입 | 중간 | InvoiceDialog 1,278줄 → 폼 로직 분리 |
| Floating UI 도입 | 중간 | 자동완성 드롭다운 위치 계산 라이브러리화 |
| beforeunload 핸들러 | 낮음 | 탭 닫기 시 미저장 데이터 경고 |

### 중기 (아키텍처 개선)

| 항목 | 설명 |
|------|------|
| 컴포넌트 분리 | InvoiceDialog (1,278줄) → InvoiceForm + InvoiceItemTable + InvoiceSummary |
| 상태 관리 | 복잡한 폼 상태를 useReducer 또는 zustand로 분리 |
| 서버사이드 집계 | 대시보드 KPI를 n8n scheduled workflow로 미리 계산 |
| PDF 생성 | 인쇄 iframe 방식 → @react-pdf/renderer 직접 생성 |
| 가상 스크롤 | 35개+ 품목 행을 가상화하여 렌더링 성능 개선 |

### 장기 (신기능)

| 항목 | 설명 |
|------|------|
| PWA/오프라인 지원 | Service Worker + IndexedDB 캐시 |
| 멀티유저 | 로그인/인증 + 권한 관리 |
| 실시간 동기화 | WebSocket으로 다중 사용자 동시 편집 |
| 모바일 최적화 | 반응형 테이블 → 카드형 레이아웃 |
| 알림 시스템 | 미수금 90일 초과 자동 알림 |

### PRD vs 실제 구현 스키마 차이 (소급 변경 없음)

| 항목 | PRD 설계 | 실제 구현 | 이유 |
|------|----------|-----------|------|
| tbl_tx_history.customer_id | FK (정수) | customer_name (문자열) | 레거시 데이터 비정규화 상태 그대로 마이그레이션 |
| tx_type | SALES/PURCHASE | 출고/입금/반입/메모 | 원본 "얼마에요" 값 유지 |
| 집계 기준 | customer_id JOIN | customer_name 문자열 매칭 | FK 없으므로 문자열 비교 (동명이인 주의) |

---

## 부록: 자주 사용하는 명령어

```bash
# 개발 서버
npm run dev

# TypeScript 타입 체크
npx tsc --noEmit

# 프로덕션 빌드
npm run build

# E2E 테스트
npm run test:e2e
npm run test:e2e:ui      # UI 모드
npm run test:e2e:debug   # 디버그 모드

# 린트
npm run lint

# n8n 서버 재시작 (SSH 접속 후)
cd /home/ubuntu/n8n && docker compose down && docker compose up -d
```

---

> **이 문서는 CRM v2 개발 전체 과정의 교훈을 담고 있습니다.**
> 동일 기술 스택(React + Radix/shadcn + NocoDB + n8n) 프로젝트에서
> 같은 실수를 반복하지 않도록 참고하세요.
