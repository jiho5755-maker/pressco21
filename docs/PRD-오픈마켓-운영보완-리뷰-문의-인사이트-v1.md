# PRD: 오픈마켓 운영보완 엔진 v1

> 작성일: 2026-04-09
> 버전: v1.0
> 상태: Draft
> 작성 방식: OMX Overlay Mode 역할 분리 기획 합의안
> 관련 시스템: 사방넷, 메이크샵, 스마트스토어, 쿠팡, 11번가, n8n, NocoDB, 텔레그램
> 제외 범위: `통합 매출조회 2.0`은 별도 세션에서 진행 중이므로 본 PRD 범위에서 제외

---

## 1. 프로젝트 정의

### 1.1 한 줄 정의

사방넷을 운영 코어로 유지하면서, PRESSCO21 내부에 `리뷰 답변`, `문의 SLA 감시`, `인사이트/이상치/재구매 추천`만 담당하는 보완 레이어를 구축한다.

### 1.2 왜 지금 필요한가

현재 PRESSCO21의 핵심 병목은 주문 처리 자체보다 아래 세 가지에 가깝다.

- 리뷰 답변이 채널별로 흩어져 있어 누락되거나 톤이 들쭉날쭉하다.
- 쿠팡/스마트스토어 문의는 SLA 압박이 강한데, 실시간 감시 레이어가 약하다.
- 사방넷은 운영 실행 허브로는 훌륭하지만, `무슨 상품이 이상한지`, `어떤 고객이 다시 살 시점인지`, `어떤 SKU가 위험한지`를 먼저 알려주는 분석 레이어는 약하다.

### 1.3 이 PRD의 목표

본 PRD는 사방넷을 대체하는 신규 OMS/WMS를 만드는 문서가 아니다. 목적은 아래 세 가지다.

1. 리뷰/문의 대응 시간을 줄인다.
2. 운영 이상 징후를 더 빨리 발견한다.
3. 소모성 재료의 재구매를 자사몰로 회수한다.

---

## 2. OMX 기획 합의

이번 문서는 `docs/omx-overlay-mode.md` 기준으로 OMX를 직접 덮어쓰기 설치하지 않고, 역할 분리 방식만 차용해 정리했다.

- `운영 관점`: 사방넷과 충돌하지 않는 보완 범위 정의
- `CX 관점`: AI 초안 + 사람 승인 원칙, 채널별 응대 리스크 정리
- `데이터/리텐션 관점`: 이벤트, KPI, 이상치 규칙, 재구매 로직 정리

이 문서는 위 세 관점의 공통 합의안을 하나의 제품 문서로 통합한 결과물이다.

---

## 3. 제품 원칙

1. `사방넷 우선, 내부 보완`
사방넷이 맡고 있는 주문수집, 재고, 송장, 기초 CS 운영은 건드리지 않는다.

2. `AI는 초안, 사람은 승인`
리뷰 답변과 고객 응대는 자동 발송이 아니라 승인형 워크플로우를 기본으로 한다.

3. `채널 정책 분리`
쿠팡, 스마트스토어, 11번가, 메이크샵은 문의 SLA와 운영 제약이 다르므로 채널별 규칙을 분리한다.

4. `소모성 재료 우선`
압화, 레진, 하바리움, 키트류처럼 재구매 주기가 있는 상품군부터 적용한다.

5. `자사몰 락인 우선`
오픈마켓 데이터는 자사몰 재구매 전환과 FAQ/상세 개선에 우선 활용한다.

6. `읽기/알림/초안 먼저`
1차는 읽기, 알림, 초안 생성까지만 만들고, 자동 실행은 2차 이후로 미룬다.

---

## 4. 범위와 비범위

### 4.1 범위

- 리뷰 일괄 답변 어시스턴트
- 문의 SLA 알람 시스템
- 인사이트/이상치/재구매 엔진

### 4.2 비범위

