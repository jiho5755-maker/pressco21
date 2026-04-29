/**
 * 테스트 10: 바로빌 전자세금계산서 테스트환경 webhook UI
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
    customerPatch?: Record<string, unknown>
    shipmentConfirmed?: boolean
  },
) {
  const memo = params.memo ?? (params.shipmentConfirmed === false ? undefined : `${INVOICE_META_PREFIX} ${JSON.stringify({
    depositUsedAmount: 0,
    discountAmount: 0,
    fulfillmentStatus: 'shipment_confirmed',
    shipmentConfirmedAt: new Date().toISOString(),
    paymentHistory: [],
  })}`)
  const customer = await createTestCustomer(request, {
    name: params.customerName,
    customer_status: 'active',
    customer_type: 'MEMBER',
    ...params.customerPatch,
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
    supply_amount: 9091,
    tax_amount: 909,
    total_amount: 10000,
    current_balance: 10000,
    payment_status: 'unpaid',
    status: 'unpaid',
    memo,
  })
  await createTestItem(request, {
    invoice_id: invoice.Id,
    product_name: '테스트 세금계산서 품목',
    unit: '개',
    quantity: 1,
    unit_price: 10000,
    supply_amount: 9091,
    tax_amount: 909,
    taxable: '과세',
  })
  return { customer, invoice }
}

test.afterEach(async ({ request }) => {
  await cleanupTestInvoices(request, TAX_INVOICE_PREFIX)
  await cleanupTestCustomers(request, CUSTOMER_PREFIX)
})

test('T10-00: 출고확정 전 명세표는 세금계산서 발급 버튼이 차단된다', async ({ page, request }) => {
  const uniqueId = Date.now()
  const invoiceNo = `${TAX_INVOICE_PREFIX}PRE-SHIP-${uniqueId}`
  const customerName = `${CUSTOMER_PREFIX}PRE-SHIP-${uniqueId}`
  await seedTaxInvoiceTarget(request, {
    invoiceNo,
    customerName,
    shipmentConfirmed: false,
    customerPatch: {
      business_no: '1234567890',
      ceo_name: '테스트대표',
      business_type: '도소매',
      business_item: '꽃자재',
      business_address: '서울시 테스트구 테스트로 1',
      email: 'tax-invoice-test@example.com',
    },
  })

  await page.goto('/invoices')
  await waitForTableLoaded(page)
  await page.getByPlaceholder('거래처명으로 검색...').fill(customerName)

  const row = page.locator('tbody tr', { hasText: invoiceNo }).first()
  await expect(row).toBeVisible({ timeout: API_TIMEOUT })
  await expect(row.getByRole('button', { name: /포장·출고확정/ })).toBeEnabled()
  await expect(row.getByRole('button', { name: /출고확정 후 발급/ })).toBeDisabled()
})

test('T10-01: 필수 사업자 정보 누락 시 발급 요청이 차단된다', async ({ page, request }) => {
  const uniqueId = Date.now()
  const invoiceNo = `${TAX_INVOICE_PREFIX}MISSING-${uniqueId}`
  const customerName = `${CUSTOMER_PREFIX}MISSING-${uniqueId}`
  await seedTaxInvoiceTarget(request, { invoiceNo, customerName })

  await page.goto('/invoices')
  await waitForTableLoaded(page)
  await page.getByPlaceholder('거래처명으로 검색...').fill(customerName)

  const row = page.locator('tbody tr', { hasText: invoiceNo }).first()
  await expect(row).toBeVisible({ timeout: API_TIMEOUT })
  await row.getByRole('button', { name: /세금계산서 발급/ }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: '바로빌 전자세금계산서 발급' })).toBeVisible({ timeout: API_TIMEOUT })
  await expect(dialog.getByText('공급받는자 사업자번호가 없습니다')).toBeVisible()
  await expect(dialog.getByText('공급받는자 대표자가 없습니다')).toBeVisible()
  await expect(dialog.getByText('전자세금계산서 수신 이메일이 없습니다')).toBeVisible()
  await expect(dialog.getByRole('button', { name: '테스트 세금계산서 발급' })).toBeDisabled()
})

test('T10-02: 이미 요청된 명세표는 중복 발급 요청 대신 발급내역을 보여준다', async ({ page, request }) => {
  const uniqueId = Date.now()
  const invoiceNo = `${TAX_INVOICE_PREFIX}REQUESTED-${uniqueId}`
  const customerName = `${CUSTOMER_PREFIX}REQUESTED-${uniqueId}`
  const requestedAt = new Date().toISOString()
  const memo = `${INVOICE_META_PREFIX} ${JSON.stringify({
    depositUsedAmount: 0,
    discountAmount: 0,
    fulfillmentStatus: 'shipment_confirmed',
    shipmentConfirmedAt: requestedAt,
    taxInvoiceStatus: 'requested',
    taxInvoice: {
      provider: 'barobill',
      issueType: 'normal',
      mgtKey: `PC21-${uniqueId}`,
      requestId: `dryrun-${uniqueId}`,
      requestedAt,
      requestedBy: 'playwright',
      lastStatusSyncedAt: requestedAt,
      statusCode: 'REQUESTED',
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
  await expect(dialog.getByRole('button', { name: /취소\/상쇄 요청|발급취소|수정세금계산서 상쇄/ })).toBeEnabled()
})

test('T10-03: 발급/상태 새로고침 버튼이 바로빌 n8n 테스트 webhook을 호출한다', async ({ page, request }) => {
  const uniqueId = Date.now()
  const invoiceNo = `${TAX_INVOICE_PREFIX}WEBHOOK-${uniqueId}`
  const customerName = `${CUSTOMER_PREFIX}WEBHOOK-${uniqueId}`
  const { invoice } = await seedTaxInvoiceTarget(request, {
    invoiceNo,
    customerName,
    customerPatch: {
      business_no: '1234567890',
      ceo_name: '테스트대표',
      business_type: '도소매',
      business_item: '꽃자재',
      business_address: '서울시 테스트구 테스트로 1',
      email: 'tax-invoice-test@example.com',
    },
  })

  let issueCalled = false
  let syncCalled = false
  let providerMgtKey = ''

  await page.route('**/webhook/crm/barobill/tax-invoices/issue', async (route) => {
    issueCalled = true
    const body = route.request().postDataJSON() as Record<string, unknown>
    providerMgtKey = String(body.providerMgtKey ?? '')

    expect(route.request().method()).toBe('POST')
    expect(body.mode).toBe('test')
    expect(body.invoiceId).toBe(invoice.Id)
    expect(body.invoiceNo).toBe(invoiceNo)
    expect(body.idempotencyKey).toBe(`barobill:tax-invoice:pressco21:${invoice.Id}:${invoiceNo}`)
    expect(providerMgtKey).toMatch(/^PC/)
    expect(body.sendEmail).toBe(true)
    expect(body.sendSms).toBe(false)
    expect(body.amounts).toMatchObject({
      supplyAmount: 9091,
      taxAmount: 909,
      totalAmount: 10000,
    })
    expect(Array.isArray(body.items)).toBe(true)
    expect((body.items as Array<Record<string, unknown>>)[0]).toMatchObject({
      unitPrice: 9091,
      supplyAmount: 9091,
      taxAmount: 909,
    })

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        ok: true,
        requestId: body.requestId,
        invoiceId: invoice.Id,
        invoiceNo,
        idempotencyKey: body.idempotencyKey,
        provider: 'barobill',
        providerMgtKey,
        mode: 'test',
        status: 'requested',
        barobillResultCode: 1,
        message: '바로빌 테스트 SOAP 발급 요청 완료',
        crmUpdated: true,
      }),
    })
  })

  await page.route('**/webhook/crm/barobill/tax-invoices/sync-status', async (route) => {
    syncCalled = true
    const body = route.request().postDataJSON() as Record<string, unknown>

    expect(route.request().method()).toBe('POST')
    expect(body.mode).toBe('test')
    expect(body.invoiceId).toBe(invoice.Id)
    expect(body.providerMgtKey).toBe(providerMgtKey)

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        ok: true,
        requestId: body.requestId,
        invoiceId: invoice.Id,
        invoiceNo,
        idempotencyKey: body.idempotencyKey,
        provider: 'barobill',
        providerMgtKey,
        mode: 'test',
        status: 'issued',
        barobillState: 3000,
        ntsSendState: 3,
        ntsConfirmNum: 'TEST-APPROVAL-1234',
        message: '국세청 승인번호 확인',
        crmUpdated: true,
      }),
    })
  })

  await page.goto('/invoices')
  await waitForTableLoaded(page)
  await page.getByPlaceholder('거래처명으로 검색...').fill(customerName)

  const row = page.locator('tbody tr', { hasText: invoiceNo }).first()
  await expect(row).toBeVisible({ timeout: API_TIMEOUT })
  await row.getByRole('button', { name: /세금계산서 발급/ }).click()

  const requestDialog = page.getByRole('dialog')
  await expect(requestDialog.getByRole('heading', { name: '바로빌 전자세금계산서 발급' })).toBeVisible({ timeout: API_TIMEOUT })
  await requestDialog.getByRole('button', { name: '테스트 세금계산서 발급' }).click()
  await expect.poll(() => issueCalled).toBe(true)

  const detailDialog = page.getByRole('dialog')
  await expect(detailDialog.getByRole('heading', { name: '세금계산서 발급내역' })).toBeVisible({ timeout: API_TIMEOUT })
  await expect(detailDialog.getByText('바로빌 테스트 SOAP 발급 요청 완료')).toBeVisible()
  await detailDialog.getByRole('button', { name: '닫기' }).click()

  await expect(row.getByText('세금계산서 요청됨')).toBeVisible({ timeout: API_TIMEOUT })
  await row.getByRole('button', { name: /상태 확인|상태 새로고침/ }).click()
  await expect.poll(() => syncCalled).toBe(true)
  await expect(row.getByText('세금계산서 발급완료')).toBeVisible({ timeout: API_TIMEOUT })
  await expect(row.getByText(/승인 TEST…1234/)).toBeVisible()
})
