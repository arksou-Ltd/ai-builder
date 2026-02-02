---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/product-brief-ai-builder-2026-01-31.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - 'docs/architecture-decision-record.md'
workflowType: 'architecture'
project_name: 'ai-builder'
user_name: 'Arksou'
date: '2026-02-02'
---

# Architecture Decision Document - ai-builder

_此文档通过逐步协作发现来构建。各部分将随着我们一起完成每个架构决策而逐步添加。_

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

ai-builder 包含 56 个功能需求，覆盖完整的 PM → 代码 → PR 工作流：

| 类别 | 范围 | 架构意义 |
|------|------|----------|
| 认证与项目管理 | FR1-FR9 | GitHub OAuth 集成、多仓库项目结构 |
| AI 渠道配置 | FR10-FR13 | 多 AI 服务集成、密钥加密管理 |
| 史诗/故事工作流 | FR14-FR31 | 状态机驱动的工作流引擎、AI Agent 编排 |
| Git 操作与 PR | FR32-FR41 | E2B 沙箱内 Git 操作、PR 自动生成 |
| 界面与交互 | FR42-FR56 | 实时 UI 更新、流式 AI 输出、多步骤引导 |

**Non-Functional Requirements:**

| 类别 | 关键要求 | 架构决策驱动 |
|------|----------|--------------|
| 安全 | AES-256 加密、用户隔离、最小权限 | 密钥管理层、中间件隔离 |
| 集成 | 优雅失败、自动重试 | 断路器模式、重试策略 |
| 可靠性 | 状态持久化、异常恢复 ≥95% | 持久化层、状态恢复机制 |
| 性能 | 首屏 <3s、AI 超时 120s | SSR 优化、超时处理 |

**Scale & Complexity:**

- Primary domain: Full-Stack SaaS + AI Integration
- Complexity level: Medium-High
- Estimated architectural components: 15-20 个核心模块

### Technical Constraints & Dependencies

**已确认的技术选型（来自已有架构决策）：**

| 层级 | 技术 | 约束/依赖 |
|------|------|-----------|
| 前端 | Next.js 14/15 + Tailwind + shadcn/ui | App Router、SSR 能力 |
| 后端 | Next.js API Routes 或独立 Node.js 服务 | 需支持 WebSocket |
| 数据库 | PostgreSQL + Prisma | 关系型数据、ORM 抽象 |
| 代码执行 | E2B Cloud Sandbox | 按需计费、150ms 冷启动 |
| 实时通信 | Socket.io | 流式输出、进度推送 |

**外部服务依赖：**

| 服务 | 用途 | 可用性要求 |
|------|------|------------|
| GitHub API | OAuth、仓库操作、PR | P0 核心依赖 |
| E2B API | 沙箱创建/管理 | P0 核心依赖 |
| Codex API | 需求对话、Review | P0 核心依赖 |
| Claude Code | 代码开发 | P0 核心依赖 |

### Cross-Cutting Concerns Identified

1. **AI Agent 编排层**
   - Codex（Sage/Rex）和 Claude Code（Cody）的统一调度
   - Agent 状态管理和切换
   - 思考过程的实时流式传输

2. **实时通信架构**
   - AI 输出流式传输（Token-by-token）
   - 工作流进度实时更新
   - E2B 沙箱状态同步

3. **状态持久化与恢复**
   - 工作流状态机持久化
   - E2B 沙箱暂停/恢复机制
   - Git 临时分支作为安全网

4. **安全与隔离**
   - API Key 加密存储（AES-256）
   - 用户数据完全隔离
   - GitHub OAuth 最小权限

5. **错误处理与韧性**
   - 外部服务失败的优雅降级
   - AI 调用重试机制
   - 用户友好的错误反馈

## Starter Template Evaluation

### Technology Stack (用户确认)

