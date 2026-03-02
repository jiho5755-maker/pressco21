# Phase 2 파트너 클래스 플랫폼 - GAS -> n8n 전환 아키텍처 검토

> **작성일**: 2026-02-25
> **작성자**: makeshop-planning-expert
> **목적**: 메이크샵 D4 제약 관점에서 GAS -> n8n(n8n.pressco21.com) 전환 시 기술적 이슈 분석

---

## 1. CORS 문제

### 1.1 현황: GAS가 CORS 우회되는 이유

GAS 웹앱(`script.google.com/macros/s/.../exec`)은 Google이 내부적으로 CORS 헤더를 처리해준다. 그래서 메이크샵 프론트엔드(foreverlove.co.kr)에서 GAS로 fetch 호출 시 CORS 문제가 발생하지 않았다.

구체적으로 현재 코드에서 사용하는 두 가지 패턴:

**GET 요청** (`callGAS` 함수, `파트너클래스/파트너/js.js` L1386~L1416):
```javascript
fetch(url, { method: 'GET', redirect: 'follow' })
```
- GAS 웹앱의 GET 요청은 302 리다이렉트를 거쳐 응답이 돌아오며, 이 과정에서 Google 서버가 `Access-Control-Allow-Origin: *`를 자동 설정한다.

**POST 요청** (`postGAS` 함수, `파트너클래스/파트너/js.js` L1424~L1446):
```javascript
fetch(url, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(data)
})
```
- `Content-Type: text/plain`으로 전송하여 **CORS preflight(OPTIONS 요청)를 회피**한다. 브라우저는 `text/plain`, `multipart/form-data`, `application/x-www-form-urlencoded` 세 가지 Content-Type에 대해 preflight를 보내지 않는다(Simple Request).
- GAS 서버(`class-platform-gas.gs` L195~L211)에서 `text/plain`으로 들어온 본문을 JSON.parse로 파싱한다.

### 1.2 n8n 전환 시: CORS를 명시적으로 설정해야 한다

n8n webhook URL(`https://n8n.pressco21.com/webhook/...`)은 GAS와 달리 CORS 헤더를 자동으로 설정해주지 않는다. 두 가지 접근법이 있다.

#### 방법 A: n8n Webhook 노드의 CORS 설정 (권장)

n8n의 Webhook 노드에는 CORS 설정 옵션이 있다:

1. **Webhook 노드 설정 > Options > Allowed Origins**: `https://www.foreverlove.co.kr, https://foreverlove.co.kr` 입력
2. n8n은 응답에 자동으로 다음 헤더를 추가한다:
   ```
   Access-Control-Allow-Origin: https://www.foreverlove.co.kr
   Access-Control-Allow-Methods: GET, POST, OPTIONS
   Access-Control-Allow-Headers: Content-Type
   ```
3. OPTIONS preflight 요청도 자동으로 200 OK를 반환한다.

**주의**: n8n 버전에 따라 Webhook 노드의 CORS 설정 위치가 다를 수 있다. 설정이 없는 경우 "Respond to Webhook" 노드에서 수동으로 헤더를 추가해야 한다.

#### 방법 B: Reverse Proxy (nginx/Caddy)에서 CORS 처리

n8n 앞단에 Reverse Proxy가 있다면(n8n.pressco21.com의 경우 거의 확실히 있다), 거기서 CORS 헤더를 주입하는 것이 더 안정적이다:

```nginx
# nginx 예시 (n8n.pressco21.com 서버 설정)
location /webhook/ {
    # CORS 헤더 추가
    add_header 'Access-Control-Allow-Origin' 'https://www.foreverlove.co.kr' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;

    # OPTIONS preflight 처리
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' 'https://www.foreverlove.co.kr';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization';
        add_header 'Access-Control-Max-Age' 86400;
        return 204;
    }

    proxy_pass http://localhost:5678;
}
```

**권장: 방법 B (Reverse Proxy)**. 이유:
- n8n 노드 설정에 의존하지 않아 워크플로우 변경 시에도 CORS가 유지된다
- `Access-Control-Allow-Origin`을 정확히 `foreverlove.co.kr`로 제한하여 보안이 강화된다
- OPTIONS preflight 캐싱(`Access-Control-Max-Age`)을 설정하여 불필요한 왕복을 줄인다

