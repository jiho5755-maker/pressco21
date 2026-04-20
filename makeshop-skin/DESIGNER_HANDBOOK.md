# PRESSCO21 MakeShop 디자이너 핸드북

작성일: 2026-04-20  
대상: CSS와 이미지 중심으로 작업하는 웹디자이너

## 1. 이 문서의 목적

MakeShop 사이트를 디자인할 때 자주 필요한 자료를 한곳에 모아둔 핸드북입니다.  
가격 표시, 팝업 운영, 색상/폰트, 수정 가능한 파일 위치, 확인 URL을 여기서 먼저 확인하세요.

## 2. 가장 먼저 볼 문서

| 목적 | 문서 |
|---|---|
| 전체 디자인 토큰/색상/폰트 | `makeshop-skin/DESIGN-SYSTEM.md` |
| 가격 표시 UI 수정 | `makeshop-skin/PRICE_UI_DESIGNER_GUIDE.md` |
| 팝업 구조/운영 규칙 | `makeshop-skin/MAKESHOP_POPUP_SYSTEM_GUIDE.md` |
| 스킨 폴더와 관리자 위치 매핑 | `makeshop-skin/README.md` |

디자이너는 보통 이 핸드북과 `PRICE_UI_DESIGNER_GUIDE.md`만 보면 됩니다.

## 3. 디자이너가 수정해도 되는 범위

### 권장

- CSS 색상, 여백, 폰트 크기, 굵기
- 배지 색상/둥글기/padding
- 팝업 이미지 제작 및 관리자 등록
- 배너 이미지 교체
- 반응형에서 줄바꿈/간격 조정

### 주의

- HTML 구조 변경
- JS 수정
- MakeShop 가상태그 수정
- 클래스명 변경
- `display:none` 남용
- `position:absolute`로 가격/버튼 위치 강제 조정

HTML/JS가 필요하면 개발자에게 요청하세요.

## 4. 주요 CSS 파일 위치

| 페이지/영역 | CSS 파일 |
|---|---|
| 공통 | `makeshop-skin/_common/common.css` |
| 메인 | `makeshop-skin/main/main.css` |
| 카테고리/브랜드관 | `makeshop-skin/product/shopbrand.css` |
| 검색 결과 | `makeshop-skin/product/shopsearch.css` |
| 상품 상세 | `makeshop-skin/product/shopdetail.css` |
| 헤더 | `makeshop-skin/header/basic/header.css` |
| 푸터 | `makeshop-skin/footer/basic/footer.css` |

## 5. 브랜드 색상 요약

자세한 기준은 `DESIGN-SYSTEM.md`를 봅니다.

```css
Primary Sage: #7d9675
Primary Light: #b7c9ad
Dark Green: #2c3e30
Warm Background: #fdfbf7
Accent Gold: #d4a373
Text Dark: #4a4a4a
```

현재 가격 배지는 아래 색을 사용합니다.

```css
적용가: #17130f
기준가: #9a928a
기준가 취소선: #c8beb5
혜택률 글자: #a85b45
혜택률 배경: #fff3ed
```

## 6. 가격 표시 UI 규칙

가격은 모든 페이지에서 아래 순서로 보이게 합니다.

```text
적용가 → 기준가 → 혜택률
```

예:

```text
2,880원  3,600원  20%
```

### 주요 클래스

```css
.normal            /* 메인/카테고리 적용가 */
.consumer          /* 메인/카테고리 기준가 */
.pc21-ug-discount  /* 생성된 혜택률 배지 */
.discount          /* MakeShop 기본 혜택률 배지 */

.prds--price-wrap .price     /* 검색 적용가 */
.prds--price-wrap .original  /* 검색 기준가 */

.goods--price-wrap .price    /* 상세 적용가 */
.goods--price-wrap .original /* 상세 기준가 */
.goods--price-wrap .discount /* 상세 혜택률 */
```

### 수정 원칙

- 적용가는 가장 진하게
- 기준가는 회색/취소선
- 혜택률은 작은 배지
- 세일몰처럼 너무 강한 빨강은 피하기
- 모바일에서 줄바꿈되어도 적용가 → 기준가 → 혜택률 순서 유지

## 7. 팝업 운영 규칙

MakeShop 팝업은 관리자에서는 1번부터 보이지만, 코드에서는 0번부터 시작합니다.

