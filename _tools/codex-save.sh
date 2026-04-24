#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

usage() {
  cat <<'EOF'
Usage:
  save "<summary>" "<next step>" [--risk "<risk>"] [--label "<label>"] [--backup-label "<label>"]
    [--session <log>] [--scope <scope> --subdirectory <scope-path>] [path...]
  save --raw [original codex-update.sh args...]

Examples:
  save "migration-check paused" "continue with missing govt-support paths"
  save "accounting audit done" "patch the alert parser" --risk "two fixtures still failing" n8n-automation/workflows/accounting scripts
  save --raw --summary "manual mode" --next "resume later" docs
EOF
}

if [ $# -lt 1 ]; then
  usage
  exit 1
fi

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  usage
  exit 0
fi

if [ "${1:-}" = "--raw" ]; then
  shift
  exec bash "$SCRIPT_DIR/codex-update.sh" "$@"
fi

if [ $# -lt 2 ]; then
  usage
  exit 1
fi

summary="$1"
next_step="$2"
shift 2

forwarded=()
paths=()

while [ $# -gt 0 ]; do
  case "$1" in
    --risk|--label|--backup-label|--session|--scope|--subdirectory)
      if [ $# -lt 2 ]; then
        echo "Missing value for $1" >&2
        exit 1
      fi
      forwarded+=("$1" "$2")
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      paths+=("$1")
      shift
      ;;
  esac
done

cmd=(
  bash "$SCRIPT_DIR/codex-update.sh"
  --summary "$summary"
  --next "$next_step"
)

if [ ${#forwarded[@]} -gt 0 ]; then
  cmd+=("${forwarded[@]}")
fi

if [ ${#paths[@]} -gt 0 ]; then
  exec "${cmd[@]}" "${paths[@]}"
else
  exec "${cmd[@]}"
fi
