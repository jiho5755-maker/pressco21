# 1초 로그인 (킵그로우) 가이드

> SNS 간편 로그인 UI - 킵그로우(KeepGrow) 서비스 연동
> 편집 위치: 관리자 > 디자인 관리 > 로그인 디자인 (각 페이지별)

## 3가지 변형

### 1. 회원 로그인 (`회원 로그인/`)
- 기본 로그인 페이지
- SNS 로그인 4종 + ID/PW 토글
- CSS 클래스: `.login-version-member`

### 2. 구매시 로그인 (`구매시 로그인/`)
- 회원 로그인 + **비회원 구매 버튼** 추가
- `<!--/link_order_guest/-->` 치환코드 사용
- CSS 클래스: `.login-version-purchase`

### 3. 주문 조회 로그인 (`주문 조회 로그인/`)
- **탭 UI**: 일반회원 로그인 / 비회원 주문조회
- 비회원 주문조회: 주문자명 + 주문번호 입력
- `<!--/form_order_guest/-->`, `<!--/input_guest_name/-->`, `<!--/input_guest_order_no/-->` 사용
- CSS 클래스: `.login-version-order`

## 공통 파일 구조 (각 변형별)

| 파일 | 설명 | 줄 수 |
|------|------|-------|
| `index.html` | HTML 원본 | 121~163줄 |
| `index.fixed.html` | 개선 버전 | +7줄 |
| `css.css` | CSS 원본 | 1,013줄 |
| `css.fixed.css` | 개선 CSS | 1,026줄 |
| `js.js` | 공통 JS (IIFE) | 69줄 |

## SNS 로그인 지원

| SNS | 버튼 클래스 | 치환코드 |
|-----|-----------|---------|
| Facebook | `.fb-login-btn` | `<!--/link_login_facebook/-->` |
| Kakao | `.kakao-login-btn` | `<!--/link_login_kakao/-->` |
| Naver | `.naver-login-btn` | `<!--/link_login_naver/-->` |
| Apple | `.apple-login-btn` | `<!--/link_login_apple/-->` |

각 SNS 버튼은 `<!--/if_link_login_XXX/-->` 조건문으로 감싸져 있어,
관리자에서 해당 SNS 로그인을 활성화한 경우에만 표시됩니다.

## JS 주요 함수 (js.js)

### `initLoginToggle()`
- jQuery 로드 대기 (setTimeout 재시도)
- `#toggleTraditionalLogin` 클릭 → `.mlog-sign` 토글
- 토글 시 입력 필드 자동 포커스

### 엔터키 로그인
- `#simpleLogin .mlog-sign input` keypress 이벤트
- Enter(13) 감지 → 로그인 버튼 href 실행

### 탭 메뉴 (주문조회 버전 전용)
- `.cw-tab li` 클릭 → `.tab-content` active 전환

## 주요 치환코드

### 로그인 폼
```
<!--/form_login/-->           로그인 폼 시작
<!--/input_login_id/-->       ID 입력 필드
<!--/input_login_pw/-->       PW 입력 필드
<!--/checkbox_save_id/-->     ID 저장 체크박스
<!--/checkbox_auto_login/-->  자동 로그인 (모바일만)
<!--/checkbox_security/-->    보안 로그인
<!--/link_login_button/-->    로그인 제출 URL
<!--/end_form/-->             폼 종료
```

### 비회원 주문조회 (주문조회 버전만)
```
<!--/form_order_guest/-->     비회원 주문조회 폼
<!--/input_guest_name/-->     주문자명 입력
<!--/input_guest_order_no/--> 주문번호 입력
<!--/link_order_guest/-->     주문조회/비회원구매 URL
```

### 링크
```
<!--/link_join/-->            회원가입 URL
<!--/link_password_lost/-->   아이디/비밀번호 찾기 URL
```

## 가입 혜택 표시
- 무료배송 쿠폰
- 적립금 3,000원
- 즉시 5% 할인

## 주의사항
- `<!--/if_use_login_sns/-->` 조건문으로 전체 SNS 로그인 영역이 감싸져 있음
- `<!--/if_is_mobile/-->` 조건: 자동 로그인 체크박스는 모바일에서만 표시
- jQuery 의존 (jQuery 로드 전 실행 시 setTimeout으로 재시도)
- `changeNaviTitleText('로그인')` - 메이크샵 내장 함수
- 외부 CSS 참조: `간편로그인.css` / 외부 JS 참조: `간편로그인.js` (메이크샵에 업로드 필요)
