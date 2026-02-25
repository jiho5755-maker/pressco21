# Task 213: WF-05 주문폴링 + 야간배치 n8n 워크플로우

> **Phase**: 2-A (n8n + NocoDB)
> **담당**: gas-backend-expert
> **상태**: 구현 완료
> **생성일**: 2026-02-25
> **산출물**: `파트너클래스/n8n-workflows/WF-05-order-polling-batch.json`

---

## 1. 개요

WF-05는 PRESSCO21 파트너 클래스 플랫폼의 5개 스케줄 배치 작업을 하나의 n8n 워크플로우로 통합한다.
기존 GAS의 `handlePollOrders`, `triggerReconciliation`, `syncClassProducts_`, `retryFailedSettlements` 로직을
n8n Schedule Trigger + NocoDB + 메이크샵 API로 전환한다.

### 핵심 변경사항 (GAS 대비)
- GAS 6분 실행 제한 -> n8n 무제한 (자체 호스팅)
- GAS LockService -> n8n 단일 워크플로우 순차 실행 (동시 실행 제한 불필요)
- GAS CacheService -> 제거 (NocoDB 직접 조회 충분)
- GAS Logger.log -> n8n 실행 이력 + 텔레그램 알림
- GAS 수동 retryFailedSettlements() -> n8n 매일 04:00 자동 실행
- **D+3 정산 추가**: 기존 GAS에는 없던 D+3 배치 (매일 05:00)

---

## 2. 5개 서브-배치 아키텍처

### 2a. 주문 폴링 (매 10분)

```
Schedule Trigger (매 10분)
  -> Get Last Poll Time (NocoDB tbl_Settings)
  -> Parse Poll Time (Code)
  -> [병렬] Makeshop Search Orders + NocoDB Get Classes Map
  -> Filter Class Orders (Code: branduid 매칭)
  -> IF Orders Exist
    -> [Yes] Split Orders -> Check Duplicate -> IF Not Dup
      -> NocoDB Get Partner -> Calc Commission
        -> IF Calc OK -> Create Settlement (NocoDB POST)
    -> Aggregate Poll Results
  -> [No] Build No Orders Log
  -> Prepare Poll Log
  -> [병렬] Create Poll Log + Update Poll Time + IF Has Message
    -> Telegram Poll Result
```

**노드 수**: 24개
**메이크샵 API**: search_order (주문 조회)
**NocoDB 테이블**: tbl_Settings, tbl_Classes, tbl_Settlements, tbl_PollLogs, tbl_Partners

### 2b. 상품 동기화 (매일 03:00)

```
Schedule Trigger (매일 03:00)
  -> Get Category ID (NocoDB tbl_Settings)
  -> Parse Category ID
  -> IF Category Exists
    -> [Yes] [병렬] Fetch Makeshop Products + Get Existing Classes
      -> Compare Products (Code: 신규/수정/비활성 분류)
      -> Prepare Sync Changes -> Apply Sync Changes (HTTP Request)
      -> Telegram Sync Result
    -> [No] Telegram Sync Error
```

**노드 수**: 11개
**메이크샵 API**: product_list (상품 목록)
**NocoDB 테이블**: tbl_Settings, tbl_Classes

### 2c. 정합성 검증 (매일 00:00)

```
Schedule Trigger (매일 00:00)
  -> [병렬] Get Completed Settlements + Get Active Partners
  -> Aggregate Partner Totals (Code: 파트너별 적립금 집계)
  -> IF Has Targets
    -> [Yes] Query Makeshop Reserve -> Check Discrepancies
    -> Telegram Reconcile
```

**노드 수**: 8개
**메이크샵 API**: user_reserve (적립금 조회)
**NocoDB 테이블**: tbl_Settlements, tbl_Partners

### 2d. 실패 정산 재시도 (매일 04:00)

