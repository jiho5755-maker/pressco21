import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, ChevronLeft, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { deleteCustomer, getAllInvoices, getCustomers, sanitizeSearchTerm } from '@/lib/api'
import type { Customer, Invoice } from '@/lib/api'
import { STATUS_COLORS, CUSTOMER_TYPE_LABELS, GRADE_COLORS } from '@/lib/constants'
import { CustomerDialog } from '@/components/CustomerDialog'
import { getLegacyCustomerSnapshots } from '@/lib/legacySnapshots'
import { buildCustomerReceivableLedger, buildResolvedReceivableInvoices } from '@/lib/receivables'

const PAGE_SIZE = 25

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function normalizeLookup(value?: string | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function extractAliasRoot(value?: string | null): string {
  return normalizeLookup((value ?? '').split('(')[0])
}

function resolveSplitInvoiceAliases(customer: Customer, invoices: Invoice[]): string[] {
  const customerName = normalizeLookup(customer.name)
  const customerBookName = normalizeLookup(customer.book_name)

  if (!customerName && !customerBookName) return []

  const aliases = new Set<string>()
  for (const invoice of invoices) {
    const rawInvoiceName = invoice.customer_name?.trim()
    if (!rawInvoiceName) continue
    if (rawInvoiceName === customer.name?.trim() || rawInvoiceName === customer.book_name?.trim()) continue

    const invoiceName = normalizeLookup(rawInvoiceName)
    const invoiceRoot = extractAliasRoot(rawInvoiceName)
    const linkedById = invoice.customer_id === customer.Id
    const linkedByName =
      Boolean(customerName) &&
      (invoiceName === customerName || invoiceRoot === customerName || invoiceName.includes(customerName))
    const linkedByBookName =
      Boolean(customerBookName) &&
      (customerBookName.includes(invoiceName) || customerBookName.includes(invoiceRoot))

    if (linkedById || linkedByName || linkedByBookName) {
      aliases.add(rawInvoiceName)
    }
  }

  return Array.from(aliases)
}

export function Customers() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [gradeFilter, setGradeFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const debouncedSearch = useDebounce(search, 400)

  // 필터 변경 시 첫 페이지로
  useEffect(() => { setPage(1) }, [debouncedSearch, typeFilter, statusFilter, gradeFilter])

  const params: Record<string, string | number> = {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    sort: '-last_order_date',
  }

  const conditions: string[] = []
  if (debouncedSearch) {
    const safe = sanitizeSearchTerm(debouncedSearch)
    conditions.push(`(name,like,%${safe}%)~or(book_name,like,%${safe}%)~or(mobile,like,%${safe}%)~or(phone1,like,%${safe}%)~or(business_no,like,%${safe}%)`)
  }
  if (typeFilter !== 'ALL') conditions.push(`(customer_type,eq,${typeFilter})`)
  if (statusFilter !== 'ALL') conditions.push(`(customer_status,eq,${statusFilter})`)
  if (gradeFilter === 'AMBASSADOR') {
    conditions.push(`(is_ambassador,eq,1)`)
  } else if (gradeFilter !== 'ALL') {
    conditions.push(`(member_grade,eq,${gradeFilter})`)
  }
  if (conditions.length > 0) {
    params.where = conditions.length === 1 ? conditions[0] : conditions.join('~and')
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => getCustomers(params),
    staleTime: 10 * 60_000,
    placeholderData: (prev) => prev,
  })

  const totalRows = data?.pageInfo?.totalRows ?? 0
  const totalPages = Math.ceil(totalRows / PAGE_SIZE)
  const customers = data?.list ?? []

  const { data: invoiceAliases = [] } = useQuery({
    queryKey: ['customer-split-invoice-aliases'],
    queryFn: () => getAllInvoices({
      where: '(payment_status,eq,unpaid)~or(payment_status,eq,partial)',
      fields: 'Id,customer_id,customer_name,invoice_date,total_amount,paid_amount,payment_status',
    }),
    staleTime: 10 * 60_000,
  })
  const { data: legacySnapshots } = useQuery({
    queryKey: ['customer-legacy-snapshots'],
    queryFn: getLegacyCustomerSnapshots,
    staleTime: Infinity,
  })

  const splitAliasMap = useMemo(() => {
    return new Map(
      customers.map((customer) => [customer.Id, resolveSplitInvoiceAliases(customer, invoiceAliases)] as const),
    )
  }, [customers, invoiceAliases])

  const receivableAmountMap = useMemo(() => {
    if (!legacySnapshots) return new Map<number, number>()
    const asOfDate = new Date().toISOString().slice(0, 10)
    const resolvedInvoices = buildResolvedReceivableInvoices(invoiceAliases, customers, asOfDate)
    const summary = buildCustomerReceivableLedger(customers, resolvedInvoices, legacySnapshots)
    return new Map(summary.map((item) => [item.customerId, item.totalRemaining]))
  }, [customers, invoiceAliases, legacySnapshots])

  async function handleDelete(customer: Customer) {
    if (!confirm(`"${customer.name ?? '이 고객'}"을(를) 삭제하시겠습니까?`)) return
    setDeletingId(customer.Id)
    try {
      await deleteCustomer(customer.Id)
      toast.success('고객이 삭제되었습니다')
      await qc.invalidateQueries({ queryKey: ['customers'] })
    } catch (error) {
      console.error(error)
      toast.error('고객을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">고객 관리</h2>
          <p className="text-sm text-muted-foreground mt-1">
            총 {totalRows.toLocaleString()}명
          </p>
        </div>
        <Button
          onClick={() => { setSelectedCustomer(null); setDialogOpen(true) }}
          className="bg-[#7d9675] hover:bg-[#6a8462] text-white gap-1"
        >
          <Plus className="h-4 w-4" />
          새 고객
        </Button>
      </div>

      {/* 필터 */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="거래처명/얼마에요 구분명 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="고객 유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">모든 유형</SelectItem>
            {Object.entries(CUSTOMER_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">모든 상태</SelectItem>
            <SelectItem value="ACTIVE">활성</SelectItem>
            <SelectItem value="DORMANT">휴면</SelectItem>
            <SelectItem value="CHURNED">이탈</SelectItem>
          </SelectContent>
        </Select>
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="등급" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">모든 등급</SelectItem>
            {Object.entries(GRADE_COLORS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(typeFilter !== 'ALL' || statusFilter !== 'ALL' || gradeFilter !== 'ALL' || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(''); setTypeFilter('ALL'); setStatusFilter('ALL'); setGradeFilter('ALL') }}
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
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">거래처명</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">유형</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">상태</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">등급</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">최종거래일</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">총매출</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">미수금</th>
              <th className="w-28" />
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
            {!isLoading && !isError && customers.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted-foreground">
                  검색 결과가 없습니다.
                </td>
              </tr>
            )}
            {customers.map((c) => (
              (() => {
                const splitAliases = splitAliasMap.get(c.Id) ?? []
                return (
                  <tr
                    key={c.Id}
                    className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/customers/${c.Id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{c.name ?? '-'}</div>
                      {c.book_name && c.book_name !== c.name && (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          얼마에요 구분명: {c.book_name}
                        </div>
                      )}
                      {splitAliases.map((alias) => (
                        <div key={alias} className="mt-0.5 text-xs text-amber-700">
                          분리 거래명: {alias}
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {CUSTOMER_TYPE_LABELS[c.customer_type ?? ''] ?? c.customer_type ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      {c.customer_status && STATUS_COLORS[c.customer_status] ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: STATUS_COLORS[c.customer_status].bg }}
                        >
                          {STATUS_COLORS[c.customer_status].label}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const effectiveGrade = c.is_ambassador ? 'AMBASSADOR' : (c.member_grade ?? '')
                        return effectiveGrade && GRADE_COLORS[effectiveGrade] ? (
                          <span
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ backgroundColor: GRADE_COLORS[effectiveGrade].bg, color: GRADE_COLORS[effectiveGrade].text }}
                          >
                            {effectiveGrade === 'AMBASSADOR' && '★'}
                            {GRADE_COLORS[effectiveGrade].label}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                      {c.last_order_date ? c.last_order_date.slice(0, 10) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {c.total_order_amount != null
                        ? `${c.total_order_amount.toLocaleString()}원`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(receivableAmountMap.get(c.Id) ?? 0) > 0 ? (
                        <span className="text-red-600 font-medium text-xs">
                          {(receivableAmountMap.get(c.Id) ?? 0).toLocaleString()}원
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          title="수정"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedCustomer(c)
                            setDialogOpen(true)
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                          title="삭제"
                          disabled={deletingId === c.Id}
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleDelete(c)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })()
            ))}
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

      <CustomerDialog
        open={dialogOpen}
        customer={selectedCustomer}
        onClose={() => {
          setDialogOpen(false)
          setSelectedCustomer(null)
        }}
        onSaved={() => {
          setDialogOpen(false)
          setSelectedCustomer(null)
          void qc.invalidateQueries({ queryKey: ['customers'] })
        }}
      />
    </div>
  )
}
