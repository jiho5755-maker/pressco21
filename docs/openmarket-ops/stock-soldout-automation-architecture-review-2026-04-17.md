# PRESSCO21 재고/품절 자동화 아키텍처 리뷰 — 2026-04-17

> 입력 컨텍스트: `.omx/context/stock-automation-architecture-20260417T000000Z.md`  
> 목적: MakeShop, SmartStore, 11번가의 메인상품/옵션/추가상품 품절 관리를 LLM 반복 작업이 아니라 결정적 워크플로우로 전환한다.

---

## 1. 결론 요약

1. **단기 정답은 “자체 경량 재고 운영 레이어 + 승인형 실행”이다.**  
   사방넷/플레이오토형 OMS를 즉시 대체하려고 하지 말고, PRESSCO21이 이미 검증한 MakeShop/SmartStore API를 중심으로 `재고 변경 계획 → 사람 승인 → 채널별 실행 → 감사 로그`를 먼저 고정한다.
2. **LLM은 API 실행자가 아니라 예외 분석자여야 한다.**  
   정기 품절/해제/추가상품 변경은 스크립트·n8n·작업 큐가 처리하고, LLM은 매핑 불일치·정책 변경·에러 원인 요약에만 사용한다.
3. **핵심 데이터는 “상품명”이 아니라 canonical SKU/구성품 매핑이다.**  
   MakeShop `branduid/options.basic/addition`, SmartStore `originProduct/channelProduct/supplementProductInfo`, 11번가 상품코드를 내부 SKU와 분리 저장해야 한다.
4. **11번가는 현 키로 상품 API가 막힌 상태이므로 자동 품절 write 범위에서 제외한다.**  
   현재 `ST11_API_KEY`가 주문/클레임 중심이면 11번가 재고 write는 수동 큐 또는 사방넷/상용 OMS 경유로 둔다.
5. **50g 신규 꽃 레진은 별도 SKU family로 격리한다.**  
   “작은 꽃 레진 품절 자동화”는 10g/소용량 family만 대상으로 하고, 50g은 명시적 allowlist가 생길 때까지 제외한다.

---

## 2. 현재 코드/운영 품질 리뷰

### 잘 된 점

- `tools/stock_cleanup.py`는 API 직접 호출과 로컬 JSON 입력을 모두 지원해 **read-only 진단과 재현 테스트**가 가능하다.
- `--rate-delay` 기본값이 있어 MakeShop 페이지 수집 시 최소한의 호출 간격을 둔다.
- 출력이 CSV 3종 + `manifest.json`으로 나뉘어 운영자가 액션 버킷을 검토하기 쉽다.
- 개인결제/강사공간 제외 로직이 있어 운영 예외를 코드에 반영한 선례가 있다.

### 보완할 점

- 현재 스크립트는 **MakeShop 단일 채널 진단 도구**에 가깝고, SmartStore/11번가/사방넷 SKU와 이어지는 canonical model이 없다.
- `sto_state_code` 중심의 판정은 가능하지만, `sto_real_stock`, 안전재고, 무한재고, add-on/supplement 소진 규칙을 별도 정책으로 분리하지 않았다.
- 자동 write 전 단계인 `change_plan`, `approval`, `idempotency_key`, `rollback_snapshot`이 없다.
- 50g 꽃 레진 같은 신규 제외 규칙은 이름 매칭이 아니라 **SKU family allowlist/denylist**로 관리해야 한다.
- 테스트가 샘플 실행 수준에 머물러 있어, 옵션/추가상품/무한재고/부분품절 회귀 케이스를 `pytest`로 고정하는 것이 좋다.

---

## 3. 권장 canonical 데이터 모델

### 3.1 핵심 엔티티

