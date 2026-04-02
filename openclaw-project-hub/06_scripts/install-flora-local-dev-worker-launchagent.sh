#!/bin/bash
# Install launchd agent for the local Flora dev worker.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_PATH="${1:-$REPO_ROOT/04_reference_json/flora-local-dev-worker.config.json}"
TARGET_PLIST="$HOME/Library/LaunchAgents/com.pressco21.flora-local-dev-worker.plist"
NODE_BIN="$(command -v node)"

if [ -z "$NODE_BIN" ]; then
  echo "node not found in PATH" >&2
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"

cat > "$TARGET_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "https://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.pressco21.flora-local-dev-worker</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>source "$HOME/.flora-telegram-room-router.env" &amp;&amp; "$NODE_BIN" "$REPO_ROOT/06_scripts/run-flora-local-dev-worker.js" --config "$CONFIG_PATH"</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$REPO_ROOT</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$HOME/Library/Logs/flora-local-dev-worker.log</string>
  <key>StandardErrorPath</key>
  <string>$HOME/Library/Logs/flora-local-dev-worker.err.log</string>
</dict>
</plist>
PLIST

launchctl unload "$TARGET_PLIST" >/dev/null 2>&1 || true
launchctl load "$TARGET_PLIST"

echo "Installed launch agent: $TARGET_PLIST"
