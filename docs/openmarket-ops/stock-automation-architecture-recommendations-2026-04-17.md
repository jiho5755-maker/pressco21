# PRESSCO21 stock/soldout automation architecture recommendations

> 작성일: 2026-04-17 KST
> 목적: MakeShop, SmartStore, 11st의 본상품/옵션/추가상품 품절 변경을 매번 AI에게 맡기지 않고, 결정적 데이터 모델 + 승인형 자동화로 운영하는 기준안을 정한다.
> 입력: `.omx/context/stock-automation-architecture-20260417T000000Z.md`, 기존 품절 리포트, 공개 벤치마크 확인.

---

## 1. 결론 요약

1. **내부 `Stock Control Plane`을 만든다.**
   - 기준 재고/품절 판단은 내부 DB가 소유하고, MakeShop/SmartStore/11st는 채널별 실행 대상이다.
   - LLM은 예외 분석·정책 변경·리포트 작성에만 쓰고, 반복 품절 작업은 스크립트/n8n 워크플로로 처리한다.
2. **SKU 단위부터 다시 고정한다.**
   - PlayAuto 도움말처럼 SKU는 재고관리 최소 단위이며, 옵션 상품은 옵션별 SKU가 있어야 정확히 차감·자동 품절이 가능하다.
   - `50g 꽃 레진`은 소형 꽃 레진 자동화 그룹에서 명시적으로 제외한다.
3. **채널 쓰기 권한을 capability gate로 막는다.**
   - MakeShop: 본상품 재고와 추가/옵션 재고 row 쓰기 검증 경로를 우선 자동화한다.
   - SmartStore: `channelProductNo` 단위 캐시 + 필요한 상품만 상세 조회/수정한다. 전체 상세 스캔은 429 위험 때문에 금지한다.
   - 11st: 현재 키가 주문/클레임 중심이고 상품 API는 `-997` 권한 문제이므로, 상품/품절 write는 비활성화하고 수동 큐 또는 OMS 경유로 둔다.
4. **Sabanet/PlayAuto를 바로 대체하지 말고, 2주 내부 MVP 후 구매 판단한다.**
   - 사방넷·플레이오토급 제품은 상품/주문/고객/출고/재고 통합을 제공하므로 장기 후보로 본다.
   - 단, PRESSCO21에는 이미 MakeShop/SmartStore API 실험 자산이 있으므로 내부 control plane + 상용 OMS 실행 레일의 하이브리드가 가장 안전하다.

---

## 2. 목표 아키텍처

```text
운영자 승인 / CSV / 주문 차감 이벤트
        ↓
Stock Control Plane
  - SKU master
  - channel listing mapping
  - stock policy / safety stock
  - desired state / diff plan
  - approval / audit / rollback log
        ↓
채널 adapter queue
  - MakeShop adapter
  - SmartStore adapter
  - 11st manual/OMS adapter
        ↓
채널별 관리자/API
```

핵심은 **상품 상세를 매번 AI로 읽고 판단하는 방식**을 버리고, 아래 순서로 고정하는 것이다.

1. 내부 SKU 기준으로 변경 의도를 만든다.
2. 채널 매핑에서 실제 변경 대상 row를 찾는다.
3. 채널별 현재 상태 cache와 비교해 no-op을 제거한다.
4. dry-run diff를 운영자에게 보여준다.
5. 승인 후 제한된 job queue가 API write를 실행한다.
6. 결과와 원본 응답을 감사 로그에 저장한다.

---

## 3. Canonical data model v1

### 3.1 핵심 테이블

| 테이블 | 역할 | 필수 필드 |
|---|---|---|
| `sku_master` | 내부 재고 기준 SKU | `sku_id`, `sku_code`, `name`, `family`, `variant_attrs_json`, `unit`, `lifecycle_status`, `automation_group`, `is_excluded_from_auto_soldout` |
| `sku_component` | 세트/키트/추가상품 구성 | `parent_sku_id`, `component_sku_id`, `qty`, `component_role` |
| `inventory_balance` | 창고/원천별 수량 | `sku_id`, `stock_node`, `qty_on_hand`, `qty_reserved`, `qty_available`, `safety_stock`, `updated_at` |
| `channel_listing` | 채널 상품/옵션/추가상품 매핑 | `channel`, `account_id`, `channel_product_id`, `channel_option_id`, `channel_addon_id`, `listing_type`, `sku_id`, `write_capability`, `last_seen_hash` |
| `stock_policy` | 품절/재입고 판단 정책 | `sku_id`, `soldout_when`, `restock_when`, `safety_stock`, `manual_hold`, `notes` |
| `stock_change_intent` | 운영자가 요청한 변경 의도 | `intent_id`, `requested_by`, `source`, `sku_id`, `desired_status`, `desired_qty`, `reason`, `approval_status` |
| `stock_change_plan` | 채널별 diff 결과 | `plan_id`, `intent_id`, `channel_listing_id`, `before_state_json`, `after_state_json`, `risk_level`, `idempotency_key` |
| `stock_write_log` | 실행/audit/rollback | `plan_id`, `channel`, `request_hash`, `response_code`, `response_summary`, `trace_id`, `rollback_payload_json`, `secret_redacted` |

