export interface AppGuideStep {
  title: string
  description: string
  selector?: string
}

export interface AppGuideScreen {
  key: string
  path: string
  title: string
  summary: string
  dock?: 'left' | 'right'
  steps: AppGuideStep[]
}

const GUIDE_STORAGE_KEY = 'pressco21-accounting-guide-state'

interface GuideState {
  dismissedKeys: string[]
}

function loadGuideState(): GuideState {
  try {
    const raw = localStorage.getItem(GUIDE_STORAGE_KEY)
    if (!raw) return { dismissedKeys: [] }
    const parsed = JSON.parse(raw) as Partial<GuideState>
    return {
      dismissedKeys: Array.isArray(parsed.dismissedKeys) ? parsed.dismissedKeys.filter((value): value is string => typeof value === 'string') : [],
    }
  } catch {
    return { dismissedKeys: [] }
  }
}

function saveGuideState(state: GuideState) {
  localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent('crm-guide-changed'))
}

export function isGuideDismissed(key: string): boolean {
  return loadGuideState().dismissedKeys.includes(key)
}

export function dismissGuide(key: string) {
  const state = loadGuideState()
  if (state.dismissedKeys.includes(key)) return
  saveGuideState({
    ...state,
    dismissedKeys: [...state.dismissedKeys, key],
  })
}

export function resetAllGuides() {
  saveGuideState({ dismissedKeys: [] })
}

