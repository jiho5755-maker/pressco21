# Phase 2 파트너 클래스 플랫폼 통합 테스트 체크리스트

작성일: 2026-02-21
버전: Phase 2 최종 통합 테스트 (Task 241)
작성자: QA/테스트 전문가 에이전트

---

## 개요

### 테스트 범위

Phase 2 파트너 클래스 플랫폼 전체를 배포 전 최종 검증한다.

| 테스트 대상 | 파일 경로 | 관련 Task |
|------------|----------|----------|
| GAS 백엔드 | `파트너클래스/class-platform-gas.gs` (5,271줄) | Task 201~231 |
| 클래스 목록 페이지 | `파트너클래스/목록/Index.html`, `css.css`, `js.js` | Task 211 |
| 클래스 상세 페이지 | `파트너클래스/상세/Index.html`, `css.css`, `js.js` | Task 212 |
| 파트너 대시보드 | `파트너클래스/파트너/Index.html`, `css.css`, `js.js` | Task 222 |
| 메인 클래스 진입점 | `메인페이지/js.js`, `css.css` (Task 232 부분) | Task 232 |

### 테스트 환경

| 항목 | 내용 |
|-----|-----|
| 대상 사이트 | https://foreverlove.co.kr |
| 테스트 계정 (파트너) | 실제 파트너 계정 (별도 관리자 확인) |
| 테스트 계정 (일반) | 일반 회원 계정 |
| GAS 편집기 | Google Apps Script 에디터 (실행 로그 확인) |
| Google Sheets | 파트너클래스 스프레드시트 (직접 확인) |
| 테스트 도구 | Playwright MCP (브라우저 자동화), 수동 테스트 병행 |

### 합격 기준

- Critical 항목: 0건 실패 (배포 불가 조건)
- Major 항목: 0건 실패 (권장)
- Minor 항목: 2건 이하 허용
- 성능: Lighthouse Performance 80+, Accessibility 85+
- 보안: 인증 우회, XSS, Injection 0건

---

## 1. 배포 전 환경 설정 체크리스트

> 이 섹션은 배포 전 관리자가 직접 확인해야 하는 설정 항목이다.
> 모든 항목이 통과되어야 이후 기능 테스트를 시작할 수 있다.

### 1-1. GAS 스크립트 속성 설정 (PropertiesService)

- [ ] 🔧 [Critical] `SHOPKEY` -- 메이크샵 API 상점키 입력 확인
- [ ] 🔧 [Critical] `LICENSEKEY` -- 메이크샵 API 라이센스키 입력 확인
- [ ] 🔧 [Critical] `SPREADSHEET_ID` -- Google Sheets 스프레드시트 ID 입력 확인
- [ ] 🔧 [Critical] `ADMIN_API_TOKEN` -- 관리자 전용 API 토큰 (pollOrders, partnerApprove, clearCache 보호용) 설정 확인. 빈 값이면 관리자 API 비활성화됨
- [ ] 🔧 [Critical] `ADMIN_EMAIL` -- 관리자 알림 이메일 입력 확인
- [ ] 🔧 [Critical] `GAS_ENDPOINT` -- 이 웹 앱의 배포 URL 자기 자신 등록 확인 (이메일 내 링크 생성에 사용)
- [ ] 🔧 [Critical] `SHOP_DOMAIN` -- 'foreverlove.co.kr' 입력 확인

### 1-2. GAS 웹 앱 배포 설정

- [ ] 🔧 [Critical] GAS 웹 앱 배포 -- 실행 권한: "모든 사용자" (Anyone)로 설정
- [ ] 🔧 [Critical] GAS 웹 앱 배포 -- 버전: "새 배포" 또는 최신 배포 사용
- [ ] 🔧 [Critical] 배포 URL 복사 후 각 JS 파일의 `GAS_URL` 변수 교체:
  - `파트너클래스/목록/js.js` 13번째 줄 `YOUR_SCRIPT_ID` 교체
  - `파트너클래스/상세/js.js` 14번째 줄 `YOUR_SCRIPT_ID` 교체
  - `파트너클래스/파트너/js.js` -- `window.PRESSCO21_GAS_URL` 전역 변수로 설정 (메이크샵 전역 JS에 추가)
  - `메인페이지/js.js` -- `window.PRESSCO21_GAS_URL` 전역 변수로 설정

### 1-3. Google Sheets 구조 확인

- [ ] 🔧 [Critical] "파트너 상세" 시트 존재 및 헤더 행 정상 확인
- [ ] 🔧 [Critical] "클래스 메타" 시트 존재 및 헤더 행 정상 확인 (`schedules`, `materials_price` 컬럼 포함 여부)
- [ ] 🔧 [Critical] "정산 내역" 시트 존재 및 헤더 행 정상 확인 (U=student_name, V=student_email, W=student_phone 컬럼 포함)
- [ ] 🔧 [Critical] "파트너 신청" 시트 존재 및 헤더 행 정상 확인
- [ ] 🔧 [Critical] "후기" 시트 존재 및 헤더 행 정상 확인
- [ ] 🔧 [Major] "주문 처리 로그" 시트 존재 확인
- [ ] 🔧 [Major] "이메일 발송 로그" 시트 존재 확인
- [ ] 🔧 [Major] "시스템 설정" 시트 존재 확인

### 1-4. GAS 시간 트리거 설정

- [ ] 🔧 [Critical] `pollOrders` 트리거: 10분 간격 시간 트리거 설정 확인
- [ ] 🔧 [Critical] `sendReminderEmails` 트리거: 매일 오전 9시 트리거 설정 확인
- [ ] 🔧 [Critical] `sendReviewRequests` 트리거: 매일 실행 트리거 설정 확인
- [ ] 🔧 [Major] `triggerUpdatePartnerGrades` 트리거: 월 1회 트리거 설정 확인

### 1-5. GAS 헬스 체크

- [ ] 🤖 [Critical] GAS URL에 `?action=health` 파라미터로 GET 요청 전송
  - 합격 기준: `{ "success": true, "status": "ok", "timestamp": "..." }` 응답
  - 테스트 방법: 브라우저 주소창에 `{GAS_URL}?action=health` 입력 후 응답 확인

---

## 2. 고객 플로우 E2E 테스트

### 2-1. 메인페이지 클래스 진입점 (Task 232)

