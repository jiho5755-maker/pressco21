// 상단 타이틀 변경
changeNaviTitleText('상품상세');

// 제품정보 마지막 라인 지우기
let groups = document.querySelectorAll('.infos--group');
groups[groups.length - 1].classList.add('none-border');

// 옵션 선택시 active 클래스 추가
/*
document.querySelectorAll('.info-content .option-text, .info-content .option-check, .info-content .option-check-md').forEach(function(option) {
    option.addEventListener('click', function(e) {
        e.preventDefault();
        option.parentNode.querySelectorAll('.option-text, .option-check, .option-check-md').forEach(function(el) {
            el.classList.remove('active');
        });

        this.classList.add('active');
    });
});
*/

// 탭영역 처리
document.querySelectorAll('.tab-navi--links a').forEach(function(link) {
    link.addEventListener('click', function(e) {
        e.preventDefault();

        const target = document.querySelector(this.getAttribute('href'));
        target.classList.add('active');
        //let headerOffset = document.querySelector('header.sticky').offsetHeight;
        let elementPosition = target.getBoundingClientRect().top + window.pageYOffset;
        let offsetPosition = elementPosition;
        window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
        });
    });
});

// 상품 상세 - 다중 이미지 노출
const thumbsImages = document.querySelectorAll('.mo-ver .goods-imgs--thumbs img');
const goods_swiper = new CowaveSwiper('.mo-ver .goods-imgs--thumbs .cowave-swiper', {
    slidesPerView: 1
});
function updateSlideCount() {
    const swiperNumElement = document.querySelector('.mo-ver .goods-imgs--thumbs .swiper-num');
    if (swiperNumElement) {
        swiperNumElement.querySelector('strong').textContent = goods_swiper.activeIndex + 1; // 현재 슬라이드 번호
        swiperNumElement.querySelector('span').textContent = thumbsImages.length; // 다중 이미지 수
    } else {
        console.warn('swiper-num');
    }
}
updateSlideCount();
goods_swiper.on('slideChange', updateSlideCount);

// 관련상품
const relation_swiper = new CowaveSwiper('.relation-wrapper.cowave-swiper', {
    slidesPerView: 2.35,
    spaceBetween: 8,
    breakpoints: {
        767.98: {
            slidesPerView: 4,
            spaceBetween: 16
        }
    },
    navigation: {
        nextEl: '.relation-btn .next',
        prevEl: '.relation-btn .prev',
    },
    scrollbar: {
        el: '.cowave-swiper-scrollbar',
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

function updateNavigationButtons(swiper) {
    const prevButton = document.querySelector('.relation-btn .prev');
    const nextButton = document.querySelector('.relation-btn .next');

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

// 구매하기 클릭시 옵션 레이어 열기/닫기
document.addEventListener("DOMContentLoaded", function() {
    const stickyBtns = document.querySelector('.sticky-btns');
    const optionClose = document.querySelector('.option-layer-close');
    const optionLayer = document.querySelector('.goods-infos .option-layer');
    const goodsBtns = document.querySelector('.goods--btns');

    if (!stickyBtns) return;
    const buyBtn = stickyBtns.querySelector('.buy-btn');
    if (!buyBtn || !optionClose) return;

    // 스크롤 sticky-btns 노출
    window.addEventListener('scroll', function() {
        const scrollPosition = window.scrollY || window.pageYOffset;
        const goodsBtnsPosition = goodsBtns.offsetTop;
        if (scrollPosition > goodsBtnsPosition) {
            stickyBtns.style.display = 'flex';
        } else {
            stickyBtns.style.display = 'none';
        }
    });

    // 옵션 레이어 열기
    buyBtn.addEventListener('click', function(e) {
        e.preventDefault();
        document.body.classList.add('option-active');
        optionLayer.classList.add('option-layer--fixed');
    });

    // 옵션 레이어 닫기
    optionClose.addEventListener('click', function(e) {
        e.preventDefault();
        document.body.classList.remove('option-active');
        optionLayer.classList.remove('option-layer--fixed');
        
        if (location.hash === '#none') {
            history.replaceState(null, null, location.pathname + location.search);
        }
        stickyBtns.style.display = 'flex';
    });
});


// 레이어 팝업 열기
const btnViewElements = document.querySelectorAll('.btn-view');
btnViewElements.forEach(btn => {
    btn.addEventListener('click', function() {
        const nextElement = this.nextElementSibling;
        if (nextElement) {
            nextElement.classList.add('active');
        }
    });
});

// 레이어 팝업 닫기
const btnCloseElements = document.querySelectorAll('.btn-modal-close');
btnCloseElements.forEach(btn => {
    btn.addEventListener('click', function() {
        let parentElement = this.parentElement;
        while (parentElement) {
            parentElement.classList.remove('active');
            parentElement = parentElement.parentElement;
        }
    });
});

// 링크 공유하기
document.getElementById("copyToClipboard").addEventListener("click", function (e) {
    e.preventDefault();

    const textarea = document.createElement("textarea");
    textarea.value = location.href;
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();

    try {
        document.execCommand("copy");
        alert("URL이 복사되었습니다.");
    } catch {
        alert("복사에 실패했습니다.");
    }

    document.body.removeChild(textarea);
});


document.querySelectorAll('.MS_HybridOptItem').forEach(function(option) {
    option.addEventListener('click', function(e) {
        if (this.querySelector('input[name="hy_option[]"]') != null) {
            this.querySelector('input[name="hy_option[]"]').click();
        }
    });
});

// 옵션값 비었을때 css 제거
function checkInfosGroups() {
  document.querySelectorAll('.infos--group').forEach(el => {
    const content = el.innerHTML.trim();
    el.style.display = content === '' ? 'none' : '';
  });
}

checkInfosGroups();

// 새로 추가된 옵션 체크
const observer = new MutationObserver(checkInfosGroups);
observer.observe(document.body, { childList: true, subtree: true });

