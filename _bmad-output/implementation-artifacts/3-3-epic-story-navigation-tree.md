# Story 3.3: epic-story-navigation-tree

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a PM 用户,  
I want 在左侧查看并切换 Epic/Story 导航树,  
so that 我可以快速定位当前执行对象并了解各 Story 状态。

## Acceptance Criteria

1. **Given** 当前工作空间存在至少 1 个 Epic  
   **When** 用户展开 Epic 节点  
   **Then** 展示该 Epic 下 Story 列表及状态标识（待开发/开发中/Review中/Done）。

2. **Given** 导航树已渲染  
   **When** 用户切换当前 Story  
   **Then** 当前 Story 具备明确选中态  
   **And** 中间区域与右侧区域在 1 秒内同步到当前选中 Story 的上下文。

3. **Given** 导航树存在尚未解锁的 Story  
   **When** 用户尝试点击未解锁 Story  
   **Then** 该 Story 以禁用样式展示且不可选中，避免跳步执行。

4. **Given** 用户操作 Epic/Story 导航树  
   **When** 用户展开或折叠节点  
   **Then** 导航树支持展开/折叠  
   **And** 交互过渡时长在 150-300ms 内。

## Tasks / Subtasks

- [x] Task 1: 定义 Epic/Story 导航树领域模型与状态映射（AC: 1,3）
  - [x] 新增 `frontend/app-web/src/lib/workflow/workflow-story-tree.ts`，定义 `EpicNode`、`StoryNode`、`StoryExecutionStatus`、`StoryLockState` 等类型。
  - [x] 统一状态枚举：`backlog | in_progress | review | done`，并映射到状态标签样式（灰/蓝/橙/绿）与可访问文本。
  - [x] 定义解锁规则函数（按 Story 顺序执行）：仅当前可执行 Story 和已完成 Story 可选中，后续 backlog Story 默认 `locked`。

- [x] Task 2: 实现导航树状态容器与持久化（AC: 1,2,3）
  - [x] 新增 `frontend/app-web/src/lib/workflow/workflow-story-tree-store.ts`（Zustand + persist），按 `workspaceId` 隔离存储展开态与选中态。
  - [x] 提供 `selectStory`, `toggleEpic`, `syncStoryStatuses` 等原子操作，保证切换后中间区与右侧区可读取同一选中 Story。
  - [x] 对持久化数据做版本与结构校验；损坏时回退默认状态，防止 UI 进入不可恢复状态。

- [x] Task 3: 实现左侧区域 B 导航树组件（AC: 1,3,4）
  - [x] 前端视觉与交互设计前，必须先执行 `ui-ux-pro-max` skill，输出可追溯的设计约束清单（色彩、层级、动效、无障碍）并据此实现。
  - [x] 新增 `frontend/app-web/src/components/workspace/EpicStoryNavigationTree.tsx`，渲染 Epic → Story 两层结构与状态标识。
  - [x] 使用现有 shadcn/Radix Accordion 能力实现展开折叠，过渡控制在 150-300ms，避免跳变。
  - [x] 锁定 Story 使用禁用态视觉（颜色、光标、opacity）与 `aria-disabled=”true”`，禁止触发选中回调。

- [x] Task 4: 打通页面编排与跨区域同步（AC: 2）
  - [x] 在 `frontend/app-web/src/app/[locale]/workspace/[workspaceId]/page.tsx` 左侧 `WorkflowStepsPanel` 下接入 `EpicStoryNavigationTree`，替换 Story 3.3 占位注释。
  - [x] 将中间区域占位与右侧 `progress` Tab 占位改为读取”当前选中 Story 上下文”（标题、状态、所属 Epic），验证选择切换链路已打通。
  - [x] 若选中 Story 切换失败或数据缺失，降级到最近一次有效选中项并显示可恢复提示。

- [x] Task 5: 统一事件入口并预留后续实时接入点（AC: 2）
  - [x] 新增 `frontend/app-web/src/lib/workflow/workflow-story-tree-events.ts`，约定 `workflow.story.select` / `workflow.story.status` 事件格式。
  - [x] 页面级订阅与分发遵循 Story 3.2 的 `subscribeWorkflowStepEvents` 模式，确保事件到 UI 同步满足 1 秒 SLA。
  - [x] 预留 Story 3.4 WebSocket In-flow updates 接入函数，避免后续重构导航树内部实现。

