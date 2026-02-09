"""Clerk Webhook 处理服务。

使用框架 SvixWebhookVerifier 验签，SessionRevocation 管理会话撤销。
"""

import json

from arksou.kernel.framework.auth.session import SessionRevocation
from arksou.kernel.framework.cache import RedisService
from arksou.kernel.framework.logging import get_logger
from arksou.kernel.framework.webhook import SvixWebhookVerifier

from api.app.core.config import clerk_settings

logger = get_logger(__name__)


class ClerkWebhookService:
    """Clerk Webhook 处理服务。

    职责：
    1. Svix 签名验证（框架 SvixWebhookVerifier）
    2. 事件类型分发
    3. session.removed 处理：使用框架 SessionRevocation 撤销会话
    4. 结构化日志输出
    """

    def __init__(self, redis_service: RedisService) -> None:
        """初始化服务。

        Args:
            redis_service: Redis 服务实例（框架依赖注入提供）
        """
        self._verifier = SvixWebhookVerifier(clerk_settings.webhook_secret)
        self._revocation = SessionRevocation(redis_service)

    async def verify_and_process(
        self,
        body: bytes,
        headers: dict[str, str],
    ) -> None:
        """验证签名并处理 webhook 事件。

        Args:
            body: 原始请求体（bytes）
            headers: 请求头字典

        Raises:
            UnauthorizedException: 签名验证失败
        """
        # 框架验签（失败自动抛出 UnauthorizedException）
        self._verifier.verify(body, headers)

        # 解析事件
        payload = json.loads(body)
        event_type = payload.get("type", "")

        logger.info("Clerk webhook 收到事件", event_type=event_type)

        # 事件分发
        if event_type == "session.removed":
            await self._handle_session_removed(payload)
        elif event_type.startswith("user."):
            await self._handle_user_event(event_type, payload)
        else:
            logger.info("Clerk webhook 未处理的事件类型", event_type=event_type)

    async def _handle_session_removed(self, payload: dict) -> None:
        """处理 session.removed 事件。

        使用框架 SessionRevocation 写入撤销标记。
        幂等保证：重复事件只是覆盖写入同一个键，不产生额外副作用。

        Args:
            payload: Webhook 事件 payload
        """
        data = payload.get("data", {})
        session_id = data.get("id", "")
        clerk_user_id = data.get("user_id", "")
        timestamp = payload.get("timestamp")

        if not session_id:
            logger.warning("session.removed 事件缺少 session id", payload=payload)
            return

        # 使用框架 SessionRevocation 撤销会话
        await self._revocation.revoke(session_id)

        logger.info(
            "会话已撤销",
            event_type="logout",
            account_id=None,
            clerk_user_id=clerk_user_id,
            session_id=session_id,
            enterprise_id=None,
            workspace_id=None,
            timestamp=timestamp,
        )

    async def _handle_user_event(self, event_type: str, payload: dict) -> None:
        """处理 user.* 事件（预留扩展点）。

        Args:
            event_type: 事件类型
            payload: Webhook 事件 payload
        """
        logger.info("Clerk webhook user 事件（暂未处理）", event_type=event_type)
