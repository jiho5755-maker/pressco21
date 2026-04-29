import type ExcelJS from 'exceljs'
import { dismissAutoDepositReviewQueue, getAutoDepositReviewQueue, type Customer } from '@/lib/api'
import type { CustomerReceivableLedger, ResolvedReceivableInvoice } from '@/lib/receivables'
import { parseCustomerAccountingMeta } from '@/lib/accountingMeta'

export interface AutoDepositInboxEntry {
  id: string
  date: string
  sender: string
  amount: number
  note: string
  sourceFile: string
  status: 'pending' | 'applied' | 'manual_completed' | 'dismissed' | 'held'
  appliedAt?: string
  appliedTargetKey?: string
  resolvedAt?: string
  resolvedBy?: string
  resolvedReason?: string
}

export interface AutoDepositCandidate {
  key: string
  kind: 'invoice' | 'legacy' | 'customer'
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
  status: 'applied' | 'exact' | 'review' | 'unmatched' | 'manual_completed' | 'dismissed' | 'held'
}

export interface AutoDepositReviewQueueItem {
  queueId: string
  status: 'review' | 'unmatched' | 'resolved' | 'dismissed'
  sender: string
  amount: number
  occurredAt: string
  externalId?: string
  source?: string
  reason?: string
  candidates: AutoDepositCandidate[]
  createdAt?: string
  updatedAt?: string
  resolvedAt?: string | null
  resolvedBy?: string | null
  resolvedNote?: string | null
}

export interface AutoDepositReviewQueueResponse {
  ok: boolean
  items: AutoDepositReviewQueueItem[]
  summary: {
    total: number
    review: number
    unmatched: number
    resolved: number
    dismissed: number
  }
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
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const utcMs = Math.round((value - 25569) * 86400 * 1000)
    const parsed = new Date(utcMs)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10)
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

function pickFirstValue(row: Record<string, unknown>, headerAliases: string[]): unknown {
  const normalizedMap = new Map<string, unknown>()
  Object.entries(row).forEach(([key, value]) => normalizedMap.set(normalizeHeader(key), value))
  for (const alias of headerAliases) {
    const found = normalizedMap.get(normalizeHeader(alias))
    if (found == null) continue
    return typeof found === 'string' ? found.trim() : found
  }
  return ''
}

function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.')
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

function decodeTextFile(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
  if (!utf8.includes('�')) return utf8
  try {
    return new TextDecoder('euc-kr', { fatal: false }).decode(buffer)
  } catch {
    return utf8
  }
}

function parseCsvText(text: string): Record<string, unknown>[] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (!inQuotes && char === ',') {
      currentRow.push(current)
      current = ''
      continue
    }
    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') i += 1
      currentRow.push(current)
      if (currentRow.some((cell) => cell.trim() !== '')) rows.push(currentRow)
      currentRow = []
      current = ''
      continue
    }
    current += char
  }
  currentRow.push(current)
  if (currentRow.some((cell) => cell.trim() !== '')) rows.push(currentRow)

  const headers = rows[0] ?? []
  return rows.slice(1).map((row) => {
    const record: Record<string, unknown> = {}
    headers.forEach((header, index) => {
      record[header] = row[index] ?? ''
    })
    return record
  })
}

function cellValueToPrimitive(value: ExcelJS.CellValue): unknown {
  if (value == null) return ''
  if (value instanceof Date) return value
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text
    if ('result' in value) return value.result ?? ''
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((entry) => entry.text).join('')
    }
    if ('hyperlink' in value && 'text' in value) return String(value.text ?? '')
    return String(value)
  }
  return value
}

async function parseXlsxRows(buffer: ArrayBuffer): Promise<Record<string, unknown>[]> {
  const ExcelJSRuntime = (await import('exceljs')).default
  const workbook = new ExcelJSRuntime.Workbook()
  await workbook.xlsx.load(buffer)
  const worksheet = workbook.worksheets[0]
  if (!worksheet) return []

  let headers: string[] = []
  const records: Record<string, unknown>[] = []
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const values = row.values as ExcelJS.CellValue[]
    if (rowNumber === 1) {
      headers = values.slice(1).map((value) => String(cellValueToPrimitive(value)).trim())
      return
    }
    const record: Record<string, unknown> = {}
    headers.forEach((header, index) => {
      record[header] = cellValueToPrimitive(values[index + 1])
    })
    records.push(record)
  })
  return records
}

function createEntryId(sourceFile: string, index: number, amount: number, sender: string, date: string): string {
  const base = `${sourceFile}-${index}-${amount}-${sender}-${date}`
  return btoa(unescape(encodeURIComponent(base))).replace(/=+$/g, '')
}

