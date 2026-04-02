#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

[[ -f "$SCRIPT_DIR/kakaotalk-room-aliases.json" ]] || { echo "missing aliases json"; exit 1; }
[[ -f "$SCRIPT_DIR/find-local-file-for-send.sh" ]] || { echo "missing find script"; exit 1; }
[[ -f "$SCRIPT_DIR/send-kakaotalk-message.applescript" ]] || { echo "missing applescript"; exit 1; }
[[ -f "$SCRIPT_DIR/send-kakaotalk-file-and-message.sh" ]] || { echo "missing send wrapper"; exit 1; }

python3 - <<PY
import json, pathlib
p = pathlib.Path(r'''$SCRIPT_DIR/kakaotalk-room-aliases.json''')
data = json.loads(p.read_text(encoding='utf-8'))
assert isinstance(data, dict) and data, 'aliases must be non-empty object'
print('aliases-ok:', ', '.join(data.keys()))
PY

echo "files-ok"
echo "next-manual-check: macOS 접근성 권한 / 카카오톡 로그인 / 실제 방 이름 검증"
