import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Minus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAllCustomers, getAllInvoices, getTxHistory, type Customer, type Invoice } from '@/lib/api'
import {
  COLLECTION_RATE_THRESHOLDS,
  PRESET_LABELS,
  buildInvoiceDateSummary,
  buildPeriodReport,
  collectionRateColor,
  fmtCompactAmount as fmt,
  getPaymentStatusAsOf,
  getPresetRange,
  getRemainingAmountAsOf,
  type PresetKey,
  yoyColor,
} from '@/lib/reporting'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function padMonth(month: number) {
  return String(month).padStart(2, '0')
}

function padDay(day: number) {
  return String(day).padStart(2, '0')
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay()
}

function getMonthRange(year: number, month: number) {
  const lastDay = getDaysInMonth(year, month)
  return {
    startDate: `${year}-${padMonth(month)}-01`,
    endDate: `${year}-${padMonth(month)}-${padDay(lastDay)}`,
  }
}

function getDaysBetween(from: string | undefined, to: string): number {
  if (!from || !to) return 0
  return Math.max(0, Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 86400000))
}

function getCustomerPhone(customer: Customer): string {
  return (customer.mobile ?? customer.phone1 ?? customer.phone ?? '') as string
}

function GrowthIcon({ pct }: { pct: number }) {
  if (pct >= 1) return <TrendingUp className="h-4 w-4 text-green-500" />
  if (pct >= -5) return <Minus className="h-4 w-4 text-gray-400" />
  return <TrendingDown className="h-4 w-4 text-red-500" />
}

