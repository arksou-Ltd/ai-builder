# Story 2.1: clerk-sign-in

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 访客用户,  
I want 通过 Clerk 进行邮箱/Google/GitHub Account 登录并进入系统,  
so that 我可以开始使用平台功能。

## Acceptance Criteria

1. **Given** 未登录用户在登录页  
   **When** 选择 Clerk 登录方式（邮箱/Google/GitHub Account）并完成授权  
   **Then** 5 秒内进入系统并显示用户头像和用户名（**计时点**：从 Clerk 授权成功回跳到应用开始，到受保护页面首屏渲染完成且用户信息可见为止）  
   **And** 登录被取消或失败时显示失败原因并保持在登录页（提供“重试/重新登录”的恢复路径）

## Tasks / Subtasks

- [x] 实现登录/注册路由并嵌入 Clerk 组件（AC: 1）
  - [x] 新增登录页路由并渲染 `<SignIn />`（使用 Clerk 官方 App Router 路由约定）
  - [x] 同步新增注册页路由并渲染 `<SignUp />`（避免 Clerk UI 内跳转 404）
  - [x] 统一外观/样式兼容配置（Tailwind CSS 4：`cssLayerName`，见下方"Implementation Hints"）
- [x] 实现受保护落地页与用户信息展示（AC: 1）
  - [x] 登录成功后进入受保护页面（如项目列表/首页）
  - [x] 在受保护布局中展示用户头像与用户名（优先使用 `<UserButton />`）
- [x] 配置路由保护中间件（AC: 1）
  - [x] 使用 `clerkMiddleware` + `createRouteMatcher` 定义 public routes 与 protected routes
  - [x] 未登录访问受保护页面时自动跳转到登录页
  - [x] 登录后返回目标页面（或按 UX 约定跳转到默认落地页）

## Dev Notes

### Scope Clarification

- 本 Story 只覆盖 **Clerk 身份认证（登录）**：邮箱/Google/GitHub Account 三种方式。
- **必须强调**：Clerk 的 GitHub 登录 **≠** GitHub OAuth 仓库授权（repo 权限）。仓库授权在后续 Epic 4 单独实现。

### Baseline (must follow)

- 技术栈基线：Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui（App Router）
- 依赖版本基线（避免随意升级导致破坏）：`next@16.1.6`、`react@19.2.3`、`@clerk/nextjs@^6.37.1`（见 `frontend/app-web/package.json`）

### UX / Interaction Requirements (must follow)

- 登录入口：访问应用 → 进入登录页 → 展示 Clerk 登录组件。
- 登录失败场景必须提供“可恢复路径”：至少包含“重试/重新登录”按钮，且错误信息可访问（`role="alert"` 或 `aria-live`）。
- 登录成功后需在 5 秒内进入系统并展示用户头像与用户名（建议在 Header/UserMenu 位置展示）。
  - 建议作为可观测指标记录：P95（或至少 P90）满足 5 秒目标，避免仅用单次体验判断。

### Error Handling Matrix (recommended)

- 优先使用 Clerk `<SignIn /> / <SignUp />` 内置的错误提示与交互（无需手写错误 UI）。
- 若需要自定义文案或样式，使用 `appearance` 配置做外观调整，并确保错误信息可访问（`role="alert"` 或 `aria-live`）。
- 期望的用户可见结果建议覆盖：
  - 授权被取消：提示“登录已取消”，提供“重新登录”按钮（留在登录页）
  - 授权失败（第三方返回错误）：提示“登录失败：{reason}”，提供“重试”按钮
  - 网络错误/超时：提示“网络异常，请重试”，提供“重试”按钮
  - 账户冲突/绑定异常（如 Clerk 返回冲突提示）：提示“账号异常：{reason}”，提供“重新登录/联系客服”路径（按产品策略）

### Environment & Configuration Notes

- 环境变量按 Clerk 官方 Next.js 指南配置（至少包含 Publishable Key；Server 侧能力需要 Secret Key）。
- 建议提供本地配置模板（开发环境）：
  - `frontend/app-web/.env.local`
    - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx`
    - `CLERK_SECRET_KEY=sk_test_xxxxx`
    - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`（可选）
    - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`（可选）
    - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/`（可选）
    - `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/`（可选）
- 路由代理文件必须位于 `src/` 目录根（与 `app/` 同级），不是放在 `app/` 内部：
  - `frontend/app-web/src/app/`（路由）
  - `frontend/app-web/src/proxy.ts`（路由代理，与 `app/` 同级；Next.js 16 使用 proxy 约定替代 middleware）

