# 리뷰 수집 자동화 워크플로우 설계 문서

> **작성일**: 2026-04-01
> **버전**: 2.0 (알리고 통합, WF JSON 구현 완료)
> **상태**: 알리고 가입 + 카카오 템플릿 심사 대기

---

## 1. 개요

**알리고 카카오 알림톡** 통합 리뷰 자동화 시스템.
MakeShop 오픈 API + 알리고 API + NocoDB로 배송 알림 → 리뷰 리마인드 → 적립금 자동 지급까지 전 과정 자동화.

**v1.0 → v2.0 변경점**:
- 발송 채널: MakeShop SMS → **알리고 카카오 알림톡** (건당 7.15원, 50% 절감)
- 리뷰 감지: `type=review` (미작동) → **`type=board&BoardCode=jewoo_board10`** (파워리뷰 게시판, 실측 검증)
- 배송 알림: MakeShop 내장 → **알리고 통합** (일괄 배송 5~6PM 기준 18:30 발송)
- WF: 설계만 → **JSON 구현 완료** (credential placeholder)

**목표**:
- 알리고 단일 채널로 모든 알림톡 통합
- 이중 발송 방지 (NocoDB 추적)
- 리뷰 작성 자동 감지 + 포토/텍스트 구분 + 적립금 자동 지급

**API 실측 결과 (2026-04-01)**:
- `type=board&BoardCode=jewoo_board10`: ✅ 리뷰 조회 성공 (주문번호, 회원ID, 별점, 포토 판별 가능)
- `type=order&ver=2&orderStatus[]=Y`: ✅ 배송완료 주문 조회 성공
- `type=reserve process=give`: ✅ 적립금 지급 API 존재 (실측 대기)
- `type=review`: ❌ MakeShop 내장 상품평 전용, 파워리뷰 게시판과 별개

---

## 2. 데이터 흐름 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                         일일 스케줄 (10:00)                      │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. MakeShop API: 배송 완료 주문 조회 (배송일 정보 포함)          │
│    - 매개변수: 모드=search, 타입=order, 배송상태=Y               │
│    - 응답: 배송일, 고객 정보, 주문번호, 상품명, 이메일, 폰번호   │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. 필터: D+7 계산 (배송일 + 7일 = 오늘)                         │
│    - 오늘 자정 기준 D+7인 주문만 선별                           │
│    - 배송 상태 코드: Y (발송완료)                                │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. NocoDB 중복 확인: 리뷰요청_발송추적 테이블                    │
│    - 주문번호 기준 검색                                         │
│    - "발송_여부" = FALSE 인 레코드만 처리                       │
│    - 발송 일시, 채널, 상태 추적                                 │
└────────────┬────────────────────────────────────────────────────┘
             │
             ├─ [발송 대상 없음] ──► 워크플로우 종료
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. 연락처 유효성 검증                                           │
│    - 이메일 형식 (선택: 백업)                                   │
│    - 휴대폰번호 형식 (필수, 01X-XXXX-XXXX)                     │
│    - 테스트/금지 번호 제외 (블랙리스트)                         │
└────────────┬────────────────────────────────────────────────────┘
             │
             ├─ [연락처 없음] ──► NocoDB 기록 (실패 사유: NO_CONTACT)
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. 카카오 알림톡 또는 SMS 발송                                   │
│    - 선택: 카카오 > SMS (카카오 실패 시 SMS로 폴백)             │
│    - 메시지 템플릿: 상품명, 리뷰 작성 링크, 인센티브 안내      │
│    - 발송 결과: 성공/실패, 오류 코드                            │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. NocoDB 발송 기록 저장                                         │
│    - 주문번호, 발송_여부(TRUE), 발송_일시, 채널, 상태           │
│    - 응답_메시지 (오류 코드 또는 성공 메시지)                   │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. 완료: 텔레그램 알림 (성공/실패 요약)                          │
│    - 총 발송 건수, 성공 건수, 실패 건수                         │
│    - 실패 원인 분류 (연락처 없음, 네트워크, 기타)               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 노드 설계 (상세)

### 3-1. 트리거 노드

