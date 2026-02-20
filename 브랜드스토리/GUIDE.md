# 브랜드스토리 가이드

> PRESSCO21 브랜드 헤리티지/철학 소개 페이지
> 편집 위치: 관리자 > 개별 페이지
> 리뉴얼: 2026.02 (현대적 럭셔리 브랜드 디자인)

## 파일 구조

```
브랜드스토리/
└── 브랜드페이지/
    ├── index.html              메인 HTML (976줄)
    ├── css/
    │   ├── common.css          공통 스타일 + 폰트 (283줄)
    │   └── heritage.css        헤리티지 전용 스타일 (2,775줄)
    ├── js/
    │   ├── common.js           공통 JS - IIFE 패턴 (133줄)
    │   └── heritage.js         헤리티지 전용 JS - IIFE 패턴 (720줄)
    ├── images/
    │   ├── hero/               히어로 이미지 (1장, PNG)
    │   ├── gallery/            갤러리 이미지 (10장, PNG)
    │   ├── books/              서적 이미지 (4장, PNG)
    │   └── sections/           섹션별 이미지 (2장, PNG)
    ├── docs/
    └── README.md
```

## 페이지 구성

### 주요 섹션 (11개)
1. 히어로 섹션 (대형 비주얼, Ken Burns 효과)
2. Trust Signals 배너 (SVG 아이콘, 주요 성과 4개)
3. 철학 섹션 (인용문 + 스토리 블록 + 핵심 가치 카드)
4. 타임라인 섹션 (1985~2025, 인터랙티브 모달)
5. 성과 섹션 (탭 UI: 수상/협업/특허)
6. 혁신 섹션 (이미지+텍스트 2단 레이아웃)
7. 교육 섹션 (카운트업 애니메이션 + 카드)
8. 국제 교류 섹션 (3개국 카드)
9. 출판 섹션 (Slick 캐러셀)
10. 갤러리 섹션 (필터 + Swiper 라이트박스)
11. 레거시 섹션 (마무리 메시지 + CTA)

### 기술 특징
- **CSS 스코핑**: `#heritage-main`으로 전역 오염 방지
- **IIFE 패턴**: JS 전역 변수 오염 방지
- **Swiper 라이트박스**: 갤러리 이미지 전체화면 뷰어 (스와이프/화살표/ESC)
- **@media print**: B2B 프레젠테이션용 인쇄 스타일
- **prefers-reduced-motion**: 접근성 대응
- **반응형**: 480px / 767px / 991px / 1199px 브레이크포인트
- **이모지 -> SVG**: 메이크샵 인코딩 문제 방지 (trust banner, value cards, education cards)
- **폰트**: Pretendard(본문) + Noto Serif KR(제목)
- **색상**: Primary #7d9675, Dark #2c3e30, BG #fdfbf7

### 외부 라이브러리 (CDN)
- jQuery 3.6.0 (Slick 의존성)
- Slick Carousel 1.8.1 (도서 캐러셀)
- Swiper 11 (갤러리 라이트박스)

## 배포 방식

이 페이지는 **독립적인 개별 페이지**로 운영됩니다:
- 메이크샵 개별 페이지에 `index.html` 전체 코드를 붙여넣기
- CSS/JS/이미지는 메이크샵 FTP나 외부 CDN에 업로드 후 참조
- 또는 인라인으로 HTML에 포함

## 이미지 CDN 마이그레이션

현재 모든 이미지는 로컬 상대 경로(`./images/...`)를 사용합니다.
배포 시 CDN 절대 경로로 변환이 필요합니다.

```
CDN 패턴: //jewoo.img4.kr/2026/homepage/brand/{폴더}/{파일명}

예시:
./images/hero/hero-main.png
  -> //jewoo.img4.kr/2026/homepage/brand/hero/hero-main.png
./images/gallery/gallery-1.png
  -> //jewoo.img4.kr/2026/homepage/brand/gallery/gallery-1.png
```

각 이미지 위치에 `TODO: CDN 마이그레이션` 주석이 표시되어 있습니다.

## WebP 변환 안내

index.html 상단에 WebP 변환 가이드 주석이 포함되어 있습니다.
현재 PNG 총 용량 약 25MB -> WebP 변환 시 약 5MB (80% 절감 예상)

## 주의사항
- `\${variable}` 이스케이프: JS 코드에서 템플릿 리터럴 미사용 (문자열 연결 방식)
- 가상 태그 보존: `{$...}`, `<!-- -->` 절대 수정 금지
- 이모지 사용 금지: SVG 아이콘으로 교체 완료 (trust banner, value cards 등)
- CSS는 `#heritage-main`으로 스코핑, 전역 셀렉터 미사용
