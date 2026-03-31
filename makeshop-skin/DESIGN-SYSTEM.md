# PRESSCO21 디자인 시스템 기준점

> 메인 사이트(main.css / common.css)에서 직접 확인한 디자인 토큰 레퍼런스.
> 모든 신규 페이지 개발 시 이 문서를 기준으로 삼는다.
> 확인 일자: 2026-03-17 | 스킨: 리뉴얼 1b 03.01(COPY)

---

## 1. CSS 변수 레퍼런스

### 1-1. 자사 커스텀 변수 (main.css — 최우선 참조)

```css
:root {
  /* 브랜드 색상 */
  --color-primary:       #7d9675;   /* 세이지 그린 — 메인 브랜드 */
  --color-primary-light: #b7c9ad;   /* 밝은 세이지 — 헤더 배경 */
  --color-dark:          #2c3e30;   /* 다크 그린 — 강조, 파트너 primary */
  --color-text:          #4a4a4a;   /* 본문 텍스트 */
  --color-bg:            #fdfbf7;   /* 크림 아이보리 — 전체 배경 */
  --color-white:         #ffffff;
  --color-accent:        #d4a373;   /* 골드/테라코타 — 액센트, CTA */

  /* 레이아웃 */
  --spacing-section:     70px;      /* 섹션 수직 간격 (일부 섹션 90px) */
  --spacing-container:   1400px;    /* 컨테이너 최대 너비 */
}
```

### 1-2. 메이크샵 기본 변수 (common.css :root — 줄 1~129)

```css
:root {
  /* 폰트 스택 */
  --cw-font-sans-serif: Pretendard, system-ui, -apple-system, sans-serif;
  --cw-font-monospace:  SFMono-Regular, Menlo, Monaco, monospace;

  /* 핵심 색상 */
  --cw-heading-color:   #121212;    /* 제목 기본색 */
  --cw-point-color:     #FF4600;    /* 포인트 (오렌지) */
  --cw-point-color-pri: #121212;    /* 포인트 프라이머리 */
  --cw-error-color:     #DC3545;    /* 에러 (빨강) */
  --cw-light-color:     #999999;    /* 라이트 */

  /* 뉴트럴 스케일 */
  --cw-color-10: #f6f6f6;
  --cw-color-20: #eeeeee;
  --cw-color-30: #dddddd;
  --cw-color-40: #cccccc;
  --cw-color-50: #aaaaaa;
  --cw-color-60: #888888;
  --cw-color-70: #666666;
  --cw-color-80: #444444;
  --cw-color-90: #343434;

  /* Border Radius */
  --cw-border-radius: 4px;

  /* 사이즈 스케일 (rem) */
  --cw-size-2:  0.125rem;   /*  2px */
  --cw-size-4:  0.25rem;    /*  4px */
  --cw-size-8:  0.5rem;     /*  8px */
  --cw-size-12: 0.75rem;    /* 12px */
  --cw-size-16: 1rem;       /* 16px */
  --cw-size-20: 1.25rem;    /* 20px */
  --cw-size-24: 1.5rem;     /* 24px */
  --cw-size-32: 2rem;       /* 32px */
  --cw-size-40: 2.5rem;     /* 40px */
  --cw-size-48: 3rem;       /* 48px */
  --cw-size-64: 4rem;       /* 64px */
  --cw-size-80: 5rem;       /* 80px */
}
```

---

## 2. 폰트 체계

| 용도 | 폰트 패밀리 | 선언 위치 |
|------|-----------|---------|
| 본문 기본 | `'Pretendard', 'Noto Sans KR', sans-serif` | main.css body |
| 타이틀 (h1~h3) | `'Noto Serif KR', serif` | main.css h1~h3 |
| 영문 장식 | `'Cormorant Garamond', serif` | main.css .en-heading 등 |
| 시스템 기본 | `var(--cw-font-sans-serif)` = Pretendard | common.css |

**Pretendard 웹폰트**: common.css 줄 131~194에 `@font-face` 9 weight (100~900) 선언됨.

**CDN 로드 필요 시:**
```html
<!-- Noto Serif KR -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700&family=Cormorant+Garamond:wght@400;600&display=swap" rel="stylesheet">
```

---

## 3. 색상 팔레트

### 3-1. 브랜드 색상 계열

