"use client";

/**
 * 工作空间执行页顶部导航
 *
 * 包含品牌标识、工作空间名称、Settings 入口、语言切换、用户头像
 */

import { UserButton } from "@clerk/nextjs";
import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface WorkspaceHeaderProps {
  workspaceName: string;
  onSettingsClick: () => void;
}

export function WorkspaceHeader({ workspaceName, onSettingsClick }: WorkspaceHeaderProps) {
  const t = useTranslations("workspaceShell");
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
        <Button
          variant="ghost"
          size="sm"
          onClick={onSettingsClick}
          className="text-muted-foreground hover:text-foreground gap-1.5"
        >
          <Settings className="size-4" />
          {t("settings")}
        </Button>
        <LanguageSwitcher />
        <UserButton />
      </div>
    </header>
  );
}
