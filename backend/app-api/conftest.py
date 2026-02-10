"""pytest 根配置文件。

配置测试夹具和通用测试设置。
严禁使用 Mock/Stub/Fake，所有测试必须使用真实依赖。
"""

from pathlib import Path

import pytest
from dotenv import load_dotenv

# 加载 backend/.env 环境变量（数据库连接等配置）
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    """指定异步后端。"""
    return "asyncio"
