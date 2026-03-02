# YouTube 자동화 섹션 디자인 수정 가이드

> 대상: PRESSCO21 메인페이지 디자이너
> 파일 위치: `메인페이지/css.css`
> 최종 수정일: 2026-03-02

---

## 1. 프로젝트 개요

### 이 섹션이 하는 일

메인페이지 중간에 있는 **"Learn & Shop"** 섹션은 PRESSCO21 유튜브 채널의 최신 영상을
자동으로 가져와서 보여줍니다.

```
[자동 흐름]
유튜브 채널에 영상 업로드
    ↓ (매일 밤 자동 수집)
n8n 서버 (자동화 엔진)
    ↓ (데이터 저장)
NocoDB 데이터베이스
    ↓ (방문자가 페이지 열면)
메인페이지에 자동 표시
```

### 디자이너가 알아야 할 핵심

- **HTML 파일(Index.html)은 절대 건드리지 않습니다.** 유튜브 섹션 내용은 모두 `js.js`가 자동으로 만들어 줍니다.
- **디자인 수정은 `css.css` 파일만** 수정하면 됩니다.
- `js.js` 파일은 로직(데이터 처리)을 담당하므로 디자인 수정 시 건드릴 필요가 없습니다.

---

## 2. 섹션 전체 구조 (화면에 보이는 순서)

```
┌─────────────────────────────────────────────┐
│  섹션 배경 (.youtube-section-v3)             │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  섹션 타이틀 (.section-title)        │   │
│  │  "Learn & Shop"                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  메인 영상 카드 (.featured-video-wrap)│   │
│  │  ┌─────────────────────────────┐    │   │
│  │  │  영상 썸네일 (16:9)           │    │   │
│  │  │  클릭하면 유튜브 플레이어 재생  │    │   │
│  │  └─────────────────────────────┘    │   │
│  │  영상 제목 (.featured-video-info)    │   │
│  │  날짜 · 조회수 (.video-meta)         │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [모바일 전용] "인기 재료" 토글 버튼          │
│  ┌─────────────────────────────────────┐   │
│  │  인기 재료 (.yt-products-header)     │   │ ▶
│  │  펼치면 상품 카드 그리드 표시          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [모바일 전용] "더 많은 영상" 토글 버튼        │
│  ┌─────────────────────────────────────┐   │
│  │  더 많은 영상 (20개) (.yt-slider-header)│ ▶
│  │  펼치면 슬라이더 카드 20개 표시        │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [PC 전용] 슬라이더 + 인기재료 항상 표시       │
└─────────────────────────────────────────────┘
```

---

## 3. CSS 파일 내 유튜브 섹션 위치

`css.css` 파일에서 유튜브 섹션 관련 CSS는 크게 4구역으로 나뉩니다.

| 줄 번호 (대략) | 내용 |
|-------------|------|
| ~930 ~ 990 | **섹션 전체 + 메인 영상 카드** (배경색, 레이아웃, 메인 영상 카드) |
| ~1063 ~ 1250 | **슬라이더 + 토글 헤더 + 슬라이더 카드** (모바일 공통) |
| ~1270 ~ 1430 | **재생 버튼, 썸네일, fade 효과** |
| ~1430 ~ 1530 | **인기 재료 패널** |
| ~1540 ~ 1700 | **모바일 전용 토글 열기/닫기** |
| ~1725 ~ 1970 | **PC(768px 이상) 전용 레이아웃** |
| ~1970 ~ 2040 | **모바일 토글 헤더 통일 스타일** |

---

## 4. 자주 수정할 항목과 수정 방법

### 4-1. 섹션 배경색

**현재**: 위에서 아래로 연한 그린 그라데이션

```css
/* 찾기: .youtube-section-v3 */
.youtube-section-v3 {
    padding: 50px 0;
    background: linear-gradient(180deg, #f4f7f3 0%, #e8ede5 100%);
    /* ↑ 이 부분 수정 */
}
```

단색으로 바꾸려면: `background: #f4f7f3;`

---

### 4-2. 메인 영상 카드 (큰 카드)

**찾는 방법**: css.css에서 `.featured-video-wrap` 검색

```css
.featured-video-wrap {
    background: #fff;          /* 카드 배경색 */
    border-radius: 12px;       /* 모서리 둥글기 */
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);  /* 그림자 */
}
```

**영상 제목 텍스트**:
```css
.featured-video-info h4 {
    font-size: 18px;           /* 제목 크기 */
    font-weight: 700;
    color: #2c3e30;            /* 제목 색상 */
}
```

**날짜·조회수 텍스트**:
```css
.featured-video-info .video-meta {
    font-size: 12px;
    color: #888;               /* 메타 텍스트 색상 */
}
```

---

### 4-3. 메인 영상 재생 버튼 (흰 원형 버튼)

