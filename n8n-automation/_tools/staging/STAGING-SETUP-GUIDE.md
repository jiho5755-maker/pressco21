# n8n Staging 환경 구축 가이드

## 개요

- **URL**: https://n8n-staging.pressco21.com
- **포트**: 5679 (Nginx 뒤에서 실행, 외부 직접 노출 안 됨)
- **DB**: 운영 PostgreSQL과 완전 분리된 독립 컨테이너
- **restart policy**: `unless-stopped` (운영은 `always` — 서버 재시작 시 Staging은 수동으로 올려야 함)

---

## 사전 조건

### DNS 설정 (먼저!)
DNS 제공업체(Cloudflare 등)에서 A 레코드 추가:
```
n8n-staging.pressco21.com → 158.180.77.201
```
DNS 전파까지 최대 24시간 소요. certbot 실행 전에 반드시 확인:
```bash
nslookup n8n-staging.pressco21.com
# 158.180.77.201 응답 확인 후 진행
```

---

## 구축 순서

### Step 1. 서버 SSH 접속
```bash
ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201
```

### Step 2. Swap 4GB 추가 (권장)
현재 Swap 0 → 메모리 부족 시 OOM 방지:
```bash
# 현재 Swap 확인
free -h

# Swap 추가
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 재부팅 후에도 유지
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 확인
free -h
```

### Step 3. Staging 디렉토리 생성
```bash
mkdir -p /home/ubuntu/n8n-staging
cd /home/ubuntu/n8n-staging
```

### Step 4. 파일 복사 (로컬에서 서버로)
```bash
# 로컬에서 실행 (새 터미널)
scp -i ~/.ssh/oracle-n8n.key \
  /Users/jangjiho/Desktop/n8n-main/pressco21/_tools/staging/docker-compose.yml \
  ubuntu@158.180.77.201:/home/ubuntu/n8n-staging/

scp -i ~/.ssh/oracle-n8n.key \
  /Users/jangjiho/Desktop/n8n-main/pressco21/_tools/staging/nginx-staging.conf \
  ubuntu@158.180.77.201:/tmp/n8n-staging-nginx.conf
```

### Step 5. 환경 변수 파일 생성
```bash
# 서버에서 실행
cd /home/ubuntu/n8n-staging
nano .env
```

`.env` 내용:
```
N8N_ENCRYPTION_KEY_STAGING=<openssl rand -hex 32 으로 생성한 32바이트 키>
POSTGRES_STAGING_PASSWORD=<강력한 비밀번호>
```

⚠️ **운영 N8N_ENCRYPTION_KEY와 다른 값 사용** (격리 보장)

### Step 6. Nginx 설정
```bash
# 서버에서 실행
sudo cp /tmp/n8n-staging-nginx.conf /etc/nginx/sites-available/n8n-staging
sudo ln -s /etc/nginx/sites-available/n8n-staging /etc/nginx/sites-enabled/
sudo nginx -t  # 오류 없음 확인 후 진행!
sudo systemctl reload nginx
```

### Step 7. SSL 인증서 발급
```bash
sudo certbot --nginx -d n8n-staging.pressco21.com
```

### Step 8. Staging 컨테이너 시작
```bash
cd /home/ubuntu/n8n-staging
docker compose up -d

# 상태 확인
docker compose ps
docker compose logs -f n8n-staging
```

### Step 9. 정상 동작 확인
```bash
# 운영 n8n 확인 (영향 없어야 함)
curl -s https://n8n.pressco21.com/healthz
# → {"status":"ok"}

# Staging n8n 확인
curl -s https://n8n-staging.pressco21.com/healthz
# → {"status":"ok"}
```

---

## 자주 쓰는 명령어

```bash
# Staging 시작
cd /home/ubuntu/n8n-staging && docker compose up -d

# Staging 중지
cd /home/ubuntu/n8n-staging && docker compose down

# 로그 보기
cd /home/ubuntu/n8n-staging && docker compose logs -f n8n-staging

# 재시작
cd /home/ubuntu/n8n-staging && docker compose restart n8n-staging

# 메모리 사용량 확인
free -h
docker stats --no-stream
```

---

## 운영 격리 보장 사항

| 항목 | 운영 | Staging |
|------|------|---------|
| PostgreSQL DB | n8n (별도 컨테이너) | n8n_staging (별도 컨테이너) |
| Docker 네트워크 | n8n-network | n8n-staging-network |
| 암호화 키 | N8N_ENCRYPTION_KEY | N8N_ENCRYPTION_KEY_STAGING (다른 값) |
| 포트 | 127.0.0.1:5678 | 127.0.0.1:5679 |
| restart policy | always | unless-stopped |
| 메모리 | --max-old-space-size=4096 | --max-old-space-size=2048 |

---

## 롤백 (Staging 제거)

```bash
cd /home/ubuntu/n8n-staging
docker compose down -v  # 볼륨도 삭제

# Nginx 설정 제거
sudo rm /etc/nginx/sites-enabled/n8n-staging
sudo systemctl reload nginx
```
