# 재고·상품 데이터 파이프라인 진단 (2026-04-17)

> 작성: Claude Code (최민석 CTO 산하 makeshop/n8n 크로스 감사)
> 계기: 2026-04-16 팀미팅 "쿠팡 로켓배송 등록 우선순위"에서 기초로 삼은 재고 데이터에 오류 다수 발견 → 재구축 필요성 대두
> 범위: 사방넷(원장) + 메이크샵 + 쿠팡 + 네이버 스마트스토어 + 11번가

---

## 1. 결론 요약

**현재 재고·상품 데이터는 "단일 진실 원장(SSOT) 부재" 상태다.**

팀미팅에서 쿠팡 로켓 대상 "776 SKU → 230~310개 유효"로 산정한 수치는 아래 오류가 정리되지 않은 staging 엑셀 기준이므로, 실제 출고 가능 재고와 괴리가 있다. 재고 마스터 재구축이 **쿠팡 PoC보다 선행**되어야 한다.

---

## 2. 데이터 소스 현황

### 2-1. 현재 재고·상품 데이터 위치 (흩어짐)

| # | 경로 | 역할 | 상태 |
|---|------|------|------|
| 1 | `~/Desktop/프레스코21/제품 단가 샘플리스트` | 중국 사입 이력 | 엑셀 원본, 수동 관리 |
| 2 | `~/Desktop/프레스코21/우리무역/2025년서류` | 수입 서류 (관세·원산지) | PDF/엑셀, 수동 |
| 3 | `~/Downloads/1688-SKU-메이크샵_연계마스터.xlsx` | 메이크샵 ↔ 1688 연결 | 중복 SKU 324, 원가 충돌 305 |
| 4 | `~/Downloads/품번코드매핑관리_수정파일.xlsx` | 사방넷 품번 ↔ 상품코드 | 수동 갱신 |
| 5 | `~/Desktop/프레스코21/사방넷/사방넷단품대량수정_SKU매칭.xlsx` | 사방넷 옵션/SKU 매칭 | 엑셀 일괄 수정용 |
| 6 | `~/Downloads/SKU마스터_통합데이터.xlsx` | 통합 시도 (2,477행) | 부분매핑 148, 사방넷코드 누락 333 |
| 7 | `~/workspace/OMX(오_마이_코덱스)/oh-my-codex/output/spreadsheet/pressco21-central-product-master.staging.xlsx` | staging 마스터 | 2026-03-24 생성, 운영 미활용 |

**문제**: 원가·식별·채널연결·수입이력이 **서로 다른 파일에 파편화**되어 충돌을 탐지할 수 없다.

### 2-2. 이미 감사된 정량 오류 (2026-03-21 linked-master-audit.ko.md)

| 항목 | 수치 | 영향 |
|------|------|------|
| 연계마스터 총 행 | 2,477 | 기준선 |
| `branduid` 누락 | 148 (6.0%) | 메이크샵 연결 불가 |
| 메이크샵 판매가 누락 | 148 | 채널 리스팅 계산 불가 |
| 메이크샵 카테고리 누락 | 148 | 분류·필터 실패 |
| **중복 SKU** | **324 (13.1%)** | 동일 SKU에 여러 행 → 재고 수량 중복 집계 위험 |
| **동일 SKU 원가 충돌** | **305 (12.3%)** | 마진 계산 신뢰 불가 |
| **사방넷 상품코드 누락** | **333 (13.4%)** | 사방넷 재고 조회 불가 |
| 부분매핑 | 148 (6.0%) | 채널 연결 미완성 |

→ 팀미팅 CFO 시뮬 "776 SKU 중 230~310 유효" 수치는 위 오류율을 감안하면 **실제 유효 SKU는 이보다 더 적을 가능성**.

---

## 3. 각 오픈마켓 API 현재 상태

### 3-1. Capability Matrix (2026-04-09 문서 기준 + 2026-04-17 갱신)

