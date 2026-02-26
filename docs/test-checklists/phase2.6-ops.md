# Phase 2.6 인프라 + 관리 검증 체크리스트

작성일: 2026-02-26
버전: Phase 2.6 (운영 인프라 강화)
작성자: QA/테스트 전문가 에이전트
참조 Task: Task 302

관련 선행 체크리스트:
- `phase2-deployment-check.md` (Task 271) -- 기초 인프라/Docker/Credentials
- `phase2-v2-integration-test.md` (Task 251) -- 기능별 플로우/에러핸들링
- `phase2-e2e.md` (Task 280) -- 신규 UX + 보안 경계값 + 완료 선언

본 문서 초점: **Task 297~301 신규 구성요소 (백업/모니터링/SSL갱신/NocoDB관리/후기기능) 검증**

---

## 운영 환경 참조 정보

| 항목 | 값 |
|------|-----|
| 서버 IP | `158.180.77.201` |
| SSH 접속 | `ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201` |
| n8n URL | https://n8n.pressco21.com |
| NocoDB URL | https://nocodb.pressco21.com |
| 텔레그램 Chat ID | `7713811206` |
| 관리자 토큰 | `pressco21-admin-2026` |
| n8n API Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (MEMORY.md 참조) |
| NocoDB API Token | `SIxKK9NtvgsQeLnMQcxbi5pNJGF7tJhnrv6LLGFl` |
| NocoDB Project ID | `poey1yrm1r6sthf` |
| WF-BACKUP ID | `al1OukxfDEs6DAOY` |
| WF-APPROVE ID | `u00ltxmpWR5Poz4J` |

---

## 합격 기준

| 심각도 | 허용 실패 수 | 설명 |
|--------|------------|------|
| CRITICAL | 0건 | 1건이라도 실패 시 Phase 2.6 완료 불가 |
| HIGH | 0건 | 권장, 조건부 1건 허용 (즉시 수정 계획 수립 필수) |
| NORMAL | 2건 이하 | 배포 후 수정 허용 |

**전체 소요 시간 예상: 약 90~120분**

---

## 섹션 1. Docker / 컨테이너 안정성 검증

> Task 297 산출물 검증 -- 예상 소요: 20~25분

### 1-1. docker-compose.yml 구성 확인

NocoDB 서비스가 docker-compose.yml에 통합되어 있는지 확인한다.
별도 `docker run` 명령이 아닌 `docker compose up -d` 한 번으로 3개 컨테이너가 모두 기동되어야 한다.

```bash
# SSH 접속 후 실행
ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201

# docker-compose.yml에 nocodb 서비스 존재 확인
grep -n "nocodb" ~/docker-compose.yml
```

- [ ] **[CRITICAL]** `docker-compose.yml`에 `nocodb` 서비스 섹션 존재
  - 기대: `image: nocodb/nocodb:latest` 라인 포함
- [ ] **[CRITICAL]** `docker-compose.yml`에 `depends_on` 또는 `healthcheck` 설정 존재
  - 기대: n8n이 nocodb에 의존하거나 healthcheck 조건 명시
- [ ] **[HIGH]** nocodb 서비스에 `restart: unless-stopped` (또는 `always`) 설정 존재
  - 기대: 서버 재시작 시 자동 기동 보장

### 1-2. 3개 컨테이너 동시 기동 상태 확인

```bash
# 컨테이너 상태 전체 확인
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

- [ ] **[CRITICAL]** `n8n` 컨테이너 `Up` 상태 확인
  - 기대: `n8n ... Up X hours ... 5678/tcp`
- [ ] **[CRITICAL]** `n8n-postgres` (또는 `postgres`) 컨테이너 `Up` 상태 확인
  - 기대: `postgres ... Up X hours ... 5432/tcp`
- [ ] **[CRITICAL]** `nocodb` 컨테이너 `Up` 상태 확인
  - 기대: `nocodb ... Up X hours ... 8080/tcp`
- [ ] **[HIGH]** 3개 컨테이너 모두 `(healthy)` 또는 `Up` 상태이며 `Restarting` 상태 아님
  - 기대: `Restarting` 문자열이 어떤 컨테이너에도 없음

### 1-3. healthcheck 동작 확인

```bash
# 개별 컨테이너 healthcheck 상태 확인
docker inspect n8n --format='{{.State.Health.Status}}'
docker inspect nocodb --format='{{.State.Health.Status}}'
```

- [ ] **[NORMAL]** n8n healthcheck 상태 `healthy` 반환
- [ ] **[NORMAL]** nocodb healthcheck 상태 `healthy` 반환

### 1-4. n8n-network 영구 연결 확인

Task 297 이전에는 서버 재시작 후 `docker network connect n8n_n8n-network nocodb`를 수동으로 재실행해야 했다.
Task 297 완료 후에는 docker-compose.yml 네트워크 설정으로 영구 연결되어야 한다.

```bash
# nocodb가 n8n 네트워크에 포함되어 있는지 확인
docker network inspect n8n_n8n-network --format='{{range .Containers}}{{.Name}} {{end}}'
```

- [ ] **[CRITICAL]** `n8n_n8n-network` 네트워크에 `nocodb` 컨테이너 포함
  - 기대: 출력 결과에 `nocodb` 문자열 존재
- [ ] **[CRITICAL]** n8n에서 `http://nocodb:8080` 내부 호스트명으로 접근 가능
  ```bash
  # n8n 컨테이너 내부에서 nocodb 접근 테스트
  docker exec n8n wget -qO- http://nocodb:8080/api/v1/health 2>/dev/null | head -c 100
  ```
  - 기대: `{"status":"ok"}` 또는 JSON 응답 반환

