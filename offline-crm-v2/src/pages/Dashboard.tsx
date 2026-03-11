import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { getAllCustomers, getAllInvoices, getCustomers, getTxHistory, getInvoices } from '@/lib/api'
import {
  COLLECTION_RATE_THRESHOLDS,
  PRESET_LABELS,
  buildPeriodReport,
  collectionRateColor,
  fmtCompactAmount as fmt,
  getPresetRange,
  type PresetKey,
  yoyColor,
} from '@/lib/reporting'
import { getFiscalBalanceSnapshots, getLegacyCustomerSnapshots } from '@/lib/legacySnapshots'
import { buildCustomerReceivableLedger, buildResolvedReceivableInvoices } from '@/lib/receivables'

// accounting-specialist 정의 임계값
const RECEIVABLE_THRESHOLDS = {
  WARNING:  300_000,    // 30만원 이상 — 주의 (amber)
  DANGER:   1_000_000,  // 100만원 이상 — 경보 (red)
  CRITICAL: 3_000_000,  // 300만원 이상 — 위험
}
const TOTAL_RECEIVABLE_WARNING  = 5_000_000
const TOTAL_RECEIVABLE_DANGER   = 10_000_000

const GROWTH_THRESHOLDS = {
  EXCELLENT: 10,
  GOOD:       1,
  CAUTION:   -5,
  DANGER:   -20,
}

const PIE_COLORS = { ACTIVE: '#22c55e', DORMANT: '#eab308', CHURNED: '#94a3b8' }

const STATUS_LABELS: Record<string, string> = { ACTIVE: '활성', DORMANT: '휴면', CHURNED: '이탈' }

function getYearMonth(dateStr: string) {
  return dateStr.slice(0, 7) // 'YYYY-MM'
}

function growthColor(pct: number) {
  if (pct >= GROWTH_THRESHOLDS.EXCELLENT) return 'text-green-600'
  if (pct >= GROWTH_THRESHOLDS.GOOD)      return 'text-green-500'
  if (pct >= GROWTH_THRESHOLDS.CAUTION)   return 'text-gray-500'
  if (pct >= GROWTH_THRESHOLDS.DANGER)    return 'text-amber-500'
  return 'text-red-600'
}

function GrowthIcon({ pct }: { pct: number }) {
  if (pct >= GROWTH_THRESHOLDS.GOOD)    return <TrendingUp className="h-4 w-4 text-green-500" />
  if (pct >= GROWTH_THRESHOLDS.CAUTION) return <Minus className="h-4 w-4 text-gray-400" />
  return <TrendingDown className="h-4 w-4 text-red-500" />
}

// ─── 현재 연월 헬퍼 ────────────────────────────────────────
const NOW = new Date()
const CUR_YEAR  = NOW.getFullYear()
const CUR_MONTH = NOW.getMonth() + 1  // 1-indexed
const CUR_YM    = `${CUR_YEAR}-${String(CUR_MONTH).padStart(2, '0')}`
const PREV_YM   = CUR_MONTH === 1
  ? `${CUR_YEAR - 1}-12`
  : `${CUR_YEAR}-${String(CUR_MONTH - 1).padStart(2, '0')}`

