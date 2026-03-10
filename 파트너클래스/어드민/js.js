/**
 * PRESSCO21 파트너클래스 관리자 대시보드
 * 페이지 ID: 8011
 * CSS 스코핑: .admin-dashboard
 * 메이크샵 D4 호환: IIFE, var, \${} 이스케이프
 */
(function() {
    'use strict';

    /* ========================================
       설정값
       ======================================== */
    var ADMIN_API_URL = 'https://n8n.pressco21.com/webhook/admin-api';
    var SETTLEMENT_API_URL = 'https://n8n.pressco21.com/webhook/settlement-batch';
    // 관리자 그룹명 목록 (메이크샵 회원등급명과 일치해야 함)
    var ADMIN_GROUP_NAMES = ['관리자', '운영자', '대표'];
    // 관리자 그룹 레벨 하한선
    var ADMIN_MIN_GROUP_LEVEL = 9;
    // API 인증 토큰 (이 페이지는 관리자만 접근 가능하므로 프론트 노출 허용)
    var ADMIN_TOKEN = 'pressco21-admin-2026';
    // 로컬 preview 환경에서 협회 제안서 fixture 경로
    var AFFILIATION_PROPOSAL_PREVIEW_PATH = '/output/playwright/fixtures/partnerclass/affiliation-proposal.html';

    /* ========================================
       상태 관리
       ======================================== */
    var currentTab = 'applications';
    var isLoading = false;
    var memberId = '';
    var groupName = '';
    var groupLevel = '';
    var modalCallback = null;
    var selectedSettlements = {};
    var affiliationRecords = [];

    function normalizeClassFilterStatus(status) {
        var value = String(status || '').toUpperCase().trim();
        if (!value || value === 'INACTIVE' || value === 'PENDING') return 'PENDING_REVIEW';
        if (value === 'ACTIVE') return 'ACTIVE';
        if (value === 'PAUSED') return 'PAUSED';
        if (value === 'CLOSED') return 'REJECTED';
        if (value === 'REJECTED') return 'REJECTED';
        if (value === 'ARCHIVED') return 'ARCHIVED';
        return value;
    }

    /* ========================================
       초기화
       ======================================== */
    function init() {
        // 가상태그에서 회원 정보 추출
        var memberEl = document.getElementById('adMemberId');
        var groupEl = document.getElementById('adGroupName');
        var levelEl = document.getElementById('adGroupLevel');

        memberId = (memberEl ? memberEl.textContent : '').trim();
        groupName = (groupEl ? groupEl.textContent : '').trim();
        groupLevel = (levelEl ? levelEl.textContent : '').trim();

        // 관리자 권한 검증
        if (!memberId || !isAdmin()) {
            document.getElementById('adUnauthorized').style.display = '';
            return;
        }

        // 인증 성공: UI 전환
        document.getElementById('adUnauthorized').style.display = 'none';
        document.getElementById('adMain').style.display = '';

        bindTabs();
        bindModal();
        bindFilters();
        bindSettlementControls();
        bindProposalBuilder();
        loadSummary();
        loadTab('applications');
    }

    /**
     * 관리자 여부 확인
     */
    function isAdmin() {
        var numericGroupLevel = Number(String(groupLevel || '').replace(/[^\d]/g, ''));
        for (var i = 0; i < ADMIN_GROUP_NAMES.length; i++) {
            if (groupName === ADMIN_GROUP_NAMES[i]) return true;
        }
        if (!isNaN(numericGroupLevel) && numericGroupLevel >= ADMIN_MIN_GROUP_LEVEL) {
            return true;
        }
        return false;
    }

    /* ========================================
       API 호출 헬퍼
       ======================================== */
    function adminFetch(payload, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', ADMIN_API_URL, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', 'Bearer ' + ADMIN_TOKEN);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                var resp = null;
                try { resp = JSON.parse(xhr.responseText); } catch(e) {}
                callback(xhr.status, resp);
            }
        };
        xhr.send(JSON.stringify(payload));
    }

    function settlementFetch(payload, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', SETTLEMENT_API_URL, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', 'Bearer ' + ADMIN_TOKEN);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                var resp = null;
                try { resp = JSON.parse(xhr.responseText); } catch(e) {}
                callback(xhr.status, resp);
            }
        };
        xhr.send(JSON.stringify(payload));
    }

    /* ========================================
       탭 전환
       ======================================== */
    function bindTabs() {
        var btns = document.querySelectorAll('.admin-dashboard .ad-tabs__btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].addEventListener('click', function() {
                var tab = this.getAttribute('data-tab');
                switchTab(tab);
            });
        }
    }

    function switchTab(tab) {
        currentTab = tab;

        // 탭 버튼 active
        var btns = document.querySelectorAll('.admin-dashboard .ad-tabs__btn');
        for (var i = 0; i < btns.length; i++) {
            var isActive = btns[i].getAttribute('data-tab') === tab;
            btns[i].classList.toggle('ad-tabs__btn--active', isActive);
            btns[i].setAttribute('aria-selected', isActive ? 'true' : 'false');
        }

        // 패널 표시/숨김
        var panels = ['Applications', 'Classes', 'Settlements', 'Affiliations'];
        for (var j = 0; j < panels.length; j++) {
            var panelId = 'panel' + panels[j];
            var el = document.getElementById(panelId);
            if (el) {
                el.style.display = (panels[j].toLowerCase() === tab) ? '' : 'none';
            }
        }

        loadTab(tab);
    }

    /* ========================================
       필터 바인딩
       ======================================== */
    function bindFilters() {
        var filterApp = document.getElementById('filterAppStatus');
        var filterClass = document.getElementById('filterClassStatus');
        var filterSettle = document.getElementById('filterSettlementStatus');

        if (filterApp) {
            filterApp.addEventListener('change', function() {
                loadApplications(this.value);
            });
        }
        if (filterClass) {
            filterClass.addEventListener('change', function() {
                loadPendingClasses(this.value);
            });
        }
        if (filterSettle) {
            filterSettle.addEventListener('change', function() {
                loadSettlements(this.value);
            });
        }
    }

    /* ========================================
       데이터 로드
       ======================================== */
    function loadSummary() {
        // 3개 요약 카드 데이터 로드 (병렬)
        adminFetch({ action: 'getApplications', status: 'PENDING', page: 1, limit: 1 }, function(status, resp) {
            if (resp && resp.success) {
                updateSummaryCard('Applications', resp.data.total || 0);
            }
        });
        adminFetch({ action: 'getPendingClasses', page: 1, limit: 1 }, function(status, resp) {
            if (resp && resp.success) {
                updateSummaryCard('Classes', resp.data.total || 0);
            }
        });
        adminFetch({ action: 'getSettlements', status: 'PENDING_SETTLEMENT', page: 1, limit: 1 }, function(status, resp) {
            if (resp && resp.success) {
                updateSummaryCard('Settlements', resp.data.total || 0);
            }
        });
    }

    function updateSummaryCard(type, count) {
        var countEl = document.getElementById('count' + type);
        var badgeEl = document.getElementById('badge' + type);
        if (countEl) countEl.textContent = count;
        if (badgeEl) {
            badgeEl.textContent = count > 0 ? count : '';
            badgeEl.style.display = count > 0 ? '' : 'none';
        }
    }

    function loadTab(tab) {
        switch(tab) {
            case 'applications':
                var filterApp = document.getElementById('filterAppStatus');
                loadApplications(filterApp ? filterApp.value : 'PENDING');
                break;
            case 'classes':
                var filterClass = document.getElementById('filterClassStatus');
                loadPendingClasses(filterClass ? filterClass.value : 'PENDING_REVIEW');
                break;
            case 'settlements':
                var filterSettle = document.getElementById('filterSettlementStatus');
                loadSettlements(filterSettle ? filterSettle.value : 'PENDING_SETTLEMENT');
                loadSettlementHistory();
                break;
            case 'affiliations':
                loadAdminAffiliations();
                break;
        }
    }

    /* ========================================
       파트너 신청 탭
       ======================================== */
    function loadApplications(status) {
        showLoading('Applications');
        adminFetch({ action: 'getApplications', status: status || 'PENDING', page: 1, limit: 50 }, function(httpStatus, resp) {
            hideLoading('Applications');
            if (resp && resp.success) {
                renderApplications(resp.data.applications || [], status);
            } else {
                showToast('신청 목록 로드 실패', 'error');
            }
        });
    }

    function renderApplications(list, status) {
        var tbody = document.getElementById('tbodyApplications');
        var emptyEl = document.getElementById('emptyApplications');
        var tableWrap = document.getElementById('tableWrapApplications');

        if (!list.length) {
            emptyEl.style.display = '';
            tableWrap.style.display = 'none';
            return;
        }

        emptyEl.style.display = 'none';
        tableWrap.style.display = '';

        var html = '';
        for (var i = 0; i < list.length; i++) {
            var app = list[i];
            var date = formatDate(app.created_at || app.CreatedAt);
            html += '<tr data-id="' + (app.Id || '') + '" data-member="' + escapeAttr(app.member_id || '') + '">';
            html += '<td class="ad-table__date">' + date + '</td>';
            html += '<td>' + escapeHtml(app.applicant_name || app.name || '-') + '</td>';
            html += '<td>' + escapeHtml(app.workshop_name || app.studio_name || '-') + '</td>';
            html += '<td>' + escapeHtml(app.specialty || '-') + '</td>';
            html += '<td>' + escapeHtml(app.location || '-') + '</td>';
            html += '<td class="ad-table__actions">';
            if (status === 'PENDING') {
                html += '<button class="ad-btn ad-btn--sm ad-btn--approve" onclick="window._adminAction(\'approveApp\',' + app.Id + ',\'' + escapeAttr(app.member_id || '') + '\')">승인</button>';
                html += '<button class="ad-btn ad-btn--sm ad-btn--reject" onclick="window._adminAction(\'rejectApp\',' + app.Id + ')">거부</button>';
            } else {
                html += '<span class="ad-status ad-status--' + status.toLowerCase() + '">' + getStatusLabel(status) + '</span>';
            }
            html += '</td></tr>';
        }
        tbody.innerHTML = html;
    }

    /* ========================================
       강의 승인 탭
       ======================================== */
    function loadPendingClasses(status) {
        var normalizedStatus = normalizeClassFilterStatus(status || 'PENDING_REVIEW');
        showLoading('Classes');
        adminFetch({ action: 'getPendingClasses', status: normalizedStatus, page: 1, limit: 50 }, function(httpStatus, resp) {
            hideLoading('Classes');
            if (resp && resp.success) {
                renderClasses(resp.data.classes || [], normalizedStatus);
            } else {
                showToast('강의 목록 로드 실패', 'error');
            }
        });
    }

    function renderClasses(list, status) {
        var tbody = document.getElementById('tbodyClasses');
        var emptyEl = document.getElementById('emptyClasses');
        var tableWrap = document.getElementById('tableWrapClasses');

        if (!list.length) {
            emptyEl.style.display = '';
            tableWrap.style.display = 'none';
            return;
        }

        emptyEl.style.display = 'none';
        tableWrap.style.display = '';

        var html = '';
        for (var i = 0; i < list.length; i++) {
            var cls = list[i];
            var date = formatDate(cls.created_date || cls.CreatedAt);
            html += '<tr data-id="' + (cls.Id || '') + '">';
            html += '<td class="ad-table__date">' + date + '</td>';
            html += '<td>' + escapeHtml(cls.class_name || '-') + '</td>';
            html += '<td>' + escapeHtml(cls.partner_name || cls.partner_code || '-') + '</td>';
            html += '<td>' + escapeHtml(cls.category || '-') + '</td>';
            html += '<td>' + escapeHtml(cls.type || '-') + '</td>';
            html += '<td>' + formatPrice(cls.price || 0) + '\uC6D0</td>';
            html += '<td class="ad-table__actions">';
            if (status === 'PENDING_REVIEW') {
                html += '<button class="ad-btn ad-btn--sm ad-btn--approve" onclick="window._adminAction(\'approveClass\',' + cls.Id + ')">승인</button>';
                html += '<button class="ad-btn ad-btn--sm ad-btn--reject" onclick="window._adminAction(\'rejectClass\',' + cls.Id + ')">거부</button>';
            } else {
                html += '<span class="ad-status ad-status--' + status.toLowerCase() + '">' + getStatusLabel(status) + '</span>';
            }
            html += '</td></tr>';
        }
        tbody.innerHTML = html;
    }

    /* ========================================
       정산 현황 탭
       ======================================== */
    function loadSettlements(status) {
        showLoading('Settlements');
        var batchBtn = document.getElementById('btnBatchSettle');
        if (batchBtn) batchBtn.style.display = status === 'PENDING_SETTLEMENT' ? '' : 'none';

        adminFetch({ action: 'getSettlements', status: status || 'PENDING_SETTLEMENT', page: 1, limit: 100 }, function(httpStatus, resp) {
            hideLoading('Settlements');
            if (resp && resp.success) {
                renderSettlements(resp.data.settlements || [], status);
                renderSettleSummary(resp.data.summary);
            } else {
                showToast('정산 목록 로드 실패', 'error');
            }
        });
    }

    function renderSettlements(list, status) {
        var tbody = document.getElementById('tbodySettlements');
        var emptyEl = document.getElementById('emptySettlements');
        var tableWrap = document.getElementById('tableWrapSettlements');

        selectedSettlements = {};

        if (!list.length) {
            emptyEl.style.display = '';
            tableWrap.style.display = 'none';
            return;
        }

        emptyEl.style.display = 'none';
        tableWrap.style.display = '';

        var html = '';
        for (var i = 0; i < list.length; i++) {
            var stl = list[i];
            var date = formatDate(stl.class_date || stl.order_date || stl.created_at || stl.CreatedAt);
            var commRate = normalizePercent(stl.commission_rate);
            var orderAmt = Number(stl.order_amount) || 0;
            var commAmt = Number(stl.commission_amount) || Math.round(orderAmt * commRate / 100);
            var partnerAmt = Number(stl.reserve_amount) || Number(stl.partner_amount) || (orderAmt - commAmt);

            html += '<tr data-id="' + (stl.Id || '') + '">';
            if (status === 'PENDING_SETTLEMENT') {
                html += '<td><input type="checkbox" class="ad-checkbox settle-check" value="' + escapeAttr(stl.settlement_id || '') + '"></td>';
            } else {
                html += '<td></td>';
            }
            html += '<td class="ad-table__date">' + date + '</td>';
            html += '<td>' + escapeHtml(stl.partner_name || stl.partner_code || '-') + '</td>';
            html += '<td>' + escapeHtml(stl.class_name || stl.class_title || '-') + '</td>';
            html += '<td class="ad-table__num">' + formatPrice(orderAmt) + '\uC6D0</td>';
            html += '<td class="ad-table__num">' + commRate + '%</td>';
            html += '<td class="ad-table__num ad-table__num--highlight">' + formatPrice(partnerAmt) + '\uC6D0</td>';
            html += '<td><span class="ad-status ad-status--' + (status === 'PENDING_SETTLEMENT' ? 'pending' : 'approved') + '">' + (status === 'PENDING_SETTLEMENT' ? '\uB300\uAE30' : '\uC644\uB8CC') + '</span></td>';
            html += '</tr>';
        }
        tbody.innerHTML = html;
    }

    function renderSettleSummary(summary) {
        var el = document.getElementById('settleSummary');
        if (!summary) {
            if (el) el.style.display = 'none';
            return;
        }
        if (el) el.style.display = '';

        var orderEl = document.getElementById('settleOrderTotal');
        var commEl = document.getElementById('settleCommission');
        var partnerEl = document.getElementById('settlePartnerTotal');

        if (orderEl) orderEl.textContent = formatPrice(summary.total_order_amount || 0) + '\uC6D0';
        if (commEl) commEl.textContent = formatPrice(summary.total_commission || 0) + '\uC6D0';
        if (partnerEl) partnerEl.textContent = formatPrice(summary.total_partner_amount || 0) + '\uC6D0';
    }

    function loadSettlementHistory() {
        var month = getSettlementMonthValue();
        showLoading('SettlementHistory');
        settlementFetch({ action: 'getSettlementHistory', month: month }, function(httpStatus, resp) {
            hideLoading('SettlementHistory');
            if (resp && resp.success && resp.data) {
                renderSettlementHistory(resp.data.history || [], resp.data.summary || {});
            } else {
                showEmpty('SettlementHistory');
                updateSettlementHistoryMeta(null, month);
            }
        });
    }

    function renderSettlementHistory(list, summary) {
        var tbody = document.getElementById('tbodySettlementHistory');
        var emptyEl = document.getElementById('emptySettlementHistory');
        var tableWrap = document.getElementById('tableWrapSettlementHistory');
        var month = getSettlementMonthValue();

        updateSettlementHistoryMeta(summary, month);

        if (!list.length) {
            if (tbody) tbody.innerHTML = '';
            if (emptyEl) emptyEl.style.display = '';
            if (tableWrap) tableWrap.style.display = 'none';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';
        if (tableWrap) tableWrap.style.display = '';

        var html = '';
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            html += '<tr>';
            html += '<td>' + escapeHtml(item.cycle_label || '-') + '</td>';
            html += '<td><strong>' + escapeHtml(item.partner_name || item.partner_code || '-') + '</strong></td>';
            html += '<td>' + escapeHtml(item.grade || '-') + '</td>';
            html += '<td class="ad-table__num">' + formatPrice(item.classes_count || 0) + '</td>';
            html += '<td class="ad-table__num">' + formatPrice(item.total_order_amount || 0) + '\uC6D0</td>';
            html += '<td class="ad-table__num ad-table__num--highlight">' + formatPrice(item.total_reserve_amount || 0) + '\uC6D0</td>';
            html += '<td>' + (item.last_sent_at ? formatDateTime(item.last_sent_at) : '-') + '</td>';
            html += '</tr>';
        }

        if (tbody) tbody.innerHTML = html;
    }

    function updateSettlementHistoryMeta(summary, month) {
        var metaEl = document.getElementById('settlementHistoryMeta');
        if (!metaEl) return;

        if (!summary) {
            metaEl.textContent = month + ' 기준 정산서 발송 이력을 확인합니다.';
            return;
        }

        metaEl.textContent = month + ' 기준 총 ' + formatPrice(summary.total_order_amount || 0) + '\uC6D0 주문, '
            + formatPrice(summary.total_reserve_amount || 0) + '\uC6D0 적립금, '
            + (summary.sent_count || 0) + '건 발송 완료';
    }

    function bindSettlementControls() {
        var monthInput = document.getElementById('settlementMonth');
        var cycleSelect = document.getElementById('settlementCycle');
        var runBtn = document.getElementById('btnRunSettlement');

        if (monthInput && !monthInput.value) {
            monthInput.value = getCurrentMonthValue();
        }
        if (monthInput) {
            monthInput.addEventListener('change', function() {
                loadSettlementHistory();
            });
        }
        if (cycleSelect) {
            cycleSelect.addEventListener('change', function() {
                updateSettlementRunLabel();
            });
        }
        if (runBtn) {
            runBtn.addEventListener('click', function() {
                var month = getSettlementMonthValue();
                var cycle = getSettlementCycleValue();
                var cycleLabel = month + ' ' + (cycle === 'SECOND_HALF' ? '후반' : '전반');

                showModal('정산 실행 확인', cycleLabel + ' 정산서를 파트너에게 발송하시겠습니까?', function() {
                    settlementFetch({
                        action: 'runSettlementBatch',
                        month: month,
                        cycle: cycle
                    }, function(status, resp) {
                        if (resp && resp.success) {
                            var sentCount = resp.data && resp.data.sent_count ? resp.data.sent_count : 0;
                            showToast(cycleLabel + ' 정산 실행 완료 (' + sentCount + '건)', 'success');
                        } else {
                            showToast('정산 실행 실패: ' + getErrorMessage(resp, '메일 설정 또는 정산 데이터를 확인해 주세요.'), 'error');
                        }
                        loadSettlementHistory();
                    });
                });
            });
        }

        // 전체 선택 체크박스
        var checkAll = document.getElementById('settleCheckAll');
        if (checkAll) {
            checkAll.addEventListener('change', function() {
                var checks = document.querySelectorAll('.settle-check');
                for (var i = 0; i < checks.length; i++) {
                    checks[i].checked = checkAll.checked;
                }
            });
        }

        // 일괄 정산 버튼
        var batchBtn = document.getElementById('btnBatchSettle');
        if (batchBtn) {
            batchBtn.addEventListener('click', function() {
                var checks = document.querySelectorAll('.settle-check:checked');
                if (!checks.length) {
                    showToast('\uC815\uC0B0\uD560 \uD56D\uBAA9\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.', 'warning');
                    return;
                }
                var ids = [];
                for (var i = 0; i < checks.length; i++) {
                    ids.push(String(checks[i].value || '').trim());
                }
                showModal('\uC77C\uAD04 \uC815\uC0B0 \uD655\uC778', ids.length + '\uAC74\uC744 \uC815\uC0B0 \uC644\uB8CC \uCC98\uB9AC\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?', function(note) {
                    adminFetch({
                        action: 'completeSettlement',
                        settlement_ids: ids,
                        paid_at: new Date().toISOString().slice(0, 10)
                    }, function(status, resp) {
                        if (resp && resp.success) {
                            showToast(ids.length + '\uAC74 \uC815\uC0B0 \uC644\uB8CC', 'success');
                            loadSettlements('PENDING_SETTLEMENT');
                            loadSummary();
                        } else {
                            showToast('\uC815\uC0B0 \uCC98\uB9AC \uC2E4\uD328: ' + getErrorMessage(resp, '\uC54C \uC218 \uC5C6\uB294 \uC624\uB958'), 'error');
                        }
                    });
                });
            });
        }

        updateSettlementRunLabel();
    }

    function updateSettlementRunLabel() {
        var runBtn = document.getElementById('btnRunSettlement');
        if (!runBtn) return;

        var month = getSettlementMonthValue();
        var cycle = getSettlementCycleValue();
        runBtn.textContent = month + ' ' + (cycle === 'SECOND_HALF' ? '후반 정산 실행' : '전반 정산 실행');
    }

    /* ========================================
       액션 핸들러
       ======================================== */
    window._adminAction = function(type, rowId, membId) {
        switch(type) {
            case 'approveApp':
                showModal('\uD30C\uD2B8\uB108 \uC2E0\uCCAD \uC2B9\uC778', '\uC774 \uD30C\uD2B8\uB108 \uC2E0\uCCAD\uC744 \uC2B9\uC778\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?\n\uC2B9\uC778 \uC2DC \uD68C\uC6D0\uB4F1\uAE09\uC774 \uBCC0\uACBD\uB418\uACE0 \uC774\uBA54\uC77C\uC774 \uBC1C\uC1A1\uB429\uB2C8\uB2E4.', function(note) {
                    adminFetch({
                        action: 'approveApplication',
                        application_id: String(rowId),
                        member_id: membId || '',
                        reviewer_note: note
                    }, function(status, resp) {
                        if (resp && resp.success) {
                            showToast('\uD30C\uD2B8\uB108 \uC2B9\uC778 \uC644\uB8CC', 'success');
                            loadApplications('PENDING');
                            loadSummary();
                        } else {
                            showToast('\uC2B9\uC778 \uCC98\uB9AC \uC2E4\uD328: ' + getErrorMessage(resp, '\uC54C \uC218 \uC5C6\uB294 \uC624\uB958'), 'error');
                        }
                    });
                });
                break;

            case 'rejectApp':
                showModal('\uD30C\uD2B8\uB108 \uC2E0\uCCAD \uAC70\uBD80', '\uC774 \uC2E0\uCCAD\uC744 \uAC70\uBD80\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?\n\uAC70\uBD80 \uC0AC\uC720\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.', function(note) {
                    if (!note) {
                        showToast('\uAC70\uBD80 \uC0AC\uC720\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.', 'warning');
                        return;
                    }
                    adminFetch({
                        action: 'rejectApplication',
                        row_id: String(rowId),
                        reject_reason: note
                    }, function(status, resp) {
                        if (resp && resp.success) {
                            showToast('\uC2E0\uCCAD \uAC70\uBD80 \uCC98\uB9AC \uC644\uB8CC', 'success');
                            loadApplications('PENDING');
                            loadSummary();
                        } else {
                            showToast('\uAC70\uBD80 \uCC98\uB9AC \uC2E4\uD328: ' + getErrorMessage(resp, '\uC54C \uC218 \uC5C6\uB294 \uC624\uB958'), 'error');
                        }
                    });
                });
                break;

            case 'approveClass':
                showModal('\uAC15\uC758 \uC2B9\uC778', '\uC774 \uAC15\uC758\uB97C \uC2B9\uC778\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?\n\uC2B9\uC778 \uC2DC \uBA54\uC774\uD06C\uC0F5 \uC0C1\uD488\uC774 \uC790\uB3D9 \uB4F1\uB85D\uB429\uB2C8\uB2E4.', function(note) {
                    adminFetch({
                        action: 'approveClass',
                        row_id: String(rowId),
                        reviewer_note: note
                    }, function(status, resp) {
                        if (resp && resp.success) {
                            showToast('\uAC15\uC758 \uC2B9\uC778 \uC644\uB8CC (\uBA54\uC774\uD06C\uC0F5 \uC0C1\uD488 \uC790\uB3D9 \uB4F1\uB85D)', 'success');
                            loadPendingClasses('PENDING_REVIEW');
                            loadSummary();
                        } else {
                            showToast('\uC2B9\uC778 \uCC98\uB9AC \uC2E4\uD328: ' + getErrorMessage(resp, '\uC54C \uC218 \uC5C6\uB294 \uC624\uB958'), 'error');
                        }
                    });
                });
                break;

            case 'rejectClass':
                showModal('\uAC15\uC758 \uAC70\uBD80', '\uC774 \uAC15\uC758\uB97C \uAC70\uBD80\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?\n\uAC70\uBD80 \uC0AC\uC720\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.', function(note) {
                    if (!note) {
                        showToast('\uAC70\uBD80 \uC0AC\uC720\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.', 'warning');
                        return;
                    }
                    adminFetch({
                        action: 'rejectClass',
                        row_id: String(rowId),
                        reject_reason: note
                    }, function(status, resp) {
                        if (resp && resp.success) {
                            showToast('\uAC15\uC758 \uAC70\uBD80 \uCC98\uB9AC \uC644\uB8CC', 'success');
                            loadPendingClasses('PENDING_REVIEW');
                            loadSummary();
                        } else {
                            showToast('\uAC70\uBD80 \uCC98\uB9AC \uC2E4\uD328: ' + getErrorMessage(resp, '\uC54C \uC218 \uC5C6\uB294 \uC624\uB958'), 'error');
                        }
                    });
                });
                break;
        }
    };

    /* ========================================
       모달
       ======================================== */
    function bindModal() {
        var cancelBtn = document.getElementById('modalCancel');
        var confirmBtn = document.getElementById('modalConfirm');
        var backdrop = document.getElementById('modalBackdrop');

        if (cancelBtn) cancelBtn.addEventListener('click', hideModal);
        if (backdrop) backdrop.addEventListener('click', hideModal);
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                var note = (document.getElementById('modalNote') || {}).value || '';
                var callback = modalCallback;
                hideModal();
                if (callback) callback(note);
            });
        }
    }

    function showModal(title, body, callback) {
        var modal = document.getElementById('adModal');
        var titleEl = document.getElementById('modalTitle');
        var bodyEl = document.getElementById('modalBody');
        var noteEl = document.getElementById('modalNote');

        if (titleEl) titleEl.textContent = title;
        if (bodyEl) bodyEl.textContent = body;
        if (noteEl) noteEl.value = '';
        if (modal) modal.style.display = '';
        modalCallback = callback;

        // body 스크롤 방지
        document.body.style.overflow = 'hidden';
    }

    function hideModal() {
        var modal = document.getElementById('adModal');
        if (modal) modal.style.display = 'none';
        modalCallback = null;
        document.body.style.overflow = '';
    }

    /* ========================================
       토스트 알림
       ======================================== */
    function showToast(message, type) {
        var container = document.getElementById('adToastContainer');
        if (!container) return;

        var toast = document.createElement('div');
        toast.className = 'ad-toast ad-toast--' + (type || 'info');
        toast.textContent = message;
        container.appendChild(toast);

        // 3초 후 제거
        setTimeout(function() {
            toast.classList.add('ad-toast--hide');
            setTimeout(function() {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 3000);
    }

    function getErrorMessage(resp, fallback) {
        if (resp && resp.error && resp.error.message) return resp.error.message;
        if (resp && typeof resp.error === 'string') return resp.error;
        return fallback || '알 수 없는 오류';
    }

    /* ========================================
       협회 관리 탭
       ======================================== */

    /** WF-01 Class API (공개 API, CORS 허용) */
    var CLASS_API_URL = 'https://n8n.pressco21.com/webhook/class-api';

    function loadAdminAffiliations() {
        showLoading('Affiliations');
        // WF-01 getAffiliations (CORS 허용, active 협회만)
        var xhr = new XMLHttpRequest();
        xhr.open('POST', CLASS_API_URL, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                hideLoading('Affiliations');
                if (xhr.status === 200) {
                    try {
                        var resp = JSON.parse(xhr.responseText);
                        if (resp && resp.success && resp.data) {
                            renderAdminAffiliations(resp.data);
                            var countEl = document.getElementById('affilTotalCount');
                            if (countEl) countEl.textContent = resp.total || resp.data.length;
                            var badgeEl = document.getElementById('badgeAffiliations');
                            if (badgeEl) {
                                var cnt = resp.total || resp.data.length;
                                badgeEl.textContent = cnt > 0 ? cnt : '';
                                badgeEl.style.display = cnt > 0 ? '' : 'none';
                            }
                        } else {
                            showEmpty('Affiliations');
                        }
                    } catch(e) {
                        showEmpty('Affiliations');
                    }
                } else {
                    showEmpty('Affiliations');
                }
            }
        };
        xhr.send(JSON.stringify({ action: 'getAffiliations' }));

        // 월간 집계는 WF-ADMIN 경유 (getAffilStats 액션)
        loadAffilStats();
    }

    function renderAdminAffiliations(list) {
        var tbody = document.getElementById('tbodyAffiliations');
        var tableWrap = document.getElementById('tableWrapAffiliations');
        var emptyEl = document.getElementById('emptyAffiliations');

        affiliationRecords = list || [];
        populateProposalBuilderOptions(affiliationRecords);

        if (!list || list.length === 0) {
            if (tableWrap) tableWrap.style.display = 'none';
            if (emptyEl) emptyEl.style.display = '';
            return;
        }

        if (tableWrap) tableWrap.style.display = '';
        if (emptyEl) emptyEl.style.display = 'none';

        var html = '';
        for (var i = 0; i < list.length; i++) {
            var a = list[i];
            var tiers = a.incentive_tiers || [];
            var t1 = tiers[0] || { target: 5000000, incentive: 250000 };
            var t2 = tiers[1] || { target: 10000000, incentive: 500000 };
            var t3 = tiers[2] || { target: 20000000, incentive: 1200000 };
            html += '<tr>';
            html += '<td>' + escapeHtml(a.affiliation_code || '-') + '</td>';
            html += '<td><strong>' + escapeHtml(a.name || '-') + '</strong></td>';
            html += '<td>' + escapeHtml(a.contact_name || '-') + '</td>';
            html += '<td>' + (Number(a.discount_rate) || 0) + '%</td>';
            html += '<td>' + formatPrice(t1.target) + '\uC6D0 / ' + formatPrice(t1.incentive) + '\uC6D0</td>';
            html += '<td>' + formatPrice(t2.target) + '\uC6D0 / ' + formatPrice(t2.incentive) + '\uC6D0</td>';
            html += '<td>' + formatPrice(t3.target) + '\uC6D0 / ' + formatPrice(t3.incentive) + '\uC6D0</td>';
            html += '<td><span class="ad-status ad-status--active">\uD65C\uC131</span></td>';
            html += '<td><button type="button" class="ad-btn ad-btn--secondary ad-btn--sm" onclick="window._adminLoadAffiliationProposal(\'' + escapeAttr(a.affiliation_code || '') + '\')">\uBD88\uB7EC\uC624\uAE30</button></td>';
            html += '</tr>';
        }
        if (tbody) tbody.innerHTML = html;
    }

    function bindProposalBuilder() {
        var selectEl = document.getElementById('proposalAffiliationSelect');
        var inputIds = [
            'proposalAffiliationName',
            'proposalPageId',
            'proposalLogoUrl',
            'proposalMemberCount',
            'proposalMonthlyStudents',
            'proposalAvgOrderAmount'
        ];
        var previewBtn = document.getElementById('btnPreviewProposal');
        var copyBtn = document.getElementById('btnCopyProposalUrl');
        var i;

        if (selectEl) {
            selectEl.addEventListener('change', function() {
                populateProposalBuilderFromAffiliation(selectEl.value);
            });
        }

        for (i = 0; i < inputIds.length; i++) {
            bindProposalInput(inputIds[i], refreshProposalBuilder);
        }

        if (previewBtn) {
            previewBtn.addEventListener('click', function() {
                var url = buildProposalUrl();
                if (!url) {
                    showToast('로컬 preview 환경이 아니면 실배포 페이지 ID를 먼저 입력해주세요.', 'warning');
                    return;
                }
                window.open(url, '_blank');
            });
        }

        if (copyBtn) {
            copyBtn.addEventListener('click', function() {
                var url = buildProposalUrl();
                if (!url) {
                    showToast('복사할 제안서 URL이 없습니다.', 'warning');
                    return;
                }
                copyText(url, function(success) {
                    showToast(success ? '제안서 URL을 복사했습니다.' : '브라우저에서 복사를 허용하지 않아 URL을 선택 상태로 남겼습니다.', success ? 'success' : 'info');
                });
            });
        }

        window._adminLoadAffiliationProposal = function(code) {
            var select = document.getElementById('proposalAffiliationSelect');
            if (select) {
                select.value = code || '';
            }
            populateProposalBuilderFromAffiliation(code || '');
            var builder = document.querySelector('.admin-dashboard .ad-proposal-builder');
            if (builder) {
                builder.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        };
    }

    function bindProposalInput(id, handler) {
        var el = document.getElementById(id);
        if (!el) return;

        el.addEventListener('input', handler);
        el.addEventListener('change', handler);
    }

    function populateProposalBuilderOptions(list) {
        var selectEl = document.getElementById('proposalAffiliationSelect');
        var currentValue = selectEl ? selectEl.value : '';
        var html = '<option value="">협회를 선택하세요</option>';
        var i;

        if (!selectEl) return;

        for (i = 0; i < list.length; i++) {
            html += '<option value="' + escapeAttr(list[i].affiliation_code || '') + '">' + escapeHtml(list[i].name || list[i].affiliation_code || '-') + '</option>';
        }

        selectEl.innerHTML = html;

        if (currentValue) {
            selectEl.value = currentValue;
        }

        if (!selectEl.value && list.length) {
            selectEl.value = list[0].affiliation_code || '';
        }

        populateProposalBuilderFromAffiliation(selectEl.value);
    }

    function populateProposalBuilderFromAffiliation(code) {
        var affiliation = findAffiliation(code);
        var tiers = affiliation && affiliation.incentive_tiers ? affiliation.incentive_tiers : [];
        var t1 = tiers[0] || { target: 5000000, incentive: 250000 };
        var t2 = tiers[1] || { target: 10000000, incentive: 500000 };
        var t3 = tiers[2] || { target: 20000000, incentive: 1200000 };
        var benefitSummary = document.getElementById('proposalBenefitSummary');
        var tierSummary = document.getElementById('proposalTierSummary');

        if (affiliation) {
            setFieldValue('proposalAffiliationName', affiliation.name || '');
            setFieldValue('proposalLogoUrl', affiliation.logo_url || '');
            if (benefitSummary) {
                benefitSummary.textContent = '할인율 ' + (Number(affiliation.discount_rate) || 0) + '%, 담당자 ' + (affiliation.contact_name || '-') + ', ' + '협회별 인센티브 기준을 반영했습니다.';
            }
        } else if (benefitSummary) {
            benefitSummary.textContent = '협회 선택 시 할인율과 인센티브 구간이 자동 반영됩니다.';
        }

        if (tierSummary) {
            tierSummary.textContent = '1단계 ' + formatPrice(t1.incentive) + '\uC6D0 / 2단계 ' + formatPrice(t2.incentive) + '\uC6D0 / 3단계 ' + formatPrice(t3.incentive) + '\uC6D0';
        }

        refreshProposalBuilder();
    }

    function refreshProposalBuilder() {
        var textarea = document.getElementById('proposalGeneratedUrl');
        var modeLabel = document.getElementById('proposalUrlModeLabel');
        var url = buildProposalUrl();
        var liveReady = hasProposalPageId();

        if (modeLabel) {
            if (isLocalPreviewHost()) {
                modeLabel.textContent = liveReady ? '\uB85C\uCEEC \uBBF8\uB9AC\uBCF4\uAE30 URL (page id \uB9E4\uD551 \uC900\uBE44\uC644\uB8CC)' : '\uB85C\uCEEC \uBBF8\uB9AC\uBCF4\uAE30 URL';
            } else {
                modeLabel.textContent = liveReady ? '\uC2E4\uBC30\uD3EC URL' : '\uC2E4\uBC30\uD3EC \uD398\uC774\uC9C0 ID \uD544\uC694';
            }
        }

        if (textarea) {
            textarea.value = url || '\uB85C\uCEEC preview \uD658\uACBD\uC774 \uC544\uB2C8\uBA74 \uC2E4\uBC30\uD3EC \uD398\uC774\uC9C0 ID\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.';
        }
    }

    function buildProposalUrl() {
        var baseUrl = getProposalBaseUrl();
        var query = buildProposalQuery();
        if (!baseUrl) return '';
        return baseUrl + (baseUrl.indexOf('?') === -1 ? '?' : '&') + query;
    }

    function getProposalBaseUrl() {
        var pageId = getFieldValue('proposalPageId');
        if (isLocalPreviewHost()) {
            return window.location.origin + AFFILIATION_PROPOSAL_PREVIEW_PATH;
        }
        if (pageId) {
            return window.location.origin + '/shop/page.html?id=' + encodeURIComponent(pageId);
        }
        return '';
    }

    function buildProposalQuery() {
        var affiliation = findAffiliation(getFieldValue('proposalAffiliationSelect'));
        var tiers = affiliation && affiliation.incentive_tiers ? affiliation.incentive_tiers : [];
        var t1 = tiers[0] || { target: 5000000, incentive: 250000 };
        var t2 = tiers[1] || { target: 10000000, incentive: 500000 };
        var t3 = tiers[2] || { target: 20000000, incentive: 1200000 };
        var params = [];

        pushQueryParam(params, 'code', affiliation && affiliation.affiliation_code ? affiliation.affiliation_code : 'AFFILIATION PARTNERSHIP');
        pushQueryParam(params, 'name', getFieldValue('proposalAffiliationName'));
        pushQueryParam(params, 'contact', affiliation && affiliation.contact_name ? affiliation.contact_name + ' 담당 협회 제휴 제안서' : '협회 운영 방향에 맞춰 혜택과 인센티브를 조정할 수 있습니다.');
        pushQueryParam(params, 'logo', getFieldValue('proposalLogoUrl'));
        pushQueryParam(params, 'discountRate', affiliation ? Number(affiliation.discount_rate) || 0 : 0);
        pushQueryParam(params, 'members', getNumericFieldValue('proposalMemberCount', 120));
        pushQueryParam(params, 'monthlyStudents', getNumericFieldValue('proposalMonthlyStudents', 24));
        pushQueryParam(params, 'avgOrderAmount', getNumericFieldValue('proposalAvgOrderAmount', 45000));
        pushQueryParam(params, 'target1', Number(t1.target) || 5000000);
        pushQueryParam(params, 'target2', Number(t2.target) || 10000000);
        pushQueryParam(params, 'target3', Number(t3.target) || 20000000);
        pushQueryParam(params, 'incentive1', Number(t1.incentive) || 250000);
        pushQueryParam(params, 'incentive2', Number(t2.incentive) || 500000);
        pushQueryParam(params, 'incentive3', Number(t3.incentive) || 1200000);

        return params.join('&');
    }

    function findAffiliation(code) {
        var i;
        for (i = 0; i < affiliationRecords.length; i++) {
            if ((affiliationRecords[i].affiliation_code || '') === code) {
                return affiliationRecords[i];
            }
        }
        return null;
    }

    function hasProposalPageId() {
        return !!getFieldValue('proposalPageId');
    }

    function isLocalPreviewHost() {
        return /^(127\.0\.0\.1|localhost)$/i.test(window.location.hostname || '');
    }

    function pushQueryParam(list, key, value) {
        list.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(value || '')));
    }

    function getFieldValue(id) {
        var el = document.getElementById(id);
        return el ? String(el.value || '').trim() : '';
    }

    function getNumericFieldValue(id, fallback) {
        var value = Number(getFieldValue(id).replace(/[^\d.-]/g, ''));
        return isNaN(value) ? fallback : value;
    }

    function setFieldValue(id, value) {
        var el = document.getElementById(id);
        if (el) {
            el.value = value;
        }
    }

    function copyText(text, callback) {
        var textarea = document.getElementById('proposalGeneratedUrl');

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function() {
                callback(true);
            }).catch(function() {
                if (textarea) {
                    textarea.focus();
                    textarea.select();
                }
                callback(false);
            });
            return;
        }

        if (textarea) {
            textarea.focus();
            textarea.select();
        }
        callback(false);
    }

    function loadAffilStats() {
        // WF-ADMIN getAffilStats 호출
        adminFetch({ action: 'getAffilStats' }, function(httpStatus, resp) {
            var tbody = document.getElementById('tbodyAffilStats');
            var tableWrap = document.getElementById('tableWrapAffilStats');
            var emptyEl = document.getElementById('emptyAffilStats');

            if (!resp || !resp.success || !resp.data || resp.data.length === 0) {
                if (tableWrap) tableWrap.style.display = 'none';
                if (emptyEl) emptyEl.style.display = '';
                return;
            }

            if (tableWrap) tableWrap.style.display = '';
            if (emptyEl) emptyEl.style.display = 'none';

            var html = '';
            for (var i = 0; i < resp.data.length; i++) {
                var s = resp.data[i];
                var levelLabel = s.incentive_level > 0 ? s.incentive_level + '\uB2E8\uACC4' : '-';
                var paidClass = s.incentive_paid ? 'ad-status--active' : 'ad-status--pending';
                var paidLabel = s.incentive_paid ? '\uC9C0\uAE09\uC644\uB8CC' : '\uBBF8\uC9C0\uAE09';
                html += '<tr>';
                html += '<td>' + (s.year || '-') + '/' + (s.month || '-') + '</td>';
                html += '<td>' + escapeHtml(s.affiliation_code || '-') + '</td>';
                html += '<td>' + formatPrice(s.total_amount || 0) + '\uC6D0</td>';
                html += '<td>' + (s.member_count || 0) + '\uBA85</td>';
                html += '<td>' + formatPrice(s.cumulative_amount || 0) + '\uC6D0</td>';
                html += '<td>' + levelLabel + '</td>';
                html += '<td>' + (s.incentive_amount > 0 ? formatPrice(s.incentive_amount) + '\uC6D0' : '-') + '</td>';
                html += '<td><span class="ad-status ' + paidClass + '">' + paidLabel + '</span></td>';
                html += '</tr>';
            }
            if (tbody) tbody.innerHTML = html;
        });
    }

    function showEmpty(type) {
        var tableWrap = document.getElementById('tableWrap' + type);
        var emptyEl = document.getElementById('empty' + type);
        if (tableWrap) tableWrap.style.display = 'none';
        if (emptyEl) emptyEl.style.display = '';
    }


    /* ========================================
       로딩 표시
       ======================================== */
    function showLoading(type) {
        isLoading = true;
        var el = document.getElementById('loading' + type);
        var tableWrap = document.getElementById('tableWrap' + type);
        var emptyEl = document.getElementById('empty' + type);
        if (el) el.style.display = '';
        if (tableWrap) tableWrap.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'none';
    }

    function hideLoading(type) {
        isLoading = false;
        var el = document.getElementById('loading' + type);
        if (el) el.style.display = 'none';
    }

    /* ========================================
       유틸리티
       ======================================== */
    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function formatPrice(num) {
        return String(Math.round(Number(num) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function normalizePercent(num) {
        var value = Number(num) || 0;
        if (!value) return 0;
        return value > 0 && value < 1 ? Math.round(value * 100) : value;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        var d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        var y = d.getFullYear();
        var m = ('0' + (d.getMonth() + 1)).slice(-2);
        var day = ('0' + d.getDate()).slice(-2);
        return y + '-' + m + '-' + day;
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return '-';
        var d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        var y = d.getFullYear();
        var m = ('0' + (d.getMonth() + 1)).slice(-2);
        var day = ('0' + d.getDate()).slice(-2);
        var hh = ('0' + d.getHours()).slice(-2);
        var mm = ('0' + d.getMinutes()).slice(-2);
        return y + '-' + m + '-' + day + ' ' + hh + ':' + mm;
    }

    function getCurrentMonthValue() {
        var now = new Date();
        var y = now.getFullYear();
        var m = ('0' + (now.getMonth() + 1)).slice(-2);
        return y + '-' + m;
    }

    function getSettlementMonthValue() {
        var input = document.getElementById('settlementMonth');
        return input && input.value ? input.value : getCurrentMonthValue();
    }

    function getSettlementCycleValue() {
        var select = document.getElementById('settlementCycle');
        return select && select.value === 'SECOND_HALF' ? 'SECOND_HALF' : 'FIRST_HALF';
    }

    function getStatusLabel(status) {
        var map = {
            'PENDING': '\uB300\uAE30',
            'APPROVED': '\uC2B9\uC778',
            'REJECTED': '\uAC70\uBD80',
            'ACTIVE': '\uD65C\uC131',
            'PENDING_REVIEW': '\uB300\uAE30',
            'PAUSED': '\uC77C\uC2DC\uC911\uC9C0',
            'ARCHIVED': '\uBCF4\uAD00',
            'PENDING_SETTLEMENT': '\uC815\uC0B0\uB300\uAE30',
            'COMPLETED': '\uC644\uB8CC',
            'CANCELLED': '\uCDE8\uC18C',
            'SELF_PURCHASE': '\uC790\uAC00\uAD6C\uB9E4'
        };
        return map[status] || status;
    }

    /* ========================================
       DOM 로드 후 초기화
       ======================================== */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
