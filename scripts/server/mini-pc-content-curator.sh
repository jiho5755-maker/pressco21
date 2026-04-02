#!/usr/bin/env bash
set -Eeuo pipefail

CONTENT_ROOT="${CONTENT_ROOT:-/srv/pressco21-content}"
INBOX_ROOT="${INBOX_ROOT:-${CONTENT_ROOT}/inbox}"
CATALOG_ROOT="${CATALOG_ROOT:-${CONTENT_ROOT}/catalog}"
QUARANTINE_ROOT="${QUARANTINE_ROOT:-${CONTENT_ROOT}/quarantine}"

FILE_SETTLE_MINUTES="${FILE_SETTLE_MINUTES:-20}"
LOG_DIR="${LOG_DIR:-/var/log/pressco21}"
LOG_FILE="${LOG_FILE:-${LOG_DIR}/mini-pc-content-curator.log}"
STATE_DIR="${STATE_DIR:-/var/lib/pressco21}"
LAST_RUN_FILE="${LAST_RUN_FILE:-${STATE_DIR}/mini-pc-content-curator.last}"
CATALOG_CSV="${CATALOG_CSV:-${CATALOG_ROOT}/content-index.csv}"
CATALOG_JSONL="${CATALOG_JSONL:-${CATALOG_ROOT}/content-index.jsonl}"
LATEST_SUMMARY_FILE="${LATEST_SUMMARY_FILE:-${CATALOG_ROOT}/latest-run.txt}"

BACKUP_NOTIFY_WEBHOOK="${BACKUP_NOTIFY_WEBHOOK:-https://n8n.pressco21.com/webhook/backup-notify}"
NODE_NAME="${NODE_NAME:-$(hostname)}"
NOTIFY_ON_SUCCESS="${NOTIFY_ON_SUCCESS:-0}"
NOTIFY_ON_FAILURE="${NOTIFY_ON_FAILURE:-1}"

MOVED_COUNT=0
MOVED_BYTES=0
MOVED_LABELS=()

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
    -d "{\"status\":\"${status}\",\"timestamp\":\"$(date '+%Y-%m-%dT%H:%M:%S%z')\",\"files\":${files_json},\"total_size\":\"${total_size}\",\"message\":\"${message}\",\"host\":\"${NODE_NAME}\",\"source\":\"mini-pc-content-curator\"}" >/dev/null 2>&1 || true
}

ensure_directories() {
  mkdir -p \
    "$INBOX_ROOT/youtube/raw" \
    "$INBOX_ROOT/youtube/project" \
    "$INBOX_ROOT/youtube/export" \
    "$INBOX_ROOT/reels/raw" \
    "$INBOX_ROOT/reels/project" \
    "$INBOX_ROOT/reels/export" \
    "$INBOX_ROOT/shared/brand-assets" \
    "$INBOX_ROOT/shared/subtitles" \
    "$INBOX_ROOT/shared/thumbnails" \
    "$CATALOG_ROOT" \
    "$QUARANTINE_ROOT" \
    "$STATE_DIR" \
    "$LOG_DIR"

  if [ ! -f "$CATALOG_CSV" ]; then
    echo "timestamp,source_rel,final_rel,channel,stage,size_bytes,sha256" >"$CATALOG_CSV"
  fi
}

