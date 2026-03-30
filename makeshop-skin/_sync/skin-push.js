/**
 * skin-push.js — 로컬 코드 -> 메이크샵 편집기 자동 저장
 *
 * 2026-03-30 실전 검증 완료. hex 인코딩 + alert 오버라이드 방식.
 *
 * 이 파일은 Claude Code가 Chrome MCP javascript_tool로 실행하는
 * 코드 스니펫 모음이다. 순서대로 실행한다.
 *
 * 상세 절차: ~/.claude/skills/makeshop-developer/references/editor-sync.md
 *
 * === 전체 Push 흐름 ===
 *
 * [터미널] xxd -p {파일} | tr -d '\n'  -> hex 문자열 획득
 *     |
 * [Chrome MCP] Step 1: alert/confirm 오버라이드 + 탭 활성화
 *     | (2~3초 대기)
 * [Chrome MCP] Step 2: hex 디코딩 + CodeMirror 설정 + 저장 클릭
 *     | (2초 대기)
 * [Chrome MCP] Step 3: 다이얼로그 확인 (.save_ok)
 *     | (4초 대기)
 * [Chrome MCP] Step 4: 저장 완료 확인 (window.__lastAlert)
 *     |
 * [Chrome MCP] Step 5: 새로고침 + 영속성 확인
 */

// ============================================================
// Step 1: alert/confirm 오버라이드 + 탭 활성화
// ============================================================
// Chrome MCP javascript_tool로 실행:
//
// window.alert = function(msg) {
//   console.log('[PUSH-ALERT] ' + msg);
//   window.__lastAlert = msg;
// };
// window.confirm = function(msg) {
//   console.log('[PUSH-CONFIRM] ' + msg);
//   return true;
// };
//
// // CSS push 시: CSS 탭 활성화
// var tabs = document.querySelectorAll('[class*="tab"] a');
// for (var i = 0; i < tabs.length; i++) {
//     if (tabs[i].textContent.trim() === 'CSS') { tabs[i].click(); break; }
// }
//
// // JS push 시: 'JS' 대신 'JS' 탭 클릭
// // HTML push 시: 탭 전환 불필요 (기본 활성)
//
// **반드시 2~3초 대기 후 Step 2 실행**

// ============================================================
// Step 2: hex 디코딩 + CodeMirror 설정 + 저장 클릭
// ============================================================
// 터미널에서: xxd -p {파일} | tr -d '\n' 으로 hex 문자열 획득
// Chrome MCP javascript_tool로 실행:
//
// var hex = '{여기에 hex 문자열}';
// // 30KB 초과 시 분할: var hex = h1 + h2 + h3;
//
// var bytes = [];
// for (var i = 0; i < hex.length; i += 2)
//   bytes.push(parseInt(hex.substr(i, 2), 16));
// var code = new TextDecoder('utf-8').decode(new Uint8Array(bytes));
//
// // CodeMirror 찾기 (CSS 예시)
// var targetCm = window.cm && window.cm['designcss']
//   ? window.cm['designcss'] : null;
// if (!targetCm) {
//   var cms = document.querySelectorAll('.CodeMirror');
//   for (var i = 0; i < cms.length; i++) {
//     var cm = cms[i].CodeMirror;
//     if (cm && cm.getTextArea() &&
//         cm.getTextArea().name === 'design_css_work') {
//       targetCm = cm; break;
//     }
//   }
// }
//
// // 3중 동기화
// targetCm.setValue(code);
// targetCm.save();
// document.querySelector('textarea[name="design_css_work"]').value = code;
//
// // 저장 버튼 클릭
// document.querySelector('.btn-save input[type="button"]').click();
//
// // window.cm 키 참조:
// //   designbody -> HTML (design_body_work)
// //   designcss  -> CSS  (design_css_work)
// //   designjs   -> JS   (design_js_work)

// ============================================================
// Step 3: 다이얼로그 확인 (2초 대기 후)
// ============================================================
// Chrome MCP javascript_tool로 실행:
//
// var okBtns = document.querySelectorAll('.save_ok');
// for (var i = 0; i < okBtns.length; i++) {
//   if (okBtns[i].offsetParent !== null) { okBtns[i].click(); break; }
// }

// ============================================================
// Step 4: 저장 완료 확인 (4초 대기 후)
// ============================================================
// Chrome MCP javascript_tool로 실행:
//
// window.__lastAlert
// // 성공: "디자인 소스 저장이 완료되었습니다."

// ============================================================
// Step 5: 영속성 확인 (새로고침 후)
// ============================================================
// 페이지 새로고침 후 Chrome MCP javascript_tool로 실행:
//
// var ta = document.querySelector('textarea[name="design_css_work"]');
// ta.value.length
// // 로컬 파일 크기와 비교하여 일치 확인
