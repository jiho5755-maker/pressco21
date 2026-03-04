// ─────────────────────────────────────────
// API 설정
// ─────────────────────────────────────────
var API = {
  base: "https://nocodb.pressco21.com",
  token: "SIxKK9NtvgsQeLnMQcxbi5pNJGF7tJhnrv6LLGFl",
  projectId: "pu0mwk97kac8a5p",
  tables: {
    customers: "mffgxkftaeppyk0",
    products:  "mioztktmluobmmo",
    invoices:  "ml81i9mcuw0pjzk",
    items:     "mxwgdlj56p9joxo",
    suppliers: "mw6y9qyzex7lix9", // tbl_Suppliers
  }
};

function apiUrl(table) {
  return API.base + "/api/v1/db/data/noco/" + API.projectId + "/" + API.tables[table];
}

async function apiFetch(url, options) {
  options = options || {};
  var res = await fetch(url, Object.assign({}, options, {
    headers: Object.assign(
      { "xc-token": API.token, "Content-Type": "application/json" },
      options.headers || {}
    )
  }));
  if (!res.ok) throw new Error("API " + res.status + " " + url);
  return res.json();
}

function buildWhere(where, extra) {
  var q = "?where=" + encodeURIComponent(where);
  if (extra) q += "&" + extra;
  return q;
}

// ─────────────────────────────────────────
// 토스트 알림
// ─────────────────────────────────────────
function toast(msg, type) {
  type = type || "success";
  var container = document.getElementById("toast-container");
  if (!container) return;
  var el = document.createElement("div");
  el.className = "toast toast-" + type;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(function() { el.classList.add("toast-show"); }, 10);
  setTimeout(function() {
    el.classList.remove("toast-show");
    setTimeout(function() { el.remove(); }, 300);
  }, 3000);
}

// ─────────────────────────────────────────
// 인쇄 이미지 프리로드 (PDF 준비중 방지)
// ─────────────────────────────────────────
var _logoDataUrl = "";
var _stampDataUrl = "";

function _fetchDataUrl(src, cb) {
  fetch(src)
    .then(function(res) { return res.blob(); })
    .then(function(blob) {
      var reader = new FileReader();
      reader.onloadend = function() { cb(reader.result); };
      reader.readAsDataURL(blob);
    })
    .catch(function() { cb(""); });
}

// ─────────────────────────────────────────
// 다중 주소 관리
// ─────────────────────────────────────────
function addAddrField(containerId, value) {
  var container = document.getElementById(containerId);
  if (!container) return;
  var idx = container.querySelectorAll(".addr-row").length;
  var row = document.createElement("div");
  row.className = "addr-row";
  row.style.cssText = "display:flex;gap:6px;margin-bottom:6px;align-items:center";
  row.innerHTML = '<input type="text" class="addr-input" placeholder="주소 ' + (idx + 1) + '" style="flex:1" value="' + esc(value || "") + '">' +
    '<button type="button" onclick="this.parentNode.remove()" style="background:#dc2626;color:#fff;border:none;border-radius:4px;padding:2px 8px;cursor:pointer;flex-shrink:0">×</button>';
  container.appendChild(row);
}

function getAddrList(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return [];
  return Array.from(container.querySelectorAll(".addr-input"))
    .map(function(el) { return el.value.trim(); })
    .filter(Boolean);
}

function setAddrList(containerId, addresses) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  (addresses || []).forEach(function(addr) { addAddrField(containerId, addr); });
  if (!addresses || !addresses.length) addAddrField(containerId, ""); // 최소 1개
}

// ─────────────────────────────────────────
// 설정
// ─────────────────────────────────────────
var companyInfo = {};

function loadSettings() {
  try {
    var saved = localStorage.getItem("pressco21-crm-v2");
    if (saved) companyInfo = JSON.parse(saved);
  } catch(e) { companyInfo = {}; }
  var map = {
    "cfg-company": "company", "cfg-bizno": "bizno", "cfg-ceo": "ceo",
    "cfg-biz-type": "bizType", "cfg-biz-item": "bizItem",
    "cfg-address": "address", "cfg-phone": "phone", "cfg-fax": "fax", "cfg-email": "email",
    "cfg-suppliers-table-id": "suppliersTableId",
  };
  // 동적 테이블 ID 적용
  if (companyInfo.suppliersTableId) API.tables.suppliers = companyInfo.suppliersTableId;
  Object.keys(map).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = companyInfo[map[id]] || "";
  });
}

function saveSettings() {
  companyInfo = {
    company: v("cfg-company"), bizno: v("cfg-bizno"), ceo: v("cfg-ceo"),
    bizType: v("cfg-biz-type"), bizItem: v("cfg-biz-item"),
    address: v("cfg-address"), phone: v("cfg-phone"), fax: v("cfg-fax"), email: v("cfg-email"),
    suppliersTableId: v("cfg-suppliers-table-id"),
  };
  // 동적 테이블 ID 즉시 반영
  if (companyInfo.suppliersTableId) API.tables.suppliers = companyInfo.suppliersTableId;
  try {
    localStorage.setItem("pressco21-crm-v2", JSON.stringify(companyInfo));
    var btn = document.getElementById("btn-save-settings");
    if (btn) { btn.textContent = "✓ 저장됨"; setTimeout(function() { btn.textContent = "설정 저장"; }, 2000); }
    toast("설정이 저장되었습니다.", "success");
  } catch(e) {
    toast("저장 실패: " + e.message, "error");
  }
}

function v(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }

// ─────────────────────────────────────────
// 페이지 전환
// ─────────────────────────────────────────
var pageLoaded = {};
var pageHistory = [];

function showPage(name) {
  // 현재 활성 페이지를 히스토리에 저장
  var active = document.querySelector(".page.active");
  if (active) {
    var currentName = active.id.replace("page-", "");
    if (currentName !== name) pageHistory.push(currentName);
    if (pageHistory.length > 30) pageHistory.shift();
  }
  _activatePage(name);
}

function goBack() {
  if (pageHistory.length === 0) return;
  var prev = pageHistory.pop();
  _activatePage(prev);
}

function _activatePage(name) {
  document.querySelectorAll(".page").forEach(function(p) { p.classList.remove("active"); });
  document.querySelectorAll(".sidebar-menu a").forEach(function(a) { a.classList.remove("active"); });
  document.getElementById("page-" + name).classList.add("active");
  document.getElementById("nav-" + name).classList.add("active");

  // 뒤로가기 버튼 표시/숨김
  var backBtn = document.getElementById("sidebar-back");
  if (backBtn) backBtn.style.display = pageHistory.length > 0 ? "block" : "none";

  if (name === "list"      && !pageLoaded.list)      { pageLoaded.list = true;      initCalendar(); }
  if (name === "products"  && !pageLoaded.products)  { pageLoaded.products = true;  loadProductList(""); }
  if (name === "customers" && !pageLoaded.customers) { pageLoaded.customers = true; loadCustomerList(""); }
  if (name === "suppliers") { loadSupplierList(supplierCurrentQ); }
  if (name === "dashboard") { loadDashboard(); }
  if (name === "new") {
    setTimeout(function() {
      var cs = document.getElementById("customer-search");
      if (cs && !document.getElementById("f-customer-id").value) cs.focus();
    }, 100);
  }
}

// ─────────────────────────────────────────
// 대시보드
// ─────────────────────────────────────────
async function loadDashboard() {
  // 고객 수
  try {
    var custRes = await apiFetch(apiUrl("customers") + "?limit=1");
    var el = document.getElementById("stat-customers");
    if (el) el.textContent = ((custRes.pageInfo || {}).totalRows || 0).toLocaleString();
  } catch(e) { console.error("대시보드 고객:", e); }

  // 상품 수
  try {
    var prodRes = await apiFetch(apiUrl("products") + "?limit=1");
    var el2 = document.getElementById("stat-products");
    if (el2) el2.textContent = ((prodRes.pageInfo || {}).totalRows || 0).toLocaleString();
  } catch(e) { console.error("대시보드 상품:", e); }

  // 명세표: 최근 500건 로드 후 클라이언트 사이드 월별 필터
  try {
    var now = new Date();
    var ym = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    var invRes = await apiFetch(apiUrl("invoices") + "?sort=-invoice_date&limit=500");
    var all = invRes.list || [];
    var monthList = all.filter(function(r) { return (r.invoice_date || "").startsWith(ym); });
    var monthCount = monthList.length;
    var totalSales = monthList.reduce(function(s, r) { return s + (r.supply_amount || 0); }, 0);
    var elM = document.getElementById("stat-month");
    var elS = document.getElementById("stat-sales");
    if (elM) elM.textContent = monthCount;
    if (elS) elS.textContent = totalSales.toLocaleString() + "원";
    renderInvoiceRows("recent-invoices-body", all.slice(0, 10));
  } catch(e) {
    console.error("대시보드 명세표:", e);
    var elM2 = document.getElementById("stat-month");
    var elS2 = document.getElementById("stat-sales");
    if (elM2) elM2.textContent = "0";
    if (elS2) elS2.textContent = "0원";
    var tbody = document.getElementById("recent-invoices-body");
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:#ef4444">불러오기 실패 — 콘솔 확인</td></tr>';
  }
}

function statusLabel(s) {
  return { draft: "임시저장", issued: "발행완료", sent: "발송완료" }[s] || "임시저장";
}

// ─────────────────────────────────────────
// 2-A: 폼 모드 뱃지
// ─────────────────────────────────────────
function setFormMode(mode, invoiceNo) {
  var badge = document.getElementById("form-mode-badge");
  if (!badge) return;
  badge.className = "form-status-badge form-status-" + mode;
  if (mode === "edit")      badge.textContent = "수정 중: " + (invoiceNo || "");
  else if (mode === "copy") badge.textContent = "복사: " + (invoiceNo || "");
  else                      badge.textContent = "새 작성";
}

function renderInvoiceRows(tbodyId, list) {
  var tbody = document.getElementById(tbodyId);
  if (!list || !list.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:#9ca3af">내역 없음</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(function(inv) {
    return '<tr>' +
      '<td>' + esc(inv.invoice_no || "-") + '</td>' +
      '<td>' + esc(inv.customer_name || "") + '</td>' +
      '<td>' + esc(inv.invoice_date || "") + '</td>' +
      '<td class="td-num">' + (inv.supply_amount || 0).toLocaleString() + '원</td>' +
      '<td class="td-num">' + (inv.tax_amount || 0).toLocaleString() + '원</td>' +
      '<td class="td-num">' + (inv.total_amount || 0).toLocaleString() + '원</td>' +
      '<td><span class="status-badge status-' + (inv.status || "draft") + '">' + statusLabel(inv.status) + '</span></td>' +
      '<td style="white-space:nowrap">' +
        '<button class="btn-ghost btn-sm" onclick="loadInvoiceForEdit(' + inv.Id + ')">수정</button>' +
        '<button class="btn-ghost btn-sm" onclick="copyInvoice(' + inv.Id + ')">복사</button>' +
        '<button class="btn-ghost btn-sm" onclick="printInvoiceById(' + inv.Id + ')">인쇄</button>' +
        '<button class="btn-danger btn-sm" style="margin-left:4px" onclick="deleteInvoice(' + inv.Id + ')">삭제</button>' +
      '</td>' +
    '</tr>';
  }).join("");
}

