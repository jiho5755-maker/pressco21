# Phase 2 최종 E2E 통합 테스트 체크리스트

작성일: 2026-02-25
버전: Phase 2 v2.1 (n8n + NocoDB)
작성자: QA/테스트 전문가 에이전트
참조 Task: Task 280
관련 문서:
- `phase2-v2-integration-test.md` (Task 251) -- 기능별 상세 플로우, 환경 준비, 에러 핸들링, 스케줄 테스트
- `phase2-deployment-check.md` (Task 271) -- 인프라, 서버, 배포 검증

본 문서 초점: **Task 260/261/262 신규 UX 기능** + **보안 경계값 매트릭스** + **Playwright 자동화 시나리오** + **Phase 2 완료 선언 기준**

---

## 개요

### 이 체크리스트를 사용하는 시점

| 단계 | 사용 체크리스트 |
|------|----------------|
| 인프라/서버/워크플로우 배포 직후 | `phase2-deployment-check.md` |
| 기능별 플로우 (신청/승인/정산/스케줄) 검증 | `phase2-v2-integration-test.md` |
| **Task 261/262 신규 UX + 경계값 보안 + 완료 선언** | **본 문서 (phase2-e2e.md)** |

### 전제 조건

본 문서의 테스트를 시작하기 전 아래가 모두 완료되어야 한다:

- [ ] `phase2-deployment-check.md` 섹션 1~5 (인프라/DB/워크플로우/Credentials/환경변수) PASS
- [ ] `phase2-v2-integration-test.md` 섹션 0 (환경 준비) PASS
- [ ] NocoDB tbl_Partners에 active 파트너 계정 1건 이상 존재
- [ ] 메이크샵 강사회원 그룹 테스트 계정 준비

---

## 섹션 1. 테스트 환경 준비

### 1-1. 테스트 계정 3종

메이크샵에서 아래 계정을 준비하고 NocoDB 데이터를 설정하세요:

| 계정 유형 | 용도 | NocoDB tbl_Partners 설정 |
|---------|------|------------------------|
| active 파트너 (교육 이수 완료) | 대시보드/클래스 플로우 전체 | status=active, education_completed=Y |
| 일반 회원 (파트너 미신청) | 파트너 신청 플로우, 비파트너 차단 확인 | tbl_Partners 레코드 없음 |
| pending 파트너 | 상태 분기 화면 확인 | status=pending |

테스트 계정 실제 ID 기록:
- active 파트너 member_id: _______________
- 일반 회원 member_id: _______________
- pending 파트너 member_id: _______________

### 1-2. 메이크샵 페이지 URL 확인

메이크샵 편집기에서 실제 페이지 번호를 확인하세요:

| 페이지 | URL 형식 | 실제 번호 |
|--------|---------|---------|
| 클래스 목록 | `/shop/page.html?id=숫자` | `id=` _________ |
| 클래스 상세 | `/shop/page.html?id=숫자&class_id=...` | `id=` _________ |
| 파트너 대시보드 | `/shop/page.html?id=숫자` | `id=` _________ |
| 파트너 신청 | `/shop/page.html?id=숫자` | `id=` _________ |
| 교육 이수 | `/shop/page.html?id=숫자` | `id=` _________ |

### 1-3. Playwright 세션 쿠키 주입 전략

가상태그 `<!--/user_id/-->`는 foreverlove.co.kr 서버에서만 치환된다. Playwright에서 로그인 상태를 재현하려면 아래 방법 중 하나를 사용한다.

**방법 A: 브라우저 세션 쿠키 직접 주입**

```javascript
// 1. 해당 계정으로 foreverlove.co.kr 로그인
// 2. DevTools > Application > Cookies > foreverlove.co.kr 에서 PHPSESSID 복사
// 3. Playwright에서 주입:
const context = await browser.newContext();
await context.addCookies([
  { name: 'PHPSESSID', value: '복사한세션값', domain: 'foreverlove.co.kr', path: '/' }
]);
const page = await context.newPage();
await page.goto('https://foreverlove.co.kr/shop/page.html?id={목록ID}');
```

**방법 B: Playwright로 로그인 폼 자동화 (CAPTCHA 없는 경우)**

```javascript
await page.goto('https://foreverlove.co.kr/member/login.html');
await page.fill('#memId', '테스트계정ID');
await page.fill('#memPw', '비밀번호');
await page.click('button[type="submit"]');
await page.waitForURL('https://foreverlove.co.kr/**');
// 세션 저장
const cookies = await context.cookies();
// 이후 테스트에서 context.addCookies(cookies) 재사용
```

**방법 C: 수동 테스트 (Playwright 대신)**

자동화 환경 구성이 어려울 경우, 직접 브라우저에서 로그인 후 각 시나리오를 수동으로 진행하고 결과를 기록한다.

### 1-4. 테스트 데이터 초기화

테스트 완료 후 NocoDB에서 아래 더미 데이터를 삭제한다:

```bash
# tbl_Applications: member_id가 테스트용인 레코드 조회
curl -s -H "xc-token: {NOCODB_TOKEN}" \
  "https://nocodb.pressco21.com/api/v1/db/data/noco/{PROJECT_ID}/tbl_Applications?where=(member_id,eq,TEST_APPLY_MEMBER)" | jq '.list[].Id'

# 조회된 Id로 삭제
curl -X DELETE -H "xc-token: {NOCODB_TOKEN}" \
  "https://nocodb.pressco21.com/api/v1/db/data/noco/{PROJECT_ID}/tbl_Applications/{ROW_ID}"
```

정리 체크리스트 (섹션 7에서 최종 확인):
- [ ] tbl_Applications 테스트 신청 레코드 삭제
- [ ] tbl_Settlements order_id=TEST_로 시작하는 레코드 삭제
- [ ] 테스트 전용 파트너 계정 데이터 삭제 (실 계정과 혼동 주의)

---

## 섹션 2. E2E 핵심 플로우 (9개)

> 기존 `phase2-v2-integration-test.md`에서 다룬 기본 동작(API 응답 코드, DB 저장 여부 등)과 중복되지 않도록, 본 섹션은 **UI 분기 확인**, **Task 261/262 신규 기능**, **경계값 매트릭스**에 집중한다.

---

### 플로우 1: 클래스 목록 → 검색/필터 → 상세 → 예약 (Task 261/262 신규 기능 포함)

**Playwright 자동화 시나리오:**

