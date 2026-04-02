#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/codex-common.sh"

usage() {
  cat <<'EOF'
Usage:
  bash pressco21/_tools/codex-start.sh "<scope>" "<subdirectory>"

Example:
  bash pressco21/_tools/codex-start.sh "crm auth recovery" "offline-crm-v2, scripts"
EOF
}

if [ $# -lt 2 ]; then
  usage
  exit 1
fi

scope="$1"
subdirectory="$2"

codex_ensure_dirs

session_id="$(codex_stamp)-$(codex_slugify "$scope")"
session_file="$CODEX_SESSION_DIR/$session_id.md"
started_at="$(codex_now)"
branch="$(codex_git_branch)"
git_status="$(codex_git_status)"
git_diff_stat="$(codex_git_diff_stat)"

cat > "$session_file" <<EOF
# Codex Session Log

- Session ID: $session_id
- Started At: $started_at
- Branch: $branch
- Scope: $scope
- Subdirectory: $subdirectory

## Goal
- $scope

## Start Snapshot

### Git Status
\`\`\`text
$git_status
\`\`\`

### Git Diff Stat
\`\`\`text
$git_diff_stat
\`\`\`

## Checkpoints

## Backups

## Finish
- Status: open
- Next Step:
- Risks:
EOF

printf 'Session log created: %s\n' "$(codex_repo_rel "$session_file")"
printf 'Next: update AI_SYNC.md lock and start the first checkpoint before deploy.\n'
