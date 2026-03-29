// 모바일 상단
$('.navi-title span').text('정기배송 신청 완료');
$('.navi-btns .basket').hide();

// arrow
$('#subs-complete .fa').click(function(e){
	e.preventDefault();
    $(this).toggleClass('active');

	if ( $(this).hasClass('btn-angle') ){ // 전체 할인금액 화살표, 신청상품 정보 열기/닫기 화살표
		$(this.hash).toggle();
	}
});

// 주문상품 토글
$('.goods .order-title').click(function() {
    $(this).toggleClass('active');
    $(this).siblings('.product-wrap , .product-count , .provider-title').toggle();
});

// 주문상품 갯수
setTimeout(function(){
    $('.goods').each(function(){
        var prdQty = $(this).find('.order-list li').length;
        
        $('.product-count .qty').text(prdQty);
    });
},300);