### 1-5. 서버 재시작 후 자동 복구 시뮬레이션

> 주의: 이 테스트는 약 2~3분의 서비스 중단을 유발한다. 트래픽이 적은 시간대에 실행한다.

```bash
# docker compose 전체 재시작
cd ~
docker compose down
sleep 5
docker compose up -d

# 30초 대기 후 상태 확인
sleep 30
docker ps --format "table {{.Names}}\t{{.Status}}"
```

- [ ] **[CRITICAL]** `docker compose down && docker compose up -d` 후 3개 컨테이너 모두 자동 기동
  - 기대: n8n / postgres / nocodb 모두 `Up` 상태
- [ ] **[CRITICAL]** 재시작 후 `http://nocodb:8080` 내부 접근 복구 (n8n-network 재연결 불필요)
  - 기대: 수동 `docker network connect` 없이도 nocodb 통신 가능
- [ ] **[HIGH]** 재시작 후 https://n8n.pressco21.com 접속 정상
  - 기대: n8n 로그인 페이지 200 응답

---

## 섹션 2. 백업 자동화 검증

> Task 298 산출물 검증 -- 예상 소요: 15~20분

### 2-1. 백업 스크립트 존재 확인

```bash
# 스크립트 파일 존재 및 실행 권한 확인
ls -la /home/ubuntu/scripts/backup.sh
```

- [ ] **[CRITICAL]** `/home/ubuntu/scripts/backup.sh` 파일 존재
- [ ] **[CRITICAL]** `backup.sh` 실행 권한 보유 (`-rwxr-xr-x` 또는 `-rwx------`)
  - 기대: `x` 권한 비트 포함

### 2-2. 백업 스크립트 수동 실행

```bash
# 수동 실행 (stdout으로 진행 상황 출력됨)
bash /home/ubuntu/scripts/backup.sh

# 백업 디렉토리 확인 (스크립트가 생성하는 경로 확인)
ls -lh /home/ubuntu/backups/ 2>/dev/null || ls -lh ~/backups/ 2>/dev/null
```

- [ ] **[CRITICAL]** 스크립트 실행 시 오류 없이 완료 (`exit 0`)
- [ ] **[CRITICAL]** 백업 파일 4종 생성 확인
  - [ ] n8n 워크플로우 데이터 백업 (예: `n8n-workflows-YYYYMMDD.tar.gz` 또는 유사)
  - [ ] NocoDB 데이터 백업 (예: `nocodb-data-YYYYMMDD.tar.gz` 또는 유사)
  - [ ] n8n 환경설정/Credentials 백업 (예: `n8n-env-YYYYMMDD.tar.gz` 또는 유사)
  - [ ] 백업 목록/로그 파일 (예: `backup-log-YYYYMMDD.txt` 또는 유사)
  - 기대: 4종 파일 모두 오늘 날짜 타임스탬프 포함
- [ ] **[HIGH]** 백업 파일 크기가 0보다 큼 (빈 파일 아님)
  ```bash
  find /home/ubuntu/backups/ -name "*.gz" -newer /home/ubuntu/scripts/backup.sh | xargs ls -lh 2>/dev/null
  ```

### 2-3. crontab 등록 확인

```bash
# ubuntu 사용자 crontab 확인
crontab -l
```

- [ ] **[CRITICAL]** `0 3 * * *` 패턴으로 `backup.sh` crontab 등록 확인
  - 기대: `0 3 * * * /home/ubuntu/scripts/backup.sh` 또는 유사 라인 존재
- [ ] **[HIGH]** crontab 출력에 구문 오류 없음 (경고 메시지 없이 목록만 출력)

### 2-4. 7일 롤링 삭제 동작 확인

```bash
# 스크립트 내 오래된 파일 삭제 로직 존재 확인
grep -n "find\|mtime\|delete\|days\|7" /home/ubuntu/scripts/backup.sh
```

- [ ] **[NORMAL]** `find ... -mtime +7 -delete` 또는 유사 패턴으로 7일 초과 백업 자동 삭제 로직 존재
  - 기대: 디스크 용량 무한 증가 방지 코드 확인

### 2-5. WF-BACKUP webhook 테스트

백업 완료 후 Telegram 알림을 보내는 WF-BACKUP 워크플로우를 직접 호출하여 테스트한다.

