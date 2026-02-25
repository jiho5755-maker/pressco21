# Phase 2 v2.1 n8n + NocoDB 통합 테스트 체크리스트

작성일: 2026-02-25
버전: Phase 2 v2.1 (n8n + NocoDB)
작성자: QA/테스트 전문가 에이전트
참조 Task: Task 251

---

## 개요

### 테스트 범위

Phase 2 v2.1 파트너 클래스 플랫폼 전체를 배포 전 최종 검증한다.
기존 GAS 기반(v2.0) 대신 n8n + NocoDB 아키텍처로 전환된 시스템을 검증한다.

| 테스트 대상 | 위치 | 관련 Task |
|------------|------|---------|
| n8n 워크플로우 (13개) | n8n.pressco21.com | Task 211~231 |
| NocoDB 데이터베이스 (8개 테이블) | nocodb.pressco21.com | Task 201 |
| 메이크샵 프론트엔드 (3개 페이지) | foreverlove.co.kr/파트너클래스/ | Task 211, 212, 222 |
| 스케줄 자동화 (WF-05/11/12/13) | n8n 스케줄러 | Task 213, 231 |
| 에러 핸들링 (WF-ERROR) | n8n Error Trigger | Task 232 |

### 테스트 환경

| 항목 | 내용 |
|-----|-----|
| 메이크샵 사이트 | https://foreverlove.co.kr |
| n8n 서버 | https://n8n.pressco21.com |
| NocoDB 서버 | https://nocodb.pressco21.com |
| 텔레그램 봇 | @Pressco21_makeshop_bot |
| 테스트 파트너 계정 | 메이크샵 "강사회원" 그룹 계정 (관리자 준비 필요) |
| 테스트 일반 회원 계정 | 일반 메이크샵 회원 계정 |
| 테스트 도구 | 수동 테스트 (브라우저), n8n 워크플로우 수동 실행 |

### 합격 기준

- Critical 항목: 0건 실패 (배포 불가 조건)
- Major 항목: 0건 실패 (권장)
- Minor 항목: 2건 이하 허용
- 성능: Lighthouse Performance 80+, Accessibility 85+
- 보안: 인증 우회, XSS, 자기결제 방지 0건 실패

### n8n 워크플로우 전체 목록

| WF | URL / 스케줄 | 역할 |
|---|------------|------|
| WF-01 | /webhook/class-api (GET) | 클래스 목록/상세/카테고리 조회 |
| WF-02 | /webhook/partner-auth (GET) | 파트너 인증/대시보드/신청상태/교육상태 |
| WF-03 | /webhook/partner-data (GET) | 파트너 예약/후기 조회 + 개인정보 마스킹 |
| WF-04 | /webhook/record-booking (POST) | 예약 기록 + 수수료 계산 + 이메일 |
| WF-05 | Schedule (10분/00:00/03:00/04:00/05:00) | 주문 폴링 + 배치 처리 + D+3 정산 |
| WF-06 | /webhook/class-management (POST) | 클래스 생성/수정/삭제/상태변경 |
| WF-07 | /webhook/partner-apply (POST) | 파트너 신청 접수 |
| WF-08 | /webhook/partner-approve (POST, ADMIN_API_TOKEN) | 파트너 승인 (관리자 전용) |
| WF-09 | /webhook/review-reply (POST) | 후기 답글 등록 |
| WF-10 | /webhook/education-complete (POST) | 교육 이수 처리 |
| WF-11 | Schedule 매일 09:00 | D-3/D-1 리마인더 이메일 |
| WF-12 | Schedule 매일 10:00 | 후기 요청 이메일 (class_date+7일) |
| WF-13 | Schedule 매일 06:00 | 등급 업데이트 (뼈대, TODO) |
| WF-ERROR | Error Trigger | 에러 핸들러 → 텔레그램 + NocoDB tbl_ErrorLogs |

---

## 섹션 0. 환경 준비 체크리스트

> 이 섹션은 테스트 시작 전 관리자가 완료해야 하는 필수 선행 작업이다.
> 모든 항목이 통과되어야 이후 기능 테스트를 시작할 수 있다.

### 0-1. NocoDB 서버 설치 및 테이블 생성

- [ ] ⚠️ Critical -- NocoDB Docker 컨테이너 실행 중 확인 (`docker ps | grep nocodb`)
- [ ] ⚠️ Critical -- https://nocodb.pressco21.com 접속 및 관리자 로그인 성공
- [ ] ⚠️ Critical -- tbl_Partners 테이블 생성 및 필드 확인 (partner_code, member_id, grade, commission_rate, status 등)
- [ ] ⚠️ Critical -- tbl_Classes 테이블 생성 및 필드 확인 (class_id, makeshop_product_id, partner_code, status 등)
- [ ] ⚠️ Critical -- tbl_Bookings 테이블 생성 및 필드 확인 (booking_id, order_id, class_id, member_id 등)
- [ ] ⚠️ Critical -- tbl_Settlements 테이블 생성 및 필드 확인 (settlement_id, order_id, partner_code, status, retry_count 등)
- [ ] ⚠️ Critical -- tbl_Applications 테이블 생성 및 필드 확인 (application_id, member_id, status 등)
- [ ] ⚠️ Critical -- tbl_Reviews 테이블 생성 및 필드 확인 (review_id, class_id, member_id, rating, partner_answer 등)
- [ ] ⚠️ Critical -- tbl_Education 테이블 생성 및 필드 확인 (education_id, member_id, score, passed 등)
- [ ] ⚠️ Critical -- tbl_ErrorLogs 테이블 생성 및 필드 확인 (error_id, workflow_name, error_message, created_at 등)
- [ ] Major -- tbl_Partners ↔ tbl_Classes Links(Relations) 연결 확인
- [ ] Major -- tbl_Classes ↔ tbl_Reviews Links 연결 확인
- [ ] Major -- tbl_Classes ↔ tbl_Settlements Links 연결 확인
- [ ] Minor -- NocoDB Rollup 필드 확인 (파트너 총 정산 건수, 총 수수료, 평균 평점 자동 집계)

