"use client";

/**
 * 工作空间执行页顶部导航
 *
 * 包含品牌标识、工作空间名称、语言切换、用户头像
 */

import { UserButton } from "@clerk/nextjs";
import { useTranslations } from "next-intl";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface WorkspaceHeaderProps {
  workspaceName: string;
}

export function WorkspaceHeader({ workspaceName }: WorkspaceHeaderProps) {
  const tDashboard = useTranslations("dashboard");

  return (
    <header
      role="banner"
      className="border-border flex h-16 shrink-0 items-center justify-between border-b px-6"
    >
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">{tDashboard("brandName")}</h1>
        <span className="text-muted-foreground text-sm">/</span>
        <span className="text-sm font-medium">{workspaceName}</span>
      </div>

      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <UserButton />
      </div>
    </header>
  );
}