```bash
# WF-BACKUP webhook 직접 호출 (backup.sh가 내부적으로 호출하는 것과 동일)
curl -s -X POST https://n8n.pressco21.com/webhook/backup-notify \
  -H "Content-Type: application/json" \
  -d '{
    "status": "success",
    "timestamp": "2026-02-26T03:00:00+09:00",
    "files": ["n8n-workflows.tar.gz", "nocodb-data.tar.gz"],
    "total_size": "12MB",
    "message": "[테스트] Phase 2.6 백업 검증 수동 호출"
  }' | python3 -m json.tool 2>/dev/null || echo "응답: $(curl -s -X POST https://n8n.pressco21.com/webhook/backup-notify -H 'Content-Type: application/json' -d '{\"status\":\"test\"}')"
```

- [ ] **[CRITICAL]** WF-BACKUP (ID: `al1OukxfDEs6DAOY`) n8n에서 ACTIVE 상태 확인
  ```bash
  curl -s -H "X-N8N-API-KEY: [n8n_api_key]" \
    "https://n8n.pressco21.com/api/v1/workflows/al1OukxfDEs6DAOY" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print('active:', d.get('active'))"
  ```
  - 기대: `active: True`
- [ ] **[CRITICAL]** `/webhook/backup-notify` POST 호출 시 2xx 응답 반환
  - 기대: HTTP 200 또는 JSON `{"success": true}` 형태
- [ ] **[CRITICAL]** Telegram 알림 수신 확인
  - 기대: Chat ID `7713811206`으로 백업 완료/테스트 메시지 수신

---

## 섹션 3. SSL 자동갱신 검증

> Task 299 산출물 검증 -- 예상 소요: 10~15분

### 3-1. certbot.timer 상태 확인

```bash
# certbot 타이머 상태 확인
systemctl status certbot.timer
```

- [ ] **[CRITICAL]** `certbot.timer` 상태 `active (waiting)` 확인
  - 기대: `Active: active (waiting)` 라인 존재
- [ ] **[HIGH]** `certbot.timer` Next run 시간이 설정되어 있음
  - 기대: `Trigger:` 또는 `Next elapse:` 항목에 미래 시간 표시
- [ ] **[NORMAL]** certbot 서비스 자체가 enabled 상태
  ```bash
  systemctl is-enabled certbot.timer
  ```
  - 기대: `enabled` 출력

### 3-2. SSL 인증서 만료일 확인

```bash
# n8n 인증서 만료일 확인
openssl s_client -connect n8n.pressco21.com:443 -servername n8n.pressco21.com \
  </dev/null 2>/dev/null | openssl x509 -noout -dates

# nocodb 인증서 만료일 확인
openssl s_client -connect nocodb.pressco21.com:443 -servername nocodb.pressco21.com \
  </dev/null 2>/dev/null | openssl x509 -noout -dates
```

- [ ] **[CRITICAL]** n8n.pressco21.com SSL 인증서 만료일 30일 이상 잔여
  - 기대 (Task 299 기록 기준): 약 87일 잔여 (2026-02-26 기준)
- [ ] **[CRITICAL]** nocodb.pressco21.com SSL 인증서 만료일 30일 이상 잔여
  - 기대 (Task 299 기록 기준): 약 89일 잔여 (2026-02-26 기준)
- [ ] **[NORMAL]** 두 인증서 모두 Let's Encrypt 발급 (`Issuer: C=US, O=Let's Encrypt`)

인증서 만료일 기록:
- n8n.pressco21.com 만료일: _______________
- nocodb.pressco21.com 만료일: _______________

### 3-3. certbot 갱신 dry-run 테스트

> 주의: dry-run은 실제 갱신을 수행하지 않으므로 서비스에 영향 없음.

```bash
# 갱신 시뮬레이션 (실제 갱신 없이 테스트만)
sudo certbot renew --dry-run
```

- [ ] **[HIGH]** `--dry-run` 실행 시 `Congratulations, all simulated renewals succeeded` 메시지 출력
  - 기대: 오류 없이 시뮬레이션 완료
- [ ] **[NORMAL]** dry-run 완료 후 `/var/log/letsencrypt/letsencrypt.log`에 오류 로그 없음
  ```bash
  sudo tail -20 /var/log/letsencrypt/letsencrypt.log | grep -i error
  ```
  - 기대: error 라인 없음

---

## 섹션 4. 서비스 모니터링 검증

> Task 299 산출물 검증 -- 예상 소요: 15~20분

### 4-1. 모니터링 스크립트 존재 확인

```bash
# 스크립트 파일들 존재 확인
ls -la /home/ubuntu/scripts/monitor.sh
ls -la /home/ubuntu/scripts/weekly-report.sh
```

- [ ] **[CRITICAL]** `/home/ubuntu/scripts/monitor.sh` 존재 및 실행 권한 보유
- [ ] **[CRITICAL]** `/home/ubuntu/scripts/weekly-report.sh` 존재 및 실행 권한 보유

### 4-2. monitor.sh 수동 실행

```bash
bash /home/ubuntu/scripts/monitor.sh
```

- [ ] **[CRITICAL]** monitor.sh 실행 시 오류 없이 완료
- [ ] **[CRITICAL]** n8n (https://n8n.pressco21.com) 헬스체크 결과 정상 출력
  - 기대: `[OK] n8n 정상` 또는 유사 메시지
- [ ] **[CRITICAL]** NocoDB (https://nocodb.pressco21.com) 헬스체크 결과 정상 출력
  - 기대: `[OK] NocoDB 정상` 또는 유사 메시지
- [ ] **[HIGH]** Telegram 알림 발송 여부 로그 확인
  - 기대: 정상 상태이면 Telegram 메시지 미발송 (알림 없음이 정상)

### 4-3. 장애 시뮬레이션 -- nocodb 컨테이너 중단

> 주의: nocodb 중단 시 파트너 대시보드 기능이 일시 중단된다. 트래픽이 없는 시간대에 실행한다.

```bash
# Step 1: nocodb 컨테이너 중단
docker stop nocodb
echo "nocodb 중단 완료. monitor.sh 실행..."

