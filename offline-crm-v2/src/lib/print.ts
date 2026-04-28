/**
 * 거래명세표 인쇄 유틸리티
 * 기존 offline-crm/app.js의 인쇄 로직을 TypeScript로 이식
 * A4 상하 2단 복제 + iframe 기반 zoom 축소 방식
 */

export interface CompanyInfo {
  company?: string
  bizno?: string
  ceo?: string
  bizType?: string
  bizItem?: string
  address?: string
  phone?: string
  fax?: string
  email?: string
  logo_url?: string    // 로고 이미지 data URL
  stamp_url?: string   // 도장 이미지 data URL
  bank_name?: string
  bank_account?: string
  bank_holder?: string
  invoice_header?: string
  invoice_footer?: string
}

import { DEFAULT_RECEIPT_TYPE } from '@/lib/invoiceDefaults'
import { addDaysToDate, formatBusinessNumber, formatDisplayDate, formatPhoneNumber } from '@/lib/formatters'

export interface PrintInvoice {
  invoice_no?: string
  invoice_date?: string
  receipt_type?: string
  customer_name?: string
  manager?: string
  customer_ceo_name?: string
  customer_bizno?: string
  customer_biz_type?: string
  customer_biz_item?: string
  customer_address?: string
  customer_phone?: string
  supply_amount?: number
  tax_amount?: number
  total_amount?: number
  discount_amount?: number
  previous_balance?: number
  paid_amount?: number
  current_balance_override?: number
  memo?: string
}

export interface PrintItem {
  product_name?: string
  unit?: string
  quantity?: number
  unit_price?: number
  supply_amount?: number
  tax_amount?: number
}

export type PrintDocumentType = 'invoice' | 'estimate' | 'delivery' | 'bill' | 'packing' | 'comparison'

interface PrintDocumentDefinition {
  value: PrintDocumentType
  label: string
  title: string
  compactTitle: string
  dateLabel: string
  metaLabel: string
  metaValue: (inv: PrintInvoice) => string
  signatureText: (inv: PrintInvoice) => string
}

interface PrintDocumentOptions {
  documentType?: PrintDocumentType
}

interface ComparisonQuoteSettings {
  partnerCompany: string
  partnerBizno?: string
  partnerCeo?: string
  partnerBizType?: string
  partnerBizItem?: string
  partnerAddress?: string
  partnerPhone?: string
  markupRate: number
}

interface EstimateSupplier {
  company?: string
  bizno?: string
  ceo?: string
  bizType?: string
  bizItem?: string
  address?: string
  phone?: string
  logoHtml: string
  stampHtml: string
  bankInfo?: string
  subtitle?: string
  noteText?: string
}

const COMPANY_INFO_KEY = 'pressco21-crm-v2'
// Settings.tsx가 저장하는 키 (우선 참조)
const SETTINGS_MERGED_KEY = 'pressco21-crm-settings'
const COMPARISON_QUOTE_SETTINGS_KEY = 'pressco21-crm-comparison-quote-settings'

// 정적 이미지 fallback data URL (앱 시작 시 preloadPrintImages()로 채워짐)
let _logoFallback = ''
let _stampFallback = ''

/** public/images/ 정적 파일을 data URL로 변환해 캐시 (구 offline-crm 방식) */
export async function preloadPrintImages(): Promise<void> {
  async function toDataUrl(src: string): Promise<string> {
    try {
      const res = await fetch(src)
      if (!res.ok) return ''
      const blob = await res.blob()
      return await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => resolve('')
        reader.readAsDataURL(blob)
      })
    } catch {
      return ''
    }
  }
  const [logo, stamp] = await Promise.all([
    toDataUrl('/images/company-logo.png'),
    toDataUrl('/images/company-stamp.png'),
  ])
  if (logo) _logoFallback = logo
  if (stamp) _stampFallback = stamp
}

export function loadCompanyInfo(): CompanyInfo {
  // 두 키를 모두 읽어 병합 (logo/stamp는 어느 쪽에 있어도 반영)
  let fromLegacy: CompanyInfo = {}
  let fromSettings: CompanyInfo = {}
  try {
    const l = localStorage.getItem(COMPANY_INFO_KEY)
    if (l) fromLegacy = JSON.parse(l) as CompanyInfo
  } catch {
    // Ignore corrupt local print settings and fall back to defaults.
  }
  try {
    const s = localStorage.getItem(SETTINGS_MERGED_KEY)
    if (s) fromSettings = JSON.parse(s) as CompanyInfo
  } catch {
    // Ignore corrupt merged settings and fall back to the legacy/default values.
  }
  return {
    ...fromLegacy,
    ...fromSettings,
    // 어느 쪽에든 있으면 반영 (설정 저장 타이밍 무관)
    logo_url: sanitizePrintImageSrc(fromSettings.logo_url || fromLegacy.logo_url),
    stamp_url: sanitizePrintImageSrc(fromSettings.stamp_url || fromLegacy.stamp_url),
  }
}