根据用户明确要求，更新技术选型如下：

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | Next.js 16 + React 19 | App Router、Tailwind CSS 4、shadcn/ui |
| **后端** | Python 3.12+ + FastAPI | 独立纯后端项目，非全栈模板 |
| **认证** | Clerk | 替代直接 GitHub OAuth，JWT 离线验证 |
| **数据库** | PostgreSQL + SQLAlchemy 2.0 | 异步 ORM，自动事务管理 |
| **代码执行** | E2B Cloud Sandbox | 按需计费、150ms 冷启动 |
| **实时通信** | WebSocket (FastAPI native) | 流式输出、进度推送 |

### Project Structure (参考 ai-native)

```
ai-builder/
├── backend/                          # Python 后端 (uv workspace)
│   ├── pyproject.toml                # 工作区根配置
│   ├── .env                          # 环境变量配置
│   ├── .env.example                  # 环境变量示例
│   ├── .python-version               # Python 版本锁定 (3.12)
│   ├── alembic/                      # 数据库迁移目录
│   ├── alembic.ini                   # Alembic 配置
│   ├── common-kernel/                # 公共基础库
│   │   ├── pyproject.toml            # 依赖 arksou-kernel-framework
│   │   ├── README.md
│   │   └── src/kernel/common/        # 源码目录 (包路径: kernel.common)
│   │       ├── __init__.py
│   │       ├── py.typed              # PEP 561 类型标记
│   │       ├── enums/                # 公共枚举
│   │       │   ├── __init__.py
│   │       │   └── membership.py     # 示例: MembershipRole
│   │       └── models/               # 公共数据模型
│   │           ├── __init__.py
│   │           └── auth/             # 按模块分组
│   │               ├── __init__.py
│   │               ├── account.py
│   │               └── enterprise.py
│   └── app-api/                      # FastAPI 应用
│       ├── pyproject.toml            # 依赖 common-kernel
│       ├── README.md
│       └── src/api/app/              # 源码目录 (包路径: api.app)
│           ├── __init__.py
│           ├── main.py               # FastAPI 入口
│           ├── core/                 # 核心配置
│           │   ├── __init__.py
│           │   ├── config.py         # Settings 配置
│           │   ├── database.py       # 数据库连接
│           │   ├── clerk.py          # Clerk 认证配置
│           │   └── exceptions.py     # 异常处理器
│           ├── deps/                 # FastAPI 依赖注入
│           │   ├── __init__.py
│           │   ├── auth.py           # 认证依赖
│           │   └── database.py       # 数据库会话依赖
│           ├── router/               # API 路由层 (按模块分组)
│           │   ├── __init__.py
│           │   └── auth/
│           │       ├── __init__.py
│           │       └── me.py         # /auth/me 路由
│           ├── service/              # 业务逻辑层 (按模块分组)
│           │   ├── __init__.py
│           │   └── auth/
│           │       ├── __init__.py
│           │       ├── auth_service.py
│           │       └── account_service.py
│           ├── schema/               # 请求/响应 Schema (按模块分组)
│           │   ├── __init__.py
│           │   └── auth/
│           │       ├── __init__.py
│           │       ├── account.py
│           │       └── enterprise.py
│           └── model/                # app-api 特有模型 (通常为空)
│               └── __init__.py       # 核心模型在 kernel.common.models
├── frontend/                         # Next.js 前端
│   └── app-web/
│       ├── package.json
│       ├── app/                      # App Router
│       ├── components/               # UI 组件
│       ├── lib/                      # 工具库
│       └── providers/                # Context Providers
├── .pre-commit-config.yaml           # Pre-commit 钩子配置
├── ruff.toml                         # Ruff 配置（后端）
└── docs/                             # 文档
```

### 命名规范 (参考 ai-native)

