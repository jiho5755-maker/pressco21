# YouTube 영상-제품 자동 연동 시스템

YouTube 채널의 최신 영상을 메인페이지에 자동 표시하고, 영상별 관련 제품을 자동 매칭하는 시스템입니다.

---

## 🏗️ 시스템 아키텍처

**중요: Google Apps Script와 product-mapping.json은 충돌하지 않습니다!**

```
┌─────────────────────────────────────────────────────────────┐
│                    브라우저 (클라이언트)                      │
│                                                             │
│   youtube-section.html의 JavaScript가                       │
│   두 데이터를 받아서 조합합니다                               │
│                                                             │
│   ┌─────────────────┐    ┌─────────────────┐               │
│   │ ① 영상 데이터    │    │ ② 제품 데이터    │               │
│   └────────┬────────┘    └────────┬────────┘               │
└────────────┼──────────────────────┼─────────────────────────┘
             │                      │
             ▼                      ▼
┌────────────────────────┐   ┌────────────────────────┐
│  Google Apps Script    │   │  product-mapping.json  │
│  (이미 배포됨)          │   │  (FTP 업로드)          │
│                        │   │                        │
│  ✅ 유튜브 영상 정보     │   │  ✅ 제품 정보          │
│  - 영상 제목           │   │  - 제품명              │
│  - 썸네일 URL          │   │  - 가격                │
│  - 조회수              │   │  - 이미지 URL          │
│  - 영상 설명           │   │  - 상세페이지 링크      │
│  - 업로드 날짜         │   │                        │
│                        │   │  ❌ 유튜브 관련 없음    │
│  ❌ 제품 정보 없음      │   │                        │
└────────────────────────┘   └────────────────────────┘
         │                              │
         └──────────┬───────────────────┘
                    ▼
           ┌───────────────┐
           │  제품 매칭     │
           │               │
           │ 영상 설명에서  │
           │ [제품코드: XX] │
           │ 파싱 후 연결   │
           └───────────────┘
```

### 역할 분리

| 구성 요소 | 역할 | 수정 필요 여부 |
|----------|------|--------------|
| Google Apps Script | YouTube 영상 정보 가져오기 | ❌ 수정 불필요 (기존 그대로) |
| product-mapping.json | 제품 정보 저장 | ✅ 제품 추가 시 수정 |
| youtube-section.html | 두 데이터 조합 & 화면 표시 | ❌ 수정 불필요 |

**결론**: 기존 YouTube 자동화 Apps Script는 그대로 두고, product-mapping.json만 관리하면 됩니다.

---

## 📁 파일 구조

```
final-deploy/
├── README.md                 # 이 문서
├── youtube-section.html      # 메인페이지에 삽입할 YouTube 섹션 코드
├── product-mapping.json      # 제품 매핑 데이터 (FTP 업로드 필요)
└── PRODUCT_GUIDE.md          # 제품 등록 상세 가이드
```

---

## 🚀 설치 방법

### 1단계: 메인페이지 HTML 수정

메이크샵 관리자 > 디자인 관리 > HTML 편집에서:

1. 기존 YouTube 섹션 찾기:
```html
<!--s: section_youtube-->
...
<!--e: section_youtube-->
```

2. 위 부분을 삭제하고 `youtube-section.html` 내용으로 교체

### 2단계: 제품 매핑 파일 업로드

`product-mapping.json` 파일을 FTP로 업로드:
```
위치: /design/jewoo/youtube-product-integration/product-mapping.json
```

---

## ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| **자동 영상 로드** | YouTube 채널 최신 영상 5개 자동 표시 |
| **NEW 배지** | 3일 이내 영상에 빨간색 NEW 배지 |
| **조회수 표시** | 실시간 조회수 (1.5만 조회 형식) |
| **제품 자동 매칭** | 영상별 관련 제품 자동 연결 |
| **24시간 캐싱** | 빠른 로딩 속도 |
| **반응형** | PC/모바일 최적화 레이아웃 |

### 모바일 특화 기능
- **제품 영역**: 토글로 접기/펼치기
- **더 많은 영상**: 횡스크롤 스와이프

---

## 🔗 제품 연동 방법

### 방법 1: 제품 코드 (권장)

