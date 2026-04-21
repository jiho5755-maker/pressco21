/**
 * ExcelJS 기반 엑셀 내보내기 유틸리티
 *
 * - 보안 경고가 남아 있던 SheetJS(xlsx)를 제거하고 ExcelJS로 .xlsx만 생성한다.
 * - .xls 레거시 바이너리 형식은 생성하지 않는다.
 */
import type ExcelJS from 'exceljs'
import type { Customer, Invoice, TxHistory } from './api'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const BRAND_NAME = 'PRESSCO21 CRM'
const EXPORT_AUTHOR = 'PRESSCO21 Offline CRM'
const TABLE_HEADER_FILL = 'FF1F4E3D'
const TABLE_HEADER_TEXT = 'FFFFFFFF'
const TABLE_ACCENT_FILL = 'FFEAF3EE'
const TABLE_BORDER = 'FFD7E2DB'
const META_LABEL_FILL = 'FFF4F7F5'
const META_VALUE_FILL = 'FFFFFFFF'
const TITLE_FILL = 'FF173B30'
const SUBTITLE_TEXT = 'FF5F6E67'
const ZEBRA_FILL = 'FFFAFCFB'
const SUMMARY_VALUE_FILL = 'FFF5FAF7'
const NEGATIVE_TEXT = 'FFC62828'
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

type ExportCellValue = string | number | boolean | Date | null | undefined

type ExportRow = Record<string, ExportCellValue>

type ColumnValueType = 'text' | 'date' | 'month' | 'amount' | 'integer'

interface ExportMetadataItem {
  label: string
  value: ExportCellValue
}

interface ExportSummaryMetric {
  label: string
  value: ExportCellValue
  type?: ColumnValueType
}

interface ExportColumnOption {
  type?: ColumnValueType
  width?: number
  wrapText?: boolean
  horizontal?: ExcelJS.Alignment['horizontal']
  numFmt?: string
}

interface SheetRenderOptions {
  title?: string
  subtitle?: string
  sheetName?: string
  metadata?: ExportMetadataItem[]
  summaryMetrics?: ExportSummaryMetric[]
  columns?: Record<string, ExportColumnOption>
  landscape?: boolean
  tabColor?: string
}

interface SummaryTableRow {
  label: string
  count: number
  amount: number
  tax: number
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10)
}

