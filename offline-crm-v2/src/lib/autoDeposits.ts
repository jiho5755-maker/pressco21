import * as XLSX from 'xlsx'
import type { Customer } from '@/lib/api'
import type { CustomerReceivableLedger, ResolvedReceivableInvoice } from '@/lib/receivables'
import { parseCustomerAccountingMeta } from '@/lib/accountingMeta'

export interface AutoDepositInboxEntry {
  id: string
  date: string
  sender: string
  amount: number
  note: string
  sourceFile: string
  status: 'pending' | 'applied'
  appliedAt?: string
  appliedTargetKey?: string
}

export interface AutoDepositCandidate {
  key: string
  kind: 'invoice' | 'legacy'
  confidence: 'exact' | 'review'
  customerId: number
  customerName: string
  bookName?: string
  amount: number
  invoiceId?: number
  invoiceNo?: string
  remainingAmount?: number
  score: number
  reason: string
  depositorAliases?: string[]
  autoDepositPriority?: number
}

export interface AutoDepositMatchedEntry {
  entry: AutoDepositInboxEntry
  candidates: AutoDepositCandidate[]
  status: 'applied' | 'exact' | 'review' | 'unmatched'
}

const AUTO_DEPOSIT_INBOX_KEY = 'pressco21-auto-deposit-inbox-v1'

const DATE_HEADERS = ['거래일자', '입금일', '일자', '날짜', '거래일', '입금일자']
const AMOUNT_HEADERS = ['입금액', '금액', '거래금액', '입금금액', '출금입금액', '거래금액(원)']
const SENDER_HEADERS = ['입금자', '보낸분', '보낸분명', '성명', '예금주', '보내는분', '의뢰인', '보낸사람']
const NOTE_HEADERS = ['적요', '내용', '메모', '비고', '거래내용', '거래메모', '입출금내용']

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .replace(/[()]/g, '')
    .trim()
}

function normalizeName(value: string | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()\-.,/]/g, '')
    .replace(/님/g, '')
    .replace(/회장/g, '')
    .replace(/이사장/g, '')
    .replace(/대표/g, '')
    .trim()
}

function normalizeAmount(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
  if (typeof value !== 'string') return 0
  const parsed = Number(value.replace(/,/g, '').replace(/원/g, '').trim())
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0
}

