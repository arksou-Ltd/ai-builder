---
stepsCompleted:
  - 'step-01-validate-prerequisites'
  - 'step-02-design-epics'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - '_bmad-output/planning-artifacts/product-brief-ai-builder-2026-01-31.md'
---

# ai-builder - Epic Breakdown

## Overview

本文档提供 ai-builder 的完整 Epic 与 Story 拆分。在本步骤中先从 PRD、UX 设计与架构决策中系统化抽取功能需求（FR）、非功能需求（NFR）与其他实现约束；后续步骤将把这些需求映射为按用户价值组织的 Epic 与可实现的 Story，并补齐验收标准。

## Requirements Inventory

### Functional Requirements

FR1: 用户可以通过 GitHub OAuth 登录系统。验收标准：点击登录按钮后跳转 GitHub 授权页面，授权成功后 5 秒内返回系统并显示用户头像和用户名
FR2: 用户可以查看自己的 GitHub 授权状态。验收标准：在设置页面显示当前授权状态（已授权/未授权）和授权范围（repo、user:email）
FR3: 用户可以登出系统。验收标准：点击登出后立即清除本地会话，跳转至登录页面
FR4: 用户可以创建新项目并命名。验收标准：输入项目名称（1-50字符）后点击创建，1 秒内显示新项目卡片
FR5: 用户可以向项目中导入 1~10 个 GitHub 仓库。验收标准：选择仓库后点击导入，每个仓库导入完成后显示成功/失败状态，全部完成后刷新仓库列表
FR6: 用户可以查看项目中已导入的仓库列表。验收标准：列表显示每个仓库的名称、类型标签、导入时间，支持按名称排序
FR7: 用户可以从项目中移除已导入的仓库。验收标准：点击移除后显示确认对话框，确认后 1 秒内从列表中移除
FR8: 用户可以删除项目。验收标准：点击删除后显示二次确认对话框（含项目名称），确认后 1 秒内从项目列表中移除
FR9: 系统可以自动识别导入仓库的项目类型（Spring/Flutter/Next.js）。验收标准：导入完成后 3 秒内显示识别结果，准确率 ≥ 95%（基于 package.json/pubspec.yaml/pom.xml 等配置文件判断）
FR10: 用户可以配置 Codex 的 API URL 和 API Key。验收标准：表单校验 URL 格式和 Key 非空，保存成功后显示"配置已保存"提示
FR11: 用户可以配置 Claude Code 的 API URL 和 API Key。验收标准：表单校验 URL 格式和 Key 非空，保存成功后显示"配置已保存"提示
FR12: 用户可以测试 AI 渠道配置是否有效。验收标准：点击测试按钮后 10 秒内返回测试结果（成功/失败+具体错误原因）
FR13: 系统可以加密存储用户的 AI API Key。验收标准：数据库中 API Key 字段使用 AES-256 加密存储，无法逆向获取明文
FR14: 用户可以通过对话框用自然语言描述需求。验收标准：输入框支持多行文本（≤2000字符），发送后 3 秒内显示 AI 响应
FR15: Codex 可以在对话中引导 PM 逐步补充需求（涉及哪些仓库、核心用户场景、功能边界）。验收标准：AI 至少提出 3 个引导性问题，覆盖涉及仓库、用户场景、功能边界三个维度
FR16: Codex 可以根据对话内容生成结构化的 Epic 摘要供 PM 确认。验收标准：摘要包含史诗标题、目标描述、涉及仓库列表、预估 Story 数量，格式化展示
FR17: 用户可以确认或修改 Epic 摘要后正式创建史诗。验收标准：点击确认后 1 秒内创建史诗，点击修改后可编辑摘要内容并重新生成
FR18: 用户可以查看当前史诗的内容和状态。验收标准：史诗详情页显示标题、描述、状态、创建时间、关联 Story 数量
FR19: 用户可以查看史诗下所有故事的状态汇总。验收标准：显示 Story 列表及各状态计数（待开发/开发中/Review中/Done）
FR20: 系统在导入仓库后自动读取仓库中的架构文档（README、docs 目录、规范文件）。验收标准：导入后 30 秒内完成文档扫描，识别 README.md、docs/**/*.md、CONTRIBUTING.md 等文件
FR21: 系统可以基于仓库文档和代码结构自动识别项目规范（目录结构、命名约定、分层架构）。验收标准：扫描完成后生成规范摘要，包含目录结构模式、命名规范（≥3 条）、分层说明
FR22: AI 在代码生成时自动遵循已识别的项目规范。验收标准：生成的代码目录位置、命名风格、分层架构与项目现有代码一致，研发抽检一致性 ≥ 80%
FR23: 用户可以查看系统识别到的项目规范摘要。验收标准：点击查看后显示结构化的规范摘要（目录结构、命名约定、分层架构各 1 个区块）
FR24: Codex 可以从当前史诗生成下一个待开发的故事（Story）。验收标准：点击生成后 30 秒内返回 Story 内容，包含标题、描述、验收条件、预估涉及仓库
FR25: 用户可以查看当前故事的内容和开发状态。验收标准：Story 卡片显示标题、描述、状态标签、关联仓库、创建时间
FR26: Claude Code 可以根据故事内容开发代码。验收标准：代码可编译通过（编译 0 错误）并满足既定测试用例（测试通过率 100%）
FR27: Codex 可以对 Claude Code 开发的代码进行 Code Review。验收标准：Review 完成后返回结果（通过/不通过）和具体问题列表（如有），Review 时间 ≤ 60 秒
FR28: 当 Code Review 不通过时，Claude Code 可以根据反馈修复代码。验收标准：收到反馈后自动开始修复，修复完成后重新提交 Review，直到通过或用户介入
FR29: 系统可以在 Code Review 通过后将故事状态标记为 Done。验收标准：Review 通过后 1 秒内自动更新状态为 Done，界面实时刷新
FR30: 系统可以在故事 Done 后自动生成下一个故事（如果还有）。验收标准：当前 Story Done 后 3 秒内检查剩余需求，有则自动触发生成，无则提示"史诗所有故事已完成"
FR31: 系统可以在所有故事完成后将史诗状态标记为完成。验收标准：最后一个 Story Done 后 1 秒内自动更新史诗状态为"已完成"
FR32: 系统可以自动拉取仓库最新代码。验收标准：拉取完成后显示成功提示，失败时显示具体错误原因并支持重试
FR33: 系统可以自动创建 feature 分支，命名规则：`feature/<需求英文名称或版本号>_<用户GitHub账号>`。验收标准：分支创建成功后自动切换到新分支，界面显示当前分支名
FR34: 系统可以自动 commit 代码变更。验收标准：commit 成功后显示 commit hash 和变更文件数，失败时显示错误原因
FR35: 系统可以自动 push 代码到远程仓库。验收标准：push 成功后显示远程分支链接，失败时显示错误原因并支持重试
FR36: 用户可以在故事 Done 后提交 PR。验收标准：点击提交 PR 按钮后，30 秒内完成 PR 创建并返回 PR 链接
FR37: 系统可以为每个涉及的仓库分别创建 PR。验收标准：多仓库场景下，每个仓库独立创建 PR，全部完成后显示 PR 链接列表
FR38: 系统可以在 PR 中关联相关的史诗和故事信息。验收标准：PR 描述自动包含 Epic 标题、Story 标题、验收条件
FR39: 系统在 PR 描述中自动生成代码变更摘要。验收标准：PR 描述包含变更文件列表、主要修改说明（≤500字）、影响范围
FR40: 系统在 PR 中包含关联的 Epic 和 Story 上下文信息。验收标准：PR 描述包含 Epic 标题、Story 标题、验收条件清单
FR41: 同一需求涉及多个仓库的 PR 之间包含交叉引用链接。验收标准：PR 描述底部包含"关联 PR"区块，列出其他仓库 PR 的链接
FR42: 系统在工作流步骤面板中展示所有步骤及其状态（待执行/进行中/已完成）。验收标准：步骤面板显示 8 个核心步骤，每个步骤有状态图标（待执行灰色/进行中蓝色/已完成绿色）
FR43: 系统根据当前步骤动态切换右侧操作区域内容（对话框/状态卡片/操作按钮）。验收标准：切换步骤后 1 秒内更新右侧内容
FR44: 系统在每个步骤提供明确的下一步操作指引。验收标准：每个步骤底部显示"下一步"按钮或提示文字，指引内容与当前步骤相关
FR45: 用户可以在创建史诗步骤中通过自然语言描述需求。验收标准：输入框支持多行文本（≤2000字符），发送后 3 秒内显示 AI 响应
FR46: Codex 可以在对话中主动引导 PM 补充需求细节（涉及的端、核心场景、优先级）。验收标准：AI 根据上下文主动提问，问题覆盖涉及的端、核心场景、优先级
FR47: 用户可以在对话中确认或修改 Codex 生成的 Epic 摘要。验收标准：显示确认/修改按钮，修改后可重新生成摘要
FR48: 用户可以在 Story 生成后通过对话调整 Story 内容。验收标准：支持对 Story 的标题、描述、验收条件进行对话式修改
FR49: 用户可以在开发遇到问题时通过对话补充上下文。验收标准：问题出现时自动弹出对话框，用户输入后 AI 在 30 秒内响应
FR50: AI 可以根据用户描述提供修复建议。验收标准：AI 响应包含问题分析和至少 1 条可操作的修复建议
FR51: 用户可以在任何工作流节点与 AI 进行多轮对话。验收标准：对话历史保留，支持上下文连续对话（≤20轮）
FR52: 用户可以查看当前工作流的进度状态（步骤面板可视化）。验收标准：步骤面板实时显示当前步骤高亮，已完成步骤显示勾选标记
FR53: 用户可以查看每个故事的开发状态（待开发/开发中/Review中/Done）。验收标准：Story 卡片显示状态标签，颜色区分（灰/蓝/橙/绿）
FR54: 用户可以查看 Code Review 的结果和问题描述。验收标准：Review 结果页显示通过/不通过状态、问题列表（含行号和说明）
FR55: 用户可以查看已提交 PR 的链接。验收标准：PR 提交成功后显示可点击的 GitHub PR 链接，支持新窗口打开
FR56: 系统在自动操作（开发/Review/修复）时显示实时进度指示。验收标准：自动操作时显示进度条或加载动画，每 5 秒更新状态文字

