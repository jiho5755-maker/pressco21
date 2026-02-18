(function(){
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
                
                // 토글이 열릴 때 첫 번째 입력 필드에 포커스
                if ($("#simpleLogin .mlog-sign").hasClass("show-traditional")) {
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

            // 탭 메뉴 기능 (주문조회 버전용)
            $(".cw-tab li").on("click", function(e){
                e.preventDefault();
                var $tab = $(this);
                var $tabs = $(".cw-tab li");
                var $contents = $(".tab-content");
                
                $tabs.removeClass("now");
                $tab.addClass("now");
                
                $contents.removeClass("active");
                
                var targetId = $tab.find("a").attr("href");
                var $targetContent = $(targetId);
                
                if ($targetContent.length) {
                    $targetContent.addClass("active");
                }
                
                return false;
            });

            // 소셜 로그인 버튼은 이벤트 리스너 없이 메이크샵 기본 동작 사용
            // javascript:sns_login_log(), javascript:ks_login_log() 함수가 자동 실행됨
        });
    }
    
    initLoginToggle();
})();