- 통합 매출조회 2.0
- 사방넷 대체 OMS/WMS
- 완전 자동 리뷰 발송
- 완전 자동 고객 응대
- 가격/환불/보상 자동 확정
- 실시간 스트리밍 기반 전면 재구축

---

## 5. 현재 시스템 경계

| 시스템 | 현재 역할 | 본 PRD에서의 역할 |
|------|------|------|
| 사방넷 | 주문수집, 송장, 재고, 기초 CS 운영 | 운영 기준 원천 중 하나 |
| 메이크샵 | 자사몰 주문, 회원, 상품, 적립금 | 자사몰 전환/재구매 활용 |
| 스마트스토어 | 주문, 리뷰, 문의, 정산 | 리뷰/문의/SLA 데이터 원천 |
| 쿠팡 | 주문, 리뷰/문의, 클레임, 정산 | SLA와 이상치 모니터링 핵심 채널 |
| 11번가 | 주문, 리뷰/문의, 클레임 | 보완적 채널 데이터 원천 |
| n8n | 수집, 정규화, 알림 | 실행 엔진 |
| NocoDB | 운영 뷰, 큐, 로그 관리 | 관리 데이터 저장소 |
| 텔레그램 | 즉시 알림 | 운영 알람 채널 |

---

## 6. 전략 결정 사항

### 6.1 데이터 수집 원칙

- 채널 데이터는 가능한 경우 직접 API로 수집한다.
- 운영 정합성은 사방넷 기준 데이터와 일 단위로 대조한다.
- 고객 발송보다 내부 알림과 내부 승인 큐를 우선한다.

### 6.2 고객 발송 원칙

- 리뷰 답변과 문의 답변은 `AI 자동 발송`이 아니라 `AI 초안 + 사람 승인`을 기본으로 한다.
- 고객 보상, 환불, 교환 확정처럼 금전적/정책적 의사결정이 필요한 답변은 자동화 범위에서 제외한다.

### 6.3 자사몰 전환 원칙

- 재구매 리마인더는 오픈마켓 재구매를 그대로 늘리는 것이 아니라, 가능하면 자사몰 보충카트와 혜택으로 연결한다.
- B2B 강사/공방 고객은 대량 소모품과 키트 중심으로, B2C 고객은 소량 재료와 사용 편의성 중심으로 분리한다.

---

## 7. 대상 사용자

### 7.1 이재혁 과장

- 문의 놓침 없이 빠르게 대응해야 한다.
- 전화 응대와 택배/재고 문의 부담을 줄이고 싶다.
- 긴급한 문의만 먼저 보고 싶다.

### 7.2 대표 및 장지호 팀장

- 어떤 SKU가 문제인지 빠르게 알고 싶다.
- 자사몰 재구매 전환 후보를 알고 싶다.
- 리뷰/문의/반품 데이터를 상품 기획과 연결하고 싶다.

### 7.3 조승해 사원

- 리뷰와 문의에서 자주 나오는 포인트를 상세페이지 개선에 반영하고 싶다.
- 채널별 리뷰 답변 톤을 일정하게 유지하고 싶다.

---

## 8. 기능 요구사항

### 8.1 모듈 A: 리뷰 일괄 답변 어시스턴트

#### A-1. 목표

- 채널별 리뷰를 한 화면에 모은다.
- AI 초안을 빠르게 만들고 사람이 검수한다.
- 반복되는 리뷰 유형을 템플릿화한다.

#### A-2. 핵심 기능

1. 채널별 리뷰 수집
2. 상품별/별점별/채널별 필터
3. 감성/주제 태깅
4. 답변 초안 생성
5. 다건 선택 후 일괄 초안 생성
6. 담당자 승인 후 반영
7. 답변 완료 로그 저장

#### A-3. 답변 가이드

- 칭찬형: 감사 + 재방문 유도
- 사용문의형: 사용 팁 + FAQ 연결
- 배송불만형: 공감 + 확인/조치 안내
- 품질불만형: 공감 + 문의 채널 안내

