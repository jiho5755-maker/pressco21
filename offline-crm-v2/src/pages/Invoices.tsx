import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { InvoiceDialog } from '@/components/InvoiceDialog'
import { getInvoices } from '@/lib/api'
import { exportInvoices } from '@/lib/excel'

const PAGE_SIZE = 25

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState<T>(value)
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return dv
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  paid:    { label: '완납', cls: 'text-green-600' },
  partial: { label: '부분수금', cls: 'text-amber-600' },
  unpaid:  { label: '미수금', cls: 'text-red-600' },
}

export function Invoices() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined)

  const debouncedSearch = useDebounce(search, 400)
  useEffect(() => setPage(1), [debouncedSearch, statusFilter])

  const params: Record<string, string | number> = {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    sort: '-invoice_date',
  }
  const conditions: string[] = []
  if (debouncedSearch) conditions.push(`(customer_name,like,%${debouncedSearch}%)`)
  if (statusFilter !== 'ALL') conditions.push(`(payment_status,eq,${statusFilter})`)
  if (conditions.length > 0) {
    params.where = conditions.length === 1 ? conditions[0] : conditions.join('~and')
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['invoices', params],
    queryFn: () => getInvoices(params),
  })

  const totalRows = data?.pageInfo?.totalRows ?? 0
  const totalPages = Math.ceil(totalRows / PAGE_SIZE)
  const invoices = data?.list ?? []

  function openCreate() {
    setSelectedId(undefined)
    setDialogOpen(true)
  }

  function openEdit(id: number) {
    setSelectedId(id)
    setDialogOpen(true)
  }

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">거래명세표</h2>
          <p className="text-sm text-muted-foreground mt-1">
            총 {totalRows.toLocaleString()}건
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportInvoices(invoices)}
            className="gap-1"
          >
            <Download className="h-4 w-4" />
            엑셀
          </Button>
          <Button
            onClick={openCreate}
            className="bg-[#7d9675] hover:bg-[#6a8462] text-white gap-1"
          >
            <Plus className="h-4 w-4" />
            새 명세표
          </Button>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="거래처명 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="수금 상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">모든 상태</SelectItem>
            <SelectItem value="paid">완납</SelectItem>
            <SelectItem value="partial">부분수금</SelectItem>
            <SelectItem value="unpaid">미수금</SelectItem>
          </SelectContent>
        </Select>
        {(statusFilter !== 'ALL' || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(''); setStatusFilter('ALL') }}
          >
            초기화
          </Button>
        )}
      </div>

      {/* 테이블 */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">발행번호</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">거래처</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">발행일</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">공급가액</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">합계금액</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">입금</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">수금</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  불러오는 중...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-red-500">
                  데이터를 불러오지 못했습니다.
                </td>
              </tr>
            )}
            {!isLoading && !isError && invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  명세표가 없습니다.
                </td>
              </tr>
            )}
            {invoices.map((inv) => {
              const st = STATUS_LABEL[inv.payment_status ?? inv.status ?? '']
              return (
                <tr
                  key={inv.Id}
                  className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => openEdit(inv.Id)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {inv.invoice_no ?? '-'}
                  </td>
                  <td className="px-4 py-3 font-medium">{inv.customer_name ?? '-'}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                    {inv.invoice_date?.slice(0, 10) ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {inv.supply_amount != null
                      ? `${inv.supply_amount.toLocaleString()}원`
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {inv.total_amount != null
                      ? `${inv.total_amount.toLocaleString()}원`
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {inv.paid_amount != null && inv.paid_amount > 0
                      ? `${inv.paid_amount.toLocaleString()}원`
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {st ? (
                      <span className={`text-xs font-medium ${st.cls}`}>{st.label}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–
            {Math.min(page * PAGE_SIZE, totalRows).toLocaleString()} / {totalRows.toLocaleString()}건
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-1 min-w-[60px] text-center">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 명세표 다이얼로그 */}
      <InvoiceDialog
        open={dialogOpen}
        invoiceId={selectedId}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false)
          void refetch()
        }}
      />
    </div>
  )
}