```javascript
test('클래스 목록 → 상세 → 예약 플로우', async ({ page }) => {
  // 1. 목록 페이지 접속
  await page.goto('https://foreverlove.co.kr/shop/page.html?id={목록ID}');
  await page.waitForSelector('.class-list-card', { timeout: 10000 });

  // 2. 검색어 입력 (Task 261 신규: 검색어 하이라이트 <mark> 태그)
  await page.fill('#classSearch', '압화');
  await page.waitForTimeout(350); // debounce 300ms 대기
  const markEl = page.locator('mark').first();
  await expect(markEl).toBeVisible();
  await expect(markEl).toHaveText('압화');

  // 3. 카테고리 pill 필터 클릭 (Task 261 신규: pill 버튼 UI)
  await page.click('.category-pill:nth-child(2)');
  await page.waitForTimeout(500);
  const activePill = page.locator('.category-pill.is-active');
  await expect(activePill).toBeVisible();

  // 4. 빈 검색 결과 상태 확인
  await page.fill('#classSearch', 'zzzzzzz존재하지않는클래스');
  await page.waitForTimeout(350);
  const emptyEl = page.locator('.class-list-empty');
  await expect(emptyEl).toBeVisible();
  // "전체 클래스 보기" 버튼 존재 확인
  const showAllBtn = page.locator('.class-list-empty a, .class-list-empty button');
  await expect(showAllBtn).toBeVisible();

  // 5. 검색어 초기화 후 카드 클릭 → 상세 이동
  await page.fill('#classSearch', '');
  await page.waitForTimeout(350);
  await page.click('.class-list-card:first-child');
  await page.waitForURL(/class_id=/);

  // 6. 상세 페이지: PC 뷰에서 예약 위젯 sticky 확인 (Task 262 신규)
  await page.setViewportSize({ width: 1280, height: 800 });
  const bookingPanel = page.locator('.detail-booking');
  await expect(bookingPanel).toBeVisible();

  // 7. 별점 SVG 존재 확인 (Task 262 신규)
  const starSvg = page.locator('.detail-rating svg, .class-rating svg').first();
  await expect(starSvg).toBeVisible();
});
```

**체크리스트:**
- [ ] 목록 페이지 초기 로드 시간 3초 이내 (스톱워치 또는 브라우저 Performance 탭)
- [ ] 클래스 카드 표시 정상 (이미지, 제목, 가격)
- [ ] **[Task 261 신규]** 검색어 입력 후 `<mark>` 하이라이트 태그로 일치 텍스트 강조 표시
- [ ] **[Task 261 신규]** 빈 검색 결과 시 SVG 일러스트 + "전체 클래스 보기" 링크/버튼
- [ ] **[Task 261 신규]** 카테고리 pill 필터 버튼 클릭 시 `is-active` 클래스 토글
- [ ] 카테고리 pill 전체 선택(All) 클릭 시 전체 목록 복구
- [ ] 클래스 카드 클릭 → 상세 페이지 정상 이동 (URL에 올바른 class_id 포함)
- [ ] **[Task 262 신규]** 상세 페이지: 별점 SVG 렌더링 + 평균 점수 숫자 표시
- [ ] **[Task 262 신규]** 상세 페이지: PC(1280px)에서 예약 위젯 `sticky` 우측 고정 동작
- [ ] 상세 페이지: 브레드크럼 "파트너 클래스" 클릭 → 목록 페이지 이동
- [ ] 상세 페이지: "목록으로 돌아가기" 버튼 클릭 → 목록 페이지 이동
- [ ] 상세 페이지: 잔여석 0인 옵션은 예약 버튼 비활성화 또는 "마감" 표시

---

### 플로우 2: 파트너 신청 → WF-07 응답 5가지 UI 분기

> WF-07 서버 응답(DB 저장, 이메일 발송)은 `phase2-v2-integration-test.md` 2-1에서 검증.
> 본 플로우는 **프론트엔드 UI 분기** 확인에 집중한다.

**HTML 영역 구조 (참조):**

| 상황 | 표시 영역 ID | 비고 |
|------|------------|------|
| 비로그인 | `#paNoticeArea` | `<!--/user_id/-->` = 빈 문자열 |
| 정상 신청 성공 | `#paSuccessArea` | application_id 표시 (`#paSuccessAppId`) |
| 이미 파트너 (ALREADY_PARTNER) | `#paAlreadyArea` | `#paAlreadyTitle` 텍스트 변경 |
| 중복 신청 (DUPLICATE_APPLICATION) | `#paAlreadyArea` | 다른 `#paAlreadyDesc` 텍스트 |
| 필수값 누락 (MISSING_PARAMS) | `#paFormGlobalError` | |
| 네트워크 오류 | `#paFormGlobalError` | fetch catch 처리 |
| 신청 폼 정상 | `#paFormArea` | 위 상황 아닐 때 기본 표시 |

**에러 응답 분기 curl 검증:**

```bash
# 1. 정상 신청 (최초 시도)
curl -s "https://n8n.pressco21.com/webhook/partner-apply" \
  -H "Content-Type: application/json" \
  -d '{"member_id":"NEW_TEST_MEMBER","name":"홍길동","studio_name":"테스트공방","phone":"010-0000-1234","email":"test@test.com","specialty":"압화","location":"서울","introduction":"15자 이상의 소개글입니다. 충분히 작성했습니다."}' | jq .
# 기대: {"success":true,"data":{"application_id":"APP_..."}}

# 2. 이미 파트너 (active 계정으로 재신청)
curl -s "https://n8n.pressco21.com/webhook/partner-apply" \
  -H "Content-Type: application/json" \
  -d '{"member_id":"{ACTIVE_PARTNER_MEMBER_ID}","name":"지호","studio_name":"공방","phone":"010-0000-1234","email":"test@test.com","specialty":"압화","location":"서울","introduction":"15자 이상의 소개글입니다."}' | jq .
# 기대: {"success":false,"error":{"code":"ALREADY_PARTNER"}}

# 3. 중복 신청 (위 정상 신청 이후 동일 member_id로 재신청)
curl -s "https://n8n.pressco21.com/webhook/partner-apply" \
  -H "Content-Type: application/json" \
  -d '{"member_id":"NEW_TEST_MEMBER","name":"홍길동","studio_name":"테스트공방","phone":"010-0000-1234","email":"test@test.com","specialty":"압화","location":"서울","introduction":"15자 이상의 소개글입니다. 충분히 작성했습니다."}' | jq .
# 기대: {"success":false,"error":{"code":"DUPLICATE_APPLICATION"}}

# 4. 필수값 누락
curl -s "https://n8n.pressco21.com/webhook/partner-apply" \
  -H "Content-Type: application/json" \
  -d '{"member_id":"some_member"}' | jq .
# 기대: {"success":false,"error":{"code":"MISSING_PARAMS"}}

# 5. URL XSS 차단 (portfolio_url에 javascript: 스킴)
curl -s "https://n8n.pressco21.com/webhook/partner-apply" \
  -H "Content-Type: application/json" \
  -d '{"member_id":"test","name":"홍길동","studio_name":"공방","phone":"010-0000-1234","email":"test@test.com","specialty":"압화","location":"서울","introduction":"소개글입니다 충분히 길게 작성합니다.","portfolio_url":"javascript:alert(1)"}' | jq '.error.code'
# 기대: "INVALID_PARAMS" 또는 필드 에러 응답
```

