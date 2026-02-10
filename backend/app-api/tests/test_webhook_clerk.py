"""Clerk Webhook 集成测试。

测试优先级（按 Story D1→D4）：
D1. Svix 签名校验测试
D2. session.removed 正常处理测试
D3. Redis 撤销键写入与 TTL 测试
D4. 重复事件幂等测试

严禁使用 Mock/Stub/Fake，所有测试必须使用真实依赖。
使用 .env 中配置的真实 Redis 服务。
使用 Svix Webhook 类生成真实签名。
"""

import datetime
import json
from collections.abc import AsyncGenerator
from typing import Any

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from redis.asyncio import Redis
from svix.webhooks import Webhook

# 测试用 Svix 签名密钥
TEST_WEBHOOK_SECRET = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw"


def _build_signed_request(
    payload: dict[str, Any],
    secret: str = TEST_WEBHOOK_SECRET,
) -> tuple[str, dict[str, str]]:
    """使用真实 Svix 签名构建 webhook 请求体和 headers。

    Args:
        payload: 事件 payload 字典
        secret: Svix 签名密钥

    Returns:
        (body_str, headers_dict) 元组
    """
    wh = Webhook(secret)
    body_str = json.dumps(payload)
    msg_id = f"msg_{payload.get('type', 'unknown')}_{id(payload)}"
    ts = datetime.datetime.now(tz=datetime.timezone.utc)
    signature = wh.sign(msg_id, ts, body_str)

    headers = {
        "svix-id": msg_id,
        "svix-timestamp": str(int(ts.timestamp())),
        "svix-signature": signature,
        "content-type": "application/json",
    }
    return body_str, headers


def _build_signed_raw_request(
    raw_body: str,
    secret: str = TEST_WEBHOOK_SECRET,
) -> tuple[str, dict[str, str]]:
    """使用真实 Svix 签名构建任意 raw body 的 webhook 请求。

    用于测试非标准 body（null、空字符串、数组等）的边界情况。

    Args:
        raw_body: 原始请求体字符串
        secret: Svix 签名密钥

    Returns:
        (body_str, headers_dict) 元组
    """
    wh = Webhook(secret)
    msg_id = f"msg_raw_{id(raw_body)}"
    ts = datetime.datetime.now(tz=datetime.timezone.utc)
    signature = wh.sign(msg_id, ts, raw_body)

    headers = {
        "svix-id": msg_id,
        "svix-timestamp": str(int(ts.timestamp())),
        "svix-signature": signature,
        "content-type": "application/json",
    }
    return raw_body, headers


@pytest_asyncio.fixture
async def client(monkeypatch) -> AsyncGenerator[AsyncClient, None]:
    """创建异步测试客户端。

    使用 .env 中配置的真实 Redis 服务，确保：
    - Redis 指向远程真实实例
    - Webhook 密钥使用测试密钥
    - Redis 连接池在测试前手动初始化
    """
    # 覆盖 Webhook 签名密钥为测试密钥
    monkeypatch.setenv("CLERK_WEBHOOK_SECRET", TEST_WEBHOOK_SECRET)

    # 刷新 ClerkSettings 并注入 webhook service
    from arksou.kernel.framework.auth.clerk import ClerkSettings

    fresh_clerk = ClerkSettings()
    monkeypatch.setattr(
        "api.app.services.webhook.clerk_webhook_service.clerk_settings",
        fresh_clerk,
    )

    # 创建使用新配置的测试应用
    from arksou.kernel.framework.app import create_app
    from arksou.kernel.framework.cache.connection import (
        close_redis_pool,
        init_redis_pool,
    )

    from api.app.core.config import Settings
    from api.app.routers import router as api_router

    fresh_settings = Settings()

    # 手动初始化 Redis 连接池（ASGITransport 不触发 lifespan）
    redis_config = fresh_settings.get_redis_config()
    await init_redis_pool(redis_config)

    test_app = create_app(
        fresh_settings,
        routers=[api_router],
        enable_redis=False,  # 已手动初始化，避免 lifespan 重复初始化
    )

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    # 清理 Redis 连接池
    await close_redis_pool()


@pytest_asyncio.fixture
async def redis_client() -> AsyncGenerator[Redis, None]:
    """创建直接连接 Redis 的客户端（用于验证写入结果）。

    使用 .env 中配置的真实 Redis 服务。
    """
    from api.app.core.config import settings

    client = Redis(
        host=settings.redis_host,
        port=settings.redis_port,
        db=settings.redis_db,
        password=settings.redis_password or None,
        ssl=settings.redis_ssl,
        decode_responses=True,
    )
    try:
        yield client
    finally:
        await client.aclose()