### 1.3 프론트엔드 fetch 코드 변경점

n8n 전환 시 프론트엔드의 fetch 호출 패턴을 변경해야 한다:

**현재 (GAS):**
```javascript
// GET
fetch(GAS_URL + '?action=getClasses&...', { method: 'GET', redirect: 'follow' })

// POST (text/plain으로 CORS preflight 회피)
fetch(GAS_URL + '?action=replyToReview', {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(data)
})
```

**변경 후 (n8n):**
```javascript
// GET - 경로 기반 라우팅으로 변경
fetch(N8N_BASE_URL + '/classes?' + queryParams, { method: 'GET' })

// POST - application/json 사용 가능 (CORS 설정 완료 시)
fetch(N8N_BASE_URL + '/review/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
})
```

**핵심 변경점:**
1. `redirect: 'follow'` 제거 (GAS 302 리다이렉트 대응이었음, n8n은 불필요)
2. `Content-Type: text/plain` -> `Content-Type: application/json`으로 변경 가능 (Reverse Proxy에서 CORS를 처리하므로 preflight가 와도 정상 응답)
3. `?action=xxx` 쿼리 파라미터 대신 경로 기반 라우팅 사용 가능 (n8n webhook path 분리)

### 1.4 메이크샵 편집기 제약과 fetch 호환성

메이크샵 D4 편집기의 JS 제약:
- `var`만 사용 (let/const 저장 시 에러)
- `\${variable}` 이스케이프 필수
- `fetch()` API는 **사용 가능** (현재 Phase 2 코드가 이미 fetch를 사용 중)
- IIFE 패턴 필수

n8n 전환 시 이 제약들은 변하지 않는다. fetch 호출 자체는 동일하게 동작하며, URL만 변경하면 된다.

**단, 한 가지 주의사항**: n8n webhook에서 `application/json` Content-Type을 사용하면 CORS preflight(OPTIONS)가 발생한다. Reverse Proxy에서 OPTIONS를 처리하지 않으면 **요청이 차단**된다. 반드시 OPTIONS 처리를 먼저 확인한 후 Content-Type을 변경해야 한다. 대안으로 GAS와 동일하게 `text/plain`을 유지할 수도 있다.

---

## 2. 파트너 인증 플로우 유지

### 2.1 현재 인증 아키텍처 (GAS 기반)

Phase 1.5 (Task 151)에서 검증 완료된 3단계 인증:

```
[1단계: 메이크샵 서버 사이드 렌더링]
HTML: <span id="pdMemberId" style="display:none"><!--/user_id/--></span>
서버: <!--/user_id/--> -> "jihoo5755" (로그인) 또는 "" (비로그인)

[2단계: 프론트엔드 JS]
var memberId = document.getElementById('pdMemberId').textContent.trim();
if (!memberId) { 로그인 페이지 리다이렉트 }

[3단계: GAS 서버]
callGAS('getPartnerAuth', { member_id: memberId }, callback)
-> GAS에서 Sheets "파트너 상세" 시트로 member_id 매칭
-> 비파트너: { success: true, data: { is_partner: false } }
-> 파트너: { success: true, data: { partner_code, grade, status, ... } }
```

관련 코드:
- `파트너클래스/파트너/Index.html` L28: `<span id="pdMemberId" style="display:none"><!--/user_id/--></span>`
- `파트너클래스/파트너/js.js` L80~L83: `memberId = memberEl.textContent.trim()`
- `파트너클래스/파트너/js.js` L109~L148: `authenticatePartner()` 함수
- `파트너클래스/class-platform-gas.gs` L512~L550: `handleGetPartnerAuth()` 함수

### 2.2 n8n 전환 시: 인증 플로우 유효성

**1단계와 2단계는 전혀 변경이 필요 없다.** 가상태그 `<!--/user_id/-->`는 메이크샵 서버가 처리하는 것이므로, 백엔드가 GAS든 n8n이든 무관하다.