# Step 2: monitor.sh 즉시 실행 (장애 감지 확인)
bash /home/ubuntu/scripts/monitor.sh

# Step 3: nocodb 재기동
docker start nocodb
echo "nocodb 재기동 완료"

# Step 4: 30초 대기 후 복구 확인
sleep 30
docker inspect nocodb --format='{{.State.Status}}'
```

- [ ] **[CRITICAL]** `docker stop nocodb` 후 monitor.sh 실행 시 장애 감지 메시지 출력
  - 기대: `[ERROR] NocoDB 응답 없음` 또는 유사 경고 메시지
- [ ] **[CRITICAL]** Telegram Chat ID `7713811206`으로 장애 알림 수신
  - 기대: "NocoDB 장애 감지" 또는 유사 메시지 텔레그램 수신
- [ ] **[CRITICAL]** `docker start nocodb` 후 컨테이너 `running` 상태 복구
  - 기대: `docker inspect nocodb --format='{{.State.Status}}'` → `running`
- [ ] **[HIGH]** 재기동 후 https://nocodb.pressco21.com HTTPS 응답 정상 복구
  ```bash
  curl -s -o /dev/null -w "%{http_code}" https://nocodb.pressco21.com
  ```
  - 기대: `200` 또는 `302`

### 4-4. crontab 15분 간격 등록 확인

```bash
crontab -l | grep monitor
```

- [ ] **[CRITICAL]** `*/15 * * * *` 패턴으로 `monitor.sh` crontab 등록 확인
  - 기대: `*/15 * * * * /home/ubuntu/scripts/monitor.sh` 또는 유사 라인

### 4-5. weekly-report.sh 수동 실행

```bash
bash /home/ubuntu/scripts/weekly-report.sh
```

- [ ] **[HIGH]** weekly-report.sh 실행 시 오류 없이 완료
- [ ] **[HIGH]** Telegram으로 주간 리포트 메시지 수신
  - 기대 포함 정보: 서버 가동시간, 컨테이너 상태, 디스크 사용량, 최근 1주 에러 건수 또는 유사 운영 지표
- [ ] **[NORMAL]** 주간 리포트 crontab 등록 확인
  ```bash
  crontab -l | grep weekly
  ```
  - 기대: 매주 월요일 09:00 KST (`0 0 * * 1` UTC 또는 `0 9 * * 1` KST) 패턴

---

## 섹션 5. NocoDB 관리 워크플로우 검증

> Task 300 산출물 검증 -- 예상 소요: 15~20분

### 5-1. WF-APPROVE 활성화 상태 확인

```bash
# n8n API로 WF-APPROVE 상태 확인
curl -s -H "X-N8N-API-KEY: [n8n_api_key]" \
  "https://n8n.pressco21.com/api/v1/workflows/u00ltxmpWR5Poz4J" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('name:', d.get('name'), '/ active:', d.get('active'))"
```

- [ ] **[CRITICAL]** WF-APPROVE (ID: `u00ltxmpWR5Poz4J`) `active: True` 확인
  - 기대: `name: WF-APPROVE NocoDB Auto Approve / active: True`

### 5-2. WF-APPROVE curl 직접 호출 테스트

WF-APPROVE는 NocoDB Webhook에서 자동 호출되지만, 직접 curl로도 테스트할 수 있다.
실제 파트너 신청 레코드와 유사한 데이터를 전송한다.

```bash
# 정상 케이스: status=approved 데이터로 호출
curl -s -X POST https://n8n.pressco21.com/webhook/nocodb-approve \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "rows": [{
        "member_id": "test_approve_001",
        "name": "테스트 승인 파트너",
        "studio_name": "테스트 공방",
        "email": "test-approve@pressco21.com",
        "phone": "01099998888",
        "location": "서울 마포",
        "specialty": "압화",
        "status": "approved"
      }]
    }
  }' | python3 -m json.tool 2>/dev/null
