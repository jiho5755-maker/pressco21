#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ALIASES_JSON="${ALIASES_JSON:-$SCRIPT_DIR/kakaotalk-room-aliases.json}"
ROOM_ALIAS=""
FILE_QUERY=""
MESSAGE=""
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --room-alias)
      ROOM_ALIAS="$2"
      shift 2
      ;;
    --file-query)
      FILE_QUERY="$2"
      shift 2
      ;;
    --message)
      MESSAGE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    *)
      echo "unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$ROOM_ALIAS" || -z "$FILE_QUERY" || -z "$MESSAGE" ]]; then
  echo "usage: $0 --room-alias <alias> --file-query <keyword> --message <text> [--dry-run]" >&2
  exit 1
fi

ROOM_NAME=$(python3 - <<PY
import json
from pathlib import Path
p = Path(r'''$ALIASES_JSON''')
data = json.loads(p.read_text(encoding='utf-8'))
print(data.get(r'''$ROOM_ALIAS''', ''))
PY
)

if [[ -z "$ROOM_NAME" ]]; then
  echo "ROOM_ALIAS_NOT_FOUND: $ROOM_ALIAS" >&2
  exit 2
fi

mapfile -t matches < <("$SCRIPT_DIR/find-local-file-for-send.sh" --query "$FILE_QUERY")

if [[ ${#matches[@]} -eq 0 ]]; then
  echo "FILE_NOT_FOUND: $FILE_QUERY" >&2
  exit 3
fi

if [[ ${#matches[@]} -gt 1 ]]; then
  echo "MULTIPLE_FILES_FOUND" >&2
  printf '%s\n' "${matches[@]}" >&2
  exit 4
fi

FILE_PATH="${matches[0]}"

if [[ $DRY_RUN -eq 1 ]]; then
  echo "ROOM_NAME=$ROOM_NAME"
  echo "FILE_PATH=$FILE_PATH"
  echo "MESSAGE=$MESSAGE"
  exit 0
fi

osascript <<OSA
set roomName to "$ROOM_NAME"
set filePath to POSIX file "$FILE_PATH"
set messageText to "$MESSAGE"

tell application "KakaoTalk" to activate
delay 1.0

tell application "System Events"
    tell process "KakaoTalk"
        set frontmost to true
        keystroke "f" using {command down}
        delay 0.5
        keystroke roomName
        delay 1.0
        key code 36
        delay 1.0
        keystroke "o" using {command down}
        delay 1.0
    end tell
end tell

tell application "System Events"
    keystroke "g" using {command down, shift down}
    delay 0.5
    keystroke POSIX path of filePath
    delay 0.5
    key code 36
    delay 1.0
    key code 36
    delay 1.5
end tell

tell application "System Events"
    tell process "KakaoTalk"
        keystroke messageText
        delay 0.5
        key code 36
    end tell
end tell
OSA

echo "SENT"
echo "ROOM_NAME=$ROOM_NAME"
echo "FILE_PATH=$FILE_PATH"
