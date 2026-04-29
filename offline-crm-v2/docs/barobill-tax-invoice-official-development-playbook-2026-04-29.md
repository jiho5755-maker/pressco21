# 바로빌 전자세금계산서 공식 개발 플레이북

작성일: 2026-04-29

적용 범위: PRESSCO21 CRM 관리자 화면 + n8n 바로빌 SOAP 어댑터

기준: 바로빌 공식 개발자센터 문서와 운영/테스트 WSDL 확인 결과

> 보안 원칙: 이 문서는 개발 방향과 공식 API 흐름만 기록한다. 테스트/운영 인증키, ContactID 전체값, 등록 URL 토큰, 세션 쿠키, 실제 승인번호 전체값은 문서/로그/커밋에 남기지 않는다.

## 1. 공식 문서 수집 범위

크롤링/확인한 공식 자료:

- 세금계산서 서비스 소개: https://dev.barobill.co.kr/services/taxinvoice
- 세금계산서 발급 가이드: https://dev.barobill.co.kr/docs/guides/세금계산서-발급하기
- 세금계산서를 잘못 발급한 경우: https://dev.barobill.co.kr/docs/guides/세금계산서-취소하기
- 세금계산서 국세청 전송설정: https://dev.barobill.co.kr/docs/guides/세금계산서-국세청-전송설정
- 공동인증서 등록 기능 개발: https://dev.barobill.co.kr/docs/guides/공동인증서-등록-기능-개발하기
- 세금계산서 API 레퍼런스: https://dev.barobill.co.kr/docs/references/세금계산서-API
- 바로빌 공통 API 레퍼런스: https://dev.barobill.co.kr/docs/references/바로빌-공통-API
- 바로빌 API 오류코드: https://dev.barobill.co.kr/docs/references/바로빌-API-오류코드
- 운영 WSDL: https://ws.baroservice.com/TI.asmx?WSDL
- 테스트 WSDL: https://testws.baroservice.com/TI.asmx?WSDL

## 2. PRESSCO21 기준 결론

1. CRM은 브라우저에서 바로빌 SOAP을 직접 호출하지 않는다. 모든 발급/취소/상태조회는 n8n 서버 측 webhook을 경유한다.
2. 정발급 MVP는 `RegistAndIssueTaxInvoice`를 사용한다. 성공 후 이메일은 바로빌에서 공급받는자에게 발송된다.
3. 상태 동기화는 `GetTaxInvoiceStateEX`를 기준으로 한다. 국세청 결과는 웹훅이 아니라 polling/수동 새로고침으로 갱신한다.
4. 발급 후 취소는 상태에 따라 완전히 다르다.
   - 국세청 전송 전: `ProcTaxInvoice`의 `ISSUE_CANCEL`을 먼저 호출한다.
   - 취소/거부/임시저장 상태가 된 뒤 관리번호 재사용이나 보관 정리가 필요하면 `DeleteTaxInvoice`를 호출한다.
   - 국세청 전송 후: 삭제/취소가 아니라 수정세금계산서를 발급한다.
5. 바로빌 공식 레퍼런스에서 `RegistModifyTaxInvoice*`는 구버전으로 표시되어 있으므로 신규 수정세금계산서 개발은 `RegistTaxInvoiceEX`에 `ModifyCode`/`OriginalNTSSendKey`를 담고 `IssueTaxInvoiceEx`로 발급하는 흐름을 우선 검토한다.
6. 제품가는 부가세 포함가로 유지한다. 바로빌 전송 직전에 공급가액/세액을 자동 역산한다.

## 3. 사전 점검 API

운영/테스트 공통으로 발급 전 n8n에서 매번 점검한다.

