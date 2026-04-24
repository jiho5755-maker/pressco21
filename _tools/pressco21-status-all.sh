#!/bin/bash
# Show PRESSCO21 main/worktree hygiene for parallel AI sessions.
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  bash _tools/pressco21-status-all.sh [--fetch] [--short]

What it checks:
  - main worktree clean/synced status
  - top stash entries
  - every git worktree branch and dirty-file count
  - dirty worktree details unless --short is passed
USAGE
}

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEFAULT_MAIN="$HOME/workspace/pressco21"
MAIN_ROOT="${PRESSCO21_MAIN_WORKTREE:-$DEFAULT_MAIN}"
fetch=0
short=0

while [ $# -gt 0 ]; do
  case "$1" in
    --fetch) fetch=1; shift ;;
    --short) short=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

if ! git -C "$MAIN_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Main worktree not found or not a git repo: $MAIN_ROOT" >&2
  exit 1
fi

if [ "$fetch" -eq 1 ]; then
  git -C "$MAIN_ROOT" fetch --all --prune
fi

count_lines() {
  if [ -z "${1:-}" ]; then
    printf '0\n'
  else
    printf '%s\n' "$1" | wc -l | tr -d ' '
  fi
}

branch_ahead_behind() {
  local repo="$1"
  local branch upstream counts
  branch="$(git -C "$repo" branch --show-current 2>/dev/null || true)"
  if [ -z "$branch" ]; then
    printf 'detached\n'
    return
  fi
  upstream="$(git -C "$repo" rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
  if [ -z "$upstream" ]; then
    printf 'no-upstream\n'
    return
  fi
  counts="$(git -C "$repo" rev-list --left-right --count "$branch...$upstream" 2>/dev/null || true)"
  if [ -z "$counts" ]; then
    printf 'unknown\n'
  else
    # rev-list prints: "<ahead><TAB><behind>". Keep the summary table single-token.
    set -- $counts
    printf 'a%s/b%s\n' "${1:-?}" "${2:-?}"
  fi
}

printf '== PRESSCO21 Worktree Status ==\n'
printf 'Main: %s\n' "$MAIN_ROOT"
printf 'Time: %s\n' "$(date '+%Y-%m-%d %H:%M:%S %Z')"

printf '\n== main ==\n'
git -C "$MAIN_ROOT" status --short --branch
printf 'sync: %s\n' "$(branch_ahead_behind "$MAIN_ROOT")"
main_dirty="$(git -C "$MAIN_ROOT" status --porcelain=v1)"
if [ -n "$main_dirty" ]; then
  printf 'MAIN DIRTY: yes (%s paths)\n' "$(count_lines "$main_dirty")"
else
  printf 'MAIN DIRTY: no\n'
fi

printf '\n== stash top ==\n'
git -C "$MAIN_ROOT" stash list | head -n 8 || true

printf '\n== worktrees summary ==\n'
printf '%-7s %-10s %-45s %s\n' 'dirty' 'sync' 'branch' 'path'
while IFS= read -r worktree_path; do
  branch="$(git -C "$worktree_path" branch --show-current 2>/dev/null || echo '(detached)')"
  dirty_count="$(count_lines "$(git -C "$worktree_path" status --porcelain=v1 2>/dev/null || true)")"
  sync_state="$(branch_ahead_behind "$worktree_path")"
  printf '%-7s %-10s %-45s %s\n' "$dirty_count" "$sync_state" "$branch" "$worktree_path"
done < <(git -C "$MAIN_ROOT" worktree list --porcelain | awk '/^worktree /{print $2}')

if [ "$short" -eq 0 ]; then
  printf '\n== dirty worktree details ==\n'
  any_dirty=0
  while IFS= read -r worktree_path; do
    status="$(git -C "$worktree_path" status --porcelain=v1 2>/dev/null || true)"
    if [ -n "$status" ]; then
      any_dirty=1
      printf -- '--- %s ---\n' "$worktree_path"
      git -C "$worktree_path" status --short --branch | sed -n '1,80p'
    fi
  done < <(git -C "$MAIN_ROOT" worktree list --porcelain | awk '/^worktree /{print $2}')
  if [ "$any_dirty" -eq 0 ]; then
    printf '(none)\n'
  fi
fi
