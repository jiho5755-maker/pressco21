/**
 * 테스트 2: 거래명세표 발행 플로우
 * ─────────────────────────────────────────────────────────
 * 검증 항목:
 *   T2-01  거래명세표 페이지 접속 및 제목 표시
 *   T2-02  기존 명세표 목록 로드 확인
 *   T2-03  "새 명세표" 버튼 클릭 → Dialog 열림
 *   T2-04  Dialog 기본값 확인 (발행번호 자동생성, 오늘 날짜)
 *   T2-05  거래처 자동완성 동작 확인
 *   T2-06  품목 "행 추가" 버튼 동작
 *   T2-07  품목 입력 시 공급가액/세액 자동 계산
 *   T2-08  거래처 없이 저장 시도 → 유효성 검사 경고
 *   T2-09  완전한 데이터로 명세표 저장 → 목록에 반영
 *   T2-10  저장된 명세표 클릭 → 수정 Dialog 열림
 *   T2-11  목록 우측 실행 버튼에 명세표/견적서/납품서/청구서 표시
 *   T2-12  품목 자동완성 선택 시 고객 단가 입력 + 과세 유지
 *   T2-13  빠른 기간 버튼 선택 시 날짜 입력값 동기화
 *
 * 주의: T2-09는 실제 NocoDB에 데이터를 생성합니다.
 *       afterEach 훅에서 TEST-E2E-PLAYWRIGHT- prefix 데이터를 자동 정리합니다.
 */
import { test, expect } from '@playwright/test'
import ExcelJS from 'exceljs'
import {
  cleanupTestInvoices,
  cleanupTestCustomers,
  createTestCustomer,
  DEFAULT_RECEIPT_TYPE,
  assertPageTitle,
  waitForTableLoaded,
  assertNoApiError,
  getTodayDateString,
  TEST_INVOICE_PREFIX,
  waitForDialog,
  API_TIMEOUT,
} from './helpers'

function shiftCalendarDate(dateString: string, offsetDays: number) {
  const [year, month, day] = dateString.split('-').map(Number)
  const nextDate = new Date(year, month - 1, day)
  nextDate.setDate(nextDate.getDate() + offsetDays)
  const nextYear = nextDate.getFullYear()
  const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0')
const nextDay = String(nextDate.getDate()).padStart(2, '0')
  return `${nextYear}-${nextMonth}-${nextDay}`
}

const DISCOUNT_CUSTOMER_PREFIX = 'TEST-CUSTOMER-DISCOUNT-'
const COURIER_ADDRESS_CUSTOMER_PREFIX = 'TEST-CUSTOMER-COURIER-ADDRESS-'

// 테스트 전 거래명세표 페이지로 이동
test.beforeEach(async ({ page }) => {
  await page.goto('/invoices')
  await assertPageTitle(page, '명세표 작성/관리')
})

test.afterEach(async ({ request }) => {
  await cleanupTestInvoices(request, TEST_INVOICE_PREFIX)
  await cleanupTestCustomers(request, DISCOUNT_CUSTOMER_PREFIX)
  await cleanupTestCustomers(request, COURIER_ADDRESS_CUSTOMER_PREFIX)
})

test('T2-01: 거래명세표 페이지 접속 및 헤더 확인', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '명세표 작성/관리' })).toBeVisible()

  // "새 명세표" 버튼과 송장 엑셀 버튼 표시 확인
  await expect(page.getByRole('button', { name: /새 명세표/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /송장 엑셀|택배 송장 자동 다운로드/ })).toBeVisible()

  const today = getTodayDateString()
  const pageDateInputs = page.locator('main input[type="date"]')
  await expect(pageDateInputs.nth(0)).toHaveValue(today)
  await expect(pageDateInputs.nth(1)).toHaveValue(today)
})

test('T2-02: 기존 명세표 목록 로드 확인', async ({ page }) => {
  await waitForTableLoaded(page)
  await assertNoApiError(page)

  // 테이블 헤더 5개 확인 (액션 컬럼 포함)
  const headers = page.locator('thead th')
  await expect(headers).toHaveCount(5)

  // 주요 헤더 텍스트 확인
  await expect(page.getByRole('columnheader', { name: '발행정보' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '거래처' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '금액' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '수금 현황' })).toBeVisible()
})

