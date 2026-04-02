# PRESSCO21 중앙 상품 마스터 정리 제안

> 작성일: 2026-03-24

## 1. 현재 상태 진단

지금 PRESSCO21 상품 정보는 아래처럼 흩어져 있다.

- 중국 사입 이력: `/Users/jangjiho/Desktop/프레스코21/제품 단가 샘플리스트`
- 수입 서류: `/Users/jangjiho/Desktop/프레스코21/우리무역/2025년서류`
- 메이크샵 연결 정보: `/Users/jangjiho/Downloads/1688-SKU-메이크샵_연계마스터.xlsx`
- 사방넷 품번/상품코드 연결: `/Users/jangjiho/Downloads/품번코드매핑관리_수정파일.xlsx`
- 사방넷 옵션/SKU 매칭: `/Users/jangjiho/Desktop/프레스코21/사방넷/사방넷단품대량수정_SKU매칭.xlsx`
- 통합 시도 산출물: `/Users/jangjiho/Downloads/SKU마스터_통합데이터.xlsx`

문제는 `원가`, `상품식별`, `채널연결`, `수입이력`이 서로 다른 파일에 있어 한 곳에서 통제되지 않는다는 점이다.

## 2. 이미 있었던 통합 시도

기존 통합 시도는 실제로 상당히 진척돼 있었다.

- `SKU마스터_통합데이터.xlsx`
  - 총 `2,477`행
  - `완전매핑 2,329`
  - `부분매핑 148`
  - `사방넷 상품코드 보유 2,144`
- 설계 근거 문서:
  - `/Users/jangjiho/workspace/pressco21/docs/원가마진분석-PRD.md`

이 말은 `처음부터 새로 만드는 것`이 아니라, 기존 통합 시도를 `운영 가능한 중앙 마스터`로 승격시키면 된다는 뜻이다.

## 2-1. 기존 중앙 마스터를 계속 수정해도 되는가

된다. 오히려 그게 가장 현실적이다.

원칙은 이렇다.

- 현재는 [SKU마스터_통합데이터.xlsx](/Users/jangjiho/Downloads/SKU마스터_통합데이터.xlsx)를 `1차 작업용 중앙 마스터`로 계속 쓴다.
- 다만 이 파일은 `최종 시스템`이 아니라 `이관 전 staging master`로 본다.
- 새 파일을 또 만들기보다, 이 파일에 필요한 운영 컬럼을 추가하며 정리하는 것이 맞다.

추천 추가 컬럼:

- `canonical_product_id`
- `variant_id`
- `procurement_type`
- `base_profile_id`
- `tariff_rule_class`
- `tariff_rate_override`
- `origin_certificate_default`
- `verified_ready`
- `last_verified_cogs`
- `last_verified_at`
- `last_verified_by`

즉, 지금은 이 엑셀을 버리지 말고 `검증/보강용 중심 파일`로 쓰고, 나중에 그대로 NocoDB로 옮기면 된다.

현재 바로 수정해갈 수 있게 만든 staging 파일:

- `/Users/jangjiho/workspace/OMX(오_마이_코덱스)/oh-my-codex/output/spreadsheet/pressco21-central-product-master.staging.xlsx`

비전공자 직원이 실제로 수정하고 결과를 바로 보기 위한 working 파일:

- `/Users/jangjiho/workspace/OMX(오_마이_코덱스)/oh-my-codex/output/spreadsheet/pressco21-central-product-master.working.xlsx`

구성:

- `상품마스터_작업`: 실제 데이터 + 수정 칸 + 자동 계산 결과
- `프로필기준`: 상품군별 기본값, 채널 기본값
- `입력설명`: 직원용 사용 순서
- `요약대시보드`: 전체 진행 현황 요약

## 3. 권장 운영 원칙

중앙 시스템은 아래 3층으로 나누는 것이 맞다.

### 3-1. Identifier Master

역할:

- 상품과 옵션을 식별
- 메이크샵/사방넷/오픈마켓/중국소싱 코드를 연결

핵심 키:

- `canonical_product_id`
- `variant_id`
- `sku_code`
- `makeshop_branduid`
- `sabang_product_code`
- `sabang_option_code`
- `source_item_code`
- `1688_url`

### 3-2. Cost & Sourcing Master

역할:

- 원가 계산의 단일 원장
- 조달이력과 수입이력 관리

핵심 필드:

