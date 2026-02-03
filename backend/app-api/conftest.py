"""pytest 根配置文件。

配置测试夹具和通用测试设置。
严禁使用 Mock/Stub/Fake，所有测试必须使用真实依赖。
"""

import pytest


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    """指定异步后端。"""
    return "asyncio"


# TODO: 后续 Story 添加以下夹具：
# - postgres_container: 使用 testcontainers 启动真实 PostgreSQL
# - test_db_session: 提供测试数据库会话
# - test_client: 提供 httpx AsyncClient 进行 API 测试
