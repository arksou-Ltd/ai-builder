# Story 2.3: workspace-create

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 已登录用户,
I want 创建新的工作空间并命名,
so that 我可以在该工作空间中继续管理需求与仓库。

## Acceptance Criteria

### Core AC (must)

1. **Given** 用户已登录并进入工作空间列表页
   **When** 输入工作空间名称（1-50 字符）并点击创建
   **Then** 1 秒内显示新工作空间卡片。

2. **Given** 用户提交工作空间创建请求
   **When** 工作空间名称不合法（长度不在 1-50、仅空白、非法字符）或与本人现有工作空间重名
   **Then** 显示明确错误提示且不创建工作空间。

### Guardrail AC (must for architecture compliance)

3. **Given** 多用户并发使用系统
   **When** 任一用户创建或查看工作空间
   **Then** 只能操作和看到自己的工作空间数据（用户隔离必须生效）。

4. **Given** 前后端联调
   **When** 调用工作空间创建接口
   **Then** 响应必须符合 `Result[T]` 统一契约，未登录返回 `401`，重名返回 `409`。

## Tasks / Subtasks

### A. Backend Domain & API

- [ ] A0. 初始化 Alembic 数据库迁移基础设施（AC: 1）
  - [ ] 在 `backend/app-api/pyproject.toml` 添加测试依赖：`testcontainers[postgres]>=4.0.0`、`pytest-asyncio>=0.24.0`
  - [ ] 在 `backend/` 根目录执行 `alembic init -t async alembic` 初始化**异步**迁移目录（工作空间使用 `asyncpg` 驱动，**禁止使用默认同步模板**）
  - [ ] 配置 `alembic.ini` 的 `sqlalchemy.url` 从环境变量 `DB_*` 读取（与 `core/config.py` 一致）
  - [ ] 配置 `alembic/env.py`：
    - 设置 `target_metadata = SnowflakeAuditableBase.metadata`（从 `arksou.kernel.framework.rdbms` 导入）
    - **必须**在 `env.py` 中导入 `Workspace` 模型（如 `from kernel.common.models.workspace import Workspace`），否则 `autogenerate` 检测不到表
    - 异步 `run_migrations_online()` 使用 `AsyncEngine` + `run_sync`（async 模板已内置）
  - [ ] 生成首个迁移脚本：包含 `workspace_workspaces` 表结构
  - [ ] **验证**: `alembic upgrade head` 在本地/Supabase 数据库可执行无报错

- [ ] A1. 建立工作空间领域模型与持久化结构（AC: 1, 2, 3）
  - [ ] 在 `common-kernel` 新增工作空间模型：`models/workspace/workspace.py`
  - [ ] 模型类 `Workspace` 继承 `SnowflakeAuditableBase`（框架默认首选基类，含 `id` + `created_at` + `updated_at` + `created_by` + `updated_by`）
  - [ ] 表名 `workspace_workspaces`（遵循 `{module}_{entity}` 命名规范）
  - [ ] 字段：`name: Mapped[str]` (长度 50，可索引)、`owner_clerk_id: Mapped[str]` (Clerk 外部用户标识)
  - [ ] `owner_clerk_id` 值来源：`ClerkAccount.clerk_account_id`（当前 Account 实体未持久化，先用 Clerk ID 隔离，后续迁移为内部 `account_id`）
  - [ ] 复合唯一约束：`UniqueConstraint("owner_clerk_id", "name", name="uq_workspace_owner_name")`
  - [ ] 在 `models/workspace/__init__.py` 导出 `Workspace`，并在 `models/__init__.py` 重新导出：
    ```python
    # models/workspace/__init__.py
    from kernel.common.models.workspace.workspace import Workspace
    __all__ = ["Workspace"]

    # models/__init__.py（更新现有文件，将 Workspace 加入 __all__）
    from kernel.common.models.workspace import Workspace
    __all__ = ["Workspace"]
    ```
  - [ ] 保持模型与命名符合既有 snake_case 与模块分层规范
  - [ ] **注意**：`SnowflakeAuditableBase` 自带的 `created_by`/`updated_by` 字段用于审计追踪（记录"谁操作"），与 `owner_clerk_id` 不冲突 — `owner_clerk_id` 是业务级数据隔离主键（决定"谁拥有"）。`created_by`/`updated_by` 可为 nullable，由框架中间件或 Service 层按需填充

