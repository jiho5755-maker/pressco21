# Task 212: 클래스 상세 페이지 UI + 결제 연동

## 개요

- **Phase**: 2-B
- **규모**: L
- **상태**: 진행 중
- **의존성**: Task 211 (클래스 목록 UI), Task 202 (메이크샵 상품 등록 체계)
- **에이전트**: `주도` makeshop-ui-ux-expert | `협업` brand-planning-expert, ecommerce-business-expert, seo-performance-expert

## 목표

파트너 클래스 목록 페이지에서 특정 클래스 카드를 클릭하면 진입하는 상세 페이지를 구현한다.
GAS `getClassDetail` API로 데이터를 받아 렌더링하고, 일정 선택 → 인원 → 옵션 → 메이크샵 결제로 이어지는 구매 플로우를 완성한다.

## 대상 파일 (신규 생성)

- `파트너클래스/상세/Index.html`
- `파트너클래스/상세/css.css`
- `파트너클래스/상세/js.js`

## GAS API 데이터 구조

### getClassDetail 응답 (GET `?action=getClassDetail&id={class_id}`)

```json
{
  "success": true,
  "data": {
    "class_id": "CLS-001",
    "makeshop_product_id": "12345",
    "class_name": "봄꽃 압화 원데이 클래스",
    "category": "압화",
    "level": "입문",
    "price": 65000,
    "duration_min": 120,
    "max_students": 8,
    "description": "<p>강의 설명 HTML 문자열</p>",
    "curriculum": [
      { "step": 1, "title": "재료 소개", "duration_min": 15, "desc": "압화 재료 설명" },
      { "step": 2, "title": "기초 기법", "duration_min": 30, "desc": "배치 & 접착 방법" }
    ],
    "instructor_bio": "강사 소개 텍스트",
    "thumbnail_url": "https://cdn.example.com/thumb.jpg",
    "images": ["https://cdn.example.com/img1.jpg", "https://cdn.example.com/img2.jpg"],
    "youtube_video_id": "dQw4w9WgXcQ",
    "location": "서울 강남구 압구정로 123",
    "materials_included": "포함",
    "materials_product_ids": ["11111", "22222"],
    "tags": "압화, 원데이, 봄꽃",
    "class_count": 45,
    "avg_rating": 4.7,
    "partner": {
      "partner_code": "P-001",
      "name": "꽃향기 공방",
      "logo_url": "https://cdn.example.com/logo.jpg",
      "region": "서울",
      "grade": "GOLD",
      "description": "공방 소개"
    }
  }
}
```

### getClassSchedules 응답 (메이크샵 옵션 목록)

URL 파라미터로 `?action=getClasses&id={class_id}` → 재고/옵션 정보 포함
메이크샵 상품 페이지: `/goods/goods_view.php?goodsNo={makeshop_product_id}`

## 페이지 구조 요구사항

### 헤더
- 빵 부스러기(breadcrumb): HOME > 파트너 클래스 > [클래스명]
- URL: `?id=CLS-001` 파라미터로 class_id 추출

### 섹션 1: 이미지 갤러리
- Swiper.js CDN (https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js)
- 메인 슬라이더 + 썸네일 네비게이션
- 이미지 lazy loading
- 1개 이미지일 때는 슬라이더 없이 단일 이미지 표시

### 섹션 2: 클래스 기본 정보 + 예약 패널 (sticky)
- 왼쪽: 강의명, 카테고리 배지, 레벨 배지, 별점, 수강 후기 수
- 오른쪽(sticky): 가격, 일정 선택, 인원 선택, 옵션, 예약하기 CTA
- 모바일: 하단 고정 예약 버튼

### 섹션 3: 강의 소개
- `description` HTML 안전하게 렌더링 (XSS 방지: DOMPurify CDN 또는 허용 태그 화이트리스트)
- 소요 시간, 정원, 위치 요약 정보 chips

### 섹션 4: 커리큘럼 아코디언
- `curriculum` 배열 렌더링
- 각 단계: 번호, 제목, 소요 시간, 설명
- 클릭 시 확장/축소 (단계 설명 표시)

