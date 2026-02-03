"""api.app.router - API 路由模块。

按模块分组组织 API 端点。
"""

from fastapi import APIRouter

from api.app.router.auth import router as auth_router

# 主路由器
router = APIRouter()

# 注册子路由
router.include_router(auth_router, prefix="/auth", tags=["认证"])

__all__: list[str] = ["router"]
