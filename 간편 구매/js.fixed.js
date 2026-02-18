// ============================================================================
// 간편 구매 - 수정본 (IIFE + null 체크 + 성능 최적화 적용)
// 수정 내용:
// 1. IIFE 패턴으로 전체 감싸서 전역 변수 오염 방지
// 2. null 체크 추가로 런타임 에러 방지
// 3. 스크롤 이벤트 requestAnimationFrame으로 최적화
// 4. MutationObserver 범위를 .goods-infos로 축소
// 5. 변수명 camelCase로 통일 (goods_swiper → goodsSwiper)
// 6. Clipboard API로 현대화 (폴백 포함)
// ============================================================================

(function() {
    'use strict';

    // 상단 타이틀 변경
    changeNaviTitleText('상품상세');

    // 제품정보 마지막 라인 지우기 (null 체크 추가)
    var groups = document.querySelectorAll('.infos--group');
    if (groups.length > 0) {
        groups[groups.length - 1].classList.add('none-border');
    }

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

            var target = document.querySelector(this.getAttribute('href'));
            target.classList.add('active');
            //var headerOffset = document.querySelector('header.sticky').offsetHeight;
            var elementPosition = target.getBoundingClientRect().top + window.pageYOffset;
            var offsetPosition = elementPosition;
            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
        });
    });

    // 상품 상세 - 다중 이미지 노출
    var thumbsImages = document.querySelectorAll('.mo-ver .goods-imgs--thumbs img');
    var goodsSwiper = new CowaveSwiper('.mo-ver .goods-imgs--thumbs .cowave-swiper', {
        slidesPerView: 1
    });

    function updateSlideCount() {
        var swiperNumElement = document.querySelector('.mo-ver .goods-imgs--thumbs .swiper-num');
        if (swiperNumElement) {
            swiperNumElement.querySelector('strong').textContent = goodsSwiper.activeIndex + 1; // 현재 슬라이드 번호
            swiperNumElement.querySelector('span').textContent = thumbsImages.length; // 다중 이미지 수
        } else {
            console.warn('swiper-num');
        }
    }

    updateSlideCount();
    goodsSwiper.on('slideChange', updateSlideCount);

    // 관련상품
    var relationSwiper = new CowaveSwiper('.relation-wrapper.cowave-swiper', {
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
        var prevButton = document.querySelector('.relation-btn .prev');
        var nextButton = document.querySelector('.relation-btn .next');

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
        var stickyBtns = document.querySelector('.sticky-btns');
        var optionClose = document.querySelector('.option-layer-close');
        var optionLayer = document.querySelector('.goods-infos .option-layer');
        var goodsBtns = document.querySelector('.goods-infos .goods--btns');

        if (!stickyBtns) return;
        var buyBtn = stickyBtns.querySelector('.buy-btn');
        if (!buyBtn || !optionClose) return;
        if (!goodsBtns) return;

        // 스크롤 sticky-btns 노출 (requestAnimationFrame으로 최적화)
        var ticking = false;
        window.addEventListener('scroll', function() {
            if (!ticking) {
                window.requestAnimationFrame(function() {
                    var scrollPosition = window.scrollY || window.pageYOffset;
                    var goodsBtnsPosition = goodsBtns.offsetTop;
                    if (scrollPosition > goodsBtnsPosition) {
                        stickyBtns.style.display = 'flex';
                    } else {
                        stickyBtns.style.display = 'none';
                    }
                    ticking = false;
                });
                ticking = true;
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
    var btnViewElements = document.querySelectorAll('.btn-view');
    btnViewElements.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var nextElement = this.nextElementSibling;
            if (nextElement) {
                nextElement.classList.add('active');
            }
        });
    });

    // 레이어 팝업 닫기
    var btnCloseElements = document.querySelectorAll('.btn-modal-close');
    btnCloseElements.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var parentElement = this.parentElement;
            while (parentElement) {
                parentElement.classList.remove('active');
                parentElement = parentElement.parentElement;
            }
        });
    });

    // 링크 공유하기 (Clipboard API + 폴백)
    var copyButton = document.getElementById("copyToClipboard");
    if (copyButton) {
        copyButton.addEventListener("click", function (e) {
            e.preventDefault();

            var url = location.href;

            // 현대적인 Clipboard API 사용 (HTTPS 환경에서만 작동)
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(function() {
                    alert("URL이 복사되었습니다.");
                }).catch(function() {
                    // Clipboard API 실패 시 폴백
                    fallbackCopyToClipboard(url);
                });
            } else {
                // Clipboard API 미지원 브라우저에서는 폴백
                fallbackCopyToClipboard(url);
            }
        });
    }

    // 폴백 함수: execCommand 방식
    function fallbackCopyToClipboard(text) {
        var textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.top = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();

        try {
            document.execCommand("copy");
            alert("URL이 복사되었습니다.");
        } catch (err) {
            alert("복사에 실패했습니다.");
        }

        document.body.removeChild(textarea);
    }


    document.querySelectorAll('.MS_HybridOptItem').forEach(function(option) {
        option.addEventListener('click', function(e) {
            if (this.querySelector('input[name="hy_option[]"]') != null) {
                this.querySelector('input[name="hy_option[]"]').click();
            }
        });
    });

    // 옵션값 비었을때 css 제거
    function checkInfosGroups() {
        document.querySelectorAll('.infos--group').forEach(function(el) {
            var content = el.innerHTML.trim();
            el.style.display = content === '' ? 'none' : '';
        });
    }

    checkInfosGroups();

    // 새로 추가된 옵션 체크 (MutationObserver 범위를 .goods-infos로 축소)
    var goodsInfosContainer = document.querySelector('.goods-infos');
    if (goodsInfosContainer) {
        var observer = new MutationObserver(checkInfosGroups);
        observer.observe(goodsInfosContainer, { childList: true, subtree: true });
    } else {
        // .goods-infos가 없으면 폴백으로 document.body 감시 (원본 동작 유지)
        console.warn('.goods-infos 컨테이너를 찾을 수 없어 document.body를 감시합니다.');
        var observer = new MutationObserver(checkInfosGroups);
        observer.observe(document.body, { childList: true, subtree: true });
    }


    // 간편구매 버튼 클릭 시 카카오페이 실행
    document.addEventListener("DOMContentLoaded", function() {
        var easyPurchaseBtn = document.querySelector('.btn-easy-purchase');

        if (easyPurchaseBtn) {
            easyPurchaseBtn.addEventListener('click', function(e) {
                e.preventDefault();

                // 카카오페이 버튼 찾기
                var kakaopayContainer = document.querySelector('#kakaopay_order_btn, .easyPayBtnWrap [id*="kakaopay"]');

                if (kakaopayContainer) {
                    // 카카오페이 버튼의 실제 링크나 버튼 찾기
                    var kakaopayButton = kakaopayContainer.querySelector('a, button, [onclick]');

                    if (kakaopayButton) {
                        // 카카오페이 버튼 클릭 실행
                        kakaopayButton.click();
                        console.log('카카오페이 결제 실행');
                    } else {
                        alert('카카오페이 결제가 활성화되지 않았습니다.\n메이크샵 관리자에서 카카오페이를 활성화해주세요.');
                        console.warn('카카오페이 버튼을 찾을 수 없습니다.');
                    }
                } else {
                    alert('카카오페이 결제가 활성화되지 않았습니다.\n메이크샵 관리자에서 카카오페이를 활성화해주세요.');
                    console.warn('카카오페이 컨테이너를 찾을 수 없습니다.');
                }
            });
        }
    });

})();
