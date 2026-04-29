import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, ChevronLeft, ChevronRight, Download, Printer, Copy, Trash2, Pencil, FileText, PackageCheck, CheckSquare, ReceiptText, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { InvoiceDialog } from '@/components/InvoiceDialog'
import { TaxInvoiceRequestDialog } from '@/components/TaxInvoiceRequestDialog'
import { TransactionDetailDialog } from '@/components/TransactionDetailDialog'
import type { TransactionPreview } from '@/components/TransactionDetailDialog'
import { getAllCustomers, getAllInvoices, getCustomerAddressEntries, getCustomerAddressValueByKey, getInvoice, getItems, deleteInvoice, bulkDeleteItems, recalcCustomerStats, sanitizeSearchTerm, findCustomerByInvoiceLink, updateInvoice, requestBarobillTaxInvoice, syncBarobillTaxInvoiceStatus, cancelBarobillTaxInvoice } from '@/lib/api'
import type { BarobillTaxInvoiceRequestPayload, Customer, Invoice, InvoiceItem } from '@/lib/api'
import { exportCourierInvoices } from '@/lib/excel'
import { PRINT_DOCUMENT_OPTIONS, printDuplexViaIframe } from '@/lib/print'
import type { PrintDocumentType } from '@/lib/print'
import { buildShipmentConfirmedInvoiceMemo, getDisplayMemo, getInvoiceCustomerAddressKey, getInvoiceDiscountAmount, getInvoiceFulfillmentStatus, isInvoiceRevenueRecognized, parseInvoiceAccountingMeta, serializeInvoiceAccountingMeta, type InvoiceTaxInvoiceMeta, type InvoiceTaxInvoiceStatus } from '@/lib/accountingMeta'
import { DEFAULT_RECEIPT_TYPE } from '@/lib/invoiceDefaults'

const PAGE_SIZE = 25

interface TaxInvoiceDialogData {
  invoice: Invoice
  customer: Customer | null
  items: InvoiceItem[]
}

function isValidCalendarDate(value: string | null): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function getTodayDateString() {
  const now = new Date()
  return formatCalendarDate(now)
}

function formatCalendarDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toLocalDate(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function shiftCalendarDate(dateString: string, offsetDays: number) {
  const nextDate = toLocalDate(dateString)
  nextDate.setDate(nextDate.getDate() + offsetDays)
  return formatCalendarDate(nextDate)
}

function getMonthStartDateString(dateString: string) {
  const currentDate = toLocalDate(dateString)
  return formatCalendarDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1))
}

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState<T>(value)
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return dv
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  paid:    { label: '완납', cls: 'text-green-600' },
  partial: { label: '부분수금', cls: 'text-amber-600' },
  unpaid:  { label: '미수금', cls: 'text-red-600' },
}

