// API 엔드포인트 설정
// n8n을 API Gateway로 사용 — 메이크샵 API키는 서버에만 보관

const N8N_BASE = 'https://n8n.pressco21.com/webhook';

export const API = {
  auth: {
    login: N8N_BASE + '/app/auth/login',
  },
  products: {
    list: N8N_BASE + '/app/products',
    detail: N8N_BASE + '/app/products/detail',
    categories: N8N_BASE + '/app/products/categories',
  },
  orders: {
    list: N8N_BASE + '/app/orders',
  },
  payment: {
    checkout: 'https://foreverlove.co.kr/shop/order.html',
    callbackScheme: 'pressco21://order/complete',
  },
  chat: {
    send: 'https://n8n.pressco21.com/webhook/f050-chat',
  },
  images: {
    base: 'https://foreverlove.co.kr',
  },
} as const;
