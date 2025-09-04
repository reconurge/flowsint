"""change content column of Log to JSON

Revision ID: 6dfa83113ad7
Revises: ba3d00e11612
Create Date: 2025-06-18 17:42:28.391884
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '6dfa83113ad7'
down_revision: Union[str, None] = 'ba3d00e11612'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Crée le nouveau type ENUM
    op.execute("""
        CREATE TYPE eventlevel AS ENUM (
            'INFO', 'WARNING', 'FAILED', 'SUCCESS', 'DEBUG',
            'PENDING', 'RUNNING', 'COMPLETED', 'GRAPH_APPEND'
        )
    """)

    # 2. Change 'logs.content' de TEXT à JSONB
    op.execute("""
        ALTER TABLE logs
        ALTER COLUMN content TYPE JSONB
        USING CASE
            WHEN content IS NULL THEN 'null'::jsonb
            ELSE content::jsonb
        END
    """)

    # 3. Supprime le DEFAULT sur logs.type
    op.execute("""
        ALTER TABLE logs ALTER COLUMN type DROP DEFAULT
    """)

    # 4. Change le type de logs.type vers le nouvel ENUM
    op.execute("""
        ALTER TABLE logs
        ALTER COLUMN type TYPE eventlevel
        USING type::eventlevel
    """)

    # 5. Réapplique le DEFAULT avec le bon type
    op.execute("""
        ALTER TABLE logs ALTER COLUMN type SET DEFAULT 'INFO'
    """)

    # 6. Change scans.status vers le même ENUM
    op.execute("""
        ALTER TABLE scans
        ALTER COLUMN status TYPE eventlevel
        USING status::text::eventlevel
    """)



def downgrade() -> None:
    """Downgrade schema."""
    # 1. Revert 'scans.status' to old ENUM type
    op.execute("""
        ALTER TABLE scans
        ALTER COLUMN status TYPE transformstatus
        USING status::text::transformstatus
    """)

    # 2. Revert 'logs.type' back to VARCHAR
    op.execute("""
        ALTER TABLE logs
        ALTER COLUMN type TYPE VARCHAR
        USING type::text
    """)

    # 3. Revert 'logs.content' back to TEXT
    op.execute("""
        ALTER TABLE logs
        ALTER COLUMN content TYPE TEXT
        USING content::text
    """)

    # 4. Drop the new ENUM type
    op.execute("DROP TYPE eventlevel")