### 0-2. NocoDB API Token 발급 및 n8n Credentials 등록

- [ ] ⚠️ Critical -- NocoDB 관리자 > Team & Auth > API Token 발급 완료
- [ ] ⚠️ Critical -- n8n Credentials에 NocoDB Token 등록 (xc-token 헤더 방식)
  - Credentials 이름: `NocoDB API`
  - API Token: 발급된 토큰 입력
- [ ] ⚠️ Critical -- n8n NocoDB 노드 연결 테스트 성공 (tbl_Partners List 조회)

### 0-3. n8n 서버 Credentials 등록 (6개)

- [ ] ⚠️ Critical -- `NocoDB API` (xc-token) 등록 완료
- [ ] ⚠️ Critical -- `Makeshop API` (Shopkey + Licensekey) 등록 완료
  - Shopkey: 메이크샵 관리자 > 오픈 API에서 확인
  - Licensekey: 동일
- [ ] ⚠️ Critical -- `Email SMTP` (Naver 또는 G Suite) 등록 완료
  - SMTP Host, Port, 계정/암호 입력
  - 테스트 이메일 발송으로 연결 확인
- [ ] ⚠️ Critical -- `Telegram Bot API` 등록 완료
  - Bot Token: @BotFather에서 발급
  - Chat ID: @Pressco21_makeshop_bot 채널 ID
- [ ] Major -- `Makeshop API (IP 화이트리스트)` 등록 확인 -- n8n 서버 고정 IP (158.180.77.201) 메이크샵 허용 목록 추가
- [ ] Minor -- Credentials 연결 상태 n8n UI에서 녹색(정상) 확인

### 0-4. n8n CORS 설정

- [ ] ⚠️ Critical -- n8n 환경변수 CORS 설정 확인:
  - `N8N_CORS_ALLOWED_ORIGINS=https://foreverlove.co.kr,https://www.foreverlove.co.kr`
  - `N8N_CORS_ALLOW_METHODS=GET,POST,OPTIONS`
  - `N8N_CORS_ALLOW_HEADERS=Content-Type,Authorization`
- [ ] ⚠️ Critical -- foreverlove.co.kr 에서 n8n Webhook 호출 시 CORS 에러 없음 확인

### 0-5. 메이크샵 프론트엔드 URL 교체

- [ ] ⚠️ Critical -- `파트너클래스/목록/js.js` 의 N8N_URL 변수를 `https://n8n.pressco21.com/webhook/class-api` 로 교체
- [ ] ⚠️ Critical -- `파트너클래스/상세/js.js` 의 N8N_URL 변수를 `https://n8n.pressco21.com/webhook/class-api` 로 교체
- [ ] ⚠️ Critical -- `파트너클래스/파트너/js.js` 의 N8N_URL 변수를 `https://n8n.pressco21.com/webhook/partner-auth` 로 교체
- [ ] Major -- 메이크샵 편집기 저장 성공 (데이터 수정 실패 없음 확인)

### 0-6. n8n 워크플로우 13개 + WF-ERROR 활성화(Active) 확인

- [ ] ⚠️ Critical -- WF-01 ~ WF-13, WF-ERROR 모두 Active 상태 확인 (n8n UI에서 녹색 토글)
- [ ] ⚠️ Critical -- 각 워크플로우 Webhook URL이 n8n.pressco21.com 도메인으로 설정됨
- [ ] Major -- 스케줄 워크플로우(WF-05/11/12/13) 다음 실행 예정 시각 확인

### 0-7. 테스트 데이터 준비

- [ ] Major -- NocoDB tbl_Partners에 테스트 파트너 1건 삽입:
  - partner_code: `PC_202602_001`
  - member_id: 테스트 강사 계정의 메이크샵 회원 ID
  - grade: `GOLD`
  - commission_rate: 25
  - status: `active`
  - education_completed: `true`
- [ ] Major -- NocoDB tbl_Classes에 테스트 클래스 1건 삽입:
  - class_id: `CLS_TEST_001`
  - makeshop_product_id: 테스트 상품의 메이크샵 goodsNo
  - partner_code: `PC_202602_001`
  - status: `active`
- [ ] Minor -- 테스트용 메이크샵 주문 1건 준비 (정산 테스트용)

---

## 섹션 1. 고객 플로우 E2E 테스트

> 수강생이 클래스를 발견하고 결제·수강·후기 요청을 받기까지의 전체 여정을 검증한다.

### 1-1. 클래스 목록 페이지 (WF-01 연동)

| # | 테스트 항목 | 기대 결과 (Expected) | 실제 결과 (Actual) | 판정 |
|---|-----------|-------------------|-----------------|-----|
| 1 | foreverlove.co.kr/파트너클래스/목록/ 접속 | 페이지 정상 로드, 클래스 카드 표시 | | |
| 2 | n8n WF-01 action=getClasses 호출 | 200 응답, NocoDB tbl_Classes active 데이터 반환 | | |
| 3 | 카테고리 필터 적용 (예: 압화) | 필터에 맞는 클래스만 표시 | | |
| 4 | 지역 필터 적용 (예: 서울) | 지역 일치 클래스만 표시 | | |
| 5 | 난이도 필터 적용 (예: 입문) | 난이도 일치 클래스만 표시 | | |
| 6 | 정렬 (최신순/가격순) | 지정 순서로 카드 재배열 | | |
| 7 | 클래스 카드 이미지/이름/가격 표시 | 카드에 3개 정보 모두 표시 | | |
| 8 | 클래스 없을 때 빈 상태 메시지 | "등록된 클래스가 없습니다" 문구 표시 | | |
| 9 | 모바일 반응형 (375px) | 카드 1열, 레이아웃 깨짐 없음 | | |
| 10 | 브라우저 콘솔 에러 없음 | 콘솔 에러 0건 | | |

체크박스:
- [ ] ⚠️ Critical -- 클래스 목록 WF-01 정상 연동 및 데이터 표시
- [ ] Major -- 필터 3종 (카테고리/지역/난이도) 모두 정상 동작
- [ ] Major -- 모바일 반응형 레이아웃 깨짐 없음
- [ ] Minor -- 빈 상태 메시지 표시