test('T2-03: "새 명세표" 버튼 클릭 → Dialog 열림', async ({ page }) => {
  await page.getByRole('button', { name: /새 명세표/ }).click()

  // Dialog 열림 확인
  await waitForDialog(page, '새 명세표')

  // Dialog 스코프로 라벨 확인 (페이지 내 동명 요소와 충돌 방지)
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('거래처 *')).toBeVisible()
  await expect(dialog.getByText('발행일')).toBeVisible()
  await expect(dialog.getByText('발행번호')).toBeVisible()
  await expect(dialog.getByText('품목 목록')).toBeVisible()
})

test('T2-04: Dialog 기본값 확인 — 발행번호 자동생성 / 오늘 날짜', async ({ page }) => {
  await page.getByRole('button', { name: /새 명세표/ }).click()
  await waitForDialog(page, '새 명세표')

  const dialog = page.getByRole('dialog')

  // 발행번호: INV-YYYYMMDD-HHMMSS 패턴
  const invoiceNoInput = dialog.locator('input.font-mono')
  await expect(invoiceNoInput).toHaveValue(/^INV-\d{8}-\d{6}$/)

  // 발행일: 오늘 날짜 (YYYY-MM-DD)
  const today = getTodayDateString()
  const dateInput = dialog.locator('input[type="date"]')
  await expect(dateInput).toHaveValue(today)

  // 기본 구분: 거래명세표
  await expect(dialog.locator('button[role="combobox"]').first()).toContainText(DEFAULT_RECEIPT_TYPE)

  // 기본 품목 행 1개 존재
  const itemRows = dialog.locator('tbody tr')
  await expect(itemRows).toHaveCount(1)
})

test('T2-05: 거래처 자동완성 동작 확인', async ({ page }) => {
  await page.getByRole('button', { name: /새 명세표/ }).click()
  await waitForDialog(page, '새 명세표')

  // Dialog 스코프로 입력 (목록 검색 input과 충돌 방지)
  const dialog = page.getByRole('dialog')
  const customerInput = dialog.getByPlaceholder('거래처명 검색...')
  await customerInput.fill('학교')

  // 자동완성 드롭다운 대기 (NocoDB 검색 API 호출)
  const dropdown = page.locator('.absolute.z-50.bg-white.border.rounded-md')
  await expect(dropdown).toBeVisible({ timeout: API_TIMEOUT })

  // 드롭다운에 항목이 1개 이상 있음
  const options = dropdown.locator('button')
  const count = await options.count()
  expect(count).toBeGreaterThan(0)

  // 첫 번째 항목 클릭 → 선택
  const firstOption = options.first()
  const optionText = await firstOption.locator('span.font-medium').textContent()
  await firstOption.click()

  // 거래처 input에 선택된 이름이 채워짐
  if (optionText) {
    await expect(customerInput).toHaveValue(optionText)
  }
})

test('T2-06: 품목 "행 추가" 버튼 동작', async ({ page }) => {
  await page.getByRole('button', { name: /새 명세표/ }).click()
  await waitForDialog(page, '새 명세표')

  // 초기 행 수 확인 (1개)
  const tbody = page.locator('[role="dialog"] tbody')
  await expect(tbody.locator('tr')).toHaveCount(1)

  // "행 추가" 버튼 클릭
  await page.getByRole('button', { name: /행 추가/ }).click()
  await expect(tbody.locator('tr')).toHaveCount(2)

  // 한 번 더 추가
  await page.getByRole('button', { name: /행 추가/ }).click()
  await expect(tbody.locator('tr')).toHaveCount(3)
})

