#!/bin/bash
set -euo pipefail

# Fourth practical OMX insertion target: team meeting synthesis output.
# Dedicated helper for the most complex founder-facing output type.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/omx-founder-facing-lib.sh"

usage() {
  cat <<'USAGE'
Usage:
  bash _tools/omx-team-meeting-callsite.sh \
    --summary "..." \
    [--findings-json '[{"agent_id":"...","heading":"...","text":"..."}]'] \
    [--risks-json '["..."]'] \
    [--next-json '["..."]'] \
    [--owner han-jihoon-cso]
USAGE
}

OWNER="han-jihoon-cso"
SUMMARY=""
FINDINGS='[]'
RISKS='[]'
NEXT='[]'

while [ $# -gt 0 ]; do
  case "$1" in
    --owner)
      OWNER="${2:-}"
      shift 2
      ;;
    --summary)
      SUMMARY="${2:-}"
      shift 2
      ;;
    --findings-json)
      FINDINGS="${2:-[]}"
      shift 2
      ;;
    --risks-json)
      RISKS="${2:-[]}"
      shift 2
      ;;
    --next-json)
      NEXT="${2:-[]}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [ -z "$SUMMARY" ]; then
  echo "--summary is required" >&2
  usage
  exit 1
fi

omx_emit_team_meeting "$OWNER" "$SUMMARY" "$FINDINGS" "$RISKS" "$NEXT"
