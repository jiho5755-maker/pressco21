import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { getCustomers, getTxHistory, getInvoices } from '@/lib/api'

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

function fmt(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000)      return `${Math.round(n / 10_000)}만`
  return n.toLocaleString()
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
  })
  const { data: txLastYear } = useQuery({
    queryKey: ['dash-tx-last', CUR_YEAR - 1],
    queryFn: () => getTxHistory({
      where: `(tx_type,eq,출고)~and(tx_year,eq,${CUR_YEAR - 1})`,
      limit: 5000,
    }),
    staleTime: 5 * 60_000,
  })
  // 미수금 TOP10 거래처
  const { data: receivablesData } = useQuery({
    queryKey: ['dash-receivables'],
    queryFn: () => getCustomers({
      where: '(outstanding_balance,gt,0)',
      sort: '-outstanding_balance',
      limit: 10,
    }),
    staleTime: 2 * 60_000,
  })
  // 이번 달 명세표 건수
  const { data: invoiceData } = useQuery({
    queryKey: ['dash-invoice-count', CUR_YM],
    queryFn: () => getInvoices({
      where: `(invoice_date,gte,${CUR_YM}-01)`,
      limit: 1,
    }),
    staleTime: 5 * 60_000,
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
  const growthPct = prevMonthSales > 0
    ? ((thisMonthSales - prevMonthSales) / prevMonthSales) * 100
    : 0

  // 이번 달 건수 → 평균 거래 단가
  const thisMonthCount = useMemo(
    () => (txThisYear?.list ?? []).filter((t) => (t.tx_date ?? '').startsWith(CUR_YM)).length,
    [txThisYear]
  )
  const avgAmount = thisMonthCount > 0 ? Math.round(thisMonthSales / thisMonthCount) : 0

  // 미수금 총액
  const totalReceivables = useMemo(
    () => (receivablesData?.list ?? []).reduce((s, c) => s + (c.outstanding_balance ?? 0), 0),
    [receivablesData]
  )
  const receivableCustomers = receivablesData?.pageInfo?.totalRows ?? 0

  // 명세표 건수
  const thisMonthInvoices = invoiceData?.pageInfo?.totalRows ?? 0

  // 12개월 차트 데이터 (최근 12개월)
  const monthlyChart = useMemo(() => {
    const byYM: Record<string, { thisYear: number; lastYear: number }> = {}
    for (let i = 11; i >= 0; i--) {
      const d = new Date(CUR_YEAR, CUR_MONTH - 1 - i, 1)
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      byYM[ym] = { thisYear: 0, lastYear: 0 }
    }
    allTx.forEach((tx) => {
      const ym = getYearMonth(tx.tx_date ?? '')
      const lyYM = ym.replace(`${CUR_YEAR - 1}`, `${CUR_YEAR}`) // 전년 → 올해 키로 맵핑
      if (byYM[ym])   byYM[ym].thisYear  += tx.amount ?? 0
      if (byYM[lyYM]) byYM[lyYM].lastYear += tx.amount ?? 0
    })
    return Object.entries(byYM).map(([ym, v]) => ({
      ym: ym.slice(5),  // 'MM'만 표시
      thisYear: v.thisYear,
      lastYear: v.lastYear,
    }))
  }, [allTx])

  // 고객 상태 파이 데이터
  const pieData = [
    { name: '활성', value: activeCustomers, key: 'ACTIVE' },
    { name: '휴면', value: dormantCount,    key: 'DORMANT' },
    { name: '이탈', value: churnedCount,    key: 'CHURNED' },
  ]

  // 미수금 TOP10
  const receivablesChart = (receivablesData?.list ?? []).map((c) => ({
    name: (c.name ?? '').slice(0, 8),
    amount: c.outstanding_balance ?? 0,
  }))

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Row 1: 돈 관련 */}
        <KpiCard
          title="이번 달 매출"
          value={`${fmt(thisMonthSales)}원`}
          sub={`${thisMonthCount}건 출고`}
        />
        <KpiCard
          title="미수금 총액"
          value={`${fmt(totalReceivables)}원`}
          sub={`${receivableCustomers}곳 미수`}
          valueClass={totalRecColor}
          icon={totalReceivables >= TOTAL_RECEIVABLE_WARNING ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : undefined}
        />
        <KpiCard
          title="미수금 고객 수"
          value={`${receivableCustomers}곳`}
          sub="입금 요청 필요"
          valueClass={receivableCustomers > 10 ? 'text-amber-600' : ''}
        />
        <KpiCard
          title="매출 성장률"
          value={`${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}%`}
          sub="전월 대비"
          valueClass={growthColor(growthPct)}
          icon={<GrowthIcon pct={growthPct} />}
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
          value={`${fmt(avgAmount)}원`}
          sub="이번 달 출고 기준"
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
  icon?: React.ReactNode
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
      // 최근 5년만 상세 조회 (성능)
      const recentYears = [2022, 2023, 2024, 2025, 2026]
      const results = await Promise.all(
        recentYears.map((y) =>
          getTxHistory({
            where: `(tx_type,eq,출고)~and(tx_year,eq,${y})`,
            limit: 5000,
          }).then((d) => ({
            year: y,
            total: d.list.reduce((s, t) => s + (t.amount ?? 0), 0),
          }))
        )
      )
      return results
    },
    staleTime: 10 * 60_000,
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
