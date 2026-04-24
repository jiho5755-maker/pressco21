#!/usr/bin/env python3
"""PRESSCO21 세무 자료 수집 패키지 로컬 도구.

민감한 세무 원본 파일은 Git 저장소 밖의 로컬 폴더에 보관하는 것을 기본으로 한다.
이 도구는 폴더 생성, 파일 스캔, 해시 manifest, 누락 현황, 세무사 전달 ZIP 생성을 돕는다.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import shutil
import subprocess
import sys
import zipfile
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Iterable

supportedExtensions = {".pdf", ".xlsx", ".xls", ".csv", ".zip"}
csvFormulaPrefixes = ("=", "+", "-", "@")
sensitiveFilenamePatterns = [
    ("resident_registration_number", re.compile(r"\d{6}[-_ ]?\d{7}")),
    ("long_card_or_account_number", re.compile(r"\d[\d _-]{11,}\d")),
    ("secret_keyword", re.compile(r"(비밀번호|패스워드|password|passwd|api[_-]?key|secret|token)", re.IGNORECASE)),
]
manifestDirName = "00_manifest"
reviewDirName = "90_확인필요"
transferDirName = "99_세무사전달"
defaultExtraFolders = [manifestDirName, reviewDirName, transferDirName]
skipScanDirs = {manifestDirName, transferDirName, ".git", "__MACOSX"}
requiredItemColumns = {
    "item_id",
    "tax_year",
    "category",
    "source_name",
    "document_name",
    "period_start",
    "period_end",
    "required_level",
    "status",
    "folder_path",
    "expected_filename",
}


@dataclass(frozen=True)
class EvidenceFile:
    relativePath: str
    fileName: str
    extension: str
    sizeBytes: int
    modifiedAt: str
    sha256: str


@dataclass(frozen=True)
class ScanResult:
    evidenceFiles: list[EvidenceFile]
    statusRows: list[dict[str, str]]
    missingRows: list[dict[str, str]]
    duplicateRows: list[dict[str, str]]
    filenameIssueRows: list[dict[str, str]]
    monthlyCoverageRows: list[dict[str, str]]
    evidenceRows: list[dict[str, str]]
    summary: dict[str, object]


def parseArgs() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="PRESSCO21 세무 자료 수집 폴더 init/scan/zip 도구",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    initParser = subparsers.add_parser("init", help="세무 자료 수집 폴더 구조를 생성")
    initParser.add_argument("--base-dir", required=True, help="실제 세무자료를 담을 repo 밖 로컬 폴더")
    initParser.add_argument("--items-csv", required=True, help="tax_collection_items CSV 경로")
    initParser.add_argument("--tax-year", default="2025", help="귀속연도")
    initParser.add_argument("--company", default="PRESSCO21", help="회사/프로젝트명")
    initParser.add_argument(
        "--allow-inside-repo",
        action="store_true",
        help="테스트 목적 등으로 Git 저장소 내부 생성을 허용",
    )

    for commandName, helpText in [
        ("scan", "세무 자료 폴더를 스캔해 manifest와 누락 현황 생성"),
        ("hash", "scan과 동일하게 SHA-256 manifest 생성"),
        ("manifest", "scan과 동일하게 세무사 전달 manifest 생성"),
        ("missing-report", "scan과 동일하게 누락 현황표 생성"),
    ]:
        scanParser = subparsers.add_parser(commandName, help=helpText)
        scanParser.add_argument("--base-dir", required=True, help="세무자료 폴더")
        scanParser.add_argument(
            "--items-csv",
            help="체크리스트 CSV. 생략 시 base-dir/00_manifest/tax_collection_items.csv 사용",
        )
        scanParser.add_argument(
            "--out-dir",
            help="manifest 출력 폴더. 생략 시 base-dir/00_manifest 사용",
        )
        scanParser.add_argument(
            "--allow-inside-repo",
            action="store_true",
            help="테스트 목적 등으로 Git 저장소 내부 스캔을 허용",
        )

    zipParser = subparsers.add_parser("zip", help="세무사 전달용 ZIP 생성")
    zipParser.add_argument("--base-dir", required=True, help="세무자료 폴더")
    zipParser.add_argument(
        "--manifest-dir",
        help="manifest 폴더. 생략 시 base-dir/00_manifest 사용",
    )
    zipParser.add_argument("--tax-year", default="2025", help="귀속연도")
    zipParser.add_argument("--dry-run", action="store_true", help="ZIP 생성 없이 포함 파일만 확인")
    zipParser.add_argument(
        "--allow-inside-repo",
        action="store_true",
        help="테스트 목적 등으로 Git 저장소 내부 ZIP 생성을 허용",
    )

    return parser.parse_args()


def getRepoRoot() -> Path | None:
    try:
        output = subprocess.check_output(
            ["git", "rev-parse", "--show-toplevel"],
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
    except Exception:
        return None
    return Path(output).resolve() if output else None


def isInside(parentPath: Path, childPath: Path) -> bool:
    try:
        childPath.resolve().relative_to(parentPath.resolve())
        return True
    except ValueError:
        return False


def requireSafeBaseDir(baseDir: Path, allowInsideRepo: bool) -> None:
    repoRoot = getRepoRoot()
    if repoRoot and isInside(repoRoot, baseDir) and not allowInsideRepo:
        raise SystemExit(
            "민감한 세무 원본 파일 보호를 위해 Git 저장소 내부 base-dir 생성은 기본 차단됩니다. "
            "repo 밖 폴더를 지정하거나 테스트 목적이면 --allow-inside-repo를 사용하세요."
        )


def safeRelativePath(rawPath: str, fieldName: str) -> Path:
    if not rawPath:
        raise ValueError(f"{fieldName} 값이 비어 있습니다")
    path = Path(rawPath)
    if path.is_absolute() or ".." in path.parts or str(rawPath).startswith("~"):
        raise ValueError(f"위험한 {fieldName}: {rawPath}")
    return path


def loadItems(itemsCsv: Path) -> list[dict[str, str]]:
    if not itemsCsv.exists():
        raise SystemExit(f"체크리스트 CSV를 찾을 수 없습니다: {itemsCsv}")
    with itemsCsv.open("r", encoding="utf-8-sig", newline="") as fileObj:
        reader = csv.DictReader(fileObj)
        fieldnames = set(reader.fieldnames or [])
        missingColumns = sorted(requiredItemColumns - fieldnames)
        if missingColumns:
            raise SystemExit(f"체크리스트 CSV 필수 컬럼 누락: {', '.join(missingColumns)}")
        return [{key: (value or "") for key, value in row.items()} for row in reader]


def writeCsv(path: Path, rows: list[dict[str, object]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as fileObj:
        writer = csv.DictWriter(fileObj, fieldnames=fieldnames, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow({key: sanitizeCsvCell(value) for key, value in row.items()})


def sanitizeCsvCell(value: object) -> object:
    """Excel/CSV formula injection을 막기 위한 최소 이스케이프."""
    if not isinstance(value, str):
        return value
    if value.startswith(csvFormulaPrefixes):
        return "'" + value
    return value


def writeJson(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def nowText() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def initPackage(args: argparse.Namespace) -> None:
    baseDir = Path(args.base_dir).expanduser().resolve()
    itemsCsv = Path(args.items_csv).expanduser().resolve()
    requireSafeBaseDir(baseDir, args.allow_inside_repo)
    items = loadItems(itemsCsv)

    baseDir.mkdir(parents=True, exist_ok=True)
    folderPaths = {safeRelativePath(row["folder_path"], "folder_path") for row in items if row.get("folder_path")}
    for folderPath in sorted(folderPaths, key=str):
        (baseDir / folderPath).mkdir(parents=True, exist_ok=True)
    for folderName in defaultExtraFolders:
        (baseDir / folderName).mkdir(parents=True, exist_ok=True)

    manifestDir = baseDir / manifestDirName
    targetItemsCsv = manifestDir / "tax_collection_items.csv"
    if not targetItemsCsv.exists():
        shutil.copy2(itemsCsv, targetItemsCsv)

    readmePath = baseDir / "README_먼저읽기.md"
    if not readmePath.exists():
        readmePath.write_text(
            f"# {args.tax_year} 종합소득세 세무사 전달 자료 폴더\n\n"
            f"- 생성일: {nowText()}\n"
            f"- 회사/프로젝트: {args.company}\n"
            "- 원본 파일은 내려받은 그대로 보관하고, 파일명만 규칙에 맞춰 복사본으로 정리합니다.\n"
            "- 공동인증서, 비밀번호, API 키, 주민등록번호 전체값은 이 폴더에 저장하지 않습니다.\n"
            "- 세무 판단이 필요한 내용은 90_확인필요 폴더 또는 설명 메모에 남긴 뒤 세무사에게 확인합니다.\n"
            "- 스캔 실행: python3 _tools/tax-automation/tax_package.py scan --base-dir <이 폴더>\n",
            encoding="utf-8",
        )

    if args.allow_inside_repo:
        gitignorePath = baseDir / ".gitignore"
        if not gitignorePath.exists():
            gitignorePath.write_text("*\n!.gitignore\n!README_먼저읽기.md\n", encoding="utf-8")

    summary = {
        "base_dir": str(baseDir),
        "item_count": len(items),
        "folder_count": len(folderPaths) + len(defaultExtraFolders),
        "copied_items_csv": str(targetItemsCsv),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


def iterEvidenceFiles(baseDir: Path) -> Iterable[Path]:
    for path in baseDir.rglob("*"):
        if path.is_symlink():
            continue
        if not path.is_file():
            continue
        relativeParts = path.relative_to(baseDir).parts
        if any(part in skipScanDirs for part in relativeParts):
            continue
        if path.name.startswith(".") or path.name == "README_먼저읽기.md":
            continue
        yield path


def hashFile(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fileObj:
        for chunk in iter(lambda: fileObj.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def buildEvidenceFile(baseDir: Path, path: Path) -> EvidenceFile:
    stat = path.stat()
    return EvidenceFile(
        relativePath=path.relative_to(baseDir).as_posix(),
        fileName=path.name,
        extension=path.suffix.lower(),
        sizeBytes=stat.st_size,
        modifiedAt=datetime.fromtimestamp(stat.st_mtime).isoformat(timespec="seconds"),
        sha256=hashFile(path),
    )


def validateExpectedFilename(row: dict[str, str]) -> str:
    expectedFilename = row.get("expected_filename", "")
    if not expectedFilename:
        return "expected_filename 비어 있음"
    try:
        safeRelativePath(expectedFilename, "expected_filename")
    except ValueError as exc:
        return str(exc)
    if "/" in expectedFilename or "\\" in expectedFilename:
        return "expected_filename에는 폴더 구분자를 넣지 않습니다"
    extension = Path(expectedFilename).suffix.lower()
    if extension and extension not in supportedExtensions:
        return f"지원 목록 밖 확장자: {extension}"
    sensitiveReason = detectSensitiveFilename(expectedFilename)
    if sensitiveReason:
        return f"민감정보 의심 파일명: {sensitiveReason}"
    return ""


def detectSensitiveFilename(fileName: str) -> str:
    for label, pattern in sensitiveFilenamePatterns:
        if pattern.search(fileName):
            return label
    return ""


def classifyItemStatus(
    baseDir: Path,
    row: dict[str, str],
    evidenceByRelativePath: dict[str, EvidenceFile],
    folderFileCounts: Counter[str],
) -> tuple[str, str, str]:
    if row.get("status") == "NOT_APPLICABLE":
        return "NOT_APPLICABLE", "", "체크리스트에서 해당 없음으로 표시됨"

    folderPath = safeRelativePath(row["folder_path"], "folder_path")
    expectedFilename = row.get("expected_filename", "")
    expectedPath = (folderPath / expectedFilename).as_posix() if expectedFilename else ""

    if expectedPath in evidenceByRelativePath:
        return "COLLECTED", expectedPath, "expected_filename과 정확히 일치"

    folderKey = folderPath.as_posix()
    folderExists = (baseDir / folderPath).exists()
    if folderFileCounts[folderKey] > 0:
        return "NEEDS_REVIEW", "", "폴더에 파일은 있으나 expected_filename과 정확히 일치하지 않음"
    if not folderExists:
        return "NOT_STARTED", "", "대상 폴더가 아직 생성되지 않음"
    return "NOT_STARTED", "", "대상 폴더에 파일 없음"


def scanPackage(args: argparse.Namespace) -> ScanResult:
    baseDir = Path(args.base_dir).expanduser().resolve()
    requireSafeBaseDir(baseDir, args.allow_inside_repo)
    if not baseDir.exists():
        raise SystemExit(f"base-dir을 찾을 수 없습니다: {baseDir}")
    itemsCsv = Path(args.items_csv).expanduser().resolve() if args.items_csv else baseDir / manifestDirName / "tax_collection_items.csv"
    outDir = Path(args.out_dir).expanduser().resolve() if args.out_dir else baseDir / manifestDirName
    items = loadItems(itemsCsv)

    evidenceFiles = [buildEvidenceFile(baseDir, path) for path in iterEvidenceFiles(baseDir)]
    evidenceByRelativePath = {item.relativePath: item for item in evidenceFiles}
    folderFileCounts: Counter[str] = Counter()
    for evidenceFile in evidenceFiles:
        folderFileCounts[str(Path(evidenceFile.relativePath).parent.as_posix())] += 1

    statusRows: list[dict[str, str]] = []
    missingRows: list[dict[str, str]] = []
    filenameIssueRows: list[dict[str, str]] = []

    for row in items:
        issue = validateExpectedFilename(row)
        if issue:
            filenameIssueRows.append({
                "item_id": row.get("item_id", ""),
                "expected_filename": row.get("expected_filename", ""),
                "issue": issue,
            })
        scanStatus, matchedRelativePath, scanNote = classifyItemStatus(baseDir, row, evidenceByRelativePath, folderFileCounts)
        statusRow = dict(row)
        statusRow.update({
            "scan_status": scanStatus,
            "matched_relative_path": matchedRelativePath,
            "scan_note": scanNote,
        })
        statusRows.append(statusRow)
        if scanStatus in {"NOT_STARTED", "NEEDS_REVIEW"} and row.get("required_level") != "선택":
            missingRows.append(statusRow)

    for evidenceFile in evidenceFiles:
        issue = ""
        if evidenceFile.extension not in supportedExtensions:
            issue = f"지원 목록 밖 확장자: {evidenceFile.extension or '(없음)'}"
        sensitiveReason = detectSensitiveFilename(evidenceFile.fileName)
        if sensitiveReason:
            issue = f"민감정보 의심 파일명: {sensitiveReason}"
        if issue:
            filenameIssueRows.append({
                "item_id": "",
                "expected_filename": evidenceFile.relativePath,
                "issue": issue,
            })

    duplicateRows = buildDuplicateRows(evidenceFiles)
    monthlyCoverageRows = buildMonthlyCoverageRows(statusRows)
    evidenceRows = buildTaxEvidenceRows(evidenceFiles, statusRows)
    summary = buildSummary(items, evidenceFiles, statusRows, missingRows, duplicateRows, filenameIssueRows)
    writeScanOutputs(outDir, evidenceFiles, statusRows, missingRows, duplicateRows, filenameIssueRows, monthlyCoverageRows, evidenceRows, summary)
    return ScanResult(evidenceFiles, statusRows, missingRows, duplicateRows, filenameIssueRows, monthlyCoverageRows, evidenceRows, summary)


def buildDuplicateRows(evidenceFiles: list[EvidenceFile]) -> list[dict[str, str]]:
    duplicateRows: list[dict[str, str]] = []
    groups: dict[tuple[str, str], list[EvidenceFile]] = defaultdict(list)
    for evidenceFile in evidenceFiles:
        groups[("sha256", evidenceFile.sha256)].append(evidenceFile)
        groups[("filename", evidenceFile.fileName.lower())].append(evidenceFile)
    for (duplicateType, key), files in sorted(groups.items()):
        if len(files) < 2:
            continue
        duplicateRows.append({
            "duplicate_type": duplicateType,
            "duplicate_key": key,
            "count": str(len(files)),
            "relative_paths": " | ".join(file.relativePath for file in files),
        })
    return duplicateRows


def buildSummary(
    items: list[dict[str, str]],
    evidenceFiles: list[EvidenceFile],
    statusRows: list[dict[str, str]],
    missingRows: list[dict[str, str]],
    duplicateRows: list[dict[str, str]],
    filenameIssueRows: list[dict[str, str]],
) -> dict[str, object]:
    statusCounter = Counter(row["scan_status"] for row in statusRows)
    return {
        "generated_at": nowText(),
        "item_count": len(items),
        "evidence_file_count": len(evidenceFiles),
        "missing_or_review_required_count": len(missingRows),
        "duplicate_candidate_count": len(duplicateRows),
        "filename_rule_issue_count": len(filenameIssueRows),
        "status_counts": dict(sorted(statusCounter.items())),
    }


def buildTaxEvidenceRows(evidenceFiles: list[EvidenceFile], statusRows: list[dict[str, str]]) -> list[dict[str, str]]:
    matchedRowsByPath = {
        row["matched_relative_path"]: row
        for row in statusRows
        if row.get("matched_relative_path")
    }
    evidenceRows: list[dict[str, str]] = []
    for evidenceFile in evidenceFiles:
        matchedRow = matchedRowsByPath.get(evidenceFile.relativePath, {})
        evidenceRows.append({
            "file_id": f"FILE-{evidenceFile.sha256[:12]}",
            "item_id": matchedRow.get("item_id", ""),
            "original_filename": evidenceFile.fileName,
            "stored_path": evidenceFile.relativePath,
            "file_hash": evidenceFile.sha256,
            "hash_algo": "sha256",
            "file_type": evidenceFile.extension.lstrip("."),
            "source_name": matchedRow.get("source_name", ""),
            "document_name": matchedRow.get("document_name", ""),
            "period_start": matchedRow.get("period_start", ""),
            "period_end": matchedRow.get("period_end", ""),
            "review_status": "COLLECTED" if matchedRow else "NEEDS_REVIEW",
            "matched_by": "expected_filename" if matchedRow else "",
        })
    return evidenceRows


def buildMonthlyCoverageRows(statusRows: list[dict[str, str]]) -> list[dict[str, str]]:
    monthFields = [f"m{month:02d}" for month in range(1, 13)]
    coverageRows: list[dict[str, str]] = []
    for row in statusRows:
        taxYear = int(row.get("tax_year") or 0)
        periodStart = parseDate(row.get("period_start", ""))
        periodEnd = parseDate(row.get("period_end", ""))
        scanStatus = row.get("scan_status", "")
        coverageRow = {
            "item_id": row.get("item_id", ""),
            "tax_year": row.get("tax_year", ""),
            "category": row.get("category", ""),
            "source_name": row.get("source_name", ""),
            "document_name": row.get("document_name", ""),
            "required_level": row.get("required_level", ""),
            "scan_status": scanStatus,
            "missing_months": "",
            "review_note": "",
        }
        missingMonths: list[str] = []
        for month in range(1, 13):
            fieldName = f"m{month:02d}"
            if not taxYear or not periodStart or not periodEnd or not monthOverlaps(taxYear, month, periodStart, periodEnd):
                coverageRow[fieldName] = "OUT_OF_SCOPE"
            elif scanStatus == "COLLECTED":
                coverageRow[fieldName] = "COLLECTED"
            elif scanStatus == "NOT_APPLICABLE":
                coverageRow[fieldName] = "NOT_APPLICABLE"
            else:
                coverageRow[fieldName] = "MISSING_OR_REVIEW"
                missingMonths.append(f"{month:02d}")
        coverageRow["missing_months"] = ",".join(missingMonths)
        if missingMonths:
            coverageRow["review_note"] = "해당 기간 자료가 없거나 expected_filename과 정확히 일치하지 않습니다"
        coverageRows.append({**coverageRow, **{field: coverageRow[field] for field in monthFields}})
    return coverageRows


def parseDate(value: str) -> date | None:
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def monthOverlaps(taxYear: int, month: int, periodStart: date, periodEnd: date) -> bool:
    monthStart = date(taxYear, month, 1)
    if month == 12:
        monthEnd = date(taxYear, 12, 31)
    else:
        monthEnd = date(taxYear, month + 1, 1)
        monthEnd = date.fromordinal(monthEnd.toordinal() - 1)
    return periodStart <= monthEnd and periodEnd >= monthStart


def writeScanOutputs(
    outDir: Path,
    evidenceFiles: list[EvidenceFile],
    statusRows: list[dict[str, str]],
    missingRows: list[dict[str, str]],
    duplicateRows: list[dict[str, str]],
    filenameIssueRows: list[dict[str, str]],
    monthlyCoverageRows: list[dict[str, str]],
    evidenceRows: list[dict[str, str]],
    summary: dict[str, object],
) -> None:
    manifestRows = [file.__dict__ for file in evidenceFiles]
    writeCsv(
        outDir / "manifest_files.csv",
        manifestRows,
        ["relativePath", "fileName", "extension", "sizeBytes", "modifiedAt", "sha256"],
    )
    statusFieldnames = list(statusRows[0].keys()) if statusRows else []
    writeCsv(outDir / "collection_status.csv", statusRows, statusFieldnames)
    writeCsv(outDir / "missing_items.csv", missingRows, statusFieldnames)
    writeCsv(outDir / "duplicate_candidates.csv", duplicateRows, ["duplicate_type", "duplicate_key", "count", "relative_paths"])
    writeCsv(outDir / "filename_rule_issues.csv", filenameIssueRows, ["item_id", "expected_filename", "issue"])
    writeCsv(
        outDir / "monthly_coverage.csv",
        monthlyCoverageRows,
        [
            "item_id", "tax_year", "category", "source_name", "document_name", "required_level", "scan_status",
            "m01", "m02", "m03", "m04", "m05", "m06", "m07", "m08", "m09", "m10", "m11", "m12",
            "missing_months", "review_note",
        ],
    )
    writeCsv(
        outDir / "tax_evidence_files.csv",
        evidenceRows,
        [
            "file_id", "item_id", "original_filename", "stored_path", "file_hash", "hash_algo", "file_type",
            "source_name", "document_name", "period_start", "period_end", "review_status", "matched_by",
        ],
    )
    writeJson(outDir / "scan_summary.json", summary)


def printScanResult(result: ScanResult) -> None:
    print(json.dumps(result.summary, ensure_ascii=False, indent=2))


def loadManifest(manifestDir: Path) -> list[dict[str, str]]:
    manifestPath = manifestDir / "manifest_files.csv"
    if not manifestPath.exists():
        raise SystemExit(f"manifest_files.csv가 없습니다. 먼저 scan을 실행하세요: {manifestPath}")
    with manifestPath.open("r", encoding="utf-8", newline="") as fileObj:
        return list(csv.DictReader(fileObj))


def requireRegularFileInside(baseDir: Path, sourcePath: Path, expectedSha256: str = "") -> Path:
    if sourcePath.is_symlink():
        raise SystemExit(f"symlink 파일은 ZIP에 포함할 수 없습니다: {sourcePath}")
    try:
        resolvedSourcePath = sourcePath.resolve(strict=True)
    except FileNotFoundError as exc:
        raise SystemExit(f"manifest 파일을 찾을 수 없습니다: {sourcePath}") from exc
    if not isInside(baseDir, resolvedSourcePath):
        raise SystemExit(f"base-dir 밖 파일은 ZIP에 포함할 수 없습니다: {sourcePath}")
    if not resolvedSourcePath.is_file():
        raise SystemExit(f"일반 파일만 ZIP에 포함할 수 있습니다: {sourcePath}")
    if expectedSha256:
        currentSha256 = hashFile(resolvedSourcePath)
        if currentSha256 != expectedSha256:
            raise SystemExit(
                f"scan 이후 파일이 변경되었습니다. scan을 다시 실행하세요: {sourcePath}"
            )
    return resolvedSourcePath


def buildTransferZip(args: argparse.Namespace) -> None:
    baseDir = Path(args.base_dir).expanduser().resolve()
    requireSafeBaseDir(baseDir, args.allow_inside_repo)
    manifestDir = Path(args.manifest_dir).expanduser().resolve() if args.manifest_dir else baseDir / manifestDirName
    if not isInside(baseDir, manifestDir):
        raise SystemExit(f"manifest-dir은 base-dir 내부여야 합니다: {manifestDir}")
    manifestRows = loadManifest(manifestDir)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    transferDir = baseDir / transferDirName
    transferDir.mkdir(parents=True, exist_ok=True)
    zipPath = transferDir / f"{args.tax_year}_종합소득세_세무사전달_{timestamp}.zip"

    filesToAdd: list[tuple[Path, str]] = []
    for row in manifestRows:
        relativePath = row.get("relativePath", "")
        if not relativePath:
            continue
        safeRelative = safeRelativePath(relativePath, "relativePath")
        sourcePath = baseDir / safeRelative
        expectedSha256 = row.get("sha256", "")
        resolvedSourcePath = requireRegularFileInside(baseDir, sourcePath, expectedSha256)
        filesToAdd.append((resolvedSourcePath, safeRelative.as_posix()))
    for manifestFile in [
        "manifest_files.csv",
        "collection_status.csv",
        "missing_items.csv",
        "duplicate_candidates.csv",
        "filename_rule_issues.csv",
        "monthly_coverage.csv",
        "tax_evidence_files.csv",
        "scan_summary.json",
    ]:
        sourcePath = manifestDir / manifestFile
        if sourcePath.exists():
            resolvedSourcePath = requireRegularFileInside(baseDir, sourcePath)
            filesToAdd.append((resolvedSourcePath, f"{manifestDirName}/{manifestFile}"))

    readmeText = (
        f"{args.tax_year} 종합소득세 세무사 전달 패키지\n"
        f"생성일: {nowText()}\n\n"
        "주의: 이 ZIP은 자료 수집/전달 보조용입니다. 세무 판단과 신고 내용 확정은 세무사 검토가 필요합니다.\n"
        "포함 목록과 해시는 00_manifest/manifest_files.csv를 확인하세요.\n"
    )

    if args.dry_run:
        print(json.dumps({"zip_path": str(zipPath), "file_count": len(filesToAdd), "dry_run": True}, ensure_ascii=False, indent=2))
        for _, archiveName in filesToAdd:
            print(archiveName)
        return

    with zipfile.ZipFile(zipPath, "w", compression=zipfile.ZIP_DEFLATED) as zipObj:
        for sourcePath, archiveName in filesToAdd:
            zipObj.write(sourcePath, archiveName)
        zipObj.writestr("README_세무사전달.txt", readmeText)

    print(json.dumps({"zip_path": str(zipPath), "file_count": len(filesToAdd)}, ensure_ascii=False, indent=2))


def main() -> None:
    args = parseArgs()
    if args.command == "init":
        initPackage(args)
    elif args.command in {"scan", "hash", "manifest", "missing-report"}:
        printScanResult(scanPackage(args))
    elif args.command == "zip":
        buildTransferZip(args)
    else:
        raise SystemExit(f"지원하지 않는 명령: {args.command}")


if __name__ == "__main__":
    main()
