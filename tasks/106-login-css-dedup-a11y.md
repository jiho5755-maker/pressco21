# Task 106: 1초 로그인 CSS 중복 제거 + 접근성

> **상태**: 대기
> **규모**: S
> **예상 기간**: 1~2일
> **의존성**: 없음

## 목표

1초 로그인 3개 변형의 중복 CSS를 공통 1개 파일로 통합하고, 접근성(autocomplete, ARIA, 비밀번호 토글)을 개선한다.

## 대상 파일

- `1초 로그인(킵그로우)/회원 로그인/` (index.fixed.html, css.fixed.css, js.js)
- `1초 로그인(킵그로우)/구매시 로그인/` (index.fixed.html, css.fixed.css, js.js)
- `1초 로그인(킵그로우)/주문 조회 로그인/` (Index.fixed.html, css.fixed.css, js.js)

## 현재 상태 분석

### CSS 중복 현황
- **3개 폴더의 css.fixed.css가 ~96% 동일** (각 1,027줄)
- 모두 `#loginWrap, #loginWrap *` 스코핑 적용 완료 (Phase 0에서 처리)
- **차이점 (966~999줄 부근)**:

| 항목 | 회원 (member) | 구매 (purchase) | 주문조회 (order) |
|------|-------------|----------------|----------------|
| `.form-check gap` | `20px 16px` | `20px 1rem` | `20px 16px` |
| `.form-check-label white-space` | `nowrap` | `normal` | `nowrap` |
| `.welcome-subtitle color` | `#666` | `#777` | `#666` |
| 비회원 구매 버튼 | 없음 | `.btn-non-member` 있음 | 없음 |
| 탭 메뉴 | 없음 | 없음 | `.cw-tab` 있음 |

### HTML 구조
- **회원**: SNS 로그인 + "아이디로 로그인하기" 토글 (`login-version-member`)
- **구매**: 회원과 동일 + "비회원 구매" 버튼 (`login-version-purchase`)
- **주문조회**: 탭 메뉴(일반회원/비회원 주문조회) + SNS 로그인 (`login-version-order`)

### 접근성 현황
| 항목 | 상태 |
|------|------|
| `autocomplete` 속성 | 미적용 (3개 모두) |
| `role` 속성 | 미적용 (토글 버튼, 탭 메뉴) |
| `aria-*` 속성 | 미적용 (expanded, selected, controls 등) |
| 비밀번호 토글 | 미구현 (3개 모두) |
| 입력 필드 | 메이크샵 가상태그(`<!--/input_login_id/-->`)로 렌더링 |

### JS 현황
- IIFE 패턴 적용됨
- jQuery 의존 (로드 확인 후 실행)
- 토글: `#toggleTraditionalLogin` 표시/숨김
- 탭 메뉴: `#member-login` / `#non-member-order` 전환 (주문조회만)

## 구현 단계

- [ ] **1단계: 공통 CSS 파일 추출**
  - `1초 로그인(킵그로우)/common.css` 신규 생성
  - 3개 css.fixed.css에서 공통 부분 추출 (~960줄)
  - 공통 CSS: `#loginWrap` 스코핑 기본 스타일, SNS 버튼, 폼, 반응형 등
  - 각 변형별 css.fixed.css는 차이점만 남김:

  **회원 로그인 오버라이드** (~5줄):
  ```css
  .login-version-member .form-check { gap: 20px 16px; }
  .login-version-member .form-check-label { white-space: nowrap; }
  ```

  **구매 로그인 오버라이드** (~10줄):
  ```css
  .login-version-purchase .form-check { gap: 20px 1rem; }
  .login-version-purchase .form-check-label { white-space: normal; }
  .login-version-purchase .welcome-subtitle { color: #777; }
  .login-version-purchase .btn-non-member { /* 비회원 구매 버튼 */ }
  ```

  **주문조회 오버라이드** (~30줄):
  ```css
  .login-version-order .cw-tab { /* 탭 메뉴 스타일 */ }
  .login-version-order .form-check { gap: 20px 16px; }
  ```

