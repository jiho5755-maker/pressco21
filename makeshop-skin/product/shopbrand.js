$(function(){
    var recmdSwiper = new mySwiper('.recmd-swiper', {
        slidesPerView: 2,
        slidesPerGroup: 1,
        spaceBetween: 10,
        loop: false,
        pagination: {
            el: ".recmd-swiper .swiper-pagination",
            clickable: true,
        },
        grid: {
            rows: 2,
        },
        breakpoints: {
            1024: {
                slidesPerView: 4,
                grid: {
                    rows: 1,
                },
            },
            768: {
                slidesPerView: 3,
                grid: {
                    rows: 1,
                },
            }
        }
    });

    var bestSwiper = new mySwiper('.best-swiper', {
        slidesPerView: 2,
        slidesPerGroup: 1,
        spaceBetween: 10,
        loop: false,
        pagination: {
            el: ".best-swiper .swiper-pagination",
            clickable: true,
        },
        grid: {
            rows: 2,
        },
        breakpoints: {
            768: {
                grid: {
                    rows: 1,
                },
            }
        }
    });

    if ($('#topbanner').length > 0) {
        $('.header-menu').css('top', '40px');
    }

    if ($('.MK_product_list .title').length === 0) {
        $('.list_array').css('border-top', '0');
    }

    // ===================================================
    // 카테고리 UX 개선: 전체보기 + 컴팩트 보기 토글
    // ===================================================
    (function() {
        // --- 1. + 버튼을 "전체 보기" 버튼으로 교체 ---
        var moreArea = document.getElementById('MS_product_more_btn_area');
        if (moreArea) {
            // MutationObserver로 + 버튼 영역 변화 감시
            var observer = new MutationObserver(function() {
                var moreLink = moreArea.querySelector('.more a');
                if (!moreLink || moreLink.dataset.enhanced) return;
                moreLink.dataset.enhanced = 'true';

                // "전체 보기" 래퍼 생성
                var wrapper = document.createElement('div');
                wrapper.className = 'pc21-loadall-wrap';
                wrapper.innerHTML = '<button class="pc21-btn-loadall" type="button">' +
                    '\uB098\uBA38\uC9C0 \uC804\uCCB4 \uBCF4\uAE30</button>';
                moreArea.parentNode.insertBefore(wrapper, moreArea.nextSibling);

                // "전체 보기" 클릭 시 + 버튼 반복 클릭
                wrapper.querySelector('.pc21-btn-loadall').addEventListener('click', function() {
                    var btn = this;
                    btn.textContent = '\uBD88\uB7EC\uC624\uB294 \uC911...';
                    btn.disabled = true;

                    var clickInterval = setInterval(function() {
                        var link = moreArea.querySelector('.more a');
                        if (link && link.offsetParent !== null) {
                            link.click();
                        } else {
                            clearInterval(clickInterval);
                            btn.textContent = '\uBAA8\uB450 \uBD88\uB7EC\uC654\uC2B5\uB2C8\uB2E4';
                            setTimeout(function() { wrapper.style.display = 'none'; }, 1500);
                        }
                    }, 300);
                });
            });
            observer.observe(moreArea, { childList: true, subtree: true, attributes: true });
            // 초기 실행
            observer.takeRecords();
            var initLink = moreArea.querySelector('.more a');
            if (initLink) {
                initLink.dataset.enhanced = 'true';
                var wrapper = document.createElement('div');
                wrapper.className = 'pc21-loadall-wrap';
                wrapper.innerHTML = '<button class="pc21-btn-loadall" type="button">' +
                    '\uB098\uBA38\uC9C0 \uC804\uCCB4 \uBCF4\uAE30</button>';
                moreArea.parentNode.insertBefore(wrapper, moreArea.nextSibling);

                wrapper.querySelector('.pc21-btn-loadall').addEventListener('click', function() {
                    var btn = this;
                    btn.textContent = '\uBD88\uB7EC\uC624\uB294 \uC911...';
                    btn.disabled = true;
                    var clickInterval = setInterval(function() {
                        var link = moreArea.querySelector('.more a');
                        if (link && link.offsetParent !== null) {
                            link.click();
                        } else {
                            clearInterval(clickInterval);
                            btn.textContent = '\uBAA8\uB450 \uBD88\uB7EC\uC654\uC2B5\uB2C8\uB2E4';
                            setTimeout(function() { wrapper.style.display = 'none'; }, 1500);
                        }
                    }, 300);
                });
            }
        }

        // --- 2. 컴팩트 보기 토글 버튼 ---
        var listArray = document.querySelector('.list_array');
        if (listArray) {
            var toggleWrap = document.createElement('div');
            toggleWrap.className = 'pc21-view-toggle';
            toggleWrap.innerHTML =
                '<button class="pc21-btn-view active" data-view="normal" type="button" title="\uAE30\uBCF8 \uBCF4\uAE30">' +
                '<svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><rect x="0" y="0" width="8" height="8"/><rect x="10" y="0" width="8" height="8"/><rect x="0" y="10" width="8" height="8"/><rect x="10" y="10" width="8" height="8"/></svg></button>' +
                '<button class="pc21-btn-view" data-view="compact" type="button" title="\uCEF4\uD329\uD2B8 \uBCF4\uAE30">' +
                '<svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><rect x="0" y="0" width="5" height="5"/><rect x="6.5" y="0" width="5" height="5"/><rect x="13" y="0" width="5" height="5"/><rect x="0" y="6.5" width="5" height="5"/><rect x="6.5" y="6.5" width="5" height="5"/><rect x="13" y="6.5" width="5" height="5"/><rect x="0" y="13" width="5" height="5"/><rect x="6.5" y="13" width="5" height="5"/><rect x="13" y="13" width="5" height="5"/></svg></button>';
            listArray.appendChild(toggleWrap);

            toggleWrap.addEventListener('click', function(e) {
                var btn = e.target.closest('.pc21-btn-view');
                if (!btn) return;
                var view = btn.dataset.view;
                var contents = document.getElementById('contents');
                if (!contents) return;

                toggleWrap.querySelectorAll('.pc21-btn-view').forEach(function(b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');

                if (view === 'compact') {
                    contents.classList.add('pc21-compact-view');
                } else {
                    contents.classList.remove('pc21-compact-view');
                }
            });
        }



    })();

});


/* 2026-04-18: visible price/original 기준 할인율 보정 */
(function() {
    'use strict';

    function pc21ParseWon(text) {
        var raw = String(text || '').replace(/[^0-9]/g, '');
        return raw ? parseInt(raw, 10) : 0;
    }

    function pc21SetDiscountRate(container, saleNode, baseNode, insertAfterNode) {
        var sale = pc21ParseWon(saleNode ? saleNode.textContent : '');
        var base = pc21ParseWon(baseNode ? baseNode.textContent : '');
        var existingNode = container.querySelector('.discount, .pc21-ug-discount');
        if (sale && base && base === sale && baseNode) {
            if (baseNode.style.display !== 'none') {
                baseNode.style.display = 'none';
            }
            if (existingNode && existingNode.textContent !== '') {
                existingNode.textContent = '';
            }
            return;
        }
        if (!sale || !base || base <= sale) {
            return;
        }
        if (baseNode && baseNode.style.display === 'none') {
            baseNode.style.display = '';
        }

        var rate = Math.round((base - sale) * 100 / base);
        if (rate <= 0) {
            return;
        }

        var node = existingNode;
        if (!node) {
            node = document.createElement('span');
            node.className = 'pc21-ug-discount';
            node.setAttribute('style', 'display:inline-block;margin-left:8px;color:#f04b23;font-size:18px;font-weight:800;letter-spacing:-0.02em;vertical-align:baseline;');
            if (insertAfterNode && insertAfterNode.parentNode) {
                insertAfterNode.parentNode.insertBefore(node, insertAfterNode.nextSibling);
            } else {
                container.appendChild(node);
            }
        }
        var rateText = rate + '%';
        if (node.textContent !== rateText) {
            node.textContent = rateText;
        }
    }

    function pc21Each(scope, selector, callback) {
        var root = scope || document;
        if (root.matches && root.matches(selector)) {
            callback(root);
        }
        if (!root.querySelectorAll) {
            return;
        }
        var nodes = root.querySelectorAll(selector);
        for (var i = 0; i < nodes.length; i++) {
            callback(nodes[i]);
        }
    }

    function renderVisibleDiscountRates(root) {
        pc21Each(root, '.prds--price-wrap .prices', function(row) {
            var saleNode = row.querySelector('.price');
            var baseNode = row.querySelector('.original');
            if (!saleNode || !baseNode) {
                return;
            }
            pc21SetDiscountRate(row, saleNode, baseNode, baseNode);
        });

        pc21Each(root, '.price', function(row) {
            var saleNode = row.querySelector('.normal');
            var baseNode = row.querySelector('.consumer');
            if (!saleNode || !baseNode) {
                return;
            }
            pc21SetDiscountRate(row, saleNode, baseNode, baseNode);
        });
    }

    renderVisibleDiscountRates(document);

    var target = document.querySelector('#contents') || document.body;
    if (target && window.MutationObserver) {
        var observer = new MutationObserver(function(mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var added = mutations[i].addedNodes;
                for (var j = 0; j < added.length; j++) {
                    if (added[j].nodeType === 1) {
                        renderVisibleDiscountRates(added[j]);
                    }
                }
            }
            renderVisibleDiscountRates(target);
        });
        observer.observe(target, { childList: true, subtree: true });
    }
})();
