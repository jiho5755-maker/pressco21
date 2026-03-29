// 상단 타이틀 변경
changeNaviTitleText('장바구니');

const recmd1 = new CowaveSwiper('.recmd1', {
    slidesPerView: 2.35,
    spaceBetween: 8,
    breakpoints: {
        767.98: {
            slidesPerView: 4,
            spaceBetween: 16
        },
        991.98: {
            slidesPerView: 6,
            spaceBetween: 16
        }
    },
    navigation: {
        nextEl: '.recmd1 .next',
        prevEl: '.recmd1 .prev',
    },
    scrollbar: {
        el: '.recmd1 .cowave-swiper-scrollbar',
        draggable: true
    },
    on: {
        init: function () {
            updateNavigationButtons(this, '.recmd1');
        },
        slideChange: function () {
            updateNavigationButtons(this, '.recmd1');
        }
    }
});

function updateNavigationButtons(swiper, selector) {
    const prevButton = document.querySelector(`${selector} .prev`);
    const nextButton = document.querySelector(`${selector} .next`);

    if (swiper.isBeginning) {
        prevButton.classList.add('disable');
    } else {
        prevButton.classList.remove('disable');
    }

    if (swiper.isEnd) {
        nextButton.classList.add('disable');
    } else {
        nextButton.classList.remove('disable');
    }
}

// 탭
/*
document.querySelectorAll('.cw-tabs a').forEach(tab => {
    tab.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelectorAll('.cw-tabs li').forEach(li => li.classList.remove('active'));
        this.parentElement.classList.add('active');
         window.location.href = this.href;
    });
});
*/