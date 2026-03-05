import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getTxHistory, sanitizeSearchTerm } from '@/lib/api'

const PAGE_SIZE = 50

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState<T>(value)
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return dv
}

// 거래 유형별 배지 색상
const TX_TYPE_STYLE: Record<string, { bg: string; text: string }> = {
  출고: { bg: '#dbeafe', text: '#1d4ed8' },
  입금: { bg: '#dcfce7', text: '#15803d' },
  반입: { bg: '#fef3c7', text: '#b45309' },
  메모: { bg: '#f1f5f9', text: '#64748b' },
}

export function Transactions() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 400)
  useEffect(() => setPage(1), [debouncedSearch, typeFilter, dateFrom, dateTo])

  const params: Record<string, string | number> = {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    sort: '-tx_date',
  }

  const conditions: string[] = []
  if (debouncedSearch) {
    const safe = sanitizeSearchTerm(debouncedSearch)
    conditions.push(`(customer_name,like,%${safe}%)`)
  }
  if (typeFilter !== 'ALL') conditions.push(`(tx_type,eq,${typeFilter})`)
  if (dateFrom) conditions.push(`(tx_date,gte,${dateFrom})`)
  if (dateTo) conditions.push(`(tx_date,lte,${dateTo})`)
  if (conditions.length > 0) {
    params.where = conditions.length === 1 ? conditions[0] : conditions.join('~and')
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['transactions', params],
    queryFn: () => getTxHistory(params),
    staleTime: 10 * 60_000,
    placeholderData: (prev) => prev,
  })

  const totalRows = data?.pageInfo?.totalRows ?? 0
  const totalPages = Math.ceil(totalRows / PAGE_SIZE)
  const txList = data?.list ?? []

  function resetFilters() {
    setSearch('')
    setTypeFilter('ALL')
    setDateFrom('')
    setDateTo('')
  }

  const hasFilter = search || typeFilter !== 'ALL' || dateFrom || dateTo

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">거래 내역</h2>
          <p className="text-sm text-muted-foreground mt-1">
            총 {totalRows.toLocaleString()}건
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
          <SelectTrigger className="w-28">
            <SelectValue placeholder="유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">모든 유형</SelectItem>
            <SelectItem value="출고">출고</SelectItem>
            <SelectItem value="입금">입금</SelectItem>
            <SelectItem value="반입">반입</SelectItem>
            <SelectItem value="메모">메모</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-36"
          title="시작일"
        />
        <span className="flex items-center text-muted-foreground text-sm">~</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-36"
          title="종료일"
        />
        {hasFilter && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            초기화
          </Button>
        )}
      </div>

      {/* 테이블 */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">날짜</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">거래처</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">유형</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">금액</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">세액</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">전표번호</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">비고</th>
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
            {!isLoading && !isError && txList.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  조건에 맞는 거래내역이 없습니다. 검색어나 필터를 변경해보세요.
                </td>
              </tr>
            )}
            {txList.map((tx) => {
              const style = TX_TYPE_STYLE[tx.tx_type ?? ''] ?? { bg: '#f1f5f9', text: '#64748b' }
              return (
                <tr key={tx.Id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                    {tx.tx_date?.slice(0, 10) ?? '-'}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{tx.customer_name ?? '-'}</td>
                  <td className="px-4 py-2.5">
                    {tx.tx_type && (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: style.bg, color: style.text }}
                      >
                        {tx.tx_type}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {tx.amount != null ? `${tx.amount.toLocaleString()}원` : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground text-xs">
                    {tx.tax != null && tx.tax > 0 ? `${tx.tax.toLocaleString()}원` : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                    {tx.slip_no ?? '-'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {tx.memo ?? '-'}
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
    </div>
  )
}
