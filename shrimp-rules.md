# Development Guidelines

## 1. Project Overview

### Identity

- **Brand**: PRESSCO21 (30+ years pressed flower/preserved flower specialist)
- **Platform**: MakeShop D4 (Chameleon) hosted e-commerce
- **URL**: foreverlove.co.kr
- **Tech Stack**: Vanilla HTML/CSS/JS only (no build tools, no frameworks)
- **External Libraries (CDN only)**: Swiper.js, Fuse.js, Chart.js, flatpickr
- **External APIs**: Naver Map API, Google Apps Script (YouTube/Sheets proxy)
- **Backend**: Google Apps Script + Google Sheets (no traditional server)

### Design System

- **Primary Font**: Pretendard (fallback: Noto Sans KR)
- **Brand Colors**: `#7d9675` (primary green), `#b7c9ad` (light green), `#2c3e30` (dark green), `#637561` (sage green/header), `#425B51` (dark green/footer)
- **Design Guide**: `CSS-DESIGN-GUIDE.md` (detailed specifications)

---

## 2. Project Architecture

### Directory Structure

| Directory | MakeShop Location | Status | Notes |
|-----------|-------------------|--------|-------|
| `메인페이지/` | Main Design (HTML/CSS/JS tabs) | Live | Has inline scripts in HTML |
| `간편 구매/` | Product Detail Design | Live | Use `js.fixed.js` not `js.js` |
| `1초 로그인(킵그로우)/회원 로그인/` | Login Design | Live | 3 variants share logic |
| `1초 로그인(킵그로우)/구매시 로그인/` | Login Design | Live | Must sync with other 2 |
| `1초 로그인(킵그로우)/주문 조회 로그인/` | Login Design | Live | Must sync with other 2 |
| `유튜브 자동화/현재-배포/` | Main HTML tab (inline) | Live | v3, to be replaced by v4 |
| `유튜브 자동화/신규-hybrid-미배포/` | - | Not deployed | Deprecated, replaced by v4 |
| `파트너맵/` | Individual Page | Live | 132KB JS, API key concern |
| `브랜드스토리/브랜드페이지/` | Individual Page | Live | Local image paths need CDN |
| `레지너스 화이트페이퍼/` | Individual Page | Live | **Code pattern reference** |
| `가이드 페이지/` | Individual Page | Empty | Not implemented |
| `docs/` | - | - | PRD.md, ROADMAP.md |
| `tasks/` | - | - | Task files (XXX-description.md) |

### File Naming Convention

| File | Purpose | Deploy Target |
|------|---------|---------------|
| `Index.html` / `index.html` | HTML markup | MakeShop HTML tab (paste) |
| `css.css` / `style.css` | Styles | MakeShop CSS tab (paste) |
| `js.js` / `script.js` | JavaScript | MakeShop JS tab (paste) |
| `*.fixed.*` | Improved version | Compare with original, choose to use |
| `*.gs` | Google Apps Script | Deploy as GAS web app |
| `GUIDE.md` | Per-folder operation guide | Reference only |
| `fullcode.html` | Combined HTML+CSS+JS | MakeShop HTML tab (single paste) |

### Project Documents

| File | Purpose | Update Rule |
|------|---------|-------------|
| `docs/PRD.md` | Product Requirements Document | Update when scope changes |
| `docs/ROADMAP.md` | Development roadmap with tasks | **Update task status on completion** |
| `tasks/XXX-description.md` | Individual task specs | **Update step progress during work** |
| `CSS-DESIGN-GUIDE.md` | Design specifications | Reference only |
| `README.md` | Project overview | Update when structure changes |

---

## 3. MakeShop D4 Critical Rules

### 3.1 Template Literal Escape (CRITICAL - Save Failure)

MakeShop engine interprets `${variable}` as substitution codes. Unescaped template literals cause **"Data modification failed"** save errors.

```javascript
// WRONG - will cause save failure
var html = `<div class="${className}">${content}</div>`;

// CORRECT - escaped for MakeShop
var html = `<div class="\${className}">\${content}</div>`;
```

