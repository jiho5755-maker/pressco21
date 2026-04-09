# 오픈마켓 운영보완 엔진 Phase 1 상세 설계 v1

> 작성일: 2026-04-09
> 상태: Draft for Review
> 상위 문서: [PRD-오픈마켓-운영보완-리뷰-문의-인사이트-v1.md](/Users/jangjiho/workspace/pressco21/docs/PRD-오픈마켓-운영보완-리뷰-문의-인사이트-v1.md)
> 범위: `리뷰 답변 초안`, `문의 SLA 알람`, `기본 운영 큐 대시보드`
> 제외: 자동 발송, 통합 매출조회, 사방넷 대체, 재구매 엔진 본 구현

---

## 1. 문서 목적

이 문서는 PRD의 `Phase 1`을 바로 구현 단위로 쪼개기 위한 상세 설계 문서다.

목적은 세 가지다.

1. 어떤 화면을 먼저 만들지 고정한다.
2. 어떤 테이블과 워크플로우가 필요한지 확정한다.
3. 무엇을 자동화하고 무엇을 사람 승인으로 남길지 명확히 한다.

이 문서는 아이디어 메모가 아니라 `실행 가능한 설계 기준선`이다.

---

## 2. Phase 1 범위 재정의

Phase 1은 다음 세 모듈만 다룬다.

1. `리뷰 답변 초안 생성`
2. `문의 SLA 알람`
3. `기본 운영 큐 대시보드`

Phase 1의 핵심 원칙:

- 읽기, 분류, 알림, 초안 생성만 한다.
- 고객에게 직접 나가는 최종 발송은 사람이 승인한다.
- 사방넷의 주문/재고/송장 흐름은 건드리지 않는다.
- 통합 매출조회 기능은 이 문서 범위에서 제외한다.

---

## 3. 목표와 성공 조건

### 3.1 목표

- 이재혁 과장이 새 문의를 놓치지 않게 만든다.
- 채널별 리뷰 답변 초안 작성 시간을 줄인다.
- 운영자가 `오늘 반드시 봐야 할 큐`를 한 화면에서 확인하게 만든다.

### 3.2 성공 조건

Phase 1 완료 기준은 아래와 같다.

- 신규 문의가 들어오면 5분 이내 텔레그램 알림이 간다.
- 모든 문의는 `ok`, `warning`, `breach` 중 하나의 SLA 상태를 가진다.
- 리뷰 10건 이상을 선택해 한 번에 답변 초안을 생성할 수 있다.
- 운영자는 하나의 대시보드에서 `리뷰 대기`, `문의 경고`, `SLA 초과`, `오류 건`을 볼 수 있다.

---

## 4. Phase 1 전략 결정

### 4.1 저장 전략

Phase 1은 빠른 구축이 우선이므로 `NocoDB 운영 테이블 + n8n 워크플로우` 조합으로 시작한다.

- Raw 원본 응답: n8n execution + 필요 시 JSON archive
- 운영 큐/로그: NocoDB
- 알림: 텔레그램

Postgres는 Phase 2 이후 확장 시점에 검토한다.

### 4.2 승인 전략

리뷰 답변은 아래 상태를 따른다.

- `COLLECTED`
- `CLASSIFIED`
- `DRAFTED`
- `REVIEW_PENDING`
- `APPROVED`
- `PUBLISHED`
- `FAILED`

문의 SLA는 아래 상태를 따른다.

- `OK`
- `WARNING_50`
- `WARNING_80`
- `BREACH`
- `CLOSED`

### 4.3 역할 전략

| 역할 | 책임 |
|------|------|
| AI | 분류, 요약, 초안 생성 |
| 운영자 | 검수, 승인, 예외 처리 |
| 관리자 | SLA 초과, 정책 예외, 보상/환불 관련 최종 판단 |

---

## 5. 사용자 흐름

### 5.1 리뷰 답변 흐름

```text
채널 리뷰 수집
→ 상품/별점/주제 분류
→ 답변 초안 생성
→ 운영자 검수
→ 승인
→ 채널 반영 또는 수동 반영 체크
→ 완료 로그 저장
```

### 5.2 문의 SLA 흐름

```text
채널 문의 수집
→ received_at 저장
→ SLA due_at 계산
→ 담당자 라우팅
→ 신규 문의 즉시 알림
→ 50% / 80% 경고
→ breach 알림
→ 답변 완료 시 closed 처리
```

### 5.3 운영 대시보드 흐름

```text
운영자 접속
→ 오늘의 신규 문의
→ SLA 경고/초과
→ 리뷰 초안 대기
→ 오류 건
→ 각 상세 큐로 이동
```

---

## 6. 화면 설계

Phase 1 화면은 3개로 제한한다.

### 6.1 화면 A: 리뷰 답변 큐

