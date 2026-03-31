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
    /* 스와이프/탭 구분: 네이티브 DOM 터치 이벤트 사용 (Swiper 합성 이벤트 의존 제거) */
    var _nativeMoved = false;

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
                    click: function(swiper, event) {
                        /* _nativeMoved: 네이티브 touchmove에서 5px 이상 이동 시 true */
                        if (_nativeMoved) { _nativeMoved = false; return; }
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

            /* 네이티브 DOM 터치 이벤트로 스와이프/탭 구분 (Swiper 합성 이벤트 의존 제거)
               5px 이상 이동 시 _nativeMoved = true → Swiper on.click에서 영상 전환 차단 */
            var _swiperEl = document.querySelector('.youtube-slider');
            if (_swiperEl && !_swiperEl.getAttribute('data-yt-touch-bound')) {
                _swiperEl.setAttribute('data-yt-touch-bound', '1');
                var _nativeTouchStartX = 0;
                var _nativeTouchStartY = 0;

                _swiperEl.addEventListener('touchstart', function(e) {
                    _nativeMoved = false;
                    if (e.touches && e.touches[0]) {
                        _nativeTouchStartX = e.touches[0].clientX;
                        _nativeTouchStartY = e.touches[0].clientY;
                    }
                }, { passive: true });

                _swiperEl.addEventListener('touchmove', function(e) {
                    if (e.touches && e.touches[0]) {
                        var dx = Math.abs(e.touches[0].clientX - _nativeTouchStartX);
                        var dy = Math.abs(e.touches[0].clientY - _nativeTouchStartY);
                        if (dx > 5 || dy > 5) _nativeMoved = true;
                    }
                }, { passive: true });

                /* mousedown/mousemove 폴백 (PC 마우스 드래그 시에도 탭 방지) */
                _swiperEl.addEventListener('mousedown', function(e) {
                    _nativeMoved = false;
                    _nativeTouchStartX = e.clientX;
                    _nativeTouchStartY = e.clientY;
                });

                _swiperEl.addEventListener('mousemove', function(e) {
                    if (e.buttons === 1) { /* 좌클릭 드래그 중 */
                        var dx = Math.abs(e.clientX - _nativeTouchStartX);
                        var dy = Math.abs(e.clientY - _nativeTouchStartY);
                        if (dx > 5 || dy > 5) _nativeMoved = true;
                    }
                });
            }
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
   메인 클래스 진입점 섹션
   홈에서 목록/제휴/지원/예약으로 이어지는 진입 허브
   주의: \${var} 이스케이프 필수 (메이크샵 치환코드 오인 방지)
   ======================================== */
(function() {
    'use strict';

    var N8N_CLASS_API = 'https://n8n.pressco21.com/webhook/class-api';
    var CACHE_KEY = 'pressco21_home_featured_classes_v3';
    var CACHE_TTL = 30 * 60 * 1000;
    var FETCH_LIMIT = 8;
    var RENDER_LIMIT = 4;
    var DETAIL_BASE = '/shop/page.html?id=2607&class_id=';
    var LIST_URL = '/shop/page.html?id=2606';
    var APPLY_URL = '/shop/page.html?id=2609';
    var MYPAGE_URL = '/shop/page.html?id=8010';
    var AFFILIATION_URL = '/shop/page.html?id=2606&tab=affiliations';
    var HALF_GRAD_ID = 'mceHalfStarGrad';
    var halfGradInjected = false;

    function escHTML(str) {
        if (!str) return '';
        var d = document.createElement('div');
        d.appendChild(document.createTextNode(String(str)));
        return d.innerHTML;
    }

    function escAttr(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function sanitizeClassId(id) {
        if (!id || typeof id !== 'string') return '';
        var clean = id.replace(/[^a-zA-Z0-9\-_]/g, '');
        return clean.substring(0, 64);
    }

    function formatPrice(num) {
        var parsed = Number(num);
        if (isNaN(parsed)) return '0';
        return parsed.toLocaleString('ko-KR');
    }

    function formatShortDate(dateText) {
        if (!dateText) return '';
        var match = String(dateText).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return '';
        return match[2] + '.' + match[3];
    }

    function getPrimaryRegion(raw) {
        if (!raw) return '';
        var parts = String(raw).split(/[,\s/]+/).filter(function(part) {
            return !!part;
        });
        if (parts.length === 0) return '';
        if (parts[0] === '온라인') return '온라인';
        return parts.slice(0, 2).join(' ');
    }

    function buildListHref(params) {
        var pairs = ['id=2606'];
        if (params) {
            if (params.category) pairs.push('category=' + encodeURIComponent(params.category));
            if (params.level) pairs.push('level=' + encodeURIComponent(params.level));
            if (params.type) pairs.push('type=' + encodeURIComponent(params.type));
            if (params.region) pairs.push('region=' + encodeURIComponent(params.region));
            if (params.q) pairs.push('q=' + encodeURIComponent(params.q));
            if (params.tab) pairs.push('tab=' + encodeURIComponent(params.tab));
        }
        return '/shop/page.html?' + pairs.join('&');
    }

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
            html += '<svg class="mce-star" viewBox="0 0 20 20" fill="#d4a373" xmlns="http://www.w3.org/2000/svg"><path d="' + starPath + '"/></svg>';
        }
        if (hasHalf) {
            ensureHalfGradDef();
            html += '<svg class="mce-star" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="' + starPath + '" fill="url(#' + HALF_GRAD_ID + ')"/></svg>';
        }
        for (i = 0; i < 5 - fullStars - (hasHalf ? 1 : 0); i++) {
            html += '<svg class="mce-star" viewBox="0 0 20 20" fill="#ddd" xmlns="http://www.w3.org/2000/svg"><path d="' + starPath + '"/></svg>';
        }
        return html;
    }

    function gradeHTML(grade) {
        if (!grade) return '';
        var normalized = String(grade).toUpperCase();
        var gradeMap = {
            'SILVER': 'mce-grade-bloom',
            'BLOOM': 'mce-grade-bloom',
            'GOLD': 'mce-grade-garden',
            'GARDEN': 'mce-grade-garden',
            'PLATINUM': 'mce-grade-atelier',
            'ATELIER': 'mce-grade-atelier',
            'AMBASSADOR': 'mce-grade-ambassador'
        };
        return '<span class="mce-grade ' + (gradeMap[normalized] || 'mce-grade-bloom') + '">' + escHTML(grade) + '</span>';
    }

    function buildQuickLinksHTML() {
        var items = [
            { label: '서울 클래스', href: buildListHref({ region: '서울' }) },
            { label: '온라인 클래스', href: buildListHref({ type: '온라인' }) },
            { label: '원데이 체험', href: buildListHref({ type: '원데이' }) },
            { label: '입문 추천', href: buildListHref({ level: '입문' }) },
            { label: '압화 클래스', href: buildListHref({ category: '압화' }) },
            { label: '협회 제휴', href: AFFILIATION_URL, accent: true }
        ];
        var html = '<div class="mce-chip-row">';
        for (var i = 0; i < items.length; i++) {
            html += '<a class="mce-chip' + (items[i].accent ? ' mce-chip--accent' : '') + '" href="' + escAttr(items[i].href) + '">' + escHTML(items[i].label) + '</a>';
        }
        html += '</div>';
        return html;
    }

    function buildServiceLinksHTML() {
        var items = [
            {
                href: LIST_URL,
                title: '전체 클래스 탐색',
                copy: '지역, 카테고리, 난이도별로 바로 비교하세요.'
            },
            {
                href: APPLY_URL,
                title: '강사로 참여하기',
                copy: '공방 운영자와 강사회원이 바로 지원할 수 있습니다.'
            },
            {
                href: MYPAGE_URL,
                title: '예약 확인하기',
                copy: '예약 내역과 후기 작성 상태를 한 번에 확인합니다.'
            }
        ];
        var html = '<div class="mce-service-links">';
        for (var i = 0; i < items.length; i++) {
            html += '<a class="mce-service-link" href="' + escAttr(items[i].href) + '">';
            html += '<span><strong>' + escHTML(items[i].title) + '</strong><span>' + escHTML(items[i].copy) + '</span></span>';
            html += '<i class="mce-service-arrow" aria-hidden="true"></i>';
            html += '</a>';
        }
        html += '</div>';
        return html;
    }

    function buildMetricPlaceholdersHTML() {
        var html = '';
        var labels = ['추천 클래스', '확인된 잔여석', '온라인 수업', '키트 연동'];
        for (var i = 0; i < labels.length; i++) {
            html += '<div class="mce-metric">';
            html += '<span class="mce-metric-label">' + labels[i] + '</span>';
            html += '<span class="mce-metric-value">-</span>';
            html += '<span class="mce-metric-copy">데이터 로딩 중</span>';
            html += '</div>';
        }
        return html;
    }

    function buildMetricsHTML(classes) {
        var seatTotal = 0;
        var onlineCount = 0;
        var kitCount = 0;
        var i;

        for (i = 0; i < classes.length; i++) {
            seatTotal += Math.max(Number(classes[i].total_remaining) || 0, 0);
            if (String(classes[i].type || '').indexOf('온라인') > -1) {
                onlineCount += 1;
            }
            if (Number(classes[i].kit_enabled) > 0) {
                kitCount += 1;
            }
        }

        var items = [
            { label: '추천 클래스', value: classes.length + '개', copy: '홈에서 바로 살펴볼 수 있는 대표 수업' },
            { label: '확인된 잔여석', value: seatTotal + '석', copy: '가장 빠른 일정 기준 잔여 좌석 합계' },
            { label: '온라인 수업', value: onlineCount + '개', copy: '원격 수강 또는 온라인 진행 클래스' },
            { label: '키트 연동', value: kitCount + '개', copy: '재료 키트 구매까지 이어지는 수업' }
        ];

        var html = '';
        for (i = 0; i < items.length; i++) {
            html += '<div class="mce-metric">';
            html += '<span class="mce-metric-label">' + escHTML(items[i].label) + '</span>';
            html += '<span class="mce-metric-value">' + escHTML(items[i].value) + '</span>';
            html += '<span class="mce-metric-copy">' + escHTML(items[i].copy) + '</span>';
            html += '</div>';
        }
        return html;
    }

    function pickFeaturedClasses(classes) {
        var pool = [];
        var picked = [];
        var seenCategory = {};
        var i;

        for (i = 0; i < classes.length; i++) {
            if (sanitizeClassId(classes[i].class_id)) {
                pool.push(classes[i]);
            }
        }

        pool.sort(function(a, b) {
            var aSeats = Number(a.total_remaining) || 0;
            var bSeats = Number(b.total_remaining) || 0;
            if (bSeats !== aSeats) return bSeats - aSeats;
            return (Number(b.avg_rating) || 0) - (Number(a.avg_rating) || 0);
        });

        for (i = 0; i < pool.length; i++) {
            var category = String(pool[i].category || 'etc');
            if (!seenCategory[category]) {
                seenCategory[category] = true;
                picked.push(pool[i]);
            }
            if (picked.length >= RENDER_LIMIT) break;
        }

        for (i = 0; i < pool.length && picked.length < RENDER_LIMIT; i++) {
            if (picked.indexOf(pool[i]) === -1) {
                picked.push(pool[i]);
            }
        }

        return picked.slice(0, RENDER_LIMIT);
    }

    function buildThumbBadgesHTML(item, isUrgent) {
        var html = '<div class="mce-thumb-badges">';
        if (item.category) {
            html += '<span class="mce-badge">' + escHTML(item.category) + '</span>';
        }
        if (Number(item.kit_enabled) > 0) {
            html += '<span class="mce-kit">키트 연동</span>';
        }
        if (isUrgent) {
            html += '<span class="mce-urgent">마감 임박</span>';
        }
        html += '</div>';
        return html;
    }

    function buildCardHTML(item) {
        var safeId = sanitizeClassId(item.class_id);
        if (!safeId) return '';

        var rating = Number(item.avg_rating || item.rating) || 0;
        var reviewCount = Number(item.review_count) || 0;
        var seats = Math.max(Number(item.total_remaining) || Number(item.remaining_seats) || 0, 0);
        var isUrgent = seats > 0 && seats <= 5;
        var region = getPrimaryRegion(item.location);
        var classType = String(item.type || '').trim();
        var nextDate = formatShortDate(item.next_date);
        var thumbUrl = item.thumbnail_url || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="720" height="520" fill="%23eef3ee"/>');
        var soldOutText = seats <= 0 ? '마감' : '남은 ' + seats + '자리';

        var html = '<a class="mce-card" href="' + escAttr(DETAIL_BASE + safeId) + '" aria-label="' + escAttr(item.class_name) + ' 클래스 상세보기">';
        html += '<div class="mce-thumb">';
        html += '<img src="' + escAttr(thumbUrl) + '" alt="' + escAttr(item.class_name) + '" loading="lazy">';
        html += buildThumbBadgesHTML(item, isUrgent);
        html += '</div>';
        html += '<div class="mce-info">';
        html += '<div class="mce-meta-row">';
        if (region) {
            html += '<span class="mce-region">' + escHTML(region) + '</span>';
        }
        if (classType) {
            html += '<span class="mce-type">' + escHTML(classType) + '</span>';
        }
        html += '</div>';
        html += '<p class="mce-name">' + escHTML(item.class_name) + '</p>';
        html += '<div class="mce-instructor">';
        html += '<span class="mce-instructor-name">' + escHTML(item.partner_name || '파트너 공방') + '</span>';
        html += gradeHTML(item.grade || item.partner_grade || '');
        html += '</div>';
        html += '<div class="mce-rating">';
        if (rating > 0) {
            html += '<span class="mce-stars">' + createStarsSVG(rating) + '</span>';
            html += '<span class="mce-review-count">' + escHTML(rating.toFixed(1)) + (reviewCount > 0 ? ' (' + escHTML(reviewCount) + ')' : '') + '</span>';
        } else {
            html += '<span class="mce-review-count">첫 수업 모집중</span>';
        }
        html += '</div>';
        html += '<div class="mce-bottom-row">';
        html += '<div class="mce-price">' + formatPrice(item.price) + '원</div>';
        if (nextDate) {
            html += '<div class="mce-review-count">가장 빠른 일정 ' + escHTML(nextDate) + '</div>';
        }
        html += '</div>';
        html += '<div class="mce-sub-row">';
        html += '<span>' + (item.level ? escHTML(item.level + ' 추천') : '바로 예약 가능') + '</span>';
        html += '<span class="mce-seats' + (isUrgent || seats <= 0 ? ' mce-seats-urgent' : '') + '">' + escHTML(soldOutText) + '</span>';
        html += '</div>';
        html += '</div>';
        html += '</a>';
        return html;
    }

    function buildSkeletonHTML() {
        var html = '<div class="mce-skeleton-grid">';
        for (var i = 0; i < RENDER_LIMIT; i++) {
            html += '<div class="mce-skeleton-card"><div class="mce-sk-thumb"></div><div class="mce-sk-info"><div class="mce-sk-line mce-sk-line-full"></div><div class="mce-sk-line mce-sk-line-medium"></div><div class="mce-sk-line mce-sk-line-short"></div></div></div>';
        }
        html += '</div>';
        return html;
    }

    function buildSectionHTML(isLoading) {
        var html = '<section class="main-class-entry" id="main-class-entry">';
        html += '<div class="mce-container">';
        html += '<div class="mce-hero">';
        html += '<div class="mce-copy">';
        html += '<span class="mce-eyebrow">PARTNER CLASS</span>';
        html += '<h3>우리 동네 꽃 공예 클래스를 찾아보세요</h3>';
        html += '<p>영상으로 익힌 꽃 공예를 전국 파트너 공방에서 직접 경험하세요. 원데이 체험, 온라인 수업, 협회 제휴 혜택까지 홈에서 바로 연결됩니다.</p>';
        html += buildQuickLinksHTML();
        html += '<div class="mce-button-row">';
        html += '<a href="' + escAttr(LIST_URL) + '" class="mce-btn mce-btn--primary">전체 클래스 보기</a>';
        html += '<a href="' + escAttr(AFFILIATION_URL) + '" class="mce-btn mce-btn--secondary">협회 제휴 보기</a>';
        html += '</div>';
        html += '</div>';
        html += '<aside class="mce-service-panel">';
        html += '<span class="mce-panel-label">QUICK SERVICE</span>';
        html += '<h4 class="mce-panel-title">배우기, 참여하기, 예약 확인까지 한 번에</h4>';
        html += '<p class="mce-panel-copy">고객은 클래스 탐색으로, 강사는 지원과 운영으로, 기존 수강생은 마이페이지 확인으로 바로 이어지게 구성했습니다.</p>';
        html += buildServiceLinksHTML();
        html += '</aside>';
        html += '</div>';
        html += '<div class="mce-metrics" id="mce-metrics">' + buildMetricPlaceholdersHTML() + '</div>';
        html += isLoading ? buildSkeletonHTML() : '<div class="mce-grid" id="mce-grid"></div>';
        html += '<div class="mce-footer-links">';
        html += '<a href="' + escAttr(APPLY_URL) + '" class="mce-inline-link">강사 파트너 지원</a>';
        html += '<a href="' + escAttr(MYPAGE_URL) + '" class="mce-inline-link">예약 확인 / 후기 작성</a>';
        html += '</div>';
        html += '</div>';
        html += '</section>';
        return html;
    }

    function insertSection(html) {
        if (document.getElementById('main-class-entry')) return true;
        var ytSection = document.querySelector('.youtube-section-v3');
        if (ytSection) {
            ytSection.insertAdjacentHTML('afterend', html);
            return true;
        }
        var section04 = document.getElementById('section04');
        if (section04) {
            section04.insertAdjacentHTML('afterend', html);
            return true;
        }
        return false;
    }

    function getCachedData() {
        try {
            var raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            var cached = JSON.parse(raw);
            if (cached && cached.ts && (Date.now() - cached.ts < CACHE_TTL)) {
                return cached.data;
            }
            localStorage.removeItem(CACHE_KEY);
        } catch (e) {
            return null;
        }
        return null;
    }

    function setCachedData(data) {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                ts: Date.now(),
                data: data
            }));
        } catch (e) {
            /* 캐시 저장 실패 무시 */
        }
    }

    function renderMetrics(classes) {
        var metricBox = document.getElementById('mce-metrics');
        if (!metricBox) return;
        metricBox.innerHTML = buildMetricsHTML(classes);
    }

    function renderCards(classes) {
        var section = document.getElementById('main-class-entry');
        if (!section) return;

        var featured = pickFeaturedClasses(classes);
        if (!featured.length) {
            hideSection();
            return;
        }

        renderMetrics(featured);

        var skeletonGrid = section.querySelector('.mce-skeleton-grid');
        var footer = section.querySelector('.mce-footer-links');
        var gridHTML = '<div class="mce-grid" id="mce-grid">';

        for (var i = 0; i < featured.length; i++) {
            gridHTML += buildCardHTML(featured[i]);
        }
        gridHTML += '</div>';

        if (skeletonGrid) {
            skeletonGrid.insertAdjacentHTML('afterend', gridHTML);
            skeletonGrid.parentNode.removeChild(skeletonGrid);
        } else if (footer) {
            footer.insertAdjacentHTML('beforebegin', gridHTML);
        }
    }

    function hideSection() {
        var section = document.getElementById('main-class-entry');
        if (section) {
            section.style.display = 'none';
        }
    }

    function loadClasses() {
        if (!insertSection(buildSectionHTML(true))) return;

        var cached = getCachedData();
        if (cached && cached.length > 0) {
            renderCards(cached);
            return;
        }

        $.ajax({
            url: N8N_CLASS_API,
            type: 'POST',
            contentType: 'text/plain',
            data: JSON.stringify({
                action: 'getClasses',
                sort: 'popular',
                limit: FETCH_LIMIT
            }),
            dataType: 'json',
            cache: false,
            timeout: 10000,
            success: function(res) {
                var classes = null;
                if (res && res.success && res.data) {
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
                hideSection();
            }
        });
    }

    function initClassSection() {
        if ('IntersectionObserver' in window) {
            var trigger = document.querySelector('.youtube-section-v3') || document.getElementById('section04');
            if (!trigger) {
                loadClasses();
                return;
            }

            var observer = new IntersectionObserver(function(entries) {
                for (var i = 0; i < entries.length; i++) {
                    if (entries[i].isIntersecting) {
                        observer.disconnect();
                        loadClasses();
                        return;
                    }
                }
            }, {
                rootMargin: '200px 0px'
            });
            observer.observe(trigger);
        } else {
            loadClasses();
        }
    }

    $(function() {
        initClassSection();
    });

})();

