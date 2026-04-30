import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CalendarDays, CheckSquare, ReceiptText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getAllCustomers, getAllInvoices } from '@/lib/api'
import { listAutoDepositReviewQueue } from '@/lib/autoDeposits'
import { parseCustomerAccountingMeta } from '@/lib/accountingMeta'
import {
  buildHistoricalPaidShipmentDryRun,
  getTradeGovernanceState,
  type TradeGovernanceState,
} from '@/lib/tradeGovernance'

type ReviewReason =
  | '출고완료 누락'
  | '입금 반영 미처리'
  | '출고완료 미수'
  | '후속입금 지연'
  | '예치금/환불대기 잔액'
  | '초과입금 확인 필요'
  | '세금계산서 기준 확인'

interface ReviewRow {
  id: string
  reason: ReviewReason
  customerName: string
  invoiceId?: number
  invoiceNo?: string
  fulfillmentLabel: string
  totalAmount: number
  paidAmount: number
  depositUsedAmount: number
  remainingAmount: number
  dueDate?: string
  nextAction: string
}

interface MonthEndReviewProps {
  titleOverride?: string
  descriptionOverride?: string
}

function todayDate(): string {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date())
}

function getMonthStart(value: string): string {
  return `${value.slice(0, 7)}-01`
}

function getMonthEnd(value: string): string {
  const [year, month] = value.slice(0, 7).split('-').map(Number)
  return new Date(year, month, 0).toISOString().slice(0, 10)
}

function formatAmount(value: number): string {
  return `${value.toLocaleString()}원`
}

function inPeriod(dateValue: string | undefined, from: string, to: string): boolean {
  const date = dateValue?.slice(0, 10) ?? ''
  if (!date) return true
  return date >= from && date <= to
}

function invoiceRow(state: TradeGovernanceState, reason: ReviewReason, nextAction: string): ReviewRow {
  return {
    id: `${reason}-${state.invoiceId}`,
    reason,
    customerName: state.customerName,
    invoiceId: state.invoiceId,
    invoiceNo: state.invoiceNo,
    fulfillmentLabel: state.fulfillmentLabel,
    totalAmount: state.totalAmount,
    paidAmount: state.cashPaidAmount,
    depositUsedAmount: state.depositUsedAmount,
    remainingAmount: state.remainingAmount,
    dueDate: state.paymentPromiseDueDate,
    nextAction,
  }
}

