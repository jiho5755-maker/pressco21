# Task 222: 파트너 대시보드 + 인증 시스템

> **상태**: ✅ 완료
> **규모**: M
> **의존성**: Task 201, Task 221
> **에이전트**: `주도` makeshop-ui-ux-expert, gas-backend-expert | `협업` makeshop-planning-expert, ecommerce-business-expert

## 목표

파트너(강사/공방)가 자신의 강의를 관리하고, 예약 현황/수익/적립금을 확인하며,
수강생 후기에 답변할 수 있는 전용 대시보드 페이지를 구축한다.

## 현재 GAS 구현 상태 (Task 201, 221에서 완료)

### 이미 구현된 API
- `getPartnerAuth` - 파트너 인증 확인 (member_id → partner_code 매칭)
- `getPartnerDashboard` - 파트너 대시보드 (내 클래스 목록 + 정산 내역 월별 집계)
- `updateClassStatus` - 클래스 상태 변경 (POST)
- `getPartnerApplicationStatus` - 파트너 신청 상태 조회

### 추가 구현 필요한 GAS API
- `getPartnerBookings` - 내 클래스 예약 현황 (수강생 연락처 마스킹)
- `getPartnerReviews` - 내 클래스 후기 목록
- `replyToReview` - 후기 답변 저장 (POST)

## 대상 파일

- `파트너클래스/파트너/Index.html` (신규 생성)
- `파트너클래스/파트너/css.css` (신규 생성)
- `파트너클래스/파트너/js.js` (신규 생성)
- `파트너클래스/class-platform-gas.gs` (3개 API 추가)

## 기술 제약

- **메이크샵 가상태그**: `<!--/user_id/-->` → JS에서 `document.getElementById('memberIdTag').textContent`로 읽어 GAS 파라미터로 전달
- **IIFE 패턴 필수**
- **CSS 스코핑**: `.partner-dashboard` 클래스로 모든 스타일 범위 제한
- **var만 사용** (let/const 금지, 메이크샵 편집기 저장 오류 방지)
- **템플릿 리터럴 이스케이프**: `\${var}` 형식 필수
- **보안**: 비파트너 회원은 "파트너 전용 페이지" 안내 후 숨김

## 구현 단계

### 1단계: GAS 추가 API 3개 구현 (gas-backend-expert 주도)

- [ ] `getPartnerBookings(params)` - 예약 현황
  - 파트너 인증 → 내 클래스의 정산 내역에서 예약 추출
  - 수강생 연락처: 전화번호 뒷 4자리 마스킹, 이메일 @ 앞 일부 마스킹
  - 파라미터: member_id, class_id(선택), date_from(선택), date_to(선택)

- [ ] `getPartnerReviews(params)` - 후기 목록
  - 파라미터: member_id, class_id(선택), page, limit
  - 반환: 후기 목록 (별점, 내용, 작성일, 기존 답변)

- [ ] `replyToReview(data)` - 후기 답변 (POST)
  - 파트너 인증 → "후기" 시트에 answer 컬럼 업데이트

### 2단계: 파트너 대시보드 UI 구현 (makeshop-ui-ux-expert 주도)

- [ ] `파트너클래스/파트너/` 디렉토리 3파일 생성
- [ ] 인증 로직 구현
  - `<!--/user_id/-->` 치환코드 숨김 span 태그 삽입
  - 페이지 로드 시 GAS `getPartnerAuth` 호출
  - 비파트너: 안내 메시지 + 파트너 신청 버튼 표시
- [ ] 탭 기반 대시보드 UI (4개 탭)
  - **내 강의**: 강의 목록 + 상태 변경 (활성/비활성) + 클래스 상세 편집 링크
  - **예약 현황**: 기간/클래스 필터, 수강생 목록 (이름/연락처 마스킹), 상태별 집계
  - **수익 리포트**: 월 선택, 매출/수수료/적립금 집계 카드, 정산 내역 테이블
  - **후기 관리**: 클래스별 후기 목록, 별점 분포, 답변 입력/수정
- [ ] `.partner-dashboard` CSS 스코핑
- [ ] 로딩 스켈레톤 + 에러 처리

### 3단계: 코드 리뷰

- [ ] `makeshop-code-reviewer` 코드 검수

## 수락 기준

- [ ] 파트너 회원 로그인 시 대시보드 정상 표시
- [ ] 비파트너 회원 접근 시 파트너 신청 유도 메시지 표시
- [ ] 미로그인 시 로그인 페이지 리다이렉트
- [ ] 내 강의 목록 조회 + 상태 변경 정상 동작
- [ ] 예약 현황 조회 (수강생 연락처 마스킹 확인)
- [ ] 수익 리포트 월별 집계 정상 표시
- [ ] 후기 조회 + 답변 저장 정상 동작

## 테스트 체크리스트

- [ ] 파트너 인증 플로우 E2E (로그인 → 가상태그 → GAS 인증 → 대시보드)
- [ ] 비파트너 회원 접근 차단 확인
- [ ] 미로그인 접근 차단 확인
- [ ] 탭 전환 시 데이터 로딩 정상 동작
- [ ] 수강생 연락처 마스킹 표시 확인
- [ ] 후기 답변 저장 후 UI 반영 확인
- [ ] PC/모바일 반응형 확인

## 변경 사항 요약

### GAS 추가 구현 (class-platform-gas.gs: 4,279줄 → 5,271줄)
- `handleGetPartnerBookings`: 예약 현황 조회 (수강생 연락처 마스킹: 이름 홍**, 이메일 앞3자+***, 전화 010-****-5678)
- `handleGetPartnerReviews`: 후기 목록 조회 + 페이지네이션 + 평균 별점 집계
- `handleReplyToReview`: 후기 답변 저장 (LockService, 자기 클래스 소유권 검증)
- `sanitizeText_`, `maskEmailForDashboard_`, `isValidDateStr_` 헬퍼 3개 추가
- ERROR_CODES: `REVIEW_NOT_FOUND`, `REVIEW_NOT_OWNED` 추가
- initSheets()에 "후기" 시트 생성 구문 추가

### 프론트엔드 신규 생성 (파트너클래스/파트너/)
- `Index.html` (395줄): `<!--/user_id/-->` 가상태그 + 인증 상태별 분기 UI + 탭 4개
- `css.css` (1,677줄): `.partner-dashboard` 완전 스코핑, 반응형 4단계, prefers-reduced-motion
- `js.js` (1,617줄): IIFE, var 전용, 파트너 인증 → 탭별 데이터 로드, 토스트/모달/스켈레톤

### 코드 리뷰 수정 (Critical 8건)
- C-01: openReplyModal querySelector injection 방지 (루프 탐색으로 변경)
- C-02: data.data 배열 가정 → data.data.bookings 객체 구조로 수정
- C-03: 예약 필드명 정합성 (booking_date, student_name_masked, order_amount)
- C-04: 후기 필드명 정합성 (partner_answer, reviewer_name_masked)
- C-05: 별점 분포 필드명 (summary.rating_distribution, 숫자 키)
- C-06: GAS doPost text/plain body 파싱 추가
- C-07: getPartnerAuth pending/inactive 시 status 필드 반환 (errorResult 대신)
- C-08: formatPrice NaN 가드 추가
