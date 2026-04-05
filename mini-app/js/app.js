/**
 * Flora 미니앱 엔트리 — 라우터 + 텔레그램 WebApp 초기화
 */
(function () {
    'use strict';

    var tg = window.Telegram && window.Telegram.WebApp;

    // ── 텔레그램 WebApp 초기화 ──
    if (tg) {
        tg.ready();
        tg.expand();

        // 뒤로가기 버튼
        tg.BackButton.onClick(function () {
            var hash = window.location.hash || '';
            if (hash && hash !== '#/' && hash !== '#') {
                window.location.hash = '#/';
            } else {
                tg.close();
            }
        });
    }

    // ── 해시 라우터 ──
    var routes = {
        '': renderHome,
        '#': renderHome,
        '#/': renderHome,
        '#/shipment': FloraShipment.render,
        '#/tasks': FloraTaskBoard.render
    };

    function router() {
        var hash = window.location.hash || '';
        var renderFn = routes[hash] || renderHome;
        var content = document.getElementById('app-content');
        content.innerHTML = '';

        renderFn(content);

        // 뒤로가기 버튼 제어
        if (tg) {
            if (!hash || hash === '#' || hash === '#/') {
                tg.BackButton.hide();
            } else {
                tg.BackButton.show();
            }
        }
    }

    // ── 홈 화면 ──
    function renderHome(container) {
        FloraUI.renderHeader('Flora 업무도구', FloraUI.todayStr());

        // 태스크 요약 로드
        FloraAPI.getDashboard({ status: 'active', limit: 1 })
            .then(function (data) {
                var s = data.summary || {};
                renderHomeMenu(container, s);
            })
            .catch(function () {
                renderHomeMenu(container, {});
            });

        // 로딩 중 일단 메뉴 표시
        renderHomeMenu(container, null);
    }

    function renderHomeMenu(container, summary) {
        container.innerHTML = '';

        var menu = document.createElement('div');
        menu.className = 'home-menu';

        // 출고 카드
        var shipCard = document.createElement('button');
        shipCard.className = 'menu-card';
        shipCard.onclick = function () { window.location.hash = '#/shipment'; };
        shipCard.innerHTML =
            '<span class="menu-icon">\uD83D\uDCE6</span>' +
            '<span class="menu-title">오늘의 출고</span>' +
            '<span class="menu-desc">출고 리스트 확인 및 완료 처리</span>';
        menu.appendChild(shipCard);

        // 태스크 카드
        var taskCard = document.createElement('button');
        taskCard.className = 'menu-card';
        taskCard.onclick = function () { window.location.hash = '#/tasks'; };
        var badgeHtml = '';
        if (summary && summary.todo > 0) {
            badgeHtml = '<span class="menu-badge">' + summary.todo + '</span>';
        }
        taskCard.innerHTML =
            '<span class="menu-icon">\uD83D\uDCCB</span>' +
            '<span class="menu-title">태스크 보드 ' + badgeHtml + '</span>' +
            '<span class="menu-desc">할일 관리 및 상태 변경</span>';
        menu.appendChild(taskCard);

        container.appendChild(menu);
    }

    // ── 시작 ──
    window.addEventListener('hashchange', router);
    router();
})();