- [x] Task 6: 国际化与可访问性完善（AC: 1,3,4）
  - [x] 验收前端设计输出时，必须对照 `ui-ux-pro-max` skill 检查项逐条核对，不满足项不得标记完成。
  - [x] 更新 `frontend/app-web/messages/zh-CN.json` 与 `frontend/app-web/messages/en.json`，新增导航树标题、状态文案、锁定提示、空态与错误文案。
  - [x] 导航树语义使用 `role=”tree”` / `role=”treeitem”` / `aria-expanded` / `aria-selected`，并支持键盘导航（Up/Down/Left/Right/Enter）。
  - [x] 确保 focus-visible 可见、图标按钮具备 `aria-label`，满足 WCAG AA 要求。

- [x] Task 7: E2E 验证（No Mock）（AC: 1,2,3,4）
  - [x] 新增 `frontend/app-web/e2e/workspace-epic-story-tree.spec.ts`，覆盖 Epic 展开后 Story 列表与状态标签显示。
  - [x] 覆盖 Story 切换后中间与右侧区域同步更新（1 秒内）、未解锁 Story 禁止选中、展开折叠动效时长断言（150-300ms）。
  - [x] 覆盖可访问性检查：键盘导航路径、`aria-*` 属性、禁用项播报；禁止 mock/stub/fake/spy/网络拦截替身。

## Dev Notes

### Story Foundation

- 本 Story 是 Epic 3 左侧区域 B 的核心交付，基于 Story 3.1 壳层与 Story 3.2 步骤面板继续增量实现。
- 本 Story 直接承接 FR53（Story 状态可见）并与 FR42/FR52 的步骤面板协同，形成左侧“双层导航”。
- 本 Story 重点是“可选中、可同步、可禁用、可折叠”的交互闭环，不提前实现 Story 3.4 对话流与 Story 3.7 进度 Tab 全量内容。

### Developer Context Section

- 当前执行页左侧 A 区已完成 `WorkflowStepsPanel`，左侧 B 区仍是占位（`page.tsx` 已标注 Story 3.3 待实现）。
- 现有后端尚未提供 Epic/Story 导航树专用 API，当前实现需先保证前端“真实可运行状态容器 + 事件入口”落地，并保留后续接入后端数据源的适配边界。
- 中间区与右侧区目前是占位内容；本 Story 需要把“选中 Story 上下文”同步到两个区域，作为后续 Story 3.4/3.7 的统一输入。

### Dev Agent Guardrails: Technical Requirements

| Check Item | Requirement |
| --- | --- |
| Tree Structure | 必须渲染 Epic → Story 两层结构；每个 Story 显示状态标签（待开发/开发中/Review中/Done） |
| Selection Sync | Story 选中后，左/中/右区域共享同一 selectedStoryId，UI 更新 SLA ≤ 1 秒 |
| Lock Rule | 未解锁 Story 必须禁用且不可选中，禁止跳步执行 |
| Motion Budget | 展开/折叠动效时长严格控制在 150-300ms，避免过慢或突变 |
| Accessibility | `role="tree"`、`aria-selected`、`aria-expanded`、键盘导航与 focus-visible 必须完整可用 |
| Skill Requirement | 前端设计与交互实现必须使用 `ui-ux-pro-max` skill 作为强制输入，不得跳过 |
| UI/Interaction Compliance | 涉及前端界面与交互实现，必须严格遵循 `_bmad-output/planning-artifacts/ux-design-specification.md` 与 `ui-ux-pro-max` 检查清单 |

### Dev Agent Guardrails: Architecture Compliance

| Check Item | Requirement |
| --- | --- |
| Frontend Layering | 页面层只做编排与状态拼装，导航树渲染逻辑下沉到 `components/workspace`，状态逻辑放在 `lib/workflow` |
| State Persistence | 对齐 ADR-004：导航树展开态、选中态支持刷新恢复，且按 `workspaceId` 隔离 |
| Event Contract | 对齐 ADR-005：事件格式语义清晰，支持后续 WebSocket 状态广播接入 |
| Error Recovery | 状态数据缺失或损坏时自动回退默认节点，页面保持可操作而非白屏 |
| No Regression | 不破坏 Story 3.1 的 DesktopGuard / 三面板布局 / Settings Tab，也不破坏 Story 3.2 步骤面板行为 |

