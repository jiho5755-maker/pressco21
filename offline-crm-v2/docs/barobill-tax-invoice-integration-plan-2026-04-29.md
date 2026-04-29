# 바로빌 전자세금계산서 CRM 연동 개발 계획

작성일: 2026-04-29
대상 worktree: `offline-crm-barobill-tax-invoice-ui`
대상 branch: `work/offline-crm/barobill-tax-invoice-ui`

## 1. 결론


> 2026-04-29 공식문서 크롤링 후속 기준: 취소/삭제/수정세금계산서의 세부 구현은 `barobill-tax-invoice-official-development-playbook-2026-04-29.md`를 우선한다. 특히 발급완료 건은 `DeleteTaxInvoice`를 먼저 호출하지 않고, 국세청 전송 전에는 `ProcTaxInvoice(ISSUE_CANCEL)`, 국세청 전송 후에는 수정세금계산서로 처리한다.

바로빌은 PRESSCO21 CRM의 전자세금계산서 자동발급 후보로 사용 가능하다. 다만 바로빌은 중복발급 방지 기능을 제공하지 않고, 국세청 전송 결과도 웹훅이 아니라 상태조회 API로 확인해야 하므로, CRM/n8n 쪽에서 다음 2가지를 반드시 책임져야 한다.

1. 내부 중복발급 방지: `invoice_id + invoice_no + provider_mgt_key` 기준의 idempotency lock
2. 상태 동기화: 발급 요청 후 주기적 상태조회 polling 및 CRM 상태 반영

MVP는 CRM 안에서 “발급 요청/상태 표시/상태 새로고침” UI와 payload 계약을 먼저 고정하고, 실제 SOAP 호출은 별도 n8n worktree에서 구현한다. 브라우저에서 바로빌 SOAP API를 직접 호출하지 않는다.

## 2. 확인된 공급사 조건

### 2.1 사업자/인증

- 바로빌은 국세청 표준인증을 획득한 전자세금계산서 ASP 사업자다.
- 인증번호: `41000022`
- 공동인증서는 암호화 저장된다고 답변받았다.
- 개인정보 처리위탁 계약 가능.

### 2.2 기능 범위

지원 가능하다고 확인된 기능:

- 정발행
- 역발행
- 위수탁발행
- 수정발행
- 대량발행
- 발행취소
- 상태조회
- 국세청 승인번호 조회

CRM MVP 적용 범위는 `정발행 + 상태조회 + 승인번호 조회 + 발행취소 요청 준비`로 제한한다. 수정세금계산서, 역발행, 위수탁, 대량발행은 2차 단계로 분리한다.

### 2.3 결과 수신 방식

- 국세청 결과는 웹훅으로 받지 않는다.
- 상태조회 API를 통해 polling으로 확인한다.
- 따라서 n8n에 scheduled polling workflow가 필요하다.

### 2.4 비용

견적서 기준:

| 사용량 | 전자세금계산서 발급비 | 비고 |
|---:|---:|---|
| 월 50건 | 5,000원 + VAT | 건당 100원 |
| 월 100건 | 10,000원 + VAT | 건당 100원 |
| 월 300건 | 30,000원 + VAT | 건당 100원 |
| 월 3,000건 | 300,000원 + VAT | 3,000건 이내 동일 단가 |

- 초기비/기본료/연동비/유지관리비/기술지원비 없음.
- 전자세금계산서 발급 메일은 무료.
- 문자 발송은 별도 과금이므로 MVP에서는 기본 OFF.
- 바로빌 서비스는 선불포인트 차감 방식.

## 3. 핵심 설계 원칙

### 3.1 금액 기준

세금계산서 발급 금액은 입금액이 아니라 CRM 명세표 금액 기준이다.

예: 구례군 농업기술센터

- 입금액: 1,000,000원
- 해당 주문/명세표 금액: 743,500원
- 세금계산서 발급 대상: 743,500원
- 차액 256,500원: 고객 예치금/선입금으로 관리하고, 이후 주문 차감에 사용

따라서 세금계산서 발급 UI는 `paid_amount` 또는 입금 수집함 금액이 아니라 `invoice.total_amount`, `supply_amount`, `tax_amount`, `items`를 기준으로 구성한다.

### 3.2 발급 트리거

MVP에서는 자동발급이 아니라 수동 확인 후 발급 요청으로 시작한다.

1. 명세표 생성
2. 포장/출고확정
3. 세금계산서 발급 전 검증
4. 사용자가 “세금계산서 발급 요청” 클릭
5. n8n SOAP workflow 호출
6. CRM 상태를 `요청됨`으로 변경
7. scheduled polling으로 `발급완료/실패/국세청 승인번호` 갱신

자동발급은 운영 안정화 후 “출고확정 즉시 자동 요청” 옵션으로 승격한다.

### 3.3 SOAP 호출 위치

CRM 브라우저 앱에서 SOAP을 직접 호출하지 않는다.

권장 구조:

