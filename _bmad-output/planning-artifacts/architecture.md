---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/product-brief-ai-builder-2026-01-31.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - 'docs/architecture-decision-record.md'
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-02-02T03:54:36Z'
validatedAt: '2026-02-02T13:00:00Z'
revalidatedAt: '2026-02-02T14:00:00Z'
validationResult: 'PASS'
p0GapsResolved: true
p1GapsResolved: true
documentConsistencyFixed: true
prdAlignmentFixed: true
totalADRs: 14
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

> ⚠️ **重要说明**：以下"历史技术栈"仅作参考记录，**实际实现以本文档后续"Starter Template Evaluation"章节和 ADR 决策为准**。

**~~历史技术栈~~（已废弃，仅作参考）：**

| 层级 | ~~历史选型~~ | 最终选型 |
|------|-------------|----------|
| 前端 | ~~Next.js 14/15 + Prisma~~ | **Next.js 16 + React 19** |
| 后端 | ~~Next.js API Routes / Node.js~~ | **Python 3.12+ + FastAPI** |
| 数据库 | ~~Prisma ORM~~ | **SQLAlchemy 2.0 (异步)** |
| 实时通信 | ~~Socket.io~~ | **WebSocket (FastAPI native)** |

**最终技术栈（唯一实现依据）：**

| 层级 | 技术 | 约束/依赖 |
|------|------|-----------|
| 前端 | Next.js 16 + React 19 + Tailwind 4 + shadcn/ui | App Router、SSR 能力 |
| 后端 | Python 3.12+ + FastAPI | 独立后端项目，异步 WebSocket |
| 认证 | Clerk | 支持 GitHub/Gmail/邮箱登录，JWT 离线验证 |
| 数据库 | PostgreSQL + SQLAlchemy 2.0 | 异步 ORM，自动事务管理 |
| 代码执行 | E2B Cloud Sandbox | 按需计费、150ms 冷启动 |
| 实时通信 | WebSocket (FastAPI native) | 流式输出、进度推送 |

**外部服务依赖：**

| 服务 | 用途 | 可用性要求 |
|------|------|------------|
| Clerk | 用户认证（GitHub/Gmail/邮箱登录） | P0 核心依赖 |
| GitHub API | OAuth 仓库授权、仓库操作、PR | P0 核心依赖 |
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
│           ├── routers/              # API 路由层 (按模块分组)
│           │   ├── __init__.py
│           │   └── auth/
│           │       ├── __init__.py
│           │       └── me.py         # /api/v1/auth/me 路由
│           ├── services/             # 业务逻辑层 (按模块分组)
│           │   ├── __init__.py
│           │   └── auth/
│           │       ├── __init__.py
│           │       ├── auth_service.py
│           │       └── account_service.py
│           ├── schemas/              # 请求/响应 Schema (按模块分组)
│           │   ├── __init__.py
│           │   └── auth/
│           │       ├── __init__.py
│           │       ├── account.py
│           │       └── enterprise.py
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
| **Router** | 按模块分组 | `routers/auth/me.py` |
| **表名** | `{module}_{entity}` 复数形式 | `auth_accounts`, `auth_enterprises` |
| **枚举** | PascalCase + str,Enum 继承 | `MembershipRole(str, Enum)` |

### Backend Dependencies

#### 依赖链路

```
app-api → common-kernel → arksou-kernel-framework[all] (版本见 pyproject.toml)
```

#### arksou-kernel-framework 完整模块

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
arksou-kernel-framework = { git = "ssh://git@github-arksou/arksou-Ltd/arksou-kernel-framework.git", tag = "<release-tag>" }

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
arksou-kernel-framework = { git = "ssh://git@github-arksou/arksou-Ltd/arksou-kernel-framework.git", tag = "<release-tag>" }
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

### Authentication & Authorization Architecture

#### 双层认证架构设计

本系统采用 **Clerk + GitHub OAuth 双层认证架构**：

| 层级 | 服务 | 职责 | 登录方式 |
|------|------|------|----------|
| **用户认证层** | Clerk | 用户身份认证、会话管理 | GitHub、Gmail、邮箱密码 |
| **仓库授权层** | GitHub OAuth | 仓库访问授权、代码操作权限 | OAuth 授权流程 |

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           用户认证层 (Clerk)                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                      │
│  │   GitHub    │  │   Gmail     │  │   邮箱密码   │                      │
│  │   登录      │  │   登录      │  │   登录      │                      │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                      │
│         └────────────────┼────────────────┘                             │
│                          ▼                                              │
│                   ┌─────────────┐                                       │
│                   │   Clerk     │ ──▶ JWT Token ──▶ Backend API 认证    │
│                   │   Session   │                                       │
│                   └─────────────┘                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 用户已登录
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         仓库授权层 (GitHub OAuth)                        │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  项目设置 → "连接 GitHub 仓库" → GitHub OAuth 授权流程            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                          │                                              │
│                          ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  授权成功 → 获取 GitHub Access Token → 加密存储                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                          │                                              │
│                          ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  仓库操作能力：                                                    │   │
│  │  ✅ Clone 仓库代码（到 E2B 沙箱）                                  │   │
│  │  ✅ 创建/切换分支                                                  │   │
│  │  ✅ Commit & Push 代码变更                                        │   │
│  │  ✅ 创建 Pull Request                                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

