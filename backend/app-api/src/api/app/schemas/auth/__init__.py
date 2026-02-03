"""api.app.schemas.auth - 认证模块 Schema。

提供认证相关的请求/响应数据结构。
"""

from api.app.schemas.auth.account import AccountResponse

__all__: list[str] = ["AccountResponse"]
