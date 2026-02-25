# Task 212: WF-04 예약기록 + 수수료계산 + 정산 파이프라인 n8n 워크플로우

> **Phase**: 2-A (n8n + NocoDB)
> **담당**: gas-backend-expert
> **상태**: 구현 완료
> **생성일**: 2026-02-25
> **산출물**: `파트너클래스/n8n-workflows/WF-04-record-booking.json`

---

## 1. 개요

WF-04 Record Booking 워크플로우는 PRESSCO21 파트너 클래스 플랫폼의 핵심 예약/정산 파이프라인이다.
수강생이 클래스를 결제하면 이 워크플로우가 호출되어:

1. 입력값 검증
2. NocoDB에서 클래스/파트너 정보 조회
3. 수수료 계산 (등급별 차등)
4. 자기 결제 방지 검사
5. NocoDB tbl_Settlements에 정산 레코드 생성 (D+3 대기)
6. 수강생 예약 확인 이메일 발송
7. 파트너 예약 알림 이메일 발송
8. 텔레그램 관리자 알림

을 수행한다.

---

## 2. 워크플로우 아키텍처

### 엔드포인트

- **URL**: `https://n8n.pressco21.com/webhook/record-booking`
- **Method**: POST
- **Content-Type**: application/json

### 노드 플로우 (27개 노드)

```
Webhook POST
  -> Validate Input (Code)
    -> IF Input Valid
      -> [False] Respond Validation Error (400)
      -> [True]  NocoDB Get Class (HTTP Request)
        -> Check Class Exists (Code)
          -> IF Class Found
            -> [False] Respond Class Error (404)
            -> [True]  NocoDB Get Partner (HTTP Request)
              -> Calculate Commission (Code)
                -> IF Partner Found
                  -> [False] Respond Partner Error (500)
                  -> [True]  NocoDB Create Settlement (HTTP Request POST)
                    -> Check Create Result (Code)
                      -> IF Created OK
                        -> [False] Build Error Telegram -> Telegram Error Alert -> Respond Create Error (500)
                        -> [True]  IF Not Self Purchase
                          -> [True]  Build Student Email   -> Send Student Email -> Build Success Response -> Respond Success
                                     Build Partner Email   -> Send Partner Email
                                     Build Telegram Message -> Telegram New Booking
                          -> [False] Build Self Purchase Alert -> Telegram Self Purchase -> Build Self Purchase Response -> Respond Self Purchase
```

### 노드 상세

| # | 노드 ID | 노드명 | 타입 | 역할 |
|---|---------|--------|------|------|
| 1 | wf04-webhook | Webhook | webhook | POST /record-booking 수신 |
| 2 | wf04-validate-input | Validate Input | code | 필수/선택 필드 검증, sanitize, XSS 방지 |
| 3 | wf04-if-valid | IF Input Valid | if | 입력 검증 통과 분기 |
| 4 | wf04-respond-validation-error | Respond Validation Error | respondToWebhook | 400 에러 응답 |
| 5 | wf04-nocodb-get-class | NocoDB Get Class | httpRequest | tbl_Classes 조회 by class_id |
| 6 | wf04-check-class | Check Class Exists | code | 클래스 존재 확인 + partner_code 추출 |
| 7 | wf04-if-class-found | IF Class Found | if | 클래스 존재 분기 |
| 8 | wf04-respond-class-error | Respond Class Error | respondToWebhook | 404 에러 응답 |
| 9 | wf04-nocodb-get-partner | NocoDB Get Partner | httpRequest | tbl_Partners 조회 by partner_code |
| 10 | wf04-calc-commission | Calculate Commission | code | 수수료/적립금 계산, 자기결제 판별, settlement_id 생성 |
| 11 | wf04-if-partner-found | IF Partner Found | if | 파트너 존재 분기 |
| 12 | wf04-respond-partner-error | Respond Partner Error | respondToWebhook | 500 에러 응답 |
| 13 | wf04-nocodb-create-settlement | NocoDB Create Settlement | httpRequest | tbl_Settlements POST 레코드 생성 |
| 14 | wf04-check-create-result | Check Create Result | code | 레코드 생성 결과 확인 |
| 15 | wf04-if-created | IF Created OK | if | 생성 성공 분기 |
| 16 | wf04-if-not-self-purchase | IF Not Self Purchase | if | 자기결제 분기 |
| 17 | wf04-build-student-email | Build Student Email | code | 수강생 예약확인 이메일 HTML 생성 |
| 18 | wf04-send-student-email | Send Student Email | emailSend | SMTP 발송 (실패 시 계속 진행) |
| 19 | wf04-build-partner-email | Build Partner Email | code | 파트너 예약알림 이메일 HTML 생성 |
| 20 | wf04-send-partner-email | Send Partner Email | emailSend | SMTP 발송 (실패 시 계속 진행) |
| 21 | wf04-build-telegram-msg | Build Telegram Message | code | 텔레그램 새 예약 알림 메시지 |
| 22 | wf04-telegram-booking | Telegram New Booking | telegram | 텔레그램 발송 |
| 23 | wf04-build-success-response | Build Success Response | code | 성공 JSON 응답 구성 |
| 24 | wf04-respond-success | Respond Success | respondToWebhook | 200 성공 응답 |
| 25 | wf04-build-self-purchase-msg | Build Self Purchase Alert | code | 자기결제 텔레그램 경고 |
| 26 | wf04-telegram-self-purchase | Telegram Self Purchase | telegram | 자기결제 텔레그램 발송 |
| 27~ | 기타 에러 처리 | ... | ... | 에러 텔레그램 + 에러 응답 |

