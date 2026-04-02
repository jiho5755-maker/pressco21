# PRESSCO21 원천데이터 엔터티 정의 v1.1

_대상: 지호님, 플로라, Claude Code, Codex, 향후 개발 에이전트_

## 1. 문서 목적

이 문서는 PRESSCO21의 통합관리시스템과 플로라 종합 OS를 위한 **원천데이터(Source of Truth) 엔터티 정의 문서**다.

이 문서의 목적은 아래와 같다.

1. 회사의 핵심 데이터가 무엇인지 공통 기준을 세운다.
2. CRM, 파트너클래스, NocoDB, n8n, 플로라가 같은 엔터티를 기준으로 움직이게 한다.
3. 각 프로젝트가 고객/파트너/클래스/거래를 제각각 정의하지 않게 한다.
4. 추후 PostgreSQL 통합 스키마 설계의 출발점을 만든다.
5. 원천데이터와 파생데이터를 분리해 통합 원장 전략을 지킨다.

---

## 2. 작성 근거

이 문서는 아래 근거를 바탕으로 작성했다.

### 회사 지식 허브 기준
- `company-knowledge/README.md`
- `company-knowledge/ax-strategy.md`
- `company-knowledge/company-history.md`
- `company-knowledge/financials.md`
- `company-knowledge/직원/staff-profiles.md`
- `company-knowledge/비즈니스전략/PRESSCO21-이커머스-사업전략.md`

### 로컬 시스템 구조 기준
- `offline-crm-v2`
- `파트너클래스`
- `docs/파트너클래스`
- 현재 OpenClaw / 플로라 공통 설계 문서

### 현재 회사 운영 현실 반영
- B2C + B2B 혼합 구조
- 자사몰/채널 판매와 교육/파트너 생태계가 동시에 존재
- CRM, 문서, 입금, 정산, 재고, 파트너클래스가 장기적으로 연결되어야 함

---

## 3. 엔터티 설계 원칙

### 원칙 1. 사람/조직/거래/운영/자동화 축을 분리한다
한 엔터티에 너무 많은 역할을 섞지 않는다.

### 원칙 2. 장기적으로 여러 시스템에서 공통 참조할 것은 원천 엔터티로 승격한다
예: 고객, 파트너, 강사, 클래스, 신청, 견적, 입금, 정산.

### 원칙 3. 문서/로그/캐시는 원천 엔터티와 구분한다
예: 브리핑용 캐시, 알림 로그, 검색 인덱스는 파생 데이터로 본다.

### 원칙 4. 회사 공통 상태를 가지는 대상은 별도 엔터티 또는 명확한 상태모델을 갖는다
예: 신청 상태, 입금 상태, 파트너 등급, 클래스 운영 상태.

### 원칙 5. 핵심 원천 엔터티는 "누가/무엇이/언제/어떤 상태로/누구와 연결되어 있는가"를 표현할 수 있어야 한다
필수 필드는 나중에 상태체계, 자동화, 브리핑의 기준이 된다.

### 원칙 6. 원천데이터는 운영 편의를 위해 중복 저장하지 않는다
NocoDB, CRM 화면, 파트너클래스 UI는 원장을 보여주는 인터페이스여야 하며, 자체적으로 별도 진실을 만들지 않는다.

---

## 4. 엔터티 계층 구조

PRESSCO21 원천 엔터티는 아래 5개 축으로 본다.

1. **사람/조직 축**
2. **상품/서비스/콘텐츠 축**
3. **거래/운영 축**
4. **운영 제어 축**
5. **분석/파생 축**

이 중 1~4는 원천데이터 후보이며, 5는 기본적으로 파생데이터다.

---

## 5. PRESSCO21 핵심 원천 엔터티 정의

## A. 사람/조직 축

### 5.1 Customer (고객)
**정의:** 자사몰/채널/오프라인/클래스 등에서 PRESSCO21와 거래하거나 관계를 맺는 개인 단위 주체

