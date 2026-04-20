(function() {
    'use strict';

    // 상단 타이틀 변경
    changeNaviTitleText('상품검색');

    // 옵션보기
    var optionButtons = document.querySelectorAll('.prds--more .option-detail .opt-btn');
    for (var i = 0; i < optionButtons.length; i++) {
        optionButtons[i].onclick = (function(btn) {
            return function() {
                btn.classList.toggle('on');
            };
        })(optionButtons[i]);
    }

    // 일반 검색
    var searchMenu = document.querySelector('.side-search-wrap');
    var searchOpen = document.querySelector('.side-search-open');
    var searchClose = document.querySelector('.side-search-close');
    var searchOverlay = document.querySelector('.side-search-overlay');

    function disableScroll() {
        document.documentElement.classList.add('no-scroll');
        document.body.classList.add('no-scroll');
    }

    function enableScroll() {
        document.documentElement.classList.remove('no-scroll');
        document.body.classList.remove('no-scroll');
    }

    function openSearchMenu() {
        if (searchMenu) {
            searchMenu.classList.add('active');
        }
        if (searchOverlay) {
            searchOverlay.classList.add('active');
        }
        disableScroll();
    }

    function closeSearchMenu() {
        if (searchMenu) {
            searchMenu.classList.remove('active');
        }
        if (searchOverlay) {
            searchOverlay.classList.remove('active');
        }
        enableScroll();
    }

    function addClick(node, handler) {
        if (node) {
            node.addEventListener('click', handler);
        }
    }

    addClick(searchOpen, openSearchMenu);
    addClick(searchClose, closeSearchMenu);
    addClick(searchOverlay, closeSearchMenu);

    // 다찾다 검색 파인더: 현재 편집기 원본에서 비활성 주석 처리된 영역은 유지
})();


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
