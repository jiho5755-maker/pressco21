#!/usr/bin/env python3
"""MakeShop Open API 문서 기반 capability probe."""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import requests


DOC_BASE = "https://openapi.makeshop.co.kr/guide/documents/find_guide"


@dataclass
class GuideTarget:
    key: str
    label: str
    guide_id: int
    item_type: str
    expected_send_mode: str


TARGETS = [
    GuideTarget("crm-board-search", "1:1 게시판 조회", 86, "inquiry", "direct_send"),
    GuideTarget("board-comment-write", "게시글 댓글 등록/수정/삭제", 90, "inquiry", "direct_send"),
    GuideTarget("crm-board-reply", "1:1 게시글 답변 등록", 93, "inquiry", "direct_send"),
    GuideTarget("review-search", "코멘트 평점타입 후기 조회", 94, "review", "direct_send"),
    GuideTarget("review-write", "코멘트 평점타입 후기 등록", 95, "review", "direct_send"),
]


def strip_html(text: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def parse_json_like(value: str) -> list[dict[str, Any]]:
    if not value or value == "[]":
        return []
    try:
        loaded = json.loads(value)
    except json.JSONDecodeError:
        return []
    return loaded if isinstance(loaded, list) else []


def build_endpoint(method: str, mode: str, type_name: str, process: str) -> str:
    base = "/list/open_api_process.html" if method.upper() == "POST" else "/list/open_api.html"
    query = f"mode={mode}&type={type_name}"
    if process and process != "-":
        query += f"&process={process}"
    return f"{base}?{query}"


def summarize_guide(payload: dict[str, Any], target: GuideTarget) -> dict[str, Any]:
    guide = payload["guide"]
    guide_notes = [item["content"] for item in parse_json_like(guide.get("guide", ""))]
    cautions = [item["content"] for item in parse_json_like(guide.get("caution", ""))]

    return {
        "key": target.key,
        "label": target.label,
        "guide_id": target.guide_id,
        "item_type": target.item_type,
        "method": guide["method"],
        "permission": guide["permission"],
        "mode": guide["mode"],
        "type": guide["type"],
        "process": guide["process"],
        "endpoint": build_endpoint(guide["method"], guide["mode"], guide["type"], guide["process"]),
        "subject": guide["subject"],
        "guide_notes": guide_notes,
        "cautions": cautions,
        "request_example": guide.get("request_content", ""),
        "expected_send_mode": target.expected_send_mode,
        "doc_verified": True,
    }


def fetch_guide(guide_id: int) -> dict[str, Any]:
    response = requests.get(f"{DOC_BASE}/{guide_id}", timeout=30)
    response.raise_for_status()
    data = response.json()
    if not data.get("result"):
        raise RuntimeError(f"guide_id={guide_id} 응답이 비정상입니다.")
    return data


def read_env_value(name: str) -> str | None:
    env_path = Path(".secrets.env")
    if not env_path.exists():
        return None
    for line in env_path.read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key.strip() == name:
            return value.strip()
    return None


def is_placeholder(value: str | None) -> bool:
    if not value:
        return True
    return "참조" in value or "PLACEHOLDER" in value or "{" in value or not value.isascii()


def try_live_read(domain: str) -> dict[str, Any]:
    shopkey = read_env_value("MAKESHOP_SHOPKEY")
    licensekey = read_env_value("MAKESHOP_LICENSEKEY")
    if is_placeholder(shopkey) or is_placeholder(licensekey):
        return {
            "attempted": False,
            "reason": "local secrets are placeholder values",
        }

    headers = {
        "Shopkey": shopkey,
        "Licensekey": licensekey,
    }
    requests_to_try = [
        {
            "label": "board_code",
            "params": {"mode": "search", "type": "board_code"},
        },
        {
            "label": "crm_board_recent",
            "params": {
                "mode": "search",
                "type": "crm_board",
                "InquiryTimeFrom": "2026-03-10 00:00:00",
                "InquiryTimeTo": "2026-04-09 23:59:59",
                "limit": "5",
            },
        },
        {
            "label": "review_recent",
            "params": {
                "mode": "search",
                "type": "review",
                "InquiryTimeFrom": "2026-03-10",
                "InquiryTimeTo": "2026-04-09",
                "limit": "5",
            },
        },
    ]
    results = []
    for item in requests_to_try:
        response = requests.get(
            f"https://{domain}/list/open_api.html",
            headers=headers,
            params=item["params"],
            timeout=30,
        )
        snippet = response.text[:300]
        results.append(
            {
                "label": item["label"],
                "status_code": response.status_code,
                "ok": response.ok,
                "snippet": snippet,
            }
        )
    return {
        "attempted": True,
        "results": results,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="MakeShop Open API board/review capability probe")
    parser.add_argument("--json", action="store_true", help="JSON으로 출력")
    parser.add_argument(
        "--live-domain",
        help="실제 상점 도메인을 주면 read probe를 시도한다. 예: foreverlove.co.kr",
    )
    args = parser.parse_args()

    summaries = [summarize_guide(fetch_guide(target.guide_id), target) for target in TARGETS]
    payload: dict[str, Any] = {
        "summary": summaries,
        "conclusion": {
            "makeshop_inquiry_send_mode": "direct_send",
            "makeshop_review_send_mode": "direct_send",
            "validation_status": "doc_only",
            "reason": "공식 Open API 문서에서 inquiry/review 조회와 write endpoint가 모두 확인됨",
        },
    }

    if args.live_domain:
        payload["live_read_probe"] = try_live_read(args.live_domain)

    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return

    print("MakeShop Open API board/review capability probe")
    print("=" * 60)
    for item in summaries:
        print(f"- {item['label']} (guide_id={item['guide_id']})")
        print(f"  endpoint: {item['endpoint']}")
        print(f"  method: {item['method']} | permission: {item['permission']}")
        print(f"  item_type: {item['item_type']} | expected_send_mode: {item['expected_send_mode']}")
        if item["guide_notes"]:
            print(f"  guide: {' / '.join(item['guide_notes'])}")
        if item["cautions"]:
            print(f"  caution: {' / '.join(item['cautions'])}")
        if item["request_example"]:
            print(f"  request_example: {item['request_example']}")
        print()

    print("Conclusion")
    print("- makeshop inquiry: api/direct_send/doc_only")
    print("- makeshop review: api/direct_send/doc_only")

    if "live_read_probe" in payload:
        probe = payload["live_read_probe"]
        print()
        print("Live Read Probe")
        if not probe["attempted"]:
            print(f"- skipped: {probe['reason']}")
        else:
            for result in probe["results"]:
                print(
                    f"- {result['label']}: status={result['status_code']} ok={result['ok']} snippet={result['snippet'][:120]}"
                )


if __name__ == "__main__":
    main()
