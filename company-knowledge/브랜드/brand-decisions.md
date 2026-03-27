# PRESSCO21 브랜드 결정 기준점

> 이 문서는 팀 회의에서 확정된 브랜드 에셋 결정사항을 기록하는 **리빙 도큐먼트**.
> 새 페이지 개발 시 이 문서를 기준으로 일관성을 유지한다.
> 미확정 항목은 `[TBD]`로 표시 — 팀 회의 후 업데이트.

---

## 업데이트 기록

| 날짜 | 변경 내용 | 확정자 |
|------|----------|--------|
| 2026-03-17 | 초기 문서 작성 (스킨 분석 기반) | 스킨 감사 |
| 2026-03-19 | 1차 질문지 답변 반영 (디자인기획+영상기획) | 1차 질문지 |
| 2026-03-20 | **통합 회의 결과 반영 — 메인 컬러/키워드/에센스/팔레트 확정** | 팀 회의 |

---

## 0. 브랜드 아이덴티티 (확정 ✅ 2026-03-20)

### 브랜드 키워드
**진심 · 전문 · 즐거운**

### 브랜드 에센스 (내부 기준, 외부 직접 노출 X)
> "꽃과 함께한 30년의 깊이를, 누구나 쉽게 닿을 수 있도록"

### 브랜드 포지셔닝
- **전문 공예 회사**이지만 **누구나 쉽게 꽃 공예를 할 수 있게끔 친절히 알려주는 회사**
- 창업자 이진선 원장의 41년 경력(1985~)과 한국 꽃 공예 역사를 함께한 장인의 브랜드
- 은은하게 드러나는 전문성 — 직접적 주장("업계 최고") 대신 콘텐츠/퀄리티로 자연스럽게 증명

### 브랜드 톤 가이드

| 요소 | 방향 |
|------|------|
| 컬러 | `#425b51` 포레스트 그린 — 세월의 깊이감, 자연 |
| 폰트 | Noto Serif KR 세리프 — 격조, 전통의 은은함 |
| 골드 보조색 | 장인의 품격이 자연스럽게 묻어남 |
| 사진 톤 | 손으로 만드는 과정, 자연광, 꾸미지 않은 실물 |
| 카피 톤 | "~해보세요"(권유), "~하면 됩니다"(안내) — 가르치되 겸손하게 |
| "30년" | 소개 페이지/푸터에 한 줄 정도만, 반복하지 않음 |
| **안 하는 것** | "업계 최고", "국내 유일" 등 직접적 주장 |

---

## 1. 색상 팔레트 (확정 ✅ 2026-03-20)

### 1-1. 그린 패밀리 (메인 `#425b51` 기반)

```css
/* 2026-03-20 팀 회의 확정 — 푸터 그린을 메인으로 채택 */
--color-green-50:  #f2f5f4;  /* 섹션 배경, 카드 배경 */
--color-green-100: #e1e9e6;  /* 호버 배경, 태그 배경 */
--color-green-200: #c3d4cc;  /* 비활성 보더, 구분선 */
--color-green-300: #97b3a7;  /* 보조 텍스트, 아이콘 */
--color-green-400: #668f7e;  /* 링크, 버튼 호버 */
--color-green-500: #425b51;  /* ★ 메인 — 헤더, 푸터, 네비, 로고 배경 */
--color-green-600: #354a42;  /* 버튼 클릭 상태 */
--color-green-700: #2a3c34;  /* 제목 텍스트, 다크 영역 */
--color-green-800: #1f2d27;  /* 푸터 텍스트 */
```

### 1-2. 보조색 (확정 ✅)

```css
/* 보조색 체계 — 그린 브랜드 리서치 기반 */
--color-gold:      #d4a373;  /* CTA 버튼, 배지, 가격 강조, "구매하기" */
--color-brown:     #5a3b2e;  /* 설명 텍스트, 소제목 */
--color-bg:        #fdfbf7;  /* 메인 배경 (순백 대신 따뜻한 크림) */
--color-text:      #4a4a4a;  /* 본문 텍스트 */
--color-error:     #dc3545;  /* 품절, 경고 */
```

### 1-3. 기존 대비 변경점

| 항목 | 기존 | 변경 |
|------|------|------|
| 메인 브랜드색 | `#7d9675` (세이지) | **`#425b51` (포레스트)** |
| 헤더 네비 | `#b7c9ad` (밝은 세이지) | **`#425b51`** 또는 green-400 |
| 버튼/CTA | 그린 혼용 | **골드 `#d4a373`** 통일 |
| 다크 배경 | `#2c3e30` | **green-700 `#2a3c34`** |
| 배경 | `#fff` / `#fdfbf7` 혼재 | **`#fdfbf7` 통일** |

