#!/usr/bin/env python3
"""
메이크샵 Open API 실계정 검증 도구.

기본 사용 흐름:
1. 로컬 또는 원격 env 파일에서 Shopkey/Licensekey를 읽는다.
2. read-only probe는 바로 실행하고, write는 현재 preview 단계로만 제공한다.
3. 고객 PII는 기본적으로 마스킹해서 출력한다.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path


DEFAULT_DOMAIN = "foreverlove.co.kr"


def load_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def build_remote_script(action: str, params: dict[str, str], domain: str, env_file: str) -> str:
    payload = json.dumps({"action": action, "params": params}, ensure_ascii=False)
    return f"""
import json
from pathlib import Path

import requests

ACTION_PAYLOAD = {payload}
DOMAIN = {json.dumps(domain)}
ENV_FILE = {json.dumps(env_file)}


def fail(message, extra=None):
    out = {{"ok": False, "message": message}}
    if extra is not None:
        out["extra"] = extra
    print(json.dumps(out, ensure_ascii=False))
    raise SystemExit(1)


def load_env_file(path):
    values = {{}}
    for raw_line in Path(path).read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def parse_json_body(response):
    try:
        return response.json()
    except Exception:
        try:
            return json.loads(response.text)
        except Exception:
            return {{"raw": response.text}}


def mask_name(value):
    text = str(value or "").strip()
    if not text:
        return ""
    if len(text) <= 2:
        return text[0] + "*"
    return text[0] + "*" * (len(text) - 2) + text[-1]


def mask_phone(value):
    digits = "".join(ch for ch in str(value or "") if ch.isdigit())
    if len(digits) < 7:
        return ""
    return digits[:3] + "-****-" + digits[-4:]


def mask_email(value):
    text = str(value or "").strip()
    if "@" not in text:
        return ""
    local, domain = text.split("@", 1)
    if len(local) <= 2:
        masked_local = local[:1] + "*"
    else:
        masked_local = local[:2] + "*" * max(1, len(local) - 2)
    return masked_local + "@" + domain


def summarize_board_codes(items):
    return [
        {{
            "code": item.get("code"),
            "name": item.get("name"),
            "type": item.get("type"),
            "comment": item.get("comment"),
            "reply": item.get("reply"),
            "write_type": item.get("write_type"),
        }}
        for item in (items or [])
    ]


def summarize_crm_board(items):
    summary = []
    for item in (items or []):
        summary.append(
            {{
                "date": item.get("date"),
                "type": item.get("type"),
                "userid": item.get("userid"),
                "customer_name": mask_name(item.get("hname")),
                "phone": mask_phone(item.get("phone")),
                "email": mask_email(item.get("email")),
                "subject": item.get("subject"),
                "content_preview": str(item.get("content", ""))[:140],
                "reply_yn": item.get("reply_yn"),
                "board_name": item.get("board_name"),
            }}
        )
    return summary


def summarize_reviews(items):
    summary = []
    for item in (items or []):
        summary.append(
            {{
                "uid": item.get("uid"),
                "date": item.get("date"),
                "userid": item.get("userid"),
                "customer_name": mask_name(item.get("hname")),
                "score": item.get("score"),
                "subject": item.get("subject"),
                "content_preview": str(item.get("content", ""))[:140],
                "reply_content_preview": str(item.get("reply_content", ""))[:140],
                "display": item.get("display"),
            }}
        )
    return summary


env_values = load_env_file(ENV_FILE)
shopkey = env_values.get("MAKESHOP_SHOPKEY")
licensekey = env_values.get("MAKESHOP_LICENSEKEY")
if not shopkey or not licensekey:
    fail("makeshop_credentials_missing", {{"env_file": ENV_FILE}})

headers = {{
    "Shopkey": shopkey,
    "Licensekey": licensekey,
}}
base_url = f"https://{{DOMAIN}}"
action = ACTION_PAYLOAD["action"]
params = ACTION_PAYLOAD["params"]
result = {{
    "ok": True,
    "action": action,
    "domain": DOMAIN,
}}

