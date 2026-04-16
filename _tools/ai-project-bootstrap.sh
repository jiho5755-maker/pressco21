#!/usr/bin/env bash
# Bootstrap AI development continuity docs into any local project.
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  ai-project-bootstrap.sh [project-root] [project-name] [--force]

Examples:
  ai-project-bootstrap.sh . "My App"
  ai-project-bootstrap.sh ~/workspace/some-project "Some Project"

Creates:
  docs/ai-development/README.md
  docs/ai-development/CURRENT_STATE.md
  docs/ai-development/OPS_LOG.md
  docs/ai-development/DECISIONS.md
  docs/ai-development/DONE_CHECKLIST.md
  docs/ai-development/HANDOFF_TEMPLATE.md
  docs/ai-development/handoffs/
USAGE
}

root="${1:-.}"
name="${2:-}"
force=0
if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then usage; exit 0; fi
if [ "${2:-}" = "--force" ]; then name=""; force=1; fi
if [ "${3:-}" = "--force" ]; then force=1; fi

root="$(cd "$root" && pwd)"
if [ -z "$name" ]; then name="$(basename "$root")"; fi

date_iso="$(date +%F)"
doc_dir="$root/docs/ai-development"
mkdir -p "$doc_dir/handoffs"

write_file() {
  local path="$1"
  local content="$2"
  if [ -e "$path" ] && [ "$force" -ne 1 ]; then
    printf 'skip existing: %s\n' "$path"
    return
  fi
  printf '%s\n' "$content" > "$path"
  printf 'wrote: %s\n' "$path"
}

remote=""
branch=""
if git -C "$root" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  branch="$(git -C "$root" branch --show-current 2>/dev/null || true)"
  remote="$(git -C "$root" remote get-url origin 2>/dev/null || true)"
fi

write_file "$doc_dir/CURRENT_STATE.md" "# Current State — $name

Last updated: $date_iso

## Source of truth

- Project root: \`$root\`
- Git remote: ${remote:-not configured}
- Current branch at bootstrap: ${branch:-not a git repo or detached}

## How to start a new AI session

\`\`\`bash
cd \"$root\"
git status --short --branch
ai-session-start .
\`\`\`

## Current system summary

- Fill in production URL, local dev command, build/test commands, and active risks.

## Known local-only files

- Document untracked folders that should not be deleted.
"

write_file "$doc_dir/OPS_LOG.md" "# Operations Log — $name

Record deploys, manual data changes, rollbacks, and external system changes here.

## Template

### YYYY-MM-DD — <operation title>

- Environment:
- Command/operator:
- Backup:
- Target IDs/records:
- Change summary:
- Validation:
- Rollback:
"

write_file "$doc_dir/DECISIONS.md" "# Development Decisions — $name

## D-YYYY-MM-DD-01 — <decision title>

Context:

Decision:

Consequences:
"

write_file "$doc_dir/DONE_CHECKLIST.md" "# Done Checklist — $name

- [ ] Correct branch/worktree used.
- [ ] Changed paths are in scope.
- [ ] Secrets were not modified.
- [ ] Build/typecheck passed.
- [ ] Relevant tests/lint passed or failures documented.
- [ ] UI checked visually if applicable.
- [ ] Ops/data changes backed up and logged.
- [ ] Handoff note created for multi-session work.
- [ ] main merge/push/deploy completed if requested.
"

write_file "$doc_dir/HANDOFF_TEMPLATE.md" "# Handoff: <task title>

Date: YYYY-MM-DD
Branch/worktree:
Merged:
Deployed:

## Summary

## Files changed

## Validation

## Operations/data changes

## Risks/TODO

## Resume prompt

\`\`\`text
Read AGENTS.md if present, then docs/ai-development/CURRENT_STATE.md, OPS_LOG.md, DECISIONS.md, and this handoff.
\`\`\`
"

write_file "$doc_dir/README.md" "# AI Development Continuity — $name

This folder lets Claude Code, Codex, Cursor, and other AI tools resume project state without relying on chat memory.

Start:

\`\`\`bash
ai-session-start .
\`\`\`

Finish:

\`\`\`bash
ai-session-finish . \"summary\" \"next step\" --risk \"known risk\"
\`\`\`
"

printf '\nDone. Next:\n  cd %s\n  ai-session-start .\n' "$root"
