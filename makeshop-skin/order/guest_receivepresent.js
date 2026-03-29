// 상단 타이틀 변경
changeNaviTitleText('선물 받기');

// 옵션변경 팝업 관련
document.addEventListener('click', function (e) {
    const openBtn = e.target.closest('.pop-layer-open');
    const closeBtn = e.target.closest('.btn-pop-close');
    const optionBtn = e.target.closest('.btn-opt');

    // 레이어 팝업 열기
    if (openBtn) {
        e.preventDefault();
        const postWrap = openBtn.closest('.post');
        const popup = postWrap?.nextElementSibling;

        if (popup && popup.classList.contains('modal-wrap')) {
            popup.style.display = 'flex';
            popup.style.opacity = 0;
            popup.style.transition = 'opacity 0.3s ease';
            requestAnimationFrame(() => popup.style.opacity = 1);
        }
    }

    // 레이어 팝업 닫기
    if (closeBtn) {
        e.preventDefault();
        const popup = closeBtn.closest('.modal-wrap');
        if (popup) {
            popup.style.opacity = 0;
            setTimeout(() => popup.style.display = 'none', 300);
        }
    }
    
    // 옵션변경 버튼 클릭 시 레이어 열기
    if (optionBtn) {
        const popup = document.querySelector('.layer-option-edit');

        if (popup) {
            popup.style.display = 'flex';
            popup.style.opacity = 0;
            popup.style.transition = 'opacity 0.3s ease';
            requestAnimationFrame(() => popup.style.opacity = 1);
        }
    }
});

// 옵션 변경 버튼에 클래스 추가
document.querySelectorAll('.btn-opt').forEach(function(el) {
    el.classList.add('btn', 'btn-gray', 'btn-xs');
});

// 옵션 선택시 active 클래스 추가
document.querySelectorAll('.info-content .option-text, .info-content .option-check, .info-content .option-check-md').forEach(function(option) {
    option.addEventListener('click', function(e) {
        e.preventDefault();
        option.parentNode.querySelectorAll('.option-text, .option-check, .option-check-md').forEach(function(el) {
            el.classList.remove('active');
        });

        this.classList.add('active');
    });
});