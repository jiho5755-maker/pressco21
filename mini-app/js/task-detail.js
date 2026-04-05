/**
 * Flora 미니앱 — 태스크 상세 + 코멘트
 * 업무 요청/작업/보고 맥락이 여기에 쌓임
 */
var FloraTaskDetail = (function () {
    'use strict';

    var state = { task: null, comments: [], loading: true };

    function render(container, taskId) {
        FloraUI.renderHeader('업무 상세', '',
            '<button class="btn-icon" id="detail-back">&larr;</button>');
        document.getElementById('detail-back').onclick = function () {
            window.history.back();
        };

        loadTask(container, taskId);
    }

    function loadTask(container, taskId) {
        state.loading = true;
        FloraUI.renderLoading(container);

        Promise.all([
            FloraAPI.getDashboard({ status: 'all', limit: 200, selectedTaskId: taskId }),
            FloraAPI.getComments(taskId)
        ]).then(function (results) {
            var dashData = results[0];
            var commentsData = results[1];

            var items = (dashData.explorer && dashData.explorer.items) || [];
            state.task = null;
            for (var i = 0; i < items.length; i++) {
                if (items[i].id === taskId) { state.task = items[i]; break; }
            }
            // selectedTask에서도 확인
            if (!state.task && dashData.selectedTask) {
                state.task = dashData.selectedTask;
            }

            state.comments = (commentsData.comments || []);
            state.loading = false;
            renderContent(container, taskId);
        }).catch(function (err) {
            state.loading = false;
            FloraUI.renderError(container, err.message, function () {
                loadTask(container, taskId);
            });
        });
    }

    function renderContent(container, taskId) {
        container.innerHTML = '';

        if (!state.task) {
            FloraUI.renderEmpty(container, '?', '태스크를 찾을 수 없습니다');
            return;
        }

        var task = state.task;
        var isDone = task.status === 'done' || task.status === 'resolved';

        // ── 태스크 정보 ──
        var info = document.createElement('div');
        info.className = 'detail-info';

        info.innerHTML =
            '<div class="detail-title">' + FloraUI.escapeHtml(task.title) + '</div>' +
            '<div class="detail-meta">' +
            FloraUI.priorityBadge(task.priority) +
            '<span class="badge badge-status">' + FloraUI.statusLabel(task.status) + '</span>' +
            (task.assignee ? '<span class="badge badge-assignee">' + FloraUI.escapeHtml(task.assignee) + '</span>' : '') +
            (task.dueAt ? '<span class="badge ' + (!isDone && FloraUI.isOverdue(task.dueAt) ? 'badge-overdue' : 'badge-status') + '">' +
                FloraUI.formatDate(task.dueAt) + '</span>' : '') +
            (task.relatedProject ? '<span class="badge badge-status">' + FloraUI.escapeHtml(task.relatedProject) + '</span>' : '') +
            '</div>';

        container.appendChild(info);

        // ── 상태 변경 버튼 ──
        if (!isDone) {
            var actions = document.createElement('div');
            actions.className = 'detail-actions';

            var statusFlow = getStatusFlow(task.status);
            statusFlow.forEach(function (sf) {
                var btn = document.createElement('button');
                btn.className = 'btn ' + sf.cls;
                btn.textContent = sf.label;
                btn.onclick = function () {
                    FloraAPI.patchTask(taskId, { status: sf.status }).then(function () {
                        FloraUI.showToast(sf.label + ' 처리됨');
                        loadTask(container, taskId);
                    }).catch(function (err) {
                        FloraUI.showToast('실패: ' + err.message);
                    });
                };
                actions.appendChild(btn);
            });

            container.appendChild(actions);
        }

        // ── 구분선 ──
        var divider = document.createElement('div');
        divider.className = 'detail-divider';
        divider.innerHTML = '<span>코멘트 ' + state.comments.length + '건</span>';
        container.appendChild(divider);

        // ── 코멘트 목록 ──
        var commentList = document.createElement('div');
        commentList.className = 'comment-list';

        if (state.comments.length === 0) {
            commentList.innerHTML = '<div class="comment-empty">아직 코멘트가 없습니다</div>';
        } else {
            state.comments.forEach(function (c) {
                var item = document.createElement('div');
                item.className = 'comment-item';
                item.innerHTML =
                    '<div class="comment-header">' +
                    '  <span class="comment-author">' + FloraUI.escapeHtml(c.authorName) + '</span>' +
                    '  <span class="comment-time">' + formatTimeAgo(c.createdAt) + '</span>' +
                    '</div>' +
                    '<div class="comment-body">' + FloraUI.escapeHtml(c.content) + '</div>';
                commentList.appendChild(item);
            });
        }

        container.appendChild(commentList);

        // ── 코멘트 입력 ──
        var inputArea = document.createElement('div');
        inputArea.className = 'comment-input-area';
        inputArea.innerHTML =
            '<input type="text" class="comment-input" id="comment-text" placeholder="코멘트 입력...">' +
            '<button class="btn btn-primary btn-sm" id="comment-send">전송</button>';
        container.appendChild(inputArea);

        document.getElementById('comment-send').onclick = function () {
            var text = document.getElementById('comment-text').value.trim();
            if (!text) return;

            var btn = document.getElementById('comment-send');
            btn.disabled = true;

            FloraAPI.addComment(taskId, text).then(function () {
                document.getElementById('comment-text').value = '';
                btn.disabled = false;
                loadTask(container, taskId);
            }).catch(function (err) {
                FloraUI.showToast('전송 실패: ' + err.message);
                btn.disabled = false;
            });
        };

        // 엔터 키 지원
        document.getElementById('comment-text').onkeypress = function (e) {
            if (e.key === 'Enter') {
                document.getElementById('comment-send').click();
            }
        };
    }

    function getStatusFlow(status) {
        switch (status) {
            case 'todo':
                return [
                    { status: 'in_progress', label: '시작', cls: 'btn-primary' },
                    { status: 'done', label: '바로완료', cls: 'btn-outline btn-sm' }
                ];
            case 'in_progress':
                return [
                    { status: 'needs_check', label: '검토요청', cls: 'btn-primary' },
                    { status: 'done', label: '완료', cls: 'btn-success' }
                ];
            case 'needs_check':
                return [
                    { status: 'done', label: '확인완료', cls: 'btn-success' },
                    { status: 'todo', label: '수정필요', cls: 'btn-outline' }
                ];
            case 'waiting':
                return [
                    { status: 'in_progress', label: '시작', cls: 'btn-primary' },
                    { status: 'done', label: '완료', cls: 'btn-success' }
                ];
            default:
                return [{ status: 'done', label: '완료', cls: 'btn-success' }];
        }
    }

    function formatTimeAgo(dateStr) {
        if (!dateStr) return '';
        var diff = Date.now() - new Date(dateStr).getTime();
        var min = Math.floor(diff / 60000);
        if (min < 1) return '방금';
        if (min < 60) return min + '분 전';
        var hr = Math.floor(min / 60);
        if (hr < 24) return hr + '시간 전';
        var day = Math.floor(hr / 24);
        if (day < 7) return day + '일 전';
        return FloraUI.formatDate(dateStr);
    }

    return { render: render };
})();
