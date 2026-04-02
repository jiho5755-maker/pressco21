#!/usr/bin/env bash
set -Eeuo pipefail

RUN_USER="${RUN_USER:-pressbackup}"
RUN_GROUP="${RUN_GROUP:-pressbackup}"

ACTIVE_ROOT="${ACTIVE_ROOT:-/mnt/pressco21-ssd/PRESSCO21_ACTIVE}"
ARCHIVE_ROOT="${ARCHIVE_ROOT:-/mnt/pressco21-hdd/PRESSCO21_ARCHIVE}"
LOG_DIR="${LOG_DIR:-/var/log/pressco21}"
STATE_DIR="${STATE_DIR:-/var/lib/pressco21}"

MINIO_STAGE_ROOT="${MINIO_STAGE_ROOT:-${ACTIVE_ROOT}/publish/minio-stage}"
MINIO_READY_ROOT="${MINIO_READY_ROOT:-${ACTIVE_ROOT}/publish/minio-ready}"
MINIO_ARCHIVE_ROOT="${MINIO_ARCHIVE_ROOT:-${ARCHIVE_ROOT}/publish/minio-history}"

CONFIG_DIR="${CONFIG_DIR:-/etc/pressco21}"
ENV_FILE="${CONFIG_DIR}/mini-pc-creator-archive.env"
INSTALL_PATH="${INSTALL_PATH:-/usr/local/bin/pressco21-creator-archive-sync.sh}"
SERVICE_NAME="${SERVICE_NAME:-pressco21-creator-archive-sync}"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
TIMER_FILE="/etc/systemd/system/${SERVICE_NAME}.timer"
MINIO_INFO_FILE="${MINIO_INFO_FILE:-/home/${RUN_USER}/pressco21/minio-publish-info.txt}"

ensure_root() {
  if [ "${EUID:-$(id -u)}" -ne 0 ]; then
    exec sudo "$0" "$@"
  fi
}

ensure_packages() {
  if command -v rsync >/dev/null 2>&1; then
    return 0
  fi

  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y rsync
}

install_script() {
  local source_path

  source_path="$(cd "$(dirname "$0")" && pwd)/mini-pc-creator-archive-sync.sh"
  install -m 755 "$source_path" "$INSTALL_PATH"
}

write_env_file() {
  install -d "$CONFIG_DIR"

  cat >"$ENV_FILE" <<EOF
ACTIVE_ROOT="${ACTIVE_ROOT}"
ARCHIVE_ROOT="${ARCHIVE_ROOT}"
LOG_DIR="${LOG_DIR}"
STATE_DIR="${STATE_DIR}"
MINIO_STAGE_ROOT="${MINIO_STAGE_ROOT}"
MINIO_READY_ROOT="${MINIO_READY_ROOT}"
MINIO_ARCHIVE_ROOT="${MINIO_ARCHIVE_ROOT}"
EOF

  chmod 640 "$ENV_FILE"
}

write_service() {
  cat >"$SERVICE_FILE" <<EOF
[Unit]
Description=PRESSCO21 Creator Archive Sync
After=local-fs.target network-online.target
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
Description=Run PRESSCO21 Creator Archive Sync every 30 minutes

[Timer]
OnCalendar=*-*-* *:20,50:00
Persistent=true

[Install]
WantedBy=timers.target
EOF
}

write_minio_info() {
  cat >"$MINIO_INFO_FILE" <<EOF
PRESSCO21 MinIO Publish Placeholder
minio_stage_root=${MINIO_STAGE_ROOT}
minio_ready_root=${MINIO_READY_ROOT}
minio_archive_root=${MINIO_ARCHIVE_ROOT}

Planned flow:
1. Designers or admins place approved assets in minio-stage
2. Validation/publish step promotes files to minio-ready
3. Future MinIO publisher syncs minio-ready to the object bucket
4. Published copies are retained under minio-history
EOF

  chown "$RUN_USER:$RUN_GROUP" "$MINIO_INFO_FILE"
  chmod 600 "$MINIO_INFO_FILE"
}

enable_timer() {
  systemctl daemon-reload
  systemctl enable --now "${SERVICE_NAME}.timer"
}

print_summary() {
  cat <<EOF
creator archive install complete

- service: ${SERVICE_NAME}.service
- timer: ${SERVICE_NAME}.timer
- archive summary: ${STATE_DIR}/creator-archive-sync.latest
- minio placeholder info: ${MINIO_INFO_FILE}
EOF
}

main() {
  ensure_root "$@"
  ensure_packages
  install_script
  write_env_file
  write_service
  write_timer
  write_minio_info
  enable_timer
  print_summary
}

main "$@"
