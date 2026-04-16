# PRESSCO21 자체 Product OS 설계 권고안

> 작성일: 2026-04-17 KST  
> 목적: 사방넷 정의에 PRESSCO21 상품을 억지로 맞추지 않고, MakeShop·Coupang·11st·SmartStore·CRM 5채널의 상품등록/SKU/재고 기준을 내부에서 소유하기 위한 회의용 결론.  
> 입력: `.omx/context/pressco-product-os-without-sabang-20260417T010000Z.md`, `docs/openmarket-ops/11st-openapi-catalog-from-screenshots-2026-04-17.md`, 기존 채널/재고 자동화 문서.

---

## 1. 회의 결론

**사방넷은 비교/실행 보조로만 두고, 기준 데이터는 PRESSCO21 자체 Product OS가 가져가야 한다.**

- 사방넷의 `연결상품코드` 개념은 참고할 만하지만, 사방넷 양식에 상품 구조를 끼워 맞추면 옵션·추가상품·세트상품에서 계속 매핑 오류가 난다.
- 내부 Product OS가 `상품`, `SKU`, `구성품`, `채널별 listing`, `재고`, `채널별 등록/수정 상태`를 소유하고, 각 채널은 실행 대상이 되어야 한다.
- 1차 범위는 **상품등록 자동화보다 SKU/재고/매핑 기준 확립**이다. 등록 자동화는 채널별 카테고리·고시정보·옵션 제약이 안정된 뒤 붙인다.

---

## 2. Fresh exports 체크리스트

오래된 엑셀(`SKU마스터_통합데이터.xlsx`, `6_3채널매칭결과_v3.xlsx`)은 설계 참고용으로만 쓰고, 아래 데이터를 새로 뽑아야 한다.

### 2.1 MakeShop

- 상품 기본: `branduid`, 상품명, 자체상품코드/상품코드, 카테고리, 판매상태, 진열상태
- 가격/배송: 판매가, 공급가/원가가 있으면 포함, 배송비/묶음배송 정책
- 재고: 본상품 재고, 옵션별 재고, 추가상품 row별 재고
- 구조: 옵션명/옵션값/옵션코드, 추가상품명/추가상품코드, 세트/관련상품 여부
- 콘텐츠: 대표 이미지 URL, 상세 HTML 버전/수정일, 상품 고시정보
- 변경 추적: 최근 수정일, 품절/판매중지 상태 변경일

### 2.2 Coupang

- 상품/listing ID: `sellerProductId`, `vendorItemId`, 옵션 ID, seller SKU가 있으면 포함
- 옵션/아이템: 옵션명, 옵션값, 판매상태, 구매가능수량, 노출상태
- 가격/배송/풀필먼트: 판매가, 할인/쿠폰 여부, 배송/반품 템플릿, 로켓배송/로켓그로스/판매자배송 구분
- 등록 필수값: 카테고리 ID, 고시정보, 인증/서류 필요 여부, 이미지/상세 설명 필드
- 운영 상태: 승인/반려 사유, 품절/판매중지 이력, 최근 수정일

### 2.3 11st

- 1차 권한 신청/확인 API: 카테고리 조회, 셀러상품조회, 다중상품조회, 신규상품조회
- 재고/상태: 다중상품재고정보조회, 신규상품재고정보조회, 상품재고수량변경처리, 판매중지처리/해제
- 구조: 상품 옵션 수정, 상품 추가구성상품 조회/수정
- 주문 차감 참고: 결제완료/발주확인/판매완료/주문상태 조회
- 필수 보강: 각 API 상세 URL, HTTP method, endpoint, request/response 샘플, 권한명, 제한량

### 2.4 SmartStore

- 상품 기본: `channelProductNo`, origin product ID, 판매상태, 전시상태, 카테고리, 브랜드/제조사
- 옵션: 조합형/단독형 옵션 구조, 옵션별 재고/가격/판매상태
- 추가상품: `supplementProductInfo` 전체 구조, 추가상품명, 추가상품별 재고/가격/노출 여부
- 가격/배송: 판매가, 할인, 배송비 템플릿, 묶음배송, 반품/교환 정책
- API 운영: rate-limit/quota 헤더, 최근 수정일, 실패 코드 샘플

### 2.5 CRM (`crm.pressco21.com`)

- 내부 기준: DB코드, 기존 SKU코드, 상품명, 카테고리, 원가/공급가 가능 여부
- 거래 기준: 주문 line item의 상품명/옵션명/수량/취소/반품 상태
- 고객/마케팅: 자사몰 전용 상품, 세트 추천, 재구매 주기, CRM 캠페인 대상 상품
- 운영 기준: 직원이 실제로 쓰는 별칭/상품명, 품절 문의 빈도, 수동 재고 조정 로그

