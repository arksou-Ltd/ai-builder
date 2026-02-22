"use client";

/**
 * 工作空间执行页
 *
 * 三面板壳层入口：顶部导航 + 左侧导航 + 中间对话区 + 右侧面板
 * Story 3.1 交付壳层结构，Story 3.2 接入步骤面板，后续 Story 3.3~3.12 增量实现。
 */

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";

import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { WorkspaceError } from "@/components/workspace/WorkspaceError";
import { WorkspaceSettingsPanel } from "@/components/workspace/WorkspaceSettingsPanel";
import { DesktopGuard } from "@/components/workspace/DesktopGuard";
import { WorkflowStepsPanel } from "@/components/workspace/WorkflowStepsPanel";
import { useWorkspaceWorkflowSteps } from "@/components/workspace/hooks/useWorkspaceWorkflowSteps";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getWorkspace } from "@/lib/api/workspaces";

export default function WorkspacePage() {
  const params = useParams<{ workspaceId: string }>();
  const { getToken } = useAuth();
  const { user } = useUser();
  const t = useTranslations("workspaceShell");
  const [showSettings, setShowSettings] = useState(false);
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncDesktopState = () => setIsDesktop(mediaQuery.matches);

    syncDesktopState();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncDesktopState);
      return () => mediaQuery.removeEventListener("change", syncDesktopState);
    }

    mediaQuery.addListener(syncDesktopState);
    return () => mediaQuery.removeListener(syncDesktopState);
  }, []);

  // 获取工作空间详情
  const {
    data: workspace,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["workspace", params.workspaceId],
    queryFn: () => getWorkspace(params.workspaceId, getToken),
    enabled: isDesktop === true,
  });

  const githubAuthorized = Boolean(
    user?.externalAccounts?.some(
      (account) => account.provider === "github",
    ),
  );
  const githubRepoCount = resolveGithubRepoCount(user?.publicMetadata);

  // 工作流步骤状态（从持久化 store 恢复）
  const { steps: workflowSteps, currentStepId } = useWorkspaceWorkflowSteps(
    params.workspaceId,
  );

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleSettingsClick = useCallback(() => {
    setShowSettings(true);
  }, []);

  const handleSettingsClose = useCallback(() => {
    setShowSettings(false);
  }, []);

  if (isDesktop === false) {
    return <DesktopGuard />;
  }

  if (isDesktop !== true) {
    return null;
  }

  // 加载态：骨架屏
  if (isLoading) {
    return (
      <>
        <WorkspaceHeader
          workspaceName=""
          onSettingsClick={handleSettingsClick}
        />
        <WorkspaceShell
          leftPanel={
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          }
          centerPanel={
            <div className="flex flex-1 items-center justify-center">
              <Skeleton className="h-8 w-48" />
            </div>
          }
          rightPanel={
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          }
        />
      </>
    );
  }

  // 错误态：可恢复错误提示
  if (isError) {
    return (
      <>
        <WorkspaceHeader
          workspaceName=""
          onSettingsClick={handleSettingsClick}
        />
        <WorkspaceShell
          centerPanel={<WorkspaceError onRetry={handleRetry} />}
        />
      </>
    );
  }

  // 正常态：三面板布局
  return (
    <>
      <WorkspaceHeader
        workspaceName={workspace?.name ?? ""}
        onSettingsClick={handleSettingsClick}
      />
      <WorkspaceShell
        leftPanel={
          <div className="space-y-4">
            {/* Story 3.2: 工作流步骤面板 */}
            <WorkflowStepsPanel
              steps={workflowSteps}
              currentStepId={currentStepId}
            />
            {/* Story 3.3 将在此处实现导航树 */}
          </div>
        }
        centerPanel={
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            {/* Story 3.4~3.5 将在此处实现对话流和输入区 */}
            <p className="text-muted-foreground text-sm">
              {workspace?.name}
            </p>
            <Button
              variant="outline"
              size="sm"
              data-testid="center-placeholder-action"
              className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t("centerPanelAction")}
            </Button>
          </div>
        }
        rightPanel={
          showSettings ? (
            <WorkspaceSettingsPanel
              githubAuthorized={githubAuthorized}
              githubRepoCount={githubRepoCount}
              onClose={handleSettingsClose}
            />
          ) : (
            <div className="space-y-3">
              {/* Story 3.6~3.10 将在此处实现右侧 Tab 编排 */}
              <p className="text-muted-foreground text-sm">{t("rightPanelPlaceholder")}</p>
            </div>
          )
        }
      />
    </>
  );
}

function resolveGithubRepoCount(metadata: unknown): number {
  if (!metadata || typeof metadata !== "object") {
    return 0;
  }

  const record = metadata as Record<string, unknown>;
  const github =
    record.github && typeof record.github === "object"
      ? (record.github as Record<string, unknown>)
      : undefined;

  const candidates = [
    record.githubRepoCount,
    record.github_repo_count,
    github?.repoCount,
    github?.repo_count,
  ];

  for (const value of candidates) {
    const count = parseRepoCount(value);
    if (count !== null) {
      return count;
    }
  }

  return 0;
}

function parseRepoCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.floor(parsed);
    }
  }

  return null;
}
