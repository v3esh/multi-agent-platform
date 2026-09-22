"""Initial schema - all tables matching SQLAlchemy models

Revision ID: 0001_initial
Revises: 
Create Date: 2026-09-14

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # user table
    op.create_table(
        'user',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('email', sa.String(), nullable=False, index=True, unique=True),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_superuser', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

    # agent table
    op.create_table(
        'agent',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('name', sa.String(), nullable=False, index=True),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('status', sa.String(), default='active'),
        sa.Column('active_window', sa.String(), nullable=True),
        sa.Column('frequency_limit', sa.Integer(), default=10),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

    # persona table
    op.create_table(
        'persona',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('personality', sa.Text(), nullable=False),
        sa.Column('interests', sa.Text(), nullable=True),
        sa.Column('communication_style', sa.Text(), nullable=True),
        sa.Column('behavior', sa.Text(), nullable=True),
        sa.Column('agent_id', sa.Integer(), sa.ForeignKey('agent.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

    # redditaccount table
    op.create_table(
        'redditaccount',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('agent_id', sa.Integer(), sa.ForeignKey('agent.id'), nullable=False),
        sa.Column('reddit_username', sa.String(), nullable=False),
        sa.Column('access_token', sa.Text(), nullable=True),
        sa.Column('refresh_token', sa.Text(), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

    # approval table
    op.create_table(
        'approval',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('agent_id', sa.Integer(), sa.ForeignKey('agent.id'), nullable=True),
        sa.Column('action_type', sa.String(), nullable=False),
        sa.Column('proposed_content', sa.Text(), nullable=False),
        sa.Column('status', sa.String(), default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

    # activitylog table
    op.create_table(
        'activitylog',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('agent_id', sa.Integer(), sa.ForeignKey('agent.id'), nullable=True),
        sa.Column('action_type', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # auditlog table
    op.create_table(
        'auditlog',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=True),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # permissionprofile table
    op.create_table(
        'permissionprofile',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('name', sa.String(), nullable=False, unique=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # permission table
    op.create_table(
        'permission',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('profile_id', sa.Integer(), sa.ForeignKey('permissionprofile.id'), nullable=True),
        sa.Column('action_type', sa.String(), nullable=False),
        sa.Column('requires_approval', sa.Boolean(), default=True),
        sa.Column('daily_limit', sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('permission')
    op.drop_table('permissionprofile')
    op.drop_table('auditlog')
    op.drop_table('activitylog')
    op.drop_table('approval')
    op.drop_table('redditaccount')
    op.drop_table('persona')
    op.drop_table('agent')
    op.drop_table('user')
