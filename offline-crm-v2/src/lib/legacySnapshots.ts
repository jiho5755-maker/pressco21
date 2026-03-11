export interface LegacyTradebookSnapshot {
  legacy_id: string
  book_name: string
  name: string
  business_no: string
  branch_no: string
  corporation_no: string
  ceo_name: string
  business_address: string
  business_type: string
  business_item: string
  zip: string
  address1: string
  address2: string
  phone1: string
  phone2: string
  fax: string
  manager: string
  mobile: string
  email: string
  email2: string
  homepage: string
  trade_type: string
  tree_type: string
  memo: string
  related_account: string
  category_name: string
  sales_manager: string
  report_print: string
  balance: string
  price_tier: string
  sms_opt_in: string
  fax_opt_in: string
  vat_custom: string
  auto_category: string
  carry_over_balance: string
  bank_name: string
  bank_account: string
  bank_owner: string
  rate: string
}

export interface LegacyCustomerListSnapshot {
  serial_no: string
  business_no: string
  customer_group: string
  registered_at: string
  customer_name: string
  company_department: string
  zip: string
  address1: string
  address2: string
  note: string
  reference: string
  phone_company: string
  phone_home: string
  mobile: string
  email: string
}

export interface LegacyCustomerSnapshotPayload {
  generatedAt: string
  tradebookByLegacyId: Record<string, LegacyTradebookSnapshot>
  customerListByName: Record<string, LegacyCustomerListSnapshot[]>
}

export interface FiscalBalanceYearSnapshot {
  receivablesByLegacyId: Record<string, number>
  payablesByLegacyId: Record<string, number>
}

export interface FiscalBalanceSnapshotPayload {
  generatedAt: string
  currentFiscalYear: number
  years: Record<string, FiscalBalanceYearSnapshot>
}

export interface LegacySnapshotMatchTarget {
  legacy_id?: string | number
  name?: string
  mobile?: string
  email?: string
  biz_no?: string
  business_no?: string
  memo?: string
}

export interface LegacyReceivableSettlementEntry {
  amount: number
  date: string
  accountId?: string
  accountLabel?: string
  method?: string
  operator?: string
  createdAt?: string
}

interface LegacyReceivableMemoState {
  settledAmount: number
  settlements: LegacyReceivableSettlementEntry[]
}

interface LegacyPayableMemoState {
  settledAmount: number
  settlements: LegacyReceivableSettlementEntry[]
}

const LEGACY_RECEIVABLE_META_PREFIX = '[LEGACY_RECEIVABLE_META]'
const LEGACY_PAYABLE_META_PREFIX = '[LEGACY_PAYABLE_META]'

let legacySnapshotPromise: Promise<LegacyCustomerSnapshotPayload> | null = null
let fiscalBalanceSnapshotPromise: Promise<FiscalBalanceSnapshotPayload> | null = null

function normalizeLegacyCompareText(value: string | undefined) {
  return (value ?? '')
    .replace(/\s+/g, '')
    .replace(/[()\-.,]/g, '')
    .trim()
    .toLowerCase()
}

function normalizePhoneLike(value: string | undefined) {
  return (value ?? '').replace(/\D/g, '')
}

function normalizeBusinessNo(value: string | undefined) {
  return (value ?? '').replace(/\D/g, '')
}

function parseInteger(value: string | number | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : 0
  if (!value) return 0
  const parsed = Number(String(value).replace(/,/g, '').trim())
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0
}

function normalizeMemo(value: string | undefined): string {
  return (value ?? '').replace(/\r\n/g, '\n')
}

function sanitizeSettlementEntry(entry: Partial<LegacyReceivableSettlementEntry>): LegacyReceivableSettlementEntry | null {
  const amount = Math.max(0, parseInteger(entry.amount))
  const date = typeof entry.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.date)
    ? entry.date
    : ''
  if (!amount || !date) return null
  return {
    amount,
    date,
    accountId: typeof entry.accountId === 'string' && entry.accountId.trim() ? entry.accountId.trim() : undefined,
    accountLabel: typeof entry.accountLabel === 'string' && entry.accountLabel.trim() ? entry.accountLabel.trim() : undefined,
    method: typeof entry.method === 'string' && entry.method.trim() ? entry.method.trim() : undefined,
    operator: typeof entry.operator === 'string' && entry.operator.trim() ? entry.operator.trim() : undefined,
    createdAt: typeof entry.createdAt === 'string' && entry.createdAt.trim() ? entry.createdAt.trim() : undefined,
  }
}

