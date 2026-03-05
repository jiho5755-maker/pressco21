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
// 고객 (customers)
// ─────────────────────────────────────────
export interface Customer {
  Id: number
  name?: string
  phone?: string
  email?: string
  address1?: string
  customer_type?: string
  customer_status?: string
  member_grade?: string
  is_ambassador?: boolean
  ambassador_code?: string
  discount_rate?: number
  grade_qualification?: string
  last_order_date?: string
  first_order_date?: string
  total_order_count?: number
  total_order_amount?: number
  outstanding_balance?: number
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
    payload: data,
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
  name?: string
  code?: string
  unit?: string
  price1?: number
  price2?: number
  price3?: number
  price4?: number
  [key: string]: unknown
}

export const getProducts = (params: Record<string, string | number> = {}) =>
  proxyRequest<ListResponse<Product>>({
    table: 'products',
    params: { limit: 25, ...params },
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
    payload: data,
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
// 공급처 (suppliers)
// ─────────────────────────────────────────
export interface Supplier {
  Id: number
  name?: string
  phone?: string
  email?: string
  [key: string]: unknown
}

export const getSuppliers = (params: Record<string, string | number> = {}) =>
  proxyRequest<ListResponse<Supplier>>({
    table: 'suppliers',
    params: { limit: 25, ...params },
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
