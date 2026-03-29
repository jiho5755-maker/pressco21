var gap_cart_free = 0,
    total_delivery = 0,
    use_cart_free = 'N';
$('.display-cart-free').hide();

//장바구니 무료배송까지 남은 금액, 배송비 알아오는 ajax 
function cal_basket_chk(obj) {
    jQuery.ajax({
        type : 'POST',
        url : '/m/basket.html',
        dataType : 'json',
        async : true,
        data : { pop_cartfree : 'Y' },
        success : function(res) {
            if (res.RESULT !== true) {
                if (res.MSG.length > 0) {
                    alert(res.MSG);
                    location.reload();
                } else {
                    alert('상품 옵션이 변경되어 주문이 불가능한 상품은 제외합니다');
                }
            }
            // 총 금액 정보
            var total_data = res.TOTAL;

            //버전별로 사용가능한지 체크 
            var is_use_cart_free = total_data.is_use_cart_free;

            //장바구니에 담긴 금액
            var total_price_sell = total_data.total_price_sell;

            //카트프리 사용여부
            use_cart_free = total_data.use_cart_free;

            //배송비
            total_delivery = total_data.total_delivery;

            //무료배송까지 남은 금액
            gap_cart_free = total_data.gap_cart_free;

            if (use_cart_free == 'Y' && total_price_sell == 0) {
                //장바구니에 담긴게 없는 상태
                $(".cf-none").show();
            } else if (use_cart_free == 'Y' && total_delivery == 0 && (total_delivery <= 0 || gap_cart_free <= 0)) {
                //카트프리 사용하는데 무료배송 상태
                $(".cf-ok").show();
            } else if (use_cart_free == 'Y' && is_use_cart_free == true && total_delivery > 0 && gap_cart_free > 0) {
                //카트프리 사용 상태 
                $('#MK_cartfree_price').html(gap_cart_free + '원');
                get_cart_free_list();
                //카트프리 리스트 로드 
                $('.display-cart-free').show();
            } else {
                //카트프리 미사용 상태 
                $(".cf-no-use").show();
            }
        }, error : function() {
            alert('잠시 후 시도해주시기 바랍니다');
        }
    });
}

cal_basket_chk();

//통합옵션 카트프리 내부소스 
var cart_free_page = 1;
function get_cart_free_list() {
    (function($) {
        $.ajax({
            url: '/m/product_list.action.html?r=' + Math.random(),
            type: 'GET',
            dataType: 'json',
            data: {
                action_mode: 'get_cart_free_list',
                page: cart_free_page,
                gap_cart_free: gap_cart_free,
                from_page : 'pop_cartfree'
            },
            success: function(response) {
                // 현재 페이지 수
                if ($('#MS_current_page_cnt').length > 0) {
                    $('#MS_current_page_cnt').html(cart_free_page);
                }
                // 총 페이지 수
                if ($('#MS_total_page_cnt').length > 0) {
                    $('#MS_total_page_cnt').html(response.total_page_cnt);
                }
                $('#MS_cartfree_product').append(response.html);
                cart_free_page = response.next_page;
                if (response.is_page_end == true) {
                    $('#MS_cartfree_product_more').hide();
                }
            },
            error: function(XMLHttpRequest, textStatus, errorThrown) {
            }
        });
    })(jQuery);
}