// n8n 프록시 설정 (NocoDB 토큰은 n8n Credential에만 존재)
// VITE_N8N_WEBHOOK_URL, VITE_CRM_API_KEY: .env.local에서 관리
// NocoDB Model ID는 n8n 프록시 내부에서만 사용 (프론트엔드 불필요)

// 테이블 논리명 (api.ts에서 프록시에 전달)
export const TABLE_NAMES = {
  customers: 'customers',
  products: 'products',
  invoices: 'invoices',
  items: 'items',
  suppliers: 'suppliers',
  txHistory: 'txHistory',
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
