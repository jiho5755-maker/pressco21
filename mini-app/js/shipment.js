/**
 * Flora 미니앱 — 오늘의 출고
 * 출고 태스크 (category: shipment) 조회 + 완료 처리
 */
var FloraShipment = (function () {
    'use strict';

    var state = {
        tasks: [],
        loading: false
    };

    // ── 데이터 로드 ──
    function loadShipments(container) {
        state.loading = true;
        FloraUI.renderLoading(container);

        // status=all로 완료 포함 조회, limit 충분히
        FloraAPI.getDashboard({ status: 'all', limit: 50, dateRange: 'today', sort: 'updatedAt' })
            .then(function (data) {
                var items = (data.explorer && data.explorer.items) || [];
                // 출고 태스크 필터: category=shipment 또는 title에 [출고] 포함
                state.tasks = items.filter(function (t) {
                    return t.category === 'shipment' ||
                        (t.title && t.title.indexOf('[출고]') === 0);
                });
                state.loading = false;
                renderContent(container);
            })
            .catch(function (err) {
                state.loading = false;
                FloraUI.renderError(container, err.message, function () {
                    loadShipments(container);
                });
            });
    }

    // ── 통계 ──
    function getStats() {
        var total = state.tasks.length;
        var done = state.tasks.filter(function (t) {
            return t.status === 'done' || t.status === 'resolved';
        }).length;
        return { total: total, done: done, remaining: total - done };
    }

    // ── 정렬: 미완료 먼저, 완료 아래로 ──
    function sortedTasks() {
        return state.tasks.slice().sort(function (a, b) {
            var aDone = a.status === 'done' || a.status === 'resolved';
            var bDone = b.status === 'done' || b.status === 'resolved';
            if (aDone !== bDone) return aDone ? 1 : -1;
            // 미완료 내에서는 priority 순
            var pOrder = { p1: 0, p2: 1, p3: 2, p4: 3 };
            return (pOrder[a.priority] || 2) - (pOrder[b.priority] || 2);
        });
    }

    // ── 렌더링 ──
    function renderContent(container) {
        container.innerHTML = '';

        var stats = getStats();

        // 빈 상태
        if (stats.total === 0) {
            FloraUI.renderEmpty(container,
                '\uD83D\uDCE6',
                '오늘 출고 건이 없습니다'
            );
            return;
        }

        // 헤더 영역
        var header = document.createElement('div');
        header.className = 'shipment-header';

        // 통계
        var statsEl = document.createElement('div');
        statsEl.className = 'shipment-stats';
        statsEl.innerHTML =
            '<div class="shipment-stat-remaining">' +
            '  <div class="shipment-stat-num">' + stats.remaining + '</div>' +
            '  <div class="shipment-stat-label">남은 건</div>' +
            '</div>' +
            '<div class="shipment-stat-done">' +
            '  <div class="shipment-stat-num">' + stats.done + '</div>' +
            '  <div class="shipment-stat-label">완료</div>' +
            '</div>' +
            '<div>' +
            '  <div class="shipment-stat-num">' + stats.total + '</div>' +
            '  <div class="shipment-stat-label">전체</div>' +
            '</div>';
        header.appendChild(statsEl);

        // 진행률 바
        var progress = document.createElement('div');
        progress.className = 'progress-bar';
        var pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
        progress.innerHTML = '<div class="progress-fill" style="width:' + pct + '%"></div>';
        header.appendChild(progress);

        container.appendChild(header);

        // 출고 리스트
        var list = document.createElement('div');
        list.className = 'shipment-list';

        sortedTasks().forEach(function (task) {
            list.appendChild(renderShipmentCard(task, container));
        });

        container.appendChild(list);
    }

    // ── 출고 카드 ──
    function renderShipmentCard(task, container) {
        var isDone = task.status === 'done' || task.status === 'resolved';
        var card = document.createElement('div');
        card.className = 'shipment-card' + (isDone ? ' done' : '');

        // 본문
        var body = document.createElement('div');
        body.className = 'shipment-card-body';

        // 주문번호 추출 (detailsMerge 또는 title에서)
        var orderNo = '';
        var items = '';
        var details = task.detailsJson || {};
        if (details.orderNumber) {
            orderNo = details.orderNumber;
        }
        if (details.items && details.items.length) {
            items = details.items.map(function (item) {
                return item.name + (item.qty > 1 ? ' x' + item.qty : '');
            }).join(', ');
        }

        if (orderNo) {
            var orderEl = document.createElement('div');
            orderEl.className = 'shipment-card-order';
            orderEl.textContent = '#' + orderNo;
            body.appendChild(orderEl);
        }

        var titleEl = document.createElement('div');
        titleEl.className = 'shipment-card-title';
        // [출고] 접두사 제거하여 표시
        var displayTitle = task.title.replace(/^\[출고\]\s*/, '');
        titleEl.textContent = displayTitle;
        body.appendChild(titleEl);

        if (items) {
            var itemsEl = document.createElement('div');
            itemsEl.className = 'shipment-card-items';
            itemsEl.textContent = items;
            body.appendChild(itemsEl);
        }

        card.appendChild(body);

        // 체크 버튼
        var checkBtn = document.createElement('button');
        checkBtn.className = 'shipment-check-btn';
        checkBtn.innerHTML = isDone ? '\u2713' : '';
        checkBtn.setAttribute('aria-label', isDone ? '완료됨' : '완료 처리');
        checkBtn.onclick = function (e) {
            e.stopPropagation();
            if (isDone) {
                // 이미 완료 -> 되돌리기
                toggleShipment(task.id, 'todo', container);
            } else {
                toggleShipment(task.id, 'done', container);
            }
        };
        card.appendChild(checkBtn);

        return card;
    }

    // ── 상태 토글 ──
    function toggleShipment(id, newStatus, container) {
        var prevStatus = null;

        // 낙관적 업데이트
        state.tasks.forEach(function (t) {
            if (t.id === id) {
                prevStatus = t.status;
                t.status = newStatus;
            }
        });
        renderContent(container);

        FloraAPI.patchTask(id, { status: newStatus })
            .then(function () {
                if (newStatus === 'done') {
                    FloraUI.showToast('출고 완료!', '되돌리기', function () {
                        toggleShipment(id, prevStatus || 'todo', container);
                    }, 3000);
                }
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

    // ── 공개 API ──
    return {
        render: function (container) {
            FloraUI.renderHeader('오늘의 출고', FloraUI.todayStr(),
                '<button class="btn-icon refresh-btn" id="shipment-refresh">\u21BB</button>');
            document.getElementById('shipment-refresh').onclick = function () {
                loadShipments(container);
            };
            loadShipments(container);
        }
    };
})();
