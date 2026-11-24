from functools import lru_cache
from io import BytesIO

from PIL import Image, ImageOps

from app.models import MediaKind, Property
from app.services.storage import Storage

# Facebook, WhatsApp and Instagram all accept this size.
SIZE = (1200, 630)


def cover_key(prop: Property) -> str | None:
    images = [m for m in prop.media if m.kind == MediaKind.IMAGE]
    cover = next((m for m in images if m.is_cover), images[0] if images else None)
    return cover.object_key if cover else None


@lru_cache(maxsize=64)
def share_jpeg(storage: Storage, key: str) -> bytes:
    """The cover photo as JPG (Instagram does not accept WebP)."""
    with Image.open(BytesIO(storage.read(key))) as image:
        result = ImageOps.fit(image.convert("RGB"), SIZE, Image.Resampling.LANCZOS)
    out = BytesIO()
    result.save(out, "JPEG", quality=82, optimize=True)
    return out.getvalue()
