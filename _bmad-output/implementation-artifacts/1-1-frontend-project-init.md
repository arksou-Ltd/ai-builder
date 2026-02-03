# Story 1.1: frontend-project-init

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 开发者,
I want 使用标准化的前端项目骨架,
so that 我可以基于统一的技术栈与目录结构开始前端开发。

## Acceptance Criteria

1. Given 仓库当前没有前端工程  
   When 执行前端初始化命令并完成 UI 基础配置  
   Then `frontend/app-web/` 目录创建完成且可启动开发服务  
   And Next.js App Router 结构就绪（启用 `src/` 目录）  
   And `src/app/` 至少包含 `layout.tsx`、`page.tsx`、`globals.css`、`providers.tsx`  
   And `src/` 至少包含 `components/`、`lib/`、`hooks/` 目录（与项目约定一致）  
   And Tailwind CSS 4 配置完成，`postcss.config.mjs` 使用 `@tailwindcss/postcss`  
   And shadcn/ui 初始化完成（`components.json` 配置 `cssVariables: true`，`baseColor: "slate"`，`css: "src/app/globals.css"`）  
   And ESLint 配置完成，`eslint.config.mjs` 启用 `eslint-config-next` 的 `core-web-vitals` 与 `typescript`  
   And `tsconfig.json` 启用 `baseUrl` 与 `@/*` 路径别名（指向 `src/*`）  
   And `package.json` 中依赖与脚本齐全（`dev/build/start/lint` 可用且 `npm run lint` 通过）

## Tasks / Subtasks

- [x] 建立前端项目骨架与目录结构（AC: 1）
  - [x] 创建 `frontend/app-web/` 与 `src/` 目录结构
  - [x] 初始化 App Router 基础文件（`layout.tsx`、`page.tsx`、`globals.css`、`providers.tsx`）
  - [x] 创建 `components/`、`lib/`、`hooks/` 基础目录
- [x] 配置基础工具链与 UI 框架（AC: 1）
  - [x] 配置 Tailwind CSS 4（PostCSS 插件与全局样式导入）
  - [x] 初始化 shadcn/ui（`components.json` 关键字段对齐约束）
  - [x] 配置 ESLint 与 TypeScript 路径别名
  - [x] 校验 `npm run lint` 可通过

## Dev Notes

- 架构与技术栈约束（必须遵循）：
  - 前端：Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui（App Router + `src/` 目录）
  - 认证：Clerk（后续接入，当前仅完成骨架）
  - 禁止使用 Pages Router；不得引入 Redux
- 目录结构约束：
  - `frontend/app-web/` 为前端根目录
  - `src/app/` 含 `layout.tsx`、`page.tsx`、`globals.css`、`providers.tsx`
  - `src/components/`、`src/lib/`、`src/hooks/` 必须存在
- 配置约束：
  - `postcss.config.mjs` 使用 `@tailwindcss/postcss`
  - `components.json` 中 `cssVariables: true`、`baseColor: "slate"`、`css: "src/app/globals.css"`
  - `eslint.config.mjs` 启用 `core-web-vitals` + `typescript`
  - `tsconfig.json` 启用 `baseUrl` 与 `@/*` 路径别名
- 验收与质量：
  - `npm run lint` 必须通过
  - 项目可启动开发服务（`npm run dev`）

### Project Structure Notes