**전제 조건**: Google Sheets "클래스 메타" 시트에 `status=active` 클래스 최소 4개 존재

- [ ] 🤖 [Critical] 메인페이지 접속 후 인기 클래스 섹션 로드 확인
  - 합격 기준: 클래스 카드 4개 정상 표시 (이미지, 클래스명, 파트너명, 가격, 별점)
  - 테스트 방법: Playwright `browser_navigate` -> `browser_snapshot` -> 카드 4개 존재 확인

- [ ] 🤖 [Critical] 클래스 카드의 링크가 `/shop/page.html?id=class-detail&class_id={id}` 형식으로 생성되는지 확인
  - 합격 기준: `class_id` 파라미터에 영숫자, 하이픈, 언더스코어만 포함 (sanitizeClassId 적용 확인)

- [ ] 🤖 [Major] GAS URL 미설정 시 섹션 조용히 숨김 확인
  - 테스트 방법: `window.PRESSCO21_GAS_URL = ''` 설정 후 페이지 로드
  - 합격 기준: 클래스 섹션 DOM에서 사라짐 (에러 표시 없음)

- [ ] 🤖 [Major] localStorage 30분 캐시 동작 확인
  - 테스트 방법: 첫 로드 후 Network 탭에서 GAS API 호출 확인 -> 새로고침 후 캐시 사용으로 API 미호출 확인

- [ ] 🤖 [Major] "전체 클래스 보기" 버튼 클릭 -> 클래스 목록 페이지 이동 확인

- [ ] 🔧 [Minor] 클래스 이미지 없을 때 SVG 플레이스홀더 표시 확인

- [ ] 🔧 [Minor] formatPrice(NaN) -> "0" 표시 확인 (NaN 가드 적용 여부)

### 2-2. 클래스 목록 페이지 (Task 211)

**URL**: 메이크샵 클래스 목록 페이지 (관리자가 설정한 개별 페이지 URL)

**기본 로드**

- [ ] 🤖 [Critical] 페이지 접속 시 스켈레톤 UI 표시 후 클래스 목록 로드 확인
  - 합격 기준: 6개 스켈레톤 카드 표시 -> 실제 클래스 카드로 교체
  - 테스트 방법: Playwright `browser_navigate` -> `browser_snapshot` -> `browser_wait_for` (클래스 카드)

- [ ] 🤖 [Critical] 클래스 카드 렌더링 확인: 이미지, 카테고리 뱃지, 클래스명, 파트너명, 등급 뱃지, 가격, 별점, 수강생 수, 잔여석 표시

- [ ] 🤖 [Critical] "클래스 없음" 상태 표시 확인 (모든 필터 적용 후 결과 없을 때)

- [ ] 🤖 [Critical] "로드 실패" 상태 표시 확인 (GAS API 오류 시 에러 UI)

**필터 기능**

- [ ] 🤖 [Critical] 카테고리 필터 체크박스 선택 -> 해당 카테고리 클래스만 표시
- [ ] 🤖 [Critical] 난이도(level) 필터 적용 -> 결과 필터링 확인
- [ ] 🤖 [Critical] 수업 형태(type) 필터 적용 -> 결과 필터링 확인
- [ ] 🤖 [Major] 지역(region) 필터 적용 -> 결과 필터링 확인
- [ ] 🤖 [Major] 가격 슬라이더 조작 -> maxPrice 파라미터 반영 확인
- [ ] 🤖 [Major] 복수 필터 동시 적용 -> AND 조건으로 필터링 확인
- [ ] 🤖 [Major] 필터 초기화 버튼 -> 전체 필터 해제 후 전체 목록 재로드

**검색 및 정렬**

- [ ] 🤖 [Major] 정렬 변경 (최신순/인기순/가격순) -> 300ms 디바운스 후 API 재호출 확인
- [ ] 🤖 [Major] URL 파라미터 딥링크: `?category=압화&level=입문` URL 접속 시 필터 자동 복원

**모바일 필터 드로어**

- [ ] 🤖 [Major] 768px 미만 해상도에서 필터 버튼 클릭 -> 드로어 열림
- [ ] 🤖 [Major] 드로어 오버레이 클릭 -> 드로어 닫힘
- [ ] 🤖 [Major] "적용" 버튼 클릭 -> 드로어 닫힘 + 필터 적용

**페이지네이션**

- [ ] 🤖 [Major] 페이지당 20개 클래스 표시 확인
- [ ] 🤖 [Major] 다음 페이지 이동 -> 새 클래스 목록 로드

**localStorage 캐시**

- [ ] 🤖 [Major] 동일 필터로 재요청 시 localStorage 캐시(1시간) 사용 확인 (GAS API 미호출)
- [ ] 🤖 [Minor] 캐시 만료(1시간 후) 시 자동 갱신 확인

**CSS 스코핑**

- [ ] 🤖 [Major] `.class-catalog` 컨테이너 외부 스타일에 영향 없음 확인
  - 테스트 방법: `browser_console_messages`로 CSS 관련 에러 없음 확인

**[회귀 테스트] Task 211 Critical Issues**

- [ ] 🔧 [Critical] C-01 회귀: SVG `linearGradient id="ccHalfStarGrad"` 중복 없음 확인
  - 테스트 방법: 여러 클래스 카드가 로드된 상태에서 `document.querySelectorAll('#ccHalfStarGrad')` 실행 -> 1개만 존재

- [ ] 🔧 [Critical] C-02 회귀: 필터 칩 삭제 시 querySelector injection 방지 확인
  - 테스트 방법: 필터값에 `"` 또는 `'` 포함된 카테고리명으로 필터 칩 생성 후 삭제 -> 에러 없이 정상 동작

### 2-3. 클래스 상세 페이지 (Task 212)

**URL**: `{메이크샵_상세_URL}?id={class_id}`

**기본 로드**

- [ ] 🤖 [Critical] URL에 `?id=` 파라미터 없을 때 목록 페이지로 리다이렉트 확인
- [ ] 🤖 [Critical] 유효한 `class_id`로 접속 시 클래스 상세 정보 로드 확인
  - 합격 기준: 클래스명, 파트너 정보, 설명, 가격, 장소, 카테고리, 난이도 표시

**이미지 갤러리**

