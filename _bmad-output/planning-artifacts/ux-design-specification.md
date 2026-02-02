---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-core-experience', 'step-04-emotional-response', 'step-05-inspiration', 'step-06-design-system', 'step-07-defining-experience', 'step-08-visual-foundation', 'step-09-design-directions', 'step-10-user-journeys', 'step-11-component-strategy', 'step-12-ux-patterns', 'step-13-responsive-accessibility', 'step-14-complete']
inputDocuments:
  - '_bmad-output/planning-artifacts/product-brief-ai-builder-2026-01-31.md'
  - '_bmad-output/planning-artifacts/prd.md'
  - 'docs/architecture-decision-record.md'
workflowStatus: 'completed'
completedDate: 2026-02-01
date: 2026-02-01
author: Arksou
---

# UX Design Specification - ai-builder

**Author:** Arksou
**Date:** 2026-02-01

---

## Executive Summary

### Project Vision

ai-builder 是一个面向**零技术背景用户**的 AI Native 开发平台，让产品经理通过自然语言对话直接实现需求，产出符合项目规范的代码。平台的核心使命是将软件开发的复杂性完全隐藏在对话式交互背后，让"人人都是 Builder"成为现实。

### Target Users

#### 主要用户：产品经理（PM）

| 维度 | 描述 |
|------|------|
| **技术背景** | 零技术背景，从未使用过命令行或 IDE |
| **核心痛点** | 用 AI 工具写的 demo 无法运行、无法对齐项目技术栈 |
| **使用设备** | 网页端（纯 Web，无需安装） |
| **成功愿景** | "我可以自己实现需求，研发只需要优化！" |

#### 次要用户：研发工程师

| 维度 | 描述 |
|------|------|
| **角色定位** | 从"实现者"转变为"审核者和优化者" |
| **态度** | 支持，团队正在推广 AI Native 文化 |
| **核心诉求** | PM 产出的代码符合规范，Review 高效 |

### Key Design Challenges

1. **极致简化的技术抽象**
   - 用户完全不懂技术，界面必须隐藏所有技术复杂性
   - Git 操作（分支、commit、push）应完全自动化且不可见
   - 仓库、技术栈等概念需要转化为用户能理解的语言

2. **复杂工作流的直观呈现**
   - 多步骤工作流需要清晰的进度可视化
   - 用户始终需要知道"我在哪里"和"下一步做什么"
   - 异常情况需要友好的引导而非技术错误信息

3. **AI 交互的信任重建**
   - 用户曾因 AI 产出不可用而受挫
   - 需要透明的过程展示，消除"黑箱"焦虑
   - 即时反馈和进度指示增强掌控感

4. **响应式 Web 体验**
   - 纯 Web 端，需适配不同屏幕尺寸（桌面优先）
   - 确保在主流浏览器（Chrome、Safari、Firefox、Edge）上体验一致

### Design Opportunities

1. **对话驱动的零门槛体验**
   - 使用门槛降低至"会说话就能用"
   - AI 主动引导补充需求细节，无需用户主动思考

2. **"一次成功"的信任建立**
   - 设计"啊哈时刻"：第一个 PR 被研发认可
   - 一次成功体验即可建立长期使用信任

3. **研发友好的协作体验**
   - PR 自动包含完整上下文，降低 Review 成本
   - 多仓库 PR 交叉引用，清晰展示关联关系

4. **透明的 AI 工作过程**
   - 实时展示开发/Review 进度
   - 问题出现时提供清晰的说明和引导

---

## Core User Experience

### Defining Experience

ai-builder 的核心体验是**人机协作开发**——用户和 AI 共同完成从需求定义到代码提交的全过程。采用 **Epic → Story** 两层结构，Epic 定稿后按序逐个完成 Story。

系统内部协调多个 AI 工具完成不同任务，用户无需感知 AI 切换。

### Platform Strategy

| 维度 | 决策 |
|------|------|
| **平台形态** | 纯 Web 端（Next.js） |
| **安装需求** | 无需安装，浏览器即用 |
| **代码执行** | E2B 云端沙箱（非本地） |
| **离线支持** | 不支持（需要网络连接） |
| **响应式** | 桌面优先，适配主流浏览器 |

### Core User Flow

**Phase 1: Epic 定义**

| 步骤 | 用户行为 | AI 行为 | 产出 |
|------|----------|---------|------|
| 需求描述 | 用自然语言描述需求 | [Codex] 引导补充细节 | - |
| Epic 定稿 | 审核确认 | [Codex] 生成 Epic 文档 | Epic 文档（含 Story 概要） |

**Phase 2: Story 按序执行**

| 步骤 | 用户行为 | AI 行为 | 产出 |
|------|----------|---------|------|
| A. 创建优化定稿 | 审核、修改、优化 | [Codex] 生成 Story 详情 | 定稿的 Story 文档 |
| B. 开发 | 等待/查看进度 | [Claude Code] 开发代码 | 代码变更 |
| C. 验证 | 查看反馈、确认结果 | [Codex] Code Review | 验证结果 |
| D. 提交 PR | 确认无问题 | 系统自动提交 | PR（含文档 + 代码 + 规范 Commit） |

**验证不通过时：**
- [Codex] 反馈问题 → [Claude Code] 修复代码 → [Codex] 重新验证
- 循环直到通过或用户介入

**执行规则：**
- Story 严格按序执行：1-1 → 1-2 → 1-3...
- 前一个 Story 完成后，才能开始下一个
- 每个 Story 独立提交 PR

### AI 分工架构

| AI 工具 | 职责范围 |
|---------|----------|
| **Codex** | 需求对话引导、Epic/Story 文档撰写、Code Review、验收判定 |
| **Claude Code** | Story 代码开发、问题修复 |

用户视角：统一的对话体验，无需感知 AI 切换。

### Story 命名规范

| 格式 | 说明 |
|------|------|
| `{Epic编号}-{Story编号}-{有意义名称}` | 如 `1-1-user-profile-api` |

### 提交内容规范（研发友好）

**仓库提交内容：**

| 内容 | 说明 |
|------|------|
| Epic 文档 | 提交到仓库，研发可查看需求背景 |
| Story 文档 | 提交到仓库，研发可查看具体需求和验收标准 |
| 代码变更 | 实际的代码文件 |
| 规范 Commit | 格式化的 commit message，含详细改动说明 |

**Commit 格式：**

```
<type>(<scope>): <subject>

<body>

Epic: <epic-id> - <epic-name>
Story: <story-id> - <story-name>

Changes:
- <改动细节 1>
- <改动细节 2>
- ...
```

**PR 结构：**

| 区块 | 内容 |
|------|------|
| 标题 | Story 编号 + 简述 |
| 背景 | Epic/Story 文档链接 |
| 变更摘要 | 主要改动点概述 |
| 详细改动 | 文件级别的改动说明 |
| 关联 PR | 跨仓库 PR 链接（如有） |

### Effortless Interactions

| 用户完全掌控 | 系统自动处理 |
|--------------|--------------|
| Epic 内容定稿 | [Codex] 文档生成、格式化 |
| Story 审核与优化 | [Codex] Story 详情生成 |
| 开发结果确认 | [Claude Code] 代码开发、[Codex] 验证、修复循环 |
| PR 提交时机 | Commit 格式化、PR 内容组装、文档提交 |

### Critical Success Moments

| 优先级 | 关键时刻 | 成功体验 |
|--------|----------|----------|
| #1 | Epic 定稿 | "AI 完全理解我的需求，Story 拆解合理" |
| #2 | Story 定稿 | "细节完善，可以开始开发" |
| #3 | 开发验收通过 | "代码没问题，可以提交" |
| #4 | PR 被研发快速认可 | "研发说文档清晰，Review 很顺利！" |

### Experience Principles

| 原则 | 设计含义 |
|------|----------|
| **人机协作** | Epic 和 Story 都是用户与 AI 共同完成 |
| **两层结构** | Epic 先定稿（含 Story 概要），再按序完成每个 Story |
| **严格按序** | Story 必须按顺序执行，前一个完成才能开始下一个 |
| **AI 无缝协作** | Codex + Claude Code 分工协作，用户无需感知切换 |
| **研发友好** | Epic/Story 文档 + 规范 Commit + 详细 PR，降低 Review 成本 |
| **技术层隐藏** | Git、代码生成、AI 切换、Review 循环对用户完全不可见 |

---

## Design System Recommendations

> 来源：ui-ux-pro-max skill 分析

### 推荐风格

| 维度 | 推荐 |
|------|------|
| **Pattern** | Minimal Single Column |
| **Style** | Vibrant & Block-based |
| **Best For** | Tech companies, startups, SaaS, developer tools, AI products |

### 推荐配色

| 用途 | 颜色 | 说明 |
|------|------|------|
| **Primary** | #1E293B | 主色调 |
| **Secondary** | #334155 | 辅助色 |
| **CTA** | #22C55E | 行动按钮（运行/成功绿色） |
| **Background** | #0F172A | 深色背景 |
| **Text** | #F8FAFC | 文字颜色 |

### 推荐字体

| 用途 | 字体 | 说明 |
|------|------|------|
| **UI 全局** | Inter | 极简、专业、系统级可读性 |
| **代码展示** | JetBrains Mono | 开发者工具标准，代码高亮 |
| **Mood** | dashboard, data, analytics, code, technical, precise |

**Google Fonts 链接：**
```
https://fonts.google.com/share?selection.family=Inter:wght@300;400;500;600;700|JetBrains+Mono:wght@400;500
```

