"""数据库会话依赖模块。

使用框架 create_db_deps 一行创建数据库依赖。
配置通过 DB_* 环境变量自动读取（参见 .env）。
"""

from arksou.kernel.framework.rdbms import create_db_deps

# 使用框架工厂函数创建依赖，默认 PostgreSQL + asyncpg
get_db, DbSession = create_db_deps()

__all__ = ["DbSession", "get_db"]
