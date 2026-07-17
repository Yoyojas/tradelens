"""tags user scope (TL-FEAT-006, plan A)

tags.user_id: NULL = shared template (admin-curated, visible to everyone),
set = private to that user. The single global UNIQUE(label) becomes two
partial unique indexes — shared domain (label WHERE user_id IS NULL) and
user domain ((user_id, label) WHERE user_id IS NOT NULL) — so different
users may own the same label without colliding with the shared set.
Existing rows keep user_id NULL and land in the shared domain unchanged.

Revision ID: 039c5b72c6da
Revises: 66024fdca78e
Create Date: 2026-07-14 23:41:37.690929

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '039c5b72c6da'
down_revision = '66024fdca78e'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('tags', sa.Column('user_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_tags_user_id_users', 'tags', 'users', ['user_id'], ['id']
    )
    op.create_index('ix_tags_user_id', 'tags', ['user_id'])
    op.drop_constraint('tags_label_key', 'tags', type_='unique')
    op.create_index(
        'uq_tags_shared_label',
        'tags',
        ['label'],
        unique=True,
        postgresql_where=sa.text('user_id IS NULL'),
    )
    op.create_index(
        'uq_tags_user_label',
        'tags',
        ['user_id', 'label'],
        unique=True,
        postgresql_where=sa.text('user_id IS NOT NULL'),
    )


def downgrade():
    # Restoring the single global UNIQUE(label) cannot keep user-owned tags:
    # they may collide with the shared domain or with each other. The faithful
    # reverse of this feature is to remove them (and their trade_tags links).
    # Shared tags — the entire pre-upgrade dataset — are untouched, so
    # upgrade → downgrade → upgrade replays cleanly.
    op.execute(
        'DELETE FROM trade_tags WHERE tag_id IN '
        '(SELECT id FROM tags WHERE user_id IS NOT NULL)'
    )
    op.execute('DELETE FROM tags WHERE user_id IS NOT NULL')
    op.drop_index('uq_tags_user_label', table_name='tags')
    op.drop_index('uq_tags_shared_label', table_name='tags')
    op.create_unique_constraint('tags_label_key', 'tags', ['label'])
    op.drop_index('ix_tags_user_id', table_name='tags')
    op.drop_constraint('fk_tags_user_id_users', 'tags', type_='foreignkey')
    op.drop_column('tags', 'user_id')
