#!/usr/bin/env python3
"""Build a recent Flora memo cache file from the live flora-todo source_messages API."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path


DEFAULT_ORACLE_HOST = "ubuntu@158.180.77.201"
DEFAULT_ORACLE_KEY = "~/.ssh/oracle-n8n.key"
DEFAULT_REMOTE_DIR = "/home/ubuntu/flora-todo-mvp"
DEFAULT_SOURCE_CHANNEL = "telegram-flora"

INBOUND_METADATA_PATTERNS = [
    re.compile(
        r"(?:^|\n)Conversation info \(untrusted metadata\):\n```json\n.*?\n```(?:\n+)?",
        re.DOTALL,
    ),
    re.compile(
        r"(?:^|\n)Sender \(untrusted metadata\):\n```json\n.*?\n```(?:\n+)?",
        re.DOTALL,
    ),
]


def run_ssh(host: str, key: str, remote_command: str) -> str:
    completed = subprocess.run(
        [
            "ssh",
            "-i",
            key,
            "-o",
            "ConnectTimeout=10",
            host,
            remote_command,
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if completed.returncode != 0:
        raise SystemExit(completed.stderr.strip() or "ssh command failed")
    return completed.stdout


def read_automation_key(host: str, key: str, remote_dir: str) -> str:
    output = run_ssh(
        host,
        key,
        f"python3 - <<'PY'\n"
        f"from pathlib import Path\n"
        f"path = Path('{remote_dir}/.env.oracle')\n"
        f"for line in path.read_text().splitlines():\n"
        f"    if line.startswith('AUTOMATION_API_KEY='):\n"
        f"        print(line.split('=', 1)[1].strip())\n"
        f"        break\n"
        f"PY",
    ).strip()
    if not output:
        raise SystemExit("AUTOMATION_API_KEY not found on Oracle host")
    return output


def fetch_recent_messages(host: str, key: str, automation_key: str, source_channel: str, limit: int) -> dict:
    remote_python = f"""python3 - <<'PY'
import json
import urllib.parse
import urllib.request

url = "http://127.0.0.1:3001/api/automation/source-messages?" + urllib.parse.urlencode({{
    "sourceChannel": {source_channel!r},
    "limit": {limit},
}})
request = urllib.request.Request(url, headers={{"x-flora-automation-key": {automation_key!r}}})
with urllib.request.urlopen(request, timeout=10) as response:
    print(response.read().decode("utf-8"))
PY"""
    raw = run_ssh(host, key, remote_python)
    return json.loads(raw)


def sanitize_message_text(text: str | None) -> str | None:
    if text is None:
        return None
    cleaned = text
    for pattern in INBOUND_METADATA_PATTERNS:
        cleaned = pattern.sub("\n", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    return cleaned


def build_cache_items(payload: dict) -> list[dict]:
    items = payload.get("items", [])
    cache_items: list[dict] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        cache_items.append(
            {
                "sourceChannel": item.get("sourceChannel"),
                "sourceMessageId": item.get("sourceMessageId"),
                "userChatId": item.get("userChatId"),
                "userName": item.get("userName"),
                "messageText": sanitize_message_text(item.get("messageText")),
                "responseSummary": item.get("responseSummary"),
                "sourceCreatedAt": item.get("sourceCreatedAt"),
                "createdAt": item.get("createdAt"),
                "requestType": (item.get("metadata") or {}).get("requestType"),
                "briefingBucket": (item.get("metadata") or {}).get("briefingBucket"),
                "transport": (item.get("metadata") or {}).get("transport"),
            }
        )
    return cache_items


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True)
    parser.add_argument("--oracle-host", default=DEFAULT_ORACLE_HOST)
    parser.add_argument("--oracle-key", default=DEFAULT_ORACLE_KEY)
    parser.add_argument("--remote-dir", default=DEFAULT_REMOTE_DIR)
    parser.add_argument("--source-channel", default=DEFAULT_SOURCE_CHANNEL)
    parser.add_argument("--limit", type=int, default=40)
    args = parser.parse_args()

    automation_key = read_automation_key(args.oracle_host, args.oracle_key, args.remote_dir)
    payload = fetch_recent_messages(args.oracle_host, args.oracle_key, automation_key, args.source_channel, args.limit)
    cache = {
        "ok": bool(payload.get("ok")),
        "sourceChannel": args.source_channel,
        "count": len(payload.get("items", [])),
        "items": build_cache_items(payload),
    }

    output_path = Path(args.output)
    output_path.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
