import { currentUser } from "@clerk/nextjs/server";

/**
 * Dashboard 首页
 *
 * 登录成功后的默认落地页面
 */
export default async function DashboardPage() {
  const user = await currentUser();

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          欢迎回来，{user?.firstName || user?.username || "用户"}！
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          您已成功登录 AI Builder 智能开发平台
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-lg font-semibold">项目管理</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            创建和管理您的 AI 项目
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-lg font-semibold">代码生成</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            使用 AI 辅助生成代码
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-lg font-semibold">工作流</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            配置和运行自动化工作流
          </p>
        </div>
      </div>
    </div>
  );
}
