#!/usr/bin/env python3
"""
Collect likely PRESSCO21 business files from local user folders.

The script never moves or deletes originals. It builds a classified staging tree
and CSV/Markdown reports so the staged tree can be synced to the mini PC.
"""

from __future__ import annotations

import argparse
import csv
import os
import shutil
import sys
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable


COLLECTION_NAME = "20260415_local-company-files_review-v01"

DEFAULT_ROOTS = [
    Path("/Users/jangjiho/Desktop"),
    Path("/Users/jangjiho/Documents"),
    Path("/Users/jangjiho/Downloads"),
    Path("/Users/jangjiho/Pictures"),
    Path("/Users/jangjiho/Movies"),
    Path("/Users/jangjiho/workspace"),
    Path("/Users/jangjiho/홈페이지"),
    Path("/Users/jangjiho/메이크샵"),
    Path("/Users/jangjiho/TAX-EASY-AI연말정산"),
]

DOC_EXT = {
    ".pdf",
    ".doc",
    ".docx",
    ".hwp",
    ".hwpx",
    ".xls",
    ".xlsx",
    ".csv",
    ".ppt",
    ".pptx",
    ".md",
    ".txt",
    ".rtf",
    ".pages",
    ".numbers",
    ".key",
    ".json",
    ".yaml",
    ".yml",
}

IMAGE_EXT = {
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".heic",
    ".tif",
    ".tiff",
    ".arw",
    ".raw",
    ".svg",
    ".psd",
    ".ai",
    ".eps",
}

VIDEO_EXT = {
    ".mp4",
    ".mov",
    ".m4v",
    ".avi",
    ".mkv",
    ".webm",
    ".prproj",
    ".aep",
}

ARCHIVE_EXT = {".zip", ".7z", ".rar", ".tar", ".gz", ".tgz"}

IGNORE_EXT = {
    ".app",
    ".dmg",
    ".iso",
    ".pkg",
    ".lock",
    ".log",
    ".tmp",
    ".part",
    ".download",
    ".sqlite",
    ".db",
    ".db-wal",
    ".db-shm",
    ".pyc",
    ".class",
    ".o",
    ".so",
    ".dylib",
}

IGNORE_DIR_NAMES = {
    ".git",
    ".svn",
    ".hg",
    "node_modules",
    ".next",
    "dist",
    "build",
    "__pycache__",
    ".venv",
    "venv",
    ".pytest_cache",
    ".mypy_cache",
    "playwright-report",
    "test-results",
    ".Trash",
    "Library",
    "Applications",
    ".cache",
    ".npm",
    ".pnpm-store",
    ".yarn",
    ".ollama",
    ".docker",
    "Google Drive",
}

TEMP_PREFIXES = ("~$", "._")

CREDENTIAL_NAMES = {
    ".env",
    ".env.local",
    ".env.production",
    ".secrets",
    "id_rsa",
    "id_ed25519",
    "known_hosts",
    "credentials.json",
    "token.json",
}

COMPANY_CONTEXT = [
    "pressco21",
    "프레스코",
    "프레스코21",
    "reginus",
    "레지너스",
    "사방넷",
    "makeshop",
    "메이크샵",
    "n8n-main/pressco21",
    "workspace/pressco21",
    "openclaw",
    "nextcloud",
    "minipc",
    "홈페이지",
    "쇼핑몰",
]

