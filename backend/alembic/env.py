"""Alembic 异步迁移环境配置。

使用 AsyncEngine 执行迁移，数据库 URL 从 DB_* 环境变量动态构建。
"""

import asyncio
import os
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# 导入 ORM 基类（autogenerate 需要 metadata）
from arksou.kernel.framework.rdbms import SnowflakeAuditableBase

# 必须导入所有模型，否则 autogenerate 检测不到表
from kernel.common.models.workspace import Workspace  # noqa: F401

config = context.config

# 从 DB_* 环境变量构建数据库 URL（与 .env 配置一致）
db_driver = os.getenv("DB_DRIVER", "postgresql+asyncpg")
db_host = os.getenv("DB_HOST", "localhost")
db_port = os.getenv("DB_PORT", "5432")
db_username = os.getenv("DB_USERNAME", "postgres")
db_password = os.getenv("DB_PASSWORD", "")
db_database = os.getenv("DB_DATABASE", "ai_builder")

database_url = f"{db_driver}://{db_username}:{db_password}@{db_host}:{db_port}/{db_database}"
config.set_main_option("sqlalchemy.url", database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = SnowflakeAuditableBase.metadata


def run_migrations_offline() -> None:
    """离线模式迁移（仅生成 SQL）。"""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """异步在线模式迁移。"""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """在线模式迁移入口。"""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