```
Schedule Trigger (매일 04:00)
  -> Get Failed Settlements (NocoDB: status=FAILED, retry_count<5)
  -> Parse Failed List
  -> IF Has Retry Targets
    -> [Yes] Get Partner -> Prepare Retry -> IF Should Retry
      -> [retry] Retry Process Reserve -> Check Result -> Update Settlement
      -> [auto_complete] Auto Complete Zero (적립금 0원)
    -> Aggregate Retry Results -> Telegram Retry Result
```

**노드 수**: 12개
**메이크샵 API**: process_reserve (적립금 지급)
**NocoDB 테이블**: tbl_Settlements, tbl_Partners

### 2e. D+3 정산 실행 (매일 05:00)

```
Schedule Trigger (매일 05:00)
  -> Get Due Settlements (NocoDB: PENDING_SETTLEMENT, due_date<=today)
  -> Parse Due Settlements
  -> IF Has Settle Targets
    -> [Yes] Get Partner -> Prepare Settlement -> IF Should Process
      -> [process] D+3 Process Reserve -> Check Result -> Update Status
      -> [auto_complete] Auto Complete D3 Zero (적립금 0원)
    -> Aggregate Settle Results -> Telegram Settle Result
```

**노드 수**: 12개
**메이크샵 API**: process_reserve (적립금 지급)
**NocoDB 테이블**: tbl_Settlements, tbl_Partners

---

## 3. 노드 목록 (전체 67개)

### 5a. 주문 폴링

| # | 노드 ID | 노드명 | 타입 | 역할 |
|---|---------|--------|------|------|
| 1 | wf05-schedule-poll | Schedule Poll Orders | scheduleTrigger | 매 10분 실행 |
| 2 | wf05-get-last-poll | Get Last Poll Time | httpRequest | tbl_Settings 조회 |
| 3 | wf05-parse-poll-time | Parse Poll Time | code | 시간 파싱 + URL 구성 |
| 4 | wf05-fetch-orders | Makeshop Search Orders | httpRequest | 메이크샵 주문 조회 |
| 5 | wf05-get-classes-map | NocoDB Get Classes Map | httpRequest | tbl_Classes 전체 조회 |
| 6 | wf05-filter-class-orders | Filter Class Orders | code | 클래스 주문 필터링 |
| 7 | wf05-if-orders-exist | IF Orders Exist | if | 클래스 주문 유무 분기 |
| 8 | wf05-no-orders-log | Build No Orders Log | code | 0건 로그 구성 |
| 9 | wf05-split-orders | Split Orders | code | 주문 배열 -> 개별 아이템 |
| 10 | wf05-check-duplicate | Check Duplicate Order | httpRequest | 중복 주문 체크 |
| 11 | wf05-check-dup-result | Check Dup Result | code | 중복 판정 |
| 12 | wf05-if-not-dup | IF Not Duplicate | if | 신규 주문만 통과 |
| 13 | wf05-get-partner | NocoDB Get Partner | httpRequest | 파트너 조회 |
| 14 | wf05-calc-commission | Calc Commission | code | 수수료/적립금 계산 |
| 15 | wf05-if-calc-ok | IF Calc OK | if | 계산 성공 분기 |
| 16 | wf05-create-settlement | Create Settlement | httpRequest | tbl_Settlements POST |
| 17 | wf05-aggregate-poll | Aggregate Poll Results | code | 처리 결과 집계 |
| 18 | wf05-prepare-poll-log | Prepare Poll Log | code | 로그 + 시간 업데이트 준비 |
| 19 | wf05-create-poll-log | Create Poll Log | httpRequest | tbl_PollLogs POST |
| 20 | wf05-update-poll-time | Update Poll Time | httpRequest | tbl_Settings PATCH |
| 21 | wf05-if-poll-msg | IF Poll Has Message | if | 텔레그램 발송 여부 |
| 22 | wf05-telegram-poll | Telegram Poll Result | telegram | 폴링 결과 알림 |

### 5b. 상품 동기화

