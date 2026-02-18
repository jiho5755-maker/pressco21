# 메인페이지 통합 가이드

**중요**: YouTube 섹션만 교체하고, 기존 CSS/JS는 절대 삭제하지 마세요!

---

## 기존 코드 유지 (삭제 금지!)

### 유지해야 할 CSS
- 모든 기존 메인페이지 CSS (section01~06, swiper, 탭, 등)
- `.youtube-section-v3` 스타일은 삭제해도 됨 (새 스타일로 대체)

### 유지해야 할 JS
- Swiper 초기화 코드
- 탭 메뉴 코드
- `get_main_list()` 함수
- 기타 모든 기존 JS

---

## 교체할 부분 (YouTube 섹션만)

### 1. HTML 교체

**삭제할 부분:**
```html
<!--s: section_youtube-->
<section class="youtube-section-v3" id="weekyoutube">
    ... (기존 YouTube 섹션 전체)
</section>
<!--e: section_youtube-->
```

**추가할 코드:**
```html
<!--s: section_youtube (하이브리드 레이아웃) -->
<link rel="stylesheet" href="/design/jewoo/youtube-product-integration/youtube-hybrid-mainpage.css">

<section class="youtube-hybrid-section" id="weekyoutube">
    <div class="main-container">
        <div class="section-title">
            <h3>Learn & Shop</h3>
            <p>영상으로 배우고, 바로 재료를 구매하세요</p>
        </div>

        <div id="youtube-main-area" class="main-area">
            <div class="loading-message">
                <div class="spinner"></div>
                <p>최신 영상을 불러오는 중...</p>
            </div>
        </div>

        <div class="more-videos-section">
            <p class="more-videos-title">더 많은 영상</p>
            <div id="youtube-more-videos" class="more-videos-grid"></div>
        </div>
    </div>
</section>

<script src="/design/jewoo/youtube-product-integration/youtube-hybrid-mainpage.js"></script>
<!--e: section_youtube -->
```

---

### 2. 삭제할 JS (기존 YouTube 함수만)

```javascript
// 이 함수들만 삭제:
function loadYouTube() { ... }
function renderYouTube(videos) { ... }
function playVideo(videoId) { ... }
function toggleProducts() { ... }

// 그리고 $(function() { ... }) 안의 이 줄 삭제:
loadYouTube();
```

---

### 3. 삭제할 CSS (기존 YouTube 스타일만)

```css
/* 이 스타일들만 삭제 */
.youtube-section-v3 { ... }
.youtube-layout { ... }
.featured-video-wrap { ... }
.related-products-wrap { ... }
.youtube-slider-wrap { ... }
/* 등 youtube-section-v3 관련 모든 스타일 */
```

---

## 올바른 적용 순서

1. **기존 index.html 백업**
2. YouTube 섹션 HTML만 교체
3. YouTube 관련 JS 함수만 삭제
4. YouTube 관련 CSS만 삭제
5. 새 CSS/JS 파일 업로드
6. 테스트

---

## 체크리스트

- [ ] 기존 메인페이지 CSS 유지됨
- [ ] 기존 Swiper JS 유지됨
- [ ] 기존 탭 메뉴 JS 유지됨
- [ ] `get_main_list()` 함수 유지됨
- [ ] YouTube 섹션만 교체됨
- [ ] 새 CSS/JS 파일 업로드됨