#### A-4. 금지 원칙

- 가격 보상 약속 자동 생성 금지
- 환불/교환 확답 자동 생성 금지
- 사실 확인이 필요한 내용은 승인 전 발송 금지

#### A-5. 수락 기준

- 운영자가 리뷰를 상품별로 묶어 볼 수 있어야 한다.
- 1회 선택으로 10건 이상 답변 초안을 생성할 수 있어야 한다.
- 모든 답변은 승인 로그를 남겨야 한다.

---

### 8.2 모듈 B: 문의 SLA 알람 시스템

#### B-1. 목표

- 새 문의를 즉시 감지한다.
- SLA 마감 전에 여러 단계로 경고한다.
- 담당자별 우선순위를 명확히 만든다.

#### B-2. 핵심 기능

1. 쿠팡/스마트스토어/11번가/메이크샵 문의 수집
2. 문의 접수 시각과 SLA 만료 시각 계산
3. 신규 문의 즉시 알림
4. 경고 단계 재알림
5. 담당자 배정
6. 미응답 큐와 일일 리포트
7. 휴일/영업시간 보정

#### B-3. 기본 운영 규칙

- 신규 문의 수신 즉시 `received_at` 기록
- SLA의 50% 시점에 1차 경고
- SLA의 80% 시점에 최종 경고
- SLA 초과 시 `breach` 상태로 전환
- 동일 고객의 연속 문의는 스레드로 묶음

#### B-4. 알림 채널

- 즉시 알림: 텔레그램
- 재알림: 텔레그램 반복
- 초과 알림: 담당자 + 관리자 동시 알림
- 일일 리포트: 운영 요약 메시지

#### B-5. 수락 기준

- 신규 문의 발생 후 5분 이내에 알림이 도착해야 한다.
- 모든 문의는 `ok`, `warning`, `breach` 상태 중 하나를 가져야 한다.
- 담당자별 미응답 큐를 볼 수 있어야 한다.

---

### 8.3 모듈 C: 인사이트/이상치/재구매 엔진

#### C-1. 목표

- 운영 이상 신호를 먼저 발견한다.
- 반복 불만 SKU를 찾는다.
- 재구매 시점을 예측해 자사몰 전환에 활용한다.

#### C-2. 핵심 기능

1. 매출 급증/급감 감지
2. 반품률 급등 SKU 탐지
3. 문의 급증 SKU 탐지
4. 리뷰 급증/감성 악화 탐지
5. 품절 임박 SKU 탐지
6. 재구매 후보 고객/상품 추천
7. 주간 인사이트 리포트

#### C-3. 이상치 규칙 초안

- 전일 대비 매출 30% 이상 감소 시 경고
- 7일 평균 대비 주문 수 2배 이상 증가 시 경고
- 평시 대비 반품률 2배 이상 증가 시 경고
- 리뷰 수 3배 이상 증가 시 경고
- 문의 수 2배 이상 증가 시 경고
- 품절 상태인데 주문 유입이 계속되면 경고

#### C-4. 재구매 로직 초안

- `expected_repurchase_at = last_purchase_at + consumption_cycle_days`
- `repurchase_window_start = expected_repurchase_at - buffer_days`
- `repurchase_window_end = expected_repurchase_at + buffer_days`

세그먼트 차등:

- `B2B`: 대량구매, 주기가 길고 객단가 높음
- `B2C`: 소량구매, 주기가 짧고 사용경험 영향 큼
- `MIXED`: 채널별 반응과 구매량을 함께 고려

#### C-5. 자사몰 전환 장치

- 자사몰 보충카트
- 재구매 추천 묶음
- 적립금/회원혜택 안내
- 동일 카테고리 연관상품 추천

#### C-6. 수락 기준

