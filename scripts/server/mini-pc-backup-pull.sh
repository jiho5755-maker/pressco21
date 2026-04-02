#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE_HOST="${SOURCE_HOST:-ubuntu@pressco21-automation}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/oracle-n8n.key}"
SOURCE_BACKUP_ROOT="${SOURCE_BACKUP_ROOT:-/home/ubuntu/backups}"
SOURCE_MONTHLY_ROOT="${SOURCE_MONTHLY_ROOT:-${SOURCE_BACKUP_ROOT}/monthly}"

LOCAL_ROOT="${LOCAL_ROOT:-/srv/pressco21-backup-node/oracle}"
LOCAL_DAILY_ROOT="${LOCAL_DAILY_ROOT:-${LOCAL_ROOT}/daily}"
LOCAL_MONTHLY_ROOT="${LOCAL_MONTHLY_ROOT:-${LOCAL_ROOT}/monthly}"
LOCAL_STATE_ROOT="${LOCAL_STATE_ROOT:-${LOCAL_ROOT}/state}"

MIN_BACKUP_AGE_MINUTES="${MIN_BACKUP_AGE_MINUTES:-90}"
LOCAL_RETENTION_DAYS="${LOCAL_RETENTION_DAYS:-180}"
LOCAL_MONTHLY_RETENTION_MONTHS="${LOCAL_MONTHLY_RETENTION_MONTHS:-12}"
MIN_FREE_GB="${MIN_FREE_GB:-30}"
DRY_RUN="${DRY_RUN:-0}"

LOG_DIR="${LOG_DIR:-/var/log/pressco21}"
LOG_FILE="${LOG_FILE:-${LOG_DIR}/mini-pc-backup-pull.log}"
LAST_SYNC_FILE="${LAST_SYNC_FILE:-${LOCAL_STATE_ROOT}/last-sync.txt}"
BACKUP_NOTIFY_WEBHOOK="${BACKUP_NOTIFY_WEBHOOK:-https://n8n.pressco21.com/webhook/backup-notify}"
NODE_NAME="${NODE_NAME:-$(hostname)}"
NOTIFY_ON_SUCCESS="${NOTIFY_ON_SUCCESS:-1}"
NOTIFY_ON_FAILURE="${NOTIFY_ON_FAILURE:-1}"

SSH_OPTS=(
  -i "$SSH_KEY"
  -o BatchMode=yes
  -o StrictHostKeyChecking=accept-new
  -o ConnectTimeout=15
)

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
    -d "{\"status\":\"${status}\",\"timestamp\":\"$(date '+%Y-%m-%dT%H:%M:%S%z')\",\"files\":${files_json},\"total_size\":\"${total_size}\",\"message\":\"${message}\",\"host\":\"${NODE_NAME}\",\"source\":\"mini-pc-backup\"}" >/dev/null 2>&1 || true
}

remote_exec() {
  ssh "${SSH_OPTS[@]}" "$SOURCE_HOST" "$@"
}

run_rsync() {
  if [ "$DRY_RUN" = "1" ]; then
    log "[dry-run] rsync $*"
    return 0
  fi

  rsync "$@"
}

run_rm() {
  if [ "$DRY_RUN" = "1" ]; then
    log "[dry-run] rm -rf $*"
    return 0
  fi

  rm -rf "$@"
}

ensure_directories() {
  mkdir -p "$LOCAL_DAILY_ROOT" "$LOCAL_MONTHLY_ROOT" "$LOCAL_STATE_ROOT" "$LOG_DIR"
}

check_local_space() {
  local available_gb

  available_gb="$(df -BG "$LOCAL_ROOT" | awk 'NR==2 {gsub(/G/, "", $4); print $4}')"
  if [ -z "$available_gb" ]; then
    log "가용 디스크 확인 실패"
    return 1
  fi

  if [ "$available_gb" -lt "$MIN_FREE_GB" ]; then
    log "가용 디스크 부족: ${available_gb}GB 남음 (최소 ${MIN_FREE_GB}GB 필요)"
    return 1
  fi

  log "가용 디스크 확인 완료: ${available_gb}GB 남음"
}

list_remote_daily_backups() {
  remote_exec "find '$SOURCE_BACKUP_ROOT' -maxdepth 1 -mindepth 1 -type d -name '20??????_??????' -mmin +$MIN_BACKUP_AGE_MINUTES -printf '%f\n' | sort"
}

sync_daily_backups() {
  local backup_name
  local synced=0

  while IFS= read -r backup_name; do
    [ -n "$backup_name" ] || continue

    log "일일 백업 동기화: ${backup_name}"
    mkdir -p "${LOCAL_DAILY_ROOT}/${backup_name}"
    run_rsync \
      -a \
      --partial \
      -e "ssh ${SSH_OPTS[*]}" \
      "${SOURCE_HOST}:${SOURCE_BACKUP_ROOT}/${backup_name}/" \
      "${LOCAL_DAILY_ROOT}/${backup_name}/"
    synced=$((synced + 1))
  done < <(list_remote_daily_backups)

  log "일일 백업 동기화 완료: ${synced}건"
}

