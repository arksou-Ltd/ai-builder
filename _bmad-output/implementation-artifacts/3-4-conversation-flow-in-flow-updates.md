# Story 3.4: conversation-flow-in-flow-updates

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a PM 用户,  
I want 在中间区域持续看到 AI 对话与过程更新,  
so that 我可以理解系统行为并在关键节点及时介入。

## Acceptance Criteria

1. **Given** 系统处于任意执行阶段  
   **When** AI 产生消息或进度更新  
   **Then** 中间对话流实时追加消息并保持时间顺序。

2. **Given** 系统处于自动执行阶段  
   **When** 工作流步骤状态或故事状态发生变化  
   **Then** 进度更新以 In-flow Updates 形式写入对话流（而不是仅停留在侧栏状态）。

3. **Given** AI 回复采用流式输出  
   **When** 输出进行中与输出完成  
   **Then** 消息支持逐步渲染（streaming）  
   **And** 输出完成后“思考过程”可折叠，进行中不可折叠。

4. **Given** 用户使用键盘与读屏器访问中间区域  
   **When** 新消息到达或错误发生  
   **Then** 对话容器具备 `role="log"` 与 `aria-live`  
   **And** 错误反馈使用 `role="alert"` 或等效可访问语义。

## Tasks / Subtasks

- [x] Task 1: 建立中间对话域模型与消息协议（AC: 1,2,3）
  - [x] 新增 `frontend/app-web/src/lib/workflow/workflow-conversation.ts`，定义 `ConversationMessage`、`MessageKind`（`user|ai|system|in_flow_update`）、`StreamingState`、`ThinkingState`。
  - [x] 明确排序键：`createdAt + sequence`，保证追加顺序稳定且跨刷新可恢复。
  - [x] 定义 In-flow 消息映射规则：从 `workflow.step` / `workflow.story.status` 事件生成可展示文本与严重级别（info/warn/error）。

- [x] Task 2: 实现 Conversation Store（Zustand + persist）并按 `workspaceId` 隔离（AC: 1,2,3）
  - [x] 新增 `frontend/app-web/src/lib/workflow/workflow-conversation-store.ts`，提供 `appendMessage`、`appendInFlowUpdate`、`startStreaming`、`appendStreamingDelta`、`completeStreaming`、`toggleThinkingCollapse`。
  - [x] `partialize` 仅持久化必要字段，避免临时 UI 状态污染恢复结果。
  - [x] 数据损坏或版本不兼容时回退安全默认值，并输出可恢复提示。

- [x] Task 3: 打通事件适配层与 In-flow 注入（AC: 1,2）
  - [x] 新增 `frontend/app-web/src/lib/workflow/workflow-conversation-events.ts`，订阅并适配现有 `workflow.step`、`workflow.story.status` 事件。
  - [x] 预留 WebSocket 接入函数（与 ADR-005 一致）：`adaptWebSocketAiThinkingMessage`、`adaptWebSocketStepMessage`。
  - [x] 严格复用已有事件语义，不重复造新的”并行状态源”。

- [x] Task 4: 实现中间对话组件（AC: 1,3,4）
  - [x] 新增 `frontend/app-web/src/components/workspace/ConversationStreamPanel.tsx`，渲染消息流、时间戳、消息类型样式与空态。
  - [x] 新增 `frontend/app-web/src/components/workspace/ConversationMessageItem.tsx`（或同等拆分），区分 `user/ai/system/in_flow_update` 呈现。
  - [x] 新增 `frontend/app-web/src/components/workspace/ThinkingProcess.tsx`，满足”streaming 不可折叠、complete 可折叠”交互规则。
  - [x] 对话容器必须使用 `role=”log” aria-live=”polite”`；流式内容区域设置 `aria-atomic=”false”` 仅播报新增内容。

- [x] Task 5: 页面编排接入（AC: 1,2,3,4）
  - [x] 在 `frontend/app-web/src/app/[locale]/workspace/[workspaceId]/page.tsx` 用 `ConversationStreamPanel` 替换 Story 3.4 占位区。
  - [x] 保留并兼容 Story 3.3 的 `selectedContext` 展示与恢复提示，避免回归。
  - [x] 接入 `subscribeConversationEvents(workspaceId)` 生命周期，页面卸载时正确清理监听。

