import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

function stripN8nBrowserHeaders(proxy: { on: (event: 'proxyRes', handler: (proxyRes: { headers: Record<string, unknown> }) => void) => void }) {
  proxy.on('proxyRes', (proxyRes) => {
    // n8n 공개 실행면의 쿠키/CORS 헤더가 127.0.0.1 개발 서버에 누적되면
    // 브라우저가 다음 /crm-proxy 요청에 큰 Cookie 헤더를 붙여 Vite 431 오류가 날 수 있다.
    delete proxyRes.headers['set-cookie']
    delete proxyRes.headers['access-control-allow-origin']
  })
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // n8n Webhook CORS 우회: /crm-proxy → https://n8n.pressco21.com/webhook/crm-proxy
    proxy: {
      '/crm-proxy': {
        target: 'https://n8n.pressco21.com',
        changeOrigin: true,
        rewrite: () => '/webhook/crm-proxy',
        configure: stripN8nBrowserHeaders,
      },
      '/crm-payment-reminder': {
        target: 'https://n8n.pressco21.com',
        changeOrigin: true,
        rewrite: () => '/webhook/crm-payment-reminder',
        configure: stripN8nBrowserHeaders,
      },
    },
  },
  build: {
    // 프로덕션 빌드 시 console.* / debugger 제거 (security-hardening-expert)
    minify: 'esbuild',
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
})
