# PRESSCO21 상태체계 가이드 v1

_대상: 지호님, 플로라, Claude Code, Codex, 향후 개발 에이전트_

## 1. 문서 목적

이 문서는 PRESSCO21의 핵심 원천 엔터티들이 **어떤 상태를 가지며, 어떤 순서로 이동하는지**를 정의하는 상태체계 초안이다.

이 문서의 목적은 아래와 같다.

1. CRM, 파트너클래스, NocoDB, n8n, 플로라가 같은 상태 언어를 사용하게 한다.
2. 자동화와 브리핑이 상태를 기준으로 동작하게 한다.
3. 상태값 난립을 막고 공통 StatusCode 체계를 위한 기준을 만든다.
4. 승인/예외/종료 상태를 명확히 해서 실무 혼선을 줄인다.

---

## 2. 상태 설계 원칙

### 원칙 1. 상태는 "현재 위치"를 표현해야 한다
상태는 감정이나 메모가 아니라, 운영 흐름상 현재 단계여야 한다.

### 원칙 2. 상태는 너무 많아도 안 되고 너무 적어도 안 된다
실제 의사결정과 자동화에 필요한 최소 단계만 남긴다.

### 원칙 3. 공통 상태와 도메인 전용 상태를 구분한다
예:
- 공통: 대기, 진행중, 완료, 취소, 보류
- 도메인 전용: 입금확인, 파트너승인대기, 클래스모집중

### 원칙 4. 종료 상태는 명확히 한다
완료/취소/종료/반려처럼 흐름이 끝난 상태는 terminal 상태로 정의한다.

### 원칙 5. 상태와 승인 단계를 섞지 않는다
승인은 Approval에서 관리하고, 상태에는 승인 결과만 반영한다.

---

## 3. 상태 그룹 체계

PRESSCO21 상태체계는 아래 8개 그룹으로 나눈다.

1. Customer 상태
2. Partner / Instructor 상태
3. Class 상태
4. Application 상태
5. Order 상태
6. Payment 상태
7. Document 상태
8. Settlement 상태
9. Task 상태
10. Approval 상태
11. Automation / Event 상태

---

## 4. 공통 상태 언어

모든 상태 그룹에서 필요 시 재사용하는 공통 개념:

- `draft` : 초안/작성중
- `pending` : 대기
- `in_progress` : 진행중
- `on_hold` : 보류
- `completed` : 완료
- `cancelled` : 취소
- `rejected` : 반려
- `archived` : 보관/비활성 기록

단, 실제 구현에서는 한국어 라벨과 코드값을 분리한다.

예:
- code: `pending_approval`
- label: `승인대기`

---

## 5. 엔터티별 상태 정의

## 5.1 Customer 상태

### 목적
고객 자체의 운영 가능 여부와 관계 상태를 관리한다.

### 권장 상태
- `active` : 정상 거래/응대 가능한 상태
- `inactive` : 장기간 활동 없음
- `vip` : 전략적 관리 대상 (속성으로 둘 수도 있음)
- `blocked` : 거래/응대 제한 대상
- `merged` : 중복 고객 병합 완료

### 비고
- VIP는 상태보다 태그/등급으로 빼는 것도 가능
- `merged`는 운영보단 데이터 정합용 상태

---

## 5.2 Partner 상태

### 목적
파트너 생태계 운영 단계와 활성 상태를 표현한다.

### 권장 상태
- `applied` : 신청 접수
- `reviewing` : 검토중
- `approved` : 승인 완료
- `onboarding` : 온보딩 진행중
- `active` : 정상 활동중
- `at_risk` : 이탈 위험/휴면 위험
- `inactive` : 비활성
- `rejected` : 반려
- `terminated` : 관계 종료

### 기본 전이
`applied → reviewing → approved → onboarding → active`

### 예외 전이
- `reviewing → rejected`
- `active → at_risk → inactive`
- `active → terminated`

---

## 5.3 Instructor 상태

### 목적
강사의 활동 가능 여부와 운영 상태를 표현한다.