| 이름 | 값 | 용도 |
|------|-----|------|
| Primary (세이지) | `#7d9675` | 메인 브랜드, 버튼, 링크 |
| Primary Light | `#b7c9ad` | 헤더 배경, 연한 강조 |
| Primary Sub | `#8fa885` | 서브 그린, 호버 |
| Primary Deep | `#5a7252` | 다크 호버, 활성 상태 |
| Primary BG | `#e8ede6` | 그린 계열 배경 |
| Dark Green | `#2c3e30` | 다크 강조, 파트너 primary |

### 3-2. 베이지/크림 계열 (배경)

| 이름 | 값 | 용도 |
|------|-----|------|
| BG Main | `#fdfbf7` | 전체 페이지 배경 |
| BG Sub | `#f7f3eb` | 섹션 대체 배경 |
| BG Warm | `#f6ead5` | 따뜻한 배경 강조 |

### 3-3. 골드/브라운 계열 (액센트)

| 이름 | 값 | 용도 |
|------|-----|------|
| Accent Gold | `#d4a373` | 액센트, CTA 보조 |
| Accent Brown | `#b8865a` | 진한 골드 |
| Accent Dark | `#745643` | 브라운 다크 |

### 3-4. 그레이 계열 (텍스트/보더)

| 이름 | 값 | 용도 |
|------|-----|------|
| Text Dark | `#4a4a4a` | 본문 텍스트 |
| Text Mid | `#888888` | 보조 텍스트 |
| Border | `#cccccc` | 기본 보더 |
| Divider | `#eeeeee` | 구분선 |

---

## 4. 헤더 디자인

```css
/* header.css 기준 */
#header {
  position: fixed;
  top: 0;
  z-index: 5;
  width: 100%;
}

.nav-wrap {
  height: 64px;
  background: #b7c9ad;  /* var(--color-primary-light) */
}

/* 스크롤 시 */
#header.fixed .nav-wrap {
  background: #ffffff;
}

.logo img {
  max-width: 170px;
}
```

---

## 5. 컴포넌트 패턴

### 5-1. 컨테이너

```css
.container {
  max-width: var(--spacing-container);  /* 1400px */
  margin: 0 auto;
  padding: 0 20px;
}
```

### 5-2. 섹션 간격

```css
.section {
  padding: var(--spacing-section) 0;   /* 70px */
}
/* 넓은 섹션: padding 90px */
```

### 5-3. 버튼

```css
/* Primary 버튼 */
.btn-primary {
  background: var(--color-primary);      /* #7d9675 */
  color: #ffffff;
  border-radius: var(--cw-border-radius); /* 4px */
}

/* Dark 버튼 (CTA) */
.btn-dark {
  background: var(--color-dark);         /* #2c3e30 */
  color: #ffffff;
}

/* Accent 버튼 */
.btn-accent {
  background: var(--color-accent);       /* #d4a373 */
  color: #ffffff;
}
```

### 5-4. 카드

```css
.card {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}
```

### 5-5. 배지 (3색 체계 — Phase B 통일)

```css
/* 그린 계열 — APPROVED, ACTIVE, ATELIER, AMBASSADOR */
.badge-green {
  background: #e8ede6;
  color: #2c3e30;
  border: 1px solid #b7c9ad;
}

/* 골드 계열 — PENDING, GARDEN */
.badge-gold {
  background: #fef3e2;
  color: #b8865a;
  border: 1px solid #f0d5a0;
}

/* 중립 계열 — REJECTED, CLOSED, BLOOM */
.badge-neutral {
  background: #f5f5f5;
  color: #666666;
  border: 1px solid #dddddd;
}
```

### 5-6. 섹션 타이틀

```css
.section-title {
  font-family: 'Noto Serif KR', serif;
  font-size: 28px;      /* 목록 페이지 헤더 (Phase B: 42px → 28px 조정) */
  color: var(--color-dark);          /* #2c3e30 */
  text-align: center;
  margin-bottom: 40px;
}

.section-subtitle {
  font-family: 'Cormorant Garamond', serif;
  font-size: 14px;
  letter-spacing: 0.1em;
  color: var(--color-primary);       /* #7d9675 */
  text-transform: uppercase;
}
```

---

## 6. 브레이크포인트

```css
/* 모바일 우선 (Mobile First) */
@media (min-width: 768px)  { /* 태블릿 */ }
@media (min-width: 992px)  { /* 소형 데스크탑 */ }
@media (min-width: 1200px) { /* 대형 데스크탑 */ }
```

---

## 7. 가상태그 레퍼런스

### 7-1. 헤더 가상태그 (기본 상단)

