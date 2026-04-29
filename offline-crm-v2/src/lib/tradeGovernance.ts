import type { Invoice } from '@/lib/api'
import {
  parseInvoiceAccountingMeta,
  type InvoiceFulfillmentStatus,
  type InvoiceRevenuePostingStatus,
  type InvoiceTaxInvoiceStatus,
} from '@/lib/accountingMeta'
import { getInvoiceSettlementSnapshot } from '@/lib/receivables'

export type TradeDocumentKind = 'billing' | 'receipt' | 'invoice' | 'quote' | 'delivery' | 'claim' | 'unknown'
export type TradeFulfillmentStatus = InvoiceFulfillmentStatus | 'legacy'
export type TradeRevenuePostingStatus = InvoiceRevenuePostingStatus | 'legacy'
export type TradePaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overpaid'
export type TradeFollowUpStatus = 'none' | 'needs_plan' | 'scheduled' | 'due_today' | 'overdue' | 'completed'
export type TradeTaxInvoiceReadiness =
  | 'blocked_by_fulfillment'
  | 'available'
  | 'in_progress'
  | 'issued'
  | 'needs_attention'
  | 'not_applicable'

export type TradeNextActionCode =
  | 'confirm_shipment'
  | 'register_follow_up_payment'
  | 'check_follow_up_payment'
  | 'review_overpayment'
  | 'request_tax_invoice'
  | 'review_tax_invoice_error'
  | 'none'

export interface TradeNextAction {
  code: TradeNextActionCode
  label: string
  priority: 'low' | 'medium' | 'high'
}

export interface TradeGovernanceState {
  invoiceId: number
  invoiceNo?: string
  customerId?: number
  customerName: string
  documentKind: TradeDocumentKind
  documentLabel: string
  fulfillmentStatus: TradeFulfillmentStatus
  fulfillmentLabel: string
  revenuePostingStatus: TradeRevenuePostingStatus
  revenuePostingLabel: string
  paymentStatus: TradePaymentStatus
  paymentLabel: string
  followUpStatus: TradeFollowUpStatus
  followUpLabel: string
  taxInvoiceStatus: InvoiceTaxInvoiceStatus
  taxInvoiceReadiness: TradeTaxInvoiceReadiness
  taxInvoiceLabel: string
  totalAmount: number
  cashPaidAmount: number
  depositUsedAmount: number
  settledAmount: number
  remainingAmount: number
  overpaidAmount: number
  paymentPromiseDueDate?: string
  nextActions: TradeNextAction[]
}

export interface TradeGovernanceOptions {
  today?: string | Date
}

export type ShipmentDryRunCandidateReason = 'paid_without_shipment_confirmation'
export type ShipmentDryRunExclusionReason =
  | 'missing_invoice_id'
  | 'already_shipment_confirmed'
  | 'voided_or_adjusted'
  | 'not_paid'
  | 'remaining_balance'
  | 'zero_or_negative_total'

export interface HistoricalPaidShipmentCandidate {
  invoiceId: number
  invoiceNo?: string
  invoiceDate?: string
  customerId?: number
  customerName: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  taxInvoiceStatus: InvoiceTaxInvoiceStatus
  reason: ShipmentDryRunCandidateReason
}

export interface HistoricalPaidShipmentExclusion {
  invoiceId?: number
  invoiceNo?: string
  customerName: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  reason: ShipmentDryRunExclusionReason
}

export interface HistoricalPaidShipmentDryRun {
  candidates: HistoricalPaidShipmentCandidate[]
  exclusions: HistoricalPaidShipmentExclusion[]
  candidateCount: number
  excludedCount: number
  candidateTotalAmount: number
  candidatePaidAmount: number
  taxInvoiceImpactCount: number
  byCustomer: Array<{
    customerId?: number
    customerName: string
    count: number
    totalAmount: number
  }>
}

function toNonNegativeInteger(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0
}

function normalizeDateKey(value?: string | Date): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  }
  return new Date().toISOString().slice(0, 10)
}

function normalizeDocumentKind(value: unknown): TradeDocumentKind {
  if (typeof value !== 'string') return 'unknown'
  const normalized = value.trim().toLowerCase()
  if (!normalized) return 'unknown'
  if (normalized === '청구' || normalized === 'bill' || normalized === 'billing') return 'billing'
  if (normalized === '영수' || normalized === 'receipt') return 'receipt'
  if (normalized.includes('명세') || normalized === 'invoice') return 'invoice'
  if (normalized.includes('견적') || normalized === 'quote' || normalized === 'estimate') return 'quote'
  if (normalized.includes('납품') || normalized === 'delivery') return 'delivery'
  if (normalized.includes('청구') || normalized === 'claim') return 'claim'
  return 'unknown'
}

