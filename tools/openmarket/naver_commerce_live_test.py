#!/usr/bin/env python3
"""
네이버 커머스API 실계정 검증 도구.

기본 사용 흐름:
1. 로컬에서 .secrets.env를 읽어 전자서명을 생성한다.
2. 필요하면 허용 IP가 잡힌 서버로 SSH 접속해 실제 HTTP 요청을 실행한다.
3. 결과를 JSON 또는 사람이 읽기 쉬운 텍스트로 출력한다.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import subprocess
import sys
import time
import urllib.parse
from pathlib import Path

import bcrypt
import requests


DEFAULT_BASE_URL = "https://api.commerce.naver.com/external"
DEFAULT_TOKEN_URL = f"{DEFAULT_BASE_URL}/v1/oauth2/token"


def load_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def build_signed_form(client_id: str, client_secret: str, token_type: str, account_id: str | None) -> str:
    timestamp = str(int(time.time() * 1000))
    password = f"{client_id}_{timestamp}".encode()
    hashed = bcrypt.hashpw(password, client_secret.encode())
    signature = base64.b64encode(hashed).decode()
    body = {
        "client_id": client_id,
        "timestamp": timestamp,
        "client_secret_sign": signature,
        "grant_type": "client_credentials",
        "type": token_type,
    }
    if account_id:
        body["account_id"] = account_id
    return urllib.parse.urlencode(body)


def build_remote_script(token_form: str, action: str, params: dict[str, str], base_url: str) -> str:
    payload = json.dumps({"action": action, "params": params}, ensure_ascii=False)
    return f"""
import json
import requests
import sys
import urllib.parse

TOKEN_FORM = {json.dumps(token_form)}
ACTION_PAYLOAD = {payload}
BASE_URL = {json.dumps(base_url)}
TOKEN_URL = BASE_URL.rstrip("/") + "/v1/oauth2/token"

def fail(message, extra=None):
    out = {{"ok": False, "message": message}}
    if extra is not None:
        out["extra"] = extra
    print(json.dumps(out, ensure_ascii=False))
    raise SystemExit(1)

resp = requests.post(
    TOKEN_URL,
    headers={{"Content-Type": "application/x-www-form-urlencoded"}},
    data=TOKEN_FORM,
    timeout=20,
)
try:
    token_json = resp.json()
except Exception:
    token_json = {{"raw": resp.text}}

access_token = token_json.get("access_token", "")
if not access_token:
    fail("token_request_failed", {{"status_code": resp.status_code, "body": token_json}})

headers = {{
    "Authorization": "Bearer " + access_token,
    "Accept": "application/json",
}}

action = ACTION_PAYLOAD["action"]
params = ACTION_PAYLOAD["params"]
result = {{
    "ok": True,
    "token_type": params.get("token_type", "SELF"),
    "action": action,
}}

if action == "seller-account":
    r = requests.get(BASE_URL + "/v1/seller/account", headers=headers, timeout=20)
    result["status_code"] = r.status_code
    result["body"] = r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text
elif action == "list-customer-inquiries":
    query = "startSearchDate=" + params["start"] + "&endSearchDate=" + params["end"]
    url = BASE_URL + "/v1/pay-user/inquiries?" + query
    r = requests.get(url, headers=headers, timeout=20)
    result["status_code"] = r.status_code
    result["body"] = r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text
elif action == "list-qnas":
    query = "fromDate=" + urllib.parse.quote(params["from_dt"], safe="") + "&toDate=" + urllib.parse.quote(params["to_dt"], safe="")
    if params.get("page"):
        query += "&page=" + params["page"]
    if params.get("size"):
        query += "&size=" + params["size"]
    url = BASE_URL + "/v1/contents/qnas?" + query
    r = requests.get(url, headers=headers, timeout=20)
    result["status_code"] = r.status_code
    result["body"] = r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text
elif action == "answer-qna":
    headers["Content-Type"] = "application/json"
    url = BASE_URL + "/v1/contents/qnas/" + params["question_id"]
    payload = {{"commentContent": params["comment_content"]}}
    r = requests.put(url, headers=headers, json=payload, timeout=20)
    result["status_code"] = r.status_code
    if r.text:
        result["body"] = r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text
    else:
        result["body"] = ""
elif action == "answer-customer-inquiry":
    headers["Content-Type"] = "application/json"
    url = BASE_URL + "/v1/pay-merchant/inquiries/" + params["inquiry_no"] + "/answer"
    payload = {{"replyContent": params["reply_content"]}}
    r = requests.post(url, headers=headers, json=payload, timeout=20)
    result["status_code"] = r.status_code
    result["body"] = r.json() if r.text and r.headers.get("content-type", "").startswith("application/json") else r.text
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
    print(f"status_code: {result.get('status_code')}")
    body = result.get("body")
    if isinstance(body, dict):
        print(json.dumps(body, ensure_ascii=False, indent=2))
    else:
        print(body)


