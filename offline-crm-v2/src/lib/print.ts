/**
 * 거래명세표 인쇄 유틸리티
 * 기존 offline-crm/app.js의 인쇄 로직을 TypeScript로 이식
 * 이등분(A4 절취선) + iframe 기반 zoom 축소 방식
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
  customer_bizno?: string
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

export function loadCompanyInfo(): CompanyInfo {
  // Settings 페이지는 pressco21-crm-settings에 저장 → 우선 참조
  for (const key of [SETTINGS_MERGED_KEY, COMPANY_INFO_KEY]) {
    try {
      const saved = localStorage.getItem(key)
      if (saved) return JSON.parse(saved) as CompanyInfo
    } catch {}
  }
  return {}
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

function buildInvoiceHtml(inv: PrintInvoice, items: PrintItem[], copyType: string): string {
  const c = loadCompanyInfo()
  const blankCount = Math.max(0, 8 - items.length)

  const prevBal = inv.previous_balance ?? 0
  const paidAmt = inv.paid_amount ?? 0
  const totalAmt = inv.total_amount ?? 0
  const curBal = prevBal + totalAmt - paidAmt

  const itemRowsHtml =
    items
      .map(
        (item, i) =>
          '<tr>' +
          `<td class="t-center">${i + 1}</td>` +
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

  const logoHtml = c.logo_url
    ? `<img src="${c.logo_url}" alt="로고" style="height:40px;object-fit:contain;" />`
    : ''
  const stampHtml = c.stamp_url
    ? `<img src="${c.stamp_url}" alt="도장" style="width:36px;height:36px;object-fit:cover;border-radius:50%;transform:rotate(-15deg);mix-blend-mode:multiply;clip-path:circle(40% at 50% 46%);" />`
    : ''

  return (
    '<div class="inv-header">' +
    `<div class="inv-logo">${logoHtml}</div>` +
    `<div class="inv-title-area"><div class="inv-title">거 래 명 세 표</div><div class="inv-sub">(${esc(copyType)})</div></div>` +
    '<div></div>' +
    '</div>' +
    '<table class="inv-tbl inv-meta-tbl"><tr>' +
    `<td class="inv-ml">발행번호</td><td class="inv-mv">${esc(inv.invoice_no ?? '')}</td>` +
    `<td class="inv-ml">구분</td><td class="inv-mv t-center">${esc(inv.receipt_type ?? '영수')}</td>` +
    `<td class="inv-ml">거래일자</td><td class="inv-mv">${esc(inv.invoice_date ?? '')}</td>` +
    '</tr></table>' +
    '<div class="inv-parties">' +
    '<div class="inv-party">' +
    '<div class="inv-party-title">공&nbsp;&nbsp;급&nbsp;&nbsp;자</div>' +
    '<table class="inv-tbl inv-party-tbl">' +
    `<tr><td class="inv-pl">상호</td><td>${esc(c.company ?? '')}</td><td class="inv-pl">대표자</td><td>${esc(c.ceo ?? '')}</td></tr>` +
    `<tr><td class="inv-pl">사업자번호</td><td colspan="3">${esc(c.bizno ?? '')}</td></tr>` +
    `<tr><td class="inv-pl">주소</td><td colspan="3">${esc(c.address ?? '')}</td></tr>` +
    `<tr><td class="inv-pl">업태/종목</td><td colspan="3">${esc(c.bizType ?? '')}&nbsp;/&nbsp;${esc(c.bizItem ?? '')}</td></tr>` +
    `<tr><td class="inv-pl">전화</td><td colspan="3">${esc(c.phone ?? '')}</td></tr>` +
    '</table>' +
    '</div>' +
    '<div class="inv-party">' +
    '<div class="inv-party-title">공&nbsp;급&nbsp;받&nbsp;는&nbsp;자</div>' +
    '<table class="inv-tbl inv-party-tbl">' +
    `<tr><td class="inv-pl">상호</td><td>${esc(inv.customer_name ?? '')}</td><td class="inv-pl">담당자</td><td>${esc(inv.manager ?? '')}</td></tr>` +
    `<tr><td class="inv-pl">사업자번호</td><td colspan="3">${esc(inv.customer_bizno ?? '')}</td></tr>` +
    `<tr><td class="inv-pl">주소</td><td colspan="3">${esc(inv.customer_address ?? '')}</td></tr>` +
    '<tr><td class="inv-pl">업태/종목</td><td colspan="3"></td></tr>' +
    `<tr><td class="inv-pl">전화</td><td colspan="3">${esc(inv.customer_phone ?? '')}</td></tr>` +
    '</table>' +
    '</div>' +
    '</div>' +
    '<table class="inv-tbl inv-items-table">' +
    '<thead><tr>' +
    '<th style="width:5%">No</th>' +
    '<th style="width:29%">품&nbsp;&nbsp;&nbsp;목&nbsp;&nbsp;&nbsp;명</th>' +
    '<th style="width:7%">단위</th>' +
    '<th style="width:8%">수량</th>' +
    '<th style="width:13%">단가</th>' +
    '<th style="width:13%">공급가액</th>' +
    '<th style="width:11%">세액</th>' +
    '<th style="width:14%">합계금액</th>' +
    '</tr></thead>' +
    `<tbody>${itemRowsHtml}</tbody>` +
    '</table>' +
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
    '<div class="inv-sig">' +
    `<span>위 금액을 정히 ${esc(inv.receipt_type ?? '영수(청구)')}합니다.</span>` +
    `<span class="inv-stamp">${stampHtml}</span>` +
    '</div>'
  )
}

function buildDuplexInvoiceHtml(inv: PrintInvoice, items: PrintItem[]): string {
  const supplier = buildInvoiceHtml(inv, items, '공급자 보관용')
  const recipient = buildInvoiceHtml(inv, items, '공급받는자 보관용')
  return (
    '<div class="inv-page-duplex">' +
    '<div class="inv-half top"><div class="inv-scale-wrap">' +
    supplier +
    '</div></div>' +
    '<div class="inv-cut-line"><span>✂ 절 취 선</span></div>' +
    '<div class="inv-half bottom"><div class="inv-scale-wrap">' +
    recipient +
    '</div></div>' +
    '</div>'
  )
}

/**
 * A4 이등분 인쇄 (iframe 기반)
 * - html/body height:297mm + overflow:hidden → Chrome 2페이지 생성 원천 차단
 * - 절취선 148.5mm (A4 정중앙), 각 절반 7mm 균등 여백
 * - 콘텐츠 넘칠 경우 zoom 축소 (최소 0.5배)
 */
