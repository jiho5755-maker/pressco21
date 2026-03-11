/**
 * SheetJS 엑셀 내보내기 유틸리티
 */
import * as XLSX from 'xlsx'
import type { Customer, Invoice, TxHistory } from './api'

function downloadXlsx(data: Record<string, unknown>[], filename: string): void {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

function writeWorkbook(workbook: XLSX.WorkBook, filename: string): void {
  XLSX.writeFile(workbook, filename)
}

export function exportCustomers(customers: Customer[]): void {
  const data = customers.map((c) => ({
    거래처명: c.name ?? '',
    유형: c.customer_type ?? '',
    상태: c.customer_status ?? '',
    전화: c.phone ?? '',
    이메일: c.email ?? '',
    주소: c.address1 ?? '',
    총거래건수: c.total_order_count ?? 0,
    총매출: c.total_order_amount ?? 0,
    미수금: c.outstanding_balance ?? 0,
    최초거래일: c.first_order_date?.slice(0, 10) ?? '',
    최종거래일: c.last_order_date?.slice(0, 10) ?? '',
  }))
  downloadXlsx(data, '고객목록')
}

export function exportReceivables(invoices: Invoice[], baseDate = new Date().toISOString().slice(0, 10)): void {
  const baseTime = new Date(baseDate).getTime()
  const data = invoices.map((inv) => {
    const days = inv.invoice_date
      ? Math.floor((baseTime - new Date(inv.invoice_date).getTime()) / 86400000)
      : 0
    const remaining = (inv.total_amount ?? 0) - (inv.paid_amount ?? 0)
    return {
      발행번호: inv.invoice_no ?? '',
      거래처: inv.customer_name ?? '',
      발행일: inv.invoice_date?.slice(0, 10) ?? '',
      경과일수: days,
      합계금액: inv.total_amount ?? 0,
      입금액: inv.paid_amount ?? 0,
      미수금: remaining,
      상태: inv.payment_status === 'partial' ? '부분수금' : '미수금',
    }
  })
  downloadXlsx(data, '미수금현황')
}

export interface OutgoingLedgerExportRow {
  customerName: string
  kind: string
  amount: number
  note?: string
  bookName?: string
}

export function exportOutgoingLedger(rows: OutgoingLedgerExportRow[], filename = '지급현황'): void {
  const data = rows.map((row) => ({
    거래처: row.customerName,
    지급구분: row.kind,
    금액: row.amount,
    장부명: row.bookName ?? '',
    비고: row.note ?? '',
  }))
  downloadXlsx(data, filename)
}

export interface MonthlyAccountingSummaryExportRow {
  month: string
  legacySales: number
  crmSales: number
  totalSales: number
  legacyReceipts: number
  legacyPayments: number
}

export function exportMonthlyAccountingSummary(
  rows: MonthlyAccountingSummaryExportRow[],
  filename = '월별회계요약',
): void {
  const data = rows.map((row) => ({
    월: row.month,
    '기존 장부 매출': row.legacySales,
    '새 입력 매출': row.crmSales,
    '총 매출': row.totalSales,
    '기존 장부 입금': row.legacyReceipts,
    '기존 장부 지급': row.legacyPayments,
  }))
  downloadXlsx(data, filename)
}

export function exportTxHistory(txs: TxHistory[], filename = '거래내역'): void {
  const data = txs.map((tx) => ({
    거래일: tx.tx_date?.slice(0, 10) ?? '',
    거래처: tx.customer_name ?? '',
    거래유형: tx.tx_type ?? '',
    금액: tx.amount ?? 0,
    적요: tx.memo ?? '',
    전표번호: tx.slip_no ?? '',
  }))
  downloadXlsx(data, filename)
}

export interface UnifiedTransactionExportRow {
  date: string
  customerName: string
  txType: string
  amount: number
  tax?: number
  slipNo?: string
  memo?: string
  sourceLabel?: string
}

export function exportUnifiedTransactions(rows: UnifiedTransactionExportRow[], filename = '거래내역'): void {
  const data = rows.map((row) => ({
    거래일: row.date,
    거래처: row.customerName,
    거래유형: row.txType,
    금액: row.amount,
    세액: row.tax ?? 0,
    전표번호: row.slipNo ?? '',
    적요: row.memo ?? '',
    구분: row.sourceLabel ?? '',
  }))
  downloadXlsx(data, filename)
}

export function exportInvoices(invoices: Invoice[]): void {
  const data = invoices.map((inv) => ({
    발행번호: inv.invoice_no ?? '',
    거래처: inv.customer_name ?? '',
    발행일: inv.invoice_date?.slice(0, 10) ?? '',
    공급가액: inv.supply_amount ?? 0,
    세액: inv.tax_amount ?? 0,
    합계금액: inv.total_amount ?? 0,
    입금액: inv.paid_amount ?? 0,
    수금상태:
      inv.payment_status === 'paid'
        ? '완납'
        : inv.payment_status === 'partial'
          ? '부분수금'
          : '미수금',
  }))
  downloadXlsx(data, '명세표목록')
}

export interface CourierInvoiceRow {
  receiverName: string
  receiverPhone: string
  receiverMobile: string
  receiverAddress: string
  quantity: number
  deliveryMessage: string
}

interface CourierExportOptions {
  filename?: string
  dateLabel?: string
}

export function exportCourierInvoices(rows: CourierInvoiceRow[], options: CourierExportOptions = {}): void {
  const headers = [
    '받는분',
    '받는분전화',
    '받는분핸드폰',
    '받는분총주소',
    '수량',
    '배송메세지',
    '', '', '', '', '', '', '', '',
  ]

  const sheetRows = [
    headers,
    ...rows.map((row) => ([
      row.receiverName,
      row.receiverPhone,
      row.receiverMobile,
      row.receiverAddress,
      row.quantity,
      row.deliveryMessage,
      '', '', '', '', '', '', '', '',
    ])),
  ]

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows)
  worksheet['!cols'] = [
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 48 },
    { wch: 8 },
    { wch: 28 },
    { wch: 6 },
    { wch: 6 },
    { wch: 6 },
    { wch: 6 },
    { wch: 6 },
    { wch: 6 },
    { wch: 6 },
    { wch: 6 },
  ]
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

  const today = new Date().toISOString().slice(0, 10)
  const baseName = options.filename ?? '전자송장(3.9)'
  const suffix = options.dateLabel ? `_${options.dateLabel}` : `_${today}`
  writeWorkbook(workbook, `${baseName}${suffix}.xlsx`)
}