| 채널 | 재고 조회 | 재고 Write | 판매가 조회 | 판매가 Write | 주문 처리 | validation | 스크립트 위치 |
|------|---------|---------|---------|---------|---------|---------|--------------|
| **메이크샵** | API 가능 (doc) | API 가능 (doc) | API 가능 (doc) | API 가능 (doc) | API 가능 | doc_only | `tools/openmarket/makeshop_live_test.py` |
| **사방넷** | **엑셀만** | **엑셀 일괄 수정** | N/A | N/A | API 가능 (주문 수집) | manual | `openclaw-project-hub/01_raw_sources/sabangnet/` |
| **스마트스토어(네이버)** | API 가능 (OAuth + bcrypt) | API 가능 | API 가능 | API 가능 | API 가능 | verified | `tools/openmarket/naver_commerce_live_test.py` |
| **쿠팡** | API 가능 (HMAC) | API 가능 | API 가능 | API 가능 | API 가능 | pending | `tools/openmarket/coupang_live_test.py` |
| **11번가** | 공식 문서 부족 | 미확인 | 미확인 | 미확인 | 미확인 | pending | 없음 |

### 3-2. 핵심 문제

1. **사방넷이 재고 원장인데 API가 엑셀 기반 수동**
   - 사방넷단품대량수정_SKU매칭.xlsx를 수동 업로드해야 재고/옵션이 반영됨
   - 자동화 파이프라인 없음 → 타 채널과 실시간 동기화 불가
   - 재고 증감이 엑셀로 반영되므로 타채널이 본 재고 ≠ 실제 재고
2. **쿠팡 FBR 시 재고 원천 이원화 문제 (팀미팅 CTO 지적)**
   - 쿠팡 FBR 창고 이관 재고 = 사방넷 재고에서 차감되어야 함
   - 하지만 사방넷이 엑셀 기반이면 이 차감 자동화 불가
   - 결과: 쿠팡에서 판매되는데 자사몰·스마트스토어에서도 재고 있다고 표시 → 과다 판매
3. **메이크샵 API는 doc_only**
   - 공식 문서상 재고 update 가능하나 실write 미검증
   - 실행 전 PoC 필요

---

## 4. 팀미팅 의사결정에 미친 영향

### 4-1. 기초 수치의 신뢰 문제

팀미팅 CFO 시뮬 (`박서연 growth-log`):
> "776 SKU 중 230~310개 유효" — 세션 기억에만 존재, 원본 시뮬 파일 미공유

이 수치가 나온 엑셀은 오류율 13% 이상이 남은 staging 파일. 즉:
- 중복 324 제외하면 실제 고유 SKU는 약 2,153개
- 사방넷 코드 누락 333 제외하면 실제 사방넷 연결 가능 SKU는 약 2,144개
- 원가 충돌 305 제외하면 마진 계산 신뢰 SKU는 약 1,839개
- **교집합 (쿠팡 등록 가능 = 고유 + 사방넷 연결 + 원가 확정)**: 추정 **1,500~1,700**

776 SKU는 어떤 기준으로 선별됐는지 **명시 없음**. 이 기준 공식화 전까지 쿠팡 PoC 착수는 위험.

### 4-2. 재고 이원화 설계 블로커

CTO growth-log:
> "재고 동기화 ≠ 재고 원천 이원화. 진짜 로켓(FBR)은 API 문제가 아닌 물리적 재고 분리 문제."

**그런데** 사방넷이 엑셀 기반이므로 재고 이원화 자동화 자체가 불가. 사방넷 → NocoDB 이관 없이는 FBR은 수동 재고 관리 전담자 투입 필요 (이재혁 과장 부담 증가).

---

## 5. 재구축 권고 (단계별)

### Phase 1: 재고 마스터 단일화 (선행 필수)

> 기존 `openclaw-pressco21-central-product-master-plan.ko.md` 제안 구조 채택

1. **NocoDB Postgres에 8개 테이블 생성**
   - `tbl_Products` / `tbl_Product_Variants` / `tbl_Source_Items`
   - `tbl_Supplier_Order_History` / `tbl_Import_Shipments`
   - `tbl_Cost_Profiles` / `tbl_Channel_Listings` / `tbl_Price_Reviews`
2. **SKU마스터_통합데이터.xlsx를 1차 이관**
   - 중복 SKU 324 → 수동 정제 후 이관 (이재혁 과장 확인 필요)
   - 원가 충돌 305 → 최신 `verified_at` 기준 남기고 나머지 히스토리로 이관
   - 사방넷 코드 누락 333 → 사방넷 어드민에서 역매칭 (사방넷 품번코드매핑관리 활용)