### Existing Code & Structure (reuse, don’t reinvent)

- 已存在全局 `ClerkProvider`：`frontend/app-web/src/app/providers.tsx`（无需重复包裹或改造成多 Provider）。
- **Tailwind CSS 4 兼容性（必须做）**：按 Clerk 最新 Tailwind CSS 4 指南，为 `ClerkProvider` 配置 CSS Layer，避免样式冲突：

  ```tsx
  <ClerkProvider appearance={{ cssLayerName: "clerk" }}>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </ClerkProvider>
  ```

  - 如仍出现样式层级问题，再补充 `frontend/app-web/src/app/globals.css` 的 layer 顺序声明（以 Clerk 文档为准）。
- 当前首页为纯展示页：`frontend/app-web/src/app/page.tsx`；本 Story 实现需引入 `(auth)` 与 `(protected)` 的路由分组或等价结构。

### Suggested Frontend File Touchpoints (expected)

- `frontend/app-web/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`（登录页）
- `frontend/app-web/src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`（注册页；避免 Clerk UI 内“Sign up”跳转 404）
- `frontend/app-web/src/app/(protected)/layout.tsx`（受保护布局：Header + UserMenu）
- `frontend/app-web/src/app/(protected)/page.tsx` 或 `frontend/app-web/src/app/(protected)/projects/page.tsx`（默认落地页）
- `frontend/app-web/src/proxy.ts`（路由保护：未登录跳转到登录页；Next.js 16 proxy 约定）

### Implementation Hints (avoid common mistakes)

- 优先使用 `@clerk/nextjs` 的官方组件/方法完成：
  - 登录页：`<SignIn />`
  - 注册页：`<SignUp />`
  - 受保护区域：`<SignedIn /> / <SignedOut />` 或服务端 `auth()`
  - 用户信息展示：`<UserButton />`（包含头像与菜单；建议提前配置 `afterSignOutUrl="/sign-in"`，Story 2.2 可复用）
    - 示例：`<UserButton afterSignOutUrl="/sign-in" />`
- 路由保护不要"手写 if + redirect"散落在每个页面；集中在 `frontend/app-web/src/proxy.ts`。
- 推荐的中间件路由匹配模式（避免使用过时 API）：

  ```ts
  import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

  const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

  export default clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) {
      await auth.protect();
    }
  });
  ```

- 可选增强：在受保护 Server Component 中使用 `auth().protect()`（若你的 SDK 版本提供该能力）作为“双保险”，减少误配置导致的匿名渲染风险。

### Testing Requirements

- 严禁 Mock/Test Doubles（项目全局规则）。
- 最低质量门槛：`npm run lint` 必须通过。
- 若新增 E2E 测试框架，必须使用真实页面流（不使用 mock provider）；否则提供清晰的手动验收步骤（按 AC）。

## Dev Agent Guardrails: Technical Requirements

- 前端技术栈固定：见 “Baseline (must follow)”
- 认证：使用 `@clerk/nextjs`（已安装），App Router 模式
- 禁止 Pages Router；禁止 Redux
- 无障碍：错误提示使用 `role="alert"` 或 `aria-live`，确保屏幕阅读器可读

## Dev Agent Guardrails: Architecture Compliance

- 前端代码必须位于 `frontend/app-web/src/` 下（与现有工程结构一致）
- 认证职责边界清晰：
  - Clerk：身份认证与会话
  - GitHub OAuth：仓库授权（后续 Story/ Epic）

## Dev Agent Guardrails: Library & Framework Requirements

- 复用现有 `ClerkProvider`（`frontend/app-web/src/app/providers.tsx`）
- Clerk App Router 推荐路由形式：`/sign-in/[[...sign-in]]`（保持与官方约定一致，避免自造路由协议）
  - 注册路由同理：`/sign-up/[[...sign-up]]`
- Tailwind CSS 4 兼容性：`ClerkProvider` 必须设置 `appearance.cssLayerName`（见上方 “Existing Code & Structure”）

## Dev Agent Guardrails: File Structure Requirements

- 仅在 `frontend/app-web/` 范围内新增/修改前端文件
- 若引入路由分组，使用 `src/app/(auth)/...` 与 `src/app/(protected)/...`（或等价结构），并保持目录命名为英文

## Latest Technical Information

