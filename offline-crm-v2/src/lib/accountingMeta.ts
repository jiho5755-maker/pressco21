export interface CustomerAccountingEvent {
  type: 'deposit_added' | 'deposit_used' | 'refund_pending_added' | 'refund_paid' | 'refund_pending_cleared'
  amount: number
  date: string
  method?: string
  operator?: string
  accountId?: string
  accountLabel?: string
  createdAt?: string
  note?: string
  relatedInvoiceId?: number
}

export interface CustomerAccountingMetaState {
  depositBalance: number
  refundPendingBalance: number
  depositorAliases: string[]
  addressLabels: string[]
  autoDepositDisabled: boolean
  autoDepositPriority: number
  events: CustomerAccountingEvent[]
}

export interface InvoiceAccountingMetaState {
  depositUsedAmount: number
  discountAmount?: number
  customerAddressKey?: string
  internalMemo?: string
  fulfillmentStatus?: InvoiceFulfillmentStatus
  shipmentConfirmedAt?: string
  revenueRecognizedDate?: string
  revenuePostedAt?: string
  revenuePostingStatus?: InvoiceRevenuePostingStatus
  salesLedgerId?: string
  salesLedgerIdempotencyKey?: string
  taxInvoiceStatus?: InvoiceTaxInvoiceStatus
  taxInvoice?: InvoiceTaxInvoiceMeta
  paymentReminder?: InvoicePaymentReminderState
  paymentHistory: InvoicePaymentHistoryEntry[]
}

export type InvoiceFulfillmentStatus = 'ordered' | 'preparing' | 'shipment_confirmed' | 'voided' | 'adjusted'
export type InvoiceRevenuePostingStatus = 'pending' | 'posted' | 'reversed' | 'adjusted'
export type InvoiceTaxInvoiceStatus =
  | 'not_requested'
  | 'requesting'
  | 'requested'
  | 'issued'
  | 'failed'
  | 'cancel_requested'
  | 'cancelled'

export type InvoiceTaxInvoiceProvider = 'barobill'
export type InvoiceTaxInvoiceIssueType = 'normal' | 'reverse' | 'consignment' | 'amendment'

export interface InvoiceTaxInvoiceMeta {
  provider?: InvoiceTaxInvoiceProvider
  issueType?: InvoiceTaxInvoiceIssueType
  mgtKey?: string
  idempotencyKey?: string
  requestId?: string
  requestedAt?: string
  requestedBy?: string
  lastStatusSyncedAt?: string
  ntsConfirmNum?: string
  issuedAt?: string
  statusCode?: string
  statusMessage?: string
  errorCode?: string
  errorMessage?: string
  mailSent?: boolean
  smsRequested?: boolean
}

export interface InvoicePaymentReminderState {
  dueDate?: string
  amount?: number
  enabled: boolean
  leadDays: number
  requestedAt?: string
  requestedBy?: string
  webhookStatus?: 'pending' | 'ok' | 'error'
  webhookMessage?: string
}

export interface InvoicePaymentHistoryEntry {
  amount: number
  date: string
  method?: string
  operator?: string
  accountId?: string
  accountLabel?: string
  createdAt?: string
  note?: string
}

const CUSTOMER_ACCOUNTING_META_PREFIX = '[ACCOUNTING_CUSTOMER_META]'
const INVOICE_ACCOUNTING_META_PREFIX = '[ACCOUNTING_INVOICE_META]'
const HIDDEN_MEMO_PREFIXES = [
  '[LEGACY_RECEIVABLE_META]',
  '[LEGACY_PAYABLE_META]',
  CUSTOMER_ACCOUNTING_META_PREFIX,
  INVOICE_ACCOUNTING_META_PREFIX,
]

function normalizeMemo(value: string | undefined): string {
  return (value ?? '').replace(/\r\n/g, '\n')
}

function parseInteger(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : 0
  if (typeof value !== 'string') return 0
  const parsed = Number(value.replace(/,/g, '').trim())
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0
}

function sanitizeAlias(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized ? normalized : null
}

function sanitizeAliasList(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  return values
    .map(sanitizeAlias)
    .filter((entry): entry is string => entry !== null)
    .filter((entry, index, list) => list.indexOf(entry) === index)
}

function sanitizeAddressLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized ? normalized : null
}

function sanitizeAddressLabelList(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  return values.map(sanitizeAddressLabel).filter((entry): entry is string => entry !== null)
}

function sanitizeEvent(entry: Partial<CustomerAccountingEvent>): CustomerAccountingEvent | null {
  const amount = Math.max(0, parseInteger(entry.amount))
  const date = typeof entry.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.date)
    ? entry.date
    : ''
  const type = entry.type
  if (
    !amount ||
    !date ||
    !type ||
    !['deposit_added', 'deposit_used', 'refund_pending_added', 'refund_paid', 'refund_pending_cleared'].includes(type)
  ) {
    return null
  }

  return {
    type,
    amount,
    date,
    method: typeof entry.method === 'string' && entry.method.trim() ? entry.method.trim() : undefined,
    operator: typeof entry.operator === 'string' && entry.operator.trim() ? entry.operator.trim() : undefined,
    accountId: typeof entry.accountId === 'string' && entry.accountId.trim() ? entry.accountId.trim() : undefined,
    accountLabel: typeof entry.accountLabel === 'string' && entry.accountLabel.trim() ? entry.accountLabel.trim() : undefined,
    createdAt: typeof entry.createdAt === 'string' && entry.createdAt.trim() ? entry.createdAt.trim() : undefined,
    note: typeof entry.note === 'string' && entry.note.trim() ? entry.note.trim() : undefined,
    relatedInvoiceId: typeof entry.relatedInvoiceId === 'number' && Number.isFinite(entry.relatedInvoiceId)
      ? Math.trunc(entry.relatedInvoiceId)
      : undefined,
  }
}

function sanitizeDate(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : undefined
}

function sanitizeIsoLike(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return /^[0-9]{4}-[0-9]{2}-[0-9]{2}(?:T[0-9:.+-Z]+)?$/.test(trimmed)
    ? trimmed.slice(0, 40)
    : undefined
}

function sanitizeShortKey(value: unknown, maxLength = 120): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, maxLength) : undefined
}

function sanitizeFulfillmentStatus(value: unknown): InvoiceFulfillmentStatus | undefined {
  return value === 'ordered' ||
    value === 'preparing' ||
    value === 'shipment_confirmed' ||
    value === 'voided' ||
    value === 'adjusted'
    ? value
    : undefined
}

function sanitizeRevenuePostingStatus(value: unknown): InvoiceRevenuePostingStatus | undefined {
  return value === 'pending' || value === 'posted' || value === 'reversed' || value === 'adjusted'
    ? value
    : undefined
}

function sanitizeTaxInvoiceStatus(value: unknown): InvoiceTaxInvoiceStatus | undefined {
  return value === 'not_requested' ||
    value === 'requesting' ||
    value === 'requested' ||
    value === 'issued' ||
    value === 'failed' ||
    value === 'cancel_requested' ||
    value === 'cancelled'
    ? value
    : undefined
}

function sanitizeTaxInvoiceProvider(value: unknown): InvoiceTaxInvoiceProvider | undefined {
  return value === 'barobill' ? value : undefined
}

function sanitizeTaxInvoiceIssueType(value: unknown): InvoiceTaxInvoiceIssueType | undefined {
  return value === 'normal' || value === 'reverse' || value === 'consignment' || value === 'amendment'
    ? value
    : undefined
}

function sanitizeOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function sanitizeMultilineText(value: unknown, maxLength = 2000): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = normalizeMemo(value)
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim()
  return normalized ? normalized.slice(0, maxLength) : undefined
}

function sanitizeInvoicePaymentReminder(value: unknown): InvoicePaymentReminderState | undefined {
  if (!value || typeof value !== 'object') return undefined
  const entry = value as Partial<InvoicePaymentReminderState>
  const dueDate = sanitizeDate(entry.dueDate)
  const amount = Math.max(0, parseInteger(entry.amount))
  const enabled = entry.enabled === true
  const leadDays = Math.max(0, Math.min(30, parseInteger(entry.leadDays)))
  const requestedAt = typeof entry.requestedAt === 'string' && entry.requestedAt.trim()
    ? entry.requestedAt.trim().slice(0, 40)
    : undefined
  const requestedBy = typeof entry.requestedBy === 'string' && entry.requestedBy.trim()
    ? entry.requestedBy.trim().slice(0, 80)
    : undefined
  const webhookStatus = entry.webhookStatus === 'ok' || entry.webhookStatus === 'error' || entry.webhookStatus === 'pending'
    ? entry.webhookStatus
    : undefined
  const webhookMessage = sanitizeMultilineText(entry.webhookMessage, 300)

  if (!dueDate && amount <= 0 && !enabled) return undefined
  return {
    dueDate,
    amount,
    enabled,
    leadDays,
    requestedAt,
    requestedBy,
    webhookStatus,
    webhookMessage,
  }
}

