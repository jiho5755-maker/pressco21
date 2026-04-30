import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Mail, MessageSquare, ReceiptText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getInvoiceFulfillmentStatus, parseInvoiceAccountingMeta, type InvoiceTaxInvoiceStatus } from '@/lib/accountingMeta'
import { loadActiveWorkOperatorProfile } from '@/lib/settings'
import { getVatIncludedLineTotal, splitVatIncludedAmount } from '@/lib/vatIncluded'
import type {
  BarobillTaxInvoiceItemPayload,
  BarobillTaxInvoicePartyPayload,
  BarobillTaxInvoiceRequestPayload,
  Customer,
  Invoice,
  InvoiceItem,
} from '@/lib/api'

interface TaxInvoiceRequestDialogProps {
  open: boolean
  invoice: Invoice | null
  customer: Customer | null
  items: InvoiceItem[]
  isSubmitting?: boolean
  onClose: () => void
  onSubmit: (payload: BarobillTaxInvoiceRequestPayload) => Promise<void>
}

const LOCKED_TAX_INVOICE_STATUSES: InvoiceTaxInvoiceStatus[] = [
  'requesting',
  'requested',
  'issued',
  'cancel_requested',
  'cancelled',
  'amended',
]

const BAROBILL_TAX_INVOICE_MODE =
  import.meta.env.VITE_BAROBILL_TAX_INVOICE_MODE === 'production' ? 'production' : 'test'
const BAROBILL_ALLOW_PRODUCTION_ISSUE =
  import.meta.env.VITE_BAROBILL_ALLOW_PRODUCTION_ISSUE === 'true'
const IS_PRODUCTION_ISSUE_ENABLED =
  BAROBILL_TAX_INVOICE_MODE === 'production' && BAROBILL_ALLOW_PRODUCTION_ISSUE

