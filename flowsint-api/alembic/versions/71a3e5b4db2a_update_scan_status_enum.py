"""update_scan_status_enum

Revision ID: 71a3e5b4db2a
Revises: faceebd6a580
Create Date: 2025-06-08 16:29:38.093854

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '71a3e5b4db2a'
down_revision: Union[str, None] = 'faceebd6a580'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create the enum type first using raw SQL to ensure it exists
    op.execute("CREATE TYPE transformstatus AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')")

    # Add new columns
    op.add_column('scans', sa.Column('started_at', sa.DateTime(), nullable=True))
    op.add_column('scans', sa.Column('completed_at', sa.DateTime(), nullable=True))
    op.add_column('scans', sa.Column('error', sa.Text(), nullable=True))
    op.add_column('scans', sa.Column('details', sa.JSON(), nullable=True))
    
    # Add new status column with enum type
    op.add_column('scans', sa.Column('status_new', postgresql.ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', name='transformstatus'), nullable=True))
    
    # Copy data from old status to new status with proper casting
    op.execute("""
        UPDATE scans 
        SET status_new = CASE 
            WHEN status = 'PENDING' THEN 'PENDING'::transformstatus
            WHEN status = 'RUNNING' THEN 'RUNNING'::transformstatus
            WHEN status = 'COMPLETED' THEN 'COMPLETED'::transformstatus
            WHEN status = 'FAILED' THEN 'FAILED'::transformstatus
            ELSE 'PENDING'::transformstatus
        END
    """)
    
    # Make the new status column not nullable
    op.alter_column('scans', 'status_new', nullable=False)
    
    # Drop the old status column
    op.drop_column('scans', 'status')
    
    # Rename the new status column
    op.alter_column('scans', 'status_new', new_column_name='status')
    
    # Update other columns
    op.alter_column('scans', 'sketch_id',
               existing_type=sa.UUID(),
               nullable=False)
    op.drop_index('idx_scans_sketch_id', table_name='scans')
    op.drop_constraint('scans_sketch_id_fkey', 'scans', type_='foreignkey')
    op.create_foreign_key(None, 'scans', 'sketches', ['sketch_id'], ['id'])
    op.drop_column('scans', 'values')
    op.drop_column('scans', 'results')
    op.drop_column('scans', 'created_at')


def downgrade() -> None:
    """Downgrade schema."""
    # Add back old columns
    op.add_column('scans', sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=True))
    op.add_column('scans', sa.Column('results', postgresql.JSON(astext_type=sa.Text()), autoincrement=False, nullable=True))
    op.add_column('scans', sa.Column('values', postgresql.ARRAY(sa.TEXT()), autoincrement=False, nullable=True))
    
    # Add new VARCHAR status column
    op.add_column('scans', sa.Column('status_old', sa.String(), nullable=True))
    
    # Copy data from enum status to VARCHAR status
    op.execute("UPDATE scans SET status_old = status::VARCHAR")
    
    # Make the new status column not nullable
    op.alter_column('scans', 'status_old', nullable=False)
    
    # Drop the enum status column
    op.drop_column('scans', 'status')
    
    # Rename the new status column
    op.alter_column('scans', 'status_old', new_column_name='status')
    
    # Update other columns
    op.drop_constraint(None, 'scans', type_='foreignkey')
    op.create_foreign_key('scans_sketch_id_fkey', 'scans', 'sketches', ['sketch_id'], ['id'], onupdate='CASCADE', ondelete='CASCADE')
    op.create_index('idx_scans_sketch_id', 'scans', ['sketch_id'], unique=False)
    op.alter_column('scans', 'sketch_id',
               existing_type=sa.UUID(),
               nullable=True)
    op.drop_column('scans', 'details')
    op.drop_column('scans', 'error')
    op.drop_column('scans', 'completed_at')
    op.drop_column('scans', 'started_at')

    # Drop the enum type
    op.execute("DROP TYPE transformstatus") 