### NonFunctional Requirements

NFR1: (NFR-S1: GitHub Token 加密存储；量化指标：AES-256 或同等强度加密；验证方法：数据库检查：Token 字段不可逆向明文)
NFR2: (NFR-S2: AI API Key 加密存储；量化指标：AES-256 或同等强度加密；验证方法：数据库检查：API Key 字段不可逆向明文)
NFR3: (NFR-S3: 用户数据隔离；量化指标：100% 请求仅返回当前用户数据；验证方法：自动化测试：跨用户数据访问测试全部失败)
NFR4: (NFR-S4: GitHub OAuth 最小权限；量化指标：仅申请 repo、user:email 权限；验证方法：OAuth 配置审查)
NFR5: (NFR-I1: GitHub API 失败优雅处理；量化指标：100% 失败场景有明确错误提示；验证方法：模拟 API 失败，验证错误提示显示)
NFR6: (NFR-I2: AI 服务失败处理；量化指标：自动重试，超时后可手动重试；验证方法：模拟 AI 超时，验证重试机制和手动触发)
NFR7: (NFR-I3: AI 配置校验；量化指标：首次使用前 100% 触发配置检查；验证方法：配置错误时验证阻止操作并提示)
NFR8: (NFR-R1: 工作流状态持久化；量化指标：页面刷新后状态恢复率 100%；验证方法：刷新页面，验证史诗/故事状态保留)
NFR9: (NFR-R2: 代码变更持久化；量化指标：commit 成功后数据丢失率 0%；验证方法：模拟 commit 后断开，验证数据完整)
NFR10: (NFR-R3: 异常恢复能力；量化指标：异常退出后可恢复率 ≥ 95%；验证方法：模拟进程终止，验证状态恢复)
NFR11: (NFR-P1: 页面加载性能；量化指标：首屏加载 < 3 秒（不含 AI）；验证方法：Lighthouse 性能测试，P95 < 3s)
NFR12: (NFR-P2: AI 交互超时处理；量化指标：超时阈值 120 秒，超时后 100% 显示反馈；验证方法：模拟 AI 超时，验证提示显示)

