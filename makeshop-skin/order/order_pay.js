// 모바일 상단
$('.navi-title span').text('주문서');
$('.navi-btns .basket').hide();

// 주소 변경
$(".btn-change").click(function(e) {
    e.preventDefault();
    
    $(this).parents('.order-info-simple').addClass('active');
    $(this).parents('.order-info-simple').siblings('.order-info-detail').addClass('active');
});

// 주문상품 토글
$('.goods .order-title').click(function() {
    $(this).toggleClass('active');
    $(this).siblings('.product-wrap , .product-count , .provider-title').toggle();
});

// 주문상품 갯수
setTimeout(function(){
    $('.goods').each(function(){
        var prdQty = $(this).find('.product-list').length;
        
        $('.product-count .qty').text(prdQty);
    });
},300);

// 쿠폰사용 취소 버튼 보이기
$('#coupon .btn-primary').click(function() {
    if($('#coupon input[name="selected_coupon"]:checked').length > 0) {
      $('#order .coupon_cancel').show();
    }
});

// 쿠폰사용 취소 버튼 숨기기
$('#order .coupon_cancel').click(function() {
  setTimeout(function() {
    if(!$('input[name="couponnum"]', 'form[name="form1"]').val()) {
      $('#order .coupon_cancel').hide();
    }
  }, 100);
});

// 해외배송 선택 시 과거 국내 배송지 숨기기
$('#mk_ems_overseas_label').click(function() {
    if ($('#mk_ems_overseas').is(':checked') === true) {
        $(".korea-radio-addr").hide();
    }
});
$('#mk_ems_kor_label').click(function() {
    $(".korea-radio-addr").show();
});

// 장바구니 쿠폰 적용 list show/hide
$('#order .coupon-content dl dd .fa').click(function(){
	if ( $(this).hasClass('fa-angle-up') ){
		$(this).toggleClass('fa-angle-down');
	}else{
		$(this).toggleClass('fa-angle-up');
	}
	$(this).parents('dl').siblings('dl').toggle();	
});

// 결제수단 더보기
$(document).on("click",".c-more",function(){
  if($(this).parent().next(".pay-list").is(":visible")){
      $(this).parent("div").next(".pay-list").hide();
      $(this).removeClass("on");
  }else{
      $(this).parent().next(".pay-list").show();
      $(this).addClass("on");
  }
});