**UI 체크리스트:**
- [ ] 비로그인 상태: `#paNoticeArea` 표시, 나머지 영역 숨김
- [ ] 정상 신청 성공: `#paSuccessArea` 표시, `#paSuccessAppId`에 application_id 텍스트 노출
- [ ] ALREADY_PARTNER: `#paAlreadyArea` 표시, "이미 파트너" 관련 메시지
- [ ] DUPLICATE_APPLICATION: `#paAlreadyArea` 표시, "심사 중" 관련 메시지
- [ ] MISSING_PARAMS: `#paFormGlobalError` 영역 표시 및 에러 메시지
- [ ] 네트워크 오류(fetch catch): `#paFormGlobalError`에 "네트워크 오류" 메시지
- [ ] **[SECURITY]** `javascript:alert(1)` URL → 클라이언트에서 `#paPortfolioUrlError` 표시 (isValidUrl 차단)
- [ ] **[SECURITY]** `javascript:alert(1)` URL → 서버(WF-07)에서도 재검증 → INVALID_PARAMS 응답

---

### 플로우 3: 교육 이수 → WF-10 응답 + UI 분기 + score 경계값 매트릭스

> 교육 합격/불합격 이메일, DB 저장은 `phase2-v2-integration-test.md` 2-3에서 검증.
> 본 플로우는 **UI 분기 5종** + **score 경계값 7가지** + **score 조작 방어**에 집중한다.

**HTML 영역 구조 (참조):**

| 상황 | 표시 영역 ID | 비고 |
|------|------------|------|
| 비로그인 | `#peNoticeArea` | `<!--/user_id/-->` = 빈 문자열 |
| 비파트너 | `#peNotPartnerArea` | WF-02 is_partner=false |
| 이미 이수 완료 | `#peAlreadyArea` | WF-02 education_completed=true |
| 교육 본문 (정상 진입) | `#peContentArea` | 영상 3개 + 퀴즈 |
| 결과 화면 | `#peResultArea` + `#peResultPass` 또는 `#peResultFail` | 제출 후 |

**score 경계값 매트릭스 (PASS_THRESHOLD=11, TOTAL=15 서버 고정):**

```bash
# 1. 합격 최솟값 (score=11, 경계값)
curl -s "https://n8n.pressco21.com/webhook/education-complete" \
  -H "Content-Type: application/json" \
  -d '{"member_id":"{PARTNER_MEMBER_ID}","score":11,"total":15}' | jq '{passed:.data.passed}'
# 기대: {"passed": true}

# 2. 불합격 최댓값 (score=10, 경계값)
curl -s "https://n8n.pressco21.com/webhook/education-complete" \
  -H "Content-Type: application/json" \
  -d '{"member_id":"{PARTNER_MEMBER_ID}","score":10,"total":15}' | jq '{passed:.data.passed}'
# 기대: {"passed": false}

# 3. 만점 (score=15)
curl -s "https://n8n.pressco21.com/webhook/education-complete" \
  -H "Content-Type: application/json" \
  -d '{"member_id":"{PARTNER_MEMBER_ID}","score":15,"total":15}' | jq '{passed:.data.passed}'
# 기대: {"passed": true}

# 4. 0점
curl -s "https://n8n.pressco21.com/webhook/education-complete" \
  -H "Content-Type: application/json" \
  -d '{"member_id":"{PARTNER_MEMBER_ID}","score":0,"total":15}' | jq '{passed:.data.passed}'
# 기대: {"passed": false}

# 5. 범위 초과 (score=16 > total=15) → INVALID_SCORE
curl -s "https://n8n.pressco21.com/webhook/education-complete" \
  -H "Content-Type: application/json" \
  -d '{"member_id":"{PARTNER_MEMBER_ID}","score":16,"total":15}' | jq '.error.code'
# 기대: "INVALID_SCORE"

# 6. total 조작 (total=5로 낮춰서 score/total 비율 조작 시도) → INVALID_SCORE
curl -s "https://n8n.pressco21.com/webhook/education-complete" \
  -H "Content-Type: application/json" \
  -d '{"member_id":"{PARTNER_MEMBER_ID}","score":5,"total":5}' | jq '.error.code'
# 기대: "INVALID_SCORE" (서버는 total=15 고정으로 검증)

# 7. pass_threshold 주입 시도 (서버 고정 상수 우회 시도)
curl -s "https://n8n.pressco21.com/webhook/education-complete" \
  -H "Content-Type: application/json" \
  -d '{"member_id":"{PARTNER_MEMBER_ID}","score":5,"total":15,"pass_threshold":4}' | jq '{passed:.data.passed}'
# 기대: {"passed": false} (PASS_THRESHOLD=11 서버 상수, 클라이언트 파라미터 무시)
```

**UI 체크리스트:**
- [ ] 비로그인 시 `#peNoticeArea` 표시, "로그인이 필요합니다" 안내 + 로그인 버튼
- [ ] 비파트너(일반 회원) 시 `#peNotPartnerArea` 표시, 파트너 신청 안내
- [ ] 이미 이수 완료 시 `#peAlreadyArea` 표시, 재시도 불가 안내
- [ ] 정상 진입 시 `#peContentArea` 표시, YouTube 3개 플레이어 로드 확인 (수동)
- [ ] 영상 시청 전: `#peStep2`에 잠금 오버레이(`#peQuizLock`) 표시, 퀴즈 비활성화
- [ ] 영상 3개 모두 ENDED 이벤트 후: `#peQuizArea` 표시, `#peStep2` 잠금 해제 (수동 확인)
- [ ] 15문항 라디오 버튼 정상 표시, 각 문항 선택 가능
- [ ] 미선택 문항 있을 때 제출 → `#peQuizWarning` 표시 + 미선택 문항으로 스크롤
- [ ] score=11 제출 후: `#peResultArea` + `#peResultPass` 표시
- [ ] score=10 제출 후: `#peResultArea` + `#peResultFail` 표시 + `#peRetryBtn` 노출
- [ ] **[SECURITY]** score 경계값 7가지 매트릭스 curl 결과 모두 기대값과 일치
- [ ] **[SECURITY]** pass_threshold 파라미터 주입 → 서버 무시 확인 (score=5 → passed: false)