- 이상치 이벤트는 심각도와 함께 기록되어야 한다.
- 재구매 후보 리스트는 주간 단위로 생성되어야 한다.
- 자사몰 전환 대상 SKU와 고객 세그먼트가 함께 표시되어야 한다.

---

### 8.4 공통 승인 체계

공통 상태값:

- `collected`: 수집 완료
- `drafted`: AI 초안 생성 완료
- `queued`: 운영 검수 대기
- `approved`: 사람 승인 완료
- `published`: 채널 반영 완료
- `failed`: 오류 또는 재확인 필요

역할 분리:

- AI: 초안, 분류, 요약, 이상치 탐지
- 운영자: 검수, 승인, 예외 판단
- 관리자: SLA 초과, 정책 예외, 금전/보상 관련 최종 판단

---

## 9. 데이터 모델 초안

### 9.1 공통 마스터

`sku_master`

- `sku_id`
- `product_name`
- `category_group`
- `sub_category`
- `is_consumable`
- `consumption_cycle_days`
- `reorder_min_days`
- `reorder_max_days`
- `active_channels`
- `is_bundle_candidate`
- `updated_at`

`customer_identity_map`

- `customer_id`
- `channel_name`
- `channel_customer_id`
- `email`
- `phone`
- `name`
- `segment`
- `first_order_at`
- `last_order_at`

### 9.2 리뷰/문의

`review_fact`

- `review_id`
- `channel_name`
- `order_id`
- `sku_id`
- `rating`
- `review_text`
- `review_type`
- `sentiment_score`
- `topic_tag`
- `reply_status`
- `reply_draft`
- `reply_approved_by`
- `reply_sent_at`
- `created_at`

`inquiry_fact`

- `inquiry_id`
- `channel_name`
- `order_id`
- `sku_id`
- `customer_id`
- `inquiry_type`
- `subject`
- `body`
- `received_at`
- `due_at`
- `sla_status`
- `assignee`
- `first_response_at`
- `closed_at`

### 9.3 인사이트/재구매

`sales_snapshot`

- `snapshot_date`
- `channel_name`
- `sku_id`
- `gross_sales`
- `net_sales`
- `order_count`
- `cancel_count`
- `return_count`
- `refund_amount`
- `commission_amount`
- `inventory_on_hand`

`anomaly_event`

- `anomaly_id`
- `anomaly_type`
- `channel_name`
- `sku_id`
- `severity`
- `baseline_value`
- `actual_value`
- `delta_rate`
- `detected_at`
- `status`
- `owner`

`repurchase_profile`

- `profile_id`
- `customer_id`
- `sku_id`
- `last_purchase_at`
- `expected_repurchase_at`
- `repurchase_window_start`
- `repurchase_window_end`
- `segment`
- `trigger_reason`
- `sent_status`

---

## 10. 이벤트 모델 초안

### 10.1 리뷰 이벤트

- `review.received`
- `review.classified`
- `review.reply.draft_created`
- `review.reply.approved`
- `review.reply.sent`

### 10.2 문의 이벤트

- `inquiry.received`
- `inquiry.assigned`
- `inquiry.sla.warning`
- `inquiry.sla.breached`
- `inquiry.first_response.logged`
- `inquiry.closed`

### 10.3 인사이트 이벤트

- `sales.snapshot.created`
- `anomaly.detected`
- `anomaly.reviewed`
- `anomaly.resolved`

### 10.4 재구매 이벤트

- `purchase.completed`
- `repurchase.window.opened`
- `repurchase.reminder.due`
- `repurchase.reminder.sent`
- `repurchase.converted`

---

## 11. KPI

### 11.1 리뷰 일괄 답변

- 리뷰 답변 평균 소요시간
- 리뷰 답변 처리율
- 답변 승인 후 수정률
- 리뷰 응대 누락률
- 답변 템플릿 재사용률

### 11.2 문의 SLA 알람

- 24시간 내 1차 응답률
- SLA 초과 건수
- 경고 단계 처리 비율
- 담당자 배정 시간
- 미응답 누락률