**3단계만 변경**: GAS 대신 n8n webhook을 호출한다.

```
[변경 전] JS -> GAS(getPartnerAuth) -> Sheets "파트너 상세"
[변경 후] JS -> n8n webhook(/auth/partner) -> Airtable 조회
```

### 2.3 n8n에서의 파트너 인증 워크플로우 설계

```
[Webhook Trigger: GET /auth/partner]
  |
  +-> [Set Node] member_id = $query.member_id
  |
  +-> [IF] member_id가 비어있으면 -> 에러 응답 (NOT_LOGGED_IN)
  |
  +-> [Airtable Node] "파트너 상세" 테이블에서 member_id로 검색
  |
  +-> [IF] 검색 결과 없음 -> { success: true, data: { is_partner: false } }
  |
  +-> [Set Node] 파트너 데이터 매핑
  |     partner_code, grade, commission_rate, status, ...
  |
  +-> [Respond to Webhook] { success: true, data: { ... } }
```

### 2.4 보안 고려사항

#### member_id 위조 가능성

현재 GAS와 동일한 수준의 위험이 n8n에도 존재한다:
- member_id는 프론트엔드에서 전송하므로, 브라우저 개발자 도구로 위조 가능
- **그러나** Airtable(또는 기존 Sheets)에 등록된 파트너만 인증 성공하므로, 비파트너 회원은 위조해도 접근 불가
- B2C 쇼핑몰 수준에서 이 보안은 충분하다 (Phase 1.5 검증 결론과 동일)

#### Referer 체크

**GAS의 한계**: 기존 GAS에서도 Referer/Origin 헤더 접근이 불가했다 (`class-platform-gas.gs` L184 주석 참조). 그래서 관리자 전용 엔드포인트는 `ADMIN_API_TOKEN` 파라미터로 보호했다.

**n8n의 장점**: n8n은 HTTP Request 헤더에 접근 가능하다. Referer 체크를 구현할 수 있다:

```
[Webhook Trigger]
  |
  +-> [IF Node] $headers.referer가 foreverlove.co.kr을 포함하지 않으면
  |     -> { success: false, error: 'INVALID_REFERER' }
  |
  +-> [나머지 로직...]
```

**주의**: Referer 헤더는 브라우저가 자동으로 전송하지만:
- HTTPS -> HTTPS 동일 프로토콜이므로 대부분 전송됨
- 일부 브라우저 확장 프로그램이나 개인정보 설정에서 Referer를 제거할 수 있음
- Referer가 없는 경우 차단하면 정상 사용자도 차단될 수 있으므로, Referer가 **있으면서 잘못된 경우**만 차단하는 것이 안전하다

```
// 권장 로직 (의사코드)
IF referer가 존재하고 AND foreverlove.co.kr을 포함하지 않으면:
    차단
ELSE:
    통과 (referer 없는 경우도 통과)
```

#### 관리자 전용 엔드포인트 보호

GAS에서 `ADMIN_API_TOKEN`으로 보호하던 관리자 전용 액션(pollOrders, clearCache, partnerApprove):
- n8n에서는 **별도 webhook 경로**로 분리하고, **IP 화이트리스트** 또는 **Bearer Token**으로 보호한다
- n8n Schedule Trigger로 pollOrders를 내부 호출하면 외부 엔드포인트가 불필요하다 (보안 향상)

---

## 3. 메이크샵 주문 조회 API 폴링

### 3.1 현재 GAS 구현

`class-platform-gas.gs` L1283~L1330 (`fetchNewOrders_` 함수):

```
URL: https://{SHOP_DOMAIN}/list/open_api.html
     ?mode=search&type=order_list
     &status=결제완료
     &sdate=YYYY-MM-DD&edate=YYYY-MM-DD

Headers:
  Shopkey: {SHOPKEY}
  Licensekey: {LICENSEKEY}
```

- GAS 시간 트리거(10분 간격)로 `handlePollOrders()` 호출
- `UrlFetchApp.fetch(url, options)` 사용
- 응답을 파싱하여 클래스 상품 주문만 필터링
- Sheets "정산 내역"에 기록 + 이메일 발송

