"""add_third_party_keys_table

Revision ID: a566d0f57af1
Revises: e403a4152f6b
Create Date: 2025-06-22 22:43:53.031994

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a566d0f57af1'
down_revision: Union[str, None] = 'e403a4152f6b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create third_party_keys table
    op.create_table('third_party_keys',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('service', sa.String(), nullable=False),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('encrypted_key', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['profiles.id'], onupdate='CASCADE', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_keys_owner_id', 'third_party_keys', ['owner_id'], unique=False)
    op.create_index('idx_keys_service', 'third_party_keys', ['service'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes
    op.drop_index('idx_keys_service', table_name='third_party_keys')
    op.drop_index('idx_keys_owner_id', table_name='third_party_keys')
    
    # Drop table
    op.drop_table('third_party_keys')
