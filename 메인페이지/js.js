/* ========================================
   PRESSCO21 메인페이지 - 메이크샵 D4
   IIFE 패턴으로 전역 변수 오염 방지
   주의: 템플릿 리터럴 내 ${var}는 \${var}로 이스케이프
   ======================================== */
(function() {
    'use strict';

    /* ========================================
       설정
       ======================================== */
    var YOUTUBE_GAS_URL =
        'https://script.google.com/macros/s/AKfycbxNQxgd8Ew0oClPSIoSA3vbtbf4LoOyHL6j7J1cXSyI1gmaL3ya6teTwmu883js4zSkwg/exec';

    /* ========================================
       상품 더보기 (페이지네이션)
       메이크샵 가상태그에서 호출하므로 window에 노출
       ======================================== */
    function get_main_list(_t_name, _page, _element, _page_html, _row) {
        if ($(_element).length === 0) return;

        // 스켈레톤 UI 표시
        var tabContent = $(_element).closest('.tab-content');
        showSkeleton(tabContent);

        $.ajax({
            url: '/m/product_list.action.html?r=' + Math.random(),
            type: 'GET',
            dataType: 'json',
            data: {
                action_mode: 'GET_MAIN_PRODUCT_LIST',
                tag_name: _t_name,
                page_id: get_page_id(),
                page: _page
            },
            success: function(res) {
                var dom = $('<div>').html(res.html);
                if ($('ul.items:only-child', $(_element)).length === 0) {
                    $(_element).append($('<ul class="items"></ul>'));
                }
                $('ul.items', _element).append($('ul.items', dom).html());

                if (res.is_page_end === true) {
                    $('.' + _page_html).hide();
                } else {
                    _page++;
                    // javascript: 프로토콜 대신 data 속성으로 파라미터 저장
                    var btn = $('.' + _page_html + ' > a');
                    btn.attr('href', '#none');
                    btn.data('tag', _t_name);
                    btn.data('page', _page);
                    btn.data('element', _element);
                    btn.data('pageHtml', _page_html);
                    btn.data('row', _row);
                }
                dom = null;
                hideSkeleton(tabContent);
            },
            error: function() {
                hideSkeleton(tabContent);
            }
        });
    }
    window.get_main_list = get_main_list;

    /* ========================================
       더보기 버튼 이벤트 위임
       javascript: href 대신 click 이벤트 사용
       ======================================== */
    function initMoreButtons() {
        $(document).on('click', '.btn-wrap .btn-more', function(e) {
            e.preventDefault();
            var btn = $(this);
            var tag = btn.data('tag');
            if (!tag) return;
            get_main_list(
                tag,
                btn.data('page'),
                btn.data('element'),
                btn.data('pageHtml'),
                btn.data('row')
            );
        });
    }

    /* ========================================
       스켈레톤 UI
       ======================================== */
    function createSkeletonHTML() {
        var cards = '';
        for (var i = 0; i < 4; i++) {
            cards +=
                '<div class="skeleton-card">' +
                    '<div class="skeleton-img skeleton-shimmer"></div>' +
                    '<div class="skeleton-text skeleton-shimmer" style="width:80%"></div>' +
                    '<div class="skeleton-text skeleton-shimmer" style="width:50%"></div>' +
                '</div>';
        }
        return '<div class="skeleton-wrap">' + cards + '</div>';
    }

    function showSkeleton(tabContent) {
        if (!tabContent || tabContent.length === 0) return;
        var existing = tabContent.find('.skeleton-wrap');
        if (existing.length > 0) {
            existing.show();
            return;
        }
        tabContent.find('.product-list-wrap').after(createSkeletonHTML());
    }

    function hideSkeleton(tabContent) {
        if (!tabContent || tabContent.length === 0) return;
        tabContent.find('.skeleton-wrap').remove();
    }

    /* ========================================
       탭 메뉴 (Section02 - New Arrival)
       ======================================== */
    function initTabs() {
        var section = $('#section02');
        if (section.length === 0) return;

        section.find('.tab-nav-wrap ul li button').on('click', function() {
            var li = $(this).parent();
            var index = li.index();
            var tabContents = section.find('.tab-content-wrap .tab-content');

            // 현재 탭의 콘텐츠 스켈레톤 표시
            var targetContent = tabContents.eq(index);
            showSkeleton(targetContent);

            // active 클래스 전환
            section.find('.tab-nav-wrap ul li').removeClass('active');
            section.find('.tab-nav-wrap ul li button').attr('aria-selected', 'false');
            tabContents.removeClass('active');
            li.addClass('active');
            $(this).attr('aria-selected', 'true');
            targetContent.addClass('active');

            // 스켈레톤 해제 (서버 렌더링된 콘텐츠이므로 짧은 딜레이 후)
            setTimeout(function() {
                hideSkeleton(targetContent);
            }, 300);

            // 모바일 탭 자동 중앙 스크롤
            scrollTabToCenter(this);
        });
    }

    function scrollTabToCenter(btnElement) {
        var tabNavWrap = document.querySelector('#section02 .tab-nav-wrap');
        if (!tabNavWrap || window.innerWidth >= 768) return;

        var li = btnElement.parentElement;
        var wrapWidth = tabNavWrap.offsetWidth;
        var liLeft = li.offsetLeft;
        var liWidth = li.offsetWidth;
        var scrollTarget = liLeft - (wrapWidth / 2) + (liWidth / 2);

        tabNavWrap.scrollTo({
            left: scrollTarget,
            behavior: 'smooth'
        });
    }

    /* ========================================
       Swiper 초기화
       ======================================== */
    function initSwipers() {
        // mySwiper는 메이크샵 D4 기본 제공 Swiper 생성자
        if (typeof mySwiper === 'undefined') return;

        // 메인 배너
        var mainBannerSwiper = new mySwiper('.main-banner', {
            pagination: {
                el: '.main-banner .swiper-pagination',
                type: 'fraction',
                renderFraction: function(currentClass, totalClass) {
                    return '<span class="' + currentClass + '"></span>' +
                        '<span class="' + totalClass + '"></span>';
                }
            },
            autoplay: {
                delay: 3000,
                disableOnInteraction: false
            },
            loop: true,
            navigation: {
                nextEl: '.main-banner .swiper-button-next',
                prevEl: '.main-banner .swiper-button-prev'
            }
        });

        // 카테고리 슬라이더
        var categorySwiper = new mySwiper('.category-swiper', {
            slidesPerView: 1.2,
            spaceBetween: 15,
            loop: true,
            pagination: {
                el: '.category-swiper .swiper-pagination',
                clickable: true
            },
            autoplay: {
                delay: 3000,
                disableOnInteraction: false
            },
            breakpoints: {
                768: {
                    slidesPerView: 3,
                    spaceBetween: 20,
                    slidesPerGroup: 1,
                    loop: false
                },
                1024: {
                    slidesPerView: 3.3,
                    spaceBetween: 30
                }
            }
        });
    }

    /* ========================================
       YouTube 섹션 (Learn & Shop)
       ======================================== */
    var YT_CACHE_KEY = 'yt_cache_v3';
    var YT_CACHE_TIME = 'yt_time_v3';
    var YT_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24시간

    function loadYouTube() {
        var featuredArea = document.getElementById('featured-video-area');
        var sliderWrapper = document.getElementById('youtube-slider-wrapper');
        if (!featuredArea || !sliderWrapper) return;

        // localStorage 캐시 확인
        try {
            var cached = localStorage.getItem(YT_CACHE_KEY);
            var time = localStorage.getItem(YT_CACHE_TIME);
            if (cached && time && Date.now() - parseInt(time) < YT_CACHE_DURATION) {
                renderYouTube(JSON.parse(cached));
                return;
            }
        } catch (e) { /* localStorage 접근 불가 시 무시 */ }

        // GAS API 호출
        $.ajax({
            url: YOUTUBE_GAS_URL + '?count=5&t=' + Date.now(),
            dataType: 'json',
            cache: false,
            timeout: 10000,
            success: function(data) {
                if (data.status === 'success' && data.items) {
                    try {
                        localStorage.setItem(YT_CACHE_KEY, JSON.stringify(data.items));
                        localStorage.setItem(YT_CACHE_TIME, Date.now().toString());
                    } catch (e) { /* localStorage 용량 초과 시 무시 */ }
                    renderYouTube(data.items);
                } else {
                    showYouTubeError(featuredArea);
                }
            },
            error: function() {
                showYouTubeError(featuredArea);
            }
        });
    }

    function showYouTubeError(container) {
        if (!container) return;
        container.innerHTML =
            '<p style="padding:30px;text-align:center;color:#888">영상을 불러올 수 없습니다.</p>';
    }

    function renderYouTube(videos) {
        var featuredArea = document.getElementById('featured-video-area');
        var sliderWrapper = document.getElementById('youtube-slider-wrapper');
        if (!videos || videos.length === 0 || !featuredArea || !sliderWrapper) return;

        // 메인 영상: 썸네일 클릭 시 iframe 로드 (성능 최적화)
        var featured = videos[0];
        var mainThumb = 'https://img.youtube.com/vi/' + featured.id + '/maxresdefault.jpg';
        featuredArea.innerHTML =
            '<div class="video-wrapper yt-thumb-wrap" data-video-id="' + featured.id + '">' +
                '<img src="' + mainThumb + '" alt="' + escapeAttr(featured.title) + '" loading="lazy">' +
                '<div class="yt-play-btn"></div>' +
            '</div>' +
            '<div class="featured-video-info">' +
                '<h4>' + escapeHTML(featured.title) + '</h4>' +
                '<div class="video-meta">' + new Date(featured.publishedAt).toLocaleDateString() + '</div>' +
            '</div>';

        // 썸네일 클릭 시 iframe 로드
        var thumbWrap = featuredArea.querySelector('.yt-thumb-wrap');
        if (thumbWrap) {
            thumbWrap.addEventListener('click', function() {
                playVideo(this.getAttribute('data-video-id'));
            });
        }

        // 슬라이더 영상
        var sliderHTML = '';
        for (var i = 1; i < videos.length; i++) {
            var v = videos[i];
            var thumb = 'https://img.youtube.com/vi/' + v.id + '/mqdefault.jpg';
            sliderHTML +=
                '<div class="swiper-slide" data-video-id="' + v.id + '">' +
                    '<div class="slide-video-thumb">' +
                        '<img src="' + thumb + '" alt="' + escapeAttr(v.title) + '" loading="lazy">' +
                        '<div class="play-icon"></div>' +
                    '</div>' +
                    '<div class="slide-info">' +
                        '<h6>' + escapeHTML(v.title) + '</h6>' +
                        '<span class="date">' + new Date(v.publishedAt).toLocaleDateString() + '</span>' +
                    '</div>' +
                '</div>';
        }
        sliderWrapper.innerHTML = sliderHTML;

        // 슬라이더 Swiper 초기화
        if (typeof Swiper !== 'undefined') {
            new Swiper('.youtube-slider', {
                slidesPerView: 1.1,
                spaceBetween: 10,
                loop: false,
                pagination: { el: '.youtube-slider .swiper-pagination', clickable: true },
                navigation: {
                    nextEl: '.youtube-slider-wrap .swiper-button-next',
                    prevEl: '.youtube-slider-wrap .swiper-button-prev'
                },
                breakpoints: {
                    768: { slidesPerView: 4, spaceBetween: 15, loop: false }
                }
            });
        }

        // 슬라이더 카드 클릭 이벤트 위임
        sliderWrapper.addEventListener('click', function(e) {
            var slide = e.target.closest('.swiper-slide');
            if (slide) {
                var videoId = slide.getAttribute('data-video-id');
                if (videoId) playVideo(videoId);
            }
        });
    }

    function playVideo(videoId) {
        var featuredArea = document.getElementById('featured-video-area');
        if (!featuredArea) return;
        var wrapper = featuredArea.querySelector('.video-wrapper');
        if (wrapper) {
            wrapper.innerHTML =
                '<iframe src="https://www.youtube.com/embed/' + videoId +
                '?rel=0&autoplay=1" frameborder="0" allowfullscreen></iframe>';
            wrapper.classList.remove('yt-thumb-wrap');
        }
        var ytSection = document.querySelector('.youtube-section-v3');
        if (ytSection) {
            ytSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    window.playVideo = playVideo;

    function toggleProducts() {
        var wrap = document.getElementById('related-products-wrap');
        if (!wrap || window.innerWidth >= 768) return;
        if (wrap.classList.contains('collapsed')) {
            wrap.classList.remove('collapsed');
            wrap.classList.add('expanded');
        } else {
            wrap.classList.remove('expanded');
            wrap.classList.add('collapsed');
        }
    }
    window.toggleProducts = toggleProducts;

    /* ========================================
       유틸리티
       ======================================== */
    function escapeHTML(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function escapeAttr(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /* ========================================
       이미지 lazy loading (배너 제외 하단 섹션)
       + 카테고리 아이콘 alt 텍스트 보강
       ======================================== */
    function applyLazyLoading() {
        // 배너 아래 섹션 이미지 lazy loading
        var images = document.querySelectorAll('#section01 img, #section02 img, #section03 img, #section04 img, .youtube-section-v3 img, .brand-philosophy img');
        for (var i = 0; i < images.length; i++) {
            if (!images[i].hasAttribute('loading')) {
                images[i].setAttribute('loading', 'lazy');
            }
        }

        // 카테고리 아이콘 alt 텍스트 보강
        var categoryItems = document.querySelectorAll('#section01 .category-list li');
        categoryItems.forEach(function(li) {
            var img = li.querySelector('img');
            var span = li.querySelector('span');
            if (img && span && (!img.alt || img.alt === '')) {
                img.alt = span.textContent.trim() + ' 아이콘';
            }
        });
    }

    /* ========================================
       접근성: 탭 ARIA 속성 동적 초기화
       메이크샵 HTML 편집기에서 가상태그 충돌 방지를 위해 JS로 처리
       ======================================== */
    function initTabAccessibility() {
        var tabList = document.querySelector('#section02 .tab-nav-wrap ul');
        if (!tabList) return;

        tabList.setAttribute('role', 'tablist');
        tabList.setAttribute('aria-label', '카테고리별 신상품 탭');

        var tabs = tabList.querySelectorAll('li');
        tabs.forEach(function(li, index) {
            li.setAttribute('role', 'presentation');
            var btn = li.querySelector('button');
            if (btn) {
                btn.setAttribute('role', 'tab');
                btn.setAttribute('aria-selected', li.classList.contains('active') ? 'true' : 'false');
            }
        });
    }

    /* ========================================
       SEO: Schema.org JSON-LD 동적 삽입
       메이크샵 편집기에서 {중괄호}가 치환코드로 오인되므로 JS로 삽입
       ======================================== */
    function initSchemaOrg() {
        var schemas = [
            {
                '@context': 'https://schema.org',
                '@type': 'Organization',
                'name': 'PRESSCO21',
                'alternateName': '\ud504\ub808\uc2a4\ucf5421',
                'url': 'https://foreverlove.co.kr',
                'logo': 'https://jewoo.img4.kr/2026/homepage/logo.png',
                'description': '30\ub144 \uc804\ud1b5\uc758 \uc555\ud654, \ubcf4\uc874\ud654 \uc804\ubb38 \ube0c\ub79c\ub4dc. \ud504\ub808\uc2a4\ub4dc\ud50c\ub77c\uc6cc, \ub808\uc9c4\uacf5\uc608, DIY \ud0a4\ud2b8, \uc6d0\ub370\uc774 \ud074\ub798\uc2a4\uae4c\uc9c0.',
                'sameAs': ['https://www.instagram.com/pressco21'],
                'contactPoint': {
                    '@type': 'ContactPoint',
                    'contactType': 'customer service',
                    'availableLanguage': 'Korean'
                }
            },
            {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                'name': 'PRESSCO21',
                'url': 'https://foreverlove.co.kr',
                'potentialAction': {
                    '@type': 'SearchAction',
                    'target': 'https://foreverlove.co.kr/shop/search.html?search_str=' + '{' + 'search_term_string}',
                    'query-input': 'required name=search_term_string'
                }
            }
        ];

        schemas.forEach(function(schema) {
            var script = document.createElement('script');
            script.type = 'application/ld+json';
            script.textContent = JSON.stringify(schema);
            document.head.appendChild(script);
        });
    }

    /* ========================================
       SEO 동적 메타태그 삽입
       메이크샵 D4는 <head> 직접 접근이 제한적이므로 JS로 삽입
       ======================================== */
    function initSEOMeta() {
        var head = document.head || document.getElementsByTagName('head')[0];
        if (!head) return;

        var metaTags = [
            { name: 'description', content: '프레스코21은 30년 전통의 압화, 보존화 전문 브랜드입니다. 프레스드플라워, 레진공예, DIY 키트, 원데이 클래스까지.' },
            { property: 'og:title', content: 'PRESSCO21 | 30년 전통 압화 & 보존화 전문 브랜드' },
            { property: 'og:description', content: '프레스코21은 30년 전통의 압화, 보존화 전문 브랜드입니다.' },
            { property: 'og:type', content: 'website' },
            { property: 'og:url', content: 'https://foreverlove.co.kr' },
            { property: 'og:image', content: 'https://jewoo.img4.kr/2026/homepage/main_banner/PC_01.jpg' },
            { property: 'og:site_name', content: 'PRESSCO21' },
            { name: 'twitter:card', content: 'summary_large_image' },
            { name: 'twitter:title', content: 'PRESSCO21 | 30년 전통 압화 & 보존화 전문 브랜드' },
            { name: 'twitter:description', content: '프레스코21은 30년 전통의 압화, 보존화 전문 브랜드입니다.' },
            { name: 'twitter:image', content: 'https://jewoo.img4.kr/2026/homepage/main_banner/PC_01.jpg' }
        ];

        metaTags.forEach(function(tag) {
            var meta = document.createElement('meta');
            if (tag.name) meta.setAttribute('name', tag.name);
            if (tag.property) meta.setAttribute('property', tag.property);
            meta.setAttribute('content', tag.content);
            head.appendChild(meta);
        });
    }

    /* ========================================
       초기화
       ======================================== */
    $(function() {
        initSwipers();
        initTabs();
        initTabAccessibility();
        initMoreButtons();
        loadYouTube();
        applyLazyLoading();
        initSEOMeta();
        initSchemaOrg();
    });

})();

/* ========================================
   메인 클래스 진입점 섹션 (Task 232)
   GAS API로 인기 클래스 4개를 로드하여
   YouTube 섹션 아래에 동적 삽입
   ======================================== */
(function() {
    'use strict';

    /* ---- 설정 ---- */
    var GAS_CLASS_URL = window.PRESSCO21_GAS_URL || '';
    var CACHE_KEY = 'pressco21_popular_classes';
    var CACHE_TTL = 30 * 60 * 1000; // 30분
    var CLASS_LIMIT = 4;
    var DETAIL_BASE = '/shop/page.html?id=class-detail&class_id=';
    var LIST_URL = '/shop/page.html?id=class-list';

    /* ---- 유틸리티 (기존 IIFE와 독립) ---- */
    function escHTML(str) {
        if (!str) return '';
        var d = document.createElement('div');
        d.appendChild(document.createTextNode(str));
        return d.innerHTML;
    }

    function escAttr(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&#39;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
    }

    /* class_id 검증: 영숫자, 하이픈, 언더스코어만 허용 (최대 64자) */
    function sanitizeClassId(id) {
        if (!id || typeof id !== 'string') return '';
        var clean = id.replace(/[^a-zA-Z0-9\-_]/g, '');
        return clean.substring(0, 64);
    }

    function formatPrice(num) {
        if (!num && num !== 0) return '0';
        var parsed = Number(num);
        if (isNaN(parsed)) return '0';
        return parsed.toLocaleString('ko-KR');
    }

    /* ---- 별점 SVG 생성 ---- */
    /* SVG linearGradient id 중복 방지를 위해
       공유 <defs>를 페이지에 1회만 삽입하고 참조 */
    var halfGradInjected = false;
    var HALF_GRAD_ID = 'mceHalfStarGrad';

    function ensureHalfGradDef() {
        if (halfGradInjected) return;
        halfGradInjected = true;
        var svgNS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '0');
        svg.setAttribute('height', '0');
        svg.style.position = 'absolute';
        svg.style.visibility = 'hidden';
        var defs = document.createElementNS(svgNS, 'defs');
        var grad = document.createElementNS(svgNS, 'linearGradient');
        grad.setAttribute('id', HALF_GRAD_ID);
        var stop1 = document.createElementNS(svgNS, 'stop');
        stop1.setAttribute('offset', '50%');
        stop1.setAttribute('stop-color', '#d4a373');
        var stop2 = document.createElementNS(svgNS, 'stop');
        stop2.setAttribute('offset', '50%');
        stop2.setAttribute('stop-color', '#ddd');
        grad.appendChild(stop1);
        grad.appendChild(stop2);
        defs.appendChild(grad);
        svg.appendChild(defs);
        document.body.appendChild(svg);
    }

    function createStarsSVG(rating) {
        var html = '';
        var fullStars = Math.floor(rating);
        var hasHalf = (rating - fullStars) >= 0.5;
        var i;
        var starPath = 'M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.33L10 13.27l-4.77 2.45.91-5.33L2.27 6.62l5.34-.78z';

        for (i = 0; i < fullStars; i++) {
            html += '<svg class="mce-star" viewBox="0 0 20 20" fill="#d4a373" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="' + starPath + '"/></svg>';
        }
        if (hasHalf) {
            ensureHalfGradDef();
            html += '<svg class="mce-star" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="' + starPath + '" fill="url(#' + HALF_GRAD_ID + ')"/></svg>';
        }
        var emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
        for (i = 0; i < emptyStars; i++) {
            html += '<svg class="mce-star" viewBox="0 0 20 20" fill="#ddd" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="' + starPath + '"/></svg>';
        }
        return html;
    }

    /* ---- 등급 배지 ---- */
    function gradeHTML(grade) {
        if (!grade) return '';
        var gradeMap = {
            'SILVER': 'mce-grade-silver',
            'GOLD': 'mce-grade-gold',
            'PLATINUM': 'mce-grade-platinum'
        };
        var cls = gradeMap[grade.toUpperCase()] || 'mce-grade-silver';
        return '<span class="mce-grade ' + cls + '">' + escHTML(grade) + '</span>';
    }

    /* ---- 카드 HTML 생성 ---- */
    function buildCardHTML(item) {
        var rating = parseFloat(item.rating) || 0;
        var reviewCount = parseInt(item.grade_count || item.review_count || 0, 10);
        var seats = parseInt(item.remaining_seats, 10);
        var isUrgent = !isNaN(seats) && seats > 0 && seats <= 5;
        var isSoldOut = !isNaN(seats) && seats <= 0;

        /* class_id 검증 후 안전한 값만 href에 사용 */
        var safeId = sanitizeClassId(item.class_id);
        if (!safeId) return ''; /* 유효하지 않은 class_id는 카드 생성 스킵 */

        var html = '<a class="mce-card" href="' + escAttr(DETAIL_BASE + safeId) + '" aria-label="' + escAttr(item.class_name) + ' 클래스 상세보기">';

        /* 썸네일 (빈 URL 방지: placeholder 사용) */
        var thumbUrl = item.thumbnail_url || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%23e8ede6"/>');
        html += '<div class="mce-thumb">';
        html += '<img src="' + escAttr(thumbUrl) + '" alt="' + escAttr(item.class_name) + '" loading="lazy">';
        if (item.category) {
            html += '<span class="mce-badge">' + escHTML(item.category) + '</span>';
        }
        if (isUrgent) {
            html += '<span class="mce-urgent">마감 임박!</span>';
        }
        html += '</div>';

        /* 정보 */
        html += '<div class="mce-info">';
        html += '<p class="mce-name">' + escHTML(item.class_name) + '</p>';

        /* 강사 + 등급 */
        html += '<div class="mce-instructor">';
        html += '<span class="mce-instructor-name">' + escHTML(item.partner_name || '') + '</span>';
        html += gradeHTML(item.grade || item.partner_grade || '');
        html += '</div>';

        /* 별점 */
        html += '<div class="mce-rating">';
        html += '<span class="mce-stars">' + createStarsSVG(rating) + '</span>';
        html += '<span class="mce-review-count">(' + reviewCount + ')</span>';
        html += '</div>';

        /* 가격 */
        html += '<div class="mce-price">' + formatPrice(item.price) + '\uC6D0</div>';

        /* 남은 자리 */
        if (!isNaN(seats)) {
            if (isSoldOut) {
                html += '<div class="mce-seats mce-seats-urgent">마감</div>';
            } else if (isUrgent) {
                html += '<div class="mce-seats mce-seats-urgent">\uB0A8\uC740 ' + seats + '\uC790\uB9AC</div>';
            } else {
                html += '<div class="mce-seats">\uB0A8\uC740 ' + seats + '\uC790\uB9AC</div>';
            }
        }

        html += '</div>'; /* /.mce-info */
        html += '</a>'; /* /.mce-card */
        return html;
    }

    /* ---- 스켈레톤 HTML ---- */
    function buildSkeletonHTML() {
        var html = '<div class="mce-skeleton-grid">';
        for (var i = 0; i < CLASS_LIMIT; i++) {
            html += '<div class="mce-skeleton-card">' +
                '<div class="mce-sk-thumb"></div>' +
                '<div class="mce-sk-info">' +
                '<div class="mce-sk-line mce-sk-line-full"></div>' +
                '<div class="mce-sk-line mce-sk-line-medium"></div>' +
                '<div class="mce-sk-line mce-sk-line-short"></div>' +
                '</div></div>';
        }
        html += '</div>';
        return html;
    }

    /* ---- 섹션 전체 HTML ---- */
    function buildSectionHTML(isLoading) {
        var html = '<section class="main-class-entry" id="main-class-entry">';
        html += '<div class="mce-container">';
        html += '<div class="mce-header">';
        html += '<h3>\uC9C0\uAE08 \uC778\uAE30 \uC788\uB294 \uC6D0\uB370\uC774 \uD074\uB798\uC2A4</h3>';
        html += '<p>30\uB144 \uC555\uD654 \uC804\uBB38\uAC00\uB4E4\uC774 \uC9C1\uC811 \uC9C4\uD589\uD558\uB294 \uD2B9\uBCC4\uD55C \uD074\uB798\uC2A4</p>';
        html += '</div>';

        if (isLoading) {
            html += buildSkeletonHTML();
        } else {
            html += '<div class="mce-grid" id="mce-grid"></div>';
        }

        html += '<div class="mce-cta-wrap">';
        html += '<a href="' + escAttr(LIST_URL) + '" class="mce-cta">\uC804\uCCB4 \uD074\uB798\uC2A4 \uBCF4\uAE30</a>';
        html += '</div>';
        html += '</div>';
        html += '</section>';
        return html;
    }

    /* ---- 섹션 삽입 위치 ---- */
    function insertSection(html) {
        /* YouTube 섹션(#weekyoutube) 뒤에 삽입 */
        var ytSection = document.querySelector('.youtube-section-v3');
        if (ytSection) {
            ytSection.insertAdjacentHTML('afterend', html);
            return true;
        }
        /* YouTube 섹션 없으면 section04(Weekly Best) 뒤에 삽입 */
        var section04 = document.getElementById('section04');
        if (section04) {
            section04.insertAdjacentHTML('afterend', html);
            return true;
        }
        return false;
    }

    /* ---- 캐시 관리 ---- */
    function getCachedData() {
        try {
            var raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            var cached = JSON.parse(raw);
            if (cached && cached.ts && (Date.now() - cached.ts < CACHE_TTL)) {
                return cached.data;
            }
            localStorage.removeItem(CACHE_KEY);
        } catch (e) { /* localStorage 접근 불가 시 무시 */ }
        return null;
    }

    function setCachedData(data) {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                ts: Date.now(),
                data: data
            }));
        } catch (e) { /* localStorage 용량 초과 시 무시 */ }
    }

    /* ---- 카드 렌더링 ---- */
    function renderCards(classes) {
        var section = document.getElementById('main-class-entry');
        if (!section) return;

        /* 스켈레톤 제거, 그리드 삽입 */
        var skeletonGrid = section.querySelector('.mce-skeleton-grid');
        var ctaWrap = section.querySelector('.mce-cta-wrap');

        var gridHTML = '<div class="mce-grid" id="mce-grid">';
        for (var i = 0; i < classes.length && i < CLASS_LIMIT; i++) {
            gridHTML += buildCardHTML(classes[i]);
        }
        gridHTML += '</div>';

        if (skeletonGrid) {
            skeletonGrid.insertAdjacentHTML('afterend', gridHTML);
            skeletonGrid.parentNode.removeChild(skeletonGrid);
        } else if (ctaWrap) {
            ctaWrap.insertAdjacentHTML('beforebegin', gridHTML);
        }
    }

    /* ---- 섹션 숨김 (에러 시) ---- */
    function hideSection() {
        var section = document.getElementById('main-class-entry');
        if (section) {
            section.style.display = 'none';
        }
    }

    /* ---- 데이터 로드 ---- */
    function loadClasses() {
        /* GAS URL이 설정되지 않았으면 섹션 미표시 */
        if (!GAS_CLASS_URL) {
            return;
        }

        /* 섹션 삽입 (스켈레톤 상태) */
        var inserted = insertSection(buildSectionHTML(true));
        if (!inserted) return;

        /* 캐시 확인 */
        var cached = getCachedData();
        if (cached && cached.length > 0) {
            renderCards(cached);
            return;
        }

        /* GAS API 호출 */
        var separator = GAS_CLASS_URL.indexOf('?') >= 0 ? '&' : '?';
        var url = GAS_CLASS_URL + separator + 'action=getClasses&sort=popular&limit=' + CLASS_LIMIT + '&t=' + Date.now();

        $.ajax({
            url: url,
            dataType: 'json',
            cache: false,
            timeout: 10000,
            success: function(res) {
                if (res && res.success && res.data && res.data.length > 0) {
                    setCachedData(res.data);
                    renderCards(res.data);
                } else {
                    /* 데이터 없으면 섹션 숨김 */
                    hideSection();
                }
            },
            error: function() {
                /* API 오류 시 섹션 조용히 숨김 */
                hideSection();
            }
        });
    }

    /* ---- Intersection Observer로 뷰포트 진입 시 로드 ---- */
    function initClassSection() {
        /* GAS URL 미설정 시 즉시 종료 */
        if (!GAS_CLASS_URL) return;

        /* YouTube 섹션 근처에 도달했을 때 로드 시작 (성능 최적화) */
        if ('IntersectionObserver' in window) {
            var trigger = document.querySelector('.youtube-section-v3') || document.getElementById('section04');
            if (!trigger) {
                /* 트리거 요소 없으면 바로 로드 */
                loadClasses();
                return;
            }

            var observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        observer.disconnect();
                        loadClasses();
                    }
                });
            }, {
                rootMargin: '200px 0px'
            });
            observer.observe(trigger);
        } else {
            /* IO 미지원 브라우저: 바로 로드 */
            loadClasses();
        }
    }

    /* ---- 초기화 ---- */
    $(function() {
        initClassSection();
    });

})();
