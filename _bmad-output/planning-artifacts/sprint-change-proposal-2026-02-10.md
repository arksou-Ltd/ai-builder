# Sprint Change Proposal

## Metadata

- Project: `ai-builder`
- Date: `2026-02-10`
- Trigger Story: `2-3-workspace-create`
- Workflow Mode: `Incremental`
- Decision Strategy: `B`（直接改写现有 Story 验收标准，不新增 Story）

## Section 1: Issue Summary

本次变更由 `2-3-workspace-create` 实施过程触发：当前实现将工作空间归属字段设计为 `owner_clerk_id`，并且系统尚未落地内部账户表 `auth_accounts`。这导致 Epic 2 的身份与数据隔离逻辑实际完全依赖 Clerk 外部标识，而非架构约定的内部账号域。

问题发现上下文：

- 在工作空间模型与迁移中，归属键为 `owner_clerk_id`，并有“后续迁移为内部 account_id”的注释。
- 在认证服务中，存在“后续 Story 从数据库查询 Account 信息并关联 clerk_account_id”的 TODO。
- 在架构文档中，已明确 `auth_accounts`、`account_id`、`IsolatedRepository` 和 ADR-014 的隔离强制策略。

核心问题陈述：

> 架构文档已定义“内部账户映射 + account_id 强隔离”，但实现落地仍停留在“Clerk ID 直连业务表”，形成规范与实现不一致，若继续推进将扩大后续 Epic 的技术债和数据隔离风险。

## Section 2: Impact Analysis

### Epic Impact

- Epic 2 受影响最大：`2-1`、`2-2`、`2-3`、`2-4` 的验收标准需要补充“内部账户映射”和“account_id 隔离”的明确约束。
- Epic 2 可继续推进，但需先完成身份域语义对齐（文档 + 实现）。

### Story Impact

- 当前进行中：`2-3-workspace-create`（直接阻塞，需先修正数据归属语义）。
- 紧随其后：`2-4-workspace-delete`（删除权限边界必须基于内部账户归属）。
- 已完成故事：`2-1`、`2-2` 功能可用，但验收标准需补齐“账户映射存在且不因登出删除”的约束。

### Artifact Conflicts

- PRD 冲突：出现“无独立账号系统”表述，容易被实现误读为“不需要内部账户映射表”。
- Architecture 冲突：文档定义 `auth_accounts + account_id`，当前实现是 `owner_clerk_id`。
- UX 影响：界面交互主流程不需要重绘，主要是后端语义与权限边界修正。

### Technical Impact

- 数据库：需补 `auth_accounts` 表，工作空间归属切换到 `account_id`。
- 应用层：认证依赖与业务服务需从 `clerk_account_id` 透传改为“先映射内部账号，再以 account_id 访问业务数据”。
- 测试层：用户隔离测试从 `owner_clerk_id` 语义升级为 `account_id` 语义。
- 交付链路：后续仓库绑定、AI 配置、Story/PR 流程统一复用 `account_id`，避免重复返工。

## Section 3: Recommended Approach

### Selected Path

选择 `Option 1: Direct Adjustment`（直接调整）。

### Rationale

- 不回滚已完成用户功能，保留迭代节奏。
- 与 `architecture.md` 的 ADR-014 强制隔离策略对齐。
- 最小化后续 Epic 的跨模块返工成本。

### Effort, Risk, Timeline

- Effort: `Medium`（约 2~3 个开发日）
- Risk: `Medium`（涉及迁移与隔离逻辑切换）
- Timeline Impact: 当前 Sprint 预计延长 `1~2` 天，取决于迁移与回归测试结果。

### Risk Mitigation

- 先改文档与验收标准，再改代码，确保评审标准一致。
- 迁移采用可回滚脚本，先加表/字段，再切服务读写路径，最后清理旧字段。
- 在测试中增加“跨账号不可见/不可删”回归用例，防止隔离回退。

## Section 4: Detailed Change Proposals

### 4.1 Stories

#### Story 2.1 (Sign In) - Acceptance Criteria

OLD:

- Given 未登录用户在登录页
- When 选择 Clerk 登录方式（邮箱/Google/GitHub Account）并完成授权
- Then 5 秒内进入系统并显示用户头像和用户名
- And 登录被取消或失败时显示失败原因并保持在登录页

NEW:

- Given 未登录用户在登录页
- When 选择 Clerk 登录方式（邮箱/Google/GitHub Account）并完成授权
- Then 5 秒内进入系统并显示用户头像和用户名
- And 系统在首次登录时创建内部账号映射（`auth_accounts`），后续登录复用该映射
- And 登录被取消或失败时显示失败原因并保持在登录页

