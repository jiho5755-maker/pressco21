#!/usr/bin/env python3
"""OMX n8n workflow를 이름 기준으로 create/update 한다."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_BASE_URL = "https://n8n.pressco21.com"
DEFAULT_SECRETS_PATH = ROOT / "n8n-automation" / ".secrets"


def load_api_key() -> str:
    if DEFAULT_SECRETS_PATH.exists():
        content = DEFAULT_SECRETS_PATH.read_text(encoding="utf-8")
        match = re.search(r"^N8N_API_KEY=(.+)$", content, re.MULTILINE)
        if match:
            return match.group(1).strip().strip("\"'")

    env_value = os.environ.get("N8N_API_KEY", "").strip()
    if env_value:
        return env_value

    if not DEFAULT_SECRETS_PATH.exists():
        raise RuntimeError("n8n-automation/.secrets 파일을 찾을 수 없습니다.")

    raise RuntimeError("n8n-automation/.secrets 와 환경변수 모두에서 N8N_API_KEY를 찾지 못했습니다.")


def api_request(base_url: str, api_key: str, method: str, path: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
    url = f"{base_url.rstrip('/')}{path}"
    payload = None
    headers = {
        "X-N8N-API-KEY": api_key,
        "Accept": "application/json",
    }
    if body is not None:
        headers["Content-Type"] = "application/json"
        payload = json.dumps(body, ensure_ascii=False).encode("utf-8")

    request = urllib.request.Request(url, data=payload, method=method, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            error_body = json.loads(raw)
        except json.JSONDecodeError:
            error_body = {"raw": raw[:1000]}
        raise RuntimeError(f"{method} {path} failed: HTTP {exc.code} {error_body}") from exc


def list_workflows(base_url: str, api_key: str) -> list[dict[str, Any]]:
    data = api_request(base_url, api_key, "GET", "/api/v1/workflows?limit=250")
    items = data.get("data") or data.get("items") or []
    if not isinstance(items, list):
        raise RuntimeError("n8n workflows 목록 응답 형식이 예상과 다릅니다.")
    return items


def build_payload(workflow: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": workflow["name"],
        "nodes": workflow["nodes"],
        "connections": workflow["connections"],
        "settings": workflow.get("settings") or {"executionOrder": "v1"},
    }


def activate_workflow(base_url: str, api_key: str, workflow_id: str) -> None:
    api_request(base_url, api_key, "POST", f"/api/v1/workflows/{workflow_id}/activate")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="OMX n8n workflow upsert")
    parser.add_argument("workflow_json", nargs="+", help="업서트할 workflow JSON 경로")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="n8n base url")
    parser.add_argument("--dry-run", action="store_true", help="실제 create/update 없이 계획만 출력")
    parser.add_argument("--activate", action="store_true", help="upsert 후 workflow 활성화")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    api_key = load_api_key()
    workflows = list_workflows(args.base_url, api_key)
    existing_by_name = {str(item.get("name")): item for item in workflows}

    for raw_path in args.workflow_json:
        path = (ROOT / raw_path).resolve() if not raw_path.startswith("/") else Path(raw_path)
        if not path.exists():
            raise RuntimeError(f"workflow JSON을 찾을 수 없습니다: {raw_path}")

        workflow = json.loads(path.read_text(encoding="utf-8"))
        name = str(workflow.get("name") or "").strip()
        if not name:
            raise RuntimeError(f"name 이 비어 있습니다: {path}")

        payload = build_payload(workflow)
        existing = existing_by_name.get(name)

        if args.dry_run:
            action = "UPDATE" if existing else "CREATE"
            target = existing.get("id") if existing else "-"
            print(f"[DRY_RUN] {action}\t{target}\t{name}\t{path}")
            continue

        if existing:
            workflow_id = str(existing["id"])
            api_request(args.base_url, api_key, "PUT", f"/api/v1/workflows/{workflow_id}", payload)
            print(f"[UPDATED] {workflow_id}\t{name}")
        else:
            created = api_request(args.base_url, api_key, "POST", "/api/v1/workflows", payload)
            workflow_id = str(created.get("id") or created.get("data", {}).get("id") or "")
            if not workflow_id:
                raise RuntimeError(f"create 응답에서 workflow id를 찾지 못했습니다: {name}")
            existing_by_name[name] = {"id": workflow_id, "name": name}
            print(f"[CREATED] {workflow_id}\t{name}")

        if args.activate:
            activate_workflow(args.base_url, api_key, workflow_id)
            print(f"[ACTIVATED] {workflow_id}\t{name}")

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