// ─────────────────────────────────────────
// 2-A: 명세표 편집/복사/삭제
// ─────────────────────────────────────────
async function loadInvoiceForEdit(invId) {
  try {
    var inv = await apiFetch(apiUrl("invoices") + "/" + invId);
    var itemsRes = await apiFetch(apiUrl("items") + buildWhere("(invoice_id,eq,"+invId+")", "limit=200"));
    var items = itemsRes.list || [];

    resetForm(true); // 강제 초기화 (confirm 없이)
    showPage("new");

    // 고객 정보 복원
    document.getElementById("f-customer-id").value      = inv.customer_id || "";
    document.getElementById("f-customer-name").value    = inv.customer_name || "";
    document.getElementById("f-customer-bizno").value   = inv.customer_bizno || "";
    document.getElementById("f-customer-addr").value    = inv.customer_address || "";
    document.getElementById("f-customer-phone").value   = inv.customer_phone || "";
    document.getElementById("f-customer-manager").value = inv.manager || "";
    document.getElementById("f-date").value             = inv.invoice_date || todayStr();
    document.getElementById("f-memo").value             = inv.memo || "";

    // 선택 고객 카드 표시
    var card = document.getElementById("selected-customer-card");
    if (card && inv.customer_name) {
      card.style.display = "flex";
      document.getElementById("sc-name").textContent  = inv.customer_name || "";
      document.getElementById("sc-phone").textContent = inv.customer_phone || "";
      document.getElementById("sc-addr").textContent  = inv.customer_address || "";
      document.getElementById("sc-tier").textContent  = "";
    }

    // 영수/청구 복원
    var rtEl = document.getElementById("f-receipt-type");
    if (rtEl && inv.receipt_type) rtEl.value = inv.receipt_type;

    // 품목 복원
    items.forEach(function(item) {
      var isTax = (item.is_taxable === "과세") || (item.is_taxable === "Y");
      addRow({
        productCode: item.product_code || "",
        productName: item.product_name || "",
        unit: item.unit || "",
        qty: item.quantity || 1,
        unitPrice: item.unit_price || 0,
        isTaxable: isTax,
      });
    });
    if (!items.length) addEmptyRow();

    // PATCH 모드 설정
    document.getElementById("f-invoice-id").value        = invId;
    document.getElementById("f-invoice-no-stored").value = inv.invoice_no || "";
    setFormMode("edit", inv.invoice_no);
    toast("명세표를 편집 모드로 불러왔습니다.", "info");
  } catch(e) {
    toast("불러오기 실패: " + e.message, "error");
  }
}

async function copyInvoice(invId) {
  try {
    var inv = await apiFetch(apiUrl("invoices") + "/" + invId);
    var itemsRes = await apiFetch(apiUrl("items") + buildWhere("(invoice_id,eq,"+invId+")", "limit=200"));
    var items = itemsRes.list || [];

    resetForm(true);
    showPage("new");

    document.getElementById("f-customer-id").value      = inv.customer_id || "";
    document.getElementById("f-customer-name").value    = inv.customer_name || "";
    document.getElementById("f-customer-bizno").value   = inv.customer_bizno || "";
    document.getElementById("f-customer-addr").value    = inv.customer_address || "";
    document.getElementById("f-customer-phone").value   = inv.customer_phone || "";
    document.getElementById("f-customer-manager").value = inv.manager || "";
    document.getElementById("f-date").value             = todayStr(); // 오늘 날짜
    document.getElementById("f-memo").value             = inv.memo || "";

    var card = document.getElementById("selected-customer-card");
    if (card && inv.customer_name) {
      card.style.display = "flex";
      document.getElementById("sc-name").textContent  = inv.customer_name || "";
      document.getElementById("sc-phone").textContent = inv.customer_phone || "";
      document.getElementById("sc-addr").textContent  = inv.customer_address || "";
      document.getElementById("sc-tier").textContent  = "";
    }

    items.forEach(function(item) {
      var isTax = (item.is_taxable === "과세") || (item.is_taxable === "Y");
      addRow({ productCode: item.product_code || "", productName: item.product_name || "",
        unit: item.unit || "", qty: item.quantity || 1,
        unitPrice: item.unit_price || 0, isTaxable: isTax });
    });
    if (!items.length) addEmptyRow();

    // 새 명세표로 처리 (existId 없음)
    document.getElementById("f-invoice-id").value        = "";
    document.getElementById("f-invoice-no-stored").value = "";
    setFormMode("copy", inv.invoice_no);
    toast("명세표를 복사했습니다. 저장 시 새 번호로 발행됩니다.", "info");
  } catch(e) {
    toast("불러오기 실패: " + e.message, "error");
  }
}

async function deleteInvoice(invId) {
  if (!confirm("이 명세표를 삭제하시겠습니까?\n(복구 불가)")) return;
  try {
    // items 먼저 삭제
    var oldItems = await apiFetch(apiUrl("items") + buildWhere("(invoice_id,eq,"+invId+")", "fields=Id&limit=200"));
    var oldIds = (oldItems.list || []).map(function(it) { return it.Id; });
    if (oldIds.length) {
      await apiFetch(API.base+"/api/v1/db/data/bulk/noco/"+API.projectId+"/"+API.tables.items,
        { method: "DELETE", body: JSON.stringify(oldIds.map(function(oid) { return { Id: oid }; })) });
    }
    await apiFetch(apiUrl("invoices") + "/" + invId, { method: "DELETE" });
    toast("명세표가 삭제되었습니다.", "success");
    // 발행 내역 갱신
    pageLoaded.list = false;
    allInvoices = allInvoices.filter(function(inv) { return inv.Id !== invId; });
    renderCalendar();
    loadDashboard();
  } catch(e) {
    toast("삭제 실패: " + e.message, "error");
  }
}

// ─────────────────────────────────────────
// 발행내역 캘린더
// ─────────────────────────────────────────
var calYear, calMonth, allInvoices = [], calCustomerFilter = "";

function initCalendar() {
  var now = new Date();
  calYear  = now.getFullYear();
  calMonth = now.getMonth() + 1;
  loadCalendarData();
}

async function loadCalendarData() {
  try {
    var res = await apiFetch(apiUrl("invoices") + "?sort=-invoice_date&limit=2000");
    allInvoices = res.list || [];
    renderCalendar();

    var names = {};
    allInvoices.forEach(function(inv) { if (inv.customer_name) names[inv.customer_name] = 1; });
    var sel = document.getElementById("cal-customer-filter");
    if (sel) {
      var cur = sel.value;
      sel.innerHTML = '<option value="">전체 고객</option>' +
        Object.keys(names).sort().map(function(n) {
          return '<option value="' + esc(n) + '"' + (cur === n ? " selected" : "") + '>' + esc(n) + '</option>';
        }).join("");
    }
  } catch(e) { console.error("캘린더 로드:", e); }
}

function renderCalendar() {
  var ym = calYear + "-" + String(calMonth).padStart(2, "0");
  var filtered = allInvoices.filter(function(inv) {
    if (calCustomerFilter && inv.customer_name !== calCustomerFilter) return false;
    return (inv.invoice_date || "").startsWith(ym);
  });

  var byDay = {};
  filtered.forEach(function(inv) {
    var d = (inv.invoice_date || "").substring(8, 10);
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(inv);
  });

  document.getElementById("cal-title").textContent = calYear + "년 " + calMonth + "월";
  var monthTotal = filtered.reduce(function(s,r) { return s+(r.total_amount||0); }, 0);
  document.getElementById("cal-summary").textContent =
    filtered.length + "건 / " + monthTotal.toLocaleString() + "원";

  var firstDay = new Date(calYear, calMonth - 1, 1).getDay();
  var lastDate = new Date(calYear, calMonth, 0).getDate();
  var today = new Date();
  var todayStr2 = today.getFullYear() + "-" + String(today.getMonth()+1).padStart(2,"0") + "-" + String(today.getDate()).padStart(2,"0");

  var html = '';
  var dayNames = ["일","월","화","수","목","금","토"];
  html += '<div class="cal-dow">' + dayNames.map(function(d) { return '<span>' + d + '</span>'; }).join("") + '</div>';
  html += '<div class="cal-grid">';

  for (var i = 0; i < firstDay; i++) html += '<div class="cal-cell empty"></div>';
  for (var d = 1; d <= lastDate; d++) {
    var dd = String(d).padStart(2, "0");
    var dateStr = ym + "-" + dd;
    var invs = byDay[dd] || [];
    var isToday = dateStr === todayStr2;
    var cls = "cal-cell" + (isToday ? " today" : "") + (invs.length ? " has-inv" : "");
    var dayAmt = invs.reduce(function(s,r){ return s+(r.total_amount||0); }, 0);
    html += '<div class="' + cls + '" onclick="selectCalDay(\'' + dateStr + '\')">' +
      '<span class="cal-day">' + d + '</span>' +
      (invs.length ? '<span class="cal-dot">' + invs.length + '건</span>' : '') +
      (invs.length ? '<div class="cal-amt">' + dayAmt.toLocaleString() + '</div>' : '') +
    '</div>';
  }
  html += '</div>';
  document.getElementById("cal-grid-wrap").innerHTML = html;

  renderCalInvoiceList(ym, filtered);
}

var selectedCalDate = "";
function selectCalDay(dateStr) {
  selectedCalDate = dateStr;
  var filtered = allInvoices.filter(function(inv) {
    if (calCustomerFilter && inv.customer_name !== calCustomerFilter) return false;
    return inv.invoice_date === dateStr;
  });
  document.getElementById("cal-list-title").textContent = dateStr + " 발행내역 (" + filtered.length + "건)";
  renderInvoiceRows("cal-invoice-body", filtered);
}

function renderCalInvoiceList(ym, list) {
  document.getElementById("cal-list-title").textContent =
    calYear + "년 " + calMonth + "월 전체 (" + list.length + "건)";
  renderInvoiceRows("cal-invoice-body", list);
}

function calPrev() { calMonth--; if (calMonth < 1) { calMonth = 12; calYear--; } renderCalendar(); }
function calNext() { calMonth++; if (calMonth > 12) { calMonth = 1; calYear++; } renderCalendar(); }

function onCalCustomerFilter() {
  calCustomerFilter = document.getElementById("cal-customer-filter").value;
  renderCalendar();
}

// ─────────────────────────────────────────
// 기간 매출 리포트
// ─────────────────────────────────────────
function setDateRange(type) {
  var now = new Date();
  var y = now.getFullYear();
  var m = now.getMonth(); // 0-indexed
  var from, to;

  if (type === "this-month") {
    from = y + "-" + pad2(m+1) + "-01";
    to   = todayStr();
  } else if (type === "last-month") {
    var lm = m === 0 ? 12 : m;
    var ly = m === 0 ? y - 1 : y;
    var lastDay = new Date(ly, lm, 0).getDate();
    from = ly + "-" + pad2(lm) + "-01";
    to   = ly + "-" + pad2(lm) + "-" + lastDay;
  } else if (type === "this-quarter") {
    var q = Math.floor(m / 3);
    from = y + "-" + pad2(q*3+1) + "-01";
    to   = todayStr();
  } else if (type === "last-quarter") {
    var q2 = Math.floor(m / 3) - 1;
    var qy = y;
    if (q2 < 0) { q2 = 3; qy = y - 1; }
    var qEndMonth = q2*3 + 3;
    var qLastDay = new Date(qy, qEndMonth, 0).getDate();
    from = qy + "-" + pad2(q2*3+1) + "-01";
    to   = qy + "-" + pad2(qEndMonth) + "-" + qLastDay;
  } else if (type === "first-half") {
    from = y + "-01-01";
    to   = y + "-06-30";
  } else if (type === "second-half") {
    from = y + "-07-01";
    to   = y + "-12-31";
  } else if (type === "this-year") {
    from = y + "-01-01";
    to   = todayStr();
  }

  var elFrom = document.getElementById("report-from");
  var elTo   = document.getElementById("report-to");
  if (elFrom) elFrom.value = from;
  if (elTo)   elTo.value   = to;
  showSalesReport();
}

