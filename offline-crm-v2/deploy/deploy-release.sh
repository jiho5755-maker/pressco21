#!/bin/bash
# PRESSCO21 CRM v2 릴리스형 배포 스크립트
# 사용법: cd offline-crm-v2 && bash deploy/deploy-release.sh

set -euo pipefail

SERVER="ubuntu@158.180.77.201"
SSH_KEY="$HOME/.ssh/oracle-n8n.key"
REMOTE_RELEASE_ROOT="/var/www/releases/crm"
REMOTE_CURRENT_LINK="/var/www/crm-current"
REMOTE_PUBLIC_LINK="/var/www/crm"
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
NODE_ENV=production npm run build
echo "빌드 완료"

echo "2/5 서버 릴리스 경로 준비 중..."
ssh -i "$SSH_KEY" "$SERVER" "bash -s" <<EOF
set -euo pipefail

sudo mkdir -p "$REMOTE_RELEASE_ROOT"
sudo chown -R ubuntu:ubuntu /var/www/releases

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
EOF
echo "서버 준비 완료"

echo "3/5 릴리스 업로드 중..."
scp -i "$SSH_KEY" -r "$PROJECT_DIR/dist/"* "$SERVER:$REMOTE_RELEASE_DIR/"
echo "업로드 완료"

echo "4/5 현재 릴리스 전환 중..."
ssh -i "$SSH_KEY" "$SERVER" "bash -s" <<EOF
set -euo pipefail

sudo ln -sfn "$REMOTE_RELEASE_DIR" "$REMOTE_CURRENT_LINK"
sudo ln -sfn "$REMOTE_RELEASE_DIR" "$REMOTE_PUBLIC_LINK"

if [ ! -f /etc/nginx/sites-available/crm ]; then
  echo 'Nginx 설정 없음 - 수동 설정이 필요합니다'
  exit 1
fi

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