- 当前项目依赖基线包含 `@clerk/nextjs`（见 `frontend/app-web/package.json`），实现时优先遵循 Clerk 官方 Next.js App Router 指南与 `clerkMiddleware` 推荐用法。

## Project Context Reference

- `_bmad-output/project-context.md`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.1]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#登录交互详情]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#登录失败场景]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-010:-Clerk-认证配置]
- [Source: _bmad-output/project-context.md#认证集成-(Clerk)]
- [Source: frontend/app-web/src/app/providers.tsx]
- [Source: frontend/app-web/package.json]

## Story Completion Status

Status: done

Completion Note: All tasks completed. Code review issues resolved.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101), Claude Opus 4.6 (claude-opus-4-6) - Code Review Round 5 Fix

### Debug Log References

无

### Implementation Plan

1. **登录/注册路由实现**
   - 使用 Clerk 官方 App Router 路由约定 `[[...sign-in]]` 和 `[[...sign-up]]`
   - 路由分组 `(auth)` 用于身份认证页面
   - 配置 `fallbackRedirectUrl="/dashboard"` 以在登录成功后跳转到受保护页面

2. **受保护页面实现**
   - 创建 `/dashboard` 路由作为登录后的默认落地页
   - layout 中使用 `auth.protect()` 做组件级保护 + `currentUser()` 获取展示数据
   - page 中嵌入 `PerformanceMarker` 客户端组件（性能标记，校验用户信息可见后再 mark）
   - 使用 `<UserButton afterSignOutUrl="/sign-in" />` 展示用户头像和登出功能

3. **路由保护**（纵深防御：proxy + layout 双层保护）
   - proxy.ts：`clerkMiddleware` + `createRouteMatcher` 按路由类型分支（路由级拦截）
   - dashboard layout：`auth.protect()` 组件级保护（防止 proxy matcher 配置遗漏导致匿名渲染）
   - 根路径 `/` 与认证页面仅调用一次 `auth()` 检查登录状态（已登录 → `/dashboard`）
   - 受保护 API 路由：未登录返回 401 JSON（RESTful 语义，不做页面重定向）

4. **Tailwind CSS 4 兼容性**
   - 为 `ClerkProvider` 配置 `appearance={{ cssLayerName: "clerk" }}`
   - 在 `globals.css` 中声明 CSS layer 顺序：`base < clerk < components < utilities`

### Completion Notes List