- **Every** `${` in JS code must be written as `\${`
- This applies to ALL `.js` files and inline `<script>` blocks
- Search pattern to verify: find all `${` without preceding `\`

### 3.2 Virtual Tags (NEVER Modify)

MakeShop uses server-side rendering tags. **Never modify, delete, or reorder these:**

```html
<!-- Loop tags -->
<!--/loop_new_product(8)/--> ~ <!--/end_loop_new_product/-->
<!--/loop_best_product(8)/--> ~ <!--/end_loop_best_product/-->

<!-- Property tags -->
<!--/product@name/-->
<!--/product@price_sell/-->
<!--/new_product@link/-->

<!-- Conditional tags -->
<!--/if_new_product@discountrate/--> ~ <!--/end_if/-->

<!-- Include tags -->
<!--/include_header(1)/-->
<!--/include_footer(1)/-->

<!-- Section markers -->
<!--s: section_youtube--> ~ <!--e: section_youtube-->

<!-- Substitution codes -->
{$member_id}
{$치환코드}
```

- **Do not** add, remove, or modify any `<!--/ /-->` comment tags
- **Do not** modify `{$...}` substitution code syntax
- **Do not** reorder section markers (`<!--s:` / `<!--e:`)
- When adding new HTML, insert **between** existing virtual tags, never inside them

### 3.3 No Build Tools

- **Forbidden**: npm, webpack, vite, React, Vue, Angular, TypeScript, SCSS/SASS, PostCSS
- **Allowed**: Vanilla HTML, CSS, JavaScript only
- External libraries must be loaded via CDN `<script>` or `<link>` tags

```html
<!-- CORRECT - CDN loading -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper/swiper-bundle.min.css">

<!-- WRONG - npm packages -->
import Chart from 'chart.js';
```

### 3.4 MakeShop API Limits

- **Rate limit**: 500 queries + 500 operations per hour (shared across ALL services)
- GAS proxy must handle API calls server-side (never expose API keys to frontend)
- Implement caching to minimize API calls:
  - Static data (categories, guides): localStorage **24h** cache
  - Semi-static data (class list, partner info): localStorage **1h** cache
  - Real-time data (stock, reservations): **No caching** - use MakeShop native stock

### 3.5 MakeShop Built-in Functions

- `get_main_list()` - AJAX product list loader (expose via `window`)
- `changeNaviTitleText()` - Mobile navigation title
- `mySwiper` - MakeShop's Swiper wrapper
- jQuery (`$`, `$.ajax`) - Available in main/detail pages

---

## 4. Code Standards

### 4.1 JavaScript Standards

**IIFE Pattern (Mandatory for all JS):**

```javascript
// STANDARD JS PATTERN (Reference: 레지너스 화이트페이퍼/script.js)
(function() {
    'use strict';

    // 1. Root element guard
    var root = document.getElementById('[container-id]');
    if (!root) return;

    // 2. Configuration
    var CONFIG = {
        apiUrl: 'https://script.google.com/macros/s/.../exec',
        cacheKey: 'feature_cache_v1',
        cacheTTL: 24 * 60 * 60 * 1000
    };

    // 3. DOM queries scoped to root
    var searchInput = root.querySelector('.search-input');

    // 4. Event delegation on root
    root.addEventListener('click', function(e) {
        if (e.target.matches('.btn-action')) {
            handleAction(e.target);
        }
    });

    // 5. Only expose to window when MakeShop requires it
    // window.functionName = functionName;
})();
```

**Naming:**

| Category | Convention | Example |
|----------|-----------|---------|
| Variables | camelCase (English only) | `var productList`, `var isLoading` |
| Functions | camelCase (English only) | `function loadProducts()`, `function handleClick()` |
| Constants | UPPER_SNAKE_CASE | `var API_URL`, `var CACHE_TTL` |
| DOM IDs | kebab-case | `id="partner-dashboard"` |
| CSS classes | kebab-case | `class="product-card"` |
| **Korean identifiers** | **FORBIDDEN** | ~~`var 상품목록`~~, ~~`.상품카드`~~ |

**Variable declaration:**

- Use `var` (not `let`/`const`) for maximum MakeShop compatibility
- Declare at function top for clarity

**Comments:** Write in Korean

```javascript
// 상품 목록을 GAS API에서 가져와서 렌더링한다
function loadProducts() { ... }
```

### 4.2 CSS Standards

**Container Scoping (Mandatory):**

```css
/* CORRECT - scoped to container */
#resiners-whitepaper { --color-primary: #7d9675; }
#resiners-whitepaper .section-title { font-size: 28px; }
#resiners-whitepaper .product-card { border-radius: 8px; }

