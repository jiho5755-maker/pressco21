#!/bin/bash
set -euo pipefail

# Third practical OMX insertion target: execution report output.
# Narrows the founder-facing live wrapper into a dedicated execution-report helper.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/omx-founder-facing-lib.sh"

usage() {
  cat <<'USAGE'
Usage:
  bash _tools/omx-execution-report-callsite.sh \
    --summary "..." \
    [--checks-json '["..."]'] \
    [--risks-json '["..."]'] \
    [--next-json '["..."]'] \
    [--owner yoo-junho-paircoder]
USAGE
}

OWNER="yoo-junho-paircoder"
SUMMARY=""
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

omx_emit_execution_report "$OWNER" "$SUMMARY" "$CHECKS" "$RISKS" "$NEXT"
