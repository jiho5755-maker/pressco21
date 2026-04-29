# 바로빌 세금계산서 자동화 발행 기능 팀미팅 및 개발계획

작성일: 2026-04-29  
대상 worktree: `offline-crm-barobill-tax-invoice-ui`  
대상 branch: `work/offline-crm/barobill-tax-invoice-ui`  
상세 설계 문서: `offline-crm-v2/docs/barobill-tax-invoice-integration-plan-2026-04-29.md`

## 1. 최종 확정 결론

바로빌 전자세금계산서 연동은 CRM 기능으로 진행한다. 단, 1차 작업은 “CRM UI/상태 모델/발급 요청 계약”까지만 구현하고, 실제 바로빌 SOAP API 호출은 별도 n8n worktree에서 구현한다.

이유:

- 바로빌 API는 SOAP 형식이다.
- API 키, 바로빌 계정, 인증서 관련 값은 브라우저 앱에 노출하면 안 된다.
- 국세청 전송 결과는 웹훅이 아니라 상태조회 API로 polling해야 한다.
- 바로빌은 중복발급 방지 기능이 없으므로 CRM/n8n이 idempotency를 책임져야 한다.

## 2. 팀미팅 결정

### 한지훈님(CSO)

- 세금계산서 자동화는 단순 편의 기능이 아니라 공공기관/기업 거래 운영 신뢰도를 높이는 핵심 운영 기능이다.
- 다만 첫 배포부터 완전 자동발행으로 가지 않고, “출고확정 후 수동 발급 요청”을 MVP로 한다.
- 운영 안정화 후 “출고확정 즉시 자동 요청” 옵션을 추가한다.

### 박서연님(CFO)

- 발급 금액 기준은 입금액이 아니라 CRM 명세표 품목 합계다.
- 구례군 농업기술센터처럼 1,000,000원을 입금했더라도 해당 명세표가 743,500원이면 세금계산서 대상은 743,500원이다.
- 차액은 고객 예치금/선입금으로 보관하고, 이후 주문에서 예치금 사용 처리한다.
- 월 50건/100건/300건 기준 예상 비용은 각각 5,000원/10,000원/30,000원 + VAT로 매우 낮아 도입 타당성이 있다.

### 김도현님(COO)

- 운영자는 명세표 목록에서 상태를 바로 확인해야 한다.
- 상태 badge는 최소 `미요청`, `요청됨`, `발급완료`, `실패`, `취소요청`, `취소완료`가 필요하다.
- 실패 시 “다시 요청”보다 먼저 “상태 새로고침”과 “오류 확인”을 제공한다.
- 문자 발송은 추가 비용이 있으므로 기본 OFF, 메일은 무료이므로 기본 ON으로 한다.

### 최민석님(CTO)

- CRM 브라우저 앱은 바로빌을 직접 호출하지 않는다.
- CRM은 `/crm-proxy` 또는 신규 webhook에 발급 요청 payload를 전달한다.
- n8n은 다음 책임을 가진다.
  - fresh read
  - 필수값 재검증
  - idempotency check
  - SOAP 발급 요청
  - 상태조회 polling
  - CRM invoice meta 업데이트
- 현재 worktree에서는 다음 파일 중심으로 UI/상태 모델을 구현한다.
  - `offline-crm-v2/src/lib/accountingMeta.ts`
  - `offline-crm-v2/src/pages/Invoices.tsx`
  - `offline-crm-v2/src/components/TaxInvoiceRequestDialog.tsx` 신규 후보
  - `offline-crm-v2/src/lib/api.ts`
  - 필요 시 `offline-crm-v2/tests/*`

### 조현우님(법무고문)

- 개인정보 처리위탁 계약 가능 여부가 확인되었으므로 운영 전 계약 절차를 체크리스트에 포함한다.
- 공동인증서는 바로빌에서 암호화 저장된다고 답변받았지만, 운영 전 실제 보관 방식과 권한자를 문서로 남긴다.
- 중복발행 방지 기능이 바로빌에 없으므로, 내부 중복 방지 장치 없이는 운영 발급을 금지한다.
- 수정세금계산서/발행취소는 별도 승인 흐름이 필요한 위험 기능이므로 MVP에서 실제 execute하지 않는다.

### 유준호님(페어코더)

- 첫 구현은 “mock 또는 dry-run 계약”으로 진행한다.
- 실제 SOAP 테스트는 n8n branch에서 테스트 인증키로만 실행한다.
- 운영 발급은 개인정보 처리위탁 계약, 운영 인증키, 공동인증서, 선불포인트 충전 확인 후 별도 승인으로만 진행한다.

## 3. 공급사 확인사항 반영

| 항목 | 확인 결과 | 개발 반영 |
|---|---|---|
| 국세청 표준인증 | 인증번호 41000022 | 도입 가능 근거로 문서화 |
| 발급 기능 | 정발행, 역발행, 위수탁, 수정, 대량, 취소 가능 | MVP는 정발행만 execute |
| 상태/승인번호 | 상태조회, 승인번호 조회 가능 | polling workflow 설계 |
| 결과 수신 | 웹훅 없음, API 조회 방식 | n8n scheduled polling 필요 |
| 테스트 환경 | 무료 테스트 가능 | 운영 전 테스트 서버 필수 |
| 비용 | 3,000건 이내 건당 100원 + VAT | 월 50/100/300건 비용 반영 |
| 메일/문자 | 메일 무료, 문자 별도 과금 | 메일 ON, 문자 OFF |
| 중복 방지 | 제공 안 함 | CRM/n8n idempotency 필수 |
| 장애 알림 | 운영 이슈 메일 전달 | 장애 메일 수신 경로 기록 |
| 공동인증서 | 암호화 저장 | 운영 전 보관/권한 확인 |
| 개인정보 처리위탁 | 계약 가능 | 운영 전 계약 체크리스트 |
| API 형식 | SOAP | n8n/server adapter 필수 |

