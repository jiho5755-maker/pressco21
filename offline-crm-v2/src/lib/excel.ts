/**
 * ExcelJS 기반 엑셀 내보내기 유틸리티
 *
 * - 보안 경고가 남아 있던 SheetJS(xlsx)를 제거하고 ExcelJS로 .xlsx만 생성한다.
 * - .xls 레거시 바이너리 형식은 생성하지 않는다.
 */
import type ExcelJS from 'exceljs'
import type { Customer, Invoice, TxHistory } from './api'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

type ExportCellValue = string | number | boolean | Date | null | undefined

type ExportRow = Record<string, ExportCellValue>

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10)
}

function safeSheetName(name: string): string {
  return (name || 'Sheet1').replace(/[\\/*?:[\]]/g, ' ').trim().slice(0, 31) || 'Sheet1'
}

function safeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_')
}

function appendRows(worksheet: ExcelJS.Worksheet, rows: ExportRow[]): void {
  if (rows.length === 0) return

  const headers = Object.keys(rows[0])
  worksheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.min(Math.max(header.length + 4, 12), 40),
  }))

  rows.forEach((row) => worksheet.addRow(row))

  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF2E7' } }
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } }
  })

  worksheet.columns.forEach((column) => {
    let maxLength = String(column.header ?? '').length
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const value = cell.value
      const text = value == null ? '' : String(value)
      maxLength = Math.max(maxLength, text.length)
    })
    column.width = Math.min(Math.max(maxLength + 2, Number(column.width) || 12), 50)
  })
}

async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer as BlobPart], { type: XLSX_MIME })
  const url = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = safeFilename(filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function createWorkbook(): Promise<ExcelJS.Workbook> {
  const ExcelJSRuntime = (await import('exceljs')).default
  return new ExcelJSRuntime.Workbook()
}

async function downloadXlsx(data: ExportRow[], filename: string): Promise<void> {
  const workbook = await createWorkbook()
  workbook.creator = 'PRESSCO21 CRM'
  workbook.created = new Date()
  const worksheet = workbook.addWorksheet(safeSheetName(filename))
  appendRows(worksheet, data)
  await downloadWorkbook(workbook, `${filename}_${todayStamp()}.xlsx`)
}

export function exportCustomers(customers: Customer[]): Promise<void> {
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
  return downloadXlsx(data, '고객목록')
}

export function exportReceivables(invoices: Invoice[], baseDate = new Date().toISOString().slice(0, 10)): Promise<void> {
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
  return downloadXlsx(data, '미수금현황')
}

export interface OutgoingLedgerExportRow {
  customerName: string
  kind: string
  amount: number
  note?: string
  bookName?: string
}

export function exportOutgoingLedger(rows: OutgoingLedgerExportRow[], filename = '지급현황'): Promise<void> {
  const data = rows.map((row) => ({
    거래처: row.customerName,
    지급구분: row.kind,
    금액: row.amount,
    장부명: row.bookName ?? '',
    비고: row.note ?? '',
  }))
  return downloadXlsx(data, filename)
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
): Promise<void> {
  const data = rows.map((row) => ({
    월: row.month,
    '기존 장부 매출': row.legacySales,
    '새 입력 매출': row.crmSales,
    '총 매출': row.totalSales,
    '기존 장부 입금': row.legacyReceipts,
    '기존 장부 지급': row.legacyPayments,
  }))
  return downloadXlsx(data, filename)
}

export function exportTxHistory(txs: TxHistory[], filename = '거래내역'): Promise<void> {
  const data = txs.map((tx) => ({
    거래일: tx.tx_date?.slice(0, 10) ?? '',
    거래처: tx.customer_name ?? '',
    거래유형: tx.tx_type ?? '',
    금액: tx.amount ?? 0,
    적요: tx.memo ?? '',
    전표번호: tx.slip_no ?? '',
  }))
  return downloadXlsx(data, filename)
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

export function exportUnifiedTransactions(rows: UnifiedTransactionExportRow[], filename = '거래내역'): Promise<void> {
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
  return downloadXlsx(data, filename)
}

export function exportInvoices(invoices: Invoice[]): Promise<void> {
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
  return downloadXlsx(data, '명세표목록')
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

export async function exportCourierInvoices(rows: CourierInvoiceRow[], options: CourierExportOptions = {}): Promise<void> {
  const headers = [
    '받는분',
    '받는분전화',
    '받는분핸드폰',
    '받는분총주소',
    '수량',
    '배송메세지',
    '', '', '', '', '', '', '', '',
  ]

  const workbook = await createWorkbook()
  workbook.creator = 'PRESSCO21 CRM'
  workbook.created = new Date()
  const worksheet = workbook.addWorksheet('Sheet1')
  worksheet.addRow(headers)
  rows.forEach((row) => {
    worksheet.addRow([
      row.receiverName,
      row.receiverPhone,
      row.receiverMobile,
      row.receiverAddress,
      row.quantity,
      row.deliveryMessage,
      '', '', '', '', '', '', '', '',
    ])
  })
  worksheet.columns = [
    { width: 18 },
    { width: 16 },
    { width: 16 },
    { width: 48 },
    { width: 8 },
    { width: 28 },
    { width: 6 },
    { width: 6 },
    { width: 6 },
    { width: 6 },
    { width: 6 },
    { width: 6 },
    { width: 6 },
    { width: 6 },
  ]
  worksheet.getRow(1).font = { bold: true }

  const baseName = options.filename ?? '전자송장(3.9)'
  const suffix = options.dateLabel ? `_${options.dateLabel}` : `_${todayStamp()}`
  await downloadWorkbook(workbook, `${baseName}${suffix}.xlsx`)
}
