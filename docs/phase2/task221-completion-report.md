# Task 221 + Task 223 완료 보고서

## 개요

**대상 파일:** `파트너클래스/class-platform-gas.gs`
**변경 전 줄 수:** 3,292줄 -> **변경 후 줄 수:** 4,232줄 (+940줄)
**작업일:** 2026-02-21

---

## 구현 기능 목록

### Task 221: 정산 -> 이메일 자동화 파이프라인 완성

#### A. 정산 내역 시트 컬럼 추가 (수강생 정보)

| 컬럼 | 위치 | 설명 |
|------|------|------|
| `student_name` | U (21번째) | 수강생 이름 |
| `student_email` | V (22번째) | 수강생 이메일 |
| `student_phone` | W (23번째) | 수강생 전화번호 (마스킹) |

**수정된 함수:**
- `handleRecordBooking()`: settlementRow에 3필드 추가 (data.student_name/email/phone)
- `processOrderInternal_()`: appendRow에 3필드 추가 (bookingData.student_name/email/phone)
- `initSheets()`: 정산 내역 헤더 배열에 3필드 추가
- `migrateSettlementHeaders()`: 기존 시트에 컬럼 추가하는 마이그레이션 함수 (1회 실행)

#### B. sendReminderIfNeeded_() 완성

**수강생 리마인더 이메일 (신규):**
- 정산 내역 시트의 `student_email` 컬럼에서 이메일 주소 조회
- D-3/D-1 각각 다른 본문 (D-1에는 "내일 수업 안내" 유의사항 추가)
- 수업 정보: 클래스명, 강사, 일시, 장소, 준비물(materials_included)
- 이메일 유형: `REMINDER_D3_STUDENT`, `REMINDER_D1_STUDENT`

**파트너 리마인더 이메일 (개선):**
- 마스킹된 수강생 이름 포함
- 예약 인원수 표시
- 이메일 유형: `REMINDER_D3_PARTNER`, `REMINDER_D1_PARTNER`

**보안 강화:**
- 모든 동적 값에 `escapeHtml_()` 적용 (기존 버전에서는 누락)

#### C. sendReviewRequestEmail_() 완성

**수강생 후기 요청 이메일 (신규):**
- 제목: `[PRESSCO21] 후기 작성하고 적립금 받으세요 - {class_name}`
- 500원 이상 적립금 인센티브 강조
- "후기 작성하기" CTA 버튼 (foreverlove.co.kr 링크)
- 수업 정보 요약 (클래스, 강사, 수강일)
- 안내: 솔직한 후기, 사진 첨부 시 추가 적립금, 1~2일 내 자동 지급
- 이메일 유형: `REVIEW_REQUEST_STUDENT`

**파트너 후기 알림 이메일 (개선):**
- 후기 답변 유도 문구 추가
- "답변은 평점 향상에 도움이 됩니다" 안내
- 이메일 유형: `REVIEW_REQUEST_PARTNER`

#### D. retryFailedSettlements() 보강

**기존 대비 개선점:**
| 항목 | 기존 | 개선 |
|------|------|------|
| LockService | 없음 | `tryLock(0)` 즉시 포기 패턴 |
| 시간 제한 | 없음 | 5분(300초) 경과 시 안전 중단 |
| retry_count | 없음 | error_message에 `retry:N\|원래에러` 형식으로 추적 |
| 최대 재시도 | 무한 | 5회 (MAX_RETRY_COUNT) |
| 적립금 0원 | 스킵 | COMPLETED로 자동 완료 처리 |
| 관리자 알림 | 기본 | 상세 결과 + 초과 경고 포함 |
| 10건 flush | 있음 | 유지 + 최종 flush 추가 |

---

### Task 223: 파트너 가입/승인/등급 관리

#### E. 파트너 신청 (POST partnerApply)

