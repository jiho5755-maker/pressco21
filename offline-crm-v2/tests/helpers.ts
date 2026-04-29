/**
 * Playwright 테스트 공통 헬퍼
 * PRESSCO21 Offline CRM v2
 */
import { APIRequestContext, Page, expect } from '@playwright/test'
import { DEFAULT_RECEIPT_TYPE } from '../src/lib/invoiceDefaults'

// ─── 상수 ───────────────────────────────────────────────

/** 사이드바 메뉴 라벨 → URL 경로 매핑 */
export const ROUTES = {
  dashboard:   '/',
  customers:   '/customers',
  invoices:    '/invoices',
  receivables: '/receivables',
  products:    '/products',
  suppliers:   '/suppliers',
  transactions:'/transactions',
  calendar:    '/calendar',
  depositInbox:'/deposit-inbox',
  tradeWorkQueue: '/trade-work-queue',
  monthEndReview: '/month-end-review',
} as const

/** NocoDB API가 실제 데이터를 반환할 때까지 최대 대기 시간 (ms) */
export const API_TIMEOUT = 20_000
export const TEST_INVOICE_PREFIX = 'TEST-E2E-PLAYWRIGHT-'

const CRM_PROXY_PATH = '/crm-proxy'
const CRM_API_KEY = process.env.VITE_CRM_API_KEY || '6e154a8fa69c067c096b237f6432456451b2cb7fd107cf7d10d98025edc420e8'

interface ProxyRequest {
  table: 'customers' | 'products' | 'suppliers' | 'invoices' | 'items'
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
}

interface ListResponse<T> {
  list: T[]
}

interface InvoiceCleanupRow {
  Id: number
  invoice_no?: string
}

interface InvoiceCreateRow {
  Id: number
  invoice_no?: string
  customer_id?: number
  customer_name?: string
}

interface ItemCleanupRow {
  Id: number
}

interface ProductCleanupRow {
  Id: number
  name?: string
  product_code?: string
}

interface SupplierCleanupRow {
  Id: number
  name?: string
}

interface CustomerCleanupRow {
  Id: number
  name?: string
  outstanding_balance?: number
}

export function getTodayDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export { DEFAULT_RECEIPT_TYPE }

async function proxyRequest<T>(request: APIRequestContext, req: ProxyRequest): Promise<T> {
  const res = await request.post(CRM_PROXY_PATH, {
    headers: {
      'Content-Type': 'application/json',
      'x-crm-key': CRM_API_KEY,
    },
    data: {
      table: req.table,
      method: req.method || 'GET',
      recordId: req.recordId,
      params: req.params,
      payload: req.payload,
      bulk: req.bulk,
    },
  })

  if (!res.ok()) {
    throw new Error(`Proxy Error ${res.status()}: ${await res.text()}`)
  }

  const json = await res.json() as ProxyResponse<T>
  if (!json.success) {
    throw new Error(`[${json.error?.code || 'PROXY_ERROR'}] ${json.error?.message || 'Unknown proxy error'}`)
  }

  return json.data as T
}

export async function cleanupTestInvoices(request: APIRequestContext, prefix = TEST_INVOICE_PREFIX): Promise<void> {
  const result = await proxyRequest<ListResponse<InvoiceCleanupRow>>(request, {
    table: 'invoices',
    params: {
      limit: 500,
      sort: '-Id',
      fields: 'Id,invoice_no',
    },
  })

  const matches = result.list.filter((row) => row.invoice_no?.startsWith(prefix))

  for (const invoice of matches) {
    const items = await proxyRequest<ListResponse<ItemCleanupRow>>(request, {
      table: 'items',
      params: {
        where: `(invoice_id,eq,${invoice.Id})`,
        limit: 200,
        fields: 'Id',
      },
    })

    for (const item of items.list) {
      await proxyRequest<void>(request, {
        table: 'items',
        method: 'DELETE',
        recordId: item.Id,
      })
    }

    await proxyRequest<void>(request, {
      table: 'invoices',
      method: 'DELETE',
      recordId: invoice.Id,
    })
  }
}

export async function cleanupTestProducts(request: APIRequestContext, prefix = 'TEST-PRODUCT-'): Promise<void> {
  const result = await proxyRequest<ListResponse<ProductCleanupRow>>(request, {
    table: 'products',
    params: {
      limit: 500,
      sort: '-Id',
      fields: 'Id,name,product_code',
    },
  })

  const matches = result.list.filter((row) =>
    row.name?.startsWith(prefix) || row.product_code?.startsWith(prefix)
  )

  for (const product of matches) {
    await proxyRequest<void>(request, {
      table: 'products',
      method: 'DELETE',
      recordId: product.Id,
    })
  }
}

