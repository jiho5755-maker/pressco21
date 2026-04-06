#!/bin/bash
# MinIO 백업 cron 설치 (본진 서버에서 실행)
set -euo pipefail

SCRIPT_DIR="/home/ubuntu/scripts"
BACKUP_SCRIPT="minio-backup-to-vault.sh"

echo "[install] MinIO 백업 cron 설치 시작"

# 1. 스크립트 복사
mkdir -p "$SCRIPT_DIR"
cp "$BACKUP_SCRIPT" "$SCRIPT_DIR/$BACKUP_SCRIPT"
chmod +x "$SCRIPT_DIR/$BACKUP_SCRIPT"

# 2. 백업 디렉토리 생성
sudo mkdir -p /data/minio-backup/tasks
sudo chown ubuntu:ubuntu /data/minio-backup

# 3. 로그 파일 준비
sudo touch /var/log/minio-backup.log
sudo chown ubuntu:ubuntu /var/log/minio-backup.log

# 4. mc alias 설정 (MinIO 컨테이너 내부 접근)
if ! /usr/local/bin/mc alias list pressco >/dev/null 2>&1; then
  echo "[install] mc alias 설정..."
  /usr/local/bin/mc alias set pressco http://127.0.0.1:9000 pressco21 "/jang040300"
fi

# 5. cron 등록 (매일 04:00)
CRON_LINE="0 4 * * * $SCRIPT_DIR/$BACKUP_SCRIPT >> /var/log/minio-backup.log 2>&1"

if crontab -l 2>/dev/null | grep -q "minio-backup"; then
  echo "[install] cron 이미 등록됨 — 건너뜀"
else
  (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
  echo "[install] cron 등록 완료: 매일 04:00"
fi

# 6. logrotate
sudo tee /etc/logrotate.d/minio-backup > /dev/null <<'EOF'
/var/log/minio-backup.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
EOF

echo "[install] 설치 완료!"
echo ""
echo "확인:"
echo "  crontab -l | grep minio"
echo "  /usr/local/bin/mc alias list pressco"
echo ""
echo "수동 실행: bash $SCRIPT_DIR/$BACKUP_SCRIPT"
