/**
 * 테스트 9: 캘린더 + 기간 리포트
 */
import { test, expect } from '@playwright/test'
import { API_TIMEOUT, assertPageTitle } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/calendar')
  await assertPageTitle(page, '캘린더')
})

test('T9-01: 캘린더 페이지 접속 및 월간 뷰 표시', async ({ page }) => {
  const now = new Date()
  await expect(page.getByRole('heading', { name: '캘린더' })).toBeVisible()
  await expect(page.getByText(`${now.getFullYear()}년 ${now.getMonth() + 1}월`).first()).toBeVisible()
  await expect(page.getByText(`${now.getFullYear()}년 ${now.getMonth() + 1}월 월간 달력`)).toBeVisible()
})

test('T9-02: 이전달/다음달 이동 버튼 동작', async ({ page }) => {
  const monthLabel = page.getByText(/\d{4}년 \d{1,2}월/).first()
  const currentLabel = (await monthLabel.textContent()) ?? ''

  await page.locator('button:has(svg.lucide-chevron-left)').first().click()
  await expect(monthLabel).not.toHaveText(currentLabel)

  await page.locator('button:has(svg.lucide-chevron-right)').first().click()
  await expect(monthLabel).toHaveText(currentLabel)
})

test('T9-03: 오늘 날짜 셀 강조 표시 확인', async ({ page }) => {
  const today = new Date()
  const todayBadge = page.locator('div.bg-\\[\\#7d9675\\].text-white').first()
  await expect(todayBadge).toBeVisible()
  await expect(todayBadge).toHaveText(String(today.getDate()))
})

test('T9-04: 날짜 클릭 → 해당일 빠른 확인 및 명세표 이동', async ({ page }) => {
  const populatedDateCell = page.locator('button').filter({ hasText: /건/ }).first()
  const cellCount = await populatedDateCell.count()
  if (cellCount === 0) {
    test.skip()
    return
  }

  await populatedDateCell.click()
  await expect(page.getByText(/빠른 확인/)).toBeVisible({ timeout: API_TIMEOUT })
  await page.getByRole('button', { name: '당일 명세표 보기' }).click()
  await expect(page).toHaveURL(/\/invoices\?date=\d{4}-\d{2}-\d{2}/, { timeout: API_TIMEOUT })
})

test('T9-05: 기간 매출 리포트 섹션 표시 확인', async ({ page }) => {
  await expect(page.getByText('빠른 기간 선택')).toBeVisible()
  await expect(page.getByText('수금률')).toBeVisible()
  await expect(page.getByText('평균 객단가')).toBeVisible()
  await expect(page.getByText(/일별 매출 추이/)).toBeVisible({ timeout: API_TIMEOUT })
})

test('T9-06: 퀵 프리셋 4개 버튼 전환', async ({ page }) => {
  const presets = ['이번달', '지난달', '이번분기', '올해']

  for (const label of presets) {
    const button = page.getByRole('button', { name: label })
    await button.click()
    await expect(button).toHaveClass(/bg-\[#7d9675\]/)
  }
})

test('T9-07: 프리셋 변경 시 KPI 카드 갱신', async ({ page }) => {
  await expect(page.getByText('전년동월 대비')).toBeVisible()
  await page.getByRole('button', { name: '지난달' }).click()

  await expect(page.getByText('기간 매출')).toBeVisible({ timeout: API_TIMEOUT })
  await expect(page.getByText('수금률')).toBeVisible()
  await expect(page.getByText('평균 객단가')).toBeVisible()
  await expect(page.getByText(/원$/).first()).toBeVisible()
})

test('T9-08: 기간 변경 시 차트 제목 갱신', async ({ page }) => {
  const initialTitle = page.getByText(/일별 매출 추이/).first()
  const initialText = (await initialTitle.textContent()) ?? ''

  await page.getByRole('button', { name: '올해' }).click()
  await expect(page.getByText(/일별 매출 추이/).first()).not.toHaveText(initialText, {
    timeout: API_TIMEOUT,
  })
})
