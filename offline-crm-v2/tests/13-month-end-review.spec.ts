/**
 * 테스트 13: 직접거래 업무함과 마감 점검 기본 화면
 */
import { test, expect, type Page } from '@playwright/test'

const PAGE_TIMEOUT = 20_000

async function mockReadOnlyCrm(page: Page) {
  await page.route('**/crm-proxy', async (route) => {
    const body = route.request().postDataJSON() as { table?: string }
    const data = body.table === 'autoDepositReviewQueue'
      ? { ok: true, items: [], summary: { total: 0, review: 0, unmatched: 0, resolved: 0, dismissed: 0 } }
      : { list: [], pageInfo: { totalRows: 0, page: 1, pageSize: 500, isLastPage: true } }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data, timestamp: new Date().toISOString() }),
    })
  })
}

test('T13-01: 직접거래 업무함은 핵심 업무 카드와 레인을 표시한다', async ({ page }) => {
  await mockReadOnlyCrm(page)
  await page.goto('/trade-work-queue')
  await expect(page.getByRole('heading', { name: '직접거래 업무함' })).toBeVisible({ timeout: PAGE_TIMEOUT })
  await expect(page.getByText('오늘 출고할 건')).toBeVisible()
  await expect(page.getByText('출고완료 후 미수')).toBeVisible()
  await expect(page.getByText('입금 반영 검토 필요')).toBeVisible()
  await expect(page.getByRole('heading', { name: /레인/ })).toBeVisible()
})

test('T13-02: 마감 점검은 점검 항목별 카드와 상세 표를 표시한다', async ({ page }) => {
  await mockReadOnlyCrm(page)
  await page.goto('/month-end-review')
  await expect(page.getByRole('heading', { name: '마감 점검' })).toBeVisible({ timeout: PAGE_TIMEOUT })
  await expect(page.getByText('출고완료 누락').first()).toBeVisible()
  await expect(page.getByText('입금 반영 미처리').first()).toBeVisible()
  await expect(page.getByText('세금계산서 기준 확인').first()).toBeVisible()
  await expect(page.getByRole('heading', { name: '점검 상세' })).toBeVisible()
})
