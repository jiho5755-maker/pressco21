# PRESSCO21 자체 Product OS 설계 권고안 — 사방넷 중심 제거

> 작성일: 2026-04-17 KST
> 회의 목적: 사방넷의 상품/옵션 정의에 PRESSCO21 데이터를 억지로 맞추지 않고, MakeShop·쿠팡·11번가·스마트스토어·CRM 5채널을 내부 Product/SKU 기준으로 운영할 수 있는지 판단한다.

## 1. 결론

**가능하다. 단, 사방넷을 “마스터”가 아니라 “비교/실행 레일 후보”로 내려야 한다.**

- 사방넷의 `연결상품코드 = SKU:EA 또는 상품코드-옵션코드` 개념은 유용하지만, PRESSCO21의 실제 상품 구조를 사방넷 필드에 맞추는 순간 매핑 품질이 무너진다.
- 내부 기준은 `Product OS`가 소유하고, 각 채널은 `channel_listing`으로 연결한다.
- MakeShop은 초기 seed와 실운영 검증 기준으로 쓰되, MakeShop 상품번호도 SKU가 아니다.
- 쿠팡·스마트스토어는 API 권한이 열려 있으므로 read/dry-run부터 가능하다.
- 11번가는 API URL별 권한 신청이 선행되어야 하며, 상품 신규 등록 API는 현재 캡처 근거만으로 확정할 수 없다.

회의 의사결정 문장:

> “PRESSCO21 상품/재고 기준은 자체 Product OS가 소유하고, 사방넷은 비교 데이터 또는 필요 시 실행 보조 레일로만 쓴다. 2주간 Fresh Export 기반 read-only SKU 매핑 MVP를 만든 뒤, 승인형 채널 등록/재고 변경으로 확장한다.”

## 2. 권장 데이터 모델 v1

| 테이블 | 역할 | 핵심 필드 |
|---|---|---|
| `product_master` | 내부 판매상품 기준 | `product_id`, `internal_name`, `category`, `brand`, `lifecycle_status`, `default_price`, `tax_type` |
| `sku_master` | 재고 최소 단위 | `sku_id`, `sku_code`, `sku_name`, `unit`, `variant_attrs`, `barcode`, `active`, `safety_stock` |
| `product_component` | 세트/키트/추가구성 차감 | `product_id`, `sku_id`, `qty`, `component_role` |
| `channel_listing` | 채널 상품 단위 | `channel`, `channel_product_id`, `channel_listing_url`, `sale_status`, `display_status`, `last_seen_at` |
| `channel_listing_part` | 옵션/추가상품/구성 row | `channel_listing_id`, `part_type`, `channel_option_id`, `channel_addon_id`, `sku_id`, `qty_per_sale`, `price_delta`, `stock_status` |
| `inventory_balance` | 내부 실재고/가용재고 | `sku_id`, `stock_node`, `qty_on_hand`, `qty_reserved`, `qty_available`, `source_system`, `updated_at` |
| `stock_policy` | 품절/재입고/제외 정책 | `sku_id`, `channel`, `soldout_when`, `reopen_when`, `manual_hold`, `automation_group` |
| `publication_plan/log` | 상품등록·수정 승인/감사 | `plan_id`, `channel`, `before_snapshot`, `after_payload`, `approval_status`, `result`, `rollback_hint` |

핵심 원칙:

1. **SKU는 재고 단위, 채널 상품번호는 판매 row다.** MakeShop `branduid`, 스마트스토어 `channelProductNo`, 쿠팡/11번가 상품번호를 SKU로 쓰지 않는다.
2. **옵션과 추가상품을 분리 저장한다.** 채널마다 옵션/추가구성 표현이 다르므로 `channel_listing_part.part_type`으로 `main`, `option`, `addon`, `bundle_component`를 구분한다.
3. **상품등록은 “공통 본문 + 채널별 템플릿”이다.** 상품명, 키워드, 고시정보, 배송정책, 이미지 규격, 옵션 제한을 채널별로 따로 검증한다.
4. **모든 write는 승인형이다.** 처음부터 자동 등록/자동 품절을 열지 말고, dry-run diff와 사람 승인 후 실행한다.

## 3. Fresh Export 체크리스트

