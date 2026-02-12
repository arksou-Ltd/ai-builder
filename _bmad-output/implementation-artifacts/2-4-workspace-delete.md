# Story 2.4: workspace-delete

Status: done

<!-- Note: This story is intentionally a breaking redesign. -->

## Story

As a 已登录用户,
I want 以安全可恢复的方式删除工作空间,
so that 我的工作空间列表保持整洁，并且系统数据模型保持一致且可持续演进。

## Acceptance Criteria

### Core AC (must)

1. **Given** 用户在工作空间列表中选择某个工作空间
   **When** 点击删除入口
   **Then** 弹出 `AlertDialog` 二次确认对话框，标题包含工作空间名称。

2. **Given** 用户确认删除
   **When** 提交删除请求
   **Then** 1 秒内从列表中移除该工作空间，并显示成功反馈（Toast）。

3. **Given** 用户取消删除
   **When** 关闭确认对话框
   **Then** 工作空间保持不变，不触发删除请求。

### Data Model AC (must)

4. **Given** 系统接收任何工作空间相关请求
   **When** 服务层执行数据访问
   **Then** `workspace_workspaces.account_id` 必须是 `BIGINT`，并且是 `auth_accounts.id` 的外键。

5. **Given** 当前用户通过 Clerk 完成认证
   **When** 后端处理业务请求
   **Then** 系统必须先将 `clerk_account_id` 解析为内部 `auth_accounts.id`，再进行工作空间读写。

6. **Given** 软删除后的工作空间
   **When** 执行普通列表查询
   **Then** 该记录默认不可见（由框架软删除过滤器自动生效）。

7. **Given** 用户删除某个工作空间后
   **When** 重新创建同名工作空间
   **Then** 创建成功（唯一性仅约束 `deleted = false` 的有效记录）。

### Guardrail AC (must for architecture compliance)

8. **Given** 用户 A 试图删除用户 B 的工作空间（直接访问 ID）
   **When** 后端接收请求
   **Then** 必须按 `account_id` 隔离并返回 `404`（不泄露资源存在性）。

9. **Given** 认证或参数异常
   **When** 调用删除接口
   **Then** 响应遵循 `Result[T]` 契约，未登录 `401`，资源不存在 `404`，参数错误 `422`。

10. **Given** 删除请求失败（网络或服务异常）
    **When** 前端处理失败分支
    **Then** 列表状态回滚并可重试，不得出现“界面已删但后端未删”的不一致。

## Tasks / Subtasks

### A. Breaking Domain Redesign (No Compatibility Layer)

- [x] A1. 建立真实账号实体与表（AC: 4, 5）
  - [x] 在 `common-kernel` 新增 `Account` 模型，表名 `auth_accounts`。
  - [x] 更新 `kernel/common/models/__init__.py`，导出 `Account`（与 `Workspace` 并列导出）。
  - [x] 字段至少包含：`id`（雪花主键）、`clerk_account_id`（唯一）、`email`、审计字段。
  - [x] 在 `backend/alembic/env.py` 注册 `Account` 模型导入，确保 autogenerate 可检测 `auth_accounts`。

- [x] A2. 将 Workspace 外键化到 Account（AC: 4, 5）
  - [x] 明确采用开发阶段破坏式迁移策略：`DROP + RECREATE workspace_workspaces`，不做 `ALTER TYPE` 兼容转换。
  - [x] 迁移链策略明确选择"方案 A（保留历史）"：新 revision 的 `down_revision = 'a1b2c3d4e5f6'`，不删除既有迁移文件。
  - [x] 重建后的 `workspace_workspaces.account_id` 为 `BIGINT NOT NULL`。
  - [x] 增加外键：`FOREIGN KEY (account_id) REFERENCES auth_accounts(id)`。
  - [x] 删除字符串语义的"伪 account_id（Clerk ID）"做法，不保留兼容分支。
  - [x] 迁移文件采用单文件方案（推荐）：`backend/alembic/versions/<revision>_rebuild_auth_and_workspace_schema.py`，同一 revision 内完成 `auth_accounts` 建表 + `workspace_workspaces` 重建（含软删除字段与部分唯一索引）。