---

### 플로우 4: 파트너 대시보드 클래스 상태 변경 + 소유권 검증

> 클래스 등록/수정/삭제 기본 동작은 `phase2-v2-integration-test.md` 2-4에서 검증.
> 본 플로우는 **상태 변경 UI 전환** + **소유권 검증 보안** 확인에 집중한다.

**curl 테스트:**

```bash
# 정상 상태 변경 (active → paused)
curl -s "https://n8n.pressco21.com/webhook/class-management" \
  -H "Content-Type: application/json" \
  -d '{"action":"updateClassStatus","partner_code":"PC_202602_001","class_id":"CLS_TEST_001","status":"paused"}' | jq .
# 기대: {"success":true}

# 소유권 검증: 타파트너 class_id로 상태 변경 시도
curl -s "https://n8n.pressco21.com/webhook/class-management" \
  -H "Content-Type: application/json" \
  -d '{"action":"updateClassStatus","partner_code":"PC_202602_001","class_id":"CLS_OTHER_PARTNER_999","status":"paused"}' | jq .
# 기대: {"success":false,"error":{"code":"CLASS_NOT_FOUND"}} (HTTP 403)

# 소유권 검증: 타파트너 class_id로 삭제 시도
curl -s "https://n8n.pressco21.com/webhook/class-management" \
  -H "Content-Type: application/json" \
  -d '{"action":"deleteClass","partner_code":"PC_202602_001","class_id":"CLS_OTHER_PARTNER_999"}' | jq .
# 기대: {"success":false,"error":{"code":"CLASS_NOT_FOUND"}} (HTTP 403)
```

**체크리스트:**
- [ ] 대시보드 클래스 목록에 내 클래스 표시 (WF-02/03 연동)
- [ ] "일시정지" 버튼 클릭 → status paused 전환 → UI 상태 뱃지 즉시 갱신
- [ ] "다시 활성화" 버튼 클릭 → status active 전환 → UI 상태 뱃지 갱신
- [ ] **[SECURITY]** 타파트너 class_id로 updateClassStatus → CLASS_NOT_FOUND(403) 차단
- [ ] **[SECURITY]** 타파트너 class_id로 deleteClass → CLASS_NOT_FOUND(403) 차단

---

### 플로우 5: 후기 답글 → tbl_Reviews 업데이트

> WF-09 기본 동작은 `phase2-v2-integration-test.md` 2-6에서 검증.
> 본 플로우는 **UI 상태 전환** + **소유권 및 XSS 보안** 확인에 집중한다.

**curl 테스트:**

```bash
# 정상 답글 등록
curl -s "https://n8n.pressco21.com/webhook/review-reply" \
  -H "Content-Type: application/json" \
  -d '{"review_id":"REV_TEST_001","partner_code":"PC_202602_001","answer":"감사합니다! 좋은 후기 남겨주셔서 감사해요."}' | jq .
# 기대: {"success":true}

# NocoDB에서 업데이트 결과 확인
curl -s -H "xc-token: {NOCODB_TOKEN}" \
  "https://nocodb.pressco21.com/api/v1/db/data/noco/{PROJECT_ID}/tbl_Reviews?where=(review_id,eq,REV_TEST_001)" | jq '.list[0] | {partner_answer:.partner_answer, answer_at:.answer_at}'

# 소유권 검증: 타파트너 후기에 답글
curl -s "https://n8n.pressco21.com/webhook/review-reply" \
  -H "Content-Type: application/json" \
  -d '{"review_id":"REV_OTHER_PARTNER","partner_code":"PC_202602_001","answer":"임의 답글"}' | jq .
# 기대: {"success":false,"error":{"code":"FORBIDDEN"}} (HTTP 403)

# XSS 입력 테스트
curl -s "https://n8n.pressco21.com/webhook/review-reply" \
  -H "Content-Type: application/json" \
  -d '{"review_id":"REV_TEST_002","partner_code":"PC_202602_001","answer":"<script>alert(1)</script>감사합니다"}' | jq .
# 기대: success:true이지만 answer 내 스크립트 태그 이스케이프 처리
```

**체크리스트:**
- [ ] 대시보드 후기 탭에서 미답변 후기 목록 표시
- [ ] 답변 텍스트 입력 후 제출 → WF-09 호출 성공 응답
- [ ] 제출 후 tbl_Reviews의 `partner_answer` + `answer_at` 필드 업데이트 확인
- [ ] 답글 등록 후 대시보드 UI에서 "답변 완료" 상태로 전환
- [ ] **[SECURITY]** 타파트너 review_id로 답글 시도 → 403 Forbidden 차단
- [ ] **[SECURITY]** XSS 입력(`<script>alert(1)</script>`) → 브라우저에서 스크립트 미실행 확인

---

### 플로우 6: 파트너 대시보드 상태별 6가지 UI 분기

**각 상태별 접속 시나리오:**

| 상황 | 테스트 계정 | 기대 UI |
|------|-----------|---------|
| 비로그인 | 미로그인 상태에서 대시보드 URL 직접 접속 | `#pdNoticeArea` 또는 로그인 안내 화면 |
| 비파트너 | 일반 회원 계정 로그인 후 대시보드 접속 | "파트너가 아닌 회원" 안내 + 파트너 신청 링크 |
| pending | pending 계정 로그인 후 접속 | "심사 중" 안내 화면 |
| inactive | inactive 계정 로그인 후 접속 | "비활성" 안내 화면 |
| active (교육 미이수) | education_completed=N인 active 계정 | 교육 이수 안내 + 교육 페이지 링크 |
| active (교육 이수 완료) | education_completed=Y인 active 계정 | 대시보드 정상 진입 (클래스/정산/수익 탭) |

