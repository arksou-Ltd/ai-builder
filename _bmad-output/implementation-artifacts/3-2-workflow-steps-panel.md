# Story 3.2: workflow-steps-panel

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a PM 用户,  
I want 在左侧看到完整工作流步骤与当前状态,  
so that 我可以明确当前阶段和整体推进节奏。

## Acceptance Criteria

1. **Given** 用户已进入需求执行工作区  
   **When** 页面初始化或状态更新  
   **Then** 步骤面板展示 8 个核心步骤及状态图标（待执行/进行中/已完成）。

2. **Given** 步骤面板已渲染  
   **When** 当前步骤变化  
   **Then** 当前步骤高亮显示，已完成步骤显示勾选标记。

3. **Given** 工作流状态发生变更  
   **When** 前端接收到状态更新事件  
   **Then** 步骤状态变化后 1 秒内同步到界面。

4. **Given** 用户刷新页面或重新进入同一工作空间执行页  
   **When** 页面重新加载  
   **Then** 可恢复当前步骤与已完成状态，不出现状态丢失。

## Tasks / Subtasks

- [ ] Task 1: 定义步骤面板的领域模型与状态映射（AC: 1,2）
  - [ ] 新增 `frontend/app-web/src/lib/workflow/workflow-steps.ts`，定义 8 个核心步骤常量（稳定 `stepId`、排序、i18n key、默认状态）。
  - [ ] 约束状态枚举为 `pending | in_progress | completed`，并提供 UI 映射配置（颜色、图标、文案）。
  - [ ] 统一步骤 ID 命名，避免后续 Story 3.4/3.6/3.7 接入实时事件时出现状态键不一致。

- [ ] Task 2: 实现可复用的工作流步骤面板组件（AC: 1,2）
  - [ ] 新增 `frontend/app-web/src/components/workspace/WorkflowStepsPanel.tsx`，渲染 8 个步骤与状态图标。
  - [ ] 当前步骤使用明确高亮样式（边框/背景/文字），已完成步骤渲染勾选图标。
  - [ ] 组件需满足键盘可达、语义标签与可访问属性（`aria-current`、`aria-live` 适配状态变化播报）。

- [ ] Task 3: 在执行页接入步骤面板并替换占位按钮（AC: 1,2,3）
  - [ ] 修改 `frontend/app-web/src/app/[locale]/workspace/[workspaceId]/page.tsx` 左侧面板区域，接入 `WorkflowStepsPanel`。
  - [ ] 抽离 `useWorkspaceWorkflowSteps`（建议放在 `frontend/app-web/src/components/workspace/hooks/`）统一组织步骤数据与当前步骤。
  - [ ] 保留 Story 3.3 导航树插槽，确保本 Story 的实现不会阻塞后续左侧区域 B 增量开发。

- [ ] Task 4: 建立刷新恢复能力与一致性策略（AC: 3,4）
  - [ ] 使用 Zustand（`zustand` + `persist`）新增 `frontend/app-web/src/lib/workflow/workflow-steps-store.ts`，按 `workspaceId` 持久化当前步骤与完成状态。
  - [ ] 页面初始化时恢复缓存状态；数据损坏或版本不兼容时自动回退到默认步骤状态。
  - [ ] 定义最小一致性规则：完成步骤集合与当前步骤冲突时自动收敛（例如当前步骤不能落在已完成步骤之前）。

- [ ] Task 5: 补齐步骤状态更新入口（AC: 3）
  - [ ] 在 `frontend/app-web/src/lib/workflow/` 新增事件适配层（如 `workflow-step-events.ts`），统一处理步骤状态更新输入。
  - [ ] 先支持本地真实事件源（页面动作或已存在数据流）触发更新，预留 Story 3.4 WebSocket In-flow 更新接入点。
  - [ ] 增加 1 秒同步约束的实现保护（避免异步批处理导致 UI 超时更新）。

- [ ] Task 6: 国际化与状态文案（AC: 1,2,3）
  - [ ] 更新 `frontend/app-web/messages/zh-CN.json` 与 `frontend/app-web/messages/en.json`，新增 8 个步骤标签、状态图例、步骤面板标题与辅助提示文案。
  - [ ] 保证所有新增文案通过 `next-intl` 读取，不在组件中写死字符串。
  - [ ] 与现有 `localePrefix: "never"` 路由策略保持一致，不引入带 locale 前缀的硬编码路径判断。

