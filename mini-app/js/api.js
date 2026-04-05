/**
 * Flora 미니앱 API 클라이언트
 * flora-todo-mvp와 통신 (같은 도메인 Nginx 프록시)
 */
var FloraAPI = (function () {
    'use strict';

    var BASE = '/api';
    var API_KEY = 'pressco21-admin-2026';
    var _currentUser = null;

    function getInitData() {
        var tg = window.Telegram && window.Telegram.WebApp;
        return (tg && tg.initData) || '';
    }

    function buildHeaders(needAuth) {
        var h = {
            'Content-Type': 'application/json',
            'x-flora-automation-key': API_KEY
        };
        if (needAuth !== false) {
            var initData = getInitData();
            if (initData) {
                h['x-telegram-init-data'] = initData;
            }
        }
        return h;
    }

    function request(method, path, body, needAuth) {
        var opts = {
            method: method,
            headers: buildHeaders(needAuth)
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
        // ── 사용자 ──

        getCurrentUser: function () {
            if (_currentUser) {
                return Promise.resolve(_currentUser);
            }
            return request('GET', '/mini/me').then(function (data) {
                _currentUser = data.staff;
                return _currentUser;
            }).catch(function () {
                // 브라우저 테스트 시 initData 없으면 null
                _currentUser = null;
                return null;
            });
        },

        getCachedUser: function () {
            return _currentUser;
        },

        getStaffList: function () {
            return request('GET', '/mini/staff');
        },

        // ── 대시보드 ──

        getDashboard: function (params) {
            return request('GET', '/dashboard' + qs(params || {}), null, false);
        },

        // ── 태스크 ──

        patchTask: function (id, body) {
            return request('PATCH', '/admin/tasks/' + encodeURIComponent(id), body);
        },

        createTask: function (body) {
            return request('POST', '/mini/tasks', body);
        },

        // ── 코멘트 ──

        getComments: function (taskId) {
            return request('GET', '/tasks/' + encodeURIComponent(taskId) + '/comments', null, false);
        },

        addComment: function (taskId, content) {
            return request('POST', '/tasks/' + encodeURIComponent(taskId) + '/comments', { content: content });
        },

        // ── 브리핑 ──

        getMorningBrief: function () {
            return request('GET', '/automation/briefings/morning');
        },

        getStaffBrief: function (assignee) {
            return request('GET', '/automation/briefings/staff' + qs({ assignee: assignee }));
        }
    };
})();
