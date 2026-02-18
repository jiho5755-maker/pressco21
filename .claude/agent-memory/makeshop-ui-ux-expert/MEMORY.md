# makeshop-ui-ux-expert Memory

## 관련 메모리 파일
- [makeshop-failures.md](./makeshop-failures.md) - 메이크샵 적용 실패 이력 추적

## 핵심 기술 제약 요약
- JS 내 `${variable}` → 반드시 `\${variable}` 이스케이프
- 가상 태그(`{$...}`, `<!-- -->`, `<makeshop:>`) 절대 수정/삭제 금지
- CSS는 반드시 고유 컨테이너로 스코핑 (전역 셀렉터 금지)
- JS는 IIFE 패턴 필수
- UTF-8 이모지 사용 금지
- 외부 라이브러리는 CDN `<script>` 태그로만

## 프로젝트 구조
- 메인페이지: `메인페이지/Index.html`, `css.css`, `js.js`
- 파일 네이밍: `Index.html`(HTML탭), `css.css`(CSS탭), `js.js`(JS탭)
- `*.fixed.*` = 개선/수정 버전

## 디자인 시스템 핵심
- 프라이머리 컬러: `#7d9675` (세이지 그린)
- 헤더: `#637561`, 푸터: `#425B51`
- 메인 폰트: Pretendard, 폴백: Noto Sans KR
- 반응형 기준: 768px / 992px / 1200px
- border-radius: 이미지 카드 15px, 탭 25px, 상품 카드 8px
