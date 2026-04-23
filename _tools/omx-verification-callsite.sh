#!/bin/bash
set -euo pipefail

# First practical OMX insertion target: verification output.
# This wrapper narrows the generic founder-facing live wrapper into a dedicated
# verification call-site helper so live integration can start with the simplest output type.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/omx-founder-facing-lib.sh"

usage() {
  cat <<'USAGE'
Usage:
  bash _tools/omx-verification-callsite.sh \
    --summary "..." \
    --checks-json '["..."]' \
    [--risks-json '["..."]'] \
    [--next-json '["..."]'] \
    [--owner choi-minseok-cto]

Notes:
- Designed for OMX verification call-sites.
- Uses canonical founder-facing output via omx_emit_verification.
USAGE
}

OWNER="choi-minseok-cto"
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

omx_emit_verification "$OWNER" "$SUMMARY" "$CHECKS" "$RISKS" "$NEXT"
