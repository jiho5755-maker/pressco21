# Task 105: SEO 기본 개선

> **상태**: 대기
> **규모**: S
> **예상 기간**: 1~2일
> **의존성**: 없음

## 목표

전체 프로젝트의 SEO를 개선한다. 페이지별 고유 메타태그, Schema.org 구조화 데이터, OG 태그를 적용하여 검색 엔진 노출과 SNS 공유 품질을 높인다.

## 대상 파일

- `메인페이지/Index.html`
- `간편 구매/index.html`
- `브랜드스토리/브랜드페이지/index.html`
- `레지너스 화이트페이퍼/index.html`
- `파트너맵/Index.html`

**제외**: `1초 로그인` (로그인 페이지는 검색 노출 불필요), `유튜브 자동화` (메인 섹션 내 삽입)

## 현재 상태 분석

### 메타태그 현황
| 프로젝트 | `<title>` | `<meta description>` | OG 태그 | Schema.org |
|---------|-----------|---------------------|---------|-----------|
| 메인페이지 | 메이크샵 기본 | 없음 | 없음 | 없음 |
| 간편 구매 | 메이크샵 기본 | 없음 | 없음 | 없음 |
| 브랜드스토리 | 미확인 | 없음 | 없음 | 없음 |
| 화이트페이퍼 | 미확인 | 없음 | 없음 | 없음 |
| 파트너맵 | 미확인 | 없음 | 없음 | 없음 |

**참고**: 메이크샵 D4는 HTML 탭 방식으로 `<head>` 직접 수정이 제한적일 수 있음. 메이크샵 관리자 > 디자인 > 메타태그 설정을 우선 확인해야 함.

## 구현 단계

- [ ] **1단계: 메이크샵 메타태그 설정 확인**
  - 메이크샵 관리자에서 페이지별 `<title>`, `<meta description>` 설정 가능 여부 확인
  - HTML 탭에서 `<head>` 영역 접근 가능 여부 확인
  - 불가 시 대안: JS로 동적 메타태그 삽입 (SEO 효과 제한적이나 SNS 공유에는 유효)

- [ ] **2단계: 페이지별 고유 메타태그 작성**
  - **메인페이지**:
    - title: "PRESSCO21 | 30년 전통 압화 & 보존화 전문 브랜드"
    - description: "프레스코21은 30년 전통의 압화, 보존화 전문 브랜드입니다. 프레스드플라워, 레진공예, DIY 키트, 원데이 클래스까지."
  - **간편 구매 (상품 상세)**:
    - title: "{상품명} | PRESSCO21" (메이크샵 치환코드 활용)
    - description: "{상품명} - {카테고리}. {가격}원. 무료배송, 적립금 혜택."
  - **브랜드스토리**:
    - title: "브랜드 스토리 | PRESSCO21 - 꽃으로 영원을 담다"
    - description: "PRESSCO21의 30년 브랜드 역사와 철학. 압화와 보존화의 아름다움을 전합니다."
  - **레지너스 화이트페이퍼**:
    - title: "Resiners Purair 기술 소개 | PRESSCO21"
    - description: "Resiners Purair 기술 백서. 압화/보존화 전용 레진 솔루션의 과학적 원리와 활용법."
  - **파트너맵**:
    - title: "파트너 지도 | PRESSCO21 제휴 공방 찾기"
    - description: "전국 PRESSCO21 제휴 공방과 체험 업체를 지도에서 찾아보세요. 가까운 압화/보존화 클래스를 검색하세요."

- [ ] **3단계: OG 태그 적용**
  - 각 페이지에 `og:title`, `og:description`, `og:image`, `og:url`, `og:type` 적용
  - **og:image**: 각 페이지 대표 이미지 (최소 1200x630px 권장)
  - **간편 구매**: `og:type="product"`, `product:price:amount`, `product:price:currency="KRW"`
  - Twitter Card 태그도 함께 적용 (`twitter:card`, `twitter:title`, `twitter:image`)

