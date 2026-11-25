from datetime import date, datetime

from sqlalchemy import Date, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class DailyCount(Base):
    """How often something happened on a day. Nothing about the visitor is kept."""

    __tablename__ = "daily_counts"

    day: Mapped[date] = mapped_column(Date, primary_key=True)
    kind: Mapped[str] = mapped_column(String(20), primary_key=True)
    code: Mapped[str] = mapped_column(String(20), primary_key=True)  # property code, or empty
    count: Mapped[int] = mapped_column(default=0, server_default="0")


class ChatQuestion(Base):
    """What the chat assistant could not answer (phone numbers and emails are hidden)."""

    __tablename__ = "chat_questions"
    __table_args__ = (UniqueConstraint("text"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    text: Mapped[str] = mapped_column(String(200))
    count: Mapped[int] = mapped_column(default=1, server_default="1")
    last_at: Mapped[datetime]
