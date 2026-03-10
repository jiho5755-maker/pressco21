# S1-5 정산 자동화 가이드

작성일: 2026-03-10

## 구현 범위

- `WF-SETTLE Partner Settlement`
  - 스케줄: 매월 1일, 16일 오전 9시
  - 수동 Webhook: `POST /webhook/settlement-batch`
  - 액션:
    - `getSettlementHistory`
    - `runSettlementBatch`
- 관리자 페이지 `8011`
  - 월 선택
  - 전반/후반 선택
  - `정산 실행` 버튼
  - 정산서 발송 이력 테이블

## 현재 동작 기준

- 정산 집계는 `tbl_Settlements.status=COMPLETED` 기준으로 월/반기를 코드에서 다시 필터링한다.
- 정산 이력은 파트너별로 묶어 `statement_id=SETB_YYYYMM_H1|H2_PARTNER_CODE` 형식으로 만든다.
- 관리자 `getSettlements`는 `PENDING_SETTLEMENT / COMPLETED` 상태값을 정상 구분해서 반환한다.
- `commission_rate`가 `0.1`처럼 저장된 레거시 값도 어드민 응답에서는 `%` 기준으로 정규화한다.

## 라이브 검증 결과

- 히스토리 조회 성공:
  - `month=2026-03`
  - `SETB_202603_H1_PC_202602_002`
  - 파트너 `테스트 공방`
  - 총 주문 `130000`
  - 총 적립금 `13000`
- 배치 실행 응답 성공 형식은 확보했지만, 현재 운영 SMTP credential 문제로 실제 메일 발송은 실패 상태를 반환한다.

## 현재 운영 이슈

- `ADMIN_API_TOKEN`은 리포지토리 `.secrets.env` 값이 아니라 구형 토큰 `pressco21-admin-2026` 기준으로만 통과한다.
- n8n SMTP credential `PRESSCO21-SMTP-Naver (31jTm9BU7iyj0pVx)` 가 현재 `535 Username and Password not accepted`로 실패한다.
- 그래서 `runSettlementBatch`는 지금 의도적으로 아래와 같이 실패를 그대로 반환한다.
  - `success: false`
  - `error.code: SETTLEMENT_EMAIL_FAILED`

## 운영 체크

1. n8n SMTP credential 갱신
2. `runSettlementBatch` 재실행
3. 파트너 테스트 메일함 실수신 확인
4. 이후 정산서 발송 이력 저장 방식 재확인

## 참고

- 정산 UI 로컬 Playwright 검증 스크린샷:
  - `output/playwright/s1-5-admin-ui/admin-settlement-panel.png`