**왜 핵심인가:**
- CRM의 중심
- 주문/신청/입금/문서/CS의 기준
- 파트너클래스 수강생, 개인 구매자, 담당자 연결의 기준이 됨

**필수 필드(1차 권장):**
- customer_id
- 이름
- 휴대폰
- 이메일
- customer_type (개인고객/수강생/강사/공방운영자/거래처담당자 등)
- primary_channel (자사몰/스마트스토어/쿠팡/직접/클래스 등)
- status (활성/휴면/차단/기타)
- organization_id (선택)
- owner_staff_id (선택)
- memo
- created_at / updated_at

**원천 여부:** 핵심 원천데이터

**연결 엔터티:**
- Organization
- Order
- Application
- Quote
- Invoice
- Payment
- Task

**미확정 포인트:**
- 개인고객과 공방운영자를 같은 Customer로 둘지, 별도 subtype으로 강하게 나눌지

---

### 5.2 Organization (거래처/기관/협회/사업체)
**정의:** 회사가 거래하거나 제휴하는 법인, 사업체, 기관, 학교, 협회, 공방 단위 조직

**왜 핵심인가:**
- B2B 거래 비중이 높음
- 협회/기관/공방/대기업 납품이 존재
- 개인 고객과 조직 거래를 구분해야 함

**필수 필드(1차 권장):**
- organization_id
- 조직명
- organization_type (거래처/공방/협회/학교/기업/기관)
- 사업자번호 또는 식별정보
- 대표 연락처
- 담당 customer_id (선택)
- settlement_policy_id 또는 정산 기준 메모
- status
- created_at / updated_at

**원천 여부:** 핵심 원천데이터

**연결 엔터티:**
- Customer
- Partner
- Quote
- Invoice
- Settlement
- Program

**미확정 포인트:**
- 공방을 Organization으로 고정할지, Partner의 하위 속성으로 볼지

---

### 5.3 Staff (내부 담당자)
**정의:** PRESSCO21 내부 운영 인력

**왜 핵심인가:**
- 담당자 배정, 승인, 실행, 보고, AI 권한과 연결됨
- 플로라 OS가 업무 할당/브리핑 시 참조해야 함

**필수 필드(1차 권장):**
- staff_id
- 이름
- 직책
- 부서
- role_group (대표/물류/디자인/생산/경영기획)
- telegram_id (선택)
- ai_access_level
- status
- created_at / updated_at

**원천 여부:** 핵심 원천데이터

**연결 엔터티:**
- Task
- Approval
- EventLog
- CustomerOwner
- ClassAssignment

**미확정 포인트:**
- 직원 권한 체계를 staff 자체에 둘지 별도 Role/Permission 테이블로 분리할지

---

### 5.4 Partner (파트너)
**정의:** 파트너클래스 및 회사 생태계에 참여하는 공방, 강사 파트너, 제휴 운영 주체

**왜 핵심인가:**
- 회사의 신규 성장축
- B2B 판매, 클래스 운영, 재료 판매, 등급 체계와 연결
- 전국 파트너맵/O2O 전략의 핵심

**필수 필드(1차 권장):**
- partner_id
- partner_name
- organization_id (선택)
- 대표 customer_id 또는 contact_id
- region
- partner_grade
- onboarding_status
- active_status
- settlement_policy
- created_at / updated_at

**원천 여부:** 핵심 원천데이터

**연결 엔터티:**
- Instructor
- Class
- Application
- Settlement
- PartnerGradeHistory

**미확정 포인트:**
- Partner와 Organization을 완전히 분리할지, 1:1 매핑 중심으로 갈지

---

### 5.5 Instructor (강사)
**정의:** 교육/클래스/커리큘럼을 운영하는 강사 개인

**왜 핵심인가:**
- 파트너와 동일하지 않을 수 있음
- 클래스 품질/운영/정산/브랜드와 직접 연결됨

