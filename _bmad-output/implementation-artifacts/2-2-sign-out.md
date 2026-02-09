# Story 2.2: 用户登出

Status: ready-for-dev

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
  - [x] 在 `backend/app-api/src/api/app/deps/auth.py` 从 `Authorization: Bearer <token>` 提取 token
  - [x] 基于 Clerk JWKS 做离线验签
  - [x] 从 claims 解析 `sub`（clerk_user_id）与 `sid`（session_id）
  - [x] 定义清晰的 auth context（如 `ClerkUser`）供后续依赖复用

- [x] A2. 增加 Redis 基础设施配置与生命周期（C2）
  - [x] 在 `backend/app-api/src/api/app/core/config.py` 增加 Redis 配置（至少 `REDIS_URL`）
  - [x] 在 `backend/app-api/src/api/app/main.py` 启动阶段调用 `init_redis_pool()`
  - [x] 在应用关闭阶段调用 `close_redis_pool()`

- [x] A3. 明确 Account 关联策略（C3）
  - [ ] 若 `Account` ORM 与 `auth_accounts` 已落地：按 `clerk_user_id` 建立本地关联
  - [x] 若尚未落地：本 Story 使用 `sid` 作为撤销主键先完成会话失效链路，`account_id` 等字段允许为 `None` 并记录 TODO

- [ ] A4. 声明并安装 Svix 依赖（C5）
  - [ ] 在 `backend/app-api/pyproject.toml` 增加 `svix` 依赖
  - [ ] 补充本地环境变量（签名校验所需 secret）

### B. 后端会话级撤销与 Webhook

- [ ] B1. 鉴权链路增加 sid denylist 校验（AC: 2, 4）
  - [ ] 使用 `CacheNames.session(f"invalid:{sid}")` 生成撤销键
  - [ ] 命中撤销键时返回 `UNAUTHORIZED`
  - [ ] 保持与“账号禁用/注销”`FORBIDDEN` 的语义区分

- [ ] B2. 扩展 Clerk Webhook 处理（AC: 3, 4）
  - [ ] 新增或扩展 `POST /api/v1/webhook/clerk` 路由
  - [ ] 按职责拆分 service：路由分发层 + `session.*` 处理器 + `user.*` 处理器
  - [ ] 处理 `session.removed`：提取 `data.id` 与 `data.user_id`，写入 Redis 撤销标记（TTL=24h）
  - [ ] 结构化日志输出：`event_type="logout"` + `account_id` + `enterprise_id` + `workspace_id` + `timestamp`
  - [ ] 幂等保证：重复事件不重复产生业务副作用，不抛异常

### C. 前端登出流程与路由放行

- [ ] C1. 复用 Clerk `UserButton` 内置登出入口（AC: 1）
- [ ] C2. 登出后统一回跳 `/sign-in`（Provider 层统一配置，M3）
  - [ ] 将 `afterSignOutUrl="/sign-in"` 从 `<UserButton />` 移至 `<ClerkProvider />`
  - [ ] `<UserButton />` 不再单独传递 `afterSignOutUrl`
- [ ] C3. 在 `frontend/app-web/src/proxy.ts` 显式放行 webhook 路由（C4）
  - [ ] 新增 `isWebhookRoute = createRouteMatcher(['/api/v1/webhook/(.*)'])`
  - [ ] 对 webhook 路由直接 `NextResponse.next()`，跳过用户态 auth 校验
  - [ ] 保留其余 API 的 401 语义，不扩大白名单范围

### D. 测试与验收（按优先级执行）

- [ ] D1. Svix 签名校验测试（最高优先级）
- [ ] D2. `session.removed` 正常处理测试
- [ ] D3. Redis 撤销键写入与 TTL 测试
- [ ] D4. 重复事件幂等测试
- [ ] D5. 前端手工验收：登录→登出→受保护页面/API 拦截

## Dev Notes

### 当前仓库缺口快照（用于避免误解）

- `backend/app-api/src/api/app/deps/auth.py` 仍是 debug 骨架（`x-account-id`），尚无 Clerk JWT 验证链。
- `backend/app-api/src/api/app/core/config.py` 目前没有 Redis 配置项。
- `backend/app-api/src/api/app/main.py` 尚未初始化 Redis 连接池。
- `backend/app-api/src/api/app/services/auth/auth_service.py` 仍为 TODO 骨架，尚无真实 Account 查询。
- `backend/app-api/src/api/app/routers/` 目前仅有 `auth/me`，尚无 webhook 路由。

### 主动失效策略（Redis + sid denylist）

- 触发源：Clerk Webhook `session.removed`
- 键命名：`CacheNames.session(f"invalid:{sid}")`
- 鉴权：JWT 验签通过后检查 sid 是否在 denylist
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
from arksou.kernel.framework.cache import CacheNames, init_redis_pool, close_redis_pool, get_redis_client, RedisService
from arksou.kernel.framework.base import Result, UnauthorizedException, ForbiddenException
```

### 日志字段口径（E2）

- MVP 阶段 `enterprise_id`、`workspace_id` 允许固定为 `None`
- `account_id` 在可关联时填写，无法关联时为 `None` 并保留 `clerk_user_id` 便于追踪

### 关于 `afterSignOutUrl` 的说明（E4）

- 现阶段仅在 Story 中标注为“建议迁移到 Provider 层统一配置”。
- 是否为“明确 deprecated”以 Clerk 官方当前文档/变更日志为准；实现前需再次核验。

### Project Structure Notes

- 前端：
  - `frontend/app-web/src/app/dashboard/layout.tsx`
  - `frontend/app-web/src/app/providers.tsx`
  - `frontend/app-web/src/proxy.ts`
- 后端：
  - `backend/app-api/src/api/app/deps/auth.py`
  - `backend/app-api/src/api/app/core/config.py`
  - `backend/app-api/src/api/app/main.py`
  - `backend/app-api/src/api/app/routers/webhook/`
  - `backend/app-api/src/api/app/services/webhook/`
  - `backend/app-api/tests/`

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

Status: in-progress

Completion Note: 根据质量验证报告完成修订，已补齐阻塞前置项、优先级与降级策略

## Dev Agent Record

### Completion Notes List

- 2026-02-09: 基于 QA 报告 C1~C5 重构任务分解，补齐阻塞前置项
- 2026-02-09: 将 AC 分为“核心 AC / 安全增强 AC”，明确交付优先级
- 2026-02-09: 增加 Redis fail-open 降级策略与测试执行优先级

### File List

- `_bmad-output/implementation-artifacts/2-2-sign-out.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
