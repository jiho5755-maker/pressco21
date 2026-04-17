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

import { getLegacyReceivableBaseline } from '@/lib/legacySnapshots'
import { getInvoiceDepositUsedAmount } from '@/lib/accountingMeta'
import { normalizeReceiptTypeValue } from '@/lib/invoiceDefaults'

// n8n Webhook 프록시 URL
//
// 보안 기본값은 same-origin Nginx/Vite 프록시(`/crm-proxy`)입니다.
// 운영에서는 Nginx가 n8n의 CORS 헤더를 숨기고 CRM 도메인만 재발행합니다.
// 직접 n8n 공개 URL을 기본값으로 두면 브라우저가 공개 실행면을 우회 호출할 수 있으므로 금지합니다.
const PROXY_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '/crm-proxy'
const PAYMENT_REMINDER_WEBHOOK_URL = import.meta.env.VITE_CRM_PAYMENT_REMINDER_WEBHOOK_URL || '/crm-payment-reminder'
// CRM 전용 API Key (NocoDB 토큰과 무관한 별도 키)
const CRM_API_KEY = import.meta.env.VITE_CRM_API_KEY || ''

// 테이블 논리명 (n8n 프록시에서 Model ID로 변환)
type TableName = 'customers' | 'products' | 'invoices' | 'items' | 'suppliers' | 'txHistory' | 'settings' | 'autoDepositReviewQueue'

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

export interface PaymentReminderWebhookPayload {
  action: 'upsert' | 'cancel'
  invoiceId: number
  invoiceNo?: string
  invoiceDate?: string
  customerId?: number
  customerName: string
  dueDate?: string
  reminderDate?: string
  reminderLeadDays: number
  amount: number
  remainingAmount: number
  publicMemo?: string
  internalMemo?: string
  target: 'pressco21-ops-room'
}

export interface PaymentReminderWebhookResponse {
  success?: boolean
  ok?: boolean
  message?: string
  scheduledFor?: string
}

function redirectToLogin() {
  if (typeof window === 'undefined') return
  const next = `${window.location.pathname}${window.location.search}${window.location.hash}`
  const encodedNext = encodeURIComponent(next || '/')
  window.location.href = `/login?next=${encodedNext}`
}

export interface AutoDepositReviewQueueRecord {
  queueId: string
  status: 'review' | 'unmatched' | 'resolved' | 'dismissed'
  sender: string
  amount: number
  occurredAt: string
  externalId?: string
  source?: string
  reason?: string
  candidates?: unknown[]
  createdAt?: string
  updatedAt?: string
  resolvedAt?: string | null
  resolvedBy?: string | null
  resolvedNote?: string | null
}

export interface AutoDepositReviewQueueListResponse {
  ok: boolean
  items: AutoDepositReviewQueueRecord[]
  summary: {
    total: number
    review: number
    unmatched: number
    resolved: number
    dismissed: number
  }
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
    if (res.status === 401) {
      redirectToLogin()
    }
    throw new Error(`Proxy Error ${res.status}: ${await res.text()}`)
  }

  const json: ProxyResponse<T> = await res.json()

  if (!json.success) {
    throw new Error(`[${json.error?.code || 'PROXY_ERROR'}] ${json.error?.message || 'Unknown proxy error'}`)
  }

  return json.data as T
}

export async function upsertPaymentReminder(
  payload: PaymentReminderWebhookPayload,
): Promise<PaymentReminderWebhookResponse> {
  const res = await fetch(PAYMENT_REMINDER_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-crm-key': CRM_API_KEY,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(`Reminder Webhook Error ${res.status}: ${await res.text()}`)
  }

  const json = await res.json().catch(() => ({ ok: true })) as PaymentReminderWebhookResponse
  if (json.success === false || json.ok === false) {
    throw new Error(json.message || '리마인더 예약 요청이 실패했습니다')
  }
  return json
}

// ─────────────────────────────────────────
// 공통 목록 응답 타입 (NocoDB 호환)
// ─────────────────────────────────────────
export interface ListResponse<T> {
  list: T[]
  pageInfo: { totalRows: number; page: number; pageSize: number; isLastPage: boolean }
}

