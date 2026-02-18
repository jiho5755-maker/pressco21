# 메인페이지 가이드

> 메이크샵 쇼핑몰 메인 홈페이지
> 편집 위치: 관리자 > 디자인 관리 > 메인 디자인

## 파일 구성

| 파일 | 메이크샵 탭 | 크기 | 설명 |
|------|-----------|------|------|
| `Index.html` | HTML 탭 | 87KB (1,330줄) | 전체 페이지 마크업 + 인라인 스크립트 |
| `css.css` | CSS 탭 | 33KB (1,395줄) | 전체 스타일 |
| `js.js` | JS 탭 | 4.7KB (130줄) | 상품 로드 + Swiper + 탭 메뉴 |

## 섹션 구성

### HTML 내 섹션 순서
1. **메인 배너** - Swiper 롤링 배너 (PC/MO 이미지 분리, `.main-banner`)
2. **카테고리 아이콘** (`#section01`) - 8개 카테고리 (압화, 보존화, 레진공예, 하바리움, DIY, 부케말리기, 식물표본, ...)
3. **카테고리 슬라이더** - Swiper 카테고리별 상품 (`.category-swiper`)
4. **New Arrival 탭** (`#section02`) - 8개 상품 탭
   - 신상품 (new), 특가 (special), 추천 (recmd), 추가1~5 (add1~5)
   - 탭 클릭 시 `get_main_list()` AJAX 호출
5. **Weekly Best** (`#section04`) - 베스트 상품 그리드
6. **YouTube Learn & Shop** (`#weekyoutube`) - 유튜브 영상 + 관련 상품
7. **이벤트** (`#section03`) - 이벤트 배너
8. **브랜드 철학** (`#section05`) - 브랜드 소개

### 인라인 스크립트 (HTML 안에 포함됨)
HTML 파일 내에 `<script>` 태그로 다음이 포함되어 있음:
- 메인 배너 Swiper 초기화
- 카테고리 Swiper 초기화
- YouTube 섹션 (loadYouTube, renderYouTube, playVideo, toggleProducts)
- 탭 메뉴 상품 로드 호출

## JS 탭 주요 함수

### `get_main_list(_t_name, _page, _element, _page_html, _row)`
메이크샵 AJAX 상품 목록 로드 함수
- URL: `/m/product_list.action.html`
- `action_mode`: `GET_MAIN_PRODUCT_LIST`
- 페이지네이션: `is_page_end` 확인 후 "더보기" 버튼 제어

### Swiper 초기화
- `mainSwiper` - 메인 배너 (autoplay 3초, loop, fraction pagination)
- `categorySwiper` - 카테고리 슬라이더 (모바일 1.2개, 태블릿 3개, PC 3.3개)

### 탭 메뉴
- `#section02 .tab-nav-wrap ul li button` 클릭 이벤트
- active 클래스 토글 + 탭 스크롤 애니메이션

## 주요 치환코드

### 상품 루프
```
<!--/loop_new_product(8)/--> ~ <!--/end_loop_new_product/-->
<!--/loop_special_product(8)/--> ~ <!--/end_loop_special_product/-->
<!--/loop_recmd_product(8)/--> ~ <!--/end_loop_recmd_product/-->
<!--/loop_best_product(8)/--> ~ <!--/end_loop_best_product/-->
<!--/loop_addprd1_product(8)/--> ~ (addprd1~5)
```

### 상품 속성 (new_product 예시, 다른 타입도 동일 패턴)
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

## 배너 이미지 CDN
```
https://jewoo.img4.kr/2026/homepage/main_banner/PC_01.jpg  (PC)
https://jewoo.img4.kr/2026/homepage/main_banner/MO_01.jpg  (모바일)
https://jewoo.img4.kr/2026/homepage/Icon/icon-01.png       (카테고리 아이콘)
```

## 주의사항
- jQuery 의존 (`$`, `$.ajax`)
- `mySwiper` 사용 (메이크샵 내장 Swiper 래퍼)
- 인라인 스크립트가 HTML 탭에 포함되어 있으므로 HTML/JS 탭을 함께 관리해야 함
- YouTube 섹션은 `유튜브 자동화/현재-배포/` 코드와 동일 (메인 HTML에 인라인으로 삽입됨)