- [ ] A2. 实现工作空间创建与列表接口（AC: 1, 2, 3, 4）
  - [ ] 新增 `POST /api/v1/workspaces`：创建工作空间
  - [ ] 新增 `GET /api/v1/workspaces`：返回当前用户工作空间列表（支持前端首屏展示）
  - [ ] 使用 `CurrentClerkAccount` 注入身份，严禁信任前端传入 owner 字段
  - [ ] 使用 `DbSession` 注入数据库会话（来自 `deps/database.py`）
  - [ ] 所有响应与错误走框架 `Result[T]` + 异常体系
  - [ ] 路由注册：在 `routers/__init__.py` 添加 `router.include_router(workspace_router, prefix="/workspaces", tags=["工作空间"])`

  **具体文件与类名：**
  | 层级 | 文件路径 | 类/函数名 |
  | --- | --- | --- |
  | Schema | `schemas/workspace/workspace_schema.py` | `WorkspaceCreate(CamelCaseSchema)`、`WorkspaceResponse(CamelCaseSchema)` |
  | Service | `services/workspace/workspace_service.py` | `WorkspaceService` (类) 或模块级函数 |
  | Router | `routers/workspace/workspace_router.py` | `router = APIRouter()` |
  | 各目录 | `schemas/workspace/__init__.py` 等 | 导出公共 API |

- [ ] A3. 输入校验与错误语义（AC: 2, 4）
  - [ ] `WorkspaceCreate` Schema：`name: str = Field(min_length=1, max_length=50)`，`strip` 后不得为空（可用 `@field_validator` 或 Pydantic `BeforeValidator`）
  - [ ] 重名创建：捕获 `IntegrityError` → 抛出 `ConflictException`（框架自动映射为 `409 + Code.CONFLICT`）
  - [ ] 校验失败：Pydantic 自动返回 `422 + Code.INVALID_PARAMS`
  - [ ] 未登录：`CurrentClerkAccount` 依赖自动返回 `401 + Code.UNAUTHORIZED`
  - [ ] 记录结构化日志，避免泄露敏感信息

### B. Frontend Workspace UI & API Integration

- [ ] B0. 建立前后端 API 通信基础设施（AC: 1, 4）
  - [ ] **安装前端缺失依赖**（当前 `package.json` 中均未包含）：
    ```bash
    # shadcn/ui 组件（components/ui/ 目录当前为空）
    npx shadcn@latest add dialog button input skeleton sonner form label
    # 表单库（form 组件依赖这些包，shadcn add form 可能自动安装，确认后跳过手动安装）
    npm install react-hook-form zod @hookform/resolvers
    ```
  - [ ] **配置 Sonner Toast 全局 Provider**：在 `src/app/providers.tsx` 或 `src/app/layout.tsx` 中添加 `<Toaster />` 组件（来自 `@/components/ui/sonner`），否则 `toast.error()` 调用无效果
  - [ ] 在 `frontend/app-web/.env.local` 新增 `NEXT_PUBLIC_API_URL=http://localhost:8000`
  - [ ] 创建 API 客户端工具：`src/lib/api-client.ts`（**Client-side 专用**）
    - 封装 `fetch` 或使用轻量 HTTP 库
    - 请求拦截器：自动从 Clerk 获取 JWT 并注入 `Authorization: Bearer <token>`
    - **Token 获取策略**：`api-client.ts` 在 Client Component 中使用，token 通过 `useAuth().getToken()` 获取（React hook，仅客户端可用）；如需 Server Component 调用 API，使用 `auth().getToken()`（from `@clerk/nextjs/server`），但本 Story 的工作空间列表组件标记为 `"use client"` 即可
    - 响应拦截器：解析 `Result[T]` 统一结构，提取 `data` 或抛出业务错误
  - [ ] 创建工作空间相关 API 函数：`src/lib/api/workspaces.ts`
    - `createWorkspace(name: string): Promise<WorkspaceResponse>`
    - `listWorkspaces(): Promise<WorkspaceResponse[]>`
  - [ ] 可选：配合 `@tanstack/react-query` 封装 `useWorkspaces()` 和 `useCreateWorkspace()` hooks（**注意**：`QueryClientProvider` 已在 `providers.tsx` 中配置完毕，含默认选项：不自动窗口聚焦刷新、重试 1 次、缓存 5 分钟，无需重复配置）