**체크리스트:**
- [ ] 비로그인: 대시보드 접속 → 로그인 요청 화면 표시, 대시보드 내용 미노출
- [ ] 비파트너: WF-02 is_partner=false → "파트너가 아닌 회원" 안내 표시
- [ ] pending: WF-02 status=pending → "심사 중" 안내 표시
- [ ] inactive: WF-02 status=inactive → "비활성" 안내 표시
- [ ] active + 교육 미이수: 교육 이수 안내 화면 표시, 대시보드 데이터 미표시
- [ ] active + 교육 이수 완료: 대시보드 정상 진입 (클래스 목록, 정산 탭, 수익 탭 모두 정상)

---

### 플로우 7: 교육 합격 → 파트너 상태 활성화 연계 검증

**절차:**

1. pending 또는 education_completed=N인 파트너 계정으로 교육 이수 (score=11 이상 제출)
2. WF-10 응답에서 `passed: true` 확인
3. NocoDB tbl_Partners 해당 레코드 확인: `education_completed = 'Y'`
4. 해당 계정으로 대시보드 재접속 → 교육 이수 안내 화면 미표시, 대시보드 정상 진입

**curl 확인:**

```bash
# 교육 이수 제출
curl -s "https://n8n.pressco21.com/webhook/education-complete" \
  -H "Content-Type: application/json" \
  -d '{"member_id":"{PENDING_PARTNER_MEMBER_ID}","score":11,"total":15}' | jq .

# tbl_Partners에서 education_completed 확인
curl -s -H "xc-token: {NOCODB_TOKEN}" \
  "https://nocodb.pressco21.com/api/v1/db/data/noco/{PROJECT_ID}/tbl_Partners?where=(member_id,eq,{PENDING_PARTNER_MEMBER_ID})" | jq '.list[0].education_completed'
# 기대: "Y"

# WF-02 파트너 인증 재조회 (education_completed 반영 여부)
curl -s "https://n8n.pressco21.com/webhook/partner-auth" \
  -H "Content-Type: application/json" \
  -d '{"action":"getPartnerAuth","member_id":"{PENDING_PARTNER_MEMBER_ID}"}' | jq '.data.education_completed'
# 기대: true 또는 "Y"
```

**체크리스트:**
- [ ] 교육 합격 후 WF-10: tbl_Partners.education_completed = 'Y' 업데이트
- [ ] 교육 합격 후 WF-02 재조회: `education_completed: true` 반환
- [ ] 교육 합격 후 대시보드 재접속: 교육 이수 안내 화면 미표시, 대시보드 정상 진입
- [ ] `#peAlreadyArea`: 해당 계정으로 교육 페이지 재접속 시 "이미 이수 완료" 화면 표시

---

### 플로우 8: 수익 리포트 월별 탐색

> 파트너 대시보드 수익 탭의 월별 탐색 기능을 검증한다.

**체크리스트:**
- [ ] 대시보드 수익 탭 클릭 → 현재 월 데이터 표시 (정산 금액, 건수)
- [ ] "이전 달" 버튼 클릭 → 이전 월 데이터 로드 (로딩 인디케이터 표시 후 갱신)
- [ ] "다음 달" 버튼: 현재 월이면 비활성화(disabled) 처리
- [ ] 빈 월 (정산 건수 0): "이번 달 정산 내역이 없습니다" 메시지 표시
- [ ] 월 변경 시 URL 파라미터 또는 상태 관리가 정상 (페이지 새로고침 후 월 상태 유지 여부 확인)

---

### 플로우 9: 결제 취소 → WF-05 폴링 처리

> 메이크샵에서 주문 취소 시 WF-05 폴링이 취소 상태를 감지하여 tbl_Settlements 처리.

**절차:**

1. 테스트 주문 1건 생성 (WF-04 또는 WF-05 폴링으로 tbl_Settlements에 PENDING_SETTLEMENT 저장 확인)
2. 메이크샵 관리자 페이지에서 해당 주문 취소 처리
3. WF-05 수동 실행 (n8n UI "Execute Workflow" 버튼)
4. tbl_Settlements 해당 order_id 레코드 status 확인

```bash
# WF-05 실행 후 tbl_Settlements 취소 주문 확인
curl -s -H "xc-token: {NOCODB_TOKEN}" \
  "https://nocodb.pressco21.com/api/v1/db/data/noco/{PROJECT_ID}/tbl_Settlements?where=(order_id,eq,{CANCELLED_ORDER_ID})" | jq '.list[0].status'
# 기대: "CANCELLED" 또는 취소 관련 status
```

**체크리스트:**
- [ ] 메이크샵에서 주문 취소 처리 완료
- [ ] WF-05 수동 실행 후 해당 order_id의 tbl_Settlements status 변경 확인
- [ ] 파트너 대시보드 정산 목록에서 취소 건 표시 또는 제외 확인
- [ ] 취소 건은 파트너 적립금 미지급 확인

---

## 섹션 3. 보안 테스트

> 기존 `phase2-v2-integration-test.md` 섹션 3에서 다룬 항목과 중복을 최소화하고, **경계값·조작 패턴**을 추가한다.

### 3-1. WF-10 score 조작 방어 (플로우 3의 7가지 매트릭스 결과 종합)

| # | 테스트 | 입력 | 기대 | 판정 |
|---|--------|------|------|------|
| 1 | 합격 경계값 | score=11, total=15 | passed: true | [ ] |
| 2 | 불합격 경계값 | score=10, total=15 | passed: false | [ ] |
| 3 | 만점 | score=15, total=15 | passed: true | [ ] |
| 4 | 0점 | score=0, total=15 | passed: false | [ ] |
| 5 | 범위 초과 | score=16, total=15 | INVALID_SCORE | [ ] |
| 6 | total 조작 | score=5, total=5 | INVALID_SCORE | [ ] |
| 7 | pass_threshold 주입 | score=5, pass_threshold=4 | passed: false | [ ] |

- [ ] **[SECURITY]** 위 7가지 매트릭스 전체 기대값 일치

### 3-2. WF-06 클래스 소유권 검증

- [ ] **[SECURITY]** 타파트너 class_id로 updateClassStatus → CLASS_NOT_FOUND(403) 차단
- [ ] **[SECURITY]** 타파트너 class_id로 deleteClass → CLASS_NOT_FOUND(403) 차단

### 3-3. WF-08 Admin 인증 (2가지)

```bash
# 인증 없이 호출
curl -s "https://n8n.pressco21.com/webhook/partner-approve" \
  -H "Content-Type: application/json" \
  -d '{"application_id":"APP_DUMMY","action":"approve"}' | jq '.error.code'
# 기대: "UNAUTHORIZED"

# 잘못된 토큰
curl -s "https://n8n.pressco21.com/webhook/partner-approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer WRONG_RANDOM_TOKEN_12345" \
  -d '{"application_id":"APP_DUMMY","action":"approve"}' | jq '.error.code'
# 기대: "UNAUTHORIZED"
```

