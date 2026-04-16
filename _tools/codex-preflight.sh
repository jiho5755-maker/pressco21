#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/codex-common.sh"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/project-scope.sh"

branch="$(codex_git_branch)"
dirty_count="$(git -C "$CODEX_REPO_ROOT" status --short | wc -l | tr -d ' ')"

printf '== Codex Preflight ==\n'
printf 'Repo: %s\n' "$CODEX_REPO_ROOT"
printf 'Branch: %s\n' "$branch"
printf 'Dirty Files: %s\n' "$dirty_count"

if project="$(p21_project_from_branch "$branch" 2>/dev/null)"; then
  printf 'Project Scope: %s\n' "$project"
  printf 'Allowed Paths:\n'
  p21_allowed_paths_print "$project" | sed 's/^/  - /'
elif [ "$branch" = "main" ]; then
  printf 'Project Scope: main integration branch\n'
  printf 'Note: direct feature commits to main are blocked by pre-commit.\n'
else
  printf 'Project Scope: legacy/unscoped branch\n'
fi

issues=0

if git -C "$CODEX_REPO_ROOT" status --short -- .secrets.env .secrets .env.local n8n-automation/.secrets | grep -q .; then
  printf 'BLOCKER: secret/env files are modified.\n' >&2
  issues=$((issues + 1))
fi

if [ $# -gt 0 ]; then
  printf '\nTarget Paths:\n'
  printf '%s\n' "$@"
  printf '\nStatus For Target Paths:\n'
  git -C "$CODEX_REPO_ROOT" status --short -- "$@" || true

  if project="$(p21_project_from_branch "$branch" 2>/dev/null)"; then
    for target in "$@"; do
      if ! p21_is_path_allowed "$project" "$target"; then
        printf 'BLOCKER: target path is outside branch scope: %s\n' "$target" >&2
        issues=$((issues + 1))
      fi
    done
  fi

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