```css
/* 찾기: .yt-play-btn */
.yt-play-btn {
    /* 원형 버튼 위치: 썸네일 정중앙 */
    width: 64px;               /* 버튼 크기 */
    height: 64px;
    background: rgba(255, 255, 255, 0.92);  /* 배경 투명도 */
    border-radius: 50%;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}

/* 삼각형 아이콘 색상 */
.yt-play-btn::after {
    border-left-color: var(--color-primary);  /* 세이지 그린 → 다른 색으로 변경 가능 */
}
```

---

### 4-4. 슬라이더 카드 (영상 목록)

**카드 배경/테두리**:
```css
/* 찾기: .youtube-slider .swiper-slide */
.youtube-slider .swiper-slide {
    background: #fafafa;       /* 카드 배경 */
    border-radius: 8px;        /* 모서리 둥글기 */
    border: 1px solid #eee;    /* 테두리 */
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
```

**카드 제목 텍스트**:
```css
.youtube-slider .slide-info h6 {
    font-size: 12px;
    font-weight: 600;
    color: #333;
}
```

**카드 날짜 / 조회수**:
```css
.youtube-slider .slide-date {
    font-size: 12px;
    color: #999;
}
.youtube-slider .slide-views {
    font-size: 11px;
    color: #7d9675;             /* 세이지 그린 */
    font-weight: 600;
}
```

**현재 재생 중인 카드 강조 테두리**:
```css
.youtube-slider .yt-slide-active {
    border: 2px solid var(--color-primary) !important;
    box-shadow: 0 0 0 3px rgba(125, 150, 117, 0.25) !important;
    /* var(--color-primary) = #7d9675 (세이지 그린) */
}
```

**"재생 중" 배지 (카드 위 반투명 오버레이)**:
```css
.yt-now-playing {
    background: rgba(44, 62, 48, 0.45);  /* 오버레이 색상/투명도 */
}
.yt-now-playing span {
    background: var(--color-primary);    /* 배지 배경색 */
    color: #fff;
    font-size: 11px;
    border-radius: 12px;
}
```

---

### 4-5. 페이지네이션 불릿 (슬라이더 아래 점)

```css
/* 비활성 점 */
.youtube-slider .swiper-pagination-bullet {
    background: #ccc;
    width: 6px;
    height: 6px;
}
/* 활성 점 (현재 위치) */
.youtube-slider .swiper-pagination-bullet-active {
    background: #7d9675;       /* 색상 */
    width: 18px;               /* 길게 늘어나는 너비 */
}
```

---

### 4-6. PC 슬라이더 이전/다음 버튼 (원형 버튼)

```css
/* PC에서만 보임 (min-width: 768px 블록 안에 있음) */

/* 버튼 원형 */
.youtube-slider-wrap .swiper-button-prev,
.youtube-slider-wrap .swiper-button-next {
    width: 34px;
    height: 34px;
    background: #2c3e30;       /* 기본 배경색 (다크 그린) */
    border-radius: 50%;
    box-shadow: 0 2px 10px rgba(44, 62, 48, 0.35);
}

/* 호버 시 */
.youtube-slider-wrap .swiper-button-prev:hover,
.youtube-slider-wrap .swiper-button-next:hover {
    background: #7d9675;       /* 호버 배경색 (세이지 그린) */
}

/* 화살표 방향과 두께 */
.youtube-slider-wrap .swiper-button-prev::after,
.youtube-slider-wrap .swiper-button-next::after {
    width: 8px;
    height: 8px;
    border-right: 2px solid #fff;   /* 화살표 두께 */
    border-top: 2px solid #fff;
}
```

> **주의**: 화살표는 CSS 테두리(border)로 만든 것입니다. `content: ''`로 폰트 문자를 사용하지 않습니다.
> 방향은 `transform: rotate()` 각도로 결정됩니다. 건드리지 마세요.

---

### 4-7. 모바일 토글 헤더 ("인기 재료" / "더 많은 영상")

두 토글 모두 동일한 디자인 규칙을 따릅니다.

```css
/* 모바일 전용 (@media max-width: 767px 블록 안 또는 직접 정의) */

/* 두 헤더 공통 — 찾기: .yt-slider-header:active */
.youtube-slider-wrap .yt-slider-header,
.yt-products-header {
    padding: 14px 16px;         /* 안쪽 여백 */
    background: #fff;
    border: 1px solid #e8e0d5;  /* 테두리 색상 */
    border-radius: 10px;        /* 모서리 둥글기 */
    min-height: 48px;
}

/* 제목 텍스트 */
.yt-slider-title,
.yt-products-title {
    font-size: 15px;
    font-weight: 600;
    color: #2c3e30;             /* 텍스트 색상 */
}

/* ▶ 아이콘 */
.yt-slider-toggle-icon,
.yt-toggle-icon {
    font-size: 13px;
    color: #7d9675;             /* 아이콘 색상 */
}
```

---

### 4-8. 인기 재료 상품 카드 (인기 재료 패널 안)

