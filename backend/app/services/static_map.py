"""A small map picture with a pin, made from OpenStreetMap tiles."""

import logging
import math
from functools import lru_cache
from io import BytesIO

import httpx
from PIL import Image, ImageDraw

logger = logging.getLogger(__name__)
TILE = 256
ZOOM = 15
AGENT = "real-estate-brochure/1.0"


@lru_cache(maxsize=128)
def map_picture(lat: float, lng: float, width: int, height: int) -> bytes:
    """PNG. Raises when the map service is not available (a failure is not remembered)."""
    scale = TILE * 2**ZOOM
    x = (lng + 180) / 360 * scale
    sin = math.sin(math.radians(lat))
    y = (0.5 - math.log((1 + sin) / (1 - sin)) / (4 * math.pi)) * scale
    left, top = x - width / 2, y - height / 2
    picture = Image.new("RGB", (width, height), "#e7ece6")
    with httpx.Client(timeout=4, headers={"User-Agent": AGENT}) as client:
        for tx in range(int(left // TILE), int((left + width) // TILE) + 1):
            for ty in range(int(top // TILE), int((top + height) // TILE) + 1):
                reply = client.get(f"https://tile.openstreetmap.org/{ZOOM}/{tx}/{ty}.png")
                reply.raise_for_status()
                with Image.open(BytesIO(reply.content)) as tile:
                    picture.paste(
                        tile.convert("RGB"), (round(tx * TILE - left), round(ty * TILE - top))
                    )
    draw = ImageDraw.Draw(picture)
    cx, cy = width // 2, height // 2
    draw.polygon([(cx - 11, cy - 20), (cx + 11, cy - 20), (cx, cy)], fill="#1F7A52")
    draw.ellipse((cx - 14, cy - 42, cx + 14, cy - 14), fill="#1F7A52", outline="white", width=3)
    draw.ellipse((cx - 5, cy - 33, cx + 5, cy - 23), fill="white")
    out = BytesIO()
    picture.save(out, "PNG")
    return out.getvalue()


def safe_map(lat: float, lng: float, width: int, height: int) -> bytes | None:
    try:
        return map_picture(lat, lng, width, height)
    except Exception:
        logger.warning("No map for the brochure", exc_info=True)
        return None
