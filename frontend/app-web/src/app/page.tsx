import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * 根路径首页
 *
 * 根据用户登录状态进行路由分发：
 * - 已登录用户：重定向到受保护的 dashboard
 * - 未登录用户：重定向到登录页
 */
export default async function Home() {
  const user = await currentUser();

  if (user) {
    // 已登录用户重定向到 dashboard
    redirect("/dashboard");
  } else {
    // 未登录用户重定向到登录页
    redirect("/sign-in");
  }
}