export async function getAutoDepositReviewQueue(): Promise<AutoDepositReviewQueueListResponse> {
  return proxyRequest<AutoDepositReviewQueueListResponse>({
    table: 'autoDepositReviewQueue',
    method: 'POST',
    payload: { action: 'list' },
  })
}

export async function dismissAutoDepositReviewQueue(queueId: string, resolvedBy: string, note?: string) {
  return proxyRequest<{ ok: boolean }>({
    table: 'autoDepositReviewQueue',
    method: 'POST',
    payload: {
      action: 'dismiss',
      queueId,
      resolvedBy,
      note: note ?? '',
    },
  })
}

async function fetchAllPages<T>(
  fetchPage: (params: Record<string, string | number>) => Promise<ListResponse<T>>,
  params: Record<string, string | number> = {},
  pageSize = 500,
): Promise<T[]> {
  const baseParams = { ...params }
  delete baseParams.limit
  delete baseParams.offset

  const rows: T[] = []
  let offset = 0

  for (let page = 0; page < 100; page++) {
    const result = await fetchPage({
      ...baseParams,
      limit: pageSize,
      offset,
    })
    rows.push(...result.list)

    if (result.pageInfo?.isLastPage || result.list.length < pageSize) break
    offset += pageSize
  }

  return rows
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

function pickFirstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string') return value
  }
  return undefined
}

function pickFirstNonBlankString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value !== 'string') continue
    const trimmed = value.trim()
    if (trimmed) return trimmed
  }
  return undefined
}

function normalizePositiveId(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const parsed = Number(trimmed)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return undefined
}

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

function normalizeNullableString(value: unknown): string | null | unknown {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const NULLABLE_CUSTOMER_TEXT_FIELDS = new Set([
  'phone1',
  'phone2',
  'mobile',
  'email',
  'customer_type',
  'customer_status',
  'ambassador_code',
  'grade_qualification',
  'business_no',
  'ceo_name',
  'business_type',
  'business_item',
  'business_address',
  'memo',
  'extra_addresses',
  ...Array.from({ length: 10 }, (_, index) => `address${index + 1}`),
])

const PAYMENT_STATUS_SET = new Set(['paid', 'partial', 'unpaid'])

function normalizeReceiptType(value: unknown): string | undefined {
  return normalizeReceiptTypeValue(value)
}

function normalizePaymentStatus(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  return PAYMENT_STATUS_SET.has(value) ? value : undefined
}

// ─────────────────────────────────────────
// 고객 (customers)
// ─────────────────────────────────────────
export interface Customer {
  Id: number
  legacy_id?: number | string
  book_name?: string
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
  address7?: string
  address8?: string
  address9?: string
  address10?: string
  extra_addresses?: string | null
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
  business_no?: string
  ceo_name?: string
  biz_type?: string
  business_type?: string
  biz_item?: string
  business_item?: string
  business_address?: string
  memo?: string
  CreatedAt?: string
  UpdatedAt?: string
  [key: string]: unknown
}

function normalizeCustomerRecord(customer: Customer): Customer {
  const phone = pickFirstString(customer.phone, customer.phone1)
  const phone1 = pickFirstString(customer.phone1, customer.phone)
  return {
    ...customer,
    phone,
    phone1,
    biz_no: pickFirstString(customer.biz_no, customer.business_no),
    business_no: pickFirstString(customer.business_no, customer.biz_no),
    biz_type: pickFirstString(customer.biz_type, customer.business_type),
    business_type: pickFirstString(customer.business_type, customer.biz_type),
    biz_item: pickFirstString(customer.biz_item, customer.business_item),
    business_item: pickFirstString(customer.business_item, customer.biz_item),
    extra_addresses: typeof customer.extra_addresses === 'string' ? customer.extra_addresses : null,
  }
}

function normalizeCustomerAddressText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function parseCustomerExtraAddresses(customer: Customer | null | undefined): string[] {
  if (!customer?.extra_addresses || typeof customer.extra_addresses !== 'string') return []
  try {
    const parsed = JSON.parse(customer.extra_addresses) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeCustomerAddressText)
      .filter((value): value is string => value !== null)
  } catch {
    return []
  }
}