YouTube 영상 업로드 시 **영상 설명**에 제품 코드 추가:

```
[제품코드: P1001]
```

예시:
```
오늘은 압화 에코백 만들기를 해보겠습니다!

재료 구매: 포에버러브
[제품코드: P1001]

#압화 #에코백 #DIY
```

### 방법 2: 키워드 매칭

`product-mapping.json`의 `keywords`에 등록된 키워드가 영상 제목/설명에 포함되면 자동 매칭:

```json
"keywords": {
  "압화 에코백": ["P1001"],
  "레진 키링": ["P1003"]
}
```

---

## 📝 제품 등록 가이드

### product-mapping.json 구조

```json
{
  "products": {
    "제품코드": {
      "name": "제품명",
      "price": "가격 (숫자만)",
      "image": "제품 이미지 URL",
      "link": "제품 상세페이지 링크"
    }
  },
  "keywords": {
    "키워드": ["연결할 제품코드"]
  }
}
```

### 새 제품 추가 예시

```json
{
  "products": {
    "P1001": {
      "name": "압화 스타터 키트",
      "price": "35000",
      "image": "https://jewoo.img4.kr/products/p1001.jpg",
      "link": "/shop/shopdetail.html?branduid=1001"
    },
    "P1002": {
      "name": "새로운 제품",
      "price": "50000",
      "image": "https://jewoo.img4.kr/products/p1002.jpg",
      "link": "/shop/shopdetail.html?branduid=1002"
    }
  },
  "keywords": {
    "압화 에코백": ["P1001"],
    "새로운키워드": ["P1002"]
  }
}
```

---

## 🛠️ 관리 기능

### 캐시 삭제

브라우저 콘솔(F12)에서 실행:
```javascript
clearYouTubeHybridCache()
```

### 매핑 우선순위

1. **제품 코드** `[제품코드: P1001]` - 가장 높은 우선순위
2. **키워드 매칭** - 제품 코드 없을 때 사용
3. **매칭 실패** - "준비 중입니다" 메시지 표시

---

## ⚙️ 설정 변경

`youtube-section.html` 내 CONFIG 객체:

```javascript
var CONFIG = {
  googleScriptUrl: '...', // YouTube API 프록시 URL
  mappingDataUrl: '/design/jewoo/youtube-product-integration/product-mapping.json',
  maxVideos: 5,           // 표시할 영상 개수
  cacheDuration: 24*60*60*1000, // 캐시 시간 (24시간)
  newVideoDays: 3         // NEW 배지 기준 (3일)
};
```

---

## 📱 반응형 레이아웃

### PC (768px 이상)
- 메인 영상 + 제품 사이드바 가로 배치
- 더 많은 영상 4열 그리드

### 모바일 (767px 이하)
- 세로 스택 레이아웃
- 제품 영역 토글 (기본 접힘)
- 더 많은 영상 횡스크롤

---

## 🔧 문제 해결

### 영상이 안 나올 때
1. 브라우저 콘솔에서 `clearYouTubeHybridCache()` 실행
2. 페이지 새로고침

### 제품이 매칭 안 될 때
1. YouTube 영상 설명에 `[제품코드: XXXX]` 형식 확인
2. `product-mapping.json`에 해당 제품코드 등록 확인
3. JSON 문법 오류 확인 (쉼표, 따옴표 등)

### 캐시 문제
- 클라이언트 캐시: 24시간 후 자동 갱신
- 즉시 갱신: `clearYouTubeHybridCache()` 실행

---

## 📊 작동 흐름

```
1. 페이지 로드
   ↓
2. 캐시 확인 (24시간 유효)
   ├─ 캐시 있음 → 즉시 표시
   └─ 캐시 없음 → API 호출
       ↓
3. Google Apps Script 프록시
   ↓
4. YouTube RSS + Data API
   ↓
5. 영상 정보 반환 (제목, 썸네일, 조회수, 설명)
   ↓
6. 제품 매칭 (product-mapping.json)
   ├─ 제품 코드 파싱
   └─ 키워드 매칭
   ↓
7. 화면 렌더링
```

---

## 📞 지원

- 기술 문의: 개발팀
- 버그 리포트: GitHub Issues