- [ ] 🤖 [Critical] Swiper 메인 갤러리 초기화 및 이미지 슬라이드 동작 확인
- [ ] 🤖 [Major] 썸네일 클릭 -> 메인 갤러리 해당 이미지로 전환 확인
- [ ] 🤖 [Major] 이전/다음 내비게이션 버튼 동작 확인

**일정 선택 (flatpickr)**

- [ ] 🤖 [Critical] flatpickr 달력 정상 초기화 확인
- [ ] 🤖 [Critical] GAS `schedules` 필드 기반으로 예약 가능 날짜만 선택 가능 확인 (나머지 날짜 비활성)
- [ ] 🤖 [Critical] 날짜 선택 후 가격 및 "예약하기" 버튼 활성화 확인
- [ ] 🤖 [Major] 인원 수 + 버튼 클릭 -> max_students 범위 내에서 증가
- [ ] 🤖 [Major] 인원 수 - 버튼 클릭 -> MIN_QUANTITY(1명) 이하로 감소하지 않음

**결제 연동**

- [ ] 🔧 [Critical] "예약하기" 버튼 클릭 -> `/goods/goods_view.php?goodsNo={makeshop_product_id}` 페이지 이동 확인
  - 합격 기준: GAS `makeshop_product_id` 필드가 실제 메이크샵 상품 번호와 일치
  - 주의: 실제 결제는 진행하지 않음. 결제 페이지 이동까지만 확인.

**콘텐츠 섹션**

- [ ] 🤖 [Major] 탭 (소개/커리큘럼/후기/위치) 전환 동작 확인
- [ ] 🤖 [Major] 커리큘럼 아코디언 열기/닫기 동작 확인
- [ ] 🤖 [Major] Sticky 예약 패널 스크롤 시 상단 고정 확인 (Desktop)
- [ ] 🤖 [Major] 모바일 하단 바 "예약하기" 버튼 표시 확인 (768px 미만)

**메타 태그 SEO**

- [ ] 🤖 [Minor] 클래스 데이터 로드 후 `<title>`, `<meta description>`, OG 태그 업데이트 확인
- [ ] 🤖 [Minor] Schema.org `Course` JSON-LD 스크립트 삽입 확인

**[회귀 테스트] Task 212 Critical Issues**

- [ ] 🔧 [Critical] C-01 회귀: flatpickr CSS `.flatpickr-*` 스타일이 `.class-detail` 스코핑 안에서만 적용되는지 확인
  - 테스트 방법: 다른 페이지 요소에 flatpickr CSS가 영향을 주지 않는지 확인

- [ ] 🔧 [Critical] C-02 회귀: Swiper SVG `id` 중복 없음 확인 (ccHalfStarGrad vs 상세 페이지 SVG id 충돌 없음)

- [ ] 🔧 [Critical] C-03 회귀: `sanitizeHtml()` 함수가 `ALLOWED_TAGS` 목록 외 태그를 제거하는지 확인
  - 테스트 방법: GAS "클래스 메타"에 `<script>alert(1)</script>` 포함된 description 설정 후 상세 페이지 로드 -> 스크립트 미실행 확인

**localStorage 캐시**

- [ ] 🤖 [Major] 동일 class_id 재방문 시 localStorage 캐시(5분) 사용 확인

### 2-4. 예약/결제 플로우

- [ ] 🔧 [Critical] 메이크샵 상품 페이지에서 수량 선택 -> 결제 완료 (테스트 계정으로 실제 결제 진행)
  - 주의: 테스트 결제는 관리자가 별도로 진행. 결제 완료 후 Google Sheets "정산 내역" 시트에 행 추가 여부 확인 (pollOrders 실행 후)

- [ ] 🔧 [Critical] 결제 완료 후 GAS `pollOrders` 수동 실행 -> "정산 내역" 시트에 주문 기록 확인
  - 합격 기준: order_id, class_id, partner_code, student_name, student_email, student_phone 컬럼 정상 기록

- [ ] 🔧 [Major] 정산 내역 시트의 status 컬럼이 `COMPLETED` 또는 `FAILED`로 업데이트 확인

### 2-5. 이메일 파이프라인 (예약확인/D-3/D-1/후기요청)

**전제 조건**: 실제 이메일 주소로 테스트 계정 생성 필요

- [ ] 🔧 [Critical] 예약 확인 이메일 발송 확인 (pollOrders 실행 후)
  - 합격 기준: 수강생에게 이메일 수신 (클래스명, 일정, 파트너명, 주문번호 포함)
  - XSS 방어 확인: 이메일 본문에 `escapeHtml_()` 처리된 값만 포함

- [ ] 🔧 [Critical] 파트너에게 신규 예약 알림 이메일 발송 확인 (수강생 정보 마스킹 포함)
  - 합격 기준: 수강생 이름 마스킹(예: 홍*동), 전화번호 뒷자리 마스킹

- [ ] 🔧 [Major] D-3 리마인더 이메일: `sendReminderEmails` 트리거 수동 실행 -> 3일 후 클래스 수강생에게 이메일 발송 확인

- [ ] 🔧 [Major] D-1 리마인더 이메일: 1일 전 수강생 이메일 발송 확인

- [ ] 🔧 [Major] 수강 후기 요청 이메일: `sendReviewRequests` 트리거 수동 실행 -> 수강 완료 +7일 후 이메일 발송 확인

- [ ] 🔧 [Major] 이메일 일일 한도(100건) 초과 시 경고 이메일 발송 확인
  - 확인 방법: GAS "이메일 발송 로그" 시트에서 발송 건수 확인

---

## 3. 파트너 플로우 E2E 테스트

### 3-1. 파트너 신청 플로우

- [ ] 🔧 [Critical] Google Forms 파트너 신청 양식 접근 가능 확인 (관리자 생성 필요)
- [ ] 🔧 [Critical] 신청 양식 제출 -> GAS `partnerApply` 호출 -> "파트너 신청" 시트에 행 추가 확인
  - 합격 기준: application_id, applicant_name, email, portfolio_url, instagram_url, 신청일시 기록
  - 보안 확인: portfolio_url, instagram_url에 `javascript:alert(1)` 입력 시 저장 거부 확인 (`sanitizeUrl_()` 적용)

- [ ] 🔧 [Critical] 파트너 신청 완료 후 신청자 이메일 수신 확인 (접수 확인 이메일)

