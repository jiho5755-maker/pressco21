#!/bin/bash
# flora-todo-mvp를 플로라 서버(158.179.193.173)에 배포
# 용도: 본진 서버 부하 분산 — flora-todo-mvp를 플로라 서버로 이전

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_HOST="${FLORA_SSH_HOST:-ubuntu@158.179.193.173}"
REMOTE_KEY="${FLORA_SSH_KEY:-$HOME/.ssh/oracle-openclaw.key}"
REMOTE_DIR="${REMOTE_FLORA_DIR:-/home/ubuntu/flora-todo-mvp}"

echo "[flora] 플로라 서버 배포 시작 → ${REMOTE_HOST}:${REMOTE_DIR}"

# 1. 디렉토리 생성
ssh -i "$REMOTE_KEY" -o ConnectTimeout=10 "$REMOTE_HOST" "mkdir -p '$REMOTE_DIR'"

# 2. 코드 동기화
rsync -az --delete \
  -e "ssh -i $REMOTE_KEY -o ConnectTimeout=10" \
  --exclude ".git" \
  --exclude ".next" \
  --exclude "node_modules" \
  --exclude ".env" \
  --exclude ".env.oracle" \
  --exclude ".env.flora" \
  --exclude "output" \
  --exclude "test-results" \
  "$ROOT_DIR/" "${REMOTE_HOST}:${REMOTE_DIR}/"

# 3. 원격 서버에서 빌드 + 실행
ssh -i "$REMOTE_KEY" -o ConnectTimeout=10 "$REMOTE_HOST" "bash -s" <<'EOS'
set -euo pipefail

REMOTE_DIR="${REMOTE_FLORA_DIR:-/home/ubuntu/flora-todo-mvp}"
cd "$REMOTE_DIR"

# .env.flora 없으면 생성
if [ ! -f .env.flora ]; then
  POSTGRES_PASSWORD="$(openssl rand -hex 24)"
  AUTOMATION_API_KEY="$(openssl rand -hex 16)"

  cat > .env.flora <<EOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
APP_TIMEZONE=Asia/Seoul
AUTOMATION_API_KEY=${AUTOMATION_API_KEY}
EOF

  echo "[flora] .env.flora 생성됨 — AUTOMATION_API_KEY를 n8n 환경변수에 추가하세요"
fi

docker compose -f docker-compose.flora.yml --env-file .env.flora up -d --build
EOS

echo "[flora] 플로라 서버 배포 완료"
echo ""
echo "중요 후속 작업:"
echo "  1. 플로라 서버 Nginx에 리버스 프록시 추가 (127.0.0.1:3001)"
echo "  2. 본진 n8n에서 flora-todo-mvp URL을 플로라 서버 IP로 변경"
echo "  3. 본진 서버의 flora-todo-mvp 컨테이너 중지"
echo "  4. DB 마이그레이션: 본진 PG → 플로라 PG (pg_dump/pg_restore)"
