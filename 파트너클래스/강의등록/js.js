/* ============================================
   PRESSCO21 강의 등록 폼 - js.js
   메이크샵 D4 호환: IIFE, var, \${} 이스케이프
   CSS 스코핑: .class-register
   n8n 웹훅: POST https://n8n.pressco21.com/webhook/class-register
   ============================================ */
(function() {
    'use strict';

    /* ========================================
       설정값
       ======================================== */

    /** n8n WF-16 강의 등록 엔드포인트 */
    var REGISTER_URL = 'https://n8n.pressco21.com/webhook/class-register';

    /** WF-02 파트너 인증 엔드포인트 */
    var PARTNER_AUTH_URL = 'https://n8n.pressco21.com/webhook/partner-auth';

    /* ========================================
       상태 관리
       ======================================== */

    /** 로그인한 회원 ID */
    var memberId = '';

    /** 제출 진행 중 중복 방지 */
    var isSubmitting = false;


    /* ========================================
       초기화
       ======================================== */

    function init() {
        // 로그인 버튼 JS 폴백
        var loginBtn = document.getElementById('crLoginBtn');
        if (loginBtn) {
            loginBtn.onclick = function(e) {
                e.preventDefault();
                window.location.href = '/member/login.html';
            };
        }

        // 회원 ID 읽기 (가상태그)
        var memberEl = document.getElementById('crMemberId');
        if (memberEl) {
            memberId = (memberEl.textContent || '').trim();
        }

        // 미로그인 처리
        if (!memberId) {
            showArea('crNoticeArea');
            return;
        }

        // 파트너 인증 + 교육 이수 사전 체크
        checkPartnerAndEducation(memberId, function(status) {
            if (status === 'NOT_PARTNER') {
                showAlreadyArea(
                    '파트너 전용 기능입니다',
                    '강의 등록은 승인된 파트너만 이용하실 수 있어요. 먼저 파트너 신청을 진행해주세요.'
                );
                return;
            }
            if (status === 'EDUCATION_REQUIRED') {
                showAlreadyArea(
                    '교육 이수 후 이용 가능합니다',
                    '파트너 필수 교육을 이수하시면 강의 등록이 가능해요. 교육 페이지에서 먼저 이수해주세요.'
                );
                return;
            }
            // 정상: 폼 표시
            showArea('crFormArea');
            bindFormEvents();
        });
    }


    /* ========================================
       파트너 인증 사전 체크 (WF-02)
       ======================================== */

    /**
     * 파트너 인증 + 교육 이수 여부 확인
     * @param {string} mid - 회원 ID
     * @param {Function} callback - function(status) 'OK' | 'NOT_PARTNER' | 'EDUCATION_REQUIRED' | 'ERROR'
     */
    function checkPartnerAndEducation(mid, callback) {
        fetch(PARTNER_AUTH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getPartnerAuth', member_id: mid }),
            redirect: 'follow'
        })
            .then(function(response) { return response.json(); })
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
                if (!data.education_completed) {
                    callback('EDUCATION_REQUIRED');
                    return;
                }
                callback('OK');
            })
            .catch(function(err) {
                console.warn('[ClassRegister] 파트너 인증 체크 실패 (폼 표시 진행):', err);
                // 네트워크 오류 시 폼 표시 (UX 저하 방지)
                callback('OK');
            });
    }


    /* ========================================
       이벤트 바인딩
       ======================================== */

    function bindFormEvents() {
        // 폼 제출
        var form = document.getElementById('crRegisterForm');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                handleSubmit();
            });
        }

        // textarea 글자수 카운터들
        bindCharCounter('crDescription', 'crDescCharCount');
        bindCharCounter('crScheduleDesc', 'crScheduleCharCount');
        bindCharCounter('crCurriculum', 'crCurriculumCharCount');
        bindCharCounter('crMaterials', 'crMaterialsCharCount');

        // 동의 상세보기 토글
        var toggleBtns = document.querySelectorAll('.class-register .js-agree-toggle');
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

        // 일정 추가 버튼
        bindScheduleEntries();

        // 이미지 URL 미리보기
        bindImagePreview();

        // 입력 시 에러 초기화
        var inputs = document.querySelectorAll('.class-register .cr-form__input, .class-register .cr-form__select, .class-register .cr-form__textarea');
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

    /** 일정 항목 카운터 */
    var scheduleCount = 0;

    /**
     * 일정 추가 UI 바인딩
     */
    function bindScheduleEntries() {
        var addBtn = document.getElementById('crAddScheduleBtn');
        if (!addBtn) return;

        addBtn.addEventListener('click', function() {
            addScheduleEntry();
        });

        // 삭제 이벤트 위임
        var container = document.getElementById('crScheduleEntries');
        if (container) {
            container.addEventListener('click', function(e) {
                var removeBtn = e.target.closest('.cr-schedule-entry__remove');
                if (removeBtn) {
                    var entry = removeBtn.closest('.cr-schedule-entry');
                    if (entry) entry.remove();
                }
            });
        }
    }

    /**
     * 일정 항목 하나 추가
     */
    function addScheduleEntry() {
        var container = document.getElementById('crScheduleEntries');
        if (!container) return;

        scheduleCount++;
        var idx = scheduleCount;

        // 기본 날짜: 내일
        var tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
        var defaultDate = tomorrow.getFullYear() + '-' + pad(tomorrow.getMonth() + 1) + '-' + pad(tomorrow.getDate());

        var entry = document.createElement('div');
        entry.className = 'cr-schedule-entry';
        entry.innerHTML = '<div class="cr-schedule-entry__fields">' +
            '<div class="cr-schedule-entry__field">' +
                '<label class="cr-schedule-entry__label">\uB0A0\uC9DC</label>' +
                '<input type="date" class="cr-form__input cr-sched-date" value="' + defaultDate + '" min="' + defaultDate + '">' +
            '</div>' +
            '<div class="cr-schedule-entry__field">' +
                '<label class="cr-schedule-entry__label">\uC2DC\uAC04</label>' +
                '<input type="time" class="cr-form__input cr-sched-time" value="10:00">' +
            '</div>' +
            '<div class="cr-schedule-entry__field">' +
                '<label class="cr-schedule-entry__label">\uC815\uC6D0</label>' +
                '<input type="number" class="cr-form__input cr-sched-capacity" value="6" min="1" max="50">' +
            '</div>' +
            '<button type="button" class="cr-schedule-entry__remove" aria-label="\uC0AD\uC81C">&times;</button>' +
        '</div>';

        container.appendChild(entry);
    }

    /**
     * 일정 항목들 수집
     * @returns {Array}
     */
    function collectSchedules() {
        var entries = document.querySelectorAll('.class-register .cr-schedule-entry');
        var schedules = [];
        for (var i = 0; i < entries.length; i++) {
            var dateEl = entries[i].querySelector('.cr-sched-date');
            var timeEl = entries[i].querySelector('.cr-sched-time');
            var capEl = entries[i].querySelector('.cr-sched-capacity');
            var date = dateEl ? dateEl.value : '';
            var time = timeEl ? timeEl.value : '';
            var cap = capEl ? parseInt(capEl.value, 10) : 6;
            if (date && time && cap > 0) {
                schedules.push({
                    schedule_date: date,
                    schedule_time: time,
                    capacity: cap
                });
            }
        }
        return schedules;
    }

    /**
     * 이미지 URL 입력 시 실시간 미리보기
     */
    function bindImagePreview() {
        var urlInput = document.getElementById('crImageUrl');
        var previewWrap = document.getElementById('crImagePreviewWrap');
        var previewImg = document.getElementById('crImagePreview');

        if (!urlInput) return;

        // 미리보기 요소가 없으면 동적 생성
        if (!previewWrap) {
            previewWrap = document.createElement('div');
            previewWrap.id = 'crImagePreviewWrap';
            previewWrap.style.cssText = 'display:none;margin-top:8px;';
            previewImg = document.createElement('img');
            previewImg.id = 'crImagePreview';
            previewImg.alt = '이미지 미리보기';
            previewImg.style.cssText = 'max-width:100%;max-height:200px;border-radius:8px;border:1px solid #e0ddd8;object-fit:cover;';
            previewWrap.appendChild(previewImg);
            urlInput.parentNode.appendChild(previewWrap);
        }

        urlInput.addEventListener('input', function() {
            var url = (this.value || '').trim();
            if (isValidUrl(url) && url.length > 10) {
                previewImg.src = url;
                previewImg.onload = function() {
                    previewWrap.style.display = '';
                };
                previewImg.onerror = function() {
                    previewWrap.style.display = 'none';
                };
            } else {
                previewWrap.style.display = 'none';
                previewImg.src = '';
            }
        });
    }

    /**
     * textarea 글자수 카운터 바인딩
     * @param {string} textareaId
     * @param {string} counterId
     */
    function bindCharCounter(textareaId, counterId) {
        var textarea = document.getElementById(textareaId);
        var counter = document.getElementById(counterId);
        if (textarea && counter) {
            textarea.addEventListener('input', function() {
                counter.textContent = this.value.length;
            });
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

        postRegister(data, function(err, responseData) {
            hideLoading();
            setSubmitLoading(false);
            isSubmitting = false;

            if (err) {
                showGlobalError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
                return;
            }

            if (!responseData || !responseData.success) {
                var errorCode = (responseData && responseData.error && responseData.error.code) || '';
                var errorMsg = (responseData && responseData.error && responseData.error.message) || '강의 등록 처리 중 오류가 발생했습니다.';

                if (errorCode === 'NOT_PARTNER') {
                    showAlreadyArea(
                        '파트너 전용 기능입니다',
                        '강의 등록은 승인된 파트너만 이용하실 수 있어요. 먼저 파트너 신청을 진행해주세요.'
                    );
                    return;
                }
                if (errorCode === 'DUPLICATE_CLASS') {
                    showAlreadyArea(
                        '이미 등록된 강의명입니다',
                        '동일한 이름의 강의가 이미 등록되어 있어요. 강의명을 변경해서 다시 시도해주세요.'
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
            var classId = (responseData.data && responseData.data.class_id) || '';
            showSuccessArea(classId);
        });
    }

    /**
     * 폼 데이터 수집
     * @returns {Object}
     */
    function collectFormData() {
        var maxStudentsVal = parseInt(getVal('crMaxStudents'), 10);
        var priceVal = parseInt(getVal('crPrice'), 10);

        return {
            member_id:          memberId,
            title:              getVal('crTitle'),
            category:           getVal('crCategory'),
            type:               getVal('crType'),
            difficulty:         getVal('crDifficulty'),
            max_students:       isNaN(maxStudentsVal) ? 0 : maxStudentsVal,
            price:              isNaN(priceVal) ? 0 : priceVal,
            duration:           getVal('crDuration'),
            description:        getVal('crDescription'),
            schedule_desc:      getVal('crScheduleDesc'),
            curriculum:         getVal('crCurriculum'),
            image_url:          getVal('crImageUrl'),
            materials:          getVal('crMaterials'),
            location:           getVal('crLocation'),
            contact_instagram:  getVal('crContactInstagram'),
            contact_phone:      getVal('crContactPhone'),
            contact_kakao:      getVal('crContactKakao'),
            schedules:          collectSchedules()
        };
    }

    /**
     * 폼 유효성 검사
     * @returns {boolean}
     */
    function validateForm() {
        var valid = true;

        // 강의명
        if (!getVal('crTitle')) {
            showFieldError('crTitle', '강의명을 입력해주세요.');
            valid = false;
        }

        // 카테고리
        if (!getVal('crCategory')) {
            showFieldError('crCategory', '카테고리를 선택해주세요.');
            valid = false;
        }

        // 강의 형태
        if (!getVal('crType')) {
            showFieldError('crType', '강의 형태를 선택해주세요.');
            valid = false;
        }

        // 난이도
        if (!getVal('crDifficulty')) {
            showFieldError('crDifficulty', '난이도를 선택해주세요.');
            valid = false;
        }

        // 최대 수강인원
        var maxStudents = getVal('crMaxStudents');
        if (!maxStudents) {
            showFieldError('crMaxStudents', '최대 수강인원을 입력해주세요.');
            valid = false;
        } else {
            var maxNum = parseInt(maxStudents, 10);
            if (isNaN(maxNum) || maxNum < 1 || maxNum > 50) {
                showFieldError('crMaxStudents', '수강인원은 1~50명 사이로 입력해주세요.');
                valid = false;
            }
        }

        // 수강료
        var price = getVal('crPrice');
        if (!price) {
            showFieldError('crPrice', '수강료를 입력해주세요.');
            valid = false;
        } else {
            var priceNum = parseInt(price, 10);
            if (isNaN(priceNum) || priceNum < 1000) {
                showFieldError('crPrice', '수강료는 1,000원 이상으로 입력해주세요.');
                valid = false;
            }
        }

        // 소요시간
        if (!getVal('crDuration')) {
            showFieldError('crDuration', '소요시간을 입력해주세요.');
            valid = false;
        }

        // 강의 소개
        if (!getVal('crDescription')) {
            showFieldError('crDescription', '강의 소개를 입력해주세요.');
            valid = false;
        }

        // URL 형식 검사 (선택 필드, 입력 시에만)
        var imageUrl = getVal('crImageUrl');
        if (imageUrl && !isValidUrl(imageUrl)) {
            showFieldError('crImageUrl', 'https://로 시작하는 올바른 URL을 입력해주세요.');
            valid = false;
        }

        var instaUrl = getVal('crContactInstagram');
        if (instaUrl && !isValidUrl(instaUrl)) {
            showFieldError('crContactInstagram', 'https://로 시작하는 올바른 URL을 입력해주세요.');
            valid = false;
        }

        var kakaoUrl = getVal('crContactKakao');
        if (kakaoUrl && !isValidUrl(kakaoUrl)) {
            showFieldError('crContactKakao', 'https://로 시작하는 올바른 URL을 입력해주세요.');
            valid = false;
        }

        // 약관 동의
        var agreeTerms = document.getElementById('crAgreeTerms');
        if (!agreeTerms || !agreeTerms.checked) {
            var agreeError = document.getElementById('crAgreeTermsError');
            if (agreeError) agreeError.style.display = '';
            valid = false;
        }

        // 첫 번째 에러 필드로 스크롤
        if (!valid) {
            var firstError = document.querySelector('.class-register .cr-form__input.is-error, .class-register .cr-form__select.is-error, .class-register .cr-form__textarea.is-error');
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
     * 강의 등록 POST 요청
     * @param {Object} data
     * @param {Function} callback - function(err, data)
     */
    function postRegister(data, callback) {
        fetch(REGISTER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            redirect: 'follow'
        })
            .then(function(response) {
                if (!response.ok && response.status >= 500) {
                    throw new Error('HTTP ' + response.status);
                }
                return response.json();
            })
            .then(function(resData) {
                callback(null, resData);
            })
            .catch(function(err) {
                console.error('[ClassRegister] 강의 등록 API 실패:', err);
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
    function showArea(areaId) {
        var areas = ['crNoticeArea', 'crFormArea', 'crSuccessArea', 'crAlreadyArea'];
        for (var i = 0; i < areas.length; i++) {
            var el = document.getElementById(areas[i]);
            if (el) el.style.display = areas[i] === areaId ? '' : 'none';
        }
    }

    /**
     * 등록 완료 화면 표시
     * @param {string} classId
     */
    function showSuccessArea(classId) {
        var classIdEl = document.getElementById('crSuccessClassId');
        if (classIdEl) classIdEl.textContent = classId || '-';
        showArea('crSuccessArea');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * 파트너 아님/에러 안내 화면 표시
     * @param {string} title
     * @param {string} desc
     */
    function showAlreadyArea(title, desc) {
        var titleEl = document.getElementById('crAlreadyTitle');
        var descEl = document.getElementById('crAlreadyDesc');
        if (titleEl) titleEl.textContent = title;
        if (descEl) descEl.textContent = desc;
        showArea('crAlreadyArea');
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
        // 약관 동의 에러도 함께 초기화
        if (fieldId === 'crAgreeTerms') {
            var agreeError = document.getElementById('crAgreeTermsError');
            if (agreeError) agreeError.style.display = 'none';
        }
    }

    /**
     * 전체 에러 메시지 표시
     * @param {string} msg
     */
    function showGlobalError(msg) {
        var el = document.getElementById('crFormGlobalError');
        if (!el) return;
        el.textContent = msg;
        el.style.display = '';
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /** 전체 에러 숨기기 */
    function hideGlobalError() {
        var el = document.getElementById('crFormGlobalError');
        if (el) {
            el.textContent = '';
            el.style.display = 'none';
        }
    }


    /* ========================================
       로딩 상태
       ======================================== */

    function showLoading() {
        var el = document.getElementById('crLoadingOverlay');
        if (el) el.style.display = 'flex';
    }

    function hideLoading() {
        var el = document.getElementById('crLoadingOverlay');
        if (el) el.style.display = 'none';
    }

    /**
     * 제출 버튼 로딩 상태
     * @param {boolean} loading
     */
    function setSubmitLoading(loading) {
        var btn = document.getElementById('crSubmitBtn');
        var textEl = btn ? btn.querySelector('.cr-form__submit-btn-text') : null;
        var loadingEl = btn ? btn.querySelector('.cr-form__submit-btn-loading') : null;

        if (!btn) return;
        btn.disabled = loading;
        if (textEl) textEl.style.display = loading ? 'none' : '';
        if (loadingEl) loadingEl.style.display = loading ? '' : 'none';
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
       DOM Ready
       ======================================== */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