### 권장 상태
- `candidate` : 등록 후보/대기
- `approved` : 활동 승인
- `active` : 활동중
- `paused` : 일시중지
- `inactive` : 장기 미활동
- `retired` : 종료

---

## 5.4 Class 상태

### 목적
클래스가 기획에서 종료까지 어떤 단계에 있는지 표현한다.

### 권장 상태
- `draft` : 초안
- `submitted` : 등록 요청됨
- `reviewing` : 검토중
- `approved` : 승인됨
- `published` : 공개됨
- `recruiting` : 모집중
- `closed` : 모집마감
- `running` : 운영중
- `completed` : 종료/완료
- `cancelled` : 취소
- `rejected` : 반려

### 기본 전이
`draft → submitted → reviewing → approved → published → recruiting → closed → running → completed`

### 실무 단순화 옵션
초기엔 아래처럼 단순화 가능:
- `draft`
- `reviewing`
- `published`
- `running`
- `completed`
- `cancelled`

---

## 5.5 Application 상태

### 목적
신청서가 접수 후 어떤 처리 단계에 있는지 표현한다.

### 공통 적용 대상
- 수강 신청
- 파트너 신청
- 제휴 신청
- 프로그램 신청

### 권장 상태
- `submitted` : 제출됨
- `under_review` : 검토중
- `waiting_payment` : 결제/입금 대기
- `approved` : 승인
- `rejected` : 반려
- `cancelled` : 취소
- `completed` : 신청 목적 달성 완료

### 설명
- 수강 신청은 `approved` 후 실제 수강 완료까지 별도 상태를 둘 수 있음
- 파트너 신청은 `approved` 뒤 `onboarding` 흐름과 연결 가능

---

## 5.6 Order 상태

### 목적
상품 주문의 처리 흐름을 표현한다.

### 권장 상태
- `placed` : 주문 생성
- `waiting_payment` : 입금 대기
- `paid` : 결제 완료
- `preparing` : 출고 준비중
- `shipped` : 출고 완료
- `delivered` : 배송 완료
- `cancel_requested` : 취소 요청
- `cancelled` : 주문 취소
- `returned` : 반품 완료
- `exchange_processing` : 교환 진행중

### 비고
Order 자체 상태와 Payment/배송 상태를 너무 섞지 않도록 주의

---

## 5.7 Payment 상태

### 목적
결제/입금 확인과 대사 상태를 표현한다.

### 권장 상태
- `unpaid` : 미결제/미입금
- `pending_confirmation` : 입금 확인 대기
- `partially_paid` : 부분입금
- `paid` : 입금 완료
- `reconciled` : 대사 완료
- `failed` : 결제 실패
- `refunded` : 환불 완료
- `cancelled` : 결제 취소

### 핵심 포인트
- `paid`와 `reconciled`는 다르다
- 실제 입금이 되었어도 회계 대사 전이면 `reconciled` 아님

---

## 5.8 Document 상태

### 목적
견적서/거래명세/세금 관련 문서의 현재 상태를 표현한다.

### 권장 상태
- `draft` : 초안
- `issued` : 발행 완료
- `sent` : 전달 완료
- `printed` : 인쇄 완료
- `revised` : 수정본 존재
- `cancelled` : 문서 취소
- `archived` : 보관

### 비고
문서 유형별 세부 상태는 subtype으로 확장 가능

---

## 5.9 Settlement 상태

### 목적
정산 계산부터 지급까지의 상태를 표현한다.

### 권장 상태
- `collecting` : 정산 데이터 수집중
- `calculated` : 계산 완료
- `under_review` : 검토중
- `approved` : 승인 완료
- `paying` : 지급 처리중
- `paid_out` : 지급 완료
- `on_hold` : 보류
- `cancelled` : 취소

### 핵심 포인트
- `calculated`와 `approved`를 분리해야 함
- 파트너/강사 정산에 중요

---

## 5.10 Task 상태

### 목적
사람이 수행해야 하는 업무의 진행 상태를 표현한다.