- [ ] 🔧 [Major] 동일 이메일로 중복 신청 시 에러 응답 확인 (TOCTOU 방지: LockService 내부에서 중복 체크)

- [ ] 🔧 [Major] 필수 파라미터 누락 신청 -> `{ code: "MISSING_PARAMS" }` 에러 응답 확인

### 3-2. 교육 이수 플로우 (Task 231)

**전제 조건**: 관리자가 YouTube 교육 영상 및 퀴즈 URL 설정 완료 필요

- [ ] 🔧 [Critical] 파트너 승인 후 교육 아카데미 URL 이메일 수신 확인
- [ ] 🔧 [Critical] 3개 모듈 교육 영상 시청 -> 퀴즈 제출 (15문항 중 11개 이상 정답)
  - 합격 기준: GAS `educationComplete` API 호출 -> "파트너 상세" 시트 `education_completed=TRUE` 업데이트

- [ ] 🔧 [Critical] PASS_THRESHOLD=11 서버 고정 확인
  - 보안 확인: 클라이언트에서 score 파라미터를 15로 위조해서 전송해도 서버에서 실제 채점값 사용
  - 테스트 방법: GAS 실행 로그에서 서버 계산 점수 확인

- [ ] 🔧 [Critical] 합격 이메일 수신 확인 (파트너 코드 포함)
- [ ] 🔧 [Major] 불합격(10개 이하) 시 재응시 안내 이메일 수신 확인
- [ ] 🔧 [Major] 이미 이수한 파트너 재시도 -> 중복 처리 방지 확인 (멱등)
  - 확인 방법: 이수 후 재호출해도 `education_date` 변경 없음

### 3-3. 강의 등록 플로우 (Task 202)

- [ ] 🔧 [Critical] 메이크샵 관리자에서 클래스 상품 등록 (7단계 가이드 참조: `docs/phase2/class-product-registration.md`)
- [ ] 🔧 [Critical] Google Sheets "클래스 메타" 시트에 클래스 정보 행 추가 (schedules, materials_price 컬럼 포함)
- [ ] 🔧 [Major] 클래스 메타에 `status=active` 설정 후 클래스 목록 페이지에 노출 확인

### 3-4. 파트너 대시보드 (Task 222)

**URL**: 메이크샵 파트너 대시보드 페이지

**인증 흐름**

- [ ] 🤖 [Critical] 비로그인 상태 접속 -> 로그인 안내 메시지 표시 (`pdNoticeLogin` 영역)
  - 합격 기준: 대시보드 메인 영역(`pdMainArea`) 숨김, 로그인 안내만 표시

- [ ] 🤖 [Critical] 일반 회원(비파트너) 로그인 후 접속 -> 비파트너 안내 메시지 표시 (`pdNoticeNonPartner`)
  - 테스트 방법: 파트너가 아닌 일반 회원 계정으로 로그인 -> 대시보드 접속

- [ ] 🤖 [Critical] 심사중(pending) 파트너 로그인 후 접속 -> 심사중 안내 메시지 표시 (`pdNoticePending`)

- [ ] 🤖 [Critical] 비활성(inactive) 파트너 로그인 후 접속 -> 비활성 안내 메시지 표시 (`pdNoticeInactive`)

- [ ] 🤖 [Critical] 활성(active) 파트너 로그인 후 접속 -> 대시보드 메인 영역 표시
  - 합격 기준: 파트너명, 등급 배지(SILVER/GOLD/PLATINUM), 파트너 코드 표시

**[회귀 테스트] getPartnerAuth 상태 분기 (Task 222 Critical C-03)**

- [ ] 🔧 [Critical] pending 상태 파트너 API 응답 확인
  - 합격 기준: `{ success: true, data: { status: "pending" } }` (errorResult 아닌 successResult)
  - 테스트 방법: GAS 실행 -> `handleGetPartnerAuth({ member_id: "pending_member_id" })` -> 응답 구조 확인

- [ ] 🔧 [Critical] inactive 상태 파트너 API 응답 확인
  - 합격 기준: `{ success: true, data: { status: "inactive" } }` (errorResult 아닌 successResult)

**탭 1: 내 강의**

- [ ] 🤖 [Critical] "내 강의" 탭 클릭 -> 파트너의 클래스 목록 표시 (getPartnerDashboard 응답)
- [ ] 🤖 [Major] 클래스 상태 변경 (active/inactive) -> `updateClassStatus` API 호출 -> 변경 확인
- [ ] 🤖 [Minor] 강의 없음 상태 UI 표시 확인

**탭 2: 예약 현황**

- [ ] 🤖 [Critical] "예약 현황" 탭 클릭 -> 수강생 예약 목록 표시 (`getPartnerBookings` 응답)
- [ ] 🔧 [Critical] 수강생 개인정보 마스킹 확인
  - 합격 기준: 이름은 `홍*동` 형태, 전화번호는 `010-****-5678` 형태로 마스킹
  - 테스트 방법: GAS 응답 JSON에서 직접 확인 (개발자 도구 Network 탭)

- [ ] 🔧 [Major] 기간 필터(이번달/저번달/전체) 변경 -> 예약 목록 갱신

**탭 3: 수익 리포트**

- [ ] 🤖 [Critical] "수익 리포트" 탭 클릭 -> 월별 매출/수수료/적립금 표시
- [ ] 🤖 [Major] 월 선택 변경 -> 해당 월 리포트 갱신 (currentMonth 변경)
- [ ] 🔧 [Major] 수수료율 정확성 확인 (SILVER: 10%, GOLD: 12%, PLATINUM: 15%)

**탭 4: 후기 관리**

- [ ] 🤖 [Critical] "후기 관리" 탭 클릭 -> 내 클래스 후기 목록 표시 (`getPartnerReviews` 응답)
- [ ] 🤖 [Critical] "답변 작성" 버튼 클릭 -> 답변 모달 열림
- [ ] 🤖 [Critical] 답변 제출 -> `replyToReview` API 호출 -> 후기 시트에 답변 저장 확인

**[회귀 테스트] Task 222 Critical Issues**

- [ ] 🔧 [Critical] C-01 회귀: `openReplyModal` 함수 querySelector injection 방지 확인
  - 테스트 방법: reviewId에 `"` 또는 특수문자 포함된 값으로 답변 시도 -> 에러 없이 안전 처리
  - 확인 포인트: 루프(`querySelectorAll` + `dataset` 비교)로 DOM 탐색하는지 소스 확인

