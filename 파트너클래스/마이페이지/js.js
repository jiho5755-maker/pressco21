/* ============================================
   PRESSCO21 수강생 마이페이지 — 예약 내역 + 재구매 동선
   메이크샵 D4 호환: IIFE, var, \${} 이스케이프
   CSS 스코핑: .my-bookings
   ============================================ */
(function() {
    'use strict';

    /* ========================================
       설정값
       ======================================== */

    var BOOKINGS_URL = 'https://n8n.pressco21.com/webhook/my-bookings';
    var CLASS_API_URL = 'https://n8n.pressco21.com/webhook/class-api';
    var DETAIL_PAGE_URL = '/shop/page.html?id=2607&class_id=';

    /* ========================================
       상태 관리
       ======================================== */

    var memberId = '';
    var catalogCache = null;
    var detailCache = {};

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

        fetchJson(BOOKINGS_URL, { member_id: memberId })
            .then(function(data) {
                var bookings = (data && data.success && data.data && data.data.bookings) ? data.data.bookings : [];
                return buildRepurchaseContext(bookings).then(function(context) {
                    showLoading(false);
                    renderBookings(bookings, context);
                });
            })
            .catch(function(err) {
                showLoading(false);
                console.error('[MyBookings] API 오류:', err);
                renderBookings([], getEmptyContext());
            });
    }

    function buildRepurchaseContext(bookings) {
        var completedBookings = getCompletedBookings(bookings || []);
        if (!completedBookings.length) {
            return Promise.resolve(getEmptyContext());
        }

        return fetchCatalogClasses()
            .catch(function() {
                return [];
            })
            .then(function(catalogClasses) {
                var uniqueClassIds = [];
                var i = 0;

                for (i = 0; i < completedBookings.length; i++) {
                    if (uniqueClassIds.indexOf(completedBookings[i].class_id) === -1) {
                        uniqueClassIds.push(completedBookings[i].class_id);
                    }
                }

                var requests = [];
                for (i = 0; i < uniqueClassIds.length; i++) {
                    requests.push(fetchClassDetail(uniqueClassIds[i]));
                }

                return Promise.all(requests).then(function(details) {
                    var detailByClassId = {};
                    var j = 0;

                    for (j = 0; j < details.length; j++) {
                        if (details[j] && details[j].class_id) {
                            detailByClassId[details[j].class_id] = details[j];
                        }
                    }

                    return {
                        catalogClasses: catalogClasses,
                        detailByClassId: detailByClassId,
                        relatedByClassId: buildRelatedClassMap(completedBookings, catalogClasses, detailByClassId)
                    };
                });
            });
    }

    function fetchCatalogClasses() {
        if (catalogCache) {
            return Promise.resolve(catalogCache);
        }

        return fetchJson(CLASS_API_URL, {
            action: 'getClasses',
            sort: 'popular',
            limit: 100
        }).then(function(data) {
            var classes = (data && data.success && data.data && data.data.classes) ? data.data.classes : [];
            catalogCache = classes;
            return classes;
        });
    }

    function fetchClassDetail(classId) {
        if (!classId) {
            return Promise.resolve(null);
        }

        if (detailCache[classId]) {
            return Promise.resolve(detailCache[classId]);
        }

        return fetchJson(CLASS_API_URL, {
            action: 'getClassDetail',
            id: classId
        })
            .then(function(data) {
                var detail = (data && data.success && data.data) ? data.data : null;
                if (detail && detail.class_id) {
                    detailCache[classId] = detail;
                }
                return detail;
            })
            .catch(function() {
                return null;
            });
    }

    function fetchJson(url, body) {
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body || {})
        })
            .then(function(res) {
                if (!res.ok) {
                    throw new Error('HTTP ' + res.status);
                }
                return res.json();
            });
    }

    /* ========================================
       렌더링
       ======================================== */

    function renderBookings(bookings, context) {
        var listEl = document.getElementById('mbBookingList');
        var emptyEl = document.getElementById('mbEmptyState');
        var sorted = [];
        var upcoming = [];
        var completed = [];
        var i = 0;

        if (!bookings.length) {
            if (listEl) listEl.style.display = 'none';
            if (emptyEl) emptyEl.style.display = '';
            setCount('mbTotalCount', 0);
            setCount('mbUpcomingCount', 0);
            setCount('mbCompletedCount', 0);
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';
        if (listEl) listEl.style.display = '';

        sorted = bookings.slice().sort(function(a, b) {
            return (b.class_date || '') < (a.class_date || '') ? -1 : 1;
        });

        for (i = 0; i < sorted.length; i++) {
            if (isCompletedBooking(sorted[i])) {
                completed.push(sorted[i]);
            } else {
                upcoming.push(sorted[i]);
            }
        }

        setCount('mbTotalCount', sorted.length);
        setCount('mbUpcomingCount', upcoming.length);
        setCount('mbCompletedCount', completed.length);

        if (listEl) {
            listEl.innerHTML = ''
                + renderBookingSection('다가오는 수업', '일정과 참여 인원을 다시 확인해보세요.', upcoming, false, context)
                + renderBookingSection('수강 완료 후 다시 보기', '후기 작성, 같은 강사 추천, 재료 재구매를 한곳에서 이어갑니다.', completed, true, context);
        }
    }

    function renderBookingSection(title, desc, items, isCompleted, context) {
        var html = '';
        var i = 0;

        if (!items || !items.length) {
            return '';
        }

        html += '<section class="mb-section' + (isCompleted ? ' mb-section--completed' : '') + '">';
        html += '<div class="mb-section__header">';
        html += '<div class="mb-section__copy">';
        html += '<p class="mb-section__eyebrow">' + (isCompleted ? 'AFTER CLASS' : 'UPCOMING') + '</p>';
        html += '<h2 class="mb-section__title">' + title + '</h2>';
        html += '<p class="mb-section__desc">' + desc + '</p>';
        html += '</div>';
        html += '<span class="mb-section__count">' + items.length + '</span>';
        html += '</div>';
        html += '<div class="mb-section__list">';

        for (i = 0; i < items.length; i++) {
            html += renderBookingCard(items[i], isCompleted, context);
        }

        html += '</div>';
        html += '</section>';

        return html;
    }

    function renderBookingCard(booking, isCompleted, context) {
        var amount = Number(booking.total_amount) || 0;
        var detailUrl = getDetailUrl(booking.class_id);
        var detailData = context.detailByClassId[booking.class_id] || null;
        var relatedClasses = context.relatedByClassId[booking.class_id] || [];
        var statusClass = isCompleted ? 'mb-booking-card--completed' : 'mb-booking-card--upcoming';
        var badgeClass = isCompleted ? 'mb-badge--completed' : 'mb-badge--upcoming';
        var statusText = isCompleted ? '수강 완료' : '수강 예정';
        var html = '';

        html += '<article class="mb-booking-card ' + statusClass + '">';
        html += '<div class="mb-booking-card__summary">';
        html += '<div class="mb-booking-card__left">';
        html += '<span class="mb-badge ' + badgeClass + '">' + statusText + '</span>';
        html += '<h3 class="mb-booking-card__title">' + escapeHtml(booking.class_name || '') + '</h3>';
        html += '<p class="mb-booking-card__partner">' + escapeHtml(booking.partner_name || '') + '</p>';
        html += '</div>';
        html += '<div class="mb-booking-card__right">';
        html += '<p class="mb-booking-card__date">' + formatDateLabel(booking.class_date || '') + '</p>';
        html += '<p class="mb-booking-card__people">' + (booking.participants || 1) + '명</p>';
        html += '<p class="mb-booking-card__amount">' + formatPrice(amount) + '원</p>';
        html += '</div>';
        html += '</div>';

        if (!isCompleted) {
            html += '<div class="mb-booking-card__footer">';
            html += '<a href="' + detailUrl + '" class="mb-inline-link">수업 상세 다시 보기</a>';
            html += '</div>';
            html += '</article>';
            return html;
        }

        html += '<div class="mb-followup">';
        html += '<div class="mb-followup__hero">';
        html += '<div class="mb-followup__copy">';
        html += '<p class="mb-followup__eyebrow">REVIEW + REPURCHASE</p>';
        html += '<h4 class="mb-followup__title">후기 남기고 다음 수업 혜택을 이어가세요</h4>';
        html += '<p class="mb-followup__desc">사진 후기를 남기면 1,000원 적립금 안내와 함께 같은 강사의 다음 수업, 이 수업 재료를 다시 확인할 수 있어요.</p>';
        html += '</div>';
        html += '<div class="mb-followup__actions">';
        html += '<a href="' + detailUrl + '" class="mb-inline-btn mb-inline-btn--primary">후기 작성하기</a>';
        html += '<a href="' + detailUrl + '" class="mb-inline-btn mb-inline-btn--ghost">수업 다시 보기</a>';
        html += '</div>';
        html += '</div>';
        html += renderKitRepurchase(detailData, detailUrl);
        html += renderRelatedClasses(relatedClasses);
        html += '</div>';
        html += '</article>';

        return html;
    }

    function renderKitRepurchase(detailData, fallbackUrl) {
        var kitItems = getKitItems(detailData);
        var html = '';
        var i = 0;
        var item = null;
        var itemUrl = '';

        html += '<section class="mb-panel mb-panel--kit">';
        html += '<div class="mb-panel__header">';
        html += '<h5 class="mb-panel__title">이 수업 재료 다시 보기</h5>';
        html += '<p class="mb-panel__desc">집에서 다시 만들어보고 싶을 때 바로 이어갈 수 있게 준비했어요.</p>';
        html += '</div>';

        if (!kitItems.length) {
            html += '<div class="mb-empty-inline">';
            html += '<p class="mb-empty-inline__text">이 수업의 재료는 상세 페이지에서 다시 확인할 수 있어요.</p>';
            html += '<a href="' + fallbackUrl + '" class="mb-inline-link">상세에서 재료 보기</a>';
            html += '</div>';
            html += '</section>';
            return html;
        }

        html += '<div class="mb-kit-list">';
        for (i = 0; i < kitItems.length && i < 3; i++) {
            item = kitItems[i];
            itemUrl = item.product_url || fallbackUrl;
            html += '<a href="' + escapeHtml(itemUrl) + '" class="mb-kit-chip">';
            html += '<span class="mb-kit-chip__name">' + escapeHtml(item.name || '재료 상품') + '</span>';
            html += '<span class="mb-kit-chip__meta">' + buildKitMeta(item) + '</span>';
            html += '</a>';
        }
        html += '</div>';

        if (kitItems.length > 3) {
            html += '<p class="mb-kit-note">외 ' + (kitItems.length - 3) + '개 재료는 상세 페이지에서 이어서 확인할 수 있어요.</p>';
        }

        html += '</section>';
        return html;
    }

    function renderRelatedClasses(relatedClasses) {
        var html = '';
        var i = 0;
        var cls = null;
        var partnerLabel = '';

        html += '<section class="mb-panel mb-panel--related">';
        html += '<div class="mb-panel__header">';
        html += '<h5 class="mb-panel__title">같은 강사의 다른 클래스</h5>';
        html += '<p class="mb-panel__desc">이미 호흡이 맞았던 강사의 다음 수업을 바로 비교해보세요.</p>';
        html += '</div>';

        if (!relatedClasses.length) {
            html += '<div class="mb-empty-inline">';
            html += '<p class="mb-empty-inline__text">같은 강사의 공개된 다른 클래스가 아직 없어요.</p>';
            html += '</div>';
            html += '</section>';
            return html;
        }

        html += '<div class="mb-related-grid">';
        for (i = 0; i < relatedClasses.length; i++) {
            cls = relatedClasses[i];
            partnerLabel = cls.partner_name || '';
            html += '<a href="' + getDetailUrl(cls.class_id) + '" class="mb-related-card">';
            html += '<span class="mb-related-card__category">' + escapeHtml(cls.category || '클래스') + '</span>';
            html += '<strong class="mb-related-card__title">' + escapeHtml(cls.class_name || '') + '</strong>';
            html += '<span class="mb-related-card__meta">' + escapeHtml(partnerLabel) + ' · ' + escapeHtml(getTypeLabel(cls.type || '')) + '</span>';
            html += '<span class="mb-related-card__price">' + formatPrice(Number(cls.price) || 0) + '원</span>';
            html += '</a>';
        }
        html += '</div>';
        html += '</section>';

        return html;
    }

    /* ========================================
       데이터 가공
       ======================================== */

    function buildRelatedClassMap(completedBookings, catalogClasses, detailByClassId) {
        var relatedByClassId = {};
        var i = 0;

        for (i = 0; i < completedBookings.length; i++) {
            relatedByClassId[completedBookings[i].class_id] = pickRelatedClasses(
                completedBookings[i],
                catalogClasses,
                detailByClassId[completedBookings[i].class_id]
            );
        }

        return relatedByClassId;
    }

    function pickRelatedClasses(booking, catalogClasses, detailData) {
        var related = [];
        var used = {};
        var targetPartner = normalizeText(getPartnerName(detailData, booking));
        var i = 0;
        var cls = null;
        var classId = '';
        var candidatePartner = '';

        if (!targetPartner) {
            return related;
        }

        for (i = 0; i < catalogClasses.length; i++) {
            cls = catalogClasses[i];
            classId = cls.class_id || '';
            candidatePartner = normalizeText(cls.partner_name || '');

            if (!classId || classId === booking.class_id || used[classId]) {
                continue;
            }
            if (candidatePartner !== targetPartner) {
                continue;
            }

            used[classId] = true;
            related.push(cls);

            if (related.length >= 3) {
                break;
            }
        }

        return related;
    }

    function getCompletedBookings(bookings) {
        var completed = [];
        var i = 0;

        for (i = 0; i < bookings.length; i++) {
            if (isCompletedBooking(bookings[i])) {
                completed.push(bookings[i]);
            }
        }

        return completed;
    }

    function isCompletedBooking(booking) {
        return (booking.class_date || '') < getTodayString();
    }

    function getKitItems(detailData) {
        var items = [];
        var sourceItems = [];
        var i = 0;
        var raw = null;
        var productUrl = '';

        if (!detailData || !Array.isArray(detailData.kit_items)) {
            return items;
        }

        sourceItems = detailData.kit_items;
        for (i = 0; i < sourceItems.length; i++) {
            raw = sourceItems[i] || {};
            productUrl = String(raw.product_url || '').trim();
            if (!productUrl) {
                continue;
            }

            items.push({
                name: String(raw.name || '재료 상품').trim(),
                product_url: productUrl,
                quantity: Number(raw.quantity) || 0,
                price: Number(raw.price) || 0
            });
        }

        return items;
    }

    function buildKitMeta(item) {
        var parts = [];

        if (item.quantity > 0) {
            parts.push('1인 기준 ' + item.quantity + '개');
        }
        if (item.price > 0) {
            parts.push(formatPrice(item.price) + '원');
        }

        if (!parts.length) {
            return '상품 바로가기';
        }

        return parts.join(' · ');
    }

    function getPartnerName(detailData, booking) {
        if (detailData && detailData.partner) {
            return detailData.partner.partner_name || detailData.partner.name || booking.partner_name || '';
        }
        return booking.partner_name || '';
    }

    /* ========================================
       화면 전환
       ======================================== */

    function showArea(id) {
        var areas = ['mbNoticeArea', 'mbMainArea'];
        var i = 0;
        var el = null;

        for (i = 0; i < areas.length; i++) {
            el = document.getElementById(areas[i]);
            if (el) {
                el.style.display = areas[i] === id ? '' : 'none';
            }
        }
    }

    function showLoading(show) {
        var el = document.getElementById('mbLoadingOverlay');
        if (el) {
            el.style.display = show ? 'flex' : 'none';
        }
    }

    /* ========================================
       유틸리티
       ======================================== */

    function getEmptyContext() {
        return {
            catalogClasses: [],
            detailByClassId: {},
            relatedByClassId: {}
        };
    }

    function getTodayString() {
        var today = new Date();
        return today.getFullYear() + '-' + padZero(today.getMonth() + 1) + '-' + padZero(today.getDate());
    }

    function getDetailUrl(classId) {
        return DETAIL_PAGE_URL + encodeURIComponent(classId || '');
    }

    function getTypeLabel(type) {
        var value = String(type || '').trim();
        return value || '수업';
    }

    function formatDateLabel(dateStr) {
        return escapeHtml(String(dateStr || '').substring(0, 10).replace(/-/g, '.'));
    }

    function normalizeText(str) {
        return String(str || '').replace(/\s+/g, '').toLowerCase();
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function padZero(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    function formatPrice(n) {
        var value = Number(n) || 0;
        return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function setCount(id, value) {
        var el = document.getElementById(id);
        if (el) {
            el.textContent = value;
        }
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
