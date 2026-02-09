"""Smoke Tests - 最小可执行的端点验证。

验证核心端点可访问且返回正确的响应格式。
严禁使用 Mock/Stub/Fake，所有测试必须使用真实依赖。
"""

from collections.abc import AsyncGenerator
from typing import Any

import pytest_asyncio
from httpx import ASGITransport, AsyncClient


def assert_result_contract(data: dict[str, Any]) -> None:
    """验证统一响应格式 Result[T] 契约。

    框架要求的完整响应结构：
    - code: { value: int, desc: str }
    - data: T
    - message: str
    - request_id: str
    - timestamp: int
    """
    # 验证顶层字段存在
    assert "code" in data, "缺少 code 字段"
    assert "data" in data, "缺少 data 字段"
    assert "message" in data, "缺少 message 字段"
    assert "request_id" in data, "缺少 request_id 字段"
    assert "timestamp" in data, "缺少 timestamp 字段"

    # 验证 code 结构
    assert isinstance(data["code"], dict), "code 应为 dict 类型"
    assert "value" in data["code"], "code 缺少 value 字段"
    assert "desc" in data["code"], "code 缺少 desc 字段"
    assert isinstance(data["code"]["value"], int), "code.value 应为 int 类型"
    assert isinstance(data["code"]["desc"], str), "code.desc 应为 str 类型"

    # 验证其他字段类型
    assert isinstance(data["message"], str), "message 应为 str 类型"
    assert isinstance(data["request_id"], str), "request_id 应为 str 类型"
    assert isinstance(data["timestamp"], int), "timestamp 应为 int 类型"


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """创建异步测试客户端。

    使用 create_app() 创建独立测试应用，禁用 Redis 以免烟雾测试依赖外部服务。
    健康检查和认证拦截（401）均不需要 Redis。
    """
    from arksou.kernel.framework.app import create_app

    from api.app.core.config import settings
    from api.app.routers import router as api_router

    test_app = create_app(
        settings,
        routers=[api_router],
        enable_redis=False,
        version=settings.app_version,
    )

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestHealthEndpoint:
    """健康检查端点测试。"""

    async def test_health_returns_success(self, client: AsyncClient) -> None:
        """GET /health 应返回成功状态。"""
        response = await client.get("/health")

        assert response.status_code == 200
        data = response.json()

        # 框架内置健康检查返回简单 JSON（非 Result 包装）
        assert data["status"] == "healthy"

    async def test_health_response_structure(self, client: AsyncClient) -> None:
        """GET /health 应返回 {"status": "healthy"} 结构。"""
        response = await client.get("/health")

        assert response.status_code == 200
        data = response.json()

        # 验证 data 字段包含 status
        assert isinstance(data, dict)
        assert "status" in data


class TestAuthMeEndpoint:
    """认证用户信息端点测试。"""

    async def test_auth_me_requires_authentication(
        self, client: AsyncClient
    ) -> None:
        """GET /api/v1/auth/me 无认证时应返回 401。"""
        response = await client.get("/api/v1/auth/me")

        # 框架强制认证：缺少 Bearer token → UnauthorizedException → HTTP 401
        assert response.status_code == 401
        data = response.json()

        # 验证统一响应格式 Result[T] 契约
        assert_result_contract(data)

        # 验证未授权错误码 (4010000)
        assert data["code"]["value"] == 4010000

    async def test_auth_me_error_response_structure(
        self, client: AsyncClient
    ) -> None:
        """GET /api/v1/auth/me 未认证时应返回 Result 错误响应结构。"""
        response = await client.get("/api/v1/auth/me")

        assert response.status_code == 401
        data = response.json()

        # 验证统一响应格式 Result[T] 契约
        assert_result_contract(data)

        # 验证错误响应中 data 为 None
        assert data["data"] is None
