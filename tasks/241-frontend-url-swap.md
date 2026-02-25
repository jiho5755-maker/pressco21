# Task 241: 프론트엔드 URL 교체 + 메이크샵 3페이지 등록 가이드

## 완료 일자
2026-02-25

## 작업 요약
GAS(Google Apps Script) URL을 n8n 웹훅 URL로 교체하고, Content-Type을 n8n 호환 형식으로 변경.
메이크샵 D4 편집기에 3개 페이지 JS/CSS 등록 가이드 작성.

---

## 변경된 파일

### 1. `파트너클래스/목록/js.js` (L13)
```javascript
// Before
var GAS_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

// After
var GAS_URL = 'https://n8n.pressco21.com/webhook/class-api';
```
- 연결 워크플로우: **WF-01 클래스 API** (class-api 웹훅)

### 2. `파트너클래스/상세/js.js` (L14)
```javascript
// Before
var GAS_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

// After
var GAS_URL = 'https://n8n.pressco21.com/webhook/class-api';
```
- 연결 워크플로우: **WF-01 클래스 API** (getClassDetail, getCategories)

### 3. `파트너클래스/파트너/js.js` (L14, L1430)
```javascript
// L14 Before
var GAS_URL = window.PRESSCO21_GAS_URL || '';

// L14 After
var GAS_URL = window.PRESSCO21_GAS_URL || 'https://n8n.pressco21.com/webhook/partner-auth';

// L1430 Before
headers: { 'Content-Type': 'text/plain' },

// L1430 After
headers: { 'Content-Type': 'application/json' },
```
- 연결 워크플로우: **WF-02 파트너 인증 API** (getPartnerAuth, getPartnerDashboard 등)
- **Content-Type 변경 이유**: GAS CORS 우회용 text/plain 방식에서 n8n 표준 application/json으로 전환

---

## n8n 웹훅 URL 매핑 테이블

| 페이지 | 웹훅 경로 | 연결 워크플로우 | action 파라미터 |
|------|----------|--------------|----------------|
| 클래스 목록 | `/webhook/class-api` | WF-01 | getClasses, getCategories |
| 클래스 상세 | `/webhook/class-api` | WF-01 | getClassDetail |
| 파트너 대시보드 | `/webhook/partner-auth` | WF-02/03 | getPartnerAuth, getPartnerDashboard, getEducationStatus, getPartnerBookings, getPartnerReviews |

> ⚠️ **주의**: WF-04(예약 등록), WF-07(파트너 신청), WF-08(파트너 승인), WF-10(교육 이수)은 별도 웹훅 경로 사용.
> 현재 파트너 JS에는 WF-04 호출이 포함되어 있으며, URL이 GAS_URL과 동일하게 처리됨.
> 실제 배포 시 WF-04 Webhook URL(`/webhook/record-booking`)을 별도 상수로 분리 권장.

---

## 메이크샵 D4 3페이지 등록 가이드

### 사전 준비
1. n8n 워크플로우 임포트 완료 확인 (WF-01~WF-13 전체)
2. NocoDB 테이블 8개 생성 완료 확인
3. n8n Credentials 6개 등록 완료 확인

### 페이지 1: 클래스 목록 페이지

**메이크샵 관리자 → 디자인 편집 → 개별 페이지**

1. [페이지 추가] 클릭 → 빈 페이지 생성
2. 페이지 이름: `파트너클래스-목록`
3. URL 설정: `/goods/catalog.html?category=파트너클래스` (또는 별도 개별 URL 지정)
4. HTML 편집기에서 `파트너클래스/목록/index.html` 내용 붙여넣기
5. CSS 편집기에서 `파트너클래스/목록/style.css` 내용 붙여넣기
6. JS 편집기에서 `파트너클래스/목록/js.js` 내용 붙여넣기
7. [저장] → 미리보기 확인

### 페이지 2: 클래스 상세 페이지

1. 새 개별 페이지 생성
2. 페이지 이름: `파트너클래스-상세`
3. `파트너클래스/상세/` 디렉토리의 index.html, style.css, js.js 동일하게 등록
4. ⚠️ URL 쿼리스트링으로 `class_id` 파라미터 전달 필요: `?class_id=XXX`

### 페이지 3: 파트너 대시보드 페이지

1. 새 개별 페이지 생성
2. 페이지 이름: `파트너-대시보드`
3. `파트너클래스/파트너/` 디렉토리의 파일들 동일하게 등록
4. ⚠️ **로그인 전용 페이지**: 메이크샵 비로그인 리디렉션 설정 필요
   - 메이크샵 관리자 → 회원관리 → 비로그인 접근제한에서 해당 페이지 등록
5. `<!--/user_id/-->` 가상태그가 페이지 HTML에 포함되어야 JS에서 회원 ID 인식 가능

### 메이크샵 편집기 저장 시 주의사항

| 주의사항 | 상세 설명 |
|---------|---------|
| `${}` 이스케이프 | 템플릿 리터럴 `${var}` → `\${var}` (이미 적용됨) |
| `let/const` 금지 | 모든 변수는 `var` 사용 (이미 적용됨) |
| 유니코드 특수문자 | CSS `content` 속성의 이모지/특수문자 → CSS 이스케이프로 변환 필요 |
| 가상태그 보존 | `<!--/if_login/-->` 등 수정/삭제 금지 |

---

## n8n Webhook 경로 전체 정리

| 워크플로우 | Webhook 경로 | HTTP 메서드 | 용도 |
|-----------|-------------|------------|------|
| WF-01 | `/webhook/class-api` | POST | 클래스 목록/상세/카테고리 조회 |
| WF-02 | `/webhook/partner-auth` | POST | 파트너 인증/대시보드/교육현황 |
| WF-03 | `/webhook/partner-data` | POST | 파트너 예약내역/후기 조회 |
| WF-04 | `/webhook/record-booking` | POST | 예약 등록 (메이크샵 Webhook) |
| WF-06 | `/webhook/class-management` | POST | 클래스 생성/수정/삭제/상태변경 |
| WF-07 | `/webhook/partner-apply` | POST | 파트너 신청 |
| WF-08 | `/webhook/partner-approve` | POST | 파트너 승인 (관리자 전용) |
| WF-09 | `/webhook/review-reply` | POST | 후기 답글 등록 |
| WF-10 | `/webhook/education-complete` | POST | 교육 이수 처리 |

> WF-05(주문폴링), WF-11~12(이메일), WF-13(등급업데이트), WF-ERROR는 Schedule/Error Trigger로 Webhook 없음.

---

## 검증 체크리스트

- [ ] n8n 서버 정상 구동 확인 (https://n8n.pressco21.com)
- [ ] WF-01 웹훅 활성화 확인 (`/webhook/class-api`)
- [ ] WF-02 웹훅 활성화 확인 (`/webhook/partner-auth`)
- [ ] 메이크샵 클래스 목록 페이지 로드 확인
- [ ] 클래스 카드 렌더링 확인 (NocoDB tbl_Classes 데이터)
- [ ] 파트너 대시보드 로그인 후 접근 확인
- [ ] `<!--/user_id/-->` 가상태그 → 회원 ID 치환 확인
- [ ] Content-Type: application/json 요청 정상 처리 확인
