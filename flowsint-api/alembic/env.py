import os
import sys
from logging.config import fileConfig

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool

load_dotenv()

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from flowsint_core.core.models import *

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

database_url = os.getenv("DATABASE_URL")
if not database_url:
    raise RuntimeError("DATABASE_URL is not defined in .env")
config.set_main_option("sqlalchemy.url", database_url)

# Base comes from the `import *` above (models.py isn't py.typed, so mypy
# can't see it) — same standard Alembic autogenerate pattern noted there.
target_metadata = Base.metadata  # type: ignore[name-defined]


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # config_ini_section always resolves to a real section for this
    # project's alembic.ini — standard alembic-generated boilerplate,
    # not narrowed further upstream either.
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),  # type: ignore[arg-type]
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