#### **Node 1: Schedule Trigger**
- **타입**: `n8n-nodes-base.cron`
- **역할**: 매일 오전 10:00 실행
- **설정**:
  - `cronExpression`: `0 10 * * *` (매일 10:00)
  - `timezone`: `Asia/Seoul`
- **출력**: `{}`

---

### 3-2. MakeShop API 조회

#### **Node 2: HTTP Request - MakeShop 주문 조회**
- **타입**: `n8n-nodes-base.httpRequest`
- **역할**: MakeShop 오픈 API로 배송 완료 주문 조회
- **설정**:
  - `method`: `GET`
  - `url`: `http://foreverlove.co.kr/list/open_api.html`
  - `query`:
    - `mode`: `search`
    - `type`: `order`
    - `statusno`: `Y` (발송완료)
  - `headers` (Credential):
    - `Shopkey`: `{{ $env.MAKESHOP_SHOPKEY }}`
    - `Licensekey`: `{{ $env.MAKESHOP_LICENSEKEY }}`
  - `returnAll`: `true` (모든 주문 페이지 수집)
- **출력**: 배열 형식, 각 항목:
  ```
  {
    "order_id": "주문번호",
    "customer_name": "고객명",
    "customer_email": "이메일",
    "customer_phone": "휴대폰",
    "product_name": "상품명",
    "shipping_date": "2026-03-25", // YYYY-MM-DD
    "shipping_status": "Y",
    "order_date": "주문일"
  }
  ```

---

### 3-3. 데이터 변환 & 필터

#### **Node 3: Code - D+7 주문 필터링**
- **타입**: `n8n-nodes-base.code`
- **역할**: 배송 완료 D+7인 주문만 선별 + 필수 필드 검증
- **로직**:
  ```javascript
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results = [];

  for (const order of $input.all()) {
    const shippingDate = new Date(order.json.shipping_date);
    shippingDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today - shippingDate) / (1000 * 60 * 60 * 24));

    // D+7 조건 (정확히 7일)
    if (daysDiff === 7) {
      // 필수 필드 검증
      if (order.json.order_id && order.json.customer_phone) {
        results.push({
          json: {
            order_id: order.json.order_id,
            customer_name: order.json.customer_name || "고객",
            customer_phone: order.json.customer_phone.trim(),
            customer_email: order.json.customer_email || "",
            product_name: order.json.product_name || "상품",
            shipping_date: order.json.shipping_date,
            days_passed: daysDiff
          }
        });
      }
    }
  }

  return results.length > 0 ? results : [];
  ```
- **출력**:
  ```json
  [
    {
      "order_id": "ORD123456",
      "customer_name": "김철수",
      "customer_phone": "010-1234-5678",
      "customer_email": "kim@example.com",
      "product_name": "꽃바구니 DIY 키트",
      "shipping_date": "2026-03-25",
      "days_passed": 7
    }
  ]
  ```

---

### 3-4. NocoDB 추적 테이블 확인

#### **Node 4: NocoDB - 리뷰요청_발송추적 조회**
- **타입**: `n8n-nodes-base.httpRequest`
- **역할**: 이미 발송한 주문 조회 (중복 방지)
- **설정**:
  - `method`: `GET`
  - `url`: `https://nocodb.pressco21.com/api/v2/tables/{TABLE_ID}/records`
  - `query`:
    - `where`: `발송_여부,eq,true` (이미 발송한 레코드)
  - `authentication`: `httpHeaderAuth`
  - `headers`:
    - `xc-auth`: `{{ $env.NOCODB_TOKEN }}`
- **출력**: 배열 형식
  ```json
  [
    {
      "id": "1",
      "order_id": "ORD123456",
      "발송_여부": true,
      "발송_일시": "2026-04-01T10:15:32Z",
      "채널": "KakaoTalk"
    }
  ]
  ```

---

### 3-5. 중복 제거

#### **Node 5: Code - 중복 제거 필터**
- **타입**: `n8n-nodes-base.code`
- **역할**: 이미 발송한 주문을 필터 아웃
- **로직**:
  ```javascript
  const sentOrders = $node["Node 4"].json.rows || [];
  const sentIds = new Set(sentOrders.map(r => r.order_id));

  const filtered = [];
  for (const order of $input.all()) {
    if (!sentIds.has(order.json.order_id)) {
      filtered.push(order);
    }
  }

  return filtered.length > 0 ? filtered : [];
  ```
