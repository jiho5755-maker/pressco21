/**
 * Flora 미니앱 공통 UI 컴포넌트
 */
var FloraUI = (function () {
    'use strict';

    // ── 토스트 ──
    var toastTimer = null;

    function showToast(message, actionText, actionFn, duration) {
        var container = document.getElementById('toast-container');
        container.innerHTML = '';
        clearTimeout(toastTimer);

        var toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;

        if (actionText && actionFn) {
            var btn = document.createElement('button');
            btn.className = 'toast-action';
            btn.textContent = actionText;
            btn.onclick = function () {
                clearTimeout(toastTimer);
                container.innerHTML = '';
                actionFn();
            };
            toast.appendChild(btn);
        }

        container.appendChild(toast);
        toastTimer = setTimeout(function () {
            container.innerHTML = '';
        }, duration || 3000);
    }

    // ── 로딩 ──
    function renderLoading(container) {
        container.innerHTML =
            '<div class="loading">' +
            '  <div class="spinner"></div>' +
            '  <span>불러오는 중...</span>' +
            '</div>';
    }

    // ── 빈 상태 ──
    function renderEmpty(container, icon, text) {
        container.innerHTML =
            '<div class="empty-state">' +
            '  <div class="empty-icon">' + (icon || '') + '</div>' +
            '  <div class="empty-text">' + escapeHtml(text || '데이터가 없습니다') + '</div>' +
            '</div>';
    }

    // ── 에러 ──
    function renderError(container, message, retryFn) {
        container.innerHTML =
            '<div class="empty-state">' +
            '  <div class="empty-icon">!</div>' +
            '  <div class="empty-text">' + escapeHtml(message || '오류가 발생했습니다') + '</div>' +
            '</div>';
        if (retryFn) {
            var btn = document.createElement('button');
            btn.className = 'btn btn-outline btn-sm';
            btn.textContent = '다시 시도';
            btn.style.marginTop = '16px';
            btn.onclick = retryFn;
            container.querySelector('.empty-state').appendChild(btn);
        }
    }

    // ── 액션 시트 (바텀 모달) ──
    function showActionSheet(title, contentFn) {
        closeActionSheet();

        var overlay = document.createElement('div');
        overlay.className = 'action-sheet-overlay';
        overlay.onclick = closeActionSheet;

        var sheet = document.createElement('div');
        sheet.className = 'action-sheet';
        sheet.onclick = function (e) { e.stopPropagation(); };

        if (title) {
            var titleEl = document.createElement('div');
            titleEl.className = 'action-sheet-title';
            titleEl.textContent = title;
            sheet.appendChild(titleEl);
        }

        if (contentFn) {
            contentFn(sheet);
        }

        document.body.appendChild(overlay);
        document.body.appendChild(sheet);
        document.body.style.overflow = 'hidden';
    }

    function closeActionSheet() {
        var overlay = document.querySelector('.action-sheet-overlay');
        var sheet = document.querySelector('.action-sheet');
        if (overlay) overlay.remove();
        if (sheet) sheet.remove();
        document.body.style.overflow = '';
    }

    // ── 우선순위 뱃지 ──
    function priorityBadge(priority) {
        var labels = { p1: '긴급', p2: '높음', p3: '보통', p4: '낮음' };
        return '<span class="badge badge-' + priority + '">' +
            (labels[priority] || priority) + '</span>';
    }

    // ── 상태 텍스트 ──
    function statusLabel(status) {
        var labels = {
            todo: '할일',
            in_progress: '진행중',
            waiting: '대기',
            needs_check: '확인필요',
            done: '완료',
            resolved: '해결',
            cancelled: '취소',
            ignored: '무시'
        };
        return labels[status] || status;
    }

    // ── 날짜 포맷 ──
    function formatDate(dateStr) {
        if (!dateStr) return '';
        var d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        var month = d.getMonth() + 1;
        var day = d.getDate();
        return month + '/' + day;
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return '';
        var d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        var month = d.getMonth() + 1;
        var day = d.getDate();
        var hours = d.getHours();
        var minutes = String(d.getMinutes()).padStart(2, '0');
        return month + '/' + day + ' ' + hours + ':' + minutes;
    }

    function isOverdue(dateStr) {
        if (!dateStr) return false;
        return new Date(dateStr) < new Date();
    }

    function todayStr() {
        var d = new Date();
        var month = d.getMonth() + 1;
        var day = d.getDate();
        var weekdays = ['일', '월', '화', '수', '목', '금', '토'];
        return month + '월 ' + day + '일 (' + weekdays[d.getDay()] + ')';
    }

    // ── HTML 이스케이프 ──
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ── 헤더 렌더 ──
    function renderHeader(title, subtitle, rightHtml) {
        var header = document.getElementById('app-header');
        header.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:space-between">' +
            '  <div>' +
            '    <div class="header-title">' + escapeHtml(title) + '</div>' +
            (subtitle ? '<div class="header-sub">' + escapeHtml(subtitle) + '</div>' : '') +
            '  </div>' +
            (rightHtml || '') +
            '</div>';
    }

    return {
        showToast: showToast,
        renderLoading: renderLoading,
        renderEmpty: renderEmpty,
        renderError: renderError,
        showActionSheet: showActionSheet,
        closeActionSheet: closeActionSheet,
        priorityBadge: priorityBadge,
        statusLabel: statusLabel,
        formatDate: formatDate,
        formatDateTime: formatDateTime,
        isOverdue: isOverdue,
        todayStr: todayStr,
        escapeHtml: escapeHtml,
        renderHeader: renderHeader
    };
})();
