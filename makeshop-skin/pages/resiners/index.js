/* ========================================
   Resiners 화이트페이퍼 - 메이크샵 D4 개별페이지용
   IIFE 패턴으로 전역 변수 오염 방지
   주의: 템플릿 리터럴 내 ${var}는 \${var}로 이스케이프
   ======================================== */
(function() {
    'use strict';

    var root = document.getElementById('resiners-whitepaper');
    if (!root) return;

    /* ---- Chart.js VOCs 감소 그래프 (절대 삭제 금지) ---- */
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
                        borderColor: '#7d9675',
                        backgroundColor: 'rgba(125, 150, 117, 0.08)',
                        borderWidth: 2.5,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#7d9675',
                        pointRadius: 3,
                        pointHoverRadius: 5
                    },
                    {
                        label: '\uC77C\uBC18 \uACF5\uAE30\uCCAD\uC815\uAE30',
                        data: [9.99, 9.2, 8.1, 7.2, 6.4, 5.6, 4.9, 4.3, 3.7, 3.2, 2.8, 2.4, 2.0, 1.7],
                        borderColor: '#c8a96e',
                        backgroundColor: 'rgba(200, 169, 110, 0.05)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        borderDash: [5, 5],
                        pointBackgroundColor: '#c8a96e',
                        pointRadius: 3,
                        pointHoverRadius: 5
                    },
                    {
                        label: '\uACF5\uAE30\uCCAD\uC815\uAE30 \uC5C6\uC74C',
                        data: [9.99, 9.5, 9.1, 8.7, 8.3, 7.9, 7.5, 7.1, 6.7, 6.3, 5.9, 5.5, 5.1, 4.7],
                        borderColor: '#b8b8b0',
                        backgroundColor: 'rgba(184, 184, 176, 0.05)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        borderDash: [10, 5],
                        pointBackgroundColor: '#b8b8b0',
                        pointRadius: 3,
                        pointHoverRadius: 5
                    },
                    {
                        label: '\uC548\uC804 \uAE30\uC900\uC120 (0.5 mg/m\u00B3)',
                        data: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
                        borderColor: '#a8bf9e',
                        borderWidth: 1.5,
                        borderDash: [4, 4],
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'TVOC \uBE44\uAD50: Resiners Purair vs \uC77C\uBC18 \uACF5\uAE30\uCCAD\uC815\uAE30 vs \uACF5\uAE30\uCCAD\uC815\uAE30 \uC5C6\uC74C',
                        font: {
                            size: 14,
                            weight: '600',
                            family: "'Pretendard', 'Noto Sans KR', sans-serif"
                        },
                        color: '#2c3e30',
                        padding: { bottom: 20 }
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: {
                                size: 12,
                                family: "'Pretendard', 'Noto Sans KR', sans-serif"
                            },
                            padding: 20,
                            color: '#3d4a38',
                            usePointStyle: true,
                            pointStyleWidth: 16
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(44, 62, 48, 0.92)',
                        titleFont: {
                            size: 12,
                            family: "'Pretendard', 'Noto Sans KR', sans-serif"
                        },
                        bodyFont: {
                            size: 12,
                            family: "'Pretendard', 'Noto Sans KR', sans-serif"
                        },
                        padding: 12,
                        callbacks: {
                            /* 툴팁 단위 표시 */
                            label: function(context) {
                                return ' ' + context.dataset.label + ': ' + context.parsed.y + ' mg/m\u00B3';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 11,
                        grid: {
                            color: 'rgba(200, 196, 188, 0.4)',
                            drawBorder: false
                        },
                        title: {
                            display: true,
                            text: 'TVOC \uB18D\uB3C4 (mg/m\u00B3)',
                            font: {
                                size: 12,
                                weight: '600',
                                family: "'Pretendard', 'Noto Sans KR', sans-serif"
                            },
                            color: '#6b7566'
                        },
                        ticks: {
                            stepSize: 1,
                            color: '#6b7566',
                            font: {
                                size: 11,
                                family: "'Pretendard', 'Noto Sans KR', sans-serif"
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(200, 196, 188, 0.3)',
                            drawBorder: false
                        },
                        title: {
                            display: true,
                            text: '\uC2DC\uAC04 (\uBD84)',
                            font: {
                                size: 12,
                                weight: '600',
                                family: "'Pretendard', 'Noto Sans KR', sans-serif"
                            },
                            color: '#6b7566'
                        },
                        ticks: {
                            color: '#6b7566',
                            font: {
                                size: 11,
                                family: "'Pretendard', 'Noto Sans KR', sans-serif"
                            }
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
            section.style.transform = 'translateY(24px)';
            section.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
        });

        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08 });

        sections.forEach(function(section) {
            observer.observe(section);
        });
    }

    /* ---- PDF 내보내기 함수 ---- */
    /* window.print() 기반 인쇄/PDF 저장 기능 */
    /* @media print 스타일(style.css)과 연동하여 깔끔한 PDF 출력 */
    function printWhitepaper() {
        /* 인쇄 전 사용자에게 안내 */
        var printInfo = '이 페이지를 PDF로 저장하려면:\n\n' +
            '1. 인쇄 대화상자에서 "PDF로 저장" 또는\n' +
            '   "Microsoft Print to PDF"를 선택하세요.\n\n' +
            '2. Chrome/Edge: 인쇄 대화상자 > 대상: "PDF로 저장"\n' +
            '   Safari: 파일 > PDF로 내보내기\n\n' +
            '계속하시겠습니까?';

        if (window.confirm(printInfo)) {
            /* 인쇄 타이틀 임시 변경 */
            var originalTitle = document.title;
            document.title = 'Resiners Clear Space White Paper 2025';

            /* 인쇄 실행 */
            window.print();

            /* 타이틀 복원 */
            document.title = originalTitle;
        }
    }

    /* 전역 노출: 메이크샵 HTML에서 onclick="window.printWhitepaper()" 형태로 접근 가능 */
    window.printWhitepaper = printWhitepaper;

    /* ---- Schema.org Article 구조화 데이터 동적 삽입 ---- */
    /* 메이크샵에서 JSON-LD 내 중괄호가 치환코드로 오인되는 문제를 */
    /* JavaScript에서 동적으로 생성하여 회피 */
    (function injectSchema() {
        /* 이미 삽입된 경우 중복 방지 */
        if (document.querySelector('script[data-resiners-schema]')) return;

        /* Schema.org Article 데이터 객체 구성 */
        var schemaData = {
            '@context': 'https://schema.org',
            '@type': 'Article',
            'headline': 'Resiners Clear Space White Paper 2025 — 레진 아트 스튜디오 공기질 산업 보고서',
            'description': 'SGS 인증 83.59% VOCs 제거율을 달성한 Resiners Purair. 레진 아티스트를 위한 최초의 레진 특화 공기청정기 기술 백서. 과학적 실험 데이터와 전문가 검증을 포함합니다.',
            'image': 'https://foreverlove.co.kr/resiners-whitepaper-og.jpg',
            'datePublished': '2025-01-01',
            'dateModified': '2025-06-01',
            'author': {
                '@type': 'Organization',
                'name': 'Resiners',
                'url': 'https://foreverlove.co.kr'
            },
            'publisher': {
                '@type': 'Organization',
                'name': 'PRESSCO21',
                'url': 'https://foreverlove.co.kr',
                'logo': {
                    '@type': 'ImageObject',
                    'url': 'https://foreverlove.co.kr/logo.png'
                }
            },
            'mainEntityOfPage': {
                '@type': 'WebPage',
                'url': 'https://foreverlove.co.kr/resiners-whitepaper'
            },
            'about': {
                '@type': 'Thing',
                'name': 'Resiners Purair 공기청정기',
                'description': '레진 아트 스튜디오를 위한 VOCs 특화 공기청정기'
            },
            'keywords': 'Resiners, Purair, 공기청정기, VOCs, 레진 아트, 에폭시 레진, AS-Sorb, HEPA, 실내 공기질',
            'inLanguage': 'ko-KR'
        };

        /* JSON-LD 스크립트 엘리먼트 생성 및 삽입 */
        var scriptEl = document.createElement('script');
        scriptEl.type = 'application/ld+json';
        scriptEl.setAttribute('data-resiners-schema', 'article');
        scriptEl.textContent = JSON.stringify(schemaData, null, 2);
        document.head.appendChild(scriptEl);
    })();

})();
