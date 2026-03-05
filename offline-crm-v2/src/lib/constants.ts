// NocoDB 설정
export const NOCODB_BASE_URL = import.meta.env.VITE_NOCODB_URL || 'https://nocodb.pressco21.com'
export const NOCODB_TOKEN = import.meta.env.VITE_NOCODB_TOKEN || ''
export const NOCODB_PROJECT_ID = 'pu0mwk97kac8a5p'

// NocoDB 테이블 ID
export const TABLE_IDS = {
  customers: 'mffgxkftaeppyk0',
  products: 'mioztktmluobmmo',
  invoices: 'ml81i9mcuw0pjzk',
  items: 'mxwgdlj56p9joxo',
  suppliers: 'mw6y9qyzex7lix9',
  txHistory: 'tbl_tx_history', // 신규 생성 후 업데이트
} as const

// 회원 등급 배지 색상
export const GRADE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  MEMBER:     { bg: '#a8b5a0', text: '#ffffff', label: '회원' },
  INSTRUCTOR: { bg: '#7d9675', text: '#ffffff', label: '인스트럭터' },
  PARTNERS:   { bg: '#5e8a6e', text: '#ffffff', label: '파트너스' },
  VIP:        { bg: '#b89b5e', text: '#ffffff', label: 'VIP' },
  AMBASSADOR: { bg: '#8b6fae', text: '#ffffff', label: '엠버서더' },
}

// 고객 상태
export const STATUS_COLORS: Record<string, { bg: string; label: string }> = {
  ACTIVE:   { bg: '#22c55e', label: '활성' },
  DORMANT:  { bg: '#eab308', label: '휴면' },
  CHURNED:  { bg: '#ef4444', label: '이탈' },
  ARCHIVED: { bg: '#94a3b8', label: '보관' },
}

// 고객 유형
export const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL:  '개인',
  SCHOOL_ELEM: '초등학교',
  SCHOOL_MID:  '중학교',
  SCHOOL_HIGH: '고등학교',
  SCHOOL_UNIV: '대학교',
  CENTER:      '센터/복지관',
  ASSOC:       '협회',
  ACADEMY:     '공방/학원',
  ONLINE:      '온라인',
  OTHER:       '기타',
}

// 브랜드 색상
export const BRAND_COLORS = {
  primary:  '#7d9675',
  sidebar:  '#1a2e1f',
  gold:     '#b89b5e',
  purple:   '#8b6fae',
}
