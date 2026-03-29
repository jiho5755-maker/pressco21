/* ============================================
   PRESSCO21 콘텐츠 허브 페이지 (E2-005) - js.js
   메이크샵 D4 호환: IIFE, var, \${} 이스케이프
   CSS 스코핑: .content-hub
   ============================================ */
(function() {
    'use strict';

    /* ========================================
       설정값
       ======================================== */

    /* 공통 모듈 바인딩 (pressco21-core.js) */
    var PC = window.PRESSCO21;
    var escapeHtml = PC.util.escapeHtml;

    /** 페이지 URL 상수 */
    var PAGE_LIST = PC.auth.pageUrl('LIST');

    /** 탭 ID와 패널 ID 매핑 */
    var TAB_MAP = {
        partnerStory: 'chPartnerStory',
        reviews:      'chReviews',
        guide:        'chGuide',
        season:       'chSeason'
    };


    /* ========================================
       데모 데이터
       ======================================== */

    /** 파트너 스토리 데모 */
    var PARTNER_STORIES = [
        {
            title: '김OO 강사의 압화 이야기',
            desc: '20년 경력의 압화 전문가가 들려주는 꽃을 영원히 보존하는 예술. 자연의 아름다움을 담아내는 섬세한 작업 과정을 소개합니다.',
            category: '압화',
            badge: 'AMBASSADOR',
            meta: ['경력 20년', '압화 전문']
        },
        {
            title: '이OO 강사의 레진아트 세계',
            desc: '투명한 레진 속에 꽃과 빛을 가두는 마법 같은 작업. 섬세한 작품으로 인기를 끌고 있는 이OO 강사의 작품 세계를 만나보세요.',
            category: '레진아트',
            badge: 'ATELIER',
            meta: ['경력 8년', '레진아트 전문']
        },
        {
            title: '박OO 강사의 캔들 클래스',
            desc: '향기로 치유하는 시간. 천연 소이왁스와 보존화를 결합한 특별한 캔들 클래스를 소개합니다.',
            category: '캔들',
            badge: 'GARDEN',
            meta: ['경력 5년', '캔들 전문']
        }
    ];

    /** 꽃공예 가이드 데모 */
    var GUIDE_ITEMS = [
        {
            title: '압화란 무엇인가요?',
            desc: '꽃을 눌러 보존하는 전통 예술. 압화의 역사부터 기본 기법까지 초보자를 위한 친절한 안내입니다.',
            category: '기초',
            badge: '입문',
            meta: ['5분 읽기', '초보자용']
        },
        {
            title: '레진아트 시작하기',
            desc: '투명한 레진으로 만드는 아름다움. 필요한 재료, 안전 수칙, 첫 작품 만들기까지 단계별로 알려드립니다.',
            category: '기초',
            badge: '입문',
            meta: ['8분 읽기', '초보자용']
        },
        {
            title: '처음 공방에 가기 전 알아야 할 것',
            desc: '준비물과 마음가짐. 원데이 클래스 참여 전 꼭 알아두면 좋은 실전 팁을 정리했습니다.',
            category: '팁',
            badge: '실전',
            meta: ['3분 읽기', '실전 팁']
        }
    ];

    /** 시즌 큐레이션: 현재 월 기준으로 자동 결정 */
    var SEASON_DATA = {
        spring: {
            label: '2026 SPRING',
            title: '봄 꽃공예 추천 클래스',
            desc: '벚꽃과 튤립이 만개하는 계절. 봄의 싱그러움을 담은 압화, 리스, 부케 클래스를 만나보세요.',
            gradient: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 30%, #f48fb1 100%)',
            btnColor: '#ad1457',
            keywords: [
                { icon: '\uD83C\uDF38', title: '\uBC9A\uAF43 \uC555\uD654', desc: '\uBD04\uC758 \uB300\uD45C \uAF43\uC744 \uC601\uC6D0\uD788' },
                { icon: '\uD83C\uDF37', title: '\uD280\uB9BD \uBD80\uCF00', desc: '\uD654\uC0AC\uD55C \uBD04 \uBD80\uCF00 \uB9CC\uB4E4\uAE30' },
                { icon: '\uD83C\uDF3C', title: '\uBD04\uAF43 \uB9AC\uC2A4', desc: '\uBB38 \uC55E\uC5D0 \uBD04\uC744 \uAC74 \uB9AC\uC2A4' }
            ]
        },
        summer: {
            label: '2026 SUMMER',
            title: '여름 꽃공예 추천 클래스',
            desc: '시원한 실내에서 즐기는 꽃공예. 해바라기, 수국 등 여름 꽃을 활용한 클래스를 소개합니다.',
            gradient: 'linear-gradient(135deg, #e3f2fd 0%, #90caf9 50%, #42a5f5 100%)',
            btnColor: '#1565c0',
            keywords: [
                { icon: '\uD83C\uDF3B', title: '\uD574\uBC14\uB77C\uAE30 \uC555\uD654', desc: '\uD587\uBCBC \uAC00\uB4DD\uD55C \uC5EC\uB984 \uC555\uD654' },
                { icon: '\uD83D\uDCA7', title: '\uC218\uAD6D \uB808\uC9C4', desc: '\uCCAD\uB7C9\uD55C \uC218\uAD6D \uB808\uC9C4\uC544\uD2B8' },
                { icon: '\uD83C\uDF3A', title: '\uD2B8\uB85C\uD53C\uCEEC \uCE94\uB4E4', desc: '\uC5F4\uB300 \uAF43 \uD5A5\uAE30 \uCE94\uB4E4' }
            ]
        },
        autumn: {
            label: '2026 AUTUMN',
            title: '가을 꽃공예 추천 클래스',
            desc: '단풍과 국화의 계절. 따뜻한 색감의 가을 꽃공예 클래스를 추천합니다.',
            gradient: 'linear-gradient(135deg, #fff3e0 0%, #ffcc80 50%, #ff9800 100%)',
            btnColor: '#e65100',
            keywords: [
                { icon: '\uD83C\uDF41', title: '\uB2E8\uD48D \uC555\uD654', desc: '\uAC00\uC744 \uB2E8\uD48D\uC744 \uB2F4\uC740 \uC555\uD654' },
                { icon: '\uD83C\uDF3E', title: '\uB4DC\uB77C\uC774\uD50C\uB77C\uC6CC', desc: '\uC790\uC5F0 \uAC74\uC870 \uAF43 \uC791\uD488' },
                { icon: '\uD83D\uDD6F\uFE0F', title: '\uAC00\uC744 \uD5A5 \uCE94\uB4E4', desc: '\uB530\uB73B\uD55C \uAC00\uC744 \uD5A5 \uCE94\uB4E4' }
            ]
        },
        winter: {
            label: '2026 WINTER',
            title: '겨울 꽃공예 추천 클래스',
            desc: '포근한 겨울, 크리스마스 리스와 보존화 액자로 특별한 선물을 만들어보세요.',
            gradient: 'linear-gradient(135deg, #e8eaf6 0%, #9fa8da 50%, #5c6bc0 100%)',
            btnColor: '#283593',
            keywords: [
                { icon: '\uD83C\uDF84', title: '\uD06C\uB9AC\uC2A4\uB9C8\uC2A4 \uB9AC\uC2A4', desc: '\uC131\uD0C4 \uBD84\uC704\uAE30 \uB9AC\uC2A4' },
                { icon: '\u2744\uFE0F', title: '\uACA8\uC6B8 \uBCF4\uC874\uD654', desc: '\uACA8\uC6B8 \uAF43 \uC561\uC790 \uB9CC\uB4E4\uAE30' },
                { icon: '\uD83C\uDF81', title: '\uC120\uBB3C\uC6A9 \uCE94\uB4E4', desc: '\uC18C\uC911\uD55C \uC0AC\uB78C\uC5D0\uAC8C \uC120\uBB3C' }
            ]
        }
    };


    /* ========================================
       유틸리티
       ======================================== */

    /**
     * 현재 계절 반환
     * @returns {string} spring|summer|autumn|winter
     */
    function getCurrentSeason() {
        var month = new Date().getMonth() + 1;
        if (month >= 3 && month <= 5) return 'spring';
        if (month >= 6 && month <= 8) return 'summer';
        if (month >= 9 && month <= 11) return 'autumn';
        return 'winter';
    }

    /**
     * 등급 배지 색상 매핑
     * @param {string} grade - 등급명
     * @returns {string} CSS 클래스 수식어
     */
    function getBadgeModifier(grade) {
        if (grade === 'AMBASSADOR' || grade === 'ATELIER') return ' ch-card__badge--gold';
        return '';
    }

    /**
     * 카드형 플레이스홀더 SVG 아이콘
     * @param {string} type - story|guide
     * @returns {string} SVG 문자열
     */
    function getPlaceholderSvg(type) {
        if (type === 'story') {
            return '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
                + '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>'
                + '<circle cx="12" cy="7" r="4"/></svg>';
        }
        return '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
            + '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>'
            + '<path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>';
    }


    /* ========================================
       렌더링 함수
       ======================================== */

    /** 교차 추천 링크용 화살표 SVG */
    var ARROW_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';

    /**
     * 교차 추천 링크 HTML 생성
     * @param {Object} item - 카드 데이터
     * @param {string} type - story|guide
     * @returns {string} HTML 문자열
     */
    function getCrossLink(item, type) {
        if (type === 'story') {
            /* 파트너 스토리 -> 해당 파트너의 클래스 목록 */
            return '<a href="' + PAGE_LIST + '" class="ch-card__cross-link">'
                + '관련 클래스 보기 ' + ARROW_SVG + '</a>';
        }
        /* 가이드 -> 관련 카테고리 클래스 필터 */
        var cat = encodeURIComponent(item.category || '');
        return '<a href="' + PAGE_LIST + (cat ? '&category=' + cat : '') + '" class="ch-card__cross-link">'
            + '관련 클래스 보기 ' + ARROW_SVG + '</a>';
    }

    /**
     * 카드 HTML 생성 (파트너 스토리 / 꽃공예 가이드 공용)
     * @param {Object} item - 카드 데이터
     * @param {string} type - story|guide
     * @returns {string} HTML 문자열
     */
    function renderCard(item, type) {
        var badgeClass = getBadgeModifier(item.badge);
        var metaHtml = '';
        if (item.meta && item.meta.length > 0) {
            metaHtml = '<div class="ch-card__meta">';
            for (var i = 0; i < item.meta.length; i++) {
                if (i > 0) {
                    metaHtml += '<span class="ch-card__meta-dot"></span>';
                }
                metaHtml += '<span>' + escapeHtml(item.meta[i]) + '</span>';
            }
            metaHtml += '</div>';
        }

        /* 교차 추천 링크 */
        var crossLinkHtml = getCrossLink(item, type);

        return '<article class="ch-card">'
            + '<div class="ch-card__thumb">'
            +   '<div class="ch-card__thumb-icon">' + getPlaceholderSvg(type) + '</div>'
            +   '<span class="ch-card__badge' + badgeClass + '">' + escapeHtml(item.badge) + '</span>'
            + '</div>'
            + '<div class="ch-card__body">'
            +   '<span class="ch-card__category">' + escapeHtml(item.category) + '</span>'
            +   '<h3 class="ch-card__title">' + escapeHtml(item.title) + '</h3>'
            +   '<p class="ch-card__desc">' + escapeHtml(item.desc) + '</p>'
            +   metaHtml
            +   crossLinkHtml
            + '</div>'
            + '</article>';
    }

    /**
     * 파트너 스토리 패널 렌더링
     */
    function renderPartnerStories() {
        var grid = document.getElementById('partnerStoryGrid');
        if (!grid) return;

        var html = '';
        for (var i = 0; i < PARTNER_STORIES.length; i++) {
            html += renderCard(PARTNER_STORIES[i], 'story');
        }
        grid.innerHTML = html;
    }

    /**
     * 수강생 후기 패널 렌더링 (빈 상태)
     * 향후 WF-01 API 연동 시 여기에 리뷰 카드 렌더링 추가
     */
    function renderReviews() {
        var area = document.getElementById('reviewArea');
        if (!area) return;

        /* 현재는 빈 상태 UI */
        area.innerHTML = '<div class="ch-empty">'
            + '<div class="ch-empty__icon">'
            +   '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
            +     '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'
            +   '</svg>'
            + '</div>'
            + '<h3 class="ch-empty__title">아직 후기가 없습니다</h3>'
            + '<p class="ch-empty__desc">'
            +   '클래스를 수강하신 후 첫 번째 후기를 남겨주세요.<br>'
            +   '여러분의 경험이 다른 분들에게 큰 도움이 됩니다.'
            + '</p>'
            + '<a href="' + PAGE_LIST + '" class="ch-empty__btn">클래스 둘러보기</a>'
            + '</div>';
    }

    /**
     * 꽃공예 가이드 패널 렌더링
     */
    function renderGuides() {
        var grid = document.getElementById('guideGrid');
        if (!grid) return;

        var html = '';
        for (var i = 0; i < GUIDE_ITEMS.length; i++) {
            html += renderCard(GUIDE_ITEMS[i], 'guide');
        }
        grid.innerHTML = html;
    }

    /**
     * 시즌 큐레이션 패널 렌더링
     */
    function renderSeason() {
        var area = document.getElementById('seasonArea');
        if (!area) return;

        var season = getCurrentSeason();
        var data = SEASON_DATA[season];

        /* 배너 */
        var html = '<div class="ch-season-banner" style="background: ' + data.gradient + ';">'
            + '<span class="ch-season-banner__label">' + escapeHtml(data.label) + '</span>'
            + '<h3 class="ch-season-banner__title">' + escapeHtml(data.title) + '</h3>'
            + '<p class="ch-season-banner__desc">' + escapeHtml(data.desc) + '</p>'
            + '<a href="' + PAGE_LIST + '" class="ch-season-banner__btn" style="color: ' + data.btnColor + ';">'
            +   '추천 클래스 보기'
            +   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>'
            + '</a>'
            + '</div>';

        /* 키워드 카드 */
        html += '<div class="ch-season-cards">';
        for (var i = 0; i < data.keywords.length; i++) {
            var kw = data.keywords[i];
            html += '<div class="ch-season-card">'
                + '<div class="ch-season-card__icon">' + kw.icon + '</div>'
                + '<h4 class="ch-season-card__title">' + escapeHtml(kw.title) + '</h4>'
                + '<p class="ch-season-card__desc">' + escapeHtml(kw.desc) + '</p>'
                + '</div>';
        }
        html += '</div>';

        area.innerHTML = html;
    }


    /* ========================================
       탭 전환 로직
       ======================================== */

    /**
     * 탭 전환 처리
     * @param {string} tabKey - TAB_MAP 키
     */
    function switchTab(tabKey) {
        var panelId = TAB_MAP[tabKey];
        if (!panelId) return;

        /* 모든 탭 비활성화 */
        var tabs = document.querySelectorAll('.content-hub .ch-tabs__btn');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].classList.remove('ch-tabs__btn--active');
            tabs[i].setAttribute('aria-selected', 'false');
        }

        /* 모든 패널 숨기기 */
        var panels = document.querySelectorAll('.content-hub .ch-panel');
        for (var j = 0; j < panels.length; j++) {
            panels[j].classList.remove('ch-panel--active');
            panels[j].hidden = true;
        }

        /* 선택된 탭 활성화 */
        var activeTab = document.querySelector('.content-hub .ch-tabs__btn[data-tab="' + tabKey + '"]');
        if (activeTab) {
            activeTab.classList.add('ch-tabs__btn--active');
            activeTab.setAttribute('aria-selected', 'true');
        }

        /* 선택된 패널 표시 */
        var activePanel = document.getElementById(panelId);
        if (activePanel) {
            activePanel.classList.add('ch-panel--active');
            activePanel.hidden = false;
        }

        /* URL 해시 업데이트 (히스토리 변경 없이) */
        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', '#' + tabKey);
        }
    }

    /**
     * 탭 클릭 이벤트 바인딩 (이벤트 위임)
     */
    function bindTabEvents() {
        var tabNav = document.querySelector('.content-hub .ch-tabs');
        if (!tabNav) return;

        tabNav.addEventListener('click', function(e) {
            var btn = e.target.closest('.ch-tabs__btn');
            if (!btn) return;

            var tabKey = btn.getAttribute('data-tab');
            if (tabKey) {
                switchTab(tabKey);
            }
        });
    }

    /**
     * URL 해시에서 초기 탭 결정
     */
    function initTabFromHash() {
        var hash = window.location.hash.replace('#', '');
        if (hash && TAB_MAP[hash]) {
            switchTab(hash);
        }
    }


    /* ========================================
       초기화
       ======================================== */

    function init() {
        /* 콘텐츠 렌더링 */
        renderPartnerStories();
        renderReviews();
        renderGuides();
        renderSeason();

        /* 탭 이벤트 바인딩 */
        bindTabEvents();

        /* URL 해시 기반 초기 탭 */
        initTabFromHash();
    }

    /* DOM Ready */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
