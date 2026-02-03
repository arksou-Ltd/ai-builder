"""认证用户信息端点。

提供获取当前登录用户信息的 API。
"""

from fastapi import APIRouter

from api.app.deps.auth import CurrentAccountId
from api.app.schema.auth.account import AccountResponse
from api.app.service.auth.auth_service import AuthService

router = APIRouter()


@router.get(
    "/me",
    response_model=AccountResponse,
    summary="获取当前用户信息",
    description="返回当前认证用户的基本信息。如未认证则返回空用户信息。",
)
async def get_current_user(
    account_id: CurrentAccountId,
) -> AccountResponse:
    """获取当前认证用户信息。

    Args:
        account_id: 从认证依赖注入的账户 ID

    Returns:
        AccountResponse: 当前用户信息
    """
    service = AuthService()
    return await service.get_account_info(account_id)