### Dev Agent Guardrails: Library & Framework Requirements

| Library | Required Version/Constraint | Why |
| --- | --- | --- |
| `next` | 维持 `16.1.6`（16.x 线） | 与现有 App Router 和中间件策略一致，避免不必要升级风险 |
| `react` / `react-dom` | 维持 `19.2.3` 基线并关注安全修复公告 | 避免回退到已披露漏洞版本；保持与 Next 16 兼容 |
| `next-intl` | 维持 v4 + `localePrefix: "never"` 路由策略 | 保持认证与路由行为稳定，避免 locale 路由回环 |
| `zustand` | 使用现有 `persist` 中间件并启用 `partialize` | 减少持久化噪音数据，提升恢复稳定性 |
| shadcn/Radix Accordion | 复用已接入组件体系实现树节点折叠 | 具备键盘支持与状态属性，减少重复造轮子 |

### Dev Agent Guardrails: File Structure Requirements

- 新增导航树领域模型：`frontend/app-web/src/lib/workflow/workflow-story-tree.ts`
- 新增导航树状态存储：`frontend/app-web/src/lib/workflow/workflow-story-tree-store.ts`
- 新增导航树事件适配层：`frontend/app-web/src/lib/workflow/workflow-story-tree-events.ts`
- 新增导航树组件：`frontend/app-web/src/components/workspace/EpicStoryNavigationTree.tsx`
- 新增导航树 hook（如需要）：`frontend/app-web/src/components/workspace/hooks/useWorkspaceStoryTree.ts`
- 页面接入点：`frontend/app-web/src/app/[locale]/workspace/[workspaceId]/page.tsx`
- 国际化文案：`frontend/app-web/messages/zh-CN.json`、`frontend/app-web/messages/en.json`
- E2E：`frontend/app-web/e2e/workspace-epic-story-tree.spec.ts`

### Dev Agent Guardrails: Testing Requirements

| Check Item | Requirement |
| --- | --- |
| AC Coverage | 覆盖 Epic 展开、Story 状态显示、选中同步、锁定禁用、折叠动效时长 |
| Sync SLA | 显式计时验证 Story 切换后中间区与右侧区在 1 秒内完成更新 |
| Accessibility | 覆盖键盘导航与 `aria-*` 语义断言，包含禁用 Story 的读屏可感知状态 |
| Desktop Baseline | 至少覆盖 `1024px` 与 `1280px` 两个桌面断点 |
| Skill Gate | 提交前需附带 `ui-ux-pro-max` 检查结果；缺失即视为未通过 |
| No Mock Policy | 禁止 mock/stub/fake/spy 与网络拦截替身；使用真实页面与真实状态链路 |
| Regression Guard | 不得破坏 `workspace-shell.spec.ts`、`workspace-workflow-steps.spec.ts` 已通过场景 |

### Previous Story Intelligence

- Story 3.2 复审结论明确：状态更新必须订阅真实 store 切片，不能只读方法引用，否则 UI 不会稳定重渲染。
- 事件适配层必须接入真实页面生命周期；“只定义函数未接线”会导致 AC3 类 SLA 无法成立。
- 持久化恢复必须校验 `stepId/status/currentStepId` 等关键字段，防止脏数据导致 UI 崩溃或错态。
- A11y 验证不能停留在静态属性断言，必须包含真实键盘路径与 focus-visible 可见性检查。

### Git Intelligence Summary

- 最近提交显示 Epic 3 进入“交互层快速迭代 + 复审驱动收敛”阶段，重点是消除硬编码与状态不同步问题。
- `fix(frontend:app-web): 修复工作流步骤状态恢复与事件一致性` 表明当前代码对“事件驱动 + 状态恢复”敏感，本 Story 应沿用相同模式。
- `feat(frontend:app-web): 将设置入口迁移到右侧面板Tab` 说明页面编排仍在持续演化，本 Story 需避免侵入式改动右侧 Tab 框架。

### Latest Tech Information

