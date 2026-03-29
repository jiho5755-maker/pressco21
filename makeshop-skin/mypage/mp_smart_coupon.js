// 상단 타이틀 변경
changeNaviTitleText('쿠폰내역');

// 탭 메뉴
$('.tab-navi--links li a').click(function(e) {
  $(this).parent().addClass('active').siblings().removeClass('active');
});

// 입력폼 class 추가
$(document).ajaxComplete(() => {
    $('select:not(.cw-select-box)').addClass('cw-select-box');
});

// placeholder 설정
const couponNum = document.querySelector('input[name="serial_number"]');
couponNum.placeholder = '시리얼 코드를 입력해주세요.';

// 결제수단 더보기
$(document).on("click", ".btn-payment-more", function(e){
    e.preventDefault();

    var $btn  = $(this);
    var $wrap = $btn.closest(".coupon--payment");
    var $list = $wrap.find(".pay-list").first();

    $btn.toggleClass("active");
    $list.toggle();
});

// border 제거
$(document).ajaxComplete(function(event, xhr, settings) {
    if (settings.url.includes('get_coupon_list')) {
       $('.coupon--date').each(function() {
            var cleaned = $(this).text().replace(/\s|\u00A0/g, '').trim();
            if (cleaned === '' || cleaned === '""') {
                $(this).css('border-top', 'none');
                $(this).css('margin-top', 0);
                $(this).css('padding-top', 0);
            }
       });
    }
});