- [ ] **2단계: HTML에서 공통 CSS 로드**
  - 각 index.fixed.html에 공통 CSS를 먼저, 변형별 CSS를 후순위로 로드
  - 메이크샵 HTML 탭 구조에서 CSS 로드 방식 확인 (인라인 vs 링크)
  - 메이크샵에서 외부 CSS 파일 참조가 불가능할 경우:
    - 공통 CSS를 각 파일에 유지하되, 소스 관리용 공통 파일만 별도 보관
    - 변경 시 공통 파일에서 수정 후 3개 파일에 복사하는 워크플로우 문서화

- [ ] **3단계: autocomplete 속성 추가**
  - 메이크샵 가상태그(`<!--/input_login_id/-->`)로 렌더링되는 input에는 직접 속성 추가 불가
  - **JS로 동적 추가**:
    ```javascript
    var idInput = document.querySelector('#loginWrap input[name="id"]');
    var pwInput = document.querySelector('#loginWrap input[name="passwd"]');
    if (idInput) idInput.setAttribute('autocomplete', 'email');
    if (pwInput) pwInput.setAttribute('autocomplete', 'current-password');
    ```
  - 주문조회 비회원 폼:
    - 주문자명: `autocomplete="name"`
    - 주문번호: `autocomplete="off"`

- [ ] **4단계: 에러 메시지 role="alert" 적용**
  - 로그인 실패 시 표시되는 에러 메시지 영역에 `role="alert"` 추가
  - `aria-live="assertive"` 속성으로 스크린 리더에 즉시 알림
  - 에러 메시지가 메이크샵 서버에서 렌더링될 경우 JS로 동적 속성 추가

- [ ] **5단계: 비밀번호 표시/숨기기 토글 버튼 추가**
  - 비밀번호 입력 필드 우측에 눈 모양 아이콘 버튼 추가
  - 클릭 시 `type="password"` ↔ `type="text"` 전환
  - 아이콘: CSS로 눈 열림/닫힘 표현 (외부 아이콘 라이브러리 미사용)
  - `aria-label="비밀번호 표시"` / `aria-label="비밀번호 숨기기"` 동적 전환
  - CSS: `#loginWrap .password-toggle` 스코핑

- [ ] **6단계: 토글/탭 ARIA 속성**
  - **아이디 로그인 토글** (3개 공통):
    - 토글 버튼: `role="button"`, `aria-expanded="false"`, `aria-controls="traditionalLogin"`
    - 클릭 시 `aria-expanded` 동적 전환
  - **탭 메뉴** (주문조회만):
    - `<ul class="cw-tab">`: `role="tablist"`
    - 각 탭 `<li>` 내 `<a>`: `role="tab"`, `aria-selected="true/false"`, `aria-controls="panelId"`
    - 탭 패널: `role="tabpanel"`, `aria-labelledby="tabId"`
    - 키보드: 좌/우 화살표로 탭 이동, Enter로 선택

## 수락 기준

- [ ] 공통 CSS가 분리되어 변형별 CSS에는 차이점만 존재한다
- [ ] 3개 변형 모두 기존과 동일하게 렌더링된다 (시각적 변경 없음)
- [ ] 이메일/비밀번호 입력 필드에 `autocomplete` 속성이 적용된다
- [ ] 에러 메시지에 `role="alert"` 속성이 있다
- [ ] 비밀번호 표시/숨기기 토글 버튼이 동작한다
- [ ] 토글 버튼에 `aria-expanded` 속성이 동적으로 전환된다
- [ ] 주문조회 탭에 `role="tablist/tab/tabpanel"` 속성이 적용된다
- [ ] 메이크샵 가상 태그가 보존되어 있다
- [ ] IIFE 패턴이 유지된다

## 테스트 체크리스트