export function MonthEndReview({ titleOverride, descriptionOverride }: MonthEndReviewProps = {}) {
  const navigate = useNavigate()
  const currentMonth = todayDate()
  const [dateFrom, setDateFrom] = useState(getMonthStart(currentMonth))
  const [dateTo, setDateTo] = useState(getMonthEnd(currentMonth))

  const { data: invoices = [], isLoading, isError } = useQuery({
    queryKey: ['month-end-review-invoices'],
    queryFn: () => getAllInvoices({ sort: '-invoice_date' }),
  })
  const { data: customers = [] } = useQuery({
    queryKey: ['month-end-review-customers'],
    queryFn: () => getAllCustomers({ sort: 'name' }),
  })
  const { data: reviewQueue } = useQuery({
    queryKey: ['month-end-review-deposit-queue'],
    queryFn: listAutoDepositReviewQueue,
    staleTime: 15_000,
  })

  const today = todayDate()
  const periodInvoices = useMemo(
    () => invoices.filter((invoice) => inPeriod(invoice.invoice_date, dateFrom, dateTo)),
    [dateFrom, dateTo, invoices],
  )
  const states = useMemo(
    () => periodInvoices.map((invoice) => getTradeGovernanceState(invoice, { today })),
    [periodInvoices, today],
  )
  const dryRun = useMemo(() => buildHistoricalPaidShipmentDryRun(periodInvoices), [periodInvoices])
  const pendingDepositCount = (reviewQueue?.summary.review ?? 0) + (reviewQueue?.summary.unmatched ?? 0)

  const rows = useMemo<ReviewRow[]>(() => {
    const shipmentMissing: ReviewRow[] = dryRun.candidates.map((candidate) => ({
      id: `shipment-${candidate.invoiceId}`,
      reason: '출고완료 누락' as const,
      customerName: candidate.customerName,
      invoiceId: candidate.invoiceId,
      invoiceNo: candidate.invoiceNo,
      fulfillmentLabel: '미확정',
      totalAmount: candidate.totalAmount,
      paidAmount: candidate.paidAmount,
      depositUsedAmount: 0,
      remainingAmount: candidate.remainingAmount,
      nextAction: '명세표에서 dry-run 확인 후 승인 대기',
    }))
    const shippedUnpaid = states
      .filter((state) => state.fulfillmentStatus === 'shipment_confirmed' && state.remainingAmount > 0)
      .map((state) => invoiceRow(state, '출고완료 미수', '후속입금 예정 등록 또는 입금 확인'))
    const overdueFollowUp = states
      .filter((state) => state.followUpStatus === 'overdue' || state.followUpStatus === 'due_today')
      .map((state) => invoiceRow(state, '후속입금 지연', state.followUpStatus === 'due_today' ? '오늘 입금 확인' : '고객 연락/입금 반영 확인'))
    const overpayments = states
      .filter((state) => state.overpaidAmount > 0)
      .map((state) => invoiceRow(state, '초과입금 확인 필요', '명세표 반영액과 예치금/환불대기 분리'))
    const taxInvoiceRows = states
      .filter((state) => state.taxInvoiceReadiness === 'available')
      .map((state) => invoiceRow(state, '세금계산서 기준 확인', '명세표 품목/공급가액/세액 기준으로 발급 검토'))
    const customerBalanceRows = customers
      .map((customer): ReviewRow | null => {
        const meta = parseCustomerAccountingMeta(customer.memo as string | undefined)
        const balance = meta.depositBalance + meta.refundPendingBalance
        if (balance <= 0) return null
        return {
          id: `customer-balance-${customer.Id}`,
          reason: '예치금/환불대기 잔액' as const,
          customerName: customer.name ?? customer.book_name ?? `고객 #${customer.Id}`,
          fulfillmentLabel: '-',
          totalAmount: balance,
          paidAmount: 0,
          depositUsedAmount: meta.depositBalance,
          remainingAmount: meta.refundPendingBalance,
          nextAction: `예치금 ${formatAmount(meta.depositBalance)} / 환불대기 ${formatAmount(meta.refundPendingBalance)} 확인`,
        }
      })
      .filter((row): row is ReviewRow => row !== null)
    const depositQueueRows: ReviewRow[] = (reviewQueue?.items ?? [])
      .filter((item) => item.status === 'review' || item.status === 'unmatched')
      .map((item) => ({
        id: `deposit-${item.queueId}`,
        reason: '입금 반영 미처리' as const,
        customerName: item.sender,
        fulfillmentLabel: item.status === 'review' ? '검토 필요' : '미매칭',
        totalAmount: item.amount,
        paidAmount: item.amount,
        depositUsedAmount: 0,
        remainingAmount: 0,
        dueDate: item.occurredAt.slice(0, 10),
        nextAction: '입금 반영에서 후보 확정/수동 완료/제외/보류',
      }))

    return [
      ...shipmentMissing,
      ...depositQueueRows,
      ...shippedUnpaid,
      ...overdueFollowUp,
      ...customerBalanceRows,
      ...overpayments,
      ...taxInvoiceRows,
    ]
  }, [customers, dryRun.candidates, reviewQueue?.items, states])

  const countByReason = rows.reduce<Record<ReviewReason, number>>((summary, row) => {
    summary[row.reason] = (summary[row.reason] ?? 0) + 1
    return summary
  }, {
    '출고완료 누락': 0,
    '입금 반영 미처리': 0,
    '출고완료 미수': 0,
    '후속입금 지연': 0,
    '예치금/환불대기 잔액': 0,
    '초과입금 확인 필요': 0,
    '세금계산서 기준 확인': 0,
  })

  const cards: Array<{ reason: ReviewReason; description: string }> = [
    { reason: '출고완료 누락', description: '완납인데 출고확정 없음' },
    { reason: '입금 반영 미처리', description: 'review/unmatched 큐' },
    { reason: '출고완료 미수', description: '물건 나감 + 받을 돈 남음' },
    { reason: '후속입금 지연', description: '오늘/기한 지난 약속' },
    { reason: '예치금/환불대기 잔액', description: '고객 잔액 확인' },
    { reason: '초과입금 확인 필요', description: '명세표 금액과 분리' },
    { reason: '세금계산서 기준 확인', description: '출고완료 + 발급 가능' },
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#5a7353]">MONTH-END DIRECT TRADE REVIEW</p>
          <h2 className="mt-1 text-3xl font-bold text-gray-900">{titleOverride ?? '마감 점검'}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {descriptionOverride ?? '마감 전 출고, 입금 반영, 후속입금, 예치금/환불대기, 세금계산서 기준 예외를 확인합니다.'}
          </p>
        </div>
        <div className="grid gap-2 rounded-xl border bg-white p-3 shadow-sm md:grid-cols-[150px_150px_auto]">
          <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          <Button variant="outline" onClick={() => { setDateFrom(getMonthStart(todayDate())); setDateTo(getMonthEnd(todayDate())) }}>
            이번 달
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {cards.map((card) => (
          <div key={card.reason} className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">{card.reason}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{(countByReason[card.reason] ?? 0).toLocaleString()}건</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{card.description}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-700" />
          <p className="mt-2 text-sm font-semibold text-amber-900">dry-run 우선</p>
          <p className="mt-1 text-xs text-amber-800">운영 데이터 변경은 승인 전 실행하지 않습니다.</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <ReceiptText className="h-5 w-5 text-blue-700" />
          <p className="mt-2 text-sm font-semibold text-blue-900">세금계산서 금액</p>
          <p className="mt-1 text-xs text-blue-800">입금액이 아니라 명세표 품목/공급가액/세액 기준입니다.</p>
        </div>
        <div className="rounded-xl border border-[#d8e4d6] bg-[#f8faf7] p-4">
          <CheckSquare className="h-5 w-5 text-[#5e8a6e]" />
          <p className="mt-2 text-sm font-semibold text-[#2f4d37]">예외 행 연결</p>
          <p className="mt-1 text-xs text-[#5f6f60]">각 행에서 원본 명세표 또는 입금 반영으로 이동합니다.</p>
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">점검 상세</h3>
            <p className="mt-1 text-xs text-muted-foreground">기간 {dateFrom} ~ {dateTo} · 상세 {rows.length.toLocaleString()}건 · 입금 반영 미처리 {pendingDepositCount.toLocaleString()}건</p>
          </div>
          <CalendarDays className="h-5 w-5 text-[#5e8a6e]" />
        </div>
        <div className="overflow-auto" data-guide-id="month-end-review-table">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">예외 사유</th>
                <th className="px-4 py-3">거래처</th>
                <th className="px-4 py-3">명세표</th>
                <th className="px-4 py-3">출고상태</th>
                <th className="px-4 py-3 text-right">명세표 합계</th>
                <th className="px-4 py-3 text-right">실제 입금</th>
                <th className="px-4 py-3 text-right">예치금 사용</th>
                <th className="px-4 py-3 text-right">남은 받을 돈</th>
                <th className="px-4 py-3">입금 예정일</th>
                <th className="px-4 py-3">다음 작업</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">불러오는 중...</td></tr>
              ) : isError ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-red-600">마감 점검 데이터를 불러오지 못했습니다.</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">점검할 예외가 없습니다.</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="border-t align-top">
                  <td className="px-4 py-3"><span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">{row.reason}</span></td>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.customerName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.invoiceNo ?? '-'}</td>
                  <td className="px-4 py-3">{row.fulfillmentLabel}</td>
                  <td className="px-4 py-3 text-right">{formatAmount(row.totalAmount)}</td>
                  <td className="px-4 py-3 text-right">{formatAmount(row.paidAmount)}</td>
                  <td className="px-4 py-3 text-right">{formatAmount(row.depositUsedAmount)}</td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">{formatAmount(row.remainingAmount)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{row.dueDate ?? '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-52 flex-col gap-2">
                      <span className="text-xs text-muted-foreground">{row.nextAction}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => row.invoiceId ? navigate(`/invoices?edit=${row.invoiceId}`) : navigate('/settlements?section=deposits')}
                      >
                        원본 화면 열기
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
