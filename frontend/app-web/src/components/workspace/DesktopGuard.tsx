"use client";

/**
 * 桌面设备守卫组件
 *
 * MVP 仅保证桌面（>=1024px）体验。
 * 非桌面设备显示引导提示，不进入执行流。
 */

import { Monitor } from "lucide-react";
import { useTranslations } from "next-intl";

export function DesktopGuard({ children }: { children?: React.ReactNode }) {
  const t = useTranslations("workspaceShell");

  return (
    <>
      {/* 非桌面设备引导提示 */}
      <div className="flex h-screen items-center justify-center p-8 text-center lg:hidden">
        <div className="flex max-w-sm flex-col items-center gap-4">
          <Monitor className="text-muted-foreground size-12" />
          <p className="text-muted-foreground text-sm">{t("desktopOnly")}</p>
        </div>
      </div>
      {/* 桌面设备正常渲染 */}
      <div className="hidden lg:contents">{children ?? null}</div>
    </>
  );
}
