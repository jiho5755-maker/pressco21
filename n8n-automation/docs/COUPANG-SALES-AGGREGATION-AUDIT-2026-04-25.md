# 2026-04-25 쿠팡윙 매출 집계 장애 점검 로그

## 작업 위치

- Worktree: `/Users/jangjiho/workspace/pressco21-worktrees/n8n-coupang-sales-aggregation`
- Branch: `work/n8n/coupang-sales-aggregation`
- 범위: `n8n-automation/workflows/automation/daily-sales-all-channels.json`

## 증상

F23 `[F23] 통합 일일 매출 리포트`가 일부 일자에서 쿠팡윙 매출을 0원으로 저장했다.

운영 NocoDB `daily_sales` 확인 결과:

| 날짜 | 최신 레코드 | 쿠팡윙 매출 | 비고 |
|---|---:|---:|---|
| 2026-04-22 | Id 1242 | 0원 | 쿠팡 API 403으로 `pending_backfill` |
| 2026-04-23 | Id 1243 | 0원 | 쿠팡 API 403으로 `pending_backfill` |
| 2026-04-24 | Id 1244 | 791,000원 | 정상 집계 |

## 실행 로그 근거

n8n F23 운영 실행 로그를 읽기 전용으로 확인했다.

| 실행 ID | 실행 시각 UTC | 대상일 | 쿠팡윙 노드 결과 |
|---|---|---|---|
| 225835 | 2026-04-22 23:00:29 | 2026-04-22 | 6개 상태 모두 HTTP 403 |
| 228698 | 2026-04-23 23:00:29 | 2026-04-23 | 6개 상태 모두 HTTP 403 |
| 231398 | 2026-04-24 23:00:29 | 2026-04-24 | 791,000원 / 30건 정상 |

기존 노드는 `this.helpers.httpRequest` 예외를 `Request failed with status code 403`까지만 저장해서, 403의 세부 원인(IP 허용 문제인지, 일시 차단인지, 서명 오류인지)을 추적하기 어려웠다.

## 읽기 전용 실조회 결과

Oracle/n8n 컨테이너에서 쿠팡 OpenAPI를 직접 읽기 전용으로 재조회했다. 원자료/개인정보는 출력하지 않고 합계만 확인했다.

| 날짜 | 재조회 쿠팡윙 매출 | 주문 수 | raw rows | 상태별 요약 |
|---|---:|---:|---:|---|
| 2026-04-22 | 643,300원 | 26 | 26 | FINAL_DELIVERY 26건 |
| 2026-04-23 | 182,000원 | 17 | 17 | INSTRUCT 1건, DELIVERING 10건, FINAL_DELIVERY 6건 |

따라서 2026-04-22와 2026-04-23은 실제 쿠팡윙 매출이 있었지만 F23 실행 당시 403으로 누락된 것이 맞다.

## 원인 판단

확정 원인:

1. F23 쿠팡 노드는 403/429 같은 쿠팡 API 일시 오류를 재시도하지 않았다.
2. 상태 6개를 거의 연속 호출해 쿠팡 API 제한/일시 차단에 취약했다.
3. 에러 본문을 보존하지 않아 운영 로그만으로 원인 세분화가 불가능했다.
4. 문서 정책은 쿠팡 휴지시간이 14:30~19:00 KST인데, 코드에는 14:30~18:30으로 남아 있었다.

추정:

- 2026-04-22/23의 403은 현재 같은 서버에서 동일 조회가 성공하므로, 영구 인증 실패보다는 쿠팡 측 일시 차단/허용 IP 판정/짧은 연속 호출 관련 가능성이 높다.

## 로컬 수정 내용

`daily-sales-all-channels.json`의 `쿠팡윙 주문 조회` 노드를 보강했다.

- 상태별 호출 간 1.2초 지연 추가
- 403/429/5xx/timeout 계열 최대 3회 재시도 추가
- `nextToken` 페이지네이션 처리 추가
- `statusSummary`, `retryCount` 진단값 반환 추가
- 에러 본문을 가능한 범위에서 요약해 notes에 남기도록 개선
- 쿠팡 휴지시간을 `14:30~19:00`으로 문서와 일치

검증 스크립트 `n8n-automation/_tools/sales-status-smoke-test.js`에도 쿠팡 재시도/지연/페이지네이션 가드 검사를 추가했다.

## 운영 반영 전 주의

아직 운영 NocoDB/Sheets/Workflow에는 쓰기 반영하지 않았다.

운영 반영 시 필요한 순서:

