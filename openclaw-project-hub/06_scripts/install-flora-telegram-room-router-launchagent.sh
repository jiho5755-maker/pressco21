#!/bin/zsh
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: bash 06_scripts/install-flora-telegram-room-router-launchagent.sh <config-path> <env-file>"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_PATH="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
ENV_FILE="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
NODE_BIN="$(command -v node)"
PLIST_PATH="$HOME/Library/LaunchAgents/com.pressco21.flora-telegram-room-router.plist"
LOG_DIR="$HOME/Library/Logs"
STDOUT_LOG="$LOG_DIR/flora-telegram-room-router.log"
STDERR_LOG="$LOG_DIR/flora-telegram-room-router.err.log"

mkdir -p "$LOG_DIR"

if [[ -z "$NODE_BIN" ]]; then
  echo "node not found in PATH"
  exit 1
fi

cat >"$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.pressco21.flora-telegram-room-router</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>source "$ENV_FILE" && "$NODE_BIN" "$SCRIPT_DIR/run-flora-telegram-room-router.js" --config "$CONFIG_PATH"</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>WorkingDirectory</key>
  <string>$(cd "$SCRIPT_DIR/.." && pwd)</string>
  <key>StandardOutPath</key>
  <string>$STDOUT_LOG</string>
  <key>StandardErrorPath</key>
  <string>$STDERR_LOG</string>
</dict>
</plist>
PLIST

launchctl unload "$PLIST_PATH" >/dev/null 2>&1 || true
launchctl load "$PLIST_PATH"

echo "Installed: $PLIST_PATH"
echo "stdout: $STDOUT_LOG"
echo "stderr: $STDERR_LOG"
