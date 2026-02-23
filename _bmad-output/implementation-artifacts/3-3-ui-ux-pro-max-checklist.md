# UI-UX Pro Max Checklist (Story 3.3)

## Scope

本清单用于追溯 Story 3.3 的导航树设计与交互实现，覆盖色彩、层级、动效、可访问性与响应式约束。

## Visual System

- 色彩语义：已建立 backlog/in_progress/review/done 四态映射（灰/蓝/橙/绿），并同时输出文字标签，避免仅靠颜色传达状态。
- 信息层级：Epic 作为一级节点，Story 作为二级节点，选中态通过左边框 + 背景 + 字重强化。
- 禁用态：未解锁 Story 采用 `opacity` + `not-allowed` 光标 + `aria-disabled`，同时在中心区提供文案提示。

## Motion

- 展开/折叠实现：采用 shadcn/Radix Accordion 驱动节点开合。
- 动效预算：开合过渡固定为 `200ms`，满足 150-300ms 约束。
- 交互稳定性：展开状态由受控 store 同步，避免组件内部状态与业务状态分叉。

## Accessibility

- 语义结构：导航树容器使用 `role="tree"`，Epic/Story 节点使用 `role="treeitem"`，子列表使用 `role="group"`。
- ARIA 状态：实现 `aria-expanded`、`aria-selected`、`aria-disabled`。
- 键盘导航：支持 Up/Down/Left/Right/Enter/Space/Home/End。
- 焦点可见性：保留 `focus-visible` ring，支持键盘用户定位。

## Responsive Baseline

- 桌面基线：1024px 与 1280px 断点下均验证导航树可见与可操作。
- 非桌面兜底：沿用 `DesktopGuard`，避免移动端误入造成交互失真。

## Traceability

- 实现入口：`frontend/app-web/src/components/workspace/EpicStoryNavigationTree.tsx`
- 状态层：`frontend/app-web/src/lib/workflow/workflow-story-tree-store.ts`
- 页面编排：`frontend/app-web/src/app/[locale]/workspace/[workspaceId]/page.tsx`
- E2E 断言：`frontend/app-web/e2e/workspace-epic-story-tree.spec.ts`
