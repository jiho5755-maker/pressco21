# 바로빌 전자세금계산서 n8n SOAP Webhook 개발계획

작성일: 2026-04-29  
대상 worktree: `n8n-barobill-tax-invoice-webhook`  
대상 branch: `work/n8n/barobill-tax-invoice-webhook`  
연결 CRM branch: `work/offline-crm/barobill-tax-invoice-ui`

## 1. 최종 확정 결론

바로빌 전자세금계산서 실제 발급/상태조회는 CRM 브라우저가 아니라 n8n 서버 측 workflow에서 수행한다.

이유:

- 바로빌 API는 SOAP 형식이다.
- 바로빌 연동인증키, 계정, 인증서 관련 정보는 브라우저에 노출하면 안 된다.
- 바로빌은 중복발급 방지 기능을 제공하지 않는다.
- 국세청 전송 결과는 웹훅이 아니라 상태조회 API로 polling해야 한다.

이 branch의 1차 목적은 “테스트 인증키 기반 SOAP adapter + CRM webhook 계약”을 안전하게 구현하는 것이다. 운영 발급은 별도 승인 전까지 금지한다.

## 2. 바로빌 확인사항

- 국세청 표준인증 전자세금계산서 ASP 사업자
- 인증번호: `41000022`
- API 형식: SOAP
- 정발행, 역발행, 위수탁발행, 수정발행, 대량발행, 취소, 상태조회, 승인번호 조회 지원
- 국세청 결과 수신: 웹훅 없음, 상태조회 API 사용
- 테스트 환경 제공, 무료 테스트 가능
- 전자세금계산서: 월 3,000건 이내 건당 100원 + VAT
- 메일 발송: 무료
- 문자 발송: 별도 과금
- 중복 발급 방지: 공급사 제공 없음
- 공동인증서: 암호화 저장
- 개인정보 처리위탁 계약 가능

## 3. n8n workflow 분리

### 3.1 발급 요청 webhook

권장 workflow 이름:

```text
CRM - BaroBill TaxInvoice Issue Request
```

권장 endpoint:

```text
POST /webhook/crm/barobill/tax-invoices/issue
```

책임:

1. CRM 요청 수신
2. API key/auth 검증
3. CRM fresh read
   - invoice
   - invoice items
   - customer
   - supplier/company settings
4. 필수값 재검증
5. idempotency check
6. 바로빌 SOAP request 생성
7. 테스트 서버 호출
8. request log 저장
9. CRM invoice meta 업데이트
10. CRM에 결과 반환

### 3.2 상태조회 webhook

권장 workflow 이름:

```text
CRM - BaroBill TaxInvoice Status Sync
```

권장 endpoint:

```text
POST /webhook/crm/barobill/tax-invoices/sync-status
```

책임:

1. invoice id 또는 provider management key 수신
2. request log 조회
3. 바로빌 상태조회 SOAP 호출
4. 국세청 승인번호/상태/오류 메시지 추출
5. CRM invoice meta 업데이트
6. CRM에 결과 반환

### 3.3 scheduled polling workflow

권장 workflow 이름:

```text
CRM - BaroBill TaxInvoice Poll Pending Status
```

책임:

- `requested`, `requesting`, 전송중, 재시도 가능 실패 상태를 주기 조회
- 요청 후 2시간 이내: 10분마다
- 요청 후 24시간 이내: 1시간마다
- 7일 이후: 자동 polling 중단, 수동 상태조회만 허용

## 4. CRM에서 받을 payload 계약 초안

```json
{
  "requestId": "uuid",
  "idempotencyKey": "barobill:tax-invoice:pressco21:123:INV-20260429-001",
  "invoiceId": 123,
  "invoiceNo": "INV-20260429-001",
  "issueType": "normal",
  "provider": "barobill",
  "mode": "test",
  "sendEmail": true,
  "sendSms": false,
  "supplier": {
    "corpNum": "프레스코21 사업자번호",
    "corpName": "프레스코21",
    "ceoName": "대표자명",
    "addr": "사업장 주소",
    "bizType": "업태",
    "bizClass": "종목",
    "contactName": "담당자",
    "email": "발신/담당 이메일"
  },
  "buyer": {
    "corpNum": "공급받는자 사업자번호",
    "corpName": "공급받는자 상호",
    "ceoName": "대표자명",
    "addr": "주소",
    "bizType": "업태",
    "bizClass": "종목",
    "contactName": "담당자",
    "email": "수신 이메일"
  },
  "amounts": {
    "supplyAmount": 675909,
    "taxAmount": 67591,
    "totalAmount": 743500
  },
  "items": [
    {
      "name": "상품명",
      "spec": "규격",
      "quantity": 1,
      "unitPrice": 743500,
      "supplyAmount": 675909,
      "taxAmount": 67591
    }
  ]
}
```

