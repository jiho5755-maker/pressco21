/* ============================================
   PRESSCO21 파트너 클래스 목록 페이지 - js.js
   메이크샵 D4 호환: IIFE, var, \${} 이스케이프
   ============================================ */
(function() {
    'use strict';

    /* ========================================
       설정값
       ======================================== */

    /** n8n 웹훅 엔드포인트 (WF-01 클래스 API) */
    var GAS_URL = 'https://n8n.pressco21.com/webhook/class-api';

    /** 클래스 목록 캐시 유효 시간: 5분 (밀리초) */
    var CATALOG_CACHE_TTL = 5 * 60 * 1000;

    /** 카테고리/협회 설정 캐시 유효 시간: 1시간 (밀리초) */
    var SETTINGS_CACHE_TTL = 60 * 60 * 1000;

    /** localStorage 클래스 캐시 키 접두사 */
    var CATALOG_CACHE_PREFIX = 'classCatalog_';

    /** localStorage 설정 캐시 키 접두사 */
    var SETTINGS_CACHE_PREFIX = 'classSettings_';

    /** 클래스 캐시 버전 키 */
    var CATALOG_CACHE_VERSION_KEY = 'pressco21_catalog_cache_version';

    /** 설정 캐시 버전 키 */
    var SETTINGS_CACHE_VERSION_KEY = 'pressco21_catalog_settings_cache_version';

    /** 초기 캐시 버전 */
    var DEFAULT_CACHE_VERSION = 'v1';

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
        format: [],
        region: [],
        sort: 'latest',
        page: 1,
        limit: PAGE_LIMIT,
        maxPrice: 200000,
        search: ''
    };

    /** 디바운스 타이머 ID */
    var debounceTimer = null;

    /** API 호출 중 여부 (중복 호출 방지) */
    var isLoading = false;

    /** 현재 로드된 클래스 데이터 (Schema.org 등에 활용) */
    var currentClasses = [];

    /** 현재 검색어 (카드 하이라이트 표시용) */
    var currentSearchQuery = '';

    /** localStorage 키: 찜(관심) 목록 */
    var WISHLIST_KEY = 'pressco21_wishlist';

    /** localStorage 키: 최근 본 클래스 */
    var RECENT_KEY = 'pressco21_recent';

    /** localStorage 키: 목록 필터 상태 */
    var FILTER_STATE_KEY = 'pressco21_catalog_filters_v1';

    /** localStorage 키: 목록 보기 모드 */
    var VIEW_STATE_KEY = 'pressco21_catalog_view_mode_v1';

    /** 최근 본 클래스 최대 저장 수 */
    var RECENT_MAX = 10;

    /** 찜 필터 활성 여부 */
    var isWishlistFilterOn = false;

    /** 현재 목록 보기 모드 */
    var currentCatalogView = 'list';

    /** 현재 화면에 노출 중인 클래스 데이터 */
    var currentDisplayClasses = [];


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

        // 퀵 필터 칩 초기화
        initQuickFilters();

        // 빈결과/에러 상태 버튼 바인딩
        bindStateButtons();

        // URL 파라미터에서 필터 복원 (딥링크 지원)
        restoreFiltersFromURL();

        // 목록 / 지도 보기 모드 복원
        restoreCatalogViewMode();

        // 찜(관심) 기능 초기화
        initWishlist();

        // 최근 본 클래스 렌더링
        renderRecentSection();

        // 리스트 / 지도 토글 초기화
        initCatalogViewToggle();

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

        var apiFilters = buildApiFilters(filters);

        // 캐시 확인
        var cacheKey = buildCacheKey(filters);
        var cached = getCatalogCached(cacheKey);
        if (cached) {
            handleClassesResponse(cached);
            return;
        }

        isLoading = true;
        renderSkeleton();
        hideElement('catalogEmpty');
        hideElement('catalogError');

        // API 요청 본문 구성 (POST JSON)
        var body = { action: 'getClasses' };

        if (apiFilters.category && apiFilters.category.length > 0) {
            body.category = apiFilters.category.join(',');
        }
        if (apiFilters.level && apiFilters.level.length > 0) {
            body.level = apiFilters.level.join(',');
        }
        if (apiFilters.type && apiFilters.type.length > 0) {
            body.type = apiFilters.type.join(',');
        }
        if (apiFilters.region && apiFilters.region.length > 0) {
            body.region = apiFilters.region.join(',');
        }
        if (apiFilters.sort) {
            body.sort = apiFilters.sort;
        }
        if (apiFilters.page) {
            body.page = apiFilters.page;
        }
        if (apiFilters.limit) {
            body.limit = apiFilters.limit;
        }
        if (apiFilters.maxPrice < 200000) {
            body.maxPrice = apiFilters.maxPrice;
        }
        if (apiFilters.search) {
            body.search = apiFilters.search;
        }

        // 검색어 하이라이트용 동기화
        currentSearchQuery = filters.search || '';

        fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
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
                    setCatalogCache(cacheKey, data);
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
        var classes = (data.data && Array.isArray(data.data.classes)) ? data.data.classes : [];
        var pagination = {
            page: (data.data && data.data.page) || 1,
            totalCount: (data.data && data.data.total) || classes.length,
            totalPages: (data.data && data.data.totalPages) || 1
        };

        currentClasses = classes;

        // 결과 건수 업데이트
        updateResultCount(pagination.totalCount || classes.length);

        // 찜 필터가 활성화되어 있으면 찜한 클래스만 필터링
        var displayClasses = classes;
        if (isWishlistFilterOn) {
            var wishlist = getWishlist();
            displayClasses = classes.filter(function(cls) {
                return wishlist.indexOf(cls.class_id) > -1;
            });
        }

        currentDisplayClasses = displayClasses;
        renderMapPanel(displayClasses);
        renderBenefitsPanel(displayClasses, affilDataCache);
        if (activeCatalogTab === 'affiliations' || activeCatalogTab === 'benefits') {
            loadAffiliations();
        }

        if (displayClasses.length === 0) {
            clearGrid();
            currentDisplayClasses = [];
            if (isWishlistFilterOn && classes.length > 0) {
                // 찜한 클래스가 없는 경우 별도 메시지
                renderWishlistEmpty();
            } else {
                renderEmpty();
            }
            hidePagination();
        } else {
            renderCards(displayClasses);
            renderPagination(pagination);
            // 찜 상태 복원 (카드 렌더링 후)
            restoreWishlistState();
            // Schema.org 구조화 데이터 주입
            injectSchemaOrg(displayClasses);
            // 스크롤 애니메이션 초기화
            initScrollReveal();
        }

        updateCatalogViewUI();
    }

    /**
     * 카테고리 목록 로드 (필터 동적 생성용)
     */
    function loadCategories() {
        var cached = getSettingsCached('categories');
        if (cached) {
            renderCategoryFilters(cached);
            return;
        }

        fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getCategories' })
        })
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                if (data && data.success && Array.isArray(data.data)) {
                    // 객체 배열이면 name 문자열만 추출
                    var cats = data.data.map(function(c) {
                        return (typeof c === 'object' && c !== null) ? c.name : c;
                    });
                    setSettingsCache('categories', cats);
                    renderCategoryFilters(cats);
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
     * 카테고리 Pill 버튼 필터 렌더링
     * @param {Array} categories - 카테고리 문자열 배열
     */
    function renderCategoryFilters(categories) {
        var container = document.getElementById('categoryFilters');
        if (!container) return;

        var html = '<div class="category-pills">';
        for (var i = 0; i < categories.length; i++) {
            var cat = escapeHtml(categories[i]);
            html += '<button type="button" class="category-pill" data-category="' + cat + '">'
                + cat + '</button>';
        }
        html += '</div>';

        container.innerHTML = html;

        // Pill 버튼 클릭 이벤트 바인딩
        var pills = container.querySelectorAll('.category-pill');
        for (var j = 0; j < pills.length; j++) {
            pills[j].addEventListener('click', onCategoryPillClick);
        }

        setCategoryPills(currentFilters.category || []);
    }

    /**
     * 카테고리 Pill 버튼 클릭 핸들러 (토글)
     * @param {Event} e - 클릭 이벤트
     */
    function onCategoryPillClick(e) {
        var pill = e.currentTarget;
        var category = pill.getAttribute('data-category');
        var isActive = pill.classList.contains('is-active');

        if (isActive) {
            // 비활성화: 배열에서 제거
            pill.classList.remove('is-active');
            var idx = currentFilters.category.indexOf(category);
            if (idx > -1) currentFilters.category.splice(idx, 1);
        } else {
            // 활성화: 배열에 추가
            pill.classList.add('is-active');
            currentFilters.category.push(category);
        }

        onFilterChange();
    }

    function initQuickFilters() {
        var chips = document.querySelectorAll('.class-catalog .quick-filter-chip');
        for (var i = 0; i < chips.length; i++) {
            chips[i].addEventListener('click', onQuickFilterClick);
        }
    }

    function onQuickFilterClick(e) {
        var chip = e.currentTarget;
        var key = chip.getAttribute('data-quick-key');
        var value = chip.getAttribute('data-value');
        var isSingle = chip.classList.contains('quick-filter-chip--single');
        var isActive = chip.classList.contains('is-active');

        if (!key || !value) return;

        if (key === 'maxPrice') {
            currentFilters.maxPrice = isActive ? 200000 : (parseInt(value, 10) || 200000);
            syncPriceRangeUI();
        } else if (key === 'format') {
            currentFilters.format = isActive ? [] : [value];
            currentFilters.type = pruneTypesByFormat(currentFilters.type || [], currentFilters.format);
        } else if (isSingle) {
            currentFilters[key] = isActive ? [] : [value];
        } else {
            if (!currentFilters[key] || !Array.isArray(currentFilters[key])) {
                currentFilters[key] = [];
            }

            if (isActive) {
                removeValueFromArray(currentFilters[key], value);
            } else {
                currentFilters[key].push(value);
            }
        }

        syncFilterUI();
        onFilterChange();
    }

    function pruneTypesByFormat(types, formats) {
        var normalizedTypes = dedupeArray(types || []);
        var normalizedFormats = dedupeArray(formats || []);

        if (normalizedFormats.indexOf('\uC628\uB77C\uC778') > -1) {
            return normalizedTypes.filter(function(type) {
                return isOnlineType(type);
            });
        }

        if (normalizedFormats.indexOf('\uC624\uD504\uB77C\uC778') > -1) {
            return normalizedTypes.filter(function(type) {
                return !isOnlineType(type);
            });
        }

        return normalizedTypes;
    }

    function syncQuickFilterState() {
        var chips = document.querySelectorAll('.class-catalog .quick-filter-chip');
        for (var i = 0; i < chips.length; i++) {
            var chip = chips[i];
            var key = chip.getAttribute('data-quick-key');
            var value = chip.getAttribute('data-value');
            var active = false;

            if (key === 'maxPrice') {
                active = parseInt(value, 10) === currentFilters.maxPrice && currentFilters.maxPrice < 200000;
            } else if (key === 'format') {
                active = (currentFilters.format || []).indexOf(value) > -1;
            } else {
                active = currentFilters[key] && currentFilters[key].indexOf(value) > -1;
            }

            if (active) {
                chip.classList.add('is-active');
            } else {
                chip.classList.remove('is-active');
            }
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
    function readCacheVersion(versionKey) {
        try {
            var version = localStorage.getItem(versionKey);
            if (!version) {
                version = DEFAULT_CACHE_VERSION;
                localStorage.setItem(versionKey, version);
            }
            return version;
        } catch (e) {
            return DEFAULT_CACHE_VERSION;
        }
    }

    function buildScopedCacheStorageKey(prefix, versionKey, key) {
        return prefix + readCacheVersion(versionKey) + '_' + key;
    }

    function getScopedCached(prefix, versionKey, key, ttl) {
        try {
            var raw = localStorage.getItem(buildScopedCacheStorageKey(prefix, versionKey, key));
            if (!raw) return null;

            var entry = JSON.parse(raw);
            var effectiveTtl = entry.ttl || ttl;
            if (Date.now() - entry.timestamp > effectiveTtl) {
                localStorage.removeItem(buildScopedCacheStorageKey(prefix, versionKey, key));
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
    function setScopedCache(prefix, versionKey, key, data, ttl) {
        try {
            var entry = {
                timestamp: Date.now(),
                ttl: ttl,
                data: data
            };
            localStorage.setItem(buildScopedCacheStorageKey(prefix, versionKey, key), JSON.stringify(entry));
        } catch (e) {
            // localStorage 용량 초과 시 기존 캐시 정리
            clearExpiredCache(prefix, versionKey, ttl);
        }
    }

    function getCatalogCached(key) {
        return getScopedCached(CATALOG_CACHE_PREFIX, CATALOG_CACHE_VERSION_KEY, key, CATALOG_CACHE_TTL);
    }

    function setCatalogCache(key, data) {
        setScopedCache(CATALOG_CACHE_PREFIX, CATALOG_CACHE_VERSION_KEY, key, data, CATALOG_CACHE_TTL);
        clearExpiredCache(CATALOG_CACHE_PREFIX, CATALOG_CACHE_VERSION_KEY, CATALOG_CACHE_TTL);
    }

    function getSettingsCached(key) {
        return getScopedCached(SETTINGS_CACHE_PREFIX, SETTINGS_CACHE_VERSION_KEY, key, SETTINGS_CACHE_TTL);
    }

    function setSettingsCache(key, data) {
        setScopedCache(SETTINGS_CACHE_PREFIX, SETTINGS_CACHE_VERSION_KEY, key, data, SETTINGS_CACHE_TTL);
        clearExpiredCache(SETTINGS_CACHE_PREFIX, SETTINGS_CACHE_VERSION_KEY, SETTINGS_CACHE_TTL);
    }

    /**
     * 필터 조합 기반 캐시 키 생성
     * @param {Object} filters - 필터 객체
     * @returns {string} 캐시 키
     */
    function buildCacheKey(filters) {
        var apiFilters = buildApiFilters(filters);
        var keyObj = {
            c: apiFilters.category ? apiFilters.category.join(',') : '',
            l: apiFilters.level ? apiFilters.level.join(',') : '',
            t: apiFilters.type ? apiFilters.type.join(',') : '',
            r: apiFilters.region ? apiFilters.region.join(',') : '',
            s: apiFilters.sort || 'latest',
            p: apiFilters.page || 1,
            m: apiFilters.maxPrice || 200000,
            q: apiFilters.search || ''
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
    function clearExpiredCache(prefix, versionKey, ttl) {
        try {
            var keysToRemove = [];
            var activeVersionPrefix = prefix + readCacheVersion(versionKey) + '_';
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (key && key.indexOf(prefix) === 0) {
                    if (key.indexOf(activeVersionPrefix) !== 0) {
                        keysToRemove.push(key);
                        continue;
                    }
                    var raw = localStorage.getItem(key);
                    if (raw) {
                        var entry = JSON.parse(raw);
                        var effectiveTtl = entry.ttl || ttl;
                        if (Date.now() - entry.timestamp > effectiveTtl) {
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

    function isNewClassBadge(classId) {
        var match = String(classId || '').match(/CL_(\d{6})_/);
        var now = new Date();
        var currentYm = now.getFullYear() * 100 + (now.getMonth() + 1);
        var prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        var prevYm = prevMonth.getFullYear() * 100 + (prevMonth.getMonth() + 1);
        var ym = match ? parseInt(match[1], 10) : 0;

        return ym === currentYm || ym === prevYm;
    }

    function computeCardBadges(cls) {
        var badges = [];
        var reviewCount = parseInt(cls.class_count, 10) || 0;
        var avgRating = parseFloat(cls.avg_rating) || 0;
        var totalRemaining = parseInt(cls.total_remaining, 10) || 0;
        var tags = String(cls.tags || '');
        var affiliationText = [cls.affiliation_code || '', tags, cls.class_name || '', cls.category || ''].join(' ');
        var contentMeta = resolveContentTypeMeta(cls);
        var gradeMeta = getPartnerGradeMeta(cls.partner_grade);

        if (gradeMeta.weight >= 2) {
            badges.push({ key: 'grade-' + gradeMeta.key, label: gradeMeta.label });
        }

        if (isNewClassBadge(cls.class_id)) {
            badges.push({ key: 'new', label: '\uC2E0\uADDC' });
        }
        if (reviewCount >= 8 || (avgRating >= 4.7 && reviewCount >= 5)) {
            badges.push({ key: 'popular', label: '\uC778\uAE30' });
        }
        if (totalRemaining > 0 && totalRemaining <= 3) {
            badges.push({ key: 'closing', label: '\uB9C8\uAC10\uC784\uBC15' });
        }
        if (parseInt(cls.kit_enabled, 10) === 1) {
            badges.push({ key: 'kit', label: '\uD0A4\uD2B8\uD3EC\uD568' });
        }
        if (normalizedContains(affiliationText, '\uD611\uD68C') || normalizedContains(affiliationText, '\uC81C\uD734')) {
            badges.push({ key: 'affiliation', label: '\uD611\uD68C\uC81C\uD734' });
        }
        if (contentMeta.key === 'event') {
            badges.push({ key: 'event', label: '\uC138\uBBF8\uB098' });
        }
        if (avgRating >= 4.8 && reviewCount >= 3) {
            badges.push({ key: 'rating', label: '\uB192\uC740\uD3C9\uC810' });
        }

        return badges.slice(0, 3);
    }

    function buildCardBadgesHtml(cls) {
        var badges = computeCardBadges(cls);
        var html = '';
        for (var i = 0; i < badges.length; i++) {
            html += '<span class="class-card__trust-badge class-card__trust-badge--' + badges[i].key + '">' + badges[i].label + '</span>';
        }
        return html;
    }

    function getDeliveryModeValue(cls) {
        var raw = String((cls && (cls.delivery_mode || cls.class_format || cls.format)) || '').replace(/\s+/g, ' ').trim().toUpperCase();
        var typeRaw = String((cls && cls.type) || '').replace(/\s+/g, ' ').trim();

        if (raw === 'ONLINE' || raw === 'OFFLINE' || raw === 'HYBRID') return raw;
        if (isOnlineType(typeRaw)) return 'ONLINE';
        if (typeRaw.indexOf('\uD558\uC774\uBE0C\uB9AC\uB4DC') > -1 || typeRaw.toUpperCase() === 'HYBRID') return 'HYBRID';
        return 'OFFLINE';
    }

    function normalizeContentTypeValue(raw, cls) {
        var text = String(raw || '').replace(/\s+/g, ' ').trim().toUpperCase();
        var tags = [cls && cls.tags, cls && cls.class_name, cls && cls.category, cls && cls.affiliation_code].join(' ');

        if (text.indexOf('EVENT') > -1 || text.indexOf('SEMINAR') > -1) return 'EVENT';
        if (text.indexOf('AFFILIATION') > -1 || text.indexOf('MEMBER') > -1) return 'AFFILIATION';
        if (text === 'CLASS' || text === 'GENERAL') return 'GENERAL';
        if (normalizedContains(tags, '\uC138\uBBF8\uB098') || normalizedContains(tags, '\uC774\uBCA4\uD2B8')) return 'EVENT';
        if ((cls && cls.affiliation_code) || normalizedContains(tags, '\uD611\uD68C') || normalizedContains(tags, '\uD611\uD68C\uC6D0') || normalizedContains(tags, '\uC81C\uD734')) return 'AFFILIATION';
        return 'GENERAL';
    }

    function resolveContentTypeMeta(cls) {
        var contentType = normalizeContentTypeValue(cls && cls.content_type, cls);
        var meta = {
            key: 'general',
            label: '\uC77C\uBC18 \uD074\uB798\uC2A4',
            desc: '\uD6C4\uAE30, \uD3EC\uD568 \uB0B4\uC5ED, \uC77C\uC815\uC744 \uBCF4\uACE0 \uBC14\uB85C \uC608\uC57D\uD558\uB294 \uAE30\uBCF8 \uD074\uB798\uC2A4 \uD750\uB984'
        };

        if (contentType === 'AFFILIATION') {
            meta.key = 'affiliation';
            meta.label = '\uD611\uD68C \uC804\uC6A9';
            meta.desc = '\uD611\uD68C \uC77C\uC815\uACFC \uD68C\uC6D0 \uD61C\uD0DD\uC774 \uD568\uAED8 \uC548\uB0B4\uB418\uB294 \uD074\uB798\uC2A4';
        } else if (contentType === 'EVENT') {
            meta.key = 'event';
            meta.label = '\uC138\uBBF8\uB098/\uC774\uBCA4\uD2B8';
            meta.desc = '\uC77C\uC815 \uBC0F \uACF5\uC9C0 \uBCC0\uB3D9\uC774 \uC911\uC694\uD55C \uD589\uC0AC\uD615 \uCF58\uD150\uCE20';
        }

        return meta;
    }

    function isLocalCatalogPreview() {
        var host = String(window.location.hostname || '').toLowerCase();
        return host === '127.0.0.1' || host === 'localhost';
    }

    function buildPartnerMapUrl(options) {
        var params = [];
        var base = isLocalCatalogPreview()
            ? '/output/playwright/fixtures/partnerclass/partnermap-shell.html'
            : '/partnermap';

        if (options && options.region) {
            params.push('region=' + encodeURIComponent(options.region));
        }
        if (options && options.category) {
            params.push('category=' + encodeURIComponent(options.category));
        }
        if (options && options.keyword) {
            params.push('keyword=' + encodeURIComponent(options.keyword));
        }
        if (options && options.partner) {
            params.push('partner=' + encodeURIComponent(options.partner));
        }
        if (options && options.classId) {
            params.push('class_id=' + encodeURIComponent(options.classId));
        }

        return base + (params.length ? '?' + params.join('&') : '');
    }

    function buildPartnerMapSearchUrl(cls) {
        var deliveryMode = getDeliveryModeValue(cls);
        if (deliveryMode === 'ONLINE') return '';

        return buildPartnerMapUrl({
            region: getDisplayRegionName(cls.region || cls.location || ''),
            category: cls.category || '',
            keyword: cls.class_name || '',
            partner: cls.partner_name || '',
            classId: cls.class_id || ''
        });
    }

    function buildCardMapEntryLabel(cls) {
        return getDeliveryModeValue(cls) === 'ONLINE' ? '' : '\uD30C\uD2B8\uB108\uB9F5\uC5D0\uC11C \uACF5\uBC29 \uBCF4\uAE30';
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
        var level = escapeHtml(normalizeLevelValue(cls.level || ''));
        var typeRaw = cls.type || '';
        var typeLabel = escapeHtml(typeRaw);
        var typeCss = TYPE_CLASS_MAP[typeRaw] || 'oneday';
        var price = formatPrice(cls.price || 0);
        var duration = cls.duration_min || 0;
        var durationText = duration >= 60
            ? Math.floor(duration / 60) + '\uC2DC\uAC04' + (duration % 60 > 0 ? ' ' + (duration % 60) + '\uBD84' : '')
            : duration + '\uBD84';
        var thumbnail = cls.thumbnail_url || '';
        var location = escapeHtml(cls.location || getDisplayRegionName(cls.region || ''));
        var partnerName = escapeHtml(cls.partner_name || '');
        var avgRating = parseFloat(cls.avg_rating) || 0;
        var classCount = parseInt(cls.class_count) || 0;
        var detailUrl = '/shop/page.html?id=2607&class_id=' + encodeURIComponent(classId);
        var trustBadgesHtml = buildCardBadgesHtml(cls);
        var mapUrl = buildPartnerMapSearchUrl(cls);
        var mapLabel = buildCardMapEntryLabel(cls);
        var contentMeta = resolveContentTypeMeta(cls);
        var deliveryMode = getDeliveryModeValue(cls);

        var starsHtml = renderStars(avgRating);

        var html = '<article class="class-card scroll-reveal class-card--' + contentMeta.key + '" role="listitem" '
            + 'data-class-id="' + classId + '" '
            + 'data-class-name="' + className + '" '
            + 'data-thumbnail="' + escapeHtml(thumbnail) + '" '
            + 'data-content-type="' + escapeHtml(contentMeta.key) + '" '
            + 'data-delivery-mode="' + escapeHtml(deliveryMode) + '" '
            + 'aria-label="' + className + ' - ' + partnerName + '">'
            + '<a href="' + detailUrl + '" class="class-card__link" aria-label="' + className + ' - ' + partnerName + '">'
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

        // 잔여석 배지 (Task 011)
        var totalRemaining = parseInt(cls.total_remaining) || 0;
        var scheduleCount = parseInt(cls.schedule_count) || 0;
        if (scheduleCount > 0) {
            if (totalRemaining <= 0) {
                html += '<span class="class-card__remaining class-card__remaining--soldout">\uB9C8\uAC10</span>';
            } else if (totalRemaining <= 3) {
                html += '<span class="class-card__remaining class-card__remaining--few">\uC794\uC5EC ' + totalRemaining + '\uC11D</span>';
            } else {
                html += '<span class="class-card__remaining">\uC794\uC5EC ' + totalRemaining + '\uC11D</span>';
            }
        }

        // 찜(관심) 하트 버튼
        html += '<button type="button" class="wishlist-btn" data-class-id="' + classId + '" '
            + 'aria-label="' + className + ' \uCC1C\uD558\uAE30">'
            + '<svg class="wishlist-btn__icon" viewBox="0 0 18 18" aria-hidden="true">'
            + '<path class="wishlist-btn__outline" d="M9 15.5s-6.5-4.35-6.5-8.18A3.32 3.32 0 0 1 5.82 4C7.2 4 8.35 4.82 9 5.96 9.65 4.82 10.8 4 12.18 4A3.32 3.32 0 0 1 15.5 7.32C15.5 11.15 9 15.5 9 15.5z" fill="none" stroke="currentColor" stroke-width="1.2"/>'
            + '<path class="wishlist-btn__filled" d="M9 15.5s-6.5-4.35-6.5-8.18A3.32 3.32 0 0 1 5.82 4C7.2 4 8.35 4.82 9 5.96 9.65 4.82 10.8 4 12.18 4A3.32 3.32 0 0 1 15.5 7.32C15.5 11.15 9 15.5 9 15.5z" fill="currentColor" stroke="currentColor" stroke-width="1.2" style="display:none"/>'
            + '</svg>'
            + '</button>';

        html += '</div>'; // /.class-card__thumb

        // 카드 본문 (검색어 하이라이트 적용)
        var displayClassName = currentSearchQuery ? highlightText(className, currentSearchQuery) : className;
        var displayPartnerName = currentSearchQuery ? highlightText(partnerName, currentSearchQuery) : partnerName;

        html += '<div class="class-card__body">';
        html += '<h3 class="class-card__title">' + displayClassName + '</h3>';
        if (trustBadgesHtml) {
            html += '<div class="class-card__trust-badges">' + trustBadgesHtml + '</div>';
        }

        // 메타 정보 (파트너명, 지역)
        html += '<div class="class-card__meta">';
        if (partnerName) {
            html += '<span class="class-card__partner">' + displayPartnerName + '</span>';
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
        html += '</a>';   // /.class-card__link
        if (mapUrl && mapLabel) {
            html += '<div class="class-card__actions">'
                + '<a href="' + escapeHtml(mapUrl) + '" target="_blank" rel="noopener" class="class-card__map-entry">' + mapLabel + '</a>'
                + '</div>';
        }
        html += '</article>';   // /.class-card

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
        var fullStarSvg = '<svg class="class-card__star class-card__star--filled" viewBox="0 0 14 14" fill="currentColor">'
            + '<path d="M7 1l1.76 3.57 3.94.57-2.85 2.78.67 3.93L7 10.07l-3.52 1.78.67-3.93L1.3 5.14l3.94-.57L7 1z"/>'
            + '</svg>';
        /* 반별: defs를 개별 SVG에 넣지 않고, renderCards()에서 한 번 선언한 공유 gradient 참조 */
        var halfStarSvg = '<svg class="class-card__star class-card__star--half" viewBox="0 0 14 14">'
            + '<path d="M7 1l1.76 3.57 3.94.57-2.85 2.78.67 3.93L7 10.07l-3.52 1.78.67-3.93L1.3 5.14l3.94-.57L7 1z" fill="url(#ccHalfStarGrad)"/>'
            + '</svg>';
        var emptyStarSvg = '<svg class="class-card__star class-card__star--empty" viewBox="0 0 14 14" fill="currentColor">'
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
            syncQuickFilterState();
            updateFilterBadge();
            updateActiveChips();
            updateURLParams();
            saveFilterState();
            fetchClasses(currentFilters);
        }, DEBOUNCE_DELAY);
    }

    /**
     * 모든 필터(체크박스 + pill)에서 값 수집
     */
    function collectFilterValues() {
        // 카테고리: pill 버튼의 is-active 상태에서 수집
        currentFilters.category = getActivePillValues();
        currentFilters.level = getCheckedValues('level');
        currentFilters.type = getCheckedValues('type');
        currentFilters.region = getCheckedValues('region');
    }

    /**
     * 활성 카테고리 pill 버튼 값 배열 반환
     * @returns {Array} 활성 카테고리 배열
     */
    function getActivePillValues() {
        var values = [];
        var pills = document.querySelectorAll('.class-catalog .category-pill.is-active');
        for (var i = 0; i < pills.length; i++) {
            var val = pills[i].getAttribute('data-category');
            if (val) values.push(val);
        }
        return values;
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

    function removeValueFromArray(arr, value) {
        var idx = arr ? arr.indexOf(value) : -1;
        if (idx > -1) arr.splice(idx, 1);
    }

    function syncPriceRangeUI() {
        var slider = document.getElementById('priceRange');
        if (!slider) return;

        slider.value = currentFilters.maxPrice;
        updatePriceDisplay(currentFilters.maxPrice);
        updateSliderTrack(slider);
    }

    function syncFilterUI() {
        setCategoryPills(currentFilters.category || []);
        setCheckboxes('level', currentFilters.level || []);
        setCheckboxes('type', currentFilters.type || []);
        setCheckboxes('region', currentFilters.region || []);
        syncPriceRangeUI();
        syncQuickFilterState();
    }

    function saveFilterState() {
        try {
            localStorage.setItem(FILTER_STATE_KEY, JSON.stringify({
                category: currentFilters.category || [],
                level: currentFilters.level || [],
                type: currentFilters.type || [],
                format: currentFilters.format || [],
                region: currentFilters.region || [],
                sort: currentFilters.sort || 'latest',
                maxPrice: currentFilters.maxPrice || 200000,
                search: currentFilters.search || ''
            }));
        } catch (e) {
            /* localStorage 저장 실패 시 무시 */
        }
    }

    function restoreFiltersFromStorage() {
        try {
            var raw = localStorage.getItem(FILTER_STATE_KEY);
            if (!raw) return false;

            var parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return false;

            currentFilters.category = dedupeArray(parsed.category || []);
            currentFilters.level = dedupeArray((parsed.level || []).map(normalizeLevelValue).filter(Boolean));
            currentFilters.type = dedupeArray(parsed.type || []);
            currentFilters.format = dedupeArray(parsed.format || []);
            currentFilters.type = pruneTypesByFormat(currentFilters.type, currentFilters.format);
            currentFilters.region = dedupeArray((parsed.region || []).map(getDisplayRegionName).filter(Boolean));
            currentFilters.sort = parsed.sort || 'latest';
            currentFilters.maxPrice = parsed.maxPrice || 200000;
            currentFilters.search = parsed.search || '';
            currentFilters.page = 1;

            var sortSelect = document.getElementById('sortSelect');
            if (sortSelect) sortSelect.value = currentFilters.sort;

            syncFilterUI();
            currentSearchQuery = currentFilters.search;
            return true;
        } catch (e) {
            return false;
        }
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

        // 카테고리 pill 버튼 전체 비활성화
        var pills = panel.querySelectorAll('.category-pill.is-active');
        for (var p = 0; p < pills.length; p++) {
            pills[p].classList.remove('is-active');
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
            format: [],
            region: [],
            sort: 'latest',
            page: 1,
            limit: PAGE_LIMIT,
            maxPrice: 200000,
            search: ''
        };
        currentSearchQuery = '';

        syncFilterUI();
        updateFilterBadge();
        updateActiveChips();
        updateURLParams();
        saveFilterState();
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
            saveFilterState();
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
            { key: 'format', label: '\uC628/\uC624\uD504\uB77C\uC778' },
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
            // 허용된 필터 키만 처리 (셀렉터 인젝션 방지)
            var allowedKeys = ['category', 'level', 'type', 'format', 'region'];
            if (allowedKeys.indexOf(filterKey) === -1) return;

            if (filterKey === 'category') {
                // 카테고리: pill 버튼 비활성화
                var pills = document.querySelectorAll('.class-catalog .category-pill');
                for (var p = 0; p < pills.length; p++) {
                    if (pills[p].getAttribute('data-category') === filterValue) {
                        pills[p].classList.remove('is-active');
                        break;
                    }
                }
            } else {
                // 체크박스 해제 (반복문으로 값 비교)
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
            }

            // 필터 배열에서 제거
            var arr = currentFilters[filterKey];
            if (arr && Array.isArray(arr)) {
                var idx = arr.indexOf(filterValue);
                if (idx > -1) arr.splice(idx, 1);
            }
        }

        currentFilters.page = 1;
        syncQuickFilterState();
        updateFilterBadge();
        updateActiveChips();
        updateURLParams();
        saveFilterState();
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
        count += (currentFilters.format || []).length;
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

    function restoreCatalogViewMode() {
        try {
            var stored = localStorage.getItem(VIEW_STATE_KEY);
            if (stored === 'map' || stored === 'list') {
                currentCatalogView = stored;
            }
        } catch (e) {
            currentCatalogView = 'list';
        }
    }

    function saveCatalogViewMode() {
        try {
            localStorage.setItem(VIEW_STATE_KEY, currentCatalogView);
        } catch (e) {
            /* 무시 */
        }
    }

    function initCatalogViewToggle() {
        var wrap = document.getElementById('catalogViewToggle');
        if (!wrap) return;

        wrap.addEventListener('click', function(e) {
            var btn = e.target.closest('.catalog-view-toggle__btn');
            if (!btn || btn.disabled) return;
            setCatalogView(btn.getAttribute('data-view') || 'list');
        });
    }

    function isMapViewAvailable() {
        if (activeCatalogTab !== 'classes') return false;
        if ((currentFilters.format || []).length === 1 && currentFilters.format[0] === '\uC628\uB77C\uC778') return false;

        var list = currentDisplayClasses.length ? currentDisplayClasses : currentClasses;
        return list.some(function(cls) {
            return getDeliveryModeValue(cls) !== 'ONLINE';
        });
    }

    function setCatalogView(mode) {
        if (mode === 'map' && !isMapViewAvailable()) {
            currentCatalogView = 'list';
        } else {
            currentCatalogView = mode === 'map' ? 'map' : 'list';
        }

        saveCatalogViewMode();
        updateCatalogViewUI();
    }

    function updateCatalogViewUI() {
        var listBtn = document.getElementById('viewListBtn');
        var mapBtn = document.getElementById('viewMapBtn');
        var grid = document.getElementById('classGrid');
        var mapPanel = document.getElementById('catalogMapPanel');
        var empty = document.getElementById('catalogEmpty');
        var pagination = document.getElementById('catalogPagination');
        var recent = document.getElementById('recentSection');
        var title = document.getElementById('catalogDiscoveryTitle');
        var desc = document.getElementById('catalogDiscoveryDesc');
        var mapAvailable = isMapViewAvailable();
        var useMap = mapAvailable && currentCatalogView === 'map' && activeCatalogTab === 'classes';

        if (mapBtn) {
            mapBtn.disabled = !mapAvailable;
            if (!mapAvailable) {
                mapBtn.classList.add('is-disabled');
                mapBtn.setAttribute('aria-selected', 'false');
            } else {
                mapBtn.classList.remove('is-disabled');
                mapBtn.setAttribute('aria-selected', useMap ? 'true' : 'false');
            }
            mapBtn.classList.toggle('is-active', useMap);
        }

        if (listBtn) {
            listBtn.classList.toggle('is-active', !useMap);
            listBtn.setAttribute('aria-selected', useMap ? 'false' : 'true');
        }

        if (grid) grid.style.display = useMap ? 'none' : '';
        if (mapPanel) mapPanel.style.display = useMap ? '' : 'none';

        if (title && desc) {
            if ((currentFilters.format || []).length === 1 && currentFilters.format[0] === '\uC628\uB77C\uC778') {
                title.textContent = '\uC628\uB77C\uC778 \uC218\uC5C5\uC740 \uB9AC\uC2A4\uD2B8\uC5D0\uC11C \uBC14\uB85C \uBE44\uAD50\uD558\uC138\uC694.';
                desc.textContent = '\uC9C0\uB3C4 \uBCF4\uAE30\uB294 \uC624\uD504\uB77C\uC778 \uD074\uB798\uC2A4\uB97C \uC704\uD55C \uD0D0\uC0C9 \uBDF0\uC785\uB2C8\uB2E4. \uC628\uB77C\uC778 \uC218\uC5C5\uC740 \uB9AC\uC2A4\uD2B8\uC5D0\uC11C \uAC00\uACA9, \uC77C\uC815, \uD6C4\uAE30\uB97C \uBC14\uB85C \uBE44\uAD50\uD574\uBCF4\uC138\uC694.';
            } else if (useMap) {
                title.textContent = '\uC6D0\uD558\uB294 \uC9C0\uC5ED\uC758 \uACF5\uBC29\uACFC \uD074\uB798\uC2A4\uB97C \uC9C0\uB3C4\uC5D0\uC11C \uD568\uAED8 \uBCF4\uC138\uC694.';
                desc.textContent = '\uD30C\uD2B8\uB108\uB9F5 \uD0D0\uC0C9 \uBDF0\uB294 \uB9AC\uC2A4\uD2B8 \uD544\uD130\uB97C \uADF8\uB300\uB85C \uBC1B\uC544 \uAC00\uAE4C\uC6B4 \uC624\uD504\uB77C\uC778 \uC218\uC5C5\uACFC \uD611\uD68C/\uC774\uBCA4\uD2B8 \uAC70\uC810\uC744 \uD568\uAED8 \uB4DC\uB7EC\uB0C5\uB2C8\uB2E4.';
            } else {
                title.textContent = '\uC6D0\uD558\uB294 \uCE74\uD14C\uACE0\uB9AC\uC640 \uC9C0\uC5ED\uC744 \uACE0\uB974\uACE0, \uC624\uD504\uB77C\uC778\uC740 \uC9C0\uB3C4\uC5D0\uC11C \uBC14\uB85C \uBE44\uAD50\uD558\uC138\uC694.';
                desc.textContent = '\uC624\uD504\uB77C\uC778 \uD074\uB798\uC2A4\uB294 \uD30C\uD2B8\uB108\uB9F5 \uAE30\uBC18\uC73C\uB85C \uAC00\uAE4C\uC6B4 \uACF5\uBC29\uC744 \uAC19\uC774 \uD0D0\uC0C9\uD558\uACE0, \uC628\uB77C\uC778 \uD074\uB798\uC2A4\uB294 \uB9AC\uC2A4\uD2B8\uC5D0\uC11C \uBC14\uB85C \uC77C\uC815\uACFC \uAC00\uACA9\uC744 \uBE44\uAD50\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.';
            }
        }

        if (empty && useMap) {
            empty.style.display = 'none';
        }
        if (pagination && useMap) {
            pagination.style.display = 'none';
        }
        if (recent) {
            if (useMap) {
                recent.style.display = 'none';
            } else {
                renderRecentSection();
            }
        }
    }

    function renderMapPanel(classes) {
        var frame = document.getElementById('catalogMapFrame');
        var notice = document.getElementById('catalogMapNotice');
        var stats = document.getElementById('catalogMapStats');
        var spotlights = document.getElementById('catalogMapSpotlights');
        var title = document.getElementById('catalogMapTitle');
        var desc = document.getElementById('catalogMapDesc');
        var offlineClasses = (classes || []).filter(function(cls) {
            return getDeliveryModeValue(cls) !== 'ONLINE';
        });
        var onlineCount = (classes || []).length - offlineClasses.length;
        var regionMap = {};
        var i;
        var html = '';

        if (!frame || !notice || !stats || !spotlights) return;

        for (i = 0; i < offlineClasses.length; i++) {
            var regionName = getDisplayRegionName(offlineClasses[i].region || offlineClasses[i].location || '');
            if (regionName) {
                regionMap[regionName] = true;
            }
        }

        stats.innerHTML = ''
            + '<div class="catalog-map-panel__stat"><strong>' + formatNumber(offlineClasses.length) + '</strong><span>\uC624\uD504\uB77C\uC778 \uD074\uB798\uC2A4</span></div>'
            + '<div class="catalog-map-panel__stat"><strong>' + formatNumber(Object.keys(regionMap).length) + '</strong><span>\uD0D0\uC0C9 \uAC00\uB2A5 \uC9C0\uC5ED</span></div>'
            + '<div class="catalog-map-panel__stat"><strong>' + formatNumber(Math.max(onlineCount, 0)) + '</strong><span>\uD568\uAED8 \uBE44\uAD50\uD560 \uC628\uB77C\uC778</span></div>';

        frame.src = buildPartnerMapUrl({
            region: (currentFilters.region || [])[0] || '',
            category: (currentFilters.category || [])[0] || '',
            keyword: currentFilters.search || ''
        });

        if (!offlineClasses.length) {
            title.textContent = '\uD604\uC7AC \uD544\uD130\uC5D0 \uC0C1\uC751\uD558\uB294 \uC624\uD504\uB77C\uC778 \uD074\uB798\uC2A4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.';
            desc.textContent = '\uC9C0\uC5ED \uD544\uD130\uB97C \uC644\uD654\uD558\uAC70\uB098 \uC628/\uC624\uD504\uB77C\uC778 \uC870\uAC74\uC744 \uC870\uC815\uD558\uBA74 \uC804\uAD6D \uD074\uB798\uC2A4 \uD558\uC774\uD2B8\uB97C \uB2E4\uC2DC \uBCFC \uC218 \uC788\uC5B4\uC694.';
            notice.textContent = '\uC628\uB77C\uC778 \uC218\uC5C5\uB9CC \uBCF4\uACE0 \uC788\uB294 \uACBD\uC6B0 \uC9C0\uB3C4 \uBCF4\uAE30\uB294 \uC790\uB3D9\uC73C\uB85C \uBE44\uD65C\uC131\uD654\uB429\uB2C8\uB2E4.';
            spotlights.innerHTML = '<div class="catalog-map-panel__empty">\uC9C0\uAE08\uC740 \uB9AC\uC2A4\uD2B8 \uBCF4\uAE30\uB85C \uB3CC\uC544\uAC00 \uC628\uB77C\uC778 \uC218\uC5C5\uACFC \uD601\uC2E0 \uC774\uBCA4\uD2B8\uB97C \uBE44\uAD50\uD574\uBCF4\uC138\uC694.</div>';
            return;
        }

        title.textContent = '\uC804\uAD6D \uD30C\uD2B8\uB108 \uACF5\uBC29\uC744 \uC9C0\uB3C4\uC5D0\uC11C \uC0B4\uD3B4\uBCF4\uC138\uC694.';
        desc.textContent = '\uD604\uC7AC \uD544\uD130 \uAE30\uC900\uC73C\uB85C \uAC00\uAE4C\uC6B4 \uC9C0\uC5ED \uC218\uC5C5\uC744 \uBA3C\uC800 \uD655\uC778\uD558\uACE0, \uAD00\uC2EC \uACF5\uBC29\uC73C\uB85C \uBC14\uB85C \uC774\uB3D9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.';
        notice.textContent = '\uC2E4\uBC30\uD3EC \uC2DC \uC774 \uC601\uC5ED\uC740 \uAE30\uC874 \uD30C\uD2B8\uB108\uB9F5\uACFC \uC5F0\uB3D9\uB41C \uC624\uD504\uB77C\uC778 \uD0D0\uC0C9 \uBDF0\uB85C \uB3D9\uC791\uD569\uB2C8\uB2E4.';

        for (i = 0; i < offlineClasses.length && i < 4; i++) {
            html += renderMapSpotlight(offlineClasses[i]);
        }
        spotlights.innerHTML = html;
    }

    function renderMapSpotlight(cls) {
        var region = getDisplayRegionName(cls.region || cls.location || '') || '\uC804\uAD6D';
        var typeLabel = cls.type || '\uC624\uD504\uB77C\uC778';
        var priceText = cls.price ? formatPrice(cls.price) + '\uC6D0' : '\uC0C1\uC138 \uC548\uB0B4';
        var detailUrl = '/shop/page.html?id=2607&class_id=' + encodeURIComponent(cls.class_id || '');
        var mapUrl = buildPartnerMapSearchUrl(cls);

        return '<article class="catalog-map-spotlight">'
            + '<div class="catalog-map-spotlight__meta">'
            + '<span class="catalog-map-spotlight__chip">' + escapeHtml(typeLabel) + '</span>'
            + '<span class="catalog-map-spotlight__chip catalog-map-spotlight__chip--place">' + escapeHtml(region) + '</span>'
            + '</div>'
            + '<h3 class="catalog-map-spotlight__name">' + escapeHtml(cls.class_name || '') + '</h3>'
            + '<p class="catalog-map-spotlight__desc">' + escapeHtml((cls.partner_name || '\uD30C\uD2B8\uB108 \uACF5\uBC29') + ' | ' + priceText + ' | ' + resolveContentTypeMeta(cls).desc) + '</p>'
            + '<div class="catalog-map-spotlight__actions">'
            + '<a href="' + detailUrl + '" class="catalog-map-spotlight__link catalog-map-spotlight__link--primary">\uC0C1\uC138 \uBCF4\uAE30</a>'
            + (mapUrl ? '<a href="' + escapeHtml(mapUrl) + '" class="catalog-map-spotlight__link catalog-map-spotlight__link--secondary">\uC9C0\uB3C4\uC5D0\uC11C \uBCF4\uAE30</a>' : '')
            + '</div>'
            + '</article>';
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

            if (activeCatalogTab !== 'classes') params.set('tab', activeCatalogTab);
            if (currentFilters.category.length > 0) params.set('category', currentFilters.category.join(','));
            if (currentFilters.level.length > 0) params.set('level', currentFilters.level.join(','));
            if (currentFilters.type.length > 0) params.set('type', currentFilters.type.join(','));
            if (currentFilters.format.length > 0) params.set('format', currentFilters.format.join(','));
            if (currentFilters.region.length > 0) params.set('region', currentFilters.region.join(','));
            if (currentFilters.sort !== 'latest') params.set('sort', currentFilters.sort);
            if (currentFilters.page > 1) params.set('page', currentFilters.page);
            if (currentFilters.maxPrice < 200000) params.set('maxPrice', currentFilters.maxPrice);
            if (currentFilters.search) params.set('q', currentFilters.search);
            if (activeCatalogTab === 'classes' && currentCatalogView === 'map' && isMapViewAvailable()) params.set('view', 'map');

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
            var hasFilterParams = params.has('tab') || params.has('view') || params.has('category') || params.has('level')
                || params.has('type') || params.has('format') || params.has('region')
                || params.has('sort') || params.has('page') || params.has('maxPrice') || params.has('q');

            if (!hasFilterParams) {
                restoreFiltersFromStorage();
                updateFilterBadge();
                updateActiveChips();
                return;
            }

            if (params.get('tab') === 'affiliations' || params.get('tab') === 'benefits') {
                activeCatalogTab = params.get('tab');
            } else {
                activeCatalogTab = 'classes';
            }

            if (params.has('category')) {
                currentFilters.category = params.get('category').split(',');
                setCategoryPills(currentFilters.category);
            }
            if (params.has('level')) {
                currentFilters.level = dedupeArray(splitFilterValues(params.get('level')).map(normalizeLevelValue).filter(Boolean));
                setCheckboxes('level', currentFilters.level);
            }
            if (params.has('type')) {
                currentFilters.type = params.get('type').split(',');
                setCheckboxes('type', currentFilters.type);
            }
            if (params.has('format')) {
                currentFilters.format = dedupeArray(splitFilterValues(params.get('format')).filter(Boolean));
                currentFilters.type = pruneTypesByFormat(currentFilters.type, currentFilters.format);
                setCheckboxes('type', currentFilters.type);
            }
            if (params.has('region')) {
                currentFilters.region = dedupeArray(splitFilterValues(params.get('region')).map(getDisplayRegionName).filter(Boolean));
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
            if (params.has('q')) {
                currentFilters.search = params.get('q');
                currentSearchQuery = currentFilters.search;
            }
            if (params.get('view') === 'map') {
                currentCatalogView = 'map';
            }

            syncQuickFilterState();
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

    /**
     * 카테고리 pill 버튼을 값 배열에 맞게 활성화 (URL 복원용)
     * @param {Array} values - 활성화할 카테고리 값 배열
     */
    function setCategoryPills(values) {
        var pills = document.querySelectorAll('.class-catalog .category-pill');
        for (var i = 0; i < pills.length; i++) {
            var val = pills[i].getAttribute('data-category');
            if (values.indexOf(val) > -1) {
                pills[i].classList.add('is-active');
            } else {
                pills[i].classList.remove('is-active');
            }
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
     * 클래스 목록 로드 완료 시 head 내 script 태그를 업데이트
     * @param {Array} classes - 클래스 객체 배열
     */
    function injectSchemaOrg(classes) {
        var script = document.getElementById('schemaItemList');

        // script 태그가 없으면 head에 새로 생성
        if (!script) {
            script = document.createElement('script');
            script.type = 'application/ld+json';
            script.id = 'schemaItemList';
            document.head.appendChild(script);
        }

        var items = [];
        for (var i = 0; i < classes.length; i++) {
            var cls = classes[i];
            var classId = encodeURIComponent(cls.class_id || '');
            /* 메이크샵 상세 페이지 ID: 2607 (확정) */
            var detailUrl = 'https://foreverlove.co.kr/shop/page.html?id=2607&class_id=' + classId;
            items.push({
                '@type': 'ListItem',
                'position': i + 1,
                'name': cls.class_name || '',
                'url': detailUrl
            });
        }

        var schema = {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            'name': 'PRESSCO21 \uD30C\uD2B8\uB108 \uD074\uB798\uC2A4 \uBAA9\uB85D',
            'numberOfItems': classes.length,
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
        var n = Number(price);
        if (isNaN(n) || n < 0) return '0';
        return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * 숫자 포맷 (천 단위 콤마)
     * @param {number} num - 숫자
     * @returns {string} 포맷된 문자열
     */
    function formatNumber(num) {
        return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function splitFilterValues(raw) {
        var parts = String(raw || '').split(',');
        var result = [];
        for (var i = 0; i < parts.length; i++) {
            var value = String(parts[i] || '').replace(/\s+/g, ' ').trim();
            if (value) result.push(value);
        }
        return result;
    }

    function dedupeArray(items) {
        var seen = {};
        var result = [];
        for (var i = 0; i < items.length; i++) {
            var key = String(items[i] || '');
            if (!key || seen[key]) continue;
            seen[key] = true;
            result.push(key);
        }
        return result;
    }

    function normalizeLevelValue(raw) {
        var text = String(raw || '').replace(/\s+/g, ' ').trim();
        var upper = text.toUpperCase();
        var lower = text.toLowerCase();

        if (!text) return '';
        if (upper === 'BEGINNER' || lower === 'beginner' || lower === 'basic' || text.indexOf('\uC785\uBB38') > -1 || text.indexOf('\uCD08\uAE09') > -1) return '\uC785\uBB38';
        if (upper === 'INTERMEDIATE' || lower === 'intermediate' || text.indexOf('\uC911\uAE09') > -1) return '\uC911\uAE09';
        if (upper === 'ADVANCED' || lower === 'advanced' || lower === 'expert' || text.indexOf('\uC2EC\uD654') > -1 || text.indexOf('\uACE0\uAE09') > -1) return '\uC2EC\uD654';
        if (upper === 'ALL_LEVELS' || text.indexOf('\uC804\uCCB4') > -1) return '\uC804\uCCB4';
        return text;
    }

    function normalizeLevelForApi(raw) {
        var label = normalizeLevelValue(raw);
        var map = {
            '\uC785\uBB38': 'BEGINNER',
            '\uC911\uAE09': 'INTERMEDIATE',
            '\uC2EC\uD654': 'ADVANCED',
            '\uC804\uCCB4': 'ALL_LEVELS'
        };
        return map[label] || String(raw || '').replace(/\s+/g, ' ').trim().toUpperCase();
    }

    function getDisplayRegionName(raw) {
        var text = String(raw || '').replace(/\s+/g, ' ').trim();
        var upper = text.toUpperCase();
        var map = {
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
        if (map[upper]) return map[upper];
        if (text.indexOf('\uC628\uB77C\uC778') > -1 || text.toLowerCase().indexOf('online') > -1) return '\uC628\uB77C\uC778';
        return text.split(' ')[0];
    }

    function normalizeRegionForApi(raw) {
        var label = getDisplayRegionName(raw);
        var map = {
            '\uC11C\uC6B8': 'SEOUL',
            '\uACBD\uAE30': 'GYEONGGI',
            '\uC778\uCC9C': 'INCHEON',
            '\uBD80\uC0B0': 'BUSAN',
            '\uB300\uAD6C': 'DAEGU',
            '\uB300\uC804': 'DAEJEON',
            '\uAD11\uC8FC': 'GWANGJU',
            '\uC6B8\uC0B0': 'ULSAN',
            '\uC138\uC885': 'SEJONG',
            '\uAC15\uC6D0': 'GANGWON',
            '\uCDA9\uBD81': 'CHUNGBUK',
            '\uCDA9\uB0A8': 'CHUNGNAM',
            '\uC804\uBD81': 'JEONBUK',
            '\uC804\uB0A8': 'JEONNAM',
            '\uACBD\uBD81': 'GYEONGBUK',
            '\uACBD\uB0A8': 'GYEONGNAM',
            '\uC81C\uC8FC': 'JEJU',
            '\uC628\uB77C\uC778': 'ONLINE',
            '\uAE30\uD0C0': 'OTHER'
        };

        return map[label] || String(raw || '').replace(/\s+/g, ' ').trim().toUpperCase();
    }

    function normalizePartnerGrade(raw) {
        var text = String(raw || '').replace(/\s+/g, ' ').trim().toUpperCase();
        var alias = {
            SILVER: 'BLOOM',
            GOLD: 'GARDEN',
            PLATINUM: 'ATELIER'
        };

        return alias[text] || text || 'BLOOM';
    }

    function getPartnerGradeMeta(raw) {
        var grade = normalizePartnerGrade(raw);
        var metaMap = {
            BLOOM: { key: 'bloom', label: 'BLOOM', chipLabel: 'BLOOM 파트너', weight: 1 },
            GARDEN: { key: 'garden', label: 'GARDEN', chipLabel: 'GARDEN 우선', weight: 2 },
            ATELIER: { key: 'atelier', label: 'ATELIER', chipLabel: 'ATELIER 인터뷰', weight: 3 },
            AMBASSADOR: { key: 'ambassador', label: 'AMBASSADOR', chipLabel: 'AMBASSADOR 멘토', weight: 4 }
        };

        return metaMap[grade] || metaMap.BLOOM;
    }

    function comparePartnerExposure(a, b) {
        var aMeta = getPartnerGradeMeta(a && a.partner_grade);
        var bMeta = getPartnerGradeMeta(b && b.partner_grade);
        var ratingDiff = (parseFloat(b && b.avg_rating) || 0) - (parseFloat(a && a.avg_rating) || 0);
        var reviewDiff = (parseInt(b && b.class_count, 10) || 0) - (parseInt(a && a.class_count, 10) || 0);
        var seatDiff = (parseInt(b && b.total_remaining, 10) || 0) - (parseInt(a && a.total_remaining, 10) || 0);

        if (bMeta.weight !== aMeta.weight) {
            return bMeta.weight - aMeta.weight;
        }
        if (ratingDiff !== 0) {
            return ratingDiff;
        }
        if (reviewDiff !== 0) {
            return reviewDiff;
        }
        if (seatDiff !== 0) {
            return seatDiff;
        }

        return String(a && a.class_name || '').localeCompare(String(b && b.class_name || ''));
    }

    function normalizedContains(source, keyword) {
        var normalizedSource = String(source || '').replace(/\s+/g, '').toLowerCase();
        var normalizedKeyword = String(keyword || '').replace(/\s+/g, '').toLowerCase();
        if (!normalizedSource || !normalizedKeyword) return false;
        return normalizedSource.indexOf(normalizedKeyword) > -1;
    }

    function isOnlineType(raw) {
        return String(raw || '').replace(/\s+/g, ' ').trim().indexOf('\uC628\uB77C\uC778') > -1;
    }

    function getEffectiveTypeFilters(filters) {
        var types = dedupeArray(filters.type || []);
        var formats = dedupeArray(filters.format || []);
        var allowedByFormat = [];

        if (formats.indexOf('\uC628\uB77C\uC778') > -1) {
            allowedByFormat.push('\uC628\uB77C\uC778');
        }
        if (formats.indexOf('\uC624\uD504\uB77C\uC778') > -1) {
            allowedByFormat.push('\uC6D0\uB370\uC774');
            allowedByFormat.push('\uC815\uAE30');
        }

        if (allowedByFormat.length === 0) {
            return dedupeArray(types);
        }
        if (types.length === 0) {
            return dedupeArray(allowedByFormat);
        }

        return dedupeArray(types.filter(function(type) {
            return allowedByFormat.indexOf(type) > -1;
        }));
    }

    function buildApiFilters(filters) {
        return {
            category: dedupeArray(filters.category || []),
            level: dedupeArray((filters.level || []).map(normalizeLevelForApi).filter(Boolean)),
            type: getEffectiveTypeFilters(filters),
            region: dedupeArray((filters.region || []).map(normalizeRegionForApi).filter(Boolean)),
            sort: filters.sort || 'latest',
            page: filters.page || 1,
            limit: filters.limit || PAGE_LIMIT,
            maxPrice: filters.maxPrice || 200000,
            search: filters.search || ''
        };
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
     * 검색어 하이라이트: 이스케이프된 텍스트에서 검색어 매칭 부분을 <mark>로 감싸기
     * XSS 안전: 먼저 escapeHtml 후 검색어 매칭만 mark 태그로 치환
     * @param {string} escapedText - escapeHtml() 적용된 안전한 문자열
     * @param {string} query - 검색어 (원본)
     * @returns {string} 하이라이트 적용된 HTML 문자열
     */
    function highlightText(escapedText, query) {
        if (!query || !escapedText) return escapedText;
        // 검색어도 이스케이프해서 이스케이프된 텍스트와 매칭
        var escapedQuery = escapeHtml(query);
        if (!escapedQuery) return escapedText;
        // 정규식 특수문자 이스케이프
        var safeQuery = escapedQuery.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&');
        try {
            var regex = new RegExp('(' + safeQuery + ')', 'gi');
            return escapedText.replace(regex, '<mark>$1</mark>');
        } catch (e) {
            return escapedText;
        }
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
       찜(관심) 기능
       ======================================== */

    /**
     * 찜 기능 초기화
     * - 하트 버튼 이벤트 위임
     * - 찜 필터 토글 바인딩
     * - 찜 배지 카운트 업데이트
     */
    function initWishlist() {
        // 하트 버튼 클릭: 이벤트 위임 (classGrid)
        var grid = document.getElementById('classGrid');
        if (grid) {
            grid.addEventListener('click', function(e) {
                var btn = e.target.closest('.wishlist-btn');
                if (!btn) return;

                e.preventDefault();
                e.stopPropagation();

                var classId = btn.getAttribute('data-class-id');
                if (!classId) return;

                toggleWishlist(classId, btn);
            });
        }

        // 찜 필터 토글 버튼
        var filterBtn = document.getElementById('wishlistFilterBtn');
        if (filterBtn) {
            filterBtn.addEventListener('click', onWishlistFilterToggle);
        }

        // 찜 배지 카운트 업데이트
        updateWishlistCount();
    }

    /**
     * localStorage에서 찜 목록 조회
     * @returns {Array} class_id 문자열 배열
     */
    function getWishlist() {
        try {
            var raw = localStorage.getItem(WISHLIST_KEY);
            if (!raw) return [];
            var arr = JSON.parse(raw);
            if (!Array.isArray(arr)) return [];
            return arr;
        } catch (e) {
            return [];
        }
    }

    /**
     * localStorage에 찜 목록 저장
     * @param {Array} list - class_id 배열
     */
    function saveWishlist(list) {
        try {
            localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
        } catch (e) {
            /* localStorage 용량 초과 시 무시 */
        }
    }

    /**
     * 찜 토글 (추가/제거)
     * @param {string} classId - 클래스 ID
     * @param {HTMLElement} btn - 하트 버튼 요소
     */
    function toggleWishlist(classId, btn) {
        var list = getWishlist();
        var idx = list.indexOf(classId);

        if (idx > -1) {
            // 제거
            list.splice(idx, 1);
            btn.classList.remove('is-active');
            updateHeartIcon(btn, false);
        } else {
            // 추가
            list.push(classId);
            btn.classList.add('is-active');
            updateHeartIcon(btn, true);
        }

        // 바운스 애니메이션
        btn.classList.remove('is-animating');
        /* 리플로우 트리거로 애니메이션 재시작 */
        void btn.offsetWidth;
        btn.classList.add('is-animating');

        saveWishlist(list);
        updateWishlistCount();

        // 찜 필터가 활성화되어 있고, 찜을 해제한 경우 목록 새로고침
        if (isWishlistFilterOn && idx > -1) {
            handleClassesResponse({ success: true, data: { classes: currentClasses, total: currentClasses.length, page: 1, totalPages: 1 } });
        }
    }

    /**
     * 하트 아이콘 채워짐/빈 상태 전환
     * @param {HTMLElement} btn - 하트 버튼 요소
     * @param {boolean} active - 활성 여부
     */
    function updateHeartIcon(btn, active) {
        var outline = btn.querySelector('.wishlist-btn__outline');
        var filled = btn.querySelector('.wishlist-btn__filled');
        if (outline) outline.style.display = active ? 'none' : '';
        if (filled) filled.style.display = active ? '' : 'none';
    }

    /**
     * 카드 렌더링 후 찜 상태 복원
     */
    function restoreWishlistState() {
        var wishlist = getWishlist();
        if (wishlist.length === 0) return;

        var btns = document.querySelectorAll('.class-catalog .wishlist-btn');
        for (var i = 0; i < btns.length; i++) {
            var classId = btns[i].getAttribute('data-class-id');
            if (wishlist.indexOf(classId) > -1) {
                btns[i].classList.add('is-active');
                updateHeartIcon(btns[i], true);
            }
        }
    }

    /**
     * 찜 카운트 배지 업데이트
     */
    function updateWishlistCount() {
        var count = getWishlist().length;
        var badge = document.getElementById('wishlistCount');
        var filterBtn = document.getElementById('wishlistFilterBtn');

        if (badge) {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = '';
            } else {
                badge.style.display = 'none';
            }
        }

        // 찜 필터 버튼 활성 상태 동기화
        if (filterBtn) {
            if (isWishlistFilterOn) {
                filterBtn.classList.add('is-active');
                filterBtn.setAttribute('aria-pressed', 'true');
            } else {
                filterBtn.classList.remove('is-active');
                filterBtn.setAttribute('aria-pressed', 'false');
            }
        }
    }

    /**
     * "찜한 클래스만 보기" 필터 토글
     */
    function onWishlistFilterToggle() {
        isWishlistFilterOn = !isWishlistFilterOn;
        updateWishlistCount();

        // 현재 데이터로 재렌더링 (API 재호출 불필요)
        if (currentClasses.length > 0) {
            handleClassesResponse({
                success: true,
                data: {
                    classes: currentClasses,
                    total: currentClasses.length,
                    page: 1,
                    totalPages: 1
                }
            });
        } else {
            // 데이터가 없으면 API 재호출
            fetchClasses(currentFilters);
        }
    }

    /**
     * 찜 필터 활성인데 찜한 클래스가 없는 경우의 빈 상태
     */
    function renderWishlistEmpty() {
        var grid = document.getElementById('classGrid');
        if (!grid) return;

        grid.innerHTML = '<div style="text-align:center;padding:60px 24px;grid-column:1/-1;">'
            + '<svg width="64" height="64" viewBox="0 0 18 18" fill="none" style="opacity:0.3;margin-bottom:16px;">'
            + '<path d="M9 15.5s-6.5-4.35-6.5-8.18A3.32 3.32 0 0 1 5.82 4C7.2 4 8.35 4.82 9 5.96 9.65 4.82 10.8 4 12.18 4A3.32 3.32 0 0 1 15.5 7.32C15.5 11.15 9 15.5 9 15.5z" stroke="#999" stroke-width="1"/>'
            + '</svg>'
            + '<p style="font-size:15px;color:#333;font-weight:500;margin:0 0 6px;">'
            + '\uCC1C\uD55C \uD074\uB798\uC2A4\uAC00 \uC544\uC9C1 \uC5C6\uC5B4\uC694</p>'
            + '<p style="font-size:13px;color:#777;margin:0 0 20px;">'
            + '\uB9C8\uC74C\uC5D0 \uB4DC\uB294 \uD074\uB798\uC2A4\uC758 \uD558\uD2B8\uB97C \uB20C\uB7EC\uBCF4\uC138\uC694!</p>'
            + '</div>';
    }


    /* ========================================
       최근 본 클래스
       ======================================== */

    /**
     * localStorage에서 최근 본 클래스 목록 조회
     * @returns {Array} { class_id, class_name, thumbnail } 객체 배열
     */
    function getRecentClasses() {
        try {
            var raw = localStorage.getItem(RECENT_KEY);
            if (!raw) return [];
            var arr = JSON.parse(raw);
            if (!Array.isArray(arr)) return [];
            return arr;
        } catch (e) {
            return [];
        }
    }

    /**
     * localStorage에 최근 본 클래스 저장
     * @param {Array} list - 최근 본 클래스 배열
     */
    function saveRecentClasses(list) {
        try {
            localStorage.setItem(RECENT_KEY, JSON.stringify(list));
        } catch (e) {
            /* 무시 */
        }
    }

    /**
     * 최근 본 클래스에 추가
     * - 중복 제거 후 최신 항목을 앞에 배치
     * - 최대 RECENT_MAX개 유지
     * @param {string} classId - 클래스 ID
     * @param {string} className - 클래스 이름
     * @param {string} thumbnail - 썸네일 URL
     */
    function addToRecent(classId, className, thumbnail) {
        if (!classId) return;

        var list = getRecentClasses();

        // 중복 제거 (같은 class_id 있으면 제거)
        list = list.filter(function(item) {
            return item.class_id !== classId;
        });

        // 최신 항목을 앞에 추가
        list.unshift({
            class_id: classId,
            class_name: className || '',
            thumbnail: thumbnail || ''
        });

        // 최대 수 제한
        if (list.length > RECENT_MAX) {
            list = list.slice(0, RECENT_MAX);
        }

        saveRecentClasses(list);
    }

    /**
     * 최근 본 클래스 섹션 렌더링
     */
    function renderRecentSection() {
        var section = document.getElementById('recentSection');
        var container = document.getElementById('recentScrollContainer');
        if (!section || !container) return;

        var recentList = getRecentClasses();

        if (recentList.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = '';

        var html = '';
        for (var i = 0; i < recentList.length; i++) {
            var item = recentList[i];
            var detailUrl = '/shop/page.html?id=2607&class_id=' + encodeURIComponent(item.class_id || '');
            var safeName = escapeHtml(item.class_name || '');
            var safeThumb = escapeHtml(item.thumbnail || '');

            html += '<a href="' + detailUrl + '" class="recent-card" '
                + 'aria-label="' + safeName + '">'
                + '<div class="recent-card__thumb">';

            if (safeThumb) {
                html += '<img class="recent-card__img" src="' + safeThumb + '" '
                    + 'alt="' + safeName + '" loading="lazy">';
            }

            html += '</div>'
                + '<p class="recent-card__name">' + safeName + '</p>'
                + '</a>';
        }

        container.innerHTML = html;

        // 전체 삭제 버튼
        var clearBtn = document.getElementById('recentClearBtn');
        if (clearBtn) {
            // 기존 리스너 중복 방지: onclick으로 교체
            clearBtn.onclick = function() {
                clearRecentClasses();
            };
        }
    }

    /**
     * 최근 본 클래스 전체 삭제
     */
    function clearRecentClasses() {
        try {
            localStorage.removeItem(RECENT_KEY);
        } catch (e) {
            /* 무시 */
        }
        renderRecentSection();
    }

    /**
     * 클래스 카드 클릭 시 최근 본 클래스에 기록
     * 이벤트 위임으로 처리
     */
    function initRecentClickTracking() {
        var grid = document.getElementById('classGrid');
        if (!grid) return;

        grid.addEventListener('click', function(e) {
            // 찜 버튼 클릭은 제외
            if (e.target.closest('.wishlist-btn')) return;
            if (e.target.closest('.class-card__map-entry')) return;

            var card = e.target.closest('.class-card');
            if (!card) return;

            var classId = card.getAttribute('data-class-id');
            var className = card.getAttribute('data-class-name');
            var thumbnail = card.getAttribute('data-thumbnail');

            if (classId) {
                addToRecent(classId, className, thumbnail);
                // 즉시 최근 본 섹션 업데이트
                renderRecentSection();
            }
        });
    }


    /* ========================================
       협회 제휴 탭
       ======================================== */

    /** 협회 데이터 캐시 */
    var affilDataCache = null;

    /** 현재 활성 탭 */
    var activeCatalogTab = 'classes';

    /**
     * 탭 네비게이션 초기화
     */
    function initCatalogTabs() {
        var tabBtns = document.querySelectorAll('.catalog-tabs__btn');
        for (var i = 0; i < tabBtns.length; i++) {
            tabBtns[i].addEventListener('click', handleTabClick);
        }
        applyInitialCatalogTab();
    }

    /**
     * 탭 클릭 핸들러
     */
    function handleTabClick(e) {
        var btn = e.currentTarget;
        var tab = btn.getAttribute('data-tab');
        activateCatalogTab(tab);
    }

    /**
     * 탭 활성화 공통 처리
     * @param {string} tab
     */
    function activateCatalogTab(tab) {
        var targetTab = 'classes';
        if (tab === 'affiliations' || tab === 'benefits') {
            targetTab = tab;
        }
        activeCatalogTab = targetTab;

        // 모든 탭 비활성화
        var tabBtns = document.querySelectorAll('.catalog-tabs__btn');
        for (var i = 0; i < tabBtns.length; i++) {
            tabBtns[i].classList.remove('catalog-tabs__btn--active');
            tabBtns[i].setAttribute('aria-selected', 'false');
            if (tabBtns[i].getAttribute('data-tab') === targetTab) {
                tabBtns[i].classList.add('catalog-tabs__btn--active');
                tabBtns[i].setAttribute('aria-selected', 'true');
            }
        }

        // 패널 전환
        var panelClasses = document.getElementById('panelClasses');
        var panelAffil = document.getElementById('panelAffiliations');
        var panelBenefits = document.getElementById('panelBenefits');

        if (panelClasses) panelClasses.style.display = targetTab === 'classes' ? '' : 'none';
        if (panelAffil) panelAffil.style.display = targetTab === 'affiliations' ? '' : 'none';
        if (panelBenefits) panelBenefits.style.display = targetTab === 'benefits' ? '' : 'none';

        if (targetTab === 'affiliations' || targetTab === 'benefits') {
            loadAffiliations();
        }

        if (targetTab === 'benefits') {
            renderBenefitsPanel(currentDisplayClasses, affilDataCache);
        }

        updateURLParams();
    }

    /**
     * URL 파라미터 기반 초기 탭 적용
     */
    function applyInitialCatalogTab() {
        try {
            var params = new URLSearchParams(window.location.search);
            if (params.get('tab') === 'affiliations' || params.get('tab') === 'benefits') {
                activateCatalogTab(params.get('tab'));
            }
        } catch (e) {
            /* URL 파라미터 파싱 실패 시 기본 탭 유지 */
        }
    }

    /**
     * 협회 목록 API 호출
     */
    function loadAffiliations() {
        if (affilDataCache) {
            renderAffiliations(affilDataCache);
            renderBenefitsPanel(currentDisplayClasses, affilDataCache);
            updateAffiliationBadges(affilDataCache);
            return;
        }

        var cached = getSettingsCached('affiliations');
        if (cached) {
            affilDataCache = cached;
            renderAffiliations(cached);
            renderBenefitsPanel(currentDisplayClasses, cached);
            updateAffiliationBadges(cached);
            return;
        }

        var grid = document.getElementById('affilGrid');
        var loading = document.getElementById('affilLoading');
        var empty = document.getElementById('affilEmpty');

        if (grid) grid.innerHTML = '';
        if (loading) loading.style.display = '';
        if (empty) empty.style.display = 'none';

        fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getAffiliations' })
        })
            .then(function(response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            })
            .then(function(data) {
                if (loading) loading.style.display = 'none';
                if (data && data.success && data.data) {
                    affilDataCache = data.data;
                    setSettingsCache('affiliations', data.data);
                    renderAffiliations(data.data);
                    renderBenefitsPanel(currentDisplayClasses, data.data);
                    updateAffiliationBadges(data.data);
                } else {
                    if (empty) empty.style.display = '';
                }
            })
            .catch(function(err) {
                if (loading) loading.style.display = 'none';
                if (empty) empty.style.display = '';
                console.error('[ClassCatalog] 협회 API 호출 실패:', err);
            });
    }

    function updateAffiliationBadges(affiliations) {
        var badge = document.getElementById('affilBadge');
        var benefitBadge = document.getElementById('benefitBadge');
        var benefitCount = buildBenefitItems(currentDisplayClasses, affiliations).length;

        if (badge) {
            badge.textContent = affiliations && affiliations.length > 0 ? affiliations.length : '';
        }
        if (benefitBadge) {
            benefitBadge.textContent = benefitCount > 0 ? benefitCount : '';
        }
    }

    /**
     * 협회 카드 렌더링
     * @param {Array} affiliations - 협회 목록
     */
    function renderAffiliations(affiliations) {
        var grid = document.getElementById('affilGrid');
        var empty = document.getElementById('affilEmpty');
        var seminarGrid = document.getElementById('seminarGrid');
        var seminarEmpty = document.getElementById('seminarEmpty');

        if (!affiliations || affiliations.length === 0) {
            if (grid) grid.innerHTML = '';
            if (empty) empty.style.display = '';
            if (seminarGrid) seminarGrid.innerHTML = '';
            if (seminarEmpty) seminarEmpty.style.display = '';
            updateAffiliationSummary([], []);
            return;
        }

        if (empty) empty.style.display = 'none';
        var html = '';
        for (var i = 0; i < affiliations.length; i++) {
            html += renderAffilCard(affiliations[i]);
        }
        if (grid) grid.innerHTML = html;

        renderSeminarFeed(currentDisplayClasses, affiliations);
    }

    /**
     * 개별 협회 카드 HTML 생성
     * @param {Object} affil - 협회 데이터
     * @returns {string} HTML 문자열
     */
    function renderAffilCard(affil) {
        var logoHtml = '';
        if (affil.logo_url) {
            logoHtml = '<img class="affil-card__logo" src="' + escapeHtml(affil.logo_url) + '" alt="' + escapeHtml(affil.name) + ' 로고" loading="lazy">';
        } else {
            // 로고 없을 때 플레이스홀더
            logoHtml = '<div class="affil-card__logo-placeholder">' +
                '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">' +
                '<circle cx="24" cy="24" r="20"/>' +
                '<path d="M24 14v8M20 18h8M16 28c0 0 2 4 8 4s8-4 8-4"/>' +
                '</svg>' +
                '</div>';
        }

        var discountHtml = '';
        if (affil.discount_rate > 0) {
            discountHtml = '<span class="affil-card__discount">' + affil.discount_rate + '% 할인</span>';
        }

        var tiersHtml = '';
        if (affil.incentive_tiers && affil.incentive_tiers.length > 0) {
            tiersHtml = '<div class="affil-card__tiers">';
            for (var j = 0; j < affil.incentive_tiers.length; j++) {
                var tier = affil.incentive_tiers[j];
                tiersHtml += '<div class="affil-card__tier">' +
                    '<span class="affil-card__tier-target">' + formatAffilPrice(tier.target) + ' 이상</span>' +
                    '<span class="affil-card__tier-reward">' + formatAffilPrice(tier.incentive) + '</span>' +
                    '</div>';
            }
            tiersHtml += '</div>';
        }

        return '<div class="affil-card">' +
            '<div class="affil-card__header">' +
            logoHtml +
            '<div class="affil-card__info">' +
            '<h4 class="affil-card__name">' + escapeHtml(affil.name) + '</h4>' +
            discountHtml +
            '</div>' +
            '</div>' +
            (affil.memo ? '<p class="affil-card__memo">' + escapeHtml(affil.memo) + '</p>' : '') +
            tiersHtml +
            '</div>';
    }

    function updateAffiliationSummary(classes, affiliations) {
        var seminarItems = buildSeminarItems(classes, affiliations);
        var seminarCountEl = document.getElementById('affilSeminarCount');
        var associationCountEl = document.getElementById('affilAssociationCount');
        var benefitCountEl = document.getElementById('affilMemberBenefitCount');

        if (seminarCountEl) seminarCountEl.textContent = formatNumber(seminarItems.length);
        if (associationCountEl) associationCountEl.textContent = formatNumber((affiliations || []).length);
        if (benefitCountEl) benefitCountEl.textContent = formatNumber(buildBenefitItems(classes, affiliations).length);
    }

    function buildSeminarItems(classes, affiliations) {
        var items = [];
        var sourceClasses = classes || [];
        var sourceAffils = affiliations || [];
        var i;

        for (i = 0; i < sourceClasses.length; i++) {
            var cls = sourceClasses[i];
            var meta = resolveContentTypeMeta(cls);
            if (meta.key === 'event' || meta.key === 'affiliation') {
                items.push({
                    title: cls.class_name || '',
                    desc: meta.desc,
                    typeLabel: meta.label,
                    affiliation: cls.affiliation_code || cls.partner_name || '',
                    region: getDisplayRegionName(cls.region || cls.location || ''),
                    price: cls.price || 0,
                    detailUrl: '/shop/page.html?id=2607&class_id=' + encodeURIComponent(cls.class_id || ''),
                    mapUrl: buildPartnerMapSearchUrl(cls)
                });
            }
        }

        if (items.length === 0) {
            for (i = 0; i < sourceAffils.length; i++) {
                items.push({
                    title: (sourceAffils[i].name || '\uD611\uD68C') + ' \uC815\uAE30 \uC138\uBBF8\uB098',
                    desc: '\uD611\uD68C \uC77C\uC815, \uD68C\uC6D0 \uD61C\uD0DD, \uC804\uC6A9 \uD074\uB798\uC2A4\uB97C \uD568\uAED8 \uC548\uB0B4\uD558\uB294 \uC138\uBBF8\uB098 \uD615 \uCF58\uD150\uCE20',
                    typeLabel: '\uC138\uBBF8\uB098/\uC774\uBCA4\uD2B8',
                    affiliation: sourceAffils[i].name || '',
                    region: '\uC804\uAD6D',
                    price: 0,
                    detailUrl: buildPartnerMapUrl({ keyword: sourceAffils[i].name || '' }),
                    mapUrl: buildPartnerMapUrl({ keyword: sourceAffils[i].name || '' })
                });
            }
        }

        return items.slice(0, 6);
    }

    function renderSeminarFeed(classes, affiliations) {
        var seminarGrid = document.getElementById('seminarGrid');
        var seminarEmpty = document.getElementById('seminarEmpty');
        var items = buildSeminarItems(classes, affiliations);
        var html = '';
        var i;

        updateAffiliationSummary(classes, affiliations);

        if (!seminarGrid || !seminarEmpty) return;

        if (!items.length) {
            seminarGrid.innerHTML = '';
            seminarEmpty.style.display = '';
            return;
        }

        seminarEmpty.style.display = 'none';
        for (i = 0; i < items.length; i++) {
            html += '<article class="seminar-card">'
                + '<div class="seminar-card__meta">'
                + '<span class="seminar-card__chip seminar-card__chip--type">' + escapeHtml(items[i].typeLabel) + '</span>'
                + (items[i].affiliation ? '<span class="seminar-card__chip seminar-card__chip--affiliation">' + escapeHtml(items[i].affiliation) + '</span>' : '')
                + '</div>'
                + '<h4 class="seminar-card__name">' + escapeHtml(items[i].title) + '</h4>'
                + '<p class="seminar-card__desc">' + escapeHtml(items[i].desc) + '</p>'
                + '<div class="seminar-card__stats">'
                + (items[i].region ? '<span>' + escapeHtml(items[i].region) + '</span>' : '')
                + (items[i].price > 0 ? '<span>' + formatPrice(items[i].price) + '\uC6D0\uBD80\uD130</span>' : '<span>\uD61C\uD0DD \uC548\uB0B4 \uD655\uC778</span>')
                + '</div>'
                + '<div class="seminar-card__actions">'
                + '<a href="' + escapeHtml(items[i].detailUrl) + '" class="seminar-card__link seminar-card__link--primary">\uC790\uC138\uD788 \uBCF4\uAE30</a>'
                + (items[i].mapUrl ? '<a href="' + escapeHtml(items[i].mapUrl) + '" class="seminar-card__link seminar-card__link--secondary">\uD30C\uD2B8\uB108\uB9F5 \uC5F0\uACB0</a>' : '')
                + '</div>'
                + '</article>';
        }

        seminarGrid.innerHTML = html;
    }

    function buildBenefitItems(classes, affiliations) {
        var items = [];
        var seen = {};
        var i;
        var benefit;

        for (i = 0; i < (affiliations || []).length; i++) {
            benefit = affiliations[i];
            if (!benefit || !benefit.name) continue;
            items.push({
                title: benefit.name + ' \uD68C\uC6D0 \uD61C\uD0DD',
                eyebrow: '\uD611\uD68C \uD2B9\uD654',
                desc: (benefit.discount_rate || 0) + '% \uD560\uC778, \uC5F0\uAC04 \uC778\uC13C\uD2F0\uBE0C, \uD611\uD68C \uC77C\uC815 \uD64D\uBCF4\uB97C \uD55C \uD328\uD0A4\uC9C0\uB85C \uC6B4\uC601\uD569\uB2C8\uB2E4.',
                chips: [benefit.name, (benefit.discount_rate || 0) + '% \uD560\uC778'],
                href: buildPartnerMapUrl({ keyword: benefit.name || '' })
            });
            seen[benefit.name] = true;
        }

        for (i = 0; i < (classes || []).length; i++) {
            var cls = classes[i];
            var contentMeta = resolveContentTypeMeta(cls);
            if (parseInt(cls.kit_enabled, 10) === 1) {
                items.push({
                    title: (cls.class_name || '\uD074\uB798\uC2A4') + ' \uC7AC\uB8CC \uC7AC\uAD6C\uB9E4',
                    eyebrow: '\uC790\uC0AC\uBAB0 \uC5F0\uACB0',
                    desc: '\uC218\uAC15 \uD6C4 \uBC14\uB85C \uC7AC\uB8CC\uC640 \uD0A4\uD2B8\uB97C \uB2E4\uC2DC \uAD6C\uB9E4\uD560 \uC218 \uC788\uB294 \uD750\uB984\uC73C\uB85C \uC774\uC5B4\uC9D1\uB2C8\uB2E4.',
                    chips: [cls.category || '\uC7AC\uB8CC\uD0A4\uD2B8', '\uC7AC\uAD6C\uB9E4'],
                    href: '/shop/page.html?id=2607&class_id=' + encodeURIComponent(cls.class_id || '')
                });
            }
            if (contentMeta.key === 'event') {
                items.push({
                    title: (cls.class_name || '\uC774\uBCA4\uD2B8') + ' \uCC38\uC5EC \uC774\uBCA4\uD2B8',
                    eyebrow: '\uB178\uCD9C \uAC15\uD654',
                    desc: '\uC138\uBBF8\uB098, \uCCB4\uD5D8\uD68C, \uD558\uC6B0\uC2A4 \uC774\uBCA4\uD2B8 \uD615\uC758 \uC77C\uC815\uC744 \uD55C \uB808\uC774\uC5B4\uC5D0 \uBB36\uC5B4 \uC218\uAC15\uC0DD \uD765\uBBF8\uB97C \uB04C\uC5B4\uC62C\uB9BD\uB2C8\uB2E4.',
                    chips: [contentMeta.label, getDisplayRegionName(cls.region || cls.location || '') || '\uC804\uAD6D'],
                    href: '/shop/page.html?id=2607&class_id=' + encodeURIComponent(cls.class_id || '')
                });
            }
            if (!seen.partnerMap && getDeliveryModeValue(cls) === 'OFFLINE') {
                items.push({
                    title: '\uC9C0\uB3C4\uC5D0\uC11C \uAC00\uAE4C\uC6B4 \uACF5\uBC29 \uCC3E\uAE30',
                    eyebrow: '\uC9C0\uC5ED \uD0D0\uC0C9',
                    desc: '\uD30C\uD2B8\uB108\uB9F5\uC744 \uD1B5\uD574 \uAC19\uC740 \uCE74\uD14C\uACE0\uB9AC\uC758 \uC624\uD504\uB77C\uC778 \uC218\uC5C5\uACFC \uACF5\uBC29\uC744 \uD55C \uBC88\uC5D0 \uBE44\uAD50\uD558\uC138\uC694.',
                    chips: [cls.category || '\uD074\uB798\uC2A4', '\uC624\uD504\uB77C\uC778'],
                    href: buildPartnerMapSearchUrl(cls)
                });
                seen.partnerMap = true;
            }
        }

        return items.slice(0, 6);
    }

    function renderBenefitsPanel(classes, affiliations) {
        var statContainer = document.getElementById('benefitHeroStats');
        var benefitGrid = document.getElementById('benefitGrid');
        var classGrid = document.getElementById('benefitClassGrid');
        var emptyEl = document.getElementById('benefitClassEmpty');
        var benefitBadge = document.getElementById('benefitBadge');
        var items = buildBenefitItems(classes, affiliations);
        var recommended = (classes || []).filter(function(cls) {
            return parseInt(cls.kit_enabled, 10) === 1 || resolveContentTypeMeta(cls).key !== 'general';
        }).slice().sort(comparePartnerExposure).slice(0, 6);
        var html = '';
        var i;

        if (benefitBadge) {
            benefitBadge.textContent = items.length > 0 ? items.length : '';
        }

        if (statContainer) {
            statContainer.innerHTML = ''
                + '<div class="benefit-hero__stat"><strong>' + formatNumber(items.length) + '</strong><span>\uD61C\uD0DD \uD3EC\uC778\uD2B8</span></div>'
                + '<div class="benefit-hero__stat"><strong>' + formatNumber((affiliations || []).length) + '</strong><span>\uD611\uD68C/\uC81C\uD734 \uB808\uC774\uC5B4</span></div>'
                + '<div class="benefit-hero__stat"><strong>' + formatNumber(recommended.length) + '</strong><span>\uC5F0\uACC4 \uD074\uB798\uC2A4</span></div>';
        }

        if (benefitGrid) {
            html = '';
            for (i = 0; i < items.length; i++) {
                html += '<article class="benefit-card">'
                    + '<p class="benefit-card__eyebrow">' + escapeHtml(items[i].eyebrow) + '</p>'
                    + '<h3 class="benefit-card__title">' + escapeHtml(items[i].title) + '</h3>'
                    + '<p class="benefit-card__desc">' + escapeHtml(items[i].desc) + '</p>'
                    + '<div class="benefit-card__meta">' + renderBenefitChips(items[i].chips) + '</div>'
                    + '<a href="' + escapeHtml(items[i].href || '/shop/page.html?id=2606') + '" class="benefit-card__link">\uD61C\uD0DD \uD750\uB984 \uBCF4\uAE30</a>'
                    + '</article>';
            }
            benefitGrid.innerHTML = html;
        }

        if (classGrid) {
            if (!recommended.length) {
                classGrid.innerHTML = '';
                if (emptyEl) emptyEl.style.display = '';
            } else {
                html = '';
                if (emptyEl) emptyEl.style.display = 'none';
                for (i = 0; i < recommended.length; i++) {
                    html += renderBenefitClassCard(recommended[i]);
                }
                classGrid.innerHTML = html;
            }
        }
    }

    function renderBenefitChips(chips) {
        var html = '';
        var i;
        for (i = 0; i < (chips || []).length; i++) {
            if (!chips[i]) continue;
            html += '<span class="benefit-card__chip">' + escapeHtml(chips[i]) + '</span>';
        }
        return html;
    }

    function renderBenefitClassCard(cls) {
        var meta = resolveContentTypeMeta(cls);
        var region = getDisplayRegionName(cls.region || cls.location || '');
        var desc = meta.desc;
        var gradeMeta = getPartnerGradeMeta(cls.partner_grade);
        var gradeChip = gradeMeta.weight >= 2
            ? '<span class="benefit-class-card__chip benefit-class-card__chip--grade benefit-class-card__chip--' + gradeMeta.key + '">' + escapeHtml(gradeMeta.chipLabel) + '</span>'
            : '';

        return '<article class="benefit-class-card">'
            + '<div class="benefit-class-card__meta">'
            + gradeChip
            + '<span class="benefit-class-card__chip">' + escapeHtml(meta.label) + '</span>'
            + (region ? '<span class="benefit-class-card__chip">' + escapeHtml(region) + '</span>' : '')
            + '</div>'
            + '<h4 class="benefit-class-card__name">' + escapeHtml(cls.class_name || '') + '</h4>'
            + '<p class="benefit-class-card__desc">' + escapeHtml(desc) + '</p>'
            + '<a href="/shop/page.html?id=2607&class_id=' + encodeURIComponent(cls.class_id || '') + '" class="benefit-class-card__link">\uC790\uC138\uD788 \uBCF4\uAE30</a>'
            + '</article>';
    }

    /**
     * 금액 포맷 (ex: 5000000 -> "500만원")
     * @param {number} amount
     * @returns {string}
     */
    function formatAffilPrice(amount) {
        if (amount >= 10000) {
            var man = Math.floor(amount / 10000);
            return man.toLocaleString() + '\uB9CC\uC6D0'; /* 만원 */
        }
        return amount.toLocaleString() + '\uC6D0'; /* 원 */
    }


    /* ========================================
       DOM Ready 이벤트
       ======================================== */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            init();
            initRecentClickTracking();
            initCatalogTabs();
        });
    } else {
        init();
        initRecentClickTracking();
        initCatalogTabs();
    }

})();
