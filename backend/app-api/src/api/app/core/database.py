"""数据库连接模块。

使用框架能力提供异步数据库会话管理。
禁止重复实现 - 直接使用框架提供的 get_async_session。
"""

from arksou.kernel.framework.rdbms import get_async_session

__all__ = ["get_async_session"]
