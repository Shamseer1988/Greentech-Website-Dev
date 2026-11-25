"""property type images"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = '3b9d52c7a1f4'
down_revision: str | None = 'eb7d8343f628'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('property_types', sa.Column('image_key', sa.String(length=255), nullable=True))
    op.add_column(
        'property_types',
        sa.Column('image_opacity', sa.Integer(), server_default='50', nullable=False),
    )
    op.create_check_constraint(
        'image_opacity_range', 'property_types', 'image_opacity BETWEEN 10 AND 100'
    )


def downgrade() -> None:
    op.drop_constraint('image_opacity_range', 'property_types', type_='check')
    op.drop_column('property_types', 'image_opacity')
    op.drop_column('property_types', 'image_key')
