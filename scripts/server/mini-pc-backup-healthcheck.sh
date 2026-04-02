#!/usr/bin/env bash
set -Eeuo pipefail

SERVICE_NAME="${SERVICE_NAME:-pressco21-mini-pc-backup}"
TIMER_NAME="${TIMER_NAME:-${SERVICE_NAME}.timer}"

LOCAL_ROOT="${LOCAL_ROOT:-/srv/pressco21-backup-node/oracle}"
LOCAL_STATE_ROOT="${LOCAL_STATE_ROOT:-${LOCAL_ROOT}/state}"
LAST_SYNC_FILE="${LAST_SYNC_FILE:-${LOCAL_STATE_ROOT}/last-sync.txt}"

MIN_FREE_GB="${MIN_FREE_GB:-30}"
MAX_SYNC_AGE_HOURS="${MAX_SYNC_AGE_HOURS:-36}"
ALERT_REPEAT_HOURS="${ALERT_REPEAT_HOURS:-6}"

BACKUP_NOTIFY_WEBHOOK="${BACKUP_NOTIFY_WEBHOOK:-https://n8n.pressco21.com/webhook/backup-notify}"
NODE_NAME="${NODE_NAME:-$(hostname)}"

LOG_DIR="${LOG_DIR:-/var/log/pressco21}"
LOG_FILE="${LOG_FILE:-${LOG_DIR}/mini-pc-backup-healthcheck.log}"
ALERT_STATE_DIR="${ALERT_STATE_DIR:-/var/lib/pressco21}"
ALERT_STATE_FILE="${ALERT_STATE_FILE:-${ALERT_STATE_DIR}/mini-pc-backup-healthcheck.state}"

log() {
  mkdir -p "$LOG_DIR"
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "$LOG_FILE"
}

notify_webhook() {
  local status="$1"
  local message="$2"
  local files_json="${3:-[]}"
  local total_size="${4:-0}"

  if [ -z "$BACKUP_NOTIFY_WEBHOOK" ]; then
    return 0
  fi

  curl -fsS -X POST "$BACKUP_NOTIFY_WEBHOOK" \
    -H 'Content-Type: application/json' \
    -d "{\"status\":\"${status}\",\"timestamp\":\"$(date '+%Y-%m-%dT%H:%M:%S%z')\",\"files\":${files_json},\"total_size\":\"${total_size}\",\"message\":\"${message}\",\"host\":\"${NODE_NAME}\",\"source\":\"mini-pc-backup-healthcheck\"}" >/dev/null 2>&1 || true
}

load_alert_state() {
  LAST_ALERT_KEY=""
  LAST_ALERT_EPOCH="0"

  if [ -f "$ALERT_STATE_FILE" ]; then
    # shellcheck disable=SC1090
    . "$ALERT_STATE_FILE"
  fi
}

save_alert_state() {
  mkdir -p "$ALERT_STATE_DIR"
  {
    echo "LAST_ALERT_KEY='${LAST_ALERT_KEY}'"
    echo "LAST_ALERT_EPOCH='${LAST_ALERT_EPOCH}'"
  } >"$ALERT_STATE_FILE"
}

system_state() {
  local state

  state="$(systemctl is-active "$1" 2>/dev/null | head -n 1 || true)"
  if [ -z "$state" ]; then
    echo "unknown"
    return 0
  fi

  echo "$state"
}

free_space_gb() {
  df -BG "$LOCAL_ROOT" | awk 'NR==2 {gsub(/G/, "", $4); print $4}'
}

sync_age_hours() {
  local timestamp_raw="$1"
  local sync_epoch
  local now_epoch

  sync_epoch="$(date -d "$timestamp_raw" +%s 2>/dev/null || echo 0)"
  now_epoch="$(date +%s)"
  if [ "$sync_epoch" -le 0 ]; then
    echo "-1"
    return 0
  fi

  echo $(((now_epoch - sync_epoch) / 3600))
}

record_and_maybe_notify() {
  local issue_key="$1"
  local message="$2"
  local now_epoch
  local repeat_seconds

  now_epoch="$(date +%s)"
  repeat_seconds="$((ALERT_REPEAT_HOURS * 3600))"

  load_alert_state
  if [ "$issue_key" = "$LAST_ALERT_KEY" ] && [ $((now_epoch - LAST_ALERT_EPOCH)) -lt "$repeat_seconds" ]; then
    log "중복 알림 생략: ${issue_key}"
    return 0
  fi

  log "$message"
  notify_webhook "error" "$message" "[\"${issue_key}\"]" "0"
  LAST_ALERT_KEY="$issue_key"
  LAST_ALERT_EPOCH="$now_epoch"
  save_alert_state
}

mark_recovered_if_needed() {
  local message="$1"

  load_alert_state
  if [ -n "${LAST_ALERT_KEY:-}" ]; then
    log "$message"
    notify_webhook "success" "$message" "[\"recovered\"]" "0"
    LAST_ALERT_KEY=""
    LAST_ALERT_EPOCH="0"
    save_alert_state
  fi
}

main() {
  local service_state
  local timer_state
  local available_gb
  local timestamp_raw
  local age_hours

  service_state="$(system_state "${SERVICE_NAME}.service")"
  timer_state="$(system_state "$TIMER_NAME")"
  available_gb="$(free_space_gb)"

  if [ "$timer_state" != "active" ]; then
    record_and_maybe_notify "timer_inactive" "[PRESSCO21][MINI-PC-BACKUP] ALERT host=${NODE_NAME} timer_state=${timer_state}"
    exit 1
  fi

  if [ "$service_state" = "failed" ]; then
    record_and_maybe_notify "service_failed" "[PRESSCO21][MINI-PC-BACKUP] ALERT host=${NODE_NAME} service_state=failed"
    exit 1
  fi

  if [ -z "$available_gb" ] || [ "$available_gb" -lt "$MIN_FREE_GB" ]; then
    record_and_maybe_notify "low_space_${available_gb}" "[PRESSCO21][MINI-PC-BACKUP] ALERT host=${NODE_NAME} free_gb=${available_gb:-unknown} threshold=${MIN_FREE_GB}"
    exit 1
  fi

  if [ ! -f "$LAST_SYNC_FILE" ]; then
    if [ "$service_state" = "activating" ] || [ "$service_state" = "active" ]; then
      log "헬스체크 통과: 초기 동기화 진행 중 (service=${service_state})"
      exit 0
    fi

    record_and_maybe_notify "missing_last_sync" "[PRESSCO21][MINI-PC-BACKUP] ALERT host=${NODE_NAME} last_sync_missing service_state=${service_state}"
    exit 1
  fi

  timestamp_raw="$(awk -F= '/^timestamp=/{print $2}' "$LAST_SYNC_FILE")"
  age_hours="$(sync_age_hours "$timestamp_raw")"
  if [ "$age_hours" -lt 0 ] || [ "$age_hours" -gt "$MAX_SYNC_AGE_HOURS" ]; then
    record_and_maybe_notify "stale_sync_${age_hours}" "[PRESSCO21][MINI-PC-BACKUP] ALERT host=${NODE_NAME} sync_age_hours=${age_hours} threshold=${MAX_SYNC_AGE_HOURS}"
    exit 1
  fi

  log "헬스체크 통과: service=${service_state}, timer=${timer_state}, sync_age_hours=${age_hours}, free_gb=${available_gb}"
  mark_recovered_if_needed "[PRESSCO21][MINI-PC-BACKUP] RECOVERED host=${NODE_NAME} sync_age_hours=${age_hours} free_gb=${available_gb}"
}

main "$@"
