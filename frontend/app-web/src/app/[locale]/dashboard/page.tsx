"use client";

import { useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { PerformanceMarker } from "./performance-marker";
import { WorkspaceList } from "@/components/workspace/WorkspaceList";

/**
 * Dashboard 首页
 *
 * 登录成功后的默认落地页面。
 * 展示当前用户的工作空间列表（含创建入口）。
 * 保留 PerformanceMarker 组件。
 */
export default function DashboardPage() {
  const { user } = useUser();
  const t = useTranslations("dashboard");

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      {/* 背景装饰 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[50vw] w-[50vw] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-[10%] -right-[10%] h-[50vw] w-[50vw] rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-12">
        <PerformanceMarker />

        {/* 欢迎头部 */}
        <header className="mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
          <h1 className="font-poppins text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {t("welcomeBack")}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {user?.firstName || user?.username || t("defaultUserName")}
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            {t("subtitle")}
          </p>
        </header>

        {/* 主要内容区域 */}
        <main className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both delay-150">
          <WorkspaceList />
        </main>
      </div>
    </div>
  );
}
