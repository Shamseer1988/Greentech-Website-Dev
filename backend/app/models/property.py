from datetime import datetime
from enum import StrEnum

from sqlalchemy import CheckConstraint, Float, ForeignKey, Index, String, Text, false, text, true
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, str_enum


class PropertyStatus(StrEnum):
    DRAFT = "draft"
    AVAILABLE = "available"
    RESERVED = "reserved"
    RENTED = "rented"


class MediaKind(StrEnum):
    IMAGE = "image"
    VIDEO = "video"
    PANORAMA = "360"


class PropertyType(Base):
    __tablename__ = "property_types"
    __table_args__ = (
        CheckConstraint("image_opacity BETWEEN 10 AND 100", name="image_opacity_range"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(60), unique=True)
    name_en: Mapped[str] = mapped_column(String(80))
    name_ar: Mapped[str] = mapped_column(String(80))
    sort_order: Mapped[int] = mapped_column(default=0, server_default="0")
    coming_soon: Mapped[bool] = mapped_column(default=False, server_default=false())
    text_en: Mapped[str] = mapped_column(String(200), default="", server_default="")
    text_ar: Mapped[str] = mapped_column(String(200), default="", server_default="")
    icon: Mapped[str] = mapped_column(String(30), default="warehouse", server_default="warehouse")
    is_active: Mapped[bool] = mapped_column(default=True, server_default=true())
    # Background photo of the card on the home page.
    image_key: Mapped[str | None] = mapped_column(String(255))
    image_opacity: Mapped[int] = mapped_column(default=50, server_default="50")


class Location(Base):
    __tablename__ = "locations"
    __table_args__ = (
        CheckConstraint("lat BETWEEN -90 AND 90", name="lat_range"),
        CheckConstraint("lng BETWEEN -180 AND 180", name="lng_range"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(60), unique=True)
    name_en: Mapped[str] = mapped_column(String(80))
    name_ar: Mapped[str] = mapped_column(String(80))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    description_en: Mapped[str] = mapped_column(Text, default="", server_default="")
    description_ar: Mapped[str] = mapped_column(Text, default="", server_default="")
    sort_order: Mapped[int] = mapped_column(default=0, server_default="0")
    is_active: Mapped[bool] = mapped_column(default=True, server_default=true())


class Property(TimestampMixin, Base):
    __tablename__ = "properties"
    __table_args__ = (
        CheckConstraint("code = upper(code)", name="code_upper"),
        CheckConstraint("rent_qar >= 0", name="rent_positive"),
        CheckConstraint("rooms >= 0", name="rooms_positive"),
        CheckConstraint("capacity_persons >= 0", name="capacity_positive"),
        CheckConstraint("area_sqm >= 0", name="area_positive"),
        CheckConstraint("lat BETWEEN -90 AND 90", name="lat_range"),
        CheckConstraint("lng BETWEEN -180 AND 180", name="lng_range"),
        Index("ix_properties_status_published_at", "status", "published_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True)
    title_en: Mapped[str] = mapped_column(String(160))
    title_ar: Mapped[str] = mapped_column(String(160), default="", server_default="")
    description_en: Mapped[str] = mapped_column(Text, default="", server_default="")
    description_ar: Mapped[str] = mapped_column(Text, default="", server_default="")
    type_id: Mapped[int] = mapped_column(
        ForeignKey("property_types.id", ondelete="RESTRICT"), index=True
    )
    location_id: Mapped[int] = mapped_column(
        ForeignKey("locations.id", ondelete="RESTRICT"), index=True
    )
    status: Mapped[PropertyStatus] = mapped_column(
        str_enum(PropertyStatus, "status"),
        default=PropertyStatus.DRAFT,
        server_default=PropertyStatus.DRAFT.value,
    )
    rent_qar: Mapped[int | None]  # per month; empty = "price on request"
    rooms: Mapped[int | None]
    capacity_persons: Mapped[int | None]
    area_sqm: Mapped[float | None] = mapped_column(Float)
    floors: Mapped[int | None]
    amenities: Mapped[list[str]] = mapped_column(
        ARRAY(String(80)), default=list, server_default=text("'{}'")
    )
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    national_address: Mapped[str] = mapped_column(String(200), default="", server_default="")
    featured: Mapped[bool] = mapped_column(default=False, server_default=false())
    published_at: Mapped[datetime | None]

    type: Mapped[PropertyType] = relationship()
    location: Mapped[Location] = relationship()
    media: Mapped[list["PropertyMedia"]] = relationship(
        back_populates="property",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="(PropertyMedia.sort_order, PropertyMedia.id)",
    )


class PropertyMedia(Base):
    __tablename__ = "property_media"
    __table_args__ = (
        # At most one cover photo per property.
        Index(
            "uq_property_media_cover", "property_id", unique=True, postgresql_where=text("is_cover")
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    property_id: Mapped[int] = mapped_column(
        ForeignKey("properties.id", ondelete="CASCADE"), index=True
    )
    # The file's key in the bucket. The full URL is built from MEDIA_PUBLIC_URL,
    # so moving to another domain needs no database change.
    object_key: Mapped[str] = mapped_column(String(255), unique=True)
    kind: Mapped[MediaKind] = mapped_column(str_enum(MediaKind, "kind"))
    width: Mapped[int | None]
    height: Mapped[int | None]
    sort_order: Mapped[int] = mapped_column(default=0, server_default="0")
    is_cover: Mapped[bool] = mapped_column(default=False, server_default=false())

    property: Mapped[Property] = relationship(back_populates="media")
