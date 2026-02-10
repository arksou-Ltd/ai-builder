# Story 2.2: 用户登出

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 已登录用户,
I want 主动登出账号,
so that 我可以安全退出系统。

## Acceptance Criteria

### 核心 AC（必须完成）

1. **Given** 用户当前处于已登录状态
   **When** 用户执行登出操作
   **Then** 客户端清除本地会话状态并跳转至登录页（`/sign-in`）

2. **Given** 用户已登出（或会话已被服务端标记失效）
   **When** 用户尝试访问受保护页面或调用受保护 API
   **Then** 系统拒绝访问并提示需要重新登录
   **And** 受保护页面不可访问，受保护 API 返回 `401` 语义响应

### 安全增强 AC（应完成，时间不足可后置）

3. **Given** 用户触发登出
   **When** Clerk Webhook `session.removed` 被后端处理完成
   **Then** 系统记录登出事件日志（`event_type: logout`）
   **And** 日志包含 `account_id`、`enterprise_id`、`workspace_id`、`timestamp`（无法确定时允许为 `None`）

4. **Given** Clerk Webhook 已配置并会在会话结束时发送事件
   **When** 后端收到 `session.removed` 事件（`Session removed`）
   **Then** 服务端基于 webhook 将对应会话标记为已失效（该会话 token 无法继续访问受保护资源）
   **And** webhook 处理必须通过 Svix 签名验证，且处理应幂等
   **And** 会话失效策略默认依赖 webhook 快速回调，允许短暂延迟
   **And** 策略需支持未来扩展（如运维触发会话失效管理动作）

## Tasks / Subtasks

### A. 前置能力补齐（阻塞项，先做）

- [x] A1. 替换当前 debug 鉴权骨架为 Clerk JWT 验证链（C1）
  - [x] 在 `backend/app-api/src/api/app/deps/auth.py` 使用框架 `create_clerk_deps()` 工厂
  - [x] 基于 Clerk JWKS 做离线验签（框架自动完成）
  - [x] 从 claims 解析 `sub`（clerk_user_id）与 `sid`（session_id）
  - [x] 定义清晰的 auth context（`ClerkAccount`）供后续依赖复用

- [x] A2. 增加 Redis 基础设施配置与生命周期（C2）
  - [x] 在 `backend/app-api/src/api/app/core/config.py` 继承框架 `BaseAppSettings`（自动获得 `redis_*` 配置）
  - [x] 在 `backend/app-api/src/api/app/main.py` 使用框架 `create_app()` 自动管理 Redis 连接池生命周期
  - [x] 应用关闭阶段自动调用 `close_redis_pool()`

- [x] A3. 明确 Account 关联策略（C3）
  - [ ] 若 `Account` ORM 与 `auth_accounts` 已落地：按 `clerk_user_id` 建立本地关联
  - [x] 若尚未落地：本 Story 使用 `sid` 作为撤销主键先完成会话失效链路，`account_id` 等字段允许为 `None` 并记录 TODO

- [x] A4. 声明并安装 Svix 依赖（C5）
  - [x] 在 `backend/app-api/pyproject.toml` 增加 `svix>=1.60.0` 依赖（已完成）
  - [x] 补充本地环境变量 `CLERK_WEBHOOK_SECRET`（签名校验所需 secret）

### B. 后端会话级撤销与 Webhooks

- [x] B1. 鉴权链路增加 sid denylist 校验（AC: 2, 4）
  - [x] 框架 `create_clerk_deps()` 内置会话撤销检查（`redis_service_getter` 参数）
  - [x] 命中撤销键时返回 `UNAUTHORIZED`
  - [x] 保持与"账号禁用/注销"`FORBIDDEN` 的语义区分

- [x] B2. 扩展 Clerk Webhook 处理（AC: 3, 4）
  - [x] 新增 `POST /api/v1/webhooks/clerk` 路由
  - [x] 按职责拆分 service：路由分发层 + `session.*` 处理器 + `user.*` 处理器
  - [x] 处理 `session.removed`：提取 `data.id` 与 `data.user_id`，写入 Redis 撤销标记（TTL=24h）
  - [x] 结构化日志输出：`event_type="logout"` + `account_id` + `enterprise_id` + `workspace_id` + `timestamp`
  - [x] 幂等保证：重复事件不重复产生业务副作用，不抛异常