function parseLegacyLedgerMemo(memo: string | undefined, prefix: string): LegacyReceivableMemoState {
  const normalizedMemo = normalizeMemo(memo)
  const metaLine = normalizedMemo
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith(prefix))

  if (!metaLine) {
    return { settledAmount: 0, settlements: [] }
  }

  try {
    const parsed = JSON.parse(metaLine.slice(prefix.length).trim()) as {
      settledAmount?: number
      settlements?: Partial<LegacyReceivableSettlementEntry>[]
    }
    const settlements = Array.isArray(parsed.settlements)
      ? parsed.settlements.map(sanitizeSettlementEntry).filter((entry): entry is LegacyReceivableSettlementEntry => entry !== null)
      : []
    const settledAmount = Math.max(
      parseInteger(parsed.settledAmount),
      settlements.reduce((sum, entry) => sum + entry.amount, 0),
    )
    return { settledAmount, settlements }
  } catch {
    return { settledAmount: 0, settlements: [] }
  }
}

export function parseLegacyReceivableMemo(memo?: string): LegacyReceivableMemoState {
  return parseLegacyLedgerMemo(memo, LEGACY_RECEIVABLE_META_PREFIX)
}

export function parseLegacyPayableMemo(memo?: string): LegacyPayableMemoState {
  return parseLegacyLedgerMemo(memo, LEGACY_PAYABLE_META_PREFIX)
}

export function serializeLegacyReceivableMemo(
  memo: string | undefined,
  nextState: LegacyReceivableMemoState,
): string {
  const normalizedMemo = normalizeMemo(memo)
  const lines = normalizedMemo
    .split('\n')
    .filter((line) => line.trim() && !line.trim().startsWith(LEGACY_RECEIVABLE_META_PREFIX))

  const sanitizedSettlements = nextState.settlements
    .map(sanitizeSettlementEntry)
    .filter((entry): entry is LegacyReceivableSettlementEntry => entry !== null)

  if (sanitizedSettlements.length === 0 && nextState.settledAmount <= 0) {
    return lines.join('\n').trim()
  }

  const metaLine = `${LEGACY_RECEIVABLE_META_PREFIX} ${JSON.stringify({
    settledAmount: Math.max(
      parseInteger(nextState.settledAmount),
      sanitizedSettlements.reduce((sum, entry) => sum + entry.amount, 0),
    ),
    settlements: sanitizedSettlements,
  })}`

  return [...lines, metaLine].join('\n').trim()
}

export function serializeLegacyPayableMemo(
  memo: string | undefined,
  nextState: LegacyPayableMemoState,
): string {
  const normalizedMemo = normalizeMemo(memo)
  const lines = normalizedMemo
    .split('\n')
    .filter((line) => line.trim() && !line.trim().startsWith(LEGACY_PAYABLE_META_PREFIX))

  const sanitizedSettlements = nextState.settlements
    .map(sanitizeSettlementEntry)
    .filter((entry): entry is LegacyReceivableSettlementEntry => entry !== null)

  if (sanitizedSettlements.length === 0 && nextState.settledAmount <= 0) {
    return lines.join('\n').trim()
  }

  const metaLine = `${LEGACY_PAYABLE_META_PREFIX} ${JSON.stringify({
    settledAmount: Math.max(
      parseInteger(nextState.settledAmount),
      sanitizedSettlements.reduce((sum, entry) => sum + entry.amount, 0),
    ),
    settlements: sanitizedSettlements,
  })}`

  return [...lines, metaLine].join('\n').trim()
}

export function getLegacyReceivableSettledAmount(customer: LegacySnapshotMatchTarget | undefined): number {
  return parseLegacyReceivableMemo(customer?.memo).settledAmount
}

