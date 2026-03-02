# PRESSCO21 파트너 클래스 플랫폼 -- GAS to n8n + Airtable 전환 아키텍처

> **작성일**: 2026-02-25
> **대상**: 기존 GAS 백엔드 5,271줄 -> n8n + Airtable 전환
> **현재 인프라**: n8n.pressco21.com (Oracle Cloud ARM), Airtable (app6MBsHo7AKwh5XD), 텔레그램 @Pressco21_makeshop_bot
> **프론트엔드 변경**: GAS_URL -> N8N_URL 교체만 (기존 JS 로직 유지)

---

## 목차

1. [전환 개요 및 기존 GAS 기능 매핑](#1-전환-개요-및-기존-gas-기능-매핑)
2. [n8n 워크플로우 설계 (13개)](#2-n8n-워크플로우-설계-13개)
3. [Airtable 테이블 구조 설계 (8개)](#3-airtable-테이블-구조-설계-8개)
4. [CORS 처리 방안](#4-cors-처리-방안)
5. [파트너 인증 플로우 설계](#5-파트너-인증-플로우-설계)
6. [이메일 전략](#6-이메일-전략)
7. [GAS 대비 n8n의 구조적 장점](#7-gas-대비-n8n의-구조적-장점)
8. [프론트엔드 변경 사항](#8-프론트엔드-변경-사항)
9. [마이그레이션 순서 및 체크리스트](#9-마이그레이션-순서-및-체크리스트)

---

## 1. 전환 개요 및 기존 GAS 기능 매핑

### 1.1 전환 동기

| 항목 | GAS 현재 한계 | n8n + Airtable 해결 |
|------|-------------|-------------------|
| 이메일 | Gmail 100건/일 (실운영 70건 경고) | n8n SMTP: 무제한 (자체 서버) |
| 실행 시간 | 6분/회, 일 90분 | n8n: 제한 없음 (자체 호스팅) |
| 모니터링 | Logger.log만 (수동 확인) | n8n 실행 이력 + 텔레그램 실시간 알림 |
| 에러 복구 | 수동 retryFailedSettlements() | n8n 자동 재시도 + 에러 워크플로우 |
| 동시성 | LockService (단일 스크립트) | n8n Queue + Airtable 낙관적 동시성 |
| 확장성 | Sheets 10,000행 성능 저하 | Airtable 50,000행/테이블 + 뷰 + 자동화 |
| 배포 | GAS 편집기 + 수동 배포 | n8n GUI 워크플로우 즉시 반영 |
| 알림 | 이메일 알림만 (관리자) | 텔레그램 봇 실시간 알림 (이미 운영 중) |

### 1.2 기존 GAS 기능 -> n8n 워크플로우 매핑

| GAS 함수 | 기능 | n8n 워크플로우 | 트리거 |
|----------|------|--------------|--------|
| `doGet` (getClasses, getClassDetail, getCategories) | 클래스 조회 API | WF-01: Class API | Webhook |
| `doGet` (getPartnerAuth, getPartnerDashboard) | 파트너 인증/대시보드 | WF-02: Partner Auth API | Webhook |
| `doGet` (getPartnerBookings, getPartnerReviews) | 파트너 예약/후기 조회 | WF-03: Partner Data API | Webhook |
| `doGet` (getPartnerApplicationStatus) | 파트너 신청 상태 | WF-02에 통합 | Webhook |
| `doGet` (getEducationStatus) | 교육 이수 상태 | WF-02에 통합 | Webhook |
| `doPost` (recordBooking) | 예약 기록 | WF-04: Record Booking | Webhook |
| `doPost` (pollOrders) | 주문 폴링 | WF-05: Order Polling | Schedule (10분) |
| `doPost` (updateClassStatus) | 클래스 상태 변경 | WF-06: Class Management | Webhook |
| `doPost` (partnerApply) | 파트너 신청 | WF-07: Partner Apply | Webhook |
| `doPost` (partnerApprove) | 파트너 승인 | WF-08: Partner Approve | Webhook |
| `doPost` (replyToReview) | 후기 답변 | WF-09: Review Reply | Webhook |
| `doPost` (educationComplete) | 교육 이수 완료 | WF-10: Education Complete | Webhook |
| `triggerSendReminders` | D-3/D-1 리마인더 | WF-11: Send Reminders | Schedule (매일 09:00) |
| `triggerSendReviewRequests` | 후기 요청 (+7일) | WF-12: Review Requests | Schedule (매일 10:00) |
| `triggerReconciliation` | 정합성 검증 | WF-05에 통합 (야간 배치) | Schedule (매일 00:00) |
| `triggerSyncClassProducts` | 상품 동기화 | WF-05에 통합 (야간 배치) | Schedule (매일 03:00) |
| `triggerUpdatePartnerGrades` | 등급 자동 업데이트 | WF-13: Grade Update | Schedule (매일 06:00) |
| `retryFailedSettlements` | 실패 정산 재시도 | WF-05에 통합 (실패 건 자동 재시도) | Schedule |
| `handleClearCache` | 캐시 삭제 | 불필요 (Airtable 실시간 조회) | - |

---

## 2. n8n 워크플로우 설계 (13개)

### WF-01: Class API (클래스 조회)

**트리거**: Webhook (GET)
**URL**: `https://n8n.pressco21.com/webhook/class-api`
**기존 GAS**: `handleGetClasses`, `handleGetClassDetail`, `handleGetCategories`

```
[Webhook GET] -> [Switch: action 파라미터]
  |
  +--> action=getClasses
  |     -> [Airtable: "클래스 메타" 조회, status=active]
  |     -> [Filter: category, level, type, region]
  |     -> [Sort: sort 파라미터]
  |     -> [Pagination: page, limit]
  |     -> [Airtable: "파트너 상세"에서 partner_name 조인]
  |     -> [Respond to Webhook: JSON 응답]
  |
  +--> action=getClassDetail
  |     -> [Airtable: "클래스 메타" 단일 조회 by class_id]
  |     -> [Airtable: "파트너 상세" 조회 by partner_code]
  |     -> [Merge: 클래스+파트너 데이터 결합]
  |     -> [Respond to Webhook: JSON 응답]
  |
  +--> action=getCategories
        -> [Airtable: "클래스 메타" 전체, status=active]
        -> [Code: 카테고리 추출 + 중복 제거 + 건수 집계]
        -> [Respond to Webhook: JSON 응답]
```

**Airtable 연동**: "클래스 메타" 테이블 List Records + Filter Formula
**텔레그램 알림**: 없음 (조회 전용)
**캐싱 전략**: GAS의 CacheService 5분 캐싱은 제거. Airtable 직접 조회가 충분히 빠름 (200~500ms). 프론트엔드 localStorage 1시간 캐싱은 유지.

**n8n 구현 참고사항**:
- Airtable의 `filterByFormula` 파라미터로 서버 사이드 필터링 가능
- 예: `AND({status}='active', {category}='압화')` 형식
- Airtable API는 페이지당 100레코드 제한 -> offset 파라미터로 페이지네이션
- 정렬은 `sort[0][field]=price&sort[0][direction]=asc` 형식

---

### WF-02: Partner Auth API (파트너 인증/상태)

**트리거**: Webhook (GET)
**URL**: `https://n8n.pressco21.com/webhook/partner-auth`
**기존 GAS**: `handleGetPartnerAuth`, `handleGetPartnerDashboard`, `handleGetPartnerApplicationStatus`, `handleGetEducationStatus`

```
[Webhook GET] -> [Switch: action 파라미터]
  |
  +--> action=getPartnerAuth
  |     -> [IF: member_id 파라미터 존재?]
  |     -> [Airtable: "파트너 상세" 조회 by member_id]
  |     -> [IF: 파트너 존재?]
  |       -> Yes: [Code: 파트너 데이터 정리 + 상태 분기 (active/pending/inactive)]
  |       -> No:  [Airtable: "파트너 신청" 조회 by member_id]
  |               -> [Code: 신청 상태 또는 "비파트너" 응답]
  |     -> [Respond to Webhook]
  |
  +--> action=getPartnerDashboard
  |     -> [Airtable: "파트너 상세" 인증]
  |     -> [Airtable: "클래스 메타" 조회 by partner_code]
  |     -> [Airtable: "정산 내역" 조회 by partner_code + month 필터]
  |     -> [Code: 대시보드 데이터 집계 (매출/수수료/예약 통계)]
  |     -> [Respond to Webhook]
  |
  +--> action=getPartnerApplicationStatus
  |     -> [Airtable: "파트너 신청" 조회 by member_id]
  |     -> [Code: 상태 정리 (PENDING/APPROVED/REJECTED)]
  |     -> [Respond to Webhook]
  |
  +--> action=getEducationStatus
        -> [Airtable: "파트너 상세" 조회 by member_id]
        -> [Code: education_completed, education_date, education_score 반환]
        -> [Respond to Webhook]
```

**Airtable 연동**: "파트너 상세", "파트너 신청", "클래스 메타", "정산 내역" 테이블
**텔레그램 알림**: 없음 (조회 전용)

---

### WF-03: Partner Data API (파트너 예약/후기 조회)

**트리거**: Webhook (GET)
**URL**: `https://n8n.pressco21.com/webhook/partner-data`
**기존 GAS**: `handleGetPartnerBookings`, `handleGetPartnerReviews`

```
[Webhook GET] -> [Switch: action 파라미터]
  |
  +--> action=getPartnerBookings
  |     -> [Airtable: "파트너 상세" 인증 by member_id]
  |     -> [Airtable: "정산 내역" 조회 by partner_code]
  |     -> [Filter: 기간(from_date, to_date), class_id 필터]
  |     -> [Code: 수강생 정보 마스킹 (maskPhone_, maskName_)]
  |     -> [Pagination: page, limit]
  |     -> [Respond to Webhook]
  |
  +--> action=getPartnerReviews
        -> [Airtable: "파트너 상세" 인증 by member_id]
        -> [Airtable: "후기" 조회 by partner_code]
        -> [Code: 별점 분포 계산, 평균 산출]
        -> [Pagination: page, limit]
        -> [Respond to Webhook]
```

**Airtable 연동**: "파트너 상세", "정산 내역", "후기" 테이블
**텔레그램 알림**: 없음

**개인정보 마스킹 (Code 노드에서 구현)**:
```javascript
// n8n Code 노드: 기존 GAS maskPhone_, maskName_, maskEmail_ 로직 이식
function maskPhone(phone) {
  if (!phone || phone.length < 7) return '***';
  return phone.substring(0, 3) + '-****-' + phone.substring(phone.length - 4);
}

function maskName(name) {
  if (!name || name.length < 2) return '*';
  return name.charAt(0) + '*'.repeat(name.length - 1);
}

function maskEmail(email) {
  if (!email || email.indexOf('@') === -1) return '***';
  var parts = email.split('@');
  var local = parts[0];
  return local.substring(0, Math.min(3, local.length))
    + '***@' + parts[1];
}
```

---

### WF-04: Record Booking (예약 기록)

**트리거**: Webhook (POST)
**URL**: `https://n8n.pressco21.com/webhook/record-booking`
**기존 GAS**: `handleRecordBooking`, `processOrderInternal_`, `processReservePayment_`

```
[Webhook POST]
  -> [Code: POST 본문 파싱 + 입력값 검증]
  -> [Airtable: "클래스 메타" 조회 by class_id]
  -> [IF: 클래스 존재?]
    -> No: [Respond: CLASS_NOT_FOUND 에러]
    -> Yes:
      -> [Airtable: "파트너 상세" 조회 by partner_code]
      -> [Code: 수수료 계산]
        // SILVER 10%, GOLD 12%, PLATINUM 15%
        // reserveAmount = Math.round(orderAmount * commissionRate * reserveRate)
      -> [Airtable: "정산 내역" Create Record]
        // status: PENDING
        // settlement_id: STL_YYYYMMDD_XXXXXX
      -> [HTTP Request: 메이크샵 process_reserve API 호출]
        // POST https://foreverlove.co.kr/list/open_api_process.html
        // mode=save&type=reserve&process=give
      -> [IF: 적립금 지급 성공?]
        -> Yes: [Airtable: "정산 내역" Update, status=COMPLETED]
        -> No:  [Airtable: "정산 내역" Update, status=FAILED]
                [Telegram: 관리자에게 실패 알림]
      -> [Send Email: 수강생 예약 확인]
      -> [Send Email: 파트너 예약 알림]
      -> [Telegram: "새 예약! {클래스명} - {수강생} {인원}명"]
      -> [Respond to Webhook: 성공 응답]
```

**Airtable 연동**: "클래스 메타", "파트너 상세", "정산 내역" 테이블 (Create + Update)
**텔레그램 알림**: 새 예약 + 적립금 실패 시 알림
**메이크샵 API**: process_reserve (적립금 지급)

**핵심 수수료 로직 (Code 노드)**:
```javascript
const COMMISSION_RATES = {
  SILVER:   { commissionRate: 0.10, reserveRate: 1.00 },
  GOLD:     { commissionRate: 0.12, reserveRate: 0.80 },
  PLATINUM: { commissionRate: 0.15, reserveRate: 0.60 }
};

const grade = (partner.grade || 'SILVER').toUpperCase();
const config = COMMISSION_RATES[grade] || COMMISSION_RATES.SILVER;
const orderAmount = Number(bookingData.total_price) || 0;
const commissionAmount = Math.round(orderAmount * config.commissionRate);
const reserveAmount = Math.round(commissionAmount * config.reserveRate);
```

---

### WF-05: Order Polling + 야간 배치 (주문 폴링/동기화/정합성/재시도)

**트리거**: Schedule (복합)
- 매 10분: 주문 폴링
- 매일 00:00: 정합성 검증
- 매일 03:00: 상품 동기화
- 매일 04:00: 실패 정산 재시도

**기존 GAS**: `handlePollOrders`, `triggerReconciliation`, `syncClassProducts_`, `retryFailedSettlements`

#### 5a. 주문 폴링 (매 10분)

```
[Schedule: 매 10분]
  -> [Code: 마지막 폴링 시각 조회]
  -> [HTTP Request: 메이크샵 주문 조회 API]
    // GET https://foreverlove.co.kr/list/open_api.html
    // mode=search&type=order_list&status=결제완료
  -> [IF: 새 주문 존재?]
    -> No: [Code: 폴링 로그 기록만]
    -> Yes:
      -> [SplitInBatches: 주문 건별 처리]
        -> [Airtable: "정산 내역" 중복 체크 by order_id]
        -> [IF: 이미 처리됨?]
          -> Yes: [Skip]
          -> No:
            -> [Code: 클래스 상품 매칭 (makeshop_product_id)]
            -> [Airtable: "정산 내역" Create]
            -> [HTTP Request: process_reserve 적립금 지급]
            -> [Airtable: Update status]
            -> [Send Email: 수강생 확인 + 파트너 알림]
      -> [Airtable: "주문 처리 로그" Create]
      -> [Telegram: "주문 폴링 결과: {처리건수}건 처리"]
```

#### 5b. 상품 동기화 (매일 03:00)

```
[Schedule: 매일 03:00]
  -> [HTTP Request: 메이크샵 상품 목록 API (파트너 클래스 카테고리)]
  -> [Airtable: "클래스 메타" 전체 조회]
  -> [Code: 비교 로직]
    // 신규 상품 -> Create
    // 기존 상품 -> 가격/상태 Update
    // 삭제 상품 -> status=INACTIVE Update
  -> [SplitInBatches: 변경 건 처리]
    -> [Airtable: Create or Update]
  -> [Telegram: "상품 동기화 완료: 신규 {N}건, 수정 {N}건, 비활성 {N}건"]
```

#### 5c. 정합성 검증 (매일 00:00)

```
[Schedule: 매일 00:00]
  -> [Airtable: "정산 내역" status=COMPLETED 조회]
  -> [Code: 파트너별 누적 적립금 집계]
  -> [SplitInBatches: 파트너별]
    -> [HTTP Request: 메이크샵 적립금 조회 API]
    -> [Code: 불일치 감지]
  -> [IF: 불일치 존재?]
    -> Yes: [Telegram: "정합성 검증 불일치 {N}건 감지"]
    -> No:  [Code: 로그만 기록]
```

#### 5d. 실패 정산 재시도 (매일 04:00)

```
[Schedule: 매일 04:00]
  -> [Airtable: "정산 내역" status=FAILED, retry_count < 5 조회]
  -> [IF: 재시도 대상 존재?]
    -> No: [Stop]
    -> Yes:
      -> [SplitInBatches: 건별 재시도]
        -> [HTTP Request: process_reserve 적립금 지급]
        -> [IF: 성공?]
          -> Yes: [Airtable: status=COMPLETED Update]
          -> No:  [Airtable: retry_count+1 Update]
                  [IF: retry_count >= 5?]
                    -> Yes: [Telegram: "정산 최대 재시도 초과: {settlement_id}"]
      -> [Telegram: "재시도 결과: 성공 {N}건, 실패 {N}건"]
```

**Airtable 연동**: "정산 내역", "클래스 메타", "주문 처리 로그" 테이블
**텔레그램 알림**: 폴링 결과, 동기화 결과, 정합성 불일치, 재시도 결과
**메이크샵 API**: search_order (주문 조회), process_reserve (적립금), 상품 목록

---

### WF-06: Class Management (클래스 상태 변경)

**트리거**: Webhook (POST)
**URL**: `https://n8n.pressco21.com/webhook/class-manage`
**기존 GAS**: `handleUpdateClassStatus`

```
[Webhook POST]
  -> [Code: member_id, class_id, new_status 파싱]
  -> [Airtable: "파트너 상세" 인증 by member_id]
  -> [Airtable: "클래스 메타" 조회 by class_id]
  -> [IF: 해당 파트너 소유 클래스인가?]
    -> No: [Respond: 권한 없음 에러]
    -> Yes:
      -> [Airtable: "클래스 메타" Update status]
      -> [Telegram: "클래스 상태 변경: {클래스명} -> {new_status}"]
      -> [Respond to Webhook: 성공]
```

---

### WF-07: Partner Apply (파트너 신청)

**트리거**: Webhook (POST)
**URL**: `https://n8n.pressco21.com/webhook/partner-apply`
**기존 GAS**: `handlePartnerApply`

```
[Webhook POST]
  -> [Code: 입력값 검증 + URL sanitize + 길이 제한]
  -> [Airtable: "파트너 상세" 조회 by member_id (이미 파트너?)]
  -> [IF: 이미 파트너?]
    -> Yes: [Respond: "이미 파트너 등록" 응답]
    -> No:
      -> [Airtable: "파트너 신청" 조회 by member_id (중복 신청?)]
      -> [IF: PENDING 상태 신청 존재?]
        -> Yes: [Respond: "이미 심사 중" 응답]
        -> No:
          -> [Code: application_id 생성 (APP_YYYYMMDD_XXXXXX)]
          -> [Airtable: "파트너 신청" Create Record]
          -> [Send Email: 신청자에게 접수 확인 이메일]
          -> [Telegram: "새 파트너 신청: {이름} ({공방명})"]
          -> [Respond to Webhook: 성공]
```

**텔레그램 알림**: 새 파트너 신청 시 관리자에게 즉시 알림
- 기존 GAS: `sendAdminAlert_` (이메일만)
- n8n: 텔레그램 + 이메일 동시 발송

---

### WF-08: Partner Approve (파트너 승인, 관리자 전용)

**트리거**: Webhook (POST)
**URL**: `https://n8n.pressco21.com/webhook/partner-approve`
**기존 GAS**: `handlePartnerApprove`

```
[Webhook POST]
  -> [Code: 관리자 토큰 검증 (ADMIN_API_TOKEN)]
  -> [IF: 토큰 유효?]
    -> No: [Respond: 권한 없음]
    -> Yes:
      -> [Airtable: "파트너 신청" 조회 by application_id or member_id]
      -> [IF: PENDING 상태?]
        -> No: [Respond: "이미 처리된 신청"]
        -> Yes:
          -> [Code: partner_code 생성 (PC_YYYYMM_NNN)]
          -> [Airtable: "파트너 신청" Update status=APPROVED]
          -> [Airtable: "파트너 상세" Create Record (SILVER 등급)]
          -> [HTTP Request: 메이크샵 회원등급 변경 API (기존 FA-002 패턴)]
          -> [Send Email: 승인 안내 이메일]
          -> [Telegram: "파트너 승인 완료: {이름} -> {partner_code}"]
          -> [Respond to Webhook: 성공]
```

**메이크샵 API**: 회원등급 변경 (기존 FA-002 워크플로우 패턴 재활용)
**텔레그램 알림**: 승인 완료 시 알림

---

### WF-09: Review Reply (후기 답변)

**트리거**: Webhook (POST)
**URL**: `https://n8n.pressco21.com/webhook/review-reply`
**기존 GAS**: `handleReplyToReview`

```
[Webhook POST]
  -> [Code: member_id, review_id, answer 파싱 + sanitizeText]
  -> [Airtable: "파트너 상세" 인증 by member_id]
  -> [Airtable: "후기" 조회 by review_id]
  -> [IF: 후기 존재?]
    -> No: [Respond: REVIEW_NOT_FOUND]
    -> Yes:
      -> [Code: 소유권 검증 (partner_code 비교 또는 class_id 역추적)]
      -> [IF: 본인 클래스 후기?]
        -> No: [Respond: REVIEW_NOT_OWNED]
        -> Yes:
          -> [Airtable: "후기" Update (partner_answer, answer_at)]
          -> [Respond to Webhook: 성공]
```

---

### WF-10: Education Complete (교육 이수 완료)

**트리거**: Webhook (POST)
**URL**: `https://n8n.pressco21.com/webhook/education-complete`
**기존 GAS**: `handleEducationComplete`

```
[Webhook POST]
  -> [Code: member_id, score, total_questions, pass_threshold 파싱]
  -> [Airtable: "파트너 상세" 인증 by member_id]
  -> [Code: 합격 여부 판정 (score >= pass_threshold)]
  -> [IF: 합격?]
    -> Yes:
      -> [Airtable: "파트너 상세" Update (education_completed=true, education_date, education_score)]
      -> [Send Email: 합격 인증서 이메일]
      -> [Telegram: "교육 이수 완료: {파트너명} ({score}/{total})"]
    -> No:
      -> [Send Email: 불합격 재응시 안내 이메일 (격려 톤)]
  -> [Respond to Webhook]
```

---

### WF-11: Send Reminders (D-3/D-1 리마인더)

**트리거**: Schedule (매일 09:00 KST)
**기존 GAS**: `triggerSendReminders`

```
[Schedule: 매일 09:00]
  -> [Code: D-3 날짜(오늘+3일), D-1 날짜(오늘+1일) 계산]
  -> [Airtable: "정산 내역" 조회]
    // filterByFormula: AND(
    //   OR({status}='COMPLETED', {status}='PENDING'),
    //   OR(
    //     AND({class_date}=D3_DATE, FIND('D3_SENT', {student_email_sent})=0),
    //     AND({class_date}=D1_DATE, FIND('D1_SENT', {student_email_sent})=0)
    //   )
    // )
  -> [IF: 발송 대상 존재?]
    -> No: [Stop]
    -> Yes:
      -> [SplitInBatches: 건별 처리]
        -> [Airtable: "클래스 메타" 조회 by class_id]
        -> [Airtable: "파트너 상세" 조회 by partner_code]
        -> [Code: D-3 또는 D-1 판별]
        -> [Send Email: 수강생 리마인더]
        -> [Send Email: 파트너 리마인더]
        -> [Airtable: "정산 내역" Update student_email_sent]
      -> [Telegram: "리마인더 발송 완료: D-3 {N}건, D-1 {N}건"]
```

---

### WF-12: Review Requests (후기 요청)

**트리거**: Schedule (매일 10:00 KST)
**기존 GAS**: `triggerSendReviewRequests`

```
[Schedule: 매일 10:00]
  -> [Code: 7일 전 날짜 계산]
  -> [Airtable: "정산 내역" 조회]
    // filterByFormula: AND(
    //   {status}='COMPLETED',
    //   {class_date}=D7_AGO_DATE,
    //   FIND('REVIEW_SENT', {student_email_sent})=0
    // )
  -> [IF: 대상 존재?]
    -> No: [Stop]
    -> Yes:
      -> [SplitInBatches]
        -> [Airtable: "클래스 메타" 조회]
        -> [Send Email: 수강생에게 후기 요청 (적립금 인센티브 안내)]
        -> [Send Email: 파트너에게 후기 알림]
        -> [Airtable: "정산 내역" Update student_email_sent += 'REVIEW_SENT']
      -> [Telegram: "후기 요청 발송: {N}건"]
```

---

### WF-13: Grade Update (등급 자동 업데이트)

**트리거**: Schedule (매일 06:00 KST)
**기존 GAS**: `triggerUpdatePartnerGrades`

```
[Schedule: 매일 06:00]
  -> [Airtable: "파트너 상세" 전체 조회 (status=active)]
  -> [SplitInBatches: 파트너별]
    -> [Airtable: "정산 내역" 조회 by partner_code, status=COMPLETED]
    -> [Code: 완료 건수, 평균 평점 계산]
      // GOLD 조건: 10건 이상 + 평점 4.0 이상
      // PLATINUM 조건: 50건 이상 + 평점 4.5 이상
      // 강등 없음 (gradeOrder 비교)
    -> [IF: 등급 변경 필요?]
      -> Yes:
        -> [Airtable: "파트너 상세" Update grade, commission_rate, reserve_rate]
        -> [Send Email: 등급 승급 축하 이메일]
        -> [Telegram: "등급 변경: {파트너명} {OLD} -> {NEW}"]
      -> No: [Skip]
  -> [Telegram: "등급 업데이트 완료: 변경 {N}건"]
```

---

## 3. Airtable 테이블 구조 설계 (8개)

### 기존 Base 활용 방안

현재 `app6MBsHo7AKwh5XD`에 FA 강사 신청 테이블이 이미 존재합니다.
같은 Base 내에 파트너 클래스 플랫폼용 테이블 8개를 추가합니다.

> Airtable 무료 플랜: Base당 1,200레코드, 유료(Team): 50,000레코드/테이블
> 권장: Team 플랜 ($20/월/시트) 또는 별도 Base 생성

---

### 3.1 파트너 상세 (tbl_Partners)

| 필드명 | Airtable 타입 | 기존 Sheets | 비고 |
|--------|-------------|------------|------|
| partner_code | Single line text (PK) | A | PC_YYYYMM_NNN 형식 |
| member_id | Single line text (Unique) | B | 메이크샵 회원 ID |
| partner_name | Single line text | C | 공방명 |
| grade | Single select | D | SILVER / GOLD / PLATINUM |
| email | Email | E | |
| phone | Phone number | F | |
| location | Single line text | G | 지역 |
| commission_rate | Percent | H | 10% / 12% / 15% |
| reserve_rate | Percent | I | 100% / 80% / 60% |
| class_count | Number (integer) | J | |
| avg_rating | Number (decimal, 1dp) | K | |
| education_completed | Checkbox | L | |
| education_date | Date | - | GAS에서 동적 추가했던 컬럼 |
| education_score | Number (integer) | - | GAS에서 동적 추가했던 컬럼 |
| portfolio_url | URL | M | |
| instagram_url | URL | N | |
| partner_map_id | Single line text | O | 파트너맵 연동 ID |
| approved_date | Date | P | |
| status | Single select | Q | active / inactive / suspended |
| notes | Long text | R | |
| created_at | Created time | - | Airtable 자동 생성 |
| updated_at | Last modified time | - | Airtable 자동 생성 |

**뷰 설계**:
- **활성 파트너**: status = active, 기본 정렬: partner_code
- **등급별 보기**: grade 그룹핑
- **교육 미이수**: education_completed = false (교육 필요 파트너 필터)
- **등급 후보**: class_count >= 10 AND grade = SILVER (GOLD 승급 후보)

**Sheets 대비 차이점**:
- `grade`: Sheets의 문자열 -> Airtable Single Select (드롭다운 선택)
- `education_completed`: Sheets "true"/"false" 문자열 -> Airtable Checkbox
- `created_at`, `updated_at`: Airtable 자동 관리 (Sheets에서는 수동)
- `education_date`, `education_score`: GAS에서 동적으로 추가했던 컬럼 -> Airtable에서 처음부터 정의

---

### 3.2 클래스 메타 (tbl_Classes)

| 필드명 | Airtable 타입 | 기존 Sheets | 비고 |
|--------|-------------|------------|------|
| class_id | Single line text (PK) | A | CLS_XXXXXX 형식 |
| makeshop_product_id | Single line text | B | 메이크샵 상품 branduid |
| partner_code | Link to tbl_Partners | C | Airtable 링크 필드 |
| class_name | Single line text | D | |
| category | Single select | E | 압화, 레진, 캔들, 석고, 비즈, 기타 |
| level | Single select | F | beginner / intermediate / advanced |
| price | Currency (KRW) | G | |
| duration_min | Number (integer) | H | 수업 시간(분) |
| max_students | Number (integer) | I | 최대 정원 |
| description | Long text (Rich text) | J | HTML 대신 Rich Text 활용 가능 |
| curriculum_json | Long text | K | JSON 문자열 유지 |
| schedules_json | Long text | - | JSON 문자열 (날짜/시간 목록) |
| instructor_bio | Long text | L | |
| thumbnail_url | URL | M | |
| image_urls | Long text | N | 콤마 구분 URL 목록 |
| youtube_video_id | Single line text | O | |
| location | Single line text | P | |
| materials_included | Single line text | Q | |
| materials_price | Currency (KRW) | - | 재료비 별도 금액 |
| materials_product_ids | Single line text | R | 콤마 구분 branduid |
| tags | Multiple select | S | Airtable 다중 선택 활용 |
| type | Single select | - | 원데이 / 정기 / 온라인 |
| status | Single select | T | active / paused / closed / INACTIVE |
| created_date | Date | U | |
| class_count | Number (integer) | V | 수강 건수 |
| avg_rating | Number (decimal) | W | 평균 평점 |

**뷰 설계**:
- **공개 클래스**: status = active, 기본 정렬: created_date DESC
- **카테고리별**: category 그룹핑
- **파트너별 내 강의**: partner_code 필터 (파트너 대시보드용)
- **비활성/종료**: status != active (관리 목적)

**Sheets 대비 차이점**:
- `partner_code`: Sheets 문자열 -> Airtable Linked Record (관계형 DB처럼 참조)
- `category`, `level`, `status`: Single Select (입력 오류 방지)
- `tags`: Sheets 콤마 구분 문자열 -> Airtable Multiple Select
- `type`: Sheets에 없었으나 프론트엔드에서 필터링에 사용하던 값을 정식 필드로 승격
- `materials_price`: GAS에서 후반에 추가한 필드를 정식 포함

---

### 3.3 정산 내역 (tbl_Settlements)

| 필드명 | Airtable 타입 | 기존 Sheets | 비고 |
|--------|-------------|------------|------|
| settlement_id | Single line text (PK) | A | STL_YYYYMMDD_XXXXXX |
| order_id | Single line text | B | 메이크샵 주문번호 |
| partner_code | Link to tbl_Partners | C | |
| class_id | Link to tbl_Classes | D | |
| member_id | Single line text | E | 수강생 회원 ID |
| order_amount | Currency (KRW) | F | |
| commission_rate | Percent | G | |
| commission_amount | Currency (KRW) | H | |
| reserve_rate | Percent | I | |
| reserve_amount | Currency (KRW) | J | |
| class_date | Date | K | 수업 일시 |
| student_count | Number (integer) | L | 인원 |
| status | Single select | M | PENDING / PROCESSING / COMPLETED / FAILED |
| reserve_paid_date | Date | N | |
| reserve_api_response | Long text | O | |
| error_message | Long text | P | |
| student_email_sent | Single line text | Q | D3_SENT, D1_SENT, REVIEW_SENT 등 |
| partner_email_sent | Single line text | R | |
| created_date | Created time | S | |
| completed_date | Date | T | |
| student_name | Single line text | U | |
| student_email | Email | V | |
| student_phone | Phone number | W | |
| retry_count | Number (integer) | - | 기존: error_message에 "retry:N|" 패턴 -> 정식 필드 승격 |

**뷰 설계**:
- **대기 중 정산**: status = PENDING (즉시 처리 필요)
- **실패 정산**: status = FAILED (재시도 필요, retry_count 오름차순)
- **최대 재시도 초과**: status = FAILED AND retry_count >= 5 (수동 처리 필요)
- **월별 완료**: status = COMPLETED, class_date 월별 그룹핑
- **파트너별 정산**: partner_code 그룹핑, 수수료 합산 Summary
- **리마인더 미발송**: student_email_sent에 D3_SENT 또는 D1_SENT 미포함

**Sheets 대비 차이점**:
- `retry_count`: GAS에서는 error_message 필드에 "retry:N|에러메시지" 형식으로 임시 기록 -> Airtable에서 정식 Number 필드로 분리 (가독성/필터링 향상)
- `partner_code`, `class_id`: Linked Record로 참조 무결성 보장
- `status`: Single Select로 입력 오류 방지
- Airtable의 Summary 기능으로 파트너별 매출/수수료 자동 집계 가능

---

### 3.4 파트너 신청 (tbl_Applications)

| 필드명 | Airtable 타입 | 기존 Sheets | 비고 |
|--------|-------------|------------|------|
| application_id | Single line text (PK) | A | APP_YYYYMMDD_XXXXXX |
| member_id | Single line text | B | |
| applicant_name | Single line text | C | |
| workshop_name | Single line text | D | |
| email | Email | E | |
| phone | Phone number | F | |
| location | Single line text | G | |
| specialty | Single select | H | 압화, 레진, 캔들, 석고, 비즈, 기타 |
| portfolio_url | URL | I | |
| instagram_url | URL | J | |
| introduction | Long text | K | |
| status | Single select | L | PENDING / APPROVED / REJECTED |
| applied_date | Created time | M | |
| reviewed_date | Date | N | |
| reviewer_note | Long text | O | |

**뷰 설계**:
- **심사 대기**: status = PENDING (가장 먼저 보이게)
- **승인 완료**: status = APPROVED
- **반려**: status = REJECTED
- **갤러리 뷰**: portfolio_url 이미지 미리보기 (Airtable 갤러리 뷰 활용)

**Sheets 대비 차이점**:
- `specialty`: Sheets 자유 텍스트 -> Airtable Single Select (통일된 분류)
- `portfolio_url`, `instagram_url`: URL 타입 (클릭 시 바로 이동)
- 갤러리 뷰: Sheets에 없는 시각적 심사 인터페이스

---

### 3.5 후기 (tbl_Reviews)

| 필드명 | Airtable 타입 | 기존 Sheets | 비고 |
|--------|-------------|------------|------|
| review_id | Single line text (PK) | A | REV_XXXXXX |
| class_id | Link to tbl_Classes | B | |
| member_id | Single line text | C | 수강생 회원 ID |
| reviewer_name | Single line text | D | |
| rating | Rating (5-star) | E | Airtable 별점 필드 활용 |
| content | Long text | F | |
| image_urls | Long text | G | 콤마 구분 |
| created_at | Created time | H | |
| partner_code | Link to tbl_Partners | I | |
| partner_answer | Long text | J | |
| answer_at | Date | K | |

**뷰 설계**:
- **최근 후기**: created_at DESC
- **미답변 후기**: partner_answer = BLANK() (파트너 답변 독촉용)
- **별점별 보기**: rating 그룹핑
- **사진 후기**: image_urls != BLANK()

**Sheets 대비 차이점**:
- `rating`: Sheets Number -> Airtable Rating 필드 (시각적 별점 표시)
- `class_id`, `partner_code`: Linked Record (조인/롤업 자동 가능)

---

### 3.6 주문 처리 로그 (tbl_PollLogs)

| 필드명 | Airtable 타입 | 기존 Sheets | 비고 |
|--------|-------------|------------|------|
| poll_time | Created time | A | |
| orders_found | Number | B | |
| orders_processed | Number | C | |
| errors | Long text | D | |
| duration_ms | Number | E | |
| source | Single line text | F | schedule / manual |

**뷰 설계**:
- **최근 폴링**: poll_time DESC (최근 10건)
- **에러 발생 건**: errors != BLANK()

---

### 3.7 이메일 발송 로그 (tbl_EmailLogs)

| 필드명 | Airtable 타입 | 기존 Sheets | 비고 |
|--------|-------------|------------|------|
| log_date | Date | A | |
| recipient | Email | B | |
| email_type | Single select | C | BOOKING_CONFIRM, PARTNER_NOTIFY, REMINDER_D3_STUDENT, ... |
| status | Single select | D | SENT / FAILED / LIMIT_EXCEEDED |
| error_message | Long text | E | |
| sent_at | Created time | F | |

**뷰 설계**:
- **오늘 발송**: log_date = TODAY() (일일 카운트 확인)
- **실패 건**: status = FAILED
- **유형별 통계**: email_type 그룹핑 + Count Summary

**Sheets 대비 차이점**:
- n8n으로 전환 시 Gmail 100건 한도가 사라지므로, 이메일 로그의 역할이 "한도 관리"에서 "발송 이력 추적"으로 변경됨
- `email_type`: Single Select로 이메일 유형 통계 자동 집계

---

### 3.8 시스템 설정 (tbl_Settings)

| 필드명 | Airtable 타입 | 기존 Sheets | 비고 |
|--------|-------------|------------|------|
| key | Single line text (PK) | A | |
| value | Long text | B | |
| updated_at | Last modified time | C | |

**초기 데이터**:
| key | value |
|-----|-------|
| last_poll_time | (자동 갱신) |
| class_category_id | (메이크샵 카테고리 번호) |
| admin_email | foreverloveflower@naver.com |

**Sheets 대비 차이점**:
- `updated_at`: Airtable 자동 관리
- 민감 설정(API 키 등)은 Airtable에 저장하지 않고 n8n Credentials에 저장

---

### 3.9 Airtable Linked Records 관계도

```
tbl_Partners (파트너 상세)
    |
    |-- 1:N --> tbl_Classes (클래스 메타)
    |               |
    |               |-- 1:N --> tbl_Reviews (후기)
    |               |
    |               |-- 1:N --> tbl_Settlements (정산 내역)
    |
    |-- 1:N --> tbl_Applications (파트너 신청)
    |
    |-- 1:N --> tbl_Settlements (정산 내역)
```

Airtable의 Linked Record + Rollup 기능을 활용하면:
- 파트너 상세에서 "총 정산 건수", "총 수수료", "평균 평점"을 Rollup 필드로 자동 계산
- 클래스에서 "후기 수", "평균 별점"을 Rollup 필드로 자동 계산
- Google Sheets에서 수동으로 계산하던 집계를 Airtable이 자동 관리

---

## 4. CORS 처리 방안

### 4.1 문제 상황

메이크샵 프론트엔드(foreverlove.co.kr)에서 n8n Webhook(n8n.pressco21.com)을 직접 호출하면 **동일 출처 정책(Same-Origin Policy)** 위반으로 브라우저가 요청을 차단합니다.

기존 GAS에서는:
- GAS 웹 앱이 자체적으로 CORS 헤더를 설정 (Google이 관리)
- 추가로 `text/plain` Content-Type trick으로 Simple Request 유지 (preflight 회피)

### 4.2 해결 방안: n8n 환경변수 CORS 설정

n8n은 자체 CORS 설정을 환경변수로 지원합니다.

**Oracle Cloud의 n8n docker-compose.yml 또는 환경변수에 추가:**

```yaml
# docker-compose.yml
environment:
  - N8N_CORS_ALLOWED_ORIGINS=https://foreverlove.co.kr,https://www.foreverlove.co.kr
  - N8N_CORS_ALLOW_METHODS=GET,POST,OPTIONS
  - N8N_CORS_ALLOW_HEADERS=Content-Type,Authorization
```

또는 n8n을 직접 실행하는 경우:

```bash
export N8N_CORS_ALLOWED_ORIGINS="https://foreverlove.co.kr,https://www.foreverlove.co.kr"
export N8N_CORS_ALLOW_METHODS="GET,POST,OPTIONS"
export N8N_CORS_ALLOW_HEADERS="Content-Type,Authorization"
```

이렇게 설정하면:
- `OPTIONS` preflight 요청에 `Access-Control-Allow-Origin: https://foreverlove.co.kr` 헤더 반환
- `POST` 요청에서 `application/json` Content-Type 사용 가능
- 기존 GAS의 `text/plain` trick 불필요 (JSON으로 통일)

### 4.3 대안: Nginx 리버스 프록시 CORS 헤더 추가

n8n 앞에 Nginx가 있다면 (이미 n8n.pressco21.com 도메인 사용 중이므로 가능성 높음):

```nginx
# /etc/nginx/sites-available/n8n
server {
    listen 443 ssl;
    server_name n8n.pressco21.com;

    location /webhook/ {
        # CORS 헤더 추가
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://foreverlove.co.kr';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization';
            add_header 'Access-Control-Max-Age' 3600;
            return 204;
        }

        add_header 'Access-Control-Allow-Origin' 'https://foreverlove.co.kr' always;

        proxy_pass http://localhost:5678;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 4.4 프론트엔드 변경 (기존 GAS text/plain 제거)

기존 프론트엔드 JS의 POST 요청 패턴:

```javascript
// 기존 GAS 호출 (text/plain trick)
fetch(GAS_URL + '?action=recordBooking', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(data)
});
```

n8n 전환 후:

```javascript
// n8n Webhook 호출 (표준 JSON)
fetch(N8N_URL + '/webhook/record-booking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});
```

**변경 포인트**:
- `Content-Type`: `text/plain` -> `application/json`
- URL 구조: `?action=xxx` 쿼리 파라미터 -> `/webhook/xxx` 경로 기반 (워크플로우별 Webhook)
- 또는 기존 `?action=xxx` 패턴 유지하고 단일 Webhook에서 Switch 분기 (프론트 변경 최소화)

### 4.5 권장: 단일 Webhook + action 분기 (프론트 변경 최소화)

프론트엔드 변경을 최소화하려면 GAS와 동일한 패턴을 유지합니다:

```
GET  https://n8n.pressco21.com/webhook/api?action=getClasses&category=압화
POST https://n8n.pressco21.com/webhook/api?action=recordBooking
```

이 경우 WF-01 ~ WF-10을 하나의 Webhook으로 통합하고 Switch 노드로 분기합니다.
프론트엔드에서는 `GAS_URL` 변수값만 n8n URL로 교체하면 됩니다.

**하지만 권장하지 않습니다.** 이유:
- 하나의 워크플로우가 너무 복잡해져 n8n GUI 관리가 어려움
- 에러 추적 시 어떤 action에서 실패했는지 파악 어려움
- 워크플로우별 독립 실행/비활성화 불가

**권장 방식: 프론트엔드에 action-to-URL 매핑 객체를 두고, Webhook URL만 변경**

```javascript
// 프론트엔드 js.js 상단
var API_ENDPOINTS = {
    getClasses:     N8N_URL + '/webhook/class-api',
    getClassDetail: N8N_URL + '/webhook/class-api',
    getCategories:  N8N_URL + '/webhook/class-api',
    getPartnerAuth: N8N_URL + '/webhook/partner-auth',
    recordBooking:  N8N_URL + '/webhook/record-booking',
    // ...
};
```

---

## 5. 파트너 인증 플로우 설계

### 5.1 기존 GAS 인증 플로우

```
[메이크샵 HTML]
  <!--/if_login/-->
    <span id="memberId" style="display:none"><!--/user_id/--></span>
  <!--/end_if/-->
      |
      v
[프론트엔드 JS]
  var memberId = document.getElementById('memberId').textContent.trim();
  if (!memberId) { /* 비로그인 -> 로그인 안내 */ }
      |
      v
[GAS API 호출]
  GET GAS_URL?action=getPartnerAuth&member_id={memberId}
      |
      v
[GAS handleGetPartnerAuth]
  -> Sheets "파트너 상세" 조회 by member_id
  -> 있으면: { success, data: { partner_code, grade, ... } }
  -> 없으면: { success, data: { status: 'not_partner' } }
      |
      v
[프론트엔드]
  -> 파트너 대시보드 렌더링 또는 비파트너 안내
```

### 5.2 신규 n8n 인증 플로우

**변경 사항: 거의 없음.** 가상태그 기반 1단계, JS 읽기 2단계는 동일. 3단계만 GAS -> n8n Webhook으로 변경.

```
[메이크샵 HTML] (변경 없음)
  <!--/if_login/-->
    <span id="memberId" style="display:none"><!--/user_id/--></span>
  <!--/end_if/-->
      |
      v
[프론트엔드 JS] (URL만 변경)
  var memberId = document.getElementById('memberId').textContent.trim();
  if (!memberId) { /* 비로그인 -> 로그인 안내 */ }
      |
      v
[n8n Webhook 호출] (변경)
  GET https://n8n.pressco21.com/webhook/partner-auth?action=getPartnerAuth&member_id={memberId}
      |
      v
[n8n WF-02: Partner Auth API]
  -> Airtable "파트너 상세" 조회 by member_id
  -> 있으면: 파트너 데이터 반환 (기존 GAS 응답 형식 유지)
  -> 없으면:
    -> Airtable "파트너 신청" 조회 by member_id
    -> 상태에 따라 pending/not_partner 반환
      |
      v
[프론트엔드] (변경 없음)
  -> 기존과 동일한 응답 구조이므로 JS 로직 변경 불필요
```

### 5.3 응답 형식 호환성

기존 GAS 응답 형식을 그대로 유지해야 프론트엔드 수정이 최소화됩니다.

**기존 GAS 응답:**
```json
{
  "success": true,
  "data": {
    "partner_code": "PC_202603_001",
    "partner_name": "플로라 공방",
    "grade": "SILVER",
    "email": "flora@example.com",
    "status": "active",
    "class_count": 5,
    "avg_rating": 4.2,
    "education_completed": true
  },
  "timestamp": "2026-02-25T10:30:00+09:00"
}
```

**n8n 응답 (동일 형식 유지):**
n8n의 "Respond to Webhook" 노드에서 위와 동일한 JSON 구조를 반환합니다.
Airtable 필드명이 GAS와 동일하므로 변환 로직은 최소화됩니다.

### 5.4 보안 강화 포인트

| 항목 | 기존 GAS | n8n 전환 후 |
|------|---------|-----------|
| 출처 검증 | Referer 파라미터 (쉽게 위조 가능) | CORS Origin 헤더 (브라우저 레벨 보호) |
| 관리자 인증 | ADMIN_API_TOKEN 파라미터 | n8n Credentials + Basic Auth 헤더 |
| API 키 저장 | GAS PropertiesService | n8n Credentials (암호화 저장) |
| 개인정보 마스킹 | GAS 함수 (maskPhone_, maskName_) | n8n Code 노드 (동일 로직 이식) |
| Rate Limiting | 없음 | Nginx rate_limit 추가 가능 |

**추가 권장: Webhook 경로에 랜덤 suffix 추가**
```
/webhook/partner-auth-a8f3b2  (추측 불가)
/webhook/record-booking-x7k9m1
```
n8n Webhook 노드에서 "Path"를 위와 같이 설정하면 URL을 모르면 호출 불가합니다.

---

## 6. 이메일 전략

### 6.1 기존 GAS 이메일 한계

| 항목 | GAS 현재 |
|------|---------|
| 발송 수단 | GmailApp.sendEmail() |
| 일일 한도 | 100명 (개인 Gmail) / 1,500명 (Workspace) |
| 경고 임계 | 70건 도달 시 관리자 알림 |
| 비용 | Gmail 무료 / Workspace 월 ~8,000원 |
| HTML 이메일 | 지원 (htmlBody 옵션) |
| 추적 | 자체 Sheets 로깅 (SENT/FAILED) |

### 6.2 n8n 이메일 옵션 비교

| 옵션 | 일일 한도 | 월 비용 | 설정 난이도 | 권장 |
|------|---------|--------|-----------|------|
| **A. Oracle Cloud SMTP (자체)** | 무제한 | 0원 | 중 | **권장 (비용 0원)** |
| B. Gmail SMTP (n8n) | 500건 | 0원 | 하 | 초기 테스트용 |
| C. SendGrid 무료 | 100건/일 | 0원 | 하 | GAS와 동일 한도 |
| D. Amazon SES | 62,000건/일 | ~$0.10/1,000건 | 중 | 대규모 확장 시 |
| E. Mailgun 무료 | 100건/일 | 0원 | 하 | GAS와 동일 한도 |
| F. Brevo(Sendinblue) 무료 | 300건/일 | 0원 | 하 | 중간 규모 |

### 6.3 권장 방안: A. Oracle Cloud 자체 SMTP

현재 n8n이 Oracle Cloud ARM 인스턴스에서 운영 중이므로, 같은 서버에서 SMTP 서버를 운영하면 추가 비용 없이 이메일 한도 제한이 없습니다.

**방법 1: Postfix 설치 (가장 단순)**

```bash
# Oracle Cloud ARM 인스턴스에 Postfix 설치
sudo apt-get install postfix

# /etc/postfix/main.cf 기본 설정
myhostname = mail.pressco21.com
mydomain = pressco21.com
myorigin = $mydomain
mydestination = $myhostname, localhost
inet_interfaces = localhost  # 외부 수신 불필요 (발송 전용)
```

DNS 레코드 추가 (pressco21.com 도메인):
```
# SPF 레코드 (메일 발송 서버 인증)
TXT  @  "v=spf1 ip4:{Oracle_Cloud_IP} include:_spf.google.com ~all"

# DKIM (선택, 스팸 필터 통과율 향상)
# Postfix + opendkim 설치 후 생성

# DMARC (선택)
TXT  _dmarc  "v=DMARC1; p=none; rua=mailto:admin@pressco21.com"
```

n8n SMTP 설정:
```
Host: localhost (또는 127.0.0.1)
Port: 25
User: (없음, 로컬 발송)
Password: (없음)
From: class@pressco21.com (또는 noreply@pressco21.com)
```

**방법 2: Gmail SMTP (앱 비밀번호)**

Google 계정 설정에서 "앱 비밀번호" 생성 후:

```
Host: smtp.gmail.com
Port: 587
User: foreverloveflower@gmail.com
Password: (앱 비밀번호)
SSL/TLS: STARTTLS
```

한도: 일 500건 (개인 Gmail) -- GAS보다 5배 증가

**방법 3: Brevo(구 Sendinblue) 무료 플랜**

- 일 300건 무료 (GAS 100건의 3배)
- 가입 후 SMTP 키 발급
- n8n에 Brevo SMTP Credentials 설정
- HTML 이메일 + 발송 추적 + 수신 확인 기능 포함

### 6.4 권장 구성 (단계별)

```
[1단계 - 즉시 적용]
Gmail SMTP (앱 비밀번호) -> 일 500건
비용: 0원, 설정: 5분

[2단계 - 일 70건+ 도달 시]
Brevo 무료 -> 일 300건 (Gmail과 병행하면 사실상 800건)
비용: 0원, 설정: 30분

[3단계 - 사업 확장 시]
자체 Postfix 또는 Amazon SES
비용: 0원 또는 월 $1 미만
```

### 6.5 n8n 이메일 발송 노드 설정

n8n에서는 "Send Email" 노드를 사용합니다:

```
노드: Send Email
Credentials: SMTP (Gmail 또는 자체 SMTP)
From: PRESSCO21 클래스 <class@pressco21.com>
To: {{ $json.student_email }}
Subject: [PRESSCO21] {{ $json.class_name }} 예약이 확인되었습니다
HTML Body: (기존 GAS 이메일 HTML 템플릿 그대로 사용)
```

기존 GAS의 `sendStudentConfirmationEmail_`, `sendPartnerNotificationEmail_` 등의 HTML 본문을 n8n 이메일 노드의 HTML Body에 복사하면 됩니다.

### 6.6 이메일 HTML 템플릿 관리

n8n에서 이메일 HTML 템플릿을 관리하는 방법:

**방법 A: Code 노드에서 직접 생성 (기존 GAS 방식과 동일)**
```javascript
// n8n Code 노드
const className = items[0].json.class_name;
const studentName = items[0].json.student_name || '고객';

const html = `<div style="font-family: 'Noto Sans KR', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #2d2d2d; border-bottom: 2px solid #b89b5e; padding-bottom: 12px;">예약 확인</h2>
  <p style="color: #555;">${studentName}님, 클래스 예약이 확인되었습니다.</p>
  ...
</div>`;

return [{ json: { ...items[0].json, emailHtml: html } }];
```

**방법 B: Airtable "이메일 템플릿" 테이블에서 관리 (추후)**
- 관리자가 Airtable에서 이메일 문구를 직접 수정 가능
- n8n에서 템플릿 조회 -> 변수 치환 -> 발송

---

## 7. GAS 대비 n8n의 구조적 장점

### 7.1 실행 로그 및 에러 모니터링

| 항목 | GAS | n8n |
|------|-----|-----|
| 실행 이력 | Logger.log (수동 확인) | **GUI 대시보드에서 모든 실행 이력 조회** |
| 에러 추적 | Sheets "error_log" 시트 수동 기록 | **실행별 입/출력 데이터 자동 보존** |
| 실패 위치 | 로그에서 추정 | **어떤 노드에서 실패했는지 시각적 표시** |
| 실시간 알림 | 이메일 알림만 (MailApp) | **텔레그램 봇 즉시 알림 + 이메일** |
| 디버깅 | GAS 편집기에서 함수 단위 실행 | **워크플로우 수동 실행 + 노드별 결과 확인** |
| 보존 기간 | Sheets에 수동 기록한 것만 | **n8n PostgreSQL에 실행 이력 자동 보존** |

**구체적 이점**:
- GAS에서는 `logError_` 함수를 직접 구현하고 Sheets에 기록했지만, n8n은 모든 실행의 입력/출력/에러를 PostgreSQL에 자동 저장
- "Executions" 탭에서 실패한 실행을 클릭하면 어떤 데이터가 들어왔고, 어떤 노드에서 무슨 에러가 발생했는지 즉시 확인 가능

### 7.2 재시도 메커니즘

| 항목 | GAS | n8n |
|------|-----|-----|
| 자동 재시도 | 없음 (수동 `retryFailedSettlements` 실행) | **노드별 자동 재시도 설정** |
| 재시도 설정 | 코드에 하드코딩 (MAX_RETRY_COUNT=5) | **GUI에서 재시도 횟수/간격 설정** |
| 지수 백오프 | 직접 구현 (`Utilities.sleep(Math.pow(2,i)*1000)`) | **n8n 내장 (Wait Between Tries)** |
| 에러 워크플로우 | 없음 | **Error Trigger로 별도 에러 처리 워크플로우 연결** |

**n8n 노드별 재시도 설정 예시**:
```
노드: HTTP Request (메이크샵 적립금 API)
Settings:
  On Error: Retry
  Max Tries: 3
  Wait Between Tries: 2000ms (2초)
  Backoff: Exponential
```

**Error Trigger 워크플로우**:
별도의 "Error Handler" 워크플로우를 만들어 모든 워크플로우의 에러를 중앙 수집할 수 있습니다:

```
[Error Trigger] -> [Code: 에러 정보 정리]
  -> [Telegram: "에러 발생! WF: {workflow_name}, 노드: {node_name}, 에러: {message}"]
  -> [Airtable: "에러 로그" 테이블에 기록]
```

### 7.3 텔레그램 통합 이점

현재 `@Pressco21_makeshop_bot`이 이미 운영 중이므로 추가 설정 없이 활용 가능합니다.

**GAS에서 관리자 알림 방식**:
```javascript
// 기존: 이메일만
sendAdminAlert_('[PRESSCO21] 적립금 지급 실패', '정산 ID: STL_...');
// 관리자가 Gmail을 열어야 확인 가능, 실시간성 떨어짐
```

**n8n 텔레그램 알림**:
```
[Telegram Bot Node]
Chat ID: {관리자 텔레그램 채팅 ID}
Message: "적립금 지급 실패
  정산 ID: STL_20260225_001234
  파트너: 플로라 공방
  금액: 15,000원
  에러: HTTP 500

  /retry STL_20260225_001234"
```

이점:
- 실시간 푸시 알림 (스마트폰에서 즉시 확인)
- 이메일보다 인지 속도 10배 이상 빠름
- 텔레그램 봇 커맨드로 간단한 조작 가능 (향후 확장)
- 채팅방에 팀원 초대 -> 알림 공유 가능

**텔레그램 알림 발송 시점 정리**:

| 이벤트 | 알림 내용 |
|--------|---------|
| 새 주문 감지 | "새 예약: {클래스명} - {수강생} {인원}명 ({금액}원)" |
| 적립금 지급 성공 | "적립금 지급 완료: {파트너} +{금액}원" |
| 적립금 지급 실패 | "적립금 지급 실패: {정산ID}, {에러 상세}" |
| 폴링 결과 | "주문 폴링: {처리건수}건 처리, {에러건수}건 실패" |
| 정합성 불일치 | "정합성 검증: {불일치건수}건 이상 감지" |
| 파트너 신청 | "새 파트너 신청: {이름} ({공방명})" |
| 파트너 승인 | "파트너 승인 완료: {이름} -> {코드}" |
| 등급 변경 | "등급 변경: {파트너} SILVER -> GOLD" |
| 워크플로우 에러 | "에러 발생: {워크플로우명} - {노드} - {에러}" |

### 7.4 기타 운영 이점

| 항목 | GAS | n8n |
|------|-----|-----|
| 실행 시간 제한 | 6분/회, 일 90분 | **무제한** (자체 호스팅) |
| URL Fetch 제한 | 일 20,000회 | **무제한** |
| 동시 실행 | 30개 | **서버 리소스 한도까지** |
| 배포 | GAS 편집기 -> 새 버전 배포 (수동) | **워크플로우 저장 즉시 반영** |
| 버전 관리 | GAS 버전 히스토리 (제한적) | **n8n 워크플로우 JSON export/import + Git** |
| 외부 서비스 연동 | UrlFetchApp만 | **400+ 내장 노드 (Airtable, Telegram, Slack, ...)** |
| 스케줄 정밀도 | "매 10분" 정도만 가능 | **cron 문법 (분 단위 정밀 제어)** |
| 비용 | 무료 (Google 계정) | **무료** (자체 호스팅, Oracle Cloud 무료 ARM) |

---

## 8. 프론트엔드 변경 사항

### 8.1 변경 파일 목록

| 파일 | 변경 내용 | 변경 규모 |
|------|---------|---------|
| `파트너클래스/목록/js.js` L13 | `GAS_URL` -> n8n URL | 1줄 |
| `파트너클래스/상세/js.js` L14 | `GAS_URL` -> n8n URL | 1줄 |
| `파트너클래스/파트너/js.js` L14 | `GAS_URL` -> n8n URL (이미 `window.PRESSCO21_GAS_URL` 참조) | 0줄 (전역 변수만 변경) |
| 메이크샵 공통 JS | `window.PRESSCO21_GAS_URL` -> `window.PRESSCO21_N8N_URL` | 1줄 |

### 8.2 목록 js.js 변경

```javascript
// 변경 전 (L13)
var GAS_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

// 변경 후
var GAS_URL = 'https://n8n.pressco21.com/webhook/class-api';
```

나머지 코드(fetch 호출, 응답 파싱 등)는 변경 불필요합니다.
단, n8n Webhook의 응답 JSON 구조가 기존 GAS와 동일해야 합니다.

### 8.3 상세 js.js 변경

```javascript
// 변경 전 (L14)
var GAS_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

// 변경 후
var GAS_URL = 'https://n8n.pressco21.com/webhook/class-api';
```

### 8.4 파트너 js.js (변경 없음)

이미 `window.PRESSCO21_GAS_URL` 전역 변수를 참조하므로, 메이크샵 공통 JS에서 전역 변수값만 변경하면 됩니다.

```javascript
// 메이크샵 공통 JS 영역 (관리자 페이지에서 설정)
// 변경 전
window.PRESSCO21_GAS_URL = 'https://script.google.com/macros/s/XXXXXX/exec';

// 변경 후
window.PRESSCO21_GAS_URL = 'https://n8n.pressco21.com/webhook/partner-auth';
```

### 8.5 POST 요청 Content-Type 변경 (선택)

기존 GAS 방식의 `text/plain` Content-Type은 n8n에서도 파싱 가능하므로 변경하지 않아도 됩니다.
하지만 표준 `application/json`으로 변경하는 것이 바람직합니다.

파트너 js.js에서 POST 요청하는 부분:
```javascript
// 변경 전
fetch(GAS_URL + '?action=replyToReview', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload)
});

// 변경 후 (CORS 설정 완료 후)
fetch(N8N_URL + '?action=replyToReview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
});
```

CORS가 올바르게 설정되면 `application/json`을 사용해도 preflight가 정상 처리됩니다.

### 8.6 응답 형식 호환성 체크리스트

프론트엔드가 기대하는 GAS 응답 형식을 n8n이 동일하게 반환해야 합니다.

```
성공 응답: { "success": true, "data": {...}, "timestamp": "..." }
에러 응답: { "success": false, "error": { "code": "...", "message": "..." }, "timestamp": "..." }
```

n8n "Respond to Webhook" 노드에서 위 형식을 정확히 따라야 합니다.

---

## 9. 마이그레이션 순서 및 체크리스트

### 9.1 단계별 마이그레이션 계획

```
[Phase A] 인프라 준비 (1~2일)
  1. n8n CORS 환경변수 설정
  2. Airtable 테이블 8개 생성 + 필드 설정
  3. Airtable API Key -> n8n Credentials 등록
  4. 메이크샵 API Credentials -> n8n 등록 (SHOPKEY, LICENSEKEY)
  5. SMTP Credentials 설정 (Gmail 앱 비밀번호)
  6. 텔레그램 봇 Credentials 확인

[Phase B] 읽기 전용 워크플로우 (2~3일)
  7. WF-01: Class API 구현 + 테스트
  8. WF-02: Partner Auth API 구현 + 테스트
  9. WF-03: Partner Data API 구현 + 테스트
  10. 프론트엔드 GET 요청 URL 변경 + 테스트

[Phase C] 쓰기 워크플로우 (3~4일)
  11. WF-04: Record Booking 구현 + 테스트
  12. WF-06: Class Management 구현 + 테스트
  13. WF-07: Partner Apply 구현 + 테스트
  14. WF-08: Partner Approve 구현 + 테스트
  15. WF-09: Review Reply 구현 + 테스트
  16. WF-10: Education Complete 구현 + 테스트
  17. 프론트엔드 POST 요청 URL 변경 + 테스트

[Phase D] 스케줄 워크플로우 (2~3일)
  18. WF-05: Order Polling + 야간 배치 구현 + 테스트
  19. WF-11: Send Reminders 구현 + 테스트
  20. WF-12: Review Requests 구현 + 테스트
  21. WF-13: Grade Update 구현 + 테스트

[Phase E] 데이터 마이그레이션 + 검증 (1~2일)
  22. Google Sheets -> Airtable 기존 데이터 이전 (수동 CSV import 또는 n8n 일회성 워크플로우)
  23. GAS 트리거 비활성화
  24. n8n 스케줄 트리거 활성화
  25. 24시간 모니터링 (텔레그램 알림 확인)
  26. GAS 웹 앱 비활성화 (최종)
```

### 9.2 롤백 계획

마이그레이션 중 문제 발생 시:
1. 프론트엔드 URL을 다시 GAS URL로 변경 (1분 내)
2. GAS 트리거 재활성화
3. n8n 스케줄 트리거 비활성화
4. GAS는 Sheets 기반이므로 데이터 손실 없음

GAS 코드와 Sheets는 마이그레이션 완료 후에도 최소 1개월간 보존합니다.

### 9.3 테스트 체크리스트

| 항목 | 테스트 방법 |
|------|-----------|
| CORS 동작 | foreverlove.co.kr에서 n8n Webhook fetch 호출 |
| 클래스 목록 조회 | 목록 페이지 로딩 + 필터/정렬/페이징 |
| 클래스 상세 조회 | 상세 페이지 로딩 + 모든 섹션 렌더링 |
| 파트너 인증 | 로그인 상태에서 파트너 대시보드 접근 |
| 비파트너 접근 차단 | 비파트너 회원 로그인 시 안내 메시지 |
| 예약 기록 | 테스트 주문 생성 -> Airtable 정산 내역 확인 |
| 적립금 지급 | process_reserve API 호출 + 메이크샵 반영 확인 |
| 이메일 발송 | 각 유형별 이메일 수신 확인 |
| 텔레그램 알림 | 각 이벤트별 텔레그램 메시지 수신 확인 |
| 주문 폴링 | 10분 주기 폴링 -> 새 주문 처리 확인 |
| 정합성 검증 | 자정 배치 -> 불일치 감지 확인 |
| 등급 업데이트 | 조건 충족 파트너 등급 변경 확인 |
| 에러 복구 | 의도적 API 실패 -> 자동 재시도 -> 텔레그램 알림 |

---

## 부록 A: n8n Credentials 목록

| Credential | 타입 | 용도 |
|-----------|------|------|
| Airtable API Key | Header Auth | Airtable 테이블 CRUD |
| Makeshop API | Custom (Header) | Shopkey + Licensekey |
| Gmail SMTP | SMTP | 이메일 발송 |
| Telegram Bot | API Key | 관리자 알림 |
| Admin Token | Custom | 관리자 전용 Webhook 인증 |

## 부록 B: 파일 변경 요약

| 파일 | 변경 유형 | 줄 수 |
|------|---------|------|
| `파트너클래스/목록/js.js` | URL 변경 | 1줄 |
| `파트너클래스/상세/js.js` | URL 변경 | 1줄 |
| 메이크샵 공통 JS | 전역 변수값 변경 | 1줄 |
| `파트너클래스/class-platform-gas.gs` | 보존 (롤백용) | 0줄 |
| n8n 워크플로우 (13개) | 신규 생성 | - |
| Airtable 테이블 (8개) | 신규 생성 | - |

## 부록 C: 비용 비교

| 항목 | GAS 현재 | n8n + Airtable |
|------|---------|---------------|
| 서버 | 무료 (Google) | 무료 (Oracle Cloud ARM) |
| DB | 무료 (Google Sheets) | Airtable Team $20/월 (50,000행) 또는 무료(1,200행) |
| 이메일 | 무료 (Gmail 100건) | 무료 (Gmail SMTP 500건) |
| 알림 | 무료 (이메일) | 무료 (텔레그램) |
| **월 합계** | **$0** | **$0 ~ $20** |

> Airtable 무료 플랜(1,200행/베이스)은 초기 운영에 충분합니다.
> 정산 내역이 1,200행을 초과하면 Team 플랜 전환 또는 월별 아카이빙이 필요합니다.
> 대안: Airtable 대신 n8n PostgreSQL에 직접 테이블 생성 (비용 $0, 하지만 GUI 관리 불가)

---

*이 문서는 GAS 백엔드 전문가가 기존 5,271줄 GAS 코드를 분석하여 작성한 n8n + Airtable 전환 설계서입니다.*
*실제 구현 시 각 워크플로우의 세부 노드 설정은 n8n GUI에서 진행합니다.*
