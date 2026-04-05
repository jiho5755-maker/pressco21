/**
 * 테스트 6: 공급처 관리 CRUD
 */
import { test, expect, type Locator, type Page } from '@playwright/test'
import {
  API_TIMEOUT,
  assertNoApiError,
  assertPageTitle,
  cleanupTestSuppliers,
  waitForDialog,
  waitForTableLoaded,
} from './helpers'

const TEST_PREFIX = 'TEST-SUPPLIER-'

function uniqueName() {
  return `${TEST_PREFIX}${Date.now()}`
}

function supplierRows(page: Page) {
  return page.locator('tbody tr').filter({
    hasNot: page.locator('td[colspan]'),
  })
}

async function fillSupplierDialog(dialog: Locator, name: string) {
  await dialog.getByPlaceholder('공급처명').fill(name)
  await dialog.getByPlaceholder('홍길동').fill('테스트대표')
  await dialog.getByPlaceholder('000-00-00000').fill('1234567890')
  await dialog.getByPlaceholder('02-0000-0000').fill('0212345678')
  await dialog.getByPlaceholder('010-0000-0000').fill('01012345678')
  await dialog.getByPlaceholder('info@example.com').fill('test-supplier@example.com')
  await dialog.getByPlaceholder('서울시 ...').fill('서울시 강동구 테스트로 21')
  await dialog.getByPlaceholder('국민은행').fill('테스트은행')
  await dialog.getByPlaceholder('000-000-000000').fill('123-456-789012')
  await dialog.getByPlaceholder('기타 사항').fill('자동 테스트 공급처')
}

async function searchSupplier(page: Page, keyword: string) {
  await page.getByPlaceholder('상호, 대표자, 사업자번호 검색...').fill(keyword)
  await page.waitForTimeout(700)
  await waitForTableLoaded(page)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/suppliers')
  await assertPageTitle(page, '공급처 관리')
})

test.afterEach(async ({ request }) => {
  await cleanupTestSuppliers(request, TEST_PREFIX)
})

test('T6-01: 공급처 관리 페이지 접속 및 제목 표시', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '공급처 관리' })).toBeVisible()
  await expect(page.getByRole('button', { name: '공급처 등록' })).toBeVisible()
})

test('T6-02: 공급처 목록 로드 확인', async ({ page }) => {
  await waitForTableLoaded(page)
  await assertNoApiError(page)
  await expect(page.getByRole('columnheader', { name: '상호' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '대표자' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '은행/계좌' })).toBeVisible()
  await expect(supplierRows(page).first()).toBeVisible({ timeout: API_TIMEOUT })
})

test('T6-03: 공급처 등록 버튼 → Dialog 열림', async ({ page }) => {
  await page.getByRole('button', { name: '공급처 등록' }).click()
  await waitForDialog(page, '공급처 등록')
  await expect(page.getByRole('dialog').getByText('상호 *')).toBeVisible()
})

test('T6-04: 상호 없이 저장 시 유효성 경고', async ({ page }) => {
  await page.getByRole('button', { name: '공급처 등록' }).click()
  await waitForDialog(page, '공급처 등록')
  await page.getByRole('dialog').getByRole('button', { name: '등록' }).click()
  await expect(page.getByText('상호를 입력해주세요')).toBeVisible()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('T6-05: 완전한 데이터로 공급처 생성 → 목록 반영', async ({ page }) => {
  const name = uniqueName()

  await page.getByRole('button', { name: '공급처 등록' }).click()
  await waitForDialog(page, '공급처 등록')
  await fillSupplierDialog(page.getByRole('dialog'), name)
  await page.getByRole('dialog').getByRole('button', { name: '등록' }).click()

  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: API_TIMEOUT })
  await searchSupplier(page, name)
  await expect(supplierRows(page).filter({ hasText: name }).first()).toBeVisible({ timeout: API_TIMEOUT })
})

test('T6-06: 생성된 공급처 수정 → 변경사항 저장 확인', async ({ page }) => {
  const name = uniqueName()
  const updatedMemo = '수정된 자동 테스트 메모'

  await page.getByRole('button', { name: '공급처 등록' }).click()
  await waitForDialog(page, '공급처 등록')
  await fillSupplierDialog(page.getByRole('dialog'), name)
  await page.getByRole('dialog').getByRole('button', { name: '등록' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: API_TIMEOUT })

  await searchSupplier(page, name)
  const row = supplierRows(page).filter({ hasText: name }).first()
  await row.getByRole('button', { name: '수정' }).click()
  await waitForDialog(page, '공급처 수정')

  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('기타 사항').fill(updatedMemo)
  await dialog.getByRole('button', { name: '수정' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: API_TIMEOUT })

  await searchSupplier(page, name)
  const updatedRow = supplierRows(page).filter({ hasText: name }).first()
  await updatedRow.getByRole('button', { name: '수정' }).click()
  await waitForDialog(page, '공급처 수정')
  await expect(page.getByRole('dialog').getByPlaceholder('기타 사항')).toHaveValue(updatedMemo)
})

test('T6-07: 공급처 삭제 → 목록에서 제거', async ({ page }) => {
  const name = uniqueName()

  await page.getByRole('button', { name: '공급처 등록' }).click()
  await waitForDialog(page, '공급처 등록')
  await fillSupplierDialog(page.getByRole('dialog'), name)
  await page.getByRole('dialog').getByRole('button', { name: '등록' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: API_TIMEOUT })

  await searchSupplier(page, name)
  const row = supplierRows(page).filter({ hasText: name }).first()
  await expect(row).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await row.getByRole('button', { name: '삭제' }).click()
  await expect(page.getByText('공급처가 삭제되었습니다')).toBeVisible({ timeout: API_TIMEOUT })

  await page.waitForTimeout(700)
  await waitForTableLoaded(page)
  await expect(supplierRows(page).filter({ hasText: name })).toHaveCount(0)
})
