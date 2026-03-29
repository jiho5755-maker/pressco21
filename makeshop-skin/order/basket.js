// 상단 타이틀 변경
changeNaviTitleText('장바구니');

// 무료배송 추천상품
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

// 연관 상품
const recmd2 = new CowaveSwiper('.recmd2', {
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
        nextEl: '.recmd2 .next',
        prevEl: '.recmd2 .prev',
    },
    scrollbar: {
        el: '.recmd2 .cowave-swiper-scrollbar',
        draggable: true
    },
    on: {
        init: function () {
            updateNavigationButtons(this, '.recmd2');
        },
        slideChange: function () {
            updateNavigationButtons(this, '.recmd2');
        }
    }
});

// 관심 상품
const recmd3 = new CowaveSwiper('.recmd3', {
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
        nextEl: '.recmd3 .next',
        prevEl: '.recmd3 .prev',
    },
    scrollbar: {
        el: '.recmd3 .cowave-swiper-scrollbar',
        draggable: true
    },
    on: {
        init: function () {
            updateNavigationButtons(this, '.recmd3');
        },
        slideChange: function () {
            updateNavigationButtons(this, '.recmd3');
        }
    }
});

// 장바구니 추천상품
const recmd4 = new CowaveSwiper('.recmd4', {
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
        nextEl: '.recmd4 .next',
        prevEl: '.recmd4 .prev',
    },
    scrollbar: {
        el: '.recmd4 .cowave-swiper-scrollbar',
        draggable: true
    },
    on: {
        init: function () {
            updateNavigationButtons(this, '.recmd4');
        },
        slideChange: function () {
            updateNavigationButtons(this, '.recmd4');
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

// 사이드 장바구니 닫기
$('.layer_popup_close').on('click', function(){
    if($(top.document).find('.menu_slide').length > 0){
        $(top.document).find('.menu_slide').removeClass('open');
        $(top.document).find('.dimmed').removeClass('active');
        $(top.document).find('body').removeClass('open');
    }else{
        location.href = '/m';
    }
});

// 탭 이동
document.querySelectorAll('.cw-tabs a').forEach(tab => {
    tab.addEventListener('click', function(e) {
        document.querySelectorAll('.cw-tabs li').forEach(li => li.classList.remove('active'));
        this.parentElement.classList.add('active');
        window.location.href = this.href;
    });
});