sync_monthly_backups() {
  log "월간 백업 동기화 시작"
  mkdir -p "$LOCAL_MONTHLY_ROOT"
  run_rsync \
    -a \
    --partial \
    -e "ssh ${SSH_OPTS[*]}" \
    "${SOURCE_HOST}:${SOURCE_MONTHLY_ROOT}/" \
    "${LOCAL_MONTHLY_ROOT}/"
  log "월간 백업 동기화 완료"
}

prune_local_daily_backups() {
  local target

  while IFS= read -r target; do
    [ -n "$target" ] || continue
    log "오래된 일일 백업 정리: ${target}"
    run_rm "$target"
  done < <(
    find "$LOCAL_DAILY_ROOT" \
      -maxdepth 1 \
      -mindepth 1 \
      -type d \
      -name '20??????_??????' \
      -mtime +"$LOCAL_RETENTION_DAYS" \
      | sort
  )
}

prune_local_monthly_backups() {
  local target
  local retention_days

  retention_days="$((LOCAL_MONTHLY_RETENTION_MONTHS * 31))"
  while IFS= read -r target; do
    [ -n "$target" ] || continue
    log "오래된 월간 백업 정리: ${target}"
    run_rm "$target"
  done < <(
    find "$LOCAL_MONTHLY_ROOT" \
      -maxdepth 1 \
      -mindepth 1 \
      -type d \
      -name '20????' \
      -mtime +"$retention_days" \
      | sort
  )
}

write_sync_state() {
  local total_daily
  local total_monthly
  local disk_summary

  total_daily="$(find "$LOCAL_DAILY_ROOT" -maxdepth 1 -mindepth 1 -type d -name '20??????_??????' | wc -l | awk '{print $1}')"
  total_monthly="$(find "$LOCAL_MONTHLY_ROOT" -maxdepth 1 -mindepth 1 -type d -name '20????' | wc -l | awk '{print $1}')"
  disk_summary="$(df -h "$LOCAL_ROOT" | awk 'NR==2 {print $3 " / " $2 " (" $5 ")"}')"

  {
    echo "timestamp=$(date '+%Y-%m-%dT%H:%M:%S%z')"
    echo "source_host=${SOURCE_HOST}"
    echo "local_root=${LOCAL_ROOT}"
    echo "daily_count=${total_daily}"
    echo "monthly_count=${total_monthly}"
    echo "disk_usage=${disk_summary}"
  } >"$LAST_SYNC_FILE"

  log "동기화 상태 기록 완료: daily=${total_daily}, monthly=${total_monthly}, disk=${disk_summary}"
}

notify_success() {
  local total_daily
  local total_monthly
  local disk_summary
  local total_size
  local files_json
  local message

  if [ "$NOTIFY_ON_SUCCESS" != "1" ]; then
    return 0
  fi

  total_daily="$(find "$LOCAL_DAILY_ROOT" -maxdepth 1 -mindepth 1 -type d -name '20??????_??????' | wc -l | awk '{print $1}')"
  total_monthly="$(find "$LOCAL_MONTHLY_ROOT" -maxdepth 1 -mindepth 1 -type d -name '20????' | wc -l | awk '{print $1}')"
  disk_summary="$(df -h "$LOCAL_ROOT" | awk 'NR==2 {print $3 "/" $2 " " $5}')"
  total_size="$(du -sh "$LOCAL_ROOT" 2>/dev/null | awk '{print $1}')"
  files_json="[\"daily:${total_daily}\",\"monthly:${total_monthly}\"]"
  message="[PRESSCO21][MINI-PC-BACKUP] SUCCESS host=${NODE_NAME} daily=${total_daily} monthly=${total_monthly} disk=${disk_summary}"
  notify_webhook "success" "$message" "$files_json" "${total_size:-0}"
}

on_error() {
  local exit_code="$1"
  local line_no="$2"
  local message

  message="[PRESSCO21][MINI-PC-BACKUP] FAILED host=${NODE_NAME} code=${exit_code} line=${line_no}"
  log "미니PC 장기 백업 실패: code=${exit_code}, line=${line_no}"
  if [ "$NOTIFY_ON_FAILURE" = "1" ]; then
    notify_webhook "error" "$message" "[]" "0"
  fi
  exit "$exit_code"
}

trap 'on_error $? $LINENO' ERR

main() {
  ensure_directories
  check_local_space
  log "미니PC 장기 백업 pull 시작 (source=${SOURCE_HOST}, dry_run=${DRY_RUN})"
  sync_daily_backups
  sync_monthly_backups
  prune_local_daily_backups
  prune_local_monthly_backups
  write_sync_state
  notify_success
  log "미니PC 장기 백업 pull 완료"
}

main "$@"