function sanitizeInvoiceTaxInvoiceMeta(value: unknown): InvoiceTaxInvoiceMeta | undefined {
  if (!value || typeof value !== 'object') return undefined
  const entry = value as Partial<InvoiceTaxInvoiceMeta>
  const meta: InvoiceTaxInvoiceMeta = {
    provider: sanitizeTaxInvoiceProvider(entry.provider),
    issueType: sanitizeTaxInvoiceIssueType(entry.issueType),
    mgtKey: sanitizeShortKey(entry.mgtKey, 80),
    idempotencyKey: sanitizeShortKey(entry.idempotencyKey, 160),
    requestId: sanitizeShortKey(entry.requestId, 120),
    requestedAt: sanitizeIsoLike(entry.requestedAt),
    requestedBy: sanitizeShortKey(entry.requestedBy, 80),
    lastStatusSyncedAt: sanitizeIsoLike(entry.lastStatusSyncedAt),
    ntsConfirmNum: sanitizeShortKey(entry.ntsConfirmNum, 80),
    issuedAt: sanitizeIsoLike(entry.issuedAt),
    statusCode: sanitizeShortKey(entry.statusCode, 80),
    statusMessage: sanitizeMultilineText(entry.statusMessage, 300),
    errorCode: sanitizeShortKey(entry.errorCode, 80),
    errorMessage: sanitizeMultilineText(entry.errorMessage, 500),
    mailSent: sanitizeOptionalBoolean(entry.mailSent),
    smsRequested: sanitizeOptionalBoolean(entry.smsRequested),
  }

  const hasValue = Object.values(meta).some((field) => field !== undefined)
  return hasValue ? meta : undefined
}

function sanitizeInvoicePaymentHistoryEntry(entry: Partial<InvoicePaymentHistoryEntry>): InvoicePaymentHistoryEntry | null {
  const amount = Math.max(0, parseInteger(entry.amount))
  const date = sanitizeDate(entry.date)
    ?? (typeof entry.createdAt === 'string' ? sanitizeDate(entry.createdAt.slice(0, 10)) : undefined)

  if (!amount || !date) return null

  return {
    amount,
    date,
    method: typeof entry.method === 'string' && entry.method.trim() ? entry.method.trim().slice(0, 40) : undefined,
    operator: typeof entry.operator === 'string' && entry.operator.trim() ? entry.operator.trim().slice(0, 80) : undefined,
    accountId: typeof entry.accountId === 'string' && entry.accountId.trim() ? entry.accountId.trim().slice(0, 80) : undefined,
    accountLabel: typeof entry.accountLabel === 'string' && entry.accountLabel.trim() ? entry.accountLabel.trim().slice(0, 80) : undefined,
    createdAt: typeof entry.createdAt === 'string' && entry.createdAt.trim() ? entry.createdAt.trim().slice(0, 40) : undefined,
    note: sanitizeMultilineText(entry.note, 300),
  }
}

function stripMetaLine(memo: string, prefix: string): string[] {
  return memo
    .split('\n')
    .filter((line) => line.trim() && !line.trim().startsWith(prefix))
}

function findHiddenMemoPrefixIndex(line: string): number {
  let result = -1
  for (const prefix of HIDDEN_MEMO_PREFIXES) {
    const index = line.indexOf(prefix)
    if (index === -1) continue
    if (result === -1 || index < result) result = index
  }
  return result
}

function stripHiddenMemoSuffix(line: string): string {
  const index = findHiddenMemoPrefixIndex(line)
  if (index === -1) return line.trimEnd()
  if (index === 0) return ''
  return line.slice(0, index).trimEnd()
}

