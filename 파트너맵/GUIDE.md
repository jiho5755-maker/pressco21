# 파트너맵 가이드

> 전국 파트너 매장 지도 검색 시스템
> 편집 위치: 관리자 > 개별 페이지

## 파일 구성

| 파일 | 용도 | 크기 |
|------|------|------|
| `Index.html` | HTML 마크업 | 12KB (226줄) |
| `css.css` | CSS 스타일 | 52KB (1,959줄) |
| `js.js` | 핵심 JS (가장 큰 파일) | 132KB (3,807줄) |
| `Code-final.gs` | GAS 서버 코드 | 7.9KB |
| `NAVER_API_SECURITY.md` | API 보안 가이드 | 3.4KB |

## 외부 API

### 네이버 지도 API
```
ncpKeyId: 'bfp8odep5r'
SDK: https://oapi.map.naver.com/openapi/v3/maps.js
용도: 지도 렌더링, 마커, 클러스터링, 지오코딩
```

### Google Apps Script (데이터 소스)
```
URL: https://script.google.com/macros/s/AKfycbzmXFfzQ_Snr8nHsXmXdkrCy-ZSkXQOuZ3FBRfpXSv7aWHXpDCROkcJPssloHJtcKurLA/exec
데이터: Google Sheets (파트너 정보 DB)
응답: JSON 형태의 파트너 목록
```

## JS 주요 기능

### 검색 시스템
- **Fuse.js 퍼지 검색** (가중치: name 0.4, address 0.3, category 0.2, description 0.1)
- 자동완성 드롭다운
- GPS 기반 현위치 검색 (반경 5km)
- 주소 검색

### 지도
- 네이버 맵 클러스터링
- 마커 관리 (카테고리별 아이콘)
- 줌 레벨 제어 (클러스터 줌: 12, 최소 마커 줌: 8)
- 지도/리스트 토글

### 필터 시스템
- 카테고리 필터
- 지역 필터
- 협회 필터
- 파트너 유형 필터
- 즐겨찾기 필터

### 즐겨찾기
- localStorage 키: `fresco21_favorites_v3`

### 캐싱
- 24시간 TTL
- 캐시 버전: `3.0`

### 정렬
- 이름순 / 거리순 / 최신순

## HTML 구조

```
#partnermap-container
├── .hero-section          히어로 배너
├── .search-filter-section 검색/필터
│   ├── .search-box        검색 입력
│   ├── .filter-tabs       필터 탭
│   └── .active-filters    활성 필터 뱃지
├── .map-content
│   ├── #naver-map         네이버 지도
│   └── .partner-sidebar   파트너 목록
└── .map-controls          지도 컨트롤 버튼
```

### CSS 레이아웃
- **PC**: 2컬럼 (지도 + 사이드바)
- **모바일**: 스택 (지도 → 리스트)
- 컨테이너: `#partnermap-container`

## GAS (Code-final.gs)

### 함수
- `onEdit()` - Google Sheets 수정 시 자동 처리
- `doGet()` - 웹 앱으로 JSON 데이터 제공

### 진화 과정
```
Code.gs (초기) → Code-v2.gs (디버그 로그 추가) → Code-final.gs (프로덕션)
```

## 주의사항
- 네이버 맵 API 키는 허용 도메인 설정 필요 (네이버 클라우드 콘솔)
- Google Sheets가 데이터 소스이므로, 파트너 정보 수정은 시트에서 직접
- js.js가 132KB로 매우 크므로 수정 시 주의 (IIFE 패턴, 전체 구조 이해 필요)
- `NAVER_API_SECURITY.md` 참조하여 API 키 노출 범위 관리