---

## 3. 핵심 비즈니스 로직

### 3-1. 수수료 계산 (개선안 B 적용)

| 등급 | commission_rate | reserve_rate | 적립금 비율 |
|------|----------------|--------------|-----------|
| SILVER | 10% | 100% | 수수료 전액 적립금 |
| GOLD | 12% | 100% | 수수료 전액 적립금 (개선안 B) |
| PLATINUM | 15% | 80% | 수수료의 80% 적립금 |

```javascript
const commissionAmount = Math.round(orderAmount * commissionRate);
const reserveAmount = Math.round(commissionAmount * reserveRate);
```

**예시**: 수강료 90,000원, SILVER 파트너
- commission: Math.round(90000 * 0.10) = 9,000원
- reserve: Math.round(9000 * 1.00) = 9,000원

### 3-2. D+3 정산 방식

- 즉시 적립금 지급 **X** (GAS 기존 방식과 다름)
- `status = PENDING_SETTLEMENT` 상태로 NocoDB에 기록
- `settlement_due_date = class_date + 3일` 계산하여 저장
- 실제 적립금 지급은 **WF-05 야간배치**에서 수행:
  - `settlement_due_date <= today AND status == 'PENDING_SETTLEMENT'` 조건
  - 메이크샵 `process_reserve` API 호출
  - 성공 시 `COMPLETED`, 실패 시 `FAILED`

### 3-3. 자기 결제 방지

```javascript
const isSelfPurchase = (booking.memberId === partner.member_id);
```

- `member_id`가 파트너의 `member_id`와 동일하면 자기 결제
- `status = SELF_PURCHASE`로 기록 (적립금 지급 대상에서 제외)
- 이메일 발송하지 않음
- 텔레그램 경고 알림 발송

### 3-4. settlement_id 형식

```
STL_YYYYMMDD_XXXXXX
```

- `STL_`: 접두사
- `YYYYMMDD`: 생성일
- `XXXXXX`: 6자리 랜덤 숫자

예: `STL_20260325_847291`

---

## 4. 입력/출력 스펙

### 4-1. 요청 (POST body)

| 필드 | 필수 | 타입 | 검증 | 설명 |
|------|------|------|------|------|
| class_id | O | string | 비어있지 않음 | 클래스 ID |
| member_id | O | string | 비어있지 않음 | 수강생 메이크샵 회원 ID |
| booking_date | O | string | YYYY-MM-DD 형식 | 수업 예정일 |
| participants | O | number | 1 이상, 50 이하 | 참여 인원 |
| amount | O | number | 1 이상, 10,000,000 이하 | 결제 금액 (원) |
| student_name | - | string | 최대 100자 | 수강생 이름 |
| student_email | - | string | 이메일 형식 | 수강생 이메일 (알림용) |
| student_phone | - | string | 최대 20자 | 수강생 전화번호 |

### 4-2. 성공 응답 (200)

```json
{
  "success": true,
  "data": {
    "settlement_id": "STL_20260325_847291",
    "class_name": "봄꽃 압화 에코백 원데이 클래스",
    "partner_name": "꽃향기 공방",
    "booking_date": "2026-03-28",
    "participants": 2,
    "amount": 90000,
    "commission_amount": 9000,
    "reserve_amount": 9000,
    "settlement_due_date": "2026-03-31",
    "status": "PENDING_SETTLEMENT",
    "message": "예약이 확인되었습니다. 수업 완료 후 D+3에 파트너에게 적립금이 지급됩니다."
  },
  "timestamp": "2026-03-25T10:30:00.000Z"
}
```

