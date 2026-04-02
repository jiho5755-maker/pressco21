#!/usr/bin/env python3

from __future__ import annotations

import json
from email.utils import parsedate_to_datetime
from urllib.request import urlopen


URL = "https://open.er-api.com/v6/latest/CNY"


def main() -> None:
    payload = json.loads(urlopen(URL, timeout=20).read().decode("utf-8"))
    if payload.get("result") != "success":
        raise SystemExit(json.dumps({"status": "error", "message": "rate api failure", "payload": payload}, ensure_ascii=False))

    updated_at = payload.get("time_last_update_utc", "")
    updated_date = ""
    if updated_at:
        updated_date = parsedate_to_datetime(updated_at).date().isoformat()

    result = {
        "status": "ok",
        "sourceUrl": URL,
        "sourceLabel": "ExchangeRate-API latest CNY base feed",
        "latestPostedDate": updated_date,
        "rateCnyKrw": float(payload["rates"]["KRW"]),
        "lastUpdated": updated_at,
        "note": "Latest published API rate with CNY as base currency",
    }
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