### 1-2. 클래스 상세 페이지 (WF-01 getClassDetail 연동)

| # | 테스트 항목 | 기대 결과 (Expected) | 실제 결과 (Actual) | 판정 |
|---|-----------|-------------------|-----------------|-----|
| 11 | 클래스 카드 클릭 → 상세 페이지 이동 | URL에 class_id 파라미터 포함, 상세 로드 | | |
| 12 | WF-01 action=getClassDetail 호출 | 클래스+파트너 결합 데이터 반환 | | |
| 13 | 이미지 갤러리 표시 | Swiper 슬라이드 정상 동작 | | |
| 14 | 커리큘럼/소개 텍스트 표시 | XSS 이스케이프 적용된 텍스트 표시 | | |
| 15 | 일정 선택 (flatpickr 달력) | 날짜 선택 후 시간 옵션 표시 | | |
| 16 | 인원 선택 | 1명~최대인원 범위 내 선택 | | |
| 17 | 옵션 선택 (재료비 포함 등) | 옵션별 가격 합산 표시 | | |
| 18 | 예약하기 버튼 클릭 | 메이크샵 결제 페이지로 이동 (goodsNo 파라미터 포함) | | |
| 19 | 잔여석 0인 일정 | 예약 버튼 비활성화 또는 매진 표시 | | |
| 20 | 모바일 sticky 하단 예약 패널 | 스크롤 시 하단에 고정 표시 | | |

체크박스:
- [ ] ⚠️ Critical -- 상세 페이지 WF-01 getClassDetail 정상 연동
- [ ] ⚠️ Critical -- 메이크샵 결제 페이지 이동 시 goodsNo 파라미터 정상 전달
- [ ] Major -- 일정/인원/옵션 선택 UI 정상 동작
- [ ] Major -- 잔여석 0 처리 (매진 표시)

### 1-3. 예약 확인 이메일 (WF-04 또는 WF-05)

| # | 테스트 항목 | 기대 결과 (Expected) | 실제 결과 (Actual) | 판정 |
|---|-----------|-------------------|-----------------|-----|
| 21 | 메이크샵 주문 완료 후 10분 이내 주문 폴링 감지 | WF-05a 실행 로그에 신규 주문 감지 기록 | | |
| 22 | 수강생에게 예약 확인 이메일 발송 | 수강생 이메일로 예약 내역 이메일 수신 | | |
| 23 | 파트너에게 새 예약 알림 이메일 발송 | 파트너 이메일로 예약 알림 수신 | | |
| 24 | 텔레그램 알림 "새 예약!" 수신 | @Pressco21_makeshop_bot 채널에 메시지 수신 | | |
| 25 | NocoDB tbl_Settlements 레코드 생성 | status=PENDING_SETTLEMENT, 수수료 금액 기록 | | |
| 26 | NocoDB tbl_Bookings 레코드 생성 | class_id, order_id, member_id, class_date 기록 | | |

체크박스:
- [ ] ⚠️ Critical -- 주문 폴링 10분 이내 감지 및 tbl_Settlements 생성
- [ ] ⚠️ Critical -- 수강생 예약 확인 이메일 발송 성공
- [ ] Major -- 파트너 예약 알림 이메일 발송 성공
- [ ] Major -- 텔레그램 새 예약 알림 수신

### 1-4. 리마인더 이메일 (WF-11)

| # | 테스트 항목 | 기대 결과 (Expected) | 실제 결과 (Actual) | 판정 |
|---|-----------|-------------------|-----------------|-----|
| 27 | WF-11 수동 실행 (D-3 조건 데이터 준비 후) | class_date - 오늘 = 3일인 예약 건 이메일 발송 | | |
| 28 | D-3 이메일 중복 발송 방지 | student_email_sent=D3_SENT 레코드는 재발송 안 됨 | | |
| 29 | WF-11 수동 실행 (D-1 조건 데이터 준비 후) | class_date - 오늘 = 1일인 예약 건 이메일 발송 | | |
| 30 | D-1 이메일 중복 발송 방지 | student_email_sent=D1_SENT 레코드는 재발송 안 됨 | | |
| 31 | WF-11 실행 후 NocoDB tbl_Bookings 업데이트 | student_email_sent 필드 업데이트 확인 | | |

체크박스:
- [ ] ⚠️ Critical -- D-3/D-1 리마인더 이메일 발송 성공
- [ ] ⚠️ Critical -- 중복 발송 방지 (D3_SENT/D1_SENT 상태 확인)
- [ ] Major -- 이메일 내용에 클래스명, 날짜, 장소 포함 확인

### 1-5. 후기 요청 이메일 (WF-12)

| # | 테스트 항목 | 기대 결과 (Expected) | 실제 결과 (Actual) | 판정 |
|---|-----------|-------------------|-----------------|-----|
| 32 | WF-12 수동 실행 (class_date+7일 조건 데이터 준비 후) | 후기 요청 이메일 발송 | | |
| 33 | 후기 요청 이메일 중복 방지 | student_email_sent=REVIEW_SENT 레코드 재발송 안 됨 | | |
| 34 | 이메일 내 후기 작성 링크 포함 | 메이크샵 후기 작성 URL 포함 | | |

체크박스:
- [ ] Major -- class_date+7일 조건으로 후기 요청 이메일 발송
- [ ] Major -- 중복 발송 방지 (REVIEW_SENT 상태 확인)

### 1-6. D+3 적립금 지급 (WF-05e)

| # | 테스트 항목 | 기대 결과 (Expected) | 실제 결과 (Actual) | 판정 |
|---|-----------|-------------------|-----------------|-----|
| 35 | WF-05e D+3 정산 수동 실행 (3일 경과 PENDING_SETTLEMENT 데이터 준비) | 메이크샵 process_reserve API 호출 → 파트너 적립금 지급 | | |
| 36 | 파트너 메이크샵 적립금 잔액 증가 확인 | 메이크샵 관리자 > 적립금 내역에서 지급 확인 | | |
| 37 | tbl_Settlements status COMPLETED 변경 | settlement_id 레코드의 status=COMPLETED | | |
| 38 | 적립금 지급 실패 시 retry_count 증가 | retry_count 1 증가, status=FAILED_RETRY | | |
| 39 | 최대 5회 재시도 후 최종 실패 | retry_count=5 도달 시 텔레그램 Critical 알림 발송 | | |