### 3.2 매핑 원칙

- **SKU는 재고의 최소 단위**다. 옵션이 있는 상품은 옵션마다 SKU를 만들고, 추가상품/사은품/세트 구성은 `sku_component`로 분리한다.
- **채널 상품 ID는 SKU가 아니다.** MakeShop 상품번호, SmartStore `channelProductNo`, 11st 상품번호는 `channel_listing`에만 둔다.
- **옵션/추가상품은 listing type으로 구분한다.**
  - `main_product`
  - `option`
  - `addon` / `supplement`
  - `bundle_component`
- **자동화 제외는 데이터로 표현한다.** 예: `flower-resin-small` 자동화 그룹에는 10g/소형 SKU만 넣고, 50g 신상품은 `is_excluded_from_auto_soldout=true` 또는 별도 `automation_group=flower-resin-50g`로 분리한다.

---

## 4. Channel execution design

### 4.1 MakeShop

- 현재 확인된 사실: 본상품 stock API와 addition stock row 변경이 동작했다.
- 권장 방식:
  1. MakeShop product/addition row를 `channel_listing`에 저장한다.
  2. 변경 전 `before_state_json` snapshot을 남긴다.
  3. 본상품과 addition row를 같은 plan 안에 묶되, API 호출은 row 단위 idempotency key로 실행한다.
  4. 실패 시 성공 row와 실패 row를 분리해 재시도하고, 성공분은 rollback payload를 남긴다.

### 4.2 SmartStore

- 현재 확인된 사실: 상품 상태와 `supplementProductInfo` 업데이트는 가능했지만, 전체 상세 스캔은 429 위험이 있다.
- 권장 방식:
  1. `channelProductNo`와 supplement/add-on 식별자를 cache한다.
  2. 변경 후보 SKU가 있을 때만 해당 상품 상세를 조회한다.
  3. `last_seen_hash`가 변하지 않았고 원하는 상태가 이미 반영되어 있으면 write를 건너뛴다.
  4. write 전에 `supplementProductInfo` 전체 구조를 보존해 부분 누락으로 부가상품이 사라지는 사고를 막는다.
  5. 429는 실패가 아니라 backoff 이벤트로 보고, job을 지연 재시도한다.

### 4.3 11st

- 현재 확인된 사실: 보유 키는 orders/claims는 가능하나 product API 후보가 `-997` 등록 API 정보 누락으로 막혔다.
- 권장 방식:
  - `write_capability=disabled`로 유지한다.
  - 내부 plan은 만들되 실행은 `manual_queue`로 내보낸다.
  - 11st 상품 API 범위가 열리면 sandbox/dry-run 검증 후 capability를 `doc_only → verified`로 승격한다.
  - 단기간에 11st까지 자동 품절이 필수이면 Sabanet/PlayAuto 같은 OMS 실행 레일을 파일/API 중계로 붙이는 방안을 우선 검토한다.

---

## 5. Rate-limit and cost-safe automation

| 위험 | 방지책 |
|---|---|
| SmartStore 429 | 채널/엔드포인트별 token bucket, 동시성 1~2, `GNCP-GW-RateLimit-*`/`GNCP-GW-Quota-*` 헤더 수집, jitter backoff, circuit breaker |
| 불필요한 API 비용 | desired/current hash 비교로 no-op 제거, SKU 변경분만 조회, 일일 reconciliation은 저빈도 배치 |
| LLM 토큰 낭비 | LLM 호출 금지 경로: SKU 매핑, diff 생성, API payload 작성, 재시도. LLM 허용 경로: 예외 묶음 분석, 정책 변경 초안, 회의 리포트 |
| 잘못된 대량 품절 | dry-run 기본, 영향 SKU/채널/매출 위험 표시, high-risk plan은 2인 승인 |
| 외부 IP allowlist | 실제 API write는 Oracle/public execution plane에서만 실행; 로컬은 dry-run과 테스트 payload 생성만 허용 |
| 비밀 유출 | request/response log는 secret redaction 후 저장, raw credential 출력 금지 |

### 5.1 Job policy

- `read_sync`: 낮은 우선순위, watermark 기반, 실패해도 write 중단하지 않음.
- `write_plan`: 운영자 승인 전까지 dry-run만 가능.
- `write_execute`: 승인된 plan만 실행, idempotency key 필수.
- `reconcile`: 하루 1회 채널 상태와 내부 desired state drift 보고.
- `emergency_hold`: 특정 SKU/상품군 자동화를 즉시 중지하는 kill switch.

---

## 6. Approval, audit, rollback

### 6.1 Approval gates

| 변경 유형 | 승인 기준 |
|---|---|
| 단일 SKU, 단일 채널, no revenue risk | 담당자 1인 승인 |
| 다중 채널 또는 옵션/추가상품 동시 변경 | 담당자 1인 + dry-run 확인 |
| 상품군 전체 품절/재입고, 10개 이상 listing 영향 | 2인 승인 |
| 50g 신상품 포함 또는 자동화 제외 그룹 변경 | 관리자 승인 필수 |

