# Story 3.4: conversation-flow-in-flow-updates

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a PM 用户,
I want 在中间区域持续看到 AI 对话与过程更新,
so that 我可以理解系统行为并在关键节点及时介入。

## Acceptance Criteria

1. **Given** 系统处于任意执行阶段  
   **When** AI 产生消息或进度更新  
   **Then** 中间对话流实时追加消息并保持时间顺序。

2. **Given** 系统进入自动执行阶段  
   **When** 工作流步骤、故事状态或验证进度发生变化  
   **Then** 进度更新必须以 In-flow Updates 形式写入对话流，而不是仅显示在右侧面板。

3. **Given** AI 正在输出思考或正文内容  
   **When** 输出进行中与输出完成  
   **Then** 支持逐步流式渲染（token-by-token/segment-by-segment）  
   **And** 完成后思考过程可折叠。

4. **Given** 用户使用键盘或读屏器  
   **When** 对话流出现新增消息或错误提示  
   **Then** 对话区域使用 `role="log"` 与 `aria-live` 进行可访问性播报。

## Tasks / Subtasks

- [ ] Task 1: 定义对话流领域模型与事件契约（AC: 1,2,3）
  - [ ] 新增 `frontend/app-web/src/lib/workflow/workflow-conversation.ts`，定义消息类型：`user`、`ai`、`system`、`in_flow_update`。
  - [ ] 定义消息状态：`thinking`、`streaming`、`complete`、`error`，并提供严格类型守卫。
  - [ ] 对齐 ADR-005，定义并约束事件 payload：`ai.thinking`、`workflow.step`、`workflow.story.status`、`error`。

- [ ] Task 2: 实现对话流状态容器与恢复能力（AC: 1,2）
  - [ ] 新增 `frontend/app-web/src/lib/workflow/workflow-conversation-store.ts`（Zustand + persist），按 `workspaceId` 隔离消息流。
  - [ ] 保证时间顺序稳定：同一消息流按 `createdAt + sequence` 排序，避免乱序渲染。
  - [ ] 支持刷新恢复最近消息上下文，异常数据自动回退并给出可恢复提示。

- [ ] Task 3: 实现中间区域对话组件（AC: 1,3,4）
  - [ ] 新增 `frontend/app-web/src/components/workspace/chat/ChatTimeline.tsx`（承载 `role="log"` + `aria-live="polite"`）。
  - [ ] 新增 `frontend/app-web/src/components/workspace/chat/ChatMessage.tsx`，区分用户/AI/系统/进度消息视觉样式。
  - [ ] 新增 `frontend/app-web/src/components/workspace/chat/ThinkingProcess.tsx`，实现“流式中不可折叠、完成后可折叠”。
  - [ ] 新增 `frontend/app-web/src/components/workspace/chat/InFlowUpdateMessage.tsx`，统一展示步骤进度与状态更新。

- [ ] Task 4: 接入页面编排与事件管道（AC: 1,2）
  - [ ] 在 `frontend/app-web/src/app/[locale]/workspace/[workspaceId]/page.tsx` 替换中间区占位内容，接入 `ChatTimeline`。
  - [ ] 新增 `frontend/app-web/src/lib/workflow/workflow-conversation-events.ts`，复用当前 `subscribeWorkflowStepEvents` / `subscribeStoryTreeEvents` 模式。
  - [ ] 预留 WebSocket 消息适配入口（`adaptWebSocketConversationMessage`），保证后续后端接入不改 UI 组件协议。

- [ ] Task 5: In-flow Updates 规则落地（AC: 2）
  - [ ] 将 `workflow.step`、`workflow.story.status`、验证阶段状态映射为可读进度文案写入对话流。
  - [ ] 保持右侧进度 Tab 继续展示结构化状态，但中间区必须同步插入进度消息。
  - [ ] 对重复进度事件做幂等处理（同类型同目标短时间内合并），避免消息洪泛。

- [ ] Task 6: 国际化与无障碍完善（AC: 4）
  - [ ] 更新 `frontend/app-web/messages/zh-CN.json` 与 `frontend/app-web/messages/en.json`，新增 chat/in-flow 文案。
  - [ ] 为思考折叠按钮、消息类型标识、错误提示补充 `aria-label`。
  - [ ] 对错误提示统一使用 `role="alert"` 或独立 `aria-live` 区域，避免静默失败。