```text
CRM React
  -> /crm-proxy 또는 신규 /barobill-tax-invoice webhook
  -> n8n SOAP adapter workflow
  -> BaroBill SOAP API
  -> n8n response/log
  -> CRM invoice meta/status update

n8n scheduled polling
  -> BaroBill status API
  -> CRM invoice meta/status update
```

이유:

- 바로빌 API 키, 계정, 인증서 관련 값은 브라우저에 노출하면 안 된다.
- SOAP envelope 생성/오류코드 처리/재시도는 서버 측에서 관리해야 한다.
- n8n이 현재 CRM의 외부 API proxy 역할을 이미 맡고 있다.

## 4. 데이터 모델 계획

현재 CRM에는 `InvoiceAccountingMetaState.taxInvoiceStatus`가 이미 존재한다. MVP는 기존 invoice memo meta를 확장해 화면 표시를 빠르게 구현하고, n8n 쪽에는 별도 request log를 남긴다.

### 4.1 CRM invoice meta 확장안

`offline-crm-v2/src/lib/accountingMeta.ts`

```ts
type InvoiceTaxInvoiceStatus =
  | 'not_requested'
  | 'requesting'
  | 'requested'
  | 'issued'
  | 'failed'
  | 'cancel_requested'
  | 'cancelled'

interface InvoiceTaxInvoiceMeta {
  provider?: 'barobill'
  issueType?: 'normal' | 'reverse' | 'consignment' | 'amendment'
  mgtKey?: string
  requestId?: string
  requestedAt?: string
  requestedBy?: string
  lastStatusSyncedAt?: string
  ntsConfirmNum?: string
  issuedAt?: string
  statusCode?: string
  statusMessage?: string
  errorCode?: string
  errorMessage?: string
  mailSent?: boolean
  smsRequested?: boolean
}
```

단기 구현에서는 기존 `taxInvoiceStatus`를 유지하되, 상세값은 `taxInvoice` 하위 객체로 확장한다.

### 4.2 idempotency key

중복발행 방지를 CRM/n8n이 직접 구현한다.

권장 키:

```text
barobill:tax-invoice:pressco21:<invoice.Id>:<invoice.invoice_no>
```

발급 요청 전 확인 순서:

1. CRM invoice meta에 `requested/issued` 상태가 있으면 차단
2. n8n request log에서 같은 idempotency key가 있으면 차단
3. 바로빌 상태조회 API에서 같은 관리번호가 이미 존재하면 발급 대신 기존 상태 반환
4. 세 조건 모두 없을 때만 SOAP 발급 요청

### 4.3 n8n request log 필드

n8n worktree에서 별도 구현 예정.

필수 필드:

- `request_id`
- `idempotency_key`
- `invoice_id`
- `invoice_no`
- `provider`: `barobill`
- `provider_mgt_key`
- `request_payload_hash`
- `status`
- `barobill_result_code`
- `barobill_result_message`
- `nts_confirm_num`
- `created_at`
- `updated_at`
- `last_polled_at`
- `poll_attempt_count`

## 5. CRM UI 개발 범위

### 5.1 명세표 목록

파일: `offline-crm-v2/src/pages/Invoices.tsx`

추가할 표시:

- 세금계산서 상태 badge
  - `미요청`
  - `요청됨`
  - `발급완료`
  - `실패`
  - `취소요청`
  - `취소완료`
- 발급완료인 경우 국세청 승인번호 일부 표시
- 실패인 경우 오류 요약 표시

추가할 액션:

- `세금계산서 발급 요청`
- `상태 새로고침`
- `발급내역 보기`
- `취소 요청`은 1차 UI 노출만 하고 실제 execute는 2차 승인 후

### 5.2 발급 요청 다이얼로그

다이얼로그에서 사용자가 최종 확인해야 할 항목:

- 공급자: 프레스코21 사업자 정보
- 공급받는자: 고객 사업자번호, 상호, 대표자, 주소, 업태, 종목, 이메일
- 작성일자
- 공급가액
- 세액
- 합계금액
- 품목 목록
- 메일 발송 여부: 기본 ON
- 문자 발송 여부: 기본 OFF, 별도 과금 안내
- 중복발급 주의 문구

필수값 검증:

- 고객 사업자번호
- 고객 상호/대표자
- 이메일
- 공급가액/세액/합계
- 품목명/수량/단가
- 이미 요청/발급된 명세표 여부

### 5.3 설정 화면

파일: `offline-crm-v2/src/pages/Settings.tsx`

추가 권장 섹션:

- 바로빌 연동 상태
- 테스트/운영 모드 표시
- 문자 발송 기본값 OFF
- 즉시전송/익일전송 정책 표시
- API 키 값은 CRM에 저장하지 않고 “서버에 설정됨/미설정” 상태만 표시

## 6. n8n/SOAP 개발 범위

별도 worktree 권장:

```bash
bash _tools/pressco21-task.sh n8n barobill-tax-invoice-webhook
```

### 6.1 발급 요청 workflow

