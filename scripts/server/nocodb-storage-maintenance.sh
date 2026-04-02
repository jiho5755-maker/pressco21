#!/usr/bin/env bash
set -Eeuo pipefail

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_ROOT="${BACKUP_ROOT:-/home/ubuntu/backups}"
MONTHLY_ROOT="${MONTHLY_ROOT:-${BACKUP_ROOT}/monthly}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
MONTHLY_RETENTION_MONTHS="${MONTHLY_RETENTION_MONTHS:-3}"

NOCODB_HOST_DATA_DIR="${NOCODB_HOST_DATA_DIR:-/home/ubuntu/nocodb/nocodb_data}"
PRE_SNAPSHOT_KEEP_LATEST="${PRE_SNAPSHOT_KEEP_LATEST:-3}"
BAK_SNAPSHOT_KEEP_LATEST="${BAK_SNAPSHOT_KEEP_LATEST:-1}"
DRY_RUN="${DRY_RUN:-0}"

LOG_DIR="${LOG_DIR:-/home/ubuntu/logs}"
LOG_FILE="${LOG_FILE:-${LOG_DIR}/storage-maintenance.log}"

log() {
  mkdir -p "$LOG_DIR"
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "$LOG_FILE"
}

run_rm() {
  if [ "$DRY_RUN" = "1" ]; then
    log "[dry-run] rm -rf $*"
    return 0
  fi

  rm -rf "$@"
}

prune_backup_directories() {
  local target

  while IFS= read -r target; do
    [ -n "$target" ] || continue
    run_rm "$target"
  done < <(
    find "$BACKUP_ROOT" \
      -maxdepth 1 \
      -mindepth 1 \
      -type d \
      -name '20??????_??????' \
      -mtime +"$RETENTION_DAYS" \
      | sort
  )
}

prune_monthly_archives() {
  local target
  local retention_days

  retention_days="$((MONTHLY_RETENTION_MONTHS * 31))"
  mkdir -p "$MONTHLY_ROOT"

  while IFS= read -r target; do
    [ -n "$target" ] || continue
    run_rm "$target"
  done < <(
    find "$MONTHLY_ROOT" \
      -maxdepth 1 \
      -mindepth 1 \
      -type d \
      -name '20????' \
      -mtime +"$retention_days" \
      | sort
  )
}

prune_snapshot_group() {
  local pattern="$1"
  local keep_latest="$2"
  local index=0
  local line
  local path

  while IFS= read -r line; do
    [ -n "$line" ] || continue
    path="${line#* }"
    index=$((index + 1))

    if [ "$index" -le "$keep_latest" ]; then
      log "보존: ${path}"
      continue
    fi

    run_rm "$path"
  done < <(
    find "$NOCODB_HOST_DATA_DIR" \
      -maxdepth 1 \
      -type f \
      -name "$pattern" \
      -printf '%T@ %p\n' \
      | sort -nr
  )
}

report_storage_summary() {
  local root_usage
  local backup_usage
  local nocodb_usage
  local snapshot_usage

  root_usage="$(df -h / | awk 'NR==2{print $3 " / " $2 " (" $5 ")"}')"
  backup_usage="$(du -sh "$BACKUP_ROOT" 2>/dev/null | awk '{print $1}')"
  nocodb_usage="$(du -sh "$NOCODB_HOST_DATA_DIR" 2>/dev/null | awk '{print $1}')"
  snapshot_usage="$(find "$NOCODB_HOST_DATA_DIR" -maxdepth 1 -type f \( -name 'noco.db.pre-*' -o -name 'noco.db.bak_*' \) -exec du -ch {} + 2>/dev/null | awk '/total$/ {print $1}')"

  log "요약: root=${root_usage}, backups=${backup_usage:-0}, nocodb=${nocodb_usage:-0}, snapshots=${snapshot_usage:-0}"
}

main() {
  [ -d "$BACKUP_ROOT" ]
  [ -d "$NOCODB_HOST_DATA_DIR" ]

  log "NocoDB 스토리지 정리 시작 (dry_run=${DRY_RUN})"
  prune_backup_directories
  prune_monthly_archives
  prune_snapshot_group 'noco.db.pre-*' "$PRE_SNAPSHOT_KEEP_LATEST"
  prune_snapshot_group 'noco.db.bak_*' "$BAK_SNAPSHOT_KEEP_LATEST"
  report_storage_summary
  log "NocoDB 스토리지 정리 완료"
}

main "$@"
