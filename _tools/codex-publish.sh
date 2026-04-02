#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/codex-common.sh"

usage() {
  cat <<'EOF'
Usage:
  bash pressco21/_tools/codex-publish.sh [--session <log>] [--remote <name>] [--allow-dirty] [--dry-run]

Examples:
  bash pressco21/_tools/codex-publish.sh
  bash pressco21/_tools/codex-publish.sh --session output/codex-sessions/20260402-120000-crm.md --dry-run
EOF
}

session_arg=""
remote_name="origin"
allow_dirty=0
dry_run=0

while [ $# -gt 0 ]; do
  case "$1" in
    --session)
      session_arg="${2:-}"
      shift 2
      ;;
    --remote)
      remote_name="${2:-}"
      shift 2
      ;;
    --allow-dirty)
      allow_dirty=1
      shift
      ;;
    --dry-run)
      dry_run=1
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

session_file=""
if [ -n "$session_arg" ]; then
  session_file="$(codex_resolve_session "$session_arg")"
fi

branch="$(codex_current_branch)"

if [ $allow_dirty -ne 1 ] && [ -n "$(git -C "$CODEX_REPO_ROOT" status --short || true)" ]; then
  echo "Working tree is dirty. Publish helper is blocked unless --allow-dirty is used." >&2
  exit 1
fi

if ! git -C "$CODEX_REPO_ROOT" remote get-url "$remote_name" >/dev/null 2>&1; then
  echo "Remote not found: $remote_name" >&2
  exit 1
fi

upstream=""
if git -C "$CODEX_REPO_ROOT" rev-parse --abbrev-ref --symbolic-full-name "@{u}" >/dev/null 2>&1; then
  upstream="$(git -C "$CODEX_REPO_ROOT" rev-parse --abbrev-ref --symbolic-full-name "@{u}")"
fi

printf 'Branch: %s\n' "$branch"
printf 'Remote: %s\n' "$remote_name"
if [ -n "$upstream" ]; then
  printf 'Upstream: %s\n' "$upstream"
  printf 'Ahead/Behind: '
  git -C "$CODEX_REPO_ROOT" rev-list --left-right --count "$upstream...HEAD"
else
  printf 'Upstream: (none)\n'
fi

latest_commit="$(git -C "$CODEX_REPO_ROOT" log -1 --oneline)"
printf 'Latest commit: %s\n' "$latest_commit"

if [ $dry_run -eq 1 ]; then
  if [ -n "$upstream" ]; then
    git -C "$CODEX_REPO_ROOT" push --dry-run "$remote_name" "$branch"
  else
    git -C "$CODEX_REPO_ROOT" push --dry-run -u "$remote_name" "$branch"
  fi
  printf '\nDry run only. Nothing was pushed.\n'
  exit 0
fi

if [ -n "$upstream" ]; then
  git -C "$CODEX_REPO_ROOT" push "$remote_name" "$branch"
else
  git -C "$CODEX_REPO_ROOT" push -u "$remote_name" "$branch"
fi

codex_append_session_note "$session_file" "
## Publish $(codex_now)
- Remote: $remote_name
- Branch: $branch
- Commit: $latest_commit"

printf '\nPublished: %s -> %s/%s\n' "$latest_commit" "$remote_name" "$branch"