function extractHiddenMemoLines(memo: string | undefined): string[] {
  const hiddenLines: string[] = []
  for (const rawLine of normalizeMemo(memo).split('\n')) {
    const index = findHiddenMemoPrefixIndex(rawLine)
    if (index === -1) continue
    const hiddenLine = rawLine.slice(index).trim()
    if (!hiddenLine) continue
    if (!hiddenLines.includes(hiddenLine)) hiddenLines.push(hiddenLine)
  }
  return hiddenLines
}

export function getDisplayMemo(memo?: string): string {
  return normalizeMemo(memo)
    .split('\n')
    .map(stripHiddenMemoSuffix)
    .filter((line) => line.trim())
    .join('\n')
    .trim()
}

export function mergeDisplayMemo(baseMemo: string | undefined, displayMemo: string | undefined): string {
  const visibleLines = normalizeMemo(displayMemo)
    .split('\n')
    .map(stripHiddenMemoSuffix)
    .filter((line) => line.trim())
  const hiddenLines = extractHiddenMemoLines(baseMemo)
  return [...visibleLines, ...hiddenLines].join('\n').trim()
}

export function parseCustomerAccountingMeta(memo?: string): CustomerAccountingMetaState {
  const metaLine = normalizeMemo(memo)
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith(CUSTOMER_ACCOUNTING_META_PREFIX))

  if (!metaLine) {
    return { depositBalance: 0, refundPendingBalance: 0, depositorAliases: [], addressLabels: [], autoDepositDisabled: false, autoDepositPriority: 0, events: [] }
  }

  try {
    const parsed = JSON.parse(metaLine.slice(CUSTOMER_ACCOUNTING_META_PREFIX.length).trim()) as {
      depositBalance?: number
      refundPendingBalance?: number
      depositorAliases?: string[]
      addressLabels?: string[]
      autoDepositDisabled?: boolean
      autoDepositPriority?: number
      events?: Partial<CustomerAccountingEvent>[]
    }
    const events = Array.isArray(parsed.events)
      ? parsed.events.map(sanitizeEvent).filter((entry): entry is CustomerAccountingEvent => entry !== null)
      : []
    return {
      depositBalance: Math.max(0, parseInteger(parsed.depositBalance)),
      refundPendingBalance: Math.max(0, parseInteger(parsed.refundPendingBalance)),
      depositorAliases: sanitizeAliasList(parsed.depositorAliases),
      addressLabels: sanitizeAddressLabelList(parsed.addressLabels),
      autoDepositDisabled: parsed.autoDepositDisabled === true,
      autoDepositPriority: Math.max(0, parseInteger(parsed.autoDepositPriority)),
      events,
    }
  } catch {
    return { depositBalance: 0, refundPendingBalance: 0, depositorAliases: [], addressLabels: [], autoDepositDisabled: false, autoDepositPriority: 0, events: [] }
  }
}

export function serializeCustomerAccountingMeta(
  memo: string | undefined,
  nextState: CustomerAccountingMetaState,
): string {
  const normalizedMemo = normalizeMemo(memo)
  const lines = stripMetaLine(normalizedMemo, CUSTOMER_ACCOUNTING_META_PREFIX)
  const events = nextState.events
    .map(sanitizeEvent)
    .filter((entry): entry is CustomerAccountingEvent => entry !== null)

  const depositorAliases = sanitizeAliasList(nextState.depositorAliases)
  const addressLabels = sanitizeAddressLabelList(nextState.addressLabels)
  const autoDepositDisabled = nextState.autoDepositDisabled === true
  const autoDepositPriority = Math.max(0, parseInteger(nextState.autoDepositPriority))

  if (
    nextState.depositBalance <= 0 &&
    nextState.refundPendingBalance <= 0 &&
    depositorAliases.length === 0 &&
    addressLabels.length === 0 &&
    !autoDepositDisabled &&
    autoDepositPriority <= 0 &&
    events.length === 0
  ) {
    return lines.join('\n').trim()
  }

  const metaLine = `${CUSTOMER_ACCOUNTING_META_PREFIX} ${JSON.stringify({
    depositBalance: Math.max(0, parseInteger(nextState.depositBalance)),
    refundPendingBalance: Math.max(0, parseInteger(nextState.refundPendingBalance)),
    depositorAliases,
    addressLabels,
    autoDepositDisabled,
    autoDepositPriority,
    events,
  })}`
  return [...lines, metaLine].join('\n').trim()
}