| 类型 | 规范 | 示例 |
|------|------|------|
| **包目录** | 使用 `src/` 分离源码 | `src/kernel/common/`, `src/api/app/` |
| **模块包名** | snake_case | `kernel.common`, `api.app` |
| **wheel 打包** | `[tool.hatch.build.targets.wheel]` | `packages = ["src/kernel"]` |
| **数据模型** | 按模块分组 | `models/auth/account.py` |
| **Schema** | 按模块分组 + 用途后缀 | `AccountUpdate`, `AccountMeResponse` |
| **Service** | 按模块分组 + `_service` 后缀 | `auth_service.py`, `account_service.py` |
| **Router** | 按模块分组 | `router/auth/me.py` |
| **表名** | `{module}_{entity}` 复数形式 | `auth_accounts`, `auth_enterprises` |
| **枚举** | PascalCase + str,Enum 继承 | `MembershipRole(str, Enum)` |

### Backend Dependencies

#### 依赖链路

```
app-api → common-kernel → arksou-kernel-framework[all] v0.3.2
```

#### arksou-kernel-framework 完整模块 (v0.3.1)

框架提供 9 个独立模块，覆盖企业级 FastAPI 应用的所有基础设施需求：

| 模块 | 功能 | 核心组件 | 环境变量前缀 |
|------|------|----------|--------------|
| **BASE** | 统一响应/异常/分页 | `Result[T]`, `Code`, `ServiceException`, `BusinessException`, `NotFoundException`, `PageQuery`, `IdGenerator`, `BaseSchema`, `register_exception_handlers()` | - |
| **RDBMS** | 异步 ORM | `SnowflakeAuditableBase`, `AuditableBase`, `IntIdBase`, `SnowflakeBase`, `SoftDeleteMixin`, `EngineFactory`, `get_async_session()`, `Migration`, `IntEnumType` | `DB_` |
| **CACHE** | Redis 缓存 | `init_redis_pool()`, `get_redis_client()`, `@cacheable`, `@cache_put`, `@cache_evict`, `RedisService`, `SerializerFactory` | `REDIS_` |
| **LOCK** | 分布式锁 | `LockService`, `@lock`, `LockTimeoutError`, `LockAcquireError` | - |
| **AUTH** | JWT 认证 | `AuthService`, `TokenService`, `AuthDependencies`, `UserAuthMixin`, `hash_password()`, `verify_password()` | `JWT_` |
| **LOGGING** | 结构化日志 | `setup_logging()`, `get_logger()`, `setup_logging_middleware()`, `set_request_context()`, `set_user_context()` | `LOG_` |
| **OBSERVABILITY** | OpenTelemetry | `setup_observability()`, 分布式追踪, trace_id/span_id 注入 | `OTEL_` |
| **METRICS** | 指标收集 | `StructlogMetrics` | - |
| **NAMES** | 命名规范 | `CacheNames` (缓存键/锁键命名) | - |

**关键能力已由框架提供（禁止重复实现）：**

- ✅ 统一响应格式 `Result[T]` + 7 位错误码 `Code`
- ✅ 异常体系 `BusinessException` (4xx) / `SystemException` (5xx)
- ✅ 雪花 ID 生成器 `IdGenerator`
- ✅ 自动事务管理 `get_async_session()`
- ✅ 实体基类 `SnowflakeAuditableBase` (id, created_at, updated_at, created_by, updated_by)
- ✅ 软删除 `SoftDeleteMixin`
- ✅ 数据库迁移 `Migration` (Alembic 封装)
- ✅ Redis 缓存装饰器 `@cacheable`, `@cache_evict`
- ✅ 分布式锁 `@lock`
- ✅ JWT 认证全套 `AuthService`, `AuthDependencies`
- ✅ 密码加密 `hash_password()`, `verify_password()`
- ✅ 结构化日志 + 敏感信息脱敏
- ✅ 请求上下文自动注入 `request_id`
- ✅ OpenTelemetry 分布式追踪

#### common-kernel 定位 (参考 ai-native)

**核心职责：项目公共定义（模型、枚举）**

