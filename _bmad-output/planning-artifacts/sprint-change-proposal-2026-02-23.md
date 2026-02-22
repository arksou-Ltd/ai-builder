# Sprint Change Proposal — Settings 入口位置调整

**日期：** 2026-02-23
**提案人：** Arksou
**变更范围：** Minor（直接实施）

---

## Section 1: Issue Summary

### 问题陈述

工作空间设置（Settings）按钮目前放置在顶部导航栏右上角，与 UserButton 和 LanguageSwitcher 同级。该位置将工作空间级配置提升到了全局导航层级，不符合信息架构原则——Settings 本质上是工作区内的功能配置，应与工作区内容关联更紧密。

### 发现背景

需求评审阶段，利益相关方提出 Settings 入口的层级位置需要调整。

### 变更方向

将 Settings 从顶部导航移至右侧面板的 Tab 项位置，与需求进度、文档、界面、E2B 沙箱等 Tab 并列。

---

## Section 2: Impact Analysis

### Epic Impact

| Epic | 影响 | 说明 |
|------|------|------|
| Epic 3（工作空间 UI 执行界面） | 直接影响 | Story 3.1、3.5、3.6、3.7 验收标准需更新 |
| 其他 Epic | 无影响 | — |

### Story Impact

| Story | 变更类型 | 说明 |
|-------|----------|------|
| Story 3.1 | AC 修改 | "顶部导航提供 Settings 入口" → "右侧面板 Tab 提供 Settings 入口" |
| Story 3.5 | AC 修改 | 阻断提示入口从"去工作空间设置"改为"切换到 Settings Tab" |
| Story 3.6 | AC 修改 | Tab 数量从 4 → 5，标题从"四 Tab"改为"Tab 切换编排" |
| Story 3.7 | AC 修改 | "管理仓库"跳转从"Workspace Settings"改为"Settings Tab" |

### Artifact Conflicts

| 工件 | 冲突 | 状态 |
|------|------|------|
| PRD | 无直接冲突 | ✅ 无需修改 |
| Architecture | 无直接冲突 | ✅ 无需修改 |
| UX Design | 布局图、Tab 列表、Tab 切换表 | ✅ 已修改 |
| Epics | Story 3.1/3.5/3.6/3.7 AC | ✅ 已修改 |

### Technical Impact

代码变更范围小，仅涉及前端 4 个文件 + 2 个翻译文件，无后端影响。

---

## Section 3: Recommended Approach

**选择路径：直接调整（Direct Adjustment）**

- 变更范围明确，影响文件有限
- 不涉及架构变更或数据模型调整
- 无需回滚或 MVP 范围审查

---

## Section 4: Detailed Change Proposals

### 4.1 代码变更

#### 4.1.1 WorkspaceHeader.tsx — 移除 Settings 按钮

- 移除 `onSettingsClick` prop 和 Settings 按钮
- 移除 `Settings` 图标、`Button` 组件导入
- 顶部导航仅保留 LanguageSwitcher 和 UserButton

#### 4.1.2 WorkspaceSettingsPanel.tsx — 适配为 Tab 内容

- 移除 `onClose` prop 和关闭按钮（✕）
- 简化 header 区域布局

#### 4.1.3 page.tsx — 引入 Tabs 结构

- 移除 `showSettings` 状态和相关回调
- 右侧面板从条件渲染改为 `Tabs` 结构（shadcn/ui）
- 包含 "progress" 和 "settings" 两个 Tab
- 保留扩展位置供后续 Story 3.7~3.10

#### 4.1.4 i18n 翻译文件 — 同步更新

- 新增 `tabProgress`、`tabSettings` 翻译键
- 移除废弃的 `settings`、`closeSettings` 翻译键

### 4.2 文档变更

#### 4.2.1 epics.md

- Story 3.1 AC：Settings 入口位置描述更新
- Story 3.5 AC：阻断提示入口描述更新
- Story 3.6：标题和 AC 中 Tab 数量从 4 更新为 5
- Story 3.7 AC："管理仓库"跳转目标更新

#### 4.2.2 ux-design-specification.md

- 布局结构图：Tab 列表增加 [设置]
- Tab 切换逻辑表：增加"工作空间配置 → 设置" 行
- 代码示例注释：Tab 列表增加"设置"

---

## Section 5: Implementation Handoff

### 变更范围分类：Minor

可由���发团队直接实施，无需 PO/SM 或 PM/Architect 介入。

### 已完成的修改清单

| 文件 | 类型 | 状态 |
|------|------|------|
| `frontend/app-web/src/components/workspace/WorkspaceHeader.tsx` | 代码 | ✅ 已修改 |
| `frontend/app-web/src/components/workspace/WorkspaceSettingsPanel.tsx` | 代码 | ✅ 已修改 |
| `frontend/app-web/src/app/[locale]/workspace/[workspaceId]/page.tsx` | 代码 | ✅ 已修改 |
| `frontend/app-web/messages/en.json` | i18n | ✅ 已修改 |
| `frontend/app-web/messages/zh-CN.json` | i18n | ✅ 已修改 |
| `_bmad-output/planning-artifacts/epics.md` | 文档 | ✅ 已修改 |
| `_bmad-output/planning-artifacts/ux-design-specification.md` | 文档 | ✅ 已修改 |

### 验证结果

- ✅ TypeScript 类型检查通过（零错误）
- ✅ ESLint 检查通过
- ✅ shadcn/ui Tabs 组件已安装

### 成功标准

- Settings 按钮不再出现在顶部导航栏
- 右侧面板展示 Tab 结构，包含"进度"和"设置"两个 Tab
- 切换到"设置"Tab 可见 Code Sources > GitHub 区块
- 文档中所有 Settings 入口描述指向右侧面板 Tab
