import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, AlertCircle, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { getAllCustomers, getAllInvoices, getCustomer, updateCustomer, updateInvoice, recalcCustomerStats } from '@/lib/api'
import type { Customer, Invoice } from '@/lib/api'
import { exportOutgoingLedger, exportReceivables } from '@/lib/excel'
import {
  getFiscalBalanceSnapshots,
  getLegacyCustomerSnapshots,
  getLegacyPayableBaselineFromSnapshots,
  getLegacyReceivableBaseline,
  parseLegacyPayableMemo,
  parseLegacyReceivableMemo,
  serializeLegacyPayableMemo,
  serializeLegacyReceivableMemo,
} from '@/lib/legacySnapshots'
import {
  appendCustomerAccountingEvent,
  getInvoiceDepositUsedAmount,
  parseCustomerAccountingMeta,
} from '@/lib/accountingMeta'
import { getPaidAmountAsOf } from '@/lib/reporting'
import { loadActiveWorkOperatorProfile } from '@/lib/settings'
import {
  buildCustomerReceivableLedger,
  buildResolvedReceivableInvoices,
  resolveInvoiceCustomer,
  type CustomerReceivableLedger,
  type ResolvedReceivableInvoice,
} from '@/lib/receivables'

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

function currentTimestamp(): string {
  return new Date().toISOString()
}

function getDefaultReceivableTab(isPayableMode: boolean): 'all' | 'crm' {
  return isPayableMode ? 'all' : 'crm'
}

function getDaysSince(dateStr: string | undefined, baseDate = todayDate()): number {
  if (!dateStr) return 0
  return Math.max(0, Math.floor((new Date(baseDate).getTime() - new Date(dateStr).getTime()) / 86400000))
}

function calcRemaining(inv: Invoice): number {
  return Math.max(0, (inv.total_amount ?? 0) - (inv.paid_amount ?? 0) - getInvoiceDepositUsedAmount(inv.memo as string | undefined))
}

interface ReceivableSnapshot extends Invoice {
  asOfPaidAmount: number
  asOfRemaining: number
  asOfStatus: 'paid' | 'partial' | 'unpaid'
}

interface CustomerReceivableBreakdown {
  customer: Customer
  legacyBaseline: number
  payableBaseline: number
}

interface LegacyPaymentTarget {
  customer: Customer
  ledger: CustomerReceivableLedger
}

interface LegacyPayableTarget {
  customer: Customer
  payableAmount: number
}

interface PayableLedgerEntry {
  customerId: number | null
  legacyId: string
  customerName: string
  payableAmount: number
  bookName?: string
}

interface RefundPendingEntry {
  customer: Customer
  refundPendingAmount: number
}

interface OutgoingLedgerEntry {
  key: string
  customerId: number | null
  customerName: string
  amount: number
  kind: 'payable' | 'refund'
  note: string
  bookName?: string
  customer?: Customer
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
  const [overpaymentAction, setOverpaymentAction] = useState<'deposit' | 'refund'>('deposit')
  const [isSaving, setIsSaving] = useState(false)
  const invoiceId = invoice?.Id ?? 0
  const remaining = invoice ? calcRemaining(invoice) : 0
  const prevPaid = invoice?.paid_amount ?? 0
  const total = invoice?.total_amount ?? 0
  const effectivePaidAmount = Math.min(amount, remaining)
  const overflowAmount = Math.max(0, amount - remaining)
  const newPaid = Math.min(total, prevPaid + effectivePaidAmount)
  const newRemaining = Math.max(0, remaining - effectivePaidAmount)
  // payment_status: 이번 명세표 total 기준으로만 판정 (InvoiceDialog.calcStatus와 동일 기준)
  // prevBal은 이전 명세표에 귀속된 채무이므로 완납 여부에 포함하지 않음
  const newPaymentStatus: string =
    total <= 0 ? 'paid'
    : newPaid >= total ? 'paid'
    : newPaid > 0 ? 'partial'
    : 'unpaid'
  const { data: linkedCustomer } = useQuery({
    queryKey: ['receivable-payment-customer', invoiceId, invoice?.customer_id],
    queryFn: () => invoice?.customer_id ? getCustomer(invoice.customer_id as number) : Promise.resolve(null),
    enabled: !!invoice?.customer_id,
    staleTime: 30 * 1000,
  })
  const customerMeta = parseCustomerAccountingMeta(linkedCustomer?.memo as string | undefined)
  const activeOperator = loadActiveWorkOperatorProfile()

  if (!invoice) return null

  async function refreshPaymentViews(customerId?: number) {
    qc.invalidateQueries({ queryKey: ['receivables'] })
    qc.invalidateQueries({ queryKey: ['receivable-link-customers'] })
    qc.invalidateQueries({ queryKey: ['invoices'] })
    qc.invalidateQueries({ queryKey: ['invoice', invoice!.Id] })
    qc.invalidateQueries({ queryKey: ['transactions'] })
    qc.invalidateQueries({ queryKey: ['transactions-crm'] })
    qc.invalidateQueries({ queryKey: ['transactions-customer-directory'] })
    qc.invalidateQueries({ queryKey: ['customers'] })
    if (customerId) {
      qc.invalidateQueries({ queryKey: ['customer', customerId] })
      qc.invalidateQueries({ queryKey: ['receivable-customer-breakdown', String(customerId)] })
    }
    qc.invalidateQueries({
      predicate: (q) => {
        const k = q.queryKey[0]
        return typeof k === 'string' && (k.startsWith('dash-') || k.startsWith('period-') || k.startsWith('calendar-'))
      },
    })
  }

