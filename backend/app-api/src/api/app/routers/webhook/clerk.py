"""Clerk Webhook 路由。

接收 Clerk 平台的 Webhook 回调，验证 Svix 签名后分发处理。
此端点不需要用户态认证（无 JWT），但必须通过 Svix 签名验证。
签名验证失败由框架全局异常处理器返回 401。
"""

from arksou.kernel.framework.base import Result
from fastapi import APIRouter, Request

from api.app.deps.redis import RedisServiceDep
from api.app.services.webhook.clerk_webhook_service import ClerkWebhookService

webhook_router = APIRouter(prefix="/webhooks", tags=["Webhook"])


@webhook_router.post(
    "/clerk",
    summary="Clerk Webhook 回调",
    description="接收 Clerk 平台的 Webhook 事件（session.removed 等），通过 Svix 签名验证后处理。",
)
async def clerk_webhook(
    request: Request,
    redis: RedisServiceDep,
) -> Result[None]:
    """处理 Clerk Webhook 回调。

    Args:
        request: FastAPI 请求对象
        redis: Redis 服务（框架依赖注入）

    Returns:
        Result[None]: 统一响应格式
    """
    body = await request.body()

    headers = {
        "svix-id": request.headers.get("svix-id", ""),
        "svix-timestamp": request.headers.get("svix-timestamp", ""),
        "svix-signature": request.headers.get("svix-signature", ""),
    }

    service = ClerkWebhookService(redis)
    await service.verify_and_process(body, headers)
    return Result.success(data=None)