- [ ] **[SECURITY]** WF-08: Authorization 헤더 없는 호출 → UNAUTHORIZED(401)
- [ ] **[SECURITY]** WF-08: 잘못된 토큰 → UNAUTHORIZED(401)

### 3-4. WF-10 인증 우회 방어 (2가지)

```bash
# member_id 없이 호출 (비로그인 시뮬레이션)
curl -s "https://n8n.pressco21.com/webhook/education-complete" \
  -H "Content-Type: application/json" \
  -d '{"score":11,"total":15}' | jq '.error.code'
# 기대: "NOT_LOGGED_IN" 또는 "MISSING_PARAMS"

# inactive 파트너로 호출
curl -s "https://n8n.pressco21.com/webhook/education-complete" \
  -H "Content-Type: application/json" \
  -d '{"member_id":"{INACTIVE_PARTNER_MEMBER_ID}","score":11,"total":15}' | jq '.error.code'
# 기대: "PARTNER_INACTIVE" (401)
```

- [ ] **[SECURITY]** member_id 없는 WF-10 호출 → NOT_LOGGED_IN 또는 MISSING_PARAMS
- [ ] **[SECURITY]** inactive 파트너 WF-10 호출 → PARTNER_INACTIVE 차단

### 3-5. XSS 방어 (프론트 + 서버 이중 방어)

```bash
# 클래스명에 XSS 주입 (WF-06)
curl -s "https://n8n.pressco21.com/webhook/class-management" \
  -H "Content-Type: application/json" \
  -d '{"action":"create","partner_code":"PC_202602_001","class_name":"<script>alert(1)</script>테스트"}' | jq .
# 기대: success:true이지만 DB 저장 시 HTML 이스케이프 처리

# 브라우저에서 해당 클래스명 표시 시 확인
# - class_name이 textContent로 삽입되거나 escapeHtml 처리되어야 함
# - alert 팝업이 뜨면 XSS 취약점
```

- [ ] **[SECURITY]** `javascript:alert(1)` URL → 파트너 신청 폼 유효성 에러 (`#paPortfolioUrlError`)
- [ ] **[SECURITY]** `javascript:alert(1)` URL → WF-07 서버에서도 INVALID_PARAMS 응답
- [ ] **[SECURITY]** 클래스명 XSS 입력 → 브라우저 화면에서 스크립트 미실행
- [ ] **[SECURITY]** 후기 답글 XSS 입력 → 브라우저 화면에서 스크립트 미실행
- [ ] **[SECURITY]** 프론트 소스코드에 Shopkey, Licensekey, NocoDB token 미노출 (소스 보기로 확인)

### 3-6. 자기결제 방지

```bash
# 파트너가 자신의 클래스에 결제한 주문으로 WF-04 호출
curl -s "https://n8n.pressco21.com/webhook/record-booking" \
  -H "Content-Type: application/json" \
  -d '{"order_id":"TEST_SELF_ORDER","member_id":"{PARTNER_MEMBER_ID}","class_id":"CLS_TEST_001","order_amount":50000}' | jq '.error.code'
# 기대: "SELF_PURCHASE"
```

- [ ] **[SECURITY]** 파트너 자신의 클래스 주문 → SELF_PURCHASE 에러 반환
- [ ] **[SECURITY]** 자기결제 시 tbl_Settlements 레코드 미생성 또는 SELF_PURCHASE status

---

## 섹션 4. 반응형 테스트

**Playwright 반응형 테스트 코드:**

```javascript
const viewports = [
  { width: 375, height: 812, name: '모바일_iPhone14' },
  { width: 768, height: 1024, name: '태블릿_iPad' },
  { width: 1280, height: 800, name: 'PC_1280' },
  { width: 1920, height: 1080, name: 'PC_1920' }
];

for (const vp of viewports) {
  test('반응형 - ' + vp.name, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('https://foreverlove.co.kr/shop/page.html?id={목록ID}');
    await page.waitForSelector('.class-list-card');
    // 가로 스크롤 없음 확인
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // 5px 여유
    await page.screenshot({ path: './screenshots/responsive-' + vp.name + '.png', fullPage: false });
  });
}
```

**체크리스트:**

| 뷰포트 | 테스트 항목 | 판정 |
|--------|-----------|------|
| 모바일 (375px) | 클래스 목록 1열 그리드 레이아웃 | [ ] |
| 모바일 (375px) | 가로 스크롤 없음 | [ ] |
| 모바일 (375px) | 카테고리 pill 영역 가로 스크롤 (내부 스크롤, 페이지 스크롤 아님) | [ ] |
| 모바일 (375px) | 상세 예약 패널 하단 고정 (sticky 또는 fixed) | [ ] |
| 모바일 (375px) | 교육 YouTube 플레이어 16:9 비율 유지 | [ ] |
| 모바일 (375px) | 파트너 신청 폼 100% 너비, 키보드 겹침 없음 | [ ] |
| 태블릿 (768px) | 클래스 목록 2열 그리드 레이아웃 | [ ] |
| 태블릿 (768px) | 대시보드 탭 정상 표시 | [ ] |
| PC (1280px) | 클래스 목록 3열 그리드 레이아웃 | [ ] |
| PC (1280px) | 상세 예약 위젯 sticky 우측 고정 | [ ] |
| PC (1280px) | 대시보드 2컬럼 레이아웃 (좌: 탭메뉴, 우: 컨텐츠) | [ ] |

---

## 섹션 5. Lighthouse + Schema.org 검증

### 5-1. Lighthouse 목표 점수

| 페이지 | 성능 | 접근성 | SEO | Best Practices |
|-------|------|--------|-----|----------------|
| 클래스 목록 | 80+ | 85+ | 90+ | 90+ |
| 클래스 상세 | 80+ | 85+ | 90+ | 90+ |
| 파트너 신청 | 85+ | 90+ | 90+ | 90+ |
| 교육 이수 | 80+ | 85+ | 90+ | 90+ |

**실행 방법:**

```bash
# npx lighthouse (Node.js 필요)
npx lighthouse https://foreverlove.co.kr/shop/page.html?id={목록ID} \
  --output html --output-path ./lighthouse-list.html \
  --chrome-flags="--headless"

npx lighthouse https://foreverlove.co.kr/shop/page.html?id={상세ID}&class_id=CLS_TEST_001 \
  --output html --output-path ./lighthouse-detail.html \
  --chrome-flags="--headless"
```