### 3.2 n8n Schedule Trigger로 전환

```
[Schedule Trigger: 10분 간격]
  |
  +-> [HTTP Request Node] 메이크샵 주문 조회 API
  |     URL: https://foreverlove.co.kr/list/open_api.html
  |     Method: GET
  |     Query: mode=search, type=order_list, status=결제완료, sdate=..., edate=...
  |     Headers:
  |       Shopkey: {{$env.MAKESHOP_SHOPKEY}}
  |       Licensekey: {{$env.MAKESHOP_LICENSEKEY}}
  |
  +-> [IF Node] 응답 return_code === "0000"
  |
  +-> [Split In Batches] 주문 목록 순회
  |
  +-> [Airtable Node] "클래스 메타" 테이블에서 상품 ID 확인 (클래스 상품 필터링)
  |
  +-> [IF Node] 클래스 상품인 경우만 처리
  |
  +-> [Airtable Node] "정산 내역"에 기록
  |
  +-> [Email Send Node] 수강생 확인 + 파트너 알림 이메일
```

### 3.3 메이크샵 API 인증 방식: 헤더 vs Basic Auth

**검증된 방식 (Task 150에서 확인)**: 메이크샵 Open API는 **커스텀 헤더** 방식을 사용한다.

```
Headers:
  Shopkey: {상점키}
  Licensekey: {라이센스키}
```

이것은 `Authorization: Basic base64(...)` 방식이 아니다. n8n HTTP Request 노드에서 설정 시:

1. Authentication: "None" 선택 (Basic Auth 아님)
2. Headers에 수동 추가:
   - `Shopkey`: `{{$env.MAKESHOP_SHOPKEY}}`
   - `Licensekey`: `{{$env.MAKESHOP_LICENSEKEY}}`

**잘못된 설정 주의**: `Authorization: Basic base64(SHOPKEY:LICENSEKEY)` 형식은 메이크샵 공식 방식이 아니다. 만약 기존 FA-001 워크플로우에서 이 방식을 사용했다면, 메이크샵 서버가 이것을 해석할 수 있는지 별도 검증이 필요하다. 확실한 방식은 **Shopkey/Licensekey 커스텀 헤더**이다.

### 3.4 기존 FA-001 워크플로우 재활용 가능성

FA-001이 이미 메이크샵 주문 조회 API를 호출하고 있다면:
- HTTP Request 노드의 URL, 헤더 설정을 그대로 복사 가능
- 단, **호출 결과 처리 로직**은 클래스 플랫폼용으로 새로 구성해야 한다 (클래스 상품 필터링, 정산 기록, 이메일 발송 등)
- FA-001의 API 호출과 클래스 폴링이 **동시에 실행**되면 API 호출 예산에 합산된다는 점 주의 (현재 예산은 충분: 조회 한도의 10% 미만)

### 3.5 IP 허용 목록 이슈

메이크샵 Open API는 **허용된 IP에서만 호출 가능**하다 (`reserve-api-result.md` L187~L189):
- 현재 허용 IP: 112.219.232.181, 119.70.128.56

**n8n 서버(n8n.pressco21.com)의 공인 IP를 메이크샵 관리자에 추가 등록해야 한다.**

- GAS는 Google 서버 IP가 유동적이어서 문제가 될 수 있었지만, 자체 호스팅 n8n은 고정 IP를 가지므로 이 문제가 오히려 해결된다.
- 메이크샵 관리자 > 오픈 API > 허용 IP에 n8n 서버 IP 추가

---

## 4. 메이크샵 적립금 API

### 4.1 현재 GAS 구현

`class-platform-gas.gs` L1208~L1260 (`grantReserve_` 함수):

```
URL: https://{SHOP_DOMAIN}/list/open_api_process.html
     ?mode=save&type=reserve&process=give

Method: POST

Headers:
  Shopkey: {SHOPKEY}
  Licensekey: {LICENSEKEY}

Payload (form-encoded):
  datas[0][id]=jihoo5755
  datas[0][reserve]=5000
  datas[0][content]=[파트너수수료] 2026년 2월 정산
```

