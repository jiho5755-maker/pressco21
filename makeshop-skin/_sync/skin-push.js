/**
 * skin-push.js — 로컬 코드 → 메이크샵 편집기 삽입
 *
 * Chrome MCP javascript_tool에서 실행하여 CodeMirror 에디터에
 * 로컬 코드를 삽입한다.
 *
 * 사용법:
 *   1. 메이크샵 편집기에서 대상 페이지를 연다
 *   2. Claude가 이 함수를 호출하며 tabIndex와 code를 전달
 *   3. 편집기에 코드가 삽입되면 저장 버튼을 클릭
 *
 * 주의:
 *   - 삽입 전 반드시 pre-push-check.sh를 통과해야 한다
 *   - 편집기에서 저장 실패 시 템플릿 리터럴 이스케이프 확인
 *
 * 파라미터 (PUSH_CONFIG 전역변수로 전달):
 *   window.__PUSH_CONFIG = { tabIndex: 0, code: '...' }
 */
(function pushCodeToEditor() {
  // PUSH_CONFIG는 Claude가 javascript_tool 호출 전에 설정
  var config = window.__PUSH_CONFIG;
  if (!config || !config.code) {
    return JSON.stringify({
      success: false,
      error: 'window.__PUSH_CONFIG = { tabIndex, code } 를 먼저 설정하세요'
    });
  }

  var tabIndex = config.tabIndex || 0;
  var code = config.code;
  var result = { success: false, tabIndex: tabIndex };

  // CodeMirror 인스턴스 찾기
  var cmElements = document.querySelectorAll('.CodeMirror');
  if (cmElements.length === 0) {
    result.error = 'CodeMirror 에디터를 찾을 수 없습니다';
    return JSON.stringify(result);
  }

  if (tabIndex >= cmElements.length) {
    result.error = 'tabIndex(' + tabIndex + ')가 범위를 초과합니다. 총 ' + cmElements.length + '개 에디터';
    return JSON.stringify(result);
  }

  var cm = cmElements[tabIndex].CodeMirror;
  if (!cm) {
    result.error = 'tabIndex ' + tabIndex + '의 CodeMirror 인스턴스에 접근할 수 없습니다';
    return JSON.stringify(result);
  }

  // 기존 코드 백업 (안전장치)
  var oldCode = cm.getValue();
  result.oldCodeLength = oldCode.length;
  result.oldLineCount = oldCode.split('\n').length;

  // 코드 삽입
  cm.setValue(code);

  // 삽입 확인
  var newCode = cm.getValue();
  result.newCodeLength = newCode.length;
  result.newLineCount = newCode.split('\n').length;
  result.success = (newCode === code);

  if (!result.success) {
    result.error = '코드 삽입 후 검증 실패: 삽입된 코드가 원본과 다릅니다';
    // 롤백
    cm.setValue(oldCode);
    result.rolledBack = true;
  }

  return JSON.stringify(result);
})();
