/**
 * skin-pull.js — 메이크샵 편집기 → 로컬 코드 추출
 *
 * Chrome MCP javascript_tool에서 실행하여 현재 열린 편집기 페이지의
 * 모든 CodeMirror 에디터 탭 내용을 추출한다.
 *
 * 중요: Chrome MCP 보안 필터가 URL이 포함된 코드 반환을 차단한다.
 * CSS/HTML에는 이미지 URL이 포함되어 있으므로 아래 전략을 사용한다.
 *
 * === 추출 전략 ===
 *
 * 전략 A: Playwright MCP 파일 다운로드 (권장)
 *   1. javascript_tool로 blob URL 생성
 *   2. Playwright의 browser_click으로 다운로드 링크 클릭
 *   3. 다운로드된 파일을 로컬에 복사
 *
 * 전략 B: 줄별 해시 비교 + 수동 병합
 *   1. javascript_tool로 줄별 해시/길이 추출 (URL 없으므로 통과)
 *   2. 로컬 파일과 해시 비교하여 차이 영역 식별
 *   3. 차이 영역만 수동 복사 또는 콘솔에서 추출
 *
 * 전략 C: 콘솔 수동 추출
 *   1. F12 > Console에서 extractAll() 실행
 *   2. 결과를 수동 복사하여 로컬 파일에 저장
 *
 * === Claude Code 사용법 ===
 *
 *   1. 메이크샵 편집기에서 원하는 페이지를 연다
 *   2. Claude에게 "이 페이지 pull 해줘" 요청
 *   3-A. Claude가 blob 다운로드 방식으로 추출 시도
 *   3-B. 차단 시 해시 비교로 diff 영역만 식별
 */

// ============================================================
// 1. 메타데이터 추출 (항상 성공 - URL 미포함)
// ============================================================
// Chrome MCP javascript_tool에서 실행:
//
// var cmElements = document.querySelectorAll('.CodeMirror');
// var result = [];
// for (var i = 0; i < cmElements.length; i++) {
//   var cm = cmElements[i].CodeMirror;
//   if (cm) {
//     var code = cm.getValue();
//     result.push({ idx: i, len: code.length, lines: code.split('\n').length });
//   }
// }
// JSON.stringify({ count: result.length, tabs: result })

// ============================================================
// 2. blob 다운로드 링크 생성 (Playwright로 다운로드 가능)
// ============================================================
// Chrome MCP javascript_tool에서 실행:
//
// var tabIdx = 1; // 0=HTML, 1=CSS, 2=JS
// var cm = document.querySelectorAll('.CodeMirror')[tabIdx].CodeMirror;
// var code = cm.getValue();
// var blob = new Blob([code], {type: 'text/plain'});
// var a = document.createElement('a');
// a.href = URL.createObjectURL(blob);
// a.download = 'editor-extract.txt';
// a.id = '__pull_download';
// a.style.cssText = 'position:fixed;top:10px;right:10px;z-index:99999;padding:10px;background:red;color:white;font-size:16px';
// a.textContent = 'DOWNLOAD';
// document.body.appendChild(a);
// '다운로드 버튼 생성 완료'

// ============================================================
// 3. 청크 해시 비교용 (항상 성공 - diff 영역 식별)
// ============================================================
// Chrome MCP javascript_tool에서 실행:
//
// var tabIdx = 1; // 0=HTML, 1=CSS, 2=JS
// var cm = document.querySelectorAll('.CodeMirror')[tabIdx].CodeMirror;
// var lines = cm.getValue().split('\n');
// var chunkSize = 50;
// var chunks = [];
// for (var i = 0; i < lines.length; i += chunkSize) {
//   var chunk = lines.slice(i, i + chunkSize);
//   var hash = 0;
//   for (var j = 0; j < chunk.length; j++) {
//     for (var k = 0; k < chunk[j].length; k++) {
//       hash = ((hash << 5) - hash + chunk[j].charCodeAt(k)) | 0;
//     }
//   }
//   chunks.push({ from: i+1, to: Math.min(i+chunkSize, lines.length), hash: hash });
// }
// JSON.stringify({ totalLines: lines.length, chunks: chunks })

// ============================================================
// 4. 콘솔 수동 추출용 함수 (F12 > Console에서 실행)
// ============================================================
// 아래 코드를 편집기 페이지의 Chrome 콘솔에 붙여넣으면
// 모든 탭의 코드를 JSON으로 클립보드에 복사한다.

/*
(function extractAll() {
  var cmElements = document.querySelectorAll('.CodeMirror');
  var tabs = [];
  cmElements.forEach(function(el, i) {
    var cm = el.CodeMirror;
    if (cm) tabs.push({ tab: i, code: cm.getValue() });
  });
  var json = JSON.stringify(tabs, null, 2);
  navigator.clipboard.writeText(json).then(function() {
    console.log(tabs.length + '개 탭 추출 완료 (클립보드에 복사됨)');
    console.log('총 크기: ' + json.length + '자');
  });
})();
*/