#### ADR-010: Clerk 认证配置

**决策：使用 Clerk 作为统一用户认证服务**

| 配置项 | 值 | 说明 |
|--------|-----|------|
| **支持的登录方式** | GitHub, Gmail, 邮箱密码 | Clerk Dashboard 配置 Social Connections |
| **JWT 验证方式** | JWKS 离线验证 | 不依赖 Clerk API 调用，低延迟 |
| **Session 管理** | Clerk 托管 | 自动处理刷新、过期、注销 |

**Clerk 登录方式说明：**

- **GitHub 登录**：通过 Clerk Social Connection 实现，仅用于身份认证，**不获取仓库权限**
- **Gmail 登录**：Google OAuth，用于身份认证
- **邮箱密码**：传统邮箱+密码登录

**重要区分：**
- Clerk 的 GitHub 登录 ≠ 仓库授权（仅认证身份，无 repo 权限）
- 仓库操作需要用户在项目设置中单独完成 GitHub OAuth 授权

#### ADR-011: GitHub OAuth 仓库授权

**决策：独立 GitHub OAuth 授权流程获取仓库操作权限**

```
用户流程：
1. 用户通过 Clerk 登录（任意方式）
2. 创建/进入项目 → 项目设置
3. 点击「连接 GitHub」→ 跳转 GitHub OAuth 授权页
4. 用户授权 → 回调获取 Access Token
5. 加密存储 Token → 关联到 Account
6. 后续仓库操作使用该 Token
```

**GitHub OAuth 权限范围 (Scopes)：**

| Scope | 用途 | 说明 |
|-------|------|------|
| `repo` | 仓库完整访问 | Clone、Push、创建分支、创建 PR |
| `user:email` | 读取用户邮箱 | 获取 GitHub 账号邮箱（用于关联） |

**最小权限原则：** 仅请求必要的 `repo` 和 `user:email` 权限（与 PRD FR2/NFR-S4 保持一致）。

> 📋 **与 PRD 对齐**：PRD 中 FR2 验收标准和 NFR-S4 均明确指定 `repo, user:email` 权限范围。

#### ADR-012: GitHub Token 安全存储

**决策：AES-256 加密存储 + 严格访问控制**

**Token 类型与存储：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `github_access_token` | 加密字符串 | OAuth Access Token（AES-256-GCM 加密） |
| `github_token_scope` | 字符串 | 授权范围（如 `repo,user:email`） |
| `github_user_id` | 整数 | GitHub 用户 ID |
| `github_username` | 字符串 | GitHub 用户名 |
| `github_token_expires_at` | 时间戳 | Token 过期时间（如有） |
| `github_authorized_at` | 时间戳 | 授权时间 |

**存储位置：** `auth_accounts` 表（与用户账号关联）

**安全措施：**

```python
# 加密存储
encrypted_token = aes_encrypt(
    plaintext=github_access_token,
    master_key=env.GITHUB_TOKEN_MASTER_KEY,  # 独立密钥
    algorithm="AES-256-GCM"
)

# 解密使用（仅在需要调用 GitHub API 时）
async def get_github_token(account_id: int) -> str:
    """获取解密后的 GitHub Token，仅在沙箱操作时调用"""
    account = await account_service.get_by_id(account_id)
    if not account.github_access_token:
        raise BusinessException("请先授权 GitHub 仓库访问")
    return aes_decrypt(account.github_access_token, env.GITHUB_TOKEN_MASTER_KEY)
```

**Token 生命周期管理：**

| 场景 | 处理方式 |
|------|----------|
| **Token 过期** | 提示用户重新授权 |
| **用户撤销授权** | 检测 401 响应，提示重新授权 |
| **用户主动断开** | 清除 Token 相关字段 |
| **账号注销** | 级联删除 Token |

#### 数据模型更新 (auth_accounts)

```python
class Account(SnowflakeAuditableBase):
    """账号实体 - 包含 Clerk 认证和 GitHub 授权信息"""

    __tablename__ = "auth_accounts"

    # Clerk 认证字段
    clerk_user_id: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False,
        comment="Clerk 用户 ID",
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False,
        comment="用户邮箱",
    )
    name: Mapped[str | None] = mapped_column(
        String(255), nullable=True,
        comment="用户显示名称",
    )
    is_deactivated: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False,
        comment="账号是否已停用",
    )

    # GitHub OAuth 授权字段（独立于 Clerk 登录）
    github_access_token: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="GitHub OAuth Access Token（AES-256 加密）",
    )
    github_token_scope: Mapped[str | None] = mapped_column(
        String(255), nullable=True,
        comment="GitHub Token 授权范围",
    )
    github_user_id: Mapped[int | None] = mapped_column(
        BigInteger, nullable=True, index=True,
        comment="GitHub 用户 ID",
    )
    github_username: Mapped[str | None] = mapped_column(
        String(255), nullable=True,
        comment="GitHub 用户名",
    )
    github_authorized_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
        comment="GitHub 授权时间",
    )
```

