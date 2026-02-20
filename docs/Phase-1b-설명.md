# Phase 1b 작업 설명서

> **작업일**: 2026-02-20
> **범위**: Task 111, 112, 113 (Phase 1b 전체)
> **상태**: 개발 완료, 배포 전 테스트 필요

---

## Task 111: 유튜브 v4 카테고리 자동매칭 개발

### 개요
기존 v3 유튜브 섹션을 v4로 업그레이드. 영상 제목/설명/태그에서 키워드를 감지하여 관련 상품을 자동으로 매칭하는 시스템.

### 파일 구조
```
유튜브 자동화/v4-카테고리/
├── youtube-proxy-v3.gs    GAS 백엔드 (517줄)
├── js.js                  프론트엔드 JS (642줄)
├── css.css                스타일시트 (780줄)
└── Index.html             HTML 마크업 (37줄)
```

### 핵심 기능
1. **GAS 프록시 v3 (youtube-proxy-v3.gs)**
   - YouTube Data API v3로 채널 영상 조회 (제목, 설명, 태그, 조회수)
   - Google Sheets에서 키워드-카테고리 매핑 테이블 읽기
   - Google Sheets에서 카테고리-상품 매칭 데이터 읽기
   - CacheService 5분 캐싱
   - RSS 폴백: API 실패 시 RSS 피드로 기본 데이터 제공

2. **프론트엔드 (js.js)**
   - `autoMatchCategory()`: 영상 제목/설명/태그에서 키워드 감지, 긴 키워드 우선 정렬로 오탐 방지
   - localStorage 24시간 캐싱
   - Swiper CDN 슬라이더 (모바일 1.1, 태블릿 2.2, PC 4개)
   - 썸네일 클릭 시 iframe 로드 (성능 최적화)
   - 카테고리/NEW 배지, 조회수 포맷팅
   - 모바일 관련상품 아코디언 토글
   - XSS 방어: `escapeHTML()`, `escapeAttr()` 적용
   - 스켈레톤 UI (shimmer 로딩)

3. **CSS (css.css)**
   - `.youtube-v4-section` + `ytv4-` 접두사로 완전 스코핑
   - 반응형: 480px / 768px / 1024px 브레이크포인트
   - `prefers-reduced-motion` 접근성 대응
   - 스켈레톤 shimmer 애니메이션

### 배포 전 필수 작업
1. GAS 코드를 Google Apps Script에 배포하고 URL 획득
2. `js.js`의 `CONFIG.gasUrl`을 실제 배포 URL로 교체
3. Google Sheets에 키워드/상품 데이터 입력
4. GAS 스크립트 속성에 `YOUTUBE_API_KEY`, `SPREADSHEET_ID` 설정

---

## Task 112: 브랜드스토리 이미지 CDN + 디자인 전면 리뉴얼

### 개요
브랜드스토리 페이지를 현대적 럭셔리 브랜드 디자인으로 전면 리뉴얼. IIFE 패턴 적용, Swiper 갤러리 라이트박스 추가, 인쇄 스타일 추가.

### 파일 구조
```
브랜드스토리/브랜드페이지/
├── index.html          메인 HTML (976줄)
├── css/
│   ├── common.css      공통 스타일 + 폰트 + CSS변수 (283줄)
│   └── heritage.css    헤리티지 전용 스타일 (2,775줄)
├── js/
│   ├── common.js       공통 JS - IIFE (133줄)
│   └── heritage.js     헤리티지 JS - IIFE (720줄)
└── images/             이미지 폴더 (기존 유지)
```