export async function parseAutoDepositFile(file: File): Promise<AutoDepositInboxEntry[]> {
  const extension = getFileExtension(file.name)
  if (extension === 'xls') {
    throw new Error('.xls 파일은 보안상 직접 업로드할 수 없습니다. 엑셀에서 .xlsx 또는 .csv로 다시 저장한 뒤 업로드해주세요.')
  }
  if (extension !== 'xlsx' && extension !== 'csv') {
    throw new Error('입금 파일은 .xlsx 또는 .csv 형식만 업로드할 수 있습니다.')
  }

  const buffer = await file.arrayBuffer()
  const rows = extension === 'csv'
    ? parseCsvText(decodeTextFile(buffer))
    : await parseXlsxRows(buffer)

  const entries = rows
    .map((row, index): AutoDepositInboxEntry | null => {
      const date = normalizeDate(pickFirstValue(row, DATE_HEADERS))
      const sender = String(pickFirstValue(row, SENDER_HEADERS) ?? '').trim()
      const amount = normalizeAmount(pickFirstValue(row, AMOUNT_HEADERS))
      const note = String(pickFirstValue(row, NOTE_HEADERS) ?? '').trim()
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
    if (!Array.isArray(parsed)) return []
    return parsed.map((entry) => ({
      ...entry,
      status: entry.status === 'applied' ||
        entry.status === 'manual_completed' ||
        entry.status === 'dismissed' ||
        entry.status === 'held'
        ? entry.status
        : 'pending',
    }))
  } catch {
    return []
  }
}

export function saveAutoDepositInbox(entries: AutoDepositInboxEntry[]): void {
  localStorage.setItem(AUTO_DEPOSIT_INBOX_KEY, JSON.stringify(entries))
}

export async function listAutoDepositReviewQueue(): Promise<AutoDepositReviewQueueResponse> {
  const response = await getAutoDepositReviewQueue()
  return {
    ...response,
    items: (response.items ?? []).map((item) => ({
      ...item,
      candidates: Array.isArray(item.candidates) ? item.candidates as AutoDepositCandidate[] : [],
    })),
  }
}

export async function dismissAutoDepositReviewQueueItem(queueId: string, resolvedBy: string, note?: string) {
  return dismissAutoDepositReviewQueue(queueId, resolvedBy, note)
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

function createCustomerSettlementCandidate(
  entry: AutoDepositInboxEntry,
  ledger: CustomerReceivableLedger,
  customer: Customer,
  preferredInvoice: ResolvedReceivableInvoice | undefined,
  score: number,
  reason: string,
  confidence: 'exact' | 'review',
): AutoDepositCandidate {
  return {
    key: `customer-${customer.Id}`,
    kind: 'customer',
    confidence,
    customerId: customer.Id,
    customerName: customer.name?.trim() || ledger.customerName,
    bookName: customer.book_name?.trim(),
    amount: entry.amount,
    invoiceId: preferredInvoice?.Id,
    invoiceNo: preferredInvoice?.invoice_no,
    remainingAmount: ledger.totalRemaining,
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
    const ambiguousCustomerIds = new Set(
      customers
        .filter((customer) => {
          const customerMeta = parseCustomerAccountingMeta(customer.memo as string | undefined)
          if (customerMeta.autoDepositDisabled) return false
          return getCustomerLookupTokens(customer).some((token) => token && token === senderKey)
        })
        .map((customer) => customer.Id),
    )
    const hasAmbiguousDepositor = ambiguousCustomerIds.size > 1
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
          senderMatched && !hasAmbiguousDepositor && invoices.filter((candidate) => candidate.asOfRemaining === entry.amount).length === 1
            ? 'exact'
            : 'review',
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
          senderMatched && !hasAmbiguousDepositor && ledgers.filter((candidate) => candidate.legacyBaseline === entry.amount).length === 1
            ? 'exact'
            : 'review',
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
        const preferredInvoice = invoices
          .filter((invoice) => invoice.resolvedCustomerId === ledger.customerId && invoice.asOfRemaining > 0)
          .sort((left, right) => {
            const leftDate = left.invoice_date?.slice(0, 10) ?? ''
            const rightDate = right.invoice_date?.slice(0, 10) ?? ''
            if (leftDate !== rightDate) return leftDate.localeCompare(rightDate)
            return left.Id - right.Id
          })[0]
        if (ledger.crmRemaining > 0 || ledger.source === 'both') {
          return createCustomerSettlementCandidate(
            entry,
            ledger,
            customer,
            preferredInvoice,
            40 + Math.min(30, customerMeta.autoDepositPriority),
            '입금자명과 고객명이 맞아 고객 전체 미수를 오래된 순서대로 정산하는 후보입니다.',
            'review',
          )
        }
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
      .map((candidate) => hasAmbiguousDepositor
        ? {
            ...candidate,
            confidence: 'review' as const,
            reason: `동명이인 또는 동일 입금자명 후보가 ${ambiguousCustomerIds.size.toLocaleString()}명입니다. 자동반영하지 말고 운영자가 직접 확인해야 합니다. ${candidate.reason}`,
          }
        : candidate)

    let status: AutoDepositMatchedEntry['status'] = 'unmatched'
    if (entry.status === 'applied') status = 'applied'
    else if (entry.status === 'manual_completed') status = 'manual_completed'
    else if (entry.status === 'dismissed') status = 'dismissed'
    else if (entry.status === 'held') status = 'held'
    else if (candidates.length === 0) status = 'unmatched'
    else if (!hasAmbiguousDepositor && candidates[0]?.confidence === 'exact' && (!candidates[1] || candidates[0].score > candidates[1].score)) status = 'exact'
    else status = 'review'

    return { entry, candidates, status }
  })

  return senderMatchedEntries.sort((left, right) => {
    const statusOrder = { exact: 0, review: 1, unmatched: 2, held: 3, applied: 4, manual_completed: 5, dismissed: 6 }
    return statusOrder[left.status] - statusOrder[right.status]
  })
}
