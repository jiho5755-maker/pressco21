# GAS 백엔드 전문가 메모리

## Task 201 완료 (2026-02-21)

### 생성된 파일
- `파트너클래스/class-platform-gas.gs` (2,626줄) - 전체 GAS 백엔드
- `docs/phase2/gas-deployment-guide.md` (514줄) - 배포 가이드

### GAS 아키텍처 확정 사항
- 단일 GAS 배포 URL + action 파라미터로 분기
- doGet: getClasses, getClassDetail, getPartnerAuth, getPartnerDashboard, getCategories, health
- doPost: recordBooking, pollOrders, updateClassStatus, clearCache
- CacheService: 클래스 5분, 카테고리 6시간(CacheService 최대 21600초)
- LockService: POST 쓰기에 waitLock(10000), 폴링에 tryLock(0) 즉시 포기 패턴
- 응답 형식: { success, data, error: { code, message }, timestamp }

### Sheets 구조 확정 (6시트)
1. 파트너 상세 (18컬럼): partner_code, member_id(PK), grade, status 등
2. 클래스 메타 (23컬럼): class_id, makeshop_product_id, curriculum_json 등
3. 정산 내역 (20컬럼): settlement_id, status(PENDING/PROCESSING/COMPLETED/FAILED) 등
4. 주문 처리 로그 (6컬럼): 폴링 실행 이력
5. 이메일 발송 로그 (6컬럼): 일일 카운트 + 개별 기록
6. 시스템 설정 (3컬럼): key-value 형식

### 정산 파이프라인
1. 주문 폴링 (10분 트리거) -> 메이크샵 주문 조회 API
2. 클래스 상품 식별 (makeshop_product_id -> class_id 매핑)
3. 정산 내역 PENDING 기록
4. 수수료 계산 (SILVER 10%, GOLD 12%, PLATINUM 15%)
5. 적립금 지급 (process_reserve API) -> COMPLETED/FAILED
6. 이메일 발송 (수강생 확인 + 파트너 알림)
7. 실패 시 관리자 알림 이메일

### 시간 트리거 (4개)
- triggerPollOrders: 매 10분
- triggerSendReminders: 매일 오전 9시 (D-3, D-1)
- triggerSendReviewRequests: 매일 오전 10시 (수강+7일)
- triggerReconciliation: 매일 자정 (Sheets vs API 정합성)

### 보안
- 파트너 인증: member_id -> Sheets "파트너 상세" 매칭 (API 호출 불필요)
- 개인정보 마스킹: maskPhone_, maskName_, maskEmail_ 함수
- API 키는 PropertiesService에 저장

### CacheService 주의사항
- 최대 TTL: 21600초 (6시간), 24시간 캐시는 불가 -> 6시간으로 대체
- 최대 크기: 100KB/키, 초과 시 캐시 저장 스킵
- 캐시 키 패턴: classes_{filter}_{sort}_{page}_{limit}, class_detail_{id}

### 기존 GAS 파일
- youtube-proxy-v3.gs: 유튜브 v4 카테고리 자동매칭
- Code-final.gs: 파트너맵
- reserve-api-test.gs: 적립금 API 검증 (Task 150)

### 다음 단계
- Task 202: 메이크샵 클래스 상품 등록 체계 (상품 등록 프로세스, 옵션 매핑)
- Task 221: 정산+이메일 자동화 파이프라인 고도화 (현재 기본 구조 완성, 상세 로직 보완)