### 4-3. 자기 결제 응답 (200, 경고)

```json
{
  "success": true,
  "data": {
    "settlement_id": "STL_20260325_123456",
    "class_name": "봄꽃 압화 에코백 원데이 클래스",
    "status": "SELF_PURCHASE",
    "message": "파트너 본인의 클래스 결제가 감지되었습니다. 정산이 보류됩니다."
  },
  "timestamp": "2026-03-25T10:30:00.000Z"
}
```

### 4-4. 에러 응답 (400/404/500)

```json
{
  "success": false,
  "error": {
    "code": "MISSING_PARAMS",
    "message": "class_id, member_id 파라미터가 필요합니다."
  },
  "timestamp": "2026-03-25T10:30:00.000Z"
}
```

**에러 코드**:
| 코드 | HTTP | 상황 |
|------|------|------|
| MISSING_PARAMS | 400 | 필수 파라미터 누락 |
| INVALID_PARAMS | 400 | 파라미터 형식/범위 오류 |
| CLASS_NOT_FOUND | 404 | class_id에 해당하는 클래스 없음 |
| INTERNAL_ERROR | 500 | 파트너 정보 없음, 내부 오류 |
| RESERVATION_FAILED | 500 | NocoDB 레코드 생성 실패 |

---

## 5. NocoDB 테이블 매핑

### tbl_Settlements 레코드 필드

| NocoDB 필드 | 타입 | 값 출처 | 설명 |
|-------------|------|---------|------|
| settlement_id | SingleLineText | 생성 (STL_YYYYMMDD_XXXXXX) | PK |
| class_id | SingleLineText | 입력 | 클래스 ID |
| partner_code | SingleLineText | tbl_Classes에서 조회 | 파트너 코드 |
| member_id | SingleLineText | 입력 | 수강생 회원 ID |
| order_amount | Number | 입력 (amount) | 결제 금액 |
| commission_rate | Number | 등급별 계산 | 수수료율 (0.10~0.15) |
| commission_amount | Number | 계산 | 수수료 금액 |
| reserve_rate | Number | 등급별 계산 | 적립금 전환율 (0.80~1.00) |
| reserve_amount | Number | 계산 | 적립금 금액 |
| class_date | Date | 입력 (booking_date) | 수업 예정일 |
| settlement_due_date | Date | 계산 (class_date + 3일) | 정산 예정일 |
| student_count | Number | 입력 (participants) | 수강 인원 |
| status | SingleLineText | 로직 결정 | PENDING_SETTLEMENT / SELF_PURCHASE |
| student_name | SingleLineText | 입력 (선택) | 수강생 이름 |
| student_email | Email | 입력 (선택) | 수강생 이메일 |
| student_phone | PhoneNumber | 입력 (선택) | 수강생 전화번호 |
| created_date | DateTime | 자동 (ISO 8601) | 생성 일시 |
| retry_count | Number | 초기값 0 | 적립금 지급 재시도 횟수 |

---

## 6. 이메일 템플릿

### 6-1. 수강생 예약 확인 이메일 (이메일 1)

- **수신**: student_email
- **제목**: `[PRESSCO21] {className} 예약이 확정되었습니다`
- **HTML**: `docs/phase2/email-templates.md` 이메일 1 기반
- **동적 값 XSS 방지**: 모든 값 `escapeHtml()` 처리
- **조건부 블록**: 준비물(materials_included) 있을 때만 표시
- **실패 시**: 예약 자체는 유지 (onError: continueRegularOutput)

### 6-2. 파트너 예약 알림 이메일 (이메일 6)

- **수신**: partner.email
- **제목**: `[PRESSCO21] 새 예약이 들어왔습니다 - {className}`
- **HTML**: `docs/phase2/email-templates.md` 이메일 6 기반
- **개인정보 마스킹**: 수강생 이름 `홍**`, 전화번호 `010-****-5678`
- **CTA**: 파트너 대시보드 링크
- **실패 시**: 예약 자체는 유지

---

## 7. 텔레그램 알림

### 7-1. 새 예약 알림

```
📦 새 예약 알림

클래스: 봄꽃 압화 에코백 원데이 클래스
수강생: 홍** (2명)
수업일: 2026년 3월 28일 (토)
결제액: 90,000원
수수료: 9,000원
적립금: 9,000원 (SILVER)
정산예정: 2026-03-31 (D+3)
예약번호: STL_20260325_847291
```

