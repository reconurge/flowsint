"""make column types portable (JSONB->JSON, ARRAY->JSON/TEXT)

Revision ID: a1b2c3d4e5f6
Revises: 8173aba964e7
Create Date: 2026-02-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "8173aba964e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. logs.content: JSONB -> JSON
    op.execute("ALTER TABLE logs ALTER COLUMN content TYPE JSON USING content::text::json")

    # 2. custom_types.schema: JSONB -> JSON
    op.execute(
        'ALTER TABLE custom_types ALTER COLUMN "schema" TYPE JSON USING "schema"::text::json'
    )

    # 3. flows.category: ARRAY(Text) -> JSON
    op.execute(
        """
        ALTER TABLE flows ALTER COLUMN category TYPE JSON
        USING CASE
            WHEN category IS NULL THEN NULL
            ELSE array_to_json(category)
        END
        """
    )

    # 4. investigation_user_roles.roles: ARRAY(role_enum) -> TEXT (JSON string)
    # Convert PostgreSQL enum array like {OWNER,EDITOR} to JSON string like '["owner","editor"]'
    op.execute(
        """
        ALTER TABLE investigation_user_roles ALTER COLUMN roles TYPE TEXT
        USING CASE
            WHEN roles IS NULL THEN '[]'
            ELSE lower(array_to_json(roles::text[])::text)
        END
        """
    )

    # Remove the server_default that used PostgreSQL array literal '{}'
    op.alter_column("investigation_user_roles", "roles", server_default=None)

    # Drop the role_enum type (no longer needed)
    op.execute("DROP TYPE IF EXISTS role_enum")


def downgrade() -> None:
    # Recreate the role_enum type
    op.execute("CREATE TYPE role_enum AS ENUM ('OWNER', 'EDITOR', 'VIEWER')")

    # 4. investigation_user_roles.roles: TEXT -> ARRAY(role_enum)
    # Use a temp column to avoid subquery restriction in USING
    op.execute("ALTER TABLE investigation_user_roles ADD COLUMN roles_tmp role_enum[]")
    op.execute(
        """
        UPDATE investigation_user_roles SET roles_tmp = CASE
            WHEN roles IS NULL OR roles = '[]' THEN '{}'::role_enum[]
            ELSE (
                SELECT array_agg(upper(elem)::role_enum)
                FROM json_array_elements_text(roles::json) AS elem
            )
        END
        """
    )
    op.execute("ALTER TABLE investigation_user_roles DROP COLUMN roles")
    op.execute("ALTER TABLE investigation_user_roles RENAME COLUMN roles_tmp TO roles")
    op.alter_column(
        "investigation_user_roles", "roles", server_default=sa.text("'{}'")
    )

    # 3. flows.category: JSON -> ARRAY(Text)
    # Use a temp column to avoid subquery restriction in USING
    op.execute("ALTER TABLE flows ADD COLUMN category_tmp TEXT[]")
    op.execute(
        """
        UPDATE flows SET category_tmp = CASE
            WHEN category IS NULL THEN NULL
            ELSE (
                SELECT array_agg(elem::text)
                FROM json_array_elements_text(category::json) AS elem
            )
        END
        """
    )
    op.execute("ALTER TABLE flows DROP COLUMN category")
    op.execute("ALTER TABLE flows RENAME COLUMN category_tmp TO category")

    # 2. custom_types.schema: JSON -> JSONB
    op.execute(
        'ALTER TABLE custom_types ALTER COLUMN "schema" TYPE JSONB USING "schema"::jsonb'
    )

    # 1. logs.content: JSON -> JSONB
    op.execute("ALTER TABLE logs ALTER COLUMN content TYPE JSONB USING content::jsonb")
