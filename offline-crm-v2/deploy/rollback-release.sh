#!/bin/bash
# PRESSCO21 CRM v2 릴리스 롤백 스크립트
# 사용법: cd offline-crm-v2 && bash deploy/rollback-release.sh <release-id>

set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "사용법: bash deploy/rollback-release.sh <release-id>"
  exit 1
fi

RELEASE_ID="$1"
SERVER="ubuntu@158.180.77.201"
SSH_KEY="$HOME/.ssh/oracle-n8n.key"
REMOTE_RELEASE_ROOT="/var/www/releases/crm"
REMOTE_CURRENT_LINK="/var/www/crm-current"
REMOTE_PUBLIC_LINK="/var/www/crm"
REMOTE_RELEASE_DIR="${REMOTE_RELEASE_ROOT}/${RELEASE_ID}"

echo "=== PRESSCO21 CRM v2 릴리스 롤백 시작 ==="
echo "Target Release: ${RELEASE_ID}"

ssh -i "$SSH_KEY" "$SERVER" "bash -s" <<EOF
set -euo pipefail

if [ ! -d "$REMOTE_RELEASE_DIR" ]; then
  echo "릴리스가 존재하지 않습니다: $REMOTE_RELEASE_DIR"
  exit 1
fi

sudo ln -sfn "$REMOTE_RELEASE_DIR" "$REMOTE_CURRENT_LINK"
sudo ln -sfn "$REMOTE_RELEASE_DIR" "$REMOTE_PUBLIC_LINK"

sudo nginx -t
sudo systemctl reload nginx
EOF

echo ""
echo "=== 롤백 완료 ==="
echo "운영 URL: https://crm.pressco21.com"
echo "현재 릴리스: ${RELEASE_ID}"
