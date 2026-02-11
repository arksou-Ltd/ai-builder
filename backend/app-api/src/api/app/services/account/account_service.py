"""账号业务服务。

负责 Clerk 外部身份 → 内部 account 的映射与落库。
AuthService 保持认证信息展示职责，AccountService 负责身份映射。
"""

from __future__ import annotations

import structlog
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from kernel.common.models.auth import Account

logger = structlog.get_logger(__name__)


class AccountService:
    """账号服务类。

    处理 Clerk 外部身份到内部 account 的解析与创建。
    """

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def resolve_or_create_by_clerk_id(
        self, clerk_account_id: str, email: str | None = None
    ) -> int:
        """解析或创建内部账号，返回内部 account_id。

        并发安全：对同一 clerk_account_id 的并发创建使用
        IntegrityError 后回查策略，避免竞态失败。

        Args:
            clerk_account_id: Clerk 外部身份标识
            email: 用户邮箱（可选，用于新建时记录）

        Returns:
            int: 内部账号 ID（auth_accounts.id 雪花主键）
        """
        # 1. 尝试查询已有账号
        stmt = select(Account).where(
            Account.clerk_account_id == clerk_account_id
        )
        result = await self._db.execute(stmt)
        account = result.scalar_one_or_none()

        if account is not None:
            return account.id

        # 2. 不存在则创建
        new_account = Account(
            clerk_account_id=clerk_account_id,
            email=email,
        )
        self._db.add(new_account)

        try:
            await self._db.flush()
        except IntegrityError:
            # 并发竞态：其他请求已创建，回滚后重新查询
            await self._db.rollback()
            logger.info(
                "account_concurrent_create_fallback",
                clerk_account_id=clerk_account_id,
            )
            result = await self._db.execute(stmt)
            account = result.scalar_one_or_none()
            if account is not None:
                return account.id
            # 极端情况：仍然查不到，向上抛异常
            raise  # noqa: TRY201

        await self._db.refresh(new_account)

        logger.info(
            "account_created",
            account_id=new_account.id,
            clerk_account_id=clerk_account_id,
        )

        return new_account.id
