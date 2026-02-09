"""数据库会话依赖模块。

使用框架 get_async_session 提供 FastAPI 依赖项以注入数据库会话。
"""

from typing import Annotated

from arksou.kernel.framework.rdbms import get_async_session
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

# 类型别名，用于依赖注入
DbSession = Annotated[AsyncSession, Depends(get_async_session)]

__all__ = ["DbSession", "get_async_session"]