### Additional Requirements

- 技术栈固定：前端 Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui；后端 Python 3.12+ + FastAPI；数据库 PostgreSQL + SQLAlchemy 2.0；实时通信使用 FastAPI 原生 WebSocket（用于流式输出与进度推送）
- Starter Template/项目结构约束：后端采用 uv workspace（`backend/`）+ `common-kernel` + `app-api` 的分层结构；前端采用 Next.js App Router 的目录结构（以 `architecture.md` 的 Project Structure 为准）
- 认证与授权采用“双层”模式：Clerk 用于身份认证（JWT 离线验证）；GitHub OAuth 用于仓库授权与代码操作（repo 权限）。仓库操作必须在项目设置中单独完成 GitHub OAuth 授权
- 工作流入口强制前置校验：用户侧仅需配置统一 `api_key`，不需要理解或选择任何“渠道/提供方”；系统内部按策略调用所需能力并对用户透明；提供“手动按钮触发”校验能力；校验失败时以 428（Precondition Required）阻止进入后续 Story 执行流程
- 安全实现约束：GitHub OAuth Token 与 AI API Key 使用 AES-256-GCM 或等强度加密存储；实现用户数据隔离强制策略（ORM 层隔离 + 运行时审计）
- 代码执行环境：使用 E2B Cloud Sandbox 进行按需执行/预览；拉取仓库 `main` 后需进行项目初始化（目录准备、依赖安装、运行配置注入、启动/健康检查等），可参考 `ai-native` 的实践但不直接复制
- 当前仓库状态：代码骨架尚未建立（缺少 `backend/` 与 `frontend/` 等目录）。为确保后续 Epic 可在页面中调试与执行，需要新增 Epic 1（Project Bootstrap）来按 `architecture.md` 的 Project Structure 建立最小可运行框架
- 测试策略约束：集成测试使用 pytest + testcontainers 启动真实 PostgreSQL 容器；禁止 Mock（与项目测试规范一致）
- 部署与工程化：MVP 阶段不强制 CI/CD；Docker 部署为可选项；监控/日志等可后续增强但不阻塞 MVP
- UX/交互约束：桌面优先并适配主流浏览器（Chrome/Safari/Firefox/Edge）；响应式断点建议 375/768/1024/1440
- 无障碍约束：目标 WCAG AA；错误消息需使用 `role="alert"` 或 `aria-live`；交互控件需满足可访问性要求
- 动画与反馈约束：微交互 150-300ms；过渡 150-200ms `ease-out`；无限动画仅允许用于 loading 指示器；长时任务需提供 Skeleton/进度指示，并支持“进度融入对话流（In-flow Updates）”
- 错误处理 UX：错误消息需要给出恢复路径（例如“前往设置”“重试”），并按阻塞性分级展示
- 产品目标/约束：强调 80/95 分工模式（PM 产出 80 分代码，研发 Review 优化至 95 分）；北极星指标为 PR 一次性通过率 ≥ 20%（用于衡量核心价值验证）
- AI 能力范围（对用户透明）：系统内部优先支持代码开发与代码审查两类能力（当前实现可由 Claude Code/Codex 承载，更多提供方延后）；用户界面不暴露“渠道/提供方”概念
- 登录与授权策略：MVP 以 Clerk 为身份认证（支持邮箱、Google、GitHub Account 登录），GitHub OAuth 用于仓库授权（仅在接入“新仓库”时触发）

