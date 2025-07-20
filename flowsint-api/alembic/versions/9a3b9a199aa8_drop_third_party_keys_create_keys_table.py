"""drop_third_party_keys_create_keys_table

Revision ID: 9a3b9a199aa8
Revises: 0ab8ee0a782c
Create Date: 2025-07-20 12:13:27.871890

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '9a3b9a199aa8'
down_revision: Union[str, None] = '0ab8ee0a782c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop the old third_party_keys table if it exists
    op.drop_table('third_party_keys')
    
    # Create the new keys table
    op.create_table('keys',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('encrypted_key', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['profiles.id'], onupdate='CASCADE', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_keys_owner_id', 'keys', ['owner_id'], unique=False)
    op.create_index('idx_keys_service', 'keys', ['name'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop the keys table
    op.drop_index('idx_keys_service', table_name='keys')
    op.drop_index('idx_keys_owner_id', table_name='keys')
    op.drop_table('keys')
    
    # Recreate the third_party_keys table
    op.create_table('third_party_keys',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('service', sa.String(), nullable=False),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('encrypted_key', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['profiles.id'], onupdate='CASCADE', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_keys_owner_id', 'third_party_keys', ['owner_id'], unique=False)
    op.create_index('idx_keys_service', 'third_party_keys', ['service'], unique=False)
