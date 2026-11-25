from datetime import date
from enum import StrEnum

from sqlalchemy import Date, ForeignKey, Index, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, str_enum
from app.models.property import Property
from app.models.user import User


class ViewingStatus(StrEnum):
    REQUESTED = "requested"
    CONFIRMED = "confirmed"
    DONE = "done"
    CANCELLED = "cancelled"


class Viewing(TimestampMixin, Base):
    __tablename__ = "viewings"
    __table_args__ = (
        # One visit at a time per property.
        Index(
            "uq_viewings_slot",
            "property_id",
            "day",
            "time",
            unique=True,
            postgresql_where=text("status IN ('requested', 'confirmed')"),
        ),
        Index("ix_viewings_day", "day"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    property_id: Mapped[int | None] = mapped_column(
        ForeignKey("properties.id", ondelete="SET NULL"), index=True
    )
    day: Mapped[date] = mapped_column(Date)
    time: Mapped[str] = mapped_column(String(5))  # "09:30", Qatar time
    name: Mapped[str] = mapped_column(String(120))
    company: Mapped[str] = mapped_column(String(160), default="", server_default="")
    phone: Mapped[str] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(254))
    people: Mapped[int | None]
    note: Mapped[str] = mapped_column(Text, default="", server_default="")
    language: Mapped[str] = mapped_column(String(2), default="en", server_default="en")
    source: Mapped[str] = mapped_column(String(40), default="", server_default="")
    status: Mapped[ViewingStatus] = mapped_column(
        str_enum(ViewingStatus, "status"),
        default=ViewingStatus.REQUESTED,
        server_default=ViewingStatus.REQUESTED.value,
    )
    assigned_to_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )

    property: Mapped[Property | None] = relationship()
    assigned_to: Mapped[User | None] = relationship()
