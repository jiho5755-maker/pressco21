#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NORMALIZE="$SCRIPT_DIR/omx-founder-facing-normalize.py"
RENDER="$SCRIPT_DIR/omx-founder-facing-render.py"

usage() {
  cat <<'USAGE'
Usage:
  bash _tools/omx-founder-facing-render.sh --input <payload.json>
  echo '{...json...}' | bash _tools/omx-founder-facing-render.sh --stdin-json

Input JSON model:
  context_type, owner_agent_id, summary, findings, risks, next_steps

Notes:
  - Alias-friendly keys (type, owner, participants, checks, risk, next) are normalized.
  - Supported context_type values: team_meeting, verification, handoff, execution_report
USAGE
}

MODE=""
INPUT=""

case "${1:-}" in
  --input)
    INPUT="${2:-}"
    MODE="file"
    ;;
  --stdin-json)
    MODE="stdin"
    ;;
  -h|--help|"")
    usage
    exit 0
    ;;
  *)
    echo "Unknown argument: ${1:-}" >&2
    usage
    exit 1
    ;;
esac

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/omx-founder-facing-render.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT
RAW_JSON="$TMP_DIR/raw.json"
NORM_JSON="$TMP_DIR/normalized.json"

case "$MODE" in
  file)
    if [ -z "$INPUT" ] || [ ! -f "$INPUT" ]; then
      echo "Input JSON not found: ${INPUT:-<empty>}" >&2
      exit 1
    fi
    cp "$INPUT" "$RAW_JSON"
    ;;
  stdin)
    cat > "$RAW_JSON"
    ;;
  *)
    echo "Internal error: unsupported mode '$MODE'" >&2
    exit 1
    ;;
esac

python3 "$NORMALIZE" --input "$RAW_JSON" > "$NORM_JSON"
exec python3 "$RENDER" --input "$NORM_JSON"