- [x] A3. 账号解析服务（AC: 5）
  - [x] 新增 `AccountService.resolve_or_create_by_clerk_id(clerk_account_id, email)`。
  - [x] 并发安全：对同一 `clerk_account_id` 的并发创建使用 `INSERT ... ON CONFLICT` 或 `IntegrityError` 后回查策略，避免竞态失败。
  - [x] 重构 `create_workspace`：参数从 `account_id: str` 迁移为 `internal_account_id: int`。
  - [x] 重构 `list_workspaces`：参数从 `account_id: str` 迁移为 `internal_account_id: int`。
  - [x] Router 层 `create_workspace` / `list_workspaces` 显式接入 `AccountService`，先解析内部 account 再调用 `WorkspaceService`。
  - [x] AuthService 范围决策（本 Story 明确）：`AuthService` 不承担账号映射职责，仅处理认证展示；`AccountService` 负责 Clerk → internal account 映射。
  - [x] `/auth/me` 契约保持稳定（`AccountResponse.id` 继续返回 `clerk_account_id: str`），不在本 Story 改动返回模型，避免额外接口破坏。
  - [x] 严禁在 workspace 表直接存 Clerk 外部 ID。

### B. Workspace Soft Delete Architecture

- [x] B1. 模型软删除化（AC: 6, 7）
  - [x] `Workspace` 继承 `SoftDeleteMixin`。
  - [x] 删除接口实现改为 `workspace.deleted = True`，禁止物理删除。
  - [x] 查询默认依赖框架过滤器，无需手写 `deleted=false`。

- [x] B2. 唯一约束改造（AC: 7）
  - [x] 删除现有普通唯一约束。
  - [x] 在 PostgreSQL 建立部分唯一索引：`UNIQUE(account_id, name) WHERE deleted = false`。
  - [x] 确保软删除后可同名重建。

- [x] B3. 删除 API 实现（AC: 1, 2, 3, 8, 9）
  - [x] 在 `workspace_router.py` 新增 `DELETE /api/v1/workspaces/{workspace_id}`，并明确路径参数类型为 `workspace_id: int`（雪花 ID）。
  - [x] Service 逻辑：按 `workspace_id + account_id + deleted=false` 查询，命中则软删除。
  - [x] 未命中抛 `NotFoundException`。

### C. Frontend Deletion UX Flow

- [x] C1. 删除入口与确认交互（AC: 1, 3）
  - [x] 前置安装组件：执行 shadcn 安装，确保存在 `components/ui/alert-dialog.tsx`。
  - [x] 采用统一交互模式：`WorkspaceCard` 右上角 `DropdownMenu`（三点菜单）承载"删除工作空间"，并安装 `components/ui/dropdown-menu.tsx`。
  - [x] 删除按钮放在菜单项内，使用 `destructive` 语义样式（避免卡片常显红色按钮造成误触）。
  - [x] 使用 shadcn `AlertDialog`，标题必须包含工作空间名称。
  - [x] 取消按钮在左，确认按钮在右。

- [x] C2. 删除请求与缓存一致性（AC: 2, 10）
  - [x] 抽取 `useDeleteWorkspace` mutation hook（与现有查询模式一致）。
  - [x] 查询键统一沿用 `["workspaces", user?.id]`。
  - [x] 在 `src/lib/api/workspaces.ts` 新增 `deleteWorkspace(id, getToken)`。
  - [x] 成功后使用 `setQueryData` 立即移除，再 `invalidateQueries` 做一致性收敛。
  - [x] 失败时回滚 UI 并展示可重试提示。

### D. Testing & Evidence (No Mock)

- [x] D1. 后端集成测试（AC: 4-9）
  - [x] 重构测试 fixture：显式初始化 `auth_accounts` 记录，并在测试中使用内部 `account_id`。
  - [x] 清理逻辑从 `LIKE 'user_test_%'` 迁移为按测试创建的 `account_id`/外键链路清理。
  - [x] 覆盖 `auth_accounts` 建立与 `workspace` 外键关系有效性。
  - [x] 覆盖删除后默认查询不可见。
  - [x] 覆盖软删除后同名重建成功。
  - [x] 覆盖跨用户删除 `404`、未登录 `401`、参数异常 `422`。

