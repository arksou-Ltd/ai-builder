"""工作空间集成测试。

覆盖创建成功、重名失败、非法名称失败、未登录 401、跨用户隔离、
软删除、删除后不可见、删除后同名重建、跨用户删除拦截。
使用 .env 中配置的真实 PostgreSQL 实例，严禁 mock/stub/fake。
使用 NullPool 避免 ASGITransport 下连接池复用冲突。
"""

import os
import uuid
from collections.abc import AsyncGenerator
from typing import Final

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

# 测试会话唯一标识，确保并行测试运行互不干扰
_TEST_RUN_ID: Final[str] = uuid.uuid4().hex[:8]


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
    """测试用户 A 身份（含会话唯一前缀，避免并行测试数据冲突）。"""
    return ClerkAccount(
        clerk_account_id=f"user_test_{_TEST_RUN_ID}_aaa", email="a@test.com"
    )


@pytest.fixture
def clerk_account_b():
    """测试用户 B 身份（含会话唯一前缀，避免并行测试数据冲突）。"""
    return ClerkAccount(
        clerk_account_id=f"user_test_{_TEST_RUN_ID}_bbb", email="b@test.com"
    )


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
    """测试后清理测试数据：基于会话唯一前缀精确清理，避免误删其他测试运行的数据。"""
    yield
    cleanup_pattern = f"user_test_{_TEST_RUN_ID}_%"
    async with test_engine.connect() as conn:
        # 先删除 workspace（有外键约束指向 auth_accounts）
        await conn.execute(
            text(
                "DELETE FROM workspace_workspaces "
                "WHERE account_id IN ("
                "  SELECT id FROM auth_accounts "
                "  WHERE clerk_account_id LIKE :pattern"
                ")"
            ),
            {"pattern": cleanup_pattern},
        )
        # 再删除 auth_accounts
        await conn.execute(
            text("DELETE FROM auth_accounts WHERE clerk_account_id LIKE :pattern"),
            {"pattern": cleanup_pattern},
        )
        await conn.commit()


def _unique_name(prefix: str = "ws") -> str:
    """生成唯一工作空间名称，避免测试间冲突。"""
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


# --- 创建成功测试 ---