function pad2(n) { return String(n).padStart(2, "0"); }

function showSalesReport() {
  var from = document.getElementById("report-from").value;
  var to   = document.getElementById("report-to").value;
  if (!from || !to) { toast("시작일과 종료일을 선택하세요.", "warning"); return; }
  var filtered = allInvoices.filter(function(inv) {
    if (calCustomerFilter && inv.customer_name !== calCustomerFilter) return false;
    return inv.invoice_date >= from && inv.invoice_date <= to;
  });
  var totalSupply = filtered.reduce(function(s,r){ return s+(r.supply_amount||0); }, 0);
  var totalTax    = filtered.reduce(function(s,r){ return s+(r.tax_amount||0); }, 0);
  var totalAmt    = filtered.reduce(function(s,r){ return s+(r.total_amount||0); }, 0);
  document.getElementById("report-result").innerHTML =
    '<div class="report-box">' +
    (calCustomerFilter ? '<strong>' + esc(calCustomerFilter) + '</strong> | ' : '전체 고객 | ') +
    from + ' ~ ' + to + '<br>' +
    '건수: <strong>' + filtered.length + '건</strong> &nbsp;|&nbsp; ' +
    '공급가액: <strong>' + totalSupply.toLocaleString() + '원</strong> &nbsp;|&nbsp; ' +
    '세액: <strong>' + totalTax.toLocaleString() + '원</strong> &nbsp;|&nbsp; ' +
    '합계: <strong style="color:#dc2626;font-size:15px">' + totalAmt.toLocaleString() + '원</strong>' +
    '</div>';
  renderInvoiceRows("cal-invoice-body", filtered);
  document.getElementById("cal-list-title").textContent = "기간 조회 결과 (" + filtered.length + "건)";
}

// ─────────────────────────────────────────
// 거래처 검색 자동완성
// ─────────────────────────────────────────
var customerCache = {};
var customerSearchTimer;
var customerAcIndex = -1;
var currentPriceTier = 1;
var currentCustomer = null;

function searchCustomers(q) {
  clearTimeout(customerSearchTimer);
  var ac = document.getElementById("customer-ac");
  if (!q || q.trim().length < 1) { hideAc("customer-ac"); return; }
  ac.innerHTML = '<div class="ac-loading">검색 중...</div>';
  ac.style.display = "block";
  customerSearchTimer = setTimeout(async function() {
    try {
      var trimQ = q.trim();
      var where = "(name,like,%" + trimQ + "%)~or(book_name,like,%" + trimQ + "%)~or(phone1,like,%" + trimQ + "%)~or(mobile,like,%" + trimQ + "%)";
      var res = await apiFetch(apiUrl("customers") + buildWhere(where, "limit=10&fields=Id,name,book_name,phone1,mobile,email,address1,address2,extra_addresses,business_no,manager,price_tier"));
      var list = res.list || [];
      if (!list.length) { ac.innerHTML = '<div class="ac-empty">검색 결과 없음</div>'; return; }
      list.forEach(function(c) { customerCache[c.Id] = c; });
      customerAcIndex = -1;
      ac.innerHTML = list.map(function(c, i) {
        var name  = c.name || c.book_name || "";
        var phone = c.phone1 || c.mobile || "";
        var addr  = [c.address1, c.address2].filter(Boolean).join(" ");
        return '<div class="ac-item" data-idx="' + i + '" data-id="' + c.Id + '" onmousedown="selectCustomer(' + c.Id + ')">' +
          '<div class="ac-main">' + highlightMatch(name, trimQ) + '</div>' +
          '<div class="ac-sub">' +
            (phone ? '<span class="ac-tag">' + esc(phone) + '</span>' : '') +
            (addr  ? '<span>' + esc(addr) + '</span>' : '') +
            '<span class="ac-tag" style="background:#dcfce7;color:#166534">등급' + (c.price_tier||1) + '</span>' +
          '</div></div>';
      }).join("");
      ac.style.display = "block";
    } catch(e) { console.error(e); ac.innerHTML = '<div class="ac-empty">오류 발생</div>'; }
  }, 250);
}

function selectCustomer(id) {
  var c = customerCache[id];
  if (!c) return;
  var name  = c.name || c.book_name || "";
  var phone = c.phone1 || c.mobile || "";
  // 다중 주소: address1 + extra_addresses(JSON) 병합
  var extras = [];
  try { extras = JSON.parse(c.extra_addresses || "[]"); } catch(e) { extras = []; }
  var addresses = [c.address1].concat(extras).filter(Boolean);
  var addr = addresses[0] || "";
  document.getElementById("customer-search").value        = "";
  hideAc("customer-ac");
  document.getElementById("f-customer-id").value          = id;
  document.getElementById("f-customer-name").value        = name;
  document.getElementById("f-customer-bizno").value       = c.business_no || "";
  document.getElementById("f-customer-addr").value        = addr;
  document.getElementById("f-customer-manager").value     = c.manager || "";
  document.getElementById("f-customer-phone").value       = phone;
  document.getElementById("f-customer-email").value       = c.email || "";
  document.getElementById("f-price-tier").value           = c.price_tier || 1;
  currentPriceTier = parseInt(c.price_tier) || 1;
  currentCustomer = c;
  // 다중 주소 선택 드롭다운
  var addrSelect = document.getElementById("f-addr-select");
  if (addrSelect) {
    if (addresses.length >= 2) {
      addrSelect.innerHTML = addresses.map(function(a, i) {
        return '<option value="' + i + '">주소' + (i+1) + ': ' + esc(a) + '</option>';
      }).join("");
      addrSelect.style.display = "";
      window._customerAddresses = addresses;
    } else {
      addrSelect.style.display = "none";
      window._customerAddresses = addresses;
    }
  }
  var tierBadge = document.getElementById("tier-badge");
  if (tierBadge) tierBadge.textContent = "단가등급 " + currentPriceTier;
  var card = document.getElementById("selected-customer-card");
  if (card) {
    card.style.display = "flex";
    document.getElementById("sc-name").textContent  = name;
    document.getElementById("sc-phone").textContent = phone;
    document.getElementById("sc-addr").textContent  = addr;
    document.getElementById("sc-tier").textContent  = "단가등급 " + (c.price_tier || 1);
  }
  // 최근 거래내역 로딩
  loadRecentTxForCustomer(id);
  // 고객 선택 후 상품 검색 포커스
  setTimeout(function() { document.getElementById("product-search").focus(); }, 100);
}

function onAddrSelectChange() {
  var addrSelect = document.getElementById("f-addr-select");
  var addresses = window._customerAddresses || [];
  var idx = parseInt(addrSelect ? addrSelect.value : 0) || 0;
  var addr = addresses[idx] || "";
  document.getElementById("f-customer-addr").value = addr;
  var scAddr = document.getElementById("sc-addr");
  if (scAddr) scAddr.textContent = addr;
}

async function loadRecentTxForCustomer(customerId) {
  var panel = document.getElementById("recent-tx-panel");
  var listEl = document.getElementById("recent-tx-list");
  if (!panel || !listEl) return;
  panel.style.display = "block";
  listEl.innerHTML = '<div style="color:#9ca3af;font-size:12px;padding:4px 0">불러오는 중...</div>';
  try {
    var res = await apiFetch(apiUrl("invoices") + buildWhere("(customer_id,eq,"+customerId+")", "sort=-invoice_date&limit=5"));
    var list = res.list || [];
    if (!list.length) {
      listEl.innerHTML = '<div style="color:#9ca3af;font-size:12px;padding:4px 0">거래 이력 없음</div>';
      return;
    }
    listEl.innerHTML = list.map(function(inv) {
      return '<div class="rtx-item">' +
        '<span class="rtx-date">' + (inv.invoice_date || "") + '</span>' +
        '<span style="color:#6b7280;margin:0 6px">' + esc(inv.invoice_no || "") + '</span>' +
        '<span class="rtx-amt">' + (inv.total_amount || 0).toLocaleString() + '원</span>' +
        '<button class="btn-ghost btn-sm" style="margin-left:8px;padding:1px 6px;font-size:11px" onclick="printInvoiceById(' + inv.Id + ')">인쇄</button>' +
      '</div>';
    }).join("");
  } catch(e) {
    listEl.innerHTML = '<div style="color:#dc2626;font-size:12px">오류 발생</div>';
  }
}

function clearSelectedCustomer() {
  ["f-customer-id","f-customer-name","f-customer-bizno","f-customer-addr",
   "f-customer-manager","f-customer-phone","f-customer-email","f-price-tier"].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.value = "";
  });
  currentPriceTier = 1; currentCustomer = null;
  var card = document.getElementById("selected-customer-card");
  if (card) card.style.display = "none";
  var panel = document.getElementById("recent-tx-panel");
  if (panel) panel.style.display = "none";
  setTimeout(function() { document.getElementById("customer-search").focus(); }, 50);
}

function onCustomerKeydown(e) {
  var ac = document.getElementById("customer-ac");
  if (ac.style.display === "none") return;
  var items = ac.querySelectorAll(".ac-item");
  if (!items.length) return;
  if (e.key === "ArrowDown") { e.preventDefault(); customerAcIndex = Math.min(customerAcIndex+1, items.length-1); highlightAcItem(items, customerAcIndex); }
  else if (e.key === "ArrowUp") { e.preventDefault(); customerAcIndex = Math.max(customerAcIndex-1, 0); highlightAcItem(items, customerAcIndex); }
  else if (e.key === "Enter" && customerAcIndex >= 0) { e.preventDefault(); selectCustomer(parseInt(items[customerAcIndex].getAttribute("data-id"))); }
  else if (e.key === "Escape") hideAc("customer-ac");
}

// ─────────────────────────────────────────
// 상품 검색 자동완성
// ─────────────────────────────────────────
var productCache = {};
var productSearchTimer;
var productAcIndex = -1;

function getPriceByTier(p, tier) { return p["price" + tier] || p.price1 || 0; }

function searchProducts(q) {
  clearTimeout(productSearchTimer);
  var ac = document.getElementById("product-ac");
  if (!q || q.trim().length < 1) { hideAc("product-ac"); return; }
  ac.innerHTML = '<div class="ac-loading">검색 중...</div>';
  ac.style.display = "block";
  productSearchTimer = setTimeout(async function() {
    try {
      var trimQ = q.trim();
      var where = "(name,like,%" + trimQ + "%)~or(product_code,like,%" + trimQ + "%)~or(alias,like,%" + trimQ + "%)";
      var res = await apiFetch(apiUrl("products") + buildWhere(where, "limit=15&fields=Id,product_code,name,alias,unit,price1,price2,price3,price4,price5,price6,price7,price8,is_taxable"));
      var list = res.list || [];
      if (!list.length) { ac.innerHTML = '<div class="ac-empty">검색 결과 없음</div>'; return; }
      list.forEach(function(p) { productCache[p.Id] = p; });
      productAcIndex = -1;
      ac.innerHTML = list.map(function(p, i) {
        var price = getPriceByTier(p, currentPriceTier);
        return '<div class="ac-item" data-idx="' + i + '" data-id="' + p.Id + '" onmousedown="selectProduct(' + p.Id + ')">' +
          '<div class="ac-main">' + highlightMatch(p.name, trimQ) +
            (p.alias ? ' <span style="color:#9ca3af;font-size:11px">(' + esc(p.alias) + ')</span>' : '') +
          '</div>' +
          '<div class="ac-sub">' +
            '<span class="ac-tag">' + esc(p.product_code || "") + '</span>' +
            '<span>단위: ' + esc(p.unit || "-") + '</span>' +
            '<span style="font-weight:600;color:#374151">단가' + currentPriceTier + ': ' + (price ? price.toLocaleString() + "원" : "-") + '</span>' +
          '</div></div>';
      }).join("");
      ac.style.display = "block";
    } catch(e) { console.error(e); ac.innerHTML = '<div class="ac-empty">오류 발생</div>'; }
  }, 250);
}

