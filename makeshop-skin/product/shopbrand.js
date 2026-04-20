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
            node.setAttribute('style', 'display:inline-flex;align-items:center;min-height:22px;padding:2px 7px;border-radius:999px;background:#fff3ed;margin-left:2px;color:#a85b45;font-size:13px;font-weight:800;letter-spacing:-0.02em;line-height:1.2;vertical-align:baseline;');
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


/* 2026-04-20: 강사회원 누락가 정책맵 보정 */
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

    function pc21IsInstructorMember() {
        var contextNode = document.getElementById('pc21-member-context');
        var groupName;
        if (!contextNode || contextNode.getAttribute('data-login') !== '1') {
            return false;
        }
        groupName = String(contextNode.getAttribute('data-group') || '');
        return groupName.indexOf('강사') !== -1;
    }

    function pc21ParseWon(text) {
        var raw = String(text || '').replace(/[^0-9]/g, '');
        return raw ? parseInt(raw, 10) : 0;
    }

    function pc21FormatNumber(value) {
        var num = parseInt(value, 10);
        return num ? String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
    }

    function pc21GetBranduid(card) {
        var link = card ? card.querySelector('a[href*="branduid="]') : null;
        var match;
        if (!link) {
            return '';
        }
        match = String(link.getAttribute('href') || '').match(/[?&]branduid=([^&]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    }

    function pc21FindPriceBox(priceRow) {
        var box;
        if (!priceRow) {
            return null;
        }
        box = priceRow.querySelector('.price .item-box');
        if (!box) {
            box = priceRow.querySelector('.price .itme-box');
        }
        if (!box) {
            box = priceRow.querySelector('.price');
        }
        return box;
    }

    function pc21EnsurePriceContainer(priceRow) {
        var priceNode = priceRow ? priceRow.querySelector('.price') : null;
        var box;
        if (!priceRow) {
            return null;
        }
        if (!priceNode) {
            priceNode = document.createElement('div');
            priceNode.className = 'price';
            box = document.createElement('div');
            box.className = 'item-box left';
            priceNode.appendChild(box);
            priceRow.appendChild(priceNode);
        }
        return pc21FindPriceBox(priceRow);
    }

    function pc21EnsureSpan(box, className, afterNode) {
        var node = box ? box.querySelector('.' + className) : null;
        if (node) {
            return node;
        }
        node = document.createElement('span');
        node.className = className;
        if (afterNode && afterNode.parentNode) {
            afterNode.parentNode.insertBefore(node, afterNode.nextSibling);
        } else if (box) {
            box.appendChild(node);
        }
        return node;
    }

    function pc21HasVisibleDiscount(priceRow) {
        var saleNode = priceRow ? priceRow.querySelector('.normal, .price strong, .price') : null;
        var baseNode = priceRow ? priceRow.querySelector('.consumer, .original') : null;
        var sale = pc21ParseWon(saleNode ? saleNode.textContent : '');
        var base = pc21ParseWon(baseNode ? baseNode.textContent : '');
        return !!(sale && base && sale < base);
    }

    function pc21ApplyMemberPolicyToCard(card) {
        var branduid = pc21GetBranduid(card);
        var policy = PC21_MEMBER_PRICE_POLICIES[branduid];
        var priceRow = card ? card.querySelector('.prd-price') : null;
        var box;
        var currentNode;
        var currentPrice;
        var normalNode;
        var consumerNode;
        var discountNode;
        var applyKey;

        if (!policy || !priceRow || !policy.member || !policy.base || policy.member >= policy.base) {
            return;
        }
        if (pc21HasVisibleDiscount(priceRow)) {
            return;
        }
        currentNode = priceRow.querySelector('.normal, .price strong, .price');
        currentPrice = pc21ParseWon(currentNode ? currentNode.textContent : '');
        if (!currentPrice || currentPrice !== policy.base) {
            return;
        }
        applyKey = String(policy.member) + '/' + String(policy.base) + '/' + String(policy.rate);
        if (priceRow.getAttribute('data-pc21-member-applied') === applyKey) {
            return;
        }

        box = pc21EnsurePriceContainer(priceRow);
        normalNode = pc21EnsureSpan(box, 'normal', null);
        consumerNode = pc21EnsureSpan(box, 'consumer', normalNode);
        discountNode = pc21EnsureSpan(box, 'pc21-ug-discount', consumerNode);

        normalNode.textContent = pc21FormatNumber(policy.member) + '원';
        consumerNode.textContent = pc21FormatNumber(policy.base) + '원';
        consumerNode.style.display = '';
        discountNode.textContent = String(policy.rate) + '%';
        discountNode.setAttribute('data-sale', String(policy.member));
        discountNode.setAttribute('data-base', String(policy.base));
        priceRow.setAttribute('data-pc21-member-applied', applyKey);
        priceRow.setAttribute('data-pc21-member-source', 'member-duplicate-policy-20260420');
    }

    function pc21ApplyMemberPolicies(root) {
        var scope = root || document;
        var cards;
        var i;
        if (!pc21IsInstructorMember() || !scope.querySelectorAll) {
            return;
        }
        cards = scope.querySelectorAll('dl.item-list');
        for (i = 0; i < cards.length; i += 1) {
            pc21ApplyMemberPolicyToCard(cards[i]);
        }
        if (scope.matches && scope.matches('dl.item-list')) {
            pc21ApplyMemberPolicyToCard(scope);
        }
    }

    pc21ApplyMemberPolicies(document);
    if (window.MutationObserver) {
        var target = document.querySelector('#contents') || document.body;
        var observer = new MutationObserver(function(mutations) {
            var i;
            var j;
            var added;
            for (i = 0; i < mutations.length; i += 1) {
                added = mutations[i].addedNodes;
                for (j = 0; j < added.length; j += 1) {
                    if (added[j].nodeType === 1) {
                        pc21ApplyMemberPolicies(added[j]);
                    }
                }
            }
            pc21ApplyMemberPolicies(target);
        });
        observer.observe(target, { childList: true, subtree: true });
    }
})();