- [x] D2. 前端验收（AC: 1-3）
  - [x] 验证确认框展示目标名称。
  - [x] 验证确认后列表即时移除。
  - [x] 验证取消不触发请求。
  - [ ] 验证失败可恢复且不出现脏状态（No Mock 约束下未执行自动化，采用代码审查证据覆盖）。

### Review Follow-ups (AI)

- [x] [AI-Review][High] 补充前端删除流验收测试（确认弹窗/确认删除/取消不请求/失败回滚），并在前端提供可执行测试入口 [frontend/app-web/package.json:5]
- [x] [AI-Review][High] 补充删除接口参数异常 `422` 的集成测试（例如 `workspace_id` 非整数场景）以闭合 AC9 [backend/app-api/tests/test_workspace.py:458]
- [x] [AI-Review][High] 修正"外键关系验证"测试，直接断言 `workspace_workspaces.account_id -> auth_accounts.id` 约束生效，而非仅校验 `workspace_id` 类型 [backend/app-api/tests/test_workspace.py:568]
- [x] [AI-Review][Medium] 调整测试数据清理策略，避免 `LIKE 'user_test_%'` 模式删除带来的误删风险 [backend/app-api/tests/test_workspace.py:126]
- [x] [AI-Review][Medium] 对齐 Story File List 与实际 Git 变更，补齐遗漏并移除未变更文件声明 [_bmad-output/implementation-artifacts/2-4-workspace-delete.md:274]
- [x] [AI-Review][Low] 优化移动端删除入口可见性，避免仅依赖 hover 才显示三点菜单 [frontend/app-web/src/components/workspace/WorkspaceCard.tsx:45]

**第二轮 Review (2026-02-11):**

- [x] [Review-R2][High] 移除 `playwright.config.ts` 中 `dependencies: ["setup"]`，使 `test:e2e` 复用已缓存认证态，不再强制交互登录 [frontend/app-web/playwright.config.ts:47]
- [x] [Review-R2][High] 删除 AC10 E2E 测试（使用 `page.route()/route.abort()` 网络拦截违反 No Mock 策略），改为代码审查覆盖 [frontend/app-web/e2e/workspace-delete.spec.ts:130]
- [x] [Review-R2][Medium] AC2 断言超时从 3000ms 收紧为 1000ms，严格验证"1 秒内移除"AC 要求 [frontend/app-web/e2e/workspace-delete.spec.ts:122]
- [x] [Review-R2][Medium] `-1` 参数测试断言从 `in (404, 422)` 收紧为 `== 404`（负数是合法 int，FastAPI 不拦截，服务层查无记录返回 404）[backend/app-api/tests/test_workspace.py:549]
- [x] [Review-R2][Low] 移除 `workspace-delete.spec.ts` 中未使用的 `createButton` 变量 [frontend/app-web/e2e/workspace-delete.spec.ts:28]
- [x] [Review-R3][High] 将删除接口 `workspace_id` 参数收紧为正整数（`gt=0`），使参数错误统一返回 `422` 以满足 AC9 [backend/app-api/src/api/app/routers/workspace/workspace_router.py:66]
- [x] [Review-R3][High] 修正 `-1` 删除用例断言为 `422`，与 AC9 参数错误契约保持一致 [backend/app-api/tests/test_workspace.py:579]
- [x] [Review-R3][High] 修复已标记完成但未自动化验证的 AC10 任务描述，明确 No Mock 约束下采用代码审查证据闭合，避免假阳性勾选 [_bmad-output/implementation-artifacts/2-4-workspace-delete.md:132]
- [x] [Review-R3][Medium] 移除列表查询的隐式写副作用：`GET /workspaces` 改为仅解析账号，不存在时返回空列表 [backend/app-api/src/api/app/routers/workspace/workspace_router.py:50]
- [x] [Review-R3][Medium] 新增回归测试，验证新用户列表查询不会创建 `auth_accounts` 记录 [backend/app-api/tests/test_workspace.py:463]
- [x] [Review-R3][Low] 对齐迁移脚本与框架基类约束：`created_by/updated_by` 改为 `nullable=False`，减少 schema 漂移风险 [backend/alembic/versions/b3c4d5e6f7a8_rebuild_auth_and_workspace_schema.py:50]

**第三轮 Review (2026-02-12):**