1. F23 workflow 배포 전 dry-run
2. F23 운영 배포
3. 2026-04-22, 2026-04-23 쿠팡윙 값 백필
   - 2026-04-22: `+643,300원`, `+26건`
   - 2026-04-23: `+182,000원`, `+17건`
4. 백필 시 `total_revenue`, `total_orders`, Google Sheet `일별 매출!G113:G114` 및 총계 열 동기화 확인
5. F24 리포트가 NocoDB 최신 레코드를 기준으로 월누계를 다시 계산하는지 확인

## 2026-04-25 운영 반영 결과

사용자 승인 후 운영에 반영했다.

### 1. 쿠팡 휴지시간 단일화

F23 `쿠팡윙 주문 조회` 노드의 휴지시간을 아래 단일 기준으로 정리했다.

```text
14:30~19:00 KST: 쿠팡 매출 API 호출 금지
```

기존처럼 `14:30~18:30`과 완충구간을 나누지 않고, 해당 시간 전체를 하나의 `isCoupangBlackout` 조건으로 처리한다.

### 2. 운영 배포

- 대상 workflow: F23 `[F23] 통합 일일 매출 리포트`
- 운영 ID: `DoAlCOG3OU20Wlvj`
- 배포 시각: 2026-04-25 09:26 KST
- n8n 응답: HTTP 200, `active=true`
- 배포 전 백업: `n8n-automation/backups/20260425-092540-coupang-sales-blackout-backfill/F23-live-before.json`

배포 후 운영 workflow를 다시 읽어 아래 조건을 확인했다.

- `active=true`
- `14:30~19:00` 단일 휴지시간
- `18:30` 잔여 문구 없음
- `maxAttempts=3` 재시도 존재
- `nextToken` 페이지네이션 존재
- `statusSummary` 진단값 존재

### 3. 실제 실행 테스트 및 백필

운영 F23 웹훅으로 2026-04-22, 2026-04-23을 재실행했다.

| 날짜 | n8n 실행 ID | 쿠팡윙 매출 | 쿠팡윙 주문 | 전체 매출 | 전체 주문 | 결과 |
|---|---:|---:|---:|---:|---:|---|
| 2026-04-22 | 231524 | 643,300원 | 26건 | 5,052,890원 | 156건 | 성공 |
| 2026-04-23 | 231525 | 182,000원 | 17건 | 9,954,280원 | 130건 | 성공 |

쿠팡 노드 결과는 두 날짜 모두 `error=''`, `retryCount=0`이었다.

### 4. NocoDB 최신 레코드 반영

F23 재실행으로 NocoDB `daily_sales`에 최신 레코드가 생성됐다. F24/F25는 최신 Id 기준으로 읽으므로 현재 매출 리포트의 기준 원장은 보정 완료 상태다.

| 날짜 | 최신 Id | 쿠팡윙 매출 | 쿠팡윙 주문 | 전체 매출 | 전체 주문 |
|---|---:|---:|---:|---:|---:|
| 2026-04-22 | 1245 | 643,300원 | 26건 | 5,052,890원 | 156건 |
| 2026-04-23 | 1246 | 182,000원 | 17건 | 9,954,280원 | 130건 |

### 5. 남은 운영 이슈: Google Sheets OAuth

F23의 `Sheets 기입` 노드는 현재 Google OAuth refresh token 오류를 반환했다.

```text
The provided authorization grant ... or refresh token is invalid, expired, revoked ...
```

동일 credential 계열을 임시 probe workflow로 확인한 결과 GoogleDocs credential도 같은 오류를 반환했다. 임시 workflow는 테스트 직후 삭제했다.

영향:

- NocoDB 기준 매출 리포트는 보정 완료
- Google Sheet `일별 매출` 직접 기입은 Google OAuth 재연결 전까지 실패
- F24는 NocoDB 값을 우선 사용하므로 자동 채널 리포트는 최신 NocoDB 기준으로 계산 가능
- 단, 로켓배송/기타 수동값을 Sheets에서 읽는 경로는 OAuth 재연결이 필요

후속 조치:

1. n8n UI에서 `Pressco21-GoogleDrive` / 관련 Google OAuth credential 재연결
2. 2026-04-22, 2026-04-23 Sheet 행 `C:G`를 NocoDB 최신값과 맞춤
3. F24/F26 Google Sheets 노드 정상 여부 재검증

## 2026-04-25 Google Sheets 재연결 후 최종 마감

사용자가 n8n Google OAuth credential을 재연결한 뒤 F23을 다시 실행해 Google Sheet까지 최종 반영했다.