- [ ] 🔧 [Critical] C-04 회귀: text/plain POST 요청 파싱 확인
  - 테스트 방법: 개발자 도구 Network 탭에서 POST 요청의 Content-Type 확인
  - 합격 기준: `text/plain` 또는 `application/json`으로 전송, GAS에서 정상 파싱

- [ ] 🔧 [Critical] C-05 회귀: formatPrice NaN 가드 확인
  - 테스트 방법: 클래스 가격 데이터가 undefined/null인 상태에서 수익 리포트 탭 로드 -> "0원" 또는 "0" 표시 (NaN 미표시)

### 3-5. 정산 및 적립금 플로우

- [ ] 🔧 [Critical] 결제 완료 주문 -> `pollOrders` 실행 -> 정산 내역 시트에 status=`COMPLETED` 기록 확인
- [ ] 🔧 [Critical] 메이크샵 `process_reserve` API 적립금 지급 확인
  - 테스트 방법: 정산 후 파트너 메이크샵 계정 적립금 잔액 확인
  - 합격 기준: SILVER 기준 (결제금액 - 수수료 10%) x 100% 적립금 지급

- [ ] 🔧 [Major] FAILED 정산 재시도: GAS 편집기에서 `retryFailedSettlements()` 수동 실행 -> FAILED 항목 재처리 확인
  - 합격 기준: retry_count가 5 미만인 FAILED 건에 대해 재시도, 성공 시 COMPLETED로 변경

- [ ] 🔧 [Major] LockService 동시성 테스트: 동시에 2개 주문 정산 트리거 -> 데이터 무결성 확인
  - 합격 기준: 두 주문 모두 정산 완료, 시트 데이터 중복/오염 없음

---

## 4. 보안 테스트

### 4-1. 인증/인가 검증

- [ ] 🔧 [Critical] 비로그인 상태에서 파트너 대시보드 직접 URL 접근 -> 로그인 안내 표시 (대시보드 데이터 미노출)

- [ ] 🔧 [Critical] 일반 회원 member_id로 `getPartnerDashboard` API 직접 호출
  - 테스트 방법: `{GAS_URL}?action=getPartnerDashboard&member_id=일반회원ID`
  - 합격 기준: `{ code: "NOT_PARTNER" }` 에러 응답

- [ ] 🔧 [Critical] 다른 파트너 ID로 `getPartnerBookings` 호출
  - 테스트 방법: 파트너A로 로그인 후, 파트너B의 partner_code를 파라미터에 포함해서 요청
  - 합격 기준: 파트너B 데이터 미노출 (본인 데이터만 반환)

- [ ] 🔧 [Critical] 다른 파트너 소유 후기에 답변 시도 (`replyToReview`)
  - 합격 기준: `{ code: "REVIEW_NOT_OWNED" }` 에러 응답

- [ ] 🔧 [Critical] GAS URL 없이 `pollOrders` 직접 POST 호출 (토큰 없이)
  - 합격 기준: `{ code: "REFERER_MISMATCH" }` 에러 응답

- [ ] 🔧 [Critical] 위조 ADMIN_API_TOKEN으로 `partnerApprove` 호출
  - 테스트 방법: 임의 문자열 token 파라미터로 POST 요청
  - 합격 기준: `{ code: "REFERER_MISMATCH", message: "관리자 전용 요청입니다." }` 에러 응답

### 4-2. XSS 방어 검증

- [ ] 🔧 [Critical] 클래스 상세 페이지: GAS에서 반환된 클래스 설명에 `<script>alert('xss')</script>` 포함 시 미실행 확인
  - 테스트 방법: "클래스 메타" 시트 description에 스크립트 태그 임시 삽입 -> 상세 페이지 로드 -> 알럿 미팝업 확인
  - 합격 기준: `sanitizeHtml()` (ALLOWED_TAGS 기반 필터링)로 script 태그 제거

- [ ] 🔧 [Critical] 파트너 신청: portfolio_url에 `javascript:alert(1)` 입력 -> 저장 거부 확인
  - 합격 기준: GAS `sanitizeUrl_()` 함수가 http/https 이외의 프로토콜 차단

- [ ] 🔧 [Critical] 후기 답변: 파트너가 `<img src=x onerror=alert(1)>` 입력 -> 저장 거부 확인
  - 합격 기준: `sanitizeText_()` + `escapeHtml_()` 적용으로 HTML 태그 무력화

- [ ] 🔧 [Critical] 이메일 본문 XSS: 수강생 이름에 `<script>` 삽입 후 예약 확인 이메일 수신 -> 스크립트 미실행 확인
  - 합격 기준: GAS `escapeHtml_()` 함수로 모든 동적값 이스케이프

- [ ] 🔧 [Major] 파트너 대시보드 파트너명 표시: `<b>악성코드</b>` 형태 partner_name -> 텍스트로만 표시 확인
  - 합격 기준: `escapeText()` 함수 적용 (`.textContent = ...` 패턴 사용)

### 4-3. Injection 방어 검증

- [ ] 🔧 [Critical] 클래스 목록 URL: `?id=../../etc/passwd` 형태 class_id -> 빈 문자열 처리 확인
  - 합격 기준: `getClassIdFromURL()` 함수가 `[^a-zA-Z0-9\-_]` 패턴으로 특수문자 제거

- [ ] 🔧 [Critical] 메인 인기 클래스: GAS 응답의 `class_id`에 특수문자 포함 시 링크 URL injection 방지 확인
  - 합격 기준: `sanitizeClassId()` 함수가 영숫자, 하이픈, 언더스코어만 허용

- [ ] 🔧 [Critical] 필터 파라미터에 SQL 인젝션 패턴 입력: `' OR 1=1--`
  - 합격 기준: GAS에서 Sheets 쿼리 미사용 (직접 배열 루프 방식이므로 SQL Injection 해당 없음, 에러 없이 빈 결과 반환)

- [ ] 🔧 [Major] `replyToReview` 답변 내용에 1001자 이상 입력
  - 합격 기준: `sanitizeText_(answerRaw, 1000)` 함수로 1000자로 잘림

### 4-4. 관리자 API 보안

