"""认证用户信息端点。

提供获取当前登录用户信息的 API。需要 Bearer token 认证。
"""

from arksou.kernel.framework.base import Result
from fastapi import APIRouter

from api.app.deps.auth import CurrentClerkAccount
from api.app.schemas.auth.account import AccountResponse
from api.app.services.auth.auth_service import AuthService

router = APIRouter()


@router.get(
    "/me",
    summary="获取当前用户信息",
    description="返回当前认证用户的基本信息。需要 Bearer token 认证，未认证返回 401。",
)
async def get_current_user(
    account: CurrentClerkAccount,
) -> Result[AccountResponse]:
    """获取当前认证用户信息。

    Args:
        account: 从 Clerk JWT 认证依赖注入的账户信息

    Returns:
        Result[AccountResponse]: 使用框架统一响应格式的当前用户信息
    """
    service = AuthService()
    response = service.get_account_info(account)
    return Result.success(data=response)