- **출력**: 미발송 주문만 배열로 반환

---

### 3-6. 연락처 유효성 검증

#### **Node 6: Code - 연락처 검증**
- **타입**: `n8n-nodes-base.code`
- **역할**: 휴대폰번호 형식 검증, 테스트/블랙리스트 번호 제외
- **로직**:
  ```javascript
  const BLACKLIST = [
    "010-0000-0000",
    "010-1111-1111",
    "test",
    "example"
  ];

  const results = [];

  for (const order of $input.all()) {
    const phone = order.json.customer_phone.trim();

    // 휴대폰 형식 검증 (01X-XXXX-XXXX)
    const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/;
    const isValidPhone = phoneRegex.test(phone);

    // 블랙리스트 확인
    const isBlacklisted = BLACKLIST.some(b => phone.includes(b));

    if (isValidPhone && !isBlacklisted) {
      results.push({
        json: {
          ...order.json,
          contact_status: "valid"
        }
      });
    } else {
      results.push({
        json: {
          ...order.json,
          contact_status: "invalid",
          reason: !isValidPhone ? "INVALID_PHONE_FORMAT" : "BLACKLISTED"
        }
      });
    }
  }

  return results;
  ```
- **출력**: 모든 주문, `contact_status` 추가

---

### 3-7. 연락처 유무에 따른 분기

#### **Node 7: Switch - 연락처 분기**
- **타입**: `n8n-nodes-base.switch`
- **typeVersion**: `3.2`
- **역할**: 유효한 연락처 vs 없는 주문 분리
- **조건 1**: `contact_status == "valid"` → Branch 0 (발송 프로세스)
- **조건 2**: `contact_status == "invalid"` → Branch 1 (실패 기록)
- **기본 분기**: Branch 1 (실패)

---

### 3-8-A. 유효 연락처: 메시지 템플릿 준비

