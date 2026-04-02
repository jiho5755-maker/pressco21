#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/codex-common.sh"

ai_sync_file="$CODEX_REPO_ROOT/AI_SYNC.md"
owner="$(sed -n 's/^- Current Owner: //p' "$ai_sync_file" | head -n 1)"
mode="$(sed -n 's/^- Mode: //p' "$ai_sync_file" | head -n 1)"
branch="$(codex_git_branch)"
dirty_count="$(git -C "$CODEX_REPO_ROOT" status --short | wc -l | tr -d ' ')"

printf '== Codex Preflight ==\n'
printf 'Repo: %s\n' "$CODEX_REPO_ROOT"
printf 'Branch: %s\n' "$branch"
printf 'AI_SYNC Owner: %s\n' "$owner"
printf 'AI_SYNC Mode: %s\n' "$mode"
printf 'Dirty Files: %s\n' "$dirty_count"

issues=0

if [ "$owner" != "IDLE" ] && [ "$owner" != "CODEX" ] && [ "$mode" = "WRITE" ]; then
  printf 'BLOCKER: AI_SYNC is locked by another agent.\n' >&2
  issues=$((issues + 1))
fi

if git -C "$CODEX_REPO_ROOT" status --short -- .secrets.env .secrets .env.local | grep -q .; then
  printf 'BLOCKER: secret files are modified.\n' >&2
  issues=$((issues + 1))
fi

if [ $# -gt 0 ]; then
  printf '\nTarget Paths:\n'
  printf '%s\n' "$@"
  printf '\nStatus For Target Paths:\n'
  git -C "$CODEX_REPO_ROOT" status --short -- "$@" || true

  if ! git -C "$CODEX_REPO_ROOT" diff --check -- "$@" >/tmp/codex-preflight-diff-check.$$ 2>&1; then
    printf '\nBLOCKER: git diff --check failed for target paths.\n' >&2
    cat /tmp/codex-preflight-diff-check.$$ >&2
    issues=$((issues + 1))
  fi
  rm -f /tmp/codex-preflight-diff-check.$$
fi

if [ $issues -gt 0 ]; then
  printf '\nPreflight status: BLOCKED (%s issue(s))\n' "$issues" >&2
  exit 1
fi

printf '\nPreflight status: READY\n'
