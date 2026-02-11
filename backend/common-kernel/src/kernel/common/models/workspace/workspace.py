"""工作空间领域模型。

定义工作空间的持久化结构。
account_id 引用 auth_accounts.id（内部雪花主键），实现业务域外键建模。
"""

from sqlalchemy import BigInteger, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from arksou.kernel.framework.rdbms import SnowflakeAuditableBase, SoftDeleteMixin


class Workspace(SoftDeleteMixin, SnowflakeAuditableBase):
    """工作空间模型。

    表示用户创建的工作空间，用于管理需求与仓库。
    数据隔离通过 account_id（内部账号主键）实现。

    Attributes:
        name: 工作空间名称，1-50 字符
        account_id: 所有者内部账号 ID（auth_accounts.id 外键）
    """

    __tablename__ = "workspace_workspaces"
    __table_args__ = (
        # 部分唯一索引：仅约束未删除记录，软删除后允许同名重建
        Index(
            "uq_workspace_account_name_active",
            "account_id",
            "name",
            unique=True,
            postgresql_where="deleted = false",
        ),
    )

    name: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    account_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("auth_accounts.id"),
        nullable=False,
    )
