# 키트 링크 연동 가이드

작성일: 2026-03-10

S1-1의 목표는 파트너가 클래스별 재료를 자사몰 상품 링크로 바로 연결하고, 수강생이 상세 페이지에서 그 재료를 바로 확인하거나 한 번에 장바구니에 담을 수 있게 만드는 것이다.

## 현재 표준 구조

- 저장 필드: `tbl_Classes.kit_enabled`, `tbl_Classes.kit_items`
- 표준 JSON:

```json
[
  {
    "name": "프리저브드 로즈 세트",
    "product_url": "/shop/shopdetail.html?branduid=12345678",
    "quantity": 1,
    "price": 15000
  }
]
```

- `product_url`은 절대 URL 또는 `branduid`만 입력해도 저장 전 `/shop/shopdetail.html?branduid=...` 형식으로 정규화한다.
- legacy `product_code`는 읽기와 수정 호환을 위해서만 유지한다. 새 데이터 입력 기준은 `product_url`이다.

## 화면 반영 범위

### 강의 등록

- 파일:
  - `파트너클래스/강의등록/Index.html`
  - `파트너클래스/강의등록/css.css`
  - `파트너클래스/강의등록/js.js`
- 반영 내용:
  - 키트 토글 활성화 시 기본 항목 1개 자동 생성
  - 입력 필드: `상품명`, `자사몰 상품 링크`, `예상 판매가`, `1인 기준 수량`
  - 안내 문구: 상품 링크 대신 `branduid`만 입력해도 자동 변환
  - 유효성 검사: 상품명, 링크/branduid, 수량 범위, 가격 음수 여부

### 파트너 대시보드 수정 모달

- 파일:
  - `파트너클래스/파트너/css.css`
  - `파트너클래스/파트너/js.js`
- 반영 내용:
  - 기존 강의 수정 시 `product_url` 우선 로드
  - 과거 `product_code`만 있는 데이터도 수정 모달에서 링크형으로 보정 표시
  - 저장 시 `kit_enabled=0`이면 빈 배열로 정리

### 상세 페이지

- 파일:
  - `파트너클래스/상세/Index.html`
  - `파트너클래스/상세/css.css`
  - `파트너클래스/상세/js.js`
- 반영 내용:
  - 제목을 `이 수업에 사용되는 재료`로 조정
  - 카드형 재료 목록 렌더링
  - CTA:
    - `재료 한번에 담기`
    - `상품 보기`
    - `장바구니 담기`
  - `kit_items`가 있으면 우선 사용하고, 없으면 legacy `materials_product_ids`를 fallback으로 사용

## 워크플로우 반영 범위

### WF-16 Class Register

- 입력 시 `kit_items[{ name, product_url, quantity, price }]`를 검증한다.
- `product_url`이 없고 `branduid`도 추출되지 않으면 `INVALID_PARAMS`로 거절한다.
- 라이브 DB 제약 때문에 현재 INSERT 값은 다음처럼 저장한다.
  - `status`: `INACTIVE`
  - `level`: 소문자 enum (`beginner`, `intermediate`, `advanced`)
  - `region`: INSERT에서 제외
- API 성공 응답은 프론트 기준으로 `PENDING_REVIEW`를 반환한다.

### WF-20 Class Edit

- 수정 API도 동일한 키트 구조를 검증한다.
- legacy `product_code`는 수정 저장 시 `product_url` 기준으로 보정 가능하다.

### WF-01 Class API

- 상세 응답에서 `kit_items`를 정규화해 내려준다.
- 각 항목은 `product_url`, `price`, `quantity`, `branduid`를 포함한다.
- 읽기 응답에서는 canonical status/level/region을 다시 맞춘다.

### WF-05 Order Polling Batch

- 키트 주문 알림 메시지에서 `product_url` 또는 legacy `product_code`를 정규화해서 보여준다.
- 텔레그램에는 상품 링크와 예상 판매가를 함께 남긴다.

## 라이브 제약

- 현재 NocoDB `tbl_Classes`는 읽기와 쓰기 enum 기준이 완전히 같지 않다.
- 그래서 쓰기 경로는 DB 호환값으로 저장하고, 읽기 경로는 프론트 canonical 값으로 다시 정규화한다.
- 이 제약은 S1-2 이후에도 유지될 가능성이 있으므로, 이후 WF를 수정할 때 `status/level/region` INSERT 값을 함부로 바꾸면 안 된다.

## 검증 결과

### API

- `class-register` 정상 등록: 성공
- `class-register` 잘못된 키트 링크: `HTTP 400`, `INVALID_PARAMS`
- `class-edit` 정상 수정: 성공
- `class-edit` 잘못된 키트 항목: `HTTP 400`
- `class-api getClassDetail`: `kit_items.product_url`, `price`, `quantity`, `branduid` 정규화 확인

### Playwright

- 상세 로컬 프리뷰:
  - 재료 섹션 제목, 안내 문구, 카드 가격, `재료 한번에 담기` CTA 확인
- 강의 등록 로컬 프리뷰:
  - 파트너 인증 mock 후 폼 노출 확인
  - 키트 토글 활성화 시 항목 1개 자동 생성 확인
  - 라벨 `상품명 / 자사몰 상품 링크 / 예상 판매가 / 1인 기준 수량` 확인

## 다음 단계

- S1-2에서 상세 상단 신뢰 영역과 CTA 계층을 키트 섹션과 연결한다.
- 메이크샵 디자인편집기 배포가 필요한 시점에는 사용자 승인 후 실제 템플릿 반영 뒤 Playwright로 재검증한다.