function selectProduct(id) {
  var p = productCache[id];
  if (!p) return;
  document.getElementById("product-search").value = "";
  hideAc("product-ac");
  addRow({ productCode: p.product_code || "", productName: p.name, unit: p.unit || "",
    qty: 1, unitPrice: getPriceByTier(p, currentPriceTier),
    isTaxable: (p.is_taxable || "").indexOf("과세") >= 0 });
  setTimeout(function() { document.getElementById("product-search").focus(); }, 50);
}

function onProductKeydown(e) {
  var ac = document.getElementById("product-ac");
  if (ac.style.display === "none") return;
  var items = ac.querySelectorAll(".ac-item");
  if (!items.length) return;
  if (e.key === "ArrowDown") { e.preventDefault(); productAcIndex = Math.min(productAcIndex+1, items.length-1); highlightAcItem(items, productAcIndex); }
  else if (e.key === "ArrowUp") { e.preventDefault(); productAcIndex = Math.max(productAcIndex-1, 0); highlightAcItem(items, productAcIndex); }
  else if (e.key === "Enter" && productAcIndex >= 0) { e.preventDefault(); selectProduct(parseInt(items[productAcIndex].getAttribute("data-id"))); }
  else if (e.key === "Escape") hideAc("product-ac");
}

// ─────────────────────────────────────────
// 자동완성 공통
// ─────────────────────────────────────────
function hideAc(id) { var el = document.getElementById(id); if (el) el.style.display = "none"; }
function highlightAcItem(items, idx) {
  items.forEach(function(el, i) { el.classList.toggle("ac-focused", i === idx); });
  if (items[idx]) items[idx].scrollIntoView({ block: "nearest" });
}
function highlightMatch(text, q) {
  if (!q) return esc(text);
  return esc(text).replace(new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&") + ")", "gi"), "<mark>$1</mark>");
}
document.addEventListener("mousedown", function(e) {
  if (!e.target.closest(".search-wrap")) { hideAc("customer-ac"); hideAc("product-ac"); }
});

// ─────────────────────────────────────────
// 2-D: 저장 안전장치
// ─────────────────────────────────────────
var isSaving = false;
var isDirty  = false;

window.addEventListener("beforeunload", function(e) {
  if (isDirty) {
    e.preventDefault();
    e.returnValue = "작성 중인 내용이 있습니다. 정말 떠나시겠습니까?";
  }
});

// ─────────────────────────────────────────
// 품목 행 관리
// ─────────────────────────────────────────
var itemRows = [], rowCounter = 0;

function addEmptyRow() {
  addRow({ productCode: "", productName: "", unit: "", qty: 1, unitPrice: 0, isTaxable: true });
}

function addRow(data) {
  var id = ++rowCounter;
  var emptyRow = document.getElementById("empty-row");
  if (emptyRow) emptyRow.remove();
  // 과세 여부: "Y"(과세) / "N"(면세)
  var taxable = data.isTaxable ? "Y" : "N";
  var supply = (data.qty||0) * (data.unitPrice||0);
  // 세금계산서 기준: 절사(Math.floor) 적용
  var tax    = taxable === "Y" ? Math.floor(supply / 10) : 0;
  var total  = supply + tax;
  var totalUnit = (data.qty||0) > 0 ? total / (data.qty||1) : 0;
  var rowNum = document.getElementById("item-list").querySelectorAll("tr").length + 1;
  var tr = document.createElement("tr");
  tr.id = "row-" + id;
  tr.innerHTML =
    '<td class="td-center">' + rowNum + '</td>' +
    '<td><input type="hidden" id="row-'+id+'-code" value="'+esc(data.productCode)+'">' +
      '<input type="hidden" id="row-'+id+'-taxable" value="'+taxable+'">' +
      '<input type="hidden" id="row-'+id+'-totalunit" value="'+totalUnit+'">' +
      '<input type="text" value="'+esc(data.productName)+'" id="row-'+id+'-name" style="text-align:left;min-width:140px"></td>' +
    '<td><input type="text" value="'+esc(data.unit)+'" id="row-'+id+'-unit" style="width:50px;text-align:center"></td>' +
    '<td><input type="number" value="'+data.qty+'" id="row-'+id+'-qty" oninput="recalcRowFromQty('+id+')" style="width:55px;text-align:right"></td>' +
    '<td><input type="number" value="'+data.unitPrice+'" id="row-'+id+'-price" oninput="recalcRowFromPrice('+id+')" style="width:85px;text-align:right"></td>' +
    '<td class="td-num" id="row-'+id+'-supply">'+supply.toLocaleString()+'</td>' +
    '<td class="td-num" id="row-'+id+'-tax">'+tax.toLocaleString()+'</td>' +
    '<td><input type="number" value="'+total+'" id="row-'+id+'-total" oninput="recalcRowFromTotal('+id+')" style="width:90px;text-align:right;border:none;padding:2px 4px;background:transparent;font-weight:600"></td>' +
    '<td class="td-center no-print"><button class="btn-danger" onclick="removeRow('+id+')">✕</button></td>';
  document.getElementById("item-list").appendChild(tr);
  itemRows.push(id);
  updateTotals();
}

// 단가 변경 시 재계산 (세금계산서 기준: 절사)
function recalcRowFromPrice(id) {
  var qty    = parseFloat(document.getElementById("row-"+id+"-qty").value)   || 0;
  var price  = parseFloat(document.getElementById("row-"+id+"-price").value) || 0;
  var taxable = document.getElementById("row-"+id+"-taxable").value;
  var supply = qty * price;
  var tax    = taxable === "Y" ? Math.floor(supply / 10) : 0;
  var total  = supply + tax;
  var totalUnit = qty > 0 ? total / qty : 0;
  document.getElementById("row-"+id+"-totalunit").value    = totalUnit;
  document.getElementById("row-"+id+"-supply").textContent = supply.toLocaleString();
  document.getElementById("row-"+id+"-tax").textContent    = tax.toLocaleString();
  document.getElementById("row-"+id+"-total").value        = total;
  updateTotals();
}

// 수량 변경 시 재계산 — totalUnit 기준 우선 (800원×10=8000원 버그 수정)
function recalcRowFromQty(id) {
  var qty     = parseFloat(document.getElementById("row-"+id+"-qty").value) || 0;
  var taxable = document.getElementById("row-"+id+"-taxable").value;
  var totalUnitEl = document.getElementById("row-"+id+"-totalunit");
  var totalUnit   = totalUnitEl ? parseFloat(totalUnitEl.value) || 0 : 0;
  if (totalUnit > 0) {
    // totalUnit 기반 역산: 수량×단위합계 반올림
    var total  = Math.round(totalUnit * qty);
    var supply = taxable === "Y" ? Math.floor(total / 1.1) : total;
    var tax    = total - supply;
    document.getElementById("row-"+id+"-supply").textContent = supply.toLocaleString();
    document.getElementById("row-"+id+"-tax").textContent    = tax.toLocaleString();
    document.getElementById("row-"+id+"-total").value        = total;
    updateTotals();
  } else {
    recalcRowFromPrice(id);
  }
}

// 합계(부가포함) 직접 입력 시 역산 (세금계산서 기준: 절사)
function recalcRowFromTotal(id) {
  var total   = parseFloat(document.getElementById("row-"+id+"-total").value) || 0;
  var taxable = document.getElementById("row-"+id+"-taxable").value;
  var qty     = parseFloat(document.getElementById("row-"+id+"-qty").value) || 1;
  var supply  = taxable === "Y" ? Math.floor(total / 1.1) : total;
  var tax     = total - supply;
  // totalUnit 갱신
  var totalUnitEl = document.getElementById("row-"+id+"-totalunit");
  if (totalUnitEl && qty > 0) totalUnitEl.value = total / qty;
  document.getElementById("row-"+id+"-supply").textContent = supply.toLocaleString();
  document.getElementById("row-"+id+"-tax").textContent    = tax.toLocaleString();
  if (qty > 0) document.getElementById("row-"+id+"-price").value = Math.floor(supply / qty);
  updateTotals();
}

function removeRow(id) {
  document.getElementById("row-"+id).remove();
  itemRows = itemRows.filter(function(r){ return r !== id; });
  if (!itemRows.length) {
    document.getElementById("item-list").innerHTML =
      '<tr id="empty-row"><td colspan="9" style="text-align:center;padding:14px;color:#9ca3af">품목을 검색하여 추가하세요</td></tr>';
  } else {
    // 4-D: 행 번호 재정렬
    itemRows.forEach(function(rowId, idx) {
      var firstCell = document.querySelector("#row-"+rowId+" td:first-child");
      if (firstCell) firstCell.textContent = idx + 1;
    });
  }
  updateTotals();
}

function updateTotals() {
  var supply=0, tax=0, total=0;
  itemRows.forEach(function(id) {
    supply += parseMoney(document.getElementById("row-"+id+"-supply").textContent);
    tax    += parseMoney(document.getElementById("row-"+id+"-tax").textContent);
    total  += parseFloat(document.getElementById("row-"+id+"-total").value) || 0;
  });
  document.getElementById("total-supply").textContent = supply.toLocaleString();
  document.getElementById("total-tax").textContent    = tax.toLocaleString();
  document.getElementById("total-amount").textContent = total.toLocaleString();
}

function resetForm(force) {
  if (!force && itemRows.length > 0) {
    if (!confirm("작성 중인 내용을 초기화할까요?")) return;
  }
  clearSelectedCustomer();
  ["f-invoice-id","f-invoice-no-stored","f-memo","customer-search","product-search"].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.value = "";
  });
  document.getElementById("f-date").value = todayStr();
  var rtEl = document.getElementById("f-receipt-type");
  if (rtEl) rtEl.value = "영수";
  document.getElementById("item-list").innerHTML =
    '<tr id="empty-row"><td colspan="9" style="text-align:center;padding:14px;color:#9ca3af">품목을 검색하여 추가하세요</td></tr>';
  itemRows=[]; rowCounter=0; currentPriceTier=1; currentCustomer=null;
  isDirty = false;
  setFormMode("new");
  updateTotals();
}

// ─────────────────────────────────────────
// 저장
// ─────────────────────────────────────────
function generateInvoiceNo() {
  var now = new Date();
  return "INV-" + now.getFullYear() + String(now.getMonth()+1).padStart(2,"0") + String(now.getDate()).padStart(2,"0") +
    "-" + String(now.getHours()).padStart(2,"0") + String(now.getMinutes()).padStart(2,"0") + String(now.getSeconds()).padStart(2,"0");
}

