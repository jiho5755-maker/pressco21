# 유튜브 자동화 가이드

> 메인페이지 "Learn & Shop" 유튜브 영상 섹션
> Google Apps Script 프록시로 채널 최신 영상 자동 로드

## 폴더 구조

```
유튜브 자동화/
├── 현재-배포/              # v3 - 현재 운영 중
│   ├── fullcode.html       # HTML+CSS+JS 통합본 (메이크샵 HTML탭 직접 붙여넣기)
│   └── 분리/               # 코드 분리 버전 (수정 작업용)
│       ├── Index.html      # HTML만 (55줄)
│       ├── css.css         # CSS만 (277줄)
│       └── js.js           # JS만 (116줄)
└── 신규-hybrid-미배포/      # 하이브리드 버전 - 미배포
    ├── youtube-section.html     # 통합 HTML (215줄)
    ├── product-mapping.json     # 영상-상품 자동 매칭 데이터
    ├── youtube-proxy-v2.gs      # GAS 프록시 v2
    ├── INTEGRATION_INSTRUCTIONS.md  # 마이그레이션 가이드
    ├── PRODUCT_GUIDE.md         # 상품 매칭 가이드
    └── README.md
```

## 현재 배포 버전 (v3)

### 배포 방법
**메인 HTML 탭에 `fullcode.html` 내용을 붙여넣기**
- `fullcode.html`은 `<style>` + HTML + `<script>`가 모두 포함된 단일 파일
- 메인페이지 HTML 탭의 `<!--s: section_youtube-->` ~ `<!--e: section_youtube-->` 위치에 삽입

### GAS 프록시
```
URL: https://script.google.com/macros/s/AKfycbxNQxgd8Ew0oClPSIoSA3vbtbf4LoOyHL6j7J1cXSyI1gmaL3ya6teTwmu883js4zSkwg/exec
파라미터: ?count=5&t={timestamp}
응답: { status: 'success', items: [{ id, title, publishedAt }] }
```

### 캐싱
```
localStorage 키: yt_cache_v3 (영상 데이터), yt_time_v3 (저장 시간)
TTL: 24시간 (24 * 60 * 60 * 1000 ms)
```

### JS 핵심 로직 (IIFE 패턴)
```
loadYouTube()
  → localStorage 캐시 확인 (24h)
  → 캐시 만료 시 GAS AJAX 호출 (?count=5)
  → renderYouTube(items) 호출

renderYouTube(videos)
  → videos[0]: featured 영상 (iframe 임베드)
  → videos[1~4]: Swiper 슬라이더 썸네일
  → Swiper 초기화 (모바일 1.1개, PC 4개)

playVideo(videoId)         // 전역 함수
  → featured 영역 iframe 교체 + autoplay
  → 섹션으로 스크롤

toggleProducts()           // 전역 함수 (모바일)
  → 관련 상품 영역 토글 (collapsed/expanded)
```

### CSS 클래스
```
.youtube-section-v3         섹션 컨테이너
.featured-video-wrap        메인 영상 영역
.related-products-wrap      관련 상품 영역
.youtube-slider-wrap        더 많은 영상 슬라이더
.youtube-slider             Swiper 컨테이너
```

## 신규 하이브리드 버전 (미배포)

### v3과의 차이점

| 항목 | v3 (현재) | 하이브리드 (미배포) |
|------|----------|-------------------|
| CSS 클래스 | `.youtube-section-v3` | `.youtube-hybrid-section` |
| 캐시 키 | `yt_cache_v3` | 다름 |
| 관련 상품 | 수동 하드코딩 (HTML에 직접 입력) | `product-mapping.json`으로 자동 매칭 |
| GAS | RSS 피드 기반 | YouTube Data API v3 |
| 기능 | 기본 영상 표시 | 영상별 관련 상품 자동 연동 |

### 배포 시 참고
- `INTEGRATION_INSTRUCTIONS.md`에 v3→hybrid 마이그레이션 절차 기술됨
- `product-mapping.json` 수정으로 영상-상품 매칭 관리

## YouTube 채널 정보
- 채널 ID: `UCOt_7gyvjqHBw304hU4-FUw`

## 주의사항
- 메인페이지 HTML 탭에 인라인으로 삽입된 코드와 `분리/` 폴더 코드는 동일 내용
- 수정 작업은 `분리/` 파일에서 하고, 완료 후 `fullcode.html`을 재생성하여 배포
- GAS URL은 Google Apps Script 웹 앱 배포 URL이므로, GAS 코드 수정 시 새로 배포하면 URL이 변경될 수 있음