| 엔티티 | 목적 | 주요 필드 |
|---|---|---|
| `sku` | 내부 재고/원가의 기준 단위 | `sku_id`, `sku_name`, `family`, `unit_size`, `active`, `safety_stock`, `sellable_policy` |
| `stock_item` | 실제 재고를 움직이는 단위 | `stock_item_id`, `sku_id`, `on_hand`, `reserved`, `available`, `source_system`, `updated_at` |
| `bundle_component` | 세트/구성품/추가상품 차감 규칙 | `parent_sku_id`, `component_sku_id`, `quantity`, `component_role` |
| `channel_listing` | 채널 상품/옵션 식별자 | `channel`, `listing_id`, `product_id`, `option_id`, `addon_id`, `status`, `last_seen_at` |
| `channel_sku_map` | 채널 row와 내부 SKU 연결 | `channel_listing_id`, `sku_id`, `mapping_type`, `confidence`, `effective_from`, `effective_to` |
| `stock_policy` | 품절/해제 판단 규칙 | `sku_family`, `channel`, `min_available`, `auto_soldout`, `auto_reopen`, `exclude_reason` |
| `stock_change_plan` | 실행 전 변경안 | `plan_id`, `mode`, `target_channel`, `diff`, `risk_level`, `created_by`, `approval_status` |
| `stock_change_log` | 감사/복구 로그 | `plan_id`, `request_hash`, `before_snapshot`, `after_snapshot`, `result`, `actor`, `executed_at` |

### 3.2 채널별 매핑 포인트

| 채널 | 메인상품 | 옵션/구성 | 추가상품/부가상품 | 현재 운영 판단 |
|---|---|---|---|---|
| MakeShop | `uid`/`branduid` | `options.basic[].sto_code`, `sto_opt_values`, `sto_state_code`, `sto_real_stock` | `options.option[]` 중 `opt_type=ADDITION`, addition stock row | product + addition stock API 동작 확인됨. 우선 write 대상. |
| SmartStore | `originProductNo`, `channelProductNo` | option combination row | `supplementProductInfo` | status/supplement update 동작 확인됨. full detail scan 429 회피 필요. |
| 11번가 | seller product id | option id | seller-defined add-on 여부 추가 확인 필요 | 현 키는 product API 권한 부족. 자동 write 제외, manual/OMS 경유. |
| Sabanet/PlayAuto 벤치마크 | 통합 상품코드 | 옵션/세트 SKU | 재고/품절 일괄 전송 | PRESSCO21 자체 레이어가 따라야 할 기준은 “대량 변경 + 실재고/안전재고 + 감사”이다. |

### 3.3 꽃 레진 10g/50g 분리 규칙

- `sku.family = flower_resin_small`에는 현재 자동화 대상인 소용량 SKU만 넣는다.
- 50g 신규 상품은 `sku.family = flower_resin_50g`로 분리하고, `stock_policy.auto_soldout=false`를 기본값으로 둔다.
- 자동화 대상은 이름 검색이 아니라 `stock_policy` allowlist로 결정한다.
- 새 상품 등록 시 `mapping_status=review_required`이면 어떤 자동 write도 금지한다.

---

## 4. rate-limit/cost-safe 자동화 설계

### 4.1 처리 흐름

```text
source snapshot 수집
→ canonical mapping join
→ desired state 계산
→ change_plan 생성
→ dry-run diff/위험도 표시
→ 사람 승인
→ 채널별 rate-limited executor 실행
→ 결과/스냅샷/rollback hint 저장
→ 텔레그램/대시보드 요약
```

### 4.2 호출량 절감 원칙

- **증분 수집 우선**: SmartStore는 전체 detail scan을 피하고, 변경 후보 SKU만 상세 조회한다.
- **캐시 TTL 분리**: 상품 기본정보는 긴 TTL, 재고/상태는 짧은 TTL, 실패 응답은 backoff TTL을 둔다.
- **token bucket per channel**: MakeShop, SmartStore, 11번가별 동시성/분당 호출량을 별도 설정한다.
- **idempotency key**: 동일 SKU·채널·목표상태 변경은 중복 실행하지 않는다.
- **batch sizing**: 채널이 bulk update를 제공하면 bulk를 쓰되, 실패 시 row 단위 재시도 큐로 쪼갠다.
- **429/5xx backoff**: exponential backoff + jitter를 기본으로 하고, 429 발생 시 같은 채널 큐를 잠시 멈춘다.
- **secret-safe logging**: URL query, headers, token, raw customer data를 로그에 남기지 않는다.

### 4.3 LLM 사용 위치

