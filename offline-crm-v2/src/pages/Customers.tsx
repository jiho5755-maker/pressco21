import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getCustomers } from '@/lib/api'
import { STATUS_COLORS, CUSTOMER_TYPE_LABELS } from '@/lib/constants'

const PAGE_SIZE = 25

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function Customers() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 400)

  // 필터 변경 시 첫 페이지로
  useEffect(() => { setPage(1) }, [debouncedSearch, typeFilter, statusFilter])

  const params: Record<string, string | number> = {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    sort: '-last_order_date',
  }

  const conditions: string[] = []
  if (debouncedSearch) conditions.push(`(name,like,%${debouncedSearch}%)`)
  if (typeFilter !== 'ALL') conditions.push(`(customer_type,eq,${typeFilter})`)
  if (statusFilter !== 'ALL') conditions.push(`(customer_status,eq,${statusFilter})`)
  if (conditions.length > 0) {
    params.where = conditions.length === 1 ? conditions[0] : conditions.join('~and')
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => getCustomers(params),
  })

  const totalRows = data?.pageInfo?.totalRows ?? 0
  const totalPages = Math.ceil(totalRows / PAGE_SIZE)
  const customers = data?.list ?? []

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
        {(typeFilter !== 'ALL' || statusFilter !== 'ALL' || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(''); setTypeFilter('ALL'); setStatusFilter('ALL') }}
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
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">최종거래일</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">총매출</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">미수금</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-muted-foreground">
                  불러오는 중...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-red-500">
                  데이터를 불러오지 못했습니다.
                </td>
              </tr>
            )}
            {!isLoading && !isError && customers.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-muted-foreground">
                  검색 결과가 없습니다.
                </td>
              </tr>
            )}
            {customers.map((c) => (
              <tr
                key={c.Id}
                className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/customers/${c.Id}`)}
              >
                <td className="px-4 py-3 font-medium">{c.name ?? '-'}</td>
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
                <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                  {c.last_order_date ? c.last_order_date.slice(0, 10) : '-'}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {c.total_order_amount != null
                    ? `${c.total_order_amount.toLocaleString()}원`
                    : '-'}
                </td>
                <td className="px-4 py-3 text-right">
                  {c.outstanding_balance != null && c.outstanding_balance > 0 ? (
                    <span className="text-red-600 font-medium text-xs">
                      {c.outstanding_balance.toLocaleString()}원
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
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
    </div>
  )
}
