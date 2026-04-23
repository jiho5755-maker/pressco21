#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CLAUDE_WT="${PRESSCO21_CLAUDE_WT:-$HOME/workspace/pressco21-worktrees/workspace-claude-shared-agent-ecosystem}"
WORKSPACE_WT="${PRESSCO21_SHARED_KERNEL_WT:-$REPO_ROOT}"
SHARED_KERNEL_DIR="docs/ai-native-upgrade/shared-agent-kernel"

usage() {
  cat <<'USAGE'
Usage:
  bash _tools/shared-agent-bridge.sh <command>

Commands:
  status           Show sync status and latest Claude handoff readiness
  sync-to-claude   Copy shared-kernel docs from current workspace worktree to Claude worktree
  pull-from-claude Copy Claude-side handoff/examples back into current workspace docs reference
  sync-all         Run sync-to-claude + pull-from-claude
  print-claude-note  Print a minimal nudge message for the Claude session if needed
USAGE
}

ensure_claude_wt() {
  if [ ! -d "$CLAUDE_WT" ]; then
    echo "Claude worktree not found: $CLAUDE_WT" >&2
    exit 1
  fi
}

sync_to_claude() {
  ensure_claude_wt
  mkdir -p "$CLAUDE_WT/$SHARED_KERNEL_DIR"
  rsync -a --delete \
    "$WORKSPACE_WT/$SHARED_KERNEL_DIR/" \
    "$CLAUDE_WT/$SHARED_KERNEL_DIR/"
  mkdir -p "$CLAUDE_WT/docs/ai-native-upgrade"
  cp "$WORKSPACE_WT/docs/ai-native-upgrade/PRD-pressco21-shared-agent-ecosystem-v1.md" \
     "$CLAUDE_WT/docs/ai-native-upgrade/PRD-pressco21-shared-agent-ecosystem-v1.md"
  echo "Synced shared-kernel docs to Claude worktree: $CLAUDE_WT"
}

pull_from_claude() {
  ensure_claude_wt
  mkdir -p "$WORKSPACE_WT/$SHARED_KERNEL_DIR/proposals"
  local copied=0
  for rel in \
    "$SHARED_KERNEL_DIR/claude-adapter-complete-handoff-2026-04-21.md" \
    "$SHARED_KERNEL_DIR/claude-adapter-refinement-handoff-2026-04-21.md" \
    "$SHARED_KERNEL_DIR/claude-adapter-final-handoff-2026-04-21.md" \
    "$SHARED_KERNEL_DIR/claude-founder-facing-output-examples-v1.md" \
    "$SHARED_KERNEL_DIR/proposals/claude-side-kernel-proposals-2026-04-21.md"
  do
    if [ -f "$CLAUDE_WT/$rel" ]; then
      mkdir -p "$WORKSPACE_WT/$(dirname "$rel")"
      cp "$CLAUDE_WT/$rel" "$WORKSPACE_WT/$rel"
      copied=$((copied+1))
    fi
  done
  echo "Pulled $copied Claude-side artifact(s) into workspace reference docs."
}

latest_handoff_status() {
  local latest="$CLAUDE_WT/team/handoffs/latest.md"
  if [ ! -f "$latest" ]; then
    echo "latest_handoff: missing"
    return 0
  fi
  echo "latest_handoff: $latest"
  python3 "$SCRIPT_DIR/omx-latest-handoff-bridge.py" --input "$latest" >/tmp/shared-agent-bridge-latest.out
  local owner summary placeholder
  owner="$(rg -n '^- 담당:' /tmp/shared-agent-bridge-latest.out | sed 's/^[0-9]*:- 담당: //' | head -1 || true)"
  summary="$(rg -n '^- ' /tmp/shared-agent-bridge-latest.out | sed 's/^[0-9]*:- //' | sed -n '4p' || true)"
  placeholder="no"
  if grep -q '아직 founder-facing handoff가 확정되지 않았습니다' /tmp/shared-agent-bridge-latest.out; then
    placeholder="yes"
  fi
  echo "latest_owner: ${owner:-unknown}"
  echo "latest_placeholder: $placeholder"
  echo "latest_summary: ${summary:-}" 
}

status() {
  ensure_claude_wt
  echo "workspace_wt: $WORKSPACE_WT"
  echo "claude_wt: $CLAUDE_WT"
  echo "shared_kernel_dir: $SHARED_KERNEL_DIR"
  echo "---"
  latest_handoff_status
  echo "---"
  echo "workspace_shared_kernel_files:"
  find "$WORKSPACE_WT/$SHARED_KERNEL_DIR" -maxdepth 1 -type f | sort | sed 's#^#- #' | head -50
  echo "---"
  echo "claude_skill_examples:"
  find "$CLAUDE_WT/.claude/skills" -maxdepth 2 -type f 2>/dev/null | rg 'founder-facing-output-examples|pressco21-' -n || true
}

print_claude_note() {
  cat <<'NOTE'
Quick Claude note:
- shared-kernel docs have been synced to your worktree
- latest Claude handoff is available for continuity
- continue Claude-side adapter work unless blocked
NOTE
}

cmd="${1:-}"
case "$cmd" in
  status) status ;;
  sync-to-claude) sync_to_claude ;;
  pull-from-claude) pull_from_claude ;;
  sync-all) sync_to_claude; pull_from_claude; status ;;
  print-claude-note) print_claude_note ;;
  *) usage; exit 1 ;;
esac