export function getLegacyPayableSettledAmount(customer: LegacySnapshotMatchTarget | undefined): number {
  return parseLegacyPayableMemo(customer?.memo).settledAmount
}

export function deriveLegacyTradebookSnapshot(
  customer: LegacySnapshotMatchTarget | undefined,
  snapshots: LegacyCustomerSnapshotPayload | undefined,
): { snapshot?: LegacyTradebookSnapshot; matchReason?: string } {
  if (!customer || !snapshots) return {}

  const legacyId = customer.legacy_id != null ? String(customer.legacy_id).trim() : ''
  if (legacyId) {
    const snapshot = snapshots.tradebookByLegacyId?.[legacyId]
    if (snapshot) return { snapshot, matchReason: 'legacy_id' }
  }

  // 분리 거래명으로 생성한 CRM 전용 고객은 레거시 장부 baseline을 상속하지 않는다.
  if ((customer.memo ?? '').includes('분리 거래명 별도 고객')) {
    return {}
  }

  const customerMobile = normalizePhoneLike(customer.mobile)
  const customerEmail = normalizeLegacyCompareText(customer.email)
  const customerBizNo = normalizeBusinessNo(customer.biz_no ?? customer.business_no)
  const customerName = normalizeLegacyCompareText(customer.name)

  let fallbackMatch: LegacyTradebookSnapshot | undefined
  let fallbackReason: string | undefined

  for (const snapshot of Object.values(snapshots.tradebookByLegacyId ?? {})) {
    const snapshotMobile = normalizePhoneLike(snapshot.mobile)
    const snapshotEmail = normalizeLegacyCompareText(snapshot.email)
    const snapshotBizNo = normalizeBusinessNo(snapshot.business_no)
    const snapshotName = normalizeLegacyCompareText(snapshot.name)
    const snapshotBookName = normalizeLegacyCompareText(snapshot.book_name)
    const snapshotCeoName = normalizeLegacyCompareText(snapshot.ceo_name)

    if (customerBizNo && snapshotBizNo && customerBizNo === snapshotBizNo) {
      return { snapshot, matchReason: 'business_no' }
    }

    const mobileMatched = customerMobile && snapshotMobile && customerMobile === snapshotMobile
    const emailMatched = customerEmail && snapshotEmail && customerEmail === snapshotEmail

    if (mobileMatched && emailMatched) {
      return { snapshot, matchReason: 'mobile+email' }
    }

    if (!fallbackMatch && mobileMatched) {
      fallbackMatch = snapshot
      fallbackReason = 'mobile'
    }

    if (!fallbackMatch && customerName && (customerName === snapshotName || customerName === snapshotBookName)) {
      fallbackMatch = snapshot
      fallbackReason = 'name'
    }

    if (!fallbackMatch && customerName && snapshotCeoName && customerName.includes(snapshotCeoName)) {
      fallbackMatch = snapshot
      fallbackReason = 'name-ceo'
    }
  }

  return { snapshot: fallbackMatch, matchReason: fallbackReason }
}

export async function getLegacyCustomerSnapshots(): Promise<LegacyCustomerSnapshotPayload> {
  if (!legacySnapshotPromise) {
    legacySnapshotPromise = fetch('/data/legacy-customer-snapshots.json')
      .then((response) => {
        if (!response.ok) throw new Error('레거시 백업 스냅샷을 불러오지 못했습니다.')
        return response.json() as Promise<LegacyCustomerSnapshotPayload>
      })
      .catch((error) => {
        legacySnapshotPromise = null
        throw error
      })
  }
  return legacySnapshotPromise
}

export async function getFiscalBalanceSnapshots(): Promise<FiscalBalanceSnapshotPayload> {
  if (!fiscalBalanceSnapshotPromise) {
    fiscalBalanceSnapshotPromise = fetch('/data/fiscal-balance-snapshots.json')
      .then((response) => {
        if (!response.ok) throw new Error('회기 잔액 스냅샷을 불러오지 못했습니다.')
        return response.json() as Promise<FiscalBalanceSnapshotPayload>
      })
      .catch((error) => {
        fiscalBalanceSnapshotPromise = null
        throw error
      })
  }
  return fiscalBalanceSnapshotPromise
}

