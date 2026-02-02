"""add description to enricher_templates

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2025-01-31

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add description column to enricher_templates table."""
    op.add_column('enricher_templates', sa.Column('description', sa.Text(), nullable=True))


def downgrade() -> None:
    """Remove description column from enricher_templates table."""
    op.drop_column('enricher_templates', 'description')
