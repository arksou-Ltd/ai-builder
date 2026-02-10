"""rename_owner_clerk_id_to_account_id

Revision ID: a1b2c3d4e5f6
Revises: 4f80ff980593
Create Date: 2026-02-11

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str]] = '4f80ff980593'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """将 owner_clerk_id 列重命名为 account_id，更新唯一约束。"""
    # 删除旧唯一约束
    op.drop_constraint('uq_workspace_owner_name', 'workspace_workspaces', type_='unique')

    # 重命名列
    op.alter_column('workspace_workspaces', 'owner_clerk_id', new_column_name='account_id')

    # 重建唯一约束（使用新列名）
    op.create_unique_constraint('uq_workspace_owner_name', 'workspace_workspaces', ['account_id', 'name'])


def downgrade() -> None:
    """将 account_id 列还原为 owner_clerk_id。"""
    op.drop_constraint('uq_workspace_owner_name', 'workspace_workspaces', type_='unique')
    op.alter_column('workspace_workspaces', 'account_id', new_column_name='owner_clerk_id')
    op.create_unique_constraint('uq_workspace_owner_name', 'workspace_workspaces', ['owner_clerk_id', 'name'])
