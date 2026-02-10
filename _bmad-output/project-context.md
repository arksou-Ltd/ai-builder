---
project_name: 'ai-builder'
user_name: 'Arksou'
date: '2026-02-10'
status: 'complete'
rule_count: 42
section_count: 6
optimized_for_llm: true
source_framework_version: 'arksou-kernel-framework v0.3.9'
source_framework_repo: '/Users/itian/Project/arksou-kernel-framework'
---

# Project Context for AI Agents

> ai-builder 项目技术栈、框架 API 参考和实现模式。编码前必读。

---

## Technology Stack & Versions

### Backend
Python `>=3.12` · FastAPI `>=0.115.0` · SQLAlchemy `>=2.0.46` (asyncio) · asyncpg `>=0.30.0` · Alembic `>=1.17.0` · Pydantic `>=2.10.0` · httpx `>=0.28.0` · svix `>=1.60.0`

### Frontend
Next.js `16.1.6` (App Router) · React `19.2.3` · TypeScript `^5` · Clerk `^6.37.1` · TanStack Query `^5.90.20` · Zustand `^5.0.11` · next-intl `^4.8.1` · Tailwind CSS `^4`

### Framework Baseline
`common-kernel` → `arksou-kernel-framework[all]` (rdbms + cache + security + jwks + clerk + webhook)
固定来源: `ssh://git@github-arksou/arksou-Ltd/arksou-kernel-framework.git` · 固定标签: `v0.3.9`

### Critical Version Constraints
- 禁止将框架切换为 PyPI 来源或浮动分支
- 升级框架版本必须同步更新本文件 API 约束
- 前后端独立部署、独立依赖管理

---

## Framework API Reference (v0.3.9)

### Quick Import Table

| 需要什么 | 从哪导入 |
|----------|----------|
| `create_app`, `BaseAppSettings` | `arksou.kernel.framework.app` |
| `Result`, `Code`, 异常类, `PageQuery`, `IdGenerator` | `arksou.kernel.framework.base` |
| `BaseSchema`, `CamelCaseSchema` | `arksou.kernel.framework.base` |
| `RedisService`, `create_redis_deps`, 缓存装饰器 | `arksou.kernel.framework.cache` |
| ORM 基类, `create_db_deps`, `SoftDeleteMixin` | `arksou.kernel.framework.rdbms` |
| `ClerkSettings`, `ClerkAccount`, `create_clerk_deps` | `arksou.kernel.framework.auth.clerk` |
| `JWKSConfig`, `SessionRevocation` | `arksou.kernel.framework.auth` |
| `SvixWebhookVerifier` | `arksou.kernel.framework.webhook` |
| `lock`, `LockService`, 锁异常 | `arksou.kernel.framework.lock` |
| `CacheNames` | `arksou.kernel.framework.names` |

### App Module

**`create_app()` 工厂函数:**
```python
def create_app(
    settings: BaseAppSettings, *,
    routers: Sequence[APIRouter] = (),
    enable_redis: bool = True,       # False 可禁用 Redis (烟雾测试)
    enable_cors: bool = True,
    enable_health: bool = True,
    worker_id: int = 1,              # 雪花 ID 工作节点
    datacenter_id: int = 1,          # 雪花 ID 数据中心
    on_startup: Sequence[Callable] = (),
    on_shutdown: Sequence[Callable] = (),
    **fastapi_kwargs: object,        # title, version, description, docs_url 等
) -> FastAPI
```
自动配置: structlog · IdGenerator · Redis 连接池 · CORS · 请求日志中间件 · 全局异常处理器 · `/health`。**禁止重复实现这些能力。**

**`BaseAppSettings` 字段分组:**

| 分组 | 字段 | 默认值 |
|------|------|--------|
| 应用 | `app_name`, `app_env`, `debug` | `"my-app"`, `"development"`, `False` |
| Redis | `redis_host`, `redis_port`, `redis_db`, `redis_password`, `redis_ssl` | `"localhost"`, `6379`, `0`, `""`, `False` |
| Redis 键 | `redis_project_name` (空=app_name), `redis_module_name` | `""`, `"api"` |
| CORS | `cors_origins`, `cors_allow_credentials`, `cors_allow_methods/headers` | `["http://localhost:3000"]`, `True`, `["*"]` |
| 方法 | `get_redis_config() -> RedisConfig` | — |

