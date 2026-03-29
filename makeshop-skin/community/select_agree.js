// 상단 타이틀 변경
changeNaviTitleText('추가 정보 동의 및 입력');

$(function() {
    $('.tab-wrap a').on('click', function(e) {
        e.preventDefault();
        $(this).toggleClass('on');
    });
});
