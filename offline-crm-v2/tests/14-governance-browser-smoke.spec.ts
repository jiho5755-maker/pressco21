/**
 * 테스트 14: 직접거래 거버넌스 브라우저 핵심 화면 smoke
 */
import { test, expect, type Page } from '@playwright/test'
import { DEFAULT_RECEIPT_TYPE, waitForTableLoaded } from './helpers'

const INBOX_KEY = 'pressco21-auto-deposit-inbox-v1'
const INVOICE_META_PREFIX = '[ACCOUNTING_INVOICE_META]'

function governanceFixtures() {
  const today = '2026-04-30'
  const overdueDate = '2026-04-20'
  const customers = [
    { Id: 7001, name: '거버넌스 완납고객', customer_status: 'active', customer_type: 'MEMBER', memo: '' },
    { Id: 7002, name: '제시카플로라', customer_status: 'active', customer_type: 'MEMBER', memo: '' },
  ]
  const invoices = [
    {
      Id: 8001,
      invoice_no: 'GOV-SMOKE-PAID',
      invoice_date: today,
      customer_id: 7001,
      customer_name: '거버넌스 완납고객',
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
      memo: '완납 미확정 smoke',
    },
    {
      Id: 8002,
      invoice_no: 'GOV-SMOKE-FOLLOWUP',
      invoice_date: today,
      customer_id: 7002,
      customer_name: '제시카플로라',
      receipt_type: DEFAULT_RECEIPT_TYPE,
      previous_balance: 0,
      paid_amount: 0,
      payment_method: '계좌이체',
      supply_amount: 200000,
      tax_amount: 20000,
      total_amount: 220000,
      current_balance: 220000,
      payment_status: 'unpaid',
      status: 'unpaid',
      memo: `${INVOICE_META_PREFIX} ${JSON.stringify({
        depositUsedAmount: 0,
        discountAmount: 0,
        fulfillmentStatus: 'shipment_confirmed',
        shipmentConfirmedAt: `${today}T00:00:00.000Z`,
        revenuePostingStatus: 'posted',
        paymentReminder: { dueDate: overdueDate, amount: 220000, enabled: true, leadDays: 1 },
        paymentHistory: [],
      })}`,
    },
  ]
  return { customers, invoices }
}

async function mockGovernanceProxy(page: Page) {
  const { customers, invoices } = governanceFixtures()
  await page.route('**/crm-proxy', async (route) => {
    const body = route.request().postDataJSON() as { table?: string; recordId?: number }
    let data: unknown
    if (body.table === 'settings') {
      data = { list: [], pageInfo: { totalRows: 0, page: 1, pageSize: 1, isLastPage: true } }
    } else if (body.table === 'customers') {
      data = body.recordId
        ? customers.find((customer) => customer.Id === body.recordId) ?? customers[0]
        : { list: customers, pageInfo: { totalRows: customers.length, page: 1, pageSize: 500, isLastPage: true } }
    } else if (body.table === 'invoices') {
      data = body.recordId
        ? invoices.find((invoice) => invoice.Id === body.recordId) ?? invoices[0]
        : { list: invoices, pageInfo: { totalRows: invoices.length, page: 1, pageSize: 500, isLastPage: true } }
    } else if (body.table === 'autoDepositReviewQueue') {
      data = {
        ok: true,
        items: [{
          queueId: 'smoke-review-1',
          status: 'review',
          sender: '김순자',
          amount: 220000,
          occurredAt: '2026-04-30T09:00:00.000Z',
          source: 'smoke',
          reason: '동명이인 검토 필요',
          candidates: [],
        }],
        summary: { total: 1, review: 1, unmatched: 0, resolved: 0, dismissed: 0 },
      }
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

test('T14-01: 핵심 거버넌스 화면을 브라우저에서 순회 검증한다', async ({ page }) => {
  await page.addInitScript(({ key }) => {
    localStorage.setItem(key, JSON.stringify([
      {
        id: 'governance-browser-smoke-local',
        date: '2026-04-30',
        sender: '쿠팡정산',
        amount: 990000,
        note: '플랫폼 정산금',
        sourceFile: 'smoke.csv',
        status: 'pending',
      },
    ]))
  }, { key: INBOX_KEY })
  await mockGovernanceProxy(page)

  await page.goto('/invoices')
  await waitForTableLoaded(page)
  await expect(page.locator('tbody tr', { hasText: 'GOV-SMOKE-PAID' }).first()).toBeVisible()
  await page.getByRole('button', { name: /완납 미확정 점검/ }).click()
  await expect(page.getByRole('dialog').getByText('GOV-SMOKE-PAID').first()).toBeVisible()
  await page.getByRole('button', { name: '닫기' }).click()

  await page.goto('/settlements?section=receivables&asOf=2026-04-30')
  await expect(page.getByRole('heading', { name: '수급 지급 관리' })).toBeVisible()
  await expect(page.getByRole('tab', { name: '받을 돈', exact: true })).toHaveAttribute('data-state', 'active')
  await page.getByRole('tab', { name: '새 입력 받을 돈' }).click()
  await expect(page.getByText('후속입금: 입금 약속 지남')).toBeVisible()

  await page.getByRole('tab', { name: '입금 반영' }).click()
  await expect(page.getByText('입금 처리 안전장치')).toBeVisible()
  await expect(page.locator('tbody tr', { hasText: '쿠팡정산' }).first()).toBeVisible()

  await page.getByRole('tab', { name: '자동반영 규칙' }).click()
  await expect(page.getByText(/고객 계정 자동반영/)).toBeVisible()

  await page.getByRole('tab', { name: '마감 점검' }).click()
  await expect(page.getByText('후속입금 지연').first()).toBeVisible()

  await page.goto('/trade-work-queue')
  await expect(page.getByRole('heading', { name: '직접거래 업무함' })).toBeVisible()
  await expect(page.getByText('출고완료 후 미수')).toBeVisible()

  await page.goto('/month-end-review')
  await expect(page.getByRole('heading', { name: '마감 점검' })).toBeVisible()
  await expect(page.getByText('후속입금 지연').first()).toBeVisible()
})
