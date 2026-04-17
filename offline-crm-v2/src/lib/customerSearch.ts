import type { Customer } from '@/lib/api'
import { sanitizeSearchTerm } from '@/lib/api'
import { parseCustomerAccountingMeta } from '@/lib/accountingMeta'

const CUSTOMER_SEARCH_SERVER_FIELDS = ['name', 'book_name', 'ceo_name', 'mobile', 'phone1', 'business_no', 'memo']

function normalizeSearchText(value?: string | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function normalizeDigits(value?: string | null): string {
  return (value ?? '').replace(/[^\d]/g, '')
}

function uniqueNonEmpty(values: string[]): string[] {
  return values.filter(Boolean).filter((value, index, list) => list.indexOf(value) === index)
}

function collectCustomerSearchValues(customer: Customer): string[] {
  const meta = parseCustomerAccountingMeta(customer.memo as string | undefined)
  const rawValues = [
    customer.name,
    customer.book_name,
    customer.ceo_name as string | undefined,
    customer.mobile as string | undefined,
    customer.phone1 ?? customer.phone,
    customer.business_no as string | undefined,
    customer.biz_no as string | undefined,
    ...meta.depositorAliases,
  ]

  return uniqueNonEmpty([
    ...rawValues.map(normalizeSearchText),
    ...rawValues.map(normalizeDigits),
  ])
}

function scoreTextMatch(value: string, query: string, exactScore: number, prefixScore: number, partialScore: number): number {
  if (!value || !query) return 0
  if (value === query) return exactScore
  if (value.startsWith(query)) return prefixScore
  if (value.includes(query)) return partialScore
  return 0
}

function scoreField(value: string | null | undefined, query: string, exactScore: number, prefixScore: number, partialScore: number): number {
  const normalizedScore = scoreTextMatch(normalizeSearchText(value), query, exactScore, prefixScore, partialScore)
  const queryDigits = normalizeDigits(query)
  if (!queryDigits) return normalizedScore

  return Math.max(
    normalizedScore,
    scoreTextMatch(normalizeDigits(value), queryDigits, exactScore, prefixScore, partialScore),
  )
}

export function customerMatchesSearch(customer: Customer, rawQuery: string): boolean {
  const query = normalizeSearchText(rawQuery)
  if (!query) return true

  const tokens = query.split(' ').filter(Boolean)
  if (tokens.length === 0) return true

  const values = collectCustomerSearchValues(customer)
  return tokens.every((token) => values.some((value) => value.includes(token)))
}

export function buildCustomerSearchWhere(rawQuery: string): string {
  const safeText = sanitizeSearchTerm(rawQuery.replace(/\s+/g, ' ').trim())
  const digitText = normalizeDigits(rawQuery)
  const terms = uniqueNonEmpty([safeText, digitText])
  if (terms.length === 0) return ''

  return terms
    .flatMap((term) => CUSTOMER_SEARCH_SERVER_FIELDS.map((field) => `(${field},like,%${term}%)`))
    .join('~or')
}

export function rankCustomerSearch(customer: Customer, rawQuery: string): number {
  const query = normalizeSearchText(rawQuery)
  if (!query) return 0

  const meta = parseCustomerAccountingMeta(customer.memo as string | undefined)
  const scores = [
    scoreField(customer.name, query, 900, 760, 620),
    scoreField(customer.book_name, query, 820, 700, 560),
    scoreField(customer.ceo_name as string | undefined, query, 760, 640, 500),
    ...meta.depositorAliases.map((alias) => scoreField(alias, query, 740, 620, 480)),
    scoreField(customer.mobile as string | undefined, query, 520, 460, 400),
    scoreField(customer.phone1 ?? customer.phone, query, 500, 440, 380),
    scoreField((customer.business_no ?? customer.biz_no) as string | undefined, query, 460, 400, 340),
  ]

  const base = Math.max(...scores, 0)
  if (!base) return 0

  const lastOrderTime = customer.last_order_date ? Date.parse(customer.last_order_date) : 0
  const daysSinceLastOrder = lastOrderTime ? Math.floor((Date.now() - lastOrderTime) / 86_400_000) : Number.POSITIVE_INFINITY
  const recencyBoost = Number.isFinite(daysSinceLastOrder) ? Math.max(0, 80 - Math.min(80, Math.max(0, daysSinceLastOrder))) : 0
  return base + recencyBoost
}

export function getCustomerSearchSupportText(customer: Customer): string {
  const meta = parseCustomerAccountingMeta(customer.memo as string | undefined)
  const previewAliases = meta.depositorAliases.slice(0, 2)
  return [
    customer.book_name ? `구분 ${customer.book_name}` : null,
    customer.ceo_name ? `담당 ${customer.ceo_name}` : null,
    previewAliases.length > 0 ? `입금자 ${previewAliases.join(', ')}` : null,
    customer.mobile ?? customer.phone1 ?? customer.phone ?? null,
  ]
    .filter(Boolean)
    .join(' · ')
}