function getFulfillmentBadge(invoice: Invoice): { label: string; cls: string } {
  const status = getInvoiceFulfillmentStatus(invoice.memo as string | undefined)
  if (status === 'shipment_confirmed') {
    return { label: '출고확정', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
  }
  if (status === 'preparing') {
    return { label: '출고준비', cls: 'border-amber-200 bg-amber-50 text-amber-700' }
  }
  if (status === 'ordered') {
    return { label: '주문접수', cls: 'border-blue-200 bg-blue-50 text-blue-700' }
  }
  if (status === 'voided') {
    return { label: '취소', cls: 'border-slate-200 bg-slate-50 text-slate-500' }
  }
  return { label: '기존매출', cls: 'border-gray-200 bg-gray-50 text-gray-600' }
}

const TAX_INVOICE_BADGE: Record<InvoiceTaxInvoiceStatus, { label: string; cls: string }> = {
  not_requested: { label: '미요청', cls: 'border-slate-200 bg-slate-50 text-slate-600' },
  requesting: { label: '요청 중', cls: 'border-blue-200 bg-blue-50 text-blue-700' },
  requested: { label: '요청됨', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  issued: { label: '발급완료', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  failed: { label: '실패', cls: 'border-red-200 bg-red-50 text-red-700' },
  cancel_requested: { label: '취소요청', cls: 'border-purple-200 bg-purple-50 text-purple-700' },
  cancelled: { label: '취소완료', cls: 'border-slate-300 bg-slate-100 text-slate-700' },
  amended: { label: '상쇄완료', cls: 'border-slate-300 bg-slate-100 text-slate-700' },
}

function getInvoiceTaxInvoiceStatus(invoice: Invoice): InvoiceTaxInvoiceStatus {
  return parseInvoiceAccountingMeta(invoice.memo as string | undefined).taxInvoiceStatus ?? 'not_requested'
}

function isTaxInvoiceRequestAvailable(status: InvoiceTaxInvoiceStatus): boolean {
  return status === 'not_requested' || status === 'failed'
}

function buildTaxInvoiceIdempotencyKey(invoice: Invoice): string | undefined {
  const invoiceNo = typeof invoice.invoice_no === 'string' ? invoice.invoice_no.trim() : ''
  if (!invoice.Id || !invoiceNo) return undefined
  return `barobill:tax-invoice:pressco21:${invoice.Id}:${invoiceNo}`
}

function getMaskedConfirmNumber(value?: string): string | undefined {
  if (!value) return undefined
  if (value.length <= 8) return value
  return `${value.slice(0, 4)}…${value.slice(-4)}`
}

function isTaxInvoiceCancelAvailable(status: InvoiceTaxInvoiceStatus): boolean {
  return status === 'requested' || status === 'issued' || status === 'cancel_requested'
}

function isTaxInvoiceTerminalCancellationStatus(status: InvoiceTaxInvoiceStatus): boolean {
  return status === 'cancelled' || status === 'amended'
}

function getTaxInvoiceCancelLabel(invoice: Invoice): string {
  const meta = parseInvoiceAccountingMeta(invoice.memo as string | undefined)
  const taxInvoice = meta.taxInvoice
  if (meta.taxInvoiceStatus === 'cancel_requested') return '취소/상쇄 재시도'
  if (taxInvoice?.ntsSendState === 1 || taxInvoice?.ntsSendState === 2) return '발급취소'
  if (taxInvoice?.ntsConfirmNum || taxInvoice?.ntsSendState === 4) return '수정세금계산서 상쇄'
  if (taxInvoice?.ntsSendState === 3) return '상쇄 대기 등록'
  return '취소/상쇄 요청'
}

function getTaxInvoiceSummary(invoice: Invoice): { status: InvoiceTaxInvoiceStatus; label: string; cls: string; detail?: string } {
  const meta = parseInvoiceAccountingMeta(invoice.memo as string | undefined)
  const status = meta.taxInvoiceStatus ?? 'not_requested'
  const badge = TAX_INVOICE_BADGE[status]
  const ntsConfirmNum = getMaskedConfirmNumber(meta.taxInvoice?.ntsConfirmNum)
  if (status === 'issued' && ntsConfirmNum) {
    return { status, ...badge, detail: `승인 ${ntsConfirmNum}` }
  }
  if (status === 'failed') {
    return { status, ...badge, detail: meta.taxInvoice?.errorMessage ?? meta.taxInvoice?.statusMessage ?? '오류 확인 필요' }
  }
  if (meta.taxInvoice?.statusMessage && status !== 'not_requested') {
    return { status, ...badge, detail: meta.taxInvoice.statusMessage }
  }
  return { status, ...badge }
}

function formatAmount(value?: number | null) {
  if (value == null) return '-'
  return `${value.toLocaleString()}원`
}

function getOutstandingAmount(invoice: Invoice) {
  const totalAmount = Number(invoice.total_amount ?? 0)
  const paidAmount = Number(invoice.paid_amount ?? 0)
  return Math.max(totalAmount - paidAmount, 0)
}

function isShipmentConfirmable(invoice: Invoice): boolean {
  return getInvoiceFulfillmentStatus(invoice.memo as string | undefined) !== 'shipment_confirmed'
}

function getCustomerPrimaryPhone(customer: Customer | null | undefined): string {
  return (customer?.mobile ?? customer?.phone1 ?? customer?.phone ?? '') as string
}

function getCustomerAddressKeys(customer: Customer | null | undefined): string[] {
  return getCustomerAddressEntries(customer).map((entry) => entry.key)
}

function getCustomerAddressExactByKey(customer: Customer | null | undefined, addressKey?: string): string | undefined {
  if (!addressKey) return undefined
  return getCustomerAddressEntries(customer).find((entry) => entry.key === addressKey)?.value
}

function getCustomerAddressByKey(customer: Customer | null | undefined, addressKey?: string): string {
  if (!customer) return ''
  const exactAddress = getCustomerAddressExactByKey(customer, addressKey)
  if (exactAddress) {
    return exactAddress
  }
  const keys = getCustomerAddressKeys(customer)
  if (keys.length === 0) return ''
  return getCustomerAddressValueByKey(customer, keys[0])
}

function hasCustomerAddressKey(customer: Customer | null | undefined, addressKey?: string): boolean {
  if (!addressKey) return true
  return getCustomerAddressKeys(customer).includes(addressKey)
}

function normalizeSnapshotValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function getStoredInvoiceAddressKey(invoice: Partial<Invoice> | null | undefined): string | undefined {
  return normalizeSnapshotValue(invoice?.customer_address_key)
    ?? getInvoiceCustomerAddressKey(typeof invoice?.memo === 'string' ? invoice.memo : undefined)
}

function mergeInvoiceSnapshot(
  primary: Partial<Invoice> | null | undefined,
  fallback: Partial<Invoice> | null | undefined,
): Partial<Invoice> {
  return {
    ...(fallback ?? {}),
    ...(primary ?? {}),
    customer_name: primary?.customer_name ?? fallback?.customer_name,
    customer_phone: primary?.customer_phone ?? fallback?.customer_phone,
    customer_address: primary?.customer_address ?? fallback?.customer_address,
    customer_address_key: primary?.customer_address_key ?? fallback?.customer_address_key,
    customer_bizno: primary?.customer_bizno ?? fallback?.customer_bizno,
    customer_ceo_name: primary?.customer_ceo_name ?? fallback?.customer_ceo_name,
    customer_biz_type: primary?.customer_biz_type ?? fallback?.customer_biz_type,
    customer_biz_item: primary?.customer_biz_item ?? fallback?.customer_biz_item,
  }
}

function resolveInvoiceCustomerSnapshot(
  invoice: Partial<Invoice> | null | undefined,
  customer: Customer | null | undefined,
): Partial<Invoice> {
  const storedAddress = normalizeSnapshotValue(invoice?.customer_address)
  const storedAddressKey = getStoredInvoiceAddressKey(invoice)
  const storedPhone = normalizeSnapshotValue(invoice?.customer_phone)
  const storedBizNo = normalizeSnapshotValue(invoice?.customer_bizno)
  const storedCeoName = normalizeSnapshotValue(invoice?.customer_ceo_name)
  const storedBizType = normalizeSnapshotValue(invoice?.customer_biz_type)
  const storedBizItem = normalizeSnapshotValue(invoice?.customer_biz_item)
  const storedCustomerName = normalizeSnapshotValue(invoice?.customer_name)
  const selectedAddress = storedAddressKey
    ? normalizeSnapshotValue(getCustomerAddressExactByKey(customer, storedAddressKey))
    : undefined

  const resolvedAddress = storedAddressKey && storedAddressKey !== 'address1'
    ? selectedAddress ?? storedAddress ?? getCustomerAddressByKey(customer)
    : storedAddress ?? selectedAddress ?? getCustomerAddressByKey(customer)

  return {
    customer_name: storedCustomerName ?? customer?.name,
    customer_phone: storedPhone ?? getCustomerPrimaryPhone(customer),
    customer_address: resolvedAddress,
    customer_address_key: storedAddressKey,
    customer_bizno: storedBizNo ?? normalizeSnapshotValue(customer?.biz_no) ?? normalizeSnapshotValue(customer?.business_no),
    customer_ceo_name: storedCeoName ?? normalizeSnapshotValue(customer?.ceo_name),
    customer_biz_type: storedBizType ?? normalizeSnapshotValue(customer?.biz_type) ?? normalizeSnapshotValue(customer?.business_type),
    customer_biz_item: storedBizItem ?? normalizeSnapshotValue(customer?.biz_item) ?? normalizeSnapshotValue(customer?.business_item),
  }
}

export function Invoices() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const today = useMemo(() => getTodayDateString(), [])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState(() => {
    const date = searchParams.get('date')
    const from = searchParams.get('from')
    if (isValidCalendarDate(date)) return date
    return isValidCalendarDate(from) ? from : getTodayDateString()
  })
  const [dateTo, setDateTo] = useState(() => {
    const date = searchParams.get('date')
    const to = searchParams.get('to')
    if (isValidCalendarDate(date)) return date
    return isValidCalendarDate(to) ? to : getTodayDateString()
  })
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined)
  const [copySourceId, setCopySourceId] = useState<number | undefined>(undefined)
  const [initialInvoiceDate, setInitialInvoiceDate] = useState<string | undefined>(undefined)
  const [initialCustomerId, setInitialCustomerId] = useState<number | undefined>(undefined)
  const [initialCustomerName, setInitialCustomerName] = useState<string | undefined>(undefined)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionPreview | null>(null)
  const [isCourierExporting, setIsCourierExporting] = useState(false)
  const [showCourierConfirm, setShowCourierConfirm] = useState(false)
  const [printDialogInvoice, setPrintDialogInvoice] = useState<Invoice | null>(null)
  const [printDocumentType, setPrintDocumentType] = useState<PrintDocumentType>('invoice')
  const [taxInvoiceDialogData, setTaxInvoiceDialogData] = useState<TaxInvoiceDialogData | null>(null)
  const [taxInvoiceDetailInvoice, setTaxInvoiceDetailInvoice] = useState<Invoice | null>(null)
  const [loadingTaxInvoiceId, setLoadingTaxInvoiceId] = useState<number | null>(null)
  const [requestingTaxInvoiceId, setRequestingTaxInvoiceId] = useState<number | null>(null)
  const [syncingTaxInvoiceId, setSyncingTaxInvoiceId] = useState<number | null>(null)
  const [cancellingTaxInvoiceId, setCancellingTaxInvoiceId] = useState<number | null>(null)
  const [confirmingShipmentId, setConfirmingShipmentId] = useState<number | null>(null)
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<Set<number>>(() => new Set())
  const [isBulkShipmentConfirming, setIsBulkShipmentConfirming] = useState(false)
  const didInitDateSyncRef = useRef(false)

  const debouncedSearch = useDebounce(search, 400)
  useEffect(() => setPage(1), [debouncedSearch, statusFilter, dateFrom, dateTo])

  useEffect(() => {
    const nextDate = searchParams.get('date')
    const nextFrom = searchParams.get('from')
    const nextTo = searchParams.get('to')
    const normalizedDate = isValidCalendarDate(nextDate) ? nextDate : ''
    const hasExplicitDateParam = Boolean(normalizedDate || isValidCalendarDate(nextFrom) || isValidCalendarDate(nextTo))
    const normalizedFrom = normalizedDate || (isValidCalendarDate(nextFrom) ? nextFrom : today)
    const normalizedTo = normalizedDate || (isValidCalendarDate(nextTo) ? nextTo : today)

    if (!didInitDateSyncRef.current) {
      setDateFrom((prev) => (prev === normalizedFrom ? prev : normalizedFrom))
      setDateTo((prev) => (prev === normalizedTo ? prev : normalizedTo))
      didInitDateSyncRef.current = true
    } else if (hasExplicitDateParam) {
      setDateFrom((prev) => (prev === normalizedFrom ? prev : normalizedFrom))
      setDateTo((prev) => (prev === normalizedTo ? prev : normalizedTo))
    }

    const editParam = searchParams.get('edit')
    const editId = editParam ? Number(editParam) : NaN
    if (Number.isFinite(editId) && editId > 0) {
      setSelectedId(editId)
      setCopySourceId(undefined)
      setInitialInvoiceDate(undefined)
      setDialogOpen(true)

      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('edit')
      setSearchParams(nextParams, { replace: true })
      return
    }

    if (searchParams.get('new') === '1') {
      const initialCustomerParam = Number(searchParams.get('customerId'))
      const nextCustomerId = Number.isFinite(initialCustomerParam) && initialCustomerParam > 0
        ? initialCustomerParam
        : undefined
      const nextCustomerName = searchParams.get('customerName')?.trim() || undefined
      setSelectedId(undefined)
      setCopySourceId(undefined)
      setInitialInvoiceDate(normalizedDate || normalizedFrom || undefined)
      setInitialCustomerId(nextCustomerId)
      setInitialCustomerName(nextCustomerName)
      setDialogOpen(true)

      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('new')
      nextParams.delete('customerId')
      nextParams.delete('customerName')
      setSearchParams(nextParams, { replace: true })
    }
  }, [searchParams, setSearchParams, today])

  const params: Record<string, string | number> = {
    sort: '-invoice_date',
  }
  const conditions: string[] = []
  if (debouncedSearch) {
    const safe = sanitizeSearchTerm(debouncedSearch)
    conditions.push(`(customer_name,like,%${safe}%)`)
  }
  if (statusFilter !== 'ALL') conditions.push(`(payment_status,eq,${statusFilter})`)
  if (conditions.length > 0) {
    params.where = conditions.length === 1 ? conditions[0] : conditions.join('~and')
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['invoices', params],
    queryFn: () => getAllInvoices(params),
    placeholderData: (prev) => prev,
  })
  const { data: customersForLink = [] } = useQuery({
    queryKey: ['invoice-link-customers'],
    queryFn: () => getAllCustomers({
      fields: 'Id,name,book_name,legacy_id,mobile,phone1,address1,address2,extra_addresses',
    }),
    staleTime: 10 * 60 * 1000,
  })
  const customerById = useMemo(
    () => new Map(customersForLink.map((customer) => [customer.Id, customer])),
    [customersForLink],
  )

  const filteredInvoices = useMemo(
    () => (data ?? []).filter((invoice) => {
      const invoiceDate = invoice.invoice_date?.slice(0, 10) ?? ''
      if (dateFrom && invoiceDate < dateFrom) return false
      if (dateTo && invoiceDate > dateTo) return false
      return true
    }),
    [data, dateFrom, dateTo],
  )
  const periodSalesAmount = useMemo(
    () => filteredInvoices
      .filter(isInvoiceRevenueRecognized)
      .reduce((sum, invoice) => sum + Number(invoice.total_amount ?? 0), 0),
    [filteredInvoices],
  )
  const recognizedInvoiceCount = useMemo(
    () => filteredInvoices.filter(isInvoiceRevenueRecognized).length,
    [filteredInvoices],
  )
  const periodAverageAmount = useMemo(
    () => (recognizedInvoiceCount > 0 ? Math.round(periodSalesAmount / recognizedInvoiceCount) : 0),
    [recognizedInvoiceCount, periodSalesAmount],
  )
  const courierWarning = useMemo(() => {
    let missingAddress = 0
    let missingPhone = 0
    for (const invoice of filteredInvoices) {
      const linkedCustomer = typeof invoice.customer_id === 'number' ? customerById.get(invoice.customer_id) : undefined
      const resolvedSnapshot = resolveInvoiceCustomerSnapshot(invoice, linkedCustomer)
      const hasAddress = Boolean(normalizeSnapshotValue(resolvedSnapshot.customer_address))
      const hasPhone = Boolean(normalizeSnapshotValue(resolvedSnapshot.customer_phone))
      if (!hasAddress) missingAddress += 1
      if (!hasPhone) missingPhone += 1
    }
    return {
      missingAddress,
      missingPhone,
      totalMissing: Math.max(missingAddress, 0) + Math.max(missingPhone, 0),
    }
  }, [customerById, filteredInvoices])

  const totalRows = filteredInvoices.length
  const totalPages = Math.ceil(totalRows / PAGE_SIZE)
  const invoices = filteredInvoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const currentPageConfirmableInvoices = useMemo(
    () => invoices.filter(isShipmentConfirmable),
    [invoices],
  )
  const selectedShipmentInvoices = useMemo(
    () => filteredInvoices.filter((invoice) => selectedShipmentIds.has(invoice.Id) && isShipmentConfirmable(invoice)),
    [filteredInvoices, selectedShipmentIds],
  )
  const selectedShipmentAmount = useMemo(
    () => selectedShipmentInvoices.reduce((sum, invoice) => sum + Number(invoice.total_amount ?? 0), 0),
    [selectedShipmentInvoices],
  )
  const allCurrentPageShipmentSelected = currentPageConfirmableInvoices.length > 0
    && currentPageConfirmableInvoices.every((invoice) => selectedShipmentIds.has(invoice.Id))

  useEffect(() => {
    setSelectedShipmentIds((prev) => {
      if (prev.size === 0) return prev
      const validIds = new Set(filteredInvoices.filter(isShipmentConfirmable).map((invoice) => invoice.Id))
      const next = new Set([...prev].filter((id) => validIds.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [filteredInvoices])
  const quickDateRanges = useMemo(
    () => [
      { key: 'today', label: '오늘', from: today, to: today },
      { key: 'recentWeek', label: '최근 7일', from: shiftCalendarDate(today, -6), to: today },
      { key: 'thisMonth', label: '이번달', from: getMonthStartDateString(today), to: today },
    ],
    [today],
  )
  const activeQuickRange = quickDateRanges.find((range) => range.from === dateFrom && range.to === dateTo)?.key ?? null
  const hasActiveFilters = statusFilter !== 'ALL' || Boolean(search.trim()) || dateFrom !== today || dateTo !== today
  const hasDetailFilters = statusFilter !== 'ALL' || Boolean(search.trim())
  const invoiceLinkSummary = useMemo(() => {
    let orphanCount = 0
    let splitCount = 0
    for (const invoice of filteredInvoices) {
      const linkedCustomer = typeof invoice.customer_id === 'number' ? customerById.get(invoice.customer_id) : undefined
      const invoiceName = invoice.customer_name?.trim()
      const masterName = linkedCustomer?.name?.trim()
      const masterBookName = linkedCustomer?.book_name?.trim()
      if (typeof invoice.customer_id === 'number' && invoice.customer_id > 0 && !linkedCustomer) {
        orphanCount += 1
        continue
      }
      if (linkedCustomer && invoiceName && invoiceName !== masterName && invoiceName !== masterBookName) {
        splitCount += 1
      }
    }
    return { orphanCount, splitCount }
  }, [filteredInvoices, customerById])

  function applyDateRange(nextFrom: string, nextTo: string) {
    setDateFrom(nextFrom)
    setDateTo(nextTo)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('date')
    if (nextFrom) nextParams.set('from', nextFrom)
    else nextParams.delete('from')
    if (nextTo) nextParams.set('to', nextTo)
    else nextParams.delete('to')
    nextParams.delete('new')
    setSearchParams(nextParams, { replace: true })
  }

  function openCreate(date?: string) {
    setSelectedId(undefined)
    setCopySourceId(undefined)
    setInitialInvoiceDate(date || undefined)
    setInitialCustomerId(undefined)
    setInitialCustomerName(undefined)
    setDialogOpen(true)
  }

  function openEdit(id: number) {
    setSelectedId(id)
    setCopySourceId(undefined)
    setInitialInvoiceDate(undefined)
    setInitialCustomerId(undefined)
    setInitialCustomerName(undefined)
    setDialogOpen(true)
  }

  function openCopy(id: number) {
    setSelectedId(undefined)
    setCopySourceId(id)
    setInitialInvoiceDate(undefined)
    setInitialCustomerId(undefined)
    setInitialCustomerName(undefined)
    setDialogOpen(true)
  }

  function openPrintDialog(inv: Invoice, initialType: PrintDocumentType = 'invoice') {
    setPrintDialogInvoice(inv)
    setPrintDocumentType(initialType)
  }

  async function handleDelete(inv: Invoice) {
    if (!confirm('이 명세표를 삭제하시겠습니까? 삭제 후에는 되돌릴 수 없습니다.')) return
    setDeletingId(inv.Id)
    try {
      // 라인아이템 먼저 삭제
      const itemsData = await getItems(inv.Id)
      const itemIds = itemsData.list.map((it) => it.Id)
      if (itemIds.length > 0) await bulkDeleteItems(itemIds)
      await deleteInvoice(inv.Id)

      // 잔액 재계산
      if (inv.customer_id) {
        try {
          await recalcCustomerStats(inv.customer_id as number)
        } catch {
          // 삭제 자체는 완료됐으므로 통계 재계산 실패는 목록 갱신에서 복구한다.
        }
      }

      toast.success('명세표가 삭제되었습니다')
      // 삭제된 명세표 캐시 제거
      qc.removeQueries({ queryKey: ['invoice', inv.Id] })
      qc.removeQueries({ queryKey: ['invoiceItems', inv.Id] })
      // 관련 목록 전체 갱신
      void refetch()
      qc.invalidateQueries({ queryKey: ['invoices-customer'] })
      qc.invalidateQueries({ queryKey: ['receivables'] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['transactions-crm'] })
      // 대시보드 + 기간 리포트 전체 갱신
      qc.invalidateQueries({
        predicate: (q) => {
          const k = q.queryKey[0]
          return typeof k === 'string' && (k.startsWith('dash-') || k.startsWith('period-') || k.startsWith('calendar-'))
        },
      })
    } catch {
      toast.error('삭제하지 못했습니다. 잠시 후 다시 시도해주세요')
    } finally {
      setDeletingId(null)
    }
  }

  async function runCourierExport() {
    if (filteredInvoices.length === 0) {
      toast.error('다운로드할 명세표가 없습니다')
      return
    }

    setIsCourierExporting(true)
    try {
      const linkedCustomerCache = new Map<number, Customer | null>()
      const rows = await Promise.all(filteredInvoices.map(async (invoice) => {
        const latestInvoice = await getInvoice(invoice.Id)
        const invoiceCustomerId = typeof latestInvoice.customer_id === 'number'
          ? latestInvoice.customer_id
          : typeof invoice.customer_id === 'number'
            ? invoice.customer_id
            : undefined

        const invoiceSnapshot = mergeInvoiceSnapshot(latestInvoice, invoice)
        const storedAddressKey = getStoredInvoiceAddressKey(invoiceSnapshot)

        let linkedCustomer = invoiceCustomerId ? linkedCustomerCache.get(invoiceCustomerId) : undefined
        if (invoiceCustomerId && linkedCustomer === undefined) {
          linkedCustomer = customerById.get(invoiceCustomerId) ?? await findCustomerByInvoiceLink(invoiceCustomerId, latestInvoice.customer_name)
          linkedCustomerCache.set(invoiceCustomerId, linkedCustomer ?? null)
        }
        if (invoiceCustomerId && linkedCustomer && storedAddressKey && !hasCustomerAddressKey(linkedCustomer, storedAddressKey)) {
          const fullCustomer = await findCustomerByInvoiceLink(invoiceCustomerId, latestInvoice.customer_name)
          if (fullCustomer) {
            linkedCustomer = fullCustomer
            linkedCustomerCache.set(invoiceCustomerId, fullCustomer)
          }
        }

        const resolvedSnapshot = resolveInvoiceCustomerSnapshot(
          invoiceSnapshot,
          linkedCustomer,
        )

        return {
          receiverName: resolvedSnapshot.customer_name ?? latestInvoice.customer_name ?? invoice.customer_name ?? '',
          receiverPhone: resolvedSnapshot.customer_phone ?? '',
          receiverMobile: resolvedSnapshot.customer_phone ?? '',
          receiverAddress: resolvedSnapshot.customer_address ?? '',
          quantity: 1,
          deliveryMessage: '',
        }
      }))

      await exportCourierInvoices(rows, {
        filename: '전자송장(3.9)',
        dateLabel: dateFrom && dateTo ? `${dateFrom}_${dateTo}` : undefined,
      })
      toast.success(`전자송장 ${rows.length}건을 다운로드했습니다`)
    } catch {
      toast.error('전자송장 파일을 생성하지 못했습니다')
    } finally {
      setIsCourierExporting(false)
    }
  }

  async function handleCourierExport() {
    if (courierWarning.totalMissing > 0) {
      setShowCourierConfirm(true)
      return
    }
    await runCourierExport()
  }

  async function handlePrint(inv: Invoice, documentType: PrintDocumentType = 'invoice') {
    try {
      const [latestInvoice, itemsData] = await Promise.all([
        getInvoice(inv.Id),
        getItems(inv.Id),
      ])
      let currentCustomer: Customer | null = null
      try {
        currentCustomer = await findCustomerByInvoiceLink(
          Number(latestInvoice.customer_id),
          latestInvoice.customer_name,
        )
      } catch {
        // 고객 링크 복원에 실패해도 명세표에 저장된 snapshot으로 출력한다.
      }
      const customerSnapshot = resolveInvoiceCustomerSnapshot(
        mergeInvoiceSnapshot(latestInvoice, inv),
        currentCustomer,
      )
      printDuplexViaIframe(
        {
          invoice_no: latestInvoice.invoice_no,
          invoice_date: latestInvoice.invoice_date,
          receipt_type: latestInvoice.receipt_type ?? DEFAULT_RECEIPT_TYPE,
          customer_name: customerSnapshot.customer_name ?? latestInvoice.customer_name ?? currentCustomer?.name,
          customer_phone: customerSnapshot.customer_phone ?? (latestInvoice.customer_phone as string),
          customer_address: customerSnapshot.customer_address ?? (latestInvoice.customer_address as string),
          customer_bizno: customerSnapshot.customer_bizno ?? (latestInvoice.customer_bizno as string),
          customer_ceo_name: customerSnapshot.customer_ceo_name ?? (latestInvoice.customer_ceo_name as string),
          customer_biz_type: customerSnapshot.customer_biz_type ?? (latestInvoice.customer_biz_type as string),
          customer_biz_item: customerSnapshot.customer_biz_item ?? (latestInvoice.customer_biz_item as string),
          supply_amount: latestInvoice.supply_amount,
          tax_amount: latestInvoice.tax_amount,
          total_amount: latestInvoice.total_amount,
          discount_amount: getInvoiceDiscountAmount(latestInvoice.memo as string | undefined),
          previous_balance: latestInvoice.previous_balance,
          paid_amount: latestInvoice.paid_amount,
          memo: getDisplayMemo(latestInvoice.memo as string | undefined),
        },
        itemsData.list.map((it) => ({
          product_name: it.product_name,
          unit: it.unit,
          quantity: it.quantity,
          unit_price: it.unit_price,
          supply_amount: it.supply_amount,
          tax_amount: it.tax_amount,
        })),
        { documentType },
      )
    } catch {
      toast.error('인쇄 데이터를 불러오지 못했습니다')
    }
  }

  function invalidateTaxInvoiceViews(invoiceId?: number) {
    void refetch()
    if (invoiceId) {
      qc.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      qc.invalidateQueries({ queryKey: ['invoiceItems', invoiceId] })
    }
    qc.invalidateQueries({ queryKey: ['invoices-customer'] })
    qc.invalidateQueries({ queryKey: ['receivables'] })
    qc.invalidateQueries({ queryKey: ['transactions'] })
    qc.invalidateQueries({ queryKey: ['transactions-crm'] })
  }

  async function loadTaxInvoiceDialogData(inv: Invoice): Promise<TaxInvoiceDialogData> {
    const [latestInvoice, itemsData] = await Promise.all([
      getInvoice(inv.Id),
      getItems(inv.Id),
    ])
    const customerId = typeof latestInvoice.customer_id === 'number'
      ? latestInvoice.customer_id
      : typeof inv.customer_id === 'number'
        ? inv.customer_id
        : undefined
    const linkedCustomer = await findCustomerByInvoiceLink(customerId, latestInvoice.customer_name)
    return {
      invoice: latestInvoice,
      customer: linkedCustomer,
      items: itemsData.list,
    }
  }

  async function openTaxInvoiceRequest(inv: Invoice) {
    const currentStatus = getInvoiceTaxInvoiceStatus(inv)
    if (!isTaxInvoiceRequestAvailable(currentStatus)) {
      setTaxInvoiceDetailInvoice(inv)
      toast.info('이미 요청된 세금계산서입니다. 발급내역을 확인해주세요.')
      return
    }

    setLoadingTaxInvoiceId(inv.Id)
    try {
      const dialogData = await loadTaxInvoiceDialogData(inv)
      const latestStatus = getInvoiceTaxInvoiceStatus(dialogData.invoice)
      if (!isTaxInvoiceRequestAvailable(latestStatus)) {
        setTaxInvoiceDetailInvoice(dialogData.invoice)
        toast.info('최신 상태 기준으로 이미 요청된 세금계산서입니다')
        return
      }
      setTaxInvoiceDialogData(dialogData)
    } catch {
      toast.error('세금계산서 발급 요청 정보를 불러오지 못했습니다')
    } finally {
      setLoadingTaxInvoiceId(null)
    }
  }

  async function handleTaxInvoiceSubmit(payload: BarobillTaxInvoiceRequestPayload) {
    const dialogData = taxInvoiceDialogData
    if (!dialogData) return

    setRequestingTaxInvoiceId(dialogData.invoice.Id)
    try {
      const latestInvoice = await getInvoice(dialogData.invoice.Id)
      const latestMeta = parseInvoiceAccountingMeta(latestInvoice.memo as string | undefined)
      const latestStatus = latestMeta.taxInvoiceStatus ?? 'not_requested'
      if (!isTaxInvoiceRequestAvailable(latestStatus)) {
        toast.error('최신 상태 기준으로 이미 발급 요청된 명세표입니다')
        setTaxInvoiceDialogData(null)
        setTaxInvoiceDetailInvoice(latestInvoice)
        return
      }

      const result = await requestBarobillTaxInvoice(payload)
      const statusCode =
        result.errorCode ??
        (result.barobillResultCode == null ? result.status : String(result.barobillResultCode))
      const nextMemo = serializeInvoiceAccountingMeta(latestInvoice.memo as string | undefined, {
        ...latestMeta,
        taxInvoiceStatus: result.status,
        taxInvoice: {
          ...latestMeta.taxInvoice,
          provider: 'barobill',
          issueType: 'normal',
          mode: result.mode,
          mgtKey: result.mgtKey || result.providerMgtKey,
          idempotencyKey: result.idempotencyKey,
          requestId: result.requestId,
          requestedAt: result.requestedAt ?? latestMeta.taxInvoice?.requestedAt,
          requestedBy: 'crm-admin',
          lastStatusSyncedAt: result.syncedAt ?? result.requestedAt ?? latestMeta.taxInvoice?.lastStatusSyncedAt,
          statusCode,
          barobillResultCode: result.barobillResultCode == null ? undefined : String(result.barobillResultCode),
          statusMessage: result.message,
          errorCode: result.status === 'failed' ? result.errorCode ?? statusCode : undefined,
          errorMessage: result.status === 'failed' ? result.errorMessage ?? result.message : undefined,
          mailSent: payload.sendEmail,
          smsRequested: payload.sendSms,
        },
      })
      const updatedInvoice = await updateInvoice(latestInvoice.Id, { memo: nextMemo })
      setTaxInvoiceDialogData(null)
      setTaxInvoiceDetailInvoice(updatedInvoice)
      invalidateTaxInvoiceViews(updatedInvoice.Id)
      if (result.duplicate) {
        toast.warning('중복 발급 요청이 차단되어 기존 발급내역을 표시합니다')
      } else if (result.status === 'failed') {
        toast.error(result.message)
      } else {
        toast.success('바로빌 테스트 세금계산서 발급 요청을 보냈습니다')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '세금계산서 발급 요청에 실패했습니다'
      toast.error(message)
    } finally {
      setRequestingTaxInvoiceId(null)
    }
  }

  async function handleTaxInvoiceStatusSync(inv: Invoice) {
    setSyncingTaxInvoiceId(inv.Id)
    try {
      const latestInvoice = await getInvoice(inv.Id)
      const latestMeta = parseInvoiceAccountingMeta(latestInvoice.memo as string | undefined)
      const currentStatus = latestMeta.taxInvoiceStatus ?? 'not_requested'
      if (currentStatus === 'not_requested') {
        toast.info('아직 발급 요청 전인 명세표입니다')
        return
      }

      const result = await syncBarobillTaxInvoiceStatus({
        invoiceId: latestInvoice.Id,
        invoiceNo: latestInvoice.invoice_no,
        idempotencyKey: latestMeta.taxInvoice?.idempotencyKey ?? buildTaxInvoiceIdempotencyKey(latestInvoice),
        providerMgtKey: latestMeta.taxInvoice?.mgtKey,
        currentStatus,
      })
      const preserveTerminalCancellation = isTaxInvoiceTerminalCancellationStatus(currentStatus) &&
        (result.status === 'requested' || result.status === 'issued')
      const nextTaxInvoiceStatus = preserveTerminalCancellation ? currentStatus : result.status
      const statusCode = result.statusCode ??
        (result.barobillState != null ? String(result.barobillState) : nextTaxInvoiceStatus)
      const nextMemo = serializeInvoiceAccountingMeta(latestInvoice.memo as string | undefined, {
        ...latestMeta,
        taxInvoiceStatus: nextTaxInvoiceStatus,
        taxInvoice: {
          ...latestMeta.taxInvoice,
          provider: 'barobill',
          issueType: latestMeta.taxInvoice?.issueType ?? 'normal',
          mode: result.mode,
          mgtKey: result.mgtKey ?? result.providerMgtKey ?? latestMeta.taxInvoice?.mgtKey,
          idempotencyKey: result.idempotencyKey ?? latestMeta.taxInvoice?.idempotencyKey ?? buildTaxInvoiceIdempotencyKey(latestInvoice),
          requestId: latestMeta.taxInvoice?.requestId ?? result.requestId,
          lastStatusSyncedAt: result.syncedAt,
          ntsConfirmNum: result.ntsConfirmNum ?? latestMeta.taxInvoice?.ntsConfirmNum,
          issuedAt: nextTaxInvoiceStatus === 'issued'
            ? result.issuedAt ?? latestMeta.taxInvoice?.issuedAt ?? result.syncedAt
            : latestMeta.taxInvoice?.issuedAt,
          statusCode,
          barobillState: result.barobillState,
          ntsSendState: result.ntsSendState,
          statusMessage: preserveTerminalCancellation
            ? latestMeta.taxInvoice?.statusMessage ?? result.message
            : result.message,
          errorCode: nextTaxInvoiceStatus === 'failed' ? result.errorCode ?? statusCode : undefined,
          errorMessage: nextTaxInvoiceStatus === 'failed' ? result.errorMessage ?? result.message : undefined,
        },
      })
      const updatedInvoice = await updateInvoice(latestInvoice.Id, { memo: nextMemo })
      setTaxInvoiceDetailInvoice(updatedInvoice)
      invalidateTaxInvoiceViews(updatedInvoice.Id)
      toast.success('바로빌 세금계산서 상태를 새로고침했습니다')
    } catch (error) {
      const message = error instanceof Error ? error.message : '세금계산서 상태 새로고침에 실패했습니다'
      toast.error(message)
    } finally {
      setSyncingTaxInvoiceId(null)
    }
  }

  async function handleTaxInvoiceCancelRequest(inv: Invoice) {
    const actionLabel = getTaxInvoiceCancelLabel(inv)
    const ok = window.confirm(
      `${actionLabel}을 진행할까요?\n\n` +
      '국세청 전송 전이면 바로빌 발급취소를 실행하고, 국세청 전송 후이면 수정세금계산서 상쇄를 시도합니다.',
    )
    if (!ok) return

    setCancellingTaxInvoiceId(inv.Id)
    try {
      const latestInvoice = await getInvoice(inv.Id)
      const latestMeta = parseInvoiceAccountingMeta(latestInvoice.memo as string | undefined)
      const currentStatus = latestMeta.taxInvoiceStatus ?? 'not_requested'
      const providerMgtKey = latestMeta.taxInvoice?.mgtKey

      if (!isTaxInvoiceCancelAvailable(currentStatus)) {
        toast.info('현재 상태에서는 세금계산서 취소/상쇄를 요청할 수 없습니다')
        return
      }
      if (!providerMgtKey) {
        toast.error('바로빌 관리번호가 없어 취소/상쇄를 요청할 수 없습니다')
        return
      }

      const result = await cancelBarobillTaxInvoice({
        requestId: `barobill-cancel-${latestInvoice.Id}-${Date.now()}`,
        invoiceId: latestInvoice.Id,
        invoiceNo: latestInvoice.invoice_no,
        idempotencyKey: latestMeta.taxInvoice?.idempotencyKey ?? buildTaxInvoiceIdempotencyKey(latestInvoice),
        providerMgtKey,
        mode: latestMeta.taxInvoice?.mode ?? 'test',
        cancelReason: 'CRM 관리자 요청',
        requestedBy: 'crm-admin',
      })
      const statusCode = result.statusCode ??
        (result.barobillState != null ? String(result.barobillState) : result.status)
      const nextMemo = serializeInvoiceAccountingMeta(latestInvoice.memo as string | undefined, {
        ...latestMeta,
        taxInvoiceStatus: result.status,
        taxInvoice: {
          ...latestMeta.taxInvoice,
          provider: 'barobill',
          issueType: latestMeta.taxInvoice?.issueType ?? 'normal',
          mode: result.mode,
          mgtKey: result.mgtKey ?? result.providerMgtKey ?? latestMeta.taxInvoice?.mgtKey,
          idempotencyKey: result.idempotencyKey ?? latestMeta.taxInvoice?.idempotencyKey ?? buildTaxInvoiceIdempotencyKey(latestInvoice),
          requestId: latestMeta.taxInvoice?.requestId ?? result.requestId,
          lastStatusSyncedAt: result.syncedAt,
          ntsConfirmNum: result.ntsConfirmNum ?? latestMeta.taxInvoice?.ntsConfirmNum,
          statusCode,
          barobillState: result.barobillState,
          ntsSendState: result.ntsSendState,
          ntsSendResult: result.ntsSendResult ?? latestMeta.taxInvoice?.ntsSendResult,
          statusMessage: result.message,
          cancellationRequestedAt: latestMeta.taxInvoice?.cancellationRequestedAt ?? result.syncedAt,
          cancellationRequestedBy: 'crm-admin',
          cancellationReason: 'CRM 관리자 요청',
          cancellationMethod: result.cancellationMethod as InvoiceTaxInvoiceMeta['cancellationMethod'],
          cancellationPending: result.status === 'cancel_requested',
          cancellationPendingReason: result.status === 'cancel_requested' ? 'NTS_RESULT_PENDING' : undefined,
          cancelledAt: result.cancelledAt ?? latestMeta.taxInvoice?.cancelledAt,
          amendmentMgtKey: result.amendmentMgtKey ?? latestMeta.taxInvoice?.amendmentMgtKey,
          amendmentRequestId: result.action?.includes('amendment') ? result.requestId : latestMeta.taxInvoice?.amendmentRequestId,
          amendmentIssuedAt: result.amendmentIssuedAt ?? latestMeta.taxInvoice?.amendmentIssuedAt,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
        },
      })
      const updatedInvoice = await updateInvoice(latestInvoice.Id, { memo: nextMemo })
      setTaxInvoiceDetailInvoice(updatedInvoice)
      invalidateTaxInvoiceViews(updatedInvoice.Id)

      if (result.status === 'cancelled') {
        toast.success('세금계산서 발급취소가 완료되었습니다')
      } else if (result.status === 'amended') {
        toast.success('수정세금계산서 상쇄 발급이 완료되었습니다')
      } else {
        toast.info(result.message || '취소/상쇄 대기 상태로 저장했습니다')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '세금계산서 취소/상쇄 요청에 실패했습니다'
      toast.error(message)
    } finally {
      setCancellingTaxInvoiceId(null)
    }
  }

  function toggleShipmentSelection(invoiceId: number, checked: boolean) {
    setSelectedShipmentIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(invoiceId)
      else next.delete(invoiceId)
      return next
    })
  }

  function toggleCurrentPageShipmentSelection(checked: boolean) {
    setSelectedShipmentIds((prev) => {
      const next = new Set(prev)
      currentPageConfirmableInvoices.forEach((invoice) => {
        if (checked) next.add(invoice.Id)
        else next.delete(invoice.Id)
      })
      return next
    })
  }

  function clearShipmentSelection() {
    setSelectedShipmentIds(new Set())
  }

  function invalidateRevenueViews() {
    void refetch()
    qc.invalidateQueries({ queryKey: ['transactions'] })
    qc.invalidateQueries({ queryKey: ['transactions-crm'] })
    qc.invalidateQueries({ queryKey: ['receivables'] })
    qc.invalidateQueries({
      predicate: (q) => {
        const key = q.queryKey[0]
        return typeof key === 'string' && (key.startsWith('dash-') || key.startsWith('period-') || key.startsWith('calendar-'))
      },
    })
  }

  async function confirmShipmentInvoice(inv: Invoice, confirmedAt: string, revenueDate: string) {
    const latestInvoice = await getInvoice(inv.Id)
    const latestStatus = getInvoiceFulfillmentStatus(latestInvoice.memo as string | undefined)
    const customerId = typeof latestInvoice.customer_id === 'number' && Number.isFinite(latestInvoice.customer_id)
      ? latestInvoice.customer_id
      : undefined
    if (latestStatus === 'shipment_confirmed') {
      return { status: 'skipped' as const, customerId }
    }

    const confirmedMemo = buildShipmentConfirmedInvoiceMemo(
      latestInvoice.memo as string | undefined,
      {
        invoiceId: inv.Id,
        invoiceNo: latestInvoice.invoice_no,
        confirmedAt,
        revenueDate,
        taxInvoiceStatus: 'not_requested',
      },
    )
    await updateInvoice(inv.Id, { memo: confirmedMemo })
    return { status: 'confirmed' as const, customerId }
  }

  async function handleShipmentConfirm(inv: Invoice) {
    const currentStatus = getInvoiceFulfillmentStatus(inv.memo as string | undefined)
    if (currentStatus === 'shipment_confirmed') {
      toast.info('이미 출고확정된 명세표입니다')
      return
    }
    const ok = window.confirm(
      `포장·출고확정 처리할까요?\n\n거래처: ${inv.customer_name ?? '-'}\n금액: ${formatAmount(inv.total_amount)}\n\n확정 후 이 건은 매출 자동화 대상이 됩니다.`,
    )
    if (!ok) return

    setConfirmingShipmentId(inv.Id)
    try {
      const result = await confirmShipmentInvoice(inv, new Date().toISOString(), getTodayDateString())
      if (result.status === 'skipped') {
        toast.info('이미 출고확정된 명세표입니다')
        clearShipmentSelection()
        invalidateRevenueViews()
        return
      }
      if (result.customerId) {
        try {
          await recalcCustomerStats(result.customerId)
        } catch {
          // 출고확정 자체는 완료됐으므로 통계 재계산 실패는 새로고침에서 복구한다.
        }
      }
      toast.success('포장·출고확정 처리되었습니다')
      toggleShipmentSelection(inv.Id, false)
      invalidateRevenueViews()
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      toast.error(`출고확정 실패: ${msg.slice(0, 80)}`)
    } finally {
      setConfirmingShipmentId(null)
    }
  }

  async function handleBulkShipmentConfirm() {
    const targets = selectedShipmentInvoices
    if (targets.length === 0) {
      toast.error('출고확정할 명세표를 선택해주세요')
      return
    }

    const ok = window.confirm(
      `선택한 ${targets.length.toLocaleString()}건을 포장·출고확정 처리할까요?\n\n합계: ${formatAmount(selectedShipmentAmount)}\n\n확정 후 선택 건은 매출 자동화 대상이 됩니다.`,
    )
    if (!ok) return

    setIsBulkShipmentConfirming(true)
    const confirmedAt = new Date().toISOString()
    const revenueDate = getTodayDateString()
    const customerIds = new Set<number>()
    let confirmedCount = 0
    let skippedCount = 0
    let failedCount = 0

    try {
      for (const target of targets) {
        setConfirmingShipmentId(target.Id)
        try {
          const result = await confirmShipmentInvoice(target, confirmedAt, revenueDate)
          if (result.status === 'confirmed') confirmedCount += 1
          else skippedCount += 1
          if (typeof result.customerId === 'number' && Number.isFinite(result.customerId)) {
            customerIds.add(result.customerId)
          }
        } catch {
          failedCount += 1
        }
      }

      for (const customerId of customerIds) {
        try {
          await recalcCustomerStats(customerId)
        } catch {
          // 고객 통계는 목록 갱신과 다음 재계산에서 복구 가능하므로 일괄 확정은 유지한다.
        }
      }

      clearShipmentSelection()
      invalidateRevenueViews()
      if (failedCount > 0) {
        toast.error(`일괄 출고확정: ${confirmedCount.toLocaleString()}건 완료, ${failedCount.toLocaleString()}건 실패`)
      } else if (skippedCount > 0) {
        toast.success(`선택 ${confirmedCount.toLocaleString()}건 출고확정, 이미 확정된 ${skippedCount.toLocaleString()}건 제외`)
      } else {
        toast.success(`선택 ${confirmedCount.toLocaleString()}건 출고확정 처리되었습니다`)
      }
    } finally {
      setConfirmingShipmentId(null)
      setIsBulkShipmentConfirming(false)
    }
  }

  function openTransactionPreview(inv: Invoice) {
    setSelectedTransaction({
      source: 'crm',
      recordId: inv.Id,
      date: inv.invoice_date?.slice(0, 10) ?? '',
      customerName: inv.customer_name ?? '',
      customerId: typeof inv.customer_id === 'number' ? inv.customer_id : undefined,
      txType: '출고',
      amount: inv.total_amount ?? 0,
      tax: inv.tax_amount ?? 0,
      slipNo: inv.invoice_no,
      memo: getDisplayMemo(inv.memo as string | undefined),
    })
  }

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">명세표 작성/관리</h2>
          <p className="text-sm text-muted-foreground mt-1">
            필터 결과 {totalRows.toLocaleString()}건
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleCourierExport()}
            disabled={isCourierExporting}
            className="gap-1"
          >
            <Download className="h-4 w-4" />
            {isCourierExporting ? '생성 중...' : '송장 엑셀'}
          </Button>
          <Button
            onClick={() => openCreate((dateFrom && dateFrom === dateTo) ? dateFrom : today)}
            className="bg-[#7d9675] hover:bg-[#6a8462] text-white gap-1"
          >
            <Plus className="h-4 w-4" />
            새 명세표
          </Button>
        </div>
      </div>

      {/* 필터 */}
      <div className="mb-4 rounded-xl border border-[#d8e4d6] bg-[linear-gradient(135deg,#f7faf6_0%,#eef5ea_100%)] p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#5a7353]">기간 총매출</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-[#233127]">
              {periodSalesAmount.toLocaleString()}원
            </p>
            <p className="mt-1 text-sm text-[#5f6f60]">
              {dateFrom} ~ {dateTo} 선택 기간 총매출
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-white/80 bg-white/80 px-4 py-3">
              <p className="text-[11px] font-medium text-muted-foreground">명세표 건수</p>
              <p className="mt-1 text-base font-semibold text-foreground">{filteredInvoices.length.toLocaleString()}건</p>
            </div>
            <div className="rounded-lg border border-white/80 bg-white/80 px-4 py-3">
              <p className="text-[11px] font-medium text-muted-foreground">평균 객단가</p>
              <p className="mt-1 text-base font-semibold text-foreground">{periodAverageAmount.toLocaleString()}원</p>
            </div>
          </div>
        </div>
        {hasDetailFilters && (
          <p className="mt-3 text-xs text-[#5f6f60]">
            거래처 검색과 수금 상태 필터가 같이 적용된 합계입니다.
          </p>
        )}
      </div>

      <div className="mb-4 rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">조회 조건</p>
              <p className="text-xs text-muted-foreground">
                거래처명을 찾고, 기간과 수금 상태를 좁혀서 필요한 명세표만 빠르게 보세요.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-[#f4f7f1] px-3 py-1 font-medium text-[#4f6748]">
                현재 {totalRows.toLocaleString()}건
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                기간 {dateFrom} ~ {dateTo}
              </span>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,1fr)_150px_auto]">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">거래처 검색</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="거래처명으로 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">조회 기간</label>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  {quickDateRanges.map((range) => {
                    const isActive = activeQuickRange === range.key
                    return (
                      <Button
                        key={range.key}
                        type="button"
                        variant={isActive ? 'default' : 'outline'}
                        size="sm"
                        className={isActive ? 'bg-[#7d9675] hover:bg-[#6a8462] text-white' : 'text-muted-foreground'}
                        onClick={() => applyDateRange(range.from, range.to)}
                      >
                        {range.label}
                      </Button>
                    )
                  })}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => applyDateRange(e.target.value, dateTo)}
                    className="sm:w-[170px]"
                  />
                  <span className="hidden text-sm text-muted-foreground sm:inline-flex">~</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => applyDateRange(dateFrom, e.target.value)}
                    className="sm:w-[170px]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">수금 상태</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="수금 상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">모든 상태</SelectItem>
                  <SelectItem value="paid">완납</SelectItem>
                  <SelectItem value="partial">부분수금</SelectItem>
                  <SelectItem value="unpaid">미수금</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              {hasActiveFilters ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full xl:w-auto"
                  onClick={() => {
                    setSearch('')
                    setStatusFilter('ALL')
                    applyDateRange(today, today)
                  }}
                >
                  초기화
                </Button>
              ) : (
                <div className="flex h-full w-full items-end xl:justify-end">
                  <span className="rounded-full bg-muted px-3 py-2 text-xs text-muted-foreground">
                    기본 조회
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {(invoiceLinkSummary.orphanCount > 0 || invoiceLinkSummary.splitCount > 0) && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {invoiceLinkSummary.orphanCount > 0 && (
            <div>고객관리 연결이 없는 분리 명세표 {invoiceLinkSummary.orphanCount}건</div>
          )}
          {invoiceLinkSummary.splitCount > 0 && (
            <div>고객명과 별도로 얼마에요 구분명이 유지된 명세표 {invoiceLinkSummary.splitCount}건</div>
          )}
        </div>
      )}

      <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        기간 기준으로 명세표를 조회하고, 현재 필터 결과를 택배 송장 업로드용 엑셀로 바로 내려받을 수 있습니다.
        {courierWarning.totalMissing > 0 ? (
          <span className="ml-2 inline-flex flex-wrap gap-2 text-amber-700">
            <span>검토 필요:</span>
            {courierWarning.missingAddress > 0 ? <span>주소 누락 {courierWarning.missingAddress}건</span> : null}
            {courierWarning.missingPhone > 0 ? <span>연락처 누락 {courierWarning.missingPhone}건</span> : null}
          </span>
        ) : (
          <span className="ml-2 text-[#3d6b4a]">필수 배송 정보 누락 없음</span>
        )}
      </div>

      <div className="mb-4 rounded-xl border border-[#d8e4d6] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CheckSquare className="h-4 w-4 text-[#5e8a6e]" />
              일괄 출고확정
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              포장이 끝난 명세표만 선택해 한 번에 출고확정합니다. 확정된 건만 매출 자동화에 반영됩니다.
            </p>
            <p className="mt-1 text-xs font-medium text-[#3d6b4a]">
              선택 {selectedShipmentInvoices.length.toLocaleString()}건 · 합계 {selectedShipmentAmount.toLocaleString()}원
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-[#d8e4d6] text-[#3d6b4a]"
              disabled={currentPageConfirmableInvoices.length === 0 || isBulkShipmentConfirming}
              onClick={() => toggleCurrentPageShipmentSelection(!allCurrentPageShipmentSelected)}
            >
              {allCurrentPageShipmentSelected ? '현재 화면 선택 해제' : '현재 화면 미확정 선택'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={selectedShipmentInvoices.length === 0 || isBulkShipmentConfirming}
              onClick={clearShipmentSelection}
            >
              선택 해제
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-[#7d9675] text-white hover:bg-[#6a8462]"
              disabled={selectedShipmentInvoices.length === 0 || isBulkShipmentConfirming}
              onClick={() => void handleBulkShipmentConfirm()}
            >
              <PackageCheck className="h-4 w-4" />
              {isBulkShipmentConfirming ? '일괄 처리 중...' : '선택 출고확정'}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4 md:hidden">
        {isLoading && (
          <div className="rounded-lg border bg-white px-4 py-12 text-center text-muted-foreground">
            불러오는 중...
          </div>
        )}
        {isError && (
          <div className="rounded-lg border bg-white px-4 py-12 text-center text-red-500">
            데이터를 불러오지 못했습니다.
          </div>
        )}
        {!isLoading && !isError && invoices.length === 0 && (
          <div className="rounded-lg border bg-white px-4 py-12 text-center text-muted-foreground">
            발행된 명세표가 없습니다. 새 명세표를 만들어보세요.
          </div>
        )}
        {!isLoading && !isError && invoices.map((inv) => {
          const st = STATUS_LABEL[inv.payment_status ?? '']
          const isDeleting = deletingId === inv.Id
          const outstandingAmount = getOutstandingAmount(inv)
          const linkedCustomer = typeof inv.customer_id === 'number' ? customerById.get(inv.customer_id) : undefined
          const invoiceName = inv.customer_name?.trim()
          const masterName = linkedCustomer?.name?.trim()
          const masterBookName = linkedCustomer?.book_name?.trim()
          const fulfillment = getFulfillmentBadge(inv)
          const isShipmentConfirmed = getInvoiceFulfillmentStatus(inv.memo as string | undefined) === 'shipment_confirmed'
          const isConfirmingShipment = confirmingShipmentId === inv.Id
          const taxInvoiceSummary = getTaxInvoiceSummary(inv)
          const isTaxInvoiceLoading = loadingTaxInvoiceId === inv.Id
          const isTaxInvoiceSyncing = syncingTaxInvoiceId === inv.Id

          return (
            <div key={inv.Id} className="rounded-xl border bg-white p-4 shadow-sm">
              {!isShipmentConfirmed && (
                <label className="mb-3 flex items-center gap-2 rounded-lg border border-[#d8e4d6] bg-[#f8faf7] px-3 py-2 text-xs font-medium text-[#3d6b4a]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#7d9675]"
                    aria-label={`출고확정 선택 ${inv.invoice_no ?? inv.customer_name ?? inv.Id}`}
                    checked={selectedShipmentIds.has(inv.Id)}
                    disabled={isBulkShipmentConfirming}
                    onChange={(e) => toggleShipmentSelection(inv.Id, e.target.checked)}
                  />
                  일괄 출고확정 선택
                </label>
              )}
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => openTransactionPreview(inv)}
                >
                  <div>
                    <div className="font-medium text-foreground">{inv.customer_name ?? '-'}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="truncate font-mono">{inv.invoice_no ?? '-'}</span>
                      <span>·</span>
                      <span>{inv.invoice_date?.slice(0, 10) ?? '-'}</span>
                    </div>
                  </div>
                  {typeof inv.customer_id === 'number' && inv.customer_id > 0 && !linkedCustomer ? (
                    <div className="mt-2 text-xs text-amber-700">고객관리 연결 없음 · 분리 거래명 유지</div>
                  ) : null}
                  {linkedCustomer && invoiceName && invoiceName !== masterName && invoiceName !== masterBookName ? (
                    <div className="mt-2 text-xs text-amber-700">고객관리: {masterName || '-'} · 분리 거래명 유지</div>
                  ) : null}
                  {linkedCustomer && masterBookName && masterBookName !== masterName && invoiceName === masterBookName ? (
                    <div className="mt-2 text-xs text-muted-foreground">얼마에요 구분명 기준</div>
                  ) : null}
                </button>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold text-foreground">{formatAmount(inv.total_amount)}</div>
                  {st ? (
                    <div className={`mt-1 inline-flex rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium ${st.cls}`}>
                      {st.label}
                    </div>
                  ) : (
                    <div className="mt-1 text-[11px] text-muted-foreground">수금 상태 없음</div>
                  )}
                  <div className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${fulfillment.cls}`}>
                    {fulfillment.label}
                  </div>
                  <div className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${taxInvoiceSummary.cls}`}>
                    세금계산서 {taxInvoiceSummary.label}
                  </div>
                </div>
              </div>
              {taxInvoiceSummary.detail ? (
                <div className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  {taxInvoiceSummary.detail}
                </div>
              ) : null}

              <div className="mt-3 rounded-lg bg-[#f8faf7] p-3">
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <div className="text-muted-foreground">합계</div>
                    <div className="mt-1 text-sm font-semibold text-foreground">{formatAmount(inv.total_amount)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">잔액</div>
                    <div className="mt-1 text-sm font-semibold text-foreground">{formatAmount(outstandingAmount)}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-[11px]">
                  <div>
                    <div className="text-muted-foreground">공급가액</div>
                    <div className="mt-1 font-medium text-foreground">{formatAmount(inv.supply_amount)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">세액</div>
                    <div className="mt-1 font-medium text-foreground">{formatAmount(inv.tax_amount)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">입금액</div>
                    <div className="mt-1 font-medium text-foreground">{formatAmount(inv.paid_amount && inv.paid_amount > 0 ? inv.paid_amount : null)}</div>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 border-[#d8e4d6] text-xs text-[#3d6b4a] hover:bg-[#f5faf4]"
                    onClick={(e) => { e.stopPropagation(); openPrintDialog(inv) }}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span className="ml-1">문서 출력</span>
                    <span className="sr-only">명세표 견적서 납품서 청구서 포장지시서 비교견적</span>
                  </Button>
                  <Button
                    variant={isShipmentConfirmed ? 'outline' : 'default'}
                    size="sm"
                    className={`h-9 text-xs ${isShipmentConfirmed ? 'border-emerald-200 text-emerald-700' : 'bg-[#7d9675] text-white hover:bg-[#6a8462]'}`}
                    disabled={isShipmentConfirmed || isConfirmingShipment}
                    onClick={(e) => { e.stopPropagation(); void handleShipmentConfirm(inv) }}
                  >
                    <PackageCheck className="h-3.5 w-3.5" />
                    <span className="ml-1">{isShipmentConfirmed ? '출고확정됨' : isConfirmingShipment ? '처리 중...' : '포장·출고확정'}</span>
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 border-blue-200 text-xs text-blue-700 hover:bg-blue-50"
                    disabled={isTaxInvoiceLoading}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (isTaxInvoiceRequestAvailable(taxInvoiceSummary.status)) void openTaxInvoiceRequest(inv)
                      else setTaxInvoiceDetailInvoice(inv)
                    }}
                  >
                    <ReceiptText className="h-3.5 w-3.5" />
                    <span className="ml-1">
                      {isTaxInvoiceLoading
                        ? '불러오는 중...'
                        : isTaxInvoiceRequestAvailable(taxInvoiceSummary.status)
                          ? '세금계산서 발급'
                          : '발급내역 보기'}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
                    disabled={taxInvoiceSummary.status === 'not_requested' || isTaxInvoiceSyncing}
                    onClick={(e) => { e.stopPropagation(); void handleTaxInvoiceStatusSync(inv) }}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isTaxInvoiceSyncing ? 'animate-spin' : ''}`} />
                    <span className="ml-1">{isTaxInvoiceSyncing ? '확인 중...' : '상태 새로고침'}</span>
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 justify-center gap-1 rounded-lg bg-gray-50 text-xs"
                    title="수정"
                    onClick={(e) => { e.stopPropagation(); openEdit(inv.Id) }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>수정</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 justify-center gap-1 rounded-lg bg-gray-50 text-xs"
                    title="복사"
                    onClick={(e) => { e.stopPropagation(); openCopy(inv.Id) }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>복사</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 justify-center gap-1 rounded-lg bg-gray-50 text-xs text-red-400 hover:text-red-600"
                    title="삭제"
                    disabled={isDeleting}
                    onClick={(e) => { e.stopPropagation(); void handleDelete(inv) }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>삭제</span>
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 테이블 */}
      <div className="hidden overflow-x-auto rounded-lg border bg-white md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="w-12 px-4 py-3 text-center font-medium text-muted-foreground">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#7d9675]"
                  aria-label="현재 화면 미확정 전체 선택"
                  checked={allCurrentPageShipmentSelected}
                  disabled={currentPageConfirmableInvoices.length === 0 || isBulkShipmentConfirming}
                  onChange={(e) => toggleCurrentPageShipmentSelection(e.target.checked)}
                />
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">발행정보</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">거래처</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">금액</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">수금 현황</th>
              <th className="w-[420px] text-center px-4 py-3 font-medium text-muted-foreground">세금계산서/출력/관리</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-muted-foreground">
                  불러오는 중...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-red-500">
                  데이터를 불러오지 못했습니다.
                </td>
              </tr>
            )}
            {!isLoading && !isError && invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-muted-foreground">
                  발행된 명세표가 없습니다. 새 명세표를 만들어보세요.
                </td>
              </tr>
            )}
            {invoices.map((inv) => {
              const st = STATUS_LABEL[inv.payment_status ?? '']
              const isDeleting = deletingId === inv.Id
              const outstandingAmount = getOutstandingAmount(inv)
              const fulfillment = getFulfillmentBadge(inv)
              const isShipmentConfirmed = getInvoiceFulfillmentStatus(inv.memo as string | undefined) === 'shipment_confirmed'
              const isConfirmingShipment = confirmingShipmentId === inv.Id
              const taxInvoiceSummary = getTaxInvoiceSummary(inv)
              const isTaxInvoiceLoading = loadingTaxInvoiceId === inv.Id
              const isTaxInvoiceSyncing = syncingTaxInvoiceId === inv.Id
              return (
                <tr
                  key={inv.Id}
                  className="border-b last:border-b-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 align-top text-center">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-[#7d9675]"
                      aria-label={`출고확정 선택 ${inv.invoice_no ?? inv.customer_name ?? inv.Id}`}
                      checked={selectedShipmentIds.has(inv.Id)}
                      disabled={isShipmentConfirmed || isBulkShipmentConfirming}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => toggleShipmentSelection(inv.Id, e.target.checked)}
                    />
                  </td>
                  <td
                    className="px-4 py-3 align-top cursor-pointer"
                    onClick={() => openTransactionPreview(inv)}
                  >
                    <div className="font-mono text-xs text-muted-foreground">{inv.invoice_no ?? '-'}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      발행일 {inv.invoice_date?.slice(0, 10) ?? '-'}
                    </div>
                  </td>
                  <td
                    className="px-4 py-3 align-top font-medium cursor-pointer"
                    onClick={() => openTransactionPreview(inv)}
                  >
                    <div className="font-medium">{inv.customer_name ?? '-'}</div>
                    {(() => {
                      const linkedCustomer = typeof inv.customer_id === 'number' ? customerById.get(inv.customer_id) : undefined
                      const invoiceName = inv.customer_name?.trim()
                      const masterName = linkedCustomer?.name?.trim()
                      const masterBookName = linkedCustomer?.book_name?.trim()
                      if (typeof inv.customer_id === 'number' && inv.customer_id > 0 && !linkedCustomer) {
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
                  <td
                    className="px-4 py-3 align-top text-right cursor-pointer"
                    onClick={() => openTransactionPreview(inv)}
                  >
                    <div className="font-semibold text-foreground">{formatAmount(inv.total_amount)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      공급가액 {formatAmount(inv.supply_amount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      세액 {formatAmount(inv.tax_amount)}
                    </div>
                  </td>
                  <td
                    className="px-4 py-3 align-top cursor-pointer"
                    onClick={() => openTransactionPreview(inv)}
                  >
                    <div className="flex items-center gap-2">
                      {st ? (
                        <span className={`rounded-full bg-muted px-2.5 py-1 text-xs font-medium ${st.cls}`}>{st.label}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        잔액 {formatAmount(outstandingAmount)}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      입금 {formatAmount(inv.paid_amount && inv.paid_amount > 0 ? inv.paid_amount : null)}
                    </div>
                    <div className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${fulfillment.cls}`}>
                      {fulfillment.label}
                    </div>
                    <div className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${taxInvoiceSummary.cls}`}>
                      세금계산서 {taxInvoiceSummary.label}
                    </div>
                    {taxInvoiceSummary.detail ? (
                      <div className="mt-1 max-w-[220px] truncate text-xs text-muted-foreground">
                        {taxInvoiceSummary.detail}
                      </div>
                    ) : null}
                  </td>
                  {/* 인라인 액션 버튼 */}
                  <td className="px-2 py-3 align-top">
                    <div className="flex flex-wrap items-start justify-end gap-2">
                      <div className="rounded-xl border border-blue-100 bg-white p-1 shadow-sm">
                        <div className="px-2 pb-1 pt-0.5 text-[11px] font-medium text-blue-700">세금계산서</div>
                        <div className="grid gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-blue-200 px-3 text-xs text-blue-700 hover:bg-blue-50"
                            title={isTaxInvoiceRequestAvailable(taxInvoiceSummary.status) ? '세금계산서 발급' : '발급내역 보기'}
                            disabled={isTaxInvoiceLoading}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (isTaxInvoiceRequestAvailable(taxInvoiceSummary.status)) void openTaxInvoiceRequest(inv)
                              else setTaxInvoiceDetailInvoice(inv)
                            }}
                          >
                            <ReceiptText className="h-3.5 w-3.5" />
                            <span className="ml-1">
                              {isTaxInvoiceLoading
                                ? '로딩'
                                : isTaxInvoiceRequestAvailable(taxInvoiceSummary.status)
                                  ? '세금계산서 발급'
                                  : '내역 보기'}
                            </span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-slate-200 px-3 text-xs text-slate-600 hover:bg-slate-50"
                            title="세금계산서 상태 새로고침"
                            disabled={taxInvoiceSummary.status === 'not_requested' || isTaxInvoiceSyncing}
                            onClick={(e) => { e.stopPropagation(); void handleTaxInvoiceStatusSync(inv) }}
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${isTaxInvoiceSyncing ? 'animate-spin' : ''}`} />
                            <span className="ml-1">{isTaxInvoiceSyncing ? '확인 중' : '상태 확인'}</span>
                          </Button>
                        </div>
                      </div>
                      <div className="rounded-xl border border-[#d8e4d6] bg-white p-1 shadow-sm">
                        <div className="px-2 pb-1 pt-0.5 text-[11px] font-medium text-[#5a7353]">문서</div>
                        <div className="grid gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-[#d8e4d6] px-3 text-xs text-[#3d6b4a] hover:bg-[#f5faf4]"
                            title="문서 출력"
                            onClick={(e) => { e.stopPropagation(); openPrintDialog(inv) }}
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span className="ml-1">문서 출력</span>
                            <span className="sr-only">명세표 견적서 납품서 청구서 포장지시서 비교견적</span>
                          </Button>
                          <Button
                            variant={isShipmentConfirmed ? 'outline' : 'default'}
                            size="sm"
                            className={`h-8 px-3 text-xs ${isShipmentConfirmed ? 'border-emerald-200 text-emerald-700' : 'bg-[#7d9675] text-white hover:bg-[#6a8462]'}`}
                            title="포장·출고확정"
                            disabled={isShipmentConfirmed || isConfirmingShipment}
                            onClick={(e) => { e.stopPropagation(); void handleShipmentConfirm(inv) }}
                          >
                            <PackageCheck className="h-3.5 w-3.5" />
                            <span className="ml-1">{isShipmentConfirmed ? '출고확정됨' : isConfirmingShipment ? '처리 중...' : '포장·출고확정'}</span>
                          </Button>
                        </div>
                      </div>
                      <div className="rounded-xl bg-gray-50 px-1 py-1">
                        <div className="px-2 pb-1 pt-0.5 text-[11px] font-medium text-muted-foreground">관리</div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="수정"
                            onClick={(e) => { e.stopPropagation(); openEdit(inv.Id) }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="복사"
                            onClick={(e) => { e.stopPropagation(); openCopy(inv.Id) }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                            title="삭제"
                            disabled={isDeleting}
                            onClick={(e) => { e.stopPropagation(); void handleDelete(inv) }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–
            {Math.min(page * PAGE_SIZE, totalRows).toLocaleString()} / {totalRows.toLocaleString()}건
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-1 min-w-[60px] text-center">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!printDialogInvoice} onOpenChange={(open) => {
        if (!open) setPrintDialogInvoice(null)
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>문서 출력</DialogTitle>
            <DialogDescription>
              견적서, 거래명세서, 포장지시서, 협력업체 비교견적을 한 곳에서 선택합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-[#f8faf7] p-3 text-sm">
              <div className="font-semibold text-foreground">{printDialogInvoice?.customer_name ?? '-'}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {printDialogInvoice?.invoice_no ?? '-'} · {formatAmount(printDialogInvoice?.total_amount)}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">출력 문서</label>
              <Select value={printDocumentType} onValueChange={(value) => setPrintDocumentType(value as PrintDocumentType)}>
                <SelectTrigger>
                  <SelectValue placeholder="문서 선택" />
                </SelectTrigger>
                <SelectContent>
                  {PRINT_DOCUMENT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {printDocumentType === 'packing' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                포장지시서는 출고팀 확인용입니다. 품목, 수량, 단가, 금액이 모두 표시됩니다.
              </div>
            )}
            {printDocumentType === 'comparison' && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                현재 명세표 품목·수량 기준으로 협력업체 명의 비교견적서를 출력합니다.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintDialogInvoice(null)}>취소</Button>
            <Button
              className="bg-[#7d9675] text-white hover:bg-[#6a8462]"
              onClick={() => {
                if (!printDialogInvoice) return
                const target = printDialogInvoice
                const documentType = printDocumentType
                setPrintDialogInvoice(null)
                void handlePrint(target, documentType)
              }}
            >
              <FileText className="h-4 w-4" />
              출력
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 명세표 다이얼로그 */}
      {dialogOpen && (
        <InvoiceDialog
          open={dialogOpen}
          invoiceId={selectedId}
          copySourceId={copySourceId}
          initialInvoiceDate={initialInvoiceDate}
          initialCustomerId={initialCustomerId}
          initialCustomerName={initialCustomerName}
          onClose={() => {
            setDialogOpen(false)
            setSelectedId(undefined)
            setCopySourceId(undefined)
            setInitialInvoiceDate(undefined)
            setInitialCustomerId(undefined)
            setInitialCustomerName(undefined)
          }}
          onSaved={() => {
            setDialogOpen(false)
            setSelectedId(undefined)
            setCopySourceId(undefined)
            setInitialInvoiceDate(undefined)
            setInitialCustomerId(undefined)
            setInitialCustomerName(undefined)
            void refetch()
          }}
        />
      )}

      <TaxInvoiceRequestDialog
        open={!!taxInvoiceDialogData}
        invoice={taxInvoiceDialogData?.invoice ?? null}
        customer={taxInvoiceDialogData?.customer ?? null}
        items={taxInvoiceDialogData?.items ?? []}
        isSubmitting={requestingTaxInvoiceId === taxInvoiceDialogData?.invoice.Id}
        onClose={() => setTaxInvoiceDialogData(null)}
        onSubmit={handleTaxInvoiceSubmit}
      />

      {taxInvoiceDetailInvoice && (() => {
        const summary = getTaxInvoiceSummary(taxInvoiceDetailInvoice)
        const meta = parseInvoiceAccountingMeta(taxInvoiceDetailInvoice.memo as string | undefined)
        const taxInvoice = meta.taxInvoice
        const isSyncing = syncingTaxInvoiceId === taxInvoiceDetailInvoice.Id
        const isCancelling = cancellingTaxInvoiceId === taxInvoiceDetailInvoice.Id
        const cancelAvailable = isTaxInvoiceCancelAvailable(summary.status) && Boolean(taxInvoice?.mgtKey)
        const cancelLabel = getTaxInvoiceCancelLabel(taxInvoiceDetailInvoice)
        return (
          <Dialog open={!!taxInvoiceDetailInvoice} onOpenChange={(open) => {
            if (!open) setTaxInvoiceDetailInvoice(null)
          }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ReceiptText className="h-5 w-5 text-blue-700" />
                  세금계산서 발급내역
                </DialogTitle>
                <DialogDescription>
                  바로빌 발급/상태조회/취소·수정 webhook 결과와 저장된 요청 메타입니다.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg border bg-[#f8faf7] p-3">
                  <div className="font-semibold text-foreground">{taxInvoiceDetailInvoice.customer_name ?? '-'}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {taxInvoiceDetailInvoice.invoice_no ?? '-'} · {formatAmount(taxInvoiceDetailInvoice.total_amount)}
                  </div>
                  <div className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${summary.cls}`}>
                    {summary.label}
                  </div>
                  {summary.detail ? <div className="mt-2 text-xs text-muted-foreground">{summary.detail}</div> : null}
                </div>

                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">공급사</dt>
                    <dd>{taxInvoice?.provider === 'barobill' ? '바로빌' : '-'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">관리번호</dt>
                    <dd className="max-w-[280px] truncate font-mono">{taxInvoice?.mgtKey ?? '-'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">요청 ID</dt>
                    <dd className="max-w-[280px] truncate font-mono">{taxInvoice?.requestId ?? '-'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">요청 시각</dt>
                    <dd>{taxInvoice?.requestedAt ? taxInvoice.requestedAt.slice(0, 19).replace('T', ' ') : '-'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">상태 확인</dt>
                    <dd>{taxInvoice?.lastStatusSyncedAt ? taxInvoice.lastStatusSyncedAt.slice(0, 19).replace('T', ' ') : '-'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">국세청 승인번호</dt>
                    <dd className="font-mono">{getMaskedConfirmNumber(taxInvoice?.ntsConfirmNum) ?? '-'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">취소/상쇄 방식</dt>
                    <dd>{taxInvoice?.cancellationMethod ?? '-'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">수정 관리번호</dt>
                    <dd className="max-w-[280px] truncate font-mono">{taxInvoice?.amendmentMgtKey ?? '-'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">메일/문자</dt>
                    <dd>
                      메일 {taxInvoice?.mailSent ? 'ON' : 'OFF'} · 문자 {taxInvoice?.smsRequested ? 'ON' : 'OFF'}
                    </dd>
                  </div>
                </dl>

                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  취소/상쇄는 공식문서 기준으로 자동 분기됩니다. 국세청 전송 전이면 발급취소, 전송완료 후이면 수정세금계산서 상쇄, 전송중이면 대기 상태로 저장합니다.
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTaxInvoiceDetailInvoice(null)}>닫기</Button>
                <Button
                  variant="outline"
                  disabled={summary.status === 'not_requested' || isSyncing}
                  onClick={() => void handleTaxInvoiceStatusSync(taxInvoiceDetailInvoice)}
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? '확인 중...' : '상태 새로고침'}
                </Button>
                <Button
                  variant="outline"
                  disabled={!cancelAvailable || isCancelling}
                  onClick={() => void handleTaxInvoiceCancelRequest(taxInvoiceDetailInvoice)}
                >
                  {isCancelling ? '처리 중...' : cancelLabel}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      })()}

      <TransactionDetailDialog
        open={!!selectedTransaction}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />

      <Dialog open={showCourierConfirm} onOpenChange={setShowCourierConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>송장 다운로드 전 확인</DialogTitle>
            <DialogDescription>
              업로드용 엑셀은 생성할 수 있지만, 누락된 배송 정보는 택배 시스템에서 반려될 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-amber-50 px-4 py-3 text-sm text-amber-800 space-y-1">
            <p>현재 필터 결과 {filteredInvoices.length.toLocaleString()}건</p>
            <p>주소 누락 {courierWarning.missingAddress.toLocaleString()}건</p>
            <p>연락처 누락 {courierWarning.missingPhone.toLocaleString()}건</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCourierConfirm(false)}>취소</Button>
            <Button
              className="bg-[#7d9675] hover:bg-[#6a8462] text-white"
              onClick={() => {
                setShowCourierConfirm(false)
                void runCourierExport()
              }}
            >
              계속 다운로드
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
