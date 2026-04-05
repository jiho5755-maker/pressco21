/**
 * Flora 미니앱 — 태스크 생성 폼
 * 3초 완료 원칙: 제목 필수, 나머지 선택
 */
var FloraTaskCreate = (function () {
    'use strict';

    var staffList = [];

    function render(container) {
        FloraUI.renderHeader('새 업무', '',
            '<button class="btn-icon" id="create-close" style="font-size:24px">&times;</button>');
        document.getElementById('create-close').onclick = function () {
            window.location.hash = '#/tasks';
        };

        loadStaff(container);
    }

    function loadStaff(container) {
        FloraAPI.getStaffList().then(function (data) {
            staffList = (data.staff || []);
            renderForm(container);
        }).catch(function () {
            staffList = [];
            renderForm(container);
        });
    }

    function renderForm(container) {
        container.innerHTML = '';

        var form = document.createElement('div');
        form.className = 'create-form';

        // 제목
        form.innerHTML =
            '<div class="form-group">' +
            '  <label class="form-label">업무 내용 *</label>' +
            '  <input type="text" id="cf-title" class="form-input" placeholder="예: 사이트 상품 디자인 개선" autofocus>' +
            '</div>' +

            '<div class="form-group">' +
            '  <label class="form-label">담당자</label>' +
            '  <div class="chip-group" id="cf-assignee-chips"></div>' +
            '</div>' +

            '<div class="form-row">' +
            '  <div class="form-group form-half">' +
            '    <label class="form-label">우선순위</label>' +
            '    <div class="chip-group" id="cf-priority-chips"></div>' +
            '  </div>' +
            '  <div class="form-group form-half">' +
            '    <label class="form-label">마감일</label>' +
            '    <input type="date" id="cf-due" class="form-input">' +
            '  </div>' +
            '</div>' +

            '<div class="form-group">' +
            '  <label class="form-label">프로젝트 (선택)</label>' +
            '  <input type="text" id="cf-project" class="form-input" placeholder="예: 리뉴얼, 쿠팡">' +
            '</div>' +

            '<button class="btn btn-primary btn-block" id="cf-submit">업무 등록</button>';

        container.appendChild(form);

        // 담당자 칩
        var assigneeContainer = document.getElementById('cf-assignee-chips');
        var selectedAssignee = null;
        staffList.forEach(function (s) {
            var chip = document.createElement('button');
            chip.className = 'chip';
            chip.textContent = s.name;
            chip.onclick = function () {
                if (selectedAssignee === s.name) {
                    selectedAssignee = null;
                    chip.classList.remove('active');
                } else {
                    selectedAssignee = s.name;
                    assigneeContainer.querySelectorAll('.chip').forEach(function (c) {
                        c.classList.remove('active');
                    });
                    chip.classList.add('active');
                }
            };
            assigneeContainer.appendChild(chip);
        });

        // 우선순위 칩
        var priorityContainer = document.getElementById('cf-priority-chips');
        var priorities = [
            { key: 'p1', label: '긴급' },
            { key: 'p2', label: '높음' },
            { key: 'p3', label: '보통' }
        ];
        var selectedPriority = 'p3';
        priorities.forEach(function (p) {
            var chip = document.createElement('button');
            chip.className = 'chip' + (p.key === 'p3' ? ' active' : '');
            chip.textContent = p.label;
            chip.onclick = function () {
                selectedPriority = p.key;
                priorityContainer.querySelectorAll('.chip').forEach(function (c) {
                    c.classList.remove('active');
                });
                chip.classList.add('active');
            };
            priorityContainer.appendChild(chip);
        });

        // 제출
        document.getElementById('cf-submit').onclick = function () {
            var title = document.getElementById('cf-title').value.trim();
            if (!title) {
                FloraUI.showToast('업무 내용을 입력해주세요');
                return;
            }

            var btn = document.getElementById('cf-submit');
            btn.disabled = true;
            btn.textContent = '등록 중...';

            var body = {
                title: title,
                assignee: selectedAssignee,
                priority: selectedPriority
            };

            var dueVal = document.getElementById('cf-due').value;
            if (dueVal) {
                body.dueAt = dueVal + 'T23:59:59+09:00';
            }

            var project = document.getElementById('cf-project').value.trim();
            if (project) {
                body.relatedProject = project;
            }

            FloraAPI.createTask(body).then(function () {
                FloraUI.showToast('업무가 등록되었습니다');
                window.location.hash = '#/tasks';
            }).catch(function (err) {
                FloraUI.showToast('등록 실패: ' + err.message);
                btn.disabled = false;
                btn.textContent = '업무 등록';
            });
        };
    }

    return { render: render };
})();
