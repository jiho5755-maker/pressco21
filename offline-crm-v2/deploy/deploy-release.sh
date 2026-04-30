#!/bin/bash
# PRESSCO21 CRM v2 릴리스형 배포 스크립트
# 사용법: cd offline-crm-v2 && bash deploy/deploy-release.sh

set -euo pipefail

SERVER="ubuntu@158.180.77.201"
SSH_KEY="$HOME/.ssh/oracle-n8n.key"
REMOTE_RELEASE_ROOT="/var/www/releases/crm"
REMOTE_CURRENT_LINK="/var/www/crm-current"
REMOTE_PUBLIC_LINK="/var/www/crm"
REMOTE_AUTH_ROOT="/opt/pressco21/crm-auth"
REMOTE_AUTH_SCRIPT="${REMOTE_AUTH_ROOT}/crm_auth_server.py"
REMOTE_AUTH_SERVICE="/etc/systemd/system/crm-auth.service"
REMOTE_AUTH_SECRET_FILE="/etc/pressco21-crm/auth-secret"
REMOTE_AUTH_AUTOMATION_KEY_FILE="/etc/pressco21-crm/automation-key"
REMOTE_NGINX_CONFIG="/etc/nginx/sites-available/crm"
REMOTE_UPLOAD_DIR="/tmp/pressco21-crm-deploy"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TIMESTAMP="$(date +%Y%m%d%H%M%S)"
GIT_SHA="$(git -C "$PROJECT_DIR" rev-parse --short HEAD)"
DIRTY_SUFFIX=""
if [ -n "$(git -C "$PROJECT_DIR" status --porcelain --untracked-files=no)" ]; then
  DIRTY_SUFFIX="-dirty"
fi
RELEASE_ID="${TIMESTAMP}-${GIT_SHA}${DIRTY_SUFFIX}"
REMOTE_RELEASE_DIR="${REMOTE_RELEASE_ROOT}/${RELEASE_ID}"

echo "=== PRESSCO21 CRM v2 릴리스 배포 시작 ==="
echo "Release ID: ${RELEASE_ID}"

echo "1/5 빌드 중..."
cd "$PROJECT_DIR"
VITE_BAROBILL_TAX_INVOICE_MODE="${VITE_BAROBILL_TAX_INVOICE_MODE:-production}"
VITE_BAROBILL_ALLOW_PRODUCTION_ISSUE="${VITE_BAROBILL_ALLOW_PRODUCTION_ISSUE:-true}"
export VITE_BAROBILL_TAX_INVOICE_MODE VITE_BAROBILL_ALLOW_PRODUCTION_ISSUE
echo "바로빌 발급 모드: ${VITE_BAROBILL_TAX_INVOICE_MODE}"
NODE_ENV=production npm run build
echo "빌드 완료"

echo "2/5 서버 릴리스 경로 및 인증 서비스 준비 중..."
ssh -i "$SSH_KEY" "$SERVER" "bash -s" <<EOF
set -euo pipefail

sudo mkdir -p "$REMOTE_RELEASE_ROOT"
sudo mkdir -p "$REMOTE_AUTH_ROOT"
sudo mkdir -p "$(dirname "$REMOTE_AUTH_SECRET_FILE")"
sudo mkdir -p "$REMOTE_UPLOAD_DIR"
sudo chown -R ubuntu:ubuntu /var/www/releases
sudo chown -R ubuntu:ubuntu "$REMOTE_AUTH_ROOT"
sudo chown -R ubuntu:ubuntu "$REMOTE_UPLOAD_DIR"

if [ -d "$REMOTE_PUBLIC_LINK" ] && [ ! -L "$REMOTE_PUBLIC_LINK" ]; then
  LEGACY_RELEASE="${REMOTE_RELEASE_ROOT}/legacy-${TIMESTAMP}"
  mkdir -p "\$LEGACY_RELEASE"
  cp -a "$REMOTE_PUBLIC_LINK"/. "\$LEGACY_RELEASE"/
  sudo rm -rf "$REMOTE_PUBLIC_LINK"
  sudo ln -sfn "\$LEGACY_RELEASE" "$REMOTE_PUBLIC_LINK"
  sudo ln -sfn "\$LEGACY_RELEASE" "$REMOTE_CURRENT_LINK"
fi

mkdir -p "$REMOTE_RELEASE_DIR"
rm -rf "$REMOTE_RELEASE_DIR"/*
rm -rf "$REMOTE_UPLOAD_DIR"/*
EOF
echo "서버 준비 완료"

echo "3/5 릴리스 및 인증 서비스 업로드 중..."
scp -i "$SSH_KEY" -r "$PROJECT_DIR/dist/"* "$SERVER:$REMOTE_RELEASE_DIR/"
scp -i "$SSH_KEY" "$PROJECT_DIR/scripts/server/crm_auth_server.py" "$SERVER:$REMOTE_UPLOAD_DIR/crm_auth_server.py"
scp -i "$SSH_KEY" "$PROJECT_DIR/deploy/crm-auth.service" "$SERVER:$REMOTE_UPLOAD_DIR/crm-auth.service"
scp -i "$SSH_KEY" "$PROJECT_DIR/deploy/nginx-crm-secure.conf" "$SERVER:$REMOTE_UPLOAD_DIR/nginx-crm-secure.conf"
echo "업로드 완료"

echo "4/5 현재 릴리스 및 인증 설정 전환 중..."
ssh -i "$SSH_KEY" "$SERVER" "bash -s" <<EOF
set -euo pipefail

sudo ln -sfn "$REMOTE_RELEASE_DIR" "$REMOTE_CURRENT_LINK"
sudo ln -sfn "$REMOTE_RELEASE_DIR" "$REMOTE_PUBLIC_LINK"

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

sudo nginx -t
sudo systemctl reload nginx
EOF
echo "릴리스 전환 완료"

echo "5/5 배포 결과 출력"
echo ""
echo "=== 릴리스 배포 완료 ==="
echo "운영 URL: https://crm.pressco21.com"
echo "Release ID: ${RELEASE_ID}"
echo "현재 릴리스 링크: ${REMOTE_CURRENT_LINK}"
echo "롤백 명령: bash deploy/rollback-release.sh ${RELEASE_ID}"
