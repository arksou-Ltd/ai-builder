"""AI Builder FastAPI 应用入口。

使用框架 create_app() 工厂创建应用，自动配置：
- lifespan 管理（Redis 连接池、日志、ID 生成器）
- CORS 中间件
- 请求日志中间件
- 全局异常处理器
- /health 健康检查端点
"""

import uvicorn
from arksou.kernel.framework.app import create_app

from api.app.core.config import settings
from api.app.routers import router as api_router

# 使用框架工厂创建 FastAPI 应用
app = create_app(
    settings,
    routers=[api_router],
    version=settings.app_version,
    description="AI Builder 后端 API 服务",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)


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
