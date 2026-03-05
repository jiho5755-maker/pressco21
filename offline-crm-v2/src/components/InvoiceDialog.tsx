import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Printer, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Invoice,
  Customer,
  createInvoice,
  updateInvoice,
  getInvoice,
  getItems,
  bulkCreateItems,
  bulkDeleteItems,
  getCustomers,
} from '@/lib/api'
import { printDuplexViaIframe } from '@/lib/print'

// ─── 라인 아이템 ───────────────────────────────
interface ItemRow {
  _key: string
  Id?: number
  product_name: string
  unit: string
  quantity: number
  unit_price: number
  supply_amount: number
  taxable: boolean
  tax_amount: number
}

function newRow(taxable = true): ItemRow {
  return {
    _key: Math.random().toString(36).slice(2),
    product_name: '',
    unit: '개',
    quantity: 1,
    unit_price: 0,
    supply_amount: 0,
    taxable,
    tax_amount: 0,
  }
}

function calcRow(row: ItemRow): ItemRow {
  const supply = row.quantity * row.unit_price
  const tax = row.taxable ? Math.floor(supply / 10) : 0
  return { ...row, supply_amount: supply, tax_amount: tax }
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function generateInvoiceNo(): string {
  const now = new Date()
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, '')
  const hms = now.toTimeString().slice(0, 8).replace(/:/g, '')
  return `INV-${ymd}-${hms}`
}

function calcStatus(paid: number, prevBal: number, total: number): string {
  if (paid >= prevBal + total && prevBal + total > 0) return 'paid'
  if (paid > 0) return 'partial'
  return 'unpaid'
}

// ─── Props ─────────────────────────────────────
interface InvoiceDialogProps {
  open: boolean
  invoiceId?: number
  onClose: () => void
  onSaved: () => void
}

// ─── 고객 자동완성 ─────────────────────────────
function useCustomerSearch(query: string) {
  return useQuery({
    queryKey: ['customerSearch', query],
    queryFn: () =>
      getCustomers({
        where: `(name,like,%${query}%)`,
        limit: 8,
        sort: '-last_order_date',
      }),
    enabled: query.length >= 1,
    staleTime: 60 * 1000,
  })
}