#### **Node 8: Code - 메시지 템플릿 생성 (Branch 0)**
- **타입**: `n8n-nodes-base.code`
- **역할**: 카카오/SMS 메시지 구성
- **로직**:
  ```javascript
  const order = $json;
  const reviewLink = `https://foreverlove.co.kr/review?order_id=${order.order_id}`;

  const kakaoTemplate = {
    title: "리뷰 작성 부탁드립니다!",
    message: `안녕하세요, ${order.customer_name}님!\n\n주문하신 "${order.product_name}"에 대한 리뷰를 작성해주시면\n포토 후기 500원 / 텍스트 후기 200원의 적립금을 드립니다.\n\n[리뷰 작성하기](${reviewLink})`,
    buttons: [
      { text: "리뷰 작성", link: reviewLink },
      { text: "나중에", action: "dismiss" }
    ]
  };

  const smsTemplate = `[프레스코21] 안녕하세요!\n주문하신 상품에 대한 리뷰를 작성해주세요.\n포토 후기 500원/텍스트 후기 200원 적립금 제공!\n${reviewLink}`;

  return [{
    json: {
      ...order,
      kakao_message: kakaoTemplate,
      sms_message: smsTemplate,
      review_link: reviewLink
    }
  }];
  ```
- **출력**: 메시지 포함 주문 정보

---

### 3-8-B. 카카오 알림톡 발송 (조건: 카카오 연동 기능 필요)

#### **Node 9: HTTP Request - 카카오 알림톡 발송**
- **타입**: `n8n-nodes-base.httpRequest`
- **역할**: 카카오 알림톡 발송 (1순위)
- **주의사항**:
  - MakeShop에서 카카오 알림톡 API 또는 제휴사 API 필요
  - 현재 MakeShop 관리자에서 템플릿 설정 가능 여부 확인 필요
  - **임시 방안**: Naver SMTP 또는 SNS 제휴사 API 사용
- **설정** (예시, 제휴사 API에 따라 변경):
  - `method`: `POST`
  - `url`: `{{ $env.KAKAO_API_URL }}`
  - `headers`:
    - `Authorization`: `Bearer {{ $env.KAKAO_API_KEY }}`
    - `Content-Type`: `application/json`
  - `body`:
    ```json
    {
      "phone": "{{ $json.customer_phone }}",
      "message": "{{ $json.kakao_message }}",
      "template_id": "review_request"
    }
    ```
  - **중요**: HTTP Error를 캐치하지 말고 다음 노드에서 처리 (오류 분기 구성)
- **출력**: `{ status, message_id, timestamp }`

---

### 3-9. SMS 폴백

#### **Node 10: Code - SMS 폴백 조건부 실행**
- **타입**: `n8n-nodes-base.code`
- **역할**: 카카오 발송 실패 시 SMS로 폴백 (또는 카카오 미연동 시 SMS 직접 실행)
- **로직**:
  ```javascript
  // 카카오 결과 확인 (Node 9 체크)
  const kakaoResult = $node["Node 9"].json || {};
  const shouldFallbackToSMS = !kakaoResult.status || kakaoResult.status === "error";

  if (shouldFallbackToSMS) {
    return [{
      json: {
        ...$json,
        sms_fallback: true,
        reason: kakaoResult.error_message || "kakao_not_available"
      }
    }];
  } else {
    return [{
      json: {
        ...$json,
        sms_fallback: false,
        reason: "kakao_success"
      }
    }];
  }
  ```
- **출력**: SMS 폴백 여부 플래그 추가

---

### 3-10. SMS 발송

#### **Node 11: HTTP Request - SMS 발송**
- **타입**: `n8n-nodes-base.httpRequest`
- **역할**: SMS 발송 (카카오 폴백 또는 1순위)
- **설정**:
  - `method`: `POST`
  - `url`: `{{ $env.SMS_API_URL }}`
  - `headers`:
    - `Authorization`: `Bearer {{ $env.SMS_API_KEY }}`
  - `body`:
    ```json
    {
      "to": "{{ $json.customer_phone }}",
      "message": "{{ $json.sms_message }}",
      "sender": "01012345678"
    }
    ```
- **출력**: `{ status, sms_id, timestamp }`

---

### 3-11. 발송 결과 정리

#### **Node 12: Code - 발송 결과 통합**
- **타입**: `n8n-nodes-base.code`
- **역할**: 카카오/SMS 결과를 하나의 발송 기록으로 통합
- **로직**:
  ```javascript
  const kakaoResult = $node["Node 9"].json || {};
  const smsResult = $node["Node 11"].json || {};

  let channel = "none";
  let status = "failed";
  let message = "Unknown error";

  if (kakaoResult.status === "success") {
    channel = "KakaoTalk";
    status = "success";
    message = kakaoResult.message_id;
  } else if (smsResult.status === "success") {
    channel = "SMS";
    status = "success";
    message = smsResult.sms_id;
  } else {
    channel = "none";
    status = "failed";
    message = kakaoResult.error_message || smsResult.error_message || "No channel available";
  }

  return [{
    json: {
      order_id: $json.order_id,
      customer_phone: $json.customer_phone,
      channel: channel,
      status: status,
      message: message,
      sent_at: new Date().toISOString()
    }
  }];
  ```
- **출력**: 발송 기록 객체

---

### 3-12-A. 유효 발송 기록 저장

#### **Node 13A: NocoDB - 발송 기록 저장 (성공, Branch 0)**
- **타입**: `n8n-nodes-base.httpRequest`
- **역할**: 성공한 발송 기록을 NocoDB에 저장
- **설정**:
  - `method`: `POST`
  - `url`: `https://nocodb.pressco21.com/api/v2/tables/{TABLE_ID}/records`
  - `body`:
    ```json
    {
      "order_id": "{{ $json.order_id }}",
      "customer_phone": "{{ $json.customer_phone }}",
      "발송_여부": true,
      "발송_일시": "{{ $json.sent_at }}",
      "채널": "{{ $json.channel }}",
      "상태": "{{ $json.status }}",
      "응답_메시지": "{{ $json.message }}"
    }
    ```
  - `authentication`: `httpHeaderAuth`
- **출력**: 생성된 레코드 ID

---

### 3-12-B. 실패 기록 저장 (두 가지 경로)

