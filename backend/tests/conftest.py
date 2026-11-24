"""Tests use a separate database (greentech_test), never the development one."""

from pathlib import Path

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from alembic import command
from app.api import enquiries
from app.core.config import settings
from app.core.db import get_db
from app.main import app
from app.models import Base
from app.scripts.seed import seed
from app.services.storage import get_storage

TEST_DB = "greentech_test"
KEY = "test-key"


class FakeStorage:
    def __init__(self):
        self.files = {}

    def save(self, key, file, content_type):
        self.files[key] = (file.read(), content_type)

    def delete(self, key):
        self.files.pop(key, None)


@pytest.fixture(scope="session")
def alembic_config():
    config = Config(Path(__file__).parents[1] / "alembic.ini")
    config.attributes["url"] = settings.database_url.set(database=TEST_DB)
    return config


@pytest.fixture(scope="session")
def engine(alembic_config):
    admin = create_engine(settings.database_url, isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        conn.execute(text(f"DROP DATABASE IF EXISTS {TEST_DB} WITH (FORCE)"))
        conn.execute(text(f"CREATE DATABASE {TEST_DB}"))
    command.upgrade(alembic_config, "head")
    test_engine = create_engine(settings.database_url.set(database=TEST_DB))
    yield test_engine
    test_engine.dispose()
    with admin.connect() as conn:
        conn.execute(text(f"DROP DATABASE {TEST_DB} WITH (FORCE)"))
    admin.dispose()


@pytest.fixture
def db(engine):
    with sessionmaker(bind=engine, expire_on_commit=False)() as session:
        tables = ", ".join(t.name for t in Base.metadata.sorted_tables)
        session.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
        session.commit()
        seed(session, samples=True)
        yield session


@pytest.fixture
def storage():
    return FakeStorage()


@pytest.fixture
def client(db, storage, engine, monkeypatch):
    make_session = sessionmaker(bind=engine, expire_on_commit=False)

    def test_db():
        with make_session() as session:
            yield session

    monkeypatch.setattr(settings, "admin_api_key", SecretStr(KEY))
    enquiries.limiter._hits.clear()
    app.dependency_overrides = {get_db: test_db, get_storage: lambda: storage}
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides = {}
