#!/usr/bin/env bash
set -Eeuo pipefail

ENV_FILE="${ENV_FILE:-/etc/pressco21/raid1.env}"
RAID_DEVICE="${RAID_DEVICE:-/dev/md/pressco21_raid1}"
MOUNT_POINT="${MOUNT_POINT:-/mnt/pressco21-raid}"
WEBHOOK_URL="${BACKUP_NOTIFY_WEBHOOK:-https://n8n.pressco21.com/webhook/backup-notify}"
NODE_NAME="${NODE_NAME:-$(hostname)}"
LOG_DIR="${LOG_DIR:-/var/log/pressco21}"
LOG_FILE="${LOG_FILE:-${LOG_DIR}/raid-healthcheck.log}"
STATE_FILE="${STATE_FILE:-/var/lib/pressco21/raid-healthcheck.state}"
ALERT_REPEAT_HOURS="${ALERT_REPEAT_HOURS:-6}"

if [ -r "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  . "$ENV_FILE"
fi

log() {
  mkdir -p "$LOG_DIR"
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "$LOG_FILE"
}

notify_webhook() {
  local status="$1"
  local message="$2"

  [ -z "$WEBHOOK_URL" ] && return 0
  curl -fsS -X POST "$WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d "{\"status\":\"${status}\",\"timestamp\":\"$(date '+%Y-%m-%dT%H:%M:%S%z')\",\"message\":\"${message}\",\"host\":\"${NODE_NAME}\",\"source\":\"raid-healthcheck\"}" >/dev/null 2>&1 || true
}

load_state() {
  LAST_ALERT_KEY=""
  LAST_ALERT_EPOCH="0"
  [ -f "$STATE_FILE" ] && . "$STATE_FILE"
}

save_state() {
  mkdir -p "$(dirname "$STATE_FILE")"
  {
    echo "LAST_ALERT_KEY='${LAST_ALERT_KEY}'"
    echo "LAST_ALERT_EPOCH='${LAST_ALERT_EPOCH}'"
  } >"$STATE_FILE"
}

alert_once() {
  local key="$1"
  local message="$2"
  local now_epoch repeat_seconds

  now_epoch="$(date +%s)"
  repeat_seconds="$((ALERT_REPEAT_HOURS * 3600))"
  load_state
  if [ "$key" = "$LAST_ALERT_KEY" ] && [ $((now_epoch - LAST_ALERT_EPOCH)) -lt "$repeat_seconds" ]; then
    log "duplicate alert skipped: $key"
    return 0
  fi

  log "ALERT: $message"
  notify_webhook "error" "$message"
  LAST_ALERT_KEY="$key"
  LAST_ALERT_EPOCH="$now_epoch"
  save_state
}

mark_recovered() {
  local message="$1"

  load_state
  if [ -n "${LAST_ALERT_KEY:-}" ]; then
    log "$message"
    notify_webhook "success" "$message"
    LAST_ALERT_KEY=""
    LAST_ALERT_EPOCH="0"
    save_state
  fi
}

if [ ! -r "$ENV_FILE" ] && [ ! -e "$RAID_DEVICE" ]; then
  log "RAID not configured yet; skipping"
  exit 0
fi

if [ ! -e "$RAID_DEVICE" ]; then
  alert_once "raid_missing" "[PRESSCO21][RAID] missing device: $RAID_DEVICE"
  exit 1
fi

if ! mountpoint -q "$MOUNT_POINT"; then
  alert_once "raid_not_mounted" "[PRESSCO21][RAID] not mounted: $MOUNT_POINT"
  exit 1
fi

detail="$(mdadm --detail "$RAID_DEVICE" 2>&1 || true)"
if ! printf '%s\n' "$detail" | grep -q 'State :'; then
  alert_once "raid_detail_failed" "[PRESSCO21][RAID] mdadm detail failed for $RAID_DEVICE"
  exit 1
fi

raid_devices="$(printf '%s\n' "$detail" | awk -F: '/Raid Devices/ {gsub(/ /,"",$2); print $2; exit}')"
active_devices="$(printf '%s\n' "$detail" | awk -F: '/Active Devices/ {gsub(/ /,"",$2); print $2; exit}')"
failed_devices="$(printf '%s\n' "$detail" | awk -F: '/Failed Devices/ {gsub(/ /,"",$2); print $2; exit}')"

if [ "${raid_devices:-0}" != "${active_devices:-0}" ] || [ "${failed_devices:-0}" != "0" ]; then
  alert_once "raid_degraded" "[PRESSCO21][RAID] degraded ${active_devices:-?}/${raid_devices:-?}, failed=${failed_devices:-?}"
  exit 1
fi

if command -v btrfs >/dev/null 2>&1; then
  stats="$(btrfs device stats "$MOUNT_POINT" 2>&1 || true)"
  if printf '%s\n' "$stats" | awk '{if ($NF+0 > 0) bad=1} END {exit bad ? 0 : 1}'; then
    alert_once "btrfs_device_stats" "[PRESSCO21][RAID] btrfs device stats has non-zero errors on $MOUNT_POINT"
    exit 1
  fi
fi

free_summary="$(df -h "$MOUNT_POINT" | awk 'NR==2 {print $4 " free / " $2 " (" $5 " used)"}')"
log "RAID health OK: $RAID_DEVICE mounted=$MOUNT_POINT devices=${active_devices}/${raid_devices}, ${free_summary}"
mark_recovered "[PRESSCO21][RAID] RECOVERED host=${NODE_NAME} devices=${active_devices}/${raid_devices}"
