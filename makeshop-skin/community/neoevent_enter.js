// 상단 타이틀 변경
changeNaviTitleText('응모 이벤트');

// 전체 선택/해제
$('.select-all').on('change', function() {
    $('.check-item').prop('checked', $(this).prop('checked'));
});
$('.check-item').on('change', function() {
    if ($('.check-item').length == $('.check-item:checked').length) {
        $('.select-all').prop('checked', true);
    } else {
        $('.select-all').prop('checked', false);
    }
});