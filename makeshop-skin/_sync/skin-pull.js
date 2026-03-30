/**
 * skin-pull.js — 메이크샵 편집기 → 로컬 코드 추출
 *
 * Chrome MCP javascript_tool에서 실행하여 현재 열린 편집기 페이지의
 * 모든 CodeMirror 에디터 탭 내용을 추출한다.
 *
 * 사용법:
 *   1. 메이크샵 편집기에서 원하는 페이지를 연다
 *   2. Claude에게 "이 페이지 pull 해줘" 요청
 *   3. Claude가 이 스크립트를 Chrome MCP로 실행
 *   4. 추출된 코드를 로컬 파일에 Write
 *
 * 반환 형식:
 *   { tabs: [{ tabName, tabIndex, code }], pageTitle, url }
 */
(function extractEditorCode() {
  var result = {
    tabs: [],
    pageTitle: document.title || '',
    url: window.location.href,
    extractedAt: new Date().toISOString()
  };

  // 방법 1: CodeMirror 인스턴스 직접 접근
  var cmElements = document.querySelectorAll('.CodeMirror');
  if (cmElements.length > 0) {
    for (var i = 0; i < cmElements.length; i++) {
      var cm = cmElements[i].CodeMirror;
      if (cm) {
        // 탭 이름 추정: 가장 가까운 탭 버튼이나 레이블 찾기
        var tabName = '';
        var parent = cmElements[i].closest('.tab-pane, .tab-content, [role="tabpanel"]');
        if (parent) {
          var tabId = parent.getAttribute('id') || parent.getAttribute('aria-labelledby') || '';
          tabName = tabId;
        }

        // 코드 내용 추출
        var code = cm.getValue();
        result.tabs.push({
          tabIndex: i,
          tabName: tabName || ('tab-' + i),
          codeLength: code.length,
          lineCount: code.split('\n').length,
          code: code
        });
      }
    }
  }

  // 방법 2: CodeMirror 6 (새 버전) 지원
  if (result.tabs.length === 0) {
    var cmViews = document.querySelectorAll('.cm-editor');
    for (var j = 0; j < cmViews.length; j++) {
      var view = cmViews[j].cmView;
      if (view && view.view) {
        var doc = view.view.state.doc;
        var code2 = doc.toString();
        result.tabs.push({
          tabIndex: j,
          tabName: 'cm6-tab-' + j,
          codeLength: code2.length,
          lineCount: doc.lines,
          code: code2
        });
      }
    }
  }

  // 방법 3: textarea fallback
  if (result.tabs.length === 0) {
    var textareas = document.querySelectorAll('textarea[name*="code"], textarea[name*="design"], textarea.code-editor');
    for (var k = 0; k < textareas.length; k++) {
      result.tabs.push({
        tabIndex: k,
        tabName: textareas[k].name || ('textarea-' + k),
        codeLength: textareas[k].value.length,
        lineCount: textareas[k].value.split('\n').length,
        code: textareas[k].value
      });
    }
  }

  result.tabCount = result.tabs.length;
  return JSON.stringify(result);
})();
