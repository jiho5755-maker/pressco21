#!/bin/bash
# Create a project-scoped PRESSCO21 worktree and branch.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/project-scope.sh"

usage() {
  cat <<'USAGE'
Usage:
  bash _tools/pressco21-task.sh <project> <task-name> [--full]

Projects:
  crm | partnerclass | n8n | mini-app | mobile-app | homepage | workspace

Examples:
  bash _tools/pressco21-task.sh crm invoice-fix
  bash _tools/pressco21-task.sh partnerclass detail-ui
  bash _tools/pressco21-task.sh workspace retire-ai-sync --full

Notes:
  - Creates branch: work/<project>/<task-name>
  - Creates worktree under: ~/workspace/pressco21-worktrees/<slot>
  - By default uses sparse-checkout so only the target project plus root tools are visible.
USAGE
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

if [ $# -lt 2 ]; then
  usage
  exit 1
fi

project_input="$1"
task_input="$2"
shift 2
full=0
while [ $# -gt 0 ]; do
  case "$1" in
    --full) full=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

project="$(p21_normalize_project "$project_input")" || {
  echo "Unknown project: $project_input" >&2
  usage
  exit 1
}

task_slug="$(p21_slugify "$task_input")"
branch_project="$(p21_branch_project_name "$project")"
slot_prefix="$(p21_slot_prefix "$project")"
branch="work/$branch_project/$task_slug"
slot="$slot_prefix-$task_slug"

MAIN_ROOT="${PRESSCO21_MAIN_WORKTREE:-$HOME/workspace/pressco21}"
WORKTREE_ROOT="${PRESSCO21_WORKTREES:-$HOME/workspace/pressco21-worktrees}"
worktree_path="$WORKTREE_ROOT/$slot"

if [ ! -d "$MAIN_ROOT/.git" ]; then
  echo "Main worktree not found: $MAIN_ROOT" >&2
  echo "Set PRESSCO21_MAIN_WORKTREE if your main repo lives elsewhere." >&2
  exit 1
fi

if [ "$(git -C "$MAIN_ROOT" branch --show-current)" != "main" ]; then
  echo "Main worktree must be on main: $MAIN_ROOT" >&2
  exit 1
fi

main_dirty="$(git -C "$MAIN_ROOT" status --short -- . ':(exclude)team' 2>/dev/null || git -C "$MAIN_ROOT" status --short)"
if [ -n "$main_dirty" ]; then
  echo "Main worktree is dirty. Clean or commit before creating a task worktree:" >&2
  printf '%s\n' "$main_dirty" >&2
  exit 1
fi

team_dirty="$(git -C "$MAIN_ROOT" status --short -- team 2>/dev/null || true)"
if [ -n "$team_dirty" ]; then
  echo "Note: local team/ workspace changes are present and ignored for task worktree creation." >&2
fi

mkdir -p "$WORKTREE_ROOT"

git -C "$MAIN_ROOT" pull --ff-only

if git -C "$MAIN_ROOT" show-ref --verify --quiet "refs/heads/$branch"; then
  echo "Branch already exists: $branch" >&2
  echo "If intended, open existing worktree or choose a different task name." >&2
  exit 1
fi

if [ -e "$worktree_path" ]; then
  echo "Worktree path already exists: $worktree_path" >&2
  exit 1
fi

git -C "$MAIN_ROOT" worktree add --no-checkout "$worktree_path" -b "$branch" main

if [ "$full" -eq 0 ]; then
  git -C "$worktree_path" sparse-checkout init --no-cone
  sparse_file="$(git -C "$worktree_path" rev-parse --git-path info/sparse-checkout)"
  p21_sparse_paths_print "$project" > "$sparse_file"
fi

git -C "$worktree_path" checkout

echo ""
echo "✅ Worktree ready"
echo "Project: $project"
echo "Branch:  $branch"
echo "Path:    $worktree_path"
echo "Allowed commit paths:"
p21_allowed_paths_print "$project" | sed 's/^/  - /'
echo ""
echo "Next:"
echo "  cd $worktree_path"
echo "  bash _tools/pressco21-check.sh"
echo "  # Open this folder in Claude Code, Codex, or Cursor"
