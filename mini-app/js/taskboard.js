/**
 * Flora 미니앱 — 태스크 보드
 * 기존 flora-todo-mvp /api/dashboard + /api/admin/tasks/{id} 활용
 */
var FloraTaskBoard = (function () {
    'use strict';

    var state = {
        tab: 'active',        // active | waiting | done
        assignee: 'all',      // all | 특정 이름
        tasks: [],
        summary: null,
        loading: false
    };

    var TABS = [
        { key: 'active', label: '할일' },
        { key: 'waiting', label: '대기' },
        { key: 'done', label: '완료' }
    ];

    var STATUS_MAP = {
        active: ['todo', 'needs_check', 'in_progress'],
        waiting: ['waiting'],
        done: ['done', 'resolved']
    };

    // ── 데이터 로드 ──
    function loadTasks(container) {
        state.loading = true;
        FloraUI.renderLoading(container);

        var status = state.tab === 'done' ? 'done' : (state.tab === 'waiting' ? 'waiting' : 'active');
        FloraAPI.getDashboard({ status: status, limit: 50, sort: 'operations' })
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

    // ── 태스크 필터 (클라이언트) ──
    function filteredTasks() {
        return state.tasks.filter(function (t) {
            if (state.assignee !== 'all' && t.assignee !== state.assignee) return false;
            return true;
        });
    }

    // ── 담당자 목록 추출 ──
    function getAssignees() {
        var set = {};
        state.tasks.forEach(function (t) {
            if (t.assignee) set[t.assignee] = true;
        });
        return Object.keys(set).sort();
    }

    // ── 렌더링 ──
    function renderContent(container) {
        container.innerHTML = '';

        // 요약
        if (state.summary) {
            var summary = document.createElement('div');
            summary.className = 'summary-row';
            summary.innerHTML =
                '<div class="summary-item"><div class="summary-num">' + (state.summary.todo || 0) + '</div><div class="summary-label">할일</div></div>' +
                '<div class="summary-item"><div class="summary-num">' + (state.summary.waiting || 0) + '</div><div class="summary-label">대기</div></div>' +
                '<div class="summary-item"><div class="summary-num">' + (state.summary.today || 0) + '</div><div class="summary-label">오늘</div></div>' +
                '<div class="summary-item"><div class="summary-num">' + (state.summary.topPriority || 0) + '</div><div class="summary-label">긴급</div></div>';
            container.appendChild(summary);
        }

        // 탭 바
        var tabBar = document.createElement('div');
        tabBar.className = 'tab-bar';
        TABS.forEach(function (tab) {
            var btn = document.createElement('button');
            btn.className = 'tab-btn' + (state.tab === tab.key ? ' active' : '');
            var count = countByTab(tab.key);
            btn.innerHTML = tab.label + (count > 0 ? ' <span class="tab-count">' + count + '</span>' : '');
            btn.onclick = function () {
                state.tab = tab.key;
                loadTasks(container);
            };
            tabBar.appendChild(btn);
        });
        container.appendChild(tabBar);

        // 담당자 필터
        var assignees = getAssignees();
        if (assignees.length > 0) {
            var filterBar = document.createElement('div');
            filterBar.className = 'taskboard-filters';
            var allBtn = document.createElement('button');
            allBtn.className = 'tab-btn btn-sm' + (state.assignee === 'all' ? ' active' : '');
            allBtn.textContent = '전체';
            allBtn.onclick = function () {
                state.assignee = 'all';
                renderContent(container);
            };
            filterBar.appendChild(allBtn);
            assignees.forEach(function (name) {
                var btn = document.createElement('button');
                btn.className = 'tab-btn btn-sm' + (state.assignee === name ? ' active' : '');
                btn.textContent = name;
                btn.onclick = function () {
                    state.assignee = name;
                    renderContent(container);
                };
                filterBar.appendChild(btn);
            });
            container.appendChild(filterBar);
        }

        // 태스크 리스트
        var tasks = filteredTasks();
        if (tasks.length === 0) {
            FloraUI.renderEmpty(container,
                state.tab === 'done' ? '\u2705' : '\u2728',
                state.tab === 'done' ? '완료된 태스크가 없습니다' : '모든 일을 처리했습니다!'
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

    function countByTab(tabKey) {
        if (!state.summary) return 0;
        if (tabKey === 'active') return (state.summary.todo || 0);
        if (tabKey === 'waiting') return (state.summary.waiting || 0);
        return 0;
    }

    // ── 태스크 카드 ──
    function renderTaskCard(task, container) {
        var isDone = task.status === 'done' || task.status === 'resolved';
        var card = document.createElement('div');
        card.className = 'task-card' + (isDone ? ' done' : '');

        // 카드 본문 (터치하면 상세 열기)
        var body = document.createElement('div');
        body.className = 'task-card-body';
        body.onclick = function () { showTaskDetail(task, container); };

        var titleEl = document.createElement('div');
        titleEl.className = 'task-card-title';
        titleEl.textContent = task.title;
        body.appendChild(titleEl);

        var meta = document.createElement('div');
        meta.className = 'task-card-meta';
        meta.innerHTML = FloraUI.priorityBadge(task.priority);

        if (task.assignee) {
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

        // 빠른 액션 버튼
        if (!isDone) {
            var actions = document.createElement('div');
            actions.className = 'task-card-actions';

            if (task.status === 'todo' || task.status === 'needs_check') {
                actions.appendChild(makeActionBtn('시작', 'start', function () {
                    updateTask(task.id, { status: 'in_progress' }, container);
                }));
                actions.appendChild(makeActionBtn('완료', 'complete', function () {
                    updateTask(task.id, { status: 'done' }, container);
                }));
            } else if (task.status === 'in_progress') {
                actions.appendChild(makeActionBtn('완료', 'complete', function () {
                    updateTask(task.id, { status: 'done' }, container);
                }));
                actions.appendChild(makeActionBtn('대기', 'wait', function () {
                    updateTask(task.id, { status: 'waiting' }, container);
                }));
            } else if (task.status === 'waiting') {
                actions.appendChild(makeActionBtn('시작', 'start', function () {
                    updateTask(task.id, { status: 'in_progress' }, container);
                }));
                actions.appendChild(makeActionBtn('완료', 'complete', function () {
                    updateTask(task.id, { status: 'done' }, container);
                }));
            }
            card.appendChild(actions);
        }

        return card;
    }

    function makeActionBtn(text, cls, onclick) {
        var btn = document.createElement('button');
        btn.className = 'task-action-btn ' + cls;
        btn.textContent = text;
        btn.onclick = function (e) {
            e.stopPropagation();
            onclick();
        };
        return btn;
    }

    // ── 상태 변경 ──
    function updateTask(id, body, container) {
        var prevStatus = null;
        state.tasks.forEach(function (t) {
            if (t.id === id) {
                prevStatus = t.status;
                t.status = body.status;
            }
        });
        renderContent(container);

        FloraAPI.patchTask(id, body)
            .then(function () {
                FloraUI.showToast(
                    FloraUI.statusLabel(body.status) + '로 변경됨',
                    prevStatus ? '되돌리기' : null,
                    prevStatus ? function () {
                        updateTask(id, { status: prevStatus }, container);
                    } : null,
                    3000
                );
                // 탭 카운트 갱신을 위해 다시 로드
                loadTasks(container);
            })
            .catch(function (err) {
                // 실패 시 원복
                state.tasks.forEach(function (t) {
                    if (t.id === id) t.status = prevStatus;
                });
                renderContent(container);
                FloraUI.showToast('변경 실패: ' + err.message);
            });
    }

    // ── 태스크 상세 시트 ──
    function showTaskDetail(task, container) {
        FloraUI.showActionSheet(null, function (sheet) {
            var isDone = task.status === 'done' || task.status === 'resolved';

            // 헤더
            var header = document.createElement('div');
            header.className = 'task-detail-header';
            header.innerHTML =
                '<div class="task-detail-title">' + FloraUI.escapeHtml(task.title) + '</div>' +
                FloraUI.priorityBadge(task.priority);
            sheet.appendChild(header);

            // 메타 정보
            var meta = document.createElement('div');
            meta.className = 'task-detail-meta';
            meta.innerHTML =
                '<span class="badge badge-status">' + FloraUI.statusLabel(task.status) + '</span>' +
                (task.assignee ? '<span class="badge badge-assignee">' + FloraUI.escapeHtml(task.assignee) + '</span>' : '') +
                (task.dueAt ? '<span class="badge ' + (!isDone && FloraUI.isOverdue(task.dueAt) ? 'badge-overdue' : 'badge-status') + '">' + FloraUI.formatDateTime(task.dueAt) + '</span>' : '') +
                (task.relatedProject ? '<span class="badge badge-status">' + FloraUI.escapeHtml(task.relatedProject) + '</span>' : '') +
                (task.category ? '<span class="badge badge-status">' + FloraUI.escapeHtml(task.category) + '</span>' : '');
            sheet.appendChild(meta);

            // 원문
            if (task.sourceText) {
                var source = document.createElement('div');
                source.className = 'task-detail-source';
                var label = document.createElement('div');
                label.className = 'task-detail-label';
                label.textContent = '원문';
                source.appendChild(label);
                var text = document.createElement('div');
                text.textContent = task.sourceText;
                source.appendChild(text);
                sheet.appendChild(source);
            }

            // 액션 버튼
            if (!isDone) {
                var actions = document.createElement('div');
                actions.className = 'action-sheet-actions';
                actions.style.marginTop = '16px';

                if (task.status === 'todo' || task.status === 'needs_check') {
                    actions.appendChild(makeSheetBtn('시작하기', 'btn btn-primary', function () {
                        FloraUI.closeActionSheet();
                        updateTask(task.id, { status: 'in_progress' }, container);
                    }));
                    actions.appendChild(makeSheetBtn('완료 처리', 'btn btn-success', function () {
                        FloraUI.closeActionSheet();
                        updateTask(task.id, { status: 'done' }, container);
                    }));
                } else if (task.status === 'in_progress') {
                    actions.appendChild(makeSheetBtn('완료 처리', 'btn btn-success', function () {
                        FloraUI.closeActionSheet();
                        updateTask(task.id, { status: 'done' }, container);
                    }));
                    actions.appendChild(makeSheetBtn('대기로 변경', 'btn btn-outline', function () {
                        FloraUI.closeActionSheet();
                        updateTask(task.id, { status: 'waiting' }, container);
                    }));
                } else if (task.status === 'waiting') {
                    actions.appendChild(makeSheetBtn('시작하기', 'btn btn-primary', function () {
                        FloraUI.closeActionSheet();
                        updateTask(task.id, { status: 'in_progress' }, container);
                    }));
                    actions.appendChild(makeSheetBtn('완료 처리', 'btn btn-success', function () {
                        FloraUI.closeActionSheet();
                        updateTask(task.id, { status: 'done' }, container);
                    }));
                }

                sheet.appendChild(actions);
            }
        });
    }

    function makeSheetBtn(text, cls, onclick) {
        var btn = document.createElement('button');
        btn.className = cls;
        btn.style.width = '100%';
        btn.textContent = text;
        btn.onclick = onclick;
        return btn;
    }

    // ── 공개 API ──
    return {
        render: function (container) {
            FloraUI.renderHeader('태스크 보드', FloraUI.todayStr(),
                '<button class="btn-icon refresh-btn" id="taskboard-refresh">\u21BB</button>');
            document.getElementById('taskboard-refresh').onclick = function () {
                loadTasks(container);
            };
            loadTasks(container);
        }
    };
})();
