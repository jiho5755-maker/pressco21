/**
 * 테스트 15: 바로빌 전자세금계산서 발급 모달 복구성
 *
 * 운영 데이터 write 없이 /crm-proxy와 바로빌 webhook을 모두 브라우저에서 mock 처리한다.
 */
import { test, expect, type Page } from '@playwright/test'
import { DEFAULT_RECEIPT_TYPE, waitForTableLoaded } from './helpers'

const INVOICE_META_PREFIX = '[ACCOUNTING_INVOICE_META]'

function taxInvoiceFixtures() {
  const today = '2026-04-30'
  const customer = {
    Id: 9101,
    name: '세금계산서 정보누락 고객',
    customer_status: 'active',
    customer_type: 'MEMBER',
    phone1: '010-0000-0000',
    memo: '',
  }
  const invoice = {
    Id: 9201,
    invoice_no: 'TAX-RESILIENCE-MISSING',
    invoice_date: today,
    customer_id: customer.Id,
    customer_name: customer.name,
    customer_phone: customer.phone1,
    receipt_type: DEFAULT_RECEIPT_TYPE,
    previous_balance: 0,
    paid_amount: 110000,
    payment_method: '계좌이체',
    supply_amount: 100000,
    tax_amount: 10000,
    total_amount: 110000,
    current_balance: 0,
    payment_status: 'paid',
    status: 'paid',
    memo: `${INVOICE_META_PREFIX} ${JSON.stringify({
      depositUsedAmount: 0,
      discountAmount: 0,
      fulfillmentStatus: 'shipment_confirmed',
      shipmentConfirmedAt: `${today}T00:00:00.000Z`,
      revenuePostingStatus: 'posted',
      paymentHistory: [],
    })}`,
  }
  const items = [
    {
      Id: 9301,
      invoice_id: invoice.Id,
      product_name: '테스트 세금계산서 품목',
      unit: 'EA',
      quantity: 1,
      unit_price: 110000,
      supply_amount: 100000,
      tax_amount: 10000,
      taxable: '과세',
    },
  ]
  return { customer, invoice, items }
}

async function mockCrmProxy(page: Page) {
  const { customer, invoice, items } = taxInvoiceFixtures()
  await page.route('**/crm-proxy', async (route) => {
    const body = route.request().postDataJSON() as { table?: string; recordId?: number }
    let data: unknown
    if (body.table === 'settings') {
      data = { list: [], pageInfo: { totalRows: 0, page: 1, pageSize: 1, isLastPage: true } }
    } else if (body.table === 'customers') {
      data = body.recordId
        ? customer
        : { list: [customer], pageInfo: { totalRows: 1, page: 1, pageSize: 500, isLastPage: true } }
    } else if (body.table === 'invoices') {
      data = body.recordId
        ? invoice
        : { list: [invoice], pageInfo: { totalRows: 1, page: 1, pageSize: 25, isLastPage: true } }
    } else if (body.table === 'items') {
      data = { list: items, pageInfo: { totalRows: items.length, page: 1, pageSize: 200, isLastPage: true } }
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

test('T15-01: 사업자 정보 누락 명세표는 발급 버튼 대신 보완 액션을 보여준다', async ({ page }) => {
  await mockCrmProxy(page)

  await page.goto('/invoices')
  await waitForTableLoaded(page)
  const row = page.locator('tbody tr', { hasText: 'TAX-RESILIENCE-MISSING' }).first()
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: /세금계산서 발급/ }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: '바로빌 전자세금계산서 발급' })).toBeVisible()
  await expect(dialog.getByText('공급받는자 사업자번호가 없습니다')).toBeVisible()
  await expect(dialog.getByText('공급받는자 대표자가 없습니다')).toBeVisible()
  await expect(dialog.getByText('전자세금계산서 수신 이메일이 없습니다')).toBeVisible()
  await expect(dialog.getByRole('button', { name: '고객 정보 보완' })).toBeEnabled()
  await expect(dialog.getByRole('button', { name: '정보 보완 필요' })).toBeDisabled()
})
