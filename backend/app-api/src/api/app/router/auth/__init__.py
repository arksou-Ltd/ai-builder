"""api.app.router.auth - 认证模块路由。

提供用户身份认证相关的 API 端点。
"""

from fastapi import APIRouter

from api.app.router.auth.me import router as me_router

router = APIRouter()

# 注册 me 端点
router.include_router(me_router)

__all__: list[str] = ["router"]