/* WRONG - global selectors */
* { box-sizing: border-box; }
body { font-family: 'Pretendard'; }
.section-title { font-size: 28px; }
```

**Responsive Breakpoints:**

```css
/* Mobile first (default) */
.container { padding: 16px; }

/* Tablet: 768px */
@media (min-width: 768px) { ... }

/* Desktop: 992px */
@media (min-width: 992px) { ... }

/* Wide: 1200px */
@media (min-width: 1200px) { ... }
```

**Design tokens to use:**

```css
#[container-id] {
    --color-primary: #7d9675;
    --color-primary-light: #b7c9ad;
    --color-dark: #2c3e30;
    --font-main: 'Pretendard', 'Noto Sans KR', sans-serif;
}
```

### 4.3 HTML Standards

- Preserve all MakeShop virtual tags exactly as they are
- Use semantic HTML5 elements (`<section>`, `<nav>`, `<article>`)
- Add `loading="lazy"` to images below the fold (not hero/banner images)
- Add meaningful `alt` text to all `<img>` tags
- Add `role` and `aria-*` attributes to interactive elements

---

## 5. Feature Implementation Standards

### 5.1 Creating a New Project

1. Create folder with Korean name matching MakeShop edit location
2. Create `Index.html`, `css.css`, `js.js` (standard file set)
3. Create `GUIDE.md` with: file structure, key functions, substitution codes, deployment notes
4. Apply IIFE pattern to JS with container ID guard
5. Scope all CSS under container ID
6. Add entry to `README.md` folder structure table
7. Add tasks to `docs/ROADMAP.md`
8. Create task file in `tasks/XXX-description.md`

### 5.2 Modifying Existing Projects

1. Read the project's `GUIDE.md` first
2. Read existing code files completely before making changes
3. Preserve all virtual tags and substitution codes
4. Test `\${var}` escaping in all template literals
5. Update `GUIDE.md` if functions or structure changed
6. Update task file step progress

### 5.3 GAS (Google Apps Script) Integration Pattern

```javascript
// Frontend: IIFE with fetch to GAS
(function() {
    'use strict';
    var GAS_URL = 'https://script.google.com/macros/s/.../exec';

    function fetchData(params) {
        var url = GAS_URL + '?' + new URLSearchParams(params).toString();
        return fetch(url)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.status !== 'success') {
                    throw new Error(data.message || 'API error');
                }
                return data;
            });
    }
})();
```

```javascript
// GAS Backend: doGet handler
function doGet(e) {
    var action = e.parameter.action || 'list';
    var lock = LockService.getScriptLock();

    try {
        lock.waitLock(10000);
        // Process request...
        return ContentService.createTextOutput(
            JSON.stringify({ status: 'success', data: result })
        ).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
        return ContentService.createTextOutput(
            JSON.stringify({ status: 'error', message: err.message })
        ).setMimeType(ContentService.MimeType.JSON);
    } finally {
        lock.releaseLock();
    }
}
```

### 5.4 Adding External Libraries

1. Find a reliable CDN (jsdelivr, cdnjs, unpkg)
2. Use specific version URLs (not `@latest`)
3. Add `<script>` or `<link>` in HTML
4. Check for library availability before use: `if (typeof LibraryName !== 'undefined')`
5. Document the library in project's `GUIDE.md`

### 5.5 Performance Optimization Techniques

- **Intersection Observer**: For lazy loading, scroll animations, infinite scroll
- **Event Delegation**: Attach listeners to root container, not individual elements
- **debounce/throttle**: For scroll, resize, input events
- **requestAnimationFrame**: For scroll-based UI updates
- **MutationObserver**: Scope to specific container, never `document.body`
- **`passive: true`**: For scroll/touch event listeners
- **Image optimization**: `loading="lazy"`, `width`/`height` attributes (CLS prevention), WebP format
- **Font**: `font-display: swap`, `<link rel="preconnect">` for CDN

### 5.6 localStorage Caching Pattern

```javascript
function getCachedData(cacheKey, ttl, fetchFn) {
    var cached = localStorage.getItem(cacheKey);
    var timestamp = localStorage.getItem(cacheKey + '_time');

    if (cached && timestamp && (Date.now() - Number(timestamp)) < ttl) {
        return Promise.resolve(JSON.parse(cached));
    }

    return fetchFn().then(function(data) {
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(cacheKey + '_time', String(Date.now()));
        return data;
    });
}
```

---

## 6. Key File Interaction Rules

### 6.1 YouTube Automation (Multi-file Sync)

When modifying YouTube section code:
1. Edit files in `유튜브 자동화/현재-배포/분리/` (Index.html, css.css, js.js)
2. Regenerate `유튜브 자동화/현재-배포/fullcode.html` by combining all three
3. The `fullcode.html` content is pasted into `메인페이지/Index.html` at `<!--s: section_youtube-->` ~ `<!--e: section_youtube-->`
4. **Never edit `fullcode.html` directly** - always edit separated files first

### 6.2 1-Second Login (3 Variants Must Sync)

These 3 folders share identical logic with minor UI differences:
- `1초 로그인(킵그로우)/회원 로그인/`
- `1초 로그인(킵그로우)/구매시 로그인/`
- `1초 로그인(킵그로우)/주문 조회 로그인/`

**Rule**: Any CSS or JS change must be applied to **all 3 variants simultaneously**.

### 6.3 Main Page (HTML + JS Tab Dependency)

`메인페이지/Index.html` contains inline `<script>` blocks for:
- Main banner Swiper initialization
- Category Swiper initialization
- YouTube section (loadYouTube, renderYouTube, playVideo, toggleProducts)
- Tab menu product loading

**Rule**: When modifying main page JS logic, check both `메인페이지/js.js` AND inline scripts in `메인페이지/Index.html`.

### 6.4 Task Workflow (Document Sync)

When completing a task:
1. Update step checkboxes in `tasks/XXX-description.md`
2. Update task status in `docs/ROADMAP.md` (mark as completed)
3. Add `See: /tasks/XXX-xxx.md` reference to completed task in ROADMAP

When creating a new task:
1. Create `tasks/XXX-description.md` following `tasks/000-sample.md` format
2. Add task entry to appropriate Phase in `docs/ROADMAP.md`
3. Include: status, scope, duration, dependencies, implementation steps, acceptance criteria

### 6.5 Fixed File Versions

| Original | Fixed Version | Status |
|----------|--------------|--------|
| `간편 구매/js.js` | `간편 구매/js.fixed.js` | **Use fixed version** |
| `1초 로그인/*/css.css` | `1초 로그인/*/css.fixed.css` | **Use fixed version** |
| `1초 로그인/*/index.html` | `1초 로그인/*/index.fixed.html` | **Use fixed version** |

**Rule**: When the `.fixed.*` version exists, reference and build upon it (not the original).

---

## 7. AI Decision-Making Standards

### 7.1 New Feature vs. Code Modification

| Situation | Decision |
|-----------|----------|
| Adding entirely new page/section | Create new project folder |
| Enhancing existing functionality | Modify existing files in-place |
| Replacing deprecated feature | Create new folder (e.g., v4), keep old as backup |
| Bug fix | Create `.fixed.*` version or edit existing if already fixed |

### 7.2 CDN Library Selection

- **Prefer**: Libraries already used in project (Swiper.js, Fuse.js, Chart.js)
- **Evaluate**: Bundle size, CDN reliability (jsdelivr > cdnjs), active maintenance
- **Avoid**: Libraries requiring build steps, TypeScript-only libraries, heavy frameworks

### 7.3 GAS vs. Frontend Processing

| Data Type | Where to Process |
|-----------|-----------------|
| API keys, credentials | **GAS only** (never expose to frontend) |
| Data from Google Sheets | **GAS** (fetch and return as JSON) |
| MakeShop API calls | **GAS proxy** (CORS + key protection) |
| UI state, filtering, sorting | **Frontend** (faster user experience) |
| Email sending | **GAS** (MailApp/GmailApp) |
| Periodic tasks (cron) | **GAS triggers** |

### 7.4 Caching Strategy Decision Tree

```
Is data user-specific (e.g., login state, cart)?
  YES -> No caching
  NO  -> Is data changing frequently (stock, reservations)?
    YES -> No caching, use MakeShop native
    NO  -> Is data updated daily (product lists, partner info)?
      YES -> localStorage 1h cache
      NO  -> localStorage 24h cache (categories, guides, templates)