## 4. MVP 범위

### 4.1 이번 CRM worktree에서 구현

1. invoice accounting meta 확장
2. 명세표 목록 세금계산서 상태 badge
3. 발급 요청 버튼
4. 발급 요청 다이얼로그
5. 필수값 검증
6. 중복 요청 차단
7. mock/dry-run API 함수
8. 상태 새로고침 버튼 UI
9. build 및 smoke test

### 4.2 이번 CRM worktree에서 하지 않는 것

- 실제 바로빌 SOAP 호출
- 운영 인증키 저장
- 공동인증서 등록
- 운영 발급 execute
- 수정세금계산서 execute
- 취소 execute
- 대량발행 execute

### 4.3 추후 n8n worktree에서 구현

권장 생성 명령:

```bash
cd /Users/jangjiho/workspace/pressco21
bash _tools/pressco21-task.sh n8n barobill-tax-invoice-webhook
```

n8n 구현 범위:

- 발급 요청 webhook
- 상태조회 webhook
- scheduled polling
- request log/idempotency log
- 바로빌 SOAP request/response adapter
- CRM invoice meta 업데이트

## 5. 발급 요청 UX 확정

### 5.1 버튼 노출 조건

명세표 목록에서 다음 조건을 만족하면 `세금계산서 발급 요청`을 보여준다.

- 명세표가 존재함
- 총액이 0보다 큼
- 상태가 `not_requested` 또는 실패 후 재요청 가능 상태
- 이미 `requested` 또는 `issued`면 발급 요청 버튼 비활성화

출고확정이 필요한지 여부는 MVP에서는 경고로 처리한다.

- 출고확정 전: “아직 출고확정 전입니다. 계속 요청하시겠습니까?”
- 출고확정 후: 바로 요청 가능

운영 안정화 후에는 출고확정 전 발급 요청 차단으로 강화할 수 있다.

### 5.2 다이얼로그 필수 검증

발급 요청 전 CRM에서 차단할 항목:

- 고객 사업자번호 없음
- 고객 상호 없음
- 대표자 없음
- 이메일 없음
- 공급가액/세액/합계 없음
- 품목 없음
- 이미 요청/발급된 명세표
- idempotency key 없음

### 5.3 상태 표시

상태 label:

- `not_requested`: 미요청
- `requesting`: 요청 중
- `requested`: 요청됨
- `issued`: 발급완료
- `failed`: 실패
- `cancel_requested`: 취소요청
- `cancelled`: 취소완료

발급완료 상태에는 국세청 승인번호를 같이 표시한다.

## 6. idempotency 확정

중복발급 방지는 CRM/n8n에서 한다.

권장 key:

```text
barobill:tax-invoice:pressco21:<invoice.Id>:<invoice.invoice_no>
```

요청 전 방어 순서:

1. CRM invoice meta가 `requested/issued/requesting`이면 차단
2. n8n request log에 같은 key가 있으면 신규 SOAP 호출 금지
3. 바로빌 상태조회에서 같은 관리번호가 있으면 기존 상태 반환
4. 없을 때만 발급 요청

## 7. 테스트 계획

### CRM 테스트

- 필수값 누락 시 발급 요청 차단
- 미요청 상태에서 발급 요청 다이얼로그 표시
- 요청됨/발급완료 상태에서 중복 요청 차단
- 발급완료 상태에서 국세청 승인번호 표시
- 실패 상태에서 오류 메시지 표시
- `npm run build` 통과

### n8n 테스트

- 테스트 인증키로 SOAP 발급 요청 성공
- 같은 idempotency key 2회 요청 시 1회만 발급
- 상태조회로 국세청 승인번호 반영
- SOAP timeout/retry 처리
- 로그에 인증키/개인정보 원문 노출 없음

## 8. 운영 전 체크리스트

운영 발급 전 필수:

- 개인정보 처리위탁 계약 완료
- 공동인증서 등록/보관 방식 확인
- 테스트 인증키 확보
- 운영 인증키 확보
- 선불포인트 충전 확인
- 장애 알림 수신 메일 지정
- 테스트 서버 정발행 성공
- 상태조회 polling 성공
- 중복 클릭 방어 성공
- 메일 무료/문자 과금 정책 UI 반영

## 9. 작업 시작 명령

```bash
cd /Users/jangjiho/workspace/pressco21-worktrees/offline-crm-barobill-tax-invoice-ui
bash _tools/pressco21-check.sh
cd offline-crm-v2
npm run build
```

개발자는 이 문서, 상세 설계 문서, `team/handoffs/worktrees/offline-crm-barobill-tax-invoice-ui/latest.md`를 먼저 읽고 시작한다.

## 10. 참고 자료

로컬 수신 자료:

- `/Users/jangjiho/Downloads/바로빌 개발자센터 회원가입 가이드.pdf`
- `/Users/jangjiho/Downloads/바로빌 연동서비스 제안서(2026_1).pdf`
- `/Users/jangjiho/Downloads/2026_바로빌_견적서_프레스코21.pdf`

공식 페이지:

- 바로빌 전자세금계산서 API: https://dev.barobill.co.kr/services/taxInvoice
- 바로빌 요금 안내: https://dev.barobill.co.kr/partners/cost/partner