| # | 노드 ID | 노드명 | 타입 | 역할 |
|---|---------|--------|------|------|
| 23 | wf05-schedule-sync | Schedule Product Sync | scheduleTrigger | 매일 03:00 |
| 24 | wf05-sync-get-category | Get Category ID | httpRequest | tbl_Settings 조회 |
| 25 | wf05-sync-parse-category | Parse Category ID | code | 카테고리 ID 파싱 |
| 26 | wf05-if-category-exists | IF Category Exists | if | 카테고리 설정 여부 |
| 27 | wf05-sync-fetch-products | Fetch Makeshop Products | httpRequest | 메이크샵 상품 목록 |
| 28 | wf05-sync-get-existing | Get Existing Classes | httpRequest | tbl_Classes 조회 |
| 29 | wf05-sync-compare | Compare Products | code | 신규/수정/비활성 분류 |
| 30 | wf05-sync-prepare-changes | Prepare Sync Changes | code | 변경 건 구성 |
| 31 | wf05-sync-apply | Apply Sync Changes | httpRequest | tbl_Classes POST/PATCH |
| 32 | wf05-telegram-sync | Telegram Sync Result | telegram | 동기화 결과 알림 |
| 33 | wf05-telegram-sync-error | Telegram Sync Error | telegram | 카테고리 미설정 알림 |

### 5c. 정합성 검증

| # | 노드 ID | 노드명 | 타입 | 역할 |
|---|---------|--------|------|------|
| 34 | wf05-schedule-reconcile | Schedule Reconciliation | scheduleTrigger | 매일 00:00 |
| 35 | wf05-reconcile-get-settlements | Get Completed Settlements | httpRequest | COMPLETED 정산 조회 |
| 36 | wf05-reconcile-get-partners | Get Active Partners | httpRequest | 활성 파트너 조회 |
| 37 | wf05-reconcile-aggregate | Aggregate Partner Totals | code | 파트너별 적립금 집계 |
| 38 | wf05-if-reconcile-targets | IF Has Targets | if | 검증 대상 존재 여부 |
| 39 | wf05-reconcile-query-reserve | Query Makeshop Reserve | httpRequest | 메이크샵 적립금 조회 |
| 40 | wf05-reconcile-check | Check Discrepancies | code | 불일치 감지 |
| 41 | wf05-telegram-reconcile | Telegram Reconcile | telegram | 검증 결과 알림 |

### 5d. 실패 정산 재시도

| # | 노드 ID | 노드명 | 타입 | 역할 |
|---|---------|--------|------|------|
| 42 | wf05-schedule-retry | Schedule Retry Failed | scheduleTrigger | 매일 04:00 |
| 43 | wf05-retry-get-failed | Get Failed Settlements | httpRequest | FAILED 정산 조회 |
| 44 | wf05-retry-parse | Parse Failed List | code | FAILED 목록 파싱 |
| 45 | wf05-if-retry-targets | IF Has Retry Targets | if | 재시도 대상 존재 여부 |
| 46 | wf05-retry-get-partner | Get Partner for Retry | httpRequest | 파트너 조회 |
| 47 | wf05-retry-prepare | Prepare Retry | code | 재시도 준비 |
| 48 | wf05-if-should-retry | IF Should Retry | if | retry/auto_complete 분기 |
| 49 | wf05-retry-process-reserve | Retry Process Reserve | httpRequest | 메이크샵 적립금 지급 |
| 50 | wf05-retry-check-result | Check Retry Result | code | 결과 판정 |
| 51 | wf05-retry-update-settlement | Update Retry Settlement | httpRequest | tbl_Settlements PATCH |
| 52 | wf05-retry-auto-complete | Auto Complete Zero | httpRequest | 0원 자동 완료 |
| 53 | wf05-retry-aggregate | Aggregate Retry Results | code | 재시도 결과 집계 |
| 54 | wf05-telegram-retry | Telegram Retry Result | telegram | 재시도 결과 알림 |

### 5e. D+3 정산 실행

