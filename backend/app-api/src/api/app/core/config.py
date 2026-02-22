"""应用配置模块。

使用框架 BaseAppSettings 管理通用配置，ClerkSettings 管理 Clerk 认证配置。
数据库配置由框架 RDBMS 模块通过 DB_* 环境变量自动管理，无需在此声明。
"""

from functools import lru_cache
from pathlib import Path

from arksou.kernel.framework.app import BaseAppSettings
from arksou.kernel.framework.auth.clerk import ClerkSettings
from pydantic import Field

# 固定读取 backend/.env，避免受启动工作目录影响。
BACKEND_ENV_FILE = Path(__file__).resolve().parents[5] / ".env"


class Settings(BaseAppSettings):
    """应用配置类。

    继承框架 BaseAppSettings，自动获得 redis_*、cors_* 等通用配置。
    仅需声明应用特有的配置项。
    数据库配置由 create_db_deps() 通过 DB_* 环境变量自动读取。
    """

    # 应用配置（BaseAppSettings 已提供 app_name, app_env, debug）
    app_version: str = Field(default="0.1.0", description="应用版本")
    api_prefix: str = Field(default="/api/v1", description="API 路由前缀")

    # 日志配置
    log_level: str = Field(default="INFO", description="日志级别")


@lru_cache
def get_settings() -> Settings:
    """获取缓存的应用配置实例。"""
    return Settings(_env_file=BACKEND_ENV_FILE)


@lru_cache
def get_clerk_settings() -> ClerkSettings:
    """获取缓存的 Clerk 配置实例。"""
    return ClerkSettings(_env_file=BACKEND_ENV_FILE)


settings = get_settings()
clerk_settings = get_clerk_settings()
