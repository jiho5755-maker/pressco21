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


    /* ========================================
       핀치 줌 (모바일 상품 이미지)
       ======================================== */
    function initPinchZoom() {
        var container = document.querySelector('.mo-ver .goods-imgs--thumbs');
        if (!container || !('ontouchstart' in window)) return;

        var state = { scale: 1, lastDist: 0, translateX: 0, translateY: 0, startX: 0, startY: 0, lastTap: 0 };

        function getActiveImg() {
            var activeSlide = container.querySelector('.cowave-swiper-slide[class*="active"] img');
            return activeSlide || container.querySelector('.cowave-swiper-slide img');
        }

        function applyTransform(img) {
            if (!img) return;
            var tx = state.translateX / state.scale;
            var ty = state.translateY / state.scale;
            img.style.transform = 'scale(' + state.scale + ') translate(' + tx + 'px, ' + ty + 'px)';
            img.style.transformOrigin = 'center center';
        }

        function resetZoom(img) {
            state.scale = 1;
            state.translateX = 0;
            state.translateY = 0;
            if (img) {
                img.style.transform = '';
                img.style.transformOrigin = '';
            }
            container.classList.remove('is-zoomed');
        }

        container.addEventListener('touchstart', function(e) {
            var img = getActiveImg();
            if (!img) return;

            // 더블탭 감지
            var now = Date.now();
            if (now - state.lastTap < 300 && e.touches.length === 1) {
                e.preventDefault();
                if (state.scale > 1) {
                    resetZoom(img);
                } else {
                    state.scale = 2;
                    container.classList.add('is-zoomed');
                    applyTransform(img);
                }
            }
            state.lastTap = now;

            // 핀치 시작
            if (e.touches.length === 2) {
                e.preventDefault();
                var dx = e.touches[0].clientX - e.touches[1].clientX;
                var dy = e.touches[0].clientY - e.touches[1].clientY;
                state.lastDist = Math.sqrt(dx * dx + dy * dy);
            } else if (e.touches.length === 1 && state.scale > 1) {
                // 패닝 시작
                state.startX = e.touches[0].clientX - state.translateX;
                state.startY = e.touches[0].clientY - state.translateY;
            }
        }, { passive: false });

        container.addEventListener('touchmove', function(e) {
            var img = getActiveImg();
            if (!img) return;

            if (e.touches.length === 2) {
                e.preventDefault();
                var dx = e.touches[0].clientX - e.touches[1].clientX;
                var dy = e.touches[0].clientY - e.touches[1].clientY;
                var dist = Math.sqrt(dx * dx + dy * dy);
                state.scale = Math.max(1, Math.min(4, state.scale * (dist / state.lastDist)));
                state.lastDist = dist;
                if (state.scale > 1) container.classList.add('is-zoomed');
                applyTransform(img);
            } else if (e.touches.length === 1 && state.scale > 1) {
                e.preventDefault();
                state.translateX = e.touches[0].clientX - state.startX;
                state.translateY = e.touches[0].clientY - state.startY;
                applyTransform(img);
            }
        }, { passive: false });

        container.addEventListener('touchend', function() {
            if (state.scale <= 1.05) {
                resetZoom(getActiveImg());
            }
        });

        // Swiper 슬라이드 변경 시 줌 초기화
        if (goodsSwiper && goodsSwiper.on) {
            goodsSwiper.on('slideChange', function() {
                resetZoom(getActiveImg());
            });
        }
    }

    /* ========================================
       최근 본 상품 (localStorage)
       ======================================== */
    var RECENT_KEY = 'pc21_recent';
    var RECENT_MAX = 10;

    function initRecentProducts() {
        var titleEl = document.querySelector('#productDetail .goods--title');
        var imgEl = document.querySelector('#productDetail .goods-imgs--view img');
        var priceEl = document.querySelector('#productDetail .goods--price-wrap .price strong');
        if (!titleEl) return;

        var current = {
            name: titleEl.textContent.trim(),
            image: imgEl ? imgEl.getAttribute('src') : '',
            price: priceEl ? priceEl.textContent.trim() : '',
            url: location.pathname + location.search
        };

        var products = [];
        try {
            var stored = localStorage.getItem(RECENT_KEY);
            if (stored) products = JSON.parse(stored);
        } catch (e) { /* localStorage 접근 불가 시 무시 */ }

        // 중복 제거 후 앞에 추가
        products = products.filter(function(p) { return p.url !== current.url; });
        products.unshift(current);
        if (products.length > RECENT_MAX) products = products.slice(0, RECENT_MAX);

        try {
            localStorage.setItem(RECENT_KEY, JSON.stringify(products));
        } catch (e) { /* localStorage 용량 초과 시 무시 */ }

        // 현재 상품 제외하고 렌더링
        var others = products.slice(1);
        if (others.length > 0) renderRecentWidget(others);
    }

    function renderRecentWidget(products) {
        var container = document.getElementById('recentProductsWrap');
        if (!container || products.length === 0) return;

        var html = '';
        for (var i = 0; i < products.length; i++) {
            var p = products[i];
            html +=
                '<a href="' + escapeAttr(p.url) + '" class="recent-item">' +
                    '<div class="recent-img">' +
                        '<img src="' + escapeAttr(p.image) + '" alt="' + escapeAttr(p.name) + '" loading="lazy">' +
                    '</div>' +
                    '<p class="recent-name">' + escapeHTML(p.name) + '</p>' +
                    '<span class="recent-price">' + escapeHTML(p.price) + '원</span>' +
                '</a>';
        }
        container.innerHTML = html;
        container.closest('.recent-products').style.display = 'block';
    }

    /* ========================================
       리뷰 바로가기 앵커
       ======================================== */
    function initReviewAnchor() {
        // 탭 영역에서 리뷰 수 읽기
        var reviewTab = document.querySelector('.tab-navi--links li:nth-child(2) a em');
        var reviewCount = reviewTab ? reviewTab.textContent.replace(/[()]/g, '').trim() : '0';

        var anchor = document.getElementById('reviewAnchorBtn');
        if (!anchor) return;

        var countSpan = anchor.querySelector('.review-count');
        if (countSpan) countSpan.textContent = reviewCount;

        if (reviewCount === '0') {
            anchor.style.display = 'none';
            return;
        }

        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            var content2 = document.getElementById('content2');
            if (content2) {
                // 탭 활성화
                var tabLinks = document.querySelectorAll('.tab-navi--links li');
                tabLinks.forEach(function(li) { li.classList.remove('active'); });
                if (tabLinks[1]) tabLinks[1].classList.add('active');

                content2.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    /* ========================================
       전환율 유도 배지
       ======================================== */
    function initViewBadge() {
        var badge = document.getElementById('viewCountBadge');
        if (!badge) return;

        var count = Math.floor(Math.random() * 31) + 15; // 15~45
        badge.querySelector('.badge-count').textContent = count;
        badge.style.display = 'inline-flex';
    }

    /* ========================================
       OG 메타태그 동적 삽입
       ======================================== */
    function initOGMeta() {
        var titleEl = document.querySelector('#productDetail .goods--title');
        var imgEl = document.querySelector('#productDetail .goods-imgs--view img');
        var priceEl = document.querySelector('#productDetail .goods--price-wrap .price strong');
        if (!titleEl) return;

        var ogTags = [
            { property: 'og:title', content: titleEl.textContent.trim() + ' | PRESSCO21' },
            { property: 'og:type', content: 'product' },
            { property: 'og:url', content: location.href },
            { property: 'og:image', content: imgEl ? imgEl.getAttribute('src') : '' },
            { property: 'og:description', content: titleEl.textContent.trim() + ' - PRESSCO21 압화/보존화 전문' }
        ];

        if (priceEl) {
            ogTags.push({ property: 'product:price:amount', content: priceEl.textContent.replace(/[^0-9]/g, '') });
            ogTags.push({ property: 'product:price:currency', content: 'KRW' });
        }

        for (var i = 0; i < ogTags.length; i++) {
            var existing = document.querySelector('meta[property="' + ogTags[i].property + '"]');
            if (!existing) {
                var meta = document.createElement('meta');
                meta.setAttribute('property', ogTags[i].property);
                meta.setAttribute('content', ogTags[i].content);
                document.head.appendChild(meta);
            }
        }

        // Twitter Card
        var twitterTags = [
            { name: 'twitter:card', content: 'summary_large_image' },
            { name: 'twitter:title', content: titleEl.textContent.trim() + ' | PRESSCO21' },
            { name: 'twitter:image', content: imgEl ? imgEl.getAttribute('src') : '' }
        ];
        for (var ti = 0; ti < twitterTags.length; ti++) {
            var tMeta = document.createElement('meta');
            tMeta.setAttribute('name', twitterTags[ti].name);
            tMeta.setAttribute('content', twitterTags[ti].content);
            document.head.appendChild(tMeta);
        }

        // Schema.org Product JSON-LD
        var productName = titleEl.textContent.trim();
        var productImage = imgEl ? imgEl.getAttribute('src') : '';
        var productPrice = priceEl ? priceEl.textContent.replace(/[^0-9]/g, '') : '0';

        var schema = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            'name': productName,
            'image': productImage,
            'brand': { '@type': 'Brand', 'name': 'PRESSCO21' },
            'offers': {
                '@type': 'Offer',
                'price': productPrice,
                'priceCurrency': 'KRW',
                'availability': 'https://schema.org/InStock',
                'url': location.href
            }
        };

        var schemaScript = document.createElement('script');
        schemaScript.type = 'application/ld+json';
        schemaScript.textContent = JSON.stringify(schema);
        document.head.appendChild(schemaScript);
    }

    /* ========================================
       유틸리티
       ======================================== */
    function escapeHTML(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function escapeAttr(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

        // 네이버페이 버튼 클릭 시 주문형/결제형 분기 처리
        var naverPayBtn = document.querySelector('.btn-naver-pay');

        if (naverPayBtn) {
            naverPayBtn.addEventListener('click', function(e) {
                e.preventDefault();

                // 회원 상태 확인 (헤더의 로그아웃 링크 존재 여부로 판별)
                var isLoggedIn = !!document.querySelector('a[href*="/exec/front/Member/logout"]');

                if (!isLoggedIn) {
                    // ── 비회원 → 주문형: 네이버페이 SDK 버튼 직접 실행 ──
                    var naverCheckout = document.querySelector('.naver-checkout');
                    var sdkButton = null;

                    if (naverCheckout) {
                        sdkButton = naverCheckout.querySelector('a, button, img[onclick], [onclick]');
                    }

                    // nhn_btn 영역도 탐색
                    if (!sdkButton) {
                        var nhnBtn = document.getElementById('nhn_btn');
                        if (nhnBtn) {
                            sdkButton = nhnBtn.querySelector('a, button, img[onclick], [onclick]');
                        }
                    }

                    if (sdkButton) {
                        sdkButton.click();
                        console.log('네이버페이 주문형 결제 실행 (비회원)');
                    } else {
                        alert('네이버페이 결제가 활성화되지 않았습니다.\n메이크샵 관리자에서 네이버페이를 활성화해주세요.');
                        console.warn('네이버페이 SDK 버튼을 찾을 수 없습니다.');
                    }
                } else {
                    // ── 회원 → 결제형: 주문서로 이동하되 네이버페이만 표시 ──
                    sessionStorage.setItem('pc21_pay_method', 'naverpay');

                    var orderUrl = naverPayBtn.getAttribute('data-order-url');
                    if (orderUrl && orderUrl !== '#none' && orderUrl !== '') {
                        window.location.href = orderUrl;
                    } else {
                        // 대체: 바로 구매하기 버튼의 URL 사용
                        var buyNowBtn = document.querySelector('.btn-buy-now');
                        if (buyNowBtn && buyNowBtn.href) {
                            window.location.href = buyNowBtn.href;
                        }
                    }
                    console.log('네이버페이 결제형 실행 (회원)');
                }
            });
        }
    });

    /* ========================================
       초기화: 새 기능
       ======================================== */
    document.addEventListener("DOMContentLoaded", function() {
        initPinchZoom();
        initRecentProducts();
        initReviewAnchor();
        initViewBadge();
        initOGMeta();
    });

})();
