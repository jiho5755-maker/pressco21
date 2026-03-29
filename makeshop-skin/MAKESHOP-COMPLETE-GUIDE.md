# MAKESHOP D4 (카멜레온) 완전 개발 가이드

> **PRESSCO21 메이크샵 스킨 엔터프라이즈 레퍼런스**
> 스킨명: 리뉴얼 1b 03.01(COPY) | dgnset_id: `49435` | 최종 갱신: 2026-03-17

---

## 목차

- [Part 1: 기술 환경 & 스킨 구조](#part-1)
- [Part 2: 디자인 시스템](#part-2)
- [Part 3: 공통 레이아웃 헤더/푸터](#part-3)
- [Part 4: 페이지별 가상태그 완전 레퍼런스](#part-4)
- [Part 5: 가상태그 시스템 심화](#part-5)
- [Part 6: 개발 패턴 & 컴포넌트](#part-6)
- [Part 7: 코드 작성 규칙](#part-7)
- [Part 8: 체크리스트 & 부록](#part-8)

---

## Part 1: 기술 환경 & 스킨 구조

### 1.1 편집기 개요

| 항목 | 값 |
|------|-----|
| 플랫폼 | MakeShop D4 (카멜레온) 호스팅 |
| 스킨명 | 리뉴얼 1b 03.01(COPY) [내 쇼핑몰 스킨] |
| dgnset_id | `49435` |
| 렌더링 | 서버사이드 가상태그 치환 → HTML 전달 |
| 편집기 | CodeMirror (HTML/CSS/JS 탭) |
| 빌드 도구 | 없음 (Vanilla HTML/CSS/JS Only) |

**CodeMirror 코드 추출 (Chrome 콘솔):**
```javascript
document.querySelector('.CodeMirror').CodeMirror.getValue()
```

---

### 1.2 스킨 파일 구조

각 페이지 폴더에는 4개 파일 세트:
```
{페이지}/
├── {page}.html       ← 편집기 "디자인 편집(HTML)" 탭
├── {page}.css        ← 편집기 "CSS" 탭
├── {page}.js         ← 편집기 "JS" 탭
└── {page}.vtags.txt  ← 해당 페이지 사용 가능 가상태그 목록
```

게시판 폴더:
```
boards/{template}/
├── list.html/css/js/vtags.txt
├── view.html/css/js/vtags.txt
├── write.html/css/js/vtags.txt
└── password.html/css/js
```

로컬 폴더 구조:
```
makeshop-skin/
├── _common/common.css (3,338줄)  common.js (43줄)
├── _env/design-env.txt
├── header/basic/           header.html(388줄) header.css(817줄)
├── footer/basic/           footer.html(139줄) footer.css(176줄)
├── main/                   main.html(1,281줄) main.css(2,835줄)
├── category/
├── product/                shopdetail, best_product, shopsearch 등
├── member/                 login, join, join_terms 등
├── order/                  basket, order_pay, order_complete_oo 등
├── mypage/                 mp_main, mp_order_oo, mp_reserve 등 25개
├── pages/partnerclass-*/   8개 개별 페이지
├── boards/base/ board-N/ image-N/
├── mobile-banner/
└── event-popup/
```

---

### 1.3 기술 스택

| 분류 | 라이브러리 | 로드 방식 |
|------|-----------|---------|
| CSS 프레임워크 | Bootstrap 5 Grid | common.css 내장 |
| 슬라이더 | Swiper.js (mySwiper11) | MakeShop CDN |
| 아이콘 | Font Awesome 4.x | 헤더 HTML |
| 한글 폰트 | Pretendard (9 weight) | common.css @font-face |
| 세리프 폰트 | Noto Serif KR | Google CDN |
| 영문 장식 | Cormorant Garamond | Google CDN |
| 미니 산세리프 | Min Sans | jsDelivr CDN |
| jQuery | jQuery | 메이크샵 자동 제공 |

**주요 CDN 태그:**
```html
<link href="https://cdn.jsdelivr.net/gh/poposnail61/min-sans@main/web/css/minsans-dynamic-subset.css" rel="stylesheet">
<link href="//skin.makeshop.co.kr/skin/js/mySwiper11/mySwiper_11.css" rel="stylesheet">
<script src="//skin.makeshop.co.kr/skin/js/mySwiper11/mySwiper_11.js"></script>
```

---

### 1.4 편집기 ↔ 로컬 폴더 매핑

| 편집기 메뉴 경로 | 로컬 경로 |
|---------------|---------|
| 디자인 환경 설정 | `_env/design-env.txt` |
| 공통 CSS-js > CSS | `_common/common.css` |
| 공통 CSS-js > JS | `_common/common.js` |
| 상단 > 기본 상단 [C] | `header/basic/` |
| 하단 > 기본 하단 [C] | `footer/basic/` |
| 중앙 > 메인 | `main/` |
| 중앙 > 카테고리 | `category/` |
| 중앙 > 상품관련 | `product/` |
| 중앙 > 회원관련 | `member/` |
| 중앙 > 주문관련 | `order/` |
| 중앙 > 마이페이지 | `mypage/` |
| 중앙 > 개별 페이지 | `pages/` |
| 게시판 디자인 | `boards/` |

---

## Part 2: 디자인 시스템

### 2.1 CSS 변수 체계

3계층 구조:
1. `--cw-*` : 메이크샵 D4 기본 (common.css :root)
2. `--bs-*` : Bootstrap 5 (common.css Bootstrap Reboot)
3. `--color-*` : PRESSCO21 커스텀 브랜드 (main.css :root)

**메이크샵 기본 변수 (`--cw-*`):**

| 변수명 | 값 | 용도 |
|--------|-----|------|
| `--cw-font-sans-serif` | `Pretendard, system-ui, sans-serif` | 기본 폰트 |
| `--cw-heading-color` | `#121212` | 제목 색상 |
| `--cw-point-color` | `#FF4600` | 포인트 오렌지 |
| `--cw-error-color` | `#DC3545` | 에러 빨강 |
| `--cw-light-color` | `#999` | 라이트 텍스트 |
| `--cw-color-10` | `#f6f6f6` | 뉴트럴 스케일 (10단계) |
| `--cw-color-20` | `#eeeeee` | |
| `--cw-color-30` | `#dddddd` | |
| `--cw-color-60` | `#888888` | 보조 텍스트 |
| `--cw-color-80` | `#444444` | 본문 텍스트 계열 |
| `--cw-color-90` | `#343434` | 어두운 뉴트럴 |
| `--cw-border-radius` | `4px` | 기본 radius |
| `--cw-size-8` | `0.5rem` | 사이즈 스케일 |
| `--cw-size-16` | `1rem` | |
| `--cw-size-24` | `1.5rem` | |
| `--cw-size-32` | `2rem` | |

**PRESSCO21 커스텀 변수 (`--color-*`):**
```css
:root {
  --color-primary:       #7d9675;   /* 세이지 그린 */
  --color-primary-light: #b7c9ad;   /* 밝은 세이지 — 헤더 배경 */
  --color-dark:          #2c3e30;   /* 다크 그린 — 파트너 primary */
  --color-text:          #4a4a4a;   /* 본문 텍스트 */
  --color-bg:            #fdfbf7;   /* 크림 아이보리 배경 */
  --color-white:         #ffffff;
  --color-accent:        #d4a373;   /* 골드/테라코타 액센트 */
  --spacing-section:     70px;      /* 섹션 간격 */
  --spacing-container:   1400px;    /* 컨테이너 최대폭 */
}
```

---

### 2.2 폰트 체계

| 용도 | 폰트 패밀리 |
|------|-----------|
| 본문 기본 | `'Pretendard', 'Noto Sans KR', sans-serif` |
| 타이틀/헤딩 | `'Noto Serif KR', serif` |
| 영문 장식 | `'Cormorant Garamond', serif` |
| 미니 산세리프 | `'Min Sans'` (헤더) |

---

### 2.3 색상 팔레트

| 계열 | 값 | 용도 |
|------|-----|------|
| 그린 Primary | `#7d9675` | 메인 브랜드, 버튼 |
| 그린 Light | `#b7c9ad` | 헤더 배경 |
| 그린 Dark | `#2c3e30` | 다크 네비, 파트너 |
| 그린 Footer | `#425b51` | 푸터 배경 |
| 베이지 BG | `#fdfbf7`, `#f7f3eb` | 페이지 배경 |
| 골드 Accent | `#d4a373`, `#b8865a` | CTA, 강조 |
| 텍스트 | `#4a4a4a` (본문), `#888` (보조) | |
| 포인트 | `#FF4600` (메이크샵 기본) | 할인율, 가격 강조 |

---

### 2.4 레이아웃 & 브레이크포인트

```css
/* 기본: 모바일 ~767px */
@media (min-width: 768px)  { /* 태블릿~ */ }
@media (min-width: 992px)  { /* 데스크탑~ */ }
@media (min-width: 1200px) { /* 와이드~ */ }
```

**페이지 기본 컨테이너 구조:**
```html
<!--/include_header(1)/-->
<div id="container">
  <div id="contents">
    <main id="{페이지ID}" class="container">
      <!-- 페이지 내용 -->
    </main>
  </div>
</div>
<!--/include_footer(1)/-->
```

**common.css 구조:**

| 구간 | 줄 범위 | 내용 |
|------|---------|------|
| CSS 변수 | 1~129 | `--cw-*` 메이크샵 기본 |
| Pretendard | 131~194 | @font-face 9 weight |
| Bootstrap Reboot | 195~265 | `--bs-*` 변수 |
| CSS Reset | 266~640 | HTML 요소 기본 |
| Bootstrap Grid | 640~1960 | Container/Row/Col/Utils |
| DatePicker | 1960~2100 | 날짜 선택 UI |
| 상품/페이지 공통 | 2100~2660 | 상품카드, 탭, 팝업 |
| 폼/유틸리티 | 2660~3338 | 입력폼, 반응형 |

---

## Part 3: 공통 레이아웃 (헤더/푸터)

### 3.1 헤더 HTML 구조 (header/basic/header.html, 388줄)

```
header#header
├─ .nav-wrap (height:64px, bg:#b7c9ad)
│  ├─ #head_banner (if_head_banner 조건)
│  ├─ .logo-wrap (절대위치, 중앙)
│  ├─ .nav (PC 카테고리, 768px미만 숨김)
│  │  └─ loop_category1 → category2 → category3 (3depth)
│  └─ .item-box.right (검색/마이페이지/장바구니)
│
├─ .menu-popup-wrap (모바일 메뉴, position:fixed)
│  ├─ 로그인/프로필 (if_login 분기)
│  ├─ 마이페이지 쇼트컷 4개
│  ├─ 검색창
│  ├─ loop_category1 → category2 (2depth)
│  └─ 커뮤니티/고객센터
│
├─ aside (사이드 패널, position:fixed, width:320px)
│  ├─ 탭 (카테고리/커뮤니티/마이페이지)
│  ├─ .navCategory (3depth)
│  ├─ .navCommunity
│  └─ .navMypage (if_login)
│
├─ #ly_lastView (최근 본 상품)
│  └─ loop_view_product_ajax(6)
│
└─ .side-sfinder-wrap (스마트 검색 파인더)
   └─ loop_smart_finder → smart_finder@items@name
```

**3depth 카테고리 패턴:**
```html
<!--/loop_category1/-->
<li>
  <a href="<!--/category1@link/-->"><!--/category1@name/--></a>
  <!--/if_category1@category2/-->
  <ul>
    <!--/loop_category1@category2/-->
    <li>
      <a href="<!--/category1@category2@link/-->"><!--/category1@category2@name/--></a>
      <!--/if_category1@category2@category3/-->
      <ul>
        <!--/loop_category1@category2@category3/-->
        <li><a href="<!--/category1@category2@category3@link/-->"><!--/category1@category2@category3@name/--></a></li>
        <!--/end_loop/-->
      </ul>
      <!--/end_if/-->
    </li>
    <!--/end_loop/-->
  </ul>
  <!--/end_if/-->
</li>
<!--/end_loop/-->
```

---

### 3.2 헤더 CSS 주요 클래스 (header.css, 817줄)

| 선택자 | 역할/속성 |
|--------|---------|
| `#header` | `position:fixed; top:0; z-index:5; width:100%` |
| `.nav-wrap` | `height:64px; background:#b7c9ad` |
| `#header.fixed .nav-wrap` | `background:#fff` (스크롤 시) |
| `.logo-wrap` | `position:absolute; left:50%; transform:translateX(-50%)` |
| `.nav` | `display:flex` (PC), `display:none` (MO) |
| `.sub-menu-wrap` | `position:absolute; display:none` → hover 시 `display:block` |
| `.menu-popup-wrap` | `position:fixed; width:100%; height:100vh; display:none` |
| `.menu-popup-wrap.active` | `display:block` |
| `aside` | `position:fixed; right:0; width:320px; display:none` |
| `.side-sfinder-wrap` | `position:fixed; right:-100%` → `.active: right:0` |
| `.scroll-top-wrap` | `position:fixed; bottom:140px; right:15px` |

---

### 3.3 헤더 가상태그 레퍼런스

```
<!-- 배너 -->
if_head_banner / head_banner / end_if

<!-- 카테고리 (3depth) -->
loop_category1
  category1@name / category1@link
  if_category1@category2
    loop_category1@category2
      category1@category2@name / @link
      if_category1@category2@category3
        loop_category1@category2@category3
          category1@category2@category3@name / @link
        end_loop
      end_if
    end_loop
  end_if
end_loop

<!-- 네비게이션 링크 -->
link_home / link_basket / link_mypage
link_login / link_logout / link_join
link_order_list / link_reserve / link_coupon
link_faq (if_link_faq 조건)
link_m2m_question / link_review

<!-- 회원 상태 -->
if_login / if_not_login
user_name / user_basket_quantity
remain_coupon_count / order_total_price
next_group_name / next_group_price_gap / next_group_benefit

<!-- 검색 -->
form_search
input_search_word(search_auto_completion)
link_search_button

<!-- 최근 본 상품 AJAX -->
loop_view_product_ajax(6)
  view_product_ajax@link / @mobile_image / @name
end_loop

<!-- 스마트 파인더 -->
loop_smart_finder
  smart_finder@title
  loop_smart_finder@items
    smart_finder@items@name
  end_loop
end_loop

<!-- 스토어 -->
shop_name / img_shop_logo

<!-- 전체 게시판 목록 (모바일 메뉴) -->
if_all_board_list
  loop_all_board_list
    all_board_list@name / @link
  end_loop
end_if
```

---

### 3.4 푸터 HTML 구조 (footer/basic/footer.html, 139줄)

```
#footer (bg:#425b51, color:#fff)
├─ .container-wrap.pc-only
│  ├─ 좌측: 로고 + company_owner/addr/number
│  ├─ 중앙: link_useinfo/contract/privacy + 빠른링크
│  └─ 우측: shop_phone + loop_shop_cs + loop_shop_account
└─ .container-wrap.mo-only
   ├─ 빠른링크
   ├─ 고객센터 번호
   └─ 기본 정보
```

**푸터 가상태그:**
```
link_home / company_name / company_owner / company_addr
privacy_charge / company_number / online_sale_number / shop_phone
loop_shop_cs → shop_cs@value
loop_shop_account → shop_account@value
link_useinfo / link_contract / link_privacy
link_attendance / link_login / link_logout / if_login
```

---

## Part 4: 페이지별 가상태그 완전 레퍼런스

### 4.1 메인 페이지 (main/vtags.txt, 642줄)

**상품 루프 5종 — 공통 속성셋:**

각 상품 루프(`loop_best_product`, `loop_new_product`, `loop_recmd_product`, `loop_special_product`, `loop_add[CODE]_product`)는 동일한 속성을 가진다.

```
loop_{type}_product
  {type}_product@name              ← 상품명
  {type}_product@subname           ← 부제
  {type}_product@engname           ← 영문명
  {type}_product@link              ← 상품 링크
  {type}_product@image_l           ← 큰 이미지
  {type}_product@image_m           ← 중간 이미지
  {type}_product@image_s           ← 작은 이미지
  {type}_product@mobile_image      ← 모바일 이미지
  {type}_product@price_sell        ← 판매가
  {type}_product@price_consumer    ← 소비자가(정가)
  {type}_product@price_replace     ← 대체가
  {type}_product@reserve_price     ← 적립금액
  {type}_product@reserve_percent   ← 적립률
  {type}_product@is_soldout        ← 품절 여부
  {type}_product@is_short_soldout  ← 재고 부족 여부
  {type}_product@icons             ← 상품 아이콘
  {type}_product@discount_icon     ← 할인 아이콘
  {type}_product@power_review_count   ← 파워리뷰 수
  {type}_product@power_review_score   ← 파워리뷰 점수
  {type}_product@wish_count        ← 관심상품 수
  {type}_product@uid               ← 상품 UID
  {type}_product@brand             ← 브랜드
  {type}_product@ranking           ← 순위 (best 전용)
end_loop
```

**기간할인 추가 속성 (best_product 기준):**
```
best_product@discount_icon / @mobile_discount_icon
best_product@discount_info / @discount_message
best_product@discount_remain_daytime / @discount_remain_sec_time
best_product@price_discount / @discount_price_difference
if_best_product@discount_apply_type
```

**색상 표시:**
```
loop_best_product@color
  best_product@color@name / @code
end_loop
```

**이벤트 배너:**
```
loop_event_banner
  event_banner@image / @link / @subject
end_loop
```

**게시판 위젯 (동적 코드 치환):**
```
board_[BOARD_CODE]@subject   ← 게시글 제목
board_[BOARD_CODE]@link      ← 게시글 링크
board_[BOARD_CODE]@writer    ← 작성자
board_[BOARD_CODE]@thumbnail ← 썸네일 이미지
```
예: `board_jewoo@subject`, `board_jewoo_board2@subject`

**분류별 베스트:**
```
loop_category_best_product_[CATE1_CODE]
  category_product_[CATE1_CODE]@name / @link / @image_m ...
end_loop
```

**리뷰:**
```
loop_review
  review@content / @score@icon / @writer / @product_name / @attach_image
end_loop
loop_power_review_best
  power_review_best@content / @score / @writer
end_loop
```

**회원/검색 (메인 페이지):**
```
form_login / checkbox_auto_login
img_user / user_greeting / user_nickname / user_name
input_search_word(search_auto_completion) / form_search
rolling_text
loop_poll → poll@radio_choice
```

**추가 상품 그룹 ([CODE] 동적):**
```
loop_add[CODE]_product      ← [CODE] 자리에 관리자 설정 코드 입력
  add[CODE]_product@name / @link / @image_m ...
end_loop
```

---

### 4.2 카테고리 페이지 (category/category.html)

```html
<!--/include_header(1)/-->
<div id="container">
  <div id="contents">
    <main id="join">
      <!--/loop_category1/-->
      <li>
        <a href="<!--/category1@link/-->"><!--/category1@name/--></a>
      </li>
      <!--/end_loop/-->
    </main>
  </div>
</div>
<!--/include_footer(1)/-->
```

**가상태그:**
```
include_header(1) / include_footer(1)
loop_category1 → category1@name / @link
```

---

### 4.3 상품 베스트/목록 (product/best_product.vtags.txt)

4.1의 best_product 상품 속성셋 동일. 추가 태그:
```
block_best_product / block_product_more
link_more_best_product_list
list_start_num / list_end_num
block_current_page_cnt / block_total_page_cnt
user_name / shop_id / banner_plan
```

---

### 4.4 상품 상세 (product/shopdetail.vtags.txt, 712줄)

**분류 경로:**
```
cate1_name / cate2_name / cate3_name
link_cate1 / link_cate2 / link_cate3
select_category / select_category2
now_cate_name / link_select_navigation
```

**이전/다음 상품:**
```
link_prev / link_next
next_product_name / next_product_image_l/m/s
```

**상품 기본 정보:**
```
name / subname / engname / mobile_name
brand / code / addcode / number / style_code / model
origin / manufacture / weight
image_l / image_m / image_s / mobile_image
multi_image_enlarge / multi_image
loop_multi_image_list → multi_image_list@img / @link
icons / mobile_icons
view_count / wish_cnt
```

**가격:**
```
price_sell / price_consumer / price_replace
discount_percent / option_price_sell
reserve_percent_price / point / package_point
foreign_price_sell / currency_name / currency_sign
if_price_replace / if_selling / if_soldout / if_stop_order
```

**기간할인:**
```
dc_icon / mobile_dc_icon / dc_price_sell
dc_price_all / dc_price_origin / dc_price_sub
dc_period / dc_period_daytime / dc_period_time
dc_start_date / dc_end_date / dc_message / dc_text
dc_remain_sec_time / if_discount_apply_type
```

**배송/혜택:**
```
delivery_title / delivery_detail / delivery_order_price
if_group_free_delivery / delivery_info / if_delivery_type
subs_price (정기배송가) / subs_icon
coupon_discount_price / coupon_real_discount_price
reserve / point / point_unit / used_mobile_reserve
```

**옵션:**
```
form_product
loop_option → option@select / @title
  option@oneclick_list / @oneclick_value
loop_multi_option → multi_option@select / @title
  multi_option@oneclick_list / @oneclick_value
loop_option_add → option_add@select / @title
  option_add@input_quantity / @link_quantity_down / @up
loop_multi_option_add → multi_option_add@select / @title
option_stock / option_stock@name / @state / @note / @stock
block_option_stock / block_option_stock_more_on / _off
link_option_stock_more / link_option_select_complete
input_quantity / link_quantity_up / link_quantity_down
is_unify_option / multi_option_total_price
```

**구매 버튼:**
```
link_basket / link_immediate / link_wishlist / link_wish_toggle
block_btn_wish / btn_soldout
btn_kakaopay / btn_kakaopf / btn_shoppay / btn_dgg / btn_nhn / btn_payco / btn_app
link_scrap_fb / link_scrap_ka / link_scrap_tw / link_scrap_ks
```

**대량구매:**
```
loop_bulk_info
  bulk_info@min_stock / @max_stock / @percent / @price
end_loop
```

**상품 상세 정보:**
```
detail_common / mobile_detail
loop_product_info → product_info@title / @content
product_info_list / product_info_list@product_info@title / @content
```

**패키지 상품:**
```
loop_package_product
  package_product@name / @subname / @engname
  package_product@image_l/m/s / @mobile_image
  package_product@option@select / @title
  package_product@input_quantity / @link_quantity_down / @up
  package_product@price_replace / @point / @reserve
  package_product@package_releasedate
end_loop
package_price_sell / package_reserve / package_total_price
```

**관련 상품:**
```
loop_related_product
  related_product@name / @subname / @engname
  related_product@image_l/m/s / @mobile_image
  related_product@price_sell / @price_consumer / @price_replace
  related_product@icons / @mobile_icons / @is_soldout
  related_product@option@select / @title
  related_product@input_quantity
  related_product@reserve_price / @review_count / @uid
end_loop
form_related_product
```

**리뷰 (게시판형):**
```
loop_review_board
  review@subject / @content / @writer / @date_write
  review@attach_image / @score@icon / @link_delete / @reply
  loop_review_board@score → score@icon
  loop_review_board_comment → review_board_comment@content / @writer
end_loop
block_review / block_review_more
review_board_count / review_board_total_count / review_total_count
link_review_board_write / link_review_board_more
pager_mobile_review_board::current/next/prev/page/first/last (+ @link)
```

**추천 리뷰:**
```
loop_recmd_review
  recmd_review@content / @subject / @writer / @date_write
  recmd_review@score_text / @link / @group_icon
  recmd_review@attach_image / @attach_image2 / @attach_image3
end_loop
```

**Q&A:**
```
loop_qna_board
  qna_board@subject / @writer / @date_write
  qna_board@cnt_comment / @depth / @reply_status
  qna_board@link / @lock_icon / @new_icon
  loop_qna_board_comment
end_loop
link_qna_board_write / link_qna_board_more / qna_board_total_count
pager_qna_board::current/next/prev/page (+ @link)
```

**쿠폰 다운로드:**
```
loop_down_coupon_list
  down_coupon_list@name / @explain / @discount_price
  down_coupon_list@link_down / @valid_price / @reserve_price
  down_coupon_list@down_start_date / @down_end_date
  down_coupon_list@coupon_type / @number
  down_coupon_list@is_only_app / @is_only_mobile / @is_only_pc
end_loop
link_down_coupon
```

**포토갤러리:**
```
loop_photo_gallery → photo_gallery@image
```

**최근 본 상품:**
```
loop_view_product
  view_product@link / @image_s / @mobile_image / @name
end_loop
block_view_product / link_view_product_next / _prev / _open
```

**회원 그룹 안내:**
```
loop_group_list
  group_list@name / @price / @rate_dc
end_loop
group_message
```

**SNS/기타:**
```
afterdeli_icon / cache_sale_message / order_stock
consumer_discount_rate / coupon_discount_price_sell
if_is_short_soldout / if_weightdeli_use
link_product_detail
```

---

### 4.5 상품 검색 (product/shopsearch.vtags.txt)

```
input_keyword / keyword (현재 검색어)
link_search / form_search / input_search_word
loop_product / loop_product_list
  product@name / @link / @image_l/m/s / @mobile_image
  product@price_sell / @price_consumer / @is_soldout / @icons
end_loop
link_sort_date / link_sort_price_up / link_sort_price_down
link_sort_sell_count / link_sort_view_count
pager_product::current/next/prev/page/first/last (+ @link)
loop_hashtag → hashtag@name / @link
```

---

### 4.6 장바구니 (order/basket.vtags.txt, 315줄)

**장바구니 탭 (정기배송 사용 시):**
```
if_use_subs
  link_normal_basket / number/user_normal_basket_count
  link_subs_basket / number/user_subs_basket_count
else
  user_basket_count
end_if
if_not_basket  (빈 장바구니)
```

**상품 목록:**
```
loop_basket
  basket@checkbox_multi_basket   ← 체크박스
  basket@link_del / @link_option_modify
  basket@link_wish_toggle
  basket@image_m / @mobile_image
  basket@name / @subname / @engname
  basket@option / @addcode
  basket@price_sell / @price_consumer
  basket@reserve / @point
  basket@delivery_title / @delivery_type
  basket@link_realtime_quantity_down / @link_realtime_quantity_up
  basket@input_quantity
  basket@afterdeli_icon
end_loop
checkbox_multi_all(form-check-input) / link_multi_del
```

**금액 합계:**
```
none_groupsale_total_price_sell  ← 총상품금액
total_vat / total_delivery / total_delivery_add
group_sale_price / total_price   ← 최종결제금액
total_reserve                    ← 적립예정
sale_total_price_sell
```

**회원 그룹 혜택:**
```
group_benefit / group_add_benefit
group_benefit_info / group_benefit_buyprice
group_sale_reserve / group_wholesale_message
is_group_benefit / is_group_add_benefit
```

**재구매 추천:**
```
loop_rebuy_product
  rebuy_product@rebuy_discount / @rebuy_discount_icon
end_loop
```

**카트프리 혜택:**
```
loop_cart_free_list
  cart_free_list@name / @progress_percent
end_loop
if_cart_free
```

**구매 완료 상품:**
```
loop_purchased_product
loop_basket_appoint_product
```

---

### 4.7 주문서 작성 고급형 (order/order_pay.vtags.txt, 602줄)

**주문 상품:**
```
loop_order_product
  order_product@name / @subname / @engname / @addcode
  order_product@option / @amount / @unit_price / @total_price
  order_product@reserve / @point / @point_percent
  order_product@link / @mobile_image / @weight
  order_product@dc_icon / @dc_price_sell / @dc_message (기간할인)
  order_product@delivery_type / @basket_del
end_loop
total_package_price
```

**주문자 정보:**
```
input_user_email / input_user_tel
simple_user_name / simple_user_email / simple_user_tel
```

**배송지:**
```
input_receiver / input_receiver_addr1 / input_receiver_addr2
input_receiver_zip / input_receiver_mobile / input_receiver_tel
select_addr (저장 배송지 선택)
simple_receiver_name / simple_receiver_address / simple_receiver_mobile
checkbox_same_data (주문자와 동일)
checkbox_modify_address
text_delivery_message
form_addr_search / form_detail_addr
input_search_addr_text / link_addr_search
link_addr_ok / link_addr_close / link_addr_select_ok
block_addr_type_load / block_order_addr
```

**배송 설정:**
```
select_delivery_date / select_delivery_time
select_after_delivery (배송업체 선택)
input_calendar_date / link_calendar_open
if_group_free_delivery / delivery_date_message
```

**적립금/예치금:**
```
input_user_reserve / input_possible_reserve / input_remain_reserve
input_user_deposit / input_possible_deposit
select_reserve_discount / shop_limit_reserve / user_reserve_message
check_all_reserve / check_all_deposit
```

**스마트 쿠폰:**
```
form_coupon
loop_smart_coupon_check
  smart_coupon_check@name / @benefit / @price / @comment
  smart_coupon_check@expire / @payment / @payment@name
  smart_coupon_check@prd_reserve / @use_reserve / @use_group_benefit
  smart_coupon_check@check / @block_used
end_loop
loop_smart_coupon_radio
  smart_coupon_radio@name / @benefit / @price / @radio
  smart_coupon_radio@use_duplication
end_loop
loop_smart_coupon_delivery
  smart_coupon_delivery@name / @price / @radio
  smart_coupon_delivery@use_duplication / @delivery_def
end_loop
loop_smart_coupon_not_used
  smart_coupon_not_used@name / @benefit / @price
  smart_coupon_not_used@is_coupon_except / @is_delivery_price
  smart_coupon_not_used@is_use_mobile / @is_use_app
end_loop
smart_coupon_target / smart_coupon_type_text
smart_coupon_apply / smart_coupon_close
```

**일반 쿠폰:**
```
loop_coupon_list
  coupon_list@name / @sale / @explain / @number
  coupon_list@use_start_date / @use_end_date / @valid_price
  coupon_list@day_icon / @radio_selected / @item / @item_detail
  coupon_list@is_mobile_use / @is_app_use
end_loop
input_coupon_number / link_coupon / link_coupon_close
coupon_subject / coupon_desc / coupon_pay_check_price
block_coupon / block_smart_coupon / block_discount_coupon
```

**결제 수단:**
```
loop_pay_method_list
  pay_method_list@radio_pay_method
  pay_method_list@pay_type
  pay_method_list@bank_dcprice / @group_dc_price
  pay_method_list@input_bankname / @select_account
  pay_method_list@is_pay_benefit
end_loop
```

**현금영수증:**
```
block_cashbill
input_cashbill_resno / input_cashbill_tel / input_cashbill_card
input_cashbill_companyname / input_cashbill_companyno
select_cashbill_type
radio_cashbill_ok / radio_cashbill_no
link_cashbill_ok / link_cashbill_no
```

**세금계산서:**
```
block_evidence / block_evidence_taxbill_data
input_evidence_taxbill_addr1 / ...
input_evidence_cashbill_card / ...
```

**개인정보 동의:**
```
block_contract_term / block_privercy_policy / block_third_party
contract_terms / privercy_terms / privercy_terms1/2/3
third_party_terms / recall_policy / trust_terms
summary_contract_terms / summary_privercy_terms
radio_contract_ok / radio_privercy_policy_ok / radio_recall_policy_ok
link_contract_view / link_privercy_policy_view / link_recall_policy_view
checkbox_pay_agree / checkbox_refund_agree / checkbox_before_pay
```

**공급자별 상품:**
```
loop_provider_product
  provider_product@name / @provider_code
  provider_product@total_delivery / @total_product
  provider_product@total_sumprice / @total_vat
  provider_product@total_coupon_price / @expect_reserve
  loop_provider_product@list
    provider_product@list@name / @subname / @engname
    provider_product@list@image_s / @mobile_image / @link
    provider_product@list@option / @amount
    provider_product@list@unit_price / @total_price / @total_price_sell
    provider_product@list@consumer_price / @consumer_unit_price
    provider_product@list@total_discount_price / @total_discount_unit_price
    provider_product@list@reserve / @point / @delivery_type
    provider_product@list@afterdeli_icon / @quick_delivery_icon
  end_loop
end_loop
if_provider
```

**금액 합계:**
```
total_price / total_delivery / total_delivery_add
total_reserve / total_vat
group_benefit / group_sale_price / group_sale_reserve
```

---

### 4.8 주문 완료 (order/order_complete_oo.vtags.txt)

```
order_num / pay_method / pay_price / bank_name
receiver / receiver_addr / receiver_zip / receiver_mobile / receiver_tel
delivery_message / delivery_price / discount_price
use_reserve / use_deposit / user_point / total_point
total_sum_price / order_product_amount
sender / present_message (선물 관련)

loop_order_product
  order_product@name / @option / @amount
  order_product@price / @unit_price / @consumer_price
  order_product@cate1_name / @cate2_name / @cate3_name
  order_product@product_id / @addcode
  order_product@delivery_type / @mobile_image / @link
  order_product@point / @reserve / @weight
end_loop

loop_add_info → add_info@title / @value
loop_extension_info → extension_info@title / @price / @reserve / @type
loop_extension_sum → extension_sum@title / @price

refund_bank / refund_account / refund_name (환불 계좌)
link_complete / link_home / link_back
if_order_complete / if_is_present / if_not_is_present
if_multiple / if_re_basket_fail_message / if_weightdeli_use
```

---

### 4.9 회원가입 약관 (member/join_terms.vtags.txt)

```
checkbox_all_agree / form_agree
link_agree / link_reject

<!-- 이용약관 -->
checkbox_contract_ok / contract_terms / summary_contract_terms

<!-- 개인정보처리방침 -->
privercy_terms / privercy_terms1/2/3
summary_privercy_terms

<!-- 제3자 제공 -->
block_third_party / third_party_terms / summary_third_party_terms

<!-- 신규 개인정보 동의 -->
new_privacy_agree / new_privacy_terms

include_header / include_footer
shop_language / shop_id
```

---

### 4.10 로그인 (member/login.vtags.txt)

```
form_login
input_login_id / input_login_pw
checkbox_auto_login / checkbox_save_id / checkbox_security
link_login_button / link_logout_button
link_join / link_home / link_back

block_login_fail_wrap / block_login_fail_no_id / block_login_fail_no_match
link_login_fail_close

<!-- SNS 로그인 -->
link_login_kakao / link_login_naver / link_login_apple / link_login_facebook
recent_login_kakao / recent_login_naver / ...

if_login / if_cookie_support / if_company_user
group_level / remain_coupon_count
include_header / include_footer / shop_id / shop_language
```

---

### 4.11 마이페이지 메인 (mypage/mp_main.vtags.txt)

**주문 현황 (3개월):**
```
three_month_order_all / three_month_order_ready / three_month_order_ok
three_month_delivery_ready / three_month_delivery_ing / three_month_delivery_ok
three_month_claim_all / order_count
this_year_order_price / autogroup_order_total_price
```

**다음 회원 등급:**
```
next_group_name / next_group_icon / next_group_image
next_group_price_gap / next_group_order_gap / next_group_benefit
if_group / group_name / group_icon / group_image
```

**회원 정보:**
```
user_name / user_nickname / user_email / user_id
user_mobile / user_tel / user_address
img_user / join_date / last_login_date
usable_point / user_reserve / user_deposit / money
coupon_count / remain_coupon_count / wish_count
user_basket_quantity / order_total_price
attendance_count / if_attendance
```

**메뉴 링크:**
```
link_order / link_coupon / link_point / link_reserve / link_money
link_wish / link_subs / link_withdraw / link_down_coupon
link_mypage_today_product / link_mypage_mp_review
link_my_board_scrap / link_recmd_invite / link_shoppay
if_link_mypage_present / if_new_join_type / is_sm_order
```

**위시리스트 상품:**
```
wishlist_product@consumer_discount_rate
order_list@brname / order_list@is_subs_order
m2m_list_cnt
my_list@comment / my_list@reply_status
```

---

### 4.12 마이페이지 주문내역 (mypage/mp_order_oo.vtags.txt)

**날짜 필터:**
```
link_date_day / link_date_yesterday / link_date_week
link_date_month / link_date_month3 / link_date_year
input_search_date_start / input_search_date_end
link_search_button / order_date_search
link_more_order / block_order_more
```

**주문 목록:**
```
loop_order_list@delivery
  order_list@real_order_num / @real_order_state / @order_state
  order_list@order_date_info / @pay_info / @pay_method / @pay_price
  order_list@repay_price / @total_reserve / @use_reserve / @delivery_price
  order_list@delivery_type / @brandcount
  order_list@checkbox_select_all / @radio_recall_policy_ok

  <!-- 배송 정보 -->
  order_list@delivery@num / @company / @deli_num / @address
  order_list@delivery@post / @receiver / @receiver_phone
  order_list@delivery@sender / @send_memo / @order_message
  order_list@delivery@link_delivery (배송추적)
  order_list@delivery@link_buy_ok (구매확정)

  <!-- 상품 목록 -->
  loop_order_list@delivery@product
    order_list@delivery@product@name / @option / @amount
    order_list@delivery@product@image_l/m/s / @mobile_image
    order_list@delivery@product@delivery_state / @delivery_type
    order_list@delivery@product@is_review_write / @review_write_link
    order_list@delivery@product@afterdeli_icon
    order_list@delivery@product@link_basket / @link_smorder
    order_list@delivery@product@present_status / @provider_name
    order_list@delivery@product@return_refusal_msg / @trade_refusal_msg
  end_loop

  <!-- 액션 링크 -->
  order_list@link_cancel / @link_cancel_present
  order_list@link_all_cancel / @link_all_return / @link_all_basket
  order_list@link_cash_receipt / @link_tax_receipt / @link_tax_view
  order_list@link_list_view / @link_del / @link_gift
  order_list@link_all_smorder
end_loop

if_order_list@is_order_cancel / if_weightdeli_use / is_smartpickup
order_product@brand / @return_delivery_num / @return_delivery_trace
```

---

### 4.13 마이페이지 적립금 (mypage/mp_reserve.vtags.txt)

```
loop_reserve
  reserve@content / @date / @price
end_loop
form_reserve
input_search_date_start / input_search_date_end / link_search_button
usable_reserve / user_reserve / attendance_reserve
pager_reserve::current/next/prev/page/first/last (+ @link)
pager_reserve::count / pager_reserve::page_count
if_pager_reserve::page@current / loop_pager_reserve::page
user_name / user_nickname / user_email / img_user
group_icon / group_image / group_level / group_name
if_login / include_header / shop_id / shop_name / idx
```

---

### 4.14 게시판 (boards/base/)

#### 목록 (list.vtags.txt)

```
now_board_name / list_type

<!-- 공지사항 -->
if_oneline_notice → oneline_notice
if_notice_list
  loop_notice_list
    notice_list@subject / @link / @writer / @date_write
    notice_list@cnt_read / @cnt_recommend / @comment_cnt
    notice_list@head_icon_image / @new_icon_image / @hit_icon_image
  end_loop
end_if

<!-- 게시글 목록 -->
loop_list(10)
  list@number / @subject / @link / @writer / @writer_id
  list@date_write / @cnt_read / @cnt_recommend / @comment_cnt
  list@depth / @is_notice / @review_score / @reply_status
  list@product_image_s / @product_name / @link_product
  list@attach_image / @list_attach_icon
  list@head_icon_image / @new_icon_image / @hit_icon_image
  list@img_admin_icon / @img_writer / @user_icon_image
  list@is_original_del / list@subtitle
end_loop

<!-- 페이징 -->
pager_list::current / @link
pager_list::next / @link
pager_list::prev / @link
pager_list::page / @link
pager_list::first / @link
pager_list::last / @link
pager_list::count / pager_list::page_count
if_pager_list::page@current / loop_pager_list::page

<!-- 검색 -->
form_search / input_search_word / link_search_button

<!-- 상단 게시판 링크 -->
loop_top_board_list → top_board_list@name / @link
```

#### 상세 (view.vtags.txt)

```
subject / content / writer / write_date / hit
writer_nickname / writer_greeting / img_writer
recommend_count / is_recommend / link_recommend
comment_cnt / cate_name

<!-- 첨부 -->
attach_image / attach_image2/3/4
attach_image_size / attach_image_size2/3/4
attach_file

<!-- 이전/다음 -->
link_prev_article / link_next_article
prev_article / next_article
prev_article_subject / next_article_subject
prev_article_comment_count / next_article_comment_count
link_prev_article_product / link_next_article_product

<!-- 액션 -->
link_edit / link_del / link_answer / link_list / link_write
link_scrap / link_scrap_fb / link_scrap_ka / link_scrap_tw

<!-- 댓글 -->
loop_comment
  comment@content / @writer / @writer_nickname / @writer_greeting
  comment@write_date / @depth / @member_group_name
  comment@link_comment_click / @link_del_click
  comment@link_comment_recommend_click
  comment@comment_recommend_cnt
  comment@img_writer / @icon_member
end_loop
form_comment / text_comment
link_comment / link_close_comment_write
block_comment / block_comment_write
pager_comment::current/next/prev/page/first/last (+ @link)
if_pager_comment::page@current / loop_pager_comment::page

<!-- 평점 -->
loop_score → score@icon / @title
review_mark

<!-- 상품 연동 (Q&A) -->
name / price_sell / image_s / link / icons
qna_ordernum / order_count

<!-- 추천 상품 -->
loop_recommend_product
  recommend_product@name / @subname / @engname
  recommend_product@image_s / @mobile_image / @link
  recommend_product@price_sell / @price_consumer / @price_replace
  recommend_product@icons / @mobile_icons / @free_delivery_icon
end_loop

<!-- 공지사항 -->
loop_notice_list → notice_list@subject / @link / @writer / @date_write
oneline_notice / notice_image

<!-- SNS -->
link_scrap_fb / link_scrap_ka / link_scrap_ks / link_scrap_tw
sorivu_comment

<!-- 개인정보 동의 -->
privercy_terms / privercy_terms1/2/3 / third_party_terms / trust_terms
radio_privercy_no / radio_third_party_ok / radio_trust_ok
if_new_privercy_type / if_third_party / if_trust
```

#### 글쓰기 (write.vtags.txt)

```
form_write
input_subject / text_content / input_name / input_password / input_email
select_header / select_font_size / select_font_color
input_font_weight_checkbox / input_lock_checkbox
link_write_ok / link_list
is_reply / is_auto_lock / is_admin_password
now_board_name / if_mode_write

<!-- 파일 첨부 -->
file_attach / file_attach2/3/4
link_file_upload / link_file_upload2/3/4

<!-- 평점 -->
loop_score → score@icon / @title / @icon_select
radio_score

<!-- Q&A 주문 연동 -->
input_qna_ordernum / block_order_list
loop_order_list
  order_list@ordernum / @product_name / @order_date / @price
  order_list@link_product_name
end_loop
order_count / idx / engname / add_info_html

<!-- 추가 정보 -->
loop_add_info → add_info@input_title / @input_value / @description

<!-- 개인정보 -->
privercy_terms / privercy_terms1/2/3 / trust_terms / third_party_terms
radio_privercy_no / radio_third_party_ok / radio_trust_ok
new_privacy_terms / if_new_privercy_type / if_third_party / if_trust

<!-- 상품 정보 (리뷰 작성 시) -->
name / price_sell / image_s / link / icons / mobile_name / engname
```

---

### 4.15 개별 페이지 (pages/)

개별 페이지는 사용 가능한 가상태그가 제한적:
```
include_header(1) / include_footer(1)
if_login / user_name / user_id / user_email
link_home / shop_name / shop_id
```

나머지 콘텐츠는 **Vanilla JS + 외부 API (NocoDB, n8n Webhook)** 로 동적 처리.

**파트너클래스 페이지 URL 매핑:**

| 페이지 | URL | 로컬 폴더 |
|--------|-----|---------|
| 목록 | `page.html?id=2606` | `pages/partnerclass-list/` |
| 상세 | `page.html?id=2607` | `pages/partnerclass-detail/` |
| 파트너 대시보드 | `page.html?id=2608` | `pages/partnerclass-partner/` |
| 파트너 신청 | `page.html?id=2609` | `pages/partnerclass-apply/` |
| 교육 | `page.html?id=2610` | `pages/partnerclass-edu/` |
| 강의등록 | `page.html?id=8009` | `pages/partnerclass-register/` |
| 마이페이지 | `page.html?id=8010` | `pages/partnerclass-mypage/` |
| 어드민 | `page.html?id=8011` | `pages/partnerclass-admin/` |

---

## Part 5: 가상태그 시스템 심화

### 5.1 기본 문법

가상태그는 `<!--/태그명/-->` 형식으로 HTML 주석처럼 작성되며, 서버가 렌더링 시 실제 값으로 치환한다.

```html
<!-- 단순 값 출력 -->
<!--/user_name/-->            → "홍길동"
<!--/price_sell/-->           → "15000"

<!-- 숫자 포맷 (1,000 단위 콤마) -->
<!--/number/price_sell/-->    → "15,000"

<!-- HTML 태그 제거 -->
<!--/notag/content/-->        → 태그 없는 순수 텍스트
```

---

### 5.2 조건부 렌더링

```html
<!-- 기본 if/else -->
<!--/if_조건명/-->
  조건 참일 때 출력
<!--/else/-->
  조건 거짓일 때 출력
<!--/end_if/-->

<!-- else 없는 단순 if -->
<!--/if_login/-->
  <span><!--/user_name/-->님 환영합니다</span>
<!--/end_if/-->

<!-- 반대 조건 -->
<!--/if_not_login/-->
  <a href="<!--/link_login/-->">로그인</a>
<!--/end_if/-->
```

**자주 쓰는 조건 태그:**

| 태그 | 설명 |
|------|------|
| `if_login` / `if_not_login` | 로그인 여부 |
| `if_soldout` / `if_is_short_soldout` | 품절/재고부족 |
| `if_selling` / `if_stop_order` | 판매중/판매중지 |
| `if_head_banner` | 헤더 배너 존재 |
| `if_category1@category2` | 하위 카테고리 존재 |
| `if_group` / `if_group_free_delivery` | 회원 등급 조건 |
| `if_use_subs` | 정기배송 사용 여부 |
| `if_is_present` / `if_not_is_present` | 선물 여부 |
| `if_login_fail` 계열 | 로그인 오류 유형 |
| `if_oneline_notice` / `if_notice_list` | 공지 종류 |
| `if_pager_{name}::page@current` | 현재 페이지 여부 |
| `if_delivery_type` | 배송 방식 |
| `if_weightdeli_use` | 중량 배송 여부 |
| `if_new_privercy_type` | 개인정보 신규 유형 |
| `if_third_party` / `if_trust` | 개인정보 제공 동의 |
| `if_company_user` | 기업회원 여부 |
| `if_mode_write` | 글쓰기/수정 모드 구분 |
| `if_review_type` | 리뷰 유형 |
| `if_discount_apply_type` | 할인 적용 유형 |
| `if_best_product@discount_apply_type` | 상품별 할인 적용 |
| `if_list@depth` | 답변 깊이 (게시판) |

---

### 5.3 반복문

```html
<!--/loop_배열명/-->
  <!--/배열명@속성/-->
<!--/end_loop/-->

<!-- 예시: 카테고리 목록 -->
<!--/loop_category1/-->
<li>
  <a href="<!--/category1@link/-->"><!--/category1@name/--></a>
</li>
<!--/end_loop/-->

<!-- 중첩 반복 -->
<!--/loop_category1/-->
  <!--/loop_category1@category2/-->
    <!--/category1@category2@name/-->
  <!--/end_loop/-->
<!--/end_loop/-->

<!-- 출력 개수 제한 -->
<!--/loop_list(10)/-->     ← 최대 10개
<!--/loop_view_product_ajax(6)/-->  ← 최대 6개
```

---

### 5.4 include 태그

모든 중앙 디자인 페이지에서 헤더/푸터를 포함시키는 필수 태그.

```html
<!--/include_header(1)/-->     ← 기본 상단 [C] (디자인 번호 1)
<!--/include_footer(1)/-->     ← 기본 하단 [C] (디자인 번호 1)
```

- 괄호 안 숫자는 "디자인 번호" (편집기에서 [C] 표시)
- 마이페이지 공통 헤더: `<!--/include_header(2)/-->` (별도 상단 디자인)
- vtags.txt에는 `include_header` / `include_footer` 로만 표기 (번호 생략)

---

### 5.5 number / notag 필터

```html
<!-- 숫자 포맷: 1000단위 콤마 -->
<!--/number/price_sell/-->          → "15,000"
<!--/number/user_basket_quantity/--> → "3"
<!--/number/user_normal_basket_count/-->

<!-- HTML 태그 제거 -->
<!--/notag/content/-->              → 순수 텍스트만 출력
<!--/notag/detail_common/-->
```

---

### 5.6 pager 시스템 완전 레퍼런스

**패턴:** `pager_{페이지명}::{속성}`

| 태그 | 설명 |
|------|------|
| `pager_{n}::current` | 현재 페이지 번호 |
| `pager_{n}::current@link` | 현재 페이지 링크 |
| `pager_{n}::next` | 다음 페이지 번호 |
| `pager_{n}::next@link` | 다음 페이지 링크 |
| `pager_{n}::prev` | 이전 페이지 번호 |
| `pager_{n}::prev@link` | 이전 페이지 링크 |
| `pager_{n}::first` | 첫 페이지 번호 |
| `pager_{n}::first@link` | 첫 페이지 링크 |
| `pager_{n}::last` | 마지막 페이지 번호 |
| `pager_{n}::last@link` | 마지막 페이지 링크 |
| `pager_{n}::page` | 페이지 번호 (loop 안에서 사용) |
| `pager_{n}::page@link` | 페이지 링크 (loop 안에서 사용) |
| `pager_{n}::count` | 전체 항목 수 |
| `pager_{n}::page_count` | 전체 페이지 수 |
| `if_pager_{n}::page@current` | 현재 페이지 여부 (조건) |
| `loop_pager_{n}::page` | 페이지 번호 반복 |

**페이지명 종류:**

| 페이지명 | 사용 위치 |
|---------|---------|
| `list` | 게시판 목록 |
| `comment` | 게시판 댓글 |
| `product` | 상품 검색/목록 |
| `review_board` | 상품 상세 리뷰 |
| `mobile_review_board` | 모바일 리뷰 |
| `qna_board` | 상품 Q&A |
| `reserve` | 적립금 내역 |

**페이징 UI 구현 패턴:**
```html
<nav class="pager">
  <a href="<!--/pager_list::first@link/-->">처음</a>
  <a href="<!--/pager_list::prev@link/-->">이전</a>

  <!--/loop_pager_list::page/-->
  <!--/if_pager_list::page@current/-->
    <strong><!--/pager_list::page/--></strong>
  <!--/else/-->
    <a href="<!--/pager_list::page@link/-->"><!--/pager_list::page/--></a>
  <!--/end_if/-->
  <!--/end_loop/-->

  <a href="<!--/pager_list::next@link/-->">다음</a>
  <a href="<!--/pager_list::last@link/-->">마지막</a>
</nav>
```

---

### 5.7 [CODE] 동적 태그 패턴

관리자 설정값이나 코드가 태그명에 직접 포함되는 패턴.

**메인 페이지 추가 상품 그룹:**
```html
<!--/loop_add[CODE]_product/-->     ← [CODE] = 관리자 설정 코드
  <!--/add[CODE]_product@name/-->
  <!--/add[CODE]_product@link/-->
<!--/end_loop/-->
```

**분류별 베스트 상품:**
```html
<!--/loop_category_best_product_[CATE1_CODE]/-->
  <!--/category_product_[CATE1_CODE]@name/-->
  <!--/category_product_[CATE1_CODE]@link/-->
<!--/end_loop/-->
```

**게시판 위젯 (메인):**
```html
<!--/board_[BOARD_CODE]@subject/-->   ← BOARD_CODE = jewoo / jewoo_board2 등
<!--/board_[BOARD_CODE]@link/-->
<!--/board_[BOARD_CODE]@thumbnail/-->
<!--/board_[BOARD_CODE]@writer/-->
```

**[BOARD_CODE] 값 매핑:**

| BOARD_CODE | 게시판명 |
|-----------|---------|
| `jewoo` | 자유 게시판 |
| `jewoo_board2` | 제작기법 공유 |
| `jewoo_board6` | 민간자격 안내 |
| `jewoo_board7` | 전시 및 행사안내 |
| `jewoo_board8` | 갤러리/프리저브드플라워 |
| `jewoo_board9` | 갤러리/플루이드아트 |
| `jewoo_board10` | 파워리뷰 |
| `jewoo_board11` | 레저너스 정품 등록 |
| `jewoo_image7` | 갤러리/레칸플라워 |
| `jewoo_image9` | 갤러리/원목제품 |
| `jewoo_image10` | 갤러리/생활소품 |
| `jewoo_image11` | 갤러리/악세사리 |

---

### 5.8 form 태그 패턴

form 태그는 `<form>` 요소를 서버가 자동 생성. 닫는 태그 불필요.

```html
<!--/form_login/-->          ← 로그인 폼
  <!--/input_login_id/-->
  <!--/input_login_pw/-->
  <!--/link_login_button/-->
<!--종료 태그 없음 (form은 자동 닫힘)-->

<!--/form_search/-->         ← 검색 폼
  <!--/input_search_word/-->
  <!--/link_search_button/-->

<!--/form_product/-->        ← 상품 구매 폼 (shopdetail)
  옵션/수량/구매버튼 모두 포함

<!--/form_write/-->          ← 게시판 글쓰기 폼
  <!--/input_subject/-->
  <!--/text_content/-->
  <!--/link_write_ok/-->

<!--/form_comment/-->        ← 댓글 폼
<!--/form_reserve/-->        ← 적립금 검색 폼
<!--/form_order/-->          ← 주문서 폼
<!--/form_agree/-->          ← 약관 동의 폼
<!--/form_addr_search/-->    ← 배송지 검색 폼
<!--/form_coupon/-->         ← 쿠폰 적용 폼
```

---

## Part 6: 개발 패턴 & 컴포넌트

### 6.1 JS IIFE 패턴 (필수)

메이크샵 환경에서 전역 변수 오염을 막기 위해 모든 JS는 IIFE로 격리.

```javascript
(function() {
  'use strict';

  // 변수 선언
  const API_BASE = 'https://n8n.pressco21.com/webhook/';

  // DOM 준비 후 실행
  document.addEventListener('DOMContentLoaded', function() {
    init();
  });

  function init() {
    // 초기화 로직
  }

  // 이벤트 위임 패턴
  document.getElementById('container').addEventListener('click', function(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    handleAction(btn.dataset.action, btn);
  });

})();
```

**⚠️ 템플릿 리터럴 이스케이프 (필수):**
```javascript
// ❌ 저장 실패 — 메이크샵 엔진이 JS 템플릿 리터럴 ${variable}을 서버 치환 대상으로 오인
// 주의: MakeShop D4는 {$변수} 형식의 치환코드를 지원하지 않음. 오직 <!--/tag/--> 형식만 사용
const msg = `안녕하세요 ${name}님`;

// ✅ 백슬래시로 이스케이프
const msg = `안녕하세요 \${name}님`;
const url = `\${API_BASE}endpoint?id=\${id}`;
```

---

### 6.2 CSS 스코핑 패턴 (필수)

기존 메이크샵 스타일과의 충돌 방지를 위해 반드시 컨테이너 ID/클래스로 범위 제한.

```css
/* ❌ 전역 스타일 — 다른 페이지에 영향 */
.card { background: white; }
.title { font-size: 24px; }

/* ✅ 스코핑 — 해당 페이지에만 적용 */
#partnerclass-list .card { background: white; }
#partnerclass-list .title { font-size: 24px; }

/* ✅ 또는 커스텀 클래스로 네임스페이스 */
.pc-list .card { background: white; }
.pc-detail .title { font-size: 24px; }
```

---

### 6.3 반응형 미디어 쿼리 패턴

```css
/* 기본: 모바일 (767px 이하) */
.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

/* 태블릿: 768px~ */
@media (min-width: 768px) {
  .product-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
}

/* 데스크탑: 992px~ */
@media (min-width: 992px) {
  .product-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* 와이드: 1200px~ */
@media (min-width: 1200px) {
  .product-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}
```

---

### 6.4 상품 카드 공통 HTML 패턴

메인/카테고리/검색 등 상품 목록에서 공통으로 사용하는 카드 구조.

```html
<!--/loop_best_product/-->
<li class="product-card">
  <a href="<!--/best_product@link/-->">
    <!-- 이미지 -->
    <div class="product-card__img">
      <img src="<!--/best_product@mobile_image/-->"
           alt="<!--/best_product@name/-->">
      <!--/if_best_product@is_soldout/-->
      <span class="badge-soldout">품절</span>
      <!--/end_if/-->
    </div>
    <!-- 정보 -->
    <div class="product-card__info">
      <p class="product-card__name"><!--/best_product@name/--></p>
      <p class="product-card__sub"><!--/best_product@subname/--></p>
      <div class="product-card__price">
        <!--/if_best_product@discount_icon/-->
        <span class="price-discount"><!--/best_product@discount_icon/--></span>
        <!--/end_if/-->
        <strong><!--/number/best_product@price_sell/--></strong>원
      </div>
      <!--/if_best_product@power_review_count/-->
      <div class="product-card__review">
        ★ <!--/best_product@power_review_score/-->
        (<!--/best_product@power_review_count/-->)
      </div>
      <!--/end_if/-->
    </div>
  </a>
</li>
<!--/end_loop/-->
```

---

### 6.5 Swiper.js 활용 패턴

메이크샵 CDN의 mySwiper11 사용.

```html
<!-- HTML -->
<div class="swiper mySwiper">
  <div class="swiper-wrapper">
    <!--/loop_event_banner/-->
    <div class="swiper-slide">
      <a href="<!--/event_banner@link/-->">
        <img src="<!--/event_banner@image/-->"
             alt="<!--/event_banner@subject/-->">
      </a>
    </div>
    <!--/end_loop/-->
  </div>
  <div class="swiper-pagination"></div>
  <div class="swiper-button-prev"></div>
  <div class="swiper-button-next"></div>
</div>

<!-- JS (IIFE 내부) -->
<script>
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    new Swiper('.mySwiper', {
      loop: true,
      autoplay: { delay: 4000, disableOnInteraction: false },
      pagination: { el: '.swiper-pagination', clickable: true },
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev'
      }
    });
  });
})();
</script>
```

---

### 6.6 Intersection Observer (스크롤 애니메이션)

```javascript
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-on-scroll').forEach(function(el) {
      observer.observe(el);
    });
  });
})();
```

---

### 6.7 이벤트 위임 패턴 (성능 최적화)

```javascript
// ❌ 개별 이벤트 — 동적 요소에 안 붙음, 메모리 낭비
document.querySelectorAll('.btn-add').forEach(function(btn) {
  btn.addEventListener('click', handler);
});

// ✅ 이벤트 위임 — 동적 요소에도 작동
document.getElementById('contents').addEventListener('click', function(e) {
  if (e.target.matches('.btn-add') || e.target.closest('.btn-add')) {
    const btn = e.target.closest('.btn-add');
    handleAdd(btn.dataset.id);
  }
});
```

---

### 6.8 API 호출 패턴 (NocoDB/n8n)

```javascript
// NocoDB 조회
async function fetchClasses() {
  const res = await fetch(
    'https://nocodb.pressco21.com/api/v1/db/data/noco/PROJECT_ID/TABLE_ID',
    {
      headers: {
        'xc-token': window.NOCODB_TOKEN  // 외부 주입 필요
      }
    }
  );
  const data = await res.json();
  return data.list;
}

// n8n Webhook 호출
async function callWebhook(endpoint, payload) {
  const res = await fetch(
    \`https://n8n.pressco21.com/webhook/\${endpoint}\`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  );
  return res.json();
}
```

---

### 6.9 debounce 유틸리티

```javascript
function debounce(fn, delay) {
  let timer;
  return function() {
    const args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function() {
      fn.apply(this, args);
    }, delay);
  };
}

// 사용 예
const handleResize = debounce(function() {
  updateLayout();
}, 100);
window.addEventListener('resize', handleResize);
```

---

## Part 7: 코드 작성 규칙

### 7.1 메이크샵 저장 주의사항

#### ❌ 오류 1: 템플릿 리터럴 미이스케이프

```javascript
// 저장 시 "데이터 수정 실패" 오류 발생
const html = `<span>${user.name}</span>`;
const url = `${base}/api/${id}`;
```

```javascript
// 반드시 백슬래시 추가
const html = `<span>\${user.name}</span>`;
const url = `\${base}/api/\${id}`;
```

#### ❌ 오류 2: 가상태그 손상

```html
<!-- 절대 수정/삭제 금지 — 서버사이드 렌더링 핵심 -->
<!--/if_login/-->
<!--/loop_category1/-->
<!--/form_product/-->
<!--/end_loop/-->
<!--/end_if/-->

<!-- if 없이 end_if 사용 금지 — 템플릿 파서 오류 -->
<!-- loop 없이 end_loop 사용 금지 -->
```

#### ❌ 오류 3: 중첩 가상태그 오류

```html
<!-- 중첩 if 사용 시 파서 오류 발생 가능 -->
<!--/if_not_soldout/-->
  <!--/if_login/-->   ← 중첩 if는 주의 필요
  <!--/end_if/-->
<!--/end_if/-->
```

#### ❌ 오류 4: include 태그 누락

```html
<!-- 모든 중앙 디자인 페이지에 필수 -->
<!--/include_header(1)/-->   ← 빠지면 헤더 미표시
...페이지 내용...
<!--/include_footer(1)/-->   ← 빠지면 푸터 미표시
```

---

### 7.2 CSS 작성 규칙

```css
/* ✅ 올바른 패턴 */
#my-page .btn-primary {
  background: var(--color-primary);    /* CSS 변수 사용 */
  border-radius: var(--cw-border-radius);
  font-family: var(--cw-font-sans-serif);
}

/* ✅ 반응형 — 모바일 우선 */
#my-page .grid {
  grid-template-columns: 1fr;          /* 모바일 기본 */
}
@media (min-width: 768px) {
  #my-page .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* ❌ 피해야 할 패턴 */
.btn { ... }              /* 스코핑 없음 */
!important 남발           /* 기존 스타일 강제 덮어쓰기 */
인라인 스타일             /* 유지보수 어려움 */
```

---

### 7.3 동기화 규칙

로컬 파일 ↔ 메이크샵 편집기 간 동기화:

1. **편집기 수정 후**: 해당 로컬 파일 즉시 업데이트
2. **로컬 수정 후**: 편집기 해당 탭에 붙여넣기 → 저장 버튼 클릭
3. **저장 전 확인**: `${variable}` → `\${variable}` 이스케이프 점검
4. **가상태그 무결성**: if/loop/end 쌍 확인

---

## Part 8: 체크리스트 & 부록

### 8.1 신규 페이지 개발 체크리스트

- [ ] `include_header(1)` / `include_footer(1)` 포함
- [ ] 고유 컨테이너 ID 부여 (`#my-page-id`)
- [ ] CSS 전체 스코핑 (`#my-page-id .class`)
- [ ] JS 전체 IIFE 래핑
- [ ] 템플릿 리터럴 `\${...}` 이스케이프
- [ ] 가상태그 if/loop/end 쌍 확인
- [ ] CSS 변수 (`--color-primary`, `--cw-*`) 활용
- [ ] 768/992/1200px 반응형 처리
- [ ] 편집기 저장 후 실제 페이지에서 검증
- [ ] 로컬 파일 동기화 완료

### 8.2 상품 카드 개발 체크리스트

- [ ] 상품 루프 타입 결정 (best/new/recmd/special/add[CODE])
- [ ] `@mobile_image` 사용 (모바일 최적화 이미지)
- [ ] `<!--/number/{type}_product@price_sell/-->` 포맷 적용
- [ ] `if_{type}_product@is_soldout` 품절 처리
- [ ] `{type}_product@power_review_count` 리뷰 수 노출
- [ ] `{type}_product@discount_icon` 기간할인 아이콘

### 8.3 게시판 개발 체크리스트

- [ ] list/view/write/password 4페이지 모두 구현
- [ ] pager_list 페이징 UI 구현
- [ ] form_write 폼 태그 포함
- [ ] 댓글: form_comment + loop_comment
- [ ] 검색: form_search + input_search_word
- [ ] 개인정보 동의 블록 포함 (view/write)
- [ ] 공지사항: if_notice_list / loop_notice_list

---

### 부록 A: 게시판 번호 매핑

| 폴더 | 게시판 코드 | 게시판명 | 타입 |
|------|-----------|---------|------|
| `boards/board-11/` | `jewoo_board11` | 레저너스 정품 등록 | 일반 |
| `boards/board-10/` | `jewoo_board10` | 파워리뷰 (상품리뷰) | 파워리뷰 |
| `boards/board-6/` | `jewoo_board6` | 민간자격 안내 | 일반 |
| `boards/board-2/` | `jewoo_board2` | 제작기법 공유 | 일반 |
| `boards/board-7/` | `jewoo_board7` | 전시 및 행사안내 | 일반 |
| `boards/image-11/` | `jewoo_image11` | 갤러리/악세사리 | 갤러리 |
| `boards/image-9/` | `jewoo_image9` | 갤러리/원목제품 | 갤러리 |
| `boards/image-10/` | `jewoo_image10` | 갤러리/생활소품 | 갤러리 |
| `boards/image-7/` | `jewoo_image7` | 갤러리/레칸플라워 | 갤러리 |
| `boards/board-8/` | `jewoo_board8` | 갤러리/프리저브드플라워 | 일반 |
| `boards/board-9/` | `jewoo_board9` | 갤러리/플루이드아트 | 일반 |
| `boards/base/` | `jewoo` | 자유 게시판 | 기본 |

---

### 부록 B: 마이페이지 vtags.txt 파일 목록

| 파일 | 대상 페이지 |
|------|-----------|
| `mp_main.vtags.txt` | 마이페이지 메인 |
| `mp_order_oo.vtags.txt` | 주문내역 (고급형) |
| `mp_claim.vtags.txt` | 취소/반품/교환 |
| `mp_ordersummary.vtags.txt` | 주문 요약 |
| `mp_order_cancel.vtags.txt` | 주문 취소 |
| `mp_order_return.vtags.txt` | 반품 신청 |
| `mp_order_trade.vtags.txt` | 교환 신청 |
| `mp_reserve.vtags.txt` | 적립금 내역 |
| `mp_point.vtags.txt` | 포인트 내역 |
| `mp_deposit.vtags.txt` | 예치금 내역 |
| `mp_smart_coupon.vtags.txt` | 스마트 쿠폰 |
| `mp_smart_reserve.vtags.txt` | 스마트 적립금 |
| `mp_grade.vtags.txt` | 회원 등급 |
| `mp_info.vtags.txt` | 회원정보 수정 |
| `mp_withdraw.vtags.txt` | 회원 탈퇴 |
| `mp_product.vtags.txt` | 관심상품 |
| `mp_recent.vtags.txt` | 최근 본 상품 |
| `mp_review.vtags.txt` | 작성 리뷰 |
| `mp_qna.vtags.txt` | 작성 Q&A |
| `mp_present.vtags.txt` | 선물함 |
| `mp_subs_list.vtags.txt` | 정기배송 목록 |
| `mp_subs_order.vtags.txt` | 정기배송 상세 |
| `mp_category.vtags.txt` | 카테고리 관련 |
| `mp_attpoint.vtags.txt` | 출석 포인트 |
| `pop_delivery_tracking.vtags.txt` | 배송추적 팝업 |

---

### 부록 C: 오픈 API 핵심 정보

| 항목 | 값 |
|------|-----|
| API 호출 제한 | 시간당 조회 500회 / 처리 500회 |
| 수정 권한 확인 | 관리자 > [오픈 API] 메뉴 > 수정 권한 |
| CORS 대응 | 프록시 서버 (n8n Webhook) 경유 |
| 인증 방식 | API 키 헤더 (`Authorization: Bearer {key}`) |

---

### 부록 D: 자주 쓰는 가상태그 빠른 참조

**회원 관련:**
```
if_login / if_not_login
user_name / user_id / user_email / user_nickname
user_reserve / user_deposit / usable_point / money
remain_coupon_count / user_basket_quantity
group_name / group_icon / group_level
img_user / user_greeting
join_date / last_login_date
```

**링크 관련:**
```
link_home / link_basket / link_mypage
link_login / link_logout / link_join
link_order_list / link_reserve / link_coupon / link_wish
link_faq / link_m2m_question / link_review
link_privacy / link_contract / link_useinfo
```

**상품 공통 속성:**
```
@name / @subname / @engname / @brand
@price_sell / @price_consumer / @price_replace
@image_l / @image_m / @image_s / @mobile_image
@link / @icons / @mobile_icons / @uid
@is_soldout / @is_short_soldout
@reserve_price / @reserve_percent
@power_review_count / @power_review_score
@discount_icon / @quick_delivery_icon / @afterdeli_icon
```

**스토어 정보:**
```
shop_name / shop_id / img_shop_logo
company_name / company_owner / company_addr
company_number / online_sale_number / shop_phone
```
