import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { Layout } from '@/components/layout/Layout'
import { preloadPrintImages } from '@/lib/print'
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
  // 앱 시작 시 정적 로고/도장 이미지를 data URL로 프리로드 (blob URL iframe에서도 사용 가능)
  useEffect(() => { void preloadPrintImages() }, [])

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
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  )
}

export default App