오래된 `SKU마스터_통합데이터.xlsx`, `6_3채널매칭결과_v3.xlsx`, 사방넷 SKU 매칭 파일은 구조 참고용으로만 쓴다. 실제 설계는 아래 Fresh Export를 새로 받아 시작한다.

### 3.1 MakeShop

- 전체 상품: 상품번호/`branduid`, 상품명, 판매가, 소비자가, 과세, 카테고리, 브랜드, 진열상태, 판매상태, 등록/수정일
- 옵션: 옵션명, 옵션값, 옵션 row 코드, 옵션별 판매상태, 옵션별 재고/무한재고 여부, 옵션 추가금
- 추가상품/부속품: 추가상품 row 코드, 이름, 가격, 재고, 판매상태, 필수/선택 여부
- 상세/이미지: 대표이미지, 추가이미지, 상세 HTML 또는 이미지 URL, 모바일 상세 여부
- 배송/정책: 배송비 템플릿, 묶음배송, 반품/교환 정책
- 최근 주문 line: 최근 30~90일 상품번호·옵션 row별 판매량과 취소/반품 여부

### 3.2 SmartStore

- `originProductNo`, `channelProductNo`, 판매상태, 전시상태, 카테고리, 상품명, 가격, 재고
- 옵션 조합 row: 옵션명/값, 옵션관리코드, 옵션가, 재고, 사용 여부
- `supplementProductInfo`: 추가상품명, 추가상품 ID, 가격, 재고, 사용 여부
- 상품정보제공고시, 배송/반품 정책, 이미지/상세 URL
- API rate-limit/429 발생 로그와 최근 수정일 watermark

### 3.3 Coupang

- 판매자 상품/옵션 식별자, vendor item 단위 식별자, 판매상태, 노출상태, 가격, 재고
- 카테고리/고시정보/인증정보/배송정보 필수값
- 옵션 구조, 묶음/세트 가능 여부, 이미지/상세 규격
- API 권한 범위와 IP allowlist 상태
- 최근 주문 line 단위 판매량과 취소/반품

### 3.4 11번가

11번가는 URL별 권한 신청이 필요하므로, 아래 API URL/권한명을 우선 확보한다.

- 카테고리 조회
- 셀러상품조회, 다중상품조회, 신규상품조회
- 다중상품재고정보조회, 신규상품재고정보조회, 상품재고수량변경처리
- 판매중지처리, 판매중지해제처리
- 상품 옵션 수정
- 상품 추가구성상품 조회/수정
- 주문 상태/발주확인/판매완료 조회

주의: 현재 캡처 근거에는 **상품 신규 등록 API가 명확하지 않다.** 따라서 11번가는 Phase 0에서 read/manual queue로 시작하고, 신규 등록은 상세 문서 확인 전까지 자동화 범위에 넣지 않는다.

### 3.5 CRM / direct

- CRM 상품/서비스 코드, 내부 고객/거래처 구분, 주문 line, 판매가, 할인/등급가
- 내부 재고 기준 또는 수동 재고 조정 내역
- 자사몰 회원/오프라인 고객과 연결되는 식별자
- 반복 구매 상품군, B2B/강사공간 전용 상품, 오프라인 전용 상품 여부

### 3.6 사방넷은 비교용만

- 단품대량수정/SKU 매칭 export
- 상품코드·옵션상세명칭·공급상태·연결상품코드·EA·현재고·자체상품코드
- 주문 line별 사방넷 상품코드/옵션/수량
- 사방넷이 이미 보유한 채널 상품코드 매핑

사용 원칙: 사방넷 export는 “왜 과거 매핑이 틀렸는지”와 “운영자가 익숙한 실행 단위가 무엇인지”를 보는 용도다. 내부 master로 승격하지 않는다.

## 4. 꽃 레진 대신 더 좋은 샘플 상품

꽃 레진은 최근 이슈 때문에 대표 샘플로 쓰면 논의가 “특정 품절 사고”에 갇힌다. 아래 샘플이 Product OS 검증에 더 좋다.

