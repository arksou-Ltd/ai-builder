"""认证服务模块。

提供用户认证相关的业务逻辑处理。
"""

from api.app.schemas.auth.account import AccountResponse


class AuthService:
    """认证服务类。

    处理用户身份验证和账户信息获取。
    """

    async def get_account_info(
        self,
        account_id: str | None,
    ) -> AccountResponse:
        """获取账户信息。

        Args:
            account_id: 账户 ID，未认证时为 None

        Returns:
            AccountResponse: 账户信息响应
        """
        if account_id is None:
            return AccountResponse(
                id=None,
                is_authenticated=False,
                display_name=None,
                email=None,
            )

        # TODO: 后续 Story 从数据库查询账户信息
        return AccountResponse(
            id=account_id,
            is_authenticated=True,
            display_name=f"User-{account_id[:8]}",
            email=None,
        )
