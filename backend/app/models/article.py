from datetime import datetime

from sqlalchemy import ForeignKey, String, Text, false
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin
from app.models.property import Location, PropertyType


class Article(TimestampMixin, Base):
    """Blog articles and area guides. The text is Markdown."""

    __tablename__ = "articles"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    title_en: Mapped[str] = mapped_column(String(160))
    title_ar: Mapped[str] = mapped_column(String(160), default="", server_default="")
    summary_en: Mapped[str] = mapped_column(String(300), default="", server_default="")
    summary_ar: Mapped[str] = mapped_column(String(300), default="", server_default="")
    body_en: Mapped[str] = mapped_column(Text, default="", server_default="")
    body_ar: Mapped[str] = mapped_column(Text, default="", server_default="")
    cover_key: Mapped[str | None] = mapped_column(String(255))
    # Properties of this area / category are shown below the article.
    location_id: Mapped[int | None] = mapped_column(
        ForeignKey("locations.id", ondelete="SET NULL"), index=True
    )
    type_id: Mapped[int | None] = mapped_column(
        ForeignKey("property_types.id", ondelete="SET NULL"), index=True
    )
    published: Mapped[bool] = mapped_column(default=False, server_default=false())
    published_at: Mapped[datetime | None]

    location: Mapped[Location | None] = relationship()
    type: Mapped[PropertyType | None] = relationship()