#### 목적

- 리뷰를 한 번에 모아 보고 답변 초안을 생성/검수한다.

#### 주요 영역

1. 상단 필터
   - 채널
   - 상품
   - 별점
   - 답변 상태
   - 최근 7일/30일

2. 리뷰 리스트
   - 선택 체크박스
   - 채널
   - 상품명
   - 별점
   - 리뷰 요약
   - 주제 태그
   - 답변 상태
   - 수집일

3. 우측 패널
   - 원문 보기
   - AI 초안 보기
   - 수정 입력창
   - 승인 / 반려 / 보류 버튼

#### 핵심 액션

- `선택 건 초안 생성`
- `승인 후 반영`
- `반려 후 재초안`
- `템플릿로 저장`

### 6.2 화면 B: 문의 SLA 보드

#### 목적

- 신규 문의와 SLA 임박 건을 우선순위 기준으로 처리한다.

#### 주요 영역

1. KPI 카드
   - 오늘 신규 문의
   - 경고 건수
   - 초과 건수
   - 미배정 건수

2. 컬럼형 보드
   - 신규
   - 50% 경고
   - 80% 경고
   - 초과
   - 종료 대기

3. 상세 패널
   - 채널
   - 문의 시각
   - 남은 시간
   - 문의 원문
   - 주문/상품 연결
   - 담당자
   - 메모

#### 핵심 액션

- `담당자 지정`
- `응답 완료 표시`
- `수동 재알림`
- `채널 바로가기`

### 6.3 화면 C: 운영 큐 대시보드

#### 목적

- 오늘 처리해야 할 운영 큐만 빠르게 보여준다.

#### 주요 영역

1. 상단 요약
   - 신규 문의
   - SLA 초과
   - 리뷰 답변 대기
   - 워크플로우 오류

2. 오늘의 우선순위 리스트
   - 가장 오래된 미응답 문의
   - 별점 2점 이하 리뷰
   - 오류/재시도 필요 건

3. 하단 링크
   - 리뷰 큐 이동
   - 문의 보드 이동
   - 로그 보기

#### 핵심 액션

- `오늘 처리할 10건만 보기`
- `담당자별 필터`
- `텔레그램 알림 내역 확인`

---

## 7. NocoDB 테이블 설계

Phase 1은 아래 6개 테이블이면 충분하다.

### 7.1 `om_channel_policy`

채널별 SLA와 운영 규칙 저장

| 필드 | 타입 | 설명 |
|------|------|------|
| channel_name | Text | `coupang`, `smartstore`, `11st`, `makeshop` |
| inquiry_sla_hours | Number | 기본 응답 제한 시간 |
| warn_50_enabled | Checkbox | 50% 경고 사용 여부 |
| warn_80_enabled | Checkbox | 80% 경고 사용 여부 |
| business_hour_start | Text | 예: `09:00` |
| business_hour_end | Text | 예: `18:00` |
| holiday_policy | Text | 휴일 처리 규칙 |
| active | Checkbox | 채널 사용 여부 |

### 7.2 `om_agent_routing`

담당자 라우팅 규칙 저장

| 필드 | 타입 | 설명 |
|------|------|------|
| channel_name | Text | 채널 |
| inquiry_type | Text | `delivery`, `stock`, `usage`, `exchange`, `return`, `etc` |
| assignee_name | Text | 담당자명 |
| assignee_telegram_chat_id | Text | 텔레그램 라우팅용 |
| escalation_name | Text | 초과 시 관리자 |
| active | Checkbox | 사용 여부 |

### 7.3 `om_review_queue`

리뷰 수집과 답변 승인 큐

| 필드 | 타입 | 설명 |
|------|------|------|
| review_uid | Text | 채널 원본 ID |
| channel_name | Text | 채널 |
| order_id | Text | 주문번호 |
| sku_id | Text | 내부 SKU |
| product_name | Text | 상품명 |
| rating | Number | 별점 |
| review_text | LongText | 리뷰 원문 |
| review_type | Text | `text`, `photo`, `video` |
| topic_tag | Text | 주제 태그 |
| sentiment | Text | `positive`, `neutral`, `negative` |
| draft_reply | LongText | AI 초안 |
| operator_reply | LongText | 운영자 수정본 |
| status | Text | 승인 상태 |
| assigned_to | Text | 담당자 |
| collected_at | DateTime | 수집 시각 |
| approved_at | DateTime | 승인 시각 |
| published_at | DateTime | 반영 시각 |
| error_message | LongText | 오류 로그 |

### 7.4 `om_review_reply_log`

리뷰 답변 이력 보관

