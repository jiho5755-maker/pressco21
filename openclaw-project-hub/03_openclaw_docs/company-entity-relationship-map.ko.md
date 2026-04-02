# PRESSCO21 엔터티 관계도 가이드 v0.1 (초안)

_상태: 초안 / 현실 검증 필요 / 실무 적용 전_

## 1. 목적
이 문서는 PRESSCO21 핵심 원천 엔터티들의 관계를 1:1, 1:N, N:N 관점에서 정리한 관계도 초안이다.

## 2. 핵심 관계 요약
- Organization 1:N Customer
- Organization 1:N Partner
- Partner 1:N Instructor
- Partner 1:N Class
- Instructor 1:N Class
- Customer 1:N Order
- Customer/Organization 1:N Quote
- Quote 1:N Invoice
- Order/Application/Invoice 1:N Payment
- Partner/Instructor/Organization 1:N Settlement
- Product 1:N Inventory
- Class N:N Product (중간: ClassMaterialLink/Bundle)
- 모든 핵심 엔터티 1:N Task
- 모든 핵심 엔터티 1:N EventLog
- 승인 필요한 핵심 엔터티 1:N Approval

## 3. 관계 상세 초안
### 3.1 Customer ↔ Organization
- 기본: Customer는 개인 단위, Organization은 조직 단위
- 관계: Organization 1:N Customer
- 비고: B2B 거래처 담당자, 공방 대표, 협회 담당자 모두 Customer로 연결 가능

### 3.2 Organization ↔ Partner
- 기본: Partner는 사업적/운영적 파트너 단위, Organization은 법인/조직 단위
- 관계: Organization 1:N Partner 가능
- 비고: 실제론 1:1처럼 운영될 수도 있으므로 현실 검증 필요

### 3.3 Partner ↔ Instructor
- 기본: Partner가 강사를 보유하거나 연결할 수 있음
- 관계: Partner 1:N Instructor
- 비고: Instructor 독립 활동 가능성 때문에 N:1 또는 N:N 예외 검토 필요

### 3.4 Partner / Instructor ↔ Class
- 관계: Partner 1:N Class, Instructor 1:N Class
- 비고: 클래스는 운영 주체(Partner)와 수행 주체(Instructor)를 둘 다 가질 수 있음

### 3.5 Class ↔ Product
- 관계: N:N
- 이유: 한 클래스가 여러 재료/키트를 쓰고, 하나의 상품이 여러 클래스에 재사용될 수 있음
- 필요 중간 엔터티: `ClassMaterialLink` 또는 `Bundle`

### 3.6 Customer / Organization ↔ Quote / Invoice / Payment
- Customer/Organization 1:N Quote
- Quote 1:N Invoice
- Invoice 1:N Payment 가능
- Order 1:N Payment 가능
- 비고: B2C와 B2B 흐름을 함께 담기 위해 Payment는 source_entity_type/source_entity_id 구조 권장

### 3.7 Partner / Instructor / Organization ↔ Settlement
- 각 대상은 여러 정산 레코드를 가질 수 있음
- 관계: 각 대상 1:N Settlement

### 3.8 Product ↔ Inventory
- Product 1:N Inventory
- 비고: location, lot, unit tracking 여부에 따라 세부 분리 가능

### 3.9 모든 핵심 엔터티 ↔ Task / Approval / EventLog
- Task: 1:N
- Approval: 1:N
- EventLog: 1:N
- 이유: 운영/승인/감사 흔적이 모든 핵심 엔터티에 붙어야 함

## 4. 중간 엔터티 후보
- ClassMaterialLink
- Bundle / Kit
- ChannelListing
- PartnerGradeHistory
- Schedule
- Review
- CustomerOwner

## 5. 관계도 작성 원칙
- 사람/조직/거래/운영 제어를 섞지 않는다
- 다형 관계는 `entity_type + entity_id` 패턴 검토
- N:N는 중간 엔터티로 풀어낸다

## 6. 지호님 현실 체크 포인트
1. Partner와 Organization을 실제로 분리할지
2. Instructor가 독립 주체인지 Customer subtype인지
3. Quote → Invoice가 항상 1:N인지 실제론 1:1에 가까운지
4. Payment를 Order/Application/Invoice 공통 엔터티로 묶는 게 맞는지
5. Class ↔ Product 중간 엔터티를 Bundle로 볼지 Link로 볼지

## 7. 최종 운영 문장 (초안)
> PRESSCO21 핵심 엔터티는 Organization, Customer, Partner, Instructor, Class, Product, Quote, Invoice, Payment, Settlement를 중심으로 연결되며, Task/Approval/EventLog가 공통 운영 제어 레이어로 붙는다.