#### 后端认证依赖实现

```python
# deps/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
import jwt
from jwt import PyJWKClient

security = HTTPBearer()

# Clerk JWKS 客户端（缓存公钥）
jwks_client = PyJWKClient(
    f"https://{settings.CLERK_DOMAIN}/.well-known/jwks.json",
    cache_keys=True,
    lifespan=3600,  # 缓存 1 小时
)

async def get_current_account(
    token: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_async_session),
) -> Account:
    """验证 Clerk JWT Token 并返回 Account"""
    try:
        # JWKS 离线验证
        signing_key = jwks_client.get_signing_key_from_jwt(token.credentials)
        payload = jwt.decode(
            token.credentials,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.CLERK_AUDIENCE,
            issuer=f"https://{settings.CLERK_DOMAIN}",
        )
        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            raise HTTPException(status_code=401, detail="无效的认证令牌")

        # 查询或创建 Account
        account = await account_service.get_or_create_by_clerk_id(
            session, clerk_user_id, payload
        )
        return account

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="认证令牌已过期")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"认证令牌无效: {e}")


async def require_github_authorized(
    account: Account = Depends(get_current_account),
) -> Account:
    """要求用户已完成 GitHub 授权"""
    if not account.github_access_token:
        raise HTTPException(
            status_code=403,
            detail="请先在项目设置中授权 GitHub 仓库访问",
        )
    return account
```

### ADR-013: AI 配置校验机制（NFR-I3）

**决策：前置校验 + 运行时重校验 + 明确错误反馈**

#### 校验触发点

| 触发场景 | 触发条件 | 校验范围 |
|----------|----------|----------|
| **首次进入工作流** | 用户点击"开始 Story 开发" | 全量校验 |
| **配置变更后** | AI 渠道配置被修改 | 重置校验状态，下次使用时重新校验 |
| **运行时失败** | AI 调用返回 401/403/429 | 自动触发重校验 |
| **手动触发** | 用户点击"测试连接" | 全量校验 |

#### 校验项与实现

```python
# services/ai_channel_validator.py
from enum import Enum
from dataclasses import dataclass

class ValidationResult(Enum):
    SUCCESS = "success"
    CONNECTION_FAILED = "connection_failed"
    AUTH_FAILED = "auth_failed"
    QUOTA_EXHAUSTED = "quota_exhausted"
    MODEL_UNAVAILABLE = "model_unavailable"

@dataclass
class AiChannelValidation:
    """AI 渠道校验结果"""
    result: ValidationResult
    message: str
    validated_at: datetime | None = None

async def validate_ai_channel(channel: AiChannel) -> AiChannelValidation:
    """校验 AI 渠道配置有效性

    校验项：
    1. 连通性：能否建立 HTTP 连接
    2. 认证性：API Key 是否有效
    3. 可用性：模型是否可用
    """
    try:
        # 解密 API Key
        api_key = aes_decrypt(channel.encrypted_api_key, env.MASTER_KEY)

        # 根据渠道类型选择校验方式
        if channel.channel_type == ChannelType.CLAUDE_CODE:
            return await _validate_claude(channel.endpoint_url, api_key)
        elif channel.channel_type == ChannelType.CODEX:
            return await _validate_codex(channel.endpoint_url, api_key)

    except httpx.ConnectError:
        return AiChannelValidation(
            result=ValidationResult.CONNECTION_FAILED,
            message="无法连接 AI 服务，请检查网络或中转服务配置"
        )
    except httpx.HTTPStatusError as e:
        if e.response.status_code in (401, 403):
            return AiChannelValidation(
                result=ValidationResult.AUTH_FAILED,
                message="API Key 无效或已过期，请重新配置"
            )
        elif e.response.status_code == 429:
            return AiChannelValidation(
                result=ValidationResult.QUOTA_EXHAUSTED,
                message="AI 服务配额不足，请检查账户余额"
            )
        raise
```

#### 校验状态管理

```python
# 在 auth_ai_channels 表新增字段
class AiChannel(SnowflakeAuditableBase):
    """AI 渠道配置"""
    __tablename__ = "auth_ai_channels"

    # ... 现有字段 ...

    # 校验状态字段
    validation_status: Mapped[str | None] = mapped_column(
        String(50), nullable=True,
        comment="校验状态：success/connection_failed/auth_failed/quota_exhausted/model_unavailable"
    )
    validation_message: Mapped[str | None] = mapped_column(
        String(500), nullable=True,
        comment="校验结果消息"
    )
    validated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
        comment="最后校验时间"
    )
```

#### 工作流入口强制校验

