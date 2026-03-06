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
    `<div class="kc"><div class="kl">합계 매출</div><div class="kv">${stats.totalSales.toLocaleString()}원</div></div>` +
    `<div class="kc"><div class="kl">CRM 명세표</div><div class="kv">${stats.crmSales.toLocaleString()}원</div></div>` +
    `<div class="kc"><div class="kl">레거시 출고</div><div class="kv">${stats.legacySales.toLocaleString()}원</div></div>` +
    `<div class="kc${stats.outstanding > 0 ? ' warn' : ''}"><div class="kl">기간 미수금</div><div class="kv">${stats.outstanding.toLocaleString()}원</div></div>` +
    `</div>` +
    (crmInvoices.length > 0
      ? `<div class="sec">CRM 거래명세표 (${stats.crmCount}건 / ${stats.crmSales.toLocaleString()}원)</div>` +
        `<table><thead><tr>` +
        `<th style="width:22%">발행번호</th><th style="width:12%">발행일</th>` +
        `<th style="width:14%">공급가액</th><th style="width:14%">합계금액</th>` +
        `<th style="width:14%">입금액</th><th style="width:10%">수금</th>` +
        `</tr></thead><tbody>${crmRows}</tbody></table>`
      : '') +
    (legacyTx.length > 0
      ? `<div class="sec">레거시 거래내역 (${stats.legacyCount}건 / ${stats.legacySales.toLocaleString()}원)</div>` +
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
  const iframeDoc = (iframe.contentDocument ||
    (iframe.contentWindow as Window).document) as Document
  iframeDoc.open()
  iframeDoc.write(html)
  iframeDoc.close()
  iframe.contentWindow?.focus()
  setTimeout(() => {
    iframe.contentWindow?.print()
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe)
    }, 3000)
  }, 600)
}
