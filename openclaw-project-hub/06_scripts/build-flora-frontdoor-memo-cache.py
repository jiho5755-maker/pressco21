#!/usr/bin/env python3
"""Build Flora frontdoor cache files from the live flora-todo source/task ledger."""

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
DEFAULT_TASK_LIMIT = 60
DEFAULT_POSTGRES_CONTAINER = "flora-todo-mvp-postgres"

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


def fetch_open_items(host: str, key: str, postgres_container: str, limit: int) -> list[dict]:
    remote_python = f"""python3 - <<'PY'
import json
import subprocess
import sys

sql = '''
select coalesce(json_agg(row_to_json(items)), '[]'::json)
from (
  select
    t.id,
    t.title,
    t.status,
    t.priority,
    t.category,
    t.due_at,
    t.time_bucket,
    t.waiting_for,
    t.related_project,
    left(t.source_text, 400) as source_text,
    t.source_channel,
    t.source_message_id,
    t.created_at,
    t.updated_at,
    coalesce(sm.user_chat_id, t.details_json->>'userChatId') as user_chat_id,
    coalesce(nullif(sm.user_name, ''), t.details_json->>'userName', '') as user_name,
    coalesce(
      (
        select json_agg(
          json_build_object(
            'id', r.id,
            'title', r.title,
            'remindAt', r.remind_at,
            'kind', r.kind,
            'status', r.status
          )
          order by r.remind_at asc, r.created_at asc
        )
        from reminders r
        where r.task_id = t.id
          and r.status <> 'cancelled'
      ),
      '[]'::json
    ) as reminders,
    coalesce(
      (
        select json_agg(
          json_build_object(
            'id', f.id,
            'subject', f.subject,
            'waitingFor', f.waiting_for,
            'nextCheckAt', f.next_check_at,
            'status', f.status
          )
          order by f.next_check_at asc nulls last, f.created_at asc
        )
        from followups f
        where f.task_id = t.id
          and f.status in ('open', 'waiting')
      ),
      '[]'::json
    ) as followups
  from tasks t
  left join source_messages sm
    on sm.source_channel = t.source_channel
   and sm.source_message_id = t.source_message_id
  where t.ignored_at is null
    and t.status in ('todo', 'waiting', 'needs_check', 'in_progress')
    and (
      t.status in ('waiting', 'needs_check', 'in_progress')
      or t.due_at is not null
      or t.time_bucket is not null
      or t.waiting_for is not null
      or t.related_project is not null
      or exists (
        select 1
        from reminders r2
        where r2.task_id = t.id
          and r2.status <> 'cancelled'
      )
      or exists (
        select 1
        from followups f2
        where f2.task_id = t.id
          and f2.status in ('open', 'waiting')
      )
    )
  order by t.updated_at desc, t.created_at desc, t.id desc
  limit {limit}
) items;
'''

result = subprocess.run(
    [
        "docker",
        "exec",
        "-i",
        {postgres_container!r},
        "psql",
        "-U",
        "postgres",
        "-d",
        "flora_todo_mvp",
        "-t",
        "-A",
        "-c",
        sql,
    ],
    capture_output=True,
    text=True,
    check=False,
)
if result.returncode != 0:
    sys.stderr.write(result.stderr)
    raise SystemExit(result.returncode)
print(result.stdout.strip())
PY"""
    raw = run_ssh(host, key, remote_python).strip()
    if not raw:
        return []
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


def build_open_item_cache(items: list[dict]) -> dict:
    cache_items: list[dict] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        cache_items.append(
            {
                "id": item.get("id"),
                "title": item.get("title"),
                "status": item.get("status"),
                "priority": item.get("priority"),
                "category": item.get("category"),
                "dueAt": item.get("due_at"),
                "timeBucket": item.get("time_bucket"),
                "waitingFor": item.get("waiting_for"),
                "relatedProject": item.get("related_project"),
                "sourceText": sanitize_message_text(item.get("source_text")),
                "sourceChannel": item.get("source_channel"),
                "sourceMessageId": item.get("source_message_id"),
                "createdAt": item.get("created_at"),
                "updatedAt": item.get("updated_at"),
                "userChatId": item.get("user_chat_id"),
                "userName": item.get("user_name"),
                "reminders": item.get("reminders") if isinstance(item.get("reminders"), list) else [],
                "followups": item.get("followups") if isinstance(item.get("followups"), list) else [],
            }
        )
    return {
        "ok": True,
        "count": len(cache_items),
        "items": cache_items,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True)
    parser.add_argument("--oracle-host", default=DEFAULT_ORACLE_HOST)
    parser.add_argument("--oracle-key", default=DEFAULT_ORACLE_KEY)
    parser.add_argument("--remote-dir", default=DEFAULT_REMOTE_DIR)
    parser.add_argument("--source-channel", default=DEFAULT_SOURCE_CHANNEL)
    parser.add_argument("--limit", type=int, default=40)
    parser.add_argument("--open-items-output")
    parser.add_argument("--task-limit", type=int, default=DEFAULT_TASK_LIMIT)
    parser.add_argument("--postgres-container", default=DEFAULT_POSTGRES_CONTAINER)
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

    if args.open_items_output:
        open_items = fetch_open_items(args.oracle_host, args.oracle_key, args.postgres_container, args.task_limit)
        open_items_path = Path(args.open_items_output)
        open_items_path.write_text(
            json.dumps(build_open_item_cache(open_items), ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
