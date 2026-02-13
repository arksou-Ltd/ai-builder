import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * next-intl 中间件实例
 */
const intlMiddleware = createIntlMiddleware(routing);

/**
 * 认证页面匹配器（登录/注册页面）
 */
const isAuthRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

/**
 * API 路由匹配器
 */
const isApiRoute = createRouteMatcher(["/(api|trpc)(.*)"]);

/**
 * Webhook 路由匹配器（公开 API，跳过用户态 auth 校验）
 */
const isWebhookRoute = createRouteMatcher(["/api/v1/webhooks/(.*)"]);

/**
 * 根路径匹配器
 */
const isRootPath = createRouteMatcher(["/"]);

/**
 * Clerk + next-intl 组合中间件
 *
 * 路由分支策略：
 * ⓪ Webhook 路由：跳过用户态 auth，由后端 Svix 签名验证保护
 * ① 根路径 / 认证页面：auth() 轻量检查 → 已登录跳 dashboard
 * ② 受保护 API 路由：未登录返回 401 JSON（而非 auth.protect() 的 404）
 * ③ 其余页面路由：auth.protect() 保护 + intlMiddleware 处理 locale
 */
export default clerkMiddleware(async (auth, request) => {
  // ⓪ Webhook 路由：直接放行，不做用户态 auth 校验
  // 安全由后端 Svix 签名验证保障
  if (isWebhookRoute(request)) {
    return NextResponse.next();
  }

  // ② 受保护 API 路由：未登录返回 401 JSON 响应（保持 RESTful 语义）
  // API 路由不走 intlMiddleware
  if (isApiRoute(request)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          code: { value: 4010000, desc: "unauthorized" },
          data: null,
          message: "Unauthorized",
          request_id: crypto.randomUUID(),
          timestamp: Date.now(),
        },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // ① 根路径 & 认证页面：检查是否已登录 → 跳转 dashboard
  if (isRootPath(request) || isAuthRoute(request)) {
    const { userId } = await auth();
    if (userId) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // 根路径未登录 → 重定向到 sign-in
    if (isRootPath(request) && !isAuthRoute(request)) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      return NextResponse.redirect(url);
    }

    // /sign-in、/sign-up 未登录 → 通过 intlMiddleware 正常处理
    return intlMiddleware(request);
  }

  // ③ 其余页面路由：auth.protect() 路由级保护（纵深防御第一层）
  // - 未登录：自动重定向到 sign-in 并携带 returnBackUrl
  // - 未知路径：登录后由 Next.js 返回 404
  // - dashboard layout 中的 auth.protect() 为第二层（组件级保护，防 matcher 遗漏）
  await auth.protect();

  // 通过认证后，交给 intlMiddleware 处理 locale
  return intlMiddleware(request);
});

export const config = {
  matcher: [
    // 跳过 Next.js 内部文件和静态资源
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // 始终为 API 路由运行
    "/(api|trpc)(.*)",
  ],
};