- [ ] **4단계: Schema.org 구조화 데이터**
  - **메인페이지**: `Organization` 스키마
    ```json
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "PRESSCO21",
      "url": "https://foreverlove.co.kr",
      "logo": "로고 이미지 URL"
    }
    ```
  - **간편 구매**: `Product` 스키마 (메이크샵 치환코드 활용)
    ```json
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "{상품명}",
      "image": "{대표이미지}",
      "offers": {
        "@type": "Offer",
        "price": "{판매가}",
        "priceCurrency": "KRW",
        "availability": "https://schema.org/InStock"
      }
    }
    ```
  - **브랜드스토리**: `AboutPage` 스키마
  - **화이트페이퍼**: `Article` 스키마
  - **파트너맵**: `LocalBusiness` + `ItemList` 스키마 (JS로 동적 생성)
  - `BreadcrumbList` 스키마: 카테고리 탐색 경로 (간편 구매)

- [ ] **5단계: 기타 SEO 요소**
  - `<link rel="canonical">` 각 페이지에 추가
  - 이미지 `alt` 텍스트 (Task 104와 연계, 중복 작업 방지)

## 수락 기준

- [ ] 각 페이지에 고유한 `<title>`과 `<meta description>`이 설정되어 있다
- [ ] OG 태그(`og:title`, `og:description`, `og:image`)가 적용되어 있다
- [ ] Schema.org 구조화 데이터가 JSON-LD 형식으로 삽입되어 있다
- [ ] Google 리치 결과 테스트 도구에서 구조화 데이터 오류가 없다
- [ ] 메이크샵 가상 태그가 보존되어 있다
- [ ] 기존 기능에 영향이 없다

## 테스트 체크리스트

- [ ] Google 리치 결과 테스트 (https://search.google.com/test/rich-results)
- [ ] Facebook 공유 디버거 (https://developers.facebook.com/tools/debug/)
- [ ] 카카오톡 공유 미리보기 확인
- [ ] 각 페이지 `<title>` 브라우저 탭에 표시 확인
- [ ] Schema.org 유효성 검증
- [ ] 메이크샵 치환코드 기반 동적 메타태그 정상 렌더링 확인

## 참고

- 메이크샵 D4의 HTML 탭은 `<body>` 내 삽입이므로 `<head>` 메타태그 직접 수정이 불가할 수 있음
- 이 경우 메이크샵 관리자 > 디자인 설정에서 메타태그를 관리하거나, JS로 동적 삽입
- Schema.org JSON-LD는 `<body>` 내 `<script type="application/ld+json">`으로 삽입 가능 (위치 무관)

## 변경 사항 요약

### 메인페이지/Index.html
1. Organization + WebSite Schema.org JSON-LD 추가 (SearchAction 포함)

### 메인페이지/js.js
1. `initSEOMeta()`: description, OG, Twitter Card 메타태그 동적 삽입

### 간편 구매/js.fixed.js
1. `initOGMeta()` 확장: Twitter Card + Product Schema.org JSON-LD 동적 생성
   - 상품명, 이미지, 가격을 DOM에서 추출하여 구조화 데이터 생성

### 브랜드스토리/브랜드페이지/index.html
1. AboutPage Schema.org JSON-LD 추가 (창업자 정보 포함)

### 레지너스 화이트페이퍼/index.html
1. TechArticle Schema.org JSON-LD 추가

### 파트너맵/Index.html
1. WebPage Schema.org JSON-LD 추가

### 미구현 (관리자 작업 필요)
- 메이크샵 관리자 > 디자인 > 메타태그 설정에서 페이지별 `<title>`, `<meta description>` 설정
- `<link rel="canonical">`: 메이크샵 URL 구조 확인 후 관리자에서 설정
- `og:image`로 사용할 1200x630px 대표 이미지 제작 필요
