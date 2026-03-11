# S2-9 묶음 키트 + 선택형 가이드

작성일: 2026-03-11

## 목적

S1-1의 `kit_items` 링크 단계에서 한 걸음 더 나아가, 수강생이 상세 페이지에서 `강의만 수강` 과 `키트 포함 수강` 중 하나를 고를 수 있게 만든다. 파트너는 재료를 직접 판매하지 않고, PRESSCO21 자사몰의 묶음 키트 상품으로 운영 부담을 줄인다.

## 핵심 구조

- 등록/수정
  - `tbl_Classes.kit_bundle_branduid` 를 클래스별 묶음 키트 상품 식별자로 사용한다.
  - 강의 등록/수정 화면은 `상품 URL 또는 branduid` 를 직접 입력받는다.
- 자동 상품 생성
  - `WF-17 Class Approve Auto Product` 는 클래스 상품 생성 후, `kit_enabled=1` 이고 묶음 상품이 아직 없으면 키트 상품도 한 번 더 생성한다.
  - 두 번째 실행은 `_productKind=KIT_BUNDLE` 로 처리하고, 클래스 오픈 안내 메일은 다시 보내지 않는다.
- 상세 예약
  - `상세(2607)` 에 `강의만 수강 / 키트 포함 수강` 카드 2개를 노출한다.
  - 키트 포함 가격은 `kit_items` 추정 합계가 아니라 실제 묶음 상품 상세의 판매가를 hydrate 해서 쓴다.
  - `키트 포함` 선택 시 선물하기는 막고, 장바구니에 클래스 상품과 키트 상품을 함께 담는다.
- 주문 후처리
  - `WF-05 Order Polling + Batch Jobs` 는 `order_id` 단위로 주문 라인을 묶어서, 실제 주문에 묶음 키트 상품이 같이 있을 때만 키트 준비 후속 처리를 탄다.

## 파일 범위

- 메이크샵
  - `파트너클래스/강의등록/Index.html`
  - `파트너클래스/강의등록/css.css`
  - `파트너클래스/강의등록/js.js`
  - `파트너클래스/상세/Index.html`
  - `파트너클래스/상세/css.css`
  - `파트너클래스/상세/js.js`
  - `파트너클래스/파트너/js.js`
- n8n
  - `파트너클래스/n8n-workflows/WF-01A-class-read.json`
  - `파트너클래스/n8n-workflows/WF-05-order-polling-batch.json`
  - `파트너클래스/n8n-workflows/WF-16-class-register.json`
  - `파트너클래스/n8n-workflows/WF-17-class-approve-auto.json`
  - `파트너클래스/n8n-workflows/WF-20-class-edit.json`
- 스크립트
  - `scripts/partnerclass-s2-9-patch-workflows.js`
  - `scripts/partnerclass-s2-9-deploy-workflows.js`
  - `scripts/partnerclass-s2-9-kit-bundle-runner.js`
  - `scripts/server/partnerclass-s2-9-add-kit-bundle-field.sh`

## 예약/주문 규칙

- `CLASS_ONLY`
  - 예약 기록 `amount` 는 강의료만 저장
  - 장바구니에는 클래스 상품만 담음
  - 선물하기 허용
- `WITH_KIT`
  - 예약 기록 `amount` 는 여전히 강의료만 저장
  - 대신 `booking_mode=WITH_KIT`, `kit_bundle_branduid` 를 함께 기록
  - 장바구니에는 클래스 상품 + 묶음 키트 상품 2건을 담음
  - 선물하기 비활성

이 규칙으로 정산/예약 기준 금액과 실제 커머스 결제 구성을 분리한다.

## 검증 결과

### 정적 검증

- `python3 codex-skills/makeshop-d4-dev/scripts/check_makeshop_d4.py 파트너클래스/상세/js.js 파트너클래스/강의등록/js.js 파트너클래스/파트너/js.js`
- 결과: 3개 파일 모두 통과

### 로컬 Playwright

- 실행:
  - `NODE_PATH=/Users/jangjiho/workspace/codex/node_modules node scripts/partnerclass-s2-9-kit-bundle-runner.js`
- 산출물:
  - `output/playwright/s2-9-kit-bundle/kit-bundle-results.json`
  - `output/playwright/s2-9-kit-bundle/kit-bundle-flow.png`
- 확인값:
  - 강의만: `booking_mode=CLASS_ONLY`, `amount=52000`, 장바구니 1건
  - 키트 포함: `booking_mode=WITH_KIT`, `kit_bundle_branduid=KIT9001`, 장바구니 2건
  - 상세 금액은 `75,000원` 으로 노출되고, 이 중 키트 추가 금액은 실상품가 `23,000원`
  - 키트 포함 선택 시 선물하기 비활성

### 라이브 반영

- 스키마:
  - `scripts/server/partnerclass-s2-9-add-kit-bundle-field.sh`
  - 결과: `tbl_Classes.kit_bundle_branduid` 물리 컬럼과 NocoDB 메타 등록 완료
- 워크플로우:
  - `node scripts/partnerclass-s2-9-deploy-workflows.js`
  - 결과:
    - `WF-01A Class Read API -> Ebmgvd68MJfv5vRt`
    - `WF-05 Order Polling + Batch Jobs -> W3DFBCKMmgylxGqD`
    - `WF-16 Class Register -> I4zkrUK036YEiUHe`
    - `WF-17 Class Approve Auto Product -> N3p7L6wo0nuT5cqM`
    - `WF-20 Class Edit -> EHjVijWGTkUkYNip`
- API 확인:
  - 활성 클래스 `CL_202602_662` 기준 `POST https://n8n.pressco21.com/webhook/class-api`
  - 요청: `{ "action": "getClassDetail", "id": "CL_202602_662" }`
  - 응답: `kit_enabled`, `kit_items`, `kit_bundle_branduid` 필드 포함 확인

## 남은 리스크

- 메이크샵 디자인편집기에는 아직 저장하지 않았으므로, 실제 2607/2608/강의등록 라이브 화면 확인은 실배포 후 다시 해야 한다.
- 라이브 활성 클래스 중 `kit_enabled=1` 인 실제 운영 데이터가 아직 없어서, 묶음 키트 상품 자동 생성과 실제 주문 후처리는 현재 로컬/워크플로우 구조 검증까지만 끝난 상태다.
- 카카오 SDK `integrity` 해시 mismatch 는 별도 기존 이슈로 남아 있으며, 이번 키트 선택 기능과 직접 관계는 없지만 상세 페이지 콘솔 오류에는 계속 잡힌다.