주의:

- 금액은 입금액이 아니라 명세표 품목 합계 기준이다.
- 구례군처럼 1,000,000원 입금 후 743,500원 구매한 경우에도 `totalAmount`는 743,500원이다.
- 차액 256,500원은 CRM 고객 예치금 로직에서 관리하고 바로빌 payload에는 포함하지 않는다.

## 5. idempotency 설계

중복발급 방지 key:

```text
barobill:tax-invoice:pressco21:<invoice.Id>:<invoice.invoice_no>
```

발급 요청 전 필수 검사:

1. CRM invoice meta 상태가 `requesting`, `requested`, `issued`면 신규 SOAP 호출 금지
2. n8n request log에 같은 `idempotencyKey`가 있으면 신규 SOAP 호출 금지
3. 바로빌 상태조회에서 같은 management key가 있으면 기존 상태 반환
4. 위 조건에 걸리지 않을 때만 SOAP 발급 요청

## 6. request log 저장 설계

NocoDB 또는 n8n data store에 다음 필드를 남긴다.

- `request_id`
- `idempotency_key`
- `invoice_id`
- `invoice_no`
- `provider`: `barobill`
- `provider_mgt_key`
- `mode`: `test` 또는 `production`
- `request_payload_hash`
- `status`
- `barobill_result_code`
- `barobill_result_message`
- `nts_confirm_num`
- `error_code`
- `error_message`
- `created_at`
- `updated_at`
- `last_polled_at`
- `poll_attempt_count`

원문 SOAP request/response 전체 저장은 개인정보/인증정보 마스킹 후에만 허용한다.

## 7. 필수 검증

n8n에서 CRM 요청값을 그대로 믿지 말고 fresh read 기준으로 재검증한다.

필수값:

- supplier 사업자번호/상호/대표자
- buyer 사업자번호/상호/대표자/이메일
- invoice id/invoice no
- 품목 1개 이상
- 공급가액/세액/합계가 0보다 큼
- items 합계와 invoice 합계 일치
- idempotency key 존재

## 8. 오류 처리

| 상황 | 처리 |
|---|---|
| SOAP timeout | request log에 retryable error, CRM 상태는 요청됨/확인필요 유지 |
| 바로빌 validation 오류 | CRM 상태 failed, 사용자 수정 필요 메시지 저장 |
| 국세청 전송 실패 | failed, 오류 메시지와 상태코드 저장 |
| 같은 key 재요청 | 신규 SOAP 호출 금지, 기존 request 상태 반환 |
| CRM 업데이트 실패 | request log 유지, 재동기화 대상 표시 |

## 9. 보안 원칙

- API KEY, 바로빌 연동인증키, 계정, 인증서 관련 값은 출력/로그/문서/커밋 금지
- `.secrets`, `.secrets.env`, `.env.local` 수정 금지
- 운영 발급은 사용자 명시 승인 전 금지
- 테스트 서버와 운영 서버 endpoint를 명확히 분리
- SOAP 원문을 저장할 때는 사업자번호/이메일/전화/인증정보 마스킹

## 10. 구현 전 참조

n8n workflow JSON 생성/수정 전 반드시 확인:

- `/Users/jangjiho/Desktop/n8n-main/packages/nodes-base/`
- `/Users/jangjiho/Desktop/n8n-main/.claude/agents/n8n-workflow-builder.md`
- `/Users/jangjiho/Desktop/n8n-main/.claude/agents/n8n-nodes-index.md`
- 기존 패턴: `n8n-automation/workflows/`

## 11. 작업 시작 명령

```bash
cd /Users/jangjiho/workspace/pressco21-worktrees/n8n-barobill-tax-invoice-webhook
bash _tools/pressco21-check.sh
```

먼저 이 문서와 CRM branch의 다음 문서를 읽는다.

- `offline-crm-v2/docs/barobill-tax-invoice-integration-plan-2026-04-29.md`
- `offline-crm-v2/docs/barobill-tax-invoice-team-meeting-2026-04-29.md`

