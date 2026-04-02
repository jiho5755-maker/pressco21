#!/usr/bin/env bash
set -Eeuo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/home/ubuntu/backups}"
LOG_DIR="${LOG_DIR:-/home/ubuntu/logs}"
LOG_FILE="${LOG_FILE:-${LOG_DIR}/oracle-storage-healthcheck.log}"
STATE_FILE="${STATE_FILE:-/tmp/pressco21_oracle_storage_healthcheck.state}"

WARN_DISK_PERCENT="${WARN_DISK_PERCENT:-75}"
CRIT_DISK_PERCENT="${CRIT_DISK_PERCENT:-85}"
MAX_BACKUP_AGE_HOURS="${MAX_BACKUP_AGE_HOURS:-30}"

BACKUP_NOTIFY_WEBHOOK="${BACKUP_NOTIFY_WEBHOOK:-https://n8n.pressco21.com/webhook/backup-notify}"
HOST_NAME="${HOST_NAME:-$(hostname)}"

log() {
  mkdir -p "$LOG_DIR"
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "$LOG_FILE"
}

notify_webhook() {
  local status="$1"
  local message="$2"

  if [ -z "$BACKUP_NOTIFY_WEBHOOK" ]; then
    return 0
  fi

  curl -fsS -X POST "$BACKUP_NOTIFY_WEBHOOK" \
    -H 'Content-Type: application/json' \
    -d "{\"status\":\"${status}\",\"timestamp\":\"$(date '+%Y-%m-%dT%H:%M:%S%z')\",\"files\":[],\"total_size\":\"0\",\"message\":\"${message}\",\"host\":\"${HOST_NAME}\",\"source\":\"oracle-storage-healthcheck\"}" >/dev/null 2>&1 || true
}

load_state() {
  LAST_KEY=""
  if [ -f "$STATE_FILE" ]; then
    # shellcheck disable=SC1090
    . "$STATE_FILE"
  fi
}

save_state() {
  echo "LAST_KEY='${LAST_KEY}'" >"$STATE_FILE"
}

emit_once() {
  local key="$1"
  local status="$2"
  local message="$3"

  load_state
  if [ "$LAST_KEY" = "$key" ]; then
    log "중복 알림 생략: ${key}"
    return 0
  fi

  log "$message"
  notify_webhook "$status" "$message"
  LAST_KEY="$key"
  save_state
}

recover_if_needed() {
  local message="$1"

  load_state
  if [ -n "$LAST_KEY" ]; then
    log "$message"
    notify_webhook "success" "$message"
    LAST_KEY=""
    save_state
  fi
}

latest_backup_age_hours() {
  local latest_dir
  local latest_epoch
  local now_epoch

  latest_dir="$(find "$BACKUP_ROOT" -maxdepth 1 -mindepth 1 -type d -name '20??????_??????' -printf '%T@ %f\n' | sort -nr | head -n 1 | awk '{print $2}')"
  if [ -z "$latest_dir" ]; then
    echo "-1"
    return 0
  fi

  latest_epoch="$(date -d "${latest_dir:0:8} ${latest_dir:9:2}:${latest_dir:11:2}:${latest_dir:13:2}" +%s 2>/dev/null || echo 0)"
  now_epoch="$(date +%s)"
  if [ "$latest_epoch" -le 0 ]; then
    echo "-1"
    return 0
  fi

  echo $(((now_epoch - latest_epoch) / 3600))
}

main() {
  local disk_percent
  local backup_age
  local backup_size

  disk_percent="$(df / | awk 'NR==2 {gsub(/%/, "", $5); print $5}')"
  backup_age="$(latest_backup_age_hours)"
  backup_size="$(du -sh "$BACKUP_ROOT" 2>/dev/null | awk '{print $1}')"

  if [ "$disk_percent" -ge "$CRIT_DISK_PERCENT" ]; then
    emit_once "disk_crit" "error" "[PRESSCO21][ORACLE-STORAGE] ALERT host=${HOST_NAME} disk=${disk_percent}% backup_size=${backup_size:-0}"
    exit 1
  fi

  if [ "$disk_percent" -ge "$WARN_DISK_PERCENT" ]; then
    emit_once "disk_warn" "error" "[PRESSCO21][ORACLE-STORAGE] WARN host=${HOST_NAME} disk=${disk_percent}% backup_size=${backup_size:-0}"
    exit 1
  fi

  if [ "$backup_age" -lt 0 ] || [ "$backup_age" -gt "$MAX_BACKUP_AGE_HOURS" ]; then
    emit_once "backup_stale" "error" "[PRESSCO21][ORACLE-STORAGE] ALERT host=${HOST_NAME} backup_age_hours=${backup_age} threshold=${MAX_BACKUP_AGE_HOURS}"
    exit 1
  fi

  log "스토리지 정상: disk=${disk_percent}% backup_age_hours=${backup_age} backup_size=${backup_size:-0}"
  recover_if_needed "[PRESSCO21][ORACLE-STORAGE] RECOVERED host=${HOST_NAME} disk=${disk_percent}% backup_age_hours=${backup_age}"
}

main "$@"
