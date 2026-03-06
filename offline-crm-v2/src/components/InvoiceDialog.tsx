import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Printer, X, Copy, LayoutList } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  createInvoice,
  updateInvoice,
  getInvoice,
  getInvoices,
  getItems,
  bulkCreateItems,
  bulkDeleteItems,
  getCustomers,
  getProducts,
  sanitizeSearchTerm,
  sanitizeAmount,
  recalcCustomerBalance,
} from '@/lib/api'
import type { Invoice, Customer, Product } from '@/lib/api'
import { printDuplexViaIframe } from '@/lib/print'
import { GRADE_COLORS } from '@/lib/constants'
import { ProductPickerDialog } from '@/components/ProductPickerDialog'

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
  _totalUnit?: number  // 합계역산용 단위금액 (합계/수량)
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

// 합계(total) → 공급가/세액 역산 (accounting-specialist 검증)
function reverseCalcFromTotal(total: number, taxable: boolean): { supply: number; tax: number } {
  if (!taxable) return { supply: total, tax: 0 }
  const supply = Math.floor(total / 1.1)
  const tax = total - supply
  return { supply, tax }
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
  copySourceId?: number   // 복사 시 소스 ID
  onClose: () => void
  onSaved: () => void
}

// ─── 고객 자동완성 ─────────────────────────────
function useCustomerSearch(query: string) {
  return useQuery({
    queryKey: ['customerSearch', query],
    queryFn: () =>
      getCustomers({
        where: `(name,like,%${sanitizeSearchTerm(query)}%)`,
        limit: 8,
        sort: '-last_order_date',
      }),
    enabled: query.length >= 1,
    staleTime: 60 * 1000,
  })
}

// ─── 상품 자동완성 ─────────────────────────────
function useProductSearch(query: string) {
  return useQuery({
    queryKey: ['productSearch', query],
    queryFn: () =>
      getProducts({
        where: `(name,like,%${sanitizeSearchTerm(query)}%)`,
        limit: 8,
        sort: 'name',
      }),
    enabled: query.length >= 1,
    staleTime: 60 * 1000,
  })
}

// 고객의 단가등급(1~5)에 해당하는 단가 반환
function getPriceForCustomer(product: Product, customer: Customer | null): number {
  const tier = customer?.price_tier ?? 1
  const key = `price${tier}` as keyof Product
  const price = product[key]
  if (typeof price === 'number') return price
  return product.price1 ?? 0
}

function getTierLabel(tier: number): string {
  const labels: Record<number, string> = { 1: '씨앗', 2: '뿌리', 3: '꽃밭', 4: '정원사', 5: '별빛' }
  return labels[tier] ?? '소매가'
}

