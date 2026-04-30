/**
 * 테스트 7: 명세표 고도화 기능
 */
import { test, expect, type Locator, type Page } from '@playwright/test'
import {
  API_TIMEOUT,
  TEST_INVOICE_PREFIX,
  cleanupTestInvoices,
  cleanupTestCustomers,
  createTestCustomer,
  getTestCustomer,
  waitForDialog,
  waitForTableLoaded,
} from './helpers'

const ADV_PREFIX = `${TEST_INVOICE_PREFIX}ADV-`
const CUSTOMER_PREFIX = 'TEST-CUSTOMER-INVOICE-'
const FIXED_CUSTOMER_NAME = '송윤경 회장님'

function invoiceRows(page: Page) {
  return page.locator('tbody tr').filter({
    hasNot: page.locator('td[colspan]'),
  })
}

async function openNewInvoice(page: Page) {
  await page.goto('/invoices')
  await page.getByRole('button', { name: /새 명세표/ }).click()
  await waitForDialog(page, '새 명세표')
  return page.getByRole('dialog')
}

async function selectCustomer(dialog: Locator, page: Page, keyword = '학교') {
  const input = dialog.getByPlaceholder('거래처명 검색...')
  await input.fill(keyword)
  const dropdown = page.locator('.absolute.z-50.bg-white.border.rounded-md')
  await expect(dropdown).toBeVisible({ timeout: API_TIMEOUT })
  const firstOption = dropdown.locator('button').first()
  const optionText = await firstOption.locator('span.font-medium').textContent()
  await firstOption.click()
  if (optionText) {
    await expect(input).toHaveValue(optionText)
  }
}

async function fillInvoiceBasics(dialog: Locator, page: Page, invoiceNo: string) {
  await dialog.locator('input.font-mono').fill(invoiceNo)
  await selectCustomer(dialog, page, FIXED_CUSTOMER_NAME)

  const firstRow = dialog.locator('tbody tr').first()
  const productInput = firstRow.getByPlaceholder('품목명 검색 (자동완성)')
  await productInput.fill('꽃')

  const firstProduct = page.locator('body button:visible').filter({ hasText: /원/ }).first()
  await expect(firstProduct).toBeVisible({ timeout: API_TIMEOUT })
  await firstProduct.click()

  const numberInputs = firstRow.locator('input[type="number"]')
  await numberInputs.nth(1).fill('10000')
  await numberInputs.nth(1).press('Tab')
}

test.beforeEach(async ({ page }) => {
  await page.goto('/invoices')
  await waitForTableLoaded(page)
})

test.afterEach(async ({ request }) => {
  await cleanupTestInvoices(request, ADV_PREFIX)
  await cleanupTestCustomers(request, CUSTOMER_PREFIX)
})

test('T7-01: 거래처 선택 시 거래처 카드 표시', async ({ page }) => {
  const dialog = await openNewInvoice(page)
  await selectCustomer(dialog, page)

  await expect(dialog.getByText('배송 주소')).toBeVisible()
  await expect(dialog.getByText('최근 거래', { exact: true })).toBeVisible()
  await expect(dialog.getByText('전화')).toBeVisible()
})

test('T7-02: 상품 자동완성 선택 시 단가 자동 세팅', async ({ page }) => {
  const dialog = await openNewInvoice(page)
  await selectCustomer(dialog, page)

  const firstRow = dialog.locator('tbody tr').first()
  const productInput = firstRow.getByPlaceholder('품목명 검색 (자동완성)')
  await productInput.fill('꽃')

  const productOption = page.locator('body button:visible').filter({ hasText: /원/ }).first()
  const optionText = (await productOption.textContent()) ?? ''
  await expect(productOption).toBeVisible({ timeout: API_TIMEOUT })
  await productOption.click()

  const unitPriceInput = firstRow.locator('input[type="number"]').nth(1)
  await expect(unitPriceInput).not.toHaveValue('', { timeout: API_TIMEOUT })
  expect(Number(await unitPriceInput.inputValue())).toBeGreaterThan(0)
  expect(optionText.length).toBeGreaterThan(0)
})

