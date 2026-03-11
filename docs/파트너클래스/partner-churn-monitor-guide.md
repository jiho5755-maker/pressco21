# 파트너 이탈 감지 자동화 가이드

작성일: 2026-03-11

## 목적

S2-7은 파트너 운영 레이어에서 `최근 활동 저하 -> 재활성화 유도 -> 관리자 에스컬레이션` 흐름을 자동화하는 단계다.

- 파트너 행동 데이터와 운영 로그를 주 1회 스캔한다.
- 위험 파트너를 `AT_RISK` 와 `ESCALATE` 로 나눈다.
- dry run 으로 먼저 미리보기하고, 실제 실행 시 파트너 메일과 관리자 텔레그램 요약을 보낸다.

## 구성 요소

- 워크플로우: `파트너클래스/n8n-workflows/WF-CHURN-partner-risk-monitor.json`
- 생성 스크립트: `scripts/partnerclass-s2-7-generate-churn-workflow.js`
- 배포 스크립트: `scripts/partnerclass-s2-7-deploy-workflows.js`
- 검증 러너: `scripts/partnerclass-s2-7-churn-runner.js`
- 보조 수정:
  - `scripts/server/partnerclass-s2-7-add-last-active-field.sh`
  - `scripts/partnerclass-s2-7-patch-partner-auth.js`
  - `파트너클래스/n8n-workflows/WF-02-partner-auth-api.json`

## 라이브 배포 기준

- `WF-02 Partner Auth API` → `aAc4lFdxuibp5UJ1`
- `WF-CHURN Partner Risk Monitor` → `8tTb6tVr6ejwiu6C`

## 데이터 기준

### tbl_Partners

- 신규 물리 컬럼: `last_active_at`
- 기본 채움 규칙:
  - `updated_at` 우선
  - 없으면 `created_at`

### 이메일 로그 테이블

실제 라이브 `tbl_EmailLogs` 스키마는 아래 기준으로 맞췄다.

- `recipient`
- `email_type`
- `status`
- `error_message`
- `CreatedAt`
- `UpdatedAt`

초기 설계의 `recipient_email / sent_at / settlement_id / type` 가 아니라 현재 스키마 기준으로 조회/기록하도록 수정했다.

## 자동화 흐름

### 1. last_active_at 갱신

`WF-02 partner-auth` 는 이제 파트너 인증/대시보드 조회 시 NocoDB credential 기반 PATCH 노드로 `last_active_at` 를 갱신한다.

- `NocoDB Touch Partner (Auth)`
- `NocoDB Touch Partner (Dashboard)`

코드 노드 내부 `fetch + $env.NOCODB_API_TOKEN` 방식은 운영 환경에서 실제 row 갱신이 보장되지 않아 제거했다.

### 2. CHURN 스캔

트리거는 두 가지다.

- 스케줄: 매주 월요일 10:05
- 수동: `POST /webhook/partner-churn-scan`

웹훅은 `Authorization: Bearer <ADMIN_API_TOKEN>` 을 요구한다.
현재 수동 검증은 운영 구형 토큰 `pressco21-admin-2026` 기준으로 통과한다.

### 3. 위험도 계산

입력 소스:

- `tbl_Partners`
- `tbl_Classes`
- `tbl_Schedules`
- `tbl_Reviews`
- `tbl_EmailLogs`

판정 규칙:

- 활동 공백 30일 이상
- 수업/일정 갱신 공백 60일 이상
- 미답변 후기 5건 이상

레벨:

- `ESCALATE`
  - 활동 공백 60일 이상
  - 또는 신호 3개 이상
- `AT_RISK`
  - 활동 공백 30일 이상 + 수업/일정 공백 60일 이상
  - 또는 신호 2개 이상

### 4. 중복 알림 방지

- 최근 14일 내 동일 `email_type + partner_code` 조합이 이미 `SENT` 상태로 기록되어 있으면 skip
- `partner_code` 는 `error_message` 에 저장한 `alert_id` (`CHURN_30_YYYYMMDD_PC_...`) 에서 역파싱한다

### 5. 발송

실제 발송 모드에서는 아래가 실행된다.

- 파트너 메일 발송: `PRESSCO21 SMTP`
- 이메일 로그 저장: `tbl_EmailLogs`
- 관리자 요약 전송: `PRESSCO21 Telegram Bot`

## 디버깅 포인트

이번 태스크에서 실제로 막혔던 지점은 아래 4개였다.

1. n8n fan-in 병렬 버그
   - 증상: `Node 'X' hasn't been executed`
   - 해결: `WF-02`, `WF-CHURN` 모두 병렬 수집을 직렬 체인으로 변경
2. 잘못된 필드명
   - `created_date` 대신 `CreatedAt`
   - 이메일 로그 테이블은 `recipient / email_type / status / error_message`
3. code node 직접 PATCH 불안정
   - 응답에는 갱신값이 보이지만 실제 row 저장이 안 됨
   - 해결: NocoDB credential 기반 HTTP Request PATCH 노드로 교체
4. 웹훅 빈 응답
   - 실제 원인은 응답 노드가 아니라 중간 노드 에러
   - 검증은 n8n execution detail 로 확인해야 정확했다

## 검증 결과

실검증 순서:

- `POST /webhook/partner-auth` 로 파트너 대시보드 호출
- `last_active_at` row 갱신 확인
- `POST /webhook/partner-churn-scan` dry run 현재일 확인
- `POST /webhook/partner-churn-scan` dry run 미래일 확인

통과 산출물:

- `output/playwright/s2-7-partner-churn/churn-results.json`

핵심 통과 기준:

- 현재일 `2026-03-11`
  - `risk_count = 0`
- 미래일 `2026-06-15`
  - `risk_count >= 1`
- `last_active_at` 갱신 확인

추가 send 모드 실호출 결과:

- `today=2026-06-15`, `dry_run=false`, `include_partner_codes=["PC_202602_001"]`
- 현재 응답은 구조화된 실패 JSON으로 반환된다.
  - `error.code = PARTNER_CHURN_EMAIL_FAILED`
  - SMTP credential 실패 메시지를 그대로 노출
- 실패 로그는 `tbl_EmailLogs` 에 아래 형태로 저장된다.
  - `email_type = PARTNER_NOTIFY`
  - `status = FAILED`
  - `error_message = PARTNER_CHURN_60 | CHURN_60_YYYYMMDD_PC_... | SMTP 오류`

## 운영 메모

- 라이브 `ADMIN_API_TOKEN` 은 아직 저장소 랜덤값이 아니라 구형 토큰으로만 수동 인증이 통과한다.
- 이메일 로그 테이블이 비어 있어도 dry run 은 정상 동작한다.
- 실제 메일 발송 경로는 운영 `PRESSCO21 SMTP` credential 상태에 영향을 받는다. 2026-03-11 기준 `535 Username and Password not accepted` 로 실패한다.
- 관리자 Telegram 요약은 최종 응답을 더 이상 덮어쓰지 않지만, 운영 `TELEGRAM_CHAT_ID` 가 비어 있어 실제 전송은 실패한다.
