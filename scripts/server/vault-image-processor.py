#!/usr/bin/env python3
"""
PRESSCO21 상품 이미지 자동 처리기
inbox/상품사진/ → 배경 제거 + 채널별 리사이즈 → vault/products/ → MinIO 업로드
"""

import os
import sys
import time
import shutil
import logging
import subprocess
from pathlib import Path
from datetime import datetime

# rembg와 Pillow는 vault-tools 가상환경에서 실행
from rembg import remove
from PIL import Image

# === 설정 ===
INBOX_DIR = Path("/srv/pressco21-content/inbox/상품사진")
VAULT_PRODUCTS = Path("/srv/pressco21-content/vault/products")
PROCESSED_DIR = Path("/srv/pressco21-content/inbox/상품사진/_processed")
LOG_DIR = Path("/var/log/pressco21")
LOG_FILE = LOG_DIR / "vault-image-processor.log"

# MinIO 설정
MINIO_ALIAS = "pressco21"
MINIO_BUCKET = "images"
MINIO_BASE_URL = "https://img.pressco21.com/images"
MC_BIN = "/usr/local/bin/mc"

# 채널별 규격 (가로x세로)
CHANNEL_SPECS = {
    "makeshop": (860, 860),
    "smartstore": (1000, 1000),
    "coupang": (780, 780),
    "11st": (640, 640),
}

# 지원 확장자
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}

# 파일 안정 대기 시간 (초)
FILE_SETTLE_SECONDS = 60

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger(__name__)


def ensure_dirs():
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)


def find_new_images():
    """inbox/상품사진/ 에서 처리 대기 중인 이미지를 찾는다."""
    images = []
    if not INBOX_DIR.exists():
        return images

    now = time.time()
    for f in INBOX_DIR.iterdir():
        if f.name.startswith(".") or f.name.startswith("_"):
            continue
        if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS:
            # 파일이 안정화될 때까지 대기 (업로드 중일 수 있음)
            age = now - f.stat().st_mtime
            if age > FILE_SETTLE_SECONDS:
                images.append(f)
    return sorted(images)


def remove_background(input_path: Path, output_path: Path):
    """배경 제거"""
    with open(input_path, "rb") as inp:
        input_data = inp.read()
    output_data = remove(input_data)
    with open(output_path, "wb") as out:
        out.write(output_data)
    log.info(f"  배경 제거 완료: {output_path.name}")