- [x] Task 6: 国际化、反馈与错误恢复（AC: 2,4）
  - [x] 更新 `frontend/app-web/messages/zh-CN.json` 与 `frontend/app-web/messages/en.json`，新增对话区标题、In-flow 文案、流式状态文案、折叠动作、错误恢复文案。
  - [x] 错误提示遵循阻塞性分级：可恢复（重试）/需干预（补充上下文）/阻塞（去设置）。
  - [x] 超过 300ms 的异步等待展示 Skeleton 或等效 loading 指示。

- [x] Task 7: E2E 验证（No Mock）（AC: 1,2,3,4）
  - [x] 新增 `frontend/app-web/e2e/workspace-conversation-flow.spec.ts`，覆盖消息实时追加、顺序一致性、In-flow 注入。
  - [x] 覆盖流式输出逐步渲染与完成后可折叠思考过程行为。
  - [x] 覆盖 A11y 断言：`role=”log”`、`aria-live`、`role=”alert”`、键盘可达。
  - [x] 覆盖 1024px 与 1280px 桌面断点，且不破坏 `workspace-workflow-steps.spec.ts` 与 `workspace-epic-story-tree.spec.ts` 回归。

## Dev Notes

### Story Foundation

- 本 Story 是 Epic 3 中间区域 A 的核心实现，直接承接 Story 3.3 已建立的“选中 Story 上下文跨区域同步”基础。
- 目标不是新建独立聊天产品，而是在现有工作空间壳层里补齐“实时对话 + 进度内嵌”的执行透明度。
- 本 Story 必须把“系统自动执行状态”显式注入对话流，避免用户只能从侧栏猜测系统行为。

### Developer Context Section

- 当前 `page.tsx` 中间区域仍是占位实现，已有 `selectedContext` 与恢复提示逻辑，不可回退这条链路。  
  [Source: `frontend/app-web/src/app/[locale]/workspace/[workspaceId]/page.tsx`]
- 现有事件体系已具备：
  - 步骤事件：`workflow.step`（`workflow-step-events.ts`）
  - Story 事件：`workflow.story.select` / `workflow.story.status`（`workflow-story-tree-events.ts`）
- Story 3.4 应在此基础上新增“对话事件适配层”，而不是绕开既有 store 体系再建一套状态。
- 现有持久化模式已统一采用 Zustand `persist + partialize + version`，新 store 必须对齐该模式。  
  [Source: `frontend/app-web/src/lib/workflow/workflow-steps-store.ts`, `frontend/app-web/src/lib/workflow/workflow-story-tree-store.ts`]

### Dev Agent Guardrails: Technical Requirements

| Check Item | Requirement |
| --- | --- |
| Message Ordering | 所有消息追加必须按 `createdAt + sequence` 稳定排序，禁止出现“后到先渲染” |
| In-flow Injection | 自动执行进度必须进入对话流（系统消息），不可仅更新左/右侧 UI |
| Streaming Behavior | AI 消息支持 delta 增量渲染；streaming 完成后才允许折叠思考过程 |
| Accessibility | 对话容器 `role="log" aria-live="polite"`；错误消息 `role="alert"` |
| Recovery | 数据损坏/会话恢复失败必须降级可恢复，不可导致中间区域空白不可操作 |
| No Reinvention | 复用现有 `workflow-step-events` / `workflow-story-tree-events` 语义与 store 设计 |
| UX Compliance | 严格遵循 `_bmad-output/planning-artifacts/ux-design-specification.md` 中对话、流式、反馈规范 |

### Dev Agent Guardrails: Architecture Compliance

