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
├── v4-카테고리/            # v4 - 카테고리 자동매칭 (개발 완료, 미배포)
│   ├── youtube-proxy-v3.gs # GAS 백엔드 (517줄) - Data API + Sheets 통합
│   ├── js.js               # 프론트엔드 JS (642줄) - IIFE, 자동매칭
│   ├── css.css             # 스타일시트 (780줄) - 스코핑, 반응형
│   └── Index.html          # HTML 마크업 (37줄)
└── 신규-hybrid-미배포/      # 하이브리드 버전 - 미배포 (v4의 이전 프로토타입)
    ├── youtube-section.html
    ├── product-mapping.json
    ├── youtube-proxy-v2.gs
    └── ...
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
  -> localStorage 캐시 확인 (24h)
  -> 캐시 만료 시 GAS AJAX 호출 (?count=5)
  -> renderYouTube(items) 호출

renderYouTube(videos)
  -> videos[0]: featured 영상 (iframe 임베드)
  -> videos[1~4]: Swiper 슬라이더 썸네일
  -> Swiper 초기화 (모바일 1.1개, PC 4개)

playVideo(videoId)         // 전역 함수
  -> featured 영역 iframe 교체 + autoplay
  -> 섹션으로 스크롤

toggleProducts()           // 전역 함수 (모바일)
  -> 관련 상품 영역 토글 (collapsed/expanded)
```

### CSS 클래스
```
.youtube-section-v3         섹션 컨테이너
.featured-video-wrap        메인 영상 영역
.related-products-wrap      관련 상품 영역
.youtube-slider-wrap        더 많은 영상 슬라이더
.youtube-slider             Swiper 컨테이너
```

---

## v4 카테고리 자동매칭 (개발 완료, 미배포)

### v3 -> v4 주요 변경사항

| 항목 | v3 (현재) | v4 (신규) |
|------|----------|----------|
| CSS 컨테이너 | `.youtube-section-v3` | `.youtube-v4-section` + `ytv4-` 접두사 |
| 캐시 키 | `yt_cache_v3` | `yt_v4_data` / `yt_v4_time` |
| 관련 상품 | 수동 하드코딩 | 영상 키워드 기반 자동매칭 |
| GAS 백엔드 | RSS 기반 | YouTube Data API v3 + Google Sheets |
| 상품 데이터 | HTML에 직접 입력 | Sheets에서 동적 로드 |
| 영상 메타데이터 | id, title, publishedAt | + tags, viewCount, description |
| 카테고리 | 없음 | 자동 감지 + 배지 표시 |
| 조회수 | 없음 | K/만 단위 포맷팅 |
| NEW 배지 | 없음 | 3일 이내 영상 표시 |
| 스켈레톤 UI | 없음 | shimmer 로딩 |
| XSS 방어 | 없음 | escapeHTML/escapeAttr |

### GAS v3 백엔드 (youtube-proxy-v3.gs)

```
YouTube Data API v3 -> 채널 영상 목록 (tags, viewCount 포함)
Google Sheets -> 키워드-카테고리 매핑 + 카테고리-상품 매핑
CacheService -> 5분 캐싱
RSS 폴백 -> API 실패 시 기본 데이터 제공
```

### Google Sheets 구조

**시트1: 카테고리키워드**
| A: 키워드 | B: 카테고리 |
|-----------|-----------|
| 압화 | 압화 |
| pressed | 압화 |
| 보존화 | 보존화 |

**시트2: 카테고리상품**
| A: 카테고리 | B: branduid | C: 상품명 | D: 가격 | E: 이미지URL |
|-----------|-----------|---------|-------|------------|
| 압화 | 1001 | 압화 스타터 키트 | 35000 | https://... |
| default | 2001 | 베스트셀러 1 | 28000 | https://... |

### 배포 절차

1. GAS 프로젝트 생성 -> `youtube-proxy-v3.gs` 코드 붙여넣기
2. 스크립트 속성 설정: `YOUTUBE_API_KEY`, `SPREADSHEET_ID`
3. 웹 앱 배포: "모든 사용자" 접근 허용
4. `js.js`의 `CONFIG.gasUrl`을 배포 URL로 교체
5. 메이크샵 CSS 탭에 `css.css`, JS 탭에 `js.js`, HTML 탭에 `Index.html` 삽입
6. 캐시 초기화 필요 시: `window.clearYouTubeV4Cache()`

### CSS 클래스 (v4)
```
.youtube-v4-section         섹션 컨테이너
.ytv4-main-area             메인 영상 + 관련 상품 영역
.ytv4-featured-wrap         메인 영상 래퍼
.ytv4-products-wrap         관련 상품 영역
.ytv4-slider-section        하단 슬라이더 섹션
.ytv4-slide                 슬라이더 카드
.ytv4-badge-new             NEW 배지
.ytv4-badge-category        카테고리 배지
.ytv4-skeleton              스켈레톤 로딩 UI
```

---

## YouTube 채널 정보
- 채널 ID: `UCOt_7gyvjqHBw304hU4-FUw`

## 주의사항
- 메인페이지 HTML 탭에 인라인으로 삽입된 코드와 `분리/` 폴더 코드는 동일 내용
- 수정 작업은 `분리/` 파일에서 하고, 완료 후 `fullcode.html`을 재생성하여 배포
- GAS URL은 Google Apps Script 웹 앱 배포 URL이므로, GAS 코드 수정 시 새로 배포하면 URL이 변경될 수 있음
- v4 배포 시 v3 코드를 완전히 교체 (CSS 클래스가 다름)
