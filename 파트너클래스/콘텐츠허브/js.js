/* ============================================
   PRESSCO21 콘텐츠 허브 페이지
   메이크샵 D4 호환: IIFE, var, \${} 이스케이프
   ============================================ */
(function() {
    'use strict';

    var API_URL = 'https://n8n.pressco21.com/webhook/class-api';
    var LIST_PAGE_ID = '2606';
    var DETAIL_PAGE_ID = '2607';
    var APPLY_PAGE_ID = '2609';
    var currentData = null;

    function init() {
        bindNav();
        bindRetry();
        fetchContentHub();
    }

    function bindNav() {
        var buttons = document.querySelectorAll('.partner-content-hub .pch-nav__btn');
        var i;

        for (i = 0; i < buttons.length; i += 1) {
            buttons[i].addEventListener('click', function() {
                var targetId = this.getAttribute('data-scroll-target');
                activateNavButton(this);
                scrollToSection(targetId);
            });
        }
    }

    function bindRetry() {
        var retryBtn = document.getElementById('pchRetryBtn');
        if (!retryBtn) return;
        retryBtn.addEventListener('click', function() {
            fetchContentHub();
        });
    }

    function activateNavButton(activeButton) {
        var buttons = document.querySelectorAll('.partner-content-hub .pch-nav__btn');
        var i;

        for (i = 0; i < buttons.length; i += 1) {
            buttons[i].classList.remove('is-active');
        }

        if (activeButton) {
            activeButton.classList.add('is-active');
        }
    }

    function scrollToSection(targetId) {
        var target = document.getElementById(targetId);
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function fetchContentHub() {
        showLoading();

        fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getContentHub' })
        })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                return response.json();
            })
            .then(function(payload) {
                if (!payload || payload.success !== true || !payload.data) {
                    throw new Error('INVALID_RESPONSE');
                }

                currentData = payload.data;
                renderHub(currentData);
                showContent();
            })
            .catch(function() {
                showError();
            });
    }

    function renderHub(data) {
        data = data || {};
        renderSummary(data.summary || {});
        renderFeatureMessage(data.featured_message || '');
        renderHighlights(data.highlights || []);
        renderStories(data.partner_stories || []);
        renderTrends(data.trends || []);
        renderGuides(data.guides || []);
    }

    function renderSummary(summary) {
        setText('pchTotalClasses', formatNumber(summary.total_classes || 0));
        setText('pchTotalPartners', formatNumber(summary.total_partners || 0));
        setText('pchTotalBeginner', formatNumber(summary.total_beginner_classes || 0));
        setText('pchTotalRegions', formatNumber(summary.total_regions || 0));
    }

    function renderFeatureMessage(text) {
        setText('pchFeatureMessage', text || '전국 파트너 클래스와 콘텐츠를 한 허브에서 탐색하세요.');
    }

    function renderHighlights(items) {
        var container = document.getElementById('pchHighlightsGrid');
        var html = '';
        var i;

        if (!container) return;
        if (!items || !items.length) {
            container.innerHTML = '<div class="pch-empty">지금 노출할 클래스 하이라이트가 없습니다. 전체 클래스 페이지에서 최신 클래스를 확인해 주세요.</div>';
            return;
        }

        for (i = 0; i < items.length; i += 1) {
            html += buildHighlightCard(items[i]);
        }

        container.innerHTML = html;
    }

    function renderStories(items) {
        var container = document.getElementById('pchStoriesGrid');
        var list = (items || []).slice().sort(compareStoryPriority);
        var html = '';
        var i;

        if (!container) return;
        if (!list.length) {
            container.innerHTML = '<div class="pch-empty">아직 스토리 카드로 노출할 파트너 데이터가 없습니다.</div>';
            return;
        }

        for (i = 0; i < list.length; i += 1) {
            html += buildStoryCard(list[i]);
        }

        container.innerHTML = html;
    }

    function normalizePartnerGrade(raw) {
        var text = String(raw || '').replace(/\s+/g, ' ').trim().toUpperCase();
        var alias = {
            SILVER: 'BLOOM',
            GOLD: 'GARDEN',
            PLATINUM: 'ATELIER'
        };

        return alias[text] || text || 'BLOOM';
    }

    function getPartnerGradeMeta(raw) {
        var grade = normalizePartnerGrade(raw);
        var metaMap = {
            BLOOM: { key: 'bloom', label: 'BLOOM', weight: 1, spotlight: '' },
            GARDEN: { key: 'garden', label: 'GARDEN', weight: 2, spotlight: '추천 파트너' },
            ATELIER: { key: 'atelier', label: 'ATELIER', weight: 3, spotlight: '인터뷰 후보' },
            AMBASSADOR: { key: 'ambassador', label: 'AMBASSADOR', weight: 4, spotlight: '멘토 파트너' }
        };

        return metaMap[grade] || metaMap.BLOOM;
    }

    function compareStoryPriority(a, b) {
        var aMeta = getPartnerGradeMeta(a && a.grade);
        var bMeta = getPartnerGradeMeta(b && b.grade);
        var classDiff = (parseInt(b && b.class_count, 10) || 0) - (parseInt(a && a.class_count, 10) || 0);

        if (bMeta.weight !== aMeta.weight) {
            return bMeta.weight - aMeta.weight;
        }
        if (classDiff !== 0) {
            return classDiff;
        }

        return String(a && a.partner_name || '').localeCompare(String(b && b.partner_name || ''));
    }

    function renderTrends(items) {
        var container = document.getElementById('pchTrendsGrid');
        var html = '';
        var i;

        if (!container) return;
        if (!items || !items.length) {
            container.innerHTML = '<div class="pch-empty">아직 트렌드로 묶을 수 있는 클래스 데이터가 부족합니다.</div>';
            return;
        }

        for (i = 0; i < items.length; i += 1) {
            html += buildTrendCard(items[i]);
        }

        container.innerHTML = html;
    }

    function renderGuides(items) {
        var container = document.getElementById('pchGuidesGrid');
        var html = '';
        var i;

        if (!container) return;
        if (!items || !items.length) {
            container.innerHTML = '<div class="pch-empty">입문 클래스를 바탕으로 한 가이드를 곧 공개할 예정입니다.</div>';
            return;
        }

        for (i = 0; i < items.length; i += 1) {
            html += buildGuideCard(items[i]);
        }

        container.innerHTML = html;
    }

    function buildHighlightCard(item) {
        var media = '';
        var meta = [
            escapeHtml(item.partner_name || ''),
            escapeHtml(item.region_label || '전국'),
            formatCurrency(item.price || 0)
        ].join(' · ');

        if (item.thumbnail_url) {
            media = '<div class="pch-card__media"><img src="' + escapeHtml(item.thumbnail_url) + '" alt="' + escapeHtml(item.title || '') + '"></div>';
        } else {
            media = '<div class="pch-card__media"></div>';
        }

        return ''
            + '<article class="pch-card">'
            + '<div class="pch-card__body">'
            + '<span class="pch-card__eyebrow">' + escapeHtml(item.category || 'Highlight') + '</span>'
            + '<h3 class="pch-card__title">' + escapeHtml(item.title || '') + '</h3>'
            + '<p class="pch-card__meta">' + meta + '</p>'
            + '<p class="pch-card__desc">' + escapeHtml(item.highlight_copy || '') + '</p>'
            + '<div class="pch-card__stats">'
            + '<span class="pch-chip">' + escapeHtml(item.level_label || '누구나') + '</span>'
            + '<span class="pch-chip">' + escapeHtml(item.type_label || '원데이') + '</span>'
            + '<span class="pch-chip">평점 ' + formatRating(item.avg_rating || 0) + '</span>'
            + '</div>'
            + '<div class="pch-card__footer">'
            + '<span class="pch-link">자세히 보기</span>'
            + '<a class="pch-btn pch-btn--secondary" href="' + buildDetailUrl(item.class_id) + '">상세 페이지</a>'
            + '</div>'
            + '</div>'
            + media
            + '</article>';
    }

    function buildStoryCard(item) {
        var gradeMeta = getPartnerGradeMeta(item.grade);
        var spotlight = gradeMeta.spotlight
            ? '<span class="pch-story-card__spotlight">' + escapeHtml(gradeMeta.spotlight) + '</span>'
            : '';

        return ''
            + '<article class="pch-story-card pch-story-card--' + gradeMeta.key + '">'
            + '<div class="pch-story-card__body">'
            + '<span class="pch-story-card__eyebrow pch-story-card__eyebrow--' + gradeMeta.key + '">' + escapeHtml(gradeMeta.label) + '</span>'
            + '<h3 class="pch-story-card__title">' + escapeHtml(item.headline || item.partner_name || '') + '</h3>'
            + '<p class="pch-story-card__meta">' + escapeHtml(item.region_label || '전국') + ' · ' + escapeHtml(item.featured_category || '꽃 공예') + ' · 클래스 ' + formatNumber(item.class_count || 0) + '개</p>'
            + '<p class="pch-story-card__quote">' + escapeHtml(item.quote || '') + '</p>'
            + spotlight
            + '<div class="pch-story-card__tags">' + buildTagList(item.focus_points || []) + '</div>'
            + '<div class="pch-story-card__footer">'
            + '<span class="pch-link">파트너 보기</span>'
            + '<a class="pch-btn pch-btn--secondary" href="' + buildPartnerSearchUrl(item.search_keyword || item.partner_name || '') + '">관련 클래스</a>'
            + '</div>'
            + '</div>'
            + '</article>';
    }

    function buildTrendCard(item) {
        return ''
            + '<article class="pch-trend-card">'
            + '<div class="pch-trend-card__body">'
            + '<span class="pch-trend-card__eyebrow">' + escapeHtml(item.eyebrow || '') + '</span>'
            + '<h3 class="pch-trend-card__title">' + escapeHtml(item.title || '') + '</h3>'
            + '<p class="pch-trend-card__desc">' + escapeHtml(item.description || '') + '</p>'
            + '<div class="pch-trend-card__chips">' + buildChipList(item.chips || []) + '</div>'
            + '<div class="pch-trend-card__footer">'
            + '<span class="pch-link">트렌드 탐색</span>'
            + '<a class="pch-btn pch-btn--secondary" href="' + buildListUrl({ category: item.category || '' }) + '">관련 클래스</a>'
            + '</div>'
            + '</div>'
            + '</article>';
    }

    function buildGuideCard(item) {
        return ''
            + '<article class="pch-guide-card">'
            + '<div class="pch-guide-card__body">'
            + '<span class="pch-guide-card__eyebrow">' + escapeHtml(item.level_label || '입문') + '</span>'
            + '<h3 class="pch-guide-card__title">' + escapeHtml(item.title || '') + '</h3>'
            + '<p class="pch-guide-card__meta">' + escapeHtml(item.partner_name || '') + ' · ' + escapeHtml(item.region_label || '전국') + ' · ' + formatCurrency(item.price || 0) + '</p>'
            + '<p class="pch-guide-card__desc">' + escapeHtml(item.category || '꽃 공예') + ' 카테고리에서 처음 시작할 수 있도록 핵심 정보를 짧게 정리했습니다.</p>'
            + '<ul class="pch-guide-card__checklist">' + buildChecklist(item.checklist || []) + '</ul>'
            + '<div class="pch-guide-card__footer">'
            + '<span class="pch-link">가이드 연결</span>'
            + '<a class="pch-btn pch-btn--secondary" href="' + buildDetailUrl(item.class_id) + '">추천 클래스</a>'
            + '</div>'
            + '</div>'
            + '</article>';
    }

    function buildTagList(items) {
        var html = '';
        var i;

        for (i = 0; i < items.length; i += 1) {
            html += '<span class="pch-tag">' + escapeHtml(items[i]) + '</span>';
        }

        return html || '<span class="pch-tag">스토리 준비 중</span>';
    }

    function buildChipList(items) {
        var html = '';
        var i;

        for (i = 0; i < items.length; i += 1) {
            html += '<span class="pch-chip">' + escapeHtml(items[i]) + '</span>';
        }

        return html || '<span class="pch-chip">전국</span>';
    }

    function buildChecklist(items) {
        var html = '';
        var i;

        for (i = 0; i < items.length; i += 1) {
            html += '<li>' + escapeHtml(items[i]) + '</li>';
        }

        return html;
    }

    function buildDetailUrl(classId) {
        return '/shop/page.html?id=' + DETAIL_PAGE_ID + '&class_id=' + encodeURIComponent(classId || '');
    }

    function buildPartnerSearchUrl(keyword) {
        return buildListUrl({ search: keyword || '' });
    }

    function buildListUrl(params) {
        var url = '/shop/page.html?id=' + LIST_PAGE_ID;
        var query = [];

        if (params.category) {
            query.push('category=' + encodeURIComponent(params.category));
        }
        if (params.search) {
            query.push('search=' + encodeURIComponent(params.search));
        }

        if (!query.length) {
            return url;
        }

        return url + '&' + query.join('&');
    }

    function formatCurrency(value) {
        return formatNumber(value || 0) + '원';
    }

    function formatNumber(value) {
        var number = Number(value) || 0;
        return String(Math.round(number)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function formatRating(value) {
        var number = Number(value) || 0;
        return (Math.round(number * 10) / 10).toFixed(1);
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) {
            el.textContent = value;
        }
    }

    function showLoading() {
        showElement('pchLoading');
        hideElement('pchError');
        hideElement('pchContent');
    }

    function showError() {
        hideElement('pchLoading');
        showElement('pchError');
        hideElement('pchContent');
    }

    function showContent() {
        hideElement('pchLoading');
        hideElement('pchError');
        showElement('pchContent');
    }

    function showElement(id) {
        var el = document.getElementById(id);
        if (el) {
            el.style.display = '';
        }
    }

    function hideElement(id) {
        var el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