**필수 필드(1차 권장):**
- instructor_id
- customer_id 또는 person reference
- partner_id (선택)
- organization_id (선택)
- 전문 분야
- 활동 상태
- 강의 가능 형태(온라인/오프라인/출강)
- 지역
- 소개/이력
- created_at / updated_at

**원천 여부:** 핵심 원천데이터

**연결 엔터티:**
- Class
- Schedule
- Settlement
- ContentAsset

**미확정 포인트:**
- Instructor를 Customer subtype으로 볼지 독립 엔터티로 둘지

---

## B. 상품/서비스/콘텐츠 축

### 5.6 Product (상품)
**정의:** 자사몰 및 채널에서 판매하는 재료, 키트, 완성품, 도구류

**왜 핵심인가:**
- 현재 회사 매출의 기본 단위
- 메이크샵, 채널 전략, 마진전략, 파트너클래스 재료 판매와 연결됨

**필수 필드(1차 권장):**
- product_id
- product_name
- sku
- product_type (재료/키트/완성품/도구/기타)
- category
- sourcing_type (직제조/국내사입/중국사입)
- base_cost
- sale_status
- inventory_track_type
- created_at / updated_at

**원천 여부:** 핵심 원천데이터

**연결 엔터티:**
- Order
- Inventory
- Bundle
- ChannelListing
- ClassMaterialLink

**미확정 포인트:**
- 키트 상품을 Product로 단일 관리할지 Bundle/Kit 엔터티 분리할지

---

### 5.7 Class (클래스)
**정의:** 파트너클래스 또는 회사 교육 시스템에서 판매/운영되는 교육 단위

**왜 핵심인가:**
- 회사의 신규 성장축
- 강사/파트너/수강생/신청/정산/리뷰와 연결됨

**필수 필드(1차 권장):**
- class_id
- class_name
- class_type (원데이/정규/온라인/오프라인/자격과정)
- instructor_id
- partner_id
- 운영 주체 organization_id (선택)
- sale_price / price_policy
- recruit_status
- approval_status
- visibility_status
- created_at / updated_at

**원천 여부:** 핵심 원천데이터

**연결 엔터티:**
- Schedule
- Application
- Review
- Settlement
- Product
- ContentAsset

**미확정 포인트:**
- 클래스 자체와 회차(Schedule)를 얼마나 강하게 분리할지

---

### 5.8 Program (프로그램/제안 패키지)
**정의:** 기관/협회/B2B 대상 교육 제안, 체험 프로그램, 패키지 상품 단위

**왜 핵심인가:**
- 회사는 강의/납품/B2B 제안이 강함
- 일반 상품과 클래스 사이의 중간 단위가 필요함

**필수 필드(1차 권장):**
- program_id
- program_name
- target_type (기관/협회/기업/학교)
- 구성 설명
- price_range
- proposal_status
- owner_staff_id
- created_at / updated_at

**원천 여부:** 2차 정교화 대상 원천 후보

**연결 엔터티:**
- Organization
- Quote
- Class
- ContentAsset

---

### 5.9 ContentAsset (콘텐츠 자산)
**정의:** 상세페이지, 영상, 이미지, 강의자료, 제안자료 등 재사용 가능한 콘텐츠 자산

**왜 중요한가:**
- AX 전략상 상세/영상 자동화 우선순위가 높음
- 제품/클래스/브랜드/파트너 제안과 연결됨

**필수 필드(1차 권장):**
- asset_id
- asset_type
- title
- linked_entity_type / linked_entity_id
- creator_staff_id
- usage_channel
- asset_status
- source_path or reference_path
- created_at / updated_at

**원천 여부:** 2차 정교화 대상

---

## C. 거래/운영 축

### 5.10 Order (주문)
**정의:** 상품 구매 거래 단위

**왜 핵심인가:**
- 자사몰/채널 매출의 기본 거래 단위
- 출고/입금/정산/CS와 직접 연결됨

**필수 필드(1차 권장):**
- order_id
- customer_id
- organization_id (선택)
- channel
- ordered_at
- order_total_amount
- payment_status
- fulfillment_status
- order_status
- source_system
- created_at / updated_at

