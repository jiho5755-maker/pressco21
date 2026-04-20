# 가격 표시 UI 디자이너 가이드

작성일: 2026-04-20  
대상: CSS만 수정 가능한 웹디자이너

## 목적

메인, 카테고리, 검색, 상품상세에서 가격 표시가 같은 규칙으로 보이도록 관리합니다.
현재 구조는 상품을 하나로 통합하고, 로그인한 회원등급에 따라 적용가/기준가/혜택률이 자동 표시되는 방식입니다.

## 가격 구성 요소

가격 UI는 세 요소만 기억하면 됩니다.

1. 적용가: 실제로 적용되는 가격
2. 기준가: 비교 기준 가격, 취소선 표시
3. 혜택률: 10%, 20% 같은 숫자 배지

예시:

```text
2,880원  3,600원  20%
```

## 수정하면 되는 CSS 파일

페이지별 가격 스타일은 아래 파일에서 관리합니다.

```text
makeshop-skin/main/main.css              # 메인 New Arrival, Weekly Best
makeshop-skin/product/shopbrand.css      # 카테고리/브랜드관 목록
makeshop-skin/product/shopsearch.css     # 검색 결과 목록
makeshop-skin/product/shopdetail.css     # 상품 상세 가격 영역
```

## 주요 CSS 클래스

### 메인/카테고리 상품 카드

```css
.normal            /* 적용가 */
.consumer          /* 기준가 */
.pc21-ug-discount  /* 혜택률 배지 */
.discount          /* MakeShop 기본 혜택률 배지 */
```

### 검색 결과

```css
.prds--price-wrap .price              /* 적용가 */
.prds--price-wrap .original           /* 기준가 */
.prds--price-wrap .pc21-ug-discount   /* 혜택률 배지 */
.prds--price-wrap .discount           /* MakeShop 기본 혜택률 배지 */
```

### 상품 상세

```css
.goods--price-wrap .price              /* 적용가 */
.goods--price-wrap .original           /* 기준가 */
.goods--price-wrap .discount           /* 혜택률 배지 */
.goods--price-wrap .group-price-caption /* 적용가 안내 문구 */
```

## 현재 디자인 토큰

현재 배지 컬러는 부드러운 코랄/브라운 톤입니다.

```css
혜택률 글자색: #a85b45
혜택률 배경색: #fff3ed
기준가 색상: #9a928a
기준가 취소선: #c8beb5
적용가 색상: #17130f
```

## 디자인 수정 시 권장 범위

수정해도 안전한 것:

- 가격 숫자 크기
- 가격 숫자 굵기
- 기준가 색상/취소선 색상
- 혜택률 배지 배경색/글자색
- 혜택률 배지 radius/padding
- 가격 요소 간 간격

주의해서 수정할 것:

- `display: none`
- `position: absolute`
- 가격 클래스명 변경
- HTML 구조 변경
- JS 파일 수정

디자이너는 CSS만 수정하는 것을 권장합니다.

## 권장 시각 위계

```text
적용가: 가장 진하게, 가장 먼저 보이게
기준가: 회색, 취소선, 적용가보다 작게
혜택률: 작은 배지, 과한 세일 느낌은 피하기
```

## 회원등급별 팝업 등록 규칙

MakeShop 이벤트 팝업 이미지는 업로드 후 `jewoo_eventYYYY...gif` 형태로 자동 리네임될 수 있습니다.
따라서 이미지 파일명으로 타깃 회원등급을 구분하지 않고, **이벤트 팝업 슬롯(eventwindowN)** 기준으로 구분합니다.

현재 운영 규칙:

| 관리자 UI 순위 | 라이브 코드 | 용도 | 노출 대상 |
|---|---|---|---|
| 1번 순위 | eventwindow0 / MAKESHOPLY0 | 회원등급/가격 안내 팝업 | 강사회원 로그인 고객 |
| 2번 순위 이상 | eventwindow1 이상 | 일반 이벤트 팝업 또는 추후 등급별 팝업 | 기본 전체 고객 |

디자이너 작업 규칙:

1. 강사회원 또는 특정 회원등급에게만 보여야 하는 팝업은 지정된 전용 슬롯에 등록합니다.
2. 현재는 `eventwindow0`을 강사회원/가격 안내 전용 슬롯으로 사용합니다.
3. 일반 고객 전체에게 보여야 하는 팝업은 `eventwindow0`을 사용하지 않습니다.
4. 추후 회원등급이 4단계로 늘어나면 개발자가 슬롯별 타깃 규칙을 추가합니다. 예: `eventwindow3 = 협회원`, `eventwindow4 = 사업자회원`.
5. 디자이너는 팝업 이미지와 슬롯만 관리하고, 회원등급 분기 코드는 개발자가 관리합니다.

현재 등록된 가격 안내 팝업 이미지:

```text
jewoo_event202604201329030.gif
```

주의: 팝업 이미지를 교체해도 MakeShop이 파일명을 다시 바꿀 수 있으므로, 앞으로는 파일명보다 슬롯 번호를 기준으로 확인합니다.

운영 메모:

```text
MakeShop 관리자 팝업 순위는 1부터 시작하지만, 라이브 코드 eventwindow 인덱스는 0부터 시작합니다.
관리자 1번 순위 = eventwindow0 / MAKESHOPLY0
관리자 2번 순위 = eventwindow1 / MAKESHOPLY1
관리자 3번 순위 = eventwindow2 / MAKESHOPLY2
```

따라서 “강사회원 전용 팝업”을 관리자 1번 순위에 둔 것은 현재 라우터의 `eventwindow0` 규칙과 일치합니다.

## 팝업 문구 추천

```text
상품 가격 표시가 더 편해졌어요

기존에 따로 보이던 회원용 상품을
하나의 상품으로 보기 쉽게 정리했습니다.

로그인한 회원 등급에 따라
적용 가능한 가격이 자동으로 표시됩니다.

이제 별도 상품을 찾지 않아도
상품 카드와 상세페이지에서 바로 확인하실 수 있어요.
```

## 수정 후 확인할 샘플

수정 후 아래 페이지를 확인하세요.

```text
메인: https://www.foreverlove.co.kr/
카테고리: https://www.foreverlove.co.kr/shop/shopbrand.html?type=M&xcode=056&mcode=006&viewtype=list
검색: https://www.foreverlove.co.kr/shop/shopbrand.html?search=하바리움볼펜&refer=https:
상세: https://www.foreverlove.co.kr/shop/shopdetail.html?branduid=12195891
```

확인 포인트:

- 적용가/기준가/혜택률 순서가 유지되는가
- 혜택률 배지가 모든 페이지에서 같은 느낌인가
- 기준가는 회색 취소선인가
- 모바일에서 줄바꿈이 생겨도 읽기 쉬운가
- 팝업 이미지는 파일명 규칙을 지켰는가

## 통합 디자이너 핸드북

전체 디자이너용 자료 모음은 [`DESIGNER_HANDBOOK.md`](./DESIGNER_HANDBOOK.md)를 확인하세요.
