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
    var N8N_YOUTUBE_URL = 'https://n8n.pressco21.com/webhook/youtube-api';
    var mainBannerSwiper = null; /* YouTube hover 시 배너 autoplay 제어 */

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
        mainBannerSwiper = new mySwiper('.main-banner', {
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
       YouTube 섹션 (Learn & Shop) — n8n WF-YT 연동 v4
       ======================================== */
    var YT_CACHE_KEY = 'yt_cache_n8n_v2';
    var YT_CACHE_TIME = 'yt_time_n8n_v2';
    var YT_CACHE_DURATION = 30 * 60 * 1000; // 30분
    var ytAllVideos = [];
    var ytCurrentIndex = 0;
    var ytSliderBound = false;
    var ytSliderToggleBound = false;
    var ytSwiperInstance = null;
    var ytTouchStartX = 0; /* 스와이프 시작 X좌표 */
    var ytTouchStartY = 0; /* 스와이프 시작 Y좌표 (세로 스크롤 구분) */
    var ytTouchStartTime = 0; /* 터치 시작 시간 ms (롱프레스 구분) */
    var ytIsSwiping = false; /* 스와이프 중 플래그 (탭 vs 스와이프 구분) */

    function loadYouTube() {
        // 구조 초기화: featured-video-area가 없으면 youtube-container 안에 동적 생성
        if (!document.getElementById('featured-video-area')) {
            var ytContainer = document.getElementById('youtube-container') ||
                              document.querySelector('.weekyoutube');
            if (!ytContainer) return;
            ytContainer.innerHTML =
                '<div class="youtube-section-v3">' +
                    '<div class="youtube-main-area">' +
                        '<div id="featured-video-area" class="featured-video" aria-live="polite" aria-atomic="true"></div>' +
                        '<div id="related-products-wrap" class="related-products collapsed"></div>' +
                    '</div>' +
                    '<div class="youtube-slider-wrap">' +
                        '<div class="yt-slider-header">' +
                            '<span class="yt-slider-title">\ub354 \ub9ce\uc740 \uc601\uc0c1</span>' +
                            '<span class="yt-slider-toggle-icon">&#9654;</span>' +
                        '</div>' +
                        '<div class="youtube-slider swiper">' +
                            '<div id="youtube-slider-wrapper" class="swiper-wrapper"></div>' +
                            '<div class="swiper-pagination"></div>' +
                        '</div>' +
                        '<div class="swiper-button-prev"></div>' +
                        '<div class="swiper-button-next"></div>' +
                    '</div>' +
                '</div>';
        }

        // Index.html 구식 section-subtitle → yt-slider-header 카드로 업그레이드 (최초 1회)
        var existingSliderWrap = document.querySelector('.youtube-slider-wrap');
        if (existingSliderWrap && !existingSliderWrap.querySelector('.yt-slider-header')) {
            var oldSubtitle = existingSliderWrap.querySelector('.section-subtitle');
            if (oldSubtitle) {
                var newHeader = document.createElement('div');
                newHeader.className = 'yt-slider-header';
                newHeader.innerHTML = '<span class="yt-slider-title">\ub354 \ub9ce\uc740 \uc601\uc0c1</span><span class="yt-slider-toggle-icon">&#9654;</span>';
                existingSliderWrap.insertBefore(newHeader, oldSubtitle);
                oldSubtitle.parentNode.removeChild(oldSubtitle);
            }
        }

        var featuredArea = document.getElementById('featured-video-area');
        var sliderWrapper = document.getElementById('youtube-slider-wrapper');
        if (!featuredArea || !sliderWrapper) return;

        // HTML에 하드코딩된 placeholder 이미지를 즉시 제거 (콘솔 에러 방지)
        var existingGrid = document.querySelector('.related-products-grid, #related-products-wrap .yt-products-grid');
        if (existingGrid) existingGrid.innerHTML = '';

        // localStorage 캐시 확인 (30분 TTL)
        try {
            var cached = localStorage.getItem(YT_CACHE_KEY);
            var time = localStorage.getItem(YT_CACHE_TIME);
            if (cached && time && Date.now() - parseInt(time) < YT_CACHE_DURATION) {
                var parsed = JSON.parse(cached);
                if (parsed && parsed.length > 0) {
                    ytAllVideos = parsed;
                    renderYouTube();
                    return;
                }
            }
        } catch (e) { /* localStorage 접근 불가 시 무시 */ }

        // n8n WF-YT API 호출 (POST)
        $.ajax({
            url: N8N_YOUTUBE_URL,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ action: 'getVideos', count: 20 }),
            dataType: 'json',
            timeout: 8000,
            success: function(data) {
                if (data && data.status === 'success' && data.items && data.items.length > 0) {
                    ytAllVideos = data.items;
                    try {
                        localStorage.setItem(YT_CACHE_KEY, JSON.stringify(data.items));
                        localStorage.setItem(YT_CACHE_TIME, Date.now().toString());
                    } catch (e) { /* localStorage 용량 초과 시 무시 */ }
                    renderYouTube();
                } else {
                    showYouTubeError(featuredArea);
                }
            },
            error: function() {
                // 캐시 폴백 (만료됐어도 데이터 있으면 사용)
                try {
                    var fb = localStorage.getItem(YT_CACHE_KEY);
                    if (fb) {
                        var parsed = JSON.parse(fb);
                        if (parsed && parsed.length > 0) {
                            ytAllVideos = parsed;
                            renderYouTube();
                            return;
                        }
                    }
                } catch (e) {}
                showYouTubeError(featuredArea);
            }
        });
    }

    function showYouTubeError(container) {
        if (!container) return;
        container.innerHTML =
            '<div style="padding:40px;text-align:center;color:#888">' +
                '<p>영상을 불러올 수 없습니다.</p>' +
                '<p style="margin-top:8px"><a href="https://www.youtube.com/@pressco21" target="_blank" rel="noopener noreferrer" style="color:#7d9675">YouTube 채널에서 직접 보기</a></p>' +
            '</div>';
    }

    function renderYouTube() {
        var featuredArea = document.getElementById('featured-video-area');
        var sliderWrapper = document.getElementById('youtube-slider-wrapper');
        if (!ytAllVideos || ytAllVideos.length === 0 || !featuredArea || !sliderWrapper) return;

        var video = ytAllVideos[ytCurrentIndex];
        if (!video) return;

        // 재전환 시 fade-out: 이미 콘텐츠가 있으면 yt-fading 추가 (opacity 0)
        var _hasPrev = !!featuredArea.querySelector('.yt-thumb-wrap, iframe');
        if (_hasPrev) featuredArea.classList.add('yt-fading');

        // 메인 영상: 썸네일 클릭 시 iframe 로드 (loading="lazy" 제거 — LCP 핵심 이미지)
        var thumb = video.thumbnail || ('https://img.youtube.com/vi/' + video.id + '/sddefault.jpg');
        featuredArea.innerHTML =
            '<div class="video-wrapper yt-thumb-wrap" data-video-id="' + escapeAttr(video.id) + '"' +
                ' role="button" tabindex="0" aria-label="\uc601\uc0c1 \uc7ac\uc0dd: ' + escapeAttr(video.title) + '">' +
                '<img src="' + escapeAttr(thumb) + '" alt="' + escapeAttr(video.title) + '">' +
                '<div class="yt-play-btn"></div>' +
            '</div>' +
            '<div class="featured-video-info">' +
                '<h4>' + escapeHTML(video.title) + '</h4>' +
                '<div class="video-meta">' + ytFormatDate(video.publishedAt) + '</div>' +
            '</div>';

        // 썸네일 클릭 이벤트
        var thumbWrap = featuredArea.querySelector('.yt-thumb-wrap');
        if (thumbWrap) {
            thumbWrap.addEventListener('click', function() {
                ytPlayVideo(this.getAttribute('data-video-id'));
            });
        }

        // 관련 상품 패널 렌더링
        ytRenderProducts(video);

        // 슬라이더 영상 전체 포함 (현재 재생 영상 포함 — active 배지로 표시)
        var sliderHTML = '';
        for (var i = 0; i < ytAllVideos.length; i++) {
            var v = ytAllVideos[i];
            var isActive = (i === ytCurrentIndex);
            var slThumb = 'https://img.youtube.com/vi/' + escapeAttr(v.id) + '/mqdefault.jpg';
            sliderHTML +=
                '<div class="swiper-slide yt-slide-card' + (isActive ? ' yt-slide-active' : '') + '"' +
                    ' data-index="' + i + '"' +
                    ' title="' + escapeAttr(v.title) + '"' +
                    ' role="button" tabindex="0"' +
                    (isActive ? ' aria-current="true"' : '') + '>' +
                    '<div class="slide-video-thumb">' +
                        '<img src="' + slThumb + '" alt="' + escapeAttr(v.title) + '" loading="lazy">' +
                        '<div class="play-icon"></div>' +
                        (isActive ? '<div class="yt-now-playing"><span>\uc7ac\uc0dd \uc911</span></div>' : '') +
                    '</div>' +
                    '<div class="slide-info">' +
                        '<h6>' + escapeHTML(v.title) + '</h6>' +
                        '<div class="slide-meta">' +
                            '<span class="slide-date">' + ytFormatDate(v.publishedAt) + '</span>' +
                            (v.viewCount > 0 ? '<span class="slide-views">' + ytFormatViewCount(v.viewCount) + '</span>' : '') +
                        '</div>' +
                    '</div>' +
                '</div>';
        }
        sliderWrapper.innerHTML = sliderHTML;

        // 슬라이더 헤더에 영상 총 개수 동적 표시 (현재 영상 포함 전체 수)
        var sliderTitleEl = document.querySelector('.yt-slider-title');
        if (sliderTitleEl) {
            sliderTitleEl.textContent = '\ub354 \ub9ce\uc740 \uc601\uc0c1 (' + ytAllVideos.length + '\uac1c)';
        }

        // Swiper 초기화
        if (ytSwiperInstance && typeof ytSwiperInstance.destroy === 'function') {
            ytSwiperInstance.destroy(true, true);
            ytSwiperInstance = null;
        }
        if (typeof Swiper !== 'undefined') {
            ytSwiperInstance = new Swiper('.youtube-slider', {
                slidesPerView: 1.4,
                spaceBetween: 12,
                loop: false,
                initialSlide: ytCurrentIndex, /* 현재 재생 영상이 슬라이더에 보이도록 */
                touchAngle: 30, /* 수직 스크롤 우선: 30도 이상 기울면 스와이프로 인식 안 함 */
                pagination: { el: '.youtube-slider .swiper-pagination', clickable: true },
                navigation: {
                    nextEl: '.youtube-slider-wrap .swiper-button-next',
                    prevEl: '.youtube-slider-wrap .swiper-button-prev'
                },
                a11y: {
                    prevSlideMessage: '\uc774\uc804 \uc601\uc0c1',
                    nextSlideMessage: '\ub2e4\uc74c \uc601\uc0c1'
                },
                keyboard: { enabled: true, onlyInViewport: true },
                breakpoints: {
                    480: { slidesPerView: 2.2, spaceBetween: 12 },
                    768: { slidesPerView: 4, spaceBetween: 15 }
                },
                on: {
                    touchStart: function(swiper, event) {
                        ytIsSwiping = false;
                        ytTouchStartTime = Date.now();
                        /* 좌표 추적 (가능한 경우) */
                        var t = (event && event.touches && event.touches[0]) ||
                                (event && event.changedTouches && event.changedTouches[0]) || null;
                        ytTouchStartX = (t && t.clientX != null) ? t.clientX : 0;
                        ytTouchStartY = (t && t.clientY != null) ? t.clientY : 0;
                    },
                    /* sliderMove: Swiper가 실제로 수평 이동을 감지했을 때 발생
                       event.touches 유무와 무관하게 가장 신뢰할 수 있는 스와이프 감지 */
                    sliderMove: function(swiper, event) {
                        ytIsSwiping = true;
                    },
                    touchMove: function(swiper, event) {
                        /* sliderMove 보조: 좌표 추적이 가능할 때 Y축 스크롤도 스와이프로 처리 */
                        var t = (event && event.touches && event.touches[0]) ||
                                (event && event.changedTouches && event.changedTouches[0]) || null;
                        if (t && t.clientX != null) {
                            var dX = Math.abs(t.clientX - ytTouchStartX);
                            var dY = Math.abs(t.clientY - ytTouchStartY);
                            if ((dX > 8 && dX > dY) || (dY > 8 && dY > dX)) {
                                ytIsSwiping = true;
                            }
                        }
                    },
                    click: function(swiper, event) {
                        /* ytIsSwiping: sliderMove 또는 touchMove에서 설정 */
                        if (ytIsSwiping) { ytIsSwiping = false; return; }
                        var slide = event && event.target ? event.target.closest('.yt-slide-card') : null;
                        if (!slide) return;
                        var idx = parseInt(slide.getAttribute('data-index'));
                        if (isNaN(idx)) return;
                        ytCurrentIndex = idx;
                        /* setTimeout 0: 현재 Swiper 이벤트 처리 완료 후 실행 (destroy 충돌 방지) */
                        setTimeout(function() { renderYouTube(); ytScrollToFeatured(); }, 0);
                    }
                }
            });
        } else {
            // Swiper 미로드 시 fallback: 일반 클릭 이벤트 위임
            if (!ytSliderBound) {
                ytSliderBound = true;
                sliderWrapper.addEventListener('click', function(e) {
                    var slide = e.target.closest('.yt-slide-card');
                    if (slide) {
                        var idx = parseInt(slide.getAttribute('data-index'));
                        if (!isNaN(idx) && idx !== ytCurrentIndex) {
                            ytCurrentIndex = idx;
                            renderYouTube();
                            ytScrollToFeatured();
                        }
                    }
                });
            }
        }

        // 모바일 슬라이더 토글 설정 (.yt-slider-header 카드 헤더 사용)
        var sliderWrap = document.querySelector('.youtube-slider-wrap');
        if (sliderWrap) {
            var sliderHeader = sliderWrap.querySelector('.yt-slider-header');
            if (window.innerWidth < 768) {
                // 최초 렌더 시에만 접힘 상태 초기화 (재렌더 시 기존 open/close 상태 유지)
                if (!sliderWrap.getAttribute('data-yt-mobile-init')) {
                    sliderWrap.setAttribute('data-yt-mobile-init', '1');
                    sliderWrap.classList.remove('yt-slider-teaser');
                    sliderWrap.classList.add('yt-slider-collapsed');
                    if (sliderHeader) sliderHeader.setAttribute('aria-expanded', 'false');
                }
                if (sliderHeader) {
                    sliderHeader.setAttribute('role', 'button');
                    sliderHeader.setAttribute('tabindex', '0');
                }
                // 토글 이벤트 바인딩 (최초 1회)
                if (sliderHeader && !sliderHeader.getAttribute('data-yt-toggle')) {
                    sliderHeader.setAttribute('data-yt-toggle', '1');
                    sliderHeader.addEventListener('click', function() {
                        var isCollapsed = sliderWrap.classList.contains('yt-slider-collapsed');
                        if (isCollapsed) {
                            /* 접힘 → 펼침 */
                            sliderWrap.classList.remove('yt-slider-collapsed');
                            sliderHeader.setAttribute('aria-expanded', 'true');
                            if (ytSwiperInstance) {
                                setTimeout(function() { ytSwiperInstance.update(); }, 450);
                            }
                        } else {
                            /* 펼침 → 접힘 (완전히 닫기) */
                            sliderWrap.classList.add('yt-slider-collapsed');
                            sliderHeader.setAttribute('aria-expanded', 'false');
                        }
                    });
                    sliderHeader.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            sliderHeader.click();
                        }
                    });
                }
            } else {
                // PC: 항상 펼침, 토글 상태 리셋
                sliderWrap.removeAttribute('data-yt-mobile-init');
                sliderWrap.classList.remove('yt-slider-collapsed');
                sliderWrap.classList.remove('yt-slider-teaser');
                if (sliderHeader) {
                    sliderHeader.removeAttribute('aria-expanded');
                    sliderHeader.removeAttribute('role');
                    sliderHeader.removeAttribute('tabindex');
                }
            }
        }

        // 콘텐츠 업데이트 후 fade-in: double rAF로 브라우저 페인트 이후 클래스 제거
        (function(fa) {
            requestAnimationFrame(function() {
                requestAnimationFrame(function() {
                    if (fa) fa.classList.remove('yt-fading');
                });
            });
        }(featuredArea));

        // YouTube 섹션 hover/touch 시 메인 배너 autoplay 일시정지 (1회 바인딩)
        var _ytSection = document.querySelector('.youtube-section-v3');
        if (_ytSection && !_ytSection.getAttribute('data-yt-pause-bound')) {
            _ytSection.setAttribute('data-yt-pause-bound', '1');
            var _ytAutoTimer = null;
            var AUTOPLAY_RESUME_DELAY = 5000;

            function _pauseBanner() {
                if (mainBannerSwiper && mainBannerSwiper.autoplay && mainBannerSwiper.autoplay.running) {
                    mainBannerSwiper.autoplay.stop();
                }
                if (_ytAutoTimer) clearTimeout(_ytAutoTimer);
            }
            function _resumeBanner() {
                if (_ytAutoTimer) clearTimeout(_ytAutoTimer);
                _ytAutoTimer = setTimeout(function() {
                    if (mainBannerSwiper && mainBannerSwiper.autoplay) {
                        mainBannerSwiper.autoplay.start();
                    }
                }, AUTOPLAY_RESUME_DELAY);
            }

            _ytSection.addEventListener('mouseenter', _pauseBanner);
            _ytSection.addEventListener('mouseleave', _resumeBanner);
            _ytSection.addEventListener('touchstart', _pauseBanner, { passive: true });
            _ytSection.addEventListener('touchend', _resumeBanner, { passive: true });
        }
    }

    /* ============================================================
       스마트 스크롤: 메인 영상이 뷰포트 밖일 때만 스크롤
       ============================================================ */
    function ytScrollToFeatured() {
        var el = document.getElementById('featured-video-area');
        if (!el) return;
        var rect = el.getBoundingClientRect();
        var vH = window.innerHeight || document.documentElement.clientHeight;
        /* 이미 뷰포트 안에 있으면 스크롤 생략 */
        if (rect.top >= 0 && rect.bottom <= vH) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function ytRenderProducts(video) {
        var productsWrap = document.getElementById('related-products-wrap');
        if (!productsWrap) return;

        var products = video.products || [];
        var productSource = video.productSource || 'none';

        // 3-tier 헤더
        var headerText = productSource === 'direct' ? '\uc774 \uc601\uc0c1\uc5d0 \uc0ac\uc6a9\ub41c \uc7ac\ub8cc'
                       : productSource === 'keyword' ? '\ucd94\ucc9c \uc7ac\ub8cc'
                       : '\uc778\uae30 \uc7ac\ub8cc';

        var html = '<div class="yt-products-inner">';
        // 모바일 토글 헤더 (onclick="toggleProducts()")
        var productsAriaExpanded = (window.innerWidth >= 768) ? '' : ' aria-expanded="false" role="button" tabindex="0"';
        html += '<div class="yt-products-header" onclick="toggleProducts()"' + productsAriaExpanded + '>';
        html += '<span class="yt-products-title">' + escapeHTML(headerText) + '</span>';
        html += '<span class="yt-toggle-icon">&#9654;</span>';
        html += '</div>';
        html += '<div class="yt-products-grid">';

        if (products.length > 0) {
            for (var i = 0; i < products.length; i++) {
                var p = products[i];
                var pUrl = p.product_url || ('/shop/shopdetail.html?branduid=' + escapeAttr(p.branduid));
                var pImg = p.product_image || '';
                var pName = p.product_name || '';
                var pPrice = p.product_price ? p.product_price.toLocaleString() + '\uc6d0' : '';
                // 5번째 이상 상품은 기본 숨김 (.yt-hidden)
                html += '<a href="' + escapeAttr(pUrl) + '" class="yt-product-card' + (i >= 4 ? ' yt-hidden' : '') + '">';
                if (pImg) {
                    html += '<img src="' + escapeAttr(pImg) + '" alt="' + escapeAttr(pName) + '" loading="lazy">';
                }
                html += '<div class="yt-product-name">' + escapeHTML(pName) + '</div>';
                if (pPrice) html += '<div class="yt-product-price">' + escapeHTML(pPrice) + '</div>';
                html += '</a>';
            }
            // 상품이 4개 초과일 때 "더 보기" 버튼
            if (products.length > 4) {
                html += '<button type="button" class="yt-more-btn" onclick="ytToggleMoreProducts(this)">'
                    + '+ ' + (products.length - 4) + '\uac1c \ub354 \ubcf4\uae30</button>';
            }
        } else {
            html += '<p class="yt-no-products">\uc774 \uc601\uc0c1\uc758 \uad00\ub828 \uc7ac\ub8cc\ub97c \uc900\ube44\ud558\uace0 \uc788\uc5b4\uc694</p>';
        }

        html += '</div></div>';
        productsWrap.innerHTML = html;

        // PC: 항상 펼침 / 모바일: 접힘
        if (window.innerWidth >= 768) {
            productsWrap.classList.remove('collapsed');
            productsWrap.classList.add('expanded');
        } else {
            productsWrap.classList.remove('expanded');
            productsWrap.classList.add('collapsed');
        }
    }

    function ytToggleMoreProducts(btn) {
        var grid = btn.parentElement;
        var hiddenCards = grid.querySelectorAll('.yt-product-card.yt-hidden');
        if (hiddenCards.length > 0) {
            for (var i = 0; i < hiddenCards.length; i++) {
                hiddenCards[i].classList.remove('yt-hidden');
            }
            btn.textContent = '\uc811\uae30';
        } else {
            var allCards = grid.querySelectorAll('.yt-product-card');
            var count = 0;
            for (var j = 4; j < allCards.length; j++) {
                allCards[j].classList.add('yt-hidden');
                count++;
            }
            btn.textContent = '+ ' + count + '\uac1c \ub354 \ubcf4\uae30';
        }
    }
    window.ytToggleMoreProducts = ytToggleMoreProducts;

    function ytFormatDate(dateStr) {
        if (!dateStr) return '';
        var d = new Date(dateStr);
        var diff = Math.floor((Date.now() - d.getTime()) / 86400000);
        if (isNaN(diff)) return '';
        if (diff === 0) return '오늘';
        if (diff <= 7) return diff + '일 전';
        return (d.getMonth() + 1) + '.' + d.getDate();
    }

    /* 조회수 포맷 (1만회, 3천회 등) */
    function ytFormatViewCount(n) {
        n = parseInt(n) || 0;
        if (n >= 10000) return Math.floor(n / 10000) + '\ub9cc\ud68c';
        if (n >= 1000) return Math.floor(n / 1000) + '\ucc9c\ud68c';
        return n + '\ud68c';
    }

    function ytPlayVideo(videoId) {
        var featuredArea = document.getElementById('featured-video-area');
        if (!featuredArea) return;
        var wrapper = featuredArea.querySelector('.video-wrapper');
        if (wrapper) {
            // 로딩 스피너 먼저 표시 (200ms 후 iframe 교체)
            wrapper.innerHTML = '<div class="yt-thumb-loading"><div class="yt-spinner"></div></div>';
            wrapper.classList.remove('yt-thumb-wrap');
            var videoTitle = (ytAllVideos[ytCurrentIndex] && ytAllVideos[ytCurrentIndex].title)
                ? ytAllVideos[ytCurrentIndex].title : 'YouTube \uc601\uc0c1';
            setTimeout(function() {
                wrapper.innerHTML =
                    '<iframe src="https://www.youtube.com/embed/' + escapeAttr(videoId) +
                    '?rel=0&autoplay=1&modestbranding=1" frameborder="0" allowfullscreen' +
                    ' allow="autoplay" title="' + escapeAttr(videoTitle) + '"></iframe>';
            }, 200);
        }
    }
    window.playVideo = ytPlayVideo;

    function toggleProducts() {
        var wrap = document.getElementById('related-products-wrap');
        if (!wrap || window.innerWidth >= 768) return;
        var isCollapsed = wrap.classList.contains('collapsed');
        wrap.classList.toggle('collapsed', !isCollapsed);
        wrap.classList.toggle('expanded', isCollapsed);
        var icon = wrap.querySelector('.yt-toggle-icon');
        if (icon) {
            icon.style.transform = isCollapsed ? 'rotate(90deg)' : '';
        }
        // 접근성: aria-expanded 토글
        var header = wrap.querySelector('.yt-products-header');
        if (header) {
            header.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false');
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
   메인 클래스 진입점 섹션 (Task 315)
   n8n 웹훅 POST API로 인기 클래스 3개를 로드하여
   YouTube 섹션 아래에 동적 삽입
   주의: \${var} 이스케이프 필수 (메이크샵 치환코드 오인 방지)
   ======================================== */
(function() {
    'use strict';

    /* ---- 설정 ---- */
    var N8N_CLASS_API = 'https://n8n.pressco21.com/webhook/class-api';
    var CACHE_KEY = 'pressco21_popular_classes_v2';
    var CACHE_TTL = 30 * 60 * 1000; /* 30분 */
    var CLASS_LIMIT = 3;
    var DETAIL_BASE = '/shop/page.html?id=2607&class_id=';
    var LIST_URL = '/shop/page.html?id=2606';

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
        if (!safeId) return '';

        var html = '<a class="mce-card" href="' + escAttr(DETAIL_BASE + safeId) + '" aria-label="' + escAttr(item.class_name) + ' \uD074\uB798\uC2A4 \uC0C1\uC138\uBCF4\uAE30">';

        /* 썸네일 (빈 URL 방지: placeholder SVG) */
        var thumbUrl = item.thumbnail_url || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%23e8ede6"/>');
        html += '<div class="mce-thumb">';
        html += '<img src="' + escAttr(thumbUrl) + '" alt="' + escAttr(item.class_name) + '" loading="lazy">';
        if (item.category) {
            html += '<span class="mce-badge">' + escHTML(item.category) + '</span>';
        }
        if (isUrgent) {
            html += '<span class="mce-urgent">\uB9C8\uAC10 \uC784\uBC15!</span>';
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
                html += '<div class="mce-seats mce-seats-urgent">\uB9C8\uAC10</div>';
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
        html += '<h3>\uC6B0\uB9AC \uB3D9\uB124 \uAF43 \uACF5\uC608 \uD074\uB798\uC2A4\uB97C \uCC3E\uC544\uBCF4\uC138\uC694</h3>';
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

    /* ---- 데이터 로드 (n8n POST API) ---- */
    function loadClasses() {
        /* 섹션 삽입 (스켈레톤 상태) */
        var inserted = insertSection(buildSectionHTML(true));
        if (!inserted) return;

        /* 캐시 확인 */
        var cached = getCachedData();
        if (cached && cached.length > 0) {
            renderCards(cached);
            return;
        }

        /* n8n 웹훅 POST 호출 */
        $.ajax({
            url: N8N_CLASS_API,
            type: 'POST',
            contentType: 'text/plain',
            data: JSON.stringify({
                action: 'getClasses',
                status: 'active',
                limit: CLASS_LIMIT
            }),
            dataType: 'json',
            cache: false,
            timeout: 10000,
            success: function(res) {
                /* n8n 응답 구조: { success: true, data: { classes: [...] } } */
                var classes = null;
                if (res && res.success && res.data) {
                    /* data.classes 배열 또는 data 자체가 배열인 경우 모두 대응 */
                    if (Array.isArray(res.data.classes)) {
                        classes = res.data.classes;
                    } else if (Array.isArray(res.data)) {
                        classes = res.data;
                    }
                }
                if (classes && classes.length > 0) {
                    setCachedData(classes);
                    renderCards(classes);
                } else {
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
        if ('IntersectionObserver' in window) {
            var trigger = document.querySelector('.youtube-section-v3') || document.getElementById('section04');
            if (!trigger) {
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
            loadClasses();
        }
    }

    /* ---- 초기화 ---- */
    $(function() {
        initClassSection();
    });

})();
