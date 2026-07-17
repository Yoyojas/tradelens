"""watchlist_items (TL-DATA-005)

Per-user stock watchlist: unique (user_id, symbol), manual sort order,
30-symbol cap enforced at the API layer (watchlist_full).

Revision ID: 574c9acfd854
Revises: f7ef9c56edb7
Create Date: 2026-07-15 01:00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '574c9acfd854'
down_revision = 'f7ef9c56edb7'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'watchlist_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('symbol', sa.String(length=20), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'symbol', name='uq_watchlist_user_symbol'),
    )
    op.create_index('ix_watchlist_items_user_id', 'watchlist_items', ['user_id'])


def downgrade():
    op.drop_index('ix_watchlist_items_user_id', table_name='watchlist_items')
    op.drop_table('watchlist_items')
