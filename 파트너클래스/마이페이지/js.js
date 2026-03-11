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
    var REVIEW_THANKS_KEY = 'pressco21_review_thanks_v1';

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
        bindRetentionEvents();

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
                    var retention = buildRetentionModel(bookings, context);
                    showLoading(false);
                    renderRetention(retention);
                    renderBookings(bookings, context);
                });
            })
            .catch(function(err) {
                showLoading(false);
                console.error('[MyBookings] API 오류:', err);
                renderRetention(getEmptyRetentionModel());
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