### 1-4. 파트너클래스 배지 색상 (확정 ✅)

```css
/* 3색 체계 — green-500 기반으로 재조정 */
.badge-green   { background: #e1e9e6; color: #2a3c34; }  /* 상태: 진행/승인 */
.badge-gold    { background: #f6ead5; color: #745643; }  /* 상태: 대기/완료 */
.badge-neutral { background: #f5f5f5; color: #888; }     /* 상태: 종료/취소 */
```

---

## 2. 타이포그래피 (확정 ✅)

### 2-1. 폰트 체계

| 역할 | 폰트 | 적용 대상 |
|------|------|---------|
| 본문 | `'Pretendard', 'Noto Sans KR', sans-serif` | body, p, span, input |
| 타이틀 | `'Noto Serif KR', serif` | h1~h5 (격조 + 전통의 은은함) |
| 영문 장식 | `'Cormorant Garamond', serif` | 영문 섹션 타이틀, 로고 |
| 시스템 대체 | `--cw-font-sans-serif` | MakeShop 기본 UI |
| 배지/이벤트 한정 | `'Black Han Sans'` | 특수 강조에만 제한 사용 |

### 2-2. CDN 로드 방법

```html
<!-- Pretendard — 공통 CSS에 이미 포함 (@font-face, 9 weight) -->
<!-- 추가 로드 불필요 -->

<!-- Noto Serif KR — 개별 페이지에서 직접 로드 -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;600;700&display=swap" rel="stylesheet">

<!-- Cormorant Garamond — 영문 장식이 필요한 페이지에서만 로드 -->
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&display=swap" rel="stylesheet">
```

### 2-3. 타입 스케일

```css
/* 섹션 타이틀 — green-700 기반 */
.section-title        { font: 500 32px/1.3 'Noto Serif KR'; color: #2a3c34; }
.page-header-title    { font: 600 28px/1.3 'Noto Serif KR'; color: #2a3c34; }
.card-title           { font: 600 16px/1.5 'Pretendard'; }
.body-text            { font: 400 15px/1.7 'Pretendard'; color: #4a4a4a; }
.caption              { font: 400 13px/1.5 'Pretendard'; color: #888; }
```

### 2-4. 타입 스케일 (확정 ✅)

- `h1` 모바일: **24px**
- 섹션 타이틀 영문 부제목: 메인 페이지만 사용
- 게시판/폼 내 글꼴: 본문 15px 기준

---

## 3. 레이아웃 & 간격

### 3-1. 컨테이너 (확정 ✅)

```css
--spacing-container: 1400px;    /* 최대 폭 */
--spacing-section: 70px;        /* 섹션 상하 패딩 (일부 90px) */
```

### 3-2. 브레이크포인트 (확정 ✅)

| 이름 | 값 | 설명 |
|------|------|------|
| 모바일 | `max-width: 767px` | 단일 컬럼, 터치 UI |
| 태블릿 | `768px ~ 991px` | 2컬럼 전환 |
| 소형 데스크탑 | `992px ~ 1199px` | 3컬럼 가능 |
| 데스크탑 | `1200px+` | 풀 레이아웃 |

### 3-3. 간격 시스템 (확정 ✅)

- 카드 내부 패딩: **16px**
- 섹션 타이틀 ~ 콘텐츠 간격: **48px** (section-header margin-bottom)
- 그리드 gutter: **16px** 기본 (모바일 12px, 데스크탑 24px)

---

## 4. 컴포넌트 기준

### 4-1. 버튼 (확정 ✅ 2026-03-20)

```css
/* Primary CTA — 골드 (행동 유도) */
.btn-primary {
    background: #d4a373;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 12px 24px;
    font: 500 15px 'Pretendard';
    cursor: pointer;
    transition: background 0.2s;
}
.btn-primary:hover { background: #b8865a; }

/* Secondary — 그린 아웃라인 */
.btn-secondary {
    background: #fff;
    color: #425b51;
    border: 1.5px solid #425b51;
    border-radius: 4px;
    padding: 11px 24px;
}

/* Dark — 진한 그린 배경 */
.btn-dark {
    background: #425b51;
    color: #fff;
    border-radius: 4px;
    padding: 14px 32px;
    font: 600 16px 'Pretendard';
}
.btn-dark:hover { background: #354a42; }
```

**[TBD]**: 버튼 크기 3종 (sm/md/lg) 공식 스펙

### 4-2. 카드 (확정 ✅)