### 2.6 Sabanet은 비교용으로만

- `사방넷상품코드`, `옵션상세명칭`, `공급상태`, `옵션구분`, `연결상품코드`, `EA`, `현재고`, `자체상품코드`
- 사방넷 주문/재고/상품 export는 **채널 상태와 내부 기준의 차이 검출용**으로만 사용한다.
- 사방넷 코드가 내부 SKU가 되면 안 된다. 내부 SKU가 사방넷에도 매핑되는 구조가 맞다.

---

## 3. 더 좋은 샘플 상품

`꽃 레진 10g`은 최근 품절 이슈에 너무 묶여 있어 Product OS 검증 샘플로 부적합하다. 아래 4종으로 테스트하면 단품·옵션·세트·고가/배송·채널차이를 모두 검증할 수 있다.

| 샘플 | 왜 좋은가 | 검증 포인트 |
|---|---|---|
| 압화건조매트 | 자체 제조/시그니처 상품이며 단품 SKU 기준을 세우기 좋다 | 내부 SKU ↔ 5채널 상품 ID, 가격/재고 동기화, CRM 주문명 불일치 |
| 압화 입문 세트 | PRESSCO21 강점인 교육/키트형 상품을 대표한다 | 세트 `product_component`, 구성품 재고 차감, 채널별 세트명 차이 |
| UV레진+몰드+데코 프리미엄 세트 | 옵션·추가상품·번들 구조가 섞이기 쉽다 | 옵션 SKU, 추가상품 SKU, 채널별 옵션 제한/추가상품 매핑 |
| 레지너스 장비류(탈포기프로/공기청정기/듀얼헤드믹서) | 고가·배송·AS·독점 총판 특성이 있다 | 고시정보, 배송/반품 템플릿, 채널별 판매 가능 여부, 콘텐츠 버전 관리 |

---

## 4. Product OS 데이터 모델 v1

| 테이블 | 역할 | 핵심 필드 |
|---|---|---|
| `product_master` | 판매/콘텐츠 기준 상품 | `product_id`, `name`, `brand`, `category`, `lifecycle_status`, `content_version`, `owner` |
| `sku_master` | 재고 최소 단위 | `sku_id`, `sku_code`, `sku_name`, `unit`, `variant_attrs_json`, `barcode`, `lifecycle_status` |
| `product_component` | 세트/키트/추가상품 구성 | `product_id`, `component_sku_id`, `qty`, `component_role`, `is_required` |
| `channel_listing` | 채널별 상품/옵션/추가상품 식별자 | `channel`, `channel_product_id`, `channel_option_id`, `channel_addon_id`, `listing_type`, `status` |
| `channel_listing_part` | listing이 어떤 SKU를 몇 개 쓰는지 | `channel_listing_id`, `sku_id`, `qty`, `mapping_confidence`, `mapping_status` |
| `inventory_balance` | 실제 재고 | `sku_id`, `stock_node`, `qty_on_hand`, `qty_reserved`, `qty_available`, `updated_at` |
| `stock_policy` | 안전재고/품절/판매중지 정책 | `sku_id`, `safety_stock`, `soldout_rule`, `channel_override_json`, `manual_hold` |
| `channel_publish_plan` | 채널 등록/수정 계획 | `product_id`, `channel`, `before_json`, `after_json`, `risk_level`, `approval_status` |
| `sync_log` | API/import/export 감사 | `source`, `request_hash`, `response_summary`, `diff_count`, `operator`, `created_at` |

핵심 원칙은 3개다.

1. **상품과 SKU를 분리한다.** 상품은 판매 페이지이고 SKU는 재고 단위다.
2. **채널 ID는 SKU가 아니다.** MakeShop `branduid`, SmartStore `channelProductNo`, Coupang `vendorItemId`, 11st 상품번호는 모두 `channel_listing`에만 둔다.
3. **1:1 매핑을 강제하지 않는다.** 세트/추가상품/옵션 조합은 `channel_listing_part`로 SKU:수량을 표현한다.

---

## 5. 상품등록/재고관리 실현 가능성

