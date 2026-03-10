#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SERVER_HOST="${SERVER_HOST:-ubuntu@158.180.77.201}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/oracle-n8n.key}"
REMOTE_SCRIPTS_DIR="${REMOTE_SCRIPTS_DIR:-/home/ubuntu/scripts}"
REMOTE_BACKUP_SCRIPT="${REMOTE_BACKUP_SCRIPT:-${REMOTE_SCRIPTS_DIR}/backup.sh}"
REMOTE_BACKUP_ROOT="${REMOTE_BACKUP_ROOT:-/home/ubuntu/backups}"

SSH_OPTS=(
  -i "$SSH_KEY"
  -o StrictHostKeyChecking=no
)

scp "${SSH_OPTS[@]}" \
  "${SCRIPT_DIR}/nocodb-daily-backup.sh" \
  "${SERVER_HOST}:${REMOTE_BACKUP_SCRIPT}.tmp"

ssh "${SSH_OPTS[@]}" "$SERVER_HOST" "bash -s" <<'EOF'
set -Eeuo pipefail

REMOTE_SCRIPTS_DIR="/home/ubuntu/scripts"
REMOTE_BACKUP_SCRIPT="${REMOTE_SCRIPTS_DIR}/backup.sh"
REMOTE_BACKUP_ROOT="/home/ubuntu/backups"

mkdir -p "$REMOTE_SCRIPTS_DIR" "$REMOTE_BACKUP_ROOT" "$REMOTE_BACKUP_ROOT/monthly"
mv "${REMOTE_BACKUP_SCRIPT}.tmp" "$REMOTE_BACKUP_SCRIPT"
chmod 755 "$REMOTE_BACKUP_SCRIPT"

CURRENT_CRON="$(crontab -l 2>/dev/null || true)"
CLEANED_CRON="$(
  printf '%s\n' "$CURRENT_CRON" \
    | grep -v '# NocoDB 일일 자동 백업' \
    | grep -v '# NocoDB 7일 롤링 정리' \
    | grep -v '/home/ubuntu/scripts/backup.sh' \
    | grep -v 'find /home/ubuntu/backups -maxdepth 1 -type d'
)"

{
  printf '%s\n' "$CLEANED_CRON"
  echo '# NocoDB 일일 자동 백업'
  echo '0 3 * * * /home/ubuntu/scripts/backup.sh >> /home/ubuntu/backups/backup.log 2>&1'
  echo '# NocoDB 7일 롤링 정리'
  echo '30 3 * * * find /home/ubuntu/backups -maxdepth 1 -type d -name '"'"'20??????_??????'"'"' -mtime +7 -exec rm -rf {} \; 2>/dev/null'
} | awk 'NF || !blank { print; blank = !NF }' | crontab -
EOF

echo "Installed ${REMOTE_BACKUP_SCRIPT} and refreshed crontab on ${SERVER_HOST}"
