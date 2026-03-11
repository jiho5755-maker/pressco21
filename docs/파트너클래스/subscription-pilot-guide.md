# S3-3 키트 구독 모델 파일럿 가이드

작성일: 2026-03-11

## 목적

정기 수강생이 수강 완료 후 재료 구매로 끝나지 않고, 월간 시즌 키트 구독으로 다시 자사몰에 돌아오게 만드는 파일럿 레이어를 만든다.

이번 단계의 완성선은 아래 3가지다.

- 수강생 마이페이지에서 구독 추천, 등록, 해지까지 직접 관리할 수 있다.
- live NocoDB에 `tbl_Subscriptions` 테이블이 생기고 파일럿 데이터를 저장한다.
- `WF-SUB Subscription Kit Pilot` 가 매월 배치 기준으로 내부 주문 ref 를 자동 생성한다.

## 이번 파일럿의 해석

이번 구현은 메이크샵 정기결제 API를 붙인 단계가 아니다.

- 현재 자동 생성되는 것은 `SUBORD_YYYYMM_SUBS_*` 형식의 내부 주문 ref 다.
- 이 ref 는 `이번 달 어떤 구독을 운영/발송해야 하는지`를 관리하기 위한 파일럿 기준값이다.
- 즉, 지금은 `구독 등록/해지 + 월간 생성 배치 + 운영용 주문 ref 생성` 까지를 먼저 닫은 상태다.

향후 실상용 단계에서는 이 ref 를 메이크샵 실제 주문, 정기결제, 혹은 운영 fulfillment 시스템과 연결하면 된다.

## 데이터 구조

### 1. live NocoDB 테이블

- 테이블명: `tbl_Subscriptions`
- table id: `mtyaeamavml7www`

핵심 필드:

- `subscription_id`
- `member_id`, `member_name`, `member_email`, `member_phone`
- `class_id`, `class_name`, `partner_code`, `partner_name`
- `kit_bundle_branduid`
- `regular_price`, `subscriber_price`
- `preview_items_json`
- `delivery_day`, `cycle_months`
- `status`
- `next_order_date`, `last_order_date`, `last_order_ref`, `last_batch_month`, `order_count`
- `shipping_zipcode`, `shipping_address1`, `shipping_address2`
- `started_at`, `cancelled_at`
- `notes`

### 2. 상태 기준

- `ACTIVE`
  - 진행 중인 구독
- `CANCELLED`
  - 해지 완료

## 워크플로우

### WF-SUB Subscription Kit Pilot

- workflow id: `BpyDxiaCb1PwVInY`
- webhook path: `/webhook/subscription-kit`
- schedule: 매월 1일 06:30

지원 action:

- `listSubscriptions`
- `createSubscription`
- `cancelSubscription`
- `runMonthlyBatch`

## 마이페이지 UX

파일:

- `파트너클래스/마이페이지/Index.html`
- `파트너클래스/마이페이지/css.css`
- `파트너클래스/마이페이지/js.js`

구성:

- 구독 히어로 배너
- 진행 중인 구독 패널
- 완료 수업 기반 추천 패널
- 신청 폼

입력 항목:

- 이름
- 이메일
- 연락처
- 배송일
- 우편번호
- 주소 / 상세주소
- 메모

추천 규칙:

- 수강 완료 이력이 있다.
- 클래스 상세에 `kit_bundle_branduid` 또는 구독 가능한 키트 구성이 있다.
- 이미 `ACTIVE` 상태인 동일 클래스 구독은 추천에서 제외한다.

가격 규칙:

- 정가: `kit_items` 합산가
- 구독가: 정가의 90% 파일럿 기준

## 구현 파일

- 메이크샵
  - `파트너클래스/마이페이지/Index.html`
  - `파트너클래스/마이페이지/css.css`
  - `파트너클래스/마이페이지/js.js`
- n8n
  - `파트너클래스/n8n-workflows/WF-SUB-subscription-kit-pilot.json`
- 스크립트
  - `scripts/partnerclass-s3-3-create-subscriptions-table.js`
  - `scripts/partnerclass-s3-3-generate-subscription-workflow.js`
  - `scripts/partnerclass-s3-3-deploy-subscription-workflow.js`
  - `scripts/partnerclass-s3-3-subscription-runner.js`

## 검증

### 정적 검증

- `python3 ~/.codex/skills/makeshop-d4-dev/scripts/check_makeshop_d4.py ...`
  - `http://www.w3.org/2000/svg` 는 SVG namespace false positive
- `node --check`
  - `파트너클래스/마이페이지/js.js`
  - `scripts/partnerclass-s3-3-create-subscriptions-table.js`
  - `scripts/partnerclass-s3-3-generate-subscription-workflow.js`
  - `scripts/partnerclass-s3-3-deploy-subscription-workflow.js`
  - `scripts/partnerclass-s3-3-subscription-runner.js`

### live 생성/배포

- `node scripts/partnerclass-s3-3-create-subscriptions-table.js`
  - 결과: `tbl_Subscriptions` 신규 생성
- `node scripts/partnerclass-s3-3-deploy-subscription-workflow.js`
  - 결과: `WF-SUB Subscription Kit Pilot -> BpyDxiaCb1PwVInY`

### Playwright 검증

- 실행:
  - `NODE_PATH=/Users/jangjiho/workspace/codex/node_modules node scripts/partnerclass-s3-3-subscription-runner.js`
- 로컬 UI 결과:
  - 진행 중 구독 `1건`
  - 추천 구독 `1건`
  - 생성 후 진행 중 구독 `2건`
  - 해지 후 진행 중 구독 `1건`
- live API 결과:
  - create `201`
  - list active `1`
  - dry run generated `1`
  - batch generated `1`
  - `last_order_ref = SUBORD_202603_SUBS_*`
  - cancel `200`
- 산출물:
  - `output/playwright/s3-3-subscription/table-create-results.json`
  - `output/playwright/s3-3-subscription/subscription-results.json`
  - `output/playwright/s3-3-subscription/mypage-subscription-flow.png`

## 남은 리스크

- 메이크샵 디자인편집기에는 아직 저장하지 않았으므로 실제 라이브 마이페이지 화면 확인은 남아 있다.
- 현재 월간 자동 생성은 내부 주문 ref 생성 기준이며, 메이크샵 실제 정기결제/주문 생성과는 아직 연결되지 않았다.
