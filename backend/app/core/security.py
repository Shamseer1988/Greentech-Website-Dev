from datetime import UTC, datetime, timedelta
from typing import Annotated

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.models import User, UserRole

ALGORITHM = "HS256"
hasher = PasswordHasher()
# Checked when the email is unknown, so both cases take the same time.
DUMMY_HASH = hasher.hash("no such user")
bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def create_token(user: User) -> str:
    return jwt.encode(
        {
            "sub": str(user.id),
            "ver": user.token_version,
            "exp": datetime.now(UTC) + timedelta(hours=settings.login_hours),
        },
        settings.jwt_secret.get_secret_value(),
        algorithm=ALGORITHM,
    )


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(
            token,
            settings.jwt_secret.get_secret_value(),
            algorithms=[ALGORITHM],
            options={"require": ["exp", "sub"]},
        )
    except jwt.InvalidTokenError:
        return None


def current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    payload = decode_token(credentials.credentials) if credentials else None
    user = db.get(User, int(payload["sub"])) if payload else None
    # The version changes with the password or when the user is disabled: old logins stop working.
    if user is None or not user.is_active or payload.get("ver") != user.token_version:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please log in")
    return user


CurrentUser = Annotated[User, Depends(current_user)]


def require_admin(user: CurrentUser) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only an admin can do this")
    return user


AdminUser = Annotated[User, Depends(require_admin)]
