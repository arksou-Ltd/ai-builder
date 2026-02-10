"""api.app.routers - API 路由模块。

按模块分组组织 API 端点，统一使用 /api/v1 前缀。
"""

from fastapi import APIRouter

from api.app.routers.auth import router as auth_router
from api.app.routers.webhook import webhook_router
from api.app.routers.workspace.workspace_router import router as workspace_router

# 主路由器（携带 API 版本前缀）
router = APIRouter(prefix="/api/v1")

# 注册子路由
router.include_router(auth_router, prefix="/auth", tags=["认证"])
router.include_router(webhook_router)
router.include_router(workspace_router, prefix="/workspaces", tags=["工作空间"])

__all__: list[str] = ["router"]
