/**
 * =============================================
 * Task 151: 메이크샵 치환코드 검증 스크립트
 * =============================================
 *
 * 목적:
 * 1. {$member_id} 등 치환코드가 서버에서 실제 값으로 치환되는지 확인
 * 2. 비로그인 상태에서 치환코드 출력값 확인
 * 3. JS에서 치환된 값을 읽어 GAS fetch 파라미터로 전달 가능한지 확인
 *
 * 메이크샵 D4 제약:
 * - var 선언 사용 (let/const 불가)
 * - 템플릿 리터럴 \${} 불가 -> 문자열 연결 사용
 * - IIFE 패턴으로 전역 오염 방지
 */
(function() {
  'use strict';

  // ===== 결과 수집 객체 =====
  var results = {
    testDate: new Date().toISOString(),
    pageUrl: window.location.href,
    substitutionCodes: {},
    loginDetection: {},
    gasFetchTest: null,
    summary: ''
  };

  // ===== 1. 치환코드 읽기 테스트 =====
  function testSubstitutionCodes() {
    var codes = [
      { id: 'member-id', code: 'member_id', el: 'raw-member-id' },
      { id: 'member-name', code: 'member_name', el: 'raw-member-name' },
      { id: 'member-group', code: 'member_group', el: 'raw-member-group' }
    ];

    codes.forEach(function(item) {
      var rawEl = document.getElementById(item.el);
      var rawValue = rawEl ? rawEl.textContent.trim() : '';
      var jsCell = document.getElementById('js-' + item.id);
      var statusCell = document.getElementById('status-' + item.id);

      // JS에서 읽은 값 표시
      if (jsCell) {
        jsCell.textContent = rawValue ? '"' + rawValue + '"' : '(빈 문자열)';
      }

      // 치환 결과 판정
      var pattern = '{' + '$' + item.code + '}';
      var status;
      if (rawValue === pattern) {
        // 치환코드가 그대로 남아있음 = 서버 치환 실패 (로컬 테스트 등)
        status = 'untouched';
        if (statusCell) {
          statusCell.textContent = '미치환 (로컬?)';
          statusCell.className = 'fail';
        }
      } else if (rawValue === '' || rawValue.length === 0) {
        // 빈 문자열 = 비로그인 또는 치환 후 빈 값
        status = 'empty';
        if (statusCell) {
          statusCell.textContent = '빈 문자열 (비로그인?)';
          statusCell.className = 'pending';
        }
      } else {
        // 실제 값으로 치환됨 = 로그인 상태
        status = 'substituted';
        if (statusCell) {
          statusCell.textContent = '치환 성공!';
          statusCell.className = 'pass';
        }
      }

      results.substitutionCodes[item.code] = {
        rawValue: rawValue,
        status: status,
        pattern: pattern
      };
    });
  }

  // ===== 2. 비로그인 확인 (if_login 없이 직접 삽입) =====
  function testDirectSubstitution() {
    var directEl = document.getElementById('raw-member-id-direct');
    var noteEl = document.getElementById('note-direct');
    var loginStatusEl = document.getElementById('login-status');

    var directValue = directEl ? directEl.textContent.trim() : '';
    var pattern = '{' + '$' + 'member_id}';

    if (directValue === pattern) {
      if (noteEl) noteEl.textContent = '치환코드 미처리 (로컬 환경)';
      results.loginDetection.directValue = directValue;
      results.loginDetection.isLocal = true;
    } else if (directValue === '') {
      if (noteEl) noteEl.textContent = '빈 문자열로 치환됨 (비로그인 확정)';
      results.loginDetection.directValue = '';
      results.loginDetection.isLoggedOut = true;
    } else {
      if (noteEl) noteEl.textContent = '실제 ID로 치환됨 (로그인 상태)';
      results.loginDetection.directValue = directValue;
      results.loginDetection.isLoggedIn = true;
    }

    // 로그인 여부 종합 판정
    var memberId = results.substitutionCodes.member_id;
    var isLoggedIn = memberId && memberId.status === 'substituted';
    var isLocal = memberId && memberId.status === 'untouched';

    if (loginStatusEl) {
      if (isLocal) {
        loginStatusEl.textContent = '판별 불가 (로컬 환경)';
        loginStatusEl.style.color = '#6c757d';
      } else if (isLoggedIn) {
        loginStatusEl.textContent = '로그인 상태 (ID: ' + memberId.rawValue + ')';
        loginStatusEl.style.color = '#28a745';
      } else {
        loginStatusEl.textContent = '비로그인 상태';
        loginStatusEl.style.color = '#dc3545';
      }
    }
  }

  // ===== 3. GAS fetch 전달 테스트 =====
  function setupGasTest() {
    var btn = document.getElementById('btn-gas-test');
    if (!btn) return;

    btn.addEventListener('click', function() {
      var gasUrl = document.getElementById('gas-url-input').value.trim();
      var resultEl = document.getElementById('gas-result');

      if (!gasUrl) {
        resultEl.textContent = 'GAS URL을 입력해주세요.';
        return;
      }

      var memberId = '';
      var memberIdData = results.substitutionCodes.member_id;
      if (memberIdData && memberIdData.status === 'substituted') {
        memberId = memberIdData.rawValue;
      }

      if (!memberId) {
        resultEl.textContent = '회원 ID가 없습니다 (비로그인 또는 로컬 환경).';
        results.gasFetchTest = { success: false, reason: 'no_member_id' };
        return;
      }

      resultEl.textContent = 'GAS 호출 중...';

      var fetchUrl = gasUrl + '?action=verify&member_id=' + encodeURIComponent(memberId);

      fetch(fetchUrl, {
        method: 'GET',
        mode: 'cors'
      })
      .then(function(response) {
        return response.text();
      })
      .then(function(text) {
        resultEl.textContent = 'GAS 응답 성공!\n\n' + text;
        results.gasFetchTest = {
          success: true,
          memberId: memberId,
          response: text.substring(0, 500)
        };
      })
      .catch(function(error) {
        resultEl.textContent = 'GAS 호출 실패: ' + error.message
          + '\n\n(CORS 에러인 경우 GAS 배포 설정에서 "누구나 접근" 허용 필요)';
        results.gasFetchTest = {
          success: false,
          memberId: memberId,
          error: error.message
        };
      });
    });
  }

  // ===== 4. 종합 결과 =====
  function generateSummary() {
    var summaryEl = document.getElementById('summary');
    var lines = [];

    var memberId = results.substitutionCodes.member_id;
    var memberName = results.substitutionCodes.member_name;

    if (!memberId) {
      lines.push('치환코드 테스트 결과를 읽을 수 없습니다.');
    } else if (memberId.status === 'untouched') {
      lines.push('[로컬 환경] 치환코드가 처리되지 않았습니다.');
      lines.push('메이크샵 D4 개별 페이지에 배포 후 다시 확인하세요.');
    } else if (memberId.status === 'substituted') {
      lines.push('[로그인 상태] 치환코드 정상 동작 확인!');
      lines.push('- member_id: "' + memberId.rawValue + '"');
      if (memberName && memberName.status === 'substituted') {
        lines.push('- member_name: "' + memberName.rawValue + '"');
      }
      lines.push('');
      lines.push('Phase 2 파트너 인증 메커니즘 적용 가능:');
      lines.push('1. HTML에 치환코드 삽입 -> 서버가 실제 ID로 렌더링');
      lines.push('2. JS에서 DOM으로 읽기 -> GAS fetch 파라미터 전달');
      lines.push('3. GAS에서 파트너 매칭 -> 인증 완료');
    } else {
      lines.push('[비로그인 상태] 치환코드가 빈 문자열로 치환됨.');
      lines.push('로그인 후 다시 확인하세요.');
      lines.push('');
      lines.push('비로그인 판별: 빈 문자열 체크로 구현 가능');
    }

    results.summary = lines.join('\n');
    if (summaryEl) summaryEl.textContent = results.summary;
  }

  // ===== 5. JSON 내보내기 =====
  function setupExport() {
    var btn = document.getElementById('btn-export');
    if (!btn) return;

    btn.addEventListener('click', function() {
      var output = document.getElementById('json-output');
      var json = JSON.stringify(results, null, 2);
      if (output) output.textContent = json;

      // 클립보드 복사
      if (navigator.clipboard) {
        navigator.clipboard.writeText(json).then(function() {
          btn.textContent = '복사 완료!';
          setTimeout(function() { btn.textContent = '결과 JSON 복사'; }, 2000);
        });
      }
    });
  }

  // ===== 초기화 =====
  function init() {
    // 날짜 표시
    var dateEl = document.getElementById('test-date');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleString('ko-KR');
    }

    testSubstitutionCodes();
    testDirectSubstitution();
    setupGasTest();
    generateSummary();
    setupExport();
  }

  // DOM 로드 후 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