| 목적 | API | 합격 기준 | 실패 시 처리 |
|---|---|---|---|
| 공동인증서 등록/유효성 | `CheckCERTIsValid` | `1` | 발급 차단, 인증서 등록 URL 안내 |
| 보유금액 | `GetBalanceCostAmountEx` 또는 기존 호환 API | 발급비 이상 | 발급 차단, 충전 안내 |
| 관리번호 중복 | CRM/n8n idempotency + 필요 시 바로빌 조회 | 미발급 또는 기존 상태 반환 | 중복 발급 차단 |
| 상태 확인 | `GetTaxInvoiceStateEX` | 양수 상태 | 실패 코드를 사용자 메시지로 저장 |

`CheckMgtNumIsExists`는 공식 레퍼런스에서 신규 개발 비권장으로 표시된다. 따라서 내부 idempotency lock과 `GetTaxInvoiceStateEX` 기반 existing-state 확인을 우선하고, 필요 시 보조 guard로만 사용한다.

## 4. 공동인증서/등록 URL 운영

- 세금계산서 발급 API를 쓰려면 공급자 공동인증서가 바로빌에 등록되어 있어야 한다.
- 등록 URL은 `GetBaroBillURL`의 `TOGO=CERT`로 생성할 수 있다.
- 반환 URL은 짧은 시간만 유효한 토큰 URL이므로 화면/채팅/문서/커밋에 남기지 않는다.
- 국세청 전송설정 팝업은 `GetBaroBillURL`의 `TOGO=NTSOPT`를 사용한다.
- 설정 화면에는 “서버에 설정됨/미설정/인증서 유효” 같은 상태만 표시하고 인증키/ContactID는 노출하지 않는다.

## 5. 발급 플로우

### 5.1 CRM 버튼/모달

1. 발급 가능 상태의 명세표에만 “세금계산서 발급” 버튼을 표시한다.
2. 이미 `requested`, `issued`, `cancel_requested`, `cancellation_pending`이면 기본 발급 버튼은 비활성화한다.
3. 클릭 시 확인 모달에서 아래 항목을 보여준다.
   - 공급받는자 상호/대표자/사업자번호 일부 마스킹/이메일
   - 품목, 작성일, 공급가액, 세액, 합계
   - “제품가는 부가세 포함가이며 발급 시 공급가액/세액이 자동 역산됨” 안내
   - 문자 발송 OFF, 이메일 발송 ON
4. 확인 후 n8n `POST /webhook/crm/barobill/tax-invoices/issue`를 호출한다.
5. 성공/실패 토스트와 상태 배지를 즉시 갱신한다.

### 5.2 n8n 처리 순서

1. CRM에서 invoice/customer/items fresh read.
2. 고객 사업자번호, 상호, 대표자, 이메일, 품목/금액 필수값 검증.
3. CRM/n8n idempotency lock 확인.
4. 부가세 포함가를 공급가액/세액으로 역산.
5. `CheckCERTIsValid`, 보유금액, 기존 상태 확인.
6. `RegistAndIssueTaxInvoice` 호출.
7. 성공 시 `GetTaxInvoiceStateEX`로 상태를 즉시 조회.
8. CRM memo/meta에 `provider`, `providerMgtKey`, `status`, `statusCode`, `statusMessage`, `issuedAt`, `lastStatusSyncedAt` 반영.
9. 오류코드는 `GetErrString` 또는 공식 오류코드 테이블 기준 메시지로 변환해 저장한다.

### 5.3 부가세 포함가 역산 규칙

PRESSCO21 제품가는 부가세 포함가다. 바로빌 payload의 `AmountTotal`, `TaxTotal`, `TotalAmount`는 다음 규칙으로 만든다.

```text
vatIncludedTotal = CRM 명세표 합계
supplyAmount = floor(vatIncludedTotal / 1.1)
taxAmount = vatIncludedTotal - supplyAmount
totalAmount = vatIncludedTotal
```

품목 단위도 동일하게 계산하되, 품목 합계와 헤더 합계가 1원 단위 반올림 차이로 어긋나면 마지막 과세 품목에 보정한다. 수정/취소분 세금계산서는 같은 금액을 음수로 반전한다.