### 섹션 5: 일정 및 예약
- flatpickr CDN (https://cdn.jsdelivr.net/npm/flatpickr)으로 날짜 선택
- 날짜 선택 시 해당 날짜의 시간대 + 잔여석 표시
- 인원 선택 (1~최대 정원)
- 재료 옵션: 포함 / 별도 구매
- "예약하기" 버튼 클릭 → 메이크샵 상품 페이지로 이동 (옵션 URL 파라미터 포함)

### 섹션 6: 강사/공방 프로필
- `partner` 데이터 렌더링
- 공방 로고, 이름, 지역, 등급 배지 (SILVER/GOLD/PLATINUM)
- 강사 소개 (`instructor_bio`)
- "파트너맵에서 보기" 버튼 → `/파트너맵/` 링크 (Graceful Degradation)

### 섹션 7: 수강에 필요한 재료
- `materials_product_ids` 기반 상품 카드 표시
- 각 카드: 상품 썸네일, 상품명, 가격, "간편구매" 버튼
- `materials_included === '포함'`일 때는 "재료 포함" 안내 배너 표시
- 연동 실패 시 "준비 중" 표시

### 섹션 8: 관련 YouTube 영상
- `youtube_video_id` 있을 때만 표시
- 클릭 시 iframe embed (Intersection Observer로 lazy)
- 연동 실패 또는 `youtube_video_id` 없을 때: 섹션 숨김 (Graceful Degradation)

### 섹션 9: 수강 후기
- 별점 분포 바 + 평균 별점 대형 표시
- 후기 카드: 작성자(마스킹), 별점, 날짜, 텍스트, 사진(있으면)
- "후기 더 보기" 버튼 (향후 GAS API 연동 예정 - 현재는 placeholder)

## 결제 연동 플로우

```
1. URL에서 class_id 추출 (?id=CLS-001)
2. GAS getClassDetail API 호출
3. 사용자: 날짜 선택 (flatpickr)
4. 해당 날짜의 시간대 + 잔여석 표시
5. 인원 + 옵션 선택
6. "예약하기" 클릭
   → window.location = '/goods/goods_view.php?goodsNo={makeshop_product_id}'
   (메이크샵 상품 페이지에서 옵션[날짜/시간] 선택 후 결제)
```

## 기술 제약 (메이크샵 D4)

- IIFE 패턴 필수: `(function() { 'use strict'; ... })()`
- `var` 키워드만 사용 (const/let 금지)
- 템플릿 리터럴 백슬래시 이스케이프: `\${var}` → 단, 이 파일들은 메이크샵 편집기에 직접 올리지 않으므로 주의
- CSS 스코핑: `.class-detail` 컨테이너 기준
- CSS 변수 접두사: `--cd-` (목록은 `--cc-`, 상세는 `--cd-`)
- 브랜드 컬러: #7d9675 (세이지 그린), #6B4C3B (브라운), #C4956A (골드 베이지)
- 반응형: 768px / 992px / 1200px
- CDN만 허용: Swiper, flatpickr, Pretendard 웹폰트

## Graceful Degradation 규칙

| 연동 서비스 | 실패 시 처리 |
|------------|------------|
| GAS API (클래스 상세) | 전체 페이지 에러 상태 표시 + "새로고침" 버튼 |
| 파트너맵 연동 | "파트너맵에서 보기" 버튼 숨김 |
| YouTube 연동 | 섹션 8 전체 숨김 |
| 간편구매/재료 상품 | "준비 중" 표시 |
| 수강 후기 API | placeholder 텍스트 표시 |

## Schema.org

- `Course` 타입: class_name, description, price, instructor, provider
- `BreadcrumbList` 타입
- JSON-LD 방식으로 `<head>`에 주입

## 캐싱 전략

- GAS API 응답: localStorage 5분 캐시 (캐시 키: `classDetail_{class_id}`)
- 캐시 접두사: `classDetail_`

## 수락 기준

- [ ] URL `?id=CLS-001` 파라미터로 class_id 추출 및 API 호출
- [ ] Swiper 이미지 갤러리 정상 동작 (PC + 모바일 스와이프)
- [ ] flatpickr 날짜 선택 UI 동작
- [ ] 커리큘럼 아코디언 확장/축소 동작
- [ ] "예약하기" 버튼 → 메이크샵 상품 페이지 이동
- [ ] 모바일 하단 고정 예약 패널 동작
- [ ] Graceful Degradation: 각 연동 섹션 독립적 에러 처리
- [ ] XSS 방지: description HTML 안전 렌더링
- [ ] Schema.org Course JSON-LD 삽입
- [ ] IIFE + CSS .class-detail 스코핑 + var 준수

## 구현 단계

- [x] 단계 1: Task 파일 작성 및 컨텍스트 정리
- [ ] 단계 2: Index.html (구조 + Swiper + flatpickr CDN)
- [ ] 단계 3: css.css (.class-detail 스코핑, sticky 예약 패널, 반응형)
- [ ] 단계 4: js.js (IIFE, API 호출, 렌더링, 결제 연동)
- [ ] 단계 5: makeshop-code-reviewer 검수
- [ ] 단계 6: 완료 처리 (Shrimp verify, ROADMAP, MEMORY, git commit)
