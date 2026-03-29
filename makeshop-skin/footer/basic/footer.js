$(function(){
    // 헤더 고객센터 링크연결
    if ($('#linkCenter').text().trim() !== '') {
        $('#btnCenter').attr('href', $('#linkCenter').text());
    } else {
        $('#btnCenter').hide();
    }
});
