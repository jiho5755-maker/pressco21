// 상단 타이틀 변경
changeNaviTitleText('주문/배송 조회');

// 레이어 팝업 열기
$(document).on('click', '.pop-layer-open', function(e){
    e.preventDefault();
    $(this).next('.layer-delivery-wrap').css('display', 'flex').hide().fadeIn();
});
// 레이어 팝업 닫기
$(document).on('click', '.btn-pop-close', function(e){
    e.preventDefault();
    $('.layer-delivery-wrap').fadeOut();
});

// 입력폼 class 추가
const dateInput = document.querySelectorAll('.cw-date input');
dateInput.forEach(textfield => {
    textfield.classList.add('cw-textfield','sm');
});

// 기간조회 버튼 활성화
document.querySelectorAll(".btn-date a").forEach(function(btn) {
   btn.addEventListener("click", function() {
       document.querySelectorAll(".btn-date a").forEach(function(other) {
           other.classList.remove("btn-primary");
           other.classList.add("btn-gray");
       });
       this.classList.remove("btn-gray");
       this.classList.add("btn-primary");
   });
});
