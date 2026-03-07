import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  '출고(CRM)': { bg: '#e0e7ff', text: '#4338ca' },
  입금: { bg: '#dcfce7', text: '#15803d' },
  반입: { bg: '#fef3c7', text: '#b45309' },
  메모: { bg: '#f1f5f9', text: '#64748b' },
}

// CRM Invoice → 통합 행 형식으로 변환
interface UnifiedRow {
  id: string
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

type TabKey = 'all' | 'legacy' | 'crm'

/** 날짜 퀵 프리셋 */
function getPresetDates(key: string): [string, string] {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  switch (key) {
    case '3months': {
      const from = new Date(y, m - 3, now.getDate())
      return [fmt(from), fmt(now)]
    }
    case 'thisMonth':
      return [`${y}-${pad(m + 1)}-01`, fmt(now)]
    case 'lastMonth': {
      const from = new Date(y, m - 1, 1)
      const to = new Date(y, m, 0)
      return [fmt(from), fmt(to)]
    }
    case 'thisYear':
      return [`${y}-01-01`, fmt(now)]
    default:
      return ['', '']
  }
}

export function Transactions() {
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [page, setPage] = useState(1)

  // 전체 탭: 기본 최근 3개월
  const [defaultFrom, defaultTo] = getPresetDates('3months')
  const [dateFrom, setDateFrom] = useState(defaultFrom)
  const [dateTo, setDateTo] = useState(defaultTo)

  const debouncedSearch = useDebounce(search, 400)

  // 필터/검색 변경 시 1페이지로 리셋
  useEffect(() => setPage(1), [debouncedSearch, typeFilter, dateFrom, dateTo])

  // 탭 변경 시: page 리셋, typeFilter 리셋
  function handleTabChange(tab: string) {
    setActiveTab(tab as TabKey)
    setPage(1)
    setTypeFilter('ALL')
  }

  // ── skipLegacy / skipCrm 판별 ──
  const skipLegacy = activeTab === 'crm' || typeFilter === '출고(CRM)'
  const skipCrm = activeTab === 'legacy' || ['입금', '반입', '메모'].includes(typeFilter)

  const isServerPaginated = activeTab === 'legacy' || activeTab === 'crm'

  // ── 레거시 거래내역 쿼리 ──
  const legacyParams = useMemo(() => {
    const p: Record<string, string | number> = {
      limit: isServerPaginated && activeTab === 'legacy' ? PAGE_SIZE : 1000,
      sort: '-tx_date',
    }
    if (isServerPaginated && activeTab === 'legacy') {
      p.offset = (page - 1) * PAGE_SIZE
    }
    const conds: string[] = []
    if (debouncedSearch) {
      const safe = sanitizeSearchTerm(debouncedSearch)
      conds.push(`(customer_name,like,%${safe}%)`)
    }
    if (!skipLegacy && typeFilter !== 'ALL') conds.push(`(tx_type,eq,${typeFilter})`)
    if (dateFrom) conds.push(`(tx_date,gte,${dateFrom})`)
    if (dateTo) conds.push(`(tx_date,lte,${dateTo})`)
    if (conds.length > 0) {
      p.where = conds.length === 1 ? conds[0] : conds.join('~and')
    }
    return p
  }, [isServerPaginated, activeTab, page, debouncedSearch, skipLegacy, typeFilter, dateFrom, dateTo])

  const { data: legacyData, isLoading: legacyLoading, isError: legacyError } = useQuery({
    queryKey: ['transactions', legacyParams],
    queryFn: () => getTxHistory(legacyParams),
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
    enabled: !skipLegacy,
  })

  // ── CRM 명세표 쿼리 ──
  const crmParams = useMemo(() => {
    const p: Record<string, string | number> = {
      limit: isServerPaginated && activeTab === 'crm' ? PAGE_SIZE : 1000,
      sort: '-invoice_date',
      fields: 'Id,invoice_date,customer_name,total_amount,tax_amount,invoice_no,memo',
    }
    if (isServerPaginated && activeTab === 'crm') {
      p.offset = (page - 1) * PAGE_SIZE
    }
    const conds: string[] = []
    if (debouncedSearch) {
      const safe = sanitizeSearchTerm(debouncedSearch)
      conds.push(`(customer_name,like,%${safe}%)`)
    }
    if (dateFrom) conds.push(`(invoice_date,gte,${dateFrom})`)
    if (dateTo) conds.push(`(invoice_date,lte,${dateTo})`)
    if (conds.length > 0) {
      p.where = conds.length === 1 ? conds[0] : conds.join('~and')
    }
    return p
  }, [isServerPaginated, activeTab, page, debouncedSearch, dateFrom, dateTo])

  const { data: crmData, isLoading: crmLoading, isError: crmError } = useQuery({
    queryKey: ['transactions-crm', crmParams],
    queryFn: () => getInvoices(crmParams),
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
    enabled: !skipCrm,
  })

  // ── 서버 총 건수 ──
  const serverLegacyTotal = legacyData?.pageInfo?.totalRows ?? 0
  const serverCrmTotal = crmData?.pageInfo?.totalRows ?? 0

  // ── 행 데이터 + 페이지네이션 계산 ──
  const { rows, totalPages, totalDisplay, isTruncated } = useMemo(() => {
    if (isServerPaginated) {
      // 서버 페이지네이션: 한쪽 소스만 표시
      if (activeTab === 'legacy') {
        const list = (legacyData?.list ?? []).map(txToRow)
        return {
          rows: list,
          totalPages: Math.max(1, Math.ceil(serverLegacyTotal / PAGE_SIZE)),
          totalDisplay: serverLegacyTotal,
          isTruncated: false,
        }
      } else {
        const list = (crmData?.list ?? []).map(invoiceToRow)
        return {
          rows: list,
          totalPages: Math.max(1, Math.ceil(serverCrmTotal / PAGE_SIZE)),
          totalDisplay: serverCrmTotal,
          isTruncated: false,
        }
      }
    }

    // 전체 탭: 양쪽 병합 → 클라이언트 페이지네이션
    const legacy = (legacyData?.list ?? []).map(txToRow)
    const crm = (crmData?.list ?? []).map(invoiceToRow)
    const merged = [...legacy, ...crm]
    merged.sort((a, b) => b.tx_date.localeCompare(a.tx_date))
    const loadedCount = merged.length
    const truncated = (serverLegacyTotal > 1000 && !skipLegacy) || (serverCrmTotal > 1000 && !skipCrm)
    return {
      rows: merged.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      totalPages: Math.max(1, Math.ceil(loadedCount / PAGE_SIZE)),
      totalDisplay: loadedCount,
      isTruncated: truncated,
    }
  }, [isServerPaginated, activeTab, legacyData, crmData, serverLegacyTotal, serverCrmTotal, skipLegacy, skipCrm, page])

  const isLoading = (legacyLoading && !skipLegacy) || (crmLoading && !skipCrm)
  const isError = (legacyError && !skipLegacy) || (crmError && !skipCrm)

  function resetFilters() {
    setSearch('')
    setTypeFilter('ALL')
    const [df, dt] = getPresetDates('3months')
    setDateFrom(df)
    setDateTo(dt)
  }

  function applyPreset(key: string) {
    const [from, to] = getPresetDates(key)
    setDateFrom(from)
    setDateTo(to)
  }

  const hasFilter = search || typeFilter !== 'ALL' || dateFrom !== defaultFrom || dateTo !== defaultTo

  // ── 탭별 유형 필터 옵션 ──
  const typeOptions = useMemo(() => {
    if (activeTab === 'crm') return [] // CRM 탭: 유형 필터 불필요
    if (activeTab === 'legacy') {
      return [
        { value: 'ALL', label: '모든 유형' },
        { value: '출고', label: '출고' },
        { value: '입금', label: '입금' },
        { value: '반입', label: '반입' },
        { value: '메모', label: '메모' },
      ]
    }
    // 전체 탭
    return [
      { value: 'ALL', label: '모든 유형' },
      { value: '출고', label: '출고 (레거시)' },
      { value: '출고(CRM)', label: '출고 (CRM명세표)' },
      { value: '입금', label: '입금' },
      { value: '반입', label: '반입' },
      { value: '메모', label: '메모' },
    ]
  }, [activeTab])

  // ── 헤더 건수 표시 ──
  const headerCount = useMemo(() => {
    if (activeTab === 'legacy') return `레거시 ${serverLegacyTotal.toLocaleString()}건`
    if (activeTab === 'crm') return `CRM ${serverCrmTotal.toLocaleString()}건`
    const total = (skipLegacy ? 0 : serverLegacyTotal) + (skipCrm ? 0 : serverCrmTotal)
    return `전체 ${total.toLocaleString()}건`
  }, [activeTab, serverLegacyTotal, serverCrmTotal, skipLegacy, skipCrm])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">거래 내역</h2>
          <p className="text-sm text-muted-foreground mt-1">{headerCount}</p>
        </div>
      </div>

      {/* 탭 */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="legacy">레거시 거래</TabsTrigger>
          <TabsTrigger value="crm">CRM 명세표</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 퀵 프리셋 (전체 탭) */}
      {activeTab === 'all' && (
        <div className="flex gap-2 mb-3">
          <span className="text-xs text-muted-foreground flex items-center mr-1">기간:</span>
          {[
            { key: '3months', label: '최근 3개월' },
            { key: 'thisMonth', label: '이번달' },
            { key: 'lastMonth', label: '지난달' },
            { key: 'thisYear', label: '올해' },
          ].map(({ key, label }) => (
            <Button
              key={key}
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => applyPreset(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      )}

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
        {typeOptions.length > 0 && (
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="유형" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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

      {/* 안내 배너 */}
      {activeTab === 'all' && (
        <div className="mb-3 text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
          레거시 거래내역과 CRM 거래명세표를 날짜순으로 통합 표시합니다.
          더 많은 데이터를 탐색하려면 &ldquo;레거시 거래&rdquo; 또는 &ldquo;CRM 명세표&rdquo; 탭을 사용하세요.
        </div>
      )}
      {activeTab === 'legacy' && (
        <div className="mb-3 text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
          레거시 장부 원본 데이터입니다. 서버 페이지네이션으로 전체 {serverLegacyTotal.toLocaleString()}건을 탐색할 수 있습니다.
        </div>
      )}
      {activeTab === 'crm' && (
        <div className="mb-3 text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
          CRM에서 생성한 거래명세표입니다. 입금 내역은 미수금 관리 탭에서 확인하세요.
        </div>
      )}

      {/* 전체 탭 truncation 경고 */}
      {activeTab === 'all' && isTruncated && (
        <div className="mb-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          표시 가능 범위(각 1,000건)를 초과했습니다. 날짜 범위를 좁히거나 개별 탭에서 확인하세요.
        </div>
      )}

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
            {!isLoading && !isError && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  조건에 맞는 거래내역이 없습니다. 검색어나 필터를 변경해보세요.
                </td>
              </tr>
            )}
            {rows.map((row) => {
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
            {isServerPaginated ? (
              <>
                {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–
                {Math.min(page * PAGE_SIZE, totalDisplay).toLocaleString()} / {totalDisplay.toLocaleString()}건
              </>
            ) : (
              <>
                {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–
                {Math.min(page * PAGE_SIZE, totalDisplay).toLocaleString()} / {totalDisplay.toLocaleString()}건
              </>
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