test('T2-07: 품목 단가 입력 시 공급가액/세액 자동 계산', async ({ page }) => {
  await page.getByRole('button', { name: /새 명세표/ }).click()
  await waitForDialog(page, '새 명세표')

  // 첫 번째 행의 수량(기본 1), 단가 입력
  // 품목 행 구조: 품목명 | 단위 | 수량 | 단가 | 공급가액 | 과세 | 세액 | 합계 | 삭제
  const tbody = page.locator('[role="dialog"] tbody')
  const firstRow = tbody.locator('tr').first()

  // 과세 체크를 켜서 세액 계산이 발생하도록 맞춘다.
  const taxableCheckbox = firstRow.locator('input[type="checkbox"]')
  await taxableCheckbox.check()

  // 단가 input (수량 다음 number input)
  const priceInput = firstRow.locator('input[type="number"]').nth(1)  // 수량=0, 단가=1
  await priceInput.fill('10000')
  await priceInput.press('Tab')  // blur 발생 → calcRow 실행

  // 공급가액 = 수량(1) × 단가(10000) = 10,000
  const supplyCell = firstRow.locator('td.text-right.text-xs').first()
  await expect(supplyCell).toContainText('10,000')

  // 세액 = floor(10000 / 10) = 1,000 (과세 체크됨)
  const taxCell = firstRow.locator('td.text-right.text-xs').nth(1)
  await expect(taxCell).toContainText('1,000')

  // 합계 요약 (Dialog 하단) 업데이트 확인 (Dialog 스코프로 strict mode 충돌 방지)
  const dialog = page.getByRole('dialog')
  await expect(dialog.locator('div').filter({ hasText: /^공급가액$/ }).first()).toBeVisible()
})

test('T2-08: 거래처 없이 저장 시도 → 유효성 검사 경고', async ({ page }) => {
  await page.getByRole('button', { name: /새 명세표/ }).click()
  await waitForDialog(page, '새 명세표')

  // 거래처 입력 없이 저장 시도
  const saveBtn = page.getByRole('button', { name: '저장', exact: true })
  await saveBtn.click()

  // 토스트 경고 메시지 확인
  await expect(page.getByText('거래처를 입력해주세요')).toBeVisible()

  // Dialog가 닫히지 않음 (여전히 열려 있음)
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('T2-09: 완전한 데이터로 명세표 저장 → 목록에 반영', async ({ page }) => {
  // 목록 초기 건수 기록
  await waitForTableLoaded(page)

  // "새 명세표" 열기
  await page.getByRole('button', { name: /새 명세표/ }).click()
  await waitForDialog(page, '새 명세표')

  // Dialog 스코프 (목록 검색 input과 충돌 방지)
  const dialog = page.getByRole('dialog')

  // 1) 발행번호를 테스트용으로 변경 (나중에 찾기 쉽도록)
  const invoiceNoInput = dialog.locator('input.font-mono')
  const testInvoiceNo = `${TEST_INVOICE_PREFIX}${Date.now()}`
  await invoiceNoInput.fill(testInvoiceNo)

  // 2) 거래처 직접 입력 (자동완성 없이 텍스트로)
  const customerInput = dialog.getByPlaceholder('거래처명 검색...')
  await customerInput.fill('E2E테스트거래처')

  // 3) 품목 입력
  const tbody = page.locator('[role="dialog"] tbody')
  const firstRow = tbody.locator('tr').first()

  // 품목명
  const productNameInput = firstRow.locator('input[placeholder="품목명 검색 (자동완성)"]')
  await productNameInput.fill('테스트 품목')

  // 단가 (10,000원)
  const priceInput = firstRow.locator('input[type="number"]').nth(1)
  await priceInput.fill('10000')
  await priceInput.press('Tab')

  // 4) 저장 버튼 클릭
  const saveBtn = page.getByRole('button', { name: '저장', exact: true })
  await expect(saveBtn).toBeEnabled()
  await saveBtn.click()

  // Dialog가 닫힐 때까지 대기 (저장 완료)
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 })

  // 5) 목록 새로고침 후 저장된 명세표 확인
  await waitForTableLoaded(page)

  // 발행번호 "TEST-E2E-PLAYWRIGHT" 행이 목록에 표시됨 (.first()로 중복 방지)
  await expect(
    page.locator('tbody tr').filter({ hasText: testInvoiceNo }).first()
  ).toBeVisible({ timeout: API_TIMEOUT })
})

test('T2-10: 저장된 명세표 클릭 → 수정 Dialog 열림', async ({ page }) => {
  await waitForTableLoaded(page)

  // 목록에서 첫 번째 행 클릭 (기존 데이터 수정 Dialog)
  const firstRow = page.locator('tbody tr').filter({
    hasNot: page.locator('td[colspan]'),
  }).first()

  // 기존 명세표가 없을 경우 스킵
  const rowCount = await firstRow.count()
  if (rowCount === 0) {
    test.skip()
    return
  }

  await firstRow.locator('td').first().click()

  // 거래 상세 모달을 거쳐 수정 Dialog로 진입
  await waitForDialog(page, '거래 상세')
  await page.getByRole('button', { name: '수정 열기' }).click()
  await waitForDialog(page, '명세표 수정')

  // 저장 버튼 표시 확인
  await expect(page.getByRole('button', { name: '수정 저장' })).toBeVisible()

  // 취소 버튼으로 닫기
  await page.getByRole('button', { name: '취소' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 5_000 })
})