체크박스:
- [ ] ⚠️ Critical -- D+3 정산 성공 시 파트너 적립금 지급 및 COMPLETED 처리
- [ ] ⚠️ Critical -- 정산 실패 시 retry_count 증가 및 재시도 로직
- [ ] Major -- 최대 5회 재시도 후 텔레그램 Critical 알림

---

## 섹션 2. 파트너 플로우 E2E 테스트

> 파트너가 신청·교육·클래스 등록·대시보드 운영까지의 전체 여정을 검증한다.

### 2-1. 파트너 신청 (WF-07)

| # | 테스트 항목 | 기대 결과 (Expected) | 실제 결과 (Actual) | 판정 |
|---|-----------|-------------------|-----------------|-----|
| 40 | 파트너 신청 폼 제출 (WF-07 POST) | tbl_Applications에 PENDING 레코드 생성 | | |
| 41 | 신청자 확인 이메일 발송 | 신청자 이메일로 "신청 접수 완료" 이메일 수신 | | |
| 42 | 관리자 텔레그램 알림 | @Pressco21_makeshop_bot "새 파트너 신청" 메시지 수신 | | |
| 43 | 중복 신청 방지 | 이미 신청한 member_id로 재신청 시 "이미 신청됨" 오류 | | |
| 44 | WF-02 action=getPartnerApplicationStatus | PENDING 상태 반환, 신청일 표시 | | |

체크박스:
- [ ] ⚠️ Critical -- 파트너 신청 WF-07 정상 동작, tbl_Applications PENDING 생성
- [ ] Major -- 신청자 확인 이메일 및 텔레그램 관리자 알림 발송
- [ ] Major -- 중복 신청 방지

### 2-2. 관리자 파트너 승인 (WF-08, ADMIN_API_TOKEN 필수)

| # | 테스트 항목 | 기대 결과 (Expected) | 실제 결과 (Actual) | 판정 |
|---|-----------|-------------------|-----------------|-----|
| 45 | ADMIN_API_TOKEN 포함하여 WF-08 POST 호출 | tbl_Partners 레코드 생성 + partner_code 발급 (PC_YYYYMM_NNN) | | |
| 46 | 메이크샵 회원 그룹 변경 | 해당 member_id 회원을 "강사회원" 그룹으로 변경 | | |
| 47 | 승인 이메일 발송 | 파트너에게 "승인 완료 + partner_code" 이메일 수신 | | |
| 48 | tbl_Applications status APPROVED 변경 | application_id 레코드 status=APPROVED | | |
| 49 | ADMIN_API_TOKEN 없이 WF-08 호출 | 401 Unauthorized 응답 | | |

체크박스:
- [ ] ⚠️ Critical -- WF-08 정상 승인: tbl_Partners 생성, partner_code 발급
- [ ] ⚠️ Critical -- 메이크샵 회원 그룹 "강사회원" 변경 성공
- [ ] ⚠️ Critical -- ADMIN_API_TOKEN 없는 WF-08 접근 시 401 차단
- [ ] Major -- 승인 이메일 발송 성공

### 2-3. 교육 이수 (WF-10, PASS_THRESHOLD=11점 이상)

| # | 테스트 항목 | 기대 결과 (Expected) | 실제 결과 (Actual) | 판정 |
|---|-----------|-------------------|-----------------|-----|
| 50 | WF-10 POST (score=12, 합격) | tbl_Education passed=true, tbl_Partners education_completed=true | | |
| 51 | 합격 이메일 발송 | 인증서 이미지 포함 "합격" 이메일 수신 | | |
| 52 | 합격 텔레그램 알림 | 관리자 채널에 "교육 합격" 메시지 수신 | | |
| 53 | WF-10 POST (score=8, 불합격) | tbl_Education passed=false | | |
| 54 | 불합격 이메일 발송 | 격려 문구 포함 "아쉽습니다" 이메일 수신 | | |
| 55 | 점수 서버 검증 | 클라이언트가 score를 변조해도 서버에서 재계산 | | |

체크박스:
- [ ] ⚠️ Critical -- 합격 처리 (score≥11) 시 education_completed=true 및 합격 이메일
- [ ] ⚠️ Critical -- 불합격 처리 (score<11) 시 격려 이메일 및 재시도 안내
- [ ] ⚠️ Critical -- 점수 서버 사이드 검증 (클라이언트 변조 불가)
- [ ] Major -- 합격 텔레그램 알림 수신

### 2-4. 클래스 등록/수정/삭제 (WF-06)

| # | 테스트 항목 | 기대 결과 (Expected) | 실제 결과 (Actual) | 판정 |
|---|-----------|-------------------|-----------------|-----|
| 56 | 클래스 등록 (WF-06 action=create) | tbl_Classes 신규 레코드 생성, class_id 발급 | | |
| 57 | 클래스 수정 (WF-06 action=update) | tbl_Classes 해당 class_id 레코드 업데이트 | | |
| 58 | 클래스 삭제 (WF-06 action=delete) | tbl_Classes status=deleted 처리 (hard delete 아님) | | |
| 59 | 소유권 검증 | 다른 파트너의 class_id로 수정 요청 시 403 오류 | | |
| 60 | 클래스 상태 변경 (active/inactive) | tbl_Classes status 업데이트, 목록 페이지 즉시 반영 | | |

체크박스:
- [ ] ⚠️ Critical -- 클래스 등록/수정 WF-06 정상 동작
- [ ] ⚠️ Critical -- 소유권 검증: 타파트너 클래스 수정 시 403 차단
- [ ] Major -- 클래스 삭제 시 hard delete 없이 status=deleted 처리