또는 Chrome DevTools > Lighthouse 탭에서 직접 실행.

### 5-2. Schema.org 구조화 데이터 검증

클래스 목록/상세 페이지에 SEO를 위한 Schema.org JSON-LD가 포함되어 있는지 확인한다.

**확인 방법:**

```bash
# 목록 페이지 소스에서 JSON-LD 존재 확인
curl -s "https://foreverlove.co.kr/shop/page.html?id={목록ID}" | grep -o 'application/ld+json'
# 기대: 1줄 이상 출력

# 상세 페이지 소스에서 JSON-LD 존재 확인
curl -s "https://foreverlove.co.kr/shop/page.html?id={상세ID}&class_id=CLS_TEST_001" | grep -o 'application/ld+json'
```

**검증 사이트:**
- Schema.org 유효성: `https://validator.schema.org/` (JSON-LD 코드 붙여넣기)
- Google Rich Results Test: `https://search.google.com/test/rich-results` (URL 직접 입력)

**체크리스트:**
- [ ] 목록 페이지 Lighthouse 성능 80+
- [ ] 목록 페이지 Lighthouse SEO 90+
- [ ] 상세 페이지 Lighthouse 성능 80+
- [ ] 상세 페이지 Lighthouse SEO 90+
- [ ] 모든 페이지 브라우저 콘솔 JavaScript 에러 0건 (Chrome DevTools > Console)
- [ ] 상세 페이지 Schema.org JSON-LD 존재 (`<script type="application/ld+json">`)
- [ ] validator.schema.org 유효성 검증 통과
- [ ] Google Rich Results Test 오류 0건

---

## 섹션 6. CORS 실환경 브라우저 확인

> `phase2-deployment-check.md` 섹션 8에서 curl OPTIONS로 검증한 CORS를 **실제 브라우저 fetch**로 재확인.

**브라우저 콘솔 테스트 (foreverlove.co.kr 페이지에서 실행):**

```javascript
// foreverlove.co.kr 임의 페이지 접속 후 F12 > Console 탭에서 실행
(function() {
  var tests = [
    { name: 'WF-01 클래스 목록', url: 'https://n8n.pressco21.com/webhook/class-api', body: {action:'getClasses'} },
    { name: 'WF-02 파트너 인증', url: 'https://n8n.pressco21.com/webhook/partner-auth', body: {action:'getPartnerAuth', member_id:'test'} },
    { name: 'WF-07 파트너 신청 (OPTIONS 사전 요청)', url: 'https://n8n.pressco21.com/webhook/partner-apply', body: {} }
  ];
  tests.forEach(function(t) {
    fetch(t.url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(t.body)
    })
    .then(function(r) { console.log('[PASS] ' + t.name + ' - HTTP ' + r.status); })
    .catch(function(e) { console.error('[FAIL] ' + t.name + ' - CORS ERROR:', e.message); });
  });
})();
// 기대: [PASS] 3개, [FAIL] 0개
```

**체크리스트:**
- [ ] foreverlove.co.kr에서 WF-01 GET 호출 → CORS 에러 없음
- [ ] foreverlove.co.kr에서 WF-02 POST 호출 → CORS 에러 없음
- [ ] foreverlove.co.kr에서 WF-07 POST 호출 → CORS 에러 없음
- [ ] www.foreverlove.co.kr에서도 동일 테스트 통과 (www 서브도메인 CORS 허용 여부)

---

## 섹션 7. 테스트 데이터 정리

테스트 완료 후 NocoDB에서 더미 데이터를 삭제한다.

**NocoDB UI에서 삭제하는 방법:**
1. `https://nocodb.pressco21.com` 접속 > 해당 테이블 선택
2. 필터 아이콘 > 필드: `member_id` 또는 `order_id` > 조건: `is` > 테스트값 입력
3. 검색된 레코드 우클릭 > Delete Row

**API로 삭제하는 방법:**

```bash
# 1. 테스트 신청 레코드 ID 조회
curl -s -H "xc-token: {NOCODB_TOKEN}" \
  "https://nocodb.pressco21.com/api/v1/db/data/noco/{PROJECT_ID}/tbl_Applications?where=(member_id,eq,NEW_TEST_MEMBER)" | jq '.list[] | {Id:.Id, member_id:.member_id}'

# 2. 조회된 Id로 삭제
curl -X DELETE -H "xc-token: {NOCODB_TOKEN}" \
  "https://nocodb.pressco21.com/api/v1/db/data/noco/{PROJECT_ID}/tbl_Applications/{ROW_ID}"

# 3. tbl_Settlements 테스트 데이터 삭제
curl -s -H "xc-token: {NOCODB_TOKEN}" \
  "https://nocodb.pressco21.com/api/v1/db/data/noco/{PROJECT_ID}/tbl_Settlements?where=(order_id,like,TEST_%25)" | jq '.list[] | {Id:.Id, order_id:.order_id}'
```

**정리 체크리스트:**
- [ ] tbl_Applications: `NEW_TEST_MEMBER` 등 테스트 신청 레코드 삭제
- [ ] tbl_Settlements: `TEST_ORDER_001`, `TEST_SELF_ORDER` 등 테스트 정산 레코드 삭제
- [ ] tbl_Education: 경계값 테스트 시 생성된 레코드 삭제 또는 확인
- [ ] tbl_Partners: 테스트 전용 계정 데이터 삭제 (실 계정과 혼동 주의)
- [ ] education_completed 테스트 후 원복 필요 시: tbl_Partners에서 해당 필드 수동 수정

---

## 섹션 8. Phase 2 완료 선언 기준

### 8-1. 필수 통과 항목 (모두 충족 시 Phase 2 완료 선언)

**인프라 (phase2-deployment-check.md 기준):**
- [ ] `phase2-deployment-check.md` 섹션 1~5 CRITICAL 0건 실패
- [ ] 14개 WF + WF-ERROR 모두 Active 상태
- [ ] NocoDB 8개 테이블 + tbl_Settings 11개 키 입력 완료

**기본 E2E (phase2-v2-integration-test.md 기준):**
- [ ] 고객 E2E 플로우 (클래스 조회 → 결제 → 이메일) 전체 통과
- [ ] 파트너 E2E 플로우 (신청 → 승인 → 교육 → 클래스 등록 → 대시보드) 전체 통과

