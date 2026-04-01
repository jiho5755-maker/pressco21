/* ============================================
   PRESSCO21 협회 제안서 페이지
   메이크샵 D4 호환: IIFE, var, \${} 이스케이프
   ============================================ */
(function() {
    'use strict';

    var DEFAULT_DATA = {
        code: 'AFFILIATION PARTNERSHIP',
        name: '꽃공예 협회',
        contact: '담당자와 협회 운영 방향에 맞춰 혜택, 이벤트, 인센티브 구간을 조정할 수 있습니다.',
        logo: '',
        discountRate: 10,
        members: 120,
        monthlyStudents: 24,
        avgOrderAmount: 45000,
        target1: 5000000,
        target2: 10000000,
        target3: 20000000,
        incentive1: 250000,
        incentive2: 500000,
        incentive3: 1200000
    };

    function init() {
        var state = readStateFromQuery();
        renderIdentity(state);
        renderTierTable(state);
        bindCalculator(state);
        updateCalculator(state);
    }

    function readStateFromQuery() {
        var params = new URLSearchParams(window.location.search);

        return {
            code: sanitizeText(params.get('code')) || DEFAULT_DATA.code,
            name: sanitizeText(params.get('name')) || DEFAULT_DATA.name,
            contact: sanitizeText(params.get('contact')) || DEFAULT_DATA.contact,
            logo: sanitizeUrl(params.get('logo')),
            discountRate: toNumber(params.get('discountRate'), DEFAULT_DATA.discountRate),
            members: toNumber(params.get('members'), DEFAULT_DATA.members),
            monthlyStudents: toNumber(params.get('monthlyStudents'), DEFAULT_DATA.monthlyStudents),
            avgOrderAmount: toNumber(params.get('avgOrderAmount'), DEFAULT_DATA.avgOrderAmount),
            target1: toNumber(params.get('target1'), DEFAULT_DATA.target1),
            target2: toNumber(params.get('target2'), DEFAULT_DATA.target2),
            target3: toNumber(params.get('target3'), DEFAULT_DATA.target3),
            incentive1: toNumber(params.get('incentive1'), DEFAULT_DATA.incentive1),
            incentive2: toNumber(params.get('incentive2'), DEFAULT_DATA.incentive2),
            incentive3: toNumber(params.get('incentive3'), DEFAULT_DATA.incentive3)
        };
    }

    function renderIdentity(state) {
        setText('apProposalCode', state.code);
        setText('apAffiliationName', state.name);
        setText('apAffiliationNameInline', state.name);
        setText('apAffiliationContact', state.contact);
        setText('apDiscountRate', formatNumber(state.discountRate) + '%');
        setText('apHeroTier1', formatCurrency(state.incentive1));

        document.title = state.name + ' 제안서 | PRESSCO21 포에버러브';

        var logoWrap = document.getElementById('apLogoWrap');
        var logoEl = document.getElementById('apAffiliationLogo');
        if (logoWrap && logoEl) {
            if (state.logo) {
                logoEl.src = state.logo;
                logoEl.alt = state.name + ' 로고';
                logoWrap.className = 'ap-hero__logo-wrap';
            } else {
                logoWrap.className = 'ap-hero__logo-wrap is-empty';
            }
        }
    }

    function renderTierTable(state) {
        var tbody = document.getElementById('apTierTableBody');
        if (!tbody) return;

        var rows = [
            { label: '1단계', target: state.target1, incentive: state.incentive1 },
            { label: '2단계', target: state.target2, incentive: state.incentive2 },
            { label: '3단계', target: state.target3, incentive: state.incentive3 }
        ];
        var html = '';
        var i;

        for (i = 0; i < rows.length; i++) {
            html += '<tr>';
            html += '<td>' + rows[i].label + '</td>';
            html += '<td>' + formatCurrency(rows[i].target) + '</td>';
            html += '<td>' + formatCurrency(rows[i].incentive) + '</td>';
            html += '</tr>';
        }

        tbody.innerHTML = html;
    }

    function bindCalculator(state) {
        setInputValue('apInputMembers', state.members);
        setInputValue('apInputMonthlyStudents', state.monthlyStudents);
        setInputValue('apInputAvgOrder', state.avgOrderAmount);

        bindInput('apInputMembers', function(value) {
            state.members = value;
            updateCalculator(state);
        });
        bindInput('apInputMonthlyStudents', function(value) {
            state.monthlyStudents = value;
            updateCalculator(state);
        });
        bindInput('apInputAvgOrder', function(value) {
            state.avgOrderAmount = value;
            updateCalculator(state);
        });
    }

    function bindInput(id, onChange) {
        var el = document.getElementById(id);
        if (!el) return;

        el.addEventListener('input', function() {
            onChange(toNumber(el.value, 0));
        });
    }

    function updateCalculator(state) {
        var annualAmount = Math.max(0, state.monthlyStudents) * Math.max(0, state.avgOrderAmount) * 12;
        var tier = getTier(annualAmount, state);
        var participationRate = state.members > 0 ? Math.round((state.monthlyStudents / state.members) * 1000) / 10 : 0;
        var insight = '현재 입력 기준으로 연간 ' + tier.label + ' 인센티브 구간을 기대할 수 있습니다. 협회원 월 참여율은 약 ' + formatNumber(participationRate) + '% 입니다.';

        setText('apResultAnnualAmount', formatCurrency(annualAmount));
        setText('apResultIncentive', formatCurrency(tier.incentive));
        setText('apResultTier', tier.label);
        setText('apRoiInsightLine', insight);
    }

    function getTier(annualAmount, state) {
        if (annualAmount >= state.target3) {
            return { label: '3단계', incentive: state.incentive3 };
        }
        if (annualAmount >= state.target2) {
            return { label: '2단계', incentive: state.incentive2 };
        }
        if (annualAmount >= state.target1) {
            return { label: '1단계', incentive: state.incentive1 };
        }
        return { label: '진입 전', incentive: 0 };
    }

    function sanitizeText(value) {
        return String(value || '').replace(/[<>]/g, '').trim();
    }

    function sanitizeUrl(value) {
        var text = String(value || '').trim();
        if (!/^https?:\/\//i.test(text)) return '';
        return text;
    }

    function toNumber(value, fallback) {
        var num = Number(String(value || '').replace(/[^\d.-]/g, ''));
        return isNaN(num) ? fallback : num;
    }

    function formatNumber(value) {
        return String(Math.round(Number(value) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function formatCurrency(value) {
        return formatNumber(value) + '원';
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) {
            el.textContent = value;
        }
    }

    function setInputValue(id, value) {
        var el = document.getElementById(id);
        if (el) {
            el.value = value;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
