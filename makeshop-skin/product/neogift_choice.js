// 상단 타이틀 변경
changeNaviTitleText('사은품 선택');

// 사은품 종류
$('input[name=gift_select]').on('click', function(e) {
    if ($(this).val() == 'P') {
        $('#MS_gift_product').show();
        $('#MS_gift_reserve').hide();
    }
    if ($(this).val() == 'R') {
        $('#MS_gift_product').hide();
        $('#MS_gift_reserve').show();
    }
});
// 선택 옵션 레이어 토글
$('.gift-tooltip-toggle').on('click', function(e) {
    e.preventDefault();
    $(this).siblings('.gift-tooltip').toggle();
});