```python
# deps/workflow.py
async def require_ai_channels_validated(
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_async_session),
) -> list[AiChannel]:
    """要求用户的 AI 渠道配置已通过校验

    强制规则：
    1. 必须至少配置一个 Claude Code 渠道（用于代码开发）
    2. 必须至少配置一个 Codex 渠道（用于需求对话/Review）
    3. 所有渠道必须在 24 小时内通过校验
    """
    channels = await ai_channel_service.get_by_account(session, account.id)

    # 检查必需渠道
    claude_channels = [c for c in channels if c.channel_type == ChannelType.CLAUDE_CODE]
    codex_channels = [c for c in channels if c.channel_type == ChannelType.CODEX]

    if not claude_channels:
        raise HTTPException(
            status_code=428,  # Precondition Required
            detail="请先配置 Claude Code 渠道（用于代码开发）"
        )
    if not codex_channels:
        raise HTTPException(
            status_code=428,
            detail="请先配置 Codex 渠道（用于需求对话和代码审查）"
        )

    # 检查校验状态
    now = datetime.now(timezone.utc)
    for channel in channels:
        needs_validation = (
            channel.validation_status != "success" or
            channel.validated_at is None or
            (now - channel.validated_at).total_seconds() > 86400  # 24小时
        )
        if needs_validation:
            # 触发重新校验
            result = await validate_ai_channel(channel)
            if result.result != ValidationResult.SUCCESS:
                raise HTTPException(
                    status_code=428,
                    detail=f"AI 渠道 [{channel.name}] 校验失败：{result.message}"
                )

    return channels
```

#### 前端交互规范

| 场景 | 用户反馈 | 操作引导 |
|------|----------|----------|
| **校验进行中** | 显示加载动画 + "正在验证 AI 服务配置..." | 禁用操作按钮 |
| **校验成功** | 绿色勾选 + "配置有效" | 允许进入工作流 |
| **连接失败** | 红色警告 + 具体错误消息 | 引导至"AI 渠道设置"页面 |
| **认证失败** | 红色警告 + "请更新 API Key" | 直接弹出配置修改弹窗 |
| **配额不足** | 黄色警告 + "配额不足" | 引导查看配额或切换渠道 |

### ADR-014: 用户数据隔离强制策略（NFR-S3）

**决策：ORM 层强制隔离 + 运行时审计 + 自动化测试验证**

#### 隔离原则

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         数据隔离三层防护                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Layer 1: ORM 层强制        所有查询自动注入 account_id 过滤条件          │
│  Layer 2: 运行时审计        关键操作记录审计日志                          │
│  Layer 3: 自动化测试        跨用户访问测试 100% 失败                      │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Layer 1: ORM 层强制隔离

**1. 用户数据表必须包含 `account_id` 字段**

```python
# 用户数据表清单（必须包含 account_id）
USER_DATA_TABLES = [
    "project_projects",
    "project_repositories",
    "workflow_epics",
    "workflow_stories",
    "workflow_story_snapshots",
    "auth_ai_channels",
]

# 排除表（系统表，无需 account_id）
SYSTEM_TABLES = [
    "auth_accounts",  # 账号表本身
    "alembic_version",  # 迁移版本
]
```

**2. 隔离基类 Repository**

```python
# repository/base.py
from typing import TypeVar, Generic
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")

class IsolatedRepository(Generic[T]):
    """用户数据隔离 Repository 基类

    强制规则：
    1. 所有查询自动注入 account_id 过滤
    2. 创建时自动设置 account_id
    3. 禁止跨用户数据访问
    """

    def __init__(self, model: type[T], session: AsyncSession, account_id: int):
        self.model = model
        self.session = session
        self.account_id = account_id

    async def get_by_id(self, id: int) -> T | None:
        """按 ID 查询（自动加 account_id 过滤）"""
        stmt = select(self.model).where(
            self.model.id == id,
            self.model.account_id == self.account_id  # 强制隔离
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_all(self, **filters) -> list[T]:
        """列表查询（自动加 account_id 过滤）"""
        stmt = select(self.model).where(
            self.model.account_id == self.account_id  # 强制隔离
        )
        for key, value in filters.items():
            stmt = stmt.where(getattr(self.model, key) == value)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, **data) -> T:
        """创建记录（自动设置 account_id）"""
        data["account_id"] = self.account_id  # 强制设置
        entity = self.model(**data)
        self.session.add(entity)
        await self.session.flush()
        return entity

    async def update(self, id: int, **data) -> T | None:
        """更新记录（自动验证 account_id）"""
        entity = await self.get_by_id(id)  # 已包含 account_id 过滤
        if entity is None:
            return None
        for key, value in data.items():
            setattr(entity, key, value)
        await self.session.flush()
        return entity

    async def delete(self, id: int) -> bool:
        """删除记录（自动验证 account_id）"""
        entity = await self.get_by_id(id)  # 已包含 account_id 过滤
        if entity is None:
            return False
        await self.session.delete(entity)
        return True
```

