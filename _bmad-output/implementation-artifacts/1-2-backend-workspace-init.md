# Story 1.2: backend-workspace-init

Status: in-progress

## Story

As a 开发者,
I want 使用标准化的后端项目骨架,
so that 我可以基于统一的 Python workspace 与模块结构开始后端开发。

## Acceptance Criteria

1. 验收清单（逐项自检）
   - [ ] 仓库当前没有后端工程（Given）
   - [ ] 已初始化 uv workspace 并创建最小 FastAPI 服务骨架（When）
   - [ ] `backend/` 目录创建完成（Then）
   - [ ] `backend/pyproject.toml` 作为 workspace root 配置完成
   - [ ] `backend/.python-version` 内容必须为 `3.12`（不是 `3.12.0` 或 `3.12.x`）
   - [ ] `backend/common-kernel/` 模块创建完成
   - [ ] `backend/common-kernel/src/kernel/common/` 目录存在，包含 `enums/` 与 `models/` 基础分组
   - [ ] `backend/app-api/` 模块创建完成，且代码根路径为 `backend/app-api/src/api/app/`
   - [ ] `backend/app-api/src/api/app/` 至少包含 `main.py`、`core/`、`deps/`、`router/`、`service/`、`schema/`
   - [ ] `backend/app-api/src/api/app/core/` 至少包含 `config.py`、`database.py`、`exceptions.py`
   - [ ] `backend/app-api/src/api/app/deps/` 至少包含 `auth.py`、`database.py`
   - [ ] `backend/app-api/src/api/app/router/` 以模块分组（如 `auth/`），且至少包含 `auth/me.py` 示例
   - [ ] `backend/app-api/src/api/app/service/` 以模块分组（如 `auth/`），包含 `*_service.py` 命名示例
   - [ ] `backend/app-api/src/api/app/schema/` 以模块分组（如 `auth/`），包含请求/响应 DTO 示例
   - [ ] `backend/app-api/pyproject.toml` 定义 `app-api = "api.app.main:main"` 的启动入口
   - [ ] `backend/app-api` 使用 `src/api` 作为 wheel packages（命名空间包路径一致）
   - [ ] `backend/app-api` 可启动并提供 `GET /health` 返回成功
   - [ ] workspace members 正确声明为 `["common-kernel", "app-api"]`（不包含 `agent-kernel`）
   - [ ] `app-api` 依赖包含数据库接入基线：`sqlalchemy[asyncio]>=2.0.46`、`asyncpg>=0.30.0`、`alembic>=1.17.0`

## Tasks / Subtasks

- [x] 建立 workspace 根与模块目录（AC: 1）
  - [x] 创建 `backend/pyproject.toml` 与 `backend/.python-version`（内容：`3.12`）
  - [x] 创建 `common-kernel` 目录与 `src/kernel/common/` 基础结构
- [x] 建立 app-api 基础结构（AC: 1）
  - [x] 创建 `app-api/src/api/app/` 与 `core/`、`deps/`、`router/`、`service/`、`schema/`
  - [x] 实现 `main.py` 与 `GET /health` 端点
  - [x] 确认 `app-api` 不创建 `models/` 包
- [x] 预留测试目录结构
  - [x] 创建 `backend/app-api/tests/` 目录与 `conftest.py`

## Dev Notes

