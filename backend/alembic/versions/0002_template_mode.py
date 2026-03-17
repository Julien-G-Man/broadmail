"""add mode column to email_templates

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-17 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'email_templates',
        sa.Column('mode', sa.String(), nullable=False, server_default='text'),
    )


def downgrade() -> None:
    op.drop_column('email_templates', 'mode')