test('T7-03: 합계 입력 시 공급가액/세액 자동 역산', async ({ page }) => {
  const dialog = await openNewInvoice(page)
  const firstRow = dialog.locator('tbody tr').first()

  await firstRow.locator('input[type="checkbox"]').check()
  await firstRow.getByRole('spinbutton').nth(2).fill('11000')

  await expect(firstRow.locator('td').nth(4)).toContainText('10,000')
  await expect(firstRow.locator('td').nth(6)).toContainText('1,000')
})

test('T7-04: 수량 변경 시 합계 재계산', async ({ page }) => {
  const dialog = await openNewInvoice(page)
  const firstRow = dialog.locator('tbody tr').first()

  await firstRow.locator('input[type="checkbox"]').check()
  await firstRow.getByRole('spinbutton').nth(2).fill('11000')
  await firstRow.getByRole('spinbutton').first().fill('2')

  await expect(firstRow.getByRole('spinbutton').nth(2)).toHaveValue('22000')
  await expect(firstRow.locator('td').nth(4)).toContainText('20,000')
  await expect(firstRow.locator('td').nth(6)).toContainText('2,000')
})

test('T7-05: 명세표 삭제 → 목록에서 제거', async ({ page }) => {
  const invoiceNo = `${ADV_PREFIX}${Date.now()}`
  const dialog = await openNewInvoice(page)
  await fillInvoiceBasics(dialog, page, invoiceNo)
  await dialog.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: API_TIMEOUT })

  await waitForTableLoaded(page)
  const row = invoiceRows(page).filter({ hasText: invoiceNo }).first()
  await expect(row).toBeVisible()

  page.once('dialog', (dialogEvent) => dialogEvent.accept())
  await row.locator('[title="삭제"]').click()
  await expect(page.getByText('명세표가 삭제되었습니다')).toBeVisible({ timeout: API_TIMEOUT })

  await page.waitForTimeout(700)
  await waitForTableLoaded(page)
  await expect(invoiceRows(page).filter({ hasText: invoiceNo })).toHaveCount(0)
})

test('T7-06: 명세표 복사 → 새 Dialog에 데이터 프리필', async ({ page }) => {
  const invoiceNo = `${ADV_PREFIX}${Date.now()}`
  const dialog = await openNewInvoice(page)
  await fillInvoiceBasics(dialog, page, invoiceNo)
  await dialog.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: API_TIMEOUT })

  await waitForTableLoaded(page)
  const row = invoiceRows(page).filter({ hasText: invoiceNo }).first()
  await row.locator('[title="복사"]').click()
  await waitForDialog(page, '명세표 복사')

  const copyDialog = page.getByRole('dialog')
  await expect(copyDialog.getByPlaceholder('거래처명 검색...')).toHaveValue(FIXED_CUSTOMER_NAME)
  await expect(copyDialog.locator('tbody tr').first().getByPlaceholder('품목명 검색 (자동완성)')).not.toHaveValue('')
  await expect(copyDialog.getByRole('button', { name: '복사 발행' })).toBeVisible()
})

test('T7-07: isDirty 안전장치 동작', async ({ page }) => {
  const dialog = await openNewInvoice(page)
  await dialog.getByPlaceholder('거래처명 검색...').fill('테스트')

  page.once('dialog', (dialogEvent) => dialogEvent.dismiss())
  await dialog.getByRole('button', { name: '취소' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  page.once('dialog', (dialogEvent) => dialogEvent.accept())
  await dialog.getByRole('button', { name: '취소' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: API_TIMEOUT })
})

test('T7-08: Ctrl+Enter 단축키로 저장 완료', async ({ page }) => {
  const invoiceNo = `${ADV_PREFIX}${Date.now()}`
  const dialog = await openNewInvoice(page)
  await fillInvoiceBasics(dialog, page, invoiceNo)

  await page.evaluate(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true,
      bubbles: true,
    }))
  })
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: API_TIMEOUT })

  await waitForTableLoaded(page)
  await expect(invoiceRows(page).filter({ hasText: invoiceNo }).first()).toBeVisible({ timeout: API_TIMEOUT })
})