## 6. 국세청 전송 정책과 상태 갱신

바로빌은 두 가지 국세청 전송방식을 제공한다.

| 설정 | 동작 | PRESSCO21 운영 판단 |
|---|---|---|
| 익일 자동 전송 | 발급 완료 후 다음 영업일 오후 2시 전송 | 취소 여지를 남기므로 기본 권장 |
| 발급 즉시 전송 | 발급 완료 즉시 전송 | 잘못 발급 시 수정세금계산서만 가능하므로 제한 |

`SendToNTS`는 익일 자동 전송을 기다리지 않고 특정 건을 즉시 국세청으로 보내는 API다. 실운영에서 테스트 취소/검증 목적이면 함부로 호출하지 않는다. 즉시 전송 후에는 사전 취소 창구가 닫히고, 국세청 결과 수신이 완료될 때까지 수정세금계산서도 실패할 수 있다.

상태 동기화 기준:

| 바로빌 필드 | 주요 값 | CRM 해석 |
|---|---|---|
| `BarobillState=3014` | 발급완료 | `issued` |
| `BarobillState=5031` | 공급자 취소 | `cancelled` |
| `NTSSendState=1` | 전송전 | 사전취소 가능 후보 |
| `NTSSendState=2` | 전송대기 | 사전취소 가능 여부 즉시 재조회 후 판단 |
| `NTSSendState=3` | 전송중 | 취소/수정 대기, polling 필요 |
| `NTSSendState=4` | 전송완료 | 수정세금계산서 가능 후보 |
| `NTSSendState=5` | 전송실패 | 오류 확인 후 재처리 |
| `NTSSendResult=SUC001` | 국세청 성공 | 원본 승인번호 기반 수정 가능 |

## 7. 취소/삭제/수정세금계산서 공식 플로우

### 7.1 국세청 전송 전 취소

발급완료 상태지만 국세청 전송 전이면 아래 순서만 사용한다.

1. `GetTaxInvoiceStateEX`로 최신 상태 확인.
2. `NTSSendState`가 전송 전/대기이고 `BarobillState=3014`인 경우 `ProcTaxInvoice` 호출.
3. `ProcType`은 `ISSUE_CANCEL`.
4. 성공 후 상태조회로 `BarobillState=5031` 확인.
5. 관리번호 재사용이나 삭제보관함 정리가 필요할 때만 `DeleteTaxInvoice` 호출.

중요: 발급완료 건에 `DeleteTaxInvoice`를 먼저 호출하지 않는다. 공식 레퍼런스상 `DeleteTaxInvoice`는 임시저장/취소/거부 상태에서만 가능하다.

### 7.2 국세청 전송 후 정정/취소

국세청 전송 후에는 원본 삭제/취소가 불가능하다. 정정은 수정세금계산서로 처리한다.

1. `GetTaxInvoiceStateEX`로 원본의 국세청 승인번호와 전송 결과를 확인한다.
2. `NTSSendState=4`, `NTSSendResult=SUC001`, 국세청 승인번호 존재를 모두 만족할 때 진행한다.
3. 착오에 의한 이중발급/실발급 취소 목적은 `ModifyCode=6`을 우선 사용한다.
4. 원본 금액을 음수로 반전한 수정세금계산서를 작성한다.
5. 신규 개발은 `RegistTaxInvoiceEX`에 `OriginalNTSSendKey`와 `ModifyCode`를 포함해 저장한 뒤 `IssueTaxInvoiceEx`로 발급하는 흐름을 우선한다.
6. 성공 후 수정세금계산서의 관리번호와 상태를 CRM 원본 invoice meta에 연결한다.

### 7.3 현재 운영 테스트 건에 대한 처리 원칙

현재 실운영 테스트로 발급된 1건은 즉시 전송 요청 이후 국세청 처리 대기 상태가 발생했다. 이 건은 다음 원칙으로만 후속 처리한다.