- 신청 정보를 "파트너 신청" 시트에 저장
- 중복 신청 체크 (PENDING 상태 기존 신청 존재 시 안내)
- 이미 파트너 등록된 회원은 중복 방지
- 관리자에게 신규 신청 알림 이메일 (모든 필드 포함)
- 신청자에게 접수 확인 이메일 (신청 번호, 심사 2~3일 안내)
- LockService 보호

#### F. 파트너 승인 (POST partnerApprove, 관리자 토큰 필수)

- 파트너 코드 자동 발급: `PC_YYYYMM_NNN` (예: PC_202602_001)
- "파트너 상세" 시트에 등록 (등급=SILVER, 수수료율 10%, 적립금 비율 100%)
- "파트너 신청" 시트 상태를 APPROVED로 업데이트
- 승인 이메일: 환영 메시지 + 파트너 코드/등급/수수료 + 시작 가이드 4단계
- 등급 승급 조건 안내 포함

#### G. 파트너 신청 상태 조회 (GET getPartnerApplicationStatus)

- member_id로 조회
- 이미 파트너: is_partner=true + partner_code/grade
- 신청 있음: application_id + 상태(PENDING/APPROVED/REJECTED)
- 신청 없음: has_application=false

#### H. 파트너 등급 자동 업데이트 (triggerUpdatePartnerGrades)

- 매일 오전 6시 실행 (시간 트리거)
- 정산 내역에서 파트너별 COMPLETED 건수 집계
- 등급 조건:
  - **GOLD**: 완료 10건 이상 + 평균 평점 4.0 이상
  - **PLATINUM**: 완료 50건 이상 + 평균 평점 4.5 이상
- **강등 없음** (한 번 승급하면 유지)
- class_count 시트값 자동 최신화
- 승급 시 수수료율/적립금비율 자동 변경
- 파트너에게 승급 축하 이메일 (새 수수료율, 누적 실적 포함)
- 관리자에게 승급 알림

---

## 정산 내역 시트 업데이트된 컬럼 구조

| 순서 | 컬럼명 | 타입 | 설명 |
|------|--------|------|------|
| A (1) | `settlement_id` | string | PK. 정산 고유 ID (STL_xxx) |
| B (2) | `order_id` | string | 메이크샵 주문 번호 |
| C (3) | `partner_code` | string | FK. 파트너 코드 |
| D (4) | `class_id` | string | FK. 클래스 ID |
| E (5) | `member_id` | string | 수강생 메이크샵 회원 ID |
| F (6) | `order_amount` | number | 주문 결제 금액 |
| G (7) | `commission_rate` | number | 수수료율 (0.10/0.12/0.15) |
| H (8) | `commission_amount` | number | 수수료 금액 |
| I (9) | `reserve_rate` | number | 적립금 전환율 (1.00/0.80/0.60) |
| J (10) | `reserve_amount` | number | 적립금 지급 금액 |
| K (11) | `class_date` | string | 수업 일시 |
| L (12) | `student_count` | number | 예약 인원수 |
| M (13) | `status` | string | PENDING/PROCESSING/COMPLETED/FAILED |
| N (14) | `reserve_paid_date` | string | 적립금 지급 완료 일시 |
| O (15) | `reserve_api_response` | string | API 응답 원본 (최대 1000자) |
| P (16) | `error_message` | string | 에러 메시지 (실패 시) |
| Q (17) | `student_email_sent` | string | 수강생 이메일 상태 (SENT,D3_SENT,D1_SENT,REVIEW_SENT) |
| R (18) | `partner_email_sent` | string | 파트너 이메일 상태 (SENT/FAILED) |
| S (19) | `created_date` | string | 정산 생성 일시 |
| T (20) | `completed_date` | string | 정산 완료 일시 |
| **U (21)** | **`student_name`** | string | **수강생 이름 (Task 221 추가)** |
| **V (22)** | **`student_email`** | string | **수강생 이메일 (Task 221 추가)** |
| **W (23)** | **`student_phone`** | string | **수강생 전화번호 - 마스킹 (Task 221 추가)** |

---

## 파트너 신청 시트 구조 (Task 223 신규)

