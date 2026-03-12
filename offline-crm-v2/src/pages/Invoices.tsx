import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, ChevronLeft, ChevronRight, Download, Printer, Copy, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { InvoiceDialog } from '@/components/InvoiceDialog'
import { TransactionDetailDialog } from '@/components/TransactionDetailDialog'
import type { TransactionPreview } from '@/components/TransactionDetailDialog'
import { getAllCustomers, getAllInvoices, getInvoice, getItems, deleteInvoice, bulkDeleteItems, recalcCustomerStats, sanitizeSearchTerm, findCustomerByInvoiceLink } from '@/lib/api'
import type { Customer, Invoice } from '@/lib/api'
import { exportCourierInvoices } from '@/lib/excel'
import { printDuplexViaIframe } from '@/lib/print'
import { getDisplayMemo } from '@/lib/accountingMeta'

const PAGE_SIZE = 25

function isValidCalendarDate(value: string | null): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
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

function getCustomerPrimaryPhone(customer: Customer | null | undefined): string {
  return (customer?.mobile ?? customer?.phone1 ?? customer?.phone ?? '') as string
}

function getCustomerAddressKeys(customer: Customer | null | undefined): string[] {
  if (!customer) return []
  const keys: string[] = []
  for (let i = 1; i <= 10; i++) {
    const key = `address${i}`
    const value = (customer[key] as string | undefined)?.trim()
    if (value) keys.push(key)
  }
  return keys
}

function getCustomerAddressByKey(customer: Customer | null | undefined, addressKey?: string): string {
  if (!customer) return ''
  const keys = getCustomerAddressKeys(customer)
  if (addressKey && keys.includes(addressKey)) {
    const base = ((customer[addressKey] as string | undefined) ?? '').trim()
    if (addressKey === 'address1') {
      const detail = ((customer.address2 as string | undefined) ?? '').trim()
      return [base, detail].filter(Boolean).join(' ')
    }
    return base
  }
  if (keys.length === 0) return ''
  const firstKey = keys[0]
  const base = (((customer[firstKey] as string | undefined) ?? '').trim())
  if (firstKey === 'address1') {
    const detail = ((customer.address2 as string | undefined) ?? '').trim()
    return [base, detail].filter(Boolean).join(' ')
  }
  return base
}

function getCustomerAddress(customer: Customer | null | undefined, preferredAddress?: string): string {
  if (!customer) return ''
  const trimmedPreferred = preferredAddress?.trim()
  let firstAddress = ''
  for (let i = 1; i <= 10; i++) {
    const value = (customer[`address${i}`] as string | undefined)?.trim()
    if (!value) continue
    if (!firstAddress) firstAddress = value
    if (trimmedPreferred && value === trimmedPreferred) return value
  }
  return firstAddress
}

function buildCustomerPrintSnapshot(
  customer: Customer | null | undefined,
  preferredAddress?: string,
): Partial<Invoice> {
  if (!customer) return {}
  return {
    customer_phone: getCustomerPrimaryPhone(customer),
    customer_address: getCustomerAddress(customer, preferredAddress),
    customer_bizno: customer.biz_no,
    customer_ceo_name: customer.ceo_name as string | undefined,
    customer_biz_type: customer.biz_type as string | undefined,
    customer_biz_item: customer.biz_item as string | undefined,
  }
}

