from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.core.security import (
    DUMMY_HASH,
    CurrentUser,
    create_token,
    hash_password,
    verify_password,
)
from app.models import User
from app.schemas.admin import LoginIn, LoginOut, PasswordIn, UserOut
from app.services.rate_limit import RateLimiter

router = APIRouter(tags=["login"])
Db = Annotated[Session, Depends(get_db)]

WINDOW = 15 * 60
# Wrong passwords allowed in 15 minutes. The per-email limit also holds when
# somebody tries from many addresses.
per_visitor = RateLimiter(5, WINDOW)
per_email = RateLimiter(20, WINDOW)


def login_reply(user: User) -> LoginOut:
    return LoginOut(
        token=create_token(user),
        expires_in=settings.login_hours * 3600,
        user=UserOut.build(user),
    )


@router.post("/auth/login")
def login(data: LoginIn, request: Request, db: Db) -> LoginOut:
    email = data.email.strip().lower()
    visitor = request.client.host if request.client else "unknown"
    keys = ((per_visitor, f"{visitor}|{email}"), (per_email, email))
    wait = max(limiter.waiting(key) for limiter, key in keys)
    if wait:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Too many attempts. Please try again in 15 minutes.",
            headers={"Retry-After": str(wait)},
        )
    user = None if "\x00" in email else db.scalar(select(User).where(User.email == email))
    good = verify_password(user.password_hash if user else DUMMY_HASH, data.password)
    if user is None or not good or not user.is_active:
        for limiter, key in keys:
            limiter.check(key)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong email or password")
    return login_reply(user)


@router.get("/admin/me")
def me(user: CurrentUser) -> UserOut:
    return UserOut.build(user)


@router.post("/auth/password")
def change_password(data: PasswordIn, user: CurrentUser, db: Db) -> LoginOut:
    key = f"password|{user.id}"
    if per_visitor.waiting(key):
        raise HTTPException(429, "Too many attempts. Please try again in 15 minutes.")
    if not verify_password(user.password_hash, data.current_password):
        per_visitor.check(key)
        raise HTTPException(422, "The current password is wrong")
    user.password_hash = hash_password(data.new_password)
    user.token_version += 1
    db.commit()
    return login_reply(user)
