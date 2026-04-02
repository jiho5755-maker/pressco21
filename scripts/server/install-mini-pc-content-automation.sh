#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_NAME="${SCRIPT_NAME:-install-mini-pc-content-automation}"
SERVICE_NAME="${SERVICE_NAME:-pressco21-content-curator}"
CONFIG_DIR="${CONFIG_DIR:-/etc/pressco21}"
ENV_FILE="${CONFIG_DIR}/mini-pc-content-automation.env"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
TIMER_FILE="/etc/systemd/system/${SERVICE_NAME}.timer"
INSTALL_PATH="${INSTALL_PATH:-/usr/local/bin/${SERVICE_NAME}.sh}"

RUN_USER="${RUN_USER:-pressbackup}"
RUN_GROUP="${RUN_GROUP:-pressbackup}"

CONTENT_ROOT="${CONTENT_ROOT:-/srv/pressco21-content}"
INBOX_ROOT="${INBOX_ROOT:-${CONTENT_ROOT}/inbox}"
CATALOG_ROOT="${CATALOG_ROOT:-${CONTENT_ROOT}/catalog}"
QUARANTINE_ROOT="${QUARANTINE_ROOT:-${CONTENT_ROOT}/quarantine}"

FILE_SETTLE_MINUTES="${FILE_SETTLE_MINUTES:-20}"
LOG_DIR="${LOG_DIR:-/var/log/pressco21}"
STATE_DIR="${STATE_DIR:-/var/lib/pressco21}"
BACKUP_NOTIFY_WEBHOOK="${BACKUP_NOTIFY_WEBHOOK:-https://n8n.pressco21.com/webhook/backup-notify}"
NOTIFY_ON_SUCCESS="${NOTIFY_ON_SUCCESS:-0}"
NOTIFY_ON_FAILURE="${NOTIFY_ON_FAILURE:-1}"

ensure_root() {
  if [ "${EUID:-$(id -u)}" -ne 0 ]; then
    exec sudo "$0" "$@"
  fi
}

ensure_packages() {
  if command -v python3 >/dev/null 2>&1; then
    return 0
  fi

  apt-get update
  apt-get install -y python3
}

install_script() {
  local source_path

  source_path="$(cd "$(dirname "$0")" && pwd)/mini-pc-content-curator.sh"
  install -m 755 "$source_path" "$INSTALL_PATH"
}

create_directories() {
  install -d -o "$RUN_USER" -g "$RUN_GROUP" \
    "$CONTENT_ROOT" \
    "$CATALOG_ROOT" \
    "$QUARANTINE_ROOT" \
    "$LOG_DIR" \
    "$STATE_DIR" \
    "$INBOX_ROOT/youtube/raw" \
    "$INBOX_ROOT/youtube/project" \
    "$INBOX_ROOT/youtube/export" \
    "$INBOX_ROOT/reels/raw" \
    "$INBOX_ROOT/reels/project" \
    "$INBOX_ROOT/reels/export" \
    "$INBOX_ROOT/shared/brand-assets" \
    "$INBOX_ROOT/shared/subtitles" \
    "$INBOX_ROOT/shared/thumbnails" \
    "$CONTENT_ROOT/youtube/raw" \
    "$CONTENT_ROOT/youtube/project" \
    "$CONTENT_ROOT/youtube/export" \
    "$CONTENT_ROOT/youtube/archive" \
    "$CONTENT_ROOT/reels/raw" \
    "$CONTENT_ROOT/reels/project" \
    "$CONTENT_ROOT/reels/export" \
    "$CONTENT_ROOT/reels/archive" \
    "$CONTENT_ROOT/shared/brand-assets" \
    "$CONTENT_ROOT/shared/subtitles" \
    "$CONTENT_ROOT/shared/thumbnails"

  install -d "$CONFIG_DIR"
  chown -R "$RUN_USER:$RUN_GROUP" "$CONTENT_ROOT"
}

write_env_file() {
  cat >"$ENV_FILE" <<EOF
CONTENT_ROOT="${CONTENT_ROOT}"
INBOX_ROOT="${INBOX_ROOT}"
CATALOG_ROOT="${CATALOG_ROOT}"
QUARANTINE_ROOT="${QUARANTINE_ROOT}"
FILE_SETTLE_MINUTES="${FILE_SETTLE_MINUTES}"
LOG_DIR="${LOG_DIR}"
STATE_DIR="${STATE_DIR}"
BACKUP_NOTIFY_WEBHOOK="${BACKUP_NOTIFY_WEBHOOK}"
NOTIFY_ON_SUCCESS="${NOTIFY_ON_SUCCESS}"
NOTIFY_ON_FAILURE="${NOTIFY_ON_FAILURE}"
EOF
  chmod 640 "$ENV_FILE"
}

write_service() {
  cat >"$SERVICE_FILE" <<EOF
[Unit]
Description=PRESSCO21 Content Curator
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
EnvironmentFile=${ENV_FILE}
User=${RUN_USER}
Group=${RUN_GROUP}
ExecStart=${INSTALL_PATH}
EOF
}

write_timer() {
  cat >"$TIMER_FILE" <<EOF
[Unit]
Description=Run PRESSCO21 Content Curator hourly

[Timer]
OnCalendar=*-*-* *:10:00
RandomizedDelaySec=5m
Persistent=true

[Install]
WantedBy=timers.target
EOF
}

enable_timer() {
  systemctl daemon-reload
  systemctl enable --now "${SERVICE_NAME}.timer"
}

print_summary() {
  cat <<EOF
설치 완료

- service: ${SERVICE_NAME}.service
- timer: ${SERVICE_NAME}.timer
- inbox:
  - ${INBOX_ROOT}/youtube/raw
  - ${INBOX_ROOT}/youtube/project
  - ${INBOX_ROOT}/youtube/export
  - ${INBOX_ROOT}/reels/raw
  - ${INBOX_ROOT}/reels/project
  - ${INBOX_ROOT}/reels/export
  - ${INBOX_ROOT}/shared/brand-assets
  - ${INBOX_ROOT}/shared/subtitles
  - ${INBOX_ROOT}/shared/thumbnails
- catalog: ${CATALOG_ROOT}
EOF
}

main() {
  ensure_root "$@"
  ensure_packages
  install_script
  create_directories
  write_env_file
  write_service
  write_timer
  enable_timer
  print_summary
}

main "$@"