### 4.2 n8n HTTP Request 노드로 변환

```
[HTTP Request Node]
  Method: POST
  URL: https://foreverlove.co.kr/list/open_api_process.html?mode=save&type=reserve&process=give
  Body Content Type: Form URL Encoded
  Body:
    datas[0][id]: {{$json.member_id}}
    datas[0][reserve]: {{$json.amount}}
    datas[0][content]: {{$json.reason}}
  Headers:
    Shopkey: {{$env.MAKESHOP_SHOPKEY}}
    Licensekey: {{$env.MAKESHOP_LICENSEKEY}}
```

### 4.3 배치 처리 (datas 배열)

GAS에서 `datas[0]`, `datas[1]`, ... 형태로 여러 회원에게 동시 지급 가능했다.

n8n에서 배치 처리하려면:

**방법 A: 단일 HTTP Request에 여러 datas 포함**

```
Body:
  datas[0][id]: partner1
  datas[0][reserve]: 5000
  datas[0][content]: 2026년 2월 정산
  datas[1][id]: partner2
  datas[1][reserve]: 8000
  datas[1][content]: 2026년 2월 정산
```

n8n의 Form URL Encoded Body에서 동적 인덱스를 생성하려면 Code 노드(JavaScript)로 payload를 직접 구성해야 한다:

```javascript
// Code 노드에서 datas 배열 구성
var items = $input.all();
var bodyParts = [];

for (var i = 0; i < items.length; i++) {
    bodyParts.push('datas[' + i + '][id]=' + encodeURIComponent(items[i].json.member_id));
    bodyParts.push('datas[' + i + '][reserve]=' + encodeURIComponent(String(items[i].json.amount)));
    bodyParts.push('datas[' + i + '][content]=' + encodeURIComponent(items[i].json.reason));
}

return [{ json: { payload: bodyParts.join('&') } }];
```

그런 다음 HTTP Request 노드에서 `Body Content Type: Raw`, `Content-Type: application/x-www-form-urlencoded`, Body: `{{$json.payload}}`로 전송한다.

**방법 B: Split In Batches로 개별 호출 (안전하지만 느림)**

- 파트너 수가 적으면 (20명 이하) 개별 호출도 무방
- 호출 횟수: 파트너 수 = 처리 API 호출 수
- 월 1회 정산이므로 API 예산 영향 미미 (Task 152 확인: 처리 API 한도의 2% 미만)

**권장: 초기에는 방법 B(개별 호출)로 시작, 파트너 50명 이상 시 방법 A(배치)로 전환.**

### 4.4 적립금 지급 실패 처리

GAS에서 구현된 `retryFailedSettlements()` 패턴을 n8n에서도 유지해야 한다:

```
[Airtable Node] 상태가 FAILED인 정산 내역 조회
  |
  +-> [Split In Batches] 최대 5건씩
  |
  +-> [HTTP Request] 메이크샵 적립금 API 호출
  |
  +-> [IF] result === true
  |     -> [Airtable] 상태를 COMPLETED로 변경
  |     -> [Set] 재시도 카운트 +1
  |
  +-> [ELSE] result === false
  |     -> [Airtable] retry_count +1
  |     -> [IF] retry_count >= 5
  |           -> [Email] 관리자에게 수동 처리 요청 알림
```

---

## 5. 클래스 상품 등록 체계

### 5.1 메이크샵 상품 구조 (변경 없음)

n8n 전환과 무관하게 메이크샵 상품 등록 구조는 동일하다:

| 메이크샵 개념 | 클래스 매핑 | 비고 |
|-------------|-----------|------|
| 상품 1개 | 클래스 1개 | 상품명 규칙: `[파트너명] 클래스명` |
| 옵션 | 날짜/시간 슬롯 | 형식: `YYYY-MM-DD HH:mm 요일` |
| 옵션별 재고 | 정원 | 옵션별 개별 재고 설정 가능 (Task 151 검증) |
| 카테고리 | 클래스 전용 카테고리 | 주문 조회 시 클래스 식별에 활용 |

