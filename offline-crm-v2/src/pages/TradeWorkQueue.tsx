import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CheckCircle2, Clock, FileText, PackageCheck, ReceiptText, Search, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAllInvoices } from '@/lib/api'
import { listAutoDepositReviewQueue } from '@/lib/autoDeposits'
import {
  buildStatusBadgeRows,
  buildTradeWorkQueue,
  getTradeGovernanceState,
  type TradeGovernanceState,
} from '@/lib/tradeGovernance'

type WorkLane = 'shipmentReady' | 'shippedUnpaid' | 'followUpDue' | 'depositReview' | 'taxInvoiceAvailable' | 'completed'

const LANE_LABELS: Record<WorkLane, string> = {
  shipmentReady: '출고준비',
  shippedUnpaid: '출고완료 미수',
  followUpDue: '후속입금 예정',
  depositReview: '입금수집 예외',
  taxInvoiceAvailable: '세금계산서',
  completed: '정리 완료',
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

function formatAmount(value: number): string {
  return `${value.toLocaleString()}원`
}

function getRowTone(state: TradeGovernanceState): string {
  if (state.followUpStatus === 'overdue' || state.overpaidAmount > 0) return 'border-red-200 bg-red-50'
  if (state.followUpStatus === 'due_today' || state.followUpStatus === 'needs_plan') return 'border-amber-200 bg-amber-50'
  if (state.taxInvoiceReadiness === 'available') return 'border-blue-100 bg-blue-50'
  return 'border-[#d8e4d6] bg-white'
}

function WorkStateRow({ state }: { state: TradeGovernanceState }) {
  const navigate = useNavigate()
  const statusRows = buildStatusBadgeRows(state)
  const nextAction = state.nextActions[0]
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${getRowTone(state)}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-gray-900">{state.customerName}</p>
            <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-[#4f6748]">
              {state.invoiceNo ?? `#${state.invoiceId}`}
            </span>
          </div>
          <div className="mt-2 grid gap-2 text-xs text-gray-700 md:grid-cols-3">
            <div className="rounded-lg bg-white/70 px-3 py-2">업무 단계: <span className="font-semibold">{statusRows[0]}</span></div>
            <div className="rounded-lg bg-white/70 px-3 py-2">돈 상태: <span className="font-semibold">{statusRows[1]}</span></div>
            <div className="rounded-lg bg-white/70 px-3 py-2">예외/증빙: <span className="font-semibold">{statusRows[2]}</span></div>
          </div>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-5">
            <span>합계 {formatAmount(state.totalAmount)}</span>
            <span>입금 {formatAmount(state.cashPaidAmount)}</span>
            <span>예치금 사용 {formatAmount(state.depositUsedAmount)}</span>
            <span>남은 받을 돈 {formatAmount(state.remainingAmount)}</span>
            <span>예정일 {state.paymentPromiseDueDate ?? '-'}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <span className="rounded-lg border bg-white px-3 py-2 text-xs font-medium text-gray-700">
            다음 액션: {nextAction.label}
          </span>
          <Button size="sm" variant="outline" onClick={() => navigate(`/invoices?edit=${state.invoiceId}`)}>
            명세표 열기
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function TradeWorkQueue() {
  const [selectedLane, setSelectedLane] = useState<WorkLane>('shipmentReady')
  const { data: invoices = [], isLoading, isError } = useQuery({
    queryKey: ['trade-work-queue-invoices'],
    queryFn: () => getAllInvoices({ sort: '-invoice_date' }),
  })
  const { data: reviewQueue } = useQuery({
    queryKey: ['trade-work-queue-deposit-review'],
    queryFn: listAutoDepositReviewQueue,
    staleTime: 15_000,
  })

  const today = todayDate()
  const states = useMemo(
    () => invoices.map((invoice) => getTradeGovernanceState(invoice, { today })),
    [invoices, today],
  )
  const queue = useMemo(() => buildTradeWorkQueue(invoices, { today }), [invoices, today])
  const completed = useMemo(
    () => states.filter((state) => state.remainingAmount <= 0 && state.fulfillmentStatus === 'shipment_confirmed'),
    [states],
  )
  const depositReviewCount = (reviewQueue?.summary.review ?? 0) + (reviewQueue?.summary.unmatched ?? 0)
  const monthEndExceptionCount = queue.shippedUnpaid.length + queue.followUpDue.length + queue.overpaymentReview.length + depositReviewCount

  const cards: Array<{ lane: WorkLane; label: string; value: number; help: string; icon: LucideIcon }> = [
    { lane: 'shipmentReady', label: '오늘 출고할 건', value: queue.shipmentReady.length, help: '완납됐지만 출고확정 전', icon: PackageCheck },
    { lane: 'shippedUnpaid', label: '출고완료 후 미수', value: queue.shippedUnpaid.length, help: '물건은 나갔고 받을 돈 남음', icon: Clock },
    { lane: 'followUpDue', label: '오늘/지연 후속입금', value: queue.followUpDue.length, help: '입금 예정일 확인 필요', icon: Search },
    { lane: 'depositReview', label: '입금수집 검토 필요', value: depositReviewCount, help: 'review/unmatched 큐', icon: FileText },
    { lane: 'taxInvoiceAvailable', label: '세금계산서 발급 가능', value: queue.taxInvoiceAvailable.length, help: '출고완료 + 미요청', icon: ReceiptText },
    { lane: 'completed', label: '정리 완료', value: completed.length, help: '출고완료 + 받을 돈 없음', icon: CheckCircle2 },
  ]

  const laneStates: Record<Exclude<WorkLane, 'depositReview'>, TradeGovernanceState[]> = {
    shipmentReady: queue.shipmentReady,
    shippedUnpaid: queue.shippedUnpaid,
    followUpDue: queue.followUpDue,
    taxInvoiceAvailable: queue.taxInvoiceAvailable,
    completed,
  }

  const selectedStates = selectedLane === 'depositReview' ? [] : laneStates[selectedLane]
  const depositReviewItems = (reviewQueue?.items ?? []).filter((item) => item.status === 'review' || item.status === 'unmatched')

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#5a7353]">DIRECT TRADE WORK QUEUE</p>
          <h2 className="mt-1 text-3xl font-bold text-gray-900">직접거래 업무함</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            출고, 수금, 후속입금, 입금수집 예외, 세금계산서 가능 건을 한 화면에서 확인합니다.
          </p>
        </div>
        <div className="rounded-xl border bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
          월말점검 남은 예외 <span className="font-bold text-red-600">{monthEndExceptionCount.toLocaleString()}건</span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {cards.map((card) => {
          const Icon = card.icon
          const active = selectedLane === card.lane
          return (
            <button
              key={card.lane}
              type="button"
              onClick={() => setSelectedLane(card.lane)}
              className={`rounded-xl border p-4 text-left shadow-sm transition ${active ? 'border-[#7d9675] bg-[#f4f7f1]' : 'bg-white hover:bg-gray-50'}`}
            >
              <Icon className="h-5 w-5 text-[#5e8a6e]" />
              <p className="mt-3 text-xs text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{card.value.toLocaleString()}건</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{card.help}</p>
            </button>
          )
        })}
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{LANE_LABELS[selectedLane]} 레인</h3>
            <p className="mt-1 text-xs text-muted-foreground">업무함 상태는 명세표 공통 상태 계산 유틸과 같은 기준을 사용합니다.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>새로고침</Button>
        </div>
        <div className="mt-4 space-y-3">
          {isLoading ? (
            <div className="rounded-lg bg-gray-50 px-4 py-10 text-center text-sm text-muted-foreground">불러오는 중...</div>
          ) : isError ? (
            <div className="rounded-lg bg-red-50 px-4 py-10 text-center text-sm text-red-600">업무함 데이터를 불러오지 못했습니다.</div>
          ) : selectedLane === 'depositReview' ? (
            depositReviewItems.length === 0 ? (
              <div className="rounded-lg bg-gray-50 px-4 py-10 text-center text-sm text-muted-foreground">입금수집 검토 대기 건이 없습니다.</div>
            ) : (
              depositReviewItems.map((item) => (
                <div key={item.queueId} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{item.sender} · {item.amount.toLocaleString()}원</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.occurredAt.slice(0, 16).replace('T', ' ')} · {item.status === 'review' ? '검토 필요' : '미매칭'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.reason ?? '후보 확정 또는 제외 처리가 필요합니다.'}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => window.location.assign('/deposit-inbox')}>입금수집함 열기</Button>
                  </div>
                </div>
              ))
            )
          ) : selectedStates.length === 0 ? (
            <div className="rounded-lg bg-gray-50 px-4 py-10 text-center text-sm text-muted-foreground">이 레인에 표시할 업무가 없습니다.</div>
          ) : (
            selectedStates.map((state) => <WorkStateRow key={state.invoiceId} state={state} />)
          )}
        </div>
      </div>
    </div>
  )
}
