# MakeShop 이벤트 팝업 시스템 분석 및 PRESSCO21 운영 가이드

작성일: 2026-04-20  
범위: `makeshop-skin/main/main.html`, `main.js`, `main.css`, 라이브 MakeShop 이벤트 팝업 DOM

## 1. 핵심 결론

MakeShop 이벤트 팝업은 관리자에서 순위를 지정하지만, 라이브 HTML에서는 아래처럼 0부터 시작하는 ID로 렌더링됩니다.

```text
관리자 1번 순위 = eventwindow0 / MAKESHOPLY0
관리자 2번 순위 = eventwindow1 / MAKESHOPLY1
관리자 3번 순위 = eventwindow2 / MAKESHOPLY2
```

이미지 파일명은 업로드 후 `jewoo_eventYYYY...gif` 형태로 자동 변경될 수 있으므로, 팝업 타깃팅은 파일명이 아니라 `eventwindowN` 슬롯 기준으로 관리해야 합니다.

## 2. 라이브 DOM 구조

현재 라이브 팝업은 아래와 같은 구조로 렌더링됩니다.

```html
<div id="MAKESHOPLY0" style="position:absolute; top:150px; left:700px; width:500px; height:525px; display:none;">
  <div class="event_inner" onmousedown="start_drag('MAKESHOPLY0', event);">
    <form name="frm_event" method="post" action="/html/event.html?db=jewoo&display=0">
      <input type="hidden" name="type" value="close">
      <input type="hidden" name="enddate" value="2026050623">
    </form>
    <div id="popup-event">
      <div class="layer-content">
        <div class="content-wrap">
          <div class="attach-img">
            <img src="/shopimages/jewoo/jewoo_event202604201329030.gif?random=...">
          </div>
        </div>
        <div class="content-btns">
          <a href="javascript:MAKESHOP_LY_NOVIEW(1, 'MAKESHOPLY0', 'eventwindow0', '2026050623', '1');">오늘은 그만 보기</a>
          <a href="javascript:MAKESHOP_LY_NOVIEW(0, 'MAKESHOPLY0', 'eventwindow0', '2026050623', '1');">닫기</a>
        </div>
      </div>
    </div>
  </div>
</div>
```

### 주요 필드

| 항목 | 의미 |
|---|---|
| `MAKESHOPLY0` | 팝업 레이어 DOM ID |
| `eventwindow0` | 오늘 그만 보기 쿠키명 |
| `display=0` | 관리자 1번 순위에 대응 |
| `enddate` | 오늘 그만 보기 쿠키 값/만료 기준으로 사용됨 |
| `MAKESHOP_LY_NOVIEW(1, ...)` | 오늘 그만 보기 |
| `MAKESHOP_LY_NOVIEW(0, ...)` | 닫기 |

## 3. MakeShop 기본 동작

MakeShop 기본 함수는 다음 역할을 합니다.

### `MAKESHOP_LY_VIEW(layername, x, y, position, obj)`

- 특정 팝업 레이어를 화면에 표시합니다.
- 관리자에서 설정한 위치/좌표를 반영합니다.

### `MAKESHOP_LY_NOVIEW(temp, layername, eventname, enddate, day, link, tar, win)`

- `temp = 1`: 오늘 그만 보기 쿠키를 설정합니다.
- `temp = 0`: 현재 팝업만 닫습니다.
- `eventname`: `eventwindow0` 같은 쿠키 이름입니다.
- `enddate`: 쿠키 값으로 쓰입니다.

### 기본 문제

- 관리자 팝업은 기본적으로 전체 사용자에게 렌더링됩니다.
- 회원등급별 노출 조건은 라이브 DOM에 직접 보이지 않습니다.
- 여러 팝업이 동시에 있을 때 기본 방식은 중첩/순차 노출될 수 있습니다.
- 이미지 파일명은 MakeShop에서 자동 변경되므로 식별자로 쓰기 어렵습니다.

## 4. PRESSCO21 커스텀 구조

현재 PRESSCO21은 `main.js`에서 MakeShop 원본 팝업을 직접 띄우지 않고, `[id^="MAKESHOPLY"]` 팝업들을 수집해 하나의 통합 모달/슬라이더로 재구성합니다.

### 커스텀 통합 팝업의 장점

- 여러 팝업을 하나의 모달 안에서 슬라이드로 정리
- PC/모바일 UI 통일
- `오늘은 그만 보기` / `닫기` 버튼 통일
- 원본 팝업 중첩 노출 방지
- 회원등급별 라우팅 가능

### 주요 DOM

```text
#pc21-popup-overlay
#pc21-popup-modal
.swiper
.swiper-wrapper
.swiper-slide
```

### 원본 팝업 숨김

`main.css`와 `main.js`에서 원본 `MAKESHOPLY` 레이어를 숨기고, 커스텀 모달만 보이게 합니다.

```css
body.pc21-popups-hidden [id^="MAKESHOPLY"],
body.pc21-popups-unified [id^="MAKESHOPLY"] {
  display: none !important;
}
```

## 5. 회원등급별 팝업 라우터

현재 라우터는 슬롯 기준으로 동작합니다.

```js
var PC21_POPUP_AUDIENCE_RULES = {
  eventwindow0: {
    audience: 'instructor',
    groupIncludes: ['강사']
  }
};
```

### 현재 규칙

