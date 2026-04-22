#!/bin/bash
# PRESSCO21 CRM v2 배포 스크립트
# 사용법: cd offline-crm-v2 && bash deploy/deploy.sh
# 빌드 + 서버 업로드를 한 번에 처리

set -e

# ── 설정 ──
SERVER="ubuntu@158.180.77.201"
SSH_KEY="$HOME/.ssh/oracle-n8n.key"
REMOTE_DIR="/var/www/crm"
REMOTE_AUTH_ROOT="/opt/pressco21/crm-auth"
REMOTE_AUTH_SCRIPT="${REMOTE_AUTH_ROOT}/crm_auth_server.py"
REMOTE_AUTH_SERVICE="/etc/systemd/system/crm-auth.service"
REMOTE_AUTH_SECRET_FILE="/etc/pressco21-crm/auth-secret"
REMOTE_AUTH_AUTOMATION_KEY_FILE="/etc/pressco21-crm/automation-key"
REMOTE_NGINX_CONFIG="/etc/nginx/sites-available/crm"
REMOTE_UPLOAD_DIR="/tmp/pressco21-crm-deploy"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
WORKTREE_ROOT="$(dirname "$PROJECT_DIR")"
DEFAULT_MAIN_ROOT="$HOME/workspace/pressco21"
SECRETS_FILE=""

if [ -f "$WORKTREE_ROOT/.secrets.env" ]; then
  SECRETS_FILE="$WORKTREE_ROOT/.secrets.env"
elif [ -f "$DEFAULT_MAIN_ROOT/.secrets.env" ]; then
  SECRETS_FILE="$DEFAULT_MAIN_ROOT/.secrets.env"
fi

if [ -n "$SECRETS_FILE" ]; then
  # 쉘에 안전하게 export만 하고 파일은 수정하지 않는다.
  set -a
  # shellcheck disable=SC1090
  . "$SECRETS_FILE"
  set +a
fi

if [ -z "${VITE_CRM_API_KEY:-}" ] && [ -n "${CRM_API_KEY:-}" ]; then
  export VITE_CRM_API_KEY="$CRM_API_KEY"
fi

if [ -z "${VITE_CRM_API_KEY:-}" ]; then
  echo "오류: VITE_CRM_API_KEY(또는 CRM_API_KEY)를 찾지 못했습니다." >&2
  echo "확인한 파일: ${SECRETS_FILE:-없음}" >&2
  exit 1
fi

echo "=== PRESSCO21 CRM v2 배포 시작 ==="

# 1. 프로덕션 빌드
echo "1/4 빌드 중..."
cd "$PROJECT_DIR"
NODE_ENV=production npm run build

echo "빌드 완료"

# 2. 기존 파일 정리 + 업로드
echo "2/4 서버 업로드 중..."
ssh -i "$SSH_KEY" "$SERVER" "bash -s" <<EOF
set -euo pipefail

rm -rf "$REMOTE_DIR"/* 2>/dev/null || true
mkdir -p "$REMOTE_DIR"
sudo mkdir -p "$REMOTE_AUTH_ROOT" "$(dirname "$REMOTE_AUTH_SECRET_FILE")" "$REMOTE_UPLOAD_DIR"
sudo chown -R ubuntu:ubuntu "$REMOTE_AUTH_ROOT" "$REMOTE_UPLOAD_DIR"
rm -rf "$REMOTE_UPLOAD_DIR"/*
EOF
scp -i "$SSH_KEY" -r "$PROJECT_DIR/dist/"* "$SERVER:$REMOTE_DIR/"
scp -i "$SSH_KEY" "$PROJECT_DIR/scripts/server/crm_auth_server.py" "$SERVER:$REMOTE_UPLOAD_DIR/crm_auth_server.py"
scp -i "$SSH_KEY" "$PROJECT_DIR/deploy/crm-auth.service" "$SERVER:$REMOTE_UPLOAD_DIR/crm-auth.service"
scp -i "$SSH_KEY" "$PROJECT_DIR/deploy/nginx-crm-secure.conf" "$SERVER:$REMOTE_UPLOAD_DIR/nginx-crm-secure.conf"

echo "업로드 완료"

# 3. 인증 서비스 + Nginx 설정 반영
echo "3/4 Nginx 확인..."
ssh -i "$SSH_KEY" "$SERVER" "bash -s" <<EOF
set -euo pipefail

sudo install -m 755 "$REMOTE_UPLOAD_DIR/crm_auth_server.py" "$REMOTE_AUTH_SCRIPT"
sudo install -m 644 "$REMOTE_UPLOAD_DIR/crm-auth.service" "$REMOTE_AUTH_SERVICE"
sudo install -m 644 "$REMOTE_UPLOAD_DIR/nginx-crm-secure.conf" "$REMOTE_NGINX_CONFIG"

if [ ! -f "$REMOTE_AUTH_SECRET_FILE" ]; then
  sudo python3 - <<'PY'
from pathlib import Path
import secrets

target = Path("/etc/pressco21-crm/auth-secret")
target.parent.mkdir(parents=True, exist_ok=True)
target.write_bytes(secrets.token_bytes(32))
target.chmod(0o600)
PY
fi

if [ ! -f "$REMOTE_AUTH_AUTOMATION_KEY_FILE" ]; then
  sudo python3 - <<'PY'
from pathlib import Path
import secrets

target = Path("/etc/pressco21-crm/automation-key")
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(secrets.token_urlsafe(48), encoding="utf-8")
target.chmod(0o600)
PY
fi

sudo chown root:root "$REMOTE_AUTH_SCRIPT" "$REMOTE_AUTH_SERVICE" "$REMOTE_NGINX_CONFIG" "$REMOTE_AUTH_SECRET_FILE" "$REMOTE_AUTH_AUTOMATION_KEY_FILE"
sudo chmod 755 "$REMOTE_AUTH_SCRIPT"
sudo chmod 644 "$REMOTE_AUTH_SERVICE" "$REMOTE_NGINX_CONFIG"
sudo chmod 600 "$REMOTE_AUTH_SECRET_FILE" "$REMOTE_AUTH_AUTOMATION_KEY_FILE"
sudo systemctl daemon-reload
sudo systemctl enable crm-auth.service >/dev/null
sudo systemctl restart crm-auth.service
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS http://127.0.0.1:9100/health >/dev/null; then
    break
  fi
  sleep 1
done
curl -fsS http://127.0.0.1:9100/health >/dev/null
EOF

# 4. Nginx 재로드
echo "4/4 Nginx 재로드..."
ssh -i "$SSH_KEY" "$SERVER" "sudo nginx -t && sudo systemctl reload nginx"

echo ""
echo "=== 배포 완료! ==="
echo "https://crm.pressco21.com"
