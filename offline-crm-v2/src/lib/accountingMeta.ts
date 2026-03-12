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
  autoDepositDisabled: boolean
  autoDepositPriority: number
  events: CustomerAccountingEvent[]
}

export interface InvoiceAccountingMetaState {
  depositUsedAmount: number
}

const CUSTOMER_ACCOUNTING_META_PREFIX = '[ACCOUNTING_CUSTOMER_META]'
const INVOICE_ACCOUNTING_META_PREFIX = '[ACCOUNTING_INVOICE_META]'

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

function stripMetaLine(memo: string, prefix: string): string[] {
  return memo
    .split('\n')
    .filter((line) => line.trim() && !line.trim().startsWith(prefix))
}

export function getDisplayMemo(memo?: string): string {
  return normalizeMemo(memo)
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      return (
        trimmed &&
        !trimmed.startsWith(CUSTOMER_ACCOUNTING_META_PREFIX) &&
        !trimmed.startsWith(INVOICE_ACCOUNTING_META_PREFIX)
      )
    })
    .join('\n')
    .trim()
}

export function mergeDisplayMemo(baseMemo: string | undefined, displayMemo: string | undefined): string {
  const visibleLines = normalizeMemo(displayMemo)
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim())
  const hiddenLines = normalizeMemo(baseMemo)
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => {
      const trimmed = line.trim()
      return (
        trimmed.startsWith('[LEGACY_RECEIVABLE_META]') ||
        trimmed.startsWith('[LEGACY_PAYABLE_META]') ||
        trimmed.startsWith(CUSTOMER_ACCOUNTING_META_PREFIX) ||
        trimmed.startsWith(INVOICE_ACCOUNTING_META_PREFIX)
      )
    })
  return [...visibleLines, ...hiddenLines].join('\n').trim()
}

export function parseCustomerAccountingMeta(memo?: string): CustomerAccountingMetaState {
  const metaLine = normalizeMemo(memo)
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith(CUSTOMER_ACCOUNTING_META_PREFIX))

  if (!metaLine) {
    return { depositBalance: 0, refundPendingBalance: 0, depositorAliases: [], autoDepositDisabled: false, autoDepositPriority: 0, events: [] }
  }

  try {
    const parsed = JSON.parse(metaLine.slice(CUSTOMER_ACCOUNTING_META_PREFIX.length).trim()) as {
      depositBalance?: number
      refundPendingBalance?: number
      depositorAliases?: string[]
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
      autoDepositDisabled: parsed.autoDepositDisabled === true,
      autoDepositPriority: Math.max(0, parseInteger(parsed.autoDepositPriority)),
      events,
    }
  } catch {
    return { depositBalance: 0, refundPendingBalance: 0, depositorAliases: [], autoDepositDisabled: false, autoDepositPriority: 0, events: [] }
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
  const autoDepositDisabled = nextState.autoDepositDisabled === true
  const autoDepositPriority = Math.max(0, parseInteger(nextState.autoDepositPriority))

  if (
    nextState.depositBalance <= 0 &&
    nextState.refundPendingBalance <= 0 &&
    depositorAliases.length === 0 &&
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
    autoDepositDisabled,
    autoDepositPriority,
    events,
  })}`
  return [...lines, metaLine].join('\n').trim()
}

export function appendCustomerAccountingEvent(
  memo: string | undefined,
  entry: CustomerAccountingEvent,
  patch?: Partial<Pick<CustomerAccountingMetaState, 'depositBalance' | 'refundPendingBalance' | 'depositorAliases' | 'autoDepositDisabled' | 'autoDepositPriority'>>,
): string {
  const prev = parseCustomerAccountingMeta(memo)
  return serializeCustomerAccountingMeta(memo, {
    depositBalance: Math.max(0, patch?.depositBalance ?? prev.depositBalance),
    refundPendingBalance: Math.max(0, patch?.refundPendingBalance ?? prev.refundPendingBalance),
    depositorAliases: patch?.depositorAliases ?? prev.depositorAliases,
    autoDepositDisabled: patch?.autoDepositDisabled ?? prev.autoDepositDisabled,
    autoDepositPriority: patch?.autoDepositPriority ?? prev.autoDepositPriority,
    events: [...prev.events, entry],
  })
}

export function replaceCustomerAccountingPreferences(
  memo: string | undefined,
  patch: Pick<CustomerAccountingMetaState, 'depositorAliases' | 'autoDepositDisabled' | 'autoDepositPriority'>,
): string {
  const prev = parseCustomerAccountingMeta(memo)
  return serializeCustomerAccountingMeta(memo, {
    depositBalance: prev.depositBalance,
    refundPendingBalance: prev.refundPendingBalance,
    depositorAliases: patch.depositorAliases,
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

  if (!metaLine) return { depositUsedAmount: 0 }

  try {
    const parsed = JSON.parse(metaLine.slice(INVOICE_ACCOUNTING_META_PREFIX.length).trim()) as {
      depositUsedAmount?: number
    }
    return { depositUsedAmount: Math.max(0, parseInteger(parsed.depositUsedAmount)) }
  } catch {
    return { depositUsedAmount: 0 }
  }
}

export function serializeInvoiceAccountingMeta(
  memo: string | undefined,
  nextState: InvoiceAccountingMetaState,
): string {
  const normalizedMemo = normalizeMemo(memo)
  const lines = stripMetaLine(normalizedMemo, INVOICE_ACCOUNTING_META_PREFIX)
  if (nextState.depositUsedAmount <= 0) {
    return lines.join('\n').trim()
  }
  const metaLine = `${INVOICE_ACCOUNTING_META_PREFIX} ${JSON.stringify({
    depositUsedAmount: Math.max(0, parseInteger(nextState.depositUsedAmount)),
  })}`
  return [...lines, metaLine].join('\n').trim()
}

export function getInvoiceDepositUsedAmount(memo?: string): number {
  return parseInvoiceAccountingMeta(memo).depositUsedAmount
}
