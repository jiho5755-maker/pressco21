import type { Invoice, TxHistory } from '@/lib/api'
import { getInvoiceDepositUsedAmount } from '@/lib/accountingMeta'

export type PresetKey = 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear'

export interface DateRange {
  startDate: string
  endDate: string
  label: string
}

export interface InvoiceDateSummary {
  count: number
  total: number
  unpaidCount: number
  list: Invoice[]
}

export interface PeriodChartPoint {
  date: string
  amount: number
}

export interface PeriodReport {
  periodInvoiceList: Invoice[]
  validInvoices: Invoice[]
  periodTotalAmt: number
  periodPaidAmt: number
  collectionRate: number
  periodAvgAmount: number
  periodTxSales: number
  periodCrmSales: number
  periodCombinedSales: number
  prevYearSales: number | null
  yoyGrowthPct: number | null
  periodChartData: PeriodChartPoint[]
}

function normalizeDate(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.slice(0, 10)
}

export const COLLECTION_RATE_THRESHOLDS = {
  EXCELLENT: 95,
  GOOD: 85,
  CAUTION: 70,
} as const

export const YOY_THRESHOLDS = {
  EXCELLENT: 10,
  GOOD: 1,
  CAUTION: -5,
  DANGER: -20,
} as const

export const PRESET_LABELS: Record<PresetKey, string> = {
  thisMonth: '이번달',
  lastMonth: '지난달',
  thisQuarter: '이번분기',
  thisYear: '올해',
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function getPresetRange(preset: PresetKey, now: Date = new Date()): DateRange {
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  if (preset === 'thisMonth') {
    return {
      startDate: `${year}-${pad(month)}-01`,
      endDate: toISO(now),
      label: `${year}년 ${month}월`,
    }
  }

  if (preset === 'lastMonth') {
    const lastMonth = month === 1 ? 12 : month - 1
    const lastYear = month === 1 ? year - 1 : year
    const lastDay = new Date(lastYear, lastMonth, 0).getDate()
    return {
      startDate: `${lastYear}-${pad(lastMonth)}-01`,
      endDate: `${lastYear}-${pad(lastMonth)}-${pad(lastDay)}`,
      label: `${lastYear}년 ${lastMonth}월`,
    }
  }

  if (preset === 'thisQuarter') {
    const quarter = Math.ceil(month / 3)
    const quarterStartMonth = (quarter - 1) * 3 + 1
    const quarterEndMonth = quarter * 3
    const quarterEnd = new Date(year, quarterEndMonth - 1, new Date(year, quarterEndMonth, 0).getDate())

    return {
      startDate: `${year}-${pad(quarterStartMonth)}-01`,
      endDate: toISO(quarterEnd > now ? now : quarterEnd),
      label: `${year}년 ${quarter}분기 (${quarterStartMonth}~${quarterEndMonth}월)`,
    }
  }

  return {
    startDate: `${year}-01-01`,
    endDate: toISO(now),
    label: `${year}년 전체`,
  }
}

export function fmtCompactAmount(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `${Math.round(n / 10_000)}만`
  return n.toLocaleString()
}

export function collectionRateColor(rate: number): string {
  if (rate >= COLLECTION_RATE_THRESHOLDS.EXCELLENT) return 'text-green-600'
  if (rate >= COLLECTION_RATE_THRESHOLDS.GOOD) return ''
  if (rate >= COLLECTION_RATE_THRESHOLDS.CAUTION) return 'text-amber-600'
  return 'text-red-600'
}

export function yoyColor(pct: number): string {
  if (pct >= YOY_THRESHOLDS.EXCELLENT) return 'text-green-600'
  if (pct >= YOY_THRESHOLDS.GOOD) return 'text-green-500'
  if (pct >= YOY_THRESHOLDS.CAUTION) return 'text-gray-500'
  if (pct >= YOY_THRESHOLDS.DANGER) return 'text-amber-500'
  return 'text-red-600'
}

export function buildInvoiceDateSummary(invoices: Invoice[]) {
  const map: Record<string, InvoiceDateSummary> = {}

  invoices.forEach((invoice) => {
    const date = invoice.invoice_date?.slice(0, 10)
    if (!date) return
    if (!map[date]) {
      map[date] = { count: 0, total: 0, unpaidCount: 0, list: [] }
    }

    map[date].count += 1
    map[date].total += invoice.total_amount ?? 0
    if ((invoice.payment_status ?? '') !== 'paid') {
      map[date].unpaidCount += 1
    }
    map[date].list.push(invoice)
  })

  return map
}

export function getPaidAmountAsOf(invoice: Invoice, asOfDate: string): number {
  const invoiceDate = normalizeDate(invoice.invoice_date)
  if (!invoiceDate || invoiceDate > asOfDate) return 0

  const depositUsedAmount = Math.max(0, getInvoiceDepositUsedAmount(invoice.memo as string | undefined))
  const paidAmount = Math.max(0, invoice.paid_amount ?? 0)
  if (paidAmount <= 0 && depositUsedAmount <= 0) return 0

  const paidDate = normalizeDate(invoice.paid_date)
  if (!paidDate) {
    // paid_date가 비어 있으면 생성 시점에 바로 수금된 건으로 간주한다.
    return paidAmount + depositUsedAmount
  }

  return paidDate <= asOfDate ? paidAmount + depositUsedAmount : depositUsedAmount
}

export function getRemainingAmountAsOf(invoice: Invoice, asOfDate: string): number {
  const invoiceDate = normalizeDate(invoice.invoice_date)
  if (!invoiceDate || invoiceDate > asOfDate) return 0
  return Math.max(0, (invoice.total_amount ?? 0) - getPaidAmountAsOf(invoice, asOfDate))
}

export function getPaymentStatusAsOf(invoice: Invoice, asOfDate: string): 'paid' | 'partial' | 'unpaid' {
  const totalAmount = Math.max(0, invoice.total_amount ?? 0)
  const paidAmount = getPaidAmountAsOf(invoice, asOfDate)
  if (totalAmount <= 0 || paidAmount >= totalAmount) return 'paid'
  if (paidAmount > 0) return 'partial'
  return 'unpaid'
}

export function buildPeriodReport({
  activePreset,
  dateRange,
  invoices,
  txHistory,
  txLastYear = [],
  previousYearInvoiceSales = 0,
  now = new Date(),
}: {
  activePreset: PresetKey
  dateRange: DateRange
  invoices: Invoice[]
  txHistory: TxHistory[]
  txLastYear?: TxHistory[]
  previousYearInvoiceSales?: number
  now?: Date
}): PeriodReport {
  const periodInvoiceList = invoices.filter((invoice) => {
    const date = (invoice.invoice_date ?? '').slice(0, 10)
    return date >= dateRange.startDate && date <= dateRange.endDate
  })

  const periodTotalAmt = periodInvoiceList.reduce((sum, invoice) => sum + (invoice.total_amount ?? 0), 0)
  const periodPaidAmt = periodInvoiceList.reduce((sum, invoice) => sum + (invoice.paid_amount ?? 0), 0)
  const collectionRate = periodTotalAmt > 0 ? Math.min(100, (periodPaidAmt / periodTotalAmt) * 100) : 100

  const validInvoices = periodInvoiceList.filter((invoice) => (invoice.total_amount ?? 0) > 0)
  const periodAvgAmount = validInvoices.length > 0
    ? Math.round(periodTotalAmt / validInvoices.length)
    : 0

  const periodTxSales = txHistory.reduce((sum, tx) => sum + (tx.amount ?? 0), 0)
  const periodCrmSales = periodInvoiceList.reduce((sum, invoice) => sum + (invoice.total_amount ?? 0), 0)
  const periodCombinedSales = periodTxSales + periodCrmSales

  let prevYearSales: number | null = null
  if (activePreset === 'thisMonth') {
    const prevYearMonth = `${now.getFullYear() - 1}-${pad(now.getMonth() + 1)}`
    prevYearSales = txLastYear
      .filter((tx) => (tx.tx_date ?? '').startsWith(prevYearMonth))
      .reduce((sum, tx) => sum + (tx.amount ?? 0), 0)
    prevYearSales += previousYearInvoiceSales
  }

  const yoyGrowthPct = prevYearSales && prevYearSales > 0
    ? ((periodCombinedSales - prevYearSales) / prevYearSales) * 100
    : null

  const byDate: Record<string, number> = {}
  txHistory.forEach((tx) => {
    const date = (tx.tx_date ?? '').slice(0, 10)
    if (!date) return
    byDate[date] = (byDate[date] ?? 0) + (tx.amount ?? 0)
  })
  periodInvoiceList.forEach((invoice) => {
    const date = (invoice.invoice_date ?? '').slice(0, 10)
    if (!date) return
    byDate[date] = (byDate[date] ?? 0) + (invoice.total_amount ?? 0)
  })

  const periodChartData = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date: date.slice(5), amount }))

  return {
    periodInvoiceList,
    validInvoices,
    periodTotalAmt,
    periodPaidAmt,
    collectionRate,
    periodAvgAmount,
    periodTxSales,
    periodCrmSales,
    periodCombinedSales,
    prevYearSales,
    yoyGrowthPct,
    periodChartData,
  }
}