// ─── 컴포넌트 ──────────────────────────────────
export function InvoiceDialog({ open, invoiceId, onClose, onSaved }: InvoiceDialogProps) {
  const isNew = !invoiceId
  const qc = useQueryClient()

  // 폼 상태
  const [form, setForm] = useState<Partial<Invoice>>({
    invoice_date: today(),
    invoice_no: generateInvoiceNo(),
    receipt_type: '영수',
    previous_balance: 0,
    paid_amount: 0,
    payment_method: '현금',
  })
  const [items, setItems] = useState<ItemRow[]>([newRow()])
  const [existingItemIds, setExistingItemIds] = useState<number[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // 고객 검색
  const [customerInput, setCustomerInput] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { data: searchResult } = useCustomerSearch(customerInput)

  // 기존 명세표 로드
  const { data: existingInvoice } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => getInvoice(invoiceId!),
    enabled: !!invoiceId && open,
  })
  const { data: existingItems } = useQuery({
    queryKey: ['invoiceItems', invoiceId],
    queryFn: () => getItems(invoiceId!),
    enabled: !!invoiceId && open,
  })

  // 기존 데이터로 폼 채우기
  useEffect(() => {
    if (!open) return
    if (isNew) {
      setForm({
        invoice_date: today(),
        invoice_no: generateInvoiceNo(),
        receipt_type: '영수',
        previous_balance: 0,
        paid_amount: 0,
        payment_method: '현금',
      })
      setCustomerInput('')
      setItems([newRow()])
      setExistingItemIds([])
      return
    }
    if (existingInvoice) {
      setForm(existingInvoice)
      setCustomerInput(existingInvoice.customer_name ?? '')
    }
    if (existingItems) {
      const rows: ItemRow[] = existingItems.list.map((it) => ({
        _key: String(it.Id),
        Id: it.Id,
        product_name: it.product_name ?? '',
        unit: it.unit ?? '개',
        quantity: it.quantity ?? 1,
        unit_price: it.unit_price ?? 0,
        supply_amount: it.supply_amount ?? 0,
        taxable: it.taxable === 'Y',
        tax_amount: it.tax_amount ?? 0,
      }))
      setItems(rows.length > 0 ? rows : [newRow()])
      setExistingItemIds(existingItems.list.map((it) => it.Id))
    }
  }, [open, isNew, existingInvoice, existingItems])

  // 합계 자동 계산
  const supplyTotal = items.reduce((s, r) => s + r.supply_amount, 0)
  const taxTotal = items.reduce((s, r) => s + r.tax_amount, 0)
  const grandTotal = supplyTotal + taxTotal
  const prevBal = form.previous_balance ?? 0
  const paidAmt = form.paid_amount ?? 0
  const curBal = prevBal + grandTotal - paidAmt

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // 고객 선택
  function selectCustomer(c: Customer) {
    setCustomerInput(c.name ?? '')
    setShowDropdown(false)
    setForm((f) => ({
      ...f,
      customer_id: c.Id,
      customer_name: c.name,
      customer_phone: (c.phone as string) ?? '',
      customer_address: (c.address1 as string) ?? '',
      previous_balance: isNew ? (c.outstanding_balance ?? 0) : f.previous_balance,
    }))
  }

  // 라인 아이템 업데이트
  function updateItem(key: string, patch: Partial<ItemRow>) {
    setItems((prev) =>
      prev.map((r) => {
        if (r._key !== key) return r
        return calcRow({ ...r, ...patch })
      }),
    )
  }

  function addItem() {
    const defaultTaxable = items.length > 0 ? items[items.length - 1].taxable : true
    setItems((prev) => [...prev, newRow(defaultTaxable)])
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((r) => r._key !== key))
  }

  // 저장
  async function handleSave() {
    if (!form.customer_name?.trim()) {
      alert('거래처를 입력해주세요.')
      return
    }
    setIsSaving(true)
    try {
      const status = calcStatus(paidAmt, prevBal, grandTotal)
      const invoicePayload: Partial<Invoice> = {
        ...form,
        customer_name: customerInput || form.customer_name,
        supply_amount: supplyTotal,
        tax_amount: taxTotal,
        total_amount: grandTotal,
        current_balance: curBal,
        payment_status: status,
        status: status,
      }

      let invId: number
      if (isNew) {
        const created = await createInvoice(invoicePayload)
        invId = created.Id
      } else {
        await updateInvoice(invoiceId!, invoicePayload)
        invId = invoiceId!
      }

      // 기존 아이템 삭제 후 새로 저장
      if (existingItemIds.length > 0) {
        await bulkDeleteItems(existingItemIds)
      }
      if (items.length > 0) {
        await bulkCreateItems(
          items.map((r) => ({
            invoice_id: invId,
            product_name: r.product_name,
            unit: r.unit,
            quantity: r.quantity,
            unit_price: r.unit_price,
            supply_amount: r.supply_amount,
            tax_amount: r.tax_amount,
            taxable: r.taxable ? 'Y' : 'N',
          })),
        )
      }

      qc.invalidateQueries({ queryKey: ['invoices'] })
      onSaved()
    } catch (e) {
      console.error(e)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  // 인쇄
  function handlePrint() {
    printDuplexViaIframe(
      {
        invoice_no: form.invoice_no,
        invoice_date: form.invoice_date,
        receipt_type: form.receipt_type,
        customer_name: customerInput || form.customer_name,
        customer_phone: form.customer_phone as string,
        customer_address: form.customer_address as string,
        supply_amount: supplyTotal,
        tax_amount: taxTotal,
        total_amount: grandTotal,
        previous_balance: prevBal,
        paid_amount: paidAmt,
        memo: form.memo,
      },
      items.map((r) => ({
        product_name: r.product_name,
        unit: r.unit,
        quantity: r.quantity,
        unit_price: r.unit_price,
        supply_amount: r.supply_amount,
        tax_amount: r.tax_amount,
      })),
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? '새 거래명세표' : '명세표 수정'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pb-2">
          {/* ─── 거래처 + 발행정보 ─── */}
          <div className="grid grid-cols-3 gap-3">
            {/* 거래처 자동완성 */}
            <div className="relative" ref={dropdownRef}>
              <Label className="text-xs">거래처 *</Label>
              <Input
                placeholder="거래처명 검색..."
                value={customerInput}
                onChange={(e) => {
                  setCustomerInput(e.target.value)
                  setForm((f) => ({ ...f, customer_name: e.target.value }))
                  setShowDropdown(true)
                }}
                onFocus={() => customerInput.length >= 1 && setShowDropdown(true)}
                className="mt-1"
              />
              {showDropdown && searchResult?.list && searchResult.list.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {searchResult.list.map((c) => (
                    <button
                      key={c.Id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between"
                      onMouseDown={() => selectCustomer(c)}
                    >
                      <span className="font-medium">{c.name}</span>
                      {c.outstanding_balance != null && c.outstanding_balance > 0 && (
                        <span className="text-xs text-red-500">
                          미수{c.outstanding_balance.toLocaleString()}원
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs">발행일</Label>
              <Input
                type="date"
                value={form.invoice_date ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, invoice_date: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">발행번호</Label>
              <Input
                value={form.invoice_no ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, invoice_no: e.target.value }))}
                className="mt-1 font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">구분</Label>
              <Select
                value={form.receipt_type ?? '영수'}
                onValueChange={(v) => setForm((f) => ({ ...f, receipt_type: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="영수">영수</SelectItem>
                  <SelectItem value="청구">청구</SelectItem>
                  <SelectItem value="영수(청구)">영수(청구)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">전잔액</Label>
              <Input
                type="number"
                value={form.previous_balance ?? 0}
                onChange={(e) =>
                  setForm((f) => ({ ...f, previous_balance: Number(e.target.value) }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">비고</Label>
              <Input
                value={form.memo ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
                placeholder="비고 (선택)"
                className="mt-1"
              />
            </div>
          </div>

          <Separator />

          {/* ─── 품목 테이블 ─── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">품목 목록</span>
              <Button size="sm" variant="outline" onClick={addItem}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                행 추가
              </Button>
            </div>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-2 py-2 font-medium text-xs text-muted-foreground w-[30%]">
                      품목명
                    </th>
                    <th className="text-center px-2 py-2 font-medium text-xs text-muted-foreground w-[7%]">
                      단위
                    </th>
                    <th className="text-right px-2 py-2 font-medium text-xs text-muted-foreground w-[8%]">
                      수량
                    </th>
                    <th className="text-right px-2 py-2 font-medium text-xs text-muted-foreground w-[13%]">
                      단가
                    </th>
                    <th className="text-right px-2 py-2 font-medium text-xs text-muted-foreground w-[13%]">
                      공급가액
                    </th>
                    <th className="text-center px-2 py-2 font-medium text-xs text-muted-foreground w-[6%]">
                      과세
                    </th>
                    <th className="text-right px-2 py-2 font-medium text-xs text-muted-foreground w-[10%]">
                      세액
                    </th>
                    <th className="text-right px-2 py-2 font-medium text-xs text-muted-foreground w-[12%]">
                      합계
                    </th>
                    <th className="w-[4%]" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row._key} className="border-b last:border-b-0">
                      <td className="px-1 py-1">
                        <Input
                          value={row.product_name}
                          onChange={(e) =>
                            updateItem(row._key, { product_name: e.target.value })
                          }
                          placeholder="품목명"
                          className="h-7 text-sm border-0 focus-visible:ring-1"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          value={row.unit}
                          onChange={(e) => updateItem(row._key, { unit: e.target.value })}
                          className="h-7 text-xs text-center border-0 focus-visible:ring-1 w-12"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          type="number"
                          value={row.quantity}
                          onChange={(e) =>
                            updateItem(row._key, { quantity: Number(e.target.value) })
                          }
                          className="h-7 text-xs text-right border-0 focus-visible:ring-1"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          type="number"
                          value={row.unit_price}
                          onChange={(e) =>
                            updateItem(row._key, { unit_price: Number(e.target.value) })
                          }
                          className="h-7 text-xs text-right border-0 focus-visible:ring-1"
                        />
                      </td>
                      <td className="px-2 py-1 text-right text-xs tabular-nums">
                        {row.supply_amount.toLocaleString()}
                      </td>
                      <td className="px-1 py-1 text-center">
                        <input
                          type="checkbox"
                          checked={row.taxable}
                          onChange={(e) => updateItem(row._key, { taxable: e.target.checked })}
                          className="accent-[#7d9675] w-4 h-4"
                        />
                      </td>
                      <td className="px-2 py-1 text-right text-xs tabular-nums">
                        {row.tax_amount.toLocaleString()}
                      </td>
                      <td className="px-2 py-1 text-right text-xs font-medium tabular-nums">
                        {(row.supply_amount + row.tax_amount).toLocaleString()}
                      </td>
                      <td className="px-1 py-1">
                        <button
                          onClick={() => removeItem(row._key)}
                          className="text-muted-foreground hover:text-red-500 p-0.5"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── 합계 ─── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-md p-3 text-sm">
              <div className="text-xs text-muted-foreground mb-1">공급가액</div>
              <div className="text-lg font-bold">{supplyTotal.toLocaleString()}원</div>
            </div>
            <div className="bg-gray-50 rounded-md p-3 text-sm">
              <div className="text-xs text-muted-foreground mb-1">세액</div>
              <div className="text-lg font-bold">{taxTotal.toLocaleString()}원</div>
            </div>
            <div className="bg-[#e8f0e8] rounded-md p-3 text-sm">
              <div className="text-xs text-muted-foreground mb-1">합계금액</div>
              <div className="text-lg font-bold text-[#3d6b4a]">
                {grandTotal.toLocaleString()}원
              </div>
            </div>
          </div>

          {/* ─── 입금 + 미수금 ─── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">입금액</Label>
                  <Input
                    type="number"
                    value={form.paid_amount ?? 0}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, paid_amount: Number(e.target.value) }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">입금방법</Label>
                  <Select
                    value={form.payment_method ?? '현금'}
                    onValueChange={(v) => setForm((f) => ({ ...f, payment_method: v }))}
                  >
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
              </div>
            </div>

            <div className="bg-gray-50 rounded-md p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">전잔액</span>
                <span>{prevBal.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">출고액</span>
                <span>{grandTotal.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">입금액</span>
                <span>-{paidAmt.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="text-xs font-medium">현잔액</span>
                <span
                  className={`font-bold ${curBal > 0 ? 'text-red-600' : 'text-green-600'}`}
                >
                  {curBal.toLocaleString()}원
                </span>
              </div>
            </div>
          </div>

          {/* ─── 액션 버튼 ─── */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Button variant="outline" onClick={handlePrint} className="gap-1">
              <Printer className="h-4 w-4" />
              인쇄 미리보기
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose} disabled={isSaving}>
                취소
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#7d9675] hover:bg-[#6a8462] text-white"
              >
                {isSaving ? '저장 중...' : isNew ? '명세표 발행' : '수정 저장'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
