/* ============================================
   PRESSCO21 파트너 필수 교육 이수 - js.js
   메이크샵 D4 호환: IIFE, var, \${} 이스케이프
   CSS 스코핑: .partner-education
   n8n 웹훅: POST https://n8n.pressco21.com/webhook/education-complete
   ============================================ */
(function() {
    'use strict';

    /* ========================================
       설정값
       ======================================== */

    /** WF-10 교육 이수 엔드포인트 */
    var EDUCATION_URL = 'https://n8n.pressco21.com/webhook/education-complete';

    /** WF-02 파트너 인증 엔드포인트 (교육 상태 조회) */
    var PARTNER_AUTH_URL = 'https://n8n.pressco21.com/webhook/partner-auth';

    /** 총 문항 수 (서버와 동일, 고정) */
    var TOTAL_QUESTIONS = 15;

    // TODO: 실제 교육 영상 ID로 교체 필요
    /** YouTube 영상 ID 목록 (3편) */
    var VIDEO_IDS = [
        'dQw4w9WgXcQ',  // 영상 1: 압화/보존화 기초 이론
        'dQw4w9WgXcQ',  // 영상 2: 클래스 운영 가이드
        'dQw4w9WgXcQ'   // 영상 3: PRESSCO21 파트너 정책
    ];

    /** 퀴즈 문항 데이터 (15문항, 4지 선다) */
    var QUIZ_DATA = [
        /* ---- 1~5: 압화/보존화 기초 지식 ---- */
        {
            question: '압화(Pressed Flower)에 대한 설명으로 가장 올바른 것은?',
            options: [
                '생화에 특수 용액을 주입하여 보존하는 기법이다.',
                '꽃이나 식물을 건조 압착하여 평면 예술 작품으로 만드는 기법이다.',
                '꽃을 냉동 건조하여 입체 형태를 유지하는 기법이다.',
                '인공 재료로 꽃 모양을 만드는 공예 기법이다.'
            ]
        },
        {
            question: '보존화(프리저브드 플라워)의 정의로 가장 정확한 것은?',
            options: [
                '말린 꽃에 색을 다시 입히는 기법이다.',
                '특수 보존 용액을 사용해 생화의 질감과 아름다움을 오랫동안 유지하는 기법이다.',
                '실리카겔에 꽃을 묻어 수분만 제거하는 기법이다.',
                '꽃을 레진으로 코팅하여 굳히는 기법이다.'
            ]
        },
        {
            question: '압화용 소재를 선택할 때 가장 적합한 꽃의 특성은?',
            options: [
                '꽃잎이 두껍고 수분이 많은 꽃이 좋다.',
                '꽃잎이 얇고 수분이 적으며 납작하게 눌리기 쉬운 꽃이 좋다.',
                '크기가 크고 줄기가 굵은 꽃이 좋다.',
                '향이 강한 꽃일수록 보존이 잘 된다.'
            ]
        },
        {
            question: '다음 중 압화/보존화의 기본 건조 방법에 해당하지 않는 것은?',
            options: [
                '실리카겔 건조법',
                '누름판(프레스) 건조법',
                '자연 건조(매달기) 법',
                '고온 스팀 건조법'
            ]
        },
        {
            question: '완성된 압화/보존화 작품의 올바른 보관 방법은?',
            options: [
                '직사광선이 잘 드는 창가에 전시한다.',
                '밀폐 용기에 물과 함께 보관한다.',
                '습기를 차단하고 직사광선을 피해 서늘한 곳에 보관한다.',
                '냉장고에 넣어 저온 보관한다.'
            ]
        },

        /* ---- 6~10: 클래스 운영 실무 ---- */
        {
            question: '클래스 운영 시 수강생 안전 관리에 대한 설명으로 올바른 것은?',
            options: [
                '레진, UV 경화기 등 재료/장비 사용 안내와 환기를 철저히 한다.',
                '안전 관리는 수강생 본인의 책임이므로 별도 안내가 필요 없다.',
                '재료 취급 시 장갑은 불편하므로 착용하지 않아도 된다.',
                '작업 공간의 조명은 분위기를 위해 최대한 어둡게 한다.'
            ]
        },
        {
            question: '원데이 클래스 기준 적정 수강 인원으로 가장 권장되는 범위는?',
            options: [
                '1~2명',
                '4~8명',
                '15~20명',
                '인원 제한 없이 가능한 많이'
            ]
        },
        {
            question: '원데이 꽃 공예 클래스의 일반적 소요 시간으로 적절한 것은?',
            options: [
                '30분~1시간',
                '2~3시간',
                '5~6시간',
                '하루 8시간'
            ]
        },
        {
            question: '수강생에게 준비물을 안내하는 올바른 방법은?',
            options: [
                '수업 당일에 구두로만 안내한다.',
                '수업 확정 후 사전에 문자/메시지로 상세히 안내하고, 필요 재료는 강사가 준비한다.',
                '준비물 안내는 불필요하며 모든 것을 수강생이 알아서 가져온다.',
                '준비물 목록을 교실 입구에만 붙여놓는다.'
            ]
        },
        {
            question: '수강생의 완성품 보관/배송에 대한 올바른 안내는?',
            options: [
                '완성 후 즉시 밀봉하여 택배 발송한다.',
                '건조/경화 시간이 필요한 경우 충분히 안내하고, 안전한 포장 방법을 알려준다.',
                '완성품 보관은 수강생의 몫이므로 별도 안내가 필요 없다.',
                '모든 완성품은 교실에 1주일간 보관 후 폐기한다.'
            ]
        },

        /* ---- 11~15: PRESSCO21 파트너 정책 ---- */
        {
            question: 'PRESSCO21 파트너의 수수료(적립금) 정산 주기는?',
            options: [
                '수업 완료 즉시 입금',
                '매월 말일 일괄 정산',
                '수업 완료 후 D+3 영업일 이내 적립금 지급',
                '분기별 1회 정산'
            ]
        },
        {
            question: 'PRESSCO21에서 신규 클래스를 등록하는 절차로 올바른 것은?',
            options: [
                '파트너가 직접 사이트에 바로 게시한다.',
                '파트너가 클래스 정보를 제출하면 관리자 검수/승인 후 활성화된다.',
                '고객센터에 전화로 요청한다.',
                '별도 절차 없이 자동으로 등록된다.'
            ]
        },
        {
            question: '수강생의 환불 처리 기준으로 올바른 것은?',
            options: [
                '결제 후에는 어떤 경우에도 환불이 불가능하다.',
                '수업 시작 전까지 전액 환불이 가능하며, 수업 당일 이후에는 환불 규정에 따라 처리된다.',
                '환불 요청은 수강생이 직접 카드사에 연락해야 한다.',
                '수업 완료 후에도 언제든 전액 환불이 가능하다.'
            ]
        },
        {
            question: '파트너가 수강생 후기에 대해 할 수 있는 것은?',
            options: [
                '부정적인 후기를 직접 삭제할 수 있다.',
                '후기에 감사 답글을 작성할 수 있다.',
                '후기 작성자의 개인정보를 조회할 수 있다.',
                '다른 파트너의 후기를 수정할 수 있다.'
            ]
        },
        {
            question: 'PRESSCO21 파트너 등급 제도의 순서로 올바른 것은?',
            options: [
                'BRONZE -> SILVER -> GOLD',
                'SILVER -> GOLD -> PLATINUM',
                'BASIC -> PREMIUM -> VIP',
                'GOLD -> DIAMOND -> MASTER'
            ]
        }
    ];

    /* 정답 배열은 서버(WF-10)에서만 관리 — 클라이언트 채점 없음 */


    /* ========================================
       상태 관리
       ======================================== */

    /** 로그인한 회원 ID */
    var memberId = '';

    /** YouTube 플레이어 인스턴스 배열 */
    var players = [];

    /** 영상별 시청 완료 상태 */
    var videoCompleted = [false, false, false];

    /** 제출 진행 중 중복 방지 */
    var isSubmitting = false;

    /** YT API 로드 완료 여부 */
    var ytApiReady = false;


    /* ========================================
       초기화
       ======================================== */

    function init() {
        // 로그인 버튼 JS 폴백
        var loginBtn = document.getElementById('peLoginBtn');
        if (loginBtn) {
            loginBtn.onclick = function(e) {
                e.preventDefault();
                window.location.href = '/shop/member.html?type=login&returnUrl=' + encodeURIComponent(window.location.href);
            };
        }

        // 회원 ID 읽기 (가상태그)
        var memberEl = document.getElementById('peMemberId');
        if (memberEl) {
            memberId = (memberEl.textContent || '').trim();
        }

        // 미로그인 처리
        if (!memberId) {
            showArea('peNoticeArea');
            return;
        }

        // 교육 이수 완료 여부 사전 체크
        fetchEducationStatus(memberId, function(err, completed) {
            if (!err && completed) {
                showArea('peAlreadyArea');
                return;
            }
            // 콘텐츠 표시
            showArea('peContentArea');

            // YouTube IFrame API 로드
            loadYouTubeAPI();

            // 퀴즈 문항 렌더링
            renderQuizQuestions();

            // 이벤트 바인딩
            bindEvents();
        });
    }


    /* ========================================
       교육 상태 조회 (WF-02)
       ======================================== */

    /**
     * 교육 이수 완료 여부 사전 조회
     * @param {string} mid - 회원 ID
     * @param {Function} callback - function(err, isCompleted)
     */
    function fetchEducationStatus(mid, callback) {
        fetch(PARTNER_AUTH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getEducationStatus', member_id: mid }),
            redirect: 'follow'
        })
            .then(function(response) { return response.json(); })
            .then(function(resData) {
                var completed = !!(resData && resData.success && resData.data && resData.data.education_completed);
                callback(null, completed);
            })
            .catch(function(err) {
                console.warn('[PartnerEducation] 상태 조회 실패 (무시):', err);
                callback(err, false);
            });
    }


    /* ========================================
       YouTube IFrame API
       ======================================== */

    /**
     * YouTube IFrame API 스크립트 로드
     */
    function loadYouTubeAPI() {
        // 이미 로드된 경우
        if (window.YT && window.YT.Player) {
            ytApiReady = true;
            initPlayers();
            return;
        }

        var tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        var firstScriptTag = document.getElementsByTagName('script')[0];
        if (firstScriptTag && firstScriptTag.parentNode) {
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else {
            document.head.appendChild(tag);
        }
    }

    /**
     * YouTube 플레이어 초기화 (YT API Ready 콜백에서 호출)
     */
    function initPlayers() {
        for (var i = 0; i < VIDEO_IDS.length; i++) {
            (function(index) {
                var player = new window.YT.Player('pePlayer' + index, {
                    videoId: VIDEO_IDS[index],
                    playerVars: {
                        rel: 0,
                        modestbranding: 1,
                        playsinline: 1,
                        fs: 1
                    },
                    events: {
                        onStateChange: function(event) {
                            onPlayerStateChange(index, event);
                        }
                    }
                });
                players.push(player);
            })(i);
        }
    }

    /**
     * 플레이어 상태 변경 핸들러
     * @param {number} index - 영상 인덱스 (0, 1, 2)
     * @param {Object} event - YT 이벤트
     */
    function onPlayerStateChange(index, event) {
        // YT.PlayerState.ENDED === 0
        if (event.data === 0) {
            markVideoComplete(index);
        }
    }

    /**
     * 영상 시청 완료 처리
     * @param {number} index
     */
    function markVideoComplete(index) {
        if (videoCompleted[index]) return;

        videoCompleted[index] = true;

        // 카드 UI 업데이트
        var card = document.getElementById('peVideoCard' + index);
        if (card) card.classList.add('is-complete');

        // 상태 텍스트 업데이트
        var statusEl = document.getElementById('peVideoStatus' + index);
        if (statusEl) {
            var iconEl = statusEl.querySelector('.pe-video-card__status-icon');
            var textEl = statusEl.querySelector('.pe-video-card__status-text');

            if (iconEl) {
                iconEl.innerHTML = '<circle cx="9" cy="9" r="8" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
            }
            if (textEl) textEl.textContent = '시청 완료';
        }

        // 완료 카운트 업데이트
        var completedCount = getCompletedVideoCount();
        var countEl = document.getElementById('peVideoCompleteNum');
        if (countEl) countEl.textContent = completedCount;

        // 3개 모두 완료 시 퀴즈 활성화
        if (completedCount === 3) {
            unlockQuiz();
        }
    }

    /**
     * 완료된 영상 수 반환
     * @returns {number}
     */
    function getCompletedVideoCount() {
        var count = 0;
        for (var i = 0; i < videoCompleted.length; i++) {
            if (videoCompleted[i]) count++;
        }
        return count;
    }


    /* ========================================
       퀴즈
       ======================================== */

    /**
     * 퀴즈 문항 HTML 렌더링
     */
    function renderQuizQuestions() {
        var container = document.getElementById('peQuizQuestions');
        if (!container) return;

        var html = '';
        for (var i = 0; i < QUIZ_DATA.length; i++) {
            var q = QUIZ_DATA[i];
            var qNum = i + 1;
            var qNumStr = qNum < 10 ? '0' + qNum : '' + qNum;

            html += '<div class="pe-quiz-item" id="peQuizItem' + i + '">';
            html += '<p class="pe-quiz-item__question"><span class="pe-quiz-item__num">Q' + qNumStr + '.</span><span>' + escapeHtml(q.question) + '</span></p>';
            html += '<div class="pe-quiz-item__options">';

            for (var j = 0; j < q.options.length; j++) {
                var optionId = 'peQ' + i + 'O' + j;
                html += '<label class="pe-quiz-option" for="' + optionId + '">';
                html += '<input type="radio" id="' + optionId + '" name="peQuiz' + i + '" value="' + j + '">';
                html += '<span class="pe-quiz-option__text">' + escapeHtml(q.options[j]) + '</span>';
                html += '</label>';
            }

            html += '</div>';
            html += '</div>';
        }

        container.innerHTML = html;
    }

    /**
     * 퀴즈 영역 잠금 해제
     */
    function unlockQuiz() {
        var step2 = document.getElementById('peStep2');
        if (step2) {
            step2.classList.remove('pe-step-section--locked');
            step2.classList.add('is-unlocked');
        }

        // 잠금 안내 숨기고 퀴즈 표시
        var lockEl = document.getElementById('peQuizLock');
        var quizEl = document.getElementById('peQuizArea');
        if (lockEl) lockEl.style.display = 'none';
        if (quizEl) quizEl.style.display = '';

        // 진행 바 업데이트: Step 1 완료, Step 2 활성
        updateProgress(2);
    }

    /**
     * 모든 문항 응답 여부 확인
     * @returns {Array} 미응답 문항 인덱스 배열
     */
    function getUnansweredQuestions() {
        var unanswered = [];
        for (var i = 0; i < TOTAL_QUESTIONS; i++) {
            var selected = document.querySelector('input[name="peQuiz' + i + '"]:checked');
            if (!selected) {
                unanswered.push(i);
            }
        }
        return unanswered;
    }


    /* ========================================
       이벤트 바인딩
       ======================================== */

    function bindEvents() {
        // 퀴즈 폼 제출
        var form = document.getElementById('peQuizForm');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                handleSubmit();
            });
        }

        // 재시도 버튼
        var retryBtn = document.getElementById('peRetryBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', function() {
                handleRetry();
            });
        }
    }


    /* ========================================
       제출 처리
       ======================================== */

    function handleSubmit() {
        if (isSubmitting) return;

        // 미응답 체크
        var unanswered = getUnansweredQuestions();
        if (unanswered.length > 0) {
            highlightUnanswered(unanswered);
            return;
        }

        // 미응답 경고 + 제출 에러 숨기기
        var warningEl = document.getElementById('peQuizWarning');
        if (warningEl) warningEl.style.display = 'none';
        hideSubmitError();

        // 선택된 답변 배열 수집 (채점은 서버에서)
        var answers = [];
        for (var i = 0; i < TOTAL_QUESTIONS; i++) {
            var selectedInput = document.querySelector('input[name="peQuiz' + i + '"]:checked');
            answers.push(selectedInput ? parseInt(selectedInput.value, 10) : -1);
        }

        // 제출 시작
        isSubmitting = true;
        setSubmitLoading(true);
        showLoading();

        // WF-10 API 호출 (서버사이드 채점)
        var payload = {
            member_id: memberId,
            answers: answers
        };

        postEducation(payload, function(err, responseData) {
            hideLoading();
            setSubmitLoading(false);
            isSubmitting = false;

            if (err) {
                showSubmitError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
                return;
            }

            if (!responseData || !responseData.success) {
                var errorCode = '';
                var errorMsg = '처리 중 오류가 발생했습니다.';

                if (responseData && responseData.error) {
                    errorCode = responseData.error.code || '';
                    errorMsg = responseData.error.message || errorMsg;
                }

                handleErrorResponse(errorCode, errorMsg);
                return;
            }

            // 성공 처리
            var data = responseData.data || {};
            if (data.passed) {
                showPassResult(data.score, data.total);
            } else {
                showFailResult(data.score, data.total);
            }
        });
    }


    /* ========================================
       API 호출
       ======================================== */

    /**
     * 교육 이수 POST 요청
     * @param {Object} data
     * @param {Function} callback - function(err, data)
     */
    function postEducation(data, callback) {
        fetch(EDUCATION_URL, {
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
                console.error('[PartnerEducation] API 실패:', err);
                callback(err, null);
            });
    }


    /* ========================================
       에러 처리
       ======================================== */

    /**
     * 에러 코드별 분기 처리
     * @param {string} errorCode
     * @param {string} errorMsg
     */
    function handleErrorResponse(errorCode, errorMsg) {
        if (errorCode === 'NOT_LOGGED_IN') {
            showArea('peNoticeArea');
            return;
        }

        if (errorCode === 'NOT_PARTNER') {
            var titleEl = document.getElementById('peNotPartnerTitle');
            var descEl = document.getElementById('peNotPartnerDesc');
            if (titleEl) titleEl.textContent = '파트너 전용 페이지입니다';
            if (descEl) descEl.textContent = '파트너 신청이 승인된 후 교육을 이수하실 수 있어요.';
            showArea('peNotPartnerArea');
            return;
        }

        if (errorCode === 'PARTNER_INACTIVE') {
            var titleEl2 = document.getElementById('peNotPartnerTitle');
            var descEl2 = document.getElementById('peNotPartnerDesc');
            if (titleEl2) titleEl2.textContent = '파트너 계정이 비활성 상태입니다';
            if (descEl2) descEl2.textContent = '자세한 내용은 고객센터로 문의해주세요.';
            showArea('peNotPartnerArea');
            return;
        }

        if (errorCode === 'INVALID_SCORE') {
            showSubmitError('점수 데이터에 문제가 발생했습니다. 페이지를 새로고침 후 다시 시도해주세요.');
            return;
        }

        // 기타 에러
        showSubmitError(errorMsg);
    }


    /* ========================================
       미응답 하이라이트
       ======================================== */

    /**
     * 미응답 문항 하이라이트 + 경고 표시
     * @param {Array} indices - 미응답 문항 인덱스 배열
     */
    function highlightUnanswered(indices) {
        // 기존 하이라이트 초기화
        var allItems = document.querySelectorAll('.partner-education .pe-quiz-item');
        for (var i = 0; i < allItems.length; i++) {
            allItems[i].classList.remove('is-unanswered');
        }

        // 미응답 항목 하이라이트
        for (var j = 0; j < indices.length; j++) {
            var item = document.getElementById('peQuizItem' + indices[j]);
            if (item) item.classList.add('is-unanswered');
        }

        // 경고 표시
        var warningEl = document.getElementById('peQuizWarning');
        if (warningEl) warningEl.style.display = '';

        // 첫 번째 미응답 항목으로 스크롤
        var firstItem = document.getElementById('peQuizItem' + indices[0]);
        if (firstItem) {
            firstItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }


    /* ========================================
       결과 표시
       ======================================== */

    /**
     * 합격 결과 표시
     * @param {number} score
     * @param {number} total
     */
    function showPassResult(score, total) {
        var scoreEl = document.getElementById('peResultPassScore');
        if (scoreEl) scoreEl.textContent = score + ' / ' + total + ' 정답';

        var passEl = document.getElementById('peResultPass');
        var failEl = document.getElementById('peResultFail');
        if (passEl) passEl.style.display = '';
        if (failEl) failEl.style.display = 'none';

        showArea('peResultArea');
        updateProgress(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * 불합격 결과 표시
     * @param {number} score
     * @param {number} total
     */
    function showFailResult(score, total) {
        var scoreEl = document.getElementById('peResultFailScore');
        if (scoreEl) scoreEl.textContent = score + ' / ' + total + ' 정답 (11문항 이상 필요)';

        var passEl = document.getElementById('peResultPass');
        var failEl = document.getElementById('peResultFail');
        if (passEl) passEl.style.display = 'none';
        if (failEl) failEl.style.display = '';

        showArea('peResultArea');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }


    /* ========================================
       재시도
       ======================================== */

    function handleRetry() {
        // 퀴즈 초기화
        var radios = document.querySelectorAll('.partner-education input[name^="peQuiz"]');
        for (var i = 0; i < radios.length; i++) {
            radios[i].checked = false;
        }

        // 미응답 하이라이트 초기화
        var allItems = document.querySelectorAll('.partner-education .pe-quiz-item');
        for (var j = 0; j < allItems.length; j++) {
            allItems[j].classList.remove('is-unanswered');
        }

        // 경고 숨기기
        var warningEl = document.getElementById('peQuizWarning');
        if (warningEl) warningEl.style.display = 'none';

        // 콘텐츠 영역 표시
        showArea('peContentArea');
        updateProgress(2);

        // 퀴즈 영역으로 스크롤
        var quizArea = document.getElementById('peStep2');
        if (quizArea) {
            quizArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }


    /* ========================================
       화면 전환
       ======================================== */

    /**
     * 지정 영역만 표시 (나머지 숨김)
     * @param {string} areaId
     */
    function showArea(areaId) {
        var areas = ['peNoticeArea', 'peNotPartnerArea', 'peAlreadyArea', 'peContentArea', 'peResultArea'];
        for (var i = 0; i < areas.length; i++) {
            var el = document.getElementById(areas[i]);
            if (el) el.style.display = areas[i] === areaId ? '' : 'none';
        }
    }

    /**
     * 진행 상태 바 업데이트
     * @param {number} step - 현재 활성 스텝 (1, 2, 3)
     */
    function updateProgress(step) {
        var step1 = document.getElementById('peProgressStep1');
        var step2 = document.getElementById('peProgressStep2');
        var step3 = document.getElementById('peProgressStep3');
        var line1 = document.getElementById('peProgressLine1');
        var line2 = document.getElementById('peProgressLine2');

        // 초기화
        if (step1) { step1.className = 'pe-progress__step'; }
        if (step2) { step2.className = 'pe-progress__step'; }
        if (step3) { step3.className = 'pe-progress__step'; }
        if (line1) { line1.className = 'pe-progress__line'; }
        if (line2) { line2.className = 'pe-progress__line'; }

        if (step >= 1) {
            if (step === 1) {
                if (step1) step1.classList.add('is-active');
            } else {
                if (step1) step1.classList.add('is-done');
            }
        }
        if (step >= 2) {
            if (line1) line1.classList.add('is-done');
            if (step === 2) {
                if (step2) step2.classList.add('is-active');
            } else {
                if (step2) step2.classList.add('is-done');
            }
        }
        if (step >= 3) {
            if (line2) line2.classList.add('is-done');
            if (step3) step3.classList.add('is-done');
        }
    }


    /* ========================================
       제출 에러 메시지 (alert 대체)
       ======================================== */

    /**
     * 퀴즈 폼 상단에 인라인 에러 표시
     * @param {string} msg
     */
    function showSubmitError(msg) {
        var el = document.getElementById('peSubmitError');
        if (!el) {
            // 요소 없으면 동적 생성 (퀴즈 폼 상단에 삽입)
            el = document.createElement('div');
            el.id = 'peSubmitError';
            el.style.cssText = 'background:#fff2f2;border:1px solid #e55;color:#c33;padding:12px 16px;border-radius:8px;margin:0 0 16px;font-size:14px;';
            var form = document.getElementById('peQuizForm');
            if (form) form.insertBefore(el, form.firstChild);
        }
        el.textContent = msg;
        el.style.display = '';
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /** 제출 에러 메시지 숨기기 */
    function hideSubmitError() {
        var el = document.getElementById('peSubmitError');
        if (el) el.style.display = 'none';
    }


    /* ========================================
       로딩 상태
       ======================================== */

    function showLoading() {
        var el = document.getElementById('peLoadingOverlay');
        if (el) el.style.display = 'flex';
    }

    function hideLoading() {
        var el = document.getElementById('peLoadingOverlay');
        if (el) el.style.display = 'none';
    }

    /**
     * 제출 버튼 로딩 상태
     * @param {boolean} loading
     */
    function setSubmitLoading(loading) {
        var btn = document.getElementById('peSubmitBtn');
        var textEl = btn ? btn.querySelector('.pe-quiz__submit-text') : null;
        var loadingEl = btn ? btn.querySelector('.pe-quiz__submit-loading') : null;

        if (!btn) return;
        btn.disabled = loading;
        if (textEl) textEl.style.display = loading ? 'none' : '';
        if (loadingEl) loadingEl.style.display = loading ? '' : 'none';
    }


    /* ========================================
       유틸리티
       ======================================== */

    /**
     * HTML 이스케이프 (XSS 방지)
     * @param {string} str
     * @returns {string}
     */
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }


    /* ========================================
       YouTube IFrame API 글로벌 콜백
       메이크샵 D4에서 IIFE 내부 함수는 YT API가 찾을 수 없으므로
       반드시 window에 할당해야 함
       ======================================== */
    window.onYouTubeIframeAPIReady = function() {
        ytApiReady = true;
        initPlayers();
    };


    /* ========================================
       DOM Ready
       ======================================== */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