| 순서 | 컬럼명 | 타입 | 설명 |
|------|--------|------|------|
| A (1) | `application_id` | string | PK. 신청 고유 ID (APP_xxx) |
| B (2) | `member_id` | string | 메이크샵 회원 ID |
| C (3) | `applicant_name` | string | 신청자 이름 |
| D (4) | `workshop_name` | string | 공방명 |
| E (5) | `email` | string | 연락 이메일 |
| F (6) | `phone` | string | 연락처 |
| G (7) | `location` | string | 지역 |
| H (8) | `specialty` | string | 전문 분야 (압화, 레진, 캔들 등) |
| I (9) | `portfolio_url` | string | 포트폴리오 URL |
| J (10) | `instagram_url` | string | 인스타그램 URL |
| K (11) | `introduction` | string | 자기 소개 |
| L (12) | `status` | string | PENDING/APPROVED/REJECTED |
| M (13) | `applied_date` | string | 신청 일시 |
| N (14) | `reviewed_date` | string | 심사 완료 일시 |
| O (15) | `reviewer_note` | string | 심사자 메모 |

---

## 시간 트리거 설정 가이드

GAS 편집기 > 트리거 > "+ 트리거 추가"로 다음 5개를 설정합니다.

| 함수명 | 이벤트 소스 | 유형 | 시간/간격 | 역할 |
|--------|-----------|------|----------|------|
| `triggerPollOrders` | 시간 기반 | 분 단위 | 매 10분 | 새 주문 감지 -> 정산 |
| `triggerSendReminders` | 시간 기반 | 일 단위 | 오전 9시~10시 | D-3, D-1 리마인더 |
| `triggerSendReviewRequests` | 시간 기반 | 일 단위 | 오전 10시~11시 | 수강+7일 후기 요청 |
| `triggerReconciliation` | 시간 기반 | 일 단위 | 자정~오전 1시 | Sheets vs API 정합성 검증 |
| `triggerSyncClassProducts` | 시간 기반 | 일 단위 | 오전 3시~4시 | 메이크샵 상품 동기화 |
| **`triggerUpdatePartnerGrades`** | 시간 기반 | 일 단위 | **오전 6시~7시** | **파트너 등급 자동 업데이트 (Task 223)** |

---

## 수동 실행 함수 목록

GAS 편집기 상단 함수 선택 드롭다운에서 선택 후 직접 실행하는 함수들입니다.

| 함수명 | 용도 | 실행 시기 |
|--------|------|----------|
| `retryFailedSettlements` | FAILED 상태 정산 재시도 (최대 5회) | 적립금 지급 실패 시 수동 또는 주기적 |
| `migrateSettlementHeaders` | 기존 정산 시트에 student 컬럼 추가 | **최초 1회만 실행 (필수)** |
| `initSheets` | 전체 시트 구조 초기 생성 | 최초 설정 시 |
| `checkConfig` | 스크립트 속성 + 시트 존재 확인 | 디버깅용 |
| `runFullTest` | 전체 설정/시트/API 시뮬레이션 | 디버깅용 |
| `clearAllCache` | CacheService 전체 삭제 | 캐시 문제 시 |

---

## 보안 사항

- `partnerApprove` 액션은 `ADMIN_API_TOKEN` 검증 필수 (관리자 전용)
- `partnerApply` 액션은 토큰 불필요 (회원 누구나 신청 가능)
- 이메일 본문의 모든 동적 값에 `escapeHtml_()` 적용
- 리마인더/후기 이메일의 수강생 정보는 정산 내역에서만 조회 (API 호출 불필요)

---

## 배포 후 필수 작업

1. **`migrateSettlementHeaders()` 실행** - 기존 정산 내역 시트에 student 컬럼 헤더 추가
2. **시간 트리거 추가** - `triggerUpdatePartnerGrades` (오전 6시~7시)
3. **웹 앱 재배포** - "새 배포" > "웹 앱" > 최신 코드 적용