### 2-5. 파트너 대시보드 (WF-02/03)

| # | 테스트 항목 | 기대 결과 (Expected) | 실제 결과 (Actual) | 판정 |
|---|-----------|-------------------|-----------------|-----|
| 61 | foreverlove.co.kr/파트너클래스/파트너/ 접속 (로그인 상태) | 가상태그 user_id 읽기 성공, WF-02 인증 요청 | | |
| 62 | WF-02 action=getPartnerAuth (active 파트너) | success:true, partner_code, grade 반환 | | |
| 63 | WF-02 action=getPartnerDashboard | 내 클래스 수, 이달 매출, 이달 수수료 반환 | | |
| 64 | WF-03 action=getPartnerBookings | 예약 목록 반환 (수강생 정보 마스킹 확인) | | |
| 65 | 수강생 이름 마스킹 | "홍*동" 형식으로 표시 (2글자 이상 시 중간 마스킹) | | |
| 66 | 수강생 전화번호 마스킹 | "010-****-1234" 형식으로 표시 | | |
| 67 | 수강생 이메일 마스킹 | "tes***@gmail.com" 형식으로 표시 | | |
| 68 | WF-03 action=getPartnerReviews | 내 후기 목록 + 별점 평균 반환 | | |
| 69 | 정산 내역 탭 | 월별 매출/수수료/적립금 금액 표시 | | |
| 70 | 등급 표시 (SILVER/GOLD/PLATINUM) | 현재 등급 배지 표시, 다음 등급 조건 안내 | | |

체크박스:
- [ ] ⚠️ Critical -- 파트너 대시보드 WF-02/03 정상 연동
- [ ] ⚠️ Critical -- 수강생 이름/전화번호/이메일 마스킹 처리 확인
- [ ] Major -- 월별 정산 내역 (매출/수수료/적립금) 정상 표시
- [ ] Major -- 등급 배지 및 다음 등급 조건 표시

### 2-6. 후기 답글 (WF-09)

| # | 테스트 항목 | 기대 결과 (Expected) | 실제 결과 (Actual) | 판정 |
|---|-----------|-------------------|-----------------|-----|
| 71 | 후기 답글 등록 (WF-09 POST) | tbl_Reviews partner_answer 필드 업데이트 | | |
| 72 | 타파트너 후기에 답글 시도 | 403 Forbidden 응답 | | |
| 73 | 답글 내용 XSS 입력 (`<script>alert(1)</script>`) | sanitizeAnswer 처리, 스크립트 실행 안 됨 | | |
| 74 | 이미 답글 있는 후기에 재답글 | 기존 답글 업데이트 또는 "이미 답글 있음" 오류 | | |

체크박스:
- [ ] ⚠️ Critical -- 후기 답글 소유권 검증 (403 차단)
- [ ] ⚠️ Critical -- 답글 XSS 입력 sanitizeAnswer 처리
- [ ] Major -- 후기 답글 등록 후 tbl_Reviews 업데이트 확인

### 2-7. 등급 업데이트 (WF-13)

| # | 테스트 항목 | 기대 결과 (Expected) | 실제 결과 (Actual) | 판정 |
|---|-----------|-------------------|-----------------|-----|
| 75 | WF-13 수동 실행 | 실행 성공, 오류 없음 (뼈대 워크플로우) | | |
| 76 | 등급 승급 조건 달성 파트너 | grade 상위 등급으로 변경 (강등 없음) | | |
| 77 | 등급 강등 방지 | 이미 GOLD인 파트너가 조건 미달이어도 SILVER로 강등 안 됨 | | |

체크박스:
- [ ] Major -- WF-13 수동 실행 시 오류 없이 완료
- [ ] Major -- 등급 강등 없음 로직 확인 (상위 등급만 변경)

---

## 섹션 3. 보안 테스트

> 인증 우회, 데이터 침해, XSS 등 보안 취약점을 검증한다.

### 3-1. 인증 우회 차단

| # | 테스트 항목 | 기대 결과 (Expected) | 실제 결과 (Actual) | 판정 |
|---|-----------|-------------------|-----------------|-----|
| 78 | 비로그인 상태에서 파트너 대시보드 접속 | "로그인이 필요합니다" 안내, 대시보드 내용 미표시 | | |
| 79 | 일반 회원(비파트너)으로 대시보드 접속 | WF-02 응답 status=non-partner, 신청 안내 표시 | | |
| 80 | pending 상태 파트너로 대시보드 접속 | WF-02 응답 status=pending, 심사중 안내 표시 | | |
| 81 | inactive 상태 파트너로 대시보드 접속 | WF-02 응답 status=inactive, 비활성 안내 표시 | | |
| 82 | member_id 없이 WF-02 호출 | "member_id required" 에러 응답 | | |
| 83 | 존재하지 않는 member_id로 WF-02 호출 | "non-partner" 응답 | | |

체크박스:
- [ ] ⚠️ Critical -- 비로그인 대시보드 차단
- [ ] ⚠️ Critical -- 비파트너 대시보드 차단 (WF-02 status=non-partner)
- [ ] ⚠️ Critical -- pending/inactive 파트너 상태별 분기 안내 메시지

### 3-2. 타파트너 데이터 접근 차단

| # | 테스트 항목 | 기대 결과 (Expected) | 실제 결과 (Actual) | 판정 |
|---|-----------|-------------------|-----------------|-----|
| 84 | 파트너A 계정으로 파트너B의 클래스 수정 (WF-06) | 403 Forbidden 응답 | | |
| 85 | 파트너A 계정으로 파트너B의 후기 답글 등록 (WF-09) | 403 Forbidden 응답 | | |
| 86 | 파트너A member_id로 파트너B 대시보드 데이터 조회 (WF-02) | 파트너A 데이터만 반환 (파트너B 데이터 미포함) | | |

체크박스:
- [ ] ⚠️ Critical -- WF-06 클래스 소유권 검증 403 차단
- [ ] ⚠️ Critical -- WF-09 후기 소유권 검증 403 차단
- [ ] ⚠️ Critical -- WF-02 대시보드 타파트너 데이터 격리

