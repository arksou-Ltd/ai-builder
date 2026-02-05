# Story 2.1: clerk-sign-in

Status: review

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
- 中间件文件必须位于 `src/` 目录根（与 `app/` 同级），不是放在 `app/` 内部：
  - `frontend/app-web/src/app/`（路由）
  - `frontend/app-web/src/middleware.ts`（中间件，与 `app/` 同级）

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
- `frontend/app-web/src/middleware.ts`（路由保护：未登录跳转到登录页）

### Implementation Hints (avoid common mistakes)

- 优先使用 `@clerk/nextjs` 的官方组件/方法完成：
  - 登录页：`<SignIn />`
  - 注册页：`<SignUp />`
  - 受保护区域：`<SignedIn /> / <SignedOut />` 或服务端 `auth()`
  - 用户信息展示：`<UserButton />`（包含头像与菜单；建议提前配置 `afterSignOutUrl="/sign-in"`，Story 2.2 可复用）
    - 示例：`<UserButton afterSignOutUrl="/sign-in" />`
- 路由保护不要“手写 if + redirect”散落在每个页面；集中在 `frontend/app-web/src/middleware.ts`。
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

Status: review

Completion Note: All tasks completed. Ready for code review.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

无

### Implementation Plan

1. **登录/注册路由实现**
   - 使用 Clerk 官方 App Router 路由约定 `[[...sign-in]]` 和 `[[...sign-up]]`
   - 路由分组 `(auth)` 用于身份认证页面
   - 配置 `fallbackRedirectUrl="/dashboard"` 以在登录成功后跳转到受保护页面

2. **受保护页面实现**
   - 创建 `/dashboard` 路由作为登录后的默认落地页
   - 在 layout 中使用 `currentUser()` 进行服务端用户验证（双保险）
   - 使用 `<UserButton afterSignOutUrl="/sign-in" />` 展示用户头像和登出功能

3. **路由保护中间件**
   - 使用 `clerkMiddleware` + `createRouteMatcher` 定义公开和受保护路由
   - 公开路由：`/`、`/sign-in(.*)`、`/sign-up(.*)`
   - 其他路由需要登录，通过 `auth.protect()` 自动保护

4. **Tailwind CSS 4 兼容性**
   - 为 `ClerkProvider` 配置 `appearance={{ cssLayerName: "clerk" }}`

### Completion Notes List

- ✅ 实现登录页 `/sign-in` 使用 `<SignIn />` 组件
- ✅ 实现注册页 `/sign-up` 使用 `<SignUp />` 组件
- ✅ 配置 `ClerkProvider` 的 `cssLayerName: "clerk"` 以兼容 Tailwind CSS 4
- ✅ 创建受保护的 Dashboard 页面 `/dashboard`
- ✅ 在 Dashboard layout 中展示用户名和 `<UserButton />`
- ✅ 配置中间件使用 `clerkMiddleware` 保护非公开路由
- ✅ 根路径 `/` 根据登录状态重定向到 `/dashboard` 或 `/sign-in`
- ✅ 提供 `.env.example` 环境变量模板
- ✅ ESLint 检查通过
- ✅ TypeScript 类型检查通过

### File List

**新增文件：**
- `frontend/app-web/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` - 登录页
- `frontend/app-web/src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` - 注册页
- `frontend/app-web/src/app/dashboard/layout.tsx` - Dashboard 受保护布局
- `frontend/app-web/src/app/dashboard/page.tsx` - Dashboard 首页
- `frontend/app-web/src/middleware.ts` - Clerk 路由保护中间件
- `frontend/app-web/.env.example` - 环境变量配置模板

**修改文件：**
- `frontend/app-web/src/app/providers.tsx` - 添加 `cssLayerName: "clerk"` 配置
- `frontend/app-web/src/app/page.tsx` - 根据登录状态重定向

## Change Log

- 2026-02-05: 完成 Story 2.1 Clerk 登录/注册功能实现（Claude Opus 4.5）