// ─── 컴포넌트 ──────────────────────────────────
export function InvoiceDialog({ open, invoiceId, copySourceId, onClose, onSaved }: InvoiceDialogProps) {
  const isNew = !invoiceId && !copySourceId
  const isCopy = !!copySourceId
  const editId = invoiceId || copySourceId
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
  const [isDirty, setIsDirty] = useState(false)

  // 선택된 고객 (단가등급용)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  // 고객 주소 선택 (address1 ~ addressN 동적)
  const [selectedAddrKey, setSelectedAddrKey] = useState<string>('address1')

  // 고객 검색
  const [customerInput, setCustomerInput] = useState('')
  const [showCustomerDrop, setShowCustomerDrop] = useState(false)
  const customerDropRef = useRef<HTMLDivElement>(null)
  const { data: customerSearchResult } = useCustomerSearch(customerInput)

  // 최근 거래 5건
  const { data: recentInvoices } = useQuery({
    queryKey: ['recentInvoices', selectedCustomer?.Id],
    queryFn: () =>
      getInvoices({
        where: `(customer_id,eq,${selectedCustomer!.Id})`,
        limit: 5,
        sort: '-invoice_date',
      }),
    enabled: !!selectedCustomer?.Id,
    staleTime: 60 * 1000,
  })

  // 기존 명세표 로드
  const { data: existingInvoice } = useQuery({
    queryKey: ['invoice', editId],
    queryFn: () => getInvoice(editId!),
    enabled: !!editId && open,
  })
  const { data: existingItems } = useQuery({
    queryKey: ['invoiceItems', editId],
    queryFn: () => getItems(editId!),
    enabled: !!editId && open,
  })

  // 기존 데이터로 폼 채우기
  useEffect(() => {
    if (!open) return
    setIsDirty(false)
    if (isNew && !isCopy) {
      setForm({
        invoice_date: today(),
        invoice_no: generateInvoiceNo(),
        receipt_type: '영수',
        previous_balance: 0,
        paid_amount: 0,
        payment_method: '현금',
      })
      setCustomerInput('')
      setSelectedCustomer(null)
      setItems([newRow()])
      setExistingItemIds([])
      return
    }
    if (existingInvoice) {
      if (isCopy) {
        // 복사: 새 번호 + 오늘 날짜, 수금 초기화
        setForm({
          ...existingInvoice,
          Id: undefined,
          invoice_no: generateInvoiceNo(),
          invoice_date: today(),
          paid_amount: 0,
          payment_status: 'unpaid',
          status: 'unpaid',
          current_balance: existingInvoice.total_amount,
        })
      } else {
        setForm(existingInvoice)
      }
      setCustomerInput(existingInvoice.customer_name ?? '')
    }
    if (existingItems) {
      const rows: ItemRow[] = existingItems.list.map((it) => ({
        _key: String(it.Id),
        Id: isCopy ? undefined : it.Id,
        product_name: it.product_name ?? '',
        unit: it.unit ?? '개',
        quantity: it.quantity ?? 1,
        unit_price: it.unit_price ?? 0,
        supply_amount: it.supply_amount ?? 0,
        taxable: it.taxable === 'Y',
        tax_amount: it.tax_amount ?? 0,
      }))
      setItems(rows.length > 0 ? rows : [newRow()])
      setExistingItemIds(isCopy ? [] : existingItems.list.map((it) => it.Id))
    }
  }, [open, isNew, isCopy, existingInvoice, existingItems])

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
      if (customerDropRef.current && !customerDropRef.current.contains(e.target as Node)) {
        setShowCustomerDrop(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // 키보드 단축키
  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleClose()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        void handleSave()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, isDirty])

  // 고객 선택
  function selectCustomer(c: Customer) {
    setCustomerInput(c.name ?? '')
    setSelectedCustomer(c)
    setShowCustomerDrop(false)
    setSelectedAddrKey('address1')  // 기본: address1
    setForm((f) => ({
      ...f,
      customer_id: c.Id,
      customer_name: c.name,
      customer_phone: (c.phone as string) ?? '',
      customer_address: (c.address1 as string) ?? '',
      previous_balance: isNew ? (c.outstanding_balance ?? 0) : f.previous_balance,
    }))
    setIsDirty(true)
  }

  // 주소 전환 (address1 ~ addressN 동적)
  function switchAddress(key: string) {
    if (!selectedCustomer) return
    setSelectedAddrKey(key)
    const addr = ((selectedCustomer as Record<string, unknown>)[key] as string) ?? ''
    setForm((f) => ({ ...f, customer_address: addr }))
    setIsDirty(true)
  }

  // 고객의 비어있지 않은 주소 필드 목록
  function getCustomerAddresses(c: Customer): { key: string; label: string }[] {
    const result: { key: string; label: string }[] = []
    for (let i = 1; i <= 5; i++) {
      const key = `address${i}`
      const val = (c as Record<string, unknown>)[key]
      if (typeof val === 'string' && val.trim()) {
        result.push({ key, label: `주소${i}` })
      }
    }
    return result
  }

  // 라인 아이템 업데이트
  function updateItem(key: string, patch: Partial<ItemRow>) {
    setItems((prev) =>
      prev.map((r) => {
        if (r._key !== key) return r
        const updated = { ...r, ...patch }
        // 단가 변경 시 합계 재계산
        if ('unit_price' in patch || 'quantity' in patch || 'taxable' in patch) {
          return calcRow(updated)
        }
        return updated
      }),
    )
    setIsDirty(true)
  }

  // 합계 직접 입력 → 역산 (accounting-specialist 로직)
  function updateItemFromTotal(key: string, totalStr: string) {
    const totalVal = sanitizeAmount(totalStr)
    setItems((prev) =>
      prev.map((r) => {
        if (r._key !== key) return r
        const { supply, tax } = reverseCalcFromTotal(totalVal, r.taxable)
        const qty = Math.max(1, r.quantity)
        const unitPrice = Math.floor(supply / qty)
        const totalUnit = Math.floor(totalVal / qty)  // 역산 기준 보존
        return {
          ...r,
          unit_price: unitPrice,
          supply_amount: supply,
          tax_amount: tax,
          _totalUnit: totalUnit,
        }
      }),
    )
    setIsDirty(true)
  }

  // 수량 변경 시 totalUnit 기준 역산
  function updateItemQuantity(key: string, qtyStr: string) {
    const qty = Math.max(1, parseInt(qtyStr) || 1)
    setItems((prev) =>
      prev.map((r) => {
        if (r._key !== key) return r
        if (r._totalUnit != null) {
          // 역산 모드: totalUnit × 수량
          const supply = r._totalUnit * qty
          const tax = r.taxable ? Math.floor(supply / 10) : 0
          const unitPrice = Math.floor(supply / qty)
          return { ...r, quantity: qty, unit_price: unitPrice, supply_amount: supply, tax_amount: tax }
        }
        return calcRow({ ...r, quantity: qty })
      }),
    )
    setIsDirty(true)
  }

  // 상품 자동완성 상태 (품목 행별)
  const [productInputs, setProductInputs] = useState<Record<string, string>>({})
  const [showProductDrop, setShowProductDrop] = useState<string | null>(null)
  const productDropRef = useRef<HTMLDivElement>(null)
  const [activeProductKey, setActiveProductKey] = useState<string | null>(null)

  // 품목 선택 모달
  const [productPickerOpen, setProductPickerOpen] = useState(false)
  const [productPickerRowKey, setProductPickerRowKey] = useState<string | null>(null)

  const productQuery = activeProductKey ? (productInputs[activeProductKey] ?? '') : ''
  const { data: productSearchResult } = useProductSearch(productQuery)

  function selectProduct(rowKey: string, product: Product) {
    const price = getPriceForCustomer(product, selectedCustomer)
    setItems((prev) =>
      prev.map((r) => {
        if (r._key !== rowKey) return r
        return calcRow({
          ...r,
          product_name: product.name ?? '',
          unit_price: price,
          unit: product.unit ?? '개',
          taxable: product.is_taxable ?? true,
        })
      }),
    )
    setProductInputs((prev) => ({ ...prev, [rowKey]: product.name ?? '' }))
    setShowProductDrop(null)
    setIsDirty(true)
  }

  function addItem() {
    const defaultTaxable = items.length > 0 ? items[items.length - 1].taxable : true
    const row = newRow(defaultTaxable)
    setItems((prev) => [...prev, row])
    setProductInputs((prev) => ({ ...prev, [row._key]: '' }))
    setIsDirty(true)
  }

  // 품목 선택 모달에서 선택 완료
  function handleProductPicked(product: import('@/lib/api').Product) {
    const rowKey = productPickerRowKey
    if (rowKey) {
      selectProduct(rowKey, product)
    } else {
      // rowKey 없으면 새 행 추가 후 선택
      const defaultTaxable = items.length > 0 ? items[items.length - 1].taxable : true
      const row = newRow(defaultTaxable)
      setItems((prev) => [...prev, row])
      setProductInputs((prev) => ({ ...prev, [row._key]: '' }))
      // 다음 tick에 selectProduct 호출
      setTimeout(() => selectProduct(row._key, product), 0)
    }
    setProductPickerRowKey(null)
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((r) => r._key !== key))
    setIsDirty(true)
  }

  // 닫기 안전장치
  const handleClose = useCallback(() => {
    if (isDirty) {
      if (!window.confirm('저장하지 않은 내용이 있습니다. 그래도 닫으시겠습니까?')) return
    }
    onClose()
  }, [isDirty, onClose])

  // 저장
  async function handleSave() {
    if (!form.customer_name?.trim()) {
      toast.warning('거래처를 입력해주세요')
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
      if (!invoiceId) {
        // 신규 or 복사
        const created = await createInvoice(invoicePayload)
        invId = created.Id
      } else {
        await updateInvoice(invoiceId, invoicePayload)
        invId = invoiceId
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

      // 잔액 재계산
      if (form.customer_id) {
        try { await recalcCustomerBalance(form.customer_id) } catch {}
      }

      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['invoices-customer'] })
      qc.invalidateQueries({ queryKey: ['receivables'] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      setIsDirty(false)
      toast.success(invoiceId ? '명세표가 수정되었습니다' : '명세표가 발행되었습니다')
      onSaved()
    } catch (e) {
      console.error(e)
      toast.error('저장하지 못했습니다. 잠시 후 다시 시도해주세요')
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

  const titleLabel = isCopy ? '명세표 복사' : invoiceId ? '명세표 수정' : '새 거래명세표'

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCopy && <Copy className="h-4 w-4 text-muted-foreground" />}
            {titleLabel}
            <span className="text-xs font-normal text-muted-foreground ml-1">Ctrl+Enter 저장 / Esc 닫기</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pb-2">
          {/* ─── 거래처 + 발행정보 ─── */}
          <div className="grid grid-cols-3 gap-3">
            {/* 거래처 자동완성 */}
            <div className="relative" ref={customerDropRef}>
              <Label className="text-xs">거래처 *</Label>
              <Input
                placeholder="거래처명 검색..."
                value={customerInput}
                onChange={(e) => {
                  setCustomerInput(e.target.value)
                  setForm((f) => ({ ...f, customer_name: e.target.value }))
                  setShowCustomerDrop(true)
                  setIsDirty(true)
                }}
                onFocus={() => customerInput.length >= 1 && setShowCustomerDrop(true)}
                className="mt-1"
              />
              {showCustomerDrop && customerSearchResult?.list && customerSearchResult.list.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {customerSearchResult.list.map((c) => (
                    <button
                      key={c.Id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between"
                      onMouseDown={() => selectCustomer(c)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.name}</span>
                        {c.price_tier && c.price_tier > 1 && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#e8f0e8', color: '#3d6b4a' }}>
                            {getTierLabel(c.price_tier)}
                          </span>
                        )}
                      </div>
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
                onChange={(e) => { setForm((f) => ({ ...f, invoice_date: e.target.value })); setIsDirty(true) }}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">발행번호</Label>
              <Input
                value={form.invoice_no ?? ''}
                onChange={(e) => { setForm((f) => ({ ...f, invoice_no: e.target.value })); setIsDirty(true) }}
                className="mt-1 font-mono text-xs"
              />
            </div>
          </div>

          {/* 거래처 카드 (선택 시) */}
          {selectedCustomer && (
            <div className="bg-gray-50 rounded-md px-3 py-2 text-xs flex flex-wrap gap-4">
              <div>
                <span className="text-muted-foreground">전화: </span>
                <span>{selectedCustomer.phone ?? '-'}</span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-muted-foreground">주소: </span>
                {(() => {
                  const addrList = getCustomerAddresses(selectedCustomer)
                  if (addrList.length <= 1) {
                    return <span>{selectedCustomer.address1 ?? '-'}</span>
                  }
                  return (
                    <div className="flex items-center gap-1 flex-wrap">
                      <Select value={selectedAddrKey} onValueChange={switchAddress}>
                        <SelectTrigger className="h-6 text-xs py-0 px-2 w-20 border-[#7d9675]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {addrList.map(({ key, label }) => (
                            <SelectItem key={key} value={key} className="text-xs">
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="max-w-[200px] truncate">{(form.customer_address as string) ?? '-'}</span>
                    </div>
                  )
                })()}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">단가등급: </span>
                {(() => {
                  const tier = selectedCustomer.price_tier ?? 1
                  const grade = selectedCustomer.is_ambassador ? 'AMBASSADOR' : (selectedCustomer.member_grade ?? 'MEMBER')
                  const g = GRADE_COLORS[grade]
                  return g ? (
                    <span className="px-1.5 py-0.5 rounded text-white text-xs" style={{ backgroundColor: g.bg }}>
                      {getTierLabel(tier)} ({g.label})
                    </span>
                  ) : <span>{getTierLabel(tier)}</span>
                })()}
              </div>
              {/* 최근 거래 5건 */}
              {recentInvoices?.list && recentInvoices.list.length > 0 && (
                <div className="w-full">
                  <span className="text-muted-foreground font-medium">최근 거래: </span>
                  <span className="space-x-3">
                    {recentInvoices.list.map((inv) => (
                      <span key={inv.Id} className="text-muted-foreground">
                        {inv.invoice_date?.slice(0, 10)} {inv.total_amount?.toLocaleString()}원
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">구분</Label>
              <Select
                value={form.receipt_type ?? '영수'}
                onValueChange={(v) => { setForm((f) => ({ ...f, receipt_type: v })); setIsDirty(true) }}
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
                onChange={(e) => { setForm((f) => ({ ...f, previous_balance: sanitizeAmount(e.target.value) })); setIsDirty(true) }}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">비고</Label>
              <Input
                value={form.memo ?? ''}
                onChange={(e) => { setForm((f) => ({ ...f, memo: e.target.value })); setIsDirty(true) }}
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
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setProductPickerRowKey(null); setProductPickerOpen(true) }}
                  className="gap-1 text-xs h-8"
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  목록에서 선택
                </Button>
                <Button size="sm" variant="outline" onClick={addItem} className="h-8">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  행 추가
                </Button>
              </div>
            </div>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-2 py-2 font-medium text-xs text-muted-foreground w-[28%]">품목명</th>
                    <th className="text-center px-2 py-2 font-medium text-xs text-muted-foreground w-[7%]">단위</th>
                    <th className="text-right px-2 py-2 font-medium text-xs text-muted-foreground w-[8%]">수량</th>
                    <th className="text-right px-2 py-2 font-medium text-xs text-muted-foreground w-[13%]">단가</th>
                    <th className="text-right px-2 py-2 font-medium text-xs text-muted-foreground w-[12%]">공급가액</th>
                    <th className="text-center px-2 py-2 font-medium text-xs text-muted-foreground w-[6%]">과세</th>
                    <th className="text-right px-2 py-2 font-medium text-xs text-muted-foreground w-[10%]">세액</th>
                    <th className="text-right px-2 py-2 font-medium text-xs text-muted-foreground w-[12%]">합계(역산)</th>
                    <th className="w-[4%]" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row._key} className="border-b last:border-b-0">
                      {/* 품목명 with 상품 자동완성 */}
                      <td className="px-1 py-1 relative">
                        <div ref={row._key === activeProductKey ? productDropRef : null}>
                          <Input
                            value={productInputs[row._key] ?? row.product_name}
                            onChange={(e) => {
                              const v = e.target.value
                              setProductInputs((prev) => ({ ...prev, [row._key]: v }))
                              updateItem(row._key, { product_name: v })
                              setActiveProductKey(row._key)
                              setShowProductDrop(row._key)
                            }}
                            onFocus={() => {
                              setActiveProductKey(row._key)
                              if ((productInputs[row._key] ?? row.product_name).length >= 1) {
                                setShowProductDrop(row._key)
                              }
                            }}
                            onBlur={() => setTimeout(() => setShowProductDrop(null), 150)}
                            placeholder="품목명 검색 (자동완성)"
                            className="h-7 text-sm border-0 focus-visible:ring-1"
                          />
                          {showProductDrop === row._key && productSearchResult?.list && productSearchResult.list.length > 0 && (
                            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                              {productSearchResult.list.map((p) => {
                                const price = getPriceForCustomer(p, selectedCustomer)
                                return (
                                  <button
                                    key={p.Id}
                                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center justify-between"
                                    onMouseDown={() => selectProduct(row._key, p)}
                                  >
                                    <span>{p.name}</span>
                                    <span className="text-muted-foreground">{price.toLocaleString()}원</span>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                          {/* 목록에서 선택 버튼 */}
                          <button
                            type="button"
                            title="목록에서 선택"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              setProductPickerRowKey(row._key)
                              setProductPickerOpen(true)
                            }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-[#7d9675] rounded"
                          >
                            <LayoutList className="h-3 w-3" />
                          </button>
                        </div>
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
                          onChange={(e) => updateItemQuantity(row._key, e.target.value)}
                          className="h-7 text-xs text-right border-0 focus-visible:ring-1"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          type="number"
                          value={row.unit_price}
                          onChange={(e) => updateItem(row._key, { unit_price: sanitizeAmount(e.target.value), _totalUnit: undefined })}
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
                      {/* 합계 직접 입력 → 역산 */}
                      <td className="px-1 py-1">
                        <Input
                          type="number"
                          value={row.supply_amount + row.tax_amount || ''}
                          onChange={(e) => updateItemFromTotal(row._key, e.target.value)}
                          className="h-7 text-xs text-right border-0 focus-visible:ring-1"
                          placeholder="합계입력"
                        />
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
                    onChange={(e) => { setForm((f) => ({ ...f, paid_amount: sanitizeAmount(e.target.value) })); setIsDirty(true) }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">입금방법</Label>
                  <Select
                    value={form.payment_method ?? '현금'}
                    onValueChange={(v) => { setForm((f) => ({ ...f, payment_method: v })); setIsDirty(true) }}
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
                <span className={`font-bold ${curBal > 0 ? 'text-red-600' : 'text-green-600'}`}>
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
              <Button variant="ghost" onClick={handleClose} disabled={isSaving}>
                취소
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#7d9675] hover:bg-[#6a8462] text-white"
              >
                {isSaving ? '저장 중...' : isCopy ? '복사 발행' : invoiceId ? '수정 저장' : '명세표 발행'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* 품목 선택 모달 */}
    <ProductPickerDialog
      open={productPickerOpen}
      customer={selectedCustomer}
      onClose={() => setProductPickerOpen(false)}
      onSelect={handleProductPicked}
    />
    </>
  )
}
