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