```css
/* 찾기: .yt-products-header */

/* 상품 카드 */
.yt-product-card {
    background: #fff;
    border: 1px solid #eee;
    border-radius: 12px;        /* 모서리 */
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}

/* 상품 이름 */
.yt-product-name {
    font-size: 12px;
    font-weight: 600;
    color: #2c3e30;
}

/* 상품 가격 */
.yt-product-price {
    font-size: 14px;
    font-weight: 700;
    color: #5a7050;             /* 가격 색상 */
}
```

---

## 5. PC / 모바일 분기 처리 방법

CSS 파일에서 반응형은 아래 구조로 나뉩니다:

```css
/* ① 공통 (모바일 기준) — @media 없이 작성 */
.youtube-section-v3 { ... }

/* ② 모바일 전용 — 아래 블록 안 */
@media (max-width: 767px) {
    .yt-slider-header { ... }
}

/* ③ PC(태블릿 포함) — 아래 블록 안 */
@media (min-width: 768px) {
    .youtube-slider-wrap .swiper-button-prev { ... }  /* PC 버튼 */
    .youtube-section-v3 { padding: 70px 0; }          /* PC 여백 */
}
```

**PC에서만 보이게 하려면** → `@media (min-width: 768px)` 블록 안에 작성
**모바일에서만 보이게 하려면** → `@media (max-width: 767px)` 블록 안에 작성

---

## 6. 수정 후 반영 방법

1. `css.css` 파일 수정
2. 메이크샵 관리자 → 디자인 관리 → 스킨 편집 → 해당 페이지 선택
3. **CSS 탭**에 전체 내용 붙여넣기 → 저장

> ⚠️ **저장 시 주의**: 메이크샵 편집기는 `${변수명}` 형태의 텍스트를 서버 코드로 오인합니다.
> CSS 안에 달러+중괄호 패턴이 있으면 "수정 실패" 오류가 납니다. (현재 코드에는 없음)

---

## 7. 건드리면 안 되는 것

| 항목 | 이유 |
|------|------|
| `Index.html` | 서버 치환 태그가 있어 수정 시 페이지 전체 깨짐 |
| `js.js` | 자동화 로직 포함. 실수로 수정 시 영상이 안 나올 수 있음 |
| CSS 클래스 이름 변경 | `js.js`가 이 클래스 이름을 직접 참고해서 동작함 |
| `!important` 표시된 규칙 | Swiper 라이브러리와의 충돌 방지용. 제거 시 버튼 방향이 깨짐 |

---

## 8. 주요 색상 변수 (사이트 전체 공통)

css.css 최상단에 `:root {}` 블록으로 정의되어 있습니다.

| 변수 | 값 | 용도 |
|------|----|----|
| `var(--color-primary)` | `#7d9675` | 세이지 그린 (주요 포인트 색) |
| `var(--color-dark)` | `#2c3e30` | 다크 그린 (제목, 강조 텍스트) |
| `var(--color-primary-light)` | `#c8d5c3` | 연한 그린 (보조 테두리) |

변수를 사용하면 나중에 브랜드 색을 한 곳에서 바꿀 때 전체에 자동 반영됩니다.

---

## 9. 빠른 참조표 — 클래스명 → 화면 위치

| CSS 클래스 | 화면에서 위치 |
|-----------|-------------|
| `.youtube-section-v3` | 섹션 전체 배경 영역 |
| `.featured-video-wrap` | 메인 영상 흰 카드 전체 |
| `.featured-video-info` | 메인 영상 제목/날짜 영역 |
| `.featured-video-info h4` | 메인 영상 제목 텍스트 |
| `.featured-video-info .video-meta` | 날짜·조회수 텍스트 |
| `.yt-play-btn` | 메인 영상 위 흰 원형 재생 버튼 |
| `.youtube-slider-wrap` | 슬라이더 전체 카드 래퍼 |
| `.yt-slider-header` | "더 많은 영상" 토글 버튼 줄 |
| `.yt-slider-title` | "더 많은 영상 (20개)" 텍스트 |
| `.yt-slider-toggle-icon` | 토글 오른쪽 ▶ 아이콘 |
| `.youtube-slider .swiper-slide` | 슬라이더 영상 카드 |
| `.youtube-slider .slide-info h6` | 슬라이더 카드 제목 |
| `.youtube-slider .slide-date` | 슬라이더 카드 날짜 |
| `.youtube-slider .slide-views` | 슬라이더 카드 조회수 |
| `.yt-slide-active` | 현재 재생 중인 카드 (강조 테두리) |
| `.yt-now-playing span` | "재생 중" 녹색 배지 |
| `.swiper-pagination-bullet` | 슬라이더 하단 점 (비활성) |
| `.swiper-pagination-bullet-active` | 슬라이더 하단 점 (현재) |
| `.swiper-button-prev/next` | PC 이전/다음 원형 버튼 |
| `.yt-products-header` | "인기 재료" 토글 버튼 줄 |
| `.yt-products-title` | "인기 재료" 텍스트 |
| `.yt-product-card` | 인기 재료 상품 카드 |
| `.yt-product-name` | 상품 이름 텍스트 |
| `.yt-product-price` | 상품 가격 텍스트 |
