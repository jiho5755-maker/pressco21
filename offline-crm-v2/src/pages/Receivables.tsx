import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, AlertCircle, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getAllInvoices, getCustomer, updateInvoice, recalcCustomerStats } from '@/lib/api'
import type { Customer, Invoice } from '@/lib/api'
import { exportReceivables } from '@/lib/excel'
import { getLegacyBalanceBaseline } from '@/lib/legacySnapshots'
import { getPaidAmountAsOf, getPaymentStatusAsOf, getRemainingAmountAsOf } from '@/lib/reporting'

// ─── 에이징 구간 ────────────────────────────────
const AGING_BUCKETS = [
  { label: '30일 이내', min: 0, max: 30 },
  { label: '31~60일', min: 31, max: 60 },
  { label: '61~90일', min: 61, max: 90 },
  { label: '91~180일', min: 91, max: 180 },
  { label: '180일 초과', min: 181, max: Infinity },
]

function isValidCalendarDate(value: string | null): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function getDaysSince(dateStr: string | undefined, baseDate = todayDate()): number {
  if (!dateStr) return 0
  return Math.max(0, Math.floor((new Date(baseDate).getTime() - new Date(dateStr).getTime()) / 86400000))
}

function calcRemaining(inv: Invoice): number {
  return (inv.total_amount ?? 0) - (inv.paid_amount ?? 0)
}

interface ReceivableSnapshot extends Invoice {
  asOfPaidAmount: number
  asOfRemaining: number
  asOfStatus: 'paid' | 'partial' | 'unpaid'
}

interface CustomerReceivableBreakdown {
  customer: Customer
  legacyBaseline: number
}

// ─── 입금 확인 다이얼로그 ───────────────────────
interface PaymentDialogProps {
  invoice: Invoice | null
  onClose: () => void
  onSaved: () => void
}

