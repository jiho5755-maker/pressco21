#!/usr/bin/env bash
set -Eeuo pipefail

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_ROOT="${BACKUP_ROOT:-/home/ubuntu/backups}"
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"
MONTHLY_ROOT="${MONTHLY_ROOT:-${BACKUP_ROOT}/monthly}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

NOCODB_CONTAINER="${NOCODB_CONTAINER:-nocodb}"
NOCODB_HOST_DATA_DIR="${NOCODB_HOST_DATA_DIR:-/home/ubuntu/nocodb/nocodb_data}"
NOCODB_DB_PATH="${NOCODB_DB_PATH:-${NOCODB_HOST_DATA_DIR}/noco.db}"
NOCODB_CONTAINER_DB_PATH="${NOCODB_CONTAINER_DB_PATH:-/usr/app/data/noco.db}"

N8N_ENV_FILE="${N8N_ENV_FILE:-/home/ubuntu/n8n/.env}"
TELEGRAM_NOTIFY_SCRIPT="${TELEGRAM_NOTIFY_SCRIPT:-/home/ubuntu/scripts/telegram-notify.sh}"
BACKUP_NOTIFY_WEBHOOK="${BACKUP_NOTIFY_WEBHOOK:-https://n8n.pressco21.com/webhook/backup-notify}"
FORCE_FAIL="${PRESSCO21_BACKUP_FORCE_FAIL:-0}"

COMPOSE_FILES=(
  "/home/ubuntu/nocodb/docker-compose.yml"
  "/home/ubuntu/n8n/docker-compose.yml"
  "/home/ubuntu/server-config/docker-compose.yml"
)

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

notify_failure() {
  local message="$1"

  if [ -x "$TELEGRAM_NOTIFY_SCRIPT" ]; then
    "$TELEGRAM_NOTIFY_SCRIPT" "$message" >/dev/null 2>&1 || true
  fi

  if [ -n "$BACKUP_NOTIFY_WEBHOOK" ]; then
    curl -fsS -X POST "$BACKUP_NOTIFY_WEBHOOK" \
      -H 'Content-Type: application/json' \
      -d "{\"status\":\"error\",\"message\":\"$message\"}" >/dev/null 2>&1 || true
  fi
}

on_error() {
  local exit_code="$1"
  local line_no="$2"
  log "백업 실패 알림 전송: code=${exit_code}, line=${line_no}"
  notify_failure "[PRESSCO21][BACKUP] FAILED code=${exit_code} line=${line_no} timestamp=${TIMESTAMP}"
  exit "$exit_code"
}

trap 'on_error $? $LINENO' ERR

backup_nocodb_db() {
  local target_file="${BACKUP_DIR}/noco_${TIMESTAMP}.db"

  if docker ps --format '{{.Names}}' | grep -qx "$NOCODB_CONTAINER"; then
    if docker exec "$NOCODB_CONTAINER" sh -lc "[ -f \"$NOCODB_CONTAINER_DB_PATH\" ]"; then
      docker cp "${NOCODB_CONTAINER}:${NOCODB_CONTAINER_DB_PATH}" "$target_file"
    fi
  fi

  if [ ! -f "$target_file" ] && [ -f "$NOCODB_DB_PATH" ]; then
    cp "$NOCODB_DB_PATH" "$target_file"
  fi

  [ -f "$target_file" ]
}

backup_nocodb_volume() {
  local target_file="${BACKUP_DIR}/nocodb_data_${TIMESTAMP}.tar.gz"
  local tar_status=0

  tar --warning=no-file-changed -C "$NOCODB_HOST_DATA_DIR" -czf "$target_file" . || tar_status=$?
  if [ "$tar_status" -gt 1 ]; then
    return "$tar_status"
  fi
  [ -f "$target_file" ]
}

backup_compose_files() {
  local compose_file
  local service_name

  for compose_file in "${COMPOSE_FILES[@]}"; do
    if [ -f "$compose_file" ]; then
      service_name="$(basename "$(dirname "$compose_file")")"
      cp "$compose_file" "${BACKUP_DIR}/docker-compose_${service_name}_${TIMESTAMP}.bak"
    fi
  done
}

backup_env_file() {
  if [ -f "$N8N_ENV_FILE" ]; then
    cp "$N8N_ENV_FILE" "${BACKUP_DIR}/n8n_env_${TIMESTAMP}.bak"
  fi
}

write_manifest() {
  local manifest_file="${BACKUP_DIR}/manifest_${TIMESTAMP}.txt"

  {
    echo "timestamp=${TIMESTAMP}"
    echo "hostname=$(hostname)"
    echo "backup_dir=${BACKUP_DIR}"
    echo "nocodb_container=${NOCODB_CONTAINER}"
    echo "nocodb_host_data_dir=${NOCODB_HOST_DATA_DIR}"
  } >"$manifest_file"

  if command -v sha256sum >/dev/null 2>&1; then
    (
      cd "$BACKUP_DIR"
      sha256sum ./* >>"$manifest_file"
    )
  fi
}

create_monthly_archive() {
  local day_of_month
  local monthly_dir

  day_of_month="$(date +%d)"
  if [ "$day_of_month" != "01" ]; then
    return 0
  fi

  monthly_dir="${MONTHLY_ROOT}/$(date +%Y%m)"
  mkdir -p "$monthly_dir"
  cp -a "$BACKUP_DIR" "$monthly_dir/"
}

prune_old_backups() {
  find "$BACKUP_ROOT" \
    -maxdepth 1 \
    -mindepth 1 \
    -type d \
    -name '20??????_??????' \
    -mtime +"$RETENTION_DAYS" \
    -exec rm -rf {} +
}

main() {
  mkdir -p "$BACKUP_DIR"

  if [ "$FORCE_FAIL" = "1" ]; then
    log "FORCE_FAIL=1, 실패 알림 경로를 테스트합니다."
    return 99
  fi

  [ -d "$NOCODB_HOST_DATA_DIR" ]
  backup_nocodb_db
  backup_nocodb_volume
  backup_compose_files
  backup_env_file
  write_manifest
  create_monthly_archive
  prune_old_backups

  log "NocoDB 일일 백업 완료: ${BACKUP_DIR}"
}

main "$@"
