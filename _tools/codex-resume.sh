#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/codex-common.sh"

usage() {
  cat <<'EOF'
Usage:
  bash pressco21/_tools/codex-resume.sh [--handoff <note>] [--session <log>] [--show-full]

Examples:
  bash pressco21/_tools/codex-resume.sh
  bash pressco21/_tools/codex-resume.sh --handoff 20260407-200211-before-chat-switch.md
  bash pressco21/_tools/codex-resume.sh --show-full
EOF
}

handoff_arg=""
session_arg=""
show_full=0

while [ $# -gt 0 ]; do
  case "$1" in
    --handoff)
      handoff_arg="${2:-}"
      shift 2
      ;;
    --session)
      session_arg="${2:-}"
      shift 2
      ;;
    --show-full)
      show_full=1
      shift
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

handoff_file=""
latest_handoff="$(codex_latest_handoff)"
if [ -n "$handoff_arg" ] || [ -n "$latest_handoff" ]; then
  handoff_file="$(codex_resolve_handoff "$handoff_arg")"
fi

session_file=""
if [ -n "$session_arg" ]; then
  session_file="$(codex_resolve_session "$session_arg")"
else
  latest_session="$(codex_latest_session)"
  if [ -n "$latest_session" ]; then
    session_file="$latest_session"
  fi
fi

branch="$(codex_git_branch)"
head_commit="$(codex_git_head_short)"
branch_scope="$(codex_branch_scope)"
omx_status="$(codex_omx_status)"

printf '== Codex Resume ==\n'
printf 'Branch: %s\n' "$branch"
printf 'Head Commit: %s\n' "$head_commit"
printf 'Branch Scope: %s\n' "$branch_scope"
printf 'OMX Status: %s\n' "$omx_status"

if [ -n "$session_file" ]; then
  printf 'Latest Session: %s\n' "$(codex_repo_rel "$session_file")"
fi

if [ -n "$handoff_file" ]; then
  printf 'Latest Handoff: %s\n' "$(codex_repo_rel "$handoff_file")"
  printf '\nHandoff Summary\n'
  sed -n 's/^- Summary: //p' "$handoff_file" | head -n 1 | sed 's/^/  - /'
  sed -n 's/^- Next Step: //p' "$handoff_file" | head -n 1 | sed 's/^/  - Next: /'
  sed -n 's/^- Risk: //p' "$handoff_file" | head -n 1 | sed 's/^/  - Risk: /'
  sed -n 's/^- Backup Folder: //p' "$handoff_file" | head -n 1 | sed 's/^/  - Backup: /'
  printf '\nSuggested Prompt\n'
  printf '  이전 Codex 세션을 이어가자. 업데이트 노트 `%s`와 세션 로그 `%s` 기준으로 다음 작업부터 진행해줘.\n' \
    "$(codex_repo_rel "$handoff_file")" \
    "${session_file:+$(codex_repo_rel "$session_file")}"

  if [ $show_full -eq 1 ]; then
    printf '\n== Full Handoff ==\n'
    cat "$handoff_file"
  fi
else
  printf 'Latest Handoff: (none)\n'
  printf '\nSuggested Prompt\n'
  printf '  이전 Codex 세션을 이어가자. 최신 session log와 현재 branch/worktree scope부터 확인하고 이어서 진행해줘.\n'
fi
