// 상단 타이틀 변경
changeNaviTitleText('주문 반품 요청');

document.addEventListener('DOMContentLoaded', function () {
    // 팝업 열기
    document.querySelectorAll('.pop-layer-open').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();

            const target = this.getAttribute('data-target');
            const popup = document.querySelector('[data-popup="' + target + '"]');

            if (popup) {
                popup.classList.add('active');
            }
        });
    });

    // 팝업 닫기 (닫기 버튼만)
    document.querySelectorAll('.btn-pop-close, .btn-modal-close').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();

            this.closest('.modal-wrap').classList.remove('active');
        });
    });

    // 상품수량 class 추가
    document.querySelectorAll('.goods-qty select').forEach(function(el) {
        el.classList.add('sm');
    });

    // btn-view-more 클릭 시
    document.querySelectorAll('.payinfo-wrap .btn-view-more').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const target = btn.parentElement.nextElementSibling;

            if (btn.classList.contains('active')) {
                btn.classList.remove('active');
                if (target) target.style.display = 'none';
            } else {
                btn.classList.add('active');
                if (target) target.style.display = 'flex';
            }
        });
    });
});