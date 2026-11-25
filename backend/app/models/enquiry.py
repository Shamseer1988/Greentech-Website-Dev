from datetime import datetime
from enum import StrEnum

from sqlalchemy import ForeignKey, Index, String, Text, false
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, str_enum
from app.models.property import Property
from app.models.user import User


class EnquiryStatus(StrEnum):
    NEW = "new"
    CONTACTED = "contacted"
    CLOSED = "closed"


# Choices of the enquiry form that are not a category.
OTHER_WISHES = ("list-my-property", "other")


class Enquiry(TimestampMixin, Base):
    __tablename__ = "enquiries"
    __table_args__ = (Index("ix_enquiries_status_created_at", "status", "created_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    property_id: Mapped[int | None] = mapped_column(
        ForeignKey("properties.id", ondelete="SET NULL"), index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    company: Mapped[str] = mapped_column(String(160), default="", server_default="")
    phone: Mapped[str] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(254))
    looking_for: Mapped[str | None] = mapped_column(String(60))  # a category, or OTHER_WISHES
    area: Mapped[str] = mapped_column(String(120), default="", server_default="")
    space_needed: Mapped[str] = mapped_column(String(120), default="", server_default="")
    message: Mapped[str] = mapped_column(Text, default="", server_default="")
    reply_on_whatsapp: Mapped[bool] = mapped_column(default=False, server_default=false())
    status: Mapped[EnquiryStatus] = mapped_column(
        str_enum(EnquiryStatus, "status"),
        default=EnquiryStatus.NEW,
        server_default=EnquiryStatus.NEW.value,
    )
    # Where the visitor came from, e.g. "google" or "instagram".
    source: Mapped[str] = mapped_column(String(40), default="", server_default="")
    first_response_at: Mapped[datetime | None]
    assigned_to_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )

    property: Mapped[Property | None] = relationship()
    assigned_to: Mapped[User | None] = relationship()
