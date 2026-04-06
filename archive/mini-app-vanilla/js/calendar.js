/**
 * Flora 미니앱 — 캘린더 뷰
 * 주간 뷰: 날짜별 업무 한눈에
 */
var FloraCalendar = (function () {
    'use strict';

    var state = {
        weekStart: null, // 월요일 Date
        tasks: [],
        loading: false
    };

    var DAYS = ['일', '월', '화', '수', '목', '금', '토'];

    function render(container) {
        FloraUI.renderHeader('캘린더', FloraUI.todayStr(),
            '<button class="btn-icon refresh-btn" id="cal-refresh">&#8635;</button>');
        document.getElementById('cal-refresh').onclick = function () {
            loadWeek(container);
        };

        // 이번 주 월요일 계산
        var now = new Date();
        var day = now.getDay();
        var diff = (day === 0 ? -6 : 1 - day);
        state.weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);

        loadWeek(container);
    }

    function loadWeek(container) {
        state.loading = true;
        FloraUI.renderLoading(container);

        FloraAPI.getDashboard({ status: 'active', limit: 100, sort: 'operations' })
            .then(function (data) {
                state.tasks = (data.explorer && data.explorer.items) || [];
                state.loading = false;
                renderContent(container);
            })
            .catch(function (err) {
                state.loading = false;
                FloraUI.renderError(container, err.message, function () {
                    loadWeek(container);
                });
            });
    }

    function renderContent(container) {
        container.innerHTML = '';

        // 주간 네비게이션
        var nav = document.createElement('div');
        nav.className = 'cal-nav';

        var prevBtn = document.createElement('button');
        prevBtn.className = 'btn-icon';
        prevBtn.textContent = '\u25C0';
        prevBtn.onclick = function () {
            state.weekStart = new Date(state.weekStart.getTime() - 7 * 86400000);
            loadWeek(container);
        };

        var weekLabel = document.createElement('span');
        weekLabel.className = 'cal-week-label';
        var ws = state.weekStart;
        var we = new Date(ws.getTime() + 6 * 86400000);
        weekLabel.textContent = formatShort(ws) + ' ~ ' + formatShort(we);

        var nextBtn = document.createElement('button');
        nextBtn.className = 'btn-icon';
        nextBtn.textContent = '\u25B6';
        nextBtn.onclick = function () {
            state.weekStart = new Date(state.weekStart.getTime() + 7 * 86400000);
            loadWeek(container);
        };

        var todayBtn = document.createElement('button');
        todayBtn.className = 'btn btn-outline btn-sm';
        todayBtn.textContent = '오늘';
        todayBtn.onclick = function () {
            var now = new Date();
            var day = now.getDay();
            var diff = (day === 0 ? -6 : 1 - day);
            state.weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
            loadWeek(container);
        };

        nav.appendChild(prevBtn);
        nav.appendChild(weekLabel);
        nav.appendChild(nextBtn);
        nav.appendChild(todayBtn);
        container.appendChild(nav);

        // 요일 헤더 + 날짜별 태스크
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        for (var i = 0; i < 7; i++) {
            var date = new Date(state.weekStart.getTime() + i * 86400000);
            var dateKey = toDateKey(date);
            var isToday = date.getTime() === today.getTime();
            var isWeekend = (date.getDay() === 0 || date.getDay() === 6);

            var dayTasks = state.tasks.filter(function (t) {
                return t.dueAt && toDateKey(new Date(t.dueAt)) === dateKey;
            });

            var section = document.createElement('div');
            section.className = 'cal-day' + (isToday ? ' cal-today' : '') + (isWeekend ? ' cal-weekend' : '');

            var header = document.createElement('div');
            header.className = 'cal-day-header';
            header.innerHTML =
                '<span class="cal-day-name">' + DAYS[date.getDay()] + '</span>' +
                '<span class="cal-day-date">' + (date.getMonth() + 1) + '/' + date.getDate() + '</span>' +
                (dayTasks.length > 0 ? '<span class="cal-day-count">' + dayTasks.length + '건</span>' : '');
            section.appendChild(header);

            if (dayTasks.length > 0) {
                dayTasks.sort(function (a, b) {
                    var po = { p1: 0, p2: 1, p3: 2, p4: 3 };
                    return (po[a.priority] || 2) - (po[b.priority] || 2);
                });

                dayTasks.forEach(function (task) {
                    var card = document.createElement('div');
                    card.className = 'cal-task';
                    card.onclick = function () {
                        window.location.hash = '#/tasks/' + task.id;
                    };
                    card.innerHTML =
                        '<span class="cal-task-priority badge-dot badge-dot-' + task.priority + '"></span>' +
                        '<span class="cal-task-title">' + FloraUI.escapeHtml(task.title) + '</span>' +
                        (task.assignee ? '<span class="cal-task-assignee">' + FloraUI.escapeHtml(task.assignee) + '</span>' : '');
                    section.appendChild(card);
                });
            } else if (!isWeekend) {
                var empty = document.createElement('div');
                empty.className = 'cal-day-empty';
                empty.textContent = '-';
                section.appendChild(empty);
            }

            container.appendChild(section);
        }

        // 마감일 없는 태스크
        var noDue = state.tasks.filter(function (t) { return !t.dueAt; });
        if (noDue.length > 0) {
            var noDateSection = document.createElement('div');
            noDateSection.className = 'cal-day cal-nodate';

            var noDateHeader = document.createElement('div');
            noDateHeader.className = 'cal-day-header';
            noDateHeader.innerHTML =
                '<span class="cal-day-name">미정</span>' +
                '<span class="cal-day-count">' + noDue.length + '건</span>';
            noDateSection.appendChild(noDateHeader);

            noDue.slice(0, 5).forEach(function (task) {
                var card = document.createElement('div');
                card.className = 'cal-task';
                card.onclick = function () {
                    window.location.hash = '#/tasks/' + task.id;
                };
                card.innerHTML =
                    '<span class="cal-task-priority badge-dot badge-dot-' + task.priority + '"></span>' +
                    '<span class="cal-task-title">' + FloraUI.escapeHtml(task.title) + '</span>';
                noDateSection.appendChild(card);
            });
            if (noDue.length > 5) {
                var more = document.createElement('div');
                more.className = 'cal-day-empty';
                more.textContent = '... 외 ' + (noDue.length - 5) + '건';
                noDateSection.appendChild(more);
            }

            container.appendChild(noDateSection);
        }
    }

    function toDateKey(d) {
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    function formatShort(d) {
        return (d.getMonth() + 1) + '/' + d.getDate();
    }

    return { render: render };
})();
