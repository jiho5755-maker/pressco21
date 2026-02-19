(function(){
    'use strict';

    function initLoginToggle() {
        if (typeof jQuery === 'undefined') {
            setTimeout(initLoginToggle, 100);
            return;
        }

        jQuery(document).ready(function($){
            // 토글 기능 - #simpleLogin 안의 .mlog-sign를 보여주기
            $("#toggleTraditionalLogin").on("click", function(e){
                e.preventDefault();
                $(this).toggleClass("active");
                $("#simpleLogin .mlog-sign").toggleClass("show-traditional");

                var isExpanded = $("#simpleLogin .mlog-sign").hasClass("show-traditional");
                $(this).attr("aria-expanded", isExpanded ? "true" : "false");

                // 토글이 열릴 때 첫 번째 입력 필드에 포커스
                if (isExpanded) {
                    setTimeout(function() {
                        $("#simpleLogin .mlog-sign input:first").focus();
                    }, 300);
                }
                return false;
            });

            // 엔터키 로그인 기능
            $("#simpleLogin .mlog-sign input").on("keypress", function(e){
                if (e.which === 13 || e.keyCode === 13) {
                    e.preventDefault();
                    var $form = $(this).closest("form");
                    if ($form.length) {
                        var $submitBtn = $form.find("a[href*='link_login_button']");
                        if ($submitBtn.length) {
                            window.location.href = $submitBtn.attr("href");
                        } else {
                            $form.submit();
                        }
                    }
                    return false;
                }
            });

            // 탭 메뉴 기능 (주문조회 버전용) + ARIA
            $(".cw-tab li").on("click", function(e){
                e.preventDefault();
                var $tab = $(this);
                var $tabs = $(".cw-tab li");
                var $contents = $(".tab-content");

                $tabs.removeClass("now");
                $tabs.find("a").attr("aria-selected", "false");
                $tab.addClass("now");
                $tab.find("a").attr("aria-selected", "true");

                $contents.removeClass("active");

                var targetId = $tab.find("a").attr("href");
                var $targetContent = $(targetId);

                if ($targetContent.length) {
                    $targetContent.addClass("active");
                }

                return false;
            });

            // 접근성: autocomplete 속성 동적 추가
            // 메이크샵 가상태그로 렌더링되는 input에 직접 속성 추가 불가
            initAutocomplete();

            // 접근성: 비밀번호 표시/숨기기 토글
            initPasswordToggle();

            // 소셜 로그인 버튼은 이벤트 리스너 없이 메이크샵 기본 동작 사용
            // javascript:sns_login_log(), javascript:ks_login_log() 함수가 자동 실행됨
        });
    }

    // autocomplete 속성 동적 추가
    function initAutocomplete() {
        var idInput = document.querySelector('#loginWrap input[name="id"]');
        var pwInput = document.querySelector('#loginWrap input[name="passwd"]');
        if (idInput) idInput.setAttribute('autocomplete', 'email');
        if (pwInput) pwInput.setAttribute('autocomplete', 'current-password');

        // 주문조회 비회원 폼
        var nameInput = document.querySelector('#loginWrap input[name="order_name"]');
        var orderInput = document.querySelector('#loginWrap input[name="order_id"]');
        if (nameInput) nameInput.setAttribute('autocomplete', 'name');
        if (orderInput) orderInput.setAttribute('autocomplete', 'off');
    }

    // 비밀번호 표시/숨기기 토글
    function initPasswordToggle() {
        var pwInput = document.querySelector('#loginWrap input[name="passwd"]');
        if (!pwInput) return;

        var pwLi = pwInput.closest('li');
        if (!pwLi) return;

        pwLi.style.position = 'relative';

        var toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'password-toggle';
        toggleBtn.setAttribute('aria-label', '비밀번호 표시');
        toggleBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
            '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>' +
            '<circle cx="12" cy="12" r="3"></circle>' +
            '</svg>';

        toggleBtn.addEventListener('click', function() {
            var isPassword = pwInput.type === 'password';
            pwInput.type = isPassword ? 'text' : 'password';
            this.setAttribute('aria-label', isPassword ? '비밀번호 숨기기' : '비밀번호 표시');
            this.classList.toggle('active', isPassword);
        });

        pwLi.appendChild(toggleBtn);
    }

    initLoginToggle();
})();