export function getCustomerAddressEntries(
  customer: Customer | null | undefined,
): Array<{ key: string; value: string }> {
  if (!customer) return []

  const entries: Array<{ key: string; value: string }> = []
  const primary = normalizeCustomerAddressText(customer.address1)
  const secondary = normalizeCustomerAddressText(customer.address2)

  if (primary) entries.push({ key: 'address1', value: primary })
  if (secondary) entries.push({ key: 'address2', value: secondary })

  for (const [index, value] of parseCustomerExtraAddresses(customer).entries()) {
    if (entries.some((entry) => entry.value === value)) continue
    entries.push({ key: `extra_addresses:${index}`, value })
  }

  return entries
}

export function getCustomerAddressValueByKey(
  customer: Customer | null | undefined,
  addressKey?: string,
): string {
  const entries = getCustomerAddressEntries(customer)
  if (entries.length === 0) return ''
  if (addressKey) {
    const exact = entries.find((entry) => entry.key === addressKey)
    if (exact) return exact.value
  }
  return entries[0]?.value ?? ''
}

function normalizeCustomerList(result: ListResponse<Customer>): ListResponse<Customer> {
  return {
    ...result,
    list: result.list.map(normalizeCustomerRecord),
  }
}

function serializeCustomerPayload(data: Partial<Customer>): Partial<Customer> {
  const payload = stripAutoFields(data as Record<string, unknown>) as Record<string, unknown>

  for (const key of NULLABLE_CUSTOMER_TEXT_FIELDS) {
    if (!hasOwn(payload, key)) continue
    payload[key] = normalizeNullableString(payload[key])
  }

  if (hasOwn(payload, 'phone') || hasOwn(payload, 'phone1')) {
    payload.phone1 = pickFirstNonBlankString(payload.phone, payload.phone1) ?? null
  }
  if (hasOwn(payload, 'biz_no') || hasOwn(payload, 'business_no')) {
    payload.business_no = pickFirstNonBlankString(payload.biz_no, payload.business_no) ?? null
  }
  if (hasOwn(payload, 'biz_type') || hasOwn(payload, 'business_type')) {
    payload.business_type = pickFirstNonBlankString(payload.biz_type, payload.business_type) ?? null
  }
  if (hasOwn(payload, 'biz_item') || hasOwn(payload, 'business_item')) {
    payload.business_item = pickFirstNonBlankString(payload.biz_item, payload.business_item) ?? null
  }

  delete payload.phone
  delete payload.biz_no
  delete payload.biz_type
  delete payload.biz_item

  return payload as Partial<Customer>
}

export const getCustomers = (params: Record<string, string | number> = {}) =>
  proxyRequest<ListResponse<Customer>>({
    table: 'customers',
    params: { limit: 25, ...params },
  }).then(normalizeCustomerList)

export const getCustomer = (id: number) =>
  proxyRequest<Customer>({
    table: 'customers',
    recordId: id,
  }).then(normalizeCustomerRecord)

export const getAllCustomers = (
  params: Record<string, string | number> = {},
  pageSize = 500,
) => fetchAllPages(getCustomers, params, pageSize)

export async function findCustomerByInvoiceLink(
  customerId?: number,
  customerName?: string,
): Promise<Customer | null> {
  const normalizedCustomerId = normalizePositiveId(customerId)
  if (normalizedCustomerId) {
    try {
      return await getCustomer(normalizedCustomerId)
    } catch {
      // Fall through to exact-name lookup for older invoices missing valid links.
    }
  }

  const safeName = sanitizeSearchTerm(customerName ?? '')
  if (!safeName) return null

  const result = await getCustomers({
    where: `(name,eq,${safeName})`,
    limit: 2,
  })
  const totalMatches = result.pageInfo?.totalRows ?? result.list.length
  if (totalMatches !== 1) return null
  return result.list[0] ?? null
}

export const createCustomer = (data: Partial<Customer>) =>
  proxyRequest<Customer>({
    table: 'customers',
    method: 'POST',
    payload: serializeCustomerPayload(data),
  }).then(normalizeCustomerRecord)