async function saveInvoice(status) {
  // 2-D: 더블클릭 방지
  if (isSaving) { toast("저장 중입니다...", "warning"); return; }

  var customerId   = document.getElementById("f-customer-id").value;
  var customerName = document.getElementById("f-customer-name").value;
  if (!customerId) { toast("거래처를 선택해주세요.", "warning"); return; }
  if (!itemRows.length) { toast("품목을 1개 이상 추가해주세요.", "warning"); return; }
  var invDate = document.getElementById("f-date").value;
  if (!invDate) { toast("거래일을 입력해주세요.", "warning"); return; }
  // 4-B: 미래 날짜 경고
  if (invDate > todayStr()) {
    if (!confirm("거래일이 오늘보다 미래입니다. 계속 저장하시겠습니까?")) return;
  }

  var supply  = parseMoney(document.getElementById("total-supply").textContent);
  var tax     = parseMoney(document.getElementById("total-tax").textContent);
  var total   = parseMoney(document.getElementById("total-amount").textContent);
  var existId = document.getElementById("f-invoice-id").value;
  var invoiceNo = existId ? document.getElementById("f-invoice-no-stored").value : generateInvoiceNo();
  var receiptType = (document.getElementById("f-receipt-type") || {}).value || "영수";

  var invoiceData = {
    invoice_no: invoiceNo, customer_id: parseInt(customerId), customer_name: customerName,
    invoice_date: invDate,
    supply_amount: supply, tax_amount: tax, total_amount: total,
    memo: document.getElementById("f-memo").value, status: status,
    receipt_type: receiptType,
  };

  // 2-D: 저장 중 버튼 비활성화
  isSaving = true;
  ["btn-save-draft","btn-save-issued"].forEach(function(btnId) {
    var btn = document.getElementById(btnId);
    if (btn) { btn.disabled = true; btn.textContent = "저장 중..."; }
  });

  try {
    var invId;
    if (existId) {
      await apiFetch(apiUrl("invoices") + "/" + existId, { method: "PATCH", body: JSON.stringify(invoiceData) });
      invId = existId;
    } else {
      var saved = await apiFetch(apiUrl("invoices"), { method: "POST", body: JSON.stringify(invoiceData) });
      invId = saved.Id;
      document.getElementById("f-invoice-id").value = invId;
      document.getElementById("f-invoice-no-stored").value = invoiceNo;
    }

    // 1-B: 편집 시 기존 items 삭제 후 재저장 (중복 방지)
    if (existId) {
      try {
        var oldItems = await apiFetch(apiUrl("items") + buildWhere("(invoice_id,eq,"+existId+")", "fields=Id&limit=200"));
        var oldIds = (oldItems.list || []).map(function(it) { return it.Id; });
        if (oldIds.length) {
          await apiFetch(API.base+"/api/v1/db/data/bulk/noco/"+API.projectId+"/"+API.tables.items,
            { method: "DELETE", body: JSON.stringify(oldIds.map(function(oid) { return { Id: oid }; })) });
        }
      } catch(e) { console.warn("기존 items 삭제 실패:", e); }
    }

    var itemsData = itemRows.map(function(id) {
      var taxableVal = document.getElementById("row-"+id+"-taxable").value;
      return {
        invoice_id:    invId,
        product_code:  document.getElementById("row-"+id+"-code").value,
        product_name:  document.getElementById("row-"+id+"-name").value,
        unit:          document.getElementById("row-"+id+"-unit").value,
        quantity:      parseFloat(document.getElementById("row-"+id+"-qty").value) || 0,
        unit_price:    parseFloat(document.getElementById("row-"+id+"-price").value) || 0,
        supply_amount: parseMoney(document.getElementById("row-"+id+"-supply").textContent),
        tax_amount:    parseMoney(document.getElementById("row-"+id+"-tax").textContent),
        total_amount:  parseFloat(document.getElementById("row-"+id+"-total").value) || 0,
        is_taxable:    taxableVal === "Y" ? "과세" : "면세",
      };
    });
    await apiFetch(API.base+"/api/v1/db/data/bulk/noco/"+API.projectId+"/"+API.tables.items,
      { method: "POST", body: JSON.stringify(itemsData) });

    pageLoaded.list = false;
    isDirty = false;

    if (status === "issued") {
      toast("발행 완료! 인쇄 창을 확인하세요.", "success");
      printInvoice(invoiceNo);
      setTimeout(function() { showPage("list"); }, 300);
    } else {
      toast("임시저장 완료!", "success");
      setFormMode("edit", invoiceNo);
    }
  } catch(e) {
    console.error(e);
    toast("저장 오류: " + e.message, "error");
  } finally {
    // 2-D: 저장 완료 후 버튼 복구
    isSaving = false;
    var draftBtn = document.getElementById("btn-save-draft");
    var issuedBtn = document.getElementById("btn-save-issued");
    if (draftBtn)  { draftBtn.disabled = false;  draftBtn.textContent = "임시저장"; }
    if (issuedBtn) { issuedBtn.disabled = false; issuedBtn.textContent = "발행 완료"; }
  }
}

// ─────────────────────────────────────────
// 인쇄
// ─────────────────────────────────────────
function buildInvoiceHtml(inv, items) {
  var c = companyInfo;
  var blankCount = Math.max(0, 6 - items.length);
  var rows = items.map(function(item, i) {
    return '<tr>' +
      '<td class="t-center">'+(i+1)+'</td>' +
      '<td>'+esc(item.product_name||"")+'</td>' +
      '<td class="t-center">'+esc(item.unit||"")+'</td>' +
      '<td class="t-right">'+(item.quantity||0).toLocaleString()+'</td>' +
      '<td class="t-right">'+(item.unit_price||0).toLocaleString()+'</td>' +
      '<td class="t-right">'+(item.supply_amount||0).toLocaleString()+'</td>' +
      '<td class="t-right">'+(item.tax_amount||0).toLocaleString()+'</td>' +
      '<td class="t-right">'+(item.total_amount||0).toLocaleString()+'</td>' +
    '</tr>';
  }).join("") + Array(blankCount).fill('<tr><td colspan="8" style="height:14px;border:1px solid #ccc"></td></tr>').join("");

  var logoSrc = _logoDataUrl || "images/company-logo.png";
  var stampSrc = _stampDataUrl || "images/company-stamp.jpg";
  return '<div class="inv-header">' +
    '<div class="inv-logo-wrap"><img src="' + logoSrc + '" class="inv-logo" alt="로고" onerror="this.style.display=\'none\'"></div>' +
    '<div class="inv-header-center">' +
      '<div class="inv-title">거 래 명 세 표</div>' +
      '<div class="inv-sub">( 공급받는자 보관용 )</div>' +
    '</div>' +
    '<div class="inv-logo-wrap"></div>' +
  '</div>' +
    '<table class="inv-meta-tbl"><tr>' +
      '<td>발행번호: <strong>'+esc(inv.invoice_no||"")+'</strong></td>' +
      '<td style="text-align:right">거래일자: <strong>'+esc(inv.invoice_date||"")+'</strong></td>' +
    '</tr></table>' +
    '<div class="inv-parties">' +
      '<div class="inv-party"><div class="inv-party-title">■ 공급자</div><table>' +
        '<tr><td>상호</td><td><strong>'+esc(c.company||"")+'</strong></td><td>사업자번호</td><td>'+esc(c.bizno||"")+'</td></tr>' +
        '<tr><td>대표자</td><td>'+esc(c.ceo||"")+'</td><td>업태/종목</td><td>'+esc((c.bizType||"")+"/"+(c.bizItem||""))+'</td></tr>' +
        '<tr><td>주소</td><td colspan="3">'+esc(c.address||"")+'</td></tr>' +
        '<tr><td>전화</td><td>'+esc(c.phone||"")+'</td><td>이메일</td><td>'+esc(c.email||"")+'</td></tr>' +
      '</table></div>' +
      '<div class="inv-party"><div class="inv-party-title">■ 공급받는자</div><table>' +
        '<tr><td>상호</td><td><strong>'+esc(inv.customer_name||"")+'</strong></td><td>사업자번호</td><td>'+esc(inv.customer_bizno||"")+'</td></tr>' +
        '<tr><td>담당자</td><td>'+esc(inv.manager||"")+'</td><td>연락처</td><td>'+esc(inv.customer_phone||"")+'</td></tr>' +
        '<tr><td>주소</td><td colspan="3">'+esc(inv.customer_address||"")+'</td></tr>' +
      '</table></div>' +
    '</div>' +
    '<table class="inv-items-table">' +
      '<thead><tr><th>No</th><th>품목명</th><th>단위</th><th>수량</th><th>단가</th><th>공급가액</th><th>세액</th><th>합계금액</th></tr></thead>' +
      '<tbody>'+rows+'</tbody>' +
    '</table>' +
    '<table class="inv-total-tbl"><tr>' +
      '<td>공급가액 합계</td><td><strong>'+(inv.supply_amount||0).toLocaleString()+'원</strong></td>' +
      '<td>세액 합계</td><td><strong>'+(inv.tax_amount||0).toLocaleString()+'원</strong></td>' +
      '<td class="inv-grand">합 계 금 액</td><td class="inv-grand"><strong>'+(inv.total_amount||0).toLocaleString()+'원</strong></td>' +
    '</tr></table>' +
    (inv.memo ? '<div class="inv-memo">비고: '+esc(inv.memo)+'</div>' : '') +
    '<div class="inv-sig">위 금액을 정히 ' + esc(inv.receipt_type||"영수(청구)") + '합니다.&nbsp;&nbsp;&nbsp;'+esc(inv.invoice_date||"")+'&nbsp;&nbsp;&nbsp;'+esc(c.company||"")+' 대표 '+esc(c.ceo||"")+
    '<div class="inv-stamp"><img src="' + stampSrc + '" class="inv-stamp-img" alt="직인" onerror="this.style.display=\'none\'"></div></div>';
}

// 인쇄 전 1페이지 자동 맞춤
window.addEventListener("beforeprint", function() {
  var el = document.getElementById("print-area");
  if (!el || !el.innerHTML.trim()) return;
  el.style.transform = "";
  el.style.width = "";
  // 실제 높이 측정 후 277mm(A4 - 여백 20mm) 초과 시 축소
  var maxPx = 277 * (96 / 25.4);
  if (el.scrollHeight > maxPx) {
    var scale = maxPx / el.scrollHeight;
    el.style.transform = "scale(" + scale.toFixed(4) + ")";
    el.style.transformOrigin = "top left";
    el.style.width = Math.round(100 / scale) + "%";
  }
});
window.addEventListener("afterprint", function() {
  var el = document.getElementById("print-area");
  if (el) { el.style.transform = ""; el.style.width = ""; }
});

function printInvoice(fixedNo) {
  // 2-D: 공급자 미설정 경고
  if (!companyInfo.company) {
    if (!confirm("공급자 정보가 설정되지 않았습니다.\n설정 없이 인쇄를 계속하시겠습니까?")) return;
  }
  var inv = {
    invoice_no: fixedNo || generateInvoiceNo(),
    invoice_date: document.getElementById("f-date").value,
    customer_name: document.getElementById("f-customer-name").value,
    customer_bizno: document.getElementById("f-customer-bizno").value,
    customer_address: document.getElementById("f-customer-addr").value,
    customer_phone: document.getElementById("f-customer-phone").value,
    manager: document.getElementById("f-customer-manager").value,
    supply_amount: parseMoney(document.getElementById("total-supply").textContent),
    tax_amount: parseMoney(document.getElementById("total-tax").textContent),
    total_amount: parseMoney(document.getElementById("total-amount").textContent),
    memo: document.getElementById("f-memo").value,
    receipt_type: (document.getElementById("f-receipt-type") || {}).value || "영수(청구)",
  };
  var items = itemRows.map(function(id) {
    return {
      product_name: document.getElementById("row-"+id+"-name").value,
      unit: document.getElementById("row-"+id+"-unit").value,
      quantity: parseFloat(document.getElementById("row-"+id+"-qty").value)||0,
      unit_price: parseFloat(document.getElementById("row-"+id+"-price").value)||0,
      supply_amount: parseMoney(document.getElementById("row-"+id+"-supply").textContent),
      tax_amount: parseMoney(document.getElementById("row-"+id+"-tax").textContent),
      total_amount: parseFloat(document.getElementById("row-"+id+"-total").value) || 0,
    };
  });
  document.getElementById("print-area").innerHTML = buildInvoiceHtml(inv, items);
  window.print();
}

