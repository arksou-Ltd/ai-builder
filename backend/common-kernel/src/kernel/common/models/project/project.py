"""项目领域模型。

定义项目（工作空间）的持久化结构。
"""

from sqlalchemy import Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from arksou.kernel.framework.rdbms import SnowflakeAuditableBase


class Project(SnowflakeAuditableBase):
    """项目模型。

    表示用户创建的工作空间（项目），用于管理需求与仓库。
    数据隔离通过 owner_clerk_id 实现（后续迁移为内部 account_id）。

    Attributes:
        name: 项目名称，1-50 字符
        owner_clerk_id: 项目所有者的 Clerk 用户标识
    """

    __tablename__ = "project_projects"
    __table_args__ = (
        UniqueConstraint("owner_clerk_id", "name", name="uq_project_owner_name"),
    )

    name: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    owner_clerk_id: Mapped[str] = mapped_column(String(255), nullable=False)
