import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getInvoices, updateInvoice } from '@/lib/api'
import type { Invoice } from '@/lib/api'
import { exportReceivables } from '@/lib/excel'

// ─── 에이징 구간 ────────────────────────────────
const AGING_BUCKETS = [
  { label: '30일 이내', min: 0, max: 30 },
  { label: '31~60일', min: 31, max: 60 },
  { label: '61~90일', min: 61, max: 90 },
  { label: '91~180일', min: 91, max: 180 },
  { label: '180일 초과', min: 181, max: Infinity },
]

function getDaysSince(dateStr: string | undefined): number {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function calcRemaining(inv: Invoice): number {
  return (inv.total_amount ?? 0) - (inv.paid_amount ?? 0)
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
  const prevBal = invoice.previous_balance ?? 0
  const total = invoice.total_amount ?? 0
  const newPaid = prevPaid + amount
  const newRemaining = remaining - amount
  const newPaymentStatus =
    newPaid >= prevBal + total ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid'

  async function handleSave() {
    if (amount <= 0) {
      alert('입금액을 입력해주세요.')
      return
    }
    if (amount > remaining) {
      alert(`미수금(${remaining.toLocaleString()}원)보다 많이 입금할 수 없습니다.`)
      return
    }
    setIsSaving(true)
    try {
      await updateInvoice(invoice!.Id, {
        paid_amount: newPaid,
        current_balance: newRemaining + prevBal,
        payment_status: newPaymentStatus,
        status: newPaymentStatus,
        payment_method: method,
      })
      qc.invalidateQueries({ queryKey: ['receivables'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      onSaved()
    } catch (e) {
      console.error(e)
      alert('저장 중 오류가 발생했습니다.')
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
  const [paymentTarget, setPaymentTarget] = useState<Invoice | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['receivables'],
    queryFn: () =>
      getInvoices({
        where: '(payment_status,eq,unpaid)~or(payment_status,eq,partial)',
        limit: 500,
        sort: '-invoice_date',
      }),
    staleTime: 2 * 60 * 1000,
  })

  const invoices = data?.list ?? []

  // 에이징 집계
  const aging = AGING_BUCKETS.map((bucket) => {
    const filtered = invoices.filter((inv) => {
      const days = getDaysSince(inv.invoice_date)
      return days >= bucket.min && days <= bucket.max
    })
    return {
      ...bucket,
      count: filtered.length,
      amount: filtered.reduce((s, inv) => s + calcRemaining(inv), 0),
    }
  })

  const totalReceivable = invoices.reduce((s, inv) => s + calcRemaining(inv), 0)
  const criticalCount = invoices.filter((inv) => {
    const days = getDaysSince(inv.invoice_date)
    return days > 90
  }).length

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
            총 <span className="font-medium text-red-600">{totalReceivable.toLocaleString()}원</span>
            {' / '}{invoices.length}건
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
          onClick={() => exportReceivables(invoices)}
          className="gap-1"
        >
          <Download className="h-4 w-4" />
          엑셀 내보내기
        </Button>
      </div>

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
      {invoices.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center text-muted-foreground">
          미수금이 없습니다.
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
              {invoices.map((inv) => {
                const days = getDaysSince(inv.invoice_date)
                const remaining = calcRemaining(inv)
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
                      {inv.paid_amount != null && inv.paid_amount > 0
                        ? `${inv.paid_amount.toLocaleString()}원`
                        : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-red-600">
                      {remaining.toLocaleString()}원
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs font-medium ${
                          inv.payment_status === 'partial' ? 'text-amber-600' : 'text-red-600'
                        }`}
                      >
                        {inv.payment_status === 'partial' ? '부분수금' : '미수금'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
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