export const updateCustomer = (id: number, data: Partial<Customer>) =>
  proxyRequest<Customer>({
    table: 'customers',
    method: 'PATCH',
    recordId: id,
    payload: serializeCustomerPayload(data),
  }).then(normalizeCustomerRecord)

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
  customer_phone?: string
  customer_address?: string
  customer_address_key?: string
  customer_bizno?: string
  customer_ceo_name?: string
  customer_biz_type?: string
  customer_biz_item?: string
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
  paid_date?: string | null
  memo?: string
  taxable?: string
  [key: string]: unknown
}

function normalizeInvoiceRecord(invoice: Invoice): Invoice {
  return {
    ...invoice,
    receipt_type: normalizeReceiptType(invoice.receipt_type) ?? normalizeReceiptType(invoice.status),
    payment_status:
      normalizePaymentStatus(invoice.payment_status) ??
      normalizePaymentStatus(invoice.status) ??
      invoice.payment_status,
  }
}

function normalizeInvoiceList(result: ListResponse<Invoice>): ListResponse<Invoice> {
  return {
    ...result,
    list: result.list.map(normalizeInvoiceRecord),
  }
}

function serializeInvoicePayload(data: Partial<Invoice>): Partial<Invoice> {
  const payload = stripAutoFields(data as Record<string, unknown>) as Partial<Invoice>
  const receiptType = normalizeReceiptType(payload.receipt_type)

  if (receiptType) payload.status = receiptType
  else delete payload.status

  delete payload.receipt_type
  return payload
}

export const getInvoices = (params: Record<string, string | number> = {}) =>
  proxyRequest<ListResponse<Invoice>>({
    table: 'invoices',
    params: { limit: 25, ...params },
  }).then(normalizeInvoiceList)

export const getInvoice = (id: number) =>
  proxyRequest<Invoice>({
    table: 'invoices',
    recordId: id,
  }).then(normalizeInvoiceRecord)

export const getAllInvoices = (
  params: Record<string, string | number> = {},
  pageSize = 500,
) => fetchAllPages(getInvoices, params, pageSize)

export const createInvoice = (data: Partial<Invoice>) =>
  proxyRequest<Invoice>({
    table: 'invoices',
    method: 'POST',
    payload: serializeInvoicePayload(data),
  }).then(normalizeInvoiceRecord)

export const updateInvoice = (id: number, data: Partial<Invoice>) =>
  proxyRequest<Invoice>({
    table: 'invoices',
    method: 'PATCH',
    recordId: id,
    payload: serializeInvoicePayload(data),
  }).then(normalizeInvoiceRecord)

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

export const createItem = (data: Partial<InvoiceItem>) =>
  proxyRequest<InvoiceItem>({
    table: 'items',
    method: 'POST',
    payload: data,
  })

export const deleteItem = (id: number) =>
  proxyRequest<void>({
    table: 'items',
    method: 'DELETE',
    recordId: id,
  })

export async function bulkCreateItems(items: Partial<InvoiceItem>[]) {
  const created: InvoiceItem[] = []
  for (const item of items) {
    created.push(await createItem(item))
  }
  return created
}

export async function bulkDeleteItems(ids: number[]) {
  for (const id of ids) {
    await deleteItem(id)
  }
}

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
  await recalcCustomerStats(customerId)
}

