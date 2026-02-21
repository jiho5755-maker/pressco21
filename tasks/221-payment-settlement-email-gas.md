# Task 221: 결제 -> 정산 -> 이메일 자동화 GAS 파이프라인 완성

> **상태**: ✅ 완료
> **규모**: L
> **의존성**: Task 202, Task 212
> **에이전트**: `주도` gas-backend-expert | `협업` ecommerce-business-expert, makeshop-planning-expert, brand-planning-expert

## 목표

기존 GAS 파일(`파트너클래스/class-platform-gas.gs`)에 이미 기본 골격이 구현되어 있으나,
수강생 이메일 발송 로직이 TODO 상태로 남아있고, retryFailedSettlements() 등
핵심 기능이 누락되어 있다. 이를 완성하고 이메일 카피라이팅을 개선한다.

## 현재 구현 상태 (Task 201에서 이미 완료됨)

### 완료된 기능
- `triggerPollOrders()` - 주문 폴링 ✅
- `processOrderInternal_()` - 수수료 계산 + 정산 기록 + 적립금 지급 ✅
- `processReservePayment_()` - 메이크샵 적립금 API 호출 ✅
- `sendStudentConfirmationEmail_()` - 수강생 확인 이메일 (기본) ✅
- `sendPartnerNotificationEmail_()` - 파트너 알림 이메일 (기본) ✅
- `triggerSendReminders()` - D-3/D-1 리마인더 (파트너만) ✅
- `triggerSendReviewRequests()` - 후기 요청 (파트너만) ✅
- `sendEmailWithTracking_()` - 이메일 카운트 + 70건 경고 ✅
- `triggerReconciliation()` - 정합성 검증 ✅
- `sendAdminAlert_()` - 관리자 알림 ✅

### 누락/미완성 기능 (TODO 주석 있음)
- `sendReminderIfNeeded_()`: 수강생 이메일 발송 미완성 (student_email 없음)
- `sendReviewRequestEmail_()`: 수강생에게 후기 요청 미발송
- `retryFailedSettlements()`: 미구현
- 이메일 카피라이팅: 브랜드 톤 부족

## 대상 파일

- `파트너클래스/class-platform-gas.gs` (3,292줄, 확장)

## 구현 단계

- [x] 1단계: 기존 코드 감사 - 누락 기능 파악 (완료)
- [ ] 2단계: 정산 내역 시트 student_email 컬럼 추가 + handleRecordBooking 보완
- [ ] 3단계: 수강생 리마인더 이메일 실제 발송 완성 (sendReminderIfNeeded_)
- [ ] 4단계: 수강생 후기 요청 이메일 완성 (sendReviewRequestEmail_)
- [ ] 5단계: retryFailedSettlements() 구현
- [ ] 6단계: 이메일 템플릿 카피라이팅 개선 (brand-planning-expert 협업)
- [ ] 7단계: 코드 리뷰 (makeshop-code-reviewer)

## 수락 기준

- [ ] 수강생에게 예약 확인, D-3/D-1 리마인더, 후기 요청 이메일이 실제 발송된다
- [ ] FAILED 정산을 수동으로 재시도할 수 있다 (retryFailedSettlements)
- [ ] 이메일 70건 도달 시 관리자에게 Workspace 전환 알림이 간다
- [ ] 모든 이메일 템플릿이 PRESSCO21 브랜드 톤을 반영한다

## 추가 구현: Task 223 파트너 가입/승인 GAS 엔드포인트

Task 223 (파트너 가입/등급)과 Task 221은 같은 GAS 파일을 공유하므로,
파트너 신청/승인 관련 GAS 함수도 이 Task에서 함께 구현한다.

- `handlePartnerApply(data)` - 파트너 신청 접수 + 관리자 알림
- `handlePartnerApprove(data)` - 관리자 승인 처리 + 파트너 코드 발급 + 안내 이메일
- `handlePartnerGradeUpdate(data)` - 등급 자동 업데이트 (triggerUpdateGrades)

## 테스트 체크리스트

- [ ] 새 주문 감지 -> 수강생/파트너 이메일 발송 전체 파이프라인 E2E
- [ ] 수수료 계산 정확도 (SILVER 10%, GOLD 12%, PLATINUM 15%)
- [ ] 적립금 지급 성공/실패 시나리오
- [ ] D-3/D-1 리마인더: 수강생 + 파트너 모두 발송 확인
- [ ] 후기 요청: 수강생 + 파트너 모두 발송 확인
- [ ] retryFailedSettlements() - FAILED 재처리 확인
- [ ] 이메일 70건 도달 시 Workspace 전환 알림 확인
- [ ] 정합성 검증 배치 정상 동작 확인
- [ ] 파트너 신청 -> 승인 -> 파트너 코드 발급 플로우 확인

## 변경 사항 요약

(완료 후 작성)
