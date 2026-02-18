/* ==========================================
   Heritage Page Interactive Features
   ========================================== */

document.addEventListener('DOMContentLoaded', function() {

    // ==========================================
    // 0. Scroll Progress Bar
    // ==========================================
    function initScrollProgress() {
        const progressBar = document.querySelector('.scroll-progress');
        if (!progressBar) return;

        function updateProgress() {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            progressBar.style.width = `${progress}%`;
        }

        window.addEventListener('scroll', updateProgress, { passive: true });
        updateProgress(); // 초기값 설정
    }

    initScrollProgress();

    // ==========================================
    // 0-1. Section Navigation (Desktop & Mobile)
    // ==========================================
    function initSectionNav() {
        const sections = document.querySelectorAll('section[id]');
        const desktopNavLinks = document.querySelectorAll('.section-nav a');
        const mobileNavLinks = document.querySelectorAll('.mobile-bottom-nav a');
        const sectionNav = document.querySelector('.section-nav');
        const heroSection = document.querySelector('.hero-section');

        if (!sections.length) return;

        // 현재 섹션 감지 및 네비게이션 활성화
        const observerOptions = {
            rootMargin: '-40% 0px -60% 0px',
            threshold: 0
        };

        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.id;

                    // 데스크톱 네비게이션 활성 상태 업데이트
                    desktopNavLinks.forEach(link => link.classList.remove('active'));
                    const activeDesktopLink = document.querySelector(`.section-nav a[data-section="${sectionId}"]`);
                    if (activeDesktopLink) {
                        activeDesktopLink.classList.add('active');
                    }

                    // 모바일 네비게이션 활성 상태 업데이트
                    mobileNavLinks.forEach(link => link.classList.remove('active'));
                    const activeMobileLink = document.querySelector(`.mobile-bottom-nav a[data-section="${sectionId}"]`);
                    if (activeMobileLink) {
                        activeMobileLink.classList.add('active');
                    }
                }
            });
        }, observerOptions);

        sections.forEach(section => sectionObserver.observe(section));

        // Hero 섹션에서 네비게이션 색상 변경
        if (heroSection && sectionNav) {
            const heroObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
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

    // ==========================================
    // 1. Parallax Effect (Hero Section) - Ken Burns와 통합
    // ==========================================
    // Ken Burns 효과가 CSS에서 작동하므로 JS Parallax는 모바일에서만 적용
    // (모바일에서는 Ken Burns가 비활성화됨)
    if (window.innerWidth <= 767) {
        window.addEventListener('scroll', function() {
            const scrolled = window.pageYOffset;
            const heroSection = document.querySelector('.hero-section');
            if (heroSection && scrolled < window.innerHeight) {
                heroSection.style.backgroundPosition = `center ${scrolled * 0.3}px`;
            }
        }, { passive: true });
    }

    // ==========================================
    // 2. Achievement Tabs
    // ==========================================
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach((btn) => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');

            // Remove active class from all buttons and update ARIA
            tabBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            // Add active to clicked button and update ARIA
            this.classList.add('active');
            this.setAttribute('aria-selected', 'true');

            // Hide all tab contents
            tabContents.forEach(content => content.classList.remove('active'));
            // Show selected tab content
            const selectedContent = document.querySelector(`.tab-content[data-tab-id="${tabId}"]`);
            if (selectedContent) {
                selectedContent.classList.add('active');
            }
        });
    });

    // ==========================================
    // 3. CountUp Animation for Stats
    // ==========================================
    function animateCount(element, target, duration = 2000) {
        let current = 0;
        const increment = target / (duration / 16);
        const startTime = performance.now();

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            current = Math.floor(target * progress);
            element.textContent = current + '+';

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = target + '+';
            }
        }

        requestAnimationFrame(animate);
    }

    // Trigger stats animation on scroll
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const statNumbers = document.querySelectorAll('.stat-number');
                statNumbers.forEach(stat => {
                    if (!stat.hasAttribute('data-animated')) {
                        const value = parseInt(stat.getAttribute('data-value'));
                        animateCount(stat, value);
                        stat.setAttribute('data-animated', 'true');
                    }
                });
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    const statsSection = document.querySelector('.stats-counter');
    if (statsSection) {
        statsObserver.observe(statsSection);
    }

    // ==========================================
    // 4. Book Carousel (Slick) - 메이크샵 최적화
    // ==========================================
    if (typeof jQuery !== 'undefined' && typeof jQuery.fn.slick !== 'undefined') {
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
                    settings: {
                        slidesToShow: 3,
                        slidesToScroll: 1
                    }
                },
                {
                    breakpoint: 1024,
                    settings: {
                        slidesToShow: 2.5,
                        slidesToScroll: 1
                    }
                },
                {
                    breakpoint: 768,
                    settings: {
                        slidesToShow: 2,
                        slidesToScroll: 1
                    }
                },
                {
                    breakpoint: 640,
                    settings: {
                        slidesToShow: 1.2,
                        slidesToScroll: 1,
                        centerMode: true
                    }
                }
            ]
        });
    }

    // ==========================================
    // 5. Gallery Lightbox (Enhanced)
    // ==========================================
    const galleryItems = document.querySelectorAll('.gallery-item');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = lightbox.querySelector('img');
    const lightboxClose = lightbox.querySelector('.lightbox-close');
    let currentImageIndex = 0;
    let previousFocus = null;

    // Open lightbox
    galleryItems.forEach((item, index) => {
        item.addEventListener('click', function(e) {
            const imgSrc = this.querySelector('img').src;
            const imgAlt = this.querySelector('img').alt;
            lightboxImg.src = imgSrc;
            lightboxImg.alt = imgAlt;
            currentImageIndex = index;
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';

            // Store previous focus for restoration
            previousFocus = document.activeElement;
            // Focus on close button for accessibility
            lightboxClose.focus();
        });
    });

    // Close lightbox function
    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = 'auto';
        // Restore focus to previous element
        if (previousFocus) {
            previousFocus.focus();
        }
    }

    // Navigate to next/previous image (필터링된 이미지만)
    function navigateImage(direction) {
        const visibleItems = Array.from(galleryItems).filter(item =>
            !item.classList.contains('hidden')
        );

        let currentVisibleIndex = visibleItems.findIndex(item =>
            item.querySelector('img').src === lightboxImg.src
        );

        currentVisibleIndex += direction;
        if (currentVisibleIndex < 0) currentVisibleIndex = visibleItems.length - 1;
        if (currentVisibleIndex >= visibleItems.length) currentVisibleIndex = 0;

        const newImg = visibleItems[currentVisibleIndex].querySelector('img');
        lightboxImg.src = newImg.src;
        lightboxImg.alt = newImg.alt;
    }

    lightboxClose.addEventListener('click', closeLightbox);

    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    // Enhanced keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (!lightbox.classList.contains('active')) return;

        switch(e.key) {
            case 'Escape':
                closeLightbox();
                break;
            case 'ArrowRight':
                navigateImage(1);
                break;
            case 'ArrowLeft':
                navigateImage(-1);
                break;
        }
    });

    // Focus trap inside lightbox
    lightbox.addEventListener('keydown', function(e) {
        if (e.key === 'Tab' && lightbox.classList.contains('active')) {
            e.preventDefault();
            lightboxClose.focus();
        }
    });

    // ==========================================
    // 6. Smooth Scroll for Anchor Links
    // ==========================================
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const targetElement = document.querySelector(href);
                if (targetElement) {
                    const offsetTop = targetElement.offsetTop;
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth',
                    });
                }
            }
        });
    });

    // ==========================================
    // 7. Intersection Observer for Fade-in Animations
    // ==========================================
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
    };

    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-visible');
            }
        });
    }, observerOptions);

    // Observe elements for fade-in animation
    const fadeElements = document.querySelectorAll(
        '.achievement-card, .education-card, .international-card, .timeline-item'
    );
    fadeElements.forEach(el => {
        el.classList.add('fade-in');
        fadeObserver.observe(el);
    });

    // ==========================================
    // 8. Mobile Drawer Navigation
    // ==========================================
    function initMobileDrawer() {
        const hamburgerBtn = document.querySelector('.hamburger-btn');
        const drawer = document.querySelector('.mobile-drawer');
        const drawerClose = document.querySelector('.drawer-close');
        const drawerOverlay = document.querySelector('.drawer-overlay');
        const drawerLinks = document.querySelectorAll('.drawer-nav a');

        if (!hamburgerBtn || !drawer) return;

        function openDrawer() {
            drawer.classList.add('active');
            drawerOverlay.classList.add('active');
            hamburgerBtn.classList.add('active');
            hamburgerBtn.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
            // 포커스 트랩
            drawerClose.focus();
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
        drawerClose.addEventListener('click', closeDrawer);
        drawerOverlay.addEventListener('click', closeDrawer);

        // 드로워 링크 클릭 시 닫기
        drawerLinks.forEach(link => {
            link.addEventListener('click', () => {
                closeDrawer();
                // 드로워 내 네비게이션 활성 상태 업데이트
                drawerLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });

        // ESC 키로 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && drawer.classList.contains('active')) {
                closeDrawer();
            }
        });

        // 섹션 변경 시 드로워 네비게이션 활성 상태 업데이트
        const sections = document.querySelectorAll('section[id]');
        const drawerNavObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.id;
                    drawerLinks.forEach(link => {
                        link.classList.toggle('active', link.getAttribute('data-section') === sectionId);
                    });
                }
            });
        }, { rootMargin: '-40% 0px -60% 0px', threshold: 0 });

        sections.forEach(section => drawerNavObserver.observe(section));
    }

    initMobileDrawer();

    // ==========================================
    // 9. Gallery Filter
    // ==========================================
    function initGalleryFilter() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        const galleryItems = document.querySelectorAll('.gallery-item[data-category]');

        if (!filterBtns.length || !galleryItems.length) return;

        filterBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const category = this.getAttribute('data-category');

                // 버튼 활성 상태 업데이트
                filterBtns.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-selected', 'false');
                });
                this.classList.add('active');
                this.setAttribute('aria-selected', 'true');

                // 갤러리 아이템 필터링
                galleryItems.forEach(item => {
                    const itemCategory = item.getAttribute('data-category');
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

    // ==========================================
    // 10. Timeline Interactive Modal
    // ==========================================
    function initTimelineModal() {
        const timelineItems = document.querySelectorAll('.timeline-item');
        const modal = document.getElementById('timelineModal');
        const modalClose = modal ? modal.querySelector('.modal-close') : null;
        const modalYear = document.getElementById('modalYear');
        const modalTitle = document.getElementById('modalTitle');
        const modalDescription = document.getElementById('modalDescription');

        if (!modal || !timelineItems.length) return;

        // 타임라인 상세 데이터
        const timelineData = {
            '1985': {
                title: '세계플라워 올림픽 동상 수상',
                description: '압화 공예의 국제적 인정을 받은 첫 해. 이 순간부터 "어떻게 하면 이 아름다움을 영원히 간직할 수 있을까?"라는 질문이 시작되었습니다.'
            },
            '1999': {
                title: '프레스코21 창립',
                description: '압화 산업화의 시작. 개인 작가 활동을 넘어, 더 많은 사람들에게 꽃의 아름다움을 전하기 위한 본격적인 여정의 첫걸음.'
            },
            '2002': {
                title: '실용신안특허 1호 취득',
                description: '가구표면 압화형성구조 (제 0294485호). 압화를 일상 속으로 가져오기 위한 첫 번째 기술적 혁신.'
            },
            '2005': {
                title: '중소기업진흥청장 표창 및 협회 창립',
                description: '"모범여성기업인" 인정과 함께 (사)한국압화교육문화협회를 창립. 개인의 성공을 넘어 산업 전체의 발전을 위한 토대 마련.'
            },
            '2009': {
                title: '국제 수상 연속',
                description: '중국 북경화훼박람회 우수상, 일본 요코하마 창조전 요미우리 신문사 사장상 수상. 한국 압화 공예의 국제적 위상 확립.'
            },
            '2010': {
                title: '국무총리 표창',
                description: '국가 문화산업 발전에 기여한 공로를 인정받아 국무총리 표창 수상. 30년 노력의 결실.'
            },
            '2018': {
                title: '서울대공원 투명 식물표본 전시관 설립',
                description: '30년 연구의 정점. 국내 최초로 투명 식물 표본 기술을 활용한 상설 전시관 개관. 매년 수십만 명의 방문객들이 자연의 아름다움을 경험합니다.'
            },
            '2020': {
                title: '표본 제작 방법 특허 등록',
                description: '제 10-2020-0044902호. 투명 식물 표본 기술의 핵심 특허 등록으로 기술력을 공식 인정받음.'
            },
            '2021': {
                title: '국립생물자원관 협업',
                description: '투명 식물 표본 전시 및 납품을 통해 국가 생물자원 보존에 기여. 과학과 예술의 만남.'
            },
            '2023': {
                title: '기업 협업 활성화',
                description: 'LG생활건강, 아모레퍼시픽과 산삼표본 등 제품 협업. 기술의 상업적 가치 입증.'
            },
            '2025': {
                title: '대한민국 문화산업 발전 기여상',
                description: '국회 문화체육관광위원회 수상. 40년간 대한민국 압화 및 플라워 공예 산업을 이끌어온 공로 인정.'
            }
        };

        let previousFocus = null;

        function openModal(year) {
            const data = timelineData[year];
            if (!data) return;

            modalYear.textContent = year;
            modalTitle.textContent = data.title;
            modalDescription.textContent = data.description;

            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            previousFocus = document.activeElement;
            modalClose.focus();
        }

        function closeModal() {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            if (previousFocus) previousFocus.focus();
        }

        // 타임라인 아이템 클릭
        timelineItems.forEach(item => {
            const yearElement = item.querySelector('.timeline-year h3');
            if (yearElement) {
                item.addEventListener('click', () => {
                    openModal(yearElement.textContent);
                });

                // 키보드 접근성
                item.setAttribute('tabindex', '0');
                item.setAttribute('role', 'button');
                item.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openModal(yearElement.textContent);
                    }
                });
            }
        });

        // 모달 닫기
        modalClose.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeModal();
            }
        });
    }

    initTimelineModal();

    // ==========================================
    // 11. Scroll-Driven Animations (Intersection Observer)
    // ==========================================
    function initScrollAnimations() {
        // 요소가 이미 뷰포트에 있는지 확인
        function isInViewport(el) {
            const rect = el.getBoundingClientRect();
            return rect.top < window.innerHeight && rect.bottom > 0;
        }

        const scrollRevealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('scroll-revealed');
                    scrollRevealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '50px 0px 0px 0px' });

        // 섹션 타이틀
        document.querySelectorAll('.section-title').forEach(el => {
            if (isInViewport(el)) {
                el.classList.add('scroll-revealed');
            } else {
                el.classList.add('animate-on-scroll');
                scrollRevealObserver.observe(el);
            }
        });

        // 카드들
        document.querySelectorAll('.value-card, .education-card, .international-card').forEach(el => {
            if (isInViewport(el)) {
                el.classList.add('scroll-revealed');
            } else {
                el.classList.add('animate-on-scroll');
                scrollRevealObserver.observe(el);
            }
        });

        // 타임라인 아이템 - 스크롤 시 하나씩 등장
        const timelineItems = document.querySelectorAll('.timeline-item');
        const timelineLine = document.querySelector('.timeline-line');
        let revealedCount = 0;

        function updateTimelineProgress() {
            if (timelineLine && timelineItems.length > 0) {
                const progress = (revealedCount / timelineItems.length) * 100;
                timelineLine.style.setProperty('--timeline-progress', `${progress}%`);
            }
        }

        const timelineObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.classList.add('scroll-revealed');
                        revealedCount++;
                        updateTimelineProgress();
                    }, 100);
                    timelineObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.3,
            rootMargin: '0px 0px -80px 0px'
        });

        timelineItems.forEach((el, index) => {
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

    // DOM 완전히 로드 후 실행
    if (document.readyState === 'complete') {
        initScrollAnimations();
    } else {
        window.addEventListener('load', initScrollAnimations);
    }

    // ==========================================
    // 12. Image Lazy Loading
    // ==========================================
    const images = document.querySelectorAll('img');
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    observer.unobserve(img);
                }
            });
        });

        images.forEach(img => {
            if (img.dataset.src) {
                imageObserver.observe(img);
            }
        });
    }

});

// ==========================================
// Additional CSS for Animations (can also be in CSS file)
// ==========================================
const style = document.createElement('style');
style.textContent = `
    .fade-in {
        opacity: 0;
        transform: translateY(20px);
    }

    .fade-in-visible {
        animation: fadeInUp 0.6s ease-out forwards;
    }

    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);