### C. 前端登出流程与路由放行

- [x] C1. 复用 Clerk `UserButton` 内置登出入口（AC: 1）
- [x] C2. 登出后统一回跳 `/sign-in`（Provider 层统一配置，M3）
  - [x] `afterSignOutUrl="/sign-in"` 已配置在 `<ClerkProvider />` 层
  - [x] `<UserButton />` 不再单独传递 `afterSignOutUrl`
- [x] C3. 在 `frontend/app-web/src/proxy.ts` 显式放行 webhook 路由（C4）
  - [x] 已新增 `isWebhookRoute = createRouteMatcher(['/api/v1/webhooks/(.*)'])`
  - [x] 对 webhook 路由直接 `NextResponse.next()`，跳过用户态 auth 校验
  - [x] 保留其余 API 的 401 语义，不扩大白名单范围

### D. 测试与验收（按优先级执行）

- [x] D1. Svix 签名校验测试（最高优先级）
- [x] D2. `session.removed` 正常处理测试
- [x] D3. Redis 撤销键写入与 TTL 测试
- [x] D4. 重复事件幂等测试
- [x] D5. 前端手工验收：登录→登出→受保护页面/API 拦截

## Dev Notes

### 当前仓库状态快照

- `backend/app-api/src/api/app/deps/auth.py` 已使用框架 `create_clerk_deps()` 完成 Clerk JWT 验证链
- `backend/app-api/src/api/app/core/config.py` 继承 `BaseAppSettings`，自动获得 `redis_*` 配置
- `backend/app-api/src/api/app/main.py` 使用框架 `create_app()` 自动管理 Redis 生命周期
- `backend/app-api/src/api/app/services/auth/auth_service.py` 提供 `get_account_info()`，`account_id` 暂用 `clerk_account_id`（TODO: 后续从数据库查询）
- `backend/app-api/src/api/app/routers/` 已包含 `auth/me` 和 `webhook/clerk` 两组路由
- `frontend/app-web/src/proxy.ts` 已配置四层路由保护策略（含 webhook 白名单）
- `frontend/app-web/src/app/providers.tsx` 已在 `<ClerkProvider>` 层配置 `afterSignOutUrl="/sign-in"`

### 主动失效策略（Redis + sid denylist）

- 触发源：Clerk Webhook `session.removed`
- 撤销机制：框架 `SessionRevocation.revoke(session_id)` 写入 Redis 撤销标记
- 鉴权：框架 `create_clerk_deps()` 内置 JWT 验签 + sid 撤销检查
- TTL：24h（与 token 生命周期约束对齐）

### Clerk Webhook payload 结构参考（M2）

- 事件类型：`session.removed`（显示名 `Session removed`）
- 常用字段：
  - `type`
  - `timestamp`
  - `instance_id`
  - `data.id`（session id）
  - `data.user_id`（clerk user id）

### 领域命名约束（M1）

- 领域对象统一使用 `Account` / `account_id` 命名，不引入新的 `User` 领域对象。
- webhook service、日志字段、异常信息保持与 `Account` 命名体系一致。

### Redis 异常降级策略（明确）

- 鉴权阶段读取 Redis 失败时采用 **fail-open**：
  - 放行请求，依赖 JWT 自然过期
  - 同时记录高优先级告警日志（含 request_id、sid）
- 理由：MVP 阶段优先可用性，避免 Redis 故障导致全站不可用

### 关键框架导入（E1）

```python
# 应用工厂与配置
from arksou.kernel.framework.app import create_app, BaseAppSettings

# 统一响应与异常
from arksou.kernel.framework.base import Result, UnauthorizedException, ForbiddenException

# Clerk 认证
from arksou.kernel.framework.auth.clerk import ClerkAccount, ClerkSettings, create_clerk_deps

# 会话撤销
from arksou.kernel.framework.auth.session import SessionRevocation

# Webhook 验签
from arksou.kernel.framework.webhook import SvixWebhookVerifier

# 缓存
from arksou.kernel.framework.cache import CacheNames, RedisService

# 日志
from arksou.kernel.framework.logging import get_logger
```