```
common-kernel/
├── pyproject.toml
├── README.md
└── src/kernel/common/               # 包路径: kernel.common
    ├── __init__.py                  # 导出公共组件
    ├── py.typed                     # PEP 561 类型标记
    ├── enums/                       # 公共枚举
    │   ├── __init__.py
    │   └── project.py               # ProjectStatus 等
    └── models/                      # 公共数据模型
        ├── __init__.py              # 统一导出
        └── auth/                    # 按模块分组
            ├── __init__.py
            └── account.py           # Account 实体
```

**pyproject.toml 配置：**

```toml
[project]
name = "common-kernel"
version = "0.1.0"
description = "公共基础库模块，承载 arksou-kernel-framework 透传与项目公共定义"
requires-python = ">=3.12"
dependencies = [
    "arksou-kernel-framework[all]",
]

[tool.uv.sources]
arksou-kernel-framework = { git = "ssh://git@github.com/arksou-Ltd/arksou-kernel-framework.git", tag = "v0.3.2" }

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/kernel"]
```

**`__init__.py` 导出示例：**

```python
"""kernel.common - 公共基础库模块。

承载 arksou-kernel-framework 透传与 ai-builder 项目公共定义。
"""

from kernel.common.enums import ProjectStatus
from kernel.common.models import Account

__version__ = "0.1.0"

__all__ = [
    # 枚举
    "ProjectStatus",
    # 模型
    "Account",
]
```

**数据模型示例 (`models/auth/account.py`)：**

```python
"""账号模型定义。"""

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from arksou.kernel.framework.rdbms import SnowflakeAuditableBase


class Account(SnowflakeAuditableBase):
    """账号实体。

    通过 clerk_user_id 与 Clerk 身份认证服务关联。
    继承自 SnowflakeAuditableBase，自动包含：
    id (雪花ID), created_at, updated_at, created_by, updated_by
    """

    __tablename__ = "auth_accounts"

    clerk_user_id: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
        comment="Clerk 用户 ID",
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
        comment="用户邮箱",
    )
    name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="用户显示名称",
    )
    is_deactivated: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="账号是否已停用",
    )
```

**禁止在 common-kernel 中：**
- ❌ 重新定义 Result/Code/Exception（使用框架提供的）
- ❌ 重新实现 ID 生成器（使用框架的 IdGenerator）
- ❌ 重新实现缓存/锁装饰器（使用框架的 @cacheable/@lock）
- ❌ 重新定义实体基类（使用框架的 SnowflakeAuditableBase）

**框架组件在 app-api 层直接导入：**

```python
# app-api 直接从框架导入
from arksou.kernel.framework.base import Result, Code, BaseSchema
from arksou.kernel.framework.rdbms import get_async_session
from arksou.kernel.framework.logging import get_logger

# 公共模型从 kernel.common 导入
from kernel.common.models import Account
from kernel.common.enums import ProjectStatus
```

#### backend/pyproject.toml (工作区根)

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

#### common-kernel/pyproject.toml

```toml
[project]
name = "common-kernel"
version = "0.1.0"
description = "公共基础库模块，承载 arksou-kernel-framework 透传与项目公共定义"
requires-python = ">=3.12"
dependencies = [
    "arksou-kernel-framework[all]",
]

[tool.uv.sources]
arksou-kernel-framework = { git = "ssh://git@github.com/arksou-Ltd/arksou-kernel-framework.git", tag = "v0.3.2" }
```

#### app-api/pyproject.toml

```toml
[project]
name = "app-api"
version = "0.1.0"
description = "FastAPI 主应用服务"
requires-python = ">=3.12"
dependencies = [
    "common-kernel",
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.34.0",
    "pydantic>=2.10.0",
    "pydantic-settings>=2.7.0",
    "httpx>=0.28.0",
    "python-multipart>=0.0.20",
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
```

### Frontend Dependencies

#### frontend/app-web/package.json

```json
{
  "name": "app-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --fix",
    "format": "prettier --write ."
  },
  "dependencies": {
    "@clerk/nextjs": "^6.37.1",
    "@tanstack/react-query": "^5.90.20",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.563.0",
    "next": "16.1.6",
    "next-intl": "^4.8.1",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "tailwind-merge": "^3.4.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "prettier": "^3.5.0",
    "tailwindcss": "^4",
    "tw-animate-css": "^1.4.0",
    "typescript": "^5"
  }
}
```

