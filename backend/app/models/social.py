from datetime import datetime
from enum import StrEnum

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, str_enum
from app.models.user import User


class SocialNetwork(StrEnum):
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"


class SocialPost(Base):
    """What was posted, so the same property is not posted twice by mistake."""

    __tablename__ = "social_posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    property_id: Mapped[int] = mapped_column(
        ForeignKey("properties.id", ondelete="CASCADE"), index=True
    )
    network: Mapped[SocialNetwork] = mapped_column(str_enum(SocialNetwork, "network"))
    post_id: Mapped[str] = mapped_column(String(120))
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    user: Mapped[User | None] = relationship()