export function appendCustomerAccountingEvent(
  memo: string | undefined,
  entry: CustomerAccountingEvent,
  patch?: Partial<Pick<CustomerAccountingMetaState, 'depositBalance' | 'refundPendingBalance' | 'depositorAliases' | 'addressLabels' | 'autoDepositDisabled' | 'autoDepositPriority'>>,
): string {
  const prev = parseCustomerAccountingMeta(memo)
  return serializeCustomerAccountingMeta(memo, {
    depositBalance: Math.max(0, patch?.depositBalance ?? prev.depositBalance),
    refundPendingBalance: Math.max(0, patch?.refundPendingBalance ?? prev.refundPendingBalance),
    depositorAliases: patch?.depositorAliases ?? prev.depositorAliases,
    addressLabels: patch?.addressLabels ?? prev.addressLabels,
    autoDepositDisabled: patch?.autoDepositDisabled ?? prev.autoDepositDisabled,
    autoDepositPriority: patch?.autoDepositPriority ?? prev.autoDepositPriority,
    events: [...prev.events, entry],
  })
}

export function replaceCustomerAccountingPreferences(
  memo: string | undefined,
  patch: Pick<CustomerAccountingMetaState, 'depositorAliases' | 'addressLabels' | 'autoDepositDisabled' | 'autoDepositPriority'>,
): string {
  const prev = parseCustomerAccountingMeta(memo)
  return serializeCustomerAccountingMeta(memo, {
    depositBalance: prev.depositBalance,
    refundPendingBalance: prev.refundPendingBalance,
    depositorAliases: patch.depositorAliases,
    addressLabels: patch.addressLabels,
    autoDepositDisabled: patch.autoDepositDisabled,
    autoDepositPriority: patch.autoDepositPriority,
    events: prev.events,
  })
}

export function parseInvoiceAccountingMeta(memo?: string): InvoiceAccountingMetaState {
  const metaLine = normalizeMemo(memo)
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith(INVOICE_ACCOUNTING_META_PREFIX))

  if (!metaLine) return { depositUsedAmount: 0, discountAmount: 0, paymentHistory: [] }

  try {
    const parsed = JSON.parse(metaLine.slice(INVOICE_ACCOUNTING_META_PREFIX.length).trim()) as {
      depositUsedAmount?: number
      discountAmount?: number
      customerAddressKey?: string
      internalMemo?: string
      fulfillmentStatus?: string
      shipmentConfirmedAt?: string
      revenueRecognizedDate?: string
      revenuePostedAt?: string
      revenuePostingStatus?: string
      salesLedgerId?: string
      salesLedgerIdempotencyKey?: string
      taxInvoiceStatus?: string
      taxInvoice?: Partial<InvoiceTaxInvoiceMeta>
      paymentReminder?: Partial<InvoicePaymentReminderState>
      paymentHistory?: Partial<InvoicePaymentHistoryEntry>[]
    }
    const customerAddressKey = typeof parsed.customerAddressKey === 'string' && parsed.customerAddressKey.trim()
      ? parsed.customerAddressKey.trim()
      : undefined
    const internalMemo = sanitizeMultilineText(parsed.internalMemo)
    const taxInvoice = sanitizeInvoiceTaxInvoiceMeta(parsed.taxInvoice)
    const paymentReminder = sanitizeInvoicePaymentReminder(parsed.paymentReminder)
    const paymentHistory = Array.isArray(parsed.paymentHistory)
      ? parsed.paymentHistory
        .map(sanitizeInvoicePaymentHistoryEntry)
        .filter((entry): entry is InvoicePaymentHistoryEntry => entry !== null)
      : []
    return {
      depositUsedAmount: Math.max(0, parseInteger(parsed.depositUsedAmount)),
      discountAmount: Math.max(0, parseInteger(parsed.discountAmount)),
      customerAddressKey,
      internalMemo,
      fulfillmentStatus: sanitizeFulfillmentStatus(parsed.fulfillmentStatus),
      shipmentConfirmedAt: sanitizeIsoLike(parsed.shipmentConfirmedAt),
      revenueRecognizedDate: sanitizeDate(parsed.revenueRecognizedDate),
      revenuePostedAt: sanitizeIsoLike(parsed.revenuePostedAt),
      revenuePostingStatus: sanitizeRevenuePostingStatus(parsed.revenuePostingStatus),
      salesLedgerId: sanitizeShortKey(parsed.salesLedgerId),
      salesLedgerIdempotencyKey: sanitizeShortKey(parsed.salesLedgerIdempotencyKey),
      taxInvoiceStatus: sanitizeTaxInvoiceStatus(parsed.taxInvoiceStatus),
      taxInvoice,
      paymentReminder,
      paymentHistory,
    }
  } catch {
    return { depositUsedAmount: 0, discountAmount: 0, paymentHistory: [] }
  }
}

