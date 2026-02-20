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

})(); /* END IIFE */
