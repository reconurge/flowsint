"""merge portable column types and enricher templates

Revision ID: f5fae279ec04
Revises: b2c3d4e5f6a7, c9d8e7f6a5b4
Create Date: 2026-02-07 18:00:18.801891

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f5fae279ec04'
down_revision: Union[str, None] = ('b2c3d4e5f6a7', 'c9d8e7f6a5b4')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