class TestCreateWorkspaceSuccess:
    """AC: 创建工作空间成功。"""

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
    """AC: 非法名称校验。"""

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
        name_50 = _unique_name("x50") + "a" * 37
        name_50 = name_50[:50]
        response = await client.post(
            "/api/v1/workspaces",
            json={"name": name_50},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["name"] == name_50

    async def test_illegal_chars_returns_422(self, client: httpx.AsyncClient):
        """包含非法字符的名称应返回 422。"""
        illegal_names = [
            "ws<script>",
            "ws;DROP TABLE",
            "ws@#$%",
            "ws\x00null",
            "ws/path",
        ]
        for name in illegal_names:
            response = await client.post(
                "/api/v1/workspaces",
                json={"name": name},
            )
            assert response.status_code == 422, f"Expected 422 for name: {name!r}"

    async def test_chinese_name_succeeds(self, client: httpx.AsyncClient):
        """中文名称应成功创建。"""
        name = f"测试空间-{uuid.uuid4().hex[:6]}"
        response = await client.post(
            "/api/v1/workspaces",
            json={"name": name},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["name"] == name

    async def test_name_with_allowed_special_chars_succeeds(self, client: httpx.AsyncClient):
        """允许的特殊字符（连字符、下划线、点号）应成功。"""
        name = f"my-workspace_v1.0-{uuid.uuid4().hex[:4]}"
        response = await client.post(
            "/api/v1/workspaces",
            json={"name": name},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["name"] == name

    async def test_name_with_newline_returns_422(self, client: httpx.AsyncClient):
        """包含换行符的名称应返回 422。"""
        response = await client.post(
            "/api/v1/workspaces",
            json={"name": "abc\nxyz"},
        )

        assert response.status_code == 422

    async def test_name_with_tab_returns_422(self, client: httpx.AsyncClient):
        """包含制表符的名称应返回 422。"""
        response = await client.post(
            "/api/v1/workspaces",
            json={"name": "abc\txyz"},
        )

        assert response.status_code == 422


# --- 重名冲突测试 ---


class TestCreateWorkspaceDuplicate:
    """AC: 同用户重名冲突。"""

    async def test_duplicate_name_returns_409(self, client: httpx.AsyncClient):
        """同一用户创建重名工作空间应返回 409。"""
        name = _unique_name("dup")

        response1 = await client.post(
            "/api/v1/workspaces",
            json={"name": name},
        )
        assert response1.status_code == 200

        response2 = await client.post(
            "/api/v1/workspaces",
            json={"name": name},
        )
        assert response2.status_code == 409
        data = response2.json()
        assert data["code"]["value"] == 4090000  # CONFLICT


# --- 未登录测试 ---


class TestUnauthorizedAccess:
    """AC9: 未登录返回 401。"""

    async def test_create_without_auth_returns_401(self, test_session_factory):
        """未登录创建工作空间应返回 401。"""
        application = _make_app(test_session_factory)

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

    async def test_delete_without_auth_returns_401(self, test_session_factory):
        """未登录删除工作空间应返回 401。"""
        application = _make_app(test_session_factory)

        transport = ASGITransport(app=application)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            response = await c.delete("/api/v1/workspaces/12345")

        assert response.status_code == 401
        application.dependency_overrides.clear()


# --- 用户隔离测试 ---


class TestUserIsolation:
    """AC8: 跨用户数据隔离。"""

    async def test_user_b_cannot_see_user_a_workspaces(
        self,
        test_session_factory,
        clerk_account_a,
        clerk_account_b,
    ):
        """用户 B 看不到用户 A 创建的工作空间。"""
        ws_name = _unique_name("iso-a")

        app_a = _make_app(test_session_factory, clerk_account_a)
        transport_a = ASGITransport(app=app_a)
        async with httpx.AsyncClient(transport=transport_a, base_url="http://test") as client_a:
            resp = await client_a.post(
                "/api/v1/workspaces",
                json={"name": ws_name},
            )
            assert resp.status_code == 200
        app_a.dependency_overrides.clear()

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

        app_a = _make_app(test_session_factory, clerk_account_a)
        transport_a = ASGITransport(app=app_a)
        async with httpx.AsyncClient(transport=transport_a, base_url="http://test") as client_a:
            resp_a = await client_a.post(
                "/api/v1/workspaces",
                json={"name": shared_name},
            )
            assert resp_a.status_code == 200
        app_a.dependency_overrides.clear()

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
    """AC: 工作空间列表查询。"""

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
            clerk_account_id=f"user_test_{_TEST_RUN_ID}_new_{uuid.uuid4().hex[:6]}",
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


# --- 删除测试 ---


class TestDeleteWorkspace:
    """AC1-3, 6-9: 工作空间软删除。"""

    async def test_delete_workspace_success(self, client: httpx.AsyncClient):
        """删除工作空间应返回成功（AC: 2）。"""
        name = _unique_name("del-ok")
        create_resp = await client.post(
            "/api/v1/workspaces", json={"name": name}
        )
        assert create_resp.status_code == 200
        workspace_id = create_resp.json()["data"]["id"]

        delete_resp = await client.delete(f"/api/v1/workspaces/{workspace_id}")
        assert delete_resp.status_code == 200
        data = delete_resp.json()
        assert data["code"]["value"] == 2000000

    async def test_deleted_workspace_not_in_list(self, client: httpx.AsyncClient):
        """软删除后的工作空间不应出现在列表中（AC: 6）。"""
        name = _unique_name("del-hide")
        create_resp = await client.post(
            "/api/v1/workspaces", json={"name": name}
        )
        workspace_id = create_resp.json()["data"]["id"]

        await client.delete(f"/api/v1/workspaces/{workspace_id}")

        list_resp = await client.get("/api/v1/workspaces")
        assert list_resp.status_code == 200
        names = [ws["name"] for ws in list_resp.json()["data"]]
        assert name not in names

    async def test_recreate_same_name_after_delete(self, client: httpx.AsyncClient):
        """软删除后可以同名重建（AC: 7）。"""
        name = _unique_name("del-recreate")

        # 创建
        create_resp = await client.post(
            "/api/v1/workspaces", json={"name": name}
        )
        workspace_id = create_resp.json()["data"]["id"]

        # 删除
        await client.delete(f"/api/v1/workspaces/{workspace_id}")

        # 重新创建同名 — 应成功
        recreate_resp = await client.post(
            "/api/v1/workspaces", json={"name": name}
        )
        assert recreate_resp.status_code == 200
        assert recreate_resp.json()["data"]["name"] == name

    async def test_delete_nonexistent_returns_404(self, client: httpx.AsyncClient):
        """删除不存在的工作空间应返回 404（AC: 9）。"""
        response = await client.delete("/api/v1/workspaces/999999999999999")
        assert response.status_code == 404
        data = response.json()
        assert data["code"]["value"] == 4040000

    async def test_delete_already_deleted_returns_404(self, client: httpx.AsyncClient):
        """重复删除已软删除的工作空间应返回 404（AC: 6）。"""
        name = _unique_name("del-twice")
        create_resp = await client.post(
            "/api/v1/workspaces", json={"name": name}
        )
        workspace_id = create_resp.json()["data"]["id"]

        # 第一次删除成功
        resp1 = await client.delete(f"/api/v1/workspaces/{workspace_id}")
        assert resp1.status_code == 200

        # 第二次删除应 404（SoftDeleteMixin 自动过滤已删除记录）
        resp2 = await client.delete(f"/api/v1/workspaces/{workspace_id}")
        assert resp2.status_code == 404

    async def test_delete_non_integer_id_returns_422(self, client: httpx.AsyncClient):
        """非整数 workspace_id 应返回 422（AC: 9 参数异常）。"""
        response = await client.delete("/api/v1/workspaces/abc")
        assert response.status_code == 422

    async def test_delete_negative_id_returns_404(self, client: httpx.AsyncClient):
        """负数 workspace_id 是合法 int，FastAPI 不拦截；服务层查无此记录返回 404。"""
        response = await client.delete("/api/v1/workspaces/-1")
        assert response.status_code == 404

    async def test_cross_user_delete_returns_404(
        self,
        test_session_factory,
        clerk_account_a,
        clerk_account_b,
    ):
        """用户 A 不能删除用户 B 的工作空间（AC: 8）。"""
        ws_name = _unique_name("cross-del")

        # 用户 A 创建工作空间
        app_a = _make_app(test_session_factory, clerk_account_a)
        transport_a = ASGITransport(app=app_a)
        async with httpx.AsyncClient(transport=transport_a, base_url="http://test") as client_a:
            resp = await client_a.post(
                "/api/v1/workspaces", json={"name": ws_name}
            )
            assert resp.status_code == 200
            workspace_id = resp.json()["data"]["id"]
        app_a.dependency_overrides.clear()

        # 用户 B 尝试删除 — 应返回 404（不泄露资源存在性）
        app_b = _make_app(test_session_factory, clerk_account_b)
        transport_b = ASGITransport(app=app_b)
        async with httpx.AsyncClient(transport=transport_b, base_url="http://test") as client_b:
            resp = await client_b.delete(f"/api/v1/workspaces/{workspace_id}")
            assert resp.status_code == 404
        app_b.dependency_overrides.clear()


# --- 外键关系验证测试 ---


class TestAccountWorkspaceRelation:
    """AC4-5: auth_accounts 与 workspace_workspaces 外键关系。"""

    async def test_workspace_account_fk_constraint_exists(self, test_engine):
        """workspace_workspaces.account_id 必须引用 auth_accounts.id（AC: 4）。

        直接查询 PostgreSQL 系统表验证外键约束存在。
        """
        async with test_engine.connect() as conn:
            result = await conn.execute(
                text(
                    "SELECT "
                    "  tc.constraint_name, "
                    "  kcu.column_name, "
                    "  ccu.table_name AS foreign_table_name, "
                    "  ccu.column_name AS foreign_column_name "
                    "FROM information_schema.table_constraints tc "
                    "JOIN information_schema.key_column_usage kcu "
                    "  ON tc.constraint_name = kcu.constraint_name "
                    "  AND tc.table_schema = kcu.table_schema "
                    "JOIN information_schema.constraint_column_usage ccu "
                    "  ON ccu.constraint_name = tc.constraint_name "
                    "  AND ccu.table_schema = tc.table_schema "
                    "WHERE tc.table_name = 'workspace_workspaces' "
                    "  AND tc.constraint_type = 'FOREIGN KEY' "
                    "  AND kcu.column_name = 'account_id'"
                )
            )
            rows = result.fetchall()

        assert len(rows) > 0, (
            "未找到 workspace_workspaces.account_id 的外键约束"
        )
        fk_row = rows[0]
        assert fk_row.foreign_table_name == "auth_accounts", (
            f"外键应指向 auth_accounts，实际指向 {fk_row.foreign_table_name}"
        )
        assert fk_row.foreign_column_name == "id", (
            f"外键应引用 auth_accounts.id，实际引用 {fk_row.foreign_column_name}"
        )

    async def test_workspace_account_id_is_bigint(self, test_engine):
        """workspace_workspaces.account_id 列类型必须为 BIGINT（AC: 4）。"""
        async with test_engine.connect() as conn:
            result = await conn.execute(
                text(
                    "SELECT data_type "
                    "FROM information_schema.columns "
                    "WHERE table_name = 'workspace_workspaces' "
                    "  AND column_name = 'account_id'"
                )
            )
            row = result.fetchone()

        assert row is not None, "未找到 workspace_workspaces.account_id 列"
        assert row.data_type == "bigint", (
            f"account_id 列类型应为 bigint，实际为 {row.data_type}"
        )

    async def test_workspace_id_is_snowflake_int(self, client: httpx.AsyncClient):
        """创建工作空间后，workspace_id 是整型雪花 ID（AC: 4）。"""
        name = _unique_name("fk-check")
        resp = await client.post("/api/v1/workspaces", json={"name": name})
        assert resp.status_code == 200

        workspace_id = resp.json()["data"]["id"]
        assert isinstance(workspace_id, int)
        assert workspace_id > 0

    async def test_same_clerk_id_resolves_to_same_account(self, client: httpx.AsyncClient):
        """相同 Clerk ID 多次请求应解析到同一内部账号（AC: 5）。"""
        name1 = _unique_name("resolve-a")
        name2 = _unique_name("resolve-b")

        resp1 = await client.post("/api/v1/workspaces", json={"name": name1})
        resp2 = await client.post("/api/v1/workspaces", json={"name": name2})

        assert resp1.status_code == 200
        assert resp2.status_code == 200

        # 两个工作空间都能被同一用户列表查到
        list_resp = await client.get("/api/v1/workspaces")
        names = [ws["name"] for ws in list_resp.json()["data"]]
        assert name1 in names
        assert name2 in names