### 핵심 변경 사항
1. **CSS 전면 리뉴얼**
   - `#heritage-main` 스코핑으로 메이크샵 충돌 방지
   - CSS 변수 기반 디자인 시스템 (--brand-primary: #7d9675 등)
   - Pretendard(본문) + Noto Serif KR(제목) 폰트 시스템
   - Ken Burns 히어로 효과, 페이드인 애니메이션
   - `@media print` 인쇄 스타일 (B2B 프레젠테이션용)
   - `prefers-reduced-motion` 접근성 대응

2. **JS 리뉴얼**
   - IIFE 패턴 적용 (전역 오염 방지)
   - Swiper 기반 갤러리 라이트박스 (전체화면 이미지 뷰어)
   - 인터랙티브 타임라인 모달 (1985~2025)
   - 갤러리 필터 (카테고리별 필터링)
   - 스크롤 애니메이션 (Intersection Observer)
   - 이미지 lazy loading
   - 접근성: 키보드 내비게이션, ARIA 속성, ESC 닫기

3. **이모지 -> SVG 변환**
   - 메이크샵 UTF-8 인코딩 문제 방지
   - Trust banner, value cards, education cards의 이모지를 SVG 아이콘으로 교체

4. **CDN 마이그레이션 준비**
   - 각 이미지 위치에 `TODO: CDN 마이그레이션` 주석 표시
   - CDN 패턴: `//jewoo.img4.kr/2026/homepage/brand/{폴더}/{파일명}`

### 외부 라이브러리
- jQuery 3.6.0 (Slick 의존성)
- Slick Carousel 1.8.1 (도서 캐러셀)
- Swiper 11 (갤러리 라이트박스)

---

## Task 113: 레지너스 화이트페이퍼 CTA + PDF + 디자인 전면 리뉴얼

### 개요
레지너스 화이트페이퍼의 디자인을 브랜드 디자인 시스템으로 통일하고, CTA 버튼, PDF 내보내기, Schema.org 구조화 데이터를 추가.

### 파일 구조
```
레지너스 화이트페이퍼/
├── index.html    메인 HTML (632줄)
├── style.css     스타일시트 (1,858줄)
└── script.js     JS (295줄)
```

### 핵심 변경 사항
1. **디자인 리뉴얼 (style.css)**
   - 브랜드 그린(#7d9675) 기반 CSS 변수 시스템
   - 기존 민트(#8ED8C8) -> 브랜드 그린(#7d9675)으로 통일
   - Pretendard + Noto Serif KR 폰트
   - 반응형: 480px / 768px / 992px
   - `@media print` 인쇄/PDF 스타일
   - CTA 섹션 스타일 (구매 유도 버튼, 배지)
   - PDF 내보내기 버튼 스타일

2. **CTA 섹션 추가 (index.html)**
   - "Resiners Purair로 더 안전하게 창작하세요" 구매 유도
   - SGS 인증, VOCs 83.59% 제거 등 주요 특징 배지
   - 메이크샵 상품 페이지 링크 연동
   - 무료 배송/30일 반품 보장 안내

3. **PDF 내보내기 (script.js)**
   - `window.printWhitepaper()` 함수 추가
   - `window.print()` 기반 인쇄/PDF 저장
   - `@media print` 스타일과 연동하여 깔끔한 출력

4. **Schema.org 구조화 데이터 (script.js)**
   - `injectSchema()` 함수로 TechArticle 데이터 동적 삽입
   - 메이크샵 중괄호 오인 방지 (JSON-LD를 JS에서 동적 생성)
   - SEO 구조화 데이터 제공

5. **Chart.js 보존**
   - 기존 VOCs 감소 그래프 완전 보존
   - 차트 색상만 브랜드 컬러로 변경

---

## 공통 기술 사항

### 메이크샵 D4 호환성
- 템플릿 리터럴 `${var}` 미사용 (문자열 연결만 사용)
- `let`/`const` 미사용 (`var`만 사용)
- CSS 전역 셀렉터 미사용 (컨테이너 스코핑)
- 가상 태그 `{$치환코드}` 보존
- IIFE 패턴으로 전역 변수 오염 방지

### 폰트 시스템 통일
- 본문: Pretendard (CDN: jsDelivr)
- 제목: Noto Serif KR (CDN: Google Fonts)
- 브랜드 컬러: Primary #7d9675, Dark #2c3e30, BG #fdfbf7