export function saveCompanyInfo(info: CompanyInfo): void {
  localStorage.setItem(COMPANY_INFO_KEY, JSON.stringify(info))
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escAttr(str: string): string {
  return esc(str).replace(/'/g, '&#39;')
}

function buildPrintDocumentRef(prefix: string): string {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 12)
  return `${prefix}-${stamp}`
}

export function sanitizePrintImageSrc(value?: string): string {
  const src = String(value ?? '').trim()
  if (!src) return ''

  // Settings 업로드 경로: PNG/JPEG/WebP/GIF data URL만 허용한다.
  // SVG data URL은 Blob 인쇄 HTML에서 스크립트/이벤트 속성 주입 여지를 줄이기 위해 제외한다.
  if (/^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(src)) {
    return src
  }

  // 정적 fallback 이미지만 경로 기반으로 허용한다. 경로 traversal/따옴표 삽입 방지.
  if (/^\/images\/[a-z0-9._/-]+\.(?:png|jpe?g|webp|gif)$/i.test(src) && !src.includes('..')) {
    return src
  }

  return ''
}

// ── 멀티페이지 상수 ──
// 거래명세표/납품서/청구서는 10행까지 고정 행 높이를 유지하고,
// 11행부터는 다음 페이지로 넘겨 가독성을 보존한다.
const ITEMS_FIRST_PAGE = 10
const ITEMS_CONT_PAGE = 10
// 견적서는 단일 문서라 중간 페이지는 더 넉넉하게 사용하되,
// 마지막 페이지는 비고/합계/서명 블록 높이를 위해 여유를 남긴다.
const ESTIMATE_ITEMS_SINGLE_PAGE = 14
const ESTIMATE_ITEMS_MULTI_PAGE = 18
const ESTIMATE_ITEMS_LAST_PAGE = 14
const DUPLEX_HALF_TARGET_MM = 132
const DUPLEX_HALF_TARGET_PX = DUPLEX_HALF_TARGET_MM * (96 / 25.4)
// Chrome/Edge PDF 저장에서 A4 정확히 297mm를 꽉 채우면 마지막 빈 페이지가 붙는 경우가 있어
// 컨테이너 높이를 아주 미세하게 줄여 반올림 오차를 흡수한다.
const PRINT_PAGE_HEIGHT_MM = 296.8
const PRINT_HALF_HEIGHT_MM = PRINT_PAGE_HEIGHT_MM / 2

const PRINT_DOCUMENT_DEFINITIONS: Record<PrintDocumentType, PrintDocumentDefinition> = {
  invoice: {
    value: 'invoice',
    label: '명세표',
    title: '거 래 명 세 표',
    compactTitle: '거래명세표',
    dateLabel: '거래일자',
    metaLabel: '구분',
    metaValue: (inv) => inv.receipt_type ?? DEFAULT_RECEIPT_TYPE,
    signatureText: (inv) => `위 금액을 정히 ${inv.receipt_type ?? DEFAULT_RECEIPT_TYPE}합니다.`,
  },
  estimate: {
    value: 'estimate',
    label: '견적서',
    title: '견 적 서',
    compactTitle: '견적서',
    dateLabel: '견적일자',
    metaLabel: '유효기간',
    metaValue: (inv) => addDaysToDate(inv.invoice_date, 14) || formatDisplayDate(inv.invoice_date),
    signatureText: () => '상기와 같이 견적드립니다.',
  },
  delivery: {
    value: 'delivery',
    label: '납품서',
    title: '납 품 서',
    compactTitle: '납품서',
    dateLabel: '납품일자',
    metaLabel: '문서',
    metaValue: () => '납품용',
    signatureText: () => '위 물품을 정히 납품합니다.',
  },
  bill: {
    value: 'bill',
    label: '청구서',
    title: '청 구 서',
    compactTitle: '청구서',
    dateLabel: '청구일자',
    metaLabel: '문서',
    metaValue: () => '청구용',
    signatureText: () => '상기 금액을 정히 청구합니다.',
  },
  packing: {
    value: 'packing',
    label: '포장지시서',
    title: '포 장 지 시 서',
    compactTitle: '포장지시서',
    dateLabel: '출고일자',
    metaLabel: '문서',
    metaValue: () => '내부 작업용',
    signatureText: () => '포장 및 출고 내용을 확인합니다.',
  },
  comparison: {
    value: 'comparison',
    label: '비교견적',
    title: '비 교 견 적',
    compactTitle: '비교견적',
    dateLabel: '견적일자',
    metaLabel: '구성',
    metaValue: () => '자사견적+협력업체견적',
    signatureText: () => '상기와 같이 비교견적을 제출합니다.',
  },
}

export const PRINT_DOCUMENT_OPTIONS = Object.values(PRINT_DOCUMENT_DEFINITIONS).map((definition) => ({
  value: definition.value,
  label: definition.label,
}))

function getPrintDocumentDefinition(documentType: PrintDocumentType): PrintDocumentDefinition {
  return PRINT_DOCUMENT_DEFINITIONS[documentType]
}

function formatBizInfo(bizType?: string, bizItem?: string): string {
  return [bizType, bizItem].filter(Boolean).join(' / ')
}

function formatBankInfo(company: CompanyInfo): string {
  const bank = [company.bank_name, company.bank_account].filter(Boolean).join(' ')
  const holder = company.bank_holder ? `예금주 ${company.bank_holder}` : ''
  return [bank, holder].filter(Boolean).join(' / ')
}

function loadComparisonQuoteSettings(): ComparisonQuoteSettings {
  const defaults: ComparisonQuoteSettings = {
    partnerCompany: '꽃다미',
    partnerCeo: '임순옥',
    partnerBizno: '215-92-55266',
    partnerBizType: '소매,생화',
    partnerBizItem: '꽃,관엽',
    partnerAddress: '서울시 송파구 방이동439-16',
    partnerPhone: '',
    markupRate: 15,
  }

  try {
    const raw = localStorage.getItem(COMPARISON_QUOTE_SETTINGS_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<ComparisonQuoteSettings>
    const markupRate = Number(parsed.markupRate)
    return {
      ...defaults,
      ...parsed,
      partnerCompany: parsed.partnerCompany?.trim() || defaults.partnerCompany,
      markupRate: Number.isFinite(markupRate) ? Math.max(0, Math.min(100, markupRate)) : defaults.markupRate,
    }
  } catch {
    return defaults
  }
}

interface PageOptions {
  pageNum: number
  totalPages: number
  isFirst: boolean
  isLast: boolean
}

function buildInvoicePageHtml(
  inv: PrintInvoice,
  pageItems: PrintItem[],
  copyType: string,
  opts: PageOptions,
  startIndex: number,
  documentType: Exclude<PrintDocumentType, 'estimate'>,
): string {
  const c = loadCompanyInfo()
  const document = getPrintDocumentDefinition(documentType)
  const invoiceDate = formatDisplayDate(inv.invoice_date)
  const companyBizno = formatBusinessNumber(c.bizno)
  const customerBizno = formatBusinessNumber(inv.customer_bizno)
  const companyPhone = formatPhoneNumber(c.phone)
  const customerPhone = formatPhoneNumber(inv.customer_phone)
  const capacity = opts.isFirst ? ITEMS_FIRST_PAGE : ITEMS_CONT_PAGE
  const blankCount = opts.isLast ? Math.max(0, Math.min(8, capacity) - pageItems.length) : 0

  const prevBal = inv.previous_balance ?? 0
  const paidAmt = inv.paid_amount ?? 0
  const totalAmt = inv.total_amount ?? 0
  const discountAmt = inv.discount_amount ?? 0
  const subtotalAmt = (inv.supply_amount ?? 0) + (inv.tax_amount ?? 0)
  const curBal = prevBal + totalAmt - paidAmt
  const payNoteLines = [
    formatBankInfo(c) ? `입금계좌: ${formatBankInfo(c)}` : '',
    c.invoice_footer ?? '',
  ].filter(Boolean)

  const itemRowsHtml =
    pageItems
      .map(
        (item, i) =>
          '<tr>' +
          `<td class="t-center">${startIndex + i + 1}</td>` +
          `<td>${esc(item.product_name ?? '')}</td>` +
          `<td class="t-center">${esc(item.unit ?? '')}</td>` +
          `<td class="t-right">${(item.quantity ?? 0).toLocaleString()}</td>` +
          `<td class="t-right">${(item.unit_price ?? 0).toLocaleString()}</td>` +
          `<td class="t-right">${(item.supply_amount ?? 0).toLocaleString()}</td>` +
          `<td class="t-right">${(item.tax_amount ?? 0).toLocaleString()}</td>` +
          `<td class="t-right">${((item.supply_amount ?? 0) + (item.tax_amount ?? 0)).toLocaleString()}</td>` +
          '</tr>',
      )
      .join('') +
    Array(blankCount)
      .fill(
        '<tr class="inv-blank"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>',
      )
      .join('')

  const effectiveLogo = sanitizePrintImageSrc(c.logo_url || _logoFallback)
  const effectiveStamp = sanitizePrintImageSrc(c.stamp_url || _stampFallback)
  const logoHtml = effectiveLogo
    ? `<img src="${escAttr(effectiveLogo)}" alt="로고" style="height:40px;object-fit:contain;" />`
    : ''
  const stampHtml = effectiveStamp
    ? `<img src="${escAttr(effectiveStamp)}" alt="도장" class="inv-stamp-img" />`
    : ''

  let html = ''
  const pageLabel = opts.totalPages > 1 ? ` [${opts.pageNum}/${opts.totalPages}]` : ''

  if (opts.isFirst) {
    // ── 첫 페이지: 전체 헤더 (공급자/공급받는자 정보 포함) ──
    html +=
      '<div class="inv-header">' +
      `<div class="inv-logo">${logoHtml}</div>` +
      `<div class="inv-title-area"><div class="inv-title">${document.title}</div><div class="inv-sub">(${esc(copyType)})${pageLabel}</div></div>` +
      '<div></div>' +
      '</div>' +
      '<table class="inv-tbl inv-meta-tbl"><tr>' +
      `<td class="inv-ml">발행번호</td><td class="inv-mv">${esc(inv.invoice_no ?? '')}</td>` +
      `<td class="inv-ml">${esc(document.metaLabel)}</td><td class="inv-mv t-center">${esc(document.metaValue(inv))}</td>` +
      `<td class="inv-ml">${esc(document.dateLabel)}</td><td class="inv-mv">${esc(invoiceDate)}</td>` +
      '</tr></table>' +
      '<table class="inv-tbl inv-party-tbl">' +
      '<colgroup>' +
      '<col style="width:8%" /><col style="width:11%" /><col style="width:8%" /><col style="width:11%" />' +
      '<col style="width:1px" />' +
      '<col style="width:8%" /><col style="width:22%" /><col style="width:8%" /><col style="width:22%" />' +
      '</colgroup>' +
      '<thead><tr>' +
      '<th class="inv-party-title" colspan="4">공&nbsp;&nbsp;급&nbsp;&nbsp;자</th>' +
      '<th class="inv-party-div"></th>' +
      '<th class="inv-party-title" colspan="4">공&nbsp;급&nbsp;받&nbsp;는&nbsp;자</th>' +
      '</tr></thead>' +
      '<tbody>' +
      `<tr><td class="inv-pl">상호</td><td>${esc(c.company ?? '')}</td><td class="inv-pl">대표자</td><td>${esc(c.ceo ?? '')}</td>` +
      `<td class="inv-party-div"></td>` +
      `<td class="inv-pl">상호</td><td>${esc(inv.customer_name ?? '')}</td><td class="inv-pl">대표자</td><td>${esc(inv.customer_ceo_name ?? inv.manager ?? '')}</td></tr>` +
      `<tr><td class="inv-pl">사업자번호</td><td colspan="3">${esc(companyBizno)}</td>` +
      `<td class="inv-party-div"></td>` +
      `<td class="inv-pl">사업자번호</td><td colspan="3">${esc(customerBizno)}</td></tr>` +
      `<tr><td class="inv-pl">주소</td><td colspan="3">${esc(c.address ?? '')}</td>` +
      `<td class="inv-party-div"></td>` +
      `<td class="inv-pl">주소</td><td colspan="3">${esc(inv.customer_address ?? '')}</td></tr>` +
      `<tr><td class="inv-pl">업태/종목</td><td colspan="3">${esc(c.bizType ?? '')}&nbsp;/&nbsp;${esc(c.bizItem ?? '')}</td>` +
      `<td class="inv-party-div"></td>` +
      `<td class="inv-pl">업태/종목</td><td colspan="3">${esc(formatBizInfo(inv.customer_biz_type, inv.customer_biz_item))}</td></tr>` +
      `<tr><td class="inv-pl">전화</td><td colspan="3">${esc(companyPhone)}</td>` +
      `<td class="inv-party-div"></td>` +
      `<td class="inv-pl">전화</td><td colspan="3">${esc(customerPhone)}</td></tr>` +
      '</tbody></table>'
  } else {
    // ── 속지 페이지: 간략 헤더 ──
    html +=
      '<div class="inv-cont-header">' +
      `<div class="inv-cont-title">${document.compactTitle}</div>` +
      '<div class="inv-cont-info">' +
      `<span>발행번호: ${esc(inv.invoice_no ?? '')}</span>` +
      `<span>거래처: ${esc(inv.customer_name ?? '')}</span>` +
      `<span>${esc(copyType)} [${opts.pageNum}/${opts.totalPages}]</span>` +
      '</div>' +
      '</div>'
  }

  // ── 품목 테이블 (모든 페이지 공통) ──
  html +=
    '<table class="inv-tbl inv-items-table">' +
    '<thead><tr>' +
    '<th style="width:4%">No</th>' +
    '<th style="width:32%">품&nbsp;&nbsp;&nbsp;목&nbsp;&nbsp;&nbsp;명</th>' +
    '<th style="width:6%">단위</th>' +
    '<th style="width:7%">수량</th>' +
    '<th style="width:12%">단가</th>' +
    '<th style="width:14%">공급가액</th>' +
    '<th style="width:11%">세액</th>' +
    '<th style="width:14%">합계금액</th>' +
    '</tr></thead>' +
    `<tbody>${itemRowsHtml}</tbody>` +
    '</table>'

  if (opts.isLast) {
    // ── 마지막 페이지: 합계 + 잔액 + 비고 + 서명 ──
    html +=
      '<table class="inv-tbl inv-total-tbl"><tr>' +
      `<td class="inv-tl">공&nbsp;급&nbsp;가&nbsp;액</td><td class="inv-tv t-right">${(inv.supply_amount ?? 0).toLocaleString()}</td>` +
      `<td class="inv-tl">세&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;액</td><td class="inv-tv t-right">${(inv.tax_amount ?? 0).toLocaleString()}</td>` +
      `<td class="inv-tl inv-grand">${discountAmt > 0 ? '할인전&nbsp;합계' : '합&nbsp;계&nbsp;금&nbsp;액'}</td><td class="inv-tv inv-grand t-right">${(discountAmt > 0 ? subtotalAmt : totalAmt).toLocaleString()}</td>` +
      (discountAmt > 0
        ? '</tr><tr>' +
          `<td class="inv-tl">D&nbsp;C&nbsp;할&nbsp;인</td><td class="inv-tv t-right">-${discountAmt.toLocaleString()}</td>` +
          '<td class="inv-tl"></td><td class="inv-tv"></td>' +
          `<td class="inv-tl inv-grand">최종&nbsp;합계</td><td class="inv-tv inv-grand t-right">${totalAmt.toLocaleString()}</td>`
        : '') +
      '</tr></table>' +
      '<table class="inv-tbl inv-balance-tbl"><tr>' +
      `<td class="inv-bl">전&nbsp;&nbsp;잔&nbsp;&nbsp;액</td><td class="inv-bv t-right">${prevBal.toLocaleString()}</td>` +
      `<td class="inv-bl">출&nbsp;&nbsp;고&nbsp;&nbsp;액</td><td class="inv-bv t-right">${totalAmt.toLocaleString()}</td>` +
      `<td class="inv-bl">입&nbsp;&nbsp;금&nbsp;&nbsp;액</td><td class="inv-bv t-right">${paidAmt.toLocaleString()}</td>` +
      `<td class="inv-bl">현&nbsp;&nbsp;잔&nbsp;&nbsp;액</td>` +
      `<td class="inv-bv t-right${curBal > 0 ? ' inv-bv-warn' : ''}">${curBal.toLocaleString()}</td>` +
      '</tr></table>' +
      (inv.memo ? `<div class="inv-memo">비고:&nbsp;${esc(inv.memo)}</div>` : '') +
      (payNoteLines.length > 0
        ? `<div class="inv-paynote">${payNoteLines.map((line) => esc(line)).join('<br />')}</div>`
        : '') +
      '<div class="inv-sig">' +
      `<span class="inv-sig-text">${esc(document.signatureText(inv))}</span>` +
      '<div class="inv-sig-right">' +
      '<span class="inv-sig-label">대표자</span>' +
      '<div class="inv-sig-name-wrap">' +
      `<span class="inv-ceo-name">${esc(c.ceo ?? '')}</span>` +
      '<div class="inv-sig-underline"></div>' +
      '</div>' +
      '<div class="inv-seal-area">' +
      '<span class="inv-seal-text">(인)</span>' +
      `<span class="inv-stamp">${stampHtml}</span>` +
      '</div>' +
      '</div>' +
      '</div>'
  } else {
    // ── 중간 페이지: "다음 장 계속" 안내 ──
    html += '<div class="inv-cont-note">- 다음 장 계속 -</div>'
  }

  return html
}

/** 품목 수 기준 총 페이지 수 (미리보기 iframe 높이 계산용) */
export function getPreviewPageCount(itemCount: number, documentType: PrintDocumentType = 'invoice'): number {
  if (documentType === 'estimate') {
    return getEstimatePageItemCounts(itemCount).length
  }
  if (documentType === 'comparison') {
    return getEstimatePageItemCounts(itemCount).length
  }
  if (documentType === 'packing') {
    return Math.max(1, Math.ceil(Math.max(1, itemCount) / 12))
  }
  if (itemCount <= ITEMS_FIRST_PAGE) return 1
  return 1 + Math.ceil((itemCount - ITEMS_FIRST_PAGE) / ITEMS_CONT_PAGE)
}

/** 품목을 페이지 단위로 분할 */
function splitItemsToPages(items: PrintItem[]): PrintItem[][] {
  if (items.length <= ITEMS_FIRST_PAGE) return [items]
  const pages: PrintItem[][] = [items.slice(0, ITEMS_FIRST_PAGE)]
  let offset = ITEMS_FIRST_PAGE
  while (offset < items.length) {
    pages.push(items.slice(offset, offset + ITEMS_CONT_PAGE))
    offset += ITEMS_CONT_PAGE
  }
  return pages
}

function getEstimatePageItemCounts(itemCount: number): number[] {
  if (itemCount <= ESTIMATE_ITEMS_SINGLE_PAGE) return [itemCount]

  let pageCount = 2
  while (itemCount > (pageCount - 1) * ESTIMATE_ITEMS_MULTI_PAGE + ESTIMATE_ITEMS_LAST_PAGE) {
    pageCount += 1
  }

  const counts: number[] = []
  let remaining = itemCount

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const pagesLeft = pageCount - pageIndex
    if (pagesLeft === 1) {
      counts.push(remaining)
      break
    }

    const minRestItems = pagesLeft - 1
    const maxRestCapacity = (pagesLeft - 2) * ESTIMATE_ITEMS_MULTI_PAGE + ESTIMATE_ITEMS_LAST_PAGE
    const minCurrent = Math.max(1, remaining - maxRestCapacity)
    const maxCurrent = Math.min(ESTIMATE_ITEMS_MULTI_PAGE, remaining - minRestItems)
    const targetCurrent = Math.ceil(remaining / pagesLeft)
    const current = Math.min(maxCurrent, Math.max(minCurrent, targetCurrent))

    counts.push(current)
    remaining -= current
  }

  return counts
}

function splitEstimateItemsToPages(items: PrintItem[]): PrintItem[][] {
  const counts = getEstimatePageItemCounts(items.length)
  const pages: PrintItem[][] = []
  let offset = 0

  counts.forEach((count) => {
    pages.push(items.slice(offset, offset + count))
    offset += count
  })

  return pages
}

function buildDuplexInvoiceHtml(
  inv: PrintInvoice,
  items: PrintItem[],
  documentType: Exclude<PrintDocumentType, 'estimate'>,
): string {
  const pages = splitItemsToPages(items)
  const totalPages = pages.length

  return pages.map((pageItems, i) => {
    const opts: PageOptions = {
      pageNum: i + 1,
      totalPages,
      isFirst: i === 0,
      isLast: i === totalPages - 1,
    }
    const startIndex = i === 0 ? 0 : ITEMS_FIRST_PAGE + (i - 1) * ITEMS_CONT_PAGE
    const supplier = buildInvoicePageHtml(inv, pageItems, '공급자 보관용', opts, startIndex, documentType)
    const recipient = buildInvoicePageHtml(inv, pageItems, '공급받는자 보관용', opts, startIndex, documentType)
    return (
      '<div class="inv-page-duplex">' +
      '<div class="inv-half top"><div class="inv-scale-wrap">' +
      supplier +
      '</div></div>' +
      '<div class="inv-half bottom"><div class="inv-scale-wrap">' +
      recipient +
      '</div></div>' +
      '</div>'
    )
  }).join('')
}

function buildEstimatePageHtml(
  inv: PrintInvoice,
  pageItems: PrintItem[],
  opts: PageOptions,
  startIndex: number,
  supplierOverride?: EstimateSupplier,
): string {
  const c = loadCompanyInfo()
  const document = getPrintDocumentDefinition('estimate')
  const invoiceDate = formatDisplayDate(inv.invoice_date)
  const validUntil = addDaysToDate(inv.invoice_date, 14) || invoiceDate
  const effectiveLogo = sanitizePrintImageSrc(c.logo_url || _logoFallback)
  const effectiveStamp = sanitizePrintImageSrc(c.stamp_url || _stampFallback)
  const defaultSupplier: EstimateSupplier = {
    company: c.company,
    bizno: c.bizno,
    ceo: c.ceo,
    bizType: c.bizType,
    bizItem: c.bizItem,
    address: c.address,
    phone: c.phone,
    logoHtml: effectiveLogo
      ? `<img src="${escAttr(effectiveLogo)}" alt="로고" class="est-logo-img" />`
      : `<div class="est-logo-text">${esc(c.company ?? '')}</div>`,
    stampHtml: effectiveStamp
      ? `<img src="${escAttr(effectiveStamp)}" alt="도장" class="est-stamp-img" />`
      : '',
    bankInfo: formatBankInfo(c),
  }
  const supplier = supplierOverride ?? defaultSupplier
  const supplierBizno = formatBusinessNumber(supplier.bizno)
  const customerBizno = formatBusinessNumber(inv.customer_bizno)
  const supplierPhone = formatPhoneNumber(supplier.phone)
  const customerPhone = formatPhoneNumber(inv.customer_phone)
  const pageLabel = opts.totalPages > 1 ? ` / ${opts.pageNum}p` : ''
  const noteText = supplier.noteText ?? (inv.memo?.trim() || c.invoice_footer?.trim() || '견적 금액과 납품 조건은 협의 후 확정됩니다.')
  const subtitle = supplier.subtitle ? `${esc(supplier.subtitle)}${pageLabel}` : `${esc(inv.invoice_no ?? '')}${pageLabel}`

  const itemRowsHtml =
    pageItems
      .map((item, index) =>
        '<tr>' +
        `<td class="t-center">${startIndex + index + 1}</td>` +
        `<td>${esc(item.product_name ?? '')}</td>` +
        `<td class="t-center">${esc(item.unit ?? '')}</td>` +
        `<td class="t-right">${(item.quantity ?? 0).toLocaleString()}</td>` +
        `<td class="t-right">${(item.unit_price ?? 0).toLocaleString()}</td>` +
        `<td class="t-right">${(item.supply_amount ?? 0).toLocaleString()}</td>` +
        `<td class="t-right">${(item.tax_amount ?? 0).toLocaleString()}</td>` +
        `<td class="t-right">${((item.supply_amount ?? 0) + (item.tax_amount ?? 0)).toLocaleString()}</td>` +
        '</tr>'
      )
      .join('')

  return (
    '<section class="est-page">' +
    '<div class="est-shell">' +
    '<div class="est-top">' +
    `<div class="est-logo">${supplier.logoHtml}</div>` +
    `<div class="est-title-wrap"><div class="est-title">${document.title}</div><div class="est-sub">${subtitle}</div></div>` +
    '<div class="est-meta">' +
    `<div><span>${esc(document.dateLabel)}</span><strong>${esc(invoiceDate)}</strong></div>` +
    `<div><span>${esc(document.metaLabel)}</span><strong>${esc(validUntil)}</strong></div>` +
    '</div>' +
    '</div>' +
    '<table class="est-party-table">' +
    '<thead><tr><th colspan="4">공 급 자</th><th colspan="4">공 급 받 는 자</th></tr></thead>' +
    '<tbody>' +
    `<tr><td class="est-label">상호</td><td>${esc(supplier.company ?? '')}</td><td class="est-label">대표자</td><td>${esc(supplier.ceo ?? '')}</td><td class="est-label">상호</td><td>${esc(inv.customer_name ?? '')}</td><td class="est-label">대표자</td><td>${esc(inv.customer_ceo_name ?? inv.manager ?? '')}</td></tr>` +
    `<tr><td class="est-label">사업자번호</td><td>${esc(supplierBizno)}</td><td class="est-label">전화</td><td>${esc(supplierPhone)}</td><td class="est-label">사업자번호</td><td>${esc(customerBizno)}</td><td class="est-label">전화</td><td>${esc(customerPhone)}</td></tr>` +
    `<tr><td class="est-label">주소</td><td colspan="3">${esc(supplier.address ?? '')}</td><td class="est-label">주소</td><td colspan="3">${esc(inv.customer_address ?? '')}</td></tr>` +
    `<tr><td class="est-label">업태/종목</td><td colspan="3">${esc(formatBizInfo(supplier.bizType, supplier.bizItem))}</td><td class="est-label">업태/종목</td><td colspan="3">${esc(formatBizInfo(inv.customer_biz_type, inv.customer_biz_item))}</td></tr>` +
    '</tbody>' +
    '</table>' +
    '<table class="est-items-table">' +
    '<thead><tr><th style="width:6%">No</th><th style="width:34%">품명</th><th style="width:8%">단위</th><th style="width:8%">수량</th><th style="width:12%">단가</th><th style="width:12%">공급가액</th><th style="width:8%">세액</th><th style="width:12%">합계</th></tr></thead>' +
    `<tbody>${itemRowsHtml}</tbody>` +
    '</table>' +
    '<div class="est-footer">' +
    (opts.isLast
      ? '<div class="est-bottom">' +
        '<div class="est-note-block">' +
        '<div class="est-note-title">비고</div>' +
        `<div class="est-note-text">${esc(noteText)}</div>` +
        '</div>' +
        '<div class="est-summary-block">' +
        '<table class="est-summary-table">' +
        `<tr><th>공급가액</th><td>${(inv.supply_amount ?? 0).toLocaleString()}원</td></tr>` +
        `<tr><th>세액</th><td>${(inv.tax_amount ?? 0).toLocaleString()}원</td></tr>` +
        `<tr class="est-grand-row"><th>총 견적금액</th><td>${(inv.total_amount ?? 0).toLocaleString()}원</td></tr>` +
        '</table>' +
        (supplier.bankInfo ? `<div class="est-bank">입금계좌 ${esc(supplier.bankInfo)}</div>` : '') +
        '</div>' +
        '</div>' +
        '<div class="est-signature">' +
        `<div class="est-signature-text">${esc(document.signatureText(inv))}</div>` +
        '<div class="est-signature-right">' +
        '<span class="est-signature-label">대표자</span>' +
        `<span class="est-signature-name">${esc(supplier.ceo ?? '')}</span>` +
        `<span class="est-stamp-wrap">${supplier.stampHtml}</span>` +
        '</div>' +
        '</div>'
      : '<div class="est-continue">다음 페이지에 품목이 계속됩니다.</div>') +
    '</div>' +
    '</div>' +
    '</section>'
  )
}

function buildEstimateHtml(inv: PrintInvoice, items: PrintItem[], supplier?: EstimateSupplier): string {
  const pages = splitEstimateItemsToPages(items)
  const totalPages = pages.length

  return pages.map((pageItems, index) => {
    const opts: PageOptions = {
      pageNum: index + 1,
      totalPages,
      isFirst: index === 0,
      isLast: index === totalPages - 1,
    }
    const startIndex = pages.slice(0, index).reduce((sum, pageItems) => sum + pageItems.length, 0)
    return buildEstimatePageHtml(inv, pageItems, opts, startIndex, supplier)
  }).join('')
}

function formatLineTotal(item: PrintItem): number {
  return Math.max(0, (item.supply_amount ?? 0) + (item.tax_amount ?? 0))
}

function buildPackingHtml(inv: PrintInvoice, items: PrintItem[]): string {
  const invoiceDate = formatDisplayDate(inv.invoice_date)
  const totalAmt = inv.total_amount ?? 0
  const blankCount = Math.max(0, Math.min(8, 12 - items.length))
  const rowsHtml = items.map((item, index) => (
    '<tr>' +
    '<td class="pack-check">□</td>' +
    `<td class="pack-no">${index + 1}</td>` +
    `<td class="pack-name">${esc(item.product_name ?? '')}</td>` +
    `<td class="pack-unit">${esc(item.unit ?? '')}</td>` +
    `<td class="pack-qty">${(item.quantity ?? 0).toLocaleString()}</td>` +
    `<td class="pack-money">${(item.unit_price ?? 0).toLocaleString()}</td>` +
    `<td class="pack-money">${formatLineTotal(item).toLocaleString()}</td>` +
    '<td class="pack-note"></td>' +
    '</tr>'
  )).join('') + Array(blankCount).fill(
    '<tr class="pack-blank"><td>□</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>',
  ).join('')

  return (
    '<main class="pack-page">' +
    '<section class="pack-shell">' +
    '<div class="pack-top">' +
    '<div>' +
    '<div class="pack-kicker">내부 작업용</div>' +
    '<h1>포 장 지 시 서</h1>' +
    '</div>' +
    '<div class="pack-stamp-box">포장완료<br />확인</div>' +
    '</div>' +
    '<table class="pack-meta">' +
    '<tbody>' +
    `<tr><th>주문번호</th><td>${esc(inv.invoice_no ?? '')}</td><th>출고일</th><td>${esc(invoiceDate)}</td></tr>` +
    `<tr><th>거래처</th><td>${esc(inv.customer_name ?? '')}</td><th>연락처</th><td>${esc(formatPhoneNumber(inv.customer_phone))}</td></tr>` +
    `<tr><th>수령/배송지</th><td colspan="3">${esc(inv.customer_address ?? '')}</td></tr>` +
    '</tbody>' +
    '</table>' +
    (inv.memo ? `<div class="pack-request"><strong>요청사항</strong><span>${esc(inv.memo)}</span></div>` : '') +
    '<table class="pack-items">' +
    '<thead><tr><th>확인</th><th>No</th><th>품목명</th><th>단위</th><th>수량</th><th>단가</th><th>금액</th><th>포장 메모</th></tr></thead>' +
    `<tbody>${rowsHtml}</tbody>` +
    '</table>' +
    '<div class="pack-total-grid">' +
    `<div><span>공급가액</span><strong>${(inv.supply_amount ?? 0).toLocaleString()}원</strong></div>` +
    `<div><span>세액</span><strong>${(inv.tax_amount ?? 0).toLocaleString()}원</strong></div>` +
    `<div class="pack-grand"><span>총 금액</span><strong>${totalAmt.toLocaleString()}원</strong></div>` +
    '</div>' +
    '<div class="pack-check-grid">' +
    '<div><span>포장자</span></div>' +
    '<div><span>검수자</span></div>' +
    '<div><span>출고시간</span></div>' +
    '</div>' +
    '<div class="pack-help">품목명·수량·금액을 확인한 뒤 포장하고, 출고 후 CRM에서 포장·출고확정을 눌러주세요.</div>' +
    '</section>' +
    '</main>'
  )
}

function roundToHundred(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.ceil(value / 100) * 100
}

function buildPartnerItems(items: PrintItem[], markupRate: number): PrintItem[] {
  const ratio = 1 + Math.max(0, markupRate) / 100
  return items.map((item) => {
    const quantity = Math.max(0, item.quantity ?? 0)
    const unitPrice = roundToHundred((item.unit_price ?? 0) * ratio)
    const lineTotal = unitPrice * quantity
    const taxable = (item.tax_amount ?? 0) > 0
    const supplyAmount = taxable ? Math.floor(lineTotal / 1.1) : lineTotal
    const taxAmount = taxable ? lineTotal - supplyAmount : 0
    return {
      ...item,
      unit_price: unitPrice,
      supply_amount: supplyAmount,
      tax_amount: taxAmount,
    }
  })
}

function sumPrintItems(items: PrintItem[]): Pick<PrintInvoice, 'supply_amount' | 'tax_amount' | 'total_amount'> {
  const supplyAmount = items.reduce((sum, item) => sum + (item.supply_amount ?? 0), 0)
  const taxAmount = items.reduce((sum, item) => sum + (item.tax_amount ?? 0), 0)
  return {
    supply_amount: supplyAmount,
    tax_amount: taxAmount,
    total_amount: supplyAmount + taxAmount,
  }
}

function buildPartnerEstimateHtml(inv: PrintInvoice, items: PrintItem[]): string {
  const settings = loadComparisonQuoteSettings()
  const partnerItems = buildPartnerItems(items, settings.markupRate)
  const totals = sumPrintItems(partnerItems)
  const supplier: EstimateSupplier = {
    company: settings.partnerCompany,
    bizno: settings.partnerBizno,
    ceo: settings.partnerCeo,
    bizType: settings.partnerBizType,
    bizItem: settings.partnerBizItem,
    address: settings.partnerAddress,
    phone: settings.partnerPhone,
    logoHtml: `<div class="est-logo-text">${esc(settings.partnerCompany)}</div>`,
    stampHtml: '(인)',
    bankInfo: '',
    subtitle: '협력업체 비교견적',
    noteText: '동일 품목 기준 협력업체 비교견적입니다.',
  }
  return buildEstimateHtml(
    {
      ...inv,
      supply_amount: totals.supply_amount,
      tax_amount: totals.tax_amount,
      total_amount: totals.total_amount,
    },
    partnerItems,
    supplier,
  )
}

function buildComparisonQuoteHtml(inv: PrintInvoice, items: PrintItem[]): string {
  return buildPartnerEstimateHtml(inv, items)
}

function buildDuplexFitScript(): string {
  return [
    '(function() {',
    `  var TARGET = ${DUPLEX_HALF_TARGET_PX.toFixed(1)};`,
    '  function applyFit() {',
    "    var halves = document.querySelectorAll('.inv-half');",
    '    for (var i = 0; i < halves.length; i++) {',
    "      var wrap = halves[i].querySelector('.inv-scale-wrap');",
    '      if (!wrap) continue;',
    "      wrap.style.zoom = '';",
    '      var height = wrap.scrollHeight;',
    '      if (height <= TARGET) continue;',
    '      var zoom = TARGET / height;',
    "      wrap.style.zoom = Math.max(0.5, zoom).toFixed(4);",
    '    }',
    '  }',
    '  window.__fitDuplexPrint = applyFit;',
    "  window.addEventListener('load', function() { setTimeout(applyFit, 60); });",
    "  window.addEventListener('beforeprint', applyFit);",
    '  setTimeout(applyFit, 0);',
    '})();',
  ].join('\n')
}

/**
 * A4 이등분 인쇄 (iframe 기반, 멀티페이지)
 * - 첫 페이지 10개, 이후 페이지 10개 기준으로 자동 분할
 * - 품목 수가 기준을 넘으면 다음 페이지로 넘기고, zoom 축소는 예외적인 overflow에서만 사용
 * - A4 상하 절반 레이아웃 기준으로 각 복사본을 동일하게 배치
 */
// ─── 공통 CSS (미리보기 + 인쇄 공유) ────────────────────────────
// 통일 기준: 외곽선 1.5px #333 / 내부선 1px #bbb / 레이블 배경 #f4f4f4 / 본문 8.2pt
const DUPLEX_CSS = [
  '@page { size: A4 portrait; margin: 0; }',
  'html { margin:0; padding:0; width:210mm; }',
  "body { margin:0; padding:0; width:210mm; font-family:'Malgun Gothic','맑은 고딕',sans-serif; color:#000; font-size:8.2pt; }",
  '* { box-sizing:border-box; }',
  '.inv-tbl { width:100%; border-collapse:collapse; }',
  // ─── 헤더 ───
  '.inv-header { display:flex; align-items:center; justify-content:space-between; border:1.5px solid #333; padding:4px 7px; gap:7px; }',
  '.inv-logo { width:88px; }',
  '.inv-title-area { text-align:center; flex:1; }',
  '.inv-title { font-size:14pt; font-weight:900; letter-spacing:4px; }',
  '.inv-sub { font-size:7.2pt; color:#555; margin-top:1px; }',
  // ─── 메타 (발행번호/구분/거래일자) ───
  '.inv-meta-tbl { border:1.5px solid #333; border-top:none; }',
  '.inv-meta-tbl td { border:1px solid #bbb; padding:2.5px 4px; font-size:7.9pt; }',
  '.inv-ml { background:#f4f4f4; text-align:center; font-weight:700; white-space:nowrap; width:52px; }',
  // ─── 공급자/공급받는자 통합 테이블 (colgroup으로 38:60 비율, 행 정렬 보장) ───
  '.inv-party-tbl { border:1.5px solid #333; border-top:none; }',
  '.inv-party-title { background:#f4f4f4; text-align:center; font-weight:700; padding:2px 0; font-size:7.8pt; border:1px solid #bbb; }',
  '.inv-party-div { width:1px; background:#bbb; padding:0; border:none; }',
  '.inv-party-tbl td { border:1px solid #bbb; padding:2px 3px; font-size:7.7pt; white-space:nowrap; overflow:hidden; }',
  '.inv-pl { background:#f4f4f4; font-weight:700; white-space:nowrap; text-align:center; }',
  // ─── 품목 테이블 ───
  '.inv-items-table { border:1.5px solid #333; border-top:none; }',
  '.inv-items-table th { background:#f4f4f4; border:1px solid #bbb; padding:2px 2px; text-align:center; font-weight:700; font-size:7.7pt; }',
  '.inv-items-table td { border:1px solid #bbb; padding:2px 3px; font-size:8.05pt; line-height:1.2; }',
  '.inv-items-table td:nth-child(2) { font-size:8.45pt; font-weight:600; letter-spacing:0.05px; }',
  '.inv-blank td { height:13px; }',
  // ─── 합계 ───
  '.inv-total-tbl { border:1.5px solid #333; border-top:none; }',
  '.inv-total-tbl td { border:1px solid #bbb; padding:3px 5px; font-size:7.9pt; }',
  '.inv-tl { background:#f4f4f4; text-align:center; font-weight:700; white-space:nowrap; width:64px; }',
  '.inv-grand { background:#e8f0e8 !important; font-weight:800; font-size:8.7pt; }',
  // ─── 잔액 ───
  '.inv-balance-tbl { border:1.5px solid #333; border-top:none; }',
  '.inv-balance-tbl td { border:1px solid #bbb; padding:2.5px 4px; font-size:7.8pt; }',
  '.inv-bl { background:#f4f4f4; text-align:center; font-weight:700; white-space:nowrap; width:52px; }',
  '.inv-bv-warn { color:#dc2626; font-weight:700; background:#fef2f2 !important; }',
  // ─── 비고 ───
  '.inv-memo { border:1.5px solid #333; border-top:none; padding:3px 6px; font-size:7.9pt; }',
  '.inv-paynote { border:1.5px solid #333; border-top:none; padding:3px 6px; font-size:7.6pt; line-height:1.3; color:#222; }',
  // ─── 서명란 ───
  '.inv-sig { border:1.5px solid #333; border-top:none; padding:5px 7px 7px; display:flex; align-items:flex-end; justify-content:space-between; font-size:8pt; min-height:46px; }',
  '.inv-sig-text { align-self:center; }',
  '.inv-sig-right { display:flex; align-items:flex-end; gap:4px; }',
  '.inv-sig-label { font-weight:700; font-size:7.8pt; white-space:nowrap; padding-bottom:2px; }',
  '.inv-sig-name-wrap { position:relative; width:68px; height:32px; }',
  '.inv-ceo-name { position:absolute; bottom:4px; left:0; right:0; text-align:center; font-size:7.7pt; color:#333; }',
  '.inv-sig-underline { position:absolute; bottom:0; left:0; right:0; border-bottom:1px solid #555; }',
  // ─── 도장 (배경 투명 → 흰 박스 선 제거) ───
  '.inv-seal-area { position:relative; width:44px; height:44px; display:flex; align-items:center; justify-content:center; }',
  '.inv-seal-text { font-size:7.2pt; color:#999; position:relative; z-index:1; }',
  '.inv-stamp { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-8deg); width:46px; height:46px; z-index:2; }',
  '.inv-stamp-img { width:100%; height:100%; object-fit:contain; opacity:0.92; }',
  // ─── 유틸 ───
  '.t-right { text-align:right; }',
  '.t-center { text-align:center; }',
  // ─── 이등분 레이아웃 + 멀티페이지 ───
  `.inv-page-duplex { position:relative; display:block; width:210mm; height:${PRINT_PAGE_HEIGHT_MM.toFixed(1)}mm; background:#fff; overflow:hidden; break-inside:avoid-page; page-break-inside:avoid; }`,
  '.inv-half { position:absolute; width:210mm; box-sizing:border-box; padding:7mm 8mm 7mm; overflow:hidden; }',
  `.inv-half.top    { top:0; height:${PRINT_HALF_HEIGHT_MM.toFixed(1)}mm; }`,
  `.inv-half.bottom { top:${PRINT_HALF_HEIGHT_MM.toFixed(1)}mm; height:${PRINT_HALF_HEIGHT_MM.toFixed(1)}mm; }`,
  '.inv-scale-wrap { width:100%; }',
  // ─── 속지 헤더 (2페이지 이후) ───
  '.inv-cont-header { border:1.5px solid #333; padding:4px 7px; display:flex; align-items:center; justify-content:space-between; margin-bottom:0; }',
  '.inv-cont-title { font-size:10.5pt; font-weight:800; letter-spacing:2px; }',
  '.inv-cont-info { display:flex; gap:10px; font-size:7.5pt; color:#555; }',
  // ─── "다음 장 계속" 안내 ───
  '.inv-cont-note { text-align:center; font-size:7.2pt; color:#999; padding:4px 0; border:1.5px solid #333; border-top:none; }',
  '@media print { img { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }',
].join('\n')

const ESTIMATE_CSS = [
  '@page { size: A4 portrait; margin: 8mm; }',
  "body { margin:0; font-family:'Malgun Gothic','맑은 고딕',sans-serif; color:#111; background:#fff; }",
  '* { box-sizing:border-box; }',
  '.est-page { width:190mm; page-break-after:always; break-after:page; break-inside:avoid-page; page-break-inside:avoid; }',
  '.est-page:last-child { page-break-after:auto; }',
  '.est-shell { border:1px solid #9ca3af; padding:5.2mm 5.8mm 4.8mm; display:flex; flex-direction:column; break-inside:avoid-page; page-break-inside:avoid; overflow:hidden; }',
  '.est-top { display:grid; grid-template-columns: 112px 1fr 146px; align-items:center; gap:8px; margin-bottom:6px; }',
  '.est-logo { min-height:34px; display:flex; align-items:center; }',
  '.est-logo-img { max-height:34px; max-width:110px; object-fit:contain; }',
  '.est-logo-text { font-weight:700; color:#3d6b4a; }',
  '.est-title-wrap { text-align:center; }',
  '.est-title { font-size:17pt; font-weight:800; letter-spacing:7px; }',
  '.est-sub { margin-top:2px; font-size:8pt; color:#6b7280; }',
  '.est-meta { border:1px solid #9ca3af; font-size:8pt; }',
  '.est-meta div { display:flex; justify-content:space-between; padding:2.5px 5px; border-bottom:1px solid #d1d5db; }',
  '.est-meta div:last-child { border-bottom:none; }',
  '.est-meta span { color:#6b7280; }',
  '.est-party-table, .est-items-table, .est-summary-table { width:100%; border-collapse:collapse; }',
  '.est-party-table { margin-bottom:5px; break-inside:avoid-page; page-break-inside:avoid; }',
  '.est-party-table th, .est-party-table td, .est-summary-table th, .est-summary-table td { border:1px solid #9ca3af; padding:3px 4px; font-size:7.8pt; }',
  '.est-items-table th, .est-items-table td { border:1px solid #9ca3af; font-size:7.7pt; }',
  '.est-items-table th { padding:2px 4px; line-height:1.1; }',
  '.est-items-table td { padding:2px 3px; line-height:1.1; height:20px; }',
  '.est-party-table th, .est-items-table th, .est-summary-table th, .est-label { background:#f3f4f6; font-weight:700; }',
  '.est-items-table td:nth-child(2) { font-weight:600; font-size:7.9pt; }',
  '.est-items-table, .est-items-table thead, .est-items-table tbody, .est-items-table tr, .est-items-table th, .est-items-table td { break-inside:avoid; page-break-inside:avoid; }',
  '.est-footer { padding-top:5px; break-inside:avoid-page; page-break-inside:avoid; }',
  '.est-bottom { display:grid; grid-template-columns: 1fr 170px; gap:10px; }',
  '.est-bottom, .est-summary-block, .est-signature { break-inside:avoid-page; page-break-inside:avoid; }',
  '.est-note-block { border:1px solid #9ca3af; min-height:54px; }',
  '.est-note-title { background:#f3f4f6; border-bottom:1px solid #9ca3af; padding:3px 5px; font-size:7.8pt; font-weight:700; }',
  '.est-note-text { padding:5px; font-size:7.8pt; line-height:1.4; white-space:pre-wrap; }',
  '.est-summary-block { display:flex; flex-direction:column; gap:5px; }',
  '.est-summary-table th { width:70px; }',
  '.est-summary-table td { text-align:right; font-weight:700; }',
  '.est-grand-row th, .est-grand-row td { background:#edf6ea; font-size:9pt; }',
  '.est-bank { border:1px solid #9ca3af; padding:5px; font-size:7.6pt; line-height:1.35; }',
  '.est-signature { margin-top:5px; display:flex; justify-content:space-between; align-items:flex-end; font-size:8pt; }',
  '.est-signature-right { display:flex; align-items:flex-end; gap:6px; }',
  '.est-signature-label { font-weight:700; }',
  '.est-signature-name { min-width:56px; text-align:center; border-bottom:1px solid #6b7280; }',
  '.est-stamp-wrap { display:inline-flex; width:42px; height:42px; align-items:center; justify-content:center; }',
  '.est-stamp-img { max-width:42px; max-height:42px; object-fit:contain; opacity:0.92; }',
  '.est-continue { margin-top:8px; text-align:right; font-size:8pt; color:#6b7280; }',
  '.t-right { text-align:right; }',
  '.t-center { text-align:center; }',
  '@media print { .est-page, .est-shell { min-height:auto !important; height:auto !important; } }',
  '@media print { .est-top, .est-party-table, .est-items-table, .est-footer, .est-bottom, .est-note-block, .est-summary-block, .est-signature { break-inside:avoid-page; page-break-inside:avoid; } }',
  '@media print { img { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }',
].join('\n')

const PACKING_CSS = [
  '@page { size: A4 portrait; margin: 8mm; }',
  "body { margin:0; font-family:'Malgun Gothic','맑은 고딕',sans-serif; color:#000; background:#fff; }",
  '* { box-sizing:border-box; }',
  '.pack-page { width:194mm; min-height:281mm; page-break-after:always; }',
  '.pack-page:last-child { page-break-after:auto; }',
  '.pack-shell { border:2px solid #111; padding:7mm; min-height:281mm; }',
  '.pack-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; border-bottom:2px solid #111; padding-bottom:10px; }',
  '.pack-kicker { display:inline-block; border:1px solid #111; padding:3px 8px; font-size:11pt; font-weight:800; margin-bottom:8px; }',
  '.pack-top h1 { margin:0; font-size:25pt; letter-spacing:7px; font-weight:900; }',
  '.pack-stamp-box { width:34mm; height:22mm; border:2px solid #111; display:flex; align-items:center; justify-content:center; text-align:center; font-size:13pt; font-weight:900; line-height:1.35; }',
  '.pack-meta, .pack-items { width:100%; border-collapse:collapse; }',
  '.pack-meta { margin-top:8px; border:2px solid #111; }',
  '.pack-meta th, .pack-meta td { border:1.5px solid #111; padding:7px 8px; font-size:12.5pt; }',
  '.pack-meta th { width:24mm; background:#f1f5f9; text-align:center; font-weight:900; }',
  '.pack-request { margin-top:8px; border:2px solid #111; display:grid; grid-template-columns:28mm 1fr; min-height:18mm; }',
  '.pack-request strong { display:flex; align-items:center; justify-content:center; background:#fff7ed; border-right:1.5px solid #111; font-size:13pt; }',
  '.pack-request span { padding:9px; font-size:13pt; font-weight:700; white-space:pre-wrap; }',
  '.pack-items { margin-top:8px; border:2px solid #111; }',
  '.pack-items th { border:1.5px solid #111; background:#e5e7eb; padding:7px 4px; font-size:12pt; font-weight:900; text-align:center; }',
  '.pack-items td { border:1.5px solid #111; padding:8px 5px; font-size:12.5pt; min-height:13mm; }',
  '.pack-check { width:13mm; text-align:center; font-size:18pt !important; font-weight:900; }',
  '.pack-no { width:10mm; text-align:center; }',
  '.pack-name { font-size:14.2pt !important; font-weight:900; line-height:1.25; }',
  '.pack-unit { width:13mm; text-align:center; }',
  '.pack-qty { width:16mm; text-align:right; font-size:16pt !important; font-weight:900; }',
  '.pack-money { width:24mm; text-align:right; font-weight:800; }',
  '.pack-note { width:28mm; }',
  '.pack-blank td { height:13mm; }',
  '.pack-total-grid { margin-top:10px; display:grid; grid-template-columns:1fr 1fr 1.2fr; border:2px solid #111; }',
  '.pack-total-grid div { display:flex; align-items:center; justify-content:space-between; gap:8px; border-right:1.5px solid #111; padding:8px 10px; font-size:13pt; }',
  '.pack-total-grid div:last-child { border-right:none; }',
  '.pack-total-grid span { font-weight:900; }',
  '.pack-total-grid strong { font-size:14pt; }',
  '.pack-grand { background:#fef3c7; }',
  '.pack-check-grid { margin-top:10px; display:grid; grid-template-columns:1fr 1fr 1fr; border:2px solid #111; }',
  '.pack-check-grid div { height:20mm; border-right:1.5px solid #111; padding:7px; font-size:13pt; font-weight:900; }',
  '.pack-check-grid div:last-child { border-right:none; }',
  '.pack-help { margin-top:8px; border:1.5px solid #111; padding:7px; font-size:10.5pt; font-weight:700; background:#f8fafc; }',
].join('\n')

// 미리보기 + 인쇄 공통 Blob URL 생성 (호출자가 revokeObjectURL 책임)
export function buildDuplexBlobUrl(
  inv: PrintInvoice,
  items: PrintItem[],
  options: PrintDocumentOptions = {},
): string {
  const documentType = options.documentType ?? 'invoice'
  const isEstimateLike = documentType === 'estimate' || documentType === 'comparison'
  const isPacking = documentType === 'packing'
  const duplexHtml = documentType === 'estimate'
    ? buildEstimateHtml(inv, items)
    : documentType === 'comparison'
      ? buildComparisonQuoteHtml(inv, items)
      : documentType === 'packing'
        ? buildPackingHtml(inv, items)
        : buildDuplexInvoiceHtml(inv, items, documentType)
  const fitScript = isEstimateLike || isPacking ? '' : buildDuplexFitScript()
  const css = isPacking ? PACKING_CSS : isEstimateLike ? ESTIMATE_CSS : DUPLEX_CSS
  const fullHtml =
    '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<style>' + css + '</style>' +
    '</head><body>' +
    duplexHtml +
    (fitScript ? '<script>' + fitScript + '</script>' : '') +
    '</body></html>'
  return URL.createObjectURL(new Blob([fullHtml], { type: 'text/html;charset=utf-8' }))
}

export function printDuplexViaIframe(
  inv: PrintInvoice,
  items: PrintItem[],
  options: PrintDocumentOptions = {},
): void {
  const documentType = options.documentType ?? 'invoice'
  const blobUrl = buildDuplexBlobUrl(inv, items, options)
  const pages = getPreviewPageCount(items.length, documentType)

  const iframe = document.createElement('iframe')
  iframe.style.cssText =
    `position:fixed;top:-9999px;left:-9999px;width:210mm;height:${pages * 297}mm;border:none;visibility:hidden;`
  document.body.appendChild(iframe)
  iframe.src = blobUrl

  iframe.addEventListener('load', () => {
    setTimeout(() => {
      if (documentType !== 'estimate') {
        const fitFn = (iframe.contentWindow as (Window & { __fitDuplexPrint?: () => void }) | null)?.__fitDuplexPrint
        fitFn?.()
      }
      iframe.contentWindow?.print()
      URL.revokeObjectURL(blobUrl)
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe)
      }, 3000)
    }, 450)
  })
}

