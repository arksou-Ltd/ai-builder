"""认证服务模块。

提供用户认证相关的业务逻辑处理。
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from api.app.schemas.auth.account import AccountResponse

if TYPE_CHECKING:
    from arksou.kernel.framework.auth.clerk import ClerkAccount


class AuthService:
    """认证服务类。

    处理账户信息获取（框架已保证认证通过）。
    """

    def get_account_info(self, account: ClerkAccount) -> AccountResponse:
        """获取账户信息。

        Args:
            account: 框架 ClerkAccount（已通过 JWT 认证）

        Returns:
            AccountResponse: 账户信息响应
        """
        # 使用 ClerkAccount 中的丰富字段
        display_name = self._build_display_name(account)

        # TODO: 后续 Story 从数据库查询 Account 信息并关联 clerk_account_id
        return AccountResponse(
            id=account.clerk_account_id,
            display_name=display_name,
            email=account.email,
        )

    @staticmethod
    def _build_display_name(account: ClerkAccount) -> str:
        """构建显示名称。

        优先使用 first_name + last_name，其次使用 email，最后使用 ID 前缀。
        """
        if account.first_name or account.last_name:
            parts = [account.first_name, account.last_name]
            return " ".join(p for p in parts if p)

        if account.email:
            return account.email.split("@")[0]

        return f"User-{account.clerk_account_id[:8]}"