### 7-2. 자기 결제 경고

```
⚠️ 자기 결제 감지

파트너: 꽃향기 공방 (PC_202603_001)
회원ID: partner123
클래스: 봄꽃 압화 에코백 원데이 클래스
금액: 90,000원
예약번호: STL_20260325_123456

정산 상태: SELF_PURCHASE (적립금 미지급)
확인이 필요합니다.
```

### 7-3. 에러 알림

```
🚨 예약 기록 실패

예약 기록 저장 실패: 봄꽃 압화 에코백 원데이 클래스 / 홍길동
```

---

## 8. 보안 체크리스트

- [x] 입력값 sanitize (제어 문자 제거, 길이 제한)
- [x] 이메일 HTML 동적값 escapeHtml() XSS 방지
- [x] 개인정보 마스킹 (파트너 이메일에서 수강생 정보)
- [x] 자기 결제 방지 (member_id 비교)
- [x] 금액 범위 검증 (1~10,000,000원)
- [x] 인원 범위 검증 (1~50명)
- [x] 날짜 형식 검증 (YYYY-MM-DD)
- [x] 이메일 형식 검증 (있는 경우만)
- [x] NocoDB API 인증 (xc-token 헤더)
- [x] CORS 헤더 (foreverlove.co.kr)
- [x] 이메일/텔레그램 실패 시 예약 데이터 보존 (onError: continueRegularOutput)

---

## 9. GAS 대비 변경사항

| 항목 | GAS (기존) | n8n WF-04 (신규) |
|------|-----------|------------------|
| 정산 방식 | 즉시 적립금 지급 | D+3 대기 (PENDING_SETTLEMENT) |
| 자기 결제 | 미구현 | member_id 비교 + SELF_PURCHASE 상태 |
| 수수료 (GOLD) | reserveRate: 0.80 | reserveRate: 1.00 (개선안 B) |
| 알림 | 이메일만 | 이메일 + 텔레그램 |
| 동시성 | LockService | NocoDB 낙관적 동시성 |
| 에러 알림 | 관리자 이메일 | 텔레그램 실시간 |
| settlement_id | generateId_('STL') | STL_YYYYMMDD_XXXXXX |
| settlement_due_date | 미존재 | class_date + 3일 |
| retry_count | error_message 내 "retry:N\|" | NocoDB Number 필드 (정식) |

---

## 10. 환경 변수 / Credentials 요구사항

### n8n 환경 변수

| 변수 | 용도 |
|------|------|
| `NOCODB_PROJECT_ID` | NocoDB 프로젝트 ID |
| `TELEGRAM_CHAT_ID` | 텔레그램 관리자 채팅 ID |

### n8n Credentials

| 이름 | 타입 | 용도 |
|------|------|------|
| NocoDB API Token | HTTP Header Auth (xc-token) | NocoDB API 인증 |
| PRESSCO21 SMTP | SMTP | 이메일 발송 |
| PRESSCO21 Telegram Bot | Telegram API | 텔레그램 알림 |

---

## 11. 테스트 체크리스트

### 11-1. 입력 검증 테스트

- [ ] 모든 필수 필드 제공 시 200 응답
- [ ] class_id 누락 시 400 + MISSING_PARAMS 에러
- [ ] member_id 누락 시 400 + MISSING_PARAMS 에러
- [ ] booking_date 누락 시 400 + MISSING_PARAMS 에러
- [ ] participants = 0 시 400 에러
- [ ] amount = 0 시 400 에러
- [ ] booking_date 형식 "2026/03/25" (잘못된 형식) 시 400 + INVALID_PARAMS
- [ ] amount = 20,000,000 (초과) 시 400 + INVALID_PARAMS
- [ ] participants = 100 (초과) 시 400 + INVALID_PARAMS
- [ ] student_email = "invalid" (잘못된 형식) 시 400 + INVALID_PARAMS
- [ ] XSS 시도: class_id = `<script>alert(1)</script>` 시 sanitize 확인
- [ ] 선택 필드 전부 누락해도 정상 처리

### 11-2. 클래스/파트너 조회 테스트

- [ ] 존재하는 class_id 시 클래스 정보 정상 조회
- [ ] 존재하지 않는 class_id 시 404 + CLASS_NOT_FOUND
- [ ] NocoDB Links 필드에서 partner_code 정상 추출
- [ ] partner_code에 해당하는 파트너 정상 조회
- [ ] partner_code가 없는 클래스 시 500 + INTERNAL_ERROR