- [x] [Review-R3][High] AC10 失败回滚补齐可执行验收：新增“离线网络失败”E2E 场景验证回滚与重试提示 [frontend/app-web/e2e/workspace-delete.spec.ts:128]
- [x] [Review-R3][High] `GET /api/v1/workspaces` 改为仅解析账号不创建；读接口不再产生写副作用 [backend/app-api/src/api/app/routers/workspace/workspace_router.py:50]
- [x] [Review-R3][Medium] 修复迁移 `downgrade()` 与历史基线不一致问题：`created_by/updated_by` 回滚为 `NOT NULL` [backend/alembic/versions/b3c4d5e6f7a8_rebuild_auth_and_workspace_schema.py:140]
- [x] [Review-R3][Medium] 测试数据库策略改为可复现：支持 `TEST_DATABASE_URL`，默认 testcontainers，本地无容器能力时明确 skip [backend/app-api/tests/test_workspace.py:34]
- [x] [Review-R3][Low] 修正文档状态冲突，补充第三轮修复记录并对齐状态说明 [_bmad-output/implementation-artifacts/2-4-workspace-delete.md:280]

**第四轮 Review (2026-02-12):**

- [x] [Review-R4][High] 修复迁移约束一致性：`upgrade()/downgrade()` 的 `created_by/updated_by` 全部恢复为 `NOT NULL`，与历史基线一致 [backend/alembic/versions/b3c4d5e6f7a8_rebuild_auth_and_workspace_schema.py:97]
- [x] [Review-R4][High] 补齐 AC10 “可重试”验收：离线失败回滚后恢复在线并重试删除成功 [frontend/app-web/e2e/workspace-delete.spec.ts:164]
- [x] [Review-R4][Medium] 收敛 E2E 测试数据污染：为取消类场景补充测试内清理删除 [frontend/app-web/e2e/workspace-delete.spec.ts:88]

## Dev Notes

### Scope Clarification

- 本故事采用“破坏式重构”策略，不做旧模型兼容。
- 目标不是“补丁式删除接口”，而是修复数据模型根问题：
  - `account_id` 必须引用真实账号表。
  - 删除必须为软删除，并与唯一性策略协同。
  - 迁移策略采用开发环境清洗方案（重建表结构），避免字符串到 BIGINT 的不可逆类型兼容负担。

### Current Codebase Risk Snapshot

- `workspace_workspaces.account_id` 当前是字符串语义，未引用真实 `auth_accounts`，存在数据模型断层。
- 当前删除实现（待开发）若沿用 `session.delete()` 将走硬删除，不符合业务预期。
- 现有 `workspace` 查询链路尚未基于“内部 account 主键”统一建模。

### Target Architecture (Elegant End-State)

- 账号域：`auth_accounts` 作为用户域根实体。
- 业务域：`workspace_workspaces.account_id -> auth_accounts.id`。
- 删除语义：`SoftDeleteMixin` + 部分唯一索引（仅约束未删除记录）。
- 服务边界：Router 不处理身份映射，Service 统一先解析内部 account。
- 迁移落地：单个 Alembic revision 完成 `auth_accounts` 建表与 `workspace_workspaces` 重建，降低链路复杂度与执行歧义。
- 历史迁移处理：保留既有迁移链（`4f80ff980593 -> a1b2c3d4e5f6 -> <new revision>`），不做 baseline 清洗。
- 身份服务边界：`AuthService` 保持认证信息展示；`AccountService` 负责业务身份映射与落库。

### Non-Compatibility Declaration

- 不保留 `owner_clerk_id`/字符串 `account_id` 的兼容读取或双写逻辑。
- 不保留硬删除路径。
- 所有新代码以“最终模型”为唯一目标。

## Dev Agent Guardrails: Technical Requirements

| Check Item | Requirement |
| --- | --- |
| Identity Mapping | 业务层一律使用内部 `auth_accounts.id`，禁止直接使用 Clerk ID 作为业务外键 |
| Workspace FK | `workspace_workspaces.account_id` 必须为 `BIGINT` 外键 |
| Soft Delete | 删除仅设置 `deleted=true`，禁止物理删除 |
| Uniqueness | 唯一性约束仅作用于 `deleted=false` 记录 |
| API Contract | 统一 `Result[T]`；错误映射遵循框架异常体系 |

## Dev Agent Guardrails: Architecture Compliance

