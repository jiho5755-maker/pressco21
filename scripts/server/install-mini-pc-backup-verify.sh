#!/usr/bin/env bash
# 백업 검증 타이머 + 서비스 설치 스크립트
# 미니PC에서 sudo bash install-mini-pc-backup-verify.sh 로 실행
set -Eeuo pipefail

SERVICE_NAME="pressco21-backup-verify"
SCRIPT_PATH="/usr/local/bin/pressco21-mini-pc-backup-verify.sh"

echo "=== 백업 검증 타이머 설치 ==="

# 스크립트 존재 확인
if [ ! -f "$SCRIPT_PATH" ]; then
  echo "오류: $SCRIPT_PATH 가 없습니다."
  echo "먼저 deploy-to-minipc.sh 로 스크립트를 배포하세요."
  exit 1
fi

chmod +x "$SCRIPT_PATH"

# systemd 서비스 생성
cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=PRESSCO21 백업 검증 (pg_dump 복원 + SQLite 무결성)
After=network.target docker.service

[Service]
Type=oneshot
ExecStart=$SCRIPT_PATH
StandardOutput=journal
StandardError=journal
TimeoutStartSec=600
Environment=BACKUP_ROOT=/srv/pressco21-backup-node/oracle
Environment=BACKUP_NOTIFY_WEBHOOK=https://n8n.pressco21.com/webhook/backup-notify
Environment=NODE_NAME=minipc
EOF

# systemd 타이머 생성 (매주 일요일 05:00)
cat > "/etc/systemd/system/${SERVICE_NAME}.timer" <<EOF
[Unit]
Description=PRESSCO21 주간 백업 검증 (매주 일요일 05:00)

[Timer]
OnCalendar=Sun *-*-* 05:00:00
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
EOF

# 로그 디렉토리 생성
mkdir -p /var/log/pressco21
mkdir -p /var/lib/pressco21

# 활성화
systemctl daemon-reload
systemctl enable "${SERVICE_NAME}.timer"
systemctl start "${SERVICE_NAME}.timer"

echo ""
echo "✅ 설치 완료"
echo ""
echo "상태 확인:"
echo "  systemctl status ${SERVICE_NAME}.timer"
echo "  systemctl list-timers | grep ${SERVICE_NAME}"
echo ""
echo "수동 실행:"
echo "  sudo systemctl start ${SERVICE_NAME}.service"
echo "  # 또는: sudo bash $SCRIPT_PATH"
echo ""
echo "로그 확인:"
echo "  journalctl -u ${SERVICE_NAME}.service -f"
echo "  cat /var/log/pressco21/backup-verify.log"