### FR Coverage Map

FR1: Epic 2 - Identity & Workspace Setup（Clerk 登录）
FR2: Epic 4 - GitHub Authorization & Repo Linking（授权状态/作用域）
FR3: Epic 2 - Identity & Workspace Setup（登出）
FR4: Epic 2 - Identity & Workspace Setup（创建工作空间/项目）
FR5: Epic 4 - GitHub Authorization & Repo Linking（绑定/接入仓库，不拉代码）
FR6: Epic 4 - GitHub Authorization & Repo Linking（仓库列表：已绑定仓库）
FR7: Epic 4 - GitHub Authorization & Repo Linking（解绑/移除仓库）
FR8: Epic 2 - Identity & Workspace Setup（删除工作空间/项目）
FR9: Epic 7 - Story Authoring + E2B Sandbox Sync（在拉取 main 到 E2B 后识别项目类型）
FR10: Epic 5 - AI API Key Setup & Validation（仅配置统一 API_KEY，用户不感知渠道/提供方）
FR11: Epic 5 - AI API Key Setup & Validation（仅配置统一 API_KEY，用户不感知渠道/提供方）
FR12: Epic 5 - AI API Key Setup & Validation（手动按钮触发校验）
FR13: Epic 5 - AI API Key Setup & Security（AES-256 加密存储）
FR14: Epic 6 - Epic Definition & Management（需求对话入口）
FR15: Epic 6 - Epic Definition & Management（需求引导补全）
FR16: Epic 6 - Epic Definition & Management（生成 Epic 摘要）
FR17: Epic 6 - Epic Definition & Management（确认/修改并创建 Epic）
FR18: Epic 6 - Epic Definition & Management（查看 Epic 内容与状态）
FR19: Epic 6 - Epic Definition & Management（查看 Epic 下 Story 状态汇总）
FR20: Epic 7 - Story Authoring + E2B Sandbox Sync（在 E2B 上扫描仓库文档）
FR21: Epic 7 - Story Authoring + E2B Sandbox Sync（在 E2B 上抽取项目规范）
FR22: Epic 7 - Story Authoring + E2B Sandbox Sync（代码生成遵循规范）
FR23: Epic 7 - Story Authoring + E2B Sandbox Sync（展示规范摘要）
FR24: Epic 7 - Story Authoring + E2B Sandbox Sync（从 Epic 生成 Story）
FR25: Epic 8 - Story Execution（查看 Story 内容与状态）
FR26: Epic 8 - Story Execution（Claude Code 开发）
FR27: Epic 8 - Story Execution（Codex Review）
FR28: Epic 8 - Story Execution（根据反馈修复）
FR29: Epic 8 - Story Execution（Review 通过后标记 Done）
FR30: Epic 8 - Story Execution（Done 后生成下一个 Story）
FR31: Epic 8 - Story Execution（所有 Story 完成后 Epic 完成）
FR32: Epic 7 - Story Authoring + E2B Sandbox Sync（拉取仓库 main 到 E2B 沙箱，并完成项目初始化）
FR33: Epic 9 - Code Delivery Automation（创建 feature 分支）
FR34: Epic 9 - Code Delivery Automation（自动 commit）
FR35: Epic 9 - Code Delivery Automation（自动 push）
FR36: Epic 9 - Code Delivery Automation（创建 PR）
FR37: Epic 9 - Code Delivery Automation（多仓库分别创建 PR）
FR38: Epic 9 - Code Delivery Automation（PR 关联 Epic/Story 信息）
FR39: Epic 9 - Code Delivery Automation（PR 变更摘要）
FR40: Epic 9 - Code Delivery Automation（PR 上下文信息）
FR41: Epic 9 - Code Delivery Automation（多仓库 PR 交叉引用）
FR42: Epic 3 - Workflow Progress & UX Transparency（步骤面板与状态）
FR43: Epic 3 - Workflow Progress & UX Transparency（右侧操作区随步骤切换）
FR44: Epic 3 - Workflow Progress & UX Transparency（下一步指引）
FR45: Epic 6 - Epic Definition & Management（创建 Epic 时自然语言描述）
FR46: Epic 6 - Epic Definition & Management（主动引导补充细节）
FR47: Epic 6 - Epic Definition & Management（确认/修改 Epic 摘要）
FR48: Epic 7 - Story Authoring + E2B Sandbox Sync（对话调整 Story 内容）
FR49: Epic 8 - Story Execution（遇到问题补充上下文）
FR50: Epic 8 - Story Execution（提供修复建议）
FR51: Epic 8 - Story Execution（多轮对话）
FR52: Epic 3 - Workflow Progress & UX Transparency（工作流进度可视化）
FR53: Epic 3 - Workflow Progress & UX Transparency（Story 状态展示）
FR54: Epic 8 - Story Execution（Review 结果与问题描述）
FR55: Epic 9 - Code Delivery Automation（展示 PR 链接）
FR56: Epic 3 - Workflow Progress & UX Transparency（自动操作实时进度指示）