`Settings` 继承 `BaseAppSettings` 后仅需增量声明应用特有字段。

### Base Module

**`Result[T]`** — 统一 API 返回:
- 字段: `code: Code` · `data: T | None` · `message: str` · `request_id: str` (ULID) · `timestamp: int` (UTC)
- 类方法: `Result.success(data=..., message=...)` · `Result.error(code, message)` · `Result.fail(code, message)`

**`Code`** — 7 位统一错误码:

| 分组 | 码值 | 名称 |
|------|------|------|
| 2xx | `2000000` | `SUCCESS` |
| 4xx | `4000000` · `4010000` · `4011001` · `4011006` | `BAD_REQUEST` · `UNAUTHORIZED` · `LOGIN_FAILED` · `TOKEN_EXPIRED` |
| 4xx | `4030000` · `4040000` · `4090000` · `4220001` · `4290000` | `FORBIDDEN` · `NOT_FOUND` · `CONFLICT` · `INVALID_PARAMS` · `TOO_MANY_REQUESTS` |
| 5xx | `5000000` · `5000001` | `INTERNAL_ERROR` · `SERVICE_ERROR` |
| 5xx Cache | `5030000` · `5030001` · `5030002` · `5030003` | `CACHE_ERROR` · `CACHE_CONNECTION_ERROR` · `CACHE_SERIALIZATION_ERROR` · `CACHE_DESERIALIZATION_ERROR` |
| 5xx Lock | `5030010` · `5030011` · `5030012` · `5030013` | `LOCK_ERROR` · `LOCK_TIMEOUT_ERROR` · `LOCK_ACQUIRE_ERROR` · `LOCK_RELEASE_ERROR` |

**异常层次树:**
```
ServiceException(code, message, http_status?, extra?)
├── BusinessException (4xx)
│   ├── UnauthorizedException      # 401
│   ├── ForbiddenException         # 403
│   ├── NotFoundException          # 404
│   ├── ConflictException          # 409
│   ├── InvalidParamsException     # 422
│   └── TooManyRequestsException   # 429
└── SystemException (5xx)
    ├── InternalServerException    # 500
    └── ServiceUnavailableException # 503
```

**Schema 基类:**
- `BaseSchema`: `from_attributes=True` · `populate_by_name=True` · IntEnum→小写名称 · datetime→ISO 8601 UTC
- `CamelCaseSchema(BaseSchema)`: 自动 snake_case ↔ camelCase 转换

**`PageQuery`**: `page: int` (≥1) · `sort: str | None` (DSL: `"field1:asc,field2:desc"`) · `offset` 属性 · `MAX_LIMIT=100`

**`IdGenerator`**: `.configure(worker_id, datacenter_id)` → `.next() -> int` (64 位雪花 ID)

### Auth Module

**`ClerkSettings(BaseSettings)`**: `publishable_key` · `secret_key` · `jwks_url` · `jwt_issuer` · `jwt_audience` · `webhook_secret` · `.to_jwks_config() -> JWKSConfig`

**`ClerkAccount` dataclass**: `clerk_account_id: str` · `email: str?` · `first_name: str?` · `last_name: str?` · `sid: str?` (会话 ID)

**`create_clerk_deps(jwks_config_getter, redis_service_getter) -> (get_clerk_account, CurrentClerkAccount)`**
自动完成: JWKS 验签 + 会话撤销检查。

**`JWKSConfig`**: `jwks_url` · `issuer` (**强制**) · `audience` · `algorithms=["RS256"]` · `max_token_lifetime=86400` · `clock_skew=60` · `jwks_cache_lifespan=3600`

**`SessionRevocation(redis_service, ttl=86400)`**: `.revoke(session_id)` · `.is_revoked(session_id)` — 键格式通过 `CacheNames.session()` 生成。

### Webhook Module