### 11.3 인사이트/이상치

- 이상치 탐지 후 조치까지 걸린 시간
- 반품 급증 SKU 대응률
- 리뷰 급증 SKU 분석률
- 문의 급증 SKU 조치율
- 품절 임박 사전 조치율

### 11.4 재구매

- D+30 재구매율
- D+60 재구매율
- 자사몰 재구매 전환율
- 리마인더 클릭률
- 보충카트 전환율

---

## 12. 아키텍처 초안

```text
오픈마켓 API / 메이크샵 / 사방넷 기준 데이터
                    ↓
             n8n 수집·정규화·알림
                    ↓
           NocoDB 운영 뷰 + 로그 저장
                    ↓
  리뷰 큐 / 문의 SLA 큐 / 이상치 큐 / 재구매 후보 큐
                    ↓
     텔레그램 알림 / 운영자 승인 / 자사몰 전환 실행
```

역할 분리:

- 사방넷: 운영 실행
- 내부 엔진: 알림, 초안, 인사이트, 리텐션

---

## 13. Phase 계획

### Phase 1

- 문의 SLA 알람
- 리뷰 답변 초안 생성
- 기본 운영 큐 대시보드

### Phase 2

- 이상치 탐지
- 재구매 리마인더
- 자사몰 보충카트 연결

### Phase 3

- 카테고리별 추천 고도화
- B2B/B2C 분리 예측
- 반복 불만 SKU 자동 개선 제안

---

## 14. 리스크와 완화

| 리스크 | 영향 | 완화 |
|------|------|------|
| 쿠팡/채널별 API 제약 | 일부 자동 반영 제한 | 1차는 수집/알림/초안 중심으로 설계 |
| AI 오답변 | 고객 불만 확대 | 승인형 워크플로우 유지 |
| 알림 과다 | 운영자 무시 가능 | 심각도/채널/담당자별 필터 적용 |
| 재구매 오탐 | 과도한 메시지 | 소모성 SKU 우선 적용, 수동 검토 포함 |
| 상품/SKU 매핑 불일치 | 분석 왜곡 | `sku_master`와 채널 SKU 매핑 우선 정비 |

---

## 15. 선행 작업

1. SKU 통합 마스터 정비
2. 채널별 문의/리뷰 수집 가능 범위 확인
3. 텔레그램 담당자 라우팅 규칙 정리
4. 소모성 SKU 우선 목록 작성
5. 자사몰 보충카트 연결 방식 확정

---

## 16. 최종 권고

구축 순서는 아래가 적절하다.

1. 문의 SLA 알람
2. 리뷰 일괄 답변 어시스턴트
3. 인사이트/이상치 엔진
4. 재구매 리마인더

이 순서가 맞는 이유는, 이재혁 과장 기준으로 가장 즉각적인 체감은 `문의 놓침 방지`이고, 다음이 `리뷰 처리 시간 단축`이며, 이후부터 `운영 판단`과 `자사몰 전환`이 붙기 때문이다.

---

## 17. 참고 문서

- [docs/omx-overlay-mode.md](/Users/jangjiho/workspace/pressco21/docs/omx-overlay-mode.md)
- [docs/PRD-고객운영OS-통합-v1.md](/Users/jangjiho/workspace/pressco21/docs/PRD-고객운영OS-통합-v1.md)
- [docs/PRD-이메일-고도화-v1.md](/Users/jangjiho/workspace/pressco21/docs/PRD-이메일-고도화-v1.md)
- [docs/PRD-Q2-자산배선-고도화-v1.md](/Users/jangjiho/workspace/pressco21/docs/PRD-Q2-자산배선-고도화-v1.md)
- [company-profile.md](/Users/jangjiho/workspace/pressco21/company-profile.md)
- [company-knowledge/ax-strategy.md](/Users/jangjiho/workspace/pressco21/company-knowledge/ax-strategy.md)