**원천 여부:** 핵심 원천데이터

**연결 엔터티:**
- Product
- Payment
- Invoice
- Inventory
- EventLog

---

### 5.11 Application (신청)
**정의:** 클래스 신청, 파트너 신청, 프로그램 신청 등 사람이 제출하는 참여/등록 의사 단위

**왜 핵심인가:**
- 파트너클래스와 회사 운영 모두에서 핵심
- 주문과 다른 승인/검토 흐름이 존재함

**필수 필드(1차 권장):**
- application_id
- application_type
- applicant_customer_id 또는 organization_id
- target_entity_type / target_entity_id
- submitted_at
- application_status
- approval_status
- payment_link_status
- owner_staff_id
- created_at / updated_at

**원천 여부:** 핵심 원천데이터

**연결 엔터티:**
- Class
- Partner
- Program
- Payment
- Approval

**미확정 포인트:**
- 파트너 신청과 수강 신청을 같은 테이블로 둘지 분리할지

---

### 5.12 Quote (견적)
**정의:** B2B/기관/고객 대상 사전 제안 금액 문서 단위

**왜 핵심인가:**
- CRM과 B2B 운영의 핵심
- 거래명세/입금/정산으로 이어짐

**필수 필드(1차 권장):**
- quote_id
- customer_id / organization_id
- quote_target_type / quote_target_id
- issue_date
- valid_until
- total_amount
- quote_status
- owner_staff_id
- linked_invoice_id (선택)
- created_at / updated_at

**원천 여부:** 핵심 원천데이터

---

### 5.13 Invoice / TransactionDocument (거래문서)
**정의:** 견적 이후 실제 거래 증빙/정리 문서 단위

**왜 핵심인가:**
- 현재 CRM 고도화의 중심
- 인쇄/회계/입금 확인과 연결됨

**필수 필드(1차 권장):**
- invoice_id
- document_type
- customer_id / organization_id
- linked_quote_id / linked_order_id
- issue_date
- document_status
- print_status
- send_status
- total_amount
- created_at / updated_at

**원천 여부:** 핵심 원천데이터

---

### 5.14 Payment (결제/입금)
**정의:** 주문/신청/문서에 대응하는 실제 결제 및 입금 기록

**왜 핵심인가:**
- 입금확인/미수금/정산/자동화의 기준
- 회사 운영 통제실의 핵심 데이터

**필수 필드(1차 권장):**
- payment_id
- source_entity_type / source_entity_id
- amount
- payment_method
- paid_at
- payment_status
- reconciliation_status
- payer_name or reference_text
- created_at / updated_at

**원천 여부:** 핵심 원천데이터

**미확정 포인트:**
- 주문 결제와 B2B 입금을 하나의 Payment 엔터티로 통합할지 subtype으로 나눌지

---

### 5.15 Settlement (정산)
**정의:** 파트너/강사/거래처/회사 내부 기준으로 수익 배분 및 지급을 정리하는 단위

**왜 핵심인가:**
- 파트너클래스와 B2B 운영 확대 시 매우 중요
- 입금 이후 정산 체계를 명확히 해야 함

**필수 필드(1차 권장):**
- settlement_id
- settlement_target_type / settlement_target_id
- settlement_period_start / end
- settlement_basis
- gross_amount
- net_amount
- settlement_status
- payout_status
- reviewed_by_staff_id
- created_at / updated_at

**원천 여부:** 핵심 원천데이터

---

### 5.16 Inventory (재고)
**정의:** 상품/재료/키트 구성품의 재고 상태 단위

**왜 핵심인가:**
- AX 전략에서 재고/출고 자동화 우선순위가 높음
- 품절/해제 자동화와 연결됨

**필수 필드(1차 권장):**
- inventory_id
- product_id
- inventory_track_unit
- location
- on_hand_qty
- available_qty
- safety_stock
- soldout_threshold
- inventory_status
- updated_at

**원천 여부:** 핵심 원천데이터