| 필드 | 타입 | 설명 |
|------|------|------|
| review_uid | Text | 원본 리뷰 ID |
| version_no | Number | 초안 버전 |
| generated_by | Text | `ai`, `operator` |
| reply_text | LongText | 답변 내용 |
| action_type | Text | `draft`, `approve`, `publish`, `reject` |
| actor_name | Text | 수행자 |
| acted_at | DateTime | 수행 시각 |

### 7.5 `om_inquiry_queue`

문의 SLA 관리 큐

| 필드 | 타입 | 설명 |
|------|------|------|
| inquiry_uid | Text | 채널 원본 ID |
| channel_name | Text | 채널 |
| order_id | Text | 주문번호 |
| sku_id | Text | 상품 ID |
| customer_name | Text | 고객명 |
| inquiry_type | Text | 문의 유형 |
| subject | Text | 제목 |
| body | LongText | 문의 원문 |
| received_at | DateTime | 접수 시각 |
| due_at | DateTime | SLA 만료 시각 |
| sla_status | Text | `OK`, `WARNING_50`, `WARNING_80`, `BREACH`, `CLOSED` |
| assignee_name | Text | 담당자 |
| assignee_telegram_chat_id | Text | 알림 대상 |
| first_response_at | DateTime | 첫 응답 시각 |
| closed_at | DateTime | 종료 시각 |
| channel_url | Text | 채널 바로가기 |
| error_message | LongText | 오류 로그 |

### 7.6 `om_ops_digest`

운영 대시보드와 일일 요약용 스냅샷

| 필드 | 타입 | 설명 |
|------|------|------|
| digest_date | Date | 기준일 |
| new_inquiry_count | Number | 신규 문의 |
| warning_count | Number | SLA 경고 건수 |
| breach_count | Number | SLA 초과 건수 |
| review_pending_count | Number | 리뷰 답변 대기 |
| failed_job_count | Number | 실패 워크플로우 |
| top_priority_summary | LongText | 우선 처리 요약 |
| created_at | DateTime | 생성 시각 |

---

## 8. n8n 워크플로우 설계

Phase 1에서 필요한 워크플로우는 3개다.

### 8.1 `OM-REV-01 리뷰 수집 및 초안 생성`

#### 트리거

- 30분 간격 스케줄
- 또는 수동 재수집 버튼

#### 흐름

1. 채널별 리뷰 수집
2. 기존 `review_uid` 중복 확인
3. 신규 건만 `om_review_queue` 적재
4. 감성/주제 분류
5. 초안 생성 프롬프트 호출
6. `draft_reply` 저장
7. 상태를 `REVIEW_PENDING`으로 변경

#### 실패 처리

- 채널 API 실패 시 `error_message` 기록
- 3회 재시도 후 텔레그램 오류 알림

### 8.2 `OM-SLA-01 문의 수집 및 SLA 알람`

#### 트리거

- 5분 간격 스케줄

#### 흐름

1. 채널별 문의 수집
2. 신규 문의 중복 제거
3. `received_at`, `due_at` 계산
4. 라우팅 규칙 조회
5. `om_inquiry_queue` 적재
6. 텔레그램 즉시 알림
7. 기존 건은 `now` 기준으로 SLA 단계 재계산
8. 50% / 80% / breach 알림 발송

#### 실패 처리

- 라우팅 규칙 누락 시 관리자 기본 라우팅
- 텔레그램 발송 실패 시 2회 재시도 후 오류 큐 적재

### 8.3 `OM-DIGEST-01 운영 큐 스냅샷`

#### 트리거

- 매일 09:00
- 매일 16:00

#### 흐름

1. `om_inquiry_queue` 집계
2. `om_review_queue` 집계
3. 오류 건 집계
4. 우선 처리 10건 요약
5. `om_ops_digest` 저장
6. 텔레그램 운영 리포트 발송

#### 실패 처리

- 집계 실패 시 요약 없이 오류 경고만 발송

---

## 9. 텔레그램 메시지 규격

### 9.1 신규 문의 알림

```text
문의 접수
- 채널: 스마트스토어
- 유형: 배송
- 고객: 김**
- 상품: 압화꽃 장미
- 접수: 10:14
- SLA 마감: 2026-04-09 10:14 +24h
- 담당: 이재혁
- 바로가기: {channel_url}
```

### 9.2 SLA 경고 알림

```text
SLA 경고
- 채널: 쿠팡
- 단계: 80%
- 남은 시간: 4시간 30분
- 고객: 박**
- 상품: 레진 키트
- 담당: 이재혁
- 바로가기: {channel_url}
```

### 9.3 리뷰 초안 생성 완료 알림

```text
리뷰 초안 생성 완료
- 채널: 11번가
- 상품: 하바리움 오일
- 별점: 2점
- 상태: REVIEW_PENDING
- 담당자 검수 필요
```

---

## 10. 라우팅 규칙 초안

초기 라우팅은 단순하게 시작한다.

