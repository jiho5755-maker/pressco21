# PRESSCO21 백업 및 복원 가이드

> Task 298 산출물 | 작성일: 2026-02-26

---

## 1. 백업 개요

Oracle Cloud Ubuntu 서버(`158.180.77.201`)에서 매일 새벽 3시 자동 백업이 실행됩니다.
7일치 롤링 보관 방식으로 오래된 백업은 자동 삭제됩니다.

---

## 2. 백업 파일 위치 및 구조

### 백업 기본 경로
```
/home/ubuntu/backups/YYYYMMDD_HHMMSS/
```

예시:
```
/home/ubuntu/backups/
├── 20260226_030001/
│   ├── noco_20260226_030001.db          # NocoDB SQLite 데이터베이스
│   ├── n8n_workflows_20260226_030001.json  # n8n 워크플로우 전체 내보내기
│   ├── docker-compose_20260226_030001.bak  # docker-compose.yml 백업
│   └── n8n_env_20260226_030001.bak      # n8n 환경변수(.env) 백업
├── 20260225_030001/
│   └── ...
└── 20260219_030001/  ← 7일 경과 후 자동 삭제
    └── ...
```

### 각 파일 설명

| 파일명 패턴 | 내용 | 중요도 |
|-----------|------|--------|
| `noco_*.db` | NocoDB 전체 데이터 (파트너, 클래스, 정산 등) | 최상 |
| `n8n_workflows_*.json` | 모든 n8n 워크플로우 로직 | 상 |
| `docker-compose_*.bak` | 서버 구성 설정 | 중 |
| `n8n_env_*.bak` | API 키, 시크릿 등 환경변수 | 최상 (유출 주의) |

---

## 3. 서버 접속 방법

```bash
ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201
```

---

## 4. NocoDB 데이터 복원

### 4-1. 복원 전 확인사항
- 복원하면 현재 데이터가 모두 덮어씌워집니다
- 복원 전 현재 데이터도 별도로 백업해두는 것을 권장합니다

### 4-2. 복원 절차

```bash
# 1. 서버 접속
ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201

# 2. 복원할 백업 날짜 확인
ls /home/ubuntu/backups/

# 3. NocoDB 컨테이너 중지
docker stop nocodb

# 4. 백업 파일 복원 (날짜를 실제 백업 날짜로 교체)
BACKUP_DATE="20260226_030001"
cp /home/ubuntu/backups/${BACKUP_DATE}/noco_${BACKUP_DATE}.db \
   /home/ubuntu/nocodb/nocodb_data/noco.db

# 5. NocoDB 컨테이너 재시작
docker start nocodb

# 6. 정상 동작 확인 (로그에 에러 없으면 성공)
docker logs nocodb --tail=30
```

### 4-3. 복원 확인
브라우저에서 `https://nocodb.pressco21.com` 접속 후 로그인하여 데이터 확인.

---

## 5. n8n 워크플로우 복원

### 방법 A: n8n UI에서 가져오기 (권장)

1. `https://n8n.pressco21.com` 접속 후 로그인
2. 상단 메뉴 → **Workflows** → 우측 상단 **Import from File** 클릭
3. `/home/ubuntu/backups/YYYYMMDD_HHMMSS/n8n_workflows_*.json` 파일 업로드
4. 가져온 워크플로우 목록 확인 후 각각 **Activate**

### 방법 B: n8n API로 가져오기

```bash
N8N_API_KEY="eyJhbGci..."  # 실제 API 키 사용

# 백업 파일 경로 지정
BACKUP_FILE="/home/ubuntu/backups/20260226_030001/n8n_workflows_20260226_030001.json"

# 단일 워크플로우 가져오기 (백업 파일이 단일 워크플로우인 경우)
curl -X POST \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @${BACKUP_FILE} \
  "https://n8n.pressco21.com/api/v1/workflows"
```

### 방법 C: 로컬 저장소에서 복원

프로젝트의 `파트너클래스/n8n-workflows/` 폴더에 모든 워크플로우 JSON 파일이 보관되어 있습니다.
파일 목록:
```
WF-01-class-api.json
WF-02-partner-auth-api.json
WF-03-partner-data-api.json
WF-04-record-booking.json
WF-05-order-polling-batch.json
WF-06-class-management.json
WF-07-partner-apply.json
WF-08-partner-approve.json
WF-09-review-reply.json
WF-10-education-complete.json
WF-11-send-reminders.json
WF-12-review-requests.json
WF-13-grade-update.json
WF-16-class-register.json
WF-APPROVE-nocodb-auto-approve.json
WF-ERROR-handler.json
```

---

## 6. n8n 환경변수 복원

환경변수가 초기화된 경우 아래 절차로 복원합니다:

```bash
# 1. 백업에서 환경변수 파일 복원
BACKUP_DATE="20260226_030001"
cp /home/ubuntu/backups/${BACKUP_DATE}/n8n_env_${BACKUP_DATE}.bak \
   /home/ubuntu/n8n/.env

# 2. n8n 컨테이너 재시작으로 환경변수 적용
docker compose -f /home/ubuntu/docker-compose.yml restart n8n

# 3. 로그 확인
docker logs n8n --tail=30
```

