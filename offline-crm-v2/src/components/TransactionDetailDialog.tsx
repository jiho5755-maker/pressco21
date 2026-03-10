import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { getInvoice, getItems, getTxHistory, sanitizeSearchTerm } from '@/lib/api'
import type { Invoice, InvoiceItem, TxHistory } from '@/lib/api'

export interface TransactionPreview {
  source: 'crm' | 'legacy'
  recordId: number
  date: string
  customerName: string
  legacyBookId?: string
  txType: string
  amount: number
  tax?: number
  slipNo?: string
  memo?: string
  customerId?: number
}

interface TransactionDetailDialogProps {
  open: boolean
  transaction: TransactionPreview | null
  onClose: () => void
}

function formatCurrency(value?: number): string {
  if (!value) return '-'
  return `${value.toLocaleString()}원`
}

function formatDate(value?: string): string {
  return value?.slice(0, 10) || '-'
}

function buildLegacyWhere(transaction: TransactionPreview): string | undefined {
  const safeSlipNo = sanitizeSearchTerm(transaction.slipNo ?? '')
  const safeDate = transaction.date.slice(0, 10)
  const safeLegacyBookId = sanitizeSearchTerm(transaction.legacyBookId ?? '')
  if (safeSlipNo && safeDate && safeLegacyBookId) {
    return `(slip_no,eq,${safeSlipNo})~and(tx_date,eq,${safeDate})~and(legacy_book_id,eq,${safeLegacyBookId})`
  }
  if (safeSlipNo && safeDate) return `(slip_no,eq,${safeSlipNo})~and(tx_date,eq,${safeDate})`
  if (safeSlipNo) return `(slip_no,eq,${safeSlipNo})`
  if (safeLegacyBookId && safeDate) return `(legacy_book_id,eq,${safeLegacyBookId})~and(tx_date,eq,${safeDate})`

  const safeCustomer = sanitizeSearchTerm(transaction.customerName)
  if (!safeCustomer || !safeDate) return undefined
  return `(customer_name,eq,${safeCustomer})~and(tx_date,eq,${safeDate})`
}

function renderKeyValue(label: string, value?: string | number | null) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value || <span className="text-muted-foreground">-</span>}</p>
    </div>
  )
}

function getItemQuantity(items: InvoiceItem[]): number {
  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0)
  if (totalQuantity > 0) return totalQuantity
  return items.length
}

