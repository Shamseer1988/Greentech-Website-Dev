"""editable categories and home page"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = '8e41f0a6b2d7'
down_revision: str | None = '3b9d52c7a1f4'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# The texts that were fixed in the website until now.
OLD = [
    ('labour-accommodation', 'bed',
     'Staff camps and worker rooms with kitchens, washrooms and bus parking.',
     'مجمعات سكنية وغرف عمال مع مطابخ ودورات مياه ومواقف حافلات.'),
    ('warehouse', 'warehouse', 'Storage, stores & open yards', 'تخزين ومخازن وساحات مفتوحة'),
    ('cafeteria', 'cup', 'Ready food-outlet units', 'وحدات جاهزة للمطاعم'),
    ('supermarket-shop', 'cart', 'Retail units near camps',
     'وحدات تجارية بالقرب من سكن العمال'),
    ('residential', 'home', 'Flats & villas in Doha', 'شقق وفلل في الدوحة'),
]
LOOKING_FOR = (
    "looking_for IN ('labour-accommodation', 'warehouse', 'cafeteria', 'supermarket-shop', "
    "'residential', 'list-my-property', 'other')"
)


def upgrade() -> None:
    op.add_column('property_types', sa.Column('text_en', sa.String(length=200), server_default='', nullable=False))
    op.add_column('property_types', sa.Column('text_ar', sa.String(length=200), server_default='', nullable=False))
    op.add_column('property_types', sa.Column('icon', sa.String(length=30), server_default='warehouse', nullable=False))
    op.add_column('property_types', sa.Column('is_active', sa.Boolean(), server_default=sa.true(), nullable=False))
    update = sa.text('UPDATE property_types SET icon = :icon, text_en = :en, text_ar = :ar WHERE slug = :slug')
    for slug, icon, en, ar in OLD:
        op.get_bind().execute(update, {'slug': slug, 'icon': icon, 'en': en, 'ar': ar})

    # Categories are no longer a fixed list.
    op.drop_constraint('looking_for', 'enquiries', type_='check')
    op.alter_column('enquiries', 'looking_for', type_=sa.String(length=60), existing_type=sa.String(length=32))

    op.create_table(
        'site_settings',
        sa.Column('key', sa.String(length=40), nullable=False),
        sa.Column('value', postgresql.JSONB(), nullable=False),
        sa.PrimaryKeyConstraint('key', name=op.f('pk_site_settings')),
    )
    op.create_table(
        'hero_images',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('object_key', sa.String(length=255), nullable=False),
        sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_hero_images')),
        sa.UniqueConstraint('object_key', name=op.f('uq_hero_images_object_key')),
    )


def downgrade() -> None:
    op.drop_table('hero_images')
    op.drop_table('site_settings')
    op.execute(f"UPDATE enquiries SET looking_for = 'other' WHERE NOT ({LOOKING_FOR})")
    op.alter_column('enquiries', 'looking_for', type_=sa.String(length=32), existing_type=sa.String(length=60))
    op.create_check_constraint('looking_for', 'enquiries', LOOKING_FOR)
    for name in ('is_active', 'icon', 'text_ar', 'text_en'):
        op.drop_column('property_types', name)
