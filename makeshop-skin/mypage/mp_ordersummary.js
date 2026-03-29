// 상단 타이틀 변경
changeNaviTitleText('주문상세 내역');

document.addEventListener('DOMContentLoaded', function () {
    // 배송지 정보 노출
    document.querySelectorAll('.btn-toggle').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const detail = this.closest('.order-delivery')?.nextElementSibling;
            if (detail?.classList.contains('delivery-detail')) {
                this.classList.toggle('active');
                detail.style.display = (detail.style.display === 'block') ? 'none' : 'block';
            }
        });
    });
    
    // 주문 배송 현황 이미지 활성화
    document.querySelectorAll('.order-step li').forEach(function (li) {
        const img = li.querySelector('.icon img');
        if (!img) return;

        const src = img.getAttribute('src');

        if (li.classList.contains('is-active')) {
            if (!src.includes('_on')) {
                const newSrc = src.replace('.svg', '_on.svg');
                img.setAttribute('src', newSrc);
            }
        } else {
            if (src.includes('_on')) {
                const newSrc = src.replace('_on.svg', '.svg');
                img.setAttribute('src', newSrc);
            }
        }
    });

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
    document.querySelectorAll('.btn-pop-close').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();

            this.closest('.modal-wrap').classList.remove('active');
        });
    });

    // li.first 클릭 시
    const firstLis = document.querySelectorAll('.payinfo-wrap li.first');

    firstLis.forEach(function (li) {
        const siblings = Array.from(li.parentElement.children).filter(el => el !== li);

        // 초기 상태: active 있으면 보이기
        if (li.classList.contains('active')) {
            siblings.forEach(el => el.style.display = 'block');
        } else {
            siblings.forEach(el => el.style.display = 'none');
        }

        // 클릭 시 toggle
        li.addEventListener('click', function () {
            const isActive = li.classList.contains('active');

            if (isActive) {
                li.classList.remove('active');
                siblings.forEach(el => el.style.display = 'none');
            } else {
                li.classList.add('active');
                siblings.forEach(el => el.style.display = 'block');
            }
        });
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