def _session_removed_payload(
    session_id: str = "sess_test_abc123",
    user_id: str = "user_test_xyz789",
) -> dict[str, Any]:
    """构建 session.removed 事件 payload。"""
    return {
        "type": "session.removed",
        "timestamp": int(
            datetime.datetime.now(tz=datetime.timezone.utc).timestamp() * 1000
        ),
        "instance_id": "ins_test_instance",
        "data": {
            "id": session_id,
            "user_id": user_id,
        },
    }


class TestD1SvixSignatureVerification:
    """D1. Svix 签名校验测试（最高优先级）。"""

    async def test_valid_signature_accepted(self, client: AsyncClient) -> None:
        """合法 Svix 签名应被接受，返回成功。"""
        # 使用 user.created 事件避免触发 Redis 写入
        payload = {
            "type": "user.created",
            "timestamp": int(
                datetime.datetime.now(tz=datetime.timezone.utc).timestamp()
                * 1000
            ),
            "data": {"id": "user_test_123"},
        }
        body, headers = _build_signed_request(payload)

        response = await client.post(
            "/api/v1/webhooks/clerk",
            content=body,
            headers=headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"]["value"] == 2000000  # SUCCESS

    async def test_invalid_signature_rejected(self, client: AsyncClient) -> None:
        """伪造签名应被拒绝，返回 401。"""
        payload = _session_removed_payload()
        body = json.dumps(payload)

        # 使用错误签名
        headers = {
            "svix-id": "msg_fake",
            "svix-timestamp": str(
                int(
                    datetime.datetime.now(tz=datetime.timezone.utc).timestamp()
                )
            ),
            "svix-signature": "v1,invalid_signature_here",
            "content-type": "application/json",
        }

        response = await client.post(
            "/api/v1/webhooks/clerk",
            content=body,
            headers=headers,
        )

        # 框架 SvixWebhookVerifier 抛出 UnauthorizedException → HTTP 401
        assert response.status_code == 401
        data = response.json()
        assert data["code"]["value"] == 4010000  # UNAUTHORIZED

    async def test_missing_signature_headers_rejected(
        self, client: AsyncClient
    ) -> None:
        """缺少签名 headers 应被拒绝，返回 401。"""
        payload = _session_removed_payload()
        body = json.dumps(payload)

        response = await client.post(
            "/api/v1/webhooks/clerk",
            content=body,
            headers={"content-type": "application/json"},
        )

        assert response.status_code == 401
        data = response.json()
        assert data["code"]["value"] == 4010000

    async def test_wrong_secret_rejected(self, client: AsyncClient) -> None:
        """使用错误密钥签名应被拒绝，返回 401。"""
        payload = _session_removed_payload()
        # 使用不同的密钥签名
        wrong_secret = "whsec_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
        body, headers = _build_signed_request(payload, secret=wrong_secret)

        response = await client.post(
            "/api/v1/webhooks/clerk",
            content=body,
            headers=headers,
        )

        assert response.status_code == 401
        data = response.json()
        assert data["code"]["value"] == 4010000


class TestD2SessionRemovedProcessing:
    """D2. session.removed 正常处理测试。"""

    async def test_session_removed_returns_success(
        self, client: AsyncClient
    ) -> None:
        """session.removed 事件处理应返回成功。"""
        payload = _session_removed_payload(session_id="sess_d2_test")
        body, headers = _build_signed_request(payload)

        response = await client.post(
            "/api/v1/webhooks/clerk",
            content=body,
            headers=headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"]["value"] == 2000000

    async def test_non_session_event_returns_success(
        self, client: AsyncClient
    ) -> None:
        """非 session 事件也应返回成功（仅记录日志，不做业务处理）。"""
        payload = {
            "type": "user.created",
            "timestamp": int(
                datetime.datetime.now(tz=datetime.timezone.utc).timestamp()
                * 1000
            ),
            "data": {"id": "user_new_123"},
        }
        body, headers = _build_signed_request(payload)

        response = await client.post(
            "/api/v1/webhooks/clerk",
            content=body,
            headers=headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"]["value"] == 2000000


class TestD3RedisRevocationKeyAndTTL:
    """D3. Redis 撤销键写入与 TTL 测试。"""

    async def test_session_removed_writes_redis_key(
        self,
        client: AsyncClient,
        redis_client: Redis,
    ) -> None:
        """session.removed 事件应在 Redis 中写入撤销键。"""
        session_id = "sess_d3_redis_write"
        payload = _session_removed_payload(session_id=session_id)
        body, headers = _build_signed_request(payload)

        response = await client.post(
            "/api/v1/webhooks/clerk",
            content=body,
            headers=headers,
        )

        assert response.status_code == 200
        assert response.json()["code"]["value"] == 2000000

        # 使用 SCAN 查找包含 session_id 的撤销键
        keys: list[str] = []
        async for key in redis_client.scan_iter(
            match=f"*session*{session_id}*"
        ):
            keys.append(key)

        assert len(keys) > 0, (
            f"Redis 中未找到包含 {session_id} 的撤销键"
        )

    async def test_session_revocation_key_has_ttl(
        self,
        client: AsyncClient,
        redis_client: Redis,
    ) -> None:
        """撤销键应有 24h TTL（不是永久键）。"""
        session_id = "sess_d3_ttl_check"
        payload = _session_removed_payload(session_id=session_id)
        body, headers = _build_signed_request(payload)

        await client.post(
            "/api/v1/webhooks/clerk",
            content=body,
            headers=headers,
        )

        # 查找撤销键
        keys: list[str] = []
        async for key in redis_client.scan_iter(
            match=f"*session*{session_id}*"
        ):
            keys.append(key)

        assert len(keys) > 0, "撤销键不存在"

        ttl = await redis_client.ttl(keys[0])
        # TTL 应在 0 到 86400 秒（24h）之间
        assert 0 < ttl <= 86400, (
            f"撤销键 TTL 异常: expected 0 < ttl <= 86400, got {ttl}"
        )


class TestD4IdempotentEventProcessing:
    """D4. 重复事件幂等测试。"""

    async def test_duplicate_session_removed_is_idempotent(
        self,
        client: AsyncClient,
        redis_client: Redis,
    ) -> None:
        """重复的 session.removed 事件不应产生额外副作用。"""
        session_id = "sess_d4_idempotent"
        payload = _session_removed_payload(session_id=session_id)

        # 第一次发送
        body1, headers1 = _build_signed_request(payload)
        response1 = await client.post(
            "/api/v1/webhooks/clerk",
            content=body1,
            headers=headers1,
        )
        assert response1.status_code == 200
        assert response1.json()["code"]["value"] == 2000000

        # 第二次发送（重复事件）
        body2, headers2 = _build_signed_request(payload)
        response2 = await client.post(
            "/api/v1/webhooks/clerk",
            content=body2,
            headers=headers2,
        )
        assert response2.status_code == 200
        assert response2.json()["code"]["value"] == 2000000

        # 验证 Redis 中存在撤销键
        keys: list[str] = []
        async for key in redis_client.scan_iter(
            match=f"*session*{session_id}*"
        ):
            keys.append(key)

        assert len(keys) > 0, "撤销键应存在"

        # TTL 仍然有效（被重置）
        ttl = await redis_client.ttl(keys[0])
        assert ttl > 0, "撤销键 TTL 应仍然有效"


class TestD5BodyParsingEdgeCases:
    """D5. Body 解析边界情况测试。

    覆盖 Clerk/Svix 可能发送非标准 body 导致 NoneType 错误的场景。
    """

    async def test_null_body_returns_success(self, client: AsyncClient) -> None:
        """body 为 JSON null 时应优雅处理，返回 200 而不是抛异常。"""
        body, headers = _build_signed_raw_request("null")

        response = await client.post(
            "/api/v1/webhooks/clerk",
            content=body,
            headers=headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"]["value"] == 2000000

    async def test_empty_body_returns_401(self, client: AsyncClient) -> None:
        """空 body 在 Svix 签名验证阶段被拒绝，返回 401。"""
        body, headers = _build_signed_raw_request("")

        response = await client.post(
            "/api/v1/webhooks/clerk",
            content=body,
            headers=headers,
        )

        # 空 body 被 Svix 验签器拒绝，不会到达 body 解析逻辑
        assert response.status_code == 401
        data = response.json()
        assert data["code"]["value"] == 4010000

    async def test_array_body_returns_success(self, client: AsyncClient) -> None:
        """body 为 JSON 数组时应优雅处理，返回 200 而不是抛异常。"""
        body, headers = _build_signed_raw_request('[{"type": "test"}]')

        response = await client.post(
            "/api/v1/webhooks/clerk",
            content=body,
            headers=headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"]["value"] == 2000000