### 3-3. ADMIN_API_TOKEN 보안

| # | 테스트 항목 | 기대 결과 (Expected) | 실제 결과 (Actual) | 판정 |
|---|-----------|-------------------|-----------------|-----|
| 87 | ADMIN_API_TOKEN 없이 WF-08 호출 | 401 Unauthorized 응답 | | |
| 88 | 잘못된 ADMIN_API_TOKEN으로 WF-08 호출 | 401 Unauthorized 응답 | | |
| 89 | 올바른 ADMIN_API_TOKEN으로 WF-08 호출 | 200 성공 응답, 파트너 승인 처리 | | |

체크박스:
- [ ] ⚠️ Critical -- 토큰 없는 WF-08 접근 차단 (401)
- [ ] ⚠️ Critical -- 잘못된 토큰으로 WF-08 접근 차단 (401)

### 3-4. 자기결제 방지

| # | 테스트 항목 | 기대 결과 (Expected) | 실제 결과 (Actual) | 판정 |
|---|-----------|-------------------|-----------------|-----|
| 90 | 파트너가 자신의 클래스 결제 시도 | booking_member_id === partner_member_id 감지 → SELF_PURCHASE 오류 | | |
| 91 | SELF_PURCHASE 감지 시 정산 처리 중단 | tbl_Settlements 미생성 또는 SELF_PURCHASE status | | |

체크박스:
- [ ] ⚠️ Critical -- 자기결제 방지 (SELF_PURCHASE 오류 반환)
- [ ] ⚠️ Critical -- 자기결제 시 tbl_Settlements 미생성 확인

### 3-5. XSS 및 Injection 방지

| # | 테스트 항목 | 기대 결과 (Expected) | 실제 결과 (Actual) | 판정 |
|---|-----------|-------------------|-----------------|-----|
| 92 | 클래스명에 `<script>alert(1)</script>` 입력 (WF-06) | HTML 이스케이프 처리, 스크립트 실행 안 됨 | | |
| 93 | 후기 답글에 XSS 입력 (WF-09) | sanitizeAnswer 처리, 특수문자 이스케이프 | | |
| 94 | portfolio_url에 `javascript:alert(1)` 입력 | sanitizeUrl 처리, http/https만 허용 | | |
| 95 | instagram_url에 비표준 프로토콜 입력 | sanitizeUrl 처리, 빈 문자열 반환 | | |
| 96 | 파트너 신청 폼에 SQL 패턴 입력 (`'; DROP TABLE`) | 특수문자 이스케이프, NocoDB는 ORM 방식으로 SQL injection 불가 | | |

체크박스:
- [ ] ⚠️ Critical -- 클래스명 XSS 입력 시 HTML 이스케이프 처리
- [ ] ⚠️ Critical -- 후기 답글 XSS 입력 sanitizeAnswer 처리
- [ ] ⚠️ Critical -- URL 입력 sanitizeUrl 처리 (javascript: 차단)
- [ ] Major -- SQL 패턴 입력 시 에러 없이 무해하게 처리

### 3-6. API 키 미노출 확인

| # | 테스트 항목 | 기대 결과 (Expected) | 실제 결과 (Actual) | 판정 |
|---|-----------|-------------------|-----------------|-----|
| 97 | 메이크샵 프론트 소스코드에 API 키 미포함 | 소스 보기에서 Shopkey, Licensekey, NocoDB token 없음 | | |
| 98 | n8n Webhook 응답에 내부 토큰 미포함 | API 응답 JSON에 credential 정보 없음 | | |
| 99 | n8n 워크플로우 에러 메시지에 민감정보 미포함 | 에러 응답에 DB URL, 비밀번호 미포함 | | |

체크박스:
- [ ] ⚠️ Critical -- 프론트 소스코드에 Shopkey, Licensekey, NocoDB token 미포함
- [ ] Major -- API 응답에 내부 credential 미포함

---

## 섹션 4. 에러 핸들링 테스트

> 각 워크플로우 실패 시 적절한 에러 처리와 로깅이 이루어지는지 검증한다.

### 4-1. WF-ERROR (글로벌 에러 핸들러)

| # | 테스트 항목 | 기대 결과 (Expected) | 실제 결과 (Actual) | 판정 |
|---|-----------|-------------------|-----------------|-----|
| 100 | n8n 워크플로우 임의로 실패 유발 | WF-ERROR 트리거 → 텔레그램 에러 알림 발송 | | |
| 101 | WF-ERROR 실행 후 tbl_ErrorLogs 기록 | workflow_name, error_message, created_at 레코드 생성 | | |
| 102 | 텔레그램 알림에 워크플로우 이름 포함 | "WF-05 실패: [에러 내용]" 형식 메시지 | | |

체크박스:
- [ ] ⚠️ Critical -- WF-ERROR 트리거 시 텔레그램 알림 발송
- [ ] Major -- tbl_ErrorLogs 에러 기록 생성

### 4-2. 이메일 발송 실패 처리

| # | 테스트 항목 | 기대 결과 (Expected) | 실제 결과 (Actual) | 판정 |
|---|-----------|-------------------|-----------------|-----|
| 103 | SMTP 설정 오류 시 이메일 발송 실패 | 데이터 저장(tbl_Settlements)은 성공 (onError: continueRegularOutput) | | |
| 104 | 이메일 실패 후 tbl_ErrorLogs 기록 | email_type, recipient, error_message 기록 | | |
| 105 | 이메일 발송 실패가 주문 처리에 영향 없음 | tbl_Settlements COMPLETED 상태 유지 | | |

체크박스:
- [ ] ⚠️ Critical -- 이메일 발송 실패해도 데이터 저장은 성공 (독립적 처리)
- [ ] Major -- 이메일 실패 tbl_ErrorLogs 기록

### 4-3. 메이크샵 적립금 API 실패 처리