### 5.2 주문 조회 시 클래스 상품 식별

GAS에서 사용하던 방식 (Sheets 매핑):

```
// class-platform-gas.gs의 getClassProductIdMap_() 함수
// "클래스 메타" 시트에서 makeshop_product_id 컬럼을 읽어
// Set<string>으로 캐싱 -> 주문의 상품 ID가 이 Set에 있으면 클래스 주문
```

n8n에서도 동일한 방식을 유지한다:

```
[Airtable Node] "클래스 메타" 테이블에서 makeshop_product_id 목록 조회
  |
  +-> [Code Node] 상품 ID Set 구성
  |
  +-> [주문 목록 순회] 각 주문의 상품 ID가 Set에 있는지 확인
```

### 5.3 상품 동기화 배치 (syncClassProducts)

GAS의 `syncClassProducts_()` (오전 3시 트리거)는 메이크샵 상품 목록 API를 호출하여 Sheets를 갱신하는 기능이다.

n8n 전환 시:

```
[Schedule Trigger: 매일 03:00 KST]
  |
  +-> [HTTP Request] 메이크샵 상품 목록 API (클래스 카테고리)
  |     URL: .../open_api.html?mode=search&type=product_list&cate={CLASS_CATEGORY_ID}
  |
  +-> [Code Node] 기존 Airtable 데이터와 비교, 변경점 추출
  |
  +-> [Airtable Node] 신규/변경 상품 업서트
  |
  +-> [Airtable Node] 삭제된 상품 상태 변경 (active -> archived)
```

---

## 6. 메이크샵 회원 그룹 관리

### 6.1 현재 GAS 구현

`class-platform-gas.gs`의 `handlePartnerApprove()` 함수에서 파트너 승인 시 회원그룹을 변경한다.

사용하는 메이크샵 API:

```
URL: https://{SHOP_DOMAIN}/list/open_api_process.html
     ?mode=save&type=user&process=modify

Headers:
  Shopkey / Licensekey

Payload:
  datas[0][id]=jihoo5755
  datas[0][group_no]=3       // 파트너 회원 그룹 번호
```

### 6.2 FA-001 워크플로우 재활용

FA-001이 이미 회원 등급 변경을 구현하고 있다면:
- HTTP Request 노드의 URL, 헤더, payload 구조를 그대로 참고
- 파트너 승인 워크플로우에서 Sub-workflow로 호출하거나, 동일한 HTTP Request 노드 설정을 복사

### 6.3 n8n 파트너 승인 워크플로우

```
[Webhook Trigger: POST /admin/partner-approve]
  |  (Bearer Token 인증 또는 IP 화이트리스트)
  |
  +-> [Airtable Node] 파트너 상세 테이블에서 해당 파트너 조회
  |
  +-> [IF] 이미 승인됨 -> 중복 승인 방지 응답
  |
  +-> [Set Node] 파트너 코드 생성 (PC_YYYYMM_NNN 형식)
  |
  +-> [HTTP Request] 메이크샵 회원 그룹 변경 API
  |     datas[0][id] = member_id
  |     datas[0][group_no] = 파트너 그룹 번호
  |
  +-> [Airtable Node] 파트너 상태를 "active"로 변경, 파트너 코드 기록
  |
  +-> [Email Send] 파트너 승인 완료 이메일 발송
```

---

## 7. 메이크샵 개별 HTML 페이지 등록

### 7.1 페이지 등록 방법 (변경 없음)

메이크샵 D4에서 개별 HTML 페이지를 등록하는 방법은 백엔드 전환과 무관하다:

```
메이크샵 관리자
  > 디자인관리
  > 개별디자인
  > 페이지 추가
  > HTML 에디터에 Index.html 붙여넣기
  > CSS/JS는 별도 파일 또는 인라인으로 삽입
```

등록할 3개 페이지:

| 페이지 | 소스 경로 | 메이크샵 URL (예상) |
|--------|----------|-------------------|
| 클래스 목록 | `파트너클래스/목록/` | `/shop/page.html?id=XXXX` |
| 클래스 상세 | `파트너클래스/상세/` | `/shop/page.html?id=YYYY` |
| 파트너 대시보드 | `파트너클래스/파트너/` | `/shop/page.html?id=ZZZZ` |