function getDocumentLabel(documentKind: TradeDocumentKind): string {
  switch (documentKind) {
    case 'billing':
      return '청구'
    case 'receipt':
      return '영수'
    case 'invoice':
      return '명세표'
    case 'quote':
      return '견적'
    case 'delivery':
      return '납품'
    case 'claim':
      return '청구문서'
    case 'unknown':
      return '문서'
  }
}

function getFulfillmentLabel(status: TradeFulfillmentStatus): string {
  switch (status) {
    case 'legacy':
      return '기존매출'
    case 'ordered':
      return '주문접수'
    case 'preparing':
      return '출고준비'
    case 'shipment_confirmed':
      return '출고완료'
    case 'voided':
      return '취소'
    case 'adjusted':
      return '조정'
  }
}

function getRevenuePostingLabel(status: TradeRevenuePostingStatus): string {
  switch (status) {
    case 'legacy':
      return '기존 기준'
    case 'pending':
      return '매출대기'
    case 'posted':
      return '매출반영'
    case 'reversed':
      return '매출취소'
    case 'adjusted':
      return '매출조정'
  }
}

function getPaymentLabel(status: TradePaymentStatus): string {
  switch (status) {
    case 'unpaid':
      return '미입금'
    case 'partial':
      return '일부입금'
    case 'paid':
      return '완납'
    case 'overpaid':
      return '초과입금 확인필요'
  }
}

function getFollowUpLabel(status: TradeFollowUpStatus): string {
  switch (status) {
    case 'none':
      return '후속입금 없음'
    case 'needs_plan':
      return '출고완료 미수'
    case 'scheduled':
      return '후속입금 예정'
    case 'due_today':
      return '오늘 입금 확인'
    case 'overdue':
      return '입금 약속 지남'
    case 'completed':
      return '후속입금 완료'
  }
}

function getTaxInvoiceReadiness(
  fulfillmentStatus: TradeFulfillmentStatus,
  taxInvoiceStatus: InvoiceTaxInvoiceStatus,
): TradeTaxInvoiceReadiness {
  if (taxInvoiceStatus === 'issued' || taxInvoiceStatus === 'cancelled' || taxInvoiceStatus === 'amended') {
    return 'issued'
  }
  if (taxInvoiceStatus === 'requesting' || taxInvoiceStatus === 'requested' || taxInvoiceStatus === 'cancel_requested') {
    return 'in_progress'
  }
  if (taxInvoiceStatus === 'failed') return 'needs_attention'
  if (fulfillmentStatus !== 'shipment_confirmed' && fulfillmentStatus !== 'legacy') return 'blocked_by_fulfillment'
  return 'available'
}

function getTaxInvoiceLabel(readiness: TradeTaxInvoiceReadiness, status: InvoiceTaxInvoiceStatus): string {
  if (status === 'failed') return '세금계산서 실패'
  switch (readiness) {
    case 'blocked_by_fulfillment':
      return '출고확정 후 발급'
    case 'available':
      return '세금계산서 발급가능'
    case 'in_progress':
      return '세금계산서 처리중'
    case 'issued':
      return '세금계산서 처리완료'
    case 'needs_attention':
      return '세금계산서 확인필요'
    case 'not_applicable':
      return '세금계산서 대상 아님'
  }
}

function calculatePaymentStatus(
  totalAmount: number,
  settledAmount: number,
  remainingAmount: number,
  overpaidAmount: number,
): TradePaymentStatus {
  if (overpaidAmount > 0) return 'overpaid'
  if (totalAmount <= 0 || remainingAmount <= 0) return 'paid'
  return settledAmount > 0 ? 'partial' : 'unpaid'
}

function calculateFollowUpStatus(params: {
  fulfillmentStatus: TradeFulfillmentStatus
  remainingAmount: number
  dueDate?: string
  reminderEnabled?: boolean
  today: string
}): TradeFollowUpStatus {
  if (params.remainingAmount <= 0) {
    return params.reminderEnabled || params.dueDate ? 'completed' : 'none'
  }
  if (params.fulfillmentStatus !== 'shipment_confirmed') return 'none'
  if (!params.reminderEnabled || !params.dueDate) return 'needs_plan'
  if (params.dueDate === params.today) return 'due_today'
  if (params.dueDate < params.today) return 'overdue'
  return 'scheduled'
}

