function get_main_list(_t_name, _page, _element, _page_html, _row) {
    if ($(_element).length > 0) {
        $.ajax({
            url: '/m/product_list.action.html?r=' + Math.random(),
            type: 'GET',
            dataType: 'json',
            data: {
                action_mode: 'GET_MAIN_PRODUCT_LIST',
                tag_name: _t_name,
                page_id : get_page_id(),
                page: _page
            },
            success: function(res) {

                var dom = $('<div>').html(res.html);
                if ($('ul.items:only-child', $(_element)).length == 0) {
                    $(_element).append($('<ul class="items"></ul>'));
                }
                $('ul.items', _element).append($('ul.items', dom).html());

                if (res.is_page_end == true) {
                    $('.' + _page_html).hide();
                } else {
                    _page++;
                    $('.' + _page_html + ' > a').prop('href', "javascript:get_main_list('"+_t_name+"', " + _page + ", '" + _element + "', '" + _page_html + "', '" + _row + "');");
                }
                dom = null;
            }
        });
    }
}


$(function() {
    get_main_list('block_special_product', 1, '.MK_block_special_product', 'btn-special_product', '1'); //스페셜 상품
    get_main_list('block_recmd_product', 1, '.MK_block_recmd_product', 'btn-recmd_product', '1');  //추천 상품
    get_main_list('block_new_product', 1, '.MK_block_new_product', 'btn-new_product', '1');  //신규상품
    get_main_list('block_add1_product', 1, '.MK_block_add1_product', 'btn-add1_product', '1');  //추가상품1
    get_main_list('block_add2_product', 1, '.MK_block_add2_product', 'btn-add2_product', '1');  //추가상품2
    get_main_list('block_add3_product', 1, '.MK_block_add3_product', 'btn-add3_product', '1');  //추가상품3
    get_main_list('block_add4_product', 1, '.MK_block_add4_product', 'btn-add4_product', '1');  //추가상품4
    get_main_list('block_add5_product', 1, '.MK_block_aunction(){
    var mainSwiepr = new mySwiper(".main-banner", {
        pagination: {
            el: ".swiper-pagination",
            type: "fraction",
            renderFraction: function(currentClass, totalClass) {
                return '<span class="' + currentClass + '"></span>' +
                    '<span class="' + totalClass + '"></span>';
            }
        },
        autoplay: {
            delay: 3000,
            disableOnInteraction: false,
        },
        loop: true,
        navigation: {
            nextEl: ".main-banner .swiper-button-next",
            prevEl: ".main-banner .swiper-button-prev",
        },
    });

    var categorySwiper = new mySwiper(".category-swiper", {
        slidesPerView: 1.2,
        spaceBetween: 15,
        loop: true,
        pagination: {
            el: '.category-swiper .swiper-pagination',
            clickable: true,
        },
        autoplay: {
            delay: 3000,
            disableOnInteraction: false,
        },
        breakpoints: {
            1024: {
                slidesPerView: 3.3,
                spaceBetween: 30,
                pagination: {
                    el: '.category-swiper .swiper-pagination',
                    clickable: true,
                },
                autoplay: {
                    delay: 3000,
                    disableOnInteraction: false,
                },
            },
            768: {
                slidesPerView: 3,
                spaceBetween: 20,
                slidesPerGroup: 1,
                loop: false,
                pagination: {
                    el: '.category-swiper .swiper-pagination',
                    clickable: true,
                },
                autoplay: {
                    delay: 3000,
                    disableOnInteraction: false,
                },
            }
        }

    });


    /*탭메뉴*/
    $('#section02 .tab-nav-wrap ul li button').click(function() {
        // 클릭한 버튼의 인덱스 가져오기
        var index = $(this).parent().ind클래스 제거
        $('#section02 .tab-nav-wrap ul li').removeClass('active');
        $('#section02 .tab-content-wrap .tab-content').removeClass('active');

        // 클릭한 탭과 해당 컨텐츠에 active 클래스 추가
        $(this).parent().addClass('active');
        $('#section02 .tab-content-wrap .tab-content').eq(index).addClass('active');


        // 클릭한 요소의 위치로 스크롤 이동
        var tabNavWrap = $('.tab-nav-wrap');
        var tabPosition = $(this).parent().position().left;

        // 부드럽게 해당 위치로 스크롤
        tabNavWrap.animate({
            scrollLeft: tabPosition
        }, 500, 'swing');

    });


});