**미확정 포인트:**
- SKU/재료/키트 기준을 어떤 단위로 원장화할지

---

## D. 운영 제어 축

### 5.17 StatusCode (상태코드 사전)
**정의:** 회사 전 시스템에서 재사용할 상태코드 집합

**왜 핵심인가:**
- 상태값이 흩어지면 자동화/리포트/브리핑이 무너짐
- 신청, 주문, 결제, 정산, 파트너, 클래스 전부에 필요함

**필수 필드(1차 권장):**
- status_code
- status_group
- label
- description
- is_terminal
- sort_order
- allowed_next_statuses (구조는 추후 결정)

**원천 여부:** 핵심 원천데이터

---

### 5.18 Task / FollowUp (업무/후속조치)
**정의:** 사람이 처리해야 하는 운영 액션 단위

**왜 핵심인가:**
- 플로라 OS가 결국 해야 할 일은 “상태 + 할 일” 브리핑
- 대표/실무자 업무 연결 필요

**필수 필드(1차 권장):**
- task_id
- related_entity_type / related_entity_id
- task_type
- assignee_staff_id
- priority
- due_at
- task_status
- created_by_type / created_by_id
- created_at / updated_at

**원천 여부:** 핵심 원천데이터

---

### 5.19 Approval (승인)
**정의:** 사람이 최종 판단해야 하는 승인 단위

**왜 핵심인가:**
- 대표 원칙상 최종결정은 사람이 해야 함
- 자동화 경계 관리에 필요함

**필수 필드(1차 권장):**
- approval_id
- approval_type
- target_entity_type / target_entity_id
- requester_staff_id or system
- approver_staff_id
- approval_status
- decided_at
- decision_note
- created_at / updated_at

**원천 여부:** 핵심 원천데이터

---

### 5.20 EventLog (이벤트 로그)
**정의:** 상태 변화, 자동화 실행, 주요 업무 이벤트 기록

**왜 핵심인가:**
- 플로라 브리핑, 감사 추적, 자동화 복구에 필요함
- 시스템 간 진실 확인 기준이 됨

**필수 필드(1차 권장):**
- event_id
- entity_type / entity_id
- event_type
- actor_type / actor_id
- occurred_at
- payload_summary
- source_system

**원천 여부:** 핵심 원천데이터에 준하는 운영 원장

**미확정 포인트:**
- 상세 payload를 JSON으로 둘지 텍스트 요약 중심으로 둘지

---

## E. 분석/파생 축

### 5.21 BriefingSnapshot (브리핑 집계)
**정의:** 플로라가 대표에게 보여줄 요약 지표용 집계 데이터

**판정:** 원천데이터 아님, 파생데이터

### 5.22 SearchIndex / Cache
**정의:** 검색, 성능, 빠른 응답을 위한 인덱스/캐시

**판정:** 원천데이터 아님, 파생데이터

### 5.23 AnalyticsAggregate
**정의:** 기간별 성과/운영 집계를 위한 분석 데이터

**판정:** 원천데이터 아님, 파생데이터

---

## 6. 우선순위 분류

## P1. 즉시 원천데이터로 확정해야 할 엔터티
- Customer
- Organization
- Staff
- Partner
- Instructor
- Product
- Class
- Order
- Application
- Quote
- Invoice
- Payment
- Settlement
- Inventory
- StatusCode
- Task
- Approval
- EventLog

## P2. 2차 정교화 대상
- Program
- ContentAsset
- ChannelListing
- Bundle / Kit
- Review
- Schedule
- PartnerGradeHistory

## P3. 파생/보조 데이터
- BriefingSnapshot
- SearchIndex
- Cache
- AnalyticsAggregate

---

## 7. 핵심 관계 정의 (1차)

### 관계 A. 고객/조직
- Customer는 Organization에 소속될 수 있다.
- Organization은 여러 Customer를 담당자/연락처로 가질 수 있다.

### 관계 B. 파트너/강사
- Partner는 하나 이상의 Instructor를 가질 수 있다.
- Instructor는 Partner 없이 독립 활동할 가능성도 열어둔다.

