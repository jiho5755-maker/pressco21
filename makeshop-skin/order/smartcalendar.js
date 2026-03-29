$(function () {
    // 스마트 캘린더(팝업) 일자 선택
    $('#smartCalendarPopup').on('click', '.date', function () {
        $('.calendar-dates .date a').removeClass('sc-now');
        $(this).find('a').addClass('sc-now');
    });
});