- [ ] B1. 在 Dashboard 提供工作空间列表与创建入口（AC: 1）
  - [ ] 改造 `frontend/app-web/src/app/dashboard/page.tsx`：保留 `PerformanceMarker`，替换占位卡片为真实工作空间列表。**注意**：`PerformanceMarker` 依赖 header 中的 `data-testid="user-display-name"` 和 `data-testid="user-avatar"` 元素（位于 `layout.tsx` 中），改造 page.tsx 时不要移除或修改 layout.tsx 中的这些 `data-testid` 属性
  - [ ] 拆分组件结构（建议放在 `src/components/workspace/` 下）：
    - `WorkspaceList` — 工作空间列表容器（含加载态/空态/数据态三种状态）
    - `WorkspaceCard` — 单个工作空间卡片（显示工作空间名 + 创建时间）
    - `CreateWorkspaceDialog` — 创建工作空间弹窗
    - `WorkspaceEmptyState` — 空状态展示
  - [ ] 响应式网格布局：1 列（移动端） / 2 列（平板） / 3 列（桌面）

  **空状态设计规范：**
  - 图标：`FolderOpen`（来自 `lucide-react`，**禁止使用 emoji 作为图标**）
  - 标题：`开始您的第一个工作空间`
  - 描述：`创建工作空间并导入 GitHub 仓库，开始用自然语言实现需求`
  - CTA 按钮：`创建工作空间`（主色调，触发创建弹窗）
  - 布局：`py-16 text-center flex flex-col items-center gap-4`

- [ ] B2. 创建交互与反馈（AC: 1, 2）
  - [ ] 使用 shadcn/ui `Dialog` 组件，**受控模式**（`open` + `onOpenChange` 状态管理），Dialog 结构必须使用子组件：`DialogHeader` → `DialogTitle` + `DialogDescription`、`DialogFooter` → 提交按钮
  - [ ] 表单方案：使用 shadcn `Form` 组件系统（`Form` → `FormField` → `FormItem` → `FormLabel` + `FormControl` + `FormMessage`）+ `zodResolver`，**禁止绕过 shadcn Form 直接使用 raw react-hook-form**
  - [ ] 提交流程：
    1. 按钮进入 loading 态（`disabled + Spinner`）
    2. 调用 `POST /api/v1/workspaces`
    3. 成功 → 关闭 Dialog → 本地状态即时插入新卡片（或 `queryClient.invalidateQueries`）
    4. 失败 409 → Dialog 内表单下方显示 `role="alert"` 错误信息
    5. 失败 422 → 表单下方显示校验错误
    6. 网络异常 → Toast 提示（使用 shadcn/ui `Sonner`，自动消失 3-5 秒）
  - [ ] 可访问性：错误信息使用 `aria-live="polite"` 或 `role="alert"`
  - [ ] 加载态：列表首次加载时使用 `Skeleton` 组件（防止布局跳动）
  - [ ] 交互细节：所有可点击元素需 `cursor-pointer`，过渡动画 `150-300ms`，聚焦状态可见

### C. Data Isolation & Consistency

- [ ] C1. 强制用户数据隔离（AC: 3）
  - [ ] Service/Repository 查询默认按 `owner_clerk_id` 过滤
  - [ ] 禁止在 Router 层直接拼接 SQL 或绕过 Service/Repository

- [ ] C2. 命名与结构一致性（AC: 4）
  - [ ] 新增代码放入 `routers/`、`services/`、`schemas/` 的复数目录
  - [ ] 不新增 `router/`、`service/`、`schema/` 单数遗留目录

