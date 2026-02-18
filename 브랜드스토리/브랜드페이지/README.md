# 프레스코21 브랜드 헤리티지 페이지

> 30년 압화·투명표본 연구의 여정을 담은 브랜드 스토리 페이지

---

## 개요

프레스코21의 브랜드 철학, 역사, 혁신 기술, 교육 활동을 소개하는 원페이지 브랜드 헤리티지 사이트입니다.

---

## 파일 구조

```
브랜드페이지/
├── index.html          # 메인 페이지 (원페이지)
├── css/
│   ├── common.css      # 공통 스타일
│   └── heritage.css    # 헤리티지 페이지 전용 스타일
├── js/
│   ├── common.js       # 공통 스크립트
│   └── heritage.js     # 인터랙션 로직
├── images/
│   ├── books/          # 저서 이미지
│   ├── gallery/        # 갤러리 이미지
│   ├── hero/           # 히어로 섹션 이미지
│   └── sections/       # 각 섹션 이미지
└── docs/
    └── PHASE2_UX_UI_COMPLETE.md  # 개발 완료 보고서
```

---

## 페이지 섹션 구성

| # | 섹션 | 설명 |
|---|------|------|
| 1 | Hero | 브랜드 대표 비주얼 + 핵심 수치 |
| 2 | Trust Banner | 신뢰 배지 (30년 연구, 특허 기술 등) |
| 3 | Philosophy | 브랜드 철학 |
| 4 | Timeline | 30년 연혁 (인터랙티브) |
| 5 | Achievements | 수상 내역, 방송 출연, 전시 |
| 6 | Innovation | 투명 표본 기술 + 특허 |
| 7 | Education | 교육 프로그램 + 통계 |
| 8 | International | 국제 교류 활동 |
| 9 | Publications | 저서 캐러셀 |
| 10 | Gallery | 작품 갤러리 (필터링) |
| 11 | Legacy | 마무리 + CTA |

---

## 주요 기능

### 인터랙션
- **Scroll Animations**: 타임라인 순차 등장
- **Gallery Filtering**: 카테고리별 필터
- **Timeline Modal**: 클릭 시 상세 정보
- **Mobile Drawer**: 햄버거 메뉴 네비게이션
- **Hero Ken Burns**: 이미지 줌 효과

### 반응형
- Desktop (1200px+)
- Tablet (768px ~ 1199px)
- Mobile (~ 767px)
- Small Mobile (~ 480px)

---

## 사용 방법

### 로컬 테스트
```bash
# 간단한 서버 실행
python3 -m http.server 8000

# 브라우저에서 열기
open http://localhost:8000/브랜드페이지/index.html
```

### 메이크샵 적용
1. `index.html` 내용을 메이크샵 자유게시판에 복사
2. CSS/JS는 외부 호스팅 또는 인라인 삽입
3. 이미지 경로 수정 필요

---

## 기술 스택

- **HTML5**: 시맨틱 마크업
- **CSS3**: Grid, Flexbox, Variables, Animations
- **Vanilla JS**: Intersection Observer, DOM API
- **Slick Carousel**: 저서 슬라이더 (외부 라이브러리)

---

## 브라우저 지원

| 브라우저 | 지원 |
|----------|------|
| Chrome 80+ | ✅ |
| Safari 14+ | ✅ |
| Firefox 75+ | ✅ |
| Edge 80+ | ✅ |
| IE 11 | ❌ |

---

## 관련 문서

- [Phase 2 완료 보고서](./docs/PHASE2_UX_UI_COMPLETE.md)

---

## 연락처

- **브랜드**: 프레스코21
- **쇼핑몰**: [foreverlove.co.kr](https://foreverlove.co.kr)

---

*Last updated: 2024-02-06*