export async function cleanupTestSuppliers(request: APIRequestContext, prefix = 'TEST-SUPPLIER-'): Promise<void> {
  const result = await proxyRequest<ListResponse<SupplierCleanupRow>>(request, {
    table: 'suppliers',
    params: {
      limit: 500,
      sort: '-Id',
      fields: 'Id,name',
    },
  })

  const matches = result.list.filter((row) => row.name?.startsWith(prefix))

  for (const supplier of matches) {
    await proxyRequest<void>(request, {
      table: 'suppliers',
      method: 'DELETE',
      recordId: supplier.Id,
    })
  }
}

export async function cleanupTestCustomers(request: APIRequestContext, prefix = 'TEST-CUSTOMER-'): Promise<void> {
  const result = await proxyRequest<ListResponse<CustomerCleanupRow>>(request, {
    table: 'customers',
    params: {
      limit: 500,
      sort: '-Id',
      fields: 'Id,name',
    },
  })

  const matches = result.list.filter((row) => row.name?.startsWith(prefix))

  for (const customer of matches) {
    await proxyRequest<void>(request, {
      table: 'customers',
      method: 'DELETE',
      recordId: customer.Id,
    })
  }
}

export async function getTestCustomer(request: APIRequestContext, customerId: number): Promise<CustomerCleanupRow> {
  return proxyRequest<CustomerCleanupRow>(request, {
    table: 'customers',
    recordId: customerId,
  })
}

export async function createTestCustomer(
  request: APIRequestContext,
  payload: Record<string, unknown>,
): Promise<CustomerCleanupRow> {
  return proxyRequest<CustomerCleanupRow>(request, {
    table: 'customers',
    method: 'POST',
    payload,
  })
}

export async function createTestInvoice(
  request: APIRequestContext,
  payload: Record<string, unknown>,
): Promise<InvoiceCreateRow> {
  return proxyRequest<InvoiceCreateRow>(request, {
    table: 'invoices',
    method: 'POST',
    payload,
  })
}

export async function createTestItem(
  request: APIRequestContext,
  payload: Record<string, unknown>,
): Promise<ItemCleanupRow> {
  return proxyRequest<ItemCleanupRow>(request, {
    table: 'items',
    method: 'POST',
    payload,
  })
}

// ─── 네비게이션 헬퍼 ─────────────────────────────────────

/**
 * 사이드바 메뉴 클릭으로 페이지 이동
 * @param page Playwright Page 객체
 * @param label 사이드바에 표시되는 메뉴 텍스트 (예: '고객 관리')
 * @param expectedUrl 이동 후 기대하는 URL 패턴 (선택)
 */
export async function navigateTo(
  page: Page,
  label: string,
  expectedUrl?: string
): Promise<void> {
  await page.getByRole('link', { name: label }).click()
  if (expectedUrl) {
    await expect(page).toHaveURL(new RegExp(expectedUrl))
  }
}

// ─── 로딩 대기 헬퍼 ─────────────────────────────────────

/**
 * 테이블 로딩 완료 대기
 * "불러오는 중..." 텍스트가 사라지거나
 * 실제 데이터 행 또는 "없음" 메시지가 나타날 때까지 대기
 */
export async function waitForTableLoaded(page: Page): Promise<void> {
  // "불러오는 중..." 스피너가 사라질 때까지 대기
  await expect(page.getByText('불러오는 중...')).toHaveCount(0, {
    timeout: API_TIMEOUT,
  })
}

/**
 * API 에러 없음 확인
 * "데이터를 불러오지 못했습니다." 텍스트가 없어야 함
 */
export async function assertNoApiError(page: Page): Promise<void> {
  await expect(page.getByText('데이터를 불러오지 못했습니다.')).toHaveCount(0)
}

// ─── 헤더/타이틀 확인 헬퍼 ───────────────────────────────

/**
 * 페이지 h2 제목 텍스트 확인
 */
export async function assertPageTitle(page: Page, title: string): Promise<void> {
  await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible()
}

// ─── KPI 카드 헬퍼 ──────────────────────────────────────

/**
 * KPI 카드 존재 + 제목 텍스트 확인
 * @param page Playwright Page 객체
 * @param title 카드 제목 텍스트 (예: '이번 달 매출')
 */
export async function assertKpiCard(page: Page, title: string): Promise<void> {
  // CardTitle 내에 해당 텍스트가 있는 요소 확인
  await expect(page.getByText(title, { exact: true })).toBeVisible({
    timeout: API_TIMEOUT,
  })
}

// ─── Dialog 헬퍼 ─────────────────────────────────────────

/**
 * Dialog가 열릴 때까지 대기
 * @param page Playwright Page 객체
 * @param titleText Dialog 제목 텍스트 (예: '새 명세표')
 */
export async function waitForDialog(page: Page, titleText: string): Promise<void> {
  await expect(
    page.getByRole('dialog').getByText(titleText)
  ).toBeVisible({ timeout: 10_000 })
}

/**
 * Dialog 닫기 (취소 버튼 클릭)
 */
export async function closeDialog(page: Page): Promise<void> {
  await page.getByRole('button', { name: '취소' }).click()
  // Dialog가 사라질 때까지 대기
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 5_000 })
}