| # | 테스트 항목 | 기대 결과 (Expected) | 실제 결과 (Actual) | 판정 |
|---|-----------|-------------------|-----------------|-----|
| 106 | process_reserve API 호출 실패 (네트워크 오류 시뮬레이션) | tbl_Settlements status=FAILED, retry_count=1 | | |
| 107 | WF-05 재시도 (retry_count < 5) | 재시도 후 성공 시 status=COMPLETED | | |
| 108 | retry_count=5 도달 | status=FAILED_MAX, 텔레그램 Critical 알림 | | |

체크박스:
- [ ] ⚠️ Critical -- 적립금 API 실패 시 retry_count 증가 및 FAILED 상태 처리
- [ ] ⚠️ Critical -- 최대 재시도(5회) 초과 시 FAILED_MAX + 텔레그램 알림
- [ ] Major -- 재시도 성공 시 COMPLETED 상태 변경

### 4-4. NocoDB 연결 실패 처리

| # | 테스트 항목 | 기대 결과 (Expected) | 실제 결과 (Actual) | 판정 |
|---|-----------|-------------------|-----------------|-----|
| 109 | NocoDB 서버 일시 중단 시 n8n 응답 | 500 Internal Server Error (n8n 에러 응답) | | |
| 110 | WF-01 NocoDB 조회 실패 시 프론트 처리 | "데이터를 불러올 수 없습니다" 사용자 안내 메시지 | | |

체크박스:
- [ ] Major -- NocoDB 연결 실패 시 프론트에서 graceful 에러 메시지 표시
- [ ] Minor -- WF-ERROR를 통한 NocoDB 연결 실패 알림

---

## 섹션 5. 스케줄/성능 테스트

> 자동화 스케줄 워크플로우가 정해진 주기에 정상 실행되는지 검증한다.

### 5-1. WF-05 주문 폴링 스케줄

| # | 테스트 항목 | 기대 결과 (Expected) | 실제 결과 (Actual) | 판정 |
|---|-----------|-------------------|-----------------|-----|
| 111 | WF-05a 10분 폴링 수동 실행 | 메이크샵 신규 주문 조회 성공, 처리 건수 로그 | | |
| 112 | 주문 없을 때 폴링 | "주문 0건" 로그, 오류 없음 | | |
| 113 | 이미 처리된 order_id 재처리 방지 | 중복 처리 없음 (tbl_Settlements order_id 중복 체크) | | |
| 114 | WF-05e D+3 정산 스케줄 확인 | 매일 05:00 KST 실행 예정 확인 | | |
| 115 | WF-05 야간 배치 (정합성 검증/상품 동기화) | 매일 00:00/03:00 실행 예정 확인 | | |

체크박스:
- [ ] ⚠️ Critical -- WF-05a 주문 폴링 10분 주기 정상 동작
- [ ] ⚠️ Critical -- 중복 order_id 재처리 방지
- [ ] Major -- WF-05e D+3 정산 매일 05:00 스케줄 설정 확인

### 5-2. WF-11 리마인더 이메일 스케줄

- [ ] Major -- WF-11 n8n UI에서 매일 09:00 KST 스케줄 설정 확인 (UTC 00:00)
- [ ] Major -- WF-11 수동 실행 후 정상 동작 확인 (D-3/D-1 조건 데이터 필요)
- [ ] Minor -- WF-11 실행 로그에 발송 건수 기록 확인

### 5-3. WF-12 후기 요청 이메일 스케줄

- [ ] Major -- WF-12 n8n UI에서 매일 10:00 KST 스케줄 설정 확인 (UTC 01:00)
- [ ] Major -- WF-12 수동 실행 후 class_date+7일 조건 데이터 발송 확인
- [ ] Minor -- WF-12 실행 로그에 발송 건수 기록 확인

### 5-4. WF-13 등급 업데이트 스케줄

- [ ] Major -- WF-13 n8n UI에서 매일 06:00 KST 스케줄 설정 확인 (UTC 21:00 전일)
- [ ] Minor -- WF-13 수동 실행 후 오류 없이 완료 (뼈대 동작)

### 5-5. API 응답 성능

| # | 테스트 항목 | 기대 결과 (Expected) | 실제 결과 (Actual) | 판정 |
|---|-----------|-------------------|-----------------|-----|
| 116 | WF-01 getClasses 응답 시간 | 평균 1.5초 이내 | | |
| 117 | WF-01 getClassDetail 응답 시간 | 평균 1초 이내 | | |
| 118 | WF-02 getPartnerAuth 응답 시간 | 평균 1초 이내 | | |
| 119 | Lighthouse Performance 점수 (클래스 목록) | 80+ | | |
| 120 | Lighthouse Accessibility 점수 | 85+ | | |

체크박스:
- [ ] Major -- WF-01 API 응답 시간 1.5초 이내 (NocoDB 직접 조회 200~500ms 기준)
- [ ] Major -- Lighthouse Performance 80+, Accessibility 85+

---

## 섹션 6. NocoDB 관리자 GUI 테스트

> 관리자가 NocoDB UI에서 데이터를 직접 확인하고 운영할 수 있는지 검증한다.

### 6-1. NocoDB 기본 접속

- [ ] ⚠️ Critical -- https://nocodb.pressco21.com 접속 및 관리자 로그인 성공
- [ ] ⚠️ Critical -- 8개 테이블 모두 사이드바에 표시 확인
- [ ] Major -- 한국어 UI 설정 확인 (언어 설정 > 한국어)

### 6-2. 테이블별 데이터 확인

- [ ] Major -- tbl_Partners 그리드 뷰: 파트너 목록, 등급, 수수료율 확인
- [ ] Major -- tbl_Classes 갤러리 뷰: 클래스 카드, 이미지, 상태 확인
- [ ] Major -- tbl_Settlements 그리드 뷰: 정산 목록, PENDING/COMPLETED 상태 확인
- [ ] Major -- tbl_Applications 그리드 뷰: 신청 목록, PENDING/APPROVED 상태 확인
- [ ] Major -- tbl_Reviews 그리드 뷰: 후기 목록, 별점, 답글 상태 확인
- [ ] Minor -- tbl_ErrorLogs 그리드 뷰: 에러 로그 확인
- [ ] Minor -- tbl_Education 그리드 뷰: 교육 이수 기록 확인