### 7.2 n8n URL 하드코딩 문제와 해결

**현재 GAS 코드의 URL 관리 패턴:**

| 파일 | 현재 방식 | 코드 |
|------|----------|------|
| `파트너/js.js` L14 | 전역변수 참조 | `var GAS_URL = window.PRESSCO21_GAS_URL \|\| '';` |
| `목록/js.js` L13 | 하드코딩 | `var GAS_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';` |
| `상세/js.js` L14 | 하드코딩 | `var GAS_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';` |

**문제점**:
- 목록/상세 페이지는 URL이 하드코딩되어 있다
- 파트너 대시보드만 `window.PRESSCO21_GAS_URL` 전역변수를 참조한다
- URL 변경 시 3개 파일을 모두 수정해야 한다

**n8n 전환 시 권장 방식: 전역변수 통일**

메이크샵 공통 JS 영역(헤더 또는 푸터의 공통 스크립트)에 한 곳만 설정:

```javascript
// 메이크샵 관리자 > 기본 디자인 > 공통 스크립트
window.PRESSCO21_API_URL = 'https://n8n.pressco21.com/webhook';
```

3개 JS 파일 모두 이 전역변수를 참조하도록 통일:

```javascript
var API_BASE_URL = window.PRESSCO21_API_URL || '';
if (!API_BASE_URL) {
    console.error('[PRESSCO21] API_BASE_URL이 설정되지 않았습니다.');
    return;
}
```

**장점:**
- URL 변경 시 공통 스크립트 1곳만 수정
- n8n 서버 도메인이 바뀌어도 코드 배포 없이 관리자에서 수정 가능
- GAS -> n8n 전환 시에도 이 변수만 변경하면 된다

### 7.3 n8n Webhook 경로 설계 (GAS action 매핑)

GAS에서 `?action=xxx`로 분기하던 것을 n8n에서는 **별도 webhook 경로**로 분리한다:

| GAS action | n8n Webhook Path | Method | 인증 |
|-----------|-----------------|--------|------|
| `getClasses` | `/api/classes` | GET | 공개 |
| `getClassDetail` | `/api/classes/detail` | GET | 공개 |
| `getCategories` | `/api/categories` | GET | 공개 |
| `getPartnerAuth` | `/api/partner/auth` | GET | member_id 필수 |
| `getPartnerDashboard` | `/api/partner/dashboard` | GET | member_id 필수 |
| `getPartnerBookings` | `/api/partner/bookings` | GET | member_id 필수 |
| `getPartnerReviews` | `/api/partner/reviews` | GET | member_id 필수 |
| `getEducationStatus` | `/api/partner/education` | GET | member_id 필수 |
| `recordBooking` | `/api/booking` | POST | member_id 필수 |
| `updateClassStatus` | `/api/partner/class-status` | POST | member_id 필수 |
| `replyToReview` | `/api/partner/review-reply` | POST | member_id 필수 |
| `partnerApply` | `/api/partner/apply` | POST | 공개 |
| `educationComplete` | `/api/partner/education-complete` | POST | member_id 필수 |
| `pollOrders` | (Schedule Trigger, 외부 노출 불필요) | - | 내부 전용 |
| `clearCache` | `/admin/clear-cache` | POST | Bearer Token |
| `partnerApprove` | `/admin/partner-approve` | POST | Bearer Token |
| `health` | `/api/health` | GET | 공개 |

**핵심 개선**:
- `pollOrders`는 n8n Schedule Trigger로 내부 실행하므로 외부 엔드포인트가 불필요하다. 이것은 GAS 대비 보안이 향상되는 지점이다 (GAS에서는 ADMIN_API_TOKEN 파라미터로 보호해야 했음).
- 관리자 전용 엔드포인트는 `/admin/` 경로 아래로 분리하고 Bearer Token 또는 IP 화이트리스트로 보호한다.

---

## 8. 종합 정리: 전환 시 변경 범위 요약

