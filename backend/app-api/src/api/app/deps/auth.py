"""认证依赖模块。

提供 FastAPI 依赖项以验证和提取当前用户身份。
后续 Story 将集成 Clerk JWT 验证。
"""

from typing import Annotated

from fastapi import Depends, Header


async def get_current_account_id(
    x_account_id: Annotated[str | None, Header()] = None,
) -> str | None:
    """获取当前请求的账户 ID。

    此为预留骨架实现，后续 Story 将：
    1. 从 Authorization header 提取 JWT
    2. 使用 Clerk 验证 JWT
    3. 从 JWT claims 中提取 account_id

    Args:
        x_account_id: 临时使用 header 传递（仅开发用途）

    Returns:
        str | None: 当前账户 ID，未认证时返回 None
    """
    # TODO: Story 2.x 集成 Clerk JWT 验证
    return x_account_id


# 类型别名，用于依赖注入
CurrentAccountId = Annotated[str | None, Depends(get_current_account_id)]