단, n8n branch의 sparse checkout에는 CRM 문서가 보이지 않을 수 있으므로 필요하면 main/CRM branch에서 읽거나 handoff 내용을 참고한다.

## 12. 완료 기준

1차 완료 기준:

- 테스트 인증키 기준 SOAP 발급 request adapter 작성
- 상태조회 adapter 작성
- idempotency duplicate test 통과
- CRM webhook contract에 맞는 request/response fixture 작성
- 실제 운영 발급 미실행
- `bash _tools/pressco21-check.sh` 통과

운영 전 완료 기준:

- 개인정보 처리위탁 계약 완료
- 공동인증서/운영 인증키 확인
- 선불포인트 충전 확인
- 테스트 서버 정발행/상태조회/승인번호 조회 성공
- 운영 발급 1건은 사용자 별도 승인 후만 실행

## 13. 2026-04-29 구현 메모

1차 구현 파일:

- `n8n-automation/workflows/accounting/CRM-BaroBill-TaxInvoice-Webhook-Adapter.json`
- `n8n-automation/fixtures/barobill/*.fixture.json`
- `n8n-automation/fixtures/barobill/*.sample.xml`
- `n8n-automation/_tools/barobill/test-adapter-contract.js`

구현 방식:

- 하나의 n8n workflow 안에 발급 webhook, 상태조회 webhook, 10분 polling trigger를 함께 둔다.
- 이유: 1차 MVP request/idempotency log를 n8n workflow static data에 저장하므로 발급/상태조회/polling이 같은 workflow static scope를 공유해야 한다.
- 운영 배포 전 NocoDB 전용 request log 테이블이 준비되면 3개 workflow로 분리해도 된다.

구현된 endpoint:

```text
POST /webhook/crm/barobill/tax-invoices/issue
POST /webhook/crm/barobill/tax-invoices/sync-status
```

구현된 바로빌 SOAP action:

- `CheckMgtNumIsExists`: provider management key 사전 중복 확인
- `RegistAndIssueTaxInvoice`: 일반 세금계산서 저장 + 발급
- `GetTaxInvoiceStateEX`: 확장 상태조회 및 국세청 승인번호 확인

필수 runtime 환경변수:

- `CRM_API_KEY`
- `CRM_PROXY_URL` (없으면 `http://127.0.0.1:5678/webhook/crm-proxy`)
- `BAROBILL_CERTKEY`
- `BAROBILL_CORP_NUM` (상태조회 fallback)
- `BAROBILL_CONTACT_ID` (공급자 담당자/바로빌 사용자 ID)
- `BAROBILL_ALLOW_PRODUCTION` (기본 false, 운영 호출 차단)
- 선택: `BAROBILL_SERVICE_TEST_URL`, `BAROBILL_SERVICE_PROD_URL`

보안/운영 guard:

- workflow 기본값은 `active=false`.
- 성공/오류 실행 데이터 저장은 `saveDataSuccessExecution=none`, `saveDataErrorExecution=none`으로 줄였다.
- request log에는 SOAP 원문을 저장하지 않고 `request_payload_hash`, 상태, 결과코드만 남긴다.
- `mode=production`은 `BAROBILL_ALLOW_PRODUCTION=true`가 아니면 발급/상태조회 모두 차단한다.
- 발급 전 CRM fresh read로 명세표, 품목, 고객, 회사 설정을 다시 조회한다.
- `InvoicerParty.ContactID`는 필수라서 `BAROBILL_CONTACT_ID` 또는 요청 payload `supplier.contactId`가 없으면 발급을 차단한다.
- CRM meta 또는 static request log에 `requesting`, `requested`, `issued`가 있으면 신규 SOAP 발급을 차단한다.

로컬 검증:

```bash
node n8n-automation/_tools/barobill/test-adapter-contract.js
```

검증 항목:

- workflow JSON 구조
- Code 노드 JavaScript 문법
- idempotency duplicate 차단
- SOAP 발급/상태조회 sample response parser

아직 하지 않은 것:

- n8n 운영 서버 배포
- 실제 바로빌 테스트 인증키 호출
- 운영 발급 호출

### 13.1 테스트 서버 smoke 결과 (2026-04-29)

사용 도구:

```bash
BAROBILL_CERTKEY=... BAROBILL_CORP_NUM=2150552221 \
  python3 n8n-automation/_tools/barobill/soap-smoke-test.py --issue
```

