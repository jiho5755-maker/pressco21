# n8n-debugger 에이전트 메모리

## n8n 접속 정보
- SSH: `ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201`
- n8n API Key: `${N8N_API_KEY: .secrets.env 참조} (파일 내 전체 키 참조)
- 컨테이너: `n8n_n8n_1`

## 알려진 버그 패턴 (Phase 2에서 확립)

### 1. 병렬 실행 버그 (가장 흔함)
- 오류: `"hasn't been executed"`
- 원인: 두 노드 → 동일 Code 노드 연결 시 경쟁 조건
- 해결: 순차 실행으로 변경, `$('노드명').first().json` 참조

### 2. Switch v3 fixedCollection 키
- 잘못된 키: `rules.rules` → 올바른 키: `rules.values`
- fallbackOutput: parameters 최상위에 위치 (rules 내부 아님)

### 3. NocoDB 재시작 후 연결 끊김
- 해결: `docker network connect n8n_n8n-network nocodb`

### 4. class status 유효값
- 유효: `active`/`paused`/`closed`
- 금지: `inactive` (WF-06에서 400 오류 발생)

## 검증된 API 테스트 패턴
```bash
curl -s -X POST https://n8n.pressco21.com/webhook/class-api \
  -H "Content-Type: application/json" \
  -d '{"action": "getCategories"}'
```
## 2026-03-11 S2-4 WF-01 분리 디버깅 메모

- n8n public API create 는 `name/nodes/connections/settings` 만 허용한다. `staticData/pinData/tags` 를 같이 보내면 `request/body must NOT have additional properties` 로 실패한다.
- 이 환경의 workflow update 메서드는 `PATCH` 가 아니라 `PUT /api/v1/workflows/{id}` 로 동작한다.
- 운영 셸 환경에 stale `N8N_API_KEY` 가 남아 있을 수 있어, 자동화 스크립트는 `.secrets.env` 값을 우선 사용해야 한다.
- 라우터 응답에는 내부 `_status` 를 그대로 노출하지 말고, 응답 코드에만 사용한 뒤 외부 본문에서는 제거해야 baseline 회귀 비교가 맞는다.
- 새 `WF-01B Schedule Read API` 는 NocoDB HTTP Request credential(`PRESSCO21-NocoDB`) 누락 시 200 빈 본문처럼 보이면서 execution status 는 error 로 남는다.

## 2026-03-11 S2-6 리텐션 WF 디버깅 메모

- `WF-RETENTION Student Lifecycle` 는 병렬 fan-in 대신 순차 NocoDB 조회 구조로 두는 편이 안정적이었다.
- NocoDB `class_date eq 'YYYY-MM-DD'` 필터가 이 환경에서 안정적으로 동작하지 않아, 완료 예약은 `status=COMPLETED` 집합 조회 후 Code 노드에서 날짜를 거른다.
- KST 기준 완료/휴면 날짜 계산은 로컬 타임존 Date 객체보다 UTC helper 를 써야 하루 밀림이 없다.
- 현재 운영 `ADMIN_API_TOKEN` 은 저장소 랜덤값이 아니라 구형 토큰 `pressco21-admin-2026` 기준으로만 수동 웹훅 인증이 통과한다.
- 수동 실호출은 `200` 빈 본문 케이스가 남아 있으므로, 운영 검증 기준은 dry run 응답과 예약 실행 로그를 우선한다.

## 2026-03-11 S2-7 파트너 이탈 감지 디버깅 메모

- `WF-02`, `WF-CHURN` 모두 fan-in 병렬 구조에서 `Node 'X' hasn't been executed` 오류가 났고, 해결책은 순차 체인으로 바꾸는 것이었다.
- `WF-02` 에서 code node 직접 `fetch` PATCH 는 운영 row 반영이 불안정했다. 같은 PATCH 도 NocoDB credential HTTP Request 노드로 바꾸면 정상 저장됐다.
- `tbl_Settlements` 는 `created_date` 가 아니라 `CreatedAt` 을 사용한다.
- `tbl_EmailLogs` 실제 스키마는 `recipient / email_type / status / error_message / CreatedAt / UpdatedAt` 이다.
- `tbl_EmailLogs.email_type` 는 select 옵션 제약이 있어서 churn 전용 타입을 직접 넣을 수 없고, `PARTNER_NOTIFY` + `error_message` 태그 방식으로 우회해야 한다.
- Telegram 노드 `onError=continueRegularOutput` 는 그대로 Respond 노드에 연결하면 에러 아이템이 최종 JSON 을 덮어쓴다. 별도 `Restore Final Response` 노드가 필요하다.
- 2026-03-11 기준 운영 blocker:
  - `PRESSCO21 SMTP` → `535 Username and Password not accepted`
  - `TELEGRAM_CHAT_ID` 비어 있음

## 2026-03-11 S2-8 WF-01 캐시 디버깅 메모

- `WF-01A/WF-01C` cache 분기에서 `IF` 노드 boolean 비교는 miss payload `{}` 를 true branch 로 보내는 이상 동작이 있었다.
- cache hit 판정은 `IF` 대신 `Switch` 로 `HIT/MISS` 문자열을 나누는 편이 안정적이다.
- cache check code node 는 hit 시 `_cacheStatus: 'HIT' + payload`, miss 시 `_cacheStatus: 'MISS'` 만 내보낸다.
- 외부 응답 본문에는 `_cacheStatus` 를 남기지 말고 `Respond to Webhook` 의 `responseBody` 표현식에서 제거한다.
- `GET /api/v1/workflows/{id}` 응답에서는 staticData 가 비어 보일 수 있다. 이 환경에서는 `executions?includeData=true` 의 node path 로 cache hit 여부를 확인하는 편이 정확했다.
- 라이브 검증 기준:
  - warm miss 1회: `NocoDB Get ... -> Store ... Cache`
  - 이후 hit: `Check Cache -> Switch Cache -> Respond` 만 실행

## 2026-03-11 S2-9 묶음 키트 WF 디버깅 메모

- `WF-01A getClassDetail` 파라미터명은 `class_id` 가 아니라 `id` 다. 라이브 상세 확인도 `id` 로 호출해야 한다.
- `tbl_Classes` 는 `kit_bundle_branduid` 물리 컬럼과 `nc_columns_v2` 메타를 둘 다 추가해야 NocoDB UI 와 API 가 같이 맞는다.
- `WF-17` 는 단일 상품 생성 WF 가 아니라 `_productKind=CLASS|KIT_BUNDLE` 2단 생성 구조로 보는 편이 맞다.
- `WF-17` 두 번째 키트 상품 생성 단계에서는 클래스 오픈 메일을 다시 보내지 않도록 `IF Product Kind Class` 분기가 필요하다.
- `WF-05` 키트 처리 여부는 단일 row 가 아니라 `order_id` 로 주문 라인을 묶어 판정해야 한다. 같은 주문 안에 기대 `bundle_branduid` 가 실제로 있을 때만 키트 후속 처리를 태운다.
