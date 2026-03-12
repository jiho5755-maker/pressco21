import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Calendar, Printer, Plus, Trash2, Pencil, RefreshCw, Download, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { getAllCustomers, getAllInvoices, getCustomer, getTxHistory, updateCustomer, recalcCustomerStats, sanitizeSearchTerm } from '@/lib/api'
import type { Customer, Invoice } from '@/lib/api'
import {
  deriveLegacyTradebookSnapshot,
  getFiscalBalanceSnapshots,
  getLegacyCustomerSnapshots,
  getLegacyReceivableBaselineFromSnapshots,
  getLegacyPayableBaselineFromSnapshots,
  parseLegacyPayableMemo,
  parseLegacyReceivableMemo,
  serializeLegacyPayableMemo,
  serializeLegacyReceivableMemo,
} from '@/lib/legacySnapshots'
import type {
  LegacyCustomerSnapshotPayload,
} from '@/lib/legacySnapshots'
import { printCustomerTransactionStatement, printPeriodReport } from '@/lib/print'
import { STATUS_COLORS, CUSTOMER_TYPE_LABELS, GRADE_COLORS } from '@/lib/constants'
import { TransactionDetailDialog } from '@/components/TransactionDetailDialog'
import type { TransactionPreview } from '@/components/TransactionDetailDialog'
import { buildResolvedReceivableInvoices, resolveInvoiceCustomer } from '@/lib/receivables'
import { loadActiveWorkOperatorProfile } from '@/lib/settings'
import { exportUnifiedTransactions } from '@/lib/excel'
import { getDisplayMemo, mergeDisplayMemo, parseCustomerAccountingMeta, replaceCustomerAccountingPreferences } from '@/lib/accountingMeta'

// ── 기본정보 편집 폼 ──────────────────────────────────────
interface InfoForm {
  name: string
  phone: string
  mobile: string
  email: string
  biz_no: string
  ceo_name: string
  biz_type: string
  biz_item: string
  customer_type: string
  customer_status: string
  price_tier: string
  discount_rate: string
  memo: string
  depositorAliases: string
  autoDepositDisabled: boolean
  autoDepositPriority: string
  addresses: string[]
}

const MAX_ADDRESS_FIELDS = 10

function buildInfoForm(c: Customer): InfoForm {
  const accountingMeta = parseCustomerAccountingMeta(c.memo as string | undefined)
  const addresses: string[] = []
  for (let i = 1; i <= MAX_ADDRESS_FIELDS; i++) {
    const v = c[`address${i}`] as string | undefined
    if (v) addresses.push(v)
  }
  return {
    name: c.name ?? '',
    phone: c.phone ?? c.phone1 ?? '',
    mobile: (c.mobile as string) ?? '',
    email: c.email ?? '',
    biz_no: c.biz_no ?? '',
    ceo_name: (c.ceo_name as string) ?? '',
    biz_type: (c.biz_type as string) ?? '',
    biz_item: (c.biz_item as string) ?? '',
    customer_type: c.customer_type ?? '',
    customer_status: c.customer_status ?? '',
    price_tier: String(c.price_tier ?? 1),
    discount_rate: String(c.discount_rate ?? ''),
    memo: getDisplayMemo(c.memo as string | undefined),
    depositorAliases: accountingMeta.depositorAliases.join('\n'),
    autoDepositDisabled: accountingMeta.autoDepositDisabled,
    autoDepositPriority: accountingMeta.autoDepositPriority > 0 ? String(accountingMeta.autoDepositPriority) : '',
    addresses: addresses.length > 0 ? addresses : [''],
  }
}

const TX_PAGE = 50

// ── 날짜 유틸리티 ──────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function currentTimestamp() {
  return new Date().toISOString()
}
function thisMonthStart() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function toNullableText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

// ── 거래내역 쿼리 (모든 tx_type, 페이지네이션) ──────────
function useCustomerTxPage(legacyId: string | undefined, name: string | undefined, offset: number) {
  const txWhere = legacyId
    ? `(legacy_book_id,eq,${sanitizeSearchTerm(legacyId)})`
    : name
      ? `(customer_name,eq,${sanitizeSearchTerm(name)})`
      : ''
  return useQuery({
    queryKey: ['txHistoryPage', legacyId, name, offset],
    queryFn: () =>
      getTxHistory({
        where: txWhere,
        sort: '-tx_date',
        limit: TX_PAGE,
        offset,
      }),
    enabled: !!txWhere,
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  })
}

// ── 차트용 출고 전체 (최대 1,000건) ──────────────────────
function useCustomerTxAll(legacyId: string | undefined, name: string | undefined) {
  const txWhere = legacyId
    ? `(legacy_book_id,eq,${sanitizeSearchTerm(legacyId)})~and(tx_type,eq,출고)`
    : name
      ? `(customer_name,eq,${sanitizeSearchTerm(name)})~and(tx_type,eq,출고)`
      : ''
  return useQuery({
    queryKey: ['txHistoryAll', legacyId, name],
    queryFn: () =>
      getTxHistory({
        where: txWhere,
        sort: '-tx_date',
        limit: 1000,
      }),
    enabled: !!txWhere,
    staleTime: 10 * 60_000,
  })
}