결과 요약:

- 테스트 서버 URL: `https://testws.baroservice.com/TI.asmx`
- `CheckCorpIsMember`: `1` — 회원사 확인 성공
- `GetBalanceCostAmount`: `10000` — 테스트 잔액 확인
- `GetCorpMemberContacts`: 담당자 1명 확인, ContactID 필요 조건 확인
- `CheckCERTIsValid`: `-26003` — 등록 공동인증서 검증 실패
- `RegistAndIssueTaxInvoice`: `-26001` — 발행에 필요한 공동인증서가 등록되어 있지 않아 테스트 발급 실패
- `GetTaxInvoiceStateEX`: 미등록 관리번호 상태로 조회됨 (`BarobillState=-21002`)

판단:

- 테스트 인증키와 사업자번호는 SOAP 서버에서 인식된다.
- 실제 테스트 정발급 성공을 위해서는 테스트 서버에 해당 사업자 공동인증서 등록/재등록이 먼저 필요하다.
- 운영 발급 금지는 유지한다.

### 13.2 테스트 공동인증서 등록 후 smoke 성공 (2026-04-29)

2026-04-29에 `GetBaroBillURL`의 `TOGO=CERT` 방식으로 테스트환경 공동인증서 등록을 완료한 뒤, 동일 테스트 인증키/사업자번호로 smoke test를 재실행했다.

사용 도구:

```bash
python3 n8n-automation/_tools/barobill/soap-smoke-test.py --issue
```

결과 요약:

- 테스트 서버 URL: `https://testws.baroservice.com/TI.asmx`
- `CheckCorpIsMember`: `1` — 회원사 확인 성공
- `CheckCERTIsValid`: `1` — 공동인증서 유효성 확인 성공
- `GetBalanceCostAmount`: `10000` — 테스트 잔액 확인
- `RegistAndIssueTaxInvoice`: `1` — 테스트 세금계산서 발급 요청 성공
- 테스트 관리번호: `PCTEST-120215-0429120215`
- `GetTaxInvoiceStateEX`: `BarobillState=3014`, `NTSSendState=1`, 테스트 국세청 승인번호 형태의 `NTSSendKey` 확인

판단:

- 테스트환경 공동인증서 등록이 완료되어 테스트 SOAP 정발급 path가 동작한다.
- 이후 CRM/n8n 버튼 발급 테스트는 같은 테스트 runtime 환경변수와 현재 workflow adapter를 사용하면 된다.
- 운영환경은 테스트환경과 별도 DB이므로 운영 전환 시 운영 바로빌에 공동인증서를 다시 1회 등록해야 한다.
- 운영 발급 금지는 유지한다.

## 14. 테스트 인증키 환경변수 운영 방식

2026-04-29에 테스트 인증키를 로컬 개발 환경에 영속 설정했다. 실제 인증키 값은 Git, 문서, handoff에 기록하지 않는다.

로컬 설정 위치:

```text
~/.config/pressco21/barobill-test.env
```

권한:

```text
chmod 600
```

자동 로드:

- `~/.zshrc`에 위 파일을 source하는 loader만 추가했다.
- `soap-smoke-test.py`도 환경변수가 없으면 위 로컬 파일을 자동 로드한다.

설정된 변수명:

```text
BAROBILL_CERTKEY
BAROBILL_CORP_NUM
BAROBILL_CONTACT_ID
BAROBILL_SERVICE_TEST_URL
BAROBILL_SERVICE_PROD_URL
BAROBILL_ALLOW_PRODUCTION=false
```

주의:

- `BAROBILL_CERTKEY` 값은 테스트 서버용이며 운영 발급에 쓰지 않는다.
- n8n 서버에 배포할 때는 서버 runtime 환경변수에도 별도로 같은 테스트 값을 주입해야 한다.
- 운영 전환 시에는 테스트 키를 운영 키로 교체하고, `BAROBILL_ALLOW_PRODUCTION=true`는 별도 승인 후에만 설정한다.

## 15. 공동인증서 등록 안내

현재 테스트 발급 실패 원인은 바로빌 테스트 서버가 인증키와 사업자번호는 인식하지만, 발행에 필요한 공동인증서가 등록되어 있지 않기 때문이다.

### 15.1 권장 방식: GetBaroBillURL API로 등록 URL 생성

바로빌 공식 문서는 공동인증서 등록 방법을 2가지로 안내한다.