export function TransactionDetailDialog({ open, transaction, onClose }: TransactionDetailDialogProps) {
  const navigate = useNavigate()
  const crmQuery = useQuery({
    queryKey: ['transaction-detail-crm', transaction?.recordId],
    queryFn: async () => {
      const [invoice, items] = await Promise.all([
        getInvoice(transaction!.recordId),
        getItems(transaction!.recordId),
      ])
      return { invoice, items: items.list }
    },
    enabled: open && transaction?.source === 'crm' && typeof transaction.recordId === 'number',
    staleTime: 60_000,
  })

  const legacyQuery = useQuery({
    queryKey: ['transaction-detail-legacy', transaction?.recordId, transaction?.slipNo, transaction?.date],
    queryFn: async () => {
      const where = buildLegacyWhere(transaction!)
      if (!where) return [] as TxHistory[]
      const result = await getTxHistory({
        where,
        sort: 'tx_type',
        limit: 100,
      })
      return result.list
    },
    enabled: open && transaction?.source === 'legacy' && typeof transaction.recordId === 'number',
    staleTime: 60_000,
  })

  const relatedLegacyRows = useMemo(() => {
    if (transaction?.source !== 'legacy') return []
    const rows = legacyQuery.data ?? []
    if (rows.length > 0) return rows
    return [{
      Id: transaction.recordId,
      tx_date: transaction.date,
      legacy_book_id: transaction.legacyBookId,
      customer_name: transaction.customerName,
      tx_type: transaction.txType,
      amount: transaction.amount,
      tax: transaction.tax,
      slip_no: transaction.slipNo,
      memo: transaction.memo,
    } satisfies TxHistory]
  }, [legacyQuery.data, transaction])

  const isLoading = crmQuery.isLoading || legacyQuery.isLoading
  const isError = crmQuery.isError || legacyQuery.isError
  const effectiveCustomerName = transaction?.customerName?.trim() ?? ''
  const effectiveCustomerId =
    transaction?.customerId ??
    (typeof crmQuery.data?.invoice?.customer_id === 'number' ? crmQuery.data.invoice.customer_id : undefined)

  function goToInvoiceEdit() {
    if (!transaction || transaction.source !== 'crm') return
    onClose()
    navigate(`/invoices?edit=${transaction.recordId}`)
  }

  function goToCustomerTransactions() {
    if (!effectiveCustomerName) return
    onClose()
    navigate(`/transactions?customer=${encodeURIComponent(effectiveCustomerName)}`)
  }

  function goToCustomerDetail() {
    if (!effectiveCustomerId) return
    onClose()
    navigate(`/customers/${effectiveCustomerId}`)
  }

  function goToReceivables() {
    const params = new URLSearchParams()
    if (effectiveCustomerName) params.set('customer', effectiveCustomerName)
    if (effectiveCustomerId) params.set('customerId', String(effectiveCustomerId))
    onClose()
    navigate(`/receivables?${params.toString()}`)
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3 pr-8">
            <span>거래 상세</span>
            {transaction ? (
              <span className="text-xs font-normal text-muted-foreground">
                {transaction.source === 'crm' ? 'CRM 명세표 기준' : '레거시 장부 기준'}
              </span>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        {!transaction ? (
          <div className="py-10 text-center text-sm text-muted-foreground">선택된 거래가 없습니다.</div>
        ) : isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">상세 정보를 불러오는 중입니다...</div>
        ) : isError ? (
          <div className="py-10 text-center text-sm text-red-500">상세 정보를 불러오지 못했습니다.</div>
        ) : transaction.source === 'crm' ? (
          <CrmTransactionContent
            invoice={crmQuery.data?.invoice}
            items={crmQuery.data?.items ?? []}
            transaction={transaction}
          />
        ) : (
          <LegacyTransactionContent
            transaction={transaction}
            rows={relatedLegacyRows}
          />
        )}

        <div className="flex justify-between gap-2 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={goToInvoiceEdit}
              disabled={!transaction || transaction.source !== 'crm'}
            >
              수정 열기
            </Button>
            <Button
              variant="outline"
              onClick={goToCustomerTransactions}
              disabled={!effectiveCustomerName}
            >
              같은 거래처 전체 보기
            </Button>
            <Button
              variant="outline"
              onClick={goToCustomerDetail}
              disabled={!effectiveCustomerId}
            >
              고객 상세 열기
            </Button>
            <Button
              variant="outline"
              onClick={goToReceivables}
              disabled={!effectiveCustomerName}
            >
              미수금 보기
            </Button>
          </div>
          <Button variant="outline" onClick={onClose}>닫기</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CrmTransactionContent({
  invoice,
  items,
  transaction,
}: {
  invoice?: Invoice
  items: InvoiceItem[]
  transaction: TransactionPreview
}) {
  const effectiveInvoice = invoice ?? {
    Id: transaction.recordId,
    invoice_no: transaction.slipNo,
    invoice_date: transaction.date,
    customer_name: transaction.customerName,
    total_amount: transaction.amount,
    tax_amount: transaction.tax,
    memo: transaction.memo,
  }

  return (
    <div className="overflow-y-auto pr-1">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-gray-50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">명세표 번호</p>
              <p className="font-mono text-sm">{effectiveInvoice.invoice_no ?? '-'}</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-[#e8f0e8] px-2 py-1 text-xs font-medium text-[#3d6b4a]">
              {transaction.txType}
            </span>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            {renderKeyValue('발행일', formatDate(effectiveInvoice.invoice_date))}
            {renderKeyValue('거래처', effectiveInvoice.customer_name)}
            {renderKeyValue('연락처', effectiveInvoice.customer_phone)}
            {renderKeyValue('주소', effectiveInvoice.customer_address)}
            {renderKeyValue('공급가액', formatCurrency(effectiveInvoice.supply_amount))}
            {renderKeyValue('세액', formatCurrency(effectiveInvoice.tax_amount))}
            {renderKeyValue('합계금액', formatCurrency(effectiveInvoice.total_amount))}
            {renderKeyValue(
              '수금상태',
              effectiveInvoice.payment_status === 'paid'
                ? '완납'
                : effectiveInvoice.payment_status === 'partial'
                  ? '부분수금'
                  : effectiveInvoice.payment_status === 'unpaid'
                    ? '미수금'
                    : '-',
            )}
            {renderKeyValue('입금액', formatCurrency(effectiveInvoice.paid_amount))}
            {renderKeyValue('품목 수량 합계', `${getItemQuantity(items).toLocaleString()}개`)}
          </div>
          {effectiveInvoice.memo ? (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">메모</p>
                <p className="text-sm whitespace-pre-wrap break-words">{effectiveInvoice.memo}</p>
              </div>
            </>
          ) : null}
        </div>

        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">당시 명세표 품목</h3>
            <span className="text-xs text-muted-foreground">{items.length}건</span>
          </div>
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              품목 라인 정보가 없습니다.
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">품목명</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">수량</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">단가</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">공급가</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">세액</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.Id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">
                        <div className="font-medium">{item.product_name || '-'}</div>
                        <div className="text-xs text-muted-foreground">{item.unit || '-'}</div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{item.quantity ?? 0}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(item.unit_price)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(item.supply_amount)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(item.tax_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LegacyTransactionContent({
  transaction,
  rows,
}: {
  transaction: TransactionPreview
  rows: TxHistory[]
}) {
  return (
    <div className="overflow-y-auto pr-1 space-y-4">
      <div className="rounded-lg border bg-gray-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">선택 거래</p>
            <h3 className="mt-1 text-lg font-semibold">{transaction.customerName || '거래처 미상'}</h3>
          </div>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
            {transaction.txType}
          </span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {renderKeyValue('거래일', transaction.date)}
          {renderKeyValue('전표번호', transaction.slipNo)}
          {renderKeyValue('금액', formatCurrency(transaction.amount))}
          {renderKeyValue('세액', formatCurrency(transaction.tax))}
          {renderKeyValue('메모', transaction.memo)}
          {renderKeyValue('관련 행 수', `${rows.length.toLocaleString()}건`)}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">같이 기록된 거래 목록</h3>
          <span className="text-xs text-muted-foreground">
            {transaction.slipNo ? '전표번호 기준 묶음' : '같은 날짜/거래처 기준 묶음'}
          </span>
        </div>
        <div className="max-h-[420px] overflow-y-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b">
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">일자</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">유형</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">금액</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">세액</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">적요</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.Id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(row.tx_date)}</td>
                  <td className="px-3 py-2 font-medium">{row.tx_type ?? '-'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(row.amount)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(row.tax)}</td>
                  <td className="px-3 py-2">
                    <div className="text-sm">{row.memo || '-'}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {(row.debit_account || row.credit_account)
                        ? `${row.debit_account ?? '-'} / ${row.credit_account ?? '-'}`
                        : row.ledger ?? '-'}
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
