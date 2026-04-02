#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-}"
HS_BIN="/Applications/Hammerspoon.app/Contents/Frameworks/hs/hs"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

case "$ACTION" in
  focus)
    "$HS_BIN" -c "dofile('$SCRIPT_DIR/kakaotalk-hs-test-focus.lua')"
    ;;
  send-test)
    "$HS_BIN" -c "dofile('$SCRIPT_DIR/kakaotalk-hs-test-send.lua')"
    ;;
  *)
    echo "usage: $0 {focus|send-test}" >&2
    exit 1
    ;;
esac
