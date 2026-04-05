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
    function router() {
        var hash = window.location.hash || '';
        var content = document.getElementById('app-content');
        content.innerHTML = '';

        // 동적 라우트 매칭
        if (hash === '' || hash === '#' || hash === '#/') {
            renderHome(content);
        } else if (hash === '#/tasks') {
            FloraTaskBoard.render(content);
        } else if (hash === '#/tasks/new') {
            FloraTaskCreate.render(content);
        } else if (hash.indexOf('#/tasks/') === 0) {
            var taskId = hash.replace('#/tasks/', '');
            FloraTaskDetail.render(content, taskId);
        } else if (hash === '#/calendar') {
            FloraCalendar.render(content);
        } else if (hash === '#/shipment') {
            FloraShipment.render(content);
        } else {
            renderHome(content);
        }

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

        // 사용자 + 대시보드 데이터 병렬 로드
        Promise.all([
            FloraAPI.getCurrentUser().catch(function () { return null; }),
            FloraAPI.getDashboard({ status: 'active', limit: 1 }).catch(function () { return {}; })
        ]).then(function (results) {
            var user = results[0];
            var data = results[1];
            var s = (data && data.summary) || {};
            renderHomeContent(container, user, s);
        });

        // 로딩 중 메뉴 표시
        renderHomeContent(container, null, null);
    }

    function renderHomeContent(container, user, summary) {
        container.innerHTML = '';

        // 인사
        if (user) {
            var greeting = document.createElement('div');
            greeting.className = 'home-greeting';
            greeting.textContent = user.name + '님, 안녕하세요';
            container.appendChild(greeting);
        }

        var menu = document.createElement('div');
        menu.className = 'home-menu';

        // 업무 보드
        var taskCard = document.createElement('button');
        taskCard.className = 'menu-card';
        taskCard.onclick = function () { window.location.hash = '#/tasks'; };
        var taskBadge = '';
        if (summary && summary.todo > 0) {
            taskBadge = '<span class="menu-badge">' + summary.todo + '</span>';
        }
        taskCard.innerHTML =
            '<span class="menu-icon">\uD83D\uDCCB</span>' +
            '<span class="menu-title">업무 보드 ' + taskBadge + '</span>' +
            '<span class="menu-desc">할일 관리 및 상태 변경</span>';
        menu.appendChild(taskCard);

        // 캘린더
        var calCard = document.createElement('button');
        calCard.className = 'menu-card';
        calCard.onclick = function () { window.location.hash = '#/calendar'; };
        calCard.innerHTML =
            '<span class="menu-icon">\uD83D\uDCC5</span>' +
            '<span class="menu-title">캘린더</span>' +
            '<span class="menu-desc">날짜별 업무 한눈에</span>';
        menu.appendChild(calCard);

        // 출고
        var shipCard = document.createElement('button');
        shipCard.className = 'menu-card';
        shipCard.onclick = function () { window.location.hash = '#/shipment'; };
        shipCard.innerHTML =
            '<span class="menu-icon">\uD83D\uDCE6</span>' +
            '<span class="menu-title">오늘의 출고</span>' +
            '<span class="menu-desc">출고 리스트 확인 및 완료 처리</span>';
        menu.appendChild(shipCard);

        // 새 업무 등록 (크게)
        var addCard = document.createElement('button');
        addCard.className = 'menu-card menu-card-add';
        addCard.onclick = function () { window.location.hash = '#/tasks/new'; };
        addCard.innerHTML =
            '<span class="menu-icon">+</span>' +
            '<span class="menu-title">새 업무 등록</span>' +
            '<span class="menu-desc">업무 요청 및 할당</span>';
        menu.appendChild(addCard);

        container.appendChild(menu);
    }

    // ── 시작 ──
    window.addEventListener('hashchange', router);
    router();
})();
