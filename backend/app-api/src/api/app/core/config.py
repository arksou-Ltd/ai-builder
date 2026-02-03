"""应用配置模块。

使用 pydantic-settings 管理环境变量和应用配置。
"""

from functools import lru_cache
from typing import Literal

from pydantic import PostgresDsn, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置类。

    从环境变量加载配置，支持 .env 文件。
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # 应用基本配置
    app_name: str = "AI Builder API"
    app_version: str = "0.1.0"
    debug: bool = False
    environment: Literal["development", "staging", "production"] = "development"

    # API 配置
    api_prefix: str = "/api/v1"

    # 数据库配置
    # 注意：生产环境必须通过环境变量设置，默认值仅供本地开发
    database_host: str = "localhost"
    database_port: int = 5432
    database_user: str = "postgres"
    database_password: str = ""  # 必须通过 DATABASE_PASSWORD 环境变量设置
    database_name: str = "ai_builder"

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

    # CORS 配置
    cors_origins: list[str] = ["http://localhost:3000"]

    # 日志配置
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    """获取缓存的配置实例。"""
    return Settings()


settings = get_settings()