### 日志字段口径（E2）

- MVP 阶段 `enterprise_id`、`workspace_id` 允许固定为 `None`
- `account_id` 在可关联时填写，无法关联时为 `None` 并保留 `clerk_user_id` 便于追踪

### 关于 `afterSignOutUrl` 的说明（E4）

- 已迁移到 `<ClerkProvider>` 层统一配置（`providers.tsx`）
- `<UserButton />` 组件不再单独传递 `afterSignOutUrl`

### Project Structure Notes

- 前端：
  - `frontend/app-web/src/app/dashboard/layout.tsx` — Dashboard 受保护布局，含 `<UserButton />` 登出入口和 `auth.protect()` 纵深防御
  - `frontend/app-web/src/app/providers.tsx` — 全局 Provider，`<ClerkProvider afterSignOutUrl="/sign-in">` 统一登出跳转配置
  - `frontend/app-web/src/proxy.ts` — 路由保护中间件，四层策略（webhook 白名单 → 认证页 → API 401 → 页面 protect）

- 后端 — Webhooks：
  - `backend/app-api/src/api/app/routers/webhook/__init__.py` — Webhook 路由模块入口，导出 Clerk webhook router
  - `backend/app-api/src/api/app/routers/webhook/clerk.py` — Clerk Webhook 端点（`POST /api/v1/webhooks/clerk`），提取 Svix 签名头并调用 service 处理
  - `backend/app-api/src/api/app/services/webhook/__init__.py` — Webhook 服务模块入口，导出 `ClerkWebhookService`
  - `backend/app-api/src/api/app/services/webhook/clerk_webhook_service.py` — Clerk Webhook 处理服务：Svix 验签 → 事件分发 → `session.removed` 撤销会话 → 结构化日志

- 后端 — 认证与配置：
  - `backend/app-api/src/api/app/deps/auth.py` — Clerk JWT 认证依赖注入（`create_clerk_deps()` 工厂，内置 JWKS 验签 + 会话撤销检查）
  - `backend/app-api/src/api/app/core/config.py` — 应用配置（继承框架 `BaseAppSettings`，含 `ClerkSettings`）
  - `backend/app-api/src/api/app/main.py` — 应用入口（框架 `create_app()` 工厂，自动管理 Redis/CORS/日志/异常处理）
  - `backend/app-api/src/api/app/routers/__init__.py` — 主路由器（`/api/v1` 前缀，注册 auth + webhook 子路由）

- 后端 — 测试：
  - `backend/app-api/tests/test_webhook_clerk.py` — Clerk Webhook 集成测试（D1-D4），使用 .env 配置的真实 Redis，使用 Svix 库生成真实签名

### References

- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/project-context.md`

## Dev Agent Guardrails: Technical Requirements

| Check Item | Requirement |
| --- | --- |
| Core First | 核心 AC（1-2）先完成，再做安全增强 AC（3-4） |
| Auth Chain | 必须先落地 JWT 验证链，再做 sid 撤销扩展 |
| Webhook Security | Svix 验签是上线前硬门槛 |
| API Contract | 统一遵循 `Result[T]` 响应契约 |
| Cache Naming | 只允许 `CacheNames` 生成缓存键 |

## Dev Agent Guardrails: Testing Requirements

| Check Item | Requirement |
| --- | --- |
| Non-Mock Policy | 严禁 mock/stub/fake |
| Priority Order | 按 D1→D5 顺序执行验收 |
| API Behavior | 未登录受保护 API 返回 `401`（非 `404`） |
| Webhook Idempotency | 重复事件无副作用且无异常 |

## Story Completion Status

Status: done

Completion Note: 代码评审高/中优先级问题已修复，真实 Redis 环境下 Webhook 集成测试 13/13 通过，Story 状态更新为 done

## Dev Agent Record

### Completion Notes List

- 2026-02-09: 基于 QA 报告 C1~C5 重构任务分解，补齐阻塞前置项
- 2026-02-09: 将 AC 分为"核心 AC / 安全增强 AC"，明确交付优先级
- 2026-02-09: 增加 Redis fail-open 降级策略与测试执行优先级
- 2026-02-10: 优化 Story 文档：webhook → webhooks 完整路径清单（含文件路径和功能说明），同步任务完成状态与实际代码对齐，更新仓库状态快照和框架导入参考
- 2026-02-10: 从头验证全部任务实现正确性，发现并修复以下问题：
  - 修复 proxy.ts webhook 路由匹配路径不一致（`/api/v1/webhook/` → `/api/v1/webhooks/`，与后端实际路由对齐）
  - 修复测试 fixture 中 Redis 连接池未初始化问题（ASGITransport 不触发 lifespan，改为手动调用 `init_redis_pool`/`close_redis_pool`）
  - 修复测试 Redis client `close()` → `aclose()` deprecation warning
  - 修复测试 SCAN 匹配模式（`*invalid*` → `*session*`，适配框架 `CacheNames.session()` 键格式）
  - 全量回归测试 35/35 通过（依赖链 22 + 烟雾 4 + Webhook 9）
- 2026-02-10: D5 前端手工验收全部通过（用户 Arksou 在真实浏览器中执行）：
  - 未登录访问 /dashboard → 重定向到 /sign-in ✅
  - 未登录调用受保护 API /api/v1/auth/me → 返回 401 (4010000) ✅
  - Google 登录 → 跳转 /dashboard → UserButton 显示 ✅
  - 点击登出 → 跳转 /sign-in ✅
  - 登出后访问受保护页面/API → 被拦截 ✅
- 2026-02-10: 全量回归测试 38/38 通过（依赖链 22 + 烟雾 4 + Webhook 12），Story 标记为 review
- 2026-02-10: Senior code review 自动修复高/中优先级问题：
  - 修复前端受保护 API 未登录响应，统一返回 `Result` 契约结构（4010000）
  - 修复 Clerk Webhook 调试日志，移除签名明文与 body preview，避免敏感信息泄露
  - 补充“会话撤销后访问受保护资源返回 401”测试，覆盖 AC4 核心验证链路
  - 校验结果：`npm -C frontend/app-web run lint` ✅、`pytest tests/test_smoke.py` ✅、`pytest tests/test_webhook_clerk.py`（使用 `backend/.env` 连接真实 Redis）13/13 ✅

### File List

- `_bmad-output/implementation-artifacts/2-2-sign-out.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `backend/app-api/src/api/app/services/webhook/clerk_webhook_service.py`（Webhook 日志头脱敏，避免泄露 `svix-signature`）
- `backend/app-api/tests/test_webhook_clerk.py`（新增撤销会话访问受保护 API 返回 401 的验证）
- `frontend/app-web/src/proxy.ts`（受保护 API 未登录统一返回 `Result` 契约）

### Senior Developer Review (AI)

- Reviewer: Arksou (AI)
- Review Date: 2026-02-10
- Outcome: Approve after fixes

Fixed Findings:

- [HIGH] 补齐 AC4 缺口：新增撤销后访问受保护 API 返回 401 的测试验证
- [MEDIUM] 修复前端受保护 API 401 响应不符合 `Result` 契约的问题
- [MEDIUM] 修复 Webhook 日志泄露风险（签名头明文与 body preview）
- [MEDIUM] 同步 story 记录与实际改动文件，补齐可追溯性

Validation Evidence:

- `npm -C frontend/app-web run lint` 通过
- `backend/app-api: pytest tests/test_smoke.py` 通过
- `backend/app-api: pytest tests/test_webhook_clerk.py`（使用 `backend/.env`）13/13 通过

### Change Log

- 2026-02-10: 通过 code-review workflow 自动修复高/中优先级问题，补齐 AC4 测试证据链，统一 401 响应契约并完成日志脱敏
