# 간편 구매 (상품 상세페이지) 가이드

> 상품 상세페이지 커스터마이징
> 편집 위치: 관리자 > 디자인 관리 > 상세 디자인

## 파일 구성

| 파일 | 메이크샵 탭 | 크기 | 설명 |
|------|-----------|------|------|
| `index.html` | HTML 탭 | 91KB (1,581줄) | 상세페이지 전체 마크업 |
| `css.css` | CSS 탭 | 46KB (805줄) | 스타일 |
| `js.js` | JS 탭 | 8.1KB (242줄) | JS 원본 |
| `js.fixed.js` | JS 탭 (대체용) | 11KB (298줄) | IIFE + 성능 최적화 버전 |

## 주요 기능

### 이미지 갤러리
- CowaveSwiper (메이크샵 내장) 기반 썸네일 연동 갤러리
- 멀티 이미지 슬라이드 + 썸네일 동기화

### 상품 정보
- 가격/할인율 표시 (원가, 판매가, 할인율)
- 옵션 선택 UI (텍스트/체크 옵션)
- 브레드크럼 내비게이션

### SNS 공유
- Facebook, Twitter, KakaoTalk, KakaoStory, 링크복사
- 모달 레이어 (`layer-share`)

### 구독 할인 혜택
- 혜택 안내 모달 (`layer-benefit`)

### 하단 고정 버튼
- 스크롤 감지하여 장바구니/구매 버튼 sticky 표시

## js.js vs js.fixed.js 차이

| 항목 | js.js (원본) | js.fixed.js (개선) |
|------|-------------|-------------------|
| 패턴 | 전역 스코프 | IIFE |
| null 체크 | 없음 | 있음 |
| 스크롤 성능 | 직접 이벤트 | requestAnimationFrame |
| DOM 감지 | 없음 | MutationObserver |
| 변수명 | snake_case 혼용 | camelCase 통일 |
| 클립보드 | execCommand | Clipboard API (폴백 포함) |

> **권장**: `js.fixed.js`를 JS 탭에 사용

## 주요 함수 (js.fixed.js)

- `updateSlideCount()` - 슬라이드 카운터 업데이트
- `updateNavigationButtons()` - 이전/다음 버튼 상태 관리
- CowaveSwiper 초기화 (상품 이미지, 관련 상품)
- 모달 open/close 핸들러

## 주요 치환코드

```
<!--/product@name/-->          상품명
<!--/product@image/-->         상품 이미지
<!--/product@price_sell/-->    판매가
<!--/product@discountrate/-->  할인율
<!--/product@option/-->        옵션 선택 영역
<!--/btn_basket/-->            장바구니 버튼
<!--/btn_buy/-->               구매 버튼
<!--/btn_wish/-->              찜하기 버튼
```

## 주의사항
- jQuery + CowaveSwiper 의존
- 원본(`js.js`)은 전역 스코프 오염 가능 → `js.fixed.js` 권장
- `changeNaviTitleText('상품상세')` - 메이크샵 내장 함수 호출