$(document).ready(function(){
    // 샵페이 미등록 PC 구조 변경
    $('.name-phone').contents().each(function() {
        if (this.nodeType === 1 && this.tagName.toLowerCase() === 'strong') {
            const $strong = $(this);
            const $input = $strong.next('input');

            if ($input.length) {
                $strong.add($input).wrapAll('<div class="field-input"></div>');
            }
        }
    });


    // 샵페이 슬라이드
    $(window).on('load', function() {
      if (typeof Swiper != 'undefined') {

        const initSwiper = () => {

          // --- 카드 슬라이더 ---
          if ($('.myCard:visible').length) {
            const cardSlider = $('.myCard .swiper-slide').length;

            if (cardSlider <= 1) {
              $('.shoppayC-control').hide();
            } else {
              $('.shoppayC-control').show();
            }

            new Swiper(".myCard", {
              slidesPerView: 'auto',
              spaceBetween: 10,
              centeredSlides: true,
              slideToClickedSlide: true,
              navigation: {
                nextEl: '.shoppayC-control .control-next',
                prevEl: '.shoppayC-control .control-prev'
              },
            });
          }

          // --- 계좌 슬라이더 ---
          if ($('.myBank:visible').length) {
            const bankSlider = $('.myBank .swiper-slide').length;

            if (bankSlider <= 1) {
              $('.shoppayB-control').hide();
            } else {
              $('.shoppayB-control').show();
            }

            new Swiper(".myBank", {
              slidesPerView: 'auto',
              spaceBetween: 10,
              centeredSlides: true,
              slideToClickedSlide: true,
              navigation: {
                nextEl: '.shoppayB-control .control-next',
                prevEl: '.shoppayB-control .control-prev'
              },
            });
          }
        };

        setTimeout(initSwiper, 100);
      }
      
      $('.shoppay-msg').parents().siblings('.shoppay-btn').hide();
      $('.shoppay-startC , .shoppay-startB').siblings('.shoppay-btn').hide();
    });
    
    // 샵페이 - 선택 Swiper 실행
    $('.pay_icon.shoppayb , .pay_icon.shoppayc').on('click', function () {
        setTimeout(() => {
            $(window).trigger('load');   // initSwiper 실행
        }, 50);
    });

    // 샵페이 - 개인정보 수집 동의 내용 열기/닫기
    $('.agree-box .toggle-agree').html('열기<em></em>');
    $('.agree-box .toggle-agree').click(function(){
        $(this).toggleClass('close');
        if($(this).hasClass('close')) $(this).html('열기<em></em>');
        else $(this).html('닫기<em></em>');
        $(this).parents('.agree-box').find('.toggle-cnts').toggle();
    });

    // 샵페이 - 개인정보 수집 동의 체크박스
    $(".chk-all").click(function() {
        if($(this).is(":checked")) $(this).parents('.agree-box').find(".toggle-cnts input[type=checkbox]").prop("checked", true);
        else $(this).parents('.agree-box').find(".toggle-cnts input[type=checkbox]").prop("checked", false);
    });
    $("input[type=checkbox]").click(function() {
        var total = $(this).parents('.agree-box').find(".toggle-cnts input[type=checkbox]").length;
        var checked = $(this).parents('.agree-box').find(".toggle-cnts input[type=checkbox]:checked").length;

        if(total != checked) $(this).parents('.agree-box').find(".chk-all").prop("checked", false);
        else $(this).parents('.agree-box').find(".chk-all").prop("checked", true); 
    });

    // 모바일 주소록
    if (typeof is_useable_addrbook != 'undefined') {
       if (is_useable_addrbook == '') { 
         $('.btn-adr-layer').text('배송지 목록');
         $('.btn-adr-layer').width('67px');
       }
    }

});

// 모바일 주소록
$('.btn-adr-layer').click(function() {
    setTimeout(function() {
       $('.btn-black.btn-apply-addrbook').prop('href','#none');
          if ($('#tab_addrbook').is(':visible')) {
             $('#contact_multi_del_past').hide();
             $('#contact_close_black').hide();
          } else {
             $('#contact_multi_del_past').show();
             $('#contact_close_black').show();
             $("input:radio[name='place']:radio[value='A']").prop('checked', true); 
             addrclick();
          }
     }, 30);
     addrbook_focus();
});
    
$('#tab_addrbook').click(function() {
   addrbook_focus();
});
    
$('#tab_past').click(function() {
   addrbook_focus();
});

function addrbook_focus () {
   setTimeout(function() {
        $('.btn-black.btn-apply-addrbook').prop('href','#none');
        $('.btn-adr-layer').focus();
   }, 500);
}

// 당일배송가능지역찾기 팝업 열기 닫기
$('.btn-delivery-area').click(function(){
	$('#delivery-area').show();
});

$('#delivery-area .close').click(function(){
	$('#delivery-area').hide();
});

$('input[name="address_search_quick"]').keypress(function(e) {
    if (e.keyCode == 13) {
        mo_pop_quickdeli();
        return false;
    }
});

// 선물하기 카드 슬라이드
if ($('.card-thumb').length > 0) { 
    var thumbSwiper = new CowaveSwiper(".card-tab .cowave-swiper", {
        spaceBetween: 4,
        slidesPerView: 4,
        watchSlidesProgress: true,
        navigation: {
            nextEl: ".card-tab .card-next",
            prevEl: ".card-tab .card-prev",
        },
        breakpoints: {
            768: {
                slidesPerView: 4,
            },
            0: {
                slidesPerView: 3,
            }
        }
    });
}