- WAI-ARIA APG 的 Treeview 模式要求支持方向键导航、展开/折叠与 `aria-selected` 语义，本 Story 导航树需按该键盘交互基线实现。
- Radix Accordion 文档明确支持完整键盘导航，并通过 `data-state="open|closed"` 暴露状态，适合用于实现 150-300ms 折叠动效与状态样式控制。
- next-intl v4 路由配置支持 `localePrefix: "never"`，与当前项目路由策略一致，本 Story 不应引入显式 locale 前缀路径分支。
- Zustand 官方 `persist` 中间件建议配合 `partialize` 精简落盘字段，本 Story 状态存储应仅持久化导航树必要状态。
- Next.js 官方安全公告（2025-12-11）指出中间件授权绕过漏洞在特定版本修复，必须避免回退到受影响版本区间。
- React 官方安全公告（2025-12）披露 React Server Components 相关漏洞并给出修复版本线，当前工程需持续关注安全补丁窗口。

### Project Context Reference

- 遵循 `_bmad-output/project-context.md` 的核心边界：  
  - 前端维持 Next.js App Router + next-intl + Zustand 现有模式，不新增平行状态体系。  
  - 所有交互对用户可见文案必须国际化；UI 与可访问性规范必须与 UX 规范一致。  
  - 事件驱动能力优先复用现有 `lib/workflow` 结构，保持后续 Story 3.4/3.7 可接入性。

### References

- `_bmad-output/planning-artifacts/epics.md`（Epic 3 / Story 3.3）
- `_bmad-output/planning-artifacts/prd.md`（FR42, FR52, FR53, FR56, NFR-R1）
- `_bmad-output/planning-artifacts/architecture.md`（ADR-004, ADR-005）
- `_bmad-output/planning-artifacts/ux-design-specification.md`（导航树、动效、可访问性、桌面断点）
- `_bmad-output/implementation-artifacts/3-1-workspace-shell-three-panel-layout.md`
- `_bmad-output/implementation-artifacts/3-2-workflow-steps-panel.md`
- `_bmad-output/project-context.md`
- `https://www.w3.org/WAI/ARIA/apg/patterns/treeview/`
- `https://www.radix-ui.com/primitives/docs/components/accordion`
- `https://next-intl.dev/docs/routing/configuration`
- `https://zustand.docs.pmnd.rs/middlewares/persist`
- `https://nextjs.org/blog/cve-2025-29927`
- `https://nextjs.org/blog/cve-2025-66478`
- `https://react.dev/blog/2025/12/11/react-router-and-proxy-helpers-vulnerability`
- `https://react.dev/blog/2025/12/16/react-server-components-security-holiday-update`

## Story Completion Status

- 所有 7 个 Task 及其子任务已全部实现并标记 [x]。
- 已修复 code-review 发现的高/中优先级问题（Accordion 接入、恢复提示链路、构建错误、文档追溯缺口）。
- TypeScript 编译通过，ESLint 零错误零警告。
- Story 状态已更新为 `done`，sprint-status.yaml 已同步更新。
- E2E 测试覆盖 AC1-4 全部验收标准，包含双桌面断点（1024px/1280px）。
- `ui-ux-pro-max` 检查清单已归档至实现产物目录，可追溯复核。

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- 自动执行 create-story workflow（指定 Story: `3-3`，零人工中断模式）
- dev-story workflow 执行：2026-02-23
- code-review 修复与复核：2026-02-23

### Completion Notes List

