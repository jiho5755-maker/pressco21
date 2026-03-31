#!/usr/bin/env python3
"""Build a local project inventory for the Flora Mac Copilot Harness."""

from __future__ import annotations

import argparse
import fnmatch
import json
import os
import platform
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


STACK_MARKERS = {
    "package.json": "node",
    "pyproject.toml": "python",
    "requirements.txt": "python",
    "Cargo.toml": "rust",
    "go.mod": "go",
    "pom.xml": "java",
    "Gemfile": "ruby",
    "composer.json": "php",
    "docker-compose.yml": "docker",
    "Dockerfile": "docker",
}


@dataclass
class RootConfig:
    name: str
    path: Path
    max_depth: int


def load_config(path: Path) -> dict[str, Any]:
    with path.open() as handle:
        return json.load(handle)


def matches_any(path_str: str, patterns: list[str]) -> bool:
    return any(fnmatch.fnmatch(path_str, pattern) for pattern in patterns)


def infer_stack(markers: list[str]) -> list[str]:
    stacks = []
    for marker in markers:
        stack = STACK_MARKERS.get(marker)
        if stack and stack not in stacks:
            stacks.append(stack)
    return stacks or ["unknown"]


def format_ts(ts: float | None) -> str | None:
    if ts is None:
        return None
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()


def collect_recent_files(project_dir: Path, exclude_globs: list[str], limit: int) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for child in project_dir.rglob("*"):
        if not child.is_file():
            continue
        child_str = child.as_posix()
        if matches_any(child_str, exclude_globs):
            continue
        try:
            stat = child.stat()
        except OSError:
            continue
        entries.append(
            {
                "path": child_str,
                "modifiedAt": stat.st_mtime,
            }
        )
    entries.sort(key=lambda item: item["modifiedAt"], reverse=True)
    trimmed = entries[:limit]
    for item in trimmed:
        item["modifiedAt"] = format_ts(item["modifiedAt"])
    return trimmed


def find_projects(root: RootConfig, project_markers: list[str], exclude_globs: list[str]) -> list[dict[str, Any]]:
    projects: list[dict[str, Any]] = []
    seen: set[str] = set()
    root_parts = len(root.path.parts)

    for current_root, dirnames, filenames in os.walk(root.path):
        current_path = Path(current_root)
        rel_depth = len(current_path.parts) - root_parts
        current_str = current_path.as_posix()

        if matches_any(current_str, exclude_globs):
            dirnames[:] = []
            continue

        dirnames[:] = [
            name
            for name in dirnames
            if not matches_any((current_path / name).as_posix(), exclude_globs)
        ]

        if rel_depth > root.max_depth:
            dirnames[:] = []
            continue

        markers = sorted(
            marker
            for marker in project_markers
            if (current_path / marker).exists()
        )
        if not markers:
            continue

        project_key = current_path.as_posix()
        if project_key in seen:
            continue
        seen.add(project_key)

        try:
            stat = current_path.stat()
        except OSError:
            continue

        top_files = sorted(
            [
                entry.name
                for entry in current_path.iterdir()
                if entry.is_file() and not matches_any(entry.as_posix(), exclude_globs)
            ]
        )[:12]

        risk_flags: list[str] = []
        if any(name.startswith(".env") for name in filenames):
            risk_flags.append("contains-env-file")
        if any(name.endswith(".key") or name.endswith(".pem") for name in filenames):
            risk_flags.append("contains-key-material")

        projects.append(
            {
                "root": root.name,
                "path": project_key,
                "relativePath": current_path.relative_to(root.path).as_posix() if current_path != root.path else ".",
                "name": current_path.name,
                "markers": markers,
                "stacks": infer_stack(markers),
                "topFiles": top_files,
                "riskFlags": risk_flags,
                "modifiedAt": format_ts(stat.st_mtime),
            }
        )

        dirnames[:] = []

    return projects


def build_summary(projects: list[dict[str, Any]]) -> dict[str, Any]:
    by_root: dict[str, int] = {}
    by_stack: dict[str, int] = {}
    risky = 0

    for project in projects:
        by_root[project["root"]] = by_root.get(project["root"], 0) + 1
        for stack in project["stacks"]:
            by_stack[stack] = by_stack.get(stack, 0) + 1
        if project["riskFlags"]:
            risky += 1

    return {
        "projectCount": len(projects),
        "rootCounts": by_root,
        "stackCounts": by_stack,
        "projectsWithRiskFlags": risky,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True, help="Path to harness config JSON.")
    args = parser.parse_args()

    config_path = Path(args.config).expanduser().resolve()
    config = load_config(config_path)

    roots = [
        RootConfig(
            name=item["name"],
            path=Path(item["path"]).expanduser().resolve(),
            max_depth=int(item.get("maxDepth", 3)),
        )
        for item in config.get("roots", [])
    ]
    exclude_globs = config.get("excludeGlobs", [])
    project_markers = config.get("projectMarkers", [])
    top_files_limit = int(config.get("topFilesLimit", 12))
    recent_files_limit = int(config.get("recentFilesLimit", 8))

    inventory_path = Path(config["output"]["inventoryPath"]).expanduser().resolve()
    summary_path = Path(config["output"]["summaryPath"]).expanduser().resolve()
    inventory_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.parent.mkdir(parents=True, exist_ok=True)

    projects: list[dict[str, Any]] = []
    for root in roots:
        if not root.path.exists():
            continue
        projects.extend(find_projects(root, project_markers, exclude_globs))

    for project in projects:
        project["topFiles"] = project["topFiles"][:top_files_limit]
        project["recentFiles"] = collect_recent_files(Path(project["path"]), exclude_globs, recent_files_limit)

    projects.sort(key=lambda item: (item["root"], item["relativePath"]))

    inventory = {
        "generatedAt": datetime.now(tz=timezone.utc).isoformat(),
        "host": platform.node(),
        "platform": platform.platform(),
        "roots": [
            {
                "name": root.name,
                "path": root.path.as_posix(),
                "maxDepth": root.max_depth,
            }
            for root in roots
        ],
        "projects": projects,
    }
    summary = build_summary(projects)

    inventory_path.write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + "\n")
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")

    print(json.dumps({"inventoryPath": inventory_path.as_posix(), "summaryPath": summary_path.as_posix(), "projectCount": len(projects)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