KEYWORDS = {
    "brand": [
        "브랜드",
        "로고",
        "회사소개",
        "소개서",
        "pressco21",
        "프레스코",
        "brand",
        "logo",
        "story",
    ],
    "design": [
        "디자인",
        "상세페이지",
        "배너",
        "썸네일",
        "이미지호스팅",
        "화이트페이퍼",
        "white paper",
        "resiners",
        "레지너스",
        "시안",
        "템플릿",
        "template",
    ],
    "photos": [
        "사진",
        "촬영",
        "상품컷",
        "연출컷",
        "후기",
        "작례",
        "압화대전",
        "클래스",
        "행사",
        "제품사진",
    ],
    "videos": [
        "영상",
        "유튜브",
        "youtube",
        "릴스",
        "reels",
        "교육영상",
        "촬영본",
        "편집",
    ],
    "internal-docs": [
        "업무",
        "회의",
        "가이드",
        "매뉴얼",
        "체크리스트",
        "운영",
        "프로세스",
        "roadmap",
        "prd",
        "sop",
        "automation",
        "자동화",
        "nocodb",
        "n8n",
        "openclaw",
        "oracle",
        "nas",
        "backup",
        "백업",
        "ax고도화",
        "ai활용",
    ],
    "sales-docs": [
        "견적",
        "제안서",
        "거래명세",
        "영업",
        "고객",
        "발주",
        "납품",
        "quotation",
        "proposal",
    ],
    "commerce-data": [
        "사방넷",
        "스마트스토어",
        "쿠팡",
        "오늘의집",
        "오픈마켓",
        "상품정리",
        "상품",
        "품절",
        "재고",
        "출고",
        "송장",
        "배송",
        "창고",
        "주문",
    ],
    "government-support": [
        "정부지원",
        "지원사업",
        "사업계획",
        "수출",
        "바우처",
        "msit",
    ],
    "product-knowledge": [
        "압화",
        "식물표본",
        "레진",
        "수지",
        "에폭시",
        "epoxy",
        "resin",
        "msds",
        "tds",
        "샘플",
        "분석",
        "실리카겔",
        "mixer",
    ],
}

SENSITIVE_KEYWORDS = {
    "admin-vault/tax-evidence": [
        "세무",
        "세금",
        "신고",
        "부가가치",
        "종합소득",
        "재무제표",
        "급여",
        "상여",
        "건강보험",
        "통장",
        "은행",
        "계좌",
        "면허세",
        "과세",
        "원천",
        "연말정산",
        "정산",
        "매출",
    ],
    "admin-vault/contracts-legal": [
        "계약",
        "동의서",
        "법무",
        "견적서",
        "거래명세",
        "분쟁",
        "약관",
        "quotation",
    ],
    "admin-vault/hr-confidential": [
        "인사",
        "급여",
        "재직증명",
        "근로",
        "임신",
        "가족관계",
        "주민등록",
        "주민번호",
        "연말정산",
    ],
    "admin-vault/customer-personal-info": [
        "개인정보",
        "고객명단",
        "주소록",
        "연락처",
        "전화번호",
        "주민등록",
        "가족관계",
    ],
    "admin-vault/accounts-permissions": [
        "계정",
        "권한",
        "접속정보",
        "비밀번호",
        "password",
        "token",
        "secret",
        "api키",
        "api key",
    ],
}

PERSONAL_ONLY_KEYWORDS = [
    "청약",
    "청년안심주택",
    "공공주거",
    "주거환경임대",
    "입주자",
    "보험약관",
    "가족관계증명서",
    "주민등록초본",
    "전자항공권",
    "누수경위서",
]

PERSONAL_PROJECT_CONTEXT = [
    "/workspace/personal/",
    "/tax-easy-ai",
    "/tax-easy-ai연말정산",
    "/desktop/드캠 ",
    "/desktop/드림캠프",
    "/desktop/청약/",
]


@dataclass
class Classification:
    include: bool
    destination: str
    sensitivity: str
    confidence: str
    reason: str
    copy_status: str = "planned"
    staged_path: str = ""


@dataclass
class FileRecord:
    source_path: Path
    root_label: str
    size: int
    mtime: str
    ext: str
    classification: Classification


def norm(text: str) -> str:
    return unicodedata.normalize("NFKC", text).lower()


def contains_any(text: str, needles: Iterable[str]) -> list[str]:
    found = []
    for needle in needles:
        if norm(needle) in text:
            found.append(needle)
    return found


def safe_rel(root: Path, path: Path) -> Path:
    try:
        return path.relative_to(root)
    except ValueError:
        return Path(path.name)


def root_label_for(path: Path, roots: list[Path]) -> tuple[str, Path]:
    for root in roots:
        try:
            path.relative_to(root)
            return root.name or "root", root
        except ValueError:
            continue
    return "unknown-root", path.parent


def should_prune_dir(dir_name: str) -> bool:
    if dir_name in IGNORE_DIR_NAMES:
        return True
    if dir_name.endswith(".app"):
        return True
    if dir_name.startswith(".") and dir_name not in {".claude", ".codex"}:
        return True
    return False


