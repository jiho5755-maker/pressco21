# Task 222: WF-06, WF-09, WF-10 클래스관리 + 후기답변 + 교육인증 n8n 워크플로우

> **담당**: gas-backend-expert
> **Phase**: 2 (n8n + NocoDB)
> **상태**: 완료
> **완료일**: 2026-02-25
> **의존**: Task 211 (WF-01~03), Task 201 (NocoDB), Task 202 (n8n 서버)

---

## 산출물

| 파일 | 노드 수 | 설명 |
|------|---------|------|
| `파트너클래스/n8n-workflows/WF-06-class-management.json` | 16노드 | 클래스 상태 변경 (active/paused/closed) |
| `파트너클래스/n8n-workflows/WF-09-review-reply.json` | 18노드 | 후기 답변 저장 (소유권 2단계 검증) |
| `파트너클래스/n8n-workflows/WF-10-education-complete.json` | 20노드 | 교육 이수 완료 (합격/불합격 분기 + 이메일) |
| `tasks/222-n8n-class-review-education.md` | - | 이 파일 |

---

## WF-06: Class Management (`/webhook/class-management`, POST)

### 플로우

```
Webhook POST
  -> Code(입력값 파싱: member_id, class_id, status)
  -> IF 입력 유효?
    -> No: Respond 400 (MISSING_PARAMS / INVALID_PARAMS)
    -> Yes:
      -> HTTP Request(NocoDB tbl_Partners: member_id 조회)
      -> Code(파트너 인증 확인: 존재 + active 상태)
      -> IF 파트너 인증?
        -> No: Respond 401 (NOT_PARTNER / PARTNER_INACTIVE)
        -> Yes:
          -> HTTP Request(NocoDB tbl_Classes: class_id 조회)
          -> Code(클래스 존재 + 소유권 확인: partner_code 비교)
          -> IF 소유권 확인?
            -> No: Respond 403/404 (CLASS_NOT_FOUND)
            -> Yes:
              -> HTTP Request(NocoDB tbl_Classes PATCH: status 업데이트)
              -> Code(텔레그램 메시지 + 성공 응답 구성)
              -> Telegram(상태 변경 알림)
              -> Respond 200
```

### 입력 파라미터

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `member_id` | string | O | 메이크샵 회원 ID |
| `class_id` | string | O | 클래스 ID |
| `status` | string | O | 변경할 상태 (`active`, `paused`, `closed`) |

### 응답 예시

```json
{
  "success": true,
  "data": {
    "class_id": "CLS_001",
    "class_name": "봄꽃 압화 원데이 클래스",
    "old_status": "active",
    "new_status": "paused",
    "message": "클래스 상태가 변경되었습니다."
  },
  "timestamp": "2026-03-15T14:00:00.000Z"
}
```

### 텔레그램 알림

```
[클래스 상태 변경]

클래스: 봄꽃 압화 원데이 클래스
파트너: 꽃향기 공방 (PC_202603_001)
변경: 활성 -> 일시정지
시각: 2026-03-15T14:00:00.000Z
```

---

## WF-09: Review Reply (`/webhook/review-reply`, POST)

### 플로우

```
Webhook POST
  -> Code(입력값 파싱 + sanitizeAnswer: HTML 태그/XSS 제거)
  -> IF 입력 유효?
    -> No: Respond 400
    -> Yes:
      -> HTTP Request(NocoDB tbl_Partners: member_id 인증)
      -> Code(파트너 인증 확인)
      -> IF 파트너 인증?
        -> No: Respond 401
        -> Yes:
          -> HTTP Request(NocoDB tbl_Reviews: review_id 조회)
          -> Code(후기 존재 확인 + class_id/partner_code 추출)
          -> IF 후기 존재?
            -> No: Respond 404 (REVIEW_NOT_FOUND)
            -> Yes:
              -> HTTP Request(NocoDB tbl_Classes: class_id로 소유권 역추적)
              -> Code(소유권 2단계 검증)
              -> IF 소유권 확인?
                -> No: Respond 403 (REVIEW_NOT_OWNED)
                -> Yes:
                  -> HTTP Request(NocoDB tbl_Reviews PATCH: partner_answer, answer_at)
                  -> Code(성공 응답)
                  -> Respond 200
```

