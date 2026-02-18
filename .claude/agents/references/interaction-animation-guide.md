# 인터랙션 & 애니메이션 가이드

## 기본 원칙
- **CSS-only 우선**: JavaScript 애니메이션보다 CSS transition/animation을 우선 사용
- **성능 우선 속성**: `transform`과 `opacity`만 애니메이션 (layout/paint 트리거 방지)
- **자연스러운 이징**: `ease-out` 또는 `cubic-bezier(0.25, 0.46, 0.45, 0.94)` 사용
- **적절한 지속 시간**: hover 200~300ms, 진입 애니메이션 400~600ms, 페이지 전환 300ms

## 스크롤 애니메이션 패턴
```css
/* 기본 fade-up 진입 */
.scroll-reveal {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}
.scroll-reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}

/* 순차적 등장 (stagger) */
.scroll-reveal:nth-child(2) { transition-delay: 0.1s; }
.scroll-reveal:nth-child(3) { transition-delay: 0.2s; }
.scroll-reveal:nth-child(4) { transition-delay: 0.3s; }
```
- Intersection Observer로 `.is-visible` 클래스 토글 (threshold: 0.15)
- `prefers-reduced-motion: reduce` 미디어 쿼리로 접근성 대응

## Hover 효과 패턴
```css
/* 상품 카드 hover */
.product-card {
  transition: transform 0.25s ease-out, box-shadow 0.25s ease-out;
}
.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.08);
}

/* 이미지 zoom hover */
.product-card img {
  transition: transform 0.4s ease-out;
}
.product-card:hover img {
  transform: scale(1.05);
}

/* 버튼 hover */
.btn-primary {
  transition: background-color 0.2s ease, transform 0.2s ease;
}
.btn-primary:hover {
  transform: translateY(-1px);
}
.btn-primary:active {
  transform: translateY(0);
}
```

## 금지 애니메이션
- `width`, `height`, `top`, `left` 등 레이아웃 트리거 속성 애니메이션 금지
- 3초 이상의 긴 루프 애니메이션 지양 (주의 분산)
- 과도한 parallax 효과 (모바일 성능 저하 유발)
- `animation-iteration-count: infinite` 남용 금지