입력:

- CRM invoice id
- idempotency key
- 공급자/공급받는자 정보
- 품목 목록
- 공급가액/세액/합계
- 메일/SMS 옵션

처리:

1. fresh read: CRM에서 최신 invoice/customer/items 조회
2. validate: 금액/필수값 재검증
3. idempotency check
4. SOAP request 생성
5. 바로빌 테스트 서버 호출
6. 결과 저장
7. CRM invoice meta 업데이트
8. CRM에 결과 반환

### 6.2 상태조회 workflow

실행 방식:

- 수동 버튼: 특정 invoice 즉시 조회
- scheduled polling: 요청됨/전송중/실패 재시도 가능 상태를 주기 조회

권장 polling:

- 요청 후 2시간: 10분마다
- 요청 후 24시간: 1시간마다
- 7일 이후: 수동 조회만

### 6.3 오류 처리

- 네트워크/SOAP timeout: `requested` 유지, retry 대상
- 바로빌 validation 오류: `failed`, 사용자 수정 필요
- 국세청 전송 실패: `failed`, 오류 메시지 저장
- 이미 발급된 관리번호: 신규 발급하지 않고 기존 상태 반환

## 7. 테스트 계획

### 7.1 CRM 단위/빌드

- `npm run build`
- 변경 파일 ESLint
- `git diff --check`

### 7.2 CRM E2E

추가 후보:

- 발급 가능 명세표에서 버튼 노출
- 필수 사업자 정보 누락 시 발급 요청 차단
- 이미 요청된 명세표에서 중복 요청 차단
- 발급완료 상태 badge와 승인번호 표시
- 실패 상태에서 오류 메시지 표시

### 7.3 n8n 테스트

- 바로빌 테스트 인증키로만 호출
- 실제 운영 발급 금지
- SOAP request/response 원문은 secret masking 후 log
- idempotency duplicate test
- 상태조회 polling test

## 8. 운영 전 체크리스트

운영 전 반드시 완료:

- 개인정보 처리위탁 계약
- 공동인증서 등록/보관 방식 확인
- 테스트 인증키 확보
- 운영 인증키 확보
- 선불포인트 충전/결제 담당자 지정
- 바로빌 테스트 서버에서 정발행 성공
- 상태조회로 국세청 승인번호 수집 성공
- 중복 요청 2회 클릭 테스트에서 1건만 발급되는지 검증
- 문자 발송 기본 OFF 확인
- 장애 시 담당자 메일 수신 경로 확인

## 9. 단계별 일정

### Phase 1 - CRM 화면/상태 모델

작업 branch: `work/offline-crm/barobill-tax-invoice-ui`

- invoice meta 타입 확장
- 명세표 목록 badge 추가
- 발급 요청 다이얼로그 추가
- mock API client 추가
- 필수값/중복요청 방어
- build/E2E smoke

완료 기준: 실제 바로빌 호출 없이 CRM에서 발급 요청 UX와 상태 전이가 검증된다.

### Phase 2 - n8n SOAP 테스트 연동

작업 branch: `work/n8n/barobill-tax-invoice-webhook`

- 테스트 인증키 기반 SOAP 발급 workflow
- 상태조회 workflow
- request log/idempotency log
- CRM webhook contract 확정

완료 기준: 테스트 서버에서 정발행 요청과 상태조회가 통과한다.

### Phase 3 - 운영 전환

- 개인정보 처리위탁 계약 완료
- 운영 인증키/공동인증서 설정
- 프레스코21 내부 테스트 고객 1건 운영 발급
- 실패/취소/수정발행 운영 절차 문서화

### Phase 4 - 자동화 고도화

- 출고확정 후 자동 발급 옵션
- 사업자등록 상태조회 preflight
- 월별 발급 비용/건수 리포트
- 수정세금계산서 wizard
- 대량발행

## 10. 이번 CRM worktree에서 바로 할 작업 순서

1. `accountingMeta.ts`에 세금계산서 상세 meta 타입/serializer 확장
2. `Invoices.tsx`에 badge와 발급 요청 버튼 추가
3. `TaxInvoiceRequestDialog` 컴포넌트 분리
4. mock `requestBarobillTaxInvoice`, `syncBarobillTaxInvoiceStatus` API 함수 추가
5. 필수값 누락/중복요청 방어 테스트 추가
6. `npm run build` 확인

## 11. 참고 자료

로컬 수신 자료:

- `/Users/jangjiho/Downloads/바로빌 개발자센터 회원가입 가이드.pdf`
- `/Users/jangjiho/Downloads/바로빌 연동서비스 제안서(2026_1).pdf`
- `/Users/jangjiho/Downloads/2026_바로빌_견적서_프레스코21.pdf`

공식 페이지:

- 바로빌 개발자센터 전자세금계산서 API: https://dev.barobill.co.kr/services/taxInvoice
- 바로빌 개발자센터 요금 안내: https://dev.barobill.co.kr/partners/cost/partner