### 입력 파라미터

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `member_id` | string | O | 메이크샵 회원 ID |
| `review_id` | string | O | 후기 ID |
| `answer` | string | O | 답변 텍스트 (최대 1000자, HTML 태그 자동 제거) |

### 보안: 텍스트 sanitize

```javascript
// sanitizeAnswer() 적용 항목:
// 1. <script>, <iframe> 등 HTML 태그 전체 제거
// 2. javascript:, data:, vbscript: 프로토콜 제거
// 3. onclick, onerror 등 on이벤트 핸들러 제거
// 4. 제어 문자 (0x00~0x1F) 제거
// 5. 1000자 길이 제한
```

### 소유권 2단계 검증

```
1차: tbl_Reviews.partner_code 필드가 있으면 직접 비교
2차: tbl_Reviews.class_id -> tbl_Classes 조회 -> partner_code 비교
```

### 응답 예시

```json
{
  "success": true,
  "data": {
    "review_id": "RV_001",
    "class_id": "CLS_001",
    "answer": "소중한 후기 감사합니다!",
    "answer_at": "2026-03-15T14:00:00.000Z",
    "message": "후기 답변이 저장되었습니다."
  },
  "timestamp": "2026-03-15T14:00:00.000Z"
}
```

---

## WF-10: Education Complete (`/webhook/education-complete`, POST)

### 플로우

```
Webhook POST
  -> Code(입력값 파싱 + 합격 판정: PASS_THRESHOLD=11, TOTAL_QUESTIONS=15)
  -> IF 입력 유효?
    -> No: Respond 400
    -> Yes:
      -> HTTP Request(NocoDB tbl_Partners: member_id 인증)
      -> Code(파트너 인증 확인)
      -> IF 파트너 인증?
        -> No: Respond 401
        -> Yes:
          -> IF 합격? (score >= 11)
            -> 합격 (병렬 3개):
              -> HTTP Request(NocoDB tbl_Partners PATCH: education_completed=Y, education_date, education_score)
              -> Build Certificate Email -> Send Certificate Email
              -> Build Pass Telegram -> Telegram
              -> Build Pass Response -> Respond 200 {passed: true}
            -> 불합격:
              -> Build Retry Email -> Send Retry Email
              -> Build Fail Response -> Respond 200 {passed: false}
```

### 입력 파라미터

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `member_id` | string | O | 메이크샵 회원 ID |
| `score` | number | O | 맞은 문항 수 (0~15 정수) |
| `total` | number | O | 총 문항 수 (반드시 15) |

### 서버 고정 상수 (보안)

| 상수 | 값 | 설명 |
|------|----|------|
| `PASS_THRESHOLD` | 11 | 합격 기준 (73%) |
| `TOTAL_QUESTIONS` | 15 | 총 문항 수 |

클라이언트에서 `pass_threshold`를 전송해도 서버에서 무시합니다.

### 합격 이메일

- **제목**: `[PRESSCO21] 교육을 이수하셨습니다! Bloom 파트너 활성화 안내`
- **톤**: 격식있고 축하하는 톤 (우아 + 따뜻 + 신뢰)
- **구성**: CERTIFICATE 인증서 박스 + 점수/이수일/파트너코드 + Bloom 파트너 안내 + 다음 단계 3단 + Tip(소규모 원데이 추천) + CTA(대시보드)
- **색상**: #b89b5e(골드), #3d2c1e(다크 브라운), #f8f6f0(아이보리 배경)

### 불합격 이메일