```

### 7.5 Error Handling Strategy

- GAS endpoint down: Show "temporarily unavailable" message in UI, never blank screen
- API call failure: Retry once after 2 seconds, then show error state
- MakeShop save failure: Check `\${var}` escaping first (most common cause)
- Feature dependency failure: Graceful degradation - show "coming soon" for that section only

---

## 8. Workflow Standards

### 8.1 Development Workflow

```
1. Plan task
   -> Read existing codebase, understand current state
   -> Update ROADMAP.md with new task

2. Create task file
   -> /tasks/XXX-description.md (follow 000-sample.md format)
   -> Include: goal, target files, implementation steps, acceptance criteria, test checklist

3. Implement
   -> Follow task spec step by step
   -> Update task file checkboxes after each step
   -> Pause after each major step for user confirmation

4. Update roadmap
   -> Mark completed task in ROADMAP.md
   -> Add See: /tasks/XXX-xxx.md reference
```

### 8.2 Code Reference Pattern

When implementing new features, reference `레지너스 화이트페이퍼/` as the model:
- `script.js`: IIFE structure, root guard, Chart.js integration, Intersection Observer
- `style.css`: Container scoping `#resiners-whitepaper`, CSS variables, responsive design
- `index.html`: Clean HTML structure, CDN loading, semantic markup

