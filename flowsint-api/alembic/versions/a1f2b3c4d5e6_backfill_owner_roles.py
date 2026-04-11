"""backfill owner roles for existing investigations

Revision ID: a1f2b3c4d5e6
Revises: bac5764d4496
Create Date: 2026-04-11 00:00:00.000000

"""
from typing import Sequence, Union
from uuid import uuid4

from alembic import op
import sqlalchemy as sa
import json

# revision identifiers, used by Alembic.
revision: str = "a1f2b3c4d5e6"
down_revision: Union[str, None] = "bac5764d4496"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Insert OWNER role entry for every investigation that lacks one."""
    conn = op.get_bind()

    # Find investigations with no entry in investigation_user_roles
    rows = conn.execute(
        sa.text(
            """
            SELECT i.id, i.owner_id
            FROM investigations i
            LEFT JOIN investigation_user_roles r
                ON r.investigation_id = i.id AND r.user_id = i.owner_id
            WHERE r.id IS NULL
              AND i.owner_id IS NOT NULL
            """
        )
    ).fetchall()

    for inv_id, owner_id in rows:
        conn.execute(
            sa.text(
                """
                INSERT INTO investigation_user_roles (id, user_id, investigation_id, roles)
                VALUES (:id, :user_id, :investigation_id, :roles)
                """
            ),
            {
                "id": str(uuid4()),
                "user_id": str(owner_id),
                "investigation_id": str(inv_id),
                "roles": json.dumps(["owner"]),
            },
        )


def downgrade() -> None:
    """No-op: we don't remove the backfilled rows."""
    pass