#### **Node 13B: NocoDB - 발송 실패 기록 저장 (Switch Branch 1: 연락처 없음)**
- **타입**: `n8n-nodes-base.httpRequest`
- **역할**: 연락처 없는 주문 기록
- **body**:
  ```json
  {
    "order_id": "{{ $json.order_id }}",
    "발송_여부": false,
    "상태": "failed",
    "응답_메시지": "{{ $json.reason }}"
  }
  ```

#### **Node 13C: NocoDB - 발송 실패 기록 저장 (HTTP 오류, 선택적)**
- **타입**: `n8n-nodes-base.httpRequest`
- **역할**: API 오류로 발송 실패한 주문 기록
- **동일 구조** (Node 13B)

---

### 3-13. 발송 통계 & 알림

#### **Node 14: Code - 발송 통계 계산**
- **타입**: `n8n-nodes-base.code`
- **역할**: 성공/실패 건수 집계
- **로직**:
  ```javascript
  const allExecutions = $input.all();

  let successCount = 0;
  let failureCount = 0;
  let reasons = {};

  for (const exec of allExecutions) {
    if (exec.json.status === "success") {
      successCount++;
    } else {
      failureCount++;
      const reason = exec.json.reason || "unknown";
      reasons[reason] = (reasons[reason] || 0) + 1;
    }
  }

  return [{
    json: {
      total_processed: successCount + failureCount,
      success_count: successCount,
      failure_count: failureCount,
      failure_breakdown: reasons,
      execution_time: new Date().toISOString()
    }
  }];
  ```
- **출력**:
  ```json
  {
    "total_processed": 15,
    "success_count": 12,
    "failure_count": 3,
    "failure_breakdown": {
      "INVALID_PHONE_FORMAT": 2,
      "NO_CONTACT": 1
    },
    "execution_time": "2026-04-01T10:45:32Z"
  }
  ```

---

### 3-14. 텔레그램 알림

#### **Node 15: Telegram - 일일 리포트**
- **타입**: `n8n-nodes-base.telegram`
- **역할**: 워크플로우 실행 결과 알림
- **설정**:
  - `chatId`: `{{ $env.TELEGRAM_CHAT_ID }}`
  - `message`:
    ```
    📊 리뷰 요청 자동 발송 완료

    ✅ 성공: {{ $json.success_count }}건
    ❌ 실패: {{ $json.failure_count }}건
    📈 총 처리: {{ $json.total_processed }}건

    실패 원인:
    {{ JSON.stringify($json.failure_breakdown, null, 2) }}

    ⏰ 실행 시간: {{ $json.execution_time }}
    ```
- **출력**: 메시지 ID

---

## 4. 별도 워크플로우: 리뷰 작성 감지 & 적립금 자동 지급

### 아키텍처

이 워크플로우는 **별도의 n8n WF**로 구성하거나, **Webhook 트리거 + 정기 스케줄**로 운영합니다.

#### **옵션 A: Webhook 트리거 (이상적)**
- MakeShop 리뷰 페이지에서 리뷰 작성 완료 시 Webhook 호출
- 즉시 적립금 지급

#### **옵션 B: 정기 스케줄 (현재 권장)**
- 매일 오후 3:00 MakeShop API로 신규 리뷰 조회
- 기존 기록과 비교 (NocoDB)
- 신규 리뷰만 필터링 후 적립금 지급

---

### 4-1. 정기 스케줄 기반 설계 (옵션 B)

#### **Node 1: Schedule - 리뷰 확인 (매일 15:00)**

#### **Node 2: HTTP Request - MakeShop API: 리뷰 조회**
- `url`: `http://foreverlove.co.kr/list/open_api.html`
- `query`:
  - `mode`: `search`
  - `type`: `review`
  - `limit`: `100` (최근 100개)
- **출력**:
  ```
  [
    {
      "review_id": "REV123456",
      "order_id": "ORD123456",
      "customer_name": "김철수",
      "review_type": "photo" | "text", // 포토/텍스트 구분
      "rating": 5,
      "content": "...",
      "created_at": "2026-04-01T14:30:00Z"
    }
  ]
  ```

#### **Node 3: NocoDB - 기존 리뷰 조회**
- 테이블: `리뷰_적립금_추적`
- 쿼리: 모든 레코드 조회