- **제목**: `[PRESSCO21] 파트너 아카데미 - 다시 도전해 보세요!`
- **톤**: 따뜻하게 격려하는 톤 (포기하지 말고 다시 도전)
- **구성**: 격려 메시지 + 점수 비교표(나의 점수/합격 기준/부족 문항) + 합격 팁 3가지 + CTA(다시 퀴즈 응시하기) + "응시 횟수 제한 없음" 안내
- **금지 표현**: "부적합", "미달", "실패" (대신 "조금 아쉬웠지만", "미치지 못했지만")

### 텔레그램 알림 (합격 시만)

```
[교육 합격]

파트너: 꽃향기 공방 (PC_202603_001)
점수: 13/15
합격 기준: 11/15
이수일: 2026-03-15

Bloom 파트너 활성화 완료
```

### NocoDB 업데이트 (합격 시만)

| 필드 | 값 |
|------|----|
| `education_completed` | `Y` |
| `education_date` | `2026-03-15` (당일 날짜) |
| `education_score` | `13` (맞은 문항 수) |

---

## 공통 패턴

### CORS 헤더

모든 Respond 노드에 동일 적용:
```
Access-Control-Allow-Origin: https://foreverlove.co.kr
Content-Type: application/json; charset=utf-8
```

### NocoDB 인증

모든 HTTP Request 노드에 동일 적용:
```
Credentials: NocoDB API Token (httpHeaderAuth, xc-token 헤더)
URL 패턴: https://nocodb.pressco21.com/api/v1/db/data/noco/{NOCODB_PROJECT_ID}/{tableName}
```

