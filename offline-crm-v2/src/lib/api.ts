/**
 * NocoDB API 클라이언트 (n8n Webhook 프록시 경유)
 *
 * 보안 아키텍처:
 *   React App --x-crm-key--> n8n WF-CRM-PROXY --xc-token--> NocoDB
 *
 * - NocoDB 토큰은 n8n Credential에만 존재 (프론트엔드 노출 제로)
 * - 프론트엔드는 CRM_API_KEY만 보유 (VITE_ 접두사로 빌드 시 포함)
 * - n8n이 테이블/메서드 화이트리스트 검증 후 NocoDB에 전달
 */

// n8n Webhook 프록시 URL
const PROXY_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.pressco21.com/webhook/crm-proxy'
// CRM 전용 API Key (NocoDB 토큰과 무관한 별도 키)
const CRM_API_KEY = import.meta.env.VITE_CRM_API_KEY || ''

// 테이블 논리명 (n8n 프록시에서 Model ID로 변환)
type TableName = 'customers' | 'products' | 'invoices' | 'items' | 'suppliers' | 'txHistory'

// ─────────────────────────────────────────
// n8n 프록시 요청 인터페이스
// ─────────────────────────────────────────
interface ProxyRequest {
  table: TableName
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  recordId?: number
  params?: Record<string, string | number>
  payload?: unknown
  bulk?: boolean
}

interface ProxyResponse<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
  timestamp: string
}

// ─────────────────────────────────────────
// 핵심 프록시 호출 함수
// ─────────────────────────────────────────
async function proxyRequest<T>(req: ProxyRequest): Promise<T> {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-crm-key': CRM_API_KEY,
    },
    body: JSON.stringify({
      table: req.table,
      method: req.method || 'GET',
      recordId: req.recordId,
      params: req.params,
      payload: req.payload,
      bulk: req.bulk,
    }),
  })

  if (!res.ok) {
    throw new Error(`Proxy Error ${res.status}: ${await res.text()}`)
  }

  const json: ProxyResponse<T> = await res.json()

  if (!json.success) {
    throw new Error(`[${json.error?.code || 'PROXY_ERROR'}] ${json.error?.message || 'Unknown proxy error'}`)
  }

  return json.data as T
}

// ─────────────────────────────────────────
// 공통 목록 응답 타입 (NocoDB 호환)
// ─────────────────────────────────────────
export interface ListResponse<T> {
  list: T[]
  pageInfo: { totalRows: number; page: number; pageSize: number; isLastPage: boolean }
}

// ─────────────────────────────────────────
// 보안: 입력값 sanitize 함수
// ─────────────────────────────────────────

// NocoDB where 파라미터 특수문자 제거 (SQL injection 방어)
export function sanitizeSearchTerm(term: string): string {
  return term.replace(/[~(),\\]/g, '').trim().slice(0, 100)
}

// NocoDB 자동생성 필드 제거 (PATCH payload에 포함 시 400 에러 방지)
const AUTO_FIELDS = new Set(['Id', 'CreatedAt', 'UpdatedAt', 'nc_order'])
export function stripAutoFields<T extends Record<string, unknown>>(data: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(data).filter(([k]) => !AUTO_FIELDS.has(k)),
  ) as Partial<T>
}

// 금액/수량 범위 검증 (음수 및 비현실적 값 방어)
export function sanitizeAmount(value: string | number): number {
  const n = typeof value === 'string' ? Number(value) : value
  if (isNaN(n) || !isFinite(n)) return 0
  return Math.max(0, Math.min(Math.floor(n), 1_000_000_000))
}

// ─────────────────────────────────────────
// 고객 (customers)
// ─────────────────────────────────────────
export interface Customer {
  Id: number
  name?: string
  phone?: string    // 인터페이스 호환용 (NocoDB 실제 필드: phone1)
  phone1?: string   // NocoDB 실제 필드명
  phone2?: string
  mobile?: string
  email?: string
  address1?: string
  address2?: string
  address3?: string
  address4?: string
  address5?: string
  address6?: string
  customer_type?: string
  customer_status?: string
  member_grade?: string
  price_tier?: number      // 1~5 단가등급
  is_ambassador?: boolean
  ambassador_code?: string
  discount_rate?: number
  grade_qualification?: string
  last_order_date?: string
  first_order_date?: string
  total_order_count?: number
  total_order_amount?: number
  outstanding_balance?: number
  // 전자세금계산서 대비 필드 (accounting-specialist)
  biz_no?: string
  ceo_name?: string
  biz_type?: string
  biz_item?: string
  memo?: string
  CreatedAt?: string
  UpdatedAt?: string
  [key: string]: unknown
}