```

| 테스트 항목 | 명령 | 기대 결과 | 결과 | PASS |
|-----------|------|---------|------|------|
| status=approved 정상 처리 | 위 curl 명령 | `success:true` + tbl_Partners 신규 레코드 생성 | | ☐ |
| status=pending 스킵 처리 | `"status": "pending"` 으로 변경 후 호출 | `_skip: true, _skipReason 포함` | | ☐ |
| member_id 누락 | `member_id` 필드 제거 후 호출 | `_skip: true, member_id 누락 오류` | | ☐ |

- [ ] **[CRITICAL]** `status=approved` 호출 시 tbl_Partners에 신규 레코드 생성 확인
  - NocoDB GUI: https://nocodb.pressco21.com → tbl_Partners → `test_approve_001` 검색
- [ ] **[CRITICAL]** `status=pending` 호출 시 skip 처리 (tbl_Partners 레코드 미생성)
- [ ] **[HIGH]** 승인 처리 후 신청자 이메일로 승인 완료 메시지 발송 확인
  - 기대: `test-approve@pressco21.com`으로 이메일 발송 또는 WF-APPROVE 노드 로그에서 이메일 발송 노드 실행 확인

### 5-3. NocoDB Webhook 설정 가이드 (수동 작업 -- 관리자 필수)

> 이 단계는 NocoDB GUI에서 직접 수행해야 하는 수동 작업이다.
> WF-APPROVE가 자동으로 트리거되려면 NocoDB에서 Webhook을 등록해야 한다.

**설정 절차:**

1. https://nocodb.pressco21.com 에 접속하여 로그인
2. 좌측 사이드바에서 `tbl_Applications` 테이블 선택
3. 우측 상단 `...` 메뉴 → `Webhooks` 클릭
4. `+ New Webhook` 버튼 클릭
5. 아래 값으로 설정:
   - **Title**: `After Update → WF-APPROVE`
   - **Event**: `After Update`
   - **URL**: `https://n8n.pressco21.com/webhook/nocodb-approve`
   - **Method**: `POST`
6. `Save` 클릭
7. Webhook 목록에서 방금 생성한 항목의 토글이 활성화되어 있는지 확인

- [ ] **[CRITICAL]** tbl_Applications After Update Webhook 등록 완료
  - 검증: NocoDB GUI `tbl_Applications > Webhooks` 탭에서 등록된 Webhook 확인
- [ ] **[CRITICAL]** Webhook URL이 `https://n8n.pressco21.com/webhook/nocodb-approve`로 정확히 설정
- [ ] **[CRITICAL]** Webhook 토글 활성화 상태 확인

**등록 후 통합 테스트:**
```bash
# NocoDB GUI에서 직접 레코드 status를 approved로 변경 후
# WF-APPROVE가 자동 실행되는지 확인 (n8n Executions 탭)
```

- [ ] **[HIGH]** NocoDB GUI에서 tbl_Applications 레코드 status를 `approved`로 변경 시 WF-APPROVE 자동 실행 확인
  - n8n 대시보드 → Executions → WF-APPROVE 실행 기록 확인

### 5-4. NocoDB View 설정 가이드 (선택 사항 -- 관리자 권장)

> 운영 편의를 위한 Kanban/Gallery View 설정. 체크 완료 후 배포 가능 기준에 영향 없음.

**tbl_Applications Kanban View 설정:**

1. tbl_Applications 테이블 → 좌측 상단 `Grid View` 드롭다운 → `+ Create View`
2. `Kanban` 선택
3. **Stack by Field**: `status` 선택 (pending / approved / rejected 칼럼)
4. 뷰 이름: `파트너 신청 칸반`
5. `Save` 클릭

**tbl_Classes Gallery View 설정:**

1. tbl_Classes 테이블 → `+ Create View`
2. `Gallery` 선택
3. **Title Field**: `class_title` 선택
4. **Cover Image**: `image_urls` 선택 (있는 경우)
5. 뷰 이름: `클래스 갤러리`
6. `Save` 클릭

- [ ] **[NORMAL]** tbl_Applications Kanban View 생성 완료
- [ ] **[NORMAL]** tbl_Classes Gallery View 생성 완료

---

## 섹션 6. 수강 후기 기능 검증 (Task 301)

> Task 301 산출물 검증 -- 예상 소요: 15~20분

### 6-1. WF-15 n8n import 및 활성화

WF-15 JSON 파일이 `파트너클래스/n8n-workflows/` 폴더에 있어야 한다.
현재 확인된 파일 목록에 WF-15가 없으므로 Task 301 완료 후 아래 절차를 진행한다.

> 주의: 2026-02-26 기준, `파트너클래스/n8n-workflows/WF-15-review-submit.json` 파일이 아직 n8n에 임포트되지 않은 상태이다. 이 섹션은 임포트 완료 후 실행한다.

**임포트 절차:**
1. n8n 대시보드 접속: https://n8n.pressco21.com
2. 좌측 `Workflows` → 우측 상단 `+` → `Import from file`
3. `파트너클래스/n8n-workflows/WF-15-review-submit.json` 업로드
4. 임포트된 워크플로우에서 `Activate` 토글 ON

