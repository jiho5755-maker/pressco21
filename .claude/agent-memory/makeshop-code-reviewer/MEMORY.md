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

See: [patterns.md](patterns.md) for detailed notes.
