// 사은품 종류
$('input[name=gift_select]').on('click', function(e) {
    if ($(this).val() == 'P') {
        $('#MS_gift_product').show();
        $('#MS_gift_reserve').hide();
        $('#MS_gift_discount').hide();
    }
    if ($(this).val() == 'R') {
        $('#MS_gift_product').hide();
        $('#MS_gift_reserve').show();
        $('#MS_gift_discount').hide();
    }
    if ($(this).val() == 'D') {
        $('#MS_gift_product').hide();
        $('#MS_gift_reserve').hide();
        $('#MS_gift_discount').show();
    }
});
// 선택 옵션 레이어 토글
$('.gift-tooltip-toggle').on('click', function(e) {
    e.preventDefault();
    $(this).siblings('.gift-tooltip').toggle();
});
// 사은품 전체보기 노출
(function($) {
    $(function() {
        const giftSection = $('.gift-section.scroll');
        const giftMore = $('.gift-more');
        if (giftSection.length && giftMore.length) {
            if (giftSection[0].scrollHeight > giftSection[0].clientHeight) {
                giftMore.show();
            } else {
                giftMore.hide();
            }
        }
    });
})(jQuery);
// 사은품 전체보기 동작
$('.gift-more .btn').on('click', function(e) {
    e.preventDefault();
    $('.gift-more').hide();
    $('.gift-section').removeClass('scroll');
});