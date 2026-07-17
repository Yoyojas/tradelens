"""broker_connections + sync_runs (TL-DATA-004)

broker_connections: one saved broker link per (user, provider). The Flex
token is stored ONLY encrypted (Fernet, key from the FLEX_TOKEN_KEY secret);
token_mask keeps the last 4 characters for display. sync_runs: one row per
sync attempt (initial / manual / scheduled), pruned after 90 days.

Revision ID: f7ef9c56edb7
Revises: 1bdf8c94ad63
Create Date: 2026-07-15 00:40:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f7ef9c56edb7'
down_revision = '1bdf8c94ad63'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'broker_connections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('provider', sa.String(length=30), nullable=False),
        sa.Column('connection_type', sa.String(length=20), nullable=False),
        sa.Column('encrypted_token', sa.Text(), nullable=False),
        sa.Column('token_mask', sa.String(length=8), nullable=False),
        sa.Column('query_id', sa.String(length=40), nullable=False),
        sa.Column('date_format', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('next_sync_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'provider', name='uq_broker_conn_user_provider'),
    )
    op.create_index('ix_broker_connections_user_id', 'broker_connections', ['user_id'])

    op.create_table(
        'sync_runs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('connection_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('kind', sa.String(length=16), nullable=False),
        sa.Column('status', sa.String(length=12), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('added', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('skipped', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('failed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('error_code', sa.String(length=40), nullable=True),
        sa.ForeignKeyConstraint(['connection_id'], ['broker_connections.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_sync_runs_connection_id', 'sync_runs', ['connection_id'])
    op.create_index('ix_sync_runs_user_id', 'sync_runs', ['user_id'])


def downgrade():
    op.drop_index('ix_sync_runs_user_id', table_name='sync_runs')
    op.drop_index('ix_sync_runs_connection_id', table_name='sync_runs')
    op.drop_table('sync_runs')
    op.drop_index('ix_broker_connections_user_id', table_name='broker_connections')
    op.drop_table('broker_connections')
