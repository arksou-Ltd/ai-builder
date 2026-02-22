"use client";

/**
 * 工作空间执行页壳层组件
 *
 * 提供三面板布局结构：左侧导航 + 中间对话区 + 右侧面板
 * 语义结构：<nav> + <main> + <aside>
 * 响应式：>=1024px 三列同时可见，支持左侧折叠
 */

import { useState, useCallback, useId } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface WorkspaceShellProps {
  leftPanel?: React.ReactNode;
  centerPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export function WorkspaceShell({ leftPanel, centerPanel, rightPanel }: WorkspaceShellProps) {
  const t = useTranslations("workspaceShell");
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const leftPanelId = useId();

  const toggleLeftPanel = useCallback(() => {
    setLeftCollapsed((prev) => !prev);
  }, []);

  return (
    <div
      data-testid="workspace-shell-layout"
      className={cn(
        "relative grid h-[calc(100vh-4rem)] w-full max-w-[1920px] mx-auto overflow-hidden transition-[grid-template-columns] duration-200 ease-in-out",
        leftCollapsed
          ? "grid-cols-[0_minmax(0,1fr)_320px] lg:grid-cols-[0_minmax(0,1fr)_340px] xl:grid-cols-[0_minmax(0,1fr)_360px]"
          : "grid-cols-[240px_minmax(0,1fr)_320px] lg:grid-cols-[260px_minmax(0,1fr)_340px] xl:grid-cols-[280px_minmax(0,1fr)_360px]",
      )}
    >
      {/* 左侧导航面板 */}
      <nav
        id={leftPanelId}
        aria-label={t("navigation")}
        aria-hidden={leftCollapsed}
        inert={leftCollapsed}
        className={cn(
          "border-border min-w-0 overflow-hidden transition-[border-color] duration-200 ease-in-out",
          leftCollapsed ? "border-r-0" : "border-r",
        )}
      >
        <div className="flex h-full flex-col overflow-y-auto p-4">
          {leftPanel}
        </div>
      </nav>

      {/* 折叠/展开触发器 */}
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={toggleLeftPanel}
        aria-expanded={!leftCollapsed}
        aria-controls={leftPanelId}
        aria-label={leftCollapsed ? t("expandLeftPanel") : t("collapseLeftPanel")}
        data-testid="left-panel-toggle"
        className={cn(
          "absolute top-3 z-10 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          leftCollapsed ? "left-2" : "left-[240px] lg:left-[260px] xl:left-[280px]",
        )}
      >
        {leftCollapsed ? (
          <PanelLeftOpen className="size-4" />
        ) : (
          <PanelLeftClose className="size-4" />
        )}
      </Button>

      {/* 中间对话区 */}
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="flex h-full flex-col p-4">
          {centerPanel}
        </div>
      </main>

      {/* 右侧面板 */}
      <aside className="border-border w-[320px] lg:w-[340px] xl:w-[360px] shrink-0 overflow-y-auto border-l">
        <div className="flex h-full flex-col p-4">
          {rightPanel}
        </div>
      </aside>
    </div>
  );
}
