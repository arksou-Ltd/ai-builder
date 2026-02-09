"""应用配置模块。

使用框架 BaseAppSettings 管理通用配置，ClerkSettings 管理 Clerk 认证配置。
"""

from functools import lru_cache

from arksou.kernel.framework.app import BaseAppSettings
from arksou.kernel.framework.auth.clerk import ClerkSettings
from pydantic import Field, PostgresDsn, computed_field


class Settings(BaseAppSettings):
    """应用配置类。

    继承框架 BaseAppSettings，自动获得 redis_*、cors_* 等通用配置。
    仅需声明应用特有的配置项。
    """

    # 应用配置（BaseAppSettings 已提供 app_name, app_env, debug）
    app_version: str = Field(default="0.1.0", description="应用版本")
    api_prefix: str = Field(default="/api/v1", description="API 路由前缀")

    # 数据库配置（框架不含 DB 配置，需自行声明）
    database_host: str = Field(default="localhost", description="数据库主机")
    database_port: int = Field(default=5432, description="数据库端口")
    database_user: str = Field(default="postgres", description="数据库用户")
    database_password: str = Field(default="", description="数据库密码")
    database_name: str = Field(default="ai_builder", description="数据库名称")

    @computed_field  # type: ignore[prop-decorator]
    @property
    def database_url(self) -> str:
        """构建完整的数据库连接字符串。"""
        return str(
            PostgresDsn.build(
                scheme="postgresql+asyncpg",
                username=self.database_user,
                password=self.database_password,
                host=self.database_host,
                port=self.database_port,
                path=self.database_name,
            )
        )

    # 日志配置
    log_level: str = Field(default="INFO", description="日志级别")


@lru_cache
def get_settings() -> Settings:
    """获取缓存的应用配置实例。"""
    return Settings()


@lru_cache
def get_clerk_settings() -> ClerkSettings:
    """获取缓存的 Clerk 配置实例。"""
    return ClerkSettings()


settings = get_settings()
clerk_settings = get_clerk_settings()
