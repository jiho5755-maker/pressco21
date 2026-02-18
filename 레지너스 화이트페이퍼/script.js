/* ========================================
   Resiners 화이트페이퍼 - 메이크샵 D4 개별페이지용
   IIFE 패턴으로 전역 변수 오염 방지
   주의: 템플릿 리터럴 내 ${var}는 \${var}로 이스케이프
   ======================================== */
(function() {
    'use strict';

    var root = document.getElementById('resiners-whitepaper');
    if (!root) return;

    /* ---- Chart.js VOCs 감소 그래프 ---- */
    var chartCanvas = root.querySelector('#resiners-voc-chart');
    if (chartCanvas && typeof Chart !== 'undefined') {
        new Chart(chartCanvas, {
            type: 'line',
            data: {
                labels: ['0', '5', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55', '60', '65'],
                datasets: [
                    {
                        label: 'Resiners Purair',
                        data: [9.99, 8.5, 6.8, 5.2, 3.9, 2.8, 1.9, 1.3, 0.9, 0.6, 0.5, 0.5, 0.5, 0.5],
                        borderColor: '#8ED8C8',
                        backgroundColor: 'rgba(142, 216, 200, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: '\uC77C\uBC18 \uACF5\uAE30\uCCAD\uC815\uAE30',
                        data: [9.99, 9.2, 8.1, 7.2, 6.4, 5.6, 4.9, 4.3, 3.7, 3.2, 2.8, 2.4, 2.0, 1.7],
                        borderColor: '#FFA07A',
                        backgroundColor: 'rgba(255, 160, 122, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        borderDash: [5, 5]
                    },
                    {
                        label: '\uACF5\uAE30\uCCAD\uC815\uAE30 \uC5C6\uC74C',
                        data: [9.99, 9.5, 9.1, 8.7, 8.3, 7.9, 7.5, 7.1, 6.7, 6.3, 5.9, 5.5, 5.1, 4.7],
                        borderColor: '#D3D3D3',
                        backgroundColor: 'rgba(211, 211, 211, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        borderDash: [10, 5]
                    },
                    {
                        label: '\uC548\uC804 \uAE30\uC900\uC120 (0.5 mg/m\u00B3)',
                        data: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
                        borderColor: '#90EE90',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Resiners Purair vs \uC77C\uBC18 \uACF5\uAE30\uCCAD\uC815\uAE30 vs \uACF5\uAE30\uCCAD\uC815\uAE30 \uC5C6\uC74C',
                        font: { size: 18, weight: 'bold' },
                        padding: 20
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        labels: { font: { size: 12 }, padding: 15 }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 11,
                        title: {
                            display: true,
                            text: 'TVOC \uB18D\uB3C4 (mg/m\u00B3)',
                            font: { size: 14, weight: 'bold' }
                        },
                        ticks: { stepSize: 1 }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '\uC2DC\uAC04 (\uBD84)',
                            font: { size: 14, weight: 'bold' }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }

    /* ---- 부드러운 스크롤 (이벤트 위임) ---- */
    root.addEventListener('click', function(e) {
        var anchor = e.target.closest('a[href^="#"]');
        if (!anchor) return;

        var targetId = anchor.getAttribute('href');
        var target = root.querySelector(targetId);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    /* ---- Intersection Observer: 스크롤 시 섹션 페이드인 ---- */
    var sections = root.querySelectorAll('.resiners-section');
    if (sections.length > 0 && 'IntersectionObserver' in window) {
        sections.forEach(function(section) {
            section.style.opacity = '0';
            section.style.transform = 'translateY(30px)';
            section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        });

        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        sections.forEach(function(section) {
            observer.observe(section);
        });
    }
})();
