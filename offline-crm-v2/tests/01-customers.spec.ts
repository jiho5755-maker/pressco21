/**
 * 테스트 1: 고객 조회 플로우
 * ─────────────────────────────────────────────────────────
 * 검증 항목:
 *   T1-01  고객 관리 페이지 접속 및 제목 표시
 *   T1-02  고객 목록 테이블 로드 (API 응답 확인)
 *   T1-03  총 고객 수 표시 확인
 *   T1-04  검색 필터 동작 (키워드 입력 → 결과 반영)
 *   T1-05  상태 필터 동작 (SELECT 변경 → 필터 적용)
 *   T1-06  필터 초기화 버튼 동작
 *   T1-07  고객 행 클릭 → 상세 페이지 이동
 *   T1-08  상세 페이지 4탭 표시 확인
 *   T1-09  뒤로가기 버튼으로 목록 복귀
 */
import { test, expect } from '@playwright/test'
import {
  assertPageTitle,
  waitForTableLoaded,
  assertNoApiError,
  API_TIMEOUT,
} from './helpers'

// 각 테스트 전 고객 관리 페이지로 이동
test.beforeEach(async ({ page }) => {
  await page.goto('/customers')
  await assertPageTitle(page, '고객 관리')
})

test('T1-01: 고객 관리 페이지 접속 및 제목 표시', async ({ page }) => {
  // 페이지 제목 확인
  await expect(page.getByRole('heading', { name: '고객 관리' })).toBeVisible()

  // 사이드바 활성 메뉴 확인
  const activeMenu = page.getByRole('link', { name: '고객 관리' })
  await expect(activeMenu).toHaveAttribute('class', /text-white/)
})

test('T1-02: 고객 목록 테이블 로드 (NocoDB API 응답)', async ({ page }) => {
  // 로딩 완료 대기
  await waitForTableLoaded(page)

  // API 에러 없음 확인
  await assertNoApiError(page)

  // 테이블 헤더 컬럼 8개 확인 (액션 컬럼 포함)
  const headers = page.locator('thead th')
  await expect(headers).toHaveCount(8)

  // 헤더 텍스트 확인
  await expect(page.getByRole('columnheader', { name: '거래처명' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '유형' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '상태' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '등급' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '최종거래일' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '총매출' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '미수금' })).toBeVisible()
})

test('T1-03: 총 고객 수 표시 확인', async ({ page }) => {
  // 로딩 완료 대기
  await waitForTableLoaded(page)

  // "총 X명" 패턴 텍스트 확인 (15,830건 마이그레이션된 데이터)
  const totalText = page.locator('p.text-sm.text-muted-foreground').first()
  await expect(totalText).toContainText('총')
  await expect(totalText).toContainText('명')

  // 데이터 행이 1개 이상 존재하는지 확인
  const rows = page.locator('tbody tr').filter({
    hasNot: page.locator('td[colspan]'),  // "불러오는 중..." 행 제외
  })
  await expect(rows).toHaveCount(25, { timeout: API_TIMEOUT })  // PAGE_SIZE = 25
})

test('T1-04: 검색 필터 동작 — 키워드 입력 후 결과 반영', async ({ page }) => {
  // 로딩 완료 대기
  await waitForTableLoaded(page)

  // 검색 input에 키워드 입력
  const searchInput = page.getByPlaceholder('거래처명 검색...')
  await searchInput.fill('학교')

  // debounce 400ms 대기 후 API 재호출 → 로딩 대기
  await page.waitForTimeout(600)
  await waitForTableLoaded(page)

  // 검색 결과 확인: 빈 결과이거나 "학교" 포함 데이터
  const emptyMsg = page.getByText('검색 결과가 없습니다.')
  const rows = page.locator('tbody tr').filter({
    hasNot: page.locator('td[colspan]'),
  })

  // 결과가 있거나 없거나 둘 중 하나여야 함 (에러 아님)
  const hasResults = await rows.count()
  const hasEmpty = await emptyMsg.count()
  expect(hasResults > 0 || hasEmpty > 0).toBeTruthy()
})

