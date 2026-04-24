#!/bin/bash
# Show current branch scope and staged out-of-scope risks.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/project-scope.sh"

REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
branch="$(git -C "$REPO_ROOT" branch --show-current)"
head="$(git -C "$REPO_ROOT" rev-parse --short HEAD)"

printf '== PRESSCO21 Scope Check ==\n'
printf 'Repo:   %s\n' "$REPO_ROOT"
printf 'Branch: %s\n' "$branch"
printf 'HEAD:   %s\n' "$head"

if project="$(p21_project_from_branch "$branch" 2>/dev/null)"; then
  printf 'Project: %s\n' "$project"
  printf 'Allowed paths:\n'
  p21_allowed_paths_print "$project" | sed 's/^/  - /'
else
  if [ "$branch" = "main" ]; then
    printf 'Project: main integration branch\n'
    printf 'Note: direct commits to main are blocked by pre-commit. Merge verified task branches instead.\n'
  else
    printf 'Project: (no scope guard for this legacy branch)\n'
  fi
fi

printf '\nGit status:\n'
git -C "$REPO_ROOT" -c core.quotePath=false status --short || true

printf '\nStaged files:\n'
staged="$(git -C "$REPO_ROOT" -c core.quotePath=false diff --cached --name-only || true)"
if [ -z "$staged" ]; then
  printf '  (none)\n'
else
  printf '%s\n' "$staged" | sed 's/^/  - /'
fi

if project="$(p21_project_from_branch "$branch" 2>/dev/null)"; then
  bad=0
  while IFS= read -r path; do
    [ -z "$path" ] && continue
    if p21_is_secret_path "$path" || ! p21_is_path_allowed "$project" "$path"; then
      if [ "$bad" -eq 0 ]; then
        printf '\nOut-of-scope staged files:\n' >&2
      fi
      printf '  - %s\n' "$path" >&2
      bad=1
    fi
  done <<EOF2
$staged
EOF2
  if [ "$bad" -ne 0 ]; then
    printf '\nStatus: BLOCKED until out-of-scope files are unstaged.\n' >&2
    exit 1
  fi
fi

printf '\nStatus: OK\n'
