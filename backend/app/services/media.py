import io
from dataclasses import dataclass
from typing import BinaryIO

from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps

MAX_IMAGE_BYTES = 20 * 1024 * 1024
# Cloudflare's free plan refuses requests above 100 MB.
MAX_VIDEO_BYTES = 95 * 1024 * 1024
MAX_PIXELS = 60_000_000
PHOTO_SIDE = 2000
CARD_SIDE = 1400
HERO_SIDE = 2400
PANORAMA_SIDE = 6000


class MediaError(Exception):
    """The uploaded file is not acceptable. The message is shown to the user."""


@dataclass
class WebP:
    file: BinaryIO
    width: int
    height: int


def to_webp(source: BinaryIO, max_side: int) -> WebP:
    """Resize, rotate correctly, and drop hidden data such as the photo's GPS position."""
    try:
        with Image.open(source, formats=("JPEG", "PNG", "WEBP")) as img:
            if img.width * img.height > MAX_PIXELS:
                raise MediaError("The image is too large (maximum 60 megapixels)")
            img.draft("RGB", (max_side * 2, max_side * 2))
            upright = ImageOps.exif_transpose(img)
            has_alpha = upright.mode in ("RGBA", "LA", "PA") or "transparency" in upright.info
            result = upright.convert("RGBA" if has_alpha else "RGB")
    except MediaError:
        raise
    except (OSError, ValueError, SyntaxError, Image.DecompressionBombError) as exc:
        raise MediaError("Upload a valid JPG, PNG or WebP image") from exc

    result.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    result.info.clear()
    out = io.BytesIO()
    result.save(out, "WEBP", quality=82, method=4)
    out.seek(0)
    return WebP(out, result.width, result.height)


def read_photo(file: UploadFile, max_side: int) -> WebP:
    """Check and convert one uploaded photo."""
    if (file.size or 0) > MAX_IMAGE_BYTES:
        limit = MAX_IMAGE_BYTES // 1024 // 1024
        raise HTTPException(413, f"File is too large (maximum {limit} MB)")
    try:
        return to_webp(file.file, max_side)
    except MediaError as exc:
        raise HTTPException(422, str(exc)) from exc


def video_type(source: BinaryIO) -> tuple[str, str]:
    """Return (extension, content type) by looking at the file itself, not its name."""
    head = source.read(12)
    source.seek(0)
    if head[4:8] == b"ftyp" and head[8:12] != b"qt  ":
        return "mp4", "video/mp4"
    if head[:4] == b"\x1a\x45\xdf\xa3":
        return "webm", "video/webm"
    raise MediaError("Upload an MP4 or WebM video")