async function printInvoiceById(invId) {
  try {
    var inv = await apiFetch(apiUrl("invoices") + "/" + invId);
    var itemsRes = await apiFetch(apiUrl("items") + buildWhere("(invoice_id,eq,"+invId+")", "limit=50"));
    document.getElementById("print-area").innerHTML = buildInvoiceHtml(inv, itemsRes.list||[]);
    window.print();
  } catch(e) { toast("불러오기 실패: " + e.message, "error"); }
}

// ─────────────────────────────────────────
// 상품 리스트 (페이지네이션 + 정렬)
// ─────────────────────────────────────────
var productListTimer;
var productCurrentQ = "";
var productCurrentOffset = 0;
var PRODUCT_PAGE_SIZE = 100;
var productSortCol = "product_code";
var productSortDir = 1; // 1=오름차순, -1=내림차순
var productListCache = {};

async function loadProductList(q, append) {
  clearTimeout(productListTimer);
  if (!append) {
    productCurrentQ = q;
    productCurrentOffset = 0;
  }
  var tbody = document.getElementById("product-list-body");
  if (!append) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:16px;color:#9ca3af">불러오는 중...</td></tr>';
  }

  var doLoad = async function() {
    try {
      var url;
      var q2 = productCurrentQ;
      var sortParam = (productSortDir > 0 ? "" : "-") + productSortCol;
      if (q2 && q2.trim().length > 0) {
        var trimQ = q2.trim();
        var where = "(name,like,%" + trimQ + "%)~or(product_code,like,%" + trimQ + "%)";
        url = apiUrl("products") + buildWhere(where, "limit="+PRODUCT_PAGE_SIZE+"&offset="+productCurrentOffset+"&sort="+sortParam+"&fields=Id,product_code,name,unit,price1,price2,price3,is_taxable,is_active");
      } else {
        url = apiUrl("products") + "?limit="+PRODUCT_PAGE_SIZE+"&offset="+productCurrentOffset+"&sort="+sortParam+"&fields=Id,product_code,name,unit,price1,price2,price3,is_taxable,is_active";
      }
      var res = await apiFetch(url);
      var list = res.list || [];
      var pageInfo = res.pageInfo || {};
      var total = pageInfo.totalRows || list.length;
      var isLast = pageInfo.isLastPage !== false;

      document.getElementById("product-list-count").textContent = total.toLocaleString() + "개";

      list.forEach(function(p) { productListCache[p.Id] = p; });
      var rowsHtml = list.map(function(p) {
        return '<tr>' +
          '<td>'+esc(p.product_code||"")+'</td>' +
          '<td>'+esc(p.name)+'</td>' +
          '<td>'+esc(p.unit||"")+'</td>' +
          '<td class="td-num">'+(p.price1||0).toLocaleString()+'</td>' +
          '<td class="td-num">'+(p.price2||0).toLocaleString()+'</td>' +
          '<td class="td-num">'+(p.price3||0).toLocaleString()+'</td>' +
          '<td>'+esc(p.is_taxable||"")+'</td>' +
          '<td>'+(p.is_active?"✅":"❌")+'</td>' +
          '<td class="td-center"><button class="btn-ghost btn-sm" onclick="openEditProduct('+p.Id+')">수정</button></td>' +
        '</tr>';
      }).join("");

      if (append) {
        // 기존 "더 보기" 행 제거 후 새 행 추가
        var moreRow = document.getElementById("product-more-row");
        if (moreRow) moreRow.remove();
        tbody.insertAdjacentHTML("beforeend", rowsHtml);
      } else {
        tbody.innerHTML = list.length ? rowsHtml
          : '<tr><td colspan="9" style="text-align:center;padding:20px;color:#9ca3af">결과 없음</td></tr>';
      }

      productCurrentOffset += list.length;
      var hasMore = !isLast && list.length === PRODUCT_PAGE_SIZE;
      var remaining = total - productCurrentOffset;
      if (hasMore) {
        tbody.insertAdjacentHTML("beforeend",
          '<tr id="product-more-row"><td colspan="9" style="text-align:center;padding:12px">' +
          '<button class="btn-outline" onclick="loadProductList(productCurrentQ, true)">'+
          '▼ 더 보기 (' + remaining.toLocaleString() + '개 더 있음)</button></td></tr>');
      }
    } catch(e) { console.error(e); tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:#dc2626">오류 발생</td></tr>'; }
  };

  if (q && q.trim().length > 0 && !append) {
    productListTimer = setTimeout(doLoad, 350);
  } else {
    doLoad();
  }
}

// 상품 목록 정렬
function sortProductList(col) {
  if (productSortCol === col) {
    productSortDir = productSortDir * -1;
  } else {
    productSortCol = col;
    productSortDir = 1;
  }
  // 헤더 아이콘 업데이트
  document.querySelectorAll("#page-products .sortable").forEach(function(th) {
    th.classList.remove("sort-asc", "sort-desc");
  });
  var clickedThs = document.querySelectorAll("#page-products .sortable");
  clickedThs.forEach(function(th) {
    if (th.getAttribute("onclick") && th.getAttribute("onclick").indexOf("'"+col+"'") >= 0) {
      th.classList.add(productSortDir > 0 ? "sort-asc" : "sort-desc");
    }
  });
  loadProductList(productCurrentQ);
}

// 상품 수정 모달 열기
async function openEditProduct(id) {
  var p = productListCache[id];
  if (!p) {
    try { p = await apiFetch(apiUrl("products") + "/" + id); productListCache[id] = p; }
    catch(e) { toast("불러오기 실패: " + e.message, "error"); return; }
  }
  document.getElementById("edit-prod-id").value       = p.Id;
  document.getElementById("edit-prod-code").value     = p.product_code || "";
  document.getElementById("edit-prod-name").value     = p.name || "";
  document.getElementById("edit-prod-alias").value    = p.alias || "";
  document.getElementById("edit-prod-category").value = p.category || "";
  document.getElementById("edit-prod-unit").value     = p.unit || "";
  document.getElementById("edit-prod-price1").value   = p.price1 || "";
  document.getElementById("edit-prod-price2").value   = p.price2 || "";
  document.getElementById("edit-prod-price3").value   = p.price3 || "";
  document.getElementById("edit-prod-price4").value   = p.price4 || "";
  document.getElementById("edit-prod-price5").value   = p.price5 || "";
  document.getElementById("edit-prod-price6").value   = p.price6 || "";
  document.getElementById("edit-prod-price7").value   = p.price7 || "";
  document.getElementById("edit-prod-price8").value   = p.price8 || "";
  document.getElementById("edit-prod-taxable").value  = p.is_taxable || "과세";
  document.getElementById("edit-prod-active").value   = p.is_active ? "true" : "false";
  openModal("modal-edit-product");
}

// 상품 수정 저장
async function saveEditProduct() {
  var id = document.getElementById("edit-prod-id").value;
  if (!id) return;
  var data = {
    product_code: document.getElementById("edit-prod-code").value.trim(),
    name:         document.getElementById("edit-prod-name").value.trim(),
    alias:        document.getElementById("edit-prod-alias").value.trim(),
    category:     document.getElementById("edit-prod-category").value.trim(),
    unit:         document.getElementById("edit-prod-unit").value.trim(),
    price1:       parseFloat(document.getElementById("edit-prod-price1").value) || null,
    price2:       parseFloat(document.getElementById("edit-prod-price2").value) || null,
    price3:       parseFloat(document.getElementById("edit-prod-price3").value) || null,
    price4:       parseFloat(document.getElementById("edit-prod-price4").value) || null,
    price5:       parseFloat(document.getElementById("edit-prod-price5").value) || null,
    price6:       parseFloat(document.getElementById("edit-prod-price6").value) || null,
    price7:       parseFloat(document.getElementById("edit-prod-price7").value) || null,
    price8:       parseFloat(document.getElementById("edit-prod-price8").value) || null,
    is_taxable:   document.getElementById("edit-prod-taxable").value,
    is_active:    document.getElementById("edit-prod-active").value === "true",
  };
  if (!data.name) { toast("품목명을 입력하세요.", "warning"); return; }
  try {
    await apiFetch(apiUrl("products") + "/" + id, { method: "PATCH", body: JSON.stringify(data) });
    delete productListCache[id];
    closeModal("modal-edit-product");
    toast("상품 정보가 수정되었습니다.", "success");
    loadProductList(productCurrentQ);
  } catch(e) { toast("저장 오류: " + e.message, "error"); }
}

// 신상품 추가
async function saveNewProduct() {
  var data = {
    product_code: v("new-product-code"),
    name: v("new-product-name"),
    alias: v("new-product-alias"),
    category: v("new-product-category"),
    unit: v("new-product-unit"),
    price1: parseFloat(v("new-product-price1")) || null,
    price2: parseFloat(v("new-product-price2")) || null,
    price3: parseFloat(v("new-product-price3")) || null,
    is_taxable: v("new-product-taxable") || "과세",
    is_active: true,
  };
  if (!data.name) { toast("품목명을 입력하세요.", "warning"); return; }
  try {
    await apiFetch(apiUrl("products"), { method: "POST", body: JSON.stringify(data) });
    closeModal("modal-new-product");
    toast("상품이 추가되었습니다.", "success");
    pageLoaded.products = false;
    loadProductList(document.getElementById("product-list-search").value);
  } catch(e) { toast("저장 오류: " + e.message, "error"); }
}

// ─────────────────────────────────────────
// 고객 리스트 (페이지네이션 + 정렬)
// ─────────────────────────────────────────
var customerListTimer2;
var customerCurrentQ = "";
var customerCurrentOffset = 0;
var CUSTOMER_PAGE_SIZE = 100;
var customerSortCol = "legacy_id";
var customerSortDir = 1; // 1=오름차순, -1=내림차순
var customerListCache = {};