#### **Node 4: Code - 신규 리뷰 필터링**
- 로직: `order_id` 기반으로 기존 기록과 비교
- 신규 리뷰만 배열로 반환

#### **Node 5: Code - 적립금 금액 계산**
- 포토 후기: 500원
- 텍스트 후기: 200원

#### **Node 6: HTTP Request - MakeShop API: 적립금 지급**
- `method`: `POST`
- `url`: `http://foreverlove.co.kr/list/open_api_process.html`
- `query`:
  - `mode`: `save`
  - `type`: `reserve` (적립금)
  - `process`: `store` (상점)
- `body`:
  ```json
  {
    "customer_id": "{{ $json.customer_id }}",
    "reserve_amount": "{{ $json.reserve_amount }}",
    "reserve_comment": "리뷰 작성 적립금 - {{ $json.review_type }}",
    "reserve_status": "1" (사용가능)
  }
  ```

#### **Node 7: NocoDB - 리뷰 기록 저장**
- 테이블: `리뷰_적립금_추적`
- 컬럼:
  - `review_id`
  - `order_id`
  - `customer_name`
  - `review_type` (photo/text)
  - `reserve_amount`
  - `적립_일시`
  - `상태` (성공/실패)

#### **Node 8: Telegram - 리뷰 통계 알림**

---

## 5. NocoDB 테이블 스키마

### 테이블 1: `리뷰요청_발송추적`

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `id` | Auto | PK | 1 |
| `order_id` | Text | MakeShop 주문번호 | `ORD123456` |
| `customer_name` | Text | 고객명 | `김철수` |
| `customer_phone` | Text | 휴대폰번호 | `010-1234-5678` |
| `customer_email` | Text | 이메일 (선택) | `kim@example.com` |
| `product_name` | Text | 상품명 | `꽃바구니 DIY 키트` |
| `shipping_date` | Date | 배송일 | `2026-03-25` |
| `발송_여부` | Checkbox | 발송 완료 여부 | `true` / `false` |
| `발송_일시` | DateTime | 발송 일시 | `2026-04-01T10:15:32Z` |
| `채널` | SingleSelect | 발송 채널 | `KakaoTalk` / `SMS` / `None` |
| `상태` | SingleSelect | 발송 상태 | `success` / `failed` |
| `응답_메시지` | LongText | API 응답 또는 오류 메시지 | `Message ID: abc123` |
| `created_at` | DateTime | 레코드 생성 시간 (자동) | |
| `updated_at` | DateTime | 마지막 수정 시간 (자동) | |

### 테이블 2: `리뷰_적립금_추적`

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `id` | Auto | PK | 1 |
| `review_id` | Text | MakeShop 리뷰 ID | `REV123456` |
| `order_id` | Text | 주문번호 | `ORD123456` |
| `customer_id` | Text | 고객 ID | `CUST12345` |
| `customer_name` | Text | 고객명 | `김철수` |
| `review_type` | SingleSelect | 리뷰 유형 | `photo` / `text` |
| `rating` | Number | 별점 | `5` |
| `content` | LongText | 리뷰 내용 | |
| `reserve_amount` | Number | 적립금액 | `500` |
| `적립_일시` | DateTime | 적립 시간 | `2026-04-01T14:30:00Z` |
| `상태` | SingleSelect | 적립 상태 | `success` / `failed` |
| `오류_메시지` | LongText | 적립 실패 시 오류 메시지 | |
| `created_at` | DateTime | 리뷰 작성 시간 | |

---

## 6. 환경 변수 & Credential 정리

### `.env` 또는 Credential ID

| 키 | 설명 | 저장소 | 예시 |
|----|------|--------|------|
| `MAKESHOP_SHOPKEY` | MakeShop Shop Key | `.secrets.env` | `xxx123` |
| `MAKESHOP_LICENSEKEY` | MakeShop License Key | `.secrets.env` | `yyy456` |
| `NOCODB_TOKEN` | NocoDB API 토큰 | Credential ID | `xc-...` |
| `KAKAO_API_URL` | 카카오 알림톡 API 엔드포인트 | `.secrets.env` | `https://...` |
| `KAKAO_API_KEY` | 카카오 API 키 | `.secrets.env` | |
| `SMS_API_URL` | SMS API 엔드포인트 | `.secrets.env` | |
| `SMS_API_KEY` | SMS API 키 | `.secrets.env` | |
| `TELEGRAM_CHAT_ID` | Telegram 채팅 ID | `.secrets.env` | `-5154731145` |

