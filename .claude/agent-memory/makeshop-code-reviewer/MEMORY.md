# MakeShop D4 Code Reviewer - Memory

## Project: pressco21
- 5 sub-projects: 1초 로그인(회원/주문조회/구매시), 간편 구매, 파트너맵
- All projects target MakeShop D4 (Chameleon) platform

## Key Patterns Found

### Template Literals
- NO template literals (`${}`) used anywhere -- all JS uses string concatenation. SAFE.
- Partner map explicitly notes "메이크샵 호환" with string concatenation approach.

### CSS Scoping
- **Login projects**: Use `*{}` universal selector for font-family -- GLOBAL POLLUTION risk
- **Login projects**: Override `body, html {}` directly -- affects entire shop
- **Login projects**: Hide `#header, #footer` with `!important` -- intentional for fullscreen login
- **Partner map**: Well-scoped with `#partnermap-container` CSS variable scoping
- **Quick buy**: No scoping, but uses MakeShop's existing class structure (skin-level CSS)

### IIFE Pattern
- **Login JS**: Properly wrapped in IIFE `(function(){...})()`
- **Partner map JS**: Mixed -- CONFIG is `var` global, but modules use IIFE pattern with `window.*` exports
- **Quick buy JS**: NO IIFE -- all variables are global (`let`, `const`, `function` at top level)

### Security
- **Partner map**: Has `escapeHtml()` for XSS prevention, used consistently
- **Partner map**: Naver Map API key exposed in HTML (`bfp8odep5r`) -- client-side, expected but note
- **Quick buy**: Uses `document.execCommand("copy")` -- deprecated but functional
- **Login projects**: No user input handling in JS (handled by MakeShop server-side)

### Performance
- **Quick buy**: `scroll` event listener without debounce/throttle (line 114)
- **Quick buy**: `MutationObserver` on `document.body` with `subtree: true` -- very expensive
- **Partner map**: Uses debounce properly, has caching, Fuse.js for search

### Virtual Tags
- All login HTML files properly preserve `<!--/xxx/-->` tags
- Quick buy HTML properly preserves all MakeShop virtual tags

### Shared CSS Issue
- 3 login CSS files are IDENTICAL (1014 lines each) -- massive duplication
- All 3 login JS files are IDENTICAL (69 lines each) -- same

### Main Page (메인페이지)
- **IIFE**: js.js properly uses IIFE, but Index.html inline script is NOT in IIFE (global scope)
- **Duplicate YouTube code**: js.js IIFE and Index.html inline both define loadYouTube/renderYouTube/playVideo/toggleProducts -- causes double-execution
- **CSS corruption**: css.css has 4 damaged spots vs original (line 20 selector, line 48 typo, line 422 url(), line 708 merged properties)
- **JS-CSS mismatch**: js.js uses `slide-video-thumb` class, CSS expects `video-thumb` -- slider thumbnails unstyled
- **Missing HTML**: toggle-header missing `<h5>` heading text
- **Missing CSS**: `.yt-thumb-wrap` and `.yt-play-btn` have no styles -- featured video play button invisible
- **XSS**: Original inline script has NO escaping on `featured.title` / `v.title`; js.js version properly escapes
- **Swiper conflict**: js.js uses `mySwiper` constructor (MakeShop D4 built-in), inline uses `Swiper` (CDN loaded)

### YouTube v4 (카테고리 자동매칭) - 신규 작성
- **Location**: `유튜브 자동화/v4-카테고리/`
- **Files**: youtube-proxy-v3.gs, js.js, css.css, Index.html
- **CSS Scoping**: `.youtube-v4-section` with `ytv4-` prefixed class names -- well-isolated
- **IIFE**: Properly wrapped, only `window.clearYouTubeV4Cache` exposed globally
- **XSS**: Both `escapeHTML()` and `escapeAttr()` implemented and used consistently
- **Template Literals**: NONE -- all string concatenation. SAFE.
- **let/const**: NONE -- all `var`. Compatible with older browsers.
- **Cache Strategy**: GAS CacheService 5분 + localStorage 24시간 이중 캐싱
- **GAS v3**: YouTube Data API v3 (tags 포함) + Google Sheets (키워드+상품) 통합 응답
- **Swiper**: CDN loaded, instance properly destroyed before re-init on video switch
- **Event Delegation**: Slider click uses event delegation on `.ytv4-slider-section` (bound once)
- **Skeleton UI**: shimmer animation with `prefers-reduced-motion` support
- **Key Design Decisions**:
  - autoMatchCategory: long keyword first sorting prevents false positives
  - Thumbnail-first loading: iframe only on click (performance)
  - Fallback chain: Data API fail -> RSS only (no tags/views but functional)

### Partner Class Platform GAS Backend (Task 201)
- **Location**: `파트너클래스/class-platform-gas.gs` (2,627 lines)
- **GAS Compatibility**: PASS -- var only, no let/const/template literals, all GAS-native APIs
- **LockService**: Correct pattern -- waitLock for writes, tryLock(0) for batch/poll, finally releaseLock
- **CacheService**: Max TTL is 21600s (6h), not 86400s. Max value size 100KB.
- **Critical Bugs Found**:
  - `incrementEmailCount_` silently does nothing on new day (no appendRow for first record)
  - No Referer/auth check on doGet/doPost -- pollOrders/clearCache/recordBooking exposed
  - Email HTML body has no escapeHtml -- XSS via buyer name/class name
  - No retry mechanism for FAILED settlements
- **GAS 6-minute limit**: Not checked in pollOrders loop; could timeout on many orders
- **Sheets getDataRange().getValues()**: Called 19 times across helpers -- N+1 problem at scale
- **Review output**: `docs/phase2/gas-code-review.md`

See: [patterns.md](patterns.md) for detailed notes.