### 6.2 Audit log 최소 요건

- 누가, 언제, 어떤 사유로 변경했는지
- 내부 SKU와 채널 listing ID
- 변경 전/후 상태
- API request hash와 응답 요약
- SmartStore Trace ID 또는 채널별 오류 코드
- rollback 가능 여부와 rollback payload
- secret redaction 여부

---

## 7. Buy-vs-build roadmap

### Phase 0: 1~2주 내부 MVP

- `sku_master`, `channel_listing`, `stock_change_plan`, `stock_write_log`를 NocoDB/Postgres에 만든다.
- MakeShop + SmartStore만 dry-run/write 연결한다.
- 50g 꽃 레진은 자동화 그룹에서 제외한다.
- 일일 drift report를 만든다.
- 11st는 manual queue로만 운영한다.

### Phase 1: 3~6주 운영 안정화

- 승인 화면, rollback, retry dashboard, kill switch를 붙인다.
- 주문 차감 이벤트와 안전재고 정책을 연결한다.
- SmartStore 상세 조회 cache와 429 backoff를 운영 지표로 본다.
- 11st product API 권한 신청/확인 또는 OMS pilot을 병행한다.

### Phase 2: 6~12주 하이브리드/상용 OMS 평가

- Sabanet/PlayAuto 후보를 같은 체크리스트로 평가한다.
- 평가 기준:
  - SKU/옵션/추가상품/세트상품 모델 적합성
  - MakeShop, SmartStore, 11st 품절 write 지원 여부
  - API/파일 export 가능성 및 내부 DB 소유권
  - 승인/audit/rollback 지원 수준
  - API 호출 비용, 스케줄러 비용, 429 회피 방식
  - PRESSCO21 직원이 실제로 유지 가능한 운영 화면인지
- 구매하더라도 내부 `Stock Control Plane`은 남겨서 정책·감사·예외 관리를 소유한다.

---

## 8. Benchmark notes

- Sabanet 공개 소개는 다수 쇼핑몰 상품 등록/수정, 주문/클레임, 재고/배송관리를 통합하는 OMS/WMS 방향이다. 이는 PRESSCO21이 직접 만들려는 반복 품절 작업 자동화보다 넓은 범위다.
- Connectwave는 PlayAuto를 주문, 상품, 고객, 출고, 재고관리를 하나로 지원하는 통합 솔루션으로 소개한다.
- PlayAuto 도움말은 SKU를 재고관리 최소 단위로 설명하고, 옵션에 SKU를 매칭하면 주문 수집 시 자동 매칭/재고 차감 및 SKU 재고에 따른 자동 품절 처리가 가능하다고 안내한다.
- Naver Commerce API 문서는 최신 버전 선택 UI와 상품 API 그룹을 제공하며, 문제 해결 문서는 429 `GW.RATE_LIMIT`/`GW.QUOTA_LIMIT`를 요청량 제한 초과로 설명한다. GitHub 공지에는 혼잡 상황에서도 429가 나올 수 있으므로 header만 믿지 말라는 점이 명시되어 있다.

참조 URL:

- [Naver Commerce API docs](https://apicenter.commerce.naver.com/docs/commerce-api/2.73.0)
- [Naver Commerce API troubleshooting](https://apicenter.commerce.naver.com/docs/trouble-shooting)
- [Naver Commerce API 429 notice](https://github.com/commerce-api-naver/commerce-api/discussions/1538)
- [Connectwave seller commerce overview](https://connectwave.co.kr/business_seller.html)
- [PlayAuto SKU code help](https://www.plto.com/customer/HelpDesc/gmp/564/)
- [PlayAuto SKU matching help](https://www.plto.com/customer/HelpDesc/gmp/9956/)
- [Sabanet shopping-mall management](https://www.sabangnet.co.kr/service-intro/shopping-mall-management)

---

## 9. Meeting recommendation

회의에서는 아래 한 문장으로 의사결정하면 된다.

> “PRESSCO21은 재고/품절 기준과 감사는 내부 Stock Control Plane이 소유하고, MakeShop/SmartStore는 직접 adapter로 자동화하며, 11st는 product 권한 확보 전까지 manual/OMS 경유로 둔다. Sabanet/PlayAuto 구매 여부는 2주 MVP 후 SKU·승인·감사·11st 지원 체크리스트로 판단한다.”

즉시 실행 항목:

1. 꽃 레진 10g/소형 SKU와 50g SKU를 서로 다른 `automation_group`으로 등록한다.
2. MakeShop/SmartStore 상위 20개 품절 빈발 상품부터 `channel_listing` 매핑을 만든다.
3. dry-run diff report를 먼저 운영자에게 보여주고, 승인된 plan만 Oracle 실행 plane에서 write한다.
4. SmartStore 전체 상세 스캔을 중단하고, 변경 후보 상품만 조회하도록 job policy를 바꾼다.
5. 11st는 상품 API 권한 확보 전까지 자동 write 범위에서 제외한다.