| 문의 유형 | 기본 담당 | 비고 |
|------|------|------|
| delivery | 이재혁 | 배송 조회/지연 |
| stock | 이재혁 | 재고/품절/입고 |
| usage | 이재혁 1차, 대표 2차 | 상품 사용법/혼합비율 |
| exchange | 이재혁 | 교환 요청 |
| return | 이재혁 | 반품 요청 |
| etc | 이재혁 | 예외 처리 |

초과 시:

- 1차: 담당자
- 2차: 장지호 팀장
- 3차: 대표

---

## 11. 구현 우선순위

### 11.1 Week 1

- NocoDB 테이블 6개 생성
- `om_channel_policy`, `om_agent_routing` 초기 데이터 입력
- `OM-SLA-01` 워크플로우 구축
- 텔레그램 신규 문의 알림 확인

### 11.2 Week 2

- `OM-REV-01` 구축
- 리뷰 큐 화면 구현
- AI 초안 생성과 승인 로그 확인

### 11.3 Week 3

- `OM-DIGEST-01` 구축
- 운영 큐 대시보드 구현
- 우선 처리 요약 메시지 안정화

---

## 12. 검증 시나리오

### 12.1 문의 SLA

1. 신규 문의 1건이 수집된다.
2. `received_at`, `due_at`가 저장된다.
3. 담당자에게 텔레그램 알림이 간다.
4. 시간 경과 시 경고 단계가 올라간다.
5. 응답 완료 표시 시 `CLOSED`로 변경된다.

### 12.2 리뷰 답변

1. 신규 리뷰 5건이 수집된다.
2. 주제 태그와 감성 분류가 기록된다.
3. 초안이 생성된다.
4. 운영자가 수정 후 승인한다.
5. 로그에 승인 이력이 남는다.

### 12.3 운영 대시보드

1. 신규 문의/경고/초과/리뷰 대기가 올바르게 집계된다.
2. 우선 처리 10건이 정렬된다.
3. 텔레그램 요약 리포트와 화면 수치가 일치한다.

---

## 13. 미결정 항목

아래는 구현 전 확인이 필요하다.

1. 쿠팡/스마트스토어/11번가/메이크샵별 리뷰/문의 수집 가능 범위
2. 리뷰 답변을 API로 직접 반영할지, 운영자 수동 반영까지로 제한할지
3. 이재혁 과장 및 관리자 텔레그램 chat id 확정
4. 메이크샵 문의 데이터를 어떤 경로로 가져올지
5. 내부 운영 화면을 NocoDB 뷰로 시작할지, 별도 프론트로 바로 만들지

---

## 14. 최종 권고

Phase 1은 `문의 SLA 알람`을 먼저 여는 것이 맞다.

이유:

- 가장 즉각적인 체감 가치가 크다.
- 쿠팡/스마트스토어 문의는 시간 리스크가 직접적이다.
- 리뷰 초안과 운영 대시보드는 이 알람 체계 위에 자연스럽게 붙는다.

그 다음은 `리뷰 답변 초안`, 마지막이 `운영 큐 대시보드`다.

즉 Phase 1 실제 순서는 아래다.

1. `OM-SLA-01`
2. `OM-REV-01`
3. `OM-DIGEST-01`

---

## 15. 참고 문서

- [PRD-오픈마켓-운영보완-리뷰-문의-인사이트-v1.md](/Users/jangjiho/workspace/pressco21/docs/PRD-오픈마켓-운영보완-리뷰-문의-인사이트-v1.md)
- [openmarket-ops/om-sla-01-nocodb-ddl.sql](/Users/jangjiho/workspace/pressco21/docs/openmarket-ops/om-sla-01-nocodb-ddl.sql)
- [openmarket-ops/om-sla-01-n8n-draft.json](/Users/jangjiho/workspace/pressco21/docs/openmarket-ops/om-sla-01-n8n-draft.json)
- [openmarket-ops/om-sla-01-implementation-notes.md](/Users/jangjiho/workspace/pressco21/docs/openmarket-ops/om-sla-01-implementation-notes.md)
- [PRD-고객운영OS-통합-v1.md](/Users/jangjiho/workspace/pressco21/docs/PRD-고객운영OS-통합-v1.md)
- [고객운영OS-상세계획-2026-04-01.md](/Users/jangjiho/workspace/pressco21/docs/고객운영OS-상세계획-2026-04-01.md)
- [PRD-Q2-자산배선-고도화-v1.md](/Users/jangjiho/workspace/pressco21/docs/PRD-Q2-자산배선-고도화-v1.md)
- [Phase-C/prompt-templates/루나-이재혁-CS물류.md](/Users/jangjiho/workspace/pressco21/docs/Phase-C/prompt-templates/루나-이재혁-CS물류.md)
