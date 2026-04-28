import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, ChevronLeft, ChevronRight, AlertTriangle, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAllCustomers, getTxHistory, getInvoices, sanitizeSearchTerm } from '@/lib/api'
import type { TxHistory, Invoice, Customer } from '@/lib/api'
import { TransactionDetailDialog } from '@/components/TransactionDetailDialog'
import type { TransactionPreview } from '@/components/TransactionDetailDialog'
import { parseLegacyPayableMemo, parseLegacyReceivableMemo } from '@/lib/legacySnapshots'
import { getDisplayMemo, getInvoicePaymentHistory, isInvoiceRevenueRecognized, parseCustomerAccountingMeta } from '@/lib/accountingMeta'

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
  지급: { bg: '#dbeafe', text: '#1d4ed8' },
  '예치금 적립': { bg: '#d1fae5', text: '#047857' },
  '예치금 사용': { bg: '#ecfccb', text: '#4d7c0f' },
  환불대기: { bg: '#fef3c7', text: '#b45309' },
  환불: { bg: '#fee2e2', text: '#b91c1c' },
  '환불대기 해제': { bg: '#e5e7eb', text: '#4b5563' },
  반입: { bg: '#fef3c7', text: '#b45309' },
  메모: { bg: '#f1f5f9', text: '#64748b' },
}

// CRM Invoice → 통합 행 형식으로 변환
interface UnifiedRow {
  id: string
  recordId: number
  customer_id?: number
  tx_date: string
  customer_name: string
  legacy_book_id?: string
  tx_type: string
  amount: number
  tax: number
  slip_no: string
  memo: string
  source: 'legacy' | 'crm' | 'legacySettlement'
}

function matchesTransactionSearch(
  row: UnifiedRow,
  keyword: string,
  customerSearchTextByLegacyId: Map<string, string>,
): boolean {
  const normalizedKeyword = keyword.trim().toLowerCase()
  if (!normalizedKeyword) return true
  const haystacks = [
    row.customer_name,
    row.memo,
    row.slip_no,
    row.legacy_book_id ? customerSearchTextByLegacyId.get(row.legacy_book_id) ?? '' : '',
  ]
  return haystacks.some((value) => value?.toLowerCase().includes(normalizedKeyword))
}

function buildInvoicePaymentRows(inv: Invoice): UnifiedRow[] {
  const paymentHistory = getInvoicePaymentHistory(inv.memo as string | undefined)
  const rows = paymentHistory.map((entry, index) => ({
    id: `crm-payment-${inv.Id}-${index}`,
    recordId: inv.Id,
    customer_id: typeof inv.customer_id === 'number' ? inv.customer_id : undefined,
    tx_date: entry.createdAt ?? `${entry.date}T00:00:00`,
    customer_name: inv.customer_name ?? '',
    tx_type: '입금',
    amount: entry.amount,
    tax: 0,
    slip_no: inv.invoice_no ?? '',
    memo: [
      inv.invoice_no ?? '',
      'CRM 입금 기록',
      entry.method ? `방법: ${entry.method}` : '',
      entry.accountLabel ? `계정: ${entry.accountLabel}` : '',
      entry.operator ? `입력: ${entry.operator}` : '',
      entry.note ? `메모: ${entry.note}` : '',
    ].filter(Boolean).join(' · '),
    source: 'crm' as const,
  }))
  const loggedAmount = paymentHistory.reduce((sum, entry) => sum + entry.amount, 0)
  const fallbackAmount = Math.max(0, (inv.paid_amount ?? 0) - loggedAmount)
  if (fallbackAmount > 0) {
    rows.unshift({
      id: `crm-payment-fallback-${inv.Id}`,
      recordId: inv.Id,
      customer_id: typeof inv.customer_id === 'number' ? inv.customer_id : undefined,
      tx_date: inv.invoice_date ?? '',
      customer_name: inv.customer_name ?? '',
      tx_type: '입금',
      amount: fallbackAmount,
      tax: 0,
      slip_no: inv.invoice_no ?? '',
      memo: [inv.invoice_no ?? '', '기록 이전 누적 입금'].filter(Boolean).join(' · '),
      source: 'crm',
    })
  }
  return rows
}