// ─────────────────────────────────────────────────────────────────
// 거래처별 기간 거래 내역서 PDF 출력
// ─────────────────────────────────────────────────────────────────
export interface PeriodReportInvoice {
  invoice_no?: string
  invoice_date?: string
  supply_amount?: number
  total_amount?: number
  paid_amount?: number
  status?: string
}

export interface PeriodReportTx {
  tx_date?: string
  tx_type?: string
  memo?: string
  slip_no?: string
  amount?: number
}

export interface PeriodReportStats {
  crmSales: number
  crmCount: number
  legacySales: number
  legacyCount: number
  totalSales: number
  outstanding: number
}

export interface CustomerTransactionStatementRow {
  date: string
  txType: string
  amount: number
  slipNo?: string
  memo?: string
  sourceLabel?: string
}

export function printPeriodReport(
  customerName: string,
  dateFrom: string,
  dateTo: string,
  crmInvoices: PeriodReportInvoice[],
  legacyTx: PeriodReportTx[],
  stats: PeriodReportStats,
): void {
  const c = loadCompanyInfo()
  const today = new Date().toLocaleDateString('ko-KR')
  const documentRef = buildPrintDocumentRef('PR')

  const safeLogo = sanitizePrintImageSrc(c.logo_url)
  const logoHtml = safeLogo
    ? `<img src="${escAttr(safeLogo)}" alt="로고" style="height:36px;object-fit:contain;" />`
    : `<span style="font-weight:700;font-size:10pt;color:#3d6b4a;">${esc(c.company ?? '')}</span>`

  const statusLabel = (s?: string) =>
    s === 'paid' ? '완납' : s === 'partial' ? '부분수금' : '미수금'
  const statusColor = (s?: string) =>
    s === 'paid' ? '#16a34a' : s === 'partial' ? '#d97706' : '#dc2626'

  const crmRows = crmInvoices
    .map(
      (inv) =>
        `<tr>` +
        `<td class="mono">${esc(inv.invoice_no ?? '-')}</td>` +
        `<td class="c">${esc((inv.invoice_date ?? '').slice(0, 10))}</td>` +
        `<td class="r">${(inv.supply_amount ?? 0).toLocaleString()}</td>` +
        `<td class="r b">${(inv.total_amount ?? 0).toLocaleString()}</td>` +
        `<td class="r">${(inv.paid_amount ?? 0) > 0 ? (inv.paid_amount ?? 0).toLocaleString() : '-'}</td>` +
        `<td class="c" style="color:${statusColor(inv.status)};font-weight:600;">${statusLabel(inv.status)}</td>` +
        `</tr>`,
    )
    .join('')

  const legacyRows = legacyTx
    .map(
      (tx) =>
        `<tr>` +
        `<td class="c">${esc((tx.tx_date ?? '').slice(0, 10))}</td>` +
        `<td class="c">${esc(tx.tx_type ?? '-')}</td>` +
        `<td class="mono">${esc(tx.memo || tx.slip_no || '-')}</td>` +
        `<td class="r b">${(tx.amount ?? 0).toLocaleString()}</td>` +
        `</tr>`,
    )
    .join('')

  const html =
    `<!DOCTYPE html><html><head><meta charset="UTF-8">` +
    `<style>` +
    `@page{size:A4 portrait;margin:12mm 14mm;}` +
    `html,body{margin:0;padding:0;font-family:'Malgun Gothic','맑은 고딕',sans-serif;font-size:7.5pt;color:#111827;}` +
    `*{box-sizing:border-box;}` +
    `.hdr{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:1.5px solid #d3ddd3;padding-bottom:8px;margin-bottom:12px;}` +
    `.hdr-l{display:flex;align-items:center;gap:10px;}` +
    `.ttl{font-size:14pt;font-weight:900;letter-spacing:.2px;color:#1a2e1f;margin-bottom:3px;}` +
    `.sub{font-size:7pt;color:#667085;line-height:1.6;}` +
    `.docbox{min-width:162px;border:1px solid #d8e1d8;border-radius:8px;background:#fafcfb;padding:10px 12px;}` +
    `.doc-label{font-size:6.3pt;color:#667085;margin-bottom:2px;}` +
    `.doc-value{font-size:7.7pt;font-weight:700;color:#1f2937;}` +
    `.kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px;}` +
    `.kc{background:#fff;border:1px solid #d9e2da;border-radius:8px;padding:8px 10px;}` +
    `.kl{font-size:6.2pt;color:#667085;margin-bottom:2px;text-transform:uppercase;letter-spacing:.04em;}` +
    `.kv{font-size:10pt;font-weight:800;color:#1a2e1f;}` +
    `.kc.warn .kv{color:#dc2626;}` +
    `.sec{font-size:8pt;font-weight:800;color:#334155;margin:12px 0 4px;}` +
    `.sec-sub{font-size:6.8pt;color:#667085;margin-bottom:7px;}` +
    `table{width:100%;border-collapse:collapse;}` +
    `thead{display:table-header-group;}` +
    `tr{page-break-inside:avoid;}` +
    `th{background:#f8faf8;border:1px solid #d9e2da;padding:4px 5px;font-size:6.4pt;font-weight:700;text-align:center;color:#475467;text-transform:uppercase;letter-spacing:.04em;}` +
    `td{border:1px solid #e3e9e3;padding:4px 5px;font-size:7pt;}` +
    `tbody tr:nth-child(even){background:#fcfdfc;}` +
    `.r{text-align:right;} .c{text-align:center;} .b{font-weight:700;}` +
    `.mono{font-family:monospace;font-size:6.5pt;color:#444;}` +
    `.note{margin-top:10px;padding:10px 12px;border:1px solid #e4e9e4;background:#fbfcfb;border-radius:8px;font-size:7pt;color:#58645c;line-height:1.7;}` +
    `.footer{margin-top:12px;text-align:right;font-size:6.5pt;color:#888;border-top:1px solid #ddd;padding-top:6px;}` +
    `.nodata{text-align:center;padding:8px;color:#999;font-size:7pt;}` +
    `</style></head><body>` +
    `<div class="hdr">` +
    `<div class="hdr-l">${logoHtml}` +
    `<div><div class="ttl">거래처별 기간 거래 내역서</div>` +
    `<div class="sub">거래처: <strong>${esc(customerName)}</strong> &nbsp;|&nbsp; 기간: ${esc(dateFrom)} ~ ${esc(dateTo)}</div>` +
    (c.company ? `<div class="sub">발행: ${esc(c.company)}</div>` : '') +
    `</div></div>` +
    `<div class="docbox">` +
    `<div class="doc-label">문서번호</div><div class="doc-value">${esc(documentRef)}</div>` +
    `<div class="doc-label" style="margin-top:8px;">출력일</div><div class="doc-value">${today}</div>` +
    `${c.company ? `<div class="doc-label" style="margin-top:8px;">발행기관</div><div class="doc-value">${esc(c.company)}</div>` : ''}` +
    `</div>` +
    `</div>` +
    `<div class="kpi">` +
    `<div class="kc"><div class="kl">기간 합계 매출</div><div class="kv">${stats.totalSales.toLocaleString()}원</div></div>` +
    `<div class="kc"><div class="kl">명세표 발행액</div><div class="kv">${stats.crmSales.toLocaleString()}원</div></div>` +
    `<div class="kc"><div class="kl">과거 거래액</div><div class="kv">${stats.legacySales.toLocaleString()}원</div></div>` +
    `<div class="kc${stats.outstanding > 0 ? ' warn' : ''}"><div class="kl">기간 미수금</div><div class="kv">${stats.outstanding.toLocaleString()}원</div></div>` +
    `</div>` +
    (crmInvoices.length > 0
      ? `<div class="sec">거래명세표 발행 내역</div>` +
        `<div class="sec-sub">${stats.crmCount}건 · ${stats.crmSales.toLocaleString()}원</div>` +
        `<table><thead><tr>` +
        `<th style="width:22%">발행번호</th><th style="width:12%">발행일</th>` +
        `<th style="width:14%">공급가액</th><th style="width:14%">합계금액</th>` +
        `<th style="width:14%">입금액</th><th style="width:10%">수금</th>` +
        `</tr></thead><tbody>${crmRows}</tbody></table>`
      : '') +
    (legacyTx.length > 0
      ? `<div class="sec">과거 거래 이력</div>` +
        `<div class="sec-sub">${stats.legacyCount}건 · ${stats.legacySales.toLocaleString()}원</div>` +
        `<table><thead><tr>` +
        `<th style="width:13%">거래일</th><th style="width:10%">유형</th>` +
        `<th style="width:51%">적요 / 전표번호</th><th style="width:16%">금액</th>` +
        `</tr></thead><tbody>${legacyRows}</tbody></table>`
      : '') +
    (crmInvoices.length === 0 && legacyTx.length === 0
      ? `<div class="nodata">해당 기간에 거래내역이 없습니다.</div>`
      : '') +
    `<div class="note">본 문서는 거래처별 기간 거래와 명세표 발행 내역을 함께 확인하기 위한 보고용 산출물입니다. 거래처 제출 또는 내부 회계 검토 시 기준 문서로 활용할 수 있습니다.</div>` +
    `<div class="footer">${esc(c.company ?? '')}${c.phone ? ` | 전화: ${esc(formatPhoneNumber(c.phone))}` : ''}${c.email ? ` | 이메일: ${esc(c.email)}` : ''}</div>` +
    `</body></html>`

  const iframe = document.createElement('iframe')
  iframe.style.cssText =
    'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;visibility:hidden;'
  document.body.appendChild(iframe)

  // Blob URL 방식: 로고 이미지가 iframeDoc.write()에서 누락되는 문제 방지
  const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
  iframe.src = blobUrl

  iframe.addEventListener('load', () => {
    setTimeout(() => {
      iframe.contentWindow?.print()
      URL.revokeObjectURL(blobUrl)
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe)
      }, 3000)
    }, 200)
  })
}