- [ ] Task 7: E2E 验证与可访问性验证（No Mock）（AC: 1,2,3,4）
  - [ ] 新增或扩展 `frontend/app-web/e2e/workspace-workflow-steps.spec.ts`，覆盖：8 步骤渲染、当前步骤高亮、完成态勾选、1 秒内状态同步。
  - [ ] 覆盖刷新恢复场景（浏览器 `reload` 后状态保持）。
  - [ ] 验证关键可访问性要求：键盘导航顺序、可见焦点、状态更新播报；禁止使用 mock/stub/fake/spy/网络拦截替身。

## Dev Notes

### Story Foundation

- 本 Story 是 Epic 3 左侧区域 A 的首个功能落地，基于 Story 3.1 已完成的三面板壳层继续增量实现。
- 本 Story 只交付“步骤面板 + 状态可视化 + 刷新恢复”，左侧导航树（Story 3.3）和中间/右侧编排能力在后续故事实现。
- 本 Story 直接承接 FR42、FR52，并为 FR43、FR44、FR56 提供状态基础。

### Developer Context Section

- 当前左侧区域仍是两个占位按钮，位于 `frontend/app-web/src/app/[locale]/workspace/[workspaceId]/page.tsx`。
- Story 3.1 已建立桌面门控、错误恢复、Settings 入口和壳层布局，当前 Story 需复用既有结构而不是重建页面框架。
- 由于后端尚未提供专用 workflow-steps API，本 Story 需先实现“前端真实持久化 + 可扩展事件适配层”，并为后续 WebSocket 接入保留稳定接口。

### Dev Agent Guardrails: Technical Requirements

| Check Item | Requirement |
| --- | --- |
| Steps Count | 必须渲染固定 8 个核心步骤，不允许按数据缺省少渲染 |
| Status Set | 仅允许 `pending / in_progress / completed` 三态进入步骤面板展示层 |
| Update SLA | 状态变更到 UI 反馈需在 1 秒内完成 |
| Persistence | 刷新恢复必须按 `workspaceId` 隔离，禁止跨工作空间串状态 |
| Accessibility | 当前步骤需语义可识别（`aria-current`），状态变化需可被读屏感知 |
| UI/Interaction Compliance | 涉及前端界面与交互的实现，必须严格遵循 `_bmad-output/planning-artifacts/ux-design-specification.md`，并在需求分析、设计、实现、验收全流程应用 `ui-ux-pro-max` 规范 |

### Dev Agent Guardrails: Architecture Compliance

| Check Item | Requirement |
| --- | --- |
| Frontend Architecture | 保持 App Router + 组件分层；页面编排与组件展示分离 |
| State Persistence | 遵循 ADR-004 的“状态可持久化/可恢复”原则，前端实现需为后端持久化迁移预留边界 |
| Event Model | 对齐 ADR-005 `workflow.step` 事件语义，前端内部事件结构避免偏离 |
| Error Handling | 状态恢复失败需降级到默认步骤集并保持页面可用 |

### Dev Agent Guardrails: Library & Framework Requirements

| Library | Required Version/Constraint | Why |
| --- | --- | --- |
| `next` | 保持 `16.x`（当前仓库 `16.1.6`） | 与现有 App Router / i18n / proxy 策略一致 |
| `react/react-dom` | 保持 `19.x`（不低于 `19.2.1`） | 避免已披露安全问题版本回退 |
| `next-intl` | 保持 v4 路由策略（`localePrefix: "never"`） | 与当前路由/中间件策略一致，避免认证与路由回环 |
| `@tanstack/react-query` | 继续使用 v5 查询/缓存模式 | 与现有 Providers 和数据获取范式一致 |
| `zustand` | 使用现有依赖实现步骤状态持久化 | 轻量、可按 workspace 作用域持久化 |

### Dev Agent Guardrails: File Structure Requirements

- 左侧步骤面板组件：`frontend/app-web/src/components/workspace/WorkflowStepsPanel.tsx`
- 步骤常量与状态映射：`frontend/app-web/src/lib/workflow/workflow-steps.ts`
- 状态持久化 store：`frontend/app-web/src/lib/workflow/workflow-steps-store.ts`
- 事件适配层：`frontend/app-web/src/lib/workflow/workflow-step-events.ts`
- 页面接入点：`frontend/app-web/src/app/[locale]/workspace/[workspaceId]/page.tsx`
- 国际化文案：`frontend/app-web/messages/zh-CN.json`、`frontend/app-web/messages/en.json`
- E2E：`frontend/app-web/e2e/workspace-workflow-steps.spec.ts`

### Dev Agent Guardrails: Testing Requirements

