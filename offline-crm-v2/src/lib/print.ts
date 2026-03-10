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
  previous_balance?: number
  paid_amount?: number
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

const COMPANY_INFO_KEY = 'pressco21-crm-v2'
// Settings.tsx가 저장하는 키 (우선 참조)
const SETTINGS_MERGED_KEY = 'pressco21-crm-settings'

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
  } catch {}
  try {
    const s = localStorage.getItem(SETTINGS_MERGED_KEY)
    if (s) fromSettings = JSON.parse(s) as CompanyInfo
  } catch {}
  return {
    ...fromLegacy,
    ...fromSettings,
    // 어느 쪽에든 있으면 반영 (설정 저장 타이밍 무관)
    logo_url: fromSettings.logo_url || fromLegacy.logo_url,
    stamp_url: fromSettings.stamp_url || fromLegacy.stamp_url,
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

// ── 멀티페이지 상수 ──
// 샘플 거래명세표(20행)는 한 장 안에 우선 맞추고,
// 그 이상부터는 자동 분할 + zoom 축소를 함께 사용한다.
const ITEMS_FIRST_PAGE = 20
const ITEMS_CONT_PAGE = 20
const DUPLEX_HALF_TARGET_MM = 132
const DUPLEX_HALF_TARGET_PX = DUPLEX_HALF_TARGET_MM * (96 / 25.4)
// Chrome/Edge PDF 저장에서 A4 정확히 297mm를 꽉 채우면 마지막 빈 페이지가 붙는 경우가 있어
// 컨테이너 높이를 아주 미세하게 줄여 반올림 오차를 흡수한다.
const PRINT_PAGE_HEIGHT_MM = 296.8
const PRINT_HALF_HEIGHT_MM = PRINT_PAGE_HEIGHT_MM / 2

function formatBizInfo(bizType?: string, bizItem?: string): string {
  return [bizType, bizItem].filter(Boolean).join(' / ')
}

function formatBankInfo(company: CompanyInfo): string {
  const bank = [company.bank_name, company.bank_account].filter(Boolean).join(' ')
  const holder = company.bank_holder ? `예금주 ${company.bank_holder}` : ''
  return [bank, holder].filter(Boolean).join(' / ')
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
): string {
  const c = loadCompanyInfo()
  const capacity = opts.isFirst ? ITEMS_FIRST_PAGE : ITEMS_CONT_PAGE
  const blankCount = opts.isLast ? Math.max(0, Math.min(8, capacity) - pageItems.length) : 0

  const prevBal = inv.previous_balance ?? 0
  const paidAmt = inv.paid_amount ?? 0
  const totalAmt = inv.total_amount ?? 0
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

  const effectiveLogo = c.logo_url || _logoFallback
  const effectiveStamp = c.stamp_url || _stampFallback
  const logoHtml = effectiveLogo
    ? `<img src="${effectiveLogo}" alt="로고" style="height:40px;object-fit:contain;" />`
    : ''
  const stampHtml = effectiveStamp
    ? `<img src="${effectiveStamp}" alt="도장" class="inv-stamp-img" />`
    : ''

  let html = ''
  const pageLabel = opts.totalPages > 1 ? ` [${opts.pageNum}/${opts.totalPages}]` : ''

  if (opts.isFirst) {
    // ── 첫 페이지: 전체 헤더 (공급자/공급받는자 정보 포함) ──
    html +=
      '<div class="inv-header">' +
      `<div class="inv-logo">${logoHtml}</div>` +
      `<div class="inv-title-area"><div class="inv-title">거 래 명 세 표</div><div class="inv-sub">(${esc(copyType)})${pageLabel}</div></div>` +
      '<div></div>' +
      '</div>' +
      '<table class="inv-tbl inv-meta-tbl"><tr>' +
      `<td class="inv-ml">발행번호</td><td class="inv-mv">${esc(inv.invoice_no ?? '')}</td>` +
      `<td class="inv-ml">구분</td><td class="inv-mv t-center">${esc(inv.receipt_type ?? '영수')}</td>` +
      `<td class="inv-ml">거래일자</td><td class="inv-mv">${esc(inv.invoice_date ?? '')}</td>` +
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
      `<tr><td class="inv-pl">사업자번호</td><td colspan="3">${esc(c.bizno ?? '')}</td>` +
      `<td class="inv-party-div"></td>` +
      `<td class="inv-pl">사업자번호</td><td colspan="3">${esc(inv.customer_bizno ?? '')}</td></tr>` +
      `<tr><td class="inv-pl">주소</td><td colspan="3">${esc(c.address ?? '')}</td>` +
      `<td class="inv-party-div"></td>` +
      `<td class="inv-pl">주소</td><td colspan="3">${esc(inv.customer_address ?? '')}</td></tr>` +
      `<tr><td class="inv-pl">업태/종목</td><td colspan="3">${esc(c.bizType ?? '')}&nbsp;/&nbsp;${esc(c.bizItem ?? '')}</td>` +
      `<td class="inv-party-div"></td>` +
      `<td class="inv-pl">업태/종목</td><td colspan="3">${esc(formatBizInfo(inv.customer_biz_type, inv.customer_biz_item))}</td></tr>` +
      `<tr><td class="inv-pl">전화</td><td colspan="3">${esc(c.phone ?? '')}</td>` +
      `<td class="inv-party-div"></td>` +
      `<td class="inv-pl">전화</td><td colspan="3">${esc(inv.customer_phone ?? '')}</td></tr>` +
      '</tbody></table>'
  } else {
    // ── 속지 페이지: 간략 헤더 ──
    html +=
      '<div class="inv-cont-header">' +
      '<div class="inv-cont-title">거 래 명 세 표</div>' +
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
      `<td class="inv-tl inv-grand">합&nbsp;계&nbsp;금&nbsp;액</td><td class="inv-tv inv-grand t-right">${(inv.total_amount ?? 0).toLocaleString()}</td>` +
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
      `<span class="inv-sig-text">위 금액을 정히 ${esc(inv.receipt_type ?? '영수')}합니다.</span>` +
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
export function getPreviewPageCount(itemCount: number): number {
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

function buildDuplexInvoiceHtml(inv: PrintInvoice, items: PrintItem[]): string {
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
    const supplier = buildInvoicePageHtml(inv, pageItems, '공급자 보관용', opts, startIndex)
    const recipient = buildInvoicePageHtml(inv, pageItems, '공급받는자 보관용', opts, startIndex)
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
 * - 첫 페이지 20개, 이후 페이지 20개 기준으로 자동 분할
 * - 기본 폰트는 가독성을 유지하되, overflow 시 half 영역 높이에 맞춰 zoom 축소
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

// 미리보기 + 인쇄 공통 Blob URL 생성 (호출자가 revokeObjectURL 책임)
export function buildDuplexBlobUrl(inv: PrintInvoice, items: PrintItem[]): string {
  const duplexHtml = buildDuplexInvoiceHtml(inv, items)
  const fitScript = buildDuplexFitScript()
  const fullHtml =
    '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<style>' + DUPLEX_CSS + '</style>' +
    '</head><body>' +
    duplexHtml +
    '<script>' + fitScript + '<\/script>' +
    '</body></html>'
  return URL.createObjectURL(new Blob([fullHtml], { type: 'text/html;charset=utf-8' }))
}

export function printDuplexViaIframe(inv: PrintInvoice, items: PrintItem[]): void {
  const blobUrl = buildDuplexBlobUrl(inv, items)
  const pages = getPreviewPageCount(items.length)

  const iframe = document.createElement('iframe')
  iframe.style.cssText =
    `position:fixed;top:-9999px;left:-9999px;width:210mm;height:${pages * 297}mm;border:none;visibility:hidden;`
  document.body.appendChild(iframe)
  iframe.src = blobUrl

  iframe.addEventListener('load', () => {
    setTimeout(() => {
      const fitFn = (iframe.contentWindow as (Window & { __fitDuplexPrint?: () => void }) | null)?.__fitDuplexPrint
      fitFn?.()
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

  const logoHtml = c.logo_url
    ? `<img src="${c.logo_url}" alt="로고" style="height:36px;object-fit:contain;" />`
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
    `html,body{margin:0;padding:0;font-family:'Malgun Gothic','맑은 고딕',sans-serif;font-size:7.5pt;color:#111;}` +
    `*{box-sizing:border-box;}` +
    `.hdr{display:flex;align-items:flex-start;justify-content:space-between;border-bottom:2px solid #3d6b4a;padding-bottom:6px;margin-bottom:10px;}` +
    `.hdr-l{display:flex;align-items:center;gap:10px;}` +
    `.ttl{font-size:13pt;font-weight:900;letter-spacing:2px;color:#1a2e1f;margin-bottom:3px;}` +
    `.sub{font-size:7pt;color:#555;line-height:1.6;}` +
    `.kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px;}` +
    `.kc{background:#f5f8f5;border:1px solid #c8d8c5;border-radius:4px;padding:5px 7px;text-align:center;}` +
    `.kl{font-size:6pt;color:#666;margin-bottom:2px;}` +
    `.kv{font-size:9pt;font-weight:700;color:#1a2e1f;}` +
    `.kc.warn .kv{color:#dc2626;}` +
    `.sec{font-size:8pt;font-weight:700;color:#3d6b4a;border-left:3px solid #7d9675;padding-left:6px;margin:10px 0 4px;}` +
    `table{width:100%;border-collapse:collapse;}` +
    `th{background:#f0f5f0;border:1px solid #c8d8c5;padding:3px 5px;font-size:6.5pt;font-weight:700;text-align:center;color:#333;}` +
    `td{border:1px solid #dde8dd;padding:2.5px 5px;font-size:7pt;}` +
    `.r{text-align:right;} .c{text-align:center;} .b{font-weight:700;}` +
    `.mono{font-family:monospace;font-size:6.5pt;color:#444;}` +
    `.footer{margin-top:12px;text-align:right;font-size:6.5pt;color:#888;border-top:1px solid #ddd;padding-top:6px;}` +
    `.nodata{text-align:center;padding:8px;color:#999;font-size:7pt;}` +
    `</style></head><body>` +
    `<div class="hdr">` +
    `<div class="hdr-l">${logoHtml}` +
    `<div><div class="ttl">거래처별 기간 거래 내역서</div>` +
    `<div class="sub">거래처: <strong>${esc(customerName)}</strong> &nbsp;|&nbsp; 기간: ${esc(dateFrom)} ~ ${esc(dateTo)}</div>` +
    (c.company ? `<div class="sub">발행: ${esc(c.company)}</div>` : '') +
    `</div></div>` +
    `<div class="sub" style="white-space:nowrap;">출력일: ${today}</div>` +
    `</div>` +
    `<div class="kpi">` +
    `<div class="kc"><div class="kl">기간 합계 매출</div><div class="kv">${stats.totalSales.toLocaleString()}원</div></div>` +
    `<div class="kc"><div class="kl">명세표 발행액</div><div class="kv">${stats.crmSales.toLocaleString()}원</div></div>` +
    `<div class="kc"><div class="kl">과거 거래액</div><div class="kv">${stats.legacySales.toLocaleString()}원</div></div>` +
    `<div class="kc${stats.outstanding > 0 ? ' warn' : ''}"><div class="kl">기간 미수금</div><div class="kv">${stats.outstanding.toLocaleString()}원</div></div>` +
    `</div>` +
    (crmInvoices.length > 0
      ? `<div class="sec">거래명세표 발행 내역 (${stats.crmCount}건 / ${stats.crmSales.toLocaleString()}원)</div>` +
        `<table><thead><tr>` +
        `<th style="width:22%">발행번호</th><th style="width:12%">발행일</th>` +
        `<th style="width:14%">공급가액</th><th style="width:14%">합계금액</th>` +
        `<th style="width:14%">입금액</th><th style="width:10%">수금</th>` +
        `</tr></thead><tbody>${crmRows}</tbody></table>`
      : '') +
    (legacyTx.length > 0
      ? `<div class="sec">과거 거래 이력 (${stats.legacyCount}건 / ${stats.legacySales.toLocaleString()}원)</div>` +
        `<table><thead><tr>` +
        `<th style="width:13%">거래일</th><th style="width:10%">유형</th>` +
        `<th style="width:51%">적요 / 전표번호</th><th style="width:16%">금액</th>` +
        `</tr></thead><tbody>${legacyRows}</tbody></table>`
      : '') +
    (crmInvoices.length === 0 && legacyTx.length === 0
      ? `<div class="nodata">해당 기간에 거래내역이 없습니다.</div>`
      : '') +
    `<div class="footer">${esc(c.company ?? '')}${c.phone ? ` | 전화: ${esc(c.phone)}` : ''}</div>` +
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
  const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0)
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
      `<td class="c">${esc(row.sourceLabel || '-')}</td>` +
      `<td class="r b">${row.amount.toLocaleString()}원</td>` +
      `</tr>`,
    )
    .join('')

  const logoHtml = c.logo_url
    ? `<img src="${c.logo_url}" alt="로고" style="height:34px;object-fit:contain;" />`
    : `<span style="font-weight:800;font-size:11pt;color:#2f4f38;">${esc(c.company ?? '')}</span>`

  const html =
    `<!DOCTYPE html><html><head><meta charset="UTF-8">` +
    `<style>` +
    `@page{size:A4 portrait;margin:14mm 15mm;}` +
    `html,body{margin:0;padding:0;font-family:'Malgun Gothic','맑은 고딕',sans-serif;color:#1a1a1a;font-size:8pt;}` +
    `*{box-sizing:border-box;}` +
    `.page{width:100%;}` +
    `.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #54745d;padding-bottom:8px;margin-bottom:14px;}` +
    `.brand{display:flex;gap:10px;align-items:center;}` +
    `.title{font-size:15pt;font-weight:900;letter-spacing:1px;color:#22362a;}` +
    `.sub{margin-top:4px;font-size:7.5pt;color:#5a5a5a;line-height:1.7;}` +
    `.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;}` +
    `.card{border:1px solid #d7e2d9;border-radius:6px;background:#f8fbf8;padding:8px 10px;}` +
    `.label{font-size:6.5pt;color:#68756b;margin-bottom:3px;}` +
    `.value{font-size:10pt;font-weight:800;color:#21352a;}` +
    `.section{margin-bottom:12px;}` +
    `.section-title{font-size:8.5pt;font-weight:800;color:#3d5c46;margin-bottom:6px;display:flex;align-items:center;gap:6px;}` +
    `.section-title:before{content:'';display:inline-block;width:4px;height:14px;background:#7d9675;border-radius:2px;}` +
    `table{width:100%;border-collapse:collapse;}` +
    `th{background:#f2f6f3;border:1px solid #cfdacf;padding:6px 5px;font-size:6.7pt;font-weight:700;color:#445348;text-align:center;}` +
    `td{border:1px solid #dde6de;padding:5px 6px;font-size:7.2pt;vertical-align:top;}` +
    `.r{text-align:right;}` +
    `.c{text-align:center;}` +
    `.b{font-weight:700;}` +
    `.mono{font-family:monospace;font-size:6.6pt;color:#555;}` +
    `.note{margin-top:10px;padding:8px 10px;border:1px solid #e3e8e3;background:#fafcfb;border-radius:6px;font-size:7pt;color:#58645c;line-height:1.6;}` +
    `.footer{margin-top:14px;border-top:1px solid #d9dfda;padding-top:7px;text-align:right;font-size:6.6pt;color:#7a7a7a;}` +
    `.empty{padding:22px 0;text-align:center;color:#8a8a8a;font-size:7.5pt;}` +
    `</style></head><body><div class="page">` +
    `<div class="header">` +
    `<div class="brand">${logoHtml}<div><div class="title">거래내역 확인서</div>` +
    `<div class="sub">거래처: <strong>${esc(customerName)}</strong><br/>조회 기간: ${esc(dateFrom)} ~ ${esc(dateTo)}</div></div></div>` +
    `<div class="sub" style="text-align:right;">출력일: ${today}${c.company ? `<br/>발행: ${esc(c.company)}` : ''}</div>` +
    `</div>` +
    `<div class="summary">` +
    `<div class="card"><div class="label">조회 건수</div><div class="value">${rows.length.toLocaleString()}건</div></div>` +
    `<div class="card"><div class="label">거래 금액 합계</div><div class="value">${totalAmount.toLocaleString()}원</div></div>` +
    `<div class="card"><div class="label">출고 / 입금</div><div class="value">${byType.shipment} / ${byType.payment}</div></div>` +
    `<div class="card"><div class="label">반입 / 메모</div><div class="value">${byType.returnTx} / ${byType.memo}</div></div>` +
    `</div>` +
    `<div class="section"><div class="section-title">거래내역 목록</div>` +
    (rows.length > 0
      ? `<table><thead><tr><th style="width:12%;">날짜</th><th style="width:10%;">유형</th><th>적요</th><th style="width:18%;">전표번호</th><th style="width:10%;">구분</th><th style="width:14%;">금액</th></tr></thead><tbody>${statementRows}</tbody></table>`
      : `<div class="empty">선택한 조건에 해당하는 거래내역이 없습니다.</div>`) +
    `</div>` +
    `<div class="note">본 문서는 CRM에 기록된 거래내역을 기준으로 생성된 확인용 출력물입니다. 필요 시 발행번호 또는 날짜를 기준으로 추가 확인할 수 있습니다.</div>` +
    `<div class="footer">${esc(c.company ?? '')}${c.phone ? ` | 전화 ${esc(c.phone)}` : ''}</div>` +
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