function buildNextActions(state: Omit<TradeGovernanceState, 'nextActions'>): TradeNextAction[] {
  const actions: TradeNextAction[] = []

  if (state.fulfillmentStatus !== 'shipment_confirmed' && state.paymentStatus === 'paid') {
    actions.push({ code: 'confirm_shipment', label: '출고완료 처리', priority: 'high' })
  }
  if (state.followUpStatus === 'needs_plan') {
    actions.push({ code: 'register_follow_up_payment', label: '후속입금 예정 등록', priority: 'high' })
  }
  if (state.followUpStatus === 'due_today' || state.followUpStatus === 'overdue') {
    actions.push({ code: 'check_follow_up_payment', label: '입금 확인', priority: 'high' })
  }
  if (state.overpaidAmount > 0) {
    actions.push({ code: 'review_overpayment', label: '초과입금 분리', priority: 'high' })
  }
  if (state.taxInvoiceReadiness === 'available') {
    actions.push({ code: 'request_tax_invoice', label: '세금계산서 발급 검토', priority: 'medium' })
  }
  if (state.taxInvoiceReadiness === 'needs_attention') {
    actions.push({ code: 'review_tax_invoice_error', label: '세금계산서 오류 확인', priority: 'high' })
  }

  return actions.length > 0 ? actions : [{ code: 'none', label: '추가 작업 없음', priority: 'low' }]
}

export function getTradeGovernanceState(
  invoice: Invoice,
  options: TradeGovernanceOptions = {},
): TradeGovernanceState {
  const meta = parseInvoiceAccountingMeta(typeof invoice.memo === 'string' ? invoice.memo : undefined)
  const settlement = getInvoiceSettlementSnapshot(invoice)
  const totalAmount = settlement.totalAmount
  const cashPaidAmount = settlement.cashPaidAmount
  const depositUsedAmount = settlement.depositUsedAmount
  const settledRawAmount = cashPaidAmount + depositUsedAmount
  const overpaidAmount = Math.max(0, settledRawAmount - totalAmount)
  const paymentStatus = calculatePaymentStatus(
    totalAmount,
    settlement.settledAmount,
    settlement.remainingAmount,
    overpaidAmount,
  )
  const fulfillmentStatus = meta.fulfillmentStatus ?? 'legacy'
  const revenuePostingStatus = meta.revenuePostingStatus ?? 'legacy'
  const taxInvoiceStatus = meta.taxInvoiceStatus ?? 'not_requested'
  const today = normalizeDateKey(options.today)
  const paymentPromiseDueDate = meta.paymentReminder?.dueDate
  const followUpStatus = calculateFollowUpStatus({
    fulfillmentStatus,
    remainingAmount: settlement.remainingAmount,
    dueDate: paymentPromiseDueDate,
    reminderEnabled: meta.paymentReminder?.enabled,
    today,
  })
  const documentKind = normalizeDocumentKind(invoice.receipt_type ?? invoice.status)
  const taxInvoiceReadiness = getTaxInvoiceReadiness(fulfillmentStatus, taxInvoiceStatus)

  const stateWithoutActions: Omit<TradeGovernanceState, 'nextActions'> = {
    invoiceId: invoice.Id,
    invoiceNo: invoice.invoice_no,
    customerId: invoice.customer_id,
    customerName: invoice.customer_name?.trim() || '미확인 고객',
    documentKind,
    documentLabel: getDocumentLabel(documentKind),
    fulfillmentStatus,
    fulfillmentLabel: getFulfillmentLabel(fulfillmentStatus),
    revenuePostingStatus,
    revenuePostingLabel: getRevenuePostingLabel(revenuePostingStatus),
    paymentStatus,
    paymentLabel: getPaymentLabel(paymentStatus),
    followUpStatus,
    followUpLabel: getFollowUpLabel(followUpStatus),
    taxInvoiceStatus,
    taxInvoiceReadiness,
    taxInvoiceLabel: getTaxInvoiceLabel(taxInvoiceReadiness, taxInvoiceStatus),
    totalAmount,
    cashPaidAmount,
    depositUsedAmount,
    settledAmount: settlement.settledAmount,
    remainingAmount: settlement.remainingAmount,
    overpaidAmount,
    paymentPromiseDueDate,
  }

  return {
    ...stateWithoutActions,
    nextActions: buildNextActions(stateWithoutActions),
  }
}

export function buildStatusBadgeRows(state: TradeGovernanceState): [string, string, string] {
  const exceptionLabels = [
    state.followUpStatus === 'none' || state.followUpStatus === 'completed' ? '' : state.followUpLabel,
    state.overpaidAmount > 0 ? '초과입금 확인필요' : '',
    state.taxInvoiceReadiness === 'available' || state.taxInvoiceReadiness === 'needs_attention'
      ? state.taxInvoiceLabel
      : '',
  ].filter(Boolean)

  return [
    state.fulfillmentLabel,
    state.overpaidAmount > 0 ? `${state.paymentLabel} · 예치금/환불 검토` : state.paymentLabel,
    exceptionLabels.length > 0 ? exceptionLabels.join(' · ') : '예외 없음',
  ]
}

function isVoidedOrAdjusted(status: TradeFulfillmentStatus): boolean {
  return status === 'voided' || status === 'adjusted'
}