export const getCustomers = (params: Record<string, string | number> = {}) =>
  proxyRequest<ListResponse<Customer>>({
    table: 'customers',
    params: { limit: 25, ...params },
  })

export const getCustomer = (id: number) =>
  proxyRequest<Customer>({
    table: 'customers',
    recordId: id,
  })

export const createCustomer = (data: Partial<Customer>) =>
  proxyRequest<Customer>({
    table: 'customers',
    method: 'POST',
    payload: data,
  })

export const updateCustomer = (id: number, data: Partial<Customer>) =>
  proxyRequest<Customer>({
    table: 'customers',
    method: 'PATCH',
    recordId: id,
    payload: stripAutoFields(data as Record<string, unknown>),
  })

export const deleteCustomer = (id: number) =>
  proxyRequest<void>({
    table: 'customers',
    method: 'DELETE',
    recordId: id,
  })

// ─────────────────────────────────────────
// 제품 (products)
// ─────────────────────────────────────────
export interface Product {
  Id: number
  product_code?: string  // 품목 코드
  name?: string          // 품목명
  alias?: string         // 별칭
  category?: string      // 카테고리
  unit?: string          // 단위
  purchase_price?: number // 매입가
  price1?: number        // 소매가 (MEMBER/씨앗)
  price2?: number        // 강사우대가 (INSTRUCTOR/뿌리)
  price3?: number        // 파트너도매가 (PARTNERS/꽃밭)
  price4?: number        // VIP특가 (정원사)
  price5?: number        // 엠버서더 (별빛)
  price6?: number        // 예비6
  price7?: number        // 예비7
  price8?: number        // 예비8
  is_taxable?: boolean   // 과세여부
  is_active?: boolean    // 활성여부
  [key: string]: unknown
}

// 단가등급별 단가 조회 (1=소매가 ~ 5=엠버서더)
export function getPriceByTier(product: Product, tier: number = 1): number {
  const key = `price${tier}` as keyof Product
  const price = product[key]
  if (typeof price === 'number') return price
  return product.price1 ?? 0
}

export const getProducts = (params: Record<string, string | number> = {}) =>
  proxyRequest<ListResponse<Product>>({
    table: 'products',
    params: { limit: 25, ...params },
  })

export const getProduct = (id: number) =>
  proxyRequest<Product>({
    table: 'products',
    recordId: id,
  })

export const createProduct = (data: Partial<Product>) =>
  proxyRequest<Product>({
    table: 'products',
    method: 'POST',
    payload: data,
  })

export const updateProduct = (id: number, data: Partial<Product>) =>
  proxyRequest<Product>({
    table: 'products',
    method: 'PATCH',
    recordId: id,
    payload: stripAutoFields(data as Record<string, unknown>),
  })

export const deleteProduct = (id: number) =>
  proxyRequest<void>({
    table: 'products',
    method: 'DELETE',
    recordId: id,
  })

// ─────────────────────────────────────────
// 거래명세표 (invoices)
// ─────────────────────────────────────────
export interface Invoice {
  Id: number
  invoice_no?: string
  invoice_date?: string
  customer_id?: number
  customer_name?: string
  status?: string
  receipt_type?: string
  supply_amount?: number
  tax_amount?: number
  total_amount?: number
  paid_amount?: number
  previous_balance?: number
  current_balance?: number
  payment_status?: string
  payment_method?: string
  paid_date?: string
  memo?: string
  taxable?: string
  [key: string]: unknown
}

export const getInvoices = (params: Record<string, string | number> = {}) =>
  proxyRequest<ListResponse<Invoice>>({
    table: 'invoices',
    params: { limit: 25, ...params },
  })

export const getInvoice = (id: number) =>
  proxyRequest<Invoice>({
    table: 'invoices',
    recordId: id,
  })

export const createInvoice = (data: Partial<Invoice>) =>
  proxyRequest<Invoice>({
    table: 'invoices',
    method: 'POST',
    payload: data,
  })