export function serializeInvoiceAccountingMeta(
  memo: string | undefined,
  nextState: InvoiceAccountingMetaState,
): string {
  const normalizedMemo = normalizeMemo(memo)
  const lines = stripMetaLine(normalizedMemo, INVOICE_ACCOUNTING_META_PREFIX)
  const customerAddressKey = typeof nextState.customerAddressKey === 'string' && nextState.customerAddressKey.trim()
    ? nextState.customerAddressKey.trim()
    : undefined
  const internalMemo = sanitizeMultilineText(nextState.internalMemo)
  const fulfillmentStatus = sanitizeFulfillmentStatus(nextState.fulfillmentStatus)
  const shipmentConfirmedAt = sanitizeIsoLike(nextState.shipmentConfirmedAt)
  const revenueRecognizedDate = sanitizeDate(nextState.revenueRecognizedDate)
  const revenuePostedAt = sanitizeIsoLike(nextState.revenuePostedAt)
  const revenuePostingStatus = sanitizeRevenuePostingStatus(nextState.revenuePostingStatus)
  const salesLedgerId = sanitizeShortKey(nextState.salesLedgerId)
  const salesLedgerIdempotencyKey = sanitizeShortKey(nextState.salesLedgerIdempotencyKey)
  const taxInvoiceStatus = sanitizeTaxInvoiceStatus(nextState.taxInvoiceStatus)
  const taxInvoice = sanitizeInvoiceTaxInvoiceMeta(nextState.taxInvoice)
  const paymentReminder = sanitizeInvoicePaymentReminder(nextState.paymentReminder)
  const paymentHistory = Array.isArray(nextState.paymentHistory)
    ? nextState.paymentHistory
      .map(sanitizeInvoicePaymentHistoryEntry)
      .filter((entry): entry is InvoicePaymentHistoryEntry => entry !== null)
    : []
  const discountAmount = Math.max(0, parseInteger(nextState.discountAmount))
  if (
    nextState.depositUsedAmount <= 0 &&
    discountAmount <= 0 &&
    !customerAddressKey &&
    !fulfillmentStatus &&
    !shipmentConfirmedAt &&
    !revenueRecognizedDate &&
    !revenuePostedAt &&
    !revenuePostingStatus &&
    !salesLedgerId &&
    !salesLedgerIdempotencyKey &&
    !taxInvoiceStatus &&
    !taxInvoice
  ) {
    if (!internalMemo && !paymentReminder && paymentHistory.length === 0) {
      return lines.join('\n').trim()
    }
  }

  const payload: Record<string, unknown> = {
    depositUsedAmount: Math.max(0, parseInteger(nextState.depositUsedAmount)),
    discountAmount,
    customerAddressKey,
  }
  if (fulfillmentStatus) payload.fulfillmentStatus = fulfillmentStatus
  if (shipmentConfirmedAt) payload.shipmentConfirmedAt = shipmentConfirmedAt
  if (revenueRecognizedDate) payload.revenueRecognizedDate = revenueRecognizedDate
  if (revenuePostedAt) payload.revenuePostedAt = revenuePostedAt
  if (revenuePostingStatus) payload.revenuePostingStatus = revenuePostingStatus
  if (salesLedgerId) payload.salesLedgerId = salesLedgerId
  if (salesLedgerIdempotencyKey) payload.salesLedgerIdempotencyKey = salesLedgerIdempotencyKey
  if (taxInvoiceStatus) payload.taxInvoiceStatus = taxInvoiceStatus
  if (taxInvoice) payload.taxInvoice = taxInvoice
  if (internalMemo) payload.internalMemo = internalMemo
  if (paymentReminder) payload.paymentReminder = paymentReminder
  if (paymentHistory.length > 0) payload.paymentHistory = paymentHistory

  const metaLine = `${INVOICE_ACCOUNTING_META_PREFIX} ${JSON.stringify(payload)}`
  return [...lines, metaLine].join('\n').trim()
}