### 11-3. 수수료 계산 테스트

- [ ] SILVER 파트너 (10%, 100%): 90,000원 -> 수수료 9,000원, 적립금 9,000원
- [ ] GOLD 파트너 (12%, 100%): 90,000원 -> 수수료 10,800원, 적립금 10,800원
- [ ] PLATINUM 파트너 (15%, 80%): 90,000원 -> 수수료 13,500원, 적립금 10,800원
- [ ] 등급 미설정 파트너 -> SILVER 기본값 적용
- [ ] 소수점 반올림 (Math.round) 정확성 확인

### 11-4. D+3 정산 테스트

- [ ] settlement_due_date = booking_date + 3일 정확히 계산
- [ ] status = "PENDING_SETTLEMENT" 정상 기록
- [ ] settlement_id 형식 STL_YYYYMMDD_XXXXXX 확인
- [ ] 모든 필드가 NocoDB tbl_Settlements에 정상 저장

### 11-5. 자기 결제 방지 테스트

- [ ] member_id != partner.member_id 시 정상 예약 처리 (이메일 + 텔레그램)
- [ ] member_id == partner.member_id 시 SELF_PURCHASE 상태 기록
- [ ] 자기 결제 시 이메일 발송하지 않음
- [ ] 자기 결제 시 텔레그램 경고 알림 발송
- [ ] 자기 결제 응답에 적절한 메시지 포함

### 11-6. 이메일 발송 테스트

- [ ] 수강생 예약 확인 이메일 정상 수신
- [ ] 파트너 예약 알림 이메일 정상 수신
- [ ] 이메일 HTML에 XSS 코드가 이스케이프되어 표시
- [ ] 수강생 이메일에 준비물(materials_included) 조건부 표시
- [ ] 파트너 이메일에 수강생 정보가 마스킹됨 (홍**, 010-****-5678)
- [ ] student_email 없으면 수강생 이메일 스킵 (에러 없이)
- [ ] partner.email 없으면 파트너 이메일 스킵 (에러 없이)
- [ ] 이메일 발송 실패 시에도 예약 데이터 정상 보존

### 11-7. 텔레그램 알림 테스트

- [ ] 정상 예약 시 새 예약 알림 텔레그램 수신
- [ ] 자기 결제 시 경고 텔레그램 수신
- [ ] NocoDB 생성 실패 시 에러 텔레그램 수신
- [ ] 텔레그램 Markdown 포맷 정상 표시
- [ ] 텔레그램 발송 실패 시에도 예약 응답 정상 반환

### 11-8. 에러 처리 테스트

- [ ] NocoDB 연결 실패 시 500 에러 + 텔레그램 알림
- [ ] NocoDB 레코드 생성 실패 시 적절한 에러 응답
- [ ] SMTP 연결 실패 시 예약 데이터 보존
- [ ] 텔레그램 연결 실패 시 예약 데이터 보존
- [ ] 모든 에러 응답이 표준 JSON 형식

### 11-9. 통합 테스트

- [ ] 전체 정상 흐름 E2E: POST -> 200 성공 -> NocoDB 레코드 확인 -> 이메일 수신 -> 텔레그램 수신
- [ ] 프론트엔드에서 실제 호출 테스트 (CORS 확인)
- [ ] 동시 요청 5건 전송 시 모두 정상 처리 (각각 고유 settlement_id)
- [ ] 큰 입력값 (student_name 100자, student_email 200자) 정상 처리

---

## 12. 다음 단계 (의존 Task)

- **WF-05 Order Polling 야간배치** (Task 212 범위 외, 추후 구현)
  - `PENDING_SETTLEMENT` + `settlement_due_date <= today` 조건으로 적립금 지급
  - 메이크샵 `process_reserve` API 호출
  - 성공: `COMPLETED`, 실패: `FAILED` + retry_count 증가
  - 최대 5회 재시도 후 관리자 알림

- **환불/취소 처리** (Phase 2 안정화 후)
  - D-3 무료취소: PENDING_SETTLEMENT -> CANCELLED
  - D+3 이후 환불: COMPLETED -> REFUND_REQUIRED -> 적립금 차감 API

---

## 변경 이력

| 날짜 | 버전 | 내용 |
|------|------|------|
| 2026-02-25 | 1.0 | WF-04 워크플로우 구현 + Task 정의 작성 (gas-backend-expert) |