Justification: 保留 Clerk 认证体验，同时建立内部账号主数据，为业务隔离提供稳定主键。

#### Story 2.2 (Sign Out) - Acceptance Criteria

OLD:

- Given 用户已登录
- When 点击登出
- Then 立即清除本地会话并跳转至登录页
- And 登出后不可访问受保护页面

NEW:

- Given 用户已登录且存在内部账号映射（`auth_accounts`）
- When 点击登出
- Then 立即清除本地会话并跳转至登录页
- And 登出后不可访问受保护页面
- And 登出不会删除 `auth_accounts` 账号映射记录（仅结束会话）

Justification: 明确会话与账号实体职责边界，避免生命周期混淆。

#### Story 2.3 (Workspace Create) - Acceptance Criteria

OLD:

- Given 用户已登录并进入工作空间列表页
- When 输入工作空间名称（1-50字符）并点击创建
- Then 1 秒内显示新工作空间卡片
- And 工作空间名称重复或不合法时显示错误提示且不创建工作空间

NEW:

- Given 用户已登录并完成内部账号映射（`auth_accounts` 可关联到当前 Clerk 身份）
- When 输入工作空间名称（1-50字符）并点击创建
- Then 1 秒内显示新工作空间卡片
- And 新工作空间以内部 `account_id` 作为所有者归属（不直接使用 `owner_clerk_id` 作为域隔离主键）
- And 同一 `account_id` 下工作空间名称唯一（重复名称返回冲突提示且不创建）
- And 工作空间名称不合法时显示错误提示且不创建工作空间

Justification: 解除外部身份标识与内部业务归属耦合，恢复架构一致性。

#### Story 2.4 (Workspace Delete) - Acceptance Criteria

OLD:

- Given 用户在工作空间列表中选择某工作空间
- When 点击删除
- Then 弹出二次确认对话框（含工作空间名称）
- And 用户确认删除后 1 秒内从工作空间列表中移除，取消删除则工作空间保持不变

NEW:

- Given 用户在工作空间列表中选择某工作空间
- When 点击删除
- Then 弹出二次确认对话框（含工作空间名称）
- And 用户确认删除后 1 秒内从工作空间列表中移除，取消删除则工作空间保持不变
- And 删除操作仅允许作用于当前 `account_id` 归属的工作空间（跨账号访问返回无权限/不存在）
- And 删除不会影响 `auth_accounts` 账户映射记录

Justification: 明确删除权限边界与账号数据边界，降低越权风险。

### 4.2 PRD

需要更新以下内容：

1. 将“无独立账号系统”改为“无本地登录凭据系统，但保留内部账户映射（`auth_accounts`）用于业务隔离与审计”。
2. Epic 2 的 Story 拆分验收标准同步上述四条变更。
3. 用户模型/权限模型中补充“用户资源归属主键为 `account_id`，Clerk ID 仅用于身份映射”。

### 4.3 Architecture

需要更新以下内容：

1. 在“实现现状”中补充当前偏差：`workspace_workspaces.owner_clerk_id` 与目标不一致。
2. 在“迁移策略”中补充分阶段落地：
   - Phase 1: 创建 `auth_accounts`
   - Phase 2: `workspace_workspaces` 增加 `account_id` 并回填
   - Phase 3: 服务层改用 `account_id`
   - Phase 4: 清理 `owner_clerk_id`
3. 在 ADR-014 执行清单中加入“Epic 2 实施前置校验项”。

### 4.4 UI/UX

本次无需重做页面交互，仅需在交互说明中补充：

- 登录成功后的后端动作包含内部账号映射建立/复用。
- 删除工作空间的权限校验基于账户归属（用户感知仍是标准权限错误提示）。

## Section 5: Implementation Handoff

### Scope Classification

`Moderate`（中等变更）：需要 backlog 重排与 PO/SM 协同，不是单纯开发直改。

### Handoff Recipients

- Product Owner / Scrum Master
- Backend Development Team
- Solution Architect（评审迁移与隔离策略）

### Responsibilities

- PO/SM：更新 Epic 2 的 Story 验收标准与 Sprint 排期。
- Backend：实现 `auth_accounts`、`account_id` 迁移与服务改造。
- Architect：评审 ADR-014 对齐程度与回滚策略。

### Success Criteria

- Story 2.1~2.4 验收标准已全部更新并通过评审。
- `workspace_workspaces` 读写隔离以 `account_id` 为准。
- 跨账号读取/删除工作空间用例全部失败（符合预期拒绝）。
- `sprint-status.yaml` 与实施任务一致，执行责任人明确。

