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

### n8n + Airtable 전환 설계 완료 (2026-02-25)
- 설계 문서: `docs/phase2/n8n-airtable-migration-architecture.md`
- n8n 워크플로우 13개 설계 (WF-01 ~ WF-13)
- Airtable 테이블 8개 설계 (기존 Sheets 8시트 매핑)
- CORS: n8n 환경변수 N8N_CORS_ALLOWED_ORIGINS 설정
- 이메일: Gmail SMTP 500건/일 (GAS 100건의 5배) -> Brevo 300건/일 병행 가능
- 텔레그램: 기존 @Pressco21_makeshop_bot 활용, 9개 이벤트 알림
- 프론트엔드 변경: js.js 파일 3개의 URL 변수만 교체 (1줄씩)
- 응답 형식: { success, data, error, timestamp } 기존 GAS와 동일 유지
- retry_count: error_message 내 "retry:N|" 패턴 -> Airtable 정식 Number 필드 승격
- Airtable Linked Record: 파트너-클래스-정산-후기 관계형 참조 (Sheets에서 불가능했던 것)

### Task 211: n8n WF-01~03 구현 완료 (2026-02-25)
- `파트너클래스/n8n-workflows/WF-01-class-api.json` (20노드) - getClasses/getClassDetail/getCategories
- `파트너클래스/n8n-workflows/WF-02-partner-auth-api.json` (37노드) - getPartnerAuth/getPartnerDashboard/getPartnerApplicationStatus/getEducationStatus
- `파트너클래스/n8n-workflows/WF-03-partner-data-api.json` (26노드) - getPartnerBookings/getPartnerReviews
- `tasks/211-n8n-class-partner-api.md` - Task 정의 + 테스트 체크리스트

### Task 212: WF-04 Record Booking 구현 완료 (2026-02-25)
- `파트너클래스/n8n-workflows/WF-04-record-booking.json` (27노드) - 예약기록+수수료계산+정산
- `tasks/212-n8n-booking-settlement.md` - Task 정의 + 테스트 체크리스트
- **D+3 정산 방식**: 즉시 적립금 X, PENDING_SETTLEMENT로 기록, settlement_due_date = class_date + 3일
- **자기 결제 방지**: member_id == partner.member_id -> SELF_PURCHASE 상태 + 텔레그램 경고
- **수수료 개선안 B 적용**: GOLD reserveRate 0.80 -> 1.00 (SILVER/GOLD 모두 수수료 전액 적립금)
- **settlement_id 형식**: STL_YYYYMMDD_XXXXXX (6자리 랜덤)
- **이메일 2종**: 수강생 예약확인 + 파트너 알림 (email-templates.md 기반 HTML, escapeHtml XSS 방지)
- **텔레그램 3종**: 새 예약 알림 / 자기결제 경고 / 에러 알림
- **이메일/텔레그램 실패 시**: onError: continueRegularOutput (예약 데이터 보존)
- **NocoDB POST**: tbl_Settlements에 18필드 레코드 생성 (retry_count 정식 Number 필드)
- **tbl_Settlements 신규 필드**: settlement_due_date (Date), retry_count (Number)

### n8n 워크플로우 패턴 (Task 211+212 확립)
- Webhook GET -> Switch(action) -> 분기 처리 (읽기)
- Webhook POST -> Code(검증) -> HTTP Request(조회) -> Code(계산) -> HTTP Request(생성) (쓰기)
- NocoDB HTTP Request: `xc-token` 헤더 인증, `where` 파라미터로 서버 필터링
- NocoDB POST: bodyParameters로 필드 전달, 생성 성공 시 Id 필드 반환
- NocoDB URL: `https://nocodb.pressco21.com/api/v1/db/data/noco/{{ $env.NOCODB_PROJECT_ID }}/{tableName}`
- 환경변수: `NOCODB_PROJECT_ID`, `TELEGRAM_CHAT_ID` (docker-compose에 설정)
- Links 필드 처리: 배열/문자열 양쪽 모두 대응 (Array.isArray 체크)
- 마스킹 함수: maskPhone/maskName/maskEmail -> Code 노드에 인라인 정의
- 응답 형식: 기존 GAS `{ success, data, pagination, timestamp }` 동일 유지
- 에러 응답: `{ success: false, error: { code, message }, timestamp }` 동일
- GAS 캐싱(CacheService) -> 삭제 (NocoDB 직접 조회 200~500ms 충분)
- getClasses 정렬: NocoDB sort 파라미터 활용 (-field = DESC)
- 페이지네이션: 전체 조회 후 Code 노드에서 slice (NocoDB offset 대신)
- 파트너 조인: 병렬 HTTP Request -> Code 노드에서 Map 기반 조인
- 파트너 인증: member_id -> tbl_Partners 조회 -> 없으면 tbl_Applications 체크
- **이메일 발송**: n8n emailSend 노드 + SMTP Credentials, onError: continueRegularOutput
- **텔레그램 알림**: n8n telegram 노드 + Telegram API Credentials, Markdown parse_mode
- **입력 검증**: Code 노드에서 sanitizeText + escapeHtml, _valid/_errorResponse 패턴
- **다단계 IF**: _error/_classFound/_success 플래그로 순차 분기
- **CORS 헤더**: 모든 Respond 노드에 Access-Control-Allow-Origin: https://foreverlove.co.kr

