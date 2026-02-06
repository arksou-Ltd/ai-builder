import { PerformanceMarker } from "./performance-marker";

/**
 * Dashboard 首页
 *
 * 登录成功后的默认落地页面。
 * 用户名展示由 layout.tsx header 负责（currentUser() 仅在 layout 调用一次），
 * 此页面使用通用欢迎语，避免重复远程调用。
 */
export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <PerformanceMarker />
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">欢迎回来！</h1>
        <p className="text-muted-foreground mt-4 text-lg">您已成功登录 AI Builder 智能开发平台</p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="border-border bg-card rounded-lg border p-6">
          <h3 className="text-lg font-semibold">项目管理</h3>
          <p className="text-muted-foreground mt-2 text-sm">创建和管理您的 AI 项目</p>
        </div>
        <div className="border-border bg-card rounded-lg border p-6">
          <h3 className="text-lg font-semibold">代码生成</h3>
          <p className="text-muted-foreground mt-2 text-sm">使用 AI 辅助生成代码</p>
        </div>
        <div className="border-border bg-card rounded-lg border p-6">
          <h3 className="text-lg font-semibold">工作流</h3>
          <p className="text-muted-foreground mt-2 text-sm">配置和运行自动化工作流</p>
        </div>
      </div>
    </div>
  );
}