export function Calendar() {
  const navigate = useNavigate()
  const [today] = useState(() => new Date())
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [activePreset, setActivePreset] = useState<PresetKey>('thisMonth')
  const [dateRange, setDateRange] = useState(() => getPresetRange('thisMonth', today))

  const prevMonthLabel = month === 1 ? `${year - 1}-12` : `${year}-${padMonth(month - 1)}`
  const nextMonthLabel = month === 12 ? `${year + 1}-01` : `${year}-${padMonth(month + 1)}`
  const { startDate: monthStartDate, endDate: monthEndDate } = getMonthRange(year, month)
  const todayStr = `${today.getFullYear()}-${padMonth(today.getMonth() + 1)}-${padDay(today.getDate())}`
  const prevYearMonthRange = getMonthRange(today.getFullYear() - 1, today.getMonth() + 1)

  const { data: allInvoices = [], isLoading: isInvoiceLoading } = useQuery({
    queryKey: ['calendar-invoices-all'],
    queryFn: () => getAllInvoices({
      sort: '-invoice_date',
      fields: 'Id,invoice_no,invoice_date,customer_id,customer_name,total_amount,paid_amount,payment_status',
    }),
    staleTime: 3 * 60_000,
    refetchOnWindowFocus: false,
  })

  const { data: periodTx, isLoading: isPeriodTxLoading } = useQuery({
    queryKey: ['calendar-period-tx', dateRange.startDate, dateRange.endDate],
    queryFn: () => getTxHistory({
      where: `(tx_type,eq,출고)~and(tx_date,gte,${dateRange.startDate})~and(tx_date,lte,${dateRange.endDate})`,
      limit: 5000,
      sort: 'tx_date',
    }),
    staleTime: 3 * 60_000,
    refetchOnWindowFocus: false,
  })

  const { data: txLastYear, isLoading: isTxLastYearLoading } = useQuery({
    queryKey: ['calendar-period-tx-last-year', today.getFullYear() - 1],
    queryFn: () => getTxHistory({
      where: `(tx_type,eq,출고)~and(tx_year,eq,${today.getFullYear() - 1})`,
      limit: 5000,
    }),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    enabled: activePreset === 'thisMonth',
  })
  const { data: receivableActionInvoices = [], isLoading: isReceivableActionLoading } = useQuery({
    queryKey: ['calendar-action-receivables'],
    queryFn: () => getAllInvoices({
      where: '(payment_status,eq,unpaid)~or(payment_status,eq,partial)',
      sort: '-invoice_date',
      fields: 'Id,invoice_no,invoice_date,customer_name,total_amount,paid_amount,payment_status',
    }),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
    enabled: !!selectedDate,
  })
  const { data: revisitCustomers = [], isLoading: isRevisitCustomerLoading } = useQuery({
    queryKey: ['calendar-revisit-customers'],
    queryFn: () => getAllCustomers({
      sort: 'last_order_date',
      fields: 'Id,name,last_order_date,outstanding_balance,mobile,phone1,customer_status',
    }),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    enabled: !!selectedDate,
  })

  const invoices = useMemo(
    () => allInvoices.filter((invoice) => {
      const date = invoice.invoice_date?.slice(0, 10) ?? ''
      return date >= monthStartDate && date <= monthEndDate
    }),
    [allInvoices, monthStartDate, monthEndDate],
  )
  const byDate = useMemo(() => buildInvoiceDateSummary(invoices), [invoices])
  const isMonthLoading = isInvoiceLoading

  const monthTotal = invoices.reduce((sum, invoice) => sum + (invoice.total_amount ?? 0), 0)
  const monthCount = invoices.length
  const monthUnpaidCount = invoices.filter((invoice) => (invoice.payment_status ?? '') !== 'paid').length
  const monthTradingDays = Object.keys(byDate).length

  const selectedSummary = selectedDate ? byDate[selectedDate] : null
  const selectedInvoices = selectedSummary?.list ?? []
  const selectedReceivables = useMemo(() => {
    if (!selectedDate) return []
    return receivableActionInvoices
      .map((invoice) => {
        const remainingAmount = getRemainingAmountAsOf(invoice, selectedDate)
        if (remainingAmount <= 0) return null
        return {
          ...invoice,
          remainingAmount,
          paymentStatusAsOf: getPaymentStatusAsOf(invoice, selectedDate),
          ageDays: getDaysBetween(invoice.invoice_date, selectedDate),
        }
      })
      .filter((invoice): invoice is Invoice & {
        remainingAmount: number
        paymentStatusAsOf: 'paid' | 'partial' | 'unpaid'
        ageDays: number
      } => invoice !== null)
      .sort((left, right) => {
        const amountDiff = right.remainingAmount - left.remainingAmount
        if (amountDiff !== 0) return amountDiff
        return right.ageDays - left.ageDays
      })
      .slice(0, 5)
  }, [selectedDate, receivableActionInvoices])
  const currentRevisitTargets = useMemo(() => {
    return revisitCustomers
      .filter((customer) => {
        if (!(customer.name ?? '').trim()) return false
        if (customer.customer_status === 'CHURNED') return false
        const lastOrderDate = customer.last_order_date?.slice(0, 10)
        if (!lastOrderDate || lastOrderDate > todayStr) return false
        const gapDays = getDaysBetween(lastOrderDate, todayStr)
        return gapDays >= 45
      })
      .map((customer) => {
        const lastOrderDate = customer.last_order_date?.slice(0, 10) ?? ''
        const gapDays = getDaysBetween(lastOrderDate, todayStr)
        return {
          ...customer,
          gapDays,
          phone: getCustomerPhone(customer),
        }
      })
      .sort((left, right) => {
        const leftOutstanding = left.outstanding_balance ?? 0
        const rightOutstanding = right.outstanding_balance ?? 0
        if (rightOutstanding !== leftOutstanding) return rightOutstanding - leftOutstanding
        return right.gapDays - left.gapDays
      })
      .slice(0, 5)
  }, [revisitCustomers, todayStr])
  const actionPanelLoading = isReceivableActionLoading || isRevisitCustomerLoading
  const previousYearInvoiceSales = useMemo(
    () => allInvoices
      .filter((invoice) => {
        const date = invoice.invoice_date?.slice(0, 10) ?? ''
        return date >= prevYearMonthRange.startDate && date <= prevYearMonthRange.endDate
      })
      .reduce((sum, invoice) => sum + (invoice.total_amount ?? 0), 0),
    [allInvoices, prevYearMonthRange.endDate, prevYearMonthRange.startDate],
  )

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
    invoices: allInvoices,
    txHistory: periodTx?.list ?? [],
    txLastYear: txLastYear?.list ?? [],
    previousYearInvoiceSales,
    now: today,
  }), [activePreset, dateRange, allInvoices, periodTx, txLastYear, previousYearInvoiceSales, today])

  const periodIsLoading =
    isInvoiceLoading ||
    isPeriodTxLoading ||
    (activePreset === 'thisMonth' && isTxLastYearLoading)
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1

  const daysInMonth = getDaysInMonth(year, month)
  const firstDow = getFirstDayOfWeek(year, month)
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function selectPreset(preset: PresetKey) {
    setActivePreset(preset)
    setDateRange(getPresetRange(preset, today))
  }

  function prevMonth() {
    if (month === 1) {
      setYear((value) => value - 1)
      setMonth(12)
    } else {
      setMonth((value) => value - 1)
    }
    setSelectedDate(null)
  }

  function nextMonth() {
    if (month === 12) {
      setYear((value) => value + 1)
      setMonth(1)
    } else {
      setMonth((value) => value + 1)
    }
    setSelectedDate(null)
  }

  const monthTopDays = Object.entries(byDate)
    .sort(([, left], [, right]) => right.total - left.total)
    .slice(0, 5)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">캘린더</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            월간 달력은 명세표 기준, 상단 리포트는 기존 장부 거래내역 + 새 입력 명세표 통합 기준입니다.
          </p>
        </div>
        <div className="rounded-xl border bg-white px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-28 text-center">
              <div className="text-sm font-medium">{year}년 {month}월</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {isCurrentMonth ? '현재 월' : '월간 보기'}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setYear(today.getFullYear())
                setMonth(today.getMonth() + 1)
                setSelectedDate(null)
              }}
            >
              오늘
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <div>
              <p className="text-sm font-semibold text-foreground">조회 기준</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                빠른 기간 버튼으로 리포트를 바꾸고, 달력에서 필요한 날짜를 바로 눌러 확인하세요.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-[#f4f7f1] px-3 py-1 font-medium text-[#4f6748]">
                {dateRange.label}
              </span>
              <span className="rounded-full bg-[#f7f5ef] px-3 py-1 font-medium text-[#836b2c]">
                {dateRange.startDate} ~ {dateRange.endDate}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                {selectedDate ? `선택 날짜 ${selectedDate}` : `${year}년 ${month}월 달력`}
              </span>
              {!periodIsLoading && (
                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                  명세표 {periodInvoiceList.length}건
                </span>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">빠른 기간 선택</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(PRESET_LABELS) as PresetKey[]).map((preset) => (
                <button
                  key={preset}
                  onClick={() => selectPreset(preset)}
                  className={`rounded-md border px-3 py-1 text-xs transition-colors ${
                    activePreset === preset
                      ? 'border-[#7d9675] bg-[#7d9675] text-white'
                      : 'border-border bg-white text-muted-foreground hover:border-[#7d9675] hover:text-[#7d9675]'
                  }`}
                >
                  {PRESET_LABELS[preset]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {periodIsLoading ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            기간 데이터를 불러오는 중입니다.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <KpiCard
                title={activePreset === 'thisMonth' ? '전년동월 대비' : '기간 매출'}
                value={
                  yoyGrowthPct !== null
                    ? `${yoyGrowthPct >= 0 ? '+' : ''}${yoyGrowthPct.toFixed(1)}%`
                    : `${fmt(periodCombinedSales)}원`
                }
                sub={
                  yoyGrowthPct !== null
                    ? `전년 ${today.getFullYear() - 1}년 ${today.getMonth() + 1}월 대비`
                    : '레거시+CRM 통합'
                }
                valueClass={yoyGrowthPct !== null ? yoyColor(yoyGrowthPct) : ''}
                icon={yoyGrowthPct !== null ? <GrowthIcon pct={yoyGrowthPct} /> : undefined}
              />
              <KpiCard
                title="평균 객단가"
                value={`${fmt(periodAvgAmount)}원`}
                sub={`명세표 ${validInvoices.length}건 평균`}
                valueClass={validInvoices.length === 0 ? 'text-muted-foreground' : ''}
              />
            </div>

            {periodChartData.length > 0 ? (
              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    {dateRange.label} 일별 매출 추이
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={periodChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis tickFormatter={(value) => `${Math.round(value / 10000)}만`} tick={{ fontSize: 10 }} width={42} />
                      <Tooltip formatter={(value: number | undefined) => [`${(value ?? 0).toLocaleString()}원`, '매출']} />
                      <Bar dataKey="amount" fill="#7d9675" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                해당 기간에 출고 데이터가 없습니다.
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_360px] gap-4">
        <Card className="overflow-hidden shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              {year}년 {month}월 월간 달력
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              명세표 {monthCount}건 / {monthTotal.toLocaleString()}원
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {isMonthLoading ? (
              <div className="text-center py-16 text-sm text-muted-foreground">월간 명세표를 불러오는 중입니다.</div>
            ) : (
              <>
                <div className="grid grid-cols-7 border-y">
                  {DAY_LABELS.map((label, index) => (
                    <div
                      key={label}
                      className={`text-center py-2 text-xs font-medium ${
                        index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-muted-foreground'
                      }`}
                    >
                      {label}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {cells.map((day, index) => {
                    if (!day) {
                      return (
                        <div
                          key={`empty-${index}`}
                          className="min-h-[92px] border-b border-r last:border-r-0 bg-gray-50/40"
                        />
                      )
                    }

                    const dateStr = `${year}-${padMonth(month)}-${padDay(day)}`
                    const entry = byDate[dateStr]
                    const isToday = dateStr === todayStr
                    const isSelected = dateStr === selectedDate
                    const dayOfWeek = (firstDow + day - 1) % 7

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        className={`min-h-[92px] border-b border-r last:border-r-0 p-2 text-left transition-colors ${
                          isSelected ? 'bg-[#eef4ed]' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                      >
                        <div
                          className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                            isToday
                              ? 'bg-[#7d9675] text-white'
                              : dayOfWeek === 0
                              ? 'text-red-500'
                              : dayOfWeek === 6
                              ? 'text-blue-500'
                              : ''
                          }`}
                        >
                          {day}
                        </div>

                        {entry ? (
                          <div className="space-y-0.5">
                            <div className="text-xs font-medium text-[#3d6b4a]">{entry.count}건</div>
                            <div className="text-xs text-muted-foreground">{fmt(entry.total)}원</div>
                            {entry.unpaidCount > 0 && (
                              <div className="text-[10px] text-red-500">{entry.unpaidCount}건 미수</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-muted-foreground/50">발행 없음</div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          {selectedDate ? (
            <>
              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">{selectedDate} 빠른 확인</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border bg-[#fcfcfb] px-3 py-3">
                      <div className="text-xs text-muted-foreground">발행 건수</div>
                      <div className="mt-1 text-sm font-semibold text-foreground">{selectedSummary?.count ?? 0}건</div>
                    </div>
                    <div className="rounded-lg border bg-[#fcfcfb] px-3 py-3">
                      <div className="text-xs text-muted-foreground">총 매출</div>
                      <div className="mt-1 text-sm font-semibold text-[#3d6b4a]">{(selectedSummary?.total ?? 0).toLocaleString()}원</div>
                    </div>
                    <div className="rounded-lg border bg-[#fcfcfb] px-3 py-3">
                      <div className="text-xs text-muted-foreground">미수 명세표</div>
                      <div className={`mt-1 text-sm font-semibold ${(selectedSummary?.unpaidCount ?? 0) > 0 ? 'text-red-500' : 'text-foreground'}`}>
                        {selectedSummary?.unpaidCount ?? 0}건
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">바로 실행</p>
                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        onClick={() => navigate(`/invoices?date=${selectedDate}`)}
                      >
                        당일 명세표 보기
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        onClick={() => navigate(`/receivables?asOf=${selectedDate}`)}
                      >
                        기준일 미수 보기
                      </Button>
                      <Button
                        size="sm"
                        className="justify-start bg-[#7d9675] text-white hover:bg-[#6a8462]"
                        onClick={() => navigate(`/invoices?date=${selectedDate}&new=1`)}
                      >
                        이 날짜로 새 명세표 발행
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">후속 확인</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-muted-foreground">기준일 미수 후속</p>
                      {!actionPanelLoading && (
                        <span className="text-xs text-muted-foreground">{selectedReceivables.length}건</span>
                      )}
                    </div>
                    {actionPanelLoading ? (
                      <p className="text-sm text-muted-foreground">후속 대상을 계산하는 중입니다.</p>
                    ) : selectedReceivables.length === 0 ? (
                      <p className="text-sm text-muted-foreground">이 날짜 기준으로 남아 있는 미수 명세표가 없습니다.</p>
                    ) : (
                      selectedReceivables.slice(0, 3).map((invoice) => (
                        <button
                          key={`receivable-${invoice.Id}`}
                          type="button"
                          className="w-full rounded-md border px-3 py-2 text-left transition-colors hover:border-[#7d9675]"
                          onClick={() => navigate(`/receivables?asOf=${selectedDate}`)}
                        >
                          <div className="flex items-start justify-between gap-2 text-xs">
                            <div>
                              <div className="font-medium text-sm">{invoice.customer_name || '거래처 미지정'}</div>
                              <div className="mt-0.5 text-muted-foreground">
                                {invoice.invoice_date?.slice(0, 10) || '-'} · {invoice.ageDays}일 경과
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-red-600">{invoice.remainingAmount.toLocaleString()}원</div>
                              <div className="mt-0.5 text-muted-foreground">
                                {invoice.paymentStatusAsOf === 'partial' ? '부분수금' : '미수금'} · {invoice.invoice_no?.slice(-8) || '-'}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-muted-foreground">현재 기준 재방문 추천</p>
                      {!actionPanelLoading && (
                        <span className="text-xs text-muted-foreground">{currentRevisitTargets.length}건</span>
                      )}
                    </div>
                    {actionPanelLoading ? (
                      <p className="text-sm text-muted-foreground">재방문 대상을 계산하는 중입니다.</p>
                    ) : currentRevisitTargets.length === 0 ? (
                      <p className="text-sm text-muted-foreground">현재 기준으로 바로 연락할 재방문 대상이 없습니다.</p>
                    ) : (
                      currentRevisitTargets.slice(0, 3).map((customer) => (
                        <button
                          key={`revisit-${customer.Id ?? customer.name}`}
                          type="button"
                          className="w-full rounded-md border px-3 py-2 text-left transition-colors hover:border-[#7d9675]"
                          onClick={() => {
                            if (customer.Id) navigate(`/customers/${customer.Id}`)
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-medium text-sm">{customer.name}</div>
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                {customer.phone || '연락처 없음'}
                              </div>
                            </div>
                            <div className="text-right text-xs">
                              <div className="font-medium">{customer.gapDays}일 무주문</div>
                              <div className={`mt-0.5 ${(customer.outstanding_balance ?? 0) > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {(customer.outstanding_balance ?? 0) > 0
                                  ? `미수 ${(customer.outstanding_balance ?? 0).toLocaleString()}원`
                                  : (customer.last_order_date?.slice(0, 10) ?? '-')}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">당일 명세표</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start px-0 text-xs text-muted-foreground"
                    disabled
                  >
                    날짜를 클릭하면 당일 명세표와 기준일 미수, 재방문 대상을 함께 확인할 수 있습니다.
                  </Button>
                  {selectedInvoices.length === 0 ? (
                    <p className="text-sm text-muted-foreground">이날 발행된 명세표가 없습니다.</p>
                  ) : (
                    selectedInvoices.map((invoice) => (
                      <InvoiceSummaryCard key={invoice.Id} invoice={invoice} />
                    ))
                  )}
                </CardContent>
              </Card>

            </>
          ) : (
            <>
              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">{year}년 {month}월 월간 요약</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">발행 건수</span>
                    <span className="font-medium">{monthCount}건</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">총 매출</span>
                    <span className="font-semibold text-[#3d6b4a]">{monthTotal.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">미수 명세표</span>
                    <span className={`font-medium ${monthUnpaidCount > 0 ? 'text-red-500' : ''}`}>{monthUnpaidCount}건</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">거래일 수</span>
                    <span className="font-medium">{monthTradingDays}일</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">건당 평균</span>
                    <span className="font-medium">
                      {monthCount > 0 ? Math.round(monthTotal / monthCount).toLocaleString() : '0'}원
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">매출 상위 날짜</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {monthTopDays.length === 0 ? (
                    <p className="text-sm text-muted-foreground">이번 달 발행 데이터가 없습니다.</p>
                  ) : (
                    monthTopDays.map(([date, entry]) => (
                      <button
                        key={date}
                        type="button"
                        className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-xs transition-colors hover:border-[#7d9675] hover:text-[#3d6b4a]"
                        onClick={() => setSelectedDate(date)}
                      >
                        <span className="text-muted-foreground">{date.slice(5)}</span>
                        <span>{entry.count}건 / {fmt(entry.total)}원</span>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={prevMonth}>
          ← {prevMonthLabel}
        </Button>
        <Button variant="ghost" size="sm" className="ml-auto text-xs text-muted-foreground" onClick={nextMonth}>
          {nextMonthLabel} →
        </Button>
      </div>
    </div>
  )
}

function KpiCard({
  title,
  value,
  sub,
  valueClass = '',
  icon,
}: {
  title: string
  value: string
  sub: string
  valueClass?: string
  icon?: ReactNode
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-xl font-bold leading-tight ${valueClass}`}>{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  )
}

function InvoiceSummaryCard({ invoice }: { invoice: Invoice }) {
  const isUnpaid = (invoice.payment_status ?? '') !== 'paid'

  return (
    <Card className="shadow-none">
      <CardContent className="space-y-1 p-3 text-xs">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-medium text-sm">{invoice.customer_name || '거래처 미지정'}</div>
            <div className="text-muted-foreground font-mono mt-0.5">{invoice.invoice_no?.slice(-8) || '-'}</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-[#3d6b4a]">{(invoice.total_amount ?? 0).toLocaleString()}원</div>
            <div className={`mt-0.5 ${isUnpaid ? 'text-red-500' : 'text-muted-foreground'}`}>
              {isUnpaid ? '미수' : '수금 완료'}
            </div>
          </div>
        </div>
        {invoice.memo ? (
          <p className="border-t pt-2 text-muted-foreground line-clamp-2">{invoice.memo}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
