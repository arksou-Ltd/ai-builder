import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * Dashboard 受保护布局
 *
 * 展示 Header 和 UserButton（包含用户头像与菜单）
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  // 双保险：服务端验证用户登录状态
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">AI Builder</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {user.firstName ||
              user.username ||
              user.emailAddresses[0]?.emailAddress}
          </span>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