**3. Repository 工厂依赖注入**

```python
# deps/repository.py
from fastapi import Depends

async def get_project_repository(
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_async_session),
) -> IsolatedRepository[Project]:
    """获取项目 Repository（自动注入当前用户 account_id）"""
    return IsolatedRepository(Project, session, account.id)

async def get_epic_repository(
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_async_session),
) -> IsolatedRepository[Epic]:
    """获取史诗 Repository（自动注入当前用户 account_id）"""
    return IsolatedRepository(Epic, session, account.id)

# ... 其他 Repository 工厂 ...
```

#### Layer 2: 运行时审计

```python
# middleware/audit.py
from arksou.kernel.framework.logging import get_logger

logger = get_logger(__name__)

class DataAccessAuditMiddleware:
    """数据访问审计中间件

    记录所有数据访问操作，用于安全审计和问题排查。
    """

    @staticmethod
    def log_access(
        operation: str,
        table: str,
        account_id: int,
        entity_id: int | None = None,
        extra: dict | None = None,
    ):
        """记录数据访问日志"""
        logger.info(
            "data_access",
            operation=operation,
            table=table,
            account_id=account_id,
            entity_id=entity_id,
            extra=extra or {},
        )
```

#### Layer 3: 自动化测试验证

```python
# tests/test_data_isolation.py
import pytest
from httpx import AsyncClient

@pytest.fixture
async def user_a_client(test_app) -> AsyncClient:
    """用户 A 的认证客户端"""
    # ... 创建用户 A 并获取 token ...

@pytest.fixture
async def user_b_client(test_app) -> AsyncClient:
    """用户 B 的认证客户端"""
    # ... 创建用户 B 并获取 token ...

class TestDataIsolation:
    """数据隔离测试套件

    验证 NFR-S3：100% 请求仅返回当前用户数据
    """

    async def test_user_cannot_access_other_user_project(
        self, user_a_client: AsyncClient, user_b_client: AsyncClient
    ):
        """用户 A 无法访问用户 B 的项目"""
        # 用户 A 创建项目
        resp_a = await user_a_client.post("/api/projects", json={"name": "A的项目"})
        project_id = resp_a.json()["data"]["id"]

        # 用户 B 尝试访问用户 A 的项目
        resp_b = await user_b_client.get(f"/api/projects/{project_id}")

        # 必须返回 404（而非 403，避免信息泄露）
        assert resp_b.status_code == 404

    async def test_user_cannot_list_other_user_projects(
        self, user_a_client: AsyncClient, user_b_client: AsyncClient
    ):
        """用户 A 列表不包含用户 B 的项目"""
        # 用户 A 创建项目
        await user_a_client.post("/api/projects", json={"name": "A的项目"})

        # 用户 B 创建项目
        await user_b_client.post("/api/projects", json={"name": "B的项目"})

        # 用户 A 列表查询
        resp_a = await user_a_client.get("/api/projects")
        projects_a = resp_a.json()["data"]

        # 用户 A 只能看到自己的项目
        assert all(p["name"] != "B的项目" for p in projects_a)
        assert any(p["name"] == "A的项目" for p in projects_a)

    async def test_user_cannot_update_other_user_project(
        self, user_a_client: AsyncClient, user_b_client: AsyncClient
    ):
        """用户 A 无法更新用户 B 的项目"""
        # 用户 A 创建项目
        resp_a = await user_a_client.post("/api/projects", json={"name": "A的项目"})
        project_id = resp_a.json()["data"]["id"]

        # 用户 B 尝试更新用户 A 的项目
        resp_b = await user_b_client.put(
            f"/api/projects/{project_id}",
            json={"name": "被篡改的项目"}
        )

        # 必须返回 404
        assert resp_b.status_code == 404

    async def test_user_cannot_delete_other_user_project(
        self, user_a_client: AsyncClient, user_b_client: AsyncClient
    ):
        """用户 A 无法删除用户 B 的项目"""
        # 用户 A 创建项目
        resp_a = await user_a_client.post("/api/projects", json={"name": "A的项目"})
        project_id = resp_a.json()["data"]["id"]

        # 用户 B 尝试删除用户 A 的项目
        resp_b = await user_b_client.delete(f"/api/projects/{project_id}")

        # 必须返回 404
        assert resp_b.status_code == 404

        # 验证项目仍存在
        resp_a_check = await user_a_client.get(f"/api/projects/{project_id}")
        assert resp_a_check.status_code == 200
```

#### 禁止事项

| 禁止行为 | 原因 | 替代方案 |
|----------|------|----------|
| ❌ 直接使用 `session.execute(select(...))` | 绕过隔离 | 使用 `IsolatedRepository` |
| ❌ 使用原始 SQL 查询用户数据表 | 绕过隔离 | 使用 `IsolatedRepository` |
| ❌ 在 Service 层手动拼接 `account_id` | 容易遗漏 | 使用 `IsolatedRepository` |
| ❌ 在 Router 层直接操作数据库 | 绕过隔离 | 通过 Service + Repository |