- [ ] 🔧 [Critical] `pollOrders` 수동 POST 호출 (토큰 없음) -> 거부 확인
- [ ] 🔧 [Critical] `clearCache` POST 호출 (잘못된 토큰) -> 거부 확인
- [ ] 🔧 [Critical] `partnerApprove` POST 호출 (토큰 없음) -> 거부 확인
- [ ] 🔧 [Major] 브라우저 개발자 도구 소스 코드에서 `ADMIN_API_TOKEN` 값 미노출 확인
  - 합격 기준: 토큰은 GAS 스크립트 속성(서버)에만 저장, 클라이언트 JS에 하드코딩 없음

- [ ] 🔧 [Major] 브라우저 개발자 도구 소스에서 메이크샵 `SHOPKEY`, `LICENSEKEY` 미노출 확인
  - 합격 기준: API 키는 GAS 스크립트 속성(서버)에만 저장

---

## 5. 성능 및 접근성 테스트

### 5-1. Lighthouse 측정

측정 방법: Chrome DevTools -> Lighthouse -> Mobile/Desktop 각각 측정

| 페이지 | Performance | Accessibility | Best Practices | SEO |
|--------|------------|---------------|----------------|-----|
| 메인페이지 | 80+ | 85+ | 90+ | 90+ |
| 클래스 목록 | 80+ | 85+ | 90+ | 85+ |
| 클래스 상세 | 80+ | 85+ | 90+ | 90+ |
| 파트너 대시보드 | 75+ | 85+ | 90+ | 70+ |

- [ ] 🤖 [Major] 메인페이지 Lighthouse 측정 -> 합격 기준 충족 확인
- [ ] 🤖 [Major] 클래스 목록 페이지 Lighthouse 측정 -> 합격 기준 충족 확인
- [ ] 🤖 [Major] 클래스 상세 페이지 Lighthouse 측정 -> 합격 기준 충족 확인
- [ ] 🤖 [Minor] 파트너 대시보드 Lighthouse 측정 -> 합격 기준 충족 확인

### 5-2. Core Web Vitals

- [ ] 🤖 [Major] LCP (Largest Contentful Paint) < 3.0s -- 클래스 목록 페이지
- [ ] 🤖 [Major] LCP < 3.0s -- 클래스 상세 페이지
- [ ] 🤖 [Major] CLS (Cumulative Layout Shift) < 0.1 -- 스켈레톤 -> 실제 콘텐츠 전환 시 레이아웃 변경 최소화
- [ ] 🤖 [Minor] INP (Interaction to Next Paint) < 200ms -- 필터 적용, 탭 전환

### 5-3. 반응형 테스트 (4단계 브레이크포인트)

**Playwright `browser_resize`를 사용하여 각 해상도에서 테스트**

**Mobile (375x812 - iPhone 14)**

- [ ] 🤖 [Critical] 클래스 목록: 1열 카드 레이아웃, 가로 스크롤 미발생
- [ ] 🤖 [Critical] 클래스 목록: 필터 드로어(하단 슬라이드 패널) 정상 동작
- [ ] 🤖 [Critical] 클래스 상세: 모바일 하단 예약 바 표시 및 터치 가능
- [ ] 🤖 [Critical] 파트너 대시보드: 탭 버튼 터치 타겟 44x44px 이상 확인
- [ ] 🤖 [Major] 모든 페이지 텍스트 16px 이상 (iOS 자동 확대 방지)

**Tablet (768x1024 - iPad)**

- [ ] 🤖 [Major] 클래스 목록: 2열 카드 레이아웃 확인
- [ ] 🤖 [Major] 클래스 상세: 사이드 예약 패널 표시 여부 확인 (768px 기준)
- [ ] 🤖 [Major] 파트너 대시보드: 수익 리포트 차트/테이블 레이아웃 확인

**Desktop (1440x900)**

- [ ] 🤖 [Major] 클래스 목록: 3~4열 카드 레이아웃 확인
- [ ] 🤖 [Major] 클래스 상세: Sticky 사이드 예약 패널 동작 확인
- [ ] 🤖 [Major] 파트너 대시보드: 전체 탭 및 테이블 정상 표시

**Wide (1920x1080)**

- [ ] 🤖 [Minor] 최대 콘텐츠 너비 제한 확인 (과도한 가로 확장 방지)
- [ ] 🤖 [Minor] 텍스트 가독성 확인 (과도하게 넓은 행 길이 방지)

### 5-4. 접근성 (ARIA, 키보드 내비게이션)

- [ ] 🤖 [Major] 클래스 카드 링크에 `aria-label` 속성 확인 (스크린 리더 지원)
- [ ] 🤖 [Major] 필터 체크박스에 `aria-label` 속성 확인
- [ ] 🤖 [Major] 탭 컴포넌트 `role="tablist"`, `role="tab"`, `aria-selected` 속성 확인
- [ ] 🤖 [Major] 파트너 대시보드 탭 전환을 키보드(Tab/Enter) 만으로 가능한지 확인
- [ ] 🤖 [Major] 모달 열림 시 포커스 모달 내부로 이동 확인
- [ ] 🔧 [Major] 모바일 필터 드로어 포커스 트랩 확인
  - 합격 기준: 드로어 열릴 때 첫 포커스 가능 요소로 이동, ESC 키로 닫기 지원, 닫힐 때 트리거 버튼으로 복귀
- [ ] 🤖 [Minor] 이미지에 `alt` 속성 확인 (클래스 이미지, 파트너 프로필)
- [ ] 🔧 [Minor] 색상 대비 비율 확인
  - 위험 항목: 헤더 브레드크럼 `rgba(255,255,255,0.65)` on 브라운 배경 -- 예상 대비비 ~3.5:1 (WCAG AA 4.5:1 미달 가능)
  - 위험 항목: 골드 `#b89b5e` on 흰색 배경 -- 예상 대비비 ~2.7:1 (소형 텍스트 WCAG AA 미달 가능)
  - 합격 기준: 본문 텍스트 4.5:1 이상, UI 컴포넌트 3:1 이상
- [ ] 🤖 [Minor] `prefers-reduced-motion` 미디어 쿼리 적용 확인 (과도한 애니메이션 억제)
- [ ] 🔧 [Minor] Swiper 네비게이션 버튼 접근성 확인
  - 합격 기준: `.swiper-button-prev/next`에 `role="button"` 또는 `tabindex="0"` 적용, 키보드 접근 가능