function safeSheetName(name: string): string {
  return (name || 'Sheet1').replace(/[\\/*?:[\]]/g, ' ').trim().slice(0, 31) || 'Sheet1'
}

function safeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_')
}

function formatDateTime(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  const hours = String(value.getHours()).padStart(2, '0')
  const minutes = String(value.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function toDisplayText(value: ExportCellValue): string {
  if (value == null) return ''
  if (value instanceof Date) return formatDateTime(value)
  return String(value)
}

function estimateTextWidth(value: ExportCellValue): number {
  const text = toDisplayText(value)
  return Array.from(text).reduce((sum, char) => sum + (char.charCodeAt(0) > 255 ? 2 : 1), 0)
}

function parseDateOnly(value: string): Date | null {
  if (!DATE_ONLY_RE.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function inferColumnType(header: string): ColumnValueType {
  if (header === '월') return 'month'
  if (/(일자|일시|날짜|발행일|거래일|최초거래일|최종거래일|기준일)/.test(header)) return 'date'
  if (/(금액|매출|세액|미수|잔액|입금액|입금|지급|공급가액|합계|총액)/.test(header)) return 'amount'
  if (/(건수|수량|경과일수)/.test(header)) return 'integer'
  return 'text'
}

function buildColumnOption(header: string, override?: ExportColumnOption): Required<ExportColumnOption> {
  const type = override?.type ?? inferColumnType(header)
  const isWideText = /(주소|메모|적요|비고)/.test(header)

  const defaultsByType: Record<ColumnValueType, Required<ExportColumnOption>> = {
    text: {
      type: 'text',
      width: isWideText ? 28 : /(거래처|거래처명|품목명|장부명)/.test(header) ? 18 : 14,
      wrapText: isWideText,
      horizontal: isWideText ? 'left' : 'left',
      numFmt: '',
    },
    date: {
      type: 'date',
      width: 13,
      wrapText: false,
      horizontal: 'center',
      numFmt: 'yyyy-mm-dd',
    },
    month: {
      type: 'month',
      width: 10,
      wrapText: false,
      horizontal: 'center',
      numFmt: '',
    },
    amount: {
      type: 'amount',
      width: 14,
      wrapText: false,
      horizontal: 'right',
      numFmt: '#,##0;[Red]-#,##0',
    },
    integer: {
      type: 'integer',
      width: 10,
      wrapText: false,
      horizontal: 'right',
      numFmt: '#,##0',
    },
  }

  return {
    ...defaultsByType[type],
    ...override,
    type,
  }
}

function normalizeCellValue(value: ExportCellValue, type: ColumnValueType): ExportCellValue {
  if (value == null) return ''
  if (type === 'date' && typeof value === 'string') {
    return parseDateOnly(value) ?? value
  }
  return value
}

function applyTableCellBorder(cell: ExcelJS.Cell): void {
  cell.border = {
    top: { style: 'thin', color: { argb: TABLE_BORDER } },
    bottom: { style: 'thin', color: { argb: TABLE_BORDER } },
    left: { style: 'thin', color: { argb: TABLE_BORDER } },
    right: { style: 'thin', color: { argb: TABLE_BORDER } },
  }
}

function formatMetricValue(value: ExportCellValue, type: ColumnValueType = 'text'): ExportCellValue {
  if (type === 'date' && typeof value === 'string') {
    return parseDateOnly(value) ?? value
  }
  return value ?? ''
}

function appendRows(
  worksheet: ExcelJS.Worksheet,
  rows: ExportRow[],
  options: SheetRenderOptions = {},
): { headerRowNumber: number; lastRowNumber: number } {
  const sourceRows = rows.length > 0 ? rows : [{ 안내: '내보낼 데이터가 없습니다.' }]
  const headers = Object.keys(sourceRows[0])
  const columnOptions = headers.map((header) => buildColumnOption(header, options.columns?.[header]))
  const widthScores = headers.map((header, index) => Math.max(estimateTextWidth(header) + 4, columnOptions[index].width))

  worksheet.properties.defaultRowHeight = 22
  worksheet.columns = headers.map((header, index) => ({
    key: header,
    width: columnOptions[index].width,
    style: {
      alignment: {
        vertical: 'middle',
        horizontal: columnOptions[index].horizontal,
        wrapText: columnOptions[index].wrapText,
      },
      numFmt: columnOptions[index].numFmt || undefined,
      font: { name: 'Malgun Gothic', size: 10 },
    },
  }))

  const lastColumnLetter = worksheet.getColumn(Math.max(headers.length, 1)).letter
  const metadata: ExportMetadataItem[] = [
    ...(options.metadata ?? []),
    { label: '생성일시', value: formatDateTime(new Date()) },
    { label: '행 수', value: rows.length },
  ]

  let currentRow = 1
  if (headers.length > 0) {
    worksheet.mergeCells(`A${currentRow}:${lastColumnLetter}${currentRow}`)
  }
  const titleCell = worksheet.getCell(`A${currentRow}`)
  titleCell.value = options.title ?? options.sheetName ?? '엑셀 내보내기'
  titleCell.font = { name: 'Malgun Gothic', size: 16, bold: true, color: { argb: TABLE_HEADER_TEXT } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TITLE_FILL } }
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
  worksheet.getRow(currentRow).height = 28
  currentRow += 1

  if (options.subtitle) {
    if (headers.length > 0) {
      worksheet.mergeCells(`A${currentRow}:${lastColumnLetter}${currentRow}`)
    }
    const subtitleCell = worksheet.getCell(`A${currentRow}`)
    subtitleCell.value = options.subtitle
    subtitleCell.font = { name: 'Malgun Gothic', size: 10, color: { argb: SUBTITLE_TEXT } }
    subtitleCell.alignment = { vertical: 'middle', horizontal: 'left' }
    worksheet.getRow(currentRow).height = 18
    currentRow += 1
  }

  metadata.forEach((item) => {
    const labelCell = worksheet.getCell(`A${currentRow}`)
    const valueCell = worksheet.getCell(`B${currentRow}`)
    const metricType = buildColumnOption(item.label).type
    labelCell.value = item.label
    valueCell.value = formatMetricValue(item.value, metricType)
    labelCell.font = { name: 'Malgun Gothic', size: 10, bold: true, color: { argb: TITLE_FILL } }
    valueCell.font = { name: 'Malgun Gothic', size: 10, color: { argb: 'FF202827' } }
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: META_LABEL_FILL } }
    valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: META_VALUE_FILL } }
    labelCell.alignment = { vertical: 'middle', horizontal: 'left' }
    valueCell.alignment = {
      vertical: 'middle',
      horizontal: metricType === 'amount' || metricType === 'integer' ? 'right' : 'left',
      wrapText: true,
    }
    if (metricType === 'amount') valueCell.numFmt = '#,##0;[Red]-#,##0'
    if (metricType === 'integer') valueCell.numFmt = '#,##0'
    if (metricType === 'date') valueCell.numFmt = 'yyyy-mm-dd'
    applyTableCellBorder(labelCell)
    applyTableCellBorder(valueCell)

    if (headers.length > 2) {
      worksheet.mergeCells(`B${currentRow}:${lastColumnLetter}${currentRow}`)
    }
    currentRow += 1
  })

  if (options.summaryMetrics && options.summaryMetrics.length > 0) {
    currentRow += 1
    const summaryTitle = worksheet.getCell(`A${currentRow}`)
    summaryTitle.value = '요약'
    summaryTitle.font = { name: 'Malgun Gothic', size: 11, bold: true, color: { argb: TITLE_FILL } }
    summaryTitle.alignment = { vertical: 'middle', horizontal: 'left' }
    currentRow += 1

    options.summaryMetrics.forEach((metric) => {
      const labelCell = worksheet.getCell(`A${currentRow}`)
      const valueCell = worksheet.getCell(`B${currentRow}`)
      labelCell.value = metric.label
      valueCell.value = formatMetricValue(metric.value, metric.type)
      labelCell.font = { name: 'Malgun Gothic', size: 10, bold: true, color: { argb: TITLE_FILL } }
      valueCell.font = {
        name: 'Malgun Gothic',
        size: 10,
        bold: metric.type === 'amount' || metric.type === 'integer',
        color: { argb: 'FF202827' },
      }
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TABLE_ACCENT_FILL } }
      valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUMMARY_VALUE_FILL } }
      labelCell.alignment = { vertical: 'middle', horizontal: 'left' }
      valueCell.alignment = {
        vertical: 'middle',
        horizontal: metric.type === 'amount' || metric.type === 'integer' ? 'right' : 'left',
      }
      if (metric.type === 'amount') valueCell.numFmt = '#,##0;[Red]-#,##0'
      if (metric.type === 'integer') valueCell.numFmt = '#,##0'
      if (metric.type === 'date') valueCell.numFmt = 'yyyy-mm-dd'
      applyTableCellBorder(labelCell)
      applyTableCellBorder(valueCell)
      if (headers.length > 2) {
        worksheet.mergeCells(`B${currentRow}:${lastColumnLetter}${currentRow}`)
      }
      currentRow += 1
    })
  }

  currentRow += 1
  const headerRow = worksheet.addRow(headers)
  const headerRowNumber = headerRow.number
  headerRow.height = 24
  headerRow.font = { name: 'Malgun Gothic', size: 10, bold: true, color: { argb: TABLE_HEADER_TEXT } }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TABLE_HEADER_FILL } }
    applyTableCellBorder(cell)
  })

  sourceRows.forEach((row, rowIndex) => {
    const dataRow = worksheet.addRow(
      headers.map((header, columnIndex) => normalizeCellValue(row[header], columnOptions[columnIndex].type)),
    )
    dataRow.height = 20
    dataRow.eachCell((cell, columnNumber) => {
      const columnOption = columnOptions[columnNumber - 1]
      cell.font = { name: 'Malgun Gothic', size: 10, color: { argb: 'FF202827' } }
      cell.alignment = {
        vertical: 'middle',
        horizontal: columnOption.horizontal,
        wrapText: columnOption.wrapText,
      }
      if (columnOption.numFmt) {
        cell.numFmt = columnOption.numFmt
      }
      if (typeof cell.value === 'number' && cell.value < 0) {
        cell.font = { ...cell.font, color: { argb: NEGATIVE_TEXT } }
      }
      if (rowIndex % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_FILL } }
      }
      applyTableCellBorder(cell)

      widthScores[columnNumber - 1] = Math.max(
        widthScores[columnNumber - 1],
        estimateTextWidth(cell.value as ExportCellValue) + (columnOption.wrapText ? 1 : 3),
      )
    })
  })

  worksheet.autoFilter = {
    from: { row: headerRowNumber, column: 1 },
    to: { row: headerRowNumber, column: Math.max(headers.length, 1) },
  }
  worksheet.views = headers.length > 0
    ? [{ state: 'frozen', ySplit: headerRowNumber, topLeftCell: `A${headerRowNumber + 1}`, showGridLines: false }]
    : [{ state: 'normal', showGridLines: false }]
  worksheet.pageSetup = {
    paperSize: 9,
    orientation: (options.landscape ?? (headers.length >= 6)) ? 'landscape' : 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    showGridLines: false,
    horizontalCentered: false,
    verticalCentered: false,
    margins: {
      left: 0.35,
      right: 0.35,
      top: 0.6,
      bottom: 0.55,
      header: 0.3,
      footer: 0.3,
    },
    printTitlesRow: `${headerRowNumber}:${headerRowNumber}`,
  }
  worksheet.headerFooter = {
    oddHeader: `&L${options.title ?? options.sheetName ?? '내보내기'}&R${BRAND_NAME}`,
    oddFooter: `&L생성 ${todayStamp()}&R&P / &N`,
  }

  worksheet.columns.forEach((column, index) => {
    const columnOption = columnOptions[index]
    const computedWidth = Math.min(Math.max(widthScores[index], columnOption.width), columnOption.wrapText ? 42 : 28)
    column.width = columnOption.width ? Math.max(columnOption.width, computedWidth) : computedWidth
  })
  worksheet.getColumn(1).width = Math.max(worksheet.getColumn(1).width ?? 12, 14)
  worksheet.getColumn(2).width = Math.max(worksheet.getColumn(2).width ?? 16, 18)

  if (options.tabColor) {
    worksheet.properties.tabColor = { argb: options.tabColor }
  }

  return { headerRowNumber, lastRowNumber: worksheet.lastRow?.number ?? headerRowNumber }
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

async function createWorkbook(title = 'PRESSCO21 CRM 엑셀 내보내기'): Promise<ExcelJS.Workbook> {
  const ExcelJSRuntime = (await import('exceljs')).default
  const workbook = new ExcelJSRuntime.Workbook()
  const now = new Date()
  workbook.creator = EXPORT_AUTHOR
  workbook.lastModifiedBy = EXPORT_AUTHOR
  workbook.company = 'PRESSCO21'
  workbook.created = now
  workbook.modified = now
  workbook.title = title
  workbook.subject = 'PRESSCO21 CRM export workbook'
  workbook.category = 'CRM Export'
  workbook.description = 'PRESSCO21 Offline CRM에서 생성된 엑셀 보고서입니다.'
  workbook.keywords = 'PRESSCO21,CRM,Excel,Export'
  workbook.calcProperties.fullCalcOnLoad = true
  return workbook
}

async function downloadXlsx(data: ExportRow[], filename: string, options: SheetRenderOptions = {}): Promise<void> {
  const workbook = await createWorkbook(options.title ?? filename)
  const worksheet = workbook.addWorksheet(safeSheetName(options.sheetName ?? filename))
  appendRows(worksheet, data, {
    title: options.title ?? filename,
    subtitle: options.subtitle,
    sheetName: options.sheetName ?? filename,
    metadata: options.metadata,
    summaryMetrics: options.summaryMetrics,
    columns: options.columns,
    landscape: options.landscape,
    tabColor: options.tabColor ?? TABLE_HEADER_FILL,
  })
  await downloadWorkbook(workbook, `${filename}_${todayStamp()}.xlsx`)
}

function addUnifiedTransactionSummarySheet(
  workbook: ExcelJS.Workbook,
  rows: UnifiedTransactionExportRow[],
  filename: string,
): void {
  const worksheet = workbook.addWorksheet(safeSheetName(`${filename}_요약`))
  worksheet.properties.defaultRowHeight = 22
  worksheet.columns = [
    { width: 18 },
    { width: 18 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
    { width: 16 },
  ]

  worksheet.mergeCells('A1:F1')
  const titleCell = worksheet.getCell('A1')
  titleCell.value = `${filename} 요약`
  titleCell.font = { name: 'Malgun Gothic', size: 16, bold: true, color: { argb: TABLE_HEADER_TEXT } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TITLE_FILL } }
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
  worksheet.getRow(1).height = 28

  worksheet.mergeCells('A2:F2')
  const subtitleCell = worksheet.getCell('A2')
  subtitleCell.value = '거래유형별 집계와 핵심 지표를 함께 제공하는 보고서 요약입니다.'
  subtitleCell.font = { name: 'Malgun Gothic', size: 10, color: { argb: SUBTITLE_TEXT } }
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'left' }

  const validDates = rows
    .map((row) => row.date)
    .filter((value): value is string => Boolean(value && DATE_ONLY_RE.test(value)))
    .sort((a, b) => a.localeCompare(b))
  const totalAmount = rows.reduce((sum, row) => sum + (row.amount ?? 0), 0)
  const totalTax = rows.reduce((sum, row) => sum + (row.tax ?? 0), 0)
  const typeSet = new Set(rows.map((row) => row.txType).filter(Boolean))

  const metrics: ExportSummaryMetric[] = [
    { label: '총 거래 건수', value: rows.length, type: 'integer' },
    { label: '거래 기간', value: validDates.length > 0 ? `${validDates[0]} ~ ${validDates[validDates.length - 1]}` : '기간 정보 없음' },
    { label: '거래유형 수', value: typeSet.size, type: 'integer' },
    { label: '금액 합계', value: totalAmount, type: 'amount' },
    { label: '세액 합계', value: totalTax, type: 'amount' },
  ]

  let rowPointer = 4
  metrics.forEach((metric) => {
    const labelCell = worksheet.getCell(`A${rowPointer}`)
    const valueCell = worksheet.getCell(`B${rowPointer}`)
    labelCell.value = metric.label
    valueCell.value = formatMetricValue(metric.value, metric.type)
    labelCell.font = { name: 'Malgun Gothic', size: 10, bold: true, color: { argb: TITLE_FILL } }
    valueCell.font = { name: 'Malgun Gothic', size: 10, bold: metric.type !== 'text', color: { argb: 'FF202827' } }
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TABLE_ACCENT_FILL } }
    valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUMMARY_VALUE_FILL } }
    applyTableCellBorder(labelCell)
    applyTableCellBorder(valueCell)
    labelCell.alignment = { vertical: 'middle', horizontal: 'left' }
    valueCell.alignment = { vertical: 'middle', horizontal: metric.type === 'amount' || metric.type === 'integer' ? 'right' : 'left' }
    if (metric.type === 'amount') valueCell.numFmt = '#,##0;[Red]-#,##0'
    if (metric.type === 'integer') valueCell.numFmt = '#,##0'
    rowPointer += 1
  })

  const typeSummary = Array.from(
    rows.reduce((map, row) => {
      const key = row.txType || '기타'
      const current = map.get(key) ?? { label: key, count: 0, amount: 0, tax: 0 }
      current.count += 1
      current.amount += row.amount ?? 0
      current.tax += row.tax ?? 0
      map.set(key, current)
      return map
    }, new Map<string, SummaryTableRow>()),
  )
    .map(([, value]) => value)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))

  const typeHeaderRow = 4
  worksheet.getCell(`D${typeHeaderRow}`).value = '거래유형별 요약'
  worksheet.getCell(`D${typeHeaderRow}`).font = { name: 'Malgun Gothic', size: 11, bold: true, color: { argb: TITLE_FILL } }
  worksheet.getCell(`D${typeHeaderRow + 1}`).value = '거래유형'
  worksheet.getCell(`E${typeHeaderRow + 1}`).value = '건수'
  worksheet.getCell(`F${typeHeaderRow + 1}`).value = '금액 합계'

  ;[worksheet.getCell(`D${typeHeaderRow + 1}`), worksheet.getCell(`E${typeHeaderRow + 1}`), worksheet.getCell(`F${typeHeaderRow + 1}`)].forEach((cell) => {
    cell.font = { name: 'Malgun Gothic', size: 10, bold: true, color: { argb: TABLE_HEADER_TEXT } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TABLE_HEADER_FILL } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    applyTableCellBorder(cell)
  })

  typeSummary.forEach((item, index) => {
    const rowNumber = typeHeaderRow + 2 + index
    worksheet.getCell(`D${rowNumber}`).value = item.label
    worksheet.getCell(`E${rowNumber}`).value = item.count
    worksheet.getCell(`F${rowNumber}`).value = item.amount
    worksheet.getCell(`E${rowNumber}`).numFmt = '#,##0'
    worksheet.getCell(`F${rowNumber}`).numFmt = '#,##0;[Red]-#,##0'
    ;['D', 'E', 'F'].forEach((col) => {
      const cell = worksheet.getCell(`${col}${rowNumber}`)
      cell.font = { name: 'Malgun Gothic', size: 10, color: { argb: 'FF202827' } }
      cell.alignment = { vertical: 'middle', horizontal: col === 'D' ? 'left' : 'right' }
      if (index % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_FILL } }
      }
      applyTableCellBorder(cell)
    })
  })

  worksheet.views = [{ state: 'frozen', ySplit: 3, topLeftCell: 'A4', showGridLines: false }]
  worksheet.pageSetup = {
    paperSize: 9,
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    showGridLines: false,
    margins: {
      left: 0.35,
      right: 0.35,
      top: 0.6,
      bottom: 0.55,
      header: 0.3,
      footer: 0.3,
    },
  }
  worksheet.headerFooter = {
    oddHeader: `&L${filename} 요약&R${BRAND_NAME}`,
    oddFooter: `&L생성 ${todayStamp()}&R&P / &N`,
  }
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
  return downloadXlsx(data, '고객목록', {
    title: '고객 목록',
    subtitle: '거래처 현황과 핵심 재무 지표를 정리한 엑셀 보고서입니다.',
    metadata: [
      { label: '총 거래처 수', value: customers.length },
      { label: '총매출 합계', value: customers.reduce((sum, customer) => sum + Number(customer.total_order_amount ?? 0), 0) },
      { label: '미수금 합계', value: customers.reduce((sum, customer) => sum + Number(customer.outstanding_balance ?? 0), 0) },
    ],
    columns: {
      주소: { width: 32, wrapText: true },
      이메일: { width: 24 },
      거래처명: { width: 20 },
    },
    landscape: true,
  })
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
  return downloadXlsx(data, '미수금현황', {
    title: '미수금 현황',
    subtitle: '기준일 현재 열린 채권을 추적하기 위한 미수금 보고서입니다.',
    metadata: [
      { label: '기준일', value: baseDate },
      { label: '대상 명세표 수', value: invoices.length },
      { label: '미수금 합계', value: data.reduce((sum, row) => sum + Number(row.미수금 ?? 0), 0) },
    ],
    summaryMetrics: [
      { label: '평균 경과일수', value: data.length > 0 ? Math.round(data.reduce((sum, row) => sum + Number(row.경과일수 ?? 0), 0) / data.length) : 0, type: 'integer' },
      { label: '총 입금액', value: data.reduce((sum, row) => sum + Number(row.입금액 ?? 0), 0), type: 'amount' },
    ],
    columns: {
      발행번호: { width: 16, horizontal: 'center' },
      거래처: { width: 22 },
      상태: { width: 12, horizontal: 'center' },
    },
    landscape: true,
  })
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
  return downloadXlsx(data, filename, {
    title: '지급 현황',
    subtitle: '거래처별 지급 내역을 검토하기 위한 정산 자료입니다.',
    metadata: [
      { label: '대상 건수', value: rows.length },
      { label: '지급 총액', value: rows.reduce((sum, row) => sum + (row.amount ?? 0), 0) },
    ],
    columns: {
      거래처: { width: 20 },
      장부명: { width: 18 },
      비고: { width: 32, wrapText: true },
      지급구분: { width: 14, horizontal: 'center' },
    },
  })
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
  return downloadXlsx(data, filename, {
    title: '월별 회계 요약',
    subtitle: '기존 장부와 CRM 입력 실적을 월 단위로 비교하는 회계 요약 보고서입니다.',
    metadata: [
      { label: '대상 월 수', value: rows.length },
      { label: '총 매출 합계', value: rows.reduce((sum, row) => sum + row.totalSales, 0) },
    ],
    summaryMetrics: [
      { label: '기존 장부 매출 합계', value: rows.reduce((sum, row) => sum + row.legacySales, 0), type: 'amount' },
      { label: '새 입력 매출 합계', value: rows.reduce((sum, row) => sum + row.crmSales, 0), type: 'amount' },
    ],
    columns: {
      월: { width: 10, horizontal: 'center' },
    },
    landscape: true,
  })
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
  return downloadXlsx(data, filename, {
    title: '거래 내역',
    subtitle: '원장 기준 거래 흐름을 검토하기 위한 상세 거래 보고서입니다.',
    metadata: [
      { label: '대상 거래 수', value: txs.length },
      { label: '금액 합계', value: txs.reduce((sum, tx) => sum + Number(tx.amount ?? 0), 0) },
    ],
    columns: {
      거래처: { width: 20 },
      거래유형: { width: 14, horizontal: 'center' },
      적요: { width: 36, wrapText: true },
      전표번호: { width: 16, horizontal: 'center' },
    },
    landscape: true,
  })
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

export async function exportUnifiedTransactions(rows: UnifiedTransactionExportRow[], filename = '거래내역'): Promise<void> {
  const data = rows.map((row) => ({
    거래일: row.date,
    거래처: row.customerName,
    거래유형: row.txType,
    금액: row.amount,
    세액: row.tax ?? 0,
    전표번호: row.slipNo ?? '',
    적요: row.memo ?? '',
  }))

  const workbook = await createWorkbook(`${filename} 거래 보고서`)
  const detailSheet = workbook.addWorksheet(safeSheetName(filename))
  appendRows(detailSheet, data, {
    title: `${filename} 거래 보고서`,
    subtitle: '고객 상세 화면에서 조회한 필터 결과를 그대로 반영한 통합 거래 리포트입니다.',
    metadata: [
      { label: '대상 거래 수', value: rows.length },
      { label: '거래 기간', value: rows.length > 0 ? `${rows.map((row) => row.date).filter(Boolean).sort()[0] ?? '-'} ~ ${rows.map((row) => row.date).filter(Boolean).sort().slice(-1)[0] ?? '-'}` : '기간 정보 없음' },
      { label: '금액 합계', value: rows.reduce((sum, row) => sum + (row.amount ?? 0), 0) },
      { label: '세액 합계', value: rows.reduce((sum, row) => sum + (row.tax ?? 0), 0) },
    ],
    columns: {
      거래일: { width: 13, horizontal: 'center' },
      거래처: { width: 20 },
      거래유형: { width: 14, horizontal: 'center' },
      적요: { width: 40, wrapText: true },
      전표번호: { width: 16, horizontal: 'center' },
    },
    landscape: true,
    tabColor: 'FF1B5E4B',
  })
  addUnifiedTransactionSummarySheet(workbook, rows, filename)
  await downloadWorkbook(workbook, `${filename}_${todayStamp()}.xlsx`)
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
  return downloadXlsx(data, '명세표목록', {
    title: '명세표 목록',
    subtitle: '발행된 명세표와 수금 상태를 함께 검토하기 위한 문서입니다.',
    metadata: [
      { label: '대상 명세표 수', value: invoices.length },
      { label: '합계금액 총액', value: invoices.reduce((sum, invoice) => sum + Number(invoice.total_amount ?? 0), 0) },
      { label: '입금액 총액', value: invoices.reduce((sum, invoice) => sum + Number(invoice.paid_amount ?? 0), 0) },
    ],
    columns: {
      발행번호: { width: 16, horizontal: 'center' },
      거래처: { width: 20 },
      수금상태: { width: 12, horizontal: 'center' },
    },
    landscape: true,
  })
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

  const workbook = await createWorkbook('전자송장 업로드 파일')
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
  worksheet.getRow(1).font = { name: 'Malgun Gothic', size: 10, bold: true }
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }
  worksheet.views = [{ state: 'frozen', ySplit: 1, topLeftCell: 'A2', showGridLines: false }]
  worksheet.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    showGridLines: false,
    margins: {
      left: 0.35,
      right: 0.35,
      top: 0.5,
      bottom: 0.5,
      header: 0.3,
      footer: 0.3,
    },
  }

  const baseName = options.filename ?? '전자송장(3.9)'
  const suffix = options.dateLabel ? `_${options.dateLabel}` : `_${todayStamp()}`
  await downloadWorkbook(workbook, `${baseName}${suffix}.xlsx`)
}
