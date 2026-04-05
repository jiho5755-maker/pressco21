/**
 * 테스트 5: 제품 관리 CRUD
 */
import { test, expect, type Page, type Locator } from '@playwright/test'
import {
  API_TIMEOUT,
  assertNoApiError,
  assertPageTitle,
  cleanupTestProducts,
  waitForDialog,
  waitForTableLoaded,
} from './helpers'

const TEST_PREFIX = 'TEST-PRODUCT-'

function uniqueName() {
  return `${TEST_PREFIX}${Date.now()}`
}

function productRows(page: Page) {
  return page.locator('tbody tr').filter({
    hasNot: page.locator('td[colspan]'),
  })
}

async function fillProductDialog(dialog: Locator, name: string, code: string) {
  await dialog.getByPlaceholder('품목명').fill(name)
  await dialog.getByPlaceholder('P-001').fill(code)
  await dialog.getByPlaceholder('약칭 또는 별칭').fill(`${name}-별칭`)
  await dialog.getByPlaceholder('선택 또는 직접 입력').fill('E2E 카테고리')
  await dialog.getByPlaceholder('개, g, m 등').fill('개')

  const numberInputs = dialog.locator('input[type="number"]')
  await numberInputs.nth(0).fill('5000')
  await numberInputs.nth(1).fill('10000')
}

async function searchProduct(page: Page, keyword: string) {
  await page.getByPlaceholder('품목명 또는 코드 검색...').fill(keyword)
  await page.waitForTimeout(700)
  await waitForTableLoaded(page)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/products')
  await assertPageTitle(page, '제품 관리')
})

test.afterEach(async ({ request }) => {
  await cleanupTestProducts(request, TEST_PREFIX)
})

test('T5-01: 제품 관리 페이지 접속 및 제목 표시', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '제품 관리' })).toBeVisible()
  await expect(page.getByRole('button', { name: '제품 등록' })).toBeVisible()
})

test('T5-02: 제품 목록 로드 확인', async ({ page }) => {
  await waitForTableLoaded(page)
  await assertNoApiError(page)
  await expect(page.getByRole('columnheader', { name: '코드' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '품목명' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '소매가(1)' })).toBeVisible()
  await expect(productRows(page).first()).toBeVisible({ timeout: API_TIMEOUT })
})

test('T5-03: 품목명/코드 검색 동작', async ({ page }) => {
  await waitForTableLoaded(page)

  const firstRow = productRows(page).first().locator('td')
  const keyword = ((await firstRow.nth(1).textContent()) ?? '').trim().slice(0, 2)
    || ((await firstRow.nth(0).textContent()) ?? '').trim().slice(0, 2)
    || '꽃'

  await searchProduct(page, keyword)

  const rows = productRows(page)
  if (await rows.count()) {
    await expect(rows.first()).toContainText(keyword)
  } else {
    await expect(page.getByText('조건에 맞는 결과가 없습니다. 검색어나 필터를 변경해보세요.')).toBeVisible()
  }
})

test('T5-04: 제품 등록 버튼 → Dialog 열림', async ({ page }) => {
  await page.getByRole('button', { name: '제품 등록' }).click()
  await waitForDialog(page, '제품 등록')
  await expect(page.getByRole('dialog').getByText('품목명 *')).toBeVisible()
})

test('T5-05: 품목명 없이 저장 시 유효성 경고', async ({ page }) => {
  await page.getByRole('button', { name: '제품 등록' }).click()
  await waitForDialog(page, '제품 등록')

  await page.getByRole('dialog').getByRole('button', { name: '등록' }).click()
  await expect(page.getByText('품목명을 입력해주세요')).toBeVisible()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('T5-06: 완전한 데이터로 제품 생성 → 목록 반영', async ({ page }) => {
  const name = uniqueName()
  const code = `${TEST_PREFIX}CODE-${Date.now()}`

  await page.getByRole('button', { name: '제품 등록' }).click()
  await waitForDialog(page, '제품 등록')

  const dialog = page.getByRole('dialog')
  await fillProductDialog(dialog, name, code)
  await dialog.getByRole('button', { name: '등록' }).click()

  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: API_TIMEOUT })
  await searchProduct(page, name)
  await expect(productRows(page).filter({ hasText: name }).first()).toBeVisible({ timeout: API_TIMEOUT })
})

test('T5-07: 생성된 제품 수정 → 수정 Dialog 열림 및 저장', async ({ page }) => {
  const name = uniqueName()
  const code = `${TEST_PREFIX}EDIT-${Date.now()}`
  const updatedAlias = `${name}-수정`

  await page.getByRole('button', { name: '제품 등록' }).click()
  await waitForDialog(page, '제품 등록')
  await fillProductDialog(page.getByRole('dialog'), name, code)
  await page.getByRole('dialog').getByRole('button', { name: '등록' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: API_TIMEOUT })

  await searchProduct(page, name)
  const row = productRows(page).filter({ hasText: name }).first()
  await row.getByRole('button', { name: '수정' }).click()
  await waitForDialog(page, '제품 수정')

  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('약칭 또는 별칭').fill(updatedAlias)
  await dialog.getByRole('button', { name: '수정' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: API_TIMEOUT })

  await searchProduct(page, name)
  await expect(productRows(page).filter({ hasText: updatedAlias }).first()).toBeVisible({ timeout: API_TIMEOUT })
})

test('T5-08: 제품 삭제 후 목록에서 제거', async ({ page }) => {
  const name = uniqueName()
  const code = `${TEST_PREFIX}DEL-${Date.now()}`

  await page.getByRole('button', { name: '제품 등록' }).click()
  await waitForDialog(page, '제품 등록')
  await fillProductDialog(page.getByRole('dialog'), name, code)
  await page.getByRole('dialog').getByRole('button', { name: '등록' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: API_TIMEOUT })

  await searchProduct(page, name)
  const row = productRows(page).filter({ hasText: name }).first()
  await expect(row).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await row.getByRole('button', { name: '삭제' }).click()
  await expect(page.getByText('제품이 삭제되었습니다')).toBeVisible({ timeout: API_TIMEOUT })

  await page.waitForTimeout(700)
  await waitForTableLoaded(page)
  await expect(productRows(page).filter({ hasText: name })).toHaveCount(0)
})