3. **단일 진실 원장 확정**
   - 이후 모든 원가/재고 질의는 NocoDB 기반
   - 엑셀은 입력/백업 용도로만 유지

### Phase 2: 사방넷 자동화 연동 (재고 원천)

1. 사방넷 API 존재 여부 확인 (현재 공식 문서 불확실)
2. 없으면 **사방넷 관리자 scraping + 엑셀 자동 업로드 WF** 구축
3. 실시간은 어렵더라도 **일 1회 재고 동기화**만이라도 확보
4. NocoDB `tbl_Product_Variants.사방넷_상품코드` 업데이트

### Phase 3: 오픈마켓 API 재고/판매가 동기화

| 채널 | 우선순위 | 작업 |
|------|---------|------|
| 스마트스토어 | 1 (verified) | OAuth + bcrypt 기반 재고·판매가 pull → NocoDB `tbl_Channel_Listings` |
| 메이크샵 | 2 (doc_only) | 실write PoC → 검증 후 운영 |
| 쿠팡 | 3 (pending) | HMAC 서명 래퍼 + Phase 1/2 선행 완료 후 |
| 11번가 | 4 (docs 부족) | 문서 확보 전 보류 |

### Phase 4: 쿠팡 로켓(FBR) 재고 이원화

1. NocoDB에 `tbl_Fulfillment_Allocation` 신설
   - `variant_id` / `warehouse_type` (사방넷 / 쿠팡FBR) / `allocated_qty`
2. FBR 창고 이관 시 `available_qty = total - allocated_qty` 자동 계산
3. 타 채널에 전송되는 재고는 `available_qty` 기준
4. 쿠팡만 FBR 창고 재고 기준으로 별도 sync

---

## 6. 지호님 판단 필요 항목

| # | 항목 | 선택지 |
|---|------|--------|
| 1 | NocoDB 이관 착수 시점 | (A) 즉시 / (B) 쿠팡 PoC 연기 후 / (C) 병렬 |
| 2 | 중복 SKU 324 + 원가 충돌 305 정제 담당 | (A) 이재혁 과장 / (B) 장지호 직접 / (C) 외주 |
| 3 | 사방넷 자동화 방식 | (A) API 확인 후 / (B) scraping 먼저 / (C) 수동 유지 |
| 4 | 쿠팡 PoC 착수 시점 | (A) 팀미팅 결정대로 진행 / (B) Phase 1 완료 후 / (C) Phase 2까지 대기 |
| 5 | "776 SKU" 선별 기준 공식화 | 박서연 CFO에게 `/levelup train`으로 원본 시뮬 주입 |

---

## 7. 세팅 가능(이미 진행) vs 판단 필요

### 내가 세팅한 것

- [x] 본 진단 문서 작성
- [x] `task-notify-webhook.json` 이재혁 Chat ID `8312726947` 하드코딩 갱신
- [x] MEMORY 블로커 목록 최신화

### 지호님 판단 후 실행 가능한 것

- [ ] Phase 1 NocoDB 스키마 DDL 작성 (기존 central-product-master-plan 기반)
- [ ] SKU마스터_통합데이터.xlsx → Postgres 1차 적재 n8n WF 초안
- [ ] 사방넷 API 공식 문서 재검토 / scraping PoC
- [ ] 쿠팡 로켓 PoC 범위를 "재고 이원화 실패 시 수동 재고 관리자 투입 조건"으로 제한

---

## 8. 참조

- 기존 감사: `openclaw-project-hub/03_openclaw_docs/openclaw-pressco21-linked-master-audit.ko.md` (2026-03-21)
- 기존 설계: `openclaw-project-hub/03_openclaw_docs/openclaw-pressco21-central-product-master-plan.ko.md` (2026-03-24)
- OMX v1: `docs/openmarket-ops/omx-channel-capability-matrix-v1.md`
- 원가마진 PRD: `docs/원가마진분석-PRD.md`
- 팀미팅 meeting-log: `team/meeting-logs/2026-04-16-쿠팡로켓배송-등록우선순위.md`
- 스크립트: `tools/openmarket/{coupang,naver_commerce,makeshop}_live_test.py`