test('T2-11: 목록 우측 실행 버튼에 명세표/견적서/납품서/청구서 표시', async ({ page }) => {
  const dateInputs = page.locator('main input[type="date"]')
  await dateInputs.nth(0).fill('2026-03-13')
  await dateInputs.nth(1).fill('2026-03-13')
  await page.waitForTimeout(600)
  await waitForTableLoaded(page)

  const firstRow = page.locator('tbody tr').filter({
    hasNot: page.locator('td[colspan]'),
  }).first()

  await expect(firstRow.getByRole('button', { name: '명세표' })).toBeVisible()
  await expect(firstRow.getByRole('button', { name: '견적서' })).toBeVisible()
  await expect(firstRow.getByRole('button', { name: '납품서' })).toBeVisible()
  await expect(firstRow.getByRole('button', { name: '청구서' })).toBeVisible()
})

test('T2-12: 품목 자동완성 선택 시 고객 단가 입력 + 과세 유지', async ({ page }) => {
  await page.goto('/customers/86')
  await expect(page.getByRole('heading', { name: '송윤경 회장님' })).toBeVisible({ timeout: API_TIMEOUT })

  await page.getByRole('button', { name: '명세표 작성' }).click()
  await expect(page).toHaveURL(/\/invoices/)
  await waitForDialog(page, '새 명세표')

  const dialog = page.getByRole('dialog')
  const firstRow = dialog.locator('tbody tr').first()
  const taxableCheckbox = firstRow.locator('input[type="checkbox"]')
  await expect(taxableCheckbox).not.toBeChecked()

  const productNameInput = firstRow.getByPlaceholder('품목명 검색 (자동완성)')
  await productNameInput.fill('UV레진')
  await expect(page.getByRole('button', { name: /UV레진\/구미타입\/25g/ })).toBeVisible({ timeout: API_TIMEOUT })
  await page.getByRole('button', { name: /UV레진\/구미타입\/25g/ }).click()

  const unitPriceInput = firstRow.locator('input[type="number"]').nth(1)
  await expect(unitPriceInput).toHaveValue('14760')
  await expect(taxableCheckbox).not.toBeChecked()
})

test('T2-13: 빠른 기간 버튼 선택 시 날짜 입력값 동기화', async ({ page }) => {
  const today = getTodayDateString()
  const dateInputs = page.locator('main input[type="date"]')

  await page.getByRole('button', { name: '최근 7일' }).click()
  await expect(dateInputs.nth(0)).toHaveValue(shiftCalendarDate(today, -6))
  await expect(dateInputs.nth(1)).toHaveValue(today)

  await page.getByRole('button', { name: '오늘' }).click()
  await expect(dateInputs.nth(0)).toHaveValue(today)
  await expect(dateInputs.nth(1)).toHaveValue(today)
})

test('T2-14: 고객 기본 DC 할인율 자동 반영 및 건별 조정', async ({ page, request }) => {
  const uniqueId = Date.now()
  const customerName = `${DISCOUNT_CUSTOMER_PREFIX}${uniqueId}`

  await createTestCustomer(request, {
    name: customerName,
    customer_status: 'active',
    customer_type: 'MEMBER',
    price_tier: 1,
    discount_rate: 10,
  })

  await page.getByRole('button', { name: /새 명세표/ }).click()
  await waitForDialog(page, '새 명세표')

  const dialog = page.getByRole('dialog')
  const customerInput = dialog.getByPlaceholder('거래처명 검색...')
  await customerInput.fill(customerName)
  await expect(page.getByRole('button', { name: new RegExp(customerName) })).toBeVisible({ timeout: API_TIMEOUT })
  await page.getByRole('button', { name: new RegExp(customerName) }).click()

  const firstRow = dialog.locator('tbody tr').first()
  await firstRow.locator('input[type="checkbox"]').check()
  await firstRow.getByPlaceholder('품목명 검색 (자동완성)').fill('할인 테스트 품목')
  await firstRow.locator('input[type="number"]').nth(1).fill('10000')
  await firstRow.locator('input[type="number"]').nth(1).press('Tab')

  await expect(dialog.getByText('고객 기본 할인율 10%가 자동 반영됩니다.')).toBeVisible()
  await expect(dialog.getByText('- 1,100원').first()).toBeVisible()
  await expect(dialog.getByText('9,900원').first()).toBeVisible()

  const discountInput = dialog.getByLabel('DC 할인 금액')
  await discountInput.fill('500')

  await expect(dialog.getByText('고객 기본 할인율 10%에서 건별 DC로 조정 중입니다.')).toBeVisible()
  await expect(dialog.getByText('- 500원').first()).toBeVisible()
  await expect(dialog.getByText('10,500원').first()).toBeVisible()
})