| 날짜 | n8n 실행 ID | Sheet 업데이트 범위 | 쿠팡윙 | 전체 매출 |
|---|---:|---|---:|---:|
| 2026-04-22 | 231537 | `일별 매출!C113:G113` | 643,300원 / 26건 | 5,052,890원 |
| 2026-04-23 | 231540 | `일별 매출!C114:G114` | 182,000원 / 17건 | 9,954,280원 |

Google Sheet 읽기 검증 결과:

```text
일별 매출!C113:G114
2026-04-22: 698,380 / 1,234,210 / 0 / 2,477,000 / 643,300
2026-04-23: 912,950 / 1,668,150 / 0 / 7,191,180 / 182,000
```

텔레그램 `PRESSCO21 매출 공유` 방에 정정본 1건을 발송했다.

- message_id: `1320`
- 내용: 2026-04-22/23 쿠팡윙 백필 완료, NocoDB와 Google Sheet 반영 완료, 재발 방지 조치 요약

## 2026-04-25 재발 방지 6개 항목 추가 반영

### 1. Google Sheets 실패 알림 분리

F23은 정상 매출 보고를 보내지 않고, 실패/주의 상황만 `[운영알림]`으로 보낸다.

- Google Sheets 기입 실패
- 채널 API 오류
- 쿠팡 `pending_backfill`
- 쿠팡 API 오류로 기존값 유지
- NocoDB 저장 실패
- NocoDB 중복 원장 자동 정리

정상일 때는 텔레그램 운영 알림을 보내지 않는다. 매출 공유용 리치 리포트는 기존처럼 F24가 담당한다.

### 2. NocoDB `report_date` 기준 upsert

F23의 NocoDB 저장은 더 이상 무조건 `POST`하지 않는다.

1. `report_date`로 기존 daily_sales 행을 조회한다.
2. 같은 날짜가 있으면 가장 큰 `Id`를 최신 행으로 보고 `PATCH`한다.
3. 같은 날짜 중복 행이 있으면 최신 행만 남기고 나머지는 삭제한다.
4. 같은 날짜가 없을 때만 `POST`한다.

### 3. 쿠팡 수집 상태 컬럼

NocoDB `daily_sales`에 `coupang_collection_status` 컬럼을 추가했다.

사용 상태값:

| 값 | 의미 |
|---|---|
| `confirmed` | 쿠팡 API 정상 수집값 |
| `pending_backfill` | 확정값 없이 추후 재조회 필요 |
| `skipped_blackout_nocodb_existing` | 호출금지 시간이라 NocoDB 기존값 유지 |
| `skipped_blackout_sheet_existing` | 호출금지 시간이라 Sheet 기존값 유지 |
| `api_error_nocodb_existing` | API 오류로 NocoDB 기존값 유지 |
| `api_error_sheet_existing` | API 오류로 Sheet 기존값 유지 |
| `api_error` | API 오류이며 기존값도 부족 |

### 4. 19:30 쿠팡 pending backfill

새 workflow를 추가했다.

- 파일: `n8n-automation/workflows/automation/coupang-pending-backfill-1930.json`
- 이름: `[F23B] 쿠팡 pending backfill (19:30)`
- 스케줄: 매일 19:30 KST
- 역할: 최근 14일 daily_sales에서 쿠팡 상태가 pending/api_error/skipped 계열이거나 쿠팡값이 0인 날짜를 찾아 F23 웹훅으로 재집계한다.
- F23은 `report_date` upsert로 동작하므로 재실행해도 같은 날짜 중복 행을 만들지 않는다.

### 5. Telegram 토픽 분리 검토 결과

`PRESSCO21 매출 공유` 방의 현재 Telegram chat type은 `group`이다. Telegram forum topic은 `supergroup` + forum 활성화 상태에서만 생성 가능하므로, 현재 상태에서는 봇이 토픽을 생성할 수 없다.

임시 운영 기준:

- F24: 매출 보고 메시지 유지
- F23/F23B: `[운영알림]` prefix로 운영 알림만 발송
- 정상 F23은 메시지 미발송

향후 방을 supergroup/forum으로 전환하면 F24에는 매출보고 topic `message_thread_id`, F23/F23B에는 운영알림 topic `message_thread_id`를 추가한다.

### 6. 쿠팡 취소/반품 기준

F23 일일 매출은 `createdAt` 기준 주문 집계이며 당일 운영용 총매출이다. 쿠팡 취소/반품/정산 보정은 당일 API 결과에 완전히 반영되지 않을 수 있으므로 F23 수치를 `정산 매출`이라고 부르지 않는다.