| 사용 금지 | 사용 가능 |
|---|---|
| 매번 전체 상품 목록을 AI에게 붙여넣고 품절 변경 지시 | 불일치 row 10~30건의 원인 요약 |
| AI가 직접 API write payload 생성 | 이미 생성된 deterministic diff의 위험도 설명 |
| 채널 에러마다 프롬프트로 재시도 | 에러 유형 클러스터링과 운영자 대응 문안 작성 |

---

## 5. buy-vs-build 로드맵

### Phase 0 — 즉시 안정화 (1~2주)

- `tools/stock_cleanup.py`를 기준으로 read-only audit를 정례화한다.
- NocoDB에 `sku`, `channel_listing`, `channel_sku_map`, `stock_change_plan`, `stock_change_log` 최소 테이블을 만든다.
- MakeShop/SmartStore만 `DRY_RUN` change plan을 만든다.
- 50g 꽃 레진 제외 정책을 allowlist로 먼저 고정한다.

### Phase 1 — 승인형 자동 실행 (2~4주)

- n8n 또는 경량 Python worker에서 `plan → approve → execute`를 구현한다.
- Oracle/public execution plane에서 실행해 IP allowlist/API 제약을 맞춘다.
- MakeShop main/addition stock, SmartStore status/supplement update만 live write를 연다.
- 11번가는 권한 확보 전까지 “수동 처리 큐 + 로그”만 둔다.

### Phase 2 — worker service 고도화 (1~2개월)

- 호출량/동시성/재시도 제어가 n8n으로 복잡해지면 FastAPI/Celery 또는 Node worker로 분리한다.
- channel adapter interface를 만들고, 모든 write는 `stock_change_plan`에서만 시작되게 한다.
- pytest로 옵션/추가상품/부분품절/무한재고/제외 SKU 회귀 테스트를 고정한다.

### Phase 3 — 상용 OMS 재평가

Sabanet/PlayAuto류 상용 솔루션 도입은 아래 중 2개 이상이 발생할 때 재검토한다.

- 11번가/쿠팡/추가 오픈마켓까지 write 자동화가 확대된다.
- 주문/송장/클레임/CS/재고가 한 화면에서 동시에 필요해진다.
- 채널별 API 변경 대응이 월 1회 이상 운영 부담으로 나타난다.
- 안전재고/실재고/세트재고/입출고 모바일 처리가 자체 구축보다 비싸진다.

그 전까지는 “상용 OMS를 사방넷 대체 후보로 검토하되, PRESSCO21 특화 품절 정책과 승인 로그는 자체 레이어로 보존”하는 편이 비용 대비 안전하다.

---

## 6. 거버넌스 체크리스트

- [ ] 모든 live write는 `approval_status=APPROVED`인 `stock_change_plan`에서만 실행한다.
- [ ] `DRY_RUN`이 기본값이고, `LIVE_SEND`는 채널·SKU family별 feature flag로만 켠다.
- [ ] 각 실행은 `before_snapshot`, `after_snapshot`, `request_hash`, `actor`를 남긴다.
- [ ] 50g 꽃 레진처럼 신규/예외 SKU는 `mapping_status=review_required`로 시작한다.
- [ ] API key, license key, customer/order PII는 로그·문서·CSV에 남기지 않는다.
- [ ] 429/권한 오류가 발생한 채널은 자동으로 degraded 상태가 되고, 다른 채널 큐와 격리한다.
- [ ] rollback은 “이전 snapshot으로 되돌리는 새 plan”으로 만들고, 로그 삭제로 처리하지 않는다.

---

## 7. 다음 회의에서 바로 결정할 것

1. 내부 SKU의 기준을 `사방넷 SKU`로 둘지, PRESSCO21 별도 `sku_id`를 만들고 사방넷을 mapping으로 둘지 결정한다.
2. MakeShop addition stock과 SmartStore supplementProductInfo를 같은 `bundle_component`로 볼지, 채널별 add-on mapping으로 분리할지 결정한다.
3. 50g 꽃 레진 제외 대상의 상품코드/SKU코드를 확정해 allowlist/denylist에 넣는다.
4. Phase 0 저장소를 NocoDB로 시작할지, 바로 SQLite/Postgres 기반 worker로 시작할지 결정한다.
5. 11번가 product API 권한을 추가 신청할지, 당분간 사방넷/수동 처리로 둘지 결정한다.
