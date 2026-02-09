"""认证依赖模块。

使用框架 create_clerk_deps() 提供 Clerk JWT 认证依赖注入。
自动完成 JWKS 验签 + 会话撤销检查。
"""

from arksou.kernel.framework.auth.clerk import ClerkAccount, create_clerk_deps

from api.app.core.config import clerk_settings
from api.app.deps.redis import get_redis_service

get_clerk_account, CurrentClerkAccount = create_clerk_deps(
    jwks_config_getter=lambda: clerk_settings.to_jwks_config(),
    redis_service_getter=get_redis_service,
)

__all__ = ["ClerkAccount", "CurrentClerkAccount", "get_clerk_account"]