| 우선순위 | 샘플 | 이유 | 검증 포인트 |
|---|---|---|---|
| 1 | `실리콘몰드/쟁반/직사각 2size` | 옵션 20개 이상, 부속품/손잡이/받침대 구조가 섞여 있음 | 옵션 row와 추가구성 row를 SKU로 분리 가능한지 |
| 2 | `웨딩액자 모음전` / `웨딩액자 모음전(대량구매)` | 사이즈·색상·수량 묶음이 많고 B2C/B2B 성격이 섞임 | 동일 SKU가 여러 판매상품/채널에 걸칠 때 재고 차감 |
| 3 | `프리저브드_라이스플라워모음전` | 색상/중량 variant가 많고 일부 품절·무한재고가 섞임 | 색상 variant SKU, 안전재고, 품절/재입고 정책 |
| 4 | `보존화 종합팩(중형)` | 색상 팩 옵션, 실제 재고 0 품절 사례가 있음 | 정상 품절과 오류 품절을 구분 |
| 5 | `부케접이식액자 만들기세트` | 키트/완제품 성격, 색상 옵션이 단순함 | 초보 운영자용 등록·수정 시나리오 검증 |
| 6 | `압화건조매트` 또는 `[압화]체험꽃팩` | 회사 시그니처/첫구매 상품군 | 핵심 상품의 다채널 상품명·가격·검색키워드 템플릿 |

권장 MVP 샘플 묶음: `실리콘몰드/쟁반/직사각 2size` + `웨딩액자 모음전` + `프리저브드_라이스플라워모음전` + `압화건조매트`. 이 조합이면 옵션, 추가구성, 묶음, 핵심 단품을 모두 검증할 수 있다.

## 5. 상품등록·옵션/추가상품 처리 가능성

| 채널 | 상품등록 자동화 가능성 | 재고/SKU 동기화 가능성 | 판단 |
|---|---:|---:|---|
| MakeShop | 높음 | 높음 | 내부 Product OS seed와 검증 기준으로 적합. 옵션/추가상품 row를 반드시 별도 part로 저장한다. |
| SmartStore | 중~높음 | 중~높음 | API 가능성이 높지만 전체 상세 스캔은 429 위험. 변경 후보 중심 조회와 cache가 필요하다. |
| Coupang | 중간 | 중간 | 권한은 열려 있으나 카테고리/고시/인증/배송 필수값이 까다롭다. 신규 등록은 템플릿 검증 후 단계적으로 연다. |
| 11번가 | 낮음~중간 | 중간 | 재고/옵션/판매중지는 API 목록이 보이나 URL별 승인 필요. 신규 등록은 근거 부족. |
| CRM | 높음 | 높음 | 내부 정책을 가장 잘 반영할 수 있으나, 외부 채널과 같은 SKU 기준을 강제해야 한다. |

옵션/추가상품 mismatch 처리 원칙:

1. 채널 옵션명을 기준으로 매칭하지 말고, `channel_listing_part`에 채널 row ID와 내부 `sku_id`를 연결한다.
2. 한 판매 row가 여러 SKU를 차감하면 `product_component`로 분해한다.
3. 한 SKU가 여러 채널 상품에 팔리면 `channel_listing_part`가 여러 개 생기는 것이 정상이다.
4. 매핑 신뢰도가 낮은 row는 `mapping_status=review_required`로 두고 write 금지한다.
5. 신규 상품 등록은 `공통 product draft → 채널별 required fields 검증 → dry-run payload → 사람 승인 → 등록` 순서로만 실행한다.

## 6. 주요 리스크와 방어책

| 리스크 | 영향 | 방어책 |
|---|---|---|
| 오래된 Excel 기반 의사결정 | 현재 채널 상태와 다른 매핑 생성 | Fresh Export를 Phase 0 필수 게이트로 지정 |
| SKU와 채널 상품번호 혼동 | 재고 차감/품절 오류 | 내부 `sku_id`와 채널 ID를 물리적으로 분리 |
| 옵션/추가상품 구조 차이 | 일부 옵션 누락, 부속품 삭제, 잘못된 품절 | `channel_listing_part` + before snapshot + dry-run diff |
| 무한재고/안전재고 해석 차이 | 재고 있는데 품절 또는 재고 0인데 판매 | `stock_policy`에 채널별 판단 규칙 저장 |
| SmartStore 429/API 비용 | 수집 지연, 자동화 중단 | 변경 후보 중심 조회, token bucket, backoff, cache |
| 11번가 URL 권한 부족 | 상품 write 실패 | 권한 확보 전 manual queue/사방넷 경유 |
| 쿠팡 필수 고시/인증 누락 | 등록 반려 | 카테고리별 registration template과 validation checklist |
| 운영자 부담 | 시스템을 만들어도 안 씀 | NocoDB/간단 UI로 “검토 필요 row”만 보여주고 승인형으로 시작 |
| 대량 write 사고 | 매출 손실/복구 부담 | 기본 DRY_RUN, 2인 승인, rollback snapshot, kill switch |

