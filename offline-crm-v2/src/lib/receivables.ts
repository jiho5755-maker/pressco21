import type { Customer, Invoice } from '@/lib/api'
import type { LegacyCustomerSnapshotPayload } from '@/lib/legacySnapshots'
import { getLegacyReceivableBaselineFromSnapshots } from '@/lib/legacySnapshots'
import { getPaymentStatusAsOf, getRemainingAmountAsOf } from '@/lib/reporting'

export interface ResolvedReceivableInvoice extends Invoice {
  resolvedCustomerId: number | null
  resolvedCustomerName: string
  asOfRemaining: number
  asOfStatus: 'paid' | 'partial' | 'unpaid'
}

export interface CustomerReceivableSummary {
  customerId: number
  customerName: string
  totalRemaining: number
  invoiceCount: number
  aliases: string[]
}

export interface CustomerReceivableLedger {
  customerId: number
  customerName: string
  legacyBaseline: number
  crmRemaining: number
  totalRemaining: number
  invoiceCount: number
  aliases: string[]
  source: 'legacy' | 'crm' | 'both'
}

function normalizeLookup(value?: string | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function extractAliasRoot(value?: string | null): string {
  return normalizeLookup((value ?? '').split('(')[0])
}

function findCustomerByAlias(invoiceName: string, customers: Customer[]): Customer | null {
  const normalizedInvoiceName = normalizeLookup(invoiceName)
  const invoiceRoot = extractAliasRoot(invoiceName)
  const exact = customers.find((customer) => {
    const customerName = normalizeLookup(customer.name)
    const customerBookName = normalizeLookup(customer.book_name)
    return normalizedInvoiceName === customerName || normalizedInvoiceName === customerBookName
  })
  if (exact) return exact

  const byRoot = customers.filter((customer) => {
    const customerName = normalizeLookup(customer.name)
    const customerBookName = normalizeLookup(customer.book_name)
    if (!customerName && !customerBookName) return false
    return (
      invoiceRoot === customerName ||
      normalizedInvoiceName.includes(customerName) ||
      customerBookName.includes(normalizedInvoiceName) ||
      customerBookName.includes(invoiceRoot)
    )
  })

  return byRoot.length === 1 ? byRoot[0] : null
}

export function resolveInvoiceCustomer(invoice: Invoice, customers: Customer[]): Customer | null {
  if (typeof invoice.customer_id === 'number' && invoice.customer_id > 0) {
    const linked = customers.find((customer) => customer.Id === invoice.customer_id)
    if (linked) return linked
  }

  const invoiceName = invoice.customer_name?.trim()
  if (!invoiceName) return null
  return findCustomerByAlias(invoiceName, customers)
}

export function buildResolvedReceivableInvoices(
  invoices: Invoice[],
  customers: Customer[],
  asOfDate: string,
): ResolvedReceivableInvoice[] {
  return invoices
    .map((invoice) => {
      const asOfRemaining = getRemainingAmountAsOf(invoice, asOfDate)
      const asOfStatus = getPaymentStatusAsOf(invoice, asOfDate)
      const resolvedCustomer = resolveInvoiceCustomer(invoice, customers)
      return {
        ...invoice,
        resolvedCustomerId: resolvedCustomer?.Id ?? null,
        resolvedCustomerName: resolvedCustomer?.name?.trim() || invoice.customer_name?.trim() || '미확인 고객',
        asOfRemaining,
        asOfStatus,
      }
    })
    .filter((invoice) => {
      const invoiceDate = invoice.invoice_date?.slice(0, 10)
      if (!invoiceDate) return false
      return invoiceDate <= asOfDate && invoice.asOfRemaining > 0
    })
}

export function buildCustomerReceivableSummary(
  invoices: ResolvedReceivableInvoice[],
  customers: Customer[],
): CustomerReceivableSummary[] {
  const customerById = new Map(customers.map((customer) => [customer.Id, customer]))
  const summaryByCustomerId = new Map<number, CustomerReceivableSummary>()

  for (const invoice of invoices) {
    if (!invoice.resolvedCustomerId) continue
    const customer = customerById.get(invoice.resolvedCustomerId)
    if (!customer) continue

    const existing = summaryByCustomerId.get(customer.Id) ?? {
      customerId: customer.Id,
      customerName: customer.name?.trim() || invoice.resolvedCustomerName,
      totalRemaining: 0,
      invoiceCount: 0,
      aliases: [],
    }

    existing.totalRemaining += invoice.asOfRemaining
    existing.invoiceCount += 1

    const invoiceName = invoice.customer_name?.trim()
    if (invoiceName && invoiceName !== customer.name?.trim() && invoiceName !== customer.book_name?.trim()) {
      if (!existing.aliases.includes(invoiceName)) existing.aliases.push(invoiceName)
    }

    summaryByCustomerId.set(customer.Id, existing)
  }

  return Array.from(summaryByCustomerId.values()).sort((left, right) => right.totalRemaining - left.totalRemaining)
}

export function buildCustomerReceivableLedger(
  customers: Customer[],
  invoices: ResolvedReceivableInvoice[],
  snapshots?: LegacyCustomerSnapshotPayload,
): CustomerReceivableLedger[] {
  const ledgerByCustomerId = new Map<number, CustomerReceivableLedger>()

  for (const customer of customers) {
    const legacyBaseline = getLegacyReceivableBaselineFromSnapshots(customer, snapshots)
    if (legacyBaseline <= 0) continue

    ledgerByCustomerId.set(customer.Id, {
      customerId: customer.Id,
      customerName: customer.name?.trim() || '미확인 고객',
      legacyBaseline,
      crmRemaining: 0,
      totalRemaining: legacyBaseline,
      invoiceCount: 0,
      aliases: [],
      source: 'legacy',
    })
  }

  const customerById = new Map(customers.map((customer) => [customer.Id, customer]))
  for (const invoice of invoices) {
    if (!invoice.resolvedCustomerId) continue
    const customer = customerById.get(invoice.resolvedCustomerId)
    if (!customer) continue

    const existing = ledgerByCustomerId.get(customer.Id) ?? {
      customerId: customer.Id,
      customerName: customer.name?.trim() || invoice.resolvedCustomerName,
      legacyBaseline: 0,
      crmRemaining: 0,
      totalRemaining: 0,
      invoiceCount: 0,
      aliases: [],
      source: 'crm' as const,
    }

    existing.crmRemaining += invoice.asOfRemaining
    existing.totalRemaining = existing.legacyBaseline + existing.crmRemaining
    existing.invoiceCount += 1

    const invoiceName = invoice.customer_name?.trim()
    if (invoiceName && invoiceName !== customer.name?.trim() && invoiceName !== customer.book_name?.trim()) {
      if (!existing.aliases.includes(invoiceName)) existing.aliases.push(invoiceName)
    }

    if (existing.legacyBaseline > 0 && existing.crmRemaining > 0) existing.source = 'both'
    else if (existing.legacyBaseline > 0) existing.source = 'legacy'
    else existing.source = 'crm'

    ledgerByCustomerId.set(customer.Id, existing)
  }

  return Array.from(ledgerByCustomerId.values())
    .filter((entry) => entry.totalRemaining > 0)
    .sort((left, right) => right.totalRemaining - left.totalRemaining)
}
