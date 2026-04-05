/**
 * 테스트 8: 고객 생성/수정 플로우
 */
import { test, expect, type Locator, type Page } from '@playwright/test'
import {
  API_TIMEOUT,
  assertPageTitle,
  cleanupTestCustomers,
  waitForDialog,
  waitForTableLoaded,
} from './helpers'

const TEST_PREFIX = 'TEST-CUSTOMER-'

function uniqueName() {
  return `${TEST_PREFIX}${Date.now()}`
}

function customerRows(page: Page) {
  return page.locator('tbody tr').filter({
    hasNot: page.locator('td[colspan]'),
  })
}

async function chooseSelectOption(page: Page, dialog: Locator, index: number, label: string) {
  await dialog.getByRole('combobox').nth(index).click()
  await page.getByRole('option', { name: label }).click()
}

async function fillCustomerDialog(page: Page, dialog: Locator, name: string) {
  await dialog.getByPlaceholder('거래처명').fill(name)
  await dialog.getByPlaceholder('02-0000-0000').fill('0212345678')
  await dialog.getByPlaceholder('010-0000-0000').fill('01012345678')
  await dialog.getByPlaceholder('example@email.com').fill('test-customer@example.com')
  await dialog.getByPlaceholder('주소').fill('서울시 강동구 테스트길 21')
  await chooseSelectOption(page, dialog, 0, '개인')
  await chooseSelectOption(page, dialog, 1, '활성')
  await chooseSelectOption(page, dialog, 2, '4등급 - 정원사 (VIP)')
  await chooseSelectOption(page, dialog, 3, 'VIP')
  await dialog.getByPlaceholder('000-00-00000').fill('1234567890')
  await dialog.getByPlaceholder('홍길동').fill('테스트대표')
  await dialog.getByPlaceholder('도소매').fill('교육업')
  await dialog.getByPlaceholder('꽃 공예 재료').fill('플라워 클래스')
  await dialog.getByPlaceholder('기타 사항').fill('자동 테스트 고객')
}

async function searchCustomer(page: Page, keyword: string) {
  await page.getByPlaceholder('거래처명').first().fill(keyword)
  await page.waitForTimeout(700)
  await waitForTableLoaded(page)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/customers')
  await assertPageTitle(page, '고객 관리')
})

test.afterEach(async ({ request }) => {
  await cleanupTestCustomers(request, TEST_PREFIX)
})

test('T8-01: 새 고객 버튼 → Dialog 열림', async ({ page }) => {
  await page.getByRole('button', { name: '새 고객' }).click()
  await waitForDialog(page, '새 고객 등록')
  await expect(page.getByRole('dialog').getByText('거래처명 *')).toBeVisible()
})

test('T8-02: 거래처명 없이 저장 시 유효성 경고', async ({ page }) => {
  await page.getByRole('button', { name: '새 고객' }).click()
  await waitForDialog(page, '새 고객 등록')
  await page.getByRole('dialog').getByRole('button', { name: '등록' }).click()
  await expect(page.getByText('거래처명을 입력해주세요')).toBeVisible()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('T8-03: 완전한 데이터로 고객 생성 → 목록 반영', async ({ page }) => {
  const name = uniqueName()

  await page.getByRole('button', { name: '새 고객' }).click()
  await waitForDialog(page, '새 고객 등록')
  await fillCustomerDialog(page, page.getByRole('dialog'), name)
  await page.getByRole('dialog').getByRole('button', { name: '등록' }).click()

  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: API_TIMEOUT })
  await searchCustomer(page, name)
  await expect(customerRows(page).filter({ hasText: name }).first()).toBeVisible({ timeout: API_TIMEOUT })
})

test('T8-04: 고객 상세 기본정보 탭에서 수정 모드 진입', async ({ page }) => {
  const name = uniqueName()

  await page.getByRole('button', { name: '새 고객' }).click()
  await waitForDialog(page, '새 고객 등록')
  await fillCustomerDialog(page, page.getByRole('dialog'), name)
  await page.getByRole('dialog').getByRole('button', { name: '등록' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: API_TIMEOUT })

  await searchCustomer(page, name)
  await customerRows(page).filter({ hasText: name }).first().click()
  await expect(page).toHaveURL(/\/customers\/\d+/, { timeout: API_TIMEOUT })

  await page.getByRole('button', { name: '수정' }).click()
  await expect(page.getByRole('button', { name: '저장' })).toBeVisible()
  await expect(page.getByRole('button', { name: '취소' })).toBeVisible()
  await expect(page.getByPlaceholder('회사명 또는 이름')).toHaveValue(name)
})

test('T8-05: 고객 정보 수정 → 저장 → 변경사항 반영 확인', async ({ page }) => {
  const name = uniqueName()
  const updatedMemo = '수정된 고객 메모'

  await page.getByRole('button', { name: '새 고객' }).click()
  await waitForDialog(page, '새 고객 등록')
  await fillCustomerDialog(page, page.getByRole('dialog'), name)
  await page.getByRole('dialog').getByRole('button', { name: '등록' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: API_TIMEOUT })

  await searchCustomer(page, name)
  await customerRows(page).filter({ hasText: name }).first().click()
  await expect(page).toHaveURL(/\/customers\/\d+/, { timeout: API_TIMEOUT })

  await page.getByRole('button', { name: '수정' }).click()
  const memoInput = page.getByPlaceholder('고객 메모')
  await memoInput.fill(updatedMemo)
  await page.getByRole('button', { name: '저장' }).click()

  await expect(page.getByText('고객 정보가 저장되었습니다')).toBeVisible({ timeout: API_TIMEOUT })
  await expect(page.getByText(updatedMemo)).toBeVisible({ timeout: API_TIMEOUT })
})

test('T8-06: VIP 등급 배지 색상 확인', async ({ page }) => {
  const name = uniqueName()

  await page.getByRole('button', { name: '새 고객' }).click()
  await waitForDialog(page, '새 고객 등록')
  await fillCustomerDialog(page, page.getByRole('dialog'), name)
  await page.getByRole('dialog').getByRole('button', { name: '등록' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: API_TIMEOUT })

  await searchCustomer(page, name)
  await customerRows(page).filter({ hasText: name }).first().click()
  await expect(page).toHaveURL(/\/customers\/\d+/, { timeout: API_TIMEOUT })

  const vipBadge = page
    .getByRole('heading', { level: 2, name })
    .locator('xpath=following-sibling::*[2]')
  await expect(vipBadge).toBeVisible({ timeout: API_TIMEOUT })

  const backgroundColor = await vipBadge.evaluate((element) => window.getComputedStyle(element).backgroundColor)
  expect(backgroundColor).toMatch(/rgb\(184,\s*155,\s*94\)/)
})
