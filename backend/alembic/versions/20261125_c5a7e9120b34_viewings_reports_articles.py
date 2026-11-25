"""viewings, reports and articles"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = 'c5a7e9120b34'
down_revision: str | None = '8e41f0a6b2d7'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('enquiries', sa.Column('source', sa.String(length=40), server_default='', nullable=False))
    op.add_column('enquiries', sa.Column('first_response_at', sa.DateTime(timezone=True), nullable=True))
    op.create_table(
        'viewings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('property_id', sa.Integer(), nullable=True),
        sa.Column('day', sa.Date(), nullable=False),
        sa.Column('time', sa.String(length=5), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('company', sa.String(length=160), server_default='', nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=False),
        sa.Column('email', sa.String(length=254), nullable=True),
        sa.Column('people', sa.Integer(), nullable=True),
        sa.Column('note', sa.Text(), server_default='', nullable=False),
        sa.Column('language', sa.String(length=2), server_default='en', nullable=False),
        sa.Column('source', sa.String(length=40), server_default='', nullable=False),
        sa.Column('status', sa.Enum('requested', 'confirmed', 'done', 'cancelled', name='status', native_enum=False, create_constraint=True, length=32), server_default='requested', nullable=False),
        sa.Column('assigned_to_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['users.id'], name=op.f('fk_viewings_assigned_to_id_users'), ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id'], name=op.f('fk_viewings_property_id_properties'), ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_viewings')),
    )
    op.create_index(op.f('ix_viewings_property_id'), 'viewings', ['property_id'])
    op.create_index(op.f('ix_viewings_assigned_to_id'), 'viewings', ['assigned_to_id'])
    op.create_index('ix_viewings_day', 'viewings', ['day'])
    op.create_index('uq_viewings_slot', 'viewings', ['property_id', 'day', 'time'], unique=True, postgresql_where=sa.text("status IN ('requested', 'confirmed')"))
    op.create_table(
        'daily_counts',
        sa.Column('day', sa.Date(), nullable=False),
        sa.Column('kind', sa.String(length=20), nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('count', sa.Integer(), server_default='0', nullable=False),
        sa.PrimaryKeyConstraint('day', 'kind', 'code', name=op.f('pk_daily_counts')),
    )
    op.create_table(
        'chat_questions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('text', sa.String(length=200), nullable=False),
        sa.Column('count', sa.Integer(), server_default='1', nullable=False),
        sa.Column('last_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_chat_questions')),
        sa.UniqueConstraint('text', name=op.f('uq_chat_questions_text')),
    )
    op.create_table(
        'articles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('slug', sa.String(length=80), nullable=False),
        sa.Column('title_en', sa.String(length=160), nullable=False),
        sa.Column('title_ar', sa.String(length=160), server_default='', nullable=False),
        sa.Column('summary_en', sa.String(length=300), server_default='', nullable=False),
        sa.Column('summary_ar', sa.String(length=300), server_default='', nullable=False),
        sa.Column('body_en', sa.Text(), server_default='', nullable=False),
        sa.Column('body_ar', sa.Text(), server_default='', nullable=False),
        sa.Column('cover_key', sa.String(length=255), nullable=True),
        sa.Column('location_id', sa.Integer(), nullable=True),
        sa.Column('type_id', sa.Integer(), nullable=True),
        sa.Column('published', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], name=op.f('fk_articles_location_id_locations'), ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['type_id'], ['property_types.id'], name=op.f('fk_articles_type_id_property_types'), ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_articles')),
        sa.UniqueConstraint('slug', name=op.f('uq_articles_slug')),
    )
    op.create_index(op.f('ix_articles_location_id'), 'articles', ['location_id'])
    op.create_index(op.f('ix_articles_type_id'), 'articles', ['type_id'])


def downgrade() -> None:
    for table in ('articles', 'chat_questions', 'daily_counts', 'viewings'):
        op.drop_table(table)
    op.drop_column('enquiries', 'first_response_at')
    op.drop_column('enquiries', 'source')