if action == "list-board-codes":
    response = requests.get(
        base_url + "/list/open_api.html",
        headers=headers,
        params={{"mode": "search", "type": "board_code"}},
        timeout=30,
    )
    body = parse_json_body(response)
    result["status_code"] = response.status_code
    result["body"] = {{
        "return_code": body.get("return_code"),
        "count": body.get("count"),
        "list": summarize_board_codes(body.get("list")),
    }}
elif action == "list-crm-board":
    query = {{
        "mode": "search",
        "type": "crm_board",
        "InquiryTimeFrom": params["from_dt"],
        "InquiryTimeTo": params["to_dt"],
        "is_member": params["member_type"],
    }}
    if params.get("page"):
        query["page"] = params["page"]
    if params.get("limit"):
        query["limit"] = params["limit"]
    response = requests.get(base_url + "/list/open_api.html", headers=headers, params=query, timeout=30)
    body = parse_json_body(response)
    result["status_code"] = response.status_code
    result["body"] = {{
        "return_code": body.get("return_code"),
        "totalCount": body.get("totalCount"),
        "count": body.get("count"),
        "page": body.get("page"),
        "list": summarize_crm_board(body.get("list")),
    }}
elif action == "list-reviews":
    query = {{
        "mode": "search",
        "type": "review",
        "InquiryTimeFrom": params["from_dt"],
        "InquiryTimeTo": params["to_dt"],
    }}
    if params.get("page"):
        query["page"] = params["page"]
    if params.get("limit"):
        query["limit"] = params["limit"]
    response = requests.get(base_url + "/list/open_api.html", headers=headers, params=query, timeout=30)
    body = parse_json_body(response)
    result["status_code"] = response.status_code
    result["body"] = {{
        "return_code": body.get("return_code"),
        "count": body.get("count"),
        "page": body.get("page"),
        "list": summarize_reviews(body.get("list")),
    }}
elif action == "preview-crm-reply":
    payload = {{
        "datas[0][date]": params["date"],
        "datas[0][reply_content]": params["reply_content"],
        "datas[0][send_email]": params.get("send_email", "N"),
        "datas[0][send_sms]": params.get("send_sms", "N"),
    }}
    if params.get("userid"):
        payload["datas[0][userid]"] = params["userid"]
    result["status_code"] = 0
    result["body"] = {{
        "endpoint": "/list/open_api_process.html?mode=save&type=crm_board&process=reply",
        "payload": payload,
        "note": "preview only - live write not executed",
    }}
elif action == "preview-review-answer":
    result["status_code"] = 0
    result["body"] = {{
        "endpoint": "/list/open_api_process.html?mode=save&type=review&process=store",
        "payload": {{
            "uid": params["uid"],
            "save_type": "answer",
            "reply_content": params["reply_content"],
        }},
        "note": "preview only - live write not executed",
    }}
else:
    fail("unsupported_action", {{"action": action}})