def resize_for_channel(input_path: Path, output_dir: Path, channel: str, size: tuple) -> Path:
    """채널 규격에 맞게 리사이즈. 생성된 파일 경로를 반환."""
    channel_dir = output_dir / "channel" / channel
    channel_dir.mkdir(parents=True, exist_ok=True)

    img = Image.open(input_path)
    if img.mode == "RGBA":
        # 투명 배경을 흰색으로 변환
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[3])
        img = bg

    # 비율 유지하면서 리사이즈 (fit)
    img.thumbnail(size, Image.LANCZOS)
    # 정사각형 캔버스에 중앙 배치
    canvas = Image.new("RGB", size, (255, 255, 255))
    offset = ((size[0] - img.width) // 2, (size[1] - img.height) // 2)
    canvas.paste(img, offset)

    output_name = input_path.stem + ".jpg"
    output_path = channel_dir / output_name
    canvas.save(output_path, "JPEG", quality=90)
    log.info(f"  {channel} ({size[0]}x{size[1]}): {output_name}")
    return output_path


def upload_to_minio(local_path: Path, minio_path: str) -> str:
    """파일을 MinIO에 업로드. 공개 URL을 반환. 실패 시 빈 문자열."""
    target = f"{MINIO_ALIAS}/{MINIO_BUCKET}/{minio_path}"
    try:
        result = subprocess.run(
            [MC_BIN, "cp", "--quiet", str(local_path), target],
            capture_output=True,
            text=True,
            timeout=60,
        )
        if result.returncode == 0:
            url = f"{MINIO_BASE_URL}/{minio_path}"
            log.info(f"  MinIO 업로드: {url}")
            return url
        else:
            log.warning(f"  MinIO 업로드 실패: {result.stderr.strip()}")
            return ""
    except subprocess.TimeoutExpired:
        log.warning(f"  MinIO 업로드 타임아웃: {minio_path}")
        return ""
    except Exception as e:
        log.warning(f"  MinIO 업로드 오류: {e}")
        return ""


def guess_product_folder(filename: str) -> Path:
    """파일명에서 상품 폴더를 추측. 못 하면 _unsorted/"""
    # 파일명 패턴: 브랜드_상품명_용도.확장자
    stem = Path(filename).stem

    # 알려진 브랜드 (하이픈 포함 원본 + 축약형)
    brand_map = [
        ("forever-love", "forever-love"),
        ("foreverlove", "forever-love"),
        ("forever_love", "forever-love"),
        ("resiners", "resiners"),
        ("레지너스", "resiners"),
        ("pressco21", "pressco21"),
        ("프레스코", "pressco21"),
    ]

    matched_brand = None
    remainder = stem

    # 브랜드 접두사 매칭 (긴 것부터 시도)
    for prefix, brand_folder in sorted(brand_map, key=lambda x: -len(x[0])):
        if stem.lower().startswith(prefix):
            matched_brand = brand_folder
            # 브랜드 뒤의 구분자(_) 제거 후 나머지 추출
            remainder = stem[len(prefix):].lstrip("_- ")
            break

    if not matched_brand:
        # 언더바로 분리해서 첫 토큰을 브랜드로 시도
        parts = stem.split("_")
        if len(parts) >= 2:
            return VAULT_PRODUCTS / "_unsorted" / parts[0]
        return VAULT_PRODUCTS / "_unsorted"

    # 나머지에서 상품명 추출 (첫 번째 언더바 토큰)
    remainder_parts = remainder.split("_")
    product_name = remainder_parts[0] if remainder_parts[0] else "unknown"

    return VAULT_PRODUCTS / matched_brand / product_name


def get_minio_prefix(product_dir: Path) -> str:
    """vault 경로에서 MinIO 업로드 경로 생성.
    예: vault/products/pressco21/키트A → products/pressco21/키트A
    """
    try:
        rel = product_dir.relative_to(VAULT_PRODUCTS)
        return f"products/{rel}"
    except ValueError:
        return "products/_unsorted"


def process_image(image_path: Path) -> list:
    """이미지 한 장 처리: 배경 제거 + 채널별 리사이즈 + MinIO 업로드.
    업로드된 URL 목록을 반환.
    """
    log.info(f"처리 시작: {image_path.name}")
    uploaded_urls = []

    product_dir = guess_product_folder(image_path.name)
    product_dir.mkdir(parents=True, exist_ok=True)
    minio_prefix = get_minio_prefix(product_dir)

    # 원본 보관
    originals_dir = product_dir / "originals"
    originals_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(image_path, originals_dir / image_path.name)
    log.info(f"  원본 보관: originals/{image_path.name}")

    # 배경 제거
    edited_dir = product_dir / "edited"
    edited_dir.mkdir(parents=True, exist_ok=True)
    nobg_path = edited_dir / (image_path.stem + "_nobg.png")
    try:
        remove_background(image_path, nobg_path)
        # 배경 제거 이미지도 MinIO에 업로드
        url = upload_to_minio(nobg_path, f"{minio_prefix}/nobg/{nobg_path.name}")
        if url:
            uploaded_urls.append(url)
    except Exception as e:
        log.warning(f"  배경 제거 실패 (원본으로 계속): {e}")
        nobg_path = image_path

    # 채널별 리사이즈 + MinIO 업로드
    for channel, size in CHANNEL_SPECS.items():
        try:
            channel_file = resize_for_channel(nobg_path, product_dir, channel, size)
            # 채널별 이미지를 MinIO에 업로드
            url = upload_to_minio(
                channel_file,
                f"{minio_prefix}/{channel}/{channel_file.name}",
            )
            if url:
                uploaded_urls.append(url)
        except Exception as e:
            log.warning(f"  {channel} 리사이즈 실패: {e}")

    # 처리 완료 → _processed로 이동
    shutil.move(str(image_path), str(PROCESSED_DIR / image_path.name))
    log.info(f"처리 완료: {image_path.name} → {product_dir.relative_to(VAULT_PRODUCTS)}")

    if uploaded_urls:
        log.info(f"  MinIO URL ({len(uploaded_urls)}건):")
        for url in uploaded_urls:
            log.info(f"    {url}")

    return uploaded_urls


def main():
    ensure_dirs()
    images = find_new_images()

    if not images:
        log.info("처리할 이미지 없음")
        return

    log.info(f"처리 대기: {len(images)}건")
    all_urls = []
    for img in images:
        try:
            urls = process_image(img)
            all_urls.extend(urls)
        except Exception as e:
            log.error(f"처리 실패: {img.name} — {e}")
            # 실패한 파일은 그대로 둠 (다음 실행에서 재시도)

    if all_urls:
        log.info(f"총 MinIO 업로드: {len(all_urls)}건")


if __name__ == "__main__":
    main()