| # | 노드 ID | 노드명 | 타입 | 역할 |
|---|---------|--------|------|------|
| 55 | wf05-schedule-settle | Schedule D+3 Settlement | scheduleTrigger | 매일 05:00 |
| 56 | wf05-settle-get-due | Get Due Settlements | httpRequest | D+3 도래 정산 조회 |
| 57 | wf05-settle-parse | Parse Due Settlements | code | 정산 목록 파싱 |
| 58 | wf05-if-settle-targets | IF Has Settle Targets | if | 정산 대상 존재 여부 |
| 59 | wf05-settle-get-partner | Get Partner for Settle | httpRequest | 파트너 조회 |
| 60 | wf05-settle-prepare | Prepare Settlement | code | 정산 준비 |
| 61 | wf05-if-settle-process | IF Should Process | if | process/auto_complete 분기 |
| 62 | wf05-settle-process-reserve | D+3 Process Reserve | httpRequest | 메이크샵 적립금 지급 |
| 63 | wf05-settle-check-result | Check Settle Result | code | 결과 판정 |
| 64 | wf05-settle-update | Update Settlement Status | httpRequest | tbl_Settlements PATCH |
| 65 | wf05-settle-auto-complete | Auto Complete D3 Zero | httpRequest | 0원 자동 완료 |
| 66 | wf05-settle-aggregate | Aggregate Settle Results | code | 정산 결과 집계 |
| 67 | wf05-telegram-settle | Telegram Settle Result | telegram | 정산 결과 알림 |

---

## 4. 환경변수 및 Credentials

### n8n 환경변수
| 변수명 | 설명 | 예시 |
|--------|------|------|
| `NOCODB_PROJECT_ID` | NocoDB 프로젝트 ID | `p_xxxxx` |
| `TELEGRAM_CHAT_ID` | 텔레그램 채팅 ID | `-100xxxxxxxxxx` |

### n8n Credentials
| 이름 | 타입 | 용도 |
|------|------|------|
| `NocoDB API Token` | HTTP Header Auth (`xc-token`) | NocoDB API 인증 |
| `Makeshop API Keys` | HTTP Header Auth (`Shopkey` + `Licensekey`) | 메이크샵 API 인증 |
| `PRESSCO21 SMTP` | SMTP | 이메일 발송 (WF-04에서 사용, WF-05에서는 미사용) |
| `PRESSCO21 Telegram Bot` | Telegram API | 텔레그램 알림 |

---

## 5. 메이크샵 API 호출 예산

| 배치 | API | 호출 횟수/회 | 일일 횟수 |
|------|-----|-------------|----------|
| 5a 주문 폴링 | search_order | 1 | 144 (10분 x 24시간) |
| 5b 상품 동기화 | product_list | 1~10 | 1~10 |
| 5c 정합성 검증 | user_reserve | 파트너 수 | 파트너 수 |
| 5d 실패 재시도 | process_reserve | FAILED 건 수 | 최대 100 |
| 5e D+3 정산 | process_reserve | PENDING 건 수 | 최대 100 |
| **합계** | | | **~260건/일** (500/시간 한도 충분) |

---

## 6. 에러 처리 패턴

| 패턴 | 적용 노드 | 설명 |
|------|----------|------|
| `onError: continueRegularOutput` | 메이크샵 API, NocoDB POST/PATCH | 개별 건 실패가 전체 배치를 중단시키지 않음 |
| `retry: { maxTries: 3 }` | NocoDB GET, 메이크샵 GET | 일시적 네트워크 오류 자동 재시도 |
| `retry: { maxTries: 2 }` | 메이크샵 process_reserve | 적립금 지급은 2회까지만 (중복 지급 방지) |
| `retry_count` 추적 | 5d 재시도 | NocoDB Number 필드, 최대 5회 |
| 텔레그램 알림 | 모든 배치 종료 시 | 성공/실패 건수 + 상세 |

---

## 7. GAS 함수 매핑