function PaymentDialog({ invoice, onClose, onSaved }: PaymentDialogProps) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState(0)
  const [method, setMethod] = useState('계좌이체')
  const [isSaving, setIsSaving] = useState(false)

  if (!invoice) return null

  const remaining = calcRemaining(invoice)
  const prevPaid = invoice.paid_amount ?? 0
  const total = invoice.total_amount ?? 0
  const newPaid = prevPaid + amount
  const newRemaining = remaining - amount
  // payment_status: 이번 명세표 total 기준으로만 판정 (InvoiceDialog.calcStatus와 동일 기준)
  // prevBal은 이전 명세표에 귀속된 채무이므로 완납 여부에 포함하지 않음
  const newPaymentStatus: string =
    total <= 0 ? 'paid'
    : newPaid >= total ? 'paid'
    : newPaid > 0 ? 'partial'
    : 'unpaid'

  async function handleSave() {
    if (amount <= 0) {
      toast.error('입금액을 입력해주세요.')
      return
    }
    if (amount > remaining) {
      toast.error(`미수금(${remaining.toLocaleString()}원)보다 많이 입금할 수 없습니다.`)
      return
    }
    setIsSaving(true)
    try {
      await updateInvoice(invoice!.Id, {
        paid_amount: newPaid,
        // current_balance: 이 명세표에서 남은 금액만 기록 (prevBal은 별도 명세표에 귀속)
        current_balance: newRemaining,
        payment_status: newPaymentStatus,
        payment_method: method,
      })
      qc.invalidateQueries({ queryKey: ['receivables'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      // 해당 명세표 개별 캐시 무효화 (InvoiceDialog에서 다시 열 때 갱신 반영)
      qc.invalidateQueries({ queryKey: ['invoice', invoice!.Id] })
      // 거래내역 갱신
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['transactions-crm'] })
      // 고객 미수금 재계산 + 대시보드 전체 갱신
      if (invoice!.customer_id) {
        try { await recalcCustomerStats(invoice!.customer_id as number) } catch {}
        qc.invalidateQueries({ queryKey: ['customers'] })
      }
      // 대시보드 + 기간 리포트 전체 갱신
      qc.invalidateQueries({
        predicate: (q) => {
          const k = q.queryKey[0]
          return typeof k === 'string' && (k.startsWith('dash-') || k.startsWith('period-') || k.startsWith('calendar-'))
        },
      })
      onSaved()
    } catch (e) {
      console.error(e)
      toast.error('저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={!!invoice} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>입금 확인</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-gray-50 rounded-md p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">거래처</span>
              <span className="font-medium">{invoice.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">발행번호</span>
              <span className="font-mono text-xs">{invoice.invoice_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">미수금</span>
              <span className="font-bold text-red-600">{remaining.toLocaleString()}원</span>
            </div>
          </div>

          <div>
            <Label className="text-xs">입금액</Label>
            <Input
              type="number"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder={`최대 ${remaining.toLocaleString()}원`}
              className="mt-1"
              autoFocus
            />
          </div>

          <div>
            <Label className="text-xs">입금방법</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="현금">현금</SelectItem>
                <SelectItem value="계좌이체">계좌이체</SelectItem>
                <SelectItem value="카드">카드</SelectItem>
                <SelectItem value="수표">수표</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {amount > 0 && (
            <div className="bg-blue-50 rounded-md p-2 text-xs text-blue-700">
              입금 후 잔액:{' '}
              <span className={newRemaining > 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                {newRemaining.toLocaleString()}원
              </span>
              {newPaymentStatus === 'paid' && ' → 완납 처리'}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || amount <= 0}
              className="bg-[#7d9675] hover:bg-[#6a8462] text-white"
            >
              {isSaving ? '처리 중...' : '입금 확인'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── 미수금 관리 메인 ───────────────────────────
export function Receivables() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [paymentTarget, setPaymentTarget] = useState<Invoice | null>(null)
  const [customerSearch, setCustomerSearch] = useState(() => searchParams.get('customer') ?? '')
  const [customerIdFilter, setCustomerIdFilter] = useState(() => searchParams.get('customerId') ?? '')
  const [asOfDate, setAsOfDate] = useState(() => {
    const value = searchParams.get('asOf')
    return isValidCalendarDate(value) ? value : todayDate()
  })

  useEffect(() => {
    const value = searchParams.get('asOf')
    const normalized = isValidCalendarDate(value) ? value : todayDate()
    setAsOfDate((prev) => (prev === normalized ? prev : normalized))
    const nextCustomer = searchParams.get('customer') ?? ''
    setCustomerSearch((prev) => (prev === nextCustomer ? prev : nextCustomer))
    const nextCustomerId = searchParams.get('customerId') ?? ''
    setCustomerIdFilter((prev) => (prev === nextCustomerId ? prev : nextCustomerId))
  }, [searchParams])
  useEffect(() => {
    setPaymentTarget(null)
  }, [asOfDate])

  const { data: invoices = [], isLoading, isError } = useQuery({
    queryKey: ['receivables', asOfDate],
    queryFn: () =>
      getAllInvoices({
        where: '(payment_status,eq,unpaid)~or(payment_status,eq,partial)',
        sort: '-invoice_date',
        fields: 'Id,invoice_no,invoice_date,customer_id,customer_name,total_amount,paid_amount,payment_status,current_balance',
      }),
    staleTime: 2 * 60 * 1000,
  })
  const { data: customerBreakdown } = useQuery<CustomerReceivableBreakdown | null>({
    queryKey: ['receivable-customer-breakdown', customerIdFilter],
    enabled: !!customerIdFilter,
    queryFn: async () => {
      const customer = await getCustomer(Number(customerIdFilter))
      return {
        customer,
        legacyBaseline: await getLegacyBalanceBaseline(customer),
      }
    },
    staleTime: 10 * 60 * 1000,
  })
  const isTodayView = asOfDate === todayDate()
  const visibleInvoices: ReceivableSnapshot[] = invoices
    .map((inv) => {
      const asOfPaidAmount = getPaidAmountAsOf(inv, asOfDate)
      const asOfRemaining = getRemainingAmountAsOf(inv, asOfDate)
      const asOfStatus = getPaymentStatusAsOf(inv, asOfDate)
      return {
        ...inv,
        asOfPaidAmount,
        asOfRemaining,
        asOfStatus,
      }
    })
    .filter((inv) => {
      const invoiceDate = inv.invoice_date?.slice(0, 10)
      if (!invoiceDate) return false
      return invoiceDate <= asOfDate && inv.asOfRemaining > 0
    })

  function applyAsOfDate(nextValue: string) {
    const normalized = nextValue || todayDate()
    setAsOfDate(normalized)
    const nextParams = new URLSearchParams(searchParams)
    if (normalized) nextParams.set('asOf', normalized)
    else nextParams.delete('asOf')
    setSearchParams(nextParams, { replace: true })
  }

  function applyCustomerFilter(nextValue: string, nextCustomerId = '') {
    setCustomerSearch(nextValue)
    setCustomerIdFilter(nextCustomerId)
    const nextParams = new URLSearchParams(searchParams)
    if (nextValue.trim()) nextParams.set('customer', nextValue.trim())
    else nextParams.delete('customer')
    if (nextCustomerId) nextParams.set('customerId', nextCustomerId)
    else nextParams.delete('customerId')
    setSearchParams(nextParams, { replace: true })
  }

  // 에이징 집계
  const aging = AGING_BUCKETS.map((bucket) => {
    const filtered = visibleInvoices.filter((inv) => {
      const days = getDaysSince(inv.invoice_date, asOfDate)
      return days >= bucket.min && days <= bucket.max
    })
    return {
      ...bucket,
      count: filtered.length,
      amount: filtered.reduce((s, inv) => s + inv.asOfRemaining, 0),
    }
  })

  const filteredInvoices = visibleInvoices.filter((inv) => {
    if (customerIdFilter && String(inv.customer_id ?? '') === customerIdFilter) return true
    if (!customerSearch.trim()) return true
    return (inv.customer_name ?? '').toLowerCase().includes(customerSearch.trim().toLowerCase())
  })
  const filteredTotalReceivable = filteredInvoices.reduce((sum, inv) => sum + inv.asOfRemaining, 0)
  const criticalCount = filteredInvoices.filter((inv) => {
    const days = getDaysSince(inv.invoice_date, asOfDate)
    return days > 90
  }).length
  const breakdownCrmReceivable = customerBreakdown ? filteredInvoices.reduce((sum, inv) => sum + inv.asOfRemaining, 0) : 0
  const breakdownCurrentBalance = customerBreakdown?.customer.outstanding_balance ?? 0

  if (isLoading)
    return (
      <div className="p-6 text-muted-foreground">
        불러오는 중...
      </div>
    )

  if (isError)
    return (
      <div className="p-6 text-red-500">
        데이터를 불러오지 못했습니다.
      </div>
    )

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">미수금 관리</h2>
          <p className="text-sm text-muted-foreground mt-1">
            총 <span className="font-medium text-red-600">{filteredTotalReceivable.toLocaleString()}원</span>
            {' / '}{filteredInvoices.length}건
            {criticalCount > 0 && (
              <span className="ml-2 text-amber-600">
                <AlertCircle className="inline h-3.5 w-3.5 mr-0.5" />
                90일 초과 {criticalCount}건
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportReceivables(
            filteredInvoices.map((inv) => ({
              ...inv,
              paid_amount: inv.asOfPaidAmount,
              payment_status: inv.asOfStatus,
            })),
            asOfDate,
          )}
          className="gap-1"
        >
          <Download className="h-4 w-4" />
          엑셀 내보내기
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={customerSearch}
            onChange={(e) => applyCustomerFilter(e.target.value, customerIdFilter)}
            placeholder="거래처명 필터"
            className="pl-9 w-[240px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="receivables-asof" className="text-xs text-muted-foreground">기준일</Label>
          <Input
            id="receivables-asof"
            type="date"
            value={asOfDate}
            onChange={(e) => applyAsOfDate(e.target.value)}
            className="w-[170px]"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={() => applyAsOfDate(todayDate())}>
          오늘 기준
        </Button>
        {(customerSearch || customerIdFilter) && (
          <Button variant="ghost" size="sm" onClick={() => applyCustomerFilter('')}>
            거래처 필터 해제
          </Button>
        )}
        {!isTodayView && (
          <span className="text-xs text-muted-foreground">
            과거 기준일은 조회 전용입니다. 입금 처리는 오늘 기준에서만 가능합니다.
          </span>
        )}
      </div>

      {customerBreakdown && (
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-white px-4 py-3">
            <p className="text-xs text-muted-foreground">레거시 baseline</p>
            <p className={`mt-1 text-base font-semibold ${customerBreakdown.legacyBaseline > 0 ? 'text-red-600' : customerBreakdown.legacyBaseline < 0 ? 'text-blue-700' : ''}`}>
              {customerBreakdown.legacyBaseline.toLocaleString()}원
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {customerBreakdown.customer.name} 원본 잔액
            </p>
          </div>
          <div className="rounded-lg border bg-white px-4 py-3">
            <p className="text-xs text-muted-foreground">기준일 CRM 미수</p>
            <p className={`mt-1 text-base font-semibold ${breakdownCrmReceivable > 0 ? 'text-red-600' : breakdownCrmReceivable < 0 ? 'text-blue-700' : ''}`}>
              {breakdownCrmReceivable.toLocaleString()}원
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {asOfDate} 기준 미수 명세표 합계
            </p>
          </div>
          <div className="rounded-lg border border-[#d9e4d5] bg-[#f7faf6] px-4 py-3">
            <p className="text-xs text-muted-foreground">현재 고객 잔액</p>
            <p className={`mt-1 text-base font-semibold ${breakdownCurrentBalance > 0 ? 'text-red-600' : breakdownCurrentBalance < 0 ? 'text-blue-700' : ''}`}>
              {breakdownCurrentBalance.toLocaleString()}원
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              운영 고객 카드 저장값{!isTodayView ? ' (오늘 기준)' : ''}
            </p>
          </div>
        </div>
      )}

      {/* 에이징 테이블 */}
      <div className="rounded-lg border bg-white overflow-hidden mb-6">
        <div className="px-4 py-3 border-b bg-gray-50">
          <span className="text-sm font-medium">에이징 분석</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              {AGING_BUCKETS.map((b) => (
                <th
                  key={b.label}
                  className="text-center px-4 py-2 font-medium text-muted-foreground text-xs"
                >
                  {b.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              {aging.map((b) => (
                <td key={b.label} className="text-center px-4 py-3">
                  <div className={`text-base font-bold ${b.min > 90 ? 'text-red-600' : b.min > 30 ? 'text-amber-600' : 'text-gray-800'}`}>
                    {b.amount.toLocaleString()}원
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{b.count}건</div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* 미수금 목록 */}
      {filteredInvoices.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center text-muted-foreground">
          해당 기준일까지의 미수금이 없습니다.
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">거래처</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">발행번호</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">발행일</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">경과</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">합계</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">입금</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">미수금</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">상태</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv) => {
                const days = getDaysSince(inv.invoice_date, asOfDate)
                const ageColor =
                  days > 180
                    ? 'text-red-700 font-bold'
                    : days > 90
                      ? 'text-red-500'
                      : days > 60
                        ? 'text-amber-600'
                        : 'text-muted-foreground'
                return (
                  <tr key={inv.Id} className="border-b last:border-b-0">
                    <td className="px-4 py-2.5 font-medium">{inv.customer_name ?? '-'}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {inv.invoice_no ?? '-'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                      {inv.invoice_date?.slice(0, 10) ?? '-'}
                    </td>
                    <td className={`px-4 py-2.5 text-right text-xs ${ageColor}`}>
                      {days}일
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {(inv.total_amount ?? 0).toLocaleString()}원
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                      {inv.asOfPaidAmount > 0
                        ? `${inv.asOfPaidAmount.toLocaleString()}원`
                        : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-red-600">
                      {inv.asOfRemaining.toLocaleString()}원
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs font-medium ${
                          inv.asOfStatus === 'partial' ? 'text-amber-600' : 'text-red-600'
                        }`}
                      >
                        {inv.asOfStatus === 'partial' ? '부분수금' : '미수금'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={!isTodayView}
                        onClick={() => setPaymentTarget(inv)}
                      >
                        입금 확인
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 입금 다이얼로그 */}
      <PaymentDialog
        invoice={paymentTarget}
        onClose={() => setPaymentTarget(null)}
        onSaved={() => setPaymentTarget(null)}
      />
    </div>
  )
}
