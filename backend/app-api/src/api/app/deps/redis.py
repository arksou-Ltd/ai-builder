"""Redis 服务依赖模块。

使用框架 create_redis_deps() 提供 RedisService 依赖注入。
"""

from arksou.kernel.framework.cache import create_redis_deps

get_redis_service, RedisServiceDep = create_redis_deps()

__all__ = ["get_redis_service", "RedisServiceDep"]
