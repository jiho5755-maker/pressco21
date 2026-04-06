/**
 * Flora 미니앱 — 태스크 보드 v2
 * 내 업무/팀 전체 토글 + 상태 4단계 + 빠른 필터
 */
var FloraTaskBoard = (function () {
    'use strict';

    var state = {
        tab: 'active',
        viewMode: 'my',       // my | team
        filter: 'all',        // all | urgent | today | review | requested
        tasks: [],
        summary: null,
        loading: false,
        myName: null
    };

    var TABS = [
        { key: 'active', label: '할일', statuses: ['todo', 'needs_check', 'in_progress'] },
        { key: 'review', label: '검토', statuses: ['needs_check'] },
        { key: 'done', label: '완료', statuses: ['done', 'resolved'] }
    ];

    var FILTERS = [
        { key: 'all', label: '전체' },
        { key: 'urgent', label: '긴급' },
        { key: 'today', label: '오늘' },
        { key: 'review', label: '검토대기' },
        { key: 'requested', label: '내가 요청' }
    ];

    function render(container) {
        FloraUI.renderHeader('업무 보드', FloraUI.todayStr(),
            '<div style="display:flex;gap:8px">' +
            '<button class="btn-icon" id="tb-add" title="새 업무">+</button>' +
            '<button class="btn-icon refresh-btn" id="tb-refresh">&#8635;</button>' +
            '</div>');

        document.getElementById('tb-refresh').onclick = function () {
            loadTasks(container);
        };
        document.getElementById('tb-add').onclick = function () {
            window.location.hash = '#/tasks/new';
        };

        // 홈에서 필터 힌트가 왔으면 적용
        if (window._floraFilterHint) {
            state.filter = window._floraFilterHint;
            state.tab = 'active';
            delete window._floraFilterHint;
        }

        // 사용자 정보 로드
        FloraAPI.getCurrentUser().then(function (user) {
            state.myName = user ? user.name : null;
            loadTasks(container);
        }).catch(function () {
            state.myName = null;
            loadTasks(container);
        });
    }

    function loadTasks(container) {
        state.loading = true;
        FloraUI.renderLoading(container);

        var status = state.tab === 'done' ? 'done' : 'active';
        FloraAPI.getDashboard({ status: status, limit: 100, sort: 'operations' })
            .then(function (data) {
                state.tasks = (data.explorer && data.explorer.items) || [];
                state.summary = data.summary || {};
                state.loading = false;
                renderContent(container);
            })
            .catch(function (err) {
                state.loading = false;
                FloraUI.renderError(container, err.message, function () {
                    loadTasks(container);
                });
            });
    }

    function filteredTasks() {
        var tasks = state.tasks;
        var tab = TABS.find(function (t) { return t.key === state.tab; });

        // 탭별 상태 필터
        if (tab && state.tab !== 'active') {
            tasks = tasks.filter(function (t) {
                return tab.statuses.indexOf(t.status) !== -1;
            });
        }

        // 내 업무 / 팀 전체
        if (state.viewMode === 'my' && state.myName) {
            tasks = tasks.filter(function (t) {
                return t.assignee === state.myName;
            });
        }

        // 빠른 필터
        switch (state.filter) {
            case 'urgent':
                tasks = tasks.filter(function (t) { return t.priority === 'p1'; });
                break;
            case 'today':
                var todayKey = toDateKey(new Date());
                tasks = tasks.filter(function (t) {
                    return t.dueAt && toDateKey(new Date(t.dueAt)) === todayKey;
                });
                break;
            case 'waiting':
                tasks = tasks.filter(function (t) { return t.status === 'waiting'; });
                break;
            case 'review':
                tasks = tasks.filter(function (t) { return t.status === 'needs_check'; });
                break;
            case 'requested':
                tasks = tasks.filter(function (t) {
                    var details = t.detailsJson || {};
                    return details.createdBy === state.myName;
                });
                break;
        }

        return tasks;
    }

    function toDateKey(d) {
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    function renderContent(container) {
        container.innerHTML = '';

        // ── 내 업무 / 팀 전체 토글 ──
        var viewToggle = document.createElement('div');
        viewToggle.className = 'view-toggle';

        var myBtn = document.createElement('button');
        myBtn.className = 'toggle-btn' + (state.viewMode === 'my' ? ' active' : '');
        myBtn.textContent = '내 업무';
        myBtn.onclick = function () {
            state.viewMode = 'my';
            renderContent(container);
        };

        var teamBtn = document.createElement('button');
        teamBtn.className = 'toggle-btn' + (state.viewMode === 'team' ? ' active' : '');
        teamBtn.textContent = '팀 전체';
        teamBtn.onclick = function () {
            state.viewMode = 'team';
            renderContent(container);
        };

        viewToggle.appendChild(myBtn);
        viewToggle.appendChild(teamBtn);

        if (!state.myName) {
            state.viewMode = 'team';
            teamBtn.classList.add('active');
            myBtn.classList.remove('active');
        }

        container.appendChild(viewToggle);

        // ── 요약 (클릭 시 해당 조건 필터) ──
        if (state.summary) {
            var summary = document.createElement('div');
            summary.className = 'summary-row';

            var summaryItems = [
                { key: 'all', count: state.summary.todo || 0, label: '할일' },
                { key: 'waiting', count: state.summary.waiting || 0, label: '대기' },
                { key: 'today', count: state.summary.today || 0, label: '오늘' },
                { key: 'urgent', count: state.summary.topPriority || 0, label: '긴급' }
            ];

            summaryItems.forEach(function (item) {
                var el = document.createElement('button');
                el.className = 'summary-item' + (state.filter === item.key ? ' summary-active' : '');
                el.innerHTML =
                    '<div class="summary-num">' + item.count + '</div>' +
                    '<div class="summary-label">' + item.label + '</div>';
                el.onclick = function () {
                    if (state.filter === item.key) {
                        state.filter = 'all';
                    } else {
                        state.filter = item.key;
                    }
                    state.tab = 'active';
                    renderContent(container);
                };
                summary.appendChild(el);
            });

            container.appendChild(summary);
        }

        // ── 탭 바 ──
        var tabBar = document.createElement('div');
        tabBar.className = 'tab-bar';
        TABS.forEach(function (tab) {
            var btn = document.createElement('button');
            btn.className = 'tab-btn' + (state.tab === tab.key ? ' active' : '');
            btn.textContent = tab.label;
            btn.onclick = function () {
                state.tab = tab.key;
                if (tab.key === 'done') {
                    loadTasks(container);
                } else {
                    renderContent(container);
                }
            };
            tabBar.appendChild(btn);
        });
        container.appendChild(tabBar);

        // ── 빠른 필터 ──
        if (state.tab !== 'done') {
            var filterBar = document.createElement('div');
            filterBar.className = 'filter-bar';
            FILTERS.forEach(function (f) {
                var chip = document.createElement('button');
                chip.className = 'chip' + (state.filter === f.key ? ' active' : '');
                chip.textContent = f.label;
                chip.onclick = function () {
                    state.filter = f.key;
                    renderContent(container);
                };
                filterBar.appendChild(chip);
            });
            container.appendChild(filterBar);
        }

        // ── 태스크 리스트 ──
        var tasks = filteredTasks();
        if (tasks.length === 0) {
            FloraUI.renderEmpty(container,
                state.tab === 'done' ? '\u2705' : '\u2728',
                state.viewMode === 'my' ? '내 업무가 없습니다' : '등록된 업무가 없습니다'
            );
            return;
        }

        var list = document.createElement('div');
        list.className = 'task-list';
        tasks.forEach(function (task) {
            list.appendChild(renderTaskCard(task, container));
        });
        container.appendChild(list);
    }

    function renderTaskCard(task, container) {
        var isDone = task.status === 'done' || task.status === 'resolved';
        var card = document.createElement('div');
        card.className = 'task-card' + (isDone ? ' done' : '');

        var body = document.createElement('div');
        body.className = 'task-card-body';
        body.onclick = function () {
            window.location.hash = '#/tasks/' + task.id;
        };

        var titleEl = document.createElement('div');
        titleEl.className = 'task-card-title';
        titleEl.textContent = task.title;
        body.appendChild(titleEl);

        var meta = document.createElement('div');
        meta.className = 'task-card-meta';
        meta.innerHTML = FloraUI.priorityBadge(task.priority);

        // 상태 표시 (진행/검토만 — 할일은 기본이라 안 보여줌)
        if (task.status === 'in_progress') {
            meta.innerHTML += '<span class="badge badge-status badge-active">진행중</span>';
        } else if (task.status === 'needs_check') {
            meta.innerHTML += '<span class="badge badge-status badge-review">검토</span>';
        }

        if (task.assignee && state.viewMode === 'team') {
            meta.innerHTML += '<span class="badge badge-assignee">' +
                FloraUI.escapeHtml(task.assignee) + '</span>';
        }
        if (task.dueAt) {
            var overdue = !isDone && FloraUI.isOverdue(task.dueAt);
            meta.innerHTML += '<span class="badge ' + (overdue ? 'badge-overdue' : 'badge-status') + '">' +
                FloraUI.formatDate(task.dueAt) + (overdue ? ' 지남' : '') + '</span>';
        }
        if (task.relatedProject) {
            meta.innerHTML += '<span class="badge badge-status">' +
                FloraUI.escapeHtml(task.relatedProject) + '</span>';
        }
        body.appendChild(meta);
        card.appendChild(body);

        // 빠른 상태 변경 (할일→시작, 진행→검토, 검토→완료)
        if (!isDone) {
            var quickBtn = document.createElement('button');
            quickBtn.className = 'task-quick-btn';

            if (task.status === 'todo') {
                quickBtn.textContent = '시작';
                quickBtn.onclick = function (e) {
                    e.stopPropagation();
                    quickUpdate(task.id, 'in_progress', container);
                };
            } else if (task.status === 'in_progress') {
                quickBtn.textContent = '검토';
                quickBtn.classList.add('review');
                quickBtn.onclick = function (e) {
                    e.stopPropagation();
                    quickUpdate(task.id, 'needs_check', container);
                };
            } else if (task.status === 'needs_check') {
                quickBtn.textContent = '완료';
                quickBtn.classList.add('complete');
                quickBtn.onclick = function (e) {
                    e.stopPropagation();
                    quickUpdate(task.id, 'done', container);
                };
            } else {
                quickBtn.textContent = '완료';
                quickBtn.classList.add('complete');
                quickBtn.onclick = function (e) {
                    e.stopPropagation();
                    quickUpdate(task.id, 'done', container);
                };
            }

            card.appendChild(quickBtn);
        }

        return card;
    }

    function quickUpdate(taskId, newStatus, container) {
        var prev = null;
        state.tasks.forEach(function (t) {
            if (t.id === taskId) { prev = t.status; t.status = newStatus; }
        });
        renderContent(container);

        FloraAPI.patchTask(taskId, { status: newStatus })
            .then(function () {
                FloraUI.showToast(FloraUI.statusLabel(newStatus) + ' 처리됨', '되돌리기', function () {
                    quickUpdate(taskId, prev, container);
                }, 3000);
            })
            .catch(function (err) {
                state.tasks.forEach(function (t) {
                    if (t.id === taskId) t.status = prev;
                });
                renderContent(container);
                FloraUI.showToast('실패: ' + err.message);
            });
    }

    return {
        render: function (container) {
            render(container);
        }
    };
})();
