"""工作空间领域模型。

定义工作空间的持久化结构。
"""

from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from arksou.kernel.framework.rdbms import SnowflakeAuditableBase


class Workspace(SnowflakeAuditableBase):
    """工作空间模型。

    表示用户创建的工作空间，用于管理需求与仓库。
    数据隔离通过 owner_clerk_id 实现（后续迁移为内部 account_id）。

    Attributes:
        name: 工作空间名称，1-50 字符
        owner_clerk_id: 工作空间所有者的 Clerk 用户标识
    """

    __tablename__ = "workspace_workspaces"
    __table_args__ = (
        UniqueConstraint("owner_clerk_id", "name", name="uq_workspace_owner_name"),
    )

    name: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    owner_clerk_id: Mapped[str] = mapped_column(String(255), nullable=False)
