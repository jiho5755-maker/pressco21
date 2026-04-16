# 재고·상품 마스터 재구축 설계서 초안 (2026-04-17)

> 작성: Claude Code (진단 문서 `inventory-data-diagnosis-2026-04-17.md` 후속)
> 전제: `openclaw-pressco21-central-product-master-plan.ko.md` (2026-03-24)의 NocoDB 8테이블 구조 채택
> 용도: 지호님 판단 후 n8n WF + NocoDB 스키마 작업을 착수하기 위한 초안

---

## 1. 목표

단일 진실 원장(SSOT)을 **NocoDB Postgres**에 만들어:

- 재고 원천을 **사방넷 엑셀 → NocoDB**로 승격
- 모든 오픈마켓(쿠팡/스마트스토어/11번가) + 메이크샵이 **동일 재고 기준**을 바라보도록 통일
- 쿠팡 로켓(FBR) 이원화를 **자동화 가능한 구조**로 미리 설계

---

## 2. 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                  NocoDB Postgres (SSOT)                      │
│                                                               │
│   tbl_Products ──→ tbl_Product_Variants ──→ tbl_Source_Items│
│                         │                                     │
│                         ├──→ tbl_Cost_Profiles               │
│                         ├──→ tbl_Channel_Listings            │
│                         ├──→ tbl_Fulfillment_Allocation (신규)│
│                         └──→ tbl_Inventory_Snapshots (신규)   │
└─────────────────────────────────────────────────────────────┘
          ↑                              ↑
    n8n WF (pull)                  n8n WF (push)
          │                              │
   ┌──────┴──────┐              ┌───────┴──────────┐
   │  사방넷      │              │  각 오픈마켓 API   │
   │  (원천)      │              │  (채널 리스팅·재고) │
   └─────────────┘              └──────────────────┘
          │                              │
  엑셀 자동 upload or          smartstore: OAuth+bcrypt (verified)
  scraping (pending)           coupang: HMAC (PoC 필요)
                               makeshop: doc_only (PoC 필요)
                               11st: docs 부족 (보류)
```

---

## 3. NocoDB 테이블 스키마 (Postgres)

### 3-1. 기존 계획에 있던 8테이블 (central-product-master-plan 기반)

| 테이블 | 역할 | 핵심 키 |
|--------|------|---------|
| `tbl_Products` | 대표 상품 | `canonical_product_id` |
| `tbl_Product_Variants` | 옵션·SKU | `variant_id`, `sku_code`, `makeshop_branduid`, `sabang_product_code` |
| `tbl_Source_Items` | 중국 사입 원천 | `source_item_id`, `1688_url` |
| `tbl_Supplier_Order_History` | 사입 이력 | `source_item_id`, `주문일` |
| `tbl_Import_Shipments` | 수입 서류 | `shipment_id` |
| `tbl_Cost_Profiles` | 원가 원장 | `variant_id`, `verified_at` |
| `tbl_Channel_Listings` | 채널별 판매가·상태 | `variant_id`, `channel_name` |
| `tbl_Price_Reviews` | 가격 검토 히스토리 | `variant_id` |

### 3-2. 재고 자동화용 신규 테이블 2개 (본 설계서 추가 제안)

#### `tbl_Inventory_Snapshots`

시점별 재고 스냅샷. 다른 채널이 sync 기준으로 삼는다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `snapshot_id` | uuid | PK |
| `variant_id` | uuid | FK → tbl_Product_Variants |
| `source` | enum | `sabang`, `manual`, `makeshop`, `smartstore`, `coupang` |
| `qty_total` | int | 총 보유 수량 |
| `qty_allocated` | int | 예약·이관된 수량 (FBR 등) |
| `qty_available` | int (generated) | = `qty_total - qty_allocated` |
| `captured_at` | timestamptz | 스냅샷 시점 |
| `source_ref` | text | 원천 참조 (엑셀 파일명·API 응답 ID) |

#### `tbl_Fulfillment_Allocation`

FBR 등 채널별 예약 재고 추적.

| 필드 | 타입 | 설명 |
|------|------|------|
| `allocation_id` | uuid | PK |
| `variant_id` | uuid | FK |
| `warehouse_type` | enum | `sabang_hq`, `coupang_fbr`, `naver_shipping_plus` |
| `allocated_qty` | int | 예약 수량 |
| `allocated_at` | timestamptz | |
| `status` | enum | `pending`, `in_transit`, `active`, `returned` |

---

## 4. 이관 절차 (Phase 1)

### Step 1. NocoDB 스키마 생성 (n8n WF 불필요, NocoDB UI 수동 1회)

- 베이스: 신규 Postgres 베이스 `inventory_master` 생성 (기존 `shop_bi`와 분리)
- 8 + 2 = 10 테이블 DDL은 별도 첨부 예정 (지호님 승인 후)

### Step 2. SKU마스터_통합데이터.xlsx → NocoDB 1차 적재

n8n WF 초안:
```
[Trigger: Manual]
  ↓
[Read Binary File: SKU마스터_통합데이터.xlsx]
  ↓
[Extract From File: Sheet1 → JSON]
  ↓
[Code: 정제]
  - 중복 SKU 324 → 첫 번째 행만 보존, 나머지 `dup_log` 테이블로
  - 원가 충돌 305 → 최신 `verified_at` 기준 남기기
  - 사방넷코드 누락 333 → `flag: needs_sabang_match`
  ↓
[Split: tbl_Products, tbl_Product_Variants, tbl_Cost_Profiles]
  ↓
