# Flora-todo-mvp 서버 이전 가이드

## 개요

flora-todo-mvp를 본진(158.180.77.201) → 플로라 서버(158.179.193.173)로 이전

## 이전 전 확인

- [ ] 플로라 서버 Docker 설치 확인
- [ ] 플로라 서버 디스크 여유 확인 (최소 5GB)
- [ ] 본진 DB 백업 완료

## 단계별 실행

### 1단계: DB 백업 (본진)

```bash
ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201

# flora-todo-mvp postgres 컨테이너에서 dump
docker exec flora-todo-mvp-postgres pg_dump -U postgres flora_todo_mvp > /tmp/flora_todo_mvp_backup.sql
```

### 2단계: 코드 배포 (로컬 → 플로라)

```bash
cd flora-todo-mvp
bash scripts/deploy-flora.sh
```

### 3단계: DB 복원 (플로라)

```bash
# 본진 → 플로라로 dump 전송
scp -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201:/tmp/flora_todo_mvp_backup.sql /tmp/
scp -i ~/.ssh/oracle-openclaw.key /tmp/flora_todo_mvp_backup.sql ubuntu@158.179.193.173:/tmp/

# 플로라에서 복원
ssh -i ~/.ssh/oracle-openclaw.key ubuntu@158.179.193.173
docker exec -i flora-todo-mvp-postgres psql -U postgres flora_todo_mvp < /tmp/flora_todo_mvp_backup.sql
```

### 4단계: Nginx 설정 (플로라)

```nginx
# /etc/nginx/sites-available/flora-todo-mvp
server {
    listen 80;
    server_name flora-api.pressco21.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/flora-todo-mvp /etc/nginx/sites-enabled/
sudo certbot --nginx -d flora-api.pressco21.com
sudo nginx -t && sudo systemctl reload nginx
```

### 5단계: n8n URL 업데이트

본진 n8n에서 flora-todo-mvp 호출 URL 변경:
- 기존: `http://flora-todo-mvp:3000/api/...`
- 신규: `https://flora-api.pressco21.com/api/...` 또는 내부 IP `http://158.179.193.173:3001/api/...`

### 6단계: 본진 정리

```bash
ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201
cd /home/ubuntu/flora-todo-mvp
docker compose -f docker-compose.oracle.yml --env-file .env.oracle down
# 볼륨은 백업 확인 후 삭제: docker volume rm flora-todo-mvp_flora_todo_mvp_postgres
```

## hwpx-service 삭제

```bash
ssh -i ~/.ssh/oracle-n8n.key ubuntu@158.180.77.201
docker stop hwpx-service && docker rm hwpx-service
docker rmi hwpx-service-image  # 이미지명 확인 후 삭제
# RAM 106MB 확보 예상
```

## 검증

```bash
# 플로라 서버 API 테스트
curl -H "x-flora-automation-key: YOUR_KEY" https://flora-api.pressco21.com/api/automation/briefings/morning
```