**Task 261/262 신규 기능 (본 문서 기준):**
- [ ] 검색어 하이라이트 `<mark>` 태그 정상 동작 (플로우 1)
- [ ] 카테고리 pill 필터 `is-active` 토글 정상 (플로우 1)
- [ ] 빈 검색 결과 상태 UI 정상 (플로우 1)
- [ ] 상세 페이지 별점 SVG 표시 (플로우 1)
- [ ] 상세 페이지 PC sticky 예약 패널 (플로우 1)

**보안 (본 문서 + phase2-v2-integration-test.md 기준):**
- [ ] WF-10 score 조작 방어 7가지 매트릭스 전체 통과
- [ ] WF-06 소유권 검증 (CLASS_NOT_FOUND 403) 통과
- [ ] WF-08 Admin 인증 (토큰 없음/잘못된 토큰 → 401) 통과
- [ ] XSS 방어 (javascript: URL, 스크립트 태그) 통과
- [ ] 자기결제 방지 (SELF_PURCHASE) 통과
- [ ] 프론트 소스에 API 키 미노출 확인

**성능:**
- [ ] Lighthouse 성능 80+ (클래스 목록, 상세 페이지)
- [ ] Lighthouse SEO 90+ (클래스 목록, 상세 페이지)
- [ ] 모든 페이지 콘솔 JavaScript 에러 0건

**통신:**
- [ ] CORS 에러 없이 n8n Webhook 호출 성공 (foreverlove.co.kr 브라우저에서)
- [ ] 텔레그램 알림 정상 수신 확인

### 8-2. 조건부 통과 항목 (운영 후 순차 검증 가능)

아래 항목은 실제 운영 데이터나 시간 경과가 필요하므로 배포 후 확인한다:

- [ ] WF-11 D-3/D-1 리마인더 이메일: 실제 스케줄 도래(매일 09:00) 후 확인
- [ ] WF-12 후기 요청 이메일: class_date+7일 경과 후 확인
- [ ] WF-05 결제 취소 폴링: 실제 취소 주문 발생 후 확인 (플로우 9)
- [ ] 교육 YouTube ENDED 이벤트: 실제 영상 끝까지 시청 완료로만 확인 가능
- [ ] Schema.org Google Rich Results: 구글 검색 색인 후 확인
- [ ] 대시보드 수익 탭 월별 탐색: 2개월 이상 정산 데이터 쌓인 후 완전 검증

---

## 테스트 결과 요약

테스트 일자: ___________
테스트 담당자: ___________
n8n 서버 버전: ___________
NocoDB 버전: ___________

### 섹션별 결과

| 섹션 | 총 항목 | 통과 | 실패 | 미실행 |
|------|--------|------|------|--------|
| 1. 테스트 환경 준비 | 준비 항목 | | | |
| 2-1. 플로우 1 (목록→상세→예약) | 11 | | | |
| 2-2. 플로우 2 (파트너 신청 분기) | 8 | | | |
| 2-3. 플로우 3 (교육 이수 매트릭스) | 12 | | | |
| 2-4. 플로우 4 (클래스 상태변경) | 5 | | | |
| 2-5. 플로우 5 (후기 답글) | 6 | | | |
| 2-6. 플로우 6 (대시보드 분기 6종) | 6 | | | |
| 2-7. 플로우 7 (교육 합격→활성화) | 4 | | | |
| 2-8. 플로우 8 (수익 리포트) | 5 | | | |
| 2-9. 플로우 9 (결제 취소) | 4 | | | |
| 3. 보안 테스트 | 14 | | | |
| 4. 반응형 테스트 | 11 | | | |
| 5. Lighthouse + Schema.org | 8 | | | |
| 6. CORS 실환경 확인 | 4 | | | |
| 7. 데이터 정리 | 5 | | | |
| **합계** | **103** | | | |

### 발견된 이슈 목록

| # | 심각도 | 플로우/섹션 | 증상 | 재현 방법 | 대응 방안 | 상태 |
|---|--------|-----------|------|----------|----------|------|
| 1 | Critical/Major/Minor | | | | | 미해결/해결 |
| 2 | | | | | | |

### 배포 판정

- [ ] **PASS** -- 섹션 8-1 필수 항목 전체 통과 → Phase 2 완료 선언
- [ ] **CONDITIONAL PASS** -- 필수 항목 Critical 0건, Minor 2건 이하 → 조건부 완료 (Minor 즉시 수정)
- [ ] **FAIL** -- Critical 항목 1건 이상 실패 → 수정 후 재테스트

---

## 부록: 빠른 참조

### NocoDB 핵심 API 패턴

```bash
# 테이블 레코드 조회
curl -s -H "xc-token: {NOCODB_TOKEN}" \
  "https://nocodb.pressco21.com/api/v1/db/data/noco/{PROJECT_ID}/{TABLE_NAME}?where=({FIELD},{eq},{VALUE})&limit=5" | jq '.list'

# 레코드 삭제
curl -X DELETE -H "xc-token: {NOCODB_TOKEN}" \
  "https://nocodb.pressco21.com/api/v1/db/data/noco/{PROJECT_ID}/{TABLE_NAME}/{ROW_ID}"
```

### n8n Webhook 엔드포인트 요약

| WF | 메서드 | 경로 | 인증 |
|----|--------|------|------|
| WF-01 | GET/POST | /webhook/class-api | 없음 |
| WF-02 | POST | /webhook/partner-auth | 없음 (member_id 필수) |
| WF-03 | POST | /webhook/partner-data | 없음 (partner_code 필수) |
| WF-04 | POST | /webhook/record-booking | 없음 |
| WF-06 | POST | /webhook/class-management | 없음 (partner_code 소유권 검증) |
| WF-07 | POST | /webhook/partner-apply | 없음 |
| WF-08 | POST | /webhook/partner-approve | Authorization: Bearer {ADMIN_API_TOKEN} |
| WF-09 | POST | /webhook/review-reply | 없음 (partner_code 소유권 검증) |
| WF-10 | POST | /webhook/education-complete | 없음 (member_id 필수) |

### 메이크샵 관련 참고

- 가상태그 `<!--/user_id/-->` : foreverlove.co.kr 서버에서만 치환 (로컬/curl 테스트 시 빈 문자열)
- JS 내 `\${variable}` 형식 필수 (백슬래시 이스케이프, 메이크샵 편집기 저장 오류 방지)
- 메이크샵 결제 실 결제는 테스트 불가 → 결제 페이지(`/shop/basket.html?goodsNo=...`) 이동까지만 확인
