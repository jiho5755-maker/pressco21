$('.cw-reviewlist a.link-view').on('click', function(e) {
    e.preventDefault();
    $(this).parents("div.post").toggleClass('on').next('div.reply').toggleClass('on');
});
$('.reply .btns a.btn-modify').on('click', function(e) {
    if ($('input[name="hname"]').length > 0) {
        $('#review-write .modal-wrap').css('display', 'flex');
    }
});