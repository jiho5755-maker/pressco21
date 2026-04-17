from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

LOGS_DIR = Path("logs")


def log_write_action(tool: str, params: dict[str, Any], caller: str = "mcp") -> None:
    LOGS_DIR.mkdir(exist_ok=True)
    today = datetime.now(UTC).strftime("%Y-%m-%d")
    entry = {
        "ts": datetime.now(UTC).isoformat(),
        "tool": tool,
        "params_summary": {k: "***" if "secret" in k.lower() else v for k, v in params.items()},
        "caller": caller,
    }
    with open(LOGS_DIR / f"audit-{today}.jsonl", "a") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
