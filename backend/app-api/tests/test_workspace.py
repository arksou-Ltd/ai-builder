"""工作空间集成测试。

覆盖创建成功、重名失败、非法名称失败、未登录 401、跨用户隔离。
使用 .env 中配置的真实 PostgreSQL 实例，严禁 mock/stub/fake。
使用 NullPool 避免 ASGITransport 下连接池复用冲突。
"""

import os
import uuid
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
import httpx
from httpx import ASGITransport
from sqlalchemy import pool, text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from arksou.kernel.framework.auth.clerk import ClerkAccount

from api.app.deps.auth import get_clerk_account
from api.app.deps.database import get_db


def _build_db_url() -> str:
    """从环境变量构建数据库连接 URL（与 .env 配置一致）。"""
    driver = os.getenv("DB_DRIVER", "postgresql+asyncpg")
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "5432")
    username = os.getenv("DB_USERNAME", "postgres")
    password = os.getenv("DB_PASSWORD", "")
    database = os.getenv("DB_DATABASE", "ai_builder")
    return f"{driver}://{username}:{password}@{host}:{port}/{database}"


# --- Fixtures ---


@pytest.fixture(scope="session")
def test_engine():
    """会话级 NullPool 引擎，避免连接复用冲突。"""
    engine = create_async_engine(_build_db_url(), poolclass=pool.NullPool)
    yield engine


@pytest.fixture(scope="session")
def test_session_factory(test_engine):
    """会话级 session factory。"""
    return async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )


@pytest.fixture
def clerk_account_a():
    """测试用户 A 身份。"""
    return ClerkAccount(clerk_account_id="user_test_aaa", email="a@test.com")


@pytest.fixture
def clerk_account_b():
    """测试用户 B 身份。"""
    return ClerkAccount(clerk_account_id="user_test_bbb", email="b@test.com")


def _make_app(test_session_factory, clerk_account=None):
    """创建 FastAPI 应用实例。

    override get_db 使用 NullPool 引擎的 session factory，
    保持与框架 get_async_session 相同的 commit/rollback 语义。
    """
    from arksou.kernel.framework.app import create_app as build_app
    from api.app.core.config import settings
    from api.app.routers import router as api_router

    application = build_app(settings, routers=[api_router], enable_redis=False)

    async def _get_db_override() -> AsyncGenerator[AsyncSession, None]:
        async with test_session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    application.dependency_overrides[get_db] = _get_db_override
    if clerk_account is not None:
        application.dependency_overrides[get_clerk_account] = lambda: clerk_account
    return application


@pytest.fixture
def app(test_session_factory, clerk_account_a):
    """FastAPI 应用（默认注入用户 A 身份）。"""
    application = _make_app(test_session_factory, clerk_account_a)
    yield application
    application.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client(app):
    """HTTP 测试客户端。"""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture(autouse=True)
async def cleanup_test_data(test_engine):
    """测试后清理测试数据（仅删除测试用户创建的工作空间）。"""
    yield
    async with test_engine.connect() as conn:
        await conn.execute(
            text("DELETE FROM workspace_workspaces WHERE owner_clerk_id LIKE 'user_test_%'")
        )
        await conn.commit()


def _unique_name(prefix: str = "ws") -> str:
    """生成唯一工作空间名称，避免测试间冲突。"""
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


# --- 创建成功测试 ---


