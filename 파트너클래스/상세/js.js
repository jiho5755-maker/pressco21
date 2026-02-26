/* ============================================
   PRESSCO21 파트너 클래스 상세 페이지 - js.js
   메이크샵 D4 호환: IIFE, var, \${} 이스케이프
   CSS 스코핑: .class-detail
   ============================================ */
(function() {
    'use strict';

    /* ========================================
       설정값
       ======================================== */

    /** n8n 웹훅 엔드포인트 (WF-01 클래스 API) */
    var GAS_URL = 'https://n8n.pressco21.com/webhook/class-api';

    /** n8n WF-04 예약 기록 엔드포인트 */
    var BOOKING_URL = 'https://n8n.pressco21.com/webhook/record-booking';

    /** n8n WF-15 후기 작성 엔드포인트 */
    var REVIEW_SUBMIT_URL = 'https://n8n.pressco21.com/webhook/review-submit';

    /** 캐시 유효 시간: 5분 (밀리초) */
    var CACHE_TTL = 5 * 60 * 1000;

    /** localStorage 캐시 키 접두사 */
    var CACHE_PREFIX = 'classDetail_';

    /** 최소 인원 */
    var MIN_QUANTITY = 1;

    /** 기본 최대 인원 (API 응답으로 덮어쓰기) */
    var DEFAULT_MAX_STUDENTS = 8;

    /** 허용하는 HTML 태그 (sanitizeHtml용) */
    var ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'span', 'div', 'a'];

    /** 파트너 등급 매핑 */
    var GRADE_MAP = {
        'SILVER': { label: '\uC778\uC99D \uD30C\uD2B8\uB108', css: 'silver' },
        'GOLD': { label: '\uACE8\uB4DC \uD30C\uD2B8\uB108', css: 'gold' },
        'PLATINUM': { label: '\uD50C\uB798\uD2F0\uB118 \uD30C\uD2B8\uB108', css: 'platinum' }
    };


    /* ========================================
       상태 관리
       ======================================== */

    /** 현재 클래스 데이터 */
    var classData = null;

    /** 로그인한 회원 ID */
    var memberId = '';

    /** 선택된 인원 */
    var selectedQuantity = 1;

    /** 선택된 날짜 */
    var selectedDate = '';

    /** 후기 작성 선택 별점 */
    var reviewRating = 0;

    /** 후기 제출 진행 중 플래그 */
    var isSubmittingReview = false;

    /** Swiper 인스턴스 */
    var gallerySwiper = null;
    var thumbsSwiper = null;

    /** flatpickr 인스턴스 */
    var datePickerInstance = null;

    /** 갤러리 이미지 배열 (라이트박스용) */
    var galleryImages = [];


    /* ========================================
       초기화
       ======================================== */

    /**
     * 페이지 초기화
     */
    function init() {
        var classId = getClassIdFromURL();

        if (!classId) {
            // id 파라미터 없으면 목록으로 리다이렉트
            window.location.href = '/shop/page.html?id=2606';
            return;
        }

        // 회원 ID 읽기 (가상태그)
        var memberEl = document.getElementById('cdMemberId');
        if (memberEl) {
            memberId = (memberEl.textContent || '').trim();
        }

        // 에러 재시도 버튼 바인딩
        bindErrorRetry(classId);

        // 모바일 예약 버튼 바인딩
        bindMobileBookingBtn();

        // 데이터 로드
        fetchClassDetail(classId);
    }

    /**
     * URL에서 class_id 파라미터 추출
     * @returns {string|null}
     */
    function getClassIdFromURL() {
        var id = null;
        try {
            var params = new URLSearchParams(window.location.search);
            // class_id 파라미터 우선 (목록 페이지에서 넘어올 때)
            id = params.get('class_id') || null;
        } catch (e) {
            // URLSearchParams 미지원 폴백
            var match = window.location.search.match(/[?&]class_id=([^&]+)/);
            id = match ? decodeURIComponent(match[1]) : null;
        }
        // id 형식 검증: 영숫자, 하이픈, 언더스코어만 허용, 최대 64자
        if (id && /^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
            return id;
        }
        return null;
    }


    /* ========================================
       GAS API 통신
       ======================================== */

    /**
     * 클래스 상세 정보 API 호출
     * @param {string} classId - 클래스 ID
     */
    function fetchClassDetail(classId) {
        // 캐시 확인
        var cacheKey = classId;
        var cached = getCached(cacheKey);
        if (cached) {
            handleDetailResponse(cached);
            return;
        }

        // 로딩 표시
        showLoading();

        fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getClassDetail', id: classId })
        })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                return response.json();
            })
            .then(function(data) {
                if (data && data.success && data.data) {
                    setCache(cacheKey, data);
                    handleDetailResponse(data);
                } else {
                    showError(data && data.error ? data.error : '\uD074\uB798\uC2A4 \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.');
                }
            })
            .catch(function(err) {
                console.error('[ClassDetail] API \uD638\uCD9C \uC2E4\uD328:', err);
                showError('\uB124\uD2B8\uC6CC\uD06C \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.');
            });
    }

    /**
     * API 응답 처리
     * @param {Object} response - API 응답
     */
    function handleDetailResponse(response) {
        classData = response.data;

        // 페이지 메타 업데이트
        updateMetaTags(classData);

        // Schema.org 주입
        injectSchemaOrg(classData);

        // 전체 렌더링
        renderAll(classData);

        // 로딩 숨기고 콘텐츠 표시
        hideLoading();
        showContent();

        // 스크롤 애니메이션 초기화
        initScrollReveal();

        // 공유 기능 초기화
        initShare(classData);

        // 관련 클래스 추천 로드 (비동기, 렌더링 완료 후)
        loadRelatedClasses(classData);
    }


    /* ========================================
       캐시 관리 (localStorage)
       ======================================== */

    /**
     * 캐시에서 데이터 조회
     * @param {string} key
     * @returns {*|null}
     */
    function getCached(key) {
        try {
            var raw = localStorage.getItem(CACHE_PREFIX + key);
            if (!raw) return null;
            var entry = JSON.parse(raw);
            if (Date.now() - entry.timestamp > CACHE_TTL) {
                localStorage.removeItem(CACHE_PREFIX + key);
                return null;
            }
            return entry.data;
        } catch (e) {
            return null;
        }
    }

    /**
     * 데이터를 캐시에 저장
     * @param {string} key
     * @param {*} data
     */
    function setCache(key, data) {
        try {
            var entry = { timestamp: Date.now(), data: data };
            localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
        } catch (e) {
            clearExpiredCache();
        }
    }

    /**
     * 만료된 캐시 정리
     */
    function clearExpiredCache() {
        try {
            var keysToRemove = [];
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (key && key.indexOf(CACHE_PREFIX) === 0) {
                    var raw = localStorage.getItem(key);
                    if (raw) {
                        var entry = JSON.parse(raw);
                        if (Date.now() - entry.timestamp > CACHE_TTL) {
                            keysToRemove.push(key);
                        }
                    }
                }
            }
            for (var j = 0; j < keysToRemove.length; j++) {
                localStorage.removeItem(keysToRemove[j]);
            }
        } catch (e) { /* 무시 */ }
    }


    /* ========================================
       전체 렌더링
       ======================================== */

    /**
     * 모든 섹션 렌더링
     * @param {Object} data - 클래스 데이터
     */
    function renderAll(data) {
        renderSection(function() { renderHeader(data); }, null, '');
        renderSection(function() { renderGallery(data); }, null, '');
        renderSection(function() { renderBasicInfo(data); }, null, '');
        renderSection(function() { renderDescription(data); }, document.getElementById('descriptionContent'), '\uAC15\uC758 \uC18C\uAC1C\uB97C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.');
        renderSection(function() { renderCurriculum(data); }, document.getElementById('curriculumList'), '\uCEE4\uB9AC\uD050\uB7FC \uC815\uBCF4\uB97C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.');
        renderSection(function() { renderInstructor(data); }, document.getElementById('instructorCard'), '\uAC15\uC0AC \uC815\uBCF4\uB97C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.');
        renderSection(function() { renderMaterials(data); }, null, '');
        renderSection(function() { renderYoutube(data); }, null, '');
        renderSection(function() { renderReviews(data); }, null, '');
        renderSection(function() { renderReviewForm(data); }, null, '');
        renderSection(function() { renderBookingPanel(data); }, null, '');

        // 탭 이벤트 바인딩
        initTabs();
    }

    /**
     * 섹션별 독립 렌더링 (Graceful Degradation)
     * @param {Function} fn - 렌더링 함수
     * @param {HTMLElement|null} fallbackEl - 실패 시 메시지 표시 요소
     * @param {string} fallbackMsg - 실패 메시지
     */
    function renderSection(fn, fallbackEl, fallbackMsg) {
        try {
            fn();
        } catch (e) {
            console.error('[ClassDetail] \uC139\uC158 \uB80C\uB354\uB9C1 \uC2E4\uD328:', e);
            if (fallbackEl && fallbackMsg) {
                fallbackEl.innerHTML = '<p class="section-unavailable">' + escapeHtml(fallbackMsg) + '</p>';
            }
        }
    }


    /* ========================================
       개별 섹션 렌더링
       ======================================== */

    /**
     * Breadcrumb 헤더 렌더링
     */
    function renderHeader(data) {
        var titleEl = document.getElementById('breadcrumbTitle');
        if (titleEl) {
            titleEl.textContent = data.class_name || '\uD074\uB798\uC2A4 \uC0C1\uC138';
        }

        // 페이지 타이틀 업데이트
        document.title = (data.class_name || '\uD074\uB798\uC2A4 \uC0C1\uC138') + ' | PRESSCO21 \uD3EC\uC5D0\uBC84\uB7EC\uBE0C';
    }

    /**
     * 이미지 갤러리 렌더링 (Swiper 초기화)
     */
    function renderGallery(data) {
        var slidesContainer = document.getElementById('gallerySlides');
        var thumbsContainer = document.getElementById('galleryThumbSlides');
        if (!slidesContainer || !thumbsContainer) return;

        // 이미지 배열 구성 (썸네일 + 추가 이미지)
        var images = [];
        if (data.thumbnail_url) {
            images.push(data.thumbnail_url);
        }
        if (data.images && Array.isArray(data.images)) {
            for (var i = 0; i < data.images.length; i++) {
                if (data.images[i] && images.indexOf(data.images[i]) === -1) {
                    images.push(data.images[i]);
                }
            }
        }

        // 이미지가 없으면 플레이스홀더
        if (images.length === 0) {
            images.push('');
        }

        // 메인 슬라이드 생성
        var slidesHtml = '';
        for (var j = 0; j < images.length; j++) {
            slidesHtml += '<div class="swiper-slide gallery-slide">';
            if (images[j]) {
                slidesHtml += '<img class="gallery-slide__img" src="' + escapeHtml(images[j])
                    + '" alt="' + escapeHtml(data.class_name || '') + ' \uC774\uBBF8\uC9C0 ' + (j + 1)
                    + '" loading="' + (j === 0 ? 'eager' : 'lazy') + '">';
            } else {
                slidesHtml += '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#999;font-size:14px;">\uC774\uBBF8\uC9C0 \uC900\uBE44\uC911</div>';
            }
            slidesHtml += '</div>';
        }
        slidesContainer.innerHTML = slidesHtml;

        // 썸네일 슬라이드 생성
        var thumbsHtml = '';
        for (var k = 0; k < images.length; k++) {
            thumbsHtml += '<div class="swiper-slide gallery-thumb-slide">';
            if (images[k]) {
                thumbsHtml += '<img class="gallery-thumb-slide__img" src="' + escapeHtml(images[k])
                    + '" alt="" loading="lazy">';
            }
            thumbsHtml += '</div>';
        }
        thumbsContainer.innerHTML = thumbsHtml;

        // 이미지가 1장이면 썸네일 숨김
        var thumbsSection = document.querySelector('.class-detail .gallery-thumbs');
        if (thumbsSection && images.length <= 1) {
            thumbsSection.style.display = 'none';
        }

        // Swiper 초기화
        initSwiper(images.length);

        // 라이트박스용 이미지 배열 저장 (빈 플레이스홀더 제외)
        galleryImages = [];
        for (var m = 0; m < images.length; m++) {
            if (images[m]) galleryImages.push(images[m]);
        }

        // 갤러리 이미지 클릭 이벤트 (라이트박스 열기)
        if (galleryImages.length > 0) {
            bindGalleryClick();
        }
    }

    /**
     * 갤러리 이미지 클릭 시 라이트박스 열기 이벤트 바인딩
     */
    function bindGalleryClick() {
        var galleryEl = document.getElementById('galleryMain');
        if (!galleryEl) return;

        // 이벤트 위임: 갤러리 컨테이너에 한 번만 바인딩
        galleryEl.addEventListener('click', function(e) {
            var imgEl = e.target.closest('.gallery-slide__img');
            if (!imgEl) return;

            // 현재 Swiper realIndex로 라이트박스 시작 인덱스 결정
            var startIdx = 0;
            if (gallerySwiper && typeof gallerySwiper.realIndex === 'number') {
                startIdx = gallerySwiper.realIndex;
            }

            // 범위 보정
            if (startIdx < 0 || startIdx >= galleryImages.length) {
                startIdx = 0;
            }

            openLightbox(galleryImages, startIdx);
        });
    }

    /**
     * Swiper 인스턴스 초기화
     * @param {number} slideCount - 슬라이드 수
     */
    function initSwiper(slideCount) {
        // 기존 인스턴스 파괴
        if (thumbsSwiper) { thumbsSwiper.destroy(true, true); thumbsSwiper = null; }
        if (gallerySwiper) { gallerySwiper.destroy(true, true); gallerySwiper = null; }

        // 썸네일 Swiper
        thumbsSwiper = new Swiper('#galleryThumbs', {
            spaceBetween: 8,
            slidesPerView: 'auto',
            freeMode: true,
            watchSlidesProgress: true
        });

        // 메인 갤러리 Swiper
        var swiperConfig = {
            loop: slideCount > 1,
            spaceBetween: 0,
            navigation: {
                nextEl: '.class-detail .swiper-button-next',
                prevEl: '.class-detail .swiper-button-prev'
            },
            pagination: {
                el: '.class-detail .gallery-pagination',
                clickable: true
            },
            thumbs: {
                swiper: thumbsSwiper
            }
        };

        // 1장일 때 내비게이션 숨김
        if (slideCount <= 1) {
            swiperConfig.navigation = false;
            swiperConfig.pagination = false;
            var navPrev = document.querySelector('.class-detail .gallery-nav--prev');
            var navNext = document.querySelector('.class-detail .gallery-nav--next');
            if (navPrev) navPrev.style.display = 'none';
            if (navNext) navNext.style.display = 'none';
        }

        gallerySwiper = new Swiper('#galleryMain', swiperConfig);
    }

    /**
     * 클래스 기본 정보 렌더링 (모바일 + 예약 패널 공용)
     */
    function renderBasicInfo(data) {
        var className = escapeHtml(data.class_name || '');
        var category = escapeHtml(data.category || '');
        var level = escapeHtml(data.level || '');
        var duration = data.duration_min || 0;
        var durationText = formatDuration(duration);
        var price = formatPrice(data.price || 0);
        var avgRating = parseFloat(data.avg_rating) || 0;
        var classCount = parseInt(data.class_count) || 0;
        var location = escapeHtml(data.location || '');
        var maxStudents = parseInt(data.max_students) || DEFAULT_MAX_STUDENTS;

        // 별점 SVG (half star gradient 선언)
        var starsHtml = renderStars(avgRating, 'info-star', 16);

        // 배지 HTML
        var badgesHtml = '<div class="info-badges">';
        if (category) {
            badgesHtml += '<span class="info-badge info-badge--category">' + category + '</span>';
        }
        if (level) {
            badgesHtml += '<span class="info-badge info-badge--level">' + level + '</span>';
        }
        if (durationText) {
            badgesHtml += '<span class="info-badge info-badge--duration">' + durationText + '</span>';
        }
        badgesHtml += '</div>';

        // 별점 행
        var ratingHtml = '';
        if (avgRating > 0) {
            ratingHtml = '<div class="info-rating">'
                + '<div class="info-stars">' + starsHtml + '</div>'
                + '<span class="info-rating__num">' + avgRating.toFixed(1) + '</span>'
                + '<span class="info-rating__count">(' + classCount + '\uAC74)</span>'
                + '</div>';
        }

        // 메타 정보 (위치, 인원, 재료)
        var metaHtml = '<div class="info-meta">';
        if (location) {
            metaHtml += '<span class="info-meta__item">'
                + '<svg class="info-meta__icon" viewBox="0 0 16 16" fill="none"><path d="M8 1.5C5.79 1.5 4 3.29 4 5.5 4 8.75 8 14 8 14s4-5.25 4-8.5c0-2.21-1.79-4-4-4z" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="5.5" r="1.5" stroke="currentColor" stroke-width="1"/></svg>'
                + location
                + '</span>';
        }
        metaHtml += '<span class="info-meta__item">'
            + '<svg class="info-meta__icon" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.2"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>'
            + '\uCD5C\uB300 ' + maxStudents + '\uBA85'
            + '</span>';
        if (data.materials_included) {
            metaHtml += '<span class="info-meta__item">'
                + '<svg class="info-meta__icon" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5 6.5-7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
                + '\uC7AC\uB8CC ' + escapeHtml(data.materials_included)
                + '</span>';
        }
        metaHtml += '</div>';

        // 가격 행
        var priceHtml = '<div class="info-price-row">'
            + '<span class="info-price">' + price + '<span class="info-price__unit">\uC6D0</span></span>'
            + '<span class="info-price__per">/1\uC778</span>'
            + '</div>';

        var fullInfoHtml = ''
            + '<svg width="0" height="0" style="position:absolute" aria-hidden="true">'
            + '<defs><linearGradient id="cdHalfStarGrad">'
            + '<stop offset="50%" stop-color="#b89b5e"/>'
            + '<stop offset="50%" stop-color="#DDD"/>'
            + '</linearGradient></defs></svg>'
            + badgesHtml
            + '<h1 class="info-title">' + className + '</h1>'
            + ratingHtml
            + metaHtml
            + priceHtml;

        // 모바일 기본 정보
        var mobileInfo = document.getElementById('detailInfoMobile');
        if (mobileInfo) {
            mobileInfo.innerHTML = fullInfoHtml;
        }

        // 모바일 하단 바 가격
        var mobilePrice = document.getElementById('mobilePrice');
        if (mobilePrice) {
            mobilePrice.textContent = price + '\uC6D0';
        }
    }

    /**
     * 강의 소개 렌더링 (XSS 방지)
     */
    function renderDescription(data) {
        var container = document.getElementById('descriptionContent');
        if (!container) return;

        if (data.description) {
            container.innerHTML = sanitizeHtml(data.description);
        } else {
            container.innerHTML = '<p class="section-unavailable">\uAC15\uC758 \uC18C\uAC1C\uAC00 \uC900\uBE44\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.</p>';
        }
    }

    /**
     * 커리큘럼 아코디언 렌더링
     */
    function renderCurriculum(data) {
        var container = document.getElementById('curriculumList');
        if (!container) return;

        var curriculum = data.curriculum;
        if (!curriculum || !Array.isArray(curriculum) || curriculum.length === 0) {
            container.innerHTML = '<p class="section-unavailable">\uCEE4\uB9AC\uD050\uB7FC \uC815\uBCF4\uAC00 \uC900\uBE44\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.</p>';
            return;
        }

        var html = '';
        for (var i = 0; i < curriculum.length; i++) {
            var item = curriculum[i];
            var step = item.step || (i + 1);
            var title = escapeHtml(item.title || '\uB2E8\uACC4 ' + step);
            var desc = escapeHtml(item.desc || '');
            var dur = item.duration_min ? formatDuration(item.duration_min) : '';
            var isFirst = (i === 0) ? ' is-open' : '';

            html += '<div class="curriculum-item' + isFirst + '">'
                + '<button class="curriculum-item__header" type="button" '
                + 'aria-expanded="' + (i === 0 ? 'true' : 'false') + '">'
                + '<span class="curriculum-item__step">' + step + '</span>'
                + '<span class="curriculum-item__title">' + title + '</span>';
            if (dur) {
                html += '<span class="curriculum-item__duration">' + dur + '</span>';
            }
            html += '<svg class="curriculum-item__arrow" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
                + '</button>'
                + '<div class="curriculum-item__body">'
                + '<p class="curriculum-item__desc">' + desc + '</p>'
                + '</div>'
                + '</div>';
        }

        container.innerHTML = html;

        // 아코디언 이벤트 바인딩
        initAccordion(container);
    }

    /**
     * 아코디언 토글 초기화
     * @param {HTMLElement} container
     */
    function initAccordion(container) {
        var headers = container.querySelectorAll('.curriculum-item__header');
        for (var i = 0; i < headers.length; i++) {
            headers[i].addEventListener('click', function() {
                var item = this.closest('.curriculum-item');
                var isOpen = item.classList.contains('is-open');

                // 다른 아이템 닫기
                var allItems = container.querySelectorAll('.curriculum-item');
                for (var j = 0; j < allItems.length; j++) {
                    allItems[j].classList.remove('is-open');
                    var btn = allItems[j].querySelector('.curriculum-item__header');
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                }

                // 현재 아이템 토글
                if (!isOpen) {
                    item.classList.add('is-open');
                    this.setAttribute('aria-expanded', 'true');
                }
            });
        }
    }

    /**
     * 강사/공방 프로필 렌더링
     */
    function renderInstructor(data) {
        var container = document.getElementById('instructorCard');
        if (!container) return;

        var partner = data.partner || {};
        var name = escapeHtml(partner.name || '\uACF5\uBC29 \uC815\uBCF4 \uC5C6\uC74C');
        var grade = partner.grade || 'SILVER';
        var gradeInfo = GRADE_MAP[grade] || GRADE_MAP['SILVER'];
        var region = escapeHtml(partner.region || '');
        var description = escapeHtml(partner.description || '');
        var logoUrl = partner.logo_url || '';
        var instructorBio = escapeHtml(data.instructor_bio || '');

        // 아바타
        var avatarHtml = '';
        if (logoUrl) {
            avatarHtml = '<img class="instructor-avatar" src="' + escapeHtml(logoUrl) + '" alt="' + name + ' \uB85C\uACE0" loading="lazy">';
        } else {
            avatarHtml = '<div class="instructor-avatar--placeholder">'
                + '<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="12" r="6" stroke="currentColor" stroke-width="2"/><path d="M4 28c0-6.6 5.4-12 12-12s12 5.4 12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
                + '</div>';
        }

        // 등급 배지
        var gradeHtml = '<span class="instructor-grade instructor-grade--' + gradeInfo.css + '">'
            + gradeInfo.label + '</span>';

        // 지역
        var regionHtml = '';
        if (region) {
            regionHtml = '<p class="instructor-region">'
                + '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5C5.07 1.5 3.5 3.07 3.5 5c0 2.75 3.5 7.5 3.5 7.5s3.5-4.75 3.5-7.5C10.5 3.07 8.93 1.5 7 1.5z" stroke="currentColor" stroke-width="1"/><circle cx="7" cy="5" r="1.25" stroke="currentColor" stroke-width=".8"/></svg>'
                + region
                + '</p>';
        }

        var html = '<div class="instructor-profile">'
            + avatarHtml
            + '<div class="instructor-details">'
            + '<h3 class="instructor-name">' + name + '</h3>'
            + gradeHtml
            + regionHtml
            + '</div>'
            + '</div>';

        // 소개 텍스트
        var bioText = instructorBio || description;
        if (bioText) {
            html += '<p class="instructor-bio">' + bioText + '</p>';
        }

        // 파트너 연락처 버튼 생성
        var contactHtml = '';
        if (data.contact_instagram || data.contact_phone || data.contact_kakao) {
            contactHtml += '<div class="instructor-contact">';
            contactHtml += '<p class="instructor-contact__title">\uc774 \uac15\uc758\uc5d0 \ub300\ud574 \uad81\uae08\ud55c \uc810\uc774 \uc788\uc73c\uc2e0\uac00\uc694?</p>';
            contactHtml += '<div class="instructor-contact__btns">';
            if (data.contact_instagram) {
                contactHtml += '<a href="' + escapeHtml(data.contact_instagram) + '" target="_blank" rel="noopener" class="instructor-contact__btn instructor-contact__btn--instagram">'
                    + '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>'
                    + ' \uc778\uc2a4\ud0c0\uadf8\ub7a8 DM</a>';
            }
            if (data.contact_phone) {
                contactHtml += '<a href="tel:' + escapeHtml(data.contact_phone) + '" class="instructor-contact__btn instructor-contact__btn--phone">'
                    + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .22h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92v2z"/></svg>'
                    + ' \uc804\ud654 \ubb38\uc758</a>';
            }
            if (data.contact_kakao) {
                contactHtml += '<a href="' + escapeHtml(data.contact_kakao) + '" target="_blank" rel="noopener" class="instructor-contact__btn instructor-contact__btn--kakao">'
                    + '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.65 5.36 4.16 6.94L5 21l4.38-2.35C10.22 18.88 11.1 19 12 19c5.52 0 10-3.58 10-8S17.52 3 12 3z"/></svg>'
                    + ' \uce74\uce74\uc624 \ucee4\ub9e8\ub4dc</a>';
            }
            contactHtml += '</div></div>';
        }

        // 액션 버튼
        html += '<div class="instructor-actions">';
        if (partner.partner_code) {
            html += '<a href="/shop/page.html?id=2606&partner=' + encodeURIComponent(partner.partner_code) + '" class="instructor-action-btn instructor-action-btn--primary">'
                + '\uB2E4\uB978 \uD074\uB798\uC2A4 \uBCF4\uAE30</a>';
        }
        html += '</div>';

        // 파트너 연락처 섹션 추가
        html += contactHtml;

        container.innerHTML = html;
    }

    /**
     * 수강에 필요한 재료 렌더링 (Graceful Degradation)
     */
    function renderMaterials(data) {
        var section = document.getElementById('detailMaterials');
        if (!section) return;

        var productIds = data.materials_product_ids;
        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            // 재료 정보 없으면 섹션 숨김
            section.style.display = 'none';
            return;
        }

        section.style.display = '';

        var noteEl = document.getElementById('materialsNote');
        if (noteEl) {
            if (data.materials_included === '\uD3EC\uD568') {
                noteEl.textContent = '\uC218\uAC15\uB8CC\uC5D0 \uC7AC\uB8CC\uAC00 \uD3EC\uD568\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4. \uCD94\uAC00 \uAD6C\uB9E4\uB97C \uC6D0\uD558\uC2DC\uBA74 \uC544\uB798 \uC0C1\uD488\uC744 \uCC38\uACE0\uD574 \uC8FC\uC138\uC694.';
            } else {
                noteEl.textContent = '\uC218\uAC15\uC5D0 \uD544\uC694\uD55C \uC7AC\uB8CC\uC785\uB2C8\uB2E4. \uBCC4\uB3C4 \uAD6C\uB9E4\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.';
            }
        }

        var grid = document.getElementById('materialsGrid');
        if (!grid) return;

        // 재료 카드 렌더링 (상품 상세 링크)
        var html = '';
        for (var i = 0; i < productIds.length; i++) {
            var pid = escapeHtml(productIds[i]);
            var productUrl = '/goods/goods_view.php?goodsNo=' + encodeURIComponent(pid);

            html += '<a href="' + productUrl + '" class="material-card" target="_blank" rel="noopener">'
                + '<div class="material-card__thumb">'
                + '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:12px;">'
                + '\uC0C1\uD488 #' + pid
                + '</div>'
                + '</div>'
                + '<div class="material-card__body">'
                + '<p class="material-card__name">\uC7AC\uB8CC \uC0C1\uD488 #' + pid + '</p>'
                + '<span class="material-card__price">\uC0C1\uD488 \uD398\uC774\uC9C0 \uD655\uC778</span>'
                + '</div>'
                + '</a>';
        }
        grid.innerHTML = html;
    }

    /**
     * YouTube 영상 렌더링 (Graceful Degradation)
     */
    function renderYoutube(data) {
        var section = document.getElementById('detailYoutube');
        if (!section) return;

        var videoId = data.youtube_video_id;
        if (!videoId) {
            section.style.display = 'none';
            return;
        }

        // YouTube video ID 검증 (알파벳, 숫자, 하이픈, 언더스코어만 허용)
        if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
            section.style.display = 'none';
            return;
        }

        section.style.display = '';

        var embedEl = document.getElementById('youtubeEmbed');
        if (!embedEl) return;

        embedEl.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + videoId
            + '?rel=0&modestbranding=1" title="' + escapeHtml(data.class_name || '') + ' \uAD00\uB828 \uC601\uC0C1"'
            + ' allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"'
            + ' allowfullscreen loading="lazy"></iframe>';
    }

    /**
     * 수강 후기 렌더링
     */
    function renderReviews(data) {
        var summaryEl = document.getElementById('reviewsSummary');
        var listEl = document.getElementById('reviewsList');
        var emptyEl = document.getElementById('reviewsEmpty');

        var avgRating = parseFloat(data.avg_rating) || 0;
        var classCount = parseInt(data.class_count) || 0;

        // 후기 요약 (별점 분포 - 데모 데이터)
        if (summaryEl) {
            var summaryStars = renderStars(avgRating, 'info-star', 16);

            // 별점 분포 막대 (실제 데이터가 없으므로 추정 분포)
            var barsHtml = '';
            var distribution = estimateDistribution(avgRating, classCount);
            for (var i = 5; i >= 1; i--) {
                var count = distribution[i] || 0;
                var pct = classCount > 0 ? Math.round((count / classCount) * 100) : 0;
                barsHtml += '<div class="reviews-bar-row">'
                    + '<span class="reviews-bar__label">' + i + '\uC810</span>'
                    + '<div class="reviews-bar__track"><div class="reviews-bar__fill" style="width:' + pct + '%"></div></div>'
                    + '<span class="reviews-bar__count">' + count + '</span>'
                    + '</div>';
            }

            summaryEl.innerHTML = ''
                + '<svg width="0" height="0" style="position:absolute" aria-hidden="true">'
                + '<defs><linearGradient id="cdHalfStarGrad">'
                + '<stop offset="50%" stop-color="#b89b5e"/>'
                + '<stop offset="50%" stop-color="#DDD"/>'
                + '</linearGradient></defs></svg>'
                + '<div class="reviews-score">'
                + '<div class="reviews-score__num">' + (avgRating > 0 ? avgRating.toFixed(1) : '-') + '</div>'
                + '<div class="reviews-score__stars">' + summaryStars + '</div>'
                + '<div class="reviews-score__count">' + classCount + '\uAC74\uC758 \uD6C4\uAE30</div>'
                + '</div>'
                + '<div class="reviews-bars">' + barsHtml + '</div>';
        }

        // 후기 카드 (API에 reviews 배열이 있을 경우)
        if (listEl) {
            if (data.reviews && Array.isArray(data.reviews) && data.reviews.length > 0) {
                var cardsHtml = '';
                for (var j = 0; j < data.reviews.length; j++) {
                    cardsHtml += renderReviewCard(data.reviews[j]);
                }
                listEl.innerHTML = cardsHtml;
                if (emptyEl) emptyEl.style.display = 'none';
            } else if (classCount > 0) {
                // 후기 데이터 없지만 수강 횟수 있음 - 요약만 표시
                listEl.innerHTML = '';
                if (emptyEl) {
                    emptyEl.style.display = '';
                    emptyEl.querySelector('p').textContent = '\uC0C1\uC138 \uD6C4\uAE30\uB294 \uC900\uBE44 \uC911\uC785\uB2C8\uB2E4.';
                }
            } else {
                listEl.innerHTML = '';
                if (emptyEl) emptyEl.style.display = '';
            }
        }
    }

    /**
     * 개별 후기 카드 HTML
     * renderStars()를 사용하여 SVG 별점 통일 (filled=#b89b5e, empty=#e0e0e0, 16px)
     * @param {Object} review
     * @returns {string}
     */
    function renderReviewCard(review) {
        var name = escapeHtml(review.name || '\uC218\uAC15\uC0DD');
        var initial = name.charAt(0);
        var date = escapeHtml(review.date || '');
        var rating = parseInt(review.rating) || 5;
        var text = escapeHtml(review.text || '');

        // renderStars() 통일 사용 (review-star CSS 클래스, 16px)
        var starsHtml = renderStars(rating, 'review-star', 16);

        return '<div class="review-card">'
            + '<div class="review-card__header">'
            + '<div class="review-card__avatar">' + initial + '</div>'
            + '<div class="review-card__info">'
            + '<div class="review-card__name">' + name + '</div>'
            + '<div class="review-card__date">' + date + '</div>'
            + '</div>'
            + '<div class="review-card__stars">' + starsHtml + '</div>'
            + '</div>'
            + '<p class="review-card__text">' + text + '</p>'
            + '</div>';
    }

    /* ========================================
       후기 작성 폼
       ======================================== */

    /**
     * 후기 작성 폼 렌더링
     * - 로그인 상태일 때만 폼 표시
     * - 비로그인 시 로그인 안내
     * @param {Object} data - 클래스 데이터
     */
    function renderReviewForm(data) {
        var container = document.getElementById('reviewWriteSection');
        if (!container) return;

        // 비로그인: 안내 메시지 표시
        if (!memberId) {
            container.innerHTML = ''
                + '<div class="review-write-login">'
                + '<p class="review-write-login__text">\uB85C\uADF8\uC778 \uD6C4 \uD6C4\uAE30\uB97C \uC791\uC131\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.</p>'
                + '<a href="/member/login.html?returnUrl=' + encodeURIComponent(window.location.href) + '" class="review-write-login__btn">\uB85C\uADF8\uC778 \uD558\uAE30</a>'
                + '</div>';
            return;
        }

        // 로그인 상태: 후기 작성 폼
        var classId = data.class_id || data.id || '';

        var html = ''
            + '<div class="review-form" id="reviewForm">'
            + '<h3 class="review-form__title">\uD6C4\uAE30 \uC791\uC131</h3>'
            + '<div class="review-form__rating">'
            + '<span class="review-form__rating-label">\uBCC4\uC810</span>'
            + '<div class="star-rating" id="starRating" role="radiogroup" aria-label="\uBCC4\uC810 \uC120\uD0DD">';

        for (var i = 1; i <= 5; i++) {
            html += '<button type="button" class="star-rating__btn" data-value="' + i + '" '
                + 'aria-label="' + i + '\uC810" role="radio" aria-checked="false">'
                + '<svg class="star-rating__icon" width="28" height="28" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">'
                + '<path d="M7 1l1.76 3.57 3.94.57-2.85 2.78.67 3.93L7 10.07l-3.52 1.78.67-3.93L1.3 5.14l3.94-.57L7 1z"/>'
                + '</svg></button>';
        }

        html += '</div>'
            + '<span class="star-rating__value" id="ratingValueText"></span>'
            + '</div>'
            + '<div class="review-form__content">'
            + '<textarea class="review-form__textarea" id="reviewTextarea" '
            + 'placeholder="\uC218\uAC15 \uD6C4\uAE30\uB97C \uC791\uC131\uD574 \uC8FC\uC138\uC694. (\uCD5C\uC18C 20\uC790)" '
            + 'maxlength="1000" rows="5"></textarea>'
            + '<div class="review-form__charcount">'
            + '<span id="reviewCharCount">0</span>/1000'
            + '</div>'
            + '</div>'
            + '<div class="review-form__actions">'
            + '<button type="button" class="review-form__submit" id="reviewSubmitBtn" disabled>'
            + '\uD6C4\uAE30 \uB4F1\uB85D'
            + '</button>'
            + '</div>'
            + '<p class="review-form__notice">\uD6C4\uAE30 \uB4F1\uB85D \uC2DC 1,000\uC6D0\uC758 \uC801\uB9BD\uAE08\uC774 \uC9C0\uAE09\uB429\uB2C8\uB2E4.</p>'
            + '</div>';

        container.innerHTML = html;

        // 이벤트 바인딩
        initStarRating();
        initReviewTextarea();
        initReviewSubmit(classId);
    }

    /**
     * 별점 클릭 UI 초기화
     */
    function initStarRating() {
        var starBtns = document.querySelectorAll('.class-detail .star-rating__btn');
        var valueText = document.getElementById('ratingValueText');
        var ratingLabels = ['', '\uBD88\uB9CC\uC871', '\uBCF4\uD1B5', '\uAD1C\uCC2E\uC544\uC694', '\uB9CC\uC871', '\uB9E4\uC6B0 \uB9CC\uC871'];

        for (var i = 0; i < starBtns.length; i++) {
            // hover 효과
            starBtns[i].addEventListener('mouseenter', function() {
                var val = parseInt(this.getAttribute('data-value'));
                highlightStars(val);
            });

            // click: 별점 확정
            starBtns[i].addEventListener('click', function() {
                var val = parseInt(this.getAttribute('data-value'));
                reviewRating = val;
                highlightStars(val);

                // aria-checked 업데이트
                for (var j = 0; j < starBtns.length; j++) {
                    starBtns[j].setAttribute('aria-checked', 'false');
                }
                this.setAttribute('aria-checked', 'true');

                // 라벨 텍스트
                if (valueText) {
                    valueText.textContent = ratingLabels[val] || '';
                }

                validateReviewForm();
            });
        }

        // mouseout: 선택 값으로 복원
        var starContainer = document.getElementById('starRating');
        if (starContainer) {
            starContainer.addEventListener('mouseleave', function() {
                highlightStars(reviewRating);
            });
        }
    }

    /**
     * 별점 하이라이트 갱신
     * @param {number} val - 하이라이트할 별 수 (1~5)
     */
    function highlightStars(val) {
        var starBtns = document.querySelectorAll('.class-detail .star-rating__btn');
        for (var i = 0; i < starBtns.length; i++) {
            var btnVal = parseInt(starBtns[i].getAttribute('data-value'));
            if (btnVal <= val) {
                starBtns[i].classList.add('is-active');
            } else {
                starBtns[i].classList.remove('is-active');
            }
        }
    }

    /**
     * 후기 입력 textarea 이벤트 초기화
     */
    function initReviewTextarea() {
        var textarea = document.getElementById('reviewTextarea');
        var charCount = document.getElementById('reviewCharCount');

        if (textarea) {
            textarea.addEventListener('input', function() {
                var len = this.value.length;
                if (charCount) {
                    charCount.textContent = len;
                }
                validateReviewForm();
            });
        }
    }

    /**
     * 후기 폼 유효성 검증
     * 별점 1~5 + 내용 20자 이상이면 제출 버튼 활성화
     */
    function validateReviewForm() {
        var submitBtn = document.getElementById('reviewSubmitBtn');
        if (!submitBtn) return;

        var textarea = document.getElementById('reviewTextarea');
        var contentLen = textarea ? textarea.value.trim().length : 0;

        if (reviewRating >= 1 && reviewRating <= 5 && contentLen >= 20) {
            submitBtn.disabled = false;
        } else {
            submitBtn.disabled = true;
        }
    }

    /**
     * 후기 제출 버튼 이벤트 초기화
     * @param {string} classId
     */
    function initReviewSubmit(classId) {
        var submitBtn = document.getElementById('reviewSubmitBtn');
        if (!submitBtn) return;

        submitBtn.addEventListener('click', function() {
            if (isSubmittingReview) return;

            var textarea = document.getElementById('reviewTextarea');
            var content = textarea ? textarea.value.trim() : '';

            // 최종 유효성 체크
            if (reviewRating < 1 || reviewRating > 5) {
                showReviewToast('\uBCC4\uC810\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.', 'error');
                return;
            }
            if (content.length < 20) {
                showReviewToast('\uD6C4\uAE30 \uB0B4\uC6A9\uC744 20\uC790 \uC774\uC0C1 \uC785\uB825\uD574 \uC8FC\uC138\uC694.', 'error');
                return;
            }

            submitReview({
                class_id: classId,
                member_id: memberId,
                rating: reviewRating,
                content: content,
                reviewer_name: memberId
            });
        });
    }

    /**
     * WF-15 후기 제출 API 호출
     * @param {Object} payload
     */
    function submitReview(payload) {
        isSubmittingReview = true;

        var submitBtn = document.getElementById('reviewSubmitBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '\uB4F1\uB85D \uC911...';
        }

        fetch(REVIEW_SUBMIT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            isSubmittingReview = false;

            if (data && data.success) {
                // 성공: 토스트 + 폼 숨김 + 목록 새로고침
                showReviewToast('\uD6C4\uAE30\uAC00 \uB4F1\uB85D\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC801\uB9BD\uAE08 1,000\uC6D0\uC774 \uC9C0\uAE09\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success');
                hideReviewForm();
                refreshReviewList();
            } else {
                // 에러 응답 처리
                var errCode = (data && data.error && data.error.code) ? data.error.code : '';
                var errMsg = '\uD6C4\uAE30 \uB4F1\uB85D\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.';

                if (errCode === 'ALREADY_REVIEWED') {
                    errMsg = '\uC774\uBBF8 \uC791\uC131\uD55C \uD6C4\uAE30\uAC00 \uC788\uC2B5\uB2C8\uB2E4.';
                    hideReviewForm();
                } else if (errCode === 'NO_BOOKING_RECORD') {
                    errMsg = '\uC218\uAC15 \uC774\uB825\uC774 \uD655\uC778\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.';
                }

                showReviewToast(errMsg, 'error');
                resetSubmitButton();
            }
        })
        .catch(function(err) {
            isSubmittingReview = false;
            console.error('[ClassDetail] \uD6C4\uAE30 \uC81C\uCD9C \uC624\uB958:', err);
            showReviewToast('\uB124\uD2B8\uC6CC\uD06C \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.', 'error');
            resetSubmitButton();
        });
    }

    /**
     * 제출 버튼 초기 상태 복원
     */
    function resetSubmitButton() {
        var submitBtn = document.getElementById('reviewSubmitBtn');
        if (submitBtn) {
            submitBtn.textContent = '\uD6C4\uAE30 \uB4F1\uB85D';
            validateReviewForm();
        }
    }

    /**
     * 후기 폼 숨김 (제출 성공 또는 이미 작성 시)
     */
    function hideReviewForm() {
        var form = document.getElementById('reviewForm');
        if (form) {
            form.style.display = 'none';
        }
    }

    /**
     * 후기 목록 새로고침 (캐시 무효화 + 재요청)
     */
    function refreshReviewList() {
        if (!classData) return;
        var classId = classData.class_id || classData.id || '';
        if (!classId) return;

        // 캐시 무효화
        try { localStorage.removeItem(CACHE_PREFIX + classId); } catch (e) { /* 무시 */ }

        // 재요청
        fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getClassDetail', id: classId })
        })
        .then(function(response) {
            if (!response.ok) return null;
            return response.json();
        })
        .then(function(data) {
            if (data && data.success && data.data) {
                // 캐시 갱신
                setCache(classId, data);
                classData = data.data;
                // 후기 섹션만 재렌더링
                renderReviews(data.data);
            }
        })
        .catch(function() { /* 조용히 실패 */ });
    }

    /**
     * 후기 토스트 메시지 표시
     * @param {string} message
     * @param {string} type - 'success' | 'error'
     */
    function showReviewToast(message, type) {
        // 기존 토스트 제거
        var existing = document.querySelector('.class-detail .review-toast');
        if (existing) existing.remove();

        var toast = document.createElement('div');
        toast.className = 'review-toast review-toast--' + (type || 'success');
        toast.setAttribute('role', 'alert');
        toast.textContent = message;

        var container = document.querySelector('.class-detail');
        if (container) {
            container.appendChild(toast);

            // 강제 리플로우 후 표시 애니메이션
            void toast.offsetWidth;
            toast.classList.add('is-visible');

            // 3초 후 자동 제거
            setTimeout(function() {
                toast.classList.remove('is-visible');
                setTimeout(function() {
                    if (toast.parentNode) toast.parentNode.removeChild(toast);
                }, 300);
            }, 3000);
        }
    }


    /**
     * 별점 분포 추정 (실제 데이터 없을 때)
     * @param {number} avg
     * @param {number} total
     * @returns {Object}
     */
    function estimateDistribution(avg, total) {
        if (total === 0) return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

        // 평균에 기반한 대략적 분포
        var dist = {};
        if (avg >= 4.5) {
            dist[5] = Math.round(total * 0.7);
            dist[4] = Math.round(total * 0.2);
            dist[3] = Math.round(total * 0.07);
            dist[2] = Math.round(total * 0.02);
            dist[1] = Math.round(total * 0.01);
        } else if (avg >= 4.0) {
            dist[5] = Math.round(total * 0.5);
            dist[4] = Math.round(total * 0.3);
            dist[3] = Math.round(total * 0.12);
            dist[2] = Math.round(total * 0.05);
            dist[1] = Math.round(total * 0.03);
        } else {
            dist[5] = Math.round(total * 0.3);
            dist[4] = Math.round(total * 0.3);
            dist[3] = Math.round(total * 0.2);
            dist[2] = Math.round(total * 0.12);
            dist[1] = Math.round(total * 0.08);
        }

        return dist;
    }

    /**
     * 예약 패널 렌더링 (데스크탑 사이드바)
     */
    function renderBookingPanel(data) {
        var infoEl = document.getElementById('bookingInfo');
        var priceEl = document.getElementById('bookingPrice');
        var maxEl = document.getElementById('bookingMax');

        var className = escapeHtml(data.class_name || '');
        var price = data.price || 0;
        var avgRating = parseFloat(data.avg_rating) || 0;
        var classCount = parseInt(data.class_count) || 0;
        var maxStudents = parseInt(data.max_students) || DEFAULT_MAX_STUDENTS;
        var starsHtml = renderStars(avgRating, 'info-star', 14);

        // 예약 패널 정보
        if (infoEl) {
            var html = '<h2 class="booking-info__title">' + className + '</h2>';
            if (avgRating > 0) {
                html += '<div class="booking-info__rating">'
                    + '<div class="booking-info__stars">' + starsHtml + '</div>'
                    + '<span style="font-size:13px;font-weight:600;color:#333;">' + avgRating.toFixed(1) + '</span>'
                    + '<span style="font-size:12px;color:#777;">(' + classCount + ')</span>'
                    + '</div>';
            }
            html += '<div>'
                + '<span class="booking-info__price">' + formatPrice(price) + '<span class="booking-info__price-unit">\uC6D0</span></span>'
                + '<span class="booking-info__price-per">/1\uC778</span>'
                + '</div>';
            infoEl.innerHTML = html;
        }

        // 최대 인원 표시
        if (maxEl) {
            maxEl.textContent = '\uCD5C\uB300 ' + maxStudents + '\uBA85\uAE4C\uC9C0 \uC608\uC57D \uAC00\uB2A5';
        }

        // 가격 표시 초기화
        updatePriceDisplay(price);

        // 예약 패널 인터랙션 초기화
        initBookingPanel(data);
    }


    /* ========================================
       예약 패널 인터랙션
       ======================================== */

    /**
     * 예약 패널 이벤트 및 위젯 초기화
     * @param {Object} data
     */
    function initBookingPanel(data) {
        var price = data.price || 0;
        var maxStudents = parseInt(data.max_students) || DEFAULT_MAX_STUDENTS;

        // flatpickr 초기화
        var dateInput = document.getElementById('datePicker');
        if (dateInput && typeof flatpickr !== 'undefined') {
            // appendTo: .class-detail 내부에 캘린더 렌더링 (CSS 스코핑 유지)
            var calendarContainer = document.querySelector('.class-detail');
            datePickerInstance = flatpickr(dateInput, {
                locale: 'ko',
                minDate: 'today',
                dateFormat: 'Y-m-d',
                disableMobile: true,
                appendTo: calendarContainer,
                onChange: function(selectedDates, dateStr) {
                    selectedDate = dateStr;
                    validateBooking();
                }
            });
        }

        // 인원 카운터
        var minusBtn = document.getElementById('quantityMinus');
        var plusBtn = document.getElementById('quantityPlus');
        var valueEl = document.getElementById('quantityValue');

        if (minusBtn) {
            minusBtn.addEventListener('click', function() {
                if (selectedQuantity > MIN_QUANTITY) {
                    selectedQuantity--;
                    if (valueEl) valueEl.textContent = selectedQuantity;
                    updatePriceDisplay(price);
                    updateCounterButtons(maxStudents);
                }
            });
        }

        if (plusBtn) {
            plusBtn.addEventListener('click', function() {
                if (selectedQuantity < maxStudents) {
                    selectedQuantity++;
                    if (valueEl) valueEl.textContent = selectedQuantity;
                    updatePriceDisplay(price);
                    updateCounterButtons(maxStudents);
                }
            });
        }

        // 초기 카운터 버튼 상태
        updateCounterButtons(maxStudents);

        // 예약 버튼
        var submitBtn = document.getElementById('bookingSubmit');
        if (submitBtn) {
            submitBtn.addEventListener('click', function() {
                handleBookingClick();
            });
        }
    }

    /**
     * 인원 카운터 버튼 활성/비활성 업데이트
     * @param {number} max
     */
    function updateCounterButtons(max) {
        var minusBtn = document.getElementById('quantityMinus');
        var plusBtn = document.getElementById('quantityPlus');

        if (minusBtn) {
            minusBtn.disabled = (selectedQuantity <= MIN_QUANTITY);
        }
        if (plusBtn) {
            plusBtn.disabled = (selectedQuantity >= max);
        }
    }

    /**
     * 가격 표시 업데이트
     * @param {number} unitPrice
     */
    function updatePriceDisplay(unitPrice) {
        var priceEl = document.getElementById('bookingPrice');
        if (!priceEl) return;

        var totalPrice = unitPrice * selectedQuantity;

        var html = '<div class="booking-price__row">'
            + '<span>' + formatPrice(unitPrice) + '\uC6D0 x ' + selectedQuantity + '\uBA85</span>'
            + '<span>' + formatPrice(totalPrice) + '\uC6D0</span>'
            + '</div>'
            + '<div class="booking-price__row booking-price__total">'
            + '<span>\uCD1D \uACB0\uC81C \uAE08\uC561</span>'
            + '<span class="booking-price__total-value">' + formatPrice(totalPrice) + '\uC6D0</span>'
            + '</div>';

        priceEl.innerHTML = html;
    }

    /**
     * 예약 유효성 검증
     */
    function validateBooking() {
        var submitBtn = document.getElementById('bookingSubmit');
        if (!submitBtn) return;

        // 날짜 선택 필수
        if (selectedDate) {
            submitBtn.disabled = false;
        } else {
            submitBtn.disabled = true;
        }
    }

    /**
     * 예약 버튼 클릭 핸들러 (WF-04 연동)
     * 1. 비로그인 -> 로그인 안내 confirm -> login.html 이동
     * 2. 날짜 미선택 -> 날짜 선택 안내
     * 3. WF-04 POST -> NocoDB 예약 기록 -> 안내 alert -> 결제 페이지 이동
     */
    function handleBookingClick() {
        if (!classData) return;

        // 비로그인 처리: confirm -> login.html 이동
        if (!memberId) {
            if (confirm('\uc608\uc57d\uc740 \ub85c\uadf8\uc778 \ud6c4 \uc774\uc6a9\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.\n\ub85c\uadf8\uc778 \ud398\uc774\uc9c0\ub85c \uc774\ub3d9\ud558\uc2dc\uaca0\uc2b5\ub2c8\uae4c?')) {
                window.location.href = '/member/login.html?returnUrl=' + encodeURIComponent(window.location.href);
            }
            return;
        }

        // 날짜 미선택 시 경고
        if (!selectedDate) {
            var dateInput = document.getElementById('datePicker');
            if (dateInput) dateInput.focus();
            alert('\ub0a0\uc9dc\ub97c \uc120\ud0dd\ud574 \uc8fc\uc138\uc694.');
            return;
        }

        // 결제 페이지 URL: makeshop_product_id 있으면 직접구매, 없으면 결제창
        var paymentUrl = '';
        if (classData.makeshop_product_id) {
            paymentUrl = '/goods/goods_order.html?goodsNo='
                + encodeURIComponent(classData.makeshop_product_id)
                + '&orderType=direct&cnt=' + selectedQuantity;
        } else {
            paymentUrl = '/order/order_pay.html';
        }

        // 수강료 계산
        var unitPrice = classData.price || 0;
        var totalPrice = unitPrice * selectedQuantity;

        // WF-04 예약 기록 + 결제 페이지 이동
        submitBooking({
            className: classData.title || classData.class_name || '',
            date: selectedDate,
            participants: selectedQuantity,
            totalPrice: totalPrice,
            paymentUrl: paymentUrl
        });
    }

    /**
     * WF-04 예약 기록 후 결제 페이지 이동
     * @param {Object} info - className, date, participants, totalPrice, paymentUrl
     */
    function submitBooking(info) {
        // WF-04 POST 예약 기록
        var bookingData = {
            class_id: classData.class_id || classData.id || '',
            member_id: memberId,
            booking_date: info.date,
            participants: info.participants,
            amount: info.totalPrice
        };

        // 버튼 비활성화
        var submitBtn = document.getElementById('bookingSubmit');
        var mobileBtn = document.getElementById('mobileBookingBtn');
        if (submitBtn) submitBtn.disabled = true;
        if (mobileBtn) mobileBtn.disabled = true;

        fetch(BOOKING_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData),
            redirect: 'follow'
        })
        .then(function(response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        })
        .then(function(resData) {
            if (submitBtn) submitBtn.disabled = false;
            if (mobileBtn) mobileBtn.disabled = false;

            if (resData && resData.success) {
                // 예약 기록 성공 -> 안내 후 결제 페이지 이동
                alert('\uc608\uc57d\uc774 \uc811\uc218\ub418\uc5c8\uc2b5\ub2c8\ub2e4.\n\uacb0\uc81c \ud398\uc774\uc9c0\ub85c \uc774\ub3d9\ud569\ub2c8\ub2e4.');
                window.location.href = info.paymentUrl;
            } else {
                // WF-04 실패 -> 폴백으로 결제 페이지 이동
                console.warn('[Booking] WF-04 \uc2e4\ud328, \ud3f4\ubc31 \uc774\ub3d9:', resData);
                alert('\uc608\uc57d\uc774 \uc811\uc218\ub418\uc5c8\uc2b5\ub2c8\ub2e4.\n\uacb0\uc81c \ud398\uc774\uc9c0\ub85c \uc774\ub3d9\ud569\ub2c8\ub2e4.');
                window.location.href = info.paymentUrl;
            }
        })
        .catch(function(err) {
            if (submitBtn) submitBtn.disabled = false;
            if (mobileBtn) mobileBtn.disabled = false;
            // 네트워크 오류 -> 폴백으로 결제 페이지 이동
            console.warn('[Booking] \ub124\ud2b8\uc6cc\ud06c \uc624\ub958, \ud3f4\ubc31 \uc774\ub3d9:', err);
            alert('\uc608\uc57d\uc774 \uc811\uc218\ub418\uc5c8\uc2b5\ub2c8\ub2e4.\n\uacb0\uc81c \ud398\uc774\uc9c0\ub85c \uc774\ub3d9\ud569\ub2c8\ub2e4.');
            window.location.href = info.paymentUrl;
        });
    }


    /* ========================================
       탭 내비게이션
       ======================================== */

    /**
     * 탭 클릭 이벤트 초기화
     */
    function initTabs() {
        var tabBtns = document.querySelectorAll('.class-detail .detail-tab');
        var panels = {
            'description': document.getElementById('tabDescription'),
            'curriculum': document.getElementById('tabCurriculum'),
            'instructor': document.getElementById('tabInstructor'),
            'reviews': document.getElementById('tabReviews')
        };

        for (var i = 0; i < tabBtns.length; i++) {
            tabBtns[i].addEventListener('click', function() {
                var tabName = this.getAttribute('data-tab');

                // 모든 탭 비활성화
                for (var j = 0; j < tabBtns.length; j++) {
                    tabBtns[j].classList.remove('is-active');
                    tabBtns[j].setAttribute('aria-selected', 'false');
                }

                // 모든 패널 숨김
                var keys = ['description', 'curriculum', 'instructor', 'reviews'];
                for (var k = 0; k < keys.length; k++) {
                    if (panels[keys[k]]) {
                        panels[keys[k]].style.display = 'none';
                    }
                }

                // 선택된 탭 활성화
                this.classList.add('is-active');
                this.setAttribute('aria-selected', 'true');

                // 선택된 패널 표시
                if (panels[tabName]) {
                    panels[tabName].style.display = '';
                }

                // 재료/YouTube 섹션은 탭 외부이므로 항상 표시 유지
            });
        }

        // 탭 키보드 내비게이션 (WAI-ARIA Tabs 패턴)
        var tabList = document.getElementById('detailTabs');
        if (tabList) {
            tabList.addEventListener('keydown', function(e) {
                var currentTab = document.activeElement;
                if (!currentTab || !currentTab.classList.contains('detail-tab')) return;

                var tabs = [];
                for (var m = 0; m < tabBtns.length; m++) { tabs.push(tabBtns[m]); }
                var idx = -1;
                for (var n = 0; n < tabs.length; n++) {
                    if (tabs[n] === currentTab) { idx = n; break; }
                }
                var newIdx = -1;

                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    newIdx = (idx + 1) % tabs.length;
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    newIdx = (idx - 1 + tabs.length) % tabs.length;
                } else if (e.key === 'Home') {
                    newIdx = 0;
                } else if (e.key === 'End') {
                    newIdx = tabs.length - 1;
                }

                if (newIdx >= 0) {
                    e.preventDefault();
                    tabs[newIdx].focus();
                    tabs[newIdx].click();
                }
            });
        }
    }


    /* ========================================
       별점 렌더링 (SVG)
       ======================================== */

    /**
     * 별점 SVG 아이콘 HTML
     * @param {number} rating - 별점 (0~5)
     * @param {string} cssClass - 별 아이콘 CSS 클래스
     * @param {number} size - 아이콘 크기 (px)
     * @returns {string}
     */
    function renderStars(rating, cssClass, size) {
        var html = '';
        var w = size || 16;

        // 별점 색상: filled=#b89b5e(골드), empty=#e0e0e0
        var fullSvg = '<svg class="' + cssClass + ' ' + cssClass + '--filled" width="' + w + '" height="' + w + '" viewBox="0 0 14 14" fill="#b89b5e" xmlns="http://www.w3.org/2000/svg">'
            + '<path d="M7 1l1.76 3.57 3.94.57-2.85 2.78.67 3.93L7 10.07l-3.52 1.78.67-3.93L1.3 5.14l3.94-.57L7 1z"/></svg>';
        var halfSvg = '<svg class="' + cssClass + ' ' + cssClass + '--half" width="' + w + '" height="' + w + '" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">'
            + '<path d="M7 1l1.76 3.57 3.94.57-2.85 2.78.67 3.93L7 10.07l-3.52 1.78.67-3.93L1.3 5.14l3.94-.57L7 1z" fill="url(#cdHalfStarGrad)"/></svg>';
        var emptySvg = '<svg class="' + cssClass + ' ' + cssClass + '--empty" width="' + w + '" height="' + w + '" viewBox="0 0 14 14" fill="#e0e0e0" xmlns="http://www.w3.org/2000/svg">'
            + '<path d="M7 1l1.76 3.57 3.94.57-2.85 2.78.67 3.93L7 10.07l-3.52 1.78.67-3.93L1.3 5.14l3.94-.57L7 1z"/></svg>';

        for (var i = 1; i <= 5; i++) {
            if (rating >= i) {
                html += fullSvg;
            } else if (rating >= i - 0.5) {
                html += halfSvg;
            } else {
                html += emptySvg;
            }
        }

        return html;
    }


    /* ========================================
       Schema.org / SEO
       ======================================== */

    /**
     * Schema.org Course JSON-LD 동적 주입
     * @param {Object} data
     */
    function injectSchemaOrg(data) {
        // 기존 스크립트 제거
        var existing = document.getElementById('cdSchemaOrg');
        if (existing) existing.remove();
        var existingFaq = document.getElementById('cdSchemaFaq');
        if (existingFaq) existingFaq.remove();

        var schema = {
            '@context': 'https://schema.org',
            '@type': 'Course',
            'name': data.class_name || '',
            'description': data.description ? data.description.replace(/<[^>]+>/g, '').substring(0, 200) : '',
            'provider': {
                '@type': 'Organization',
                'name': (data.partner && data.partner.name) ? data.partner.name : 'PRESSCO21',
                'url': 'https://foreverlove.co.kr'
            },
            'courseMode': 'offline',
            'inLanguage': 'ko',
            'offers': {
                '@type': 'Offer',
                'price': data.price || 0,
                'priceCurrency': 'KRW',
                'availability': 'https://schema.org/InStock'
            }
        };

        var avgRating = parseFloat(data.avg_rating) || 0;
        var classCount = parseInt(data.class_count) || 0;
        if (avgRating > 0 && classCount > 0) {
            schema['aggregateRating'] = {
                '@type': 'AggregateRating',
                'ratingValue': avgRating,
                'reviewCount': classCount,
                'bestRating': 5,
                'worstRating': 1
            };
        }

        if (data.thumbnail_url) {
            schema['image'] = data.thumbnail_url;
        }

        if (data.duration_min) {
            schema['timeRequired'] = 'PT' + data.duration_min + 'M';
        }

        if (data.location) {
            schema['locationCreated'] = {
                '@type': 'Place',
                'name': data.location
            };
        }

        var script = document.createElement('script');
        script.id = 'cdSchemaOrg';
        script.type = 'application/ld+json';
        script.text = JSON.stringify(schema);
        document.head.appendChild(script);

        // FAQPage 스키마: 커리큘럼 데이터가 있으면 FAQ로 변환
        var curriculum = data.curriculum;
        if (curriculum && Array.isArray(curriculum) && curriculum.length > 0) {
            var faqEntries = [];
            for (var i = 0; i < curriculum.length; i++) {
                var item = curriculum[i];
                var qTitle = item.title || ('\uB2E8\uACC4 ' + (item.step || (i + 1)));
                var aDesc = item.desc || '';
                if (qTitle && aDesc) {
                    faqEntries.push({
                        '@type': 'Question',
                        'name': qTitle,
                        'acceptedAnswer': {
                            '@type': 'Answer',
                            'text': aDesc
                        }
                    });
                }
            }
            if (faqEntries.length > 0) {
                var faqSchema = {
                    '@context': 'https://schema.org',
                    '@type': 'FAQPage',
                    'mainEntity': faqEntries
                };
                var faqScript = document.createElement('script');
                faqScript.id = 'cdSchemaFaq';
                faqScript.type = 'application/ld+json';
                faqScript.text = JSON.stringify(faqSchema);
                document.head.appendChild(faqScript);
            }
        }
    }

    /**
     * 페이지 메타 태그 업데이트
     * @param {Object} data
     */
    function updateMetaTags(data) {
        var className = data.class_name || '\uD074\uB798\uC2A4 \uC0C1\uC138';
        var partnerName = (data.partner && data.partner.name) ? data.partner.name : '';
        var descText = data.description ? data.description.replace(/<[^>]+>/g, '').substring(0, 155) : '';

        // title
        document.title = className + ' | PRESSCO21 \uD3EC\uC5D0\uBC84\uB7EC\uBE0C';

        // meta description
        var metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute('content', descText || (partnerName + '\uC758 ' + className));
        }

        // og:title
        var ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) {
            ogTitle.setAttribute('content', className + ' | PRESSCO21');
        }

        // og:description
        var ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) {
            ogDesc.setAttribute('content', descText || (partnerName + '\uC758 ' + className + ' - \uCEE4\uB9AC\uD050\uB7FC, \uAC15\uC0AC \uC18C\uAC1C, \uD6C4\uAE30\uB97C \uD655\uC778\uD558\uC138\uC694.'));
        }
    }


    /* ========================================
       UI 상태 토글
       ======================================== */

    function showLoading() {
        var el = document.getElementById('detailLoading');
        if (el) el.style.display = '';
    }

    function hideLoading() {
        var el = document.getElementById('detailLoading');
        if (el) el.style.display = 'none';
    }

    function showContent() {
        var el = document.getElementById('detailContent');
        if (el) el.style.display = '';

        // 모바일 하단 바 표시
        var bar = document.getElementById('bookingBarMobile');
        if (bar) bar.style.display = '';
    }

    function showError(msg) {
        hideLoading();
        var el = document.getElementById('detailError');
        if (el) {
            el.style.display = '';
            var descEl = el.querySelector('.detail-error__desc');
            if (descEl && msg) {
                descEl.textContent = msg;
            }
        }
    }


    /* ========================================
       이벤트 바인딩
       ======================================== */

    /**
     * 에러 재시도 버튼 바인딩
     * @param {string} classId
     */
    function bindErrorRetry(classId) {
        var retryBtn = document.getElementById('errorRetryBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', function() {
                var errorEl = document.getElementById('detailError');
                if (errorEl) errorEl.style.display = 'none';
                // 캐시 제거 후 재시도
                try { localStorage.removeItem(CACHE_PREFIX + classId); } catch (e) { /* 무시 */ }
                fetchClassDetail(classId);
            });
        }
    }

    /**
     * 모바일 예약 버튼 바인딩
     */
    function bindMobileBookingBtn() {
        var mobileBtn = document.getElementById('mobileBookingBtn');
        if (mobileBtn) {
            mobileBtn.addEventListener('click', function() {
                handleBookingClick();
            });
        }
    }


    /* ========================================
       스크롤 애니메이션 (Intersection Observer)
       ======================================== */

    function initScrollReveal() {
        if (!('IntersectionObserver' in window)) {
            var elements = document.querySelectorAll('.class-detail .scroll-reveal');
            for (var i = 0; i < elements.length; i++) {
                elements[i].classList.add('is-visible');
            }
            return;
        }

        var observer = new IntersectionObserver(function(entries) {
            for (var j = 0; j < entries.length; j++) {
                if (entries[j].isIntersecting) {
                    entries[j].target.classList.add('is-visible');
                    observer.unobserve(entries[j].target);
                }
            }
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -40px 0px'
        });

        var cards = document.querySelectorAll('.class-detail .scroll-reveal:not(.is-visible)');
        for (var k = 0; k < cards.length; k++) {
            observer.observe(cards[k]);
        }
    }


    /* ========================================
       XSS 방지: HTML Sanitizer
       ======================================== */

    /**
     * HTML 문자열에서 허용된 태그만 유지 (XSS 방지)
     * @param {string} html - 원본 HTML
     * @returns {string} 정제된 HTML
     */
    function sanitizeHtml(html) {
        if (!html) return '';

        // 1. script, iframe, object, embed, form 태그 제거
        var cleaned = html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
            .replace(/<object[\s\S]*?<\/object>/gi, '')
            .replace(/<embed[\s\S]*?>/gi, '')
            .replace(/<form[\s\S]*?<\/form>/gi, '');

        // 2. on* 이벤트 핸들러 속성 제거
        cleaned = cleaned.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

        // 3. javascript: 프로토콜 제거
        cleaned = cleaned.replace(/href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, 'href="#"');

        // 4. style 속성 제거 (인라인 스타일 차단)
        cleaned = cleaned.replace(/\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

        // 5. 추가 위험 태그 명시 제거 (svg, img, base, meta, link, style 등)
        cleaned = cleaned.replace(/<\/?(?:svg|img|base|meta|link|style|textarea|select|input|button|math)[\s\S]*?>/gi, '');

        // 6. 허용 태그 외 제거
        var allowedPattern = ALLOWED_TAGS.join('|');
        var tagRegex = new RegExp('<(?!\\/?\s*(?:' + allowedPattern + ')(?:\\s|>|\\/))([^>]+)>', 'gi');
        cleaned = cleaned.replace(tagRegex, '');

        return cleaned;
    }


    /* ========================================
       유틸리티 함수
       ======================================== */

    /**
     * HTML 특수문자 이스케이프
     * @param {string} str
     * @returns {string}
     */
    function escapeHtml(str) {
        if (!str) return '';
        var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(str).replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    /**
     * 가격 포맷 (65000 -> "65,000")
     * @param {number} price
     * @returns {string}
     */
    function formatPrice(price) {
        var n = Number(price);
        if (isNaN(n) || n < 0) return '0';
        return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * 소요시간 포맷 (120 -> "2시간", 90 -> "1시간 30분")
     * @param {number} min
     * @returns {string}
     */
    function formatDuration(min) {
        if (!min || min <= 0) return '';
        if (min < 60) return min + '\uBD84';
        var hours = Math.floor(min / 60);
        var mins = min % 60;
        if (mins === 0) return hours + '\uC2DC\uAC04';
        return hours + '\uC2DC\uAC04 ' + mins + '\uBD84';
    }


    /* ========================================
       공유 기능
       ======================================== */

    /** 카카오 SDK JS 키 (TODO: 실제 발급받은 키로 교체 필요) */
    var KAKAO_JS_KEY = 'YOUR_KAKAO_JS_KEY_HERE';

    /**
     * 공유 기능 초기화
     * - Web Share API 감지, 카카오 SDK 초기화, 버튼 이벤트 바인딩
     * @param {Object} data - 클래스 데이터
     */
    function initShare(data) {
        // 카카오 SDK 초기화
        initKakaoSDK();

        // Web Share API 지원 시 네이티브 공유 버튼 표시
        var hasNativeShare = !!(navigator && navigator.share);

        // PC용 공유 버튼 바인딩
        bindShareButtons({
            kakaoBtn: document.getElementById('cdBtnKakao'),
            copyBtn: document.getElementById('cdBtnCopyUrl'),
            nativeBtn: document.getElementById('cdBtnNativeShare')
        }, data, hasNativeShare);

        // 모바일용 공유 버튼 바인딩
        bindShareButtons({
            kakaoBtn: document.querySelector('.cd-share-kakao-mobile'),
            copyBtn: document.querySelector('.cd-share-copy-mobile'),
            nativeBtn: document.querySelector('.cd-share-native-mobile')
        }, data, hasNativeShare);
    }

    /**
     * 공유 버튼 이벤트 바인딩 (PC/모바일 공용)
     * @param {Object} btns - kakaoBtn, copyBtn, nativeBtn
     * @param {Object} data - 클래스 데이터
     * @param {boolean} hasNativeShare - Web Share API 지원 여부
     */
    function bindShareButtons(btns, data, hasNativeShare) {
        if (btns.nativeBtn && hasNativeShare) {
            btns.nativeBtn.style.display = 'inline-flex';
            btns.nativeBtn.addEventListener('click', function() {
                nativeShare(data);
            });
        }

        if (btns.kakaoBtn) {
            btns.kakaoBtn.addEventListener('click', function() {
                shareKakao(data);
            });
        }

        if (btns.copyBtn) {
            btns.copyBtn.addEventListener('click', function() {
                copyUrl();
            });
        }
    }

    /**
     * 카카오 SDK 초기화
     */
    function initKakaoSDK() {
        if (typeof Kakao === 'undefined') return;
        if (KAKAO_JS_KEY === 'YOUR_KAKAO_JS_KEY_HERE') {
            console.warn('[ClassDetail] \uCE74\uCE74\uC624 JS \uD0A4\uAC00 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.');
            return;
        }
        try {
            if (!Kakao.isInitialized()) {
                Kakao.init(KAKAO_JS_KEY);
            }
        } catch (e) {
            console.error('[ClassDetail] \uCE74\uCE74\uC624 SDK \uCD08\uAE30\uD654 \uC2E4\uD328:', e);
        }
    }

    /**
     * 카카오톡 공유 (Feed 메시지)
     * @param {Object} data - 클래스 데이터
     */
    function shareKakao(data) {
        if (typeof Kakao === 'undefined') {
            showReviewToast('\uCE74\uCE74\uC624\uD1A1 \uACF5\uC720\uB97C \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.', 'error');
            return;
        }
        if (!Kakao.isInitialized()) {
            showReviewToast('\uCE74\uCE74\uC624\uD1A1 \uACF5\uC720 \uC124\uC815\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.', 'error');
            return;
        }

        var className = data.class_name || '\uD504\uB808\uC2A4\uCF54 \uD074\uB798\uC2A4';
        var desc = data.description || '';
        // HTML 태그 제거 후 100자 잘라내기
        var cleanDesc = desc.replace(/<[^>]+>/g, '').substring(0, 100);
        var imageUrl = data.thumbnail_url || 'https://foreverlove.co.kr/design/foreverlove/images/logo.png';
        var pageUrl = window.location.href;

        try {
            Kakao.Share.sendDefault({
                objectType: 'feed',
                content: {
                    title: className,
                    description: cleanDesc,
                    imageUrl: imageUrl,
                    link: {
                        mobileWebUrl: pageUrl,
                        webUrl: pageUrl
                    }
                },
                buttons: [
                    {
                        title: '\uD074\uB798\uC2A4 \uBCF4\uAE30',
                        link: {
                            mobileWebUrl: pageUrl,
                            webUrl: pageUrl
                        }
                    }
                ]
            });
        } catch (e) {
            console.error('[ClassDetail] \uCE74\uCE74\uC624 \uACF5\uC720 \uC2E4\uD328:', e);
            showReviewToast('\uCE74\uCE74\uC624\uD1A1 \uACF5\uC720\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.', 'error');
        }
    }

    /**
     * URL 복사 (Clipboard API 우선, 폴백으로 execCommand)
     */
    function copyUrl() {
        var url = window.location.href;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(function() {
                showReviewToast('\uB9C1\uD06C\uAC00 \uBCF5\uC0AC\uB418\uC5C8\uC2B5\uB2C8\uB2E4!', 'success');
            }).catch(function() {
                fallbackCopy(url);
            });
        } else {
            fallbackCopy(url);
        }
    }

    /**
     * URL 복사 폴백 (execCommand)
     * @param {string} url
     */
    function fallbackCopy(url) {
        var el = document.createElement('textarea');
        el.value = url;
        el.style.position = 'fixed';
        el.style.left = '-9999px';
        el.style.top = '-9999px';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        try {
            document.execCommand('copy');
            showReviewToast('\uB9C1\uD06C\uAC00 \uBCF5\uC0AC\uB418\uC5C8\uC2B5\uB2C8\uB2E4!', 'success');
        } catch (e) {
            showReviewToast('\uBCF5\uC0AC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uC8FC\uC18C\uCC3D\uC744 \uC9C1\uC811 \uBCF5\uC0AC\uD574 \uC8FC\uC138\uC694.', 'error');
        }
        document.body.removeChild(el);
    }

    /**
     * Web Share API (모바일 네이티브 공유)
     * @param {Object} data - 클래스 데이터
     */
    function nativeShare(data) {
        if (!navigator.share) return;

        var className = data.class_name || '\uD504\uB808\uC2A4\uCF54 \uD074\uB798\uC2A4';
        var desc = data.description || '';
        var cleanDesc = desc.replace(/<[^>]+>/g, '').substring(0, 100);

        navigator.share({
            title: className,
            text: cleanDesc,
            url: window.location.href
        }).catch(function() {
            // 사용자가 공유 취소 시 무시
        });
    }


    /* ========================================
       이미지 라이트박스
       ======================================== */

    /** 현재 라이트박스 상태 */
    var lightboxCurrentIdx = 0;
    var lightboxImageList = [];

    /**
     * 라이트박스 열기
     * @param {Array} images - 이미지 URL 배열
     * @param {number} startIndex - 시작 인덱스
     */
    function openLightbox(images, startIndex) {
        if (!images || images.length === 0) return;

        lightboxImageList = images;
        lightboxCurrentIdx = startIndex || 0;

        // 기존 오버레이 제거
        closeLightbox();

        // 모달 HTML 생성
        var overlay = document.createElement('div');
        overlay.className = 'cd-lightbox-overlay';
        overlay.id = 'cdLightboxOverlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', '\uC774\uBBF8\uC9C0 \uD655\uB300 \uBCF4\uAE30');
        overlay.setAttribute('tabindex', '-1');

        var containerHtml = '<div class="cd-lightbox-container">'
            + '<button class="cd-lightbox-close" id="cdLightboxClose" type="button" aria-label="\uB2EB\uAE30">'
            + '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>'
            + '</button>';

        // 이전/다음 버튼 (2장 이상일 때만)
        if (images.length > 1) {
            containerHtml += '<button class="cd-lightbox-prev" id="cdLightboxPrev" type="button" aria-label="\uC774\uC804 \uC774\uBBF8\uC9C0">'
                + '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>'
                + '</button>';
        }

        containerHtml += '<div class="cd-lightbox-img-wrap">'
            + '<img class="cd-lightbox-img" id="cdLightboxImg" src="' + escapeHtml(images[lightboxCurrentIdx]) + '" alt="\uC774\uBBF8\uC9C0 ' + (lightboxCurrentIdx + 1) + '">'
            + '</div>';

        if (images.length > 1) {
            containerHtml += '<button class="cd-lightbox-next" id="cdLightboxNext" type="button" aria-label="\uB2E4\uC74C \uC774\uBBF8\uC9C0">'
                + '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>'
                + '</button>';
        }

        // 카운터
        if (images.length > 1) {
            containerHtml += '<div class="cd-lightbox-counter" id="cdLightboxCounter">'
                + (lightboxCurrentIdx + 1) + ' / ' + images.length
                + '</div>';
        }

        containerHtml += '</div>';
        overlay.innerHTML = containerHtml;

        // body 스크롤 잠금
        document.body.style.overflow = 'hidden';

        // DOM에 추가
        document.body.appendChild(overlay);

        // 페이드인 애니메이션
        void overlay.offsetWidth;
        overlay.classList.add('is-active');
        overlay.focus();

        // 이벤트 바인딩
        bindLightboxEvents(overlay);
    }

    /**
     * 라이트박스 닫기
     */
    function closeLightbox() {
        var overlay = document.getElementById('cdLightboxOverlay');
        if (overlay) {
            overlay.classList.remove('is-active');
            // 페이드아웃 후 제거
            setTimeout(function() {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 250);
        }
        // body 스크롤 복원
        document.body.style.overflow = '';
        lightboxImageList = [];
        lightboxCurrentIdx = 0;
    }

    /**
     * 라이트박스 이미지 전환
     * @param {number} newIndex
     */
    function lightboxGoTo(newIndex) {
        if (lightboxImageList.length === 0) return;

        // 순환
        if (newIndex < 0) {
            newIndex = lightboxImageList.length - 1;
        } else if (newIndex >= lightboxImageList.length) {
            newIndex = 0;
        }

        lightboxCurrentIdx = newIndex;

        var imgEl = document.getElementById('cdLightboxImg');
        var counterEl = document.getElementById('cdLightboxCounter');

        if (imgEl) {
            imgEl.classList.add('is-loading');
            imgEl.src = lightboxImageList[newIndex];
            imgEl.alt = '\uC774\uBBF8\uC9C0 ' + (newIndex + 1);

            // 이미지 로드 완료 시 로딩 클래스 제거
            imgEl.onload = function() {
                imgEl.classList.remove('is-loading');
            };
            imgEl.onerror = function() {
                imgEl.classList.remove('is-loading');
            };
        }

        if (counterEl) {
            counterEl.textContent = (newIndex + 1) + ' / ' + lightboxImageList.length;
        }
    }

    /**
     * 라이트박스 이벤트 바인딩
     * @param {HTMLElement} overlay
     */
    function bindLightboxEvents(overlay) {
        // 닫기 버튼
        var closeBtn = document.getElementById('cdLightboxClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                closeLightbox();
            });
        }

        // 이전/다음 버튼
        var prevBtn = document.getElementById('cdLightboxPrev');
        var nextBtn = document.getElementById('cdLightboxNext');

        if (prevBtn) {
            prevBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                lightboxGoTo(lightboxCurrentIdx - 1);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                lightboxGoTo(lightboxCurrentIdx + 1);
            });
        }

        // 오버레이 배경 클릭 시 닫기
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                closeLightbox();
            }
        });

        // 키보드 이벤트 (ESC/좌우 화살표)
        var keyHandler = function(e) {
            if (e.key === 'Escape') {
                closeLightbox();
                document.removeEventListener('keydown', keyHandler);
            } else if (e.key === 'ArrowLeft') {
                lightboxGoTo(lightboxCurrentIdx - 1);
            } else if (e.key === 'ArrowRight') {
                lightboxGoTo(lightboxCurrentIdx + 1);
            }
        };
        document.addEventListener('keydown', keyHandler);

        // 오버레이 제거 시 키 이벤트도 정리
        var observer = new MutationObserver(function(mutations) {
            for (var i = 0; i < mutations.length; i++) {
                for (var j = 0; j < mutations[i].removedNodes.length; j++) {
                    if (mutations[i].removedNodes[j] === overlay) {
                        document.removeEventListener('keydown', keyHandler);
                        observer.disconnect();
                        return;
                    }
                }
            }
        });
        observer.observe(document.body, { childList: true });

        // 터치 스와이프 지원 (모바일)
        var touchStartX = 0;
        var touchEndX = 0;
        var minSwipeDist = 50;

        overlay.addEventListener('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        overlay.addEventListener('touchend', function(e) {
            touchEndX = e.changedTouches[0].screenX;
            var diff = touchStartX - touchEndX;
            if (Math.abs(diff) > minSwipeDist) {
                if (diff > 0) {
                    // 왼쪽 스와이프 = 다음
                    lightboxGoTo(lightboxCurrentIdx + 1);
                } else {
                    // 오른쪽 스와이프 = 이전
                    lightboxGoTo(lightboxCurrentIdx - 1);
                }
            }
        }, { passive: true });
    }


    /* ========================================
       관련 클래스 추천
       ======================================== */

    /**
     * 관련 클래스 데이터 로드 (WF-01 API)
     * @param {Object} data - 현재 클래스 데이터
     */
    function loadRelatedClasses(data) {
        var category = data.category || '';
        var currentClassId = data.class_id || data.id || '';

        if (!category) return;

        fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getClasses', category: category })
        })
        .then(function(response) {
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            return response.json();
        })
        .then(function(resData) {
            if (resData && resData.success && resData.data && resData.data.classes) {
                var allClasses = resData.data.classes;
                var related = [];

                // 현재 클래스 제외, active 상태만, 최대 4개
                for (var i = 0; i < allClasses.length; i++) {
                    var c = allClasses[i];
                    var cId = c.class_id || c.id || '';
                    if (cId === currentClassId) continue;
                    if (c.status && c.status !== 'active') continue;
                    related.push(c);
                    if (related.length >= 4) break;
                }

                if (related.length > 0) {
                    renderRelatedClasses(related);
                }
            }
        })
        .catch(function(err) {
            // 관련 클래스 실패는 조용히 무시 (핵심 기능 아님)
            console.warn('[ClassDetail] \uAD00\uB828 \uD074\uB798\uC2A4 \uB85C\uB4DC \uC2E4\uD328:', err);
        });
    }

    /**
     * 관련 클래스 카드 렌더링
     * @param {Array} classes - 클래스 배열
     */
    function renderRelatedClasses(classes) {
        var section = document.getElementById('cdRelatedSection');
        var grid = document.getElementById('cdRelatedGrid');
        if (!section || !grid) return;

        var html = '';
        for (var i = 0; i < classes.length; i++) {
            var c = classes[i];
            var cId = escapeHtml(c.class_id || c.id || '');
            var cName = escapeHtml(c.class_name || '');
            var cCategory = escapeHtml(c.category || '');
            var cPrice = formatPrice(c.price || 0);
            var cThumb = escapeHtml(c.thumbnail_url || '');
            var cRating = parseFloat(c.avg_rating) || 0;

            html += '<a href="/shop/page.html?id=2607&class_id=' + encodeURIComponent(cId) + '" class="cd-related-card">'
                + '<div class="cd-related-card__thumb">';

            if (cThumb) {
                html += '<img src="' + cThumb + '" alt="' + cName + '" loading="lazy">';
            }

            html += '</div>'
                + '<div class="cd-related-card__info">';

            if (cCategory) {
                html += '<span class="cd-related-card__category">' + cCategory + '</span>';
            }

            html += '<p class="cd-related-card__name">' + cName + '</p>'
                + '<div class="cd-related-card__meta">'
                + '<span class="cd-related-card__price">' + cPrice + '\uC6D0</span>';

            if (cRating > 0) {
                html += '<span class="cd-related-card__rating">'
                    + '<svg width="12" height="12" viewBox="0 0 14 14" fill="#b89b5e"><path d="M7 1l1.76 3.57 3.94.57-2.85 2.78.67 3.93L7 10.07l-3.52 1.78.67-3.93L1.3 5.14l3.94-.57L7 1z"/></svg>'
                    + cRating.toFixed(1)
                    + '</span>';
            }

            html += '</div>'
                + '</div>'
                + '</a>';
        }

        grid.innerHTML = html;
        section.style.display = '';
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
