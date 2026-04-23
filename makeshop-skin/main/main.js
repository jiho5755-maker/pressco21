/* ========================================
   PRESSCO21 메인페이지 - 메이크샵 D4
   IIFE 패턴으로 전역 변수 오염 방지
   주의: 템플릿 리터럴 내 달러중괄호는 백슬래시 이스케이프 필수
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
   팝업 슬라이드 통합 모듈 v2
   - PC + 모바일 모두 지원
   - 팝업 1개도 통합 모달로 표시
   - iOS 스크롤 락 대응
   - CSS 클래스 기반 원본 팝업 숨김
   셀렉터: [id^="MAKESHOPLY"]
   ======================================== */
(function() {
    'use strict';

    // MakeShop 이벤트 팝업은 업로드 후 이미지명이 바뀌므로 슬롯(eventwindowN) 기준으로 라우팅한다.
    // audience 값은 추후 회원등급 개편 시 groupIncludes만 추가하면 된다.
    var PC21_POPUP_AUDIENCE_RULES = {
        eventwindow0: {
            audience: 'instructor',
            groupIncludes: ['강사']
        }
    };

    function pc21GetMemberContext() {
        var contextNode = document.getElementById('pc21-main-member-context');
        return {
            isLogin: !!(contextNode && contextNode.getAttribute('data-login') === '1'),
            groupName: String(contextNode ? contextNode.getAttribute('data-group') || '' : '')
        };
    }

    function pc21AudienceMatches(rule) {
        var context = pc21GetMemberContext();
        var includes = rule && rule.groupIncludes ? rule.groupIncludes : [];
        var i;
        if (!rule || !rule.audience || rule.audience === 'all') {
            return true;
        }
        if (rule.audience === 'guest') {
            return !context.isLogin;
        }
        if (rule.audience === 'login') {
            return context.isLogin;
        }
        if (!context.isLogin) {
            return false;
        }
        for (i = 0; i < includes.length; i += 1) {
            if (context.groupName.indexOf(includes[i]) !== -1) {
                return true;
            }
        }
        return false;
    }

    function pc21GetPopupCookieName(popup) {
        var hideLink = popup ? popup.querySelector('a[href*="MAKESHOP_LY_NOVIEW(1"]') : null;
        var match;
        if (!hideLink) {
            return '';
        }
        match = String(hideLink.getAttribute('href') || '').match(/MAKESHOP_LY_NOVIEW\([^,]+,\s*'[^']+',\s*'([^']+)'/);
        return match ? match[1] : '';
    }

    function pc21GetPopupAudienceRule(popup) {
        var cookieName = pc21GetPopupCookieName(popup);
        return cookieName && PC21_POPUP_AUDIENCE_RULES[cookieName] ? PC21_POPUP_AUDIENCE_RULES[cookieName] : null;
    }

    function pc21FilterPopupsByAudience(allPopups) {
        var filtered = [];
        var rule;
        for (var i = 0; i < allPopups.length; i++) {
            rule = pc21GetPopupAudienceRule(allPopups[i]);
            if (rule && !pc21AudienceMatches(rule)) {
                allPopups[i].style.display = 'none';
                allPopups[i].style.visibility = 'hidden';
                allPopups[i].setAttribute('data-pc21-popup-audience-hidden', '1');
                allPopups[i].setAttribute('data-pc21-popup-audience', rule.audience);
                continue;
            }
            if (rule) {
                allPopups[i].setAttribute('data-pc21-popup-audience', rule.audience);
            }
            filtered.push(allPopups[i]);
        }
        return filtered;
    }

    // MakeShop 네이티브 getCookie 함수 사용하여 팝업별 쿠키 확인
    function areAllPopupsCookied(popups) {
        if (typeof getCookie !== 'function') return false;
        for (var i = 0; i < popups.length; i++) {
            var hideLink = popups[i].querySelector('a[href*="MAKESHOP_LY_NOVIEW(1"]');
            if (!hideLink) continue;
            // href에서 쿠키명과 만료값 추출: MAKESHOP_LY_NOVIEW(1, 'MAKESHOPLY0', 'eventwindow0', '2026123100', '1')
            var match = hideLink.getAttribute('href').match(/MAKESHOP_LY_NOVIEW\([^,]+,\s*'[^']+',\s*'([^']+)',\s*'([^']+)'/);
            if (match) {
                var cookieName = match[1];  // eventwindow0
                var cookieVal = match[2];   // 2026123100
                if (getCookie(cookieName) !== cookieVal) return false; // 이 팝업은 아직 안 숨김
            } else {
                return false; // 파싱 실패 → 안전하게 표시
            }
        }
        return true; // 모든 팝업이 쿠키로 숨김 처리됨
    }

    function initPopupUnifier() {
        var allPopups = document.querySelectorAll('[id^="MAKESHOPLY"]');
        var popups = pc21FilterPopupsByAudience(allPopups);
        var hideStyle;
        var scrollState;
        if (allPopups.length === 0) return;

        // 원본 팝업 숨기기: style 태그 주입
        hideStyle = document.createElement('style');
        hideStyle.id = 'pc21-popup-unified-style';
        hideStyle.textContent = '[id^="MAKESHOPLY"] { display: none !important; visibility: hidden !important; }';
        document.head.appendChild(hideStyle);

        if (popups.length === 0) return;

        // 모든 팝업이 "오늘 그만 보기" 쿠키가 설정되어 있으면 숨기고 종료
        if (areAllPopupsCookied(popups)) {
            for (var h = 0; h < allPopups.length; h++) allPopups[h].style.display = 'none';
            return;
        }

        // 각 팝업의 네이티브 "오늘 그만 보기" href 수집 (MAKESHOP_LY_NOVIEW 호출용)
        var nativeHideHrefs = [];
        for (var n = 0; n < popups.length; n++) {
            var hideLink = popups[n].querySelector('a[href*="MAKESHOP_LY_NOVIEW(1"]');
            if (hideLink) {
                nativeHideHrefs.push(hideLink.getAttribute('href'));
            }
        }

        // 콘텐츠 추출
        var slideContents = [];
        for (var k = 0; k < popups.length; k++) {
            var popEvt = popups[k].querySelector('#popup-event');
            var content = popEvt ? (popEvt.querySelector('.content-wrap') || popEvt) : popups[k];
            if (content) {
                var clone = content.cloneNode(true);
                var imgs = clone.querySelectorAll('img');
                for (var j = 0; j < imgs.length; j++) {
                    imgs[j].style.maxWidth = '100%';
                    imgs[j].style.height = 'auto';
                    imgs[j].style.display = 'block';
                }
                slideContents.push(clone);
            }
        }
        if (slideContents.length === 0) return;

        // 오버레이
        var overlay = document.createElement('div');
        overlay.id = 'pc21-popup-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.3s ease;';

        // 모달
        var modal = document.createElement('div');
        modal.id = 'pc21-popup-modal';
        modal.style.cssText = 'position:relative;max-width:520px;width:92%;max-height:85vh;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.2);display:flex;flex-direction:column;';

        // Swiper 구조
        var swiperWrap = document.createElement('div');
        swiperWrap.className = 'swiper';
        swiperWrap.style.cssText = 'width:100%;overflow:hidden;flex:1;min-height:0;';

        var swiperWrapper = document.createElement('div');
        swiperWrapper.className = 'swiper-wrapper';

        for (var s = 0; s < slideContents.length; s++) {
            var slide = document.createElement('div');
            slide.className = 'swiper-slide';
            slide.style.cssText = 'display:flex;align-items:center;justify-content:center;';
            slide.appendChild(slideContents[s]);
            swiperWrapper.appendChild(slide);
        }

        swiperWrap.appendChild(swiperWrapper);

        // 페이지네이션 (2개 이상만)
        var pagination = null;
        if (slideContents.length > 1) {
            pagination = document.createElement('div');
            pagination.className = 'swiper-pagination';
            pagination.style.cssText = 'text-align:center;padding:8px 0;';
            swiperWrap.appendChild(pagination);
        }

        // 하단 버튼
        var btnWrap = document.createElement('div');
        btnWrap.style.cssText = 'display:flex;border-top:1px solid #eee;flex-shrink:0;';

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

        function lockBodyScroll() {
            var currentScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
            scrollState = {
                scrollY: currentScrollY,
                bodyPosition: document.body.style.position,
                bodyTop: document.body.style.top,
                bodyLeft: document.body.style.left,
                bodyRight: document.body.style.right,
                bodyOverflow: document.body.style.overflow,
                bodyTouchAction: document.body.style.touchAction,
                htmlOverflow: document.documentElement.style.overflow
            };
            document.body.style.position = 'fixed';
            document.body.style.top = '-' + currentScrollY + 'px';
            document.body.style.left = '0';
            document.body.style.right = '0';
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none';
            document.documentElement.style.overflow = 'hidden';
        }

        function unlockBodyScroll() {
            var wrapNode = document.getElementById('wrap');
            if (!scrollState) {
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.left = '';
                document.body.style.right = '';
                document.body.style.overflow = '';
                document.body.style.touchAction = '';
                document.documentElement.style.overflow = '';
                document.body.classList.remove('setPopupStyle');
                if (wrapNode && wrapNode.className) {
                    wrapNode.className = wrapNode.className.replace(/(?:^|\s)body-popon(?!\S)/g, '').trim();
                }
                return;
            }
            document.body.style.position = scrollState.bodyPosition || '';
            document.body.style.top = scrollState.bodyTop || '';
            document.body.style.left = scrollState.bodyLeft || '';
            document.body.style.right = scrollState.bodyRight || '';
            document.body.style.overflow = scrollState.bodyOverflow || '';
            document.body.style.touchAction = scrollState.bodyTouchAction || '';
            document.documentElement.style.overflow = scrollState.htmlOverflow || '';
            document.body.classList.remove('setPopupStyle');
            if (wrapNode && wrapNode.className) {
                wrapNode.className = wrapNode.className.replace(/(?:^|\s)body-popon(?!\S)/g, '').trim();
            }
            window.scrollTo(0, scrollState.scrollY || 0);
        }

        lockBodyScroll();

        document.body.appendChild(overlay);

        // Swiper 초기화
        setTimeout(function() {
            if (typeof Swiper !== 'undefined') {
                var opts = {};
                if (slideContents.length > 1) {
                    opts.loop = true;
                    opts.autoplay = { delay: 3000, disableOnInteraction: false };
                    opts.pagination = { el: pagination, clickable: true };
                }
                new Swiper(swiperWrap, opts);
            }
        }, 100);

        // 페이드인
        requestAnimationFrame(function() {
            overlay.style.opacity = '1';
        });

        // 닫기 함수
        function closePopup() {
            overlay.style.opacity = '0';
            unlockBodyScroll();
            setTimeout(function() {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 300);
        }

        // MakeShop 네이티브 팝업 함수 실행 헬퍼
        function execNativePopup(flag) {
            // style 태그 제거 (네이티브 함수가 요소 조작 가능하도록)
            var sty = document.getElementById('pc21-popup-unified-style');
            if (sty) sty.parentNode.removeChild(sty);
            // 각 팝업의 네이티브 링크 href 실행
            var selector = 'a[href*="MAKESHOP_LY_NOVIEW(' + flag + '"]';
            for (var pi = 0; pi < popups.length; pi++) {
                var link = popups[pi].querySelector(selector);
                if (link) {
                    var code = link.getAttribute('href').replace(/^javascript:\s*/, '');
                    try { (0, eval)(code); } catch(ex) {}
                }
            }
        }

        btnClose.addEventListener('click', function(e) {
            e.preventDefault();
            try {
                execNativePopup(0); // 닫기 (쿠키 미설정)
            } finally {
                closePopup();
            }
        });
        btnHide.addEventListener('click', function(e) {
            e.preventDefault();
            try {
                execNativePopup(1); // 오늘 그만 보기 (쿠키 설정)
            } finally {
                closePopup();
            }
        });

        // PC: mousedown/mouseup 타겟 매칭으로 오버레이 클릭 닫기
        var mouseDownTarget = null;
        overlay.addEventListener('mousedown', function(e) { mouseDownTarget = e.target; });
        overlay.addEventListener('mouseup', function(e) {
            if (e.target === overlay && mouseDownTarget === overlay) closePopup();
            mouseDownTarget = null;
        });

        // 모바일: 터치 거리 체크 (스와이프 vs 탭 구분)
        var touchStartX = 0, touchStartY = 0, touchMoved = false;
        overlay.addEventListener('touchstart', function(e) {
            if (e.target === overlay && e.touches.length > 0) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                touchMoved = false;
            }
        }, { passive: true });
        overlay.addEventListener('touchmove', function(e) {
            if (e.touches.length > 0) {
                var dx = Math.abs(e.touches[0].clientX - touchStartX);
                var dy = Math.abs(e.touches[0].clientY - touchStartY);
                if (dx > 10 || dy > 10) touchMoved = true;
            }
        }, { passive: true });
        overlay.addEventListener('touchend', function(e) {
            if (e.target === overlay && !touchMoved) closePopup();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPopupUnifier);
    } else {
        initPopupUnifier();
    }
})();
/* 2026-04-18: visible price/original 기준 할인율 보정 */
(function() {
    'use strict';

    function pc21ParseWon(text) {
        var raw = String(text || '').replace(/[^0-9]/g, '');
        return raw ? parseInt(raw, 10) : 0;
    }

    function pc21SetDiscountRate(container, saleNode, baseNode, insertAfterNode) {
        var sale = pc21ParseWon(saleNode ? saleNode.textContent : '');
        var base = pc21ParseWon(baseNode ? baseNode.textContent : '');
        var existingNode = container.querySelector('.discount, .pc21-ug-discount');
        if (sale && base && base === sale && baseNode) {
            if (baseNode.style.display !== 'none') {
                baseNode.style.display = 'none';
            }
            if (existingNode && existingNode.textContent !== '') {
                existingNode.textContent = '';
            }
            return;
        }
        if (!sale || !base || base <= sale) {
            return;
        }
        if (baseNode && baseNode.style.display === 'none') {
            baseNode.style.display = '';
        }
        var rate = Math.round((base - sale) * 100 / base);
        if (rate <= 0) {
            return;
        }
        var node = existingNode;
        if (!node) {
            node = document.createElement('span');
            node.className = 'pc21-ug-discount';
            node.setAttribute('style', 'display:inline-flex;align-items:center;min-height:22px;padding:2px 7px;border-radius:999px;background:#fff3ed;margin-left:2px;color:#a85b45;font-size:13px;font-weight:800;letter-spacing:-0.02em;line-height:1.2;vertical-align:baseline;');
            if (insertAfterNode && insertAfterNode.parentNode) {
                insertAfterNode.parentNode.insertBefore(node, insertAfterNode.nextSibling);
            } else {
                container.appendChild(node);
            }
        }
        var rateText = rate + '%';
        if (node.textContent !== rateText) {
            node.textContent = rateText;
        }
    }

    function pc21Each(scope, selector, callback) {
        var root = scope || document;
        if (root.matches && root.matches(selector)) {
            callback(root);
        }
        if (!root.querySelectorAll) {
            return;
        }
        var nodes = root.querySelectorAll(selector);
        for (var i = 0; i < nodes.length; i++) {
            callback(nodes[i]);
        }
    }

    function renderVisibleDiscountRates(root) {
        pc21Each(root, '.prds--price-wrap .prices', function(row) {
            var saleNode = row.querySelector('.price');
            var baseNode = row.querySelector('.original');
            if (!saleNode || !baseNode) {
                return;
            }
            pc21SetDiscountRate(row, saleNode, baseNode, baseNode);
        });
        pc21Each(root, '.price', function(row) {
            var saleNode = row.querySelector('.normal');
            var baseNode = row.querySelector('.consumer');
            if (!saleNode || !baseNode) {
                return;
            }
            pc21SetDiscountRate(row, saleNode, baseNode, baseNode);
        });
    }

    renderVisibleDiscountRates(document);
    var target = document.querySelector('#contents') || document.body;
    if (target && window.MutationObserver) {
        var observer = new MutationObserver(function(mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var added = mutations[i].addedNodes;
                for (var j = 0; j < added.length; j++) {
                    if (added[j].nodeType === 1) {
                        renderVisibleDiscountRates(added[j]);
                    }
                }
            }
            renderVisibleDiscountRates(target);
        });
        observer.observe(target, { childList: true, subtree: true });
    }
})();

/* 2026-04-20: main 강사회원가 정책맵 보정 */
(function() {
    'use strict';

    var PC21_SHARED_MEMBER_PRICE_DATA = '184:1980:2200:10,369663:2400:2800:14,1155298:9000:10000:10,1156813:3600:4000:10,1156847:2250:2500:10,1156856:360:400:10,1156873:28800:32000:10,1156911:2700:3000:10,1156954:800:900:11,1156956:800:900:11,11602933:72000:80000:10,11602935:72000:80000:10,11602940:72000:80000:10,11602942:72000:80000:10,11602944:72000:80000:10,11602949:43200:48000:10,11602951:158400:176000:10,11602953:158400:176000:10,11602955:158400:176000:10,11602957:158400:176000:10,11602961:158400:176000:10,11602963:216000:240000:10,11602972:158400:176000:10,11602974:158400:176000:10,11602976:158400:176000:10'
    + ',11602979:158400:176000:10,11602983:90000:100000:10,11602987:90000:100000:10,11602989:90000:100000:10,11602991:90000:100000:10,11602993:90000:100000:10,11604875:640:800:20,11604876:640:800:20,11604892:180000:200000:10,11604894:180000:200000:10,11604896:180000:200000:10,11604900:180000:200000:10,11604903:180000:200000:10,11604905:234000:260000:10,11609118:2700:3000:10,11616033:2250:2500:10,11616078:1800:2000:10,11616080:1800:2000:10,11616091:7000:7400:5,11616096:6000:7000:14,11616098:4750:5300:10,11616100:4750:5300:10,11618350:13500:15000:10,11626244:5400:6000:10,11631486:2250:2500:10'
    + ',11631754:720:800:10,11631766:2150:2400:10,11631768:3600:4000:10,11644305:2250:2500:10,11644311:1400:1500:7,11646470:31500:35000:10,11652054:2700:3000:10,11663225:2700:3000:10,11668144:10800:12000:10,11674390:4250:4500:6,11678267:1530:1700:10,11682944:3300:3700:11,11682949:1200:1500:20,11687103:5400:6000:10,11687139:1150:1300:12,11692421:3600:4000:10,11697016:4050:4500:10,11697020:3600:4000:10,11697023:4050:4500:10,11697030:3600:4000:10,11697032:3600:4000:10,11697034:3600:4000:10,11697068:10800:12000:10,11697091:2500:2800:11,11697122:95000:100000:5'
    + ',11697154:450:500:10,11697162:3600:4000:10,11697164:4050:4500:10,11697170:9000:10000:10,11697172:9000:10000:10,11697197:5600:7000:20,11697199:5600:7000:20,11697201:5600:7000:20,11697204:4500:5000:10,11697208:4500:5000:10,11697210:4500:5000:10,11697214:2800:3500:20,11697247:3150:3500:10,11697249:3150:3500:10,11697262:5650:6300:10,11697270:4050:4500:10,11697275:4500:5000:10,11697280:3600:4000:10,11697282:4500:5000:10,11697284:4050:4500:10,11697286:3150:3500:10,11697291:3600:4000:10,11697294:4050:4500:10,11697297:4050:4500:10,11697302:3600:4000:10'
    + ',11697308:3600:4000:10,11697322:3600:4000:10,11697324:4500:5000:10,11697326:4050:4500:10,11697328:4950:5500:10,11697330:3600:4000:10,11697332:2700:3000:10,11697334:4500:5000:10,11697336:5400:6000:10,11697353:1200:1500:20,11697404:2700:3000:10,11697408:2700:3000:10,11697410:2700:3000:10,11697412:2700:3000:10,11697414:2700:3000:10,11697416:2700:3000:10,11697476:4500:5000:10,11697549:3200:4000:20,2:4000:5000:20,11697554:4000:5000:20,11697574:3600:4000:10,11697576:20700:23000:10,11697599:4000:4400:9,11697785:2250:2500:10,11697847:1200:1500:20'
    + ',11697867:5600:7000:20,11697875:5400:6000:10,11697887:1200:1300:8,11697911:2700:3000:10,11697933:1050:1200:12,11697938:4950:5500:10,11697948:14400:16000:10,11697955:4000:4400:9,11697957:4000:4400:9,11697959:4000:4400:9,11697961:4000:4400:9,11697963:4000:4400:9,11697965:4000:4400:9,11697967:4000:4400:9,11697970:4000:4400:9,11697974:4000:4400:9,11697982:4000:4400:9,11697986:4000:4400:9,11697988:4000:4400:9,11697999:4750:5000:5,11698006:900:1000:10,11698023:3600:4000:10,11698027:3600:4000:10,11698029:3600:4000:10,11698031:3600:4000:10'
    + ',11698033:3600:4000:10,11698035:3600:4000:10,11698037:3600:4000:10,11698040:3600:4000:10,11698042:3600:4000:10,11698060:5850:6500:10,11698062:5850:6500:10,11698104:5400:6000:10,11698111:3200:4000:20,11698119:3600:4000:10,11698121:3600:4000:10,11698125:4000:5000:20,11698134:2800:3600:22,11698155:9000:10000:10,11698209:21600:24000:10,11698282:4300:4800:10,11698310:63000:70000:10,11698337:11700:13000:10,11698341:11700:13000:10,11698343:11700:13000:10,11698347:4400:4900:10,11698387:5400:6000:10,11698459:4800:5400:11,11698462:900:1000:10,11698537:2840:3150:10'
    + ',11698540:4050:4500:10,11698542:4050:4500:10,11698544:4050:4500:10,11698546:4050:4500:10,11698548:4050:4500:10,11698550:4050:4500:10,11698552:4050:4500:10,11698554:4050:4500:10,11698560:3600:4000:10,11698564:3600:4000:10,11698566:3600:4000:10,11698569:3600:4000:10,11698571:3600:4000:10,11698574:3600:4000:10,11698605:3000:3400:12,11698607:3000:3400:12,11698609:3000:3400:12,11698611:3000:3400:12,11698613:3000:3400:12,11698615:3000:3400:12,11698617:2400:2700:11,11698619:3000:3400:12,11698622:3000:3400:12,11698624:3000:3400:12,626:3000:3400:12'
    + ',11698628:3000:3400:12,11698643:3200:4000:20,11698645:3200:4000:20,11698647:3200:4000:20,11698649:3200:4000:20,11698651:3200:4000:20,11698653:3200:4000:20,11698655:3200:4000:20,11698666:2800:3500:20,11698702:3150:3500:10,11698704:3150:3500:10,11698706:3150:3500:10,11698708:3150:3500:10,11698710:3150:3500:10,11698712:3150:3500:10,11698714:3150:3500:10,11698716:3150:3500:10,11698720:8200:8600:5,11698736:13500:15000:10,11698766:2700:3200:16,11698807:400:450:11,11698813:142500:150000:5,11698815:256500:270000:5,11698828:2400:3000:20,11698851:4000:4400:9'
    + ',11698855:4000:4400:9,11698859:4000:4400:9,11698861:4000:4400:9,11698865:4000:4400:9,11698873:4000:4400:9,11698899:4050:4500:10,11698907:4500:5000:10,11698909:4500:5000:10,11698911:4500:5000:10,11699042:3500:3900:10,11699044:4900:5500:11,11699046:2700:3000:10,11699093:7650:8500:10,11699110:54000:60000:10,11699157:4950:5500:10,699159:5850:6500:10,11699178:18000:20000:10,11699183:18000:20000:10,11699187:18000:20000:10,11699192:18000:20000:10,11699194:18000:20000:10,11699196:18000:20000:10,11699220:7200:8000:10,11699228:5400:6000:10,11699231:2700:3000:10'
    + ',11699261:1050:1200:12,11699278:5400:6000:10,11699280:5400:6000:10,11699282:3150:3500:10,11699286:5400:6000:10,11699288:5400:6000:10,11699300:10800:12000:10,11699302:10800:12000:10,11699304:10800:12000:10,11699306:10800:12000:10,11699308:10800:12000:10,11699310:10800:12000:10,11699312:10800:12000:10,11699331:1200:1300:8,11699386:1710:1900:10,11699407:3600:4000:10,11699409:3600:4000:10,11699411:3600:4000:10,11699413:3600:4000:10,11699415:3600:4000:10,11699417:3600:4000:10,11699419:3600:4000:10,11699421:3600:4000:10,11699423:3600:4000:10,11699426:14400:16000:10'
    + ',11699456:8500:9500:11,11699486:600:700:14,11699494:3600:4000:10,11699496:3600:4000:10,11699500:5400:6000:10,11699504:4500:5000:10,11699506:4500:5000:10,11699508:4500:5000:10,11699524:4400:5500:20,11699526:4400:5500:20,11699528:4400:5500:20,11699530:4400:5500:20,11699532:4400:5500:20,11699534:4000:4400:9,11699536:4000:4400:9,11699538:4000:4400:9,11699540:4000:4400:9,11699542:4000:4400:9,11699546:4000:4400:9,11699548:4000:4400:9,11699550:4000:4400:9,11699552:4000:4400:9,11699554:4000:4400:9,11699556:4000:4400:9,11699558:4000:4400:9'
    + ',11699560:4000:4400:9,11699562:4000:4400:9,11699564:4000:4400:9,11699566:4000:4400:9,11699570:4000:4400:9,11699572:4000:4400:9,11699574:4000:4400:9,11699576:4000:4400:9,11699578:4000:4400:9,11699580:4000:4400:9,11699582:4000:4400:9,11699584:4000:4400:9,11699586:4000:4400:9,11699588:4000:4400:9,11699590:4000:4400:9,11699592:2800:3100:10,11699594:2050:2300:11,11699603:4850:5400:10,11699625:13500:15000:10,11699627:13500:15000:10,11699631:10400:13000:20,11699633:13500:15000:10,11699638:7650:8500:10,11699641:7650:8500:10,11699643:7650:8500:10'
    + ',11699645:7650:8500:10,11699647:7650:8500:10,11699649:7650:8500:10,11699651:7650:8500:10,11699653:7650:8500:10,11699656:450:500:10,11699670:600:700:14,11699682:3600:4000:10,11699684:4500:5000:10,11699694:56700:63000:10,11699777:3150:3500:10,11699789:4500:5000:10,11699791:4000:4400:9,11699809:4050:4500:10,11699827:3600:4000:10,11699833:3150:3500:10,11699835:3150:3500:10,11699892:2700:3000:10,11699894:3150:3500:10,11699896:3600:4000:10,11699898:2700:3000:10,11699900:3600:4000:10,11699902:2700:3000:10,11699904:2700:3000:10,11699908:4500:5000:10'
    + ',11699911:4500:5000:10,11699913:4500:5000:10,11699915:4500:5000:10,11699917:4500:5000:10,11699919:4500:5000:10,11699921:4500:5000:10,11699923:4500:5000:10,11699925:4500:5000:10,11699927:7650:8500:10,11699929:7650:8500:10,11699956:5400:6000:10,11699959:4500:5000:10,11699961:4500:5000:10,11699963:4500:5000:10,11699967:4500:5000:10,11699969:4500:5000:10,11699991:3600:4000:10,11699994:8000:8900:10,11699996:3150:3500:10,11699999:7200:8000:10,11700001:12600:14000:10,11700004:15300:17000:10,11700005:12600:14000:10,11700021:12600:14000:10,11700023:360:400:10'
    + ',11700033:1170:1300:10,11700037:252000:280000:10,11700075:8550:9500:10,11700113:5670:6300:10,11700131:5850:6500:10,11700132:5850:6500:10,11700134:5850:6500:10,11700135:5850:6500:10,11700139:5850:6500:10,11700140:8550:9500:10,11700142:8550:9500:10,11700181:900:1000:10,11700185:16650:18500:10,11700187:900:1000:10,11700197:450:500:10,11700206:1800:2000:10,11700212:990:1100:10,11700213:5670:6300:10,11700218:1710:1900:10,11700383:140:150:7,11700448:14400:16000:10,11700452:900:1000:10,11700454:1800:2000:10,11700456:2700:3000:10,11700458:1800:2000:10'
    + ',91:4050:4500:10,11700507:3240:3600:10,11700519:1440:1600:10,11700522:3150:3500:10,11700523:1080:1200:10,11700530:5400:6000:10,11700532:400:450:11,11700561:1350:1500:10,11700563:270:300:10,11700566:700:1400:50,11700573:1600:2000:20,11700641:3600:4000:10,11700750:4500:5000:10,11700752:4500:5000:10,11700754:2300:2400:4,11700757:12600:14000:10,11700779:3600:4000:10,11700781:3600:4000:10,11700783:3600:4000:10,11700785:3600:4000:10,11700787:3600:4000:10,11700789:3600:4000:10,11700791:3600:4000:10,11700793:13500:15000:10,11700805:3150:3500:10'
    + ',11700808:3150:3500:10,11700822:13500:15000:10,11700824:18000:20000:10,11700826:8550:9500:10,11700858:2250:2500:10,11700937:9900:11000:10,11700965:2520:2800:10,11700968:15300:17000:10,11700977:6300:7000:10,11701043:2320:2900:20,11701066:3500:3900:10,11701068:44100:49000:10,11701204:5900:6600:11,11701227:900:1000:10,11701243:3600:4000:10,11701244:3600:4000:1,11701245:3600:4000:10,11701246:3600:4000:10,11701247:3600:4000:10,11701248:3600:4000:10,11701279:4050:4500:10,11701281:4050:4500:10,11701291:4500:5000:10,11701294:4000:4400:9,11701295:4500:5000:10'
    + ',11701299:2700:3000:10,11701301:3600:4000:10,11701303:4500:5000:10,11701305:4500:5000:10,11701343:990:1100:10,11701350:18900:21000:10,11701351:18000:20000:10,11701353:21870:24300:10,11701355:5400:6000:10,11701388:4700:5300:11,11701390:5300:5900:10,11701413:900:1000:10,11701415:6300:7000:10,11701417:6300:7000:10,11701419:6300:7000:10,11701421:700:800:12,11701475:4000:4400:9,11701478:4500:5000:10,11701479:1800:2000:10,11701480:3600:4000:10,11701481:3600:4000:10,11701484:9000:10000:10,11701517:4050:4500:10,11701518:2160:2400:10,11701520:3000:3300:9'
    + ',11701522:29700:33000:10,11701525:12700:15900:20,11701527:9600:12000:20,11701529:1600:2000:20,11701531:2400:3000:20,11701533:400:500:20,11701603:161100:179000:10,11701604:269100:299000:10,11701605:35100:39000:10,11701607:170100:189000:10,11701608:233100:259000:10,11701635:13500:15000:10,11701652:1500:1700:12,12195671:3600:4000:10,12195672:3060:3400:10,12195793:270:300:10,12195795:4000:5000:20,12195862:8640:9600:10,12195891:2880:3600:20,12:3200:3600:11,13:19800:22000:10,14:1600:1800:11,23:180:200:10,28:650:750:13,29:76500:85000:10'
    + ',58:6000:6500:8,60:1600:2000:20,108:560:700:20,135:14500:17000:15,137:3200:4000:20,174:2000:2500:20,178:2900:3800:24,179:2900:3800:24,181:2900:3800:24,190:7500:8000:6,195:2600:3300:21,196:88000:100000:12,206:1600:2000:20,211:2000:2500:20,226:1600:2000:20,228:2000:2500:20,229:1600:2000:20,232:16000:17000:6,243:2000:2500:20,264:2000:2500:20,269:800:1000:20,276:4800:5000:4,301:8800:9800:10,343:4400:5500:20,356:350:400:12'
    + ',365:1800:2200:18,400:16200:18000:10,414:2100:2600:19,415:2000:2500:20,422:9600:12000:20,424:4700:5700:18,428:3400:4000:15,603:5400:6000:10,657:2800:3500:20,670:3400:4000:15,673:2700:3000:10,690:800:1000:20,708:4000:5000:20,712:5400:6000:10,713:5400:6000:10,714:5400:6000:10,715:5400:6000:10,720:2900:3800:24,723:1600:2000:20,751:4000:5000:20,755:7200:9000:20,760:5600:7000:20,763:1600:2000:20,771:10400:13000:20,792:3200:4000:20'
    + ',802:2900:3800:24,844:8000:10000:20,881:2800:3500:20,894:350:400:12,895:350:400:12,897:400:500:20,911:480:550:13,941:4050:4500:10,990:5400:6800:21,1019:4100:4800:15,1020:4100:4800:15,1040:6400:8000:20,1045:1800:2200:18,1046:1800:2200:18,1138:2400:3000:20,1246:480:600:20,1247:480:600:20,1314:4000:5000:20,1316:4700:5800:19,1355:4800:5800:17,1356:4800:5800:17,1363:5200:6000:13,1527:7200:9000:20,1531:7200:9000:20,1554:2400:3000:20'
    + ',1595:5800:6500:11,1769:2400:2800:14,1819:2800:3500:20,1821:4800:6000:20,1822:2400:3000:20,1824:7200:9000:20,1825:5600:7000:20,1826:7200:9000:20,1827:5600:7000:20,1828:8800:11000:20,1830:9600:12000:20,1831:5600:7000:20,1832:7200:9000:20,1834:7200:9000:20,1838:7200:9000:20,1839:5600:7000:20,1840:6400:7500:15,1841:6400:7500:15,1842:6400:7500:15,1843:6400:7500:15,1845:2800:3500:20,1872:7200:8000:10,1876:7200:9000:20,1928:2900:3600:19,1939:4800:6000:20'
    + ',1946:2400:3000:20,1954:3200:4000:20,1956:3200:4000:20,1959:6800:8000:15,1985:5600:7000:20,2938:1250:1600:22,2953:1200:1400:14,2959:480:600:20,3058:12000:15000:20,4004:1080:1200:10,4005:1080:1200:10,4932:8100:9000:10,5020:4000:5000:20,5022:2400:3000:20,5079:3800:4400:14,5081:2400:3000:20,5082:3400:4000:15,5084:3600:4200:14,5086:5200:6500:20,5087:2800:3500:20,5088:3400:4000:15,5089:4800:6000:20,5090:2800:3500:20,5091:3200:4000:20,5095:6400:8000:20'
    + ',5263:540000:550000:2,5300:8000:10000:20,5302:12000:13000:8,5339:2800:3500:20,5359:2400:3000:20,5362:1200:1600:25,5364:1200:1600:25,5405:22000:24000:8,5550:1000:1300:23,5638:4500:5000:10,5982:60000:66500:10,6055:2400:2800:14,6091:11000:13000:15,6129:8000:9500:16,6139:16000:20000:20,6235:2700:3000:10,6414:9500:12000:21,6416:9500:12000:21,6421:5600:7000:20,6422:9500:12000:21,6424:9500:12000:21,6425:10000:14000:29,6426:8000:10000:20,6429:5600:7000:20,6430:7200:9000:20'
    + ',6477:2000:2500:20,6556:29000:37000:22,6557:29000:37000:22,6580:75000:80000:6,6597:10000:13000:23,6600:10000:13000:23,6608:9000:12000:25,6609:10000:13000:23,6619:8000:10000:20,6626:1400:1800:22,6628:4000:5000:20,6629:4000:5000:20,6688:1800:2200:18,6689:1800:2200:18,6808:28000:30000:7,7096:24000:26500:9,7097:24000:27000:11,7099:27000:30000:10,7174:58000:77000:25,111457:1000:1300:23,123526:2400:3000:20,129679:7200:9000:20,129681:7200:9000:20,129695:7200:9000:20,133353:35150:37000:5'
    + ',133356:8550:9000:5,133357:38000:40000:5,133359:7200:7600:5,134492:12000:13000:8,134497:12000:13000:8,134499:12000:13000:8,148376:42000:56000:25,148377:58000:77000:25,163380:18400:23000:20,170258:2200:2800:21,170259:2200:2800:21,170666:2400:3000:20,175351:6300:7000:10,175352:6300:7000:10,175353:4600:5000:8,179329:42000:56000:25,182651:320:400:20,184886:4000:5000:20,184887:4000:5000:20,185129:3200:4000:20,185133:2800:3500:20,185135:2400:3000:20,188165:170000:180000:6,188173:1700:2200:23,198369:2900:3600:19'
    + ',201602:800:1000:20,201605:800:1000:20,201615:4800:6000:20,201617:5400:6000:10,203252:4000:5000:20,203923:14400:18000:20,209598:4000:4500:11,209599:4000:4500:11,209600:4000:4500:11,209601:4000:4500:11,209602:4000:4500:11,209603:4000:4500:11,209604:4000:4500:11,209605:4000:4500:11,209614:2000:2500:20,210365:5600:7000:20,210371:7200:9000:20,210389:6000:7000:14,210394:60000:63000:5,210395:60000:63000:5,210404:22000:23000:4,210408:1900:2400:21,217326:28000:30500:8,217327:28000:30500:8,218797:4000:4500:11'
    + ',218799:5300:6000:12,231490:3100:3500:11,234392:4000:5000:20,234393:4000:5000:20,234394:5600:7000:20,234395:5600:7000:20,241753:4000:4500:11,241761:4000:4500:11,241778:4000:4500:11,241782:4000:4500:11,241785:4000:4500:11,241788:4000:4500:11,241791:4000:4500:11,251123:4000:4500:11,251135:12000:15000:20,251137:9000:10500:14,251139:12000:15000:20,252565:180:200:10,253539:2000:2500:20,253585:4000:4500:11,253586:4000:4500:11,253587:4000:4500:11,253801:12000:15000:20,255069:12800:16000:20,265279:2200:2800:21'
    + ',291049:19200:24000:20,291056:19200:24000:20,291060:31500:35000:10,295949:18400:23000:20,297628:4800:6000:20,300262:5600:7000:20,300264:3600:4500:20,300265:3600:4500:20,300267:3600:4500:20,300268:3600:4500:20,300283:4000:4500:11,300284:4000:4500:11,300285:4000:4500:11,300286:4000:4500:11,300751:32000:35000:9,301178:11000:13000:15,301708:2800:3500:20,301776:15600:17400:10,301965:4000:4500:11,301967:4000:4500:11,302006:2400:3000:20,302495:2700:3000:10,302499:70000:75000:7,302963:7200:9000:20,304944:4000:4500:11'
    + ',304945:4000:4500:11,304946:4000:4500:11,305182:90000:100000:10,305459:19200:24000:20,306700:8000:10000:20,306720:54000:60000:10,306753:5400:6000:10,306846:2400:3000:20,307693:1760:2200:20,307694:800:1000:20,307776:400:500:20,307800:2400:3000:20,307803:2400:3000:20,307808:2400:3000:20,307809:2400:3000:20,307812:2400:3000:20,307821:1800:2300:22,307945:5600:7000:20,307946:8000:10000:20,307947:8000:10000:20,307949:8000:10000:20,307950:8000:10000:20,307951:10400:13000:20,307952:10400:13000:20,307953:6400:8000:20'
    + ',308876:10400:13000:20,308878:10400:13000:20,308879:4400:5500:20,308880:4400:5500:20,309013:1200:1500:20,309014:1600:2000:20,309016:34000:38000:11,309017:34000:38000:11,309018:34000:38000:11,309025:10400:13000:20,309260:3200:4000:20,309261:3200:4000:20,311884:1900:2400:21,311934:8800:11000:20,311936:8800:11000:20,312086:19200:24000:20,315589:23000:26000:12,320556:5400:6000:10,331369:2400:3000:20,331665:25600:32000:20,333313:4050:4500:10,333650:28000:30000:7,333651:27000:30000:10,333652:28000:35000:20,335055:13500:15000:10'
    + ',335174:11000:13000:15,335551:3600:4500:20,335712:24300:25600:5,335717:19800:20800:5,335720:2800:4000:30,335722:2800:4000:30,335730:27000:30000:10,335731:33000:35000:6,335732:22000:26000:15,335738:24000:28000:14,335739:24000:28000:14,335853:4900:7000:30,335896:2700:3000:10,335897:6300:7000:10,335936:2000:2500:20,335963:30400:32000:5,335967:25800:27200:5,335968:25800:27200:5,336063:1600:2000:20,336065:1600:2000:20,336066:1600:2000:20,337131:25800:27200:5,337547:2800:3500:20,337702:2800:3500:20,337810:3600:4500:20'
    + ',337811:3600:4500:20,337857:8000:10000:20,337878:6800:8500:20,337879:640:800:20,337900:6800:8500:20,338013:18900:27000:30,338018:480:600:20,338041:1600:2000:20,338043:1600:2000:20,338044:1600:2000:20,338100:21910:31300:30,338101:21910:31300:30,338129:21910:31300:30,338131:29400:42000:30,338662:2400:3000:20,338859:4800:6000:20,339140:9500:12000:21,339572:4800:6000:20,339600:4000:4500:11,339698:14000:14500:3,339702:19000:21000:10,339704:19000:21000:10,339792:2700:3000:10,339913:16000:17000:6,339914:16000:17000:6'
    + ',339915:16000:17000:6,339916:16000:17000:6,339918:16000:17000:6,339919:16000:17000:6,339920:16000:17000:6,339921:16000:17000:6,339922:16000:17000:6,339923:16000:17000:6,339926:16000:17000:6,339927:16000:17000:6,339928:16000:17000:6,339930:16000:17000:6,339931:16000:17000:6,339933:16000:17000:6,339934:16000:17000:6,339935:16000:17000:6,340024:16000:17000:6,340107:1200:1500:20,340538:11000:13000:15,340684:12000:15000:20,340685:12000:15000:20,340852:5000:6000:17,340853:5000:6000:17,340854:4000:5000:20,340862:7000:10000:30'
    + ',341113:7900:8800:10,341115:12100:13500:10,341304:17000:20000:15,341323:18600:19600:5,341326:18600:19600:5,341327:18600:19600:5,341329:18600:19600:5,341330:18600:19600:5,341628:44000:55000:20,342328:23200:29000:20,342329:23200:29000:20,342330:23200:29000:20,342331:23200:29000:20,342337:10000:12500:20,342338:10000:12500:20,342339:10000:12500:20,342340:10000:12500:20,342341:10000:12500:20,342342:10000:12500:20,342343:10000:12500:20,342375:16000:17000:6,342376:16000:17000:6,342377:16000:17000:6,342932:4000:4500:11,343481:32300:34000:5'
    + ',343488:32300:34000:5,343489:32300:34000:5,343490:32300:34000:5,343491:32300:34000:5,344073:5500:6000:8,344074:5500:6000:8,344075:5000:5500:9,344076:5000:5500:9,344077:5000:5500:9,344078:5000:5500:9,345504:2000:2500:20,346753:320:400:20,347105:320:400:20,347595:1840:2300:20,347630:2400:3000:20,347632:10000:12500:20,347633:10000:12500:20,347634:10000:12500:20,347635:10000:12500:20,347636:10000:12500:20,347660:10000:12500:20,347677:63000:90000:30,347860:24000:26000:8,348659:7700:11000:30,348662:4200:6000:30'
    + ',348665:4900:7000:30,348666:6300:9000:30,348669:5950:8500:30,348821:16100:17900:10,348822:16100:17900:10,348823:16100:17900:10,348824:16000:20000:20,349856:70000:75000:7,350893:2400:3000:20,350897:400:500:20,351394:3200:4000:20,351396:2400:3000:20,351900:800:1000:20,351902:6400:8000:20,351977:5600:7000:20,352361:6400:8000:20,352366:3600:4500:20,353149:4800:6000:20,353155:5850:6500:10,353594:6900:8000:14,353697:8100:9000:10,353698:8100:9000:10,353701:8100:9000:10,353712:9000:10000:10,353713:7200:9000:20'
    + ',353718:7200:9000:20,353751:8100:9000:10,353754:8100:9000:10,353755:8100:9000:10,353805:67500:75000:10,353881:10350:11500:10,353905:10350:11500:10,353906:10350:11500:10,353919:10350:11500:10,353922:10350:11500:10,353923:10350:11500:10,353925:10350:11500:10,353930:12200:12900:5,353931:12510:13900:10,354067:11400:12000:5,354070:14250:15000:5,354076:15200:16000:5,354080:14250:15000:5,354162:1600:1800:11,354163:19800:22000:10,354164:3200:3600:11,354514:5600:7000:20,354607:2400:3000:20,354612:8000:10000:20,354614:4000:5000:20'
    + ',354787:400:500:20,354790:320:400:20,354793:320:400:20,354796:480:600:20,354799:320:400:20,354807:320:400:20,354877:800:1000:20,354880:240:300:20,354883:320:400:20,354886:240:300:20,354928:160:200:20,354931:240:300:20,355009:480:600:20,355012:240:300:20,355015:400:500:20,355020:480:600:20,355024:1600:2000:20,355028:160:200:20,355053:240:300:20,355056:480:600:20,355059:320:400:20,355062:320:400:20,355078:320:400:20,355081:400:500:20,355208:960:1200:20'
    + ',355209:960:1200:20,355210:960:1200:20,355211:960:1200:20,355212:960:1200:20,355213:960:1200:20,355214:960:1200:20,355215:960:1200:20,355216:960:1200:20,355217:960:1200:20,355218:960:1200:20,355220:960:1200:20,355222:960:1200:20,355223:960:1200:20,355224:960:1200:20,355225:960:1200:20,355226:960:1200:20,355227:960:1200:20,355228:960:1200:20,355229:960:1200:20,355479:20000:23000:13,355559:4000:4500:11,355814:400:500:20,355815:400:500:20,355816:400:500:20,355817:800:1000:20'
    + ',355818:800:1000:20,355819:800:1000:20,355820:2400:3000:20,355822:2400:3000:20,355834:2400:3000:20,356288:24000:30000:20,356290:12800:16000:20,356294:14400:18000:20,356295:24000:30000:20,356490:2400:3000:20,356491:2400:3000:20,356492:1600:2000:20,356501:1200:1500:20,356503:1200:1500:20,356505:560:700:20,356508:2000:2500:20,356509:1600:2000:20,356551:27000:28000:4,356553:27000:28000:4,356668:6900:8000:14,356673:6900:8000:14,356803:2000:2500:20,356804:2400:3000:20,356807:4300:5200:17,356808:6300:7700:18'
    + ',357012:14000:14500:3,357501:1200:1500:20,357502:2400:3000:20,357503:2400:3000:20,357504:2400:3000:20,357505:4000:5000:20,357506:1200:1500:20,357507:3200:4000:20,357508:900:1000:10,357509:1400:1500:7,357521:1200:1500:20,357525:1200:1500:20,357526:1200:1500:20,357527:1200:1500:20,357528:1200:1500:20,357529:1200:1500:20,357530:1200:1500:20,357531:1200:1500:20,357544:4000:5000:20,358575:40500:45000:10,358576:44500:50000:11,359106:32000:35000:9,359108:27000:30000:10,359111:27000:30000:10,359150:4500:5000:10'
    + ',359459:7200:8000:10,359556:6750:7500:10,359562:32000:33000:3,359649:800:1000:20,359650:960:1200:20,359651:960:1200:20,359963:560:700:20,359968:320:400:20,360175:4000:5000:20,360176:3200:4000:20,360180:5600:7000:20,360182:5600:7000:20,360183:5600:7000:20,360226:4000:5000:20,360281:2400:3000:20,360286:1600:2000:20,360287:2000:2500:20,360301:13000:14000:7,361526:6400:8000:20,361528:31000:35000:11,361532:36000:39000:8,361560:11200:14000:20,361565:11200:14000:20,361826:3300:3500:6,361827:3300:3500:6'
    + ',361842:14400:18000:20,361843:14400:18000:20,361844:14400:18000:20,361895:2400:3000:20,361952:1450:1600:9,362078:4800:6000:20,362083:3200:4000:20,362609:36000:39000:8,362610:31000:35000:11,362999:400:500:20,363012:1400:1600:12,363034:1600:1800:11,363035:1700:1900:11,363037:1300:1450:10,363170:8000:9000:11,363172:8000:9000:11,363178:8000:9000:11,363179:8000:9000:11,363216:9000:10000:10,363217:9000:10000:10,363616:8000:9000:11,363618:8000:9000:11,363621:3200:4000:20,363622:3200:4000:20,363623:1200:1500:20'
    + ',363624:1200:1500:20,363625:1200:1500:20,363626:3200:4000:20,363627:3200:4000:20,363684:2400:3000:20,363685:2400:3000:20,363695:800:1000:20,364573:1500:1600:6,364688:3200:4000:20,364690:3200:4000:20,364693:4800:6000:20,364695:4800:6000:20,364696:4000:5000:20,364698:4000:5000:20,364736:2700:3200:16,364737:11000:12000:8,364742:11000:12000:8,364872:15500:16000:3,364902:1600:1800:11,364903:800:1000:20,364915:320:400:20,364916:3200:4000:20,364925:2400:3000:20,364926:1200:1500:20,365020:1200:1500:20'
    + ',365031:1200:1500:20,365042:1450:1600:9,365180:4860:5400:10,365181:4860:5400:10,365182:4860:5400:10,365187:4860:5400:10,365190:5400:6000:10,365191:5400:6000:10,365288:14000:16000:12,365362:3000:3500:14,365367:4000:4500:11,365523:4300:4700:9,365524:3600:3900:8,365525:3600:3900:8,368016:2400:3000:20,368237:400:500:20,368242:2300:2600:12,368243:4500:5000:10,368467:9500:10000:5,368470:6500:7000:7,368476:2300:2500:8,368509:6300:7000:10,368515:11700:13000:10,368516:2250:2500:10,369025:2000:2200:9'
    + ',369210:4800:6000:20,369299:640:800:20,369300:640:800:20,369301:640:800:20,369902:30600:34000:10,370304:800:1000:20,370305:1200:1500:20,370306:1200:1500:20,370307:1200:1500:20,370308:2400:3000:20,370310:2400:3000:20,370573:6300:7000:10,370574:6300:7000:10,370577:6300:7000:10,370578:6300:7000:10,370869:30400:38000:20,370872:35100:43700:20,370882:49600:62000:20,370886:55100:68700:20,370927:640:800:20,370932:800:1000:20,370944:3500:4000:12,371170:3600:4000:10,371171:3300:3600:8,371345:4800:6000:20'
    + ',372180:6800:8000:15,372423:20000:22000:9,372427:20000:22000:9,372428:20000:22000:9,372432:20000:22000:9,372454:20000:22000:9,372457:20000:22000:9,372839:28000:35000:20,373123:2700:2800:4,373124:2700:2800:4,373125:2700:2800:4,373127:2700:2800:4,373128:2700:2800:4,373129:2700:2800:4,373130:2700:2800:4,373132:23300:24500:5,373133:23300:24500:5,373134:23300:24500:5,373136:23300:24500:5,373137:23300:24500:5,373138:23300:24500:5,373139:23300:24500:5,374039:2200:2500:12,374179:2200:2500:12,374180:4000:4200:5'
    + ',374219:2800:3500:20,374425:2800:3500:20,374657:4500:5000:10,374685:4500:5000:10,374686:4500:5000:10,374726:1600:2000:20,375198:450:500:10,375272:720:900:20,375273:720:900:20,375275:720:900:20,375276:720:900:20,375278:720:900:20,375436:2800:3100:10,375470:18000:20000:10,1150903:200:250:20,1150908:180:200:10,1150909:104:130:20,1150918:11000:12000:8,1150924:3600:4000:10,1150984:32000:35000:9,1150989:480:600:20,1151002:27000:30000:10,1151040:5400:6000:10,1151041:5400:6000:10,1151059:4500:5000:10'
    + ',1151060:2400:3000:20,1151061:4000:4500:11,1151062:4000:5000:20,1151063:4000:5000:20,1151064:4000:5000:20,1151099:4000:5000:20,1151100:4000:5000:20,1151101:4000:5000:20,1151245:2800:3500:20,1151246:2800:3500:20,1151248:2800:3500:20,1151272:4000:5000:20,1151273:4000:5000:20,1151274:4000:5000:20,1151282:2800:3500:20,1151283:2800:3500:20,1151443:14400:18000:20,1151444:14400:18000:20,1151659:5300:5600:5,1151664:24300:25900:6,1151665:24300:25900:6,1151752:9600:12000:20,1151753:10400:13000:20,1151754:17600:22000:20,1151756:27000:30000:10'
    + ',1151805:70000:75000:7,1151854:4000:5000:20,1151918:2400:3000:20,1151919:90000:100000:10,1151920:4000:5000:20,1151926:126000:140000:10,1151937:70000:75000:7,1152021:8600:9600:10,1152022:8600:9600:10,1152044:8100:9000:10,1152045:8100:9000:10,1152046:8100:9000:10,1152047:8100:9000:10,1152048:8100:9000:10,1152049:8100:9000:10,1152050:8100:9000:10,1152051:8100:9000:10,1152052:8100:9000:10,1152053:8100:9000:10,1152170:4500:5000:10,1152171:4500:5000:10,1152345:3500:5000:30,1152386:8000:10000:20,1152440:11400:12000:5,1152442:11400:12000:5'
    + ',1152443:11400:12000:5,1152445:11400:12000:5,1152446:11400:12000:5,1152447:11400:12000:5,1152448:11400:12000:5,1152449:11400:12000:5,1152450:11400:12000:5,1152451:11400:12000:5,1152452:11400:12000:5,1152453:11400:12000:5,1152454:11400:12000:5,1152455:11400:12000:5,1152456:11400:12000:5,1152457:11400:12000:5,1152458:11400:12000:5,1152464:4700:5500:15,1152465:4700:5500:15,1152467:4700:5500:15,1152468:4700:5500:15,1152469:4700:5500:15,1152470:4700:5500:15,1152474:4700:5500:15,1152475:4700:5500:15,1152476:4700:5500:15,1152477:4700:5500:15'
    + ',1152482:4700:5500:15,1152487:4700:5500:15,1152488:4700:5500:15,1152490:7200:9000:20,1152491:7200:9000:20,1152492:7200:9000:20,1152493:7200:9000:20,1152494:7200:9000:20,1152495:7200:9000:20,1152497:7200:9000:20,1152498:7200:9000:20,1152499:7200:9000:20,1152500:7200:9000:20,1152501:7200:9000:20,1152502:7200:9000:20,1152506:7200:9000:20,1152509:7200:9000:20,1152511:7200:9000:20,1152512:7200:9000:20,1152513:7200:9000:20,1152514:7200:9000:20,1152516:7200:9000:20,1152517:7200:9000:20,1152518:7200:9000:20,1152519:7200:9000:20'
    + ',1152520:7200:9000:20,1152521:7200:9000:20,1152522:7200:9000:20,1152525:7200:9000:20,1152526:7200:9000:20,1152528:7200:9000:20,1152530:7200:9000:20,1152531:7200:9000:20,1152532:7200:9000:20,1152533:7200:9000:20,1152534:7200:9000:20,1152535:7200:9000:20,1152537:7200:9000:20,1152538:7200:9000:20,1152539:7200:9000:20,1152540:7200:9000:20,1152544:1400:1500:7,1152552:800:1000:20,1152553:800:1000:20,1152557:1350:1500:10,1152683:4800:6000:20,1152888:10000:11000:9,1152903:4000:5000:20,1152918:5950:7000:15,1152920:400:500:20'
    + ',1152921:5940:6600:10,1152956:1200:1500:20,1152960:320:400:20,1152987:89250:105000:15,1152988:4600:5000:8,1153136:10400:13000:20,1153276:1850:2100:12,1153280:2400:2700:11,1153287:2600:2900:10,1153288:2750:3100:11,1153295:4400:4900:10,1153297:4400:4900:10,1153419:4000:5000:20,1153543:1600:2000:20,1153546:1200:1500:20,1153628:3600:4000:10,1153632:3600:4000:10,1153634:3600:4000:10,1153637:3600:4000:10,1153640:3600:4000:10,1153643:3600:4000:10,1153646:3600:4000:10,1153652:3600:4000:10,1153655:3600:4000:10,1153658:3600:4000:10'
    + ',1153676:8100:9000:10,1153679:9500:12000:21,1153690:2700:3000:10,1153703:3600:4000:10,1153872:1900:2100:10,1153896:810:900:10,1153907:6400:8000:20,1153915:900:1000:10,1154005:58000:61000:5,1154013:5700:6000:5,1154016:4750:5000:5,1154019:4750:5000:5,1154022:4750:5000:5,1154031:5700:6000:5,1154034:5700:6000:5,1154056:2850:3000:5,1154061:2850:3000:5,1154068:2850:3000:5,1154085:1900:2000:5,1154088:1900:2000:5,1154092:1900:2000:5,1154097:1800:1900:5,1154100:760:800:5,1154103:8550:9000:5,1154109:8550:9000:5'
    + ',1154150:3600:3900:8,1154152:3900:4300:9,1154154:3900:4300:9,1154163:2880:3200:10,1154166:2700:3000:10,1154169:2340:2600:10,1154171:2340:2600:10,1154174:1300:1450:10,1154176:1400:1600:12,1154178:1600:1800:11,1154180:1600:1800:11,1154186:2100:2300:9,1154188:1700:1900:11,1154195:2000:2200:9,1154197:1800:2000:10,1154199:1700:1900:11,1154201:2300:2600:12,1154203:1800:2000:10,1154267:3600:3800:5,1154270:9300:10300:10,1154278:2400:3000:20,1154279:3200:4000:20,1154283:2400:3000:20,1154285:2400:3000:20,1154287:2400:3000:20'
    + ',1154314:9000:10000:10,1154318:3600:3800:5,1154322:4000:4200:5,1154325:4000:4200:5,1154340:2700:3000:10,1154361:2250:2500:10,1154378:77000:81000:5,1154381:5400:6000:10,1154412:5700:6300:10,1154419:3400:3800:11,1154427:8500:9000:6,1154433:8500:9000:6,1154450:10450:11000:5,1154453:8450:8900:5,1154456:8450:8900:5,1154497:2700:3000:10,1154498:2700:3000:10,1154500:1800:2000:10,1154503:1800:2000:10,1154506:1800:2000:10,1154515:4500:5000:10,1154519:3600:4000:10,1154617:3600:4000:10,1154619:3300:3700:11,1154623:3600:4000:10'
    + ',1154625:3900:4400:11,1154688:3600:4000:10,1154731:1800:2000:10,1154776:4900:5500:11,1154785:4900:5500:11,1154837:8100:9000:10,1154873:3900:4300:9,1154877:4100:4500:9,1154889:4500:5000:10,1154891:4900:5400:9,1154893:4700:5200:10,1154895:4950:5500:10,1154914:5400:6000:10,1155005:3800:4200:10,1155009:3800:4200:10,1155013:4900:5500:11,1155015:3700:4200:12,1155033:4050:4500:10,1155036:4860:5400:10,1155045:3600:4000:10,1155048:3600:4000:10,1155071:4100:4600:11,1155144:4400:5500:20,1155147:4050:4500:10,1155165:5400:6000:10'
    + ',1155211:7200:8000:10,1155242:320:400:20,1155244:320:400:20,1155246:320:400:20,1155248:320:400:20,1155251:17100:19000:10,1155253:17100:19000:10,1155256:17100:19000:10,1155258:15300:17000:10,1155292:9000:10000:10,1155453:6300:7000:10,1155462:6300:7000:10,1155465:6300:7000:10,1155474:6300:7000:10,1155514:4300:4800:10,1155516:16200:18000:10,1155520:4300:4800:10,1155531:2200:2500:12,1155534:2200:2500:12,1155556:6500:7200:10,1155557:8100:9000:10,1155559:8900:9900:10,1155560:8900:9900:10,1155561:9800:10800:9,1155583:68200:75800:10'
    + ',1155592:3800:4000:5,1155613:20500:22800:10,1155617:2700:3000:10,1155623:10800:12000:10,1155626:3800:4000:5,1155627:10800:12000:10,1155628:10800:12000:10,1155704:7200:8000:10,1155711:39000:41000:5,1155713:48500:50000:3,1155721:8000:10000:20,1155738:560:700:20,1155739:560:700:20,1155746:900:1000:10,1155862:4500:5000:10,1155864:3150:3500:10,1155890:11500:12800:10,1155900:2400:3000:20,1155930:47500:50000:5,1155932:76900:81000:5,1156014:3600:4000:10,1156017:3600:4000:10,1156023:2700:3000:10,1156025:3600:4000:10,1156027:3600:4000:10'
    + ',1156029:3600:4000:10,1156031:3600:4000:10,1156035:3600:4000:10,1156041:3600:4000:10,1156043:3600:4000:10,1156047:3600:4000:10,1156050:3600:4000:10,1156056:3600:4000:10,1156058:3600:4000:10,1156062:3600:4000:10,1156064:3600:4000:10,1156069:3600:4000:10,1156071:3600:4000:10,1156081:3600:4000:10,1156083:3600:4000:10,1156085:3600:4000:10,1156131:4050:4500:10,1156133:4050:4500:10,1156135:4050:4500:10,1156139:4050:4500:10,1156141:4050:4500:10,1156143:4050:4500:10,1156147:4050:4500:10,1156149:4050:4500:10,1156216:4050:4500:10'
    + ',1156218:4050:4500:10,1156220:4050:4500:10,1156233:2700:3000:10,1156234:3600:4000:10,1156236:3600:4000:10,1156238:3600:4000:10,1156242:6900:7700:10,1156267:7200:8000:10,1156278:10800:12000:10,1156290:27000:30000:10,1156293:6000:7000:14,1156297:9000:10000:10,1156319:900:1000:10,1156321:5400:6000:10,1156511:3400:3800:11,1156513:3500:3900:10,1156645:20700:23000:10,1156646:20700:23000:10,1156648:9000:10000:10,1156649:9000:10000:10,1156653:1500:2000:25,1156655:1500:2000:25,1156661:1500:2000:25,1156665:4500:5000:10,1156667:800:1000:20'
    + ',1156669:800:1000:20,1156675:800:1000:20,1156681:20700:23000:10,1156692:12000:13000:8,1156694:12000:13000:8,1156712:9900:11000:10,1156723:1350:1500:10,1156768:22500:25000:10,1156811:4000:4400:9,11697315:2700:3000:10,11701277:4050:4500:10,727:4950:5500:10,340120:5850:6500:10,343528:30600:34000:10,353801:40500:45000:10,373379:981:1090:10,1156724:13950:15500:10,11697166:9000:10000:10,11697552:4000:5000:20,11698113:4800:6000:20,11698626:3000:3400:12,11699159:5850:6500:10,11699498:6750:7500:10,11699629:13500:15000:10,11699954:4500:5000:10'
    + ',11700491:4050:4500:10';

    var PC21_MAIN_MEMBER_PRICE_OVERRIDES = {
                    "12195891": {
                                    "member": 2880,
                                    "base": 3600,
                                    "rate": 20
                    },
                    "373379": {
                                    "member": 981,
                                    "base": 1090,
                                    "rate": 10
                    },
                    "12195862": {
                                    "member": 8640,
                                    "base": 9600,
                                    "rate": 10
                    },
                    "11687103": {
                                    "member": 5400,
                                    "base": 6000,
                                    "rate": 10
                    },
                    "343528": {
                                    "member": 30600,
                                    "base": 34000,
                                    "rate": 10
                    },
                    "12195795": {
                                    "member": 4000,
                                    "base": 5000,
                                    "rate": 20
                    },
                    "12195793": {
                                    "member": 270,
                                    "base": 300,
                                    "rate": 10
                    },
                    "365362": {
                                    "member": 3150,
                                    "base": 3500,
                                    "rate": 10
                    },
                    "11700206": {
                                    "member": 1800,
                                    "base": 2000,
                                    "rate": 10
                    },
                    "11701355": {
                                    "member": 5400,
                                    "base": 6000,
                                    "rate": 10
                    },
                    "11700641": {
                                    "member": 3600,
                                    "base": 4000,
                                    "rate": 10
                    },
                    "370886": {
                                    "member": 54960,
                                    "base": 68700,
                                    "rate": 20
                    },
                    "370872": {
                                    "member": 34960,
                                    "base": 43700,
                                    "rate": 20
                    },
                    "11699386": {
                                    "member": 1710,
                                    "base": 1900,
                                    "rate": 10
                    },
                    "11699228": {
                                    "member": 5400,
                                    "base": 6000,
                                    "rate": 10
                    },
                    "11678267": {
                                    "member": 1530,
                                    "base": 1700,
                                    "rate": 10
                    },
                    "1156724": {
                                    "member": 13950,
                                    "base": 15500,
                                    "rate": 10
                    },
                    "353801": {
                                    "member": 40500,
                                    "base": 45000,
                                    "rate": 10
                    },
                    "353805": {
                                    "member": 67500,
                                    "base": 75000,
                                    "rate": 10
                    },
                    "6477": {
                                    "member": 2000,
                                    "base": 2500,
                                    "rate": 20
                    },
                    "185133": {
                                    "member": 2800,
                                    "base": 3500,
                                    "rate": 20
                    },
                    "727": {
                                    "member": 4950,
                                    "base": 5500,
                                    "rate": 10
                    },
                    "1156321": {
                                    "member": 5400,
                                    "base": 6000,
                                    "rate": 10
                    },
                    "11701484": {
                                    "member": 9000,
                                    "base": 10000,
                                    "rate": 10
                    },
                    "11701481": {
                                    "member": 3600,
                                    "base": 4000,
                                    "rate": 10
                    },
                    "11701480": {
                                    "member": 3600,
                                    "base": 4000,
                                    "rate": 10
                    },
                    "11701479": {
                                    "member": 1800,
                                    "base": 2000,
                                    "rate": 10
                    },
                    "11701478": {
                                    "member": 4500,
                                    "base": 5000,
                                    "rate": 10
                    },
                    "11701475": {
                                    "member": 3960,
                                    "base": 4400,
                                    "rate": 10
                    },
                    "11699110": {
                                    "member": 54000,
                                    "base": 60000,
                                    "rate": 10
                    },
                    "11699046": {
                                    "member": 2700,
                                    "base": 3000,
                                    "rate": 10
                    },
                    "11699044": {
                                    "member": 4950,
                                    "base": 5500,
                                    "rate": 10
                    },
                    "11699042": {
                                    "member": 3510,
                                    "base": 3900,
                                    "rate": 10
                    },
                    "11697091": {
                                    "member": 2520,
                                    "base": 2800,
                                    "rate": 10
                    },
                    "11618350": {
                                    "member": 13500,
                                    "base": 15000,
                                    "rate": 10
                    },
                    "11699261": {
                                    "member": 1080,
                                    "base": 1200,
                                    "rate": 10
                    },
                    "11697785": {
                                    "member": 2250,
                                    "base": 2500,
                                    "rate": 10
                    },
                    "11699656": {
                                    "member": 450,
                                    "base": 500,
                                    "rate": 10
                    },
                    "1154150": {
                                    "member": 3510,
                                    "base": 3900,
                                    "rate": 10
                    },
                    "1153915": {
                                    "member": 900,
                                    "base": 1000,
                                    "rate": 10
                    },
                    "11697948": {
                                    "member": 14400,
                                    "base": 16000,
                                    "rate": 10
                    },
                    "340120": {
                                    "member": 5850,
                                    "base": 6500,
                                    "rate": 10
                    },
                    "361952": {
                                    "member": 1450,
                                    "base": 1600,
                                    "rate": 9
                    },
                    "1155165": {
                                    "member": 5400,
                                    "base": 6000,
                                    "rate": 10
                    }
    };

    function pc21BuildMemberPricePolicies(data) {
        var policies = {};
        var rows = String(data || '').split(',');
        var i;
        var parts;
        for (i = 0; i < rows.length; i += 1) {
            parts = rows[i].split(':');
            if (parts.length === 4) {
                policies[parts[0]] = {
                    member: parseInt(parts[1], 10),
                    base: parseInt(parts[2], 10),
                    rate: parseInt(parts[3], 10)
                };
            }
        }
        return policies;
    }

    function pc21MergeMemberPolicies(basePolicies, overridePolicies) {
        var merged = {};
        var key;
        for (key in basePolicies) {
            if (Object.prototype.hasOwnProperty.call(basePolicies, key)) {
                merged[key] = basePolicies[key];
            }
        }
        for (key in overridePolicies) {
            if (Object.prototype.hasOwnProperty.call(overridePolicies, key)) {
                merged[key] = overridePolicies[key];
            }
        }
        return merged;
    }

    var PC21_MAIN_MEMBER_PRICES = pc21MergeMemberPolicies(
        pc21BuildMemberPricePolicies(PC21_SHARED_MEMBER_PRICE_DATA),
        PC21_MAIN_MEMBER_PRICE_OVERRIDES
    );

    function pc21IsInstructorMember() {
        var contextNode = document.getElementById('pc21-main-member-context');
        var groupName;
        if (!contextNode || contextNode.getAttribute('data-login') !== '1') {
            return false;
        }
        groupName = String(contextNode.getAttribute('data-group') || '');
        return groupName.indexOf('강사') !== -1;
    }

    function pc21FormatWon(value) {
        var num = parseInt(value, 10);
        if (!num) {
            return '';
        }
        return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '원';
    }

    function pc21GetBranduid(card) {
        var link = card ? card.querySelector('a[href*="branduid="]') : null;
        var match;
        if (!link) {
            return '';
        }
        match = String(link.getAttribute('href') || '').match(/[?&]branduid=([^&]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    }

    function pc21FindPriceBox(priceRow) {
        var box;
        if (!priceRow) {
            return null;
        }
        box = priceRow.querySelector('.price .item-box');
        if (!box) {
            box = priceRow.querySelector('.price .itme-box');
        }
        if (!box) {
            box = priceRow.querySelector('.price');
        }
        return box;
    }

    function pc21EnsureSpan(box, className, afterNode) {
        var selector = '.' + className;
        var node;
        if (className === 'pc21-ug-discount') {
            selector = '.pc21-ug-discount, .discount';
        }
        node = box ? box.querySelector(selector) : null;
        if (node) {
            if (className === 'pc21-ug-discount' && node.className !== 'pc21-ug-discount') {
                node.className = 'pc21-ug-discount';
            }
            return node;
        }
        node = document.createElement('span');
        node.className = className;
        if (className === 'pc21-ug-discount') {
            node.setAttribute('style', 'display:inline-flex;align-items:center;min-height:22px;padding:2px 7px;border-radius:999px;background:#fff3ed;margin-left:2px;color:#a85b45;font-size:13px;font-weight:800;letter-spacing:-0.02em;line-height:1.2;vertical-align:baseline;');
        }
        if (afterNode && afterNode.parentNode) {
            afterNode.parentNode.insertBefore(node, afterNode.nextSibling);
        } else if (box) {
            box.appendChild(node);
        }
        return node;
    }

    function pc21IsFixedPriceProduct(branduid) {
        return {
            '340120': true,
            '11699812': true,
            '11700622': true,
            '12195909': true,
            '12195910': true,
            '337547': true,
            '337555': true,
            '1153454': true,
            '1153455': true,
            '1153456': true,
            '1153457': true,
            '1153458': true,
            '1153459': true,
            '1153460': true,
            '1153461': true,
            '1153462': true,
            '1153464': true,
            '1153465': true,
            '1153466': true,
            '1153470': true,
            '1153471': true
        }[branduid] === true;
    }

    function pc21ApplyMemberPriceToCard(card) {
        var branduid = pc21GetBranduid(card);
        var policy = PC21_MAIN_MEMBER_PRICES[branduid];
        var priceRow = card ? card.querySelector('.prd-price') : null;
        var box = pc21FindPriceBox(priceRow);
        var normalNode;
        var consumerNode;
        var discountNode;
        var applyKey;

        if (pc21IsFixedPriceProduct(branduid)) {
            normalNode = box ? box.querySelector('.normal') : null;
            consumerNode = box ? box.querySelector('.consumer, .original') : null;
            discountNode = box ? box.querySelector('.pc21-ug-discount, .discount') : null;
            if (policy && policy.base) {
                if (normalNode) {
                    normalNode.textContent = pc21FormatWon(policy.base);
                }
            }
            if (consumerNode && consumerNode.parentNode) {
                consumerNode.parentNode.removeChild(consumerNode);
            }
            if (discountNode && discountNode.parentNode) {
                discountNode.parentNode.removeChild(discountNode);
            }
            priceRow.removeAttribute('data-pc21-member-applied');
            priceRow.removeAttribute('data-pc21-member-source');
            return;
        }
        if (!policy || !priceRow || !box || !policy.member || !policy.base || policy.member >= policy.base) {
            return;
        }
        applyKey = String(policy.member) + '/' + String(policy.base) + '/' + String(policy.rate);
        if (priceRow.getAttribute('data-pc21-member-applied') === applyKey) {
            return;
        }

        normalNode = pc21EnsureSpan(box, 'normal', null);
        consumerNode = pc21EnsureSpan(box, 'consumer', normalNode);
        discountNode = pc21EnsureSpan(box, 'pc21-ug-discount', consumerNode);

        normalNode.textContent = pc21FormatWon(policy.member);
        consumerNode.textContent = pc21FormatWon(policy.base);
        consumerNode.style.display = '';
        discountNode.textContent = String(policy.rate) + '%';
        discountNode.setAttribute('data-sale', String(policy.member));
        discountNode.setAttribute('data-base', String(policy.base));
        priceRow.setAttribute('data-pc21-member-applied', applyKey);
        priceRow.setAttribute('data-pc21-member-source', 'main-policy-map-20260420');
    }

    function pc21ApplyMainMemberPrices(root) {
        var scope = root || document;
        var cards;
        var i;
        if (!pc21IsInstructorMember() || !scope.querySelectorAll) {
            return;
        }
        cards = scope.querySelectorAll('dl.item-list');
        for (i = 0; i < cards.length; i += 1) {
            pc21ApplyMemberPriceToCard(cards[i]);
        }
        if (scope.matches && scope.matches('dl.item-list')) {
            pc21ApplyMemberPriceToCard(scope);
        }
    }

    pc21ApplyMainMemberPrices(document);
    if (window.MutationObserver) {
        var target = document.querySelector('#section02') || document.querySelector('#contents') || document.body;
        var observer = new MutationObserver(function(mutations) {
            var i;
            var j;
            var added;
            for (i = 0; i < mutations.length; i += 1) {
                added = mutations[i].addedNodes;
                for (j = 0; j < added.length; j += 1) {
                    if (added[j].nodeType === 1) {
                        pc21ApplyMainMemberPrices(added[j]);
                    }
                }
            }
            pc21ApplyMainMemberPrices(target);
        });
        observer.observe(target, { childList: true, subtree: true });
    }
})();
