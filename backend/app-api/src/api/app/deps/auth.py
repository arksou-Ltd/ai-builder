"""认证依赖模块。

提供 FastAPI 依赖项以验证和提取当前用户身份。
后续 Story 将集成 Clerk JWT 验证。
"""

from typing import Annotated

from fastapi import Depends, Header

from api.app.core.config import settings


async def get_current_account_id(
    x_account_id: Annotated[str | None, Header()] = None,
) -> str | None:
    """获取当前请求的账户 ID。

    此为预留骨架实现，后续 Story 将：
    1. 从 Authorization header 提取 JWT
    2. 使用 Clerk 验证 JWT
    3. 从 JWT claims 中提取 account_id

    安全说明：
    - x-account-id header 仅在 debug=True 时生效
    - 生产环境必须使用正式的 JWT 认证（后续 Story 实现）

    Args:
        x_account_id: 临时使用 header 传递（仅 debug 模式有效）

    Returns:
        str | None: 当前账户 ID，未认证时返回 None
    """
    # TODO: Story 2.x 集成 Clerk JWT 验证
    # 安全：仅 debug 模式允许 x-account-id header 伪认证
    if settings.debug and x_account_id:
        return x_account_id
    return None


# 类型别名，用于依赖注入
CurrentAccountId = Annotated[str | None, Depends(get_current_account_id)]