def main() -> int:
    parser = argparse.ArgumentParser(description="네이버 커머스API 실계정 검증 도구")
    parser.add_argument("--env-file", default=".secrets.env", help="인증값이 들어있는 env 파일 경로")
    parser.add_argument("--remote-host", help="허용 IP 서버로 SSH 실행할 때 사용. 예: ubuntu@158.180.77.201")
    parser.add_argument("--ssh-key", default=os.path.expanduser("~/.ssh/oracle-n8n.key"), help="SSH 키 경로")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="네이버 커머스 API base URL")
    parser.add_argument("--json", action="store_true", help="결과를 JSON 그대로 출력")

    subparsers = parser.add_subparsers(dest="command", required=True)

    seller_parser = subparsers.add_parser("seller-account", help="현재 계정 정보 조회")
    seller_parser.add_argument("--token-type", default="SELF", choices=["SELF", "SELLER"])
    seller_parser.add_argument("--account-id", help="SELLER 토큰 발급 시 판매자 UID(account_id)")

    customer_parser = subparsers.add_parser("list-customer-inquiries", help="고객 문의 조회")
    customer_parser.add_argument("--start", required=True, help="YYYY-MM-DD")
    customer_parser.add_argument("--end", required=True, help="YYYY-MM-DD")
    customer_parser.add_argument("--token-type", default="SELF", choices=["SELF", "SELLER"])
    customer_parser.add_argument("--account-id", help="SELLER 토큰 발급 시 판매자 UID(account_id)")

    qna_parser = subparsers.add_parser("list-qnas", help="상품 문의 조회")
    qna_parser.add_argument("--from-dt", required=True, help="예: 2026-04-08T00:00:00+09:00")
    qna_parser.add_argument("--to-dt", required=True, help="예: 2026-04-09T23:59:59+09:00")
    qna_parser.add_argument("--page", help="선택 페이지")
    qna_parser.add_argument("--size", help="선택 페이지 크기")
    qna_parser.add_argument("--token-type", default="SELF", choices=["SELF", "SELLER"])
    qna_parser.add_argument("--account-id", help="SELLER 토큰 발급 시 판매자 UID(account_id)")

    answer_qna_parser = subparsers.add_parser("answer-qna", help="상품 문의 답변 등록/수정")
    answer_qna_parser.add_argument("--question-id", required=True)
    answer_qna_parser.add_argument("--comment-content", required=True)
    answer_qna_parser.add_argument("--token-type", default="SELF", choices=["SELF", "SELLER"])
    answer_qna_parser.add_argument("--account-id", help="SELLER 토큰 발급 시 판매자 UID(account_id)")

    answer_customer_parser = subparsers.add_parser("answer-customer-inquiry", help="고객 문의 답변 등록")
    answer_customer_parser.add_argument("--inquiry-no", required=True)
    answer_customer_parser.add_argument("--reply-content", required=True)
    answer_customer_parser.add_argument("--token-type", default="SELF", choices=["SELF", "SELLER"])
    answer_customer_parser.add_argument("--account-id", help="SELLER 토큰 발급 시 판매자 UID(account_id)")

    args = parser.parse_args()
    env_values = load_env_file(Path(args.env_file))
    client_id = env_values.get("NAVER_COMMERCE_CLIENT_ID", "")
    client_secret = env_values.get("NAVER_COMMERCE_CLIENT_SECRET", "")
    if not client_id or not client_secret:
        raise SystemExit("NAVER_COMMERCE_CLIENT_ID / NAVER_COMMERCE_CLIENT_SECRET 이 필요합니다.")

    params = vars(args).copy()
    command = params.pop("command")
    params.pop("env_file", None)
    params.pop("remote_host", None)
    params.pop("ssh_key", None)
    params.pop("base_url", None)
    output_json = params.pop("json", False)

    token_type = params.get("token_type") or "SELF"
    account_id = params.get("account_id")
    token_form = build_signed_form(client_id, client_secret, token_type=token_type, account_id=account_id)
    script = build_remote_script(
        token_form,
        command,
        {k: str(v) for k, v in params.items() if v is not None},
        base_url=args.base_url,
    )

    if args.remote_host:
        raw = run_remote(script, args.remote_host, args.ssh_key)
    else:
        raw = run_local(script)

    result = json.loads(raw)
    if output_json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print_human(result)
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
