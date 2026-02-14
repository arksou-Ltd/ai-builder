import { redirect } from "next/navigation";

/**
 * 根路径首页
 *
 * 中间件统一处理根路径跳转：
 * - 已登录 → /dashboard
 * - 未登录 → /sign-in
 *
 * 此页面仅作为 fallback，正常流量不会到达此处
 */
export default function Home() {
  redirect("/sign-in");
}
