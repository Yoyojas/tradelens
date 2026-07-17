"""user_profiles (TL-FEAT-008 onboarding)

One row per user: onboarding answers + completion state. Users existing at
upgrade time are backfilled with is_legacy=true — the client shows them a
one-time skippable intro instead of the mandatory flow (skip marks complete).
No sensitive fields (income / net worth / risk tolerance) by design.

Revision ID: 1bdf8c94ad63
Revises: 039c5b72c6da
Create Date: 2026-07-15 00:02:23.002743

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1bdf8c94ad63'
down_revision = '039c5b72c6da'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'user_profiles',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('experience', sa.String(length=20), nullable=True),
        sa.Column('account_types', sa.JSON(), nullable=True),
        sa.Column('primary_broker', sa.String(length=40), nullable=True),
        sa.Column('assets', sa.JSON(), nullable=True),
        sa.Column('goals', sa.JSON(), nullable=True),
        sa.Column('referral_source', sa.String(length=40), nullable=True),
        sa.Column('onboarding_completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('current_step', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_legacy', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('user_id'),
    )
    # Accounts that predate onboarding get the skippable-legacy treatment.
    op.execute(
        'INSERT INTO user_profiles (user_id, is_legacy) '
        'SELECT id, true FROM users'
    )


def downgrade():
    op.drop_table('user_profiles')