function formatAmount(value?: number | null) {
  if (value == null || !Number.isFinite(Number(value))) return '-'
  return `${Number(value).toLocaleString()}원`
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeInvoiceNo(value: unknown): string {
  const invoiceNo = normalizeText(value)
  return invoiceNo || `INV-${Date.now()}`
}

function normalizeBizNo(value: string): string {
  return value.replace(/[^0-9]/g, '')
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function buildBarobillIdempotencyKey(invoice: Invoice): string {
  return `barobill:tax-invoice:pressco21:${invoice.Id}:${normalizeInvoiceNo(invoice.invoice_no)}`
}

function buildBarobillMgtKey(invoice: Invoice): string {
  const idempotencyKey = buildBarobillIdempotencyKey(invoice)
  const idPart = String(invoice.Id).replace(/\D/g, '').slice(-7) || '0'
  const noPart = normalizeInvoiceNo(invoice.invoice_no).replace(/[^0-9A-Za-z]/g, '').slice(-6) || 'INV'
  const hash = fnv1a(idempotencyKey).slice(0, 8).toUpperCase()
  return `PC${idPart}-${noPart}-${hash}`.slice(0, 24)
}

function getCustomerValue(
  invoice: Invoice,
  customer: Customer | null,
  invoiceKey: keyof Invoice,
  customerKeys: Array<keyof Customer>,
): string {
  const invoiceValue = normalizeText(invoice[invoiceKey])
  if (invoiceValue) return invoiceValue
  for (const key of customerKeys) {
    const customerValue = normalizeText(customer?.[key])
    if (customerValue) return customerValue
  }
  return ''
}

function buildCustomerParty(invoice: Invoice, customer: Customer | null): BarobillTaxInvoicePartyPayload {
  return {
    corpNum: getCustomerValue(invoice, customer, 'customer_bizno', ['biz_no', 'business_no']),
    corpName: getCustomerValue(invoice, customer, 'customer_name', ['name', 'book_name']),
    ceoName: getCustomerValue(invoice, customer, 'customer_ceo_name', ['ceo_name']),
    addr: getCustomerValue(invoice, customer, 'customer_address', ['business_address', 'address1']),
    bizType: getCustomerValue(invoice, customer, 'customer_biz_type', ['biz_type', 'business_type']),
    bizClass: getCustomerValue(invoice, customer, 'customer_biz_item', ['biz_item', 'business_item']),
    contactName: getCustomerValue(invoice, customer, 'customer_name', ['name', 'book_name']),
    tel: getCustomerValue(invoice, customer, 'customer_phone', ['phone1', 'phone']),
    hp: normalizeText(customer?.mobile),
    email: normalizeText(customer?.email),
  }
}

function isTaxableInvoiceItem(item: InvoiceItem): boolean {
  const taxable = normalizeText(item.taxable).toLowerCase()
  return !['n', 'no', 'false', '0', '면세', '비과세'].includes(taxable)
}

function buildInvoiceItems(items: InvoiceItem[]): BarobillTaxInvoiceItemPayload[] {
  return items.map((item) => {
    const quantity = Math.max(0, Number(item.quantity ?? 0))
    const fallbackTotal = Math.max(0, Number(item.supply_amount ?? 0)) + Math.max(0, Number(item.tax_amount ?? 0))
    const vatIncludedTotal = getVatIncludedLineTotal(item.unit_price, quantity) || fallbackTotal
    const split = splitVatIncludedAmount(vatIncludedTotal, isTaxableInvoiceItem(item))
    const supplyUnitPrice = quantity > 0 ? Math.round(split.supplyAmount / quantity) : 0
    return {
      name: normalizeText(item.product_name),
      spec: normalizeText(item.unit) || undefined,
      quantity,
      unitPrice: supplyUnitPrice,
      supplyAmount: split.supplyAmount,
      taxAmount: split.taxAmount,
    }
  })
}

function getTaxInvoiceStatus(invoice: Invoice | null): InvoiceTaxInvoiceStatus {
  if (!invoice) return 'not_requested'
  return parseInvoiceAccountingMeta(invoice.memo as string | undefined).taxInvoiceStatus ?? 'not_requested'
}

export function TaxInvoiceRequestDialog({
  open,
  invoice,
  customer,
  items,
  isSubmitting = false,
  onClose,
  onSubmit,
}: TaxInvoiceRequestDialogProps) {
  const navigate = useNavigate()
  const [mailSent, setMailSent] = useState(true)
  const [smsRequested, setSmsRequested] = useState(false)

  useEffect(() => {
    if (!open) return
    setMailSent(true)
    setSmsRequested(false)
  }, [open, invoice?.Id])

  const customerParty = useMemo(
    () => (invoice ? buildCustomerParty(invoice, customer) : null),
    [customer, invoice],
  )
  const itemPayloads = useMemo(() => buildInvoiceItems(items), [items])
  const taxInvoiceAmounts = useMemo(() => {
    const supplyAmount = itemPayloads.reduce((sum, item) => sum + item.supplyAmount, 0)
    const taxAmount = itemPayloads.reduce((sum, item) => sum + item.taxAmount, 0)
    return { supplyAmount, taxAmount, totalAmount: supplyAmount + taxAmount }
  }, [itemPayloads])
  const status = getTaxInvoiceStatus(invoice)
  const fulfillmentStatus = invoice ? getInvoiceFulfillmentStatus(invoice.memo as string | undefined) : undefined
  const issueDate = invoice?.invoice_date?.slice(0, 10) || new Date().toISOString().slice(0, 10)
  const idempotencyKey = invoice ? buildBarobillIdempotencyKey(invoice) : ''
  const mgtKey = invoice ? buildBarobillMgtKey(invoice) : ''
  const activeOperator = loadActiveWorkOperatorProfile()
  const requestedBy = activeOperator?.operatorName || activeOperator?.label || 'crm-ui'
  const customerDetailId = useMemo(() => {
    if (typeof customer?.Id === 'number' && Number.isFinite(customer.Id)) return customer.Id
    if (typeof invoice?.customer_id === 'number' && Number.isFinite(invoice.customer_id)) return invoice.customer_id
    return null
  }, [customer?.Id, invoice?.customer_id])

  const validationErrors = useMemo(() => {
    const errors: string[] = []
    if (!invoice || !customerParty) {
      errors.push('명세표 정보를 불러오지 못했습니다')
      return errors
    }
    if (LOCKED_TAX_INVOICE_STATUSES.includes(status)) {
      errors.push('이미 발급 요청 또는 발급 완료된 명세표입니다')
    }
    if (fulfillmentStatus !== 'shipment_confirmed') {
      errors.push('출고확정 후 세금계산서를 발급할 수 있습니다')
    }
    if (!normalizeBizNo(customerParty.corpNum)) errors.push('공급받는자 사업자번호가 없습니다')
    else if (normalizeBizNo(customerParty.corpNum).length !== 10) errors.push('공급받는자 사업자번호는 숫자 10자리여야 합니다')
    if (!customerParty.corpName) errors.push('공급받는자 상호가 없습니다')
    if (!customerParty.ceoName) errors.push('공급받는자 대표자가 없습니다')
    if (!customerParty.email) errors.push('전자세금계산서 수신 이메일이 없습니다')
    else if (!isValidEmail(customerParty.email)) errors.push('전자세금계산서 수신 이메일 형식이 올바르지 않습니다')
    if (!idempotencyKey) errors.push('중복발급 방지 키를 만들 수 없습니다')
    if (taxInvoiceAmounts.supplyAmount <= 0) errors.push('공급가액이 0원입니다')
    if (taxInvoiceAmounts.taxAmount < 0) errors.push('세액을 확인해주세요')
    if (taxInvoiceAmounts.totalAmount <= 0) errors.push('합계금액이 0원입니다')
    if (itemPayloads.length === 0) errors.push('품목이 없습니다')
    if (itemPayloads.some((item) => !item.name || item.quantity <= 0)) {
      errors.push('품목명과 수량이 없는 품목이 있습니다')
    }
    return errors
  }, [customerParty, fulfillmentStatus, idempotencyKey, invoice, itemPayloads, status, taxInvoiceAmounts])

  const submitLabel = useMemo(() => {
    if (!invoice || !customerParty) return '정보 불러오는 중...'
    if (isSubmitting) return IS_PRODUCTION_ISSUE_ENABLED ? '실제 발급 요청 중...' : '테스트 발급 요청 중...'
    if (validationErrors.length > 0) return '정보 보완 필요'
    return IS_PRODUCTION_ISSUE_ENABLED ? '실제 세금계산서 발급' : '테스트 세금계산서 발급'
  }, [customerParty, invoice, isSubmitting, validationErrors.length])

  function handleOpenCustomerDetail() {
    if (!customerDetailId) return
    onClose()
    navigate(`/customers/${customerDetailId}`)
  }

  async function handleSubmit() {
    if (!invoice || !customerParty || validationErrors.length > 0) return

    await onSubmit({
      requestId: `barobill-${invoice.Id}-${Date.now()}`,
      idempotencyKey,
      invoiceId: invoice.Id,
      invoiceNo: normalizeInvoiceNo(invoice.invoice_no),
      issueType: 'normal',
      provider: 'barobill',
      mode: BAROBILL_TAX_INVOICE_MODE,
      providerMgtKey: mgtKey,
      writeDate: issueDate,
      sendEmail: mailSent,
      sendSms: smsRequested,
      supplier: {
        corpName: '프레스코21',
        ceoName: '서버 설정값',
        addr: 'CRM 서버 설정 기준',
      },
      buyer: {
        ...customerParty,
        corpNum: normalizeBizNo(customerParty.corpNum),
      },
      amounts: taxInvoiceAmounts,
      items: itemPayloads,
      requestedBy,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) onClose()
    }}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-[#5e8a6e]" />
            바로빌 전자세금계산서 발급
          </DialogTitle>
          <DialogDescription>
            {IS_PRODUCTION_ISSUE_ENABLED
              ? '운영 바로빌 서버로 실제 전자세금계산서를 발급합니다. 공급받는자 정보와 금액을 최종 확인해주세요.'
              : '테스트환경 n8n webhook으로만 발급을 요청합니다. 운영 발급은 별도 승인 전까지 CRM에서 차단됩니다.'}
          </DialogDescription>
        </DialogHeader>

        {!invoice || !customerParty ? (
          <div className="rounded-lg border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground" aria-busy="true">
            발급 요청 정보를 불러오는 중입니다.
          </div>
        ) : (
          <div className="space-y-4">
            {fulfillmentStatus !== 'shipment_confirmed' && (
              <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  아직 포장·출고확정 전입니다. 출고확정 후 세금계산서를 발급할 수 있습니다.
                </div>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <section className="rounded-lg border bg-white p-4">
                <h3 className="text-sm font-semibold text-foreground">공급자</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">상호</dt>
                    <dd className="font-medium">프레스코21</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">사업자 정보</dt>
                    <dd className="text-right text-muted-foreground">서버 설정값 사용</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">API/인증서</dt>
                    <dd className="text-right text-muted-foreground">브라우저 미노출</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">요청 작업자</dt>
                    <dd className="text-right text-muted-foreground">{requestedBy}</dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-lg border bg-white p-4">
                <h3 className="text-sm font-semibold text-foreground">공급받는자</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">상호</dt>
                    <dd className="text-right font-medium">{customerParty.corpName || '-'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">사업자번호</dt>
                    <dd className="font-mono text-right">{customerParty.corpNum || '-'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">대표자</dt>
                    <dd className="text-right">{customerParty.ceoName || '-'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">이메일</dt>
                    <dd className="max-w-[220px] truncate text-right">{customerParty.email || '-'}</dd>
                  </div>
                </dl>
              </section>
            </div>

            <section className="rounded-lg border bg-[#f8faf7] p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">발급 금액</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    입력 단가를 부가세 포함가로 보고 공급가액/세액을 자동 분리해 발급합니다.
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  작성일자 {issueDate} · 관리번호 <span className="font-mono">{mgtKey}</span>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-white px-3 py-2">
                  <div className="text-xs text-muted-foreground">공급가액</div>
                  <div className="mt-1 font-semibold">{formatAmount(taxInvoiceAmounts.supplyAmount)}</div>
                </div>
                <div className="rounded-lg bg-white px-3 py-2">
                  <div className="text-xs text-muted-foreground">세액</div>
                  <div className="mt-1 font-semibold">{formatAmount(taxInvoiceAmounts.taxAmount)}</div>
                </div>
                <div className="rounded-lg bg-white px-3 py-2">
                  <div className="text-xs text-muted-foreground">합계금액</div>
                  <div className="mt-1 font-semibold">{formatAmount(taxInvoiceAmounts.totalAmount)}</div>
                </div>
              </div>
            </section>

            <section className="rounded-lg border bg-white p-4">
              <h3 className="text-sm font-semibold text-foreground">품목 {itemPayloads.length.toLocaleString()}개</h3>
              <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">품목</th>
                      <th className="px-3 py-2 text-right font-medium">수량</th>
                      <th className="px-3 py-2 text-right font-medium">공급가액</th>
                      <th className="px-3 py-2 text-right font-medium">세액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemPayloads.map((item, index) => (
                      <tr key={`${item.name}-${index}`} className="border-t">
                        <td className="px-3 py-2">{item.name || '품목명 없음'}</td>
                        <td className="px-3 py-2 text-right">{item.quantity.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">{formatAmount(item.supplyAmount)}</td>
                        <td className="px-3 py-2 text-right">{formatAmount(item.taxAmount)}</td>
                      </tr>
                    ))}
                    {itemPayloads.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">품목이 없습니다</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-lg border bg-white p-4">
              <h3 className="text-sm font-semibold text-foreground">발송 옵션</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="flex items-start gap-2 rounded-lg border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-[#7d9675]"
                    checked={mailSent}
                    onChange={(event) => setMailSent(event.target.checked)}
                  />
                  <span>
                    <span className="flex items-center gap-1 font-medium">
                      <Mail className="h-3.5 w-3.5" />
                      메일 발송
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">무료 · 기본 ON</span>
                  </span>
                </label>
                <label className="flex items-start gap-2 rounded-lg border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-[#7d9675]"
                    checked={smsRequested}
                    onChange={(event) => setSmsRequested(event.target.checked)}
                  />
                  <span>
                    <span className="flex items-center gap-1 font-medium">
                      <MessageSquare className="h-3.5 w-3.5" />
                      문자 발송
                    </span>
                    <span className="mt-0.5 block text-xs text-amber-700">별도 과금 · 기본 OFF</span>
                  </span>
                </label>
              </div>
            </section>

            <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
              {IS_PRODUCTION_ISSUE_ENABLED
                ? '실제 바로빌 운영 서버로 발급 요청됩니다. 발급 후 취소·수정은 별도 절차가 필요하며, 같은 명세표는 CRM/n8n idempotency key로 중복 발급을 차단합니다.'
                : '실제 바로빌 테스트 서버로 발급 요청됩니다. 같은 명세표는 CRM/n8n idempotency key로 중복 발급을 차단합니다. 운영 발급 execute는 별도 승인 전까지 비활성입니다.'}
              <div className="mt-1 font-mono text-[11px] text-red-600">{idempotencyKey}</div>
            </div>

            {validationErrors.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="font-medium">요청 전 확인 필요</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {validationErrors.map((error) => <li key={error}>{error}</li>)}
                </ul>
                <p className="mt-3 text-xs">
                  고객 상세 기본정보에서 사업자번호, 대표자, 전자세금계산서 수신 이메일을 보완한 뒤 다시 발급해주세요.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>닫기</Button>
          {validationErrors.length > 0 && customerDetailId && (
            <Button variant="outline" onClick={handleOpenCustomerDetail}>
              고객 정보 보완
            </Button>
          )}
          <Button
            className="bg-[#7d9675] text-white hover:bg-[#6a8462]"
            disabled={!invoice || validationErrors.length > 0 || isSubmitting}
            onClick={() => void handleSubmit()}
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
