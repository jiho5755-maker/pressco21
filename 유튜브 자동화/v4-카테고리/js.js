/* =============================================
 * YouTube v4 - 카테고리 자동매칭 섹션 JS
 * 메이크샵 D4 메인페이지 JS 편집기용
 *
 * 기능:
 * - GAS 프록시에서 영상 + 키워드 + 상품 통합 JSON fetch
 * - localStorage 24시간 캐싱
 * - autoMatchCategory(): 영상 제목/설명/태그에서 키워드 감지
 * - 긴 키워드 우선 매칭으로 오탐 방지
 * - 매칭 실패 시 'default' 카테고리 전체 인기상품
 * - 메인 영상: 썸네일 클릭 시 iframe 로드 (성능 최적화)
 * - 하단 슬라이더: Swiper CDN
 * - 카테고리 배지, 조회수, NEW 배지
 * - 모바일 토글: 관련 상품 아코디언
 * - XSS 방어: escapeHTML, escapeAttr
 * - 스켈레톤 UI (로딩 중)
 *
 * 메이크샵 주의: 템플릿 리터럴 사용 금지 (문자열 연결만 사용)
 * ============================================= */
(function() {
    'use strict';

    /* ========================================
       설정
       ======================================== */
    var CONFIG = {
        // GAS 프록시 URL (배포 후 실제 URL로 교체)
        gasUrl: 'https://script.google.com/macros/s/YOUR_DEPLOYED_GAS_URL/exec',
        maxVideos: 6,
        cacheDuration: 24 * 60 * 60 * 1000, // 24시간
        cacheKeyData: 'yt_v4_data',
        cacheKeyTime: 'yt_v4_time',
        newVideoDays: 3,
        swiperBreakpoint: 768
    };

    /* ========================================
       상태 변수
       ======================================== */
    var allVideos = [];
    var categoryKeywords = {};
    var categoryProducts = {};
    var currentMainIndex = 0;
    var swiperInstance = null;

    /* ========================================
       DOM 참조
       ======================================== */
    var root = document.getElementById('youtube-v4-section');

    // 섹션이 페이지에 없으면 초기화하지 않음
    if (!root) return;

    /* ========================================
       보안 유틸리티
       ======================================== */

    // HTML 이스케이프 (XSS 방어)
    function escapeHTML(str) {
        if (!str) return '';
        var map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(str).replace(/[&<>"']/g, function(m) {
            return map[m];
        });
    }

    // HTML 속성값 이스케이프
    function escapeAttr(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /* ========================================
       포맷팅 유틸리티
       ======================================== */

    // 조회수 포맷 ("1.5만 조회")
    function formatViewCount(viewCount) {
        var count = parseInt(viewCount);
        if (isNaN(count) || count === 0) return '';
        if (count >= 10000) {
            return (count / 10000).toFixed(1) + '만 조회';
        }
        return count.toLocaleString() + ' 조회';
    }

    // 날짜 포맷 ("3일 전", "2026년 2월 15일")
    function formatDate(dateStr) {
        var date = new Date(dateStr);
        var diff = Math.floor((new Date() - date) / 86400000);
        if (diff === 0) return '오늘';
        if (diff === 1) return '어제';
        if (diff < 7) return diff + '일 전';
        return date.getFullYear() + '년 ' + (date.getMonth() + 1) + '월 ' + date.getDate() + '일';
    }

    // 가격 포맷 ("35,000원")
    function formatPrice(price) {
        var num = parseInt(price);
        if (isNaN(num)) return price;
        return num.toLocaleString() + '원';
    }

    // NEW 배지 여부 (3일 이내)
    function isNewVideo(dateStr) {
        var diff = Math.floor((new Date() - new Date(dateStr)) / 86400000);
        return diff <= CONFIG.newVideoDays;
    }

    /* ========================================
       카테고리 자동매칭
       ======================================== */

    /**
     * 영상 제목/설명/태그에서 카테고리 키워드를 자동 감지
     * 긴 키워드 우선 매칭으로 오탐 방지 (예: "레진공예" > "레진")
     *
     * @param {Object} video - 영상 객체 (title, description, tags)
     * @return {string} 매칭된 카테고리명 또는 'default'
     */
    function autoMatchCategory(video) {
        if (!categoryKeywords || Object.keys(categoryKeywords).length === 0) {
            return 'default';
        }

        // 검색 대상 텍스트 합성 (제목 + 설명 + 태그)
        var text = (
            (video.title || '') + ' ' +
            (video.description || '') + ' ' +
            (video.tags && video.tags.length > 0 ? video.tags.join(' ') : '')
        ).toLowerCase();

        // 긴 키워드 우선 정렬 (오탐 방지)
        var sortedKeywords = Object.keys(categoryKeywords).sort(function(a, b) {
            return b.length - a.length;
        });

        for (var i = 0; i < sortedKeywords.length; i++) {
            var keyword = sortedKeywords[i].toLowerCase();
            if (text.indexOf(keyword) >= 0) {
                return categoryKeywords[sortedKeywords[i]];
            }
        }

        return 'default';
    }

    /**
     * 카테고리에 해당하는 상품 목록 반환
     * 매칭 실패(default)이면 전체 인기상품 반환
     *
     * @param {string} category - 카테고리명
     * @return {Array} 상품 배열
     */
    function getProductsForCategory(category) {
        if (!categoryProducts) return [];

        // 해당 카테고리에 상품이 있으면 반환
        if (category && categoryProducts[category] && categoryProducts[category].length > 0) {
            return categoryProducts[category];
        }

        // 없으면 default 카테고리
        if (categoryProducts['default'] && categoryProducts['default'].length > 0) {
            return categoryProducts['default'];
        }

        return [];
    }

    /* ========================================
       데이터 로딩
       ======================================== */

    function init() {
        showSkeleton();
        loadData();
    }

    function loadData() {
        // localStorage 캐시 확인
        try {
            var cachedData = localStorage.getItem(CONFIG.cacheKeyData);
            var cachedTime = localStorage.getItem(CONFIG.cacheKeyTime);

            if (cachedData && cachedTime) {
                var elapsed = Date.now() - parseInt(cachedTime);
                if (elapsed < CONFIG.cacheDuration) {
                    var parsed = JSON.parse(cachedData);
                    processData(parsed);
                    return;
                }
            }
        } catch (e) {
            // localStorage 접근 불가 시 무시
        }

        // GAS API 호출 (jQuery 사용 - 메이크샵 기본 탑재)
        $.ajax({
            url: CONFIG.gasUrl + '?count=' + CONFIG.maxVideos + '&t=' + Date.now(),
            dataType: 'json',
            cache: false,
            timeout: 15000,
            success: function(data) {
                if (data && data.status === 'success' && data.items && data.items.length > 0) {
                    // localStorage 캐시 저장
                    try {
                        localStorage.setItem(CONFIG.cacheKeyData, JSON.stringify(data));
                        localStorage.setItem(CONFIG.cacheKeyTime, Date.now().toString());
                    } catch (e) {
                        // localStorage 용량 초과 시 무시
                    }
                    processData(data);
                } else {
                    showError();
                }
            },
            error: function() {
                showError();
            }
        });
    }

    function processData(data) {
        allVideos = data.items || [];
        categoryKeywords = data.categoryKeywords || {};
        categoryProducts = data.categoryProducts || {};
        currentMainIndex = 0;

        if (allVideos.length === 0) {
            showError();
            return;
        }

        renderAll();
    }

    /* ========================================
       렌더링
       ======================================== */

    // 슬라이더 클릭 이벤트는 한 번만 바인딩 (이벤트 위임)
    var sliderEventBound = false;

    function renderAll() {
        renderMainVideo();
        renderProducts();
        renderSlider();
    }

    /**
     * 메인 영상 렌더링
     * 초기: 썸네일 + 재생 버튼 (iframe 아직 로드하지 않음)
     * 클릭 시: iframe으로 교체 (성능 최적화)
     */
    function renderMainVideo() {
        var container = root.querySelector('.ytv4-main-video');
        if (!container) return;

        var video = allVideos[currentMainIndex];
        if (!video) return;

        var category = autoMatchCategory(video);
        var thumbUrl = 'https://img.youtube.com/vi/' + escapeAttr(video.id) + '/maxresdefault.jpg';
        var viewCountHtml = formatViewCount(video.viewCount);

        var html = '';

        // 썸네일 래퍼 (클릭 시 iframe 로드)
        html += '<div class="ytv4-thumb-wrap" data-video-id="' + escapeAttr(video.id) + '">';
        html += '<img src="' + escapeAttr(thumbUrl) + '" alt="' + escapeAttr(video.title) + '" loading="lazy">';
        html += '<div class="ytv4-play-btn"></div>';

        // NEW 배지
        if (isNewVideo(video.publishedAt)) {
            html += '<span class="ytv4-badge-new">NEW</span>';
        }

        // 카테고리 배지
        if (category && category !== 'default') {
            html += '<span class="ytv4-badge-category">' + escapeHTML(category) + '</span>';
        }

        html += '</div>';

        // 영상 정보
        html += '<div class="ytv4-video-info">';
        html += '<h4 class="ytv4-video-title">' + escapeHTML(video.title) + '</h4>';
        html += '<div class="ytv4-video-meta">';
        if (viewCountHtml) {
            html += '<span class="ytv4-view-count">' + viewCountHtml + '</span>';
        }
        html += '<span class="ytv4-date">' + formatDate(video.publishedAt) + '</span>';
        html += '</div>';
        html += '</div>';

        container.innerHTML = html;

        // 썸네일 클릭 이벤트
        var thumbWrap = container.querySelector('.ytv4-thumb-wrap');
        if (thumbWrap) {
            thumbWrap.addEventListener('click', function() {
                playMainVideo(this.getAttribute('data-video-id'));
            });
        }
    }

    /**
     * 메인 영상을 iframe으로 교체 (자동재생)
     */
    function playMainVideo(videoId) {
        var container = root.querySelector('.ytv4-main-video');
        if (!container) return;

        var thumbWrap = container.querySelector('.ytv4-thumb-wrap');
        if (!thumbWrap) return;

        // iframe으로 교체
        var iframeWrap = document.createElement('div');
        iframeWrap.className = 'ytv4-iframe-wrap';
        iframeWrap.innerHTML = '<iframe src="https://www.youtube.com/embed/'
            + escapeAttr(videoId)
            + '?rel=0&autoplay=1&modestbranding=1" frameborder="0" allowfullscreen allow="autoplay"></iframe>';

        thumbWrap.parentNode.replaceChild(iframeWrap, thumbWrap);
    }

    /**
     * 관련 상품 패널 렌더링
     * 카테고리 자동매칭 결과에 따른 상품 표시
     */
    function renderProducts() {
        var container = root.querySelector('.ytv4-product-panel');
        if (!container) return;

        var video = allVideos[currentMainIndex];
        if (!video) return;

        var category = autoMatchCategory(video);
        var products = getProductsForCategory(category);
        var isDefault = (category === 'default');
        var panelTitle = isDefault ? '인기 상품' : escapeHTML(category) + ' 추천 재료';

        var html = '';

        // 토글 헤더 (모바일에서만 동작)
        html += '<div class="ytv4-product-toggle">';
        html += '<h5 class="ytv4-product-title">' + panelTitle + '</h5>';
        html += '<span class="ytv4-toggle-icon">&#9660;</span>';
        html += '</div>';

        // 상품 그리드
        html += '<div class="ytv4-product-grid">';

        if (products.length > 0) {
            // 최대 4개 표시
            var maxProducts = Math.min(products.length, 4);
            for (var i = 0; i < maxProducts; i++) {
                var p = products[i];
                var productLink = '/shop/shopdetail.html?branduid=' + escapeAttr(p.branduid);
                var productImage = p.image || 'https://via.placeholder.com/200x200/b7c9ad/fff?text=Product';

                html += '<a href="' + productLink + '" class="ytv4-product-card">';
                html += '<img src="' + escapeAttr(productImage) + '" alt="' + escapeAttr(p.name) + '" loading="lazy">';
                html += '<div class="ytv4-product-name">' + escapeHTML(p.name) + '</div>';
                html += '<div class="ytv4-product-price">' + formatPrice(p.price) + '</div>';
                html += '</a>';
            }
        } else {
            // 상품 없을 때
            html += '<div class="ytv4-no-products">';
            html += '<p>관련 상품이 준비 중입니다</p>';
            html += '</div>';
        }

        html += '</div>';

        container.innerHTML = html;

        // PC에서는 항상 펼침
        if (window.innerWidth >= CONFIG.swiperBreakpoint) {
            container.classList.add('expanded');
            container.classList.remove('collapsed');
        } else {
            container.classList.add('collapsed');
            container.classList.remove('expanded');
        }

        // 토글 이벤트 바인딩
        var toggleBtn = container.querySelector('.ytv4-product-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function() {
                toggleProductPanel();
            });
        }
    }

    /**
     * 하단 슬라이더 렌더링 (Swiper)
     */
    function renderSlider() {
        var wrapper = root.querySelector('.ytv4-slider-wrapper');
        if (!wrapper) return;

        var html = '';

        for (var i = 0; i < allVideos.length; i++) {
            // 현재 메인 영상은 슬라이더에서 제외
            if (i === currentMainIndex) continue;

            var video = allVideos[i];
            var category = autoMatchCategory(video);
            var thumbUrl = 'https://img.youtube.com/vi/' + escapeAttr(video.id) + '/mqdefault.jpg';
            var viewCountHtml = formatViewCount(video.viewCount);

            html += '<div class="swiper-slide ytv4-slide" data-index="' + i + '">';
            html += '<div class="ytv4-slide-thumb">';
            html += '<img src="' + escapeAttr(thumbUrl) + '" alt="' + escapeAttr(video.title) + '" loading="lazy">';
            html += '<div class="ytv4-slide-play"></div>';

            // NEW 배지
            if (isNewVideo(video.publishedAt)) {
                html += '<span class="ytv4-badge-new ytv4-badge-new--small">NEW</span>';
            }

            // 카테고리 배지
            if (category && category !== 'default') {
                html += '<span class="ytv4-badge-category ytv4-badge-category--small">' + escapeHTML(category) + '</span>';
            }

            html += '</div>';

            // 카드 정보
            html += '<div class="ytv4-slide-info">';
            html += '<h6 class="ytv4-slide-title">' + escapeHTML(video.title) + '</h6>';
            html += '<div class="ytv4-slide-meta">';
            if (viewCountHtml) {
                html += '<span>' + viewCountHtml + '</span>';
            }
            html += '<span>' + formatDate(video.publishedAt) + '</span>';
            html += '</div>';
            html += '</div>';
            html += '</div>';
        }

        wrapper.innerHTML = html;

        // Swiper 초기화
        initSwiper();

        // 슬라이더 카드 클릭 이벤트: 한 번만 바인딩 (이벤트 위임)
        if (!sliderEventBound) {
            sliderEventBound = true;
            var sliderSection = root.querySelector('.ytv4-slider-section');
            if (sliderSection) {
                sliderSection.addEventListener('click', function(e) {
                    var slide = e.target.closest('.ytv4-slide');
                    if (slide) {
                        var index = parseInt(slide.getAttribute('data-index'));
                        if (!isNaN(index) && index !== currentMainIndex) {
                            switchVideo(index);
                        }
                    }
                });
            }
        }
    }

    /**
     * Swiper 초기화
     */
    function initSwiper() {
        // 기존 인스턴스 파괴
        if (swiperInstance && typeof swiperInstance.destroy === 'function') {
            swiperInstance.destroy(true, true);
            swiperInstance = null;
        }

        var swiperEl = root.querySelector('.ytv4-slider');
        if (!swiperEl || typeof Swiper === 'undefined') return;

        swiperInstance = new Swiper(swiperEl, {
            slidesPerView: 1.2,
            spaceBetween: 12,
            loop: false,
            pagination: {
                el: root.querySelector('.ytv4-slider .swiper-pagination'),
                clickable: true
            },
            navigation: {
                nextEl: root.querySelector('.ytv4-slider-section .swiper-button-next'),
                prevEl: root.querySelector('.ytv4-slider-section .swiper-button-prev')
            },
            breakpoints: {
                768: {
                    slidesPerView: 3,
                    spaceBetween: 16
                },
                1024: {
                    slidesPerView: 4,
                    spaceBetween: 18
                }
            }
        });
    }

    /**
     * 영상 전환: 슬라이더 클릭 시 메인 영상 + 상품 업데이트
     */
    function switchVideo(newIndex) {
        currentMainIndex = newIndex;
        renderMainVideo();
        renderProducts();
        renderSlider();

        // 섹션 상단으로 부드럽게 스크롤
        root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /* ========================================
       모바일 토글
       ======================================== */

    function toggleProductPanel() {
        // PC에서는 토글 비활성화
        if (window.innerWidth >= CONFIG.swiperBreakpoint) return;

        var panel = root.querySelector('.ytv4-product-panel');
        if (!panel) return;

        if (panel.classList.contains('collapsed')) {
            panel.classList.remove('collapsed');
            panel.classList.add('expanded');
        } else {
            panel.classList.remove('expanded');
            panel.classList.add('collapsed');
        }
    }

    /* ========================================
       스켈레톤 UI
       ======================================== */

    function showSkeleton() {
        var mainVideo = root.querySelector('.ytv4-main-video');
        var productPanel = root.querySelector('.ytv4-product-panel');
        var sliderWrapper = root.querySelector('.ytv4-slider-wrapper');

        if (mainVideo) {
            mainVideo.innerHTML =
                '<div class="ytv4-skeleton">' +
                    '<div class="ytv4-skeleton-video ytv4-shimmer"></div>' +
                    '<div class="ytv4-skeleton-info">' +
                        '<div class="ytv4-skeleton-title ytv4-shimmer"></div>' +
                        '<div class="ytv4-skeleton-meta ytv4-shimmer"></div>' +
                    '</div>' +
                '</div>';
        }

        if (productPanel) {
            var productSkeleton = '<div class="ytv4-skeleton-products">';
            productSkeleton += '<div class="ytv4-skeleton-product-title ytv4-shimmer"></div>';
            for (var i = 0; i < 2; i++) {
                productSkeleton +=
                    '<div class="ytv4-skeleton-product">' +
                        '<div class="ytv4-skeleton-product-img ytv4-shimmer"></div>' +
                        '<div class="ytv4-skeleton-product-text ytv4-shimmer"></div>' +
                    '</div>';
            }
            productSkeleton += '</div>';
            productPanel.innerHTML = productSkeleton;
        }

        if (sliderWrapper) {
            var sliderSkeleton = '';
            for (var j = 0; j < 4; j++) {
                sliderSkeleton +=
                    '<div class="swiper-slide">' +
                        '<div class="ytv4-skeleton-slide">' +
                            '<div class="ytv4-skeleton-slide-thumb ytv4-shimmer"></div>' +
                            '<div class="ytv4-skeleton-slide-text ytv4-shimmer"></div>' +
                        '</div>' +
                    '</div>';
            }
            sliderWrapper.innerHTML = sliderSkeleton;
        }
    }

    /* ========================================
       에러 표시
       ======================================== */

    function showError() {
        var mainVideo = root.querySelector('.ytv4-main-video');
        if (mainVideo) {
            mainVideo.innerHTML =
                '<div class="ytv4-error">' +
                    '<p>영상을 불러올 수 없습니다</p>' +
                    '<p><a href="https://www.youtube.com/channel/' + escapeAttr(CHANNEL_ID) + '" target="_blank" rel="noopener noreferrer">YouTube 채널에서 직접 보기</a></p>' +
                '</div>';
        }

        // 슬라이더, 상품 패널 숨기기
        var sliderSection = root.querySelector('.ytv4-slider-section');
        var productPanel = root.querySelector('.ytv4-product-panel');
        if (sliderSection) sliderSection.style.display = 'none';
        if (productPanel) productPanel.style.display = 'none';
    }

    // 채널 ID (에러 메시지 링크에 사용)
    var CHANNEL_ID = 'UCOt_7gyvjqHBw304hU4-FUw';

    /* ========================================
       캐시 수동 삭제 (디버깅용, 전역 노출)
       ======================================== */
    window.clearYouTubeV4Cache = function() {
        localStorage.removeItem(CONFIG.cacheKeyData);
        localStorage.removeItem(CONFIG.cacheKeyTime);
        location.reload();
    };

    /* ========================================
       초기화
       ======================================== */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