- [ ] **[CRITICAL]** `WF-15-review-submit.json` 파일이 로컬 저장소에 존재
  - 경로: `/Users/jangjiho/workspace/pressco21/파트너클래스/n8n-workflows/WF-15-review-submit.json`
- [ ] **[CRITICAL]** WF-15 n8n 임포트 완료 및 ACTIVE 상태 확인
  ```bash
  # 임포트 후 워크플로우 목록에서 WF-15 확인
  curl -s -H "X-N8N-API-KEY: [n8n_api_key]" \
    "https://n8n.pressco21.com/api/v1/workflows?limit=20" \
    | python3 -c "import sys,json; [print(w['name'], '/', w['active']) for w in json.load(sys.stdin)['data']]"
  ```
  - 기대: `WF-15 Review Submit / True` 라인 존재

### 6-2. 후기 작성 폼 UI 표시 확인

```bash
# Playwright MCP 또는 브라우저에서 직접 확인
# 상세 페이지: https://foreverlove.co.kr/shop/page.html?id=2607
```

**테스트 시나리오: active 파트너 계정 (`jihoo5755`)으로 로그인 후 상세 페이지 접속**

- [ ] **[CRITICAL]** 클래스 상세 페이지 (id=2607) 에서 후기 작성 섹션 표시 확인
  - 기대: "후기 작성" 폼 또는 버튼이 페이지 하단에 표시
- [ ] **[CRITICAL]** 후기 작성 폼에 별점 선택 UI 존재 (1~5점)
- [ ] **[CRITICAL]** 후기 작성 폼에 텍스트 입력 영역 존재
- [ ] **[HIGH]** 비로그인 상태에서 후기 작성 영역이 숨김 또는 "로그인이 필요합니다" 메시지 표시

### 6-3. 수강 이력 없는 회원 오류 처리 확인

```bash
# 수강 이력 없는 일반 회원으로 후기 작성 시도 (API 직접 테스트)
curl -s -X POST https://n8n.pressco21.com/webhook/review-submit \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": "CL_202602_001",
    "member_id": "no_booking_member",
    "rating": 5,
    "content": "테스트 후기 -- 수강 이력 없음"
  }' | python3 -m json.tool 2>/dev/null
```

- [ ] **[CRITICAL]** 수강 이력 없는 회원의 후기 작성 시도 시 에러 반환
  - 기대: `success: false` + `"NO_BOOKING"` 또는 유사 에러 코드

### 6-4. 중복 후기 방지 확인

```bash
# 동일 member_id + class_id 조합으로 2회 연속 후기 작성 시도
# 첫 번째 호출 (실제 수강 이력 있는 계정 사용)
curl -s -X POST https://n8n.pressco21.com/webhook/review-submit \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": "CL_202602_001",
    "member_id": "jihoo5755",
    "rating": 4,
    "content": "첫 번째 후기 -- 중복 방지 테스트"
  }' | python3 -m json.tool 2>/dev/null

# 두 번째 호출 (동일 계정/클래스)
curl -s -X POST https://n8n.pressco21.com/webhook/review-submit \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": "CL_202602_001",
    "member_id": "jihoo5755",
    "rating": 5,
    "content": "두 번째 후기 -- 이게 막혀야 함"
  }' | python3 -m json.tool 2>/dev/null
```

- [ ] **[CRITICAL]** 동일 member_id + class_id로 두 번째 후기 작성 시 에러 반환
  - 기대: `success: false` + `"DUPLICATE_REVIEW"` 또는 유사 에러 코드
- [ ] **[HIGH]** tbl_Reviews에 첫 번째 후기만 1건 저장 확인
  - NocoDB GUI: tbl_Reviews → `member_id = jihoo5755, class_id = CL_202602_001` 레코드 1건 확인

### 6-5. 후기 등록 성공 및 적립금 지급 확인

```bash
# 성공 케이스: 수강 이력 있는 계정으로 처음 후기 작성
# (위 6-4에서 첫 번째 호출이 성공한 경우 이 단계에서 추가 계정 사용)
curl -s -X POST https://n8n.pressco21.com/webhook/review-submit \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": "CL_202602_002",
    "member_id": "jihoo5755",
    "rating": 5,
    "content": "적립금 지급 확인 테스트 후기. 수업이 정말 좋았습니다!"
  }' | python3 -m json.tool 2>/dev/null
```

- [ ] **[CRITICAL]** 후기 등록 성공 시 `success: true` 반환
- [ ] **[CRITICAL]** tbl_Reviews에 후기 레코드 정상 저장
  - NocoDB GUI: tbl_Reviews → 방금 제출한 후기 레코드 존재 확인
  - 필드 확인: `rating`, `content`, `class_id`, `member_id`, `partner_code`, `reviewer_name`
- [ ] **[HIGH]** 후기 등록 후 메이크샵 적립금 지급 확인
  - 메이크샵 어드민 → 회원 관리 → `jihoo5755` 검색 → 적립금 변동 내역 확인
  - 기대: 후기 작성 적립금 지급 기록 존재 (금액은 tbl_Settings `review_reward_amount` 값)