### Code Quality & Linting

#### Ruff 配置 (backend)

**重要：继承 arksou-kernel-framework 的 Ruff 配置风格**

项目根目录 `ruff.toml`（与框架保持一致）:

```toml
# Ruff 配置 - 与 arksou-kernel-framework 保持一致
# 参考：arksou-kernel-framework/pyproject.toml [tool.ruff]

line-length = 88
target-version = "py312"

extend-exclude = [
    "migrations",
    "__pycache__",
    ".venv",
    "venv",
    "build",
    "dist",
]

[lint]
select = [
    # 核心规则
    "E",      # pycodestyle errors
    "W",      # pycodestyle warnings
    "F",      # pyflakes
    "I",      # isort

    # 命名规范
    "N",      # pep8-naming

    # 现代化
    "UP",     # pyupgrade

    # 类型注解
    "ANN",    # flake8-annotations

    # 异步代码
    "ASYNC",  # flake8-async

    # Bug 预防
    "B",      # flake8-bugbear
    "A",      # flake8-builtins
    "C4",     # flake8-comprehensions
    "DTZ",    # flake8-datetimez
    "T10",    # flake8-debugger
    "EM",     # flake8-errmsg
    "PIE",    # flake8-pie
    "PT",     # flake8-pytest-style
    "SIM",    # flake8-simplify
    "ARG",    # flake8-unused-arguments
    "PTH",    # flake8-use-pathlib

    # Pylint
    "PL",     # Pylint

    # Ruff
    "RUF",    # Ruff-specific
]

ignore = [
    # 类型注解
    "ANN204",  # __init__ 等特殊方法不需要返回类型注解

    # 复杂度
    "PLR0913", # 允许超过 5 个参数
    "PLR0915", # 允许较多语句
    "PLR2004", # 允许魔法数字

    # Unicode（中文注释）
    "RUF001",
    "RUF002",
    "RUF003",

    # 异常消息
    "EM101",
    "EM102",

    # 其他
    "B008",    # FastAPI Depends
    "E501",    # 行长度（某些情况可读性更好）
    "N818",    # 异常类名不强制 Error 后缀
]

[lint.per-file-ignores]
"tests/**/*.py" = ["ANN", "ARG", "PLR2004", "S101"]
"__init__.py" = ["F401"]

[lint.isort]
known-first-party = ["common_kernel", "app_api"]
section-order = ["future", "standard-library", "third-party", "first-party", "local-folder"]
split-on-trailing-comma = true

[lint.pylint]
max-args = 8
max-branches = 15
max-returns = 8
max-statements = 60

[lint.mccabe]
max-complexity = 12
```

#### ESLint + Prettier 配置 (frontend)

`frontend/app-web/eslint.config.mjs`:

```javascript
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default eslintConfig;
```

`frontend/app-web/.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### Git Pre-commit Hooks

项目根目录 `.pre-commit-config.yaml`:

```yaml
# Pre-commit 配置
# 安装: pip install pre-commit && pre-commit install

repos:
  # Ruff - Python 代码检查与格式化
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.9.6
    hooks:
      # 运行 ruff linter
      - id: ruff
        name: ruff check
        args: [--fix]
        types_or: [python, pyi]
        files: ^backend/
      # 运行 ruff formatter
      - id: ruff-format
        name: ruff format
        types_or: [python, pyi]
        files: ^backend/

  # 通用文件检查
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: trailing-whitespace
        exclude: ^frontend/
      - id: end-of-file-fixer
        exclude: ^frontend/
      - id: check-yaml
        args: [--unsafe]
      - id: check-json
      - id: check-added-large-files
        args: ['--maxkb=1000']
      - id: check-merge-conflict
      - id: detect-private-key

  # 前端检查 (通过 npm scripts)
  - repo: local
    hooks:
      - id: frontend-lint
        name: ESLint (frontend)
        entry: bash -c 'cd frontend/app-web && npm run lint'
        language: system
        files: ^frontend/app-web/.*\.(ts|tsx|js|jsx)$
        pass_filenames: false
      - id: frontend-format
        name: Prettier (frontend)
        entry: bash -c 'cd frontend/app-web && npx prettier --check .'
        language: system
        files: ^frontend/app-web/.*\.(ts|tsx|js|jsx|json|css|md)$
        pass_filenames: false
