"""broker_sync_devices + portfolio/position_snapshots (TL-DATA-006)

Device tokens: only a SHA-256 hash is stored (token_hint keeps the last 4
characters for display); revocable (revoked_at) and expirable (expires_at).
Snapshots: pushed by the local agent over HTTPS; retention = the last
snapshot of each day, 30 days back (pruned on push). (device_id, nonce)
unique = the anti-replay backstop.

Revision ID: 37d4dfa8a113
Revises: 574c9acfd854
Create Date: 2026-07-15 02:00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '37d4dfa8a113'
down_revision = '574c9acfd854'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'broker_sync_devices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=60), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('token_hint', sa.String(length=8), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token_hash', name='uq_sync_devices_token_hash'),
    )
    op.create_index('ix_broker_sync_devices_user_id', 'broker_sync_devices', ['user_id'])

    op.create_table(
        'portfolio_snapshots',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('device_id', sa.Integer(), nullable=False),
        sa.Column('nonce', sa.String(length=64), nullable=False),
        sa.Column('captured_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('received_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column('base_currency', sa.String(length=10), nullable=False),
        sa.Column('summary', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['device_id'], ['broker_sync_devices.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('device_id', 'nonce', name='uq_snapshot_device_nonce'),
    )
    op.create_index('ix_portfolio_snapshots_user_id', 'portfolio_snapshots', ['user_id'])

    op.create_table(
        'position_snapshots',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('snapshot_id', sa.Integer(), nullable=False),
        sa.Column('symbol', sa.String(length=20), nullable=False),
        sa.Column('quantity', sa.Numeric(18, 4), nullable=False),
        sa.Column('avg_cost', sa.Numeric(18, 4), nullable=True),
        sa.Column('currency', sa.String(length=10), nullable=False),
        sa.Column('sec_type', sa.String(length=10), nullable=False),
        sa.ForeignKeyConstraint(['snapshot_id'], ['portfolio_snapshots.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_position_snapshots_snapshot_id', 'position_snapshots', ['snapshot_id'])


def downgrade():
    op.drop_index('ix_position_snapshots_snapshot_id', table_name='position_snapshots')
    op.drop_table('position_snapshots')
    op.drop_index('ix_portfolio_snapshots_user_id', table_name='portfolio_snapshots')
    op.drop_table('portfolio_snapshots')
    op.drop_index('ix_broker_sync_devices_user_id', table_name='broker_sync_devices')
    op.drop_table('broker_sync_devices')