### 에러 응답 형식

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "한국어 에러 메시지"
  },
  "timestamp": "2026-03-15T14:00:00.000Z"
}
```

### 에러 코드

| 코드 | HTTP | 워크플로우 | 설명 |
|------|------|-----------|------|
| `MISSING_PARAMS` | 400 | WF-06, WF-09, WF-10 | 필수 파라미터 누락 |
| `INVALID_PARAMS` | 400 | WF-06 | status 값 유효하지 않음 |
| `INVALID_SCORE` | 400 | WF-10 | 점수 값 유효하지 않음 |
| `NOT_LOGGED_IN` | 401 | WF-10 | member_id 없음 |
| `NOT_PARTNER` | 401 | WF-06, WF-09, WF-10 | 파트너 미등록 |
| `PARTNER_INACTIVE` | 401 | WF-06, WF-09, WF-10 | 파트너 비활성 |
| `REVIEW_NOT_FOUND` | 404 | WF-09 | 후기 없음 |
| `REVIEW_NOT_OWNED` | 403 | WF-09 | 소유권 불일치 |
| `CLASS_NOT_FOUND` | 404 | WF-06 | 클래스 없음 또는 소유권 불일치 |

### 이메일/텔레그램 실패 처리

- `onError: continueRegularOutput` -- 이메일/텔레그램 발송 실패가 전체 워크플로우를 중단시키지 않음
- 데이터 저장(NocoDB PATCH)이 이메일보다 우선

---

## 테스트 체크리스트

### WF-06 Class Management

- [ ] 정상: active -> paused 변경 + 텔레그램 알림 수신
- [ ] 정상: paused -> active 변경
- [ ] 정상: active -> closed 변경
- [ ] 에러: member_id 누락 -> 400 MISSING_PARAMS
- [ ] 에러: class_id 누락 -> 400 MISSING_PARAMS
- [ ] 에러: status=unknown -> 400 INVALID_PARAMS
- [ ] 에러: 미등록 member_id -> 401 NOT_PARTNER
- [ ] 에러: inactive 파트너 -> 401 PARTNER_INACTIVE
- [ ] 에러: 존재하지 않는 class_id -> 404 CLASS_NOT_FOUND
- [ ] 에러: 타 파트너 소유 클래스 -> 403 CLASS_NOT_FOUND (메시지: "본인 소유의 클래스만...")
- [ ] NocoDB tbl_Classes status 필드 실제 변경 확인
- [ ] 텔레그램 메시지에 한국어 상태명 (활성/일시정지/마감) 표시 확인

### WF-09 Review Reply

- [ ] 정상: 후기 답변 저장 + answer_at 업데이트
- [ ] 정상: 기존 답변 덮어쓰기 (재답변)
- [ ] 에러: member_id 누락 -> 400
- [ ] 에러: review_id 누락 -> 400
- [ ] 에러: answer 빈 문자열 -> 400
- [ ] 에러: 미등록 member_id -> 401
- [ ] 에러: 존재하지 않는 review_id -> 404
- [ ] 에러: 타 파트너 소유 클래스 후기 -> 403
- [ ] 보안: `<script>alert('XSS')</script>` 입력 -> 태그 제거 후 저장
- [ ] 보안: `javascript:alert(1)` 입력 -> 프로토콜 제거
- [ ] 보안: `onclick="alert(1)"` 입력 -> 이벤트 핸들러 제거
- [ ] 1000자 초과 답변 -> 1000자로 잘림
- [ ] NocoDB tbl_Reviews partner_answer, answer_at 필드 실제 변경 확인
- [ ] 소유권 1차 검증: partner_code 직접 비교 (partner_code 필드 있는 경우)
- [ ] 소유권 2차 검증: class_id 역추적 (partner_code 필드 없는 경우)

### WF-10 Education Complete

- [ ] 정상 합격: score=13, total=15 -> passed=true + DB 업데이트 + 인증서 이메일 + 텔레그램
- [ ] 정상 합격: score=11 (경계값) -> passed=true
- [ ] 정상 불합격: score=10 -> passed=false + 재응시 안내 이메일
- [ ] 정상 불합격: score=0 -> passed=false
- [ ] 에러: member_id 누락 -> 401
- [ ] 에러: score 누락 -> 400
- [ ] 에러: total=10 (15가 아닌 값) -> 400 INVALID_SCORE
- [ ] 에러: score=-1 -> 400 INVALID_SCORE
- [ ] 에러: score=16 -> 400 INVALID_SCORE
- [ ] 에러: score=10.5 (소수) -> 400 INVALID_SCORE
- [ ] 에러: score="abc" -> 400 INVALID_SCORE
- [ ] 에러: 미등록 member_id -> 401
- [ ] 보안: 클라이언트 pass_threshold 파라미터 무시 확인
- [ ] NocoDB tbl_Partners: education_completed=Y, education_date, education_score 업데이트 확인
- [ ] 합격 이메일: CERTIFICATE 인증서 포함, 골드/브라운 색상, XSS 방지
- [ ] 불합격 이메일: 격려 톤, 점수 비교표, 합격 팁, CTA "다시 퀴즈 응시하기"
- [ ] 텔레그램: 합격 시만 발송, 불합격 시 미발송
- [ ] 이메일 발송 실패 시에도 응답 정상 반환 (onError: continueRegularOutput)
- [ ] DB 업데이트 실패 시에도 이메일은 영향 없음 (병렬 실행)

---

## GAS 대비 변경점

| 항목 | GAS (기존) | n8n (신규) |
|------|-----------|-----------|
| 동시성 제어 | LockService.waitLock(10000) | NocoDB 낙관적 동시성 (n8n 단일 실행) |
| 캐시 무효화 | invalidateClassCache_() | 불필요 (NocoDB 실시간 조회) |
| 이메일 발송 | GAS MailApp (100건/일) | SMTP (500건/일+) |
| 알림 | 없음 | 텔레그램 실시간 알림 |
| 에러 복구 | Logger.log | n8n 실행 이력 + 텔레그램 |
| 교육 컬럼 자동 추가 | 시트 컬럼 동적 추가 | NocoDB 필드 사전 정의 (불필요) |