// TX 유형 배지 색상
const TX_TYPE_STYLE: Record<string, string> = {
  출고: 'bg-blue-50 text-blue-700',
  입금: 'bg-green-50 text-green-700',
  지급: 'bg-blue-50 text-blue-700',
  반입: 'bg-orange-50 text-orange-700',
  메모: 'bg-gray-50 text-gray-600',
}

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const customerId = Number(id)
  const queryClient = useQueryClient()
  const [txOffset, setTxOffset] = useState(0)
  const [gradeEditMode, setGradeEditMode] = useState(false)
  const [editGrade, setEditGrade] = useState('')
  const [editQual, setEditQual] = useState('')
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionPreview | null>(null)
  const [historySearch, setHistorySearch] = useState('')
  const [historyTypeFilter, setHistoryTypeFilter] = useState('ALL')
  const [historyDateFrom, setHistoryDateFrom] = useState(thisMonthStart)
  const [historyDateTo, setHistoryDateTo] = useState(todayStr)
  const [legacyPaymentAmount, setLegacyPaymentAmount] = useState('')
  const [legacyPaymentMethod, setLegacyPaymentMethod] = useState('계좌이체')
  const [legacyPayableAmount, setLegacyPayableAmount] = useState('')
  const [legacyPayableMethod, setLegacyPayableMethod] = useState('계좌이체')
  const [savingLegacyPayment, setSavingLegacyPayment] = useState(false)
  const [editingLegacySettlementIndex, setEditingLegacySettlementIndex] = useState<number | null>(null)
  const [editingLegacyPayableIndex, setEditingLegacyPayableIndex] = useState<number | null>(null)

  // 기본정보 편집 상태
  const [infoEditMode, setInfoEditMode] = useState(false)
  const [infoForm, setInfoForm] = useState<InfoForm>({
    name: '', phone: '', mobile: '', email: '', biz_no: '', ceo_name: '',
    biz_type: '', biz_item: '', customer_type: '', customer_status: '',
    price_tier: '1', discount_rate: '', memo: '', depositorAliases: '', autoDepositDisabled: false, autoDepositPriority: '', addresses: [''],
  })

  // 기간 매출 필터 상태 (명세표 탭)
  const [dateFrom, setDateFrom] = useState(thisMonthStart)
  const [dateTo, setDateTo] = useState(todayStr)

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomer(customerId),
    enabled: !!customerId,
    staleTime: 10 * 60_000,
  })

  const { data: legacySnapshots } = useQuery<LegacyCustomerSnapshotPayload>({
    queryKey: ['legacy-customer-snapshots'],
    queryFn: getLegacyCustomerSnapshots,
    staleTime: Infinity,
  })
  const { data: fiscalSnapshots } = useQuery({
    queryKey: ['legacy-fiscal-balance-snapshots'],
    queryFn: getFiscalBalanceSnapshots,
    staleTime: Infinity,
  })

  const { mutate: saveGrade, isPending: savingGrade } = useMutation({
    mutationFn: () =>
      updateCustomer(customerId, {
        member_grade: editGrade && editGrade !== '_NONE_' ? editGrade : undefined,
        grade_qualification: editQual,
        is_ambassador: editGrade === 'AMBASSADOR',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
      setGradeEditMode(false)
    },
  })

  const { mutate: saveInfo, isPending: savingInfo } = useMutation({
    mutationFn: () => {
      const trimmedName = infoForm.name.trim()
      if (!trimmedName) throw new Error('거래처명을 입력해주세요')

      // 주소 필드 동적 구성 (address1~address10, 삭제된 슬롯은 null로 명시)
      const addrPayload: Record<string, unknown> = {}
      for (let i = 1; i <= MAX_ADDRESS_FIELDS; i++) {
        const value = infoForm.addresses[i - 1] ?? ''
        addrPayload[`address${i}`] = toNullableText(value)
      }

      const customerPatch = {
        name: trimmedName,
        phone: toNullableText(infoForm.phone),
        phone1: toNullableText(infoForm.phone),
        mobile: toNullableText(infoForm.mobile),
        email: toNullableText(infoForm.email),
        biz_no: toNullableText(infoForm.biz_no),
        ceo_name: toNullableText(infoForm.ceo_name),
        biz_type: toNullableText(infoForm.biz_type),
        biz_item: toNullableText(infoForm.biz_item),
        customer_type: toNullableText(infoForm.customer_type),
        customer_status: toNullableText(infoForm.customer_status),
        price_tier: infoForm.price_tier ? Number(infoForm.price_tier) : null,
        discount_rate: infoForm.discount_rate.trim() ? Number(infoForm.discount_rate) : null,
        memo: toNullableText(
          replaceCustomerAccountingPreferences(
            mergeDisplayMemo(customer?.memo as string | undefined, infoForm.memo),
            {
              depositorAliases: infoForm.depositorAliases
                .split(/\r?\n|,/)
                .map((value) => value.trim())
                .filter(Boolean),
              autoDepositDisabled: infoForm.autoDepositDisabled,
              autoDepositPriority: infoForm.autoDepositPriority.trim() ? Number(infoForm.autoDepositPriority) : 0,
            },
          ),
        ),
        ...addrPayload,
      } as Partial<Customer>

      return updateCustomer(customerId, customerPatch)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setInfoEditMode(false)
      toast.success('고객 정보가 저장되었습니다')
    },
    onError: (e: Error) => {
      toast.error(e.message)
    },
  })

  // 고객 통계 재계산 (미수금 + 총매출 + 최종거래일 + 주문건수)
  const { mutate: recalcBalance, isPending: recalcing } = useMutation({
    mutationFn: () => recalcCustomerStats(customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('고객 통계가 재계산되었습니다 (미수금·총매출·최종거래일)')
    },
    onError: (e: Error) => toast.error(`재계산 실패: ${e.message}`),
  })

  const customerLegacyId = customer?.legacy_id != null ? String(customer.legacy_id).trim() : undefined
  const { data: txAll } = useCustomerTxAll(customerLegacyId, customer?.name)
  const { data: txPage } = useCustomerTxPage(customerLegacyId, customer?.name, txOffset)

  const { data: customerLinks = [] } = useQuery({
    queryKey: ['customer-detail-link-customers'],
    queryFn: () => getAllCustomers({ fields: 'Id,name,book_name' }),
    staleTime: 10 * 60_000,
  })

  // 분리 거래명까지 포함한 고객별 CRM 명세표
  const { data: invoiceData = [] } = useQuery<Invoice[]>({
    queryKey: ['invoices-customer', customerId],
    queryFn: async () => {
      const invoices = await getAllInvoices({
        sort: '-invoice_date',
        fields: 'Id,invoice_no,invoice_date,customer_id,customer_name,supply_amount,tax_amount,total_amount,paid_amount,payment_status,memo',
      })
      return invoices.filter((invoice) => resolveInvoiceCustomer(invoice, customerLinks)?.Id === customerId)
    },
    enabled: !!customerId && customerLinks.length > 0,
  })

  // ── 기간 매출 필터 (명세표 탭) ────────────────────────
  const filteredInvoices = useMemo(
    () =>
      invoiceData.filter((inv) => {
        const d = (inv.invoice_date ?? '').slice(0, 10)
        return d >= dateFrom && d <= dateTo
      }),
    [invoiceData, dateFrom, dateTo]
  )

  // 레거시 txHistory 기간 필터 (출고 건만, txAll에서 클라이언트 필터링)
  const filteredLegacyTx = useMemo(
    () =>
      (txAll?.list ?? []).filter((tx) => {
        const d = (tx.tx_date ?? '').slice(0, 10)
        return d >= dateFrom && d <= dateTo
      }),
    [txAll, dateFrom, dateTo]
  )

  const periodStats = useMemo(() => {
    // CRM v2 명세표 합산
    const crmSales = filteredInvoices.reduce((s, inv) => s + (inv.total_amount ?? 0), 0)
    const received = filteredInvoices.reduce((s, inv) => s + (inv.paid_amount ?? 0), 0)
    const outstanding = crmSales - received
    // 레거시 출고 합산 (txAll에서 가져옴)
    const legacySales = filteredLegacyTx.reduce((s, tx) => s + (tx.amount ?? 0), 0)
    return {
      crmSales, received, outstanding,
      crmCount: filteredInvoices.length,
      legacySales,
      legacyCount: filteredLegacyTx.length,
      totalSales: crmSales + legacySales,
    }
  }, [filteredInvoices, filteredLegacyTx])

  // ── 기간 프리셋 ───────────────────────────────────────
  function applyPreset(preset: 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear') {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    switch (preset) {
      case 'thisMonth':
        setDateFrom(`${y}-${String(m).padStart(2, '0')}-01`)
        setDateTo(todayStr())
        break
      case 'lastMonth': {
        const lm = m === 1 ? 12 : m - 1
        const ly = m === 1 ? y - 1 : y
        const lastDay = new Date(ly, lm, 0).getDate()
        setDateFrom(`${ly}-${String(lm).padStart(2, '0')}-01`)
        setDateTo(`${ly}-${String(lm).padStart(2, '0')}-${lastDay}`)
        break
      }
      case 'thisQuarter': {
        const q = Math.ceil(m / 3)
        const qStart = (q - 1) * 3 + 1
        setDateFrom(`${y}-${String(qStart).padStart(2, '0')}-01`)
        setDateTo(todayStr())
        break
      }
      case 'thisYear':
        setDateFrom(`${y}-01-01`)
        setDateTo(todayStr())
        break
    }
  }

  // ── 거래내역 탭: CRM 명세표 + 레거시 txHistory 병합 ──
  const mergedHistory = useMemo(() => {
    type Row = {
      key: string
      source: 'crm' | 'legacy' | 'legacySettlement'
      recordId: number
      date: string
      legacyBookId?: string
      txType: string
      amount: number
      memo: string
      slipNo?: string
      isCrm: boolean
    }

    // 레거시 txHistory (현재 페이지)
    const txRows: Row[] = (txPage?.list ?? []).map((tx) => ({
      key: `tx-${tx.Id}`,
      source: 'legacy',
      recordId: tx.Id,
      date: tx.tx_date?.slice(0, 10) ?? '',
      legacyBookId: tx.legacy_book_id != null ? String(tx.legacy_book_id).trim() : '',
      txType: tx.tx_type ?? '-',
      amount: tx.amount ?? 0,
      memo: tx.memo || tx.slip_no || '-',
      slipNo: tx.slip_no ?? '',
      isCrm: false,
    }))

    // CRM v2 명세표 → 출고 행
    const invRows: Row[] = []
    for (const inv of invoiceData) {
      invRows.push({
        key: `inv-${inv.Id}`,
        source: 'crm',
        recordId: inv.Id,
        date: inv.invoice_date?.slice(0, 10) ?? '',
        txType: '출고',
        amount: inv.total_amount ?? 0,
        memo: inv.invoice_no ?? '-',
        slipNo: inv.invoice_no ?? '',
        isCrm: true,
      })
      // 입금 행 (paid_amount > 0 인 경우)
      if ((inv.paid_amount ?? 0) > 0) {
        invRows.push({
          key: `inv-paid-${inv.Id}`,
          source: 'crm',
          recordId: inv.Id,
          date: inv.invoice_date?.slice(0, 10) ?? '',
          txType: '입금',
          amount: inv.paid_amount ?? 0,
          memo: inv.invoice_no ?? '-',
          slipNo: inv.invoice_no ?? '',
          isCrm: true,
        })
      }
    }

    const legacySettlementRows: Row[] = parseLegacyReceivableMemo(customer?.memo as string | undefined).settlements.map((entry, index) => ({
      key: `legacy-settlement-${index}`,
      source: 'legacySettlement',
      recordId: -(index + 1),
      date: entry.date,
      legacyBookId: customerLegacyId,
      txType: '입금',
      amount: entry.amount,
      memo: [
        '기존 장부 미수 입금',
        entry.method ? `방법: ${entry.method}` : '',
        entry.accountLabel ? `계정: ${entry.accountLabel}` : '',
        entry.operator ? `입력: ${entry.operator}` : '',
        entry.createdAt ? `시각: ${entry.createdAt.slice(0, 16).replace('T', ' ')}` : '',
      ].filter(Boolean).join(' · '),
      slipNo: entry.createdAt ?? entry.date,
      isCrm: false,
    }))

    const legacyPayableRows: Row[] = parseLegacyPayableMemo(customer?.memo as string | undefined).settlements.map((entry, index) => ({
      key: `legacy-payable-${index}`,
      source: 'legacySettlement',
      recordId: -(10000 + index + 1),
      date: entry.date,
      legacyBookId: customerLegacyId,
      txType: '지급',
      amount: entry.amount,
      memo: [
        '기존 장부 미지급금 지급',
        entry.method ? `방법: ${entry.method}` : '',
        entry.accountLabel ? `계정: ${entry.accountLabel}` : '',
        entry.operator ? `입력: ${entry.operator}` : '',
        entry.createdAt ? `시각: ${entry.createdAt.slice(0, 16).replace('T', ' ')}` : '',
      ].filter(Boolean).join(' · '),
      slipNo: entry.createdAt ?? entry.date,
      isCrm: false,
    }))

    const accountingRows: Row[] = parseCustomerAccountingMeta(customer?.memo as string | undefined).events.map((entry, index) => {
      const txTypeMap: Record<string, string> = {
        deposit_added: '예치금 적립',
        deposit_used: '예치금 사용',
        refund_pending_added: '환불대기',
        refund_paid: '환불',
        refund_pending_cleared: '환불대기 해제',
      }
      return {
        key: `accounting-${index}`,
        source: 'legacySettlement',
        recordId: -(20000 + index + 1),
        date: entry.date,
        legacyBookId: customerLegacyId,
        txType: txTypeMap[entry.type] ?? '메모',
        amount: entry.amount,
        memo: [
          entry.type === 'deposit_added' ? '초과 입금 예치금 보관' : '',
          entry.type === 'deposit_used' ? '예치금으로 명세표 차감' : '',
          entry.type === 'refund_pending_added' ? '초과 입금 환불대기 등록' : '',
          entry.type === 'refund_paid' ? '환불 완료' : '',
          entry.type === 'refund_pending_cleared' ? '환불대기 해제' : '',
          entry.method ? `방법: ${entry.method}` : '',
          entry.accountLabel ? `계정: ${entry.accountLabel}` : '',
          entry.operator ? `입력: ${entry.operator}` : '',
          entry.relatedInvoiceId ? `명세표: #${entry.relatedInvoiceId}` : '',
          entry.note ? `메모: ${entry.note}` : '',
          entry.createdAt ? `시각: ${entry.createdAt.slice(0, 16).replace('T', ' ')}` : '',
        ].filter(Boolean).join(' · '),
        slipNo: entry.createdAt ?? entry.date,
        isCrm: false,
      }
    })

    // 날짜 내림차순 정렬 후 상위 100건
    return [...invRows, ...legacySettlementRows, ...legacyPayableRows, ...accountingRows, ...txRows]
      .sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date)
        if (dateCompare !== 0) return dateCompare
        if (a.source === 'legacySettlement' && b.source !== 'legacySettlement') return -1
        if (b.source === 'legacySettlement' && a.source !== 'legacySettlement') return 1
        return b.key.localeCompare(a.key)
      })
      .slice(0, 100)
  }, [txPage, invoiceData, customer?.memo, customerLegacyId])

  const filteredHistory = useMemo(() => {
    const keyword = historySearch.trim().toLowerCase()
    return mergedHistory.filter((row) => {
      if (historyTypeFilter !== 'ALL' && row.txType !== historyTypeFilter) return false
      if (historyDateFrom && row.date < historyDateFrom) return false
      if (historyDateTo && row.date > historyDateTo) return false
      if (!keyword) return true
      return [
        row.txType,
        row.memo,
        row.slipNo,
        row.legacyBookId,
      ].some((value) => (value ?? '').toLowerCase().includes(keyword))
    })
  }, [mergedHistory, historySearch, historyTypeFilter, historyDateFrom, historyDateTo])

  const historySummary = useMemo(() => ({
    count: filteredHistory.length,
    amount: filteredHistory.reduce((sum, row) => sum + row.amount, 0),
    crmCount: filteredHistory.filter((row) => row.isCrm).length,
    legacyCount: filteredHistory.filter((row) => !row.isCrm).length,
  }), [filteredHistory])

  function resetHistoryFilters() {
    setHistorySearch('')
    setHistoryTypeFilter('ALL')
    setHistoryDateFrom(thisMonthStart())
    setHistoryDateTo(todayStr())
  }

  function exportHistoryRows() {
    exportUnifiedTransactions(
      filteredHistory.map((row) => ({
        date: row.date,
        customerName: customer?.name ?? '',
        txType: row.txType,
        amount: row.amount,
        slipNo: row.slipNo,
        memo: row.memo,
        sourceLabel: row.isCrm ? '새 입력' : '기존 장부',
      })),
      `${customer?.name ?? '고객'}_거래내역`,
    )
  }

  // ── 차트 데이터 ───────────────────────────────────────
  const chartData = (() => {
    const byYear: Record<string, number> = {}
    txAll?.list.forEach((tx) => {
      const year = (tx.tx_date ?? '').slice(0, 4)
      if (year) byYear[year] = (byYear[year] ?? 0) + (tx.amount ?? 0)
    })
    return Object.entries(byYear)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, amount]) => ({ year, amount }))
  })()

  const todayResolvedInvoices = useMemo(
    () => buildResolvedReceivableInvoices(invoiceData, customerLinks, todayStr()),
    [invoiceData, customerLinks],
  )

  if (isLoading) {
    return (
      <div className="p-6 text-muted-foreground flex items-center gap-2">
        <span className="animate-spin">⏳</span> 불러오는 중...
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/customers')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> 목록으로
        </Button>
        <p className="mt-4 text-red-500">고객 정보를 찾을 수 없습니다.</p>
      </div>
    )
  }

  const status = customer.customer_status
  const effectiveGrade = customer.is_ambassador ? 'AMBASSADOR' : (customer.member_grade ?? '')
  const outstandingBalance = (customer.outstanding_balance as number | undefined) ?? 0
  const { snapshot: legacyTradebook, matchReason: legacyTradebookMatchReason } = deriveLegacyTradebookSnapshot(customer, legacySnapshots)
  const legacyCustomerList = (customer.name ? legacySnapshots?.customerListByName?.[customer.name] : undefined) ?? []
  const legacyBalanceBaseline = getLegacyReceivableBaselineFromSnapshots(customer, legacySnapshots, fiscalSnapshots)
  const currentLegacyReceivable = getLegacyReceivableBaselineFromSnapshots(customer, legacySnapshots, fiscalSnapshots)
  const currentLegacyPayable = getLegacyPayableBaselineFromSnapshots(customer, legacySnapshots, fiscalSnapshots)
  const legacyMemoState = parseLegacyReceivableMemo(customer.memo as string | undefined)
  const legacyPayableMemoState = parseLegacyPayableMemo(customer.memo as string | undefined)
  const customerAccountingMeta = parseCustomerAccountingMeta(customer.memo as string | undefined)
  const activeOperatorProfile = loadActiveWorkOperatorProfile()
  const crmOutstandingBalance = todayResolvedInvoices.reduce((sum, invoice) => sum + invoice.asOfRemaining, 0)
  const customerDisplayMemo = getDisplayMemo(customer.memo as string | undefined)
  const invoiceNameVariants = Array.from(
    new Set(
      invoiceData
        .map((invoice) => invoice.customer_name?.trim())
        .filter((name): name is string => Boolean(name && name !== customer.name)),
    ),
  )

  async function refreshCustomerViews() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] }),
      queryClient.invalidateQueries({ queryKey: ['customers'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions-customer-directory'] }),
      queryClient.invalidateQueries({ queryKey: ['customer-detail-link-customers'] }),
      queryClient.invalidateQueries({ queryKey: ['receivables'] }),
      queryClient.invalidateQueries({ queryKey: ['receivable-link-customers'] }),
      queryClient.invalidateQueries({ queryKey: ['receivable-customer-breakdown', String(customerId)] }),
      queryClient.invalidateQueries({ queryKey: ['dash-receivables'] }),
      queryClient.invalidateQueries({ queryKey: ['dash-payable-customers'] }),
    ])
    await queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0]
        return typeof key === 'string' && (key.startsWith('dash-') || key.startsWith('period-') || key.startsWith('calendar-'))
      },
    })
  }

  async function handleLegacyPaymentSave() {
    const amount = Math.trunc(Number(legacyPaymentAmount))
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('입금액을 입력해주세요')
      return
    }
    if (amount > currentLegacyReceivable) {
      toast.error(`기존 장부 미수금(${currentLegacyReceivable.toLocaleString()}원)보다 많이 입금할 수 없습니다.`)
      return
    }

    setSavingLegacyPayment(true)
    try {
      const activeOperator = loadActiveWorkOperatorProfile()
      const nextSettlements = [
        ...legacyMemoState.settlements,
        {
          amount,
          date: todayStr(),
          method: legacyPaymentMethod,
          accountId: activeOperator?.id,
          accountLabel: activeOperator?.label,
          operator: activeOperator?.operatorName,
          createdAt: currentTimestamp(),
        },
      ]
      const nextMemo = serializeLegacyReceivableMemo(customer!.memo as string | undefined, {
        settledAmount: legacyMemoState.settledAmount + amount,
        settlements: nextSettlements,
      })
      await updateCustomer(customerId, { memo: nextMemo })
      await recalcCustomerStats(customerId)
      await refreshCustomerViews()
      setLegacyPaymentAmount('')
      toast.success('기존 장부 입금이 반영되었습니다')
    } catch (error) {
      console.error(error)
      toast.error('기존 장부 입금 처리 중 오류가 발생했습니다')
    } finally {
      setSavingLegacyPayment(false)
    }
  }

  async function handleLegacySettlementCancel(index: number) {
    const settlement = legacyMemoState.settlements[index]
    if (!settlement) return
    if (!confirm(`${settlement.date} ${settlement.amount.toLocaleString()}원 입금 기록을 취소하시겠습니까?`)) return

    setSavingLegacyPayment(true)
    setEditingLegacySettlementIndex(index)
    try {
      const nextSettlements = legacyMemoState.settlements.filter((_, settlementIndex) => settlementIndex !== index)
      const nextMemo = serializeLegacyReceivableMemo(customer!.memo as string | undefined, {
        settledAmount: nextSettlements.reduce((sum, entry) => sum + entry.amount, 0),
        settlements: nextSettlements,
      })
      await updateCustomer(customerId, { memo: nextMemo })
      await recalcCustomerStats(customerId)
      await refreshCustomerViews()
      toast.success('기존 장부 입금 기록을 취소했습니다')
    } catch (error) {
      console.error(error)
      toast.error('기존 장부 입금 기록 취소 중 오류가 발생했습니다')
    } finally {
      setSavingLegacyPayment(false)
      setEditingLegacySettlementIndex(null)
    }
  }

  async function handleLegacyPayableSave() {
    const amount = Math.trunc(Number(legacyPayableAmount))
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('지급액을 입력해주세요')
      return
    }
    if (amount > currentLegacyPayable) {
      toast.error(`기존 장부 미지급금(${currentLegacyPayable.toLocaleString()}원)보다 많이 지급할 수 없습니다.`)
      return
    }

    setSavingLegacyPayment(true)
    try {
      const activeOperator = loadActiveWorkOperatorProfile()
      const nextSettlements = [
        ...legacyPayableMemoState.settlements,
        {
          amount,
          date: todayStr(),
          method: legacyPayableMethod,
          accountId: activeOperator?.id,
          accountLabel: activeOperator?.label,
          operator: activeOperator?.operatorName,
          createdAt: currentTimestamp(),
        },
      ]
      const nextMemo = serializeLegacyPayableMemo(customer!.memo as string | undefined, {
        settledAmount: legacyPayableMemoState.settledAmount + amount,
        settlements: nextSettlements,
      })
      await updateCustomer(customerId, { memo: nextMemo })
      await refreshCustomerViews()
      setLegacyPayableAmount('')
      toast.success('기존 장부 지급이 반영되었습니다')
    } catch (error) {
      console.error(error)
      toast.error('기존 장부 지급 처리 중 오류가 발생했습니다')
    } finally {
      setSavingLegacyPayment(false)
    }
  }

  async function handleLegacyPayableCancel(index: number) {
    const settlement = legacyPayableMemoState.settlements[index]
    if (!settlement) return
    if (!confirm(`${settlement.date} ${settlement.amount.toLocaleString()}원 지급 기록을 취소하시겠습니까?`)) return

    setSavingLegacyPayment(true)
    setEditingLegacyPayableIndex(index)
    try {
      const nextSettlements = legacyPayableMemoState.settlements.filter((_, settlementIndex) => settlementIndex !== index)
      const nextMemo = serializeLegacyPayableMemo(customer!.memo as string | undefined, {
        settledAmount: nextSettlements.reduce((sum, entry) => sum + entry.amount, 0),
        settlements: nextSettlements,
      })
      await updateCustomer(customerId, { memo: nextMemo })
      await refreshCustomerViews()
      toast.success('기존 장부 지급 기록을 취소했습니다')
    } catch (error) {
      console.error(error)
      toast.error('기존 장부 지급 기록 취소 중 오류가 발생했습니다')
    } finally {
      setSavingLegacyPayment(false)
      setEditingLegacyPayableIndex(null)
    }
  }

  return (
    <div className="p-6">
      {/* 뒤로 가기 */}
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => navigate('/customers')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> 목록으로
      </Button>

      {/* 헤더 */}
      <div className="flex items-start gap-6 mb-6 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold">{customer.name}</h2>
            {status && STATUS_COLORS[status] && (
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: STATUS_COLORS[status].bg }}
              >
                {STATUS_COLORS[status].label}
              </span>
            )}
            {effectiveGrade && GRADE_COLORS[effectiveGrade] && (
              <span
                className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: GRADE_COLORS[effectiveGrade].bg, color: GRADE_COLORS[effectiveGrade].text }}
              >
                {effectiveGrade === 'AMBASSADOR' && '★'}
                {GRADE_COLORS[effectiveGrade].label}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {CUSTOMER_TYPE_LABELS[customer.customer_type ?? ''] ?? customer.customer_type ?? '유형 미분류'}
          </p>
        </div>

        {/* 요약 stat 카드 */}
        <div className="flex gap-3 flex-wrap">
          <div className="bg-white rounded-lg border px-4 py-3 text-center min-w-[120px]">
            <p className="text-xs text-muted-foreground mb-0.5">총 거래 건수</p>
            <p className="text-lg font-bold">{(customer.total_order_count ?? 0).toLocaleString()}건</p>
          </div>
          <div className="bg-white rounded-lg border px-4 py-3 text-center min-w-[120px]">
            <p className="text-xs text-muted-foreground mb-0.5">총 매출</p>
            <p className="text-lg font-bold">{(customer.total_order_amount ?? 0).toLocaleString()}원</p>
          </div>
          <div className="bg-white rounded-lg border px-4 py-3 text-center min-w-[120px] relative group">
            <p className="text-xs text-muted-foreground mb-0.5">현재 잔액</p>
            <p className={`text-lg font-bold ${outstandingBalance > 0 ? 'text-red-600' : ''}`}>
              {outstandingBalance.toLocaleString()}원
            </p>
            <button
              onClick={() => recalcBalance()}
              disabled={recalcing}
              title="새 입력 + 기존 장부 기준 통계 재계산 (미수금·총매출·최종거래일)"
              className="absolute top-1.5 right-1.5 p-1 rounded-full text-muted-foreground hover:text-[#3d6b4a] hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <RefreshCw className={`h-3 w-3 ${recalcing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-5">
        <div className="rounded-lg border bg-white px-4 py-3">
          <p className="text-xs text-muted-foreground">이월 미수</p>
          <p className={`mt-1 text-base font-semibold ${legacyBalanceBaseline > 0 ? 'text-red-600' : legacyBalanceBaseline < 0 ? 'text-blue-700' : ''}`}>
            {legacyBalanceBaseline.toLocaleString()}원
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            얼마에요 거래처 원본 잔액
          </p>
        </div>
        <div className="rounded-lg border bg-white px-4 py-3">
          <p className="text-xs text-muted-foreground">새 입력 미수</p>
          <p className={`mt-1 text-base font-semibold ${crmOutstandingBalance > 0 ? 'text-red-600' : crmOutstandingBalance < 0 ? 'text-blue-700' : ''}`}>
            {crmOutstandingBalance.toLocaleString()}원
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            새 입력 명세표 기준 미수 증감분
          </p>
        </div>
        <div className="rounded-lg border border-[#d9e4d5] bg-[#f7faf6] px-4 py-3">
          <p className="text-xs text-muted-foreground">현재 운영 잔액</p>
          <p className={`mt-1 text-base font-semibold ${outstandingBalance > 0 ? 'text-red-600' : outstandingBalance < 0 ? 'text-blue-700' : ''}`}>
            {outstandingBalance.toLocaleString()}원
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            이월 미수 + 새 입력 미수
          </p>
        </div>
        <div className="rounded-lg border bg-white px-4 py-3">
          <p className="text-xs text-muted-foreground">예치금</p>
          <p className={`mt-1 text-base font-semibold ${customerAccountingMeta.depositBalance > 0 ? 'text-emerald-700' : ''}`}>
            {customerAccountingMeta.depositBalance.toLocaleString()}원
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            다음 주문에 차감할 선입금
          </p>
        </div>
        <div className="rounded-lg border bg-white px-4 py-3">
          <p className="text-xs text-muted-foreground">환불대기</p>
          <p className={`mt-1 text-base font-semibold ${customerAccountingMeta.refundPendingBalance > 0 ? 'text-amber-700' : ''}`}>
            {customerAccountingMeta.refundPendingBalance.toLocaleString()}원
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            고객에게 돌려줄 예정 금액
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => navigate(`/receivables?customer=${encodeURIComponent(customer.name ?? '')}&customerId=${customerId}`)}>
          수금 관리
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate(`/payables?customer=${encodeURIComponent(customer.name ?? '')}&customerId=${customerId}&tab=payable`)}>
          지급 관리
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate(`/transactions?customer=${encodeURIComponent(customer.name ?? '')}`)}>
          거래/명세표 조회
        </Button>
        <Button size="sm" className="bg-[#7d9675] hover:bg-[#6a8462] text-white" onClick={() => navigate('/invoices?new=1')}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          명세표 작성
        </Button>
      </div>

      {((customer.book_name && customer.book_name !== customer.name) || invoiceNameVariants.length > 0) && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">얼마에요 구분명 유지</p>
          <div className="mt-2 space-y-1 text-sm text-amber-900">
            {customer.book_name && customer.book_name !== customer.name && (
              <div>장부명: {customer.book_name}</div>
            )}
            {invoiceNameVariants.length > 0 && (
              <div>명세표 표기명: {invoiceNameVariants.join(', ')}</div>
            )}
          </div>
          <p className="mt-2 text-xs text-amber-800">
            대납, 지점 구분, 입금 주체 분리 같은 이유로 고객명과 다른 거래명이 유지될 수 있습니다.
          </p>
        </div>
      )}

      {/* 탭 */}
      <Tabs defaultValue="info">
        <TabsList className="mb-4">
          <TabsTrigger value="info">기본정보</TabsTrigger>
          <TabsTrigger value="history">거래내역</TabsTrigger>
          <TabsTrigger value="chart">매출차트</TabsTrigger>
          <TabsTrigger value="invoices">명세표 · 기간매출</TabsTrigger>
          <TabsTrigger value="legacy">기존 장부 원본</TabsTrigger>
        </TabsList>

        {/* ─── 기본정보 ─── */}
        <TabsContent value="info">
          <Card>
            <CardContent className="pt-6">
              {/* ── 헤더: 수정 버튼 ── */}
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-muted-foreground">연락처 · 사업자 정보</h4>
                {!infoEditMode ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => {
                      setInfoForm(buildInfoForm(customer))
                      setInfoEditMode(true)
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    수정
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveInfo()} disabled={savingInfo}>
                      {savingInfo ? '저장 중...' : '저장'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setInfoEditMode(false)}>
                      취소
                    </Button>
                  </div>
                )}
              </div>

              {/* ── 읽기 모드 ── */}
              {!infoEditMode ? (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  {[
                    { label: '전화', value: customer.phone ?? customer.phone1 },
                    { label: '모바일', value: (customer.mobile as string) },
                    { label: '이메일', value: customer.email },
                    { label: '사업자번호', value: customer.biz_no },
                    { label: '담당자', value: (customer.ceo_name as string) },
                    { label: '업태/종목', value: [(customer.biz_type as string), (customer.biz_item as string)].filter(Boolean).join(' / ') || undefined },
                    { label: '고객유형', value: CUSTOMER_TYPE_LABELS[customer.customer_type ?? ''] ?? customer.customer_type },
                    { label: '상태', value: STATUS_COLORS[customer.customer_status ?? '']?.label ?? customer.customer_status },
                    { label: '단가등급', value: customer.price_tier ? `Tier ${customer.price_tier}` : undefined },
                    { label: '최초거래일', value: customer.first_order_date?.slice(0, 10) },
                    { label: '최종거래일', value: customer.last_order_date?.slice(0, 10) },
                    { label: '입금자명 별칭', value: customerAccountingMeta.depositorAliases.join(', ') },
                    { label: '자동입금 제외', value: customerAccountingMeta.autoDepositDisabled ? '예' : '아니오' },
                    { label: '자동입금 우선순위', value: customerAccountingMeta.autoDepositPriority > 0 ? `${customerAccountingMeta.autoDepositPriority}` : undefined },
                    { label: '메모', value: customerDisplayMemo },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col gap-0.5">
                      <dt className="font-medium text-muted-foreground text-xs">{label}</dt>
                      <dd className="text-sm">{value || <span className="text-muted-foreground">-</span>}</dd>
                    </div>
                  ))}
                  {/* 주소 목록 */}
                  {(() => {
                    const addrs: string[] = []
                    for (let i = 1; i <= MAX_ADDRESS_FIELDS; i++) {
                      const v = customer[`address${i}`] as string | undefined
                      if (v) addrs.push(v)
                    }
                    if (addrs.length === 0) return (
                      <div className="flex flex-col gap-0.5 sm:col-span-2">
                        <dt className="font-medium text-muted-foreground text-xs">주소</dt>
                        <dd className="text-sm text-muted-foreground">-</dd>
                      </div>
                    )
                    return (
                      <div className="flex flex-col gap-1 sm:col-span-2">
                        <dt className="font-medium text-muted-foreground text-xs">주소</dt>
                        {addrs.map((addr, i) => (
                          <dd key={i} className="text-sm">{i > 0 && <span className="text-muted-foreground text-xs mr-1">(배송지{i + 1})</span>}{addr}</dd>
                        ))}
                      </div>
                    )
                  })()}
                </dl>
              ) : (
                /* ── 편집 모드 ── */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: '거래처명', key: 'name' as const, placeholder: '회사명 또는 이름' },
                      { label: '전화', key: 'phone' as const, placeholder: '02-0000-0000' },
                      { label: '모바일', key: 'mobile' as const, placeholder: '010-0000-0000' },
                      { label: '이메일', key: 'email' as const, placeholder: 'user@example.com' },
                      { label: '사업자번호', key: 'biz_no' as const, placeholder: '000-00-00000' },
                      { label: '담당자', key: 'ceo_name' as const, placeholder: '홍길동' },
                      { label: '업태', key: 'biz_type' as const, placeholder: '도소매' },
                      { label: '종목', key: 'biz_item' as const, placeholder: '꽃 공예 재료' },
                    ].map(({ label, key, placeholder }) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs">{label}</Label>
                        <Input
                          value={infoForm[key]}
                          onChange={(e) => setInfoForm((f) => ({ ...f, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>

                  {/* 고객유형/상태/단가등급 */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">고객 유형</Label>
                      <Select value={infoForm.customer_type || '_NONE_'} onValueChange={(v) => setInfoForm((f) => ({ ...f, customer_type: v === '_NONE_' ? '' : v }))}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_NONE_">유형 없음</SelectItem>
                          {Object.entries(CUSTOMER_TYPE_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">상태</Label>
                      <Select value={infoForm.customer_status || '_NONE_'} onValueChange={(v) => setInfoForm((f) => ({ ...f, customer_status: v === '_NONE_' ? '' : v }))}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_NONE_">상태 없음</SelectItem>
                          <SelectItem value="ACTIVE">활성</SelectItem>
                          <SelectItem value="DORMANT">휴면</SelectItem>
                          <SelectItem value="CHURNED">이탈</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">단가등급</Label>
                      <Select value={infoForm.price_tier} onValueChange={(v) => setInfoForm((f) => ({ ...f, price_tier: v }))}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[['1','씨앗(소매)'],['2','뿌리(강사)'],['3','꽃밭(파트너)'],['4','정원사(VIP)'],['5','별빛(앰배)']].map(([v, l]) => (
                            <SelectItem key={v} value={v}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 동적 주소 목록 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">주소 목록</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs gap-1"
                        onClick={() => setInfoForm((f) => ({ ...f, addresses: [...f.addresses, ''] }))}
                        disabled={infoForm.addresses.length >= MAX_ADDRESS_FIELDS}
                      >
                        <Plus className="h-3 w-3" />
                        주소 추가
                      </Button>
                    </div>
                    {infoForm.addresses.map((addr, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <span className="text-xs text-muted-foreground w-16 shrink-0">
                          {idx === 0 ? '기본 주소' : `배송지 ${idx + 1}`}
                        </span>
                        <Input
                          value={addr}
                          onChange={(e) => {
                            const next = [...infoForm.addresses]
                            next[idx] = e.target.value
                            setInfoForm((f) => ({ ...f, addresses: next }))
                          }}
                          placeholder={`주소 ${idx + 1}`}
                          className="h-8 text-sm flex-1"
                        />
                        {infoForm.addresses.length > 1 && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-red-500"
                            onClick={() => setInfoForm((f) => ({ ...f, addresses: f.addresses.filter((_, i) => i !== idx) }))}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 메모 */}
                  <div className="space-y-1">
                    <Label className="text-xs">입금자명 별칭</Label>
                    <Textarea
                      value={infoForm.depositorAliases}
                      onChange={(e) => setInfoForm((f) => ({ ...f, depositorAliases: e.target.value }))}
                      placeholder={'예: 김순자\n정부지원금\n서상견(단양)'}
                      className="text-sm resize-none"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      실제 입금자명이 고객명과 다를 때 한 줄씩 추가하세요. 자동입금 매칭에 우선 사용됩니다.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2 rounded-lg border border-dashed border-slate-200 px-3 py-3">
                      <div className="space-y-1">
                        <Label className="text-xs">자동입금 제외</Label>
                        <p className="text-xs text-muted-foreground">
                          거래종료 고객이나 자동 매칭되면 안 되는 고객은 제외로 두세요.
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={infoForm.autoDepositDisabled}
                          onChange={(e) => setInfoForm((f) => ({ ...f, autoDepositDisabled: e.target.checked }))}
                        />
                        자동입금 후보에서 제외
                      </label>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">자동입금 우선순위</Label>
                      <Input
                        value={infoForm.autoDepositPriority}
                        onChange={(e) => setInfoForm((f) => ({ ...f, autoDepositPriority: e.target.value.replace(/[^0-9]/g, '') }))}
                        placeholder="기본 0, 숫자가 클수록 우선"
                        className="h-8 text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        같은 이름 후보가 여러 명이면 높은 우선순위 고객을 먼저 추천합니다.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">메모</Label>
                    <Textarea
                      value={infoForm.memo}
                      onChange={(e) => setInfoForm((f) => ({ ...f, memo: e.target.value }))}
                      placeholder="고객 메모"
                      className="text-sm resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {/* 등급 관리 */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold">회원 등급</h4>
                  {!gradeEditMode && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditGrade(effectiveGrade || '_NONE_')
                        setEditQual((customer.grade_qualification as string) ?? '')
                        setGradeEditMode(true)
                      }}
                    >
                      변경
                    </Button>
                  )}
                </div>

                {gradeEditMode ? (
                  <div className="space-y-3">
                    <Select value={editGrade} onValueChange={setEditGrade}>
                      <SelectTrigger>
                        <SelectValue placeholder="등급 선택 (없으면 비워두세요)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_NONE_">등급 없음</SelectItem>
                        {Object.entries(GRADE_COLORS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {k === 'AMBASSADOR' ? `★ ${v.label}` : v.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="자격 근거 (예: 파트너 계약 완료 2024-01, VIP 기준 충족)"
                      value={editQual}
                      onChange={(e) => setEditQual(e.target.value)}
                      className="text-sm resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveGrade()} disabled={savingGrade}>
                        {savingGrade ? '저장 중...' : '저장'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setGradeEditMode(false)}>
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm">
                    {effectiveGrade && GRADE_COLORS[effectiveGrade] ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: GRADE_COLORS[effectiveGrade].bg, color: GRADE_COLORS[effectiveGrade].text }}
                        >
                          {effectiveGrade === 'AMBASSADOR' && '★'}
                          {GRADE_COLORS[effectiveGrade].label}
                        </span>
                        {(customer.grade_qualification as string) && (
                          <span className="text-muted-foreground text-xs">
                            {customer.grade_qualification as string}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">등급 없음</span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── 거래내역 (CRM v2 명세표 + 레거시 txHistory 병합) ─── */}
        <TabsContent value="history">
          <div className="mb-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs space-y-1">
            <p className="font-medium text-blue-800">거래내역 기재 기준</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-blue-700 mt-1">
              <span><span className="font-medium">출고</span> — 거래명세표 발행 (CRM) 또는 기존 출고 기록</span>
              <span><span className="font-medium">입금</span> — 수금 처리 시 (명세표의 입금액 또는 기존 장부 수금)</span>
              <span><span className="font-medium">지급</span> — 기존 장부 미지급금 지급 처리</span>
              <span><span className="font-medium">예치금 적립</span> — 초과 입금을 다음 주문용으로 보관</span>
              <span><span className="font-medium">환불대기</span> — 초과 입금을 돌려주기 전 임시 보관</span>
              <span><span className="font-medium">반입</span> — 반품/반입 건 (기존 장부 데이터)</span>
              <span><span className="font-medium">메모</span> — 참고사항 기재 (기존 장부 데이터)</span>
            </div>
            <p className="text-blue-600 pt-0.5">
              <span className="font-medium">[CRM]</span> 배지 = 이 시스템에서 발행한 명세표 · 배지 없음 = 기존 거래 데이터
            </p>
            <p className="text-blue-600">행을 클릭하면 당시 거래 상세를 바로 확인할 수 있습니다.</p>
          </div>
          <div className="mb-4 rounded-lg border bg-white p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <div>
                <p className="text-sm font-medium">기간별 거래내역 조회</p>
                <p className="text-xs text-muted-foreground">
                  고객별 거래를 기간, 유형, 키워드로 나눠 조회하고 현재 보이는 결과를 바로 다운로드할 수 있습니다.
                </p>
              </div>
              <Button size="sm" variant="outline" className="gap-1" onClick={exportHistoryRows} disabled={filteredHistory.length === 0}>
                <Download className="h-3.5 w-3.5" />
                거래내역 다운로드
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() =>
                  printCustomerTransactionStatement(
                    customer?.name ?? '',
                    historyDateFrom,
                    historyDateTo,
                    filteredHistory.map((row) => ({
                      date: row.date,
                      txType: row.txType,
                      amount: row.amount,
                      slipNo: row.slipNo,
                      memo: row.memo,
                      sourceLabel: row.isCrm ? '새 입력' : '기존 장부',
                    })),
                  )
                }
                disabled={filteredHistory.length === 0}
              >
                <Printer className="h-3.5 w-3.5" />
                고객 제출용 인쇄
              </Button>
            </div>
            <div className="flex gap-3 flex-wrap items-center">
              <div className="relative min-w-[220px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="전표번호 / 메모 / 유형 검색"
                  className="pl-9"
                />
              </div>
              <Select value={historyTypeFilter} onValueChange={setHistoryTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="유형 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">모든 유형</SelectItem>
                  <SelectItem value="출고">출고</SelectItem>
                  <SelectItem value="입금">입금</SelectItem>
                  <SelectItem value="지급">지급</SelectItem>
                  <SelectItem value="예치금 적립">예치금 적립</SelectItem>
                  <SelectItem value="예치금 사용">예치금 사용</SelectItem>
                  <SelectItem value="환불대기">환불대기</SelectItem>
                  <SelectItem value="환불">환불</SelectItem>
                  <SelectItem value="반입">반입</SelectItem>
                  <SelectItem value="메모">메모</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={historyDateFrom}
                onChange={(e) => setHistoryDateFrom(e.target.value)}
                className="w-[160px]"
              />
              <span className="text-sm text-muted-foreground">~</span>
              <Input
                type="date"
                value={historyDateTo}
                onChange={(e) => setHistoryDateTo(e.target.value)}
                className="w-[160px]"
              />
              <Button size="sm" variant="ghost" onClick={resetHistoryFilters}>
                초기화
              </Button>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <div className="rounded-md bg-gray-50 px-3 py-2">
                <p className="text-xs text-muted-foreground">조회 건수</p>
                <p className="mt-1 text-sm font-semibold">{historySummary.count.toLocaleString()}건</p>
              </div>
              <div className="rounded-md bg-gray-50 px-3 py-2">
                <p className="text-xs text-muted-foreground">거래 금액 합계</p>
                <p className="mt-1 text-sm font-semibold">{historySummary.amount.toLocaleString()}원</p>
              </div>
              <div className="rounded-md bg-gray-50 px-3 py-2">
                <p className="text-xs text-muted-foreground">CRM 행</p>
                <p className="mt-1 text-sm font-semibold">{historySummary.crmCount.toLocaleString()}건</p>
              </div>
              <div className="rounded-md bg-gray-50 px-3 py-2">
                <p className="text-xs text-muted-foreground">기존 장부 행</p>
                <p className="mt-1 text-sm font-semibold">{historySummary.legacyCount.toLocaleString()}건</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-28">거래일</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">유형</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">적요 / 전표번호</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground w-32">금액</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground">
                      조건에 맞는 거래내역이 없습니다.
                    </td>
                  </tr>
                )}
                {filteredHistory.map((row) => (
                  <tr
                    key={row.key}
                    className="border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setSelectedTransaction({
                      source: row.source,
                      recordId: row.recordId,
                      date: row.date,
                      customerName: customer.name ?? '',
                      customerId,
                      legacyBookId: row.legacyBookId,
                      txType: row.txType,
                      amount: row.amount,
                      slipNo: row.slipNo,
                      memo: row.memo,
                    })}
                  >
                    <td className="px-4 py-2.5 text-sm">{row.date || '-'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TX_TYPE_STYLE[row.txType] ?? 'bg-gray-50 text-gray-600'}`}>
                        {row.txType}
                      </span>
                      {row.isCrm && (
                        <span className="ml-1 text-xs px-1 py-0.5 rounded bg-[#e8f0e8] text-[#3d6b4a] border border-[#b8d4b8]">
                          CRM
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                      {row.memo}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      {row.amount.toLocaleString()}원
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* 레거시 txHistory 페이지네이션 */}
          {txPage && txPage.pageInfo.totalRows > TX_PAGE && (
            <div className="flex items-center justify-between mt-3">
              <span className="text-sm text-muted-foreground">
                기존 장부 데이터 {txOffset + 1}–{Math.min(txOffset + TX_PAGE, txPage.pageInfo.totalRows)} /{' '}
                {txPage.pageInfo.totalRows}건
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={txOffset === 0}
                  onClick={() => setTxOffset((o) => Math.max(0, o - TX_PAGE))}
                >
                  이전
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={txOffset + TX_PAGE >= txPage.pageInfo.totalRows}
                  onClick={() => setTxOffset((o) => o + TX_PAGE)}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── 매출차트 ─── */}
        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">연도별 출고 매출 (기존 장부)</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground">차트 데이터가 없습니다.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                    <YAxis
                      tickFormatter={(v) => `${Math.round(v / 10000)}만`}
                      tick={{ fontSize: 11 }}
                      width={55}
                    />
                    <Tooltip
                      formatter={(v: number | undefined) => [`${(v ?? 0).toLocaleString()}원`, '출고 매출']}
                    />
                    <Bar dataKey="amount" fill="#7d9675" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                * 기존 장부 출고 건 기준 집계. 최대 1,000건까지 표시됩니다.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── 명세표 · 기간 매출 ─── */}
        <TabsContent value="invoices">
          {/* 기간 필터 */}
          <div className="bg-white rounded-lg border p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">기간 매출 조회</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-7 text-xs"
                onClick={() =>
                  printPeriodReport(
                    customer.name ?? '',
                    dateFrom,
                    dateTo,
                    filteredInvoices.map((inv) => ({
                      invoice_no: inv.invoice_no,
                      invoice_date: inv.invoice_date,
                      supply_amount: inv.supply_amount,
                      total_amount: inv.total_amount,
                      paid_amount: inv.paid_amount,
                      status: inv.payment_status,
                    })),
                    filteredLegacyTx.map((tx) => ({
                      tx_date: tx.tx_date,
                      tx_type: tx.tx_type,
                      memo: tx.memo,
                      slip_no: tx.slip_no,
                      amount: tx.amount,
                    })),
                    periodStats,
                  )
                }
              >
                <Printer className="h-3.5 w-3.5" />
                PDF 출력
              </Button>
            </div>

            {/* 프리셋 버튼 */}
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { label: '이번달', preset: 'thisMonth' as const },
                { label: '지난달', preset: 'lastMonth' as const },
                { label: '이번분기', preset: 'thisQuarter' as const },
                { label: '올해', preset: 'thisYear' as const },
              ].map(({ label, preset }) => (
                <Button
                  key={preset}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => applyPreset(preset)}
                >
                  {label}
                </Button>
              ))}
            </div>

            {/* 날짜 직접 입력 */}
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 text-sm w-36"
              />
              <span className="text-muted-foreground text-sm">~</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 text-sm w-36"
              />
            </div>

            {/* KPI 카드 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {[
                {
                  label: '합계 매출',
                  value: `${periodStats.totalSales.toLocaleString()}원`,
                  sub: `새 입력 ${periodStats.crmCount}건 + 기존 장부 ${periodStats.legacyCount}건`,
                  red: false,
                },
                { label: '새 입력 명세표', value: `${periodStats.crmSales.toLocaleString()}원`, sub: `${periodStats.crmCount}건`, red: false },
                { label: '기존 장부 출고', value: `${periodStats.legacySales.toLocaleString()}원`, sub: `${periodStats.legacyCount}건 (최대 1,000건)`, red: false },
                {
                  label: '기간 미수금',
                  value: `${periodStats.outstanding.toLocaleString()}원`,
                  sub: '새 입력 명세표 기준',
                  red: periodStats.outstanding > 0,
                },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-gray-50 px-3 py-2.5 text-center">
                  <p className="text-xs text-muted-foreground mb-0.5">{s.label}</p>
                  <p className={`text-base font-bold ${s.red ? 'text-red-600' : 'text-gray-900'}`}>
                    {s.value}
                  </p>
                  {s.sub && <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* CRM 명세표 목록 */}
          <div className="rounded-lg border bg-white overflow-hidden mb-4">
              <div className="px-4 py-2.5 border-b bg-gray-50 flex items-center gap-2">
                <span className="text-xs font-semibold text-[#3d6b4a]">새 입력 거래명세표</span>
              <span className="text-xs text-muted-foreground">{filteredInvoices.length}건</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">발행번호</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">발행일</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">공급가</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">합계</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">입금</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">수금</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-muted-foreground text-xs">
                      해당 기간에 발행된 명세표가 없습니다.
                    </td>
                  </tr>
                )}
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv.Id}
                    className="border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setSelectedTransaction({
                      source: 'crm',
                      recordId: inv.Id,
                      date: inv.invoice_date?.slice(0, 10) ?? '',
                      customerName: inv.customer_name ?? customer.name ?? '',
                      customerId: typeof inv.customer_id === 'number' ? inv.customer_id : customerId,
                      txType: '출고',
                      amount: inv.total_amount ?? 0,
                      tax: inv.tax_amount ?? 0,
                      slipNo: inv.invoice_no,
                      memo: getDisplayMemo(inv.memo as string | undefined),
                    })}
                  >
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                      {inv.invoice_no ?? '-'}
                    </td>
                    <td className="px-4 py-2 text-sm">{inv.invoice_date?.slice(0, 10) ?? '-'}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-sm">
                      {(inv.supply_amount ?? 0).toLocaleString()}원
                    </td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums text-sm">
                      {(inv.total_amount ?? 0).toLocaleString()}원
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-sm text-green-700">
                      {(inv.paid_amount ?? 0) > 0 ? `${(inv.paid_amount ?? 0).toLocaleString()}원` : '-'}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-xs font-medium ${
                          inv.payment_status === 'paid'
                            ? 'text-green-600'
                            : inv.payment_status === 'partial'
                            ? 'text-amber-600'
                            : 'text-red-600'
                        }`}
                      >
                        {inv.payment_status === 'paid' ? '완납' : inv.payment_status === 'partial' ? '부분수금' : '미수금'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 레거시 거래내역 목록 (출고) */}
          {filteredLegacyTx.length > 0 && (
            <div className="rounded-lg border bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b bg-gray-50 flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">기존 장부 출고 내역</span>
                <span className="text-xs text-muted-foreground">{filteredLegacyTx.length}건</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/50">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">거래일</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">적요 / 전표번호</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">금액</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLegacyTx.map((tx) => (
                    <tr key={tx.Id} className="border-b last:border-b-0">
                      <td className="px-4 py-2 text-sm">{(tx.tx_date ?? '').slice(0, 10) || '-'}</td>
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                        {tx.memo || tx.slip_no || '-'}
                      </td>
                      <td className="px-4 py-2 text-right font-medium tabular-nums text-sm">
                        {(tx.amount ?? 0).toLocaleString()}원
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="legacy">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">기존 장부 미수 관리</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-lg border bg-white px-4 py-3">
                    <p className="text-xs text-muted-foreground">기존 장부 원본 미수</p>
                    <p className={`mt-1 text-base font-semibold ${legacyBalanceBaseline > 0 ? 'text-red-600' : ''}`}>
                      {legacyBalanceBaseline.toLocaleString()}원
                    </p>
                  </div>
                  <div className="rounded-lg border bg-white px-4 py-3">
                    <p className="text-xs text-muted-foreground">현재 기존 장부 미지급금</p>
                    <p className={`mt-1 text-base font-semibold ${currentLegacyPayable > 0 ? 'text-blue-700' : 'text-muted-foreground'}`}>
                      {currentLegacyPayable.toLocaleString()}원
                    </p>
                  </div>
                  <div className="rounded-lg border bg-white px-4 py-3">
                    <p className="text-xs text-muted-foreground">누적 입금 반영</p>
                    <p className="mt-1 text-base font-semibold text-green-700">
                      {legacyMemoState.settledAmount.toLocaleString()}원
                    </p>
                  </div>
                  <div className="rounded-lg border bg-[#f7faf6] px-4 py-3">
                    <p className="text-xs text-muted-foreground">현재 기존 장부 미수</p>
                    <p className={`mt-1 text-base font-semibold ${currentLegacyReceivable > 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {currentLegacyReceivable.toLocaleString()}원
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-sm font-medium">기존 장부 입금 확인</p>
                      <p className="text-xs text-muted-foreground">
                        최대 입금 가능액 {currentLegacyReceivable.toLocaleString()}원
                      </p>
                      <p className="text-xs text-muted-foreground">
                        현재 작업 계정 {activeOperatorProfile?.label ?? '미설정'}
                        {activeOperatorProfile?.operatorName ? ` · ${activeOperatorProfile.operatorName}` : ''}
                      </p>
                    </div>
                    {currentLegacyReceivable === 0 && legacyMemoState.settledAmount > 0 && (
                      <p className="text-xs text-green-700">완납 처리됨. 아래 이력에서 취소 후 다시 입력할 수 있습니다.</p>
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
                    <Input
                      type="number"
                      value={legacyPaymentAmount}
                      onChange={(event) => setLegacyPaymentAmount(event.target.value)}
                      placeholder={`최대 ${currentLegacyReceivable.toLocaleString()}원`}
                      disabled={savingLegacyPayment || currentLegacyReceivable <= 0}
                    />
                    <Select value={legacyPaymentMethod} onValueChange={setLegacyPaymentMethod} disabled={savingLegacyPayment}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="현금">현금</SelectItem>
                        <SelectItem value="계좌이체">계좌이체</SelectItem>
                        <SelectItem value="카드">카드</SelectItem>
                        <SelectItem value="수표">수표</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => void handleLegacyPaymentSave()}
                      disabled={savingLegacyPayment || currentLegacyReceivable <= 0 || !legacyPaymentAmount}
                      className="bg-[#7d9675] hover:bg-[#6a8462] text-white"
                    >
                      {savingLegacyPayment ? '처리 중...' : '입금 확인'}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-sm font-medium">기존 장부 지급 확인</p>
                      <p className="text-xs text-muted-foreground">
                        최대 지급 가능액 {currentLegacyPayable.toLocaleString()}원
                      </p>
                      <p className="text-xs text-muted-foreground">
                        현재 작업 계정 {activeOperatorProfile?.label ?? '미설정'}
                        {activeOperatorProfile?.operatorName ? ` · ${activeOperatorProfile.operatorName}` : ''}
                      </p>
                    </div>
                    {currentLegacyPayable === 0 && legacyPayableMemoState.settledAmount > 0 && (
                      <p className="text-xs text-green-700">완납 처리됨. 아래 이력에서 취소 후 다시 입력할 수 있습니다.</p>
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
                    <Input
                      type="number"
                      value={legacyPayableAmount}
                      onChange={(event) => setLegacyPayableAmount(event.target.value)}
                      placeholder={`최대 ${currentLegacyPayable.toLocaleString()}원`}
                      disabled={savingLegacyPayment || currentLegacyPayable <= 0}
                    />
                    <Select value={legacyPayableMethod} onValueChange={setLegacyPayableMethod} disabled={savingLegacyPayment}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="현금">현금</SelectItem>
                        <SelectItem value="계좌이체">계좌이체</SelectItem>
                        <SelectItem value="카드">카드</SelectItem>
                        <SelectItem value="수표">수표</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => void handleLegacyPayableSave()}
                      disabled={savingLegacyPayment || currentLegacyPayable <= 0 || !legacyPayableAmount}
                      className="bg-[#4b7bec] hover:bg-[#3867d6] text-white"
                    >
                      {savingLegacyPayment ? '처리 중...' : '지급 확인'}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium">기존 장부 입금 이력</p>
                    <p className="text-xs text-muted-foreground">잘못 입력한 건은 여기서 바로 취소할 수 있습니다.</p>
                  </div>
                  {legacyMemoState.settlements.length === 0 ? (
                    <p className="text-sm text-muted-foreground">아직 반영된 기존 장부 입금 이력이 없습니다.</p>
                  ) : (
                    <div className="space-y-2">
                      {legacyMemoState.settlements.map((entry, index) => (
                        <div key={`${entry.date}-${entry.amount}-${index}`} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                          <div className="text-sm">
                            <span>{entry.date}</span>
                            <span className="ml-2 font-medium">{entry.amount.toLocaleString()}원</span>
                            {entry.method ? <span className="ml-2 text-muted-foreground">{entry.method}</span> : null}
                            {entry.accountLabel ? <span className="ml-2 text-muted-foreground">계정: {entry.accountLabel}</span> : null}
                            {entry.operator ? <span className="ml-2 text-muted-foreground">입력: {entry.operator}</span> : null}
                            {entry.createdAt ? <span className="ml-2 text-muted-foreground">{entry.createdAt.slice(0, 16).replace('T', ' ')}</span> : null}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600"
                            disabled={savingLegacyPayment}
                            onClick={() => void handleLegacySettlementCancel(index)}
                          >
                            {savingLegacyPayment && editingLegacySettlementIndex === index ? '처리 중...' : '취소'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium">기존 장부 지급 이력</p>
                    <p className="text-xs text-muted-foreground">잘못 입력한 건은 여기서 바로 취소할 수 있습니다.</p>
                  </div>
                  {legacyPayableMemoState.settlements.length === 0 ? (
                    <p className="text-sm text-muted-foreground">아직 반영된 기존 장부 지급 이력이 없습니다.</p>
                  ) : (
                    <div className="space-y-2">
                      {legacyPayableMemoState.settlements.map((entry, index) => (
                        <div key={`${entry.date}-${entry.amount}-${index}`} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                          <div className="text-sm">
                            <span>{entry.date}</span>
                            <span className="ml-2 font-medium">{entry.amount.toLocaleString()}원</span>
                            {entry.method ? <span className="ml-2 text-muted-foreground">{entry.method}</span> : null}
                            {entry.accountLabel ? <span className="ml-2 text-muted-foreground">계정: {entry.accountLabel}</span> : null}
                            {entry.operator ? <span className="ml-2 text-muted-foreground">입력: {entry.operator}</span> : null}
                            {entry.createdAt ? <span className="ml-2 text-muted-foreground">{entry.createdAt.slice(0, 16).replace('T', ' ')}</span> : null}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600"
                            disabled={savingLegacyPayment}
                            onClick={() => void handleLegacyPayableCancel(index)}
                          >
                            {savingLegacyPayment && editingLegacyPayableIndex === index ? '처리 중...' : '취소'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">얼마에요 거래처 원본</CardTitle>
              </CardHeader>
              <CardContent>
                {!legacyTradebook ? (
                  <p className="text-sm text-muted-foreground">연결된 거래처 원본이 없습니다.</p>
                ) : (
                  <div className="space-y-4">
                    {!customerLegacyId && legacyTradebookMatchReason && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        현재 고객 레코드에 `legacy_id`가 없어 백업 원본을 보조 매칭으로 연결했습니다.
                        {legacyTradebookMatchReason === 'mobile+email' && ' 기준: 핸드폰 + 이메일'}
                        {legacyTradebookMatchReason === 'mobile' && ' 기준: 핸드폰'}
                        {legacyTradebookMatchReason === 'business_no' && ' 기준: 사업자번호'}
                        {legacyTradebookMatchReason === 'name' && ' 기준: 거래처명/장부명'}
                        {legacyTradebookMatchReason === 'name-ceo' && ' 기준: 거래처명 + 대표자명'}
                      </div>
                    )}
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                      {[
                        ['장부번호', legacyTradebook.legacy_id],
                        ['장부명', legacyTradebook.book_name],
                        ['거래처명', legacyTradebook.name],
                        ['사업번호', legacyTradebook.business_no],
                        ['대표자', legacyTradebook.ceo_name],
                        ['사업주소', legacyTradebook.business_address],
                        ['업태', legacyTradebook.business_type],
                        ['종목', legacyTradebook.business_item],
                        ['우편번호', legacyTradebook.zip],
                        ['실제주소1', legacyTradebook.address1],
                        ['실제주소2', legacyTradebook.address2],
                        ['전화1', legacyTradebook.phone1],
                        ['전화2', legacyTradebook.phone2],
                        ['팩스', legacyTradebook.fax],
                        ['담당자', legacyTradebook.manager],
                        ['핸드폰', legacyTradebook.mobile],
                        ['이메일', legacyTradebook.email],
                        ['이메일2', legacyTradebook.email2],
                        ['홈페이지', legacyTradebook.homepage],
                        ['거래구분', legacyTradebook.trade_type],
                        ['트리구분', legacyTradebook.tree_type],
                        ['비고', legacyTradebook.memo],
                        ['잔액', legacyTradebook.balance],
                        ['매출가격', legacyTradebook.price_tier],
                        ['은행명', legacyTradebook.bank_name],
                        ['계좌번호', legacyTradebook.bank_account],
                        ['예금주', legacyTradebook.bank_owner],
                      ].map(([label, value]) => (
                        <div key={label} className="flex flex-col gap-0.5">
                          <dt className="font-medium text-muted-foreground text-xs">{label}</dt>
                          <dd className="text-sm whitespace-pre-wrap break-all">{value || <span className="text-muted-foreground">-</span>}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">고객리스트 원본</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {legacyCustomerList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">연결된 고객리스트 원본이 없습니다.</p>
                ) : (
                  legacyCustomerList.map((snapshot, index) => (
                    <div key={`${snapshot.serial_no}-${index}`} className="rounded-lg border p-4">
                      <p className="text-xs font-medium text-muted-foreground mb-3">원본 행 #{index + 1}</p>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                        {[
                          ['일련번호', snapshot.serial_no],
                          ['등록번호', snapshot.business_no],
                          ['고객분류', snapshot.customer_group],
                          ['등록일자', snapshot.registered_at],
                          ['고객명', snapshot.customer_name],
                          ['회사부서', snapshot.company_department],
                          ['우편번호', snapshot.zip],
                          ['주소1', snapshot.address1],
                          ['주소2', snapshot.address2],
                          ['특기사항', snapshot.note],
                          ['참고사항', snapshot.reference],
                          ['전화번호(회사)', snapshot.phone_company],
                          ['전화번호(집)', snapshot.phone_home],
                          ['핸드폰', snapshot.mobile],
                          ['이메일', snapshot.email],
                        ].map(([label, value]) => (
                          <div key={`${snapshot.serial_no}-${label}`} className="flex flex-col gap-0.5">
                            <dt className="font-medium text-muted-foreground text-xs">{label}</dt>
                            <dd className="text-sm whitespace-pre-wrap break-all">{value || <span className="text-muted-foreground">-</span>}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <TransactionDetailDialog
        open={!!selectedTransaction}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  )
}
