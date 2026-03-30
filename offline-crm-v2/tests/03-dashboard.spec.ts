/**
 * 테스트 3: 대시보드 KPI 표시 확인
 * ─────────────────────────────────────────────────────────
 * 검증 항목:
 *   T3-01  대시보드 페이지 접속 및 제목 표시
 *   T3-02  KPI 카드 8개 제목 표시 확인
 *   T3-03  KPI 카드 값이 숫자/원 형식으로 표시됨
 *   T3-04  월별 매출 추이 차트 컨테이너 렌더링 확인
 *   T3-05  고객 상태 분포 파이 차트 컨테이너 렌더링 확인
 *   T3-06  미수금 TOP10 차트 또는 "미수금 없음" 메시지 표시
 *   T3-07  연도별 매출 차트 렌더링 확인
 *   T3-08  사이드바 네비게이션 링크 7개 표시 확인
 *   T3-09  브랜드 컬러 사이드바 배경 확인
 */
import { test, expect } from '@playwright/test'
import { assertPageTitle, assertKpiCard, API_TIMEOUT } from './helpers'

// 대시보드로 이동
test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await assertPageTitle(page, '대시보드')
})

test('T3-01: 대시보드 페이지 접속 및 기준 연월 표시', async ({ page }) => {
  // 제목
  await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible()

  // 기준 연월 텍스트 (예: "기준: 2026년 3월")
  const now = new Date()
  const expectedText = `기준: ${now.getFullYear()}년 ${now.getMonth() + 1}월`
  await expect(page.getByText(expectedText)).toBeVisible()
})

test('T3-02: KPI 카드 8개 제목 표시 확인', async ({ page }) => {
  // KPI 카드 8개 제목 전체 확인
  const kpiTitles = [
    '이번 달 매출',
    '미수금 총액',
    '미수금 고객 수',
    '매출 성장률',
    '활성 고객',
    '전체 고객',
    '이번 달 명세표',
    '평균 거래 단가',
  ]

  for (const title of kpiTitles) {
    await assertKpiCard(page, title)
  }

  // KPI 카드 컨테이너: grid cols-2 lg:cols-4 내 Card 8개
  // CardHeader > CardTitle 텍스트로 count 확인
  const cardTitles = page.locator('[class*="muted-foreground"]').filter({
    hasText: /달 매출|미수금|성장률|활성 고객|전체 고객|명세표|단가/,
  })
  // 8개 이상 (기타 텍스트 포함될 수 있으므로 최소 8개)
  const count = await cardTitles.count()
  expect(count).toBeGreaterThanOrEqual(8)
})

test('T3-03: KPI 카드 값이 숫자/원 형식으로 표시됨 (API 응답 후)', async ({ page }) => {
  // NocoDB API 로딩 대기 — 로딩 중 텍스트가 없어질 때까지
  // (대시보드는 별도 로딩 스피너 없이 0값으로 시작 → 데이터 로드 후 업데이트)
  // 데이터 로드 완료 신호: "전체 고객" 값이 0이 아닌 값으로 표시됨
  await expect(async () => {
    const totalCustomerCard = page.locator('p.text-xl.font-bold').nth(5)  // "전체 고객" 카드 값
    const value = await totalCustomerCard.textContent()
    // 마이그레이션된 고객 15,830건이 있으므로 0 이상이어야 함
    expect(value).not.toBe('0명')
    expect(value).toMatch(/\d+/)
  }).toPass({ timeout: API_TIMEOUT })

  // "원" 단위가 포함된 KPI 값 확인 (이번 달 매출, 미수금 총액 등)
  const wonValues = page.locator('p.text-xl.font-bold').filter({ hasText: /원$/ })
  const wonCount = await wonValues.count()
  // 금액 관련 KPI: 이번달매출, 미수금총액, 평균거래단가 = 3개 이상
  expect(wonCount).toBeGreaterThanOrEqual(3)
})

test('T3-04: 월별 매출 추이 차트 컨테이너 렌더링 확인', async ({ page }) => {
  // 차트 제목 확인
  await expect(
    page.getByText('월별 매출 추이 (최근 12개월)')
  ).toBeVisible({ timeout: API_TIMEOUT })

  // Recharts SVG 컨테이너가 DOM에 존재하는지 확인
  // ResponsiveContainer → SVG가 렌더링됨
  const lineChartSvg = page.locator('.recharts-wrapper').first()
  await expect(lineChartSvg).toBeVisible({ timeout: API_TIMEOUT })

  // SVG 내 라인이 존재 (올해 vs 전년 비교선)
  const lines = lineChartSvg.locator('.recharts-line')
  await expect(lines).toHaveCount(2, { timeout: API_TIMEOUT })
})

