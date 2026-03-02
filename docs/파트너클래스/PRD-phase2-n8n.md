# PRESSCO21 Phase 2 파트너 클래스 플랫폼 PRD

> **버전**: v2.1 (n8n + NocoDB 전환)
> **작성일**: 2026-02-25
> **기반 문서**: PRD.md v1.2, n8n-airtable-migration-architecture.md, business-model-optimization.md, phase2-n8n-migration-review.md, brand-strategy-comprehensive.md
> **DB 선택 근거**: Airtable 무료 한도(레코드 1,000건·API 1,000회/월) 운영 불가 → Oracle Cloud 자체 호스팅 NocoDB (무료·무제한·한국어·n8n 네이티브 노드)
> **플랫폼**: 메이크샵 D4 프론트엔드 + n8n 자동화 + NocoDB 데이터 (자체 호스팅)
> **상태**: 설계 완료 — 구현 대기

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [시스템 아키텍처](#2-시스템-아키텍처)
3. [파트너 프로그램 설계](#3-파트너-프로그램-설계)
4. [정산 자동화 설계](#4-정산-자동화-설계)
5. [프론트엔드 설계](#5-프론트엔드-설계)
6. [이메일 자동화](#6-이메일-자동화)
7. [기술적 전제조건](#7-기술적-전제조건)
8. [성공 지표 KPI](#8-성공-지표-kpi)
9. [리스크 및 대응](#9-리스크-및-대응)

---

## 1. 프로젝트 개요

### 1.1 배경 및 목적

PRESSCO21(foreverlove.co.kr)의 핵심 신규 서비스로, 전국의 압화·보존화·공예 전문 강사(파트너)의 클래스를 플랫폼에서 홍보·결제·정산하는 **선순환 생태계**를 구축한다.

```
파트너 클래스 등록
  → PRESSCO21 플랫폼에서 고객이 결제
  → 수수료 10~15% 차감
  → 수수료를 적립금으로 전환
  → 파트너가 재료 구매/광고비로 사용
  → PRESSCO21 재료 매출 증가 + 파트너 노출 증가
  → 선순환: 더 많은 수강 → 더 많은 수수료 → 재료 구매 증가
```

### 1.2 GAS에서 n8n으로 전환한 이유

Phase 2 개발은 Google Apps Script(GAS) 기반으로 5,271줄 완성되었으나, 운영 전 n8n + NocoDB 전환을 결정했다. 핵심 이유는 다음과 같다.

| 항목 | GAS 한계 | n8n + NocoDB 해결 |
|------|---------|-------------------|
| 이메일 발송 | Gmail 100건/일 (70건 경고) | Gmail SMTP 500건/일 (5배) |
| 실행 시간 | 6분/회, 일 90분 | 자체 호스팅, 무제한 |
| 모니터링 | Logger.log 수동 확인 | GUI 실행 이력 + 텔레그램 실시간 알림 |
| 에러 복구 | 수동 retryFailedSettlements() 실행 | n8n 자동 재시도 + 에러 워크플로우 |
| 동시성 | LockService 단일 스크립트 | n8n Queue + NocoDB 낙관적 동시성 |
| 확장성 | Sheets 10,000행 성능 저하 | NocoDB 무제한 행 (PostgreSQL 기반) |
| 텔레그램 알림 | 이메일만 가능 | @Pressco21_makeshop_bot 즉시 연동 |
| 캐싱 | GAS CacheService (최대 6시간) | 불필요 (NocoDB REST API 직접 조회 200~500ms) |
| 메이크샵 IP 등록 | Google 서버 IP 유동적 | n8n 고정 IP 안정 등록 가능 |

### 1.3 기술 스택 구성

```
[메이크샵 D4 프론트엔드]
  foreverlove.co.kr
  Vanilla JS (IIFE, var) + CDN (Swiper, flatpickr)
  가상태그 <!--/user_id/--> 기반 인증
        |
        | fetch() — Webhook 호출
        |
[n8n 자동화 레이어]
  n8n.pressco21.com (Oracle Cloud ARM)
  13개 워크플로우 (Webhook + Schedule)
  CORS: Reverse Proxy (nginx) 설정
        |
        | NocoDB REST API / 메이크샵 Open API
        |
[데이터 레이어]
  NocoDB (nocodb.pressco21.com, Oracle Cloud 자체 호스팅)
  8개 테이블, Relations(Linked Record), Rollup 자동 집계
  한국어 관리 UI, PostgreSQL 백엔드, 무제한 레코드/API 호출
        |
[메이크샵 네이티브]
  결제: 클래스 = 상품, 날짜/시간 = 옵션, 정원 = 옵션별 재고
  적립금: process_reserve API (give/minus)
  회원그룹: 파트너/수강생 분류
  주문조회: 10분 폴링
```

---

## 2. 시스템 아키텍처

### 2.1 전체 구조도

```
[수강생]
  └─ foreverlove.co.kr 클래스 목록/상세 페이지 접속
       └─ 메이크샵 결제 (클래스 = 상품)
            └─ n8n WF-05 주문 폴링(10분) 감지
                 ├─ NocoDB 정산 내역 기록 (PENDING)
                 ├─ 이메일 발송 (예약 확인)
                 └─ D+3 정산: process_reserve API → 적립금 지급

[파트너]
  └─ foreverlove.co.kr 파트너 대시보드 접속
       └─ 가상태그 <!--/user_id/--> → JS → n8n WF-02 인증
            ├─ NocoDB 파트너 상세 조회
            ├─ 예약 현황 / 수익 리포트 확인
            └─ 후기 답변 / 클래스 상태 변경

[관리자]
  └─ 텔레그램 @Pressco21_makeshop_bot 실시간 알림 수신
       └─ 파트너 신청 → WF-08 승인 (Bearer Token)
            └─ NocoDB 파트너 상세 생성 + 메이크샵 회원그룹 변경

[n8n 스케줄러]
  ├─ 매 10분: WF-05 주문 폴링
  ├─ 매일 09:00: WF-11 D-3/D-1 리마인더
  ├─ 매일 10:00: WF-12 후기 요청
  ├─ 매일 06:00: WF-13 등급 자동 업데이트
  ├─ 매일 00:00: WF-05 정합성 검증
  ├─ 매일 03:00: WF-05 상품 동기화
  └─ 매일 04:00: WF-05 실패 정산 재시도
```

### 2.2 n8n 워크플로우 13개 목록

| ID | 트리거 | URL / 스케줄 | 역할 |
|----|--------|------------|------|
| WF-01 | Webhook GET | `/webhook/class-api` | 클래스 목록/상세/카테고리 조회 |
| WF-02 | Webhook GET | `/webhook/partner-auth` | 파트너 인증/대시보드/신청상태/교육상태 |
| WF-03 | Webhook GET | `/webhook/partner-data` | 파트너 예약/후기 조회 + 개인정보 마스킹 |
| WF-04 | Webhook POST | `/webhook/record-booking` | 예약 기록 + 수수료 계산 + 적립금 지급 + 이메일 |
| WF-05 | Schedule (복합) | 10분/00:00/03:00/04:00 | 주문 폴링 + 정합성 검증 + 상품 동기화 + 실패 재시도 |
| WF-06 | Webhook POST | `/webhook/class-manage` | 클래스 상태 변경 (파트너 본인 확인) |
| WF-07 | Webhook POST | `/webhook/partner-apply` | 파트너 신청 접수 + 중복 방지 + 이메일 + 텔레그램 |
| WF-08 | Webhook POST | `/webhook/partner-approve` | 파트너 승인 (Bearer Token 필수) + 코드 발급 + 회원그룹 변경 |
| WF-09 | Webhook POST | `/webhook/review-reply` | 후기 답변 (파트너 소유 확인) |
| WF-10 | Webhook POST | `/webhook/education-complete` | 교육 이수 완료 + 합격 판정 + 인증서 이메일 |
| WF-11 | Schedule 매일 09:00 | — | D-3/D-1 리마인더 이메일 (수강생+파트너) |
| WF-12 | Schedule 매일 10:00 | — | 수강 완료+7일 후기 요청 이메일 |
| WF-13 | Schedule 매일 06:00 | — | 파트너 등급 자동 업데이트 (강등 없음) |

**n8n이 GAS 대비 보안이 향상된 지점**: WF-05 주문 폴링은 n8n 내부 Schedule Trigger로 실행되므로 외부 Webhook 엔드포인트 노출이 불필요하다. GAS에서는 `ADMIN_API_TOKEN` 파라미터로 보호해야 했다.

**NocoDB가 Airtable 대비 우위인 지점**: 자체 호스팅이므로 레코드 수·API 호출 수 제한 없음. 월 10분 폴링(WF-05) 만으로 Airtable 무료 API 한도(1,000회/월)를 3일 내 초과하는 반면 NocoDB는 무제한.

### 2.3 NocoDB 테이블 8개 구조

| 테이블명 | 코드명 | 핵심 필드 | 관계 |
|---------|--------|---------|------|
| 파트너 상세 | tbl_Partners | partner_code(PK), member_id, grade, commission_rate, reserve_rate, education_completed | 부모 |
| 클래스 메타 | tbl_Classes | class_id(PK), makeshop_product_id, partner_code(Link), category, level, price, status | Partners 1:N |
| 정산 내역 | tbl_Settlements | settlement_id(PK), order_id, partner_code(Link), class_id(Link), status, retry_count | Classes 1:N |
| 파트너 신청 | tbl_Applications | application_id(PK), member_id, status(PENDING/APPROVED/REJECTED) | 독립 |
| 후기 | tbl_Reviews | review_id(PK), class_id(Link), member_id, rating, partner_answer | Classes 1:N |
| 주문 처리 로그 | tbl_PollLogs | poll_time, orders_found, orders_processed, errors | 독립 |
| 이메일 발송 로그 | tbl_EmailLogs | email_type, recipient, status(SENT/FAILED) | 독립 |
| 시스템 설정 | tbl_Settings | key, value (last_poll_time, admin_email 등) | 독립 |

**NocoDB Relations 관계도:**

```
tbl_Partners (파트너 상세)
    |-- 1:N --> tbl_Classes (클래스 메타)
    |               |-- 1:N --> tbl_Reviews (후기)
    |               |-- 1:N --> tbl_Settlements (정산 내역)
    |-- 1:N --> tbl_Applications (파트너 신청)
    |-- 1:N --> tbl_Settlements (정산 내역)
```

NocoDB Rollup 기능으로 파트너 상세에서 "총 정산 건수", "총 수수료", "평균 평점"을 자동 집계한다. GAS에서 수동 계산하던 집계를 NocoDB가 자동 관리한다.

### 2.4 메이크샵 연동 방식

#### 가상태그 기반 파트너 인증 (변경 없음)

```html
<!-- Index.html: 로그인 회원 ID 주입 -->
<!--/if_login/-->
  <span id="pdMemberId" style="display:none"><!--/user_id/--></span>
<!--/end_if/-->
```

```javascript
// js.js: DOM에서 회원 ID 읽기 (Phase 1.5 Task 151에서 검증 완료)
var memberId = document.getElementById('pdMemberId').textContent.trim();
if (!memberId) { /* 비로그인 → 로그인 안내 */ }
// → n8n WF-02 Webhook 호출 with member_id 파라미터
```

#### 메이크샵 Open API 연동 (n8n HTTP Request 노드)

| API | 용도 | 방식 |
|-----|------|------|
| 주문 조회 | `/list/open_api.html?mode=search&type=order_list` | GET, Shopkey/Licensekey 헤더 |
| 적립금 지급 | `/list/open_api_process.html?mode=save&type=reserve&process=give` | POST, form-encoded, datas[] |
| 적립금 차감 | 동일 엔드포인트, `process=minus` | POST |
| 회원그룹 변경 | `/list/open_api_process.html?mode=save&type=user&process=modify` | POST, datas[0][group_no] |
| 상품 목록 | `/list/open_api.html?mode=search&type=product_list&cate={ID}` | GET |

**인증 방식**: `Authorization: Basic` 불가. 반드시 커스텀 헤더 `Shopkey`/`Licensekey` 사용.

---

## 3. 파트너 프로그램 설계

### 3.1 브랜드: PRESSCO21 블룸 파트너 (Bloom Partner)

| 항목 | 내용 |
|------|------|
| 프로그램명 | PRESSCO21 블룸 파트너 (Bloom Partner) |
| 슬로건 | "꽃의 아름다움을, 함께 전해요" |
| 파트너 호칭 | 공식 문서: "파트너 선생님" / 수강생 대상: "[이름] 선생님" |
| 등급명 (파트너 대상) | Bloom(블룸) / Garden(가든) / Atelier(아틀리에) |
| 등급명 (수강생/UI 배지) | SILVER / GOLD / PLATINUM (보편적 신뢰감) |

**하이브리드 등급명 채택 이유**: 코드 변경 최소화(SILVER/GOLD/PLATINUM 유지)하면서 파트너 내부 커뮤니케이션에서는 자연 메타포(Bloom/Garden/Atelier)로 브랜드 차별화를 달성한다.

### 3.2 수수료 및 적립금 전환율 정책

**채택 모델: 개선안 B (현행 유지 + GOLD 전환율 상향)**

| 등급 | 수수료율 | 적립금 전환율 | 파트너 현금 | 파트너 적립금 | PRESSCO21 현금 |
|------|---------|-------------|-----------|-------------|--------------|
| SILVER | 10% | 100% | 90% | 10% | 0% |
| GOLD | 12% | **100%** | 88% | **12%** | 0% |
| PLATINUM | 15% | 80% | 85% | 12% | **3%** |

**채택 근거:**
- SILVER 100% 전환은 타 플랫폼(프립 15~20%, 클래스101 30%, 탈잉 20%) 대비 압도적 차별점. "수수료 전액 환급" 마케팅 메시지 가능.
- GOLD 전환율 80%→100% 상향으로 승급 시 적립금이 10%→12%로 실질 증가. 승급 기피 동기 제거.
- PRESSCO21 직접 현금 수익은 PLATINUM 출현 시(6~12개월) 확보. 초기에는 적립금→재료 구매 간접 수익으로 운영.

**코드 상수 (n8n Code 노드):**

```javascript
const COMMISSION_RATES = {
  SILVER:   { commissionRate: 0.10, reserveRate: 1.00 },
  GOLD:     { commissionRate: 0.12, reserveRate: 1.00 },  // 개선안 B 적용
  PLATINUM: { commissionRate: 0.15, reserveRate: 0.80 }
};
```

### 3.3 파트너 등급 체계 (완화된 기준)

| 등급 | 활성 조건 | 승급 조건 | 강등 |
|------|---------|----------|------|
| SILVER (Bloom) | 가입 + 필수 교육 이수 | 기본 | 없음 |
| GOLD (Garden) | — | 완료 **8건** + 평점 **3.8** 이상 | 없음 |
| PLATINUM (Atelier) | — | 완료 **30건** + 평점 **4.2** 이상 | 없음 |

**기존 기준 대비 완화 근거:**
- GOLD: 10건→8건 (월 2~3건 운영 시 3개월 내 달성 가능)
- PLATINUM: 50건→30건 (상위 10% 파트너가 오픈 1년 내 도달 목표)
- 평점: 4.0→3.8, 4.5→4.2 (소수 인원 밀착 수업 특성상 한 건 저평점이 평균에 큰 영향)
- 강등 없음: 파트너 안정감 + 지속 참여 동기 보호

**게이미피케이션**: 대시보드에 "Garden 파트너까지 N건만 더!" 진행률 표시. WF-02 응답에 `completedCount`와 `avgRating` 포함. 80% 이상 달성 시만 표시(불필요한 압박 방지).

### 3.4 파트너 가입 여정 5단계

```
[ STEP 1 ] 가입 신청 (Google Forms)
    → WF-07 파트너 신청 접수
    → 이메일 7: "신청이 접수되었습니다" (자동 발송)
    → 텔레그램: "[파트너 신청] {이름} ({공방명})" (관리자 알림)

[ STEP 2 ] 관리자 검토 (1~3 영업일)
    → NocoDB tbl_Applications 심사 대기 Gallery 뷰 확인 (nocodb.pressco21.com)
    → 포트폴리오 URL, 인스타그램 확인 (Gallery 뷰 활용, 한국어 UI)

[ STEP 3 ] 승인/거절
    → 승인: WF-08 (Bearer Token) → 파트너 코드 PC_YYYYMM_NNN 발급
             → NocoDB tbl_Partners 생성 (SILVER 등급)
             → 메이크샵 회원그룹 변경 (파트너 그룹)
             → 이메일 5: "파트너 신청이 승인되었습니다" (자동 발송)
    → 거절: 보완 안내 이메일 (구체적 사유 + 재신청 가이드, "거절" 단어 미사용)

[ STEP 4 ] 필수 교육 이수
    → YouTube Unlisted 3개 영상 (22분) 수강
    → Google Forms 퀴즈 (15문항, 70점 이상 합격)
    → WF-10 교육 이수 완료 처리
    → 이메일 8: "교육을 이수하셨습니다! Bloom 파트너 활성화 안내" (자동 발송)

[ STEP 5 ] 클래스 등록 및 활동 시작
    → Google Forms로 클래스 정보 입력
    → 관리자 검수 (1~2 영업일) 후 NocoDB tbl_Classes 생성
    → 메이크샵에 상품 등록 (결제 처리용)
    → 파트너 대시보드에서 예약 현황/수익 리포트 확인
```

---

## 4. 정산 자동화 설계

### 4.1 정산 타이밍: 수강일 +3일

```
결제 감지 (WF-05, 10분 폴링)
  → NocoDB 정산 내역 생성 (status: PENDING_SETTLEMENT)
  → 이메일 발송 (수강생 예약 확인, 파트너 예약 알림)
  → settlement_due_date = class_date + 3일 기록

매일 실행 (WF-05 야간 배치)
  → due_date <= today AND status = PENDING_SETTLEMENT 건 조회
  → 메이크샵 process_reserve API 호출 (적립금 지급)
  → 성공: status = COMPLETED
  → 실패: status = FAILED, retry_count + 1
```

**D+3 정산 채택 이유:**
- partner-registration-guide.md FAQ와 일치 ("수업 완료 후 D+3 자동 적립금 지급")
- D-3 무료 취소 정책과 맞물려 환불 전 취소 건은 CANCELLED 처리 후 적립금 미지급
- 실제 수강 확인 후 정산으로 분쟁 최소화

### 4.2 환불/취소 처리 시나리오

| 시나리오 | 상태 변경 | 적립금 |
|---------|---------|--------|
| 수강 전 (D+3 이전) 취소 | PENDING → CANCELLED | 미지급 (회수 불필요) |
| D-3~D-1 취소 (위약금 발생) | PENDING → PARTIAL_CANCELLED | 위약금 기반 일부 정산 |
| 수강 후 D+3 이후 환불 | COMPLETED → REFUND_REQUIRED | process_reserve minus 호출 |
| 수강생 노쇼 | PENDING → COMPLETED | 파트너가 준비 완료했으므로 정상 정산 |

**적립금 차감 실패 시**: 다음 정산에서 차감 이월. 3회 연속 불가 시 텔레그램 관리자 알림.

### 4.3 자기 결제 방지 로직

```javascript
// WF-04 Record Booking, Code 노드에서 구현
if (bookingData.member_id === partner.member_id) {
  // NocoDB: status = 'SELF_PURCHASE'
  // Telegram: "[주의] 자기 결제 감지: {partner_code}"
  // 정산 스킵
  return;
}
```

### 4.4 실패 정산 자동 재시도 (WF-05, 매일 04:00)

```
NocoDB 조회: status = FAILED AND retry_count < 5
  → 건별 process_reserve API 재호출
  → 성공: status = COMPLETED
  → 실패: retry_count + 1
          retry_count >= 5 시: 텔레그램 "[정산 실패] 최대 재시도 초과: {settlement_id}"
  → 결과 요약: 텔레그램 "재시도 결과: 성공 N건, 실패 N건"
```

### 4.5 정합성 검증 배치 (WF-05, 매일 00:00)

```
NocoDB status = COMPLETED 정산 내역 조회
  → 파트너별 누적 적립금 집계
  → 메이크샵 적립금 조회 API 호출 (파트너별 실제 잔액)
  → 불일치 감지 시: 텔레그램 "정합성 검증 불일치 N건 감지"
```

### 4.6 텔레그램 알림 통합

현재 운영 중인 @Pressco21_makeshop_bot 재활용. 추가 설정 없이 n8n Telegram 노드 연결.

| 이벤트 | 알림 메시지 |
|--------|-----------|
| 새 주문 감지 | `[새 예약] 클래스: {className} / 파트너: {partnerName} / 인원: {n}명 / 금액: {amount}원` |
| 적립금 지급 성공 | `[정산 완료] {partnerName} +{reserveAmount}원 (주문: {orderNumber})` |
| 적립금 지급 실패 | `[정산 실패] {settlement_id} / 사유: {errorMessage} / 재시도: {n}/5` |
| 파트너 신청 | `[파트너 신청] {applicantName} ({workshopName}) — 검토 필요` |
| 파트너 승인 | `[파트너 승인] {partnerName} → {partnerCode}` |
| 등급 변경 | `[등급 변경] {partnerName} SILVER → GOLD` |
| 워크플로우 에러 | `[에러] WF: {workflowName} / 노드: {nodeName} / {errorMessage}` |
| 폴링 결과 | `[폴링] 처리: {n}건 / 에러: {n}건 / 소요: {ms}ms` |
| 정합성 불일치 | `[정합성] 불일치 {n}건 감지 — 수동 확인 필요` |

---

## 5. 프론트엔드 설계

### 5.1 3개 페이지 구성

| 페이지 | 소스 경로 | CSS 스코핑 | 역할 |
|--------|---------|----------|------|
| 클래스 목록 | `파트너클래스/목록/` | `.class-catalog` | 필터/검색/카드 목록 |
| 클래스 상세 | `파트너클래스/상세/` | `.class-detail` | 갤러리, 커리큘럼, 일정, 후기 |
| 파트너 대시보드 | `파트너클래스/파트너/` | `.partner-dashboard` | 내 클래스, 예약, 수익, 후기 |

메이크샵 등록: 관리자 > 디자인관리 > 개별디자인 > 페이지 추가 > HTML 에디터 붙여넣기

### 5.2 변경 범위: URL 3줄만 교체

기존 HTML/CSS/JS 로직은 전혀 변경하지 않는다. URL만 교체한다.

**변경 파일 목록:**

| 파일 | 위치 | 변경 내용 |
|------|------|---------|
| `파트너클래스/목록/js.js` | L13 | `GAS_URL = 'YOUR_SCRIPT_ID'` → n8n URL |
| `파트너클래스/상세/js.js` | L14 | `GAS_URL = 'YOUR_SCRIPT_ID'` → n8n URL |
| 메이크샵 공통 JS | 관리자 공통 스크립트 | `window.PRESSCO21_GAS_URL = '...'` → n8n URL |

**권장 방식: 전역변수 통일 (3개 파일 모두 참조)**

```javascript
// 메이크샵 관리자 공통 스크립트
window.PRESSCO21_API_URL = 'https://n8n.pressco21.com/webhook';
```

```javascript
// 각 js.js 상단 (목록/상세/파트너 모두 동일 패턴)
var API_BASE_URL = window.PRESSCO21_API_URL || '';
if (!API_BASE_URL) {
    console.error('[PRESSCO21] API_BASE_URL이 설정되지 않았습니다.');
    return;
}
```

**장점**: URL 변경 시 공통 스크립트 1곳만 수정. GAS→n8n 전환 시 코드 재배포 없이 관리자 화면에서 수정 가능.

### 5.3 POST 요청 Content-Type 처리

기존 GAS 방식의 `text/plain` Content-Type은 n8n에서도 파싱 가능하므로 즉시 변경하지 않아도 된다. CORS Reverse Proxy 설정 완료 후 표준 `application/json`으로 순차 전환 권장.

```javascript
// 현재 (GAS 호환 유지)
headers: { 'Content-Type': 'text/plain' }

// CORS 확인 후 변경
headers: { 'Content-Type': 'application/json' }
// redirect: 'follow' 제거 (n8n은 302 리다이렉트 없음)
```

### 5.4 n8n Webhook 경로 매핑

| GAS action | n8n Webhook Path | Method | 인증 |
|-----------|-----------------|--------|------|
| getClasses, getClassDetail, getCategories | `/webhook/class-api` | GET | 공개 |
| getPartnerAuth, getPartnerDashboard, getEducationStatus | `/webhook/partner-auth` | GET | member_id 필수 |
| getPartnerBookings, getPartnerReviews | `/webhook/partner-data` | GET | member_id 필수 |
| recordBooking | `/webhook/record-booking` | POST | member_id 필수 |
| updateClassStatus | `/webhook/class-manage` | POST | member_id 필수 |
| partnerApply | `/webhook/partner-apply` | POST | 공개 |
| educationComplete | `/webhook/education-complete` | POST | member_id 필수 |
| replyToReview | `/webhook/review-reply` | POST | member_id 필수 |
| partnerApprove | `/webhook/partner-approve` | POST | Bearer Token (관리자 전용) |
| health | `/webhook/health` | GET | 공개 |

### 5.5 응답 형식 호환성 (GAS와 동일 구조 유지)

n8n Respond to Webhook 노드에서 기존 GAS 응답 형식을 그대로 반환해야 프론트엔드 수정이 최소화된다.

```json
// 성공 응답
{ "success": true, "data": { ... }, "timestamp": "2026-02-25T10:30:00+09:00" }

// 에러 응답
{ "success": false, "error": { "code": "PARTNER_NOT_FOUND", "message": "..." }, "timestamp": "..." }

// 파트너 인증 상태 분기
{ "success": true, "data": { "status": "pending", "message": "심사 중입니다" } }
{ "success": true, "data": { "status": "not_partner", "is_partner": false } }
{ "success": true, "data": { "partner_code": "PC_202603_001", "grade": "SILVER", ... } }
```

---

## 6. 이메일 자동화

### 6.1 이메일 발송 전략

| 단계 | 발송 수단 | 일일 한도 | 비용 |
|------|---------|---------|------|
| 1단계 (즉시) | Gmail SMTP (앱 비밀번호) | 500건 | 무료 |
| 2단계 (월 70건+ 도달) | Brevo 무료 병행 | +300건 | 무료 |
| 3단계 (사업 확장) | Oracle Cloud 자체 Postfix | 무제한 | 무료 |

GAS Gmail(100건/일) 대비 즉시 5배 향상. n8n Send Email 노드 SMTP Credentials 설정.

### 6.2 이메일 8종 목록

| # | 이메일 유형 | 발송 시점 | 수신자 | 트리거 워크플로우 |
|---|-----------|---------|--------|----------------|
| 1 | 예약 확인 | 결제 감지 직후 | 수강생 | WF-05 주문 폴링 |
| 2 | 파트너 예약 알림 | 결제 감지 직후 | 파트너 | WF-05 주문 폴링 |
| 3 | D-3 리마인더 | 수업 3일 전 09:00 | 수강생 + 파트너 | WF-11 |
| 4 | D-1 리마인더 | 수업 전날 09:00 | 수강생 + 파트너 | WF-11 |
| 5 | 후기 요청 | 수강 완료+7일 | 수강생 | WF-12 |
| 6 | 파트너 승인 안내 | 승인 직후 | 파트너 | WF-08 |
| 7 | 파트너 신청 접수 확인 | 신청 직후 | 신청자 | WF-07 |
| 8 | 교육 합격 + 인증서 | 퀴즈 합격 직후 | 파트너 | WF-10 |

**이메일 발송 누락 방지**: 정산 내역 `student_email_sent` 필드에 발송 완료 플래그 기록 (`D3_SENT`, `D1_SENT`, `REVIEW_SENT`). 이미 발송된 건은 스킵.

### 6.3 이메일 HTML 템플릿 관리

기존 GAS `email-templates.md`의 완성된 HTML 템플릿을 n8n Code 노드에 이식한다. 발송 로직(이메일 발송)은 Lock 해제 후 처리하여, 발송 실패가 데이터 저장에 영향을 주지 않는다.

**이메일 공통 브랜드 요소:**
- 헤더: `PRESSCO21 / Forever and ever and Blooming`
- 서명: `PRESSCO21 드림`
- 포인트 컬러: `#b89b5e` (골드)
- 폰트: Noto Sans KR, sans-serif

---

## 7. 기술적 전제조건

### 7.1 메이크샵 D4 코드 제약

| 제약 | 규칙 |
|------|------|
| JS 변수 선언 | `var`만 사용. `let`/`const` 편집기 저장 시 에러. |
| 템플릿 리터럴 | `\${variable}` 백슬래시 이스케이프 필수 (`${variable}` 그대로 쓰면 "데이터 수정 실패") |
| 가상태그 | `<!--/user_id/-->`, `<!--/if_login/-->` 등 절대 수정/삭제 금지 |
| JS 격리 | IIFE 패턴 필수 (`(function() { 'use strict'; ... })();`) |
| CSS 스코핑 | 컨테이너 ID/클래스로 범위 제한 (`.class-catalog`, `.partner-dashboard` 등) |
| fetch() API | 사용 가능 (Phase 2 기존 코드에서 이미 사용 중) |

### 7.2 n8n CORS 설정 (Reverse Proxy 권장)

n8n은 GAS와 달리 CORS 헤더를 자동 설정하지 않는다. foreverlove.co.kr에서 n8n.pressco21.com 호출 시 브라우저가 차단한다. **Reverse Proxy(nginx)에서 처리하는 방법 B가 가장 안정적이다.**

```nginx
# /etc/nginx/sites-available/n8n
location /webhook/ {
    add_header 'Access-Control-Allow-Origin' 'https://foreverlove.co.kr' always;
    add_header 'Access-Control-Allow-Origin' 'https://www.foreverlove.co.kr' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;

    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' 'https://foreverlove.co.kr';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization';
        add_header 'Access-Control-Max-Age' 86400;
        return 204;
    }

    proxy_pass http://localhost:5678;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

대안: n8n docker-compose.yml 환경변수 설정

```yaml
environment:
  - N8N_CORS_ALLOWED_ORIGINS=https://foreverlove.co.kr,https://www.foreverlove.co.kr
  - N8N_CORS_ALLOW_METHODS=GET,POST,OPTIONS
  - N8N_CORS_ALLOW_HEADERS=Content-Type,Authorization
```

### 7.3 메이크샵 API 인증

```
인증 방식: 커스텀 헤더 (Authorization: Basic 방식 아님)
Shopkey: {상점키}
Licensekey: {라이센스키}
```

n8n HTTP Request 노드에서: Authentication "None" 선택 후 Headers에 수동 추가.
n8n Credentials에 `MAKESHOP_SHOPKEY`, `MAKESHOP_LICENSEKEY` 환경변수로 저장.

### 7.4 n8n 서버 IP 등록 (필수)

메이크샵 Open API는 허용된 IP에서만 호출 가능하다.

**현재 허용 IP**: 112.219.232.181, 119.70.128.56 (기존 GAS/개발용)

**추가 필요**: n8n.pressco21.com (Oracle Cloud ARM)의 공인 IP를 메이크샵 관리자 > 오픈 API > 허용 IP에 등록.

GAS는 Google 서버 IP가 유동적이어서 문제가 발생할 수 있었으나, 자체 호스팅 n8n은 고정 IP이므로 오히려 안정적이다.

### 7.5 n8n Credentials 목록

| Credential | 타입 | 용도 |
|-----------|------|------|
| NocoDB API Token | Header Auth | NocoDB 테이블 CRUD (xc-token 헤더) |
| Makeshop API | Custom Headers | Shopkey + Licensekey |
| Gmail SMTP | SMTP (앱 비밀번호) | 이메일 발송 (500건/일) |
| Telegram Bot | API Key | @Pressco21_makeshop_bot 알림 |
| Admin Bearer Token | Custom | WF-08 파트너 승인 엔드포인트 보호 |

### 7.6 마이그레이션 단계별 계획

```
[Phase A] 인프라 준비 (1~2일)
  1. n8n CORS 환경변수 또는 nginx 설정
  2. n8n 서버 IP → 메이크샵 허용 IP 등록
  3. NocoDB Docker 설치 (Oracle Cloud) + nocodb.pressco21.com 서브도메인 설정
  3-1. NocoDB 테이블 8개 생성 + 필드 정의 + 한국어 설정
  4. n8n Credentials 등록 (NocoDB API Token, Makeshop, Gmail, Telegram, Admin)

[Phase B] 읽기 전용 워크플로우 (2~3일)
  5. WF-01 Class API 구현 + 프론트 GET 요청 테스트
  6. WF-02 Partner Auth API 구현 + 파트너 로그인 테스트
  7. WF-03 Partner Data API 구현 + 예약/후기 조회 테스트

[Phase C] 쓰기 워크플로우 (3~4일)
  8. WF-04 Record Booking + WF-06~10 구현
  9. 프론트 POST 요청 URL 변경 + 전체 테스트

[Phase D] 스케줄 워크플로우 (2~3일)
  10. WF-05 Order Polling + 야간 배치 구현
  11. WF-11~13 리마인더/후기/등급 구현

[Phase E] 데이터 마이그레이션 + 전환 (1~2일)
  12. Google Sheets → NocoDB 기존 데이터 CSV import
  13. GAS 트리거 비활성화 → n8n 스케줄 활성화
  14. 24시간 모니터링 후 GAS 웹앱 비활성화
```

**롤백 계획**: 프론트엔드 URL을 GAS URL로 복원(1분), GAS 트리거 재활성화. GAS 코드와 Sheets는 전환 완료 후 1개월 이상 보존.

---

## 8. 성공 지표 KPI

### 8.1 3개월 목표 (Phase 2 오픈 후 M+1~M+3)

| KPI | M+1 목표 | M+3 목표 | 측정 방법 |
|-----|---------|---------|---------|
| 신규 파트너 등록 | 5명 | 10명 | NocoDB tbl_Partners 행 수 |
| 활성 파트너 (월 1건+) | 4명 | 7명 | tbl_Settlements distinct partner |
| 월간 수강 예약 | 20건 | 35건 | tbl_Settlements 월별 건수 |
| 월 GMV (총 거래액) | 80만원 | 150만원 | tbl_Settlements order_amount 합계 |
| 월 수수료 | 8만원 | 15만원 | commission_amount 합계 |
| 적립금 재료 전환율 | 30% | 40% | 적립금 사용 / 총 발행 |
| 후기 작성률 | 15% | 20% | tbl_Reviews / 완료 수강 수 |

### 8.2 6개월 목표 (M+4~M+6)

| KPI | M+6 목표 | 근거 |
|-----|---------|------|
| 누적 파트너 등록 | 20명 | 초기 10명 + 입소문/성공사례 |
| 활성 파트너 | 15명 | 등록의 75% 활성화 |
| 월간 수강 예약 | 50건+ | 15명 x 월 3~4건 |
| 월 GMV | 250만원 | 50건 x 5만원 |
| 월 수수료 | 25만원+ | PRD v1.2 KPI 달성 |
| GOLD 파트너 | 3명+ | 완료 8건 이상 달성 |
| 적립금 재료 전환율 | 50% | 유효기간 + 촉진 이메일 효과 |

### 8.3 기술 품질 지표

| 지표 | 목표 |
|------|------|
| 정산 성공률 | 99%+ (실패 시 자동 재시도 5회) |
| 이메일 발송 성공률 | 95%+ (발송 로그 모니터링) |
| n8n 워크플로우 가동률 | 99.5%+ (Oracle Cloud ARM 안정성) |
| 파트너 대시보드 응답 | 1초 이내 (NocoDB 직접 조회 200~500ms) |
| 정합성 검증 불일치 | 0건/월 목표 |

### 8.4 피봇 필요 신호 (3개월 시점)

| Red Flag | 기준 | 대응 |
|----------|------|------|
| 활성 파트너 부족 | 5명 미만 | 모집 전략 전면 재검토 |
| 적립금 전환율 저조 | 20% 미만 | 적립금 사용처/보너스 개편 |
| 파트너 이탈률 높음 | 월 20%+ (활성→비활성) | 1:1 인터뷰 후 혜택 강화 |
| 후기 평점 하락 | 전체 평균 3.5 미만 | 파트너 교육 강화, 저평점 클래스 점검 |

---

## 9. 리스크 및 대응

### 9.1 플랫폼 우회 방지

**시나리오**: 파트너가 PRESSCO21을 통해 수강생 확보 후 직접 예약으로 수수료 회피.

**구조적 방어 3단계:**

1. **예방 (구조적)**: 적립금이 재료 도매가와 연결되어 플랫폼 이탈 시 재료 할인 혜택 소멸. 후기 자산(플랫폼 내 누적)이 신규 수강생 유치에 기여. 상위 노출 알고리즘(후기/예약 많을수록 노출 가중).

2. **감지**: 월간 리포트에서 예약 급감(월 5건→0건이나 클래스 활성 상태) 감지. WF-13 등급 업데이트 시 비활성 파트너 자동 분류.

3. **대응**: 소프트 대응("요즘 예약이 없으시네요" 이메일) → 1:1 연락 → 적립금 보너스 이벤트. 처벌보다 플랫폼에 남을 이유 강화가 핵심 원칙.

### 9.2 자기 결제 방지

WF-04 Record Booking에서 `bookingData.member_id === partner.member_id` 확인 후 정산 스킵 + 텔레그램 알림. NocoDB에 `SELF_PURCHASE` 상태로 기록하여 추적 가능.

### 9.3 환불 시 정산 회수

D+3 정산 적용으로 수강 전 취소는 PENDING 상태에서 CANCELLED로 변경하여 적립금 미지급. 수강 후 환불은 process_reserve minus API 호출. 차감 실패 시 다음 정산에서 자동 차감 이월.

### 9.4 클래스 품질 관리

| 단계 | 방법 |
|------|------|
| 사전 검수 | NocoDB tbl_Classes 등록 시 관리자 검수 (갤러리 뷰 활용) |
| 초기 모니터링 | 첫 3건 수강 후기 집중 관리 |
| 자동 경고 | 평점 3.5 미만 3건 연속 시 텔레그램 관리자 알림 (WF-13 확장) |
| 개선 프로그램 | 1:1 피드백 + 파트너 아카데미 추가 교육 콘텐츠 |

### 9.5 적립금 부채 누적 방지 (Phase 2 안정 후 적용 검토)

적립금 6개월 유효기간 도입. 만료 D-30, D-7 이메일 알림. 재료 구매 시 1원=1.2원 보너스 부여로 적립금 전환 촉진 (Phase 2 오픈 후 1개월 내 결정).

### 9.6 수수료 구조 재검토 타이밍

파트너 30명 달성 또는 Phase 3 착수 시점에 개선안 C("PLATINUM이 되면 수수료 전액 환급") 전환 검토. 개선안 C: 전 등급 수수료 12% 고정, 전환율 SILVER 80% → GOLD 90% → PLATINUM 100%.

---

## 부록 A: 비용 구조

| 항목 | GAS 현재 | n8n + NocoDB |
|------|---------|---------------|
| 서버 | 무료 (Google) | 무료 (Oracle Cloud ARM 기존 운영 중) |
| DB | 무료 (Google Sheets) | NocoDB 무료 (1,200행/Base) 또는 Team $20/월 (50,000행) |
| 이메일 | 무료 (Gmail 100건) | 무료 (Gmail SMTP 500건) |
| 알림 | 이메일만 | 무료 (텔레그램, 기존 봇 운영 중) |
| 월 합계 | $0 | $0 ~ $20 |

NocoDB 무료 플랜(1,200행/Base) 초기 운영 가능. 정산 내역 1,200행 초과 시 Team 플랜 전환 또는 월별 아카이빙. 대안: n8n PostgreSQL 직접 사용 (비용 $0, GUI 관리 불가).

## 부록 B: 기존 GAS 코드와의 관계

- `파트너클래스/class-platform-gas.gs` (5,271줄): 마이그레이션 완료 후 1개월 이상 보존 (롤백 보험)
- GAS 코드의 수수료 로직, 마스킹 함수, 이메일 HTML 템플릿: n8n Code 노드로 이식
- NocoDB 필드명: 기존 Sheets 컬럼명과 동일하게 유지하여 변환 로직 최소화
- 응답 JSON 구조: GAS 형식(`success`, `data`, `timestamp`) 그대로 유지하여 프론트엔드 변경 최소화

## 부록 C: 관련 문서 목록

| 문서 | 경로 | 설명 |
|------|------|------|
| 원본 PRD | `/docs/PRD.md` | v1.2 전체 프로젝트 PRD (GAS 기반) |
| n8n 아키텍처 설계 | `/docs/phase2/n8n-airtable-migration-architecture.md` | 13개 워크플로우 상세 + NocoDB 8개 테이블 |
| 비즈니스 모델 최적화 | `/docs/phase2/business-model-optimization.md` | 수수료/등급/KPI/리스크 심층 분석 |
| 메이크샵 연동 검토 | `/docs/phase2-n8n-migration-review.md` | CORS, 인증, API, IP 등록 기술 검토 |
| 브랜드 전략 | `/docs/phase2/brand-strategy-comprehensive.md` | 블룸 파트너 브랜드, 이메일 8종 카피, UI 카피 |
| 이메일 템플릿 | `/docs/phase2/email-templates.md` | 이메일 1~6 완성 HTML (인라인 CSS) |
| 파트너 가입 가이드 | `/docs/phase2/partner-registration-guide.md` | 등급 혜택 상세, FAQ |
| 파트너 교육 | `/docs/phase2/partner-academy-guide.md` | 아카데미 커리큘럼, 퀴즈 |
| 검수 보고서 | `/docs/phase2-inspection-report.md` | Phase 2 GAS 전체 검수 결과 |
| 배포 가이드 | `/docs/phase2-deploy-guide.md` | 비전공자 10단계 배포 가이드 |
