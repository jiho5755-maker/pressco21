import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getTxHistory, getInvoices, sanitizeSearchTerm } from '@/lib/api'
import type { TxHistory, Invoice } from '@/lib/api'

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
// CRM 명세표: '출고(CRM)' 유형으로 구분 표시
const TX_TYPE_STYLE: Record<string, { bg: string; text: string }> = {
  출고: { bg: '#dbeafe', text: '#1d4ed8' },
  '출고(CRM)': { bg: '#e0e7ff', text: '#4338ca' },  // CRM 명세표는 인디고 계열로 구분
  입금: { bg: '#dcfce7', text: '#15803d' },
  반입: { bg: '#fef3c7', text: '#b45309' },
  메모: { bg: '#f1f5f9', text: '#64748b' },
}

// CRM Invoice → 통합 행 형식으로 변환
interface UnifiedRow {
  id: string           // 'legacy-{Id}' or 'crm-{Id}'
  tx_date: string
  customer_name: string
  tx_type: string
  amount: number
  tax: number
  slip_no: string
  memo: string
  source: 'legacy' | 'crm'
}

function invoiceToRow(inv: Invoice): UnifiedRow {
  return {
    id: `crm-${inv.Id}`,
    tx_date: inv.invoice_date ?? '',
    customer_name: inv.customer_name ?? '',
    tx_type: '출고(CRM)',
    amount: inv.total_amount ?? 0,
    tax: inv.tax_amount ?? 0,
    slip_no: inv.invoice_no ?? '',
    memo: inv.memo ?? '',
    source: 'crm',
  }
}

function txToRow(tx: TxHistory): UnifiedRow {
  return {
    id: `legacy-${tx.Id}`,
    tx_date: tx.tx_date ?? '',
    customer_name: tx.customer_name ?? '',
    tx_type: tx.tx_type ?? '',
    amount: tx.amount ?? 0,
    tax: tx.tax ?? 0,
    slip_no: tx.slip_no ?? '',
    memo: tx.memo ?? '',
    source: 'legacy',
  }
}