function getCurrentFiscalSnapshot(payload: FiscalBalanceSnapshotPayload | undefined): FiscalBalanceYearSnapshot | undefined {
  if (!payload) return undefined
  return payload.years?.[String(payload.currentFiscalYear)]
}

export async function getLegacyBalanceBaseline(customer: LegacySnapshotMatchTarget | undefined): Promise<number> {
  const snapshots = await getLegacyCustomerSnapshots()
  const { snapshot } = deriveLegacyTradebookSnapshot(customer, snapshots)
  return parseInteger(snapshot?.balance)
}

function isLegacyReceivableSnapshot(snapshot: LegacyTradebookSnapshot | undefined): boolean {
  if (!snapshot) return false
  if ((snapshot.report_print ?? '').trim() === '거래종료') return false
  return parseInteger(snapshot.balance) < 0
}

function isLegacyPayableSnapshot(snapshot: LegacyTradebookSnapshot | undefined): boolean {
  if (!snapshot) return false
  if ((snapshot.report_print ?? '').trim() === '거래종료') return false
  return parseInteger(snapshot.balance) > 0
}

export async function getLegacyReceivableBaseline(customer: LegacySnapshotMatchTarget | undefined): Promise<number> {
  const [snapshots, fiscalSnapshots] = await Promise.all([
    getLegacyCustomerSnapshots(),
    getFiscalBalanceSnapshots(),
  ])
  const { snapshot } = deriveLegacyTradebookSnapshot(customer, snapshots)
  const fiscalYearSnapshot = getCurrentFiscalSnapshot(fiscalSnapshots)
  const fiscalAmount = snapshot?.legacy_id ? fiscalYearSnapshot?.receivablesByLegacyId?.[snapshot.legacy_id] : undefined
  const baseline = typeof fiscalAmount === 'number'
    ? fiscalAmount
    : (isLegacyReceivableSnapshot(snapshot) ? Math.abs(parseInteger(snapshot?.balance)) : 0)
  if (!baseline) return 0
  const settledAmount = getLegacyReceivableSettledAmount(customer)
  return Math.max(0, baseline - settledAmount)
}

export function getLegacyReceivableBaselineFromSnapshots(
  customer: LegacySnapshotMatchTarget | undefined,
  snapshots: LegacyCustomerSnapshotPayload | undefined,
  fiscalSnapshots?: FiscalBalanceSnapshotPayload,
): number {
  const { snapshot } = deriveLegacyTradebookSnapshot(customer, snapshots)
  const fiscalYearSnapshot = getCurrentFiscalSnapshot(fiscalSnapshots)
  const fiscalAmount = snapshot?.legacy_id ? fiscalYearSnapshot?.receivablesByLegacyId?.[snapshot.legacy_id] : undefined
  if (typeof fiscalAmount !== 'number' && !isLegacyReceivableSnapshot(snapshot)) return 0
  const settledAmount = getLegacyReceivableSettledAmount(customer)
  const baseline = typeof fiscalAmount === 'number' ? fiscalAmount : Math.abs(parseInteger(snapshot?.balance))
  return Math.max(0, baseline - settledAmount)
}

export function getLegacyPayableBaselineFromSnapshots(
  customer: LegacySnapshotMatchTarget | undefined,
  snapshots: LegacyCustomerSnapshotPayload | undefined,
  fiscalSnapshots?: FiscalBalanceSnapshotPayload,
): number {
  const { snapshot } = deriveLegacyTradebookSnapshot(customer, snapshots)
  const fiscalYearSnapshot = getCurrentFiscalSnapshot(fiscalSnapshots)
  const fiscalAmount = snapshot?.legacy_id ? fiscalYearSnapshot?.payablesByLegacyId?.[snapshot.legacy_id] : undefined
  const baseline = typeof fiscalAmount === 'number'
    ? fiscalAmount
    : (isLegacyPayableSnapshot(snapshot) ? parseInteger(snapshot?.balance) : 0)
  if (!baseline) return 0
  const settledAmount = getLegacyPayableSettledAmount(customer)
  return Math.max(0, baseline - settledAmount)
}