- 目标：建立后端最小可运行骨架（uv workspace + FastAPI），为后续 Epic 的 API、认证、数据层实现提供结构基础。
- 技术栈固定：Python 3.12+、FastAPI（异步优先）、SQLAlchemy 2.0、PostgreSQL 16+（后续阶段接入）。
- 必须遵循框架与分层约束：app-api 直接导入 `arksou-kernel-framework` 的 Result/Code/BaseSchema/get_async_session/get_logger；公共模型从 `kernel.common` 导入。
- 数据隔离强制（ADR-014）：所有用户数据表必须包含 `account_id` 字段，数据访问必须通过 `IsolatedRepository` 基类；禁止 `session.execute(select(...))` 查询用户数据（仅作为后续实现规则，不在本 Story 完成）。
- 禁止重复实现框架能力：统一响应、异常体系、雪花 ID、事务管理、软删除、缓存/锁等均使用框架提供能力。
- 后端目录结构必须与 `architecture.md` 与 `project-context.md` 保持一致。
- 测试规范：禁止 Mock/Stub/Fake，后端测试使用 pytest + testcontainers（本 Story 不要求新增测试，但结构需预留）。
- 参考 `ai-native` 后端：使用 uv workspace + PEP 420 命名空间包，但本项目移除 `agent-kernel`。
- `core/clerk.py` 在后续 Epic 2 认证相关 Story 中创建，本 Story 不需要。
- 依赖安装前置条件（SSH）：确保已配置 SSH key 并加入 GitHub/GitLab；如使用别名，需在 `~/.ssh/config` 中配置 `github-arksou`；首次拉取可能需要确认主机指纹。
- 完成后检查：确保新建文件全部 `git add`，并验证 `.gitignore` 已包含 Python 忽略规则（`__pycache__/`、`.venv/`、`*.pyc`、`.pytest_cache/`）。

### 骨架代码参考（仅示意）

```python
# core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings."""
    app_name: str = "ai-builder-api"
    debug: bool = False

    class Config:
        env_file = ".env"

settings = Settings()
```

```python
# core/database.py
from arksou.kernel.framework.rdbms import get_async_session

__all__ = ["get_async_session"]
```

```python
# core/exceptions.py
from arksou.kernel.framework.base import register_exception_handlers

__all__ = ["register_exception_handlers"]
```

### 验证步骤（workspace 正确性）

```bash
cd backend
uv sync
uv pip list | grep arksou-kernel-framework
uv pip list | grep fastapi
python -c "from kernel.common import __version__; print(__version__)"
python -c "from api.app.main import create_app; print(create_app)"
```

### /health 响应格式

```json
{
  "code": 2000000,
  "data": { "status": "healthy" },
  "message": "success"
}
```

## Dev Agent Guardrails: Technical Requirements

- Python 版本必须 ≥ 3.12，使用 `.python-version` 文件锁定（内容为 `3.12`）。
- FastAPI 必须 ≥ 0.115.0，异步优先，数据库操作使用 `async/await`。
- SQLAlchemy 2.0 异步 ORM，PostgreSQL 16+ 为目标数据库（本 Story 建立结构与依赖）。
- 统一响应与异常体系使用 `arksou-kernel-framework v0.3.4` 提供能力，不得重复实现。
- 代码风格：所有函数参数与返回值必须有类型注解；使用 f-string；路径操作使用 `pathlib.Path`。

## Dev Agent Guardrails: Architecture Compliance

- 后端采用 uv workspace 分层结构：`backend/` 为根，成员为 `common-kernel` 与 `app-api`。
- `common-kernel` 仅承载公共模型/枚举/框架透传，不放业务逻辑与 Router；必须包含 models 以便后续复用。
- `app-api` 负责 FastAPI 应用，目录必须包含：`core/`、`deps/`、`router/`、`service/`、`schema/`。
- `app-api` **不创建** `models/` 包，所有模型统一放在 `common-kernel` 下并从 `kernel.common` 导入。
- `core/` 必须包含 `config.py`、`database.py`、`exceptions.py`（注意：`clerk.py` 在后续 Story 创建）。
- `deps/` 必须包含 `auth.py`、`database.py`。
- Router/Service/Schema 必须按模块分组，文件命名遵循 `*_service.py` 等约定。
- API 层禁止直接操作数据库；业务逻辑放在 service 层。

## Dev Agent Guardrails: Library & Framework Requirements

**依赖链：**
```
app-api → common-kernel → arksou-kernel-framework[all] v0.3.4
```