### 5-5. SEO 점검 (seo-performance-expert 분석 결과 기반)

> 정적 분석에서 발견된 개선 필요 항목들. 배포 전 우선순위(P1)는 즉시 수정 권장.

**P1 (즉시 수정 권장)**

- [ ] 🔧 [Major] `og:image` 태그 추가 -- 두 페이지 모두 누락
  - 목록 페이지: `<meta property="og:image" content="https://foreverlove.co.kr/대표이미지.jpg">`
  - 상세 페이지: JS `updateMetaTags()`에서 `thumbnail_url`로 동적 교체
  - 미적용 시: 카카오톡/슬랙 공유 시 미리보기 이미지 없음

- [ ] 🔧 [Major] `canonical` 태그 추가 -- 두 페이지 모두 누락
  - 목록 페이지: `<link rel="canonical" href="https://foreverlove.co.kr/파트너클래스/목록/">`
  - 상세 페이지: JS에서 class_id 기반 canonical URL 동적 삽입
  - 미적용 시: 필터/정렬 파라미터로 중복 URL 색인 위험

- [ ] 🔧 [Major] CDN preconnect 추가
  - `<link rel="preconnect" href="https://cdn.jsdelivr.net">` (Swiper, flatpickr 등)
  - `<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>`
  - 효과: DNS 선행 조회로 LCP 단축

- [ ] 🔧 [Major] 목록 페이지 첫 번째 카드 이미지 eager 로딩
  - `renderCards()` 함수에서 i===0 카드에만 `loading="eager" fetchpriority="high"` 적용
  - 현재 모든 카드에 `loading="lazy"` 적용 중 → LCP 감점 원인

**P2 (다음 스프린트 권장)**

- [ ] 🔧 [Minor] 상세 페이지 `og:type` 수정
  - 현재: `"website"` → 권장: `"product"` (카카오톡 상품 미리보기 카드 활성화)
  - `og:url` 태그도 함께 추가

- [ ] 🔧 [Minor] Schema.org `hasCourseInstance` 추가
  - 상세 페이지 Course Schema에 `schedules` 데이터 기반 수업 일정 추가
  - 효과: 구글 검색 "클래스 일정" 리치 스니펫 자격 획득

- [ ] 🔧 [Minor] `BreadcrumbList` Schema 추가
  - 홈 > 파트너 클래스 > 클래스명 경로를 JSON-LD로 추가

- [ ] 🔧 [Minor] Schema.org `aggregateRating.reviewCount` 정확화
  - 현재 `class_count`(수강횟수) 사용 → `review_count`(실제 후기 수)로 교체
  - GAS API에 `review_count` 필드 추가 필요

---

## 6. API 한도 및 에러 핸들링 테스트

### 6-1. 메이크샵 API 호출 예산

**제한**: 시간당 조회 500회 / 처리 500회

- [ ] 🔧 [Critical] GAS 실행 로그에서 1시간 내 메이크샵 API 호출 횟수 측정
  - 테스트 방법: `pollOrders` 10분 트리거로 1시간 실행 (6회) -> 각 실행 당 호출 건수 기록 -> 합계 확인
  - 합격 기준: 총 호출 500회 이내

- [ ] 🔧 [Major] 피크 시간대(주말 오후) 예상 주문 건수로 API 호출 예산 시뮬레이션
  - 계산식: (예상 주문 건수) x (pollOrders 1건당 API 호출수) x 6회 < 500회

- [ ] 🔧 [Major] `process_reserve` 적립금 API: 일괄 처리(datas 배열) 사용 확인
  - 합격 기준: 여러 건을 개별 호출이 아닌 배치로 처리

### 6-2. GAS 이메일 한도

**제한**: Gmail 무료 일일 100건

- [ ] 🔧 [Major] GAS "이메일 발송 로그" 시트에서 일일 발송 건수 추적 확인
- [ ] 🔧 [Major] 70건 초과 시 관리자에게 경고 이메일 발송 확인 (EMAIL_WARNING_THRESHOLD=70)
- [ ] 🔧 [Major] 100건 초과 시 추가 이메일 발송 차단 확인 (EMAIL_DAILY_LIMIT=100)

### 6-3. 에러 핸들링 시나리오

- [ ] 🤖 [Critical] GAS URL 미설정 시나리오 (클래스 목록 페이지)
  - 합격 기준: 에러 UI 표시 (사용자에게 "로드 실패" 메시지), 콘솔 에러는 로그되되 사용자에게는 친절한 메시지

- [ ] 🤖 [Critical] GAS API 500 에러 시나리오
  - 합격 기준: 에러 UI 표시 + "재시도" 버튼 제공

- [ ] 🤖 [Major] GAS API 타임아웃 시나리오
  - 합격 기준: localStorage 캐시 폴백 (목록 1시간, 상세 5분, 메인 30분) 또는 에러 UI

- [ ] 🤖 [Major] 클래스 데이터 없음 시나리오 (빈 상태)
  - 합격 기준: "클래스가 없습니다" 빈 상태 UI 표시

- [ ] 🔧 [Major] GAS LockService 타임아웃 시나리오 (동시 요청 폭주)
  - 합격 기준: `{ code: "LOCK_TIMEOUT", message: "동시 요청이 많아 처리할 수 없습니다. 잠시 후 다시 시도해 주세요." }` 에러 응답

- [ ] 🔧 [Major] 알 수 없는 action 파라미터 전송
  - 테스트 방법: `{GAS_URL}?action=nonexistent`
  - 합격 기준: `{ code: "INVALID_ACTION" }` 에러 응답 (500 에러 아님)

- [ ] 🔧 [Minor] GAS 내부 예외 발생 시 `INTERNAL_ERROR` 코드 반환 확인 (스택 트레이스 미노출)

---

## 7. 최종 배포 전 점검 체크리스트

> 이 섹션은 배포 직전 한 번에 확인하는 최종 점검 목록이다.
> 모든 Critical 항목이 PASS여야 배포를 진행할 수 있다.

### 7-1. 기능 점검

- [ ] 🔧 [Critical] 모든 GAS 엔드포인트 `health` 체크 통과
- [ ] 🔧 [Critical] 고객 플로우 E2E (메인 -> 목록 -> 상세 -> 결제 페이지 이동) 통과
- [ ] 🔧 [Critical] 파트너 플로우 E2E (신청 -> 교육 -> 대시보드) 통과
- [ ] 🔧 [Critical] 예약 확인 이메일 발송 정상 확인
- [ ] 🔧 [Critical] 정산 파이프라인 정상 동작 확인

