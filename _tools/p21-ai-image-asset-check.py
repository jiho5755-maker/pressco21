#!/usr/bin/env python3
"""PRESSCO21 manual AI image asset metadata checker.

이 스크립트는 ChatGPT Pro 웹/앱에서 사람이 생성해 반입한 이미지 자산의
메타데이터 파일이 최소 운영 규칙을 만족하는지 확인한다.

사용 예:
  python3 _tools/p21-ai-image-asset-check.py assets/manual-ai-images
  python3 _tools/p21-ai-image-asset-check.py docs/ai-development/chatgpt-images-manual-pipeline --metadata-only
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
ALLOWED_PROJECTS = {
    "partnerclass",
    "makeshop-skin",
    "homepage",
    "quick-buy",
    "docs",
    "crm",
    "shared",
}
ALLOWED_REVIEW_STATUSES = {"draft", "generated", "reviewed", "approved", "rejected"}
ASSET_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]*_[a-z0-9-]+_[a-z0-9-]+_[0-9]{8}_v[0-9]{2}$")
DATE_PATTERN = re.compile(r"^[0-9]{4}-[0-9]{2}-[0-9]{2}$")

REQUIRED_FIELDS = [
    "assetId",
    "project",
    "usecase",
    "source",
    "createdAt",
    "promptId",
    "reviewStatus",
    "intendedUse",
    "licenseNote",
    "tags",
]


def load_json(path: Path) -> tuple[dict[str, Any] | None, list[str]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return None, [f"JSON 파싱 실패: {exc}"]
    except OSError as exc:
        return None, [f"파일 읽기 실패: {exc}"]

    if not isinstance(data, dict):
        return None, ["메타데이터 최상위 값은 object여야 합니다."]

    return data, []


def validate_metadata(path: Path, data: dict[str, Any], metadata_only: bool) -> list[str]:
    errors: list[str] = []

    for field in REQUIRED_FIELDS:
        if field not in data:
            errors.append(f"필수 필드 누락: {field}")

    asset_id = data.get("assetId")
    if isinstance(asset_id, str):
        if not ASSET_ID_PATTERN.match(asset_id):
            errors.append("assetId 형식 오류: {project}_{usecase}_{theme}_YYYYMMDD_vNN")
        if path.stem != asset_id and not metadata_only:
            errors.append(f"파일명과 assetId 불일치: file={path.stem}, assetId={asset_id}")
    elif "assetId" in data:
        errors.append("assetId는 문자열이어야 합니다.")

    project = data.get("project")
    if project not in ALLOWED_PROJECTS:
        errors.append(f"project 허용값 오류: {project}")

    if data.get("source") != "chatgpt-web-manual":
        errors.append("source는 chatgpt-web-manual이어야 합니다.")

    created_at = data.get("createdAt")
    if not isinstance(created_at, str) or not DATE_PATTERN.match(created_at):
        errors.append("createdAt은 YYYY-MM-DD 형식이어야 합니다.")

    approved_at = data.get("approvedAt")
    if approved_at is not None and (not isinstance(approved_at, str) or not DATE_PATTERN.match(approved_at)):
        errors.append("approvedAt은 YYYY-MM-DD 형식이어야 합니다.")

    review_status = data.get("reviewStatus")
    if review_status not in ALLOWED_REVIEW_STATUSES:
        errors.append(f"reviewStatus 허용값 오류: {review_status}")

    tags = data.get("tags")
    if not isinstance(tags, list) or not all(isinstance(tag, str) and tag for tag in tags):
        errors.append("tags는 비어 있지 않은 문자열 배열이어야 합니다.")

    if review_status == "approved":
        if not data.get("reviewer"):
            errors.append("approved 상태에는 reviewer가 필요합니다.")
        if not data.get("approvedAt"):
            errors.append("approved 상태에는 approvedAt이 필요합니다.")
        if not data.get("truthCheck"):
            errors.append("approved 상태에는 truthCheck가 필요합니다.")

    if not metadata_only:
        sibling_images = [path.with_suffix(ext) for ext in IMAGE_EXTENSIONS]
        if not any(image.exists() for image in sibling_images):
            errors.append("동일 stem의 이미지 파일이 없습니다.")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="PRESSCO21 manual AI image asset metadata checker")
    parser.add_argument("target", type=Path, help="검사할 디렉터리")
    parser.add_argument("--metadata-only", action="store_true", help="이미지 파일 동봉 여부를 검사하지 않음")
    args = parser.parse_args()

    target = args.target
    if not target.exists():
        print(f"대상 경로가 없습니다: {target}", file=sys.stderr)
        return 2

    json_files = sorted(path for path in target.rglob("*.json") if path.name != "asset-metadata.schema.json")
    if not json_files:
        print("검사할 메타데이터 JSON 파일이 없습니다.")
        return 0

    total_errors = 0
    for path in json_files:
        data, load_errors = load_json(path)
        errors = load_errors
        if data is not None:
            errors.extend(validate_metadata(path, data, args.metadata_only))

        if errors:
            total_errors += len(errors)
            print(f"FAIL {path}")
            for error in errors:
                print(f"  - {error}")
        else:
            print(f"PASS {path}")

    if total_errors:
        print(f"\n총 오류: {total_errors}개", file=sys.stderr)
        return 1

    print("\n모든 메타데이터가 기본 규칙을 통과했습니다.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