#### 代码审查检查清单

- [ ] 所有用户数据表都包含 `account_id` 字段
- [ ] 所有数据访问都通过 `IsolatedRepository`
- [ ] 没有直接使用 `session.execute(select(...))` 查询用户数据
- [ ] 没有使用原始 SQL 查询用户数据表
- [ ] 数据隔离测试覆盖所有用户数据表的 CRUD 操作

### MVP Scope Decisions

| 决策项 | MVP 范围 | 说明 |
|--------|----------|------|
| CI/CD | ❌ 不包含 | MVP 阶段暂不考虑 |
| Docker 部署 | ⚠️ 可选 | 开发环境使用本地运行 |
| 监控告警 | ❌ 不包含 | 后续迭代添加 |
| 多环境配置 | ⚠️ 简化 | 仅 dev/prod 两个环境 |

## Architecture Validation Report

### Coherence Validation ✅

**Decision Compatibility（决策兼容性）：** ✅ 完全兼容

- 当前 `architecture.md` 内部的技术选型（Next.js 16 + React 19、FastAPI、PostgreSQL、E2B、WebSocket、Clerk）未发现直接互斥或明显冲突
- Clerk 认证 + GitHub OAuth 授权的双层架构设计职责清晰，无冲突
- 注意：`docs/architecture-decision-record.md` 仅作历史参考，`_bmad-output/planning-artifacts/architecture.md` 为唯一架构真源

**Pattern Consistency（模式一致性）：** ✅ 一致

- 目录结构、命名规范、错误处理、响应结构、WebSocket 消息类型等模式与所选技术栈匹配
- 认证/授权模式清晰：Clerk JWT → 身份认证，GitHub OAuth → 仓库操作权限
- Redis 用于 Pub/Sub（用于流式/多连接广播），MVP 阶段可选（单实例可不依赖）

**Structure Alignment（结构对齐）：** ✅ 对齐

- 后端/前端结构描述足以指导工程落地（模块边界、schemas/services/routers 分层清晰）
- 可以支撑工作流引擎、沙箱调度与实时推送

### Requirements Coverage Validation ✅

#### Functional Requirements Coverage（FR1–FR56）

按 PRD 功能域划分校验结果如下：

- **认证与项目管理（FR1–FR9）**：✅ 覆盖完整
  - 项目/仓库模型（ADR-003/ADR-007）覆盖良好
  - FR1–FR3（登录/授权状态/登出）：ADR-010（Clerk 认证）+ ADR-011（GitHub OAuth 授权）完整覆盖
- **AI 渠道配置（FR10–FR13）**：✅ 覆盖完整
  - 加密存储（ADR-006）与编排（ADR-001）覆盖
  - ADR-013 完整定义了 AI 配置校验机制（NFR-I3）：校验触发点、校验项、状态管理、前端交互
- **史诗/故事工作流（FR14–FR31）**：✅ 覆盖完整
  - 状态机（ADR-004）与持久化（ADR-007）覆盖良好
- **Git 操作与 PR（FR32–FR41）**：✅ 覆盖完整
  - 沙箱策略（ADR-002）覆盖核心流程
  - ADR-011（GitHub OAuth 授权）+ ADR-012（Token 存储）完整覆盖令牌获取/存储/权限范围
- **界面与交互（FR42–FR56）**：⚠️ 基本覆盖，P2 待完善
  - WebSocket + REST 混合（ADR-005/ADR-008）可支撑流式输出与进度更新
  - 首屏性能目标（NFR-P1）的工程策略未明确（见 P2 缺口 #5）

#### Non-Functional Requirements Coverage（NFR）

来自 PRD 的 NFR 条目（NFR-S1..S4 / NFR-I1..I3 / NFR-R1..R3 / NFR-P1..P2）覆盖情况：

- **Security（安全）**
  - ✅ NFR-S1（GitHub Token 加密存储）：ADR-012 已覆盖（AES-256-GCM 加密）
  - ✅ NFR-S2（AI API Key 加密存储）：ADR-006 已覆盖
  - ✅ NFR-S3（用户数据隔离）：ADR-014 已覆盖（ORM 层强制隔离 + 运行时审计 + 自动化测试）
  - ✅ NFR-S4（GitHub OAuth 最小权限）：ADR-011 已覆盖（仅 `repo` + `user:email`，与 PRD 一致）
- **Integration（集成）**
  - ✅ NFR-I1（GitHub API 失败优雅处理）：ADR-009 覆盖
  - ✅ NFR-I2（AI 服务失败处理）：ADR-001/ADR-009 覆盖
  - ✅ NFR-I3（AI 配置校验）：ADR-013 已覆盖（前置校验 + 运行时重校验 + 明确错误反馈）
- **Reliability（可靠性）**
  - ✅ NFR-R1（工作流状态持久化）：ADR-004 覆盖
  - ✅ NFR-R2（代码变更持久化）：ADR-002 的"临时分支/提交/推送"策略可覆盖
  - ✅ NFR-R3（异常恢复能力）：ADR-004/ADR-009 覆盖方向正确