| 관리자 UI 순위 | 라이브 코드 | 노출 대상 |
|---|---|---|
| 1번 순위 | `eventwindow0 / MAKESHOPLY0` | 강사회원 로그인 고객 |
| 2번 순위 | `eventwindow1 / MAKESHOPLY1` | 기본 전체 고객 |
| 3번 순위 | `eventwindow2 / MAKESHOPLY2` | 기본 전체 고객 |

### 추후 4단계 회원등급 예시

회원등급명이 확정되면 아래처럼 확장합니다.

```js
var PC21_POPUP_AUDIENCE_RULES = {
  eventwindow0: {
    audience: 'instructor',
    groupIncludes: ['강사']
  },
  eventwindow3: {
    audience: 'association',
    groupIncludes: ['협회']
  },
  eventwindow4: {
    audience: 'business',
    groupIncludes: ['사업자']
  },
  eventwindow5: {
    audience: 'vip',
    groupIncludes: ['VIP']
  }
};
```

## 6. 운영 규칙

### 슬롯 예약 원칙

| 슬롯 | 권장 용도 |
|---|---|
| 관리자 1번 / eventwindow0 | 회원등급·가격 정책 등 신뢰 공지 |
| 관리자 2번 / eventwindow1 | 일반 시즌 이벤트 |
| 관리자 3번 / eventwindow2 | 일반 캠페인/클래스 안내 |
| 관리자 4번 이후 | 추후 등급별/페이지별 확장 |

### 디자이너/운영자 규칙

1. 특정 회원등급 전용 팝업은 반드시 지정된 슬롯에 등록합니다.
2. 일반 고객 전체에게 보일 팝업은 전용 슬롯을 쓰지 않습니다.
3. 이미지 파일명은 식별자로 보지 않습니다.
4. 새 등급별 팝업이 필요하면 “대상 등급 + 관리자 순위”를 개발자에게 전달합니다.
5. 개발자는 `PC21_POPUP_AUDIENCE_RULES`에 해당 슬롯 규칙을 추가합니다.

## 7. 검증 체크리스트

### 라이브 HTML 확인

```bash
curl 'https://www.foreverlove.co.kr/?popup_debug=YYYYMMDD'
```

확인 항목:

- `MAKESHOPLY0`, `MAKESHOPLY1` 등 존재 여부
- 이미지 경로
- `eventwindowN` 쿠키명
- `main.js?t=...` 최신 반영 여부

### 브라우저 콘솔 확인

```js
Array.from(document.querySelectorAll('[id^="MAKESHOPLY"]')).map(function(p) {
  var img = p.querySelector('img');
  return {
    id: p.id,
    img: img ? img.getAttribute('src') : '',
    audience: p.getAttribute('data-pc21-popup-audience'),
    hidden: p.getAttribute('data-pc21-popup-audience-hidden')
  };
});
```

### 비대상 회원 검증

- 대상이 아닌 회원/비로그인 상태에서 `#pc21-popup-overlay`가 뜨지 않거나, 해당 전용 팝업 이미지가 포함되지 않아야 합니다.

### 대상 회원 검증

- 대상 회원 로그인 상태에서 해당 팝업 이미지가 통합 모달 안에 포함되어야 합니다.

## 8. UX 운영 원칙

팝업은 광고판이 아니라 “결정 지원 인터페이스”로 사용합니다.

### 적합한 용도

- 회원등급/가격 안내
- 배송 마감/출고 제한 같은 긴급 공지
- 기간 한정 시즌 캠페인
- 신규 방문자 온보딩
- 중요한 구매 조건 안내

### 부적합한 용도

- 복잡한 정책 설명 전체
- 상시 배송/환불/회원 조건 설명
- 결제 단계 마케팅
- 단순 신상품 안내 남발
- 메뉴/내비게이션 대체

## 9. PRESSCO21 UX 고도화 아이디어

### 1순위: 회원등급/가격 안내 팝업

현재 구현된 방식입니다. 가격이 왜 다르게 보이는지 미리 설명해 불신을 줄입니다.

### 2순위: 배송/제작 마감 팝업

명절, 연휴, 출고 지연 기간에만 사용합니다.

예시:

```text
연휴 전 출고 마감 안내
4월 25일 오전 11시 결제 완료 건까지 출고됩니다.
```

### 3순위: 신규 방문자 쇼핑 가이드

처음 방문한 고객에게 “처음이라면 / 재료 / DIY / 클래스” 구조를 짧게 안내합니다.

### 4순위: 시즌 기획전 안내

어버이날, 스승의날, 웨딩 시즌, 졸업 시즌 등 기간성이 명확할 때 사용합니다.

### 5순위: 회원등급 전환/인증 안내

향후 4단계 등급 체계 도입 후, 특정 등급에게만 필요한 안내를 슬롯별로 노출합니다.

## 10. 주의할 점

- 동시에 너무 많은 팝업을 띄우지 않습니다.
- 모바일에서 닫기 버튼이 작으면 안 됩니다.
- 이미지 안에 너무 많은 글자를 넣지 않습니다.
- 핵심 정책은 팝업이 아니라 페이지 안에도 남겨야 합니다.
- 팝업마다 종료일과 대상자를 명확히 둡니다.

## 디자이너용 요약본

CSS/이미지 작업자가 바로 볼 요약본은 [`DESIGNER_HANDBOOK.md`](./DESIGNER_HANDBOOK.md)에 정리되어 있습니다.