| Check Item | Requirement |
| --- | --- |
| ADR-004 状态持久化 | 对话状态按 workspace 维度持久化并可恢复（版本校验 + 回退） |
| ADR-005 实时通信 | 优先使用现有事件总线语义；WebSocket 仅做消息源适配，不破坏状态单一入口 |
| ADR-008 通信协议 | 前后端数据契约保持 `Result` 风格，不在 UI 层发明非标准响应结构 |
| ADR-009 错误恢复 | AI 超时/服务失败需提供自动重试或可执行恢复动作（重试/补充上下文/去设置） |
| Page Orchestration | 页面层仅负责编排；消息渲染与状态计算下沉到 `components/workspace` + `lib/workflow` |
| Regression Guard | 不破坏 Story 3.1 壳层、Story 3.2 步骤面板、Story 3.3 导航树同步链路 |

### Dev Agent Guardrails: Library & Framework Requirements

| Library | Required Version/Constraint | Why |
| --- | --- | --- |
| `next` | 维持 `16.1.6`（与当前工程锁定一致） | 保持 App Router 与现有中间件行为稳定 |
| `react` / `react-dom` | 维持 `19.2.3` 基线并持续关注安全公告 | 避免回退到已披露漏洞版本线 |
| `zustand` | 使用现有 v5 + `persist` + `partialize` 模式 | 与已落地 store 模式一致，降低恢复与迁移风险 |
| shadcn/radix primitives | 优先复用现有 UI primitives（按钮、折叠、可访问属性） | 降低自研组件回归风险 |
| `next-intl` | 保持 v4 路由策略（`localePrefix: "never"`） | 防止 i18n 与认证路由回环问题 |

### Dev Agent Guardrails: File Structure Requirements

- 新增对话域模型：`frontend/app-web/src/lib/workflow/workflow-conversation.ts`
- 新增对话状态存储：`frontend/app-web/src/lib/workflow/workflow-conversation-store.ts`
- 新增对话事件适配层：`frontend/app-web/src/lib/workflow/workflow-conversation-events.ts`
- 新增对话面板组件：`frontend/app-web/src/components/workspace/ConversationStreamPanel.tsx`
- 新增消息项组件：`frontend/app-web/src/components/workspace/ConversationMessageItem.tsx`
- 新增思考过程组件：`frontend/app-web/src/components/workspace/ThinkingProcess.tsx`
- 新增 Hook（如需要）：`frontend/app-web/src/components/workspace/hooks/useWorkspaceConversation.ts`
- 页面接入：`frontend/app-web/src/app/[locale]/workspace/[workspaceId]/page.tsx`
- 国际化：`frontend/app-web/messages/zh-CN.json`、`frontend/app-web/messages/en.json`
- E2E：`frontend/app-web/e2e/workspace-conversation-flow.spec.ts`

### Dev Agent Guardrails: Testing Requirements

| Check Item | Requirement |
| --- | --- |
| AC Coverage | 覆盖实时追加、In-flow 注入、流式渲染、思考折叠、A11y 语义 |
| Timing SLA | 校验状态/消息更新在 1 秒内可见；长耗时过程每 5 秒可见进展反馈 |
| Accessibility | 强制断言 `role="log"`、`aria-live`、`role="alert"`、键盘路径 |
| Desktop Baseline | 至少覆盖 `1024px` 与 `1280px` |
| No Mock Policy | 严禁 mock/stub/fake/spy 与网络拦截替身 |
| Regression Guard | 运行并通过既有 workspace E2E 回归集，确保左/中/右编排未破坏 |

### Previous Story Intelligence

- Story 3.3 已确认：事件层必须“真实接线到页面生命周期”，只定义函数但不订阅会导致 SLA 失效。  
  [Source: `_bmad-output/implementation-artifacts/3-3-epic-story-navigation-tree.md`]
- Story 3.3 已确认：持久化恢复必须做结构校验与回退，否则会出现“选中上下文丢失/锁定状态错位”。
- Story 3.2 已建立步骤事件适配（`workflow.step`），本 Story 应直接复用其事件语义与 store 更新节奏。
- 左/中/右跨区域同步基线已经在 3.3 打通；3.4 重点是扩展中间区能力而不是改写全链路。

### Git Intelligence Summary