function buildCustomerKey(invoice: Invoice): string {
  return `${invoice.customer_id ?? 'none'}:${invoice.customer_name?.trim() || '미확인 고객'}`
}

export function buildHistoricalPaidShipmentDryRun(invoices: Invoice[]): HistoricalPaidShipmentDryRun {
  const candidates: HistoricalPaidShipmentCandidate[] = []
  const exclusions: HistoricalPaidShipmentExclusion[] = []

  for (const invoice of invoices) {
    const state = getTradeGovernanceState(invoice)
    const exclusionBase = {
      invoiceId: invoice.Id,
      invoiceNo: invoice.invoice_no,
      customerName: state.customerName,
      totalAmount: state.totalAmount,
      paidAmount: state.cashPaidAmount,
      remainingAmount: state.remainingAmount,
    }

    if (!invoice.Id) {
      exclusions.push({ ...exclusionBase, invoiceId: undefined, reason: 'missing_invoice_id' })
      continue
    }
    if (state.fulfillmentStatus === 'shipment_confirmed') {
      exclusions.push({ ...exclusionBase, reason: 'already_shipment_confirmed' })
      continue
    }
    if (isVoidedOrAdjusted(state.fulfillmentStatus)) {
      exclusions.push({ ...exclusionBase, reason: 'voided_or_adjusted' })
      continue
    }
    if (state.totalAmount <= 0) {
      exclusions.push({ ...exclusionBase, reason: 'zero_or_negative_total' })
      continue
    }
    if (state.remainingAmount > 0) {
      exclusions.push({ ...exclusionBase, reason: 'remaining_balance' })
      continue
    }
    if (state.paymentStatus !== 'paid' && state.paymentStatus !== 'overpaid') {
      exclusions.push({ ...exclusionBase, reason: 'not_paid' })
      continue
    }

    candidates.push({
      invoiceId: invoice.Id,
      invoiceNo: invoice.invoice_no,
      invoiceDate: invoice.invoice_date,
      customerId: invoice.customer_id,
      customerName: state.customerName,
      totalAmount: state.totalAmount,
      paidAmount: state.cashPaidAmount,
      remainingAmount: state.remainingAmount,
      taxInvoiceStatus: state.taxInvoiceStatus,
      reason: 'paid_without_shipment_confirmation',
    })
  }

  const customerSummary = new Map<string, { customerId?: number; customerName: string; count: number; totalAmount: number }>()
  for (const candidate of candidates) {
    const key = `${candidate.customerId ?? 'none'}:${candidate.customerName}`
    const current = customerSummary.get(key) ?? {
      customerId: candidate.customerId,
      customerName: candidate.customerName,
      count: 0,
      totalAmount: 0,
    }
    current.count += 1
    current.totalAmount += candidate.totalAmount
    customerSummary.set(key, current)
  }

  return {
    candidates,
    exclusions,
    candidateCount: candidates.length,
    excludedCount: exclusions.length,
    candidateTotalAmount: candidates.reduce((sum, candidate) => sum + candidate.totalAmount, 0),
    candidatePaidAmount: candidates.reduce((sum, candidate) => sum + toNonNegativeInteger(candidate.paidAmount), 0),
    taxInvoiceImpactCount: candidates.filter((candidate) => candidate.taxInvoiceStatus === 'not_requested').length,
    byCustomer: Array.from(customerSummary.values()).sort((left, right) => {
      if (right.totalAmount !== left.totalAmount) return right.totalAmount - left.totalAmount
      return left.customerName.localeCompare(right.customerName, 'ko')
    }),
  }
}

export function groupTradeStatesByCustomer(states: TradeGovernanceState[]): Map<string, TradeGovernanceState[]> {
  const result = new Map<string, TradeGovernanceState[]>()
  for (const state of states) {
    const key = `${state.customerId ?? 'none'}:${state.customerName}`
    const list = result.get(key) ?? []
    list.push(state)
    result.set(key, list)
  }
  return result
}

export function buildTradeWorkQueue(invoices: Invoice[], options: TradeGovernanceOptions = {}) {
  const states = invoices.map((invoice) => getTradeGovernanceState(invoice, options))
  return {
    shipmentReady: states.filter((state) => state.fulfillmentStatus !== 'shipment_confirmed' && state.paymentStatus === 'paid'),
    shippedUnpaid: states.filter((state) => state.fulfillmentStatus === 'shipment_confirmed' && state.remainingAmount > 0),
    followUpDue: states.filter((state) => state.followUpStatus === 'due_today' || state.followUpStatus === 'overdue'),
    overpaymentReview: states.filter((state) => state.overpaidAmount > 0),
    taxInvoiceAvailable: states.filter((state) => state.taxInvoiceReadiness === 'available'),
  }
}

export function getCustomerGroupingKey(invoice: Invoice): string {
  return buildCustomerKey(invoice)
}