export const APP_GUIDES: AppGuideScreen[] = [
  {
    key: 'settlements',
    path: '/settlements',
    title: '수급 지급 관리 가이드',
    summary: '받을 돈, 예치·환불·지급, 입금 반영, 자동반영 규칙, 마감 점검을 한 화면 흐름으로 관리합니다.',
    dock: 'left',
    steps: [
      { title: '1. 탭 순서대로 보기', description: '받을 돈과 예치·환불·지급으로 현재 돈 상태를 먼저 보고, 입금 반영과 자동반영 규칙으로 처리 기준을 정합니다.', selector: '[role="tablist"]' },
      { title: '2. 입금은 애매하면 수동 반영', description: '동명이인, 가족·대리입금, 새 입금자명은 자동반영하지 말고 입금 반영 탭에서 직접 확인합니다.', selector: '[data-guide-id="deposit-table"]' },
      { title: '3. 마감 전 예외 확인', description: '월말 또는 기간 마감 전에는 마감 점검 탭에서 미처리 입금, 예치금, 환불대기, 세금계산서 예외를 확인합니다.', selector: '[data-guide-id="month-end-review-table"]' },
    ],
  },
  {
    key: 'deposit-inbox',
    path: '/deposit-inbox',
    title: '입금 반영 가이드',
    summary: '은행 입금 알림 파일을 먼저 올리고, 자동으로 잡힌 후보를 검토한 뒤 안전하게 입금 반영하는 화면입니다.',
    dock: 'left',
    steps: [
      { title: '1. 입금 파일 올리기', description: '농협 CSV나 XLSX 파일을 업로드하면 입금 반영 목록에 건이 쌓입니다. 보안상 XLS 파일은 XLSX로 저장 후 올립니다.', selector: '[data-guide-id="deposit-upload-button"]' },
      { title: '2. 오늘 처리할 건수 확인', description: '정확 후보, 검토 필요, 미매칭, 반영 완료 건수를 먼저 보고 우선순위를 정합니다.', selector: '[data-guide-id="deposit-summary"]' },
      { title: '3. 상태와 검색으로 좁히기', description: '검토 필요만 보거나 입금자명으로 검색해서 처리 대상을 빠르게 좁힙니다.', selector: '[data-guide-id="deposit-filters"]' },
      { title: '4. 후보 검토 후 반영하기', description: '자동 후보가 맞으면 바로 입금 반영하고, 반영 후에는 수급 지급 관리와 거래원장에서 같이 확인합니다.', selector: '[data-guide-id="deposit-table"]' },
    ],
  },
  {
    key: 'receivables',
    path: '/receivables',
    title: '받을 돈 가이드',
    summary: '받을 돈을 확인하고 입금 처리, 취소, 고객 이동을 가장 빠르게 처리하는 화면입니다.',
    dock: 'left',
    steps: [
      { title: '1. 먼저 오늘 처리할 고객을 찾기', description: '거래처명 필터로 고객을 좁히고, 기준일은 기본적으로 오늘 기준으로 둡니다.', selector: '[data-guide-id="receivables-search"]' },
      { title: '2. 돈의 출처 구분하기', description: '상단 카드에서 기존 장부 받을 돈, 새 입력 받을 돈, 줄 돈, 환불대기를 나눠 봅니다.', selector: '[data-guide-id="receivables-summary"]' },
      { title: '3. 처리할 탭 고르기', description: '새 입력 받을 돈, 기존 장부 받을 돈, 줄 돈, 환불대기 탭 중 지금 처리할 일을 고릅니다.', selector: '[data-guide-id="receivables-tabs"]' },
      { title: '4. 처리 후 바로 확인하기', description: '입금 확인 뒤에는 고객 상세와 거래원장에서 금액이 같이 바뀌는지 확인합니다.', selector: '[data-guide-id="receivables-table"]' },
    ],
  },
  {
    key: 'payables',
    path: '/payables',
    title: '예치·환불·지급 가이드',
    summary: '줄 돈을 확인하고 지급 처리, 취소, 거래 이력을 관리하는 화면입니다.',
    dock: 'left',
    steps: [
      { title: '1. 총 지급 예정 보기', description: '이 화면은 줄 돈과 환불대기를 합친 총 지급 예정 금액부터 봅니다.', selector: '[data-guide-id="payables-summary"]' },
      { title: '2. 지급 성격 구분하기', description: '기존 장부 줄 돈은 실제로 보내야 할 돈, 환불대기는 고객에게 돌려줄 예정 금액입니다.', selector: '[data-guide-id="receivables-tabs"]' },
      { title: '3. 같은 목록에서 바로 처리하기', description: '전체 지급 탭에서 지급 확인과 환불 처리를 같은 목록에서 바로 진행할 수 있습니다.', selector: '[data-guide-id="payables-table"]' },
      { title: '4. 처리 후 검증하기', description: '예치·환불·지급 금액, 고객 상세, 거래원장의 지급 또는 환불 행이 같이 바뀌는지 확인합니다.', selector: '[data-guide-id="payables-table"]' },
    ],
  },
  {
    key: 'customers',
    path: '/customers',
    title: '고객 관리 가이드',
    summary: '고객을 찾고, 상세에서 수금/지급/거래 흐름을 한 번에 확인하는 시작 화면입니다.',
    dock: 'left',
    steps: [
      { title: '1. 고객 찾기', description: '거래처명과 기존 장부 장부명을 같이 검색할 수 있으니, 분리 거래처도 그대로 찾을 수 있습니다.', selector: '[data-guide-id="customers-search"]' },
      { title: '2. 필터로 좁히기', description: '유형, 상태, 등급 필터를 같이 써서 오늘 처리할 고객만 남깁니다.', selector: '[data-guide-id="customers-filters"]' },
      { title: '3. 상세로 들어가기', description: '목록 행을 누르면 고객 상세로 이동하고, 거기서 수급 지급 관리/거래원장으로 바로 이동합니다.', selector: '[data-guide-id="customers-table"]' },
      { title: '4. 신규 고객 등록', description: '새 고객 버튼으로 고객 정보를 추가하고 바로 거래를 시작할 수 있습니다.', selector: '[data-guide-id="customers-new-button"]' },
    ],
  },
  {
    key: 'transactions',
    path: '/transactions',
    title: '거래원장 가이드',
    summary: '출고, 입금, 지급, 반입이 시간순으로 보이는 통합 원장입니다.',
    dock: 'left',
    steps: [
      { title: '1. 원장 범위 고르기', description: '전체, 기존 장부 거래, 새 입력 명세표 탭 중 필요한 원장 범위를 먼저 고릅니다.', selector: '[data-guide-id="transactions-tabs"]' },
      { title: '2. 고객과 기간으로 좁히기', description: '거래처명, 유형, 시작일/종료일로 필요한 흐름만 남깁니다.', selector: '[data-guide-id="transactions-filters"]' },
      { title: '3. 행을 눌러 상세 보기', description: '거래 상세 팝업에서 고객 상세, 수급 지급 관리로 바로 이동할 수 있습니다.', selector: '[data-guide-id="transactions-table"]' },
      { title: '4. 입금과 지급을 함께 보기', description: '입금은 받을 돈 처리, 지급은 줄 돈 처리입니다. 한 원장에서 같이 보면 실수가 줄어듭니다.', selector: '[data-guide-id="transactions-table"]' },
    ],
  },
]

export function getGuideForPath(pathname: string): AppGuideScreen | null {
  if (pathname.startsWith('/settlements')) return APP_GUIDES.find((guide) => guide.key === 'settlements') ?? null
  if (pathname.startsWith('/deposit-inbox')) return APP_GUIDES.find((guide) => guide.key === 'deposit-inbox') ?? null
  if (pathname.startsWith('/payables')) return APP_GUIDES.find((guide) => guide.key === 'payables') ?? null
  if (pathname.startsWith('/receivables')) return APP_GUIDES.find((guide) => guide.key === 'receivables') ?? null
  if (pathname.startsWith('/customers')) return APP_GUIDES.find((guide) => guide.key === 'customers') ?? null
  if (pathname.startsWith('/transactions')) return APP_GUIDES.find((guide) => guide.key === 'transactions') ?? null
  return null
}
