#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

usage() {
  cat <<'EOF'
Usage:
  bash pressco21/_tools/codex-branchpoint.sh [--session <log>] --label "<label>" <path> [path...]

Examples:
  bash pressco21/_tools/codex-branchpoint.sh --label "before-live-rewire" n8n-automation/workflows/accounting scripts
  bash pressco21/_tools/codex-branchpoint.sh --session output/codex-sessions/20260407-200211-omx-overlay-n8n-presets.md --label "before-refactor" offline-crm-v2/src
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

cmd=(bash "$SCRIPT_DIR/codex-update.sh")
if [ -n "$session_arg" ]; then
  cmd+=(--session "$session_arg")
fi

cmd+=(
  --label "branchpoint-$label"
  --backup-label "$label"
  --summary "branchpoint saved: $label"
  --next "continue from branchpoint '$label' or roll back from the saved patch/archive if the next edit fails"
  --risk "rollback snapshot captured for the selected scope"
)

exec "${cmd[@]}" "$@"
