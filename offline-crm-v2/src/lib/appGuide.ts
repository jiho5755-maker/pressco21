export interface AppGuideStep {
  title: string
  description: string
}

export interface AppGuideScreen {
  key: string
  title: string
  summary: string
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
    key: 'receivables',
    title: '수금 관리 가이드',
    summary: '받을 돈을 확인하고 입금 처리, 취소, 고객 이동을 가장 빠르게 처리하는 화면입니다.',
    steps: [
      { title: '1. 먼저 오늘 처리할 고객을 찾기', description: '거래처명 필터로 고객을 좁히고, 기준일은 기본적으로 오늘 기준으로 둡니다.' },
      { title: '2. 돈의 출처 구분하기', description: '기존 장부 받을 돈은 얼마에요에서 넘어온 금액, 새 입력 받을 돈은 프로그램에서 새로 만든 명세표 미수입니다.' },
      { title: '3. 입금 확인 전 체크', description: '현재 작업 계정, 최대 입금 가능액, 남는 잔액을 보고 저장합니다. 잘못 넣은 건은 바로 취소할 수 있습니다.' },
      { title: '4. 처리 후 바로 확인하기', description: '고객 상세, 거래원장, 수금 이력이 함께 줄어드는지 확인하면 실수가 줄어듭니다.' },
    ],
  },
  {
    key: 'payables',
    title: '지급 관리 가이드',
    summary: '줄 돈을 확인하고 지급 처리, 취소, 거래 이력을 관리하는 화면입니다.',
    steps: [
      { title: '1. 줄 돈과 받을 돈을 구분하기', description: '이 화면의 핵심 숫자는 총 줄 돈입니다. 받을 돈 숫자는 참고용이고, 실제 처리 대상은 기존 장부 줄 돈 탭입니다.' },
      { title: '2. 지급 확인 전 체크', description: '지급액이 최대 지급 가능액을 넘지 않는지, 어떤 계정으로 기록되는지 보고 저장합니다.' },
      { title: '3. 지급 후 검증하기', description: '지급 관리 금액, 고객 상세 기존 장부 원본 탭, 거래원장의 지급 행이 같이 바뀌는지 확인합니다.' },
      { title: '4. 잘못 지급한 경우', description: '지급 이력에서 취소하면 줄 돈이 다시 복원되고, 거래원장 지급 행도 사라집니다.' },
    ],
  },
  {
    key: 'customers',
    title: '고객 관리 가이드',
    summary: '고객을 찾고, 상세에서 수금/지급/거래 흐름을 한 번에 확인하는 시작 화면입니다.',
    steps: [
      { title: '1. 고객 찾기', description: '거래처명과 기존 장부 장부명 둘 다 검색할 수 있으니, 분리 거래처도 그대로 찾을 수 있습니다.' },
      { title: '2. 고객 상세 활용', description: '상단의 수금 관리, 지급 관리, 거래/명세표 조회 버튼으로 바로 업무 화면으로 이동합니다.' },
      { title: '3. 기존 장부 원본 확인', description: '이월 잔액과 기존 장부 원본 필드를 같이 봐야 왜 지금 금액이 나왔는지 이해하기 쉽습니다.' },
    ],
  },
  {
    key: 'transactions',
    title: '거래원장 가이드',
    summary: '출고, 입금, 지급, 반입이 시간순으로 보이는 통합 원장입니다.',
    steps: [
      { title: '1. 고객과 기간으로 좁히기', description: '거래처명, 유형, 시작일/종료일로 범위를 좁혀서 필요한 흐름만 확인합니다.' },
      { title: '2. 행을 눌러 상세 보기', description: '거래 상세 팝업에서 고객 상세, 수금 관리, 지급 관리로 바로 이동할 수 있습니다.' },
      { title: '3. 지급/입금 확인', description: '지급은 줄 돈 처리, 입금은 받을 돈 처리입니다. 둘을 같은 원장에서 같이 보면 실수가 줄어듭니다.' },
    ],
  },
]

export function getGuideForPath(pathname: string): AppGuideScreen | null {
  if (pathname.startsWith('/payables')) return APP_GUIDES.find((guide) => guide.key === 'payables') ?? null
  if (pathname.startsWith('/receivables')) return APP_GUIDES.find((guide) => guide.key === 'receivables') ?? null
  if (pathname.startsWith('/customers')) return APP_GUIDES.find((guide) => guide.key === 'customers') ?? null
  if (pathname.startsWith('/transactions')) return APP_GUIDES.find((guide) => guide.key === 'transactions') ?? null
  return null
}
