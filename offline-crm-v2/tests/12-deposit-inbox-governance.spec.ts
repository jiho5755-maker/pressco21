/**
 * 테스트 12: 입금수집함 거버넌스 수동/제외 UX
 */
import { test, expect } from '@playwright/test'

const INBOX_KEY = 'pressco21-auto-deposit-inbox-v1'

test('T12-01: 입금수집함은 수동 완료/제외/보류 처리를 장부 write 없이 로컬 이력으로 남긴다', async ({ page }) => {
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
  await page.addInitScript(({ key }) => {
    localStorage.setItem(key, JSON.stringify([
      {
        id: 'governance-local-dismiss-1',
        date: '2026-04-30',
        sender: '쿠팡정산',
        amount: 990000,
        note: '플랫폼 정산금',
        sourceFile: 'governance-test.csv',
        status: 'pending',
      },
    ]))
  }, { key: INBOX_KEY })

  await page.goto('/deposit-inbox')
  await expect(page.getByRole('heading', { name: '입금 수집함' })).toBeVisible()
  await expect(page.getByText('입금 처리 안전장치')).toBeVisible()

  const row = page.locator('tbody tr', { hasText: '쿠팡정산' }).first()
  await expect(row).toBeVisible()
  await expect(row.getByText('미매칭')).toBeVisible()
  await expect(row.getByRole('button', { name: '수동 완료' })).toBeEnabled()
  await expect(row.getByRole('button', { name: '보류' })).toBeEnabled()

  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('prompt')
    await dialog.accept('플랫폼 정산금 제외')
  })
  await row.getByRole('button', { name: '제외' }).click()

  await expect(row.getByText('제외 완료')).toBeVisible()
  await expect(row.getByText('플랫폼 정산금 제외')).toBeVisible()
})
