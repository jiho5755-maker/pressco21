#!/usr/bin/env python3
"""Capture one Flora frontdoor turn and relay it into the task ledger."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8").strip()


def build_response_summary(text: str, max_chars: int) -> str:
    normalized_lines = [line.rstrip() for line in text.splitlines()]
    normalized = "\n".join(normalized_lines).strip()
    if len(normalized) <= max_chars:
        return normalized
    return normalized[: max_chars - 1].rstrip() + "…"


def infer_briefing_bucket(
    explicit_bucket: str | None,
    request_type: str,
    execution_route: str,
    approval_required: bool | None,
) -> str:
    if explicit_bucket:
        return explicit_bucket
    if approval_required:
        return "approval"
    if request_type == "dev-request" or execution_route == "dev-worker":
        return "dev"
    if request_type in {"waiting", "follow-up"}:
        return "waiting"
    return "today"


def infer_skill_triggered(explicit_skill: str | None, request_type: str) -> str:
    if explicit_skill:
        return explicit_skill
    if request_type == "dev-request":
        return "flora-task-ledger-intake,flora-specialist-router"
    return "flora-specialist-router,flora-task-ledger-intake"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--message-file", required=True)
    parser.add_argument("--reply-file", required=True)
    parser.add_argument("--relay-path")
    parser.add_argument("--journal-dir")
    parser.add_argument("--response-summary-max-chars", type=int, default=1800)
    parser.add_argument("--source-channel", default="telegram-flora")
    parser.add_argument("--source-message-id")
    parser.add_argument("--source-created-at")
    parser.add_argument("--user-chat-id")
    parser.add_argument("--user-name", default="")
    parser.add_argument("--agent-id", default="flora-frontdoor")
    parser.add_argument("--model-used", default="gpt-5.4")
    parser.add_argument("--skill-triggered")
    parser.add_argument("--tokens-used", type=int, default=0)
    parser.add_argument("--response-time-ms", type=int, default=0)
    parser.add_argument("--request-type", default="freeform-memo")
    parser.add_argument("--specialist-mode", default="executive-orchestrator")
    parser.add_argument("--briefing-bucket")
    parser.add_argument("--delegation-owner")
    parser.add_argument("--delegation-team")
    parser.add_argument("--approval-required", choices=["true", "false"])
    parser.add_argument("--approval-owner")
    parser.add_argument("--execution-route", default="manual")
    parser.add_argument("--capture-path", default="flora-frontdoor-auto")
    parser.add_argument("--transport", default="telegram")
    parser.add_argument("--room-id")
    parser.add_argument("--thread-id")
    parser.add_argument("--extra-metadata")
    parser.add_argument("--dry-run", action="store_true")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    relay_path = Path(args.relay_path) if args.relay_path else script_dir / "relay-flora-frontdoor-intake.py"
    if not relay_path.exists():
        raise SystemExit(f"relay script not found: {relay_path}")

    message_file = Path(args.message_file).resolve()
    reply_file = Path(args.reply_file).resolve()
    message_text = read_text(message_file)
    reply_text = read_text(reply_file)
    response_summary = build_response_summary(reply_text, args.response_summary_max_chars)

    approval_required = None
    if args.approval_required is not None:
        approval_required = "true" if args.approval_required == "true" else "false"

    source_created_at = args.source_created_at or iso_now()
    briefing_bucket = infer_briefing_bucket(
        args.briefing_bucket,
        args.request_type,
        args.execution_route,
        args.approval_required == "true",
    )
    skill_triggered = infer_skill_triggered(args.skill_triggered, args.request_type)

    command = [
        sys.executable,
        str(relay_path),
        "--mode",
        "webhook",
        "--message-file",
        str(message_file),
        "--response-summary",
        response_summary,
        "--source-channel",
        args.source_channel,
        "--source-created-at",
        source_created_at,
        "--user-name",
        args.user_name,
        "--agent-id",
        args.agent_id,
        "--model-used",
        args.model_used,
        "--skill-triggered",
        skill_triggered,
        "--tokens-used",
        str(args.tokens_used),
        "--response-time-ms",
        str(args.response_time_ms),
        "--request-type",
        args.request_type,
        "--specialist-mode",
        args.specialist_mode,
        "--briefing-bucket",
        briefing_bucket,
        "--execution-route",
        args.execution_route,
        "--capture-path",
        args.capture_path,
        "--transport",
        args.transport,
    ]
    if args.source_message_id:
        command.extend(["--source-message-id", args.source_message_id])
    if args.user_chat_id:
        command.extend(["--user-chat-id", args.user_chat_id])
    if args.room_id:
        command.extend(["--room-id", args.room_id])
    if args.thread_id:
        command.extend(["--thread-id", args.thread_id])
    if args.delegation_owner:
        command.extend(["--delegation-owner", args.delegation_owner])
    if args.delegation_team:
        command.extend(["--delegation-team", args.delegation_team])
    if approval_required is not None:
        command.extend(["--approval-required", approval_required])
    if args.approval_owner:
        command.extend(["--approval-owner", args.approval_owner])
    if args.extra_metadata:
        command.extend(["--extra-metadata", args.extra_metadata])
    if args.dry_run:
        command.append("--dry-run")

    completed = subprocess.run(command, capture_output=True, text=True, check=False)
    journal_dir = Path(args.journal_dir) if args.journal_dir else script_dir / ".frontdoor-intake-journal"
    journal_dir.mkdir(parents=True, exist_ok=True)
    journal_path = journal_dir / f"{source_created_at.replace(':', '-').replace('.', '-')}.json"
    journal_payload = {
        "capturedAt": iso_now(),
        "sourceCreatedAt": source_created_at,
        "sourceMessageId": args.source_message_id,
        "requestType": args.request_type,
        "specialistMode": args.specialist_mode,
        "briefingBucket": briefing_bucket,
        "executionRoute": args.execution_route,
        "userChatId": args.user_chat_id,
        "userName": args.user_name,
        "messageFile": str(message_file),
        "replyFile": str(reply_file),
        "replySummary": response_summary,
        "relayPath": str(relay_path),
        "relayExitCode": completed.returncode,
        "relayStdout": completed.stdout,
        "relayStderr": completed.stderr,
    }
    journal_path.write_text(json.dumps(journal_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if completed.returncode != 0:
        sys.stderr.write(completed.stderr)
        sys.stderr.write(f"journal: {journal_path}\n")
        return completed.returncode

    sys.stdout.write(completed.stdout)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