```
if_head_banner, head_banner, end_if
link_home                    ← 홈 링크
link_basket                  ← 장바구니 링크
loop_category1               ← 1차 카테고리 반복
  category1@link             ← 카테고리 링크
  category1@name             ← 카테고리명
  loop_category1@category2   ← 2차 카테고리
    category1@category2@link
    category1@category2@name
    if_category1@category2@category3
    loop_category1@category2@category3
      category1@category2@category3@link
      category1@category2@category3@name
    end_loop
    end_if
  end_loop
end_loop
form_search                  ← 검색 폼
link_search_button
end_form
link_mypage                  ← 마이페이지 링크
if_login
  user_name                  ← 로그인한 회원명
  link_logout
else
  link_login
end_if
link_order_list              ← 주문조회 링크
link_reserve                 ← 예약조회
link_coupon                  ← 쿠폰
if_link_faq
  link_faq
end_if
if_link_m2m_question
  link_m2m_question
end_if
if_link_review
  link_review
end_if
```

### 7-2. 메인 페이지 가상태그

```
loop_best_product            ← 베스트 상품 반복
  best_product@link
  best_product@img
  best_product@name
  best_product@price
  best_product@discount_price
end_loop
```

### 7-3. 카테고리 페이지 가상태그

```
loop_product                 ← 상품 목록 반복
  product@link
  product@img
  product@name
  product@price
  product@discount_price
  product@discount_rate
end_loop
select_sort                  ← 정렬 선택박스
```

### 7-4. 상품 상세 가상태그

```
loop_review_board            ← 리뷰 목록
  review@subject
  review@content
  review@name
  review@reg_date
end_loop
loop_qna_board               ← Q&A 목록
  qna_board@subject
  qna_board@reg_date
end_loop
```

### 7-5. 마이페이지 가상태그

```
user_name                    ← 회원명
user_reserve                 ← 예약금/적립금
three_month_delivery_ing     ← 3개월 배송중
three_month_claim_all        ← 3개월 교환/반품
```

---

## 8. 파트너클래스 ↔ 메인 디자인 불일치 목록

| 항목 | 메인 기준 | 파트너클래스 현황 | 수정 여부 |
|------|---------|--------------|---------|
| 배경색 | `#fdfbf7` | 일부 `#ffffff` | E0-003 수정 필요 |
| 파트너 primary | `#2c3e30` | 구버전 `#3d2c1e` → `#2c3e30` 변경 | Phase B 완료 |
| 타이틀 폰트 | Noto Serif KR | Phase B에서 적용 | Phase B 완료 |
| 배지 색상 | 3색 체계 | Phase B에서 통일 | Phase B 완료 |
| 섹션 타이틀 크기 | 28px | Phase B: 42px → 28px | Phase B 완료 |
| 수수료율 노출 | 비공개 (오프라인 안내) | 대시보드에서 노출 | E0-006 수정 완료 |
| ChannelIO 이중로드 | 1회 로드 | 이중 로드 발생 | E0-010 미착수 |

---

## 9. common.css 섹션 구조

| 줄 범위 | 내용 |
|---------|------|
| 1~129 | `:root` — 메이크샵 기본 CSS 변수 (`--cw-*` prefix) |
| 131~194 | Pretendard 웹폰트 `@font-face` (9 weight) |
| 195~265 | Bootstrap Reboot v5.3.3 `:root` (`--bs-*` prefix) |
| 266~640 | CSS Reset + 기본 HTML 요소 스타일 |
| 640~1960 | Bootstrap Grid / Container / Utility |
| 1960~2100 | DatePicker |
| 2100~2660 | 상품 공통 스타일, 페이지 타이틀, 탭 메뉴, 레이어 팝업 |
| 2660~3338 | 폼 컴포넌트, 유틸리티, 모바일 대응 |

---

## 10. 개발 참고사항

### 메이크샵 편집기 저장 주의사항
- `${variable}` → **반드시** `\${variable}` 이스케이프 (미이스케이프 시 "데이터 수정 실패")
- 가상태그 (`{$치환코드}`, `<!-- -->`) 절대 수정/삭제 금지

### JS 격리 패턴
```javascript
(function() {
  'use strict';
  // 모든 JS 로직은 IIFE로 감싸기
})();
```

### CSS 스코핑
```css
/* 반드시 컨테이너 ID/클래스로 범위 제한 */
#partnerclass-list .card { ... }
.partnerclass-detail .btn { ... }
```
