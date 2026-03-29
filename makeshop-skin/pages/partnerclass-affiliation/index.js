/**
 * PRESSCO21 협회 전용 랜딩 페이지 (제안서)
 * CSS 스코핑: .affiliation-landing
 * 메이크샵 D4 호환: IIFE, var only, \${} 금지
 *
 * URL 파라미터 (어드민 제안서 빌더에서 생성):
 *   code           - 협회 코드 (예: KFAA)
 *   name           - 협회명
 *   contact        - 제안서 부제/담당자 정보
 *   logo           - 협회 로고 URL
 *   discountRate   - 할인율 (정수, 예: 10)
 *   members        - 협회원 수
 *   monthlyStudents - 월 예상 수강 인원
 *   avgOrderAmount - 평균 재료 구매액
 *   target1/2/3    - 인센티브 1/2/3단계 목표 금액
 *   incentive1/2/3 - 인센티브 1/2/3단계 지급 금액
 */
(function() {
    'use strict';

    /* ========================================
       1. 공통 모듈 바인딩
       ======================================== */
    var PC = window.PRESSCO21;
    var escapeHtml = PC && PC.util ? PC.util.escapeHtml : function(s) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(s || ''));
        return div.innerHTML;
    };
    var formatPrice = PC && PC.util ? PC.util.formatPrice : function(n) {
        return String(Number(n) || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '\uC6D0';
    };

    /* ========================================
       2. URL 파라미터 파싱
       ======================================== */
    function getParams() {
        var search = window.location.search || '';
        var params = {};
        if (!search) return params;
        var pairs = search.substring(1).split('&');
        var i, kv;
        for (i = 0; i < pairs.length; i++) {
            kv = pairs[i].split('=');
            if (kv.length === 2) {
                params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1].replace(/\+/g, ' '));
            }
        }
        return params;
    }

    function getNum(params, key, fallback) {
        var val = Number(params[key]);
        return isNaN(val) || val <= 0 ? fallback : val;
    }

    function getStr(params, key, fallback) {
        return params[key] ? String(params[key]).trim() : (fallback || '');
    }

    /* ========================================
       3. 데이터 모델 구성
       ======================================== */
    function buildModel(params) {
        var name = getStr(params, 'name', '');
        var code = getStr(params, 'code', '');
        var contact = getStr(params, 'contact', '');
        var logo = getStr(params, 'logo', '');
        var discountRate = getNum(params, 'discountRate', 0);
        var members = getNum(params, 'members', 120);
        var monthlyStudents = getNum(params, 'monthlyStudents', 24);
        var avgOrderAmount = getNum(params, 'avgOrderAmount', 45000);

        var tiers = [
            { step: 1, target: getNum(params, 'target1', 5000000), incentive: getNum(params, 'incentive1', 250000) },
            { step: 2, target: getNum(params, 'target2', 10000000), incentive: getNum(params, 'incentive2', 500000) },
            { step: 3, target: getNum(params, 'target3', 20000000), incentive: getNum(params, 'incentive3', 1200000) }
        ];

        /* 시뮬레이션 계산 */
        var monthlyTotal = monthlyStudents * avgOrderAmount;
        var monthlySaving = discountRate > 0 ? Math.round(monthlyTotal * discountRate / 100) : 0;

        /* 예상 인센티브 단계 판단 */
        var incentiveTier = 0;
        var i;
        for (i = tiers.length - 1; i >= 0; i--) {
            if (monthlyTotal >= tiers[i].target) {
                incentiveTier = tiers[i].step;
                break;
            }
        }

        return {
            name: name,
            code: code,
            contact: contact,
            logo: logo,
            discountRate: discountRate,
            members: members,
            monthlyStudents: monthlyStudents,
            avgOrderAmount: avgOrderAmount,
            tiers: tiers,
            monthlyTotal: monthlyTotal,
            monthlySaving: monthlySaving,
            incentiveTier: incentiveTier
        };
    }

    /* ========================================
       4. DOM 렌더링
       ======================================== */
    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function setHtml(id, html) {
        var el = document.getElementById(id);
        if (el) el.innerHTML = html;
    }

    function showEl(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = '';
    }

    function hideEl(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
    }

    function render(model) {
        /* --- 히어로 --- */
        if (model.name) {
            setText('alHeroTitle', model.name + '과 함께하는 특별한 파트너십');
        }
        if (model.contact) {
            setText('alHeroSubtitle', model.contact);
        }

        /* --- 협회 로고 --- */
        if (model.logo) {
            var logoEl = document.getElementById('alAffilLogo');
            var sepEl = document.getElementById('alLogoSep');
            if (logoEl) {
                logoEl.src = model.logo;
                logoEl.alt = escapeHtml(model.name) + ' \uB85C\uACE0';
                logoEl.style.display = '';
            }
            if (sepEl) sepEl.style.display = '';
        }

        /* --- 할인율 배지 --- */
        if (model.discountRate > 0) {
            setText('alDiscountRate', model.discountRate + '%');
            setText('alBenefit1Desc',
                '\uD611\uD68C\uC6D0 \uC778\uC99D \uC2DC \uC790\uC0AC\uBAAC \uC804 \uD488\uBAA9 ' + model.discountRate + '% \uD2B9\uBCC4 \uD560\uC778 \uC801\uC6A9. \uD0A4\uD2B8 \uAD6C\uC131 \uC2DC \uCD94\uAC00 \uD560\uC778 \uD61C\uD0DD\uAE4C\uC9C0 \uC81C\uACF5\uB429\uB2C8\uB2E4.');
        } else {
            setText('alDiscountRate', '\uD611\uC758');
            setText('alBenefit1Desc',
                '\uD611\uD68C\uC6D0 \uC778\uC99D \uC2DC \uC790\uC0AC\uBAAC \uC804 \uD488\uBAA9 \uD2B9\uBCC4 \uD560\uC778 \uC801\uC6A9. \uD0A4\uD2B8 \uAD6C\uC131 \uC2DC \uCD94\uAC00 \uD560\uC778 \uD61C\uD0DD\uAE4C\uC9C0 \uC81C\uACF5\uB429\uB2C8\uB2E4. \uAD6C\uCCB4\uC801\uC778 \uD560\uC778\uC728\uC740 \uC81C\uD734 \uC0C1\uB2F4 \uC2DC \uD611\uC758\uD569\uB2C8\uB2E4.');
        }

        /* --- 인센티브 단계 카드 --- */
        renderTierCards(model.tiers, model.incentiveTier);

        /* --- 시뮬레이션 --- */
        setText('alSimMembers', model.members + '\uBA85');
        setText('alSimStudents', model.monthlyStudents + '\uBA85');
        setText('alSimAvgOrder', formatPrice(model.avgOrderAmount));
        setText('alSimMonthlyTotal', formatPrice(model.monthlyTotal));

        if (model.monthlySaving > 0) {
            setText('alSimSaving', '\uC57D ' + formatPrice(model.monthlySaving) + ' \uC808\uAC10');
        } else {
            setText('alSimSaving', '\uD611\uC758 \uD6C4 \uC0B0\uC815');
        }

        if (model.incentiveTier > 0) {
            setText('alSimIncentiveTier', model.incentiveTier + '\uB2E8\uACC4 \uB2EC\uC131');
        } else {
            setText('alSimIncentiveTier', '\uBAA9\uD45C: 1\uB2E8\uACC4');
        }

        /* --- CTA 제목 동적 --- */
        if (model.name) {
            setText('alCtaTitle', model.name + '\uACFC \uD568\uAED8 \uC131\uC7A5\uD558\uB294 \uD30C\uD2B8\uB108\uC2ED\uC744 \uC2DC\uC791\uD574 \uBCF4\uC138\uC694');
        }

        /* --- CTA 노트 --- */
        if (model.code && model.code !== 'AFFILIATION PARTNERSHIP') {
            setText('alCtaNote', '\uC81C\uC548\uC11C \uCF54\uB4DC: ' + model.code + ' | \uBCF8 \uC81C\uC548\uC11C\uC758 \uC870\uAC74\uC740 \uD611\uC758\uC5D0 \uB530\uB77C \uC870\uC815\uB420 \uC218 \uC788\uC2B5\uB2C8\uB2E4.');
        }
    }

    function renderTierCards(tiers, activeTier) {
        var container = document.getElementById('alTierCards');
        if (!container) return;

        var html = '';
        var i, tier, stepLabels, isActive;
        stepLabels = ['1\uB2E8\uACC4', '2\uB2E8\uACC4', '3\uB2E8\uACC4'];

        for (i = 0; i < tiers.length; i++) {
            tier = tiers[i];
            isActive = (activeTier === tier.step);
            html += '<div class="al-tier-card' + (isActive ? ' al-tier-card--active' : '') + '">';
            html += '<p class="al-tier-card__step">' + escapeHtml(stepLabels[i]) + '</p>';
            html += '<p class="al-tier-card__target">\uC6D4 ' + formatPrice(tier.target) + ' \uC774\uC0C1</p>';
            html += '<p class="al-tier-card__incentive">' + formatPrice(tier.incentive) + '</p>';
            html += '</div>';
        }

        container.innerHTML = html;
    }

    /* ========================================
       5. 스크롤 애니메이션 (IntersectionObserver)
       ======================================== */
    function initScrollAnimations() {
        if (!window.IntersectionObserver) return;

        var sections = document.querySelectorAll('.affiliation-landing .al-section');
        if (!sections.length) return;

        var i;
        for (i = 0; i < sections.length; i++) {
            sections[i].style.opacity = '0';
            sections[i].style.transform = 'translateY(24px)';
            sections[i].style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        }

        var observer = new IntersectionObserver(function(entries) {
            var j;
            for (j = 0; j < entries.length; j++) {
                if (entries[j].isIntersecting) {
                    entries[j].target.style.opacity = '1';
                    entries[j].target.style.transform = 'translateY(0)';
                    observer.unobserve(entries[j].target);
                }
            }
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -40px 0px'
        });

        for (i = 0; i < sections.length; i++) {
            observer.observe(sections[i]);
        }
    }

    /* ========================================
       6. 페이지 타이틀 동적 변경
       ======================================== */
    function updatePageTitle(model) {
        if (model.name) {
            document.title = model.name + ' \uD30C\uD2B8\uB108\uC2ED \uC81C\uC548 | PRESSCO21 \uD3EC\uC5D0\uBC84\uB7EC\uBE0C';
        }
    }

    /* ========================================
       7. 초기화
       ======================================== */
    function init() {
        var params = getParams();
        var model = buildModel(params);

        render(model);
        updatePageTitle(model);
        initScrollAnimations();
    }

    /* DOM 준비 후 실행 */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
