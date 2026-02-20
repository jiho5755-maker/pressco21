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
- **Class catalog (목록)**: Excellent scoping with `.class-catalog` on ALL selectors, `cc` prefix on @keyframes

### IIFE Pattern
- **Login JS**: Properly wrapped in IIFE `(function(){...})()`
- **Partner map JS**: Mixed -- CONFIG is `var` global, but modules use IIFE pattern with `window.*` exports
- **Quick buy JS**: NO IIFE -- all variables are global (`let`, `const`, `function` at top level)
- **Class catalog JS**: Perfect IIFE, 0 global variables, 'use strict'

### Security
- **Partner map**: Has `escapeHtml()` for XSS prevention, used consistently
- **Partner map**: Naver Map API key exposed in HTML (`bfp8odep5r`) -- client-side, expected but note
- **Quick buy**: Uses `document.execCommand("copy")` -- deprecated but functional
- **Login projects**: No user input handling in JS (handled by MakeShop server-side)
- **Class catalog**: escapeHtml() consistently applied; querySelector injection risk in onChipRemove()

### Performance
- **Quick buy**: `scroll` event listener without debounce/throttle (line 114)
- **Quick buy**: `MutationObserver` on `document.body` with `subtree: true` -- very expensive
- **Partner map**: Uses debounce properly, has caching, Fuse.js for search
- **Class catalog**: Excellent -- IntersectionObserver, debounce, localStorage cache with TTL, lazy loading, event delegation

### Virtual Tags
- All login HTML files properly preserve `<!--/xxx/-->` tags
- Quick buy HTML properly preserves all MakeShop virtual tags
- Class catalog: No virtual tags (standalone individual page)

### Shared CSS Issue
- 3 login CSS files are IDENTICAL (1014 lines each) -- massive duplication
- All 3 login JS files are IDENTICAL (69 lines each) -- same

### Main Page (메인페이지)
- **IIFE**: js.js properly uses IIFE, but Index.html inline script is NOT in IIFE (global scope)
- **Duplicate YouTube code**: js.js IIFE and Index.html inline both define loadYouTube/renderYouTube/playVideo/toggleProducts
- **CSS corruption**: css.css has 4 damaged spots vs original
- **JS-CSS mismatch**: js.js uses `slide-video-thumb` class, CSS expects `video-thumb`

### YouTube v4 (카테고리 자동매칭) - 신규 작성
- **Location**: `유튜브 자동화/v4-카테고리/`
- **CSS Scoping**: `.youtube-v4-section` with `ytv4-` prefixed class names -- well-isolated
- **IIFE**: Properly wrapped, only `window.clearYouTubeV4Cache` exposed globally

### Partner Class Platform GAS Backend (Task 201)
- **Location**: `파트너클래스/class-platform-gas.gs` (2,627 lines)
- **GAS Compatibility**: PASS -- var only, no let/const/template literals
- **Review output**: `docs/phase2/gas-code-review.md`

### Partner Class Sync Functions (Task 202) - 검수 완료
- **Location**: `파트너클래스/class-platform-gas.gs` (3,272 lines after additions)
- GAS 3,272줄로 확장 (syncClassProducts_ 등 8개 함수)

### Class Catalog Page (Task 211) -- Review Completed
- **Location**: `파트너클래스/목록/` (Index.html, css.css, js.js)
- **MakeShop Compat**: PASS -- IIFE, var only, no template literals, CSS scoped to .class-catalog
- **Critical Issues Found (2)**:
  - C-01: SVG `id="halfGrad"` duplicated per card in renderStars() -- half stars break in Firefox
  - C-02: querySelector injection in onChipRemove() via data-filter-value
- **Major Issues (3)**: URL param whitelist, querySelector name interpolation, body overflow direct manipulation
- **Good Practices**: a11y (ARIA, reduced-motion), performance (IO, debounce, cache), deep linking, Schema.org

## Common Review Patterns to Check
1. SVG `<defs>` with fixed `id` inside loops -- causes id duplication
2. querySelector with user-controlled values -- selector injection risk
3. URL parameter restoration without whitelist validation
4. document.body style manipulation without CSS class approach
5. @keyframes naming collision (use project prefix like `cc-`)

See: [patterns.md](patterns.md) for detailed notes.
