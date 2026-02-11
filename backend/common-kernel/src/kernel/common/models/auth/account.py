"""账号领域模型。

定义系统内部账号的持久化结构，作为用户域根实体。
外部身份（Clerk）通过 clerk_account_id 映射到内部 account。
"""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from arksou.kernel.framework.rdbms import SnowflakeAuditableBase


class Account(SnowflakeAuditableBase):
    """系统内部账号模型。

    作为用户域根实体，所有业务域外键指向此表。
    通过 clerk_account_id 与外部 Clerk 身份系统建立映射。

    Attributes:
        clerk_account_id: Clerk 外部身份标识（唯一）
        email: 用户邮箱
    """

    __tablename__ = "auth_accounts"

    clerk_account_id: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True
    )
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