### D. Testing & Evidence (No Mock)

- [ ] D1. 后端集成测试（AC: 1, 2, 3, 4）
  - [ ] 覆盖创建成功、重名失败、非法名称失败、未登录 401
  - [ ] 覆盖跨用户隔离（A 用户创建，B 用户不可见/不可操作）
  - [ ] 使用 `testcontainers[postgres]` 提供真实 PostgreSQL 实例（禁止 mock/stub/fake）
  - [ ] 测试入口：`backend/app-api/tests/test_workspace.py`

  **测试基础设施完整参考（conftest.py 关键 fixture）：**
  ```python
  import pytest
  import httpx
  from httpx import ASGITransport
  from testcontainers.postgres import PostgresContainer
  from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
  from arksou.kernel.framework.rdbms import SnowflakeAuditableBase
  from arksou.kernel.framework.auth.clerk import ClerkAccount
  from api.app.deps.auth import get_clerk_account
  from api.app.deps.database import get_db

  # 1. PostgreSQL 容器（session 级别，所有测试共享）
  @pytest.fixture(scope="session")
  def postgres_container():
      with PostgresContainer("postgres:16-alpine") as pg:
          yield pg

  # 2. 异步引擎 + 建表
  @pytest.fixture(scope="session")
  async def async_engine(postgres_container):
      url = postgres_container.get_connection_url().replace("psycopg2", "asyncpg")
      engine = create_async_engine(url)
      async with engine.begin() as conn:
          await conn.run_sync(SnowflakeAuditableBase.metadata.create_all)
      yield engine
      await engine.dispose()

  # 3. 每个测试独立会话（事务回滚隔离）
  @pytest.fixture
  async def db_session(async_engine):
      session_factory = async_sessionmaker(async_engine, expire_on_commit=False)
      async with session_factory() as session:
          yield session

  # 4. 双用户身份 fixture（真实 ClerkAccount 实例，禁止 Mock）
  @pytest.fixture
  def clerk_account_a():
      return ClerkAccount(clerk_account_id="user_test_aaa", email="a@test.com")

  @pytest.fixture
  def clerk_account_b():
      return ClerkAccount(clerk_account_id="user_test_bbb", email="b@test.com")

  # 5. FastAPI 应用（含 dependency_overrides）
  @pytest.fixture
  def app(db_session, clerk_account_a):
      from api.app.main import create_app as build_app
      from api.app.core.config import settings
      application = build_app(settings, enable_redis=False)
      application.dependency_overrides[get_db] = lambda: db_session
      application.dependency_overrides[get_clerk_account] = lambda: clerk_account_a
      yield application
      application.dependency_overrides.clear()

  # 6. HTTP 客户端
  @pytest.fixture
  async def client(app):
      transport = ASGITransport(app=app)
      async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
          yield c

  # 注意: ASGITransport 不触发 lifespan，通过 enable_redis=False 跳过 Redis 初始化
  # 身份切换: 测试隔离时动态替换 dependency_overrides[get_clerk_account] 为 clerk_account_b
  ```

- [ ] D2. 前端手工验收（AC: 1, 2）
  - [ ] 登录后创建工作空间成功并即时可见
  - [ ] 重名/非法输入错误提示可见且不创建
  - [ ] 空状态正确展示（无工作空间时显示引导）
  - [ ] 页面刷新后数据一致
  - [ ] 响应式布局在移动端/平板/桌面均正常

## Dev Notes

### Scope Clarification

- 本 Story 聚焦"创建工作空间"最小闭环：创建 + 列表展示 + 错误提示 + 隔离约束。
- 不包含仓库导入（FR5）与删除工作空间（FR8），这些在后续 Story 独立实现。

### Current Codebase Snapshot

