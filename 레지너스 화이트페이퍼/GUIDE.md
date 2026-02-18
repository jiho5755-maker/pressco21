# 레지너스 화이트페이퍼 가이드

> Resiners Purair 공기청정기 기술 백서 (랜딩 페이지)
> 편집 위치: 관리자 > 개별 페이지

## 파일 구성

| 파일 | 용도 | 크기 |
|------|------|------|
| `index.html` | 전체 HTML | 41KB (574줄) |
| `style.css` | CSS 스타일 | 23KB (955줄) |
| `script.js` | JS (IIFE) | 5.6KB (143줄) |

## 페이지 구성 (섹션 순서)

1. **커버 페이지** - 타이틀 + 브랜드 로고
2. **Executive Summary** - 핵심 요약
3. **목차** (Table of Contents)
4. **산업 현황** - 레진 아트 VOCs 위험성 설명
5. **제품 솔루션** - Resiners Purair 기능 소개 (플로우 다이어그램)
6. **실험 데이터** - SGS 인증 테스트 결과
   - **핵심 수치: 83.59% VOCs 제거율**
   - Resiners Purair vs 일반 공기청정기 vs 미사용 비교
   - Chart.js 그래프 시각화
7. **테스트 환경** - 실험 조건 상세
8. **전문가 추천** - 전문가 추천사
9. **안전 가이드** - 사용 안전 수칙
10. **브랜드 비전** - PRESSCO21 비전
11. **FAQ** - 자주 묻는 질문
12. **부록** - 참고 자료

## 기술 스택

### Chart.js (CDN)
- TVOC 감소 그래프: 3개 데이터셋 비교
  - Resiners Purair (효과 최고)
  - 일반 공기청정기
  - 미사용 (대조군)

### Intersection Observer
- 섹션별 페이드인 효과
- 스크롤 시 자연스러운 등장 애니메이션

### Smooth Scroll
- 목차 앵커 링크 → 해당 섹션으로 부드러운 스크롤

## CSS 스코핑

```css
#resiners-whitepaper .section-name { ... }
```
- 모든 선택자가 `#resiners-whitepaper` 컨테이너로 스코핑됨

## 색상 테마

```css
메인 틸: #8ED8C8
메인 그린: #7d9675
배경: 밝은 그레이 그라데이션
```

## JS 패턴

```javascript
(function() {
    'use strict';
    // Chart.js 초기화
    // Intersection Observer 설정
    // Smooth Scroll 구현
})();
```

## 주의사항
- IIFE 패턴 적용됨
- `\${var}` 이스케이프 적용됨 (메이크샵 저장 호환)
- Chart.js CDN 로드 필요 (HTML에 `<script src="https://cdn.jsdelivr.net/npm/chart.js">` 포함)
- 인쇄 최적화 스타일 포함 (`@media print`)
