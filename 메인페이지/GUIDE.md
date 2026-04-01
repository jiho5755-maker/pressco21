# 메인페이지 가이드

> 메이크샵 쇼핑몰 메인 홈페이지
> 편집 위치: 관리자 > 디자인 관리 > 메인 디자인

## 정본 관계

**정본은 `makeshop-skin/main/` 폴더입니다.** 이 폴더의 파일은 사본입니다.

| 이 폴더 | 정본 (makeshop-skin) | 관계 |
|---------|---------------------|------|
| `js.js` | `main/main.js` | 동일 내용 유지 필수 |
| `css.css` | `main/main.css` | 동일 내용 유지 필수 |
| `Index.html` | `main/main.html` | 동일 내용 유지 필수 |

개발은 `makeshop-skin/main/`에서 하고, 이 폴더는 자동 동기화됩니다.
불일치 발견 시 `makeshop-skin/main/`을 기준으로 덮어씁니다.

---

## 파일 구성

| 파일 | 메이크샵 탭 | 크기 | 설명 |
|------|-----------|------|------|
| `Index.html` | HTML 탭 | 89KB (1,330줄) | 전체 페이지 마크업 (가상태그 포함) |
| `css.css` | CSS 탭 | 65KB (2,500줄+) | 전체 스타일 (YouTube 섹션 포함) |
| `js.js` | JS 탭 | 55KB (1,270줄) | 상품 로드 + Swiper + YouTube 자동화 전체 |

### 폴더 구조

```
메인페이지/
├── Index.html                  ← 메이크샵 배포 파일 (수정 금지)
├── css.css                     ← 메이크샵 배포 파일 (디자인 수정 여기서)
├── js.js                       ← 메이크샵 배포 파일 (로직 수정 시 주의)
├── GUIDE.md                    ← 이 파일
└── 유튜브 자동화/              ← YouTube 자동화 관련 파일 모음
    ├── youtube-section-design-guide.md   ← 디자이너용 CSS 수정 가이드
    ├── youtube-production-guide.md       ← 운영·기술 가이드
    └── n8n-워크플로우/
        ├── WF-YT-youtube-api.json        ← 영상 API 수신
        ├── WF-YT-SYNC-video-sync.json    ← 영상 자동 동기화 (매일)
        ├── WF-YT-CATALOG-product-sync.json  ← 메이크샵 상품 연동
        ├── WF-YT-COMMENTS-comment-parse.json ← 댓글 파싱
        └── WF-YT-AI-MATCH-ai-keyword-match.json ← AI 재료 매칭 (매일 04:00)
```

---

## 섹션 구성

### HTML 내 섹션 순서

1. **메인 배너** — Swiper 롤링 배너 (PC/MO 이미지 분리, `.main-banner`)
2. **카테고리 아이콘** (`#section01`) — 8개 카테고리 아이콘
3. **카테고리 슬라이더** — Swiper 카테고리별 상품 (`.category-swiper`)
4. **New Arrival 탭** (`#section02`) — 8개 상품 탭 (신상/특가/추천/추가1~5)
5. **Weekly Best** (`#section04`) — 베스트 상품 그리드
6. **YouTube Learn & Shop** (`#weekyoutube` / `.youtube-section-v3`) — YouTube 자동화 섹션
7. **이벤트** (`#section03`) — 이벤트 배너
8. **브랜드 철학** (`#section05`) — 브랜드 소개

---

## JS 탭 주요 구성

`js.js`는 **IIFE 패턴** `(function() { 'use strict'; ... })()` 으로 전체 감싸져 있음.

### `get_main_list()` — 상품 목록 AJAX 로드
- URL: `/m/product_list.action.html`
- `action_mode: GET_MAIN_PRODUCT_LIST`
- 페이지네이션: `is_page_end` 확인 후 "더보기" 버튼 제어

### Swiper 초기화 (`initSwipers()`)
- `mainBannerSwiper` — 메인 배너 (autoplay 3초, loop, fraction pagination)
- `categorySwiper` — 카테고리 슬라이더 (모바일 1.2개 → PC 3.3개)

