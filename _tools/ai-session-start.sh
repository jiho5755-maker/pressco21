#!/usr/bin/env bash
# Print a compact AI session startup briefing for any local project.
set -euo pipefail
root="${1:-.}"
root="$(cd "$root" && pwd)"
cd "$root"

printf '== AI Session Start ==\n'
printf 'Project: %s\n' "$root"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  printf '\n-- Git --\n'
  git status --short --branch || true
  printf '\nRecent commits:\n'
  if git rev-parse --verify HEAD >/dev/null 2>&1; then
    git log --oneline -8 || true
  else
    printf 'No commits yet.\n'
  fi
  printf '\nWorktrees:\n'
  git worktree list 2>/dev/null || true
else
  printf '\n-- Git --\nNot a git repository.\n'
fi

printf '\n-- Guidance files --\n'
for f in AGENTS.md CLAUDE.md docs/ai-development/CURRENT_STATE.md docs/ai-development/OPS_LOG.md docs/ai-development/DECISIONS.md docs/ai-development/DONE_CHECKLIST.md; do
  if [ -f "$f" ]; then printf 'found: %s\n' "$f"; else printf 'missing: %s\n' "$f"; fi
done

printf '\n-- Current State --\n'
if [ -f docs/ai-development/CURRENT_STATE.md ]; then
  sed -n '1,180p' docs/ai-development/CURRENT_STATE.md
else
  printf 'No CURRENT_STATE.md. Run ai-project-bootstrap .\n'
fi

printf '\n-- Latest Ops Log entries --\n'
if [ -f docs/ai-development/OPS_LOG.md ]; then
  tail -120 docs/ai-development/OPS_LOG.md
else
  printf 'No OPS_LOG.md.\n'
fi

printf '\n== Suggested next prompt ==\n'
printf 'Read AGENTS.md plus docs/ai-development/*, then continue from current git status.\n'