- 前端已具备 Clerk 登录态与受保护路由：`src/proxy.ts` + `dashboard/layout.tsx`。
- 后端已具备 Clerk JWT 鉴权依赖：`deps/auth.py`（`create_clerk_deps()`）。
- 后端已具备数据库会话依赖：`deps/database.py`（`create_db_deps()` → `get_db` / `DbSession`）。
- 当前 `common-kernel/models/` 和 `enums/` 为空占位（仅含 `__init__.py`），本 Story 将新增首个领域模型。**不要在 `enums/` 中创建文件**，本 Story 不需要枚举类型。
- 当前仓库**未初始化 Alembic**（无 `alembic/` 目录、无 `alembic.ini`），需在本 Story 首先建立。
- 前端**无 API 客户端基础设施**（无 fetch 封装、无 Clerk token 传递逻辑），需在本 Story 建立。
- `dashboard/page.tsx` 当前为占位内容（欢迎文本 + 3 张占位卡片 + `PerformanceMarker`）。

### Developer Context (Critical)

- 工作空间创建后"1 秒内可见"优先通过接口返回新对象 + 前端本地状态即时插入实现。
- 后端必须防止"同用户重名"与"跨用户越权访问"。
- 错误语义要稳定：校验失败 `422`、未登录 `401`、重名冲突 `409`。
- **框架异常自动映射 HTTP 状态码**：`ConflictException` → `409`、`NotFoundException` → `404`、`InvalidParamsException` → `422`，无需手动设置 `status_code`。
- **DbSession 注入**：Router 函数参数直接声明 `db: DbSession`，框架自动管理会话生命周期。
- **owner_clerk_id 来源**：`CurrentClerkAccount` → `account.clerk_account_id`（字段名为 `clerk_account_id`，不是 `id`）。
- **CORS 已就绪**：`BaseAppSettings` 默认 `cors_origins = ["http://localhost:3000"]`，前端开发服务器端口 3000，无需额外 CORS 配置。

## Dev Agent Guardrails: Technical Requirements

| Check Item | Requirement |
| --- | --- |
| Core Contract | 所有接口返回 `Result[T]`，异常走框架异常体系 |
| Auth Source | 用户身份仅来自 `CurrentClerkAccount`，禁止从请求体读取 owner |
| ORM Base | 模型继承 `SnowflakeAuditableBase`（来自 `arksou.kernel.framework.rdbms`） |
| Name Validation | 工作空间名严格 1-50 字符，`strip` 后不能为空 |
| Duplicate Rule | 同一用户下工作空间名唯一，必须由 DB 约束兜底（`UniqueConstraint`） |
| Error Mapping | `ConflictException` → 409、`InvalidParamsException` → 422、`UnauthorizedException` → 401 |
| Latency Goal | 创建成功后 1 秒内在 UI 可见新卡片 |

## Dev Agent Guardrails: Architecture Compliance

| Check Item | Requirement |
| --- | --- |
| Layering | Router 仅做编排，业务在 Service，数据访问在 Repository |
| Isolation | 查询与写入默认绑定当前用户（`owner_clerk_id` 维度） |
| Naming | 遵循 snake_case、模块化目录、复数目录规范 |
| Reuse First | 复用 `create_clerk_deps`、`Result`、框架异常，不重复造轮子 |
| Migration | Alembic 管理所有 DDL 变更，禁止手动执行 SQL 建表 |

## Dev Agent Guardrails: Library & Framework Requirements

| Area | Requirement |
| --- | --- |
| Frontend | `next@16.1.6` + `react@19.2.3` + `@clerk/nextjs@^6.37.1` + `@tanstack/react-query@^5.90.20` |
| Frontend UI | shadcn/ui (`Dialog` + `Button` + `Input` + `Skeleton` + `Sonner` + `Form` + `Label`) + `lucide-react` 图标 |
| Frontend Form | `react-hook-form` + `zod`（通过 `@hookform/resolvers/zod`） |
| Backend | `fastapi>=0.115.0` + `sqlalchemy[asyncio]>=2.0.46` + `pydantic>=2.10.0` + `alembic>=1.17.0` |
| Clerk Auth | 前端 `auth.protect()` / 后端 `CurrentClerkAccount` 既有模式 |
| Validation | 后端 Pydantic `Field(min_length/max_length)` + 前端 Zod `z.string().min().max()` |

## Dev Agent Guardrails: File Structure Requirements