  async function handleSave() {
    if (amount <= 0) {
      toast.error('입금액을 입력해주세요.')
      return
    }
    if (amount > remaining && !linkedCustomer) {
      toast.error('초과 입금 처리에는 연결된 고객 정보가 필요합니다.')
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

      if (overflowAmount > 0 && linkedCustomer) {
        const nextMemo = appendCustomerAccountingEvent(
          linkedCustomer.memo as string | undefined,
          {
            type: overpaymentAction === 'deposit' ? 'deposit_added' : 'refund_pending_added',
            amount: overflowAmount,
            date: todayDate(),
            method,
            operator: activeOperator?.operatorName,
            accountId: activeOperator?.id,
            accountLabel: activeOperator?.label,
            createdAt: currentTimestamp(),
            relatedInvoiceId: invoiceId,
            note: `초과 입금 ${overflowAmount.toLocaleString()}원`,
          },
          overpaymentAction === 'deposit'
            ? { depositBalance: customerMeta.depositBalance + overflowAmount }
            : { refundPendingBalance: customerMeta.refundPendingBalance + overflowAmount },
        )
        await updateCustomer(linkedCustomer.Id, { memo: nextMemo })
      }

      if (invoice!.customer_id) {
        try { await recalcCustomerStats(invoice!.customer_id as number) } catch {}
      }
      await refreshPaymentViews(typeof invoice?.customer_id === 'number' ? invoice.customer_id : undefined)
      onSaved()
      toast.success(
        overflowAmount > 0
          ? overpaymentAction === 'deposit'
            ? '초과 입금을 예치금으로 보관했습니다.'
            : '초과 입금을 환불대기로 등록했습니다.'
          : '입금 처리가 반영되었습니다.',
      )
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

          {overflowAmount > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 space-y-2">
              <div className="text-xs font-medium text-amber-900">
                초과 입금 {overflowAmount.toLocaleString()}원이 감지되었습니다.
              </div>
              <div>
                <Label className="text-xs">초과 입금 처리 방식</Label>
                <Select value={overpaymentAction} onValueChange={(value: 'deposit' | 'refund') => setOverpaymentAction(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">예치금으로 보관</SelectItem>
                    <SelectItem value="refund">환불대기로 등록</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-amber-800">
                현재 예치금 {customerMeta.depositBalance.toLocaleString()}원 · 환불대기 {customerMeta.refundPendingBalance.toLocaleString()}원
              </p>
            </div>
          )}

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
              {overflowAmount > 0 && (
                <span className="ml-2 text-amber-700">
                  · 초과 {overflowAmount.toLocaleString()}원 {overpaymentAction === 'deposit' ? '예치금 보관' : '환불대기'}
                </span>
              )}
            </div>
          )}

          <div className="rounded-md border bg-gray-50 px-3 py-2 text-xs text-muted-foreground">
            처리 전 확인: 입금액, 초과 입금 처리 방식, 현재 작업 계정, 저장 후 줄어들 잔액을 확인하세요.
          </div>

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

interface LegacyPaymentDialogProps {
  target: LegacyPaymentTarget | null
  onClose: () => void
  onSaved: () => void
}

function LegacyPaymentDialog({ target, onClose, onSaved }: LegacyPaymentDialogProps) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState(0)
  const [method, setMethod] = useState('계좌이체')
  const [isSaving, setIsSaving] = useState(false)
  const [editingEntryIndex, setEditingEntryIndex] = useState<number | null>(null)

  if (!target) return null
  const legacyTarget = target

  const remaining = legacyTarget.ledger.legacyBaseline
  const memoState = parseLegacyReceivableMemo(legacyTarget.customer.memo as string | undefined)
  const maxAmount = remaining
  const activeOperator = loadActiveWorkOperatorProfile()

  async function refreshReceivableViews(customerId: number) {
    qc.invalidateQueries({ queryKey: ['customers'] })
    qc.invalidateQueries({ queryKey: ['customer', customerId] })
    qc.invalidateQueries({ queryKey: ['transactions-customer-directory'] })
    qc.invalidateQueries({ queryKey: ['customer-detail-link-customers'] })
    qc.invalidateQueries({ queryKey: ['receivables'] })
    qc.invalidateQueries({ queryKey: ['receivable-link-customers'] })
    qc.invalidateQueries({ queryKey: ['receivable-customer-breakdown', String(customerId)] })
    qc.invalidateQueries({ queryKey: ['dash-receivables'] })
    qc.invalidateQueries({ queryKey: ['dash-payable-customers'] })
    qc.invalidateQueries({
      predicate: (q) => {
        const key = q.queryKey[0]
        return typeof key === 'string' && (key.startsWith('dash-') || key.startsWith('period-') || key.startsWith('calendar-'))
      },
    })
  }

  async function handleSave() {
    if (amount <= 0) {
      toast.error('입금액을 입력해주세요.')
      return
    }
    if (amount > maxAmount) {
      toast.error(`기존 장부 미수금(${maxAmount.toLocaleString()}원)보다 많이 입금할 수 없습니다.`)
      return
    }

    setIsSaving(true)
    try {
      const nextSettlements = [
        ...memoState.settlements,
        {
          amount,
          date: todayDate(),
          method,
          accountId: activeOperator?.id,
          accountLabel: activeOperator?.label,
          operator: activeOperator?.operatorName,
          createdAt: currentTimestamp(),
        },
      ]
      const nextMemo = serializeLegacyReceivableMemo(legacyTarget.customer.memo as string | undefined, {
        settledAmount: memoState.settledAmount + amount,
        settlements: nextSettlements,
      })

      await updateCustomer(legacyTarget.customer.Id, { memo: nextMemo })
      await recalcCustomerStats(legacyTarget.customer.Id)
      await refreshReceivableViews(legacyTarget.customer.Id)

      toast.success('기존 장부 미수금 입금 처리가 반영되었습니다.')
      onSaved()
    } catch (error) {
      console.error(error)
      toast.error('기존 장부 미수금 입금 처리 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteSettlement(index: number) {
    const settlement = memoState.settlements[index]
    if (!settlement) return
    if (!confirm(`${settlement.date} ${settlement.amount.toLocaleString()}원 입금 기록을 취소하시겠습니까?`)) return

    setIsSaving(true)
    try {
      const nextSettlements = memoState.settlements.filter((_, settlementIndex) => settlementIndex !== index)
      const nextMemo = serializeLegacyReceivableMemo(legacyTarget.customer.memo as string | undefined, {
        settledAmount: nextSettlements.reduce((sum, entry) => sum + entry.amount, 0),
        settlements: nextSettlements,
      })
      await updateCustomer(legacyTarget.customer.Id, { memo: nextMemo })
      await recalcCustomerStats(legacyTarget.customer.Id)
      await refreshReceivableViews(legacyTarget.customer.Id)
      setEditingEntryIndex(null)
      toast.success('기존 장부 입금 기록을 취소했습니다.')
      onSaved()
    } catch (error) {
      console.error(error)
      toast.error('기존 장부 입금 기록 취소 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>기존 장부 미수 입금 확인</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-gray-50 rounded-md p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">거래처</span>
              <span className="font-medium">{legacyTarget.customer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">현재 작업 계정</span>
              <span className="font-medium">{activeOperator?.label ?? '미설정'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">기존 장부 미수금</span>
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
            <p className="mt-1 text-xs text-muted-foreground">최대 입금 가능액: {maxAmount.toLocaleString()}원</p>
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
              입금 후 기존 장부 미수:{' '}
              <span className={remaining - amount > 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                {(remaining - amount).toLocaleString()}원
              </span>
            </div>
          )}

          <div className="rounded-md border bg-gray-50 px-3 py-2 text-xs text-muted-foreground">
            처리 전 확인: 기존 장부 금액 초과 여부와 현재 작업 계정을 확인하고, 저장 후 수금 관리와 고객 상세가 같이 바뀌는지 보세요.
          </div>

          {memoState.settlements.length > 0 && (
            <div className="rounded-md border p-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">기존 장부 입금 이력</div>
              {memoState.settlements.map((entry, index) => (
                <div key={`${entry.date}-${entry.amount}-${index}`} className="flex items-center justify-between gap-2 text-xs">
                  <div>
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
                    className="h-7 px-2 text-xs text-red-500 hover:text-red-600"
                    disabled={isSaving}
                    onClick={() => {
                      setEditingEntryIndex(index)
                      void handleDeleteSettlement(index)
                    }}
                  >
                    {editingEntryIndex === index && isSaving ? '처리 중...' : '취소'}
                  </Button>
                </div>
              ))}
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

interface LegacyPayableDialogProps {
  target: LegacyPayableTarget | null
  onClose: () => void
  onSaved: () => void
}

interface RefundPendingDialogProps {
  target: RefundPendingEntry | null
  onClose: () => void
  onSaved: () => void
}

function LegacyPayableDialog({ target, onClose, onSaved }: LegacyPayableDialogProps) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState(0)
  const [method, setMethod] = useState('계좌이체')
  const [isSaving, setIsSaving] = useState(false)
  const [editingEntryIndex, setEditingEntryIndex] = useState<number | null>(null)

  if (!target) return null
  const payableTarget = target

  const memoState = parseLegacyPayableMemo(payableTarget.customer.memo as string | undefined)
  const maxAmount = payableTarget.payableAmount
  const activeOperator = loadActiveWorkOperatorProfile()

  async function refreshPayableViews(customerId: number) {
    qc.invalidateQueries({ queryKey: ['customers'] })
    qc.invalidateQueries({ queryKey: ['customer', customerId] })
    qc.invalidateQueries({ queryKey: ['transactions-customer-directory'] })
    qc.invalidateQueries({ queryKey: ['customer-detail-link-customers'] })
    qc.invalidateQueries({ queryKey: ['receivables'] })
    qc.invalidateQueries({ queryKey: ['receivable-link-customers'] })
    qc.invalidateQueries({ queryKey: ['receivable-customer-breakdown', String(customerId)] })
    qc.invalidateQueries({ queryKey: ['dash-receivables'] })
    qc.invalidateQueries({ queryKey: ['dash-fiscal-snapshots'] })
    qc.invalidateQueries({ queryKey: ['dash-payable-customers'] })
    qc.invalidateQueries({
      predicate: (q) => {
        const key = q.queryKey[0]
        return typeof key === 'string' && (key.startsWith('dash-') || key.startsWith('period-') || key.startsWith('calendar-'))
      },
    })
  }

  async function handleSave() {
    if (amount <= 0) {
      toast.error('지급액을 입력해주세요.')
      return
    }
    if (amount > maxAmount) {
      toast.error(`기존 장부 미지급금(${maxAmount.toLocaleString()}원)보다 많이 지급할 수 없습니다.`)
      return
    }

    setIsSaving(true)
    try {
      const nextSettlements = [
        ...memoState.settlements,
        {
          amount,
          date: todayDate(),
          method,
          accountId: activeOperator?.id,
          accountLabel: activeOperator?.label,
          operator: activeOperator?.operatorName,
          createdAt: currentTimestamp(),
        },
      ]
      const nextMemo = serializeLegacyPayableMemo(payableTarget.customer.memo as string | undefined, {
        settledAmount: memoState.settledAmount + amount,
        settlements: nextSettlements,
      })
      await updateCustomer(payableTarget.customer.Id, { memo: nextMemo })
      await refreshPayableViews(payableTarget.customer.Id)
      toast.success('기존 장부 지급 처리가 반영되었습니다.')
      onSaved()
    } catch (error) {
      console.error(error)
      toast.error('기존 장부 지급 처리 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteSettlement(index: number) {
    const settlement = memoState.settlements[index]
    if (!settlement) return
    if (!confirm(`${settlement.date} ${settlement.amount.toLocaleString()}원 지급 기록을 취소하시겠습니까?`)) return

    setIsSaving(true)
    try {
      const nextSettlements = memoState.settlements.filter((_, settlementIndex) => settlementIndex !== index)
      const nextMemo = serializeLegacyPayableMemo(payableTarget.customer.memo as string | undefined, {
        settledAmount: nextSettlements.reduce((sum, entry) => sum + entry.amount, 0),
        settlements: nextSettlements,
      })
      await updateCustomer(payableTarget.customer.Id, { memo: nextMemo })
      await refreshPayableViews(payableTarget.customer.Id)
      setEditingEntryIndex(null)
      toast.success('기존 장부 지급 기록을 취소했습니다.')
      onSaved()
    } catch (error) {
      console.error(error)
      toast.error('기존 장부 지급 기록 취소 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>기존 장부 지급 확인</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-gray-50 rounded-md p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">거래처</span>
              <span className="font-medium">{payableTarget.customer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">현재 작업 계정</span>
              <span className="font-medium">{activeOperator?.label ?? '미설정'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">기존 장부 미지급금</span>
              <span className="font-bold text-blue-700">{maxAmount.toLocaleString()}원</span>
            </div>
          </div>

          <div>
            <Label className="text-xs">지급액</Label>
            <Input
              type="number"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder={`최대 ${maxAmount.toLocaleString()}원`}
              className="mt-1"
              autoFocus
            />
            <p className="mt-1 text-xs text-muted-foreground">최대 지급 가능액: {maxAmount.toLocaleString()}원</p>
          </div>

          <div>
            <Label className="text-xs">지급방법</Label>
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
              지급 후 기존 장부 미지급금:{' '}
              <span className={maxAmount - amount > 0 ? 'text-blue-700 font-bold' : 'text-green-600 font-bold'}>
                {(maxAmount - amount).toLocaleString()}원
              </span>
            </div>
          )}

          <div className="rounded-md border bg-gray-50 px-3 py-2 text-xs text-muted-foreground">
            처리 전 확인: 지급액, 현재 작업 계정, 저장 후 거래원장에 지급 행이 같이 남는지 확인하세요.
          </div>

          {memoState.settlements.length > 0 && (
            <div className="rounded-md border p-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">기존 장부 지급 이력</div>
              {memoState.settlements.map((entry, index) => (
                <div key={`${entry.date}-${entry.amount}-${index}`} className="flex items-center justify-between gap-2 text-xs">
                  <div>
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
                    className="h-7 px-2 text-xs text-red-500 hover:text-red-600"
                    disabled={isSaving}
                    onClick={() => {
                      setEditingEntryIndex(index)
                      void handleDeleteSettlement(index)
                    }}
                  >
                    {editingEntryIndex === index && isSaving ? '처리 중...' : '취소'}
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || amount <= 0}
              className="bg-[#4b7bec] hover:bg-[#3867d6] text-white"
            >
              {isSaving ? '처리 중...' : '지급 확인'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RefundPendingDialog({ target, onClose, onSaved }: RefundPendingDialogProps) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState(0)
  const [method, setMethod] = useState('계좌이체')
  const [isSaving, setIsSaving] = useState(false)

  if (!target) return null

  const currentTarget = target
  const maxAmount = currentTarget.refundPendingAmount
  const activeOperator = loadActiveWorkOperatorProfile()
  const metaState = parseCustomerAccountingMeta(currentTarget.customer.memo as string | undefined)

  function applyCustomerMemoLocally(customerId: number, nextMemo: string) {
    const nextCustomer = { ...currentTarget.customer, memo: nextMemo }
    qc.setQueryData<Customer | null>(['customer', customerId], nextCustomer)
    qc.setQueryData<Customer[] | undefined>(['receivable-link-customers'], (prev) => (
      Array.isArray(prev)
        ? prev.map((customer) => (customer.Id === customerId ? { ...customer, memo: nextMemo } : customer))
        : prev
    ))
    qc.setQueryData<Customer[] | undefined>(['transactions-customer-directory'], (prev) => (
      Array.isArray(prev)
        ? prev.map((customer) => (customer.Id === customerId ? { ...customer, memo: nextMemo } : customer))
        : prev
    ))
    qc.setQueryData<Customer[] | undefined>(['customer-detail-link-customers'], (prev) => (
      Array.isArray(prev)
        ? prev.map((customer) => (customer.Id === customerId ? { ...customer, memo: nextMemo } : customer))
        : prev
    ))
  }

  async function refreshRefundViews(customerId: number) {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['customers'] }),
      qc.invalidateQueries({ queryKey: ['customer', customerId] }),
      qc.invalidateQueries({ queryKey: ['transactions-customer-directory'] }),
      qc.invalidateQueries({ queryKey: ['customer-detail-link-customers'] }),
      qc.invalidateQueries({ queryKey: ['receivables'] }),
      qc.invalidateQueries({ queryKey: ['receivable-link-customers'] }),
      qc.invalidateQueries({ queryKey: ['receivable-customer-breakdown', String(customerId)] }),
      qc.invalidateQueries({ queryKey: ['transactions'] }),
      qc.invalidateQueries({ queryKey: ['transactions-crm'] }),
      qc.invalidateQueries({ queryKey: ['dash-receivables'] }),
      qc.invalidateQueries({ queryKey: ['dash-payable-customers'] }),
      qc.invalidateQueries({
      predicate: (q) => {
        const key = q.queryKey[0]
        return typeof key === 'string' && (key.startsWith('dash-') || key.startsWith('period-') || key.startsWith('calendar-'))
      },
    }),
    ])
  }

  async function handleRefundComplete() {
    if (amount <= 0) {
      toast.error('환불액을 입력해주세요.')
      return
    }
    if (amount > maxAmount) {
      toast.error(`환불대기 금액(${maxAmount.toLocaleString()}원)보다 많이 처리할 수 없습니다.`)
      return
    }

    setIsSaving(true)
    try {
      const nextMemo = appendCustomerAccountingEvent(
        currentTarget.customer.memo as string | undefined,
        {
          type: 'refund_paid',
          amount,
          date: todayDate(),
          method,
          operator: activeOperator?.operatorName,
          accountId: activeOperator?.id,
          accountLabel: activeOperator?.label,
          createdAt: currentTimestamp(),
          note: '환불대기에서 환불 완료',
        },
        { refundPendingBalance: Math.max(0, metaState.refundPendingBalance - amount) },
      )
      applyCustomerMemoLocally(currentTarget.customer.Id, nextMemo)
      await updateCustomer(currentTarget.customer.Id, { memo: nextMemo })
      await refreshRefundViews(currentTarget.customer.Id)
      toast.success('환불 완료로 반영했습니다.')
      onSaved()
    } catch (error) {
      console.error(error)
      toast.error('환불 완료 처리 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRefundClear() {
    if (!confirm('환불대기 금액을 해제하시겠습니까? 실제 송금 없이 대기 금액만 제거합니다.')) return
    setIsSaving(true)
    try {
      const nextMemo = appendCustomerAccountingEvent(
        currentTarget.customer.memo as string | undefined,
        {
          type: 'refund_pending_cleared',
          amount: maxAmount,
          date: todayDate(),
          method,
          operator: activeOperator?.operatorName,
          accountId: activeOperator?.id,
          accountLabel: activeOperator?.label,
          createdAt: currentTimestamp(),
          note: '환불대기 해제',
        },
        { refundPendingBalance: 0 },
      )
      applyCustomerMemoLocally(currentTarget.customer.Id, nextMemo)
      await updateCustomer(currentTarget.customer.Id, { memo: nextMemo })
      await refreshRefundViews(currentTarget.customer.Id)
      toast.success('환불대기 금액을 해제했습니다.')
      onSaved()
    } catch (error) {
      console.error(error)
      toast.error('환불대기 해제 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>환불대기 처리</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-gray-50 rounded-md p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">거래처</span>
              <span className="font-medium">{currentTarget.customer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">현재 작업 계정</span>
              <span className="font-medium">{activeOperator?.label ?? '미설정'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">환불대기 금액</span>
              <span className="font-bold text-amber-700">{maxAmount.toLocaleString()}원</span>
            </div>
          </div>

          <div>
            <Label className="text-xs">환불액</Label>
            <Input
              type="number"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder={`최대 ${maxAmount.toLocaleString()}원`}
              className="mt-1"
              autoFocus
            />
          </div>

          <div>
            <Label className="text-xs">처리방법</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="계좌이체">계좌이체</SelectItem>
                <SelectItem value="현금">현금</SelectItem>
                <SelectItem value="카드취소">카드취소</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {amount > 0 && (
            <div className="bg-amber-50 rounded-md p-2 text-xs text-amber-800">
              처리 후 환불대기:{' '}
              <span className={maxAmount - amount > 0 ? 'font-bold text-amber-700' : 'font-bold text-green-700'}>
                {(maxAmount - amount).toLocaleString()}원
              </span>
            </div>
          )}

          <div className="rounded-md border bg-gray-50 px-3 py-2 text-xs text-muted-foreground">
            환불 완료는 실제 송금된 금액만 반영하고, 환불대기 해제는 송금 없이 대기 금액만 제거할 때 사용합니다.
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              취소
            </Button>
            <Button
              variant="outline"
              onClick={handleRefundClear}
              disabled={isSaving}
            >
              환불대기 해제
            </Button>
            <Button
              onClick={handleRefundComplete}
              disabled={isSaving || amount <= 0}
              className="bg-[#c0841a] hover:bg-[#a56f12] text-white"
            >
              {isSaving ? '처리 중...' : '환불 완료'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface ReceivablesProps {
  mode?: 'receivable' | 'payable'
}

// ─── 수금/지급 관리 메인 ───────────────────────────
export function Receivables({ mode = 'receivable' }: ReceivablesProps) {
  const navigate = useNavigate()
  const isPayableMode = mode === 'payable'
  const [searchParams, setSearchParams] = useSearchParams()
  const [paymentTarget, setPaymentTarget] = useState<Invoice | null>(null)
  const [legacyPaymentTarget, setLegacyPaymentTarget] = useState<LegacyPaymentTarget | null>(null)
  const [legacyPayableTarget, setLegacyPayableTarget] = useState<LegacyPayableTarget | null>(null)
  const [refundPendingTarget, setRefundPendingTarget] = useState<RefundPendingEntry | null>(null)
  const [customerSearch, setCustomerSearch] = useState(() => searchParams.get('customer') ?? '')
  const [customerIdFilter, setCustomerIdFilter] = useState(() => searchParams.get('customerId') ?? '')
  const [sourceTab, setSourceTab] = useState<'all' | 'crm' | 'legacy' | 'payable' | 'refund'>(() => {
    const tab = searchParams.get('tab')
    const defaultTab = getDefaultReceivableTab(isPayableMode)
    if (isPayableMode) {
      if (tab === 'payable' || tab === 'refund' || tab === 'all') return tab
      return defaultTab
    }
    if (tab === 'crm' || tab === 'legacy' || tab === 'payable' || tab === 'refund' || tab === 'all') return tab
    return defaultTab
  })
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
    const nextTab = searchParams.get('tab')
    const defaultTab = getDefaultReceivableTab(isPayableMode)
    const normalizedTab = isPayableMode
      ? (nextTab === 'payable' || nextTab === 'refund' || nextTab === 'all' ? nextTab : defaultTab)
      : (nextTab === 'crm' || nextTab === 'legacy' || nextTab === 'payable' || nextTab === 'refund' || nextTab === 'all' ? nextTab : defaultTab)
    setSourceTab((prev) => (prev === normalizedTab ? prev : normalizedTab))
  }, [isPayableMode, searchParams])
  useEffect(() => {
    setPaymentTarget(null)
    setLegacyPaymentTarget(null)
    setLegacyPayableTarget(null)
    setRefundPendingTarget(null)
  }, [asOfDate])

  const { data: invoices = [], isLoading: isInvoicesLoading, isError: isInvoicesError } = useQuery({
    queryKey: ['receivables'],
    queryFn: () =>
      getAllInvoices({
        where: '(payment_status,eq,unpaid)~or(payment_status,eq,partial)',
        sort: '-invoice_date',
        fields: 'Id,invoice_no,invoice_date,customer_id,customer_name,total_amount,paid_amount,payment_status,current_balance,memo',
      }),
    staleTime: 2 * 60 * 1000,
  })
  const { data: customersForLink = [], isLoading: isCustomersLoading } = useQuery({
    queryKey: ['receivable-link-customers'],
    queryFn: () => getAllCustomers({
      fields: 'Id,name,book_name,legacy_id,mobile,email,business_no,memo,outstanding_balance',
    }),
    staleTime: 10 * 60 * 60 * 1000,
  })
  const { data: legacySnapshots, isLoading: isLegacySnapshotsLoading } = useQuery({
    queryKey: ['receivable-legacy-snapshots'],
    queryFn: getLegacyCustomerSnapshots,
    staleTime: Infinity,
  })
  const { data: fiscalSnapshots, isLoading: isFiscalSnapshotsLoading } = useQuery({
    queryKey: ['receivable-fiscal-snapshots'],
    queryFn: getFiscalBalanceSnapshots,
    staleTime: Infinity,
  })
  const { data: customerBreakdown } = useQuery<CustomerReceivableBreakdown | null>({
    queryKey: ['receivable-customer-breakdown', customerIdFilter, fiscalSnapshots?.currentFiscalYear ?? ''],
    enabled: !!customerIdFilter && !!legacySnapshots && !!fiscalSnapshots,
    queryFn: async () => {
      const customer = await getCustomer(Number(customerIdFilter))
      return {
        customer,
        legacyBaseline: await getLegacyReceivableBaseline(customer),
        payableBaseline: getLegacyPayableBaselineFromSnapshots(customer, legacySnapshots, fiscalSnapshots),
      }
    },
    staleTime: 10 * 60 * 1000,
  })
  const customerById = new Map(customersForLink.map((customer) => [customer.Id, customer]))
  const isReferenceDataLoading = isCustomersLoading || isLegacySnapshotsLoading || isFiscalSnapshotsLoading
  const isTodayView = asOfDate === todayDate()
  const resolvedInvoices: ResolvedReceivableInvoice[] = useMemo(
    () => buildResolvedReceivableInvoices(invoices, customersForLink, asOfDate),
    [asOfDate, customersForLink, invoices],
  )
  const visibleInvoices: ReceivableSnapshot[] = useMemo(() => resolvedInvoices
    .map((inv) => ({
      ...inv,
      customer_id: inv.resolvedCustomerId ?? inv.customer_id,
      customer_name: inv.resolvedCustomerName,
      asOfPaidAmount: getPaidAmountAsOf(inv, asOfDate),
      asOfRemaining: inv.asOfRemaining,
      asOfStatus: inv.asOfStatus,
    })), [asOfDate, resolvedInvoices])
  const receivableLedger = useMemo(
    () => buildCustomerReceivableLedger(customersForLink, resolvedInvoices, legacySnapshots, fiscalSnapshots),
    [customersForLink, fiscalSnapshots, legacySnapshots, resolvedInvoices],
  )
  const payableLedger = useMemo<PayableLedgerEntry[]>(() => {
    const currentFiscalYear = String(fiscalSnapshots?.currentFiscalYear ?? '')
    const payablesByLegacyId = fiscalSnapshots?.years?.[currentFiscalYear]?.payablesByLegacyId ?? {}
    const customerByLegacyId = new Map(
      customersForLink
        .filter((customer) => customer.legacy_id != null)
        .map((customer) => [String(customer.legacy_id), customer]),
    )

    return Object.entries(payablesByLegacyId)
      .map(([legacyId, amount]) => {
        const customer = customerByLegacyId.get(legacyId)
        const tradebook = legacySnapshots?.tradebookByLegacyId?.[legacyId]
        const payableAmount = customer
          ? getLegacyPayableBaselineFromSnapshots(customer, legacySnapshots, fiscalSnapshots)
          : amount
        return {
          customerId: customer?.Id ?? null,
          legacyId,
          customerName: customer?.name?.trim() || tradebook?.name?.trim() || tradebook?.book_name?.trim() || `장부 ${legacyId}`,
          payableAmount,
          bookName: customer?.book_name?.trim() || tradebook?.book_name?.trim() || undefined,
        }
      })
      .filter((entry) => entry.payableAmount > 0)
      .sort((left, right) => right.payableAmount - left.payableAmount)
  }, [customersForLink, fiscalSnapshots, legacySnapshots])
  const refundPendingLedger = useMemo<RefundPendingEntry[]>(() => (
    customersForLink
      .map((customer) => ({
        customer,
        refundPendingAmount: parseCustomerAccountingMeta(customer.memo as string | undefined).refundPendingBalance,
      }))
      .filter((entry) => entry.refundPendingAmount > 0)
      .sort((left, right) => right.refundPendingAmount - left.refundPendingAmount)
  ), [customersForLink])
  const outgoingLedger = useMemo<OutgoingLedgerEntry[]>(() => {
    const payables = payableLedger.map((entry) => ({
      key: `payable-${entry.legacyId}`,
      customerId: entry.customerId,
      customerName: entry.customerName,
      amount: entry.payableAmount,
      kind: 'payable' as const,
      note: entry.customerId ? '기존 장부 기준 지급 확인 대상' : '고객관리 연결 없음',
      bookName: entry.bookName,
      customer: entry.customerId ? customerById.get(entry.customerId) : undefined,
    }))
    const refunds = refundPendingLedger.map((entry) => ({
      key: `refund-${entry.customer.Id}`,
      customerId: entry.customer.Id,
      customerName: entry.customer.name ?? `고객 ${entry.customer.Id}`,
      amount: entry.refundPendingAmount,
      kind: 'refund' as const,
      note: '초과 입금 또는 정산 조정으로 생성된 환불 예정 금액',
      bookName: entry.customer.book_name as string | undefined,
      customer: entry.customer,
    }))

    return [...payables, ...refunds].sort((left, right) => right.amount - left.amount)
  }, [customerById, payableLedger, refundPendingLedger])

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

  const normalizedSearch = customerSearch.trim().toLowerCase()
  const filteredInvoices = visibleInvoices.filter((inv) => {
    if (customerIdFilter && String(inv.customer_id ?? '') !== customerIdFilter) return false
    if (!normalizedSearch) return true
    return (inv.customer_name ?? '').toLowerCase().includes(normalizedSearch)
  })
  const filteredLedger = receivableLedger.filter((entry) => {
    if (customerIdFilter && String(entry.customerId) !== customerIdFilter) return false
    if (!normalizedSearch) return true
    return (
      entry.customerName.toLowerCase().includes(normalizedSearch) ||
      entry.aliases.some((alias) => alias.toLowerCase().includes(normalizedSearch))
    )
  })
  const filteredPayableLedger = payableLedger.filter((entry) => {
    if (customerIdFilter && String(entry.customerId ?? '') !== customerIdFilter) return false
    if (!normalizedSearch) return true
    return (
      entry.customerName.toLowerCase().includes(normalizedSearch) ||
      (entry.bookName ?? '').toLowerCase().includes(normalizedSearch)
    )
  })
  const filteredRefundPendingLedger = refundPendingLedger.filter((entry) => {
    if (customerIdFilter && String(entry.customer.Id) !== customerIdFilter) return false
    if (!normalizedSearch) return true
    return (
      entry.customer.name?.toLowerCase().includes(normalizedSearch) ||
      (entry.customer.book_name as string | undefined)?.toLowerCase().includes(normalizedSearch)
    )
  })
  const filteredOutgoingLedger = outgoingLedger.filter((entry) => {
    if (customerIdFilter && String(entry.customerId ?? '') !== customerIdFilter) return false
    if (!normalizedSearch) return true
    return (
      entry.customerName.toLowerCase().includes(normalizedSearch) ||
      (entry.bookName ?? '').toLowerCase().includes(normalizedSearch)
    )
  })

  // 에이징 집계는 CRM 명세표 기준으로만 관리한다.
  const aging = AGING_BUCKETS.map((bucket) => {
    const filtered = filteredInvoices.filter((inv) => {
      const days = getDaysSince(inv.invoice_date, asOfDate)
      return days >= bucket.min && days <= bucket.max
    })
    return {
      ...bucket,
      count: filtered.length,
      amount: filtered.reduce((s, inv) => s + inv.asOfRemaining, 0),
    }
  })

  const filteredLegacyLedger = filteredLedger.filter((entry) => entry.legacyBaseline > 0)
  const filteredCrmLedger = filteredLedger.filter((entry) => entry.crmRemaining > 0)
  const filteredTotalReceivable = filteredLedger.reduce((sum, entry) => sum + entry.totalRemaining, 0)
  const filteredLegacyTotal = filteredLegacyLedger.reduce((sum, entry) => sum + entry.legacyBaseline, 0)
  const filteredCrmTotal = filteredCrmLedger.reduce((sum, entry) => sum + entry.crmRemaining, 0)
  const filteredPayableTotal = filteredPayableLedger.reduce((sum, entry) => sum + entry.payableAmount, 0)
  const filteredRefundPendingTotal = filteredRefundPendingLedger.reduce((sum, entry) => sum + entry.refundPendingAmount, 0)
  const filteredTotalOutgoing = filteredPayableTotal + filteredRefundPendingTotal
  const criticalCount = filteredInvoices.filter((inv) => {
    const days = getDaysSince(inv.invoice_date, asOfDate)
    return days > 90
  }).length
  const breakdownCrmReceivable = customerBreakdown
    ? filteredInvoices.reduce((sum, inv) => sum + inv.asOfRemaining, 0)
    : 0
  const breakdownCurrentBalance = customerBreakdown?.customer.outstanding_balance ?? 0
  const breakdownPayableBaseline = customerBreakdown?.payableBaseline ?? 0
  const breakdownRefundPending = customerBreakdown
    ? parseCustomerAccountingMeta(customerBreakdown.customer.memo as string | undefined).refundPendingBalance
    : 0
  const receivableLinkSummary = filteredInvoices.reduce((summary, invoice) => {
    const linkedCustomer = resolveInvoiceCustomer(invoice, customersForLink) ?? (typeof invoice.customer_id === 'number' ? customerById.get(invoice.customer_id) : undefined)
    const invoiceName = invoice.customer_name?.trim()
    const masterName = linkedCustomer?.name?.trim()
    const masterBookName = linkedCustomer?.book_name?.trim()
    if (!linkedCustomer) {
      summary.orphanCount += 1
      return summary
    }
    if (linkedCustomer && invoiceName && invoiceName !== masterName && invoiceName !== masterBookName) {
      summary.splitCount += 1
    }
    return summary
  }, { orphanCount: 0, splitCount: 0 })

  const pageTitle = isPayableMode ? '지급 관리' : '수금 관리'
  const pageDescription = isPayableMode
    ? '기존 장부 줄 돈과 환불 예정 금액을 함께 확인하고 지급 이력을 관리합니다.'
    : '기존 장부와 새 입력 기준으로 지금 받을 돈을 확인하고 수금 이력을 관리합니다.'
  const totalSummaryLabel = isPayableMode ? '총 지급 예정' : '총 받을 돈'
  const legacySummaryLabel = isPayableMode ? '기존 장부 받을 돈' : '기존 장부 받을 돈'
  const crmSummaryLabel = isPayableMode ? '새 입력 받을 돈' : '새 입력 받을 돈'
  const payableSummaryLabel = isPayableMode ? '기존 장부 줄 돈' : '총 줄 돈'
  const refundSummaryLabel = '환불대기'
  const allTabLabel = isPayableMode ? '전체 지급' : '전체 정산'
  const crmTabLabel = '새 입력 받을 돈'
  const legacyTabLabel = '기존 장부 받을 돈'
  const payableTabLabel = '기존 장부 줄 돈'
  const refundTabLabel = '환불대기'
  const hasCustomerFilter = Boolean(customerSearch || customerIdFilter)
  const primaryResultCount = isPayableMode ? filteredOutgoingLedger.length : filteredLedger.length
  const primaryResultLabel = isPayableMode ? '지급 예정' : '조회 고객'
  const basisDateToneClass = isTodayView
    ? 'bg-[#f4f7f1] text-[#4f6748]'
    : 'bg-amber-50 text-amber-700'
  const visibleTabs: Array<{
    value: 'all' | 'crm' | 'legacy' | 'payable' | 'refund'
    label: string
    description: string
    count: number
    hint: string
  }> = [
    {
      value: 'all',
      label: allTabLabel,
      description: isPayableMode
        ? '줄 돈과 환불대기를 한 번에 모아서 봅니다.'
        : '고객별로 기존 장부와 새 입력 미수를 함께 봅니다.',
      count: primaryResultCount,
      hint: isPayableMode ? '행 설명을 보고 바로 송금 기록이나 환불 정리로 이어갈 수 있습니다.' : '한 고객의 전체 잔액 흐름을 먼저 파악할 때 적합합니다.',
    },
    ...(!isPayableMode
      ? [
          {
            value: 'crm' as const,
            label: crmTabLabel,
            description: '새로 발행한 명세표 기준 미수만 따로 봅니다.',
            count: filteredInvoices.length,
            hint: isTodayView ? '오늘 기준에서만 바로 입금 확인이 가능합니다.' : '과거 기준일에서는 조회만 가능합니다.',
          },
          {
            value: 'legacy' as const,
            label: legacyTabLabel,
            description: '이월된 기존 장부 잔액만 따로 확인합니다.',
            count: filteredLegacyLedger.length,
            hint: '레거시 장부 잔액 확인이나 이월 입금 처리 확인에 적합합니다.',
          },
        ]
      : []),
    {
      value: 'payable',
      label: payableTabLabel,
      description: '고객별 기존 장부 미지급금만 모아서 봅니다.',
      count: filteredPayableLedger.length,
      hint: '고객 연결이 있으면 바로 송금 기록으로 이어지고, 없으면 먼저 고객 연결이 필요합니다.',
    },
    {
      value: 'refund',
      label: refundTabLabel,
      description: '초과 입금 등으로 생긴 환불대기 금액만 봅니다.',
      count: filteredRefundPendingLedger.length,
      hint: '실제 환불 송금이 끝났거나 환불대기만 해제할 때 이 탭에서 마무리합니다.',
    },
  ]
  const activeTabMeta = visibleTabs.find((tab) => tab.value === sourceTab) ?? visibleTabs[0]

  if (isInvoicesLoading)
    return (
      <div className="p-6 text-muted-foreground">
        불러오는 중...
      </div>
    )

  if (isInvoicesError)
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
          <h2 className="text-2xl font-bold">{pageTitle}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {pageDescription}
          </p>
        </div>
        {!isPayableMode ? (
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
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportOutgoingLedger(
              filteredOutgoingLedger.map((entry) => ({
                customerName: entry.customerName,
                kind: entry.kind === 'payable' ? '기존 장부 줄 돈' : '환불대기',
                amount: entry.amount,
                note: entry.note,
                bookName: entry.bookName,
              })),
              '지급예정현황',
            )}
            className="gap-1"
          >
            <Download className="h-4 w-4" />
            지급 현황 내보내기
          </Button>
        )}
      </div>

      <div className="mb-4 rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">조회 조건</p>
              <p className="text-xs text-muted-foreground">
                거래처와 기준일을 먼저 정하고, 필요한 정산 구간만 빠르게 확인하세요.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                기준일 {asOfDate}
              </span>
              <span className={`rounded-full px-3 py-1 font-medium ${basisDateToneClass}`}>
                {isTodayView ? '오늘 기준' : '과거 조회'}
              </span>
              <span className="rounded-full bg-[#f7f5ef] px-3 py-1 font-medium text-[#836b2c]">
                {primaryResultLabel} {primaryResultCount.toLocaleString()}건
              </span>
              {criticalCount > 0 && !isPayableMode && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
                  <AlertCircle className="h-3.5 w-3.5" />
                  90일 초과 {criticalCount}건
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_210px_auto]">
            <div className="space-y-2" data-guide-id="receivables-search">
              <Label htmlFor="receivables-search" className="text-xs font-medium text-muted-foreground">
                거래처 검색
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="receivables-search"
                  value={customerSearch}
                  onChange={(e) => applyCustomerFilter(e.target.value, customerIdFilter)}
                  placeholder="거래처명 또는 분리 거래명으로 찾기"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="receivables-asof" className="text-xs font-medium text-muted-foreground">
                기준일
              </Label>
              <Input
                id="receivables-asof"
                type="date"
                value={asOfDate}
                onChange={(e) => applyAsOfDate(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">빠른 작업</span>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant={isTodayView ? 'secondary' : 'ghost'} size="sm" onClick={() => applyAsOfDate(todayDate())}>
                  오늘 기준
                </Button>
                {hasCustomerFilter && (
                  <Button variant="ghost" size="sm" onClick={() => applyCustomerFilter('')}>
                    거래처 필터 해제
                  </Button>
                )}
              </div>
            </div>
          </div>

          {!isTodayView && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              과거 기준일은 조회 전용입니다. 실제 입금 처리와 잔액 반영은 오늘 기준에서만 진행됩니다.
            </div>
          )}
        </div>
      </div>

      {isReferenceDataLoading && (
        <div className="mb-4 rounded-lg border border-[#d9e4d5] bg-[#f7faf6] px-4 py-3 text-sm text-muted-foreground">
          고객 연결과 기존 장부 기준 데이터를 불러오는 중입니다.
          {!isPayableMode && ' 새 입력 받을 돈 탭은 먼저 확인할 수 있습니다.'}
        </div>
      )}

      {isPayableMode ? (
        <div className="mb-4 grid gap-3 md:grid-cols-3" data-guide-id="payables-summary">
          <div className="rounded-lg border bg-white px-4 py-3">
            <p className="text-xs text-muted-foreground">{totalSummaryLabel}</p>
            <p className="mt-1 text-base font-semibold text-blue-700">
              {isReferenceDataLoading ? '불러오는 중...' : `${filteredTotalOutgoing.toLocaleString()}원`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{isReferenceDataLoading ? '고객/장부 기준 정리 중' : '줄 돈 + 환불 예정 합계'}</p>
          </div>
          <div className="rounded-lg border bg-white px-4 py-3">
            <p className="text-xs text-muted-foreground">{payableSummaryLabel}</p>
            <p className="mt-1 text-base font-semibold text-blue-700">
              {isReferenceDataLoading ? '불러오는 중...' : `${filteredPayableTotal.toLocaleString()}원`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{isReferenceDataLoading ? '지급 대상 계산 중' : `${filteredPayableLedger.length}개 고객`}</p>
          </div>
          <div className="rounded-lg border bg-white px-4 py-3">
            <p className="text-xs text-muted-foreground">{refundSummaryLabel}</p>
            <p className="mt-1 text-base font-semibold text-amber-700">
              {isReferenceDataLoading ? '불러오는 중...' : `${filteredRefundPendingTotal.toLocaleString()}원`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{isReferenceDataLoading ? '환불대기 계산 중' : `${filteredRefundPendingLedger.length}개 고객`}</p>
          </div>
        </div>
      ) : (
        <div className="mb-4 grid gap-3 md:grid-cols-5" data-guide-id="receivables-summary">
          <div className="rounded-lg border bg-white px-4 py-3">
            <p className="text-xs text-muted-foreground">{totalSummaryLabel}</p>
            <p className="mt-1 text-base font-semibold text-red-600">
              {isReferenceDataLoading ? '불러오는 중...' : `${filteredTotalReceivable.toLocaleString()}원`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{isReferenceDataLoading ? '기존 장부 연결 중' : '기존 장부 + 새 입력 합산'}</p>
          </div>
          <div className="rounded-lg border bg-white px-4 py-3">
            <p className="text-xs text-muted-foreground">{legacySummaryLabel}</p>
            <p className="mt-1 text-base font-semibold text-red-600">
              {isReferenceDataLoading ? '불러오는 중...' : `${filteredLegacyTotal.toLocaleString()}원`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{isReferenceDataLoading ? '이월 미수 계산 중' : `${filteredLegacyLedger.length}개 고객`}</p>
          </div>
          <div className="rounded-lg border bg-white px-4 py-3">
            <p className="text-xs text-muted-foreground">{crmSummaryLabel}</p>
            <p className="mt-1 text-base font-semibold text-red-600">{filteredCrmTotal.toLocaleString()}원</p>
            <p className="mt-1 text-xs text-muted-foreground">{filteredInvoices.length}개 열린 명세표</p>
          </div>
          <div className="rounded-lg border bg-white px-4 py-3">
            <p className="text-xs text-muted-foreground">{payableSummaryLabel}</p>
            <p className="mt-1 text-base font-semibold text-blue-700">
              {isReferenceDataLoading ? '불러오는 중...' : `${filteredPayableTotal.toLocaleString()}원`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{isReferenceDataLoading ? '미지급금 계산 중' : `${filteredPayableLedger.length}개 고객`}</p>
          </div>
          <div className="rounded-lg border bg-white px-4 py-3">
            <p className="text-xs text-muted-foreground">{refundSummaryLabel}</p>
            <p className="mt-1 text-base font-semibold text-amber-700">
              {isReferenceDataLoading ? '불러오는 중...' : `${filteredRefundPendingTotal.toLocaleString()}원`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{isReferenceDataLoading ? '환불대기 계산 중' : `${filteredRefundPendingLedger.length}개 고객`}</p>
          </div>
        </div>
      )}

      {customerBreakdown && !isReferenceDataLoading && (
        isPayableMode ? (
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border bg-white px-4 py-3">
              <p className="text-xs text-muted-foreground">기존 장부 줄 돈</p>
              <p className={`mt-1 text-base font-semibold ${breakdownPayableBaseline > 0 ? 'text-blue-700' : 'text-muted-foreground'}`}>
                {breakdownPayableBaseline.toLocaleString()}원
              </p>
              <p className="mt-1 text-xs text-muted-foreground">현재 회기 장부 기준</p>
            </div>
            <div className="rounded-lg border bg-white px-4 py-3">
              <p className="text-xs text-muted-foreground">환불대기</p>
              <p className={`mt-1 text-base font-semibold ${breakdownRefundPending > 0 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                {breakdownRefundPending.toLocaleString()}원
              </p>
              <p className="mt-1 text-xs text-muted-foreground">초과 입금 환불 예정 금액</p>
            </div>
            <div className="rounded-lg border border-[#d9e4d5] bg-[#f7faf6] px-4 py-3">
              <p className="text-xs text-muted-foreground">총 지급 예정</p>
              <p className="mt-1 text-base font-semibold text-blue-700">
                {(breakdownPayableBaseline + breakdownRefundPending).toLocaleString()}원
              </p>
              <p className="mt-1 text-xs text-muted-foreground">줄 돈 + 환불대기 합계</p>
            </div>
          </div>
        ) : (
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border bg-white px-4 py-3">
              <p className="text-xs text-muted-foreground">이월 미수</p>
              <p className={`mt-1 text-base font-semibold ${customerBreakdown.legacyBaseline > 0 ? 'text-red-600' : customerBreakdown.legacyBaseline < 0 ? 'text-blue-700' : ''}`}>
                {customerBreakdown.legacyBaseline.toLocaleString()}원
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {customerBreakdown.customer.name} 원본 잔액
              </p>
            </div>
            <div className="rounded-lg border bg-white px-4 py-3">
              <p className="text-xs text-muted-foreground">기준일 새 입력 미수</p>
              <p className={`mt-1 text-base font-semibold ${breakdownCrmReceivable > 0 ? 'text-red-600' : breakdownCrmReceivable < 0 ? 'text-blue-700' : ''}`}>
                {breakdownCrmReceivable.toLocaleString()}원
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {asOfDate} 기준 미수 명세표 합계
              </p>
            </div>
            <div className="rounded-lg border bg-white px-4 py-3">
              <p className="text-xs text-muted-foreground">기존 장부 미지급금</p>
              <p className={`mt-1 text-base font-semibold ${breakdownPayableBaseline > 0 ? 'text-blue-700' : 'text-muted-foreground'}`}>
                {breakdownPayableBaseline.toLocaleString()}원
              </p>
              <p className="mt-1 text-xs text-muted-foreground">현재 회기 장부 기준</p>
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
        )
      )}

      {!isPayableMode && !isReferenceDataLoading && (receivableLinkSummary.orphanCount > 0 || receivableLinkSummary.splitCount > 0) && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {receivableLinkSummary.orphanCount > 0 && (
            <div>고객관리 연결이 없는 분리 거래명 미수 {receivableLinkSummary.orphanCount}건</div>
          )}
          {receivableLinkSummary.splitCount > 0 && (
            <div>고객명과 별도로 얼마에요 구분명이 유지된 미수 {receivableLinkSummary.splitCount}건</div>
          )}
        </div>
      )}

      <Tabs
        value={sourceTab}
        onValueChange={(value) => {
          const nextValue = value as 'all' | 'crm' | 'legacy' | 'payable' | 'refund'
          setSourceTab(nextValue)
          const nextParams = new URLSearchParams(searchParams)
          const defaultTab = getDefaultReceivableTab(isPayableMode)
          if (nextValue === defaultTab) nextParams.delete('tab')
          else nextParams.set('tab', nextValue)
          setSearchParams(nextParams, { replace: true })
        }}
      >
        <div className="mb-4 rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">정산 구간</p>
                <p className="text-xs text-muted-foreground">
                  전체 흐름을 먼저 보고, 필요하면 탭으로 범위를 좁혀서 확인하세요.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-[#f7f5ef] px-3 py-1 font-medium text-[#836b2c]">
                  {isReferenceDataLoading && activeTabMeta.value !== 'crm'
                    ? '연결 데이터 준비 중'
                    : `${activeTabMeta.label} ${activeTabMeta.count.toLocaleString()}건`}
                </span>
                <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                  기준일 {asOfDate}
                </span>
              </div>
            </div>

            <TabsList className="h-auto flex-wrap justify-start gap-2 bg-transparent p-0" data-guide-id="receivables-tabs">
              {visibleTabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-full border bg-white px-3 py-1.5 text-xs text-muted-foreground shadow-none data-[state=active]:border-[#7d9675] data-[state=active]:bg-[#f4f7f1] data-[state=active]:text-[#4f6748]"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="rounded-lg border border-[#e8eee4] bg-[#f9fbf7] px-4 py-3">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{activeTabMeta.label}</p>
                  <p className="text-xs text-muted-foreground">{activeTabMeta.description}</p>
                </div>
                <div className="text-xs text-muted-foreground lg:max-w-[360px]">
                  {activeTabMeta.hint}
                </div>
              </div>
            </div>
          </div>
        </div>

        <TabsContent value="all" className="space-y-4">
          <div className="rounded-lg border bg-[#fcfcfa] px-4 py-3 text-xs text-muted-foreground">
            {isPayableMode
              ? '거래처 기준으로 줄 돈과 환불대기를 함께 보여주며, 오른쪽에서 바로 송금 기록 또는 환불 정리로 이어집니다.'
              : '거래처별 이월 잔액과 새 입력 미수를 함께 보여줘 현재 총 잔액을 가장 빠르게 파악할 수 있습니다.'}
          </div>
          {isReferenceDataLoading ? (
            <div className="rounded-lg border bg-white p-12 text-center text-muted-foreground">
              고객 연결과 기존 장부 기준을 정리하는 중입니다.
            </div>
          ) : isPayableMode ? (
            <div className="rounded-lg border bg-white overflow-hidden" data-guide-id="payables-table">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">거래처</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">처리 구분</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">금액</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">다음 작업</th>
                    <th className="w-28" />
                  </tr>
                </thead>
                <tbody>
                  {filteredOutgoingLedger.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                        지급 예정 건이 없습니다.
                      </td>
                    </tr>
                  )}
                  {filteredOutgoingLedger.map((entry) => (
                    <tr
                      key={entry.key}
                      className={`border-b last:border-b-0 hover:bg-gray-50 ${entry.customerId ? 'cursor-pointer' : ''}`}
                      onClick={() => {
                        if (entry.customerId) navigate(`/customers/${entry.customerId}`)
                      }}
                    >
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{entry.customerName}</div>
                        {entry.bookName && entry.bookName !== entry.customerName && (
                          <div className="mt-0.5 text-xs text-muted-foreground">{entry.bookName}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        <span className={`inline-flex rounded-full px-2 py-0.5 font-medium ${entry.kind === 'payable' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                          {entry.kind === 'payable' ? '기존 장부 줄 돈' : '환불대기'}
                        </span>
                      </td>
                      <td className={`px-4 py-2.5 text-right font-medium ${entry.kind === 'payable' ? 'text-blue-700' : 'text-amber-700'}`}>
                        {entry.amount.toLocaleString()}원
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {entry.kind === 'payable'
                          ? entry.customerId
                            ? '원본 장부 확인 후 송금 기록'
                            : '고객관리 연결부터 필요'
                          : '환불 송금 또는 대기 해제'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          size="sm"
                          variant={entry.kind === 'payable' ? 'default' : 'outline'}
                          className="h-7 text-xs"
                          disabled={entry.kind === 'payable' && !entry.customerId}
                          onClick={(event) => {
                            event.stopPropagation()
                            if (entry.kind === 'payable') {
                              if (!entry.customerId) return
                              const customer = customerById.get(entry.customerId)
                              if (!customer) {
                                toast.error('고객 정보를 찾을 수 없습니다.')
                                return
                              }
                              setLegacyPayableTarget({ customer, payableAmount: entry.amount })
                              return
                            }
                            if (!entry.customer) return
                            setRefundPendingTarget({
                              customer: entry.customer,
                              refundPendingAmount: entry.amount,
                            })
                          }}
                        >
                          {entry.kind === 'payable'
                            ? entry.customerId ? '송금 기록' : '연결 필요'
                            : '환불 정리'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border bg-white overflow-hidden" data-guide-id="receivables-table">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">거래처</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">기존 장부</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">새 입력</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">총 미수금</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">구분</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedger.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                        해당 기준일까지의 미수금이 없습니다.
                      </td>
                    </tr>
                  )}
                  {filteredLedger.map((entry) => (
                    <tr
                      key={entry.customerId}
                      className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/customers/${entry.customerId}`)}
                    >
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{entry.customerName}</div>
                        {entry.aliases.length > 0 && (
                          <div className="mt-0.5 text-xs text-amber-700">
                            분리 거래명: {entry.aliases.join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs">
                        {entry.legacyBaseline > 0 ? `${entry.legacyBaseline.toLocaleString()}원` : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs">
                        {entry.crmRemaining > 0 ? `${entry.crmRemaining.toLocaleString()}원` : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-red-600">
                        {entry.totalRemaining.toLocaleString()}원
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {entry.source === 'both' ? '기존 장부 + 새 입력' : entry.source === 'legacy' ? '기존 장부' : '새 입력'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="crm" className="space-y-4">
          <div className="rounded-lg border bg-[#fcfcfa] px-4 py-3 text-xs text-muted-foreground">
            발행번호 기준으로 미수 명세표를 직접 확인하는 영역입니다. 경과일이 길수록 색이 진하게 표시되고, 오늘 기준에서만 바로 입금 확인을 진행할 수 있습니다.
          </div>
          <div className="rounded-lg border bg-white overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <span className="text-sm font-medium">에이징 분석</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {AGING_BUCKETS.map((b) => (
                    <th key={b.label} className="text-center px-4 py-2 font-medium text-muted-foreground text-xs">
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

          {filteredInvoices.length === 0 ? (
            <div className="rounded-lg border bg-white p-12 text-center text-muted-foreground">
              해당 기준일까지의 새 입력 미수 명세표가 없습니다.
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
                        <td className="px-4 py-2.5">
                          <div className="font-medium">{inv.customer_name ?? '-'}</div>
                          {(() => {
                            const linkedCustomer = resolveInvoiceCustomer(inv, customersForLink) ?? (typeof inv.customer_id === 'number' ? customerById.get(inv.customer_id) : undefined)
                            const invoiceName = inv.customer_name?.trim()
                            const masterName = linkedCustomer?.name?.trim()
                            const masterBookName = linkedCustomer?.book_name?.trim()
                            if (!linkedCustomer) {
                              return <div className="mt-0.5 text-xs text-amber-700">고객관리 연결 없음 · 분리 거래명 유지</div>
                            }
                            if (linkedCustomer && invoiceName && invoiceName !== masterName && invoiceName !== masterBookName) {
                              return <div className="mt-0.5 text-xs text-amber-700">고객관리: {masterName || '-'} · 분리 거래명 유지</div>
                            }
                            if (linkedCustomer && masterBookName && masterBookName !== masterName && invoiceName === masterBookName) {
                              return <div className="mt-0.5 text-xs text-muted-foreground">얼마에요 구분명 기준</div>
                            }
                            return null
                          })()}
                        </td>
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
                          {inv.asOfPaidAmount > 0 ? `${inv.asOfPaidAmount.toLocaleString()}원` : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-red-600">
                          {inv.asOfRemaining.toLocaleString()}원
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-medium ${inv.asOfStatus === 'partial' ? 'text-amber-600' : 'text-red-600'}`}>
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
        </TabsContent>

        <TabsContent value="legacy" className="space-y-4">
          <div className="rounded-lg border bg-[#fcfcfa] px-4 py-3 text-xs text-muted-foreground">
            새 명세표와 분리해서, 예전 장부에서 넘어온 이월 미수만 따로 보는 영역입니다.
          </div>
          {isReferenceDataLoading ? (
            <div className="rounded-lg border bg-white p-12 text-center text-muted-foreground">
              기존 장부 기준 고객 데이터를 불러오는 중입니다.
            </div>
          ) : (
            <div className="rounded-lg border bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">거래처</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">기존 장부 미수금</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">비고</th>
                    <th className="w-28" />
                  </tr>
                </thead>
                <tbody>
                  {filteredLegacyLedger.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                        기존 장부 미수 고객이 없습니다.
                      </td>
                    </tr>
                  )}
                  {filteredLegacyLedger.map((entry) => (
                    <tr
                      key={entry.customerId}
                      className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/customers/${entry.customerId}`)}
                    >
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{entry.customerName}</div>
                        {entry.aliases.length > 0 && (
                          <div className="mt-0.5 text-xs text-amber-700">
                            분리 거래명: {entry.aliases.join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-red-600">
                        {entry.legacyBaseline.toLocaleString()}원
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {entry.crmRemaining > 0 ? `새 입력 미수 ${entry.crmRemaining.toLocaleString()}원 별도 보유` : '기존 장부 기준'}
                      </td>
                      <td className="px-4 py-2.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={(event) => {
                            event.stopPropagation()
                            const customer = customerById.get(entry.customerId)
                            if (!customer) {
                              toast.error('고객 정보를 찾을 수 없습니다.')
                              return
                            }
                            setLegacyPaymentTarget({ customer, ledger: entry })
                          }}
                        >
                          입금 확인
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="payable" className="space-y-4">
          <div className="rounded-lg border bg-[#fcfcfa] px-4 py-3 text-xs text-muted-foreground">
            고객에게 돌려줘야 하거나 지급해야 하는 기존 장부 금액만 따로 보고, 송금 기록이 필요한 건을 정리하는 영역입니다.
          </div>
          {isReferenceDataLoading ? (
            <div className="rounded-lg border bg-white p-12 text-center text-muted-foreground">
              지급 예정 고객 데이터를 불러오는 중입니다.
            </div>
          ) : (
            <div className="rounded-lg border bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">거래처</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">기존 장부 미지급금</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">비고</th>
                    <th className="w-28" />
                  </tr>
                </thead>
                <tbody>
                  {filteredPayableLedger.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                        기존 장부 미지급금 고객이 없습니다.
                      </td>
                    </tr>
                  )}
                  {filteredPayableLedger.map((entry) => (
                    <tr
                      key={entry.legacyId}
                      className={`border-b last:border-b-0 hover:bg-gray-50 ${entry.customerId ? 'cursor-pointer' : ''}`}
                      onClick={() => {
                        if (entry.customerId) navigate(`/customers/${entry.customerId}`)
                      }}
                    >
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{entry.customerName}</div>
                        {entry.bookName && entry.bookName !== entry.customerName && (
                          <div className="mt-0.5 text-xs text-muted-foreground">{entry.bookName}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-blue-700">
                        {entry.payableAmount.toLocaleString()}원
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {entry.customerId ? '원본 장부 확인 후 송금 기록' : '고객관리 연결 필요'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          size="sm"
                          variant={entry.customerId ? 'default' : 'outline'}
                          className="h-7 text-xs"
                          disabled={!entry.customerId}
                          onClick={(event) => {
                            event.stopPropagation()
                            if (!entry.customerId) return
                            const customer = customerById.get(entry.customerId)
                            if (!customer) {
                              toast.error('고객 정보를 찾을 수 없습니다.')
                              return
                            }
                            setLegacyPayableTarget({ customer, payableAmount: entry.payableAmount })
                          }}
                        >
                          {entry.customerId ? '송금 기록' : '연결 필요'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="refund" className="space-y-4">
          <div className="rounded-lg border bg-[#fcfcfa] px-4 py-3 text-xs text-muted-foreground">
            초과 입금이나 정산 조정으로 생긴 환불대기 금액만 따로 보고, 실제 환불 완료나 대기 해제를 마무리하는 영역입니다.
          </div>
          {isReferenceDataLoading ? (
            <div className="rounded-lg border bg-white p-12 text-center text-muted-foreground">
              환불대기 고객 데이터를 불러오는 중입니다.
            </div>
          ) : (
            <div className="rounded-lg border bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">거래처</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">환불대기 금액</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">비고</th>
                    <th className="w-36" />
                  </tr>
                </thead>
                <tbody>
                  {filteredRefundPendingLedger.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                        환불대기 건이 없습니다.
                      </td>
                    </tr>
                  )}
                  {filteredRefundPendingLedger.map((entry) => (
                    <tr
                      key={entry.customer.Id}
                      className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/customers/${entry.customer.Id}`)}
                    >
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{entry.customer.name}</div>
                        {entry.customer.book_name && entry.customer.book_name !== entry.customer.name && (
                          <div className="mt-0.5 text-xs text-muted-foreground">{entry.customer.book_name as string}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-amber-700">
                        {entry.refundPendingAmount.toLocaleString()}원
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        실제 환불 송금 후 완료하거나 대기만 해제할 수 있습니다.
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={(event) => {
                            event.stopPropagation()
                            setRefundPendingTarget(entry)
                          }}
                        >
                          환불 정리
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 입금 다이얼로그 */}
      <PaymentDialog
        invoice={paymentTarget}
        onClose={() => setPaymentTarget(null)}
        onSaved={() => setPaymentTarget(null)}
      />
      <LegacyPaymentDialog
        target={legacyPaymentTarget}
        onClose={() => setLegacyPaymentTarget(null)}
        onSaved={() => setLegacyPaymentTarget(null)}
      />
      <LegacyPayableDialog
        target={legacyPayableTarget}
        onClose={() => setLegacyPayableTarget(null)}
        onSaved={() => setLegacyPayableTarget(null)}
      />
      <RefundPendingDialog
        target={refundPendingTarget}
        onClose={() => setRefundPendingTarget(null)}
        onSaved={() => setRefundPendingTarget(null)}
      />
    </div>
  )
}