export function Invoices() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState(() => {
    const date = searchParams.get('date')
    const from = searchParams.get('from')
    if (isValidCalendarDate(date)) return date
    return isValidCalendarDate(from) ? from : ''
  })
  const [dateTo, setDateTo] = useState(() => {
    const date = searchParams.get('date')
    const to = searchParams.get('to')
    if (isValidCalendarDate(date)) return date
    return isValidCalendarDate(to) ? to : ''
  })
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined)
  const [copySourceId, setCopySourceId] = useState<number | undefined>(undefined)
  const [initialInvoiceDate, setInitialInvoiceDate] = useState<string | undefined>(undefined)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionPreview | null>(null)
  const [isCourierExporting, setIsCourierExporting] = useState(false)
  const [showCourierConfirm, setShowCourierConfirm] = useState(false)

  const debouncedSearch = useDebounce(search, 400)
  useEffect(() => setPage(1), [debouncedSearch, statusFilter, dateFrom, dateTo])

  useEffect(() => {
    const nextDate = searchParams.get('date')
    const normalizedDate = isValidCalendarDate(nextDate) ? nextDate : ''
    const nextFrom = searchParams.get('from')
    const nextTo = searchParams.get('to')
    const normalizedFrom = normalizedDate || (isValidCalendarDate(nextFrom) ? nextFrom : '')
    const normalizedTo = normalizedDate || (isValidCalendarDate(nextTo) ? nextTo : '')

    setDateFrom((prev) => (prev === normalizedFrom ? prev : normalizedFrom))
    setDateTo((prev) => (prev === normalizedTo ? prev : normalizedTo))

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
      setSelectedId(undefined)
      setCopySourceId(undefined)
      setInitialInvoiceDate(normalizedDate || normalizedFrom || undefined)
      setDialogOpen(true)

      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('new')
      setSearchParams(nextParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

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
      fields: 'Id,name,book_name,legacy_id,mobile,phone1,address1,address2',
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
  const courierWarning = useMemo(() => {
    let missingAddress = 0
    let missingPhone = 0
    for (const invoice of filteredInvoices) {
      const linkedCustomer = typeof invoice.customer_id === 'number' ? customerById.get(invoice.customer_id) : undefined
      const resolvedAddress = (invoice.customer_address || '').trim()
        || (linkedCustomer ? getCustomerAddressByKey(linkedCustomer, invoice.customer_address_key as string | undefined) : '')
      const resolvedPhone = getCustomerPrimaryPhone(linkedCustomer) || invoice.customer_phone || ''
      const hasAddress = Boolean(resolvedAddress.trim())
      const hasPhone = Boolean(resolvedPhone.trim())
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
    setDialogOpen(true)
  }

  function openEdit(id: number) {
    setSelectedId(id)
    setCopySourceId(undefined)
    setInitialInvoiceDate(undefined)
    setDialogOpen(true)
  }

  function openCopy(id: number) {
    setSelectedId(undefined)
    setCopySourceId(id)
    setInitialInvoiceDate(undefined)
    setDialogOpen(true)
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
        try { await recalcCustomerStats(inv.customer_id as number) } catch {}
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

        let linkedCustomer = invoiceCustomerId ? linkedCustomerCache.get(invoiceCustomerId) : undefined
        if (invoiceCustomerId && linkedCustomer === undefined) {
          linkedCustomer = customerById.get(invoiceCustomerId) ?? await findCustomerByInvoiceLink(invoiceCustomerId, latestInvoice.customer_name)
          linkedCustomerCache.set(invoiceCustomerId, linkedCustomer ?? null)
        }

        const receiverPhone = getCustomerPrimaryPhone(linkedCustomer) || latestInvoice.customer_phone || invoice.customer_phone || ''
        const receiverAddressKey = (latestInvoice.customer_address_key as string | undefined)
          ?? (invoice.customer_address_key as string | undefined)
          ?? getCustomerAddressKeys(linkedCustomer)[0]
        const receiverAddress = (latestInvoice.customer_address || invoice.customer_address || '').trim()
          || getCustomerAddressByKey(linkedCustomer, receiverAddressKey)

        return {
          receiverName: latestInvoice.customer_name ?? invoice.customer_name ?? '',
          receiverPhone,
          receiverMobile: receiverPhone,
          receiverAddress,
          quantity: 1,
          deliveryMessage: '',
        }
      }))

      exportCourierInvoices(rows, {
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

  async function handlePrint(inv: Invoice) {
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
      } catch {}
      const customerSnapshot = buildCustomerPrintSnapshot(
        currentCustomer,
        latestInvoice.customer_address as string | undefined,
      )
      printDuplexViaIframe(
        {
          invoice_no: latestInvoice.invoice_no,
          invoice_date: latestInvoice.invoice_date,
          receipt_type: latestInvoice.receipt_type ?? '영수',
          customer_name: latestInvoice.customer_name ?? currentCustomer?.name,
          customer_phone: customerSnapshot.customer_phone ?? (latestInvoice.customer_phone as string),
          customer_address: customerSnapshot.customer_address ?? (latestInvoice.customer_address as string),
          customer_bizno: customerSnapshot.customer_bizno ?? (latestInvoice.customer_bizno as string),
          customer_ceo_name: customerSnapshot.customer_ceo_name ?? (latestInvoice.customer_ceo_name as string),
          customer_biz_type: customerSnapshot.customer_biz_type ?? (latestInvoice.customer_biz_type as string),
          customer_biz_item: customerSnapshot.customer_biz_item ?? (latestInvoice.customer_biz_item as string),
          supply_amount: latestInvoice.supply_amount,
          tax_amount: latestInvoice.tax_amount,
          total_amount: latestInvoice.total_amount,
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
      )
    } catch {
      toast.error('인쇄 데이터를 불러오지 못했습니다')
    }
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
            {isCourierExporting ? '생성 중...' : '택배 송장 자동 다운로드'}
          </Button>
          <Button
            onClick={() => openCreate((dateFrom && dateFrom === dateTo) ? dateFrom : undefined)}
            className="bg-[#7d9675] hover:bg-[#6a8462] text-white gap-1"
          >
            <Plus className="h-4 w-4" />
            새 명세표
          </Button>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="거래처명 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => applyDateRange(e.target.value, dateTo)}
          className="w-[170px]"
        />
        <span className="flex items-center text-muted-foreground text-sm">~</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => applyDateRange(dateFrom, e.target.value)}
          className="w-[170px]"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="수금 상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">모든 상태</SelectItem>
            <SelectItem value="paid">완납</SelectItem>
            <SelectItem value="partial">부분수금</SelectItem>
            <SelectItem value="unpaid">미수금</SelectItem>
          </SelectContent>
        </Select>
        {(statusFilter !== 'ALL' || search || dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('')
              setStatusFilter('ALL')
              applyDateRange('', '')
            }}
          >
            초기화
          </Button>
        )}
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

      {/* 테이블 */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">발행번호</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">거래처</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">발행일</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">공급가액</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">합계금액</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">입금</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">수금</th>
              <th className="w-32" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted-foreground">
                  불러오는 중...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-red-500">
                  데이터를 불러오지 못했습니다.
                </td>
              </tr>
            )}
            {!isLoading && !isError && invoices.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted-foreground">
                  발행된 명세표가 없습니다. 새 명세표를 만들어보세요.
                </td>
              </tr>
            )}
            {invoices.map((inv) => {
              const st = STATUS_LABEL[inv.payment_status ?? '']
              const isDeleting = deletingId === inv.Id
              return (
                <tr
                  key={inv.Id}
                  className="border-b last:border-b-0 hover:bg-gray-50 transition-colors"
                >
                  <td
                    className="px-4 py-3 font-mono text-xs text-muted-foreground cursor-pointer"
                    onClick={() => setSelectedTransaction({
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
                    })}
                  >
                    {inv.invoice_no ?? '-'}
                  </td>
                  <td
                    className="px-4 py-3 font-medium cursor-pointer"
                    onClick={() => setSelectedTransaction({
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
                    })}
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
                    className="px-4 py-3 text-right text-muted-foreground text-xs cursor-pointer"
                    onClick={() => setSelectedTransaction({
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
                    })}
                  >
                    {inv.invoice_date?.slice(0, 10) ?? '-'}
                  </td>
                  <td
                    className="px-4 py-3 text-right cursor-pointer"
                    onClick={() => setSelectedTransaction({
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
                    })}
                  >
                    {inv.supply_amount != null ? `${inv.supply_amount.toLocaleString()}원` : '-'}
                  </td>
                  <td
                    className="px-4 py-3 text-right font-medium cursor-pointer"
                    onClick={() => setSelectedTransaction({
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
                    })}
                  >
                    {inv.total_amount != null ? `${inv.total_amount.toLocaleString()}원` : '-'}
                  </td>
                  <td
                    className="px-4 py-3 text-right text-xs text-muted-foreground cursor-pointer"
                    onClick={() => setSelectedTransaction({
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
                    })}
                  >
                    {inv.paid_amount != null && inv.paid_amount > 0
                      ? `${inv.paid_amount.toLocaleString()}원`
                      : '-'}
                  </td>
                  <td
                    className="px-4 py-3 cursor-pointer"
                    onClick={() => setSelectedTransaction({
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
                    })}
                  >
                    {st ? (
                      <span className={`text-xs font-medium ${st.cls}`}>{st.label}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  {/* 인라인 액션 버튼 */}
                  <td className="px-2 py-3">
                    <div className="flex gap-1 justify-end">
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
                        title="인쇄"
                        onClick={(e) => { e.stopPropagation(); void handlePrint(inv) }}
                      >
                        <Printer className="h-3.5 w-3.5" />
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

      {/* 명세표 다이얼로그 */}
      {dialogOpen && (
        <InvoiceDialog
          open={dialogOpen}
          invoiceId={selectedId}
          copySourceId={copySourceId}
          initialInvoiceDate={initialInvoiceDate}
          onClose={() => {
            setDialogOpen(false)
            setSelectedId(undefined)
            setCopySourceId(undefined)
            setInitialInvoiceDate(undefined)
          }}
          onSaved={() => {
            setDialogOpen(false)
            setSelectedId(undefined)
            setCopySourceId(undefined)
            setInitialInvoiceDate(undefined)
            void refetch()
          }}
        />
      )}

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