운영 기준:

- 당일/전일 자동 보고: 주문 생성 기준 총매출, 취소/반품 중 이미 주문 품목에 표시된 수량만 제외
- 월마감: D+3~D+7에 취소/반품/정산 원장과 대조해 조정
- 쿠팡 API 오류/호출금지 시간: 0원으로 덮지 않고 기존 확정값을 유지하거나 `pending_backfill`로 남김
- 최종 재무 기준: 월마감 조정 후 확정값

## 2026-04-25 NocoDB 원장 정리 결과

NocoDB `daily_sales` 중복 원장을 정리했다.

- 중복 날짜: 14개
- 삭제된 구행: 19개
- 유지 기준: 같은 `report_date` 중 가장 큰 `Id`
- 정리 후 검증: 전체 row 수 1216개, 날짜 수 1216개, 중복 날짜 0개

최근 쿠팡 보정 대상 확인값:

| 날짜 | 유지 Id | 전체 매출 | 쿠팡윙 | 쿠팡 상태 |
|---|---:|---:|---:|---|
| 2026-04-20 | 1241 | 10,053,700원 | 1,083,870원 | confirmed |
| 2026-04-21 | 1240 | 5,581,090원 | 595,740원 | confirmed |
| 2026-04-22 | 1247 | 5,052,890원 | 643,300원 | confirmed |
| 2026-04-23 | 1248 | 9,954,280원 | 182,000원 | confirmed |
| 2026-04-24 | 1244 | 7,179,030원 | 791,000원 | confirmed |

## 2026-04-25 추가 확인: 4월 24일 Google Sheet 누락 대응

4월 24일 일별 매출 행이 Google Sheet에 비어 있는 문제는, 2026-04-25 08:00 자동 실행 당시 Google OAuth refresh token 오류로 `Sheets 기입` 노드가 실패했고, 이후 Google credential 재연결 뒤에는 4월 22일/23일만 수동 재집계했기 때문에 발생한 것으로 판단한다.

재발 방지를 위해 F23B 19:30 backfill에 Google Sheet C:G 검산을 추가했다.

- 읽기 범위: `일별 매출!C2:G367`
- 비교 기준: 최근 14일 NocoDB `daily_sales` 최신 행의 자동 채널 5개 값
  - MakeShop, Naver, 11번가, CRM, Coupang
- Sheet 행이 비어 있거나 NocoDB와 불일치하면 해당 날짜를 F23 재집계 후보로 포함한다.
- Google Sheet 조회 자체가 실패하면 `[운영알림]`으로 알리고, NocoDB 기준 쿠팡 pending 후보 처리는 계속 수행한다.

따라서 앞으로 Google OAuth 장애가 복구된 뒤에도 누락 행이 남으면 19:30 backfill 또는 수동 backfill로 다시 기입된다.

### 실시간 동기화 검증 결과

2026-04-24 행은 F23 재실행으로 Google Sheet와 NocoDB가 다시 일치했다.

- F23 재실행 대상: `2026-04-24`
- Sheet 업데이트 범위: `일별 매출!C115:G115`
- F23 응답: `sheets.ok=true`, `nocodb.action=patch`, `nocodb.id=1244`
- Sheet 직접 읽기 결과: `2,751,220 / 859,110 / 2,264,000 / 513,700 / 791,000`

이번 누락의 직접 원인은 동기화 설정 부재가 아니라 08:00 자동 실행 당시 Google OAuth credential이 만료되어 Sheet 쓰기가 실패한 점이다. 재연결 후 4월 22일/23일은 재실행했지만 4월 24일은 재실행하지 않아 Sheet 행만 비어 있었다.

보완:

- F23은 Sheet 실패 시 `[운영알림]`을 보낸다.
- F23B는 19:30에 최근 14일 NocoDB와 Google Sheet C:G를 비교해 누락/불일치 행을 자동 재집계한다.
- F23B는 당일 부분 집계를 만들지 않도록 자동 후보 범위를 전일까지만 제한한다. 당일 조회는 명시적인 수동 `targetDate` 요청에서만 허용한다.

스모크 테스트 중 F23B가 기존 placeholder인 2026-04-25 행을 잘못 후보로 잡아 부분값을 한 번 기록한 문제가 있었고, 즉시 아래처럼 원복했다.

- NocoDB 2026-04-25 Id 1223: 0원 placeholder 상태로 복구
- Google Sheet `일별 매출!C116:G116`: clear 완료
- F23B 후보 범위: 전일까지만 보도록 재배포