export function printCustomerTransactionStatement(
  customerName: string,
  dateFrom: string,
  dateTo: string,
  rows: CustomerTransactionStatementRow[],
): void {
  const c = loadCompanyInfo()
  const today = new Date().toLocaleDateString('ko-KR')
  const documentRef = buildPrintDocumentRef('TX')
  const salesAmount = rows
    .filter((row) => row.txType.includes('출고'))
    .reduce((sum, row) => sum + row.amount, 0)
  const inflowAmount = rows
    .filter((row) => ['입금', '예치금 적립', '환불대기'].includes(row.txType))
    .reduce((sum, row) => sum + row.amount, 0)
  const adjustmentAmount = rows
    .filter((row) => ['반입', '예치금 사용', '환불', '환불대기 해제'].includes(row.txType))
    .reduce((sum, row) => sum + row.amount, 0)
  const byType = {
    shipment: rows.filter((row) => row.txType.includes('출고')).length,
    payment: rows.filter((row) => row.txType === '입금').length,
    memo: rows.filter((row) => row.txType === '메모').length,
    returnTx: rows.filter((row) => row.txType === '반입').length,
  }
  const statementRows = rows
    .map((row) =>
      `<tr>` +
      `<td class="c">${esc(row.date)}</td>` +
      `<td class="c">${esc(row.txType)}</td>` +
      `<td>${esc(row.memo || '-')}</td>` +
      `<td class="mono">${esc(row.slipNo || '-')}</td>` +
      `<td class="r b">${row.amount.toLocaleString()}원</td>` +
      `</tr>`,
    )
    .join('')

  const safeLogo = sanitizePrintImageSrc(c.logo_url)
  const logoHtml = safeLogo
    ? `<img src="${escAttr(safeLogo)}" alt="로고" style="height:34px;object-fit:contain;" />`
    : `<span style="font-weight:800;font-size:11pt;color:#2f4f38;">${esc(c.company ?? '')}</span>`

  const html =
    `<!DOCTYPE html><html><head><meta charset="UTF-8">` +
    `<style>` +
    `@page{size:A4 portrait;margin:13mm 14mm;}` +
    `html,body{margin:0;padding:0;font-family:'Malgun Gothic','맑은 고딕',sans-serif;color:#111827;font-size:8pt;}` +
    `*{box-sizing:border-box;}` +
    `.page{width:100%;}` +
    `.topbar{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:14px;padding-bottom:10px;border-bottom:1.5px solid #d3ddd3;}` +
    `.brand{display:flex;gap:12px;align-items:flex-start;}` +
    `.title{font-size:16pt;font-weight:900;letter-spacing:-0.3px;color:#22362a;}` +
    `.sub{margin-top:4px;font-size:7.4pt;color:#667085;line-height:1.65;}` +
    `.docbox{min-width:168px;border:1px solid #d8e1d8;border-radius:8px;background:#fafcfb;padding:10px 12px;}` +
    `.doc-label{font-size:6.6pt;color:#667085;margin-bottom:2px;}` +
    `.doc-value{font-size:8pt;font-weight:700;color:#1f2937;}` +
    `.meta-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;}` +
    `.meta-card{border:1px solid #d9e2da;border-radius:8px;background:#fff;padding:9px 10px;}` +
    `.label{font-size:6.5pt;color:#667085;margin-bottom:3px;text-transform:uppercase;letter-spacing:.04em;}` +
    `.value{font-size:11pt;font-weight:800;color:#17212b;}` +
    `.value.emph{color:#c62828;}` +
    `.section{margin-bottom:12px;}` +
    `.section-title{font-size:8.3pt;font-weight:800;color:#334155;margin-bottom:6px;}` +
    `.section-desc{font-size:6.8pt;color:#667085;margin-bottom:8px;}` +
    `table{width:100%;border-collapse:collapse;}` +
    `thead{display:table-header-group;}` +
    `tr{page-break-inside:avoid;}` +
    `th{background:#f8faf8;border:1px solid #d9e2da;padding:6px 5px;font-size:6.6pt;font-weight:700;color:#475467;text-align:center;text-transform:uppercase;letter-spacing:.04em;}` +
    `td{border:1px solid #e3e9e3;padding:6px 6px;font-size:7.1pt;vertical-align:top;}` +
    `tbody tr:nth-child(even){background:#fcfdfc;}` +
    `.r{text-align:right;}` +
    `.c{text-align:center;}` +
    `.b{font-weight:700;}` +
    `.mono{font-family:monospace;font-size:6.6pt;color:#475467;}` +
    `.note{margin-top:10px;padding:10px 12px;border:1px solid #e4e9e4;background:#fbfcfb;border-radius:8px;font-size:7pt;color:#58645c;line-height:1.7;}` +
    `.signoff{margin-top:12px;display:flex;justify-content:flex-end;}` +
    `.signbox{width:210px;border-top:1px solid #cad5ca;padding-top:8px;text-align:center;font-size:7pt;color:#475467;}` +
    `.footer{margin-top:14px;border-top:1px solid #d9dfda;padding-top:7px;text-align:right;font-size:6.5pt;color:#8a8f8a;}` +
    `.empty{padding:22px 0;text-align:center;color:#8a8a8a;font-size:7.5pt;}` +
    `</style></head><body><div class="page">` +
    `<div class="topbar">` +
    `<div class="brand">${logoHtml}<div><div class="title">거래내역 확인서</div>` +
    `<div class="sub">거래처 <strong>${esc(customerName)}</strong><br/>조회 기간 ${esc(dateFrom)} ~ ${esc(dateTo)}</div></div></div>` +
    `<div class="docbox">` +
    `<div class="doc-label">문서번호</div><div class="doc-value">${esc(documentRef)}</div>` +
    `<div class="doc-label" style="margin-top:8px;">출력일</div><div class="doc-value">${today}</div>` +
    `${c.company ? `<div class="doc-label" style="margin-top:8px;">발행기관</div><div class="doc-value">${esc(c.company)}</div>` : ''}` +
    `</div>` +
    `</div>` +
    `<div class="meta-grid">` +
    `<div class="meta-card"><div class="label">조회 건수</div><div class="value">${rows.length.toLocaleString()}건</div></div>` +
    `<div class="meta-card"><div class="label">기간 총매출</div><div class="value">${salesAmount.toLocaleString()}원</div></div>` +
    `<div class="meta-card"><div class="label">입금 / 유입</div><div class="value">${inflowAmount.toLocaleString()}원</div></div>` +
    `<div class="meta-card"><div class="label">조정 / 환불</div><div class="value ${adjustmentAmount > 0 ? 'emph' : ''}">${adjustmentAmount.toLocaleString()}원</div></div>` +
    `</div>` +
    `<div class="section"><div class="section-title">거래내역 목록</div>` +
    `<div class="section-desc">출고 ${byType.shipment}건 · 입금 ${byType.payment}건 · 반입 ${byType.returnTx}건 · 메모 ${byType.memo}건</div>` +
    (rows.length > 0
      ? `<table><thead><tr><th style="width:13%;">날짜</th><th style="width:11%;">유형</th><th>적요</th><th style="width:20%;">전표번호</th><th style="width:16%;">금액</th></tr></thead><tbody>${statementRows}</tbody></table>`
      : `<div class="empty">선택한 조건에 해당하는 거래내역이 없습니다.</div>`) +
    `</div>` +
    `<div class="note">본 문서는 PRESSCO21 CRM에 기록된 거래 데이터를 기준으로 생성한 확인용 문서입니다. 세부 품목 또는 수금 상태 확인이 필요한 경우 발행번호/거래일자를 기준으로 원본 명세표를 함께 검토해 주세요.</div>` +
    `<div class="signoff"><div class="signbox">담당 확인<br/><strong>${esc(c.company ?? 'PRESSCO21 CRM')}</strong></div></div>` +
    `<div class="footer">${esc(c.company ?? '')}${c.phone ? ` | 전화 ${esc(formatPhoneNumber(c.phone))}` : ''}${c.email ? ` | 이메일 ${esc(c.email)}` : ''}</div>` +
    `</div></body></html>`

  const iframe = document.createElement('iframe')
  iframe.style.cssText =
    'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;visibility:hidden;'
  document.body.appendChild(iframe)

  const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
  iframe.src = blobUrl

  iframe.addEventListener('load', () => {
    setTimeout(() => {
      iframe.contentWindow?.print()
      URL.revokeObjectURL(blobUrl)
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe)
      }, 3000)
    }, 200)
  })
}