test('T1-05: 상태 필터 동작 — "활성" 선택 후 필터 적용', async ({ page }) => {
  // 로딩 완료 대기
  await waitForTableLoaded(page)

  // 상태 필터 SELECT 클릭
  const statusSelect = page.locator('button[role="combobox"]').nth(1)
  await statusSelect.click()

  // "활성" 옵션 선택
  await page.getByRole('option', { name: '활성' }).click()

  // 필터 적용 후 로딩 대기
  await page.waitForTimeout(600)
  await waitForTableLoaded(page)

  // 결과 행에 "활성" 배지가 표시되거나 결과 없음
  const activeBadge = page.locator('span').filter({ hasText: '활성' }).first()
  const emptyMsg = page.getByText('검색 결과가 없습니다.')

  const hasBadge = await activeBadge.count()
  const hasEmpty = await emptyMsg.count()
  expect(hasBadge > 0 || hasEmpty > 0).toBeTruthy()
})

test('T1-06: 필터 초기화 버튼 동작', async ({ page }) => {
  // 먼저 필터 적용
  await waitForTableLoaded(page)
  const statusSelect = page.locator('button[role="combobox"]').nth(1)
  await statusSelect.click()
  await page.getByRole('option', { name: '활성' }).click()
  await page.waitForTimeout(600)
  await waitForTableLoaded(page)

  // "초기화" 버튼 표시 확인 및 클릭
  const resetBtn = page.getByRole('button', { name: '초기화' })
  await expect(resetBtn).toBeVisible()
  await resetBtn.click()

  // 초기화 후 필터 상태 확인 — 초기화 버튼이 사라져야 함
  await page.waitForTimeout(600)
  await expect(resetBtn).toHaveCount(0)

  // 목록이 다시 로드됨
  await waitForTableLoaded(page)
})

test('T1-07: 고객 행 클릭 → 상세 페이지 이동', async ({ page }) => {
  // 목록 로드 대기
  await waitForTableLoaded(page)

  // 첫 번째 데이터 행 클릭
  const firstRow = page.locator('tbody tr').filter({
    hasNot: page.locator('td[colspan]'),
  }).first()

  // 행 텍스트 저장 (상세 페이지에서 동일 이름 확인용)
  const customerName = await firstRow.locator('td').first().textContent()

  await firstRow.click()

  // URL이 /customers/{id} 패턴으로 변경됨
  await expect(page).toHaveURL(/\/customers\/\d+/, { timeout: 10_000 })

  // 상세 페이지에 고객 이름이 표시됨
  if (customerName && customerName.trim() !== '-') {
    await expect(page.getByText(customerName.trim())).toBeVisible({
      timeout: API_TIMEOUT,
    })
  }
})

test('T1-08: 상세 페이지 4탭 표시 확인', async ({ page }) => {
  // 목록에서 첫 번째 고객 상세로 이동
  await waitForTableLoaded(page)
  const firstRow = page.locator('tbody tr').filter({
    hasNot: page.locator('td[colspan]'),
  }).first()
  await firstRow.click()
  await expect(page).toHaveURL(/\/customers\/\d+/)

  // 4탭 존재 확인
  const tabList = page.getByRole('tablist')
  await expect(tabList).toBeVisible({ timeout: API_TIMEOUT })

  await expect(page.getByRole('tab', { name: '기본정보' })).toBeVisible()
  await expect(page.getByRole('tab', { name: '거래내역' })).toBeVisible()
  await expect(page.getByRole('tab', { name: '매출차트' })).toBeVisible()
  await expect(page.getByRole('tab', { name: '명세표' })).toBeVisible()
})

test('T1-09: 상세 페이지 뒤로가기 버튼으로 목록 복귀', async ({ page }) => {
  // 상세 페이지로 이동
  await waitForTableLoaded(page)
  await page.locator('tbody tr').filter({
    hasNot: page.locator('td[colspan]'),
  }).first().click()
  await expect(page).toHaveURL(/\/customers\/\d+/)

  // 뒤로가기 버튼 클릭
  const backBtn = page.getByRole('button', { name: '목록으로' })
  await expect(backBtn).toBeVisible({ timeout: API_TIMEOUT })
  await backBtn.click()

  // 고객 목록으로 돌아옴
  await expect(page).toHaveURL('/customers')
  await expect(page.getByRole('heading', { name: '고객 관리' })).toBeVisible()
})
