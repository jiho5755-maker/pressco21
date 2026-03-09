#!/usr/bin/env python3

import argparse
import pathlib
import re
import sys


RAW_TEMPLATE_RE = re.compile(r"(?<!\\)\$\{")
LET_CONST_RE = re.compile(r"\b(?:let|const)\b")
HTTP_RE = re.compile(r"http://", re.IGNORECASE)
INVALID_CLOSE_RE = re.compile(r"<!--/(?:endif|endloop|endform|if_end|loop_end|form_end)/-->")
IF_OPEN_RE = re.compile(r"<!--/if_[^/]+/-->")
IF_CLOSE_RE = re.compile(r"<!--/end_if/-->")
LOOP_OPEN_RE = re.compile(r"<!--/loop_[^/]+/-->")
LOOP_CLOSE_RE = re.compile(r"<!--/end_loop/-->")
FORM_OPEN_RE = re.compile(r"<!--/form_[^/]+/-->")
FORM_CLOSE_RE = re.compile(r"<!--/end_form/-->")
EMOJI_RE = re.compile("[\U0001F300-\U0001FAFF\u2600-\u27BF]")
IIFE_RE = re.compile(r"\(function\b[\s\S]{0,300}?['\"]use strict['\"]")

SCAN_SUFFIXES = {".html", ".htm", ".css", ".js"}


def line_number(text: str, index: int) -> int:
    return text.count("\n", 0, index) + 1


def add_match_issue(issues, text: str, pattern: re.Pattern, label: str) -> None:
    match = pattern.search(text)
    if match:
        issues.append((label, line_number(text, match.start())))


def add_count_issue(issues, text: str, open_re: re.Pattern, close_re: re.Pattern, label: str) -> None:
    open_count = len(open_re.findall(text))
    close_count = len(close_re.findall(text))
    if open_count != close_count:
        issues.append((f"{label} count mismatch ({open_count} open / {close_count} close)", 1))


def collect_targets(paths):
    targets = []
    for raw_path in paths:
        path = pathlib.Path(raw_path)
        if path.is_dir():
            for child in sorted(path.rglob("*")):
                if child.is_file() and child.suffix.lower() in SCAN_SUFFIXES:
                    targets.append(child)
            continue
        if path.is_file():
            if path.suffix.lower() in SCAN_SUFFIXES:
                targets.append(path)
            else:
                print(f"SKIP: {path} (unsupported suffix)", file=sys.stderr)
            continue
        print(f"MISSING: {path}", file=sys.stderr)
    return targets


def check_file(path: pathlib.Path):
    text = path.read_text(encoding="utf-8", errors="replace")
    issues = []

    add_match_issue(issues, text, RAW_TEMPLATE_RE, "raw ${ found")
    add_match_issue(issues, text, LET_CONST_RE, "let/const found")
    add_match_issue(issues, text, HTTP_RE, "http:// found")
    add_match_issue(issues, text, INVALID_CLOSE_RE, "invalid virtual-tag closer found")
    add_match_issue(issues, text, EMOJI_RE, "emoji found")

    add_count_issue(issues, text, IF_OPEN_RE, IF_CLOSE_RE, "if tag")
    add_count_issue(issues, text, LOOP_OPEN_RE, LOOP_CLOSE_RE, "loop tag")
    add_count_issue(issues, text, FORM_OPEN_RE, FORM_CLOSE_RE, "form tag")

    if path.suffix.lower() == ".js" and not IIFE_RE.search(text):
        issues.append(("IIFE wrapper with 'use strict' not detected", 1))

    return issues


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Static guard for MakeShop D4 template compatibility."
    )
    parser.add_argument("paths", nargs="+", help="Files or directories to scan")
    args = parser.parse_args()

    targets = collect_targets(args.paths)
    if not targets:
        print("No files to scan.", file=sys.stderr)
        return 1

    failed = False
    for path in targets:
        issues = check_file(path)
        if not issues:
            print(f"OK   {path}")
            continue
        failed = True
        print(f"FAIL {path}")
        for label, line in issues:
            print(f"  L{line}: {label}")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
