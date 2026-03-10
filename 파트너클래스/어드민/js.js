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
    // 관리자 그룹명 목록 (메이크샵 회원등급명과 일치해야 함)
    var ADMIN_GROUP_NAMES = ['관리자', '운영자', '대표'];
    // 관리자 그룹 레벨 하한선
    var ADMIN_MIN_GROUP_LEVEL = 9;
    // API 인증 토큰 (이 페이지는 관리자만 접근 가능하므로 프론트 노출 허용)
    var ADMIN_TOKEN = 'pressco21-admin-2026';

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
                loadPendingClasses(filterClass ? filterClass.value : 'INACTIVE');
                break;
            case 'settlements':
                var filterSettle = document.getElementById('filterSettlementStatus');
                loadSettlements(filterSettle ? filterSettle.value : 'PENDING_SETTLEMENT');
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
        showLoading('Classes');
        adminFetch({ action: 'getPendingClasses', status: status || 'INACTIVE', page: 1, limit: 50 }, function(httpStatus, resp) {
            hideLoading('Classes');
            if (resp && resp.success) {
                renderClasses(resp.data.classes || [], status);
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
            if (status === 'INACTIVE') {
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
            var date = formatDate(stl.order_date || stl.created_at || stl.CreatedAt);
            var commRate = Number(stl.commission_rate) || 0;
            var orderAmt = Number(stl.order_amount) || 0;
            var commAmt = Number(stl.commission_amount) || Math.round(orderAmt * commRate / 100);
            var partnerAmt = Number(stl.partner_amount) || (orderAmt - commAmt);

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

    function bindSettlementControls() {
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
                            loadPendingClasses('INACTIVE');
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
                            loadPendingClasses('INACTIVE');
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
            html += '</tr>';
        }
        if (tbody) tbody.innerHTML = html;
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

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        var d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        var y = d.getFullYear();
        var m = ('0' + (d.getMonth() + 1)).slice(-2);
        var day = ('0' + d.getDate()).slice(-2);
        return y + '-' + m + '-' + day;
    }

    function getStatusLabel(status) {
        var map = {
            'PENDING': '\uB300\uAE30',
            'APPROVED': '\uC2B9\uC778',
            'REJECTED': '\uAC70\uBD80',
            'active': '\uD65C\uC131',
            'INACTIVE': '\uB300\uAE30',
            'paused': '\uC77C\uC2DC\uC911\uC9C0',
            'closed': '\uAC70\uBD80',
            'rejected': '\uAC70\uBD80',
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
