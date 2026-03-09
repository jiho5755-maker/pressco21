/* ============================================
   PRESSCO21 수강생 마이페이지 — 예약 내역
   메이크샵 D4 호환: IIFE, var, \${} 이스케이프
   CSS 스코핑: .my-bookings
   n8n 웹훅: POST https://n8n.pressco21.com/webhook/my-bookings
   ============================================ */
(function() {
    'use strict';

    /* ========================================
       설정값
       ======================================== */

    var BOOKINGS_URL = 'https://n8n.pressco21.com/webhook/my-bookings';

    /* ========================================
       상태 관리
       ======================================== */

    var memberId = '';

    /* ========================================
       초기화
       ======================================== */

    function init() {
        var memberEl = document.getElementById('mbMemberId');
        if (memberEl) {
            memberId = (memberEl.textContent || '').trim();
        }

        if (!memberId) {
            showArea('mbNoticeArea');
            return;
        }

        showArea('mbMainArea');
        loadBookings();
    }

    /* ========================================
       데이터 로드
       ======================================== */

    function loadBookings() {
        showLoading(true);

        fetch(BOOKINGS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member_id: memberId })
        })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                showLoading(false);
                if (data && data.success && data.data) {
                    renderBookings(data.data.bookings || []);
                } else {
                    renderBookings([]);
                }
            })
            .catch(function(err) {
                showLoading(false);
                console.error('[MyBookings] API 오류:', err);
                renderBookings([]);
            });
    }

    /* ========================================
       렌더링
       ======================================== */

    function renderBookings(bookings) {
        var listEl = document.getElementById('mbBookingList');
        var emptyEl = document.getElementById('mbEmptyState');

        if (!bookings.length) {
            if (listEl) listEl.style.display = 'none';
            if (emptyEl) emptyEl.style.display = '';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';
        if (listEl) listEl.style.display = '';

        // 날짜 내림차순 정렬
        bookings.sort(function(a, b) {
            return (b.class_date || '') < (a.class_date || '') ? -1 : 1;
        });

        // 요약 계산
        var today = new Date();
        var todayStr = today.getFullYear() + '-' + padZero(today.getMonth() + 1) + '-' + padZero(today.getDate());
        var upcoming = 0;
        var completed = 0;

        for (var k = 0; k < bookings.length; k++) {
            if ((bookings[k].class_date || '') >= todayStr) {
                upcoming++;
            } else {
                completed++;
            }
        }

        setCount('mbTotalCount', bookings.length);
        setCount('mbUpcomingCount', upcoming);
        setCount('mbCompletedCount', completed);

        // 카드 렌더링
        var html = '';
        for (var i = 0; i < bookings.length; i++) {
            var b = bookings[i];
            var isPast = (b.class_date || '') < todayStr;
            var statusText = isPast ? '\uC644\uB8CC' : '\uC608\uC815';
            var statusClass = isPast ? 'mb-booking-card--past' : 'mb-booking-card--upcoming';
            var badgeClass = isPast ? 'mb-badge--completed' : 'mb-badge--upcoming';
            var amount = Number(b.total_amount) || 0;

            html += '<div class="mb-booking-card ' + statusClass + '">' +
                '<div class="mb-booking-card__left">' +
                    '<span class="mb-badge ' + badgeClass + '">' + statusText + '</span>' +
                    '<h3 class="mb-booking-card__title">' + escapeHtml(b.class_name || '') + '</h3>' +
                    '<p class="mb-booking-card__partner">' + escapeHtml(b.partner_name || '') + '</p>' +
                '</div>' +
                '<div class="mb-booking-card__right">' +
                    '<p class="mb-booking-card__date">' + escapeHtml(b.class_date || '') + '</p>' +
                    '<p class="mb-booking-card__people">' + (b.participants || 1) + '\uBA85</p>' +
                    '<p class="mb-booking-card__amount">' + formatPrice(amount) + '\uC6D0</p>' +
                '</div>' +
            '</div>';
        }

        listEl.innerHTML = html;
    }

    /* ========================================
       화면 전환
       ======================================== */

    function showArea(id) {
        var areas = ['mbNoticeArea', 'mbMainArea'];
        for (var i = 0; i < areas.length; i++) {
            var el = document.getElementById(areas[i]);
            if (el) el.style.display = areas[i] === id ? '' : 'none';
        }
    }

    function showLoading(show) {
        var el = document.getElementById('mbLoadingOverlay');
        if (el) el.style.display = show ? 'flex' : 'none';
    }

    /* ========================================
       유틸리티
       ======================================== */

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function padZero(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    function formatPrice(n) {
        return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function setCount(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
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
