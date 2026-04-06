/**
 * Flora 미니앱 — 태스크 상세 + 코멘트 + 링크/첨부
 * v3: 코멘트 인증 폴백, 링크 무한 추가, 파일 다중 첨부
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
        var details = task.detailsJson || {};

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

        // ── 설명 ──
        if (details.description) {
            var descEl = document.createElement('div');
            descEl.className = 'detail-description';
            descEl.textContent = details.description;
            container.appendChild(descEl);
        }

        // ── 링크 목록 ──
        var links = details.links || [];
        if (links.length > 0) {
            var linksSection = document.createElement('div');
            linksSection.className = 'detail-links';
            linksSection.innerHTML = '<div class="detail-section-title">링크 ' + links.length + '개</div>';
            links.forEach(function (link) {
                var a = document.createElement('a');
                a.className = 'detail-link-item';
                a.href = link.url || link;
                a.target = '_blank';
                a.rel = 'noopener';
                a.innerHTML = '<span class="link-icon">&#128279;</span>' +
                    '<span class="link-text">' + FloraUI.escapeHtml(link.label || link.url || link) + '</span>';
                linksSection.appendChild(a);
            });
            container.appendChild(linksSection);
        }

        // ── 첨부파일 목록 ──
        var attachments = details.attachments || [];
        if (attachments.length > 0) {
            var attachSection = document.createElement('div');
            attachSection.className = 'detail-attachments';
            attachSection.innerHTML = '<div class="detail-section-title">첨부파일 ' + attachments.length + '개</div>';
            attachments.forEach(function (att) {
                var item = document.createElement('a');
                item.className = 'detail-attachment-item';
                item.href = att.url;
                item.target = '_blank';
                item.rel = 'noopener';
                var isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(att.name || '');
                if (isImage) {
                    item.innerHTML = '<img src="' + FloraUI.escapeHtml(att.url) + '" class="attachment-thumb" alt="">' +
                        '<span class="attachment-name">' + FloraUI.escapeHtml(att.name) + '</span>';
                } else {
                    item.innerHTML = '<span class="attachment-icon">&#128196;</span>' +
                        '<span class="attachment-name">' + FloraUI.escapeHtml(att.name) + '</span>' +
                        (att.size ? '<span class="attachment-size">' + formatFileSize(att.size) + '</span>' : '');
                }
                attachSection.appendChild(item);
            });
            container.appendChild(attachSection);
        }

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

        // ── 구분선: 코멘트 ──
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

                var bodyHtml = renderCommentBody(c.content);

                item.innerHTML =
                    '<div class="comment-header">' +
                    '  <span class="comment-author">' + FloraUI.escapeHtml(c.authorName) + '</span>' +
                    '  <span class="comment-time">' + formatTimeAgo(c.createdAt) + '</span>' +
                    '</div>' +
                    '<div class="comment-body">' + bodyHtml + '</div>';
                commentList.appendChild(item);
            });
        }

        container.appendChild(commentList);

        // ── 코멘트 입력 영역 ──
        renderCommentInput(container, taskId);
    }

    // ── 코멘트 입력 + 링크/첨부 추가 ──
    function renderCommentInput(container, taskId) {
        var pendingLinks = [];
        var pendingFiles = [];

        var inputArea = document.createElement('div');
        inputArea.className = 'comment-input-area';

        // 첨부/링크 미리보기 영역
        var previewArea = document.createElement('div');
        previewArea.className = 'comment-preview-area';
        previewArea.style.display = 'none';
        inputArea.appendChild(previewArea);

        // 텍스트 입력
        var inputRow = document.createElement('div');
        inputRow.className = 'comment-input-row';

        var textarea = document.createElement('textarea');
        textarea.className = 'comment-input';
        textarea.id = 'comment-text';
        textarea.placeholder = '코멘트 입력...';
        textarea.rows = 1;
        textarea.oninput = function () {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        };

        var sendBtn = document.createElement('button');
        sendBtn.className = 'btn btn-primary btn-sm comment-send-btn';
        sendBtn.id = 'comment-send';
        sendBtn.textContent = '전송';

        inputRow.appendChild(textarea);
        inputRow.appendChild(sendBtn);
        inputArea.appendChild(inputRow);

        // 액션 버튼 (링크 추가 + 파일 첨부)
        var actionRow = document.createElement('div');
        actionRow.className = 'comment-action-row';

        var linkBtn = document.createElement('button');
        linkBtn.className = 'comment-action-btn';
        linkBtn.innerHTML = '&#128279; 링크';
        linkBtn.onclick = function () {
            showLinkDialog(function (label, url) {
                pendingLinks.push({ label: label, url: url });
                refreshPreview();
            });
        };

        var fileBtn = document.createElement('button');
        fileBtn.className = 'comment-action-btn';
        fileBtn.innerHTML = '&#128206; 파일';

        var fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.style.display = 'none';
        fileInput.onchange = function () {
            for (var i = 0; i < fileInput.files.length; i++) {
                pendingFiles.push(fileInput.files[i]);
            }
            fileInput.value = '';
            refreshPreview();
        };
        fileBtn.onclick = function () { fileInput.click(); };

        actionRow.appendChild(linkBtn);
        actionRow.appendChild(fileBtn);
        actionRow.appendChild(fileInput);
        inputArea.appendChild(actionRow);

        container.appendChild(inputArea);

        function refreshPreview() {
            previewArea.innerHTML = '';
            if (pendingLinks.length === 0 && pendingFiles.length === 0) {
                previewArea.style.display = 'none';
                return;
            }
            previewArea.style.display = 'block';

            pendingLinks.forEach(function (link, idx) {
                var chip = document.createElement('div');
                chip.className = 'preview-chip preview-link';
                chip.innerHTML = '&#128279; ' + FloraUI.escapeHtml(link.label || link.url) +
                    '<button class="preview-remove" data-type="link" data-idx="' + idx + '">&times;</button>';
                previewArea.appendChild(chip);
            });

            pendingFiles.forEach(function (file, idx) {
                var chip = document.createElement('div');
                chip.className = 'preview-chip preview-file';
                chip.innerHTML = '&#128196; ' + FloraUI.escapeHtml(file.name) +
                    ' <span class="preview-size">' + formatFileSize(file.size) + '</span>' +
                    '<button class="preview-remove" data-type="file" data-idx="' + idx + '">&times;</button>';
                previewArea.appendChild(chip);
            });

            previewArea.querySelectorAll('.preview-remove').forEach(function (btn) {
                btn.onclick = function () {
                    var type = this.getAttribute('data-type');
                    var i = parseInt(this.getAttribute('data-idx'));
                    if (type === 'link') pendingLinks.splice(i, 1);
                    else pendingFiles.splice(i, 1);
                    refreshPreview();
                };
            });
        }

        // 전송
        sendBtn.onclick = function () {
            var text = textarea.value.trim();
            if (!text && pendingLinks.length === 0 && pendingFiles.length === 0) return;

            sendBtn.disabled = true;
            sendBtn.textContent = '...';

            // 링크/파일 정보를 코멘트 본문에 포함
            var fullContent = text;
            if (pendingLinks.length > 0) {
                fullContent += '\n\n--- 링크 ---';
                pendingLinks.forEach(function (link) {
                    fullContent += '\n' + (link.label ? '[' + link.label + '] ' : '') + link.url;
                });
            }

            var user = FloraAPI.getCachedUser();
            var authorName = user ? user.name : '대표';

            // 파일 업로드 처리
            var uploadPromises = pendingFiles.map(function (file) {
                return FloraAPI.uploadFile(taskId, file).catch(function () {
                    return { ok: false, name: file.name };
                });
            });

            Promise.all(uploadPromises).then(function (uploadResults) {
                var fileInfos = [];
                uploadResults.forEach(function (res, idx) {
                    if (res && res.ok && res.url) {
                        fileInfos.push({ name: pendingFiles[idx].name, url: res.url });
                    }
                });

                if (fileInfos.length > 0) {
                    fullContent += '\n\n--- 첨부 ---';
                    fileInfos.forEach(function (f) {
                        fullContent += '\n' + f.name + ': ' + f.url;
                    });
                }

                return FloraAPI.addComment(taskId, fullContent, authorName);
            }).then(function () {
                textarea.value = '';
                textarea.style.height = 'auto';
                pendingLinks = [];
                pendingFiles = [];
                sendBtn.disabled = false;
                sendBtn.textContent = '전송';
                loadTask(container, taskId);
            }).catch(function (err) {
                FloraUI.showToast('전송 실패: ' + err.message);
                sendBtn.disabled = false;
                sendBtn.textContent = '전송';
            });
        };

        // 엔터 키 지원 (Shift+Enter는 줄바꿈)
        textarea.onkeydown = function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendBtn.click();
            }
        };
    }

    // ── 링크 추가 다이얼로그 ──
    function showLinkDialog(callback) {
        FloraUI.showActionSheet('링크 추가', function (sheet) {
            var form = document.createElement('div');
            form.className = 'link-dialog';
            form.innerHTML =
                '<div class="form-group">' +
                '  <label class="form-label">URL *</label>' +
                '  <input type="url" id="link-url" class="form-input" placeholder="https://">' +
                '</div>' +
                '<div class="form-group">' +
                '  <label class="form-label">표시 이름 (선택)</label>' +
                '  <input type="text" id="link-label" class="form-input" placeholder="예: 참고자료">' +
                '</div>' +
                '<div style="display:flex;gap:8px">' +
                '  <button class="btn btn-outline" id="link-cancel" style="flex:1">취소</button>' +
                '  <button class="btn btn-primary" id="link-add" style="flex:1">추가</button>' +
                '</div>';
            sheet.appendChild(form);

            document.getElementById('link-cancel').onclick = function () {
                FloraUI.closeActionSheet();
            };
            document.getElementById('link-add').onclick = function () {
                var url = document.getElementById('link-url').value.trim();
                if (!url) {
                    FloraUI.showToast('URL을 입력해주세요');
                    return;
                }
                if (!/^https?:\/\//.test(url)) url = 'https://' + url;
                var label = document.getElementById('link-label').value.trim();
                FloraUI.closeActionSheet();
                callback(label, url);
            };

            setTimeout(function () {
                document.getElementById('link-url').focus();
            }, 100);
        });
    }

    // ── 코멘트 본문 렌더 (URL 자동링크) ──
    function renderCommentBody(content) {
        if (!content) return '';
        var escaped = FloraUI.escapeHtml(content);
        // URL 자동 링크
        escaped = escaped.replace(
            /(https?:\/\/[^\s<]+)/g,
            '<a href="$1" target="_blank" rel="noopener" class="comment-link">$1</a>'
        );
        return escaped;
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

    function formatFileSize(bytes) {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + 'B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + 'KB';
        return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
    }

    return { render: render };
})();
