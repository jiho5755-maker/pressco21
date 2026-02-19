# Task 101: 메인페이지 JS IIFE + 탭 지연 로드 + 스켈레톤 UI

> **상태**: 대기
> **규모**: M
> **예상 기간**: 3~4일
> **의존성**: 없음
> **우선순위**: 높음

## 목표

메인페이지의 JS 코드 품질과 로딩 성능을 개선한다. IIFE 패턴으로 전역 스코프 오염을 방지하고, 탭 지연 로드와 스켈레톤 UI로 체감 성능을 높인다.

## 대상 파일

- `메인페이지/js.js` (4,769B, 128줄)
- `메인페이지/Index.html` (88,996B, ~1,331줄)
- `메인페이지/css.css` (33,585B, ~1,396줄)

## 현재 상태 분석

### js.js
- **IIFE 미적용**: 모든 코드가 전역 스코프에서 실행됨
- **강한 jQuery 의존**: `$.ajax()`, `$()` 선택자 다수 사용
- **보안 위험**: `javascript:` 프로토콜로 동적 href 주입 (25줄)
  ```javascript
  $('.'+_page_html+' > a').prop('href', "javascript:get_main_list(...)");
  ```
- **전역 함수**: `get_main_list()`, `get_page_id()` 전역 노출
- **탭 로드**: 초기 로드 시 모든 탭 데이터를 AJAX로 요청

### Index.html
- **인라인 스크립트**: 하단 1204~1331줄에 YouTube/Swiper 초기화 코드가 `$(function(){})` 내 인라인
- **lazy loading 없음**: 모든 이미지가 `src` 속성으로 즉시 로드
- **스켈레톤 UI 없음**: YouTube 섹션에만 로딩 스피너 존재
- **HTML 마크업 오류**: 탭 구조에서 `<ul>` 없이 `</li>` 닫힘 태그 발견
- **배너**: Swiper 기반, PC/모바일 반응형 (`pc-only`, `mo-only` 클래스)

### css.css
- **부분적 스코핑**: `#section01`~`#section05` ID 기반 스코핑 사용
- **CSS 변수**: `:root`에 정의되어 있으나 파일 하단(653줄)에 위치
- **`!important` 과다**: 209, 214, 226, 902, 936줄 등 다수
- **전역 스타일**: `#container { padding: 0 !important; }` 최상단에 존재

## 구현 단계

- [ ] **1단계: 현재 코드 백업 + 분석**
  - `js.js` → `js.backup.js` 복사
  - `get_main_list()` 호출 위치 전수 확인 (HTML 내 인라인 호출 포함)
  - jQuery 의존 부분과 순수 JS 대체 가능 부분 구분

- [ ] **2단계: js.js IIFE 감싸기**
  - 전체 코드를 `(function() { 'use strict'; ... })();`로 감싸기
  - `get_main_list`는 `window.get_main_list = get_main_list;`로 명시적 전역 노출
  - `javascript:` 프로토콜 href 주입을 `addEventListener('click', ...)` 이벤트 위임으로 교체
  - `var` 선언 정리, 불필요한 전역 변수 제거

- [ ] **3단계: 탭 지연 로드 구현**
  - 초기 로드 시 활성 탭(첫 번째)만 AJAX 로드
  - 나머지 탭은 클릭 시 최초 1회만 로드 (로드 완료 플래그 관리)
  - 이미 로드된 탭 재클릭 시 AJAX 재요청 방지
  - 모바일 탭 클릭 시 활성 탭 자동 중앙 스크롤 (`scrollIntoView`)

- [ ] **4단계: 스켈레톤 UI 추가**
  - New Arrival 탭 전환 시 스켈레톤 로딩 UI 표시
  - CSS 애니메이션 기반 (`@keyframes shimmer`) 펄스 효과
  - 상품 카드 레이아웃에 맞는 스켈레톤 형태 (이미지 + 제목 + 가격)
  - AJAX 응답 수신 후 스켈레톤 → 실제 콘텐츠 교체

- [ ] **5단계: 인라인 스크립트 통합**
  - Index.html 하단의 YouTube/Swiper 초기화 스크립트를 `js.js`로 이동
  - DOMContentLoaded 또는 Intersection Observer 기반 초기화
  - YouTube iframe → 썸네일 클릭 시 로드 방식으로 변경 (성능)

- [ ] **6단계: 이미지 lazy loading**
  - 배너(첫 화면) 제외, 하단 섹션부터 `<img loading="lazy">` 적용
  - 배너 이미지에는 `fetchpriority="high"` 추가
  - CLS 방지를 위해 이미지에 `width`/`height` 속성 명시

- [ ] **7단계: 배너 UX 개선**
  - Swiper pagination을 프로그레스 바 스타일로 변경
  - 배너별 CTA 버튼 텍스트/링크 강화
  - 자동 재생 + 호버 시 정지

- [ ] **8단계: CSS 정리**
  - CSS 변수(`:root`) 선언을 파일 최상단으로 이동
  - 불필요한 `!important` 제거 (선택자 우선순위로 해결)
  - HTML 마크업 오류 수정 (탭 구조 `<ul>` 태그 보완)

## 수락 기준

- [ ] js.js 전체가 IIFE로 감싸져 있다
- [ ] `window`에 노출되는 함수는 `get_main_list`만 존재한다
- [ ] `javascript:` 프로토콜 href가 0개이다
- [ ] 초기 로드 시 활성 탭만 AJAX 호출한다
- [ ] 비활성 탭 클릭 시 1회만 AJAX 로드되고, 이후 재요청하지 않는다
- [ ] 탭 전환 시 스켈레톤 UI가 표시된다
- [ ] 배너 제외 이미지에 `loading="lazy"` 적용되어 있다
- [ ] Index.html에 인라인 `<script>` 블록이 없다 (초기화 코드 모두 js.js로 통합)
- [ ] 기존 기능(탭 전환, 배너, 상품 목록, YouTube)이 정상 동작한다
- [ ] 메이크샵 가상 태그(`{$치환코드}`, `<!-- -->`)가 보존되어 있다

## 테스트 체크리스트

- [ ] PC 브라우저 테스트 (Chrome, Safari)
- [ ] 모바일 브라우저 테스트 (iOS Safari, Android Chrome)
- [ ] 탭 전환 동작 확인 (각 탭별 상품 로드)
- [ ] 스켈레톤 UI 표시/해제 타이밍 확인
- [ ] YouTube 영상 로드 정상 확인
- [ ] Swiper 배너 동작 확인 (자동재생, 수동 넘기기)
- [ ] 이미지 lazy loading 동작 확인 (Network 탭)
- [ ] 모바일 탭 중앙 스크롤 확인
- [ ] 콘솔 에러 0개 확인
- [ ] Lighthouse Performance 점수 측정 (baseline 대비 개선)

## 참고

- 코드 패턴 레퍼런스: `레지너스 화이트페이퍼/script.js`
- jQuery는 메이크샵 기본 로드이므로 제거 불가, IIFE 내에서 사용은 허용
- `get_main_list`는 메이크샵 HTML 탭 가상태그에서 호출하므로 전역 유지 필수

## 변경 사항 요약

(완료 후 작성)