- 后端新增路径：
  - `backend/common-kernel/src/kernel/common/models/workspace/workspace.py` — `Workspace` 模型
  - `backend/common-kernel/src/kernel/common/models/workspace/__init__.py` — 导出
  - `backend/app-api/src/api/app/schemas/workspace/workspace_schema.py` — `WorkspaceCreate` / `WorkspaceResponse`
  - `backend/app-api/src/api/app/services/workspace/workspace_service.py` — 业务逻辑
  - `backend/app-api/src/api/app/routers/workspace/workspace_router.py` — 路由定义
  - `backend/app-api/tests/test_workspace.py` — 集成测试
- 路由注册代码（在 `backend/app-api/src/api/app/routers/__init__.py`）：
  ```python
  from api.app.routers.workspace.workspace_router import router as workspace_router
  router.include_router(workspace_router, prefix="/workspaces", tags=["工作空间"])
  ```
- Alembic 初始化路径：
  - `backend/alembic.ini` — 迁移配置
  - `backend/alembic/` — 迁移脚本目录
- 前端新增路径：
  - `frontend/app-web/src/lib/api-client.ts` — API 客户端（Clerk token 注入 + Result[T] 解析）
  - `frontend/app-web/src/lib/api/workspaces.ts` — 工作空间 API 函数
  - `frontend/app-web/src/components/workspace/WorkspaceList.tsx` — 工作空间列表容器
  - `frontend/app-web/src/components/workspace/WorkspaceCard.tsx` — 工作空间卡片
  - `frontend/app-web/src/components/workspace/CreateWorkspaceDialog.tsx` — 创建弹窗
  - `frontend/app-web/src/components/workspace/WorkspaceEmptyState.tsx` — 空状态
- 前端改造文件：
  - `frontend/app-web/src/app/dashboard/page.tsx` — 替换占位内容为 `WorkspaceList` 组件

## Dev Agent Guardrails: Testing Requirements

| Check Item | Requirement |
| --- | --- |
| Non-Mock Policy | 严禁 mock/stub/fake/spy，必须真实依赖 |
| Test DB | 使用 `testcontainers[postgres]` 启动真实 PostgreSQL（非 SQLite） |
| Backend Priority | 先保证创建成功/失败语义，再补隔离与异常分支 |
| Isolation Tests | 至少覆盖 A/B 双用户的创建与列表隔离 |
| Frontend Evidence | 提供手工验收记录（成功、重名、非法输入、空状态四类） |
| ASGITransport 注意 | 不触发 lifespan，需手动初始化外部依赖；身份通过 `dependency_overrides` 注入真实 `ClerkAccount` 实例 |

## Dev Agent Guardrails: UI/UX Design Requirements

> 本节基于 `ui-ux-pro-max` 设计系统生成，所有界面实现必须遵循。

### Design System

| 维度 | 规范 |
| --- | --- |
| 风格 | Minimalism — 大量留白、简洁线条、内容优先 |
| 字体 | Inter（系统已配置） |
| 配色 | shadcn/ui 默认主题 — 主色 `primary`、背景 `background`、前景 `foreground` |
| 圆角 | `rounded-lg`（卡片）、`rounded-md`（按钮/输入框） |
| 阴影 | 最低限度 — 仅卡片悬停时 `shadow-sm` → `shadow-md` 过渡 |

### Component & Interaction Specs

| 组件 | 规范 |
| --- | --- |
| 工作空间卡片 | `border` + `rounded-lg` + `p-6`，悬停 `shadow-md` + `border-primary/20` 过渡（`transition-all duration-200 ease-out`），必须 `cursor-pointer`。**Easing 规范**：元素进入用 `ease-out`，元素退出用 `ease-in`，禁止使用 `linear` |
| 空状态 | `FolderOpen` SVG 图标（`w-12 h-12 text-muted-foreground`）+ 标题 + 描述 + CTA 按钮 |
| 创建弹窗 | shadcn `Dialog` 受控模式，结构：`DialogHeader`(`DialogTitle` "创建工作空间" + `DialogDescription`) → `Form`(`FormField` → `FormItem` → `FormLabel` + `FormControl`(`Input`) + `FormMessage`) → `DialogFooter`(提交 `Button`) |
| 表单验证 | shadcn `Form` + `zodResolver(formSchema)`，错误通过 `FormMessage` 自动显示在 Input 下方（`text-destructive text-sm`），**禁止手动 `{error && <span>}`** |
| 加载态 | 列表加载用 `Skeleton`（3 张卡片骨架），按钮提交用 `Loader2` 旋转图标 |
| Toast | shadcn `Sonner`，网络错误/意外错误使用 `toast.error()`，3-5 秒自动消失 |