## 7. 실행 로드맵

### Phase 0 — 3~5일: 데이터 재수집과 샘플 확정

- 5채널 Fresh Export를 새로 받는다.
- 위 4개 MVP 샘플 상품을 채널별로 찾아 current snapshot을 만든다.
- 기존 사방넷/SKU Excel은 비교용으로만 import한다.
- 회의에서 내부 SKU 기준을 확정한다: `PRESSCO21 sku_id`를 만들고 사방넷/MakeShop은 mapping으로 둔다.

산출물: Fresh Export 체크리스트 완료표, 샘플별 채널 매핑표, 매핑 실패 row 목록.

### Phase 1 — 1~2주: read-only Product OS MVP

- `product_master`, `sku_master`, `product_component`, `channel_listing`, `channel_listing_part`를 NocoDB 또는 Postgres에 만든다.
- MakeShop을 seed로 삼아 상품/옵션/추가상품 row를 import한다.
- SmartStore·쿠팡·11번가는 read snapshot만 붙인다.
- 샘플 상품 4개에 대해 “내부 SKU ↔ 채널 row” 매핑을 수작업 검수한다.

산출물: 채널별 매핑 정확도, 중복/누락/검토필요 row, 사방넷 매핑과의 차이 리포트.

### Phase 2 — 2~4주: 재고/품절 dry-run

- `inventory_balance`, `stock_policy`, `publication_plan/log`를 추가한다.
- MakeShop·SmartStore 중심으로 재고/품절 변경 dry-run을 만든다.
- 쿠팡은 API 필수값 검증용 payload까지만 만든다.
- 11번가는 권한 신청과 manual queue를 병행한다.

산출물: “변경 전/후 diff”, 위험도, 승인 화면, 실행하지 않은 dry-run 로그.

### Phase 3 — 4~8주: 승인형 채널 write

- MakeShop 옵션/추가상품 stock write부터 live pilot을 연다.
- SmartStore는 rate-limit-safe 방식으로 제한된 SKU만 write한다.
- 쿠팡은 상품 수정/재고 수정 중 성공 가능성이 높은 endpoint부터 pilot한다.
- 11번가는 권한 확보 전까지 사방넷/수동 반영 큐로 둔다.

산출물: 승인형 write 성공률, 실패 사유, rollback 가능성, 운영자 SOP.

### Phase 4 — 8~12주: 상품등록 템플릿과 OMS 재평가

- 공통 product draft와 채널별 registration template을 만든다.
- 신상품 1~2개를 MakeShop → SmartStore/Coupang 순서로 등록 pilot한다.
- 11번가 신규 등록 API가 확인되면 마지막에 붙인다.
- 자체 유지비가 커지면 사방넷/PlayAuto류 OMS를 “실행 레일”로 재평가하되, Product OS master는 내부에 둔다.

산출물: 채널별 등록 템플릿, 자동/수동 범위표, buy-vs-build 판단표.

## 8. 다음 회의에서 결정할 것

1. Fresh Export 담당자와 마감일: MakeShop, SmartStore, Coupang, 11번가, CRM, 사방넷 비교 export.
2. MVP 샘플 4개 확정: `실리콘몰드/쟁반/직사각 2size`, `웨딩액자 모음전`, `프리저브드_라이스플라워모음전`, `압화건조매트` 권장.
3. 내부 SKU ID를 새로 만들지, 기존 자체상품코드를 seed로 쓸지 결정.
4. Phase 1 저장소를 NocoDB로 시작할지, 바로 Postgres로 시작할지 결정.
5. 11번가 API URL 권한 신청 목록을 확정하고, 신규 등록 API 존재 여부를 문의한다.
6. live write는 누가 승인할지와 2인 승인 기준을 정한다.
