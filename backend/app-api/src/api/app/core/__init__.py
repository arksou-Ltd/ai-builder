"""api.app.core - 核心配置模块。

包含应用配置、数据库连接和异常处理器。
"""

from api.app.core.config import settings
from api.app.core.database import get_async_session
from api.app.core.exceptions import register_exception_handlers

__all__: list[str] = [
    "settings",
    "get_async_session",
    "register_exception_handlers",
]