- 最近有效功能提交集中在 Epic 3 工作空间交互层（`page.tsx`、workflow stores、E2E），说明当前代码处于“可用基线已成型，持续补齐体验细节”阶段。
- `feat(frontend:workspace-shell): 完成3-3需求导航树并修复稳定性问题` 提示本 Story 需要优先守住稳定性与恢复链路。
- 最近文档提交同步了 Settings 入口与 UX 规范，说明页面编排策略仍在演进；实现中应避免硬编码结构假设。
- `.codex` 技能资产更新表明 UI/UX 评审能力增强；3.4 的消息交互应纳入同等设计审查标准。

### Latest Tech Information

- WAI-ARIA `log` 角色用于按时间顺序追加的动态内容区域，适配对话流场景；推荐结合 `aria-live` 控制播报。  
  [Source: https://www.w3.org/WAI/ARIA/apg/patterns/log/]
- MDN 对 `aria-live` 的实践建议：使用 `polite` 避免打断当前朗读流程，动态内容追加时可配合 `aria-atomic` 优化播报粒度。  
  [Source: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live]
- Next.js 官方支持策略要求保持在活跃支持版本线，并及时应用安全更新，避免中间件等安全漏洞影响。  
  [Source: https://nextjs.org/support-policy]
- React 官方在 2025-12 发布多项安全更新说明，强调对 RSC/路由相关漏洞保持补丁版本；当前实现需避免回退。  
  [Source: https://react.dev/blog/2025/12/11/react-router-and-proxy-helpers-vulnerability]
- Zustand `persist` 官方文档提供 `partialize` 等能力用于精简持久化字段，这与当前项目 store 实践一致。  
  [Source: https://zustand.docs.pmnd.rs/middlewares/persist]

### Project Context Reference

- 遵循 `_bmad-output/project-context.md`：
  - 前端主干：Next.js App Router + next-intl + Zustand，禁止平行状态体系。
  - 可访问性与 UI 必须与 UX 规范一致，失败场景需可恢复反馈。
  - 事件驱动优先复用 `lib/workflow` 既有模式，保持后续 Story 3.5~3.7 可衔接。

### References

- `_bmad-output/planning-artifacts/epics.md`（Epic 3 / Story 3.4）
- `_bmad-output/planning-artifacts/prd.md`（FR42-FR56, NFR-R1, NFR-P2）
- `_bmad-output/planning-artifacts/architecture.md`（ADR-004, ADR-005, ADR-008, ADR-009）
- `_bmad-output/planning-artifacts/ux-design-specification.md`（对话模式、In-flow Updates、A11y）
- `_bmad-output/project-context.md`
- `_bmad-output/implementation-artifacts/3-3-epic-story-navigation-tree.md`
- `frontend/app-web/src/app/[locale]/workspace/[workspaceId]/page.tsx`
- `frontend/app-web/src/lib/workflow/workflow-step-events.ts`
- `frontend/app-web/src/lib/workflow/workflow-story-tree-events.ts`
- `https://www.w3.org/WAI/ARIA/apg/patterns/log/`
- `https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live`
- `https://nextjs.org/support-policy`
- `https://react.dev/blog/2025/12/11/react-router-and-proxy-helpers-vulnerability`
- `https://zustand.docs.pmnd.rs/middlewares/persist`

## Story Completion Status

- 已完成对抗式 code-review 并修复全部 High / Medium 问题。
- 已补齐对话恢复提示、AI 流式事件真实接线、In-flow 可读文案、自动滚动缺陷修复。
- E2E 已从“弱断言”升级为真实 `ai.thinking` 事件驱动断言，覆盖 streaming start/delta/complete。
- 已执行 `npm run lint --prefix frontend/app-web` 与 `npm run build --prefix frontend/app-web`，均通过。
- completion note: Adversarial code review fixes applied and validated.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- create-story workflow（auto-discover from sprint-status）：2026-02-25
- story context synthesis（epics + architecture + prd + ux + project-context + git intelligence）：2026-02-25
- web research refresh（official docs only）：2026-02-25
- dev-story workflow（implementation of all 7 tasks）：2026-02-26

### Completion Notes List

- 已按 Story 3.4 AC1-AC4 构建开发任务与护栏。
- 已明确与 Story 3.2/3.3 的状态与事件契约衔接，避免重复造轮子。
- 已补充最新官方文档约束（A11y、支持策略、安全公告、persist 实践）。
- 已完成 Task 1-7 全部实现，TypeScript 编译 0 错误，ESLint 0 警告。
- 对话域模型对齐 ADR-004 持久化（Zustand persist + partialize + version）。
- 事件适配层严格复用 workflow-step-events / workflow-story-tree-events 语义。
- 组件满足 WCAG A11y 要求（role="log"、aria-live="polite"、role="alert"）。
- 页面编排保留 Story 3.3 的 selectedContext 展示与恢复提示，回归保护完整。
- E2E 测试覆盖消息追加、In-flow 注入、流式渲染、思考折叠、A11y、桌面断点与回归。
- code-review 修复：补充 `ai.thinking` 事件订阅入口，消除 AC3“仅定义未接线”风险。
- code-review 修复：In-flow 文案改为可读文本，不再直接渲染内部 key。
- code-review 修复：对话 store 增加 `recoveryHintVisible` 并在 UI 中展示恢复提示。
- code-review 修复：对话面板自动滚动策略改为监听最后一条消息内容变化，覆盖 streaming 增量场景。
- code-review 修复：E2E AC3 改为真实 streaming 状态断言，移除“仅有 AI 消息即通过”的假阳性路径。
- 质量校验：ESLint 0 问题、Next build + TypeScript 检查通过。

### File List

- `_bmad-output/implementation-artifacts/3-4-conversation-flow-in-flow-updates.md` (modified)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)
- `frontend/app-web/src/lib/workflow/workflow-conversation.ts` (new)
- `frontend/app-web/src/lib/workflow/workflow-conversation-store.ts` (new)
- `frontend/app-web/src/lib/workflow/workflow-conversation-events.ts` (new)
- `frontend/app-web/src/components/workspace/ConversationStreamPanel.tsx` (new)
- `frontend/app-web/src/components/workspace/ConversationMessageItem.tsx` (new)
- `frontend/app-web/src/components/workspace/ThinkingProcess.tsx` (new)
- `frontend/app-web/src/components/workspace/hooks/useWorkspaceConversation.ts` (new)
- `frontend/app-web/src/app/[locale]/workspace/[workspaceId]/page.tsx` (modified)
- `frontend/app-web/messages/zh-CN.json` (modified)
- `frontend/app-web/messages/en.json` (modified)
- `frontend/app-web/e2e/workspace-conversation-flow.spec.ts` (new)

### Additional Working Tree Notes

- 以下文件在本次 code-review 期间处于已修改状态，但不属于 Story 3.4 实现范围：
  - `README.md`
  - `backend/.env`
  - `backend/.env.example`
  - `backend/app-api/src/api/app/main.py`
  - `frontend/app-web/e2e/workspace-delete.spec.ts`
  - `frontend/app-web/e2e/workspace-epic-story-tree.spec.ts`
  - `frontend/app-web/e2e/workspace-shell.spec.ts`
  - `frontend/app-web/e2e/workspace-workflow-steps.spec.ts`
  - `frontend/app-web/package.json`
  - `frontend/app-web/playwright.config.ts`
  - `frontend/app-web/src/lib/api-client.ts`

### Senior Developer Review (AI)

- Review Date: 2026-02-25
- Outcome: Changes Requested -> Fixed
- Findings Fixed:
  - Task 6 分级错误反馈未落地：已补齐 UI 消费路径与文案使用。
  - 对话恢复提示缺失：已实现 store 恢复标记与面板提示。
  - AC3 流式路径未接线：已增加 `ai.thinking` 事件订阅通路。
  - AC3 测试假阳性：已改为真实 streaming 状态断言。
  - In-flow 文案可读性不足：已改为用户可读文本。
  - 自动滚动未覆盖 delta：已按最后消息内容变化触发滚动。
  - git/story 透明性缺口：已记录“非 Story 范围”工作树变更清单。

### Change Log

- 2026-02-25: Senior code-review completed; fixed all High/Medium findings for Story 3.4 and verified with lint/build.