---

## 7. 주의사항 & 실패 시나리오

### 7-1. MakeShop API 제약사항

- **레이트 제한**: 시간당 조회/처리 각 500회 한도 → 일일 1회 실행이므로 문제 없음
- **배송 상태 코드**: 정확한 코드 확인 필요 (문서에서 `Y`로 표기)
- **배송일 형식**: `YYYY-MM-DD` 확인 필수

### 7-2. 연락처 검증

- 휴대폰번호 형식: `01X-XXXX-XXXX` 엄격 검증
- 테스트 계정 필터링: 필수 (요청자가 제공하는 블랙리스트)
- 이메일: 백업용, SMS/카카오 실패 시에만 사용 고려

### 7-3. 카카오 알림톡 vs SMS

**현재 상황**:
- MakeShop에서 카카오 알림톡 네이티브 API가 없을 수 있음
- SMS는 가능 (Naver 등 제휴사)

**권장**:
1. MakeShop 관리자 > 카카오 알림톡 연동 여부 확인
2. 미연동 시 → SMS만 발송 (Node 9 스킵)
3. 미래: 카카오 비즈니스 계정 별도 API 연동 고려

### 7-4. 적립금 지급 API

- MakeShop 오픈 API: `open_api_process.html?mode=save&type=reserve`
- **필수 검증**: 실제 API 엔드포인트와 파라미터명 확인
- 고객 ID 형식: MakeShop 내부 형식 확인

### 7-5. 중복 발송 방지

- NocoDB `발송_여부` 컬럼 필수
- 주문번호 유니크 인덱스 권장 (성능)
- 긴급 중복 발송 시 수동 개입 프로세스 정의 필요

---

## 8. 배포 체크리스트

- [ ] MakeShop API 레이트 제한 확인 (HTTP 429 에러 핸들링)
- [ ] 배송 상태 코드 검증 (`Y` 확정)
- [ ] 카카오 알림톡 API 가능 여부 확인
- [ ] SMS API 키 설정 (`.secrets.env`)
- [ ] NocoDB 테이블 2개 생성 & 컬럼 추가
- [ ] 휴대폰번호 블랙리스트 정의 (요청자 제공)
- [ ] Telegram Chat ID 확인 (`@Pressco21_alert_bot`)
- [ ] 테스트 실행 (테스트 주문 5~10개 기준)
- [ ] 오류 로깅 & 알림 경로 확인
- [ ] 적립금 지급 API 테스트 (별도 WF)

---

## 9. 미래 확장

### 9-1. 리뷰 작성 Webhook 트리거
- MakeShop에서 리뷰 완료 시 Webhook 호출 → 즉시 적립금 지급

### 9-2. AI 기반 리뷰 분석
- 리뷰 감정 분석 (긍정/부정)
- 주요 키워드 추출
- 월간 리뷰 리포트

### 9-3. 리뷰 인센티브 자동 증가
- 월간 리뷰 목표 미달 시 인센티브 조정
- 계절별 인센티브 변동

---

## 10. 설계 검토 포인트

**요청자 확인 사항**:

1. **카카오 알림톡 API 현황**:
   - MakeShop에서 제공하는가?
   - 별도 계약 필요한가?
   - 아니면 SMS만 사용?

2. **MakeShop 오픈 API 배송일 필드**:
   - 정확한 필드명 확인 (예: `shipping_date`, `sent_date` 등)
   - 배송 상태 코드 (현재 가정: `Y`)

3. **적립금 지급 API 엔드포인트**:
   - `open_api_process.html` 정확성
   - 고객 ID 형식 (번호 vs 이메일 vs 휴대폰)

4. **휴대폰번호 블랙리스트**:
   - 테스트 번호 목록 제공 필요

5. **발송 시간대**:
   - 매일 10:00 고정?
   - 요일별 미발송?

---

**설계 완료**: 2026-04-01
**다음 단계**: 세부 API 명세 확인 후 Node 9~11 구체화, JSON 구현
