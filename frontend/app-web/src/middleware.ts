import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * 公开路由匹配器
 *
 * 定义不需要登录即可访问的路由
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

/**
 * Clerk 中间件配置
 *
 * - 公开路由（/sign-in, /sign-up）不需要登录
 * - 受保护路由需要登录，未登录时自动跳转到登录页
 * - 登录后返回目标页面
 */
export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // 跳过 Next.js 内部文件和静态资源
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // 始终为 API 路由运行
    "/(api|trpc)(.*)",
  ],
};
