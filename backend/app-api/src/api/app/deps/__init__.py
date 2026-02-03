"""api.app.deps - FastAPI 依赖注入模块。

提供请求级别的依赖项，如数据库会话、认证等。
"""

from api.app.deps.auth import get_current_account_id
from api.app.deps.database import DbSession

__all__: list[str] = [
    "get_current_account_id",
    "DbSession",
]
