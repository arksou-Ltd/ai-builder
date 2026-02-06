import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * 根路径首页
 *
 * 中间件统一处理根路径跳转：
 * - 已登录 → /dashboard（无需经过 /sign-in）
 * - 未登录 → /sign-in
 *
 * 此页面作为 fallback 保护，区分已登录/未登录状态
 */
export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  redirect("/sign-in");
}
