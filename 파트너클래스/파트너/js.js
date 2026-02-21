/* ============================================
   PRESSCO21 파트너 대시보드 - js.js
   메이크샵 D4 호환: IIFE, var, \${} 이스케이프
   CSS 스코핑: .partner-dashboard
   ============================================ */
(function() {
    'use strict';

    /* ========================================
       설정값
       ======================================== */

    /** GAS 백엔드 엔드포인트 */
    var GAS_URL = window.PRESSCO21_GAS_URL || '';

    /** 캐시 유효 시간: 5분 (대시보드는 실시간성 중요) */
    var CACHE_TTL = 5 * 60 * 1000;

    /** localStorage 캐시 키 접두사 */
    var CACHE_PREFIX = 'partnerDash_';

    /** 후기 페이지당 건수 */
    var REVIEW_LIMIT = 10;

    /** 디바운스 대기 시간 (밀리초) */
    var DEBOUNCE_DELAY = 300;


    /* ========================================
       상태 관리
       ======================================== */

    /** 현재 로그인한 회원 ID */
    var memberId = '';

    /** 파트너 인증 정보 */
    var partnerData = null;

    /** 현재 활성 탭 */
    var currentTab = 'classes';

    /** 현재 선택된 월 (YYYY-MM) */
    var currentMonth = '';

    /** 대시보드 데이터 (getPartnerDashboard 응답) */
    var dashboardData = null;

    /** 내 강의 목록 (드롭다운 등에 재활용) */
    var myClasses = [];

    /** 후기 페이지네이션 */
    var reviewPage = 1;

    /** API 호출 중복 방지 */
    var isLoading = false;

    /** 디바운스 타이머 */
    var debounceTimer = null;


    /* ========================================
       초기화
       ======================================== */

    /**
     * 페이지 초기화
     */
    function init() {
        // GAS URL 검증
        if (!GAS_URL) {
            console.error('[PartnerDash] GAS_URL이 설정되지 않았습니다.');
            return;
        }

        // 현재 월 설정
        var now = new Date();
        currentMonth = now.getFullYear() + '-' + padZero(now.getMonth() + 1);

        // 회원 ID 읽기 (가상태그에서)
        var memberEl = document.getElementById('pdMemberId');
        if (memberEl) {
            memberId = (memberEl.textContent || '').trim();
        }

        // 미로그인 처리
        if (!memberId) {
            showNotice('login');
            return;
        }

        // 로딩 표시 후 파트너 인증
        showLoading();
        authenticatePartner();

        // 이벤트 바인딩
        bindTabEvents();
        bindModalEvents();
        bindMonthSelector();
    }


    /* ========================================
       파트너 인증
       ======================================== */

    /**
     * 파트너 인증 API 호출
     */
    function authenticatePartner() {
        callGAS('getPartnerAuth', { member_id: memberId }, function(err, data) {
            hideLoading();

            if (err || !data || !data.success) {
                showNotice('nonpartner');
                return;
            }

            var partner = data.data;

            if (!partner || !partner.partner_code) {
                showNotice('nonpartner');
                return;
            }

            // 상태별 분기
            var status = (partner.status || '').toLowerCase();
            if (status === 'pending' || status === 'review') {
                showNotice('pending');
                return;
            }
            if (status === 'inactive' || status === 'suspended') {
                showNotice('inactive');
                return;
            }
            if (status !== 'active') {
                showNotice('nonpartner');
                return;
            }

            // 인증 성공
            partnerData = partner;
            renderDashboardHeader();
            showElement('pdMainArea');

            // 대시보드 데이터 로드
            loadDashboard();
        });
    }

    /**
     * 안내 영역 표시
     * @param {string} type - login/nonpartner/pending/inactive
     */
    function showNotice(type) {
        showElement('pdNoticeArea');
        hideElement('pdMainArea');

        // 모든 안내 숨기기
        hideElement('pdNoticeLogin');
        hideElement('pdNoticeNonPartner');
        hideElement('pdNoticePending');
        hideElement('pdNoticeInactive');

        // 해당 안내만 표시
        var noticeMap = {
            'login': 'pdNoticeLogin',
            'nonpartner': 'pdNoticeNonPartner',
            'pending': 'pdNoticePending',
            'inactive': 'pdNoticeInactive'
        };

        var targetId = noticeMap[type];
        if (targetId) {
            showElement(targetId);
        }
    }


    /* ========================================
       대시보드 헤더 렌더링
       ======================================== */

    /**
     * 파트너 정보 헤더 렌더링
     */
    function renderDashboardHeader() {
        if (!partnerData) return;

        // 파트너 이름
        var nameEl = document.getElementById('pdPartnerName');
        if (nameEl) {
            nameEl.textContent = escapeText(partnerData.partner_name || partnerData.member_id) + '\uB2D8, \uC548\uB155\uD558\uC138\uC694!';
        }

        // 등급 배지
        var badgeEl = document.getElementById('pdGradeBadge');
        if (badgeEl) {
            var grade = (partnerData.grade || 'SILVER').toUpperCase();
            badgeEl.textContent = grade + ' PARTNER';
            badgeEl.className = 'pd-grade-badge pd-grade-badge--' + grade.toLowerCase();
        }

        // 서브타이틀
        var subtitleEl = document.getElementById('pdHeaderSubtitle');
        if (subtitleEl) {
            subtitleEl.textContent = '\uC624\uB298\uC758 \uC218\uC5C5 \uD604\uD669\uC774\uC5D0\uC694.';
        }

        // 월 레이블
        updateMonthLabel();
    }


    /* ========================================
       대시보드 데이터 로드
       ======================================== */

    /**
     * 대시보드 초기 데이터 로드
     */
    function loadDashboard() {
        showLoading();

        callGAS('getPartnerDashboard', {
            member_id: memberId,
            month: currentMonth
        }, function(err, data) {
            hideLoading();

            if (err || !data || !data.success) {
                showToast('\uB300\uC2DC\uBCF4\uB4DC \uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.', 'error');
                return;
            }

            dashboardData = data.data || {};
            myClasses = dashboardData.classes || [];

            // 요약 카드 렌더링
            renderSummaryCards();

            // 강의 필터 드롭다운 채우기
            populateClassDropdowns();

            // 수익 월 드롭다운 채우기
            populateRevenueMonths();

            // 현재 탭 데이터 로드
            loadTabData(currentTab);
        });
    }


    /* ========================================
       요약 카드
       ======================================== */

    /**
     * 상단 요약 카드 4개 렌더링
     */
    function renderSummaryCards() {
        if (!dashboardData) return;

        var summary = dashboardData.summary || {};

        setTextById('pdSumRevenue', formatPrice(summary.total_revenue || 0) + '\uC6D0');
        setTextById('pdSumFee', formatPrice(summary.total_fee || 0) + '\uC6D0');
        setTextById('pdSumReserve', formatPrice(summary.available_reserve || 0) + '\uC6D0');
        setTextById('pdSumBooking', (summary.total_bookings || 0) + '\uAC74');
    }


    /* ========================================
       탭 관리
       ======================================== */

    /**
     * 탭 버튼 이벤트 바인딩
     */
    function bindTabEvents() {
        var tabContainer = document.querySelector('.partner-dashboard .pd-tabs');
        if (!tabContainer) return;

        tabContainer.addEventListener('click', function(e) {
            var btn = e.target.closest('.pd-tabs__btn');
            if (!btn || btn.classList.contains('is-active')) return;

            var tabName = btn.getAttribute('data-tab');
            if (tabName) {
                switchTab(tabName);
            }
        });
    }

    /**
     * 탭 전환
     * @param {string} tabName - classes/bookings/revenue/reviews
     */
    function switchTab(tabName) {
        currentTab = tabName;

        // 탭 버튼 활성화
        var tabBtns = document.querySelectorAll('.partner-dashboard .pd-tabs__btn');
        for (var i = 0; i < tabBtns.length; i++) {
            var isTarget = tabBtns[i].getAttribute('data-tab') === tabName;
            tabBtns[i].classList.toggle('is-active', isTarget);
            tabBtns[i].setAttribute('aria-selected', isTarget ? 'true' : 'false');
        }

        // 탭 콘텐츠 활성화
        var tabPanels = document.querySelectorAll('.partner-dashboard .pd-tab-content');
        for (var j = 0; j < tabPanels.length; j++) {
            tabPanels[j].classList.remove('is-active');
        }

        var targetMap = {
            'classes': 'pdTabClasses',
            'bookings': 'pdTabBookings',
            'revenue': 'pdTabRevenue',
            'reviews': 'pdTabReviews'
        };

        var targetId = targetMap[tabName];
        if (targetId) {
            var panel = document.getElementById(targetId);
            if (panel) panel.classList.add('is-active');
        }

        // 탭 데이터 로드
        loadTabData(tabName);
    }

    /**
     * 탭별 데이터 로드
     * @param {string} tabName
     */
    function loadTabData(tabName) {
        switch (tabName) {
            case 'classes':
                renderMyClasses();
                break;
            case 'bookings':
                loadBookings();
                break;
            case 'revenue':
                loadRevenue();
                break;
            case 'reviews':
                reviewPage = 1;
                loadReviews();
                break;
        }
    }


    /* ========================================
       탭 1: 내 강의
       ======================================== */

    /**
     * 내 강의 목록 렌더링
     */
    function renderMyClasses() {
        var container = document.getElementById('pdClassList');
        var emptyEl = document.getElementById('pdClassEmpty');
        if (!container) return;

        var classes = myClasses;

        if (!classes || classes.length === 0) {
            container.innerHTML = '';
            if (emptyEl) emptyEl.style.display = '';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';

        // SVG defs (반별 그라데이션)
        var html = '<svg width="0" height="0" style="position:absolute" aria-hidden="true">'
            + '<defs><linearGradient id="pdHalfStarGrad">'
            + '<stop offset="50%" stop-color="#F5A623"/>'
            + '<stop offset="50%" stop-color="#DDD"/>'
            + '</linearGradient></defs></svg>';

        for (var i = 0; i < classes.length; i++) {
            html += renderClassCard(classes[i]);
        }

        container.innerHTML = html;

        // 상태 토글 버튼 이벤트
        bindClassStatusButtons();
    }

    /**
     * 강의 카드 HTML 생성
     * @param {Object} cls - 강의 데이터
     * @returns {string}
     */
    function renderClassCard(cls) {
        var classId = escapeAttr(cls.class_id || '');
        var className = escapeHtml(cls.class_name || '');
        var category = escapeHtml(cls.category || '');
        var status = (cls.status || 'active').toLowerCase();
        var statusLabel = { 'active': '\uD65C\uC131', 'inactive': '\uBE44\uD65C\uC131', 'pending': '\uC2EC\uC0AC\uC911' }[status] || status;
        var avgRating = parseFloat(cls.avg_rating) || 0;
        var bookingCount = parseInt(cls.booking_count) || 0;
        var thumbnail = cls.thumbnail_url || '';

        var starsHtml = renderStars(avgRating, 'pd-review-card');
        var thumbHtml = thumbnail
            ? '<img src="' + escapeAttr(thumbnail) + '" alt="' + escapeAttr(cls.class_name || '') + '" loading="lazy">'
            : '';

        var toggleBtnText = status === 'active' ? '\uBE44\uD65C\uC131\uD654' : '\uD65C\uC131\uD654';
        var toggleBtnClass = status === 'active' ? 'pd-btn--outline pd-btn--sm' : 'pd-btn--gold pd-btn--sm';
        var showToggle = status === 'active' || status === 'inactive';

        var html = '<div class="pd-class-card" data-class-id="' + classId + '">'
            + '<div class="pd-class-card__top">'
            + '<div class="pd-class-card__thumb">' + thumbHtml + '</div>'
            + '<div class="pd-class-card__info">'
            + '<h3 class="pd-class-card__title">' + className + '</h3>'
            + '<div class="pd-class-card__meta">'
            + '<span>' + category + '</span>'
            + '<span class="pd-status-badge pd-status-badge--' + status + '">' + escapeHtml(statusLabel) + '</span>'
            + '</div>'
            + '</div>'
            + '</div>'
            + '<div class="pd-class-card__bottom">'
            + '<div class="pd-class-card__stats">'
            + '<span class="pd-class-card__stat">\uC608\uC57D <strong>' + bookingCount + '</strong></span>'
            + '<span class="pd-class-card__stat">\uD3C9\uC810 <strong>' + (avgRating > 0 ? avgRating.toFixed(1) : '-') + '</strong></span>'
            + '</div>';

        if (showToggle) {
            html += '<button type="button" class="pd-btn ' + toggleBtnClass + ' js-toggle-status" '
                + 'data-class-id="' + classId + '" data-status="' + status + '">'
                + escapeHtml(toggleBtnText) + '</button>';
        }

        html += '</div></div>';

        return html;
    }

    /**
     * 강의 상태 토글 버튼 이벤트 바인딩
     */
    function bindClassStatusButtons() {
        var container = document.getElementById('pdClassList');
        if (!container) return;

        container.addEventListener('click', function(e) {
            var btn = e.target.closest('.js-toggle-status');
            if (!btn) return;

            var classId = btn.getAttribute('data-class-id');
            var currentStatus = btn.getAttribute('data-status');
            var newStatus = currentStatus === 'active' ? 'inactive' : 'active';

            toggleClassStatus(classId, newStatus);
        });

        // 새 강의 등록 버튼
        var newClassBtn = document.getElementById('pdBtnNewClass');
        if (newClassBtn) {
            newClassBtn.addEventListener('click', function() {
                openModal('pdNewClassModal');
            });
        }
    }

    /**
     * 강의 상태 변경 API 호출
     * @param {string} classId
     * @param {string} newStatus
     */
    function toggleClassStatus(classId, newStatus) {
        showLoading();

        postGAS('updateClassStatus', {
            member_id: memberId,
            class_id: classId,
            status: newStatus
        }, function(err, data) {
            hideLoading();

            if (err || !data || !data.success) {
                showToast('\uC0C1\uD0DC \uBCC0\uACBD\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.', 'error');
                return;
            }

            // 로컬 데이터 업데이트
            for (var i = 0; i < myClasses.length; i++) {
                if (myClasses[i].class_id === classId) {
                    myClasses[i].status = newStatus;
                    break;
                }
            }

            var statusLabel = newStatus === 'active' ? '\uD65C\uC131\uD654' : '\uBE44\uD65C\uC131\uD654';
            showToast('\uAC15\uC758\uAC00 ' + statusLabel + '\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success');
            renderMyClasses();
        });
    }


    /* ========================================
       탭 2: 예약 현황
       ======================================== */

    /**
     * 예약 현황 로드
     */
    function loadBookings() {
        var periodSelect = document.getElementById('pdBookingPeriod');
        var classSelect = document.getElementById('pdBookingClass');
        if (!periodSelect) return;

        // 기간 필터에 따른 날짜 계산
        var dates = calculatePeriodDates(periodSelect.value);

        var params = {
            member_id: memberId,
            date_from: dates.from,
            date_to: dates.to
        };

        if (classSelect && classSelect.value) {
            params.class_id = classSelect.value;
        }

        showLoading();

        callGAS('getPartnerBookings', params, function(err, data) {
            hideLoading();

            if (err || !data || !data.success) {
                showToast('\uC608\uC57D \uD604\uD669\uC744 \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.', 'error');
                return;
            }

            var bookingsData = data.data || {};
            var bookings = bookingsData.bookings || [];
            renderBookings(bookings);
        });

        // 이벤트 바인딩 (한 번만)
        if (!periodSelect._pdBound) {
            periodSelect._pdBound = true;
            periodSelect.addEventListener('change', function() {
                // 직접 입력 표시/숨김
                var customArea = document.getElementById('pdBookingCustomDate');
                if (customArea) {
                    customArea.style.display = this.value === 'custom' ? '' : 'none';
                }
                debounce(loadBookings);
            });

            if (classSelect) {
                classSelect.addEventListener('change', function() {
                    debounce(loadBookings);
                });
            }

            // 직접 입력 날짜 변경 이벤트
            var dateFrom = document.getElementById('pdBookingDateFrom');
            var dateTo = document.getElementById('pdBookingDateTo');
            if (dateFrom) dateFrom.addEventListener('change', function() { debounce(loadBookings); });
            if (dateTo) dateTo.addEventListener('change', function() { debounce(loadBookings); });
        }
    }

    /**
     * 예약 목록 렌더링
     * @param {Array} bookings
     */
    function renderBookings(bookings) {
        var tableWrap = document.getElementById('pdBookingTable');
        var emptyEl = document.getElementById('pdBookingEmpty');
        var summaryEl = document.getElementById('pdBookingSummary');

        if (!tableWrap) return;

        if (!bookings || bookings.length === 0) {
            tableWrap.innerHTML = '';
            if (emptyEl) emptyEl.style.display = '';
            if (summaryEl) summaryEl.innerHTML = '';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';

        // 상태별 카운트
        var statusCounts = {};
        for (var i = 0; i < bookings.length; i++) {
            var st = bookings[i].status || 'unknown';
            statusCounts[st] = (statusCounts[st] || 0) + 1;
        }

        // 요약 렌더링
        if (summaryEl) {
            var summaryHtml = '';
            var statusLabels = {
                'confirmed': '\uD655\uC815',
                'pending': '\uB300\uAE30',
                'completed': '\uC644\uB8CC',
                'cancelled': '\uCDE8\uC18C'
            };

            var statusKeys = Object.keys(statusCounts);
            for (var s = 0; s < statusKeys.length; s++) {
                var key = statusKeys[s];
                var label = statusLabels[key] || key;
                summaryHtml += '<div class="pd-booking-stat">'
                    + '<span>' + escapeHtml(label) + '</span>'
                    + '<span class="pd-booking-stat__count">' + statusCounts[key] + '</span>'
                    + '</div>';
            }

            summaryEl.innerHTML = summaryHtml;
        }

        // PC 테이블
        var tableHtml = '<table class="pd-table">'
            + '<thead><tr>'
            + '<th>\uAC15\uC758\uBA85</th>'
            + '<th>\uB0A0\uC9DC</th>'
            + '<th>\uC218\uAC15\uC0DD</th>'
            + '<th>\uC5F0\uB77D\uCC98</th>'
            + '<th>\uAE08\uC561</th>'
            + '<th>\uC0C1\uD0DC</th>'
            + '</tr></thead><tbody>';

        // 모바일 카드
        var mobileHtml = '<div class="pd-mobile-cards">';

        for (var j = 0; j < bookings.length; j++) {
            var bk = bookings[j];
            /* GAS 응답 필드: booking_date, student_name_masked, student_phone_masked, order_amount, status */
            var bkStatus = (bk.status || '').toLowerCase();
            var bkStatusLabel = { 'confirmed': '\uD655\uC815', 'pending': '\uB300\uAE30', 'completed': '\uC644\uB8CC', 'cancelled': '\uCDE8\uC18C' }[bkStatus] || bkStatus;
            var bkStatusClass = bkStatus === 'completed' ? 'completed' : bkStatus === 'confirmed' ? 'active' : bkStatus === 'cancelled' ? 'failed' : 'pending';

            tableHtml += '<tr>'
                + '<td>' + escapeHtml(bk.class_name || '') + '</td>'
                + '<td>' + formatDate(bk.booking_date || bk.schedule_date) + '</td>'
                + '<td>' + escapeHtml(bk.student_name_masked || '') + '</td>'
                + '<td>' + escapeHtml(bk.student_phone_masked || '') + '</td>'
                + '<td class="pd-table__amount">' + formatPrice(bk.order_amount || 0) + '\uC6D0</td>'
                + '<td><span class="pd-status-badge pd-status-badge--' + bkStatusClass + '">' + escapeHtml(bkStatusLabel) + '</span></td>'
                + '</tr>';

            mobileHtml += '<div class="pd-mobile-card">'
                + '<div class="pd-mobile-card__row">'
                + '<span class="pd-mobile-card__label">\uAC15\uC758</span>'
                + '<span class="pd-mobile-card__value">' + escapeHtml(bk.class_name || '') + '</span>'
                + '</div>'
                + '<div class="pd-mobile-card__row">'
                + '<span class="pd-mobile-card__label">\uB0A0\uC9DC</span>'
                + '<span class="pd-mobile-card__value">' + formatDate(bk.booking_date || bk.schedule_date) + '</span>'
                + '</div>'
                + '<div class="pd-mobile-card__row">'
                + '<span class="pd-mobile-card__label">\uC218\uAC15\uC0DD</span>'
                + '<span class="pd-mobile-card__value">' + escapeHtml(bk.student_name_masked || '') + '</span>'
                + '</div>'
                + '<div class="pd-mobile-card__row">'
                + '<span class="pd-mobile-card__label">\uC5F0\uB77D\uCC98</span>'
                + '<span class="pd-mobile-card__value">' + escapeHtml(bk.student_phone_masked || '') + '</span>'
                + '</div>'
                + '<div class="pd-mobile-card__row">'
                + '<span class="pd-mobile-card__label">\uAE08\uC561</span>'
                + '<span class="pd-mobile-card__value pd-mobile-card__value--strong">' + formatPrice(bk.order_amount || 0) + '\uC6D0</span>'
                + '</div>'
                + '<div class="pd-mobile-card__row">'
                + '<span class="pd-mobile-card__label">\uC0C1\uD0DC</span>'
                + '<span class="pd-mobile-card__value"><span class="pd-status-badge pd-status-badge--' + bkStatusClass + '">' + escapeHtml(bkStatusLabel) + '</span></span>'
                + '</div>'
                + '</div>';
        }

        tableHtml += '</tbody></table>';
        mobileHtml += '</div>';

        tableWrap.innerHTML = tableHtml + mobileHtml;
    }


    /* ========================================
       탭 3: 수익 리포트
       ======================================== */

    /**
     * 수익 리포트 로드
     */
    function loadRevenue() {
        var monthSelect = document.getElementById('pdRevenueMonth');
        var selectedMonth = monthSelect ? monthSelect.value : currentMonth;

        showLoading();

        callGAS('getPartnerDashboard', {
            member_id: memberId,
            month: selectedMonth
        }, function(err, data) {
            hideLoading();

            if (err || !data || !data.success) {
                showToast('\uC218\uC775 \uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.', 'error');
                return;
            }

            var revenueData = data.data || {};
            renderRevenue(revenueData);
        });

        // 월 변경 이벤트 (한 번만)
        if (monthSelect && !monthSelect._pdBound) {
            monthSelect._pdBound = true;
            monthSelect.addEventListener('change', function() {
                loadRevenue();
            });
        }
    }

    /**
     * 수익 리포트 렌더링
     * @param {Object} data
     */
    function renderRevenue(data) {
        var summaryEl = document.getElementById('pdRevenueSummary');
        var tableWrap = document.getElementById('pdRevenueTable');
        var emptyEl = document.getElementById('pdRevenueEmpty');

        var settlement = data.settlement || {};
        var items = settlement.items || [];

        // 집계 카드
        if (summaryEl) {
            summaryEl.innerHTML = '<div class="pd-revenue-card">'
                + '<p class="pd-revenue-card__label">\uCD1D \uB9E4\uCD9C</p>'
                + '<p class="pd-revenue-card__value">' + formatPrice(settlement.total_revenue || 0) + '\uC6D0</p>'
                + '</div>'
                + '<div class="pd-revenue-card">'
                + '<p class="pd-revenue-card__label">\uC218\uC218\uB8CC</p>'
                + '<p class="pd-revenue-card__value">' + formatPrice(settlement.total_fee || 0) + '\uC6D0</p>'
                + '</div>'
                + '<div class="pd-revenue-card">'
                + '<p class="pd-revenue-card__label">\uC801\uB9BD\uAE08 \uC804\uD658</p>'
                + '<p class="pd-revenue-card__value pd-revenue-card__value--green">' + formatPrice(settlement.total_reserve || 0) + '\uC6D0</p>'
                + '</div>'
                + '<div class="pd-revenue-card">'
                + '<p class="pd-revenue-card__label">\uC644\uB8CC \uAC74\uC218</p>'
                + '<p class="pd-revenue-card__value pd-revenue-card__value--gold">' + (settlement.completed_count || 0) + '\uAC74</p>'
                + '</div>';
        }

        if (!tableWrap) return;

        if (!items || items.length === 0) {
            tableWrap.innerHTML = '';
            if (emptyEl) emptyEl.style.display = '';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';

        // PC 테이블
        var tableHtml = '<table class="pd-table">'
            + '<thead><tr>'
            + '<th>\uB0A0\uC9DC</th>'
            + '<th>\uAC15\uC758\uBA85</th>'
            + '<th>\uC218\uAC15\uC0DD</th>'
            + '<th>\uAE08\uC561</th>'
            + '<th>\uC218\uC218\uB8CC</th>'
            + '<th>\uC801\uB9BD\uAE08</th>'
            + '<th>\uC0C1\uD0DC</th>'
            + '</tr></thead><tbody>';

        // 모바일 카드
        var mobileHtml = '<div class="pd-mobile-cards">';

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var stStatus = (item.status || '').toUpperCase();
            var stStatusLabel = { 'COMPLETED': '\uC644\uB8CC', 'PENDING': '\uB300\uAE30', 'FAILED': '\uC2E4\uD328' }[stStatus] || stStatus;
            var stStatusClass = stStatus === 'COMPLETED' ? 'completed' : stStatus === 'FAILED' ? 'failed' : 'pending';

            tableHtml += '<tr>'
                + '<td>' + formatDate(item.date) + '</td>'
                + '<td>' + escapeHtml(item.class_name || '') + '</td>'
                + '<td>' + escapeHtml(item.student_name || '') + '</td>'
                + '<td class="pd-table__amount">' + formatPrice(item.amount || 0) + '\uC6D0</td>'
                + '<td>' + formatPrice(item.fee || 0) + '\uC6D0</td>'
                + '<td>' + formatPrice(item.reserve || 0) + '\uC6D0</td>'
                + '<td><span class="pd-status-badge pd-status-badge--' + stStatusClass + '">' + escapeHtml(stStatusLabel) + '</span></td>'
                + '</tr>';

            mobileHtml += '<div class="pd-mobile-card">'
                + '<div class="pd-mobile-card__row">'
                + '<span class="pd-mobile-card__label">\uB0A0\uC9DC</span>'
                + '<span class="pd-mobile-card__value">' + formatDate(item.date) + '</span>'
                + '</div>'
                + '<div class="pd-mobile-card__row">'
                + '<span class="pd-mobile-card__label">\uAC15\uC758</span>'
                + '<span class="pd-mobile-card__value">' + escapeHtml(item.class_name || '') + '</span>'
                + '</div>'
                + '<div class="pd-mobile-card__row">'
                + '<span class="pd-mobile-card__label">\uC218\uAC15\uC0DD</span>'
                + '<span class="pd-mobile-card__value">' + escapeHtml(item.student_name || '') + '</span>'
                + '</div>'
                + '<div class="pd-mobile-card__row">'
                + '<span class="pd-mobile-card__label">\uAE08\uC561</span>'
                + '<span class="pd-mobile-card__value pd-mobile-card__value--strong">' + formatPrice(item.amount || 0) + '\uC6D0</span>'
                + '</div>'
                + '<div class="pd-mobile-card__row">'
                + '<span class="pd-mobile-card__label">\uC218\uC218\uB8CC</span>'
                + '<span class="pd-mobile-card__value">' + formatPrice(item.fee || 0) + '\uC6D0</span>'
                + '</div>'
                + '<div class="pd-mobile-card__row">'
                + '<span class="pd-mobile-card__label">\uC801\uB9BD\uAE08</span>'
                + '<span class="pd-mobile-card__value">' + formatPrice(item.reserve || 0) + '\uC6D0</span>'
                + '</div>'
                + '<div class="pd-mobile-card__row">'
                + '<span class="pd-mobile-card__label">\uC0C1\uD0DC</span>'
                + '<span class="pd-mobile-card__value"><span class="pd-status-badge pd-status-badge--' + stStatusClass + '">' + escapeHtml(stStatusLabel) + '</span></span>'
                + '</div>'
                + '</div>';
        }

        tableHtml += '</tbody></table>';
        mobileHtml += '</div>';

        tableWrap.innerHTML = tableHtml + mobileHtml;
    }


    /* ========================================
       탭 4: 후기 관리
       ======================================== */

    /**
     * 후기 목록 로드
     */
    function loadReviews() {
        var classSelect = document.getElementById('pdReviewClass');

        var params = {
            member_id: memberId,
            page: reviewPage,
            limit: REVIEW_LIMIT
        };

        if (classSelect && classSelect.value) {
            params.class_id = classSelect.value;
        }

        showLoading();

        callGAS('getPartnerReviews', params, function(err, data) {
            hideLoading();

            if (err || !data || !data.success) {
                showToast('\uD6C4\uAE30\uB97C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.', 'error');
                return;
            }

            var reviewData = data.data || {};
            var reviews = reviewData.reviews || [];
            var pagination = reviewData.pagination || {};
            /* GAS 응답: summary.rating_distribution (키가 숫자 5,4,3,2,1),
               summary.avg_rating, summary.total_count */
            var summary = reviewData.summary || {};
            var ratingDist = summary.rating_distribution || {};
            var distribution = {
                avg: summary.avg_rating || 0,
                total: summary.total_count || 0,
                star5: ratingDist[5] || ratingDist['5'] || 0,
                star4: ratingDist[4] || ratingDist['4'] || 0,
                star3: ratingDist[3] || ratingDist['3'] || 0,
                star2: ratingDist[2] || ratingDist['2'] || 0,
                star1: ratingDist[1] || ratingDist['1'] || 0
            };

            renderRatingDistribution(distribution);
            renderReviews(reviews);
            renderReviewPagination(pagination);
        });

        // 필터 이벤트 (한 번만)
        if (classSelect && !classSelect._pdBound) {
            classSelect._pdBound = true;
            classSelect.addEventListener('change', function() {
                reviewPage = 1;
                loadReviews();
            });
        }
    }

    /**
     * 별점 분포 렌더링
     * @param {Object} dist - { avg, total, star5, star4, star3, star2, star1 }
     */
    function renderRatingDistribution(dist) {
        var container = document.getElementById('pdRatingDist');
        if (!container) return;

        var avg = parseFloat(dist.avg) || 0;
        var total = parseInt(dist.total) || 0;

        var starsHtml = renderStars(avg, 'pd-rating-dist');

        var barsHtml = '';
        for (var s = 5; s >= 1; s--) {
            var count = parseInt(dist['star' + s]) || 0;
            var pct = total > 0 ? Math.round((count / total) * 100) : 0;

            barsHtml += '<div class="pd-rating-bar">'
                + '<span class="pd-rating-bar__label">' + s + '</span>'
                + '<div class="pd-rating-bar__track">'
                + '<div class="pd-rating-bar__fill" style="width:' + pct + '%"></div>'
                + '</div>'
                + '<span class="pd-rating-bar__count">' + count + '</span>'
                + '</div>';
        }

        container.innerHTML = '<div class="pd-rating-dist__avg">'
            + '<div class="pd-rating-dist__score">' + avg.toFixed(1) + '</div>'
            + '<div class="pd-rating-dist__stars">' + starsHtml + '</div>'
            + '<div class="pd-rating-dist__count">\uCD1D ' + total + '\uAC74</div>'
            + '</div>'
            + '<div class="pd-rating-dist__bars">' + barsHtml + '</div>';
    }

    /**
     * 후기 목록 렌더링
     * @param {Array} reviews
     */
    function renderReviews(reviews) {
        var container = document.getElementById('pdReviewList');
        var emptyEl = document.getElementById('pdReviewEmpty');
        if (!container) return;

        if (!reviews || reviews.length === 0) {
            container.innerHTML = '';
            if (emptyEl) emptyEl.style.display = '';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';

        // SVG defs
        var html = '<svg width="0" height="0" style="position:absolute" aria-hidden="true">'
            + '<defs><linearGradient id="pdRevHalfStarGrad">'
            + '<stop offset="50%" stop-color="#F5A623"/>'
            + '<stop offset="50%" stop-color="#DDD"/>'
            + '</linearGradient></defs></svg>';

        for (var i = 0; i < reviews.length; i++) {
            html += renderReviewCard(reviews[i]);
        }

        container.innerHTML = html;

        // 답변 버튼 이벤트
        bindReviewReplyButtons();
    }

    /**
     * 후기 카드 HTML 생성
     * @param {Object} review
     * @returns {string}
     */
    function renderReviewCard(review) {
        var rating = parseInt(review.rating) || 0;
        var starsHtml = renderStars(rating, 'pd-review-card');
        var reviewId = escapeAttr(review.review_id || '');
        /* GAS 응답 필드: partner_answer (답변), reviewer_name_masked (리뷰어), has_answer */
        var replyText = review.partner_answer || '';
        var hasReply = review.has_answer || (replyText && replyText.trim());

        var html = '<div class="pd-review-card" data-review-id="' + reviewId + '">'
            + '<div class="pd-review-card__header">'
            + '<div class="pd-review-card__stars">' + starsHtml + '</div>'
            + '<span class="pd-review-card__date">' + formatDate(review.created_at) + '</span>'
            + '</div>';

        if (review.class_name) {
            html += '<div class="pd-review-card__class">' + escapeHtml(review.class_name) + '</div>';
        }

        html += '<div class="pd-review-card__text">' + escapeHtml(review.content || '') + '</div>';

        /* GAS 필드: reviewer_name_masked (마스킹된 이름) */
        if (review.reviewer_name_masked) {
            html += '<div class="pd-review-card__author">' + escapeHtml(review.reviewer_name_masked) + '</div>';
        }

        // 기존 답변
        if (hasReply) {
            html += '<div class="pd-review-card__reply">'
                + '<div class="pd-review-card__reply-label">\uD30C\uD2B8\uB108 \uB2F5\uBCC0</div>'
                + '<div class="pd-review-card__reply-text">' + escapeHtml(replyText) + '</div>'
                + '</div>';
        }

        // 답변 버튼
        html += '<div style="margin-top:12px">';
        if (hasReply) {
            html += '<button type="button" class="pd-btn pd-btn--outline pd-btn--sm js-reply-btn" '
                + 'data-review-id="' + reviewId + '" data-has-reply="true">\uB2F5\uBCC0 \uC218\uC815</button>';
        } else {
            html += '<button type="button" class="pd-btn pd-btn--gold pd-btn--sm js-reply-btn" '
                + 'data-review-id="' + reviewId + '" data-has-reply="false">\uB2F5\uBCC0 \uC791\uC131</button>';
        }
        html += '</div>';

        html += '</div>';

        return html;
    }

    /**
     * 후기 답변 버튼 이벤트 바인딩
     */
    function bindReviewReplyButtons() {
        var container = document.getElementById('pdReviewList');
        if (!container) return;

        container.addEventListener('click', function(e) {
            var btn = e.target.closest('.js-reply-btn');
            if (!btn) return;

            var reviewId = btn.getAttribute('data-review-id');
            openReplyModal(reviewId);
        });
    }

    /**
     * 후기 답변 모달 열기
     * @param {string} reviewId
     */
    function openReplyModal(reviewId) {
        var modal = document.getElementById('pdReplyModal');
        if (!modal) return;

        // 원본 후기 찾기 (querySelector injection 방지: 루프로 안전하게 검색)
        var reviewCard = null;
        var allReviewCards = document.querySelectorAll('.partner-dashboard .pd-review-card');
        for (var rc = 0; rc < allReviewCards.length; rc++) {
            if (allReviewCards[rc].getAttribute('data-review-id') === reviewId) {
                reviewCard = allReviewCards[rc];
                break;
            }
        }
        var previewEl = document.getElementById('pdReplyReviewPreview');
        var textarea = document.getElementById('pdReplyTextarea');
        var charCountEl = document.getElementById('pdReplyCharCount');
        var submitBtn = document.getElementById('pdReplySubmit');

        if (previewEl && reviewCard) {
            var textEl = reviewCard.querySelector('.pd-review-card__text');
            previewEl.textContent = textEl ? textEl.textContent : '';
        }

        // 기존 답변이 있으면 채우기
        if (textarea) {
            var existingReply = reviewCard ? reviewCard.querySelector('.pd-review-card__reply-text') : null;
            textarea.value = existingReply ? existingReply.textContent : '';
            if (charCountEl) charCountEl.textContent = textarea.value.length;
        }

        // 저장 버튼에 reviewId 저장
        if (submitBtn) {
            submitBtn.setAttribute('data-review-id', reviewId);
        }

        openModal('pdReplyModal');

        // 글자수 카운터
        if (textarea && !textarea._pdBound) {
            textarea._pdBound = true;
            textarea.addEventListener('input', function() {
                if (charCountEl) charCountEl.textContent = this.value.length;
            });
        }
    }

    /**
     * 후기 답변 저장
     * @param {string} reviewId
     * @param {string} answer
     */
    function submitReply(reviewId, answer) {
        if (!answer || !answer.trim()) {
            showToast('\uB2F5\uBCC0 \uB0B4\uC6A9\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694.', 'error');
            return;
        }

        showLoading();

        postGAS('replyToReview', {
            member_id: memberId,
            review_id: reviewId,
            answer: answer.trim()
        }, function(err, data) {
            hideLoading();

            if (err || !data || !data.success) {
                showToast('\uB2F5\uBCC0 \uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.', 'error');
                return;
            }

            showToast('\uB2F5\uBCC0\uC774 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success');
            closeModal('pdReplyModal');

            // 후기 새로고침
            loadReviews();
        });
    }

    /**
     * 후기 페이지네이션 렌더링
     * @param {Object} pagination - { page, totalPages, totalCount }
     */
    function renderReviewPagination(pagination) {
        var container = document.getElementById('pdReviewPagination');
        if (!container) return;

        /* GAS 응답: total_pages (스네이크 케이스) */
        var totalPages = pagination.total_pages || pagination.totalPages || 1;
        var page = pagination.page || 1;

        if (totalPages <= 1) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';

        var html = '';

        // 이전 버튼
        html += '<button class="pd-pagination__btn' + (page <= 1 ? ' is-disabled' : '') + '" data-page="' + (page - 1) + '"'
            + (page <= 1 ? ' disabled' : '') + '>'
            + '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            + '</button>';

        // 페이지 번호
        for (var p = 1; p <= totalPages; p++) {
            html += '<button class="pd-pagination__btn' + (p === page ? ' is-active' : '') + '" data-page="' + p + '">'
                + p + '</button>';
        }

        // 다음 버튼
        html += '<button class="pd-pagination__btn' + (page >= totalPages ? ' is-disabled' : '') + '" data-page="' + (page + 1) + '"'
            + (page >= totalPages ? ' disabled' : '') + '>'
            + '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            + '</button>';

        container.innerHTML = html;

        // 이벤트 바인딩
        container.onclick = function(e) {
            var btn = e.target.closest('.pd-pagination__btn');
            if (!btn || btn.classList.contains('is-disabled') || btn.classList.contains('is-active')) return;

            var newPage = parseInt(btn.getAttribute('data-page'));
            if (isNaN(newPage) || newPage < 1) return;

            reviewPage = newPage;
            loadReviews();
        };
    }


    /* ========================================
       월 선택기
       ======================================== */

    /**
     * 월 선택 이벤트 바인딩
     */
    function bindMonthSelector() {
        var prevBtn = document.getElementById('pdMonthPrev');
        var nextBtn = document.getElementById('pdMonthNext');

        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                changeMonth(-1);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                changeMonth(1);
            });
        }
    }

    /**
     * 월 변경
     * @param {number} delta - -1 또는 +1
     */
    function changeMonth(delta) {
        var parts = currentMonth.split('-');
        var year = parseInt(parts[0]);
        var month = parseInt(parts[1]);

        month += delta;
        if (month > 12) { month = 1; year++; }
        if (month < 1) { month = 12; year--; }

        currentMonth = year + '-' + padZero(month);
        updateMonthLabel();

        // 데이터 새로고침
        loadDashboard();
    }

    /**
     * 월 레이블 업데이트
     */
    function updateMonthLabel() {
        var labelEl = document.getElementById('pdMonthLabel');
        if (!labelEl) return;

        var parts = currentMonth.split('-');
        labelEl.textContent = parts[0] + '\uB144 ' + parseInt(parts[1]) + '\uC6D4';
    }


    /* ========================================
       드롭다운 채우기
       ======================================== */

    /**
     * 강의 필터 드롭다운 채우기 (예약/후기 탭에서 사용)
     */
    function populateClassDropdowns() {
        var dropdowns = ['pdBookingClass', 'pdReviewClass'];

        for (var d = 0; d < dropdowns.length; d++) {
            var select = document.getElementById(dropdowns[d]);
            if (!select) continue;

            // 기존 옵션 (첫 번째 "전체 강의"는 유지)
            var firstOption = select.querySelector('option');
            select.innerHTML = '';
            if (firstOption) select.appendChild(firstOption);

            for (var i = 0; i < myClasses.length; i++) {
                var cls = myClasses[i];
                var option = document.createElement('option');
                option.value = cls.class_id || '';
                option.textContent = cls.class_name || '';
                select.appendChild(option);
            }
        }
    }

    /**
     * 수익 월 드롭다운 채우기 (최근 6개월)
     */
    function populateRevenueMonths() {
        var select = document.getElementById('pdRevenueMonth');
        if (!select) return;

        select.innerHTML = '';

        var now = new Date();
        for (var i = 0; i < 6; i++) {
            var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            var val = d.getFullYear() + '-' + padZero(d.getMonth() + 1);
            var label = d.getFullYear() + '\uB144 ' + (d.getMonth() + 1) + '\uC6D4';

            var option = document.createElement('option');
            option.value = val;
            option.textContent = label;
            if (val === currentMonth) option.selected = true;
            select.appendChild(option);
        }
    }


    /* ========================================
       모달 관리
       ======================================== */

    /**
     * 모달 이벤트 바인딩
     */
    function bindModalEvents() {
        // 닫기 버튼, 배경 클릭, 취소 버튼
        var modals = document.querySelectorAll('.partner-dashboard .pd-modal');
        for (var i = 0; i < modals.length; i++) {
            (function(modal) {
                var closeBtn = modal.querySelector('.pd-modal__close');
                var cancelBtn = modal.querySelector('.pd-modal__cancel');
                var backdrop = modal.querySelector('.pd-modal__backdrop');

                if (closeBtn) closeBtn.addEventListener('click', function() { closeModal(modal.id); });
                if (cancelBtn) cancelBtn.addEventListener('click', function() { closeModal(modal.id); });
                if (backdrop) backdrop.addEventListener('click', function() { closeModal(modal.id); });
            })(modals[i]);
        }

        // 후기 답변 저장 버튼
        var replySubmitBtn = document.getElementById('pdReplySubmit');
        if (replySubmitBtn) {
            replySubmitBtn.addEventListener('click', function() {
                var reviewId = this.getAttribute('data-review-id');
                var textarea = document.getElementById('pdReplyTextarea');
                var answer = textarea ? textarea.value : '';
                submitReply(reviewId, answer);
            });
        }
    }

    /**
     * 모달 열기
     * @param {string} modalId
     */
    function openModal(modalId) {
        var modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * 모달 닫기
     * @param {string} modalId
     */
    function closeModal(modalId) {
        var modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }


    /* ========================================
       토스트 알림
       ======================================== */

    /**
     * 토스트 메시지 표시
     * @param {string} message
     * @param {string} type - 'success' 또는 'error'
     */
    function showToast(message, type) {
        var container = document.getElementById('pdToastContainer');
        if (!container) return;

        var toast = document.createElement('div');
        toast.className = 'pd-toast pd-toast--' + (type || 'success');
        toast.textContent = message;

        container.appendChild(toast);

        // 3초 후 자동 제거
        setTimeout(function() {
            toast.style.animation = 'pdToastOut 0.3s ease-out forwards';
            setTimeout(function() {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }


    /* ========================================
       GAS API 통신
       ======================================== */

    /**
     * GAS GET 호출
     * @param {string} action - API 액션명
     * @param {Object} params - 파라미터 객체
     * @param {Function} callback - function(err, data)
     */
    function callGAS(action, params, callback) {
        var queryParams = new URLSearchParams();
        queryParams.append('action', action);

        if (params) {
            var keys = Object.keys(params);
            for (var i = 0; i < keys.length; i++) {
                var val = params[keys[i]];
                if (val !== undefined && val !== null && val !== '') {
                    queryParams.append(keys[i], val);
                }
            }
        }

        var url = GAS_URL + '?' + queryParams.toString();

        fetch(url, { method: 'GET', redirect: 'follow' })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                return response.json();
            })
            .then(function(data) {
                callback(null, data);
            })
            .catch(function(err) {
                console.error('[PartnerDash] API \uD638\uCD9C \uC2E4\uD328 (' + action + '):', err);
                callback(err, null);
            });
    }

    /**
     * GAS POST 호출
     * @param {string} action - API 액션명
     * @param {Object} data - POST 바디
     * @param {Function} callback - function(err, data)
     */
    function postGAS(action, data, callback) {
        var url = GAS_URL + '?action=' + encodeURIComponent(action);

        fetch(url, {
            method: 'POST',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(data)
        })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                return response.json();
            })
            .then(function(resData) {
                callback(null, resData);
            })
            .catch(function(err) {
                console.error('[PartnerDash] POST \uC2E4\uD328 (' + action + '):', err);
                callback(err, null);
            });
    }


    /* ========================================
       별점 렌더링
       ======================================== */

    /**
     * 별점 SVG HTML 생성
     * @param {number} rating - 평점 (0~5)
     * @param {string} prefix - CSS 클래스 접두사
     * @returns {string}
     */
    function renderStars(rating, prefix) {
        var html = '';
        var filled = '<svg class="' + prefix + '__star ' + prefix + '__star--filled" viewBox="0 0 14 14" width="14" height="14" fill="#F5A623" xmlns="http://www.w3.org/2000/svg">'
            + '<path d="M7 1l1.76 3.57 3.94.57-2.85 2.78.67 3.93L7 10.07l-3.52 1.78.67-3.93L1.3 5.14l3.94-.57L7 1z"/></svg>';
        var empty = '<svg class="' + prefix + '__star ' + prefix + '__star--empty" viewBox="0 0 14 14" width="14" height="14" fill="#DDD" xmlns="http://www.w3.org/2000/svg">'
            + '<path d="M7 1l1.76 3.57 3.94.57-2.85 2.78.67 3.93L7 10.07l-3.52 1.78.67-3.93L1.3 5.14l3.94-.57L7 1z"/></svg>';

        for (var i = 1; i <= 5; i++) {
            html += (rating >= i) ? filled : empty;
        }

        return html;
    }


    /* ========================================
       유틸리티 함수
       ======================================== */

    /**
     * 가격 포맷 (65000 -> "65,000")
     * @param {number} price
     * @returns {string}
     */
    function formatPrice(price) {
        var num = Number(price);
        if (isNaN(num)) return '0';
        return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * 날짜 포맷 (YYYY-MM-DD -> YYYY.MM.DD)
     * @param {string} dateStr
     * @returns {string}
     */
    function formatDate(dateStr) {
        if (!dateStr) return '-';
        var d = String(dateStr).substring(0, 10);
        return d.replace(/-/g, '.');
    }

    /**
     * 숫자 0 채우기 (1 -> "01")
     * @param {number} n
     * @returns {string}
     */
    function padZero(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    /**
     * HTML 이스케이프 (XSS 방지)
     * @param {string} str
     * @returns {string}
     */
    function escapeHtml(str) {
        if (!str) return '';
        var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(str).replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    /**
     * HTML 속성 이스케이프
     * @param {string} str
     * @returns {string}
     */
    function escapeAttr(str) {
        return escapeHtml(str);
    }

    /**
     * 텍스트 이스케이프 (textContent용)
     * @param {string} str
     * @returns {string}
     */
    function escapeText(str) {
        return str ? String(str) : '';
    }

    /**
     * 요소 표시
     * @param {string} id
     */
    function showElement(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = '';
    }

    /**
     * 요소 숨기기
     * @param {string} id
     */
    function hideElement(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
    }

    /**
     * 텍스트 설정
     * @param {string} id
     * @param {string} text
     */
    function setTextById(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    /**
     * 로딩 오버레이 표시
     */
    function showLoading() {
        showElement('pdLoadingOverlay');
    }

    /**
     * 로딩 오버레이 숨기기
     */
    function hideLoading() {
        hideElement('pdLoadingOverlay');
    }

    /**
     * 디바운스 실행
     * @param {Function} fn
     */
    function debounce(fn) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(fn, DEBOUNCE_DELAY);
    }

    /**
     * 기간 필터에 따른 날짜 범위 계산
     * @param {string} period
     * @returns {Object} { from, to }
     */
    function calculatePeriodDates(period) {
        var now = new Date();
        var from, to;

        switch (period) {
            case 'this_week':
                var dayOfWeek = now.getDay();
                var diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; /* 월요일 기준 */
                from = new Date(now);
                from.setDate(now.getDate() - diff);
                to = new Date(from);
                to.setDate(from.getDate() + 6);
                break;

            case 'last_month':
                from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                to = new Date(now.getFullYear(), now.getMonth(), 0);
                break;

            case 'custom':
                var fromInput = document.getElementById('pdBookingDateFrom');
                var toInput = document.getElementById('pdBookingDateTo');
                return {
                    from: fromInput ? fromInput.value : '',
                    to: toInput ? toInput.value : ''
                };

            case 'this_month':
            default:
                from = new Date(now.getFullYear(), now.getMonth(), 1);
                to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
        }

        return {
            from: from.getFullYear() + '-' + padZero(from.getMonth() + 1) + '-' + padZero(from.getDate()),
            to: to.getFullYear() + '-' + padZero(to.getMonth() + 1) + '-' + padZero(to.getDate())
        };
    }


    /* ========================================
       DOM Ready
       ======================================== */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