- 完成 Epic 3 / Story 3.3 的需求、架构、UX、现有代码基线与前序故事经验分析。
- 生成可直接执行的任务拆解（含状态映射、事件同步、禁用规则、动效与 A11y 要求）。
- 纳入最新技术信息（WAI Treeview、Radix Accordion、next-intl、Zustand、Next/React 安全公告）作为开发护栏。
- 输出文件名与 sprint-status story key 对齐，便于后续 `dev-story` 与 `code-review` 流程衔接。
- Task 1: 实现 `workflow-story-tree.ts` 领域模型，定义 4 种 Story 执行状态（backlog/in_progress/review/done）、状态 UI 映射（灰/蓝/橙/绿）、解锁规则函数 `resolveStoryLockStates`。
- Task 2: 实现 `workflow-story-tree-store.ts` Zustand 持久化 store，按 workspaceId 隔离，提供 selectStory/toggleEpic/syncStoryStatuses 原子操作，含版本校验与损坏回退机制。
- Task 3: 实现 `EpicStoryNavigationTree.tsx` 组件，渲染 Epic → Story 两层树结构，使用 CSS transition 实现 150-300ms 展开折叠动效，锁定 Story 禁用态（opacity-50 + cursor-not-allowed + aria-disabled），完整键盘导航支持（ArrowUp/Down/Left/Right/Enter/Home/End）。
- Task 4: 在 page.tsx 接入导航树组件，替换 Story 3.3 占位注释，中间区和右侧 progress Tab 同步显示选中 Story 上下文（标题、状态、所属 Epic）。
- Task 5: 实现 `workflow-story-tree-events.ts` 事件适配层，定义 workflow.story.select/workflow.story.status 事件，遵循 Story 3.2 subscribeWorkflowStepEvents 模式，预留 WebSocket 接入函数。
- Task 6: 更新 zh-CN.json 和 en.json 国际化文件，新增 storyTree 命名空间（标题、状态文案、空态、锁定提示），组件实现完整 WAI-ARIA Treeview 语义（role="tree"/treeitem、aria-expanded/selected/disabled）。
- Task 7: 新增 `workspace-epic-story-tree.spec.ts` E2E 测试，覆盖 AC1-4 全部场景（Epic 展开/状态标签/选中同步计时/锁定禁用/折叠动效时长/键盘导航/aria 属性/禁用项读屏/刷新恢复/双断点），严格遵循 No Mock Policy。
- 安装 shadcn Accordion 组件（`src/components/ui/accordion.tsx`）作为 Radix Accordion 封装。
- TypeScript 编译零错误（新代码），ESLint 零错误零警告。
- 未引入任何新的框架依赖（Accordion 为 shadcn/radix-ui 已有体系的扩展）。
- 导航树改为受控 Accordion 开合，补齐任务声明与实现一致性。
- 持久化恢复链路补齐“自动回退 + 可恢复提示”标记，避免无提示降级。
- 修复 `e2e/auth.setup.ts` 超时配置写法，恢复 `next build` 类型检查通过。
- 补充 `ui-ux-pro-max` 追溯清单，并同步 File List 记录 `api-client.ts` 实际变更。

### Change Log

- 2026-02-23: Story 3.3 实现完成 - Epic/Story 导航树（领域模型 + 持久化 Store + 事件适配层 + 导航树组件 + 页面接入 + 国际化 + E2E 测试）
- 2026-02-23: Code Review 修复完成 - 对齐 Accordion 实现、恢复提示链路、构建校验与文档追溯

### File List

- `_bmad-output/implementation-artifacts/3-3-epic-story-navigation-tree.md` (modified)
- `_bmad-output/implementation-artifacts/3-3-ui-ux-pro-max-checklist.md` (new)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)
- `frontend/app-web/src/lib/workflow/workflow-story-tree.ts` (new)
- `frontend/app-web/src/lib/workflow/workflow-story-tree-store.ts` (new)
- `frontend/app-web/src/lib/workflow/workflow-story-tree-events.ts` (new)
- `frontend/app-web/src/components/workspace/EpicStoryNavigationTree.tsx` (new)
- `frontend/app-web/src/components/workspace/hooks/useWorkspaceStoryTree.ts` (new)
- `frontend/app-web/src/components/ui/accordion.tsx` (new - shadcn)
- `frontend/app-web/src/app/[locale]/workspace/[workspaceId]/page.tsx` (modified)
- `frontend/app-web/src/lib/api-client.ts` (modified)
- `frontend/app-web/messages/zh-CN.json` (modified)
- `frontend/app-web/messages/en.json` (modified)
- `frontend/app-web/e2e/auth.setup.ts` (modified)
- `frontend/app-web/e2e/workspace-epic-story-tree.spec.ts` (new)

### Senior Developer Review (AI)

- Review Date: 2026-02-23
- Outcome: Changes Requested → Fixed
- Resolved Items:
  - Task 声明“使用 shadcn/Radix Accordion”与实现不一致：已接入受控 Accordion。
  - 选中项异常恢复仅清空无提示：已实现“回退到最近可继续 Story + 恢复提示”。
  - `next build` 类型错误：已修复 `auth.setup.ts` 超时配置。
  - Git/File List 不一致与 skill gate 追溯缺失：已补齐 File List 与 `ui-ux-pro-max` 清单产物。
