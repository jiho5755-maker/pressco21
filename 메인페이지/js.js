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
       ======================================== */
    function applyLazyLoading() {
        var images = document.querySelectorAll('#section02 img, #section03 img, #section04 img, .youtube-section-v3 img, .brand-philosophy img');
        for (var i = 0; i < images.length; i++) {
            if (!images[i].hasAttribute('loading')) {
                images[i].setAttribute('loading', 'lazy');
            }
        }
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
        initMoreButtons();
        loadYouTube();
        applyLazyLoading();
        initSEOMeta();
    });

})();
