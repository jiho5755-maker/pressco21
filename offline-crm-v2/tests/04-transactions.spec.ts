/**
 * 테스트 4: 거래/명세표 조회 플로우
 */
import { test, expect } from '@playwright/test'
import {
  API_TIMEOUT,
  assertNoApiError,
  assertPageTitle,
  waitForTableLoaded,
} from './helpers'

function compactKeyword(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, 2)
}

function dataRows(page: Parameters<typeof test>[0]['page']) {
  return page.locator('tbody tr').filter({
    hasNot: page.locator('td[colspan]'),
  })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/transactions')
  await assertPageTitle(page, '거래/명세표 조회')
})

test('T4-01: 거래/명세표 조회 페이지 접속 및 제목 표시', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '거래/명세표 조회' })).toBeVisible()
  await expect(page.getByRole('button', { name: '명세표 작성' })).toBeVisible()
  await expect(page.getByRole('tab', { name: '전체' })).toBeVisible()
})

test('T4-02: 목록 로드 및 읽기 전용 테이블 구조 확인', async ({ page }) => {
  await waitForTableLoaded(page)
  await assertNoApiError(page)

  await expect(page.getByRole('columnheader', { name: '날짜' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '거래처' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '유형' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '금액' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '세액' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '전표/발행번호' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '비고' })).toBeVisible()
  await expect(dataRows(page).first()).toBeVisible({ timeout: API_TIMEOUT })
})

test('T4-03: 검색 입력 후 debounce 반영', async ({ page }) => {
  await waitForTableLoaded(page)

  const firstRow = dataRows(page).first()
  const cells = firstRow.locator('td')
  const keyword = compactKeyword(await cells.nth(1).textContent())
    || compactKeyword(await cells.nth(5).textContent())
    || '학교'

  await page.getByPlaceholder('거래처명/메모/전표번호 검색...').fill(keyword)
  await page.waitForTimeout(700)
  await waitForTableLoaded(page)

  const rows = dataRows(page)
  const emptyMessage = page.getByText('조건에 맞는 거래내역이 없습니다. 검색어나 필터를 변경해보세요.')

  if (await rows.count()) {
    await expect(rows.first()).toContainText(keyword, { timeout: API_TIMEOUT })
  } else {
    await expect(emptyMessage).toBeVisible()
  }
})

test('T4-04: 유형 필터 동작', async ({ page }) => {
  await waitForTableLoaded(page)

  const typeSelect = page.locator('button[role="combobox"]').first()
  await typeSelect.click()
  await page.getByRole('option', { name: '입금' }).click()
  await expect(typeSelect).toContainText('입금')
  await page.waitForTimeout(1200)
  await waitForTableLoaded(page)

  const rows = dataRows(page)
  if (await rows.count()) {
    await expect
      .poll(async () => rows.locator('td:nth-child(3) span').allTextContents(), {
        timeout: API_TIMEOUT,
      })
      .toEqual(expect.arrayContaining(['입금']))
  } else {
    await expect(page.getByText('조건에 맞는 거래내역이 없습니다. 검색어나 필터를 변경해보세요.')).toBeVisible()
  }
})

test('T4-05: 기간 필터 동작', async ({ page }) => {
  await waitForTableLoaded(page)

  const targetDate = (await dataRows(page).first().locator('td').first().textContent())?.trim()
  expect(targetDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)

  const dateInputs = page.locator('input[type="date"]')
  await dateInputs.nth(0).fill(targetDate!)
  await dateInputs.nth(1).fill(targetDate!)
  await page.waitForTimeout(700)
  await waitForTableLoaded(page)

  const rows = dataRows(page)
  if (await rows.count()) {
    const dateCells = rows.locator('td:first-child')
    const cellCount = await dateCells.count()
    for (let index = 0; index < cellCount; index += 1) {
      await expect(dateCells.nth(index)).toHaveText(targetDate!)
    }
  } else {
    await expect(page.getByText('조건에 맞는 거래내역이 없습니다. 검색어나 필터를 변경해보세요.')).toBeVisible()
  }
})

test('T4-06: 페이지네이션 다음 페이지 이동', async ({ page }) => {
  await waitForTableLoaded(page)

  const indicator = page.locator('span.min-w-\\[60px\\]').filter({ hasText: /\d+ \/ \d+/ }).first()
  const indicatorCount = await indicator.count()
  if (indicatorCount === 0) {
    test.skip()
    return
  }

  await expect(indicator).toContainText('1 /')
  const firstRowText = await dataRows(page).first().textContent()

  await page.locator('button:has(svg.lucide-chevron-right)').last().click()
  await waitForTableLoaded(page)

  await expect(indicator).toContainText('2 /')
  await expect(dataRows(page).first()).toBeVisible()
  const nextRowText = await dataRows(page).first().textContent()
  expect(nextRowText).not.toBe(firstRowText)
})

test('T4-07: 필터 초기화 동작', async ({ page }) => {
  await waitForTableLoaded(page)

  const searchInput = page.getByPlaceholder('거래처명/메모/전표번호 검색...')
  const dateInputs = page.locator('input[type="date"]')
  const defaultFrom = await dateInputs.nth(0).inputValue()
  const defaultTo = await dateInputs.nth(1).inputValue()

  await searchInput.fill('학교')
  const typeSelect = page.locator('button[role="combobox"]').first()
  await typeSelect.click()
  await page.getByRole('option', { name: '메모' }).click()
  await dateInputs.nth(0).fill(defaultTo)
  await page.waitForTimeout(700)
  await page.getByRole('button', { name: '초기화' }).click()
  await page.waitForTimeout(700)
  await waitForTableLoaded(page)

  await expect(searchInput).toHaveValue('')
  await expect(page.locator('button[role="combobox"]').first()).toContainText('모든 유형')
  await expect(dateInputs.nth(0)).toHaveValue(defaultFrom)
  await expect(dateInputs.nth(1)).toHaveValue(defaultTo)
})

test('T4-08: 첫 페이지 로드 성능 5초 이내', async ({ page }) => {
  const startedAt = Date.now()
  await page.goto('/transactions')
  await waitForTableLoaded(page)
  await assertNoApiError(page)

  const elapsed = Date.now() - startedAt
  expect(elapsed).toBeLessThan(5_000)
})