```

#### Pre-commit 使用说明

```bash
# 安装 pre-commit
pip install pre-commit

# 安装 git hooks
pre-commit install

# 手动运行所有检查
pre-commit run --all-files

# 跳过钩子（仅紧急情况）
git commit --no-verify -m "message"
```

### Testing Strategy

#### 后端测试 (pytest + testcontainers)

**核心原则：真实测试，禁止 Mock**

| 测试类型 | 工具 | 说明 |
|----------|------|------|
| 单元测试 | pytest | 测试独立函数/类，使用真实依赖 |
| 集成测试 | pytest + testcontainers | 真实 PostgreSQL 容器 |
| API 测试 | httpx + TestClient | 测试完整 HTTP 请求流程 |
| 覆盖率 | coverage | 目标 ≥80% |

```python
# conftest.py 示例
import pytest
from testcontainers.postgres import PostgresContainer

@pytest.fixture(scope="session")
def postgres_container():
    """启动真实 PostgreSQL 容器"""
    with PostgresContainer("postgres:16-alpine") as postgres:
        yield postgres

@pytest.fixture(scope="session")
def database_url(postgres_container):
    """获取数据库连接 URL"""
    return postgres_container.get_connection_url()
```

#### 前端测试 (Chrome DevTools MCP)

| 测试类型 | 工具 | 说明 |
|----------|------|------|
| 组件测试 | Chrome DevTools MCP | AI Agent 驱动的 UI 验证 |
| E2E 测试 | Chrome DevTools MCP | 完整用户流程测试 |
| 可访问性 | Chrome DevTools | Lighthouse 审计 |

### Authentication (Clerk)

#### 认证架构

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Clerk         │     │   Backend       │
│   (Next.js)     │────▶│   (Auth)        │     │   (FastAPI)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       ▲
        │                       │ JWT                   │
        │                       ▼                       │
        │               ┌───��─────────────┐             │
        └──────────────▶│   API Request   │─────────────┘
                        │   + JWT Token   │
                        └─────────────────┘
```

#### 后端 JWT 验证

```python
# deps/auth.py
from clerk_backend_api import Clerk
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def get_current_account(token = Depends(security)):
    """验证 Clerk JWT Token"""
    # 使用 JWKS 离线验证
    # 返回 Account 信息（非 User，遵循命名规范）
    pass
```

### MVP Scope Decisions

| 决策项 | MVP 范围 | 说明 |
|--------|----------|------|
| CI/CD | ❌ 不包含 | MVP 阶段暂不考虑 |
| Docker 部署 | ⚠️ 可选 | 开发环境使用本地运行 |
| 监控告警 | ❌ 不包含 | 后续迭代添加 |
| 多环境配置 | ⚠️ 简化 | 仅 dev/prod 两个环境 |

## Architectural Decisions

### ADR-001: AI Agent 编排架构

**决策：采用「协调器 + 专用 Agent」模式**

```
┌─────────────────────────────────────────────────────────────────┐
│                      Workflow Coordinator                        │
│  (FastAPI Service - 工作流状态机 + Agent 调度)                    │
└─────────────────────────────────────────────────────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    Codex     │    │    Codex     │    │  Claude Code │
│   (Sage)     │    │   (Rex)      │    │   (Cody)     │
│ 需求对话/拆解 │    │  Code Review │    │   代码开发   │
└──────────────┘    └──────────────┘    └──────────────┘
```

