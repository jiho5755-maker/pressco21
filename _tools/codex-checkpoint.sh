#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/codex-common.sh"

usage() {
  cat <<'EOF'
Usage:
  bash pressco21/_tools/codex-checkpoint.sh [--session <log>] "<title>" "[note]"

Examples:
  bash pressco21/_tools/codex-checkpoint.sh "parser stable"
  bash pressco21/_tools/codex-checkpoint.sh --session output/codex-sessions/20260402-120000-crm.md "before deploy" "tests passed"
EOF
}

session_arg=""

while [ $# -gt 0 ]; do
  case "$1" in
    --session)
      session_arg="${2:-}"
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

if [ $# -lt 1 ]; then
  usage
  exit 1
fi

title="$1"
shift || true
note="${*:-}"

session_file="$(codex_resolve_session "$session_arg")"
timestamp="$(codex_now)"
git_status="$(codex_git_status)"
git_diff_stat="$(codex_git_diff_stat)"

{
  printf '\n## Checkpoint %s - %s\n' "$timestamp" "$title"
  if [ -n "$note" ]; then
    printf -- '- Note: %s\n' "$note"
  fi
  printf '\n### Git Diff Stat\n'
  printf '```text\n%s\n```\n' "$git_diff_stat"
  printf '\n### Git Status\n'
  printf '```text\n%s\n```\n' "$git_status"
} >> "$session_file"

printf 'Checkpoint appended: %s\n' "$(codex_repo_rel "$session_file")"