print(json.dumps(result, ensure_ascii=False))
"""


def run_remote(script: str, remote_host: str, ssh_key: str | None) -> str:
    cmd = ["ssh", "-o", "StrictHostKeyChecking=no"]
    if ssh_key:
        cmd.extend(["-i", ssh_key])
    cmd.extend([remote_host, "python3 -"])
    proc = subprocess.run(cmd, input=script, text=True, capture_output=True, check=False)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip() or "remote command failed")
    return proc.stdout.strip()


def run_local(script: str) -> str:
    proc = subprocess.run([sys.executable, "-"], input=script, text=True, capture_output=True, check=False)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip() or "local command failed")
    return proc.stdout.strip()


def print_human(result: dict) -> None:
    print(f"action: {result.get('action')}")
    print(f"domain: {result.get('domain')}")
    print(f"status_code: {result.get('status_code')}")
    body = result.get("body")
    if isinstance(body, dict):
        print(json.dumps(body, ensure_ascii=False, indent=2))
    else:
        print(body)


def main() -> int:
    parser = argparse.ArgumentParser(description="메이크샵 Open API 실계정 검증 도구")
    parser.add_argument("--env-file", default=".secrets.env", help="로컬 env 파일 경로")
    parser.add_argument(
        "--remote-env-file",
        default="/home/ubuntu/n8n/.env",
        help="원격 실행 시 사용할 env 파일 경로",
    )
    parser.add_argument("--remote-host", help="허용 IP 서버로 SSH 실행할 때 사용. 예: ubuntu@158.180.77.201")
    parser.add_argument("--ssh-key", default=os.path.expanduser("~/.ssh/oracle-n8n.key"), help="SSH 키 경로")
    parser.add_argument("--domain", default=DEFAULT_DOMAIN, help="메이크샵 상점 도메인")
    parser.add_argument("--json", action="store_true", help="결과를 JSON 그대로 출력")

    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("list-board-codes", help="게시판 코드 조회")

    crm_parser = subparsers.add_parser("list-crm-board", help="1:1 게시판 조회")
    crm_parser.add_argument("--from-dt", required=True, help="예: 2026-04-01 00:00:00")
    crm_parser.add_argument("--to-dt", required=True, help="예: 2026-04-09 23:59:59")
    crm_parser.add_argument("--member-type", default="MEMBER", choices=["MEMBER", "GUEST"])
    crm_parser.add_argument("--page", help="선택 페이지")
    crm_parser.add_argument("--limit", help="선택 limit")

    review_parser = subparsers.add_parser("list-reviews", help="후기 조회")
    review_parser.add_argument("--from-dt", required=True, help="예: 2026-04-01")
    review_parser.add_argument("--to-dt", required=True, help="예: 2026-04-09")
    review_parser.add_argument("--page", help="선택 페이지")
    review_parser.add_argument("--limit", help="선택 limit")

    preview_crm_reply = subparsers.add_parser("preview-crm-reply", help="1:1 답변 payload 미리보기")
    preview_crm_reply.add_argument("--date", required=True, help="문의 작성일. 예: 2026-04-06 08:42:27")
    preview_crm_reply.add_argument("--reply-content", required=True)
    preview_crm_reply.add_argument("--userid", help="회원 ID. 비회원 문의면 생략")
    preview_crm_reply.add_argument("--send-email", default="N", choices=["Y", "N"])
    preview_crm_reply.add_argument("--send-sms", default="N", choices=["Y", "N"])

    preview_review = subparsers.add_parser("preview-review-answer", help="후기 답변 payload 미리보기")
    preview_review.add_argument("--uid", required=True, help="후기 uid")
    preview_review.add_argument("--reply-content", required=True)

    args = parser.parse_args()
    params = vars(args).copy()
    command = params.pop("command")
    output_json = params.pop("json", False)
    remote_host = params.pop("remote_host", None)
    ssh_key = params.pop("ssh_key", None)
    domain = params.pop("domain", None)
    local_env_file = params.pop("env_file", None)
    remote_env_file = params.pop("remote_env_file", None)

    if not remote_host:
        env_values = load_env_file(Path(local_env_file))
        if not env_values.get("MAKESHOP_SHOPKEY") or not env_values.get("MAKESHOP_LICENSEKEY"):
            raise SystemExit("MAKESHOP_SHOPKEY / MAKESHOP_LICENSEKEY 이 필요합니다.")

    script = build_remote_script(
        command,
        {k: str(v) for k, v in params.items() if v is not None},
        domain or DEFAULT_DOMAIN,
        remote_env_file if remote_host else local_env_file,
    )

    raw = run_remote(script, remote_host, ssh_key) if remote_host else run_local(script)
    result = json.loads(raw)
    if output_json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print_human(result)
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
