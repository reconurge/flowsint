"""add enricher_templates table

Revision ID: a1b2c3d4e5f6
Revises: 8173aba964e7
Create Date: 2025-01-31

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c9d8e7f6a5b4"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "enricher_templates",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("version", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("content", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("owner_id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["owner_id"], ["profiles.id"], onupdate="CASCADE", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_enricher_templates_owner_id",
        "enricher_templates",
        ["owner_id"],
        unique=False,
    )
    op.create_index(
        "idx_enricher_templates_name", "enricher_templates", ["name"], unique=False
    )
    op.create_index(
        "idx_enricher_templates_category",
        "enricher_templates",
        ["category"],
        unique=False,
    )
    op.create_index(
        "idx_enricher_templates_is_public",
        "enricher_templates",
        ["is_public"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("idx_enricher_templates_is_public", table_name="enricher_templates")
    op.drop_index("idx_enricher_templates_category", table_name="enricher_templates")
    op.drop_index("idx_enricher_templates_name", table_name="enricher_templates")
    op.drop_index("idx_enricher_templates_owner_id", table_name="enricher_templates")
    op.drop_table("enricher_templates")