### 주요 환경변수 항목 (초기값 재설정 시 참고)

| 변수명 | 설명 |
|--------|------|
| `ADMIN_API_TOKEN` | 관리자 API 토큰 (`pressco21-admin-2026`) |
| `NOCODB_PROJECT_ID` | NocoDB 프로젝트 ID (`poey1yrm1r6sthf`) |
| `MAKESHOP_DOMAIN` | 메이크샵 도메인 (`foreverlove.co.kr`) |
| `MAKESHOP_PARTNER_GROUP_NO` | 파트너 회원그룹 번호 |
| `TELEGRAM_CHAT_ID` | 텔레그램 알림 채팅 ID (`7713811206`) |

---

## 7. 자동 백업 스케줄 설정 (crontab)

서버에서 다음 명령으로 crontab을 확인하거나 설정합니다:

```bash
# crontab 확인
crontab -l

# crontab 편집
crontab -e
```

crontab 내용 (매일 새벽 3시, 7일 롤링):
```cron
# PRESSCO21 자동 백업 - 매일 새벽 3시
0 3 * * * /home/ubuntu/scripts/backup.sh >> /home/ubuntu/backups/backup.log 2>&1

# 오래된 백업 삭제 - 매일 새벽 3시 30분 (7일 이상)
30 3 * * * find /home/ubuntu/backups -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;
```

### 백업 스크립트 예시 (`/home/ubuntu/scripts/backup.sh`)

```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups/${TIMESTAMP}"
mkdir -p "${BACKUP_DIR}"

# NocoDB 백업
cp /home/ubuntu/nocodb/nocodb_data/noco.db \
   "${BACKUP_DIR}/noco_${TIMESTAMP}.db"

# docker-compose 백업
cp /home/ubuntu/docker-compose.yml \
   "${BACKUP_DIR}/docker-compose_${TIMESTAMP}.bak"

# n8n 환경변수 백업
cp /home/ubuntu/n8n/.env \
   "${BACKUP_DIR}/n8n_env_${TIMESTAMP}.bak"

echo "[${TIMESTAMP}] 백업 완료: ${BACKUP_DIR}"
```

---

## 8. 모니터링 (15분 주기 헬스체크)

서버와 컨테이너 상태를 15분마다 자동 점검합니다.
이상 감지 시 텔레그램으로 알림이 전송됩니다.

### 모니터링 crontab 추가

```cron
# 15분마다 n8n/nocodb 상태 확인
*/15 * * * * /home/ubuntu/scripts/healthcheck.sh >> /home/ubuntu/backups/health.log 2>&1
```

### 헬스체크 스크립트 예시

```bash
#!/bin/bash
# n8n 응답 확인
n8n_status=$(curl -s -o /dev/null -w "%{http_code}" https://n8n.pressco21.com/healthz)
# nocodb 응답 확인
nocodb_status=$(curl -s -o /dev/null -w "%{http_code}" https://nocodb.pressco21.com)
# 컨테이너 실행 상태
n8n_running=$(docker inspect --format='{{.State.Running}}' n8n 2>/dev/null)
nocodb_running=$(docker inspect --format='{{.State.Running}}' nocodb 2>/dev/null)

if [ "$n8n_status" != "200" ] || [ "$n8n_running" != "true" ]; then
  # 텔레그램 알림 발송
  curl -s -X POST "https://n8n.pressco21.com/webhook/backup-notify" \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"[경고] n8n 서버 응답 없음 (HTTP ${n8n_status})\"}"
fi

if [ "$nocodb_running" != "true" ]; then
  curl -s -X POST "https://n8n.pressco21.com/webhook/backup-notify" \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"[경고] NocoDB 컨테이너 중지 상태\"}"
fi
```

---

## 9. NocoDB - n8n 네트워크 연결

**Task 297 완료 (2026-02-26)**: docker-compose.yml에 NocoDB 서비스 블록 + 네트워크 설정이 영구 추가되었습니다.
`docker compose up -d` 실행 시 자동으로 n8n 내부 네트워크에 연결됩니다.

```bash
# 전체 재시작 (네트워크 자동 연결됨)
cd /home/ubuntu && docker compose up -d

# 상태 확인
docker network inspect n8n_n8n-network | grep -A2 "nocodb"
```

**비상용 수동 연결 명령** (docker compose 외부에서 nocodb 컨테이너만 재시작한 경우):
```bash
docker network connect n8n_n8n-network nocodb
```

---

## 10. 긴급 복구 체크리스트

문제 발생 시 순서대로 진행:

- [ ] 1. 서버 SSH 접속 가능 여부 확인
- [ ] 2. `docker ps` 로 컨테이너 실행 상태 확인
- [ ] 3. 중지된 컨테이너 `docker start [컨테이너명]` 으로 재시작
- [ ] 4. `docker network connect n8n_n8n-network nocodb` 실행
- [ ] 5. n8n 로그 확인: `docker logs n8n --tail=50`
- [ ] 6. NocoDB 로그 확인: `docker logs nocodb --tail=50`
- [ ] 7. 데이터 손상이 의심되면 최신 백업으로 복원 (섹션 4 참조)
- [ ] 8. 복원 후 워크플로우 ACTIVE 상태 재확인