**`SvixWebhookVerifier(secret)`**: `.verify(payload, headers)` — 验证 svix-id/svix-timestamp/svix-signature，失败抛 `UnauthorizedException`。

### Cache Module

**`RedisService` 方法表:**

| 方法 | 签名 | 说明 |
|------|------|------|
| `get` | `(cache_name) -> object?` | 获取缓存 |
| `set` | `(cache_name, value, ttl?, *, nx=False) -> bool` | 设置缓存 (nx=仅不存在时) |
| `delete` | `(cache_name) -> int` | 删除缓存 |
| `exists` | `(cache_name) -> bool` | 检查是否存在 |
| `expire` | `(cache_name, ttl) -> bool` | 设置过期时间 |
| `mget` | `(*cache_names) -> list[object?]` | 批量获取 |
| `mset` | `(mapping, ttl?) -> bool` | 批量设置 |
| `delete_pattern` | `(pattern) -> int` | SCAN 模式批量删除 |
| `get_and_delete` | `(cache_name) -> object?` | Lua 原子获取并删除 |

**`create_redis_deps(settings_getter?, *, serializer_type="pickle") -> (get_redis_service, RedisServiceDep)`**

**缓存装饰器:** `@cacheable(...)` Cache-Aside 读取 (内建击穿保护) · `@cache_put(...)` Cache-Through 强制写入 · `@cache_evict(..., all_entries, before_invocation)` 删除缓存

**`SerializerFactory.create(type, compress?, threshold?, level?)`**: `pickle` (默认，全类型) · `json` (orjson，高性能) · `msgpack` (二进制) · `noop` (零开销)

**缓存键格式:** `{project}:{module}:cache:{name}` — 由 `RedisService` 自动拼接。

### RDBMS Module

**预组合基类矩阵:**

| ID 策略 | 无审计 | 有审计 (created_by/updated_by) |
|---------|--------|-------------------------------|
| 自增 int | `IntIdBase` | `AuditableBase` |
| 雪花 bigint | `SnowflakeBase` | `SnowflakeAuditableBase` (**默认首选**) |

所有基类均含 `id` + `created_at` + `updated_at`。

**`SoftDeleteMixin`**: 添加 `deleted: bool` 字段 (索引)。框架通过 `do_orm_execute` 事件自动为 SELECT 添加 `deleted IS FALSE`。查询已删除数据: `execution_options(include_deleted=True)`。

**`create_db_deps(*, dialect=POSTGRESQL, driver=POSTGRESQL_ASYNC) -> (get_db, DbSession)`**

**`IntEnumType(enum_class)`** — 将 Python IntEnum 存为 SmallInteger。

### Lock Module

**`@lock` 装饰器:**
```python
@lock(
    lock_name="order:{order_id}",  # 支持格式字符串从参数解析
    lock_timeout=None,             # 锁持有超时
    blocking_timeout=None,         # 等待获取超时
    on_timeout="raise",            # raise / skip / return_none
)
```

**锁异常层次:** `LockError(SystemException)` → `LockTimeoutError` · `LockAcquireError` · `LockReleaseError`

### Names Module

**`CacheNames` 静态方法:** `.app(name)` · `.admin(name)` · `.agent(name)` · `.common(name)` · `.temp(name)` · `.session(name)` · `.lock(name)` · `.queue(name)` · `.counter(name)` — 禁止随意拼接键名，必须通过此工具类。

---

## Project Implementation Patterns

### Backend Patterns

**App Bootstrap** (`main.py`):
```python
app = create_app(
    settings, routers=[api_router],
    version=settings.app_version,
    docs_url="/docs" if settings.debug else None,
)
```

**Config** (`core/config.py`):
`Settings(BaseAppSettings)` 增量声明 `database_*` 字段 + `computed_field database_url`。
`ClerkSettings` 独立实例: `clerk_settings = ClerkSettings()`。

**Deps 工厂调用**:
```python
# deps/redis.py
get_redis_service, RedisServiceDep = create_redis_deps()

# deps/auth.py
get_clerk_account, CurrentClerkAccount = create_clerk_deps(
    jwks_config_getter=lambda: clerk_settings.to_jwks_config(),
    redis_service_getter=get_redis_service,
)
```

