/**
 * 테스트 10: 바로빌 전자세금계산서 dry-run UI
 */
import { test, expect } from '@playwright/test'
import {
  API_TIMEOUT,
  DEFAULT_RECEIPT_TYPE,
  TEST_INVOICE_PREFIX,
  cleanupTestCustomers,
  cleanupTestInvoices,
  createTestCustomer,
  createTestInvoice,
  createTestItem,
  getTodayDateString,
  waitForTableLoaded,
} from './helpers'

const TAX_INVOICE_PREFIX = `${TEST_INVOICE_PREFIX}TAX-`
const CUSTOMER_PREFIX = 'TEST-CUSTOMER-TAX-INVOICE-'
const INVOICE_META_PREFIX = '[ACCOUNTING_INVOICE_META]'

async function seedTaxInvoiceTarget(
  request: Parameters<typeof createTestCustomer>[0],
  params: {
    invoiceNo: string
    customerName: string
    memo?: string
  },
) {
  const customer = await createTestCustomer(request, {
    name: params.customerName,
    customer_status: 'active',
    customer_type: 'MEMBER',
  })
  const invoice = await createTestInvoice(request, {
    invoice_no: params.invoiceNo,
    invoice_date: getTodayDateString(),
    customer_id: customer.Id,
    customer_name: params.customerName,
    receipt_type: DEFAULT_RECEIPT_TYPE,
    previous_balance: 0,
    paid_amount: 0,
    payment_method: '현금',
    supply_amount: 10000,
    tax_amount: 1000,
    total_amount: 11000,
    current_balance: 11000,
    payment_status: 'unpaid',
    status: 'unpaid',
    memo: params.memo,
  })
  await createTestItem(request, {
    invoice_id: invoice.Id,
    product_name: '테스트 세금계산서 품목',
    unit: '개',
    quantity: 1,
    unit_price: 10000,
    supply_amount: 10000,
    tax_amount: 1000,
    taxable: '과세',
  })
  return { customer, invoice }
}

test.afterEach(async ({ request }) => {
  await cleanupTestInvoices(request, TAX_INVOICE_PREFIX)
  await cleanupTestCustomers(request, CUSTOMER_PREFIX)
})

test('T10-01: 필수 사업자 정보 누락 시 발급 요청 저장이 차단된다', async ({ page, request }) => {
  const uniqueId = Date.now()
  const invoiceNo = `${TAX_INVOICE_PREFIX}MISSING-${uniqueId}`
  const customerName = `${CUSTOMER_PREFIX}MISSING-${uniqueId}`
  await seedTaxInvoiceTarget(request, { invoiceNo, customerName })

  await page.goto('/invoices')
  await waitForTableLoaded(page)
  await page.getByPlaceholder('거래처명으로 검색...').fill(customerName)

  const row = page.locator('tbody tr', { hasText: invoiceNo }).first()
  await expect(row).toBeVisible({ timeout: API_TIMEOUT })
  await row.getByRole('button', { name: /발급 요청/ }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: '바로빌 전자세금계산서 발급 요청' })).toBeVisible({ timeout: API_TIMEOUT })
  await expect(dialog.getByText('공급받는자 사업자번호가 없습니다')).toBeVisible()
  await expect(dialog.getByText('공급받는자 대표자가 없습니다')).toBeVisible()
  await expect(dialog.getByText('전자세금계산서 수신 이메일이 없습니다')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'dry-run 발급 요청 저장' })).toBeDisabled()
})

test('T10-02: 이미 요청된 명세표는 중복 발급 요청 대신 발급내역을 보여준다', async ({ page, request }) => {
  const uniqueId = Date.now()
  const invoiceNo = `${TAX_INVOICE_PREFIX}REQUESTED-${uniqueId}`
  const customerName = `${CUSTOMER_PREFIX}REQUESTED-${uniqueId}`
  const requestedAt = new Date().toISOString()
  const memo = `${INVOICE_META_PREFIX} ${JSON.stringify({
    depositUsedAmount: 0,
    discountAmount: 0,
    taxInvoiceStatus: 'requested',
    taxInvoice: {
      provider: 'barobill',
      issueType: 'normal',
      mgtKey: `PC21-${uniqueId}`,
      requestId: `dryrun-${uniqueId}`,
      requestedAt,
      requestedBy: 'playwright',
      lastStatusSyncedAt: requestedAt,
      statusCode: 'DRY_RUN_REQUESTED',
      statusMessage: '중복 요청 방어 테스트',
      mailSent: true,
      smsRequested: false,
    },
    paymentHistory: [],
  })}`
  await seedTaxInvoiceTarget(request, { invoiceNo, customerName, memo })

  await page.goto('/invoices')
  await waitForTableLoaded(page)
  await page.getByPlaceholder('거래처명으로 검색...').fill(customerName)

  const row = page.locator('tbody tr', { hasText: invoiceNo }).first()
  await expect(row).toBeVisible({ timeout: API_TIMEOUT })
  await expect(row.getByText('세금계산서 요청됨')).toBeVisible()
  await row.getByRole('button', { name: /내역 보기/ }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: '세금계산서 발급내역' })).toBeVisible({ timeout: API_TIMEOUT })
  await expect(dialog.getByText(`dryrun-${uniqueId}`)).toBeVisible()
  await expect(dialog.getByRole('button', { name: /상태 새로고침/ })).toBeEnabled()
  await expect(dialog.getByRole('button', { name: '취소 요청 준비' })).toBeDisabled()
})
