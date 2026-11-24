"""Create an admin, or set a new password for an existing one.

Run:  python -m app.scripts.create_admin
"""

import getpass
import sys

from pydantic import ValidationError
from sqlalchemy import select

from app.core.db import SessionLocal
from app.core.security import hash_password
from app.models import User, UserRole
from app.schemas.admin import UserIn


def main() -> None:
    email = input("Email: ").strip()
    name = input("Full name: ").strip()
    password = getpass.getpass("Password (at least 10 characters, not shown): ")
    if password != getpass.getpass("Password again: "):
        sys.exit("The passwords are different. Nothing was changed.")
    try:
        data = UserIn(email=email, full_name=name, password=password, role=UserRole.ADMIN)
    except ValidationError as exc:
        for error in exc.errors():
            print(f"{error['loc'][0]}: {error['msg']}")
        sys.exit("Nothing was changed.")

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == data.email))
        if user is None:
            user = User(email=data.email, token_version=0)
            db.add(user)
            done = "created"
        else:
            user.token_version += 1
            done = "updated"
        user.full_name = data.full_name
        user.role = UserRole.ADMIN
        user.is_active = True
        user.password_hash = hash_password(data.password)
        db.commit()
    print(f"Admin {data.email} {done}. Log in at http://localhost:3000/admin")


if __name__ == "__main__":
    main()
