#!/bin/bash
# Flora 미니앱 v2를 플로라 서버에 배포
# 용도: mini-app-v2/dist/ → 플로라 /var/www/mini-pressco21/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REMOTE_HOST="openclaw"
REMOTE_DIR="/var/www/mini-pressco21"

echo "[mini-app-v2] 빌드 중..."
cd "$ROOT_DIR"
npm run build

echo "[mini-app-v2] 플로라 서버 배포 시작 → ${REMOTE_HOST}:${REMOTE_DIR}"

# 디렉토리 생성
ssh -o ConnectTimeout=10 "$REMOTE_HOST" "sudo mkdir -p '$REMOTE_DIR' && sudo chown ubuntu:ubuntu '$REMOTE_DIR'"

# 빌드 산출물 동기화
rsync -avz --delete \
    "$ROOT_DIR/dist/" "${REMOTE_HOST}:${REMOTE_DIR}/"

echo "[mini-app-v2] 배포 완료!"
echo "확인: https://mini.pressco21.com"