### Accessibility Checklist

- [ ] 颜色对比度 ≥ 4.5:1（文本 vs 背景）
- [ ] 所有可交互元素有可见焦点环（`focus-visible:ring-2`）
- [ ] 表单 Input 关联 `<label>` 或 `aria-label`
- [ ] 错误信息使用 `role="alert"` 或 `aria-live="polite"`
- [ ] 触摸目标 ≥ 44x44px
- [ ] 尊重 `prefers-reduced-motion`（动画降级）：卡片悬停过渡、Dialog 打开动画、Skeleton 脉冲等需在 `@media (prefers-reduced-motion: reduce)` 下降级为瞬时切换或静态展示
- [ ] Tab 顺序与视觉顺序一致

### Anti-Patterns (Forbidden)

- ❌ 使用 emoji 作为 UI 图标（必须使用 `lucide-react` SVG 图标）
- ❌ 悬停时使用 `scale` 变换导致布局偏移
- ❌ 加载时无任何视觉反馈（必须有 Skeleton 或 Spinner）
- ❌ 静默吞错误（失败必须有用户可感知的反馈）
- ❌ 混用不同图标集或图标尺寸不一致

## Previous Story Intelligence

- 来自 Story 2.2：认证链路已稳定，继续复用 `CurrentClerkAccount`，不要新增第二套认证逻辑。
- 来自 Story 2.2：受保护 API 的未登录语义已统一为 `401 + Result`，本 Story 必须保持一致。
- 来自 Story 2.2：测试使用 `httpx.ASGITransport`，注意 lifespan 不触发问题；身份注入使用 `app.dependency_overrides` 传入真实 `ClerkAccount` 实例（**不是 Mock**）。
- 来自 Story 2.2：`monkeypatch` 可用于设置环境变量，但不可用于替换函数实现（违反 No-Mock 规则）。
- 来自 Story 2.1：`proxy.ts`（非 `middleware.ts`）已是 Next.js 16 规范，禁止回退。
- 来自 Story 2.1：前端错误反馈需可恢复、可访问（`aria-live`），避免静默失败。
- 来自 Story 2.1：`PerformanceMarker` 组件在 `dashboard/page.tsx` 中已存在，改造时需保留。

## Git Intelligence Summary

- 最近有效改动集中在认证链路与文档一致性（`proxy.ts`、`deps/auth.py`、webhook 安全）。
- 当前主线尚未落地工作空间模块，新增工作空间能力时应避免改动已稳定的 auth/webhook 逻辑。
- 近期提交强调"契约一致性与安全边界"，本 Story 应延续该风格：先契约、再功能。

## Latest Tech Information

- SQLAlchemy `UniqueConstraint` 适合实现"同用户工作空间名唯一"复合约束。
- Pydantic v2 使用 `Field(min_length/max_length)` + `@field_validator` 做字符串校验。
- shadcn/ui `Dialog` 推荐受控模式（`open` + `onOpenChange`），与 `react-hook-form` 搭配时在 `onOpenChange(false)` 中调用 `form.reset()`。

## Workspace Context Reference

- 必须遵循 `_bmad-output/project-context.md` 的框架基线：
  - `create_app()` 负责应用基础能力，不重复实现
  - `Result[T]` 与统一错误码为 API 唯一返回契约
  - 新增模块遵循 `routers/services/schemas` 分层
  - 禁止引入与现有身份链路冲突的新认证方案
  - 框架异常自动映射 HTTP 状态码，无需手动处理

### Workspace Structure Notes

