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

    function parsePriceText(text) {
        var value = String(text || '').replace(/[^\d]/g, '');
        return value ? parseInt(value, 10) : 0;
    }

    function formatPriceNumber(value) {
        return Number(value || 0).toLocaleString('ko-KR');
    }

    function formatDiscountRate(basePrice, salePrice) {
        if (!basePrice || !salePrice || salePrice >= basePrice) {
            return '';
        }
        var rate = ((basePrice - salePrice) / basePrice) * 100;
        var rounded = Math.round(rate * 10) / 10;
        if (Math.abs(rounded - Math.round(rounded)) < 0.05) {
            return String(Math.round(rounded)) + '%';
        }
        return rounded.toFixed(1) + '%';
    }

    function ensurePriceNode(priceBox, className) {
        var node = priceBox.querySelector('.' + className);
        if (node) {
            return node;
        }
        node = document.createElement('span');
        node.className = className;
        if (className === 'price' || className === 'original') {
            var strong = document.createElement('strong');
            node.appendChild(strong);
            node.appendChild(document.createTextNode('원'));
        }
        priceBox.appendChild(node);
        return node;
    }

    function isLoggedInDetail() {
        if (document.cookie.indexOf('logincon=1') !== -1) {
            return true;
        }
        return document.body && document.body.innerText.indexOf('로그아웃') !== -1;
    }

    function ensureGroupPriceCaption(priceWrap, priceBox, groupName) {
        var captionNode = priceWrap ? priceWrap.querySelector('.group-price-caption') : null;
        var captionStrongNode;
        var captionTextNode;
        if (!priceWrap || !priceBox || !groupName) {
            return;
        }
        priceBox.classList.add('has-usergroup-price');
        if (!captionNode) {
            captionNode = document.createElement('p');
            captionNode.className = 'group-price-caption';
            captionStrongNode = document.createElement('strong');
            captionTextNode = document.createTextNode('');
            captionNode.appendChild(captionStrongNode);
            captionNode.appendChild(captionTextNode);
            priceBox.insertAdjacentElement('afterend', captionNode);
        } else {
            captionStrongNode = captionNode.querySelector('strong');
            if (!captionStrongNode) {
                captionStrongNode = document.createElement('strong');
                captionNode.insertBefore(captionStrongNode, captionNode.firstChild);
            }
            captionTextNode = null;
            for (var i = 0; i < captionNode.childNodes.length; i += 1) {
                if (captionNode.childNodes[i].nodeType === Node.TEXT_NODE) {
                    captionTextNode = captionNode.childNodes[i];
                    break;
                }
            }
            if (!captionTextNode) {
                captionTextNode = document.createTextNode('');
                captionNode.appendChild(captionTextNode);
            }
        }
        captionStrongNode.textContent = groupName;
        captionTextNode.textContent = ' 적용가가 자동 반영되었습니다.';
    }

    function applyVisibleGroupPriceCaption() {
        var priceWrap = document.querySelector('.goods--price-wrap');
        var priceBox = priceWrap ? priceWrap.querySelector('.prices') : null;
        var groupNameEl = document.getElementById('pc21GroupNameRaw');
        var groupName = String(groupNameEl ? groupNameEl.textContent : '').trim();
        var saleNode = priceBox ? priceBox.querySelector('.price') : null;
        var baseNode = priceBox ? priceBox.querySelector('.original') : null;
        var salePrice = parsePriceText(saleNode ? saleNode.textContent : '');
        var basePrice = parsePriceText(baseNode ? baseNode.textContent : '');
        if (!salePrice || !basePrice || salePrice >= basePrice) {
            return;
        }
        if (!groupName && isLoggedInDetail()) {
            groupName = '회원등급';
        }
        ensureGroupPriceCaption(priceWrap, priceBox, groupName);
    }

    function applyGroupPriceDisplay() {
        var priceWrap = document.querySelector('.goods--price-wrap');
        var priceBox = priceWrap ? priceWrap.querySelector('.prices') : null;
        var groupPriceEl = document.getElementById('pc21GroupPriceRaw');
        var basePriceEl = document.getElementById('pc21BasePriceRaw');
        var groupNameEl = document.getElementById('pc21GroupNameRaw');
        var groupPrice = parsePriceText(groupPriceEl ? groupPriceEl.textContent : '');
        var basePrice = parsePriceText(basePriceEl ? basePriceEl.textContent : '');
        var groupName = String(groupNameEl ? groupNameEl.textContent : '').trim() || '강사회원';

        if (!priceWrap || !priceBox || !groupPrice || !basePrice || groupPrice >= basePrice) {
            return;
        }

        var discountLabel = formatDiscountRate(basePrice, groupPrice);
        var priceNode = ensurePriceNode(priceBox, 'price');
        var originalNode = ensurePriceNode(priceBox, 'original');
        var discountNode = ensurePriceNode(priceBox, 'discount');

        priceBox.classList.add('has-usergroup-price');

        if (priceNode.querySelector('strong')) {
            priceNode.querySelector('strong').textContent = formatPriceNumber(groupPrice);
        }
        if (originalNode.querySelector('strong')) {
            originalNode.querySelector('strong').textContent = formatPriceNumber(basePrice);
        }
        discountNode.textContent = discountLabel;

        ensureGroupPriceCaption(priceWrap, priceBox, groupName);
    }

    applyGroupPriceDisplay();
    applyVisibleGroupPriceCaption();

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
        // 판별 기준: SDK 버튼(btn_nhn 가상태그 렌더링 결과) 존재 여부
        //   - 비회원: MakeShop이 if_btn_nhn 조건 블록 안에 SDK 렌더링 → 주문형
        //   - 회원: if_btn_nhn 조건 블록 미렌더링 → SDK 없음 → 결제형
        var naverPayBtn = document.querySelector('.btn-naver-pay');

        if (naverPayBtn) {
            naverPayBtn.addEventListener('click', function(e) {
                e.preventDefault();

                // SDK 버튼 탐색 (비회원에게만 렌더링됨)
                var sdkButton = null;
                var naverCheckout = document.querySelector('.naver-checkout');
                if (naverCheckout) {
                    sdkButton = naverCheckout.querySelector('a, button, img[onclick], [onclick]');
                }
                if (!sdkButton) {
                    var nhnBtn = document.getElementById('nhn_btn');
                    if (nhnBtn) {
                        sdkButton = nhnBtn.querySelector('a, button, img[onclick], [onclick]');
                    }
                }

                if (sdkButton) {
                    // ── SDK 존재 → 비회원 → 주문형: 네이버페이 SDK 직접 실행 ──
                    sdkButton.click();
                    console.log('네이버페이 주문형 결제 실행 (비회원)');
                } else {
                    // ── SDK 없음 → 회원 → 결제형: 주문서로 이동, 네이버페이만 표시 ──
                    sessionStorage.setItem('pc21_pay_method', 'naverpay');

                    var orderUrl = naverPayBtn.getAttribute('data-order-url');
                    if (orderUrl && orderUrl !== '#none' && orderUrl !== '') {
                        window.location.href = orderUrl;
                    } else {
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


/* 2026-04-20: 상세 강사회원 누락가 정책맵 보정 */
(function() {
    'use strict';

    var PC21_MEMBER_PRICE_DATA = '184:1980:2200:10,369663:2400:2800:14,1155298:9000:10000:10,1156813:3600:4000:10,1156847:2250:2500:10,1156856:360:400:10,1156873:28800:32000:10,1156911:2700:3000:10,1156954:800:900:11,1156956:800:900:11,11602933:72000:80000:10,11602935:72000:80000:10,11602940:72000:80000:10,11602942:72000:80000:10,11602944:72000:80000:10,11602949:43200:48000:10,11602951:158400:176000:10,11602953:158400:176000:10,11602955:158400:176000:10,11602957:158400:176000:10,11602961:158400:176000:10,11602963:216000:240000:10,11602972:158400:176000:10,11602974:158400:176000:10,11602976:158400:176000:10,11602979:158400:176000:10,11602983:90000:100000:10,11602987:90000:100000:10,11602989:90000:100000:10,11602991:90000:100000:10,11602993:90000:100000:10,11604875:640:800:20,11604876:640:800:20,11604892:180000:200000:10,11604894:180000:200000:10,11604896:180000:200000:10,11604900:180000:200000:10,11604903:180000:200000:10'
    + ',11604905:234000:260000:10,11609118:2700:3000:10,11616033:2250:2500:10,11616078:1800:2000:10,11616080:1800:2000:10,11616091:7000:7400:5,11616096:6000:7000:14,11616098:4750:5300:10,11616100:4750:5300:10,11618350:13500:15000:10,11626244:5400:6000:10,11631486:2250:2500:10,11631754:720:800:10,11631766:2150:2400:10,11631768:3600:4000:10,11644305:2250:2500:10,11644311:1400:1500:7,11646470:31500:35000:10,11652054:2700:3000:10,11663225:2700:3000:10,11668144:10800:12000:10,11674390:4250:4500:6,11678267:1530:1700:10,11682944:3300:3700:11,11682949:1200:1500:20,11687103:5400:6000:10,11687139:1150:1300:12,11692421:3600:4000:10,11697016:4050:4500:10,11697020:3600:4000:10,11697023:4050:4500:10,11697030:3600:4000:10,11697032:3600:4000:10,11697034:3600:4000:10,11697068:10800:12000:10,11697091:2500:2800:11,11697122:95000:100000:5,11697154:450:500:10,11697162:3600:4000:10,11697164:4050:4500:10,11697166:900'
    + '0:10000:10,11697170:9000:10000:10,11697172:9000:10000:10,11697197:5600:7000:20,11697199:5600:7000:20,11697201:5600:7000:20,11697204:4500:5000:10,11697208:4500:5000:10,11697210:4500:5000:10,11697214:2800:3500:20,11697247:3150:3500:10,11697249:3150:3500:10,11697262:5650:6300:10,11697270:4050:4500:10,11697275:4500:5000:10,11697280:3600:4000:10,11697282:4500:5000:10,11697284:4050:4500:10,11697286:3150:3500:10,11697291:3600:4000:10,11697294:4050:4500:10,11697297:4050:4500:10,11697302:3600:4000:10,11697308:3600:4000:10,11697322:3600:4000:10,11697324:4500:5000:10,11697326:4050:4500:10,11697328:4950:5500:10,11697330:3600:4000:10,11697332:2700:3000:10,11697334:4500:5000:10,11697336:5400:6000:10,11697353:1200:1500:20,11697404:2700:3000:10,11697408:2700:3000:10,11697410:2700:3000:10,11697412:2700:3000:10,11697414:2700:3000:10,11697416:2700:3000:10,11697476:4500:5000:10,11697549:3200:4000:20,1169755'
    + '2:4000:5000:20,11697554:4000:5000:20,11697574:3600:4000:10,11697576:20700:23000:10,11697599:4000:4400:9,11697785:2250:2500:10,11697847:1200:1500:20,11697867:5600:7000:20,11697875:5400:6000:10,11697887:1200:1300:8,11697911:2700:3000:10,11697933:1050:1200:12,11697938:4950:5500:10,11697948:14400:16000:10,11697955:4000:4400:9,11697957:4000:4400:9,11697959:4000:4400:9,11697961:4000:4400:9,11697963:4000:4400:9,11697965:4000:4400:9,11697967:4000:4400:9,11697970:4000:4400:9,11697974:4000:4400:9,11697982:4000:4400:9,11697986:4000:4400:9,11697988:4000:4400:9,11697999:4750:5000:5,11698006:900:1000:10,11698023:3600:4000:10,11698027:3600:4000:10,11698029:3600:4000:10,11698031:3600:4000:10,11698033:3600:4000:10,11698035:3600:4000:10,11698037:3600:4000:10,11698040:3600:4000:10,11698042:3600:4000:10,11698060:5850:6500:10,11698062:5850:6500:10,11698104:5400:6000:10,11698111:3200:4000:20,11698113:4800:600'
    + '0:20,11698119:3600:4000:10,11698121:3600:4000:10,11698125:4000:5000:20,11698134:2800:3600:22,11698155:9000:10000:10,11698209:21600:24000:10,11698282:4300:4800:10,11698310:63000:70000:10,11698337:11700:13000:10,11698341:11700:13000:10,11698343:11700:13000:10,11698347:4400:4900:10,11698387:5400:6000:10,11698459:4800:5400:11,11698462:900:1000:10,11698537:2840:3150:10,11698540:4050:4500:10,11698542:4050:4500:10,11698544:4050:4500:10,11698546:4050:4500:10,11698548:4050:4500:10,11698550:4050:4500:10,11698552:4050:4500:10,11698554:4050:4500:10,11698560:3600:4000:10,11698564:3600:4000:10,11698566:3600:4000:10,11698569:3600:4000:10,11698571:3600:4000:10,11698574:3600:4000:10,11698605:3000:3400:12,11698607:3000:3400:12,11698609:3000:3400:12,11698611:3000:3400:12,11698613:3000:3400:12,11698615:3000:3400:12,11698617:2400:2700:11,11698619:3000:3400:12,11698622:3000:3400:12,11698624:3000:3400:12,11698'
    + '626:3000:3400:12,11698628:3000:3400:12,11698643:3200:4000:20,11698645:3200:4000:20,11698647:3200:4000:20,11698649:3200:4000:20,11698651:3200:4000:20,11698653:3200:4000:20,11698655:3200:4000:20,11698666:2800:3500:20,11698702:3150:3500:10,11698704:3150:3500:10,11698706:3150:3500:10,11698708:3150:3500:10,11698710:3150:3500:10,11698712:3150:3500:10,11698714:3150:3500:10,11698716:3150:3500:10,11698720:8200:8600:5,11698736:13500:15000:10,11698766:2700:3200:16,11698807:400:450:11,11698813:142500:150000:5,11698815:256500:270000:5,11698828:2400:3000:20,11698851:4000:4400:9,11698855:4000:4400:9,11698859:4000:4400:9,11698861:4000:4400:9,11698865:4000:4400:9,11698873:4000:4400:9,11698899:4050:4500:10,11698907:4500:5000:10,11698909:4500:5000:10,11698911:4500:5000:10,11699042:3500:3900:10,11699044:4900:5500:11,11699046:2700:3000:10,11699093:7650:8500:10,11699110:54000:60000:10,11699157:4950:5500:10,11'
    + '699159:5850:6500:10,11699178:18000:20000:10,11699183:18000:20000:10,11699187:18000:20000:10,11699192:18000:20000:10,11699194:18000:20000:10,11699196:18000:20000:10,11699220:7200:8000:10,11699228:5400:6000:10,11699231:2700:3000:10,11699261:1050:1200:12,11699278:5400:6000:10,11699280:5400:6000:10,11699282:3150:3500:10,11699286:5400:6000:10,11699288:5400:6000:10,11699300:10800:12000:10,11699302:10800:12000:10,11699304:10800:12000:10,11699306:10800:12000:10,11699308:10800:12000:10,11699310:10800:12000:10,11699312:10800:12000:10,11699331:1200:1300:8,11699386:1710:1900:10,11699407:3600:4000:10,11699409:3600:4000:10,11699411:3600:4000:10,11699413:3600:4000:10,11699415:3600:4000:10,11699417:3600:4000:10,11699419:3600:4000:10,11699421:3600:4000:10,11699423:3600:4000:10,11699426:14400:16000:10,11699456:8500:9500:11,11699486:600:700:14,11699494:3600:4000:10,11699496:3600:4000:10,11699498:6750:7500:'
    + '10,11699500:5400:6000:10,11699504:4500:5000:10,11699506:4500:5000:10,11699508:4500:5000:10,11699524:4400:5500:20,11699526:4400:5500:20,11699528:4400:5500:20,11699530:4400:5500:20,11699532:4400:5500:20,11699534:4000:4400:9,11699536:4000:4400:9,11699538:4000:4400:9,11699540:4000:4400:9,11699542:4000:4400:9,11699546:4000:4400:9,11699548:4000:4400:9,11699550:4000:4400:9,11699552:4000:4400:9,11699554:4000:4400:9,11699556:4000:4400:9,11699558:4000:4400:9,11699560:4000:4400:9,11699562:4000:4400:9,11699564:4000:4400:9,11699566:4000:4400:9,11699570:4000:4400:9,11699572:4000:4400:9,11699574:4000:4400:9,11699576:4000:4400:9,11699578:4000:4400:9,11699580:4000:4400:9,11699582:4000:4400:9,11699584:4000:4400:9,11699586:4000:4400:9,11699588:4000:4400:9,11699590:4000:4400:9,11699592:2800:3100:10,11699594:2050:2300:11,11699603:4850:5400:10,11699625:13500:15000:10,11699627:13500:15000:10,11699629:13500:150'
    + '00:10,11699631:10400:13000:20,11699633:13500:15000:10,11699638:7650:8500:10,11699641:7650:8500:10,11699643:7650:8500:10,11699645:7650:8500:10,11699647:7650:8500:10,11699649:7650:8500:10,11699651:7650:8500:10,11699653:7650:8500:10,11699656:450:500:10,11699670:600:700:14,11699682:3600:4000:10,11699684:4500:5000:10,11699694:56700:63000:10,11699777:3150:3500:10,11699789:4500:5000:10,11699791:4000:4400:9,11699809:4050:4500:10,11699827:3600:4000:10,11699833:3150:3500:10,11699835:3150:3500:10,11699892:2700:3000:10,11699894:3150:3500:10,11699896:3600:4000:10,11699898:2700:3000:10,11699900:3600:4000:10,11699902:2700:3000:10,11699904:2700:3000:10,11699908:4500:5000:10,11699911:4500:5000:10,11699913:4500:5000:10,11699915:4500:5000:10,11699917:4500:5000:10,11699919:4500:5000:10,11699921:4500:5000:10,11699923:4500:5000:10,11699925:4500:5000:10,11699927:7650:8500:10,11699929:7650:8500:10,11699954:4500'
    + ':5000:10,11699956:5400:6000:10,11699959:4500:5000:10,11699961:4500:5000:10,11699963:4500:5000:10,11699967:4500:5000:10,11699969:4500:5000:10,11699991:3600:4000:10,11699994:8000:8900:10,11699996:3150:3500:10,11699999:7200:8000:10,11700001:12600:14000:10,11700004:15300:17000:10,11700005:12600:14000:10,11700021:12600:14000:10,11700023:360:400:10,11700033:1170:1300:10,11700037:252000:280000:10,11700075:8550:9500:10,11700113:5670:6300:10,11700131:5850:6500:10,11700132:5850:6500:10,11700134:5850:6500:10,11700135:5850:6500:10,11700139:5850:6500:10,11700140:8550:9500:10,11700142:8550:9500:10,11700181:900:1000:10,11700185:16650:18500:10,11700187:900:1000:10,11700197:450:500:10,11700206:1800:2000:10,11700212:990:1100:10,11700213:5670:6300:10,11700218:1710:1900:10,11700383:140:150:7,11700448:14400:16000:10,11700452:900:1000:10,11700454:1800:2000:10,11700456:2700:3000:10,11700458:1800:2000:10,117004'
    + '91:4050:4500:10,11700507:3240:3600:10,11700519:1440:1600:10,11700522:3150:3500:10,11700523:1080:1200:10,11700530:5400:6000:10,11700532:400:450:11,11700561:1350:1500:10,11700563:270:300:10,11700566:700:1400:50,11700573:1600:2000:20,11700641:3600:4000:10,11700750:4500:5000:10,11700752:4500:5000:10,11700754:2300:2400:4,11700757:12600:14000:10,11700779:3600:4000:10,11700781:3600:4000:10,11700783:3600:4000:10,11700785:3600:4000:10,11700787:3600:4000:10,11700789:3600:4000:10,11700791:3600:4000:10,11700793:13500:15000:10,11700805:3150:3500:10,11700808:3150:3500:10,11700822:13500:15000:10,11700824:18000:20000:10,11700826:8550:9500:10,11700858:2250:2500:10,11700937:9900:11000:10,11700965:2520:2800:10,11700968:15300:17000:10,11700977:6300:7000:10,11701043:2320:2900:20,11701066:3500:3900:10,11701068:44100:49000:10,11701204:5900:6600:11,11701227:900:1000:10,11701243:3600:4000:10,11701244:3600:4000:1'
    + '0,11701245:3600:4000:10,11701246:3600:4000:10,11701247:3600:4000:10,11701248:3600:4000:10,11701279:4050:4500:10,11701281:4050:4500:10,11701291:4500:5000:10,11701294:4000:4400:9,11701295:4500:5000:10,11701299:2700:3000:10,11701301:3600:4000:10,11701303:4500:5000:10,11701305:4500:5000:10,11701343:990:1100:10,11701350:18900:21000:10,11701351:18000:20000:10,11701353:21870:24300:10,11701355:5400:6000:10,11701388:4700:5300:11,11701390:5300:5900:10,11701413:900:1000:10,11701415:6300:7000:10,11701417:6300:7000:10,11701419:6300:7000:10,11701421:700:800:12,11701475:4000:4400:9,11701478:4500:5000:10,11701479:1800:2000:10,11701480:3600:4000:10,11701481:3600:4000:10,11701484:9000:10000:10,11701517:4050:4500:10,11701518:2160:2400:10,11701520:3000:3300:9,11701522:29700:33000:10,11701525:12700:15900:20,11701527:9600:12000:20,11701529:1600:2000:20,11701531:2400:3000:20,11701533:400:500:20,11701543:700:90'
    + '0:22,11701603:161100:179000:10,11701604:269100:299000:10,11701605:35100:39000:10,11701607:170100:189000:10,11701608:233100:259000:10,11701635:13500:15000:10,11701652:1500:1700:12,12195671:3600:4000:10,12195672:3060:3400:10,12195793:270:300:10,12195795:4000:5000:20,12195862:8640:9600:10,12195891:2880:3600:20';
    var PC21_MEMBER_PRICE_POLICIES = pc21BuildMemberPricePolicies(PC21_MEMBER_PRICE_DATA);

    function pc21BuildMemberPricePolicies(data) {
        var policies = {};
        var rows = String(data || '').split(',');
        var i;
        var parts;
        for (i = 0; i < rows.length; i += 1) {
            parts = rows[i].split(':');
            if (parts.length === 4) {
                policies[parts[0]] = {
                    member: parseInt(parts[1], 10),
                    base: parseInt(parts[2], 10),
                    rate: parseInt(parts[3], 10)
                };
            }
        }
        return policies;
    }

    function pc21ParseWon(text) {
        var raw = String(text || '').replace(/[^0-9]/g, '');
        return raw ? parseInt(raw, 10) : 0;
    }

    function pc21FormatNumber(value) {
        var num = parseInt(value, 10);
        return num ? String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
    }

    function pc21GetBranduid() {
        var match = String(window.location.href || '').match(/[?&]branduid=([^&]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    }

    function pc21IsInstructorMember() {
        var groupNameEl = document.getElementById('pc21GroupNameRaw');
        var groupName = String(groupNameEl ? groupNameEl.textContent : '').replace(/\s+/g, '');
        return groupName.indexOf('강사') !== -1;
    }

    function pc21EnsurePriceNode(priceBox, className) {
        var node = priceBox ? priceBox.querySelector('.' + className) : null;
        var strong;
        if (node) {
            return node;
        }
        node = document.createElement('span');
        node.className = className;
        if (className === 'price' || className === 'original') {
            strong = document.createElement('strong');
            node.appendChild(strong);
            node.appendChild(document.createTextNode('원'));
        }
        if (priceBox) {
            priceBox.appendChild(node);
        }
        return node;
    }

    function pc21EnsureCaption(priceWrap, priceBox) {
        var captionNode = priceWrap ? priceWrap.querySelector('.group-price-caption') : null;
        var strongNode;
        var textNode;
        if (!priceWrap || !priceBox) {
            return;
        }
        priceBox.classList.add('has-usergroup-price');
        if (!captionNode) {
            captionNode = document.createElement('p');
            captionNode.className = 'group-price-caption';
            strongNode = document.createElement('strong');
            textNode = document.createTextNode(' 적용가가 자동 반영되었습니다.');
            captionNode.appendChild(strongNode);
            captionNode.appendChild(textNode);
            priceBox.insertAdjacentElement('afterend', captionNode);
        } else {
            strongNode = captionNode.querySelector('strong');
            if (!strongNode) {
                strongNode = document.createElement('strong');
                captionNode.insertBefore(strongNode, captionNode.firstChild);
            }
        }
        strongNode.textContent = '강사회원';
    }

    function pc21ApplyMemberPolicyFallback() {
        var policy = PC21_MEMBER_PRICE_POLICIES[pc21GetBranduid()];
        var priceWrap = document.querySelector('.goods--price-wrap');
        var priceBox = priceWrap ? priceWrap.querySelector('.prices') : null;
        var saleNode = priceBox ? priceBox.querySelector('.price') : null;
        var baseNode = priceBox ? priceBox.querySelector('.original') : null;
        var salePrice = pc21ParseWon(saleNode ? saleNode.textContent : '');
        var basePrice = pc21ParseWon(baseNode ? baseNode.textContent : '');
        var priceNode;
        var originalNode;
        var discountNode;

        if (!pc21IsInstructorMember() || !policy || !priceWrap || !priceBox || !policy.member || !policy.base || policy.member >= policy.base) {
            return;
        }
        if (salePrice && basePrice && salePrice < basePrice) {
            return;
        }
        if (!salePrice || salePrice !== policy.base) {
            return;
        }

        priceNode = pc21EnsurePriceNode(priceBox, 'price');
        originalNode = pc21EnsurePriceNode(priceBox, 'original');
        discountNode = pc21EnsurePriceNode(priceBox, 'discount');

        if (priceNode.querySelector('strong')) {
            priceNode.querySelector('strong').textContent = pc21FormatNumber(policy.member);
        }
        if (originalNode.querySelector('strong')) {
            originalNode.querySelector('strong').textContent = pc21FormatNumber(policy.base);
        }
        originalNode.style.display = '';
        discountNode.textContent = String(policy.rate) + '%';
        discountNode.setAttribute('data-sale', String(policy.member));
        discountNode.setAttribute('data-base', String(policy.base));
        priceBox.setAttribute('data-pc21-member-applied', String(policy.member) + '/' + String(policy.base) + '/' + String(policy.rate));
        priceBox.setAttribute('data-pc21-member-source', 'member-duplicate-policy-20260420');
        pc21EnsureCaption(priceWrap, priceBox);
    }

    pc21ApplyMemberPolicyFallback();
})();
