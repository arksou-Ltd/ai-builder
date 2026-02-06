import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * 认证页面匹配器（登录/注册页面）
 */
const isAuthRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

/**
 * API 路由匹配器
 */
const isApiRoute = createRouteMatcher(["/(api|trpc)(.*)"]);

/**
 * Clerk 中间件配置
 *
 * 路由分支策略：
 * ① 根路径 / 认证页面：auth() 轻量检查 → 已登录跳 dashboard
 * ② 受保护 API 路由：未登录返回 401 JSON（而非 auth.protect() 的 404）
 * ③ 其余页面路由：auth.protect() 保护（自动重定向 sign-in 并携带 returnBackUrl）
 *
 * 备注：如需放行 webhook 等公开 API，请显式加白名单匹配器，并在 handler 内严格校验签名。
 */
export default clerkMiddleware(async (auth, request) => {
  const path = request.nextUrl.pathname;

  // ① 根路径 & 认证页面：检查是否已登录 → 跳转 dashboard
  if (path === "/" || isAuthRoute(request)) {
    const { userId } = await auth();
    if (userId) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // 根路径未登录 → sign-in
    if (path === "/") {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    // /sign-in、/sign-up 未登录 → 放行
    return NextResponse.next();
  }

  // ② 受保护 API 路由：未登录返回 401 JSON 响应（保持 RESTful 语义）
  if (isApiRoute(request)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // ③ 其余页面路由：auth.protect() 路由级保护（纵深防御第一层）
  // - 未登录：自动重定向到 sign-in 并携带 returnBackUrl
  // - 未知路径：登录后由 Next.js 返回 404
  // - dashboard layout 中的 auth.protect() 为第二层（组件级保护，防 matcher 遗漏）
  await auth.protect();
});

export const config = {
  matcher: [
    // 跳过 Next.js 内部文件和静态资源
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // 始终为 API 路由运行
    "/(api|trpc)(.*)",
  ],
};