**CSS Import：**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
```

**Tailwind Config：**
```js
fontFamily: {
  sans: ['Inter', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace']
}
```

### UX 关键指南

| 类别 | 指南 |
|------|------|
| **Loading States** | 使用 skeleton screens 或 spinners，操作 >300ms 必须显示 |
| **Progress Indicators** | 多步骤流程必须显示步骤指示器（如 Step 2 of 4） |
| **Loading Buttons** | 异步操作时禁用按钮并显示加载状态 |
| **Error Feedback** | 清晰的错误消息，靠近问题发生位置，使用 `role="alert"` |
| **AI Feedback Loop** | 提供点赞/点踩或"重新生成"选项 |
| **AI Streaming** | Token-by-token 流式输出，Typewriter 效果 |
| **Empty States** | 友好提示 + 明确操作引导，避免空白页面 |

### 无障碍规范（WCAG AA）

| 规范 | 实现 |
|------|------|
| **对比度** | 文字对比度 ≥ 4.5:1（Slate-50 on Slate-900 = 15.5:1 ✅） |
| **Focus 状态** | `focus:ring-2 focus:ring-green-500 focus:ring-offset-2` |
| **键盘导航** | Tab 顺序匹配视觉顺序，所有交互可通过键盘访问 |
| **ARIA 标签** | 图标按钮必须有 `aria-label` |
| **Skip Link** | 提供"跳转到主内容"链接 |
| **Live Region** | 对话区域使用 `aria-live="polite"` |
| **错误消息** | 使用 `role="alert"` 或 `aria-live` |
| **表单标签** | 使用 `<label for>` 或 FormLabel 组件 |
| **Reduced Motion** | 响应 `prefers-reduced-motion` 媒体查询 |

### 避免的反模式

| 反模式 | 正确做法 |
|--------|----------|
| 扁平设计缺乏层次感 | 使用阴影、边框建立层次 |
| 文字过多的页面 | 渐进式披露，分步展示 |
| 使用 emoji 作为图标 | 使用 SVG 图标（Lucide Icons） |
| hover 效果导致布局偏移 | 使用 opacity/color/border 变化，避免 scale |
| 无反馈异步操作 | >300ms 显示 skeleton 或 spinner |
| outline-none 无替代 | 必须提供 focus ring 替代 |
| 仅用颜色表达状态 | 颜色 + 图标 + 文字组合 |
| placeholder 替代 label | 始终使用正式的 FormLabel |
| 任意 z-index 值 | 使用标准层级：z-10, z-20, z-30, z-50 |
| 超过 500ms 的 UI 动画 | 微交互使用 150-300ms |
| linear 缓动函数 | 使用 ease-out（进入）或 ease-in（退出） |
| 装饰性无限动画 | 仅 loading 指示器使用无限动画 |

---

## Desired Emotional Response

### Primary Emotional Goals

| 优先级 | 情感 | 设计含义 |
|--------|------|----------|
| #1 | **赋能感** | "我可以做到以前做不到的事！" |
| #2 | **掌控感** | "我在主导过程，AI 是我的助手" |
| #3 | **信任感** | "AI 能可靠完成工作" |

**核心情感愿景：** 让零技术背景的 PM 感受到"我能实现功能，而且符合团队技术规范"的自豪与成就。

### Emotional Journey Mapping

| 阶段 | 目标情感 | 设计策略 |
|------|----------|----------|
| 首次登录 | 好奇 → 期待 | 简洁引导，快速进入核心流程 |
| Epic 定稿 | 被理解 + 兴奋 | AI 主动引导，展示理解结果供确认 |
| Story 开发中 | 安心 + 期待 | 实时进度，透明状态 |
| 验证通过 | 成就感 + 惊喜 | 清晰成功反馈，庆祝时刻 |
| PR 被认可 | **自豪 + 信任** | 啊哈时刻！"我实现的功能符合规范，研发认可了！" |
| 遇到问题 | 被支持 | 友好提示 + 明确下一步 |

### Micro-Emotions

| 情感对比 | 目标状态 | 设计手段 |
|----------|----------|----------|
| 自信 vs 困惑 | **自信** | 清晰步骤指引 |
| 信任 vs 怀疑 | **信任** | 验证闭环 + 研发认可 |
| 成就 vs 挫败 | **成就** | 每个 Story 完成 = 小胜利 |
| 掌控 vs 失控 | **掌控** | 用户决定定稿/提交时机 |

### Emotions to Avoid

| 负面情感 | 触发场景 | 规避设计 |
|----------|----------|----------|
| 失控感 | AI 行为不透明 | 状态展示，非技术细节 |
| 挫败感 | 反复失败 | 多次失败后提示求助 |
| 不信任 | 产出不符预期 | 定稿前充分协作 |
| 焦虑感 | 等待过长 | 进度指示 + 预估时间 |

### Emotional Design Principles

| 原则 | 设计含义 |
|------|----------|
| **赋能而非替代** | 用户是 Builder，AI 是助手 |
| **透明而非黑箱** | 展示"在做什么"，隐藏"怎么做" |
| **庆祝每个胜利** | 每个 Story 完成都值得肯定 |
| **失败不责备** | 问题时引导而非指责，始终提供出路 |

---

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

#### BMAD 方法论（核心灵感）

BMAD 的 Step-file 架构是 ai-builder 工作流设计的核心灵感来源：

| 特点 | ai-builder 借鉴 |
|------|-----------------|
| Step-file 架构 | Epic/Story 作为独立的工作单元 |
| Just-In-Time Loading | 只展示当前 Story，不干扰用户 |
| Sequential Enforcement | Story 严格按序：1-1 → 1-2 → 1-3 |
| State Tracking | 清晰的状态标识 |
| 分阶段确认 | 每个 Story 定稿后确认开发 |

**封装要点：** 隐藏技术概念，用自然语言呈现，AI 主动引导下一步。

#### Devin（AI 开发助手）

| 特点 | ai-builder 借鉴 |
|------|-----------------|
| Session UI | Epic → Story → 开发 → PR 清晰节点 |
| In-flow Updates | 进度嵌入对话消息 |
| 人性化聊天 | AI 像专家同事，非机械工具 |

#### Manus（自主 Agent）

| 特点 | ai-builder 借鉴 |
|------|-----------------|
| 三面板布局 | 左侧导航 + 中间对话 + 右侧状态 |
| 透明度设计 | 实时展示 AI 工作状态 |
| 协作与控制 | 用户可随时介入调整 |

### Transferable UX Patterns

**布局模式：**

| 模式 | 应用 |
|------|------|
| 三面板布局 | 左侧 Epic/Story 导航 + 中间对话 + 右侧状态 |
| 步骤指示器 | 显示当前工作流阶段 |
| In-flow Updates | 进度更新嵌入对话流 |

**交互模式：**

| 模式 | 应用 |
|------|------|
| 分阶段确认 | 关键节点需用户确认 |
| 实时透明 | 展示 AI 当前状态 |
| 人性化对话 | AI 主动引导 |

### Anti-Patterns to Avoid

| 反模式 | 规避设计 |
|--------|----------|
| 技术术语暴露 | 用业务语言替代 |
| 信息过载 | Just-In-Time 只展示当前步骤 |
| 黑箱操作 | 始终展示状态和进度 |
| 强制等待 | 允许暂停、调整、重试 |
| 跳步操作 | 严格按序执行 |
| Emoji 作为图标 | 使用 SVG 图标（Heroicons/Lucide） |
| Hover 导致布局偏移 | 使用 opacity/color 变化 |
| 无反馈异步操作 | >300ms 显示加载状态 |

### Design Inspiration Strategy

**采纳：**
- BMAD 的 Step-file 架构（Epic → Story 两层结构）
- Manus 的三面板布局（复杂工作流可视化）
- Devin 的 In-flow Updates（进度融入对话）

**适配：**
- BMAD 技术工作流 → 封装为自然语言呈现
- Manus "Computer"面板 → 简化为状态卡片
- Devin Session 管理 → 简化为 Epic/Story 导航

**规避：**
- 代码/终端可视化（PM 不需要）
- 复杂权限配置（MVP 保持简单）
- 多任务并行（按序更适合非技术用户）

**未来扩展（非 MVP）：**
- Slack/钉钉集成
- 更多 AI 渠道
- 团队协作功能

### ui-ux-pro-max Design System

> 来源：ui-ux-pro-max 专业设计系统分析

#### 推荐风格

| 维度 | 推荐 |
|------|------|
| **Pattern** | Interactive Product Demo + AI-Driven Dynamic |
| **Style** | Dark Mode (OLED) + Vibrant Block-based |
| **Performance** | ⚡ Excellent |
| **Accessibility** | ✓ WCAG AAA |

#### 配色方案

| 用途 | 颜色 | 说明 |
|------|------|------|
| **Primary** | `#1E293B` | 主色调（Slate-800） |
| **Secondary** | `#334155` | 辅助色（Slate-700） |
| **CTA/Success** | `#22C55E` | 成功/运行状态（Green-500） |
| **Background** | `#0F172A` | 深色背景（Slate-900） |
| **Surface** | `#1E293B` | 卡片/面板背景 |
| **Text Primary** | `#F8FAFC` | 主要文字 |
| **Text Muted** | `#94A3B8` | 次要文字 |
| **Border** | `#334155` | 边框 |
| **Error** | `#EF4444` | 错误状态 |
| **Warning** | `#F59E0B` | 警告状态 |

#### 字体搭配

| 用途 | 字体 | 说明 |
|------|------|------|
| **UI 全局** | Inter | 极简、专业、系统级可读性 |
| **代码展示** | JetBrains Mono | 开发者工具标准，代码高亮 |

**Google Fonts:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
```

**Tailwind Config:**
```js
fontFamily: {
  sans: ['Inter', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace']
}
```

#### 关键 UX 规范

**进度与状态反馈：**

| 场景 | 模式 |
|------|------|
| 多步骤流程 | Step Indicator（"Step 2 of 4"） |
| 异步操作 >300ms | Skeleton 或 Spinner |
| 按钮提交 | 禁用 + 加载状态 |
| 操作成功 | Toast 简短消息 |

**AI 交互反馈：**

| 场景 | 模式 |
|------|------|
| AI 思考中 | 脉冲动画 |
| AI 输出 | 流式文本 |
| 结果反馈 | Thumbs Up/Down |
| 重新生成 | Regenerate 按钮 |

**布局规范：**

| 元素 | 规范 |
|------|------|
| 间距 | 大区块 48px+，组件 16-24px |
| 圆角 | 卡片 16-20px，按钮 8-12px |
| 动画 | 200-300ms |
| Hover | 颜色变化，避免 scale |

#### Pre-Delivery Checklist

- [ ] 无 emoji 作为图标（使用 SVG）
- [ ] 所有可点击元素有 `cursor-pointer`
- [ ] Hover 状态 150-300ms 平滑过渡
- [ ] 文字对比度 4.5:1+
- [ ] Focus 状态可见
- [ ] 响应 `prefers-reduced-motion`
- [ ] 响应式：375px, 768px, 1024px, 1440px

### Design System Foundation

| 组件 | 选择 | 理由 |
|------|------|------|
| **样式系统** | Tailwind CSS | 架构决策确定，灵活高效，与 Next.js 完美集成 |
| **组件库** | shadcn/ui | 可定制、无障碍友好、Tailwind 原生、不增加包体积 |
| **图标库** | Lucide Icons | SVG 格式，与 shadcn/ui 配套，支持 tree-shaking |
| **主题** | 深色主题为主 | 开发工具标准风格，符合 AI Native 产品定位 |
| **字体** | Inter + JetBrains Mono | UI 可读性 + 代码展示 |
| **配色基调** | Slate + Green 强调色 | 专业沉稳 + 成功/运行状态突出 |

---

## Defining Core Experience

### 核心体验定义

**ai-builder 的 Defining Experience：**
> **"用对话实现需求，AI 确保符合规范"**

用户只需用自然语言描述想要的功能，AI 协助完成需求定稿、代码开发和验证，最终产出符合团队技术规范的代码。核心价值不是"PM 会写代码"，而是"PM 能实现功能，研发直接认可"。

### 用户心智模型

| 维度 | 分析 |
|------|------|
| **当前解决方案** | PM 写 PRD → 研发开发 → 反复沟通（周期约 1 个月） |
| **已尝试替代** | ChatGPT/Cursor 写 demo，但代码无法复用 |
| **核心困惑** | "demo 能跑，为什么研发说不能用？" |
| **预期体验** | 像和同事沟通一样，描述需求就能实现 |
| **担心** | AI 是否真的理解？产出是否真的能用？ |

### 成功标准

| 指标 | 成功体验 |
|------|----------|
| **需求理解** | Epic 定稿时，用户感觉被完整理解 |
| **全程透明** | 实时看到 AI 在做什么、在想什么 |
| **质量保障** | 验证环节一次通过 |
| **最终认可** | PR 被研发快速 Review 通过（啊哈时刻） |
| **信心建立** | 愿意用同样方式实现下一个需求 |

**实时性与透明度标准：**

| 阶段 | 实时性 | 透明度（AI 思考过程） |
|------|--------|---------------------|
| Epic 定稿对话 | 流式同步，无感知延迟 | "正在分析需求..." → "正在识别关键功能..." → "正在拆解 Story..." |
| Story 开发 | 流式同步，无感知延迟 | "正在阅读代码..." → "正在设计方案..." → "正在编写代码..." → "正在添加测试..." |
| 验证过程 | 阶段实时同步 | 分步骤展示：代码规范 → 架构规范 → 功能完整性 → 测试覆盖 → 安全性 |

### 模式分析

**成熟模式采用：**
- 对话式交互（类 ChatGPT）
- 步骤引导（类表单向导）
- 三面板布局（类 Manus）

**创新组合：**
- Epic → Story 两层结构
- 严格按序执行
- AI 分工协作（Codex + Claude Code）
- 规范自动遵循
- 验证自动循环

**隐喻借用：**
- Epic = 项目大目标（PM 熟悉）
- Story = 具体任务（PM 熟悉）
- PR = 交付物（通过成功体验学习）

---

## 界面布局设计

### 整体布局结构

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              顶部导航栏                                   │
├────────────────┬─────────────────────────────┬───────────────────────────┤
│                │                             │ [需求进度] [文档] [E2B沙箱] │
│   左侧面板      │        中间对话区域          │ ━━━━━━━━━                 │
│   需求列表      │                             │                           │
│                │  用户消息                    │   当前 Tab 内容            │
│  ┌───────────┐ │  ────────────               │                           │
│  │ 需求 1    │ │  AI 回复（流式 + 思考过程）   │                           │
│  │ 用户认证   │◀│  ────────────               │                           │
│  └───────────┘ │                             │                           │
│  ┌───────────┐ │  文件改动卡片                │                           │
│  │ 需求 2    │ │  ────────────               │                           │
│  │ 数据看板   │ │                             │                           │
│  └───────────┘ │                             │                           │
│  ┌───────────┐ │                             │                           │
│  │ + 新需求  │ │                             │                           │
│  └───────────┘ │                             │                           │
├────────────────┴─────────────────────────────┴───────────────────────────┤
│                              输入区域                                     │
└──────────────────────────────────────────────────────────────────────────┘
```

### 左侧面板：需求列表

**用途：** 展示所有需求（每个需求 = 一个 Epic），可切换/新建

**需求卡片状态：**

| 状态 | 显示 |
|------|------|
| 待开始 | ⏳ 待开始 |
| Epic 定义中 | 📝 定义中 |
| Story 开发中 | 🔄 Story X.X |
| 验证中 | 🔍 验证中 |
| 已完成 | ✅ 已完成 |

### 右侧面板 Tab 1：需求进度

**用途：** 展示当前选中需求的 Epic/Story 结构 + AI 状态 + 验证进度

**内容：**
- Epic/Story 导航树（带状态标识）
- AI 当前状态（Agent + 思考过程）
- 验证进度树（分阶段展示）

**验证阶段：**
1. 代码规范检查
2. 架构规范检查
3. 功能完整性验证
4. 测试覆盖检查
5. 安全性检查

### 右侧面板 Tab 2：文档

**用途：** Epic/Story 文档列表 + 改动汇总

**结构：**
- 改动汇总卡片（本次改动统计）
- 折叠卡片树形结构（Epic → Story）
- Story 卡片下有折叠描述
- 点击文档可弹窗查看详情

**文档弹窗功能：**
- 支持渲染视图 / Markdown 源码切换
- 支持用户编辑修改
- 保存后同步更新

### 右侧面板 Tab 3：界面

**用途：** UI 预览、响应式切换、交互操作

**显示时机：** Story 涉及界面时显示

**内容结构：**
```
┌─────────────────────────────────────────┐
│ 🎨 界面预览                              │
│ Story 1.2: 用户登录 | 平台: Web          │
│ ─────────────────────────────────────── │
│ 📱 [Desktop] [Tablet] [Mobile]          │
│     ━━━━━━━━                            │
│ ┌─────────────────────────────────────┐ │
│ │         [UI 预览 iframe]            │ │
│ └─────────────────────────────────────┘ │
│ ─────────────────────────────────────── │
│ 状态: ✅ UX 已确认  🔄 UI 调整中         │
│ ─────────────────────────────────────── │
│ [🔄 重新生成] [✅ 确认界面] [🔗 新窗口]  │
└─────────────────────────────────────────┘
```

**响应式切换：**
| 视图 | 宽度 |
|------|------|
| Desktop | 1440px |
| Tablet | 768px |
| Mobile | 375px |

**界面状态：**
| 状态 | 显示 |
|------|------|
| 未生成 | 空状态 + "生成 UI 预览"按钮 |
| 生成中 | Skeleton + 加载提示 |
| 预览中 | iframe 渲染 + 操作按钮 |
| 已确认 | 预览 + ✅ 已确认标识 |

### 右侧面板 Tab 4：E2B 沙箱

**用途：** 展示云端沙箱环境状态、运行输出、预览

**内容：**
- 沙箱状态（🟢运行中/🟡启动中/⚪已停止/🔴错误）
- 终端输出
- 应用预览（iframe）
- 操作按钮：重启、复制日志、新窗口打开

### Tab 切换逻辑

| 工作阶段 | 默认 Tab |
|----------|----------|
| Epic 定义对话 | 需求进度 |
| Story 需求撰写 | 文档 |
| Story UX 设计 | 文档 |
| Story UI 预览 | **界面** |
| Story 开发中 | E2B 沙箱 |
| 验证阶段 | 需求进度 |
| 验证失败修复 | 文档 |

---

## AI Agent 设计

### Agent 角色定义

| Agent | 职责 | 底层 AI | 名称 | 颜色 |
|-------|------|---------|------|------|
| **PM Agent** | 需求对话、Epic/Story 文档撰写 | Codex | **Sage** | 紫色 (#8B5CF6) |
| **DEV Agent** | 代码开发、问题修复 | Claude Code | **Cody** | 绿色 (#22C55E) |
| **验证 Agent** | Code Review、验收判定 | Codex | **Rex** | 橙色 (#F97316) |

**名称设计理念：**
- **Sage** - 智慧、引导、理解需求的专家
- **Cody** - 亲切、专业的开发伙伴（Code + Buddy）
- **Rex** - 严谨、可靠的审查官（Review + Expert）

### 对话消息结构

**消息元素：**
- Agent 图标 + 名称
- 思考过程（💭 + 浅灰斜体，实时流式）
- 正文内容
- 文件改动卡片（如有）
- 时间戳 + Agent 标签

**思考过程展示：**
- 实时流式更新
- 完成后可折叠/收起

---

## 文件改动与 PR 提交

### 对话中的文件改动卡片

每次 AI 执行完涉及文件改动后，在对话中展示卡片：

**卡片内容：**
- 📄 文档改动列表
- 💻 代码改动列表（仅显示文件名和行数）
- 📊 合计统计

### 提交 PR 前确认

**弹窗功能：**
- 展示 Epic/Story 文档改动详情（diff 格式）
- 代码改动仅显示统计（用户看不懂详情）
- 用户确认后才能提交

**改动标识：**

| 标识 | 含义 | 颜色 |
|------|------|------|
| ✨ 新增 | 新增文档 | Green |
| ~ 修改 | 修改文档 | Amber |
| 🗑️ 删除 | 删除文档 | Red |

---

## Epic/Story 文档规范

### Epic 文档结构（对齐 BMAD）

```markdown
---
stepsCompleted: []
inputDocuments: []
---

# {{project_name}} - Epic Breakdown

## Overview
[Epic 整体概述]

## Requirements Inventory
### Functional Requirements
### NonFunctional Requirements
### FR Coverage Map

## Epic List

## Epic {{N}}: {{epic_title}}
[Epic 目标描述]

### Story {{N}}.{{M}}: {{story_title}}
As a {{user_type}},
I want {{capability}},
So that {{value_benefit}}.

**Acceptance Criteria:**
**Given** {{precondition}}
**When** {{action}}
**Then** {{expected_outcome}}
**And** {{additional_criteria}}
```

### Story 文档结构（对齐 BMAD）

```markdown
# Story {{epic_num}}.{{story_num}}: {{story_title}}

Status: ready-for-dev

## Story
As a {{role}},
I want {{action}},
so that {{benefit}}.

## Acceptance Criteria
1. [验收标准]

## Tasks / Subtasks
- [ ] Task 1 (AC: #1)
  - [ ] Subtask 1.1

## Dev Notes
- 相关架构模式和约束
- 涉及的源代码组件
- 测试标准摘要

### Project Structure Notes
### References

## Dev Agent Record
### Agent Model Used
### Debug Log References
### Completion Notes List
### File List
```

---

## 体验机制

### Phase A: 需求启动

| 环节 | 机制 |
|------|------|
| 触发 | 点击"新需求"按钮 |
| 交互 | 自然语言描述需求 |
| 响应 | Sage 实时流式输出 + 思考过程 |
| 透明度 | "正在分析需求..." → "正在识别关键功能..." → "正在拆解 Story..." |
| 右侧 | 需求进度 Tab：Epic/Story 结构形成 |
| 完成 | 用户确认定稿 → 对话中输出文件改动卡片 |

### Phase B: Story 执行

| 环节 | 机制 |
|------|------|
| 触发 | Story 定稿后开始开发 |
| 交互 | 观察进度，可暂停/调整 |
| 响应 | Cody 实时流式输出 + 思考过程 |
| 透明度 | "正在阅读代码..." → "正在设计方案..." → "正在编写代码..." |
| 右侧 | E2B 沙箱 Tab：代码运行和预览 |
| 完成 | 代码生成完毕 → 对话中输出文件改动卡片 → 自动进入验证 |

### Phase C: 验证过程

| 环节 | 机制 |
|------|------|
| 验证方式 | Rex 多阶段 Review |
| 右侧 | 需求进度 Tab：验证进度树 |
| 状态标识 | ✅ 已通过 / 🔄 进行中 / ❌ 未通过 / ⏳ 等待中 |
| 失败处理 | Rex 反馈问题 → Cody 自动修复 → Rex 重新验证 |
| 完成 | 全部通过 → PR 确认弹窗 → 用户确认 → 提交 PR |

### 错误处理

| 场景 | 处理 |
|------|------|
| AI 理解偏差 | 对话中澄清 |
| 验证阶段失败 | 显示具体问题 → 自动修复 → 重新验证该阶段 |
| 修复循环多次 | 提示用户介入或求助 |
| 网络中断 | Toast + 自动重试 |

---

## Visual Design Foundation

> 来源：ui-ux-pro-max skill 专业分析

### 颜色系统

**基础色板（Slate 深色主题）：**

| 语义角色 | Hex | Tailwind | 用途 |
|----------|-----|----------|------|
| **Background** | #020617 | `bg-slate-950` | 页面背景 |
| **Surface** | #0F172A | `bg-slate-900` | 卡片/面板背景 |
| **Surface Elevated** | #1E293B | `bg-slate-800` | 悬浮卡片/弹窗 |
| **Border** | #334155 | `border-slate-700` | 边框 |
| **Text Primary** | #F8FAFC | `text-slate-50` | 主要文字 |
| **Text Secondary** | #94A3B8 | `text-slate-400` | 次要文字 |
| **Text Muted** | #64748B | `text-slate-500` | 辅助文字 |

**功能色：**

| 语义 | Hex | Tailwind | 用途 |
|------|-----|----------|------|
| **Primary/Success** | #22C55E | `bg-green-500` | CTA、成功状态 |
| **Primary Hover** | #16A34A | `hover:bg-green-600` | 按钮悬停 |
| **Error** | #EF4444 | `text-red-500` | 错误状态 |
| **Warning** | #F59E0B | `text-amber-500` | 警告状态 |
| **Info** | #3B82F6 | `text-blue-500` | 信息提示 |

**Agent 专属色：**

| Agent | 颜色 | Hex |
|-------|------|-----|
| **Sage** (PM) | Purple | #8B5CF6 |
| **Cody** (DEV) | Green | #22C55E |
| **Rex** (验证) | Orange | #F97316 |

**对比度合规（WCAG）：**

| 组合 | 对比度 | 级别 |
|------|--------|------|
| Slate-50 on Slate-900 | 15.5:1 | AAA ✅ |
| Slate-400 on Slate-900 | 5.7:1 | AA ✅ |
| Green-500 on Slate-900 | 6.8:1 | AA ✅ |

### 排版系统

**字体选择：**

| 用途 | 字体 | 权重 |
|------|------|------|
| **UI 全局** | Inter | 400, 500, 600, 700 |
| **代码展示** | JetBrains Mono | 400, 500 |

**Google Fonts：**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
```

**字体层级（Type Scale）：**

| 层级 | 大小 | 行高 | 权重 | Tailwind |
|------|------|------|------|----------|
| Display | 36px | 1.2 | 700 | `text-4xl font-bold` |
| H1 | 30px | 1.25 | 600 | `text-3xl font-semibold` |
| H2 | 24px | 1.3 | 600 | `text-2xl font-semibold` |
| H3 | 20px | 1.4 | 500 | `text-xl font-medium` |
| H4 | 16px | 1.5 | 500 | `text-base font-medium` |
| Body | 14px | 1.6 | 400 | `text-sm` |
| Small | 12px | 1.5 | 400 | `text-xs` |
| Code | 13px | 1.5 | 400 | `font-mono text-[13px]` |

### 间距与布局

**间距单位（4px 基准）：**

| Token | 值 | Tailwind | 用途 |
|-------|-----|----------|------|
| space-1 | 4px | `p-1` | 图标内边距 |
| space-2 | 8px | `p-2` | 紧凑组件 |
| space-3 | 12px | `p-3` | 按钮内边距 |
| space-4 | 16px | `p-4` | 卡片内边距 |
| space-6 | 24px | `p-6` | 区块内边距 |
| space-8 | 32px | `p-8` | 大区块间距 |
| space-12 | 48px | `p-12` | 页面边距 |

**圆角系统：**

| Token | 值 | Tailwind | 用途 |
|-------|-----|----------|------|
| radius-sm | 4px | `rounded` | 小元素 |
| radius-md | 8px | `rounded-lg` | 按钮/输入框 |
| radius-lg | 12px | `rounded-xl` | 卡片 |
| radius-xl | 16px | `rounded-2xl` | 弹窗/大卡片 |

**阴影系统（深色主题）：**

| Token | 值 | 用途 |
|-------|-----|------|
| shadow-sm | `0 1px 2px rgba(0,0,0,0.3)` | 轻微提升 |
| shadow-md | `0 4px 6px rgba(0,0,0,0.4)` | 卡片 |
| shadow-lg | `0 10px 15px rgba(0,0,0,0.5)` | 弹窗 |
| shadow-glow | `0 0 20px rgba(34,197,94,0.2)` | CTA 发光 |

**三栏布局比例：**

| 区域 | 宽度 | 备注 |
|------|------|------|
| 左侧面板 | 280px | 固定宽度 |
| 中间对话 | flex-1 | 自适应 |
| 右侧面板 | 360px | 固定宽度 |
| 最小屏幕 | 1280px | 桌面优先 |

### 组件规范（shadcn/ui）

**核心组件映射：**

| 场景 | 组件 | 规范 |
|------|------|------|
| 需求卡片 | Card + CardHeader + CardContent | 复合组件模式 |
| 文档弹窗 | Dialog + DialogContent | 用于模态详情 |
| 左侧导航 | Sidebar + SidebarTrigger | shadcn sidebar |
| Tab 切换 | Tabs + TabsList + TabsTrigger | 右侧面板 |
| 通知提示 | Sonner (Toaster) | 全局 Toast |
| 进度展示 | Progress | 验证进度条 |
| 状态标签 | Badge | 状态标识 |

**动画规范：**

| 场景 | 时长 | 缓动 |
|------|------|------|
| Hover 状态 | 150ms | ease-out |
| 展开/折叠 | 200ms | ease-in-out |
| 弹窗出现 | 200ms | ease-out |
| 页面切换 | 300ms | ease-in-out |

### 无障碍考量

| 要求 | 实现 |
|------|------|
| **对比度** | 文字对比度 ≥ 4.5:1（WCAG AA） |
| **键盘导航** | 所有交互支持 Tab/Enter/Escape |
| **Focus 状态** | 可见 focus ring（`ring-2 ring-green-500`） |
| **减少动效** | 响应 `prefers-reduced-motion` |
| **屏幕阅读器** | 正确的 ARIA 标签 |

---

## Design Direction Decision

> 来源：ui-ux-pro-max skill 专业优化

### 产品类型定位

ai-builder 定位为 Developer Tool + Productivity Tool + Micro SaaS 的综合体：

| 产品类型 | 推荐风格 | 适用原因 |
|----------|----------|----------|
| Developer Tool / IDE | Dark Mode (OLED) + Minimalism | 开发工具标准，代码/终端友好 |
| Productivity Tool | Flat Design + Micro-interactions | 工作流管理，清晰层次 |
| Micro SaaS | Vibrant & Block + Motion-Driven | 现代感，吸引非技术用户 |

**综合采用：** Dark Mode (OLED) + Minimalism + Micro-interactions

### 选定设计方向

**方向 B: 均衡信息型（优化版）**

| 区域 | 宽度 | 实现 |
|------|------|------|
| 左侧面板 | 280px | `<Sidebar>` + `<SidebarProvider>` |
| 中间对话 | flex-1 | 对话流 + 文件改动卡片 |
| 右侧面板 | 360px | `<Tabs>` 三个 Tab |

**布局代码结构：**
```tsx
<SidebarProvider>
  <Sidebar>{/* 需求列表 */}</Sidebar>
  <main className="flex-1">{/* 对话区域 */}</main>
  <aside className="w-[360px]">
    <Tabs defaultValue="progress">
      {/* 需求进度 / 文档 / E2B沙箱 */}
    </Tabs>
  </aside>
</SidebarProvider>
```

### 状态指示规范

**Active State：**

| 场景 | 样式 | Tailwind |
|------|------|----------|
| 当前需求选中 | 左侧边框高亮 + 背景变深 | `border-l-2 border-green-500 bg-slate-800` |
| 当前 Tab 选中 | 下划线 + 文字高亮 | `border-b-2 border-green-500 text-slate-50` |
| Story 进行中 | 图标动画 + 文字强调 | `animate-pulse text-green-500` |

**Disabled State：**

| 场景 | 样式 | Tailwind |
|------|------|----------|
| 按钮禁用 | 降低透明度 + 禁止光标 | `opacity-50 cursor-not-allowed` |
| 未解锁的 Story | 灰色 + 锁定图标 | `text-slate-500` + 🔒 |

### AI 交互规范

**Streaming 文本：**

| 场景 | 实现 | 避免 |
|------|------|------|
| AI 回复 | Token-by-token 流式输出 | 等待完成后一次性显示 |
| 思考过程 | 💭 前缀 + 斜体 + 实时更新 | 静态文本 |
| 长时间等待 | Skeleton + 进度指示 | 超过 300ms 无反馈 |

**思考过程样式：**
```tsx
<span className="italic text-slate-400 animate-pulse">
  💭 正在分析需求...
</span>
```

### 折叠展开规范

| 场景 | 组件 | 设置 |
|------|------|------|
| Epic/Story 树 | `<Accordion type="single" collapsible>` | 单个展开，可全部折叠 |
| Story 描述 | `<AccordionContent>` | 默认折叠，点击展开 |
| 验证步骤 | `<Accordion type="multiple">` | 多个同时展开 |

### 微动效规范

| 交互 | 效果 | 时长 | Tailwind |
|------|------|------|----------|
| 按钮 Hover | 背景变亮 | 150ms | `hover:bg-green-600 transition-colors duration-150` |
| 按钮 Active | 轻微缩小 | 100ms | `active:scale-95` |
| 卡片 Hover | 边框高亮 | 200ms | `hover:border-slate-600 transition-colors duration-200` |
| Accordion 展开 | 高度过渡 | 200ms | `transition-all duration-200` |
| Tab 切换 | 下划线滑动 | 150ms | CSS transition |
| Toast 出现 | 从右侧滑入 | 300ms | Sonner 默认动画 |

### 组件实现映射

| 场景 | shadcn 组件 | 关键属性 |
|------|-------------|----------|
| 需求列表 | `Sidebar` | `<SidebarProvider>` 包裹 |
| 右侧 Tab | `Tabs` | `defaultValue="progress"` |
| Epic/Story 树 | `Accordion` | `type="single" collapsible` |
| 文档弹窗 | `Dialog` | `<DialogContent>` |
| 验证进度 | `Accordion` | `type="multiple"` |
| 通知提示 | `Sonner` | 全局 Toaster |
| 文件改动卡片 | `Card` | 复合组件模式 |
| AI 反馈 | 自定义 | Thumbs up/down 按钮 |

### 关键视图设计

**视图 1: 需求定义阶段**
- 左侧：需求列表，当前选中高亮（`border-l-2 border-green-500`）
- 中间：Sage 对话，思考过程流式展示
- 右侧：需求进度 Tab，Epic/Story 树形成中

**视图 2: Story 开发阶段**
- 左侧：当前需求显示进度（🔄 1.1）
- 中间：Cody 对话 + 文件改动卡片
- 右侧：E2B 沙箱 Tab，终端 + 预览

**视图 3: 验证阶段**
- 中间：Rex 验证反馈
- 右侧：需求进度 Tab，验证步骤 Accordion（`type="multiple"`）

**视图 4: PR 确认弹窗**
- Dialog 弹窗，展示文档改动 diff
- 代码改动仅显示统计
- 用户确认后提交

---

## User Journey Flows

### 关键用户旅程

| 旅程 | 用户 | 目标 |
|------|------|------|
| **J1: 首次使用** | PM | 授权 GitHub，添加项目到工作空间 |
| **J2: 需求定义** | PM | 描述需求，与 AI 共同定稿 Epic |
| **J3: Story 开发** | PM | 按序完成每个 Story 的文档撰写、开发和验证 |
| **J4: PR 提交** | PM | 确认改动，提交 PR 给研发 Review |
| **J5: 研发 Review** | 研发 | Review PM 产出的代码，通过或反馈 |

### Story 状态模型

**状态流转图：**

```
[pending] → [drafting] → [doc_ready] → [developing] → [validating] → [validated] → [pr_pending]
                ↑              ↑                                                         ↓
                └──────────────┴─────────────────────────────────────────────────[pr_rejected]
                                                                                         ↓
                                                                                    [merged]
```

**状态定义：**

| 状态 | 显示 | 说明 |
|------|------|------|
| `pending` | ⏳ 待开始 | 等待前置 Story 验证通过 |
| `drafting` | 📝 撰写中 | 正在撰写 Story 需求文档 |
| `ux_design` | 📐 UX设计 | 正在设计用户体验 |
| `ui_preview` | 🎨 UI预览 | 正在生成/调整 UI |
| `doc_ready` | 📄 待开发 | 文档完成（含 UX/UI），待开发 |
| `developing` | 🔧 开发中 | Cody 正在开发 |
| `validating` | 🔍 验证中 | Rex 正在验证 |
| `validated` | ✅ 已验证 | 验证通过，可提交 PR |
| `pr_pending` | 🔄 Review中 | PR 已提交，等待研发 |
| `pr_rejected` | ❌ 需修改 | PR 被打回，需要修改 |
| `merged` | ✅ 已合并 | PR 已合并，Story 完成 |

**关键规则：**
- Story 验证通过即可开始下一个（不需要等 PR 合并）
- 可并行存在多个"PR 待 Review"状态的 Story
- PR 被打回后，Story 回到"需修改"状态，用户可修改文档或代码

### Journey 1: 首次使用

**流程：** 访问 → GitHub OAuth → 创建会话 → 添加项目 → 配置 AI → 开始工作

### Journey 2: 需求定义

**流程：** 新需求 → 描述需求 → Sage 追问 → 生成 Epic 结构 → 用户确认 → 定稿

### Journey 3: Story 开发

**三阶段流程：**

| 阶段 | Agent | 输入 | 输出 | 用户动作 |
|------|-------|------|------|----------|
| **A. 文档撰写** | Sage | Epic 中的 Story 概要 | Story 文档 + UX/UI | 审核、修改、定稿 |
| **B. 代码开发** | Cody | Story 文档 + UI 设计 | 代码变更 | 观察进度 |
| **C. 代码验证** | Rex | 代码变更 | 验证结果 | 查看结果、必要时介入 |

#### 阶段 A: 文档撰写（含 UX/UI 设计）

**撰写阶段包含三个子阶段：**

| 子阶段 | 可选 | 说明 | 产出 |
|--------|------|------|------|
| A1. 需求文档 | 必选 | Story 基本信息、AC | Story 文档基础部分 |
| A2. UX 设计 | 可选 | 用户体验、交互流程 | Story 文档 UX 部分 |
| A3. UI 预览 | 可选 | 生成可预览的界面代码 | Web 代码 + 实时预览 |

**撰写流程：**
1. Sage 生成需求文档 → 用户确认/修改
2. 检测到界面需求 → 询问是否进入 UX 设计
3. Sage 生成 UX 设计 → 用户通过对话修改 → 确认
4. 用户选择生成 UI 预览 → 自动识别平台（Web/Mobile）
5. Sage 生成 UI 代码 → E2B 渲染 → 右侧"界面"Tab 显示预览
6. 用户通过对话调整 UI → 确认后进入开发

**UX/UI 通过对话实时修改：**
- 用户可随时通过对话描述修改需求
- Sage 实时更新 UX 描述或 UI 代码
- UI 预览自动刷新

**Story 文档结构（含 UX/UI）：**

```markdown
# Story 1.2: 用户登录

Status: doc_ready
Platform: web
HasUI: true

## Story
As a ... I want ... so that ...

## Acceptance Criteria
1. ...

## UX Design
### 用户流程
### 交互说明
### 响应式断点

## UI Design
### 组件结构
### 预览代码路径
### 确认状态
- UX: ✅ 已确认
- UI: ✅ 已确认

## Tasks / Subtasks
...
```

**验证阶段：**
1. 代码规范检查
2. 架构规范检查
3. 功能完整性验证
4. 测试覆盖检查
5. 安全性检查

### Journey 4: PR 提交

**流程：** 验证通过 → 弹窗确认 → 查看文档改动 → 勾选确认 → 提交 PR

**PR 确认内容：**
- 文档改动：Diff 格式展示
- 代码改动：仅统计，不展示详情

### Journey 5: PR 被打回处理

**处理流程：**
1. 收到打回通知 → Story 状态变为 ❌ 需修改
2. 左侧显示 ⚠️ 提醒
3. 用户查看研发反馈
4. 根据问题类型选择：修改文档 或 修改代码
5. 重新验证 → 更新 PR

### 多 Story 并行状态

**某一时刻的状态快照示例：**

| Story | 状态 | 说明 |
|-------|------|------|
| 1.1 | ✅ 已合并 | 完成 |
| 1.2 | ❌ 需修改 | PR 被打回，等待用户处理 |
| 1.3 | 🔄 PR 待 Review | 正常等待 |
| 1.4 | 🔧 开发中 | 正常进行 |
| 1.5 | ⏳ 待开始 | 等待 1.4 验证通过 |

### Journey Patterns

**导航模式：**
- 线性向导：Epic 定义、PR 确认
- 树形导航：Story 选择、文档查看
- Tab 切换：右侧面板

**决策模式：**
- 确认型：需要用户明确确认
- 自动型：系统自动流转
- 介入型：异常时提示用户

**反馈模式：**
- 流式反馈：AI 对话
- 阶段反馈：验证进度
- 结果反馈：Toast 通知

**状态管理模式：**
- 非阻塞式流转：Story 验证通过即可开始下一个
- 并行 PR：多个 Story 可同时处于 PR 待 Review
- 打回回溯：PR 被打回后回到对应阶段
- 优先级提醒：需修改的 Story 优先处理

### Flow Optimization Principles

1. **最短路径**: 无多余步骤
2. **自动流转**: 减少手动操作
3. **非阻塞**: Story 验证通过即可继续下一个
4. **失败恢复**: 自动修复 + 介入提示
5. **打回处理**: 清晰反馈 + 快速回溯
6. **进度透明**: 始终显示状态
7. **成就庆祝**: 正向反馈

---

## Component Strategy

> 来源：ui-ux-pro-max skill 专业优化

### Design System Components

**shadcn/ui 可用组件（按场景分类）：**

| 场景 | 组件 | 最佳实践 |
|------|------|----------|
| **布局** | Sidebar, Tabs, Card | 使用 compound components 模式 |
| **弹窗** | Dialog, Sheet, AlertDialog | Dialog 用于模态，Sheet 用于侧边抽屉 |
| **折叠** | Accordion, Collapsible | Accordion 用于多项折叠 |
| **表单** | Form + react-hook-form | 必须使用 Form + FormField 模式 |
| **反馈** | Sonner, Progress, Badge | 使用 toast.success/error 语义方法 |
| **按钮** | Button | 使用 asChild 进行组合 |

**shadcn/ui 最佳实践应用：**

| 实践 | 应用 |
|------|------|
| **Compound Components** | ChatMessage, FileChangeCard, UIPreviewPanel |
| **asChild 组合** | Button + Link, Trigger + Custom |
| **Form + react-hook-form** | AI 配置表单、项目设置 |
| **Sonner 语义方法** | `toast.success()`, `toast.error()` |
| **Dialog 完整结构** | DialogHeader + DialogTitle + DialogDescription |
| **Sheet 侧边抽屉** | 移动端导航、设置面板 |

### Custom Components

**需要自定义的组件：**

| 组件 | 原因 | 优先级 |
|------|------|--------|
| **ChatMessage** | AI 对话的流式输出 + 思考过程 | P0 |
| **ThinkingProcess** | AI 透明度的核心体验 | P0 |
| **RequirementCard** | 需求列表的状态管理 | P0 |
| **EpicStoryTree** | 进度追踪的树形结构 | P0 |
| **FileChangeCard** | 文件改动可视化 | P1 |
| **ValidationProgress** | 验证阶段展示 | P1 |
| **AgentAvatar** | Agent 识别 | P1 |
| **DiffViewer** | 文档 Diff 展示 | P2 |
| **UIPreviewPanel** | UI 预览 iframe | P2 |

#### ChatMessage

**用途：** 展示用户和 AI 的对话消息

**Compound Components 结构：**
```tsx
<ChatMessage variant="ai" agent="sage">
  <ChatMessageHeader>
    <AgentAvatar agent="sage" />
    <ChatMessageMeta timestamp={...} />
  </ChatMessageHeader>
  <ChatMessageThinking streaming={true}>
    正在分析需求...
  </ChatMessageThinking>
  <ChatMessageContent streaming={true}>
    {content}
  </ChatMessageContent>
  <ChatMessageAttachment>
    <FileChangeCard changes={...} />
  </ChatMessageAttachment>
</ChatMessage>
```

**状态与样式：**

| 状态 | 样式 | 说明 |
|------|------|------|
| streaming | `animate-pulse` 光标 | Token-by-token 流式输出 |
| thinking | `italic text-slate-400` | 思考过程展示 |
| complete | 无动画 | 输出完成 |

**无障碍规范：**
- 对话区域：`role="log" aria-live="polite"`
- 流式更新：`aria-atomic="false"` 仅播报新增内容
- Agent 标识：`aria-label="Sage 说"`

#### ThinkingProcess

**用途：** AI 思考过程流式展示

**实现规范：**
```tsx
<ThinkingProcess
  streaming={isStreaming}
  collapsible={!isStreaming}
  defaultCollapsed={false}
>
  💭 {thinkingText}
</ThinkingProcess>
```

**交互行为：**

| 状态 | 行为 |
|------|------|
| streaming | 实时更新，不可折叠 |
| complete | 可折叠，默认展开 |
| collapsed | 显示"查看思考过程" |

**样式：**
```tsx
className={cn(
  "italic text-slate-400 text-sm",
  streaming && "animate-pulse"
)}
```

#### RequirementCard

**用途：** 左侧面板需求列表项

**Compound Components 结构：**
```tsx
<RequirementCard
  selected={isSelected}
  onClick={handleSelect}
>
  <RequirementCardTitle>用户认证</RequirementCardTitle>
  <RequirementCardStatus status="developing" />
  <RequirementCardProgress current="1.2" total={5} />
</RequirementCard>
```

**状态样式：**

| 状态 | 样式 | Tailwind |
|------|------|----------|
| default | 默认背景 | `bg-slate-900` |
| hover | 背景变亮 | `hover:bg-slate-800/50 cursor-pointer` |
| selected | 左边框 + 背景 | `border-l-2 border-green-500 bg-slate-800` |
| disabled | 降低透明度 | `opacity-50 cursor-not-allowed` |

**交互规范：**
- Hover：颜色变化，**不使用 scale**（避免布局偏移）
- 过渡：`transition-colors duration-150`
- 点击反馈：`active:bg-slate-700`

#### EpicStoryTree

**用途：** Epic/Story 导航树

**基于 shadcn Accordion 实现：**
```tsx
<Accordion type="single" collapsible className="w-full">
  <AccordionItem value="epic-1">
    <AccordionTrigger className="hover:no-underline">
      <EpicHeader status="in_progress">
        Epic 1: 用户认证
      </EpicHeader>
    </AccordionTrigger>
    <AccordionContent>
      <StoryList>
        <StoryItem status="merged" number="1.1">登录页面</StoryItem>
        <StoryItem status="developing" number="1.2" active>注册流程</StoryItem>
        <StoryItem status="pending" number="1.3" locked>密码重置</StoryItem>
      </StoryList>
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

**Story 状态图标：**

| 状态 | 图标 | 颜色 |
|------|------|------|
| pending | ⏳ | `text-slate-500` |
| drafting | 📝 | `text-blue-500` |
| ux_design | 📐 | `text-purple-500` |
| ui_preview | 🎨 | `text-pink-500` |
| doc_ready | 📄 | `text-cyan-500` |
| developing | 🔧 | `text-green-500 animate-pulse` |
| validating | 🔍 | `text-amber-500 animate-pulse` |
| validated | ✅ | `text-green-500` |
| pr_pending | 🔄 | `text-blue-500` |
| pr_rejected | ❌ | `text-red-500` |
| merged | ✅ | `text-green-600` |

#### FileChangeCard

**用途：** 文件改动汇总展示

**Compound Components 结构：**
```tsx
<FileChangeCard>
  <FileChangeCardHeader>
    <FileChangeCardTitle>文件改动</FileChangeCardTitle>
    <FileChangeCardStats added={3} modified={2} deleted={1} />
  </FileChangeCardHeader>
  <FileChangeCardContent>
    <FileChangeGroup type="docs" label="📄 文档">
      <FileChangeItem type="added">epic-1.md</FileChangeItem>
      <FileChangeItem type="modified">story-1.1.md</FileChangeItem>
    </FileChangeGroup>
    <FileChangeGroup type="code" label="💻 代码">
      <FileChangeItem type="added" lines="+120">auth/login.tsx</FileChangeItem>
    </FileChangeGroup>
  </FileChangeCardContent>
</FileChangeCard>
```

**改动类型样式：**

| 类型 | 图标 | 颜色 |
|------|------|------|
| added | ✨ | `text-green-500` |
| modified | ~ | `text-amber-500` |
| deleted | 🗑️ | `text-red-500` |

#### ValidationProgress

**用途：** 验证阶段进度展示

**基于 shadcn Accordion（type="multiple"）：**
```tsx
<Accordion type="multiple" defaultValue={["current"]}>
  <ValidationStep
    id="code-standard"
    status="passed"
    title="代码规范检查"
  >
    <ValidationDetail>
      ✅ ESLint 检查通过
      ✅ TypeScript 类型检查通过
    </ValidationDetail>
  </ValidationStep>
  <ValidationStep
    id="architecture"
    status="running"
    title="架构规范检查"
  >
    <ValidationDetail>
      🔄 正在检查目录结构...
    </ValidationDetail>
  </ValidationStep>
</Accordion>
```

**状态样式：**

| 状态 | 图标 | 样式 |
|------|------|------|
| pending | ⏳ | `text-slate-500` |
| running | 🔄 | `text-amber-500 animate-spin` |
| passed | ✅ | `text-green-500` |
| failed | ❌ | `text-red-500` |

#### DiffViewer

**用途：** 文档改动 Diff 展示

**实现规范：**
```tsx
<DiffViewer
  filename="story-1.1.md"
  type="modified"
  language="markdown"
>
  <DiffLine type="context" number={1}>## Story 1.1</DiffLine>
  <DiffLine type="removed" number={2}>Status: drafting</DiffLine>
  <DiffLine type="added" number={2}>Status: doc_ready</DiffLine>
</DiffViewer>
```

**样式：**
```tsx
const lineStyles = {
  context: "text-slate-400",
  added: "bg-green-500/10 text-green-400",
  removed: "bg-red-500/10 text-red-400 line-through"
}
```

#### UIPreviewPanel

**用途：** UI 预览面板

**Compound Components 结构：**
```tsx
<UIPreviewPanel>
  <UIPreviewHeader>
    <UIPreviewTitle story="1.2" platform="web" />
    <UIPreviewStatus ux="confirmed" ui="adjusting" />
  </UIPreviewHeader>
  <UIPreviewViewport size={viewportSize} onSizeChange={setViewportSize}>
    <ViewportToggle>
      <ViewportOption value="desktop" width={1440} />
      <ViewportOption value="tablet" width={768} />
      <ViewportOption value="mobile" width={375} />
    </ViewportToggle>
  </UIPreviewViewport>
  <UIPreviewFrame src={previewUrl} />
  <UIPreviewActions>
    <Button variant="outline">🔄 重新生成</Button>
    <Button variant="default">✅ 确认界面</Button>
    <Button variant="ghost">🔗 新窗口</Button>
  </UIPreviewActions>
</UIPreviewPanel>
```

**状态处理：**

| 状态 | 显示 |
|------|------|
| empty | 空状态 + CTA 按钮 |
| generating | Skeleton + 进度提示 |
| preview | iframe + 操作按钮 |
| confirmed | 预览 + ✅ 标识 |

#### AgentAvatar

**用途：** AI Agent 头像

**Agent 配置：**

| Agent | 名称 | 颜色 | 图标 | 描述 |
|-------|------|------|------|------|
| sage | Sage | `#8B5CF6` | 💡 | PM Agent |
| cody | Cody | `#22C55E` | 💻 | DEV Agent |
| rex | Rex | `#F97316` | 🔍 | 验证 Agent |

**无障碍：**
```tsx
aria-label={`${agentName} - ${agentDescription}`}
```

### Component Implementation Strategy

**无障碍规范：**

| 要求 | 实现 |
|------|------|
| **Focus 状态** | `focus:ring-2 focus:ring-green-500 focus:ring-offset-2` |
| **键盘导航** | Tab 顺序匹配视觉顺序 |
| **ARIA 标签** | 所有图标按钮添加 `aria-label` |
| **Skip Link** | 提供"跳转到主内容"链接 |
| **Live Region** | 对话区域使用 `aria-live="polite"` |

**交互规范：**

| 场景 | 规范 |
|------|------|
| **Hover** | 颜色变化，不使用 scale（避免布局偏移） |
| **过渡** | 150-200ms，`ease-out` |
| **Loading** | >300ms 显示 Skeleton 或 Spinner |
| **Streaming** | Token-by-token，Typewriter 效果 |

### Implementation Roadmap

**Phase 1 - 核心组件（MVP 必需）：**

| 组件 | 依赖 | 关键流程 |
|------|------|----------|
| ChatMessage | - | 所有对话交互 |
| ThinkingProcess | ChatMessage | AI 透明度 |
| RequirementCard | - | 需求导航 |
| EpicStoryTree | Accordion | 进度追踪 |
| AgentAvatar | - | Agent 识别 |

**Phase 2 - 支撑组件（完整体验）：**

| 组件 | 依赖 | 增强体验 |
|------|------|----------|
| FileChangeCard | Card | 改动可视化 |
| ValidationProgress | Accordion | 验证透明度 |

**Phase 3 - 增强组件（优化体验）：**

| 组件 | 依赖 | 优化目标 |
|------|------|----------|
| DiffViewer | - | PR 确认体验 |
| UIPreviewPanel | Card + iframe | UI 设计流程 |

### Component Directory Structure

```
src/components/
├── ui/                    # shadcn/ui 组件
│   ├── accordion.tsx
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── sidebar.tsx
│   ├── tabs.tsx
│   └── ...
├── chat/                  # 对话相关组件
│   ├── chat-message.tsx
│   ├── thinking-process.tsx
│   ├── agent-avatar.tsx
│   └── file-change-card.tsx
├── requirement/           # 需求相关组件
│   ├── requirement-card.tsx
│   ├── epic-story-tree.tsx
│   └── validation-progress.tsx
├── preview/               # 预览相关组件
│   ├── ui-preview-panel.tsx
│   └── diff-viewer.tsx
└── layout/                # 布局组件
    ├── app-sidebar.tsx
    ├── main-content.tsx
    └── right-panel.tsx
```

---

## UX Consistency Patterns

> 经 ui-ux-pro-max skill 验证优化（2026-02-01）

### 对话与消息模式（中间区域）

ai-builder 的核心交互发生在中间对话区域，需要清晰区分不同类型的消息。

#### 消息类型层级

| 消息类型 | 发送方 | 视觉特征 | 用途 |
|----------|--------|----------|------|
| **用户消息** | PM | 右对齐，深色背景（`bg-slate-700`） | 用户输入的需求描述 |
| **AI 消息** | Sage/Cody/Rex | 左对齐，浅色背景（`bg-slate-800`），带 Agent 头像 | AI 响应、引导、确认 |
| **系统消息** | 系统 | 居中，无背景，小字灰色（`text-slate-500`） | 状态变更通知 |
| **操作卡片** | 系统 | 居中，卡片样式，带操作按钮 | 需要用户确认的操作 |

#### AI 消息状态

| 状态 | 视觉表现 | 交互 |
|------|----------|------|
| **思考中** | Agent 头像 + 脉冲动画 + "正在思考..." | 不可中断 |
| **流式输出** | 逐字显示（Typewriter），光标闪烁 | 可查看历史 |
| **完成** | 静态文本，底部显示 Feedback 按钮 | 可点赞/踩 |
| **错误** | 红色边框，重试按钮 | 可重试 |

#### Agent 头像规范

| Agent | 名称 | 颜色 | 职责标签 |
|-------|------|------|----------|
| Sage | Sage | `#8B5CF6`（紫色） | 需求专家 |
| Cody | Cody | `#22C55E`（绿色） | 开发专家 |
| Rex | Rex | `#F97316`（橙色） | 验证专家 |

```tsx
// Agent 头像组件结构
<div className="flex items-start gap-3">
  <AgentAvatar agent="sage" size="sm" />
  <div className="flex-1">
    <div className="text-xs text-slate-400 mb-1">Sage · 需求专家</div>
    <div className="bg-slate-800 rounded-lg p-4">
      {/* 消息内容 */}
    </div>
  </div>
</div>
```

#### 消息操作规范

| 操作 | 触发条件 | 位置 | 图标 |
|------|----------|------|------|
| **复制** | Hover 消息 | 消息右上角 | `Copy` |
| **点赞** | AI 消息完成 | 消息底部 | `ThumbsUp` |
| **点踩** | AI 消息完成 | 消息底部 | `ThumbsDown` |
| **重新生成** | AI 消息完成/错误 | 消息底部 | `RefreshCw` |

#### AI 交互专属模式

> 来源：ui-ux-pro-max skill 二次验证优化（2026-02-01）

**思考过程展示规范：**

| 阶段 | 视觉表现 | 动画 | 交互 |
|------|----------|------|------|
| **开始思考** | 💭 + "正在分析..." | `animate-pulse` | 不可折叠 |
| **思考中** | 💭 + 流式更新文字 | `animate-pulse` 光标 | 不可折叠 |
| **思考完成** | 💭 + 完整思考内容 | 无 | 可折叠（默认展开） |
| **已折叠** | "查看思考过程" 链接 | 无 | 点击展开 |

**思考过程样式：**
```tsx
<ThinkingProcess
  streaming={isStreaming}
  collapsible={!isStreaming}
  defaultCollapsed={false}
>
  <span className={cn(
    "italic text-slate-400 text-sm",
    isStreaming && "animate-pulse"
  )}>
    💭 {thinkingText}
  </span>
</ThinkingProcess>
```

**长时间等待处理：**

| 等待时长 | 处理方式 | 显示内容 |
|----------|----------|----------|
| 0-5s | 正常思考动画 | "正在思考..." |
| 5-15s | 增加进度提示 | "正在深入分析，请稍候..." |
| 15-30s | 显示阶段信息 | "正在处理复杂任务（步骤 2/4）..." |
| >30s | 提供中断选项 | "仍在处理... [取消]" |

**中断与重试机制：**

```tsx
// 长时间等待时显示取消按钮
{waitTime > 30000 && (
  <div className="flex items-center gap-2 text-slate-400 text-sm">
    <Loader2 className="h-4 w-4 animate-spin" />
    <span>仍在处理...</span>
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCancel}
      className="text-slate-500 hover:text-slate-300"
    >
      取消
    </Button>
  </div>
)}
```

**AI 反馈收集：**

| 反馈类型 | 触发时机 | 位置 | 后续处理 |
|----------|----------|------|----------|
| 👍 点赞 | AI 消息完成 | 消息底部左侧 | 静默记录 |
| 👎 点踩 | AI 消息完成 | 消息底部左侧 | 展开反馈表单 |
| 🔄 重新生成 | AI 消息完成/错误 | 消息底部右侧 | 重新请求 AI |

```tsx
// AI 消息底部操作栏
<div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
  <div className="flex items-center gap-1">
    <Button variant="ghost" size="icon" aria-label="有帮助">
      <ThumbsUp className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="icon" aria-label="没有帮助">
      <ThumbsDown className="h-4 w-4" />
    </Button>
  </div>
  <Button variant="ghost" size="sm">
    <RefreshCw className="h-4 w-4 mr-2" />
    重新生成
  </Button>
</div>
```

#### 对话区域无障碍

```tsx
// 对话区域必须使用 aria-live
<div
  role="log"
  aria-live="polite"
  aria-label="对话历史"
  className="flex-1 overflow-y-auto"
>
  {messages.map(msg => <ChatMessage key={msg.id} {...msg} />)}
</div>
```

---

### 工作流进度模式（右侧区域 Tab）

右侧面板使用 Tab 切换不同视图，工作流进度是核心 Tab 之一。

#### Tab 结构

| Tab | 图标 | 内容 | 默认显示 |
|-----|------|------|----------|
| **进度** | `ListChecks` | Epic/Story 树状结构 | ✅ 默认 |
| **文件** | `FileCode` | 当前 Story 的文件变更 | 开发中显示 |
| **预览** | `Eye` | UI 预览（如有） | 可选 |

```tsx
<Tabs defaultValue="progress">
  <TabsList>
    <TabsTrigger value="progress"><ListChecks /> 进度</TabsTrigger>
    <TabsTrigger value="files"><FileCode /> 文件</TabsTrigger>
    <TabsTrigger value="preview"><Eye /> 预览</TabsTrigger>
  </TabsList>
  <TabsContent value="progress">
    <EpicStoryTree />
  </TabsContent>
</Tabs>
```

#### Story 状态视觉规范

| 状态 | 标签颜色 | 图标 | 动画 |
|------|----------|------|------|
| **待开发** | `bg-slate-600` | `Circle` | 无 |
| **进行中** | `bg-blue-600` | `Loader2` | `animate-spin` |
| **验证中** | `bg-amber-600` | `Search` | `animate-pulse` |
| **已完成** | `bg-green-600` | `CheckCircle` | 无 |
| **失败** | `bg-red-600` | `XCircle` | 无 |

```tsx
// Story 状态配置
const storyStatusConfig = {
  pending: { color: 'bg-slate-600', icon: Circle, label: '待开发' },
  developing: { color: 'bg-blue-600', icon: Loader2, label: '开发中', animate: 'animate-spin' },
  reviewing: { color: 'bg-amber-600', icon: Search, label: '验证中', animate: 'animate-pulse' },
  completed: { color: 'bg-green-600', icon: CheckCircle, label: '已完成' },
  failed: { color: 'bg-red-600', icon: XCircle, label: '失败' },
}
```

#### 当前 Story 高亮

| 视觉元素 | 规范 |
|----------|------|
| 左边框 | `border-l-2 border-green-500` |
| 背景 | `bg-slate-800/50` |
| 标题 | `font-medium text-white` |
| 活动状态 | 必须高亮当前位置（符合 `Active State` 规范） |

#### 长列表优化

```tsx
// Story 列表超过 100 条时使用虚拟化
import { useVirtualizer } from '@tanstack/react-virtual'

// 仅渲染可见区域的 Story
const virtualizer = useVirtualizer({
  count: stories.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 48,
})
```

---

### 反馈模式（中间区域）

反馈贯穿整个对话流程，需要清晰区分不同类型。

#### 反馈类型层级

| 类型 | 用途 | 视觉 | 位置 |
|------|------|------|------|
| **内联反馈** | 即时状态变更 | 系统消息样式 | 对话流中 |
| **Toast 通知** | 操作结果提示 | Sonner 组件 | 右上角 |
| **进度指示** | 长时操作 | 进度条/Skeleton | 消息区或右侧面板 |
| **确认对话框** | 关键操作确认 | AlertDialog | 模态覆盖 |

#### Toast 规范（Sonner）

| 类型 | 方法 | 图标 | 持续时间 |
|------|------|------|----------|
| **成功** | `toast.success()` | `CheckCircle` | 3 秒 |
| **错误** | `toast.error()` | `XCircle` | 5 秒（可关闭） |
| **警告** | `toast.warning()` | `AlertTriangle` | 4 秒 |
| **信息** | `toast.info()` | `Info` | 3 秒 |
| **加载** | `toast.loading()` | Spinner | 手动关闭 |

```tsx
// Toast 使用示例
toast.success("Story 1-2 已完成")
toast.error("AI 服务连接失败，请检查配置")

// 加载状态替换模式
const toastId = toast.loading("正在提交 PR...")
// 完成后
toast.success("PR 创建成功", { id: toastId })
```

#### 错误反馈分级与恢复

| 级别 | 场景 | 处理方式 | 恢复路径 |
|------|------|----------|----------|
| **可恢复** | AI 超时、网络波动 | 自动重试 | 显示"重试"按钮 |
| **需干预** | 验证失败、代码问题 | 展示问题详情 | 对话补充上下文 + "查看详情"链接 |
| **阻塞性** | 配置错误、权限问题 | 阻止继续 | "前往设置"按钮 |

```tsx
// 错误消息必须包含恢复路径
<div role="alert" className="bg-red-900/20 border border-red-500 rounded-lg p-4">
  <div className="flex items-center gap-2 text-red-400 mb-2">
    <XCircle className="h-5 w-5" />
    <span className="font-medium">AI 服务连接失败</span>
  </div>
  <p className="text-slate-300 text-sm mb-3">请检查 API 配置是否正确</p>
  <div className="flex gap-2">
    <Button variant="outline" size="sm" onClick={retry}>
      <RefreshCw className="mr-2 h-4 w-4" /> 重试
    </Button>
    <Button variant="link" size="sm" onClick={goToSettings}>
      前往设置
    </Button>
  </div>
</div>
```

---

### 按钮层级模式

按钮是用户执行操作的核心控件，需要清晰的层级区分。

#### 按钮层级定义

| 层级 | 变体 | 样式 | 用途示例 |
|------|------|------|----------|
| **Primary** | `default` | `bg-green-600 hover:bg-green-500` | 提交 PR、确认定稿 |
| **Secondary** | `secondary` | `bg-slate-700 hover:bg-slate-600` | 保存、下一步 |
| **Outline** | `outline` | `border-slate-600 hover:bg-slate-800` | 取消、返回 |
| **Ghost** | `ghost` | `hover:bg-slate-800` | 图标按钮、次要操作 |
| **Destructive** | `destructive` | `bg-red-600 hover:bg-red-500` | 删除、移除 |
| **Link** | `link` | `text-green-500 underline` | 内联链接操作 |

#### 按钮状态规范

| 状态 | 视觉变化 | 交互 |
|------|----------|------|
| **Default** | 正常样式 | 可点击 |
| **Hover** | 颜色变浅，150ms 过渡 | - |
| **Active** | `scale-[0.98]` 轻微缩小 | - |
| **Disabled** | `opacity-50 cursor-not-allowed` | 不可点击 |
| **Loading** | 禁用 + Spinner + 文字变化 | 不可点击 |

```tsx
// 加载状态按钮（防止重复提交）
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      提交中...
    </>
  ) : (
    <>
      <Send className="mr-2 h-4 w-4" />
      提交 PR
    </>
  )}
</Button>
```

#### 破坏性操作确认

```tsx
// 删除等破坏性操作必须使用 AlertDialog
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">删除项目</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>确认删除项目？</AlertDialogTitle>
      <AlertDialogDescription>
        此操作不可恢复。项目下的所有 Epic 和 Story 将被永久删除。
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>取消</AlertDialogCancel>
      <AlertDialogAction className="bg-red-600">确认删除</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

#### 按钮组合规范

| 场景 | 布局 | 按钮顺序（左到右） |
|------|------|---------------------|
| **确认对话框** | 右对齐 | Cancel（Outline）→ Confirm（Primary） |
| **表单底部** | 右对齐 | Cancel（Ghost）→ Save（Secondary）→ Submit（Primary） |
| **内联操作** | 左对齐 | Primary → Secondary |
| **卡片操作** | 右对齐 | Ghost 图标按钮组 |

---

### 表单模式

表单用于 AI 渠道配置、项目设置等场景。

#### 表单结构规范

```tsx
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="apiUrl"
      render={({ field }) => (
        <FormItem>
          <FormLabel>API URL</FormLabel>
          <FormControl>
            <Input placeholder="https://api.example.com" {...field} />
          </FormControl>
          <FormDescription>
            输入您的 AI 服务中转地址
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <div className="flex justify-end gap-3 mt-6">
      <Button type="button" variant="outline">取消</Button>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        保存配置
      </Button>
    </div>
  </form>
</Form>
```

#### 验证反馈规范

| 验证时机 | 场景 | 规范 |
|----------|------|------|
| **onBlur** | 大多数字段 | 离开字段时验证（推荐） |
| **onChange** | 密码强度、用户名可用性 | 输入时实时验证 |
| **onSubmit** | 最终提交 | 全表单验证 |

```tsx
// 验证状态样式
className={cn(
  "transition-colors",
  fieldState.error && "border-red-500 focus-visible:ring-red-500",
  fieldState.isDirty && !fieldState.error && "border-green-500"
)}
```

#### 错误消息无障碍

```tsx
// 错误消息必须使用 role="alert"
<FormMessage role="alert" className="text-red-400 text-sm mt-1">
  {fieldState.error?.message}
</FormMessage>
```

#### 敏感字段处理

| 字段类型 | 处理方式 |
|----------|----------|
| **API Key** | 密码输入 + 显示/隐藏切换 |
| **Token** | 密码输入 + 部分遮蔽显示 |
| **连接测试** | 旁边提供"测试连接"按钮 + 结果反馈 |

---

### 空状态与加载模式

空状态和加载是用户首次使用和等待时的关键体验点。

#### 空状态类型

| 场景 | 标题 | 描述 | 操作 |
|------|------|------|------|
| **无项目** | 开始您的第一个项目 | 创建项目并导入 GitHub 仓库 | 「创建项目」按钮 |
| **无 Epic** | 描述您的需求 | 在下方输入框中描述您想要实现的功能 | 聚焦输入框 |
| **无对话** | 开始对话 | 向 AI 描述您的需求，开始协作开发 | 示例提示词 |
| **无仓库** | 导入仓库 | 从 GitHub 选择要导入的仓库 | 「导入仓库」按钮 |

#### 空状态视觉规范

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="rounded-full bg-slate-800 p-4 mb-4">
    <FolderOpen className="h-8 w-8 text-slate-400" />
  </div>
  <h3 className="text-lg font-medium text-white mb-2">
    开始您的第一个项目
  </h3>
  <p className="text-slate-400 mb-6 max-w-sm">
    创建项目并导入 GitHub 仓库，开始用自然语言实现需求
  </p>
  <Button>
    <Plus className="mr-2 h-4 w-4" />
    创建项目
  </Button>
</div>
```

#### 加载状态类型

| 场景 | 加载形式 | 阈值 |
|------|----------|------|
| **页面加载** | 全屏 Skeleton | 立即显示 |
| **列表加载** | 列表项 Skeleton | 立即显示 |
| **AI 响应** | 思考动画 + 流式输出 | 立即显示 |
| **操作提交** | 按钮 Loading + Toast | >300ms 显示 |
| **长时任务** | 进度条 + 阶段说明 | >30s |

#### Skeleton 规范

```tsx
// Skeleton 组件使用
<div className="space-y-4">
  <Skeleton className="h-4 w-[250px]" />
  <Skeleton className="h-4 w-[200px]" />
  <Skeleton className="h-20 w-full" />
</div>
```

#### AI 思考状态

```tsx
// 思考动画 - 使用脉冲效果
<div className="flex items-center gap-2 text-slate-400">
  <AgentAvatar agent="sage" size="sm" className="animate-pulse" />
  <div className="flex gap-1">
    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }} />
    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }} />
    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }} />
  </div>
  <span className="text-sm">Sage 正在思考...</span>
</div>
```

---

### 设计系统集成

#### Z-Index 层级标准

| 层级 | z-index | 元素 | 使用场景 |
|------|---------|------|----------|
| **Base** | z-0 | 页面内容 | 普通页面元素、卡片内容 |
| **Sticky** | z-10 | 固定头部、侧边栏 | AppSidebar、TopNavbar |
| **Dropdown** | z-20 | 下拉菜单、Popover | Select、DropdownMenu、Tooltip |
| **Modal** | z-30 | Dialog、Sheet | AlertDialog、确认弹窗 |
| **Overlay** | z-40 | 遮罩层 | Dialog backdrop、Sheet overlay |
| **Toast** | z-50 | Sonner 通知 | 全局 Toast 消息 |

**使用规范：**
- 严格使用标准层级值，禁止使用 `z-[9999]` 等任意值
- 同一层级内通过 DOM 顺序控制堆叠
- 新增层级需评审后统一添加

#### 全局无障碍要求

| 要求 | 实现 |
|------|------|
| **Skip Link** | 页面顶部提供"跳转到主内容"链接 |
| **Focus 管理** | Dialog/Sheet 自动 trap focus |
| **键盘导航** | Tab 顺序匹配视觉顺序 |
| **错误消息** | 使用 `role="alert"` |
| **对话区域** | 使用 `aria-live="polite"` |

```tsx
// Skip Link 实现
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4
             bg-green-600 text-white px-4 py-2 rounded z-50"
>
  跳转到主内容
</a>

<main id="main-content" tabIndex={-1}>
  {/* 主内容 */}
</main>
```

---

> 来源：ui-ux-pro-max skill 专业审查（2026-02-01）

### 审查结论

当前 UX 设计规范已符合 ui-ux-pro-max 的核心标准，以下是确认的合规项和补充优化。

### 已确认合规项 ✅

| 类别 | 合规状态 |
|------|----------|
| **配色方案** | ✅ Slate + Green 符合 Developer Tool 标准 |
| **对比度** | ✅ Slate-50 on Slate-900 = 15.5:1（AAA 级） |
| **深色主题** | ✅ CSS 变量定义 :root 和 .dark |
| **组件库** | ✅ shadcn/ui + Tailwind CSS |
| **图标库** | ✅ Lucide Icons（SVG 格式） |
| **无 emoji 图标** | ✅ 规范已明确禁止 |
| **Hover 无布局偏移** | ✅ 使用 color/opacity，避免 scale |
| **Loading 反馈** | ✅ >300ms 显示 skeleton/spinner |
| **AI 流式输出** | ✅ Token-by-token Typewriter |
| **Focus 可见** | ✅ ring-2 ring-green-500 |

### 本次优化内容

#### 1. 字体升级

| 变更前 | 变更后 | 理由 |
|--------|--------|------|
| Space Grotesk + DM Sans | **Inter + JetBrains Mono** | 开发者工具标准配对，代码展示更专业 |

#### 2. 无障碍规范增强

新增以下 WCAG AA 合规项：
- `aria-live="polite"` 对话区域
- `role="alert"` 错误消息
- `<label for>` 表单标签
- `prefers-reduced-motion` 响应
- Skip Link 跳转链接

#### 3. 反模式清单扩展

新增 12 项反模式检查，覆盖：
- z-index 管理（标准层级 z-10/20/30/50）
- 动画时长限制（150-300ms 微交互）
- 缓动函数选择（ease-out/ease-in）
- 无限动画限制（仅 loading 指示器）

### shadcn/ui 组件规范

基于 ui-ux-pro-max 分析，确认以下使用规范：

#### 必须遵循的模式

| 组件 | 规范 |
|------|------|
| **Sidebar** | 必须包裹在 `<SidebarProvider>` 内 |
| **Tabs** | 必须设置 `defaultValue` |
| **Accordion** | 明确指定 `type="single"` 或 `type="multiple"` |
| **Dialog** | 必须包含 `DialogHeader` + `DialogTitle` + `DialogDescription` |
| **AlertDialog** | 破坏性操作（如删除）必须使用 AlertDialog |
| **Sheet** | 侧边面板使用 Sheet，非 Dialog |
| **Form** | 必须使用 `Form` + `react-hook-form` + `FormField` 模式 |
| **Toast** | 使用 Sonner，语义方法 `toast.success()` / `toast.error()` |
| **Toaster** | 在 `app/layout.tsx` 全局添加一次 |

#### 主题使用规范

```tsx
// ✅ 正确：使用语义化颜色
className="bg-primary text-primary-foreground"

// ❌ 错误：硬编码颜色
className="bg-blue-500 text-white"
```

### Pre-Delivery Checklist（更新版）

开发交付前必须验证：

**视觉质量**
- [ ] 无 emoji 作为图标（使用 Lucide SVG）
- [ ] 所有图标来自统一图标集
- [ ] Hover 状态不导致布局偏移
- [ ] 使用主题颜色（bg-primary）而非 var() 包装

**交互规范**
- [ ] 所有可点击元素有 `cursor-pointer`
- [ ] Hover 状态平滑过渡（150-300ms）
- [ ] 异步操作 >300ms 显示加载状态
- [ ] 按钮提交时禁用 + 加载动画

**无障碍**
- [ ] 文字对比度 ≥ 4.5:1
- [ ] Focus 状态可见（ring-2）
- [ ] 所有图标按钮有 `aria-label`
- [ ] 表单使用 FormLabel
- [ ] 对话区域 `aria-live="polite"`
- [ ] 响�� `prefers-reduced-motion`

**响应式**
- [ ] 375px（Mobile）
- [ ] 768px（Tablet）
- [ ] 1024px（Desktop）
- [ ] 1440px（Large Desktop）

**深色主题**
- [ ] 定义 :root 和 .dark 颜色变量
- [ ] 所有自定义 CSS 包含 .dark 样式
- [ ] 测试两种主题下的对比度

---

## Responsive Design & Accessibility

> 经 ui-ux-pro-max skill 验证优化（2026-02-01）

### 响应式策略

#### MVP 范围定义

| 维度 | 决策 |
|------|------|
| **目标设备** | 桌面（1024px+） |
| **最小支持宽度** | 1024px |
| **推荐宽度** | 1280px - 1920px |
| **平板/移动端** | 显示"请使用桌面浏览器"提示 |

#### 桌面断点策略

| 断点 | 宽度 | 布局调整 |
|------|------|----------|
| **Minimum** | 1024px | 三面板紧凑模式，左侧栏可折叠 |
| **Standard** | 1280px | 三面板标准模式 |
| **Wide** | 1440px+ | 三面板宽松模式，更多留白 |
| **Ultra-wide** | 1920px+ | 内容居中，max-width 限制 |

#### 三面板布局规范

```tsx
// 桌面布局网格
<div className="min-h-screen grid grid-cols-[280px_1fr_360px]">
  {/* 左侧：项目/需求导航 */}
  <nav aria-label="项目导航" className="border-r border-slate-700">
    <AppSidebar />
  </nav>

  {/* 中间：对话区域 */}
  <main id="main-content" tabIndex={-1} className="flex flex-col">
    <ChatArea />
  </main>

  {/* 右侧：Tab 面板 */}
  <aside aria-label="工作流进度" className="border-l border-slate-700">
    <RightPanel />
  </aside>
</div>
```

#### 面板宽度适配

| 面板 | 1024px | 1280px | 1440px+ |
|------|--------|--------|---------|
| **左侧导航** | 240px（可折叠） | 280px | 280px |
| **中间对话** | flex-1 | flex-1 | flex-1（max-w-4xl） |
| **右侧 Tab** | 320px | 360px | 400px |

#### 左侧栏折叠行为

```tsx
// 小屏桌面可折叠侧边栏
<SidebarProvider>
  <Sidebar collapsible="icon">
    {/* 折叠时仅显示图标 */}
  </Sidebar>
  <SidebarTrigger
    className="fixed top-4 left-4 z-10"
    aria-label="切换侧边栏"
  />
</SidebarProvider>
```

#### 非桌面设备处理

```tsx
// 检测非桌面设备，显示提示
'use client'
import { useMediaQuery } from '@/hooks/use-media-query'

export function DesktopGuard({ children }: { children: React.ReactNode }) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  if (!isDesktop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-8">
        <div className="text-center max-w-md">
          <Monitor className="h-16 w-16 text-slate-400 mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-xl font-medium text-white mb-2">
            请使用桌面浏览器
          </h1>
          <p className="text-slate-400">
            ai-builder 是专业开发工具，需要在 1024px 以上的桌面浏览器中使用，
            以获得最佳体验。
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
```

---

### 断点策略

#### Tailwind 断点配置

```js
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      // MVP 仅使用桌面断点
      'desktop': '1024px',      // 最小支持
      'desktop-md': '1280px',   // 标准
      'desktop-lg': '1440px',   // 宽屏
      'desktop-xl': '1920px',   // 超宽屏
    },
  },
}
```

#### 布局适配示例

```tsx
// 响应式三面板
<div className={cn(
  "min-h-screen grid",
  // 最小桌面：紧凑布局
  "desktop:grid-cols-[240px_1fr_320px]",
  // 标准桌面：正常布局
  "desktop-md:grid-cols-[280px_1fr_360px]",
  // 宽屏：更宽的右侧面板
  "desktop-lg:grid-cols-[280px_1fr_400px]",
)}>
  {/* ... */}
</div>
```

#### 内容区域限制

```tsx
// 超宽屏内容居中限制
<main className="flex-1 flex justify-center">
  <div className="w-full max-w-4xl desktop-xl:max-w-5xl">
    <ChatArea />
  </div>
</main>
```

---

### 无障碍策略

#### WCAG AA 合规清单

| 类别 | 要求 | 实现 |
|------|------|------|
| **对比度** | 文字 4.5:1，大文字 3:1 | ✅ Slate-50 on Slate-900 = 15.5:1 |
| **键盘导航** | 所有功能可通过键盘访问 | Tab 顺序 + 快捷键 |
| **Focus 可见** | 焦点状态清晰可见 | `focus-visible:ring-2` |
| **Skip Link** | 提供跳转主内容链接 | 页面顶部实现 |
| **语义 HTML** | 使用正确的 HTML 标签 | `<nav>` `<main>` `<aside>` |
| **ARIA 标签** | 图标按钮有 aria-label | 所有图标按钮必须 |
| **错误消息** | 使用 role="alert" | 表单和系统错误 |
| **表单标签** | 所有输入有关联标签 | FormLabel 组件 |
| **颜色不独立** | 不仅用颜色表达信息 | 图标 + 文字 + 颜色 |
| **Reduced Motion** | 响应用户偏好 | CSS 媒体查询 |

#### 语义 HTML 结构（优先于 ARIA）

```tsx
// ✅ 正确：使用语义 HTML
<nav aria-label="项目导航">
  <ul>
    <li><a href="/project/1">项目 A</a></li>
  </ul>
</nav>

<main id="main-content">
  <article>
    <h1>对话区域</h1>
  </article>
</main>

<aside aria-label="工作流进度">
  {/* 进度面板 */}
</aside>

// ❌ 错误：div + role
<div role="navigation">...</div>
<div role="main">...</div>
```

#### 图标处理规范

```tsx
// ✅ 图标按钮：必须有 aria-label
<Button variant="ghost" size="icon" aria-label="复制消息">
  <Copy className="h-4 w-4" aria-hidden="true" />
</Button>

// ✅ 装饰性图标：aria-hidden
<div className="flex items-center gap-2">
  <CheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />
  <span>验证通过</span>
</div>

// ✅ 信息性图标：aria-label 或伴随文字
<div className="flex items-center gap-2" role="status">
  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
  <span>正在处理...</span>
</div>
```

#### 键盘导航规范

| 快捷键 | 功能 | 实现 |
|--------|------|------|
| `Tab` | 在交互元素间移动 | 浏览器默认 |
| `Shift + Tab` | 反向移动 | 浏览器默认 |
| `Enter` / `Space` | 激活按钮/链接 | 浏览器默认 |
| `Escape` | 关闭 Dialog/Sheet | shadcn/ui 内置 |
| `Ctrl/Cmd + Enter` | 发送消息 | 自定义实现 |
| `Arrow Up/Down` | 导航列表 | Tree/List 组件 |

```tsx
// 自定义键盘交互必须同时支持 onClick 和 onKeyDown
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }}
>
  可交互元素
</div>

// 消息输入快捷键
<textarea
  onKeyDown={(e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
    }
  }}
  aria-label="输入消息"
/>
```

#### Focus 状态规范

```tsx
// ✅ 正确：outline-none 必须有替代
className="focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"

// ❌ 错误：仅 outline-none
className="focus:outline-none"
```

#### 屏幕阅读器支持

| 元素 | ARIA 属性 | 说明 |
|------|-----------|------|
| **对话区域** | `role="log" aria-live="polite"` | 新消息自动朗读 |
| **AI 思考中** | `aria-busy="true"` | 表示正在加载 |
| **进度树** | `role="tree" aria-label="工作流进度"` | 树形导航 |
| **Toast** | Sonner 内置 `aria-live` | 自动处理 |
| **错误消息** | `role="alert"` | 立即朗读 |

```tsx
// 对话区域 - 屏幕阅读器友好
<div
  role="log"
  aria-live="polite"
  aria-label="对话历史"
  className="flex-1 overflow-y-auto"
>
  {messages.map(msg => (
    <ChatMessage key={msg.id} {...msg} />
  ))}
</div>

// AI 思考状态
<div
  aria-busy={isThinking}
  aria-live="polite"
  aria-label={isThinking ? "AI 正在思考" : undefined}
>
  {isThinking && <ThinkingAnimation />}
</div>
```

#### 最小点击区域

```tsx
// 所有可点击元素最小 44x44px（WCAG 2.1 Level AAA）
// 虽然 MVP 仅桌面，但保持良好实践

<Button className="min-h-[44px] min-w-[44px]">
  操作
</Button>

// 图标按钮
<Button variant="ghost" size="icon" className="h-11 w-11">
  <Copy className="h-4 w-4" />
</Button>
```

---

### 测试策略

#### 响应式测试矩阵

| 浏览器 | 1024px | 1280px | 1440px | 1920px |
|--------|--------|--------|--------|--------|
| **Chrome** | ✓ | ✓ | ✓ | ✓ |
| **Firefox** | ✓ | ✓ | ✓ | ✓ |
| **Safari** | ✓ | ✓ | ✓ | ✓ |
| **Edge** | ✓ | ✓ | ✓ | ✓ |

#### 无障碍测试工具

| 工具 | 用途 | 阶段 |
|------|------|------|
| **axe DevTools** | 自动化 WCAG 检查 | 开发时 |
| **Lighthouse** | 综合无障碍评分（目标 ≥ 90） | CI/CD |
| **键盘导航** | 手动 Tab 测试 | 开发时 |
| **VoiceOver** | macOS 屏幕阅读器 | 发布前 |
| **NVDA** | Windows 屏幕阅读器 | 发布前 |

#### 自动化测试

```tsx
// Playwright 无障碍测试
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('should have no WCAG AA violations', async ({ page }) => {
  await page.goto('/')

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()

  expect(results.violations).toEqual([])
})

test('keyboard navigation works', async ({ page }) => {
  await page.goto('/')

  // Skip Link 可用
  await page.keyboard.press('Tab')
  const skipLink = page.getByText('跳转到主内容')
  await expect(skipLink).toBeFocused()

  // Enter 激活 Skip Link
  await page.keyboard.press('Enter')
  const main = page.locator('#main-content')
  await expect(main).toBeFocused()
})

test('focus states are visible', async ({ page }) => {
  await page.goto('/')

  // Tab 到按钮
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')

  // 验证 focus ring 可见
  const focusedElement = await page.evaluate(() => {
    const el = document.activeElement
    if (!el) return null
    const styles = window.getComputedStyle(el)
    return {
      outline: styles.outline,
      boxShadow: styles.boxShadow,
    }
  })

  // 确保有可见的 focus 指示
  expect(
    focusedElement?.outline !== 'none' ||
    focusedElement?.boxShadow !== 'none'
  ).toBe(true)
})
```

---

### 实现指南

#### Next.js 字体优化（Variable Fonts）

```tsx
// app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google'

// 使用 Variable Fonts 减少包体积
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap', // 防止 FOIT
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
```

#### 图片优化（next/image）

```tsx
// ✅ 正确：使用 next/image
import Image from 'next/image'

<Image
  src="/avatar.png"
  alt="用户头像"
  width={40}
  height={40}
  className="rounded-full"
/>

// ❌ 错误：使用原生 img
<img src="/avatar.png" alt="用户头像" />
```

#### 布局防抖动（CLS 优化）

```tsx
// 使用 Skeleton 防止布局偏移
import { Suspense } from 'react'

<Suspense fallback={<ChatSkeleton />}>
  <ChatArea />
</Suspense>

// Skeleton 高度与实际内容一致
function ChatSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-4">
      <Skeleton className="h-24 w-3/4" />
      <Skeleton className="h-16 w-1/2 ml-auto" />
      <Skeleton className="h-32 w-2/3" />
    </div>
  )
}

// 使用 loading.tsx 处理路由加载
// app/dashboard/loading.tsx
export default function Loading() {
  return <DashboardSkeleton />
}
```

#### 高对比度模式支持

```css
/* globals.css */
@media (prefers-contrast: high) {
  :root {
    --border: 0 0% 50%; /* 更明显的边框 */
  }

  .dark {
    --border: 0 0% 60%;
  }
}
```

#### Reduced Motion 支持

```css
/* globals.css */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

```tsx
// React Hook 检测
import { useEffect, useState } from 'react'

export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}

// 使用
const prefersReducedMotion = usePrefersReducedMotion()
const animationClass = prefersReducedMotion ? '' : 'animate-pulse'
```

---

### ui-ux-pro-max 验证总结

#### 已验证合规项 ✅

| 规范 | 来源 | 状态 |
|------|------|------|
| next/font 字体加载 | `Use next/font for fonts` | ✅ |
| Variable Fonts | `Use variable fonts` | ✅ |
| Skeleton 防 CLS | `Avoid layout shifts` | ✅ |
| 语义 HTML 优先 | `Semantic HTML` | ✅ |
| Focus 状态必须可见 | `Never Remove Outline` | ✅ |
| 装饰图标 aria-hidden | `Decorative Icons` | ✅ |
| 图标按钮 aria-label | `Icon Button Labels` | ✅ |
| 颜色不独立表达信息 | `Color Only` | ✅ |
| prefers-reduced-motion | `Reduced Motion` | ✅ |
| 最小点击区域 44px | `Touch Target Size` | ✅ |
| 键盘交互支持 | `Keyboard Handlers` | ✅ |
| aria-live 动态内容 | `Aria Live` | ✅ |

---