- ✅ 实现登录页 `/sign-in` 使用 `<SignIn />` 组件
- ✅ 实现注册页 `/sign-up` 使用 `<SignUp />` 组件
- ✅ 配置 `ClerkProvider` 的 `cssLayerName: "clerk"` 以兼容 Tailwind CSS 4
- ✅ 创建受保护的 Dashboard 页面 `/dashboard`
- ✅ 在 Dashboard layout 中展示用户名和 `<UserButton />`
- ✅ 配置中间件使用 `clerkMiddleware` 保护非公开路由
- ✅ 根路径 `/` 重定向到 `/sign-in`（中间件处理登录状态）
- ✅ 提供 `.env.example` 环境变量模板
- ✅ ESLint 检查通过
- ✅ TypeScript 类型检查通过
- ✅ [Code Review Fix] 统一用户名显示回退逻辑（firstName → username → email）
- ✅ [Code Review Fix] 添加 CSS layer 顺序声明（base < clerk < components < utilities）
- ✅ [Code Review Fix] 已登录用户访问 /sign-in 或 /sign-up 时自动跳转到 /dashboard
- ✅ [Code Review Fix] 修复 displayName 为空时显示"欢迎回来，！"的问题
- ✅ [Code Review Fix] Dashboard 页面改回服务端组件，确保首屏渲染即显示用户信息
- ✅ [Code Review Fix] 中间件统一鉴权逻辑，只调用一次 auth() 避免重复开销
- ✅ [Code Review Fix] 已登录用户访问根路径直接重定向到 /dashboard，避免多次跳转
- ✅ [Code Review Round 3] displayName 全链路添加 `.trim()` 防止空字符串通过
- ✅ [Code Review Round 3] layout.tsx 用户名显示添加兜底值"用户"
- ✅ [Code Review Round 3] 确认 Dashboard 页面已为服务端组件（currentUser()），首屏渲染即显示用户信息
- ✅ [Code Review Round 3] 确认中间件已实现单次 auth() 调用，无重复鉴权
- ✅ [Code Review Round 3] 根路径从 public routes 中移除，中间件统一处理跳转（已登录→/dashboard，未登录→/sign-in），消除多次跳转
- ✅ [Code Review Round 4] 中间件按路由类型分支：根路径/认证页使用 auth()，其余路由使用 auth.protect() 保留 returnBackUrl 语义
- ✅ [Code Review Round 5] layout.tsx 改用 auth() + redirectToSignIn() 替代裸 redirect("/sign-in")，自动携带 returnBackUrl
- ✅ [Code Review Round 5] layout.tsx 拆分保护逻辑（auth() 轻量验证）与数据获取（currentUser() 展示），消除语义重叠
- ✅ [Code Review Round 5] 中间件新增 API 路由匹配器，未登录 API 返回 401 JSON（而非 auth.protect() 的 404）
- ✅ [Code Review Round 5] CSS @layer 声明移到 @import "tailwindcss" 之前，避免隐式层顺序不稳定
- ✅ [Code Review Round 5] 中间件注释对齐三分支策略的真实语义
- ✅ [Code Review Round 5] 根路由 fallback 改为 auth() 区分已登录/未登录状态，不再无条件跳 sign-in
- ✅ [Code Review Round 6] page.tsx 去掉冗余 currentUser() 调用，用户名展示统一由 layout header 负责，消除重复远程调用
- ✅ [Code Review Round 6] 中间件曾新增 isPublicApiRoute 白名单（/api/webhooks），预防未来 webhook 被 401 挡掉（Round 8 已移除，改为按需显式放行）
- ✅ [Code Review Round 6] middleware.ts → proxy.ts 迁移：消除 Next.js 16 deprecation 警告（Clerk 已支持，代码零改动）
- ✅ [Code Review Round 7] layout.tsx 简化为 auth.protect()，替代 4 行手动保护逻辑
- ✅ [Code Review Round 7] sign-in/sign-up 页面外层包裹 aria-live="polite"，确保 Clerk 错误消息被屏幕阅读器捕获
- ✅ [Code Review Round 7] 新增 PerformanceMarker 客户端组件（performance.mark + 开发环境 console.log），为 AC "5 秒"提供可复核证据
- ✅ [Code Review Round 7] Story 文档 3 处 middleware.ts 引用更新为 proxy.ts

### File List

**新增文件：**
- `frontend/app-web/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` - 登录页
- `frontend/app-web/src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` - 注册页
- `frontend/app-web/src/app/dashboard/layout.tsx` - Dashboard 受保护布局
- `frontend/app-web/src/app/dashboard/page.tsx` - Dashboard 首页（纯展示，不调用 currentUser()）
- `frontend/app-web/src/app/dashboard/performance-marker.tsx` - 首屏渲染性能标记组件（AC "5 秒"可观测性证据）
- `frontend/app-web/src/proxy.ts` - Clerk 路由保护代理（原 middleware.ts，Next.js 16 迁移为 proxy 约定）
- `frontend/app-web/.env.example` - 环境变量配置模板

**修改文件：**
- `frontend/app-web/src/app/providers.tsx` - 添加 `cssLayerName: "clerk"` 配置
- `frontend/app-web/src/app/page.tsx` - 根路径（中间件处理重定向，此页面作为 fallback）
- `frontend/app-web/src/app/globals.css` - 添加 CSS layer 顺序声明

**删除文件：**
- `frontend/app-web/src/middleware.ts` - Next.js 16 使用 `proxy.ts` 约定，弃用 `middleware.ts`

**修改文件（workflow）：**
- `_bmad-output/implementation-artifacts/2-1-clerk-sign-in.md` - 同步评审记录与验收步骤
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Sprint 跟踪状态同步为 done

### Manual Acceptance Testing Steps

**AC 1: 登录流程验收**

1. **准备工作**
   - 配置 `.env.local` 文件（复制 `.env.example` 并填入 Clerk API 密钥）
   - 在 Clerk Dashboard 中启用 Google/GitHub 登录方式
   - 运行 `npm run dev` 启动开发服务器

2. **未登录状态测试**
   - 访问 `http://localhost:3000/` → 应自动重定向到 `/sign-in`
   - 访问 `http://localhost:3000/dashboard` → 应自动重定向到 `/sign-in?returnBackUrl=/dashboard`（登录后返回原页面）
   - （可选）访问 `http://localhost:3000/foobar` → 应自动重定向到 `/sign-in?returnBackUrl=/foobar`（登录后 Next.js 返回 404）

