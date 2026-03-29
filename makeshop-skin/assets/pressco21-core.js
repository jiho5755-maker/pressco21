/**
 * PRESSCO21 파트너클래스 공통 모듈
 * ================================================
 * 8개 파트너클래스 페이지에서 공유하는 유틸리티, API 래퍼, 캐시, 인증 모듈.
 * 메이크샵 D4 호환: IIFE, var 키워드, \${} 이스케이프 없음 (문자열 연결만 사용).
 *
 * 사용법: 각 페이지 HTML <head> 또는 JS 시작 전에 <script src> 로드
 * window.PRESSCO21 네임스페이스로 노출
 *
 * @version 1.0.0
 * @date 2026-03-21
 */
(function() {
    'use strict';

    /* ========================================
       1. 설정 (Config)
       ======================================== */
    var CONFIG = {
        /** n8n webhook 기본 URL */
        N8N_BASE: 'https://n8n.pressco21.com/webhook',

        /** API 요청 타임아웃 (ms) */
        TIMEOUT: 15000,

        /** 페이지 ID 매핑 */
        PAGES: {
            LIST:     2606,
            DETAIL:   2607,
            PARTNER:  2608,
            APPLY:    2609,
            EDU:      2610,
            REGISTER: 8009,
            MYPAGE:   8010,
            ADMIN:    8011
        },

        /** 캐시 TTL (ms) */
        CACHE_TTL: {
            CATALOG:  300000,    /* 5분 */
            SETTINGS: 3600000,   /* 1시간 */
            SHORT:    120000,    /* 2분 */
            AUTH:     600000     /* 10분 */
        },

        /** 캐시 버전 (변경 시 전체 캐시 무효화) */
        CACHE_VERSION: 'v1'
    };

    /** API 엔드포인트 레지스트리 */
    var ENDPOINTS = {
        CLASS_API:       '/class-api',
        PARTNER_AUTH:    '/partner-auth',
        PARTNER_APPLY:   '/partner-apply',
        BOOKING:         '/record-booking',
        REVIEW_SUBMIT:   '/review-submit',
        EDUCATION:       '/education-complete',
        CLASS_REGISTER:  '/class-register',
        MY_BOOKINGS:     '/my-bookings',
        ADMIN_API:       '/admin-api',
        SETTLEMENT:      '/settlement-batch',
        EVENT_ADMIN:     '/partnerclass-event-calendar-admin',
        PARTNER_DATA:    '/partner-data',
        CLASS_MGMT:      '/class-management',
        REVIEW_REPLY:    '/review-reply',
        CLASS_EDIT:      '/class-edit',
        SCHEDULE_MGMT:   '/schedule-manage'
    };

    /* ========================================
       2. 유틸리티 (Util)
       ======================================== */

    /**
     * HTML 이스케이프 (XSS 방지)
     * @param {*} str - 이스케이프할 문자열
     * @returns {string}
     */
    function escapeHtml(str) {
        if (!str) return '';
        var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(str).replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    /**
     * 숫자를 천단위 콤마 가격 형식으로 변환
     * @param {*} price - 변환할 숫자
     * @returns {string}
     */
    function formatPrice(price) {
        var n = Number(price);
        if (isNaN(n) || n < 0) return '0';
        return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * 숫자를 천단위 콤마로 변환 (음수/소수 허용)
     * @param {*} num
     * @returns {string}
     */
    function formatNumber(num) {
        return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * 한 자리 숫자 앞에 0 패딩
     * @param {number} n
     * @returns {string}
     */
    function padZero(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    /**
     * 날짜를 YYYY-MM-DD 형식으로 변환
     * @param {Date|string} date
     * @returns {string}
     */
    function formatDate(date) {
        var d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.getFullYear() + '-' + padZero(d.getMonth() + 1) + '-' + padZero(d.getDate());
    }

    /**
     * 날짜를 YYYY.MM.DD 한국어 표시 형식으로
     * @param {Date|string} date
     * @returns {string}
     */
    function formatDateKR(date) {
        var d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.getFullYear() + '.' + padZero(d.getMonth() + 1) + '.' + padZero(d.getDate());
    }

    /**
     * 상태값 정규화 (UPPERCASE)
     * NocoDB 상태값의 대소문자 혼재를 통일
     * @param {*} status - 원본 상태값
     * @returns {string} UPPERCASE 상태값
     */
    function normalizeStatus(status) {
        return String(status || '').toUpperCase().trim();
    }

    /** 상태값 상수 (6개 도메인 공용) */
    var STATUS = {
        /* Classes */
        ACTIVE: 'ACTIVE',
        INACTIVE: 'INACTIVE',
        PAUSED: 'PAUSED',
        CLOSED: 'CLOSED',
        ARCHIVED: 'ARCHIVED',
        /* Applications / Classes 공용 */
        PENDING: 'PENDING',
        APPROVED: 'APPROVED',
        REJECTED: 'REJECTED',
        PENDING_REVIEW: 'PENDING_REVIEW',
        /* Bookings / Schedules */
        CONFIRMED: 'CONFIRMED',
        COMPLETED: 'COMPLETED',
        CANCELLED: 'CANCELLED',
        OPEN: 'OPEN',
        /* Settlements */
        PENDING_SETTLEMENT: 'PENDING_SETTLEMENT',
        CALCULATED: 'CALCULATED',
        PAID: 'PAID',
        /* Reviews */
        PUBLISHED: 'PUBLISHED',
        /* Partners */
        SUSPENDED: 'SUSPENDED',
        REVIEW: 'REVIEW'
    };

    /* ========================================
       3. DOM 유틸리티 (UI)
       ======================================== */

    /**
     * 요소 표시/숨김
     * @param {string} id - 요소 ID
     * @param {boolean} show - true=표시, false=숨김
     */
    function toggleElement(id, show) {
        var el = document.getElementById(id);
        if (el) el.style.display = show ? '' : 'none';
    }

    /**
     * 단일 영역만 표시하고 나머지 숨김
     * @param {string} showId - 표시할 요소 ID
     * @param {Array} allIds - 전체 영역 ID 목록
     */
    function showArea(showId, allIds) {
        for (var i = 0; i < allIds.length; i++) {
            toggleElement(allIds[i], allIds[i] === showId);
        }
    }

    /**
     * 로딩 오버레이 표시
     * @param {string} id - 로딩 오버레이 요소 ID
     */
    function showLoading(id) {
        toggleElement(id, true);
    }

    /**
     * 로딩 오버레이 숨김
     * @param {string} id - 로딩 오버레이 요소 ID
     */
    function hideLoading(id) {
        toggleElement(id, false);
    }

    /* ========================================
       4. 캐시 (Cache)
       ======================================== */

    /**
     * localStorage 캐시 읽기
     * @param {string} prefix - 캐시 키 접두사
     * @param {string} key - 캐시 키
     * @returns {*} 캐시된 데이터 또는 null
     */
    function cacheGet(prefix, key) {
        try {
            var fullKey = 'pc_' + CONFIG.CACHE_VERSION + '_' + prefix + '_' + key;
            var item = localStorage.getItem(fullKey);
            if (!item) return null;
            var parsed = JSON.parse(item);
            if (parsed.expires && Date.now() > parsed.expires) {
                localStorage.removeItem(fullKey);
                return null;
            }
            return parsed.data;
        } catch (e) {
            return null;
        }
    }

    /**
     * localStorage 캐시 저장
     * @param {string} prefix - 캐시 키 접두사
     * @param {string} key - 캐시 키
     * @param {*} data - 저장할 데이터
     * @param {number} ttl - 만료 시간 (ms)
     */
    function cacheSet(prefix, key, data, ttl) {
        try {
            var fullKey = 'pc_' + CONFIG.CACHE_VERSION + '_' + prefix + '_' + key;
            var item = JSON.stringify({
                data: data,
                expires: ttl ? Date.now() + ttl : 0
            });
            localStorage.setItem(fullKey, item);
        } catch (e) {
            /* localStorage 용량 초과 시 가장 오래된 캐시 제거 */
            try {
                var keys = [];
                for (var i = 0; i < localStorage.length; i++) {
                    var k = localStorage.key(i);
                    if (k && k.indexOf('pc_') === 0) keys.push(k);
                }
                if (keys.length > 0) {
                    localStorage.removeItem(keys[0]);
                    localStorage.setItem(fullKey, item);
                }
            } catch (e2) { /* 무시 */ }
        }
    }

    /**
     * 특정 접두사의 캐시 일괄 제거
     * @param {string} prefix
     */
    function cacheClear(prefix) {
        try {
            var removeKeys = [];
            var searchPrefix = 'pc_' + CONFIG.CACHE_VERSION + '_' + prefix + '_';
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k && k.indexOf(searchPrefix) === 0) removeKeys.push(k);
            }
            for (var j = 0; j < removeKeys.length; j++) {
                localStorage.removeItem(removeKeys[j]);
            }
        } catch (e) { /* 무시 */ }
    }

    /* ========================================
       5. API 래퍼 (API)
       ======================================== */

    /**
     * n8n webhook POST 요청 (통합 래퍼)
     * - 타임아웃 지원 (기본 15초)
     * - 네트워크/타임아웃 오류 시 1회 자동 리트라이 (2초 후)
     * - 표준 에러 구조: { code, message, data? }
     * - JSON 자동 파싱
     *
     * @param {string} endpoint - ENDPOINTS 키 또는 전체 URL
     * @param {Object} body - 요청 바디
     * @param {Object} [options] - 옵션
     * @param {number} [options.timeout] - 타임아웃 (ms, 기본 15000)
     * @param {Object} [options.headers] - 추가 헤더
     * @param {boolean} [options.noRetry] - true이면 리트라이 안 함
     * @returns {Promise<Object>} 응답 데이터
     */
    function apiPost(endpoint, body, options) {
        var opts = options || {};
        var url = endpoint.indexOf('http') === 0
            ? endpoint
            : CONFIG.N8N_BASE + (ENDPOINTS[endpoint] || endpoint);
        var timeout = opts.timeout || CONFIG.TIMEOUT;

        function attempt() {
            return new Promise(function(resolve, reject) {
                var xhr = new XMLHttpRequest();
                var timer = null;

                xhr.open('POST', url, true);
                xhr.setRequestHeader('Content-Type', 'application/json');

                /* 추가 헤더 */
                if (opts.headers) {
                    for (var h in opts.headers) {
                        if (opts.headers.hasOwnProperty(h)) {
                            xhr.setRequestHeader(h, opts.headers[h]);
                        }
                    }
                }

                /* 타임아웃 */
                timer = setTimeout(function() {
                    xhr.abort();
                    reject({ code: 'TIMEOUT', message: '서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.', retryable: true });
                }, timeout);

                xhr.onreadystatechange = function() {
                    if (xhr.readyState !== 4) return;
                    clearTimeout(timer);

                    if (xhr.status === 0) {
                        reject({ code: 'NETWORK', message: '네트워크 연결을 확인해주세요.', retryable: true });
                        return;
                    }

                    var resp = null;
                    try { resp = JSON.parse(xhr.responseText); } catch (e) {
                        reject({ code: 'PARSE', message: '서버 응답을 처리할 수 없습니다.', retryable: false });
                        return;
                    }

                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(resp);
                    } else if (xhr.status >= 500) {
                        reject({
                            code: 'HTTP_' + xhr.status,
                            message: (resp && resp.error && resp.error.message) || '서버 오류가 발생했습니다.',
                            data: resp,
                            retryable: true
                        });
                    } else {
                        reject({
                            code: 'HTTP_' + xhr.status,
                            message: (resp && resp.error && resp.error.message) || '요청 처리 중 오류가 발생했습니다.',
                            data: resp,
                            retryable: false
                        });
                    }
                };

                xhr.send(JSON.stringify(body || {}));
            });
        }

        /* 1회 자동 리트라이 (네트워크/타임아웃/5xx만) */
        return attempt().catch(function(err) {
            if (opts.noRetry || !err.retryable) {
                delete err.retryable;
                return Promise.reject(err);
            }
            /* 2초 후 재시도 */
            return new Promise(function(resolve) {
                setTimeout(resolve, 2000);
            }).then(function() {
                return attempt();
            }).catch(function(retryErr) {
                delete retryErr.retryable;
                retryErr.retriedOnce = true;
                return Promise.reject(retryErr);
            });
        });
    }

    /**
     * fetch 기반 POST (리트라이 포함)
     * 구형 브라우저 미지원 시 XHR apiPost로 폴백
     * apiPost와 동일한 리트라이/에러 표준화 적용
     */
    function fetchPost(endpoint, body, options) {
        if (typeof fetch === 'undefined') {
            return apiPost(endpoint, body, options);
        }

        var opts = options || {};
        var url = endpoint.indexOf('http') === 0
            ? endpoint
            : CONFIG.N8N_BASE + (ENDPOINTS[endpoint] || endpoint);
        var timeout = opts.timeout || CONFIG.TIMEOUT;

        function attempt() {
            var controller = null;
            var signal = null;
            var timeoutId = null;
            if (typeof AbortController !== 'undefined') {
                controller = new AbortController();
                signal = controller.signal;
                timeoutId = setTimeout(function() { controller.abort(); }, timeout);
            }

            var fetchOpts = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body || {}),
                redirect: 'follow'
            };
            if (signal) fetchOpts.signal = signal;

            return fetch(url, fetchOpts)
                .then(function(response) {
                    if (timeoutId) clearTimeout(timeoutId);
                    return response.json().then(function(data) {
                        if (response.status >= 500) {
                            return Promise.reject({
                                code: 'HTTP_' + response.status,
                                message: (data && data.error && data.error.message) || '서버 오류가 발생했습니다.',
                                data: data,
                                retryable: true
                            });
                        }
                        if (!response.ok) {
                            return Promise.reject({
                                code: 'HTTP_' + response.status,
                                message: (data && data.error && data.error.message) || '요청 처리 중 오류가 발생했습니다.',
                                data: data,
                                retryable: false
                            });
                        }
                        return data;
                    });
                })
                .catch(function(err) {
                    if (timeoutId) clearTimeout(timeoutId);
                    if (err && err.code) return Promise.reject(err);
                    /* AbortError = 타임아웃, TypeError = 네트워크 오류 */
                    var isTimeout = err && err.name === 'AbortError';
                    return Promise.reject({
                        code: isTimeout ? 'TIMEOUT' : 'NETWORK',
                        message: isTimeout
                            ? '서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.'
                            : '네트워크 연결을 확인해주세요.',
                        retryable: true
                    });
                });
        }

        /* 1회 자동 리트라이 */
        return attempt().catch(function(err) {
            if (opts.noRetry || !err.retryable) {
                delete err.retryable;
                return Promise.reject(err);
            }
            return new Promise(function(resolve) {
                setTimeout(resolve, 2000);
            }).then(function() {
                return attempt();
            }).catch(function(retryErr) {
                delete retryErr.retryable;
                retryErr.retriedOnce = true;
                return Promise.reject(retryErr);
            });
        });
    }

    /* ========================================
       6. 인증 (Auth)
       ======================================== */

    /**
     * 가상태그에서 회원 ID 읽기
     * @param {string} elementId - hidden span 요소 ID
     * @returns {string} 회원 ID (미로그인 시 빈 문자열)
     */
    function getMemberId(elementId) {
        var el = document.getElementById(elementId || 'memberIdHidden');
        return el ? (el.textContent || '').trim() : '';
    }

    /**
     * 페이지 URL 생성
     * @param {string} pageKey - PAGES 키 (예: 'LIST', 'DETAIL')
     * @param {Object} [params] - URL 파라미터
     * @returns {string}
     */
    function pageUrl(pageKey, params) {
        var id = CONFIG.PAGES[pageKey];
        if (!id) return '#';
        var url = '/shop/page.html?id=' + id;
        if (params) {
            for (var k in params) {
                if (params.hasOwnProperty(k)) {
                    url += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
                }
            }
        }
        return url;
    }

    /**
     * 로그인 페이지로 리다이렉트
     * @param {string} [returnUrl] - 로그인 후 돌아올 URL (기본: 현재 페이지)
     */
    function redirectToLogin(returnUrl) {
        var ret = returnUrl || window.location.href;
        window.location.href = '/shop/member.html?type=login&returnUrl=' + encodeURIComponent(ret);
    }

    /**
     * 파트너 인증 + 교육 이수 통합 체크 (WF-02 partner-auth)
     * register, edu 페이지에서 공유
     *
     * @param {string} memberId - 회원 ID
     * @param {Function} callback - function(status)
     *   'OK' | 'NOT_PARTNER' | 'EDUCATION_REQUIRED' | 'ERROR'
     */
    function checkPartnerAuth(memberId, callback) {
        fetchPost('PARTNER_AUTH', { action: 'getPartnerAuth', member_id: memberId }, { noRetry: false })
            .then(function(resData) {
                if (!resData || !resData.success) {
                    callback('NOT_PARTNER');
                    return;
                }
                var data = resData.data || {};
                if (!data.is_partner) {
                    callback('NOT_PARTNER');
                    return;
                }
                var st = (data.status || '').toUpperCase();
                if (st === 'SUSPENDED' || st === 'INACTIVE' || st === 'CLOSED') {
                    callback('SUSPENDED');
                    return;
                }
                if (st === 'PENDING' || st === 'REVIEW' || st === 'PENDING_REVIEW') {
                    callback('PENDING');
                    return;
                }
                if (!data.education_completed) {
                    callback('EDUCATION_REQUIRED');
                    return;
                }
                callback('OK');
            })
            .catch(function() {
                callback('ERROR');
            });
    }

    /**
     * 교육 이수 상태만 조회 (WF-02 partner-auth)
     * edu 페이지에서 사용
     *
     * @param {string} memberId - 회원 ID
     * @param {Function} callback - function(err, isCompleted)
     */
    function checkEducationStatus(memberId, callback) {
        fetchPost('PARTNER_AUTH', { action: 'getEducationStatus', member_id: memberId }, { noRetry: false })
            .then(function(resData) {
                var completed = !!(resData && resData.success && resData.data && resData.data.education_completed);
                callback(null, completed);
            })
            .catch(function(err) {
                callback(err, false);
            });
    }

    /**
     * 관리자 권한 확인 (가상태그 기반)
     *
     * @param {string} groupName - 회원 그룹명 (가상태그 group_name)
     * @param {string} groupLevel - 회원 그룹 레벨 (가상태그 group_level)
     * @param {Object} [opts] - 옵션
     * @param {Array}  [opts.adminGroups] - 관리자 그룹명 목록 (기본: ['관리자','운영자','대표'])
     * @param {number} [opts.minLevel] - 최소 그룹 레벨 (기본: 9)
     * @returns {boolean}
     */
    function checkAdmin(groupName, groupLevel, opts) {
        var options = opts || {};
        var adminGroups = options.adminGroups || ['\uad00\ub9ac\uc790', '\uc6b4\uc601\uc790', '\ub300\ud45c'];
        var minLevel = options.minLevel || 9;
        for (var i = 0; i < adminGroups.length; i++) {
            if (groupName === adminGroups[i]) return true;
        }
        var numLevel = Number(String(groupLevel || '').replace(/[^\d]/g, ''));
        return !isNaN(numLevel) && numLevel >= minLevel;
    }

    /* ========================================
       7. 네임스페이스 노출
       ======================================== */
    window.PRESSCO21 = {
        config:    CONFIG,
        endpoints: ENDPOINTS,

        /* 유틸리티 */
        util: {
            escapeHtml:      escapeHtml,
            formatPrice:     formatPrice,
            formatNumber:    formatNumber,
            padZero:         padZero,
            formatDate:      formatDate,
            formatDateKR:    formatDateKR,
            normalizeStatus: normalizeStatus
        },

        /* 상태값 상수 */
        STATUS: STATUS,

        /* DOM */
        ui: {
            toggleElement: toggleElement,
            showArea:      showArea,
            showLoading:   showLoading,
            hideLoading:   hideLoading
        },

        /* 캐시 */
        cache: {
            get:   cacheGet,
            set:   cacheSet,
            clear: cacheClear
        },

        /* API */
        api: {
            post:      apiPost,
            fetchPost: fetchPost
        },

        /* 인증 */
        auth: {
            getMemberId:          getMemberId,
            pageUrl:              pageUrl,
            redirectToLogin:      redirectToLogin,
            checkPartnerAuth:     checkPartnerAuth,
            checkEducationStatus: checkEducationStatus,
            checkAdmin:           checkAdmin
        }
    };

})();
