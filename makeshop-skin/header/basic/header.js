function mobile_homebutton(title) {
    var page_uri = "http://" + document.domain,
        main_uri = page_uri + "/m/main.html",
        icon_uri = '',
        user_agent = navigator.userAgent.toLowerCase();
    var title = (title.length > 0) ? title : shop_name,
        encode_title = encodeURI(title);

    (function($) {
        $(function() {
            $('link').each(function() {
                if ($(this).attr('rel') == "apple-touch-icon-precomposed") {
                    icon_uri = page_uri + $(this).attr('href');
                }
            });
        });
    })(jQuery);

    var call_uri= "intent://addshortcut?url="+main_uri +"&icon="+icon_uri +"&title="+encode_title+"&oq="+encode_title+"&serviceCode=nstore&version=7#Intent;scheme=naversearchapp;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.nhn.android.search;end";
    if (user_agent.match(/ipad|iphone|ipod/g)) {
        alert('아이폰, 아이패드계열은 직접 홈버튼 추가를 사용하셔야 합니다.');
    } else {
        alert(title+'을(를) 홈화면에 추가합니다. 네이버앱이 없는 고객님께서는 네이버앱 설치페이지로 이동됩니다.');
        document.location.href = call_uri;
    }
}

jQuery("#menu").click(function(e) {
    e.preventDefault();
    if (jQuery(this).children(".fa").attr("class") == "fa fa-navicon fa-2x") {
        //var windowHeight = window.innerHeight;
        jQuery("aside, #mask").show();
        jQuery("html, body").addClass("menu_on");
        jQuery('.headerTop').addClass('top-pt-01');
        jQuery(this).children(".fa").attr("class","fa fa-times fa-2x");
    } else {
        jQuery("aside, #mask").hide();
        jQuery("html, body").removeClass("menu_on");
        jQuery('.headerTop').removeClass('top-pt-01');
        jQuery(this).children(".fa").attr("class","fa fa-navicon fa-2x");
    }
    return false
});

jQuery("aside nav .fa").click(function() {
    jQuery(this).parent().siblings().children("ul").hide();
    jQuery(this).parent().siblings().children(".fa-angle-down").removeClass("fa-rotate-180");
    jQuery(this).next("ul").toggle();

    if (jQuery(this).text() == "+") {
        jQuery(this).text("-");
    } else if (jQuery(this).text() == "-") {
        jQuery(this).text("+");
    } else {
        jQuery(this).toggleClass("fa-rotate-180");
    }
    return false
});
jQuery("#category").click(function() {
    jQuery(this).addClass("act").siblings().removeClass("act");
    jQuery(".navCategory").show();
    jQuery(".navCommunity, .navMypage").hide();
});
jQuery("#community").click(function() {
    jQuery(this).addClass("act").siblings().removeClass("act");
    jQuery(".navCommunity").show();
    jQuery(".navCategory, .navMypage").hide();
});
jQuery("#mypage").click(function() {
    jQuery(this).addClass("act").siblings().removeClass("act");
    jQuery(".navMypage").show();
    jQuery(".navCategory, .navCommunity").hide();
});
jQuery("#search").click(function() {
    jQuery("#header .search").toggle();
    jQuery("#keyword").focus()
});
jQuery("#btn_lastView").click(function() {
    jQuery("#ly_lastView").show();
});
jQuery("#ly_lastView .fa-times").click(function() {
    jQuery("#ly_lastView").hide();
});
jQuery(function() {
    jQuery("aside a[href='/m/personal.html?type=guest']").click(function(e) {
        alert(" *비회원용 문의입니다.\n 회원문의는 마이페이지를 이용하세요.");
    });
});
jQuery(window).scroll(function () {
    if (jQuery(this).scrollTop() > 200) {
        jQuery('.headerTop').addClass("top-pt-02");
    } else {
        jQuery('.headerTop').removeClass("top-pt-02");
    }
});

// 다찾다 검색 파인더 레이어 열기 닫기
jQuery('.all-finder-open').click(function(e){
    e.preventDefault();
    jQuery('body, html').css('overflow-y', 'hidden');
    jQuery('#all-finder-layer').show();
});
jQuery('.all-finder-close').click(function(e){
    e.preventDefault();
    jQuery('body, html').css('overflow-y', 'visible');
    jQuery('#all-finder-layer').hide();
});

// 다찾다 검색 파인더 레이어 옵션 열기 닫기
jQuery('.all-finder-layer .finder-opt dl dt').click(function(e){
    if (e.target.classList.contains('finder-tooltip-btn') || findParentElementClassName(e.target, 'finder-comm-layer')) {
        e.preventDefault();
        return;
    }
    if ( jQuery(this).find('span').hasClass('fa-angle-down') ){
        jQuery(this).find('span').addClass('fa-angle-up').removeClass('fa-angle-down');
    } else {
        jQuery(this).find('span').addClass('fa-angle-down').removeClass('fa-angle-up');
    }
    jQuery(this).next('dd').toggle();
    jQuery('.all-finder-layer').scrollTop(0).stop().animate({ scrollTop: jQuery(this).offset().top - 120 }, 0);
});

