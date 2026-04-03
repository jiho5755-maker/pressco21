#!/usr/bin/env python3
"""Relay a Flora frontdoor interaction into the task-ledger bridge."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any


DEFAULT_BASE_URL = "http://127.0.0.1:3000"
DEFAULT_WEBHOOK_URL = "https://n8n.pressco21.com/webhook/flora-conversation-log"
DEFAULT_SOURCE_CHANNEL = "telegram-flora"
DEFAULT_AGENT_ID = "flora-frontdoor"


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def read_text_arg(value: str | None, file_path: str | None) -> str:
    if value:
        return value
    if file_path:
        with open(file_path, "r", encoding="utf-8") as handle:
            return handle.read()
    raise SystemExit("message text is required via --message-text or --message-file")


def parse_bool(value: str) -> bool:
    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "y"}:
        return True
    if normalized in {"0", "false", "no", "n"}:
        return False
    raise argparse.ArgumentTypeError(f"invalid boolean value: {value}")


def build_payload(args: argparse.Namespace) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    source_created_at = args.source_created_at or iso_now()
    source_message_id = args.source_message_id or f"{args.user_chat_id or 'unknown'}:{source_created_at}"
    message_text = read_text_arg(args.message_text, args.message_file).strip()
    response_summary = (args.response_summary or "").strip() or None

    metadata: dict[str, Any] = {
        "capturePath": args.capture_path,
        "requestType": args.request_type,
        "specialistMode": args.specialist_mode,
        "briefingBucket": args.briefing_bucket,
    }
    if args.transport:
        metadata["transport"] = args.transport
    if args.room_id:
        metadata["roomId"] = args.room_id
    if args.thread_id:
        metadata["threadId"] = args.thread_id
    if args.delegation_owner:
        metadata["delegationCandidate"] = {
            "owner": args.delegation_owner,
            "team": args.delegation_team,
        }
    if args.approval_required is not None:
        metadata["approvalCandidate"] = {
            "required": args.approval_required,
            "owner": args.approval_owner,
        }
    if args.extra_metadata:
        metadata.update(json.loads(args.extra_metadata))

    details_merge: dict[str, Any] = {
        "requestType": args.request_type,
        "briefingBucket": args.briefing_bucket,
        "executionRoute": {"kind": args.execution_route},
        "userChatId": args.user_chat_id,
        "userName": args.user_name,
        "transport": args.transport,
        "sourceCreatedAt": source_created_at,
    }
    if args.delegation_owner:
        details_merge["assignmentCandidate"] = {
            "owner": args.delegation_owner,
            "team": args.delegation_team,
        }
    if args.approval_required is not None:
        details_merge["approvalCandidate"] = {
            "required": args.approval_required,
            "owner": args.approval_owner,
        }

    common = {
        "sourceChannel": args.source_channel,
        "sourceMessageId": source_message_id,
        "userChatId": args.user_chat_id,
        "userName": args.user_name,
        "agentId": args.agent_id,
        "messageText": message_text,
        "responseSummary": response_summary,
        "modelUsed": args.model_used,
        "skillTriggered": args.skill_triggered,
        "tokensUsed": args.tokens_used,
        "responseTimeMs": args.response_time_ms,
        "sourceCreatedAt": source_created_at,
        "metadata": metadata,
    }

    ingest_payload = {
        "sourceChannel": args.source_channel,
        "sourceMessageId": source_message_id,
        "text": message_text,
        "userChatId": args.user_chat_id,
        "userName": args.user_name,
        "agentId": args.agent_id,
        "responseSummary": response_summary,
        "modelUsed": args.model_used,
        "skillTriggered": args.skill_triggered,
        "tokensUsed": args.tokens_used,
        "responseTimeMs": args.response_time_ms,
        "sourceCreatedAt": source_created_at,
        "metadata": metadata,
        "detailsMerge": details_merge,
        "dryRun": args.dry_run,
    }

    webhook_payload = {
        "source_channel": args.source_channel,
        "source_message_id": source_message_id,
        "source_created_at": source_created_at,
        "user_chat_id": args.user_chat_id or "",
        "user_name": args.user_name,
        "agent_id": args.agent_id,
        "message_text": message_text,
        "response_summary": response_summary or "",
        "model_used": args.model_used,
        "skill_triggered": args.skill_triggered,
        "tokens_used": args.tokens_used,
        "response_time_ms": args.response_time_ms,
        "request_type": args.request_type,
        "specialist_mode": args.specialist_mode,
        "briefing_bucket": args.briefing_bucket,
        "execution_route": args.execution_route,
        "transport": args.transport,
        "room_id": args.room_id,
        "thread_id": args.thread_id,
        "delegation_candidate": metadata.get("delegationCandidate"),
        "approval_candidate": metadata.get("approvalCandidate"),
        "metadata": metadata,
    }

    return common, ingest_payload, webhook_payload


def post_json(base_url: str, path: str, payload: dict[str, Any], automation_key: str) -> dict[str, Any]:
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "content-type": "application/json",
            "x-flora-automation-key": automation_key,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {"ok": True}
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise SystemExit(f"{path} failed ({error.code}): {body}") from error
    except urllib.error.URLError as error:
        raise SystemExit(f"{path} request failed: {error}") from error


def post_webhook(url: str, payload: dict[str, Any]) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"content-type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {"ok": True}
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise SystemExit(f"webhook failed ({error.code}): {body}") from error
    except urllib.error.URLError as error:
        raise SystemExit(f"webhook request failed: {error}") from error


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=["webhook", "direct"], default=os.getenv("FLORA_RELAY_MODE", "webhook"))
    parser.add_argument("--base-url", default=os.getenv("FLORA_TODO_BASE_URL", DEFAULT_BASE_URL))
    parser.add_argument("--webhook-url", default=os.getenv("FLORA_FRONTDOOR_WEBHOOK_URL", DEFAULT_WEBHOOK_URL))
    parser.add_argument("--automation-key", default=os.getenv("FLORA_AUTOMATION_KEY", ""))
    parser.add_argument("--source-channel", default=DEFAULT_SOURCE_CHANNEL)
    parser.add_argument("--source-message-id")
    parser.add_argument("--source-created-at")
    parser.add_argument("--message-text")
    parser.add_argument("--message-file")
    parser.add_argument("--user-chat-id")
    parser.add_argument("--user-name", default="")
    parser.add_argument("--agent-id", default=DEFAULT_AGENT_ID)
    parser.add_argument("--response-summary")
    parser.add_argument("--model-used", default="gpt-5.4")
    parser.add_argument("--skill-triggered", default="general")
    parser.add_argument("--tokens-used", type=int, default=0)
    parser.add_argument("--response-time-ms", type=int, default=0)
    parser.add_argument("--request-type", default="freeform-memo")
    parser.add_argument("--specialist-mode", default="executive-orchestrator")
    parser.add_argument("--briefing-bucket", default="today")
    parser.add_argument("--delegation-owner")
    parser.add_argument("--delegation-team")
    parser.add_argument("--approval-required", type=parse_bool)
    parser.add_argument("--approval-owner")
    parser.add_argument("--execution-route", default="manual")
    parser.add_argument("--capture-path", default="flora-frontdoor")
    parser.add_argument("--transport", default="telegram")
    parser.add_argument("--room-id")
    parser.add_argument("--thread-id")
    parser.add_argument("--extra-metadata")
    parser.add_argument("--dry-run", action="store_true")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    source_payload, ingest_payload, webhook_payload = build_payload(args)

    if args.mode == "webhook":
        webhook_result = post_webhook(args.webhook_url, webhook_payload)
        output = {
            "ok": True,
            "mode": "webhook",
            "sourceMessageId": webhook_payload["source_message_id"],
            "webhook": webhook_result,
        }
    else:
        if not args.automation_key:
            raise SystemExit("automation key is required in direct mode via --automation-key or FLORA_AUTOMATION_KEY")

        source_result = post_json(args.base_url, "/api/automation/source-messages", source_payload, args.automation_key)
        ingest_result = post_json(args.base_url, "/api/ingest", ingest_payload, args.automation_key)
        output = {
            "ok": True,
            "mode": "direct",
            "sourceMessageId": ingest_payload["sourceMessageId"],
            "sourceMessages": source_result,
            "ingest": ingest_result,
        }

    json.dump(output, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
