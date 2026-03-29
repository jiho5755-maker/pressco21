// 상단 타이틀 변경
changeNaviTitleText('주문 취소 요청');

document.addEventListener('DOMContentLoaded', function () {
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