#!/usr/bin/env bash
set -Eeuo pipefail

WEBHOOK_URL="${BACKUP_NOTIFY_WEBHOOK:-https://n8n.pressco21.com/webhook/backup-notify}"
NODE_NAME="${NODE_NAME:-$(hostname)}"
LOG_DIR="${LOG_DIR:-/var/log/pressco21}"
LOG_FILE="${LOG_FILE:-${LOG_DIR}/smart-healthcheck.log}"
STATE_FILE="${STATE_FILE:-/var/lib/pressco21/smart-healthcheck.state}"
ALERT_REPEAT_HOURS="${ALERT_REPEAT_HOURS:-12}"

mkdir -p "$LOG_DIR" "$(dirname "$STATE_FILE")"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "$LOG_FILE"
}

notify_webhook() {
  local status="$1"
  local message="$2"

  [ -z "$WEBHOOK_URL" ] && return 0
  curl -fsS -X POST "$WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d "{\"status\":\"${status}\",\"timestamp\":\"$(date '+%Y-%m-%dT%H:%M:%S%z')\",\"message\":\"${message}\",\"host\":\"${NODE_NAME}\",\"source\":\"smart-healthcheck\"}" >/dev/null 2>&1 || true
}

load_state() {
  LAST_ALERT_KEY=""
  LAST_ALERT_EPOCH="0"
  [ -f "$STATE_FILE" ] && . "$STATE_FILE"
}

save_state() {
  {
    echo "LAST_ALERT_KEY='${LAST_ALERT_KEY}'"
    echo "LAST_ALERT_EPOCH='${LAST_ALERT_EPOCH}'"
  } >"$STATE_FILE"
}

alert_once() {
  local status="$1"
  local key="$2"
  local message="$3"
  local now_epoch repeat_seconds

  now_epoch="$(date +%s)"
  repeat_seconds="$((ALERT_REPEAT_HOURS * 3600))"
  load_state
  if [ "$key" = "$LAST_ALERT_KEY" ] && [ $((now_epoch - LAST_ALERT_EPOCH)) -lt "$repeat_seconds" ]; then
    log "duplicate alert skipped: $key"
    return 0
  fi

  log "$message"
  notify_webhook "$status" "$message"
  LAST_ALERT_KEY="$key"
  LAST_ALERT_EPOCH="$now_epoch"
  save_state
}

clear_state_if_ok() {
  load_state
  if [ -n "${LAST_ALERT_KEY:-}" ]; then
    log "[PRESSCO21][SMART] RECOVERED host=${NODE_NAME}"
    notify_webhook "success" "[PRESSCO21][SMART] RECOVERED host=${NODE_NAME}"
    LAST_ALERT_KEY=""
    LAST_ALERT_EPOCH="0"
    save_state
  fi
}

device_label() {
  local dev="$1"
  lsblk -dn -o MODEL,SERIAL "$dev" 2>/dev/null | sed 's/[[:space:]][[:space:]]*/ /g' | sed 's/^ *//; s/ *$//'
}

smart_output_for() {
  local dev="$1"
  local type
  local candidates=()

  if [[ "$dev" == /dev/nvme* ]]; then
    candidates=("nvme")
  else
    candidates=("sntasmedia" "sat,auto" "scsi")
  fi

  for type in "${candidates[@]}"; do
    output="$(smartctl -i -H -A -d "$type" "$dev" 2>&1 || true)"
    if printf '%s\n' "$output" | grep -Eq 'START OF INFORMATION SECTION|SMART Health Status|SMART overall-health|SMART support is:'; then
      printf 'SMARTCTL_TYPE=%s\n%s\n' "$type" "$output"
      return 0
    fi
  done

  printf 'SMARTCTL_TYPE=unknown\n%s\n' "$output"
}

main() {
  command -v smartctl >/dev/null 2>&1 || {
    alert_once "error" "smartctl_missing" "[PRESSCO21][SMART] smartctl missing on ${NODE_NAME}"
    exit 1
  }

  local critical=0
  local warning=0
  local issues=()
  local dev output type label health temp

  while IFS= read -r dev; do
    [ -b "$dev" ] || continue
    label="$(device_label "$dev")"
    output="$(smart_output_for "$dev")"
    type="$(printf '%s\n' "$output" | awk -F= '/^SMARTCTL_TYPE=/ {print $2; exit}')"

    if printf '%s\n' "$output" | grep -Eiq 'SMART overall-health self-assessment test result: FAILED|SMART Health Status:.*(BAD|FAIL|FAILED)|Device is:'; then
      critical=1
      issues+=("${dev} ${label}: SMART FAILED type=${type}")
      log "FAIL: ${dev} ${label} type=${type}"
      continue
    fi

    if printf '%s\n' "$output" | grep -Eq 'SMART overall-health self-assessment test result: PASSED|SMART Health Status: OK'; then
      health="OK"
    elif printf '%s\n' "$output" | grep -Eiq 'SMART support is:[[:space:]]+Unavailable|lacks SMART capability|SMART support is:[[:space:]]+Disabled'; then
      warning=1
      issues+=("${dev} ${label}: SMART unavailable through current bridge type=${type}")
      log "WARN: ${dev} ${label} SMART unavailable type=${type}"
      continue
    else
      warning=1
      issues+=("${dev} ${label}: SMART status unknown type=${type}")
      log "WARN: ${dev} ${label} SMART unknown type=${type}"
      continue
    fi

    temp="$(printf '%s\n' "$output" | awk -F: '/Temperature:/ || /Current Drive Temperature:/ {gsub(/^[ \t]+/,"",$2); print $2; exit}')"
    log "OK: ${dev} ${label} SMART=${health} type=${type}${temp:+ temp=${temp}}"
  done < <(lsblk -dn -e7 -o PATH | awk '/^\/dev\//')

  if [ "$critical" -eq 1 ]; then
    alert_once "error" "smart_failed_$(printf '%s' "${issues[*]}" | sha256sum | awk '{print $1}')" "[PRESSCO21][SMART] FAILED host=${NODE_NAME}: ${issues[*]}"
    exit 1
  fi

  if [ "$warning" -eq 1 ]; then
    alert_once "warning" "smart_warn_$(printf '%s' "${issues[*]}" | sha256sum | awk '{print $1}')" "[PRESSCO21][SMART] WARNING host=${NODE_NAME}: ${issues[*]}" || true
    exit 0
  fi

  clear_state_if_ok
  log "SMART health OK for all visible disks"
}

main "$@"
