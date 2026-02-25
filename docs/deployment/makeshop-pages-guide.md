# 메이크샵 D4 파트너클래스 5개 페이지 등록 가이드

> **작성일**: 2026-02-25
> **대상**: 메이크샵 관리자 (foreverlove.co.kr)
> **목적**: 파트너클래스 5개 개별 페이지를 메이크샵 D4에 등록하고, 내부 링크 및 n8n 워크플로우의 URL을 실제 페이지 ID로 교체하는 전체 절차

---

## 목차

1. [등록할 5개 페이지 목록](#1-등록할-5개-페이지-목록)
2. [메이크샵 D4 개별 페이지 등록 절차](#2-메이크샵-d4-개별-페이지-등록-절차)
3. [페이지 ID 기록표](#3-페이지-id-기록표)
4. [내부 링크 절대경로 변환 가이드 (12곳)](#4-내부-링크-절대경로-변환-가이드-12곳)
5. [목록/js.js 상세 페이지 ID 수정 지침](#5-목록jsjs-상세-페이지-id-수정-지침)
6. [n8n 워크플로우 URL 수정 지침 (WF-04, WF-10, WF-12)](#6-n8n-워크플로우-url-수정-지침)
7. [n8n CORS 확인](#7-n8n-cors-확인)
8. [배포 후 테스트 체크리스트](#8-배포-후-테스트-체크리스트)

---

## 1. 등록할 5개 페이지 목록

| 순서 | 페이지 | 소스 폴더 | 파일 구성 |
|------|--------|----------|----------|
| 1 | 클래스 목록 | `파트너클래스/목록/` | Index.html, css.css, js.js |
| 2 | 클래스 상세 | `파트너클래스/상세/` | Index.html, css.css, js.js |
| 3 | 파트너 신청 | `파트너클래스/파트너신청/` | Index.html, css.css, js.js |
| 4 | 파트너 교육 | `파트너클래스/교육/` | Index.html, css.css, js.js |
| 5 | 파트너 대시보드 | `파트너클래스/파트너/` | Index.html, css.css, js.js |

**등록 순서가 중요한 이유**: 목록 -> 상세 순으로 등록해야 목록 페이지의 상세 링크 ID를 확정할 수 있습니다.

---

## 2. 메이크샵 D4 개별 페이지 등록 절차

### 사전 준비
- 메이크샵 관리자 계정 로그인 확인
- 위 5개 폴더의 파일 내용을 클립보드에 복사할 수 있도록 준비

### 단계별 진행 (페이지 1개 기준)

**Step 1. 관리자 페이지 이동**
```
메이크샵 관리자 로그인
  -> 상점관리
  -> 화면설정
  -> 개별 페이지 관리
```

**Step 2. 새 페이지 추가**
- "새 페이지 추가" (또는 "페이지 추가") 버튼 클릭

**Step 3. 페이지명 입력**
- 관리용 페이지명을 입력합니다 (방문자에게 보이지 않음, 관리자 식별용)
- 권장 이름:

| 순서 | 권장 페이지명 |
|------|------------|
| 1 | 파트너 클래스 목록 |
| 2 | 파트너 클래스 상세 |
| 3 | 파트너 신청 |
| 4 | 파트너 교육 |
| 5 | 파트너 대시보드 |

**Step 4. HTML 탭에 내용 붙여넣기**
- 해당 폴더의 `Index.html` 파일 전체 내용을 복사
- 메이크샵 편집기의 HTML 탭에 붙여넣기

**Step 5. CSS 탭에 내용 붙여넣기**
- 해당 폴더의 `css.css` 파일 전체 내용을 복사
- CSS 탭에 붙여넣기

**Step 6. JS 탭에 내용 붙여넣기**
- 해당 폴더의 `js.js` 파일 전체 내용을 복사
- JS 탭에 붙여넣기

> **주의**: 메이크샵 편집기에서 JS 코드 내 `${variable}` 패턴이 있으면 저장이 실패합니다.
> 현재 코드는 모두 문자열 연결 방식으로 처리되어 있으므로 정상 저장됩니다.
> 만약 "데이터 수정 실패" 오류가 발생하면, JS에 `${...}` 패턴이 없는지 다시 확인하세요.

**Step 7. 저장 및 페이지 ID 확인**
- "저장" 버튼 클릭
- 저장 후 자동으로 숫자 ID가 부여됩니다
- 확인 방법:
  1. 개별 페이지 관리 목록에서 방금 등록한 페이지를 찾습니다
  2. 해당 페이지의 URL 또는 ID 컬럼에 표시된 숫자를 기록합니다
  3. 또는 "미리보기" 링크의 URL에서 `id=` 뒤의 숫자를 확인합니다

**Step 8. URL 접속 테스트**
- 브라우저에서 확인:
```
https://foreverlove.co.kr/shop/page.html?id=확인한ID
```
- 페이지가 정상적으로 표시되는지 확인합니다

### 5개 페이지 모두 반복
- 위 Step 1~8을 5개 페이지 모두에 대해 반복합니다
- **반드시 1번(목록) -> 2번(상세) -> 3번(파트너신청) -> 4번(교육) -> 5번(대시보드) 순서대로 등록**하세요

---

## 3. 페이지 ID 기록표

5개 페이지 등록 후, 아래 표에 실제 ID를 기입하세요. 이 ID들은 다음 단계(내부 링크 수정)에서 사용됩니다.

| 페이지 | 등록 후 확인한 ID | 확인한 URL |
|-------|----------------|-----------|
| 클래스 목록 | ________ | `https://foreverlove.co.kr/shop/page.html?id=________` |
| 클래스 상세 | ________ | `https://foreverlove.co.kr/shop/page.html?id=________` |
| 파트너 신청 | ________ | `https://foreverlove.co.kr/shop/page.html?id=________` |
| 파트너 교육 | ________ | `https://foreverlove.co.kr/shop/page.html?id=________` |
| 파트너 대시보드 | ________ | `https://foreverlove.co.kr/shop/page.html?id=________` |

> 이 표는 아래 4~6번 섹션에서 참조됩니다. 기록 후 진행하세요.

---

## 4. 내부 링크 절대경로 변환 가이드 (12곳)

현재 소스 코드에는 `../폴더명/` 형태의 상대경로가 사용되어 있습니다. 메이크샵 개별 페이지에서는 상대경로가 동작하지 않으므로, 등록한 페이지 ID를 사용한 절대경로로 교체해야 합니다.

### 변환 규칙
```
../목록/          ->  /shop/page.html?id={목록ID}
../상세/          ->  /shop/page.html?id={상세ID}
../파트너신청/     ->  /shop/page.html?id={파트너신청ID}
../교육/          ->  /shop/page.html?id={교육ID}
../파트너/         ->  /shop/page.html?id={대시보드ID}
```

---

### 파일별 수정 위치

### 4-1. 상세/Index.html (2곳)

**L36: 브레드크럼 -- "파트너 클래스" 링크**
```html
-- 현재:
<a href="../목록/">파트너 클래스</a>

-- 변경:
<a href="/shop/page.html?id={목록ID}">파트너 클래스</a>
```

**L79: 에러 화면 -- "목록으로 돌아가기" 링크**
```html
-- 현재:
<a href="../목록/" class="detail-error__back">목록으로 돌아가기</a>

-- 변경:
<a href="/shop/page.html?id={목록ID}" class="detail-error__back">목록으로 돌아가기</a>
```

---

### 4-2. 상세/js.js (2곳)

**L72: classId 없을 때 목록으로 리다이렉트**
```javascript
-- 현재:
window.location.href = '../목록/';

-- 변경:
window.location.href = '/shop/page.html?id={목록ID}';
```

**L646: 강사 프로필 -- "다른 클래스 보기" 링크**
```javascript
-- 현재:
html += '<a href="../목록/?partner=' + encodeURIComponent(partner.partner_code) + '" class="instructor-action-btn instructor-action-btn--primary">'

-- 변경:
html += '<a href="/shop/page.html?id={목록ID}&partner=' + encodeURIComponent(partner.partner_code) + '" class="instructor-action-btn instructor-action-btn--primary">'
```

---

### 4-3. 파트너/Index.html (2곳)

**L52: 교육 미이수 안내 -- "파트너 신청하기" 링크**
```html
-- 현재:
<a href="../파트너신청/" class="pd-notice__btn pd-notice__btn--outline">파트너 신청하기</a>

-- 변경:
<a href="/shop/page.html?id={파트너신청ID}" class="pd-notice__btn pd-notice__btn--outline">파트너 신청하기</a>
```

**L71: 비파트너 안내 -- "파트너 신청하기" 링크**
```html
-- 현재:
<a href="../파트너신청/" class="pd-notice__btn">파트너 신청하기</a>

-- 변경:
<a href="/shop/page.html?id={파트너신청ID}" class="pd-notice__btn">파트너 신청하기</a>
```

---

### 4-4. 파트너신청/Index.html (1곳)

**L93: 이미 파트너 안내 -- "파트너 대시보드로 이동" 링크**
```html
-- 현재:
<a href="../파트너/" class="pa-notice__btn">파트너 대시보드로 이동</a>

-- 변경:
<a href="/shop/page.html?id={대시보드ID}" class="pa-notice__btn">파트너 대시보드로 이동</a>
```

---

### 4-5. 교육/Index.html (3곳)

**L56: 비파트너 안내 -- "파트너 신청하기" 링크**
```html
-- 현재:
<a href="../파트너신청/" class="pe-notice__btn">파트너 신청하기</a>

-- 변경:
<a href="/shop/page.html?id={파트너신청ID}" class="pe-notice__btn">파트너 신청하기</a>
```

**L73: 이미 이수 완료 -- "파트너 대시보드로 이동" 링크**
```html
-- 현재:
<a href="../파트너/" class="pe-notice__btn">파트너 대시보드로 이동</a>

-- 변경:
<a href="/shop/page.html?id={대시보드ID}" class="pe-notice__btn">파트너 대시보드로 이동</a>
```

**L264: 퀴즈 합격 결과 -- "파트너 대시보드로 이동" 링크**
```html
-- 현재:
<a href="../파트너/" class="pe-result__btn">파트너 대시보드로 이동</a>

-- 변경:
<a href="/shop/page.html?id={대시보드ID}" class="pe-result__btn">파트너 대시보드로 이동</a>
```

---

### 4-6. 목록/js.js (2곳) -- 상세 페이지 ID 관련

**L453: 클래스 카드 클릭 시 상세 이동 URL**
```javascript
-- 현재:
var detailUrl = '/shop/page.html?id=2607&class_id=' + encodeURIComponent(classId);

-- 변경:
var detailUrl = '/shop/page.html?id={상세ID}&class_id=' + encodeURIComponent(classId);
```
> `2607`은 임시 ID입니다. 상세 페이지 등록 후 확인한 실제 ID로 교체하세요.

**L1411: SEO 구조화 데이터(JSON-LD) 내 상세 URL**
```javascript
-- 현재:
var detailUrl = 'https://foreverlove.co.kr/shop/page.html?id=CLASS_DETAIL_PAGE_ID&class_id=' + classId;

-- 변경:
var detailUrl = 'https://foreverlove.co.kr/shop/page.html?id={상세ID}&class_id=' + classId;
```
> `CLASS_DETAIL_PAGE_ID`는 플레이스홀더입니다. 실제 ID로 교체하세요.

---

### 수정 요약 테이블

| # | 파일 | 줄번호 | 현재 값 | 교체할 값 | 필요한 ID |
|---|------|--------|---------|----------|----------|
| 1 | 상세/Index.html | L36 | `../목록/` | `/shop/page.html?id={목록ID}` | 목록 |
| 2 | 상세/Index.html | L79 | `../목록/` | `/shop/page.html?id={목록ID}` | 목록 |
| 3 | 상세/js.js | L72 | `../목록/` | `/shop/page.html?id={목록ID}` | 목록 |
| 4 | 상세/js.js | L646 | `../목록/?partner=` | `/shop/page.html?id={목록ID}&partner=` | 목록 |
| 5 | 파트너/Index.html | L52 | `../파트너신청/` | `/shop/page.html?id={파트너신청ID}` | 파트너신청 |
| 6 | 파트너/Index.html | L71 | `../파트너신청/` | `/shop/page.html?id={파트너신청ID}` | 파트너신청 |
| 7 | 파트너신청/Index.html | L93 | `../파트너/` | `/shop/page.html?id={대시보드ID}` | 대시보드 |
| 8 | 교육/Index.html | L56 | `../파트너신청/` | `/shop/page.html?id={파트너신청ID}` | 파트너신청 |
| 9 | 교육/Index.html | L73 | `../파트너/` | `/shop/page.html?id={대시보드ID}` | 대시보드 |
| 10 | 교육/Index.html | L264 | `../파트너/` | `/shop/page.html?id={대시보드ID}` | 대시보드 |
| 11 | 목록/js.js | L453 | `id=2607` | `id={상세ID}` | 상세 |
| 12 | 목록/js.js | L1411 | `id=CLASS_DETAIL_PAGE_ID` | `id={상세ID}` | 상세 |

---

## 5. 목록/js.js 상세 페이지 ID 수정 지침

목록 페이지의 js.js에는 상세 페이지로 이동하는 URL이 2곳 있습니다. 모두 상세 페이지 등록 후 확인한 실제 ID로 교체해야 합니다.

### 수정 방법

1. 메이크샵 관리자 > 개별 페이지 관리 > "파트너 클래스 목록" 페이지 편집
2. JS 탭 열기
3. **L453** (Ctrl+G 또는 Ctrl+F로 `2607` 검색):
   ```
   검색: id=2607
   교체: id=실제상세ID
   ```
4. **L1411** (Ctrl+F로 `CLASS_DETAIL_PAGE_ID` 검색):
   ```
   검색: id=CLASS_DETAIL_PAGE_ID
   교체: id=실제상세ID
   ```
5. 저장

> 두 군데 모두 같은 "상세 페이지 ID" 값을 넣으면 됩니다.

---

## 6. n8n 워크플로우 URL 수정 지침

이메일 CTA 버튼에 `/partner/dashboard`, `/partner/academy` 같은 임시 경로가 사용되고 있습니다. 메이크샵 개별 페이지 URL 형식으로 교체해야 합니다.

### 6-1. WF-10: 교육 완료 워크플로우

**파일**: `파트너클래스/n8n-workflows/WF-10-education-complete.json`

**수정 1 -- 합격 이메일 CTA (L187, "Build Certificate Email" 노드 내부)**

Code 노드의 jsCode 문자열 안에서 다음을 검색하세요:
```
검색: https://foreverlove.co.kr/partner/dashboard
교체: https://foreverlove.co.kr/shop/page.html?id={대시보드ID}
```
이 URL은 합격 이메일의 "파트너 대시보드 바로가기" 버튼 링크입니다.

**수정 2 -- 불합격 이메일 CTA (L280, "Build Retry Email" 노드 내부)**

Code 노드의 jsCode 문자열 안에서 다음을 검색하세요:
```
검색: https://foreverlove.co.kr/partner/academy
교체: https://foreverlove.co.kr/shop/page.html?id={교육ID}
```
이 URL은 불합격 이메일의 "다시 퀴즈 응시하기" 버튼 링크입니다.

### 6-2. WF-04: 예약 기록 워크플로우

**파일**: `파트너클래스/n8n-workflows/WF-04-record-booking.json`

**수정 -- 파트너 예약 알림 이메일 CTA (L344, "Build Partner Email" 노드 내부)**

Code 노드의 jsCode 문자열 안에서 다음을 검색하세요:
```
검색: https://foreverlove.co.kr/partner/dashboard
교체: https://foreverlove.co.kr/shop/page.html?id={대시보드ID}
```
이 URL은 파트너에게 보내는 새 예약 알림 이메일의 "대시보드에서 확인하기" 버튼 링크입니다.

### 6-3. WF-12: 후기 요청 워크플로우

**파일**: `파트너클래스/n8n-workflows/WF-12-review-requests.json`

**수정 -- 파트너 후기 알림 이메일 CTA (L152, "Build Review Emails" 노드 내부)**

Code 노드의 jsCode 문자열 안에서 다음을 검색하세요:
```
검색: https://foreverlove.co.kr/partner/dashboard
교체: https://foreverlove.co.kr/shop/page.html?id={대시보드ID}
```
이 URL은 파트너에게 보내는 후기 확인 안내 이메일의 "대시보드에서 확인하기" 버튼 링크입니다.

### n8n 워크플로우 수정 요약

| 워크플로우 | 노드명 | 현재 URL | 교체 URL | 필요한 ID |
|-----------|--------|----------|----------|----------|
| WF-10 | Build Certificate Email | `/partner/dashboard` | `/shop/page.html?id={대시보드ID}` | 대시보드 |
| WF-10 | Build Retry Email | `/partner/academy` | `/shop/page.html?id={교육ID}` | 교육 |
| WF-04 | Build Partner Email | `/partner/dashboard` | `/shop/page.html?id={대시보드ID}` | 대시보드 |
| WF-12 | Build Review Emails | `/partner/dashboard` | `/shop/page.html?id={대시보드ID}` | 대시보드 |

> **수정 방법**: n8n 에디터에서 해당 워크플로우를 열고, Code 노드를 더블클릭하여 jsCode 내 URL을 수정하거나, JSON 파일을 직접 편집한 후 다시 import 합니다.

---

## 7. n8n CORS 확인

프론트엔드(foreverlove.co.kr)에서 n8n Webhook을 호출하려면 CORS 헤더가 올바르게 설정되어야 합니다.

### 현재 상태

모든 Webhook 응답 노드에 이미 CORS 헤더가 설정되어 있습니다:
```json
{ "name": "Access-Control-Allow-Origin", "value": "https://foreverlove.co.kr" }
```

확인된 워크플로우별 CORS 설정 개수:
| 워크플로우 | 응답 노드 수 | CORS 설정 |
|-----------|------------|----------|
| WF-01 (클래스 API) | 1 | 설정됨 |
| WF-04 (예약 기록) | 6 | 모두 설정됨 |
| WF-06 (클래스 관리) | 4 | 모두 설정됨 |
| WF-07 (파트너 신청) | 5 | 모두 설정됨 |
| WF-08 (파트너 승인) | 5 | 모두 설정됨 |
| WF-09 (후기 답변) | 5 | 모두 설정됨 |
| WF-10 (교육 완료) | 4 | 모두 설정됨 |

### 배포 후 확인 방법

1. 브라우저 개발자 도구(F12) > Network 탭 열기
2. foreverlove.co.kr에서 n8n Webhook을 호출하는 기능 실행
3. 응답 헤더에 `Access-Control-Allow-Origin: https://foreverlove.co.kr` 확인
4. 만약 CORS 에러 발생 시:
   - n8n 서버의 환경 변수 `N8N_EDITOR_BASE_URL`, `WEBHOOK_URL` 확인
   - Webhook 노드의 응답 헤더 재확인
   - OPTIONS preflight 요청도 처리되는지 확인

### n8n 서버 레벨 CORS (추가 확인 필요)

n8n 자체적으로도 CORS를 제어할 수 있습니다. 서버 환경 변수를 확인하세요:
```bash
# docker-compose.yml 또는 환경 변수에서 확인
N8N_CORS_ALLOW_ORIGIN=https://foreverlove.co.kr
```

---

## 8. 배포 후 테스트 체크리스트

### 8-1. 기본 접속 테스트

| # | 테스트 항목 | 예상 결과 | 통과 |
|---|-----------|----------|------|
| 1 | 목록 페이지 URL 접속 | 클래스 목록 화면 표시 | [ ] |
| 2 | 상세 페이지 URL 접속 (class_id 포함) | 클래스 상세 화면 표시 | [ ] |
| 3 | 파트너 신청 페이지 URL 접속 | 파트너 신청 화면 표시 | [ ] |
| 4 | 교육 페이지 URL 접속 | 파트너 교육 화면 표시 | [ ] |
| 5 | 대시보드 페이지 URL 접속 | 파트너 대시보드 표시 | [ ] |

### 8-2. 가상태그 치환 테스트

| # | 테스트 항목 | 예상 결과 | 통과 |
|---|-----------|----------|------|
| 1 | 비로그인 상태에서 대시보드 접속 | 로그인 안내 또는 비파트너 안내 표시 | [ ] |
| 2 | 로그인 후 대시보드 접속 | `<!--/user_id/-->` 가 실제 ID로 치환됨 | [ ] |
| 3 | 파트너 회원으로 로그인 후 대시보드 | 파트너 데이터 로드 성공 | [ ] |

### 8-3. 내부 링크 동작 테스트

| # | 테스트 항목 | 예상 결과 | 통과 |
|---|-----------|----------|------|
| 1 | 목록에서 클래스 카드 클릭 | 상세 페이지로 이동 (올바른 ID) | [ ] |
| 2 | 상세에서 "목록으로 돌아가기" 클릭 | 목록 페이지로 이동 | [ ] |
| 3 | 상세에서 "다른 클래스 보기" 클릭 | 목록 페이지로 이동 (partner 필터) | [ ] |
| 4 | 대시보드에서 "파트너 신청하기" 클릭 | 파트너 신청 페이지로 이동 | [ ] |
| 5 | 교육에서 "파트너 대시보드로 이동" 클릭 | 대시보드 페이지로 이동 | [ ] |
| 6 | 파트너 신청에서 "대시보드로 이동" 클릭 | 대시보드 페이지로 이동 | [ ] |

### 8-4. WF-10 교육 플로우 테스트

| # | 테스트 항목 | 예상 결과 | 통과 |
|---|-----------|----------|------|
| 1 | 교육 페이지에서 퀴즈 응시 | 퀴즈 화면 정상 표시 | [ ] |
| 2 | 퀴즈 제출 | n8n WF-10 Webhook 호출 성공 | [ ] |
| 3 | 합격 시 | 합격 결과 화면 + 이메일 수신 | [ ] |
| 4 | 합격 이메일 CTA 클릭 | 대시보드 페이지로 이동 | [ ] |
| 5 | 불합격 시 | 불합격 결과 화면 + 이메일 수신 | [ ] |
| 6 | 불합격 이메일 CTA 클릭 | 교육 페이지로 이동 | [ ] |

### 8-5. 브라우저 콘솔 에러 확인

모든 페이지에서 브라우저 개발자 도구(F12) > Console 탭을 열고:
- JavaScript 에러 없음 확인
- CORS 에러 없음 확인
- 404 리소스 로드 실패 없음 확인

---

## 빠른 참조: 전체 수정 작업 순서

```
1. 메이크샵 관리자에서 5개 페이지 등록 (섹션 2)
2. 각 페이지 ID 기록 (섹션 3)
3. 메이크샵 편집기에서 10개 HTML/JS 상대경로 수정 (섹션 4)
4. 목록/js.js의 상세 ID 2곳 수정 (섹션 5)
5. n8n 워크플로우 JSON의 이메일 URL 4곳 수정 (섹션 6)
6. 테스트 체크리스트 실행 (섹션 8)
```

총 수정 개소: **프론트엔드 12곳 + n8n 4곳 = 16곳**
