// 상단 타이틀 변경
changeNaviTitleText('고객 사은품');

// 영역 토글
$('.btn-dropdown').on('click', function(e) {
    e.preventDefault();
    $(this).toggleClass('closed');
    $(this).parent('.gift-header').siblings('section').slideToggle(300);
});
// 전체 열기
$('.btns-all .all-open').on('click', function(e) {
    e.preventDefault();
    $('.gift-header .btn-dropdown').removeClass('closed');
    $('.gift-header').siblings('section').slideDown(300);
});
// 전체 닫기
$('.btns-all .all-close').on('click', function(e) {
    e.preventDefault();
    $('.gift-header .btn-dropdown').addClass('closed');
    $('.gift-header').siblings('section').slideUp(300);
});
// 레이어 열기
$('.gift-layer-open').on('click', function(e) {
    e.preventDefault();
    $(this).parents('section').siblings('.' + $(this).attr('data')).show();
});
// 레이어 닫기
$('.gift-layer-close').on('click', function(e) {
    e.preventDefault();
    $(this).parents('.layer-gift-style').hide();
});