## Epic List

### Epic 1: Project Bootstrap (App Skeleton)
建立最小可运行的工程骨架（前端 + 后端），提供可启动的开发环境、基础页面承载能力与健康检查，为后续 Epic 的页面调试、工作流执行与代码操作提供基础框架。骨架结构以 `architecture.md` 的 Project Structure 为准，并参考 `ai-native` 的实践但不直接复制。
**FRs covered:** None (foundation)

### Epic 2: Identity & Workspace Setup
用户可通过 Clerk 完成注册/登录（邮箱、Google、GitHub Account）与登出，并可创建/删除工作空间（项目）。
**FRs covered:** FR1, FR3, FR4, FR8

### Epic 3: Workflow Progress & UX Transparency
提供步骤面板与状态（待执行/进行中/已完成）、右侧操作区随步骤切换、明确下一步指引，并展示 Story 状态、Review 结果入口与自动操作实时进度指示等，确保长时任务具备透明反馈；这是后续 Epic 在 UI 上可执行与可调试的基础体验框架。
**FRs covered:** FR42, FR43, FR44, FR52, FR53, FR56

### Epic 4: GitHub Authorization & Repo Linking (No Code Import)
用户可将仓库绑定到工作空间并在需要时完成 GitHub 授权；仅在“新仓库”接入时触发授权；此阶段不拉取代码、不扫描文件。
**FRs covered:** FR2, FR5, FR6, FR7

