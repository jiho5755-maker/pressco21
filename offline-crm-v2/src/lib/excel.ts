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

export function exportReceivables(invoices: Invoice[]): void {
  const today = Date.now()
  const data = invoices.map((inv) => {
    const days = inv.invoice_date
      ? Math.floor((today - new Date(inv.invoice_date).getTime()) / 86400000)
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