- [ ] **[HIGH]** 클래스 상세 페이지 (id=2607)에서 등록된 후기 표시 확인
  - 기대: 후기 목록에 방금 작성한 내용과 별점이 표시

---

## 섹션 7. 수동 작업 완료 체크 (관리자 필수)

> 이 섹션의 항목들은 Claude Code가 자동으로 수행할 수 없으며, 관리자가 메이크샵 편집기 또는 n8n UI에서 직접 완료해야 한다.

### 7-1. 메이크샵 편집기 js.js 재저장

**필요한 이유**: 코드 내용은 변경되었지만 메이크샵 편집기에는 아직 이전 버전이 저장되어 있을 수 있다. 편집기에서 재저장해야 서버에 실제 반영된다.

**재저장 대상 4개 페이지:**

| 페이지 ID | 이름 | 재저장 이유 |
|----------|------|-----------|
| 2606 | 클래스 목록 | Task 261 UX 고도화 변경사항 |
| 2607 | 클래스 상세 | Task 262 UX 고도화 + Task 301 후기 폼 |
| 2609 | 파트너 신청 | Task 260/기타 변경사항 |
| 2610 | 파트너 교육 | WF-10 answers 배열 방식 연동 |

**재저장 절차:**
1. 메이크샵 어드민 로그인 → `디자인 편집` → 해당 페이지 ID 접속
2. `JS` 탭 클릭 → 내용 확인 (현재 저장된 코드와 최신 소스 코드 비교)
3. 로컬 최신 파일 내용을 복사하여 붙여넣기
4. `저장` 버튼 클릭 → `데이터 수정 완료` 메시지 확인

- [ ] **[CRITICAL]** 클래스 목록 페이지 (id=2606) js.js 최신 버전 재저장 완료
- [ ] **[CRITICAL]** 클래스 상세 페이지 (id=2607) js.js 최신 버전 재저장 완료
- [ ] **[CRITICAL]** 파트너 신청 페이지 (id=2609) js.js 최신 버전 재저장 완료
- [ ] **[CRITICAL]** 파트너 교육 페이지 (id=2610) js.js 최신 버전 재저장 완료

**재저장 후 검증:**
```
브라우저에서 각 페이지 접속 후 개발자 도구 → Console 탭 → 에러 없음 확인
```

- [ ] **[CRITICAL]** 4개 페이지 모두 Console 에러 없이 정상 로드

### 7-2. WF-10 answers 배열 방식 업데이트

**필요한 이유**: Task 결과로 WF-10이 `score/total` 파라미터 방식에서 `answers: [15개 정수 배열]` 방식으로 변경되었다. n8n에서 "Validate Input" 노드를 업데이트해야 한다.

**업데이트 방법 A -- JSON 재임포트 (권장):**
1. n8n 대시보드 → WF-10 Education Complete 워크플로우 열기
2. 우측 상단 `...` → `Import from file` 또는 `...` → 워크플로우 내 Import
3. `파트너클래스/n8n-workflows/WF-10-education-complete.json` 선택
4. 임포트 후 `Activate` 확인

**업데이트 방법 B -- 노드 직접 편집:**
1. n8n 대시보드 → WF-10 → "Validate Input" 노드 더블클릭
2. Code 내용에서 `score`, `total` 파라미터 파싱 로직을 `answers` 배열 파싱으로 교체
3. 저장 후 Activate

- [ ] **[CRITICAL]** WF-10 "Validate Input" 노드가 `answers` 배열 방식으로 업데이트 완료

**업데이트 후 검증:**
```bash
# answers 배열 방식으로 WF-10 직접 테스트
curl -s -X POST https://n8n.pressco21.com/webhook/education-complete \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": "test_edu_verify",
    "answers": [1, 2, 1, 3, 2, 1, 2, 3, 1, 2, 3, 1, 2, 1, 3]
  }' | python3 -m json.tool 2>/dev/null
```

- [ ] **[CRITICAL]** `answers` 배열 15개 전송 시 `success: true` + `score` 반환
  - 기대: `{"success": true, "data": {"score": N, "passed": true/false}}`

### 7-3. NocoDB tbl_Applications Webhook 설정

섹션 5-3에서 가이드한 수동 설정 완료 여부 재확인:

- [ ] **[CRITICAL]** NocoDB GUI에서 tbl_Applications After Update Webhook 설정 완료
  - URL: `https://n8n.pressco21.com/webhook/nocodb-approve`
  - 섹션 5-3 절차 완료 후 체크

### 7-4. WF-15 n8n import

섹션 6-1에서 확인한 WF-15 임포트 완료 여부:

- [ ] **[CRITICAL]** WF-15-review-submit.json n8n 임포트 완료
- [ ] **[CRITICAL]** WF-15 ACTIVE 상태 확인

---

## 섹션 8. Phase 2.6 완료 선언 기준

> 모든 선행 섹션이 완료된 후 최종 판정을 기록한다.