def is_credential_like(path: Path) -> bool:
    name = path.name.lower()
    if name in CREDENTIAL_NAMES:
        return True
    if name.endswith((".pem", ".key", ".p12", ".mobileprovision")):
        return True
    return False


def is_company_context(text: str) -> bool:
    return bool(contains_any(text, COMPANY_CONTEXT))


def keyword_hits(text: str) -> dict[str, list[str]]:
    return {group: contains_any(text, words) for group, words in KEYWORDS.items()}


def sensitive_hits(text: str) -> dict[str, list[str]]:
    return {dest: contains_any(text, words) for dest, words in SENSITIVE_KEYWORDS.items()}


def choose_sensitive_destination(hits: dict[str, list[str]]) -> tuple[str, list[str]]:
    ranked = sorted(hits.items(), key=lambda item: len(item[1]), reverse=True)
    for destination, words in ranked:
        if words:
            return destination, words
    return "", []


def choose_public_destination(ext: str, hits: dict[str, list[str]], text: str) -> tuple[str, str]:
    if ext in VIDEO_EXT or hits["videos"]:
        return f"ui-roots/videos/{COLLECTION_NAME}", "video/media match"
    if hits["design"]:
        return f"library/design/{COLLECTION_NAME}", "design match"
    if hits["photos"] and (ext in IMAGE_EXT or ext in ARCHIVE_EXT or hits["product-knowledge"]):
        return f"library/photos/{COLLECTION_NAME}", "photo/product asset match"
    if ext in IMAGE_EXT and (hits["photos"] or hits["product-knowledge"]):
        return f"library/photos/{COLLECTION_NAME}", "image/photo/product match"
    if hits["brand"]:
        return f"library/brand/{COLLECTION_NAME}", "brand match"
    if hits["commerce-data"]:
        return f"library/internal-docs/{COLLECTION_NAME}/commerce-data", "commerce data match"
    if hits["government-support"]:
        return f"library/internal-docs/{COLLECTION_NAME}/government-support", "government support match"
    if hits["sales-docs"]:
        return f"library/internal-docs/{COLLECTION_NAME}/sales-docs", "sales document match"
    if hits["product-knowledge"]:
        return f"library/internal-docs/{COLLECTION_NAME}/product-knowledge", "product knowledge match"
    if hits["internal-docs"] or "workspace/pressco21" in text or "n8n-main/pressco21" in text:
        return f"library/internal-docs/{COLLECTION_NAME}", "internal document match"
    return f"employee-uploads/관리자검토/{COLLECTION_NAME}", "company-related but ambiguous"