function invoiceToRows(inv: Invoice): UnifiedRow[] {
  const rows: UnifiedRow[] = []
  if (isInvoiceRevenueRecognized(inv)) {
    rows.push({
      id: `crm-${inv.Id}`,
      recordId: inv.Id,
      customer_id: typeof inv.customer_id === 'number' ? inv.customer_id : undefined,
      tx_date: inv.invoice_date ?? '',
      customer_name: inv.customer_name ?? '',
      tx_type: '출고(CRM)',
      amount: inv.total_amount ?? 0,
      tax: inv.tax_amount ?? 0,
      slip_no: inv.invoice_no ?? '',
      memo: getDisplayMemo(inv.memo as string | undefined),
      source: 'crm',
    })
  }
  rows.push(...buildInvoicePaymentRows(inv))
  return rows
}

function txToRow(
  tx: TxHistory,
  customerNameByLegacyId: Map<string, string>,
  customerIdByLegacyId: Map<string, number>,
  customerIdByName: Map<string, number>,
): UnifiedRow {
  const legacyBookId = tx.legacy_book_id != null ? String(tx.legacy_book_id).trim() : ''
  const resolvedCustomerName =
    tx.customer_name?.trim() || (legacyBookId ? customerNameByLegacyId.get(legacyBookId) ?? '' : '')
  return {
    id: `legacy-${tx.Id}`,
    recordId: tx.Id,
    customer_id: (legacyBookId ? customerIdByLegacyId.get(legacyBookId) : undefined) ?? customerIdByName.get(resolvedCustomerName),
    tx_date: tx.tx_date ?? '',
    customer_name: resolvedCustomerName,
    legacy_book_id: legacyBookId,
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
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const tab = searchParams.get('tab')
    return tab === 'legacy' || tab === 'crm' || tab === 'all' ? tab : 'all'
  })
  const [search, setSearch] = useState(() => searchParams.get('customer') ?? searchParams.get('q') ?? '')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionPreview | null>(null)

  // 전체 탭: 기본 최근 3개월
  const [defaultFrom, defaultTo] = getPresetDates('3months')
  const [dateFrom, setDateFrom] = useState(defaultFrom)
  const [dateTo, setDateTo] = useState(defaultTo)

  const debouncedSearch = useDebounce(search, 400)

  const { data: customerDirectory = [] } = useQuery({
    queryKey: ['transactions-customer-directory'],
    queryFn: () => getAllCustomers({ fields: 'Id,name,book_name,legacy_id,memo' }),
    staleTime: 10 * 60_000,
  })

  const customerNameByLegacyId = useMemo(() => {
    const map = new Map<string, string>()
    customerDirectory.forEach((customer: Customer) => {
      const legacyId = customer.legacy_id != null ? String(customer.legacy_id).trim() : ''
      if (!legacyId) return
      const label = customer.name?.trim() || customer.book_name?.trim() || ''
      if (label) map.set(legacyId, label)
    })
    return map
  }, [customerDirectory])

  const customerIdByLegacyId = useMemo(() => {
    const map = new Map<string, number>()
    customerDirectory.forEach((customer: Customer) => {
      const legacyId = customer.legacy_id != null ? String(customer.legacy_id).trim() : ''
      if (legacyId && typeof customer.Id === 'number') map.set(legacyId, customer.Id)
    })
    return map
  }, [customerDirectory])

  const customerIdByName = useMemo(() => {
    const map = new Map<string, number>()
    customerDirectory.forEach((customer: Customer) => {
      const names = [customer.name?.trim(), customer.book_name?.trim()].filter(Boolean) as string[]
      names.forEach((name) => {
        if (!map.has(name) && typeof customer.Id === 'number') map.set(name, customer.Id)
      })
    })
    return map
  }, [customerDirectory])

  const customerSearchTextByLegacyId = useMemo(() => {
    const map = new Map<string, string>()
    customerDirectory.forEach((customer: Customer) => {
      const legacyId = customer.legacy_id != null ? String(customer.legacy_id).trim() : ''
      if (!legacyId) return
      const searchText = [customer.name?.trim(), customer.book_name?.trim()].filter(Boolean).join(' ')
      if (searchText) map.set(legacyId, searchText)
    })
    return map
  }, [customerDirectory])

  const matchedLegacyIds = useMemo(() => {
    const keyword = debouncedSearch.trim().toLowerCase()
    if (!keyword) return [] as string[]
    return customerDirectory
      .flatMap((customer: Customer) => {
        const legacyId = customer.legacy_id != null ? String(customer.legacy_id).trim() : ''
        const haystacks = [customer.name?.trim(), customer.book_name?.trim()].filter(Boolean) as string[]
        const matched = haystacks.some((value) => value.toLowerCase().includes(keyword))
        return matched && legacyId ? [legacyId] : []
      })
      .filter((legacyId, index, arr) => arr.indexOf(legacyId) === index)
  }, [customerDirectory, debouncedSearch])

  const legacySettlementRows = useMemo(() => (
    customerDirectory.flatMap((customer: Customer) => {
      const legacyBookId = customer.legacy_id != null ? String(customer.legacy_id).trim() : ''
      const receivableRows = parseLegacyReceivableMemo(customer.memo as string | undefined).settlements.map((entry, index) => ({
        id: `legacy-settlement-${customer.Id}-${index}`,
        recordId: -(customer.Id * 1000 + index + 1),
        customer_id: customer.Id,
        tx_date: entry.createdAt ?? entry.date,
        customer_name: customer.name?.trim() || customer.book_name?.trim() || '',
        legacy_book_id: legacyBookId || undefined,
        tx_type: '입금',
        amount: entry.amount,
        tax: 0,
        slip_no: entry.createdAt ?? entry.date,
        memo: [
          '기존 장부 미수 입금',
          entry.method ? `방법: ${entry.method}` : '',
          entry.accountLabel ? `계정: ${entry.accountLabel}` : '',
          entry.operator ? `입력: ${entry.operator}` : '',
          entry.createdAt ? `시각: ${entry.createdAt.slice(0, 16).replace('T', ' ')}` : '',
        ].filter(Boolean).join(' · '),
        source: 'legacySettlement' as const,
      }))
      const payableRows = parseLegacyPayableMemo(customer.memo as string | undefined).settlements.map((entry, index) => ({
        id: `legacy-payable-${customer.Id}-${index}`,
        recordId: -(customer.Id * 100000 + index + 1),
        customer_id: customer.Id,
        tx_date: entry.createdAt ?? entry.date,
        customer_name: customer.name?.trim() || customer.book_name?.trim() || '',
        legacy_book_id: legacyBookId || undefined,
        tx_type: '지급',
        amount: entry.amount,
        tax: 0,
        slip_no: entry.createdAt ?? entry.date,
        memo: [
          '기존 장부 미지급금 지급',
          entry.method ? `방법: ${entry.method}` : '',
          entry.accountLabel ? `계정: ${entry.accountLabel}` : '',
          entry.operator ? `입력: ${entry.operator}` : '',
          entry.createdAt ? `시각: ${entry.createdAt.slice(0, 16).replace('T', ' ')}` : '',
        ].filter(Boolean).join(' · '),
        source: 'legacySettlement' as const,
      }))
      const accountingRows = parseCustomerAccountingMeta(customer.memo as string | undefined).events.map((entry, index) => {
        const txTypeMap: Record<string, string> = {
          deposit_added: '예치금 적립',
          deposit_used: '예치금 사용',
          refund_pending_added: '환불대기',
          refund_paid: '환불',
          refund_pending_cleared: '환불대기 해제',
        }
        return {
          id: `accounting-${customer.Id}-${index}`,
          recordId: -(customer.Id * 1000000 + index + 1),
          customer_id: customer.Id,
          tx_date: entry.createdAt ?? entry.date,
          customer_name: customer.name?.trim() || customer.book_name?.trim() || '',
          legacy_book_id: legacyBookId || undefined,
          tx_type: txTypeMap[entry.type] ?? '메모',
          amount: entry.amount,
          tax: 0,
          slip_no: entry.createdAt ?? entry.date,
          memo: [
            entry.type === 'deposit_added' ? '초과 입금 예치금 보관' : '',
            entry.type === 'deposit_used' ? '예치금으로 명세표 차감' : '',
            entry.type === 'refund_pending_added' ? '초과 입금 환불대기 등록' : '',
            entry.type === 'refund_paid' ? '환불 완료' : '',
            entry.method ? `방법: ${entry.method}` : '',
            entry.accountLabel ? `계정: ${entry.accountLabel}` : '',
            entry.operator ? `입력: ${entry.operator}` : '',
            entry.relatedInvoiceId ? `명세표: #${entry.relatedInvoiceId}` : '',
            entry.note ? `메모: ${entry.note}` : '',
            entry.createdAt ? `시각: ${entry.createdAt.slice(0, 16).replace('T', ' ')}` : '',
          ].filter(Boolean).join(' · '),
          source: 'legacySettlement' as const,
        }
      })
      return [...receivableRows, ...payableRows, ...accountingRows]
    })
  ), [customerDirectory])

  useEffect(() => {
    const nextSearch = searchParams.get('customer') ?? searchParams.get('q') ?? ''
    setSearch((prev) => (prev === nextSearch ? prev : nextSearch))
    const tab = searchParams.get('tab')
    const nextTab = tab === 'legacy' || tab === 'crm' || tab === 'all' ? tab : 'all'
    setActiveTab((prev) => (prev === nextTab ? prev : nextTab))
  }, [searchParams])

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams)
    if (debouncedSearch) nextParams.set('customer', debouncedSearch)
    else nextParams.delete('customer')
    nextParams.delete('q')
    if (activeTab !== 'all') nextParams.set('tab', activeTab)
    else nextParams.delete('tab')
    const current = searchParams.toString()
    const next = nextParams.toString()
    if (current !== next) setSearchParams(nextParams, { replace: true })
  }, [debouncedSearch, activeTab, searchParams, setSearchParams])

  // 필터/검색 변경 시 1페이지로 리셋
  useEffect(() => setPage(1), [debouncedSearch, typeFilter, dateFrom, dateTo])

  // 탭 변경 시: page 리셋, typeFilter 리셋
  function handleTabChange(tab: string) {
    setActiveTab(tab as TabKey)
    setPage(1)
    setTypeFilter('ALL')
  }

  // ── skipLegacy / skipCrm 판별 ──
  const useLegacyClientSearch = !!debouncedSearch && matchedLegacyIds.length > 0
  const skipLegacy = activeTab === 'crm' || typeFilter === '출고(CRM)'
  const skipCrm = activeTab === 'legacy' || ['지급', '예치금 적립', '예치금 사용', '환불대기', '환불', '환불대기 해제', '반입', '메모'].includes(typeFilter)

  const isServerPaginated = (activeTab === 'legacy' || activeTab === 'crm') && !useLegacyClientSearch

  // ── 레거시 거래내역 쿼리 ──
  const legacyParams = useMemo(() => {
    const p: Record<string, string | number> = {
      limit: isServerPaginated && activeTab === 'legacy' ? PAGE_SIZE : (useLegacyClientSearch ? 5000 : 1000),
      sort: '-tx_date',
    }
    if (isServerPaginated && activeTab === 'legacy') {
      p.offset = (page - 1) * PAGE_SIZE
    }
    const conds: string[] = []
    if (debouncedSearch && !useLegacyClientSearch) {
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
  }, [isServerPaginated, activeTab, page, debouncedSearch, useLegacyClientSearch, skipLegacy, typeFilter, dateFrom, dateTo])

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
    }
    if (isServerPaginated && activeTab === 'crm') {
      p.offset = (page - 1) * PAGE_SIZE
    }
    // NocoDB Date 타입 컬럼은 gte/lte 연산자를 지원하지 않아 날짜 필터는 클라이언트에서 처리
    const conds: string[] = []
    if (debouncedSearch) {
      const safe = sanitizeSearchTerm(debouncedSearch)
      conds.push(`(customer_name,like,%${safe}%)`)
    }
    if (conds.length > 0) {
      p.where = conds.length === 1 ? conds[0] : conds.join('~and')
    }
    return p
  }, [isServerPaginated, activeTab, page, debouncedSearch])

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
  // CRM 데이터 클라이언트 날짜 필터 (NocoDB Date 타입은 gte/lte 미지원)
  const filterByDate = useCallback((rows: UnifiedRow[]) => {
    if (!dateFrom && !dateTo) return rows
    return rows.filter((r) => {
      const d = r.tx_date.slice(0, 10)
      if (dateFrom && d < dateFrom) return false
      if (dateTo && d > dateTo) return false
      return true
    })
  }, [dateFrom, dateTo])

  const filterCrmRows = useCallback((rows: UnifiedRow[]) => filterByDate(rows).filter((row) => {
    if (typeFilter === 'ALL') return true
    return row.tx_type === typeFilter
  }), [filterByDate, typeFilter])

  const { rows, totalPages, totalDisplay, isTruncated } = useMemo(() => {
    if (isServerPaginated) {
      // 서버 페이지네이션: 한쪽 소스만 표시
      if (activeTab === 'legacy') {
        const list = [
          ...(legacyData?.list ?? [])
          .map((tx) => txToRow(tx, customerNameByLegacyId, customerIdByLegacyId, customerIdByName))
          .filter((row) => matchesTransactionSearch(row, debouncedSearch, customerSearchTextByLegacyId)),
          ...(useLegacyClientSearch ? legacySettlementRows : []),
        ]
          .filter((row) => matchesTransactionSearch(row, debouncedSearch, customerSearchTextByLegacyId))
          .filter((row) => {
            const d = row.tx_date.slice(0, 10)
            if (dateFrom && d < dateFrom) return false
            if (dateTo && d > dateTo) return false
            return true
          })
        list.sort((a, b) => b.tx_date.localeCompare(a.tx_date))
        return {
          rows: isServerPaginated ? list : list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
          totalPages: Math.max(1, Math.ceil((isServerPaginated ? list.length : list.length) / PAGE_SIZE)),
          totalDisplay: list.length,
          isTruncated: false,
        }
      } else {
        // CRM 탭: 클라이언트 날짜 필터 적용
        const list = filterCrmRows((crmData?.list ?? []).flatMap(invoiceToRows))
        return {
          rows: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
          totalPages: Math.max(1, Math.ceil(list.length / PAGE_SIZE)),
          totalDisplay: list.length,
          isTruncated: false,
        }
      }
    }

    // 전체 탭: 양쪽 병합 → 클라이언트 페이지네이션
    const legacy = [
      ...(legacyData?.list ?? [])
      .map((tx) => txToRow(tx, customerNameByLegacyId, customerIdByLegacyId, customerIdByName))
      .filter((row) => matchesTransactionSearch(row, debouncedSearch, customerSearchTextByLegacyId)),
      ...legacySettlementRows,
    ]
      .filter((row) => matchesTransactionSearch(row, debouncedSearch, customerSearchTextByLegacyId))
      .filter((row) => {
        const d = row.tx_date.slice(0, 10)
        if (dateFrom && d < dateFrom) return false
        if (dateTo && d > dateTo) return false
        return true
      })
    const crm = filterCrmRows((crmData?.list ?? []).flatMap(invoiceToRows))
      .filter((row) => matchesTransactionSearch(row, debouncedSearch, customerSearchTextByLegacyId))
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
  }, [isServerPaginated, activeTab, legacyData, crmData, customerNameByLegacyId, customerIdByLegacyId, customerIdByName, customerSearchTextByLegacyId, legacySettlementRows, debouncedSearch, serverLegacyTotal, serverCrmTotal, skipLegacy, skipCrm, page, dateFrom, dateTo, filterCrmRows, useLegacyClientSearch])

  const isLoading = (legacyLoading && !skipLegacy) || (crmLoading && !skipCrm)
  // 양쪽 모두 실패한 경우만 전체 에러 (부분 실패는 경고로 처리)
  const isError = activeTab === 'all'
    ? (legacyError && !skipLegacy) && (crmError && !skipCrm) // 전체탭: 양쪽 다 실패해야 에러
    : (legacyError && !skipLegacy) || (crmError && !skipCrm) // 개별탭: 해당 소스 실패 시 에러
  const partialError = activeTab === 'all' && !isError && (
    (legacyError && !skipLegacy) || (crmError && !skipCrm)
  )

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
        { value: '지급', label: '지급' },
        { value: '예치금 적립', label: '예치금 적립' },
        { value: '예치금 사용', label: '예치금 사용' },
        { value: '환불대기', label: '환불대기' },
        { value: '환불', label: '환불' },
        { value: '반입', label: '반입' },
        { value: '메모', label: '메모' },
      ]
    }
    // 전체 탭
    return [
      { value: 'ALL', label: '모든 유형' },
      { value: '출고', label: '출고 (기존 장부)' },
      { value: '출고(CRM)', label: '출고 (새 입력 명세표)' },
      { value: '입금', label: '입금' },
      { value: '지급', label: '지급' },
      { value: '예치금 적립', label: '예치금 적립' },
      { value: '예치금 사용', label: '예치금 사용' },
      { value: '환불대기', label: '환불대기' },
      { value: '환불', label: '환불' },
      { value: '반입', label: '반입' },
      { value: '메모', label: '메모' },
    ]
  }, [activeTab])

  // ── 헤더 건수 표시 ──
  const headerCount = useMemo(() => {
    if (activeTab === 'legacy') return `기존 장부 ${serverLegacyTotal.toLocaleString()}건`
    if (activeTab === 'crm') return `새 입력 ${serverCrmTotal.toLocaleString()}건`
    const total = (skipLegacy ? 0 : serverLegacyTotal + legacySettlementRows.length) + (skipCrm ? 0 : serverCrmTotal)
    return `전체 ${total.toLocaleString()}건`
  }, [activeTab, serverLegacyTotal, serverCrmTotal, legacySettlementRows.length, skipLegacy, skipCrm])

  const activeScopeLabel = activeTab === 'legacy'
    ? '기존 장부 거래'
    : activeTab === 'crm'
      ? '새 입력 명세표'
      : '전체 거래'
  const activeScopeDescription = activeTab === 'legacy'
    ? '기존 장부 원본과 입금/지급 흐름을 함께 봅니다.'
    : activeTab === 'crm'
      ? '새로 입력한 명세표를 날짜순으로 확인합니다.'
      : '기존 장부와 새 입력 명세표를 통합해서 봅니다.'
  const periodSummary = dateFrom && dateTo
    ? `${dateFrom} ~ ${dateTo}`
    : dateFrom
      ? `${dateFrom} 이후`
      : dateTo
        ? `${dateTo} 이전`
        : '전체 기간'
  const resultSummary = `${totalDisplay.toLocaleString()}건`
  const filterStatus = hasFilter ? '필터 적용 중' : '기본 조회'

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">거래/명세표 조회</h2>
          <p className="text-sm text-muted-foreground mt-1">{headerCount}</p>
        </div>
        <Button
          onClick={() => navigate('/invoices?new=1')}
          className="bg-[#7d9675] hover:bg-[#6a8462] text-white gap-1"
        >
          <Plus className="h-4 w-4" />
          명세표 작성
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-4">
        <div className="mb-4 rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">상태 요약</p>
              <p className="text-xs text-muted-foreground">
                지금 보고 있는 범위와 결과를 먼저 확인하고, 아래 조회 조건으로 좁혀보세요.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-[#f7f5ef] px-3 py-1 font-medium text-[#836b2c]">
                {activeScopeLabel}
              </span>
              <span className="rounded-full bg-[#f4f7f1] px-3 py-1 font-medium text-[#4f6748]">
                {resultSummary}
              </span>
              <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
                {periodSummary}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                {filterStatus}
              </span>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border bg-[#fcfcfb] px-4 py-3">
              <p className="text-xs text-muted-foreground">현재 범위</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{activeScopeLabel}</p>
              <p className="mt-1 text-xs text-muted-foreground">{activeScopeDescription}</p>
            </div>
            <div className="rounded-lg border bg-[#fcfcfb] px-4 py-3">
              <p className="text-xs text-muted-foreground">현재 결과</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{resultSummary}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {hasFilter ? '검색과 필터가 반영된 결과입니다.' : '기본 조회 조건으로 보고 있습니다.'}
              </p>
            </div>
            <div className="rounded-lg border bg-[#fcfcfb] px-4 py-3">
              <p className="text-xs text-muted-foreground">조회 기간</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{periodSummary}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {activeTab === 'all'
                  ? '전체 탭은 최근 3개월 기준으로 빠르게 훑습니다.'
                  : '개별 탭은 같은 기간을 그대로 적용합니다.'}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-xl border bg-white p-4 shadow-sm" data-guide-id="transactions-filters">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">조회 조건</p>
                <p className="text-xs text-muted-foreground">
                  검색어, 탭, 유형, 기간을 먼저 고르고 필요한 거래만 좁혀서 확인하세요.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-[#f7f5ef] px-3 py-1 font-medium text-[#836b2c]">
                  {activeTab === 'all' ? '통합 보기' : activeTab === 'legacy' ? '기존 장부' : '새 입력'}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                  {headerCount}
                </span>
              </div>
            </div>

            <TabsList data-guide-id="transactions-tabs" className="w-full justify-start">
              <TabsTrigger value="all">전체</TabsTrigger>
              <TabsTrigger value="legacy">기존 장부 거래</TabsTrigger>
              <TabsTrigger value="crm">새 입력 명세표</TabsTrigger>
            </TabsList>

            {activeTab === 'all' && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[#fafaf8] px-3 py-2">
                <span className="text-xs text-muted-foreground">기간 빠른 선택</span>
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

            <div className="grid gap-3 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">거래처 검색</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="거래처명/메모/전표번호 검색..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              {typeOptions.length > 0 && (
                <div className="lg:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">유형</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="유형" />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="lg:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">시작일</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  title="시작일"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">종료일</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  title="종료일"
                />
              </div>
              <div className="flex items-end lg:col-span-1">
                {hasFilter ? (
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="w-full lg:w-auto">
                    초기화
                  </Button>
                ) : (
                  <div className="hidden lg:block" />
                )}
              </div>
            </div>
          </div>
        </div>
      </Tabs>

        {/* 안내 배너 */}
        {activeTab === 'all' && (
          <div className="mb-3 text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
            기존 장부 거래내역과 새 입력 거래명세표를 날짜순으로 통합 표시합니다.
          행을 클릭하면 당시 거래 상세와 묶음 내역을 확인할 수 있습니다.
        </div>
      )}
      {activeTab === 'legacy' && (
        <div className="mb-3 text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
          기존 장부 원본 데이터입니다. 고객 검색 시 기존 장부 입금 이력도 함께 표시됩니다.
        </div>
      )}
      {activeTab === 'crm' && (
        <div className="mb-3 text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
          이 시스템에서 새로 입력한 거래명세표입니다.
        </div>
      )}

      {/* 부분 소스 실패 경고 */}
      {partialError && (
        <div className="mb-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {legacyError ? '기존 장부 거래내역' : '새 입력 명세표'} 데이터를 불러오지 못했습니다.
          {legacyError ? ' 새 입력 명세표만 ' : ' 기존 장부 데이터만 '}표시 중입니다.
        </div>
      )}

      {/* 전체 탭 truncation 경고 */}
      {activeTab === 'all' && isTruncated && (
        <div className="mb-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          표시 가능 범위(각 1,000건)를 초과했습니다. 날짜 범위를 좁히거나 개별 탭에서 확인하세요.
        </div>
      )}

      {/* 모바일 카드 */}
      <div className="space-y-3 lg:hidden" data-guide-id="transactions-table">
        {isLoading && (
          <div className="rounded-lg border bg-white px-4 py-12 text-center text-muted-foreground">
            불러오는 중...
          </div>
        )}
        {isError && (
          <div className="rounded-lg border bg-white px-4 py-12 text-center text-red-500">
            데이터를 불러오지 못했습니다.
          </div>
        )}
        {!isLoading && !isError && rows.length === 0 && (
          <div className="rounded-lg border bg-white px-4 py-12 text-center text-muted-foreground">
            조건에 맞는 거래내역이 없습니다. 검색어나 필터를 변경해보세요.
          </div>
        )}
        {!isLoading && !isError && rows.map((row) => {
          const style = TX_TYPE_STYLE[row.tx_type] ?? { bg: '#f1f5f9', text: '#64748b' }
          return (
            <button
              key={row.id}
              type="button"
              className={`w-full rounded-xl border bg-white p-4 text-left shadow-sm transition-colors hover:border-[#7d9675] ${
                row.source === 'crm' ? 'bg-indigo-50/20' : ''
              }`}
              onClick={() => setSelectedTransaction({
                source: row.source,
                recordId: row.recordId,
                customerId: row.customer_id,
                date: row.tx_date.slice(0, 10),
                customerName: row.customer_name,
                legacyBookId: row.legacy_book_id,
                txType: row.tx_type,
                amount: row.amount,
                tax: row.tax,
                slipNo: row.slip_no,
                memo: row.memo,
              })}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">{row.tx_date.slice(0, 10) || '-'}</div>
                  <div className="mt-1 truncate text-sm font-semibold text-foreground">{row.customer_name || '-'}</div>
                </div>
                <div className="text-right">
                  {row.tx_type && (
                    <span
                      className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium"
                      style={{ backgroundColor: style.bg, color: style.text }}
                    >
                      {row.tx_type}
                    </span>
                  )}
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {row.amount > 0 ? `${row.amount.toLocaleString()}원` : '-'}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-[#f8faf7] p-3 text-[11px]">
                <div>
                  <div className="text-muted-foreground">세액</div>
                  <div className="mt-1 font-medium text-foreground">
                    {row.tax > 0 ? `${row.tax.toLocaleString()}원` : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">전표/발행번호</div>
                  <div className="mt-1 truncate font-mono text-foreground">
                    {row.slip_no || '-'}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                {row.memo || '비고 없음'}
              </div>
            </button>
          )
        })}
      </div>

      {/* 테이블 */}
      <div className="hidden overflow-hidden rounded-lg border bg-white lg:block" data-guide-id="transactions-table">
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
                  } cursor-pointer transition-colors`}
                  onClick={() => setSelectedTransaction({
                    source: row.source,
                    recordId: row.recordId,
                    customerId: row.customer_id,
                    date: row.tx_date.slice(0, 10),
                    customerName: row.customer_name,
                    legacyBookId: row.legacy_book_id,
                    txType: row.tx_type,
                    amount: row.amount,
                    tax: row.tax,
                    slipNo: row.slip_no,
                    memo: row.memo,
                  })}
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

      <TransactionDetailDialog
        open={!!selectedTransaction}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  )
}
