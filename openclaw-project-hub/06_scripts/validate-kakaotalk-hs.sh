#!/usr/bin/env bash
set -euo pipefail

HS_APP="/Applications/Hammerspoon.app"
HS_BIN="$HS_APP/Contents/Frameworks/hs/hs"

[[ -d "$HS_APP" ]] || { echo "HAMMERSPOON_APP_MISSING"; exit 1; }
[[ -x "$HS_BIN" ]] || { echo "HAMMERSPOON_BIN_MISSING"; exit 1; }

echo "HAMMERSPOON_OK"
"$HS_BIN" -c 'print("HS_RUNTIME_OK")'
