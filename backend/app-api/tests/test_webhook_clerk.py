"""Clerk Webhook 集成测试。

测试优先级（按 Story D1→D4）：
D1. Svix 签名校验测试
D2. session.removed 正常处理测试
D3. Redis 撤销键写入与 TTL 测试
D4. 重复事件幂等测试

严禁使用 Mock/Stub/Fake，所有测试必须使用真实依赖。
使用 testcontainers 启动真实 Redis 实例。
使用 Svix Webhook 类生成真实签名。
"""

import datetime
import json
from collections.abc import AsyncGenerator
from typing import Any

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from redis.asyncio import Redis
from svix.webhooks import Webhook
from testcontainers.redis import RedisContainer

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


@pytest.fixture(scope="module")
def redis_container():
    """启动真实 Redis 容器（模块级共享）。"""
    with RedisContainer("redis:7-alpine") as container:
        yield container


@pytest_asyncio.fixture
async def client(redis_container, monkeypatch) -> AsyncGenerator[AsyncClient, None]:
    """创建异步测试客户端。

    为每次测试创建新的 FastAPI 应用，确保：
    - Redis 指向 testcontainers 实例
    - Webhook 密钥使用测试密钥
    - 应用 lifespan 正确初始化 Redis 连接池
    """
    # 配置 Redis 环境变量
    host = redis_container.get_container_host_ip()
    port = str(redis_container.get_exposed_port(6379))
    monkeypatch.setenv("REDIS_HOST", host)
    monkeypatch.setenv("REDIS_PORT", port)
    monkeypatch.setenv("REDIS_DB", "0")
    monkeypatch.setenv("REDIS_PASSWORD", "")

    # 配置 Webhook 签名密钥
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

    from api.app.core.config import Settings
    from api.app.routers import router as api_router

    fresh_settings = Settings()
    test_app = create_app(
        fresh_settings,
        routers=[api_router],
    )

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def redis_client(redis_container) -> AsyncGenerator[Redis, None]:
    """创建直接连接 Redis 的客户端（用于验证写入结果）。"""
    host = redis_container.get_container_host_ip()
    port = int(redis_container.get_exposed_port(6379))
    client = Redis(host=host, port=port, db=0, decode_responses=True)
    try:
        yield client
    finally:
        await client.close()


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
            "/api/v1/webhook/clerk",
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
            "/api/v1/webhook/clerk",
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
            "/api/v1/webhook/clerk",
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
            "/api/v1/webhook/clerk",
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
            "/api/v1/webhook/clerk",
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
            "/api/v1/webhook/clerk",
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
            "/api/v1/webhook/clerk",
            content=body,
            headers=headers,
        )

        assert response.status_code == 200
        assert response.json()["code"]["value"] == 2000000

        # 使用 SCAN 查找包含 session_id 的撤销键
        keys: list[str] = []
        async for key in redis_client.scan_iter(
            match=f"*invalid*{session_id}*"
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
            "/api/v1/webhook/clerk",
            content=body,
            headers=headers,
        )

        # 查找撤销键
        keys: list[str] = []
        async for key in redis_client.scan_iter(
            match=f"*invalid*{session_id}*"
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
            "/api/v1/webhook/clerk",
            content=body1,
            headers=headers1,
        )
        assert response1.status_code == 200
        assert response1.json()["code"]["value"] == 2000000

        # 第二次发送（重复事件）
        body2, headers2 = _build_signed_request(payload)
        response2 = await client.post(
            "/api/v1/webhook/clerk",
            content=body2,
            headers=headers2,
        )
        assert response2.status_code == 200
        assert response2.json()["code"]["value"] == 2000000

        # 验证 Redis 中存在撤销键
        keys: list[str] = []
        async for key in redis_client.scan_iter(
            match=f"*invalid*{session_id}*"
        ):
            keys.append(key)

        assert len(keys) > 0, "撤销键应存在"

        # TTL 仍然有效（被重置）
        ttl = await redis_client.ttl(keys[0])
        assert ttl > 0, "撤销键 TTL 应仍然有效"