**common-kernel pyproject.toml 关键配置：**
```toml
[project]
name = "common-kernel"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "arksou-kernel-framework[all]",
]

[tool.uv.sources]
arksou-kernel-framework = { git = "ssh://git@github-arksou/arksou-Ltd/arksou-kernel-framework.git", tag = "v0.3.4" }

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/kernel"]
```

**app-api pyproject.toml 关键配置：**
```toml
[project]
name = "app-api"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "common-kernel",
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.34.0",
    "pydantic>=2.10.0",
    "pydantic-settings>=2.7.0",
    "httpx>=0.28.0",
    "python-multipart>=0.0.20",
    "sqlalchemy[asyncio]>=2.0.46",
    "asyncpg>=0.30.0",
    "alembic>=1.17.0",
    "pyjwt[crypto]>=2.10.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3.0",
    "pytest-asyncio>=0.25.0",
    "testcontainers[postgres]>=4.10.0",
    "coverage>=7.6.0",
]

[tool.uv.sources]
common-kernel = { workspace = true }

[project.scripts]
app-api = "api.app.main:main"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/api"]
```

**backend/pyproject.toml (workspace root)：**
```toml
[project]
name = "backend"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = []

[tool.uv.workspace]
members = [
    "common-kernel",
    "app-api",
]
```

## Dev Agent Guardrails: PEP 420 Namespace Packages

**关键规则：PEP 420 命名空间包**

| 目录层级 | __init__.py |
|---|---|
| `backend/common-kernel/src/` | ❌ 禁止 |
| `backend/common-kernel/src/kernel/` | ❌ 禁止 |
| `backend/common-kernel/src/kernel/common/` | ✅ 必须 |
| `backend/common-kernel/src/kernel/common/enums/` | ✅ 必须 |
| `backend/common-kernel/src/kernel/common/models/` | ✅ 必须 |
| `backend/app-api/src/` | ❌ 禁止 |
| `backend/app-api/src/api/` | ❌ 禁止 |
| `backend/app-api/src/api/app/` | ✅ 必须 |
| `backend/app-api/src/api/app/*` | ✅ 必须 |

**`kernel/common/__init__.py` 导出示例：**
```python
"""kernel.common - shared module.

Provides framework pass-throughs and shared definitions.
"""

# Exports added in later stories
# from kernel.common.enums import ...
# from kernel.common.models import ...

__version__ = "0.1.0"

__all__: list[str] = []
```

## Dev Agent Guardrails: File Structure Requirements

**完整目录结构：**
```
backend/
├── pyproject.toml                    # workspace root 配置
├── .python-version                   # 内容：3.12
├── common-kernel/
│   ├── pyproject.toml
│   ├── README.md
│   └── src/kernel/common/            # 包路径: kernel.common
│       ├── __init__.py               # 导出公共组件
│       ├── enums/
│       │   └── __init__.py
│       └── models/
│           └── __init__.py
└── app-api/
    ├── pyproject.toml
    ├── README.md
    ├── conftest.py                   # pytest 配置（预留）
    ├── tests/                        # 测试目录（预留）
    │   └── __init__.py
    └── src/api/app/                  # 包路径: api.app
        ├── __init__.py
        ├── main.py                   # FastAPI 入口 + health 端点
        ├── core/
        │   ├── __init__.py
        │   ├── config.py             # Settings 配置
        │   ├── database.py           # 数据库连接
        │   └── exceptions.py         # 异常处理器
        ├── deps/
        │   ├── __init__.py
        │   ├── auth.py               # 认证依赖（预留骨架）
        │   └── database.py           # 数据库会话依赖
        ├── router/
        │   ├── __init__.py
        │   └── auth/
        │       ├── __init__.py
        │       └── me.py             # /auth/me 路由示例
        ├── service/
        │   ├── __init__.py
        │   └── auth/
        │       ├── __init__.py
        │       └── auth_service.py   # 示例 service
        └── schema/
            ├── __init__.py
            └── auth/
                ├── __init__.py
                └── account.py        # 示例 schema
```