function findParentElementClassName(el, className) {
    return (el.classList.contains(className)) ? el : (el.parentElement !== null) ? findParentElementClassName(el.parentElement, className) : null;
}

$(function(){
    // 헤더 검색창 placeholder 변경
    $('#header .search-contents .search-box input').attr('placeholder', '검색어를 입력해 주세요.');

    // 헤더 검색창 열기버튼
    $('#header .nav-wrap .item-box.right .btn-link.search').click(function(){
        $('#header .nav-wrap .search-contents').toggleClass('active');
    });

    // 헤더 검색창 닫기버튼
    $('#header .search-contents .search-box .btn-close').click(function(){
        $('#header .nav-wrap .search-contents').removeClass('active');
    });

    // 검색창열였을때 메뉴 호버시 검색창닫힘
    /*$('#header .nav-wrap .nav > li').mouseover(function(){
        $('#header .nav-wrap .search-contents').removeClass('active');
    });*/

    // 스크롤 이벤트 - 헤더 고정
    $(window).scroll(function() {
        if ($(window).scrollTop() > 0) {
            $('#topbanner').css({ height: '0', opacity: '0' });
            $('#header').addClass('fixed');
        } else {
            $('#topbanner').css({ height: 'auto', opacity: '1' });
            $('#header').removeClass('fixed');
        }
    });

    // 상단으로 스크롤 버튼
    $('.scroll-top-wrap button').on('click', function() {
        $('html, body').animate({
            scrollTop: 0
        }, 500); // 500ms 동안 부드럽게 스크롤
    });

    // 모바일 메뉴 열기
    $('#header .nav-wrap .btn-menu').click(function(){
        $('.menu-popup-wrap').fadeIn();
        $('html, body').css({ 'overflow': 'hidden', 'height': '100vh' });
    });

    // 모바일 메뉴 닫기
    $('.menu-popup-wrap .top-wrap .btn-close').click(function(){
        $('.menu-popup-wrap').fadeOut();
        $('html, body').css({ 'overflow': 'auto', 'height': '100%' });
    });

    $('.menu-popup-wrap .search-wrap .search input').on('input', function() {
        $('#header .search-contents .search-box input').val($(this).val());
    });
    $('.menu-popup-wrap .search-wrap .search input').on('propertychange change keyup paste', function() {
        $('#header .search-contents .search-box input').val($(this).val());
    });


    
    // 메뉴 list 아코디언
    $('.menu-popup-wrap .menu-list-wrap .menu-1depth > a').click(function(){
        if (!$(this).hasClass('link')) {
            if ($(this).parent().hasClass('active')) {
                $(this).parent().removeClass('active');
                $(this).next().slideUp();
            } else {
                $('.menu-popup-wrap .menu-list-wrap .menu-1depth').removeClass('active');
                $('.menu-popup-wrap .menu-list-wrap .menu-2depth').slideUp();
                $(this).parent().addClass('active');
                $(this).next().slideDown();
            }
        }
    });

    // 상단으로 스크롤 버튼
    $('.scroll-top-wrap button').on('click', function() {
        $('html, body').animate({
            scrollTop: 0
        }, 500); // 500ms 동안 부드럽게 스크롤
    });

    // 헤더 검색창 placeholder 변경
    $('.menu-popup-wrap .search-wrap .search input').attr('placeholder', '검색어를 입력하세요.');

});


document.addEventListener("DOMContentLoaded", function () {
    // 다찾다 검색 파인더
    const sfinderMenu = document.querySelector('.side-sfinder-wrap');
    const sfinderOpen = document.querySelectorAll('.side-sfinder-open, .btn-smart-finder');
    const sfinderClose = document.querySelector('.side-sfinder-close');
    const sfinderOverlay = document.querySelector('.side-overlay');

    const sfinderScroll_off = () => {
        document.documentElement.classList.add('no-scroll');
        document.body.classList.add('no-scroll');
    };

    const sfinderScroll_on = () => {
        document.documentElement.classList.remove('no-scroll');
        document.body.classList.remove('no-scroll');
    };

    const openfinderMenu = (e) => {
        sfinderMenu?.classList.add('active');
        sfinderOverlay?.classList.add('active');
        sfinderScroll_off();
    };

    const closefinderMenu = () => {
        sfinderMenu?.classList.remove('active');
        sfinderOverlay?.classList.remove('active');
        sfinderScroll_on();
    };

    // 여러 버튼 이벤트 처리
    sfinderOpen.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openfinderMenu();
        });
    });

    sfinderClose?.addEventListener('click', closefinderMenu);
    sfinderOverlay?.addEventListener('click', closefinderMenu);

    const toggleOnClick = (selector) => {
        document.querySelectorAll(selector).forEach(el =>
            el?.addEventListener('click', () => el.classList.toggle('on'))
        );
    };

    toggleOnClick('.side-sfinder-wrap .finder-options');
    toggleOnClick('.side-sfinder-wrap .option-title');
});

// 상단 타이틀 변경
function changeNaviTitleText(newText) {
    const naviTitleElement = document.querySelector('.navi-title span');
    if (naviTitleElement) {
        naviTitleElement.textContent = newText;
    }
}












