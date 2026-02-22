"use client";

/**
 * 工作空间错误恢复组件
 *
 * 展示可恢复错误提示，提供"重试"入口。
 * 使用 role="alert" 确保屏幕阅读器可感知。
 * 不破坏页面主结构（顶部/面板容器仍可见）。
 */

import { AlertCircle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

interface WorkspaceErrorProps {
  onRetry: () => void;
}

export function WorkspaceError({ onRetry }: WorkspaceErrorProps) {
  const t = useTranslations("workspaceShell.error");

  return (
    <div
      role="alert"
      data-testid="error-alert"
      className="flex flex-col items-center justify-center gap-4 p-8 text-center"
    >
      <div className="bg-destructive/10 flex size-12 items-center justify-center rounded-full">
        <AlertCircle className="text-destructive size-6" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">{t("loadFailed")}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t("loadFailedDescription")}</p>
      </div>
      <Button variant="outline" onClick={onRetry} className="gap-2">
        <RefreshCw className="size-4" />
        {t("retry")}
      </Button>
    </div>
  );
}
