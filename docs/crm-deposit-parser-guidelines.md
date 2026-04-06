# CRM Deposit Parser Guidelines

WF-CRM-02 Gmail 입금알림 수집 파서는 "한 번 고친 실패 메일이 다시 깨지지 않게" 운영합니다.

## 원칙

- 파서 수정은 단발 대응으로 끝내지 않습니다.
- 실제 실패 메일은 가능한 한 원본 HTML/TXT를 fixture로 저장합니다.
- 파서를 고친 뒤에는 회귀 테스트를 추가합니다.
- 텔레그램 요약은 이메일 원문을 대신 보는 운영 화면이므로, 파싱에 성공한 핵심 식별값이 메시지에도 보여야 합니다.

## 수정 절차

1. 파싱 실패 메일의 원본 확보
2. `tests/fixtures/crm-deposit-parser/` 아래에 fixture 추가
3. `scripts/test-crm-deposit-parser.js`에 회귀 케이스 추가
4. 공용 소스 `scripts/lib/crm-deposit-parser-source.js` 수정
5. `node scripts/sync-crm-deposit-parser.js` 실행
6. `node scripts/test-crm-deposit-parser.js` 실행
7. 실제 n8n 워크플로우 반영 필요 시 `node scripts/deploy-crm-deposit-telegram.js` 실행
8. 텔레그램 요약 메시지에서 입금자/기록사항/금액/거래일시가 기대대로 보이는지 확인

## 텔레그램 운영 기준

- 입금 알림에는 최소한 아래 정보가 보여야 합니다.
- `입금자`
- `입금별칭추천`
- `입금액`
- `거래일시`
- `기록`

- 은행 거래 알림에는 가능하면 아래 정보가 함께 보여야 합니다.
- `거래 주체`
- `금액`
- `거래일시`
- `잔액`
- `기록사항/세부 메모`

## 현재 회귀군

- 기본 본문형 입금 알림
- VestMail 표형 입금 알림
- VestMail 표형 출금 알림
- `거래은행` 칸이 비어 `기록사항` 값이 앞으로 당겨지는 케이스

## 주의

- 저장소에는 과거 실패 메일 전체 이력이 자동 축적되지 않습니다.
- 새 실패 유형이 나오면 반드시 fixture를 추가해야 다음에도 막을 수 있습니다.