| 决策项 | 方案 | 理由 |
|--------|------|------|
| Agent 调用方式 | 中转服务 URL + API Key | 用户自行配置，平台不持有 AI 合约 |
| 状态管理 | PostgreSQL 持久化 | 支持工作流暂停/恢复 |
| 流式输出 | WebSocket | 实时显示 AI 思考过程 |
| 超时处理 | 120s 全局超时 | AI 调用超时后可重试 |

### ADR-002: E2B 沙箱执行策略

**决策：每个 Story 独立沙箱 + 按需创建**

```
┌─────────────────────────────────────────────────────────────────┐
│                         Story 开发                               │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│  E2B Sandbox (per Story)                                         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐      │
│  │   Git Clone    │  │   代码生成     │  │   验证执行     │      │
│  │   (临时分支)    │  │   (Claude)     │  │   (测试/构建)  │      │
│  └────────────────┘  └────────────────┘  └────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
        │
        ▼
    Git Commit → Push → PR
```

| 决策项 | 方案 | 理由 |
|--------|------|------|
| 沙箱生命周期 | Story 开始创建，完成销毁 | 资源隔离，按需付费 |
| 代码存储 | 沙箱内临时分支 | 不污染主分支 |
| 暂停策略 | E2B Pause API | 支持 Story 中途保存 |
| 安全边界 | 沙箱内执行所有 Git 操作 | 隔离用户代码执行 |

### ADR-003: 多仓库项目架构

**决策：Project → Repository 一对多关联**

```
┌─────────────────────────────────────────────────────────────────┐
│  Project: 电商平台                                               │
│  ├── Repository: backend-api (Spring)                           │
│  ├── Repository: mobile-app (Flutter)                           │
│  └── Repository: web-admin (Next.js)                            │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│  Epic: 用户个人资料编辑                                          │
│  ├── Story: 后端 API 开发 → backend-api PR                       │
│  ├── Story: Flutter UI 开发 → mobile-app PR                      │
│  └── Story: Web 管理端开发 → web-admin PR                        │
└─────────────────────────────────────────────────────────────────┘
```

| 决策项 | 方案 | 理由 |
|--------|------|------|
| 仓库类型识别 | 根据 AGENTS.md/架构文档 | AI 自动学习项目规范 |
| Story 仓库绑定 | 一个 Story 对应一个仓库 | 简化 PR 管理 |
| 跨仓库关联 | Epic 级别 + PR 交叉引用 | 保持上下文完整 |

### ADR-004: 工作流状态机设计

**决策：有限状态机 + 持久化存储**

```
                    ┌──────────┐
                    │  Draft   │
                    └────┬─────┘
                         │ start
                         ▼
┌──────────┐       ┌──────────┐       ┌──────────┐
│ Blocked  │◄──────│ In Prog  │──────►│ Review   │
└──────────┘ block └────┬─────┘ submit└────┬─────┘
     │                   │                  │
     │ unblock           │ cancel           │ approve/reject
     ▼                   ▼                  ▼
┌──────────┐       ┌──────────┐       ┌──────────┐
│ In Prog  │       │ Cancelled│       │ Merged   │
└──────────┘       └──────────┘       └──────────┘
```

**Epic 状态：** `draft` → `active` → `completed`
**Story 状态：** `draft` → `in_progress` → `blocked` / `review` → `merged` / `cancelled`

| 决策项 | 方案 | 理由 |
|--------|------|------|
| 状态持久化 | PostgreSQL JSON 字段 | 灵活存储状态上下文 |
| 状态恢复 | 基于最后状态 + 沙箱快照 | 支持断点续做 |
| 并发控制 | 乐观锁 (version 字段) | 防止状态冲突 |

### ADR-005: 实时通信架构

**决策：FastAPI WebSocket + 消息队列**

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │     │  FastAPI    │     │   AI Agent  │
│  (React)    │◄───►│  WebSocket  │◄───►│  (Async)    │
└─────────────┘     └─────────────┘     └─────────────┘
        │                  │
        ▼                  ▼
   Zustand Store     Redis Pub/Sub
   (前端状态)         (消息广播)
