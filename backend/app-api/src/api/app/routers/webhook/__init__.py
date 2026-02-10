"""api.app.routers.webhook - Webhook 路由模块。

提供外部 Webhook 回调端点（如 Clerk Webhook）。
"""

from api.app.routers.webhook.clerk import webhook_router

__all__: list[str] = ["webhook_router"]