### Epic 5: AI API Key Setup & Validation (Single Key, No Channel Concepts)
用户仅需配置统一的 `api_key`，不需要理解或选择任何“渠道/提供方”；系统负责 AES-256 加密存储，并提供“手动按钮触发”的校验能力（校验成功/失败及可恢复的错误信息）。
**FRs covered:** FR10, FR11, FR12, FR13

### Epic 6: Epic Definition & Management
PM 通过对话描述需求并获得引导补全，生成 Epic 摘要后可确认/修改并创建 Epic，并查看 Epic 内容与状态、Story 状态汇总。
**FRs covered:** FR14, FR15, FR16, FR17, FR18, FR19, FR45, FR46, FR47

### Epic 7: Story Authoring + E2B Sandbox Sync & Runtime Bootstrap (Pull main on-demand)
从 Epic 生成 Story，并支持对话调整 Story；进入 Story 流程时，将相关仓库 `main` 分支拉取到 E2B 沙箱作为开发/验证上下文，并完成项目初始化（目录准备、依赖安装、运行配置注入、启动/健康检查等），随后在该阶段完成项目类型识别、文档扫描与项目规范抽取/展示，以便后续代码生成遵循规范。
**FRs covered:** FR9, FR20, FR21, FR22, FR23, FR24, FR32, FR48

### Epic 8: Story Execution: Build, Review, Fix, Done (One Story to PR-pass)
Claude Code 根据 Story 开发代码，Codex 完成 Review；不通过时按反馈自动修复并循环 Review；通过后将 Story 标记为 Done，并支持对话补充上下文与修复建议（MVP 仅需保证至少 1 个 Story 达到 PR 通过与 Done 标准）。
**FRs covered:** FR25, FR26, FR27, FR28, FR29, FR30, FR31, FR49, FR50, FR51, FR54