def classify(path: Path, root_label: str, size: int) -> Classification:
    name = path.name
    ext = path.suffix.lower()
    text = norm(str(path))

    if name.startswith(TEMP_PREFIXES):
        return Classification(False, "excluded/temp-office-file", "excluded", "high", "temporary Office or macOS sidecar file")

    if is_credential_like(path):
        return Classification(False, "excluded/credential-like", "excluded", "high", "credential-like file; do not duplicate to Nextcloud")

    if "/desktop/n8n-main/" in text and "/desktop/n8n-main/pressco21/" not in text:
        return Classification(False, "excluded/reference-code-library", "excluded", "high", "n8n source library, not company archive material")

    if "/mcp-shrimp-task-manager/" in text:
        return Classification(False, "excluded/reference-code-library", "excluded", "high", "reference code library, not company archive material")

    if contains_any(text, PERSONAL_PROJECT_CONTEXT) and not is_company_context(text):
        return Classification(False, "excluded/personal-project-context", "excluded", "high", "personal project/context without company signal")

    if ext == ".json" and not contains_any(
        text,
        [
            "pressco21/n8n-automation/workflows",
            "n8n-main/pressco21",
            "openclaw-project-hub",
            "사방넷",
            "product_analysis",
            "stock",
            "workflow",
            "workflows",
        ],
    ):
        return Classification(False, "excluded/generic-json", "excluded", "medium", "generic JSON outside company workflow/data paths")

    if ext in IGNORE_EXT:
        return Classification(False, "excluded/unsupported", "excluded", "high", f"ignored extension {ext}")

    is_supported = ext in DOC_EXT or ext in IMAGE_EXT or ext in VIDEO_EXT or ext in ARCHIVE_EXT
    if not is_supported:
        return Classification(False, "excluded/unsupported", "excluded", "medium", f"unsupported extension {ext or '(none)'}")

    company = is_company_context(text)
    hits = keyword_hits(text)
    hit_count = sum(len(v) for v in hits.values())
    shits = sensitive_hits(text)
    sensitive_destination, sensitive_words = choose_sensitive_destination(shits)
    personal_only = contains_any(text, PERSONAL_ONLY_KEYWORDS)

    if personal_only and not company and not hits["internal-docs"]:
        return Classification(
            False,
            "excluded/personal-sensitive-review",
            "sensitive-not-copied",
            "medium",
            "personal-looking sensitive document without company context",
        )

    if sensitive_destination:
        confidence = "high" if company or hit_count >= 2 else "medium"
        if not company and hit_count == 0 and ext in IMAGE_EXT:
            return Classification(
                False,
                "excluded/sensitive-image-no-company-context",
                "sensitive-not-copied",
                "low",
                "sensitive-looking image without company context",
            )
        return Classification(
            True,
            f"{sensitive_destination}/{COLLECTION_NAME}",
            "admin-only",
            confidence,
            "sensitive keyword: " + ", ".join(sensitive_words[:5]),
        )

    if ext in IMAGE_EXT and not (company or hit_count >= 1):
        return Classification(False, "excluded/unrelated-media", "public", "low", "image has no company keyword")

    if ext in VIDEO_EXT and not (company or hit_count >= 1):
        return Classification(False, "excluded/unrelated-media", "public", "low", "video has no company keyword")

    if ext in ARCHIVE_EXT and not (company or hit_count >= 2):
        return Classification(False, "excluded/unrelated-archive", "public", "low", "archive has weak company signal")

    if company or hit_count >= 1:
        destination, reason = choose_public_destination(ext, hits, text)
        confidence = "high" if company or hit_count >= 3 else "medium"
        return Classification(True, destination, "employee-visible-review", confidence, reason)

    return Classification(False, "excluded/no-company-signal", "public", "low", "no company keyword")


def iter_files(roots: list[Path]) -> Iterable[Path]:
    for root in roots:
        if not root.exists():
            continue
        if root.is_file():
            yield root
            continue
        for current, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if not should_prune_dir(d)]
            for filename in filenames:
                yield Path(current) / filename


def build_records(roots: list[Path]) -> list[FileRecord]:
    records: list[FileRecord] = []
    for path in iter_files(roots):
        try:
            if not path.is_file():
                continue
            stat = path.stat()
        except OSError:
            continue
        root_label, root = root_label_for(path, roots)
        c = classify(path, root_label, stat.st_size)
        records.append(
            FileRecord(
                source_path=path,
                root_label=root_label,
                size=stat.st_size,
                mtime=datetime.fromtimestamp(stat.st_mtime).isoformat(timespec="seconds"),
                ext=path.suffix.lower(),
                classification=c,
            )
        )
    return records


def staged_relative_path(record: FileRecord, roots: list[Path]) -> Path:
    root_label, root = root_label_for(record.source_path, roots)
    rel = safe_rel(root, record.source_path)
    return Path(record.classification.destination) / root_label / rel


def write_csv(path: Path, records: list[FileRecord]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "include",
                "copy_status",
                "destination",
                "sensitivity",
                "confidence",
                "size_bytes",
                "size_mb",
                "mtime",
                "extension",
                "reason",
                "source_path",
                "staged_path",
            ]
        )
        for r in records:
            c = r.classification
            writer.writerow(
                [
                    "yes" if c.include else "no",
                    c.copy_status,
                    c.destination,
                    c.sensitivity,
                    c.confidence,
                    r.size,
                    f"{r.size / 1024 / 1024:.2f}",
                    r.mtime,
                    r.ext,
                    c.reason,
                    str(r.source_path),
                    c.staged_path,
                ]
            )