export function printDuplexViaIframe(inv: PrintInvoice, items: PrintItem[]): void {
  const duplexHtml = buildDuplexInvoiceHtml(inv, items)

  const iframe = document.createElement('iframe')
  iframe.style.cssText =
    'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;visibility:hidden;'
  document.body.appendChild(iframe)

  const iframeDoc = (iframe.contentDocument ||
    (iframe.contentWindow as Window).document) as Document

  const TARGET_MM = 132
  const TARGET_PX = TARGET_MM * (96 / 25.4)

  const cssText = [
    '@page { size: A4 portrait; margin: 0; }',
    'html { margin:0; padding:0; width:210mm; height:297mm; overflow:hidden !important; }',
    "body { margin:0; padding:0; width:210mm; height:297mm; overflow:hidden !important; font-family:'Malgun Gothic','맑은 고딕',sans-serif; color:#000; font-size:6pt; }",
    '* { box-sizing:border-box; }',
    '.inv-tbl { width:100%; border-collapse:collapse; }',
    '.inv-header { display:flex; align-items:center; justify-content:space-between; border:1.5px solid #333; padding:3px 6px; gap:6px; }',
    '.inv-logo { width:80px; }',
    '.inv-title-area { text-align:center; flex:1; }',
    '.inv-title { font-size:11pt; font-weight:900; letter-spacing:5px; }',
    '.inv-sub { font-size:5.5pt; color:#555; margin-top:1px; }',
    '.inv-meta-tbl { border:1.5px solid #333; border-top:none; }',
    '.inv-meta-tbl td { border:1px solid #999; padding:1.5px 4px; font-size:6pt; }',
    '.inv-ml { background:#f5f5f5; text-align:center; font-weight:600; white-space:nowrap; width:44px; }',
    '.inv-parties { display:flex; border:1.5px solid #333; border-top:none; }',
    '.inv-party { flex:1; }',
    '.inv-party:first-child { border-right:1px solid #aaa; }',
    '.inv-party-title { background:#f0f0f0; text-align:center; font-weight:700; padding:2px 0; font-size:6.5pt; border-bottom:1px solid #aaa; }',
    '.inv-party-tbl td { border:none; border-bottom:1px solid #eee; border-right:1px solid #eee; padding:1.5px 3px; font-size:5.5pt; }',
    '.inv-pl { background:#f9f9f9; font-weight:600; white-space:nowrap; width:42px; text-align:center; }',
    '.inv-items-table { border:1.5px solid #333; border-top:none; }',
    '.inv-items-table th { background:#f0f0f0; border:1px solid #999; padding:1.5px 1px; text-align:center; font-weight:700; font-size:5.5pt; }',
    '.inv-items-table td { border:1px solid #ccc; padding:1px 2px; font-size:6pt; }',
    '.inv-blank td { height:11px; }',
    '.inv-total-tbl { border:1.5px solid #333; border-top:none; }',
    '.inv-total-tbl td { border:1px solid #999; padding:2px 5px; font-size:6.5pt; }',
    '.inv-tl { background:#f5f5f5; text-align:center; font-weight:600; white-space:nowrap; width:60px; }',
    '.inv-grand { background:#e8f0e8 !important; font-weight:700; }',
    '.inv-balance-tbl { border:1.5px solid #333; border-top:none; }',
    '.inv-balance-tbl td { border:1px solid #999; padding:2px 4px; font-size:6pt; }',
    '.inv-bl { background:#f5f5f5; text-align:center; font-weight:600; white-space:nowrap; width:44px; }',
    '.inv-bv-warn { color:#dc2626; font-weight:700; }',
    '.inv-memo { border:1.5px solid #333; border-top:none; padding:2px 6px; font-size:6pt; }',
    '.inv-sig { border:1.5px solid #333; border-top:none; padding:4px 8px; display:flex; align-items:center; justify-content:space-between; font-size:6.5pt; }',
    '.inv-stamp { display:inline-block; width:36px; height:36px; }',
    '.t-right { text-align:right; }',
    '.t-center { text-align:center; }',
    '.inv-page-duplex { position:relative; width:210mm; height:297mm; background:#fff; overflow:hidden; }',
    '.inv-half { position:absolute; width:210mm; box-sizing:border-box; padding:7mm 8mm 7mm; overflow:hidden; }',
    '.inv-half.top    { top:0; height:148.5mm; }',
    '.inv-half.bottom { top:148.5mm; height:148.5mm; }',
    '.inv-cut-line { position:absolute; top:148.5mm; left:0; right:0; border-top:1px dashed #bbb; display:flex; align-items:center; justify-content:center; }',
    ".inv-cut-line span { background:#fff; padding:0 8px; font-size:6pt; color:#bbb; letter-spacing:3px; transform:translateY(-50%); font-family:'Malgun Gothic',sans-serif; }",
    '.inv-scale-wrap { width:100%; }',
  ].join('\n')

  // minify script to avoid parser issues
  const scriptText =
    `(function(){var T=${TARGET_PX.toFixed(1)};` +
    `function z(){var h=document.querySelectorAll('.inv-half');` +
    `for(var i=0;i<h.length;i++){var w=h[i].querySelector('.inv-scale-wrap');` +
    `if(!w)continue;w.style.zoom='';var s=w.scrollHeight;` +
    `if(s>T){var r=T/s;if(r>=0.5)w.style.zoom=r.toFixed(4);}}}` +
    `window.addEventListener('beforeprint',z);})();`

  iframeDoc.open()
  iframeDoc.write(
    '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
      '<style>' +
      cssText +
      '</style>' +
      '</head><body>' +
      duplexHtml +
      '<script>' +
      scriptText +
      '<\\/script>' +
      '</body></html>',
  )
  iframeDoc.close()
  iframe.contentWindow?.focus()

  setTimeout(() => {
    iframeDoc.querySelectorAll<HTMLElement>('.inv-half').forEach((half) => {
      const wrap = half.querySelector<HTMLElement>('.inv-scale-wrap')
      if (!wrap) return
      wrap.style.zoom = ''
      const h = wrap.scrollHeight
      if (h > TARGET_PX) {
        const z = TARGET_PX / h
        if (z >= 0.5) wrap.style.zoom = z.toFixed(4)
      }
    })
    iframe.contentWindow?.print()
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe)
    }, 3000)
  }, 600)
}
