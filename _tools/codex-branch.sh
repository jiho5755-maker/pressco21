#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

usage() {
  cat <<'EOF'
Usage:
  branch "<label>" <path> [path...]
  branch [--session <log>] "<label>" <path> [path...]
  branch --raw [original codex-branchpoint.sh args...]

Examples:
  branch "before-live-rewire" n8n-automation/workflows/accounting scripts
  branch --session output/codex-sessions/20260407-200211-omx-overlay-n8n-presets.md "before-refactor" offline-crm-v2/src
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
  exec bash "$SCRIPT_DIR/codex-branchpoint.sh" "$@"
fi

forwarded=()

while [ $# -gt 0 ]; do
  case "$1" in
    --session)
      if [ $# -lt 2 ]; then
        echo "Missing value for $1" >&2
        exit 1
      fi
      forwarded+=("$1" "$2")
      shift 2
      ;;
    *)
      break
      ;;
  esac
done

if [ $# -lt 2 ]; then
  usage
  exit 1
fi

label="$1"
shift
paths=("$@")

cmd=(bash "$SCRIPT_DIR/codex-branchpoint.sh")
if [ ${#forwarded[@]} -gt 0 ]; then
  cmd+=("${forwarded[@]}")
fi
cmd+=(--label "$label")

exec "${cmd[@]}" "${paths[@]}"
