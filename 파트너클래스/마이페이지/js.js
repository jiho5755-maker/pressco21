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
    var SUBSCRIPTION_API_URL = 'https://n8n.pressco21.com/webhook/subscription-kit';
    var DETAIL_PAGE_URL = '/shop/page.html?id=2607&class_id=';
    var REVIEW_THANKS_KEY = 'pressco21_review_thanks_v1';

    /* ========================================
       상태 관리
       ======================================== */

    var memberId = '';
    var catalogCache = null;
    var detailCache = {};
    var latestBookings = [];
    var latestContext = getEmptyContext();
    var latestSubscriptions = getEmptySubscriptionState();
    var selectedSubscriptionProfile = null;

    /* ========================================
       초기화
       ======================================== */

    function init() {
        var memberEl = document.getElementById('mbMemberId');
        bindRetentionEvents();
        bindSubscriptionEvents();

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
                    latestBookings = bookings;
                    latestContext = context;
                    return fetchSubscriptions().catch(function() {
                        return getEmptySubscriptionState();
                    }).then(function(subscriptions) {
                        var retention = buildRetentionModel(bookings, context);
                        latestSubscriptions = subscriptions;
                        showLoading(false);
                        renderRetention(retention);
                        renderSubscriptions(bookings, context, subscriptions);
                        renderBookings(bookings, context);
                    });
                });
            })
            .catch(function(err) {
                showLoading(false);
                console.error('[MyBookings] API 오류:', err);
                latestBookings = [];
                latestContext = getEmptyContext();
                latestSubscriptions = getEmptySubscriptionState();
                renderRetention(getEmptyRetentionModel());
                renderSubscriptions([], getEmptyContext(), getEmptySubscriptionState());
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

    function fetchSubscriptions() {
        return fetchJson(SUBSCRIPTION_API_URL, {
            action: 'listSubscriptions',
            member_id: memberId
        }).then(function(data) {
            if (!data || !data.success || !data.data) {
                return getEmptySubscriptionState();
            }
            return {
                active: Array.isArray(data.data.active) ? data.data.active : [],
                inactive: Array.isArray(data.data.inactive) ? data.data.inactive : [],
                totalSavings: Number(data.data.total_savings) || 0
            };
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

    function renderRetention(retention) {
        var area = document.getElementById('mbRetentionArea');
        var notice = document.getElementById('mbRetentionNotice');
        var monthlyCard = document.getElementById('mbMonthlyReportCard');
        var badgeCard = document.getElementById('mbBadgeBoardCard');
        var showAreaFlag = false;

        retention = retention || getEmptyRetentionModel();
        showAreaFlag = !!(retention.hasCompleted || retention.noticeHtml);

        if (!area || !notice || !monthlyCard || !badgeCard) {
            return;
        }

        area.style.display = showAreaFlag ? '' : 'none';
        if (!showAreaFlag) {
            return;
        }

        if (retention.noticeHtml) {
            notice.style.display = '';
            notice.innerHTML = retention.noticeHtml;
        } else {
            notice.style.display = 'none';
            notice.innerHTML = '';
        }

        monthlyCard.innerHTML = renderMonthlyReportCard(retention.monthly);
        badgeCard.innerHTML = renderBadgeBoardCard(retention.badges);
    }

    function renderSubscriptions(bookings, context, subscriptions) {
        var area = document.getElementById('mbSubscriptionArea');
        var hero = document.getElementById('mbSubscriptionHero');
        var listPanel = document.getElementById('mbSubscriptionListPanel');
        var recommendationPanel = document.getElementById('mbSubscriptionRecommendationPanel');
        var model = buildSubscriptionModel(bookings, context, subscriptions);

        latestSubscriptions = subscriptions || getEmptySubscriptionState();

        if (!area || !hero || !listPanel || !recommendationPanel) {
            return;
        }

        if (!model.visible) {
            area.style.display = 'none';
            closeSubscriptionForm();
            clearSubscriptionFeedback();
            return;
        }

        area.style.display = '';
        hero.innerHTML = renderSubscriptionHero(model);
        listPanel.innerHTML = renderSubscriptionListPanel(model);
        recommendationPanel.innerHTML = renderSubscriptionRecommendationPanel(model);

        if (selectedSubscriptionProfile && !findRecommendationByClassId(model.recommendations, selectedSubscriptionProfile.class_id)) {
            closeSubscriptionForm();
        } else if (selectedSubscriptionProfile) {
            renderSubscriptionForm(selectedSubscriptionProfile);
        }
    }

    function renderSubscriptionHero(model) {
        return ''
            + '<p class="mb-subscription-hero__eyebrow">KIT SUBSCRIPTION PILOT</p>'
            + '<h2 class="mb-subscription-hero__title">한 번 배운 꽃 재료를 매월 시즌 키트로 이어받아보세요.</h2>'
            + '<p class="mb-subscription-hero__desc">'
            + escapeHtml(model.heroText)
            + '</p>';
    }

    function renderSubscriptionListPanel(model) {
        var html = '';
        var items = model.activeSubscriptions || [];
        var i = 0;

        html += '<p class="mb-subscription-panel__eyebrow">ACTIVE SUBSCRIPTIONS</p>';
        html += '<h2 class="mb-subscription-panel__title">진행 중인 구독</h2>';
        html += '<p class="mb-subscription-panel__desc">다음 발송일, 최근 생성 주문, 월간 예상 절감액을 한 화면에서 확인합니다.</p>';
        html += '<div class="mb-subscription-panel__summary">';
        html += buildSubscriptionMetric('진행 중', formatNumber(model.activeCount) + '건');
        html += buildSubscriptionMetric('다음 발송', model.nextShipmentText);
        html += buildSubscriptionMetric('예상 절감', formatPrice(model.totalSavings) + '원');
        html += '</div>';

        if (!items.length) {
            html += '<div class="mb-subscription-empty">아직 진행 중인 구독이 없습니다. 수강 완료 클래스 중 재료 키트가 있는 수업부터 파일럿을 시작해보세요.</div>';
            return html;
        }

        html += '<div class="mb-subscription-list">';
        for (i = 0; i < items.length; i++) {
            html += renderActiveSubscriptionCard(items[i]);
        }
        html += '</div>';
        return html;
    }

    function renderSubscriptionRecommendationPanel(model) {
        var html = '';
        var items = model.recommendations || [];
        var i = 0;

        html += '<p class="mb-subscription-panel__eyebrow">RECOMMENDED START</p>';
        html += '<h2 class="mb-subscription-panel__title">시작 가능한 클래스</h2>';
        html += '<p class="mb-subscription-panel__desc">수강 완료 이력이 있고 재료 구성이 있는 클래스만 파일럿 추천 대상으로 보여줍니다.</p>';

        if (!items.length) {
            html += '<div class="mb-subscription-empty">재료 키트 구독으로 전환할 수 있는 완료 수업이 아직 없습니다. 키트 포함 수업을 먼저 들어보세요.</div>';
            return html;
        }

        html += '<div class="mb-subscription-recommendations">';
        for (i = 0; i < items.length; i++) {
            html += renderRecommendationCard(items[i]);
        }
        html += '</div>';
        return html;
    }

    function renderActiveSubscriptionCard(item) {
        var nextOrderText = item.next_order_date ? formatDateLabel(item.next_order_date) : '미정';
        var lastOrderText = item.last_order_ref ? item.last_order_ref : '아직 생성 없음';
        var priceText = formatPrice(item.subscriber_price) + '원';
        var chips = [];
        var html = '';
        var i = 0;

        chips.push('<span class="mb-subscription-card__chip">매월 ' + escapeHtml(String(item.delivery_day || '5')) + '일</span>');
        chips.push('<span class="mb-subscription-card__chip">다음 발송 ' + nextOrderText + '</span>');
        chips.push('<span class="mb-subscription-card__chip">최근 주문 ' + escapeHtml(lastOrderText) + '</span>');

        html += '<div class="mb-subscription-card">';
        html += '<div class="mb-subscription-card__top">';
        html += '<div>';
        html += '<h3 class="mb-subscription-card__title">' + escapeHtml(item.class_name || '월간 키트 구독') + '</h3>';
        html += '<p class="mb-subscription-card__meta">' + escapeHtml(item.partner_name || '') + ' · 구독가 ' + priceText + '</p>';
        html += '</div>';
        html += '<span class="mb-subscription-card__badge">ACTIVE</span>';
        html += '</div>';
        html += '<div class="mb-subscription-card__chips">';
        for (i = 0; i < chips.length; i++) {
            html += chips[i];
        }
        html += '</div>';
        html += '<div class="mb-subscription-card__kit-list">' + renderSubscriptionKitItems(item.preview_items || []) + '</div>';
        html += '<div class="mb-subscription-card__actions">';
        html += '<button type="button" class="mb-subscription-card__button is-secondary" data-subscription-cancel="' + escapeHtml(item.subscription_id || '') + '">구독 해지</button>';
        html += '</div>';
        html += '</div>';
        return html;
    }

    function renderRecommendationCard(item) {
        var html = '';

        html += '<div class="mb-subscription-card">';
        html += '<div class="mb-subscription-card__top">';
        html += '<div>';
        html += '<h3 class="mb-subscription-card__title">' + escapeHtml(item.class_name || '') + '</h3>';
        html += '<p class="mb-subscription-card__meta">' + escapeHtml(item.partner_name || '') + ' · 정가 ' + formatPrice(item.regular_price) + '원 · 구독가 ' + formatPrice(item.subscriber_price) + '원</p>';
        html += '</div>';
        html += '<span class="mb-subscription-card__badge">PILOT</span>';
        html += '</div>';
        html += '<div class="mb-subscription-card__chips">';
        html += '<span class="mb-subscription-card__chip">' + escapeHtml(item.category || '꽃 공예') + '</span>';
        html += '<span class="mb-subscription-card__chip">월 최대 ' + formatPrice(item.savings) + '원 절감</span>';
        html += '</div>';
        html += '<div class="mb-subscription-card__kit-list">' + renderSubscriptionKitItems(item.preview_items || []) + '</div>';
        html += '<div class="mb-subscription-card__actions">';
        html += '<button type="button" class="mb-subscription-card__button" data-subscription-open="' + escapeHtml(item.class_id || '') + '">이 수업으로 구독 시작</button>';
        html += '<a href="' + getDetailUrl(item.class_id) + '" class="mb-inline-btn mb-inline-btn--ghost">상세 다시 보기</a>';
        html += '</div>';
        html += '</div>';
        return html;
    }

    function renderSubscriptionKitItems(items) {
        var html = '';
        var i = 0;

        if (!items || !items.length) {
            return '<span class="mb-subscription-card__kit-item">시즌 재료 구성은 신청 후 확정됩니다.</span>';
        }

        for (i = 0; i < items.length; i++) {
            html += '<span class="mb-subscription-card__kit-item">' + escapeHtml(items[i]) + '</span>';
        }
        return html;
    }

    function buildSubscriptionMetric(label, value) {
        return ''
            + '<div class="mb-subscription-metric">'
            + '<p class="mb-subscription-metric__label">' + escapeHtml(label) + '</p>'
            + '<p class="mb-subscription-metric__value">' + escapeHtml(value) + '</p>'
            + '</div>';
    }

    function renderSubscriptionForm(profile) {
        var wrap = document.getElementById('mbSubscriptionFormWrap');
        var title = document.getElementById('mbSubscriptionFormTitle');
        var summary = document.getElementById('mbSubscriptionFormSummary');

        if (!wrap || !profile) {
            return;
        }

        selectedSubscriptionProfile = profile;
        wrap.style.display = '';

        if (title) {
            title.textContent = (profile.class_name || '월간 키트') + ' 구독 신청';
        }
        if (summary) {
            summary.innerHTML = ''
                + '<p class="mb-subscription-form__summary-title">' + escapeHtml(profile.class_name || '') + '</p>'
                + '<p class="mb-subscription-form__summary-desc">'
                + escapeHtml(profile.partner_name || '')
                + ' · 정가 ' + formatPrice(profile.regular_price) + '원 · 구독가 ' + formatPrice(profile.subscriber_price) + '원 · 첫 발송일 '
                + formatDateLabel(computeFirstDeliveryDate(Number(getFieldValue('mbSubscriptionDeliveryDay') || 5)))
                + '</p>';
        }

        setFieldValue('mbSubscriptionClassId', profile.class_id || '');
        setFieldValue('mbSubscriptionBranduid', profile.kit_bundle_branduid || '');
        setFieldValue('mbSubscriptionClassName', profile.class_name || '');
        setFieldValue('mbSubscriptionPartnerName', profile.partner_name || '');
        setFieldValue('mbSubscriptionPartnerCode', profile.partner_code || '');
        setFieldValue('mbSubscriptionRegularPrice', profile.regular_price || 0);
        setFieldValue('mbSubscriptionSubscriberPrice', profile.subscriber_price || 0);

        if (!getFieldValue('mbSubscriptionMemberName')) {
            setFieldValue('mbSubscriptionMemberName', profile.member_name || '');
        }
        if (!getFieldValue('mbSubscriptionMemberEmail')) {
            setFieldValue('mbSubscriptionMemberEmail', profile.member_email || '');
        }
        focusFirstSubscriptionInput();
    }

    function closeSubscriptionForm() {
        var wrap = document.getElementById('mbSubscriptionFormWrap');
        var form = document.getElementById('mbSubscriptionForm');

        selectedSubscriptionProfile = null;
        if (wrap) {
            wrap.style.display = 'none';
        }
        if (form) {
            form.reset();
        }
        setFieldValue('mbSubscriptionClassId', '');
        setFieldValue('mbSubscriptionBranduid', '');
        setFieldValue('mbSubscriptionClassName', '');
        setFieldValue('mbSubscriptionPartnerName', '');
        setFieldValue('mbSubscriptionPartnerCode', '');
        setFieldValue('mbSubscriptionRegularPrice', '');
        setFieldValue('mbSubscriptionSubscriberPrice', '');
    }

    function setSubscriptionFeedback(message, type) {
        var feedback = document.getElementById('mbSubscriptionFeedback');

        if (!feedback) {
            return;
        }

        if (!message) {
            feedback.style.display = 'none';
            feedback.className = 'mb-subscription__feedback';
            feedback.textContent = '';
            return;
        }

        feedback.style.display = '';
        feedback.className = 'mb-subscription__feedback ' + (type === 'error' ? 'is-error' : 'is-success');
        feedback.textContent = message;
    }

    function clearSubscriptionFeedback() {
        setSubscriptionFeedback('', '');
    }

    function renderMonthlyReportCard(monthly) {
        if (!monthly) {
            monthly = getEmptyRetentionModel().monthly;
        }

        return ''
            + '<p class="mb-retention-card__eyebrow">MONTHLY REPORT</p>'
            + '<h2 class="mb-retention-card__title">' + escapeHtml(monthly.title) + '</h2>'
            + '<p class="mb-retention-card__desc">' + escapeHtml(monthly.description) + '</p>'
            + '<div class="mb-report-grid">'
            + buildReportMetric('완료 수업', monthly.completedCount + '회', monthly.completedHint)
            + buildReportMetric('이번 달 결제', formatPrice(monthly.totalSpend) + '원', monthly.spendHint)
            + buildReportMetric('함께한 강사', monthly.partnerCount + '명', monthly.partnerHint)
            + buildReportMetric('주력 카테고리', monthly.topCategory, monthly.categoryHint)
            + '</div>'
            + '<div class="mb-report-footer">'
            + '<p class="mb-report-footer__text">' + escapeHtml(monthly.footerText) + '</p>'
            + '<a href="/shop/page.html?id=2606" class="mb-inline-link">다음 수업 둘러보기</a>'
            + '</div>';
    }

    function renderBadgeBoardCard(badges) {
        var html = '';
        var items = badges && badges.items ? badges.items : [];
        var i = 0;

        html += '<p class="mb-retention-card__eyebrow">RETENTION BADGE</p>';
        html += '<h2 class="mb-retention-card__title">' + escapeHtml(badges.title || '연속 수강 흐름을 쌓아보세요') + '</h2>';
        html += '<p class="mb-retention-card__desc">' + escapeHtml(badges.description || '수강이 이어질수록 다음 배지가 가까워집니다.') + '</p>';
        html += '<div class="mb-streak-hero">';
        html += '<div>';
        html += '<p class="mb-streak-hero__label">현재 연속 수강</p>';
        html += '<p class="mb-streak-hero__count">' + formatNumber(badges.streakCount || 0) + '</p>';
        html += '</div>';
        html += '<div>';
        html += '<p class="mb-streak-hero__label">다음 목표</p>';
        html += '<p class="mb-streak-hero__next">' + escapeHtml(badges.nextMilestoneText || '첫 배지를 향해 3회 수강을 시작해보세요.') + '</p>';
        html += '</div>';
        html += '</div>';
        html += '<div class="mb-badge-track">';

        for (i = 0; i < items.length; i++) {
            html += renderBadgeItem(items[i]);
        }

        html += '</div>';
        return html;
    }

    function buildReportMetric(label, value, sub) {
        return ''
            + '<div class="mb-report-metric">'
            + '<p class="mb-report-metric__label">' + escapeHtml(label) + '</p>'
            + '<p class="mb-report-metric__value">' + escapeHtml(value) + '</p>'
            + '<p class="mb-report-metric__sub">' + escapeHtml(sub || '') + '</p>'
            + '</div>';
    }

    function renderBadgeItem(item) {
        var earned = !!(item && item.earned);
        var mark = earned ? 'OK' : String(item.threshold || 0);

        return ''
            + '<div class="mb-badge-item' + (earned ? ' is-earned' : '') + '">'
            + '<span class="mb-badge-item__mark">' + escapeHtml(mark) + '</span>'
            + '<div class="mb-badge-item__body">'
            + '<p class="mb-badge-item__title">' + escapeHtml(item.title || '') + '</p>'
            + '<p class="mb-badge-item__desc">' + escapeHtml(item.description || '') + '</p>'
            + '</div>'
            + '</div>';
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

    function buildRetentionModel(bookings, context) {
        var completedBookings = getCompletedBookings(bookings || []);
        var reviewThanks = getReviewThanksState();
        var recentCompletion = getRecentCompletion(completedBookings);

        return {
            hasCompleted: completedBookings.length > 0,
            monthly: buildMonthlyReport(completedBookings, context),
            badges: buildBadgeModel(completedBookings),
            noticeHtml: buildRetentionNoticeHtml(reviewThanks, recentCompletion)
        };
    }

    function buildMonthlyReport(completedBookings, context) {
        var sortedCompleted = completedBookings.slice().sort(function(a, b) {
            return (b.class_date || '') < (a.class_date || '') ? -1 : 1;
        });
        var monthKey = getMonthKey(new Date());
        var monthItems = [];
        var partnerMap = {};
        var partnerCount = 0;
        var totalSpend = 0;
        var topCategory = '';
        var topCategoryCount = 0;
        var categoryMap = {};
        var lastCompleted = sortedCompleted.length ? sortedCompleted[0] : null;
        var i = 0;
        var item = null;
        var detail = null;
        var category = '';
        var partnerName = '';

        context = context || getEmptyContext();

        for (i = 0; i < completedBookings.length; i++) {
            if (getMonthKey(parseDateValue(completedBookings[i].class_date)) === monthKey) {
                monthItems.push(completedBookings[i]);
            }
        }

        for (i = 0; i < monthItems.length; i++) {
            item = monthItems[i];
            totalSpend += Number(item.total_amount) || 0;
            partnerName = String(item.partner_name || '').trim();
            if (partnerName && !partnerMap[partnerName]) {
                partnerMap[partnerName] = true;
                partnerCount += 1;
            }

            detail = context.detailByClassId[item.class_id] || null;
            category = String((detail && detail.category) || '').trim() || '꽃 공예';
            categoryMap[category] = (categoryMap[category] || 0) + 1;
            if (categoryMap[category] > topCategoryCount) {
                topCategory = category;
                topCategoryCount = categoryMap[category];
            }
        }

        if (!topCategory) {
            topCategory = completedBookings.length ? '꽃 공예' : '첫 수업 준비 중';
        }

        return {
            title: getMonthTitle(new Date()),
            description: monthItems.length
                ? '이번 달 수강 흐름과 다음 탐색 포인트를 짧게 요약했습니다.'
                : '이번 달 첫 수업을 아직 시작하지 않았다면 지금 탐색 흐름을 다시 열어보세요.',
            completedCount: monthItems.length,
            completedHint: monthItems.length ? '이번 달 완료한 클래스 수' : '이번 달 첫 완료 수업을 만들어보세요',
            totalSpend: totalSpend,
            spendHint: monthItems.length ? '수강 결제 합계 기준' : '결제 기록이 아직 없습니다',
            partnerCount: partnerCount,
            partnerHint: partnerCount ? '같이 배운 강사 수' : '새 강사를 찾아볼 차례입니다',
            topCategory: topCategory,
            categoryHint: topCategoryCount ? '가장 자주 들은 카테고리' : '입문 카테고리부터 시작해보세요',
            footerText: lastCompleted
                ? formatDateLabel(lastCompleted.class_date) + ' 완료 수업 이후 흐름을 이어가고 있습니다.'
                : '완료 수업이 쌓이면 월간 리포트가 더 풍부해집니다.'
        };
    }

    function buildBadgeModel(completedBookings) {
        var streakCount = getStreakCount(completedBookings);
        var thresholds = [
            { threshold: 3, title: 'Starter Loop', earnedText: '3회 연속 수강 달성', pendingText: '첫 배지까지 3회 연속 수강' },
            { threshold: 5, title: 'Steady Bloom', earnedText: '5회 연속 흐름 유지 중', pendingText: '5회 달성 시 중간 배지 획득' },
            { threshold: 10, title: 'Signature Collector', earnedText: '10회 연속 수강 완주', pendingText: '10회 달성 시 시그니처 배지' }
        ];
        var items = [];
        var nextMilestoneText = '첫 배지를 향해 3회 수강을 시작해보세요.';
        var i = 0;
        var earned = false;
        var remaining = 0;

        for (i = 0; i < thresholds.length; i++) {
            earned = streakCount >= thresholds[i].threshold;
            remaining = thresholds[i].threshold - streakCount;
            items.push({
                threshold: thresholds[i].threshold,
                title: thresholds[i].title,
                earned: earned,
                description: earned ? thresholds[i].earnedText : '앞으로 ' + remaining + '회 더 들으면 열립니다.'
            });

            if (!earned && nextMilestoneText === '첫 배지를 향해 3회 수강을 시작해보세요.') {
                nextMilestoneText = thresholds[i].threshold + '회 배지까지 ' + remaining + '회 남았습니다.';
            }
        }

        if (streakCount >= 10) {
            nextMilestoneText = '최상위 배지를 달성했습니다. 다음 클래스 큐레이션을 이어가세요.';
        }

        return {
            title: '연속 수강 배지 보드',
            description: '수강 흐름이 끊기지 않도록 최근 완료 기록 기준으로 배지를 계산합니다.',
            streakCount: streakCount,
            nextMilestoneText: nextMilestoneText,
            items: items
        };
    }

    function buildRetentionNoticeHtml(reviewThanks, recentCompletion) {
        var cards = [];

        if (reviewThanks && reviewThanks.visible) {
            cards.push(
                '<div class="mb-retention-notice">'
                + '<button type="button" class="mb-retention-dismiss" data-review-dismiss="true" aria-label="감사 배너 닫기">x</button>'
                + '<p class="mb-retention-notice__eyebrow">REVIEW THANKS</p>'
                + '<h2 class="mb-retention-notice__title">후기 감사합니다. 다음 수업과 재료 탐색을 이어가세요.</h2>'
                + '<p class="mb-retention-notice__desc">' + escapeHtml(reviewThanks.className || '최근 수강 클래스') + ' 후기가 저장되었습니다. 적립금 안내와 함께 같은 강사의 다음 수업, 재료 다시 보기를 한 화면에서 이어볼 수 있습니다.</p>'
                + '<div class="mb-retention-notice__actions">'
                + '<a href="/shop/page.html?id=2606" class="mb-inline-btn mb-inline-btn--primary">다음 수업 찾기</a>'
                + '<a href="#mbBookingList" class="mb-inline-btn mb-inline-btn--ghost">완료 수업 다시 보기</a>'
                + '</div>'
                + '</div>'
            );
        }

        if (recentCompletion && recentCompletion.visible) {
            cards.push(
                '<div class="mb-retention-notice">'
                + '<p class="mb-retention-notice__eyebrow">CLASS COMPLETE</p>'
                + '<h2 class="mb-retention-notice__title">' + escapeHtml(recentCompletion.className || '최근 완료한 수업') + ' 수강을 마쳤습니다.</h2>'
                + '<p class="mb-retention-notice__desc">' + formatDateLabel(recentCompletion.classDate) + ' 기준 최근 완료 수업입니다. 후기 작성과 재료 다시 보기, 같은 강사의 다음 클래스 비교를 이어가 보세요.</p>'
                + '<div class="mb-retention-notice__actions">'
                + '<a href="' + getDetailUrl(recentCompletion.classId) + '" class="mb-inline-btn mb-inline-btn--primary">후기와 상세 보기</a>'
                + '<a href="/shop/page.html?id=2606" class="mb-inline-btn mb-inline-btn--ghost">다음 수업 탐색</a>'
                + '</div>'
                + '</div>'
            );
        }

        return cards.join('');
    }

    function buildSubscriptionModel(bookings, context, subscriptions) {
        var completedBookings = getCompletedBookings(bookings || []);
        var active = subscriptions && subscriptions.active ? subscriptions.active : [];
        var recommendations = buildSubscriptionRecommendations(completedBookings, context, active);
        var nextShipment = getNextShipment(active);
        var totalSavings = Number(subscriptions && subscriptions.totalSavings) || sumSubscriptionSavings(active);

        return {
            visible: active.length > 0 || recommendations.length > 0,
            activeSubscriptions: active,
            activeCount: active.length,
            recommendations: recommendations,
            nextShipmentText: nextShipment ? formatDateLabel(nextShipment) : '예정 없음',
            totalSavings: totalSavings,
            heroText: active.length
                ? '현재 ' + active.length + '건이 진행 중이며, 가장 가까운 발송일은 ' + (nextShipment ? formatDateLabel(nextShipment) : '미정') + ' 입니다.'
                : '수강 완료 수업의 재료 구성을 매월 다시 받을 수 있도록 파일럿을 엽니다.'
        };
    }

    function buildSubscriptionRecommendations(completedBookings, context, activeSubscriptions) {
        var usedClassMap = {};
        var result = [];
        var i = 0;
        var j = 0;
        var booking = null;
        var detailData = null;
        var profile = null;

        context = context || getEmptyContext();

        for (i = 0; i < activeSubscriptions.length; i++) {
            usedClassMap[String(activeSubscriptions[i].class_id || '')] = true;
        }

        for (j = 0; j < completedBookings.length; j++) {
            booking = completedBookings[j];
            detailData = context.detailByClassId[booking.class_id] || null;
            profile = buildSubscriptionProfile(booking, detailData);

            if (!profile || usedClassMap[profile.class_id]) {
                continue;
            }

            usedClassMap[profile.class_id] = true;
            result.push(profile);

            if (result.length >= 4) {
                break;
            }
        }

        return result;
    }

    function buildSubscriptionProfile(booking, detailData) {
        var kitItems = getKitItems(detailData);
        var kitBrandUid = '';
        var regularPrice = 0;
        var subscriberPrice = 0;
        var previewItems = [];
        var i = 0;
        var rawItem = null;
        var name = '';

        if (!detailData) {
            return null;
        }

        kitBrandUid = extractBrandUid(detailData.kit_bundle_branduid || '');
        if (!kitBrandUid && kitItems.length) {
            kitBrandUid = extractBrandUid(kitItems[0].product_url || '');
        }

        if (!kitBrandUid) {
            return null;
        }

        for (i = 0; i < kitItems.length; i++) {
            regularPrice += Math.max(Number(kitItems[i].price) || 0, 0) * Math.max(Number(kitItems[i].quantity) || 1, 1);
            rawItem = kitItems[i];
            name = String(rawItem.name || '').trim();
            if (name && previewItems.length < 3) {
                previewItems.push(name);
            }
        }

        if (regularPrice <= 0) {
            return null;
        }

        subscriberPrice = Math.max(Math.round(regularPrice * 0.9 / 100) * 100, 1000);

        return {
            class_id: detailData.class_id || booking.class_id || '',
            class_name: detailData.class_name || booking.class_name || '',
            partner_name: getPartnerName(detailData, booking),
            partner_code: detailData.partner && detailData.partner.partner_code ? detailData.partner.partner_code : '',
            category: detailData.category || '꽃 공예',
            kit_bundle_branduid: kitBrandUid,
            regular_price: regularPrice,
            subscriber_price: subscriberPrice,
            savings: Math.max(regularPrice - subscriberPrice, 0),
            preview_items: previewItems,
            member_name: booking.student_name || '',
            member_email: booking.student_email || ''
        };
    }

    function getNextShipment(activeSubscriptions) {
        var nextDate = '';
        var i = 0;
        var value = '';

        for (i = 0; i < activeSubscriptions.length; i++) {
            value = String(activeSubscriptions[i].next_order_date || '').substring(0, 10);
            if (!value) {
                continue;
            }
            if (!nextDate || value < nextDate) {
                nextDate = value;
            }
        }

        return nextDate;
    }

    function sumSubscriptionSavings(activeSubscriptions) {
        var total = 0;
        var i = 0;

        for (i = 0; i < activeSubscriptions.length; i++) {
            total += Math.max((Number(activeSubscriptions[i].regular_price) || 0) - (Number(activeSubscriptions[i].subscriber_price) || 0), 0);
        }

        return total;
    }

    function findRecommendationByClassId(list, classId) {
        var target = String(classId || '');
        var i = 0;

        for (i = 0; i < list.length; i++) {
            if (String(list[i].class_id || '') === target) {
                return list[i];
            }
        }

        return null;
    }

    function getStreakCount(completedBookings) {
        var sorted = completedBookings.slice().sort(function(a, b) {
            return (b.class_date || '') < (a.class_date || '') ? -1 : 1;
        });
        var streak = 0;
        var prevDate = null;
        var currentDate = null;
        var gap = 0;
        var i = 0;

        for (i = 0; i < sorted.length; i++) {
            currentDate = parseDateValue(sorted[i].class_date);
            if (!currentDate) {
                continue;
            }

            if (!prevDate) {
                streak += 1;
                prevDate = currentDate;
                continue;
            }

            gap = Math.abs(diffDays(prevDate, currentDate));
            if (gap <= 45) {
                streak += 1;
                prevDate = currentDate;
            } else {
                break;
            }
        }

        return streak;
    }

    function getRecentCompletion(completedBookings) {
        var sorted = completedBookings.slice().sort(function(a, b) {
            return (b.class_date || '') < (a.class_date || '') ? -1 : 1;
        });
        var latest = sorted.length ? sorted[0] : null;
        var diff = 0;

        if (!latest) {
            return { visible: false };
        }

        diff = Math.abs(diffDays(new Date(), parseDateValue(latest.class_date)));
        return {
            visible: diff <= 7,
            classId: latest.class_id || '',
            className: latest.class_name || '',
            classDate: latest.class_date || ''
        };
    }

    function getReviewThanksState() {
        var raw = '';
        var parsed = null;
        var savedAt = null;
        var age = 0;

        try {
            raw = localStorage.getItem(REVIEW_THANKS_KEY) || '';
            if (!raw) {
                return { visible: false };
            }
            parsed = JSON.parse(raw);
        } catch (err) {
            return { visible: false };
        }

        savedAt = parsed && parsed.at ? new Date(parsed.at) : null;
        if (!savedAt || isNaN(savedAt.getTime())) {
            return { visible: false };
        }

        age = Math.abs(diffDays(new Date(), savedAt));
        if (age > 14) {
            clearReviewThanksState();
            return { visible: false };
        }

        return {
            visible: true,
            classId: parsed.class_id || '',
            className: parsed.class_name || ''
        };
    }

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

    function bindRetentionEvents() {
        document.addEventListener('click', function(event) {
            var target = event.target;
            if (!target) {
                return;
            }

            if (target.getAttribute('data-review-dismiss') === 'true') {
                clearReviewThanksState();
                target.closest('.mb-retention-notice').style.display = 'none';
            }
        });
    }

    function bindSubscriptionEvents() {
        document.addEventListener('click', function(event) {
            var target = event.target;
            var openClassId = '';
            var cancelId = '';

            if (!target) {
                return;
            }

            openClassId = target.getAttribute('data-subscription-open') || '';
            cancelId = target.getAttribute('data-subscription-cancel') || '';

            if (openClassId) {
                openSubscriptionByClassId(openClassId);
                return;
            }

            if (cancelId) {
                event.preventDefault();
                if (window.confirm('이 구독을 해지하시겠습니까? 다음 발송부터 중단됩니다.')) {
                    cancelSubscription(cancelId);
                }
                return;
            }

            if (target.id === 'mbSubscriptionFormClose' || target.id === 'mbSubscriptionFormCancel') {
                event.preventDefault();
                closeSubscriptionForm();
            }
        });

        document.addEventListener('change', function(event) {
            var target = event.target;
            if (target && target.id === 'mbSubscriptionDeliveryDay' && selectedSubscriptionProfile) {
                renderSubscriptionForm(selectedSubscriptionProfile);
            }
        });

        document.addEventListener('submit', function(event) {
            var form = event.target;
            if (form && form.id === 'mbSubscriptionForm') {
                event.preventDefault();
                handleSubscriptionSubmit();
            }
        });
    }

    function openSubscriptionByClassId(classId) {
        var model = buildSubscriptionModel(latestBookings, latestContext, latestSubscriptions);
        var profile = findRecommendationByClassId(model.recommendations || [], classId);

        clearSubscriptionFeedback();
        if (profile) {
            renderSubscriptionForm(profile);
        }
    }

    function handleSubscriptionSubmit() {
        var submitButton = document.getElementById('mbSubscriptionFormSubmit');
        var payload = buildSubscriptionPayload();

        if (!payload) {
            return;
        }

        if (submitButton) {
            submitButton.disabled = true;
        }

        clearSubscriptionFeedback();
        fetchJson(SUBSCRIPTION_API_URL, payload)
            .then(function(data) {
                if (!data || !data.success) {
                    throw new Error((data && data.message) || '구독 저장에 실패했습니다.');
                }

                setSubscriptionFeedback('월간 키트 구독이 시작되었습니다. 다음 발송일은 ' + formatDateLabel(data.data.next_order_date || '') + ' 입니다.', 'success');
                closeSubscriptionForm();
                refreshSubscriptions();
                if (submitButton) {
                    submitButton.disabled = false;
                }
            })
            .catch(function(error) {
                setSubscriptionFeedback(error && error.message ? error.message : '구독 저장에 실패했습니다.', 'error');
                if (submitButton) {
                    submitButton.disabled = false;
                }
            });
    }

    function cancelSubscription(subscriptionId) {
        fetchJson(SUBSCRIPTION_API_URL, {
            action: 'cancelSubscription',
            member_id: memberId,
            subscription_id: subscriptionId
        })
            .then(function(data) {
                if (!data || !data.success) {
                    throw new Error((data && data.message) || '구독 해지에 실패했습니다.');
                }

                setSubscriptionFeedback('구독이 해지되었습니다. 마지막 생성 주문 이력은 유지됩니다.', 'success');
                refreshSubscriptions();
            })
            .catch(function(error) {
                setSubscriptionFeedback(error && error.message ? error.message : '구독 해지에 실패했습니다.', 'error');
            });
    }

    function refreshSubscriptions() {
        fetchSubscriptions()
            .then(function(subscriptions) {
                latestSubscriptions = subscriptions;
                renderSubscriptions(latestBookings, latestContext, subscriptions);
            })
            .catch(function() {
                renderSubscriptions(latestBookings, latestContext, getEmptySubscriptionState());
            });
    }

    function buildSubscriptionPayload() {
        var classId = getFieldValue('mbSubscriptionClassId');
        var branduid = getFieldValue('mbSubscriptionBranduid');
        var className = getFieldValue('mbSubscriptionClassName');
        var memberName = getFieldValue('mbSubscriptionMemberName');
        var memberEmail = getFieldValue('mbSubscriptionMemberEmail');
        var phone = getFieldValue('mbSubscriptionPhone');
        var zipcode = getFieldValue('mbSubscriptionZipcode');
        var address1 = getFieldValue('mbSubscriptionAddress1');
        var address2 = getFieldValue('mbSubscriptionAddress2');
        var deliveryDay = Number(getFieldValue('mbSubscriptionDeliveryDay') || 5);
        var regularPrice = Number(getFieldValue('mbSubscriptionRegularPrice') || 0);
        var subscriberPrice = Number(getFieldValue('mbSubscriptionSubscriberPrice') || 0);
        var nextOrderDate = computeFirstDeliveryDate(deliveryDay);

        if (!classId || !branduid || !className) {
            setSubscriptionFeedback('구독 대상 클래스를 다시 선택해주세요.', 'error');
            return null;
        }
        if (!memberName || !memberEmail || !phone || !zipcode || !address1) {
            setSubscriptionFeedback('이름, 이메일, 연락처, 우편번호, 주소를 모두 입력해주세요.', 'error');
            return null;
        }

        return {
            action: 'createSubscription',
            member_id: memberId,
            member_name: memberName,
            member_email: memberEmail,
            member_phone: phone,
            class_id: classId,
            class_name: className,
            partner_name: getFieldValue('mbSubscriptionPartnerName'),
            partner_code: getFieldValue('mbSubscriptionPartnerCode'),
            kit_bundle_branduid: branduid,
            regular_price: regularPrice,
            subscriber_price: subscriberPrice,
            preview_items: selectedSubscriptionProfile && selectedSubscriptionProfile.preview_items ? selectedSubscriptionProfile.preview_items : [],
            delivery_day: deliveryDay,
            next_order_date: nextOrderDate,
            shipping_zipcode: zipcode,
            shipping_address1: address1,
            shipping_address2: address2,
            notes: getFieldValue('mbSubscriptionNotes')
        };
    }

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

    function getEmptySubscriptionState() {
        return {
            active: [],
            inactive: [],
            totalSavings: 0
        };
    }

    function getEmptyRetentionModel() {
        return {
            hasCompleted: false,
            monthly: {
                title: getMonthTitle(new Date()),
                description: '이번 달 첫 수업을 아직 시작하지 않았다면 지금 탐색 흐름을 다시 열어보세요.',
                completedCount: 0,
                completedHint: '이번 달 첫 완료 수업을 만들어보세요',
                totalSpend: 0,
                spendHint: '결제 기록이 아직 없습니다',
                partnerCount: 0,
                partnerHint: '새 강사를 찾아볼 차례입니다',
                topCategory: '첫 수업 준비 중',
                categoryHint: '입문 카테고리부터 시작해보세요',
                footerText: '완료 수업이 쌓이면 월간 리포트가 더 풍부해집니다.'
            },
            badges: {
                title: '연속 수강 배지 보드',
                description: '수강 흐름이 이어질수록 다음 배지가 열립니다.',
                streakCount: 0,
                nextMilestoneText: '첫 배지를 향해 3회 수강을 시작해보세요.',
                items: [
                    { threshold: 3, title: 'Starter Loop', earned: false, description: '앞으로 3회 더 들으면 열립니다.' },
                    { threshold: 5, title: 'Steady Bloom', earned: false, description: '앞으로 5회 더 들으면 열립니다.' },
                    { threshold: 10, title: 'Signature Collector', earned: false, description: '앞으로 10회 더 들으면 열립니다.' }
                ]
            },
            noticeHtml: ''
        };
    }

    function getTodayString() {
        var today = new Date();
        return today.getFullYear() + '-' + padZero(today.getMonth() + 1) + '-' + padZero(today.getDate());
    }

    function computeFirstDeliveryDate(deliveryDay) {
        var today = new Date();
        var year = today.getFullYear();
        var month = today.getMonth();
        var candidate = null;
        var maxDay = 28;
        var day = Math.min(Math.max(parseInt(deliveryDay, 10) || 5, 1), 28);

        candidate = new Date(year, month, day);
        if (candidate.getTime() <= today.getTime()) {
            candidate = new Date(year, month + 1, day);
        }

        maxDay = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate();
        candidate.setDate(Math.min(day, maxDay));
        return candidate.getFullYear() + '-' + padZero(candidate.getMonth() + 1) + '-' + padZero(candidate.getDate());
    }

    function getMonthKey(date) {
        date = date || new Date();
        return date.getFullYear() + '-' + padZero(date.getMonth() + 1);
    }

    function getMonthTitle(date) {
        date = date || new Date();
        return date.getFullYear() + '년 ' + (date.getMonth() + 1) + '월 수강 리포트';
    }

    function parseDateValue(value) {
        var text = String(value || '').substring(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
            return null;
        }
        return new Date(text + 'T00:00:00+09:00');
    }

    function diffDays(dateA, dateB) {
        if (!dateA || !dateB || isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
            return 9999;
        }
        return Math.round((dateA.getTime() - dateB.getTime()) / (24 * 60 * 60 * 1000));
    }

    function clearReviewThanksState() {
        try {
            localStorage.removeItem(REVIEW_THANKS_KEY);
        } catch (err) {
            return;
        }
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

    function extractBrandUid(raw) {
        var text = String(raw || '').replace(/\s+/g, '').trim();
        var match = text.match(/[?&]branduid=([^&#]+)/i);

        if (match && match[1]) {
            return decodeURIComponent(match[1]);
        }
        if (/^[A-Za-z0-9_-]{4,64}$/.test(text)) {
            return text;
        }
        return '';
    }

    function getFieldValue(id) {
        var el = document.getElementById(id);
        return el ? String(el.value || '').trim() : '';
    }

    function setFieldValue(id, value) {
        var el = document.getElementById(id);
        if (el) {
            el.value = value == null ? '' : String(value);
        }
    }

    function focusFirstSubscriptionInput() {
        var el = document.getElementById('mbSubscriptionMemberName');
        if (el && typeof el.focus === 'function') {
            el.focus();
        }
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

    function formatNumber(n) {
        return formatPrice(n);
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
