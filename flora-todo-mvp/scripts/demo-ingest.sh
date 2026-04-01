#!/usr/bin/env bash
set -euo pipefail

DRY_RUN="${DRY_RUN:-false}"

curl -sS -X POST http://127.0.0.1:3000/api/ingest \
  -H 'content-type: application/json' \
  -d '{
    "sourceChannel": "demo-api-sprint2",
    "sourceMessageId": "demo-api-1",
    "text": "레지너스 답변 및 주문 마무리\n다음주 월요일 불량품 수거, 안소영 연락 대기",
    "dryRun": '"${DRY_RUN}"'
  }'