| Check Item | Requirement |
| --- | --- |
| Layering | Router 编排、Service 业务、Model 持久化，禁止跨层混写 |
| Isolation | 所有读写必须带内部 `account_id` 过滤 |
| No Compatibility Debt | 明确不引入旧字段兼容分支 |
| Reuse Framework | 复用 `SoftDeleteMixin` 与框架自动过滤机制 |

## Dev Agent Guardrails: File Structure Requirements

- 新增/改造后端文件：
  - `backend/alembic/env.py`
  - `backend/common-kernel/src/kernel/common/models/auth/account.py`
  - `backend/common-kernel/src/kernel/common/models/auth/__init__.py`
  - `backend/common-kernel/src/kernel/common/models/__init__.py`
  - `backend/common-kernel/src/kernel/common/models/workspace/workspace.py`
  - `backend/app-api/src/api/app/services/auth/account_service.py`
  - `backend/app-api/src/api/app/services/workspace/workspace_service.py`
  - `backend/app-api/src/api/app/routers/workspace/workspace_router.py`
  - `backend/alembic/versions/<revision>_rebuild_auth_and_workspace_schema.py`
  - `backend/app-api/tests/test_workspace.py`

- 新增/改造前端文件：
  - `frontend/app-web/src/lib/api/workspaces.ts`
  - `frontend/app-web/src/components/workspace/WorkspaceCard.tsx`
  - `frontend/app-web/src/components/workspace/WorkspaceList.tsx`
  - `frontend/app-web/src/components/workspace/DeleteWorkspaceDialog.tsx`

## Dev Agent Guardrails: Testing Requirements

| Check Item | Requirement |
| --- | --- |
| No Mock Policy | 严禁 mock/stub/fake/spy |
| DB Integrity | 必须验证外键关系、软删除标记、部分唯一索引行为 |
| Security | 必须验证跨用户删除拦截 |
| Consistency | 必须验证删除失败时前端状态回滚 |

## Previous Story Intelligence

- Story 2.3 对 `account_id` 的调整未引入真实账号表，这一建模在本故事中被正式纠正。
- Story 2.3 已建立前端查询键隔离（`["workspaces", user?.id]`），本故事继续沿用。
- Story 2.3 已强调“错误可见”，本故事将其用于删除失败恢复。

## Git Intelligence Summary

- 近期改动集中在 workspace 模块，说明本故事可在同一模块收敛完成。
- 本次设计是结构修复型故事，跨越 model/service/migration/test 属于预期范围。

## Latest Tech Information

- 使用框架 `SoftDeleteMixin` 可以让 `SELECT` 默认自动过滤 `deleted=true` 记录。
- PostgreSQL 部分唯一索引可优雅支持“软删除后允许同名重建”。

## Workspace Context Reference

- 继续遵循 `Result[T]` 与统一异常映射。
- 继续遵循 ADR-014 用户隔离原则，但隔离键从“外部字符串”升级为“内部外键主键”。

### References

- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/implementation-artifacts/2-3-workspace-create.md`
- `_bmad-output/project-context.md`
- `backend/common-kernel/src/kernel/common/models/workspace/workspace.py`
- `backend/app-api/src/api/app/services/workspace/workspace_service.py`
- `backend/app-api/src/api/app/routers/workspace/workspace_router.py`

## Story Completion Status

Status: done

Completion Note: 第四轮 Review 的 High/Medium 问题已全部修复，复审通过，故事已达成完成标准。

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- npm 缓存权限问题：`~/.npm/_cacache` 存在 root 权限文件，通过 `--cache /tmp/npm-cache` 绕过。
- 后端测试环境变量：使用 `env -i` 清洁环境运行 pytest，避免 `CORS_ORIGINS` JSON 值被 shell export 破坏。

### Completion Notes List

- 2026-02-11: 根据用户要求，将故事重写为"深度重构方案文档（不执行代码）"。
- 2026-02-11: 完成全部后端实现（A1-A3, B1-B3, D1），27 项集成测试全部通过。
- 2026-02-11: 完成全部前端实现（C1, C2, D2），TypeScript 编译与 Next.js 构建通过。
- 2026-02-11: Senior Developer Review（AI）完成，结论为 Changes Requested；已新增 6 条 Review Follow-ups（High 3 / Medium 2 / Low 1）。
- 2026-02-11: 完成全部 Review Follow-ups 修复（6/6），后端 31 项集成测试全部通过，前端 TypeScript 编译 + Next.js 构建通过。
- 2026-02-11: 完成第二轮 Review 修复（5/5）：移除 E2E setup 依赖、删除违反 No Mock 的 AC10 测试、收紧 AC2 超时验证、修正 -1 断言、清理未用变量。
- 2026-02-12: 完成第三轮 Review 修复（5/5）：补 AC10 离线失败回滚 E2E、移除 GET 写副作用、修复迁移回滚约束一致性、测试库改为 TEST_DATABASE_URL/testcontainers、同步文档状态。
- 2026-02-12: 完成第四轮 Review 修复（3/3）：修复迁移审计字段可空回归、补齐 AC10 "失败后重试成功"验收、为取消类 E2E 场景补充清理删除。

### File List

**后端 - 新增文件：**
- `backend/common-kernel/src/kernel/common/models/auth/__init__.py`
- `backend/common-kernel/src/kernel/common/models/auth/account.py`
- `backend/alembic/versions/b3c4d5e6f7a8_rebuild_auth_and_workspace_schema.py`
- `backend/app-api/src/api/app/services/account/__init__.py`
- `backend/app-api/src/api/app/services/account/account_service.py`

**后端 - 修改文件：**
- `backend/common-kernel/src/kernel/common/models/__init__.py`
- `backend/common-kernel/src/kernel/common/models/workspace/workspace.py`
- `backend/alembic/env.py`
- `backend/alembic/versions/b3c4d5e6f7a8_rebuild_auth_and_workspace_schema.py`
- `backend/app-api/src/api/app/services/account/account_service.py`
- `backend/app-api/src/api/app/services/workspace/workspace_service.py`
- `backend/app-api/src/api/app/routers/workspace/workspace_router.py`
- `backend/app-api/tests/test_workspace.py`

**前端 - 新增文件：**
- `frontend/app-web/src/components/ui/alert-dialog.tsx`
- `frontend/app-web/src/components/ui/dropdown-menu.tsx`
- `frontend/app-web/src/components/workspace/DeleteWorkspaceDialog.tsx`
- `frontend/app-web/playwright.config.ts`
- `frontend/app-web/e2e/auth.setup.ts`
- `frontend/app-web/e2e/workspace-delete.spec.ts`
- `frontend/app-web/e2e/.auth/.gitkeep`

**前端 - 修改文件：**
- `frontend/app-web/src/lib/api/workspaces.ts`
- `frontend/app-web/src/components/workspace/WorkspaceCard.tsx`
- `frontend/app-web/src/components/workspace/WorkspaceList.tsx`
- `frontend/app-web/package.json`
- `frontend/app-web/package-lock.json`
- `frontend/app-web/.gitignore`

**文档：**
- `_bmad-output/implementation-artifacts/2-4-workspace-delete.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Senior Developer Review (AI)

- Reviewer: Arksou
- Date: 2026-02-12
- Outcome: Approved
- Findings Summary: High 0 / Medium 0 / Low 0
- Action Taken: 已修复第四轮 `Review-R4` 问题并完成复审闭环

### Change Log

- 2026-02-11: 代码评审完成，新增 `Review Follow-ups (AI)`，并将 Story 状态调整为 `in-progress`。
- 2026-02-11: 修复全部 Review Follow-ups (6/6)：补充 422/FK 测试、重构数据清理策略、新增 Playwright E2E 测试基础设施、修复移动端菜单可见性、对齐 File List。
- 2026-02-11: 第二轮 Review 修复 (5/5)：移除 `dependencies: ["setup"]`、删除 AC10 Mock 测试、AC2 超时 3000→1000ms、-1 断言 `in(404,422)`→`==404`、移除未用变量。
- 2026-02-12: 第三轮 Review 完成，发现剩余问题（High 2 / Medium 2 / Low 1），Story 状态维持 `in-progress`。
- 2026-02-12: 修复第三轮 Review 问题（5/5）并将 Story 状态更新为 `review`，等待复审。
- 2026-02-12: 修复第四轮 Review 问题（3/3）并将 Story 状态更新为 `done`，同步冲刺状态。
