#!/usr/bin/env python3
"""
Build a conservative final-folder proposal for the local company file review set.

This script reads the already copied local review folder and writes a CSV plus a
Markdown meeting guide. It does not move, delete, or upload files.
"""

from __future__ import annotations

import csv
import re
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


REPO = Path(__file__).resolve().parents[2]
REVIEW_ROOT = REPO / "tmp/local-company-file-review-20260415/선별자료_검토함"
REPORT_DIR = REPO / "reports/local-file-collection-20260415"
CSV_PATH = REPORT_DIR / "classification-proposal.csv"
MD_PATH = REPORT_DIR / "CLASSIFICATION-PROPOSAL.md"


@dataclass(frozen=True)
class Decision:
    decision: str
    folder: str
    confidence: str
    reason: str


def norm(value: str) -> str:
    return unicodedata.normalize("NFC", value).lower()


def has_any(text: str, terms: tuple[str, ...]) -> bool:
    return any(term.lower() in text for term in terms)


def has_nda_token(text: str) -> bool:
    return re.search(r"(^|[^a-z0-9])nda([^a-z0-9]|$)", text) is not None


def classify(relative_path: Path) -> Decision:
    text = norm(str(relative_path))
    suffix = relative_path.suffix.lower()

    # Credentials and access material. Deliberately do not include generic
    # "인증서"; product certificates are handled below.
    if has_any(
        text,
        (
            "접속정보",
            "비밀번호",
            "패스워드",
            "password",
            "passwd",
            "secret",
            "token",
            "api key",
            "api키",
            "인증키",
            "credential",
            ".env",
            "id_rsa",
            "id_ed25519",
            "ssh",
            "계정정보",
            "로그인정보",
        ),
    ):
        return Decision("admin", "관리자문서함/계정-권한", "high", "접속정보/비밀번호/API키 후보")

    if has_any(text, ("송장", "배송내역", "주문배송", "고객리스트", "고객명단", "주소록", "연락처", "전화번호", "쿠폰 발급리스트")):
        return Decision("admin", "관리자문서함/고객개인정보", "high", "고객/주문/배송 개인정보 가능성")

    if has_any(
        text,
        (
            "노무",
            "인사",
            "급여",
            "임금",
            "근로",
            "직원",
            "재직",
            "휴가",
            "육아휴직",
            "취업규칙",
            "고용장려금",
            "장애인 인식",
            "연말정산",
            "원천징수",
        ),
    ):
        return Decision("admin", "관리자문서함/인사-기밀", "high", "노무/인사/직원 관련 문서")

    if has_any(text, ("개인정보 수집", "개인정보수집", "개인정보 동의", "개인정보동의")):
        return Decision("admin", "관리자문서함/계약-법무", "high", "개인정보 동의서/법무 문서")

    if has_any(text, ("계약", "동의서", "법무", "분쟁", "합의서", "위탁판매")) or has_nda_token(text):
        return Decision("admin", "관리자문서함/계약-법무", "high", "계약/법무 문서")

    if has_any(text, ("얼마에요", "거래처.xls", "거래처.xlsx", "고객리스트.xls", "고객리스트.xlsx", "미수금", "미지급금")):
        return Decision("admin", "관리자문서함/Customer_OS_원본보관소", "high", "얼마에요/거래처/고객/회계 원본 데이터")

    if has_any(
        text,
        (
            "세무",
            "세금",
            "부가가치",
            "종합소득",
            "재무제표",
            "원천세",
            "법인세",
            "사업자등록",
            "통장",
            "은행",
            "계좌",
            "증빙",
        ),
    ):
        return Decision("admin", "관리자문서함/세무-증빙", "high", "세무/회계 증빙 후보")

    if has_any(
        text,
        (
            "견적",
            "거래명세",
            "공급가",
            "발주",
            "주문서",
            "invoice",
            "quotation",
            "proforma",
            "정산",
            "매출",
            "마진",
            "원가",
            "단가",
            "판매가",
            "수입비용",
            "물류계산",
            "cbm",
            "홍콩거래",
            "청구서",
        ),
    ):
        return Decision("admin", "관리자문서함/매출-재무", "high", "거래/견적/정산/매출 자료")

    if has_any(
        text,
        (
            "msds",
            "tds",
            "rohs",
            "reach",
            "kcc",
            "kc证书",
            "kc인증",
            "kc 인증",
            "ce report",
            "ce cert",
            "ce인증",
            "fcc",
            "rra",
            "시험성적",
            "시험신청",
            "인증서",
            "인증서류",
            "식별부호",
            "안전기준",
            "kotiti",
            "전자파",
            "구비서류",
            "certificate",
            "certification",
        ),
    ):
        return Decision("employee-review", "내부문서/상품-인증-MSDS-시험성적서", "high", "상품 인증/MSDS/시험성적서")

    if has_any(
        text,
        (
            "정부지원",
            "지원사업",
            "사업계획서",
            "공문",
            "공적조서",
            "지원제도",
            "컨설팅 결과보고서",
            "여성가족재단",
        ),
    ):
        return Decision("employee-review", "내부문서/정부지원-인증", "medium", "정부지원/대외 제출 자료")

    if has_any(
        text,
        (
            "사방넷",
            "스마트스토어",
            "쿠팡",
            "오늘의집",
            "오픈마켓",
            "상품등록",
            "상품 등록",
            "상품 옵션",
            "로켓배송",
            "쇼핑몰 관리",
            "상품정리",
            "품절",
            "출고",
            "재고",
        ),
    ):
        return Decision("employee-review", "내부문서/오픈마켓-상품운영", "high", "오픈마켓/상품운영 자료")

    if has_any(
        text,
        (
            "n8n",
            "nocodb",
            "nextcloud",
            "openclaw",
            "oracle",
            "nas",
            "backup",
            "백업",
            "자동화",
            "ai활용",
            "ax고도화",
            "prd",
            "업무효율화",
            "claudecode",
            "ai wiki",
            "ai-wiki",
        ),
    ):
        return Decision("admin", "관리자문서함/AI_Wiki_관리원본/운영-AI-자동화", "high", "운영/AI/자동화 지식 원본")

    if has_any(
        text,
        (
            "레지너스",
            "reginus",
            "resiners",
            "uv",
            "레진",
            "실리콘",
            "하바리움",
            "압화",
            "교반기",
            "machine",
            "mixer",
            "hardware",
            "도면",
            "스티커",
            "제품",
            "소싱",
            "공장",
            "소재",
            "원데이클래스",
            "클래스 요강",
        ),
    ):
        return Decision("employee-review", "내부문서/상품-소싱-제품지식", "medium", "상품/소재/소싱 지식 자료")

    if has_any(
        text,
        (
            "상세페이지",
            "배너",
            "썸네일",
            "시안",
            "화이트페이퍼",
            "white paper",
            "font",
            "paperlogy",
        ),
    ) or suffix in {".psd", ".ai", ".eps", ".svg"}:
        return Decision("employee-review", "디자인/상세페이지-디자인원본", "medium", "디자인 원본/상세페이지 자료")

    if has_any(
        text,
        (
            "사진",
            "촬영",
            "상품컷",
            "연출컷",
            "후기",
            "작례",
            "dcim",
            "100msdcf",
            "리뷰",
            "행사",
        ),
    ) or suffix in {".jpg", ".jpeg", ".png", ".heic", ".tif", ".tiff", ".arw", ".raw"}:
        return Decision("employee-review", "사진/제품사진-리뷰-행사", "medium", "사진/촬영/리뷰/행사 자료")

    if has_any(text, ("영상", "유튜브", "youtube", "릴스", "reels", "촬영본", "편집")) or suffix in {
        ".mp4",
        ".mov",
        ".m4v",
        ".avi",
        ".mkv",
        ".webm",
        ".prproj",
        ".aep",
    }:
        return Decision("employee-review", "영상자료/릴스-사용법-완성본", "medium", "영상/유튜브/릴스 자료")

    if has_any(text, ("브랜드", "로고", "회사소개", "소개서", "공식 블로그", "seo", "마케팅", "검색 유입")):
        return Decision("employee-review", "브랜드/회사소개-브랜드원본", "medium", "브랜드/회사소개/마케팅 자료")

    if has_any(text, ("업무", "회의", "가이드", "매뉴얼", "체크리스트", "운영", "프로세스", "roadmap", "sop", "템플릿", "template")):
        return Decision("employee-review", "내부문서/업무가이드-회의-운영", "medium", "업무가이드/회의/운영 자료")

    if has_any(text, ("github desktop", "hammerspoon", "anysupport", ".app/", "node_modules")):
        return Decision("exclude", "제외후보/앱-외부로고-참조파일", "medium", "업무 보관소에 넣기 애매한 앱/외부 참조 파일")

    return Decision("review", "00_INBOX/관리자검토-애매", "low", "분류 기준상 확정 어려움")


