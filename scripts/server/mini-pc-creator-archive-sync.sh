#!/usr/bin/env bash
set -Eeuo pipefail

ACTIVE_ROOT="${ACTIVE_ROOT:-/mnt/pressco21-ssd/PRESSCO21_ACTIVE}"
ARCHIVE_ROOT="${ARCHIVE_ROOT:-/mnt/pressco21-hdd/PRESSCO21_ARCHIVE}"

LOG_DIR="${LOG_DIR:-/var/log/pressco21}"
LOG_FILE="${LOG_FILE:-${LOG_DIR}/mini-pc-creator-archive-sync.log}"
STATE_DIR="${STATE_DIR:-/var/lib/pressco21}"
LATEST_SUMMARY_FILE="${LATEST_SUMMARY_FILE:-${STATE_DIR}/creator-archive-sync.latest}"

MINIO_STAGE_ROOT="${MINIO_STAGE_ROOT:-${ACTIVE_ROOT}/publish/minio-stage}"
MINIO_READY_ROOT="${MINIO_READY_ROOT:-${ACTIVE_ROOT}/publish/minio-ready}"
MINIO_ARCHIVE_ROOT="${MINIO_ARCHIVE_ROOT:-${ARCHIVE_ROOT}/publish/minio-history}"

SYNC_TARGETS=(
  "editors:${ACTIVE_ROOT}/editors:${ARCHIVE_ROOT}/editors"
  "designers:${ACTIVE_ROOT}/designers:${ARCHIVE_ROOT}/designers"
  "shared:${ACTIVE_ROOT}/shared:${ARCHIVE_ROOT}/shared"
  "publish:${ACTIVE_ROOT}/publish:${ARCHIVE_ROOT}/publish"
)

TOTAL_FILES=0
TOTAL_BYTES=0

log() {
  mkdir -p "$LOG_DIR"
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "$LOG_FILE"
}

ensure_path() {
  local path="$1"

  if [ ! -d "$path" ]; then
    echo "path not found: $path" >&2
    exit 1
  fi
}

sync_one() {
  local label="$1"
  local source_root="$2"
  local target_root="$3"
  local before_files
  local before_bytes
  local after_files
  local after_bytes

  mkdir -p "$target_root"

  before_files="$(find "$target_root" -type f 2>/dev/null | wc -l | tr -d ' ')"
  before_bytes="$(du -sb "$target_root" 2>/dev/null | awk '{print $1}')"

  rsync -a \
    --update \
    --exclude='.stfolder' \
    --exclude='.stignore' \
    --exclude='.stversions' \
    --exclude='.syncthing.*' \
    --exclude='*.tmp' \
    "${source_root}/" "${target_root}/"

  after_files="$(find "$target_root" -type f 2>/dev/null | wc -l | tr -d ' ')"
  after_bytes="$(du -sb "$target_root" 2>/dev/null | awk '{print $1}')"

  TOTAL_FILES=$((TOTAL_FILES + after_files))
  TOTAL_BYTES=$((TOTAL_BYTES + after_bytes))

  log "${label}: files ${before_files} -> ${after_files}, bytes ${before_bytes} -> ${after_bytes}"
}

write_summary() {
  mkdir -p "$STATE_DIR"

  cat >"$LATEST_SUMMARY_FILE" <<EOF
timestamp=$(date '+%Y-%m-%dT%H:%M:%S%z')
active_root=${ACTIVE_ROOT}
archive_root=${ARCHIVE_ROOT}
minio_stage_root=${MINIO_STAGE_ROOT}
minio_ready_root=${MINIO_READY_ROOT}
minio_archive_root=${MINIO_ARCHIVE_ROOT}
total_files=${TOTAL_FILES}
total_bytes=${TOTAL_BYTES}
EOF
}

main() {
  local entry
  local label
  local source_root
  local target_root

  ensure_path "$ACTIVE_ROOT"
  ensure_path "$ARCHIVE_ROOT"
  ensure_path "$MINIO_STAGE_ROOT"
  ensure_path "$MINIO_READY_ROOT"
  mkdir -p "$MINIO_ARCHIVE_ROOT"

  for entry in "${SYNC_TARGETS[@]}"; do
    label="${entry%%:*}"
    source_root="${entry#*:}"
    source_root="${source_root%%:*}"
    target_root="${entry##*:}"
    sync_one "$label" "$source_root" "$target_root"
  done

  write_summary
  log "creator archive sync complete"
}

main "$@"