1. 바로빌 사이트의 공동인증서 등록 페이지에서 직접 등록
2. `GetBaroBillURL` API에서 `TOGO=CERT`로 받은 등록 URL을 브라우저에서 열어 등록

이 branch에서는 2번 방식을 기본으로 사용한다. 이유는 바로빌 아이디/비밀번호를 운영자가 직접 알지 못해도, API가 반환한 단기 URL을 통해 “로그인 된 상태”로 등록 화면을 열 수 있기 때문이다.

바로빌 공통 API 기준:

- method: `GetBaroBillURL`
- `CorpNum`: 하이픈 없는 사업자번호 10자리
- `ID`: 바로빌 회원 아이디. 로컬 테스트 환경에서는 `BAROBILL_CONTACT_ID` 사용
- `PWD`: 더 이상 사용되지 않으므로 빈 문자열
- `TOGO`: `CERT`
- 성공 반환값: URL
- 실패 반환값: 음수 문자열
- 반환 URL 유효시간: 60초

로컬 URL 생성 명령:

```bash
python3 n8n-automation/_tools/barobill/soap-smoke-test.py --cert-url
```

운영자가 해야 할 일:

1. 공동인증서가 설치된 PC 또는 인증서 저장매체가 연결된 PC를 준비한다.
2. Mac 개발 환경에서 위 명령으로 등록 URL을 생성한다.
3. 출력된 URL을 60초 안에 인증서가 있는 PC의 브라우저에서 연다.
4. 바로빌 인증서 등록 화면에서 보안 모듈 설치 안내가 나오면 설치한다.
5. 인증서 목록에서 전자세금용/사업자범용/바로빌 특목용 공동인증서를 선택한다.
6. 인증서 비밀번호를 입력하고 등록을 완료한다.
7. 등록 후 로컬에서 다시 다음을 실행한다.

```bash
python3 n8n-automation/_tools/barobill/soap-smoke-test.py --issue
```

### 15.2 PC/맥북 사용 기준

- 2번 방식이어도 “인증서 선택과 비밀번호 입력”은 공동인증서가 있는 PC에서 해야 한다.
- MacBook은 URL 생성과 개발/검증만 담당해도 된다.
- URL은 60초짜리 로그인 URL이므로 메신저/문서에 보관하지 않는다.
- URL이 만료되면 같은 명령으로 새 URL을 다시 생성하면 된다.
- 테스트환경과 운영환경은 별도 DB이므로 운영 전환 시 운영 바로빌 환경에 공동인증서를 다시 등록해야 한다.

### 15.3 사이트 직접 등록 fallback

GetBaroBillURL 방식이 PC 보안모듈/브라우저 문제로 막히면 아래 직접 등록 경로를 fallback으로 사용한다.

```text
바로빌 사이트 로그인 → 공동인증서 → 공동인증서 등록 → MY 인증서 조회하기 → 인증서 (재)등록
```

등록 가능한 인증서:

- 전자세금용 공동인증서
- 바로빌 특목용 인증서
- 사업자 범용 인증서

등록 불가 예시:

- 개인범용 인증서
- 은행용/증권용/보험용 등 타기관 특목용 인증서

공식 참고:

- 바로빌 개발자센터 `공동인증서 등록 기능 개발하기`: https://dev.barobill.co.kr/docs/guides/%EA%B3%B5%EB%8F%99%EC%9D%B8%EC%A6%9D%EC%84%9C-%EB%93%B1%EB%A1%9D-%EA%B8%B0%EB%8A%A5-%EA%B0%9C%EB%B0%9C%ED%95%98%EA%B8%B0
- 바로빌 공통 API `GetBaroBillURL`: https://dev.barobill.co.kr/docs/references/%EB%B0%94%EB%A1%9C%EB%B9%8C-%EA%B3%B5%ED%86%B5-API#GetBaroBillURL
- 바로빌 테스트 SOAP `GetBaroBillURL`: https://testws.baroservice.com/TI.asmx?op=GetBaroBillURL
- 바로빌 FAQ `공동인증서 등록 절차`: https://www.barobill.co.kr/csc/faq_v.asp?DocSEQ=14763
- 바로빌 공지 `모바일 승인 전 PC 공동인증서 등록 필요`: https://www.barobill.co.kr/csc/notice_v.asp?DocSEQ=13302
- 바로빌 공동인증센터: https://cert.barobill.co.kr/