if ($('.card-img-slider').length > 0) {
    var mainSwiper = new CowaveSwiper(".card-img-slider.cowave-swiper", {
        spaceBetween: 4,
        thumbs: {
          swiper: thumbSwiper
        }
    });
}

// 선물하기 메세지
var _presentMsg = $('#present_message');

$(".presentMsgSelect").change(function(){
    var _thisVal = $(this).val();
    if ( _thisVal == "presentMsgSelf") {
        _thisVal = '';
    }
     _presentMsg.val(_thisVal);
    if (typeof MS_CHK_DELIMSG_LENGTH === 'function') {
        MS_CHK_DELIMSG_LENGTH();
    }
});
 
if ($('.gift-card .card-tab a').length > 0) {
    $('.gift-card .card-tab a').on('click', function() {
        if ($(this).find('img').length > 0) {
            var card_design_arr = $(this).find('img').attr('src').split('/');
            $("input[name='present_design']").val(card_design_arr[card_design_arr.length - 1]);
        }
    });
    var card_num = 0;
    $('.gift-card .card-tab a').each(function() {
        $(this).attr('data-slide-index', card_num);
        card_num++;
    });
}

// 결제수단 UI 변경
$(function () {
    const initialIndex = $('input[name="radio_paymethod"]:checked').closest('.pay-box').index();
    showPaymentInfoByIndex(initialIndex);

    $('.pay-box .pay-tit').on('click', function () {
        $('.pay-box .pay-tit').removeClass('active');
        $(this).addClass('active');

        const $radio = $(this).find('input[type="radio"]');
        $radio.prop('checked', true);

        const selectedIndex = $(this).closest('.pay-box').index();
        showPaymentInfoByIndex(selectedIndex);
        updateCouponDisplay();
    });

    function showPaymentInfoByIndex(index) {
        $('.payment-info.pay_desc').hide();
        $('.payment-info.pay_desc').eq(index).show();
    }

    // ── 네이버페이 결제형 전용 모드 ──
    var payMethod = sessionStorage.getItem('pc21_pay_method');

    if (payMethod === 'naverpay') {
        // 일회성 플래그이므로 즉시 제거
        sessionStorage.removeItem('pc21_pay_method');

        var naverPayIndex = -1;

        // 네이버페이 외 결제수단 숨기기
        $('.pay-method .pay-box').each(function(index) {
            var payIcon = $(this).find('.pay_icon');
            if (payIcon.hasClass('npay') || payIcon.hasClass('NPAY') ||
                payIcon.attr('data-option') === 'npay') {
                // 네이버페이 항목 → 표시 유지
                naverPayIndex = index;
            } else {
                // 네이버페이 외 → 숨기기
                $(this).hide();
            }
        });

        // 네이버페이 자동 선택
        if (naverPayIndex >= 0) {
            var $naverBox = $('.pay-method .pay-box').eq(naverPayIndex);
            var $radio = $naverBox.find('input[type="radio"]');
            if ($radio.length) {
                $radio.prop('checked', true);
            }
            // 활성 스타일 적용
            $('.pay-box .pay-tit').removeClass('active');
            $naverBox.find('.pay-tit').addClass('active');
            // 하단 결제 안내 영역도 네이버페이만 표시
            showPaymentInfoByIndex(naverPayIndex);
        }

        // 결제수단 하단 안내 중 네이버페이 외 숨기기 (class 기반 보조)
        $('.payment-info.pay_desc').each(function() {
            if (!$(this).hasClass('npay') && !$(this).hasClass('NPAY') &&
                $(this).attr('data-option') !== 'npay') {
                $(this).hide();
            }
        });

        console.log('네이버페이 결제형 모드 활성화');
    }
});

