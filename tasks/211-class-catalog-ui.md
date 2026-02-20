# Task 211: 클래스 목록 페이지 UI + 필터/검색

> **상태**: 코드 완료 (배포/테스트 대기)
> **규모**: L
> **예상 기간**: 3~5일
> **의존성**: Task 201 (GAS API 완성), Task 202 (클래스 상품 체계)
> **우선순위**: Phase 2-B 최우선

## 목표

파트너 클래스 플랫폼의 첫 번째 프론트엔드 페이지: 클래스 목록 페이지를 개발한다.
GAS `getClasses` API와 연동하여 카드형 클래스 목록, 다중 필터, 정렬, 스켈레톤 UI를 구현한다.

## 대상 파일 (신규 생성)

- `파트너클래스/목록/Index.html`
- `파트너클래스/목록/css.css`
- `파트너클래스/목록/js.js`

## GAS API 스펙

### GET: getClasses

```
URL: {GAS_ENDPOINT}?action=getClasses
파라미터:
  - category: 카테고리 필터 (string)
  - level: 난이도 필터 (string: '입문'|'중급'|'심화')
  - type: 형태 필터 (string: '원데이'|'정기'|'온라인')
  - region: 지역 필터 (string)
  - sort: 정렬 (string: 'latest'|'popular'|'rating'|'price_asc'|'price_desc')
  - page: 페이지 (int, default:1)
  - limit: 페이지당 개수 (int, default:20, max:50)
  - force: 캐시 무시 ('1')

응답:
  {
    success: true,
    data: [
      {
        class_id: "CLS001",
        makeshop_product_id: "branduid",
        class_name: "봄꽃 압화 원데이 클래스",
        category: "압화",
        level: "입문",
        price: 65000,
        duration_min: 120,
        max_students: 8,
        thumbnail_url: "https://...",
        location: "서울 마포구",
        tags: "봄꽃,원데이,압화",
        class_count: 24,
        avg_rating: 4.8,
        partner_name: "꽃담 공방",
        partner_code: "PTR001"
      }, ...
    ],
    pagination: {
      page: 1,
      limit: 20,
      totalCount: 42,
      totalPages: 3
    }
  }
```

### GET: getCategories

```
URL: {GAS_ENDPOINT}?action=getCategories
응답: { success: true, data: ["압화", "보존화", "캔들", "리스", ...] }
```

## 기술 제약 (메이크샵 D4)

- **IIFE 패턴 필수**: 전역 변수 오염 방지
- **CSS 스코핑**: `.class-catalog` 컨테이너로 모든 스타일 스코핑
- **템플릿 리터럴 이스케이프**: JS 내 `\${var}` 형식 사용 (메이크샵 치환코드 오인 방지)
- **No Build Tools**: Vanilla JS만 사용, CDN 라이브러리만 허용
- **반응형**: 768px / 992px / 1200px 브레이크포인트
- **var 사용**: let/const 금지 (메이크샵 편집기 저장 오류 방지)
- **가상태그 보존**: `<!--/태그명/-->` 형식 절대 수정 금지

## 구현 사항

### 1. 레이아웃 구조
- 상단: 페이지 헤더 (제목 + 결과 수)
- 왼쪽(데스크탑): 필터 패널 (사이드바)
- 오른쪽: 정렬 바 + 카드 그리드 + 페이지네이션
- 모바일: 상단 필터 토글 버튼 + 필터 드로어

### 2. 클래스 카드 (card-class)
- 썸네일 이미지 (16:9 비율, lazy loading)
- 카테고리 배지 (좌상단)
- 클래스 유형 배지 (원데이/정기/온라인)
- 강의명
- 강사/공방명
- 별점 (★ 아이콘 + 숫자, 수강 횟수)
- 가격 (원화 형식)
- 지역 (아이콘 + 텍스트)
- 난이도 (아이콘 + 텍스트)
- "예약하기" 버튼 → 클래스 상세 페이지 링크

### 3. 필터 UI
- **지역 필터**: 체크박스 (전국 / 서울 / 경기 / 인천 / 부산 / 기타 지역)
- **카테고리 필터**: 체크박스 (GAS getCategories로 동적 로드)
- **난이도 필터**: 체크박스 (입문 / 중급 / 심화)
- **형태 필터**: 체크박스 (원데이 / 정기 / 온라인)
- **가격대 필터**: range slider (0 ~ 200,000원, 10,000원 단위)
- **필터 초기화** 버튼

