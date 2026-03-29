// 상단 타이틀 변경
changeNaviTitleText('주문 교환 요청');

// 옵션 선택시 active 클래스 추가
document.addEventListener('click', function(e) {
    const clicked = e.target.closest('.option-check-md');
    if (!clicked) return;
    
    const soldout = clicked.querySelector('.soldout');
    if (soldout) return;
    
    const checkbox = clicked.querySelector('input[name="hy_option[]"]');
    if (checkbox != null) {
        if (checkbox.checked == true) {
            checkbox.checked = false;
        } else {
            checkbox.checked = true;
        }
    }
    
    if (clicked.classList.contains('active')) {
        clicked.classList.remove('active');
        return;
    }

    clicked.classList.add('active');
});