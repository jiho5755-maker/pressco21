#!/usr/bin/env bash
set -euo pipefail

DRY_RUN="${DRY_RUN:-false}"

curl -X POST http://localhost:3000/api/ingest \
  -H 'content-type: application/json' \
  -d '{
    "sourceChannel": "telegram",
    "sourceMessageId": "tg-demo-1",
    "text": "다음주 월요일 불량품 수거, 안소영 연락 대기",
    "dryRun": '"${DRY_RUN}"'
  }'
