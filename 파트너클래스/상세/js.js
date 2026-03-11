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
        'BLOOM': { label: 'BLOOM \uD30C\uD2B8\uB108', css: 'bloom' },
        'GARDEN': { label: 'GARDEN \uD30C\uD2B8\uB108', css: 'garden' },
        'ATELIER': { label: 'ATELIER \uD30C\uD2B8\uB108', css: 'atelier' },
        'AMBASSADOR': { label: 'AMBASSADOR \uD30C\uD2B8\uB108', css: 'ambassador' },
        'SILVER': { label: 'BLOOM \uD30C\uD2B8\uB108', css: 'bloom' },
        'GOLD': { label: 'GARDEN \uD30C\uD2B8\uB108', css: 'garden' },
        'PLATINUM': { label: 'ATELIER \uD30C\uD2B8\uB108', css: 'atelier' }
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

    /** 선택된 일정 ID */
    var selectedScheduleId = '';

    /** 현재 클래스의 일정 목록 (tbl_Schedules) */
    var classSchedules = [];

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

    /** FAQ 카테고리 순서 */
    var FAQ_CATEGORY_ALL = '\uC804\uCCB4';
    var FAQ_CATEGORY_ORDER = [FAQ_CATEGORY_ALL, '\uC218\uAC15', '\uD0A4\uD2B8\u00B7\uBC30\uC1A1', '\uD30C\uD2B8\uB108', '\uC815\uC0B0', '\uAE30\uD0C0'];

    /** FAQ UI 상태 */
    var faqState = {
        items: [],
        category: FAQ_CATEGORY_ALL,
        keyword: ''
    };


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
        renderSection(function() { renderTrustSummaryBar(data); }, null, '');
        renderSection(function() { renderIdentity(data); }, null, '');
        renderSection(function() { renderGallery(data); }, null, '');
        renderSection(function() { renderBasicInfo(data); }, null, '');
        renderSection(function() { renderIncludesSection(data); }, null, '');
        renderSection(function() { renderDescription(data); }, document.getElementById('descriptionContent'), '\uAC15\uC758 \uC18C\uAC1C\uB97C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.');
        renderSection(function() { renderCurriculum(data); }, document.getElementById('curriculumList'), '\uCEE4\uB9AC\uD050\uB7FC \uC815\uBCF4\uB97C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.');
        renderSection(function() { renderInstructor(data); }, document.getElementById('instructorCard'), '\uAC15\uC0AC \uC815\uBCF4\uB97C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.');
        renderSection(function() { renderMaterials(data); updateKitPurchaseLinks(data); }, null, '');
        renderSection(function() { renderYoutube(data); }, null, '');
        renderSection(function() { renderReviews(data); }, null, '');
        renderSection(function() { renderReviewForm(data); }, null, '');
        renderSection(function() { renderBookingPanel(data); }, null, '');
        renderSection(function() { renderFaqSection(data); }, null, '');

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

    function renderIdentity(data) {
        var section = document.getElementById('detailIdentity');
        var eyebrow = document.getElementById('detailIdentityEyebrow');
        var title = document.getElementById('detailIdentityTitle');
        var desc = document.getElementById('detailIdentityDesc');
        var highlights = document.getElementById('detailIdentityHighlights');
        var profile = resolveContentProfile(data || {});
        var root = document.querySelector('.class-detail');
        var html = '';
        var i;

        if (!section || !eyebrow || !title || !desc || !highlights || !root) return;

        root.classList.remove('class-detail--type-general', 'class-detail--type-affiliation', 'class-detail--type-event');
        root.classList.add('class-detail--type-' + profile.key);

        eyebrow.textContent = profile.eyebrow;
        title.textContent = profile.title;
        desc.textContent = profile.desc;

        for (i = 0; i < profile.highlights.length; i++) {
            html += '<div class="detail-identity__highlight">'
                + '<strong>' + escapeHtml(profile.highlights[i].title) + '</strong>'
                + '<span>' + escapeHtml(profile.highlights[i].desc) + '</span>'
                + '</div>';
        }

        highlights.innerHTML = html;
        section.style.display = '';

        var descTab = document.getElementById('tab-description');
        if (descTab) {
            descTab.textContent = profile.descriptionTabLabel;
        }
    }

    function getAverageRatingValue(data) {
        return parseFloat(data.avg_rating || data.rating_avg) || 0;
    }

    function getReviewCountValue(data) {
        return parseInt(data.class_count || data.review_count, 10) || 0;
    }

    function getBookedCountValue(data) {
        return parseInt(data.booked_count || data.booking_count, 10) || 0;
    }

    function getDeliveryModeValue(data) {
        var raw = String((data && (data.delivery_mode || data.class_format || data.format)) || '').replace(/\s+/g, ' ').trim().toUpperCase();
        var type = String((data && data.type) || '').replace(/\s+/g, ' ').trim();

        if (raw === 'ONLINE' || raw === 'OFFLINE' || raw === 'HYBRID') return raw;
        if (type.toUpperCase() === 'ONLINE' || type.indexOf('\uC628\uB77C\uC778') > -1) return 'ONLINE';
        if (type.toUpperCase() === 'HYBRID' || type.indexOf('\uD558\uC774\uBE0C\uB9AC\uB4DC') > -1) return 'HYBRID';
        return 'OFFLINE';
    }

    function normalizeContentTypeValue(raw, data) {
        var text = String(raw || '').replace(/\s+/g, ' ').trim().toUpperCase();
        var joined = [data && data.tags, data && data.class_name, data && data.category, data && data.affiliation_code, data && data.type].join(' ');

        if (text.indexOf('EVENT') > -1 || text.indexOf('SEMINAR') > -1) return 'EVENT';
        if (text.indexOf('AFFILIATION') > -1 || text.indexOf('MEMBER') > -1) return 'AFFILIATION';
        if (text === 'GENERAL' || text === 'CLASS') return 'GENERAL';
        if (normalizedContains(joined, '\uC138\uBBF8\uB098') || normalizedContains(joined, '\uC774\uBCA4\uD2B8')) return 'EVENT';
        if ((data && data.affiliation_code) || normalizedContains(joined, '\uD611\uD68C') || normalizedContains(joined, '\uD611\uD68C\uC6D0') || normalizedContains(joined, '\uC81C\uD734')) return 'AFFILIATION';
        return 'GENERAL';
    }

    function resolveContentProfile(data) {
        var contentType = normalizeContentTypeValue(data && data.content_type, data);
        var deliveryMode = getDeliveryModeValue(data || {});
        var profile = {
            key: 'general',
            chip: '\uC77C\uBC18 \uD074\uB798\uC2A4',
            eyebrow: '\uC77C\uBC18 \uD074\uB798\uC2A4',
            title: '\uC608\uC57D \uC804\uC5D0 \uD6C4\uAE30, \uD3EC\uD568 \uB0B4\uC5ED, \uC77C\uC815\uC744 \uD55C \uBC88\uC5D0 \uBCF4\uACE0 \uC120\uD0DD\uD560 \uC218 \uC788\uB294 \uD074\uB798\uC2A4\uC785\uB2C8\uB2E4.',
            desc: '\uC218\uAC15\uC0DD\uC774 \uBE44\uAD50\uD558\uAE30 \uC26C\uC6B4 \uD6C4\uAE30, \uC7AC\uB8CC \uD3EC\uD568 \uC5EC\uBD80, \uAC15\uC0AC/\uACF5\uBC29 \uC815\uBCF4\uAC00 \uD55C \uD750\uB984\uC73C\uB85C \uC774\uC5B4\uC9D1\uB2C8\uB2E4.',
            highlights: [
                { title: '\uC2E0\uB8B0 \uBE44\uAD50', desc: '\uD6C4\uAE30, \uD3C9\uC810, \uD3EC\uD568 \uB0B4\uC5ED\uC744 \uD55C \uBC88\uC5D0 \uD655\uC778' },
                { title: '\uC608\uC57D \uC989\uC2DC\uC131', desc: '\uC77C\uC815 \uC120\uD0DD \uD6C4 \uBC14\uB85C \uC608\uC57D\uACFC \uACB0\uC81C \uC9C4\uC785' },
                { title: '\uC790\uC0AC\uBAB0 \uC5F0\uACB0', desc: '\uD544\uC694 \uC2DC \uC7AC\uB8CC/\uD0A4\uD2B8 \uD750\uB984\uAE4C\uC9C0 \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uC774\uC5B4\uC9D0' }
            ],
            descriptionLead: '\uC77C\uBC18 \uC608\uC57D \uD074\uB798\uC2A4\uB85C, \uCC98\uC74C \uBCF4\uB294 \uC218\uAC15\uC0DD\uB3C4 \uC548\uC2EC\uD558\uACE0 \uC120\uD0DD\uD560 \uC218 \uC788\uB3C4\uB85D \uC815\uBCF4\uB97C \uC815\uB9AC\uD574\uB454 \uD398\uC774\uC9C0\uC785\uB2C8\uB2E4.',
            bookingNote: '\uBC14\uB85C \uC608\uC57D\uD558\uB294 \uC218\uAC15\uC0DD\uC744 \uC704\uD55C \uAE30\uBCF8 \uC608\uC57D \uD750\uB984\uC785\uB2C8\uB2E4.',
            descriptionTabLabel: '\uAC15\uC758 \uC18C\uAC1C'
        };

        if (contentType === 'AFFILIATION') {
            profile.key = 'affiliation';
            profile.chip = '\uD611\uD68C \uC804\uC6A9';
            profile.eyebrow = '\uD611\uD68C \uC804\uC6A9 \uD074\uB798\uC2A4';
            profile.title = '\uD611\uD68C \uC77C\uC815\uACFC \uD68C\uC6D0 \uD61C\uD0DD\uC774 \uD568\uAED8 \uBB36\uC778 \uD074\uB798\uC2A4\uC785\uB2C8\uB2E4.';
            profile.desc = '\uD611\uD68C \uC18C\uC18D \uC218\uAC15\uC0DD\uC744 \uC704\uD55C \uD560\uC778, \uC138\uBBF8\uB098 \uC77C\uC815, \uC804\uC6A9 \uC7AC\uB8CC/\uC2DC\uADF8\uB2C8\uCC98 \uC81C\uD488 \uD750\uB984\uC744 \uAC19\uC774 \uC548\uB0B4\uD558\uAE30 \uC704\uD55C \uB808\uC774\uC5B4\uC785\uB2C8\uB2E4.';
            profile.highlights = [
                { title: '\uD68C\uC6D0 \uD61C\uD0DD', desc: '\uD611\uD68C/\uD68C\uC6D0 \uB300\uC0C1 \uD560\uC778\uACFC \uC6B0\uC120 \uC548\uB0B4 \uD3EC\uC778\uD2B8 \uD45C\uC2DC' },
                { title: '\uC77C\uC815 \uBB36\uC74C', desc: '\uD074\uB798\uC2A4, \uD611\uD68C \uC2DC\uAC04\uD45C, \uC138\uBBF8\uB098 \uACF5\uC9C0 \uD750\uB984 \uB3D9\uC2DC \uC81C\uACF5' },
                { title: '\uC7AC\uAD6C\uB9E4 \uC5F0\uACB0', desc: '\uD68C\uC6D0 \uC804\uC6A9 \uC0C1\uD488/\uC2DC\uADF8\uB2C8\uCC98 \uC81C\uD488\uC73C\uB85C \uC5F0\uACB0 \uD655\uC7A5' }
            ];
            profile.descriptionLead = '\uD611\uD68C \uB610\uB294 \uD611\uD68C\uC6D0 \uD750\uB984\uACFC \uC5F0\uACB0\uB41C \uD074\uB798\uC2A4\uB85C, \uC218\uAC15\uB9CC\uC774 \uC544\uB2C8\uB77C \uD61C\uD0DD\uACFC \uD589\uC0AC \uACF5\uC9C0\uAE4C\uC9C0 \uD568\uAED8 \uD655\uC778\uD558\uB294 \uBDF0\uC785\uB2C8\uB2E4.';
            profile.bookingNote = '\uD611\uD68C \uB300\uC0C1 \uD61C\uD0DD/\uC804\uC6A9 \uC815\uCC45\uC774 \uC788\uC744 \uC218 \uC788\uC73C\uB2C8 \uC608\uC57D \uC804 \uC548\uB0B4 \uBB38\uAD6C\uB97C \uD55C \uBC88 \uB354 \uD655\uC778\uD558\uC138\uC694.';
            profile.descriptionTabLabel = '\uD611\uD68C \uC548\uB0B4';
        } else if (contentType === 'EVENT') {
            profile.key = 'event';
            profile.chip = '\uC138\uBBF8\uB098/\uC774\uBCA4\uD2B8';
            profile.eyebrow = '\uC138\uBBF8\uB098 / \uC774\uBCA4\uD2B8 \uD074\uB798\uC2A4';
            profile.title = '\uC88C\uC11D, \uACF5\uC9C0, \uC900\uBE44\uBB3C \uBCC0\uB3D9\uC774 \uC911\uC694\uD55C \uD589\uC0AC\uD615 \uCF58\uD150\uCE20\uC785\uB2C8\uB2E4.';
            profile.desc = '\uCCB4\uD5D8\uD68C, \uC138\uBBF8\uB098, \uD2B9\uBCC4 \uC774\uBCA4\uD2B8 \uAC19\uC774 \uC77C\uC815 \uC911\uC2EC\uC73C\uB85C \uC6B4\uC601\uB418\uB294 \uCF58\uD150\uCE20\uB294 \uCD5C\uC2E0 \uACF5\uC9C0\uC640 \uCC38\uC5EC \uC548\uB0B4\uB97C \uBA3C\uC800 \uBCF4\uC5EC\uC918\uC57C \uD569\uB2C8\uB2E4.';
            profile.highlights = [
                { title: '\uACF5\uC9C0 \uC6B0\uC120', desc: '\uC77C\uC815 \uBCC0\uACBD, \uC8FC\uCC28, \uC900\uBE44\uBB3C \uACF5\uC9C0\uB97C \uC0C1\uB2E8\uC5D0 \uC9D1\uC911 \uD45C\uC2DC' },
                { title: '\uD589\uC0AC \uCC38\uC5EC', desc: '\uCC38\uC5EC \uC790\uACA9, \uBAA8\uC9D1 \uD750\uB984, \uC77C\uC815 \uC120\uD0DD\uC744 \uC9C1\uAD00\uC801\uC73C\uB85C \uC5F0\uACB0' },
                { title: '\uC9C0\uC5ED \uB3D9\uC120', desc: '\uC624\uD504\uB77C\uC778 \uD589\uC0AC\uB77C\uBA74 \uD30C\uD2B8\uB108\uB9F5/\uC9C0\uC5ED \uD0D0\uC0C9 \uBDF0\uB85C \uBC14\uB85C \uD655\uC7A5' }
            ];
            profile.descriptionLead = '\uD589\uC0AC\uD615 \uD074\uB798\uC2A4\uB85C, \uD6C4\uAE30\uBCF4\uB2E4 \uCD5C\uC2E0 \uC77C\uC815\uACFC \uCC38\uC5EC \uC548\uB0B4\uAC00 \uB354 \uC911\uC694\uD55C \uCF58\uD150\uCE20\uC785\uB2C8\uB2E4.';
            profile.bookingNote = '\uC138\uBBF8\uB098/\uC774\uBCA4\uD2B8\uB294 \uC2E4\uC2DC\uAC04 \uACF5\uC9C0 \uBCC0\uB3D9\uC774 \uC788\uC744 \uC218 \uC788\uC73C\uB2C8 \uC2E0\uCCAD \uC804 \uC548\uB0B4 \uBB38\uAD6C\uB97C \uAF2D \uD655\uC778\uD558\uC138\uC694.';
            profile.descriptionTabLabel = '\uD504\uB85C\uADF8\uB7A8 \uC548\uB0B4';
        }

        if (deliveryMode === 'ONLINE') {
            profile.highlights[1] = { title: '\uC628\uB77C\uC778 \uCC38\uC5EC', desc: '\uC811\uC18D \uC548\uB0B4\uC640 \uC790\uB8CC \uC218\uB839 \uD750\uB984\uC744 \uC911\uC2EC\uC73C\uB85C \uD655\uC778' };
        }

        return profile;
    }

    function getClassTypeLabel(data) {
        var mode = getDeliveryModeValue(data || {});
        if (mode === 'ONLINE') return '\uC628\uB77C\uC778 \uC218\uC5C5';
        if (mode === 'HYBRID') return '\uD558\uC774\uBE0C\uB9AC\uB4DC \uC218\uC5C5';
        if (mode === 'OFFLINE') return '\uC624\uD504\uB77C\uC778 \uC218\uC5C5';
        return '\uAC15\uC0AC \uC9C4\uD589 \uC218\uC5C5';
    }

    function hasKitPurchaseOption(data) {
        return getMaterialKitItems(data).length > 0;
    }

    function renderTrustSummaryBar(data) {
        var bar = document.getElementById('detailTrustBar');
        var statsEl = document.getElementById('detailTrustBarStats');
        var profile = resolveContentProfile(data || {});
        if (!bar || !statsEl) return;

        var bookedCount = getBookedCountValue(data);
        var avgRating = getAverageRatingValue(data);
        var reviewCount = getReviewCountValue(data);
        var ratingText = avgRating > 0 ? avgRating.toFixed(1) : '0.0';

        statsEl.innerHTML = ''
            + '<span class="detail-trust-bar__chip">' + escapeHtml(profile.chip) + '</span>'
            + '<span class="detail-trust-bar__stat"><strong>' + formatPrice(bookedCount) + '\uBA85</strong><span>\uC218\uAC15</span></span>'
            + '<span class="detail-trust-bar__divider" aria-hidden="true"></span>'
            + '<span class="detail-trust-bar__stat"><strong>\u2605 ' + ratingText + '</strong><span>\uD3C9\uC810</span></span>'
            + '<span class="detail-trust-bar__divider" aria-hidden="true"></span>'
            + '<span class="detail-trust-bar__stat"><strong>' + formatPrice(reviewCount) + '\uAC74</strong><span>\uD6C4\uAE30</span></span>';

        bar.style.display = '';
    }

    function getIncludesItems(data) {
        var items = [];
        var materialItems = getMaterialKitItems(data);
        var hasKit = materialItems.length > 0;
        var materialsIncluded = String(data.materials_included || '').trim();
        var certificateFlag = String(data.certificate_available || data.certificate_enabled || '').toUpperCase();
        var profile = resolveContentProfile(data || {});

        items.push({
            title: '\uAC15\uC758',
            status: '\uD3EC\uD568',
            desc: getClassTypeLabel(data) + '\uACFC \uAE30\uBCF8 \uC218\uC5C5 \uC548\uB0B4\uAC00 \uD568\uAED8 \uC81C\uACF5\uB429\uB2C8\uB2E4.'
        });

        if (profile.key === 'affiliation') {
            items.push({
                title: '\uD68C\uC6D0 \uD61C\uD0DD',
                status: '\uB300\uC0C1\uC790 \uD655\uC778',
                desc: '\uD611\uD68C/\uD68C\uC6D0 \uD750\uB984\uC5D0 \uB9DE\uB294 \uD61C\uD0DD, \uD560\uC778, \uC804\uC6A9 \uC0C1\uD488 \uC548\uB0B4\uAC00 \uD568\uAED8 \uC81C\uACF5\uB429\uB2C8\uB2E4.'
            });
        } else if (profile.key === 'event') {
            items.push({
                title: '\uD589\uC0AC \uC548\uB0B4',
                status: '\uC2E4\uC2DC\uAC04 \uD655\uC778',
                desc: '\uC138\uBBF8\uB098/\uC774\uBCA4\uD2B8 \uC131\uACA9\uC758 \uC77C\uC815 \uBCC0\uACBD, \uC900\uBE44\uBB3C, \uCC38\uC5EC \uC548\uB0B4 \uBB38\uAD6C\uAC00 \uC6B0\uC120 \uC81C\uACF5\uB429\uB2C8\uB2E4.'
            });
        }

        if (materialsIncluded === '\uD3EC\uD568') {
            items.push({
                title: '\uC7AC\uB8CC\uD0A4\uD2B8',
                status: '\uD3EC\uD568',
                desc: '\uC218\uC5C5\uC5D0 \uD544\uC694\uD55C \uC7AC\uB8CC\uAC00 \uC218\uAC15\uB8CC\uC5D0 \uD3EC\uD568\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.'
            });
        } else if (hasKit) {
            items.push({
                title: '\uC7AC\uB8CC\uD0A4\uD2B8',
                status: '\uC120\uD0DD \uAD6C\uB9E4',
                desc: '\uD544\uC694 \uC7AC\uB8CC\uB97C \uC790\uC0AC\uBAB0 \uC0C1\uD488 \uB9C1\uD06C\uB85C \uBC14\uB85C \uD655\uC778\uD558\uACE0 \uB530\uB85C \uB2F4\uC744 \uC218 \uC788\uC5B4\uC694.'
            });
        } else {
            items.push({
                title: '\uC7AC\uB8CC\uD0A4\uD2B8',
                status: '\uBCC4\uB3C4 \uC548\uB0B4',
                desc: '\uD544\uC694 \uC7AC\uB8CC\uB294 \uAC15\uC0AC \uC548\uB0B4\uC5D0 \uB530\uB77C \uAC1C\uBCC4 \uC900\uBE44 \uB610\uB294 \uD604\uC7A5 \uD655\uC778\uC73C\uB85C \uC9C4\uD589\uB429\uB2C8\uB2E4.'
            });
        }

        if (certificateFlag === 'Y' || certificateFlag === '1' || certificateFlag === 'TRUE') {
            items.push({
                title: '\uC218\uB8CC\uC99D',
                status: '\uC81C\uACF5',
                desc: '\uC218\uAC15 \uC644\uB8CC \uD6C4 \uBC1C\uAE09 \uAE30\uC900\uC5D0 \uB9DE\uCDB0 \uC218\uB8CC\uC99D \uC548\uB0B4\uB97C \uBC1B\uC744 \uC218 \uC788\uC5B4\uC694.'
            });
        } else {
            items.push({
                title: '\uC218\uB8CC\uC99D',
                status: '\uD074\uB798\uC2A4\uBCC4 \uC0C1\uC774',
                desc: '\uC218\uB8CC\uC99D \uC81C\uACF5 \uC5EC\uBD80\uB294 \uAC15\uC0AC \uB610\uB294 \uD611\uD68C \uC6B4\uC601 \uC815\uCC45\uC5D0 \uB530\uB77C \uB2EC\uB77C\uC9D1\uB2C8\uB2E4.'
            });
        }

        return items;
    }

    function renderIncludesSection(data) {
        var grid = document.getElementById('detailIncludesGrid');
        if (!grid) return;

        var items = getIncludesItems(data);
        var html = '';
        for (var i = 0; i < items.length; i++) {
            html += '<article class="detail-includes__item">'
                + '<div class="detail-includes__item-top">'
                + '<h3 class="detail-includes__item-title">' + escapeHtml(items[i].title) + '</h3>'
                + '<span class="detail-includes__item-status">' + escapeHtml(items[i].status) + '</span>'
                + '</div>'
                + '<p class="detail-includes__item-desc">' + escapeHtml(items[i].desc) + '</p>'
                + '</article>';
        }

        grid.innerHTML = html;
    }

    function updateKitPurchaseLinks(data) {
        var hasKit = hasKitPurchaseOption(data);
        var desktopLink = document.getElementById('bookingKitLink');
        var mobileLink = document.getElementById('mobileKitLink');

        if (desktopLink) {
            desktopLink.style.display = hasKit ? '' : 'none';
        }
        if (mobileLink) {
            mobileLink.style.display = hasKit ? '' : 'none';
        }
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
        var duration = data.duration_min || 0;
        var durationText = formatDuration(duration);
        var price = formatPrice(data.price || 0);
        var avgRating = getAverageRatingValue(data);
        var classCount = getReviewCountValue(data);
        var location = escapeHtml(data.location || '');
        var maxStudents = parseInt(data.max_students) || DEFAULT_MAX_STUDENTS;

        // 별점 SVG (half star gradient 선언)
        var starsHtml = renderStars(avgRating, 'info-star', 16);

        var badgesHtml = buildInfoBadgesHtml(data, true, durationText);

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
            + priceHtml
            + buildExploreLinksHtml(data, 'mobile');

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
        var mobilePriceUnit = document.getElementById('mobilePriceUnit');
        if (mobilePriceUnit) {
            mobilePriceUnit.textContent = '/1\uC778';
        }
    }

    /**
     * 강의 소개 렌더링 (XSS 방지)
     */
    function renderDescription(data) {
        var container = document.getElementById('descriptionContent');
        var profile = resolveContentProfile(data || {});
        if (!container) return;

        if (data.description) {
            container.innerHTML = '<div class="section-unavailable" style="display:block;margin-bottom:18px;">' + escapeHtml(profile.descriptionLead) + '</div>' + sanitizeHtml(data.description);
        } else {
            container.innerHTML = '<p class="section-unavailable">' + escapeHtml(profile.descriptionLead) + '</p>';
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
        var rawPartnerName = partner.partner_name || partner.name || '';
        var name = escapeHtml(rawPartnerName || '\uACF5\uBC29 \uC815\uBCF4 \uC5C6\uC74C');
        var grade = partner.grade || 'BLOOM';
        var gradeInfo = GRADE_MAP[grade] || GRADE_MAP['BLOOM'];
        var rawRegion = partner.location || partner.region || '';
        var region = escapeHtml(rawRegion);
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
        if (rawPartnerName || region) {
            html += '<a href="' + buildListPageUrl({
                q: rawPartnerName,
                region: rawPartnerName ? '' : getRegionFilterValue(rawRegion)
            }) + '" class="instructor-action-btn instructor-action-btn--primary">'
                + '\uB2E4\uB978 \uD074\uB798\uC2A4 \uBCF4\uAE30</a>';
        }
        if (getDeliveryModeValue(data) !== 'ONLINE') {
            html += '<a href="' + buildPartnerMapUrl({
                region: getPrimaryRegion(rawRegion),
                category: data.category || '',
                keyword: rawPartnerName || data.class_name || '',
                partner: rawPartnerName || ''
            }) + '" class="instructor-action-btn instructor-action-btn--outline">'
                + '\uD30C\uD2B8\uB108\uB9F5\uC5D0\uC11C \uACF5\uBC29 \uBCF4\uAE30</a>';
        }
        html += '</div>';

        // 파트너 연락처 섹션 추가
        html += contactHtml;

        container.innerHTML = html;
    }

    function extractBrandUidFromValue(raw) {
        var value = String(raw || '').replace(/\s+/g, '').trim();
        var match = value.match(/[?&]branduid=([^&#]+)/i);
        if (match && match[1]) {
            return decodeURIComponent(match[1]);
        }
        if (/^[A-Za-z0-9_-]{4,64}$/.test(value)) {
            return value;
        }
        return '';
    }

    function normalizeMaterialProductUrl(raw) {
        var value = String(raw || '').trim();
        if (!value) return '';

        var brandUid = extractBrandUidFromValue(value);
        if (brandUid) {
            return '/shop/shopdetail.html?branduid=' + encodeURIComponent(brandUid);
        }

        if (/^https?:\/\//i.test(value) || value.indexOf('/shop/') === 0) {
            return value;
        }

        return '';
    }

    function getMaterialKitItems(data) {
        var sourceItems = Array.isArray(data.kit_items) ? data.kit_items : [];
        var items = [];
        var i;

        if (sourceItems.length > 0) {
            for (i = 0; i < sourceItems.length; i++) {
                var item = sourceItems[i] || {};
                var name = String(item.name || '').trim();
                var productUrl = normalizeMaterialProductUrl(item.product_url || item.product_code || '');
                var quantity = parseInt(item.quantity, 10);
                var price = parseInt(item.price, 10);
                var brandUid = extractBrandUidFromValue(productUrl || item.product_url || item.product_code || '');

                if (!name && !productUrl && !brandUid) continue;

                items.push({
                    name: name || ('\uC7AC\uB8CC \uC0C1\uD488 ' + (i + 1)),
                    product_url: productUrl || (brandUid ? '/shop/shopdetail.html?branduid=' + encodeURIComponent(brandUid) : ''),
                    quantity: !isNaN(quantity) && quantity > 0 ? quantity : 1,
                    price: !isNaN(price) && price > 0 ? price : 0,
                    branduid: brandUid
                });
            }
        }

        if (items.length === 0 && Array.isArray(data.materials_product_ids)) {
            for (i = 0; i < data.materials_product_ids.length; i++) {
                var pid = String(data.materials_product_ids[i] || '').trim();
                if (!pid) continue;
                items.push({
                    name: '\uC7AC\uB8CC \uC0C1\uD488 #' + pid,
                    product_url: '/shop/shopdetail.html?branduid=' + encodeURIComponent(pid),
                    quantity: 1,
                    price: 0,
                    branduid: pid
                });
            }
        }

        return items;
    }

    function getMaterialsNoteText(data, items) {
        if (data.kit_enabled && parseInt(data.kit_enabled, 10) === 1 && items.length > 0) {
            return '\uC218\uC5C5 \uD6C4 \uBCF5\uC2B5\uC774\uB098 \uCD94\uAC00 \uC81C\uC791\uC5D0 \uC4F0\uB294 \uC790\uC0AC\uBAB0 \uC7AC\uB8CC\uB97C \uD55C \uBC88\uC5D0 \uD655\uC778\uD560 \uC218 \uC788\uC5B4\uC694. \uC218\uB7C9\uC740 1\uC778 \uAE30\uC900\uC73C\uB85C \uD45C\uC2DC\uB429\uB2C8\uB2E4.';
        }
        if (data.materials_included === '\uD3EC\uD568') {
            return '\uC218\uAC15\uB8CC\uC5D0 \uAE30\uBCF8 \uC7AC\uB8CC\uAC00 \uD3EC\uD568\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4. \uB3D9\uC77C\uD55C \uC7AC\uB8CC\uB97C \uCD94\uAC00\uB85C \uAD6C\uB9E4\uD558\uB824\uBA74 \uC544\uB798 \uC0C1\uD488\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694.';
        }
        return '\uC218\uAC15 \uC804\uC5D0 \uBBF8\uB9AC \uC900\uBE44\uD558\uAC70\uB098 \uC218\uC5C5 \uD6C4 \uB2E4\uC2DC \uB9CC\uB4E4 \uB54C \uC4F0\uB294 \uC7AC\uB8CC\uB4E4\uC785\uB2C8\uB2E4.';
    }

    function setMaterialButtonBusy(button, isBusy, idleText) {
        if (!button) return;
        button.disabled = !!isBusy;
        button.setAttribute('aria-busy', isBusy ? 'true' : 'false');
        button.textContent = isBusy ? '\uC7A5\uBC14\uAD6C\uB2C8\uC5D0 \uB2F4\uB294 \uC911...' : idleText;
    }

    function bindMaterialActions(items) {
        var addAllBtn = document.getElementById('materialsAddAllBtn');
        var grid = document.getElementById('materialsGrid');
        if (addAllBtn) {
            addAllBtn.addEventListener('click', function() {
                handleMaterialAddAll(items, addAllBtn);
            });
        }
        if (grid) {
            grid.addEventListener('click', function(e) {
                var btn = e.target.closest('.js-material-add');
                if (!btn) return;

                var brandUid = btn.getAttribute('data-branduid') || '';
                var baseQty = parseInt(btn.getAttribute('data-quantity'), 10) || 1;
                var totalQty = Math.max(baseQty * (selectedQuantity || 1), 1);

                e.preventDefault();
                if (!brandUid) {
                    showToast('\uC774 \uC0C1\uD488\uC740 \uC7A5\uBC14\uAD6C\uB2C8 \uC5F0\uACB0 \uC815\uBCF4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.', 'error');
                    return;
                }

                setMaterialButtonBusy(btn, true, '\uC7A5\uBC14\uAD6C\uB2C8 \uB2F4\uAE30');
                addKitProductToBasket(brandUid, totalQty)
                    .then(function() {
                        setMaterialButtonBusy(btn, false, '\uC7A5\uBC14\uAD6C\uB2C8 \uB2F4\uAE30');
                        showToast('\uC7AC\uB8CC\uAC00 \uC7A5\uBC14\uAD6C\uB2C8\uC5D0 \uB2F4\uACBC\uC2B5\uB2C8\uB2E4.', 'success');
                    })
                    .catch(function(err) {
                        console.warn('[ClassDetail] \uC7AC\uB8CC \uAC1C\uBCC4 \uB2F4\uAE30 \uC2E4\uD328:', err);
                        setMaterialButtonBusy(btn, false, '\uC7A5\uBC14\uAD6C\uB2C8 \uB2F4\uAE30');
                        showToast('\uC7AC\uB8CC\uB97C \uC7A5\uBC14\uAD6C\uB2C8\uC5D0 \uB2F4\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.', 'error');
                    });
            });
        }
    }

    function handleMaterialAddAll(items, button) {
        var queue = [];
        var i;
        var successCount = 0;
        var failCount = 0;

        for (i = 0; i < items.length; i++) {
            if (items[i].branduid) {
                queue.push({
                    branduid: items[i].branduid,
                    quantity: Math.max((items[i].quantity || 1) * (selectedQuantity || 1), 1)
                });
            }
        }

        if (queue.length === 0) {
            showToast('\uD55C \uBC88\uC5D0 \uB2F4\uC744 \uC218 \uC788\uB294 \uC790\uC0AC\uBAB0 \uC0C1\uD488 \uC815\uBCF4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.', 'error');
            return;
        }

        setMaterialButtonBusy(button, true, '\uC7AC\uB8CC \uD55C\uBC88\uC5D0 \uB2F4\uAE30');

        (function run(index) {
            if (index >= queue.length) {
                setMaterialButtonBusy(button, false, '\uC7AC\uB8CC \uD55C\uBC88\uC5D0 \uB2F4\uAE30');
                if (successCount > 0 && failCount === 0) {
                    showToast('\uC7AC\uB8CC ' + successCount + '\uC885\uC744 \uC7A5\uBC14\uAD6C\uB2C8\uC5D0 \uB2F4\uC558\uC2B5\uB2C8\uB2E4.', 'success');
                } else if (successCount > 0) {
                    showToast('\uC77C\uBD80 \uC7AC\uB8CC\uB9CC \uB2F4\uACBC\uC2B5\uB2C8\uB2E4. \uC131\uACF5 ' + successCount + '\uAC1C, \uC2E4\uD328 ' + failCount + '\uAC1C', 'error');
                } else {
                    showToast('\uC7AC\uB8CC \uB2F4\uAE30\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.', 'error');
                }
                return;
            }

            addKitProductToBasket(queue[index].branduid, queue[index].quantity)
                .then(function() {
                    successCount++;
                    run(index + 1);
                })
                .catch(function(err) {
                    console.warn('[ClassDetail] \uC7AC\uB8CC \uD55C\uBC88\uC5D0 \uB2F4\uAE30 \uC2E4\uD328:', err);
                    failCount++;
                    run(index + 1);
                });
        })(0);
    }

    /**
     * 수강에 필요한 재료 렌더링 (Graceful Degradation)
     */
    function renderMaterials(data) {
        var section = document.getElementById('detailMaterials');
        var noteEl = document.getElementById('materialsNote');
        var grid = document.getElementById('materialsGrid');
        var items = getMaterialKitItems(data);
        var html = '';

        if (!section || !noteEl || !grid) return;

        if (!items || items.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = '';
        noteEl.textContent = getMaterialsNoteText(data, items);

        var addableCount = 0;
        for (var i = 0; i < items.length; i++) {
            if (items[i].branduid) addableCount++;
        }

        if (addableCount > 0) {
            html += '<div class="detail-materials__actions">'
                + '<button type="button" class="detail-materials__action detail-materials__action--primary" id="materialsAddAllBtn">\uC7AC\uB8CC \uD55C\uBC88\uC5D0 \uB2F4\uAE30</button>'
                + '<a href="/shop/basket.html" class="detail-materials__action detail-materials__action--secondary">\uC7A5\uBC14\uAD6C\uB2C8 \uBCF4\uAE30</a>'
                + '</div>';
        }

        html += '<div class="materials-grid__inner">';
        for (i = 0; i < items.length; i++) {
            var item = items[i];
            var productUrl = item.product_url || '#';
            var hasLink = !!item.product_url;
            var hasBrandUid = !!item.branduid;
            var priceText = item.price > 0 ? formatPrice(item.price) + '\uC6D0' : '\uAC00\uACA9 \uD655\uC778 \uD544\uC694';

            html += '<article class="material-card">'
                + '<div class="material-card__thumb">'
                + '<div class="material-card__thumb-label">\uC7AC\uB8CC KIT</div>'
                + '<span class="material-card__qty">1\uC778 \uAE30\uC900 x ' + escapeHtml(String(item.quantity || 1)) + '</span>'
                + '</div>'
                + '<div class="material-card__body">'
                + '<p class="material-card__name">' + escapeHtml(item.name || '') + '</p>'
                + '<p class="material-card__meta">' + (hasLink ? '\uC790\uC0AC\uBAB0 \uC5F0\uACB0 \uC644\uB8CC' : '\uC6B4\uC601\uD300 \uD655\uC778 \uC911') + '</p>'
                + '<div class="material-card__price">' + escapeHtml(priceText) + '</div>'
                + '<div class="material-card__actions">';

            if (hasLink) {
                html += '<a href="' + escapeHtml(productUrl) + '" class="material-card__btn material-card__btn--link" target="_blank" rel="noopener">\uC0C1\uD488 \uBCF4\uAE30</a>';
            } else {
                html += '<span class="material-card__btn material-card__btn--disabled">\uB9C1\uD06C \uC900\uBE44 \uC911</span>';
            }

            if (hasBrandUid) {
                html += '<button type="button" class="material-card__btn material-card__btn--cart js-material-add" data-branduid="' + escapeHtml(item.branduid) + '" data-quantity="' + escapeHtml(String(item.quantity || 1)) + '">\uC7A5\uBC14\uAD6C\uB2C8 \uB2F4\uAE30</button>';
            }

            html += '</div></div></article>';
        }
        html += '</div>';

        grid.innerHTML = html;
        bindMaterialActions(items);
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
                + '<a href="' + buildLoginUrl(window.location.href) + '" class="review-write-login__btn">\uB85C\uADF8\uC778 \uD558\uAE30</a>'
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

    function showToast(message, type) {
        showReviewToast(message, type);
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
        var profile = resolveContentProfile(data || {});

        var className = escapeHtml(data.class_name || '');
        var price = data.price || 0;
        var avgRating = getAverageRatingValue(data);
        var classCount = getReviewCountValue(data);
        var maxStudents = parseInt(data.max_students) || DEFAULT_MAX_STUDENTS;
        var durationText = formatDuration(data.duration_min || 0);
        var starsHtml = renderStars(avgRating, 'info-star', 14);

        // 예약 패널 정보
        if (infoEl) {
            var html = buildInfoBadgesHtml(data, true, durationText)
                + '<h2 class="booking-info__title">' + className + '</h2>';
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
                + '</div>'
                + '<p class="booking-info__note">' + escapeHtml(profile.bookingNote) + '</p>'
                + buildExploreLinksHtml(data, 'sidebar');
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

        // tbl_Schedules 기반 일정 저장
        classSchedules = (data.schedules || []).filter(function(s) {
            return s.remaining > 0;
        });

        // 활성 날짜 목록 추출 (중복 제거)
        var enabledDatesMap = {};
        classSchedules.forEach(function(s) {
            enabledDatesMap[s.schedule_date] = true;
        });
        var enabledDates = Object.keys(enabledDatesMap);

        // flatpickr 초기화
        var dateInput = document.getElementById('datePicker');
        if (dateInput && typeof flatpickr !== 'undefined') {
            var calendarContainer = document.querySelector('.class-detail');

            if (enabledDates.length === 0) {
                dateInput.placeholder = '\uB4F1\uB85D\uB41C \uC77C\uC815\uC774 \uC5C6\uC2B5\uB2C8\uB2E4';
                dateInput.disabled = true;
            } else {
                datePickerInstance = flatpickr(dateInput, {
                    locale: 'ko',
                    minDate: 'today',
                    dateFormat: 'Y-m-d',
                    disableMobile: true,
                    appendTo: calendarContainer,
                    enable: enabledDates,
                    onChange: function(selectedDates, dateStr) {
                        selectedDate = dateStr;
                        selectedScheduleId = '';
                        renderTimeSlots(dateStr, price);
                        validateBooking();
                    }
                });
            }
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

        // 선물하기 버튼
        var giftBtn = document.getElementById('bookingGift');
        if (giftBtn) {
            giftBtn.addEventListener('click', function() {
                handleGiftClick();
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
        var totalPrice = unitPrice * selectedQuantity;
        var mobilePrice = document.getElementById('mobilePrice');
        var mobilePriceUnit = document.getElementById('mobilePriceUnit');

        if (priceEl) {
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

        if (mobilePrice) {
            mobilePrice.textContent = formatPrice(totalPrice) + '\uC6D0';
        }
        if (mobilePriceUnit) {
            mobilePriceUnit.textContent = '/' + selectedQuantity + '\uBA85';
        }
    }

    /**
     * 선택 날짜의 시간대 슬롯 렌더링
     * @param {string} dateStr - YYYY-MM-DD
     * @param {number} unitPrice - 수강료
     */
    function renderTimeSlots(dateStr, unitPrice) {
        var container = document.getElementById('timeSlots');
        if (!container) {
            // 시간대 컨테이너가 없으면 datePicker 다음에 동적 생성
            var dateInput = document.getElementById('datePicker');
            if (dateInput && dateInput.parentNode) {
                container = document.createElement('div');
                container.id = 'timeSlots';
                container.className = 'cd-time-slots';
                dateInput.parentNode.insertBefore(container, dateInput.nextSibling);
            } else {
                return;
            }
        }

        var daySchedules = classSchedules.filter(function(s) {
            return s.schedule_date === dateStr && s.remaining > 0;
        });

        if (daySchedules.length === 0) {
            container.innerHTML = '<p class="cd-time-slots__empty">\uD574\uB2F9 \uB0A0\uC9DC\uC5D0 \uAC00\uB2A5\uD55C \uC2DC\uAC04\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
            return;
        }

        var html = '<p class="cd-time-slots__label">\uC2DC\uAC04 \uC120\uD0DD</p><div class="cd-time-slots__list">';
        daySchedules.forEach(function(s) {
            html += '<button type="button" class="cd-time-slot" data-schedule-id="' + escapeHtml(s.schedule_id) + '" data-remaining="' + s.remaining + '">'
                + '<span class="cd-time-slot__time">' + escapeHtml(s.schedule_time) + '</span>'
                + '<span class="cd-time-slot__remain">\uC794\uC5EC ' + s.remaining + '\uC11D</span>'
                + '</button>';
        });
        html += '</div>';
        container.innerHTML = html;

        // 시간 슬롯 클릭 이벤트
        var slots = container.querySelectorAll('.cd-time-slot');
        for (var i = 0; i < slots.length; i++) {
            slots[i].addEventListener('click', function() {
                // 활성 상태 토글
                for (var j = 0; j < slots.length; j++) {
                    slots[j].classList.remove('cd-time-slot--selected');
                }
                this.classList.add('cd-time-slot--selected');
                selectedScheduleId = this.getAttribute('data-schedule-id');

                // 최대 인원을 잔여석으로 제한
                var remaining = parseInt(this.getAttribute('data-remaining')) || DEFAULT_MAX_STUDENTS;
                var valueEl = document.getElementById('quantityValue');
                if (selectedQuantity > remaining) {
                    selectedQuantity = remaining;
                    if (valueEl) valueEl.textContent = selectedQuantity;
                }
                updateCounterButtons(remaining);
                updatePriceDisplay(unitPrice);
                validateBooking();
            });
        }
    }

    /**
     * 예약 유효성 검증
     */
    function validateBooking() {
        var submitBtn = document.getElementById('bookingSubmit');
        var giftBtn = document.getElementById('bookingGift');
        var mobileBtn = document.getElementById('mobileBookingBtn');
        var mobileGiftBtn = document.getElementById('mobileGiftBtn');
        var isValid = !!(selectedDate && selectedScheduleId);

        if (submitBtn) {
            submitBtn.disabled = !isValid;
        }
        if (giftBtn) {
            giftBtn.disabled = !isValid;
        }
        if (mobileBtn) {
            mobileBtn.disabled = !isValid;
        }
        if (mobileGiftBtn) {
            mobileGiftBtn.disabled = !isValid;
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
                window.location.href = buildLoginUrl(window.location.href);
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

        // 시간 미선택 시 경고
        if (!selectedScheduleId) {
            alert('\uc2dc\uac04\uc744 \uc120\ud0dd\ud574 \uc8fc\uc138\uc694.');
            return;
        }

        // 메이크샵 상품 정보: 개인결제 카테고리 (xcode=personal)
        var brandUid = classData.makeshop_product_id;
        if (!brandUid) {
            showToast('\ud301\uc815 \ucebc\ub798\uc2a4\uc758 \uc5f0\ub3d9 \uc0c1\ud488\uc774 \uc900\ube44\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4. \uc7a0\uc2dc \ud6c4 \ub2e4\uc2dc \uc2dc\ub3c4\ud574\uc8fc\uc138\uc694.', 'error');
            if (submitBtn) submitBtn.disabled = false;
            if (mobileBtn) mobileBtn.disabled = false;
            return;
        }
        var brandCode = classData.makeshop_brandcode || 'personal';
        var xCode = classData.makeshop_xcode || 'personal';
        var mCode = classData.makeshop_mcode || '';

        // 수강료 계산
        var unitPrice = classData.price || 50000;
        var totalPrice = unitPrice * selectedQuantity;
        var productName = classData.title || classData.class_name || '\uc555\ud654 \uae30\ubcf8 \uac15\uc758 \ud074\ub798\uc2a4';

        // WF-04 예약 기록 + 결제 페이지 이동
        submitBooking({
            className: productName,
            date: selectedDate,
            participants: selectedQuantity,
            totalPrice: totalPrice,
            brandUid: brandUid,
            brandCode: brandCode,
            xCode: xCode,
            mCode: mCode,
            productName: productName,
            productPrice: unitPrice
        });
    }

    /**
     * WF-04 예약 기록 후 결제 페이지 이동
     * @param {Object} info - className, date, participants, totalPrice, brandUid
     */
    function submitBooking(info) {
        // WF-04 POST 예약 기록
        var bookingData = {
            class_id: classData.class_id || classData.id || '',
            member_id: memberId,
            booking_date: info.date,
            schedule_id: selectedScheduleId,
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
            // 성공/실패 무관하게 결제 페이지로 이동 (예약 기록 실패해도 결제는 진행)
            if (!resData || !resData.success) {
                console.warn('[Booking] WF-04 \uc2e4\ud328, \ud3f4\ubc31 \uc774\ub3d9:', resData);
            }
            alert('\uc608\uc57d\uc774 \uc811\uc218\ub418\uc5c8\uc2b5\ub2c8\ub2e4.\n\uacb0\uc81c \ud398\uc774\uc9c0\ub85c \uc774\ub3d9\ud569\ub2c8\ub2e4.');
            goToCheckout(info.brandUid, info.participants, info.productName, info.brandCode, info.xCode, info.mCode);
        })
        .catch(function(err) {
            if (submitBtn) submitBtn.disabled = false;
            if (mobileBtn) mobileBtn.disabled = false;
            // 네트워크 오류 -> 폴백으로 결제 페이지 이동
            console.warn('[Booking] \ub124\ud2b8\uc6cc\ud06c \uc624\ub958, \ud3f4\ubc31 \uc774\ub3d9:', err);
            alert('\uc608\uc57d\uc774 \uc811\uc218\ub418\uc5c8\uc2b5\ub2c8\ub2e4.\n\uacb0\uc81c \ud398\uc774\uc9c0\ub85c \uc774\ub3d9\ud569\ub2c8\ub2e4.');
            goToCheckout(info.brandUid, info.participants, info.productName, info.brandCode, info.xCode, info.mCode);
        });
    }

    /**
     * basket.action.html POST 공통 함수 (바로 구매 → order.html)
     * - xcode=000, mcode=000 이 개인결제 상품에서 확인된 실제 값
     * - amount[] 로 수량(인원) 전달
     */
    function doBasketPost(brandUid, qty, productName, brandCode, xC, mC) {
        var pName = productName || '\ud30c\ud2b8\ub108 \ud074\ub798\uc2a4';
        var bCode = brandCode || '018001000251';
        var mCode2 = mC || '001';

        var params = new URLSearchParams();
        params.append('totalnum', '');
        params.append('collbrandcode', '');
        params.append('xcode', xC);
        params.append('mcode', mCode2);
        params.append('typep', 'X');
        params.append('aramount', '');
        params.append('arspcode', '');
        params.append('arspcode2', '');
        params.append('optionindex', '');
        params.append('alluid', '');
        params.append('alloptiontype', '');
        params.append('aropts', '');
        params.append('checktype', '');
        params.append('ordertype', 'baro|parent.|layer');
        params.append('brandcode', bCode);
        params.append('branduid', String(brandUid));
        params.append('cart_free', '');
        params.append('opt_type', 'NO');
        params.append('basket_use', 'Y');
        params.append('amount[]', String(qty));
        params.append('option[basic][0][0][opt_id]', '0');
        params.append('option[basic][0][0][opt_value]', pName);
        params.append('option[basic][0][0][opt_stock]', '1');
        params.append('option[basic][0][0][sto_id]', '1');
        params.append('option[basic][0][0][opt_type]', 'undefined');

        fetch('/shop/basket.action.html', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        })
        .then(function(resp) {
            if (!resp.ok) throw new Error('basket.action \uc2e4\ud328: ' + resp.status);
            return resp.json();
        })
        .then(function(data) {
            if (data && data.status && data.etc_data && data.etc_data.baro_type === 'baro') {
                window.location.href = '/shop/order.html';
            } else {
                window.location.href = '/shop/basket.html';
            }
        })
        .catch(function() {
            window.location.href = '/shop/order.html';
        });
    }

    /**
     * 메이크샵 즉시구매 진입점
     * - xcode=personal 상품: shopdetail.html을 fetch해서 brandcode 추출 후 basket.action.html POST
     *   (brandcode는 상품마다 다름: 000000000160, 000000000161 ...)
     * - 일반상품: brandCode/xCode/mCode 그대로 사용
     */
    function goToCheckout(brandUid, qty, productName, brandCode, xCode, mCode) {
        var xC = xCode || 'personal';

        if (xC === 'personal') {
            // shopdetail.html fetch → brandcode 추출 → basket.action.html POST (수량 반영)
            fetch('/shop/shopdetail.html?branduid=' + String(brandUid))
                .then(function(resp) { return resp.text(); })
                .then(function(html) {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(html, 'text/html');
                    var extractedBrandcode = '';
                    doc.querySelectorAll('input[name="brandcode"]').forEach(function(inp) {
                        if (inp.value && inp.value.length > 5) extractedBrandcode = inp.value;
                    });
                    if (extractedBrandcode) {
                        doBasketPost(brandUid, qty, productName, extractedBrandcode, '000', '000');
                    } else {
                        // brandcode 추출 실패 시 상품 상세로 이동 (fallback)
                        window.location.href = '/shop/shopdetail.html?branduid=' + String(brandUid);
                    }
                })
                .catch(function() {
                    window.location.href = '/shop/shopdetail.html?branduid=' + String(brandUid);
                });
            return;
        }

        // 일반상품: basket.action.html POST
        doBasketPost(brandUid, qty, productName, brandCode, xC, mCode || '001');
    }


    /* ========================================
       FAQ / 문의 (Task 010)
       ======================================== */

    function renderFaqSection(data) {
        var faqList = document.getElementById('faqList');
        var faqContact = document.getElementById('faqContact');
        var faqCategoryList = document.getElementById('faqCategoryList');
        var faqSearchInput = document.getElementById('faqSearchInput');
        var faqResultCount = document.getElementById('faqResultCount');
        var faqEmpty = document.getElementById('faqEmpty');
        if (!faqList || !faqContact || !faqCategoryList || !faqSearchInput || !faqResultCount || !faqEmpty) return;

        faqState.items = getResolvedFaqItems(data);
        faqState.category = FAQ_CATEGORY_ALL;
        faqState.keyword = '';
        faqSearchInput.value = '';

        bindFaqEvents();
        renderFaqCategoryFilters();
        renderFilteredFaqList();
        renderFaqContact(data);
    }

    function getResolvedFaqItems(data) {
        var rawFaqs = data ? (data.faq_items || data.faqItems || data.faq_items_json || data.faqItemsJson) : [];
        var customItems = normalizeFaqItems(parseFaqItemsValue(rawFaqs));
        var defaultItems = buildDefaultFaqItems(data || {});
        var merged = mergeFaqItems(customItems, defaultItems);

        if (merged.length > 15) {
            merged = merged.slice(0, 15);
        }
        return merged;
    }

    function parseFaqItemsValue(rawFaqs) {
        if (!rawFaqs) return [];
        if (Array.isArray(rawFaqs)) return rawFaqs;

        if (typeof rawFaqs === 'string') {
            var text = rawFaqs.replace(/^\s+|\s+$/g, '');
            if (!text) return [];
            try {
                var parsed = JSON.parse(text);
                if (Array.isArray(parsed)) return parsed;
                if (parsed && Array.isArray(parsed.items)) return parsed.items;
                if (parsed && Array.isArray(parsed.faqs)) return parsed.faqs;
            } catch (e) {
                return [];
            }
        }

        if (rawFaqs && Array.isArray(rawFaqs.items)) return rawFaqs.items;
        if (rawFaqs && Array.isArray(rawFaqs.faqs)) return rawFaqs.faqs;
        return [];
    }

    function normalizeFaqItems(items) {
        var normalized = [];
        var i;

        for (i = 0; i < items.length; i++) {
            var item = items[i] || {};
            var question = normalizeFaqText(item.q || item.question || item.title || item.name || '');
            var answer = normalizeFaqText(item.a || item.answer || item.desc || item.body || item.text || '');
            var category = normalizeFaqCategory(item.category || item.group || item.type || inferFaqCategory(question, answer));

            if (!question || !answer) continue;

            normalized.push({
                category: category,
                q: question,
                a: answer
            });
        }

        return normalized;
    }

    function buildDefaultFaqItems(data) {
        var levelText = normalizeLevelValue(data.level || '');
        var durationText = formatDuration(data.duration_min || 0);
        var priceText = data.price ? formatPrice(data.price) + '\uC6D0' : '\uC0C1\uC138 \uD398\uC774\uC9C0 \uC548\uB0B4 \uAE08\uC561';
        var classType = getClassTypeLabel(data);
        var locationText = getFaqLocationText(data, classType);
        var maxStudents = parseInt(data.max_students, 10);
        var partnerName = (data.partner && (data.partner.partner_name || data.partner.name)) ? (data.partner.partner_name || data.partner.name) : 'PRESSCO21 \uD30C\uD2B8\uB108 \uACF5\uBC29';
        var materialItems = getMaterialKitItems(data);
        var hasKit = materialItems.length > 0;
        var materialsNote = normalizeFaqText(getMaterialsNoteText(data, materialItems));
        var includedItems = getIncludesItems(data);
        var includedTitles = [];
        var includesSummary = '';
        var i;

        if (isNaN(maxStudents) || maxStudents <= 0) {
            maxStudents = DEFAULT_MAX_STUDENTS;
        }

        for (i = 0; i < includedItems.length; i++) {
            if (includedItems[i] && includedItems[i].title) {
                includedTitles.push(includedItems[i].title);
            }
        }
        includesSummary = includedTitles.length > 0 ? normalizeFaqText(includedTitles.join(', ')) : '\uAC15\uC758, \uC7AC\uB8CC\uD0A4\uD2B8, \uC218\uB8CC \uC548\uB0B4';

        return [
            {
                category: '\uC218\uAC15',
                q: '\uCC98\uC74C \uBC30\uC6B0\uB294 \uC0AC\uB78C\uB3C4 \uCC38\uC5EC\uD560 \uC218 \uC788\uB098\uC694?',
                a: (levelText ? '\uD604\uC7AC \uC774 \uC218\uC5C5\uC740 ' + levelText + ' \uB09C\uC774\uB3C4\uB85C \uC548\uB0B4\uB418\uACE0 \uC788\uACE0, ' : '') + '\uAC15\uC0AC\uAC00 \uB2E8\uACC4\uBCC4\uB85C \uC9C4\uD589\uD558\uAE30 \uB54C\uBB38\uC5D0 \uCD08\uBCF4\uC790\uB3C4 \uB530\uB77C\uC624\uAE30 \uC26C\uC6B4 \uAD6C\uC131\uC785\uB2C8\uB2E4. \uCC98\uC74C \uCC38\uC5EC\uD558\uB294 \uBD84\uC740 \uC218\uC5C5 \uC18C\uAC1C, \uCEE4\uB9AC\uD050\uB7FC, \uC18C\uC694 \uC2DC\uAC04' + (durationText ? ' ' + durationText : '') + '\uC744 \uD568\uAED8 \uBCF4\uACE0 \uC120\uD0DD\uD558\uC2DC\uBA74 \uC88B\uC2B5\uB2C8\uB2E4.'
            },
            {
                category: '\uC218\uAC15',
                q: '\uC218\uAC15\uB8CC\uC5D0 \uC5B4\uB5A4 \uB0B4\uC6A9\uC774 \uD3EC\uD568\uB418\uB098\uC694?',
                a: '\uD604\uC7AC \uC548\uB0B4 \uAE08\uC561\uC740 ' + priceText + ' \uAE30\uC900\uC774\uBA70, \uAE30\uBCF8 \uAC15\uC758 \uC9C4\uD589\uACFC \uC218\uC5C5 \uC548\uB0B4\uAC00 \uD3EC\uD568\uB429\uB2C8\uB2E4. \uC0C1\uB2E8 \u2018\uC774 \uAC00\uACA9\uC5D0 \uD3EC\uD568\uB41C \uAC83\u2019 \uC601\uC5ED\uC5D0\uC11C ' + includesSummary + ' \uAD6C\uC131\uC744 \uBC14\uB85C \uD655\uC778\uD560 \uC218 \uC788\uC5B4\uC694.'
            },
            {
                category: '\uC218\uAC15',
                q: '\uC624\uD504\uB77C\uC778\uACFC \uC628\uB77C\uC778 \uCC38\uC5EC \uBC29\uC2DD\uC740 \uC5B4\uB5BB\uAC8C \uD655\uC778\uD558\uB098\uC694?',
                a: locationText + ' ' + classType + ' \uC720\uD615\uC740 \uD074\uB798\uC2A4 \uAE30\uBCF8 \uC815\uBCF4\uC640 \uC77C\uC815 \uC120\uD0DD \uC601\uC5ED\uC5D0\uC11C \uD568\uAED8 \uBCF4\uC2E4 \uC218 \uC788\uACE0, \uC628\uB77C\uC778 \uC218\uC5C5\uC740 \uC608\uC57D \uD655\uC815 \uD6C4 \uC811\uC18D \uC548\uB0B4\uAC00 \uBCC4\uB3C4\uB85C \uC81C\uACF5\uB429\uB2C8\uB2E4.'
            },
            {
                category: '\uC218\uAC15',
                q: '\uD55C \uBC88\uC5D0 \uBA87 \uBA85\uAE4C\uC9C0 \uC608\uC57D\uD560 \uC218 \uC788\uB098\uC694?',
                a: '\uAE30\uBCF8 \uC608\uC57D \uC815\uC6D0\uC740 \uCD5C\uB300 ' + maxStudents + '\uBA85 \uAE30\uC900\uC73C\uB85C \uC6B4\uC601\uB429\uB2C8\uB2E4. \uB2E8\uCCB4 \uC218\uAC15, \uAE30\uC5C5/\uD611\uD68C \uC77C\uC815, \uCD94\uAC00 \uC778\uC6D0 \uC870\uC815\uC740 \uD558\uB2E8 \uBB38\uC758\uD558\uAE30\uC5D0\uC11C \uBA3C\uC800 \uC0C1\uB2F4\uD574 \uC8FC\uC138\uC694.'
            },
            {
                category: '\uD0A4\uD2B8\u00B7\uBC30\uC1A1',
                q: '\uC7AC\uB8CC\uB098 \uB3C4\uAD6C\uB294 \uB530\uB85C \uC900\uBE44\uD574\uC57C \uD558\uB098\uC694?',
                a: materialsNote + (hasKit ? ' \uD604\uC7AC \uC790\uC0AC\uBAB0 \uC5F0\uB3D9 \uC7AC\uB8CC\uB294 ' + materialItems.length + '\uAC1C \uAE30\uC900\uC73C\uB85C \uD655\uC778\uD560 \uC218 \uC788\uC5B4, \uC218\uC5C5 \uC804 \uBBF8\uB9AC \uAD6C\uC131\uC744 \uBCF4\uACE0 \uC900\uBE44\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.' : '')
            },
            {
                category: '\uD0A4\uD2B8\u00B7\uBC30\uC1A1',
                q: '\uD0A4\uD2B8 \uD3EC\uD568 \uC218\uC5C5\uC774\uBA74 \uC5B8\uC81C \uBC30\uC1A1\uB418\uB098\uC694?',
                a: '\uD0A4\uD2B8 \uD3EC\uD568 \uB610\uB294 \uC0AC\uC804 \uC900\uBE44\uAC00 \uD544\uC694\uD55C \uC218\uC5C5\uC740 \uC608\uC57D \uD655\uC815 \uD6C4 \uC77C\uC815\uC5D0 \uB9DE\uCD98 \uC21C\uCC28 \uC548\uB0B4\uC640 \uBC1C\uC1A1\uC774 \uC9C4\uD589\uB429\uB2C8\uB2E4. \uC624\uD504\uB77C\uC778 \uC218\uC5C5\uC740 \uD604\uC7A5 \uC900\uBE44 \uAE30\uC900, \uC628\uB77C\uC778 \uC218\uC5C5\uC740 \uD0DD\uBC30 \uBCF4\uB0B4\uAE30 \uC77C\uC815\uC744 \uD568\uAED8 \uC548\uB0B4\uD574 \uB4DC\uB9BD\uB2C8\uB2E4.'
            },
            {
                category: '\uD0A4\uD2B8\u00B7\uBC30\uC1A1',
                q: '\uBC30\uC1A1\uC9C0\uB97C \uBC14\uAFB8\uAC70\uB098 \uBD80\uC7AC\uC911 \uC218\uB839\uC774 \uAC71\uC815\uB3FC\uC694.',
                a: '\uACB0\uC81C \uD6C4 \uBC1C\uC1A1 \uC804 \uB2E8\uACC4\uC5D0\uC11C \uBB38\uC758 \uCC44\uB110\uB85C \uC54C\uB824 \uC8FC\uC2DC\uBA74 \uBCC0\uACBD \uAC00\uB2A5 \uC5EC\uBD80\uB97C \uD655\uC778\uD574 \uB4DC\uB9BD\uB2C8\uB2E4. \uC774\uBBF8 \uCD9C\uACE0\uB41C \uB4A4\uC5D0\uB294 \uD0DD\uBC30\uC0AC \uC815\uCC45\uC5D0 \uB530\uB77C \uC870\uC815\uB418\uBBC0\uB85C \uAC00\uB2A5\uD55C \uD55C \uBE60\uB974\uAC8C \uC694\uCCAD\uD574 \uC8FC\uC138\uC694.'
            },
            {
                category: '\uD0A4\uD2B8\u00B7\uBC30\uC1A1',
                q: '\uBC1B\uC740 \uD0A4\uD2B8\uC5D0 \uB204\uB77D\uC774\uB098 \uD30C\uC190\uC774 \uC788\uC73C\uBA74 \uC5B4\uB5BB\uAC8C \uD558\uB098\uC694?',
                a: '\uC0AC\uC9C4\uACFC \uD568\uAED8 \uC5F0\uB77D \uC8FC\uC2DC\uBA74 \uBB38\uC81C \uD655\uC778 \uD6C4 \uC7AC\uBC1C\uC1A1 \uB610\uB294 \uB300\uCCB4 \uC548\uB0B4\uB97C \uB3C4\uC640\uB4DC\uB9BD\uB2C8\uB2E4. \uC218\uC5C5 \uB2F9\uC77C \uC9C4\uD589\uC5D0 \uC601\uD5A5\uC774 \uC5C6\uB3C4\uB85D \uAC00\uB2A5\uD55C \uD55C \uBE60\uB974\uAC8C \uC811\uC218\uD574 \uC8FC\uC138\uC694.'
            },
            {
                category: '\uD0A4\uD2B8\u00B7\uBC30\uC1A1',
                q: '\uC218\uC5C5 \uD6C4 \uAC19\uC740 \uC7AC\uB8CC\uB97C \uB2E4\uC2DC \uAD6C\uB9E4\uD560 \uC218 \uC788\uB098\uC694?',
                a: '\uC608. \uC0C1\uC138 \uD398\uC774\uC9C0 \uC7AC\uB8CC \uC139\uC158\uACFC \uC218\uAC15 \uC644\uB8CC \uD6C4 \uB9C8\uC774\uD398\uC774\uC9C0\uC5D0\uC11C \uAC19\uC740 \uC7AC\uB8CC \uB2E4\uC2DC \uBCF4\uAE30 \uB3D9\uC120\uC744 \uC81C\uACF5\uD569\uB2C8\uB2E4. \uB9C8\uC74C\uC5D0 \uB4E0 \uC7AC\uB8CC\uB294 \uC790\uC0AC\uBAB0 \uC0C1\uD488\uC73C\uB85C \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uC774\uC5B4\uC11C \uAD6C\uB9E4\uD560 \uC218 \uC788\uC5B4\uC694.'
            },
            {
                category: '\uD30C\uD2B8\uB108',
                q: '\uC218\uC5C5\uC744 \uC9C4\uD589\uD558\uB294 \uAC15\uC0AC\uC640 \uACF5\uBC29\uC740 \uC5B4\uB5A4 \uAE30\uC900\uC73C\uB85C \uC120\uC815\uB418\uB098\uC694?',
                a: 'PRESSCO21 \uD30C\uD2B8\uB108 \uAE30\uC900\uC73C\uB85C \uC6B4\uC601 \uAC00\uC774\uB4DC, \uACE0\uAC1D \uC751\uB300, \uC218\uC5C5 \uC18C\uAC1C \uD488\uC9C8\uC744 \uB9DE\uCD98 \uD30C\uD2B8\uB108\uAC00 \uC218\uC5C5\uC744 \uC6B4\uC601\uD569\uB2C8\uB2E4. \uD604\uC7AC \uD074\uB798\uC2A4\uB294 ' + normalizeFaqText(partnerName) + '\uAC00 \uC9C4\uD589\uD558\uBA70, \uC0C1\uC138 \uC18C\uAC1C\uC640 \uD6C4\uAE30\uB97C \uD1B5\uD574 \uC2A4\uD0C0\uC77C\uC744 \uBA3C\uC800 \uD655\uC778\uD560 \uC218 \uC788\uC5B4\uC694.'
            },
            {
                category: '\uD30C\uD2B8\uB108',
                q: '\uAC15\uC0AC\uB098 \uACF5\uBC29 \uC77C\uC815\uC774 \uBC14\uB00C\uBA74 \uC5B4\uB5BB\uAC8C \uC548\uB0B4\uB418\uB098\uC694?',
                a: '\uC77C\uC815 \uBCC0\uACBD, \uC9C4\uD589 \uC7A5\uC18C \uC870\uC815, \uC6B4\uC601 \uC774\uC288\uAC00 \uBC1C\uC0DD\uD558\uBA74 \uB4F1\uB85D\uB41C \uC5F0\uB77D\uCC98\uB85C \uBA3C\uC800 \uC548\uB0B4\uB4DC\uB9AC\uACE0 \uAC00\uB2A5\uD55C \uB300\uCCB4 \uC77C\uC815\uC774\uB098 \uD6C4\uC18D \uC870\uCE58\uB97C \uD568\uAED8 \uC548\uB0B4\uD569\uB2C8\uB2E4. \uC0C1\uC138 \uD398\uC774\uC9C0\uC5D0\uC11C\uB3C4 \uB0A8\uC740 \uC88C\uC11D\uACFC \uC77C\uC815 \uC0C1\uD0DC\uB97C \uC2E4\uC2DC\uAC04\uC73C\uB85C \uD655\uC778\uD560 \uC218 \uC788\uC5B4\uC694.'
            },
            {
                category: '\uC815\uC0B0',
                q: '\uCDE8\uC18C\uC640 \uD658\uBD88\uC740 \uC5B4\uB5A4 \uAE30\uC900\uC73C\uB85C \uCC98\uB9AC\uB418\uB098\uC694?',
                a: '\uAE30\uBCF8 \uD658\uBD88 \uAE30\uC900\uC740 \uC218\uC5C5 3\uC77C \uC804\uAE4C\uC9C0 \uC804\uC561, 2\uC77C \uC804 50%, 1\uC77C \uC804\uACFC \uB2F9\uC77C\uC740 \uD658\uBD88\uC774 \uC5B4\uB824\uC6B4 \uC815\uCC45\uC744 \uAE30\uBCF8\uC73C\uB85C \uC801\uC6A9\uD569\uB2C8\uB2E4. \uC608\uC57D \uBCC0\uACBD\uC774\uB098 \uC608\uC678 \uC0C1\uD669\uC740 \uACE0\uAC1D\uC13C\uD130 \uD655\uC778 \uD6C4 \uBCC4\uB3C4 \uC548\uB0B4\uB418\uB2C8 \uBA3C\uC800 \uBB38\uC758\uD574 \uC8FC\uC138\uC694.'
            },
            {
                category: '\uC815\uC0B0',
                q: '\uD6C4\uAE30 \uC774\uBCA4\uD2B8\uB098 \uC801\uB9BD\uAE08 \uD61C\uD0DD\uC740 \uC5B8\uC81C \uBC18\uC601\uB418\uB098\uC694?',
                a: '\uD6C4\uAE30 \uC791\uC131 \uD61C\uD0DD, \uC774\uBCA4\uD2B8 \uC801\uB9BD\uAE08, \uC7AC\uAD6C\uB9E4 \uD61C\uD0DD\uC740 \uC6B4\uC601 \uD655\uC778 \uD6C4 \uC21C\uCC28 \uBC18\uC601\uB429\uB2C8\uB2E4. \uC9C0\uAE09 \uD0C0\uC774\uBC0D\uC774 \uC815\uD574\uC9C4 \uD504\uB85C\uBAA8\uC158\uC740 \uC0C1\uC138 \uACF5\uC9C0\uC640 \uC54C\uB9BC \uBA54\uC2DC\uC9C0\uB85C \uB2E4\uC2DC \uC548\uB0B4\uD574 \uB4DC\uB9BD\uB2C8\uB2E4.'
            },
            {
                category: '\uC815\uC0B0',
                q: '\uD604\uAE08\uC601\uC218\uC99D\uC774\uB098 \uACB0\uC81C \uC99D\uBE59\uC740 \uBC1B\uC744 \uC218 \uC788\uB098\uC694?',
                a: '\uC790\uC0AC\uBAB0 \uC8FC\uBB38 \uAE30\uC900\uC73C\uB85C \uACB0\uC81C \uB0B4\uC5ED \uD655\uC778\uC774 \uAC00\uB2A5\uD558\uBA70, \uD544\uC694 \uC2DC \uACE0\uAC1D\uC13C\uD130\uB97C \uD1B5\uD574 \uD604\uAE08\uC601\uC218\uC99D \uB610\uB294 \uAC00\uB2A5\uD55C \uBC94\uC704\uC758 \uACB0\uC81C \uC99D\uBE59 \uC548\uB0B4\uB97C \uBC1B\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4.'
            },
            {
                category: '\uAE30\uD0C0',
                q: '\uC8FC\uCC28, \uB3D9\uBC18 \uCC38\uC5EC, \uB2E8\uCCB4 \uC218\uC5C5 \uBB38\uC758\uB294 \uC5B4\uB514\uB85C \uD558\uBA74 \uB418\uB098\uC694?',
                a: '\uD558\uB2E8 \uBB38\uC758\uD558\uAE30\uC758 \uC804\uD654, \uCE74\uCE74\uC624\uD1A1, \uC778\uC2A4\uD0C0\uADF8\uB7A8 \uCC44\uB110 \uC911 \uD3B8\uD55C \uBC29\uC2DD\uC73C\uB85C \uB0A8\uACA8 \uC8FC\uC138\uC694. \uC8FC\uCC28 \uAC00\uB2A5 \uC5EC\uBD80, \uBCF4\uD638\uC790 \uB3D9\uBC18, \uAE30\uC5C5/\uD611\uD68C \uB2E8\uCCB4 \uC218\uC5C5 \uC870\uC728\uB3C4 \uAC19\uC740 \uCC44\uB110\uC5D0\uC11C \uC548\uB0B4\uD574 \uB4DC\uB9BD\uB2C8\uB2E4.'
            }
        ];
    }

    function mergeFaqItems(primaryItems, fallbackItems) {
        var merged = [];
        var seen = {};
        var groups = [primaryItems || [], fallbackItems || []];
        var i;
        var j;

        for (i = 0; i < groups.length; i++) {
            for (j = 0; j < groups[i].length; j++) {
                var item = groups[i][j];
                var key = normalizeFaqText(item.q || '').toLowerCase();
                if (!key || seen[key]) continue;
                seen[key] = true;
                merged.push(item);
            }
        }

        return merged;
    }

    function normalizeFaqText(text) {
        return String(text || '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
    }

    function normalizeFaqCategory(raw) {
        var text = normalizeFaqText(raw);

        if (!text) return '\uC218\uAC15';
        if (text === FAQ_CATEGORY_ALL) return FAQ_CATEGORY_ALL;
        if (normalizedContains(text, '\uD0A4\uD2B8') || normalizedContains(text, '\uBC30\uC1A1') || normalizedContains(text, '\uD0DD\uBC30') || normalizedContains(text, 'kit') || normalizedContains(text, 'delivery')) return '\uD0A4\uD2B8\u00B7\uBC30\uC1A1';
        if (normalizedContains(text, '\uD30C\uD2B8\uB108') || normalizedContains(text, '\uAC15\uC0AC') || normalizedContains(text, '\uACF5\uBC29') || normalizedContains(text, '\uD611\uD68C') || normalizedContains(text, 'partner')) return '\uD30C\uD2B8\uB108';
        if (normalizedContains(text, '\uC815\uC0B0') || normalizedContains(text, '\uD658\uBD88') || normalizedContains(text, '\uACB0\uC81C') || normalizedContains(text, '\uC801\uB9BD\uAE08') || normalizedContains(text, '\uC601\uC218\uC99D') || normalizedContains(text, 'payment') || normalizedContains(text, 'refund')) return '\uC815\uC0B0';
        if (normalizedContains(text, '\uAE30\uD0C0') || normalizedContains(text, '\uB2E8\uCCB4') || normalizedContains(text, '\uC8FC\uCC28') || normalizedContains(text, 'etc')) return '\uAE30\uD0C0';
        return '\uC218\uAC15';
    }

    function inferFaqCategory(question, answer) {
        var text = normalizeFaqText(question + ' ' + answer);

        if (!text) return '\uC218\uAC15';
        if (normalizedContains(text, '\uD0A4\uD2B8') || normalizedContains(text, '\uBC30\uC1A1') || normalizedContains(text, '\uC7AC\uB8CC') || normalizedContains(text, '\uD0DD\uBC30')) return '\uD0A4\uD2B8\u00B7\uBC30\uC1A1';
        if (normalizedContains(text, '\uD30C\uD2B8\uB108') || normalizedContains(text, '\uAC15\uC0AC') || normalizedContains(text, '\uACF5\uBC29') || normalizedContains(text, '\uD611\uD68C')) return '\uD30C\uD2B8\uB108';
        if (normalizedContains(text, '\uD658\uBD88') || normalizedContains(text, '\uACB0\uC81C') || normalizedContains(text, '\uC801\uB9BD\uAE08') || normalizedContains(text, '\uC601\uC218\uC99D') || normalizedContains(text, '\uC815\uC0B0')) return '\uC815\uC0B0';
        if (normalizedContains(text, '\uC8FC\uCC28') || normalizedContains(text, '\uB2E8\uCCB4') || normalizedContains(text, '\uB3D9\uBC18')) return '\uAE30\uD0C0';
        return '\uC218\uAC15';
    }

    function getFaqLocationText(data, classType) {
        var location = normalizeFaqText(data.location || '');

        if (String(data.type || '').toUpperCase() === 'ONLINE' || normalizedContains(classType, '\uC628\uB77C\uC778')) {
            return '\uC628\uB77C\uC778 \uC218\uC5C5\uC740 \uC608\uC57D \uD655\uC815 \uD6C4 \uC811\uC18D \uB9C1\uD06C\uC640 \uCC38\uC5EC \uBC29\uC2DD\uC744 \uBCC4\uB3C4\uB85C \uC548\uB0B4\uD574 \uB4DC\uB9BD\uB2C8\uB2E4.';
        }

        if (location) {
            return '\uC218\uC5C5 \uC9C4\uD589 \uC7A5\uC18C\uB294 ' + location + ' \uAE30\uC900\uC73C\uB85C \uC548\uB0B4\uB418\uACE0 \uC788\uC5B4\uC694.';
        }

        return '\uC9C4\uD589 \uC7A5\uC18C\uC640 \uCC38\uC5EC \uBC29\uC2DD\uC740 \uC608\uC57D \uC804 \uC0C1\uC138 \uC815\uBCF4\uC5D0\uC11C \uD655\uC778\uD560 \uC218 \uC788\uACE0, \uD544\uC694 \uC2DC \uBCC4\uB3C4 \uC548\uB0B4\uAC00 \uD568\uAED8 \uC81C\uACF5\uB429\uB2C8\uB2E4.';
    }

    function bindFaqEvents() {
        var faqList = document.getElementById('faqList');
        var faqCategoryList = document.getElementById('faqCategoryList');
        var faqSearchInput = document.getElementById('faqSearchInput');

        if (faqCategoryList && faqCategoryList.getAttribute('data-bound') !== 'true') {
            faqCategoryList.setAttribute('data-bound', 'true');
            faqCategoryList.addEventListener('click', function(e) {
                var button = e.target.closest('.faq-category-btn');
                if (!button) return;

                faqState.category = button.getAttribute('data-category') || FAQ_CATEGORY_ALL;
                renderFaqCategoryFilters();
                renderFilteredFaqList();
            });
        }

        if (faqSearchInput && faqSearchInput.getAttribute('data-bound') !== 'true') {
            faqSearchInput.setAttribute('data-bound', 'true');
            faqSearchInput.addEventListener('input', function() {
                faqState.keyword = normalizeFaqText(faqSearchInput.value);
                renderFilteredFaqList();
            });
        }

        if (faqList && faqList.getAttribute('data-bound') !== 'true') {
            faqList.setAttribute('data-bound', 'true');
            faqList.addEventListener('click', function(e) {
                var button = e.target.closest('.faq-item__question');
                if (!button) return;

                var item = button.closest('.faq-item');
                var answer = item ? item.querySelector('.faq-item__answer') : null;
                var isExpanded = button.getAttribute('aria-expanded') === 'true';
                var openButtons = faqList.querySelectorAll('.faq-item__question[aria-expanded="true"]');
                var i;

                for (i = 0; i < openButtons.length; i++) {
                    if (openButtons[i] === button) continue;
                    closeFaqItem(openButtons[i]);
                }

                if (isExpanded) {
                    closeFaqItem(button);
                    return;
                }

                button.setAttribute('aria-expanded', 'true');
                if (item) item.classList.add('is-open');
                if (answer) answer.removeAttribute('hidden');
            });
        }
    }

    function closeFaqItem(button) {
        var item = button ? button.closest('.faq-item') : null;
        var answer = item ? item.querySelector('.faq-item__answer') : null;
        if (!button) return;

        button.setAttribute('aria-expanded', 'false');
        if (item) item.classList.remove('is-open');
        if (answer) answer.setAttribute('hidden', 'hidden');
    }

    function renderFaqCategoryFilters() {
        var faqCategoryList = document.getElementById('faqCategoryList');
        var counts = getFaqCategoryCounts(faqState.items);
        var html = '';
        var i;

        if (!faqCategoryList) return;

        for (i = 0; i < FAQ_CATEGORY_ORDER.length; i++) {
            var category = FAQ_CATEGORY_ORDER[i];
            var count = category === FAQ_CATEGORY_ALL ? faqState.items.length : (counts[category] || 0);
            if (category !== FAQ_CATEGORY_ALL && count === 0) continue;

            html += '<button type="button" class="faq-category-btn' + (faqState.category === category ? ' is-active' : '') + '" data-category="' + escapeHtml(category) + '">'
                + '<span class="faq-category-btn__label">' + escapeHtml(category) + '</span>'
                + '<span class="faq-category-btn__count">' + escapeHtml(String(count)) + '</span>'
                + '</button>';
        }

        faqCategoryList.innerHTML = html;
    }

    function getFaqCategoryCounts(items) {
        var counts = {};
        var i;

        for (i = 0; i < items.length; i++) {
            var category = normalizeFaqCategory(items[i].category || '');
            counts[category] = (counts[category] || 0) + 1;
        }

        return counts;
    }

    function renderFilteredFaqList() {
        var faqList = document.getElementById('faqList');
        var faqEmpty = document.getElementById('faqEmpty');
        var faqResultCount = document.getElementById('faqResultCount');
        var filteredItems = filterFaqItems(faqState.items, faqState.category, faqState.keyword);
        var html = '';
        var i;

        if (!faqList || !faqEmpty || !faqResultCount) return;

        if (filteredItems.length === 0) {
            faqList.innerHTML = '';
            faqEmpty.style.display = 'block';
            faqEmpty.innerHTML = '<p class="faq-empty__title">\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC5B4\uC694.</p>'
                + '<p class="faq-empty__desc">\uD2B9\uC815 \uB2E8\uC5B4\uB97C \uBE7C\uAC70\uB098 \uB2E4\uB978 \uCE74\uD14C\uACE0\uB9AC\uB97C \uC120\uD0DD\uD574 \uBCF4\uC138\uC694. \uCC3E\uB294 \uB2F5\uC774 \uC5C6\uC73C\uBA74 \uD558\uB2E8 \uBB38\uC758 \uCC44\uB110\uC5D0\uC11C \uBC14\uB85C \uB3C4\uC640\uB4DC\uB9BD\uB2C8\uB2E4.</p>';
        } else {
            for (i = 0; i < filteredItems.length; i++) {
                var item = filteredItems[i];
                var answerId = 'faqAnswer' + i;
                html += '<article class="faq-item" data-category="' + escapeHtml(item.category) + '">'
                    + '<button type="button" class="faq-item__question" aria-expanded="false" aria-controls="' + answerId + '">'
                    + '<span class="faq-item__question-copy">'
                    + '<span class="faq-item__category">' + escapeHtml(item.category) + '</span>'
                    + '<span class="faq-item__title">' + escapeHtml(item.q) + '</span>'
                    + '</span>'
                    + '<svg class="faq-item__arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
                    + '</button>'
                    + '<div class="faq-item__answer" id="' + answerId + '" hidden>'
                    + '<p>' + escapeHtml(item.a) + '</p>'
                    + '</div>'
                    + '</article>';
            }

            faqList.innerHTML = html;
            faqEmpty.style.display = 'none';
            faqEmpty.innerHTML = '';
        }

        faqResultCount.textContent = buildFaqResultMessage(filteredItems.length, faqState.items.length, faqState.category, faqState.keyword);
    }

    function filterFaqItems(items, category, keyword) {
        var filtered = [];
        var normalizedKeyword = normalizeFaqText(keyword).toLowerCase();
        var normalizedCategory = normalizeFaqCategory(category);
        var i;

        for (i = 0; i < items.length; i++) {
            var item = items[i];
            var haystack = (item.q + ' ' + item.a + ' ' + item.category).toLowerCase();
            var sameCategory = normalizedCategory === FAQ_CATEGORY_ALL || normalizeFaqCategory(item.category) === normalizedCategory;
            var matchesKeyword = !normalizedKeyword || haystack.indexOf(normalizedKeyword) > -1;

            if (sameCategory && matchesKeyword) {
                filtered.push(item);
            }
        }

        return filtered;
    }

    function buildFaqResultMessage(filteredCount, totalCount, category, keyword) {
        var parts = [];
        var normalizedCategory = normalizeFaqCategory(category);

        if (normalizedCategory !== FAQ_CATEGORY_ALL) {
            parts.push(normalizedCategory);
        } else {
            parts.push('\uC804\uCCB4 FAQ');
        }

        if (keyword) {
            parts.push('"' + keyword + '" \uAC80\uC0C9');
        }

        return parts.join(' / ') + ' \uAE30\uC900 ' + filteredCount + '\uAC1C \uD56D\uBAA9\uC774 \uBCF4\uC785\uB2C8\uB2E4. \uC804\uCCB4\uB294 ' + totalCount + '\uAC1C \uC785\uB2C8\uB2E4.';
    }

    function renderFaqContact(data) {
        var faqContact = document.getElementById('faqContact');
        var phoneRaw = normalizeFaqText(data.contact_phone || '');
        var instagramRaw = normalizeFaqText(data.contact_instagram || (data.partner && data.partner.instagram_url) || '');
        var kakaoRaw = normalizeFaqText(data.contact_kakao || '');
        var phoneHref = 'tel:' + (phoneRaw || '010-9848-5520').replace(/[^0-9+]/g, '');
        var phoneLabel = phoneRaw || '010-9848-5520';
        var kakaoHref = /^https?:\/\//i.test(kakaoRaw) ? kakaoRaw : 'https://pf.kakao.com/_pressco21';
        var contactHtml = '';

        if (!faqContact) return;

        contactHtml += '<h3 class="faq-contact__title">\uCC3E\uB294 \uB2F5\uC774 \uC5C6\uB2E4\uBA74 \uBC14\uB85C \uBB38\uC758\uD558\uC138\uC694</h3>'
            + '<div class="faq-contact__links">'
            + '<a href="' + phoneHref + '" class="faq-contact__link faq-contact__link--phone">'
            + '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M6 7a7.5 7.5 0 003 3l1.35-1.35a.5.5 0 01.52-.12 5.7 5.7 0 001.78.28.5.5 0 01.5.5V12a.5.5 0 01-.5.5A10.5 10.5 0 013.5 3.35a.5.5 0 01.5-.5h2.68a.5.5 0 01.5.5 5.7 5.7 0 00.28 1.78.5.5 0 01-.12.52L6 7z" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            + '\uC804\uD654 \uBB38\uC758'
            + '</a>'
            + '<a href="' + escapeHtml(kakaoHref) + '" target="_blank" rel="noopener" class="faq-contact__link faq-contact__link--kakao">'
            + '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.65 5.36 4.16 6.94L5 21l4.38-2.35C10.22 18.88 11.1 19 12 19c5.52 0 10-3.58 10-8S17.52 3 12 3z"/></svg>'
            + '\uCE74\uCE74\uC624\uD1A1 \uBB38\uC758'
            + '</a>';

        if (instagramRaw) {
            contactHtml += '<a href="' + escapeHtml(instagramRaw) + '" target="_blank" rel="noopener" class="faq-contact__link faq-contact__link--insta">'
                + '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><rect x="2" y="2" width="12" height="12" rx="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="8" r="2.5"/><circle cx="11.5" cy="4.5" r="0.7" fill="currentColor" stroke="none"/></svg>'
                + '\uC778\uC2A4\uD0C0\uADF8\uB7A8'
                + '</a>';
        }

        contactHtml += '</div>'
            + '<p class="faq-contact__hours">\uC6B4\uC601\uC2DC\uAC04: \uD3C9\uC77C 10:00 ~ 18:00 (\uC8FC\uB9D0/\uACF5\uD734\uC77C \uD734\uBB34) | \uC5F0\uB77D\uCC98: ' + escapeHtml(phoneLabel) + ' | \uC77C\uC815 \uBCC0\uACBD, \uD0A4\uD2B8 \uBC30\uC1A1, \uB2E8\uCCB4 \uBB38\uC758\uAE4C\uC9C0 \uAC19\uC740 \uCC44\uB110\uC5D0\uC11C \uB3C4\uC640\uB4DC\uB9BD\uB2C8\uB2E4.</p>';

        faqContact.innerHTML = contactHtml;
    }


    /* ========================================
       선물하기 (Task 012)
       ======================================== */

    function handleGiftClick() {
        if (!classData) return;

        if (!memberId) {
            if (confirm('\uc120\ubb3c\ud558\uae30\ub294 \ub85c\uadf8\uc778 \ud6c4 \uc774\uc6a9\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.\n\ub85c\uadf8\uc778 \ud398\uc774\uc9c0\ub85c \uc774\ub3d9\ud558\uc2dc\uaca0\uc2b5\ub2c8\uae4c?')) {
                window.location.href = buildLoginUrl(window.location.href);
            }
            return;
        }

        if (!selectedDate || !selectedScheduleId) {
            alert('\ub0a0\uc9dc\uc640 \uc2dc\uac04\uc744 \uba3c\uc800 \uc120\ud0dd\ud574 \uc8fc\uc138\uc694.');
            return;
        }

        var brandUid = classData.makeshop_product_id;
        if (!brandUid) {
            showToast('\uc5f0\ub3d9 \uc0c1\ud488\uc774 \uc900\ube44\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4.', 'error');
            return;
        }

        try {
            sessionStorage.setItem('pressco21_pending_gift', JSON.stringify({
                class_id: classData.class_id || classData.id || '',
                schedule_id: selectedScheduleId,
                schedule_date: selectedDate,
                quantity: selectedQuantity,
                return_url: window.location.href
            }));
        } catch (e) {
            /* 세션 저장 실패는 무시 */
        }

        setGiftButtonBusy(true);

        resolveGiftProductMeta(brandUid)
            .then(function(meta) {
                if (!meta || !meta.brandCode) {
                    setGiftButtonBusy(false);
                    showToast('\uBA54\uC774\uD06C\uC0F5 \uC120\uBB3C\uD558\uAE30 \uAD6C\uC131\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.', 'error');
                    return;
                }

                if (meta.nativeGiftUrl) {
                    window.location.href = meta.nativeGiftUrl;
                    return;
                }

                submitGiftCheckout(meta, selectedQuantity || 1);
            })
            .catch(function(err) {
                console.warn('[ClassDetail] \uC120\uBB3C\uD558\uAE30 \uBA54\uD0C0 \uD655\uC778 \uC2E4\uD328:', err);
                setGiftButtonBusy(false);
                showToast('\uC120\uBB3C \uC8FC\uBB38\uC11C\uB97C \uC5F4\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.', 'error');
            });
    }

    function setGiftButtonBusy(isBusy) {
        var giftBtn = document.getElementById('bookingGift');
        var mobileGiftBtn = document.getElementById('mobileGiftBtn');
        var buttons = [];
        var i = 0;

        if (giftBtn) buttons.push(giftBtn);
        if (mobileGiftBtn) buttons.push(mobileGiftBtn);
        if (buttons.length === 0) return;

        for (i = 0; i < buttons.length; i++) {
            buttons[i].classList[isBusy ? 'add' : 'remove']('is-loading');
            buttons[i].setAttribute('aria-busy', isBusy ? 'true' : 'false');

            if (isBusy) {
                buttons[i].disabled = true;
            } else {
                buttons[i].disabled = !(selectedDate && selectedScheduleId);
            }
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
            'reviews': document.getElementById('tabReviews'),
            'faq': document.getElementById('tabFaq')
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
                var keys = ['description', 'curriculum', 'instructor', 'reviews', 'faq'];
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
                'name': (data.partner && (data.partner.partner_name || data.partner.name)) ? (data.partner.partner_name || data.partner.name) : 'PRESSCO21',
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

        // FAQPage 스키마: 실제 FAQ 데이터 기준으로 생성
        var faqItems = getResolvedFaqItems(data);
        if (faqItems && faqItems.length > 0) {
            var faqEntries = [];
            for (var i = 0; i < faqItems.length; i++) {
                var item = faqItems[i];
                var qTitle = item.q || '';
                var aDesc = String(item.a || '').replace(/<[^>]+>/g, '');
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
        var partnerName = (data.partner && (data.partner.partner_name || data.partner.name)) ? (data.partner.partner_name || data.partner.name) : '';
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
        var mobileGiftBtn = document.getElementById('mobileGiftBtn');
        if (mobileBtn) {
            mobileBtn.addEventListener('click', function() {
                handleBookingClick();
            });
        }
        if (mobileGiftBtn) {
            mobileGiftBtn.addEventListener('click', function() {
                handleGiftClick();
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

    function buildLoginUrl(returnUrl) {
        var url = '/shop/member.html?type=login';
        if (returnUrl) {
            url += '&returnUrl=' + encodeURIComponent(returnUrl);
        }
        return url;
    }

    function normalizeLevelValue(raw) {
        var text = String(raw || '').replace(/\s+/g, ' ').trim();
        var normalized = text.toLowerCase();
        var upper = text.toUpperCase();

        if (!text) return '';
        if (upper === 'BEGINNER' || normalized === 'beginner' || normalized === 'basic' || text.indexOf('\uC785\uBB38') > -1 || text.indexOf('\uCD08\uAE09') > -1) return '\uC785\uBB38';
        if (upper === 'INTERMEDIATE' || normalized === 'intermediate' || text.indexOf('\uC911\uAE09') > -1) return '\uC911\uAE09';
        if (upper === 'ADVANCED' || normalized === 'advanced' || normalized === 'expert' || text.indexOf('\uC2EC\uD654') > -1 || text.indexOf('\uACE0\uAE09') > -1) return '\uC2EC\uD654';
        if (upper === 'ALL_LEVELS' || text.indexOf('\uC804\uCCB4') > -1) return '\uC804\uCCB4';
        return text;
    }

    function getPrimaryRegion(raw) {
        var text = String(raw || '').replace(/\s+/g, ' ').trim();
        var upper = text.toUpperCase();
        var codeMap = {
            SEOUL: '\uC11C\uC6B8',
            GYEONGGI: '\uACBD\uAE30',
            INCHEON: '\uC778\uCC9C',
            BUSAN: '\uBD80\uC0B0',
            DAEGU: '\uB300\uAD6C',
            DAEJEON: '\uB300\uC804',
            GWANGJU: '\uAD11\uC8FC',
            ULSAN: '\uC6B8\uC0B0',
            SEJONG: '\uC138\uC885',
            GANGWON: '\uAC15\uC6D0',
            CHUNGBUK: '\uCDA9\uBD81',
            CHUNGNAM: '\uCDA9\uB0A8',
            JEONBUK: '\uC804\uBD81',
            JEONNAM: '\uC804\uB0A8',
            GYEONGBUK: '\uACBD\uBD81',
            GYEONGNAM: '\uACBD\uB0A8',
            JEJU: '\uC81C\uC8FC',
            ONLINE: '\uC628\uB77C\uC778',
            OTHER: '\uAE30\uD0C0'
        };

        if (!text) return '';
        if (codeMap[upper]) return codeMap[upper];
        if (text.indexOf('\uC628\uB77C\uC778') > -1 || normalizedContains(text, 'online')) return '\uC628\uB77C\uC778';

        var parts = text.split(' ');
        return parts[0];
    }

    function getRegionFilterValue(raw) {
        var text = String(raw || '').replace(/\s+/g, ' ').trim();
        var primary = text ? text.split(' ')[0] : '';
        var allowed = {
            '\uC11C\uC6B8': true,
            '\uACBD\uAE30': true,
            '\uC778\uCC9C': true,
            '\uBD80\uC0B0': true,
            '\uB300\uAD6C': true,
            '\uB300\uC804': true,
            '\uAD11\uC8FC': true,
            '\uC6B8\uC0B0': true,
            '\uC138\uC885': true,
            '\uAC15\uC6D0': true,
            '\uCDA9\uBD81': true,
            '\uCDA9\uB0A8': true,
            '\uC804\uBD81': true,
            '\uC804\uB0A8': true,
            '\uACBD\uBD81': true,
            '\uACBD\uB0A8': true,
            '\uC81C\uC8FC': true
        };

        if (!text || text.indexOf('\uC628\uB77C\uC778') > -1) return '';
        return allowed[primary] ? primary : '\uAE30\uD0C0';
    }

    function normalizedContains(text, keyword) {
        return String(text || '').toLowerCase().indexOf(String(keyword || '').toLowerCase()) > -1;
    }

    function buildListPageUrl(params) {
        var query = ['id=2606'];

        if (params.tab) {
            query.push('tab=' + encodeURIComponent(params.tab));
        }
        if (params.category) {
            query.push('category=' + encodeURIComponent(params.category));
        }
        if (params.level) {
            query.push('level=' + encodeURIComponent(params.level));
        }
        if (params.region) {
            query.push('region=' + encodeURIComponent(params.region));
        }
        if (params.q) {
            query.push('q=' + encodeURIComponent(params.q));
        }
        if (params.view) {
            query.push('view=' + encodeURIComponent(params.view));
        }

        return '/shop/page.html?' + query.join('&');
    }

    function isLocalDetailPreview() {
        var host = String(window.location.hostname || '').toLowerCase();
        return host === '127.0.0.1' || host === 'localhost';
    }

    function buildPartnerMapUrl(params) {
        var query = [];
        var base = isLocalDetailPreview()
            ? '/output/playwright/fixtures/partnerclass/partnermap-shell.html'
            : '/partnermap';

        if (params.region) {
            query.push('region=' + encodeURIComponent(params.region));
        }
        if (params.category) {
            query.push('category=' + encodeURIComponent(params.category));
        }
        if (params.keyword) {
            query.push('keyword=' + encodeURIComponent(params.keyword));
        }
        if (params.partner) {
            query.push('partner=' + encodeURIComponent(params.partner));
        }

        return base + (query.length ? '?' + query.join('&') : '');
    }

    function buildInfoBadge(label, className, href, ariaLabel) {
        if (!label) return '';

        if (href) {
            return '<a href="' + href + '" class="info-badge ' + className + ' info-badge--link" aria-label="' + escapeHtml(ariaLabel || label) + '">'
                + escapeHtml(label)
                + '</a>';
        }

        return '<span class="info-badge ' + className + '">' + escapeHtml(label) + '</span>';
    }

    function buildInfoBadgesHtml(data, linkable, durationText) {
        var html = '<div class="info-badges">';
        var category = data.category || '';
        var level = normalizeLevelValue(data.level);
        var profile = resolveContentProfile(data || {});

        html += buildInfoBadge(profile.chip, 'info-badge--level', '', '');

        if (category) {
            html += buildInfoBadge(
                category,
                'info-badge--category',
                linkable ? buildListPageUrl({ category: category }) : '',
                category + ' \uBD84\uB958 \uD074\uB798\uC2A4 \uBAA9\uB85D \uBCF4\uAE30'
            );
        }
        if (level) {
            html += buildInfoBadge(
                level,
                'info-badge--level',
                linkable ? buildListPageUrl({ level: level }) : '',
                level + ' \uB09C\uC774\uB3C4 \uD074\uB798\uC2A4 \uBAA9\uB85D \uBCF4\uAE30'
            );
        }
        if (durationText) {
            html += buildInfoBadge(durationText, 'info-badge--duration', '', '');
        }
        if (data.kit_enabled && parseInt(data.kit_enabled, 10) === 1) {
            html += buildInfoBadge('\uC7AC\uB8CC\uD0A4\uD2B8 \uD3EC\uD568', 'info-badge--kit', '', '');
        }

        html += '</div>';
        return html;
    }

    function buildExploreLinksHtml(data, variant) {
        var links = [];
        var seen = {};
        var region = getPrimaryRegion(data.location || (data.partner && (data.partner.location || data.partner.region)) || '');
        var regionFilter = getRegionFilterValue(region);
        var level = normalizeLevelValue(data.level);
        var partnerName = data.partner && (data.partner.partner_name || data.partner.name) ? (data.partner.partner_name || data.partner.name) : '';
        var profile = resolveContentProfile(data || {});

        function pushLink(href, label) {
            if (!href || !label || seen[href]) return;
            seen[href] = true;
            links.push({ href: href, label: label });
        }

        if (data.category) {
            pushLink(buildListPageUrl({ category: data.category }), data.category + ' \uD074\uB798\uC2A4');
        }
        if (level) {
            pushLink(buildListPageUrl({ level: level }), level + ' \uB09C\uC774\uB3C4');
        }
        if (regionFilter) {
            pushLink(buildListPageUrl({ region: regionFilter }), regionFilter + ' \uD074\uB798\uC2A4');
        }
        if (partnerName) {
            pushLink(buildListPageUrl({ q: partnerName }), '\uAC15\uC0AC \uD074\uB798\uC2A4 \uBAA8\uC544\uBCF4\uAE30');
        }
        if (profile.key === 'affiliation') {
            pushLink(buildListPageUrl({ tab: 'benefits' }), '\uD611\uD68C\uC6D0 \uD61C\uD0DD \uBCF4\uAE30');
        } else if (profile.key === 'event') {
            pushLink(buildListPageUrl({ tab: 'affiliations' }), '\uD611\uD68C/\uC138\uBBF8\uB098 \uD5C8\uBE0C \uBCF4\uAE30');
        }
        if (getDeliveryModeValue(data) !== 'ONLINE') {
            pushLink(buildPartnerMapUrl({
                region: region,
                category: data.category || '',
                keyword: partnerName || data.class_name || '',
                partner: partnerName
            }), '\uD30C\uD2B8\uB108\uB9F5\uC5D0\uC11C \uACF5\uBC29 \uBCF4\uAE30');
        }

        if (links.length === 0) return '';

        var html = '<div class="detail-explore detail-explore--' + escapeHtml(variant || 'default') + '">'
            + '<span class="detail-explore__label">\uD074\uB798\uC2A4 \uB354 \uB458\uB7EC\uBCF4\uAE30</span>'
            + '<div class="detail-explore__links">';

        for (var i = 0; i < links.length && i < 3; i++) {
            html += '<a href="' + links[i].href + '" class="detail-explore__link">' + escapeHtml(links[i].label) + '</a>';
        }

        html += '</div></div>';
        return html;
    }

    function buildRelatedContext(data) {
        return {
            category: data.category || '',
            level: normalizeLevelValue(data.level || ''),
            region: getPrimaryRegion(data.region || data.location || (data.partner && (data.partner.region || data.partner.location)) || ''),
            partnerCode: data.partner_code || (data.partner && data.partner.partner_code) || '',
            partnerName: data.partner && (data.partner.partner_name || data.partner.name) ? (data.partner.partner_name || data.partner.name) : ''
        };
    }

    function getRelatedRemainingSeats(cls) {
        var total = 0;
        var schedules = cls.schedules || [];

        if (schedules && schedules.length) {
            for (var i = 0; i < schedules.length; i++) {
                if (schedules[i].remaining > 0) {
                    total += parseInt(schedules[i].remaining, 10) || 0;
                }
            }
            return total;
        }

        if (cls.remaining_seats !== undefined) {
            return Math.max(parseInt(cls.remaining_seats, 10) || 0, 0);
        }

        return 0;
    }

    function getRelatedScore(current, candidate) {
        var score = 0;
        var candidatePartnerCode = candidate.partner_code || (candidate.partner && candidate.partner.partner_code) || '';
        var candidatePartnerName = candidate.partner_name || (candidate.partner && (candidate.partner.partner_name || candidate.partner.name)) || '';
        var candidateRegion = getPrimaryRegion(candidate.region || candidate.location || (candidate.partner && (candidate.partner.region || candidate.partner.location)) || '');
        var candidateLevel = normalizeLevelValue(candidate.level || '');
        var candidateRating = parseFloat(candidate.avg_rating) || 0;
        var candidateSeats = getRelatedRemainingSeats(candidate);

        if (current.category && candidate.category === current.category) score += 50;
        if (current.level && candidateLevel === current.level) score += 20;
        if (current.region && candidateRegion && candidateRegion === current.region) score += 15;
        if (current.partnerCode && candidatePartnerCode && candidatePartnerCode === current.partnerCode) score += 25;
        if (!current.partnerCode && current.partnerName && candidatePartnerName === current.partnerName) score += 20;
        if (candidateSeats > 0) score += Math.min(candidateSeats, 10);
        score += Math.round(candidateRating * 3);

        return score;
    }

    function resolveShopProductMeta(brandUid) {
        return fetch('/shop/shopdetail.html?branduid=' + String(brandUid))
            .then(function(resp) {
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                return resp.text();
            })
            .then(function(html) {
                var parser = new DOMParser();
                var doc = parser.parseFromString(html, 'text/html');
                var form = doc.querySelector('form[name="form1"], form[name="detailform"]');
                var nativeGiftLink = doc.querySelector('.btn-gift[href]');
                var inputs = form ? form.querySelectorAll('input[name]') : [];
                var fields = {};
                var stoIdMatch = html.match(/sto_id:'([^']+)'/);
                var titleEl = doc.querySelector('.goods--title');
                var nativeGiftUrl = '';

                for (var i = 0; i < inputs.length; i++) {
                    fields[inputs[i].name] = inputs[i].value || '';
                }

                if (nativeGiftLink) {
                    nativeGiftUrl = nativeGiftLink.getAttribute('href') || '';
                    if (nativeGiftUrl && nativeGiftUrl.indexOf('javascript:') !== 0 && nativeGiftUrl.charAt(0) !== '#') {
                        nativeGiftUrl = nativeGiftUrl.charAt(0) === '/' ? nativeGiftUrl : '/shop/' + nativeGiftUrl.replace(/^\.\//, '');
                    } else {
                        nativeGiftUrl = '';
                    }
                }

                return {
                    brandUid: String(brandUid),
                    brandCode: fields.brandcode || '',
                    xCode: fields.xcode || '000',
                    mCode: fields.mcode || '000',
                    typep: fields.typep || 'X',
                    optType: fields.opt_type || 'NO',
                    basketUse: fields.basket_use || 'Y',
                    cartFree: fields.cart_free || '',
                    stoId: stoIdMatch ? stoIdMatch[1] : '1',
                    productName: titleEl ? titleEl.textContent.trim() : (classData && classData.class_name ? classData.class_name : '\uD30C\uD2B8\uB108 \uD074\uB798\uC2A4'),
                    nativeGiftUrl: nativeGiftUrl
                };
            });
    }

    function resolveGiftProductMeta(brandUid) {
        return resolveShopProductMeta(brandUid);
    }

    function submitBasketAdd(meta, quantity) {
        var params = new URLSearchParams();
        params.append('totalnum', '');
        params.append('collbrandcode', '');
        params.append('xcode', meta.xCode);
        params.append('mcode', meta.mCode);
        params.append('typep', meta.typep);
        params.append('aramount', '');
        params.append('arspcode', '');
        params.append('arspcode2', '');
        params.append('optionindex', '');
        params.append('alluid', '');
        params.append('alloptiontype', '');
        params.append('aropts', '');
        params.append('checktype', '');
        params.append('ordertype', 'basket|parent.|layer');
        params.append('brandcode', meta.brandCode);
        params.append('branduid', meta.brandUid);
        params.append('cart_free', meta.cartFree);
        params.append('opt_type', meta.optType);
        params.append('basket_use', meta.basketUse);
        params.append('amount', String(quantity));
        params.append('amount[]', String(quantity));
        params.append('option[basic][0][0][opt_id]', '0');
        params.append('option[basic][0][0][opt_value]', meta.productName);
        params.append('option[basic][0][0][opt_stock]', '1');
        params.append('option[basic][0][0][sto_id]', meta.stoId || '1');
        params.append('option[basic][0][0][opt_type]', 'undefined');

        return fetch('/shop/basket.action.html', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
            credentials: 'same-origin'
        })
            .then(function(resp) {
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                return resp.text();
            })
            .then(function(text) {
                var data = null;
                try {
                    data = JSON.parse(text);
                } catch (err) {
                    throw new Error('\uBA54\uC774\uD06C\uC0F5 \uC7A5\uBC14\uAD6C\uB2C8 \uC751\uB2F5 \uD30C\uC2F1 \uC2E4\uD328');
                }

                if (!data || data.status !== true) {
                    throw new Error(data && data.message ? data.message : '\uBA54\uC774\uD06C\uC0F5 \uC7A5\uBC14\uAD6C\uB2C8 \uCC98\uB9AC \uC2E4\uD328');
                }

                return data;
            });
    }

    function addKitProductToBasket(brandUid, quantity) {
        return resolveShopProductMeta(brandUid)
            .then(function(meta) {
                if (!meta || !meta.brandCode) {
                    throw new Error('meta not found');
                }
                return submitBasketAdd(meta, quantity);
            });
    }

    function submitGiftCheckout(meta, quantity) {
        var params = new URLSearchParams();
        params.append('totalnum', '');
        params.append('collbrandcode', '');
        params.append('xcode', meta.xCode);
        params.append('mcode', meta.mCode);
        params.append('typep', meta.typep);
        params.append('aramount', '');
        params.append('arspcode', '');
        params.append('arspcode2', '');
        params.append('optionindex', '');
        params.append('alluid', '');
        params.append('alloptiontype', '');
        params.append('aropts', '');
        params.append('checktype', '');
        params.append('ordertype', 'baro|parent.|layer');
        params.append('brandcode', meta.brandCode);
        params.append('branduid', meta.brandUid);
        params.append('cart_free', meta.cartFree);
        params.append('opt_type', meta.optType);
        params.append('basket_use', meta.basketUse);
        params.append('giveapresent', 'Y');
        params.append('amount', String(quantity));
        params.append('amount[]', String(quantity));
        params.append('option[basic][0][0][opt_id]', '0');
        params.append('option[basic][0][0][opt_value]', meta.productName);
        params.append('option[basic][0][0][opt_stock]', '1');
        params.append('option[basic][0][0][sto_id]', meta.stoId || '1');
        params.append('option[basic][0][0][opt_type]', 'undefined');

        fetch('/shop/basket.action.html', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
            credentials: 'same-origin'
        })
            .then(function(resp) {
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                return resp.text();
            })
            .then(function(text) {
                var data = null;
                try {
                    data = JSON.parse(text);
                } catch (err) {
                    throw new Error('\uBA54\uC774\uD06C\uC0F5 \uC120\uBB3C\uD558\uAE30 \uC751\uB2F5 \uD30C\uC2F1 \uC2E4\uD328');
                }

                if (!data || data.status !== true) {
                    throw new Error(data && data.message ? data.message : '\uBA54\uC774\uD06C\uC0F5 \uC120\uBB3C\uD558\uAE30 \uCC98\uB9AC \uC2E4\uD328');
                }

                if (data.etc_data && data.etc_data.baro_type === 'baro') {
                    window.location.href = '/shop/order.html' + (data.etc_data.add_rand_url || '');
                    return;
                }

                window.location.href = '/shop/basket.html';
            })
            .catch(function(err) {
                console.warn('[ClassDetail] \uC120\uBB3C\uD558\uAE30 basket.action \uC2E4\uD328:', err);
                setGiftButtonBusy(false);
                showToast('\uC120\uBB3C \uC8FC\uBB38\uC11C\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.', 'error');
            });
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
        var currentClassId = data.class_id || data.id || '';
        var currentMeta = buildRelatedContext(data);

        fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'getClasses',
                category: data.category || '',
                limit: 24
            })
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
                var candidates = [];

                // 현재 클래스 제외, active 상태만 후보로 수집
                for (var i = 0; i < allClasses.length; i++) {
                    var c = allClasses[i];
                    var cId = c.class_id || c.id || '';
                    var cStatus = String(c.status || '').toUpperCase();
                    if (cId === currentClassId) continue;
                    if (cStatus && cStatus !== 'ACTIVE' && String(c.status || '').toLowerCase() !== 'active') continue;
                    candidates.push({
                        item: c,
                        score: getRelatedScore(currentMeta, c)
                    });
                }

                candidates.sort(function(a, b) {
                    if (b.score !== a.score) {
                        return b.score - a.score;
                    }
                    return (parseFloat(b.item.avg_rating) || 0) - (parseFloat(a.item.avg_rating) || 0);
                });

                for (var j = 0; j < candidates.length; j++) {
                    related.push(candidates[j].item);
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
            var cLevel = escapeHtml(c.level || '');
            var cRegion = escapeHtml(getPrimaryRegion(c.location || (c.partner && (c.partner.location || c.partner.region)) || ''));
            var cPrice = formatPrice(c.price || 0);
            var cThumb = escapeHtml(c.thumbnail_url || '');
            var cRating = parseFloat(c.avg_rating) || 0;
            var cRemaining = getRelatedRemainingSeats(c);

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
            if (cLevel || cRegion || cRemaining > 0) {
                html += '<div class="cd-related-card__tags">';
                if (cLevel) {
                    html += '<span class="cd-related-card__tag">' + cLevel + '</span>';
                }
                if (cRegion) {
                    html += '<span class="cd-related-card__tag">' + cRegion + '</span>';
                }
                if (cRemaining > 0) {
                    html += '<span class="cd-related-card__tag cd-related-card__tag--remain">\uC794\uC5EC ' + cRemaining + '\uC11D</span>';
                }
                html += '</div>';
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