### YouTube 자동화 섹션 (`loadYouTube` / `renderYouTube`)
`js.js` 내 IIFE 안에서 동작 (HTML 인라인 스크립트 아님).

| 함수 | 역할 |
|------|------|
| `loadYouTube()` | n8n 웹훅 호출 → 영상 목록 수신 → 캐시 저장 |
| `renderYouTube()` | 메인 영상 + 슬라이더 + 인기 재료 패널 렌더링 |
| `ytPlayVideo(videoId)` | 썸네일 클릭 시 YouTube iframe 재생 |
| `toggleProducts()` | "인기 재료" 패널 열기/닫기 (모바일) |
| `ytScrollToFeatured()` | 영상 전환 시 스마트 스크롤 (뷰포트 밖일 때만) |

**데이터 흐름**: `n8n WF-YT` → `NocoDB YouTube Base` → `n8n /webhook/youtube-api` → `js.js loadYouTube()`

**캐시**: `localStorage` 30분 캐시 (키: `yt_cache_n8n_v2`)

**스와이프 처리**: 네이티브 `touchmove` / `mousemove` 이벤트로 탭/스와이프 구분
- 5px 이상 이동 = 스와이프 → 영상 전환 차단
- 짧은 탭만 영상 전환

---

## 주요 치환코드

### 상품 루프
```
<!--/loop_new_product(8)/--> ~ <!--/end_loop_new_product/-->
<!--/loop_special_product(8)/--> ~ <!--/end_loop_special_product/-->
<!--/loop_recmd_product(8)/--> ~ <!--/end_loop_recmd_product/-->
<!--/loop_best_product(8)/--> ~ <!--/end_loop_best_product/-->
<!--/loop_addprd1_product(8)/--> ~ (addprd1~5)
```

### 상품 속성 (`new_product` 예시, 다른 타입도 동일)
```
<!--/new_product@link/-->          상품 URL
<!--/new_product@image_l/-->       대표 이미지
<!--/new_product@name/-->          상품명
<!--/new_product@price_sell/-->    판매가
<!--/new_product@icon/-->          아이콘 (NEW, SALE 등)
<!--/new_product@discountrate/-->  할인율
<!--/new_product@price_coupon/-->  쿠폰 적용가
```

### 조건문
```
<!--/if_new_product@discountrate/--> 할인율 있으면
<!--/else_if_new_product@price_coupon/--> 쿠폰가 있으면
<!--/end_if/-->
```

### 공통
```
<!--/include_header(1)/--> 헤더
<!--/include_footer(1)/--> 푸터
```

---

## 배너 이미지 CDN
```
https://jewoo.img4.kr/2026/homepage/main_banner/PC_01.jpg  (PC)
https://jewoo.img4.kr/2026/homepage/main_banner/MO_01.jpg  (모바일)
https://jewoo.img4.kr/2026/homepage/Icon/icon-01.png       (카테고리 아이콘)
```

---

## 주의사항

### 공통
- jQuery 의존 (`$`, `$.ajax`)
- `mySwiper` 사용 (메이크샵 내장 Swiper 래퍼)
- **`${변수명}` 패턴 금지**: 메이크샵 편집기가 치환코드로 오인 → 저장 실패. 반드시 `\${변수명}`으로 이스케이프
- **`let` / `const` 금지**: 메이크샵 편집기 파싱 오류 발생. `var`만 사용

### Index.html 수정 금지
원본 가상태그가 손상된 3곳(lines 802, 892, 1075)이 있어 수정 시 파서 오류 발생.
모든 동적 변경은 `js.js`에서 DOM 조작으로 처리.

### YouTube 섹션 디자인 수정
`유튜브 자동화/youtube-section-design-guide.md` 참고.
CSS 클래스 이름은 `js.js`가 직접 참조하므로 변경 금지.

### 메이크샵 편집기 저장 후 반영
CSS/JS 수정 후 반드시 편집기에서 **저장** 버튼을 눌러야 실서버에 반영됨.
