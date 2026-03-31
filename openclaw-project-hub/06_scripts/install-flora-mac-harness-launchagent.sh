#!/bin/bash
# Install the Flora Mac Harness launchd job on macOS.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_PLIST="$REPO_ROOT/04_reference_json/com.pressco21.flora-mac-harness.plist"
TARGET_PLIST="$HOME/Library/LaunchAgents/com.pressco21.flora-mac-harness.plist"

mkdir -p "$HOME/Library/LaunchAgents"
mkdir -p "$HOME/.local/log"
cp "$SOURCE_PLIST" "$TARGET_PLIST"

launchctl unload "$TARGET_PLIST" 2>/dev/null || true
launchctl load "$TARGET_PLIST"

echo "Installed launch agent:"
echo "  $TARGET_PLIST"
launchctl list | grep com.pressco21.flora-mac-harness || true