**禁止事项：**
- ❌ 禁止在 `app-api` 下创建 `models/` 目录
- ❌ 禁止在 `kernel/` 或 `api/` 顶层创建 `__init__.py`
- ❌ 禁止创建 `backend/common-kernel/src/__init__.py`
- ❌ 禁止创建 `backend/app-api/src/__init__.py`
- ❌ 禁止创建 `core/clerk.py`（后续 Story）

## Dev Agent Guardrails: Testing Requirements

- 严禁 Mock/Stub/Fake；测试必须使用真实依赖与真实数据库。
- 后端测试基线：pytest + testcontainers（PostgreSQL 16+）。
- 本 Story 预留测试目录结构：
  - `backend/app-api/tests/` 目录
  - `backend/app-api/tests/__init__.py`
  - `backend/app-api/conftest.py`（pytest 根配置）
- 测试依赖在 `[project.optional-dependencies].dev` 中声明。

## Project Context Reference

- 规则与技术栈基线：`_bmad-output/project-context.md`
- 架构决策：`_bmad-output/planning-artifacts/architecture.md`

## Story Completion Status

Status: review

Completion Note: Story 实现完成 - 所有 AC 验证通过

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

无调试问题记录

### Completion Notes List

- 2026-02-03: 验证并确认所有后端骨架结构已正确创建
- 2026-02-03: 修复 /health 端点使用框架统一响应格式 Result.success()
- 2026-02-03: 验证 PEP 420 命名空间包规则 - 禁止的 __init__.py 不存在
- 2026-02-03: 验证 workspace members 配置正确 ["common-kernel", "app-api"]
- 2026-02-03: 验证数据库依赖 sqlalchemy[asyncio], asyncpg, alembic 已配置
- 2026-02-03: 验证测试目录结构 tests/ 和 conftest.py 已预留
- 2026-02-03: 修复 database.py - 简化为直接导出框架 get_async_session（架构合规）
- 2026-02-03: 修复 exceptions.py - 直接导出框架 register_exception_handlers（架构合规）
- 2026-02-03: 更新 File List 与 git 实际变更一致，移除非路径条目

### File List

**新建文件：**
- backend/.python-version
- backend/pyproject.toml
- backend/uv.lock
- backend/app-api/conftest.py
- backend/app-api/pyproject.toml
- backend/app-api/README.md
- backend/app-api/src/api/app/__init__.py
- backend/app-api/src/api/app/main.py
- backend/app-api/src/api/app/core/__init__.py
- backend/app-api/src/api/app/core/config.py
- backend/app-api/src/api/app/core/database.py
- backend/app-api/src/api/app/core/exceptions.py
- backend/app-api/src/api/app/deps/__init__.py
- backend/app-api/src/api/app/deps/auth.py
- backend/app-api/src/api/app/deps/database.py
- backend/app-api/src/api/app/router/__init__.py
- backend/app-api/src/api/app/router/auth/__init__.py
- backend/app-api/src/api/app/router/auth/me.py
- backend/app-api/src/api/app/schema/__init__.py
- backend/app-api/src/api/app/schema/auth/__init__.py
- backend/app-api/src/api/app/schema/auth/account.py
- backend/app-api/src/api/app/service/__init__.py
- backend/app-api/src/api/app/service/auth/__init__.py
- backend/app-api/src/api/app/service/auth/auth_service.py
- backend/app-api/tests/__init__.py
- backend/common-kernel/pyproject.toml
- backend/common-kernel/README.md
- backend/common-kernel/src/kernel/common/__init__.py
- backend/common-kernel/src/kernel/common/enums/__init__.py
- backend/common-kernel/src/kernel/common/models/__init__.py

**修改文件：**
- .gitignore
