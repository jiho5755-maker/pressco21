(function($){
    $(function(){
        // 주문조회 레이어 열기
		$('.layer-open').on('click', function(e){
			e.preventDefault();
			$(this.hash).find('.modal-wrap').css('display','flex');
                        $('#myorderlayer').show();
		});
		// 주문조회 레이어 닫기
		$('.layer-close').on('click', function(e){
			e.preventDefault();
			$(this.hash).find('.modal-wrap').hide();
		});
        // 주문조회 레이어 탭
		$('#myorderlayer .tab li a').on('click', function(e) {
			e.preventDefault();
			$(this).parent().addClass('now').siblings().removeClass('now');
		});
        // 주문번호 삭제
        var $ipt = $('#ordernuminput');
        var $clearIpt = $('#ordernumclear');
        $clearIpt.on('click', function() {
            $ipt.val('').focus();
        });
    });
})(jQuery);