- `SendToNTS` 재호출 금지.
- `DeleteTaxInvoice` 선호출 금지.
- `NTSSendState=4`와 성공 결과, 원본 승인번호 확인 전 수정세금계산서 발급 금지.
- polling으로 최종 전송완료를 확인한 뒤, `ModifyCode=6` 음수 수정세금계산서로 상쇄한다.
- 문서/로그에는 승인번호 전체값을 남기지 않는다.

## 8. 오류코드 운영 메모

| 오류코드 | 의미 | 개발 처리 |
|---:|---|---|
| `-26001` | 발급에 필요한 공동인증서 없음 | 인증서 등록 안내, 발급 차단 |
| `-31100` | 등록된 공동인증서 없음 | 인증서 등록 안내 |
| `-26002` | 인증서 만료/전송일 기준 유효하지 않음 | 인증서 재등록 안내 |
| `-26006` | 충전잔액 부족 | 충전 안내, 발급 차단 |
| `-11013` | 관리번호 중복 | 기존 상태 반환 또는 새 관리번호 생성 금지 |
| `-21003` | 삭제 가능한 상태 아님 | `DeleteTaxInvoice` 선호출 오류로 간주, 상태별 분기 재시도 |
| `-21007` | 취소 가능한 상태 아님 | NTS 상태 확인 후 수정세금계산서로 전환 |
| `-11325` | 당초 승인번호가 전송완료 건이 아님 | NTS 최종완료까지 대기 후 재시도 |
| `-31004` | 신고 진행 중 또는 완료 | 수동 전송 중복 호출 차단 |

## 9. CRM/n8n 구현 체크리스트

### CRM

- [x] 발급 버튼/확인 모달/토스트/중복방지 UI 구현.
- [x] 상태 새로고침 버튼을 sync-status webhook에 연결.
- [x] 운영 모드 표시와 위험 안내 문구 표시.
- [ ] 취소/수정세금계산서 버튼은 별도 2단계 승인 모달과 권한 확인 후 노출.
- [ ] 현재 상태가 NTS 전송 전인지/후인지에 따라 버튼 라벨을 `발급취소` 또는 `수정세금계산서 발급`으로 분기.

### n8n

- [x] 정발급 issue webhook 운영 전환.
- [x] sync-status webhook 운영 전환.
- [x] 부가세 포함가 역산 및 품목 합계 fallback 보정.
- [ ] 공식 취소 webhook 추가: `GetTaxInvoiceStateEX → ProcTaxInvoice(ISSUE_CANCEL) → 필요 시 DeleteTaxInvoice`.
- [ ] 공식 수정세금계산서 webhook 추가: `GetTaxInvoiceStateEX → RegistTaxInvoiceEX/IssueTaxInvoiceEx`.
- [ ] pending cancellation queue polling: 전송중 건이 최종 완료되면 자동으로 수정세금계산서 후보 알림.
- [ ] `SendToNTS`는 별도 승인 플래그 없이는 호출 불가하도록 차단.

### 운영

- [ ] 신규 실발급 전 `fresh read → preflight → 확인 모달 → execute → verify` 기록.
- [ ] 실운영 취소/수정은 사용자의 명시 승인 문구 없이는 실행 금지.
- [ ] 모든 로그/문서에서 인증키, ContactID, URL 토큰, 승인번호 전체값 masking.
- [ ] 월말~다음달 10일에는 국세청 결과 지연 가능성을 UI에 안내.

## 10. 다음 개발 방향

1. 기존 테스트 발급 건의 NTS 상태를 polling한다.
2. 성공 완료되면 `ModifyCode=6` 음수 수정세금계산서로 상쇄하는 n8n workflow를 공식 플로우대로 구현한다.
3. CRM에는 “취소 가능 상태”와 “수정세금계산서 필요 상태”를 분리해 표시한다.
4. 운영 발급은 계속 가능하되, 취소/수정은 별도 승인과 공식 분기 로직 배포 후 수행한다.