### 8.1 변경 필요 (코드 수정)

| 구분 | 파일 | 변경 내용 | 난이도 |
|------|------|---------|-------|
| 프론트 URL | `목록/js.js` L13 | GAS_URL -> API_BASE_URL (전역변수) | 낮음 |
| 프론트 URL | `상세/js.js` L14 | GAS_URL -> API_BASE_URL (전역변수) | 낮음 |
| 프론트 URL | `파트너/js.js` L14 | PRESSCO21_GAS_URL -> PRESSCO21_API_URL | 낮음 |
| POST 헤더 | `파트너/js.js` L1430 | `text/plain` -> `application/json` (CORS 설정 후) | 낮음 |
| redirect | `파트너/js.js` 전체 | `redirect: 'follow'` 제거 가능 | 낮음 |
| 공통 JS | 메이크샵 관리자 | `window.PRESSCO21_API_URL = 'n8n URL'` 설정 | 낮음 |

### 8.2 변경 불필요 (그대로 유지)

| 구분 | 내용 | 이유 |
|------|------|------|
| 가상태그 | `<!--/user_id/-->` HTML 삽입 | 메이크샵 서버 처리, 백엔드 무관 |
| 인증 JS | `memberId = memberEl.textContent.trim()` | DOM 읽기 로직, 백엔드 무관 |
| HTML 구조 | 목록/상세/파트너 Index.html | API 호출 로직은 JS에 분리되어 있음 |
| CSS | 모든 css.css 파일 | 백엔드와 무관 |
| 메이크샵 상품 구조 | 옵션=날짜, 재고=정원 | 상품 등록 체계는 동일 |
| 메이크샵 API 스펙 | Shopkey/Licensekey 헤더 | API 호출 주체만 GAS -> n8n으로 변경 |
| API 호출 예산 | 조회 500회, 처리 500회/시간 | n8n이든 GAS든 동일 제한 |

### 8.3 n8n 서버에서 신규 구성

| 구분 | 내용 | 우선순위 |
|------|------|---------|
| CORS | Reverse Proxy에서 foreverlove.co.kr 허용 | **필수 (첫 번째)** |
| IP 등록 | n8n 서버 IP를 메이크샵 API 허용 IP에 추가 | **필수** |
| 환경변수 | MAKESHOP_SHOPKEY, MAKESHOP_LICENSEKEY | **필수** |
| Webhook | 17개 엔드포인트 (위 7.3 테이블) | **필수** |
| Schedule Trigger | 주문 폴링 (10분), 상품 동기화 (일 1회), 등급 업데이트 (일 1회) | **필수** |
| Airtable | GAS Sheets 데이터를 Airtable로 마이그레이션 | **필수** |
| 이메일 | GAS MailApp -> n8n Email 노드 (SMTP 또는 SendGrid) | **필수** |

### 8.4 GAS 대비 n8n의 장단점 (메이크샵 D4 관점)

**장점:**
- IP 고정: n8n 자체 호스팅이므로 메이크샵 API IP 허용 목록에 안정적으로 등록 가능 (GAS는 Google IP 유동)
- Referer 체크 가능: n8n은 HTTP 헤더 접근 가능 (GAS는 불가)
- Schedule Trigger 내부 실행: pollOrders를 외부 노출 없이 실행 (보안 향상)
- 실행 시간 제한 완화: GAS 개인 계정 90분/일 -> n8n 자체 호스팅은 제한 없음
- 이메일 한도: GAS 100통/일 -> n8n SMTP/SendGrid는 별도 한도

**단점/주의:**
- CORS 수동 설정 필요 (GAS는 자동)
- 서버 운영 비용 및 관리 부담 (GAS는 무료, 서버리스)
- GAS `CacheService`에 해당하는 캐싱을 n8n에서 직접 구현해야 함 (Redis 또는 파일 캐시)
- `text/plain` CORS preflight 회피 패턴이 불필요해지지만, CORS를 제대로 설정하지 않으면 모든 POST 요청이 실패한다

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-02-25 | 초기 검토 보고서 작성 (메이크샵 D4 제약 관점) |
