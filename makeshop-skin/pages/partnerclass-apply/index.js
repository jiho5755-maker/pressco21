/* ============================================
   PRESSCO21 파트너 신청 폼 - js.js
   메이크샵 D4 호환: IIFE, var, \${} 이스케이프
   CSS 스코핑: .partner-apply
   n8n 웹훅: POST https://n8n.pressco21.com/webhook/partner-apply
   ============================================ */
(function() {
    'use strict';

    /* ========================================
       설정값
       ======================================== */

    /* ── 공통 모듈 바인딩 (pressco21-core.js) ── */
    var PC = window.PRESSCO21;

    /* APPLY_URL은 PC.api.fetchPost('PARTNER_APPLY', ...) 로 대체 */

    /* ========================================
       상태 관리
       ======================================== */

    /** 로그인한 회원 ID */
    var memberId = '';

    /** 제출 진행 중 중복 방지 */
    var isSubmitting = false;

    /** 수강 이수 여부 */
    var hasCompletedClass = false;


    /* ========================================
       초기화
       ======================================== */

    var PA_AREAS = ['paNoticeArea', 'paFormArea', 'paSuccessArea', 'paAlreadyArea'];

    function init() {
        // 로그인 버튼 JS 폴백
        var loginBtn = document.getElementById('paLoginBtn');
        if (loginBtn) {
            loginBtn.onclick = function(e) {
                e.preventDefault();
                PC.auth.redirectToLogin();
            };
        }

        // 회원 ID 읽기 (가상태그)
        memberId = PC.auth.getMemberId('paMemberId');

        // 미로그인 처리
        if (!memberId) {
            PC.ui.showArea('paNoticeArea', PA_AREAS);
            return;
        }

        // 폼 표시
        PC.ui.showArea('paFormArea', PA_AREAS);

        // 이벤트 바인딩
        bindFormEvents();

        // 수강 이력 확인
        checkCompletedClasses();
    }


    /* ========================================
       이벤트 바인딩
       ======================================== */

    function bindFormEvents() {
        // 폼 제출
        var form = document.getElementById('paApplyForm');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                handleSubmit();
            });
        }

        // 소개글 글자수 카운터
        var introEl = document.getElementById('paIntroduction');
        var charCountEl = document.getElementById('paIntroCharCount');
        if (introEl && charCountEl) {
            introEl.addEventListener('input', function() {
                charCountEl.textContent = this.value.length;
            });
        }

        // 동의 상세보기 토글
        var toggleBtns = document.querySelectorAll('.partner-apply .js-agree-toggle');
        for (var i = 0; i < toggleBtns.length; i++) {
            (function(btn) {
                btn.addEventListener('click', function() {
                    var targetId = btn.getAttribute('data-target');
                    var target = document.getElementById(targetId);
                    if (!target) return;
                    var isOpen = target.style.display !== 'none';
                    target.style.display = isOpen ? 'none' : 'block';
                    btn.textContent = isOpen ? '(상세보기)' : '(닫기)';
                });
            })(toggleBtns[i]);
        }

        // 입력 시 에러 초기화
        var inputs = document.querySelectorAll('.partner-apply .pa-form__input, .partner-apply .pa-form__select, .partner-apply .pa-form__textarea');
        for (var j = 0; j < inputs.length; j++) {
            (function(input) {
                input.addEventListener('input', function() {
                    clearFieldError(input.id);
                });
                input.addEventListener('change', function() {
                    clearFieldError(input.id);
                });
            })(inputs[j]);
        }
    }


    /* ========================================
       폼 제출 처리
       ======================================== */

    function handleSubmit() {
        if (isSubmitting) return;

        // 전체 에러 초기화
        hideGlobalError();

        // 유효성 검사
        if (!validateForm()) return;

        // 폼 데이터 수집
        var data = collectFormData();

        // 제출 시작
        isSubmitting = true;
        setSubmitLoading(true);
        showLoading();

        postApply(data, function(err, responseData) {
            hideLoading();
            setSubmitLoading(false);
            isSubmitting = false;

            if (err) {
                showGlobalError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
                return;
            }

            if (!responseData || !responseData.success) {
                var errorCode = (responseData && responseData.error && responseData.error.code) || '';
                var errorMsg = (responseData && responseData.error && responseData.error.message) || '신청 처리 중 오류가 발생했습니다.';

                if (errorCode === 'ALREADY_PARTNER') {
                    showAlreadyArea(
                        '이미 파트너로 등록되어 있습니다',
                        '현재 계정은 이미 파트너로 등록되어 있어요. 파트너 대시보드를 이용해주세요.'
                    );
                    return;
                }
                if (errorCode === 'DUPLICATE_APPLICATION') {
                    showAlreadyArea(
                        '이미 심사 중인 신청이 있습니다',
                        '현재 심사가 진행 중인 신청이 있어요. 1~3 영업일 이내에 결과를 안내드릴게요.'
                    );
                    return;
                }
                if (errorCode === 'MISSING_PARAMS' || errorCode === 'INVALID_PARAMS') {
                    showGlobalError('입력 정보를 다시 확인해주세요: ' + errorMsg);
                    return;
                }

                showGlobalError(errorMsg);
                return;
            }

            // 성공 처리
            var appId = (responseData.data && responseData.data.application_id) || '';
            showSuccessArea(appId);
        });
    }

    /**
     * 폼 데이터 수집
     * @returns {Object}
     */
    function collectFormData() {
        return {
            member_id:      memberId,
            name:           getVal('paName'),
            studio_name:    getVal('paStudioName'),
            phone:          getVal('paPhone'),
            email:          getVal('paEmail'),
            specialty:      getVal('paSpecialty'),
            location:       getVal('paLocation'),
            introduction:   getVal('paIntroduction'),
            portfolio_url:  getVal('paPortfolioUrl'),
            instagram_url:  getVal('paInstagramUrl'),
            has_completed_class: hasCompletedClass
        };
    }

    /**
     * 폼 유효성 검사
     * @returns {boolean}
     */
    function validateForm() {
        var valid = true;

        // 이름
        var name = getVal('paName');
        if (!name) {
            showFieldError('paName', '이름을 입력해주세요.');
            valid = false;
        }

        // 공방명
        var studioName = getVal('paStudioName');
        if (!studioName) {
            showFieldError('paStudioName', '공방·스튜디오명을 입력해주세요.');
            valid = false;
        }

        // 연락처
        var phone = getVal('paPhone');
        if (!phone) {
            showFieldError('paPhone', '연락처를 입력해주세요.');
            valid = false;
        } else if (!/^[\d\-\s\(\)]{7,20}$/.test(phone)) {
            showFieldError('paPhone', '올바른 연락처 형식을 입력해주세요. (예: 010-1234-5678)');
            valid = false;
        }

        // 이메일
        var email = getVal('paEmail');
        if (!email) {
            showFieldError('paEmail', '이메일을 입력해주세요.');
            valid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showFieldError('paEmail', '올바른 이메일 형식을 입력해주세요.');
            valid = false;
        }

        // URL 형식 검사 (선택 필드, 입력 시에만)
        var portfolioUrl = getVal('paPortfolioUrl');
        if (portfolioUrl && !isValidUrl(portfolioUrl)) {
            showFieldError('paPortfolioUrl', 'https://로 시작하는 올바른 URL을 입력해주세요.');
            valid = false;
        }

        var instagramUrl = getVal('paInstagramUrl');
        if (instagramUrl && !isValidUrl(instagramUrl)) {
            showFieldError('paInstagramUrl', 'https://로 시작하는 올바른 URL을 입력해주세요.');
            valid = false;
        }

        // 개인정보 동의
        var agreePrivacy = document.getElementById('paAgreePrivacy');
        if (!agreePrivacy || !agreePrivacy.checked) {
            var agreeError = document.getElementById('paAgreePrivacyError');
            if (agreeError) agreeError.style.display = '';
            valid = false;
        }

        // 첫 번째 에러 필드로 스크롤
        if (!valid) {
            var firstError = document.querySelector('.partner-apply .pa-form__input.is-error, .partner-apply .pa-form__select.is-error');
            if (firstError) {
                firstError.focus();
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        return valid;
    }

    /**
     * URL 유효성 검사 (http/https만 허용)
     * @param {string} url
     * @returns {boolean}
     */
    function isValidUrl(url) {
        if (!url) return true;
        var lower = url.toLowerCase().trim();
        return lower.indexOf('http://') === 0 || lower.indexOf('https://') === 0;
    }


    /* ========================================
       n8n API 호출
       ======================================== */

    /**
     * 파트너 신청 POST 요청
     * @param {Object} data
     * @param {Function} callback - function(err, data)
     */
    function postApply(data, callback) {
        PC.api.fetchPost('PARTNER_APPLY', data)
            .then(function(resData) {
                callback(null, resData);
            })
            .catch(function(err) {
                console.error('[PartnerApply] 신청 API 실패:', err.code || '', err.message || err);
                callback(err, null);
            });
    }


    /* ========================================
       화면 전환
       ======================================== */

    /**
     * 지정 영역만 표시 (나머지 숨김)
     * @param {string} areaId
     */
    function showSuccessArea(appId) {
        var appIdEl = document.getElementById('paSuccessAppId');
        if (appIdEl) appIdEl.textContent = appId || '-';
        PC.ui.showArea('paSuccessArea', PA_AREAS);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function showAlreadyArea(title, desc) {
        var titleEl = document.getElementById('paAlreadyTitle');
        var descEl = document.getElementById('paAlreadyDesc');
        if (titleEl) titleEl.textContent = title;
        if (descEl) descEl.textContent = desc;
        PC.ui.showArea('paAlreadyArea', PA_AREAS);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }


    /* ========================================
       에러 표시
       ======================================== */

    /**
     * 필드별 에러 표시
     * @param {string} fieldId - input id
     * @param {string} msg
     */
    function showFieldError(fieldId, msg) {
        var field = document.getElementById(fieldId);
        var errorEl = document.getElementById(fieldId + 'Error');
        if (field) field.classList.add('is-error');
        if (errorEl) {
            errorEl.textContent = msg;
            errorEl.style.display = '';
        }
    }

    /**
     * 필드 에러 초기화
     * @param {string} fieldId
     */
    function clearFieldError(fieldId) {
        var field = document.getElementById(fieldId);
        var errorEl = document.getElementById(fieldId + 'Error');
        if (field) field.classList.remove('is-error');
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        }
        // 개인정보 동의 에러도 함께 초기화
        if (fieldId === 'paAgreePrivacy') {
            var agreeError = document.getElementById('paAgreePrivacyError');
            if (agreeError) agreeError.style.display = 'none';
        }
    }

    /**
     * 전체 에러 메시지 표시
     * @param {string} msg
     */
    function showGlobalError(msg) {
        var el = document.getElementById('paFormGlobalError');
        if (!el) return;
        el.textContent = msg;
        el.style.display = '';
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /** 전체 에러 숨기기 */
    function hideGlobalError() {
        var el = document.getElementById('paFormGlobalError');
        if (el) {
            el.textContent = '';
            el.style.display = 'none';
        }
    }


    /* ========================================
       로딩 상태
       ======================================== */

    function showLoading() {
        PC.ui.showLoading('paLoadingOverlay');
    }

    function hideLoading() {
        PC.ui.hideLoading('paLoadingOverlay');
    }

    /**
     * 제출 버튼 로딩 상태
     * @param {boolean} loading
     */
    function setSubmitLoading(loading) {
        var btn = document.getElementById('paSubmitBtn');
        var textEl = btn ? btn.querySelector('.pa-form__submit-btn-text') : null;
        var loadingEl = btn ? btn.querySelector('.pa-form__submit-btn-loading') : null;

        if (!btn) return;
        btn.disabled = loading;
        if (textEl) textEl.style.display = loading ? 'none' : '';
        if (loadingEl) loadingEl.style.display = loading ? '' : 'none';
    }


    /* ========================================
       수강 이력 확인
       ======================================== */

    /**
     * MY_BOOKINGS API로 수강 완료 이력 확인
     * 완료 1건+ → 우대 배지 표시
     */
    function checkCompletedClasses() {
        PC.api.fetchPost('MY_BOOKINGS', { member_id: memberId }, { noRetry: true })
            .then(function(data) {
                if (!data || !data.success || !data.data) return;
                var bookings = data.data.bookings || [];
                var todayStr = PC.util.formatDate(new Date());
                var completedCount = 0;
                for (var i = 0; i < bookings.length; i++) {
                    if ((bookings[i].class_date || '') < todayStr) {
                        completedCount++;
                    }
                }
                if (completedCount > 0) {
                    hasCompletedClass = true;
                    var badge = document.getElementById('paCertBadge');
                    if (badge) badge.style.display = '';
                }
            })
            .catch(function() {
                /* 실패 시 무시 (우대 배지 미표시) */
            });
    }


    /* ========================================
       유틸리티
       ======================================== */

    /**
     * 입력 요소 값 반환 (trim)
     * @param {string} id
     * @returns {string}
     */
    function getVal(id) {
        var el = document.getElementById(id);
        return el ? (el.value || '').trim() : '';
    }


    /* ========================================
       세일즈 랜딩 - 스크롤 링크 & 플로팅 CTA
       ======================================== */

    /**
     * .js-scroll-link 버튼 클릭 시 data-target 위치로 부드럽게 스크롤
     */
    function bindScrollLinks() {
        var btns = document.querySelectorAll('.partner-apply .js-scroll-link');
        for (var i = 0; i < btns.length; i++) {
            (function(btn) {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    var targetId = btn.getAttribute('data-target');
                    if (!targetId) return;
                    var target = document.getElementById(targetId);
                    if (!target) return;
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
            })(btns[i]);
        }
    }

    /**
     * 플로팅 CTA: 히어로 지나면 표시, 폼 도달 시 숨김
     */
    function initFloatCta() {
        var floatEl = document.getElementById('paFloatCta');
        var heroEl = document.querySelector('.partner-apply .pa-hero');
        var formEl = document.getElementById('paApplyAnchor');
        if (!floatEl || !heroEl) return;

        var debounceTimer = null;

        function checkScroll() {
            var scrollY = window.pageYOffset || document.documentElement.scrollTop;
            var heroBottom = heroEl.offsetTop + heroEl.offsetHeight;
            var formTop = formEl ? formEl.offsetTop - window.innerHeight : Infinity;

            if (scrollY > heroBottom && scrollY < formTop) {
                floatEl.classList.add('is-visible');
            } else {
                floatEl.classList.remove('is-visible');
            }
        }

        window.addEventListener('scroll', function() {
            if (debounceTimer) return;
            debounceTimer = setTimeout(function() {
                debounceTimer = null;
                checkScroll();
            }, 80);
        }, { passive: true });

        checkScroll();
    }


    /* ========================================
       DOM Ready
       ======================================== */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            init();
            bindScrollLinks();
            initFloatCta();
        });
    } else {
        init();
        bindScrollLinks();
        initFloatCta();
    }

})();
