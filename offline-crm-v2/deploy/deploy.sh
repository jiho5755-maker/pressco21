#!/bin/bash
# PRESSCO21 CRM v2 배포 스크립트
# 사용법: cd offline-crm-v2 && bash deploy/deploy.sh
# 빌드 + 서버 업로드를 한 번에 처리

set -e

# ── 설정 ──
SERVER="ubuntu@158.180.77.201"
SSH_KEY="$HOME/.ssh/oracle-n8n.key"
REMOTE_DIR="/var/www/crm"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== PRESSCO21 CRM v2 배포 시작 ==="

# 1. 프로덕션 빌드
echo "1/4 빌드 중..."
cd "$PROJECT_DIR"
NODE_ENV=production npm run build

echo "빌드 완료"

# 2. 기존 파일 정리 + 업로드
echo "2/4 서버 업로드 중..."
ssh -i "$SSH_KEY" "$SERVER" "rm -rf $REMOTE_DIR/* 2>/dev/null; mkdir -p $REMOTE_DIR"
scp -i "$SSH_KEY" -r "$PROJECT_DIR/dist/"* "$SERVER:$REMOTE_DIR/"

echo "업로드 완료"

# 3. Nginx 설정이 없으면 적용 (최초 배포 시)
echo "3/4 Nginx 확인..."
ssh -i "$SSH_KEY" "$SERVER" "
  if [ ! -f /etc/nginx/sites-available/crm ]; then
    echo 'Nginx 설정 없음 - 수동 설정이 필요합니다'
    exit 1
  fi
"

# 4. Nginx 재로드
echo "4/4 Nginx 재로드..."
ssh -i "$SSH_KEY" "$SERVER" "sudo nginx -t && sudo systemctl reload nginx"

echo ""
echo "=== 배포 완료! ==="
echo "https://crm.pressco21.com"