### 7-2. 기술 점검

- [ ] 🔧 [Critical] 모든 JS 파일에서 `${variable}` 미이스케이프 없음 확인 (메이크샵 엔진 오류 방지)
  - 확인 방법: 각 js.js 파일에서 백슬래시 없는 `${` 패턴 검색
  - 해당 파일: `파트너클래스/목록/js.js`, `파트너클래스/상세/js.js`, `파트너클래스/파트너/js.js`, `메인페이지/js.js`

- [ ] 🔧 [Critical] HTML 파일에서 메이크샵 가상태그 (`<!--/태그명/-->`) 손상 없음 확인

- [ ] 🔧 [Critical] 각 페이지 콘솔 에러 0개 확인 (Playwright `browser_console_messages` 사용)

- [ ] 🔧 [Critical] CSS 스코핑 확인: `.class-catalog`, `.class-detail`, `.partner-dashboard` 컨테이너 외부 스타일 미영향

- [ ] 🔧 [Critical] IIFE 패턴 확인: 모든 JS 파일이 `(function() { 'use strict'; ... })();` 패턴으로 감싸져 있음

- [ ] 🔧 [Critical] `var` 사용 확인: `let`, `const` 미사용 (메이크샵 D4 호환성)

### 7-3. 보안 점검

- [ ] 🔧 [Critical] 브라우저 소스에서 API 키 미노출 (SHOPKEY, LICENSEKEY, ADMIN_API_TOKEN)
- [ ] 🔧 [Critical] 인증 우회 불가 확인 (비로그인/비파트너 접근 차단)
- [ ] 🔧 [Critical] XSS 입력값 방어 확인 (sanitizeHtml, escapeHtml_, sanitizeUrl_)
- [ ] 🔧 [Critical] 관리자 API ADMIN_API_TOKEN 보호 확인

### 7-4. 운영 점검

- [ ] 🔧 [Critical] GAS 시간 트리거 설정 확인 (pollOrders 10분, 이메일 트리거 매일)
- [ ] 🔧 [Critical] GAS 실행 로그 오류 없음 확인 (Apps Script 에디터 -> 실행 탭)
- [ ] 🔧 [Major] 메이크샵 API 호출 예산 이내 확인 (500회/시간 이내)
- [ ] 🔧 [Major] 이메일 한도 모니터링 설정 확인 (70건 경고, 100건 차단)
- [ ] 🔧 [Minor] FAILED 정산 건 존재 시 `retryFailedSettlements()` 수동 실행

### 7-5. Critical Issues 회귀 점검 요약

**Phase 2 전체 Critical Issues 19건 회귀 테스트 현황**

| 이슈 ID | 출처 | 내용 | 회귀 테스트 결과 |
|--------|------|------|----------------|
| Task211-C-01 | 클래스 목록 | SVG linearGradient id 중복 | `[ ]` |
| Task211-C-02 | 클래스 목록 | 필터 칩 querySelector injection | `[ ]` |
| Task212-C-01 | 클래스 상세 | flatpickr CSS 스코핑 | `[ ]` |
| Task212-C-02 | 클래스 상세 | SVG id 중복 | `[ ]` |
| Task212-C-03 | 클래스 상세 | sanitizeHtml 강화 | `[ ]` |
| Task221-C-01 | GAS 정산 | sanitizeUrl XSS 방지 | `[ ]` |
| Task221-C-02 | GAS 정산 | TOCTOU 방지 (중복 신청 Lock 내부 체크) | `[ ]` |
| Task222-C-01 | 파트너 대시보드 | openReplyModal querySelector injection | `[ ]` |
| Task222-C-02 | 파트너 대시보드 | 필드명 정합성 (partner_code, class_id) | `[ ]` |
| Task222-C-03 | 파트너 대시보드 | getPartnerAuth 상태분기 (pending/inactive) | `[ ]` |
| Task222-C-04 | 파트너 대시보드 | text/plain POST 파싱 | `[ ]` |
| Task222-C-05 | 파트너 대시보드 | formatPrice NaN 가드 | `[ ]` |
| Task222-C-06 | 파트너 대시보드 | GAS 응답 필드 정합성 | `[ ]` |
| Task222-C-07 | 파트너 대시보드 | 후기 답변 파트너 소유권 검증 | `[ ]` |
| Task222-C-08 | 파트너 대시보드 | 탭 접근성 (ARIA 속성) | `[ ]` |
| Task231-C-01 | 교육 아카데미 | PASS_THRESHOLD 서버 고정 | `[ ]` |
| Task231-C-02 | 교육 아카데미 | 교육 이수 TOCTOU 방지 | `[ ]` |
| Task232-C-01 | 메인 클래스 섹션 | sanitizeClassId URL injection 방지 | `[ ]` |
| Task232-C-02 | 메인 클래스 섹션 | SVG id 중복 (mceHalfStarGrad) | `[ ]` |

---

## 테스트 결과 기록

### 테스트 실행 정보

| 항목 | 내용 |
|-----|-----|
| 테스트 날짜 | |
| 테스트 담당자 | |
| 테스트 환경 URL | |
| GAS 배포 버전 | |

### 결과 요약

| 분류 | 총 항목 | PASS | FAIL | SKIP |
|-----|--------|------|------|------|
| 배포 전 환경 설정 | | | | |
| 고객 플로우 E2E | | | | |
| 파트너 플로우 E2E | | | | |
| 보안 테스트 | | | | |
| 성능/접근성 | | | | |
| API 한도/에러 핸들링 | | | | |
| **전체** | | | | |

### 실패 항목 목록

| 항목 | 심각도 | 실패 내용 | 재현 방법 | 담당자 |
|-----|--------|----------|----------|--------|
| | | | | |

### 블로커 (배포 차단 항목)

없음 / 있음: (내용 기재)

### 배포 승인

- [ ] Critical 항목 모두 PASS
- [ ] 블로커 없음
- [ ] 관리자 최종 확인

---

*이 체크리스트는 Task 241 기준으로 작성되었으며, Phase 3 작업 후 `phase3-integration-test.md`로 이어집니다.*
