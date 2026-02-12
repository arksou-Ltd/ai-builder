"""rebuild_auth_and_workspace_schema

建立 auth_accounts 账号表，重建 workspace_workspaces 表（account_id 从 STRING 迁移为 BIGINT 外键 + 软删除）。
开发阶段破坏式迁移：DROP + RECREATE，不做数据兼容转换。

Revision ID: b3c4d5e6f7a8
Revises: a1b2c3d4e5f6
Create Date: 2026-02-11

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b3c4d5e6f7a8"
down_revision: Union[str, Sequence[str]] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """建立 auth_accounts，重建 workspace_workspaces。"""

    # ── 1. 创建 auth_accounts 表 ──
    op.create_table(
        "auth_accounts",
        sa.Column("id", sa.BigInteger(), nullable=False, comment="雪花主键"),
        sa.Column(
            "clerk_account_id",
            sa.String(255),
            nullable=False,
            comment="Clerk 外部身份标识",
        ),
        sa.Column("email", sa.String(320), nullable=True, comment="用户邮箱"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("created_by", sa.BigInteger(), nullable=False),
        sa.Column("updated_by", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_auth_accounts_clerk_account_id",
        "auth_accounts",
        ["clerk_account_id"],
        unique=True,
    )

    # ── 2. 删除旧 workspace_workspaces 表（开发阶段破坏式迁移） ──
    op.drop_table("workspace_workspaces")

    # ── 3. 重建 workspace_workspaces 表 ──
    op.create_table(
        "workspace_workspaces",
        sa.Column("id", sa.BigInteger(), nullable=False, comment="雪花主键"),
        sa.Column(
            "name", sa.String(50), nullable=False, comment="工作空间名称"
        ),
        sa.Column(
            "account_id",
            sa.BigInteger(),
            sa.ForeignKey("auth_accounts.id"),
            nullable=False,
            comment="所有者内部账号 ID",
        ),
        sa.Column(
            "deleted",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
            comment="软删除标记",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("created_by", sa.BigInteger(), nullable=False),
        sa.Column("updated_by", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_workspace_workspaces_name", "workspace_workspaces", ["name"])
    op.create_index(
        "ix_workspace_workspaces_deleted", "workspace_workspaces", ["deleted"]
    )

    # 部分唯一索引：仅约束未删除记录
    op.execute(
        """
        CREATE UNIQUE INDEX uq_workspace_account_name_active
        ON workspace_workspaces (account_id, name)
        WHERE deleted = false
        """
    )


def downgrade() -> None:
    """还原为旧的字符串 account_id 模型（无外键、无软删除）。"""

    # 删除重建后的表
    op.drop_table("workspace_workspaces")

    # 重建旧结构
    op.create_table(
        "workspace_workspaces",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("account_id", sa.String(255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("created_by", sa.BigInteger(), nullable=False),
        sa.Column("updated_by", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_unique_constraint(
        "uq_workspace_owner_name", "workspace_workspaces", ["account_id", "name"]
    )
    op.create_index("ix_workspace_workspaces_name", "workspace_workspaces", ["name"])

    # 删除 auth_accounts 表
    op.drop_table("auth_accounts")