export function Transactions() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 400)
  useEffect(() => setPage(1), [debouncedSearch, typeFilter, dateFrom, dateTo])

  // ── 레거시 거래내역 쿼리 (CRM 유형 필터 시 건너뜀)
  const legacyParams: Record<string, string | number> = {
    limit: 500,  // 레거시 최근 500건 (날짜순 정렬 후 CRM과 병합)
    sort: '-tx_date',
  }
  const legacyConditions: string[] = []
  if (debouncedSearch) {
    const safe = sanitizeSearchTerm(debouncedSearch)
    legacyConditions.push(`(customer_name,like,%${safe}%)`)
  }
  // CRM 필터 선택 시 레거시 조회 생략
  const skipLegacy = typeFilter === '출고(CRM)'
  if (!skipLegacy && typeFilter !== 'ALL') legacyConditions.push(`(tx_type,eq,${typeFilter})`)
  if (dateFrom) legacyConditions.push(`(tx_date,gte,${dateFrom})`)
  if (dateTo) legacyConditions.push(`(tx_date,lte,${dateTo})`)
  if (legacyConditions.length > 0) {
    legacyParams.where = legacyConditions.length === 1 ? legacyConditions[0] : legacyConditions.join('~and')
  }

  const { data: legacyData, isLoading: legacyLoading, isError: legacyError } = useQuery({
    queryKey: ['transactions', legacyParams],
    queryFn: () => getTxHistory(legacyParams),
    staleTime: 10 * 60_000,
    placeholderData: (prev) => prev,
    enabled: !skipLegacy,
  })

  // ── CRM 명세표 쿼리 (레거시 유형 필터 시 건너뜀)
  const skipCrm = ['입금', '반입', '메모'].includes(typeFilter)
  const crmParams: Record<string, string | number> = {
    limit: 500,  // CRM 최근 500건
    sort: '-invoice_date',
    fields: 'Id,invoice_date,customer_name,total_amount,tax_amount,invoice_no,memo',
  }
  const crmConditions: string[] = []
  if (debouncedSearch) {
    const safe = sanitizeSearchTerm(debouncedSearch)
    crmConditions.push(`(customer_name,like,%${safe}%)`)
  }
  if (dateFrom) crmConditions.push(`(invoice_date,gte,${dateFrom})`)
  if (dateTo) crmConditions.push(`(invoice_date,lte,${dateTo})`)
  if (crmConditions.length > 0) {
    crmParams.where = crmConditions.length === 1 ? crmConditions[0] : crmConditions.join('~and')
  }

  const { data: crmData, isLoading: crmLoading, isError: crmError } = useQuery({
    queryKey: ['transactions-crm', crmParams],
    queryFn: () => getInvoices(crmParams),
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
    enabled: !skipCrm,
  })

  // ── 병합 + 날짜 내림차순 정렬 + 클라이언트 페이지네이션
  const allRows = useMemo<UnifiedRow[]>(() => {
    const legacy = (legacyData?.list ?? []).map(txToRow)
    const crm = (crmData?.list ?? []).map(invoiceToRow)
    const merged = [...legacy, ...crm]
    merged.sort((a, b) => b.tx_date.localeCompare(a.tx_date))
    return merged
  }, [legacyData, crmData])

  // 서버 기준 실제 총 건수 (로드된 배열 길이가 아닌 DB 전체 건수)
  const serverLegacyTotal = legacyData?.pageInfo?.totalRows ?? 0
  const serverCrmTotal = crmData?.pageInfo?.totalRows ?? 0
  const serverTotalRows = serverLegacyTotal + serverCrmTotal

  // 클라이언트 페이지네이션은 로드된 데이터 범위 내에서만
  const loadedRows = allRows.length
  const totalPages = Math.max(1, Math.ceil(loadedRows / PAGE_SIZE))
  const pagedRows = allRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const isLoading = legacyLoading || crmLoading
  const isError = legacyError || crmError

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
            전체 {serverTotalRows.toLocaleString()}건
            <span className="ml-2 text-xs text-muted-foreground">
              (레거시 {serverLegacyTotal.toLocaleString()}건 + CRM {serverCrmTotal.toLocaleString()}건)
            </span>
            {loadedRows < serverTotalRows && (
              <span className="ml-1 text-xs text-amber-600">
                — 최근 {loadedRows.toLocaleString()}건 표시 중
              </span>
            )}
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
            <SelectValue placeholder="유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">모든 유형</SelectItem>
            <SelectItem value="출고">출고 (레거시)</SelectItem>
            <SelectItem value="출고(CRM)">출고 (CRM명세표)</SelectItem>
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

      {/* CRM 명세표 포함 안내 */}
      <div className="mb-3 text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
        레거시 거래내역(장부 원본)과 CRM 거래명세표를 날짜순으로 통합 표시합니다.
        CRM 명세표의 입금 내역은 미수금 관리 탭에서 확인하세요.
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
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">전표/발행번호</th>
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
            {!isLoading && !isError && pagedRows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  조건에 맞는 거래내역이 없습니다. 검색어나 필터를 변경해보세요.
                </td>
              </tr>
            )}
            {pagedRows.map((row) => {
              const style = TX_TYPE_STYLE[row.tx_type] ?? { bg: '#f1f5f9', text: '#64748b' }
              return (
                <tr
                  key={row.id}
                  className={`border-b last:border-b-0 hover:bg-gray-50 ${
                    row.source === 'crm' ? 'bg-indigo-50/30' : ''
                  }`}
                >
                  <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                    {row.tx_date.slice(0, 10) || '-'}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{row.customer_name || '-'}</td>
                  <td className="px-4 py-2.5">
                    {row.tx_type && (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: style.bg, color: style.text }}
                      >
                        {row.tx_type}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {row.amount > 0 ? `${row.amount.toLocaleString()}원` : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground text-xs">
                    {row.tax > 0 ? `${row.tax.toLocaleString()}원` : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                    {row.slip_no || '-'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {row.memo || '-'}
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
            {Math.min(page * PAGE_SIZE, loadedRows).toLocaleString()} / {loadedRows.toLocaleString()}건
            {loadedRows < serverTotalRows && (
              <span className="text-xs text-muted-foreground"> (전체 {serverTotalRows.toLocaleString()}건)</span>
            )}
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