| GAS 함수 | WF-05 배치 | 주요 차이점 |
|----------|-----------|-----------|
| `handlePollOrders` | 5a | GAS Lock -> n8n 단일 실행 |
| `fetchNewOrders_` | 5a Makeshop Search Orders | 동일 API, HTTP Request 노드화 |
| `getClassProductIdMap_` | 5a NocoDB Get Classes Map | Sheets -> NocoDB 전환 |
| `isOrderAlreadyProcessed_` | 5a Check Duplicate Order | Sheets 전체 스캔 -> NocoDB where 필터 |
| `processOrderInternal_` | 5a Calc Commission + Create Settlement | 수수료 계산 로직 동일 |
| `triggerReconciliation` | 5c | API 조회 성공 여부 확인 (동일) |
| `syncClassProducts_` | 5b | 카테고리ID 설정 + 비교 로직 동일 |
| `retryFailedSettlements` | 5d | retry_count Number 필드 승격, error_message 패턴 동일 |
| (신규) | 5e D+3 정산 | GAS에 없던 기능, WF-04 D+3 설계 실현 |

---

## 8. 테스트 체크리스트

### 5a. 주문 폴링

- [ ] tbl_Settings에 last_poll_time 없을 때 최초 실행 정상 동작
- [ ] 메이크샵 주문 0건 시 "클래스 주문 없음" 로그 기록
- [ ] 일반 상품 주문 무시, 클래스 상품만 처리
- [ ] 이미 처리된 주문(order_id 중복) 스킵
- [ ] PENDING_SETTLEMENT 상태로 tbl_Settlements 레코드 생성
- [ ] 자기 결제(member_id == partner.member_id) 시 SELF_PURCHASE 상태
- [ ] 수수료 계산: SILVER 10%, GOLD 12%, PLATINUM 15% 정확
- [ ] tbl_PollLogs 폴링 이력 기록
- [ ] last_poll_time KST 업데이트
- [ ] 텔레그램 알림 발송 (클래스 주문 있을 때만)

### 5b. 상품 동기화

- [ ] class_category_id 미설정 시 텔레그램 에러 알림
- [ ] 메이크샵 신규 상품 -> tbl_Classes CREATE
- [ ] 기존 상품 가격 변경 -> tbl_Classes PATCH
- [ ] 메이크샵에서 삭제된 상품 -> status=closed PATCH
- [ ] 변경 없을 때도 텔레그램 결과 알림

### 5c. 정합성 검증

- [ ] COMPLETED 정산 파트너별 적립금 집계
- [ ] 메이크샵 적립금 조회 API 호출 성공/실패 판정
- [ ] 불일치 시 텔레그램 상세 알림
- [ ] 검증 대상 0건 시 "대상 없음" 메시지

### 5d. 실패 정산 재시도

- [ ] FAILED + retry_count < 5 필터 정확
- [ ] 적립금 0원 -> 자동 COMPLETED
- [ ] process_reserve 성공 -> COMPLETED + reserve_paid_date
- [ ] process_reserve 실패 -> retry_count+1 + error_message 갱신
- [ ] retry_count >= 5 건 스킵 (NocoDB where 필터에서 이미 제외)
- [ ] 텔레그램 성공/실패/최대초과 건수 알림

### 5e. D+3 정산 실행

- [ ] PENDING_SETTLEMENT + settlement_due_date <= today 필터
- [ ] 파트너 없음 시 에러 처리
- [ ] 적립금 0원 -> 자동 COMPLETED
- [ ] process_reserve 성공 -> COMPLETED
- [ ] process_reserve 실패 -> FAILED + retry_count=1
- [ ] 실패 건은 04:00 재시도 배치에서 자동 처리
- [ ] 텔레그램 배치 결과 알림

### 공통

- [ ] 5개 Schedule Trigger가 각각 독립 실행
- [ ] NocoDB Credentials(xc-token) 인증 정상
- [ ] Makeshop Credentials(Shopkey/Licensekey) 인증 정상
- [ ] 텔레그램 알림 5개 배치 모두 정상
- [ ] timezone Asia/Seoul 설정 반영