/* ========================================
   팝업 슬라이드 통합 모듈
   메이크샵 이벤트 팝업(MAKESHOPLY0, MAKESHOPLY1, ...)을
   1개 모달 컨테이너에 Swiper 슬라이드로 통합
   셀렉터: [id^="MAKESHOPLY"]
   ======================================== */
(function() {
    'use strict';

    var STORAGE_KEY = 'pc21_popup_unified_hide';

    function isTodayHidden() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return false;
            return saved === new Date().toISOString().slice(0, 10);
        } catch (e) { return false; }
    }

    function setTodayHidden() {
        try {
            localStorage.setItem(STORAGE_KEY, new Date().toISOString().slice(0, 10));
        } catch (e) {}
    }

    function initPopupUnifier() {
        if (isTodayHidden()) {
            // 오늘 그만보기 설정된 경우 모든 팝업 숨기기
            var all = document.querySelectorAll('[id^="MAKESHOPLY"]');
            for (var i = 0; i < all.length; i++) all[i].style.display = 'none';
            return;
        }

        var popups = document.querySelectorAll('[id^="MAKESHOPLY"]');
        if (popups.length < 2) return; // 1개 이하면 통합 불필요

        // 원본 팝업 즉시 숨기기 (통합 모달보다 먼저)
        for (var h = 0; h < popups.length; h++) {
            popups[h].style.display = 'none';
            popups[h].style.visibility = 'hidden';
        }

        // 통합 오버레이 생성
        var overlay = document.createElement('div');
        overlay.id = 'pc21-popup-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.3s ease;';

        var modal = document.createElement('div');
        modal.id = 'pc21-popup-modal';
        modal.style.cssText = 'position:relative;max-width:520px;width:92%;max-height:85vh;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.2);';

        // Swiper 구조
        var swiperWrap = document.createElement('div');
        swiperWrap.className = 'swiper';
        swiperWrap.style.cssText = 'width:100%;overflow:hidden;';

        var swiperWrapper = document.createElement('div');
        swiperWrapper.className = 'swiper-wrapper';

        // 각 팝업 콘텐츠를 슬라이드로 이동
        for (var i = 0; i < popups.length; i++) {
            var slide = document.createElement('div');
            slide.className = 'swiper-slide';
            slide.style.cssText = 'display:flex;align-items:center;justify-content:center;';

            // 팝업 내부의 #popup-event 콘텐츠만 추출
            var popEvt = popups[i].querySelector('#popup-event');
            if (popEvt) {
                var contentWrap = popEvt.querySelector('.content-wrap');
                if (contentWrap) {
                    var clone = contentWrap.cloneNode(true);
                    // 이미지 max-width 보장
                    var imgs = clone.querySelectorAll('img');
                    for (var j = 0; j < imgs.length; j++) {
                        imgs[j].style.maxWidth = '100%';
                        imgs[j].style.height = 'auto';
                    }
                    slide.appendChild(clone);
                }
            }
            swiperWrapper.appendChild(slide);
        }

        swiperWrap.appendChild(swiperWrapper);

        // 페이지네이션
        var pagination = document.createElement('div');
        pagination.className = 'swiper-pagination';
        pagination.style.cssText = 'text-align:center;padding:8px 0;';
        swiperWrap.appendChild(pagination);

        // 하단 버튼
        var btnWrap = document.createElement('div');
        btnWrap.style.cssText = 'display:flex;border-top:1px solid #eee;';

        var btnHide = document.createElement('a');
        btnHide.textContent = '오늘은 그만 보기';
        btnHide.href = '#';
        btnHide.style.cssText = 'flex:1;text-align:center;padding:14px 0;color:#888;font-size:14px;text-decoration:none;border-right:1px solid #eee;';

        var btnClose = document.createElement('a');
        btnClose.textContent = '닫기';
        btnClose.href = '#';
        btnClose.style.cssText = 'flex:1;text-align:center;padding:14px 0;color:#333;font-size:14px;font-weight:600;text-decoration:none;';

        btnWrap.appendChild(btnHide);
        btnWrap.appendChild(btnClose);

        modal.appendChild(swiperWrap);
        modal.appendChild(btnWrap);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Swiper 초기화
        setTimeout(function() {
            if (typeof Swiper !== 'undefined') {
                new Swiper(swiperWrap, {
                    loop: popups.length > 1,
                    autoplay: { delay: 3000, disableOnInteraction: false },
                    pagination: { el: pagination, clickable: true }
                });
            }
        }, 100);

        // 즉시 표시
        overlay.style.opacity = '1';

        // 이벤트
        function closePopup() {
            overlay.style.opacity = '0';
            setTimeout(function() {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 300);
            // 원본 팝업의 닫기 링크를 호출하여 메이크샵 내부 상태 정리
            for (var k = 0; k < popups.length; k++) {
                var closeLink = popups[k].querySelector('a.pop_close, a:last-child');
                if (closeLink && closeLink.href) {
                    try {
                        var fn = closeLink.getAttribute('href');
                        if (fn && fn.indexOf('javascript:') === 0) {
                            eval(fn.replace('javascript:', ''));
                        }
                    } catch(e) {}
                }
            }
            // body 스크롤 복원 보장
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.touchAction = '';
            document.documentElement.style.overflow = '';
        }

        btnClose.addEventListener('click', function(e) { e.preventDefault(); closePopup(); });

        // 오버레이 클릭으로 닫기 (드래그/스와이프 구분)
        var mouseDownTarget = null;
        overlay.addEventListener('mousedown', function(e) { mouseDownTarget = e.target; });
        overlay.addEventListener('mouseup', function(e) {
            // mousedown과 mouseup이 모두 오버레이 자체일 때만 닫기
            if (e.target === overlay && mouseDownTarget === overlay) closePopup();
            mouseDownTarget = null;
        });

        btnHide.addEventListener('click', function(e) {
            e.preventDefault();
            setTodayHidden();
            closePopup();
        });
    }

    // DOM 로드 후 즉시 실행 (메이크샵 팝업은 HTML에 포함되어 즉시 사용 가능)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPopupUnifier);
    } else {
        initPopupUnifier();
    }
})();