export function appendInvoicePaymentHistory(
  memo: string | undefined,
  entry: InvoicePaymentHistoryEntry,
): string {
  const prev = parseInvoiceAccountingMeta(memo)
  return serializeInvoiceAccountingMeta(memo, {
    ...prev,
    paymentHistory: [...prev.paymentHistory, entry],
  })
}

export function getInvoiceInternalMemo(memo?: string): string {
  return parseInvoiceAccountingMeta(memo).internalMemo ?? ''
}

export function getInvoicePaymentReminder(memo?: string): InvoicePaymentReminderState | undefined {
  return parseInvoiceAccountingMeta(memo).paymentReminder
}

export function hasActiveInvoicePaymentReminder(memo?: string): boolean {
  const reminder = getInvoicePaymentReminder(memo)
  return Boolean(reminder?.enabled && reminder.dueDate)
}

export function getInvoiceDepositUsedAmount(memo?: string): number {
  return parseInvoiceAccountingMeta(memo).depositUsedAmount
}

export function getInvoiceDiscountAmount(memo?: string): number {
  return parseInvoiceAccountingMeta(memo).discountAmount ?? 0
}

export function getInvoiceCustomerAddressKey(memo?: string): string | undefined {
  return parseInvoiceAccountingMeta(memo).customerAddressKey
}

export function getInvoicePaymentHistory(memo?: string): InvoicePaymentHistoryEntry[] {
  return parseInvoiceAccountingMeta(memo).paymentHistory
}

export function getInvoiceFulfillmentStatus(memo?: string): InvoiceFulfillmentStatus | undefined {
  return parseInvoiceAccountingMeta(memo).fulfillmentStatus
}

export function getInvoiceRevenuePostingStatus(memo?: string): InvoiceRevenuePostingStatus | undefined {
  return parseInvoiceAccountingMeta(memo).revenuePostingStatus
}

export function isInvoiceRevenueRecognized(invoice: { memo?: unknown }): boolean {
  const meta = parseInvoiceAccountingMeta(typeof invoice.memo === 'string' ? invoice.memo : undefined)
  // 과거 거래명세표는 출고 상태 메타가 없으므로 기존 매출 집계를 유지한다.
  if (!meta.fulfillmentStatus && !meta.revenuePostingStatus) return true
  return meta.fulfillmentStatus === 'shipment_confirmed' && meta.revenuePostingStatus === 'posted'
}

export function buildShipmentConfirmedInvoiceMemo(
  memo: string | undefined,
  params: {
    invoiceId: number
    invoiceNo?: string
    confirmedAt?: string
    revenueDate?: string
    taxInvoiceStatus?: InvoiceTaxInvoiceStatus
  },
): string {
  const confirmedAt = sanitizeIsoLike(params.confirmedAt) ?? new Date().toISOString()
  const revenueDate = sanitizeDate(params.revenueDate) ?? confirmedAt.slice(0, 10)
  const prev = parseInvoiceAccountingMeta(memo)
  const idempotencyKey = sanitizeShortKey(prev.salesLedgerIdempotencyKey)
    ?? `crm-invoice-${Math.trunc(params.invoiceId)}-shipment-confirmed`

  return serializeInvoiceAccountingMeta(memo, {
    ...prev,
    fulfillmentStatus: 'shipment_confirmed',
    shipmentConfirmedAt: confirmedAt,
    revenueRecognizedDate: revenueDate,
    revenuePostedAt: confirmedAt,
    revenuePostingStatus: 'posted',
    salesLedgerId: prev.salesLedgerId ?? `sales-ledger-${idempotencyKey}`,
    salesLedgerIdempotencyKey: idempotencyKey,
    taxInvoiceStatus: prev.taxInvoiceStatus ?? params.taxInvoiceStatus ?? 'not_requested',
  })
}
