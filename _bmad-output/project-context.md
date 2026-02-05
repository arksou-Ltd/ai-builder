---
project_name: 'ai-builder'
user_name: 'Arksou'
date: '2026-02-02'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'code_quality', 'workflow_rules', 'critical_rules']
status: 'complete'
rule_count: 85
section_count: 7
optimized_for_llm: true
---

# Project Context for AI Agents

_此文件包含 AI 代理在此项目中实现代码时必须遵循的关键规则和模式。专注于代理可能会遗漏的非显而易见的细节。_

---

## Technology Stack & Versions

### Frontend (Next.js 16 + React 19)
- Next.js 16.x (App Router, SSR)
- React 19.x (Server Components)
- Tailwind CSS 4.x + shadcn/ui
- TypeScript 5.x (strict mode)
- Zustand 5.x (状态管理)
- TanStack React Query 5.x (数据获取)
- Clerk ^6.37.1 (认证)

### Backend (Python 3.12+ + FastAPI)
- Python ≥3.12 (类型注解必须)
- FastAPI ≥0.115.0 (异步优先)
- SQLAlchemy 2.0 (异步 ORM)
- PostgreSQL 16+ (数据库)
- Pydantic ≥2.10.0 (数据验证)
- arksou-kernel-framework v0.3.6 (基础框架)

### Critical Version Constraints
- arksou-kernel-framework 必须从 Git SSH 源安装 (v0.3.6)
- Python 必须 ≥3.12（使用 `.python-version` 锁定）
- 前后端完全分离，独立部署

---

## Critical Implementation Rules

### Language-Specific Rules

#### Python (后端)
- **类型注解必须**：所有函数参数和返回值必须有类型注解 (ANN 规则启用)
- **异步优先**：所有数据库操作使用 `async/await`，禁止同步阻塞
- **导入分层**：
  - 框架组件：`from arksou.kernel.framework.base import Result, Code, BaseSchema`
  - 公共模型：`from kernel.common.models import Account`
  - 公共枚举：`from kernel.common.enums import ProjectStatus`
- **字符串格式**：使用 f-string，禁止 `.format()` 或 `%` 格式化
- **路径操作**：使用 `pathlib.Path`，禁止 `os.path`
- **时区处理**：所有 datetime 必须使用 `timezone.utc`

#### TypeScript (前端)
- **严格模式**：TypeScript strict mode 必须启用
- **类型安全**：禁止 `any`（警告级别），使用 `unknown` + 类型守卫
- **未使用变量**：以 `_` 前缀标记有意忽略的参数
- **React Hooks**：遵循 exhaustive-deps 规则（警告级别）
- **导入顺序**：React → 第三方库 → 本地模块 → 样式

### Framework-Specific Rules

#### FastAPI (后端)

**arksou-kernel-framework v0.3.6 已提供能力（禁止重复实现）：**
- ✅ 统一响应格式 `Result[T]` + 7 位错误码 `Code`
- ✅ 异常体系 `BusinessException` (4xx) / `SystemException` (5xx)
- ✅ 雪花 ID 生成器 `IdGenerator`
- ✅ 自动事务管理 `get_async_session()`
- ✅ 实体基类 `SnowflakeAuditableBase` (id, created_at, updated_at, created_by, updated_by)
- ✅ 软删除 `SoftDeleteMixin`
- ✅ Redis 缓存装饰器 `@cacheable`, `@cache_evict`
- ✅ 分布式锁 `@lock`
- ✅ 结构化日志 `get_logger()` + 敏感信息脱敏

**分层架构：**
- `routers/` - API 路由层，按模块分组 (e.g., `routers/auth/me.py` → `/api/v1/auth/me`)
- `services/` - 业务逻辑层，`*_service.py` 命名
- `schemas/` - 请求/响应 Schema，按模块分组
- 数据模型统一放在 `kernel.common.models`（app-api 禁止创建 model/ 目录）

**数据隔离强制（ADR-014）：**
- 所有用户数据表必须包含 `account_id` 字段
- 所有数据访问必须通过 `IsolatedRepository` 基类
- 禁止直接使用 `session.execute(select(...))` 查询用户数据

#### Next.js (前端)

**App Router 模式：**
- 使用 `app/` 目录结构
- Server Components 默认，Client Components 需 `"use client"` 声明
- 路由文件：`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`