class TestCreateWorkspaceSuccess:
    """AC1: 创建工作空间成功。"""

    async def test_create_workspace_returns_success(self, client: httpx.AsyncClient):
        """创建工作空间应返回成功和工作空间数据。"""
        name = _unique_name("create-ok")
        response = await client.post(
            "/api/v1/workspaces",
            json={"name": name},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"]["value"] == 2000000  # SUCCESS
        assert data["data"]["name"] == name
        assert "id" in data["data"]
        assert "createdAt" in data["data"]
        assert "updatedAt" in data["data"]

    async def test_create_workspace_strips_whitespace(self, client: httpx.AsyncClient):
        """工作空间名称应自动去除首尾空白。"""
        core_name = _unique_name("strip")
        response = await client.post(
            "/api/v1/workspaces",
            json={"name": f"  {core_name}  "},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["name"] == core_name


# --- 创建失败测试 ---


class TestCreateWorkspaceValidation:
    """AC2: 非法名称校验。"""

    async def test_empty_name_returns_422(self, client: httpx.AsyncClient):
        """空名称应返回 422。"""
        response = await client.post(
            "/api/v1/workspaces",
            json={"name": ""},
        )

        assert response.status_code == 422

    async def test_whitespace_only_name_returns_422(self, client: httpx.AsyncClient):
        """纯空白名称应返回 422。"""
        response = await client.post(
            "/api/v1/workspaces",
            json={"name": "   "},
        )

        assert response.status_code == 422

    async def test_name_exceeds_50_chars_returns_422(self, client: httpx.AsyncClient):
        """超过 50 字符的名称应返回 422。"""
        long_name = "a" * 51
        response = await client.post(
            "/api/v1/workspaces",
            json={"name": long_name},
        )

        assert response.status_code == 422

    async def test_exactly_50_chars_name_succeeds(self, client: httpx.AsyncClient):
        """恰好 50 字符的名称应成功。"""
        name_50 = _unique_name("x50") + "a" * 37  # total ≤ 50
        name_50 = name_50[:50]
        response = await client.post(
            "/api/v1/workspaces",
            json={"name": name_50},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["name"] == name_50


# --- 重名冲突测试 ---


class TestCreateWorkspaceDuplicate:
    """AC2: 同用户重名冲突。"""

    async def test_duplicate_name_returns_409(self, client: httpx.AsyncClient):
        """同一用户创建重名工作空间应返回 409。"""
        name = _unique_name("dup")

        # 第一次创建成功
        response1 = await client.post(
            "/api/v1/workspaces",
            json={"name": name},
        )
        assert response1.status_code == 200

        # 第二次创建应失败
        response2 = await client.post(
            "/api/v1/workspaces",
            json={"name": name},
        )
        assert response2.status_code == 409
        data = response2.json()
        assert data["code"]["value"] == 4090000  # CONFLICT


# --- 未登录测试 ---


class TestUnauthorizedAccess:
    """AC4: 未登录返回 401。"""

    async def test_create_without_auth_returns_401(self, test_session_factory):
        """未登录创建工作空间应返回 401。"""
        application = _make_app(test_session_factory)  # 不注入 clerk_account

        transport = ASGITransport(app=application)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            response = await c.post(
                "/api/v1/workspaces",
                json={"name": "test"},
            )

        assert response.status_code == 401
        application.dependency_overrides.clear()

    async def test_list_without_auth_returns_401(self, test_session_factory):
        """未登录获取列表应返回 401。"""
        application = _make_app(test_session_factory)

        transport = ASGITransport(app=application)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            response = await c.get("/api/v1/workspaces")

        assert response.status_code == 401
        application.dependency_overrides.clear()


# --- 用户隔离测试 ---


class TestUserIsolation:
    """AC3: 跨用户数据隔离。"""

    async def test_user_b_cannot_see_user_a_workspaces(
        self,
        test_session_factory,
        clerk_account_a,
        clerk_account_b,
    ):
        """用户 B 看不到用户 A 创建的工作空间。"""
        ws_name = _unique_name("iso-a")

        # 用户 A 创建工作空间
        app_a = _make_app(test_session_factory, clerk_account_a)
        transport_a = ASGITransport(app=app_a)
        async with httpx.AsyncClient(transport=transport_a, base_url="http://test") as client_a:
            resp = await client_a.post(
                "/api/v1/workspaces",
                json={"name": ws_name},
            )
            assert resp.status_code == 200
        app_a.dependency_overrides.clear()

        # 用户 B 获取列表
        app_b = _make_app(test_session_factory, clerk_account_b)
        transport_b = ASGITransport(app=app_b)
        async with httpx.AsyncClient(transport=transport_b, base_url="http://test") as client_b:
            resp = await client_b.get("/api/v1/workspaces")
            assert resp.status_code == 200
            data = resp.json()
            workspace_names = [ws["name"] for ws in data["data"]]
            assert ws_name not in workspace_names
        app_b.dependency_overrides.clear()

    async def test_different_users_can_have_same_workspace_name(
        self,
        test_session_factory,
        clerk_account_a,
        clerk_account_b,
    ):
        """不同用户可以创建同名工作空间。"""
        shared_name = _unique_name("shared")

        # 用户 A 创建
        app_a = _make_app(test_session_factory, clerk_account_a)
        transport_a = ASGITransport(app=app_a)
        async with httpx.AsyncClient(transport=transport_a, base_url="http://test") as client_a:
            resp_a = await client_a.post(
                "/api/v1/workspaces",
                json={"name": shared_name},
            )
            assert resp_a.status_code == 200
        app_a.dependency_overrides.clear()

        # 用户 B 创建同名 — 应成功
        app_b = _make_app(test_session_factory, clerk_account_b)
        transport_b = ASGITransport(app=app_b)
        async with httpx.AsyncClient(transport=transport_b, base_url="http://test") as client_b:
            resp_b = await client_b.post(
                "/api/v1/workspaces",
                json={"name": shared_name},
            )
            assert resp_b.status_code == 200
        app_b.dependency_overrides.clear()


# --- 列表查询测试 ---


class TestListWorkspaces:
    """AC1: 工作空间列表查询。"""

    async def test_list_returns_user_workspaces(self, client: httpx.AsyncClient):
        """列表应返回当前用户的工作空间。"""
        ws_name = _unique_name("list")
        await client.post("/api/v1/workspaces", json={"name": ws_name})

        response = await client.get("/api/v1/workspaces")
        assert response.status_code == 200
        data = response.json()
        assert data["code"]["value"] == 2000000
        assert isinstance(data["data"], list)

        names = [ws["name"] for ws in data["data"]]
        assert ws_name in names

    async def test_list_empty_for_new_user(self, test_session_factory):
        """新用户列表应为空。"""
        new_user = ClerkAccount(
            clerk_account_id=f"user_test_new_{uuid.uuid4().hex[:6]}",
            email="new@test.com",
        )
        application = _make_app(test_session_factory, new_user)

        transport = ASGITransport(app=application)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            response = await c.get("/api/v1/workspaces")

        assert response.status_code == 200
        data = response.json()
        assert data["data"] == []
        application.dependency_overrides.clear()
