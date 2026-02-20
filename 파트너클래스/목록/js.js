/* ============================================
   PRESSCO21 파트너 클래스 목록 페이지 - js.js
   메이크샵 D4 호환: IIFE, var, \${} 이스케이프
   ============================================ */
(function() {
    'use strict';

    /* ========================================
       설정값
       ======================================== */

    /** GAS 백엔드 엔드포인트 (배포 시 실제 URL로 교체) */
    var GAS_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

    /** 캐시 유효 시간: 1시간 (밀리초) */
    var CACHE_TTL = 60 * 60 * 1000;

    /** localStorage 캐시 키 접두사 */
    var CACHE_PREFIX = 'classCatalog_';

    /** 페이지당 클래스 수 */
    var PAGE_LIMIT = 20;

    /** 스켈레톤 카드 개수 */
    var SKELETON_COUNT = 6;

    /** 디바운스 대기 시간 (밀리초) */
    var DEBOUNCE_DELAY = 300;

    /** 수업 형태별 CSS 클래스 매핑 */
    var TYPE_CLASS_MAP = {
        '\uC6D0\uB370\uC774': 'oneday',   /* 원데이 */
        '\uC815\uAE30': 'regular',          /* 정기 */
        '\uC628\uB77C\uC778': 'online'      /* 온라인 */
    };


    /* ========================================
       필터 상태 관리
       ======================================== */

    /** 현재 적용된 필터 (API 호출 파라미터와 동기화) */
    var currentFilters = {
        category: [],
        level: [],
        type: [],
        region: [],
        sort: 'latest',
        page: 1,
        limit: PAGE_LIMIT,
        maxPrice: 200000
    };

    /** 디바운스 타이머 ID */
    var debounceTimer = null;

    /** API 호출 중 여부 (중복 호출 방지) */
    var isLoading = false;

    /** 현재 로드된 클래스 데이터 (Schema.org 등에 활용) */
    var currentClasses = [];


    /* ========================================
       초기화
       ======================================== */

    /**
     * 페이지 초기화 함수
     * DOM 로드 완료 후 실행
     */
    function init() {
        // 카테고리 목록 동적 로드
        loadCategories();

        // 필터 이벤트 바인딩
        bindFilters();

        // 정렬 이벤트 바인딩
        bindSort();

        // 모바일 필터 드로어 초기화
        initFilterDrawer();

        // 필터 그룹 토글(접기/펼치기) 초기화
        initFilterGroupToggles();

        // 가격 슬라이더 초기화
        initPriceRange();

        // 빈결과/에러 상태 버튼 바인딩
        bindStateButtons();

        // URL 파라미터에서 필터 복원 (딥링크 지원)
        restoreFiltersFromURL();

        // 스켈레톤 표시 후 첫 데이터 로드
        renderSkeleton();
        fetchClasses(currentFilters);
    }


    /* ========================================
       GAS API 통신
       ======================================== */

    /**
     * 클래스 목록 API 호출
     * @param {Object} filters - 필터 파라미터
     */
    function fetchClasses(filters) {
        if (isLoading) return;

        // 캐시 확인
        var cacheKey = buildCacheKey(filters);
        var cached = getCached(cacheKey);
        if (cached) {
            handleClassesResponse(cached);
            return;
        }

        isLoading = true;
        renderSkeleton();
        hideElement('catalogEmpty');
        hideElement('catalogError');

        // API 쿼리 파라미터 구성
        var params = new URLSearchParams();
        params.append('action', 'getClasses');

        if (filters.category && filters.category.length > 0) {
            params.append('category', filters.category.join(','));
        }
        if (filters.level && filters.level.length > 0) {
            params.append('level', filters.level.join(','));
        }
        if (filters.type && filters.type.length > 0) {
            params.append('type', filters.type.join(','));
        }
        if (filters.region && filters.region.length > 0) {
            params.append('region', filters.region.join(','));
        }
        if (filters.sort) {
            params.append('sort', filters.sort);
        }
        if (filters.page) {
            params.append('page', filters.page);
        }
        if (filters.limit) {
            params.append('limit', filters.limit);
        }
        if (filters.maxPrice < 200000) {
            params.append('maxPrice', filters.maxPrice);
        }

        var url = GAS_URL + '?' + params.toString();

        fetch(url, { method: 'GET', redirect: 'follow' })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                return response.json();
            })
            .then(function(data) {
                isLoading = false;

                if (data && data.success) {
                    // 캐시 저장
                    setCache(cacheKey, data);
                    handleClassesResponse(data);
                } else {
                    renderError();
                }
            })
            .catch(function(err) {
                isLoading = false;
                console.error('[ClassCatalog] API 호출 실패:', err);
                renderError();
            });
    }

    /**
     * 클래스 목록 응답 처리
     * @param {Object} data - API 응답 데이터
     */
    function handleClassesResponse(data) {
        var classes = (data.data && Array.isArray(data.data)) ? data.data : [];
        var pagination = data.pagination || { page: 1, totalCount: 0, totalPages: 1 };

        currentClasses = classes;

        // 결과 건수 업데이트
        updateResultCount(pagination.totalCount || classes.length);

        if (classes.length === 0) {
            clearGrid();
            renderEmpty();
            hidePagination();
        } else {
            renderCards(classes);
            renderPagination(pagination);
            // Schema.org 구조화 데이터 주입
            injectSchemaOrg(classes);
            // 스크롤 애니메이션 초기화
            initScrollReveal();
        }
    }

    /**
     * 카테고리 목록 로드 (필터 동적 생성용)
     */
    function loadCategories() {
        var cached = getCached('categories');
        if (cached) {
            renderCategoryFilters(cached);
            return;
        }

        var params = new URLSearchParams();
        params.append('action', 'getCategories');
        var url = GAS_URL + '?' + params.toString();

        fetch(url, { method: 'GET', redirect: 'follow' })
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                if (data && data.success && Array.isArray(data.data)) {
                    setCache('categories', data.data);
                    renderCategoryFilters(data.data);
                }
            })
            .catch(function(err) {
                console.error('[ClassCatalog] 카테고리 로드 실패:', err);
                // 폴백: 기본 카테고리
                var fallback = ['\uC555\uD654', '\uBCF4\uC874\uD654', '\uCE94\uB4E4', '\uB9AC\uC2A4', '\uD558\uBC14\uB9AC\uC6C0', '\uB808\uC9C4\uC544\uD2B8'];
                renderCategoryFilters(fallback);
            });
    }

    /**
     * 카테고리 체크박스 필터 렌더링
     * @param {Array} categories - 카테고리 문자열 배열
     */
    function renderCategoryFilters(categories) {
        var container = document.getElementById('categoryFilters');
        if (!container) return;

        var html = '';
        for (var i = 0; i < categories.length; i++) {
            var cat = escapeHtml(categories[i]);
            html += '<label class="filter-checkbox">'
                + '<input type="checkbox" name="category" value="' + cat + '">'
                + '<span class="filter-checkbox__mark"></span>'
                + '<span class="filter-checkbox__label">' + cat + '</span>'
                + '</label>';
        }

        container.innerHTML = html;

        // 새로 생성된 체크박스에 이벤트 바인딩
        var checkboxes = container.querySelectorAll('input[type="checkbox"]');
        for (var j = 0; j < checkboxes.length; j++) {
            checkboxes[j].addEventListener('change', onFilterChange);
        }
    }


    /* ========================================
       캐시 관리 (localStorage)
       ======================================== */

    /**
     * 캐시에서 데이터 조회
     * @param {string} key - 캐시 키
     * @returns {*|null} 캐시된 데이터 또는 null
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
     * @param {string} key - 캐시 키
     * @param {*} data - 저장할 데이터
     */
    function setCache(key, data) {
        try {
            var entry = {
                timestamp: Date.now(),
                data: data
            };
            localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
        } catch (e) {
            // localStorage 용량 초과 시 기존 캐시 정리
            clearExpiredCache();
        }
    }

    /**
     * 필터 조합 기반 캐시 키 생성
     * @param {Object} filters - 필터 객체
     * @returns {string} 캐시 키
     */
    function buildCacheKey(filters) {
        var keyObj = {
            c: filters.category ? filters.category.join(',') : '',
            l: filters.level ? filters.level.join(',') : '',
            t: filters.type ? filters.type.join(',') : '',
            r: filters.region ? filters.region.join(',') : '',
            s: filters.sort || 'latest',
            p: filters.page || 1,
            m: filters.maxPrice || 200000
        };

        try {
            return btoa(unescape(encodeURIComponent(JSON.stringify(keyObj))));
        } catch (e) {
            return JSON.stringify(keyObj);
        }
    }

    /**
     * 만료된 캐시 항목 정리
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
        } catch (e) {
            /* 무시 */
        }
    }


    /* ========================================
       카드 렌더링
       ======================================== */

    /**
     * 클래스 카드 그리드 렌더링
     * @param {Array} classes - 클래스 객체 배열
     */
    function renderCards(classes) {
        var grid = document.getElementById('classGrid');
        if (!grid) return;

        // 반별(half star) 그라데이션 SVG defs를 한 번만 선언 (id 중복 방지)
        var html = '<svg width="0" height="0" style="position:absolute" aria-hidden="true">'
            + '<defs><linearGradient id="ccHalfStarGrad">'
            + '<stop offset="50%" stop-color="#F5A623"/>'
            + '<stop offset="50%" stop-color="#DDD"/>'
            + '</linearGradient></defs></svg>';

        for (var i = 0; i < classes.length; i++) {
            html += renderCard(classes[i]);
        }

        grid.innerHTML = html;
    }

    /**
     * 단일 클래스 카드 HTML 문자열 생성
     * @param {Object} cls - 클래스 데이터 객체
     * @returns {string} 카드 HTML
     */
    function renderCard(cls) {
        var classId = escapeHtml(cls.class_id || '');
        var className = escapeHtml(cls.class_name || '');
        var category = escapeHtml(cls.category || '');
        var level = escapeHtml(cls.level || '');
        var typeRaw = cls.type || '';
        var typeLabel = escapeHtml(typeRaw);
        var typeCss = TYPE_CLASS_MAP[typeRaw] || 'oneday';
        var price = formatPrice(cls.price || 0);
        var duration = cls.duration_min || 0;
        var durationText = duration >= 60
            ? Math.floor(duration / 60) + '\uC2DC\uAC04' + (duration % 60 > 0 ? ' ' + (duration % 60) + '\uBD84' : '')
            : duration + '\uBD84';
        var thumbnail = cls.thumbnail_url || '';
        var location = escapeHtml(cls.location || '');
        var partnerName = escapeHtml(cls.partner_name || '');
        var avgRating = parseFloat(cls.avg_rating) || 0;
        var classCount = parseInt(cls.class_count) || 0;
        var detailUrl = '../\uC0C1\uC138/?id=' + encodeURIComponent(classId);

        var starsHtml = renderStars(avgRating);

        var html = '<a href="' + detailUrl + '" class="class-card scroll-reveal" role="listitem" '
            + 'aria-label="' + className + ' - ' + partnerName + '">'
            + '<div class="class-card__thumb">';

        // 썸네일 이미지 (lazy loading)
        if (thumbnail) {
            html += '<img class="class-card__img" src="' + escapeHtml(thumbnail) + '" '
                + 'alt="' + className + ' \uD074\uB798\uC2A4 \uC378\uB124\uC77C" loading="lazy">';
        }

        // 카테고리 배지
        if (category) {
            html += '<span class="class-card__category">' + category + '</span>';
        }

        // 수업 형태 배지
        if (typeLabel) {
            html += '<span class="class-card__type class-card__type--' + typeCss + '">' + typeLabel + '</span>';
        }

        html += '</div>'; // /.class-card__thumb

        // 카드 본문
        html += '<div class="class-card__body">';
        html += '<h3 class="class-card__title">' + className + '</h3>';

        // 메타 정보 (파트너명, 지역)
        html += '<div class="class-card__meta">';
        if (partnerName) {
            html += '<span class="class-card__partner">' + partnerName + '</span>';
        }
        if (location) {
            html += '<span class="class-card__location">' + location + '</span>';
        }
        html += '</div>';

        // 별점 + 난이도
        html += '<div class="class-card__ratings">';
        html += '<div class="class-card__stars">' + starsHtml + '</div>';
        if (avgRating > 0) {
            html += '<span class="class-card__rating-num">' + avgRating.toFixed(1) + '</span>';
        }
        if (classCount > 0) {
            html += '<span class="class-card__review-count">(' + classCount + ')</span>';
        }
        if (level) {
            html += '<span class="class-card__level">' + level + '</span>';
        }
        html += '</div>';

        // 가격 + 소요시간
        html += '<div class="class-card__footer">';
        html += '<div class="class-card__price">' + price + '<span class="class-card__price-unit">\uC6D0</span></div>';
        if (duration > 0) {
            html += '<span class="class-card__duration">' + durationText + '</span>';
        }
        html += '</div>';

        html += '</div>'; // /.class-card__body
        html += '</a>';   // /.class-card

        return html;
    }

    /**
     * 스켈레톤 카드 렌더링 (로딩 플레이스홀더)
     */
    function renderSkeleton() {
        var grid = document.getElementById('classGrid');
        if (!grid) return;

        var html = '';
        for (var i = 0; i < SKELETON_COUNT; i++) {
            html += '<div class="skeleton-card" aria-hidden="true">'
                + '<div class="skeleton-card__thumb"></div>'
                + '<div class="skeleton-card__body">'
                + '<div class="skeleton-card__line skeleton-card__line--medium"></div>'
                + '<div class="skeleton-card__line skeleton-card__line--short"></div>'
                + '<div class="skeleton-card__line skeleton-card__line--short"></div>'
                + '<div class="skeleton-card__line skeleton-card__line--price"></div>'
                + '</div>'
                + '</div>';
        }

        grid.innerHTML = html;
    }

    /**
     * 그리드 내용 비우기
     */
    function clearGrid() {
        var grid = document.getElementById('classGrid');
        if (grid) grid.innerHTML = '';
    }


    /* ========================================
       별점 렌더링
       ======================================== */

    /**
     * 별점 SVG 아이콘 HTML 생성
     * @param {number} rating - 평균 별점 (0~5)
     * @returns {string} 별 아이콘 HTML
     */
    function renderStars(rating) {
        var html = '';
        var fullStarSvg = '<svg class="class-card__star class-card__star--filled" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">'
            + '<path d="M7 1l1.76 3.57 3.94.57-2.85 2.78.67 3.93L7 10.07l-3.52 1.78.67-3.93L1.3 5.14l3.94-.57L7 1z"/>'
            + '</svg>';
        /* 반별: defs를 개별 SVG에 넣지 않고, renderCards()에서 한 번 선언한 공유 gradient 참조 */
        var halfStarSvg = '<svg class="class-card__star class-card__star--half" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">'
            + '<path d="M7 1l1.76 3.57 3.94.57-2.85 2.78.67 3.93L7 10.07l-3.52 1.78.67-3.93L1.3 5.14l3.94-.57L7 1z" fill="url(#ccHalfStarGrad)"/>'
            + '</svg>';
        var emptyStarSvg = '<svg class="class-card__star class-card__star--empty" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">'
            + '<path d="M7 1l1.76 3.57 3.94.57-2.85 2.78.67 3.93L7 10.07l-3.52 1.78.67-3.93L1.3 5.14l3.94-.57L7 1z"/>'
            + '</svg>';

        for (var i = 1; i <= 5; i++) {
            if (rating >= i) {
                html += fullStarSvg;
            } else if (rating >= i - 0.5) {
                html += halfStarSvg;
            } else {
                html += emptyStarSvg;
            }
        }

        return html;
    }


    /* ========================================
       필터 이벤트 처리
       ======================================== */

    /**
     * 체크박스 필터 이벤트 바인딩
     */
    function bindFilters() {
        // 이벤트 위임: filter-panel 내 체크박스 변경 감지
        var panel = document.getElementById('filterPanel');
        if (!panel) return;

        panel.addEventListener('change', function(e) {
            var target = e.target;
            if (target && target.type === 'checkbox') {
                onFilterChange();
            }
        });

        // 필터 초기화 버튼
        var resetBtns = panel.querySelectorAll('.filter-reset');
        for (var i = 0; i < resetBtns.length; i++) {
            resetBtns[i].addEventListener('click', resetFilters);
        }
    }

    /**
     * 필터 변경 시 호출 (디바운스 적용)
     */
    function onFilterChange() {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(function() {
            collectFilterValues();
            currentFilters.page = 1; // 필터 변경 시 1페이지로
            updateFilterBadge();
            updateActiveChips();
            updateURLParams();
            fetchClasses(currentFilters);
        }, DEBOUNCE_DELAY);
    }

    /**
     * 모든 체크박스에서 필터 값 수집
     */
    function collectFilterValues() {
        currentFilters.category = getCheckedValues('category');
        currentFilters.level = getCheckedValues('level');
        currentFilters.type = getCheckedValues('type');
        currentFilters.region = getCheckedValues('region');
    }

    /**
     * 특정 name의 체크된 값 배열 반환
     * @param {string} name - input name 속성
     * @returns {Array} 체크된 값 배열
     */
    function getCheckedValues(name) {
        var values = [];
        var panel = document.getElementById('filterPanel');
        if (!panel) return values;

        var checkboxes = panel.querySelectorAll('input[name="' + name + '"]:checked');
        for (var i = 0; i < checkboxes.length; i++) {
            var val = checkboxes[i].value;
            if (val) values.push(val);
        }
        return values;
    }

    /**
     * 모든 필터 초기화
     */
    function resetFilters() {
        var panel = document.getElementById('filterPanel');
        if (!panel) return;

        // 모든 체크박스 해제
        var checkboxes = panel.querySelectorAll('input[type="checkbox"]');
        for (var i = 0; i < checkboxes.length; i++) {
            checkboxes[i].checked = false;
        }

        // 가격 슬라이더 초기화
        var priceSlider = document.getElementById('priceRange');
        if (priceSlider) {
            priceSlider.value = 200000;
            updatePriceDisplay(200000);
            updateSliderTrack(priceSlider);
        }

        // 정렬 초기화
        var sortSelect = document.getElementById('sortSelect');
        if (sortSelect) sortSelect.value = 'latest';

        // 필터 상태 초기화
        currentFilters = {
            category: [],
            level: [],
            type: [],
            region: [],
            sort: 'latest',
            page: 1,
            limit: PAGE_LIMIT,
            maxPrice: 200000
        };

        updateFilterBadge();
        updateActiveChips();
        updateURLParams();
        fetchClasses(currentFilters);
    }


    /* ========================================
       정렬
       ======================================== */

    /**
     * 정렬 셀렉트 이벤트 바인딩
     */
    function bindSort() {
        var sortSelect = document.getElementById('sortSelect');
        if (!sortSelect) return;

        sortSelect.addEventListener('change', function() {
            currentFilters.sort = this.value;
            currentFilters.page = 1;
            updateURLParams();
            fetchClasses(currentFilters);
        });
    }


    /* ========================================
       가격 슬라이더
       ======================================== */

    /**
     * 가격 범위 슬라이더 초기화
     */
    function initPriceRange() {
        var slider = document.getElementById('priceRange');
        if (!slider) return;

        // 슬라이더 트랙 초기 색상
        updateSliderTrack(slider);

        // input 이벤트 (드래그 중 실시간 표시)
        slider.addEventListener('input', function() {
            var value = parseInt(this.value);
            updatePriceDisplay(value);
            updateSliderTrack(this);
        });

        // change 이벤트 (드래그 완료 후 API 호출)
        slider.addEventListener('change', function() {
            var value = parseInt(this.value);
            currentFilters.maxPrice = value;
            onFilterChange();
        });
    }

    /**
     * 가격 표시 레이블 업데이트
     * @param {number} value - 가격 값
     */
    function updatePriceDisplay(value) {
        var label = document.getElementById('priceRangeValue');
        if (label) {
            if (value >= 200000) {
                label.textContent = '200,000\uC6D0+';
            } else {
                label.textContent = formatPrice(value) + '\uC6D0';
            }
        }
    }

    /**
     * 슬라이더 트랙 채움 색상 업데이트
     * @param {HTMLInputElement} slider - range input 요소
     */
    function updateSliderTrack(slider) {
        var min = parseInt(slider.min) || 0;
        var max = parseInt(slider.max) || 200000;
        var val = parseInt(slider.value) || 0;
        var pct = ((val - min) / (max - min)) * 100;
        slider.style.background = 'linear-gradient(to right, #7d9675 0%, #7d9675 '
            + pct + '%, #E8E2DB ' + pct + '%, #E8E2DB 100%)';
    }


    /* ========================================
       페이지네이션
       ======================================== */

    /**
     * 페이지네이션 UI 렌더링
     * @param {Object} pagination - { page, totalCount, totalPages, limit }
     */
    function renderPagination(pagination) {
        var container = document.getElementById('catalogPagination');
        if (!container) return;

        var totalPages = pagination.totalPages || 1;
        var currentPage = pagination.page || 1;

        if (totalPages <= 1) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';

        var html = '';

        // 이전 페이지 버튼
        html += '<button class="catalog-pagination__btn' + (currentPage <= 1 ? ' is-disabled' : '')
            + '" data-page="' + (currentPage - 1) + '" aria-label="\uC774\uC804 \uD398\uC774\uC9C0"'
            + (currentPage <= 1 ? ' disabled' : '') + '>'
            + '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            + '</button>';

        // 페이지 번호 (최대 7개 표시, 말줄임 포함)
        var pages = getPageNumbers(currentPage, totalPages);
        for (var i = 0; i < pages.length; i++) {
            var p = pages[i];
            if (p === '...') {
                html += '<span class="catalog-pagination__ellipsis">...</span>';
            } else {
                html += '<button class="catalog-pagination__btn' + (p === currentPage ? ' is-active' : '')
                    + '" data-page="' + p + '" aria-label="' + p + '\uD398\uC774\uC9C0"'
                    + (p === currentPage ? ' aria-current="page"' : '') + '>'
                    + p + '</button>';
            }
        }

        // 다음 페이지 버튼
        html += '<button class="catalog-pagination__btn' + (currentPage >= totalPages ? ' is-disabled' : '')
            + '" data-page="' + (currentPage + 1) + '" aria-label="\uB2E4\uC74C \uD398\uC774\uC9C0"'
            + (currentPage >= totalPages ? ' disabled' : '') + '>'
            + '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            + '</button>';

        container.innerHTML = html;

        // 페이지 버튼 이벤트 바인딩 (이벤트 위임)
        container.onclick = function(e) {
            var btn = e.target.closest('.catalog-pagination__btn');
            if (!btn || btn.classList.contains('is-disabled') || btn.classList.contains('is-active')) return;

            var page = parseInt(btn.getAttribute('data-page'));
            if (isNaN(page) || page < 1) return;

            currentFilters.page = page;
            updateURLParams();
            fetchClasses(currentFilters);

            // 콘텐츠 영역으로 스크롤
            var content = document.querySelector('.class-catalog .catalog-content');
            if (content) {
                content.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        };
    }

    /**
     * 페이지 번호 배열 생성 (말줄임 포함)
     * @param {number} current - 현재 페이지
     * @param {number} total - 전체 페이지 수
     * @returns {Array} 페이지 번호 배열 (숫자 또는 '...')
     */
    function getPageNumbers(current, total) {
        if (total <= 7) {
            var arr = [];
            for (var i = 1; i <= total; i++) arr.push(i);
            return arr;
        }

        var pages = [1];

        if (current > 3) {
            pages.push('...');
        }

        var start = Math.max(2, current - 1);
        var end = Math.min(total - 1, current + 1);

        for (var j = start; j <= end; j++) {
            pages.push(j);
        }

        if (current < total - 2) {
            pages.push('...');
        }

        pages.push(total);

        return pages;
    }

    /**
     * 페이지네이션 숨기기
     */
    function hidePagination() {
        var container = document.getElementById('catalogPagination');
        if (container) container.style.display = 'none';
    }


    /* ========================================
       빈 결과 / 에러 상태
       ======================================== */

    /**
     * 빈 결과 상태 표시
     */
    function renderEmpty() {
        showElement('catalogEmpty');
        hideElement('catalogError');
        hidePagination();
    }

    /**
     * 에러 상태 표시
     */
    function renderError() {
        clearGrid();
        showElement('catalogError');
        hideElement('catalogEmpty');
        hidePagination();
    }

    /**
     * 빈결과/에러 상태 버튼 이벤트 바인딩
     */
    function bindStateButtons() {
        // 빈 결과 - 필터 초기화 버튼
        var emptyReset = document.querySelector('.class-catalog .catalog-empty__reset');
        if (emptyReset) {
            emptyReset.addEventListener('click', resetFilters);
        }

        // 에러 - 다시 시도 버튼
        var errorRetry = document.querySelector('.class-catalog .catalog-error__retry');
        if (errorRetry) {
            errorRetry.addEventListener('click', function() {
                hideElement('catalogError');
                fetchClasses(currentFilters);
            });
        }
    }


    /* ========================================
       활성 필터 칩 UI
       ======================================== */

    /**
     * 활성 필터 칩 업데이트
     */
    function updateActiveChips() {
        var container = document.getElementById('activeFilters');
        if (!container) return;

        var html = '';
        var allFilters = [];

        // 각 필터 유형별로 칩 생성
        var filterTypes = [
            { key: 'region', label: '\uC9C0\uC5ED' },
            { key: 'category', label: '\uCE74\uD14C\uACE0\uB9AC' },
            { key: 'type', label: '\uD615\uD0DC' },
            { key: 'level', label: '\uB09C\uC774\uB3C4' }
        ];

        for (var i = 0; i < filterTypes.length; i++) {
            var ft = filterTypes[i];
            var values = currentFilters[ft.key];
            if (values && values.length > 0) {
                for (var j = 0; j < values.length; j++) {
                    allFilters.push({
                        filterKey: ft.key,
                        value: values[j],
                        display: values[j]
                    });
                }
            }
        }

        // 가격 필터
        if (currentFilters.maxPrice < 200000) {
            allFilters.push({
                filterKey: 'maxPrice',
                value: currentFilters.maxPrice,
                display: formatPrice(currentFilters.maxPrice) + '\uC6D0 \uC774\uD558'
            });
        }

        for (var k = 0; k < allFilters.length; k++) {
            var f = allFilters[k];
            html += '<span class="filter-chip">'
                + escapeHtml(f.display)
                + '<button class="filter-chip__remove" type="button" '
                + 'data-filter-key="' + f.filterKey + '" '
                + 'data-filter-value="' + escapeHtml(String(f.value)) + '" '
                + 'aria-label="' + escapeHtml(f.display) + ' \uD544\uD130 \uC81C\uAC70">'
                + '&times;</button>'
                + '</span>';
        }

        container.innerHTML = html;

        // 칩 제거 버튼 이벤트 바인딩
        var removeButtons = container.querySelectorAll('.filter-chip__remove');
        for (var m = 0; m < removeButtons.length; m++) {
            removeButtons[m].addEventListener('click', onChipRemove);
        }
    }

    /**
     * 필터 칩 제거 클릭 핸들러
     * @param {Event} e - 클릭 이벤트
     */
    function onChipRemove(e) {
        var btn = e.currentTarget;
        var filterKey = btn.getAttribute('data-filter-key');
        var filterValue = btn.getAttribute('data-filter-value');

        if (filterKey === 'maxPrice') {
            // 가격 슬라이더 초기화
            currentFilters.maxPrice = 200000;
            var slider = document.getElementById('priceRange');
            if (slider) {
                slider.value = 200000;
                updatePriceDisplay(200000);
                updateSliderTrack(slider);
            }
        } else {
            // 체크박스 해제 (셀렉터 인젝션 방지: querySelector 대신 반복문으로 값 비교)
            var allowedKeys = ['category', 'level', 'type', 'region'];
            if (allowedKeys.indexOf(filterKey) === -1) return;

            var panel = document.getElementById('filterPanel');
            if (panel) {
                var allBoxes = panel.querySelectorAll('input[name="' + filterKey + '"]');
                for (var i = 0; i < allBoxes.length; i++) {
                    if (allBoxes[i].value === filterValue) {
                        allBoxes[i].checked = false;
                        break;
                    }
                }
            }

            // 필터 배열에서 제거
            var arr = currentFilters[filterKey];
            if (arr && Array.isArray(arr)) {
                var idx = arr.indexOf(filterValue);
                if (idx > -1) arr.splice(idx, 1);
            }
        }

        currentFilters.page = 1;
        updateFilterBadge();
        updateActiveChips();
        updateURLParams();
        fetchClasses(currentFilters);
    }

    /**
     * 모바일 필터 배지(적용 필터 수) 업데이트
     */
    function updateFilterBadge() {
        var badge = document.querySelector('.class-catalog .filter-toggle__badge');
        if (!badge) return;

        var count = 0;
        count += (currentFilters.category || []).length;
        count += (currentFilters.level || []).length;
        count += (currentFilters.type || []).length;
        count += (currentFilters.region || []).length;
        if (currentFilters.maxPrice < 200000) count++;

        if (count > 0) {
            badge.textContent = count;
            badge.classList.add('is-active');
        } else {
            badge.textContent = '';
            badge.classList.remove('is-active');
        }
    }


    /* ========================================
       모바일 필터 드로어
       ======================================== */

    /**
     * 모바일 필터 드로어 토글 초기화
     */
    function initFilterDrawer() {
        var toggleBtn = document.querySelector('.class-catalog .filter-toggle');
        var closeBtn = document.querySelector('.class-catalog .filter-panel__close');
        var applyBtn = document.querySelector('.class-catalog .filter-apply');
        var overlay = document.querySelector('.class-catalog .filter-overlay');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', openFilterDrawer);
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', closeFilterDrawer);
        }
        if (applyBtn) {
            applyBtn.addEventListener('click', function() {
                closeFilterDrawer();
                onFilterChange();
            });
        }
        if (overlay) {
            overlay.addEventListener('click', closeFilterDrawer);
        }
    }

    /**
     * 필터 드로어 열기
     */
    function openFilterDrawer() {
        var panel = document.getElementById('filterPanel');
        var overlay = document.querySelector('.class-catalog .filter-overlay');
        var toggle = document.querySelector('.class-catalog .filter-toggle');

        if (panel) panel.classList.add('is-open');
        if (overlay) overlay.classList.add('is-active');
        if (toggle) toggle.setAttribute('aria-expanded', 'true');

        // 배경 스크롤 방지
        document.body.style.overflow = 'hidden';
    }

    /**
     * 필터 드로어 닫기
     */
    function closeFilterDrawer() {
        var panel = document.getElementById('filterPanel');
        var overlay = document.querySelector('.class-catalog .filter-overlay');
        var toggle = document.querySelector('.class-catalog .filter-toggle');

        if (panel) panel.classList.remove('is-open');
        if (overlay) overlay.classList.remove('is-active');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');

        // 배경 스크롤 복원
        document.body.style.overflow = '';
    }


    /* ========================================
       필터 그룹 토글 (접기/펼치기)
       ======================================== */

    /**
     * 필터 그룹 접기/펼치기 버튼 초기화
     */
    function initFilterGroupToggles() {
        var toggleBtns = document.querySelectorAll('.class-catalog .filter-group__toggle');

        for (var i = 0; i < toggleBtns.length; i++) {
            toggleBtns[i].addEventListener('click', function() {
                var expanded = this.getAttribute('aria-expanded') === 'true';
                var content = this.closest('.filter-group__title').nextElementSibling;

                this.setAttribute('aria-expanded', expanded ? 'false' : 'true');

                if (content) {
                    if (expanded) {
                        content.classList.add('is-collapsed');
                    } else {
                        content.classList.remove('is-collapsed');
                    }
                }
            });
        }
    }


    /* ========================================
       결과 건수 업데이트
       ======================================== */

    /**
     * 결과 건수 텍스트 업데이트
     * @param {number} count - 총 클래스 수
     */
    function updateResultCount(count) {
        var el = document.querySelector('.class-catalog .result-count');
        if (el) {
            el.textContent = '\uCD1D ' + formatNumber(count) + '\uAC1C\uC758 \uD074\uB798\uC2A4';
        }
    }


    /* ========================================
       URL 파라미터 동기화 (딥링크)
       ======================================== */

    /**
     * 현재 필터 상태를 URL 파라미터에 반영
     */
    function updateURLParams() {
        try {
            var params = new URLSearchParams();

            if (currentFilters.category.length > 0) params.set('category', currentFilters.category.join(','));
            if (currentFilters.level.length > 0) params.set('level', currentFilters.level.join(','));
            if (currentFilters.type.length > 0) params.set('type', currentFilters.type.join(','));
            if (currentFilters.region.length > 0) params.set('region', currentFilters.region.join(','));
            if (currentFilters.sort !== 'latest') params.set('sort', currentFilters.sort);
            if (currentFilters.page > 1) params.set('page', currentFilters.page);
            if (currentFilters.maxPrice < 200000) params.set('maxPrice', currentFilters.maxPrice);

            var newUrl = window.location.pathname;
            var paramStr = params.toString();
            if (paramStr) newUrl += '?' + paramStr;

            window.history.replaceState(null, '', newUrl);
        } catch (e) {
            /* pushState 미지원 환경 무시 */
        }
    }

    /**
     * URL 파라미터에서 필터 복원
     */
    function restoreFiltersFromURL() {
        try {
            var params = new URLSearchParams(window.location.search);

            if (params.has('category')) {
                currentFilters.category = params.get('category').split(',');
                setCheckboxes('category', currentFilters.category);
            }
            if (params.has('level')) {
                currentFilters.level = params.get('level').split(',');
                setCheckboxes('level', currentFilters.level);
            }
            if (params.has('type')) {
                currentFilters.type = params.get('type').split(',');
                setCheckboxes('type', currentFilters.type);
            }
            if (params.has('region')) {
                currentFilters.region = params.get('region').split(',');
                setCheckboxes('region', currentFilters.region);
            }
            if (params.has('sort')) {
                currentFilters.sort = params.get('sort');
                var sortSelect = document.getElementById('sortSelect');
                if (sortSelect) sortSelect.value = currentFilters.sort;
            }
            if (params.has('page')) {
                currentFilters.page = parseInt(params.get('page')) || 1;
            }
            if (params.has('maxPrice')) {
                var mp = parseInt(params.get('maxPrice'));
                if (!isNaN(mp)) {
                    currentFilters.maxPrice = mp;
                    var slider = document.getElementById('priceRange');
                    if (slider) {
                        slider.value = mp;
                        updatePriceDisplay(mp);
                        updateSliderTrack(slider);
                    }
                }
            }

            updateFilterBadge();
            updateActiveChips();
        } catch (e) {
            /* URL 파싱 실패 시 기본 필터 사용 */
        }
    }

    /**
     * 특정 name의 체크박스를 값 배열에 맞게 체크
     * @param {string} name - input name
     * @param {Array} values - 체크할 값 배열
     */
    function setCheckboxes(name, values) {
        var panel = document.getElementById('filterPanel');
        if (!panel) return;

        var checkboxes = panel.querySelectorAll('input[name="' + name + '"]');
        for (var i = 0; i < checkboxes.length; i++) {
            checkboxes[i].checked = values.indexOf(checkboxes[i].value) > -1;
        }
    }


    /* ========================================
       스크롤 애니메이션 (Intersection Observer)
       ======================================== */

    /**
     * 카드 스크롤 진입 애니메이션 초기화
     */
    function initScrollReveal() {
        if (!('IntersectionObserver' in window)) {
            // IO 미지원 브라우저: 즉시 표시
            var elements = document.querySelectorAll('.class-catalog .scroll-reveal');
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

        var cards = document.querySelectorAll('.class-catalog .scroll-reveal:not(.is-visible)');
        for (var k = 0; k < cards.length; k++) {
            observer.observe(cards[k]);
        }
    }


    /* ========================================
       Schema.org 구조화 데이터
       ======================================== */

    /**
     * Schema.org ItemList JSON-LD 동적 주입
     * @param {Array} classes - 클래스 객체 배열
     */
    function injectSchemaOrg(classes) {
        var script = document.getElementById('schemaItemList');
        if (!script) return;

        var items = [];
        for (var i = 0; i < classes.length; i++) {
            var cls = classes[i];
            items.push({
                '@type': 'ListItem',
                'position': i + 1,
                'item': {
                    '@type': 'Course',
                    'name': cls.class_name || '',
                    'description': (cls.category || '') + ' ' + (cls.level || '') + ' \uD074\uB798\uC2A4',
                    'provider': {
                        '@type': 'Organization',
                        'name': cls.partner_name || 'PRESSCO21'
                    },
                    'offers': {
                        '@type': 'Offer',
                        'price': cls.price || 0,
                        'priceCurrency': 'KRW'
                    }
                }
            });
        }

        var schema = {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            'name': 'PRESSCO21 \uD30C\uD2B8\uB108 \uD074\uB798\uC2A4',
            'numberOfItems': items.length,
            'itemListElement': items
        };

        script.textContent = JSON.stringify(schema);
    }


    /* ========================================
       유틸리티 함수
       ======================================== */

    /**
     * 가격 포맷 (65000 -> "65,000")
     * @param {number} price - 가격 숫자
     * @returns {string} 포맷된 가격 문자열
     */
    function formatPrice(price) {
        return String(price).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * 숫자 포맷 (천 단위 콤마)
     * @param {number} num - 숫자
     * @returns {string} 포맷된 문자열
     */
    function formatNumber(num) {
        return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * HTML 특수문자 이스케이프 (XSS 방지)
     * @param {string} str - 원본 문자열
     * @returns {string} 이스케이프된 문자열
     */
    function escapeHtml(str) {
        if (!str) return '';
        var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(str).replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    /**
     * 요소 표시
     * @param {string} id - 요소 ID
     */
    function showElement(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = '';
    }

    /**
     * 요소 숨기기
     * @param {string} id - 요소 ID
     */
    function hideElement(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
    }


    /* ========================================
       DOM Ready 이벤트
       ======================================== */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
