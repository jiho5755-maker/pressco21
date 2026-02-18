/* ==========================================
   Common JavaScript (자사몰 공통 JS)
   ========================================== */

document.addEventListener('DOMContentLoaded', function() {

    // ==========================================
    // Header/Navigation (자사몰 공통 기능)
    // ==========================================

    // NOTE: 자사몰의 실제 헤더 기능을 여기에 추가하세요.
    // 예: 메뉴 토글, 검색, 모바일 네비게이션 등

    // ==========================================
    // Example: Mobile Menu Toggle
    // ==========================================
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');

    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', function() {
            mobileMenu.classList.toggle('active');
        });
    }

    // Close mobile menu when a link is clicked
    const menuLinks = document.querySelectorAll('.mobile-menu a');
    menuLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (mobileMenu) {
                mobileMenu.classList.remove('active');
            }
        });
    });

    // ==========================================
    // Example: Search Functionality
    // ==========================================
    const searchForm = document.querySelector('.search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // Add search functionality here
        });
    }

});

// ==========================================
// Utility Functions
// ==========================================

/**
 * Debounce function to limit function calls
 * @param {Function} func - The function to debounce
 * @param {Number} wait - The wait time in milliseconds
 * @returns {Function}
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function to limit function calls
 * @param {Function} func - The function to throttle
 * @param {Number} limit - The throttle limit in milliseconds
 * @returns {Function}
 */
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/* ==========================================
   자사몰 공통 JavaScript (통합됨)
   ========================================== */

// 입력폼 class 자동 추가
document.addEventListener("DOMContentLoaded", () => {
    const labels = document.querySelectorAll('label');
    if (labels.length) {
        labels.forEach(label => label.classList.add('form-check-label'));
    }

    const inputs = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
    if (inputs.length) {
        inputs.forEach(input => input.classList.add('form-check-input'));
    }

    const textInputs = document.querySelectorAll('input[type="text"], input[type="password"], input[type="date"], textarea');
    if (textInputs.length) {
        textInputs.forEach(textfield => textfield.classList.add('cw-textfield'));
    }

    const selects = document.querySelectorAll('select');
    if (selects.length) {
        selects.forEach(select => select.classList.add('cw-select-box'));
    }
});

// 스킨 반응형 (jQuery 사용)
if (typeof jQuery !== 'undefined') {
    $(function() {
        var $topBanner = $('#topbanner');
        var $container = $('#container');
        if (!$topBanner.length || !$container.length) return;

        function adjustPadding() {
            var paddingTop = ($(window).width() >= 768) ? '0' : '104px';
            $container.css('padding-top', paddingTop);
        }

        var resizeTimer;
        $(window).on('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(adjustPadding, 100);
        });

        adjustPadding();
    });
}

/* NOTE: 실제 production 배포 시에는 자사몰의 전체 JS 파일을 여기에 통합하세요.
   현재는 시안 제작을 위해 핵심 기능만 포함되어 있습니다. */