| Check Item | Requirement |
| --- | --- |
| E2E Coverage | 覆盖 8 步骤渲染、当前步骤高亮、已完成勾选、1 秒状态同步、刷新恢复 |
| Desktop Baseline | 至少验证 `1024px` 场景，不仅验证 `1280px` |
| Accessibility | 验证键盘可达、focus-visible、语义属性与状态播报 |
| UX Spec Conformance | 前端测试与评审必须逐项对照 `_bmad-output/planning-artifacts/ux-design-specification.md` 与 `ui-ux-pro-max` 检查清单，未满足项不得标记完成 |
| No Mock Policy | 禁止 mock/stub/fake/spy 与网络拦截替身；仅使用真实页面与真实数据链路 |
| Regression Guard | 不得破坏 Story 3.1 已交付的壳层布局、DesktopGuard、Settings 入口 |

### Previous Story Intelligence

- Story 3.1 的复审问题表明：UI 状态禁止硬编码，必须来自真实状态源并可追溯。
- 最小桌面断点（1024px）与可访问性检查必须进入自动化验证，而非仅做静态断言。
- 不稳定外部依赖（如跳转外网站点）不应成为测试通过前提，步骤面板测试同样应保持本地可重复。
- 非桌面设备不进入执行流是既有约束，本 Story 不得绕开 `DesktopGuard` 或触发无意义数据请求。

### Git Intelligence Summary

- 最近提交集中体现了 Epic 3 前置治理重点：状态一致性、质量门槛前置、No Mock 可视化与可阻断化。
- `feat: 界面优化` 与 `fix(backend:workspace): 完成第三轮复审修复` 说明当前代码库正处于“交互层快速迭代 + 复审驱动收敛”阶段。
- 对本 Story 的直接启示：先建立稳定状态模型与可验证面板，再扩展 Story 3.3~3.7 的更多交互，避免重复返工。

### Latest Tech Information

- Next.js 官方在 2026-02-05 发布 `Next.js 16.2`，包含 App Router 与缓存相关更新；本 Story 保持现有 16.x 主线并避免引入实验性行为。
- Next.js 安全通告显示历史版本存在中间件相关授权绕过与 SSRF 风险，需避免回退到低版本线。
- React 官方在 2025-10-01 发布 19.2.1 安全修复；本项目当前 React 19.2.3 版本满足修复后基线。
- TanStack Query v5 与 next-intl v4 仍是当前主线版本，适合继续沿用现有 Provider 和路由策略，不在本 Story 做版本迁移。

### Project Context Reference

- 遵循 `_bmad-output/project-context.md` 的边界：
  - 路由与国际化继续使用 `next-intl` 与 `localePrefix: "never"`。
  - 页面状态管理优先复用现有前端技术栈，不重复实现基础设施能力。
  - 保持“前端可恢复 + 后续可迁移到后端持久化”的演进路径。

### References

- `_bmad-output/planning-artifacts/epics.md`（Epic 3 / Story 3.2）
- `_bmad-output/planning-artifacts/prd.md`（FR42, FR52, FR53, FR56, NFR-R1, NFR-P1）
- `_bmad-output/planning-artifacts/architecture.md`（ADR-004, ADR-005）
- `_bmad-output/planning-artifacts/ux-design-specification.md`（步骤指示器、状态视觉规范、可访问性规范）
- `_bmad-output/implementation-artifacts/3-1-workspace-shell-three-panel-layout.md`（前序实现与复审经验）
- `_bmad-output/implementation-artifacts/epic-2-retro-2026-02-14.md`（状态一致性、质量门槛、No Mock 前置）
- `_bmad-output/implementation-artifacts/epic-3-prep-checklist.md`（Epic 3 启动前约束）
- `_bmad-output/project-context.md`
- `https://nextjs.org/blog/next-16-2`
- `https://nextjs.org/blog/cve-2025-29927`
- `https://nextjs.org/blog/cve-2025-66478`
- `https://react.dev/blog/2025/10/01/react-19-2`
- `https://github.com/TanStack/query/releases`
- `https://github.com/amannn/next-intl/releases`

## Story Completion Status

- Story context 已生成并标记为 `ready-for-dev`。
- 本 Story 与 Story 3.1 对齐，聚焦“左侧步骤面板 + 状态恢复”能力，不提前实现 Story 3.3 及后续区域功能。
- 已补齐实现护栏、前序经验与验证要求，可直接进入 `dev-story`。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 自动执行 create-story workflow（零人工中断模式）

### Completion Notes List

- 完成 Story 3.2 需求上下文整理（需求、架构、UX、前序经验、Git 模式）
- 明确 8 步骤面板的最小实现边界与后续扩展接口
- 明确刷新恢复与 1 秒内同步的实现约束
- 明确 No Mock 测试策略与可访问性验证范围

### File List

- `_bmad-output/implementation-artifacts/3-2-workflow-steps-panel.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