test('T2-15: 송장 엑셀은 선택한 배송지를 기본주소보다 우선 출력', async ({ page, request }) => {
  const uniqueId = Date.now()
  const customerName = `${COURIER_ADDRESS_CUSTOMER_PREFIX}${uniqueId}`
  const invoiceNo = `${TEST_INVOICE_PREFIX}COURIER-${uniqueId}`
  const primaryAddress = `서울시 기본구 기본로 1 ${uniqueId}`
  const secondAddress = `서울시 배송구 배송2로 22 ${uniqueId}`
  const thirdAddress = `서울시 배송구 배송3로 33 ${uniqueId}`

  const customer = await createTestCustomer(request, {
    name: customerName,
    customer_status: 'ACTIVE',
    price_tier: 1,
    phone1: '02-0000-0000',
    mobile: '010-0000-0000',
    address1: primaryAddress,
    address2: secondAddress,
    extra_addresses: JSON.stringify([thirdAddress]),
  })

  await page.goto(`/invoices?new=1&customerId=${customer.Id}&customerName=${encodeURIComponent(customerName)}`)
  await waitForDialog(page, '새 명세표')

  const dialog = page.getByRole('dialog')
  await dialog.locator('input.font-mono').fill(invoiceNo)
  await expect(dialog.getByText('배송 주소')).toBeVisible()
  await expect(dialog.getByText(primaryAddress)).toBeVisible({ timeout: API_TIMEOUT })

  await dialog.getByRole('combobox').filter({ hasText: '기본 주소' }).first().click()
  await page.getByRole('option', { name: /배송지 3/ }).click()
  await expect(dialog.getByText(thirdAddress)).toBeVisible({ timeout: API_TIMEOUT })

  const firstRow = dialog.locator('tbody tr').first()
  await firstRow.getByPlaceholder('품목명 검색 (자동완성)').fill('송장 배송지 회귀 검증 품목')
  await firstRow.locator('input[type="number"]').nth(1).fill('1000')
  await firstRow.locator('input[type="number"]').nth(1).press('Tab')

  await dialog.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: API_TIMEOUT })

  await page.getByPlaceholder('거래처명으로 검색...').fill(customerName)
  await page.waitForTimeout(800)
  await waitForTableLoaded(page)
  await expect(page.locator('tbody tr', { hasText: invoiceNo })).toBeVisible({ timeout: API_TIMEOUT })

  const downloadPromise = page.waitForEvent('download', { timeout: 60_000 })
  await page.getByRole('button', { name: /송장 엑셀/ }).click()
  const confirmDialog = page.getByRole('dialog', { name: /송장 다운로드 전 확인/ })
  if (await confirmDialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await confirmDialog.getByRole('button', { name: '계속 다운로드' }).click()
  }
  const download = await downloadPromise
  const downloadedPath = await download.path()
  expect(downloadedPath).toBeTruthy()

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(downloadedPath!)
  const worksheet = workbook.worksheets[0]
  const headerValues = worksheet.getRow(1).values as unknown[]
  const nameColumn = headerValues.findIndex((value) => value === '받는분')
  const addressColumn = headerValues.findIndex((value) => value === '받는분총주소')
  expect(nameColumn).toBeGreaterThan(0)
  expect(addressColumn).toBeGreaterThan(0)

  let downloadedAddress = ''
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    if (String(row.getCell(nameColumn).value ?? '') === customerName) {
      downloadedAddress = String(row.getCell(addressColumn).value ?? '')
    }
  })

  expect(downloadedAddress).toBe(thirdAddress)
})