classify_relative_path() {
  local rel_path="$1"

  case "$rel_path" in
    youtube/raw/*)
      printf 'youtube|raw|%s\n' "${rel_path#youtube/raw/}"
      ;;
    youtube/project/*)
      printf 'youtube|project|%s\n' "${rel_path#youtube/project/}"
      ;;
    youtube/export/*)
      printf 'youtube|export|%s\n' "${rel_path#youtube/export/}"
      ;;
    youtube/archive/*)
      printf 'youtube|archive|%s\n' "${rel_path#youtube/archive/}"
      ;;
    reels/raw/*)
      printf 'reels|raw|%s\n' "${rel_path#reels/raw/}"
      ;;
    reels/project/*)
      printf 'reels|project|%s\n' "${rel_path#reels/project/}"
      ;;
    reels/export/*)
      printf 'reels|export|%s\n' "${rel_path#reels/export/}"
      ;;
    reels/archive/*)
      printf 'reels|archive|%s\n' "${rel_path#reels/archive/}"
      ;;
    shared/brand-assets/*)
      printf 'shared|brand-assets|%s\n' "${rel_path#shared/brand-assets/}"
      ;;
    shared/subtitles/*)
      printf 'shared|subtitles|%s\n' "${rel_path#shared/subtitles/}"
      ;;
    shared/thumbnails/*)
      printf 'shared|thumbnails|%s\n' "${rel_path#shared/thumbnails/}"
      ;;
    *)
      printf 'quarantine|unclassified|%s\n' "$rel_path"
      ;;
  esac
}

build_target_dir() {
  local channel="$1"
  local stage="$2"
  local source_file="$3"
  local preserved_dir="$4"
  local year
  local month
  local base_dir

  year="$(date -r "$source_file" '+%Y')"
  month="$(date -r "$source_file" '+%Y-%m')"

  if [ "$channel" = "quarantine" ]; then
    base_dir="$QUARANTINE_ROOT"
  else
    base_dir="${CONTENT_ROOT}/${channel}/${stage}"
  fi

  if [ "$preserved_dir" = "." ]; then
    printf '%s/%s/%s\n' "$base_dir" "$year" "$month"
  else
    printf '%s/%s/%s/%s\n' "$base_dir" "$year" "$month" "$preserved_dir"
  fi
}

unique_target_path() {
  local target_dir="$1"
  local file_name="$2"
  local candidate
  local base_name
  local extension
  local counter

  candidate="${target_dir}/${file_name}"
  if [ ! -e "$candidate" ]; then
    printf '%s\n' "$candidate"
    return 0
  fi

  base_name="${file_name%.*}"
  extension=""
  if [ "$base_name" != "$file_name" ]; then
    extension=".${file_name##*.}"
  else
    base_name="$file_name"
  fi

  counter=1
  while :; do
    candidate="${target_dir}/${base_name}__dup${counter}${extension}"
    if [ ! -e "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
    counter=$((counter + 1))
  done
}

csv_escape() {
  local raw="$1"

  raw="${raw//\"/\"\"}"
  printf '"%s"' "$raw"
}

append_catalog_entry() {
  local timestamp="$1"
  local source_rel="$2"
  local final_rel="$3"
  local channel="$4"
  local stage="$5"
  local size_bytes="$6"
  local sha256="$7"

  printf '%s,%s,%s,%s,%s,%s,%s\n' \
    "$(csv_escape "$timestamp")" \
    "$(csv_escape "$source_rel")" \
    "$(csv_escape "$final_rel")" \
    "$(csv_escape "$channel")" \
    "$(csv_escape "$stage")" \
    "$(csv_escape "$size_bytes")" \
    "$(csv_escape "$sha256")" >>"$CATALOG_CSV"

  python3 - "$timestamp" "$source_rel" "$final_rel" "$channel" "$stage" "$size_bytes" "$sha256" >>"$CATALOG_JSONL" <<'PY'
import json
import sys

keys = [
    "timestamp",
    "source_rel",
    "final_rel",
    "channel",
    "stage",
    "size_bytes",
    "sha256",
]

payload = dict(zip(keys, sys.argv[1:]))
print(json.dumps(payload, ensure_ascii=False))
PY
}

process_file() {
  local source_file="$1"
  local rel_path
  local classification
  local channel
  local stage
  local tail_path
  local preserved_dir
  local file_name
  local target_dir
  local target_path
  local final_rel
  local size_bytes
  local sha256
  local moved_at

  rel_path="${source_file#${INBOX_ROOT}/}"
  classification="$(classify_relative_path "$rel_path")"
  channel="${classification%%|*}"
  classification="${classification#*|}"
  stage="${classification%%|*}"
  tail_path="${classification#*|}"

  preserved_dir="$(dirname "$tail_path")"
  file_name="$(basename "$tail_path")"
  target_dir="$(build_target_dir "$channel" "$stage" "$source_file" "$preserved_dir")"
  mkdir -p "$target_dir"
  target_path="$(unique_target_path "$target_dir" "$file_name")"

  log "move ${rel_path} -> ${target_path#${CONTENT_ROOT}/}"
  mv "$source_file" "$target_path"

  size_bytes="$(stat -c '%s' "$target_path")"
  sha256="$(sha256sum "$target_path" | awk '{print $1}')"
  moved_at="$(date '+%Y-%m-%dT%H:%M:%S%z')"

  if [[ "$target_path" = "${CONTENT_ROOT}/"* ]]; then
    final_rel="${target_path#${CONTENT_ROOT}/}"
  else
    final_rel="$(basename "$target_path")"
  fi

  append_catalog_entry "$moved_at" "$rel_path" "$final_rel" "$channel" "$stage" "$size_bytes" "$sha256"

  MOVED_COUNT=$((MOVED_COUNT + 1))
  MOVED_BYTES=$((MOVED_BYTES + size_bytes))
  MOVED_LABELS+=("${channel}:${stage}")
}

cleanup_empty_inbox_dirs() {
  find "$INBOX_ROOT" -depth -type d -empty -delete 2>/dev/null || true
  mkdir -p \
    "$INBOX_ROOT/youtube/raw" \
    "$INBOX_ROOT/youtube/project" \
    "$INBOX_ROOT/youtube/export" \
    "$INBOX_ROOT/reels/raw" \
    "$INBOX_ROOT/reels/project" \
    "$INBOX_ROOT/reels/export" \
    "$INBOX_ROOT/shared/brand-assets" \
    "$INBOX_ROOT/shared/subtitles" \
    "$INBOX_ROOT/shared/thumbnails"
}

write_summary() {
  local files_json
  local joined_labels

  joined_labels="$(printf '%s\n' "${MOVED_LABELS[@]:-}" | awk 'NF {count[$0]++} END {for (key in count) printf "%s=%s ", key, count[key]}')"
  files_json="$(printf '%s\n' "${MOVED_LABELS[@]:-}" | awk 'NF {count[$0]++} END {printf "["; first=1; for (key in count) {if (!first) printf ","; printf "\"%s:%s\"", key, count[key]; first=0} printf "]"}')"
  if [ -z "$files_json" ]; then
    files_json="[]"
  fi

  {
    echo "timestamp=$(date '+%Y-%m-%dT%H:%M:%S%z')"
    echo "moved_count=${MOVED_COUNT}"
    echo "moved_bytes=${MOVED_BYTES}"
    echo "labels=${joined_labels:-none}"
  } >"$LATEST_SUMMARY_FILE"

  date '+%Y-%m-%dT%H:%M:%S%z' >"$LAST_RUN_FILE"

  if [ "$MOVED_COUNT" -gt 0 ] && [ "$NOTIFY_ON_SUCCESS" = "1" ]; then
    notify_webhook \
      "success" \
      "[PRESSCO21][CONTENT] SUCCESS host=${NODE_NAME} moved=${MOVED_COUNT} bytes=${MOVED_BYTES}" \
      "$files_json" \
      "$MOVED_BYTES"
  fi

  log "content curation complete: moved=${MOVED_COUNT}, bytes=${MOVED_BYTES}, labels=${joined_labels:-none}"
}

on_error() {
  local exit_code="$1"
  local line_no="$2"
  local message

  message="[PRESSCO21][CONTENT] FAILED host=${NODE_NAME} code=${exit_code} line=${line_no}"
  log "$message"
  if [ "$NOTIFY_ON_FAILURE" = "1" ]; then
    notify_webhook "error" "$message" "[]" "0"
  fi
  exit "$exit_code"
}

trap 'on_error $? $LINENO' ERR

main() {
  local file

  ensure_directories
  log "content curation start (inbox=${INBOX_ROOT}, settle_minutes=${FILE_SETTLE_MINUTES})"

  while IFS= read -r -d '' file; do
    process_file "$file"
  done < <(find "$INBOX_ROOT" -type f -mmin +"$FILE_SETTLE_MINUTES" -print0 | sort -z)

  cleanup_empty_inbox_dirs
  write_summary
}

main "$@"
