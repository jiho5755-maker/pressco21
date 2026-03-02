# 메이크샵 D4(카멜레온) 개발 완전 가이드

> PRESSCO21 파트너클래스 플랫폼 개발 과정에서 겪은 모든 시행착오와 성공 패턴을 정리한 실전 가이드.
> 작성: 2026-02-27 | 기반 플랫폼: foreverlove.co.kr (메이크샵 D4 카멜레온)

---

## 목차

1. [메이크샵 개발 환경 개요](#1-메이크샵-개발-환경-개요)
2. [가상태그(치환코드) 완전 가이드](#2-가상태그치환코드-완전-가이드)
3. [편집기 저장 오류 3대 원인](#3-편집기-저장-오류-3대-원인)
4. [HTML 구조 제약사항](#4-html-구조-제약사항)
5. [JS 코딩 패턴](#5-js-코딩-패턴)
6. [CSS 코딩 패턴](#6-css-코딩-패턴)
7. [n8n 워크플로우 연동 패턴](#7-n8n-워크플로우-연동-패턴)
8. [NocoDB 연동 패턴](#8-nocodb-연동-패턴)
9. [메이크샵 Open API 패턴](#9-메이크샵-open-api-패턴)
10. [결제 플로우 완전 가이드](#10-결제-플로우-완전-가이드)
11. [페이지 구조와 크로스링크](#11-페이지-구조와-크로스링크)
12. [배포 체크리스트](#12-배포-체크리스트)

---

## 1. 메이크샵 개발 환경 개요

### 핵심 제약사항 요약

| 항목 | 제약 | 우회법 |
|------|------|--------|
| JS 프레임워크 | npm, 빌드 도구 금지 | Vanilla JS + CDN |
| JS 변수 선언 | `let`, `const` 사용 시 일부 편집기에서 저장 오류 | `var` 사용 |
| 템플릿 리터럴 | `${var}` → 치환코드로 오인 | `\${var}` 이스케이프 |
| 특수 문자 | 유니코드 이스케이프 없이 저장 실패 가능 | `\uXXXX` 형식 |
| CSS 파일 | 자동 주입 (`<link>` 태그 금지) | 편집기 CSS 탭 |
| JS 파일 | 자동 주입 (`<script>` 태그 금지) | 편집기 JS 탭 |
| 크로스링크 | 상대경로(`../폴더/`) 금지 | 절대경로(`/shop/page.html?id=XXXX`) |

### 개별 페이지 편집기 구조

메이크샵 D4 개별 페이지는 3개 탭으로 구성:
- **HTML 탭**: `<head>` + `<body>` 내용 (가상태그, 마크업)
- **CSS 탭**: 자동으로 `<style>` 태그로 `<head>`에 주입
- **JS 탭**: 자동으로 `<script>` 태그로 `<body>` 하단에 주입

→ HTML 탭에서 `<link href="css.css">` 또는 `<script src="js.js">` 추가하면 `/shop/css.css` 404 에러 발생!

---

## 2. 가상태그(치환코드) 완전 가이드

### 기본 형식

```html
<!-- 올바른 형식 -->
<!--/user_id/-->          ← 로그인 회원 ID
<!--/if_login/-->         ← 로그인 상태 IF 블록 시작
<!--/end_if/-->           ← IF 블록 종료 (항상 이 하나로만 닫음)
<!--/if_not_login/-->     ← 비로그인 IF 블록

<!-- 잘못된 형식 (v1 실패 원인) -->
{$member_id}              ← 메이크샵에서 사용하지 않는 형식
{%user_id%}               ← 잘못된 형식
```

### 검증된 가상태그 목록

```html
<!--/user_id/-->            → 로그인 회원 ID (jihoo5755 형태)
<!--/if_login/-->           → 로그인 상태면 표시
<!--/if_not_login/-->       → 비로그인 상태면 표시
<!--/end_if/-->             → IF 블록 종료
<!--/group_name/-->         → 회원 그룹명 (예: 강사회원)
<!--/group_level/-->        → 회원 그룹 레벨 (숫자)
```

### JS에서 가상태그 읽기 패턴

```html
<!-- HTML: 숨김 span에 가상태그 삽입 -->
<span id="paMemberId" style="display:none"><!--/user_id/--></span>
```

```javascript
// JS: textContent로 읽기
var memberEl = document.getElementById('paMemberId');
if (memberEl) {
    memberId = (memberEl.textContent || '').trim();
}

// 비로그인 판별
if (!memberId) {
    showArea('noticeArea');  // 로그인 안내
    return;
}
```

### 주의: HTML 가상태그 중첩 금지

```html
<!-- 위험: if_not_soldout 내부에 if_login 삽입 → 전체 템플릿 깨짐 -->
<!--/if_not_soldout/-->
    <!--/if_login/-->
        ...
    <!--/end_if/-->
<!--/end_if/-->

<!-- 안전: 가상태그 중첩 최소화, JS에서 동적 처리 -->
<span id="memberIdEl" style="display:none"><!--/user_id/--></span>
```

### 개별 페이지에서도 가상태그 동작 확인

Phase 1.5 테스트 결과:
- **로그인 시**: user_id="jihoo5755", group_name="강사회원", group_level="2" 정상 치환
- **비로그인 시**: 빈 문자열, `if_login` 내부 숨김 정상 동작
- **개별 페이지(id=XXXX)**: 일반 상품 페이지와 동일하게 가상태그 동작

---

## 3. 편집기 저장 오류 3대 원인

### 원인 1: 템플릿 리터럴 `${}` → 치환코드 오인

```javascript
// 실패: 메이크샵 엔진이 치환코드로 오인 → "데이터 수정 실패"
var url = `https://api.com/user/${userId}`;
var msg = `안녕하세요, ${name}님`;

// 성공: 백슬래시로 이스케이프 (백슬래시는 저장 후 사라짐)
var url = `https://api.com/user/\${userId}`;
var msg = `안녕하세요, \${name}님`;

// 또는 문자열 연결 방식 (가장 안전)
var url = 'https://api.com/user/' + userId;
var msg = '안녕하세요, ' + name + '님';
```

### 원인 2: `let` / `const` 선언

```javascript
// 실패 (일부 편집기 버전에서 저장 오류)
let count = 0;
const MAX = 10;

// 성공: var 사용
var count = 0;
var MAX = 10;
```

### 원인 3: 유니코드 특수문자 직접 삽입

```css
/* 실패: CSS content 속성에 특수문자 직접 삽입 */
.icon::before { content: '✓'; }
.icon::before { content: '→'; }

/* 성공: CSS 유니코드 이스케이프 */
.icon::before { content: '\2713'; }  /* ✓ */
.icon::before { content: '\2192'; }  /* → */
```

```javascript
// JS 문자열 내 한글 유니코드 (안전)
var msg = '\ud30c\ud2b8\ub108 \ud074\ub798\uc2a4';  // "파트너 클래스"
// 또는 한글 직접 사용 (대부분 OK)
var msg = '파트너 클래스';
```

### 메이크샵 편집기에서 안전한 JS 예시

```javascript
// 메이크샵 D4 호환 완전한 예시
(function() {
    'use strict';
    var API_URL = 'https://n8n.pressco21.com/webhook/class-api';
    var memberId = '';

    function init() {
        var el = document.getElementById('memberIdEl');
        if (el) memberId = (el.textContent || '').trim();

        // 동적 URL 구성 (템플릿 리터럴 대신 연결)
        var detailUrl = API_URL + '?action=getDetail&id=' + classId;

        // fetch 요청
        fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getClasses', member_id: memberId })
        })
        .then(function(resp) {
            if (!resp.ok) throw new Error('API 오류: ' + resp.status);
            return resp.json();
        })
        .then(function(data) {
            renderClasses(data);
        })
        .catch(function(err) {
            console.error('클래스 로드 실패:', err);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
```

---

## 4. HTML 구조 제약사항

### 4-1. CSS/JS 파일 포함 금지

```html
<!-- 실패: 메이크샵이 /shop/css.css, /shop/js.js로 해석 → 404 에러 -->
<head>
    <link rel="stylesheet" href="css.css">
</head>
<body>
    ...
    <script src="js.js"></script>
</body>

<!-- 성공: HTML 탭에는 마크업만. CSS는 CSS 탭, JS는 JS 탭에 작성 -->
<head>
    <!-- 외부 CDN만 허용 -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/...">
</head>
```

### 4-2. 절대경로 크로스링크 필수

```html
<!-- 실패: 개별 페이지에서 상대경로는 동작 안 함 -->
<a href="../목록/Index.html">목록</a>
<a href="../../파트너/Index.html">대시보드</a>

<!-- 성공: 메이크샵 페이지 ID 기반 절대경로 -->
<a href="/shop/page.html?id=2606">클래스 목록</a>
<a href="/shop/page.html?id=2607">클래스 상세</a>
<a href="/shop/page.html?id=2608">파트너 대시보드</a>
<a href="/shop/page.html?id=2609">파트너 신청</a>
<a href="/shop/page.html?id=2610">파트너 교육</a>
<a href="/shop/page.html?id=2611">강의 등록</a>
```

### 4-3. 메인페이지 Index.html 수정 금지

메인페이지 `Index.html`에는 원본 가상태그 손상 3곳(lines 802, 892, 1075)이 존재. 수정하면 파서 검증 오류 발생. **모든 개선은 `js.js`에서 동적 DOM 조작으로 처리**.

### 4-4. {중괄호} 패턴 주의

```html
<!-- 실패: HTML 내 {search_term_string} 형태는 치환코드로 오인 -->
<meta name="description" content="검색어: {query}">

<!-- 성공: JS에서 문자열 연결로 처리 -->
<meta id="metaDesc" name="description" content="">
<script>
document.getElementById('metaDesc').content = '검색어: ' + query;
</script>
```

---

## 5. JS 코딩 패턴

### 5-1. IIFE 패턴 (전역 오염 방지)

```javascript
/* ============================================
   페이지명 - js.js
   메이크샵 D4 호환: IIFE, var, \${} 이스케이프
   CSS 스코핑: .container-class
   ============================================ */
(function() {
    'use strict';

    // 설정값
    var API_URL = '...';

    // 상태 관리
    var state = { memberId: '' };

    // 초기화
    function init() { /* ... */ }

    // DOMContentLoaded 처리
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
```

### 5-2. n8n API 호출 표준 패턴

```javascript
// 로딩 스피너 + 에러 토스트 + 응답 처리 표준 패턴
function callApi(action, data, onSuccess, onError) {
    showSpinner();

    fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ action: action }, data))
    })
    .then(function(resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.json();
    })
    .then(function(result) {
        hideSpinner();
        if (result.success) {
            onSuccess(result.data);
        } else {
            var errMsg = ERROR_MESSAGES[result.error_code] || result.message || '오류가 발생했습니다';
            showToast(errMsg, 'error');
            if (onError) onError(result);
        }
    })
    .catch(function(err) {
        hideSpinner();
        showToast('서버와 통신에 실패했습니다. 잠시 후 다시 시도해 주세요.', 'error');
        if (onError) onError(err);
    });
}
```

### 5-3. n8n 응답 표준 형식

n8n 워크플로우는 항상 아래 형식으로 응답:

```json
// 성공
{ "success": true, "data": { ... }, "timestamp": "2026-02-27T12:00:00.000Z" }

// 실패
{ "success": false, "error_code": "NOT_PARTNER", "message": "파트너 인증에 실패했습니다" }
```

### 5-4. 에러 코드 분기 패턴

```javascript
var ERROR_MESSAGES = {
    'NOT_PARTNER': '파트너 인증에 실패했습니다. 파트너 신청 후 이용해 주세요.',
    'SELF_PURCHASE': '본인의 강의는 예약할 수 없습니다.',
    'NOT_LOGGED_IN': '로그인 후 이용해 주세요.',
    'DUPLICATE_BOOKING': '이미 예약하신 강의입니다.',
    'CAPACITY_EXCEEDED': '정원이 초과되었습니다.'
};
```

### 5-5. localStorage 캐시 패턴

```javascript
// 캐시 저장
function setCache(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify({
            data: data,
            ts: Date.now()
        }));
    } catch(e) {}
}

// 캐시 읽기
function getCache(key, ttl) {
    try {
        var item = localStorage.getItem(key);
        if (!item) return null;
        var parsed = JSON.parse(item);
        if (Date.now() - parsed.ts > ttl) {
            localStorage.removeItem(key);
            return null;
        }
        return parsed.data;
    } catch(e) {
        return null;
    }
}
```

---

## 6. CSS 코딩 패턴

### 6-1. 컨테이너 스코핑 (전역 스타일 충돌 방지)

```css
/* 실패: 전역 스타일은 기존 메이크샵 스타일과 충돌 */
.card { ... }
h2 { ... }
button { ... }

/* 성공: 컨테이너 클래스로 스코핑 */
.class-catalog .card { ... }
.class-catalog h2 { ... }
.class-detail .cta-btn { ... }
.partner-apply .form-field { ... }
```

### 6-2. 반응형 브레이크포인트

```css
/* 모바일 우선 기준 브레이크포인트 */
/* 768px: 태블릿 */
@media (min-width: 768px) { ... }

/* 992px: 소형 데스크탑 */
@media (min-width: 992px) { ... }

/* 1200px: 대형 데스크탑 */
@media (min-width: 1200px) { ... }
```

### 6-3. CSS content 속성 유니코드

```css
/* 실패: 특수문자 직접 삽입 → 편집기 저장 오류 가능 */
.check::before { content: '✓'; }
.star::before { content: '★'; }
.arrow::after { content: '→'; }

/* 성공: CSS 유니코드 이스케이프 */
.check::before { content: '\2713'; }   /* ✓ */
.star::before { content: '\2605'; }    /* ★ */
.arrow::after { content: '\2192'; }    /* → */
.heart::before { content: '\2665'; }   /* ♥ */
```

---

## 7. n8n 워크플로우 연동 패턴

### 7-1. 핵심 확인 사항: 모든 웹훅은 POST 전용

```javascript
// 실패: GET 요청 → 404 반환
fetch(API_URL + '?action=getClasses');

// 성공: POST + JSON body
fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'getClasses' })
});
```

### 7-2. 엔드포인트 목록

| 워크플로우 | 엔드포인트 | 주요 액션 |
|-----------|-----------|---------|
| WF-01 | `POST /class-api` | getClasses, getClassDetail (id 파라미터) |
| WF-02 | `POST /partner-auth` | getPartnerAuth, getPartnerDashboard |
| WF-03 | `POST /partner-data` | getPartnerBookings, getPartnerReviews |
| WF-04 | `POST /record-booking` | params: class_id, member_id, booking_date, participants, amount |
| WF-06 | `POST /class-management` | updateClassStatus |
| WF-07 | `POST /partner-apply` | 파트너 신청 |
| WF-08 | `POST /partner-approve` | Authorization: Bearer ${ADMIN_API_TOKEN: .secrets.env 참조} |
| WF-09 | `POST /review-reply` | replyToReview |
| WF-10 | `POST /education-complete` | answers=[...15개 정수 배열] |
| WF-15 | `POST /review-submit` | 수강 후기 작성 |
| WF-16 | `POST /class-register` | 강의 등록 |
| WF-17 | NocoDB Webhook | tbl_Classes status→active 변경 시 상품 자동 등록 |

### 7-3. n8n Switch v3 노드 버그 수정

```json
// 실패: rules.rules (잘못된 키)
{
  "rules": {
    "rules": [{ "conditions": [...] }]
  }
}

// 성공: rules.values (올바른 키)
{
  "rules": {
    "values": [{ "conditions": [...] }]
  },
  "fallbackOutput": 0   // ← parameters 최상위에 위치해야 함 (rules 내부 아님!)
}
```

### 7-4. n8n IF v1 → v2 업그레이드

```json
// v1 형식 (저장 시 오류 가능)
{
  "conditions": {
    "simple": [{ "value1": "...", "operation": "equals" }]
  }
}

// v2 형식 (올바름)
{
  "conditions": {
    "conditions": [
      {
        "leftValue": "={{ $json.status }}",
        "rightValue": "active",
        "operator": { "type": "string", "operation": "equals" }
      }
    ]
  }
}
```

### 7-5. n8n 병렬 실행 버그 (핵심!)

**문제**: 두 노드가 동일 Code 노드의 input 0에 연결 시 → 첫 번째 완료 시 Code 노드 즉시 실행 → 두 번째 노드 참조 시 "hasn't been executed" 오류

```
오류 메시지: Cannot assign to read only property 'name' of object
'Error: Node 'X' hasn't been executed'
```

**해결**: 모든 병렬 패턴을 순차(A→B→C) 실행으로 변경

```javascript
// Code 노드에서 이전 노드 참조
const dataFromPrev = $('이전노드명').first().json;  // 이전 노드
const currentData = $input.first().json;              // 현재 입력 (마지막 노드)
```

### 7-6. n8n 워크플로우 활성화 API

```bash
# 실패: PATCH 메서드 사용
PATCH /api/v1/workflows/{id}

# 성공: POST /activate
POST /api/v1/workflows/{id}/activate
```

### 7-7. NocoDB Webhook → n8n 연동 형식

NocoDB After Update 이벤트 → n8n으로 전송되는 형식:

```json
{
    "type": "records.after.update",
    "data": {
        "rows": [{ ...현재 레코드... }],
        "previous_rows": [{ ...이전 레코드... }]
    }
}
```

n8n Webhook v2 노드에서 받으면 `$input.first().json.body`가 아닌 `$input.first().json`으로 접근:

```javascript
// WF-17 Parse 노드에서 올바른 파싱
const input = $input.first().json;
const body = input.body || input;  // 직접 또는 body 래핑 모두 처리

if (body.data && body.data.rows && body.data.rows.length > 0) {
    record = body.data.rows[0];
    prevRecord = body.data.previous_rows?.[0] || {};
}
```

---

## 8. NocoDB 연동 패턴

### 8-1. API 인증 방식

```javascript
// 실패: Airtable Bearer 토큰 방식
headers: { 'Authorization': 'Bearer TOKEN' }

// 성공: NocoDB xc-token 헤더
headers: { 'xc-token': '${NOCODB_API_TOKEN: .secrets.env 참조}' }
```

### 8-2. API URL 구조

```
https://nocodb.pressco21.com/api/v1/db/data/noco/{projectId}/{tableId}

예시:
GET  https://nocodb.pressco21.com/api/v1/db/data/noco/poey1yrm1r6sthf/tbl_Classes
POST https://nocodb.pressco21.com/api/v1/db/data/noco/poey1yrm1r6sthf/tbl_Classes
```

### 8-3. where 파라미터 형식

```javascript
// 실패: Airtable filterByFormula 방식
?filterByFormula=AND(status='active')

// 성공: NocoDB where 파라미터
?where=(status,eq,active)
?where=(status,eq,active)~and(partner_code,eq,PC_202602_001)
?where=(CreatedAt,gte,2026-01-01)

// 정렬
?sort=-CreatedAt          // 내림차순
?sort=CreatedAt           // 오름차순
```

### 8-4. 실제 테이블 필드명 (오류 방지)

**주의: NocoDB는 생성 날짜 필드가 `CreatedAt` (자동 생성, `created_date` 아님)**

```javascript
// tbl_Settlements 필드명
// CreatedAt, settlement_id, order_id, partner_code, class_id, member_id,
// order_amount, commission_rate, commission_amount, reserve_rate, reserve_amount,
// class_date, settlement_due_date, student_count, status,
// student_name, student_email, student_phone, retry_count, completed_date

// tbl_Applications 필드명
// CreatedAt, application_id, member_id, name, studio_name,
// email, phone, location, specialty, introduction, status

// tbl_Classes 필드명
// class_id, title, partner_code, status, price, max_students,
// location, image_url, description, makeshop_product_id, ...

// tbl_Partners 필드명
// member_id, partner_code, name, status, grade,
// commission_rate, reserve_rate, ...
```

### 8-5. sort 파라미터 주의사항

```javascript
// 실패: 존재하지 않는 필드명 → ERR_FIELD_NOT_FOUND
?sort=-created_date

// 성공: 실제 NocoDB 자동 생성 필드명 사용
?sort=-CreatedAt
```

---

## 9. 메이크샵 Open API 패턴

### 9-1. API URL (핵심 실수 방지)

```javascript
// 실패: 잘못된 URL
'https://foreverlove.co.kr/open_api.html'

// 성공: 올바른 URL (파일명 주의!)
'https://foreverlove.co.kr/open_api_process.html'
```

### 9-2. Licensekey 전송 형식

```javascript
// 실패: base64 디코딩 후 전송
var decoded = atob(licensekey);  // 오류

// 성공: base64 그대로 전송 (디코딩하지 않음!)
var params = new URLSearchParams();
params.append('Licensekey', licensekey);  // base64 문자열 그대로
params.append('ssl', '1');
// ...
```

### 9-3. 적립금 API (process_reserve)

```javascript
// 적립금 지급 (파트너 수수료)
var params = new URLSearchParams();
params.append('Licensekey', licensekey);  // base64 그대로
params.append('ssl', '1');
params.append('mode', 'member_reserve_process');
params.append('exec_type', 'plus');     // plus=지급, minus=차감
params.append('id', memberId);          // 받을 회원 ID
params.append('reserve', amount);       // 금액 (숫자)
params.append('memo', '파트너 수수료 - ' + className);

// 성공 응답
// { "total_count": 1, "data": [{ "result": "0", "id": "jihoo5755" }] }
// result="0" → 성공

// 에러 응답
// { "error_code": "E001", "error_msg": "..." }
```

### 9-4. 상품 등록 API

```javascript
// 상품 등록 성공 패턴
var params = new URLSearchParams();
params.append('Licensekey', licensekey);
params.append('ssl', '1');
params.append('mode', 'goods_write_api');
params.append('goods_name', title);      // 상품명
params.append('price', price);           // 판매가
params.append('saleprice', price);       // 할인가
params.append('shipprice', 0);           // 배송비 0
params.append('sell_ok', 'y');           // 판매 여부
params.append('goods_made_country', 'K'); // 국내
params.append('xcode', 'personal');      // 개인결제 카테고리
// !! cate1 파라미터 추가 주의: 실제 쇼핑몰에서 테스트 필요
// cate1=022 등은 쇼핑몰 리뉴얼 후 무효화될 수 있음
// cate1 파라미터 없이도 등록 가능 (개인결제 기본 분류)
```

**중요 발견사항**:
- `xcode=personal`로 API 등록해도 실제 DB에는 `xcode=000`, `mcode=000`으로 저장됨
- `brandcode`는 상품마다 순차 할당됨 (000000000160, 000000000161...)
- `cate1=022` 같은 카테고리 코드는 쇼핑몰 리뉴얼 후 무효화될 수 있어 주의

### 9-5. API 성공/에러 응답 판별

```javascript
// 성공 응답 예시
{ "total_count": 1, "data": [{ "branduid": "12195513" }] }
// → data[0].branduid로 상품 ID 추출

// 에러 응답 예시
{ "error_code": "9999", "error_msg": "카테고리 코드가 유효하지 않습니다" }
// → error_code 필드 확인

function handleApiResponse(data) {
    if (data.error_code) {
        console.error('API 에러:', data.error_code, data.error_msg);
        return null;
    }
    if (data.total_count > 0 && data.data && data.data.length > 0) {
        return data.data[0];
    }
    return null;
}
```

---

## 10. 결제 플로우 완전 가이드

### 10-1. 개인결제 URL 함정

```javascript
// 실패: personal.html → 관리자 전용, 일반 접근 시 흰 화면!
window.location.href = '/shop/personal.html?branduid=' + brandUid;

// 성공: shopdetail.html 사용 (상품 상세 페이지)
window.location.href = '/shop/shopdetail.html?branduid=' + brandUid;
```

`personal.html`은 메이크샵 관리자 전용 개인결제 생성 페이지이며, 일반 고객이 접근하면 빈 화면이 표시됩니다.

### 10-2. 즉시 구매 → 주문서 직행 (수량 반영)

상품 상세를 거치지 않고 바로 주문서로 이동하려면 `basket.action.html`에 POST해야 합니다.

**핵심 발견**: brandcode는 상품마다 다르게 순차 할당 → 하드코딩 불가 → 동적 추출 필수

```javascript
/**
 * basket.action.html POST 공통 함수 (바로 구매 → order.html)
 * - xcode=000, mcode=000 이 개인결제 상품에서 확인된 실제 값
 * - amount[] 로 수량(인원) 전달
 */
function doBasketPost(brandUid, qty, productName, brandCode, xC, mC) {
    var pName = productName || '파트너 클래스';
    var bCode = brandCode;
    var mCode2 = mC || '001';

    var params = new URLSearchParams();
    params.append('totalnum', '');
    params.append('collbrandcode', '');
    params.append('xcode', xC);
    params.append('mcode', mCode2);
    params.append('typep', 'X');
    params.append('aramount', '');
    params.append('arspcode', '');
    params.append('arspcode2', '');
    params.append('optionindex', '');
    params.append('alluid', '');
    params.append('alloptiontype', '');
    params.append('aropts', '');
    params.append('checktype', '');
    params.append('ordertype', 'baro|parent.|layer');  // 바로 구매
    params.append('brandcode', bCode);
    params.append('branduid', String(brandUid));
    params.append('cart_free', '');
    params.append('opt_type', 'NO');
    params.append('basket_use', 'Y');
    params.append('amount[]', String(qty));             // 수량
    params.append('option[basic][0][0][opt_id]', '0');
    params.append('option[basic][0][0][opt_value]', pName);
    params.append('option[basic][0][0][opt_stock]', '1');
    params.append('option[basic][0][0][sto_id]', '1');
    params.append('option[basic][0][0][opt_type]', 'undefined');

    fetch('/shop/basket.action.html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
    })
    .then(function(resp) {
        if (!resp.ok) throw new Error('basket.action 실패: ' + resp.status);
        return resp.json();
    })
    .then(function(data) {
        if (data && data.status && data.etc_data && data.etc_data.baro_type === 'baro') {
            window.location.href = '/shop/order.html';
        } else {
            window.location.href = '/shop/basket.html';
        }
    })
    .catch(function() {
        window.location.href = '/shop/order.html';  // 폴백
    });
}
```

### 10-3. 개인결제 상품 brandcode 동적 추출

```javascript
/**
 * 개인결제 상품 즉시 구매 진입점
 * xcode=personal 상품: shopdetail.html에서 brandcode를 파싱해야 함
 * (brandcode는 000000000160, 000000000161... 형태로 상품마다 다름)
 */
function goToCheckout(brandUid, qty, productName) {
    // shopdetail.html fetch → brandcode 추출 → basket.action.html POST
    fetch('/shop/shopdetail.html?branduid=' + String(brandUid))
        .then(function(resp) { return resp.text(); })
        .then(function(html) {
            var parser = new DOMParser();
            var doc = parser.parseFromString(html, 'text/html');
            var extractedBrandcode = '';

            // input[name="brandcode"] 중 값이 있는 것 추출
            doc.querySelectorAll('input[name="brandcode"]').forEach(function(inp) {
                if (inp.value && inp.value.length > 5) {
                    extractedBrandcode = inp.value;
                }
            });

            if (extractedBrandcode) {
                // xcode=000, mcode=000 : API 등록 시 personal이어도 실제 값은 000
                doBasketPost(brandUid, qty, productName, extractedBrandcode, '000', '000');
            } else {
                // 추출 실패 시 상품 상세 페이지로 폴백
                window.location.href = '/shop/shopdetail.html?branduid=' + String(brandUid);
            }
        })
        .catch(function() {
            window.location.href = '/shop/shopdetail.html?branduid=' + String(brandUid);
        });
}
```

### 10-4. 결제 전 예약 기록 패턴 (2단계 예약)

1단계: WF-04 API 호출 → NocoDB `tbl_Settlements`에 `PENDING_SETTLEMENT` 기록
2단계: 성공 시 결제 페이지로 이동

```javascript
function handleBookingClick() {
    if (!memberId) {
        if (confirm('예약은 로그인 후 이용할 수 있습니다. 로그인 페이지로 이동할까요?')) {
            window.location.href = '/member/login.html';
        }
        return;
    }

    // WF-04 예약 기록
    fetch(BOOKING_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            class_id: classData.class_id,
            member_id: memberId,
            booking_date: selectedDate,
            participants: participantCount,
            amount: classData.price * participantCount
        })
    })
    .then(function(resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.json();
    })
    .then(function(result) {
        if (result.success) {
            // 파트너 자기 강의 예약 → 안내 후 중단
            if (result.data && result.data.status === 'SELF_PURCHASE') {
                showToast('본인의 강의는 예약할 수 없습니다.', 'warning');
                return;
            }
            alert('예약이 접수되었습니다. 결제 페이지로 이동합니다.');
            goToCheckout(classData.makeshop_product_id, participantCount, classData.title);
        } else {
            var errMsg = ERROR_MESSAGES[result.error_code] || '예약 처리 중 오류가 발생했습니다.';
            showToast(errMsg, 'error');
        }
    })
    .catch(function() {
        showToast('서버와 통신에 실패했습니다.', 'error');
    });
}
```

### 10-5. 결제 URL 요약

| 용도 | URL |
|------|-----|
| 상품 상세 (일반) | `/shop/shopdetail.html?branduid=XXX` |
| 바로 구매 → 주문서 | `POST /shop/basket.action.html` → `/shop/order.html` |
| 장바구니 | `/shop/basket.html` |
| 로그인 | `/member/login.html` |
| ~~개인결제~~ (금지!) | `/shop/personal.html` ← **관리자 전용, 일반 접근 시 흰 화면** |

---

## 11. 페이지 구조와 크로스링크

### 11-1. 확정된 메이크샵 페이지 ID

```javascript
// PRESSCO21 파트너클래스 플랫폼 페이지 ID
var PAGES = {
    catalog:     '/shop/page.html?id=2606',  // 클래스 목록
    detail:      '/shop/page.html?id=2607',  // 클래스 상세
    dashboard:   '/shop/page.html?id=2608',  // 파트너 대시보드
    apply:       '/shop/page.html?id=2609',  // 파트너 신청
    education:   '/shop/page.html?id=2610',  // 파트너 교육
    classReg:    '/shop/page.html?id=2611'   // 강의 등록 (신규)
};
```

### 11-2. 로컬 파일 구조 → 메이크샵 매핑

```
파트너클래스/
├── 목록/          → 개별 페이지 ID=2606
│   ├── Index.html → HTML 탭
│   ├── css.css    → CSS 탭
│   └── js.js      → JS 탭
├── 상세/          → 개별 페이지 ID=2607
├── 파트너/        → 개별 페이지 ID=2608
├── 파트너신청/    → 개별 페이지 ID=2609
├── 교육/          → 개별 페이지 ID=2610
├── 강의등록/      → 개별 페이지 ID=2611
└── n8n-workflows/ → Oracle Cloud n8n 서버에 임포트
```

### 11-3. 메이크샵 편집기 배포 순서

1. **HTML 탭**: `Index.html` 내용 붙여넣기 (단, `<link>`, `<script>` 태그 제외)
2. **CSS 탭**: `css.css` 내용 붙여넣기
3. **JS 탭**: `js.js` 내용 붙여넣기 (주의: 편집기 재저장 시 기존 내용 전체 교체)
4. **저장 확인**: 저장 후 실제 URL에서 F5로 확인

---

## 12. 배포 체크리스트

### 메이크샵 편집기 저장 전 확인

- [ ] `${var}` → `\${var}` 이스케이프 처리 여부
- [ ] `let`/`const` → `var` 교체 여부
- [ ] CSS `content` 특수문자 → 유니코드 이스케이프 여부
- [ ] `<link href="css.css">` 또는 `<script src="js.js">` 없는지 확인
- [ ] 크로스링크가 절대경로(`/shop/page.html?id=XXXX`) 형식인지 확인
- [ ] 가상태그 형식이 `<!--/tag_name/-->` 인지 확인 (중괄호 형식 금지)

### n8n 워크플로우 배포 전 확인

- [ ] 모든 웹훅이 POST 메서드로 설정되었는지 확인
- [ ] Switch v3 노드의 키가 `rules.values` (rules.rules 아님)
- [ ] IF 노드가 v2 형식 (`conditions.conditions[]`) 사용
- [ ] 병렬 실행 패턴 없는지 확인 (모두 순차 실행으로)
- [ ] Credentials 연결 여부 (NocoDB, SMTP, Telegram, Admin-Token)
- [ ] 워크플로우 Active 상태 확인

### NocoDB 데이터 확인

- [ ] 필드명이 실제 NocoDB 스키마와 일치하는지 확인 (`CreatedAt` 등)
- [ ] sort 파라미터에 존재하는 필드명 사용 여부
- [ ] where 파라미터 형식이 올바른지 (`(field,op,value)~and(...)`)

### 결제 플로우 확인

- [ ] `personal.html` URL 사용하지 않는지 확인 (흰 화면 함정)
- [ ] `basket.action.html` POST 시 brandcode 동적 추출 코드 있는지
- [ ] WF-04 예약 기록 → NocoDB 저장 → 결제 이동 순서 확인

---

## 부록: 자주 쓰는 메이크샵 내부 URL

```
/member/login.html          → 로그인 페이지
/shop/basket.html           → 장바구니
/shop/order.html            → 주문서
/shop/shopdetail.html       → 상품 상세 (branduid 파라미터)
/shop/basket.action.html    → 장바구니 담기 + 즉시 구매 (POST)
/shop/page.html             → 개별 페이지 (id 파라미터)
/open_api_process.html      → 메이크샵 Open API 엔드포인트
/mypage/index.html          → 마이페이지
```

---

*이 가이드는 실제 개발 경험 기반 시행착오 모음입니다. 메이크샵 정책 변경에 따라 일부 내용이 달라질 수 있습니다.*