### 4. 정렬
- 셀렉트 박스: 최신순(latest) / 인기순(popular) / 평점순(rating) / 낮은 가격순(price_asc) / 높은 가격순(price_desc)

### 5. 캐싱 전략 (Task 152 설계 기반)
- GAS 5분 서버 캐시 (자동)
- localStorage 1시간 클라이언트 캐시
- 캐시 키: `classCatalog_[필터조합]_[타임스탬프 1h 단위]`
- 필터 변경 시 캐시 무시하고 새 요청

### 6. 로딩 스켈레톤 UI
- 카드 6개 스켈레톤 (shimmer 애니메이션)
- 필터 패널 스켈레톤

### 7. 에러 처리
- GAS 응답 실패: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요." 안내 + 재시도 버튼
- 결과 없음: "조건에 맞는 클래스가 없습니다." + 필터 초기화 버튼

### 8. 페이지네이션
- 이전/다음 버튼 + 페이지 번호 (5개 기준)

### 9. SEO
- `<title>`, `<meta description>` 적용
- ItemList Schema.org 마크업 (GAS 데이터 기반 동적 생성)

## 구현 단계

- [x] 1단계: makeshop-ui-ux-expert로 UI/UX 설계 + HTML/CSS 마크업 개발
  - 레이아웃 구조 + 스켈레톤 UI + 카드 컴포넌트 + 필터 패널
  - brand-planning-expert 협업: 카피라이팅 (페이지 제목, CTA 텍스트)
- [x] 2단계: JS 로직 개발 (IIFE, GAS 연동, 캐싱, 필터/정렬)
- [x] 3단계: SEO 메타 + Schema.org 적용 (HTML에 통합)
- [x] 4단계: makeshop-code-reviewer 코드 검수 (Critical 2건 수정 완료)
- [ ] 5단계: ROADMAP.md + Task 파일 업데이트 + git push

## 테스트 체크리스트

- [ ] 클래스 목록 GAS API 호출 → 카드 렌더링 정상 동작
- [ ] 각 필터(지역/카테고리/난이도/형태/가격대) 단독 + 복합 필터 동작
- [ ] 정렬 변경 시 목록 재정렬 정상 동작
- [ ] localStorage 캐싱 (1시간 이후 자동 갱신) 동작 확인
- [ ] 로딩 스켈레톤 → 데이터 로드 후 카드 전환 확인
- [ ] GAS 오류 시 에러 메시지 + 재시도 버튼 표시 확인
- [ ] 모바일 필터 드로어 토글 정상 동작
- [ ] PC(1200px+) / 태블릿(992px) / 모바일(768px-) 반응형 확인
- [ ] 카드 "예약하기" 클릭 → 상세 페이지 링크 이동 확인
- [ ] 페이지네이션 이전/다음 + 번호 클릭 정상 동작

## 수락 기준

- [ ] `파트너클래스/목록/` 에 3개 파일 생성 (Index.html, css.css, js.js)
- [ ] IIFE 패턴 적용 (전역 변수 없음)
- [ ] `.class-catalog` CSS 스코핑 (외부 스타일 영향 없음)
- [ ] GAS getClasses API 연동 + localStorage 1h 캐싱 동작
- [ ] 스켈레톤 UI + 에러 안내 구현
- [ ] 768px / 992px / 1200px 반응형 동작
- [ ] 코드 리뷰 통과 (makeshop-code-reviewer)

## 에이전트 투입

- **주도**: makeshop-ui-ux-expert (UI 설계, HTML/CSS/JS 구현)
- **협업**: brand-planning-expert (카피라이팅, 브랜드 톤)
- **협업**: seo-performance-expert (SEO 메타, Schema.org)

## 변경 사항 요약

- 2026-02-21: Task 211 파일 생성, 진행 시작
- 2026-02-21: Task 211 코드 구현 완료 (makeshop-ui-ux-expert)
  - `파트너클래스/목록/Index.html` 생성 (SEO 메타, ARIA 접근성, 필터 패널 5종, 스켈레톤 UI)
  - `파트너클래스/목록/css.css` 생성 (CSS 변수 체계, 카드 디자인, 4단계 반응형, shimmer 애니메이션)
  - `파트너클래스/목록/js.js` 생성 (IIFE, GAS 연동, localStorage 1h 캐싱, 필터 디바운스, URL 딥링크, Schema.org)
  - makeshop-code-reviewer 코드 검수: Critical 2건 수정 (SVG id 중복, querySelector 인젝션)
