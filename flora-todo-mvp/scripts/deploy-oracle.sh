#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_HOST="${ORACLE_SSH_HOST:-ubuntu@158.180.77.201}"
REMOTE_KEY="${ORACLE_SSH_KEY:-$HOME/.ssh/oracle-n8n.key}"
REMOTE_DIR="${REMOTE_FLORA_DIR:-/home/ubuntu/flora-todo-mvp}"

echo "[flora] sync -> ${REMOTE_HOST}:${REMOTE_DIR}"
ssh -i "$REMOTE_KEY" -o ConnectTimeout=10 "$REMOTE_HOST" "mkdir -p '$REMOTE_DIR'"

rsync -az --delete \
  -e "ssh -i $REMOTE_KEY -o ConnectTimeout=10" \
  --exclude ".git" \
  --exclude ".next" \
  --exclude "node_modules" \
  --exclude ".env" \
  --exclude ".env.oracle" \
  --exclude "output" \
  --exclude "test-results" \
  "$ROOT_DIR/" "${REMOTE_HOST}:${REMOTE_DIR}/"

ssh -i "$REMOTE_KEY" -o ConnectTimeout=10 "$REMOTE_HOST" "bash -s" <<'EOS'
set -euo pipefail

REMOTE_DIR="${REMOTE_FLORA_DIR:-/home/ubuntu/flora-todo-mvp}"
cd "$REMOTE_DIR"

if [ ! -f .env.oracle ]; then
  ADMIN_API_TOKEN="$(docker inspect n8n --format '{{range .Config.Env}}{{println .}}{{end}}' | awk -F= '/^ADMIN_API_TOKEN=/{print substr($0, index($0, "=") + 1); exit}')"
  POSTGRES_PASSWORD="$(openssl rand -hex 24)"

  cat > .env.oracle <<EOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
APP_TIMEZONE=Asia/Seoul
AUTOMATION_API_KEY=${ADMIN_API_TOKEN}
EOF
fi

docker compose -f docker-compose.oracle.yml --env-file .env.oracle up -d --build
EOS

echo "[flora] deployed"
