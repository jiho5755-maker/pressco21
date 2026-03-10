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
 *
 * 주의: T2-09는 실제 NocoDB에 데이터를 생성합니다.
 *       테스트 실행 후 발행번호 "TEST-E2E-PLAYWRIGHT"로 검색하여
 *       테스트 데이터를 수동으로 삭제해주세요.
 */
import { test, expect } from '@playwright/test'
import {
  assertPageTitle,
  waitForTableLoaded,
  assertNoApiError,
  waitForDialog,
  API_TIMEOUT,
} from './helpers'

// 테스트 전 거래명세표 페이지로 이동
test.beforeEach(async ({ page }) => {
  await page.goto('/invoices')
  await assertPageTitle(page, '명세표 작성/관리')
})

test('T2-01: 거래명세표 페이지 접속 및 헤더 확인', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '명세표 작성/관리' })).toBeVisible()

  // "새 명세표" 버튼과 송장 엑셀 버튼 표시 확인
  await expect(page.getByRole('button', { name: /새 명세표/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /택배 송장 자동 다운로드/ })).toBeVisible()
})

test('T2-02: 기존 명세표 목록 로드 확인', async ({ page }) => {
  await waitForTableLoaded(page)
  await assertNoApiError(page)

  // 테이블 헤더 8개 확인 (액션 컬럼 포함)
  const headers = page.locator('thead th')
  await expect(headers).toHaveCount(8)

  // 주요 헤더 텍스트 확인
  await expect(page.getByRole('columnheader', { name: '발행번호' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '거래처' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '합계금액' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '수금' })).toBeVisible()
})

test('T2-03: "새 명세표" 버튼 클릭 → Dialog 열림', async ({ page }) => {
  await page.getByRole('button', { name: /새 명세표/ }).click()

  // Dialog 열림 확인
  await waitForDialog(page, '새 거래명세표')

  // Dialog 스코프로 라벨 확인 (페이지 내 동명 요소와 충돌 방지)
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('거래처 *')).toBeVisible()
  await expect(dialog.getByText('발행일')).toBeVisible()
  await expect(dialog.getByText('발행번호')).toBeVisible()
  await expect(dialog.getByText('품목 목록')).toBeVisible()
})

test('T2-04: Dialog 기본값 확인 — 발행번호 자동생성 / 오늘 날짜', async ({ page }) => {
  await page.getByRole('button', { name: /새 명세표/ }).click()
  await waitForDialog(page, '새 거래명세표')

  const dialog = page.getByRole('dialog')

  // 발행번호: INV-YYYYMMDD-HHMMSS 패턴
  const invoiceNoInput = dialog.locator('input.font-mono')
  await expect(invoiceNoInput).toHaveValue(/^INV-\d{8}-\d{6}$/)

  // 발행일: 오늘 날짜 (YYYY-MM-DD)
  const today = new Date().toISOString().slice(0, 10)
  const dateInput = dialog.locator('input[type="date"]')
  await expect(dateInput).toHaveValue(today)

  // 기본 구분: 영수 (Dialog 내 첫 번째 combobox)
  await expect(dialog.locator('button[role="combobox"]').first()).toContainText('영수')

  // 기본 품목 행 1개 존재
  const itemRows = dialog.locator('tbody tr')
  await expect(itemRows).toHaveCount(1)
})

test('T2-05: 거래처 자동완성 동작 확인', async ({ page }) => {
  await page.getByRole('button', { name: /새 명세표/ }).click()
  await waitForDialog(page, '새 거래명세표')

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
  await waitForDialog(page, '새 거래명세표')

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
  await waitForDialog(page, '새 거래명세표')

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
  await waitForDialog(page, '새 거래명세표')

  // 거래처 입력 없이 저장 시도
  const saveBtn = page.getByRole('button', { name: '명세표 발행' })
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
  await waitForDialog(page, '새 거래명세표')

  // Dialog 스코프 (목록 검색 input과 충돌 방지)
  const dialog = page.getByRole('dialog')

  // 1) 발행번호를 테스트용으로 변경 (나중에 찾기 쉽도록)
  const invoiceNoInput = dialog.locator('input.font-mono')
  await invoiceNoInput.fill('TEST-E2E-PLAYWRIGHT')

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
  const saveBtn = page.getByRole('button', { name: '명세표 발행' })
  await expect(saveBtn).toBeEnabled()
  await saveBtn.click()

  // Dialog가 닫힐 때까지 대기 (저장 완료)
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 })

  // 5) 목록 새로고침 후 저장된 명세표 확인
  await waitForTableLoaded(page)

  // 발행번호 "TEST-E2E-PLAYWRIGHT" 행이 목록에 표시됨 (.first()로 중복 방지)
  await expect(
    page.locator('td.font-mono.text-xs').filter({ hasText: 'TEST-E2E-PLAYWRIGHT' }).first()
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