### 6-3. NocoDB 관계(Links) 동작

- [ ] Major -- tbl_Partners 레코드 열기 > Linked Classes(tbl_Classes) 탭 확인 (파트너별 클래스 목록)
- [ ] Major -- tbl_Classes 레코드 열기 > Linked Reviews(tbl_Reviews) 탭 확인
- [ ] Minor -- tbl_Classes 레코드 열기 > Linked Settlements 탭 확인

### 6-4. NocoDB 필터/정렬/뷰

- [ ] Major -- tbl_Settlements에서 status=PENDING_SETTLEMENT 필터 적용 확인
- [ ] Major -- tbl_Partners에서 grade=GOLD 필터 적용 확인
- [ ] Minor -- tbl_Classes 정렬 (created_at 최신순) 확인
- [ ] Minor -- 커스텀 뷰 생성 (예: "승인 대기 신청" 뷰) 확인

### 6-5. NocoDB Rollup 집계 확인

- [ ] Minor -- tbl_Partners의 Rollup 필드 "총 정산 건수" 자동 집계 확인
- [ ] Minor -- tbl_Partners의 Rollup 필드 "총 수수료" 자동 집계 확인
- [ ] Minor -- tbl_Partners의 Rollup 필드 "평균 평점" 자동 집계 확인

---

## 섹션 7. 롤백 계획 확인

> 배포 후 심각한 문제 발생 시 빠르게 이전 상태로 되돌릴 수 있는지 검증한다.

### 7-1. 프론트엔드 롤백

- [ ] Major -- 롤백 절차 문서화 확인:
  1. 메이크샵 편집기 접속
  2. `파트너클래스/목록/js.js` N8N_URL을 GAS URL로 변경
  3. `파트너클래스/상세/js.js` 동일 변경
  4. `파트너클래스/파트너/js.js` 동일 변경
  5. 저장 후 즉시 반영 확인
- [ ] Major -- 롤백 소요 시간: 5분 이내 가능 확인

### 7-2. n8n 워크플로우 롤백

- [ ] Major -- n8n UI에서 특정 워크플로우 비활성화(deactivate) 절차 확인
- [ ] Major -- 비활성화 후 해당 워크플로우 Webhook URL 응답 없음 확인 (404 또는 비응답)
- [ ] Minor -- 부분 롤백 가능 여부 확인 (예: WF-05만 비활성화, 나머지 유지)

### 7-3. 데이터 보존 확인

- [ ] Major -- n8n 워크플로우 비활성화해도 NocoDB 데이터 보존 확인
- [ ] Major -- GAS 롤백 시 NocoDB 데이터가 GAS와 충돌 없음 확인 (GAS는 Sheets 기반)
- [ ] Minor -- NocoDB 데이터 수동 백업 방법 확인 (CSV 내보내기)

---

## 최종 배포 점검 체크리스트

> 모든 섹션 테스트 완료 후 배포 전 마지막으로 확인하는 항목이다.

### 기능 테스트 최종 확인

- [ ] ⚠️ Critical -- 고객 E2E 플로우: 클래스 조회 → 결제 → 이메일 수신 전체 통과
- [ ] ⚠️ Critical -- 파트너 E2E 플로우: 신청 → 승인 → 교육 → 클래스 등록 → 대시보드 전체 통과
- [ ] ⚠️ Critical -- 보안 테스트: 인증 우회 0건, XSS 0건, 자기결제 차단 확인

### 기술 테스트 최종 확인

- [ ] ⚠️ Critical -- 메이크샵 편집기 저장 성공 (데이터 수정 실패 0건)
- [ ] ⚠️ Critical -- JS `${variable}` 이스케이프 `\${variable}` 형식 확인
- [ ] ⚠️ Critical -- 가상태그 `<!--/user_id/-->`, `<!--/if_login/-->` 원본 유지 확인
- [ ] ⚠️ Critical -- 브라우저 콘솔 에러 0건 (PC Chrome 기준)
- [ ] Major -- IIFE 패턴 적용 확인 (전역 변수 오염 없음)
- [ ] Major -- CSS 스코핑 확인 (컨테이너 ID/클래스로 범위 제한)

### 운영 테스트 최종 확인

- [ ] ⚠️ Critical -- n8n 워크플로우 13개 + WF-ERROR 모두 Active 상태
- [ ] ⚠️ Critical -- 텔레그램 알림 정상 수신 확인
- [ ] Major -- WF-05 10분 폴링 자동 실행 1회 이상 확인
- [ ] Major -- WF-11/12 스케줄 설정 확인 (다음 실행 시각 표시)
- [ ] Minor -- NocoDB 관리자 GUI 접속 및 데이터 확인

---

## 테스트 결과 요약

테스트 일자: ___________
테스트 담당자: ___________
n8n 서버 버전: ___________
NocoDB 버전: ___________

| 섹션 | Critical | Major | Minor | 통과 | 실패 |
|-----|---------|-------|-------|------|-----|
| 0. 환경 준비 | / | / | / | | |
| 1. 고객 플로우 | / | / | / | | |
| 2. 파트너 플로우 | / | / | / | | |
| 3. 보안 | / | / | / | | |
| 4. 에러 핸들링 | / | / | / | | |
| 5. 스케줄/성능 | / | / | / | | |
| 6. NocoDB GUI | / | / | / | | |
| 7. 롤백 계획 | / | / | / | | |
| **합계** | **/ 건** | **/ 건** | **/ 건** | | |

### 발견된 이슈 목록

| 번호 | 심각도 | 섹션 | 테스트 항목 | 재현 방법 | 상태 |
|-----|--------|-----|-----------|---------|-----|
| 1 | | | | | |

### 배포 판정

- [ ] PASS -- Critical 0건 실패, Major 0건 실패 → 배포 승인
- [ ] CONDITIONAL PASS -- Critical 0건, Minor 2건 이하 → 조건부 배포 승인 (Minor 이슈 배포 후 수정)
- [ ] FAIL -- Critical 1건 이상 실패 → 배포 불가, 수정 후 재테스트
