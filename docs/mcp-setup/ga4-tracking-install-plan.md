# GA4 추적 코드 설치 계획

> **상태**: 대기 (Measurement ID 필요)
> **작성일**: 2026-04-18
> **GA4 속성 ID**: 473280152
> **Measurement ID**: `G-__________` ← GA4 Admin에서 확인 필요

---

## 1. Measurement ID 확인 방법

1. [analytics.google.com](https://analytics.google.com) 접속
2. 좌측 하단 ⚙️ 관리 → 데이터 스트림
3. 웹 스트림 선택 (foreverlove.co.kr)
4. **측정 ID** (G-XXXXXXXX) 복사
5. `.secrets.env`에 `GA4_MEASUREMENT_ID=G-XXXXXXXX` 추가

> 웹 스트림이 없으면: 관리 → 데이터 스트림 → "스트림 추가" → "웹" → URL: foreverlove.co.kr

---

## 2. 설치 코드 (메이크샵 공통 하단)

메이크샵 편집기 → 공통 레이아웃 → `</body>` 직전 또는 `pressco21-core.js`에 추가:

```html
<!-- GA4 Tracking (PRESSCO21) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-__________"></script>
<script>
(function() {
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-__________');

  // 페이지 유형별 이벤트 자동 감지
  var path = window.location.pathname;

  // 상품 상세 페이지
  if (path.indexOf('/shop/shopdetail.html') > -1) {
    var productName = document.querySelector('.prd-name, .shop_name_tag, h3.tit')?.textContent?.trim() || '';
    var price = document.querySelector('.prd-price .price, .selling_price')?.textContent?.replace(/[^0-9]/g, '') || '0';
    var productId = new URLSearchParams(window.location.search).get('branduid') || '';
    if (productName) {
      gtag('event', 'view_item', {
        currency: 'KRW',
        value: parseInt(price),
        items: [{ item_id: productId, item_name: productName, price: parseInt(price) }]
      });
    }
  }

  // 장바구니 추가 버튼 감지
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-cart, .cart_btn, [onclick*="basket"]');
    if (btn) {
      var productName = document.querySelector('.prd-name, .shop_name_tag, h3.tit')?.textContent?.trim() || '';
      var price = document.querySelector('.prd-price .price, .selling_price')?.textContent?.replace(/[^0-9]/g, '') || '0';
      gtag('event', 'add_to_cart', {
        currency: 'KRW',
        value: parseInt(price),
        items: [{ item_name: productName, price: parseInt(price) }]
      });
    }
  });

  // 주문 완료 페이지
  if (path.indexOf('/shop/orderend.html') > -1 || path.indexOf('order_result') > -1) {
    var orderTotal = document.querySelector('.order-total .price, .total_price')?.textContent?.replace(/[^0-9]/g, '') || '0';
    var orderId = document.querySelector('.order-num, .order_id')?.textContent?.trim() || '';
    gtag('event', 'purchase', {
      transaction_id: orderId,
      currency: 'KRW',
      value: parseInt(orderTotal)
    });
  }
})();
</script>
```

---

## 3. 설치 방법

### 방법 A: pressco21-core.js에 추가 (권장)
- 파일: `img.pressco21.com/images/assets/pressco21-core.js`
- gtag 초기화 + 이벤트 코드를 core.js 하단에 추가
- 버전 올림: `?v=1.x` → `?v=1.x+1`

### 방법 B: 메이크샵 편집기 공통 하단
- 편집기 → 디자인 설정 → 공통 → footer 영역에 스크립트 삽입
- `</body>` 직전 위치

---

## 4. 확인 방법

1. 설치 후 foreverlove.co.kr 접속
2. 브라우저 개발자 도구 → Network → `gtag` 또는 `collect` 필터
3. GA4 Admin → 실시간 보고서에서 사용자 1명 확인
4. 24시간 후 MCP로 데이터 조회:
   ```
   GA4 MCP → get_ga4_data(dimensions=["date"], metrics=["totalUsers"], date_range="today")
   ```

---

## 5. 다음 단계

- [ ] Measurement ID 확인 → 코드에 삽입
- [ ] pressco21-core.js 또는 편집기에 배포
- [ ] 실시간 보고서에서 수집 확인
- [ ] 전자상거래 이벤트 (purchase, add_to_cart) 동작 확인
- [ ] GA4 → 전환 설정에서 purchase 이벤트를 전환으로 표시
