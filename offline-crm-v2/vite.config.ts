import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

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
      },
    },
  },
})