test('T7-09: 저장 후 고객 잔액 자동 재계산 확인', async ({ page, request }) => {
  const createdCustomer = await createTestCustomer(request, {
    name: `${CUSTOMER_PREFIX}${Date.now()}`,
    customer_status: 'ACTIVE',
    price_tier: 1,
  })
  const customerId = createdCustomer.Id
  const customerName = createdCustomer.name as string
  const beforeCustomer = await getTestCustomer(request, customerId)
  const beforeBalance = beforeCustomer.outstanding_balance ?? 0
  const invoiceNo = `${ADV_PREFIX}${Date.now()}`

  await page.goto('/invoices')
  await page.getByRole('button', { name: /새 명세표/ }).click()
  await waitForDialog(page, '새 명세표')

  const dialog = page.getByRole('dialog')
  await dialog.locator('input.font-mono').fill(invoiceNo)
  await selectCustomer(dialog, page, customerName)

  const firstRow = dialog.locator('tbody tr').first()
  await firstRow.getByPlaceholder('품목명 검색 (자동완성)').fill('테스트 품목')
  await firstRow.getByRole('spinbutton').nth(1).fill('10000')
  await firstRow.getByRole('spinbutton').nth(1).press('Tab')

  await dialog.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 40_000 })

  const afterSaveCustomer = await getTestCustomer(request, customerId)
  const afterSaveBalance = afterSaveCustomer.outstanding_balance ?? 0
  expect(afterSaveBalance).toBe(beforeBalance)

  await waitForTableLoaded(page)
  const createdRow = invoiceRows(page).filter({ hasText: invoiceNo }).first()
  await expect(createdRow).toBeVisible({ timeout: API_TIMEOUT })
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('포장·출고완료 처리할까요')
    await dialog.accept()
  })
  await createdRow.getByRole('button', { name: /포장·출고확정/ }).click()
  await expect(page.getByText('포장·출고확정 처리되었습니다')).toBeVisible({ timeout: API_TIMEOUT })

  const afterConfirmCustomer = await getTestCustomer(request, customerId)
  const afterConfirmBalance = afterConfirmCustomer.outstanding_balance ?? 0
  expect(afterConfirmBalance).toBeGreaterThanOrEqual(beforeBalance + 10_000)
})

test('T7-10: 선택한 명세표 일괄 포장·출고확정 처리', async ({ page }) => {
  const invoiceNos = [`${ADV_PREFIX}${Date.now()}-B1`, `${ADV_PREFIX}${Date.now()}-B2`]

  for (const invoiceNo of invoiceNos) {
    const dialog = await openNewInvoice(page)
    await fillInvoiceBasics(dialog, page, invoiceNo)
    await dialog.getByRole('button', { name: '저장', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: API_TIMEOUT })
    await waitForTableLoaded(page)
  }

  for (const invoiceNo of invoiceNos) {
    const row = invoiceRows(page).filter({ hasText: invoiceNo }).first()
    await expect(row).toBeVisible({ timeout: API_TIMEOUT })
    await row.getByRole('checkbox', { name: /출고확정 선택/ }).check()
  }

  await expect(page.getByText(/선택 2건 · 합계/)).toBeVisible()
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('선택한 2건')
    await dialog.accept()
  })
  await page.getByRole('button', { name: /선택 출고확정/ }).click()
  await expect(page.getByText('선택 2건 출고확정 처리되었습니다')).toBeVisible({ timeout: API_TIMEOUT })

  for (const invoiceNo of invoiceNos) {
    const row = invoiceRows(page).filter({ hasText: invoiceNo }).first()
    await expect(row.getByRole('button', { name: '출고확정됨' })).toBeVisible({ timeout: API_TIMEOUT })
  }
})
