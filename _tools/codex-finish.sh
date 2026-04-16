#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/codex-common.sh"

usage() {
  cat <<'EOF'
Usage:
  bash pressco21/_tools/codex-finish.sh [--session <log>] --summary "<summary>" --next "<next step>" [--risk "<risk>"]

Example:
  bash pressco21/_tools/codex-finish.sh --summary "crm auth patch ready" --next "wait for next real deposit" --risk "4 unmatched deposits remain"
EOF
}

session_arg=""
summary=""
next_step=""
risk=""

while [ $# -gt 0 ]; do
  case "$1" in
    --session)
      session_arg="${2:-}"
      shift 2
      ;;
    --summary)
      summary="${2:-}"
      shift 2
      ;;
    --next)
      next_step="${2:-}"
      shift 2
      ;;
    --risk)
      risk="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage
      exit 1
      ;;
  esac
done

if [ -z "$summary" ] || [ -z "$next_step" ]; then
  usage
  exit 1
fi

session_file="$(codex_resolve_session "$session_arg")"
timestamp="$(codex_now)"
git_status="$(codex_git_status)"
git_diff_stat="$(codex_git_diff_stat)"

{
  printf '\n## Finish %s\n' "$timestamp"
  printf -- '- Status: closed\n'
  printf -- '- Summary: %s\n' "$summary"
  printf -- '- Next Step: %s\n' "$next_step"
  if [ -n "$risk" ]; then
    printf -- '- Risks: %s\n' "$risk"
  fi
  printf '\n### Final Git Diff Stat\n'
  printf '```text\n%s\n```\n' "$git_diff_stat"
  printf '\n### Final Git Status\n'
  printf '```text\n%s\n```\n' "$git_status"
} >> "$session_file"

printf 'Session closed: %s\n' "$(codex_repo_rel "$session_file")"
printf '\nNext: run bash _tools/pressco21-check.sh, commit allowed paths, then merge the task branch into main after verification.\n'
printf -- '- Summary: %s\n' "$summary"
printf -- '- Next Step: %s\n' "$next_step"
if [ -n "$risk" ]; then
  printf -- '- Risks: %s\n' "$risk"
fi