### Task 213: WF-05 Order Polling + Batch Jobs 구현 완료 (2026-02-25)
- `파트너클래스/n8n-workflows/WF-05-order-polling-batch.json` (67노드) - 5개 스케줄 배치 통합
- `tasks/213-n8n-order-polling-batch.md` - Task 정의 + 테스트 체크리스트
- **5개 Schedule Trigger**: 주문폴링(10분), 정합성(00:00), 상품동기화(03:00), 실패재시도(04:00), D+3정산(05:00)
- **5a 주문 폴링**: tbl_Settings(last_poll_time) -> 메이크샵 search_order -> tbl_Classes 매칭 -> 중복 체크 -> 수수료 계산 -> tbl_Settlements PENDING_SETTLEMENT 생성 -> tbl_PollLogs 기록
- **5b 상품 동기화**: tbl_Settings(class_category_id) -> 메이크샵 product_list -> tbl_Classes 비교 -> CREATE/PATCH/closed
- **5c 정합성 검증**: tbl_Settlements(COMPLETED) 파트너별 집계 -> 메이크샵 user_reserve 조회 -> 불일치 감지
- **5d 실패 재시도**: tbl_Settlements(FAILED, retry_count<5) -> process_reserve -> 성공:COMPLETED/실패:retry_count+1
- **5e D+3 정산**: tbl_Settlements(PENDING_SETTLEMENT, due_date<=today) -> process_reserve -> 성공:COMPLETED/실패:FAILED+retry_count=1
- **적립금 0원 자동완료**: 5d/5e 모두 reserve_amount<=0이면 API 호출 없이 COMPLETED
- **메이크샵 API 일일 예산**: ~260건/일 (500/시간 한도 충분)
- **onError: continueRegularOutput**: 개별 건 실패가 전체 배치를 중단시키지 않음
- **process_reserve maxTries: 2**: 중복 지급 방지를 위해 적립금 지급은 2회까지만

### n8n 스케줄 배치 패턴 (Task 213 확립)
- Schedule Trigger -> NocoDB GET(대상 조회) -> Code(파싱/분류) -> IF(대상 존재?) -> 개별 처리 -> 결과 집계 -> 텔레그램
- 병렬 조회: 2개 HTTP Request 노드 동시 실행 -> Code 노드에서 합류
- 대상 없을 때: IF false -> 바로 텔레그램 "대상 없음" 메시지
- NocoDB PATCH: specifyBody: "json" + jsonBody: JSON.stringify() 패턴 (동적 필드 업데이트)
- 메이크샵 process_reserve: form-urlencoded + datas[0][id]/datas[0][reserve]/datas[0][content]
- 결과 판정: return_code === '0000' && datas[0].result === true (여러 타입 대응)
- timezone: Asia/Seoul (settings에 설정)

### 다음 단계
- **Task 214**: WF-06~10 관리/POST 워크플로우 + WF-11~13 스케줄 워크플로우 (리마인더, 후기, 등급)
- Task 222: 파트너 대시보드 UI 개발 필요 (GAS API 3개 추가 완료)
- Task 231: 교육 아카데미 UI 개발 필요 (GAS API 2개 추가 완료)
