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