- [ ] Task 7: E2E 验证（No Mock）（AC: 1,2,3,4）
  - [ ] 新增 `frontend/app-web/e2e/workspace-conversation-flow.spec.ts`。
  - [ ] 覆盖：消息追加顺序、In-flow Updates 注入、流式渲染与思考折叠、`role="log"`/`aria-live`、桌面断点（1024/1280）。
  - [ ] 严格遵循 No Mock Policy：禁止 mock/stub/fake/spy 与网络拦截替身。

## Dev Notes

### Story Foundation

- 本 Story 对应 Epic 3 的中间区域 A，目标是把当前“静态占位”升级为“可持续可观察的对话流”。
- 该 Story 与 Story 3.2（步骤事件）和 Story 3.3（Story 导航事件）直接耦合：两者状态变化必须转化为 In-flow Updates。
- 本 Story只聚焦“对话流展示与过程更新”；输入区“下一步引导”属于 Story 3.5。

### Developer Context Section

- 当前 `page.tsx` 中间区域仍是占位文本 + 按钮；尚未形成消息模型、消息组件、消息存储。
- 左侧与右侧已有状态来源（workflow steps + story tree），中间区域可直接复用这些状态事件而非重复建模。
- 当前工程已形成“事件适配层 + Zustand store + 页面订阅”的稳定模式（Story 3.2/3.3），本 Story 必须沿用。

### Dev Agent Guardrails: Technical Requirements

| Check Item | Requirement |
| --- | --- |
| Message Ordering | 对话流必须按时间顺序追加，禁止新消息插入历史位置导致阅读错乱 |
| In-flow Updates | 自动阶段进度必须进入中间对话流，不能只在右侧面板显示 |
| Streaming | AI 消息需支持流式增量渲染，输出结束后状态切换为 complete |
| Thinking Collapse | 思考过程 streaming 时不可折叠，complete 后可折叠 |
| Accessibility | 对话容器必须 `role="log"` + `aria-live="polite"`，错误提示必须可播报 |
| No Reinvention | 复用 `workflow-step-events.ts` 与 `workflow-story-tree-events.ts` 现有事件体系 |
| UX Compliance | 严格遵循 `ux-design-specification.md` 中对话、反馈、In-flow updates 与动效规范 |

### Dev Agent Guardrails: Architecture Compliance

| Check Item | Requirement |
| --- | --- |
| ADR-005 | 消息协议与实时事件命名保持一致（`workflow.step` / `ai.thinking` / `error`） |
| ADR-004 | 对话状态需可恢复，刷新后保留必要上下文 |
| Layering | 页面层只做装配；消息模型/事件/状态放在 `lib/workflow`；渲染组件放在 `components/workspace/chat` |
| Reliability | 对乱序、重复、无效事件具备防护与降级策略 |
| Non-Regression | 不破坏 Story 3.1 壳层布局、Story 3.2 步骤面板、Story 3.3 导航树同步能力 |

### Dev Agent Guardrails: Library & Framework Requirements

| Library | Current Baseline | Latest Checked | Guidance |
| --- | --- | --- | --- |
| next | 16.1.6 | 16.1.6 | 保持当前版本，不在本 Story 做框架升级 |
| react / react-dom | 19.2.3 | 19.2.4 | 本 Story 不强制升级；如升级需单独变更并回归验证 |
| zustand | 5.0.11 | 5.0.11 | 继续使用 `persist + partialize` 模式 |
| next-intl | 4.8.1 | 4.8.3 | 保持现有路由策略（`localePrefix: never`），升级单独评估 |
| @clerk/nextjs | 6.37.1 | 6.38.2 | 与认证链路无关，本 Story 不改版本 |

### Dev Agent Guardrails: File Structure Requirements

- 页面接入：`frontend/app-web/src/app/[locale]/workspace/[workspaceId]/page.tsx`
- 新增消息模型：`frontend/app-web/src/lib/workflow/workflow-conversation.ts`
- 新增消息存储：`frontend/app-web/src/lib/workflow/workflow-conversation-store.ts`
- 新增消息事件适配：`frontend/app-web/src/lib/workflow/workflow-conversation-events.ts`
- 新增中间区组件目录：`frontend/app-web/src/components/workspace/chat/`
- 推荐组件：
  - `ChatTimeline.tsx`
  - `ChatMessage.tsx`
  - `ThinkingProcess.tsx`
  - `InFlowUpdateMessage.tsx`
- 国际化文案：`frontend/app-web/messages/zh-CN.json`、`frontend/app-web/messages/en.json`
- E2E：`frontend/app-web/e2e/workspace-conversation-flow.spec.ts`