export function Dashboard() {
  // ── 기간 리포트 상태 ─────────────────────────────────────
  const [activePreset, setActivePreset] = useState<PresetKey>('thisMonth')
  const [dateRange, setDateRange] = useState(() => getPresetRange('thisMonth'))

  function selectPreset(preset: PresetKey) {
    setActivePreset(preset)
    setDateRange(getPresetRange(preset))
  }

  // ── 데이터 패칭 (병렬) ──────────────────────────────────
  const { data: totalData } = useQuery({
    queryKey: ['dash-total'],
    queryFn: () => getCustomers({ limit: 1 }),
    staleTime: 5 * 60_000,
  })
  const { data: activeData } = useQuery({
    queryKey: ['dash-active'],
    queryFn: () => getCustomers({ where: '(customer_status,eq,ACTIVE)', limit: 1 }),
    staleTime: 5 * 60_000,
  })
  const { data: dormantData } = useQuery({
    queryKey: ['dash-dormant'],
    queryFn: () => getCustomers({ where: '(customer_status,eq,DORMANT)', limit: 1 }),
    staleTime: 5 * 60_000,
  })
  // 이번 연도 + 작년 출고 거래 (차트 + KPI 계산용)
  const { data: txThisYear } = useQuery({
    queryKey: ['dash-tx-this', CUR_YEAR],
    queryFn: () => getTxHistory({
      where: `(tx_type,eq,출고)~and(tx_year,eq,${CUR_YEAR})`,
      limit: 5000,
    }),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })
  const { data: txLastYear } = useQuery({
    queryKey: ['dash-tx-last', CUR_YEAR - 1],
    queryFn: () => getTxHistory({
      where: `(tx_type,eq,출고)~and(tx_year,eq,${CUR_YEAR - 1})`,
      limit: 5000,
    }),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })
  // 미수금 전체 거래처
  // Source of truth: 레거시 미수 baseline + CRM 열린 명세표 미수
  const { data: receivablesData } = useQuery({
    queryKey: ['dash-receivables'],
    queryFn: async () => {
      const [customers, invoices, snapshots, fiscalSnapshots] = await Promise.all([
        getAllCustomers({
          where: '(outstanding_balance,gt,0)',
          fields: 'Id,name,book_name,legacy_id,mobile,email,business_no,memo,outstanding_balance',
        }),
        getAllInvoices({
          where: '(payment_status,eq,unpaid)~or(payment_status,eq,partial)',
          sort: '-invoice_date',
          fields: 'Id,invoice_no,invoice_date,customer_id,customer_name,total_amount,paid_amount,payment_status',
        }),
        getLegacyCustomerSnapshots(),
        getFiscalBalanceSnapshots(),
      ])
      const asOfDate = new Date().toISOString().slice(0, 10)
      const resolvedInvoices = buildResolvedReceivableInvoices(invoices, customers, asOfDate)
      return buildCustomerReceivableLedger(customers, resolvedInvoices, snapshots, fiscalSnapshots)
    },
    staleTime: 2 * 60_000,
  })
  const { data: fiscalSnapshots } = useQuery({
    queryKey: ['dash-fiscal-snapshots'],
    queryFn: getFiscalBalanceSnapshots,
    staleTime: Infinity,
  })
  // 기간 리포트: 수금률+객단가용 (invoices)
  // invoice_date가 Text 타입 → 날짜 필터 없이 최신 순 가져와서 클라이언트 필터링
  // 1000건으로 제한 (1년치 이상 → 올해 전체 기준 충분)
  const { data: periodInvoicesRaw } = useQuery({
    queryKey: ['period-invoices-all'],
    queryFn: () => getInvoices({
      sort: '-invoice_date',
      limit: 1000,
    }),
    staleTime: 3 * 60_000,
    refetchOnWindowFocus: false,
  })
  // 기간 리포트: 매출 차트용 (tbl_tx_history)
  const { data: periodTx } = useQuery({
    queryKey: ['period-tx', dateRange.startDate, dateRange.endDate],
    queryFn: () => getTxHistory({
      where: `(tx_type,eq,출고)~and(tx_date,gte,${dateRange.startDate})~and(tx_date,lte,${dateRange.endDate})`,
      limit: 5000,
      sort: 'tx_date',
    }),
    staleTime: 3 * 60_000,
  })

  // ── 계산 ────────────────────────────────────────────────
  const totalCustomers  = totalData?.pageInfo?.totalRows ?? 0
  const activeCustomers = activeData?.pageInfo?.totalRows ?? 0
  const dormantCount    = dormantData?.pageInfo?.totalRows ?? 0
  const churnedCount    = Math.max(0, totalCustomers - activeCustomers - dormantCount)

  const allTx = useMemo(() => [
    ...(txThisYear?.list ?? []),
    ...(txLastYear?.list ?? []),
  ], [txThisYear, txLastYear])

  // 이번 달 / 저번 달 매출
  const thisMonthSales = useMemo(
    () => (txThisYear?.list ?? [])
      .filter((t) => (t.tx_date ?? '').startsWith(CUR_YM))
      .reduce((s, t) => s + (t.amount ?? 0), 0),
    [txThisYear]
  )
  const prevMonthSales = useMemo(
    () => allTx
      .filter((t) => (t.tx_date ?? '').startsWith(PREV_YM))
      .reduce((s, t) => s + (t.amount ?? 0), 0),
    [allTx]
  )
  // 이번 달 건수 (레거시 출고)
  const thisMonthCount = useMemo(
    () => (txThisYear?.list ?? []).filter((t) => (t.tx_date ?? '').startsWith(CUR_YM)).length,
    [txThisYear]
  )

  // 미수금 총액
  const totalReceivables = useMemo(
    () => (receivablesData ?? []).reduce((sum, customer) => sum + customer.totalRemaining, 0),
    [receivablesData]
  )
  const receivableCustomers = receivablesData?.length ?? 0
  const legacyReceivables = useMemo(
    () => (receivablesData ?? []).reduce((sum, customer) => sum + customer.legacyBaseline, 0),
    [receivablesData]
  )
  const crmReceivables = useMemo(
    () => (receivablesData ?? []).reduce((sum, customer) => sum + customer.crmRemaining, 0),
    [receivablesData]
  )
  const totalPayables = useMemo(() => {
    const year = String(fiscalSnapshots?.currentFiscalYear ?? '')
    const payables = fiscalSnapshots?.years?.[year]?.payablesByLegacyId ?? {}
    return Object.values(payables).reduce((sum, amount) => sum + amount, 0)
  }, [fiscalSnapshots])
  const payableCustomers = useMemo(() => {
    const year = String(fiscalSnapshots?.currentFiscalYear ?? '')
    const payables = fiscalSnapshots?.years?.[year]?.payablesByLegacyId ?? {}
    return Object.keys(payables).length
  }, [fiscalSnapshots])

  // 이번 달 명세표 건수 — periodInvoicesRaw에서 클라이언트 필터링
  const thisMonthInvoices = useMemo(
    () => (periodInvoicesRaw?.list ?? []).filter((i) =>
      (i.invoice_date ?? '').startsWith(CUR_YM)
    ).length,
    [periodInvoicesRaw]
  )

  // ── CRM 명세표 매출 (레거시 tx_history와 별도 집계, 이중계산 없음) ──
  // Source of truth: invoices.total_amount (새 CRM에서 발행한 명세표)
  // tx_history = 얼마에요 레거시, invoices = CRM 신규 → 데이터 소스 완전 분리
  const thisMonthCrmSales = useMemo(
    () => (periodInvoicesRaw?.list ?? [])
      .filter((i) => (i.invoice_date ?? '').startsWith(CUR_YM))
      .reduce((s, i) => s + (i.total_amount ?? 0), 0),
    [periodInvoicesRaw]
  )
  const prevMonthCrmSales = useMemo(
    () => (periodInvoicesRaw?.list ?? [])
      .filter((i) => (i.invoice_date ?? '').startsWith(PREV_YM))
      .reduce((s, i) => s + (i.total_amount ?? 0), 0),
    [periodInvoicesRaw]
  )
  // 통합 매출 = 레거시(tx_history 출고) + CRM(invoices)
  const combinedThisMonthSales = thisMonthSales + thisMonthCrmSales
  const combinedPrevMonthSales = prevMonthSales + prevMonthCrmSales
  const combinedGrowthPct = combinedPrevMonthSales > 0
    ? ((combinedThisMonthSales - combinedPrevMonthSales) / combinedPrevMonthSales) * 100
    : 0
  const combinedThisMonthCount = thisMonthCount + thisMonthInvoices
  const combinedAvgAmount = combinedThisMonthCount > 0
    ? Math.round(combinedThisMonthSales / combinedThisMonthCount)
    : 0

  // 12개월 차트 데이터 (레거시 tx_history + CRM invoices 통합)
  const monthlyChart = useMemo(() => {
    const byYM: Record<string, { thisYear: number; lastYear: number }> = {}
    for (let i = 11; i >= 0; i--) {
      const d = new Date(CUR_YEAR, CUR_MONTH - 1 - i, 1)
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      byYM[ym] = { thisYear: 0, lastYear: 0 }
    }
    // 레거시 tx_history
    allTx.forEach((tx) => {
      const ym = getYearMonth(tx.tx_date ?? '')
      const lyYM = ym.replace(`${CUR_YEAR - 1}`, `${CUR_YEAR}`)
      if (byYM[ym])   byYM[ym].thisYear  += tx.amount ?? 0
      if (byYM[lyYM]) byYM[lyYM].lastYear += tx.amount ?? 0
    })
    // CRM invoices (이중계산 없음: 레거시와 데이터 소스 분리)
    ;(periodInvoicesRaw?.list ?? []).forEach((inv) => {
      const ym = getYearMonth(inv.invoice_date ?? '')
      if (byYM[ym]) byYM[ym].thisYear += inv.total_amount ?? 0
      // CRM 전년 데이터도 반영 (있는 경우)
      const lyYM = ym.replace(`${CUR_YEAR - 1}`, `${CUR_YEAR}`)
      if (lyYM !== ym && byYM[lyYM]) byYM[lyYM].lastYear += inv.total_amount ?? 0
    })
    return Object.entries(byYM).map(([ym, v]) => ({
      ym: ym.slice(5),
      thisYear: v.thisYear,
      lastYear: v.lastYear,
    }))
  }, [allTx, periodInvoicesRaw])

  // 고객 상태 파이 데이터
  const pieData = [
    { name: '활성', value: activeCustomers, key: 'ACTIVE' },
    { name: '휴면', value: dormantCount,    key: 'DORMANT' },
    { name: '이탈', value: churnedCount,    key: 'CHURNED' },
  ]

  // 미수금 TOP10 (차트용: 상위 10건만 표시)
  const receivablesChart = (receivablesData ?? []).slice(0, 10).map((customer) => ({
    name: customer.customerName.slice(0, 8),
    amount: customer.totalRemaining,
  }))

  // ── 기간 리포트 계산 ─────────────────────────────────────
  const {
    periodInvoiceList,
    validInvoices,
    collectionRate,
    periodAvgAmount,
    periodCombinedSales,
    yoyGrowthPct,
    periodChartData,
  } = useMemo(() => buildPeriodReport({
    activePreset,
    dateRange,
    invoices: periodInvoicesRaw?.list ?? [],
    txHistory: periodTx?.list ?? [],
    txLastYear: txLastYear?.list ?? [],
    now: NOW,
  }), [activePreset, dateRange, periodInvoicesRaw, periodTx, txLastYear])

  // 미수금 경보 색상
  const totalRecColor = totalReceivables >= TOTAL_RECEIVABLE_DANGER
    ? 'text-red-600'
    : totalReceivables >= TOTAL_RECEIVABLE_WARNING
    ? 'text-amber-600'
    : ''

  // ── 렌더링 ───────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">대시보드</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            기준: {CUR_YEAR}년 {CUR_MONTH}월
          </p>
        </div>
      </div>

      {/* ── KPI 카드 8개 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Row 1: 돈 관련 */}
        <KpiCard
          title="이번 달 매출"
          value={`${fmt(combinedThisMonthSales)}원`}
          sub={thisMonthCrmSales > 0 && thisMonthSales > 0
            ? `기존 장부 ${thisMonthCount}건 + 새 입력 ${thisMonthInvoices}건`
            : `${combinedThisMonthCount}건 출고`
          }
        />
        <KpiCard
          title="미수금 총액"
          value={`${fmt(totalReceivables)}원`}
          sub={`기존 장부 ${fmt(legacyReceivables)}원 / 새 입력 ${fmt(crmReceivables)}원`}
          valueClass={totalRecColor}
          icon={totalReceivables >= TOTAL_RECEIVABLE_WARNING ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : undefined}
        />
        <KpiCard
          title="미수금 고객 수"
          value={`${receivableCustomers}곳`}
          sub="기존 장부 + 새 입력 합산"
          valueClass={receivableCustomers > 10 ? 'text-amber-600' : ''}
        />
        <KpiCard
          title="미지급금 총액"
          value={`${fmt(totalPayables)}원`}
          sub={`${payableCustomers}곳 기준`}
          valueClass={totalPayables > 0 ? 'text-blue-700' : ''}
        />
        <KpiCard
          title="매출 성장률"
          value={`${combinedGrowthPct >= 0 ? '+' : ''}${combinedGrowthPct.toFixed(1)}%`}
          sub="전월 대비 (기존 장부+새 입력 통합)"
          valueClass={growthColor(combinedGrowthPct)}
          icon={<GrowthIcon pct={combinedGrowthPct} />}
        />

        {/* Row 2: 고객 관련 */}
        <KpiCard
          title="활성 고객"
          value={`${activeCustomers.toLocaleString()}명`}
          sub="12개월 내 거래"
          valueClass="text-green-600"
        />
        <KpiCard
          title="전체 고객"
          value={`${totalCustomers.toLocaleString()}명`}
          sub={`휴면 ${dormantCount.toLocaleString()}명 포함`}
        />
        <KpiCard
          title="이번 달 명세표"
          value={`${thisMonthInvoices.toLocaleString()}건`}
          sub="발행 건수"
        />
        <KpiCard
          title="평균 거래 단가"
          value={`${fmt(combinedAvgAmount)}원`}
          sub="이번 달 통합 기준"
        />
      </div>

      {/* ── 차트 2x2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 차트 1: 월별 매출 추이 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">월별 매출 추이 (최근 12개월)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="ym" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 10000)}만`} tick={{ fontSize: 10 }} width={42} />
                <Tooltip formatter={(v: number | undefined) => [`${(v ?? 0).toLocaleString()}원`]} />
                <Line type="monotone" dataKey="thisYear" stroke="#7d9675" strokeWidth={2} dot={false} name="올해" />
                <Line type="monotone" dataKey="lastYear" stroke="#d1d5db" strokeWidth={1.5} dot={false} name="전년" strokeDasharray="4 4" />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 차트 2: 고객 상태 분포 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">고객 상태 분포</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <ResponsiveContainer width="60%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.key} fill={PIE_COLORS[entry.key as keyof typeof PIE_COLORS]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number | undefined) => [`${(v ?? 0).toLocaleString()}명`]} />
              </PieChart>
            </ResponsiveContainer>
            {/* 범례 */}
            <div className="space-y-2 text-sm">
              {pieData.map((d) => (
                <div key={d.key} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: PIE_COLORS[d.key as keyof typeof PIE_COLORS] }} />
                  <span className="text-muted-foreground">{STATUS_LABELS[d.key]}</span>
                  <span className="font-semibold">{d.value.toLocaleString()}명</span>
                  <span className="text-xs text-muted-foreground">
                    ({totalCustomers > 0 ? ((d.value / totalCustomers) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              ))}
              <div className="pt-1 border-t text-xs text-muted-foreground">
                활성률 {totalCustomers > 0 ? ((activeCustomers / totalCustomers) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 차트 3: 미수금 TOP10 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              미수금 TOP 10 거래처
              {totalReceivables >= TOTAL_RECEIVABLE_WARNING && (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {receivablesChart.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">미수금 거래처 없음</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={receivablesChart} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <XAxis type="number" tickFormatter={(v) => `${Math.round(v / 10000)}만`} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip formatter={(v: number | undefined) => [`${(v ?? 0).toLocaleString()}원`, '미수금']} />
                  <Bar dataKey="amount" radius={[0, 3, 3, 0]}>
                    {receivablesChart.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={
                          entry.amount >= RECEIVABLE_THRESHOLDS.DANGER
                            ? '#ef4444'
                            : entry.amount >= RECEIVABLE_THRESHOLDS.WARNING
                            ? '#f59e0b'
                            : '#7d9675'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 차트 4: 연도별 매출 추이 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">연도별 출고 매출 (2013~{CUR_YEAR})</CardTitle>
          </CardHeader>
          <CardContent>
            <YearlyChart />
          </CardContent>
        </Card>
      </div>

      {/* ── 기간 매출 리포트 ── */}
      <div className="space-y-4 border-t pt-6">
        {/* 헤더 + 퀵 프리셋 */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-base font-semibold">기간 매출 리포트</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {dateRange.label} ({dateRange.startDate} ~ {dateRange.endDate})
            </p>
          </div>
          <div className="flex gap-1.5">
            {(Object.keys(PRESET_LABELS) as PresetKey[]).map((p) => (
              <button
                key={p}
                onClick={() => selectPreset(p)}
                className={`text-xs px-3 py-1 rounded-md border transition-colors ${
                  activePreset === p
                    ? 'bg-[#7d9675] text-white border-[#7d9675]'
                    : 'bg-white text-muted-foreground border-border hover:border-[#7d9675] hover:text-[#7d9675]'
                }`}
              >
                {PRESET_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* KPI 카드 3개 */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 수금률 */}
          <KpiCard
            title="수금률"
            value={`${collectionRate.toFixed(1)}%`}
            sub={`명세표 ${periodInvoiceList.length}건 기준`}
            valueClass={collectionRateColor(collectionRate)}
            icon={
              collectionRate < COLLECTION_RATE_THRESHOLDS.CAUTION
                ? <AlertTriangle className="h-4 w-4 text-red-500" />
                : undefined
            }
          />
          {/* 전년동월대비 (thisMonth) 또는 기간 매출 */}
          <KpiCard
            title={activePreset === 'thisMonth' ? '전년동월 대비' : '기간 매출'}
            value={
              yoyGrowthPct !== null
                ? `${yoyGrowthPct >= 0 ? '+' : ''}${yoyGrowthPct.toFixed(1)}%`
                : `${fmt(periodCombinedSales)}원`
            }
            sub={
              yoyGrowthPct !== null
                ? `전년 ${CUR_YEAR - 1}년 ${CUR_MONTH}월 대비`
                : `기존 장부+새 입력 통합`
            }
            valueClass={yoyGrowthPct !== null ? yoyColor(yoyGrowthPct) : ''}
            icon={yoyGrowthPct !== null ? <GrowthIcon pct={yoyGrowthPct} /> : undefined}
          />
          {/* 객단가 */}
          <KpiCard
            title="기간 객단가"
            value={`${fmt(periodAvgAmount)}원`}
            sub={`명세표 ${validInvoices.length}건 평균`}
          />
        </div>

        {/* 기간 Bar 차트 */}
        {periodChartData.length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                {dateRange.label} 일별 매출 (기존 장부+새 입력)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={periodChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tickFormatter={(v) => `${Math.round(v / 10000)}만`} tick={{ fontSize: 10 }} width={42} />
                  <Tooltip formatter={(v: number | undefined) => [`${(v ?? 0).toLocaleString()}원`, '출고']} />
                  <Bar dataKey="amount" fill="#7d9675" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            해당 기간에 출고 데이터가 없습니다.
          </p>
        )}
      </div>
    </div>
  )
}

// ── KPI 카드 컴포넌트 ──────────────────────────────────────
function KpiCard({
  title, value, sub, valueClass = '', icon,
}: {
  title: string
  value: string
  sub: string
  valueClass?: string
  icon?: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-xl font-bold leading-tight ${valueClass}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  )
}

// ── 연도별 차트 (별도 쿼리) ────────────────────────────────
function YearlyChart() {
  // 연도별 집계는 customers.total_order_amount를 직접 합산하는 대신
  // 이미 로드된 tx_history 데이터가 없으므로, 각 tx_year별로 단순 카운트
  // (실제로는 year별로 쿼리해야 하지만, 기존 this/last year 데이터를 활용)
  const { data } = useQuery({
    queryKey: ['dash-yearly'],
    queryFn: async () => {
      // 최근 5년 상세 조회 (병렬, 연간 7500건 예상 → limit 5000으로 대응)
      const recentYears = [2022, 2023, 2024, 2025, 2026]
      const results = await Promise.all(
        recentYears.map((y) =>
          getTxHistory({
            where: `(tx_type,eq,출고)~and(tx_year,eq,${y})`,
            limit: 5000,
            fields: 'Id,amount',
          }).then((d) => ({
            year: y,
            total: d.list.reduce((s, t) => s + (t.amount ?? 0), 0),
            truncated: d.list.length < (d.pageInfo?.totalRows ?? 0),
          }))
        )
      )
      return results
    },
    staleTime: 30 * 60_000,  // 30분 캐시 (연도 데이터는 자주 안 바뀜)
    refetchOnWindowFocus: false,
  })

  if (!data) {
    return <p className="text-sm text-muted-foreground py-8 text-center">로딩 중...</p>
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v) => `${Math.round(v / 100_000_000)}억`} tick={{ fontSize: 10 }} width={38} />
        <Tooltip formatter={(v: number | undefined) => [`${(v ?? 0).toLocaleString()}원`, '출고']} />
        <Bar dataKey="total" fill="#7d9675" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
