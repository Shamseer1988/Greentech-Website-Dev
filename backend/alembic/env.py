from sqlalchemy import create_engine

from alembic import context
from app.core.config import settings
from app.models import Base

url = context.config.attributes.get("url", settings.database_url)


def run_migrations() -> None:
    engine = create_engine(url, connect_args={"connect_timeout": 5})
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=Base.metadata)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()


if context.is_offline_mode():
    raise SystemExit("Offline mode is not supported")
run_migrations()