// 결제방법 혜택
$(window).on('load', function() {
    $('.payment-info').each(function(index) {
        const $paymentInfo = $(this);

        const hasTextSpan = $paymentInfo.find('b span').filter(function() {
            return $.trim($(this).text()) !== '';
        }).length > 0;

        if (hasTextSpan) {
            const $benefit = $('.pay-method .pay_icon .benefit-text').eq(index);
            if ($benefit.length && !$benefit.hasClass('on')) {
                $benefit.addClass('on');
            }
        }
    });
});




// 증빙신청에 따른 계좌 노출
$('.pay-box').on('click', function() {
  if ($('#evidence').css('display') === 'none') {
    $('.lst-order').hide();
  } else {
    $('.lst-order').show();
  }
});

// 무통장입금
$('.MK_bank_select_list , .MS_input_select.sel_basic').appendTo('.no-bank td');

// 환불계좌
$('#refund_account').attr('placeholder','환불계좌');

// 할인내역
$('.total-discount').click(function() {
    $(this).siblings('.discount-info').toggle();
    $(this).find('dt').toggleClass('on');
});

$('.discount-info img').click(function() {
    $(this).parents('.discount-info').hide();
});


// 주문 추가 정보
$('.add-info textarea').parent().addClass('field');

// 스마트쿠폰
$('.btn-coupon , .cart-coupon , #smart-coupon').click(function(){
    setTimeout(function(){
        const inputs = document.querySelectorAll('#smart-coupon input');

        inputs.forEach(input => {
            const li = input.closest('li');
            if (!li) return;

            if (input.checked) {
                li.classList.add('active');
            } else {
                li.classList.remove('active');
            }
        });
    }, 100);
});

// 쿠폰 적용 텍스트
$(document).on("click", ".coupon_apply", function() {
  setTimeout(function() {
      updateCouponDisplay();
  }, 50); 
});

function updateCouponDisplay() {
    $(".btn-coupon").each(function() {
      var $btn = $(this);
      var $txt1 = $btn.find(".txt1");
      var $txt2Parent = $btn.find(".txt2").parent();

      if ($txt2Parent.css("display") === "inline") {
        $txt1.hide();
      } else {
        $txt1.show();
      }
    });
}

// 간단가입 동의
$('#simple_join_agree #chkwrap li a').addClass('btn btn-gray btn-xs');

// 총 배송비
$('.delivery-toggle').click(function(){
    $(this).toggleClass('on');
    $('.add-delivery-price').toggle();
});

// 추가 주문 정보
document.querySelectorAll('.add-info input[type="checkbox"]').forEach(input => {
  const label = document.querySelector(`label[for="${input.id}"]`);
  if (label) {
    const wrapper = document.createElement("div");
    wrapper.className = "check-form";

    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    wrapper.appendChild(label);
  }
});

// 스마트픽업
$('.info-pickup .pick-name').on('click', function(e){
    e.stopPropagation();

    $('.MS_layer_smartpickup').not($(this).find('.MS_layer_smartpickup')).hide();

    $(this).find('.MS_layer_smartpickup').toggle();
});

$(document).on('click', function(){
    $('.MS_layer_smartpickup').hide();
});

$('.MS_layer_smartpickup').on('click', function(e){
    e.stopPropagation();
});



// 반응형 구조 변경
function handleReserveTextRelocation() {
  const isMobile = window.matchMedia("(max-width: 767.98px)").matches;

  document.querySelectorAll("tr").forEach(function(row) {
    const productInfo = row.querySelector(".product-info");
    const reserveCell = row.querySelector(".reserve-price");

    const reserveText = row.querySelector(".reserve-text");
    if (!reserveText || !productInfo || !reserveCell) return;

    if (isMobile) {
      // 모바일
      if (!productInfo.contains(reserveText)) {
        productInfo.appendChild(reserveText);
      }
    } else {
      // PC/태블릿
      if (!reserveCell.contains(reserveText)) {
        reserveCell.appendChild(reserveText);
      }
    }
  });
}

handleReserveTextRelocation();

window.addEventListener("resize", handleReserveTextRelocation);