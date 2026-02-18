# 메이크샵 치환코드 핵심 레퍼런스

메이크샵 D4에서 동적 데이터를 표시하는 핵심 패턴입니다. 코드 작성 시 반드시 참고하세요.

## 상품 루프 패턴
```html
<!-- 상품 목록 반복 시작 -->
{$..loop}
  <div class="product-item">
    <a href="{$link_product_detail}">
      <img src="{$product_image}" alt="{$product_name}">
    </a>
    <p class="product-name">{$product_name}</p>
    <p class="product-price">{$product_price}</p>
  </div>
{$/..loop}
<!-- 상품 목록 반복 끝 -->
```

## 핵심 치환코드
| 치환코드 | 용도 |
|---------|------|
| `{$product_name}` | 상품명 |
| `{$product_price}` | 판매가 |
| `{$product_image}` | 상품 대표 이미지 |
| `{$link_product_detail}` | 상품 상세 링크 |
| `{$product_custom}` | 상품 자유게시판 |
| `{$soldout_icon}` | 품절 아이콘 |
| `{$icon_new}`, `{$icon_hit}` | NEW/HIT 아이콘 |
| `{$product_sale_price}` | 할인가 |
| `{$product_discount_rate}` | 할인율 |

## 조건문 패턴
```html
{$if product_sale_price}
  <span class="sale-badge">SALE</span>
  <span class="original-price">{$product_price}</span>
  <span class="sale-price">{$product_sale_price}</span>
{$else}
  <span class="price">{$product_price}</span>
{$/if}
```

## 공통 삽입 패턴
```html
<!-- 공통 상단 (헤더) -->
{$include_header}

<!-- 공통 하단 (푸터) -->
{$include_footer}

<!-- 공통 좌측 (사이드바) -->
{$include_left}
```

## 주의사항
- 치환코드는 **서버에서 렌더링** 후 브라우저에 전달되므로, JS로 치환코드 문자열을 직접 조작하면 안 됨
- 치환코드 주변의 HTML 구조(부모/형제 태그)를 변경하면 렌더링 컨텍스트가 깨질 수 있음
- 새로운 치환코드를 사용할 때는 메이크샵 D4 문서에서 지원 여부를 확인
