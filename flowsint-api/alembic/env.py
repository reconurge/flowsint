import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# Permet les imports comme from flowsint_core.core.models.base import Base
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

# Importer Base et toutes les tables pour qu'Alembic les détecte
from flowsint_core.core.models import *  # noqa

# Configuration Alembic
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Injecter l'URL de la BDD depuis le .env
database_url = os.getenv("DATABASE_URL")
if not database_url:
    raise RuntimeError("DATABASE_URL is not defined in .env")
config.set_main_option("sqlalchemy.url", database_url)

# Définir la métadonnée cible pour autogenerate
target_metadata = Base.metadata


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
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
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
