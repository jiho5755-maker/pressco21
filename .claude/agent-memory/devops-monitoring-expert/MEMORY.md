# devops-monitoring-expert 에이전트 메모리

## 서버 접속 정보
- SSH: `ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201`
- Oracle Cloud: ap-osaka-1 지역, VM.Standard.E2.1.Micro (무료 티어)
- n8n: https://n8n.pressco21.com (내부 5678)
- NocoDB: https://nocodb.pressco21.com (내부 8080)

## Docker 컨테이너 구성
- n8n: `n8n_n8n_1`
- NocoDB: `nocodb`
- 네트워크: `n8n_n8n-network`
- docker-compose.yml 위치: `~/n8n/docker-compose.yml`

## 반복 발생 이슈 (Phase 2 확립)
- **Docker 재시작 후**: `docker network connect n8n_n8n-network nocodb` 재실행 필수
- **이 명령이 없으면**: n8n에서 http://nocodb:8080 접근 불가

## 자동화 필요 항목
- [ ] 5분 주기 NocoDB 네트워크 연결 확인 스크립트
- [ ] 매일 새벽 3시 NocoDB 데이터 백업
- [ ] 서버 재시작 시 자동 복구 systemd service
- [ ] SSL 인증서 만료 30일 전 텔레그램 알림

## 텔레그램 알림 채널
- TELEGRAM_CHAT_ID: 7713811206
- WF-ERROR 워크플로우를 통해 n8n 오류 자동 알림 설정 완료

## 2026-03-11 S3-4 확장성 검증 결과

- 기준 러너:
  - `node scripts/partnerclass-s3-4-scalability-runner.js`
- idle 스냅샷:
  - `n8n` `320.7MiB`
  - `nocodb` `247.3MiB`
  - available memory `9.0GiB`
- post-load 스냅샷:
  - `n8n` `717.1MiB`
  - `nocodb` `340.2MiB`
  - load average `0.03 -> 2.35`
- 부하 결과:
  - `10c/5s`: 100%
  - `50c/5s`: 100%, avg `6845.9ms`
  - `100c/10s`: successRate `0~1%`, local abort timeout 다수
- 같은 서버 SQLite 100k indexed query 는 `0.03~0.04ms` 수준이라 DB 엔진 자체보다 `n8n public read queue` 가 병목으로 판단된다.
- 운영 우선순위:
  - public read cache 강화
  - hot read path 분리
  - 필요 시 read worker 또는 상위 CPU 스펙 검토
- 참조 문서:
  - `docs/파트너클래스/scalability-verification-guide.md`