test('T3-05: 고객 상태 분포 파이 차트 컨테이너 렌더링 확인', async ({ page }) => {
  // 파이 차트 제목
  await expect(page.getByText('고객 상태 분포')).toBeVisible({ timeout: API_TIMEOUT })

  // 파이 차트 SVG 존재
  const pieWrapper = page.locator('.recharts-wrapper').nth(1)
  await expect(pieWrapper).toBeVisible({ timeout: API_TIMEOUT })

  // 범례 텍스트: 활성/휴면/이탈
  await expect(page.getByText('활성', { exact: true })).toBeVisible({ timeout: API_TIMEOUT })
  await expect(page.getByText('휴면', { exact: true })).toBeVisible({ timeout: API_TIMEOUT })
  await expect(page.getByText('이탈', { exact: true })).toBeVisible({ timeout: API_TIMEOUT })

  // 활성률 텍스트 ("활성률 X.X%") 확인
  await expect(page.getByText(/활성률 \d+\.\d+%/)).toBeVisible({ timeout: API_TIMEOUT })
})

test('T3-06: 미수금 TOP10 차트 또는 "미수금 없음" 메시지 표시', async ({ page }) => {
  // 미수금 TOP10 제목
  await expect(page.getByText('미수금 TOP 10 거래처')).toBeVisible({ timeout: API_TIMEOUT })

  // 미수금 데이터가 있으면 BarChart, 없으면 안내 메시지
  const barChart = page.locator('.recharts-wrapper').nth(2)
  const emptyMsg = page.getByText('미수금 거래처 없음')

  const hasChart = await barChart.count()
  const hasEmpty = await emptyMsg.count()

  // 둘 중 하나는 반드시 존재
  expect(hasChart > 0 || hasEmpty > 0).toBeTruthy()
})

test('T3-07: 연도별 매출 차트 렌더링 확인', async ({ page }) => {
  // 연도별 차트 제목 (현재 연도 포함)
  const currentYear = new Date().getFullYear()
  await expect(
    page.getByText(`연도별 출고 매출 (2013~${currentYear})`)
  ).toBeVisible({ timeout: API_TIMEOUT })

  // 연도별 차트: 로딩 중 텍스트가 사라지고 차트 표시
  const loadingMsg = page.getByText('로딩 중...')
  await expect(loadingMsg).toHaveCount(0, { timeout: API_TIMEOUT })

  // BarChart SVG 존재 (연도별 차트는 마지막 .recharts-wrapper)
  const barChartWrappers = page.locator('.recharts-wrapper')
  const wrapperCount = await barChartWrappers.count()
  // 총 4개 차트 (월별/파이/미수금TOP10/연도별) → 3개 이상
  expect(wrapperCount).toBeGreaterThanOrEqual(3)
})

test('T3-08: 사이드바 네비게이션 링크 표시 확인', async ({ page }) => {
  // 현재 사이드바 핵심 메뉴 확인
  const menuItems = [
    '대시보드',
    '고객 관리',
    '명세표 작성',
    '제품 관리',
    '공급처',
    '거래/명세표 조회',
    '수금 관리',
    '지급 관리',
    '입금 수집함',
    '캘린더',
    '설정',
  ]

  const sidebar = page.locator('aside')
  await expect(sidebar).toBeVisible()

  for (const item of menuItems) {
    await expect(sidebar.getByText(item)).toBeVisible()
  }

  // 로고 텍스트 확인
  await expect(sidebar.getByText('PRESSCO21')).toBeVisible()
  await expect(sidebar.getByText('CRM 관리 시스템')).toBeVisible()
})

test('T3-09: 브랜드 컬러 사이드바 배경 및 활성 메뉴 스타일 확인', async ({ page }) => {
  const sidebar = page.locator('aside')

  // 사이드바 배경색: #1a2e1f
  const bgColor = await sidebar.evaluate((el) => {
    return window.getComputedStyle(el).backgroundColor
  })
  // RGB 변환: rgb(26, 46, 31) = #1a2e1f
  expect(bgColor).toMatch(/rgb\(26,\s*46,\s*31\)/)

  // 대시보드 메뉴가 활성 상태 (브랜드 그린 배경)
  const dashboardLink = page.getByRole('link', { name: '대시보드' })
  const linkBg = await dashboardLink.evaluate((el) => {
    return window.getComputedStyle(el).backgroundColor
  })
  // 활성 배경색: #7d9675 = rgb(125, 150, 117)
  expect(linkBg).toMatch(/rgb\(125,\s*150,\s*117\)/)
})
