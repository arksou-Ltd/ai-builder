"""数据库会话依赖模块。

使用框架能力提供 FastAPI 依赖项以注入数据库会话。
"""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.app.core.database import get_async_session

# 类型别名，用于依赖注入
DbSession = Annotated[AsyncSession, Depends(get_async_session)]
