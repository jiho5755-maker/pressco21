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

    /* ── 공통 모듈 바인딩 (pressco21-core.js) ── */
    var PC = window.PRESSCO21;
    var escapeHtml = PC.util.escapeHtml;
    var formatPrice = PC.util.formatPrice;
    var padZero = PC.util.padZero;

    /* BOOKINGS_URL은 PC.api.fetchPost('MY_BOOKINGS', ...) 로 대체 */

    /* ========================================
       상태 관리
       ======================================== */

    var memberId = '';

    /* ========================================
       초기화
       ======================================== */

    var MB_AREAS = ['mbNoticeArea', 'mbMainArea'];

    function init() {
        memberId = PC.auth.getMemberId('mbMemberId');

        if (!memberId) {
            PC.ui.showArea('mbNoticeArea', MB_AREAS);
            return;
        }

        PC.ui.showArea('mbMainArea', MB_AREAS);
        loadBookings();
    }

    /* ========================================
       데이터 로드
       ======================================== */

    function loadBookings() {
        showLoading(true);

        PC.api.fetchPost('MY_BOOKINGS', { member_id: memberId })
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
                console.error('[MyBookings] API 오류:', err.code || '', err.message || err);
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
                    '<p class="mb-booking-card__people">' + (b.participants || 1) + '명</p>' +
                    '<p class="mb-booking-card__amount">' + formatPrice(amount) + '원</p>' +
                '</div>';

            // 수강 완료 카드: 재구매 + 후기 + 수료증 CTA
            if (isPast) {
                html += '<div class="mb-booking-card__actions">';
                // 키트 재구매 링크 (카테고리 기반 쇼핑몰 연결)
                var shopCat = encodeURIComponent(b.category || '꽃공예');
                html += '<a href="/shop/search.html?search=' + shopCat + '" class="mb-cta-btn mb-cta-btn--repurchase">'
                    + '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4.5 5.5h5M4.5 8h3M2 2h2l1.5 8h5l1.5-6H4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
                    + ' 재료 재구매</a>';
                // 후기 작성 (이미 작성한 경우 버튼 숨김은 서버 데이터로 판단)
                if (!b.has_review) {
                    var detailUrl = PC.auth.pageUrl('DETAIL') + '&class_id=' + encodeURIComponent(b.class_id || '') + '#reviews';
                    html += '<a href="' + detailUrl + '" class="mb-cta-btn mb-cta-btn--review">'
                        + '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.76 3.57L13 5.24l-3 2.93.71 4.13L7 10.34 3.29 12.3 4 8.17 1 5.24l4.24-.67L7 1z" stroke="currentColor" stroke-width="1" fill="none"/></svg>'
                        + ' 후기 작성</a>';
                }
                // 수료증 발급
                html += '<button type="button" class="mb-cta-btn mb-cta-btn--certificate" onclick="window._printCertificate(' + i + ')">'
                    + '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 1h8v12H3z" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M5 4h4M5 6.5h4M5 9h2" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>'
                    + ' 수료증 발급</button>';
                html += '</div>';
            }

            html += '</div>';
        }

        listEl.innerHTML = html;

        // 후기 미작성 알림 배너 (E2-010 리텐션)
        var pendingReviewCount = 0;
        for (var r = 0; r < bookings.length; r++) {
            var br = bookings[r];
            var brIsPast = (br.class_date || '') < todayStr;
            if (brIsPast && !br.has_review) {
                pendingReviewCount++;
            }
        }
        renderReviewAlert(pendingReviewCount);

        // 완료 카드 1개 이상이면 강사 도전 배너 표시
        if (completed > 0) {
            renderGrowthBanner(completed);
        }

        // 수료증 인쇄용: bookings 배열을 전역 참조로 저장
        window._mbBookings = bookings;
    }

    /**
     * 후기 미작성 알림 배너 표시 (E2-010 리텐션)
     * @param {number} count - 후기 미작성 건수
     */
    function renderReviewAlert(count) {
        var alertEl = document.getElementById('mbReviewAlert');
        if (!alertEl) return;

        if (count <= 0) {
            alertEl.style.display = 'none';
            return;
        }

        var titleEl = document.getElementById('mbReviewAlertTitle');
        var descEl = document.getElementById('mbReviewAlertDesc');
        if (titleEl) {
            titleEl.textContent = count + '개의 후기가 기다리고 있어요';
        }
        if (descEl) {
            descEl.textContent = '수강 완료한 클래스의 후기를 작성하면 다음 수강 시 할인 혜택을 받을 수 있어요.';
        }
        alertEl.style.display = '';

        // 닫기 버튼 이벤트
        var closeBtn = document.getElementById('mbReviewAlertClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                alertEl.style.display = 'none';
            });
        }
    }

    /**
     * 강사 도전 배너 렌더링
     * @param {number} completedCount
     */
    function renderGrowthBanner(completedCount) {
        var el = document.getElementById('mbGrowthBanner');
        if (!el) return;
        el.innerHTML = '<h3 class="mb-growth-banner__title">수강 ' + completedCount + '회 완료! 이제 강사로 도전해보세요</h3>'
            + '<p class="mb-growth-banner__desc">수강 경험을 바탕으로 PRESSCO21 파트너가 되어 나만의 클래스를 열어보세요.<br>운영은 PRESSCO21이 함께합니다.</p>'
            + '<a href="/shop/page.html?id=2609" class="mb-growth-banner__btn">파트너 신청하기</a>';
        el.style.display = '';
    }

    /**
     * 수료증 인쇄 (window 전역 노출)
     * @param {number} index - bookings 배열 인덱스
     */
    window._printCertificate = function(index) {
        var bookings = window._mbBookings;
        if (!bookings || !bookings[index]) return;
        var b = bookings[index];
        var certEl = document.getElementById('mbCertificateArea');
        if (!certEl) return;

        var today = new Date();
        var issueDate = today.getFullYear() + '.' + padZero(today.getMonth() + 1) + '.' + padZero(today.getDate());

        certEl.innerHTML = '<div class="mb-cert__frame">'
            + '<p class="mb-cert__logo">PRESSCO21 FOREVER LOVE</p>'
            + '<h2 class="mb-cert__heading">수 료 증</h2>'
            + '<div class="mb-cert__info">'
            + '<p>클래스명: ' + escapeHtml(b.class_name || '') + '</p>'
            + '<p>강사: ' + escapeHtml(b.partner_name || '') + '</p>'
            + '<p>수강일: ' + escapeHtml(b.class_date || '') + '</p>'
            + '<p>수강 인원: ' + (b.participants || 1) + '명</p>'
            + '<p>수강료: ' + formatPrice(Number(b.total_amount) || 0) + '원</p>'
            + '</div>'
            + '<p>위 과정을 성실히 수료하였음을 증명합니다.</p>'
            + '<p class="mb-cert__date">발급일: ' + issueDate + '</p>'
            + '<p class="mb-cert__org">PRESSCO21 포에버러브</p>'
            + '</div>';
        certEl.style.display = '';
        window.print();
    };

    /* ========================================
       화면 전환
       ======================================== */

    function showLoading(show) {
        PC.ui.toggleElement('mbLoadingOverlay', show);
    }

    /* ========================================
       유틸리티
       ======================================== */

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
