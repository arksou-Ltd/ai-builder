"""Smoke Tests - 最小可执行的端点验证。

验证核心端点可访问且返回正确的响应格式。
严禁使用 Mock/Stub/Fake，所有测试必须使用真实依赖。
"""

import pytest
from httpx import ASGITransport, AsyncClient

from api.app.main import app


@pytest.fixture
async def client() -> AsyncClient:
    """创建异步测试客户端。

    使用 httpx AsyncClient 直接调用 FastAPI 应用，
    无需启动真实服务器，但执行完整的请求/响应流程。
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestHealthEndpoint:
    """健康检查端点测试。"""

    async def test_health_returns_success(self, client: AsyncClient) -> None:
        """GET /api/health 应返回成功状态。"""
        response = await client.get("/api/health")

        assert response.status_code == 200
        data = response.json()

        # 验证统一响应格式
        assert "code" in data
        assert "data" in data
        assert "message" in data

        # 验证响应内容
        # code 是一个包含 value 和 desc 的对象
        assert data["code"]["value"] == 2000000
        assert data["data"]["status"] == "healthy"
        # message 可能为空字符串（框架默认行为）
        assert isinstance(data["message"], str)

    async def test_health_response_structure(self, client: AsyncClient) -> None:
        """GET /api/health 应返回 Result[HealthData] 结构。"""
        response = await client.get("/api/health")

        assert response.status_code == 200
        data = response.json()

        # 验证 data 字段包含 status
        assert isinstance(data["data"], dict)
        assert "status" in data["data"]


class TestAuthMeEndpoint:
    """认证用户信息端点测试。"""

    async def test_auth_me_returns_unauthenticated(
        self, client: AsyncClient
    ) -> None:
        """GET /api/v1/auth/me 无认证时应返回未认证状态。"""
        response = await client.get("/api/v1/auth/me")

        assert response.status_code == 200
        data = response.json()

        # 验证统一响应格式
        assert "code" in data
        assert "data" in data
        assert "message" in data

        # 验证响应内容 - 未认证状态
        # code 是一个包含 value 和 desc 的对象
        assert data["code"]["value"] == 2000000
        assert data["data"]["is_authenticated"] is False
        assert data["data"]["id"] is None

    async def test_auth_me_response_structure(self, client: AsyncClient) -> None:
        """GET /api/v1/auth/me 应返回 Result[AccountResponse] 结构。"""
        response = await client.get("/api/v1/auth/me")

        assert response.status_code == 200
        data = response.json()

        # 验证 data 字段包含 AccountResponse 必需字段
        assert isinstance(data["data"], dict)
        assert "id" in data["data"]
        assert "is_authenticated" in data["data"]
        assert "display_name" in data["data"]
        assert "email" in data["data"]
