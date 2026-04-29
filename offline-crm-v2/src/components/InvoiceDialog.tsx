import { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Printer, X, Copy, LayoutList } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  createInvoice,
  updateInvoice,
  updateCustomer,
  getCustomer,
  getInvoice,
  getInvoices,
  getItems,
  bulkCreateItems,
  bulkDeleteItems,
  getCustomers,
  getProducts,
  findCustomerByInvoiceLink,
  getCustomerAddressEntries,
  getCustomerAddressValueByKey,
  sanitizeSearchTerm,
  sanitizeAmount,
  recalcCustomerStats,
  upsertPaymentReminder,
} from '@/lib/api'
import type { Invoice, Customer, Product } from '@/lib/api'
import { buildDuplexBlobUrl, getPreviewPageCount, PRINT_DOCUMENT_OPTIONS, printWindowWhenReady } from '@/lib/print'
import type { PrintDocumentType } from '@/lib/print'
import { GRADE_COLORS } from '@/lib/constants'
import { DEFAULT_RECEIPT_TYPE, normalizeReceiptTypeValue, RECEIPT_TYPE_OPTIONS } from '@/lib/invoiceDefaults'
import { loadDefaultTaxableSetting } from '@/lib/settings'
import { formatBusinessNumber, formatPhoneNumber, normalizeDateInput } from '@/lib/formatters'
import { getVatIncludedLineTotal, splitVatIncludedAmount } from '@/lib/vatIncluded'
import { ProductPickerDialog } from '@/components/ProductPickerDialog'
import { useDebounce } from '@/hooks/useDebounce'
import {
  appendCustomerAccountingEvent,
  getDisplayMemo,
  getInvoiceCustomerAddressKey,
  getInvoiceDepositUsedAmount,
  parseInvoiceAccountingMeta,
  parseCustomerAccountingMeta,
  serializeInvoiceAccountingMeta,
} from '@/lib/accountingMeta'
import { buildCustomerSearchWhere, customerMatchesSearch, getCustomerSearchSupportText, rankCustomerSearch } from '@/lib/customerSearch'

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

interface InvoiceDraft {
  savedAt: string
  form: Partial<Invoice>
  items: ItemRow[]
  customerInput: string
  selectedAddrKey: string
  manualDiscountAmount?: number
  isDiscountManual?: boolean
  internalMemo?: string
  paymentDueDate?: string
  paymentDueAmount?: number
  paymentReminderEnabled?: boolean
}

interface RecentCustomerOption {
  key: string
  customerId?: number
  customerName: string
  invoiceDate?: string
  outstandingBalance?: number
}