// CRM 명세표 + 레거시 거래내역 기반 고객 통계 종합 재계산
// (last_order_date, total_order_count, total_order_amount, outstanding_balance)
export async function recalcCustomerStats(customerId: number): Promise<void> {
  const customer = await getCustomer(customerId)

  // 1. CRM 명세표 전체 조회
  const crmResult = await proxyRequest<ListResponse<Invoice>>({
    table: 'invoices',
    params: {
      where: `(customer_id,eq,${customerId})`,
      sort: '-invoice_date',
      limit: 1000,
      fields: 'Id,invoice_date,total_amount,paid_amount,payment_status,memo',
    },
  })

  let crmTotal = 0, crmCount = 0, crmLastDate = '', outstanding = 0
  for (const inv of crmResult.list) {
    crmTotal += inv.total_amount ?? 0
    crmCount++
    const d = inv.invoice_date?.slice(0, 10) ?? ''
    if (d > crmLastDate) crmLastDate = d
    if (inv.payment_status !== 'paid') {
      // 미수금: 개별 레코드 단위로 음수 방어 (선입금/초과입금 케이스 처리)
      // 동일 고객의 초과입금이 다른 명세표 미수금을 상쇄하지 않도록 0 하한 적용
      const invOutstanding = Math.max(
        0,
        (inv.total_amount ?? 0) - (inv.paid_amount ?? 0) - getInvoiceDepositUsedAmount(inv.memo as string | undefined),
      )
      outstanding += invOutstanding
    }
  }

  // 2. 레거시 거래내역 합산 (출고 유형만)
  let legacyTotal = 0, legacyCount = 0, legacyLastDate = ''
  const legacyId = customer.legacy_id != null ? String(customer.legacy_id).trim() : ''
  const customerName = customer.name?.trim()
  const txWhere = legacyId
    ? `(legacy_book_id,eq,${sanitizeSearchTerm(legacyId)})~and(tx_type,eq,출고)`
    : customerName
      ? `(customer_name,eq,${sanitizeSearchTerm(customerName)})~and(tx_type,eq,출고)`
      : ''
  if (txWhere) {
    const txResult = await proxyRequest<ListResponse<TxHistory>>({
      table: 'txHistory',
      params: {
        where: txWhere,
        sort: '-tx_date',
        limit: 1000,
        fields: 'Id,amount,tx_date',
      },
    })
    for (const tx of txResult.list) {
      legacyTotal += tx.amount ?? 0
      legacyCount++
      const d = tx.tx_date?.slice(0, 10) ?? ''
      if (d > legacyLastDate) legacyLastDate = d
    }
  }

  // 3. 레거시 잔액 baseline 조회
  const legacyBalanceBaseline = await getLegacyReceivableBaseline(customer)

  // 4. 종합 통계 업데이트
  const lastDate = crmLastDate > legacyLastDate ? crmLastDate : (legacyLastDate || crmLastDate)
  const patch: Partial<Customer> = {
    total_order_amount: legacyTotal + crmTotal,
    total_order_count: legacyCount + crmCount,
    // 레거시 잔액 부호를 CRM 미수 방향(양수=받을금액)으로 정규화해서 합산한다.
    outstanding_balance: legacyBalanceBaseline + outstanding,
  }
  if (lastDate) patch.last_order_date = lastDate

  await updateCustomer(customerId, patch)
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
    payload: stripAutoFields(data as Record<string, unknown>),
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

// ─────────────────────────────────────────
// CRM 설정 (settings) — 단일 행 테이블
// ─────────────────────────────────────────
export interface CrmSettings {
  Id?: number
  company?: string
  ceo?: string
  bizno?: string
  phone?: string
  email?: string
  bizType?: string
  bizItem?: string
  address?: string
  logo_url?: string     // data URL (LongText)
  stamp_url?: string    // data URL (LongText)
  bank_name?: string
  bank_account?: string
  bank_holder?: string
  invoice_header?: string
  invoice_footer?: string
  default_taxable?: boolean
  price2_rate?: number
  price3_rate?: number
  price4_rate?: number
  price5_rate?: number
  [key: string]: unknown
}

// 설정 조회 (항상 1행만 사용)
export async function getSettings(): Promise<CrmSettings | null> {
  try {
    const res = await proxyRequest<ListResponse<CrmSettings>>({
      table: 'settings',
      params: { limit: 1 },
    })
    return res.list?.[0] ?? null
  } catch {
    return null
  }
}

// 설정 저장 (Upsert: 행이 없으면 POST, 있으면 PATCH)
export async function saveSettingsToServer(data: Partial<CrmSettings>): Promise<void> {
  const cleaned = stripAutoFields(data as Record<string, unknown>)
  if (data.Id) {
    await proxyRequest<CrmSettings>({
      table: 'settings',
      method: 'PATCH',
      recordId: data.Id,
      payload: cleaned,
    })
  } else {
    // 기존 행 존재 여부 확인
    const existing = await getSettings()
    if (existing?.Id) {
      await proxyRequest<CrmSettings>({
        table: 'settings',
        method: 'PATCH',
        recordId: existing.Id,
        payload: cleaned,
      })
    } else {
      await proxyRequest<CrmSettings>({
        table: 'settings',
        method: 'POST',
        payload: cleaned,
      })
    }
  }
}
