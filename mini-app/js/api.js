/**
 * Flora 미니앱 API 클라이언트
 * flora-todo-mvp와 통신 (같은 도메인 Nginx 프록시)
 */
var FloraAPI = (function () {
    'use strict';

    var BASE = '/api';
    var API_KEY = 'pressco21-admin-2026';

    function buildHeaders() {
        return {
            'Content-Type': 'application/json',
            'x-flora-automation-key': API_KEY
        };
    }

    function request(method, path, body) {
        var opts = {
            method: method,
            headers: buildHeaders()
        };
        if (body) {
            opts.body = JSON.stringify(body);
        }
        return fetch(BASE + path, opts).then(function (res) {
            if (!res.ok) {
                return res.json().then(function (data) {
                    throw new Error(data.error || 'API 오류 (' + res.status + ')');
                });
            }
            return res.json();
        });
    }

    function qs(params) {
        var parts = [];
        for (var key in params) {
            if (params[key] != null && params[key] !== '') {
                parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
            }
        }
        return parts.length ? '?' + parts.join('&') : '';
    }

    return {
        /**
         * 대시보드 데이터 조회
         * @param {Object} params - dateRange, status, priority, sort, search, page, limit
         */
        getDashboard: function (params) {
            return request('GET', '/dashboard' + qs(params || {}));
        },

        /**
         * 태스크 상태 변경
         * @param {string} id - 태스크 ID
         * @param {Object} body - { status, priority, category, dueAt, waitingFor, ... }
         */
        patchTask: function (id, body) {
            return request('PATCH', '/admin/tasks/' + encodeURIComponent(id), body);
        },

        /**
         * 아침 브리핑
         */
        getMorningBrief: function () {
            return request('GET', '/automation/briefings/morning');
        },

        /**
         * 직원별 브리핑
         * @param {string} assignee - 담당자 이름
         */
        getStaffBrief: function (assignee) {
            return request('GET', '/automation/briefings/staff' + qs({ assignee: assignee }));
        }
    };
})();
