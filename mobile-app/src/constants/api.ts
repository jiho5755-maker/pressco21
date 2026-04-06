// API 엔드포인트 설정
// n8n을 API Gateway로 사용 — 메이크샵 API키는 서버에만 보관

const N8N_BASE = 'https://n8n.pressco21.com/webhook';

export const API = {
  // 인증
  auth: {
    login: `\${N8N_BASE}/app/auth/login`,
    refresh: `\${N8N_BASE}/app/auth/refresh`,
    register: `\${N8N_BASE}/app/auth/register`,
  },

  // 상품 (NocoDB 캐시 경유)
  products: {
    list: `\${N8N_BASE}/app/products`,
    detail: (id: string) => `\${N8N_BASE}/app/products/\${id}`,
    search: `\${N8N_BASE}/app/products/search`,
    categories: `\${N8N_BASE}/app/products/categories`,
  },

  // 주문 (메이크샵 프록시)
  orders: {
    list: `\${N8N_BASE}/app/orders`,
    detail: (id: string) => `\${N8N_BASE}/app/orders/\${id}`,
  },

  // 장바구니 (로컬 + 동기화)
  cart: {
    sync: `\${N8N_BASE}/app/cart/sync`,
  },

  // 파트너 (NocoDB 직접)
  partner: {
    dashboard: `\${N8N_BASE}/app/partner/dashboard`,
    classes: `\${N8N_BASE}/app/partner/classes`,
    orders: `\${N8N_BASE}/app/partner/orders`,
  },

  // 푸시 알림
  push: {
    register: `\${N8N_BASE}/app/push/register`,
    preferences: `\${N8N_BASE}/app/push/preferences`,
  },

  // AI 챗봇 (기존 F050 재사용)
  chat: {
    send: 'https://n8n.pressco21.com/webhook/f050-chat',
    feedback: 'https://n8n.pressco21.com/webhook/f050-feedback',
  },

  // 메이크샵 결제 (WebView용 URL)
  payment: {
    // 결제 시 WebView로 이동할 메이크샵 결제 페이지
    checkout: 'https://foreverlove.co.kr/shop/order.html',
    // 결제 완료 후 앱 딥링크 복귀
    callbackScheme: 'pressco21://order/complete',
  },

  // 이미지
  images: {
    base: 'https://img.pressco21.com',
  },
} as const;