### Epic 9: Code Delivery Automation: Branch, Commit, PR (Multi-repo ready)
自动拉取最新代码、创建 feature 分支、commit、push；在 Story Done 后创建 PR（多仓库则分别创建）；PR 描述包含 Epic/Story 上下文、验收条件与变更摘要，并提供 PR 链接展示与跨仓库 PR 交叉引用。
**FRs covered:** FR33, FR34, FR35, FR36, FR37, FR38, FR39, FR40, FR41, FR55

<!-- Repeat for each epic in epics_list (N = 1, 2, 3...) -->

## Epic {{N}}: {{epic_title_N}}

{{epic_goal_N}}

<!-- Repeat for each story (M = 1, 2, 3...) within epic N -->

### Story {{N}}.{{M}}: {{story_title_N_M}}

As a {{user_type}},
I want {{capability}},
So that {{value_benefit}}.

**Acceptance Criteria:**

<!-- for each AC on this story -->

**Given** {{precondition}}
**When** {{action}}
**Then** {{expected_outcome}}
**And** {{additional_criteria}}

<!-- End story repeat -->

## Epic 1: Project Bootstrap (Monorepo Starter)

建立标准化 Monorepo 项目骨架，确保技术栈、目录结构与架构决策一致，使团队可以立刻启动前后端进行页面调试与后续 Epic 的实现。

### Story 1.1: 前端项目初始化（Next.js + shadcn/ui）

As a 开发者,
I want 使用标准化的前端项目骨架,
So that 我可以基于统一的技术栈与目录结构开始前端开发。

**Acceptance Criteria:**

**Given** 仓库当前没有前端工程
**When** 执行前端初始化命令并完成 UI 基础配置
**Then** `frontend/app-web/` 目录创建完成且可启动开发服务
**And** Next.js App Router 结构就绪（启用 `src/` 目录）
**And** Tailwind CSS 配置完成
**And** shadcn/ui 初始化完成（启用 CSS variables，base color 使用 `slate`）
**And** ESLint 配置完成且 `npm run lint` 通过
**And** `package.json` 中依赖与脚本齐全（可 dev/build/lint）

### Story 1.2: 后端 Workspace 初始化（uv workspace + FastAPI）

As a 开发者,
I want 使用标准化的后端项目骨架,
So that 我可以基于统一的 Python workspace 与模块结构开始后端开发。

**Acceptance Criteria:**

**Given** 仓库当前没有后端工程
**When** 初始化 uv workspace 并创建最小 FastAPI 服务骨架
**Then** `backend/` 目录创建完成
**And** `backend/pyproject.toml` 作为 workspace root 配置完成
**And** `backend/common-kernel/` 模块创建完成
**And** `backend/app-api/` 模块创建完成，且代码根路径为 `backend/app-api/src/api/app/`
**And** `backend/app-api` 可启动并提供 `GET /health` 返回成功
**And** workspace members 正确声明为 `["common-kernel", "app-api"]`（不包含 `agent-kernel`）

### Story 1.3: 依赖链与模块结构搭建（移除 agent-kernel）

As a 开发者,
I want 模块间依赖关系正确配置,
So that 我可以按架构约束进行模块化开发且避免循环依赖。

**Acceptance Criteria:**

**Given** 后端 workspace 初始化完成
**When** 配置模块依赖关系
**Then** 依赖链满足：`app-api → common-kernel → arksou-kernel-framework@v0.3.4`
**And** `common-kernel` 通过 `git+ssh` 引入 `arksou-kernel-framework[all]@v0.3.4`
**And** `app-api` 通过 workspace 引用依赖 `common-kernel`
**And** `app-api` 依赖 `fastapi` 与 `uvicorn[standard]`
**And** 仓库中不存在 `backend/agent-kernel`，且任何配置/依赖中都不引用它