```text
관리자 1번 순위 = eventwindow0 / MAKESHOPLY0
관리자 2번 순위 = eventwindow1 / MAKESHOPLY1
관리자 3번 순위 = eventwindow2 / MAKESHOPLY2
```

### 현재 슬롯 규칙

| 관리자 순위 | 라이브 코드 | 용도 | 노출 대상 |
|---|---|---|---|
| 1번 | eventwindow0 / MAKESHOPLY0 | 회원등급/가격 안내 | 강사회원 로그인 고객 |
| 2번 이상 | eventwindow1 이상 | 일반 이벤트/공지 | 기본 전체 고객 |

### 중요한 점

MakeShop은 이미지 업로드 후 파일명을 `jewoo_event...`로 자동 변경할 수 있습니다.  
따라서 이미지 파일명으로 회원등급 팝업을 구분하지 않고, **팝업 순위/슬롯**으로 구분합니다.

### 디자이너 작업 규칙

1. 강사회원/회원등급 전용 팝업은 관리자 1번 순위에 등록합니다.
2. 일반 고객 전체에게 보여줄 팝업은 관리자 1번 순위를 쓰지 않습니다.
3. 추후 다른 등급 전용 팝업이 필요하면 “대상 등급 + 관리자 순위”를 개발자에게 알려주세요.
4. 팝업 이미지는 모바일에서도 읽히도록 글자 수를 줄이고 여백을 충분히 둡니다.

## 8. 현재 회원등급/가격 안내 팝업 문구

```text
상품 가격 표시가 더 편해졌어요

기존에 따로 보이던 회원용 상품을
하나의 상품으로 보기 쉽게 정리했습니다.

로그인한 회원 등급에 따라
적용 가능한 가격이 자동으로 표시됩니다.

이제 별도 상품을 찾지 않아도
상품 카드와 상세페이지에서 바로 확인하실 수 있어요.
```

## 9. 팝업 디자인 권장

- PC 기준 500px 내외 이미지
- 모바일에서 한눈에 읽히게 짧은 문장
- 밝은 배경, 충분한 여백
- 코랄/브라운/베이지 계열 포인트 추천
- “세일/특가”보다 “안내/정리/서비스 개선” 느낌
- 닫기와 오늘 하루 보지 않기 버튼은 MakeShop 기본 버튼 사용

## 10. 팝업을 쓰기 좋은 경우

- 회원등급/가격 안내
- 명절/연휴 배송 마감
- 배송 지연/출고 제한
- 시즌 기획전
- 신규 방문자 쇼핑 가이드
- 특정 등급 전용 혜택 안내

## 11. 팝업을 피해야 하는 경우

- 복잡한 정책 설명 전체
- 결제 단계 마케팅
- 단순 신상품 홍보 남발
- 메뉴/페이지 안내 대체
- 상시 배송/환불/회원 조건 설명

이런 정보는 팝업보다 페이지 안 안내, FAQ, 상단 배너가 더 좋습니다.

## 12. 수정 후 확인할 URL

```text
메인: https://www.foreverlove.co.kr/
카테고리: https://www.foreverlove.co.kr/shop/shopbrand.html?type=M&xcode=056&mcode=006&viewtype=list
검색: https://www.foreverlove.co.kr/shop/shopbrand.html?search=하바리움볼펜&refer=https:
상세: https://www.foreverlove.co.kr/shop/shopdetail.html?branduid=12195891
```

확인할 것:

- 가격 순서가 적용가 → 기준가 → 혜택률인가
- 혜택률 배지가 모든 페이지에서 같은 느낌인가
- 기준가는 취소선인가
- 모바일에서 가격 줄바꿈이 어색하지 않은가
- 팝업이 의도한 대상에게만 보이는가

## 13. 디자이너가 개발자에게 요청할 때 필요한 정보

팝업/가격 UI 관련 요청 시 아래 정보를 함께 주세요.

```text
1. 어느 페이지인지
2. 어떤 CSS 파일인지
3. PC/모바일 중 어느 화면인지
4. 수정하려는 요소의 스크린샷
5. 팝업이면 관리자 순위 번호
6. 팝업이면 노출 대상 회원등급
```

## 14. 절대 혼자 바꾸지 말아야 할 것

- `main.js`
- `shopbrand.js`
- `shopsearch.js`
- `shopdetail.js`
- `PC21_POPUP_AUDIENCE_RULES`
- MakeShop 가상태그 `<!--/.../-->`
- 가격 계산 로직
- 회원등급 노출 조건

이 영역은 개발자에게 요청하세요.
