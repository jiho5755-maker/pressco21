# GAS 백엔드 전문가 메모리

## Task 201 + 221 + 222(GAS) + 223 + 231(GAS) 완료 (2026-02-21)

### 핵심 파일
- `파트너클래스/class-platform-gas.gs` (5,271줄) - 전체 GAS 백엔드
- `docs/phase2/gas-deployment-guide.md` (514줄) - 배포 가이드
- `docs/phase2/task221-completion-report.md` - 완료 보고서

### GAS 아키텍처 확정 사항
- 단일 GAS 배포 URL + action 파라미터로 분기
- doGet: getClasses, getClassDetail, getPartnerAuth, getPartnerDashboard, getCategories, getPartnerApplicationStatus, getPartnerBookings, getPartnerReviews, getEducationStatus, health
- doPost: recordBooking, pollOrders, updateClassStatus, clearCache, partnerApply, partnerApprove, replyToReview, educationComplete
- 관리자 토큰 필수 액션: pollOrders, clearCache, partnerApprove
- CacheService: 클래스 5분, 카테고리 6시간(CacheService 최대 21600초)
- LockService: POST 쓰기에 waitLock(10000), 폴링/재시도에 tryLock(0) 즉시 포기 패턴
- 응답 형식: { success, data, error: { code, message }, timestamp }

### Sheets 구조 확정 (8시트)
1. 파트너 상세 (18컬럼): partner_code, member_id(PK), grade, status 등
2. 클래스 메타 (25컬럼): class_id, makeshop_product_id, curriculum_json, schedules_json, materials_price 등
3. **정산 내역 (23컬럼)**: A~T(기존 20) + U:student_name + V:student_email + W:student_phone
4. 주문 처리 로그 (6컬럼): 폴링 실행 이력
5. 이메일 발송 로그 (6컬럼): 일일 카운트 + 개별 기록
6. 시스템 설정 (3컬럼): key-value 형식
7. **파트너 신청 (15컬럼)**: application_id, member_id, status(PENDING/APPROVED/REJECTED) 등
8. **후기 (11컬럼, Task 222)**: review_id, class_id, member_id, reviewer_name, rating, content, image_urls, created_at, partner_code, partner_answer, answer_at

### 이메일 자동화 파이프라인 (Task 221 완성)
- **리마인더**: 수강생(D-3/D-1) + 파트너(D-3/D-1) 모두 발송, escapeHtml_ 적용
- **후기 요청**: 수강생에게 적립금 인센티브(500원+) 이메일 + 파트너에게 알림
- **이메일 유형**: BOOKING_CONFIRM, PARTNER_NOTIFY, REMINDER_D3/D1_STUDENT/PARTNER, REVIEW_REQUEST_STUDENT/PARTNER, PARTNER_APPLY_CONFIRM, PARTNER_APPROVAL, GRADE_UPGRADE, EDUCATION_CERTIFICATE, EDUCATION_RETRY

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

### Task 222 GAS API 추가 (파트너 대시보드)
- **getPartnerBookings** (GET, 4376줄): 파트너 예약 현황, 기간/클래스 필터, 페이징, 수강생 마스킹
- **getPartnerReviews** (GET, 4532줄): 후기 목록, 별점 분포/평균, 답변 여부, 페이징
- **replyToReview** (POST, 4740줄): 후기 답변 저장, LockService, 소유권 검증
- **sanitizeText_** (4321줄): 제어 문자 제거 + 길이 제한 (후기 답변용)
- **maskEmailForDashboard_** (4340줄): 앞 3자 표시 (hon***@gmail.com)
- **isValidDateStr_** (4356줄): YYYY-MM-DD 형식 검증
- ERROR_CODES 추가: REVIEW_NOT_FOUND, REVIEW_NOT_OWNED
- "후기" 시트: initSheets에 추가, checkConfig 시트 목록에 추가
- 후기 소유권 검증: partner_code 컬럼 있으면 직접 비교, 없으면 class_id -> 클래스 조회 -> partner_code 비교

### 보안
- 파트너 인증: member_id -> Sheets "파트너 상세" 매칭
- 관리자 전용: ADMIN_API_TOKEN 스크립트 속성
- 개인정보 마스킹: maskPhone_, maskName_, maskEmail_, maskEmailForDashboard_ 함수
- 이메일 XSS 방지: escapeHtml_() 모든 동적값 적용
- 텍스트 정제: sanitizeText_() 제어 문자 제거 + 길이 제한
- 후기 답변 교차 접근 방지: class_id 소유권 2단계 검증 (partner_code 직접 비교 또는 class_id 역추적)
- API 키는 PropertiesService에 저장

### CacheService 주의사항
- 최대 TTL: 21600초 (6시간), 24시간 불가
- 최대 크기: 100KB/키, 초과 시 캐시 저장 스킵

### Task 231 교육 아카데미 GAS API (2026-02-21)
- **handleGetEducationStatus** (GET, 4886줄): 교육 이수 상태 조회, education_completed/date/score 반환
- **handleEducationComplete** (POST, 4951줄): 교육 이수 완료 처리, LockService, 컬럼 자동 추가
- **sendCertificateEmail_** (5110줄): 합격 인증서 이메일 (골드/아이보리/브라운 테마)
- **sendRetryEmail_** (5201줄): 불합격 재응시 안내 이메일 (격려 톤)
- ERROR_CODES 추가: INVALID_SCORE, EDUCATION_SAVE_FAIL
- 파트너 상세 시트 컬럼 동적 추가: education_date, education_score (없으면 자동 생성, 멱등)
- 합격 기준: 15문항 중 11문항 이상 (73%), pass_threshold는 프론트에서 전달
- 이메일 발송은 Lock 해제 후 실행 (발송 실패가 데이터 저장에 영향 주지 않음)
- CTA 링크는 임시 `#` (GAS URL 설정 후 교체 필요)

### 다음 단계
- Task 222: 파트너 대시보드 UI 개발 필요 (GAS API 3개 추가 완료)
- Task 231: 교육 아카데미 UI 개발 필요 (GAS API 2개 추가 완료)