- **Performance（性能）**
  - ⚠️ NFR-P1（首屏 < 3 秒）：未形成明确工程策略（P2）
  - ✅ NFR-P2（AI 超时 120 秒 + 反馈）：ADR-001/ADR-009 覆盖

### Implementation Readiness Validation ✅

**Decision Completeness（决策完整性）：** ✅ 已完备

- 已具备：编排、沙箱、状态机、实时通信、加密、数据模型、错误处理等关键决策
- ✅ 已补充：Clerk 认证（ADR-010）、GitHub OAuth 授权（ADR-011）、Token 安全存储（ADR-012）
- 所有 P0 阻塞问题已解决

**Structure Completeness（结构完整性）：** ✅ 已完备

- 结构描述可用于实现
- 后续建议（不阻塞实现）：明确"Redis 是否为 MVP 必需依赖"与"多实例部署下 WebSocket 广播策略"

**Pattern Completeness（模式完整性）：** ✅ 已完备

- 基本模式齐全
- ✅ ADR-013 定义了 AI 配置校验机制：校验触发点、校验项、状态管理
- ✅ ADR-014 定义了数据隔离强制策略：ORM 层强制、运行时审计、测试验证

### Gap Analysis Results

**P0（阻塞实现的缺口）：** ✅ 已全部解决

1. ~~**GitHub OAuth 与 Clerk 的关系未定（FR1–FR3, NFR-S4）**~~ ✅ **已解决**
   - ADR-010: Clerk 用于用户认证（支持 GitHub/Gmail/邮箱登录）
   - ADR-011: 独立 GitHub OAuth 用于仓库授权（repo 权限）
   - 明确区分：Clerk GitHub 登录 ≠ 仓库授权

2. ~~**GitHub Token 存储与加密未定（NFR-S1）**~~ ✅ **已解决**
   - ADR-012: AES-256-GCM 加密存储
   - Token 类型：GitHub OAuth Access Token
   - 存储位置：auth_accounts 表
   - 生命周期管理：过期、撤销、断开、注销

**P1（重要但不阻塞主干联通）：** ✅ 已全部解决

3. ~~**AI 配置校验机制缺失（NFR-I3）**~~ ✅ **已解决**
   - ADR-013：前置校验 + 运行时重校验 + 明确错误反馈
   - 校验触发点：首次进入工作流、配置变更后、运行时失败、手动触发
   - 校验项：连通性、认证性、可用性
   - 状态管理：`validation_status` + `validated_at` 字段

4. ~~**用户数据隔离强制策略缺失（NFR-S3）**~~ ✅ **已解决**
   - ADR-014：ORM 层强制隔离 + 运行时审计 + 自动化测试验证
   - `IsolatedRepository` 基类自动注入 `account_id` 过滤
   - 禁止直接使用 `session.execute(select(...))` 查询用户数据
   - 跨用户访问测试 100% 失败

**P2（后续增强项）：**

5. **首屏性能目标工程策略缺失（NFR-P1）**：需要明确前端缓存/拆包/SSR 边界与监测指标归属。

### Validation Issues Addressed

- ✅ 已确认：当前 `architecture.md` 内部决策完全自洽，可作为实现主参考
- ✅ P0 缺口已全部补齐：
  - ADR-010: Clerk 认证配置（支持 GitHub/Gmail/邮箱登录）
  - ADR-011: GitHub OAuth 仓库授权（独立于 Clerk 登录）
  - ADR-012: GitHub Token 安全存储（AES-256-GCM 加密）
- ⚠️ P1/P2 待后续迭代完善（不阻塞实现启动）

### Architecture Completeness Checklist

**✅ Requirements Analysis（需求分析）**

- [x] 已完成项目上下文分析
- [x] 已评估规模与复杂度
- [x] 已识别技术约束
- [x] 已映射横切关注点

**✅ Architectural Decisions（架构决策）**

- [x] 已记录关键决策（ADR-001 ~ ADR-014）
- [x] 已明确技术栈版本与选型
- [x] 已定义主要集成模式
- [x] 已定义错误处理与韧性策略
- [x] ~~未明确 GitHub 授权/令牌策略~~ ✅ ADR-010/011/012 已覆盖

**✅ Implementation Patterns（实现模式）**

- [x] 已建立命名规范
- [x] 已指定通信模式
- [x] 已记录流程性模式（超时/重试/错误提示等）
- [x] ~~未定义数据隔离的强制执行规则~~ ✅ ADR-014 已覆盖

**✅ Project Structure（项目结构）**

- [x] 已定义目录结构
- [x] 已建立边界与职责划分
- [x] 已映射集成点
- [ ] 未明确 Redis 依赖级别（P2，后续增强）

### Architecture Readiness Assessment

**Overall Status（总体状态）：** ✅ 可以进入实现阶段