async function loadCustomerList(q, append) {
  clearTimeout(customerListTimer2);
  if (!append) {
    customerCurrentQ = q;
    customerCurrentOffset = 0;
  }
  var tbody = document.getElementById("customer-list-body");
  if (!append) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:16px;color:#9ca3af">불러오는 중...</td></tr>';
  }

  var doLoad = async function() {
    try {
      var q2 = customerCurrentQ;
      var url;
      var custSortParam = (customerSortDir > 0 ? "" : "-") + customerSortCol;
      if (q2 && q2.trim().length > 0) {
        var trimQ = q2.trim();
        var where = "(name,like,%"+trimQ+"%)~or(book_name,like,%"+trimQ+"%)~or(phone1,like,%"+trimQ+"%)~or(mobile,like,%"+trimQ+"%)";
        url = apiUrl("customers") + buildWhere(where, "limit="+CUSTOMER_PAGE_SIZE+"&offset="+customerCurrentOffset+"&sort="+custSortParam+"&fields=Id,legacy_id,name,phone1,mobile,email,address1,price_tier,partner_grade");
      } else {
        url = apiUrl("customers") + "?limit="+CUSTOMER_PAGE_SIZE+"&offset="+customerCurrentOffset+"&sort="+custSortParam+"&fields=Id,legacy_id,name,phone1,mobile,email,address1,price_tier,partner_grade";
      }
      var res = await apiFetch(url);
      var list = res.list || [];
      var pageInfo = res.pageInfo || {};
      var total = pageInfo.totalRows || list.length;
      var isLast = pageInfo.isLastPage !== false;

      document.getElementById("customer-list-count").textContent = total.toLocaleString() + "명";

      list.forEach(function(c) { customerListCache[c.Id] = c; });
      var rowsHtml = list.map(function(c) {
        return '<tr onclick="startInvoiceForCustomer(' + c.Id + ')" style="cursor:pointer" title="클릭: 이 고객으로 거래명세표 작성">' +
          '<td>'+( c.legacy_id||c.Id)+'</td>' +
          '<td><strong>'+esc(c.name||"")+'</strong></td>' +
          '<td>'+esc(c.phone1||c.mobile||"")+'</td>' +
          '<td>'+esc(c.email||"")+'</td>' +
          '<td>'+esc(c.address1||"")+'</td>' +
          '<td class="td-center">'+(c.price_tier||1)+'</td>' +
          '<td>'+esc(c.partner_grade||"")+'</td>' +
          '<td class="td-center" onclick="event.stopPropagation()"><button class="btn-ghost btn-sm" onclick="openEditCustomer('+c.Id+')">수정</button></td>' +
        '</tr>';
      }).join("");

      if (append) {
        var moreRow = document.getElementById("customer-more-row");
        if (moreRow) moreRow.remove();
        tbody.insertAdjacentHTML("beforeend", rowsHtml);
      } else {
        tbody.innerHTML = list.length ? rowsHtml
          : '<tr><td colspan="8" style="text-align:center;padding:20px;color:#9ca3af">결과 없음</td></tr>';
      }

      customerCurrentOffset += list.length;
      var hasMore = !isLast && list.length === CUSTOMER_PAGE_SIZE;
      var remaining = total - customerCurrentOffset;
      if (hasMore) {
        tbody.insertAdjacentHTML("beforeend",
          '<tr id="customer-more-row"><td colspan="8" style="text-align:center;padding:12px">' +
          '<button class="btn-outline" onclick="loadCustomerList(customerCurrentQ, true)">'+
          '▼ 더 보기 (' + remaining.toLocaleString() + '명 더 있음)</button></td></tr>');
      }
    } catch(e) { console.error(e); tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:#dc2626">오류 발생</td></tr>'; }
  };

  if (q && q.trim().length > 0 && !append) {
    customerListTimer2 = setTimeout(doLoad, 350);
  } else {
    doLoad();
  }
}

// 고객 목록 정렬
function sortCustomerList(col) {
  if (customerSortCol === col) {
    customerSortDir = customerSortDir * -1;
  } else {
    customerSortCol = col;
    customerSortDir = 1;
  }
  document.querySelectorAll("#page-customers .sortable").forEach(function(th) {
    th.classList.remove("sort-asc", "sort-desc");
  });
  document.querySelectorAll("#page-customers .sortable").forEach(function(th) {
    if (th.getAttribute("onclick") && th.getAttribute("onclick").indexOf("'"+col+"'") >= 0) {
      th.classList.add(customerSortDir > 0 ? "sort-asc" : "sort-desc");
    }
  });
  loadCustomerList(customerCurrentQ);
}

// 고객 수정 모달 열기
async function openEditCustomer(id) {
  var c = customerListCache[id];
  if (!c) {
    try { c = await apiFetch(apiUrl("customers") + "/" + id); customerListCache[id] = c; }
    catch(e) { toast("불러오기 실패: " + e.message, "error"); return; }
  }
  document.getElementById("edit-cust-id").value           = c.Id;
  document.getElementById("edit-cust-name").value         = c.name || "";
  document.getElementById("edit-cust-phone").value        = c.phone1 || "";
  document.getElementById("edit-cust-mobile").value       = c.mobile || "";
  document.getElementById("edit-cust-email").value        = c.email || "";
  // 다중 주소 복원
  var editExtras = [];
  try { editExtras = JSON.parse(c.extra_addresses || "[]"); } catch(e) {}
  var editAddrs = [c.address1].concat(editExtras).filter(Boolean);
  setAddrList("edit-addr-list", editAddrs);
  document.getElementById("edit-cust-bizno").value        = c.business_no || "";
  document.getElementById("edit-cust-ceo").value          = c.ceo_name || "";
  document.getElementById("edit-cust-tier").value         = String(c.price_tier || 1);
  document.getElementById("edit-cust-partner-grade").value = c.partner_grade || "";
  document.getElementById("edit-cust-memo").value         = c.memo || "";
  openModal("modal-edit-customer");
}

// 고객 수정 저장
async function saveEditCustomer() {
  var id = document.getElementById("edit-cust-id").value;
  if (!id) return;
  var data = {
    name:          document.getElementById("edit-cust-name").value.trim(),
    book_name:     document.getElementById("edit-cust-name").value.trim(),
    phone1:        document.getElementById("edit-cust-phone").value.trim(),
    mobile:        document.getElementById("edit-cust-mobile").value.trim(),
    email:         document.getElementById("edit-cust-email").value.trim(),
    address1:      (getAddrList("edit-addr-list")[0] || ""),
    extra_addresses: JSON.stringify(getAddrList("edit-addr-list").slice(1)),
    business_no:   document.getElementById("edit-cust-bizno").value.trim(),
    ceo_name:      document.getElementById("edit-cust-ceo").value.trim(),
    price_tier:    parseInt(document.getElementById("edit-cust-tier").value) || 1,
    partner_grade: document.getElementById("edit-cust-partner-grade").value.trim(),
    memo:          document.getElementById("edit-cust-memo").value.trim(),
  };
  if (!data.name) { toast("거래처명을 입력하세요.", "warning"); return; }
  try {
    await apiFetch(apiUrl("customers") + "/" + id, { method: "PATCH", body: JSON.stringify(data) });
    delete customerListCache[id];
    closeModal("modal-edit-customer");
    toast("고객 정보가 수정되었습니다.", "success");
    loadCustomerList(customerCurrentQ);
  } catch(e) { toast("저장 오류: " + e.message, "error"); }
}

// 4-F: 고객 목록에서 클릭 → 거래명세표 작성 이동 (캐시 통합)
function startInvoiceForCustomer(id) {
  // customerCache (검색) 또는 customerListCache (목록) 둘 다 확인
  var c = customerCache[id] || customerListCache[id];
  if (c) {
    customerCache[id] = c; // 검색 캐시에도 저장
    showPage("new");
    setTimeout(function() { selectCustomer(id); }, 200);
    return;
  }
  // 캐시에 없으면 API로 조회 후 이동
  apiFetch(apiUrl("customers") + "/" + id).then(function(data) {
    customerCache[id] = data;
    showPage("new");
    setTimeout(function() { selectCustomer(id); }, 200);
  }).catch(function() {
    showPage("new");
  });
}

// 신규 고객 추가
async function saveNewCustomer() {
  var data = {
    name: v("new-cust-name"),
    book_name: v("new-cust-name"),
    phone1: v("new-cust-phone"),
    mobile: v("new-cust-mobile"),
    email: v("new-cust-email"),
    address1:        getAddrList("new-addr-list")[0] || "",
    extra_addresses: JSON.stringify(getAddrList("new-addr-list").slice(1)),
    business_no: v("new-cust-bizno"),
    ceo_name: v("new-cust-ceo"),
    price_tier: parseInt(v("new-cust-tier")) || 1,
    memo: v("new-cust-memo"),
    is_active: true,
  };
  if (!data.name) { toast("거래처명을 입력하세요.", "warning"); return; }
  try {
    await apiFetch(apiUrl("customers"), { method: "POST", body: JSON.stringify(data) });
    closeModal("modal-new-customer");
    toast("고객이 추가되었습니다.", "success");
    pageLoaded.customers = false;
    loadCustomerList(document.getElementById("customer-list-search").value);
  } catch(e) { toast("저장 오류: " + e.message, "error"); }
}

// ─────────────────────────────────────────
// 모달
// ─────────────────────────────────────────
// ─────────────────────────────────────────
// 4-C: 모달 폼 초기화
// ─────────────────────────────────────────
function clearNewProductForm() {
  ["new-product-code","new-product-name","new-product-alias","new-product-category","new-product-unit",
   "new-product-price1","new-product-price2","new-product-price3"].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.value = "";
  });
  var taxEl = document.getElementById("new-product-taxable");
  if (taxEl) taxEl.value = "과세";
}

function clearNewCustomerForm() {
  ["new-cust-name","new-cust-phone","new-cust-mobile","new-cust-email",
   "new-cust-bizno","new-cust-ceo","new-cust-memo"].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.value = "";
  });
  setAddrList("new-addr-list", []);
  var tierEl = document.getElementById("new-cust-tier");
  if (tierEl) tierEl.value = "1";
}

// 3-D: 모달 애니메이션 (show 클래스 방식) + 외부 클릭 닫기
function openModal(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.style.display = "flex";
  requestAnimationFrame(function() { el.classList.add("show"); });
}
function closeModal(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("show");
  setTimeout(function() { el.style.display = "none"; }, 200);
}

// 모달 외부 클릭 닫기
document.addEventListener("click", function(e) {
  if (e.target.classList.contains("modal-overlay")) {
    closeModal(e.target.id);
  }
});

// Esc 키로 모달 닫기
document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal-overlay").forEach(function(m) {
      if (m.style.display === "flex") closeModal(m.id);
    });
    hideAc("customer-ac");
    hideAc("product-ac");
  }
  // Ctrl+Enter: 발행 완료 (작성 페이지에서)
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    var newPage = document.getElementById("page-new");
    if (newPage && newPage.classList.contains("active")) {
      e.preventDefault();
      saveInvoice("issued");
    }
  }
});

// ─────────────────────────────────────────
// 2-B: 품목 검색 팝업 모달
// ─────────────────────────────────────────
var pickerTargetRowId = null;
var pickerCurrentPage = 0;
var PICKER_PAGE_SIZE  = 20;

function openProductPicker(rowId) {
  pickerTargetRowId = rowId;
  pickerCurrentPage = 0;
  var qEl = document.getElementById("picker-search");
  var catEl = document.getElementById("picker-category");
  if (qEl) qEl.value = "";
  if (catEl && catEl.tagName === "SELECT") catEl.value = "";
  openModal("modal-product-picker");
  loadPickerCategories();
  loadPickerList("", "", 0);
  setTimeout(function() { if (qEl) qEl.focus(); }, 100);
}