- [ ] PC 브라우저 테스트 (Chrome, Safari)
- [ ] 모바일 브라우저 테스트 (iOS Safari, Android Chrome)
- [ ] 3개 변형 모두 기존과 시각적으로 동일한지 스크린샷 비교
- [ ] 비밀번호 토글 동작 확인
- [ ] autocomplete 동작 확인 (브라우저 자동완성 제안 표시)
- [ ] 스크린 리더 테스트 (macOS VoiceOver)
- [ ] 키보드 네비게이션 (Tab, Enter, 화살표)
- [ ] 로그인 기능 정상 동작 확인
- [ ] SNS 로그인(카카오, 네이버, 페이스북, Apple) 정상 동작 확인
- [ ] 콘솔 에러 0개 확인

## 참고

- 메이크샵 가상태그(`<!--/input_login_id/-->`)로 생성되는 input 요소는 HTML에서 직접 속성 추가 불가 → JS로 동적 처리
- `css.fixed.css`는 Phase 0에서 이미 `#loginWrap` 스코핑 적용 완료
- 공통 CSS 파일 관리: 메이크샵 HTML 탭 특성상 실제 배포 시에는 각 폴더에 전체 CSS를 넣어야 할 수 있음 (소스 관리 목적으로만 분리)

## 변경 사항 요약

### 분석 결과
- 3개 폴더의 `css.fixed.css`가 **100% 동일** (diff 차이 0줄)
- 3개 폴더의 `js.js`도 **100% 동일**
- 공통 CSS 파일 분리 대신, 하나 수정 후 3개 폴더에 동일 복사하는 방식 채택

### JS 변경 (3개 파일 동일 적용)
- `1초 로그인(킵그로우)/회원 로그인/js.js` → 구매시·주문조회에 복사
- **'use strict'** 추가
- **aria-expanded 토글**: 클릭 시 `#toggleTraditionalLogin`의 `aria-expanded` 동적 전환
- **탭 ARIA**: `.cw-tab li` 클릭 시 `aria-selected` 동적 전환
- **initAutocomplete()**: 메이크샵 가상태그 input에 autocomplete 동적 추가
  - `input[name="id"]` → `autocomplete="email"`
  - `input[name="passwd"]` → `autocomplete="current-password"`
  - `input[name="order_name"]` → `autocomplete="name"`
  - `input[name="order_id"]` → `autocomplete="off"`
- **initPasswordToggle()**: 비밀번호 필드 옆에 SVG 눈 아이콘 토글 버튼 동적 생성
  - `type="password"` ↔ `type="text"` 전환
  - `aria-label` 동적 전환 ("비밀번호 표시" / "비밀번호 숨기기")

### CSS 변경 (3개 파일 동일 적용)
- `1초 로그인(킵그로우)/회원 로그인/css.fixed.css` → 구매시·주문조회에 복사
- **`.password-toggle`** 스타일 추가 (위치, 색상, hover/active 상태)
- **`.pwd`** `position: relative` 추가 (비밀번호 토글 절대 위치 기준점)

### HTML 변경
- **3개 파일 공통**: 토글 버튼에 `role="button"`, `aria-expanded="false"`, `aria-controls="traditionalLoginForm"` 추가. 로그인 폼에 `id="traditionalLoginForm"` 추가
- **주문조회 전용**: `<ul class="cw-tab">`에 `role="tablist"`, 각 탭 `<a>`에 `role="tab"`, `aria-selected`, `id` 추가. 탭 콘텐츠에 `role="tabpanel"`, `aria-labelledby` 추가

### 미구현 항목
- **공통 CSS 파일 분리**: 3개 파일이 100% 동일하여 분리 불필요. 수정 시 하나 수정 후 복사 워크플로우 사용
- **에러 메시지 role="alert"**: 메이크샵 서버 렌더링 에러 메시지의 구조 확인 불가. 실제 배포 후 확인 필요
- **키보드 화살표 탭 이동**: 기본 탭/클릭 동작만 구현. 화살표 키 네비게이션은 향후 개선 가능
