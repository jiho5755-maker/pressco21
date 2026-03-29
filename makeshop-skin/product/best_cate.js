// 상단 타이틀 변경
changeNaviTitleText('베스트 카테고리');

// 판매 순위 아이템
const rank_swiper = new CowaveSwiper('.rank-wrapper.cowave-swiper', {
    slidesPerView: 2.35,
    spaceBetween: 8,
    breakpoints: {
        767.98: {
            slidesPerView: 4,
            spaceBetween: 16
        }
    },
    navigation: {
        nextEl: '.rank-btn .next',
        prevEl: '.rank-btn .prev',
    },
    scrollbar: {
        el: '.rank-scrollbar',
        draggable: true
    },
    on: {
        init: function () {
            updateNavigationButtons(this);
        },
        slideChange: function () {
            updateNavigationButtons(this);
        }
    }
});

// 옵션보기
document.querySelectorAll('.prds--more .option-detail .opt-btn').forEach(btn => btn.onclick = () => btn.classList.toggle('on'));