- 本 Story 与现有结构对齐：前端在 `dashboard` 扩展，后端新增 `workspace` 模块分层目录。
- 架构文档中的 `account_id` 隔离原则在当前仓库尚未完整落地，本 Story 先以 `owner_clerk_id`（= `ClerkAccount.clerk_account_id`）强制隔离，并在后续账户实体持久化后平滑迁移。

### References

- `_bmad-output/planning-artifacts/epics.md`（Epic 2 / Story 2.3）
- `_bmad-output/planning-artifacts/prd.md`（FR4 工作空间创建）
- `_bmad-output/planning-artifacts/architecture.md`（Workspace Structure、ADR-007、ADR-008、ADR-014）
- `_bmad-output/planning-artifacts/ux-design-specification.md`（空状态、错误反馈、组件规范）
- `_bmad-output/implementation-artifacts/2-1-clerk-sign-in.md`（proxy 与前端认证路径）
- `_bmad-output/implementation-artifacts/2-2-sign-out.md`（Result 契约、401 语义、鉴权链路、测试 fixture）
- `_bmad-output/project-context.md`（框架 API 与反模式约束）

## Story Completion Status

Status: ready-for-dev

Completion Note: 二次 validate-create-story 质量验证通过 — 累计应用 25 项改进（首轮 12 + 二轮 13），含代码库实态交叉比对

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- 2026-02-10: create-story workflow 生成 Story 2.3 上下文与开发护栏
- 2026-02-10: validate-create-story 质量验证 — 发现 4 项关键缺失、5 项增强、3 项优化
- 2026-02-10: 应用全部改进：Alembic 初始化(C1)、前端 API 基础设施(C2)、SnowflakeAuditableBase 明确(C3)、testcontainers 测试策略(C4)、空状态 UX 细节(E1)、类名文件名明确(E2)、owner_clerk_id 映射(E3)、Dashboard 改造策略(E4)、路由注册代码(E5)、精简 Tech Info(O1)、测试 fixture 经验(O2)、框架实用提示(O3)
- 2026-02-10: 整合 UI/UX Pro Max 设计系统规范（Minimalism 风格、shadcn 组件规范、可访问性清单、交互设计规范）
- 2026-02-10: 二次 validate-create-story（代码库实态交叉比对）— 发现并应用 13 项改进：
  - C1: 补齐前端依赖安装步骤（shadcn/ui 组件 + react-hook-form + zod + @hookform/resolvers）
  - C2: 补齐 Sonner Toast 全局 `<Toaster />` Provider 配置
  - C3: 修正 Alembic 初始化为异步模板（`alembic init -t async`）
  - C4: 补齐 testcontainers + pytest-asyncio 开发依赖声明
  - C5: 提供完整 conftest.py fixture 模板（容器、引擎、会话、双用户身份、应用、客户端）
  - E1: 明确 Alembic env.py 的 metadata 导入路径和 Model 注册方式
  - E2: 说明 created_by/updated_by（审计）与 owner_clerk_id（隔离）的职责区分
  - E3: 明确 API 客户端 Client-side 专用策略和 token 获取方式差异
  - E4: 提供 models/__init__.py 导出代码示例
  - E5: 标注 PerformanceMarker 对 data-testid 的依赖关系
  - O1: 标注 QueryClientProvider 已配置就绪
  - O2: 确认 CORS 默认配置兼容前端端口
  - O3: 标注 enums/ 为空占位，禁止误创建文件
- 2026-02-10: ui-ux-pro-max 设计智能审查 — 补强 5 项 UI/UX 规范：
  - 补齐 shadcn Form 组件系统（Form/FormField/FormItem/FormControl/FormMessage/FormLabel）替代 raw react-hook-form
  - 补齐 shadcn `form` + `label` 组件安装
  - 明确 Dialog 子组件结构（DialogHeader/Title/Description/Footer）
  - 补充 easing 函数规范（ease-out 进入、ease-in 退出、禁止 linear）
  - 补充 prefers-reduced-motion 实现指导

### File List

- `_bmad-output/implementation-artifacts/2-3-workspace-create.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