- 对齐 `architecture.md` 的 Project Structure 与 `project-context.md` 的前端规范。
- `ai-native` 参考结构：`src/app/(auth)`、`src/app/(protected)`、`src/app/providers.tsx`、`components.json`（baseColor=slate, cssVariables=true）。

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Structure]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Dependencies]
- [Source: _bmad-output/project-context.md#Technology-Stack--Versions]
- [Source: _bmad-output/project-context.md#Linting--Formatting]
- [Source: /Users/itian/Project/ai-native/frontend/app-web/components.json]
- [Source: /Users/itian/Project/ai-native/frontend/app-web/eslint.config.mjs]
- [Source: /Users/itian/Project/ai-native/frontend/app-web/postcss.config.mjs]
- [Source: /Users/itian/Project/ai-native/frontend/app-web/tsconfig.json]
- [Source: /Users/itian/Project/ai-native/frontend/app-web/next.config.ts]
- [Source: /Users/itian/Project/ai-native/frontend/app-web/package.json]

## Dev Agent Guardrails: Technical Requirements

- 技术栈固定：Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui（App Router）
- TypeScript 必须 strict mode
- 禁止 Pages Router 与 Redux
- shadcn/ui 配置：`components.json` 必须包含 `cssVariables: true`、`baseColor: "slate"`、`css: "src/app/globals.css"`
- Tailwind 4 必须通过 `postcss.config.mjs` 启用 `@tailwindcss/postcss`
- ESLint 必须启用 `eslint-config-next` 的 `core-web-vitals` + `typescript`

## Dev Agent Guardrails: Architecture Compliance

- 目录边界：仅创建 `frontend/app-web/`，不创建 `backend/` 相关目录
- App Router 约束：使用 `app/` 路由结构，`layout.tsx` 与 `page.tsx` 必须存在
- `src/` 目录为源码根，所有前端代码必须在 `src/` 下
- 项目结构必须与 `architecture.md` 与 `project-context.md` 一致

## Dev Agent Guardrails: Library & Framework Requirements

- Next.js 版本必须为 16.x，且不得低于 16.0.7（安全修复要求）
- React 版本必须为 19.x，且不得低于 19.2.1（RSC 安全修复要求）
- Tailwind CSS 必须为 4.x
- shadcn/ui 使用 `components.json` 管理配置
- 依赖必须集中在 `frontend/app-web/package.json`
- `package.json` 依赖版本需对齐架构基线（避免不兼容）：
  - `next`: "16.1.6"
  - `react`: "19.2.3"
  - `react-dom`: "19.2.3"
  - `@clerk/nextjs`: "^6.37.1"
  - `@tanstack/react-query`: "^5.90.20"
  - `next-intl`: "^4.8.1"
  - `tailwindcss`: "^4"
  - `@tailwindcss/postcss`: "^4"
  - `eslint-config-next`: "16.1.6"
  - `typescript`: "^5"
  - `tw-animate-css`: "^1.4.0"
  - `lucide-react`: "^0.563.0"
  - `class-variance-authority`: "^0.7.1"
  - `clsx`: "^2.1.1"
  - `tailwind-merge`: "^3.4.0"

## Dev Agent Guardrails: File Structure Requirements

- 目标根目录：`frontend/app-web/`
- 必需配置文件：
  - `package.json`
  - `next.config.ts`（至少包含 turbopack root 配置；如使用 `next-intl`，按插件模式包裹）
  - `tsconfig.json`（包含 `baseUrl` 与 `@/*`）
  - `postcss.config.mjs`（Tailwind 4）
  - `eslint.config.mjs`
  - `.prettierrc`（与项目 Prettier 约束一致）
  - `components.json`（shadcn/ui 配置）
- 必需源码结构：
  - `src/app/`（含 `layout.tsx`、`page.tsx`、`globals.css`、`providers.tsx`）
  - `src/components/`、`src/lib/`、`src/hooks/`

## Dev Agent Guardrails: Testing Requirements

- 前端不使用 Mock/Test Doubles（与项目测试规范一致）
- `npm run lint` 必须通过，作为初始化质量门槛

## Dev Agent Guardrails: Formatting Requirements

- `.prettierrc` 建议配置：
  - `semi: true`
  - `singleQuote: false`
  - `tabWidth: 2`
  - `trailingComma: "es5"`
  - `printWidth: 100`
  - `plugins: ["prettier-plugin-tailwindcss"]`

## Latest Technical Information

- Tailwind CSS v4：使用 `@tailwindcss/postcss` 作为 PostCSS 插件，`postcss.config.mjs` 需显式配置。
- shadcn/ui：`components.json` 中 `cssVariables: true` 且 `baseColor: "slate"`，`css` 指向 `src/app/globals.css`。
- Next.js/React 安全版本下限：Next.js ≥16.0.7，React ≥19.2.1（RSC 安全修复后版本）。

## Project Context Reference

- 参考项目规则与技术栈：`_bmad-output/project-context.md`

## Story Completion Status

Status: review

Completion Note: Ultimate context engine analysis completed - comprehensive developer guide created

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- npm 缓存权限问题已通过 sudo 清理解决

### Completion Notes List

- ✅ 完成任务 1：建立前端项目骨架与目录结构
  - 创建 `frontend/app-web/` 目录结构
  - 初始化 `src/app/` 下的 `layout.tsx`、`page.tsx`、`globals.css`、`providers.tsx`
  - 创建 `src/components/ui/`、`src/lib/`、`src/hooks/` 目录
- ✅ 完成任务 2：配置基础工具链与 UI 框架
  - 配置 Tailwind CSS 4（`postcss.config.mjs` 使用 `@tailwindcss/postcss`）
  - 初始化 shadcn/ui（`components.json` 配置 cssVariables、baseColor、css 字段）
  - 配置 ESLint（`eslint.config.mjs` 启用 core-web-vitals + typescript）
  - 配置 TypeScript 路径别名（`tsconfig.json` 启用 `@/*` → `./src/*`）
  - 配置 Prettier（`.prettierrc` 含 tailwindcss 插件）
  - `npm run lint` 通过验证
  - `npm run dev` 开发服务可正常启动
- ✅ 代码审查修复（2026-02-03）：
  - 修复 [高] Git 未追踪问题：将所有前端文件添加到 Git 暂存区
  - 修复 [中] .gitignore 缺失：添加 `node_modules/`、`.next/`、`next-env.d.ts` 到 .gitignore
  - 修复 [中] next-env.d.ts 问题：删除该文件并添加到 .gitignore（由 Next.js 自动生成）
  - 修复 [中] Zustand 缺失：添加 `zustand: ^5.0.11` 到 dependencies

### File List

**新增文件：**
- frontend/app-web/package.json
- frontend/app-web/package-lock.json
- frontend/app-web/next.config.ts
- frontend/app-web/tsconfig.json
- frontend/app-web/postcss.config.mjs
- frontend/app-web/eslint.config.mjs
- frontend/app-web/.prettierrc
- frontend/app-web/components.json
- frontend/app-web/src/app/globals.css
- frontend/app-web/src/app/layout.tsx
- frontend/app-web/src/app/page.tsx
- frontend/app-web/src/app/providers.tsx
- frontend/app-web/src/lib/utils.ts
- frontend/app-web/src/components/ui/index.ts
- frontend/app-web/src/hooks/index.ts

**修改文件：**
- .gitignore（添加 Node.js/Frontend 忽略规则）

### Change Log

- 2026-02-03: Story 1-1 实现完成，创建前端项目骨架并配置所有必需工具链
- 2026-02-03: 代码审查修复 - 解决 Git 追踪、.gitignore、next-env.d.ts、Zustand 依赖问题
