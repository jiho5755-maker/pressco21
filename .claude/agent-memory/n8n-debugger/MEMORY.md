# n8n-debugger 에이전트 메모리

## n8n 접속 정보
- SSH: `ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201`
- n8n API Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (파일 내 전체 키 참조)
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
