/* ==========================================
   Common JavaScript - PRESSCO21 브랜드스토리
   자사몰 공통 기능 (IIFE 패턴)
   ========================================== */

(function() {
    'use strict';

    /* ==========================================
       유틸리티 함수
       ========================================== */

    /**
     * Debounce - 연속 호출 제한
     * @param {Function} func - 실행할 함수
     * @param {Number} wait - 대기 시간 (ms)
     * @returns {Function}
     */
    function debounce(func, wait) {
        var timeout;
        return function() {
            var context = this;
            var args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                func.apply(context, args);
            }, wait);
        };
    }

    /**
     * Throttle - 실행 빈도 제한
     * @param {Function} func - 실행할 함수
     * @param {Number} limit - 제한 간격 (ms)
     * @returns {Function}
     */
    function throttle(func, limit) {
        var inThrottle;
        return function() {
            var args = arguments;
            var context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(function() {
                    inThrottle = false;
                }, limit);
            }
        };
    }

    /* ==========================================
       DOMContentLoaded 이후 초기화
       ========================================== */
    document.addEventListener('DOMContentLoaded', function() {

        /* ==========================================
           모바일 메뉴 토글 (자사몰 공통)
           ========================================== */
        var menuToggle = document.querySelector('.menu-toggle');
        var mobileMenu = document.querySelector('.mobile-menu');

        if (menuToggle && mobileMenu) {
            menuToggle.addEventListener('click', function() {
                mobileMenu.classList.toggle('active');
            });

            var menuLinks = document.querySelectorAll('.mobile-menu a');
            menuLinks.forEach(function(link) {
                link.addEventListener('click', function() {
                    mobileMenu.classList.remove('active');
                });
            });
        }

        /* ==========================================
           폼 요소 클래스 자동 추가 (자사몰 호환)
           ========================================== */
        var labels = document.querySelectorAll('label');
        if (labels.length) {
            labels.forEach(function(label) {
                label.classList.add('form-check-label');
            });
        }

        var radioCheckboxes = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
        if (radioCheckboxes.length) {
            radioCheckboxes.forEach(function(input) {
                input.classList.add('form-check-input');
            });
        }

        var textInputs = document.querySelectorAll('input[type="text"], input[type="password"], input[type="date"], textarea');
        if (textInputs.length) {
            textInputs.forEach(function(field) {
                field.classList.add('cw-textfield');
            });
        }

        var selects = document.querySelectorAll('select');
        if (selects.length) {
            selects.forEach(function(select) {
                select.classList.add('cw-select-box');
            });
        }

    }); /* END DOMContentLoaded */

    /* ==========================================
       스킨 반응형 (jQuery 사용, 자사몰 호환)
       ========================================== */
    if (typeof jQuery !== 'undefined') {
        jQuery(function() {
            var jqTopBanner = jQuery('#topbanner');
            var jqContainer = jQuery('#container');
            if (!jqTopBanner.length || !jqContainer.length) return;

            function adjustPadding() {
                var paddingTop = (jQuery(window).width() >= 768) ? '0' : '104px';
                jqContainer.css('padding-top', paddingTop);
            }

            var resizeTimer;
            jQuery(window).on('resize', function() {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(adjustPadding, 100);
            });

            adjustPadding();
        });
    }

})(); /* END Common IIFE */


/* ==========================================
   Heritage Page - PRESSCO21 브랜드스토리
   전면 리뉴얼 2026.02
   IIFE 패턴으로 전역 오염 방지
   메이크샵 제약: \${var} 이스케이프 적용
   ========================================== */

