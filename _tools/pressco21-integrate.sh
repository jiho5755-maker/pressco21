#!/bin/bash
# Safely merge a verified project worktree branch into main.
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  bash _tools/pressco21-integrate.sh <branch> [--push] [--allow-dirty-source]

Examples:
  bash _tools/pressco21-integrate.sh work/workspace/openclaw-setup-audit --push

Rules:
  - main must be clean and on branch main
  - source branch must exist
  - source worktree must be clean unless --allow-dirty-source is set
  - runs pressco21-check before/after merge
  - never force-pushes or resets
USAGE
}

if [ $# -lt 1 ] || [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit $([ $# -lt 1 ] && echo 1 || echo 0)
fi

branch="$1"
shift
push=0
allow_dirty_source=0
while [ $# -gt 0 ]; do
  case "$1" in
    --push) push=1; shift ;;
    --allow-dirty-source) allow_dirty_source=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

case "$branch" in
  main|refs/heads/main)
    echo "Refusing to integrate main into main." >&2
    exit 1
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MAIN_ROOT="${PRESSCO21_MAIN_WORKTREE:-$HOME/workspace/pressco21}"

if ! git -C "$MAIN_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Main worktree not found: $MAIN_ROOT" >&2
  exit 1
fi

if [ "$(git -C "$MAIN_ROOT" branch --show-current)" != "main" ]; then
  echo "Main worktree must be on main: $MAIN_ROOT" >&2
  exit 1
fi

main_dirty="$(git -C "$MAIN_ROOT" status --porcelain=v1)"
if [ -n "$main_dirty" ]; then
  echo "Main worktree is dirty. Preserve/clean it before integration:" >&2
  printf '%s\n' "$main_dirty" >&2
  exit 1
fi

if ! git -C "$MAIN_ROOT" show-ref --verify --quiet "refs/heads/$branch"; then
  echo "Branch not found: $branch" >&2
  exit 1
fi

source_worktree=""
while IFS= read -r line; do
  case "$line" in
    worktree\ *) current_path="${line#worktree }" ;;
    branch\ refs/heads/*)
      current_branch="${line#branch refs/heads/}"
      if [ "$current_branch" = "$branch" ]; then
        source_worktree="$current_path"
      fi
      ;;
  esac
done < <(git -C "$MAIN_ROOT" worktree list --porcelain)

if [ -n "$source_worktree" ]; then
  source_dirty="$(git -C "$source_worktree" status --porcelain=v1)"
  if [ -n "$source_dirty" ] && [ "$allow_dirty_source" -eq 0 ]; then
    echo "Source worktree is dirty: $source_worktree" >&2
    printf '%s\n' "$source_dirty" >&2
    echo "Commit/stash it first, or rerun with --allow-dirty-source if intentional." >&2
    exit 1
  fi
  if [ -x "$source_worktree/_tools/pressco21-check.sh" ]; then
    (cd "$source_worktree" && bash _tools/pressco21-check.sh)
  fi
else
  echo "Note: no checked-out worktree found for $branch; merging branch ref only." >&2
fi

git -C "$MAIN_ROOT" fetch origin main --prune
git -C "$MAIN_ROOT" pull --ff-only

git -C "$MAIN_ROOT" merge --no-ff "$branch" -m "Merge $branch"

(cd "$MAIN_ROOT" && bash _tools/pressco21-check.sh)

if [ "$push" -eq 1 ]; then
  git -C "$MAIN_ROOT" push origin main
else
  echo "Merge complete but not pushed. Push with: git -C '$MAIN_ROOT' push origin main"
fi