3. **登录成功测试**
   - 在 `/sign-in` 页面选择邮箱/Google/GitHub 登录
   - 完成授权后应在 5 秒内跳转到 `/dashboard`
   - `/dashboard` 页面应显示用户头像和用户名（或邮箱）
   - **AC "5 秒"性能验收**：
     1. 登录前打开 DevTools → Console 面板
     2. 登录成功跳转到 `/dashboard` 后，Console 应输出 `[性能] Dashboard 首屏渲染时间戳: xxxms（含头像/用户名可见）`
     3. 该数值应 < 5000ms（即 5 秒）；若未输出日志而出现 `[性能] Dashboard 首屏标记跳过：...未检测到` 则说明用户信息未渲染或头像组件未就绪，需排查
     4. （可选进阶）DevTools → Performance 面板录制，录制结果中搜索 `dashboard-visible` 标记，确认时间戳位于 5s 内

4. **登录失败/取消测试**
   - 在 OAuth 授权页面点击取消 → 应保持在登录页，Clerk 内置 UI 显示错误信息
   - 使用错误凭据登录 → Clerk 内置 UI 应显示错误原因并提供重试按钮

5. **已登录状态测试**
   - 登录成功后访问 `/sign-in` → 应自动重定向到 `/dashboard`
   - 登录成功后访问 `/sign-up` → 应自动重定向到 `/dashboard`

6. **API 认证测试**
   - 未登录状态调用 `curl http://localhost:3000/api/xxx` → 应返回 `401 {"error":"Unauthorized"}`（非 404）
   - ⚠️ **安全提醒**：如后续需要 webhook 等公开 API，必须显式配置白名单匹配器以跳过 Clerk 认证层，并在 handler 内**严格验证请求签名**（如 Clerk webhook 使用 svix 签名校验），否则端点将完全暴露

## Senior Developer Review (AI)

Reviewer: Arksou  
Date: 2026-02-06  
Outcome: Changes Requested → Resolved

### Findings

- [MEDIUM] AC 性能标记仅校验“用户名可见”，未覆盖“头像可见”，可能导致度量不完整（已修复：同时校验头像按钮节点存在后再 `performance.mark`）。(`frontend/app-web/src/app/dashboard/performance-marker.tsx`)
- [MEDIUM] 过早放行 webhook 白名单存在未来误放行风险（已修复：移除默认白名单，改为按需显式放行，并要求 handler 验签）。(`frontend/app-web/src/proxy.ts`)
- [LOW] 验收步骤使用 `pnpm dev` 与项目脚本/锁文件不一致（已修复：改为 `npm run dev`）。(`_bmad-output/implementation-artifacts/2-1-clerk-sign-in.md`)

## Change Log

- 2026-02-05: 完成 Story 2.1 Clerk 登录/注册功能实现（Claude Opus 4.5）
- 2026-02-05: Code Review Round 1 - 优化 currentUser() 调用、统一用户名回退、添加 CSS layer 顺序、已登录用户重定向
- 2026-02-05: Code Review Round 2 - 修复 displayName 空值、首屏用户信息可见、中间件单次鉴权、根路径直接重定向
- 2026-02-06: Code Review Round 3 - displayName 添加 .trim() 防空字符串、layout 兜底值、根路径移出 public routes 消除多次跳转
- 2026-02-06: Code Review Round 4 - 中间件按路由类型分支，使用 auth.protect() 保留 returnBackUrl 语义并优化 API 行为
- 2026-02-06: Code Review Round 5 - 修复 3 HIGH + 1 MEDIUM + 2 LOW：layout 改用 auth()+redirectToSignIn()、API 路由返回 401、CSS @layer 声明前置、根路由 fallback 区分状态
- 2026-02-06: Code Review Round 6 - 消除 page.tsx 冗余 currentUser()、新增公开 API 白名单、middleware.ts→proxy.ts 迁移（消除 Next.js 16 deprecation 警告）
- 2026-02-06: Code Review Round 7 - 文档 middleware→proxy 引用修正、AC 性能埋点（PerformanceMarker）、登录无障碍包裹（aria-live）、layout 简化为 auth.protect()、补充 webhook 白名单安全说明与性能验收步骤
- 2026-02-06: Code Review Round 8 - 性能标记覆盖头像可见、移除默认 webhook 白名单改为按需显式放行、修正验收命令为 npm
