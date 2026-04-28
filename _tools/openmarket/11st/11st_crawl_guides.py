#!/usr/bin/env python3
"""로그인된 Playwright 세션으로 11번가 Open API 개발가이드를 크롤링한다."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path
from textwrap import dedent

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_OUTPUT_DIR = REPO_ROOT / "docs/openmarket-ops"
DEFAULT_PLAYWRIGHT_CLI = Path.home() / ".codex/skills/playwright/scripts/playwright_cli.sh"

CRAWL_CODE = r'''
async (page) => {
  const cleanText = (value) => String(value || '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const uniqBy = (arr, keyFn) => {
    const seen = new Set(); const out = [];
    for (const item of arr) { const key = keyFn(item); if (!key || seen.has(key)) continue; seen.add(key); out.push(item); }
    return out;
  };
  const extractPage = async () => await page.evaluate(() => {
    const cleanText = (value) => String(value || '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    const tables = [...document.querySelectorAll('table')].map((table, tableIndex) => {
      const caption = cleanText(table.querySelector('caption')?.textContent || '');
      const rows = [...table.querySelectorAll('tr')].map((tr) => [...tr.children].map((cell) => cleanText(cell.textContent)));
      return { tableIndex, caption, rows };
    });
    const bodyText = cleanText(document.body?.innerText || '');
    const headings = [...document.querySelectorAll('h1,h2,h3')].map((h) => ({ level: h.tagName.toLowerCase(), text: cleanText(h.textContent) })).filter((h) => h.text);
    const apiTitle = (headings.find((h) => /^1\./.test(h.text)) || headings[0] || {}).text || '';
    const apiUrls = [...new Set([...bodyText.matchAll(/https?:\/\/api\.11st\.co\.kr\/[^\s<>'"`]+/g)].map((m) => m[0].replace(/[.,)]+$/, '')))];
    const links = [...document.querySelectorAll('a')].map((a) => ({ text: cleanText(a.textContent), href: a.href || a.getAttribute('href') || '' }));
    const tabs = [...document.querySelectorAll('td[onclick*="apiSeq="]')].map((td) => {
      const onclick = td.getAttribute('onclick') || '';
      const categoryNo = (onclick.match(/categoryNo=(\d+)/) || location.href.match(/categoryNo=(\d+)/) || [])[1] || '';
      const apiSeq = (onclick.match(/apiSeq=(\d+)/) || [])[1] || '';
      const apiSpecType = (onclick.match(/apiSpecType=(\d+)/) || [])[1] || '1';
      return { categoryNo, apiSeq, apiSpecType, label: cleanText(td.textContent) };
    }).filter((x) => x.apiSeq);
    let method = '';
    let payloadType = '';
    let returnType = '';
    const methodTable = tables.find((t) => t.rows.some((r) => r.some((c) => c.includes('Method Type'))));
    if (methodTable) {
      const row = methodTable.rows.find((r) => r.some((c) => /^(GET|POST|PUT|DELETE|PATCH)$/i.test(c)));
      if (row) {
        method = row.find((c) => /^(GET|POST|PUT|DELETE|PATCH)$/i.test(c)) || '';
        payloadType = row[row.length - 2] || '';
        returnType = row[row.length - 1] || '';
      }
    }
    return { url: location.href, title: document.title, apiTitle, method, payloadType, returnType, apiUrls, headings, tables, bodyText, links, tabs };
  });

  await page.goto('https://openapi.11st.co.kr/openapi/OpenApiGuide.tmall?apiSpecType=1', { waitUntil: 'load', timeout: 30000 });
  const main = await extractPage();
  const categoryLinks = uniqBy(main.links.map((a) => {
    const m = (a.href || '').match(/[?&]categoryNo=(\d+)/);
    if (!m || !(a.href || '').includes('OpenApiGuide')) return null;
    return { categoryNo: m[1], label: cleanText(a.text), url: `https://openapi.11st.co.kr/openapi/OpenApiGuide.tmall?categoryNo=${m[1]}&apiSpecType=1` };
  }).filter(Boolean), (x) => x.categoryNo);

  const categories = [];
  const apiRefs = [];
  for (const cat of categoryLinks) {
    await page.goto(cat.url, { waitUntil: 'load', timeout: 30000 });
    const p = await extractPage();
    const tabs = uniqBy(p.tabs.map((t) => ({
      ...t,
      categoryNo: t.categoryNo || cat.categoryNo,
      guideUrl: `https://openapi.11st.co.kr/openapi/OpenApiGuide.tmall?categoryNo=${t.categoryNo || cat.categoryNo}&apiSeq=${t.apiSeq}&apiSpecType=${t.apiSpecType || '1'}`,
      testerUrl: `https://openapi.11st.co.kr/openapi/OpenApiGuide.tmall?method=OpenAPITester&apiSpecType=${t.apiSpecType || '1'}&apiSeq=${t.apiSeq}`,
    })), (x) => `${x.categoryNo}:${x.apiSeq}:${x.apiSpecType}`);
    categories.push({ ...cat, tabCount: tabs.length, tabs: tabs.map((t) => ({ apiSeq: t.apiSeq, label: t.label })) });
    apiRefs.push(...tabs);
  }

  const refs = uniqBy(apiRefs, (x) => `${x.categoryNo}:${x.apiSeq}:${x.apiSpecType}`);
  const entries = [];
  for (let i = 0; i < refs.length; i++) {
    const ref = refs[i];
    const entry = { ...ref, index: i + 1 };
    try {
      await page.goto(ref.guideUrl, { waitUntil: 'load', timeout: 30000 });
      const guide = await extractPage();
      delete guide.links;
      delete guide.tabs;
      entry.guide = guide;
    } catch (error) {
      entry.error = String(error);
    }
    entries.push(entry);
  }
  return JSON.stringify({
    crawledAt: new Date().toISOString(),
    source: '11st Open API authenticated DOM crawl via Playwright',
    loggedIn: main.bodyText.includes('로그아웃'),
    categoryCount: categories.length,
    apiCount: entries.length,
    categories,
    entries,
  });
}
'''


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="11번가 Open API 개발가이드 크롤러")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR))
    parser.add_argument("--date", default=datetime.now().strftime("%Y-%m-%d"))
    parser.add_argument("--playwright-cli", default=str(DEFAULT_PLAYWRIGHT_CLI), help="playwright_cli.sh 경로")
    parser.add_argument("--from-crawl", default="", help="기존 guide crawl JSON으로 카탈로그만 재생성")
    return parser.parse_args()


def run_playwright_crawl(playwright_cli: str) -> dict:
    cli_path = Path(playwright_cli).expanduser()
    if not cli_path.exists():
        raise SystemExit(
            "Playwright CLI를 찾을 수 없습니다. "
            "--playwright-cli로 경로를 지정하거나 ~/.codex/skills/playwright/scripts/playwright_cli.sh를 확인하세요."
        )
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as handle:
        handle.write(dedent(CRAWL_CODE))
        script_path = handle.name
    try:
        proc = subprocess.run(
            ["bash", str(cli_path), "--json", "run-code", f"--filename={script_path}"],
            text=True,
            capture_output=True,
            check=False,
        )
        if proc.returncode != 0:
            raise SystemExit(f"Playwright crawl failed\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}")
        wrapper = json.loads(proc.stdout)
        first = json.loads(wrapper["result"])
        return json.loads(first) if isinstance(first, str) else first
    finally:
        try:
            os.unlink(script_path)
        except FileNotFoundError:
            pass


def extract_urls(text: str) -> list[str]:
    out: list[str] = []
    for match in re.finditer(r"https?://api\.11st\.co\.kr/[^\s<>'\"`]+", text or ""):
        url = match.group(0).rstrip(".,)")
        if url not in out:
            out.append(url)
    return out


WRITE_KEYWORDS = r"등록|수정|변경|처리|중지|재개|연장|답변|거부|승인|해제|삭제|업데이트|판매불가|송장입력|및 완료"
READ_ONLY_WORDS = r"조회|목록|리스트|검색|내역|대기"
HIGH_RISK_WORDS = r"가격|즉시할인|재고|판매중지|발송|취소|반품|교환|클레임|승인|거부|송장|주문"
CRITICAL_RISK_WORDS = r"가격|즉시할인|판매중지|취소승인|반품승인|교환승인|발송처리|판매불가"

VERIFIED_ENDPOINT_OVERRIDES = {
    "6732": {
        "method": "GET",
        "url": "https://api.11st.co.kr/rest/prodservices/getRealTimeCheckSoldOutOpt/{startDt}/{endDt}",
        "urls": ["https://api.11st.co.kr/rest/prodservices/getRealTimeCheckSoldOutOpt/{startDt}/{endDt}"],
        "payload_type": "",
        "return_type": "XML",
        "verification_status": "verified_from_official_guide_and_tester",
        "verification_note": "2026-04-28 공식 개발가이드/API TEST DOM 재확인. 상대 URL /rest/prodservices/getRealTimeCheckSoldOutOpt/{startDt}/{endDt} 확인.",
    }
}

NO_CONTENT_OVERRIDES = {
    "1316": {"replacement_api_seq": "1746", "replacement_reason": "동일 라벨의 활성 전세계배송 주문리스트 API"},
    "1318": {"replacement_api_seq": "1748", "replacement_reason": "동일 라벨의 활성 전세계배송 발송처리리스트 API"},
    "1319": {"replacement_api_seq": "1749", "replacement_reason": "동일 라벨의 활성 전세계배송 수취인주소조회 API"},
    "6705": {"replacement_api_seq": "", "replacement_reason": "공식 가이드/API TEST 모두 URL 미제공"},
    "6706": {"replacement_api_seq": "", "replacement_reason": "공식 가이드/API TEST 모두 URL 미제공"},
}


def infer_mutation_detail(method: str, label: str) -> tuple[bool, str, str]:
    method = (method or "").upper()
    label = label or ""
    has_write_word = bool(re.search(WRITE_KEYWORDS, label))
    read_only_label = bool(re.search(READ_ONLY_WORDS, label))
    hard_write_label = bool(re.search(r"승인|거부|등록|수정|변경|입력|해제|삭제|업데이트|판매불가|처리\(|처리$", label))
    if method in {"PUT", "DELETE"}:
        return True, "high", f"{method} method"
    if read_only_label and not hard_write_label:
        return False, "high" if method else "low", "read-only label heuristic"
    if has_write_word:
        return True, "high" if method else "medium", "label contains write/status-change keyword"
    if method == "POST" and not read_only_label:
        return True, "medium", "POST method without read-only label"
    return False, "high" if method else "low", "read-only label/method heuristic"


def infer_mutation(method: str, label: str) -> bool:
    return infer_mutation_detail(method, label)[0]


def infer_risk_level(label: str, mutation: bool) -> str:
    label = label or ""
    if not mutation:
        return "medium" if re.search(r"주문|배송|수취인|주소|정산|클레임", label) else "low"
    if re.search(CRITICAL_RISK_WORDS, label):
        return "critical"
    if re.search(HIGH_RISK_WORDS, label):
        return "high"
    return "medium"


def infer_verify_strategy(label: str) -> str:
    label = label or ""
    if re.search(r"가격|즉시할인|상품", label):
        return "상품상세조회(product-detail)로 selPrc/cuponcheck/상태 재확인"
    if "재고" in label:
        return "재고조회(stock-detail)로 prdNo/prdStckNo/stckQty 재확인"
    if re.search(r"주문|발송|배송|송장", label):
        return "주문/배송 목록 조회로 ordNo/ordPrdSeq/dlvNo 상태 재확인"
    if re.search(r"취소|반품|교환|클레임|승인|거부", label):
        return "클레임 목록/상태 조회로 처리 결과 재확인"
    return "공식 조회 API 또는 API TEST로 변경 전후 상태 재확인"


def operation_id(category: str, label: str, api_seq: str) -> str:
    raw = f"{category}.{label}.{api_seq}".lower()
    raw = re.sub(r"[^0-9a-z가-힣]+", ".", raw).strip(".")
    return raw or f"api.{api_seq}"


def compact_from_entry(entry: dict, category_map: dict[str, str]) -> dict:
    if entry.get("guide"):
        guide = entry.get("guide", {})
        api_urls = extract_urls(guide.get("bodyText", "")) or guide.get("apiUrls", [])
        return {
            "categoryNo": entry.get("categoryNo"),
            "categoryLabel": category_map.get(entry.get("categoryNo"), ""),
            "apiSeq": entry.get("apiSeq"),
            "apiSpecType": entry.get("apiSpecType"),
            "label": entry.get("label"),
            "guideUrl": entry.get("guideUrl"),
            "testerUrl": entry.get("testerUrl"),
            "method": guide.get("method", ""),
            "payloadType": guide.get("payloadType", ""),
            "returnType": guide.get("returnType", ""),
            "apiUrls": api_urls,
            "apiTitle": guide.get("apiTitle", ""),
            "headings": guide.get("headings", []),
            "tables": guide.get("tables", []),
            "error": entry.get("error", ""),
        }
    api_urls = entry.get("apiUrls") or entry.get("urls") or extract_urls(entry.get("bodyText", ""))
    return {
        "categoryNo": entry.get("categoryNo") or entry.get("category_no"),
        "categoryLabel": entry.get("categoryLabel") or entry.get("category") or category_map.get(entry.get("categoryNo") or entry.get("category_no"), ""),
        "apiSeq": entry.get("apiSeq") or entry.get("api_seq"),
        "apiSpecType": entry.get("apiSpecType") or entry.get("api_spec_type"),
        "label": entry.get("label"),
        "guideUrl": entry.get("guideUrl") or entry.get("guide_url"),
        "testerUrl": entry.get("testerUrl") or entry.get("tester_url"),
        "method": entry.get("method", ""),
        "payloadType": entry.get("payloadType") or entry.get("payload_type", ""),
        "returnType": entry.get("returnType") or entry.get("return_type", ""),
        "apiUrls": api_urls,
        "apiTitle": entry.get("apiTitle") or entry.get("api_title", ""),
        "headings": entry.get("headings", []),
        "tables": entry.get("tables", []),
        "error": entry.get("error", ""),
    }


def unique_values(values: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        if not value or value in seen:
            continue
        seen.add(value)
        out.append(value)
    return out


def apply_entry_overrides(entry: dict) -> None:
    api_seq = str(entry.get("api_seq") or "")
    if api_seq in VERIFIED_ENDPOINT_OVERRIDES:
        override = VERIFIED_ENDPOINT_OVERRIDES[api_seq]
        for key in ["method", "url", "urls", "payload_type", "return_type"]:
            entry[key] = override[key]
        entry["verification_status"] = override["verification_status"]
        entry["verification_note"] = override["verification_note"]
        entry.setdefault("notes", []).append(override["verification_note"])
    if api_seq in NO_CONTENT_OVERRIDES:
        override = NO_CONTENT_OVERRIDES[api_seq]
        entry["method"] = entry.get("method") or "GET"
        entry["url"] = ""
        entry["urls"] = []
        entry["availability"] = "official_no_content"
        entry["deprecated"] = True
        entry["usable"] = False
        entry["mutation"] = False
        entry["mutation_confidence"] = "high"
        entry["mutation_reason"] = "official guide content does not exist and API TEST URL is blank"
        entry["risk_level"] = "low"
        entry["dry_run_required"] = False
        entry["verify_strategy"] = "사용 금지. 공식 가이드/API TEST 모두 URL 미제공."
        entry["replacement_api_seq"] = override["replacement_api_seq"]
        entry["replacement_reason"] = override["replacement_reason"]
        entry["verification_status"] = "verified_official_no_content"
        note = "2026-04-28 공식 개발가이드 재확인: Content does not exist, API TEST URL 빈 값. 자동화 대상에서 제외."
        entry["verification_note"] = note
        entry.setdefault("notes", []).append(note)


def summarize_catalog(entries: list[dict]) -> tuple[dict, dict]:
    method_counts: dict[str, int] = {}
    for entry in entries:
        method = entry.get("method") or "미표기"
        method_counts[method] = method_counts.get(method, 0) + 1
    missing_url = unique_values([entry["api_seq"] for entry in entries if entry.get("usable", True) and not entry.get("url")])
    missing_method = unique_values([entry["api_seq"] for entry in entries if entry.get("usable", True) and not entry.get("method")])
    official_no_content = unique_values([entry["api_seq"] for entry in entries if entry.get("availability") == "official_no_content"])
    manual_review = unique_values([
        entry["api_seq"]
        for entry in entries
        if entry.get("mutation") and (entry.get("method") or "").upper() == "GET"
    ])
    mutation_count = sum(1 for entry in entries if entry.get("mutation"))
    payload_blank = sum(1 for entry in entries if not entry.get("payload_type"))
    coverage = {
        "api_count": len(entries),
        "method_counts": method_counts,
        "mutation_count": mutation_count,
        "payload_type_blank_count": payload_blank,
        "missing_url_count": len(missing_url),
        "missing_method_count": len(missing_method),
        "official_no_content_count": len(official_no_content),
    }
    gaps = {
        "missing_url_api_seq": missing_url,
        "missing_method_api_seq": missing_method,
        "official_no_content_api_seq": official_no_content,
        "manual_review_required": manual_review,
    }
    return coverage, gaps


def build_outputs(data: dict, output_dir: Path, date_label: str) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    category_map = {str(item["categoryNo"]): item["label"] for item in data.get("categories", [])}
    entries = []
    crawl_entries = []
    for entry in data.get("entries", []):
        compact = compact_from_entry(entry, category_map)
        if compact["categoryNo"] and compact["categoryNo"] not in category_map and compact.get("categoryLabel"):
            category_map[str(compact["categoryNo"])] = compact["categoryLabel"]
        crawl_entries.append(compact)

        table_text = "\n".join(" ".join(cell for row in table.get("rows", []) for cell in row) for table in compact["tables"])
        method = compact["method"]
        label = compact["label"] or ""
        mutation, mutation_confidence, mutation_reason = infer_mutation_detail(method, label)
        risk_level = infer_risk_level(label, mutation)
        api_seq = str(compact["apiSeq"] or "")
        category_no = str(compact["categoryNo"] or "")
        catalog_entry = {
            "label": label,
            "operation_id": operation_id(compact.get("categoryLabel", ""), label, api_seq),
            "canonical_key": f"{category_no}:{api_seq}:{compact.get('apiSpecType') or '1'}",
            "category_no": category_no,
            "category": compact["categoryLabel"],
            "api_seq": api_seq,
            "api_spec_type": compact["apiSpecType"],
            "method": method,
            "url": (compact["apiUrls"] or [""])[0],
            "urls": compact["apiUrls"],
            "payload_type": compact["payloadType"],
            "return_type": compact["returnType"],
            "guide_url": compact["guideUrl"],
            "tester_url": compact["testerUrl"],
            "availability": "active",
            "deprecated": False,
            "usable": True,
            "mutation": mutation,
            "mutation_confidence": mutation_confidence,
            "mutation_reason": mutation_reason,
            "risk_level": risk_level,
            "dry_run_required": mutation,
            "verify_strategy": infer_verify_strategy(label) if mutation else "조회 API이므로 응답 필드만 확인",
            "requires_api_key": "API Key 값은 필요하지 않습니다" not in table_text and "API Key는 필요하지 않습니다" not in table_text,
            "parameter_names": sorted({
                cell
                for table in compact["tables"]
                for row in table.get("rows", [])
                for cell in row
                if re.match(r"^[A-Za-z][A-Za-z0-9_:.-]{1,}$", cell or "")
            })[:120],
            "notes": [],
        }
        apply_entry_overrides(catalog_entry)
        entries.append(catalog_entry)

    coverage, known_gaps = summarize_catalog(entries)
    crawl = {
        "crawledAt": data.get("crawledAt"),
        "source": data.get("source"),
        "loggedIn": data.get("loggedIn"),
        "categoryCount": data.get("categoryCount"),
        "apiCount": data.get("apiCount") or len(entries),
        "categories": data.get("categories", []),
        "entries": crawl_entries,
    }
    crawl_path = output_dir / f"11st-openapi-guide-crawl-{date_label}.json"
    crawl_path.write_text(json.dumps(crawl, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    try:
        crawl_ref = str(crawl_path.relative_to(REPO_ROOT))
    except ValueError:
        crawl_ref = str(crawl_path)

    catalog = {
        "schema_version": "1.1",
        "updated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "generated_by": "_tools/openmarket/11st/11st_crawl_guides.py",
        "source": "11st Open API authenticated DOM crawl",
        "source_login_required": True,
        "guide_crawl": crawl_ref,
        "count": len(entries),
        "coverage_summary": coverage,
        "known_gaps": known_gaps,
        "validation_summary": {
            "count_matches_entries": len(entries) == len(data.get("entries", [])),
            "mutation_heuristic_note": "HTTP method만 믿지 않고 API명 쓰기 키워드를 함께 판정한다. GET 상태변경 API는 manual_review_required에 포함한다.",
        },
        "entries": entries,
    }
    (output_dir / "11st-openapi-url-catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = [
        "# 11번가 Open API URL Catalog",
        "",
        "> 공식 11번가 Open API 개발가이드를 로그인 브라우저 세션에서 크롤링해 생성한 카탈로그입니다.",
        "",
        f"- 생성일: {datetime.now().strftime('%Y-%m-%d')}",
        f"- API 수: {len(entries)}",
        f"- 원본 크롤링: `{crawl_ref}`",
        "",
        "## 카탈로그 품질 요약",
        "",
        f"- Method 분포: {coverage['method_counts']}",
        f"- 활성 API URL 미확인: {coverage['missing_url_count']}개 ({', '.join(known_gaps['missing_url_api_seq']) or '없음'})",
        f"- 활성 API Method 미표기: {coverage['missing_method_count']}개 ({', '.join(known_gaps['missing_method_api_seq']) or '없음'})",
        f"- 공식 문서상 Content does not exist/API TEST URL 빈 값: {coverage['official_no_content_count']}개 ({', '.join(known_gaps['official_no_content_api_seq']) or '없음'})",
        f"- payload_type 빈 값: {coverage['payload_type_blank_count']}개",
        f"- 쓰기성/상태변경 추정 API: {coverage['mutation_count']}개",
        f"- GET이지만 쓰기성으로 취급해 수동 검수할 API: {len(known_gaps['manual_review_required'])}개",
        "",
        "## 사용 원칙",
        "",
        "- `method`와 `payload_type`을 반드시 함께 확인합니다. 11번가는 같은 URL이라도 GET이 아닌 POST/XML인 경우가 많습니다.",
        "- `mutation=true`인 API는 기본 dry-run 이후 execute로만 호출합니다.",
        "- `GET`이어도 API명이 처리/승인/거부/발송/수정/등록이면 쓰기성 API로 취급합니다.",
        "- 상세 파라미터/오류/응답 표는 원본 크롤링 JSON의 `tables`를 기준으로 확인합니다.",
        "",
        "## 위험 API 인덱스",
        "",
        "| API | Method | URL | Risk | apiSeq | 검증 전략 |",
        "|---|---:|---|---:|---:|---|",
    ]
    for entry in [item for item in entries if item["risk_level"] in {"critical", "high"} or item["mutation"]]:
        lines.append(f"| {entry['label']} | {entry['method'] or '?'} | `{entry['url'] or '(문서 URL 미확인)'}` | {entry['risk_level']} | {entry['api_seq']} | {entry['verify_strategy']} |")
    lines.append("")

    for category_no in sorted(category_map, key=lambda value: int(value)):
        rows = [entry for entry in entries if entry["category_no"] == category_no]
        if not rows:
            continue
        lines.extend([
            f"## {category_map[category_no]} (`categoryNo={category_no}`)",
            "",
            "| API | Method | URL | Write | Risk | Availability | apiSeq |",
            "|---|---:|---|---:|---:|---:|---:|",
        ])
        for entry in rows:
            lines.append(f"| {entry['label']} | {entry['method'] or '?'} | `{entry['url'] or '(공식 문서 URL 없음)'}` | {'Y' if entry['mutation'] else 'N'} | {entry['risk_level']} | {entry.get('availability', 'active')} | {entry['api_seq']} |")
        lines.append("")
    (output_dir / "11st-openapi-url-catalog.md").write_text("\n".join(lines), encoding="utf-8")

    print(json.dumps({
        "crawl_path": str(crawl_path),
        "catalog_json": str(output_dir / "11st-openapi-url-catalog.json"),
        "catalog_md": str(output_dir / "11st-openapi-url-catalog.md"),
        "api_count": len(entries),
        "coverage_summary": coverage,
    }, ensure_ascii=False, indent=2))

def main() -> None:
    args = parse_args()
    if args.from_crawl:
        data = json.loads(Path(args.from_crawl).expanduser().read_text(encoding="utf-8"))
    else:
        data = run_playwright_crawl(args.playwright_cli)
        if not data.get("loggedIn"):
            raise SystemExit("11번가 로그인 상태가 아닙니다. 브라우저 로그인 후 다시 실행하세요.")
    build_outputs(data, Path(args.output_dir), args.date)


if __name__ == "__main__":
    main()

