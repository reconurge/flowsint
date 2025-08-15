"""rename_transforms_to_flows

Revision ID: 661ff8ef4425
Revises: 9a3b9a199aa8
Create Date: 2025-08-15 16:16:12.792775

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '661ff8ef4425'
down_revision: Union[str, None] = '9a3b9a199aa8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Rename the table from 'transforms' to 'flows'
    op.rename_table('transforms', 'flows')
    
    # Rename the column from 'transform_schema' to 'flow_schema'
    op.alter_column('flows', 'transform_schema', new_column_name='flow_schema')


def downgrade() -> None:
    """Downgrade schema."""
    # Rename the column back from 'flow_schema' to 'transform_schema'
    op.alter_column('flows', 'flow_schema', new_column_name='transform_schema')
    
    # Rename the table back from 'flows' to 'transforms'
    op.rename_table('flows', 'transforms')
