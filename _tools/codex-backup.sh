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

backup_dir="$(codex_create_backup "$session_file" "$label" "${paths[@]}")"

printf 'Backup created: %s\n' "$(codex_repo_rel "$backup_dir")"