### 8-1. 필수 완료 항목 (ALL PASS 필요)

| 섹션 | 내용 | PASS 여부 |
|------|------|----------|
| 섹션 1 CRITICAL | Docker 3컨테이너 안정적 기동 + n8n-network 영구 연결 | ☐ |
| 섹션 2 CRITICAL | 백업 스크립트 정상 실행 + WF-BACKUP Telegram 알림 | ☐ |
| 섹션 3 CRITICAL | certbot.timer ACTIVE + 인증서 30일 이상 잔여 | ☐ |
| 섹션 4 CRITICAL | 장애 감지 Telegram 알림 + 자동 복구 확인 | ☐ |
| 섹션 5 CRITICAL | WF-APPROVE 동작 + NocoDB Webhook 등록 | ☐ |
| 섹션 6 CRITICAL | WF-15 ACTIVE + 후기 등록 + 중복 방지 | ☐ |
| 섹션 7 CRITICAL | 4개 페이지 js.js 재저장 + WF-10 업데이트 | ☐ |

### 8-2. 24시간 안정 운영 확인

배포 완료 후 24시간이 지난 시점에 아래 항목을 재확인한다.

```bash
# 24시간 후 컨테이너 상태 확인
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.RunningFor}}"

# 24시간 내 재시작 여부 확인 (Up Xh 패턴이 아닌 Up ~1 day 수준이어야 함)
# n8n 로그에서 에러 확인
docker logs n8n --since 24h 2>&1 | grep -c "ERROR\|CRITICAL\|Fatal"
```

- [ ] **[CRITICAL]** 24시간 후 3개 컨테이너 모두 재시작 없이 `Up ~1 day` 상태
- [ ] **[HIGH]** 24시간 내 n8n 로그에서 CRITICAL/Fatal 에러 0건
- [ ] **[HIGH]** 24시간 내 Telegram 으로 모니터링 장애 알림 0건 (정상 운영 상태)
- [ ] **[NORMAL]** 백업 cron 최초 실행 후 (다음날 새벽 3시) 백업 파일 생성 확인

### 8-3. Phase 2.6 최종 판정

| 판정 | 기준 |
|-----|------|
| PASS (Phase 2.6 완료 선언 가능) | 섹션 8-1 ALL PASS + 섹션 8-2 CRITICAL 항목 ALL PASS |
| 조건부 PASS (즉시 수정 계획 수립 후 운영 진행) | CRITICAL 0건 실패 + HIGH 1건 이하 실패 |
| FAIL (재작업 후 재검증 필요) | CRITICAL 1건 이상 실패 |

**최종 판정 기록:**

- 테스트 날짜: _______________
- 테스트 담당자: _______________
- CRITICAL 실패 건수: ___ / 전체 CRITICAL 건수
- HIGH 실패 건수: ___ / 전체 HIGH 건수
- 최종 판정: [ ] PASS / [ ] 조건부 PASS / [ ] FAIL
- 비고 (실패 항목 기록):

---

## 부록 A. 자주 발생하는 오류 및 해결책

| 오류 상황 | 원인 | 해결책 |
|---------|------|--------|
| `nocodb` 컨테이너가 n8n-network에 없음 | docker-compose.yml 네트워크 설정 누락 | `docker compose down && docker compose up -d` |
| certbot dry-run 실패 | nginx 설정 오류 또는 도메인 DNS 문제 | `sudo nginx -t` 로 nginx 설정 검증 후 재시도 |
| WF-BACKUP webhook 404 | WF-BACKUP 워크플로우가 비활성화됨 | n8n 대시보드에서 WF-BACKUP 활성화 |
| 백업 파일 크기 0 | docker volume 마운트 경로 오류 | `docker volume ls` 로 볼륨 확인 후 스크립트 경로 수정 |
| WF-APPROVE skip 반복 | NocoDB Webhook 이벤트 타입 불일치 | NocoDB Webhook에서 `After Update` 이벤트 선택 확인 |
| WF-15 webhook 404 | WF-15 미임포트 또는 비활성화 | n8n에서 WF-15 임포트 후 활성화 |

## 부록 B. 체크리스트 항목 수 요약

| 섹션 | CRITICAL | HIGH | NORMAL | 합계 |
|------|----------|------|--------|------|
| 섹션 1. Docker 안정성 | 8 | 2 | 2 | 12 |
| 섹션 2. 백업 자동화 | 5 | 2 | 1 | 8 |
| 섹션 3. SSL 자동갱신 | 2 | 1 | 2 | 5 |
| 섹션 4. 모니터링 | 5 | 2 | 1 | 8 |
| 섹션 5. NocoDB 관리 | 5 | 2 | 2 | 9 |
| 섹션 6. 수강 후기 기능 | 5 | 3 | 0 | 8 |
| 섹션 7. 수동 작업 | 8 | 0 | 0 | 8 |
| 섹션 8. 완료 선언 | 3 | 2 | 1 | 6 |
| **합계** | **41** | **14** | **9** | **64** |
