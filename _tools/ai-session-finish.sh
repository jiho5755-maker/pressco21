#!/usr/bin/env bash
# Create a handoff note for any local project.
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  ai-session-finish.sh [project-root] "summary" "next-step" [--risk "risk"]

Example:
  ai-session-finish.sh . "CRM UI fixed" "Run browser QA" --risk "E2E not run"
USAGE
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then usage; exit 0; fi
root="${1:-.}"
summary="${2:-}"
next_step="${3:-}"
shift $(( $# >= 3 ? 3 : $# )) || true
risk=""
while [ $# -gt 0 ]; do
  case "$1" in
    --risk) risk="${2:-}"; shift 2 ;;
    *) shift ;;
  esac
done
if [ -z "$summary" ] || [ -z "$next_step" ]; then usage; exit 1; fi

root="$(cd "$root" && pwd)"
cd "$root"
mkdir -p docs/ai-development/handoffs
stamp="$(date +%Y%m%d-%H%M%S)"
branch="nogit"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  branch="$(git branch --show-current 2>/dev/null || echo detached)"
fi
safe_branch="$(printf '%s' "$branch" | tr '/ ' '--' | sed -E 's/[^A-Za-z0-9._-]+/-/g')"
out="docs/ai-development/handoffs/${stamp}-${safe_branch}.md"

{
  printf '# Handoff: %s\n\n' "$summary"
  printf 'Date: %s\n' "$(date '+%F %T %Z')"
  printf 'Project root: `%s`\n' "$root"
  printf 'Branch: `%s`\n\n' "$branch"
  printf '## Summary\n\n%s\n\n' "$summary"
  printf '## Next step\n\n%s\n\n' "$next_step"
  printf '## Risk / notes\n\n%s\n\n' "${risk:-None recorded}"
  printf '## Git status\n\n```text\n'
  git status --short --branch 2>/dev/null || true
  printf '```\n\n'
  printf '## Recent commits\n\n```text\n'
  if git rev-parse --verify HEAD >/dev/null 2>&1; then
    git log --oneline -8 2>/dev/null || true
  else
    printf 'No commits yet.\n'
  fi
  printf '```\n\n'
  printf '## Diff stat\n\n```text\n'
  git diff --stat 2>/dev/null || true
  printf '```\n\n'
  printf '## Resume prompt\n\n```text\nRead AGENTS.md if present, then docs/ai-development/CURRENT_STATE.md, OPS_LOG.md, DECISIONS.md, and this handoff: %s\n```\n' "$out"
} > "$out"

printf 'Wrote handoff: %s\n' "$out"
printf '\nDone checklist: docs/ai-development/DONE_CHECKLIST.md\n'
