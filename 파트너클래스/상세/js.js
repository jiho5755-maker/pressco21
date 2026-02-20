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

    /** GAS 백엔드 엔드포인트 (배포 시 실제 URL로 교체) */
    var GAS_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

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

    /** 선택된 인원 */
    var selectedQuantity = 1;

    /** 선택된 날짜 */
    var selectedDate = '';

    /** Swiper 인스턴스 */
    var gallerySwiper = null;
    var thumbsSwiper = null;

    /** flatpickr 인스턴스 */
    var datePickerInstance = null;


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
            window.location.href = '../\uBAA9\uB85D/';
            return;
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
            id = params.get('id') || null;
        } catch (e) {
            // URLSearchParams 미지원 폴백
            var match = window.location.search.match(/[?&]id=([^&]+)/);
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

        var params = new URLSearchParams();
        params.append('action', 'getClassDetail');
        params.append('id', classId);

        var url = GAS_URL + '?' + params.toString();

        fetch(url, { method: 'GET', redirect: 'follow' })
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
            + '<stop offset="50%" stop-color="#F5A623"/>'
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

        // 액션 버튼
        html += '<div class="instructor-actions">';
        if (partner.partner_code) {
            html += '<a href="../\uBAA9\uB85D/?partner=' + encodeURIComponent(partner.partner_code) + '" class="instructor-action-btn instructor-action-btn--primary">'
                + '\uB2E4\uB978 \uD074\uB798\uC2A4 \uBCF4\uAE30</a>';
        }
        html += '</div>';

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
                + '<stop offset="50%" stop-color="#F5A623"/>'
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
     * @param {Object} review
     * @returns {string}
     */
    function renderReviewCard(review) {
        var name = escapeHtml(review.name || '\uC218\uAC15\uC0DD');
        var initial = name.charAt(0);
        var date = escapeHtml(review.date || '');
        var rating = parseInt(review.rating) || 5;
        var text = escapeHtml(review.text || '');

        var starsHtml = '';
        for (var i = 1; i <= 5; i++) {
            if (i <= rating) {
                starsHtml += '<svg class="review-star review-star--filled" viewBox="0 0 14 14" fill="currentColor"><path d="M7 1l1.76 3.57 3.94.57-2.85 2.78.67 3.93L7 10.07l-3.52 1.78.67-3.93L1.3 5.14l3.94-.57L7 1z"/></svg>';
            } else {
                starsHtml += '<svg class="review-star review-star--empty" viewBox="0 0 14 14" fill="currentColor"><path d="M7 1l1.76 3.57 3.94.57-2.85 2.78.67 3.93L7 10.07l-3.52 1.78.67-3.93L1.3 5.14l3.94-.57L7 1z"/></svg>';
            }
        }

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
     * 예약 버튼 클릭 핸들러
     * 메이크샵 상품 페이지로 이동
     */
    function handleBookingClick() {
        if (!classData) return;

        // 날짜 미선택 시 경고
        if (!selectedDate) {
            var dateInput = document.getElementById('datePicker');
            if (dateInput) dateInput.focus();
            alert('\uB0A0\uC9DC\uB97C \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.');
            return;
        }

        // 메이크샵 상품 페이지로 이동
        if (classData.makeshop_product_id) {
            var url = '/goods/goods_view.php?goodsNo=' + encodeURIComponent(classData.makeshop_product_id);
            window.location.href = url;
        } else {
            alert('\uC608\uC57D \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uACE0\uAC1D\uC13C\uD130\uB85C \uBB38\uC758\uD574 \uC8FC\uC138\uC694.');
        }
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

        var fullSvg = '<svg class="' + cssClass + ' ' + cssClass + '--filled" width="' + w + '" height="' + w + '" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">'
            + '<path d="M7 1l1.76 3.57 3.94.57-2.85 2.78.67 3.93L7 10.07l-3.52 1.78.67-3.93L1.3 5.14l3.94-.57L7 1z"/></svg>';
        var halfSvg = '<svg class="' + cssClass + ' ' + cssClass + '--half" width="' + w + '" height="' + w + '" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">'
            + '<path d="M7 1l1.76 3.57 3.94.57-2.85 2.78.67 3.93L7 10.07l-3.52 1.78.67-3.93L1.3 5.14l3.94-.57L7 1z" fill="url(#cdHalfStarGrad)"/></svg>';
        var emptySvg = '<svg class="' + cssClass + ' ' + cssClass + '--empty" width="' + w + '" height="' + w + '" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">'
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

        var schema = {
            '@context': 'https://schema.org',
            '@type': 'Course',
            'name': data.class_name || '',
            'description': data.description ? data.description.replace(/<[^>]+>/g, '').substring(0, 200) : '',
            'provider': {
                '@type': 'Organization',
                'name': (data.partner && data.partner.name) ? data.partner.name : 'PRESSCO21'
            },
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
        return String(price).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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
       DOM Ready
       ======================================== */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
