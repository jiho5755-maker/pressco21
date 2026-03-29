// 모바일 상단
$('.navi-title span').text('정기배송 신청서');
$('.navi-btns .basket').hide();

// 결제카드 변경 on/off
$('.layer-editcard').click(function(e) {
	e.preventDefault();
    $(this.hash).toggle();
});

// arrow
$('#subs-order .fa').click(function(e){
	e.preventDefault();
    $(this).toggleClass('active');

	if ( $(this).hasClass('btn-angle') ){
		$(this.hash).toggle();
	}
});
// 레이어 열기 (공통)
$('.subs-layer-open').click(function(e){
    e.preventDefault();
    $(this.hash).show();
});
// 레이어 팝업 닫기 (공통)
$('.layer-close').click(function(e){
	e.preventDefault();
	$(this.hash).hide();
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

// 할인내역
$('.dc-help').click(function() {
    $(this).parent().siblings('.discount-info').show();
});

$('.discount-info img').click(function() {
    $(this).parents('.discount-info').hide();
});

