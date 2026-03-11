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
