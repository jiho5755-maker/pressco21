#!/bin/bash
# Flora 미니앱을 플로라 서버에 배포
# 용도: pressco21/mini-app/ → 플로라 /var/www/mini-pressco21/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REMOTE_HOST="openclaw"
REMOTE_DIR="/var/www/mini-pressco21"

echo "[mini-app] 플로라 서버 배포 시작 → ${REMOTE_HOST}:${REMOTE_DIR}"

# 디렉토리 생성
ssh -o ConnectTimeout=10 "$REMOTE_HOST" "sudo mkdir -p '$REMOTE_DIR' && sudo chown ubuntu:ubuntu '$REMOTE_DIR'"

# 정적 파일 동기화
rsync -avz --delete \
    --exclude='scripts/' \
    --exclude='.DS_Store' \
    --exclude='*.md' \
    "$ROOT_DIR/" "${REMOTE_HOST}:${REMOTE_DIR}/"

echo "[mini-app] 배포 완료!"
echo ""
echo "확인: https://mini.pressco21.com"
echo "(DNS 미설정 시: curl -H 'Host: mini.pressco21.com' https://158.179.193.173/)"
