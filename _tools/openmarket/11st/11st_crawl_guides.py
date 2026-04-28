#!/usr/bin/env python3
"""로그인된 Playwright 세션으로 11번가 Open API 개발가이드를 크롤링한다."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path
from textwrap import dedent

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_OUTPUT_DIR = REPO_ROOT / "docs/openmarket-ops"
PWCLI = Path.home() / ".codex/skills/playwright/scripts/playwright_cli.sh"

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
    return parser.parse_args()


def run_playwright_crawl() -> dict:
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as handle:
        handle.write(dedent(CRAWL_CODE))
        script_path = handle.name
    proc = subprocess.run(
        ["bash", str(PWCLI), "--json", "run-code", f"--filename={script_path}"],
        text=True,
        capture_output=True,
        check=False,
    )
    if proc.returncode != 0:
        raise SystemExit(f"Playwright crawl failed\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}")
    wrapper = json.loads(proc.stdout)
    first = json.loads(wrapper["result"])
    return json.loads(first) if isinstance(first, str) else first


def extract_urls(text: str) -> list[str]:
    out: list[str] = []
    for match in re.finditer(r"https?://api\.11st\.co\.kr/[^\s<>'\"`]+", text or ""):
        url = match.group(0).rstrip(".,)")
        if url not in out:
            out.append(url)
    return out


def infer_mutation(method: str, label: str) -> bool:
    if method in {"PUT", "DELETE"}:
        return True
    return method == "POST" and bool(re.search(r"등록|수정|변경|처리|중지|재개|연장|답변|확인|거부|승인|취소|발송", label or ""))


def build_outputs(data: dict, output_dir: Path, date_label: str) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    category_map = {item["categoryNo"]: item["label"] for item in data.get("categories", [])}
    entries = []
    crawl_entries = []
    for entry in data.get("entries", []):
        guide = entry.get("guide", {})
        api_urls = extract_urls(guide.get("bodyText", "")) or guide.get("apiUrls", [])
        compact = {
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
        crawl_entries.append(compact)

        table_text = "\n".join(" ".join(cell for row in table.get("rows", []) for cell in row) for table in compact["tables"])
        method = compact["method"]
        label = compact["label"] or ""
        entries.append({
            "label": label,
            "category_no": compact["categoryNo"],
            "category": compact["categoryLabel"],
            "api_seq": compact["apiSeq"],
            "api_spec_type": compact["apiSpecType"],
            "method": method,
            "url": (api_urls or [""])[0],
            "urls": api_urls,
            "payload_type": compact["payloadType"],
            "return_type": compact["returnType"],
            "guide_url": compact["guideUrl"],
            "tester_url": compact["testerUrl"],
            "mutation": infer_mutation(method, label),
            "requires_api_key": "API Key 값은 필요하지 않습니다" not in table_text and "API Key는 필요하지 않습니다" not in table_text,
            "parameter_names": sorted({
                cell
                for table in compact["tables"]
                for row in table.get("rows", [])
                for cell in row
                if re.match(r"^[A-Za-z][A-Za-z0-9_:.-]{1,}$", cell or "")
            })[:120],
            "notes": [],
        })

    crawl = {
        "crawledAt": data.get("crawledAt"),
        "source": data.get("source"),
        "loggedIn": data.get("loggedIn"),
        "categoryCount": data.get("categoryCount"),
        "apiCount": data.get("apiCount"),
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
        "updated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "source": "11st Open API authenticated DOM crawl",
        "guide_crawl": crawl_ref,
        "count": len(entries),
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
        "## 사용 원칙",
        "",
        "- `method`와 `payload_type`을 반드시 함께 확인합니다. 11번가는 같은 URL이라도 GET이 아닌 POST/XML인 경우가 많습니다.",
        "- `mutation=true`인 API는 기본 dry-run 이후 execute로만 호출합니다.",
        "- 상세 파라미터/오류/응답 표는 원본 크롤링 JSON의 `tables`를 기준으로 확인합니다.",
        "",
    ]
    for category_no in sorted(category_map, key=lambda value: int(value)):
        rows = [entry for entry in entries if entry["category_no"] == category_no]
        if not rows:
            continue
        lines.extend([
            f"## {category_map[category_no]} (`categoryNo={category_no}`)",
            "",
            "| API | Method | URL | Write | apiSeq |",
            "|---|---:|---|---:|---:|",
        ])
        for entry in rows:
            lines.append(f"| {entry['label']} | {entry['method'] or '?'} | `{entry['url'] or '(문서 URL 미확인)'}` | {'Y' if entry['mutation'] else 'N'} | {entry['api_seq']} |")
        lines.append("")
    (output_dir / "11st-openapi-url-catalog.md").write_text("\n".join(lines), encoding="utf-8")

    print(json.dumps({
        "crawl_path": str(crawl_path),
        "catalog_json": str(output_dir / "11st-openapi-url-catalog.json"),
        "catalog_md": str(output_dir / "11st-openapi-url-catalog.md"),
        "api_count": len(entries),
    }, ensure_ascii=False, indent=2))


def main() -> None:
    args = parse_args()
    data = run_playwright_crawl()
    if not data.get("loggedIn"):
        raise SystemExit("11번가 로그인 상태가 아닙니다. 브라우저 로그인 후 다시 실행하세요.")
    build_outputs(data, Path(args.output_dir), args.date)


if __name__ == "__main__":
    main()