async function loadPickerCategories() {
  var catEl = document.getElementById("picker-category");
  if (!catEl || catEl.tagName !== "SELECT") return;
  try {
    var res = await apiFetch(apiUrl("products") + "?limit=2000&fields=category");
    var cats = (res.list || []).map(function(p) { return (p.category || "").trim(); }).filter(Boolean);
    var unique = [];
    cats.forEach(function(c) { if (unique.indexOf(c) < 0) unique.push(c); });
    unique.sort();
    catEl.innerHTML = '<option value="">전체 카테고리</option>' +
      unique.map(function(c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join("");
  } catch(e) { console.error("카테고리 로드 오류", e); }
}

async function loadPickerList(query, category, page) {
  pickerCurrentPage = page;
  var tbody = document.getElementById("picker-list-body");
  if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:12px;color:#9ca3af">검색 중...</td></tr>';
  try {
    var conditions = [];
    if (query && query.trim()) {
      var q = query.trim();
      conditions.push("(name,like,%"+q+"%)~or(product_code,like,%"+q+"%)~or(alias,like,%"+q+"%)");
    }
    if (category && category.trim()) {
      conditions.push("(category,eq,"+category.trim()+")");
    }
    var params = "limit="+PICKER_PAGE_SIZE+"&offset="+(page*PICKER_PAGE_SIZE)+
      "&fields=Id,product_code,name,unit,price1,price2,price3,is_taxable,is_active,category";
    var url = conditions.length
      ? apiUrl("products") + buildWhere(conditions.join("~and"), params)
      : apiUrl("products") + "?" + params;
    var res = await apiFetch(url);
    var list = res.list || [];
    var total = (res.pageInfo || {}).totalRows || list.length;

    var totalEl = document.getElementById("picker-total");
    if (totalEl) totalEl.textContent = "총 " + total.toLocaleString() + "개";

    list.forEach(function(p) { productCache[p.Id] = p; });

    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:16px;color:#9ca3af">결과 없음</td></tr>';
    } else {
      tbody.innerHTML = list.map(function(p) {
        var price = getPriceByTier(p, currentPriceTier);
        return '<tr>' +
          '<td>'+esc(p.product_code||"")+'</td>' +
          '<td>'+esc(p.name)+'</td>' +
          '<td>'+esc(p.unit||"")+'</td>' +
          '<td class="td-num">'+(price ? price.toLocaleString()+"원" : "-")+'</td>' +
          '<td class="td-center"><button class="btn-primary btn-sm" onclick="pickerSelect('+p.Id+')">+</button></td>' +
        '</tr>';
      }).join("");
    }

    // 페이지네이션
    var pageEl = document.getElementById("picker-pagination");
    if (pageEl) {
      var totalPages = Math.ceil(total / PICKER_PAGE_SIZE);
      var btns = "";
      if (page > 0) btns += '<button class="btn-outline btn-sm" onclick="loadPickerList(document.getElementById(\'picker-search\').value, document.getElementById(\'picker-category\').value, '+(page-1)+')">◀ 이전</button> ';
      btns += '<span style="font-size:12px;color:#6b7280">'+(page+1)+'/'+totalPages+'</span>';
      if (page < totalPages - 1) btns += ' <button class="btn-outline btn-sm" onclick="loadPickerList(document.getElementById(\'picker-search\').value, document.getElementById(\'picker-category\').value, '+(page+1)+')">다음 ▶</button>';
      pageEl.innerHTML = btns;
    }
  } catch(e) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:12px;color:#dc2626">오류: '+esc(e.message)+'</td></tr>';
  }
}

function pickerSelect(productId) {
  var p = productCache[productId];
  if (!p) return;
  var isTax = (p.is_taxable || "").indexOf("과세") >= 0;
  var price = getPriceByTier(p, currentPriceTier);
  if (pickerTargetRowId != null) {   // undefined도 null처럼 처리 (loose equality)
    // 기존 행에 값 채우기
    var nameEl  = document.getElementById("row-"+pickerTargetRowId+"-name");
    var codeEl  = document.getElementById("row-"+pickerTargetRowId+"-code");
    var unitEl  = document.getElementById("row-"+pickerTargetRowId+"-unit");
    var priceEl = document.getElementById("row-"+pickerTargetRowId+"-price");
    var taxEl   = document.getElementById("row-"+pickerTargetRowId+"-taxable");
    if (nameEl)  nameEl.value  = p.name;
    if (codeEl)  codeEl.value  = p.product_code || "";
    if (unitEl)  unitEl.value  = p.unit || "";
    if (priceEl) priceEl.value = price || 0;
    if (taxEl)   taxEl.value   = isTax ? "Y" : "N";
    recalcRowFromPrice(pickerTargetRowId);
  } else {
    // 새 행 추가
    addRow({ productCode: p.product_code || "", productName: p.name,
      unit: p.unit || "", qty: 1, unitPrice: price, isTaxable: isTax });
  }
  closeModal("modal-product-picker");
  toast(esc(p.name) + " 추가됨", "success");
}

// ─────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────
function esc(s) {
  return String(s||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function parseMoney(s) { return parseInt(String(s||"0").replace(/,/g,"")) || 0; }
function todayStr() {
  var d = new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}

// ─────────────────────────────────────────
// 공급사(매입처) 관리
// ─────────────────────────────────────────
var supplierCurrentQ = "";
var supplierCurrentOffset = 0;
var SUPPLIER_PAGE_SIZE = 100;
var supplierListTimer;

function supplierApiUrl() {
  if (!API.tables.suppliers) return null;
  return API.base + "/api/v1/db/data/noco/" + API.projectId + "/" + API.tables.suppliers;
}

async function loadSupplierList(q, append) {
  clearTimeout(supplierListTimer);
  if (!append) {
    supplierCurrentQ = q;
    supplierCurrentOffset = 0;
  }
  var url = supplierApiUrl();
  if (!url) {
    var tbody = document.getElementById("supplier-list-body");
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#ef4444">⚠️ 설정 &gt; 공급사 테이블 ID를 입력하세요.</td></tr>';
    return;
  }
  var trimQ = (q || "").trim();
  if (trimQ) {
    var where = "(name,like,%" + trimQ + "%)~or(phone1,like,%" + trimQ + "%)";
    url += buildWhere(where, "limit=" + SUPPLIER_PAGE_SIZE + "&offset=" + supplierCurrentOffset + "&sort=name");
  } else {
    url += "?limit=" + SUPPLIER_PAGE_SIZE + "&offset=" + supplierCurrentOffset + "&sort=name";
  }
  try {
    var res = await apiFetch(url);
    var list = res.list || [];
    var total = (res.pageInfo || {}).totalRows || 0;
    var countEl = document.getElementById("supplier-list-count");
    if (countEl) countEl.textContent = "총 " + total + "건";
    var tbody = document.getElementById("supplier-list-body");
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#9ca3af">등록된 공급사가 없습니다.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function(s) {
      return '<tr>' +
        '<td>' + esc(s.name || "") + '</td>' +
        '<td>' + esc(s.business_no || "") + '</td>' +
        '<td>' + esc(s.phone1 || s.mobile || "") + '</td>' +
        '<td>' + esc(s.email || "") + '</td>' +
        '<td>' + esc(s.address1 || "") + '</td>' +
        '<td style="white-space:nowrap">' +
          '<button class="btn-ghost btn-sm" onclick="openEditSupplier(' + s.Id + ')">수정</button>' +
          '<button class="btn-danger btn-sm" style="margin-left:4px" onclick="deleteSupplier(' + s.Id + ')">삭제</button>' +
        '</td>' +
      '</tr>';
    }).join("");
  } catch(e) {
    var tbody2 = document.getElementById("supplier-list-body");
    if (tbody2) tbody2.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#ef4444;padding:20px">불러오기 실패: ' + esc(e.message) + '</td></tr>';
  }
}

var supplierCache = {};

async function openEditSupplier(id) {
  var url = supplierApiUrl();
  if (!url) return;
  try {
    var s = await apiFetch(url + "/" + id);
    supplierCache[id] = s;
    document.getElementById("edit-sup-id").value   = s.Id;
    document.getElementById("edit-sup-name").value  = s.name || "";
    document.getElementById("edit-sup-bizno").value = s.business_no || "";
    document.getElementById("edit-sup-ceo").value   = s.ceo_name || "";
    document.getElementById("edit-sup-phone").value = s.phone1 || "";
    document.getElementById("edit-sup-mobile").value= s.mobile || "";
    document.getElementById("edit-sup-email").value = s.email || "";
    document.getElementById("edit-sup-addr").value  = s.address1 || "";
    document.getElementById("edit-sup-bank").value  = s.bank_name || "";
    document.getElementById("edit-sup-account").value = s.bank_account || "";
    document.getElementById("edit-sup-memo").value  = s.memo || "";
    openModal("modal-edit-supplier");
  } catch(e) { toast("불러오기 실패: " + e.message, "error"); }
}

async function saveEditSupplier() {
  var id = document.getElementById("edit-sup-id").value;
  if (!id) return;
  var url = supplierApiUrl();
  if (!url) return;
  var data = {
    name:         document.getElementById("edit-sup-name").value.trim(),
    business_no:  document.getElementById("edit-sup-bizno").value.trim(),
    ceo_name:     document.getElementById("edit-sup-ceo").value.trim(),
    phone1:       document.getElementById("edit-sup-phone").value.trim(),
    mobile:       document.getElementById("edit-sup-mobile").value.trim(),
    email:        document.getElementById("edit-sup-email").value.trim(),
    address1:     document.getElementById("edit-sup-addr").value.trim(),
    bank_name:    document.getElementById("edit-sup-bank").value.trim(),
    bank_account: document.getElementById("edit-sup-account").value.trim(),
    memo:         document.getElementById("edit-sup-memo").value.trim(),
  };
  if (!data.name) { toast("거래처명을 입력하세요.", "warning"); return; }
  try {
    await apiFetch(url + "/" + id, { method: "PATCH", body: JSON.stringify(data) });
    closeModal("modal-edit-supplier");
    toast("공급사 정보가 수정되었습니다.", "success");
    loadSupplierList(supplierCurrentQ);
  } catch(e) { toast("저장 오류: " + e.message, "error"); }
}

async function saveNewSupplier() {
  var url = supplierApiUrl();
  if (!url) { toast("설정에서 공급사 테이블 ID를 먼저 입력하세요.", "error"); return; }
  var data = {
    name:         v("new-sup-name"),
    business_no:  v("new-sup-bizno"),
    ceo_name:     v("new-sup-ceo"),
    phone1:       v("new-sup-phone"),
    mobile:       v("new-sup-mobile"),
    email:        v("new-sup-email"),
    address1:     v("new-sup-addr"),
    bank_name:    v("new-sup-bank"),
    bank_account: v("new-sup-account"),
    memo:         v("new-sup-memo"),
    is_active:    true,
  };
  if (!data.name) { toast("거래처명을 입력하세요.", "warning"); return; }
  try {
    await apiFetch(url, { method: "POST", body: JSON.stringify(data) });
    closeModal("modal-new-supplier");
    toast("공급사가 추가되었습니다.", "success");
    loadSupplierList(supplierCurrentQ);
  } catch(e) { toast("저장 오류: " + e.message, "error"); }
}

async function deleteSupplier(id) {
  if (!confirm("이 공급사를 삭제하시겠습니까?")) return;
  var url = supplierApiUrl();
  if (!url) return;
  try {
    await apiFetch(url + "/" + id, { method: "DELETE" });
    toast("삭제되었습니다.", "success");
    loadSupplierList(supplierCurrentQ);
  } catch(e) { toast("삭제 실패: " + e.message, "error"); }
}

function clearNewSupplierForm() {
  ["new-sup-name","new-sup-bizno","new-sup-ceo","new-sup-phone","new-sup-mobile",
   "new-sup-email","new-sup-addr","new-sup-bank","new-sup-account","new-sup-memo"].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.value = "";
  });
}

// ─────────────────────────────────────────
// 초기화
// ─────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function() {
  loadSettings();
  // 인쇄 이미지 미리 data URL로 변환 (PDF 준비중 방지)
  _fetchDataUrl("images/company-logo.png", function(u) { _logoDataUrl = u; });
  _fetchDataUrl("images/company-stamp.jpg", function(u) { _stampDataUrl = u; });
  document.getElementById("f-date").value = todayStr();
  var now = new Date();
  var firstDay = now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-01";
  var el1 = document.getElementById("report-from"); if (el1) el1.value = firstDay;
  var el2 = document.getElementById("report-to");   if (el2) el2.value = todayStr();
  loadDashboard();
});