### 관계 C. 클래스/상품
- Class는 하나 이상의 Product와 연결될 수 있다.
- Product는 여러 Class에 재료/키트로 연결될 수 있다.

### 관계 D. 신청/결제
- Application은 Payment와 연결될 수 있다.
- 모든 Application이 결제를 필요로 하지는 않는다.

### 관계 E. 견적/문서/입금/정산
- Quote → Invoice → Payment → Settlement 흐름을 기본으로 보되,
- Order 기반 거래와 병렬 흐름이 존재할 수 있다.

### 관계 F. 상태/업무/로그
- 주요 엔터티는 모두 StatusCode, Task, Approval, EventLog와 연결된다.

---

## 8. 현재 기준에서 보이는 회사 핵심 흐름

### 흐름 A. 상품 판매 운영
Customer → Order → Payment → Inventory → Invoice/CS → EventLog

### 흐름 B. B2B/기관 거래
Organization/Customer → Quote → Invoice → Payment → Settlement → EventLog

### 흐름 C. 파트너클래스 운영
Partner/Instructor → Class → Application → Payment → Settlement → Review/EventLog

### 흐름 D. 플로라 운영 브리핑
원천 엔터티들 → StatusCode/Task/EventLog → BriefingSnapshot → Flora OS

---

## 9. 원천데이터 vs 파생데이터 구분 규칙

### 원천데이터로 본다
- 사람이 직접 입력/수정하는 핵심 정보
- 거래/신청/입금/정산의 기준 정보
- 여러 시스템이 공통으로 참조해야 하는 정보
- 상태 변화의 기준이 되는 정보

### 파생데이터로 본다
- 집계 결과
- 검색 최적화 데이터
- 브리핑 캐시
- UI 편의용 임시 데이터
- 재생성 가능한 중간 산출물

### 금지
- 파생데이터를 원천데이터처럼 다시 수정·운영하는 것
- 브리핑 캐시를 실제 원장처럼 참조하는 것

---

## 10. 현재 남아 있는 미확정/확인 필요 사항

아래는 문서와 로컬 구조만으로는 확정이 어려워 추가 확인이 필요한 항목이다.

1. Customer와 Organization의 실제 운영 구분 기준
2. Partner와 Instructor의 1:1 / 1:N / N:N 관계 기준
3. Class와 Product의 연결 단위(재료 번들/키트/별도 판매)
4. Application 유형별 공통 필드와 개별 필드
5. Quote → Invoice → Payment → Settlement 흐름의 실제 예외 처리 방식
6. 재고 기준이 SKU 단위인지, 재료 단위인지, 키트 단위인지
7. 직원별 승인권자 범위와 AI가 관여 가능한 경계
8. EventLog를 어느 수준까지 남길지
9. 공방/협회/거래처/파트너의 조직 모델을 하나로 합칠지
10. Program과 Class의 경계

---

## 11. 다음 문서 추천

이 문서 다음으로 바로 이어져야 할 문서는 아래 2개다.

1. `company-state-model-guide.ko.md`
2. `company-entity-relationship-map.ko.md`

즉,
- 이 문서에서 **무엇이 존재하는지** 정하고
- 다음 문서에서 **그것들이 어떤 상태로 움직이는지** 정하고
- 그 다음 문서에서 **서로 어떻게 연결되는지** 정한다.

---

## 12. 최종 운영 문장

> PRESSCO21의 통합관리시스템은 고객, 거래처/조직, 파트너, 강사, 상품, 클래스, 신청, 주문, 견적, 거래문서, 결제/입금, 정산, 재고, 상태코드, 업무, 승인, 이벤트 로그를 핵심 원천 엔터티로 삼는다.  
> CRM, 파트너클래스, NocoDB, n8n, 플로라는 이 공통 엔터티 축을 기준으로 설계한다.  
> 브리핑/검색/집계/캐시는 파생데이터로 분리한다.
