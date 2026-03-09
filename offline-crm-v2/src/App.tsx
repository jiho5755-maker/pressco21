import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster, toast } from 'sonner'
import { Layout } from '@/components/layout/Layout'
import { preloadPrintImages, saveCompanyInfo } from '@/lib/print'
import { getSettings } from '@/lib/api'
import { Dashboard } from '@/pages/Dashboard'
import { Customers } from '@/pages/Customers'
import { CustomerDetail } from '@/pages/CustomerDetail'
import { Invoices } from '@/pages/Invoices'
import { Products } from '@/pages/Products'
import { Suppliers } from '@/pages/Suppliers'
import { Transactions } from '@/pages/Transactions'
import { Receivables } from '@/pages/Receivables'
import { Settings } from '@/pages/Settings'
import { Calendar } from '@/pages/Calendar'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:           5 * 60_000,
      gcTime:             30 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect:    true,
      retry:                 1,
    },
  },
})

function App() {
  // 앱 시작 시: NocoDB 설정 → localStorage 캐시 갱신 → 인쇄 이미지 프리로드
  useEffect(() => {
    const SETTINGS_KEY = 'pressco21-crm-settings'
    getSettings().then((server) => {
      if (server) {
        // NocoDB 자동 필드 제거 후 localStorage 캐시 갱신
        const { Id, CreatedAt, UpdatedAt, nc_order, ...rest } = server as Record<string, unknown>
        let merged: Record<string, unknown> = {}
        try { const s = localStorage.getItem(SETTINGS_KEY); if (s) merged = JSON.parse(s) } catch {}
        const combined = { ...merged, ...rest }
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(combined))
        saveCompanyInfo(combined as Parameters<typeof saveCompanyInfo>[0])
      }
    }).catch(() => {
      // 네트워크 오류 → localStorage 캐시 fallback (무시)
    }).finally(() => {
      void preloadPrintImages()
    })
  }, [])

  useEffect(() => {
    function handleToastClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null
      if (!target) return
      const toastElement = target.closest('[data-sonner-toast]')
      if (!toastElement) return
      if (target.closest('[data-button], [data-close-button], button, a, input, select, textarea, label')) return
      toast.dismiss()
    }

    document.addEventListener('click', handleToastClick)
    return () => document.removeEventListener('click', handleToastClick)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="products" element={<Products />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="receivables" element={<Receivables />} />
            <Route path="settings" element={<Settings />} />
            <Route path="calendar" element={<Calendar />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster
        richColors
        position="bottom-right"
        toastOptions={{
          className: 'cursor-pointer',
        }}
      />
    </QueryClientProvider>
  )
}

export default App