def write_summary(path: Path, records: list[FileRecord], copied_bytes: int) -> None:
    included = [r for r in records if r.classification.include]
    copied = [r for r in included if r.classification.copy_status in {"copied", "copied-review"}]
    deferred = [r for r in included if r.classification.copy_status.startswith("deferred")]
    excluded = [r for r in records if not r.classification.include]
    by_dest = Counter(r.classification.destination for r in included)
    by_status = Counter(r.classification.copy_status for r in records)
    by_sensitivity = Counter(r.classification.sensitivity for r in included)
    largest = sorted(included, key=lambda r: r.size, reverse=True)[:30]

    lines = [
        "# Local Company File Collection Report",
        "",
        f"- Collection: `{COLLECTION_NAME}`",
        f"- Generated: `{datetime.now().isoformat(timespec='seconds')}`",
        f"- Scanned files: `{len(records):,}`",
        f"- Included candidates: `{len(included):,}`",
        f"- Copied into local review folder: `{len(copied):,}` files / `{copied_bytes / 1024 / 1024 / 1024:.2f} GiB`",
        f"- Deferred included candidates: `{len(deferred):,}`",
        f"- Excluded files: `{len(excluded):,}`",
        "",
        "## Included By Destination",
        "",
    ]
    for destination, count in by_dest.most_common():
        lines.append(f"- `{destination}`: `{count:,}`")
    lines.extend(["", "## Included By Sensitivity", ""])
    for sensitivity, count in by_sensitivity.most_common():
        lines.append(f"- `{sensitivity}`: `{count:,}`")
    lines.extend(["", "## Copy Status", ""])
    for status, count in by_status.most_common():
        lines.append(f"- `{status}`: `{count:,}`")
    lines.extend(["", "## Largest Included Candidates", ""])
    for r in largest:
        lines.append(
            f"- `{r.size / 1024 / 1024 / 1024:.2f} GiB` -> `{r.classification.destination}`: `{r.source_path}`"
        )
    lines.extend(
        [
            "",
            "## Notes",
            "",
            "- Originals were not moved or deleted.",
            "- Credential-like files were excluded rather than duplicated.",
            "- Personal-looking sensitive files without company context were reported but not copied.",
            "- Large candidates can be synced in a second pass after checking the report.",
        ]
    )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def copy_records(records: list[FileRecord], roots: list[Path], stage_dir: Path, max_file_bytes: int, max_total_bytes: int) -> int:
    copied_bytes = 0
    for r in records:
        c = r.classification
        if not c.include:
            c.copy_status = "excluded"
            continue
        rel = staged_relative_path(r, roots)
        dest = stage_dir / rel
        c.staged_path = str(dest)
        if r.size > max_file_bytes:
            c.copy_status = "deferred-large-file"
            continue
        if copied_bytes + r.size > max_total_bytes:
            c.copy_status = "deferred-total-limit"
            continue
        try:
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(r.source_path, dest)
            copied_bytes += r.size
            c.copy_status = "copied"
        except OSError as exc:
            c.copy_status = f"copy-error: {exc.__class__.__name__}"
    return copied_bytes


def review_bucket(record: FileRecord) -> str:
    c = record.classification
    ext = record.ext
    source = norm(str(record.source_path))

    if c.sensitivity == "admin-only":
        return "90_민감자료_관리자만검토"
    if ext in {".xlsx", ".xls", ".csv", ".numbers"}:
        return "02_데이터_엑셀_CSV"
    if contains_any(source, ["n8n", "nocodb", "openclaw", "nextcloud", "backup", "nas", "자동화", "ai", "ax고도화"]):
        return "03_운영_AI_자동화문서"
    if ext in IMAGE_EXT or ext in VIDEO_EXT or contains_any(source, ["사진", "촬영", "영상", "릴스", "상품컷", "연출컷"]):
        return "05_사진영상_대표자료_소형"
    if contains_any(source, ["브랜드", "로고", "디자인", "상세페이지", "화이트페이퍼", "회사소개", "pressco21"]):
        return "04_브랜드_디자인문서"
    return "01_문서_우선검토"


