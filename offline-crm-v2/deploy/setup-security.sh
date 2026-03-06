#!/bin/bash
# PRESSCO21 CRM v2 보안 설정 스크립트
# 사용법: bash deploy/setup-security.sh
# Phase 1: Basic Auth + 보안 헤더 + Rate Limiting 적용

set -e

SERVER="ubuntu@158.180.77.201"
SSH_KEY="$HOME/.ssh/oracle-n8n.key"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== PRESSCO21 CRM 보안 설정 시작 ==="

# 1. htpasswd 도구 설치 확인 + 계정 생성
echo "1/5 Basic Auth 계정 생성..."
ssh -i "$SSH_KEY" "$SERVER" "
  # apache2-utils 설치 (htpasswd 명령)
  if ! command -v htpasswd &>/dev/null; then
    sudo apt-get update -qq && sudo apt-get install -y -qq apache2-utils
  fi
"

# htpasswd 파일은 서버에서 직접 대화형으로 생성해야 합니다.
# 이 스크립트는 파일이 이미 존재하는지 확인만 합니다.
ssh -i "$SSH_KEY" "$SERVER" "
  if [ ! -f /etc/nginx/.htpasswd-crm ]; then
    echo '[ERROR] /etc/nginx/.htpasswd-crm 파일이 없습니다.'
    echo '먼저 아래 명령으로 계정을 생성하세요:'
    echo '  sudo htpasswd -c /etc/nginx/.htpasswd-crm pressco21'
    echo '  sudo htpasswd /etc/nginx/.htpasswd-crm jhl9464'
    exit 1
  fi
  echo 'htpasswd 파일 확인 완료'
  echo '등록된 사용자:'
  cut -d: -f1 /etc/nginx/.htpasswd-crm
"

# 2. Rate Limit Zone 추가 (nginx.conf http 블록)
echo "2/5 Rate Limit Zone 설정..."
ssh -i "$SSH_KEY" "$SERVER" "
  if ! grep -q 'crm_api' /etc/nginx/nginx.conf; then
    # http 블록 내 gzip on; 다음에 rate limit zone 삽입
    sudo sed -i '/gzip on;/a\\n\t# CRM API Rate Limiting (30 req/sec per IP)\n\tlimit_req_zone \$binary_remote_addr zone=crm_api:10m rate=30r/s;' /etc/nginx/nginx.conf
    echo 'Rate Limit Zone 추가 완료'
  else
    echo 'Rate Limit Zone 이미 존재'
  fi
"

# 3. Nginx 보안 설정 파일 업로드
echo "3/5 Nginx 설정 파일 업로드..."
scp -i "$SSH_KEY" "$SCRIPT_DIR/nginx-crm-secure.conf" "$SERVER:/tmp/crm-nginx.conf"
ssh -i "$SSH_KEY" "$SERVER" "
  sudo cp /etc/nginx/sites-available/crm /etc/nginx/sites-available/crm.bak.\$(date +%Y%m%d%H%M%S)
  sudo cp /tmp/crm-nginx.conf /etc/nginx/sites-available/crm
  rm /tmp/crm-nginx.conf
  echo '설정 파일 교체 완료 (백업 저장됨)'
"

# 4. Nginx 설정 검증
echo "4/5 Nginx 설정 검증..."
ssh -i "$SSH_KEY" "$SERVER" "sudo nginx -t"

# 5. Nginx 재로드
echo "5/5 Nginx 재로드..."
ssh -i "$SSH_KEY" "$SERVER" "sudo systemctl reload nginx"

echo ""
echo "=== 보안 설정 완료! ==="
echo ""
echo "접속 테스트:"
echo "  curl -u pressco21:비밀번호 https://crm.pressco21.com"
echo ""
echo "계정 추가 방법:"
echo "  ssh -i ~/.ssh/oracle-n8n.key $SERVER"
echo "  sudo htpasswd /etc/nginx/.htpasswd-crm 새사용자아이디"
echo ""
echo "계정 삭제 방법:"
echo "  ssh -i ~/.ssh/oracle-n8n.key $SERVER"
echo "  sudo htpasswd -D /etc/nginx/.htpasswd-crm 삭제할아이디"
echo "  sudo systemctl reload nginx"
