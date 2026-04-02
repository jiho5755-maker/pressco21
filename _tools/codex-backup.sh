#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/codex-common.sh"

usage() {
  cat <<'EOF'
Usage:
  bash pressco21/_tools/codex-backup.sh [--session <log>] --label "<label>" <path> [path...]

Examples:
  bash pressco21/_tools/codex-backup.sh --label "before-deploy" offline-crm-v2/deploy scripts/deploy-crm-deposit-telegram.js
  bash pressco21/_tools/codex-backup.sh --session output/codex-sessions/20260402-120000-crm.md --label "checkpoint-1" _tools docs/codex-vibe-routine.md
EOF
}

session_arg=""
label=""

while [ $# -gt 0 ]; do
  case "$1" in
    --session)
      session_arg="${2:-}"
      shift 2
      ;;
    --label)
      label="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      break
      ;;
  esac
done

if [ -z "$label" ] || [ $# -lt 1 ]; then
  usage
  exit 1
fi

session_file="$(codex_resolve_session "$session_arg")"
paths=("$@")

codex_ensure_dirs
codex_require_paths_exist "${paths[@]}"

backup_id="$(codex_stamp)-$(codex_slugify "$label")"
backup_dir="$CODEX_BACKUP_DIR/$backup_id"
archive_file="$backup_dir/snapshot.tgz"
patch_file="$backup_dir/changes.patch"
status_file="$backup_dir/status.txt"
manifest_file="$backup_dir/manifest.txt"

mkdir -p "$backup_dir"

git -C "$CODEX_REPO_ROOT" status --short -- "${paths[@]}" > "$status_file" || true
git -C "$CODEX_REPO_ROOT" diff --binary -- "${paths[@]}" > "$patch_file" || true
tar -czf "$archive_file" -C "$CODEX_REPO_ROOT" "${paths[@]}"

{
  printf 'Backup ID: %s\n' "$backup_id"
  printf 'Created At: %s\n' "$(codex_now)"
  printf 'Session Log: %s\n' "$(codex_repo_rel "$session_file")"
  printf 'Label: %s\n' "$label"
  printf 'Paths:\n'
  printf '%s\n' "${paths[@]}"
} > "$manifest_file"

if command -v shasum >/dev/null 2>&1; then
  (
    cd "$backup_dir"
    shasum -a 256 snapshot.tgz changes.patch status.txt manifest.txt > checksums.txt
  )
fi

{
  printf '\n## Backup %s - %s\n' "$(codex_now)" "$label"
  printf -- '- Folder: %s\n' "$(codex_repo_rel "$backup_dir")"
  printf -- '- Archive: %s\n' "$(codex_repo_rel "$archive_file")"
  printf -- '- Patch: %s\n' "$(codex_repo_rel "$patch_file")"
  printf -- '- Paths: %s\n' "$(codex_join_by ', ' "${paths[@]}")"
} >> "$session_file"

printf 'Backup created: %s\n' "$(codex_repo_rel "$backup_dir")"