def copy_review_records(
    records: list[FileRecord],
    roots: list[Path],
    review_dir: Path,
    max_file_bytes: int,
    max_total_bytes: int,
) -> int:
    bucket_limits = {
        "01_문서_우선검토": 1200,
        "02_데이터_엑셀_CSV": 1000,
        "03_운영_AI_자동화문서": 1200,
        "04_브랜드_디자인문서": 900,
        "05_사진영상_대표자료_소형": 350,
        "90_민감자료_관리자만검토": 700,
    }
    bucket_counts: defaultdict[str, int] = defaultdict(int)
    copied_bytes = 0

    included = [r for r in records if r.classification.include]
    included.sort(key=lambda r: (r.classification.sensitivity != "admin-only", r.size))

    for r in included:
        c = r.classification
        bucket = review_bucket(r)
        rel_root_label, root = root_label_for(r.source_path, roots)
        rel = safe_rel(root, r.source_path)
        c.staged_path = str(review_dir / bucket / rel_root_label / rel)

        if r.size > max_file_bytes:
            c.copy_status = "deferred-large-file"
            continue
        if copied_bytes + r.size > max_total_bytes:
            c.copy_status = "deferred-total-limit"
            continue
        if bucket_counts[bucket] >= bucket_limits[bucket]:
            c.copy_status = "deferred-bucket-limit"
            continue
        if r.ext in IMAGE_EXT and bucket_counts[bucket] >= 250:
            c.copy_status = "deferred-media-sample-limit"
            continue
        try:
            dest = Path(c.staged_path)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(r.source_path, dest)
            copied_bytes += r.size
            bucket_counts[bucket] += 1
            c.copy_status = "copied-review"
        except OSError as exc:
            c.copy_status = f"copy-error: {exc.__class__.__name__}"

    for r in records:
        if not r.classification.include:
            r.classification.copy_status = "excluded"
    return copied_bytes


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Collect local PRESSCO21 company file candidates.")
    parser.add_argument("--mode", choices=["scan", "copy", "review-copy"], default="scan")
    parser.add_argument("--report-dir", type=Path, default=Path("reports/local-file-collection-20260415"))
    parser.add_argument("--stage-dir", type=Path, default=Path("tmp/local-company-file-collection-20260415/stage"))
    parser.add_argument("--review-dir", type=Path, default=Path("tmp/local-company-file-review-20260415/선별자료_검토함"))
    parser.add_argument("--max-copy-mb", type=int, default=512)
    parser.add_argument("--max-total-gb", type=int, default=80)
    parser.add_argument("--root", action="append", type=Path, help="Additional or replacement root. Repeatable.")
    parser.add_argument("--only-provided-roots", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    roots = list(args.root or [])
    if not args.only_provided_roots:
        roots = DEFAULT_ROOTS + roots
    roots = [p.expanduser().resolve() for p in roots if p.expanduser().exists()]

    if not roots:
        print("No scan roots exist.", file=sys.stderr)
        return 2

    records = build_records(roots)
    copied_bytes = 0
    if args.mode == "copy":
        copied_bytes = copy_records(
            records,
            roots,
            args.stage_dir.resolve(),
            args.max_copy_mb * 1024 * 1024,
            args.max_total_gb * 1024 * 1024 * 1024,
        )
    elif args.mode == "review-copy":
        copied_bytes = copy_review_records(
            records,
            roots,
            args.review_dir.resolve(),
            args.max_copy_mb * 1024 * 1024,
            args.max_total_gb * 1024 * 1024 * 1024,
        )
    else:
        for r in records:
            r.classification.copy_status = "planned" if r.classification.include else "excluded"
            if r.classification.include:
                r.classification.staged_path = str((args.stage_dir / staged_relative_path(r, roots)).resolve())

    args.report_dir.mkdir(parents=True, exist_ok=True)
    write_csv(args.report_dir / "manifest-all-files.csv", records)
    write_csv(args.report_dir / "included-copy-plan.csv", [r for r in records if r.classification.include])
    write_csv(
        args.report_dir / "excluded-or-deferred.csv",
        [r for r in records if not r.classification.include or r.classification.copy_status.startswith("deferred")],
    )
    write_summary(args.report_dir / "SUMMARY.md", records, copied_bytes)

    included = sum(1 for r in records if r.classification.include)
    copied = sum(1 for r in records if r.classification.copy_status in {"copied", "copied-review"})
    deferred = sum(1 for r in records if r.classification.copy_status.startswith("deferred"))
    print(f"scanned={len(records)} included={included} copied={copied} deferred={deferred}")
    print(f"report_dir={args.report_dir.resolve()}")
    print(f"stage_dir={args.stage_dir.resolve()}")
    print(f"review_dir={args.review_dir.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
