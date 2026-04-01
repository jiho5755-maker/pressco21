# 알리고 카카오 알림톡 셋업 가이드

> PRESSCO21 리뷰 자동화 시스템용
> 작성: 2026-04-01

---

## 1. 알리고 가입 및 초기 설정

### 가입
1. https://smartsms.aligo.in 접속 → 회원가입
2. 사업자 인증 (사업자등록증 필요)
3. 포인트 충전 (최소 1만원 권장, 알림톡 ~7원/건)

### IP 등록 (필수!)
- 알리고 콘솔 > 환경설정 > IP 등록
- **등록할 IP**: `158.180.77.201` (n8n 서버)
- IP 미등록 시 API 호출 차단됨

### API Key 확인
- 알리고 콘솔 > 환경설정 > API Key
- `apikey`와 `userid` 메모

---

## 2. 카카오 채널 연동

### 발신프로필 등록
1. 알리고 콘솔 > 카카오 알림톡 > 발신프로필 관리
2. 카카오채널 ID: `@pressco21`
3. 인증 전화번호: 대표 연락처
4. 인증 요청 → 카카오톡으로 인증번호 수신 → 입력
5. 발신프로필 심사 제출 → 승인 대기

### 발신프로필 승인 후
- `senderkey` 값을 메모 (API 호출에 필수)

---

## 3. 알림톡 템플릿 등록 (3종)

### 템플릿 1: 배송 완료 안내

**템플릿 코드**: `delivery_complete` (자동 생성됨)
**카테고리**: 배송

```
[프레스코21] #{고객명}님, 주문하신 상품이 발송되었습니다.

■ 주문번호: #{주문번호}
■ 상품: #{상품명}

#{고객명}님의 소중한 후기를 기다립니다!
- 포토 후기: 500원 적립금
- 텍스트 후기: 200원 적립금

감사합니다.
```

**버튼**:
- 버튼1: [웹링크] "리뷰 작성하기" → `https://foreverlove.co.kr/shop/mypage/mp_review_list_oo.html`
- 버튼2: [웹링크] "배송 조회" → `https://foreverlove.co.kr/shop/mypage/mp_order_oo.html`

---

### 템플릿 2: 리뷰 작성 리마인드 (D+7)

**템플릿 코드**: `review_remind_d7`
**카테고리**: 기타

```
[프레스코21] #{고객명}님, 주문하신 #{상품명} 잘 받으셨나요?

#{고객명}님의 솔직한 후기가 다른 고객님들께 큰 도움이 됩니다.

■ 포토 후기: 500원 적립금
■ 텍스트 후기: 200원 적립금

한 줄이라도 좋으니 후기를 남겨주세요!
```

**버튼**:
- 버튼1: [웹링크] "리뷰 작성하기" → `https://foreverlove.co.kr/shop/mypage/mp_review_list_oo.html`

---

### 템플릿 3: 적립금 지급 완료

**템플릿 코드**: `reward_complete`
**카테고리**: 적립금

```
[프레스코21] #{고객명}님, 후기 감사합니다!

#{리뷰타입} 후기 작성 감사 적립금이 지급되었습니다.

■ 지급 적립금: #{금액}원

적립금은 다음 주문 시 사용하실 수 있습니다.
항상 감사합니다!
```

**버튼**:
- 버튼1: [웹링크] "쇼핑하러 가기" → `https://foreverlove.co.kr`

---

### 템플릿 등록 프로세스
1. 알리고 콘솔 > 카카오 알림톡 > 템플릿 관리 > 등록
2. 위 내용 복사 + 버튼 설정
3. 검수 요청 → 카카오 심사 3~5 영업일
4. 승인 후 `tpl_code` 메모

---

## 4. n8n 환경변수 설정

n8n 서버 `.env` 파일에 추가:

```env
# 알리고 카카오 알림톡
ALIGO_API_KEY=알리고_API_키
ALIGO_USER_ID=알리고_사용자_ID
ALIGO_SENDER_KEY=카카오_발신프로필_키
ALIGO_SENDER_PHONE=발신자_전화번호

# 알림톡 템플릿 코드 (카카오 심사 승인 후 입력)
ALIGO_TPL_DELIVERY=배송완료_템플릿코드
ALIGO_TPL_REVIEW_REMIND=리뷰리마인드_템플릿코드
ALIGO_TPL_REWARD=적립금지급_템플릿코드
```

---

## 5. 테스트

### API 연결 테스트
```bash
curl -X POST https://kakaoapi.aligo.in/akv10/heartinfo/ \
  -d "apikey=YOUR_API_KEY" \
  -d "userid=YOUR_USER_ID"
```

### 알림톡 테스트 발송
```bash
curl -X POST https://kakaoapi.aligo.in/akv10/alimtalk/send/ \
  -d "apikey=YOUR_API_KEY" \
  -d "userid=YOUR_USER_ID" \
  -d "senderkey=YOUR_SENDER_KEY" \
  -d "tpl_code=YOUR_TPL_CODE" \
  -d "sender=발신번호" \
  -d "receiver_1=수신번호" \
  -d "subject_1=테스트" \
  -d "message_1=테스트 메시지" \
  -d "testMode=Y"
```

---

## 6. 비용 예상

| 항목 | 건당 | 월 500건 | 월 1000건 |
|------|------|---------|----------|
| 알림톡 | 7.15원 | 3,575원 | 7,150원 |
| SMS fallback | 8.4원 | - | - |

MakeShop 내장 알림톡(~14원/건) 대비 **약 50% 절감**.

---

## 7. WF 가동 체크리스트

```
[ ] 알리고 가입 + 사업자 인증
[ ] IP 등록: 158.180.77.201
[ ] 카카오 채널 @pressco21 연동 + senderkey 확보
[ ] 템플릿 3종 등록 + 카카오 심사 통과
[ ] n8n .env에 ALIGO_* 변수 추가
[ ] n8n Docker 컨테이너 재시작 (환경변수 반영)
[ ] NocoDB 테이블 2개 생성 (아래 스키마 참조)
[ ] WF 3개 import + 활성화
[ ] testMode=Y로 테스트 발송
[ ] testMode 제거 후 운영 전환
[ ] MakeShop 기존 알림톡 자동발송 OFF (중복 방지)
```

## 8. NocoDB 테이블 스키마

### 테이블: review_notification_log

| 컬럼 | 타입 | 설명 |
|------|------|------|
| Id | Auto | PK |
| order_id | SingleLineText | 주문번호 |
| customer_name | SingleLineText | 고객명 |
| customer_phone | SingleLineText | 연락처 |
| notification_type | SingleSelect | DELIVERY / REVIEW_REMIND / REWARD_NOTIFY |
| status | SingleSelect | SUCCESS / FAILED |
| channel | SingleSelect | ALIMTALK / SMS_FALLBACK |
| error_message | LongText | 에러 시 메시지 |
| sent_at | DateTime | 발송일시 |

### 테이블: review_reward_log

| 컬럼 | 타입 | 설명 |
|------|------|------|
| Id | Auto | PK |
| board_num | SingleLineText | 게시판 글번호 (num1) |
| order_id | SingleLineText | 주문번호 |
| customer_id | SingleLineText | 회원 ID |
| customer_name | SingleLineText | 고객명 |
| review_type | SingleSelect | PHOTO / TEXT |
| reward_amount | Number | 500 or 200 |
| reward_status | SingleSelect | SUCCESS / FAILED |
| error_message | LongText | 에러 시 메시지 |
| review_date | DateTime | 리뷰 작성일 |
| reward_date | DateTime | 적립금 지급일 |
