#!/usr/bin/env python3
"""
쿠팡 고객문의 실검증 준비 도구.

현재 단계에서는 read-only 조회와 reply payload preview까지 제공한다.
실제 write는 승인형 UI와 함께 별도 안전장치를 둔 뒤 연결한다.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path


DEFAULT_BASE_URL = "https://api-gateway.coupang.com"


def load_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def build_remote_script(action: str, params: dict[str, str], env_file: str, base_url: str) -> str:
    payload = json.dumps({"action": action, "params": params}, ensure_ascii=False)
    return f"""
import hashlib
import hmac
import json
import time
import urllib.parse
from pathlib import Path

import requests

ACTION_PAYLOAD = {payload}
ENV_FILE = {json.dumps(env_file)}
BASE_URL = {json.dumps(base_url)}


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


def make_auth_header(method, path, query, access_key, secret_key):
    signed_date = time.strftime("%y%m%dT%H%M%SZ", time.gmtime())
    message = signed_date + method + path + query
    signature = hmac.new(secret_key.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"CEA algorithm=HmacSHA256, access-key={{access_key}}, signed-date={{signed_date}}, signature={{signature}}"


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


def parse_json_body(response):
    try:
        return response.json()
    except Exception:
        return {{"raw": response.text}}


def summarize_online_items(items):
    rows = []
    for item in items or []:
        rows.append(
            {{
                "inquiryId": item.get("inquiryId"),
                "productId": item.get("productId"),
                "sellerProductId": item.get("sellerProductId"),
                "vendorItemId": item.get("vendorItemId"),
                "inquiryAt": item.get("inquiryAt"),
                "answeredAt": item.get("answeredAt"),
                "answerStatus": item.get("answerStatus"),
                "buyerName": mask_name(item.get("buyerName")),
                "buyerPhone": mask_phone(item.get("buyerPhone")),
                "content_preview": str(item.get("content", ""))[:160],
            }}
        )
    return rows


def summarize_call_center_items(items):
    rows = []
    for item in items or []:
        rows.append(
            {{
                "inquiryId": item.get("inquiryId"),
                "productId": item.get("productId"),
                "vendorItemId": item.get("vendorItemId"),
                "inquiryAt": item.get("inquiryAt"),
                "partnerCounselingStatus": item.get("partnerCounselingStatus"),
                "partnerTransferStatus": item.get("partnerTransferStatus"),
                "buyerName": mask_name(item.get("buyerName")),
                "buyerPhone": mask_phone(item.get("buyerPhone")),
                "content_preview": str(item.get("inquiryContent", ""))[:160],
            }}
        )
    return rows


action = ACTION_PAYLOAD["action"]
params = ACTION_PAYLOAD["params"]
env = load_env_file(ENV_FILE)
access_key = env.get("COUPANG_ACCESS_KEY") or env.get("COUPANG_API_ACCESS_KEY")
secret_key = env.get("COUPANG_SECRET_KEY") or env.get("COUPANG_API_SECRET_KEY")
vendor_id = params.get("vendor_id") or env.get("COUPANG_VENDOR_ID")
wing_id = params.get("wing_id") or env.get("COUPANG_WING_ID") or env.get("COUPANG_VENDOR_USER_ID")
result = {{"ok": True, "action": action, "vendorId": vendor_id}}

if action == "list-online-inquiries":
    if not access_key or not secret_key or not vendor_id:
        fail(
            "coupang_credentials_missing",
            {{
                "required": ["COUPANG_ACCESS_KEY", "COUPANG_SECRET_KEY", "COUPANG_VENDOR_ID"],
                "env_file": ENV_FILE,
            }},
        )
    query_params = {{
        "vendorId": vendor_id,
        "answeredType": params["answered_type"],
        "inquiryStartAt": params["from_dt"],
        "inquiryEndAt": params["to_dt"],
        "pageSize": params.get("page_size", "10"),
        "pageNum": params.get("page_num", "1"),
    }}
    query = urllib.parse.urlencode(query_params)
    path = f"/v2/providers/openapi/apis/api/v5/vendors/{{vendor_id}}/onlineInquiries"
    auth = make_auth_header("GET", path, query, access_key, secret_key)
    response = requests.get(
        BASE_URL + path,
        headers={{"Authorization": auth, "Content-Type": "application/json;charset=UTF-8"}},
        params=query_params,
        timeout=30,
    )
    body = parse_json_body(response)
    data = body.get("data", {{}}) if isinstance(body, dict) else {{}}
    result["status_code"] = response.status_code
    result["body"] = {{
        "code": body.get("code"),
        "message": body.get("message"),
        "pageNum": data.get("pageNum"),
        "pageSize": data.get("pageSize"),
        "totalElements": data.get("totalElements"),
        "content": summarize_online_items(data.get("content")),
    }}
elif action == "list-call-center-inquiries":
    if not access_key or not secret_key or not vendor_id:
        fail(
            "coupang_credentials_missing",
            {{
                "required": ["COUPANG_ACCESS_KEY", "COUPANG_SECRET_KEY", "COUPANG_VENDOR_ID"],
                "env_file": ENV_FILE,
            }},
        )
    query_params = {{
        "vendorId": vendor_id,
        "partnerCounselingStatus": params["partner_status"],
        "inquiryStartAt": params["from_dt"],
        "inquiryEndAt": params["to_dt"],
        "pageSize": params.get("page_size", "10"),
        "pageNum": params.get("page_num", "1"),
    }}
    query = urllib.parse.urlencode(query_params)
    path = f"/v2/providers/openapi/apis/api/v5/vendors/{{vendor_id}}/callCenterInquiries"
    auth = make_auth_header("GET", path, query, access_key, secret_key)
    response = requests.get(
        BASE_URL + path,
        headers={{"Authorization": auth, "Content-Type": "application/json;charset=UTF-8"}},
        params=query_params,
        timeout=30,
    )
    body = parse_json_body(response)
    data = body.get("data", {{}}) if isinstance(body, dict) else {{}}
    result["status_code"] = response.status_code
    result["body"] = {{
        "code": body.get("code"),
        "message": body.get("message"),
        "pageNum": data.get("pageNum"),
        "pageSize": data.get("pageSize"),
        "totalElements": data.get("totalElements"),
        "content": summarize_call_center_items(data.get("content")),
    }}
elif action == "preview-online-reply":
    if not wing_id:
        fail("coupang_wing_id_missing", {{"required": ["COUPANG_WING_ID or --wing-id"]}})
    inquiry_id = params["inquiry_id"]
    path = f"/v2/providers/openapi/apis/api/v4/vendors/{{vendor_id}}/onlineInquiries/{{inquiry_id}}/replies"
    result["status_code"] = 0
    result["body"] = {{
        "endpoint": path,
        "payload": {{
            "content": params["content"],
            "vendorId": vendor_id,
            "replyBy": wing_id,
        }},
        "note": "preview only - live write not executed",
    }}
elif action == "preview-call-center-reply":
    if not wing_id:
        fail("coupang_wing_id_missing", {{"required": ["COUPANG_WING_ID or --wing-id"]}})
    inquiry_id = params["inquiry_id"]
    path = f"/v2/providers/openapi/apis/api/v4/vendors/{{vendor_id}}/callCenterInquiries/{{inquiry_id}}/replies"
    result["status_code"] = 0
    result["body"] = {{
        "endpoint": path,
        "payload": {{
            "content": params["content"],
            "vendorId": vendor_id,
            "replyBy": wing_id,
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
    print(f"vendorId: {result.get('vendorId')}")
    print(f"status_code: {result.get('status_code')}")
    body = result.get("body")
    if isinstance(body, dict):
        print(json.dumps(body, ensure_ascii=False, indent=2))
    else:
        print(body)


def main() -> int:
    parser = argparse.ArgumentParser(description="쿠팡 고객문의 실검증 준비 도구")
    parser.add_argument("--env-file", default=".secrets.env", help="로컬 env 파일 경로")
    parser.add_argument(
        "--remote-env-file",
        default="/home/ubuntu/n8n/.env",
        help="원격 실행 시 사용할 env 파일 경로",
    )
    parser.add_argument("--remote-host", help="허용 IP 서버로 SSH 실행할 때 사용. 예: ubuntu@158.180.77.201")
    parser.add_argument("--ssh-key", default=os.path.expanduser("~/.ssh/oracle-n8n.key"), help="SSH 키 경로")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="쿠팡 Open API base URL")
    parser.add_argument("--json", action="store_true", help="결과를 JSON 그대로 출력")
    parser.add_argument("--vendor-id", help="env에 없을 때 seller vendorId 직접 지정")
    parser.add_argument("--wing-id", help="preview payload용 WING ID 직접 지정")

    subparsers = parser.add_subparsers(dest="command", required=True)

    online_parser = subparsers.add_parser("list-online-inquiries", help="상품 문의 조회")
    online_parser.add_argument("--from-dt", required=True, help="YYYY-MM-DD")
    online_parser.add_argument("--to-dt", required=True, help="YYYY-MM-DD")
    online_parser.add_argument("--answered-type", default="NOANSWER", choices=["ALL", "ANSWERED", "NOANSWER"])
    online_parser.add_argument("--page-size", default="10")
    online_parser.add_argument("--page-num", default="1")

    call_parser = subparsers.add_parser("list-call-center-inquiries", help="쿠팡 고객센터 문의 조회")
    call_parser.add_argument("--from-dt", required=True, help="YYYY-MM-DD")
    call_parser.add_argument("--to-dt", required=True, help="YYYY-MM-DD")
    call_parser.add_argument("--partner-status", default="NO_ANSWER", choices=["NONE", "ANSWER", "NO_ANSWER", "TRANSFER"])
    call_parser.add_argument("--page-size", default="10")
    call_parser.add_argument("--page-num", default="1")

    preview_online = subparsers.add_parser("preview-online-reply", help="상품 문의 reply payload 미리보기")
    preview_online.add_argument("--inquiry-id", required=True)
    preview_online.add_argument("--content", required=True)

    preview_call = subparsers.add_parser("preview-call-center-reply", help="고객센터 문의 reply payload 미리보기")
    preview_call.add_argument("--inquiry-id", required=True)
    preview_call.add_argument("--content", required=True)

    args = parser.parse_args()
    params = vars(args).copy()
    command = params.pop("command")
    output_json = params.pop("json", False)
    remote_host = params.pop("remote_host", None)
    ssh_key = params.pop("ssh_key", None)
    base_url = params.pop("base_url", None)
    local_env_file = params.pop("env_file", None)
    remote_env_file = params.pop("remote_env_file", None)
    vendor_id = params.pop("vendor_id", None)
    wing_id = params.pop("wing_id", None)

    if vendor_id:
        params["vendor_id"] = vendor_id
    if wing_id:
        params["wing_id"] = wing_id

    preview_commands = {"preview-online-reply", "preview-call-center-reply"}

    if not remote_host and command not in preview_commands:
        env_values = load_env_file(Path(local_env_file))
        access_key = env_values.get("COUPANG_ACCESS_KEY") or env_values.get("COUPANG_API_ACCESS_KEY")
        secret_key = env_values.get("COUPANG_SECRET_KEY") or env_values.get("COUPANG_API_SECRET_KEY")
        vendor_id_value = vendor_id or env_values.get("COUPANG_VENDOR_ID")
        if not access_key or not secret_key or not vendor_id_value:
            raise SystemExit("COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY / COUPANG_VENDOR_ID 가 필요합니다.")

    script = build_remote_script(
        command,
        {k: str(v) for k, v in params.items() if v is not None},
        remote_env_file if remote_host else local_env_file,
        base_url or DEFAULT_BASE_URL,
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