**Router**: `APIRouter(prefix="/api/v1")` → `include_router(sub, prefix="/auth")`

**Service Layer**: 业务逻辑封装在 `services/` 层，Router 仅做请求解析和响应返回。

**Response**: `return Result.success(data=schema)` / `raise NotFoundException("xxx")`

### Frontend Patterns

**Providers** (`providers.tsx`): `ClerkProvider` → `QueryClientProvider` (`"use client"`)

**Middleware** (`proxy.ts`) 四层路由策略:
1. ⓪ Webhook 路由 → 直接放行 (后端 Svix 验签)
2. ① 根路径/认证页 → `auth()` 检查 → 已登录跳 `/dashboard`
3. ② API 路由 → 未登录返回 `401 JSON`
4. ③ 其余页面 → `auth.protect()` (自动重定向 sign-in)

**Auth Route Group**: `(auth)/sign-in`, `(auth)/sign-up`

**Server Component 默认**, `"use client"` 仅在必要时添加。

### Testing Patterns

**Smoke Test**: `create_app(enable_redis=False)` + `httpx.ASGITransport` + 断言 `Result` 契约 (`code` + `data` + `message` + `request_id` + `timestamp`)。

**Integration Test**: `testcontainers[postgres]` 真实数据库 + 真实 Svix 签名 + 真实 HTTP 链路。

---

## Architecture Boundaries

### Security Boundaries
- Clerk 登录 vs GitHub OAuth 仓库授权 — 两条独立链路，禁止混用语义
- Token/Key 禁止明文落日志、禁止前端可读存储
- Webhook 先验签再处理，禁止"先处理后验证"

### Data Isolation
- 用户域数据默认 `account_id` 语义隔离 (ADR-014)
- "默认隔离、显式放开"策略，禁止无边界全表访问

### Runtime Edge Cases
- AI 调用: 超时 `120s`，重试 `1` 次，入口校验配置完整性
- GitHub API: 限流退避，token 过期返回"重新授权"提示
- E2B 沙箱: 创建失败重试，状态恢复，资源释放

### Anti-Patterns (Forbidden)
- ❌ 重复实现框架已有能力 (响应封装、异常处理、Redis 工厂等)
- ❌ Router 层编排复杂业务逻辑或跨资源事务
- ❌ 跳过 `Result[T]` 返回非标准错误体
- ❌ 新代码放入单数遗留目录 (`router/` · `service/` · `schema/`)
- ❌ 在 ai-builder 主链路引入 `auth.jwt` 自签发流程

---

## Project Structure Reference

```text
ai-builder/
├── _bmad/ & _bmad-output/              # BMAD 工作流定义与产出
├── backend/
│   ├── pyproject.toml & uv.lock        # uv workspace 根 + 依赖锁定
│   ├── common-kernel/src/kernel/common/ # 公共内核 (models/enums)
│   └── app-api/src/api/app/
│       ├── main.py                     # create_app() 引导入口
│       ├── core/config.py              # Settings + ClerkSettings
│       ├── deps/{auth,redis}.py        # 框架工厂绑定
│       ├── routers/ · services/ · schemas/  # 路由/业务/模型层
│       └── ../../tests/               # 后端测试
├── frontend/app-web/
│   ├── src/app/providers.tsx           # Clerk + QueryClient Provider
│   ├── src/app/(auth)/                 # sign-in, sign-up 路由组
│   ├── src/{components,lib}/           # UI 组件 + 工具库
│   └── src/proxy.ts                    # 四层中间件路由策略
└── docs/                               # 项目文档
```

---

## Usage Guidelines

### For AI Agents
- 优先级: 系统/用户指令 > `AGENTS.md` > 本文件
- 编码前先读本文件 + 目标目录 `AGENTS.md`
- 框架 API 变更先更新本文件再批量改代码
- 通用规则 (语言、测试禁令、代码风格、commit 格式) 见 `CLAUDE.md` 和 `AGENTS.md`，本文件不重复

---

_Generated and optimized on 2026-02-10 based on ai-builder codebase + arksou-kernel-framework v0.3.9 source._
