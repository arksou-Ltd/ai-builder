import { UserButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";

/**
 * Dashboard 受保护布局
 *
 * 使用 auth.protect() 做登录保护：未认证自动重定向到 sign-in 并携带 returnBackUrl。
 * currentUser() 仅用于获取展示数据（底层 fetch 有请求级去重）。
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // 纵深防御第二层：组件级保护（第一层为 proxy.ts 路由级拦截）
  // 未登录时自动重定向到登录页（携带 returnBackUrl，登录后回跳原目标页面）
  await auth.protect();

  // 获取完整用户信息用于展示
  const user = await currentUser();

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="border-border flex h-16 items-center justify-between border-b px-6">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">AI Builder</h1>
        </div>
        <div className="flex items-center gap-4">
          <span data-testid="user-display-name" className="text-muted-foreground text-sm">
            {user?.firstName?.trim() ||
              user?.username?.trim() ||
              user?.emailAddresses[0]?.emailAddress?.trim() ||
              "用户"}
          </span>
          <div data-testid="user-avatar">
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