const INVOICE_DRAFT_KEY = 'pressco21-crm-invoice-draft-v1'
function newRow(taxable = loadDefaultTaxableSetting()): ItemRow {
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

function cloneRowDefaults(source?: ItemRow): ItemRow {
  const row = newRow(source?.taxable ?? loadDefaultTaxableSetting())
  if (!source) return row
  return {
    ...row,
    unit: source.unit || row.unit,
    taxable: source.taxable,
  }
}

function hasMeaningfulItemValue(row: ItemRow): boolean {
  return Boolean(row.product_name.trim()) || row.unit_price > 0 || row.supply_amount > 0 || row.tax_amount > 0
}

function hasMeaningfulDraftValue(
  form: Partial<Invoice>,
  items: ItemRow[],
  customerInput: string,
): boolean {
  return Boolean(
    customerInput.trim()
    || (form.memo as string | undefined)?.trim()
    || items.some(hasMeaningfulItemValue)
    || (form.previous_balance ?? 0) > 0
    || (form.paid_amount ?? 0) > 0,
  )
}

function saveInvoiceDraft(draft: InvoiceDraft): void {
  localStorage.setItem(INVOICE_DRAFT_KEY, JSON.stringify(draft))
}

function loadInvoiceDraft(): InvoiceDraft | null {
  try {
    const raw = localStorage.getItem(INVOICE_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as InvoiceDraft
    if (!parsed || !Array.isArray(parsed.items)) return null
    return parsed
  } catch {
    return null
  }
}

function clearInvoiceDraft(): void {
  localStorage.removeItem(INVOICE_DRAFT_KEY)
}

function formatDraftTime(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function calcRow(row: ItemRow): ItemRow {
  const total = getVatIncludedLineTotal(row.unit_price, row.quantity)
  const split = splitVatIncludedAmount(total, row.taxable)
  return { ...row, supply_amount: split.supplyAmount, tax_amount: split.taxAmount }
}

// 합계(total, 부가세 포함) → 공급가/세액 역산
function reverseCalcFromTotal(total: number, taxable: boolean): { supply: number; tax: number } {
  const split = splitVatIncludedAmount(total, taxable)
  return { supply: split.supplyAmount, tax: split.taxAmount }
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function normalizeInvoiceDate(value?: string): string {
  const normalized = normalizeDateInput(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized
  return today()
}

function normalizePositiveId(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const parsed = Number(trimmed)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return undefined
}

function normalizeReceiptType(value?: string | null): string {
  return normalizeReceiptTypeValue(value) ?? DEFAULT_RECEIPT_TYPE
}

function generateInvoiceNo(): string {
  const now = new Date()
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, '')
  const hms = now.toTimeString().slice(0, 8).replace(/:/g, '')
  return `INV-${ymd}-${hms}`
}

// payment_status 판정: 이번 명세표 total 기준으로만 판단 (accounting-specialist 검증)
// prevBal은 이전 명세표에 귀속된 채무이므로 이번 명세표 완납 여부에 포함하지 않음
function calcStatus(paid: number, _prevBal: number, total: number): string {
  if (total <= 0) return 'paid'   // 금액 없는 명세표
  if (paid >= total) return 'paid'
  if (paid > 0) return 'partial'
  return 'unpaid'
}

// ─── Props ─────────────────────────────────────
interface InvoiceDialogProps {
  open: boolean
  invoiceId?: number
  copySourceId?: number   // 복사 시 소스 ID
  initialInvoiceDate?: string
  initialCustomerId?: number
  initialCustomerName?: string
  onClose: () => void
  onSaved: () => void
}

// ─── 상품 자동완성 (이름+품목코드 복합검색, 15건) ──
function useProductSearch(query: string) {
  return useQuery({
    queryKey: ['productSearch', query],
    queryFn: () => {
      const q = sanitizeSearchTerm(query)
      return getProducts({
        where: `(name,like,%${q}%)~or(product_code,like,%${q}%)`,
        limit: 15,
        sort: 'name',
      })
    },
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

function clampDiscountAmount(value: number, maxAmount: number): number {
  return Math.max(0, Math.min(Math.trunc(value), Math.max(0, maxAmount)))
}

function getTierLabel(tier: number): string {
  const labels: Record<number, string> = { 1: '씨앗', 2: '뿌리', 3: '꽃밭', 4: '정원사', 5: '별빛' }
  return labels[tier] ?? '소매가'
}

function defaultAddressLabel(index: number): string {
  return index === 0 ? '기본 주소' : `배송지 ${index + 1}`
}

function getCustomerPrimaryPhone(customer: Customer | null | undefined): string {
  return formatPhoneNumber((customer?.mobile ?? customer?.phone1 ?? customer?.phone ?? '') as string)
}

function getCustomerAddressKeys(customer: Customer | null | undefined): string[] {
  return getCustomerAddressEntries(customer).map((entry) => entry.key)
}

function resolveCustomerAddressKey(
  customer: Customer | null | undefined,
  preferredKey?: string,
  preferredAddress?: string,
  fallbackKey = 'address1',
): string {
  const keys = getCustomerAddressKeys(customer)
  const normalizedPreferredKey = preferredKey?.trim()
  if (normalizedPreferredKey && keys.includes(normalizedPreferredKey)) {
    return normalizedPreferredKey
  }
  const normalized = preferredAddress?.trim()
  if (normalized && customer) {
    const matchedKey = getCustomerAddressEntries(customer).find((entry) => entry.value === normalized)?.key
    if (matchedKey) return matchedKey
  }
  if (keys.includes(fallbackKey)) return fallbackKey
  return keys[0] ?? fallbackKey
}

function getCustomerAddressValue(
  customer: Customer | null | undefined,
  addressKey = 'address1',
): string {
  if (!customer) return ''
  const resolvedKey = resolveCustomerAddressKey(customer, addressKey)
  return getCustomerAddressValueByKey(customer, resolvedKey)
}

function buildCustomerSnapshot(
  customer: Customer,
  addressKey = 'address1',
): Partial<Invoice> {
  const resolvedAddressKey = resolveCustomerAddressKey(customer, addressKey)
  return {
    customer_id: customer.Id,
    customer_name: customer.name,
    customer_phone: getCustomerPrimaryPhone(customer),
    customer_address: getCustomerAddressValue(customer, resolvedAddressKey),
    customer_address_key: resolvedAddressKey,
    customer_bizno: formatBusinessNumber(customer.biz_no),
    customer_ceo_name: customer.ceo_name as string | undefined,
    customer_biz_type: customer.biz_type as string | undefined,
    customer_biz_item: customer.biz_item as string | undefined,
  }
}

// ─── 컴포넌트 ──────────────────────────────────
export function InvoiceDialog({
  open,
  invoiceId,
  copySourceId,
  initialInvoiceDate,
  initialCustomerId,
  initialCustomerName,
  onClose,
  onSaved,
}: InvoiceDialogProps) {
  const isNew = !invoiceId && !copySourceId
  const isCopy = !!copySourceId
  const editId = invoiceId || copySourceId
  const qc = useQueryClient()

  // 폼 상태
  const [form, setForm] = useState<Partial<Invoice>>({
    invoice_date: normalizeInvoiceDate(initialInvoiceDate),
    invoice_no: generateInvoiceNo(),
    receipt_type: normalizeReceiptType(DEFAULT_RECEIPT_TYPE),
    previous_balance: 0,
    paid_amount: 0,
    payment_method: '현금',
  })
  const [items, setItems] = useState<ItemRow[]>(() => [newRow(loadDefaultTaxableSetting())])
  const [existingItemIds, setExistingItemIds] = useState<number[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [draftMeta, setDraftMeta] = useState<InvoiceDraft | null>(null)

  // 선택된 고객 (단가등급용)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  // 고객 주소 선택 (address1 ~ addressN 동적)
  const [selectedAddrKey, setSelectedAddrKey] = useState<string>('address1')
  const [depositUseAmount, setDepositUseAmount] = useState(0)
  const [manualDiscountAmount, setManualDiscountAmount] = useState(0)
  const [isDiscountManual, setIsDiscountManual] = useState(false)
  const [internalMemo, setInternalMemo] = useState('')
  const [paymentDueDate, setPaymentDueDate] = useState('')
  const [paymentDueAmount, setPaymentDueAmount] = useState(0)
  const [paymentReminderEnabled, setPaymentReminderEnabled] = useState(false)

  // 인쇄 미리보기
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewPages, setPreviewPages] = useState(1)
  const [previewDocumentType, setPreviewDocumentType] = useState<PrintDocumentType>('invoice')
  const previewIframeRef = useRef<HTMLIFrameElement>(null)
  const saveActionRef = useRef<() => Promise<void>>(async () => {})
  const closeActionRef = useRef<() => void>(() => {})

  // 고객 검색
  const [customerInput, setCustomerInput] = useState('')
  const [showCustomerDrop, setShowCustomerDrop] = useState(false)
  const customerDropRef = useRef<HTMLDivElement>(null)
  const customerDropdownRef = useRef<HTMLDivElement>(null)
  const [customerDropdownIdx, setCustomerDropdownIdx] = useState(-1)
  const debouncedCustomerInput = useDebounce(customerInput, 150)
  const customerSearchWhere = useMemo(() => buildCustomerSearchWhere(debouncedCustomerInput), [debouncedCustomerInput])
  const { data: customerSearchResult, isFetching: isCustomerDirectoryLoading } = useQuery({
    queryKey: ['customerSearch', customerSearchWhere],
    queryFn: () =>
      getCustomers({
        where: customerSearchWhere,
        limit: 25,
        sort: '-last_order_date',
      }),
    enabled: open && Boolean(customerSearchWhere),
    staleTime: 60 * 1000,
  })
  const customerSearchResults = useMemo(() => {
    const query = debouncedCustomerInput.trim()
    if (!query) return []
    return (customerSearchResult?.list ?? [])
      .filter((customer) => customerMatchesSearch(customer, query))
      .sort((left, right) => rankCustomerSearch(right, query) - rankCustomerSearch(left, query))
      .slice(0, 8)
  }, [customerSearchResult?.list, debouncedCustomerInput])

  // 상품 자동완성 상태 (품목 행별) — useEffect 전에 선언 필요
  const [productInputs, setProductInputs] = useState<Record<string, string>>({})
  const [showProductDrop, setShowProductDrop] = useState<string | null>(null)
  const productDropRef = useRef<HTMLDivElement>(null)
  const [activeProductKey, setActiveProductKey] = useState<string | null>(null)
  const [dropdownIdx, setDropdownIdx] = useState(-1)
  const productInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const qtyInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const unitPriceInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  // items 최신값을 항상 참조 (stale closure 방지)
  const itemsRef = useRef(items)
  itemsRef.current = items

  // 품목 선택 모달
  const [productPickerOpen, setProductPickerOpen] = useState(false)
  const [productPickerRowKey, setProductPickerRowKey] = useState<string | null>(null)

  // 드롭다운 portal 위치 (테이블 overflow 밖으로 렌더링 + 뷰포트 하단 감지)
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null)
  const dropdownContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (customerDropdownIdx >= 0 && customerDropdownRef.current) {
      const el = customerDropdownRef.current.children[customerDropdownIdx] as HTMLElement | undefined
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [customerDropdownIdx])
  useLayoutEffect(() => {
    if (showProductDrop && activeProductKey) {
      const el = productInputRefs.current[activeProductKey]
      if (el) {
        const rect = el.getBoundingClientRect()
        const width = Math.max(rect.width + 100, 360)
        const maxH = 240 // max-h-60 = 15rem
        const spaceBelow = window.innerHeight - rect.bottom
        if (spaceBelow < maxH && rect.top > maxH) {
          // 위쪽에 표시
          setDropdownPos({ bottom: window.innerHeight - rect.top + 2, left: rect.left, width })
        } else {
          // 아래쪽에 표시 (기본)
          setDropdownPos({ top: rect.bottom + 2, left: rect.left, width })
        }
      }
    } else {
      setDropdownPos(null)
    }
  }, [showProductDrop, activeProductKey])

  // 키보드 방향키 탐색 시 활성 아이템 스크롤 추적
  useEffect(() => {
    if (dropdownIdx >= 0 && dropdownContainerRef.current) {
      const el = dropdownContainerRef.current.children[dropdownIdx] as HTMLElement
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [dropdownIdx])

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
  const { data: recentCustomerInvoices, isFetching: isRecentCustomerLoading } = useQuery({
    queryKey: ['recentInvoiceCustomers-global'],
    queryFn: () =>
      getInvoices({
        limit: 20,
        sort: '-invoice_date',
      }),
    enabled: open && isNew && !isCopy,
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
  const selectedCustomerId = normalizePositiveId(selectedCustomer?.Id)
  const formCustomerId = normalizePositiveId(form.customer_id)
  const existingCustomerId = normalizePositiveId(existingInvoice?.customer_id)
  const trimmedCustomerInput = customerInput.trim()
  const formCustomerName = typeof form.customer_name === 'string' ? form.customer_name.trim() : ''
  const existingCustomerName = typeof existingInvoice?.customer_name === 'string' ? existingInvoice.customer_name.trim() : ''
  const canReuseExistingCustomerLink =
    trimmedCustomerInput.length === 0 ||
    trimmedCustomerInput === existingCustomerName
  const linkedCustomerId =
    selectedCustomerId ??
    formCustomerId ??
    (canReuseExistingCustomerLink ? existingCustomerId : undefined)
  const linkedCustomerName = trimmedCustomerInput || formCustomerName || existingCustomerName
  const { data: currentCustomer } = useQuery({
    queryKey: ['invoice-customer-current', linkedCustomerId, linkedCustomerName],
    queryFn: () =>
      findCustomerByInvoiceLink(
        linkedCustomerId,
        linkedCustomerName,
      ),
    enabled: open && !!(linkedCustomerId || linkedCustomerName),
    staleTime: 0,
  })
  const { data: initialCustomer } = useQuery({
    queryKey: ['invoice-customer-initial', initialCustomerId],
    queryFn: () => getCustomer(initialCustomerId!),
    enabled: open && isNew && !isCopy && !!initialCustomerId,
    staleTime: 0,
  })

  // 다이얼로그 닫힐 때 드롭다운 정리 (portal 잔류 방지)
  useEffect(() => {
    if (!open) {
      setShowProductDrop(null)
      setDropdownIdx(-1)
      setActiveProductKey(null)
      setDropdownPos(null)
      setShowCustomerDrop(false)
      setCustomerDropdownIdx(-1)
      setDraftMeta(null)
    }
  }, [open])

  // 기존 데이터로 폼 채우기
  useEffect(() => {
    if (!open) return
    setIsDirty(false)
    if (isNew && !isCopy) {
      const defaultTaxable = loadDefaultTaxableSetting()
      setForm({
        invoice_date: normalizeInvoiceDate(initialInvoiceDate),
        invoice_no: generateInvoiceNo(),
        receipt_type: normalizeReceiptType(DEFAULT_RECEIPT_TYPE),
        previous_balance: 0,
        paid_amount: 0,
        payment_method: '현금',
      })
      setCustomerInput(initialCustomerName ?? '')
      setSelectedCustomer(null)
      setSelectedAddrKey('address1')
      setShowCustomerDrop(false)
      setCustomerDropdownIdx(-1)
      setItems([newRow(defaultTaxable)])
      setExistingItemIds([])
      setDepositUseAmount(0)
      setManualDiscountAmount(0)
      setIsDiscountManual(false)
      setInternalMemo('')
      setPaymentDueDate('')
      setPaymentDueAmount(0)
      setPaymentReminderEnabled(false)
      setDraftMeta(loadInvoiceDraft())
      return
    }
    setDraftMeta(null)
    if (existingInvoice) {
      const invoiceMeta = parseInvoiceAccountingMeta(existingInvoice.memo as string | undefined)
      const existingAddressKey = invoiceMeta.customerAddressKey
        ?? (existingInvoice.customer_address_key as string | undefined)
        ?? 'address1'
      const normalizedExistingInvoice = {
        ...existingInvoice,
        receipt_type: normalizeReceiptType(existingInvoice.receipt_type),
        customer_address_key: existingAddressKey,
      }
      if (isCopy) {
        // 복사: 새 번호 + 오늘 날짜, 수금 초기화
        setForm({
          ...normalizedExistingInvoice,
          Id: undefined,
          invoice_no: generateInvoiceNo(),
          invoice_date: today(),
          paid_amount: 0,
          payment_status: 'unpaid',
          status: 'unpaid',
          current_balance: existingInvoice.total_amount,
        })
      } else {
        setForm(normalizedExistingInvoice)
      }
      setCustomerInput(existingInvoice.customer_name ?? '')
      setSelectedCustomer(null)
      setSelectedAddrKey(existingAddressKey)
      setShowCustomerDrop(false)
      setCustomerDropdownIdx(-1)
      setDepositUseAmount(isCopy ? 0 : getInvoiceDepositUsedAmount(existingInvoice.memo as string | undefined))
      setManualDiscountAmount(invoiceMeta.discountAmount ?? 0)
      setIsDiscountManual(!isCopy || (invoiceMeta.discountAmount ?? 0) > 0)
      setInternalMemo(isCopy ? '' : invoiceMeta.internalMemo ?? '')
      setPaymentDueDate(isCopy ? '' : invoiceMeta.paymentReminder?.dueDate ?? '')
      setPaymentDueAmount(isCopy ? 0 : invoiceMeta.paymentReminder?.amount ?? 0)
      setPaymentReminderEnabled(isCopy ? false : invoiceMeta.paymentReminder?.enabled ?? false)
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
      setItems(rows.length > 0 ? rows : [newRow(loadDefaultTaxableSetting())])
      setExistingItemIds(isCopy ? [] : existingItems.list.map((it) => it.Id))
    }
  }, [open, isNew, isCopy, existingInvoice, existingItems, initialInvoiceDate, initialCustomerName])

  // 주소 스냅샷은 고객/열림 상태 기준으로만 동기화한다.
  // form 주소 필드를 의존성에 넣으면 setForm과 맞물려 불필요한 재실행이 생긴다.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!open || !currentCustomer) return
    const nextAddressKey = resolveCustomerAddressKey(
      currentCustomer,
      (form.customer_address_key as string | undefined)
        ?? (existingInvoice?.customer_address_key as string | undefined)
        ?? getInvoiceCustomerAddressKey(existingInvoice?.memo as string | undefined),
      (form.customer_address as string | undefined) ?? (existingInvoice?.customer_address as string | undefined),
      selectedAddrKey || 'address1',
    )
    const snapshot = buildCustomerSnapshot(currentCustomer, nextAddressKey)
    setSelectedCustomer(currentCustomer)
    setSelectedAddrKey(nextAddressKey)
    setCustomerInput(currentCustomer.name ?? '')
    setForm((prev) => ({
      ...prev,
      ...snapshot,
      customer_name: currentCustomer.name ?? prev.customer_name,
    }))
  }, [open, currentCustomer, existingInvoice?.customer_address])
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    if (!open || !isNew || isCopy || !initialCustomer) return
    const nextAddressKey = resolveCustomerAddressKey(initialCustomer, 'address1')
    const snapshot = buildCustomerSnapshot(initialCustomer, nextAddressKey)
    setSelectedCustomer(initialCustomer)
    setSelectedAddrKey(nextAddressKey)
    setCustomerInput(initialCustomer.name ?? initialCustomerName ?? '')
    setShowCustomerDrop(false)
    setCustomerDropdownIdx(-1)
    setForm((prev) => ({
      ...prev,
      ...snapshot,
      previous_balance: initialCustomer.outstanding_balance ?? 0,
    }))
  }, [open, initialCustomer, initialCustomerName, isCopy, isNew])

  // 합계 자동 계산
  const supplyTotal = items.reduce((s, r) => s + r.supply_amount, 0)
  const taxTotal = items.reduce((s, r) => s + r.tax_amount, 0)
  const invoiceSubtotal = supplyTotal + taxTotal
  const defaultDiscountRate = Math.max(0, Number((currentCustomer ?? selectedCustomer)?.discount_rate ?? 0))
  const suggestedDiscountAmount = clampDiscountAmount(Math.floor(invoiceSubtotal * (defaultDiscountRate / 100)), invoiceSubtotal)
  const discountAmount = clampDiscountAmount(isDiscountManual ? manualDiscountAmount : suggestedDiscountAmount, invoiceSubtotal)
  const grandTotal = Math.max(0, invoiceSubtotal - discountAmount)
  const prevBal = form.previous_balance ?? 0
  const paidAmt = form.paid_amount ?? 0
  const activeCustomerAccounting = parseCustomerAccountingMeta((currentCustomer ?? selectedCustomer)?.memo as string | undefined)
  const previousInvoiceDepositUsed = invoiceId && !isCopy
    ? getInvoiceDepositUsedAmount(existingInvoice?.memo as string | undefined)
    : 0
  const availableDeposit = activeCustomerAccounting.depositBalance + previousInvoiceDepositUsed
  const maxDepositApplicable = Math.min(availableDeposit, Math.max(0, grandTotal - paidAmt))
  const appliedDeposit = Math.min(depositUseAmount, maxDepositApplicable)
  const curBal = Math.max(0, grandTotal - paidAmt - appliedDeposit)
  const statementBalance = prevBal + curBal

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (customerDropRef.current && !customerDropRef.current.contains(e.target as Node)) {
        setShowCustomerDrop(false)
        setCustomerDropdownIdx(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const customerCount = customerSearchResults.length
    if (!showCustomerDrop || customerCount === 0) {
      setCustomerDropdownIdx(-1)
      return
    }
    setCustomerDropdownIdx((prev) => Math.min(prev, customerCount - 1))
  }, [customerSearchResults, showCustomerDrop])

  // 키보드 단축키
  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        // 드롭다운 열린 경우 먼저 닫기
        if (showProductDrop) { setShowProductDrop(null); setDropdownIdx(-1); return }
        closeActionRef.current()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!showProductDrop) void saveActionRef.current()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, showProductDrop])

  // 고객 선택
  function selectCustomer(c: Customer) {
    const nextAddressKey = resolveCustomerAddressKey(c, 'address1')
    const snapshot = buildCustomerSnapshot(c, nextAddressKey)
    setCustomerInput(c.name ?? '')
    setSelectedCustomer(c)
    setShowCustomerDrop(false)
    setCustomerDropdownIdx(-1)
    setSelectedAddrKey(nextAddressKey)
    setForm((f) => ({
      ...f,
      ...snapshot,
      previous_balance: isNew ? (c.outstanding_balance ?? 0) : f.previous_balance,
    }))
    setIsDirty(true)
  }

  async function selectRecentCustomer(option: RecentCustomerOption) {
    try {
      const linkedCustomer = await findCustomerByInvoiceLink(option.customerId, option.customerName)
      if (linkedCustomer) {
        selectCustomer(linkedCustomer)
        return
      }
    } catch (error) {
      console.warn('[InvoiceDialog] 최근 거래처 연결 조회 실패', error)
    }

    setCustomerInput(option.customerName)
    setSelectedCustomer(null)
    setSelectedAddrKey('address1')
    setForm((f) => ({
      ...f,
      customer_id: option.customerId,
      customer_name: option.customerName,
      previous_balance: isNew ? (option.outstandingBalance ?? 0) : f.previous_balance,
    }))
    setShowCustomerDrop(false)
    setCustomerDropdownIdx(-1)
    setIsDirty(true)
  }

  // 주소 전환 (address1 ~ addressN 동적)
  function switchAddress(key: string) {
    if (!selectedCustomer) return
    setSelectedAddrKey(key)
    const addr = getCustomerAddressValue(selectedCustomer, key)
    setForm((f) => ({ ...f, customer_address: addr, customer_address_key: key }))
    setIsDirty(true)
  }

  // 고객의 비어있지 않은 주소 필드 목록
  function getCustomerAddresses(c: Customer): { key: string; label: string; value: string }[] {
    const meta = parseCustomerAccountingMeta(c.memo as string | undefined)
    return getCustomerAddressEntries(c).map((entry, index) => ({
      key: entry.key,
      label: meta.addressLabels[index] ?? defaultAddressLabel(index),
      value: entry.value,
    }))
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
          // 역산 모드: 합계 단가(totalUnit)를 수량만큼 늘린 뒤 다시 공급가/세액으로 분해한다.
          const combinedTotal = r._totalUnit * qty
          const { supply, tax } = reverseCalcFromTotal(combinedTotal, r.taxable)
          const unitPrice = Math.floor(supply / qty)
          return { ...r, quantity: qty, unit_price: unitPrice, supply_amount: supply, tax_amount: tax }
        }
        return calcRow({ ...r, quantity: qty })
      }),
    )
    setIsDirty(true)
  }

  const productQueryRaw = activeProductKey ? (productInputs[activeProductKey] ?? '') : ''
  const productQuery = useDebounce(productQueryRaw, 200)
  const { data: productSearchResult } = useProductSearch(productQuery)

  // 품목 선택 시에는 품목명/단위와 거래처 단가만 채우고, 과세 기본값은 현재 행 상태를 유지한다.
  function selectProduct(rowKey: string, product: Product) {
    const price = getPriceForCustomer(product, selectedCustomer)
    setItems((prev) =>
      prev.map((r) => {
        if (r._key !== rowKey) return r
        return calcRow({
          ...r,
          product_name: product.name ?? '',
          unit: product.unit ?? '개',
          unit_price: price,
        })
      }),
    )
    setProductInputs((prev) => ({ ...prev, [rowKey]: product.name ?? '' }))
    setShowProductDrop(null)
    setDropdownIdx(-1)
    setIsDirty(true)
    // 상품 선택 후 수량 input으로 자동 포커스
    setTimeout(() => {
      qtyInputRefs.current[rowKey]?.focus()
      qtyInputRefs.current[rowKey]?.select()
    }, 0)
  }

  const addItem = useCallback(() => {
    const cur = itemsRef.current
    const row = cloneRowDefaults(cur.length > 0 ? cur[cur.length - 1] : undefined)
    setItems((prev) => [...prev, row])
    setProductInputs((prev) => ({ ...prev, [row._key]: '' }))
    setIsDirty(true)
    // 새 행의 품목 input으로 자동 포커스
    setTimeout(() => { productInputRefs.current[row._key]?.focus() }, 50)
  }, [])

  function focusUnitPrice(rowKey: string) {
    setTimeout(() => {
      unitPriceInputRefs.current[rowKey]?.focus()
      unitPriceInputRefs.current[rowKey]?.select()
    }, 0)
  }

  function focusNextProductRow(currentKey: string) {
    const currentRows = itemsRef.current
    const currentIndex = currentRows.findIndex((row) => row._key === currentKey)
    const nextRow = currentRows[currentIndex + 1]
    if (nextRow) {
      setTimeout(() => {
        productInputRefs.current[nextRow._key]?.focus()
        productInputRefs.current[nextRow._key]?.select()
      }, 0)
      return
    }
    addItem()
  }

  // 품목 선택 모달에서 단일 선택 완료
  function handleProductPicked(product: import('@/lib/api').Product) {
    const rowKey = productPickerRowKey
    if (rowKey) {
      selectProduct(rowKey, product)
    } else {
      // rowKey 없으면 새 행 추가 후 선택
      const row = cloneRowDefaults(itemsRef.current[itemsRef.current.length - 1])
      setItems((prev) => [...prev, row])
      setProductInputs((prev) => ({ ...prev, [row._key]: '' }))
      // 다음 tick에 selectProduct 호출
      setTimeout(() => selectProduct(row._key, product), 0)
    }
    setProductPickerRowKey(null)
  }

  // 품목 선택 모달에서 복수 선택 완료
  function handleMultiPicked(products: import('@/lib/api').Product[]) {
    const defaultTaxable = items.length > 0 ? items[items.length - 1].taxable : loadDefaultTaxableSetting()
    const newRows: ItemRow[] = products.map((p) => {
      const row = newRow(defaultTaxable)
      row.unit_price = getPriceForCustomer(p, selectedCustomer)
      row.product_name = p.name ?? ''
      row.unit = p.unit ?? '개'
      return calcRow(row)
    })
    setItems((prev) => [...prev, ...newRows])
    setProductInputs((prev) => {
      const next = { ...prev }
      newRows.forEach((r, i) => { next[r._key] = products[i].name ?? '' })
      return next
    })
    setIsDirty(true)
    setProductPickerRowKey(null)
    toast.success(`${products.length}개 품목 추가됨`)
  }

  function removeItem(key: string) {
    setItems((prev) => {
      const next = prev.filter((r) => r._key !== key)
      return next.length > 0 ? next : [newRow(loadDefaultTaxableSetting())]
    })
    setIsDirty(true)
  }

  function handleSaveDraft() {
    if (!isNew || isCopy) return
    if (!hasMeaningfulDraftValue(form, items, customerInput) && !internalMemo.trim() && !paymentDueDate) {
      toast.warning('임시저장할 내용이 없습니다')
      return
    }
    const draft: InvoiceDraft = {
      savedAt: new Date().toISOString(),
      form: {
        ...form,
        customer_name: customerInput || form.customer_name,
      },
      items,
      customerInput,
      selectedAddrKey,
      manualDiscountAmount,
      isDiscountManual,
      internalMemo,
      paymentDueDate,
      paymentDueAmount,
      paymentReminderEnabled,
    }
    saveInvoiceDraft(draft)
    setDraftMeta(draft)
    toast.success('임시저장되었습니다')
  }

  function handleRestoreDraft() {
    const draft = draftMeta ?? loadInvoiceDraft()
    if (!draft) {
      toast.warning('불러올 임시저장본이 없습니다')
      return
    }
    const restoredItems = draft.items.length > 0
      ? draft.items.map((item) => ({
        ...newRow(loadDefaultTaxableSetting()),
        ...item,
        _key: item._key || Math.random().toString(36).slice(2),
      }))
      : [newRow(loadDefaultTaxableSetting())]

    setForm({
      invoice_date: draft.form.invoice_date ?? today(),
      invoice_no: draft.form.invoice_no ?? generateInvoiceNo(),
      receipt_type: normalizeReceiptType(draft.form.receipt_type as string | undefined),
      previous_balance: draft.form.previous_balance ?? 0,
      paid_amount: draft.form.paid_amount ?? 0,
      payment_method: draft.form.payment_method ?? '현금',
      ...draft.form,
    })
    setCustomerInput(draft.customerInput)
    setSelectedCustomer(null)
    setSelectedAddrKey(draft.selectedAddrKey || 'address1')
    setShowCustomerDrop(false)
    setCustomerDropdownIdx(-1)
    setItems(restoredItems)
    setExistingItemIds([])
    setManualDiscountAmount(draft.manualDiscountAmount ?? 0)
    setIsDiscountManual(draft.isDiscountManual === true)
    setInternalMemo(draft.internalMemo ?? '')
    setPaymentDueDate(draft.paymentDueDate ?? '')
    setPaymentDueAmount(draft.paymentDueAmount ?? 0)
    setPaymentReminderEnabled(draft.paymentReminderEnabled ?? false)
    setIsDirty(true)
    toast.success('임시저장본을 불러왔습니다')
  }

  function handleClearDraft(showToast = true) {
    clearInvoiceDraft()
    setDraftMeta(null)
    if (showToast) toast.success('임시저장본을 삭제했습니다')
  }

  // 닫기 안전장치
  const handleClose = useCallback(() => {
    if (isDirty) {
      if (!window.confirm('저장하지 않은 내용이 있습니다. 그래도 닫으시겠습니까?')) return
    }
    onClose()
  }, [isDirty, onClose])

  useEffect(() => {
    closeActionRef.current = handleClose
  }, [handleClose])

  // 저장
  async function handleSave() {
    if (!form.customer_name?.trim()) {
      toast.warning('거래처를 입력해주세요')
      return
    }
    const effectiveItems = items.filter(hasMeaningfulItemValue)
    if (effectiveItems.length === 0) {
      toast.warning('품목을 한 개 이상 입력해주세요')
      return
    }
    if (paidAmt > grandTotal) {
      toast.warning('입금액은 이번 명세표 합계까지만 입력할 수 있습니다. 초과 입금은 수금 관리에서 예치금으로 보관해 주세요.')
      return
    }
    setIsSaving(true)
    try {
      const status = calcStatus(paidAmt + appliedDeposit, prevBal, grandTotal)
      const sourceCustomer = currentCustomer ?? selectedCustomer
      const customerSnapshot = sourceCustomer ? buildCustomerSnapshot(sourceCustomer, selectedAddrKey) : undefined
      const effectiveCustomerId = normalizePositiveId(form.customer_id)
      const previousDepositUsed = invoiceId && !isCopy
        ? getInvoiceDepositUsedAmount(existingInvoice?.memo as string | undefined)
        : 0
      const deltaDepositUsed = appliedDeposit - previousDepositUsed
      let latestCustomerForDeposit: Customer | null = null
      if (deltaDepositUsed > 0) {
        if (!effectiveCustomerId) {
          toast.error('예치금 사용에는 연결된 고객 정보가 필요합니다.')
          return
        }
        latestCustomerForDeposit = await getCustomer(effectiveCustomerId)
        const latestDepositBalance = parseCustomerAccountingMeta(latestCustomerForDeposit.memo as string | undefined).depositBalance
        if (latestDepositBalance < deltaDepositUsed) {
          toast.error(`사용 가능 예치금이 부족합니다. 현재 ${latestDepositBalance.toLocaleString()}원만 사용할 수 있습니다.`)
          return
        }
      }
      const reminderAmount = paymentDueAmount > 0 ? paymentDueAmount : Math.max(0, curBal)
      const hasPaymentPromise = Boolean(paymentDueDate || paymentDueAmount > 0 || paymentReminderEnabled)
      const reminderEnabled = Boolean(paymentDueDate && paymentReminderEnabled)
      const currentInvoiceMeta = parseInvoiceAccountingMeta(form.memo as string | undefined)
      const nextInvoiceMemo = serializeInvoiceAccountingMeta(form.memo as string | undefined, {
        ...currentInvoiceMeta,
        depositUsedAmount: appliedDeposit,
        discountAmount,
        customerAddressKey: selectedAddrKey,
        internalMemo,
        fulfillmentStatus: invoiceId && !isCopy
          ? currentInvoiceMeta.fulfillmentStatus
          : 'preparing',
        shipmentConfirmedAt: invoiceId && !isCopy ? currentInvoiceMeta.shipmentConfirmedAt : undefined,
        revenueRecognizedDate: invoiceId && !isCopy ? currentInvoiceMeta.revenueRecognizedDate : undefined,
        revenuePostedAt: invoiceId && !isCopy ? currentInvoiceMeta.revenuePostedAt : undefined,
        revenuePostingStatus: invoiceId && !isCopy
          ? currentInvoiceMeta.revenuePostingStatus
          : 'pending',
        salesLedgerId: invoiceId && !isCopy ? currentInvoiceMeta.salesLedgerId : undefined,
        salesLedgerIdempotencyKey: invoiceId && !isCopy ? currentInvoiceMeta.salesLedgerIdempotencyKey : undefined,
        taxInvoiceStatus: invoiceId && !isCopy ? currentInvoiceMeta.taxInvoiceStatus : 'not_requested',
        paymentHistory: currentInvoiceMeta.paymentHistory,
        paymentReminder: hasPaymentPromise
          ? {
              dueDate: paymentDueDate || undefined,
              amount: reminderAmount,
              enabled: reminderEnabled,
              leadDays: 0,
              requestedAt: reminderEnabled ? new Date().toISOString() : undefined,
              webhookStatus: reminderEnabled ? 'pending' : undefined,
            }
          : undefined,
      })
      const invoicePayload: Partial<Invoice> = {
        ...form,
        receipt_type: normalizeReceiptType(form.receipt_type as string | undefined),
        ...(customerSnapshot ?? {}),
        customer_name: customerInput || customerSnapshot?.customer_name || form.customer_name,
        customer_address: customerSnapshot?.customer_address ?? (form.customer_address as string | undefined),
        customer_address_key: customerSnapshot?.customer_address_key ?? selectedAddrKey,
        supply_amount: supplyTotal,
        tax_amount: taxTotal,
        total_amount: grandTotal,
        current_balance: curBal,
        payment_status: status,
        memo: nextInvoiceMemo,
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
        // 삭제도 10개 단위 배치 (NocoDB 벌크 제한 방어)
        const BATCH = 10
        for (let i = 0; i < existingItemIds.length; i += BATCH) {
          await bulkDeleteItems(existingItemIds.slice(i, i + BATCH))
        }
      }
      if (effectiveItems.length > 0) {
        const itemPayloads = effectiveItems.map((r) => ({
          invoice_id: invId,
          product_name: r.product_name,
          unit: r.unit,
          quantity: r.quantity,
          unit_price: r.unit_price,
          supply_amount: r.supply_amount,
          tax_amount: r.tax_amount,
          taxable: r.taxable ? 'Y' : 'N',
        }))
        // 10개씩 배치로 나눠 생성 (NocoDB 벌크 1회 상한 초과 방지)
        const BATCH = 10
        for (let i = 0; i < itemPayloads.length; i += BATCH) {
          await bulkCreateItems(itemPayloads.slice(i, i + BATCH))
        }
      }

      // 잔액 재계산
      if (effectiveCustomerId) {
        if (deltaDepositUsed !== 0) {
          const latestCustomer = latestCustomerForDeposit ?? await getCustomer(effectiveCustomerId)
          const sourceMeta = parseCustomerAccountingMeta(latestCustomer.memo as string | undefined)
          const nextDepositBalance = deltaDepositUsed > 0
            ? Math.max(0, sourceMeta.depositBalance - deltaDepositUsed)
            : sourceMeta.depositBalance + Math.abs(deltaDepositUsed)
          const nextCustomerMemo = appendCustomerAccountingEvent(
            latestCustomer.memo as string | undefined,
            {
              type: deltaDepositUsed > 0 ? 'deposit_used' : 'deposit_added',
              amount: Math.abs(deltaDepositUsed),
              date: normalizeInvoiceDate(form.invoice_date),
              method: deltaDepositUsed > 0 ? '예치금 사용' : '예치금 원복',
              relatedInvoiceId: invId,
              note: customerInput || customerSnapshot?.customer_name || form.customer_name,
            },
            { depositBalance: nextDepositBalance },
          )
          await updateCustomer(effectiveCustomerId, { memo: nextCustomerMemo })
        }
        try {
          await recalcCustomerStats(effectiveCustomerId)
        } catch (error) {
          console.warn('[InvoiceDialog] 고객 통계 재계산 실패', error)
        }
      }

      const customerNameForReminder = customerInput || customerSnapshot?.customer_name || form.customer_name || ''
      const previousReminder = parseInvoiceAccountingMeta(existingInvoice?.memo as string | undefined).paymentReminder
      const shouldCancelReminder = Boolean(invoiceId && previousReminder?.enabled && (!paymentDueDate || !paymentReminderEnabled))
      if ((reminderEnabled || shouldCancelReminder) && customerNameForReminder.trim()) {
        try {
          await upsertPaymentReminder({
            action: reminderEnabled ? 'upsert' : 'cancel',
            invoiceId: invId,
            invoiceNo: form.invoice_no,
            invoiceDate: normalizeInvoiceDate(form.invoice_date),
            customerId: effectiveCustomerId,
            customerName: customerNameForReminder,
            dueDate: reminderEnabled ? paymentDueDate : previousReminder?.dueDate,
            reminderDate: reminderEnabled ? paymentDueDate : undefined,
            reminderLeadDays: 0,
            amount: reminderEnabled ? reminderAmount : 0,
            remainingAmount: Math.max(0, curBal),
            publicMemo: getDisplayMemo(form.memo as string | undefined),
            internalMemo,
            target: 'pressco21-ops-room',
          })
        } catch (reminderError) {
          const reminderMessage = reminderError instanceof Error ? reminderError.message : String(reminderError)
          toast.warning(`명세표는 저장됐지만 텔레그램 리마인더 예약 확인이 필요합니다: ${reminderMessage.slice(0, 80)}`)
        }
      }

      if (effectiveCustomerId) {
        qc.invalidateQueries({ queryKey: ['customer', effectiveCustomerId] })
      }
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['invoices-customer'] })
      qc.invalidateQueries({ queryKey: ['receivables'] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      // 수정된 명세표 캐시 무효화 (다시 열 때 구 데이터 표시 방지)
      if (invoiceId) {
        qc.invalidateQueries({ queryKey: ['invoice', invoiceId] })
        qc.invalidateQueries({ queryKey: ['invoiceItems', invoiceId] })
      }
      // 거래내역 갱신 (CRM 명세표 통합 표시용)
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['transactions-crm'] })
      // 대시보드 + 기간 리포트 전체 갱신
      qc.invalidateQueries({
        predicate: (q) => {
          const k = q.queryKey[0]
          return typeof k === 'string' && (k.startsWith('dash-') || k.startsWith('period-') || k.startsWith('calendar-'))
        },
      })
      if (isNew && !isCopy) {
        handleClearDraft(false)
      }
      setIsDirty(false)
      toast.success(invoiceId ? '명세표가 수정되었습니다' : '명세표가 발행되었습니다')
      onSaved()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[InvoiceDialog.save]', msg)
      toast.error(`저장 실패: ${msg.slice(0, 80)}`)
    } finally {
      setIsSaving(false)
    }
  }

  saveActionRef.current = handleSave

  // 인쇄 데이터 빌더
  function buildPrintData() {
    const sourceCustomer = currentCustomer ?? selectedCustomer
    const customerSnapshot = sourceCustomer ? buildCustomerSnapshot(sourceCustomer, selectedAddrKey) : undefined
    const effectiveItems = items.filter(hasMeaningfulItemValue)
    return {
      inv: {
        invoice_no: form.invoice_no,
        invoice_date: form.invoice_date,
        receipt_type: normalizeReceiptType(form.receipt_type as string | undefined),
        customer_name: customerInput || customerSnapshot?.customer_name || form.customer_name,
        customer_phone: customerSnapshot?.customer_phone ?? (form.customer_phone as string),
        customer_address: customerSnapshot?.customer_address ?? (form.customer_address as string),
        customer_bizno: customerSnapshot?.customer_bizno ?? (form.customer_bizno as string),
        customer_ceo_name: customerSnapshot?.customer_ceo_name ?? (form.customer_ceo_name as string),
        customer_biz_type: customerSnapshot?.customer_biz_type ?? (form.customer_biz_type as string),
        customer_biz_item: customerSnapshot?.customer_biz_item ?? (form.customer_biz_item as string),
        supply_amount: supplyTotal,
        tax_amount: taxTotal,
        total_amount: grandTotal,
        discount_amount: discountAmount,
        previous_balance: prevBal,
        paid_amount: paidAmt,
        current_balance_override: statementBalance,
        memo: getDisplayMemo(form.memo as string | undefined),
        deposit_used_amount: appliedDeposit,
      },
      rows: effectiveItems.map((r) => ({
        product_name: r.product_name,
        unit: r.unit,
        quantity: r.quantity,
        unit_price: r.unit_price,
        supply_amount: r.supply_amount,
        tax_amount: r.tax_amount,
      })),
    }
  }

  // 인쇄 미리보기: 인앱 모달로 먼저 확인
  function handlePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    const { inv, rows } = buildPrintData()
    const documentType = previewDocumentType
    const url = buildDuplexBlobUrl(inv, rows, { documentType })
    setPreviewUrl(url)
    setPreviewPages(getPreviewPageCount(rows.length, documentType))
    setPreviewOpen(true)
  }

  // 미리보기 닫기
  function closePreview() {
    setPreviewOpen(false)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl('')
    }
  }

  // 미리보기에서 실제 인쇄
  function handlePrintFromPreview() {
    void printWindowWhenReady(previewIframeRef.current?.contentWindow ?? null)
  }

  const titleLabel = isCopy ? '명세표 복사' : invoiceId ? '명세표 수정' : '새 명세표'
  const saveButtonLabel = isSaving ? '저장 중...' : isCopy ? '복사 발행' : invoiceId ? '수정 저장' : '저장'
  const previewDocumentLabel = PRINT_DOCUMENT_OPTIONS.find((option) => option.value === previewDocumentType)?.label ?? '명세표'
  const recentCustomerOptions: RecentCustomerOption[] = []
  const recentSeen = new Set<string>()
  for (const inv of recentCustomerInvoices?.list ?? []) {
    const normalizedName = inv.customer_name?.trim()
    const dedupeKey = typeof inv.customer_id === 'number' && inv.customer_id > 0
      ? `id:${inv.customer_id}`
      : normalizedName
        ? `name:${normalizedName.toLowerCase()}`
        : ''
    if (!dedupeKey || recentSeen.has(dedupeKey) || !normalizedName) continue
    recentSeen.add(dedupeKey)
    recentCustomerOptions.push({
      key: dedupeKey,
      customerId: typeof inv.customer_id === 'number' ? inv.customer_id : undefined,
      customerName: normalizedName,
      invoiceDate: inv.invoice_date,
      outstandingBalance: inv.current_balance ?? inv.previous_balance,
    })
    if (recentCustomerOptions.length >= 4) break
  }
  const showRecentCustomers = isNew && !isCopy && !selectedCustomer && customerInput.trim().length === 0

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) {
        // body 포탈 드롭다운이 열려있으면 Dialog 닫힘만 억제 (드롭다운은 유지 — selectProduct가 자연 닫힘)
        if (showProductDrop) return
        handleClose()
      }
    }}>
      <DialogContent
        showCloseButton={!previewOpen}
        className="flex max-w-5xl h-[92vh] max-h-[92vh] flex-col overflow-hidden p-0 gap-0"
        onKeyDown={(e) => {
          if (e.altKey && e.key === 'Enter') { e.preventDefault(); addItem() }
        }}
      >
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            {isCopy && <Copy className="h-4 w-4 text-muted-foreground" />}
            {titleLabel}
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs">
            거래처와 품목을 입력하면 하단에서 잔액 계산과 인쇄 미리보기를 바로 확인할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {isNew && !isCopy && draftMeta && (
            <div className="rounded-md border border-[#d8e4d6] bg-[#f5faf4] px-3 py-2 text-sm flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-[#3d6b4a]">임시저장본이 있습니다</p>
                <p className="text-xs text-muted-foreground">
                  저장 시각: {formatDraftTime(draftMeta.savedAt) || '-'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={handleRestoreDraft}>
                  불러오기
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => handleClearDraft()}>
                  삭제
                </Button>
              </div>
            </div>
          )}

          {/* ─── 거래처 + 발행정보 ─── */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            {/* 거래처 자동완성 */}
            <div className="relative md:col-span-6" ref={customerDropRef}>
              <Label className="text-xs">거래처 *</Label>
              <Input
                placeholder="거래처명 검색..."
                value={customerInput}
                onChange={(e) => {
                  const nextValue = e.target.value
                  setCustomerInput(nextValue)
                  setSelectedCustomer(null)
                  setSelectedAddrKey('address1')
                  setCustomerDropdownIdx(-1)
                  setForm((f) => ({
                    ...f,
                    customer_id: undefined,
                    customer_name: nextValue,
                    customer_phone: '',
                    customer_address: '',
                    customer_address_key: '',
                    customer_bizno: '',
                    customer_ceo_name: '',
                    customer_biz_type: '',
                    customer_biz_item: '',
                  }))
                  setShowCustomerDrop(nextValue.trim().length >= 1)
                  setIsDirty(true)
                }}
                onFocus={() => customerInput.length >= 1 && setShowCustomerDrop(true)}
                onKeyDown={(e) => {
                  const customerList = customerSearchResults
                  if (e.key === 'ArrowDown') {
                    if (customerList.length === 0) return
                    e.preventDefault()
                    setShowCustomerDrop(true)
                    setCustomerDropdownIdx((prev) => Math.min(prev + 1, customerList.length - 1))
                    return
                  }
                  if (e.key === 'ArrowUp') {
                    if (customerList.length === 0) return
                    e.preventDefault()
                    setShowCustomerDrop(true)
                    setCustomerDropdownIdx((prev) => (prev <= 0 ? customerList.length - 1 : prev - 1))
                    return
                  }
                  if (e.key === 'Enter' && showCustomerDrop && customerList.length > 0) {
                    e.preventDefault()
                    selectCustomer(customerList[Math.max(customerDropdownIdx, 0)] ?? customerList[0])
                    return
                  }
                  if (e.key === 'Escape') {
                    setShowCustomerDrop(false)
                    setCustomerDropdownIdx(-1)
                    return
                  }
                  if (e.key === 'Tab') {
                    setShowCustomerDrop(false)
                    setCustomerDropdownIdx(-1)
                  }
                }}
                className="mt-1"
              />
              {showRecentCustomers && (
                <div className="mt-2 rounded-xl border border-dashed border-[#d8e4d6] bg-[#f8fbf7] px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-medium text-[#5d755f]">최근 거래처 빠른 선택</span>
                    <span className="text-[11px] text-muted-foreground">최근 거래 기준 최대 4개</span>
                  </div>
                  {isRecentCustomerLoading && (
                    <span className="mt-2 block text-xs text-muted-foreground">불러오는 중...</span>
                  )}
                  {!isRecentCustomerLoading && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {recentCustomerOptions.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => { void selectRecentCustomer(option) }}
                          className="rounded-full border bg-white px-2.5 py-1 text-xs text-gray-700 hover:border-[#7d9675] hover:text-[#3d6b4a] hover:bg-[#f5faf4]"
                        >
                          <span>{option.customerName}</span>
                          {option.invoiceDate ? <span className="ml-1 text-muted-foreground">{option.invoiceDate.slice(5, 10)}</span> : null}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {showCustomerDrop && customerSearchResults.length > 0 && (
                <div ref={customerDropdownRef} className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {customerSearchResults.map((c, index) => {
                    const supportText = getCustomerSearchSupportText(c)
                    return (
                    <button
                      key={c.Id}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${
                        index === customerDropdownIdx ? 'bg-[#f0f4f0] text-[#3d6b4a]' : 'hover:bg-gray-50'
                      }`}
                      onMouseEnter={() => setCustomerDropdownIdx(index)}
                      onMouseDown={() => selectCustomer(c)}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{c.name}</span>
                          {c.price_tier && c.price_tier > 1 && (
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#e8f0e8', color: '#3d6b4a' }}>
                              {getTierLabel(c.price_tier)}
                            </span>
                          )}
                        </div>
                        {supportText && (
                          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {supportText}
                          </div>
                        )}
                      </div>
                      {c.outstanding_balance != null && c.outstanding_balance > 0 && (
                        <span className="text-xs text-red-500">
                          미수{c.outstanding_balance.toLocaleString()}원
                        </span>
                      )}
                    </button>
                  )})}
                </div>
              )}
              {showCustomerDrop && !isCustomerDirectoryLoading && debouncedCustomerInput.trim().length >= 1 && customerSearchResults.length === 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border bg-white shadow-lg px-3 py-3 text-sm">
                  <p className="font-medium text-gray-700">검색 결과가 없습니다</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    고객관리에서 거래처를 먼저 등록하거나 다른 상호명으로 다시 검색해 주세요.
                  </p>
                </div>
              )}
            </div>

            <div className="md:col-span-3">
              <Label className="text-xs">발행일</Label>
              <Input
                type="date"
                value={form.invoice_date ?? ''}
                onChange={(e) => { setForm((f) => ({ ...f, invoice_date: e.target.value })); setIsDirty(true) }}
                className="mt-1"
              />
            </div>

            <div className="md:col-span-3">
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
            <div className="rounded-lg border bg-[#f7faf6] p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-white px-2.5 py-1 text-gray-700">
                  전화 {getCustomerPrimaryPhone(selectedCustomer) || '-'}
                </span>
                {(() => {
                  const tier = selectedCustomer.price_tier ?? 1
                  const grade = selectedCustomer.is_ambassador ? 'AMBASSADOR' : (selectedCustomer.member_grade ?? 'MEMBER')
                  const g = GRADE_COLORS[grade]
                  return g ? (
                    <span className="rounded-full px-2.5 py-1 text-white" style={{ backgroundColor: g.bg }}>
                      {getTierLabel(tier)} · {g.label}
                    </span>
                  ) : (
                    <span className="rounded-full bg-white px-2.5 py-1 text-gray-700">
                      단가등급 {getTierLabel(tier)}
                    </span>
                  )
                })()}
                {typeof selectedCustomer.outstanding_balance === 'number' && selectedCustomer.outstanding_balance > 0 && (
                  <span className="rounded-full bg-[#fff1f2] px-2.5 py-1 text-red-600">
                    미수 {selectedCustomer.outstanding_balance.toLocaleString()}원
                  </span>
                )}
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
                <div className="rounded-md bg-white/80 px-3 py-2">
                  <p className="text-[11px] font-medium text-muted-foreground">배송 주소</p>
                  <div className="mt-1 flex items-center gap-2 flex-wrap text-xs">
                    {(() => {
                      const addrList = getCustomerAddresses(selectedCustomer)
                      if (addrList.length <= 1) {
                        const currentAddress = addrList[0]
                        if (!currentAddress) return <span>-</span>
                        return (
                          <>
                            <span className="rounded bg-[#edf6ea] px-2 py-0.5 text-[11px] text-[#3d6b4a]">
                              {currentAddress.label}
                            </span>
                            <span className="text-gray-700">{currentAddress.value}</span>
                          </>
                        )
                      }
                      return (
                        <>
                          <Select value={selectedAddrKey} onValueChange={switchAddress}>
                            <SelectTrigger className="h-7 min-w-24 max-w-36 text-xs py-0 px-2 border-[#7d9675] bg-white">
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
                          <span className="min-w-0 flex-1 text-gray-700 break-all">{(form.customer_address as string) ?? '-'}</span>
                          <span className="text-[11px] text-[#3d6b4a]">선택 주소로 송장 출력</span>
                        </>
                      )
                    })()}
                  </div>
                </div>

                <div className="rounded-md bg-white/80 px-3 py-2">
                  <p className="text-[11px] font-medium text-muted-foreground">최근 거래</p>
                  {recentInvoices?.list && recentInvoices.list.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {recentInvoices.list.map((inv) => (
                        <span key={inv.Id} className="rounded-full bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600">
                          {inv.invoice_date?.slice(5, 10)} · {inv.total_amount?.toLocaleString()}원
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">최근 거래 없음</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className={`grid grid-cols-1 gap-3 ${selectedCustomer ? 'md:grid-cols-12' : 'md:grid-cols-3'}`}>
            <div className={selectedCustomer ? 'md:col-span-2' : ''}>
              <Label className="text-xs">구분</Label>
              <Select
                value={normalizeReceiptType(form.receipt_type as string | undefined)}
                onValueChange={(v) => { setForm((f) => ({ ...f, receipt_type: normalizeReceiptType(v) })); setIsDirty(true) }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECEIPT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={selectedCustomer ? 'md:col-span-2' : ''}>
              <Label className="text-xs">전잔액</Label>
              <Input
                type="number"
                value={form.previous_balance ?? 0}
                onChange={(e) => { setForm((f) => ({ ...f, previous_balance: sanitizeAmount(e.target.value) })); setIsDirty(true) }}
                className="mt-1"
              />
            </div>
            {selectedCustomer && (
              <div className="md:col-span-3">
                <Label className="text-xs">예치금 사용</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={maxDepositApplicable}
                    value={depositUseAmount || ''}
                    onChange={(e) => {
                      const nextValue = sanitizeAmount(e.target.value)
                      setDepositUseAmount(Math.min(nextValue, maxDepositApplicable))
                      setIsDirty(true)
                    }}
                    placeholder="0"
                    className="min-w-0 flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 shrink-0 px-3 text-xs"
                    disabled={maxDepositApplicable <= 0}
                    onClick={() => {
                      setDepositUseAmount(maxDepositApplicable)
                      setIsDirty(true)
                    }}
                  >
                    전액
                  </Button>
                </div>
              </div>
            )}
            <div className={selectedCustomer ? 'md:col-span-5' : ''}>
              <Label className="text-xs">출력 비고</Label>
              <Textarea
                value={getDisplayMemo(form.memo as string | undefined)}
                onChange={(e) => { setForm((f) => ({ ...f, memo: e.target.value })); setIsDirty(true) }}
                placeholder="거래명세표에 출력할 안내만 입력"
                className="mt-1 min-h-20 resize-y whitespace-pre-wrap"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                거래명세표 미리보기와 인쇄물에 그대로 표시됩니다.
              </p>
            </div>
          </div>

          {selectedCustomer && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-md border bg-[#f7faf6] px-3 py-2">
                <p className="text-xs text-muted-foreground">사용 가능 예치금</p>
                <p className="mt-1 text-sm font-semibold text-emerald-700">{availableDeposit.toLocaleString()}원</p>
              </div>
              <div className="rounded-md border bg-gray-50 px-3 py-2">
                <p className="text-xs text-muted-foreground">예치금 반영 후 명세표 잔액</p>
                <p className={`mt-1 text-sm font-semibold ${curBal > 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {curBal.toLocaleString()}원
                </p>
                {prevBal > 0 && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    전잔액 포함 참고 {statementBalance.toLocaleString()}원
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="rounded-lg border bg-[#fcfcfb] p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">내부 관리 메모</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  거래명세표에는 출력되지 않고 CRM 안에서만 확인합니다.
                </p>
              </div>
              {paymentDueDate && (
                <span className="rounded-full bg-[#f7f5ef] px-2.5 py-1 text-[11px] font-medium text-[#836b2c]">
                  납부 예정 {paymentDueDate}
                </span>
              )}
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_420px]">
              <div>
                <Label className="text-xs">내부 메모</Label>
                <Textarea
                  value={internalMemo}
                  onChange={(event) => {
                    setInternalMemo(event.target.value)
                    setIsDirty(true)
                  }}
                  placeholder="후불 결제 약속, 통화 내용, 정산 특이사항 등을 기록"
                  className="mt-1 min-h-24 resize-y"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">납부 예정일</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={paymentDueDate}
                    onChange={(event) => {
                      const nextDate = event.target.value
                      setPaymentDueDate(nextDate)
                      if (nextDate) setPaymentReminderEnabled(true)
                      else setPaymentReminderEnabled(false)
                      setIsDirty(true)
                    }}
                    placeholder="YYYY-MM-DD"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">예정 금액</Label>
                  <Input
                    type="number"
                    value={paymentDueAmount || ''}
                    onChange={(event) => {
                      setPaymentDueAmount(sanitizeAmount(event.target.value))
                      setIsDirty(true)
                    }}
                    placeholder={curBal > 0 ? `${curBal.toLocaleString()}원` : '0'}
                    className="mt-1"
                  />
                </div>
                <label className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={paymentReminderEnabled}
                    onChange={(event) => {
                      setPaymentReminderEnabled(event.target.checked)
                      setIsDirty(true)
                    }}
                    disabled={!paymentDueDate}
                    className="h-4 w-4 accent-[#7d9675]"
                  />
                  <span className={paymentDueDate ? 'text-foreground' : 'text-muted-foreground'}>
                    PRESSCO21 운영실 알림
                  </span>
                </label>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-muted-foreground">
              저장하면 납부 예정일 당일 오전 9시에 운영실 텔레그램 알림이 한 번만 발송됩니다. 예정일을 비우면 기존 예약은 취소 요청됩니다.
            </p>
          </div>

          <Separator />

          {/* ─── 품목 테이블 ─── */}
          <div>
            <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <span className="text-sm font-medium">
                  품목 목록 <span className="text-muted-foreground font-normal text-xs">({items.length}개)</span>
                </span>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  품목명 자동완성을 고르면 고객 단가가 들어가고, 과세 상태는 현재 행 기준으로 유지됩니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setProductPickerRowKey(null); setProductPickerOpen(true) }}
                  className="gap-1 text-xs h-8"
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  목록에서 선택
                </Button>
                <Button size="sm" variant="outline" onClick={addItem} className="h-8" title="행 추가 (Alt+Enter)">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  행 추가
                  <kbd className="ml-1 text-[10px] opacity-50 font-sans">Alt+↵</kbd>
                </Button>
              </div>
            </div>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full table-fixed text-sm">
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
                            ref={(el) => { productInputRefs.current[row._key] = el }}
                            value={productInputs[row._key] ?? row.product_name}
                            onChange={(e) => {
                              const v = e.target.value
                              setProductInputs((prev) => ({ ...prev, [row._key]: v }))
                              updateItem(row._key, { product_name: v })
                              setActiveProductKey(row._key)
                              setShowProductDrop(row._key)
                              setDropdownIdx(-1)
                            }}
                            onFocus={() => {
                              setActiveProductKey(row._key)
                              if ((productInputs[row._key] ?? row.product_name).length >= 1) {
                                setShowProductDrop(row._key)
                              }
                            }}
                            onBlur={() => { setShowProductDrop(null); setDropdownIdx(-1) }}
                            onKeyDown={(e) => {
                              const list = productSearchResult?.list ?? []
                              if (showProductDrop === row._key && list.length > 0) {
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault()
                                  setDropdownIdx((i) => Math.min(i + 1, list.length - 1))
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault()
                                  setDropdownIdx((i) => Math.max(i - 1, 0))
                                } else if (e.key === 'Enter') {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  selectProduct(row._key, list[Math.max(dropdownIdx, 0)])
                                } else if (e.key === 'Tab') {
                                  setShowProductDrop(null)
                                  setDropdownIdx(-1)
                                }
                              } else if (e.key === 'Enter') {
                                // 드롭다운 없을 때 Enter → 수량으로 포커스
                                e.preventDefault()
                                e.stopPropagation()
                                qtyInputRefs.current[row._key]?.focus()
                                qtyInputRefs.current[row._key]?.select()
                              }
                            }}
                            placeholder="품목명 검색 (자동완성)"
                            className="h-7 text-sm border-0 focus-visible:ring-1"
                          />
                          {/* 드롭다운은 portal로 body에 렌더링 (테이블 overflow 밖) */}
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
                          tabIndex={-1}
                          value={row.unit}
                          onChange={(e) => updateItem(row._key, { unit: e.target.value })}
                          className="h-7 text-xs text-center border-0 focus-visible:ring-1 w-12"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          ref={(el) => { qtyInputRefs.current[row._key] = el }}
                          type="number"
                          value={row.quantity}
                          onChange={(e) => updateItemQuantity(row._key, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                              e.preventDefault()
                              e.stopPropagation()
                              focusUnitPrice(row._key)
                            }
                          }}
                          className="h-7 text-xs text-right border-0 focus-visible:ring-1"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          ref={(el) => { unitPriceInputRefs.current[row._key] = el }}
                          type="number"
                          value={row.unit_price}
                          onChange={(e) => updateItem(row._key, { unit_price: sanitizeAmount(e.target.value), _totalUnit: undefined })}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                              e.preventDefault()
                              e.stopPropagation()
                              focusNextProductRow(row._key)
                            }
                          }}
                          className="h-7 text-xs text-right border-0 focus-visible:ring-1"
                        />
                      </td>
                      <td className="px-2 py-1 text-right text-xs tabular-nums">
                        {row.supply_amount.toLocaleString()}
                      </td>
                      <td className="px-1 py-1 text-center">
                        <input
                          tabIndex={-1}
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
                          tabIndex={-1}
                          type="number"
                          value={row.supply_amount + row.tax_amount || ''}
                          onChange={(e) => updateItemFromTotal(row._key, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                              e.preventDefault()
                              e.stopPropagation()
                              addItem()
                            }
                          }}
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

          {/* ─── 할인 + 합계 ─── */}
          <div className="rounded-lg border bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-medium">DC 할인</p>
                <p className="text-[11px] text-muted-foreground">
                  {defaultDiscountRate > 0
                    ? isDiscountManual
                      ? `고객 기본 할인율 ${defaultDiscountRate}%에서 건별 DC로 조정 중입니다.`
                      : `고객 기본 할인율 ${defaultDiscountRate}%가 자동 반영됩니다.`
                    : '합계에서 바로 차감되며, 명세표별로 원하는 금액을 직접 입력할 수 있습니다.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {defaultDiscountRate > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsDiscountManual(false)
                      setManualDiscountAmount(suggestedDiscountAmount)
                      setIsDirty(true)
                    }}
                  >
                    기본값 적용
                  </Button>
                )}
                <Input
                  aria-label="DC 할인 금액"
                  type="number"
                  value={discountAmount || ''}
                  onChange={(e) => {
                    setManualDiscountAmount(clampDiscountAmount(sanitizeAmount(e.target.value), invoiceSubtotal))
                    setIsDiscountManual(true)
                    setIsDirty(true)
                  }}
                  placeholder="0"
                  className="w-36 text-right"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="bg-gray-50 rounded-md p-3 text-sm">
              <div className="text-xs text-muted-foreground mb-1">공급가액</div>
              <div className="text-lg font-bold">{supplyTotal.toLocaleString()}원</div>
            </div>
            <div className="bg-gray-50 rounded-md p-3 text-sm">
              <div className="text-xs text-muted-foreground mb-1">세액</div>
              <div className="text-lg font-bold">{taxTotal.toLocaleString()}원</div>
            </div>
            <div className="bg-gray-50 rounded-md p-3 text-sm">
              <div className="text-xs text-muted-foreground mb-1">DC 할인</div>
              <div className="text-lg font-bold text-amber-700">- {discountAmount.toLocaleString()}원</div>
            </div>
            <div className="bg-[#e8f0e8] rounded-md p-3 text-sm">
              <div className="text-xs text-muted-foreground mb-1">최종 합계금액</div>
              <div className="text-lg font-bold text-[#3d6b4a]">
                {grandTotal.toLocaleString()}원
              </div>
            </div>
          </div>

          {/* ─── 입금 + 미수금 ─── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-lg border bg-white p-4">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium">입금 처리</p>
                  <p className="text-[11px] text-muted-foreground">
                    실제 받은 금액과 수단만 입력하면 잔액은 오른쪽에서 자동 계산됩니다.
                  </p>
                </div>
                {selectedCustomer && appliedDeposit > 0 && (
                  <span className="rounded-full bg-[#edf6ea] px-2.5 py-1 text-[11px] text-[#3d6b4a]">
                    예치금 {appliedDeposit.toLocaleString()}원 사용 중
                  </span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-xs">입금액</Label>
                  <Input
                    type="number"
                    max={grandTotal}
                    value={form.paid_amount ?? 0}
                    onChange={(e) => {
                      const nextPaidAmount = sanitizeAmount(e.target.value)
                      setForm((f) => ({ ...f, paid_amount: nextPaidAmount }))
                      setDepositUseAmount((prev) => Math.min(prev, Math.max(0, grandTotal - nextPaidAmount)))
                      setIsDirty(true)
                    }}
                    className="mt-1"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    초과 입금은 수금 관리에서 예치금으로 분리 처리합니다.
                  </p>
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

            <div className="rounded-lg border bg-gray-50 p-4">
              <p className="text-sm font-medium">잔액 계산</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                이번 출고액에서 입금액과 예치금 사용액을 차감한 명세표 잔액입니다. 전잔액은 참고로만 표시합니다.
              </p>

              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
                  <span className="text-xs text-muted-foreground">전잔액(참고)</span>
                  <span>{prevBal.toLocaleString()}원</span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
                  <span className="text-xs text-muted-foreground">이번 출고액</span>
                  <span>+ {grandTotal.toLocaleString()}원</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
                    <span className="text-xs text-muted-foreground">DC 할인 반영</span>
                    <span className="text-amber-700">- {discountAmount.toLocaleString()}원</span>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
                  <span className="text-xs text-muted-foreground">입금액</span>
                  <span>- {paidAmt.toLocaleString()}원</span>
                </div>
                {selectedCustomer && (
                  <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
                    <span className="text-xs text-muted-foreground">예치금 사용</span>
                    <span>- {appliedDeposit.toLocaleString()}원</span>
                  </div>
                )}
                <div className={`rounded-md px-3 py-3 ${curBal > 0 ? 'bg-[#fff1f2]' : 'bg-[#edf6ea]'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">이번 명세표 잔액</span>
                    <span className={`text-lg font-bold ${curBal > 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {curBal.toLocaleString()}원
                    </span>
                  </div>
                  <p className={`mt-1 text-[11px] ${curBal > 0 ? 'text-red-500' : 'text-green-700/80'}`}>
                    {curBal > 0 ? '미수금이 남아 있습니다.' : '즉시 정산 가능한 상태입니다.'}
                  </p>
                  {prevBal > 0 && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      전잔액 포함 참고 잔액 {statementBalance.toLocaleString()}원
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ─── 액션 버튼 ─── */}
          <div className="sticky bottom-0 -mx-6 mt-2 border-t bg-white/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/85">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
                <p className="text-[11px] text-muted-foreground">
                  단축키: Ctrl+Enter 저장 / Esc 닫기
                </p>
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={previewDocumentType}
                    onValueChange={(value) => setPreviewDocumentType(value as PrintDocumentType)}
                  >
                    <SelectTrigger className="h-9 w-[132px] text-xs">
                      <SelectValue placeholder="출력 양식" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRINT_DOCUMENT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={handlePreview} className="gap-1">
                    <Printer className="h-4 w-4" />
                    {previewDocumentLabel} 미리보기
                  </Button>
                  {isNew && !isCopy && (
                    <Button size="sm" variant="ghost" onClick={handleSaveDraft} className="text-muted-foreground">
                      임시저장
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose} disabled={isSaving}>
                  취소
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="min-w-28 bg-[#7d9675] hover:bg-[#6a8462] text-white"
                >
                  {saveButtonLabel}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* 상품 자동완성 드롭다운 (body portal — onOpenChange에서 닫힘 억제) */}
    {showProductDrop && dropdownPos && productSearchResult?.list && productSearchResult.list.length > 0 && createPortal(
      <div
        ref={dropdownContainerRef}
        className="fixed bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto"
        style={{
          ...(dropdownPos.top != null ? { top: dropdownPos.top } : { bottom: dropdownPos.bottom }),
          left: dropdownPos.left, width: dropdownPos.width, zIndex: 99999, pointerEvents: 'auto',
        }}
        onMouseDown={(e) => e.preventDefault()}
        onWheel={(e) => {
          e.stopPropagation()
          if (dropdownContainerRef.current) {
            dropdownContainerRef.current.scrollTop += e.deltaY
          }
        }}
      >
        {productSearchResult.list.map((p, index) => {
          const price = getPriceForCustomer(p, selectedCustomer)
          const isActive = index === dropdownIdx
          return (
            <button
              key={p.Id}
              type="button"
              className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 ${
                isActive ? 'bg-[#f0f4f0] text-[#3d6b4a] font-medium' : 'hover:bg-gray-50'
              }`}
              onMouseEnter={() => setDropdownIdx(index)}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (showProductDrop) selectProduct(showProductDrop, p)
              }}
            >
              <span className="flex-1 truncate">
                {p.name}
                {p.category && <span className="text-[10px] text-muted-foreground ml-1">({p.category})</span>}
              </span>
              <span className="flex items-center gap-1.5 flex-none">
                {p.product_code && (
                  <span className="bg-gray-100 text-gray-500 px-1 py-0.5 rounded text-[10px] font-mono">{p.product_code}</span>
                )}
                <span className={isActive ? 'text-[#3d6b4a]' : 'text-muted-foreground'}>{price.toLocaleString()}원</span>
              </span>
            </button>
          )
        })}
      </div>,
      document.body
    )}

    {/* 품목 선택 모달 */}
    <ProductPickerDialog
      open={productPickerOpen}
      customer={selectedCustomer}
      multiSelect={!productPickerRowKey}
      onClose={() => setProductPickerOpen(false)}
      onSelect={handleProductPicked}
      onMultiSelect={handleMultiPicked}
    />

    {/* ─── 인쇄 미리보기 모달 ─── */}
    {previewOpen && (
        <Dialog open onOpenChange={(v) => { if (!v) closePreview() }}>
        <DialogContent showCloseButton={false} className="max-w-3xl w-full p-0 gap-0 overflow-hidden" style={{ maxHeight: '95vh' }}>
          <DialogHeader className="px-4 py-3 border-b bg-gray-50 flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Printer className="h-4 w-4 text-[#7d9675]" />
              {previewDocumentLabel} 미리보기
              <span className="text-xs font-normal text-muted-foreground">로고·도장 포함 여부를 확인 후 인쇄하세요</span>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-[#7d9675] hover:bg-[#6a8462] text-white gap-1"
                onClick={handlePrintFromPreview}
              >
                <Printer className="h-3.5 w-3.5" />
                인쇄
              </Button>
              <Button size="sm" variant="ghost" onClick={closePreview}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="overflow-auto bg-gray-100" style={{ maxHeight: 'calc(95vh - 56px)' }}>
            <iframe
              ref={previewIframeRef}
              src={previewUrl}
              title="인쇄 미리보기"
              style={{
                display: 'block',
                width: '210mm',
                height: `${previewPages * 297}mm`,
                border: 'none',
                margin: '16px auto',
                boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                background: '#fff',
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    )}
    </>
  )
}
