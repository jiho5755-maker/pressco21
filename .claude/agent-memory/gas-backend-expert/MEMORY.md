# GAS 백엔드 전문가 메모리

## Task 201 + 221 + 223 완료 (2026-02-21)

### 핵심 파일
- `파트너클래스/class-platform-gas.gs` (4,232줄) - 전체 GAS 백엔드
- `docs/phase2/gas-deployment-guide.md` (514줄) - 배포 가이드
- `docs/phase2/task221-completion-report.md` - 완료 보고서

### GAS 아키텍처 확정 사항
- 단일 GAS 배포 URL + action 파라미터로 분기
- doGet: getClasses, getClassDetail, getPartnerAuth, getPartnerDashboard, getCategories, getPartnerApplicationStatus, health
- doPost: recordBooking, pollOrders, updateClassStatus, clearCache, partnerApply, partnerApprove
- 관리자 토큰 필수 액션: pollOrders, clearCache, partnerApprove
- CacheService: 클래스 5분, 카테고리 6시간(CacheService 최대 21600초)
- LockService: POST 쓰기에 waitLock(10000), 폴링/재시도에 tryLock(0) 즉시 포기 패턴
- 응답 형식: { success, data, error: { code, message }, timestamp }

### Sheets 구조 확정 (7시트)
1. 파트너 상세 (18컬럼): partner_code, member_id(PK), grade, status 등
2. 클래스 메타 (25컬럼): class_id, makeshop_product_id, curriculum_json, schedules_json, materials_price 등
3. **정산 내역 (23컬럼)**: A~T(기존 20) + U:student_name + V:student_email + W:student_phone
4. 주문 처리 로그 (6컬럼): 폴링 실행 이력
5. 이메일 발송 로그 (6컬럼): 일일 카운트 + 개별 기록
6. 시스템 설정 (3컬럼): key-value 형식
7. **파트너 신청 (15컬럼)**: application_id, member_id, status(PENDING/APPROVED/REJECTED) 등

### 이메일 자동화 파이프라인 (Task 221 완성)
- **리마인더**: 수강생(D-3/D-1) + 파트너(D-3/D-1) 모두 발송, escapeHtml_ 적용
- **후기 요청**: 수강생에게 적립금 인센티브(500원+) 이메일 + 파트너에게 알림
- **이메일 유형**: BOOKING_CONFIRM, PARTNER_NOTIFY, REMINDER_D3/D1_STUDENT/PARTNER, REVIEW_REQUEST_STUDENT/PARTNER, PARTNER_APPLY_CONFIRM, PARTNER_APPROVAL, GRADE_UPGRADE

### retryFailedSettlements (Task 221 보강)
- LockService tryLock(0) + 5분 타임아웃
- retry_count 추적: error_message에 "retry:N|원래에러" 형식
- 최대 재시도 5회, 초과 시 스킵 + 관리자 경고
- 적립금 0원이면 COMPLETED 자동 완료

### 파트너 관리 (Task 223)
- 파트너 코드: PC_YYYYMM_NNN 형식 (generatePartnerCode_)
- 등급 자동 승급: SILVER -> GOLD(10건+/4.0+) -> PLATINUM(50건+/4.5+), 강등 없음
- 수수료율: SILVER 10%, GOLD 12%, PLATINUM 15%
- 적립금 비율: SILVER 100%, GOLD 80%, PLATINUM 60%

### 시간 트리거 (6개)
- triggerPollOrders: 매 10분
- triggerSendReminders: 매일 오전 9시 (D-3, D-1 수강생+파트너)
- triggerSendReviewRequests: 매일 오전 10시 (수강+7일)
- triggerReconciliation: 매일 자정 (Sheets vs API 정합성)
- triggerSyncClassProducts: 매일 오전 3시 (메이크샵 상품 동기화)
- **triggerUpdatePartnerGrades: 매일 오전 6시 (등급 자동 업데이트)**

### 수동 실행 함수
- retryFailedSettlements: FAILED 정산 재시도
- migrateSettlementHeaders: 기존 정산 시트에 student 컬럼 추가 (최초 1회)
- initSheets, checkConfig, runFullTest, clearAllCache

### 배포 후 필수 작업
1. migrateSettlementHeaders() 실행 (기존 시트에 student 컬럼 추가)
2. triggerUpdatePartnerGrades 시간 트리거 추가
3. 웹 앱 재배포

### 보안
- 파트너 인증: member_id -> Sheets "파트너 상세" 매칭
- 관리자 전용: ADMIN_API_TOKEN 스크립트 속성
- 개인정보 마스킹: maskPhone_, maskName_, maskEmail_ 함수
- 이메일 XSS 방지: escapeHtml_() 모든 동적값 적용
- API 키는 PropertiesService에 저장

### CacheService 주의사항
- 최대 TTL: 21600초 (6시간), 24시간 불가
- 최대 크기: 100KB/키, 초과 시 캐시 저장 스킵

### 다음 단계
- Task 222: 파트너 대시보드 (GAS 인증/데이터 엔드포인트는 구현 완료, UI 개발 필요)
- Task 231: 교육 아카데미 (퀴즈 결과 -> GAS 인증서)
