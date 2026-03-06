import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, ChevronLeft, ChevronRight, Download, Printer, Copy, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { InvoiceDialog } from '@/components/InvoiceDialog'
import { getInvoices, getItems, deleteInvoice, bulkDeleteItems, recalcCustomerStats, sanitizeSearchTerm } from '@/lib/api'
import type { Invoice } from '@/lib/api'
import { exportInvoices } from '@/lib/excel'
import { printDuplexViaIframe } from '@/lib/print'

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
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined)
  const [copySourceId, setCopySourceId] = useState<number | undefined>(undefined)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const debouncedSearch = useDebounce(search, 400)
  useEffect(() => setPage(1), [debouncedSearch, statusFilter])

  const params: Record<string, string | number> = {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    sort: '-invoice_date',
  }
  const conditions: string[] = []
  if (debouncedSearch) {
    const safe = sanitizeSearchTerm(debouncedSearch)
    conditions.push(`(customer_name,like,%${safe}%)`)
  }
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
    setCopySourceId(undefined)
    setDialogOpen(true)
  }

  function openEdit(id: number) {
    setSelectedId(id)
    setCopySourceId(undefined)
    setDialogOpen(true)
  }

  function openCopy(id: number) {
    setSelectedId(undefined)
    setCopySourceId(id)
    setDialogOpen(true)
  }

  async function handleDelete(inv: Invoice) {
    if (!confirm('이 명세표를 삭제하시겠습니까? 삭제 후에는 되돌릴 수 없습니다.')) return
    setDeletingId(inv.Id)
    try {
      // 라인아이템 먼저 삭제
      const itemsData = await getItems(inv.Id)
      const itemIds = itemsData.list.map((it) => it.Id)
      if (itemIds.length > 0) await bulkDeleteItems(itemIds)
      await deleteInvoice(inv.Id)

      // 잔액 재계산
      if (inv.customer_id) {
        try { await recalcCustomerStats(inv.customer_id as number) } catch {}
      }

      toast.success('명세표가 삭제되었습니다')
      // 삭제된 명세표 캐시 제거
      qc.removeQueries({ queryKey: ['invoice', inv.Id] })
      qc.removeQueries({ queryKey: ['invoiceItems', inv.Id] })
      // 관련 목록 전체 갱신
      void refetch()
      qc.invalidateQueries({ queryKey: ['invoices-customer'] })
      qc.invalidateQueries({ queryKey: ['receivables'] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['transactions-crm'] })
      // 대시보드 + 기간 리포트 전체 갱신
      qc.invalidateQueries({
        predicate: (q) => {
          const k = q.queryKey[0]
          return typeof k === 'string' && (k.startsWith('dash-') || k.startsWith('period-'))
        },
      })
    } catch {
      toast.error('삭제하지 못했습니다. 잠시 후 다시 시도해주세요')
    } finally {
      setDeletingId(null)
    }
  }

  async function handlePrint(inv: Invoice) {
    try {
      const itemsData = await getItems(inv.Id)
      printDuplexViaIframe(
        {
          invoice_no: inv.invoice_no,
          invoice_date: inv.invoice_date,
          receipt_type: inv.receipt_type,
          customer_name: inv.customer_name,
          customer_phone: inv.customer_phone as string,
          customer_address: inv.customer_address as string,
          supply_amount: inv.supply_amount,
          tax_amount: inv.tax_amount,
          total_amount: inv.total_amount,
          previous_balance: inv.previous_balance,
          paid_amount: inv.paid_amount,
          memo: inv.memo,
        },
        itemsData.list.map((it) => ({
          product_name: it.product_name,
          unit: it.unit,
          quantity: it.quantity,
          unit_price: it.unit_price,
          supply_amount: it.supply_amount,
          tax_amount: it.tax_amount,
        })),
      )
    } catch {
      toast.error('인쇄 데이터를 불러오지 못했습니다')
    }
  }

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">거래명세표</h2>
          <p className="text-sm text-muted-foreground mt-1">
            이번 달 {totalRows.toLocaleString()}건
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
              <th className="w-32" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted-foreground">
                  불러오는 중...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-red-500">
                  데이터를 불러오지 못했습니다.
                </td>
              </tr>
            )}
            {!isLoading && !isError && invoices.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted-foreground">
                  발행된 명세표가 없습니다. 새 명세표를 만들어보세요.
                </td>
              </tr>
            )}
            {invoices.map((inv) => {
              const st = STATUS_LABEL[inv.payment_status ?? inv.status ?? '']
              const isDeleting = deletingId === inv.Id
              return (
                <tr
                  key={inv.Id}
                  className="border-b last:border-b-0 hover:bg-gray-50 transition-colors"
                >
                  <td
                    className="px-4 py-3 font-mono text-xs text-muted-foreground cursor-pointer"
                    onClick={() => openEdit(inv.Id)}
                  >
                    {inv.invoice_no ?? '-'}
                  </td>
                  <td
                    className="px-4 py-3 font-medium cursor-pointer"
                    onClick={() => openEdit(inv.Id)}
                  >
                    {inv.customer_name ?? '-'}
                  </td>
                  <td
                    className="px-4 py-3 text-right text-muted-foreground text-xs cursor-pointer"
                    onClick={() => openEdit(inv.Id)}
                  >
                    {inv.invoice_date?.slice(0, 10) ?? '-'}
                  </td>
                  <td
                    className="px-4 py-3 text-right cursor-pointer"
                    onClick={() => openEdit(inv.Id)}
                  >
                    {inv.supply_amount != null ? `${inv.supply_amount.toLocaleString()}원` : '-'}
                  </td>
                  <td
                    className="px-4 py-3 text-right font-medium cursor-pointer"
                    onClick={() => openEdit(inv.Id)}
                  >
                    {inv.total_amount != null ? `${inv.total_amount.toLocaleString()}원` : '-'}
                  </td>
                  <td
                    className="px-4 py-3 text-right text-xs text-muted-foreground cursor-pointer"
                    onClick={() => openEdit(inv.Id)}
                  >
                    {inv.paid_amount != null && inv.paid_amount > 0
                      ? `${inv.paid_amount.toLocaleString()}원`
                      : '-'}
                  </td>
                  <td
                    className="px-4 py-3 cursor-pointer"
                    onClick={() => openEdit(inv.Id)}
                  >
                    {st ? (
                      <span className={`text-xs font-medium ${st.cls}`}>{st.label}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  {/* 인라인 액션 버튼 */}
                  <td className="px-2 py-3">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        title="인쇄"
                        onClick={(e) => { e.stopPropagation(); void handlePrint(inv) }}
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        title="복사"
                        onClick={(e) => { e.stopPropagation(); openCopy(inv.Id) }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                        title="삭제"
                        disabled={isDeleting}
                        onClick={(e) => { e.stopPropagation(); void handleDelete(inv) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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
        copySourceId={copySourceId}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false)
          void refetch()
        }}
      />
    </div>
  )
}
