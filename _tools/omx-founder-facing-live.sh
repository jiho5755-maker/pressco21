#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RENDER="$SCRIPT_DIR/omx-founder-facing-render.sh"
BRIDGE="$SCRIPT_DIR/omx-latest-handoff-bridge.py"

usage() {
  cat <<'USAGE'
Usage:
  bash _tools/omx-founder-facing-live.sh --input <file>
  bash _tools/omx-founder-facing-live.sh --latest-claude
  bash _tools/omx-founder-facing-live.sh --latest-team
  echo '{...json...}' | bash _tools/omx-founder-facing-live.sh --stdin-json

Behavior:
  - If the input is a .json file, normalize aliases and render founder-facing markdown
  - If the input is a .md file, treat it as a handoff markdown and bridge it via omx-latest-handoff-bridge.py
  - If --stdin-json is used, read JSON from stdin, normalize it, and render founder-facing markdown
USAGE
}

LATEST_CLAUDE="$HOME/workspace/pressco21-worktrees/workspace-claude-shared-agent-ecosystem/team/handoffs/latest.md"
LATEST_TEAM="$HOME/workspace/pressco21/team/handoffs/latest.md"

INPUT=""
MODE="file"
case "${1:-}" in
  --input)
    INPUT="${2:-}"
    ;;
  --latest-claude)
    INPUT="$LATEST_CLAUDE"
    ;;
  --latest-team)
    INPUT="$LATEST_TEAM"
    ;;
  --stdin-json)
    MODE="stdin-json"
    ;;
  *)
    usage
    exit 1
    ;;
esac

if [ "$MODE" = "stdin-json" ]; then
  exec bash "$RENDER" --stdin-json
fi

if [ -z "$INPUT" ]; then
  usage
  exit 1
fi

if [ ! -f "$INPUT" ]; then
  echo "Input not found: $INPUT" >&2
  exit 1
fi

case "$INPUT" in
  *.json)
    exec bash "$RENDER" --input "$INPUT"
    ;;
  *.md)
    exec python3 "$BRIDGE" --input "$INPUT"
    ;;
  *)
    echo "Unsupported input type: $INPUT" >&2
    echo "Use a .json fixture, .md handoff file, or --stdin-json." >&2
    exit 1
    ;;
esac
