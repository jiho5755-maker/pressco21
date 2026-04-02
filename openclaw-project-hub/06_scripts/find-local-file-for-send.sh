#!/usr/bin/env bash
set -euo pipefail

SEARCH_ROOTS=(
  "$HOME/Desktop/카톡전송용"
  "$HOME/workspace/pressco21"
)

QUERY=""
MAX_RESULTS=10

while [[ $# -gt 0 ]]; do
  case "$1" in
    --query)
      QUERY="$2"
      shift 2
      ;;
    --max-results)
      MAX_RESULTS="$2"
      shift 2
      ;;
    *)
      echo "unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$QUERY" ]]; then
  echo "usage: $0 --query <keyword> [--max-results N]" >&2
  exit 1
fi

results=()
for root in "${SEARCH_ROOTS[@]}"; do
  [[ -d "$root" ]] || continue
  while IFS= read -r line; do
    results+=("$line")
  done < <(find "$root" -type f \( \
      -iname "*.pdf" -o -iname "*.xlsx" -o -iname "*.xls" -o -iname "*.docx" -o -iname "*.doc" -o \
      -iname "*.hwp" -o -iname "*.hwpx" -o -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" -o \
      -iname "*.rtf" -o -iname "*.md" \) | grep -i "$QUERY" || true)
done

if [[ ${#results[@]} -eq 0 ]]; then
  echo "NO_MATCH"
  exit 2
fi

printf '%s\n' "${results[@]}" | python3 - <<'PY'
import sys, os
files=[l.strip() for l in sys.stdin if l.strip()]
files=sorted(files, key=lambda p: os.path.getmtime(p), reverse=True)
for p in files[:10]:
    print(p)
PY