(function() {
    'use strict';

    /* ==========================================
       유틸리티 함수
       ========================================== */

    /**
     * Debounce - 연속 호출 제한
     * @param {Function} func
     * @param {Number} wait
     * @returns {Function}
     */
    function debounce(func, wait) {
        var timeout;
        return function() {
            var context = this;
            var args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                func.apply(context, args);
            }, wait);
        };
    }

    /**
     * 요소가 뷰포트 내에 있는지 확인
     * @param {HTMLElement} el
     * @returns {boolean}
     */
    function isInViewport(el) {
        var rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
    }

    /* ==========================================
       DOMContentLoaded 이후 초기화
       ========================================== */
    document.addEventListener('DOMContentLoaded', function() {

        /* ==========================================
           0. 스크롤 진행률 표시바
           ========================================== */
        function initScrollProgress() {
            var progressBar = document.querySelector('.scroll-progress');
            if (!progressBar) return;

            function updateProgress() {
                var scrollTop = window.scrollY;
                var docHeight = document.documentElement.scrollHeight - window.innerHeight;
                var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
                /* 메이크샵 이스케이프 주의: 템플릿 리터럴 미사용 */
                progressBar.style.width = progress + '%';
            }

            window.addEventListener('scroll', updateProgress, { passive: true });
            updateProgress();
        }

        initScrollProgress();

        /* ==========================================
           1. 섹션 네비게이션 (Desktop / Drawer 연동)
           ========================================== */
        function initSectionNav() {
            var sections = document.querySelectorAll('section[id]');
            var desktopNavLinks = document.querySelectorAll('.section-nav a');
            var sectionNav = document.querySelector('.section-nav');
            var heroSection = document.querySelector('.hero-section');

            if (!sections.length) return;

            /* 현재 섹션 감지 */
            var sectionObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        var sectionId = entry.target.id;

                        /* 데스크톱 네비게이션 */
                        desktopNavLinks.forEach(function(link) {
                            link.classList.remove('active');
                        });
                        var activeLink = document.querySelector('.section-nav a[data-section="' + sectionId + '"]');
                        if (activeLink) {
                            activeLink.classList.add('active');
                        }
                    }
                });
            }, { rootMargin: '-40% 0px -60% 0px', threshold: 0 });

            sections.forEach(function(section) {
                sectionObserver.observe(section);
            });

            /* 히어로 섹션에서 네비게이션 색상 변경 */
            if (heroSection && sectionNav) {
                var heroObserver = new IntersectionObserver(function(entries) {
                    entries.forEach(function(entry) {
                        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                            sectionNav.classList.add('hero-visible');
                        } else {
                            sectionNav.classList.remove('hero-visible');
                        }
                    });
                }, { threshold: [0, 0.5, 1] });

                heroObserver.observe(heroSection);
            }
        }

        initSectionNav();

        /* ==========================================
           2. Achievement 탭 전환
           ========================================== */
        function initAchievementTabs() {
            var tabBtns = document.querySelectorAll('.tab-btn');
            var tabContents = document.querySelectorAll('.tab-content');

            if (!tabBtns.length) return;

            tabBtns.forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var tabId = this.getAttribute('data-tab');

                    tabBtns.forEach(function(b) {
                        b.classList.remove('active');
                        b.setAttribute('aria-selected', 'false');
                    });
                    this.classList.add('active');
                    this.setAttribute('aria-selected', 'true');

                    tabContents.forEach(function(content) {
                        content.classList.remove('active');
                    });

                    var selectedContent = document.querySelector('.tab-content[data-tab-id="' + tabId + '"]');
                    if (selectedContent) {
                        selectedContent.classList.add('active');
                    }
                });
            });
        }

        initAchievementTabs();

        /* ==========================================
           3. 숫자 카운트업 애니메이션
           ========================================== */
        function animateCount(element, target, duration) {
            duration = duration || 2000;
            var startTime = performance.now();

            function animate(currentTime) {
                var elapsed = currentTime - startTime;
                var progress = Math.min(elapsed / duration, 1);
                /* easeOutCubic */
                var easedProgress = 1 - Math.pow(1 - progress, 3);
                var current = Math.floor(target * easedProgress);
                element.textContent = current + '+';

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    element.textContent = target + '+';
                }
            }

            requestAnimationFrame(animate);
        }

        function initStatsCounter() {
            var statsSection = document.querySelector('.stats-counter');
            if (!statsSection) return;

            var statsObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        var statNumbers = document.querySelectorAll('.stat-number');
                        statNumbers.forEach(function(stat) {
                            if (!stat.hasAttribute('data-animated')) {
                                var value = parseInt(stat.getAttribute('data-value'), 10);
                                if (!isNaN(value)) {
                                    animateCount(stat, value);
                                    stat.setAttribute('data-animated', 'true');
                                }
                            }
                        });
                        statsObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.5 });

            statsObserver.observe(statsSection);
        }

        initStatsCounter();

        /* ==========================================
           4. Book 캐러셀 (Slick)
           ========================================== */
        function initBookCarousel() {
            if (typeof jQuery === 'undefined' || typeof jQuery.fn.slick === 'undefined') return;

            jQuery('.book-carousel').slick({
                slidesToShow: 4,
                slidesToScroll: 1,
                infinite: true,
                dots: true,
                arrows: true,
                autoplay: false,
                responsive: [
                    {
                        breakpoint: 1200,
                        settings: { slidesToShow: 3, slidesToScroll: 1 }
                    },
                    {
                        breakpoint: 992,
                        settings: { slidesToShow: 2.5, slidesToScroll: 1 }
                    },
                    {
                        breakpoint: 768,
                        settings: { slidesToShow: 2, slidesToScroll: 1 }
                    },
                    {
                        breakpoint: 640,
                        settings: { slidesToShow: 1.2, slidesToScroll: 1, centerMode: true }
                    }
                ]
            });
        }

        initBookCarousel();

        /* ==========================================
           5. 갤러리 라이트박스 (Swiper 기반)
           ========================================== */
        function initGalleryLightbox() {
            var galleryItems = document.querySelectorAll('.gallery-item');
            var lightboxEl = document.querySelector('.heritage-lightbox');

            if (!galleryItems.length || !lightboxEl) return;

            var swiperInstance = null;
            var closeBtn = lightboxEl.querySelector('.lightbox-close-btn');
            var previousFocus = null;

            /* Swiper 인스턴스 생성 */
            function createSwiper() {
                if (typeof Swiper === 'undefined') return null;

                return new Swiper('.heritage-lightbox .swiper', {
                    loop: false,
                    keyboard: {
                        enabled: true,
                        onlyInViewport: false
                    },
                    navigation: {
                        nextEl: '.heritage-lightbox .swiper-button-next',
                        prevEl: '.heritage-lightbox .swiper-button-prev'
                    },
                    pagination: {
                        el: '.heritage-lightbox .swiper-pagination',
                        clickable: true
                    },
                    zoom: {
                        maxRatio: 3
                    }
                });
            }

            /* 라이트박스 열기 */
            function openLightbox(index) {
                /* 현재 보이는 갤러리 아이템으로 슬라이드 생성 */
                var visibleItems = [];
                galleryItems.forEach(function(item) {
                    if (!item.classList.contains('hidden')) {
                        visibleItems.push(item);
                    }
                });

                /* 슬라이드 Wrapper 업데이트 */
                var swiperWrapper = lightboxEl.querySelector('.swiper-wrapper');
                if (!swiperWrapper) return;

                swiperWrapper.innerHTML = '';

                visibleItems.forEach(function(item) {
                    var img = item.querySelector('img');
                    if (img) {
                        var slide = document.createElement('div');
                        slide.className = 'swiper-slide';
                        var slideImg = document.createElement('img');
                        slideImg.src = img.src;
                        slideImg.alt = img.alt;
                        slideImg.loading = 'eager';
                        slide.appendChild(slideImg);
                        swiperWrapper.appendChild(slide);
                    }
                });

                /* 클릭한 이미지 인덱스 찾기 (보이는 아이템 중에서) */
                var clickedItem = galleryItems[index];
                var slideIndex = 0;
                for (var i = 0; i < visibleItems.length; i++) {
                    if (visibleItems[i] === clickedItem) {
                        slideIndex = i;
                        break;
                    }
                }

                /* 기존 인스턴스 파괴 후 재생성 */
                if (swiperInstance) {
                    swiperInstance.destroy(true, true);
                }

                lightboxEl.classList.add('active');
                document.body.style.overflow = 'hidden';
                previousFocus = document.activeElement;

                /* 약간의 지연 후 Swiper 초기화 (DOM 업데이트 대기) */
                setTimeout(function() {
                    swiperInstance = createSwiper();
                    if (swiperInstance && slideIndex > 0) {
                        swiperInstance.slideTo(slideIndex, 0);
                    }
                    if (closeBtn) closeBtn.focus();
                }, 50);
            }

            /* 라이트박스 닫기 */
            function closeLightbox() {
                lightboxEl.classList.remove('active');
                document.body.style.overflow = '';
                if (swiperInstance) {
                    swiperInstance.destroy(true, true);
                    swiperInstance = null;
                }
                if (previousFocus) {
                    previousFocus.focus();
                }
            }

            /* 갤러리 아이템 클릭 이벤트 (이벤트 위임) */
            var galleryGrid = document.querySelector('.gallery-grid');
            if (galleryGrid) {
                galleryGrid.addEventListener('click', function(e) {
                    var item = e.target.closest('.gallery-item');
                    if (!item) return;

                    /* 클릭한 아이템의 전체 인덱스 찾기 */
                    var allItems = Array.prototype.slice.call(galleryItems);
                    var idx = allItems.indexOf(item);
                    if (idx !== -1) {
                        openLightbox(idx);
                    }
                });
            }

            /* 닫기 이벤트 */
            if (closeBtn) {
                closeBtn.addEventListener('click', closeLightbox);
            }

            lightboxEl.addEventListener('click', function(e) {
                /* 배경 클릭 시 닫기 (이미지/버튼 제외) */
                if (e.target === lightboxEl || e.target.classList.contains('swiper-slide')) {
                    closeLightbox();
                }
            });

            /* ESC 키로 닫기 */
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && lightboxEl.classList.contains('active')) {
                    closeLightbox();
                }
            });

            /* 포커스 트랩 */
            lightboxEl.addEventListener('keydown', function(e) {
                if (e.key === 'Tab' && lightboxEl.classList.contains('active')) {
                    e.preventDefault();
                    if (closeBtn) closeBtn.focus();
                }
            });
        }

        initGalleryLightbox();

        /* ==========================================
           6. 갤러리 필터
           ========================================== */
        function initGalleryFilter() {
            var filterBtns = document.querySelectorAll('.filter-btn');
            var galleryItems = document.querySelectorAll('.gallery-item[data-category]');

            if (!filterBtns.length || !galleryItems.length) return;

            filterBtns.forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var category = this.getAttribute('data-category');

                    filterBtns.forEach(function(b) {
                        b.classList.remove('active');
                        b.setAttribute('aria-selected', 'false');
                    });
                    this.classList.add('active');
                    this.setAttribute('aria-selected', 'true');

                    galleryItems.forEach(function(item) {
                        var itemCategory = item.getAttribute('data-category');
                        if (category === 'all' || itemCategory === category) {
                            item.classList.remove('hidden');
                            item.classList.add('visible');
                        } else {
                            item.classList.add('hidden');
                            item.classList.remove('visible');
                        }
                    });
                });
            });
        }

        initGalleryFilter();

        /* ==========================================
           7. 스무스 스크롤 (앵커 링크)
           ========================================== */
        function initSmoothScroll() {
            var anchorLinks = document.querySelectorAll('a[href^="#"]');
            anchorLinks.forEach(function(link) {
                link.addEventListener('click', function(e) {
                    var href = this.getAttribute('href');
                    if (href !== '#') {
                        e.preventDefault();
                        var target = document.querySelector(href);
                        if (target) {
                            window.scrollTo({
                                top: target.offsetTop,
                                behavior: 'smooth'
                            });
                        }
                    }
                });
            });
        }

        initSmoothScroll();

        /* ==========================================
           8. 모바일 드로워 네비게이션
           ========================================== */
        function initMobileDrawer() {
            var hamburgerBtn = document.querySelector('.hamburger-btn');
            var drawer = document.querySelector('.mobile-drawer');
            var drawerClose = document.querySelector('.drawer-close');
            var drawerOverlay = document.querySelector('.drawer-overlay');
            var drawerLinks = document.querySelectorAll('.drawer-nav a');

            if (!hamburgerBtn || !drawer) return;

            function openDrawer() {
                drawer.classList.add('active');
                drawerOverlay.classList.add('active');
                hamburgerBtn.classList.add('active');
                hamburgerBtn.setAttribute('aria-expanded', 'true');
                document.body.style.overflow = 'hidden';
                if (drawerClose) drawerClose.focus();
            }

            function closeDrawer() {
                drawer.classList.remove('active');
                drawerOverlay.classList.remove('active');
                hamburgerBtn.classList.remove('active');
                hamburgerBtn.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
                hamburgerBtn.focus();
            }

            hamburgerBtn.addEventListener('click', openDrawer);
            if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
            if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

            drawerLinks.forEach(function(link) {
                link.addEventListener('click', function() {
                    closeDrawer();
                    drawerLinks.forEach(function(l) { l.classList.remove('active'); });
                    this.classList.add('active');
                }.bind(link));
            });

            /* ESC로 닫기 */
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && drawer.classList.contains('active')) {
                    closeDrawer();
                }
            });

            /* 섹션 감지 -> 드로워 네비게이션 활성 상태 업데이트 */
            var sections = document.querySelectorAll('section[id]');
            var drawerNavObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        var sectionId = entry.target.id;
                        drawerLinks.forEach(function(link) {
                            var linkSection = link.getAttribute('data-section');
                            link.classList.toggle('active', linkSection === sectionId);
                        });
                    }
                });
            }, { rootMargin: '-40% 0px -60% 0px', threshold: 0 });

            sections.forEach(function(section) {
                drawerNavObserver.observe(section);
            });
        }

        initMobileDrawer();

        /* ==========================================
           9. 타임라인 모달
           ========================================== */
        function initTimelineModal() {
            var timelineItems = document.querySelectorAll('.timeline-item');
            var modal = document.getElementById('timelineModal');

            if (!modal || !timelineItems.length) return;

            var modalClose = modal.querySelector('.modal-close');
            var modalYear = document.getElementById('modalYear');
            var modalTitle = document.getElementById('modalTitle');
            var modalDescription = document.getElementById('modalDescription');
            var previousFocus = null;

            /* 타임라인 상세 데이터 */
            var timelineData = {
                '1985': {
                    title: '\uC138\uACC4\uD50C\uB77C\uC6CC \uC62C\uB9BC\uD53D \uB3D9\uC0C1 \uC218\uC0C1',
                    description: '\uC555\uD654 \uACF5\uC608\uC758 \uAD6D\uC81C\uC801 \uC778\uC815\uC744 \uBC1B\uC740 \uCCAB \uD574. \uC774 \uC21C\uAC04\uBD80\uD130 "\uC5B4\uB5BB\uAC8C \uD558\uBA74 \uC774 \uC544\uB984\uB2E4\uC6C0\uC744 \uC601\uC6D0\uD788 \uAC04\uC9C1\uD560 \uC218 \uC788\uC744\uAE4C?"\uB77C\uB294 \uC9C8\uBB38\uC774 \uC2DC\uC791\uB418\uC5C8\uC2B5\uB2C8\uB2E4.'
                },
                '1999': {
                    title: '\uD504\uB808\uC2A4\uCF5421 \uCC3D\uB9BD',
                    description: '\uC555\uD654 \uC0B0\uC5C5\uD654\uC758 \uC2DC\uC791. \uAC1C\uC778 \uC791\uAC00 \uD65C\uB3D9\uC744 \uB118\uC5B4, \uB354 \uB9CE\uC740 \uC0AC\uB78C\uB4E4\uC5D0\uAC8C \uAF43\uC758 \uC544\uB984\uB2E4\uC6C0\uC744 \uC804\uD558\uAE30 \uC704\uD55C \uBCF8\uACA9\uC801\uC778 \uC5EC\uC815\uC758 \uCCAB\uAC78\uC74C.'
                },
                '2002': {
                    title: '\uC2E4\uC6A9\uC2E0\uC548\uD2B9\uD5C8 1\uD638 \uCDE8\uB4DD',
                    description: '\uAC00\uAD6C\uD45C\uBA74 \uC555\uD654\uD615\uC131\uAD6C\uC870 (\uC81C 0294485\uD638). \uC555\uD654\uB97C \uC77C\uC0C1 \uC18D\uC73C\uB85C \uAC00\uC838\uC624\uAE30 \uC704\uD55C \uCCAB \uBC88\uC9F8 \uAE30\uC220\uC801 \uD601\uC2E0.'
                },
                '2005': {
                    title: '\uC911\uC18C\uAE30\uC5C5\uC9C4\uD765\uCCAD\uC7A5 \uD45C\uCC3D \uBC0F \uD611\uD68C \uCC3D\uB9BD',
                    description: '"\uBAA8\uBC94\uC5EC\uC131\uAE30\uC5C5\uC778" \uC778\uC815\uACFC \uD568\uAED8 (\uC0AC)\uD55C\uAD6D\uC555\uD654\uAD50\uC721\uBB38\uD654\uD611\uD68C\uB97C \uCC3D\uB9BD. \uAC1C\uC778\uC758 \uC131\uACF5\uC744 \uB118\uC5B4 \uC0B0\uC5C5 \uC804\uCCB4\uC758 \uBC1C\uC804\uC744 \uC704\uD55C \uD1A0\uB300 \uB9C8\uB828.'
                },
                '2009': {
                    title: '\uAD6D\uC81C \uC218\uC0C1 \uC5F0\uC18D',
                    description: '\uC911\uAD6D \uBD81\uACBD\uD654\uD6FC\uBC15\uB78C\uD68C \uC6B0\uC218\uC0C1, \uC77C\uBCF8 \uC694\uCF54\uD558\uB9C8 \uCC3D\uC870\uC804 \uC694\uBBF8\uC6B0\uB9AC \uC2E0\uBB38\uC0AC \uC0AC\uC7A5\uC0C1 \uC218\uC0C1. \uD55C\uAD6D \uC555\uD654 \uACF5\uC608\uC758 \uAD6D\uC81C\uC801 \uC704\uC0C1 \uD655\uB9BD.'
                },
                '2010': {
                    title: '\uAD6D\uBB34\uCD1D\uB9AC \uD45C\uCC3D',
                    description: '\uAD6D\uAC00 \uBB38\uD654\uC0B0\uC5C5 \uBC1C\uC804\uC5D0 \uAE30\uC5EC\uD55C \uACF5\uB85C\uB97C \uC778\uC815\uBC1B\uC544 \uAD6D\uBB34\uCD1D\uB9AC \uD45C\uCC3D \uC218\uC0C1. 30\uB144 \uB178\uB825\uC758 \uACB0\uC2E4.'
                },
                '2018': {
                    title: '\uC11C\uC6B8\uB300\uACF5\uC6D0 \uD22C\uBA85 \uC2DD\uBB3C\uD45C\uBCF8 \uC804\uC2DC\uAD00 \uC124\uB9BD',
                    description: '30\uB144 \uC5F0\uAD6C\uC758 \uC815\uC810. \uAD6D\uB0B4 \uCD5C\uCD08\uB85C \uD22C\uBA85 \uC2DD\uBB3C \uD45C\uBCF8 \uAE30\uC220\uC744 \uD65C\uC6A9\uD55C \uC0C1\uC124 \uC804\uC2DC\uAD00 \uAC1C\uAD00. \uB9E4\uB144 \uC218\uC2ED\uB9CC \uBA85\uC758 \uBC29\uBB38\uAC1D\uB4E4\uC774 \uC790\uC5F0\uC758 \uC544\uB984\uB2E4\uC6C0\uC744 \uACBD\uD5D8\uD569\uB2C8\uB2E4.'
                },
                '2020': {
                    title: '\uD45C\uBCF8 \uC81C\uC791 \uBC29\uBC95 \uD2B9\uD5C8 \uB4F1\uB85D',
                    description: '\uC81C 10-2020-0044902\uD638. \uD22C\uBA85 \uC2DD\uBB3C \uD45C\uBCF8 \uAE30\uC220\uC758 \uD575\uC2EC \uD2B9\uD5C8 \uB4F1\uB85D\uC73C\uB85C \uAE30\uC220\uB825\uC744 \uACF5\uC2DD \uC778\uC815\uBC1B\uC74C.'
                },
                '2021': {
                    title: '\uAD6D\uB9BD\uC0DD\uBB3C\uC790\uC6D0\uAD00 \uD611\uC5C5',
                    description: '\uD22C\uBA85 \uC2DD\uBB3C \uD45C\uBCF8 \uC804\uC2DC \uBC0F \uB0A9\uD488\uC744 \uD1B5\uD574 \uAD6D\uAC00 \uC0DD\uBB3C\uC790\uC6D0 \uBCF4\uC874\uC5D0 \uAE30\uC5EC. \uACFC\uD559\uACFC \uC608\uC220\uC758 \uB9CC\uB0A8.'
                },
                '2023': {
                    title: '\uAE30\uC5C5 \uD611\uC5C5 \uD65C\uC131\uD654',
                    description: 'LG\uC0DD\uD65C\uAC74\uAC15, \uC544\uBAA8\uB808\uD37C\uC2DC\uD53D\uACFC \uC0B0\uC0BC\uD45C\uBCF8 \uB4F1 \uC81C\uD488 \uD611\uC5C5. \uAE30\uC220\uC758 \uC0C1\uC5C5\uC801 \uAC00\uCE58 \uC785\uC99D.'
                },
                '2025': {
                    title: '\uB300\uD55C\uBBFC\uAD6D \uBB38\uD654\uC0B0\uC5C5 \uBC1C\uC804 \uAE30\uC5EC\uC0C1',
                    description: '\uAD6D\uD68C \uBB38\uD654\uCCB4\uC721\uAD00\uAD11\uC704\uC6D0\uD68C \uC218\uC0C1. 40\uB144\uAC04 \uB300\uD55C\uBBFC\uAD6D \uC555\uD654 \uBC0F \uD50C\uB77C\uC6CC \uACF5\uC608 \uC0B0\uC5C5\uC744 \uC774\uB044\uC5B4\uC628 \uACF5\uB85C \uC778\uC815.'
                }
            };

            function openModal(year) {
                var data = timelineData[year];
                if (!data) return;

                if (modalYear) modalYear.textContent = year;
                if (modalTitle) modalTitle.textContent = data.title;
                if (modalDescription) modalDescription.textContent = data.description;

                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
                previousFocus = document.activeElement;
                if (modalClose) modalClose.focus();
            }

            function closeModal() {
                modal.classList.remove('active');
                document.body.style.overflow = '';
                if (previousFocus) previousFocus.focus();
            }

            timelineItems.forEach(function(item) {
                var yearElement = item.querySelector('.timeline-year h3');
                if (yearElement) {
                    item.addEventListener('click', function() {
                        openModal(yearElement.textContent.trim());
                    });

                    item.setAttribute('tabindex', '0');
                    item.setAttribute('role', 'button');
                    item.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openModal(yearElement.textContent.trim());
                        }
                    });
                }
            });

            if (modalClose) modalClose.addEventListener('click', closeModal);
            modal.addEventListener('click', function(e) {
                if (e.target === modal) closeModal();
            });
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && modal.classList.contains('active')) {
                    closeModal();
                }
            });
        }

        initTimelineModal();

        /* ==========================================
           10. 스크롤 기반 Fade-in 애니메이션
           ========================================== */
        function initScrollAnimations() {
            var scrollRevealObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('scroll-revealed');
                        scrollRevealObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1, rootMargin: '50px 0px 0px 0px' });

            /* 섹션 타이틀 */
            document.querySelectorAll('#heritage-main .section-title').forEach(function(el) {
                if (isInViewport(el)) {
                    el.classList.add('scroll-revealed');
                } else {
                    el.classList.add('animate-on-scroll');
                    scrollRevealObserver.observe(el);
                }
            });

            /* 카드들 */
            document.querySelectorAll('#heritage-main .value-card, #heritage-main .education-card, #heritage-main .international-card').forEach(function(el) {
                if (isInViewport(el)) {
                    el.classList.add('scroll-revealed');
                } else {
                    el.classList.add('animate-on-scroll');
                    scrollRevealObserver.observe(el);
                }
            });

            /* 타임라인 아이템 */
            var timelineItems = document.querySelectorAll('#heritage-main .timeline-item');
            var timelineLine = document.querySelector('#heritage-main .timeline-line');
            var revealedCount = 0;

            function updateTimelineProgress() {
                if (timelineLine && timelineItems.length > 0) {
                    var progress = (revealedCount / timelineItems.length) * 100;
                    timelineLine.style.setProperty('--timeline-progress', progress + '%');
                }
            }

            var timelineObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        setTimeout(function() {
                            entry.target.classList.add('scroll-revealed');
                            revealedCount++;
                            updateTimelineProgress();
                        }, 80);
                        timelineObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.25, rootMargin: '0px 0px -60px 0px' });

            timelineItems.forEach(function(el, index) {
                el.classList.add('will-animate');
                if (index === 0 && isInViewport(el)) {
                    el.classList.add('scroll-revealed');
                    revealedCount++;
                    updateTimelineProgress();
                } else {
                    timelineObserver.observe(el);
                }
            });
        }

        /* DOM 완전 로드 후 실행 */
        if (document.readyState === 'complete') {
            initScrollAnimations();
        } else {
            window.addEventListener('load', initScrollAnimations);
        }

    }); /* END DOMContentLoaded */

})(); /* END Heritage IIFE */
