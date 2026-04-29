/**
 * 테스트 11: 직접거래 상태 거버넌스 명세표 dry-run
 */
import { test, expect, type Page } from '@playwright/test'
import {
  API_TIMEOUT,
  DEFAULT_RECEIPT_TYPE,
  TEST_INVOICE_PREFIX,
  getTodayDateString,
  waitForTableLoaded,
} from './helpers'

const GOVERNANCE_INVOICE_PREFIX = `${TEST_INVOICE_PREFIX}GOV-`
const GOVERNANCE_CUSTOMER_PREFIX = 'TEST-CUSTOMER-GOV-'

async function mockCrmProxy(page: Page, invoice: Record<string, unknown>, customer: Record<string, unknown>) {
  await page.route('**/crm-proxy', async (route) => {
    const body = route.request().postDataJSON() as { table?: string; recordId?: number; params?: Record<string, unknown> }
    let data: unknown
    if (body.table === 'settings') {
      data = { list: [], pageInfo: { totalRows: 0, page: 1, pageSize: 1, isLastPage: true } }
    } else if (body.table === 'customers') {
      data = body.recordId ? customer : { list: [customer], pageInfo: { totalRows: 1, page: 1, pageSize: 500, isLastPage: true } }
    } else if (body.table === 'invoices') {
      data = body.recordId ? invoice : { list: [invoice], pageInfo: { totalRows: 1, page: 1, pageSize: 500, isLastPage: true } }
    } else if (body.table === 'items') {
      data = { list: [], pageInfo: { totalRows: 0, page: 1, pageSize: 500, isLastPage: true } }
    } else if (body.table === 'autoDepositReviewQueue') {
      data = { ok: true, items: [], summary: { total: 0, review: 0, unmatched: 0, resolved: 0, dismissed: 0 } }
    } else {
      data = { list: [], pageInfo: { totalRows: 0, page: 1, pageSize: 500, isLastPage: true } }
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data, timestamp: new Date().toISOString() }),
    })
  })
}

test('T11-01: 완납 미확정 출고 점검은 dry-run 리포트만 보여주고 적용은 승인 대기 상태다', async ({ page }) => {
  const uniqueId = Date.now()
  const invoiceNo = `${GOVERNANCE_INVOICE_PREFIX}${uniqueId}`
  const customerName = `${GOVERNANCE_CUSTOMER_PREFIX}${uniqueId}`
  const customer = {
    Id: 900001,
    name: customerName,
    customer_status: 'active',
    customer_type: 'MEMBER',
  }
  const invoice = {
    Id: 910001,
    invoice_no: invoiceNo,
    invoice_date: getTodayDateString(),
    customer_id: customer.Id,
    customer_name: customerName,
    receipt_type: DEFAULT_RECEIPT_TYPE,
    previous_balance: 0,
    paid_amount: 10000,
    payment_method: '계좌이체',
    supply_amount: 9091,
    tax_amount: 909,
    total_amount: 10000,
    current_balance: 0,
    payment_status: 'paid',
    status: 'paid',
    memo: 'dry-run 대상 테스트',
  }
  await mockCrmProxy(page, invoice, customer)

  await page.goto('/invoices')
  await waitForTableLoaded(page)
  await page.getByPlaceholder('거래처명으로 검색...').fill(customerName)

  const row = page.locator('tbody tr', { hasText: invoiceNo }).first()
  await expect(row).toBeVisible({ timeout: API_TIMEOUT })
  await expect(row.getByText('완납').first()).toBeVisible()
  await expect(row.getByText('기존매출').first()).toBeVisible()

  await page.getByRole('button', { name: /완납 미확정 점검/ }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: '완납 미확정 출고 점검' })).toBeVisible({ timeout: API_TIMEOUT })
  await expect(dialog.getByText('이 화면만으로 운영 데이터는 바뀌지 않습니다')).toBeVisible()
  await expect(dialog.getByText(invoiceNo)).toBeVisible()
  await expect(dialog.getByRole('button', { name: '승인 후 적용 예정' })).toBeDisabled()
})