[NocoDB: Upsert (3 테이블 동시)]
  ↓
[Telegram: 적재 요약 → 지호님]
```

### Step 3. 사방넷 코드 역매칭 (이재혁 과장 협업)

- `flag: needs_sabang_match` 333건 리스트 생성
- 사방넷 어드민에서 역매칭 후 `품번코드매핑관리_수정파일.xlsx` 갱신
- 재차 upsert

### Step 4. verified_ready 20개 상품 파일럿

- 전체 2,153개 중 핵심 상품 20개만 `verified_ready=true`로 승격
- 이 20개로 가격 검토·채널 listing 테스트

---

## 5. 사방넷 연동 대안 (Phase 2)

### 대안 A: 공식 API (가능 시)

- 사방넷 어드민 로그인 → API 신청 가능 여부 확인
- 공식 API 있으면 n8n WF로 일 1회 재고 pull

### 대안 B: Scraping (공식 API 없는 경우)

- Chrome MCP (claude-in-chrome) + Playwright로 사방넷 어드민 재고 페이지 스크레이핑
- 엑셀 다운로드 자동화 → n8n 적재
- 주의: 사방넷 이용약관 위반 가능성 → 조현우 법무 검토 필요

### 대안 C: 수동 일간 업로드 (단기)

- 이재혁 과장 매일 아침 엑셀 다운로드 → Nextcloud 업로드
- n8n WF가 Nextcloud 감시 → 자동 파싱·upsert
- 사람 수동 단계가 있지만 SSOT는 유지됨

---

## 6. 쿠팡 로켓(FBR) 이원화 자동화 (Phase 4)

Phase 1~3 완료 후 착수:

```
[쿠팡 창고 이관 접수]
  ↓
[tbl_Fulfillment_Allocation INSERT]
  - warehouse_type: coupang_fbr
  - allocated_qty: N
  - status: in_transit
  ↓
[tbl_Inventory_Snapshots 자동 갱신]
  - qty_allocated += N
  - qty_available -= N
  ↓
[타 채널 sync (스마트스토어·메이크샵·11번가)]
  - 전송 재고 = qty_available
  ↓
[쿠팡 sync]
  - 전송 재고 = FBR 창고 수량 (쿠팡 측 자동 관리)
```

**핵심 원칙**: 타 채널에는 항상 `qty_available` (FBR 차감 후)만 노출.

---

## 7. 테스트·검증 계획

### 7-1. 정합성 테스트

- [ ] 동일 SKU의 `tbl_Product_Variants` 행이 1개인지 (중복 324 해소 확인)
- [ ] 동일 `variant_id`의 `tbl_Cost_Profiles` 최신 `verified_at` 1개만 활성인지
- [ ] `tbl_Inventory_Snapshots` `qty_available` 음수 없는지

### 7-2. 동기화 테스트

- [ ] 스마트스토어 재고 pull → NocoDB 반영
- [ ] NocoDB 재고 변경 → 스마트스토어 push
- [ ] FBR 이관 시 타 채널 `qty_available` 즉시 감소

### 7-3. 롤백 계획

- 이관 실패 시: NocoDB 베이스 drop, 엑셀 원본은 읽기전용 유지되므로 데이터 손실 없음
- Staging 베이스에서 선 테스트 후 운영 승격

---

## 8. 예상 작업 공수

| Phase | 작업 | 예상 공수 |
|-------|------|----------|
| 1-Step1 | NocoDB 스키마 생성 | 0.5일 |
| 1-Step2 | 엑셀 → NocoDB WF | 1일 |
| 1-Step3 | 사방넷 코드 역매칭 | 2~3일 (이재혁 과장 협업) |
| 1-Step4 | verified_ready 20개 | 1일 |
| 2 | 사방넷 연동 (대안 A) | 2주 / (대안 B) 1주 / (대안 C) 2일 |
| 3 | 오픈마켓 API 동기화 (채널당) | 3~5일 × 3채널 |
| 4 | FBR 이원화 | 1주 |
| **합계** | — | **4~7주 (채널 순차 진행 시)** |

---

## 9. 지호님 판단 필요 항목 (재게시)

| # | 항목 | 제안 |
|---|------|------|
| 1 | Phase 1 즉시 착수? | **권고: Yes** — 쿠팡 PoC 기초가 되므로 |
| 2 | 사방넷 연동 대안 | **권고: C (수동 일간) → A (공식 API 확인) 전환** |
| 3 | 중복 SKU 324 정제 담당 | 이재혁 과장 + 장지호 샘플링 검수 |
| 4 | 쿠팡 PoC 연기 여부 | **권고: Phase 1 완료 후 PoC 진행** (1~2주 지연) |
| 5 | NocoDB 베이스 신규 생성 승인 | `inventory_master` Postgres 베이스 |
| 6 | 조현우 법무 검토 | scraping 방식 선택 시 사방넷 약관 검토 |

---

## 10. 관련 문서

- 진단: `docs/openmarket-ops/inventory-data-diagnosis-2026-04-17.md`
- 원 설계: `openclaw-project-hub/03_openclaw_docs/openclaw-pressco21-central-product-master-plan.ko.md`
- 연계마스터 감사: `openclaw-project-hub/03_openclaw_docs/openclaw-pressco21-linked-master-audit.ko.md`
- OMX Capability: `docs/openmarket-ops/omx-channel-capability-matrix-v1.md`
- 팀미팅 회의록: `team/meeting-logs/2026-04-16-쿠팡로켓배송-등록우선순위.md`