### 권장 상태
- `todo` : 해야 함
- `doing` : 진행중
- `waiting` : 외부 대기/확인 대기
- `done` : 완료
- `cancelled` : 취소
- `blocked` : 막힘

### 비고
플로라 브리핑의 핵심 상태군

---

## 5.11 Approval 상태

### 목적
사람 승인 흐름을 명확히 표현한다.

### 권장 상태
- `requested` : 승인 요청됨
- `under_review` : 검토중
- `approved` : 승인됨
- `rejected` : 반려됨
- `expired` : 만료됨
- `cancelled` : 요청 취소

### 비고
상태 엔터티와 별도로 관리하되, 결과는 본 상태에도 반영 가능

---

## 5.12 Automation / Event 상태

### 목적
자동화 실행 상태와 복구 가능성을 표현한다.

### 권장 상태
- `queued` : 대기열
- `running` : 실행중
- `succeeded` : 성공
- `failed` : 실패
- `retrying` : 재시도중
- `cancelled` : 취소

### 비고
원천데이터보다는 실행 운영 로그 성격이 강함

---

## 6. 상태 전이 설계 원칙

### 6.1 금지 전이 예시
- `draft → completed`
- `submitted → paid_out`
- `unpaid → reconciled`

즉 중간 단계 없이 건너뛰는 전이는 원칙적으로 금지

### 6.2 예외 허용
실무 예외가 있는 경우 EventLog와 Approval 근거가 있어야 한다.

예:
- 사람이 수기 보정
- 과거 데이터 이관
- 긴급 수동 처리

---

## 7. 실무 적용 우선순위

처음부터 전 상태군을 다 구현하지 않는다.

### 1차 우선 적용
- Application 상태
- Payment 상태
- Document 상태
- Settlement 상태
- Task 상태

### 2차 적용
- Partner 상태
- Class 상태
- Order 상태

### 3차 적용
- Customer 상태
- Instructor 상태
- Automation 상태

---

## 8. 플로라 브리핑에 바로 쓸 상태군

플로라가 대표/실무자 브리핑에 바로 써야 하는 상태는 아래다.

### 대표 브리핑용
- `under_review`
- `waiting_payment`
- `on_hold`
- `at_risk`
- `under_review` (정산)
- `blocked`

### 실무 브리핑용
- `todo`
- `doing`
- `waiting`
- `failed`
- `pending_confirmation`
- `preparing`

---

## 9. 상태코드 구현 원칙

실제 구현 시 상태는 아래 구조를 권장한다.

- `code` : 시스템 코드값 (예: `waiting_payment`)
- `label` : 사용자용 한국어 (예: `입금대기`)
- `group` : 상태 그룹 (예: `payment`)
- `is_terminal` : 종료 여부
- `sort_order` : 정렬순서
- `description` : 설명

---

## 10. 미확정/질문 필요 항목

1. Application을 공통 테이블로 통합할지 subtype으로 나눌지
2. Order 상태와 Payment 상태를 어느 정도까지 분리할지
3. Document 상태를 문서 유형별로 따로 둘지 공통화할지
4. Partner `at_risk` 기준을 어떻게 수치화할지
5. Class `published`와 `recruiting`을 분리할지
6. Settlement 승인 단계를 어느 수준까지 둘지

---

## 11. 다음 문서 추천

이 문서 다음으로 이어질 문서:

1. `company-entity-relationship-map.ko.md`
2. `company-core-workflows.ko.md`

즉,
- 원천 엔터티 정의
- 상태체계 정의
- 관계도 정의
- 핵심 업무 흐름 정의
순으로 이어진다.

---

## 12. 최종 운영 문장

> PRESSCO21는 고객, 파트너, 클래스, 신청, 주문, 결제/입금, 문서, 정산, 업무, 승인에 대해 공통 상태체계를 정의한다.  
> CRM, 파트너클래스, NocoDB, n8n, 플로라는 이 상태 언어를 기준으로 움직인다.  
> 상태값은 임의 텍스트가 아니라 공통 코드와 라벨을 가진 운영 기준으로 관리한다.
