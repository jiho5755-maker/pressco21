#!/bin/bash
set -euo pipefail

# Second practical OMX insertion target: handoff output.
# Narrows the founder-facing live wrapper into a dedicated handoff helper
# so runtime integration can move from verification to continuity artifacts.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/omx-founder-facing-lib.sh"

usage() {
  cat <<'USAGE'
Usage:
  bash _tools/omx-handoff-callsite.sh \
    --summary "..." \
    [--participants-json '["..."]'] \
    [--checks-json '["..."]'] \
    [--risks-json '["..."]'] \
    [--next-json '["..."]'] \
    [--owner yoo-junho-paircoder]

Notes:
- Designed for OMX handoff / lane-export call-sites.
- Uses canonical founder-facing output via omx_emit_handoff.
USAGE
}

OWNER="yoo-junho-paircoder"
SUMMARY=""
PARTICIPANTS='[]'
CHECKS='[]'
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
    --participants-json)
      PARTICIPANTS="${2:-[]}"
      shift 2
      ;;
    --checks-json)
      CHECKS="${2:-[]}"
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

omx_emit_handoff "$OWNER" "$SUMMARY" "$PARTICIPANTS" "$CHECKS" "$RISKS" "$NEXT"