def main() -> None:
    if not REVIEW_ROOT.exists():
        raise SystemExit(f"Review folder not found: {REVIEW_ROOT}")

    rows: list[dict[str, str]] = []
    for path in sorted(p for p in REVIEW_ROOT.rglob("*") if p.is_file()):
        relative = path.relative_to(REVIEW_ROOT)
        decision = classify(relative)
        rows.append(
            {
                "decision": decision.decision,
                "recommended_final_folder": decision.folder,
                "confidence": decision.confidence,
                "reason": decision.reason,
                "size_mb": f"{path.stat().st_size / 1024 / 1024:.2f}",
                "extension": path.suffix.lower(),
                "review_relative_path": str(relative),
                "review_path": str(path),
            }
        )

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    with CSV_PATH.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    counts = Counter(row["recommended_final_folder"] for row in rows)
    decisions = Counter(row["decision"] for row in rows)
    size_by_folder: defaultdict[str, float] = defaultdict(float)
    samples: defaultdict[str, list[str]] = defaultdict(list)
    for row in rows:
        folder = row["recommended_final_folder"]
        size_by_folder[folder] += float(row["size_mb"])
        if len(samples[folder]) < 12:
            samples[folder].append(row["review_relative_path"])

    priority = [
        "관리자문서함/계정-권한",
        "관리자문서함/고객개인정보",
        "관리자문서함/계약-법무",
        "관리자문서함/인사-기밀",
        "관리자문서함/Customer_OS_원본보관소",
        "관리자문서함/세무-증빙",
        "관리자문서함/매출-재무",
        "관리자문서함/AI_Wiki_관리원본/운영-AI-자동화",
        "내부문서/상품-인증-MSDS-시험성적서",
        "내부문서/오픈마켓-상품운영",
        "내부문서/상품-소싱-제품지식",
        "내부문서/정부지원-인증",
        "내부문서/업무가이드-회의-운영",
        "브랜드/회사소개-브랜드원본",
        "디자인/상세페이지-디자인원본",
        "사진/제품사진-리뷰-행사",
        "영상자료/릴스-사용법-완성본",
        "00_INBOX/관리자검토-애매",
        "제외후보/앱-외부로고-참조파일",
    ]
    ordered_folders = [folder for folder in priority if folder in counts]
    ordered_folders.extend(folder for folder, _ in counts.most_common() if folder not in ordered_folders)

    total_mb = sum(float(row["size_mb"]) for row in rows)
    lines: list[str] = [
        "# 로컬 회사자료 정식 분류 제안",
        "",
        f"- 생성일: `{datetime.now().replace(microsecond=0).isoformat()}`",
        f"- 대상 검토함: `{REVIEW_ROOT}`",
        f"- 대상 파일: `{len(rows):,}`개",
        f"- 총 용량: `{total_mb / 1024:.2f} GiB`",
        "- 아직 미니PC/Nextcloud에는 업로드하지 않음",
        "",
        "## 결정 유형",
        "",
    ]
    for key, count in decisions.most_common():
        lines.append(f"- `{key}`: `{count:,}`개")

    lines.extend(["", "## 추천 최종 폴더", ""])
    for folder in ordered_folders:
        lines.append(f"- `{folder}`: `{counts[folder]:,}`개 / `{size_by_folder[folder] / 1024:.2f} GiB`")

    lines.extend(
        [
            "",
            "## 회의 우선순위",
            "",
            "1. 관리자문서함으로 들어갈 자료를 먼저 확정한다.",
            "2. Customer OS 원본보관소를 별도 폴더로 둘지, 매출-재무/고객개인정보 안에 넣을지 결정한다.",
            "3. 상품 인증/MSDS/시험성적서 폴더를 새로 만들지 결정한다.",
            "4. `00_INBOX/관리자검토-애매`는 대표 샘플만 보고 규칙을 추가한다.",
            "",
            "## 샘플",
            "",
        ]
    )

    for folder in ordered_folders:
        lines.append(f"### {folder}")
        for sample in samples[folder]:
            lines.append(f"- `{sample}`")
        lines.append("")

    MD_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(MD_PATH)
    print(CSV_PATH)


if __name__ == "__main__":
    main()