**认证集成 (Clerk)：**
- 使用 `@clerk/nextjs` 的 `<ClerkProvider>` 包装应用
- 使用 `auth()` (Server) 或 `useAuth()` (Client) 获取认证状态
- Clerk 登录 ≠ GitHub 仓库授权（两者分离）

**状态管理：**
- 全局状态：Zustand store
- 服务端数据：TanStack React Query
- 禁止 Redux 或其他状态库

### Testing Rules

#### 核心原则：严禁 Mock 测试 ⚠️

**禁止使用（违反将被立即拒绝）：**
- ❌ Mock 类 (MockDio, MockRepository, MockService, etc.)
- ❌ Mock 库 (mocktail, mockito, http_mock_adapter, etc.)
- ❌ Fake 实现（绕过真实逻辑）
- ❌ Stub 方法（返回硬编码值）
- ❌ 任何形式的测试替身 (mocks, stubs, spies, fakes)

**必须使用：**
- ✅ 真实数据库实例（后端使用 testcontainers PostgreSQL）
- ✅ 真实 HTTP 客户端调用真实端点
- ✅ 真实 Providers 和 StateNotifiers
- ✅ 真实文件 I/O（使用临时目录）
- ✅ 端到端集成测试

#### 后端测试 (pytest + testcontainers)

```python
# conftest.py 示例
@pytest.fixture(scope="session")
def postgres_container():
    """启动真实 PostgreSQL 容器"""
    with PostgresContainer("postgres:16-alpine") as postgres:
        yield postgres
```

- 单元测试：测试独立函数/类，使用真实依赖
- 集成测试：pytest + testcontainers（真实 PostgreSQL）
- API 测试：httpx + TestClient（完整 HTTP 请求流程）
- 覆盖率目标：≥80%

#### 测试文件组织
- 测试文件：`tests/` 目录
- 命名规范：`test_*.py`
- 按模块分组：`tests/auth/`, `tests/project/`, etc.

### Code Quality & Style Rules

#### 命名规范

**文件/文件夹命名：**
- Python：`snake_case` (e.g., `auth_service.py`)
- TypeScript：`kebab-case` 或 `PascalCase` (e.g., `user-profile.tsx`, `UserProfile.tsx`)
- 目录：`kebab-case` (e.g., `user-management/`)

**代码标识符：**
- 变量/函数：`snake_case` (Python) / `camelCase` (TypeScript)
- 类/类型：`PascalCase`
- 常量：`UPPER_SNAKE_CASE`
- 数据库表：`{module}_{entity}` 复数形式 (e.g., `auth_accounts`, `workflow_stories`)

#### Linting & Formatting

**后端 (Ruff)：**
- 行长度：88 字符
- 目标版本：Python 3.12
- 启用规则：E, W, F, I, N, UP, ANN, ASYNC, B, C4, PT, SIM, RUF
- 中文注释忽略：RUF001, RUF002, RUF003
- isort 配置：`known-first-party = ["common_kernel", "app_api"]`

**前端 (ESLint + Prettier)：**
- ESLint：继承 `next/core-web-vitals`, `next/typescript`
- Prettier：分号、双引号、2 空格缩进、尾逗号 es5
- 行宽：100 字符
- 插件：`prettier-plugin-tailwindcss`

#### Pre-commit Hooks
- 后端：Ruff check + Ruff format
- 前端：ESLint + Prettier
- 通用：trailing-whitespace, end-of-file-fixer, check-yaml, check-json

### Development Workflow Rules

#### Git Commit 规范

**格式：**
```
<type>(<layer:module>): <subject>

- <change_highlight_1>
- <change_highlight_2>
```

**Type 类型：**
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档
- `style`: 格式调整
- `refactor`: 重构
- `test`: 测试
- `build`: 构建/依赖

**Module 格式：**
- `backend:common-kernel` - 后端公共库
- `backend:app-api` - 后端 API 应用
- `frontend:app-web` - 前端 Web 应用
- `docs` - 文档

**示例：**
```
feat(backend:app-api): 实现用户认证接口

- 添加 Clerk JWT 验证依赖
- 实现 /api/v1/auth/me 端点返回当前用户信息
```

#### 分支策略
- 主分支：`main`
- 功能分支：`feature/<story-id>-<short-description>`
- 修复分支：`fix/<issue-id>-<short-description>`

