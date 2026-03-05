/**
 * NocoDB API 클라이언트
 * TODO (CRM-009): n8n Webhook 프록시로 교체하여 토큰 격리
 * 현재: 임시 직접 호출 (개발 환경 전용)
 */
import { NOCODB_BASE_URL, NOCODB_TOKEN, NOCODB_PROJECT_ID } from './constants'

const BASE = `${NOCODB_BASE_URL}/api/v1/db/data/noco/${NOCODB_PROJECT_ID}`

async function request<T>(
  tableId: string,
  options: RequestInit = {},
  params: Record<string, string | number> = {}
): Promise<T> {
  const url = new URL(`${BASE}/${tableId}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))

  const res = await fetch(url.toString(), {
    ...options,
    headers: {
      'xc-token': NOCODB_TOKEN,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) throw new Error(`API Error ${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}

// 공통 목록 응답 타입
export interface ListResponse<T> {
  list: T[]
  pageInfo: { totalRows: number; page: number; pageSize: number; isLastPage: boolean }
}

// --- 고객 (customers) ---
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
  request<ListResponse<Customer>>('mffgxkftaeppyk0', {}, { limit: 25, ...params })

export const getCustomer = (id: number) =>
  request<Customer>(`mffgxkftaeppyk0/${id}`)

export const createCustomer = (data: Partial<Customer>) =>
  request<Customer>('mffgxkftaeppyk0', { method: 'POST', body: JSON.stringify(data) })

export const updateCustomer = (id: number, data: Partial<Customer>) =>
  request<Customer>(`mffgxkftaeppyk0/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

export const deleteCustomer = (id: number) =>
  request(`mffgxkftaeppyk0/${id}`, { method: 'DELETE' })

// --- 제품 (products) ---
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
  request<ListResponse<Product>>('mioztktmluobmmo', {}, { limit: 25, ...params })

// --- 거래명세표 (invoices) ---
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
  request<ListResponse<Invoice>>('ml81i9mcuw0pjzk', {}, { limit: 25, ...params })

export const getInvoice = (id: number) =>
  request<Invoice>(`ml81i9mcuw0pjzk/${id}`)

export const createInvoice = (data: Partial<Invoice>) =>
  request<Invoice>('ml81i9mcuw0pjzk', { method: 'POST', body: JSON.stringify(data) })

export const updateInvoice = (id: number, data: Partial<Invoice>) =>
  request<Invoice>(`ml81i9mcuw0pjzk/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

// --- 명세표 라인아이템 (items) ---
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
  request<ListResponse<InvoiceItem>>('mxwgdlj56p9joxo', {}, {
    where: `(invoice_id,eq,${invoiceId})`,
    limit: 200,
  })

export const bulkCreateItems = (items: Partial<InvoiceItem>[]) =>
  request<InvoiceItem[]>('mxwgdlj56p9joxo/bulk', { method: 'POST', body: JSON.stringify(items) })

export const bulkDeleteItems = (ids: number[]) =>
  request('mxwgdlj56p9joxo/bulk', { method: 'DELETE', body: JSON.stringify(ids) })

// --- 공급처 (suppliers) ---
export interface Supplier {
  Id: number
  name?: string
  phone?: string
  email?: string
  [key: string]: unknown
}

export const getSuppliers = (params: Record<string, string | number> = {}) =>
  request<ListResponse<Supplier>>('mw6y9qyzex7lix9', {}, { limit: 25, ...params })

// --- 거래내역 (tbl_tx_history) ---
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
  request<ListResponse<TxHistory>>('mtxh72a1f4beeac', {}, { limit: 50, ...params })
