# 2026-04-30 쿠팡 매출 백필 자동화 점검

## 작업 위치

- Worktree: `/Users/jangjiho/workspace/pressco21-worktrees/n8n-coupang-sales-backfill-check`
- Branch: `work/n8n/coupang-sales-backfill-check`
- 범위: n8n 매출 자동화 읽기 점검 및 로컬 JSON 보정
- 운영 쓰기 작업: 없음

## 결론

1. 2026-04-22, 2026-04-23 쿠팡 API 누락분은 현재 NocoDB와 Google Sheet 기준으로 보정 완료 상태다.
2. 19:30 F23B 자동 백필은 2026-04-29 19:30 KST에 실제 실행됐고, 2026-04-28을 백필 대상으로 잡아 F23 재집계를 호출했다.
3. 단, 2026-04-28 쿠팡 API가 재시도 시점에도 6개 상태 모두 HTTP 403을 반환해 쿠팡 매출은 아직 `pending_backfill` 상태다.
4. F23B 알림 요약은 기존 코드상 “NocoDB patch 성공”만 보고 성공으로 집계해, 쿠팡이 계속 미해결인 경우도 “성공 1 / 실패 0”처럼 보일 수 있었다. 이를 로컬 workflow JSON에서 “해결 / 미해결 / 실패”로 구분하도록 보정했다.

## 읽기 점검 근거

### NocoDB daily_sales 최신 상태

조회 범위: 2026-04-20 ~ 2026-04-29

| 날짜 | 최신 Id | 쿠팡 상태 | 쿠팡 매출 | 쿠팡 주문 | 전체 매출 | 전체 주문 | 비고 |
|---|---:|---|---:|---:|---:|---:|---|
| 2026-04-20 | 1241 | confirmed | 1,083,870 | 31 | 10,044,700 | 145 | 정상 |
| 2026-04-21 | 1240 | confirmed | 595,740 | 31 | 5,539,290 | 194 | 정상 |
| 2026-04-22 | 1247 | confirmed | 643,300 | 26 | 5,121,590 | 157 | 누락 보정 완료 |
| 2026-04-23 | 1248 | confirmed | 182,000 | 17 | 4,452,200 | 136 | 누락 보정 완료 |
| 2026-04-24 | 1244 | confirmed | 791,000 | 30 | 10,523,360 | 139 | 정상 |
| 2026-04-25 | 1223 | confirmed | 179,400 | 18 | 893,150 | 58 | 정상 |
| 2026-04-26 | 1224 | confirmed | 177,300 | 15 | 1,774,844 | 83 | 정상 |
| 2026-04-27 | 1225 | confirmed | 140,800 | 20 | 5,365,120 | 165 | 정상 |
| 2026-04-28 | 1226 | pending_backfill | 0 | 0 | 4,910,597 | 118 | 미해결 |
| 2026-04-29 | 1227 | confirmed | 450,300 | 20 | 4,294,374 | 139 | 정상 |

- 위 범위의 NocoDB 중복 날짜 수: 0
- pending/api_error/skipped/blackout/403/429/timeout 관련 남은 날짜: 2026-04-28 1건

### Google Sheet C:G 확인

F23B 실행 `265566`의 Google Sheet 읽기 결과 기준이다.

| 날짜 | Sheet row | C:G 값 |
|---|---:|---|
| 2026-04-22 | 113 | 698,380 / 1,234,210 / 68,700 / 2,477,000 / 643,300 |
| 2026-04-23 | 114 | 912,950 / 1,668,150 / 143,000 / 1,546,100 / 182,000 |
| 2026-04-28 | 119 | 2,081,127 / 794,470 / 344,000 / 1,691,000 / 0 |

2026-04-22/23은 쿠팡 G열이 보정값과 일치한다. 2026-04-28은 F23B가 NocoDB 기대값과 Sheet 값이 일치한다고 판단했지만, 쿠팡 자체는 아직 pending이다.

### n8n 실행 이력

| Workflow | 실행 ID | 실행 시각 | 결과 | 핵심 내용 |
|---|---:|---|---|---|
| F23B 쿠팡 pending backfill | 265566 | 2026-04-29 19:30 KST | success | 2026-04-28을 백필 대상으로 감지, F23 호출 |
| F23 통합 일일 매출 | 265567 | 2026-04-29 19:30 KST | success | F23B가 호출한 2026-04-28 재집계. NocoDB/Sheet patch는 성공했지만 쿠팡 6개 상태 모두 403 |
| F23 통합 일일 매출 | 267552 | 2026-04-30 08:00 KST | success | 2026-04-29 매출 정상 집계, 쿠팡 450,300원 / 20건 |
| F24 리치 리포트 | 271523 | 2026-04-30 10:00 KST | success | 2026-04-29 매출 리포트 발송 성공 |

F23B 실행 `265566`의 F23 호출 결과:

```text
날짜: 2026-04-28
NocoDB: patch 성공, Id 1226
Sheets: 일별 매출!C119:G119 업데이트 성공
Coupang: source=pending_backfill, needsBackfill=true
오류: ACCEPT/INSTRUCT/DEPARTURE/DELIVERING/FINAL_DELIVERY/NONE_TRACKING 모두 HTTP 403
```

## 로컬 보정 내용

### `coupang-pending-backfill-1930.json`

`백필 결과 요약` 노드가 아래를 구분하도록 수정했다.

- 해결: F23 재집계 후 NocoDB/Sheets/Coupang 모두 정상
- 미해결: NocoDB/Sheets patch는 성공했지만 `status.coupang.needsBackfill=true`, `source=pending_backfill`, `severity=ERROR`, 또는 쿠팡 오류가 남은 경우
- 실패: F23 호출 자체 실패, NocoDB 실패, Sheets 실패

기존처럼 `patch`만 보고 성공 처리하지 않고, 알림 문구에 `미해결`과 다음 조치를 표시한다.

### `sales-status-smoke-test.js`

F23B 요약 노드가 `hasUnresolvedCoupang`, `needsBackfill`, `unresolvedCount`, `미해결` 문구를 유지하는지 스모크 테스트에 추가했다.


## 추가 반영: 백필 3일치 고정 점검

사용자 요청에 따라 F23B 기본 점검 범위를 “전일 포함 최근 3개 확정일”로 고정했다.

- 당일은 부분 집계 가능성이 있어 제외한다.
- 기본 자동 실행은 D-3, D-2, D-1을 항상 점검한다.
- 해당 기간에 NocoDB `daily_sales` 행 자체가 없으면 `missing_nocodb_record` 후보로 잡아 F23 재집계를 호출한다.
- 기존 수동 웹훅 `body.dates` / `body.targetDate`는 그대로 우선한다.


## 추가 반영: 문제 있을 때만 금액 정정 알림

운영알림 정책을 아래처럼 정리했다.

- 최근 3일 점검 결과 문제가 없으면 Telegram 운영알림을 보내지 않는다.
- 매출 반영 문제가 감지되어 F23 재집계를 호출한 경우에만 알림을 보낸다.
- 알림에는 정정 전/정정 후 `총매출`과 `쿠팡윙` 금액, 증감액을 함께 표시한다.
- 쿠팡 API가 계속 403 등으로 미해결이면 기존 유지 금액과 미해결 사유를 함께 표시한다.
- F23 재집계/NocoDB/Sheets 실패는 실패로 별도 집계한다.

알림 예시는 아래 형식이다.

```text
[운영알림][F23B] 매출 백필 정정 알림
매출 반영 문제 감지: 1일
정정 완료 1 / 미해결 0 / 실패 0

- 2026-04-28: 정정 완료 (patch)
  총매출 4,910,597원 → 5,123,456원 (+212,859원)
  쿠팡윙 0원 → 212,859원 (+212,859원)
  감지 사유: status_pending_backfill
```

## 검증

```text
node n8n-automation/_tools/sales-status-smoke-test.js
=> sales-status-smoke-test: ok

bash _tools/pressco21-check.sh
=> Status: OK
```


## 운영 배포 및 일회성 매출보고 발송 결과

2026-04-30 11:44 KST에 F23B 운영 workflow를 배포했다.

- Workflow: `[F23B] 쿠팡 pending backfill (19:30)`
- Workflow ID: `CZGvlrUcX3PlU5ql`
- 배포 결과: HTTP 200, `active=true`
- 검증: 운영 workflow에서 최근 3일 점검, 정정 알림, 문제 없을 때 무알림 마커 확인
- 백업/검증 산출물: `n8n-automation/backups/20260430-114412-f23b-correction-alert-deploy/`

2026-04-30 11:44 KST에 F24 매출보고를 일회성으로 1회 발송했다.

- F24 실행 ID: `272134`
- Telegram 방: `PRESSCO21 매출 공유`
- Topic: `매출보고` (`message_thread_id=3`)
- message_id: `29`
- 보고 기준일: 2026-04-29
- 어제 매출: 4,294,374원
- 4월 누계: 136,167,648원
- 쿠팡윙: 450,300원, source=`nocodb_f23_api`

## 다음 조치

1. 2026-04-30 19:30 KST F23B가 2026-04-28을 다시 자동 재시도할 예정이다.
2. 같은 403이 반복되면 쿠팡 API 허용 IP/인증/호출 제한 상태를 서버 기준으로 수동 확인해야 한다.
3. 이번 로컬 보정 JSON을 운영 n8n에 배포하면, 다음부터 “성공”이 아니라 “미해결”로 정확히 알림이 나온다.
4. 백필 기본 점검은 최근 3개 확정일로 고정된다.
5. 문제가 없으면 운영알림을 보내지 않고, 문제가 있으면 정정 전/후 금액과 증감액을 운영알림에 포함한다. 운영 배포는 별도 승인 후 진행한다.