function normalizeDate(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) {
      const month = String(parsed.m).padStart(2, '0')
      const day = String(parsed.d).padStart(2, '0')
      return `${parsed.y}-${month}-${day}`
    }
  }
  const text = String(value ?? '').trim()
  const match = text.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/)
  if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`

  const shortMatch = text.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2})$/)
  if (shortMatch) {
    const year = Number(shortMatch[3]) >= 70 ? `19${shortMatch[3]}` : `20${shortMatch[3]}`
    return `${year}-${shortMatch[1].padStart(2, '0')}-${shortMatch[2].padStart(2, '0')}`
  }

  return ''
}

function pickFirstValue(row: Record<string, unknown>, headerAliases: string[]): string {
  const normalizedMap = new Map<string, unknown>()
  Object.entries(row).forEach(([key, value]) => normalizedMap.set(normalizeHeader(key), value))
  for (const alias of headerAliases) {
    const found = normalizedMap.get(normalizeHeader(alias))
    if (found == null) continue
    return String(found).trim()
  }
  return ''
}

function createEntryId(sourceFile: string, index: number, amount: number, sender: string, date: string): string {
  const base = `${sourceFile}-${index}-${amount}-${sender}-${date}`
  return btoa(unescape(encodeURIComponent(base))).replace(/=+$/g, '')
}

export async function parseAutoDepositFile(file: File): Promise<AutoDepositInboxEntry[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: false,
  })

  const entries = rows
    .map((row, index): AutoDepositInboxEntry | null => {
      const date = normalizeDate(pickFirstValue(row, DATE_HEADERS))
      const sender = pickFirstValue(row, SENDER_HEADERS)
      const amount = normalizeAmount(pickFirstValue(row, AMOUNT_HEADERS))
      const note = pickFirstValue(row, NOTE_HEADERS)
      if (!date || !sender || amount <= 0) return null
      return {
        id: createEntryId(file.name, index, amount, sender, date),
        date,
        sender,
        amount,
        note,
        sourceFile: file.name,
        status: 'pending' as const,
      }
    })
    .filter((entry): entry is AutoDepositInboxEntry => entry !== null)

  return entries
}

export function loadAutoDepositInbox(): AutoDepositInboxEntry[] {
  try {
    const raw = localStorage.getItem(AUTO_DEPOSIT_INBOX_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AutoDepositInboxEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveAutoDepositInbox(entries: AutoDepositInboxEntry[]): void {
  localStorage.setItem(AUTO_DEPOSIT_INBOX_KEY, JSON.stringify(entries))
}

function getCustomerLookupTokens(customer: Customer | undefined, ledger?: CustomerReceivableLedger, extraValues: Array<string | undefined> = []): string[] {
  const accountingMeta = parseCustomerAccountingMeta(customer?.memo as string | undefined)
  return [
    customer?.name,
    customer?.book_name,
    ...accountingMeta.depositorAliases,
    ...(ledger?.aliases ?? []),
    ...extraValues,
  ]
    .map(normalizeName)
    .filter(Boolean)
}

function createInvoiceCandidate(
  entry: AutoDepositInboxEntry,
  invoice: ResolvedReceivableInvoice,
  customer: Customer | undefined,
  customerId: number,
  score: number,
  reason: string,
  confidence: 'exact' | 'review',
): AutoDepositCandidate {
  return {
    key: `invoice-${invoice.Id}`,
    kind: 'invoice',
    confidence,
    customerId,
    customerName: customer?.name?.trim() || invoice.customer_name?.trim() || invoice.resolvedCustomerName,
    bookName: customer?.book_name?.trim(),
    amount: entry.amount,
    invoiceId: invoice.Id,
    invoiceNo: invoice.invoice_no,
    remainingAmount: invoice.asOfRemaining,
    score,
    reason,
    depositorAliases: parseCustomerAccountingMeta(customer?.memo as string | undefined).depositorAliases,
    autoDepositPriority: parseCustomerAccountingMeta(customer?.memo as string | undefined).autoDepositPriority,
  }
}

function createLegacyCandidate(
  entry: AutoDepositInboxEntry,
  ledger: CustomerReceivableLedger,
  customer: Customer,
  score: number,
  reason: string,
  confidence: 'exact' | 'review',
): AutoDepositCandidate {
  return {
    key: `legacy-${customer.Id}`,
    kind: 'legacy',
    confidence,
    customerId: customer.Id,
    customerName: customer.name?.trim() || ledger.customerName,
    bookName: customer.book_name?.trim(),
    amount: entry.amount,
    remainingAmount: ledger.legacyBaseline,
    score,
    reason,
    depositorAliases: parseCustomerAccountingMeta(customer.memo as string | undefined).depositorAliases,
    autoDepositPriority: parseCustomerAccountingMeta(customer.memo as string | undefined).autoDepositPriority,
  }
}

export function buildAutoDepositMatchResults(
  entries: AutoDepositInboxEntry[],
  customers: Customer[],
  invoices: ResolvedReceivableInvoice[],
  ledgers: CustomerReceivableLedger[],
): AutoDepositMatchedEntry[] {
  const customerById = new Map(customers.map((customer) => [customer.Id, customer]))
  const senderMatchedEntries = entries.map((entry) => {
    const senderKey = normalizeName(entry.sender)
    const invoiceCandidates = invoices
      .filter((invoice) => invoice.asOfRemaining === entry.amount)
      .map((invoice) => {
        const resolvedCustomerId =
          (typeof invoice.resolvedCustomerId === 'number' && invoice.resolvedCustomerId > 0 ? invoice.resolvedCustomerId : null) ??
          (typeof invoice.customer_id === 'number' && invoice.customer_id > 0 ? invoice.customer_id : null)
        if (!resolvedCustomerId) return null
        const customer =
          customerById.get(resolvedCustomerId) ??
          customers.find((item) => {
            const itemName = normalizeName(item.name)
            const itemBookName = normalizeName(item.book_name)
            const invoiceName = normalizeName(invoice.customer_name)
            return Boolean(invoiceName) && (itemName === invoiceName || itemBookName === invoiceName)
          })
        const customerMeta = parseCustomerAccountingMeta(customer?.memo as string | undefined)
        if (customerMeta.autoDepositDisabled) return null
        const lookupTokens = getCustomerLookupTokens(customer, undefined, [invoice.customer_name, invoice.resolvedCustomerName])
        const senderMatched = lookupTokens.some((token) => token && senderKey.includes(token))
        const score = (senderMatched ? 100 : 60) + Math.min(30, customerMeta.autoDepositPriority)
        return createInvoiceCandidate(
          entry,
          invoice,
          customer,
          resolvedCustomerId,
          score,
          senderMatched ? '입금자명과 고객명이 정확히 맞고 미수 명세표 금액도 같습니다.' : '미수 명세표 잔액과 입금액이 정확히 같습니다.',
          senderMatched || invoices.filter((candidate) => candidate.asOfRemaining === entry.amount).length === 1 ? 'exact' : 'review',
        )
      })
      .filter((candidate): candidate is AutoDepositCandidate => candidate !== null)

    const legacyCandidates = ledgers
      .filter((ledger) => ledger.legacyBaseline === entry.amount)
      .map((ledger) => {
        const customer = customerById.get(ledger.customerId)
        if (!customer) return null
        const customerMeta = parseCustomerAccountingMeta(customer.memo as string | undefined)
        if (customerMeta.autoDepositDisabled) return null
        const lookupTokens = getCustomerLookupTokens(customer, ledger)
        const senderMatched = lookupTokens.some((token) => token && senderKey.includes(token))
        const score = (senderMatched ? 95 : 55) + Math.min(30, customerMeta.autoDepositPriority)
        return createLegacyCandidate(
          entry,
          ledger,
          customer,
          score,
          senderMatched ? '입금자명과 고객명이 맞고 기존 장부 받을 돈과 입금액이 같습니다.' : '기존 장부 받을 돈과 입금액이 정확히 같습니다.',
          senderMatched || ledgers.filter((candidate) => candidate.legacyBaseline === entry.amount).length === 1 ? 'exact' : 'review',
        )
      })
      .filter((candidate): candidate is AutoDepositCandidate => candidate !== null)

    const senderOnlyCandidates = ledgers
      .filter((ledger) => {
        const customer = customerById.get(ledger.customerId)
        if (!customer) return false
        const customerMeta = parseCustomerAccountingMeta(customer.memo as string | undefined)
        if (customerMeta.autoDepositDisabled) return false
        const lookupTokens = getCustomerLookupTokens(customer, ledger)
        return lookupTokens.some((token) => token && senderKey.includes(token))
      })
      .slice(0, 5)
      .map((ledger) => {
        const customer = customerById.get(ledger.customerId)!
        const customerMeta = parseCustomerAccountingMeta(customer.memo as string | undefined)
        return createLegacyCandidate(
          entry,
          ledger,
          customer,
          40 + Math.min(30, customerMeta.autoDepositPriority),
          '입금자명과 고객명은 비슷하지만 금액이 완전히 같지는 않아 검토가 필요합니다.',
          'review',
        )
      })

    const candidates = [...invoiceCandidates, ...legacyCandidates, ...senderOnlyCandidates]
      .sort((left, right) => right.score - left.score)
      .filter((candidate, index, list) => list.findIndex((item) => item.key === candidate.key) === index)

    let status: AutoDepositMatchedEntry['status'] = 'unmatched'
    if (entry.status === 'applied') status = 'applied'
    else if (candidates.length === 0) status = 'unmatched'
    else if (candidates[0]?.confidence === 'exact' && (!candidates[1] || candidates[0].score > candidates[1].score)) status = 'exact'
    else status = 'review'

    return { entry, candidates, status }
  })

  return senderMatchedEntries.sort((left, right) => {
    const statusOrder = { exact: 0, review: 1, unmatched: 2, applied: 3 }
    return statusOrder[left.status] - statusOrder[right.status]
  })
}