### Dev Agent Guardrails: Testing Requirements

| Check Item | Requirement |
| --- | --- |
| AC Coverage | 覆盖 4 条 AC：顺序追加、In-flow Updates、流式+折叠、无障碍播报 |
| Timing | 关键状态更新需要在 1 秒内反映到 UI（与 Story 3.2 SLA 一致） |
| Accessibility | 断言 `role="log"`、`aria-live`、错误 `role="alert"`/live region 生效 |
| Desktop Baseline | 至少覆盖 1024px 与 1280px 两个桌面断点 |
| No Mock Policy | 禁止 mock/stub/fake/spy 与网络拦截替身 |
| Regression Guard | 不得破坏现有 `workspace-shell.spec.ts`、`workspace-workflow-steps.spec.ts`、`workspace-epic-story-tree.spec.ts` |

### Previous Story Intelligence

- Story 3.3 已验证“事件适配层 + 页面订阅 + store 原子更新”模式有效，本 Story 应直接复用该架构。
- 状态恢复必须带校验与回退提示，不能仅静默降级。
- 交互与可访问性验收必须覆盖真实键盘/读屏路径，不能只做静态属性检查。

### Git Intelligence Summary

- 最近迭代聚焦 `workspace` 执行页稳定性与状态一致性，表明本 Story 的风险点在“多源状态同步”而非纯视觉。
- 最新提交已将设置入口迁移到右侧 Tab，说明页面编排仍在演进，中间区域改造必须保持低侵入。
- Epic 3 当前处于连续交付阶段，建议保持“单故事单能力收敛”，避免在 3.4 混入 3.5 输入引导范围。

### Latest Tech Information

- Next.js 16.1 为当前稳定主线，保持现有版本可降低升级风险。
- React 19.2 最新补丁已到 `19.2.4`；本 Story 若不涉及 React 升级，应确保实现不依赖补丁新增行为。
- React 官方 2026-01-16 安全公告要求避免落入受影响版本区间（`<19.0.1`、`19.1.0-19.1.1`、`19.2.0`）。
- 对话无障碍应遵循 ARIA `log` 角色语义与 live region 更新原则，确保新增消息可被读屏器感知。

### Project Context Reference

- 继续遵循 `_bmad-output/project-context.md`：
  - 前端使用 Next.js App Router + next-intl + Zustand；
  - 禁止在中间件/路由中硬编码 locale 前缀；
  - 前端 UI/交互必须对照 `ux-design-specification.md` 与 `ui-ux-pro-max` 规范。

### References

- `_bmad-output/planning-artifacts/epics.md`（Epic 3 / Story 3.4）
- `_bmad-output/planning-artifacts/prd.md`（FR42-FR44, FR52-FR53, FR56, NFR-R1）
- `_bmad-output/planning-artifacts/architecture.md`（ADR-004, ADR-005, ADR-008）
- `_bmad-output/planning-artifacts/ux-design-specification.md`（ChatMessage、ThinkingProcess、In-flow Updates、A11y）
- `_bmad-output/project-context.md`
- `frontend/app-web/src/app/[locale]/workspace/[workspaceId]/page.tsx`
- `frontend/app-web/src/lib/workflow/workflow-step-events.ts`
- `frontend/app-web/src/lib/workflow/workflow-story-tree-events.ts`
- `https://nextjs.org/blog/next-16-1`
- `https://react.dev/blog/2025/10/01/react-19-2`
- `https://react.dev/blog/2026/01/16/updates-to-react-security-vulnerability`
- `https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/log_role`

## Story Completion Status

- Story context 已完成：目标、AC、任务拆解、技术护栏、测试要求、风险与依赖全部可执行。
- 状态已设置为 `ready-for-dev`。
- 已纳入前序故事经验与近期 git 变更模式，减少重复踩坑。

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

- create-story workflow executed in automated mode
- artifact analysis: epics/prd/architecture/ux/project-context
- previous story analysis: `3-3-epic-story-navigation-tree.md`
- git intelligence: last 5 commits
- latest tech check: npm registry + official docs

### Completion Notes List

- 已为 Story 3.4 生成可直接用于 `dev-story` 的完整实施上下文。
- 已将 In-flow Updates 与可访问性作为强制交付项，而非可选增强项。
- 已限定故事边界，避免与 Story 3.5（输入区与下一步引导）范围重叠。

### File List

- `_bmad-output/implementation-artifacts/3-4-conversation-flow-in-flow-updates.md` (new)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)