export const updateInvoice = (id: number, data: Partial<Invoice>) =>
  proxyRequest<Invoice>({
    table: 'invoices',
    method: 'PATCH',
    recordId: id,
    payload: stripAutoFields(data as Record<string, unknown>),
  })

// ─────────────────────────────────────────
// 명세표 라인아이템 (items)
// ─────────────────────────────────────────
export interface InvoiceItem {
  Id: number
  invoice_id?: number
  product_id?: number
  product_name?: string
  unit?: string
  quantity?: number
  unit_price?: number
  supply_amount?: number
  tax_amount?: number
  taxable?: string
  [key: string]: unknown
}

export const getItems = (invoiceId: number) =>
  proxyRequest<ListResponse<InvoiceItem>>({
    table: 'items',
    params: {
      where: `(invoice_id,eq,${invoiceId})`,
      limit: 200,
    },
  })

export const bulkCreateItems = (items: Partial<InvoiceItem>[]) =>
  proxyRequest<InvoiceItem[]>({
    table: 'items',
    method: 'POST',
    payload: items,
    bulk: true,
  })

export const bulkDeleteItems = (ids: number[]) =>
  proxyRequest<void>({
    table: 'items',
    method: 'DELETE',
    payload: ids,
    bulk: true,
  })

// ─────────────────────────────────────────
// 명세표 삭제 + 잔액 재계산
// ─────────────────────────────────────────
export const deleteInvoice = (id: number) =>
  proxyRequest<void>({
    table: 'invoices',
    method: 'DELETE',
    recordId: id,
  })

export async function recalcCustomerBalance(customerId: number): Promise<void> {
  // 미완납 명세표 전체 조회
  const unpaid = await proxyRequest<ListResponse<Invoice>>({
    table: 'invoices',
    params: {
      where: `(customer_id,eq,${customerId})~and(payment_status,neq,paid)`,
      limit: 500,
    },
  })
  const outstanding = unpaid.list.reduce(
    (s, inv) => s + (inv.total_amount ?? 0) - (inv.paid_amount ?? 0),
    0
  )
  await updateCustomer(customerId, { outstanding_balance: Math.max(0, outstanding) })
}

// ─────────────────────────────────────────
// 공급처 (suppliers)
// ─────────────────────────────────────────
export interface Supplier {
  Id: number
  name?: string
  business_no?: string   // 사업자번호
  ceo_name?: string      // 대표자
  phone1?: string        // 전화
  mobile?: string        // 핸드폰
  email?: string
  address1?: string      // 주소
  bank_name?: string     // 은행명
  bank_account?: string  // 계좌번호
  memo?: string
  is_active?: boolean
  [key: string]: unknown
}

export const getSuppliers = (params: Record<string, string | number> = {}) =>
  proxyRequest<ListResponse<Supplier>>({
    table: 'suppliers',
    params: { limit: 25, ...params },
  })

export const getSupplier = (id: number) =>
  proxyRequest<Supplier>({
    table: 'suppliers',
    recordId: id,
  })

export const createSupplier = (data: Partial<Supplier>) =>
  proxyRequest<Supplier>({
    table: 'suppliers',
    method: 'POST',
    payload: data,
  })

export const updateSupplier = (id: number, data: Partial<Supplier>) =>
  proxyRequest<Supplier>({
    table: 'suppliers',
    method: 'PATCH',
    recordId: id,
    payload: data,
  })

export const deleteSupplier = (id: number) =>
  proxyRequest<void>({
    table: 'suppliers',
    method: 'DELETE',
    recordId: id,
  })

// ─────────────────────────────────────────
// 거래내역 (tbl_tx_history) -- 읽기 전용
// ─────────────────────────────────────────
export interface TxHistory {
  Id: number
  tx_date?: string
  legacy_book_id?: string
  customer_name?: string
  tx_type?: string
  amount?: number
  tax?: number
  memo?: string
  slip_no?: string
  debit_account?: string
  credit_account?: string
  ledger?: string
  tx_year?: number
  CreatedAt?: string
  [key: string]: unknown
}

export const getTxHistory = (params: Record<string, string | number> = {}) =>
  proxyRequest<ListResponse<TxHistory>>({
    table: 'txHistory',
    params: { limit: 50, ...params },
  })
