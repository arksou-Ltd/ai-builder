"""AI Builder FastAPI 应用入口。

此模块为后端服务的主入口点，配置 FastAPI 应用实例和路由。
"""

from contextlib import asynccontextmanager
from typing import Any

import uvicorn
from arksou.kernel.framework.base import Result
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from api.app.core.config import settings
from api.app.core.exceptions import register_exception_handlers
from api.app.router import router as api_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> Any:
    """应用生命周期管理。

    Args:
        app: FastAPI 应用实例

    Yields:
        None
    """
    # 启动时执行
    yield
    # 关闭时执行（框架自动管理会话生命周期）


# 创建 FastAPI 应用实例
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI Builder 后端 API 服务",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# 注册框架异常处理器
register_exception_handlers(app)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册 API 路由
app.include_router(api_router, prefix=settings.api_prefix)


class HealthData(BaseModel):
    """健康检查数据模型。"""

    status: str = Field(
        default="healthy",
        description="服务状态",
    )


@app.get(
    "/health",
    tags=["系统"],
    summary="健康检查",
    description="检查服务是否正常运行，返回统一响应格式",
)
async def health_check() -> Result[HealthData]:
    """健康检查端点。

    Returns:
        Result[HealthData]: 使用框架统一响应格式的健康状态
    """
    return Result.success(data=HealthData(status="healthy"))


def main() -> None:
    """应用入口函数。

    用于 pyproject.toml 中定义的 app-api 命令行入口。
    """
    uvicorn.run(
        "api.app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )


if __name__ == "__main__":
    main()