- 카드 모서리: **8px** (메인 기본) / 파트너클래스 10px 허용
- 카테고리별 레이아웃: **동일** (모음전/단일 상품 구분만)
- 카드 그림자 3단계:
  - 기본: `0 1px 3px rgba(0,0,0,0.06)`
  - 호버: `0 4px 16px rgba(0,0,0,0.08)`
  - 강조: `0 8px 24px rgba(0,0,0,0.12)`
- hover: `translateY(-4px)` + shadow 확대
- 이미지 비율: `aspect-ratio: 1` (정사각형 기본)

### 4-3. 폼/인풋 (확정 ✅)

- 인풋 높이: **44px**
- placeholder 색상: `#aaa`
- 포커스 ring: green-400 `#668f7e`
- 에러 상태: `#dc3545` (MakeShop 기본 유지)

### 4-4. 섹션 타이틀 패턴 (확정 ✅)

```html
<div class="section-header">
    <span class="section-sub">PRESSCO21</span>
    <h2 class="section-title">섹션 제목</h2>
</div>
```

```css
.section-header { text-align: center; margin-bottom: 48px; }
.section-sub { font: 400 13px 'Cormorant Garamond'; color: #97b3a7; letter-spacing: 2px; text-transform: uppercase; }
.section-title { font: 500 32px/1.3 'Noto Serif KR'; color: #2a3c34; margin-top: 8px; }
```

---

## 5. 이미지 & 비주얼 톤앤매너

### 5-1. 이미지 톤 (확정 ✅ 2026-03-20)

- 자연광 위주, 따뜻한 아이보리/베이지 배경
- 손으로 만드는 과정, 꾸미지 않은 실물 — "진짜를 아는 사람"의 여유
- SNS/쇼핑몰 이미지 톤 통일 (디자이너 합의)
- 상세페이지 상단에 로고 삽입 (디자이너 계획)
- 상품 사진: 보정 필요한 경우 많음 + 사진 부족 → 컨셉샷 촬영 필요

### 5-2. 아이콘 체계 (확정 ✅)

- 아이콘 통일 (이모지 사용 금지 — 홈페이지에서 깨질 수 있음)
- 꽃 모티프: 로고/심볼에는 미사용, 메뉴바/상품명 아이콘으로는 검토 가능

### 5-3. [TBD] 확정 필요

- [ ] AI 생성 일러스트 스타일 가이드
- [ ] 클래스 썸네일 권장 크기/비율
- [ ] 배너 이미지 PC/MO 권장 사이즈

---

## 6. 모션 & 인터랙션 (부분 확정)

```css
transition: background 0.3s ease;               /* 헤더 스크롤 */
transition: background 0.2s ease, transform 0.2s ease; /* 버튼 호버 */
transition: transform 0.3s ease, box-shadow 0.3s ease; /* 카드 호버 */
```

- 페이지 애니메이션: 디자이너 사용 동의, 성능 문제 없으면 적용 가능

### [TBD]
- [ ] 페이지 진입 애니메이션 (fade-in / slide-up)
- [ ] 스크롤 연동 인터랙션 범위
- [ ] 모바일 터치 피드백 기준

---

## 7. 로고 (진행 중)

- 현재: 이탤릭 텍스트 로고 → 가독성 문제
- 방향: **영문 위주**, 꽃 모티프 미포함
- **디자이너 시안 제출 → 대표 승인 시 변경, 아니면 현행 유지**
- 즉시 필요 에셋: SVG, PNG @1x @2x @3x, 파비콘, OG이미지

---

## 8. 비즈니스 컨텍스트

> 상세 내용은 [references/business-context.md](business-context.md) 참조.
> 고객 프로파일, 시즌 캘린더, 경쟁우위, 상세페이지 기획 가이드, 기능 우선순위 포함.

---

## 9. 신규 페이지 개발 체크리스트 (2026-03-20 갱신)

```
□ CSS 변수 --color-green-* 그린 패밀리 사용
□ CTA 버튼: 골드 #d4a373 (행동 유도)
□ 구조 요소: 그린 #425b51 (헤더/푸터/네비)
□ 배경: #fdfbf7 크림 (순백 X)
□ 폰트: body=Pretendard, h1~h5=Noto Serif KR
□ 배지: 3색 체계 (green/gold/neutral)
□ 섹션 타이틀: section-sub + section-title 패턴
□ 제목 색상: green-700 #2a3c34
□ 브레이크포인트: 767px/991px/1199px
□ 컨테이너: max-width 1400px
□ 아이콘: 통일 (이모지 금지)
□ 톤: 진심 · 전문 · 즐거운
```