| 영역 | 판단 | 이유 |
|---|---|---|
| 내부 Product OS 구축 | 높음 | 기존 SKU마스터와 채널 매칭 엑셀이 있고, CRM/자사몰 데이터도 내부에서 통제 가능하다 |
| SKU/재고 기준 통합 | 높음 | 사방넷 `연결상품코드` 개념을 내부 모델로 흡수하면 된다 |
| MakeShop 재고/상품 수정 | 높음 | 기존 문서상 Open API/실험 자산이 있고, 자사몰이므로 운영 통제권이 가장 크다 |
| SmartStore 재고/상품 수정 | 중상 | API 권한은 열려 있으나 상세 조회량/429와 `supplementProductInfo` 보존이 중요하다 |
| Coupang 상품등록/수정 | 중 | API 권한은 열려 있으나 카테고리/고시/승인/풀필먼트 제약을 별도 모델링해야 한다 |
| 11st 상품등록/수정 | 중하 | 캡처 기준 재고/옵션/추가상품 API는 보이나, API별 URL 권한 신청과 상품 신규등록 API 확인이 필요하다 |
| CRM 연동 | 높음 | 내부 시스템이므로 상품/주문/고객 별칭을 Product OS에 맞추는 기준 테이블을 만들 수 있다 |

**실행 순서는 재고/매핑 → 채널 수정 → 신규 등록**이다. 신규 상품등록부터 자동화하면 카테고리/고시정보/이미지/옵션 제약 때문에 실패 범위가 커진다.

---

## 6. 주요 리스크와 방지책

| 리스크 | 방지책 |
|---|---|
| 오래된 엑셀로 현재 상태를 판단 | fresh export를 기준으로 v1 데이터를 만들고, 기존 엑셀은 후보 매칭/비교용으로만 사용 |
| 사방넷 코드가 다시 master가 됨 | 내부 `sku_code`를 master로 고정하고 사방넷 코드는 `external_mapping`으로 격하 |
| 옵션/추가상품/세트가 1:1 SKU로 안 맞음 | `product_component`와 `channel_listing_part`로 SKU:수량 매핑 허용 |
| SmartStore rate limit/429 | 상품 전체 상세 스캔 금지, 변경 후보만 조회, 캐시/hash/backoff 적용 |
| 11st 권한 미확정 | API URL별 신청 목록을 먼저 확정하고, 권한 전에는 manual queue로 운영 |
| Coupang 등록 반려 | 카테고리별 필수속성/고시정보/인증서류를 export에 포함하고, 샘플 1개씩 dry-run |
| 운영자가 복잡해서 못 씀 | NocoDB/Google Sheet형 승인 화면부터 만들고, 개발자용 필드는 숨김 |
| 대량 오등록/대량 품절 | dry-run diff, 영향 listing 수 표시, 2인 승인, rollback payload 저장 |
| 가격/마진 채널 정책 누락 | Product OS에 채널별 판매가/수수료/배송비/최소마진 필드를 추가 |

---

## 7. 비개발자 운영 로드맵

### Phase 0 — 3일: 데이터 재수집

- 5채널 fresh export를 같은 날짜 기준으로 저장한다.
- 샘플 4종의 채널별 URL/상품 ID/옵션/재고를 수동 검수한다.
- 11st는 API별 상세 URL/권한명 리스트를 만들어 신청한다.

### Phase 1 — 1주: 샘플 상품 모델링

- `product_master`, `sku_master`, `product_component`, `channel_listing`, `channel_listing_part`를 NocoDB 또는 Google Sheet로 만든다.
- 샘플 4종만 수기로 매핑하고, 기존 엑셀 매칭 결과와 차이를 표시한다.
- 운영자가 이해할 수 있는 컬럼명: “내부SKU”, “채널상품번호”, “옵션/추가상품”, “몇 개 차감”으로 둔다.

### Phase 2 — 2주: 전체 SKU/재고 dry-run

- fresh export 전체를 import하고 자동 매칭 후보를 만든다.
- `확정/검토필요/불일치/채널누락` 상태를 붙인다.
- 실제 write 없이 “이 SKU 재고가 바뀌면 어느 채널 row가 바뀌는지” diff 리포트만 만든다.

### Phase 3 — 3~6주: 재고 write MVP

- MakeShop + SmartStore부터 승인형 재고 수정/품절/복구를 연결한다.
- Coupang은 샘플 상품 1~2개로 재고/상태 수정 가능 범위를 검증한다.
- 11st는 권한이 열릴 때까지 Product OS에서 변경계획만 만들고 수동 처리 큐로 내보낸다.

### Phase 4 — 6~10주: 상품등록 MVP

- 샘플 4종으로 채널별 신규등록/수정 템플릿을 만든다.
- 카테고리/고시정보/이미지/상세설명/배송템플릿 필수값을 Product OS 필드에 추가한다.
- 모든 채널에 한 번에 등록하지 말고, MakeShop → SmartStore → Coupang → 11st 순서로 확장한다.

---

## 8. 최종 한 문장

> PRESSCO21은 사방넷에 맞추는 회사가 아니라, 내부 Product OS가 상품/SKU/재고/채널 listing을 소유하고 사방넷·MakeShop·Coupang·11st·SmartStore·CRM을 실행 채널로 다루는 회사가 되어야 한다.