- `procurement_type`
- `base_profile_id`
- `purchase_cny`
- `purchase_krw`
- `exchange_rate`
- `china_local_shipping`
- `unit_volume_cbm`
- `allocation_quantity`
- `origin_certificate_applied`
- `tariff_rate_override`
- `verified_at`
- `verified_by`

### 3-3. Channel Listing Master

역할:

- 채널별 판매가와 상태 관리
- 오픈마켓/자사몰 송신 기준 통제

핵심 필드:

- `channel_name`
- `channel_product_code`
- `current_price`
- `channel_fee_rate`
- `status`
- `last_synced_at`

## 4. 어디서 실행할지

PRESSCO21은 이미 `NocoDB + n8n` 기반이 있으므로, 이걸 중앙 상품 마스터의 실행 기반으로 쓰는 게 가장 현실적이다.

추천 구조:

- `NocoDB`: 중앙 상품 마스터 DB + 운영 UI
- `n8n`: 메이크샵/사방넷/엑셀 입출력 동기화
- `OpenClaw`: 가격/마진 검토, 문서화, 예외 탐지, 운영 비서

즉:

- 메이크샵/사방넷은 `실행 채널`
- NocoDB는 `단일 진실 원장`
- OpenClaw는 `분석/보조 직원`

## 5. 추천 테이블 구조

### 5-1. `tbl_Products`

- canonical_product_id
- 대표상품명
- 브랜드
- 상품군
- 상태

### 5-2. `tbl_Product_Variants`

- variant_id
- canonical_product_id
- 옵션명
- SKU코드
- 메이크샵 branduid
- 사방넷 상품코드
- 사방넷 옵션코드

### 5-3. `tbl_Source_Items`

- source_item_id
- variant_id
- 중국품명
- 규격
- 1688 URL
- 주문번호

### 5-4. `tbl_Supplier_Order_History`

- source_item_id
- 주문일
- 수량
- 단가(CNY)
- 중국내운임

### 5-5. `tbl_Import_Shipments`

- shipment_id
- 선적일
- 관세율
- 원산지증명여부
- 원산지증명비
- 통관수수료
- 해상운임
- 창고료/작업비

### 5-6. `tbl_Cost_Profiles`

- variant_id
- base_profile_id
- 구매원가타입
- 고정값
- override 값
- verified_ready

### 5-7. `tbl_Channel_Listings`

- variant_id
- channel_name
- channel_product_code
- 현재판매가
- 송신상태
- 최근동기화시각

### 5-8. `tbl_Price_Reviews`

- variant_id
- 검토채널
- 검토판매가
- COGS
- 수수료
- 광고비
- 마진율
- 검토일

## 6. 운영 단계 제안

### 단계 1. 지금 당장

- `SKU마스터_통합데이터.xlsx`를 식별 마스터의 출발점으로 삼는다.
- `제품 단가 샘플리스트`를 조달이력 소스로 삼는다.
- `2025년서류`를 수입비/관세 검증 소스로 삼는다.
- OpenClaw 가격 검토는 `Cost Profile` 우선으로 돌린다.

### 단계 2. 1차 이관

- NocoDB에 위 8개 테이블을 만든다.
- 기존 엑셀을 n8n으로 1차 적재한다.
- 우선 상품 20개만 `verified_ready`로 만든다.

### 단계 3. 운영 자동화

- 메이크샵 판매가 변동 감지
- 사방넷 SKU/품번코드 동기화
- 원가 충돌 자동 경고
- 가격/마진 검토 요청을 Telegram/OpenClaw로 처리

## 7. 왜 이 방식이 맞는가

- 엑셀은 여전히 입력과 백업에 좋다.
- 하지만 운영의 중심은 `중앙 DB`가 돼야 충돌이 줄어든다.
- 기존에 이미 NocoDB와 n8n이 있으므로 새 시스템을 억지로 만들 필요가 없다.
- OpenClaw는 그 위에서 사람 대신 계산하고 정리하는 역할에 집중시키는 것이 가장 효율적이다.

## 8. 최종 권고

최종 목표는 `메이크샵/사방넷/중국 사입 리스트를 하나의 중앙 상품 마스터로 묶고`, 그 위에서 OpenClaw가 가격·마진·상품운영을 돕는 구조다.

즉 앞으로는:

1. `엑셀 파일들`은 입력원과 과거이력으로 남긴다.
2. `NocoDB`를 중앙 상품 마스터로 만든다.
3. `n8n`이 메이크샵/사방넷과 동기화한다.
4. `OpenClaw`는 그 데이터를 읽고 전문가 직원처럼 조언하고 검토한다.