```

| 消息类型 | 用途 | 格式 |
|----------|------|------|
| `workflow.step` | 工作流步骤更新 | `{step, status, progress}` |
| `ai.thinking` | AI 思考过程流式输出 | `{agent, content, delta}` |
| `sandbox.status` | E2B 沙箱状态 | `{sandbox_id, status}` |
| `error` | 错误通知 | `{code, message, recoverable}` |

### ADR-006: API Key 安全存储

**决策：AES-256 加密 + 用户隔离**

```python
# 加密流程
plaintext_key = "sk-ant-xxx..."
encrypted_key = aes_encrypt(plaintext_key, master_key=env.MASTER_KEY)
# 存储: auth_ai_channels.encrypted_api_key

# 解密流程 (仅在调用 AI API 时)
decrypted_key = aes_decrypt(encrypted_key, master_key=env.MASTER_KEY)
# 立即使用，不持久化明文
```

| 决策项 | 方案 | 理由 |
|--------|------|------|
| 加密算法 | AES-256-GCM | 业界标准，性能好 |
| 密钥管理 | 环境变量 MASTER_KEY | 简单有效，MVP 足够 |
| 密钥轮换 | 用户手动更新 | MVP 不需要自动轮换 |

### ADR-007: 数据库表设计

**核心实体关系：**

```
Account (1) ──────< Project (N)
    │                   │
    │                   └──< ProjectRepository (N)
    │                              │
    │                              └── repo_type: backend/flutter/nextjs
    │
    └──────< AiChannel (N)
                │
                └── channel_type: claude_code/codex

Project (1) ──────< Epic (N) ──────< Story (N)
                                        │
                                        └── repository_id → ProjectRepository
```

**表命名规范：**

| 模块 | 表名 | 说明 |
|------|------|------|
| auth | auth_accounts | 用户账号 |
| auth | auth_ai_channels | AI 渠道配置 |
| project | project_projects | 项目 |
| project | project_repositories | 项目仓库 |
| workflow | workflow_epics | 史诗 |
| workflow | workflow_stories | 用户故事 |
| workflow | workflow_story_snapshots | 故事快照 (状态恢复) |

### ADR-008: 前后端通信协议

**决策：RESTful API + WebSocket 混合**

| 通信类型 | 协议 | 用途 |
|----------|------|------|
| CRUD 操作 | REST API | 项目/Epic/Story 管理 |
| 实时更新 | WebSocket | AI 输出流、状态推送 |
| 文件上传 | REST Multipart | 未来：附件上传 |

**API 响应格式（使用 arksou-kernel-framework）：**

```json
{
  "code": 2000000,
  "data": { ... },
  "message": "success",
  "request_id": "01HN6Z8B9VJQK4YF6P7NR9WHK8",
  "timestamp": "2026-02-02T10:30:45.123456+00:00"
}
```

### ADR-009: 错误处理与恢复策略

**决策：分层错误处理 + 用户友好提示**

| 错误类型 | HTTP 状态码 | 恢复策略 |
|----------|-------------|----------|
| AI 超时 | 504 | 自动重试 1 次，提示用户重新触发 |
| GitHub API 限流 | 429 | 指数退避重试，显示等待时间 |
| E2B 沙箱失败 | 503 | 自动重建沙箱，恢复最后状态 |
| 业务异常 | 4xx | 显示用户友好错误信息 |
| 系统异常 | 5xx | 记录日志，显示通用错误 |

```python
# 异常处理示例
from arksou.kernel.framework.base import (
    BusinessException,
    NotFoundException,
    ConflictException,
)

class StoryInProgressException(ConflictException):
    """故事正在开发中，无法重复启动"""
    def __init__(self, story_id: int):
        super().__init__(f"故事 {story_id} 正在开发中")
```
