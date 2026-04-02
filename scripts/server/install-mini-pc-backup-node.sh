#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SERVICE_NAME="${SERVICE_NAME:-pressco21-mini-pc-backup}"
HEALTHCHECK_SERVICE_NAME="${HEALTHCHECK_SERVICE_NAME:-${SERVICE_NAME}-healthcheck}"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"
CONFIG_DIR="${CONFIG_DIR:-/etc/pressco21}"
LOCAL_ROOT="${LOCAL_ROOT:-/srv/pressco21-backup-node/oracle}"
BACKUP_PULL_SCHEDULE="${BACKUP_PULL_SCHEDULE:-*-*-* 23:30:00}"
HEALTHCHECK_SCHEDULE="${HEALTHCHECK_SCHEDULE:-hourly}"

TARGET_SCRIPT="${INSTALL_DIR}/${SERVICE_NAME}.sh"
HEALTHCHECK_SCRIPT="${INSTALL_DIR}/${HEALTHCHECK_SERVICE_NAME}.sh"
ENV_FILE="${CONFIG_DIR}/mini-pc-backup-node.env"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
TIMER_FILE="/etc/systemd/system/${SERVICE_NAME}.timer"
HEALTHCHECK_SERVICE_FILE="/etc/systemd/system/${HEALTHCHECK_SERVICE_NAME}.service"
HEALTHCHECK_TIMER_FILE="/etc/systemd/system/${HEALTHCHECK_SERVICE_NAME}.timer"

ensure_root() {
  if [ "${EUID:-$(id -u)}" -ne 0 ]; then
    exec sudo "$0" "$@"
  fi
}

install_packages() {
  local missing=0

  command -v rsync >/dev/null 2>&1 || missing=1
  command -v ssh >/dev/null 2>&1 || missing=1
  command -v curl >/dev/null 2>&1 || missing=1

  if [ "$missing" -eq 0 ]; then
    return 0
  fi

  if ! command -v apt-get >/dev/null 2>&1; then
    echo "apt-get 이 없어 rsync/ssh 패키지를 자동 설치할 수 없습니다." >&2
    exit 1
  fi

  apt-get update
  apt-get install -y curl rsync openssh-client
}

install_script() {
  install -d "$INSTALL_DIR" "$CONFIG_DIR" "$LOCAL_ROOT"
  install -m 755 "${SCRIPT_DIR}/mini-pc-backup-pull.sh" "$TARGET_SCRIPT"
  install -m 755 "${SCRIPT_DIR}/mini-pc-backup-healthcheck.sh" "$HEALTHCHECK_SCRIPT"
}

write_env_file() {
  if [ -f "$ENV_FILE" ]; then
    return 0
  fi

  cat >"$ENV_FILE" <<'EOF'
SOURCE_HOST="ubuntu@pressco21-automation"
SSH_KEY="/home/ubuntu/.ssh/oracle-n8n.key"
SOURCE_BACKUP_ROOT="/home/ubuntu/backups"
LOCAL_ROOT="/srv/pressco21-backup-node/oracle"
MIN_BACKUP_AGE_MINUTES="90"
LOCAL_RETENTION_DAYS="180"
LOCAL_MONTHLY_RETENTION_MONTHS="12"
MIN_FREE_GB="30"
MAX_SYNC_AGE_HOURS="36"
ALERT_REPEAT_HOURS="6"
BACKUP_NOTIFY_WEBHOOK="https://n8n.pressco21.com/webhook/backup-notify"
LOG_DIR="/var/log/pressco21"
EOF

  chmod 640 "$ENV_FILE"
}

write_systemd_units() {
  cat >"$SERVICE_FILE" <<EOF
[Unit]
Description=PRESSCO21 Mini PC Backup Pull
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
EnvironmentFile=${ENV_FILE}
ExecStart=${TARGET_SCRIPT}
Nice=10
IOSchedulingClass=best-effort

[Install]
WantedBy=multi-user.target
EOF

  cat >"$HEALTHCHECK_SERVICE_FILE" <<EOF
[Unit]
Description=PRESSCO21 Mini PC Backup Healthcheck
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
EnvironmentFile=${ENV_FILE}
ExecStart=${HEALTHCHECK_SCRIPT}
Nice=10
IOSchedulingClass=best-effort

[Install]
WantedBy=multi-user.target
EOF

  cat >"$TIMER_FILE" <<EOF
[Unit]
Description=Run PRESSCO21 Mini PC Backup Pull every night

[Timer]
OnCalendar=${BACKUP_PULL_SCHEDULE}
RandomizedDelaySec=10m
Persistent=true
Unit=${SERVICE_NAME}.service

[Install]
WantedBy=timers.target
EOF

  cat >"$HEALTHCHECK_TIMER_FILE" <<EOF
[Unit]
Description=Run PRESSCO21 Mini PC Backup Healthcheck every hour

[Timer]
OnCalendar=${HEALTHCHECK_SCHEDULE}
RandomizedDelaySec=5m
Persistent=true
Unit=${HEALTHCHECK_SERVICE_NAME}.service

[Install]
WantedBy=timers.target
EOF
}

enable_timer() {
  systemctl daemon-reload
  systemctl enable --now "${SERVICE_NAME}.timer"
  systemctl enable --now "${HEALTHCHECK_SERVICE_NAME}.timer"
}

print_next_steps() {
  cat <<EOF
설치 완료

다음 작업:
1. ${ENV_FILE} 파일에서 SOURCE_HOST 와 SSH_KEY 를 실제 미니PC 환경에 맞게 수정
2. Oracle 서버 접속 키를 미니PC에 배치
3. Tailscale 또는 고정 IP 기준으로 Oracle 서버에 SSH 접속 확인
4. 아래 명령으로 수동 테스트
   sudo systemctl start ${SERVICE_NAME}.service
   journalctl -u ${SERVICE_NAME}.service -n 100 --no-pager
5. 현재 타이머 일정
   ${BACKUP_PULL_SCHEDULE}
6. 헬스체크 타이머 일정
   ${HEALTHCHECK_SCHEDULE}
EOF
}

main() {
  ensure_root "$@"
  install_packages
  install_script
  write_env_file
  write_systemd_units
  enable_timer
  print_next_steps
}

main "$@"
