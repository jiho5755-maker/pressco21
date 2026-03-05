import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Customers } from '@/pages/Customers'
import { CustomerDetail } from '@/pages/CustomerDetail'
import { Invoices } from '@/pages/Invoices'
import { Products } from '@/pages/Products'
import { Suppliers } from '@/pages/Suppliers'
import { Transactions } from '@/pages/Transactions'
import { Receivables } from '@/pages/Receivables'

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
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