#### PR 要求
- 标题：简洁描述变更（中文）
- 描述：包含变更摘要 + 测试计划
- 关联：Epic/Story 引用
- 审核：至少一人 Review

### Critical Don't-Miss Rules

#### 安全规则 ⚠️

**敏感数据处理：**
- GitHub Token：AES-256-GCM 加密存储
- AI API Key：AES-256-GCM 加密存储
- 禁止在日志中输出敏感信息（框架自动脱敏）
- 禁止在错误消息中暴露系统内部信息

**认证架构（双层分离）：**
- Clerk：用户身份认证（GitHub/Gmail/邮箱登录）
- GitHub OAuth：仓库操作授权（独立流程，仅 `repo` + `user:email` 权限）
- Clerk GitHub 登录 ≠ 仓库授权（两者完全独立）

#### 反模式（禁止）

**后端禁止：**
- ❌ 重复实现框架已提供的能力
- ❌ 直接使用 `session.execute()` 查询用户数据（绕过隔离）
- ❌ 同步阻塞操作
- ❌ 在 Router 层直接操作数据库
- ❌ 硬编码配置值

**前端禁止：**
- ❌ 使用 Pages Router
- ❌ 使用 Redux 或其他状态库
- ❌ 在 Server Components 中使用 hooks
- ❌ 直接存储敏感信息到 localStorage

**测试禁止：**
- ❌ 任何形式的 Mock/Stub/Fake
- ❌ 跳过集成测试
- ❌ 硬编码测试数据

#### 错误处理模式

**后端错误处理：**
```python
# 使用框架异常
from arksou.kernel.framework.base import BusinessException, NotFoundException

# 业务异常 (4xx)
raise BusinessException("用户未授权 GitHub 仓库访问")

# 资源不存在 (404)
raise NotFoundException(f"项目 {project_id} 不存在")
```

**API 响应格式（框架 Result[T] 输出）：**
```json
{
  "code": { "value": 2000000, "desc": "操作成功" },
  "data": { ... },
  "message": "",
  "request_id": "...",
  "timestamp": 1700000000
}
```

#### 边缘情况处理

**AI 服务：**
- 超时：120 秒全局超时
- 重试：自动重试 1 次
- 配置校验：工作流入口强制校验 AI 渠道配置

**GitHub API：**
- 限流：指数退避重试
- Token 过期：提示用户重新授权
- 权限不足：明确错误提示

**E2B 沙箱：**
- 创建失败：自动重试
- 状态恢复：基于最后快照
- 资源释放：Story 完成后销毁

---

## Project Structure Reference

```
ai-builder/
├── backend/                          # Python 后端 (uv workspace)
│   ├── pyproject.toml                # 工作区根配置
│   ├── .python-version               # Python 版本锁定 (3.12)
│   ├── alembic/                      # 数据库迁移
│   ├── common-kernel/                # 公共基础库
│   │   └── src/kernel/common/        # 包路径: kernel.common
│   │       ├── enums/                # 公共枚举
│   │       └── models/               # 公共数据模型
│   └── app-api/                      # FastAPI 应用
│       └── src/api/app/              # 包路径: api.app
│           ├── core/                 # 核心配置
│           ├── deps/                 # FastAPI 依赖注入
│           ├── routers/              # API 路由层
│           ├── services/             # 业务逻辑层
│           └── schemas/              # 请求/响应 Schema
├── frontend/                         # Next.js 前端
│   └── app-web/
│       ├── app/                      # App Router
│       ├── components/               # UI 组件
│       ├── lib/                      # 工具库
│       └── providers/                # Context Providers
├── docs/                             # 文档
├── .pre-commit-config.yaml           # Pre-commit 钩子
└── ruff.toml                         # Ruff 配置
```

---

## Usage Guidelines

**For AI Agents:**
- 在实现任何代码之前阅读此文件
- 严格遵循所有规则
- 如有疑问，选择更严格的选项
- 如发现新模式，建议更新此文件

**For Humans:**
- 保持此文件精简，专注于 AI 代理需求
- 技术栈变更时及时更新
- 每季度审查一次，移除过时规则
- 随着时间推移，移除变得显而易见的规则

---

_此文件由 BMAD generate-project-context 工作流生成于 2026-02-02_