### 8.3 Deployment Checklist

Before deploying to MakeShop:
- [ ] All `${var}` escaped as `\${var}` in JS
- [ ] All virtual tags preserved unchanged
- [ ] IIFE pattern wrapping all JS
- [ ] CSS scoped to container ID/class
- [ ] No global variable pollution
- [ ] No API keys exposed in frontend code
- [ ] Responsive design tested (768px / 992px / 1200px)
- [ ] `GUIDE.md` updated if structure changed
- [ ] Backup of current production code saved

---

## 9. Prohibited Actions

### Absolute Prohibitions

- **NEVER** use `${var}` without backslash escape in JS code
- **NEVER** modify, delete, or reorder MakeShop virtual tags (`<!--/ /-->`, `{$...}`)
- **NEVER** use npm, webpack, vite, or any build tool
- **NEVER** use React, Vue, Angular, or any framework
- **NEVER** use Korean for variable names, function names, or CSS class names
- **NEVER** declare global variables outside IIFE (except `window.functionName` when required by MakeShop)
- **NEVER** use CSS global selectors (`*`, `body`, `html`, `div`) without container scoping
- **NEVER** expose API keys, tokens, or credentials in frontend code
- **NEVER** use `let` or `const` without confirming MakeShop's JS engine compatibility (prefer `var`)
- **NEVER** modify only 1 of the 3 login variants without updating the other 2
- **NEVER** edit `fullcode.html` directly (edit separated files, then regenerate)
- **NEVER** delete or ignore `GUIDE.md` files
- **NEVER** skip updating `docs/ROADMAP.md` after task completion
- **NEVER** use MutationObserver on `document.body` (scope to specific container)
- **NEVER** call MakeShop API without considering 500/hour rate limit