**Confidence Level（信心等级）：** 高（所有 P0 阻塞问题已解决，架构决策完整）

**Key Strengths（主要优势）：**

- E2B 沙箱隔离 + 工作流状态机 + WebSocket 流式输出的主干架构完整
- 数据模型与核心实体关系清晰，能支撑多仓库与 Epic/Story 生命周期
- 安全/韧性方向明确（加密、超时、重试、限流）
- ✅ Clerk + GitHub OAuth 双层认证架构清晰，职责分离
- ✅ GitHub Token 安全存储方案完整（AES-256-GCM 加密）

**Areas for Future Enhancement（可后续增强）：**

- ~~P1：数据隔离与审计策略的制度化~~ ✅ ADR-014 已覆盖
- ~~P1：AI 配置校验机制~~ ✅ ADR-013 已覆盖
- P2：性能与多实例广播策略的工程化细化（NFR-P1）

### Implementation Handoff

架构已就绪，建议的实现优先级为：

1. **基础设施搭建**：项目骨架、Clerk 集成、数据库初始化
2. **认证授权流程**：Clerk JWT 验证 + GitHub OAuth 授权流程（ADR-010/011/012）
3. **核心工作流**：工作流状态机 + WebSocket 事件协议（覆盖 FR14–FR56 的主干联通）
4. **E2B 沙箱集成**：代码执行环境 + Git 操作

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

## Architecture Re-Validation (2026-02-02)

### Validation Summary ✅

- ✅ **P0 缺口复核**：Clerk 认证（支持 GitHub/Gmail/邮箱）+ GitHub OAuth 仓库授权 + GitHub Token AES-256-GCM 加密存储已形成闭环，可支撑 clone/branch/push/PR
- ✅ **文档一致性风险已修复**：Project Context Analysis 中的"历史技术栈表"已标注为废弃，明确最终技术栈为唯一实现依据
- ✅ **PRD 口径已对齐**：GitHub OAuth scopes 统一为 `repo + user:email`（与 PRD FR2/NFR-S4 一致）
- ✅ **P1 缺口已补齐**：ADR-013（AI 配置校验）+ ADR-014（数据隔离强制策略）形成可执行的强制规则

### Issues Found & Fixed

1. **Conflicting Stack References (High Risk) → ✅ FIXED**
   - 已将 `Project Context Analysis > Technical Constraints & Dependencies` 中的旧栈表标注为"~~历史/已废弃~~"
   - 新增"最终技术栈"表并声明"本文件后续 ADR 为唯一实现依据"

2. **OAuth Scopes Consistency (Medium Risk) → ✅ FIXED**
   - ADR-011 中的 scopes 已从 `repo + read:user` 更正为 `repo + user:email`
   - 与 PRD FR2（验收标准）和 NFR-S4（最小权限）保持一致

3. **AI 配置校验机制缺失 (P1) → ✅ FIXED**
   - ADR-013 定义了完整的校验机制：
     - 校验触发点：首次进入工作流、配置变更后、运行时失败、手动触发
     - 校验项：连通性、认证性、可用性
     - 状态管理：`validation_status` + `validated_at` 字段
     - 前端交互：加载动画、成功/失败反馈、操作引导

4. **数据隔离强制策略缺失 (P1) → ✅ FIXED**
   - ADR-014 定义了三层防护：
     - Layer 1: ORM 层强制（`IsolatedRepository` 基类自动注入 `account_id`）
     - Layer 2: 运行时审计（数据访问日志）
     - Layer 3: 自动化测试（跨用户访问测试 100% 失败）
   - 禁止事项清单 + 代码审查检查清单

### Final Validation Result

| 检查项 | 状态 | 说明 |
|--------|------|------|
| P0 缺口 | ✅ 全部解决 | ADR-010/011/012 覆盖认证授权 |
| P1 缺口 | ✅ 全部解决 | ADR-013/014 覆盖 AI 校验+数据隔离 |
| 文档一致性 | ✅ 已修复 | 旧栈已标废弃，新栈为唯一依据 |
| PRD 对齐 | ✅ 已对齐 | OAuth scopes = `repo + user:email` |
| 实现就绪 | ✅ 可进入 | P0/P1 无阻塞，仅 P2 后续增强 |

**验证结论：架构文档已完备（P0/P1 全部解决），可以进入 Epic/Story 创建阶段。**

## Architecture Re-Validation (Round 4)

### Summary ✅

- ✅ 一致性（Coherence）：历史技术栈已明确标注为废弃参考，最终技术栈与 ADR 决策保持一致
- ✅ 覆盖度（Coverage）：P0/P1 需求均有明确的架构决策与可执行实现约束（ADR-010 ~ ADR-014）
- ⚠️ 剩余增强项（P2）：NFR-P1（首屏 < 3 秒）仍需补充工程化策略（缓存/拆包/SSR 边界/指标归属）

### Final Decision

本次复核结论维持 **PASS**：允许进入后续 Epic/Story 拆解与实现阶段；P2 作为后续优化项进入待办即可。
