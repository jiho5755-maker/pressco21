#!/usr/bin/env bash
set -euo pipefail

curl -X POST http://localhost:3000/api/ingest \
  -H 'content-type: application/json' \
  -d '{
    "sourceChannel": "telegram",
    "sourceMessageId": "tg-demo-1",
    "text": "이번 주 안에 거래처 확인 전화 후 견적서 회신하기"
  }'
